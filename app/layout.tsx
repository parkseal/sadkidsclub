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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inconsolata:wght@200..900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Script 
          src="https://unpkg.com/isotope-layout@3/dist/isotope.pkgd.min.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://unpkg.com/imagesloaded@5/imagesloaded.pkgd.min.js"
          strategy="beforeInteractive"
        />

        {children}
      </body>
    </html>
  );
}