import Link from "next/link";
import { CircleDot } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-foreground/10 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2" aria-label="크보력 홈">
          <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
            <CircleDot className="size-5" />
          </span>
          <span className="text-xl font-black tracking-[-0.08em]">크보력</span>
        </Link>

        <ThemeToggle />
      </div>
    </header>
  );
}
