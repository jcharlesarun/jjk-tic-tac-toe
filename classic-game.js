'use strict';

const winningLines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];
const cells = [...document.querySelectorAll('.cell')];
const statusText = document.getElementById('game-status');
const roundButton = document.getElementById('new-round');
let board;
let currentPlayer;
let gameOver;
const scores = { X: 0, O: 0, draw: 0 };

function renderScores() {
  document.getElementById('score-x').textContent = scores.X;
  document.getElementById('score-o').textContent = scores.O;
  document.getElementById('score-draw').textContent = scores.draw;
}

function renderPlayers() {
  document.getElementById('player-x').classList.toggle('active', !gameOver && currentPlayer === 'X');
  document.getElementById('player-o').classList.toggle('active', !gameOver && currentPlayer === 'O');
}

function startRound() {
  board = Array(9).fill('');
  currentPlayer = 'X';
  gameOver = false;
  cells.forEach((cell, index) => {
    cell.textContent = '';
    cell.disabled = false;
    cell.className = 'cell';
    cell.setAttribute('aria-label', `Row ${Math.floor(index / 3) + 1}, column ${index % 3 + 1}: empty`);
  });
  statusText.textContent = 'Player X’s turn';
  roundButton.innerHTML = 'Restart round <span aria-hidden="true">↻</span>';
  renderPlayers();
}

function playMove(index) {
  if (gameOver || board[index]) return;
  board[index] = currentPlayer;
  const cell = cells[index];
  cell.textContent = currentPlayer;
  cell.classList.add(currentPlayer.toLowerCase());
  cell.disabled = true;
  cell.setAttribute('aria-label', `Row ${Math.floor(index / 3) + 1}, column ${index % 3 + 1}: ${currentPlayer}`);

  const winningLine = winningLines.find(line => line.every(position => board[position] === currentPlayer));
  if (winningLine) {
    gameOver = true;
    scores[currentPlayer]++;
    winningLine.forEach(position => cells[position].classList.add('winning'));
    statusText.textContent = `Player ${currentPlayer} wins!`;
  } else if (board.every(Boolean)) {
    gameOver = true;
    scores.draw++;
    statusText.textContent = 'It’s a draw! Well played.';
  } else {
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    statusText.textContent = `Player ${currentPlayer}’s turn`;
  }

  if (gameOver) {
    cells.forEach(square => { square.disabled = true; });
    roundButton.innerHTML = 'Next round <span aria-hidden="true">→</span>';
    renderScores();
  }
  renderPlayers();
}

cells.forEach(cell => cell.addEventListener('click', () => playMove(Number(cell.dataset.index))));
roundButton.addEventListener('click', startRound);
document.getElementById('reset-match').addEventListener('click', () => {
  scores.X = 0;
  scores.O = 0;
  scores.draw = 0;
  renderScores();
  startRound();
});
startRound();
