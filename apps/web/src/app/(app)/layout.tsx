export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-svh bg-background">
      <div className="px-6 py-6">{children}</div>
    </main>
  );
}
