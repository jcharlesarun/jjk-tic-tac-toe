const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Battle } = require('../rules.js');

function play(battle, sequence) {
  let result;
  for (const index of sequence) {
    result = battle.play(index);
    assert.equal(result.accepted, true, `Move ${index} should be accepted`);
  }
  return result;
}
const xWin = [0, 3, 1, 4, 2];
const oWin = [3, 0, 4, 1, 8, 2];
const draw = [0, 1, 2, 4, 3, 5, 7, 6, 8];

test('a new battle starts with an empty board, X turn and five health each', () => {
  const battle = new Battle();
  assert.deepEqual(battle.snapshot(), {
    board: Array(9).fill(''), currentPlayer: 'X', round: 1, phase: 'playing',
    roundWinner: null, winner: null, scores: { X: 0, O: 0, draw: 0 }
  });
  assert.equal(battle.health('X'), 5);
  assert.equal(battle.health('O'), 5);
});

for (let index = 0; index < 9; index++) {
  test(`valid position ${index} accepts X and switches to O`, () => {
    const battle = new Battle();
    assert.deepEqual(battle.play(index), { accepted: true, player: 'X', index, winningLine: null, draw: false });
    assert.equal(battle.snapshot().board[index], 'X');
    assert.equal(battle.snapshot().currentPlayer, 'O');
    assert.equal(battle.snapshot().board.filter(Boolean).length, 1);
  });
}

for (const [label, index] of [
  ['below range', -1], ['above range', 9], ['fraction', 1.5], ['NaN', NaN],
  ['infinity', Infinity], ['negative infinity', -Infinity], ['string', '0'],
  ['null', null], ['undefined', undefined], ['object', {}], ['array', []], ['boolean', true]
]) {
  test(`invalid move: ${label} leaves the entire state unchanged`, () => {
    const battle = new Battle(), before = battle.snapshot();
    assert.deepEqual(battle.play(index), { accepted: false, reason: 'invalid-position' });
    assert.deepEqual(battle.snapshot(), before);
  });
}

test('occupied cell is rejected without replacing its owner or consuming a turn', () => {
  const battle = new Battle();
  battle.play(4);
  const before = battle.snapshot();
  assert.deepEqual(battle.play(4), { accepted: false, reason: 'occupied' });
  assert.deepEqual(battle.snapshot(), before);
  assert.equal(battle.play(0).player, 'O');
  assert.equal(battle.snapshot().currentPlayer, 'X');
});

const lines = [
  ['top row', [0,1,2]], ['middle row', [3,4,5]], ['bottom row', [6,7,8]],
  ['left column', [0,3,6]], ['middle column', [1,4,7]], ['right column', [2,5,8]],
  ['main diagonal', [0,4,8]], ['other diagonal', [2,4,6]]
];
for (const [label, line] of lines) {
  const outside = Array.from({ length: 9 }, (_, i) => i).filter(i => !line.includes(i));
  let opponents;
  outer: for (const a of outside) for (const b of outside) for (const c of outside) {
    if (new Set([a,b,c]).size === 3 && !lines.some(([, candidate]) => candidate.every(i => [a,b,c].includes(i)))) {
      opponents = [a,b,c]; break outer;
    }
  }
  for (const player of ['X', 'O']) {
    test(`${player} wins on the ${label}; health stays unchanged until impact`, () => {
      const battle = new Battle();
      const sequence = player === 'X'
        ? [line[0],outside[0],line[1],outside[1],line[2]]
        : [opponents[0],line[0],opponents[1],line[1],opponents[2],line[2]];
      const result = play(battle, sequence);
      assert.deepEqual(result.winningLine, line);
      assert.equal(result.draw, false);
      assert.equal(battle.snapshot().roundWinner, player);
      assert.equal(battle.snapshot().phase, 'attacking');
      assert.equal(battle.health('X'), 5);
      assert.equal(battle.health('O'), 5);
      assert.equal(battle.applyHit(), true);
      assert.equal(battle.health(player), 5);
      assert.equal(battle.health(player === 'X' ? 'O' : 'X'), 4);
    });
  }
}

test('a win on the ninth move takes precedence over a draw', () => {
  const battle = new Battle();
  const result = play(battle, [0,1,4,2,5,3,7,6,8]);
  assert.deepEqual(result.winningLine, [0,4,8]);
  assert.equal(result.draw, false);
  assert.equal(battle.snapshot().scores.draw, 0);
});

test('a full board without a winner records exactly one draw and no damage', () => {
  const battle = new Battle();
  const result = play(battle, draw);
  assert.equal(result.draw, true);
  assert.equal(result.winningLine, null);
  assert.equal(battle.snapshot().phase, 'round-over');
  assert.equal(battle.snapshot().scores.draw, 1);
  assert.equal(battle.applyHit(), false);
  assert.equal(battle.play(0).accepted, false);
  assert.equal(battle.snapshot().scores.draw, 1);
  assert.equal(battle.health('X'), 5);
  assert.equal(battle.health('O'), 5);
});

test('no attack or next round is allowed before a round finishes', () => {
  const battle = new Battle(), before = battle.snapshot();
  assert.equal(battle.applyHit(), false);
  assert.equal(battle.nextRound(), false);
  assert.deepEqual(battle.snapshot(), before);
});

test('moves and next round are blocked while the automatic attack is pending', () => {
  const battle = new Battle();
  play(battle, xWin);
  const before = battle.snapshot();
  assert.equal(battle.nextRound(), false);
  assert.deepEqual(battle.play(8), { accepted: false, reason: 'round-finished' });
  assert.deepEqual(battle.snapshot(), before);
});

test('duplicate impacts do not increase damage or scores', () => {
  const battle = new Battle();
  play(battle, xWin);
  assert.equal(battle.applyHit(), true);
  const afterImpact = battle.snapshot();
  assert.equal(battle.applyHit(), false);
  assert.deepEqual(battle.snapshot(), afterImpact);
});

test('next round clears the board, keeps health and alternates the starting player', () => {
  const battle = new Battle();
  play(battle, xWin); battle.applyHit();
  assert.equal(battle.nextRound(), true);
  assert.equal(battle.snapshot().round, 2);
  assert.equal(battle.snapshot().currentPlayer, 'O');
  assert.deepEqual(battle.snapshot().board, Array(9).fill(''));
  assert.equal(battle.snapshot().roundWinner, null);
  assert.equal(battle.health('O'), 4);
  play(battle, draw);
  assert.equal(battle.nextRound(), true);
  assert.equal(battle.snapshot().currentPlayer, 'X');
  assert.equal(battle.snapshot().scores.draw, 1);
});

for (const winner of ['X', 'O']) {
  test(`${winner} wins the battle on hit five, never earlier; health never goes negative`, () => {
    const battle = new Battle();
    for (let round = 1; round <= 5; round++) {
      const winnerStarts = battle.snapshot().currentPlayer === winner;
      play(battle, winnerStarts ? xWin : oWin);
      assert.equal(battle.snapshot().winner, null);
      assert.equal(battle.applyHit(), true);
      assert.equal(battle.health(winner === 'X' ? 'O' : 'X'), 5 - round);
      assert.equal(battle.snapshot().winner, round === 5 ? winner : null);
      if (round < 5) assert.equal(battle.nextRound(), true);
    }
    const finalState = battle.snapshot();
    assert.equal(battle.nextRound(), false);
    assert.equal(battle.applyHit(), false);
    assert.equal(battle.play(8).accepted, false);
    assert.deepEqual(battle.snapshot(), finalState);
  });
}

for (const phase of ['playing', 'attacking', 'round-over', 'defeated']) {
  test(`reset from ${phase} restores the initial state and cancels the previous attack`, () => {
    const battle = new Battle();
    if (phase === 'playing') battle.play(4);
    else {
      play(battle, xWin);
      if (phase !== 'attacking') battle.applyHit();
      if (phase === 'defeated') {
        for (let round = 2; round <= 5; round++) {
          battle.nextRound(); play(battle, round % 2 ? xWin : oWin); battle.applyHit();
        }
      }
    }
    battle.reset();
    assert.deepEqual(battle.snapshot(), new Battle().snapshot());
    assert.equal(battle.applyHit(), false);
  });
}

test('snapshots cannot mutate board or scores; separate battles are isolated', () => {
  const first = new Battle(), second = new Battle();
  first.play(4);
  const snapshot = first.snapshot();
  snapshot.board[0] = 'O'; snapshot.scores.X = 99;
  assert.equal(first.snapshot().board[0], '');
  assert.equal(first.health('O'), 5);
  assert.equal(second.snapshot().board[4], '');
});

test('mutating the returned winning line does not corrupt future win detection', () => {
  const battle = new Battle();
  play(battle, xWin).winningLine.fill(8);
  battle.reset();
  assert.deepEqual(play(battle, xWin).winningLine, [0,1,2]);
});

test('unknown players are rejected by health queries', () => {
  assert.throws(() => new Battle().health('Yuji'), { name: 'TypeError', message: 'Player must be X or O' });
});

test('the same rules file loads as a browser script without CommonJS', () => {
  const context = vm.createContext({});
  const filename = path.resolve(__dirname, '../rules.js');
  vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  assert.equal(vm.runInContext('new GameRules.Battle().health("X")', context), 5);
});
