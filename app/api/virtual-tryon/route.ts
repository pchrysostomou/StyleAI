import { NextRequest, NextResponse } from 'next/server'

// IDM-VTON model on Replicate — state-of-the-art virtual try-on
// https://replicate.com/cuuupid/idm-vton
const REPLICATE_MODEL = 'cuuupid/idm-vton:c871bb9b046607b680449ecbae55fd8c6d945e0a68a8a4e890f4782ad5d0e0e9'

function getCategory(type: string): string {
  const t = type.toLowerCase()
  if (['dress'].includes(t)) return 'dresses'
  if (['pants', 'jeans', 'shorts', 'skirt'].includes(t)) return 'lower_body'
  return 'upper_body' // shirt, t-shirt, jacket, etc.
}

export async function POST(req: NextRequest) {
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN

  // If no API key is configured, return a clear message so the UI can fallback
  if (!REPLICATE_API_TOKEN) {
    return NextResponse.json(
      { error: 'NO_API_KEY', message: 'Replicate API key not configured' },
      { status: 503 }
    )
  }

  try {
    const { humanImageUrl, garmentImageUrl, garmentType, garmentDescription } = await req.json()

    if (!humanImageUrl || !garmentImageUrl) {
      return NextResponse.json({ error: 'Missing required image URLs' }, { status: 400 })
    }

    const category = getCategory(garmentType ?? 'shirt')

    // Start the Replicate prediction
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: REPLICATE_MODEL.split(':')[1],
        input: {
          human_img: humanImageUrl,
          garm_img: garmentImageUrl,
          garment_des: garmentDescription ?? `${garmentType} clothing item`,
          category,
          is_checked: true,
          is_checked_crop: false,
          denoise_steps: 30,
          seed: 42,
        },
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      console.error('Replicate API error:', err)
      return NextResponse.json({ error: 'Replicate API error', detail: err }, { status: 500 })
    }

    const prediction = await response.json()

    // Poll for result (max 60 seconds)
    const resultUrl = await pollForResult(prediction.id, REPLICATE_API_TOKEN)
    return NextResponse.json({ resultUrl })
  } catch (err) {
    console.error('Virtual try-on error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function pollForResult(predictionId: string, token: string, maxAttempts = 30): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000)) // wait 2s between polls

    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Token ${token}` },
    })
    const data = await res.json()

    if (data.status === 'succeeded' && data.output) {
      // output can be a string or array
      return Array.isArray(data.output) ? data.output[0] : data.output
    }

    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(`Replicate prediction ${data.status}: ${data.error ?? 'unknown'}`)
    }
  }
  throw new Error('Replicate prediction timed out after 60 seconds')
}
