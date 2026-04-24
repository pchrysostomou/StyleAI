export type BodyProfile = {
  id: string
  user_id: string
  body_type: string
  height_estimate: string
  skin_tone: string
  hair_color: string
  recommended_fits: string[]
  avoid_styles: string[]
  best_colors: string[]
  style_notes: string
  photo_front: string | null
  photo_side: string | null
  photo_back: string | null
  created_at: string
  updated_at: string
}

export type PhotoSlotId = 'front' | 'side' | 'back'

export type PhotoSlot = {
  id: PhotoSlotId
  label: string
  hint: string
  emoji: string
}

export type AnalyzeBodyResponse = {
  profile: {
    body_type: string
    height_estimate: string
    skin_tone: string
    hair_color: string
    recommended_fits: string[]
    avoid_styles: string[]
    best_colors: string[]
    style_notes: string
  }
}
