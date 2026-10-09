import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ModelProvider } from '@/lib/model-context';
import Navbar from '@/components/Navbar';
import ModelSelectorModal from '@/components/ModelSelectorModal';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VERBAL ARENA — AI Debate Coach & Presentation Intelligence Platform',
  description: 'AI-powered Debate Coaching, Fallacy Detection, Multi-Model Simulation, and Speech & Presentation Analysis Platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.className} min-h-screen bg-white text-black antialiased selection:bg-black selection:text-white flex flex-col justify-between`}>
        <AuthProvider>
          <ModelProvider>
            <Navbar />
            <ModelSelectorModal />
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
              {children}
            </main>
            <Footer />
          </ModelProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
