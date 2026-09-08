const ATTRIBUTE_CELL_PREFIXES = ["team-", "position-", "bats-", "throws-", "born-", "number-"];

export function requiresAttributeRule(cellId) {
  return ATTRIBUTE_CELL_PREFIXES.some((prefix) => cellId.startsWith(prefix));
}

export function resolveAttributeRulePlayerIds(rule, deck, playerById) {
  if (!rule || typeof rule !== "object") throw new Error("속성 조건의 rule이 없습니다.");

  return deck.filter((playerId) => {
    const player = playerById.get(playerId);
    if (!player) return false;

    if (rule.type === "team") return rule.values?.includes(player.team) ?? false;
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
      const number = player.jerseyNumber;
      return Number.isInteger(number)
        && (rule.min === undefined || number >= rule.min)
        && (rule.max === undefined || number <= rule.max);
    }

    throw new Error(`지원하지 않는 크보 빙고 속성 조건: ${rule.type}`);
  });
}

export function samePlayerIds(left, right) {
  if (!Array.isArray(left) || left.length !== right.length) return false;
  const expected = new Set(right);
  return left.every((id) => expected.has(id));
}

export function resolvePuzzleAttributeBoard(puzzle, context = puzzle.id ?? "크보 빙고 문제") {
  const deckIds = new Set(puzzle.deck ?? []);
  const attributeFacts = puzzle.attributePlayerFacts ?? [];
  const excludedIds = puzzle.attributeExcludedPlayerIds ?? [];
  const attributeFactIds = new Set(attributeFacts.map((player) => player.id));

  if (attributeFactIds.size !== attributeFacts.length) throw new Error(`${context}: 속성 판정 스냅샷에 중복 선수가 있습니다.`);
  if (new Set(excludedIds).size !== excludedIds.length) throw new Error(`${context}: 속성 판정 제외 선수에 중복이 있습니다.`);

  if (puzzle.board?.some((cell) => cell.rule)) {
    const partition = [...attributeFactIds, ...excludedIds];
    if (partition.length !== puzzle.deck.length || new Set(partition).size !== puzzle.deck.length
      || partition.some((id) => !deckIds.has(id))) {
      throw new Error(`${context}: 덱의 모든 선수는 속성 판정 스냅샷 또는 명시적 제외 목록에 정확히 한 번 포함되어야 합니다.`);
    }
  }

  for (const fact of attributeFacts) {
    if (!deckIds.has(fact.id)) throw new Error(`${context}: 속성 판정 스냅샷에 덱 밖의 선수 ${fact.id}가 있습니다.`);
    if (!fact.team || !fact.positionGroup || !fact.throws || !fact.bats
      || !Number.isInteger(fact.birthYear) || !Number.isInteger(fact.jerseyNumber)) {
      throw new Error(`${context}: 선수 ${fact.id}의 속성 판정 스냅샷이 불완전합니다.`);
    }
  }

  const attributePlayerById = new Map(attributeFacts.map((player) => [player.id, player]));
  return puzzle.board.map((cell) => {
    if (requiresAttributeRule(cell.id) && !cell.rule) {
      throw new Error(`${context}: ${cell.label}은 선수 속성 rule로 판정해야 합니다.`);
    }
    if (!cell.rule) return cell;

    const validPlayerIds = resolveAttributeRulePlayerIds(cell.rule, puzzle.deck, attributePlayerById);
    if (cell.validPlayerIds && !samePlayerIds(cell.validPlayerIds, validPlayerIds)) {
      throw new Error(`${context}: ${cell.label}의 수동 판정 목록이 선수 속성 rule과 다릅니다.`);
    }
    return { ...cell, validPlayerIds };
  });
}
