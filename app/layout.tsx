import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import { HotelXBreadcrumbNavigation } from '@/components/hotelx-breadcrumb-navigation';
import { NumberInputGuard } from '@/components/number-input-guard';
import './globals.css';
import './frontdesk-overrides.css';
import './frontdesk-side-icon.css';
import './housekeeping-snackbar.css';
import './transport-report-fix.css';
import './sidebar-hotelx.css';

const hotelFont = Poppins({
  variable: '--font-hotelx',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'HotelX',
  description: 'HotelX speedboat schedule and passenger management prototype.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${hotelFont.variable} antialiased`}>
        <HotelXBreadcrumbNavigation />
        <NumberInputGuard />
        {children}
      </body>
    </html>
  );
}
