import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aanavandi Parcel - KSRTC Bus Cargo Booking & Public Tracking",
  description:
    "Book state bus parcels between Kerala bus stations with real-time public tracking by reference number.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-paper-light dark:bg-paper-dark text-slate-900 dark:text-slate-100 antialiased selection:bg-amber-400 selection:text-slate-950">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
