import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";

const ERROR_REPORT_URL = "https://tally.so/r/2EWlWD";

export function ErrorReportLink({
  game,
  date,
  puzzleId,
  revision,
  player,
  context,
  pageUrl,
}: {
  game: string;
  date: string;
  puzzleId: string;
  revision?: number | string;
  player?: string;
  context?: string;
  pageUrl: string;
}) {
  const params = new URLSearchParams({ game, date, puzzleId, pageUrl });
  if (revision !== undefined) params.set("revision", String(revision));
  if (player) params.set("player", player);
  if (context) params.set("context", context);

  return (
    <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
      <a href={`${ERROR_REPORT_URL}?${params.toString()}`} target="_blank" rel="noreferrer">
        <Flag className="size-3.5" /> 오류 신고
      </a>
    </Button>
  );
}
