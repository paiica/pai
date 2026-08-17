// A separate, minimal root layout scoped to just this subtree. These two
// routes (login-sync, logout-sync) are invisible iframes the student portal
// loads at a fixed, un-localized URL for SSO — they render no UI and don't
// need next-intl, fonts, or anything from the main [locale] layout.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
