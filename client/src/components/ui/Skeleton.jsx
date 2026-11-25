export function Skeleton({ height = 16, width = '100%', radius = 8, style }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius, ...style }} aria-hidden="true" />;
}

export function PageSkeleton() {
  return (
    <div className="skeleton-page" aria-busy="true" aria-label="Loading">
      <Skeleton height={34} width="38%" radius={10} />
      <Skeleton height={14} width="26%" style={{ marginTop: 10 }} />
      <Skeleton height={196} radius={22} style={{ marginTop: 28 }} />
      <div className="skeleton-row">
        <Skeleton height={96} radius={18} /><Skeleton height={96} radius={18} /><Skeleton height={96} radius={18} />
      </div>
      <Skeleton height={300} radius={18} style={{ marginTop: 18 }} />
    </div>
  );
}
