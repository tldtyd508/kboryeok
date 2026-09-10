export const TEAM_IDS = new Map([
  ["LG 트윈스", "LG"], ["한화 이글스", "HH"], ["SSG 랜더스", "SK"],
  ["삼성 라이온즈", "SS"], ["NC 다이노스", "NC"], ["KT 위즈", "KT"],
  ["롯데 자이언츠", "LT"], ["KIA 타이거즈", "HT"], ["두산 베어스", "OB"],
  ["키움 히어로즈", "WO"],
]);

export function unique(values) {
  return Array.from(new Set(values.filter((value) => value !== null && value !== undefined)));
}

export function toCanonicalProfile(profile) {
  if (profile.schemaVersion === 1 && profile.bio) return profile;
  return {
    schemaVersion: 1,
    id: profile.id,
    name: profile.name,
    aliases: profile.aliases ?? [],
    status: profile.status,
    bio: {
      birthYear: profile.birthYear ?? null,
      throws: profile.throws ?? null,
      bats: profile.bats ?? null,
      positionGroup: profile.positionGroup ?? null,
      positionDetail: profile.positionDetail ?? null,
    },
    current: profile.current ? {
      season: profile.current.season ?? 2026,
      teamId: profile.current.teamId ?? TEAM_IDS.get(profile.current.team) ?? null,
      team: profile.current.team,
      jerseyNumber: profile.current.jerseyNumber,
    } : null,
    career: {
      debutYear: profile.career?.debutYear ?? null,
      retirementYear: profile.career?.retirementYear ?? null,
      jerseyNumbers: profile.career?.jerseyNumbers ?? [],
      ...(profile.career?.jerseyNumberSources ? { jerseyNumberSources: profile.career.jerseyNumberSources } : {}),
      teamStints: profile.career?.teamStints ?? [],
    },
    sources: profile.sources ?? [],
    review: {
      status: profile.review?.status ?? "generated",
      reviewedAt: profile.review?.reviewedAt ?? null,
      completeness: profile.review?.completeness ?? "index-only",
      ...(profile.review?.note ? { note: profile.review.note } : {}),
    },
  };
}

export function toRuntimeProfile(profile) {
  const canonical = toCanonicalProfile(profile);
  return {
    id: canonical.id,
    name: canonical.name,
    aliases: canonical.aliases,
    status: canonical.status,
    positionGroup: canonical.bio.positionGroup,
    ...(canonical.bio.positionDetail ? { positionDetail: canonical.bio.positionDetail } : {}),
    throws: canonical.bio.throws,
    bats: canonical.bio.bats,
    birthYear: canonical.bio.birthYear,
    current: canonical.current ? { team: canonical.current.team, jerseyNumber: canonical.current.jerseyNumber } : null,
    career: {
      jerseyNumbers: canonical.career.jerseyNumbers,
      ...(canonical.career.jerseyNumberSources
        ? { jerseyNumberSources: canonical.career.jerseyNumberSources }
        : {}),
    },
    sources: canonical.sources,
  };
}
