interface CapacityBarProps {
  registered: number;
  capacity: number;
  label: string; // e.g. "Osallistujia" / "Participants"
}

export default function CapacityBar({ registered, capacity, label }: CapacityBarProps) {
  const pct = Math.min(100, Math.round((registered / capacity) * 100));
  const isFull = pct >= 100;
  const isNearFull = pct >= 80;

  const barColor = isFull
    ? "bg-danger"
    : isNearFull
      ? "bg-warning"
      : "bg-primary-light";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span className="font-medium">
          {registered}/{capacity}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
