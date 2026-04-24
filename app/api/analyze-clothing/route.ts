import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { photo, photoUrl } = await req.json()

    if (!photo) {
      return NextResponse.json({ error: 'Photo required' }, { status: 400 })
    }

    // Call Claude Vision
    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: photo,
              },
            },
            {
              type: 'text',
              text: `You are a fashion expert. Analyze this clothing item photo and return ONLY a valid JSON object.
No markdown, no code blocks, no explanation — just raw JSON:

{
  "type": "one of: shirt, t-shirt, polo, blouse, sweater, hoodie, jacket, coat, blazer, vest, pants, jeans, shorts, skirt, dress, suit, shoes, sneakers, boots, sandals, loafers, bag, accessory, other",
  "color": "primary color name (single word like: white, black, navy, grey, beige, brown, red, blue, green, yellow, pink, orange, purple)",
  "secondary_colors": ["any other visible colors, max 2"],
  "style": "one of: casual, formal, smart-casual, sporty, streetwear, bohemian, minimalist, vintage",
  "season": ["array of applicable seasons from: spring, summer, autumn, winter"],
  "pattern": "one of: solid, striped, checked, plaid, floral, geometric, animal-print, graphic, textured, other",
  "material_estimate": "one of: cotton, denim, wool, linen, polyester, silk, leather, knit, fleece, synthetic, unknown",
  "tags": ["2-3 tags from: basics, statement, layering, workwear, weekend, evening, activewear, outerwear, accessories"]
}`,
            },
          ],
        },
      ],
    })

    const rawText =
      response.content[0].type === 'text' ? response.content[0].text : ''

    let clothingData
    try {
      const cleaned = rawText
        .replace(/```json?\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      clothingData = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse Claude response:', rawText)
      return NextResponse.json(
        { error: 'AI returned invalid response. Please try again.' },
        { status: 500 }
      )
    }

    // Save to Supabase
    const { data, error: dbError } = await supabase
      .from('wardrobe_items')
      .insert({
        user_id: user.id,
        photo_url: photoUrl,
        type: clothingData.type,
        color: clothingData.color,
        secondary_colors: clothingData.secondary_colors ?? [],
        style: clothingData.style,
        season: clothingData.season ?? [],
        pattern: clothingData.pattern,
        material_estimate: clothingData.material_estimate,
        tags: clothingData.tags ?? [],
      })
      .select()
      .single()

    if (dbError) {
      console.error('Supabase error:', dbError)
      return NextResponse.json(
        { error: 'Failed to save item: ' + dbError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ item: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('analyze-clothing error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
