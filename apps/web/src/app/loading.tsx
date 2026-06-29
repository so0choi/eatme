function SkeletonBar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-surface-container ${className}`} />;
}

function SkeletonCard() {
  return (
    <div className="rounded-3xl bg-surface-container-lowest p-6 shadow-ambient">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-3">
          <SkeletonBar className="h-3 w-24" />
          <SkeletonBar className="h-8 w-28" />
        </div>
        <div className="h-14 w-14 animate-pulse rounded-full bg-primary-container/20" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <main className="min-h-svh bg-background px-6 py-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <SkeletonBar className="h-3 w-20 bg-primary/20" />
            <SkeletonBar className="h-10 w-56 bg-surface-container" />
            <SkeletonBar className="h-4 w-44" />
          </div>
          <div className="hidden h-11 w-28 animate-pulse rounded-2xl bg-primary/20 shadow-ambient sm:block" />
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </section>

        <section className="rounded-3xl bg-surface-container-low p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <SkeletonBar className="h-10 w-56 rounded-xl bg-surface-container-lowest" />
            <div className="flex gap-2">
              <SkeletonBar className="h-10 w-24 bg-surface-container-lowest" />
              <SkeletonBar className="h-10 w-24 bg-surface-container-lowest" />
              <SkeletonBar className="hidden h-10 w-24 bg-surface-container-lowest sm:block" />
            </div>
          </div>

          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_5rem_7rem] items-center gap-4 rounded-2xl bg-surface-container-lowest px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 animate-pulse rounded-xl bg-surface-container" />
                  <div className="space-y-2">
                    <SkeletonBar className="h-4 w-28" />
                    <SkeletonBar className="h-3 w-16" />
                  </div>
                </div>
                <SkeletonBar className="h-4 w-14 justify-self-center" />
                <SkeletonBar className="h-4 w-20 justify-self-end" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
