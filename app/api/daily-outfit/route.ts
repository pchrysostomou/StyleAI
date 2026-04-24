import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Mock weather data keyed by occasion
const MOCK_WEATHER: Record<string, { temp: number; condition: string; icon: string }> = {
  casual:  { temp: 22, condition: 'Sunny',      icon: '☀️' },
  work:    { temp: 19, condition: 'Cloudy',      icon: '☁️' },
  sport:   { temp: 20, condition: 'Clear',       icon: '🌤️' },
  formal:  { temp: 18, condition: 'Overcast',    icon: '🌥️' },
  event:   { temp: 21, condition: 'Clear night', icon: '🌙' },
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { occasion = 'casual' } = await req.json()
    const weather = MOCK_WEATHER[occasion] ?? MOCK_WEATHER.casual

    // Fetch body profile + full wardrobe in parallel
    const [profileResult, wardrobeResult] = await Promise.all([
      supabase.from('body_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('wardrobe_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])

    const bodyProfile = profileResult.data
    const wardrobe = wardrobeResult.data ?? []

    if (wardrobe.length === 0) {
      return NextResponse.json({ error: 'No wardrobe items found. Add some clothes first!' }, { status: 400 })
    }

    // Build wardrobe text for Claude
    const wardrobeText = wardrobe
      .map((item) =>
        `ID:${item.id} | ${item.color} ${item.type} | style:${item.style} | season:${(item.season ?? []).join('/')} | pattern:${item.pattern} | tags:${(item.tags ?? []).join(',')}`
      )
      .join('\n')

    const profileText = bodyProfile
      ? `Body type: ${bodyProfile.body_type}, Height: ${bodyProfile.height_estimate}, Skin tone: ${bodyProfile.skin_tone}, Best colors: ${(bodyProfile.best_colors ?? []).join(', ')}, Recommended fits: ${(bodyProfile.recommended_fits ?? []).join(', ')}, Avoid: ${(bodyProfile.avoid_styles ?? []).join(', ')}`
      : 'No body profile available — choose based on style and weather only.'

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a personal fashion stylist. Create a complete outfit from the available wardrobe.

Weather: ${weather.temp}°C, ${weather.condition}
Occasion: ${occasion}
Body profile: ${profileText}

Available wardrobe items:
${wardrobeText}

Rules:
- Choose 2-4 items that form a complete, cohesive outfit
- Consider the weather, occasion, and body profile
- Prioritize items with matching seasons and styles
- Only use IDs from the list above — exact UUID format

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "item_ids": ["uuid1", "uuid2", "uuid3"],
  "reasoning": "2-3 sentences explaining why this combination works for this person and occasion",
  "style_tip": "one specific actionable tip for wearing this outfit today"
}`,
      }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    let outfitData
    try {
      const cleaned = rawText.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
      outfitData = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'AI returned invalid response. Try again.' }, { status: 500 })
    }

    // Validate item_ids exist in the wardrobe
    const validIds = new Set(wardrobe.map((i) => i.id))
    const filteredIds = (outfitData.item_ids as string[]).filter((id) => validIds.has(id))
    if (filteredIds.length === 0) {
      return NextResponse.json({ error: 'AI selected invalid items. Try again.' }, { status: 500 })
    }

    // Save to outfit_history
    const { data: savedOutfit, error: dbError } = await supabase
      .from('outfit_history')
      .insert({
        user_id: user.id,
        item_ids: filteredIds,
        occasion,
        weather,
        reasoning: outfitData.reasoning,
        style_tip: outfitData.style_tip,
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: 'Failed to save outfit: ' + dbError.message }, { status: 500 })
    }

    // Hydrate item details for response
    const selectedItems = wardrobe.filter((i) => filteredIds.includes(i.id))

    return NextResponse.json({
      outfit: savedOutfit,
      items: selectedItems,
      weather,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('daily-outfit error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
