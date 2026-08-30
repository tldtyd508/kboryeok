
export type Team =
  | "LG 트윈스"
  | "한화 이글스"
  | "SSG 랜더스"
  | "삼성 라이온즈"
  | "NC 다이노스"
  | "KT 위즈"
  | "롯데 자이언츠"
  | "KIA 타이거즈"
  | "두산 베어스"
  | "키움 히어로즈";
export type PositionGroup = "P" | "C" | "IF" | "OF";
export type Throws = "R" | "L";
export type Bats = "R" | "L" | "S";

export interface Player {
  id: number;
  name: string;
  nameNorm: string;
  aliases?: string[];
  team: Team;
  positionGroup: PositionGroup;
  positionDetail: string;
  throws: Throws;
  bats: Bats;
  birthDate: string; // "YYYY-MM-DD"
  nationality: string; // "KR"
  jerseyNumber: number;
  active?: boolean;
  quizEligible?: boolean;
}
