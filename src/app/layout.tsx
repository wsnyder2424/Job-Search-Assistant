import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dosely — pet medication tracker",
  description:
    "Track your pet's medications and see at a glance what is due next, shared across everyone who cares for them.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The schedule is a touch target list; keep it stable under the thumb.
  maximumScale: 5,
  themeColor: "#f6f7f9",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto min-h-dvh w-full max-w-md bg-[var(--color-bg-secondary)]">
          {children}
        </div>
      </body>
    </html>
  );
}
