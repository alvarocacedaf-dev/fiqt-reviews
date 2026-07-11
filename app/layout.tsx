import './globals.css';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';

export const metadata = { title: 'FIQT Reviews', description: 'Reseñas académicas independientes para FIQT.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <div className="page-shell">
          <Header />
          <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
