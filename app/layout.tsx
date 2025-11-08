/* APP LAYOUT */

import type { Metadata } from "next";
import Script from 'next/script'
import './globals.css' 

export const metadata: Metadata = {
  title: ":(            sadkidsclub",
  description: "a mood zine generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Script 
          src="https://unpkg.com/isotope-layout@3/dist/isotope.pkgd.min.js"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}