import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "JudoKisa",
    template: "%s | JudoKisa",
  },
  description: "Finnish judo competitions, results and video streams",
};

// The html/body wrapper is in [locale]/layout.tsx so next-intl can set lang=""
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
