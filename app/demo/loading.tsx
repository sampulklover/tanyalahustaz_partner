export default function DemoLoading() {
  return (
    <div className="flex min-h-dvh flex-col bg-background-subtle">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 animate-pulse rounded-xl bg-background-subtle ring-1 ring-border" />
            <div className="h-4 w-32 animate-pulse rounded bg-background-subtle ring-1 ring-border" />
          </div>
          <div className="h-9 w-36 animate-pulse rounded-lg bg-background-subtle ring-1 ring-border" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 sm:py-10">
        <div className="animate-pulse space-y-3">
          <div className="h-8 w-48 rounded-lg bg-card ring-1 ring-border" />
          <div className="h-4 w-full max-w-lg rounded bg-card ring-1 ring-border" />
        </div>

        <div className="mt-8 grid animate-pulse gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="h-64 rounded-xl bg-card ring-1 ring-border" />
          <div className="h-96 rounded-xl bg-card ring-1 ring-border" />
        </div>

        <div className="mt-5 h-56 animate-pulse rounded-xl bg-card ring-1 ring-border" />
      </main>
    </div>
  );
}
