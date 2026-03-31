import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from 'sonner';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DSTECH | NOC Performance Manager',
  description: 'Plataforma de Gestão de SLA e Desempenho de Técnicos de Campo',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} min-h-screen bg-background antialiased`}>
        <NuqsAdapter>
          <Providers>
            {children}
            <Toaster richColors position="top-right" />
          </Providers>
        </NuqsAdapter>
      </body>
    </html>
  );
}
