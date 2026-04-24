import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { message, history } = await req.json()
    if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

    // Fetch wardrobe + body profile for context
    const [profileResult, wardrobeResult] = await Promise.all([
      supabase.from('body_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('wardrobe_items').select('id,type,color,style,season,tags,photo_url').eq('user_id', user.id),
    ])

    const bodyProfile = profileResult.data
    const wardrobe = wardrobeResult.data ?? []

    const wardrobeContext = wardrobe.length > 0
      ? wardrobe.map((i, idx) => `#${idx + 1}: ${i.color} ${i.type} (${i.style}, seasons: ${(i.season ?? []).join('/')})`).join('\n')
      : 'No wardrobe items yet.'

    const profileContext = bodyProfile
      ? `Body type: ${bodyProfile.body_type}, skin tone: ${bodyProfile.skin_tone}, best colors: ${(bodyProfile.best_colors ?? []).join(', ')}, style notes: ${bodyProfile.style_notes}`
      : 'No body profile yet.'

    const systemPrompt = `You are StyleAI, a personal fashion stylist. You know everything about the user's wardrobe and body profile.

USER'S BODY PROFILE:
${profileContext}

USER'S WARDROBE (${wardrobe.length} items):
${wardrobeContext}

Guidelines:
- Give specific, actionable styling advice referencing actual wardrobe items
- Be warm, encouraging, and professional like a real personal stylist
- Reference specific items by their description (e.g., "your navy chino pants")
- Keep responses concise — 2-4 sentences max unless asked for more detail
- When suggesting an outfit, always explain WHY it works for them specifically`

    // Build conversation history for Claude
    const messages = [
      ...(history ?? []).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ]

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 512,
      system: systemPrompt,
      messages,
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : 'I could not generate a response. Please try again.'

    return NextResponse.json({ reply })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('chat error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
