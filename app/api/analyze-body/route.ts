import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { photos, photoUrls } = await req.json()

    if (!photos || photos.length !== 3) {
      return NextResponse.json(
        { error: 'Exactly 3 photos required' },
        { status: 400 }
      )
    }

    // Call Claude Vision
    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            // Send all 3 photos
            ...photos.map((photo: string) => ({
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: 'image/jpeg' as const,
                data: photo,
              },
            })),
            {
              type: 'text',
              text: `You are a professional fashion stylist and body analyst. Analyze these 3 photos (front view, side view, back view) of a person.

Return ONLY a valid JSON object — no markdown, no explanation, no code blocks. Just raw JSON:

{
  "body_type": "one of: ectomorph, mesomorph, endomorph, athletic, hourglass, pear, apple, rectangle",
  "height_estimate": "one of: tall, medium, short",
  "skin_tone": "one of: fair, light, medium, olive, tan, dark",
  "hair_color": "one of: black, dark brown, brown, light brown, blonde, red, grey, white",
  "recommended_fits": ["array of 2-3 from: slim, regular, relaxed, oversized, tailored, fitted"],
  "avoid_styles": ["array of 2-3 specific style items to avoid e.g. 'baggy tops', 'horizontal stripes'"],
  "best_colors": ["array of 4-6 color names that complement this person's coloring"],
  "style_notes": "2-3 concise sentences about what silhouettes and styles work best for this body type"
}`,
            },
          ],
        },
      ],
    })

    // Parse Claude's response
    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    
    let bodyProfile
    try {
      // Clean up any potential markdown wrapping
      const cleaned = rawText.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
      bodyProfile = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse Claude response:', rawText)
      return NextResponse.json(
        { error: 'AI returned invalid response. Please try again.' },
        { status: 500 }
      )
    }

    // Save to Supabase
    const { data, error: dbError } = await supabase
      .from('body_profiles')
      .upsert(
        {
          user_id: user.id,
          body_type: bodyProfile.body_type,
          height_estimate: bodyProfile.height_estimate,
          skin_tone: bodyProfile.skin_tone,
          hair_color: bodyProfile.hair_color,
          recommended_fits: bodyProfile.recommended_fits,
          avoid_styles: bodyProfile.avoid_styles,
          best_colors: bodyProfile.best_colors,
          style_notes: bodyProfile.style_notes,
          photo_front: photoUrls?.front || null,
          photo_side: photoUrls?.side || null,
          photo_back: photoUrls?.back || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (dbError) {
      console.error('Supabase error:', dbError)
      return NextResponse.json(
        { error: 'Failed to save profile: ' + dbError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('analyze-body error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
