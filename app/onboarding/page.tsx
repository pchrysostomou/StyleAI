'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { PhotoSlotId } from '@/lib/types'

const PHOTO_SLOTS: { id: PhotoSlotId; label: string; hint: string; emoji: string }[] = [
  { id: 'front', label: 'Front', hint: 'Stand straight, arms at sides', emoji: '🧍' },
  { id: 'side',  label: 'Side',  hint: 'Profile view, look forward', emoji: '🚶' },
  { id: 'back',  label: 'Back',  hint: 'Back to camera, stand straight', emoji: '🧍‍♂️' },
]

type SlotPhotos = Record<PhotoSlotId, File | null>

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [photos, setPhotos] = useState<SlotPhotos>({ front: null, side: null, back: null })
  const [previews, setPreviews] = useState<Record<PhotoSlotId, string | null>>({ front: null, side: null, back: null })
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<string>('')
  const fileRefs = {
    front: useRef<HTMLInputElement>(null),
    side:  useRef<HTMLInputElement>(null),
    back:  useRef<HTMLInputElement>(null),
  }

  const handleFileSelect = useCallback((slotId: PhotoSlotId, file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Max 10MB per photo.')
      return
    }
    setError('')
    setPhotos((prev) => ({ ...prev, [slotId]: file }))
    const url = URL.createObjectURL(file)
    setPreviews((prev) => ({ ...prev, [slotId]: url }))
  }, [])

  const handleDrop = useCallback(
    (slotId: PhotoSlotId, e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) handleFileSelect(slotId, file)
    },
    [handleFileSelect]
  )

  const allUploaded = PHOTO_SLOTS.every((s) => photos[s.id] !== null)

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleAnalyze() {
    if (!allUploaded) return
    setAnalyzing(true)
    setError('')

    try {
      setProgress('Uploading photos to secure storage...')

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upload photos to Supabase Storage
      const photoUrls: Record<PhotoSlotId, string> = { front: '', side: '', back: '' }
      for (const slot of PHOTO_SLOTS) {
        const file = photos[slot.id]!
        const path = `${user.id}/${slot.id}-${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('body-photos')
          .upload(path, file, { upsert: true })

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

        const { data: urlData } = supabase.storage
          .from('body-photos')
          .getPublicUrl(path)
        photoUrls[slot.id] = urlData.publicUrl
      }

      setProgress('Analyzing your body profile with AI...')

      // Convert to base64 for Claude
      const base64Photos = await Promise.all(
        PHOTO_SLOTS.map((s) => fileToBase64(photos[s.id]!))
      )

      const response = await fetch('/api/analyze-body', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: base64Photos, photoUrls }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Analysis failed')
      }

      setProgress('Saving your profile...')
      router.push('/dashboard?onboarded=true')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
      setAnalyzing(false)
      setProgress('')
    }
  }

  return (
    <main style={{ minHeight: '100vh', padding: '2rem 1.5rem', position: 'relative' }}>
      {/* Background glow */}
      <div
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.04) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: '720px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem', paddingTop: '1rem' }}>
          <span
            className="font-display"
            style={{ fontSize: '1.25rem', color: 'var(--accent)', letterSpacing: '0.05em', display: 'block', marginBottom: '1.5rem' }}
          >
            StyleAI
          </span>
          <div className="gold-line" style={{ margin: '0 auto 1.5rem' }} />
          <h1 className="font-display" style={{ marginBottom: '0.75rem', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)' }}>
            Create your body profile
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
            Upload 3 photos so Claude AI can analyze your body type, proportions, and coloring.
            This stays completely private — only you can see it.
          </p>
        </div>

        {/* Steps indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2.5rem' }}>
          {['Upload Photos', 'AI Analysis', 'Build Wardrobe'].map((step, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: i === 0 ? 1 : 0.4,
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: i === 0 ? 'var(--accent)' : 'var(--bg-elevated)',
                  border: i === 0 ? 'none' : '1px solid var(--border-strong)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: i === 0 ? '#080808' : 'var(--text-muted)',
                }}
              >
                {i + 1}
              </div>
              <span style={{ fontSize: '0.8rem', color: i === 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {step}
              </span>
              {i < 2 && <div style={{ width: '24px', height: '1px', background: 'var(--border-strong)' }} />}
            </div>
          ))}
        </div>

        {/* Photo slots */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {PHOTO_SLOTS.map((slot) => (
            <PhotoSlot
              key={slot.id}
              slot={slot}
              preview={previews[slot.id]}
              onFileSelect={(file) => handleFileSelect(slot.id, file)}
              onDrop={(e) => handleDrop(slot.id, e)}
              inputRef={fileRefs[slot.id]}
              disabled={analyzing}
            />
          ))}
        </div>

        {/* Tips */}
        <div
          className="card-elevated"
          style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}
        >
          <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>💡</span>
          <div>
            <p style={{ fontWeight: 500, marginBottom: '0.4rem', fontSize: '0.9rem' }}>Tips for best results</p>
            <ul style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', lineHeight: 1.7, paddingLeft: '1rem' }}>
              <li>Wear fitted clothing (not baggy) so the AI can see your proportions</li>
              <li>Good lighting — natural daylight works best</li>
              <li>Stand against a plain wall if possible</li>
              <li>Full-body shots from head to toe</li>
            </ul>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: '0.875rem 1rem',
              background: 'rgba(224,92,92,0.08)',
              border: '1px solid rgba(224,92,92,0.25)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--error)',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Analyzing overlay */}
        {analyzing && (
          <div
            className="animate-fade-in"
            style={{
              padding: '1.5rem',
              background: 'var(--accent-glow)',
              border: '1px solid var(--accent-border)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '1.5rem',
              textAlign: 'center',
            }}
          >
            <div style={{ marginBottom: '0.75rem' }}>
              <SpinnerIcon />
            </div>
            <p style={{ color: 'var(--accent)', fontWeight: 500, marginBottom: '0.25rem' }}>
              Analyzing with Claude Vision AI
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{progress}</p>
          </div>
        )}

        {/* CTA */}
        <button
          id="analyze-body-btn"
          className="btn btn-primary"
          onClick={handleAnalyze}
          disabled={!allUploaded || analyzing}
          style={{
            width: '100%',
            padding: '1rem',
            fontSize: '1rem',
            opacity: allUploaded ? 1 : 0.5,
          }}
        >
          {analyzing ? 'Analyzing...' : allUploaded ? '✨ Analyze my body profile' : `Upload ${3 - Object.values(photos).filter(Boolean).length} more photo${3 - Object.values(photos).filter(Boolean).length !== 1 ? 's' : ''}`}
        </button>

        <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          🔒 Your photos are stored privately in Supabase — only you have access
        </p>
      </div>
    </main>
  )
}

/* ─── PhotoSlot Component ─── */
function PhotoSlot({
  slot,
  preview,
  onFileSelect,
  onDrop,
  inputRef,
  disabled,
}: {
  slot: { id: PhotoSlotId; label: string; hint: string; emoji: string }
  preview: string | null
  onFileSelect: (file: File) => void
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void
  inputRef: React.RefObject<HTMLInputElement | null>
  disabled: boolean
}) {
  const [dragging, setDragging] = useState(false)

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { setDragging(false); onDrop(e) }}
      style={{
        border: `2px dashed ${preview ? 'var(--accent)' : dragging ? 'var(--accent)' : 'var(--border-strong)'}`,
        borderRadius: 'var(--radius-lg)',
        background: preview
          ? 'transparent'
          : dragging
          ? 'var(--accent-glow)'
          : 'var(--bg-surface)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        overflow: 'hidden',
        position: 'relative',
        aspectRatio: '3/4',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFileSelect(file)
        }}
        disabled={disabled}
      />

      {preview ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={`${slot.label} photo`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {/* Overlay on hover */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.2s ease',
            }}
            className="photo-overlay"
          >
            <span style={{ color: 'white', fontSize: '0.8rem' }}>Change photo</span>
          </div>
          {/* Check badge */}
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'var(--accent)',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
            }}
          >
            ✓
          </div>
          {/* Label */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
              padding: '1rem 0.75rem 0.75rem',
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'white' }}>
              {slot.emoji} {slot.label}
            </span>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{slot.emoji}</div>
          <p style={{ fontWeight: 500, fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
            {slot.label}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', lineHeight: 1.5 }}>
            {slot.hint}
          </p>
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.3rem 0.75rem',
              border: '1px solid var(--border-strong)',
              borderRadius: '999px',
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
            }}
          >
            Click to upload
          </div>
        </div>
      )}
    </div>
  )
}

function SpinnerIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--accent)"
      strokeWidth="2"
      strokeLinecap="round"
      style={{ animation: 'spin-slow 1s linear infinite' }}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
