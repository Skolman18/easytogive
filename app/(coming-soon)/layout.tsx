// Minimal layout for standalone pages — no Navbar or Footer
export default function StandaloneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
