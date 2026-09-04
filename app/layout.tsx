import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { PwaRegistration } from '@/components/PwaRegistration';
import { PwaLaunchSplash } from '@/components/PwaLaunchSplash';

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist',
});

export const metadata: Metadata = {
  title: 'FIQT',
  description: 'Reseñas académicas independientes para FIQT.',
  applicationName: 'FIQT',
  manifest: '/manifest.webmanifest',
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    title: 'FIQT',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#09234f',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={geist.variable} lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "try{if(window.navigator.standalone||window.matchMedia('(display-mode: standalone)').matches){var r=document.documentElement;r.classList.add('pwa-standalone');var h=Number(localStorage.getItem('fiqt-pwa-hidden-at'));var long=h>0&&Date.now()-h>=1800000;if(sessionStorage.getItem('fiqt-pwa-splash-shown')==='1'&&!long){r.classList.add('pwa-content-ready','pwa-splash-skip')}}}catch(e){}",
          }}
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone-11-portrait.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
      </head>
      <body className="overflow-x-clip font-sans antialiased">
        <PwaRegistration />
        <PwaLaunchSplash />
        <div className="page-shell flex min-h-screen flex-col">
          <Header />
          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
