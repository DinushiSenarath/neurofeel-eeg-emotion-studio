import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeuroFeel | EEG Emotion Studio",
  description: "A web platform that makes a DE feature based EEG emotion recognition model usable without notebooks. Real results from a subject independent LOSO study on FACED.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
