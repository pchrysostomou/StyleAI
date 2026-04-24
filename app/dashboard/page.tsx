import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { BodyProfile } from '@/lib/types'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarded?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch body profile (soft check — don't hard-redirect if missing)
  const { data: profile } = await supabase
    .from('body_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle<BodyProfile>()

  // Also check if user has wardrobe items (to detect partial onboarding)
  const { count: wardrobeCount } = await supabase
    .from('wardrobe_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Only redirect to onboarding if NO profile AND NO wardrobe items AND not already onboarding
  const needsOnboarding = !profile && (wardrobeCount ?? 0) === 0

  const isNewlyOnboarded = params.onboarded === 'true'

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Top nav */}
      <nav
        style={{
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
          background: 'rgba(8,8,8,0.8)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <span
          className="font-display"
          style={{ fontSize: '1.25rem', color: 'var(--accent)', letterSpacing: '0.05em' }}
        >
          StyleAI
        </span>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <NavLinks active="profile" />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
            {user.email}
          </span>
          <SignOutButton />
        </div>
      </nav>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        {/* Welcome banner */}
        {isNewlyOnboarded && (
          <div
            className="animate-fade-in"
            style={{
              background: 'var(--accent-glow)',
              border: '1px solid var(--accent-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.5rem',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>🎉</span>
            <div>
              <p style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: '0.2rem' }}>
                Body profile created!
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Your AI stylist is ready. Next: add clothes to your wardrobe.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div className="gold-line" style={{ marginBottom: '1rem' }} />
          <h1 className="font-display" style={{ marginBottom: '0.5rem' }}>
            Your Style Profile
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Based on Claude Vision analysis of your photos
          </p>
        </div>

        {/* Profile Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2.5rem',
          }}
        >
          {/* Body Overview */}
          <div className="card" style={{ gridColumn: 'span 1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-glow)',
                  border: '1px solid var(--accent-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                }}
              >
                🧍
              </div>
              <h3 style={{ fontSize: '1rem' }}>Body Overview</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <StatRow label="Body Type" value={formatLabel(profile.body_type)} />
              <StatRow label="Height" value={formatLabel(profile.height_estimate)} />
              <StatRow label="Skin Tone" value={formatLabel(profile.skin_tone)} />
              <StatRow label="Hair Color" value={formatLabel(profile.hair_color)} />
            </div>
          </div>

          {/* Best Colors */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-glow)',
                  border: '1px solid var(--accent-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                }}
              >
                🎨
              </div>
              <h3 style={{ fontSize: '1rem' }}>Your Best Colors</h3>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {profile.best_colors?.map((color) => (
                <ColorSwatch key={color} color={color} />
              ))}
            </div>
          </div>

          {/* Recommended Fits */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-glow)',
                  border: '1px solid var(--accent-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                }}
              >
                👔
              </div>
              <h3 style={{ fontSize: '1rem' }}>Recommended Fits</h3>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {profile.recommended_fits?.map((fit) => (
                <span key={fit} className="tag">{formatLabel(fit)}</span>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
                AVOID
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {profile.avoid_styles?.map((s) => (
                  <span
                    key={s}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '999px',
                      background: 'rgba(224,92,92,0.08)',
                      color: 'var(--error)',
                      border: '1px solid rgba(224,92,92,0.2)',
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Style Notes */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-glow)',
                  border: '1px solid var(--accent-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                }}
              >
                ✨
              </div>
              <h3 style={{ fontSize: '1rem' }}>AI Stylist Notes</h3>
            </div>
            <p
              style={{
                color: 'var(--text-secondary)',
                lineHeight: 1.75,
                fontStyle: 'italic',
                fontSize: '0.975rem',
                borderLeft: '2px solid var(--accent)',
                paddingLeft: '1rem',
              }}
            >
              &ldquo;{profile.style_notes}&rdquo;
            </p>
          </div>
        </div>

        {/* Next step CTA */}
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, var(--bg-surface) 0%, rgba(201,168,76,0.05) 100%)',
            border: '1px solid var(--accent-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
              NEXT STEP — WEEK 2
            </p>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>Build your wardrobe</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Upload photos of your clothes and let AI categorize them automatically.
            </p>
          </div>
          <Link
            href="/wardrobe"
            className="btn btn-primary"
            style={{ padding: '0.9rem 1.75rem' }}
          >
            Open Wardrobe →
          </Link>
        </div>

        {/* Re-analyze */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link
            href="/onboarding"
            className="btn btn-ghost"
            style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}
          >
            Re-upload photos &amp; re-analyze
          </Link>
        </div>
      </div>
    </main>
  )
}

/* ─── Sub-components ─── */
function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', letterSpacing: '0.03em' }}>
        {label}
      </span>
      <span style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  )
}

function ColorSwatch({ color }: { color: string }) {
  // Map color names to approximate CSS colors
  const colorMap: Record<string, string> = {
    navy: '#1a2744', white: '#f5f5f5', black: '#111', grey: '#888',
    gray: '#888', beige: '#c8b89a', camel: '#c19a6b', burgundy: '#722f37',
    olive: '#6b7c45', cream: '#fffdd0', charcoal: '#36454f', brown: '#795548',
    slate: '#708090', khaki: '#b4a47c', tan: '#d2b48c', rust: '#b7410e',
    mustard: '#e1ad21', teal: '#008080', forest: '#228b22', emerald: '#50c878',
    blue: '#2563eb', red: '#dc2626', green: '#16a34a', purple: '#7c3aed',
    pink: '#ec4899', orange: '#ea580c', yellow: '#ca8a04', gold: '#c9a84c',
    ivory: '#fffff0', coral: '#ff6b6b', mint: '#98d8c8', lavender: '#e6e6fa',
    maroon: '#800000', indigo: '#4b0082', turquoise: '#40e0d0',
  }

  const cssColor = colorMap[color.toLowerCase()] ?? '#666'

  return (
    <div
      title={color}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.3rem 0.6rem',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        borderRadius: '999px',
      }}
    >
      <div
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: cssColor,
          border: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        {formatLabel(color)}
      </span>
    </div>
  )
}

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
        <Link
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
        </Link>
      ))}
    </div>
  )
}

function SignOutButton() {
  return (
    <form action="/api/auth/signout" method="post">
      <button
        id="signout-btn"
        type="submit"
        className="btn btn-ghost"
        style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
      >
        Sign out
      </button>
    </form>
  )
}

function formatLabel(str: string) {
  return str
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
