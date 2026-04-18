import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import Badge from "./Badge";
import CapacityBar from "./CapacityBar";

interface CompetitionCardProps {
  slug: string;
  name: string;
  type: string;
  status: string;
  dateStart: Date;
  dateEnd: Date;
  city: string;
  registrationDeadline?: Date | null;
  registeredCount: number;
  capacity?: number | null;
  registrationUrl?: string | null;
}

export default function CompetitionCard({
  slug,
  name,
  type,
  status,
  dateStart,
  dateEnd,
  city,
  registrationDeadline,
  registeredCount,
  capacity,
  registrationUrl,
}: CompetitionCardProps) {
  const t = useTranslations();
  const locale = useLocale();

  const fmt = new Intl.DateTimeFormat(locale === "fi" ? "fi-FI" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const dateRange =
    dateStart.toDateString() === dateEnd.toDateString()
      ? fmt.format(dateStart)
      : `${fmt.format(dateStart)} – ${fmt.format(dateEnd)}`;

  const isFull = capacity != null && registeredCount >= capacity;
  const deadlineSoon =
    registrationDeadline != null &&
    status === "UPCOMING" &&
    !isFull &&
    registrationDeadline.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  return (
    <Link
      href={`/${locale}/competitions/${slug}`}
      className="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Badges row */}
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge label={t(`types.${type}`)} value={type} variant="type" />
        <Badge label={t(`status.${status}`)} value={status} variant="status" />
      </div>

      {/* Name */}
      <h3 className="mb-1 text-base font-semibold text-gray-900 group-hover:text-primary-light line-clamp-2">
        {name}
      </h3>

      {/* Date + city */}
      <p className="mb-3 text-sm text-gray-500">
        {dateRange} &middot; {city}
      </p>

      {/* Capacity bar */}
      {capacity != null && (
        <div className="mb-3">
          <CapacityBar
            registered={registeredCount}
            capacity={capacity}
            label={t("competitions.capacity")}
          />
        </div>
      )}

      {/* Registration deadline / full / closed */}
      {status === "UPCOMING" && (
        <div className="mt-auto pt-2">
          {isFull ? (
            <span className="text-xs font-medium text-danger">
              {t("competitions.full")}
            </span>
          ) : registrationDeadline ? (
            <span
              className={`text-xs ${deadlineSoon ? "font-semibold text-warning" : "text-gray-500"}`}
            >
              {t("competitions.registration_deadline")}:{" "}
              {fmt.format(registrationDeadline)}
            </span>
          ) : registrationUrl ? (
            <span className="text-xs font-medium text-primary-light">
              {t("competitions.register")} →
            </span>
          ) : null}
        </div>
      )}
    </Link>
  );
}
