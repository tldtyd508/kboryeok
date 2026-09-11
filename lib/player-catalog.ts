import catalogData from "@/data/players/index.json";

export interface PlayerProfile {
  id: number;
  name: string;
  aliases: string[];
  status: "active" | "retired" | "inactive" | "unknown";
  positionGroup: string | null;
  positionDetail?: string;
  throws: string | null;
  bats: string | null;
  birthYear: number | null;
  current: { team: string; jerseyNumber: number } | null;
  career: {
    jerseyNumbers: number[];
    jerseyNumberHistory?: Array<{ number: number; period: string }>;
    jerseyNumberSources?: Array<{ name: string; url: string; accessedAt: string }>;
  };
}

export const playerCatalog = catalogData as PlayerProfile[];
export const playerProfileById = new Map(playerCatalog.map((player) => [player.id, player]));

function normalizePlayerName(name: string) {
  return name.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/[\s.·_-]/g, "");
}

const playerProfileByName = new Map<string, PlayerProfile>();
for (const player of playerCatalog) {
  const keys = [player.name, ...player.aliases].map(normalizePlayerName);
  for (const key of keys) {
    const existing = playerProfileByName.get(key);
    if (!existing || player.status === "active") playerProfileByName.set(key, player);
  }
}

export function getPlayerProfileByName(name: string) {
  return playerProfileByName.get(normalizePlayerName(name));
}
