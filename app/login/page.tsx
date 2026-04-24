'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        position: 'relative',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'fixed',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '400px',
          background: 'radial-gradient(ellipse, rgba(201,168,76,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="animate-fade-in-up"
        style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Link
            href="/"
            className="font-display"
            style={{
              fontSize: '1.75rem',
              color: 'var(--accent)',
              letterSpacing: '0.05em',
              textDecoration: 'none',
              display: 'block',
              marginBottom: '0.5rem',
            }}
          >
            StyleAI
          </Link>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Welcome back
          </p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          {/* Google OAuth */}
          <button
            id="google-login-btn"
            className="btn btn-secondary"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            style={{ width: '100%', marginBottom: '1.5rem', gap: '0.75rem' }}
          >
            {googleLoading ? (
              <span style={{ fontSize: '0.8rem', letterSpacing: '0.05em' }}>REDIRECTING...</span>
            ) : (
              <>
                <GoogleIcon />
                Continue with Google
              </>
            )}
          </button>

          <div className="divider" style={{ marginBottom: '1.5rem' }}>
            OR
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label
                htmlFor="login-email"
                style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', letterSpacing: '0.04em' }}
              >
                EMAIL
              </label>
              <input
                id="login-email"
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', letterSpacing: '0.04em' }}
              >
                PASSWORD
              </label>
              <input
                id="login-password"
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p
                style={{
                  color: 'var(--error)',
                  fontSize: '0.8rem',
                  padding: '0.75rem',
                  background: 'rgba(224,92,92,0.08)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(224,92,92,0.2)',
                }}
              >
                {error}
              </p>
            )}

            <button
              id="login-submit-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '0.5rem', padding: '0.9rem' }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            color: 'var(--text-muted)',
            fontSize: '0.875rem',
          }}
        >
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
