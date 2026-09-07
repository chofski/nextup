import { loadState, saveState, clearState } from './storage.js';
import { suggestDoubles, recordPartnerships } from './scheduler.js';

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

let state = loadState();
let pendingMatch = null;
let reshuffleNonce = 0;
let toastTimer = null;

const els = {
  sessionLabel: document.getElementById('sessionLabel'),
  courtsMeta: document.getElementById('courtsMeta'),
  courtGrid: document.getElementById('courtGrid'),
  playersMeta: document.getElementById('playersMeta'),
  playerList: document.getElementById('playerList'),
  playersEmpty: document.getElementById('playersEmpty'),
  gamesMeta: document.getElementById('gamesMeta'),
  gameList: document.getElementById('gameList'),
  gamesEmpty: document.getElementById('gamesEmpty'),
  addPlayerForm: document.getElementById('addPlayerForm'),
  playerName: document.getElementById('playerName'),
  startMatchBtn: document.getElementById('startMatchBtn'),
  startMatchHint: document.getElementById('startMatchHint'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsSheet: document.getElementById('settingsSheet'),
  settingsForm: document.getElementById('settingsForm'),
  sessionNameInput: document.getElementById('sessionNameInput'),
  courtCount: document.getElementById('courtCount'),
  courtCountOutput: document.getElementById('courtCountOutput'),
  courtMinus: document.getElementById('courtMinus'),
  courtPlus: document.getElementById('courtPlus'),
  gameMinutes: document.getElementById('gameMinutes'),
  resetSessionBtn: document.getElementById('resetSessionBtn'),
  matchSheet: document.getElementById('matchSheet'),
  matchIntro: document.getElementById('matchIntro'),
  matchPreview: document.getElementById('matchPreview'),
  matchCourtSelect: document.getElementById('matchCourtSelect'),
  closeMatchSheet: document.getElementById('closeMatchSheet'),
  reshuffleBtn: document.getElementById('reshuffleBtn'),
  confirmMatchBtn: document.getElementById('confirmMatchBtn'),
  toast: document.getElementById('toast'),
};

function persist() {
  state = saveState(state);
}

function showToast(message) {
  els.toast.hidden = false;
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.remove('show');
    setTimeout(() => {
      els.toast.hidden = true;
    }, 280);
  }, 2400);
}

function waitingPlayers() {
  return state.players.filter((p) => p.status === 'waiting');
}

function freeCourts() {
  return state.courts.filter((c) => c.status === 'free');
}

function activeGames() {
  return state.games.filter((g) => g.status === 'active');
}

function playerById(id) {
  return state.players.find((p) => p.id === id);
}

function formatRemaining(freesAt) {
  if (!freesAt) return null;
  const ms = freesAt - Date.now();
  if (ms <= 0) return 'due now';
  const mins = Math.ceil(ms / 60000);
  return mins === 1 ? '~1 min left' : `~${mins} min left`;
}

function canStartMatch() {
  return waitingPlayers().length >= 4 && freeCourts().length >= 1;
}

function updateStartButton() {
  const waiting = waitingPlayers().length;
  const free = freeCourts().length;
  const ok = canStartMatch();
  els.startMatchBtn.disabled = !ok;

  if (ok) {
    els.startMatchHint.textContent = `${waiting} waiting · ${free} court${free === 1 ? '' : 's'} free`;
  } else if (waiting < 4 && free < 1) {
    els.startMatchHint.textContent = `Need ${4 - waiting} more player${4 - waiting === 1 ? '' : 's'} + a free court`;
  } else if (waiting < 4) {
    els.startMatchHint.textContent = `Need ${4 - waiting} more waiting player${4 - waiting === 1 ? '' : 's'}`;
  } else {
    els.startMatchHint.textContent = 'All courts are busy — end a match first';
  }
}

function renderCourts() {
  const free = freeCourts().length;
  const playing = state.courts.length - free;
  els.courtsMeta.textContent = `${free} free · ${playing} playing`;

  els.courtGrid.replaceChildren();
  for (const court of state.courts) {
    const game = court.gameId ? state.games.find((g) => g.id === court.gameId) : null;
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `court-tile ${court.status}`;
    el.dataset.courtId = court.id;

    const remaining = formatRemaining(court.freesAt);
    const names = game
      ? game.playerIds.map((id) => playerById(id)?.name || '?').join(', ')
      : 'Ready for doubles';

    el.innerHTML = `
      <span class="court-num">Court ${court.number}</span>
      <span class="court-status">${court.status === 'free' ? 'Free' : 'In play'}</span>
      <span class="court-detail">${court.status === 'free' ? names : remaining || 'In progress'}</span>
    `;

    if (court.status === 'free' && canStartMatch()) {
      el.addEventListener('click', () => openMatchSheet(court.id));
    } else if (court.status === 'playing' && game) {
      el.addEventListener('click', () => endGame(game.id));
    }

    els.courtGrid.appendChild(el);
  }
}

function renderPlayers() {
  const total = state.players.length;
  const waiting = waitingPlayers().length;
  const playing = total - waiting;
  els.playersMeta.textContent =
    total === 0 ? '0 present' : `${total} present · ${waiting} waiting · ${playing} playing`;

  els.playersEmpty.hidden = total > 0;
  els.playerList.replaceChildren();

  const ordered = [...state.players].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'waiting' ? -1 : 1;
    return (a.gamesPlayed || 0) - (b.gamesPlayed || 0) || a.name.localeCompare(b.name);
  });

  for (const player of ordered) {
    const li = document.createElement('li');
    li.className = `player-row ${player.status}`;
    li.style.setProperty('--enter-delay', `${Math.min(ordered.indexOf(player) * 28, 280)}ms`);

    li.innerHTML = `
      <span class="player-dot" aria-hidden="true"></span>
      <div class="player-info">
        <span class="player-name">${escapeHtml(player.name)}</span>
        <span class="player-state">${player.status === 'playing' ? 'Playing' : 'Waiting'} · ${player.gamesPlayed || 0} game${(player.gamesPlayed || 0) === 1 ? '' : 's'}</span>
      </div>
      <button type="button" class="text-btn remove-player" data-id="${player.id}" aria-label="Remove ${escapeHtml(player.name)}" ${player.status === 'playing' ? 'disabled' : ''}>Remove</button>
    `;
    els.playerList.appendChild(li);
  }
}

function renderGames() {
  const games = activeGames();
  els.gamesMeta.textContent =
    games.length === 0 ? 'No matches yet' : `${games.length} match${games.length === 1 ? '' : 'es'} live`;
  els.gamesEmpty.hidden = games.length > 0;
  els.gameList.replaceChildren();

  for (const game of games) {
    const court = state.courts.find((c) => c.id === game.courtId);
    const teamA = game.teamA.map((id) => playerById(id)?.name || '?');
    const teamB = game.teamB.map((id) => playerById(id)?.name || '?');
    const remaining = formatRemaining(court?.freesAt);

    const card = document.createElement('article');
    card.className = 'game-card';
    card.innerHTML = `
      <header class="game-card-head">
        <h3>Court ${court?.number ?? '?'}</h3>
        <span>${remaining || 'In progress'}</span>
      </header>
      <div class="matchup">
        <div class="team">
          <span class="team-label">Side A</span>
          <span class="team-names">${teamA.map(escapeHtml).join(' & ')}</span>
        </div>
        <span class="vs" aria-hidden="true">vs</span>
        <div class="team">
          <span class="team-label">Side B</span>
          <span class="team-names">${teamB.map(escapeHtml).join(' & ')}</span>
        </div>
      </div>
      <button type="button" class="end-game-btn" data-game-id="${game.id}">Court free — end match</button>
    `;
    els.gameList.appendChild(card);
  }
}

function renderAll() {
  els.sessionLabel.textContent = state.sessionName || 'Club session';
  renderCourts();
  renderPlayers();
  renderGames();
  updateStartButton();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function addPlayer(name) {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) return;

  const exists = state.players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase());
  if (exists) {
    showToast('That name is already on the list');
    return;
  }

  state.players.push({
    id: uid(),
    name: trimmed,
    status: 'waiting',
    gamesPlayed: 0,
    arrivedAt: Date.now(),
  });
  persist();
  renderAll();
  showToast(`${trimmed} is waiting`);
}

function removePlayer(id) {
  const player = playerById(id);
  if (!player || player.status === 'playing') return;
  state.players = state.players.filter((p) => p.id !== id);
  persist();
  renderAll();
  showToast(`${player.name} removed`);
}

function openMatchSheet(preferredCourtId = null) {
  if (!canStartMatch()) {
    showToast('Need 4 waiting players and a free court');
    return;
  }

  reshuffleNonce = 0;
  pendingMatch = suggestDoubles(waitingPlayers(), state.pairHistory, { reshuffleNonce });
  if (!pendingMatch) {
    showToast('Could not build a match');
    return;
  }

  const frees = freeCourts();
  els.matchCourtSelect.replaceChildren();
  for (const court of frees) {
    const opt = document.createElement('option');
    opt.value = court.id;
    opt.textContent = `Court ${court.number}`;
    if (preferredCourtId && court.id === preferredCourtId) opt.selected = true;
    els.matchCourtSelect.appendChild(opt);
  }

  renderMatchPreview();
  els.matchSheet.showModal();
}

function renderMatchPreview() {
  if (!pendingMatch) return;
  const { teamA, teamB } = pendingMatch;
  els.matchPreview.innerHTML = `
    <div class="preview-sides">
      <div class="preview-team">
        <span class="team-label">Side A</span>
        ${teamA.map((p) => `<span class="chip">${escapeHtml(p.name)}</span>`).join('')}
      </div>
      <span class="vs">vs</span>
      <div class="preview-team">
        <span class="team-label">Side B</span>
        ${teamB.map((p) => `<span class="chip">${escapeHtml(p.name)}</span>`).join('')}
      </div>
    </div>
  `;
  const games = [...teamA, ...teamB].map((p) => p.gamesPlayed || 0);
  els.matchIntro.textContent = `Balanced mix · players have ${Math.min(...games)}–${Math.max(...games)} games so far`;
}

function confirmMatch() {
  if (!pendingMatch) return;
  const courtId = els.matchCourtSelect.value;
  const court = state.courts.find((c) => c.id === courtId && c.status === 'free');
  if (!court) {
    showToast('That court is no longer free');
    return;
  }

  const ids = pendingMatch.playerIds;
  const stillWaiting = ids.every((id) => playerById(id)?.status === 'waiting');
  if (!stillWaiting) {
    showToast('Someone in this match is no longer waiting');
    els.matchSheet.close();
    return;
  }

  const teamA = pendingMatch.teamA.map((p) => p.id);
  const teamB = pendingMatch.teamB.map((p) => p.id);
  const gameId = uid();
  const freesAt = Date.now() + state.gameMinutes * 60 * 1000;

  state.games.push({
    id: gameId,
    courtId: court.id,
    teamA,
    teamB,
    playerIds: [...teamA, ...teamB],
    status: 'active',
    startedAt: Date.now(),
  });

  court.status = 'playing';
  court.gameId = gameId;
  court.freesAt = freesAt;

  for (const id of ids) {
    const p = playerById(id);
    if (p) p.status = 'playing';
  }

  state.pairHistory = recordPartnerships(state.pairHistory, teamA, teamB);
  pendingMatch = null;
  persist();
  els.matchSheet.close();
  renderAll();
  showToast(`Court ${court.number} is live`);
}

function endGame(gameId) {
  const game = state.games.find((g) => g.id === gameId && g.status === 'active');
  if (!game) return;

  game.status = 'done';
  game.endedAt = Date.now();

  for (const id of game.playerIds) {
    const p = playerById(id);
    if (p) {
      p.status = 'waiting';
      p.gamesPlayed = (p.gamesPlayed || 0) + 1;
    }
  }

  const court = state.courts.find((c) => c.id === game.courtId);
  if (court) {
    court.status = 'free';
    court.gameId = null;
    court.freesAt = null;
  }

  // Keep only active games in working set (history lives in pairHistory + gamesPlayed)
  state.games = state.games.filter((g) => g.status === 'active');

  persist();
  renderAll();
  const courtLabel = court ? `Court ${court.number}` : 'Court';
  showToast(`${courtLabel} free again`);
}

function openSettings() {
  els.sessionNameInput.value = state.sessionName || '';
  els.courtCount.value = String(state.courtCount);
  els.courtCountOutput.textContent = String(state.courtCount);
  els.gameMinutes.value = String(state.gameMinutes || 20);
  els.settingsSheet.showModal();
}

function applyCourtCount(nextCount) {
  const count = Math.min(8, Math.max(1, nextCount));
  const playingOnDoomed = state.courts
    .slice(count)
    .filter((c) => c.status === 'playing');

  if (playingOnDoomed.length) {
    showToast('End matches on higher courts before reducing');
    return false;
  }

  state.courtCount = count;
  const existing = state.courts.slice(0, count);
  while (existing.length < count) {
    const n = existing.length + 1;
    existing.push({
      id: `court-${n}-${uid().slice(0, 6)}`,
      number: n,
      status: 'free',
      gameId: null,
      freesAt: null,
    });
  }
  // Renumber
  existing.forEach((c, i) => {
    c.number = i + 1;
  });
  state.courts = existing;
  return true;
}

// —— Events ——
els.addPlayerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  addPlayer(els.playerName.value);
  els.playerName.value = '';
  els.playerName.focus();
});

els.playerList.addEventListener('click', (e) => {
  const btn = e.target.closest('.remove-player');
  if (!btn || btn.disabled) return;
  removePlayer(btn.dataset.id);
});

els.gameList.addEventListener('click', (e) => {
  const btn = e.target.closest('.end-game-btn');
  if (!btn) return;
  endGame(btn.dataset.gameId);
});

els.startMatchBtn.addEventListener('click', () => openMatchSheet());

els.settingsBtn.addEventListener('click', openSettings);

els.courtMinus.addEventListener('click', () => {
  const next = Number(els.courtCount.value) - 1;
  if (next < 1) return;
  els.courtCount.value = String(next);
  els.courtCountOutput.textContent = String(next);
});

els.courtPlus.addEventListener('click', () => {
  const next = Number(els.courtCount.value) + 1;
  if (next > 8) return;
  els.courtCount.value = String(next);
  els.courtCountOutput.textContent = String(next);
});

els.settingsForm.addEventListener('submit', (e) => {
  const submitter = e.submitter;
  if (submitter?.value === 'cancel') return;

  e.preventDefault();
  state.sessionName = els.sessionNameInput.value.trim() || 'Club session';
  state.gameMinutes = Number(els.gameMinutes.value) || 20;
  const ok = applyCourtCount(Number(els.courtCount.value));
  if (!ok) return;
  persist();
  els.settingsSheet.close();
  renderAll();
  showToast('Session updated');
});

els.resetSessionBtn.addEventListener('click', () => {
  const ok = window.confirm('Reset this session? All players, courts, and history will be cleared on this device.');
  if (!ok) return;
  state = clearState();
  persist();
  els.settingsSheet.close();
  renderAll();
  showToast('Fresh session ready');
});

els.closeMatchSheet.addEventListener('click', () => {
  pendingMatch = null;
  els.matchSheet.close();
});

els.reshuffleBtn.addEventListener('click', () => {
  reshuffleNonce += 1;
  pendingMatch = suggestDoubles(waitingPlayers(), state.pairHistory, { reshuffleNonce });
  if (!pendingMatch) {
    showToast('No alternate lineup');
    return;
  }
  renderMatchPreview();
  els.matchPreview.classList.remove('pulse');
  void els.matchPreview.offsetWidth;
  els.matchPreview.classList.add('pulse');
});

els.confirmMatchBtn.addEventListener('click', confirmMatch);

// Tick remaining times
setInterval(() => {
  if (activeGames().length === 0) return;
  renderCourts();
  renderGames();
  updateStartButton();
}, 30000);

renderAll();
