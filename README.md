# JJK Tic Tac Toe — Domain Clash

A local two-player tic-tac-toe battle inspired by **Jujutsu Kaisen**. Choose your fighters, win the board, and automatically launch a signature attack. The first fighter to take **five hits** loses the battle.

Built with **HTML, CSS, and JavaScript**. Play directly in a browser—no installation, build step, or server required.

## Features

- Five selectable fighters, each with a signature attack.
- Animated projectiles, impact effects, and health bars.
- Automatic attacks after round wins, with damage applied at impact.
- Alternating starting players and draws without damage.
- Custom local portraits used on the board and attack screens.
- Keyboard controls, screen-reader labels, and reduced-motion support.
- Responsive layout for smaller screens.

## Fighters

| Fighter | Signature attack |
| --- | --- |
| Yuji | Black Flash |
| Gojo | Hollow Purple |
| Sukuna | Dismantle |
| Megumi | Nue |
| Mahoraga | World Slash |

Every attack deals **one hit**. Effects are stylized adaptations, not a reproduction of the source game's combat mechanics. See [moveset references and adaptation notes](SOURCES.md).

## Play locally

### Download

Download the repository using **Code → Download ZIP**, extract it, and open [`index.html`](index.html) in a modern browser. Keep the other files beside it so scripts, styles, and portraits load correctly.

### Clone

```bash
git clone https://github.com/jcharlesarun/jjk-tic-tac-toe.git
cd jjk-tic-tac-toe
```

Then open `index.html`. On Windows PowerShell:

```powershell
Start-Process .\index.html
```

Node.js is only needed to run the automated checks. Playing does not require it.

## How to play

1. Player 1 and Player 2 choose **different fighters**.
2. Select **Enter the arena**. Player 1 starts the first round.
3. Take turns choosing empty squares. Character portraits replace X and O.
4. Get three portraits in a row, column, or diagonal to win the round.
5. The winner automatically attacks. The opponent loses **1 HP** when the projectile hits.
6. Select **Next round** to keep battling. The starting player alternates every round, including after draws.
7. A fighter loses the battle after taking **five hits**.

Draws deal no damage. Occupied squares and moves after a finished round are blocked. Each round win can trigger only one hit.

## Controls

| Control | Action |
| --- | --- |
| Click a square | Place your fighter's portrait |
| Tab, then Enter or Space | Navigate and activate controls with the keyboard |
| Continue or Escape during an attack | Finish the attack immediately; damage still applies once |
| Next round | Clear the board and preserve health |
| New battle | Start again after a match ends |
| Reset battle | Clear the current match and restore both fighters to 5 HP |
| Change fighters | Return to character selection and reset the battle |

Attacks finish automatically. Damage normally lands **1.7 seconds** into an attack. Reduced-motion mode applies damage immediately without projectile travel. Resetting cancels any pending hit.

## Custom portraits

On the selection screen, use **Use your own portrait** for either player.

- Accepted formats: **PNG, JPG, and WebP**.
- Maximum size: **5 MB** per file.
- Square images work best; portraits are cropped to fit.
- Select **Restore default portrait** to return to the original artwork.

Images stay in the current browser tab; they are not sent to a server. Refreshing or closing the page resets the match and custom portraits. There are no accounts, online multiplayer, sound effects, or saved progress.

## Testing

The project includes **55 unit tests** for the game rules and an integration suite covering the game controls and battle flow.

| Test area | What is checked |
| --- | --- |
| Board rules | Valid and invalid moves, occupied squares, all 16 winning-line cases, draws, and a win on the final square |
| Battles | All 20 character matchups, automatic signature attacks, five-hit victories, and health tracking |
| Round flow | Alternating starting players, next rounds, resets, and preserving health between rounds |
| Attack timing | Damage at impact, preventing duplicate hits, skipping attacks, and cancelling pending hits on reset |
| Portraits and controls | File types and sizes, image-loading failures, overlapping uploads, keyboard handling, and reduced motion |

Run all tests with **Node.js 24+**:

```bash
npm test
```

No dependency installation is needed. For an optional coverage report, run `npm run test:coverage` and open `coverage/index.html`.

These are automated logic and simulated UI checks; real-browser appearance and animation playback are not covered.

## Project structure

```text
jjk-tic-tac-toe/
├── index.html              # Character selection, board, and attack screen
├── characters.js           # Five-fighter roster and signature attacks
├── rules.js                # Game rules and battle state; no DOM or timers
├── game.js                 # Page updates, uploads, and attack timing
├── styles.css              # Base game appearance
├── roster.css              # Selection screen and technique effects
├── projectiles.css         # Projectile travel and impact animations
├── *.svg                   # Original character portraits
├── game.test.cjs            # DOM-substitute integration checks
├── tests/rules.test.cjs     # Direct unit tests for the shared rules
├── scripts/                # Coverage runner and report generation
├── package.json            # npm test and coverage commands
├── classic.html            # Original plain X/O game
├── classic-game.js         # Classic game logic
├── classic-styles.css      # Classic game appearance
├── SOURCES.md              # References and adaptation notes
└── .github/workflows/      # Automated checks
```

## Credits

This is an **unofficial fan-made game**, inspired by Jujutsu Kaisen and community-documented Jujutsu Shenanigans movesets. Character names and source material belong to their respective owners. No official affiliation is implied.

Default portraits are original stylized SVG fan art, and attacks use CSS effects rather than anime clips. Reference links and implementation adaptations are documented in [SOURCES.md](SOURCES.md).
