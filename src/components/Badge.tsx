type BadgeVariant = "type" | "status";

const typeColors: Record<string, string> = {
  TOURNAMENT: "bg-blue-100 text-blue-800",
  CHAMPIONSHIP: "bg-purple-100 text-purple-800",
  KATA: "bg-yellow-100 text-yellow-800",
  CAMP: "bg-green-100 text-green-800",
  OPEN: "bg-orange-100 text-orange-800",
  INTERNATIONAL: "bg-red-100 text-red-800",
};

const statusColors: Record<string, string> = {
  UPCOMING: "bg-blue-100 text-blue-700",
  ONGOING: "bg-green-100 text-green-700",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
};

interface BadgeProps {
  label: string;
  value: string;
  variant: BadgeVariant;
}

export default function Badge({ label, value, variant }: BadgeProps) {
  const colorClass =
    variant === "type"
      ? (typeColors[value] ?? "bg-gray-100 text-gray-600")
      : (statusColors[value] ?? "bg-gray-100 text-gray-600");

  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}
