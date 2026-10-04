export default function KnowledgeLoading() {
  return (
    <div className="flex w-full flex-1 flex-col bg-background-subtle">
      <div className="mx-auto w-full max-w-6xl px-6 py-8 sm:px-8 sm:py-10">
        <div className="animate-pulse space-y-3">
          <div className="h-8 w-64 rounded-lg bg-card ring-1 ring-border" />
          <div className="h-4 w-full max-w-lg rounded bg-card ring-1 ring-border" />
        </div>

        <div className="mt-8 grid animate-pulse grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-24 bg-card" />
          ))}
        </div>

        <div className="mt-8 grid animate-pulse gap-6 lg:grid-cols-2">
          <div className="h-96 rounded-xl bg-card ring-1 ring-border" />
          <div className="h-96 rounded-xl bg-card ring-1 ring-border" />
        </div>
      </div>
    </div>
  );
}
