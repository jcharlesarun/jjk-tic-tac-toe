'use strict';
const winningLines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
let fighters = { X: roster.gojo, O: roster.sukuna };
const $ = id => document.getElementById(id);
const cells = [...document.querySelectorAll('.cell')];
const statusText = $('game-status');
const roundButton = $('new-round');
const overlay = $('attack-overlay');
const scene = document.querySelector('.attack-scene');
const scores = { X: 0, O: 0, draw: 0 };
let board, currentPlayer, roundOver, matchOver;
let round = 1;
let animationTimer;
let impactTimer;
let pendingImpact = null;
let animationActive = false;
let battleStarted = false;
let pendingWinner = null;
const portraits = { X: {}, O: {} };
const uploadVersions = { X: 0, O: 0 };
const uploadsLoading = { X: false, O: false };
function portrait(player) { return portraits[player][fighters[player].id] || fighters[player].image; }
function health(player) { return 5 - scores[player === 'X' ? 'O' : 'X']; }
function renderScores() {
  for (const player of ['X', 'O']) {
    const suffix = player.toLowerCase();
    const hp = health(player);
    $('score-' + suffix).textContent = scores[player];
    $('hp-' + suffix).textContent = hp;
    $('health-' + suffix).innerHTML = Array.from({length: 5}, (_, i) => `<span class="${i >= hp ? 'lost' : ''}"></span>`).join('');
    $('health-' + suffix).setAttribute('aria-valuenow', hp);
    $('player-' + suffix).classList.toggle('defeated', hp === 0);
  }
  $('score-draw').textContent = scores.draw;
  $('round-number').textContent = String(round).padStart(2, '0');
}
function renderPlayers() {
  for (const player of ['X', 'O']) $('player-' + player.toLowerCase()).classList.toggle('active', !roundOver && currentPlayer === player);
}
function clearRound() {
  pendingWinner = null;
  board = Array(9).fill('');
  currentPlayer = round % 2 === 1 ? 'X' : 'O';
  roundOver = false;
  cells.forEach((cell, index) => {
    cell.innerHTML = '';
    cell.disabled = false;
    cell.className = 'cell';
    cell.removeAttribute('data-player');
    cell.setAttribute('aria-label', `Row ${Math.floor(index / 3) + 1}, column ${index % 3 + 1}: empty`);
  });
  statusText.textContent = `${fighters[currentPlayer].name}'s turn`;
  roundButton.textContent = 'Win the round to attack';
  roundButton.disabled = true;
  renderScores(); renderPlayers();
}
function dismissAttack() {
  if (!animationActive) return;
  resolveImpact();
  clearTimeout(animationTimer);
  animationActive = false;
  overlay.hidden = true;
  document.querySelector('.game').inert = false;
  roundButton.disabled = false;
  roundButton.focus();
}
function resolveImpact() {
  clearTimeout(impactTimer);
  if (!pendingImpact) return;
  const applyDamage = pendingImpact;
  pendingImpact = null;
  applyDamage();
}
function showAttack(winner, selectedMove) {
  const loser = winner === 'X' ? 'O' : 'X';
  const attacker = fighters[winner], defender = fighters[loser];
  const move = selectedMove.name;
  animationActive = true;
  overlay.className = `attack-overlay effect-${selectedMove.effect} ${matchOver ? 'champion' : ''}`;
  scene.style.setProperty('--energy', attacker.color);
  $('attack-kicker').textContent = selectedMove.kind;
  $('attack-title').textContent = move;
  $('attack-description').textContent = `${attacker.name} wins the round and attacks ${defender.name}!`;
  $('attacker-image').src = portrait(winner);
  $('defender-image').src = portrait(loser);
  $('attacker-name').textContent = attacker.name;
  $('defender-name').textContent = defender.name;
  $('attack-result').textContent = matchOver ? `${defender.name} is defeated. ${attacker.name} wins the battle!` : `${defender.name} has ${health(loser)} / 5 HP remaining.`;
  $('battle-log').textContent = `${attacker.name} used ${move}. ${defender.name} took 1 hit.${matchOver ? ' Battle over!' : ''}`;
  if (pendingImpact) {
    $('attack-result').textContent = `${attacker.name} is preparing ${move}...`;
    $('battle-log').textContent = `${attacker.name} is preparing ${move}.`;
  }
  roundButton.disabled = true;
  overlay.hidden = false;
  document.querySelector('.game').inert = true;
  scene.focus();
  animationTimer = setTimeout(dismissAttack, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1500 : 3800);
}
function playMove(index) {
  if (!battleStarted || roundOver || matchOver || animationActive || !Number.isInteger(index) || index < 0 || index > 8 || board[index]) return;
  board[index] = currentPlayer;
  const fighter = fighters[currentPlayer], cell = cells[index];
  cell.innerHTML = `<img src="${portrait(currentPlayer)}" alt="" draggable="false">`;
  cell.classList.add(currentPlayer.toLowerCase());
  cell.setAttribute('data-player', fighter.name);
  cell.disabled = true;
  cell.setAttribute('aria-label', `Row ${Math.floor(index / 3) + 1}, column ${index % 3 + 1}: ${fighter.name}`);
  const winningLine = winningLines.find(line => line.every(position => board[position] === currentPlayer));
  if (winningLine) {
    roundOver = true;
    pendingWinner = currentPlayer;
    winningLine.forEach(position => cells[position].classList.add('winning'));
    roundButton.disabled = true;
    performAttack();
  } else if (board.every(Boolean)) {
    roundOver = true; scores.draw++;
    statusText.textContent = 'Draw! No damage dealt.';
    $('battle-log').textContent = 'A stalemate. Both fighters keep their remaining health.';
    roundButton.textContent = 'Next round'; roundButton.disabled = false;
    renderScores();
  } else {
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    statusText.textContent = `${fighters[currentPlayer].name}'s turn`;
  }
  if (roundOver) cells.forEach(square => { square.disabled = true; });
  renderPlayers();
}
function resetBattle() {
  clearTimeout(impactTimer); pendingImpact = null;
  clearTimeout(animationTimer); animationActive = false; overlay.hidden = true;
  document.querySelector('.game').inert = false;
  scores.X = scores.O = scores.draw = 0;
  round = 1; matchOver = false;
  $('battle-log').textContent = 'The strongest face off. Your move.';
  clearRound();
}
function performAttack() {
  if (!battleStarted || !pendingWinner || animationActive) return;
  const winner = pendingWinner;
  pendingWinner = null; // Consume the round win once; repeated clicks cannot deal extra damage.
  const selectedMove = fighters[winner].moves[0];
  const applyDamage = () => {
    scores[winner]++;
    matchOver = scores[winner] === 5;
    statusText.textContent = matchOver ? `${fighters[winner].name} wins the battle!` : `${fighters[winner].name} wins the round!`;
    roundButton.textContent = matchOver ? 'New battle' : 'Next round';
    renderScores();
    const loser = winner === 'X' ? 'O' : 'X';
    $('attack-result').textContent = matchOver ? `${fighters[loser].name} is defeated. ${fighters[winner].name} wins the battle!` : `${fighters[loser].name} has ${health(loser)} / 5 HP remaining.`;
    $('battle-log').textContent = `${fighters[winner].name} used ${selectedMove.name}. ${fighters[loser].name} took 1 hit.${matchOver ? ' Battle over!' : ''}`;
    if (matchOver) overlay.classList.add('champion');
  };
  pendingImpact = applyDamage;
  statusText.textContent = `${fighters[winner].name} is preparing ${selectedMove.name}...`;
  roundButton.textContent = 'Attack in progress';
  showAttack(winner, selectedMove);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) resolveImpact();
  else impactTimer = setTimeout(resolveImpact, 1700);
}
function updateSelection() {
  for (const player of ['X', 'O']) {
    const suffix = player.toLowerCase();
    const fighter = roster[$('choose-' + suffix).value];
    if (!fighter) continue;
    $('preview-' + suffix).src = portraits[player][fighter.id] || fighter.image;
    $('preview-' + suffix).alt = `${fighter.name} portrait`;
    $('bio-' + suffix).textContent = fighter.title;
    $('moves-' + suffix).innerHTML = fighter.moves.map(move => `<span>${move.name}</span>`).join('');
    $('selection-' + suffix).style.setProperty('--accent', fighter.color);
  }
  const duplicate = $('choose-x').value === $('choose-o').value;
  $('selection-error').textContent = duplicate ? 'Choose two different fighters to enter the arena.' : '';
  $('start-battle').disabled = duplicate || uploadsLoading.X || uploadsLoading.O;
}
function enterBattle() {
  const first = roster[$('choose-x').value], second = roster[$('choose-o').value];
  if (!first || !second || first.id === second.id || uploadsLoading.X || uploadsLoading.O) { updateSelection(); return; }
  fighters = { X: first, O: second };
  battleStarted = true;
  for (const player of ['X', 'O']) {
    const suffix = player.toLowerCase(), fighter = fighters[player];
    $('fighter-image-' + suffix).src = portrait(player);
    $('fighter-image-' + suffix).alt = `${fighter.name} portrait`;
    $('fighter-name-' + suffix).textContent = fighter.name;
    $('fighter-title-' + suffix).textContent = fighter.title;
    $('health-' + suffix).setAttribute('aria-label', `${fighter.name} health`);
    $('player-' + suffix).style.setProperty('--accent', fighter.color);
    document.querySelector('.game').style.setProperty('--fighter-' + suffix, fighter.color);
  }
  $('character-select').hidden = true;
  $('battle-content').hidden = false;
  resetBattle();
  cells[0].focus();
}
function uploadPortrait(player) {
  const suffix = player.toLowerCase();
  const file = $('portrait-' + suffix).files[0];
  const message = $('upload-status-' + suffix);
  if (!file) return;
  const version = ++uploadVersions[player];
  uploadsLoading[player] = false;
  if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    message.textContent = 'Choose a PNG, JPG or WebP image under 5 MB.';
    updateSelection();
    return;
  }
  const id = $('choose-' + suffix).value;
  const url = URL.createObjectURL(file), image = new Image();
  uploadsLoading[player] = true;
  message.textContent = 'Loading portrait...';
  updateSelection();
  image.onload = () => {
    if (version !== uploadVersions[player]) { URL.revokeObjectURL(url); return; }
    if (portraits[player][id]) URL.revokeObjectURL(portraits[player][id]);
    portraits[player][id] = url;
    uploadsLoading[player] = false;
    message.textContent = 'Portrait ready. Used on the board and attack screens.';
    updateSelection();
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    if (version === uploadVersions[player]) {
      uploadsLoading[player] = false;
      message.textContent = 'This image could not be opened. Try another file.';
      updateSelection();
    }
  };
  image.src = url;
}
cells.forEach(cell => cell.addEventListener('click', () => playMove(Number(cell.dataset.index))));
roundButton.addEventListener('click', () => {
  if (animationActive || pendingWinner || !roundOver || !battleStarted) return;
  if (matchOver) resetBattle(); else { round++; clearRound(); }
});
$('reset-match').addEventListener('click', resetBattle);
$('skip-animation').addEventListener('click', dismissAttack);
$('start-battle').addEventListener('click', enterBattle);
$('change-fighters').addEventListener('click', () => {
  resetBattle(); battleStarted = false;
  $('battle-content').hidden = true; $('character-select').hidden = false;
  updateSelection(); $('choose-x').focus();
});
for (const player of ['X', 'O']) {
  const suffix = player.toLowerCase();
  $('choose-' + suffix).innerHTML = Object.values(roster).map(fighter => `<option value="${fighter.id}">${fighter.name}</option>`).join('');
  $('choose-' + suffix).value = player === 'X' ? 'gojo' : 'sukuna';
  $('choose-' + suffix).addEventListener('change', () => {
    uploadVersions[player]++;
    uploadsLoading[player] = false;
    $('portrait-' + suffix).value = '';
    $('upload-status-' + suffix).textContent = '';
    updateSelection();
  });
  $('portrait-' + suffix).addEventListener('change', () => uploadPortrait(player));
  $('restore-' + suffix).addEventListener('click', () => {
    uploadVersions[player]++;
    uploadsLoading[player] = false;
    const id = $('choose-' + suffix).value;
    if (portraits[player][id]) { URL.revokeObjectURL(portraits[player][id]); delete portraits[player][id]; }
    $('portrait-' + suffix).value = '';
    $('upload-status-' + suffix).textContent = 'Default portrait restored.';
    updateSelection();
  });
}
document.addEventListener('keydown', event => {
  if (!animationActive) return;
  if (event.key === 'Escape') { event.preventDefault(); dismissAttack(); }
  if (event.key === 'Tab') { event.preventDefault(); $('skip-animation').focus(); }
});
resetBattle(); updateSelection();
