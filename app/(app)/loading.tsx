export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 w-2/3 rounded-xl bg-panel" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 rounded-xl bg-panel" />
        <div className="h-24 rounded-xl bg-panel" />
      </div>
      <div className="h-64 rounded-2xl bg-panel" />
    </div>
  )
}
