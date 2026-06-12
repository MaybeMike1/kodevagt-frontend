export function formatCount(value: number): string {
  return new Intl.NumberFormat(undefined).format(value);
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (Math.abs(diffSec) < 60) {
    return rtf.format(-diffSec, "second");
  }
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) {
    return rtf.format(-diffMin, "minute");
  }
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) {
    return rtf.format(-diffHour, "hour");
  }
  const diffDay = Math.round(diffHour / 24);
  if (Math.abs(diffDay) < 30) {
    return rtf.format(-diffDay, "day");
  }
  const diffMonth = Math.round(diffDay / 30);
  if (Math.abs(diffMonth) < 12) {
    return rtf.format(-diffMonth, "month");
  }
  const diffYear = Math.round(diffMonth / 12);
  return rtf.format(-diffYear, "year");
}
