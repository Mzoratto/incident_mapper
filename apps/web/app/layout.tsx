import './globals.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Metadata } from 'next';
import { Header } from '../src/components/Header';
import { ToastHub } from '../src/components/ToastHub';

export const metadata: Metadata = {
  title: 'Incident Mapper',
  description: 'Local-first incident reporting PWA'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastHub />
        <Header />
        <main className="app-container py-6 space-y-6">{children}</main>
      </body>
    </html>
  );
}
