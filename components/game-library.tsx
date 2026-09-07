import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { games } from "@/lib/games";

export function GameLibrary() {
  const liveGames = games.filter((game) => game.status === "live" && game.href);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {liveGames.map((game) => {
        const Icon = game.icon;
        return (
          <Link key={game.id} href={game.href!} className="group flex min-h-56 flex-col rounded-3xl border border-foreground/10 bg-card p-6 transition hover:border-foreground/30">
            <span className={`grid size-11 place-items-center rounded-xl ${game.accent}`}>
              <Icon className="size-5" />
            </span>
            <div className="mt-6 flex-1">
              <h2 className="text-xl font-black tracking-tight">{game.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{game.description}</p>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-foreground/10 pt-4 text-sm font-black">
              <span>시작하기</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
