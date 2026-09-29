export default function DashboardLoading() {
  return (
    <div className="flex w-full flex-1 flex-col bg-background-subtle">
      <div className="mx-auto w-full max-w-6xl px-6 py-8 sm:px-8 sm:py-10">
        <div className="animate-pulse space-y-3">
          <div className="h-8 w-56 rounded-lg bg-card ring-1 ring-border" />
          <div className="h-4 w-full max-w-md rounded bg-card ring-1 ring-border" />
        </div>

        <div className="mt-8 grid animate-pulse grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={index} className="h-20 rounded-xl bg-card ring-1 ring-border" />
          ))}
        </div>

        <div className="mt-8 grid animate-pulse gap-6 lg:grid-cols-5">
          <div className="h-80 rounded-xl bg-card ring-1 ring-border lg:col-span-3" />
          <div className="h-80 rounded-xl bg-card ring-1 ring-border lg:col-span-2" />
        </div>

        <div className="mt-8 h-64 animate-pulse rounded-xl bg-card ring-1 ring-border" />
      </div>
    </div>
  );
}
