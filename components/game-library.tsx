"use client";

import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { useState } from "react";
import { gameCategories, games, type GameCategory } from "@/lib/games";

type SelectedCategory = "전체" | GameCategory;

export function GameLibrary() {
  const [selected, setSelected] = useState<SelectedCategory>("전체");
  const visibleGames = selected === "전체" ? games : games.filter((game) => game.category === selected);

  return (
    <div>
      <div className="mb-7 flex gap-2 overflow-x-auto pb-1" aria-label="게임 카테고리">
        {gameCategories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelected(category)}
            aria-pressed={selected === category}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              selected === category
                ? "bg-foreground text-background"
                : "border border-foreground/10 bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleGames.map((game) => {
          const Icon = game.icon;
          const content = (
            <>
              <div className="flex items-start justify-between gap-4">
                <span className={`grid size-12 place-items-center rounded-2xl ${game.accent}`}>
                  <Icon className="size-6" />
                </span>
                <div className="flex gap-1.5 text-[11px] font-black">
                  <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">{game.cadence}</span>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">{game.category}</span>
                </div>
              </div>
              <div className="mt-7">
                <h3 className="text-xl font-black tracking-tight">{game.title}</h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{game.description}</p>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-foreground/10 pt-4 text-sm font-black">
                {game.status === "live" ? (
                  <>
                    <span className="flex items-center gap-2 text-emerald-600"><span className="size-2 rounded-full bg-emerald-500" /> 플레이 가능</span>
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </>
                ) : (
                  <span className="flex items-center gap-2 text-muted-foreground"><Clock3 className="size-4" /> 라인업 준비 중</span>
                )}
              </div>
            </>
          );

          return game.href ? (
            <Link key={game.id} href={game.href} className="group rounded-3xl border border-foreground/10 bg-card p-6 shadow-[0_10px_35px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:border-primary/35">
              {content}
            </Link>
          ) : (
            <article key={game.id} className="rounded-3xl border border-foreground/10 bg-card/65 p-6 opacity-75">
              {content}
            </article>
          );
        })}
      </div>
    </div>
  );
}
