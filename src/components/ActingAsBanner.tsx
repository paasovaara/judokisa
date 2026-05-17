import Link from "next/link";

interface Props {
  name: string;
  backHref: string;
  bannerLabel: string;
  backLabel: string;
}

// Persistent strip shown at the top of /profile/dependents/[id]/* pages so
// the user is never confused about whose data they are editing.
export default function ActingAsBanner({ name, backHref, bannerLabel, backLabel }: Props) {
  return (
    <div className="mb-6 flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-primary">
        {bannerLabel.replace("{name}", name)}
      </p>
      <Link
        href={backHref}
        className="text-xs font-semibold text-primary hover:underline"
      >
        {backLabel}
      </Link>
    </div>
  );
}
