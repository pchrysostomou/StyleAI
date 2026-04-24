'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type WardrobeItem = {
  id: string
  photo_url: string
  type: string
  color: string
  style: string
  season: string[]
  tags: string[]
  pattern: string
  material_estimate: string
}

type OutfitResult = {
  outfit: {
    id: string
    reasoning: string
    style_tip: string
    occasion: string
    rating: number | null
    created_at: string
  }
  items: WardrobeItem[]
  weather: { temp: number; condition: string; icon: string }
}

const OCCASIONS = [
  { id: 'casual',  label: 'Casual Day',   emoji: '☀️', desc: '22°C · Sunny' },
  { id: 'work',    label: 'Work',          emoji: '💼', desc: '19°C · Cloudy' },
  { id: 'sport',   label: 'Sport',         emoji: '🏃', desc: '20°C · Clear' },
  { id: 'formal',  label: 'Formal Event',  emoji: '🤵', desc: '18°C · Overcast' },
  { id: 'event',   label: 'Night Out',     emoji: '🌙', desc: '21°C · Clear night' },
]

const TYPE_ICONS: Record<string, string> = {
  shirt: '👔', 't-shirt': '👕', polo: '👕', blouse: '👚', sweater: '🧥',
  hoodie: '🧥', jacket: '🧥', coat: '🧥', blazer: '🤵', vest: '🦺',
  pants: '👖', jeans: '👖', shorts: '🩳', skirt: '👗', dress: '👗',
  suit: '🤵', shoes: '👟', sneakers: '👟', boots: '👢', sandals: '👡',
  loafers: '👞', bag: '👜', accessory: '💍', other: '👗',
}

export default function OutfitPage() {
  const supabase = createClient()
  const [occasion, setOccasion] = useState('casual')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<OutfitResult | null>(null)
  const [error, setError] = useState('')
  const [ratingLoading, setRatingLoading] = useState(false)
  const [bodyPhotoUrl, setBodyPhotoUrl] = useState<string | null>(null)
  const [photoLoaded, setPhotoLoaded] = useState(false)
  // AI Virtual Try-On state: { itemId -> resultImageUrl }
  const [tryOnResults, setTryOnResults] = useState<Record<string, string>>({})
  // Set of itemIds currently being processed
  const [tryOnLoading, setTryOnLoading] = useState<Set<string>>(new Set())
  const [tryOnAvailable, setTryOnAvailable] = useState<boolean | null>(null)

  // Load body photo on first render - generate signed URL for private bucket
  if (!photoLoaded) {
    setPhotoLoaded(true)
    supabase.from('body_profiles').select('photo_front').maybeSingle().then(async ({ data }) => {
      if (!data?.photo_front) return
      const path = data.photo_front
      // If already a full URL (http), use directly; otherwise generate signed URL
      if (path.startsWith('http')) {
        setBodyPhotoUrl(path)
      } else {
        const { data: signed } = await supabase.storage
          .from('body-photos')
          .createSignedUrl(path, 3600)
        if (signed?.signedUrl) setBodyPhotoUrl(signed.signedUrl)
      }
    })
  }

  async function generateOutfit() {
    setLoading(true)
    setError('')
    setResult(null)
    setTryOnResults({})
    setTryOnAvailable(null)

    try {
      const res = await fetch('/api/daily-outfit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ occasion }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate outfit')
      setResult(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // Called when user clicks "AI Try-On" button — runs each garment through Replicate
  async function triggerAITryOn(items: WardrobeItem[]) {
    if (!bodyPhotoUrl) return

    // Check if Replicate is available (first item ping)
    const firstItem = items[0]
    if (!firstItem) return

    // Mark all items as loading
    setTryOnLoading(new Set(items.map((i) => i.id)))

    // Process each item in parallel
    const promises = items.map(async (item) => {
      try {
        const res = await fetch('/api/virtual-tryon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            humanImageUrl: bodyPhotoUrl,
            garmentImageUrl: item.photo_url,
            garmentType: item.type,
            garmentDescription: `${item.color} ${item.type} ${item.style ?? ''}`.trim(),
          }),
        })
        const data = await res.json()

        if (res.status === 503 && data.error === 'NO_API_KEY') {
          setTryOnAvailable(false)
          return
        }

        if (data.resultUrl) {
          setTryOnAvailable(true)
          setTryOnResults((prev) => ({ ...prev, [item.id]: data.resultUrl }))
        }
      } catch {
        // silently ignore per-item failures
      } finally {
        setTryOnLoading((prev) => {
          const next = new Set(prev)
          next.delete(item.id)
          return next
        })
      }
    })

    await Promise.all(promises)
  }

  async function rateOutfit(rating: number) {
    if (!result?.outfit?.id) return
    setRatingLoading(true)
    const { error } = await supabase
      .from('outfit_history')
      .update({ rating })
      .eq('id', result.outfit.id)
    if (!error) {
      setResult((prev) => prev ? { ...prev, outfit: { ...prev.outfit, rating } } : prev)
    }
    setRatingLoading(false)
  }

  const selectedOccasion = OCCASIONS.find((o) => o.id === occasion)

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-base)', paddingBottom: '80px' }}>
      {/* Desktop Nav */}
      <nav style={{
        padding: '1rem 2rem', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', borderBottom: '1px solid var(--border)',
        background: 'rgba(8,8,8,0.9)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <span className="font-display" style={{ fontSize: '1.2rem', color: 'var(--accent)', letterSpacing: '0.05em' }}>
            StyleAI
          </span>
          <NavLinks active="outfit" />
        </div>
        <form action="/api/auth/signout" method="post">
          <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>Sign out</button>
        </form>
      </nav>

      {/* Mobile bottom nav */}
      <div className="mobile-bottom-nav">
        <div className="mobile-bottom-nav-inner">
          {[['dashboard','👤','Profile'],['wardrobe','👗','Wardrobe'],['outfit','✨','Outfit'],['history','📅','History'],['chat','💬','Stylist']].map(([href,icon,label]) => (
            <a key={href} href={`/${href}`} className={`mobile-nav-item${href==='outfit'?' active':''}`}>
              <span className="icon">{icon}</span><span>{label}</span>
            </a>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div className="gold-line" style={{ marginBottom: '0.75rem' }} />
          <h1 className="font-display" style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', marginBottom: '0.3rem' }}>
            Today&apos;s Outfit
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            AI-generated outfit from your wardrobe, tailored to occasion &amp; weather
          </p>
        </div>

        {/* Occasion selector */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
            SELECT OCCASION
          </p>
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            {OCCASIONS.map((occ) => (
              <button
                key={occ.id}
                id={`occasion-${occ.id}`}
                onClick={() => setOccasion(occ.id)}
                style={{
                  padding: '0.6rem 1.1rem', borderRadius: 'var(--radius-lg)',
                  border: `1px solid ${occasion === occ.id ? 'var(--accent)' : 'var(--border-strong)'}`,
                  background: occasion === occ.id ? 'var(--accent-glow)' : 'var(--bg-surface)',
                  color: occasion === occ.id ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '0.85rem', display: 'flex',
                  flexDirection: 'column', alignItems: 'center', gap: '0.15rem',
                  transition: 'all 0.15s ease', fontFamily: 'Inter, sans-serif', minWidth: '90px',
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>{occ.emoji}</span>
                <span style={{ fontWeight: 500, fontSize: '0.78rem' }}>{occ.label}</span>
                <span style={{ fontSize: '0.68rem', opacity: 0.7 }}>{occ.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button
          id="generate-outfit-btn"
          className="btn btn-primary"
          onClick={generateOutfit}
          disabled={loading}
          style={{ padding: '0.9rem 2.5rem', fontSize: '1rem', marginBottom: '2.5rem' }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SpinnerIcon size={16} /> Styling your outfit...
            </span>
          ) : (
            `✨ Generate ${selectedOccasion?.label} Outfit`
          )}
        </button>

        {error && (
          <div style={{
            padding: '0.875rem 1rem',
            background: 'rgba(224,92,92,0.08)', border: '1px solid rgba(224,92,92,0.25)',
            borderRadius: 'var(--radius-md)', color: 'var(--error)',
            fontSize: '0.875rem', marginBottom: '1.5rem',
          }}>
            {error}
          </div>
        )}

        {/* Loading shimmer */}
        {loading && (
          <div className="animate-fade-in" style={{
            display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.5rem', marginBottom: '2rem',
          }}>
            <div className="skeleton" style={{ borderRadius: 'var(--radius-lg)', height: '340px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '1.5rem' }}>
              {[1,2,3].map(i => (
                <div key={i} className="skeleton" style={{ height: '96px', borderRadius: 'var(--radius-lg)' }} />
              ))}
            </div>
          </div>
        )}

        {/* ── Outfit Result ── Fashion Board Layout */}
        {result && !loading && (
          <div className="animate-fade-in">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(200px, 240px) 1fr',
              gap: '1.5rem',
              marginBottom: '1.5rem',
              alignItems: 'start',
            }}>
              {/* Body photo — Virtual Try-On Fashion Board */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                    VIRTUAL TRY-ON
                  </p>
                  {/* AI Try-On button — appears after outfit is generated */}
                  {bodyPhotoUrl && tryOnAvailable !== false && (
                    <button
                      onClick={() => triggerAITryOn(result.items)}
                      disabled={tryOnLoading.size > 0}
                      style={{
                        fontSize: '0.6rem', padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        border: '1px solid var(--accent-border)',
                        background: tryOnLoading.size > 0 ? 'var(--bg-surface)' : 'var(--accent-glow)',
                        color: 'var(--accent)', cursor: tryOnLoading.size > 0 ? 'not-allowed' : 'pointer',
                        fontWeight: 600, letterSpacing: '0.03em',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {tryOnLoading.size > 0 ? '⏳ Generating...' : '✨ AI Try-On'}
                    </button>
                  )}
                </div>

                <VirtualTryOn
                  bodyPhotoUrl={bodyPhotoUrl}
                  items={result.items}
                  weather={result.weather}
                  occasionLabel={selectedOccasion?.label ?? ''}
                  tryOnResults={tryOnResults}
                  tryOnLoading={tryOnLoading}
                />

                {/* Status messages */}
                {tryOnAvailable === false && (
                  <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem', fontStyle: 'italic' }}>
                    Add <code style={{ fontSize: '0.58rem', color: 'var(--accent)' }}>REPLICATE_API_TOKEN</code> to .env.local for AI Try-On
                  </p>
                )}
                {tryOnLoading.size > 0 && (
                  <p style={{ fontSize: '0.6rem', color: 'var(--accent)', textAlign: 'center', marginTop: '0.5rem' }}>
                    🤖 AI is putting the clothes on you... ~20s
                  </p>
                )}
              </div>


              {/* Outfit items — vertical editorial strip */}
              <div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
                  TODAY&apos;S OUTFIT — {result.items.length} ITEMS
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', position: 'relative' }}>
                  {/* Gold accent line */}
                  <div style={{
                    position: 'absolute', left: '44px', top: '8px', bottom: '8px', width: '2px',
                    background: 'linear-gradient(to bottom, var(--accent), transparent)',
                    zIndex: 0, borderRadius: '1px',
                  }} />
                  {result.items.map((item, idx) => (
                    <div key={item.id} className="animate-fade-in"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        background: 'var(--bg-surface)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)', padding: '0.65rem 1rem 0.65rem 0.65rem',
                        position: 'relative', zIndex: 1, cursor: 'default',
                        transition: 'border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
                        animationDelay: `${idx * 0.1}s`,
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLDivElement
                        el.style.borderColor = 'var(--accent-border)'
                        el.style.transform = 'translateX(6px)'
                        el.style.boxShadow = '0 4px 20px rgba(201,168,76,0.08)'
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLDivElement
                        el.style.borderColor = 'var(--border)'
                        el.style.transform = 'translateX(0)'
                        el.style.boxShadow = 'none'
                      }}
                    >
                      {/* Clothing photo */}
                      <div style={{
                        width: '80px', height: '80px', borderRadius: 'var(--radius-md)',
                        overflow: 'hidden', flexShrink: 0,
                        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.photo_url} alt={`${item.color} ${item.type}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      {/* Item info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                          {TYPE_ICONS[item.type] ?? '👗'} {formatLabel(item.color)} {formatLabel(item.type)}
                        </p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                          {formatLabel(item.style)}{item.pattern && item.pattern !== 'solid' ? ` · ${formatLabel(item.pattern)}` : ''}
                        </p>
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                          {(item.season ?? []).slice(0, 2).map((s: string) => (
                            <span key={s} style={{
                              fontSize: '0.62rem', padding: '0.1rem 0.45rem', borderRadius: '999px',
                              background: 'var(--accent-glow)', color: 'var(--accent)',
                              border: '1px solid var(--accent-border)',
                            }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      {/* Gold dot */}
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: 'var(--accent)', flexShrink: 0,
                        boxShadow: '0 0 8px rgba(201,168,76,0.4)',
                      }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Reasoning + Style tip */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1rem' }}>✨</span>
                  <h3 style={{ fontSize: '0.9rem' }}>Why this works</h3>
                </div>
                <p style={{
                  color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.7,
                  borderLeft: '2px solid var(--accent)', paddingLeft: '0.875rem', fontStyle: 'italic',
                }}>
                  &ldquo;{result.outfit.reasoning}&rdquo;
                </p>
              </div>

              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1rem' }}>💡</span>
                  <h3 style={{ fontSize: '0.9rem' }}>Style tip for today</h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.7 }}>
                  {result.outfit.style_tip}
                </p>
              </div>
            </div>

            {/* Rating */}
            <div className="card" style={{
              padding: '1.25rem', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
            }}>
              <div>
                <p style={{ fontWeight: 500, marginBottom: '0.2rem', fontSize: '0.9rem' }}>Rate this outfit</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Your rating helps improve future suggestions</p>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    id={`rate-${star}`}
                    onClick={() => rateOutfit(star)}
                    disabled={ratingLoading}
                    style={{
                      background: 'none', border: 'none',
                      cursor: ratingLoading ? 'not-allowed' : 'pointer',
                      fontSize: '1.6rem', transition: 'transform 0.1s ease',
                      opacity: result.outfit.rating !== null && star <= (result.outfit.rating ?? 0) ? 1 : 0.3,
                    }}
                  >
                    ⭐
                  </button>
                ))}
              </div>
              {result.outfit.rating && (
                <span style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 500 }}>
                  Rated {result.outfit.rating}/5 ✓
                </span>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={generateOutfit} style={{ fontSize: '0.875rem' }}>
                🔄 Generate another
              </button>
              <a href="/chat" className="btn btn-ghost" style={{ fontSize: '0.875rem', color: 'var(--accent)' }}>
                💬 Ask stylist about this →
              </a>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <div style={{
            textAlign: 'center', padding: '4rem 2rem',
            border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-xl)',
          }}>
            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>👗</p>
            <h3 className="font-display" style={{ marginBottom: '0.5rem' }}>Ready to get dressed?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '360px', margin: '0 auto' }}>
              Select your occasion above and let Claude AI pick the perfect outfit from your wardrobe.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

/* Nav Links */
function NavLinks({ active }: { active: string }) {
  const links = [
    { href: '/dashboard', label: 'Profile',  id: 'profile' },
    { href: '/wardrobe',  label: 'Wardrobe', id: 'wardrobe' },
    { href: '/outfit',    label: 'Outfit',   id: 'outfit' },
    { href: '/history',   label: 'History',  id: 'history' },
    { href: '/chat',      label: 'Stylist',  id: 'chat' },
  ]
  return (
    <div className="desktop-nav-links" style={{ display: 'flex', gap: '0.25rem' }}>
      {links.map((l) => (
        <a key={l.href} href={l.href} style={{
          padding: '0.4rem 0.9rem', borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem', textDecoration: 'none',
          color: active === l.id ? 'var(--accent)' : 'var(--text-secondary)',
          background: active === l.id ? 'var(--accent-glow)' : 'transparent',
          border: active === l.id ? '1px solid var(--accent-border)' : '1px solid transparent',
          transition: 'all 0.15s ease',
        }}>
          {l.label}
        </a>
      ))}
    </div>
  )
}

function SpinnerIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'spin-slow 1s linear infinite', flexShrink: 0 }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

/* ── Virtual Try-On Component ── */
type TryOnProps = {
  bodyPhotoUrl: string | null
  items: WardrobeItem[]
  weather: { temp: number; condition: string; icon: string }
  occasionLabel: string
  tryOnResults: Record<string, string>   // itemId → AI-generated image URL
  tryOnLoading: Set<string>              // itemIds currently being processed
}

// Maps item type → which body zone it covers (as % of photo height)
function getBodyZone(type: string): { top: string; height: string; label: string } {
  const t = type.toLowerCase()
  if (['shirt','t-shirt','polo','blouse','sweater','hoodie','jacket','coat','blazer','vest'].includes(t))
    return { top: '16%', height: '28%', label: 'Top' }
  if (['pants','jeans','shorts','skirt','suit'].includes(t))
    return { top: '46%', height: '28%', label: 'Bottom' }
  if (['shoes','sneakers','boots','sandals','loafers'].includes(t))
    return { top: '74%', height: '20%', label: 'Shoes' }
  if (['dress'].includes(t))
    return { top: '16%', height: '58%', label: 'Dress' }
  return { top: '35%', height: '26%', label: 'Item' }
}

function VirtualTryOn({ bodyPhotoUrl, items, weather, occasionLabel, tryOnResults, tryOnLoading }: TryOnProps) {
  // If AI try-on is complete — show person wearing each garment as separate cards
  const allAIDone = items.length > 0 && items.every((i) => tryOnResults[i.id])

  // If AI try-on is complete — show the person in each garment as cards
  if (allAIDone) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '240px' }}>
        <p style={{ fontSize: '0.6rem', color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.04em', textAlign: 'center' }}>
          ✨ AI Try-On Complete
        </p>
        {items.map((item) => (
          <div key={item.id} style={{
            borderRadius: 'var(--radius-lg)', overflow: 'hidden',
            border: '1px solid var(--accent-border)',
            position: 'relative',
            boxShadow: '0 4px 20px rgba(201,168,76,0.15)',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tryOnResults[item.id]} alt={`Wearing ${item.type}`}
              style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
              padding: '0.5rem 0.6rem',
            }}>
              <p style={{ fontSize: '0.65rem', fontWeight: 600, color: 'white' }}>
                {TYPE_ICONS[item.type] ?? '👗'} {formatLabel(item.color)} {formatLabel(item.type)}
              </p>
            </div>
            <div style={{
              position: 'absolute', top: '8px', right: '8px',
              background: 'var(--accent)', borderRadius: '999px',
              padding: '0.1rem 0.4rem', fontSize: '0.55rem',
              fontWeight: 700, color: '#000',
            }}>AI ✓</div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div style={{ position: 'relative', width: '240px' }}>
      {/* Body photo card — clothing items overlaid directly on body zones */}
      <div style={{
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        border: '1px solid var(--accent-border)', background: 'var(--bg-elevated)',
        aspectRatio: '3/4', position: 'relative',
        boxShadow: '0 8px 32px rgba(201,168,76,0.12)',
      }}>

        {/* Base body photo */}
        {bodyPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bodyPhotoUrl} alt="Your front photo"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '0.5rem' }}>
            <span style={{ fontSize: '2.5rem' }}>🧍</span>
            <p style={{ fontSize: '0.7rem', textAlign: 'center', padding: '0 1rem' }}>
              Complete onboarding to see your photo
            </p>
          </div>
        )}

        {/* Clothing overlays — placed directly on the correct body zones */}
        {items.slice(0, 4).map((item) => {
          const zone = getBodyZone(item.type)
          return (
            <div
              key={item.id}
              title={`${formatLabel(item.color)} ${formatLabel(item.type)}`}
              style={{
                position: 'absolute',
                top: zone.top,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '58%',
                height: zone.height,
                borderRadius: '10px',
                overflow: 'hidden',
                opacity: 0.88,
                pointerEvents: 'none',
                zIndex: 5,
                border: '1.5px solid rgba(201,168,76,0.45)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.photo_url}
                alt={`${item.color} ${item.type}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
              />
            </div>
          )
        })}

        {/* Zone label pills — small readable labels at the zone edge */}
        {items.slice(0, 4).map((item) => {
          const zone = getBodyZone(item.type)
          return (
            <div
              key={`label-${item.id}`}
              style={{
                position: 'absolute',
                top: zone.top,
                left: '6px',
                background: 'rgba(0,0,0,0.72)',
                backdropFilter: 'blur(4px)',
                border: '1px solid var(--accent-border)',
                borderRadius: '999px',
                padding: '0.1rem 0.4rem',
                fontSize: '0.55rem',
                color: 'var(--accent)',
                fontWeight: 600,
                letterSpacing: '0.03em',
                zIndex: 15,
                pointerEvents: 'none',
              }}
            >
              {zone.label}
            </div>
          )
        })}

        {/* Gradient overlay bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
          pointerEvents: 'none', zIndex: 6,
        }} />

        {/* Weather + occasion badge */}
        <div style={{
          position: 'absolute', bottom: '10px', left: '10px', right: '10px',
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
          borderRadius: 'var(--radius-md)', padding: '0.45rem 0.7rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          border: '1px solid rgba(201,168,76,0.2)', zIndex: 20,
        }}>
          <span>{weather.icon}</span>
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'white' }}>
              {weather.temp}°C · {weather.condition}
            </p>
            <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.55)' }}>
              {occasionLabel}
            </p>
          </div>
        </div>

        {/* "Try-On" gold badge top-left */}
        <div style={{
          position: 'absolute', top: '10px', right: '10px',
          background: 'var(--accent)', borderRadius: '999px',
          padding: '0.2rem 0.55rem',
          fontSize: '0.58rem', fontWeight: 700, color: '#000',
          letterSpacing: '0.04em', textTransform: 'uppercase', zIndex: 20,
        }}>
          ✨ Try-On
        </div>
      </div>

      {/* Item chips below the photo */}
      {items.length > 0 && (
        <div style={{
          marginTop: '0.75rem',
          display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {items.slice(0, 4).map((item) => (
            <span key={item.id} style={{
              fontSize: '0.6rem', padding: '0.15rem 0.5rem',
              borderRadius: '999px',
              background: 'var(--accent-glow)', color: 'var(--accent)',
              border: '1px solid var(--accent-border)',
              whiteSpace: 'nowrap',
            }}>
              {TYPE_ICONS[item.type] ?? '👗'} {formatLabel(item.type)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function formatLabel(str: string) {
  if (!str) return ''
  return str.replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
