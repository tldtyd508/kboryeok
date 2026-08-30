import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Player } from "@/lib/types";
import { differenceInYears } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ResultStatus = "correct" | "partial" | "incorrect";
export type Direction = "up" | "down" | "correct";

export interface JudgementResult {
  team: ResultStatus;
  position: ResultStatus;
  throws: ResultStatus;
  bats: ResultStatus;
  
  age: Direction;
  jerseyNumber: Direction;
  isCorrect: boolean;
}

export function calcAge(birthDate: string): number {
  return differenceInYears(new Date(), new Date(birthDate));
}

export function normalizeName(name: string): string {
  return name.replace(/\s+/g, '').toLowerCase();
}

export function compareGuess(secret: Player, guess: Player): JudgementResult {
  const secretAge = calcAge(secret.birthDate);
  const guessAge = calcAge(guess.birthDate);

  const result: JudgementResult = {
    team: secret.team === guess.team ? "correct" : "incorrect",
    position: secret.positionGroup === guess.positionGroup ? "correct" : "incorrect",
    throws: secret.throws === guess.throws ? "correct" : "incorrect",
    bats: secret.bats === guess.bats ? "correct" : "incorrect",
    
    age: 
      secretAge === guessAge ? "correct" :
      secretAge > guessAge ? "up" : "down",
    jerseyNumber: 
      secret.jerseyNumber === guess.jerseyNumber ? "correct" :
      secret.jerseyNumber > guess.jerseyNumber ? "up" : "down",
    isCorrect: false,
  };

  result.isCorrect = secret.id === guess.id;

  return result;
}

export function pickRandom(players: Player[]): Player | undefined {
  if (players.length === 0) return undefined;
  const randomIndex = Math.floor(Math.random() * players.length);
  return players[randomIndex];
}
