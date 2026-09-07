import { suggestDoubles, recordPartnerships } from './scheduler.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const players = Array.from({ length: 8 }, (_, i) => ({
  id: `p${i}`,
  name: `Player ${i}`,
  status: 'waiting',
  gamesPlayed: i < 4 ? 0 : 2,
  arrivedAt: i,
}));

const first = suggestDoubles(players, {});
assert(first && first.playerIds.length === 4, 'should pick 4 players');
assert(
  first.playerIds.every((id) => ['p0', 'p1', 'p2', 'p3'].includes(id)),
  'should prefer players with fewer games'
);

let history = {};
history = recordPartnerships(
  history,
  first.teamA.map((p) => p.id),
  first.teamB.map((p) => p.id)
);

// After those four play twice more, the rested players should be preferred
for (const id of first.playerIds) {
  const p = players.find((x) => x.id === id);
  p.gamesPlayed += 3;
}

const second = suggestDoubles(players, history);
assert(second, 'second match exists');
const overlap = second.playerIds.filter((id) => first.playerIds.includes(id)).length;
assert(overlap === 0, `expected no overlap after resting others, got ${overlap}`);

const reshuffled = suggestDoubles(players, history, { reshuffleNonce: 1 });
assert(reshuffled, 'reshuffle works');

console.log('scheduler tests passed');
