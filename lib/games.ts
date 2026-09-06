import {
  Binary,
  CircleDot,
  Grid3X3,
  Hash,
  ListOrdered,
  Network,
  Route,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type GameCategory = "선수" | "기록" | "라인업" | "역사";
export type GameStatus = "live" | "coming-soon";

export interface GameDefinition {
  id: string;
  title: string;
  description: string;
  category: GameCategory;
  cadence: "데일리" | "주간";
  status: GameStatus;
  href?: string;
  icon: LucideIcon;
  accent: string;
}

export const games: GameDefinition[] = [
  {
    id: "daily-player",
    title: "오늘의 크보선수",
    description: "팀, 포지션, 나이와 등번호 힌트로 오늘의 선수를 찾으세요.",
    category: "선수",
    cadence: "데일리",
    status: "live",
    href: "/games/player",
    icon: CircleDot,
    accent: "bg-primary text-primary-foreground",
  },
  {
    id: "kboten",
    title: "크보텐",
    description: "오늘의 기록 주제에 해당하는 TOP 10 선수를 모두 찾아보세요.",
    category: "기록",
    cadence: "데일리",
    status: "live",
    href: "/games/kboten",
    icon: ListOrdered,
    accent: "bg-[#d9ff57] text-slate-950",
  },
  {
    id: "connections",
    title: "크보 커넥션",
    description: "16명의 선수를 네 개의 연결고리로 묶어보세요.",
    category: "선수",
    cadence: "데일리",
    status: "coming-soon",
    icon: Network,
    accent: "bg-[#ff6b35] text-white",
  },
  {
    id: "5001",
    title: "크보 5001",
    description: "후보 선수 중 정해진 인원을 골라 기록 합계로 오늘의 목표 숫자를 완성하세요.",
    category: "기록",
    cadence: "데일리",
    status: "live",
    href: "/games/5001",
    icon: Binary,
    accent: "bg-[#8ea7ff] text-slate-950",
  },
  {
    id: "number-history",
    title: "등번호 연대기",
    description: "등번호의 변화만 보고 한 선수의 커리어를 추리하세요.",
    category: "역사",
    cadence: "주간",
    status: "coming-soon",
    icon: Hash,
    accent: "bg-[#8ea7ff] text-slate-950",
  },
  {
    id: "missing-lineup",
    title: "사라진 라인업",
    description: "명경기의 선발 명단에서 비어 있는 선수를 맞혀보세요.",
    category: "라인업",
    cadence: "주간",
    status: "coming-soon",
    icon: UsersRound,
    accent: "bg-[#f5c451] text-slate-950",
  },
  {
    id: "career-path",
    title: "커리어 패스",
    description: "소속팀 이동 경로를 따라가며 주인공을 찾아보세요.",
    category: "선수",
    cadence: "데일리",
    status: "coming-soon",
    icon: Route,
    accent: "bg-[#48b896] text-slate-950",
  },
  {
    id: "kbo-grid",
    title: "크보 그리드",
    description: "두 조건을 모두 만족하는 선수로 3×3 칸을 채워보세요.",
    category: "기록",
    cadence: "데일리",
    status: "coming-soon",
    icon: Grid3X3,
    accent: "bg-[#e98fc6] text-slate-950",
  },
];

export const gameCategories: Array<"전체" | GameCategory> = [
  "전체",
  "선수",
  "기록",
  "라인업",
  "역사",
];
