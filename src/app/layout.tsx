import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import BottomNav from "@/components/layout/BottomNav";
import AuthModal from "@/components/auth/AuthModal";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Quiniela 2026 - World Cup 2026",
  description: "Plataforma de predicciones y quinielas para la Copa del Mundo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full flex flex-col md:flex-row bg-base text-content overflow-hidden relative">
        {/* Modal de Autenticación Global */}
        <AuthModal />
        
        {/* Navigation Sidebar (Desktop) */}
        <Sidebar />
        
        <div className="flex-1 flex flex-col h-full overflow-hidden pb-16 md:pb-0">
          {/* Navigation Topbar (Mobile) */}
          <Topbar />
          
          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            {children}
          </main>
        </div>

        {/* Bottom Navigation (Mobile) */}
        <BottomNav />
      </body>
    </html>
  );
}
