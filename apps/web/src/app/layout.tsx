import type { Metadata } from 'next';
import { AssistantWidgetProvider } from '@/components/AssistantWidgetProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpenCodeApp',
  description: 'A web app that users can edit themselves',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <AssistantWidgetProvider />
      </body>
    </html>
  );
}
