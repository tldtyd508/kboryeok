import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, DAILY_LAUNCH_DATE, formatDailyDate, getDailyDayNumber } from "@/lib/daily-date";

export function DailyDateNav({
  basePath,
  dateKey,
  todayKey,
  launchDate = DAILY_LAUNCH_DATE,
}: {
  basePath: string;
  dateKey: string;
  todayKey: string;
  launchDate?: string;
}) {
  const previousDate = addDays(dateKey, -1);
  const nextDate = addDays(dateKey, 1);
  const hasPrevious = previousDate >= launchDate;
  const hasNext = nextDate <= todayKey;
  const isToday = dateKey === todayKey;
  const dateHref = (targetDate: string) => targetDate === todayKey ? basePath : `${basePath}?date=${targetDate}`;

  return (
    <nav className="mb-7 flex items-center justify-between rounded-2xl border border-foreground/10 bg-card p-2 shadow-sm" aria-label="문제 날짜 이동">
      {hasPrevious ? (
        <Link href={dateHref(previousDate)} aria-label={`${previousDate} 문제로 이동`} className="grid size-11 place-items-center rounded-xl transition-colors hover:bg-muted">
          <ChevronLeft className="size-5" />
        </Link>
      ) : (
        <span className="grid size-11 place-items-center text-foreground/20" aria-hidden="true"><ChevronLeft className="size-5" /></span>
      )}

      <div className="flex min-w-0 items-center gap-3 text-center">
        <span className="hidden size-9 place-items-center rounded-xl bg-primary/10 text-primary sm:grid"><CalendarDays className="size-4" /></span>
        <div>
          <p className="text-[11px] font-black tracking-[0.16em] text-primary">DAY {getDailyDayNumber(dateKey, launchDate)}</p>
          <p className="text-sm font-black sm:text-base">{formatDailyDate(dateKey)} {isToday ? <span className="ml-1 text-xs text-[#ff6b35]">오늘</span> : null}</p>
        </div>
      </div>

      {hasNext ? (
        <Link href={dateHref(nextDate)} aria-label={`${nextDate} 문제로 이동`} className="grid size-11 place-items-center rounded-xl transition-colors hover:bg-muted">
          <ChevronRight className="size-5" />
        </Link>
      ) : (
        <span className="grid size-11 place-items-center text-foreground/20" aria-label="다음 문제는 내일 열립니다"><ChevronRight className="size-5" /></span>
      )}
    </nav>
  );
}
