import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  return (
    <main className="page-container" style={{ overflow: 'hidden' }}>
      {/* Gradient orbs */}
      <div
        style={{
          position: 'fixed',
          top: '-20vh',
          left: '-10vw',
          width: '60vw',
          height: '60vh',
          background:
            'radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: '-20vh',
          right: '-10vw',
          width: '50vw',
          height: '50vh',
          background:
            'radial-gradient(ellipse, rgba(201,168,76,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Nav */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: '1.25rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
          background: 'rgba(8,8,8,0.7)',
        }}
      >
        <span className="font-display" style={{ fontSize: '1.25rem', color: 'var(--accent)', letterSpacing: '0.05em' }}>
          StyleAI
        </span>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/login" className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>
            Sign in
          </Link>
          <Link href="/signup" className="btn btn-primary" style={{ padding: '0.6rem 1.4rem' }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="content-center"
        style={{
          paddingTop: '6rem',
          paddingBottom: '4rem',
          paddingInline: '1.5rem',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div className="animate-fade-in-up" style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div className="tag" style={{ marginBottom: '1.5rem' }}>
            Powered by Claude Vision AI
          </div>

          <h1
            className="font-display"
            style={{
              marginBottom: '1.5rem',
              background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--accent) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Your personal<br />
            <em>AI stylist</em>
          </h1>

          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              color: 'var(--text-secondary)',
              maxWidth: '520px',
              margin: '0 auto 2.5rem',
              lineHeight: 1.7,
            }}
          >
            Upload your wardrobe. Let AI analyze your body type, skin tone, and style.
            Get a curated daily outfit — every single morning.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" className="btn btn-primary" style={{ padding: '0.9rem 2.25rem', fontSize: '1rem' }}>
              Start for free
            </Link>
            <Link href="/login" className="btn btn-secondary" style={{ padding: '0.9rem 2.25rem', fontSize: '1rem' }}>
              Sign in
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.25rem',
            maxWidth: '900px',
            margin: '5rem auto 0',
            width: '100%',
          }}
        >
          {[
            { icon: '📸', title: 'Body Analysis', desc: 'Claude Vision analyzes your body type, proportions, and coloring from 3 photos.' },
            { icon: '👗', title: 'Smart Wardrobe', desc: 'AI categorizes every item — color, style, season, fit — automatically.' },
            { icon: '✨', title: 'Daily Outfits', desc: 'Wake up to a perfectly curated outfit based on weather, occasion, and you.' },
          ].map((f, i) => (
            <div
              key={i}
              className="card"
              style={{
                textAlign: 'left',
                animationDelay: `${i * 0.1}s`,
                animationFillMode: 'both',
                animation: `fadeInUp 0.5s ease ${i * 0.1}s forwards`,
                opacity: 0,
              }}
            >
              <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{f.icon}</div>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.05rem' }}>{f.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
