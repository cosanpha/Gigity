import { AuthTokenBootstrap } from '@/components/AuthTokenBootstrap'
import { PUBLIC_APP_URL } from '@/constants/env.server'
import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = {
  title: 'Gigity',
  description:
    'AI video workflow for short-form ads: set your brand once, then run guided steps from script to publish-ready clips.',
  keywords:
    'Gigity, AI video, video workflow, short-form ads, commercial video, brand video, content creation, video production, ad creative',
  icons: {
    icon: ['/favicon.ico?v=4'],
    apple: ['/apple-touch-icon.png?v=4'],
    shortcut: ['/apple-touch-icon.png'],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'Gigity',
    description:
      'AI video workflow for short-form ads: set your brand once, then run guided steps from script to publish-ready clips.',
    url: PUBLIC_APP_URL,
    siteName: 'Gigity',
    images: [
      {
        url: `${PUBLIC_APP_URL}/logo.png`,
        width: 1200,
        height: 630,
        alt: 'Gigity',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gigity',
    description:
      'AI video workflow for short-form ads: set your brand once, then run guided steps from script to publish-ready clips.',
    images: [`${PUBLIC_APP_URL}/logo.png`],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthTokenBootstrap />
        {children}
      </body>
    </html>
  )
}
