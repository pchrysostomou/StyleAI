'use client'

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type WardrobeItem = {
  id: string
  photo_url: string
  type: string
  color: string
  secondary_colors: string[]
  style: string
  season: string[]
  pattern: string
  material_estimate: string
  tags: string[]
  times_worn: number
  created_at: string
}

type FilterState = {
  type: string
  style: string
  season: string
}

const TYPE_ICONS: Record<string, string> = {
  shirt: '👔', 't-shirt': '👕', polo: '👕', blouse: '👚', sweater: '🧥',
  hoodie: '🧥', jacket: '🧥', coat: '🧥', blazer: '🤵', vest: '🦺',
  pants: '👖', jeans: '👖', shorts: '🩳', skirt: '👗', dress: '👗',
  suit: '🤵', shoes: '👟', sneakers: '👟', boots: '👢', sandals: '👡',
  loafers: '👞', bag: '👜', accessory: '💍', other: '👗',
}

const COLOR_MAP: Record<string, string> = {
  white: '#f5f5f5', black: '#111', navy: '#1a2744', grey: '#888',
  gray: '#888', beige: '#c8b89a', brown: '#795548', red: '#dc2626',
  blue: '#2563eb', green: '#16a34a', yellow: '#ca8a04', pink: '#ec4899',
  orange: '#ea580c', purple: '#7c3aed', cream: '#fffdd0', khaki: '#b4a47c',
  tan: '#d2b48c', camel: '#c19a6b', olive: '#6b7c45', teal: '#008080',
  burgundy: '#722f37', maroon: '#800000', rust: '#b7410e', mint: '#98d8c8',
  lavender: '#e6e6fa', coral: '#ff6b6b', gold: '#c9a84c', charcoal: '#36454f',
  indigo: '#4b0082', turquoise: '#40e0d0', mustard: '#e1ad21',
}

export default function WardrobePage() {
  const supabase = createClient()
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<FilterState>({ type: '', style: '', season: '' })
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load wardrobe items
  const loadItems = useCallback(async () => {
    const { data } = await supabase
      .from('wardrobe_items')
      .select('*')
      .order('created_at', { ascending: false })
    setItems(data ?? [])
    setLoaded(true)
  }, [supabase])

  // Initialize on mount
  useState(() => {
    loadItems()
  })

  // Actually trigger load on component mount
  if (!loaded) {
    loadItems()
  }

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

  async function handleFileUpload(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Max 10MB.')
      return
    }
    setError('')
    setUploading(true)
    setUploadProgress('Uploading to storage...')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upload to Supabase Storage
      const path = `${user.id}/wardrobe/${Date.now()}-${file.name.replace(/\s/g, '-')}`
      const { error: uploadError } = await supabase.storage
        .from('wardrobe-photos')
        .upload(path, file, { upsert: false })

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

      const { data: urlData } = supabase.storage
        .from('wardrobe-photos')
        .getPublicUrl(path)
      const photoUrl = urlData.publicUrl

      setUploadProgress('Analyzing with Claude Vision AI...')

      const base64 = await fileToBase64(file)
      const response = await fetch('/api/analyze-clothing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo: base64, photoUrl }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Analysis failed')
      }

      const { item } = await response.json()
      setItems((prev) => [item, ...prev])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
    } finally {
      setUploading(false)
      setUploadProgress('')
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  async function handleDelete(itemId: string) {
    const { error } = await supabase.from('wardrobe_items').delete().eq('id', itemId)
    if (!error) {
      setItems((prev) => prev.filter((i) => i.id !== itemId))
      if (selectedItem?.id === itemId) setSelectedItem(null)
    }
  }

  // Filtered items
  const filteredItems = items.filter((item) => {
    if (filters.type && item.type !== filters.type) return false
    if (filters.style && item.style !== filters.style) return false
    if (filters.season && !item.season?.includes(filters.season)) return false
    return true
  })

  // Unique values for filter dropdowns
  const types = [...new Set(items.map((i) => i.type).filter(Boolean))]
  const styles = [...new Set(items.map((i) => i.style).filter(Boolean))]

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Nav */}
      <nav
        style={{
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(8,8,8,0.9)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <span className="font-display" style={{ fontSize: '1.2rem', color: 'var(--accent)', letterSpacing: '0.05em' }}>
            StyleAI
          </span>
          <NavLinks active="wardrobe" />
        </div>
        <form action="/api/auth/signout" method="post">
          <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>Sign out</button>
        </form>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <div className="gold-line" style={{ marginBottom: '0.75rem' }} />
            <h1 className="font-display" style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', marginBottom: '0.3rem' }}>
              My Wardrobe
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {items.length} item{items.length !== 1 ? 's' : ''} — AI-categorized
            </p>
          </div>
          <button
            id="add-item-btn"
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            + Add clothing
          </button>
        </div>

        {/* Upload Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? 'var(--accent)' : uploading ? 'var(--accent)' : 'var(--border-strong)'}`,
            borderRadius: 'var(--radius-lg)',
            background: dragOver ? 'var(--accent-glow)' : uploading ? 'rgba(201,168,76,0.04)' : 'var(--bg-surface)',
            padding: '2rem',
            textAlign: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: '2rem',
          }}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file)
              e.target.value = ''
            }}
            disabled={uploading}
          />

          {uploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <SpinnerIcon />
              <p style={{ color: 'var(--accent)', fontWeight: 500 }}>Analyzing clothing...</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{uploadProgress}</p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📸</p>
              <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                Drop a photo of any clothing item
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Claude AI will automatically identify type, color, style & season
              </p>
            </div>
          )}
        </div>

        {error && (
          <div style={{
            padding: '0.875rem 1rem',
            background: 'rgba(224,92,92,0.08)',
            border: '1px solid rgba(224,92,92,0.25)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--error)',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
          }}>
            {error}
          </div>
        )}

        {/* Filters */}
        {items.length > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.75rem', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', letterSpacing: '0.04em' }}>FILTER:</span>

            <select
              id="filter-type"
              value={filters.type}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                color: filters.type ? 'var(--text-primary)' : 'var(--text-muted)',
                padding: '0.4rem 0.75rem',
                fontSize: '0.8rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">All types</option>
              {types.map((t) => <option key={t} value={t}>{formatLabel(t)}</option>)}
            </select>

            <select
              id="filter-style"
              value={filters.style}
              onChange={(e) => setFilters((f) => ({ ...f, style: e.target.value }))}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                color: filters.style ? 'var(--text-primary)' : 'var(--text-muted)',
                padding: '0.4rem 0.75rem',
                fontSize: '0.8rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">All styles</option>
              {styles.map((s) => <option key={s} value={s}>{formatLabel(s)}</option>)}
            </select>

            <select
              id="filter-season"
              value={filters.season}
              onChange={(e) => setFilters((f) => ({ ...f, season: e.target.value }))}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                color: filters.season ? 'var(--text-primary)' : 'var(--text-muted)',
                padding: '0.4rem 0.75rem',
                fontSize: '0.8rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">All seasons</option>
              {['spring', 'summer', 'autumn', 'winter'].map((s) => (
                <option key={s} value={s}>{formatLabel(s)}</option>
              ))}
            </select>

            {(filters.type || filters.style || filters.season) && (
              <button
                onClick={() => setFilters({ type: '', style: '', season: '' })}
                className="btn btn-ghost"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', color: 'var(--accent)' }}
              >
                Clear filters
              </button>
            )}

            <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Empty state */}
        {loaded && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧺</p>
            <h3 className="font-display" style={{ marginBottom: '0.5rem' }}>Your wardrobe is empty</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Upload your first clothing item to get started
            </p>
          </div>
        )}

        {/* Wardrobe Grid */}
        {filteredItems.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem',
          }}>
            {filteredItems.map((item) => (
              <WardrobeCard
                key={item.id}
                item={item}
                isSelected={selectedItem?.id === item.id}
                onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
          </div>
        )}

        {/* Item Detail Panel */}
        {selectedItem && (
          <ItemDetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} onDelete={() => handleDelete(selectedItem.id)} />
        )}
      </div>
    </main>
  )
}

/* ─── Wardrobe Card ─── */
function WardrobeCard({
  item,
  isSelected,
  onClick,
  onDelete,
}: {
  item: WardrobeItem
  isSelected: boolean
  onClick: () => void
  onDelete: () => void
}) {
  const [showDelete, setShowDelete] = useState(false)
  const typeIcon = TYPE_ICONS[item.type] ?? '👗'
  const colorCss = COLOR_MAP[item.color?.toLowerCase()] ?? '#666'

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      style={{
        border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        background: isSelected ? 'rgba(201,168,76,0.04)' : 'var(--bg-surface)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
    >
      {/* Photo */}
      <div style={{ aspectRatio: '3/4', background: 'var(--bg-elevated)', overflow: 'hidden', position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.photo_url}
          alt={`${item.color} ${item.type}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none'
          }}
        />
        {/* Type badge */}
        <div style={{
          position: 'absolute', top: '8px', left: '8px',
          background: 'rgba(0,0,0,0.7)', borderRadius: 'var(--radius-sm)',
          padding: '0.2rem 0.5rem', fontSize: '0.7rem', color: 'white',
          backdropFilter: 'blur(4px)',
        }}>
          {typeIcon} {formatLabel(item.type)}
        </div>
        {/* Delete button */}
        {showDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            style={{
              position: 'absolute', top: '8px', right: '8px',
              background: 'rgba(224,92,92,0.9)', border: 'none',
              borderRadius: '50%', width: '28px', height: '28px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'white', fontSize: '0.8rem',
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: colorCss, border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0,
          }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)' }}>
            {formatLabel(item.color)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '0.1rem 0.4rem', borderRadius: '999px' }}>
            {formatLabel(item.style)}
          </span>
          {item.season?.slice(0, 2).map((s) => (
            <span key={s} style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '0.1rem 0.4rem', borderRadius: '999px' }}>
              {s[0].toUpperCase() + s.slice(1)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Item Detail Panel ─── */
function ItemDetailPanel({
  item,
  onClose,
  onDelete,
}: {
  item: WardrobeItem
  onClose: () => void
  onDelete: () => void
}) {
  const typeIcon = TYPE_ICONS[item.type] ?? '👗'
  const colorCss = COLOR_MAP[item.color?.toLowerCase()] ?? '#666'

  return (
    <div
      className="animate-fade-in"
      style={{
        position: 'fixed', bottom: '2rem', right: '2rem',
        width: '320px', zIndex: 100,
        background: 'var(--bg-surface)',
        border: '1px solid var(--accent-border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-gold)',
      }}
    >
      {/* Photo */}
      <div style={{ height: '200px', background: 'var(--bg-elevated)', overflow: 'hidden', position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.photo_url}
          alt={`${item.color} ${item.type}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '10px', right: '10px',
            background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%',
            width: '30px', height: '30px', cursor: 'pointer', color: 'white',
            fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.25rem' }}>{typeIcon}</span>
          <h3 style={{ fontSize: '1rem' }}>
            {formatLabel(item.color)} {formatLabel(item.type)}
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
          <DetailRow label="Style" value={formatLabel(item.style)} />
          <DetailRow label="Pattern" value={formatLabel(item.pattern)} />
          <DetailRow label="Material" value={formatLabel(item.material_estimate)} />
          <DetailRow
            label="Season"
            value={item.season?.map((s) => s[0].toUpperCase() + s.slice(1)).join(', ')}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.03em' }}>Color</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: colorCss, border: '1px solid rgba(255,255,255,0.1)' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{formatLabel(item.color)}</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {item.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {item.tags.map((tag) => (
              <span key={tag} className="tag" style={{ fontSize: '0.7rem' }}>{formatLabel(tag)}</span>
            ))}
          </div>
        )}

        <button
          onClick={onDelete}
          style={{
            width: '100%', padding: '0.6rem',
            background: 'rgba(224,92,92,0.08)',
            border: '1px solid rgba(224,92,92,0.2)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--error)', fontSize: '0.8rem',
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}
        >
          Remove from wardrobe
        </button>
      </div>
    </div>
  )
}

/* ─── Nav Links ─── */
function NavLinks({ active }: { active: string }) {
  const links = [
    { href: '/dashboard', label: 'Profile',  id: 'profile' },
    { href: '/wardrobe',  label: 'Wardrobe', id: 'wardrobe' },
    { href: '/outfit',    label: 'Outfit',   id: 'outfit' },
    { href: '/history',   label: 'History',  id: 'history' },
    { href: '/chat',      label: 'Stylist',  id: 'chat' },
  ]
  return (
    <div style={{ display: 'flex', gap: '0.25rem' }}>
      {links.map((l) => (
        <a
          key={l.href}
          href={l.href}
          style={{
            padding: '0.4rem 0.9rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            textDecoration: 'none',
            color: active === l.id ? 'var(--accent)' : 'var(--text-secondary)',
            background: active === l.id ? 'var(--accent-glow)' : 'transparent',
            border: active === l.id ? '1px solid var(--accent-border)' : '1px solid transparent',
            transition: 'all 0.15s ease',
          }}
        >
          {l.label}
        </a>
      ))}
    </div>
  )
}

/* ─── Helpers ─── */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.03em' }}>{label}</span>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{value || '—'}</span>
    </div>
  )
}

function formatLabel(str: string) {
  if (!str) return '—'
  return str.replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function SpinnerIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"
      style={{ animation: 'spin-slow 1s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
