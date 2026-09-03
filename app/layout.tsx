import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';

const hotelFont = Poppins({
  variable: '--font-hotelx',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Transport Schedule | HotelX',
  description: 'HotelX speedboat schedule and passenger management prototype.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${hotelFont.variable} antialiased`}>{children}</body>
    </html>
  );
}
