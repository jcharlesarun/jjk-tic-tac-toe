'use strict';

// Shared by the browser and Node tests. No DOM, timers, or character artwork.
const GameRules = (() => {
  const winningLines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  class Battle {
    constructor() {
      this.reset();
    }

    reset() {
      this.round = 1;
      this.scores = { X: 0, O: 0, draw: 0 };
      this.winner = null;
      this.clearBoard();
    }

    clearBoard() {
      this.board = Array(9).fill('');
      this.currentPlayer = this.round % 2 === 1 ? 'X' : 'O';
      this.roundWinner = null;
      this.phase = 'playing';
    }

    play(index) {
      if (this.phase !== 'playing') {
        return { accepted: false, reason: 'round-finished' };
      }
      if (!Number.isInteger(index) || index < 0 || index >= 9) {
        return { accepted: false, reason: 'invalid-position' };
      }
      if (this.board[index]) {
        return { accepted: false, reason: 'occupied' };
      }

      const player = this.currentPlayer;
      this.board[index] = player;
      const line = winningLines.find(candidate => candidate.every(position => this.board[position] === player));
      let draw = false;
      if (line) {
        this.roundWinner = player;
        this.phase = 'attacking';
      } else if (this.board.every(Boolean)) {
        draw = true;
        this.scores.draw++;
        this.phase = 'round-over';
      } else {
        this.currentPlayer = player === 'X' ? 'O' : 'X';
      }
      return { accepted: true, player, index, winningLine: line ? [...line] : null, draw };
    }

    applyHit() {
      if (this.phase !== 'attacking') return false;
      this.scores[this.roundWinner]++;
      if (this.scores[this.roundWinner] === 5) this.winner = this.roundWinner;
      this.phase = 'round-over';
      return true;
    }

    nextRound() {
      if (this.phase !== 'round-over' || this.winner) return false;
      this.round++;
      this.clearBoard();
      return true;
    }

    health(player) {
      if (player !== 'X' && player !== 'O') throw new TypeError('Player must be X or O');
      return 5 - this.scores[player === 'X' ? 'O' : 'X'];
    }

    snapshot() {
      return {
        board: [...this.board], currentPlayer: this.currentPlayer,
        round: this.round, phase: this.phase, roundWinner: this.roundWinner,
        winner: this.winner, scores: { ...this.scores }
      };
    }
  }

  return { Battle };
})();

if (typeof module === 'object') module.exports = GameRules;
