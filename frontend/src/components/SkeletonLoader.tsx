export function SkeletonLoader() {
  return (
    <div className="animate-pulse space-y-4 max-w-3xl mx-auto px-4 py-12">
      <div className="h-8 bg-neutral-200 rounded w-2/3" />
      <div className="h-4 bg-neutral-200 rounded w-full" />
      <div className="h-4 bg-neutral-200 rounded w-full" />
      <div className="h-4 bg-neutral-200 rounded w-4/5" />
    </div>
  );
}
