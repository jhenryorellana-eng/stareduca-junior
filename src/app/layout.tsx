import type { Metadata, Viewport } from 'next';
import { Quicksand } from 'next/font/google';
import './globals.css';

const quicksand = Quicksand({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-quicksand',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'StarEduca Junior',
  description: 'Aprende habilidades empresariales y financieras de forma divertida',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-96x96.png',
    shortcut: '/icons/icon-96x96.png',
    apple: '/icons/icon-144x144.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'StarEduca Junior',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#895af6',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" type="image/png" sizes="96x96" href="/icons/icon-96x96.png" />
        <link rel="apple-touch-icon" href="/icons/icon-144x144.png" />
      </head>
      <body className={`min-h-screen bg-white ${quicksand.variable} font-quicksand`}>
        {children}
      </body>
    </html>
  );
}
