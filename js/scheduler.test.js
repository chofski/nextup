import { suggestDoubles, recordPartnerships, canFormMatch, availableMatchTypes } from './scheduler.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function makePlayers(specs) {
  return specs.map((s, i) => ({
    id: s.id || `p${i}`,
    name: s.name || `Player ${i}`,
    gender: s.gender,
    status: 'waiting',
    gamesPlayed: s.gamesPlayed ?? 0,
    arrivedAt: s.arrivedAt ?? i,
  }));
}

// Same-gender: prefer fewest games among men
const menHeavy = makePlayers([
  { id: 'm0', gender: 'male', gamesPlayed: 0 },
  { id: 'm1', gender: 'male', gamesPlayed: 0 },
  { id: 'm2', gender: 'male', gamesPlayed: 0 },
  { id: 'm3', gender: 'male', gamesPlayed: 0 },
  { id: 'm4', gender: 'male', gamesPlayed: 2 },
  { id: 'm5', gender: 'male', gamesPlayed: 2 },
  { id: 'f0', gender: 'female', gamesPlayed: 0 },
]);

assert(canFormMatch(menHeavy), '4 men should form a match');
assert(availableMatchTypes(menHeavy).types.includes('mens'), 'mens available');
assert(!availableMatchTypes(menHeavy).types.includes('mixed'), 'mixed needs 2F');

const mens = suggestDoubles(menHeavy, {}, { matchType: 'mens' });
assert(mens && mens.matchType === 'mens', 'mens doubles');
assert(mens.playerIds.every((id) => ['m0', 'm1', 'm2', 'm3'].includes(id)), 'prefer rested men');

// Mixed: 2M + 2F with M+F sides
const mixedPool = makePlayers([
  { id: 'm0', gender: 'male', gamesPlayed: 0 },
  { id: 'm1', gender: 'male', gamesPlayed: 0 },
  { id: 'm2', gender: 'male', gamesPlayed: 3 },
  { id: 'f0', gender: 'female', gamesPlayed: 0 },
  { id: 'f1', gender: 'female', gamesPlayed: 0 },
  { id: 'f2', gender: 'female', gamesPlayed: 3 },
]);

assert(availableMatchTypes(mixedPool).types.includes('mixed'), 'mixed available');
const mixed = suggestDoubles(mixedPool, {}, { matchType: 'mixed' });
assert(mixed && mixed.matchType === 'mixed', 'mixed doubles');
assert(mixed.playerIds.includes('m0') && mixed.playerIds.includes('m1'), 'rested men');
assert(mixed.playerIds.includes('f0') && mixed.playerIds.includes('f1'), 'rested women');

for (const side of [mixed.teamA, mixed.teamB]) {
  const genders = side.map((p) => p.gender).sort().join(',');
  assert(genders === 'female,male', `each side should be M+F, got ${genders}`);
}

// Auto prefers mixed when possible
const auto = suggestDoubles(mixedPool, {}, { matchType: 'auto', preferMixed: true });
assert(auto.matchType === 'mixed', 'auto should prefer mixed');

// Women's doubles
const women = makePlayers([
  { id: 'f0', gender: 'female' },
  { id: 'f1', gender: 'female' },
  { id: 'f2', gender: 'female' },
  { id: 'f3', gender: 'female' },
  { id: 'm0', gender: 'male' },
]);
const womens = suggestDoubles(women, {}, { matchType: 'womens' });
assert(womens && womens.matchType === 'womens', 'womens doubles');
assert(womens.playerIds.every((id) => id.startsWith('f')), 'only women');

// Fairness after games
let history = {};
history = recordPartnerships(
  history,
  mens.teamA.map((p) => p.id),
  mens.teamB.map((p) => p.id)
);
for (const id of mens.playerIds) {
  menHeavy.find((p) => p.id === id).gamesPlayed += 3;
}
const nextMens = suggestDoubles(menHeavy, history, { matchType: 'mens' });
assert(nextMens.playerIds.includes('m4') && nextMens.playerIds.includes('m5'), 'rested men next');

const reshuffled = suggestDoubles(mixedPool, {}, { matchType: 'mixed', reshuffleNonce: 1 });
assert(reshuffled, 'reshuffle works');

console.log('scheduler tests passed');
