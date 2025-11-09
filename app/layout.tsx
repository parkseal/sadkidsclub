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
      <head>@import url('https://fonts.googleapis.com/css2?family=Inconsolata:wght@200..900&display=swap');
</head>
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