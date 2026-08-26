import './globals.css';
import { Geist } from 'next/font/google';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist',
});

export const metadata = { title: 'FIQT Reviews', description: 'Reseñas académicas independientes para FIQT.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={geist.variable} lang="es">
      <body className="overflow-x-clip font-sans antialiased">
        <div className="page-shell flex min-h-screen flex-col">
          <Header />
          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
