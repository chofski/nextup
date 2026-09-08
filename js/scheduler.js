/**
 * Fair doubles mixer for club sessions.
 * Prefers players with fewer games, and combinations that minimize
 * repeated partnerships (and secondarily, repeat opponents).
 */

function pairKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function getPairCount(history, a, b) {
  return history[pairKey(a, b)] || 0;
}

function combinations(arr, k) {
  const out = [];
  const n = arr.length;
  if (k > n || k <= 0) return out;

  const idxs = Array.from({ length: k }, (_, i) => i);
  while (true) {
    out.push(idxs.map((i) => arr[i]));
    let i = k - 1;
    while (i >= 0 && idxs[i] === i + n - k) i -= 1;
    if (i < 0) break;
    idxs[i] += 1;
    for (let j = i + 1; j < k; j += 1) idxs[j] = idxs[j - 1] + 1;
  }
  return out;
}

function teamings(quartet) {
  const [a, b, c, d] = quartet;
  return [
    { teamA: [a, b], teamB: [c, d] },
    { teamA: [a, c], teamB: [b, d] },
    { teamA: [a, d], teamB: [b, c] },
  ];
}

function scoreTeaming(teaming, history) {
  const { teamA, teamB } = teaming;
  const partnerScore =
    getPairCount(history, teamA[0].id, teamA[1].id) +
    getPairCount(history, teamB[0].id, teamB[1].id);

  // Soft penalty for prior opponent meetings
  let opponentScore = 0;
  for (const p of teamA) {
    for (const q of teamB) {
      opponentScore += getPairCount(history, p.id, q.id) * 0.35;
    }
  }

  return partnerScore * 3 + opponentScore;
}

function scoreQuartet(quartet, history) {
  const gamesSum = quartet.reduce((s, p) => s + (p.gamesPlayed || 0), 0);
  const gamesSpread =
    Math.max(...quartet.map((p) => p.gamesPlayed || 0)) -
    Math.min(...quartet.map((p) => p.gamesPlayed || 0));

  let bestTeaming = null;
  let bestMix = Infinity;
  for (const teaming of teamings(quartet)) {
    const mix = scoreTeaming(teaming, history);
    if (mix < bestMix) {
      bestMix = mix;
      bestTeaming = teaming;
    }
  }

  // Lower is better
  const total = gamesSum * 4 + gamesSpread * 2.5 + bestMix;
  return { total, teaming: bestTeaming, mix: bestMix };
}

/**
 * Pick up to `limit` best candidate pools from waiting players,
 * prioritizing those who have played the fewest games.
 */
function candidatePool(waiting, limit = 8) {
  const sorted = [...waiting].sort((a, b) => {
    const g = (a.gamesPlayed || 0) - (b.gamesPlayed || 0);
    if (g !== 0) return g;
    return (a.arrivedAt || 0) - (b.arrivedAt || 0);
  });

  if (sorted.length <= limit) return sorted;

  // Expand pool while including everyone at the cut-off game count
  const cutoff = sorted[limit - 1].gamesPlayed || 0;
  const pool = sorted.filter((p) => (p.gamesPlayed || 0) <= cutoff);
  if (pool.length <= 12) return pool;
  return pool.slice(0, 12);
}

/**
 * Suggest a doubles match from waiting players.
 * @returns {{ teamA: object[], teamB: object[], playerIds: string[], score: number } | null}
 */
export function suggestDoubles(waitingPlayers, pairHistory = {}, options = {}) {
  const { avoidIds = new Set(), reshuffleNonce = 0 } = options;
  const waiting = waitingPlayers.filter((p) => p.status === 'waiting' && !avoidIds.has(p.id));
  if (waiting.length < 4) return null;

  const pool = candidatePool(waiting, 8);
  const quartets = combinations(pool, 4);

  let ranked = quartets.map((q) => {
    const scored = scoreQuartet(q, pairHistory);
    return {
      teamA: scored.teaming.teamA,
      teamB: scored.teaming.teamB,
      playerIds: q.map((p) => p.id),
      score: scored.total,
      mix: scored.mix,
    };
  });

  ranked.sort((a, b) => a.score - b.score);

  // Reshuffle walks further down the ranked list for variety
  const index = Math.min(reshuffleNonce % Math.min(ranked.length, 6), ranked.length - 1);
  return ranked[index] || null;
}

export function recordPartnerships(pairHistory, teamAIds, teamBIds) {
  const next = { ...pairHistory };
  const bump = (a, b) => {
    const key = pairKey(a, b);
    next[key] = (next[key] || 0) + 1;
  };

  bump(teamAIds[0], teamAIds[1]);
  bump(teamBIds[0], teamBIds[1]);

  // Also lightly track opponent meetings so they count in future mix
  for (const a of teamAIds) {
    for (const b of teamBIds) bump(a, b);
  }

  return next;
}

export { pairKey, getPairCount };
