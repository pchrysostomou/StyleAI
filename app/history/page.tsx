'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type WardrobeItem = {
  id: string; photo_url: string; type: string; color: string; style: string
}
type OutfitRecord = {
  id: string; item_ids: string[]; occasion: string; rating: number | null
  date: string; reasoning: string; style_tip: string
  weather: { temp: number; condition: string; icon: string }
}

const OCCASION_EMOJI: Record<string, string> = {
  casual:'☀️', work:'💼', sport:'🏃', formal:'🤵', event:'🌙'
}
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const TYPE_ICONS: Record<string, string> = {
  shirt:'👔','t-shirt':'👕',pants:'👖',jeans:'👖',shoes:'👟',sneakers:'👟',
  jacket:'🧥',dress:'👗',boots:'👢',coat:'🧥',blazer:'🤵',other:'👗'
}

function NavBar({ active }: { active: string }) {
  const links = [
    ['dashboard','👤','Profile'],['wardrobe','👗','Wardrobe'],
    ['outfit','✨','Outfit'],['history','📅','History'],['chat','💬','Stylist']
  ]
  return (
    <>
      <nav className="site-nav">
        <span className="font-display" style={{ fontSize:'1.2rem', color:'var(--accent)', letterSpacing:'0.05em', flexShrink:0 }}>StyleAI</span>
        <div className="site-nav-links desktop-nav-links">
          {links.map(([href,,label]) => (
            <a key={href} href={`/${href}`} className={`nav-link${href===active?' active':''}`}>{label}</a>
          ))}
        </div>
        <form action="/api/auth/signout" method="post">
          <button className="btn btn-ghost" style={{ fontSize:'0.8rem' }}>Sign out</button>
        </form>
      </nav>
      <div className="mobile-bottom-nav">
        <div className="mobile-bottom-nav-inner">
          {links.map(([href,icon,label]) => (
            <a key={href} href={`/${href}`} className={`mobile-nav-item${href===active?' active':''}`}>
              <span className="icon">{icon}</span><span>{label}</span>
            </a>
          ))}
        </div>
      </div>
    </>
  )
}

export default function HistoryPage() {
  const supabase = createClient()
  const [outfits, setOutfits]   = useState<OutfitRecord[]>([])
  const [wardrobe, setWardrobe] = useState<Record<string, WardrobeItem>>({})
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<OutfitRecord | null>(null)
  const [calMonth, setCalMonth] = useState(() => new Date())
  const [view, setView]         = useState<'calendar'|'list'>('calendar')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: oh }, { data: wi }] = await Promise.all([
      supabase.from('outfit_history').select('*').order('date', { ascending: false }),
      supabase.from('wardrobe_items').select('id,photo_url,type,color,style'),
    ])
    setOutfits(oh ?? [])
    const map: Record<string, WardrobeItem> = {}
    ;(wi ?? []).forEach((i: WardrobeItem) => { map[i.id] = i })
    setWardrobe(map)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const year = calMonth.getFullYear()
  const month = calMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date().toISOString().slice(0, 10)

  const outfitByDate: Record<string, OutfitRecord[]> = {}
  outfits.forEach(o => {
    const d = o.date?.slice(0, 10)
    if (d) outfitByDate[d] = [...(outfitByDate[d] ?? []), o]
  })

  return (
    <main style={{ minHeight:'100vh', background:'var(--bg-base)', paddingBottom:'80px' }}>
      <NavBar active="history" />

      <div className="page-inner">
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem', marginBottom:'2rem' }}>
          <div>
            <div className="gold-line" style={{ marginBottom:'0.75rem' }} />
            <h1 className="font-display" style={{ fontSize:'clamp(1.75rem,3vw,2.25rem)', marginBottom:'0.3rem' }}>Outfit History</h1>
            <p style={{ color:'var(--text-secondary)', fontSize:'0.875rem' }}>{outfits.length} outfit{outfits.length!==1?'s':''} recorded</p>
          </div>
          <div style={{ display:'flex', gap:'0.5rem' }}>
            <button onClick={() => setView('calendar')} className={`btn ${view==='calendar'?'btn-primary':'btn-secondary'}`} style={{ fontSize:'0.8rem', padding:'0.5rem 1rem' }}>📅 Calendar</button>
            <button onClick={() => setView('list')} className={`btn ${view==='list'?'btn-primary':'btn-secondary'}`} style={{ fontSize:'0.8rem', padding:'0.5rem 1rem' }}>☰ List</button>
          </div>
        </div>

        {loading && (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:'80px', borderRadius:'var(--radius-lg)' }} />)}
          </div>
        )}

        {!loading && outfits.length === 0 && (
          <div style={{ textAlign:'center', padding:'4rem 2rem', border:'1px dashed var(--border-strong)', borderRadius:'var(--radius-xl)' }}>
            <p style={{ fontSize:'3rem', marginBottom:'1rem' }}>📅</p>
            <h3 className="font-display" style={{ marginBottom:'0.5rem' }}>No outfits yet</h3>
            <p style={{ color:'var(--text-secondary)', fontSize:'0.9rem', marginBottom:'1.5rem' }}>Generate your first outfit to start tracking your style</p>
            <a href="/outfit" className="btn btn-primary">✨ Generate Outfit</a>
          </div>
        )}

        {/* ── Calendar View ── */}
        {!loading && outfits.length > 0 && view === 'calendar' && (
          <div className="animate-fade-in">
            <div className="card" style={{ padding:'1.5rem', marginBottom:'1.5rem' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
                <button onClick={() => setCalMonth(d => new Date(d.getFullYear(), d.getMonth()-1, 1))} className="btn btn-ghost" style={{ padding:'0.4rem 0.75rem', fontSize:'1rem' }}>←</button>
                <h2 className="font-display" style={{ fontSize:'1.1rem', fontWeight:500 }}>{MONTHS[month]} {year}</h2>
                <button onClick={() => setCalMonth(d => new Date(d.getFullYear(), d.getMonth()+1, 1))} className="btn btn-ghost" style={{ padding:'0.4rem 0.75rem', fontSize:'1rem' }}>→</button>
              </div>

              <div className="calendar-grid" style={{ marginBottom:'0.4rem' }}>
                {DAYS.map(d => (
                  <div key={d} style={{ textAlign:'center', fontSize:'0.65rem', color:'var(--text-muted)', letterSpacing:'0.06em', padding:'0.25rem 0' }}>{d.toUpperCase()}</div>
                ))}
              </div>

              <div className="calendar-grid">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                  const dayOutfits = outfitByDate[dateStr] ?? []
                  const isToday = dateStr === today
                  const isSelected = selected?.date?.slice(0,10) === dateStr
                  return (
                    <div
                      key={day}
                      className="calendar-day"
                      onClick={() => dayOutfits.length > 0 && setSelected(isSelected ? null : dayOutfits[0])}
                      style={{
                        minHeight:'52px', borderRadius:'var(--radius-md)', padding:'0.35rem',
                        cursor: dayOutfits.length > 0 ? 'pointer' : 'default',
                        border: isSelected ? '1px solid var(--accent)' : isToday ? '1px solid var(--border-strong)' : '1px solid transparent',
                        background: isSelected ? 'var(--accent-glow)' : dayOutfits.length > 0 ? 'var(--bg-elevated)' : 'transparent',
                        transition:'all 0.15s ease', display:'flex', flexDirection:'column', gap:'2px',
                      }}
                    >
                      <span style={{ fontSize:'0.72rem', fontWeight: isToday ? 600 : 400, color: isToday ? 'var(--accent)' : 'var(--text-secondary)' }}>{day}</span>
                      {dayOutfits[0] && <span style={{ fontSize:'0.85rem', lineHeight:1 }}>{OCCASION_EMOJI[dayOutfits[0].occasion] ?? '👗'}</span>}
                      {dayOutfits.length > 1 && <span style={{ fontSize:'0.55rem', color:'var(--text-muted)' }}>+{dayOutfits.length-1}</span>}
                    </div>
                  )
                })}
              </div>
            </div>

            {selected && (
              <div className="card animate-slide-up" style={{ padding:'1.5rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
                  <div>
                    <span style={{ fontSize:'0.7rem', color:'var(--text-muted)', letterSpacing:'0.05em' }}>
                      {new Date(selected.date).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' }).toUpperCase()}
                    </span>
                    <h3 style={{ fontSize:'1rem', marginTop:'0.2rem' }}>{OCCASION_EMOJI[selected.occasion]} {selected.occasion?.replace(/\b\w/g,c=>c.toUpperCase())} Outfit</h3>
                  </div>
                  <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:'1.2rem' }}>×</button>
                </div>
                <div style={{ display:'flex', gap:'0.6rem', overflowX:'auto', paddingBottom:'0.5rem', marginBottom:'1rem' }}>
                  {selected.item_ids.map(id => {
                    const item = wardrobe[id]; if (!item) return null
                    return (
                      <div key={id} style={{ flexShrink:0, width:'90px' }}>
                        <div style={{ borderRadius:'var(--radius-md)', overflow:'hidden', aspectRatio:'1/1', background:'var(--bg-elevated)', marginBottom:'0.35rem' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.photo_url} alt={item.type} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        </div>
                        <p style={{ fontSize:'0.65rem', textAlign:'center', color:'var(--text-muted)' }}>{TYPE_ICONS[item.type]??'👗'} {item.color}</p>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display:'flex', gap:'0.25rem', marginBottom:'0.75rem' }}>
                  {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize:'1rem', opacity: selected.rating && s<=selected.rating ? 1 : 0.25 }}>⭐</span>)}
                  {selected.rating && <span style={{ fontSize:'0.75rem', color:'var(--accent)', marginLeft:'0.25rem', alignSelf:'center' }}>{selected.rating}/5</span>}
                </div>
                <p style={{ fontSize:'0.82rem', color:'var(--text-secondary)', lineHeight:1.7, borderLeft:'2px solid var(--accent)', paddingLeft:'0.75rem', fontStyle:'italic' }}>
                  &ldquo;{selected.reasoning}&rdquo;
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── List View ── */}
        {!loading && outfits.length > 0 && view === 'list' && (
          <div className="animate-fade-in" style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {outfits.map(outfit => {
              const items = outfit.item_ids.map(id => wardrobe[id]).filter(Boolean)
              const isOpen = selected?.id === outfit.id
              return (
                <div key={outfit.id} onClick={() => setSelected(isOpen ? null : outfit)}
                  style={{
                    border:`1px solid ${isOpen?'var(--accent)':'var(--border)'}`,
                    borderRadius:'var(--radius-lg)', background: isOpen ? 'var(--accent-glow)' : 'var(--bg-surface)',
                    padding:'1rem 1.25rem', cursor:'pointer', transition:'all 0.15s ease',
                  }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
                    <div style={{ minWidth:'80px' }}>
                      <p style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>{new Date(outfit.date).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}</p>
                      <p style={{ fontSize:'0.8rem', fontWeight:500 }}>{OCCASION_EMOJI[outfit.occasion]} {outfit.occasion?.replace(/\b\w/g,c=>c.toUpperCase())}</p>
                    </div>
                    <div style={{ display:'flex', gap:'0.35rem', flex:1 }}>
                      {items.slice(0,4).map(item => (
                        <div key={item.id} style={{ width:'44px', height:'44px', borderRadius:'var(--radius-sm)', overflow:'hidden', flexShrink:0 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.photo_url} alt={item.type} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      {outfit.weather && <p style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{outfit.weather.icon} {outfit.weather.temp}°C</p>}
                      {outfit.rating && <p style={{ fontSize:'0.7rem', color:'var(--accent)' }}>{'⭐'.repeat(outfit.rating)}</p>}
                    </div>
                  </div>
                  {isOpen && (
                    <div className="animate-fade-in" style={{ marginTop:'0.875rem', paddingTop:'0.875rem', borderTop:'1px solid var(--border)' }}>
                      <p style={{ fontSize:'0.82rem', color:'var(--text-secondary)', lineHeight:1.7, fontStyle:'italic', borderLeft:'2px solid var(--accent)', paddingLeft:'0.75rem' }}>
                        &ldquo;{outfit.reasoning}&rdquo;
                      </p>
                      {outfit.style_tip && <p style={{ fontSize:'0.78rem', color:'var(--text-secondary)', marginTop:'0.5rem' }}>💡 {outfit.style_tip}</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
