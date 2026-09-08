const ATTRIBUTE_CELL_PREFIXES = ["team-", "position-", "bats-", "throws-", "born-", "number-"];

export function requiresAttributeRule(cellId) {
  return ATTRIBUTE_CELL_PREFIXES.some((prefix) => cellId.startsWith(prefix));
}

export function resolveAttributeRulePlayerIds(rule, deck, playerById) {
  if (!rule || typeof rule !== "object") throw new Error("속성 조건의 rule이 없습니다.");

  return deck.filter((playerId) => {
    const player = playerById.get(playerId);
    if (!player) return false;

    if (rule.type === "team") return rule.values?.includes(player.current?.team) ?? false;
    if (rule.type === "position") return rule.values?.includes(player.positionGroup) ?? false;
    if (rule.type === "bats") return rule.values?.includes(player.bats) ?? false;
    if (rule.type === "throws") return rule.values?.includes(player.throws) ?? false;
    if (rule.type === "birthYear") {
      const year = player.birthYear;
      return Number.isInteger(year)
        && (rule.min === undefined || year >= rule.min)
        && (rule.max === undefined || year <= rule.max);
    }
    if (rule.type === "jerseyNumber") {
      const numbers = player.status === "retired"
        ? player.career?.jerseyNumbers ?? []
        : [player.current?.jerseyNumber].filter(Number.isInteger);
      return numbers.some((number) =>
        (rule.min === undefined || number >= rule.min)
        && (rule.max === undefined || number <= rule.max));
    }

    throw new Error(`지원하지 않는 크보 빙고 속성 조건: ${rule.type}`);
  });
}

export function samePlayerIds(left, right) {
  if (!Array.isArray(left) || left.length !== right.length) return false;
  const expected = new Set(right);
  return left.every((id) => expected.has(id));
}

function hashSeed(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededShuffle(values, seedText) {
  const result = [...values];
  let state = hashSeed(seedText);
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const target = state % (index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function resolveBingoDeck(puzzle, playerById) {
  if (puzzle.deckOrder !== "balanced-shuffle") return puzzle.deck;

  const active = seededShuffle(
    puzzle.deck.filter((id) => playerById.get(id)?.status !== "retired"),
    `${puzzle.id}:r${puzzle.revision}:active`,
  );
  const retired = seededShuffle(
    puzzle.deck.filter((id) => playerById.get(id)?.status === "retired"),
    `${puzzle.id}:r${puzzle.revision}:retired`,
  );
  const result = [];
  let activeIndex = 0;
  let retiredIndex = 0;
  for (let index = 0; index < puzzle.deck.length; index += 1) {
    const retiredTarget = Math.floor(((index + 1) * retired.length) / puzzle.deck.length);
    if (retiredIndex < retiredTarget) result.push(retired[retiredIndex++]);
    else result.push(active[activeIndex++]);
  }
  return result;
}

export function resolveBingoBoard(puzzle) {
  if (puzzle.boardOrder !== "seeded-shuffle") return puzzle.board;
  return seededShuffle(puzzle.board, `${puzzle.id}:r${puzzle.revision}:board`);
}

export function resolvePuzzleAttributeBoard(puzzle, playerById, context = puzzle.id ?? "크보 빙고 문제") {
  return puzzle.board.map((cell) => {
    if (requiresAttributeRule(cell.id) && !cell.rule) {
      throw new Error(`${context}: ${cell.label}은 선수 속성 rule로 판정해야 합니다.`);
    }
    if (!cell.rule) return cell;

    for (const playerId of puzzle.deck) {
      const player = playerById.get(playerId);
      if (!player) throw new Error(`${context}: 공통 선수 프로필에 ${playerId}가 없습니다.`);
      if (cell.rule.type === "team" && player.status !== "retired" && !player.current?.team) {
        throw new Error(`${context}: 선수 ${playerId}의 현재 구단이 없습니다.`);
      }
      if (cell.rule.type === "jerseyNumber") {
        const numbers = player.status === "retired" ? player.career?.jerseyNumbers : [player.current?.jerseyNumber];
        if (!numbers?.some(Number.isInteger)) throw new Error(`${context}: 선수 ${playerId}의 등번호 판정 이력이 없습니다.`);
      }
      if (cell.rule.type === "position" && !player.positionGroup) throw new Error(`${context}: 선수 ${playerId}의 포지션 이력이 없습니다.`);
      if (cell.rule.type === "bats" && !player.bats) throw new Error(`${context}: 선수 ${playerId}의 타석 이력이 없습니다.`);
      if (cell.rule.type === "throws" && !player.throws) throw new Error(`${context}: 선수 ${playerId}의 투구손 이력이 없습니다.`);
      if (cell.rule.type === "birthYear" && !Number.isInteger(player.birthYear)) throw new Error(`${context}: 선수 ${playerId}의 출생연도가 없습니다.`);
    }
    const validPlayerIds = resolveAttributeRulePlayerIds(cell.rule, puzzle.deck, playerById);
    if (cell.validPlayerIds && !samePlayerIds(cell.validPlayerIds, validPlayerIds)) {
      throw new Error(`${context}: ${cell.label}의 수동 판정 목록이 선수 속성 rule과 다릅니다.`);
    }
    return { ...cell, validPlayerIds };
  });
}
