# Comprehensive Testing Documentation — AI-8Puzzle-Visualizer
**Student Registration Number:** 24BCI0212  
**Course:** Artificial Intelligence  
**Assigned Algorithm:** Greedy Best-First Search (GBFS)  
**Project:** AI-8Puzzle-Visualizer  

---

## 1. Testing Strategy and Philosophy

The verification strategy for the **AI-8Puzzle-Visualizer** follows an academic and rigorous test-driven approach. The search engine, heuristic estimators, and priority queues are evaluated against mathematical theorems and ground-truth search states before interface integration.

### Test Architecture

The testing suite consists of 3 dedicated unit and integration suites run directly in standard Node.js without requiring third-party testing frameworks or backend dependencies:

1. **`tests/puzzle.test.js`**: Board validation, successor generation, blank boundary transitions, inversion parity count, solvability invariance theorem.
2. **`tests/heuristics.test.js`**: Misplaced Tiles ($h_1$), Manhattan Distance ($h_2$), mathematical admissibility ($h(n) \le h^*(n)$), consistency / triangle inequality ($|h(n) - h(n')| \le 1$), and empirical dominance ($h_2 \ge h_1$).
3. **`tests/gbfs.test.js`**: Priority queue min-heap invariants, deterministic FIFO tie-breaking, parent tracking, solution reconstruction, repeated-state pruning, evaluation function verification ($f(n) = h(n)$), resource bounds, and unsolvable puzzle termination.

---

## 2. Summary of Executed Test Suites

| Test Suite | Total Tests | Passing | Failing | Execution Command |
|---|---|---|---|---|
| **Puzzle Engine & Solvability** | 26 | 26 | 0 | `node tests/puzzle.test.js` |
| **Heuristics & Dominance** | 17 | 17 | 0 | `node tests/heuristics.test.js` |
| **GBFS Algorithm & Priority Queue** | 21 | 21 | 0 | `node tests/gbfs.test.js` |
| **Total** | **64** | **64** | **0** | All tests passing |

---

## 3. Detailed Test Catalog

### 3.1 Puzzle Board & Solvability (`tests/puzzle.test.js`)

| Test Case Name | Objective | Verification Logic | Status |
|---|---|---|---|
| `valid board accepted` | Input validation | Verifies permutations of `[0..8]` pass | PASS |
| `wrong length rejected (8 elements)` | Dimensional check | Asserts array length !== 9 is caught | PASS |
| `wrong length rejected (10 elements)` | Dimensional check | Asserts array length !== 9 is caught | PASS |
| `duplicate tile detected` | Uniqueness test | Identifies duplicate integers | PASS |
| `out-of-range tile rejected` | Numerical range | Rejects values $> 8$ | PASS |
| `negative tile rejected` | Numerical range | Rejects values $< 0$ | PASS |
| `non-array rejected` | Type safety | Rejects non-array objects and strings | PASS |
| `null rejected` | Null safety | Rejects null/undefined gracefully | PASS |
| `missing tile 4 detected` | Permutation check | Catches omission of numbers in 0–8 | PASS |
| `blank tile (0) is valid` | Blank identification | Verifies 0 is recognized as blank space | PASS |
| `blank in center: 4 successors` | Successor branching | Blank at (1,1) generates UP, DOWN, LEFT, RIGHT | PASS |
| `blank in corner: 2 successors` | Boundary constraint | Blank at (0,0) generates only 2 legal moves | PASS |
| `blank in edge center: 3 successors` | Boundary constraint | Blank at (0,1) generates exactly 3 moves | PASS |
| `blank in bottom-right corner: 2 successors` | Boundary constraint | Blank at (2,2) generates exactly 2 moves | PASS |
| `successors do not duplicate parent` | Immutability | Child board references separate memory | PASS |
| `successor blank tile is in valid pos` | Spatial sanity | Target coordinate matches swap index | PASS |
| `all successors are valid boards` | Structural sanity | Successors maintain 9 unique tiles | PASS |
| `successor has exactly one tile moved` | Transition model | Distance between parent and child is 1 tile | PASS |
| `UP move moves tile from row below blank` | Directional mechanics | Slide mechanics adhere to 8-puzzle rules | PASS |
| `goal state is solvable from itself` | Solvability identity | Standard goal returns solvable = true | PASS |
| `known solvable puzzle is recognized` | Solvability correctness | Identifies valid solvable configuration | PASS |
| `known unsolvable puzzle is rejected` | Odd inversion detection | Catches 1-inversion parity mismatch | PASS |
| `inversion count correct for standard goal` | Mathematical formula | Asserts inversion count equals 0 | PASS |
| `inversion count for [2,1,3,...] is 1` | Inversion counting | Single adjacent transposition equals 1 | PASS |
| `parity invariance: legal moves strictly preserve inversion parity mod 2` | Mathematical Invariant Theorem | Verifies across 200 consecutive transitions | PASS |
| `solvability: non-standard goal states matching parity` | General goal solvability | Matches arbitrary start and target parities | PASS |

---

### 3.2 Heuristics & Mathematical Invariants (`tests/heuristics.test.js`)

| Test Case Name | Mathematical Property | Expected Behavior | Status |
|---|---|---|---|
| `h1: goal state returns 0 misplaced` | Identity ($h(goal) = 0$) | Expected: 0 | PASS |
| `h1: all tiles misplaced (except blank)` | Maximum misplaced tiles | Expected: 8 | PASS |
| `h1: one tile misplaced` | Single misalignment | Expected: 1 | PASS |
| `h1: blank tile is NOT counted` | Blank exclusion | Blank in wrong place adds 0 to $h_1$ | PASS |
| `h1: three tiles misplaced` | Counting verification | Expected: 3 | PASS |
| `h1: admissible — never exceeds 8` | Admissibility bound | $h_1(n) \le 8$ for all states | PASS |
| `h1: non-standard goal state supported` | General target matching | Custom goal lookup | PASS |
| `h2: goal state returns 0` | Identity ($h(goal) = 0$) | Expected: 0 | PASS |
| `h2: single tile one step away` | Single unit step | Expected: 1 | PASS |
| `h2: tile 1 moved far from goal` | Multi-step distance | Manhattan sum calculation | PASS |
| `h2: always non-negative` | Non-negativity | $h_2(n) \ge 0$ | PASS |
| `h2: dominates h1 (h2 >= h1 always)` | Dominance theorem | $h_2(n) \ge h_1(n)$ on test boards | PASS |
| `h2: manually verified example` | Analytical check | Hand-calculated step check | PASS |
| `h2: blank tile not counted in manhattan` | Blank exclusion | Distance of 0 is omitted | PASS |
| `h2: non-standard goal state supported` | Arbitrary goal support | Dynamic goal position mapping | PASS |
| `heuristics consistency: triangle inequality \|h(n) - h(n')\| <= 1` | Consistency (Monotonicity) | $|h(n) - h(n')| \le c(n, a, n') = 1$ | PASS |
| `heuristics: empirical dominance h2(n) >= h1(n) across 100 random boards` | Universal Dominance | Verified across 100 random permutations | PASS |

---

### 3.3 GBFS Search & Priority Queue (`tests/gbfs.test.js`)

| Test Case Name | Component Tested | Success Criteria | Status |
|---|---|---|---|
| `pq: empty queue returns null on pop` | Priority Queue | Safe boundary return | PASS |
| `pq: single item enqueue/dequeue` | Min-Heap structure | Size and value integrity | PASS |
| `pq: lower priority dequeued first` | Min-Heap ordering | Lowest priority popped first | PASS |
| `pq: size is correct` | Dynamic size tracking | Size increments/decrements | PASS |
| `pq: FIFO tie-breaking (same priority)` | Deterministic tie-break | Insertion order preserved | PASS |
| `pq: large number of inserts and correct ordering` | Heap ordering property | Ascending priority ordering | PASS |
| `gbfs: trivial case (initial = goal)` | Base search case | 0 moves, 1 node path | PASS |
| `gbfs: one move solution` | Direct goal transition | 1 move executed | PASS |
| `gbfs: known solvable puzzle` | End-to-end GBFS | Path found to goal | PASS |
| `gbfs: solution path starts with initial and ends with goal` | Path boundary sanity | `path[0] == start`, `path[-1] == goal` | PASS |
| `gbfs: parent tracking (each node has parent)` | Parent pointers | Tree reconstruction valid | PASS |
| `gbfs: consecutive path nodes differ by exactly one move` | Transition continuity | Legal sliding steps | PASS |
| `gbfs: nodes generated >= nodes expanded` | Metric relationship | $N_{generated} \ge N_{expanded}$ | PASS |
| `gbfs: resource limit returns failure without crash` | Timeout / node cap | Returns failure object safely | PASS |
| `gbfs: unsolvable puzzle returns not found` | Exhaustion on unsolvable | Returns found = false | PASS |
| `gbfs: repeated states not re-expanded` | Closed list check | Explored set pruning verified | PASS |
| `gbfs: h values decrease along solution path for GBFS` | Greedy heuristic gradient | $h(node) \rightarrow 0$ | PASS |
| `gbfs: works correctly with Misplaced Tiles heuristic (h1)` | Algorithm versatility | Solves puzzle with $h_1$ | PASS |
| `gbfs: evaluation function f(n) strictly equals h(n) without g(n)` | GBFS specification | $f(n) = h(n)$ verified | PASS |
| `pq: 200 random priority elements maintain strict min-heap order` | Heap stress verification | 200 random values sorted | PASS |
| `pq: tie-breaking is strictly FIFO across identical priorities` | Multi-item FIFO queue | Order 1 to 4 preserved | PASS |

---

## 4. Manual UI & Visualizer Testing Checklist

In addition to automated unit tests, the graphical user interface has been tested against the following user experience and interface requirements:

| Component | Test Action | Expected Result | Verified |
|---|---|---|---|
| **Manual 3x3 Grid Editor** | Enter duplicate tile (e.g., two '3's) | Error banner appears; solve button disabled | [x] |
| **Manual 3x3 Grid Editor** | Enter non-numeric character or empty cell | Highlighted cell with validation error tooltip | [x] |
| **Random Puzzle Button** | Click "Generate Random Solvable" | Generates valid board with even inversion parity | [x] |
| **Preset Selector** | Choose "Easy (3 Moves)" preset | Pre-loads puzzle board immediately | [x] |
| **Heuristic Toggle** | Switch from Manhattan ($h_2$) to Misplaced ($h_1$) | Updates formula cards and metrics dynamically | [x] |
| **Play / Pause Button** | Toggle during active animation | Pauses playback at current step; resumes seamlessly | [x] |
| **Next Step Button** | Click during paused state | Steps forward exactly one tile slide | [x] |
| **Previous Step Button**| Click during paused state | Steps backward in recorded search history | [x] |
| **Speed Slider** | Slide from 1x to 10x | Animation step interval adjusts smoothly | [x] |
| **Reset Button** | Click reset at any stage | Restores board to initial state, clears statistics | [x] |
| **Sidebar Navigation** | Switch pages (Home, Solver, Performance, Viva) | Active tab switches without page refresh | [x] |
| **Responsive Layout** | Resize to mobile screen (< 768px) | Sidebar collapses into responsive mobile navigation | [x] |

---

## 5. Instructions for Running Tests

To run the complete test suite locally:

```bash
# Run Puzzle Engine & Solvability Tests
node tests/puzzle.test.js

# Run Heuristic Functions & Dominance Tests
node tests/heuristics.test.js

# Run Greedy Best-First Search & Priority Queue Tests
node tests/gbfs.test.js
```

All 64 tests execute in under 200 milliseconds and require zero external dependencies.

- Spec: Board must contain exactly 9 integer elements.

- Spec: Tile values must be strictly within integers 0 to 8 inclusive.

- Spec: Each integer in [0..8] must appear exactly once.

- Spec: Blank tile at index 0 must generate exactly 2 successors (DOWN, RIGHT).

- Spec: Blank tile at index 4 must generate exactly 4 successors (UP, DOWN, LEFT, RIGHT).

- Spec: Blank tile at index 1 must generate exactly 3 successors (LEFT, RIGHT, DOWN).

- Spec: Blank tile at index 8 must generate exactly 2 successors (UP, LEFT).

- Spec: Generating successors must never mutate the parent board array.

- Spec: Each successor transition step cost is exactly 1.

- Spec: h1(goal) must return 0.

- Spec: h2(goal) must return 0.

- Spec: h2(n) >= h1(n) for all valid state permutations n.

- Spec: |h(n) - h(n')| <= 1 for all valid adjacent transitions.

- Spec: Priority queue pop() must strictly return element with minimum priority.
