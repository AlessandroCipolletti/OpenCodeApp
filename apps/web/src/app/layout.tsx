import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenCodeApp",
  description: "Multi-tenant coding agent platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <a href="/" className="text-xl font-bold text-indigo-600">
              OpenCodeApp
            </a>
            <span className="text-sm text-gray-500">Multi-tenant platform</span>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
