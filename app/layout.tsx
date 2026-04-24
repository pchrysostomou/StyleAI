import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'StyleAI — Personal AI Stylist',
  description:
    'Your personal AI stylist. Upload your wardrobe, get daily outfits tailored to your body type, skin tone, and style.',
  keywords: ['AI stylist', 'fashion', 'outfit generator', 'wardrobe', 'personal style'],
  openGraph: {
    title: 'StyleAI — Personal AI Stylist',
    description: 'AI-powered personal styling. Daily outfits tailored just for you.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
      </body>
    </html>
  )
}
