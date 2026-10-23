/**
 * app.js — Main Application Controller
 * AI-8Puzzle-Visualizer | Student: 24BCI0212
 *
 * Orchestrates all modules: puzzle input, GBFS search,
 * visualization, statistics, and navigation.
 *
 * Module responsibilities:
 *   puzzle.js     — Board model, validation, solvability
 *   heuristics.js — h1 (Misplaced), h2 (Manhattan Distance)
 *   gbfs.js       — GBFS search algorithm, priority queue
 *   visualizer.js — DOM rendering, animation, input grids
 *   statistics.js — Performance measurement and comparison
 *   app.js        — Application state, event wiring, navigation
 */

'use strict';

import {
  PuzzleBoard, validateBoard, isSolvable, generateRandomSolvable,
  DEFAULT_GOAL, DEFAULT_INITIAL, BLANK_TILE
} from './puzzle.js';

import {
  HEURISTIC, computeHeuristic, getHeuristicInfo, compareHeuristics
} from './heuristics.js';

import {
  runGBFS, getGBFSProperties, estimateMemory
} from './gbfs.js';

import {
  Visualizer, showToast, buildInputGrid, getInputGridValues,
  setInputGridValues, highlightInputGrid, SPEED
} from './visualizer.js';

import {
  StatisticsStore, formatStatistics, getEmptyStats,
  getTheoreticalAlgorithmData, generateComparisonData,
  formatSolutionPath, formatTime
} from './statistics.js';

// ── Application State ──────────────────────────────────────
const state = {
  initialTiles:   [...DEFAULT_INITIAL],
  goalTiles:      [...DEFAULT_GOAL],
  heuristic:      HEURISTIC.MANHATTAN,
  lastResult:     null,
  isRunning:      false,
  inputMethod:    'manual',   // 'manual' | 'random'
};

// ── DOM Element Cache ──────────────────────────────────────
const el = {};
const $ = id => document.getElementById(id);

// ── Statistics Store ───────────────────────────────────────
const statsStore = new StatisticsStore();

// ── Visualizer Instance ────────────────────────────────────
let viz = null;

// ══════════════════════════════════════════════════════════
// INITIALIZATION
// ══════════════════════════════════════════════════════════

function init() {
  cacheElements();
  setupNavigation();
  setupSidebar();
  setupInputGrids();
  setupEventListeners();
  renderInitialBoards();
  initHeroInteractivePuzzle();
  populateAlgorithmPage();
  populateComparisonTable();
  navigateTo('home');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function cacheElements() {
  // Navigation
  el.navItems     = document.querySelectorAll('.nav-item');
  el.pages        = document.querySelectorAll('.page-section');
  el.hamburger    = $('hamburger');
  el.sidebar      = $('sidebar');
  el.sidebarOverlay = $('sidebar-overlay');

  // Solver controls
  el.btnRun        = $('btn-run');
  el.btnPause      = $('btn-play-pause');
  el.btnStepFwd    = $('btn-step-fwd');
  el.btnStepBack   = $('btn-step-back');
  el.btnReset      = $('btn-reset');
  el.btnGenRandom  = $('btn-gen-random');
  el.btnApplyInput = $('btn-apply-input');
  el.speedSlider   = $('speed-slider');

  // Board containers
  el.currentBoard   = $('current-board');
  el.initialDisplay = $('initial-board-display');
  el.goalDisplay    = $('goal-board-display');
  el.solutionPath   = $('solution-path-container');

  // Heuristic selection
  el.heuristicSelect= $('heuristic-select');

  // Stats panel
  el.statSolutionStatus = $('stat-solution-status');
  el.statMoves          = $('stat-total-moves');
  el.statGenerated      = $('stat-nodes-generated');
  el.statExpanded       = $('stat-nodes-expanded');
  el.statDepth          = $('stat-max-depth');
  el.statTime           = $('stat-exec-time');
  el.statMemory         = $('stat-memory');

  // Validation messages
  el.initValidMsg  = $('initial-validation-msg');
  el.goalValidMsg  = $('goal-validation-msg');
  el.solvableMsg   = $('solvability-msg');

  // Tab buttons
  el.tabBtns       = document.querySelectorAll('.tab-btn');
  el.tabContents   = document.querySelectorAll('.tab-content');

  // Heuristic comparison display
  el.h1Display     = $('h1-display');
  el.h2Display     = $('h2-display');
}

// ── Navigation ─────────────────────────────────────────────

function setupNavigation() {
  document.querySelectorAll('[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      navigateTo(page);
      // Close sidebar on mobile
      if (el.sidebar && window.innerWidth < 900) {
        el.sidebar.classList.remove('open');
        el.sidebarOverlay?.classList.remove('show');
      }
    });
  });
}

function navigateTo(pageId) {
  // Update nav items
  document.querySelectorAll('[data-page]').forEach(item => {
    item.classList.toggle('active', item.dataset.page === pageId);
  });

  // Show/hide page sections
  document.querySelectorAll('.page-section').forEach(section => {
    section.classList.toggle('active', section.id === `page-${pageId}`);
  });

  // Update header title
  const titles = {
    'home':        'Home — Introduction',
    'solver':      'Puzzle Solver',
    'visualization':'Search Visualization',
    'comparison':  'Performance Comparison',
    'algorithm':   'Algorithm Information',
    'about':       'About the Project',
  };

  const headerTitle = $('header-title');
  if (headerTitle) headerTitle.textContent = titles[pageId] || 'AI-8Puzzle-Visualizer';

  // Lazy-load comparison data when navigating there
  if (pageId === 'comparison') populateComparisonTable();
}

// ── Sidebar (Mobile) ────────────────────────────────────────

function setupSidebar() {
  const hamburger = $('hamburger');
  const overlay   = $('sidebar-overlay');
  const sidebar   = $('sidebar');

  hamburger?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('show');
  });

  overlay?.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('show');
  });
}

// ── Input Grids Setup ───────────────────────────────────────

function setupInputGrids() {
  // Build initial state input grid
  buildInputGrid('initial-input-grid', state.initialTiles, (values) => {
    validateAndPreviewInput('initial', values);
  });

  // Build goal state input grid
  buildInputGrid('goal-input-grid', state.goalTiles, (values) => {
    validateAndPreviewInput('goal', values);
  });
}

function validateAndPreviewInput(type, values) {
  const validation = validateBoard(values);
  const containerId = `${type}-input-grid`;
  const msgId       = `${type}-validation-msg`;

  highlightInputGrid(containerId, validation);

  const msgEl = $(msgId);
  if (msgEl) {
    if (!validation.valid) {
      msgEl.textContent = validation.error;
      msgEl.className   = 'validation-msg error show';
    } else {
      msgEl.textContent = '✓ Valid board';
      msgEl.className   = 'validation-msg success show';
    }
  }

  // Update solvability check if both boards are valid
  if (type === 'initial') {
    const goalValues = getInputGridValues('goal-input-grid');
    const goalValid  = validateBoard(goalValues).valid;
    if (validation.valid && goalValid) {
      checkSolvabilityDisplay(values, goalValues);
    }
  }

  // Live preview heuristic values
  if (validation.valid) {
    const initialVals = type === 'initial' ? values : getInputGridValues('initial-input-grid');
    const goalVals    = type === 'goal'    ? values : getInputGridValues('goal-input-grid');
    if (validateBoard(initialVals).valid && validateBoard(goalVals).valid) {
      updateHeuristicPreview(initialVals, goalVals);
    }
  }
}

function checkSolvabilityDisplay(initialTiles, goalTiles) {
  const solvable = isSolvable(initialTiles, goalTiles);
  const msgEl = el.solvableMsg || $('solvability-msg');
  if (!msgEl) return;

  if (solvable) {
    msgEl.textContent = '✓ Puzzle is solvable';
    msgEl.className   = 'validation-msg success show';
  } else {
    msgEl.textContent = '⚠ This puzzle configuration is NOT solvable from the given initial state to the goal state.';
    msgEl.className   = 'validation-msg error show';
  }
}

function updateHeuristicPreview(initialTiles, goalTiles) {
  const h = compareHeuristics(initialTiles, goalTiles);
  const h1El = $('h1-display');
  const h2El = $('h2-display');
  if (h1El) h1El.textContent = h.misplaced;
  if (h2El) h2El.textContent = h.manhattan;
}

// ── Event Listeners ─────────────────────────────────────────

function setupEventListeners() {
  // Run button
  el.btnRun?.addEventListener('click', handleRunSolver);

  // Playback controls
  el.btnPause?.addEventListener('click',     () => viz?.togglePlay());
  el.btnStepFwd?.addEventListener('click',   () => viz?.stepForward());
  el.btnStepBack?.addEventListener('click',  () => viz?.stepBackward());
  $('btn-step-start')?.addEventListener('click', () => viz?.jumpToStart());
  $('btn-step-end')?.addEventListener('click',   () => viz?.jumpToEnd());

  // Reset
  el.btnReset?.addEventListener('click', handleReset);

  // Random puzzle
  el.btnGenRandom?.addEventListener('click', handleGenerateRandom);

  // Apply manual input
  el.btnApplyInput?.addEventListener('click', handleApplyInput);

  // Heuristic selection
  el.heuristicSelect?.addEventListener('change', (e) => {
    state.heuristic = e.target.value;
    showToast(`Heuristic changed to: ${getHeuristicInfo(state.heuristic).name}`, 'info');
  });

  // Speed slider
  el.speedSlider?.addEventListener('input', (e) => {
    // Invert: slider right = faster (lower ms)
    const sliderVal = parseInt(e.target.value, 10);
    const speedMs   = Math.round(SPEED.VERY_FAST + (SPEED.VERY_SLOW - SPEED.VERY_FAST) * (1 - sliderVal / 100));
    if (viz) viz.setSpeed(speedMs);
    const speedLabel = $('speed-label-val');
    if (speedLabel) speedLabel.textContent = `${speedMs}ms`;
  });

  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabGroup = btn.dataset.tabGroup;
      const tabId    = btn.dataset.tab;
      activateTab(tabGroup, tabId);
    });
  });

  // Hero "Start Solving" button
  $('btn-start-solving')?.addEventListener('click', () => navigateTo('solver'));
  $('btn-start-solving-2')?.addEventListener('click', () => navigateTo('solver'));

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboard);
}

function handleKeyboard(e) {
  if (e.target.tagName === 'INPUT') return; // Don't intercept input fields

  // On home page, arrow keys slide adjacent tiles into the blank space
  const homeSection = $('page-home');
  if (homeSection && homeSection.classList.contains('active') && !heroState.isSolving) {
    const blankIdx = heroState.tiles.indexOf(BLANK_TILE);
    if (blankIdx !== -1) {
      const r = Math.floor(blankIdx / 3);
      const c = blankIdx % 3;
      let targetIdx = -1;
      // Note: ArrowUp moves tile below blank upwards into blank
      if (e.key === 'ArrowUp' && r < 2) targetIdx = (r + 1) * 3 + c;
      if (e.key === 'ArrowDown' && r > 0) targetIdx = (r - 1) * 3 + c;
      if (e.key === 'ArrowLeft' && c < 2) targetIdx = r * 3 + (c + 1);
      if (e.key === 'ArrowRight' && c > 0) targetIdx = r * 3 + (c - 1);

      if (targetIdx !== -1) {
        e.preventDefault();
        heroState.tiles[blankIdx] = heroState.tiles[targetIdx];
        heroState.tiles[targetIdx] = BLANK_TILE;
        heroState.moves++;
        renderHeroPuzzle();
        const solved = heroState.tiles.every((v, i) => v === heroState.goal[i]);
        if (solved) showToast(`🎉 Puzzle solved in ${heroState.moves} moves!`, 'success');
        return;
      }
    }
  }

  if (e.key === ' ') { e.preventDefault(); viz?.togglePlay(); }
  if (e.key === 'ArrowRight') viz?.stepForward();
  if (e.key === 'ArrowLeft')  viz?.stepBackward();
}

function activateTab(group, tabId) {
  document.querySelectorAll(`[data-tab-group="${group}"]`).forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll(`[data-tab-content="${tabId}"]`).forEach(content => {
    content.classList.add('active');
  });
  document.querySelectorAll(`[data-tab-content-group="${group}"]`).forEach(content => {
    content.classList.toggle('active', content.dataset.tabContent === tabId);
  });
}

// ── Solver Handler ──────────────────────────────────────────

async function handleRunSolver() {
  if (state.isRunning) return;

  // Get current input values
  const initialTiles = getInputGridValues('initial-input-grid');
  const goalTiles    = getInputGridValues('goal-input-grid');

  // Validate
  const initValid = validateBoard(initialTiles);
  const goalValid = validateBoard(goalTiles);

  if (!initValid.valid) {
    showToast(`Invalid initial state: ${initValid.error}`, 'error');
    return;
  }

  if (!goalValid.valid) {
    showToast(`Invalid goal state: ${goalValid.error}`, 'error');
    return;
  }

  // Solvability check
  if (!isSolvable(initialTiles, goalTiles)) {
    showToast('⚠ This puzzle is NOT solvable! Please generate a random puzzle or adjust the states.', 'warning');
    return;
  }

  // Update state
  state.initialTiles = initialTiles;
  state.goalTiles    = goalTiles;
  state.isRunning    = true;

  // Update UI
  if (el.btnRun) { el.btnRun.disabled = true; el.btnRun.textContent = '⏳ Solving...'; }

  showToast(`Running GBFS with ${getHeuristicInfo(state.heuristic).name}...`, 'info');

  // Render initial/goal boards
  renderBoards();

  // Initialize Visualizer
  viz = new Visualizer({
    currentBoard: el.currentBoard,
  });

  try {
    // Run search (async to not block UI)
    await new Promise(resolve => setTimeout(resolve, 10));

    statsStore.startRun(state.heuristic, initialTiles, goalTiles);

    const result = runGBFS(initialTiles, goalTiles, {
      heuristic: state.heuristic,
      maxNodes:  50000,
      maxDepth:  300,
    });

    state.lastResult = result;
    statsStore.recordResult(result);

    // Update statistics display
    updateStatisticsPanel(result);

    // Load into visualizer
    viz.loadResult(result, goalTiles);

    // Render solution path
    if (result.found && el.solutionPath) {
      viz.renderSolutionPath(result.solutionPath, goalTiles, el.solutionPath);
    }

    // Navigate to visualization tab
    navigateTo('visualization');

    const msg = result.found
      ? `✅ Solution found in ${result.solutionMoves} moves! (${formatTime(result.executionTime)})`
      : `❌ ${result.message}`;
    showToast(msg, result.found ? 'success' : 'error');

    // Auto-play after a short delay
    setTimeout(() => viz?.play(), 500);

  } catch (err) {
    showToast(`Error during search: ${err.message}`, 'error');
    console.error('GBFS error:', err);
  } finally {
    state.isRunning = false;
    if (el.btnRun) { el.btnRun.disabled = false; el.btnRun.textContent = '▶ Run GBFS'; }
  }
}

// ── Reset Handler ───────────────────────────────────────────

function handleReset() {
  viz?.stop();
  state.lastResult  = null;
  state.initialTiles= [...DEFAULT_INITIAL];
  state.goalTiles   = [...DEFAULT_GOAL];

  setInputGridValues('initial-input-grid', state.initialTiles);
  setInputGridValues('goal-input-grid',    state.goalTiles);

  renderBoards();
  updateStatisticsPanel(null);
  clearSolutionPath();
  clearValidationMessages();

  if (el.currentBoard) el.currentBoard.innerHTML = '';
  showToast('Puzzle reset to default state.', 'info');
}

// ── Random Puzzle Handler ────────────────────────────────────

function handleGenerateRandom() {
  const goalTiles    = getInputGridValues('goal-input-grid');
  const goalValid    = validateBoard(goalTiles);

  const effectiveGoal = goalValid.valid ? goalTiles : DEFAULT_GOAL;

  const randomTiles = generateRandomSolvable(effectiveGoal);
  state.initialTiles = randomTiles;

  setInputGridValues('initial-input-grid', randomTiles);
  validateAndPreviewInput('initial', randomTiles);
  renderInitialDisplay();

  showToast('✓ Generated a random solvable puzzle!', 'success');
}

// ── Apply Manual Input ────────────────────────────────────────

function handleApplyInput() {
  const initialTiles = getInputGridValues('initial-input-grid');
  const goalTiles    = getInputGridValues('goal-input-grid');

  const initV = validateBoard(initialTiles);
  const goalV = validateBoard(goalTiles);

  if (!initV.valid || !goalV.valid) {
    showToast('Please fix validation errors before applying.', 'error');
    return;
  }

  state.initialTiles = initialTiles;
  state.goalTiles    = goalTiles;

  renderBoards();
  updateHeuristicPreview(initialTiles, goalTiles);

  showToast('✓ Puzzle states applied successfully!', 'success');
}

// ── Board Rendering ──────────────────────────────────────────

function renderInitialBoards() {
  renderBoards();
  updateHeuristicPreview(state.initialTiles, state.goalTiles);
}

function renderBoards() {
  renderInitialDisplay();
  renderGoalDisplay();
}

function renderInitialDisplay() {
  const container = $('initial-board-display');
  if (container && state.initialTiles) {
    if (!viz) viz = new Visualizer({});
    viz.renderStaticBoard(state.initialTiles, container, state.goalTiles, (clickedIdx) => {
      // User clicked an adjacent movable tile on the solver preview board
      const blankIdx = state.initialTiles.indexOf(BLANK_TILE);
      if (blankIdx === -1) return;

      const nextTiles = [...state.initialTiles];
      nextTiles[blankIdx] = nextTiles[clickedIdx];
      nextTiles[clickedIdx] = BLANK_TILE;
      state.initialTiles = nextTiles;

      // Sync input grid and validations
      setInputGridValues('initial-input-grid', state.initialTiles);
      validateAndPreviewInput('initial', state.initialTiles);
      renderBoards();
      checkSolvabilityDisplay(state.initialTiles, state.goalTiles);
    });
  }
}

function renderGoalDisplay() {
  const container = $('goal-board-display');
  if (container && state.goalTiles) {
    if (!viz) viz = new Visualizer({});
    viz.renderStaticBoard(state.goalTiles, container, state.goalTiles);
  }
}

// ── Statistics Panel ─────────────────────────────────────────

function updateStatisticsPanel(result) {
  const stats = result ? formatStatistics(result) : getEmptyStats();

  const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
  const setClass = (id, cls) => { const el = $(id); if (el) el.className = 'info-val ' + cls; };

  set('stat-solution-status', stats.solutionStatus);
  set('stat-total-moves',     stats.totalMoves);
  set('stat-nodes-generated', stats.nodesGenerated);
  set('stat-nodes-expanded',  stats.nodesExpanded);
  set('stat-max-depth',       stats.maxDepth);
  set('stat-exec-time',       stats.executionTime);
  set('stat-memory',          stats.memoryEstimate);
  set('stat-path-cost',       stats.pathCost);

  setClass('stat-solution-status', stats.statusClass === 'success' ? 'success' : stats.statusClass === 'danger' ? 'danger' : '');
}

function clearSolutionPath() {
  if (el.solutionPath) {
    el.solutionPath.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🧩</div>
        <div class="empty-title">Run the solver to see the solution path</div>
      </div>`;
  }
}

function clearValidationMessages() {
  const msgs = ['initial-validation-msg', 'goal-validation-msg', 'solvability-msg'];
  msgs.forEach(id => {
    const el = $(id);
    if (el) { el.textContent = ''; el.className = 'validation-msg'; }
  });
}

// ── Algorithm Info Page ──────────────────────────────────────

function populateAlgorithmPage() {
  const props = getGBFSProperties();

  const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };

  set('gbfs-eval-fn',        props.evaluationFn);
  set('gbfs-time-complexity', props.timeComplexity);
  set('gbfs-space-complexity',props.spaceComplexity);
  set('gbfs-complete',        props.complete ? 'Yes (with repeated-state checking in finite spaces)' : 'No (not in infinite spaces)');
  set('gbfs-optimal',         props.optimal ? 'Yes' : 'No');
  set('gbfs-complete-note',   props.completenessNote);
  set('gbfs-optimal-note',    props.optimalityNote);
  set('gbfs-vs-astar-gbfs',   props.vsAStar.GBFS);
  set('gbfs-vs-astar-astar',  props.vsAStar.AStar);
}

// ── Performance Comparison Table ─────────────────────────────

function populateComparisonTable() {
  const tableBody = $('comparison-table-body');
  if (!tableBody) return;

  const data = generateComparisonData(state.lastResult, state.heuristic);

  tableBody.innerHTML = '';

  data.forEach(algo => {
    const tr = document.createElement('tr');
    if (algo.isAssigned) tr.className = 'highlight-row';

    const complBadge = algo.complete
      ? '<span class="badge badge-yes">Yes</span>'
      : '<span class="badge badge-no">No</span>';

    const optBadge = algo.optimal
      ? '<span class="badge badge-yes">Yes</span>'
      : '<span class="badge badge-no">No</span>';

    const nameBadge = algo.isAssigned
      ? `<strong>${algo.name}</strong> <span class="badge badge-gbfs ml-sm">ASSIGNED</span>`
      : algo.name;

    const measuredBadge = algo.dataSource === 'measured'
      ? '<span class="badge" style="background:rgba(0,212,170,0.15);color:#00d4aa">Measured</span>'
      : '<span class="badge" style="background:rgba(74,85,104,0.2);color:#8892b0">Theoretical</span>';

    tr.innerHTML = `
      <td>${nameBadge}</td>
      <td><code>${algo.evaluationFn}</code></td>
      <td>${complBadge}</td>
      <td>${optBadge}</td>
      <td><code>${algo.timeComplexity}</code></td>
      <td><code>${algo.spaceComplexity}</code></td>
      <td>${algo.dataSource === 'implemented' || algo.dataSource === 'measured' ? (algo.solutionFound || 'Run to measure') : '<em class="text-muted">N/A</em>'}</td>
      <td>${algo.dataSource === 'measured' ? algo.nodesExpanded : '<em class="text-muted">N/A (not implemented)</em>'}</td>
      <td>${measuredBadge}</td>
    `;

    tableBody.appendChild(tr);
  });
}

// ── Heuristic Info Display ────────────────────────────────────

function updateHeuristicInfoDisplay() {
  const h1Info = getHeuristicInfo(HEURISTIC.MISPLACED);
  const h2Info = getHeuristicInfo(HEURISTIC.MANHATTAN);

  const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };

  set('h1-formula',     h1Info.formula);
  set('h1-desc',        h1Info.description);
  set('h2-formula',     h2Info.formula);
  set('h2-desc',        h2Info.description);
}

// Export for testing
// ── Hero Interactive Playable Puzzle ────────────────────────
const heroState = {
  tiles: [...DEFAULT_INITIAL],
  goal:  [...DEFAULT_GOAL],
  moves: 0,
  isSolving: false,
  timer: null
};

function initHeroInteractivePuzzle() {
  const gridEl = $('hero-puzzle-grid');
  if (!gridEl) return;

  renderHeroPuzzle();

  // Button: Shuffle
  $('btn-hero-shuffle')?.addEventListener('click', () => {
    if (heroState.isSolving) stopHeroSolving();
    heroState.tiles = generateRandomSolvable(heroState.goal, 6, 16);
    heroState.moves = 0;
    renderHeroPuzzle();
    showToast('🎲 Shuffled to a solvable puzzle! Click tiles or use arrow keys.', 'info');
  });

  // Button: Reset
  $('btn-hero-reset')?.addEventListener('click', () => {
    if (heroState.isSolving) stopHeroSolving();
    heroState.tiles = [...DEFAULT_INITIAL];
    heroState.moves = 0;
    renderHeroPuzzle();
    showToast('↺ Reset to initial state.', 'info');
  });

  // Button: AI Auto-Solve
  $('btn-hero-solve')?.addEventListener('click', handleHeroAutoSolve);
}

function renderHeroPuzzle() {
  const gridEl = $('hero-puzzle-grid');
  if (!gridEl) return;

  if (!viz) viz = new Visualizer({});

  viz.renderStaticBoard(heroState.tiles, gridEl, heroState.goal, (clickedIdx) => {
    if (heroState.isSolving) return;
    const blankIdx = heroState.tiles.indexOf(BLANK_TILE);
    if (blankIdx === -1) return;

    heroState.tiles[blankIdx] = heroState.tiles[clickedIdx];
    heroState.tiles[clickedIdx] = BLANK_TILE;
    heroState.moves++;

    renderHeroPuzzle();

    // Check if solved
    const solved = heroState.tiles.every((v, i) => v === heroState.goal[i]);
    if (solved) {
      showToast(`🎉 Congratulations! You solved the 8-puzzle in ${heroState.moves} moves!`, 'success');
    }
  });

  // Update metrics
  const moveEl = $('hero-move-count');
  if (moveEl) moveEl.textContent = heroState.moves;

  const hManhattan = computeHeuristic(heroState.tiles, heroState.goal, HEURISTIC.MANHATTAN);
  const hMisplaced = computeHeuristic(heroState.tiles, heroState.goal, HEURISTIC.MISPLACED);

  const hManEl = $('hero-h-manhattan');
  if (hManEl) hManEl.textContent = hManhattan;

  const hMisEl = $('hero-h-misplaced');
  if (hMisEl) hMisEl.textContent = hMisplaced;

  // Status badge
  const statusEl = $('hero-puzzle-status');
  if (statusEl) {
    if (hManhattan === 0) {
      statusEl.textContent = 'Solved! 🎉';
      statusEl.className = 'status-badge solved';
    } else if (heroState.isSolving) {
      statusEl.textContent = 'AI Solving...';
      statusEl.className = 'status-badge solving';
    } else {
      statusEl.textContent = 'Ready to Play';
      statusEl.className = 'status-badge ready';
    }
  }
}

function stopHeroSolving() {
  if (heroState.timer) {
    clearInterval(heroState.timer);
    heroState.timer = null;
  }
  heroState.isSolving = false;
  const solveBtn = $('btn-hero-solve');
  if (solveBtn) {
    solveBtn.disabled = false;
    solveBtn.textContent = '⚡ AI Auto-Solve';
  }
}

async function handleHeroAutoSolve() {
  if (heroState.isSolving) return;

  const h = computeHeuristic(heroState.tiles, heroState.goal, HEURISTIC.MANHATTAN);
  if (h === 0) {
    showToast('The puzzle is already in the goal state!', 'info');
    return;
  }

  heroState.isSolving = true;
  const solveBtn = $('btn-hero-solve');
  if (solveBtn) {
    solveBtn.disabled = true;
    solveBtn.textContent = '⏳ Thinking...';
  }

  showToast('Running GBFS on current puzzle state...', 'info');

  await new Promise(r => setTimeout(r, 20));

  const result = runGBFS(heroState.tiles, heroState.goal, { heuristic: HEURISTIC.MANHATTAN });

  if (!result.found || !result.solutionPath || result.solutionPath.length <= 1) {
    showToast('Could not find solution from this state.', 'warning');
    stopHeroSolving();
    renderHeroPuzzle();
    return;
  }

  if (solveBtn) solveBtn.textContent = '▶ Solving...';
  renderHeroPuzzle();

  let stepIdx = 1;
  const path = result.solutionPath;

  heroState.timer = setInterval(() => {
    if (stepIdx < path.length) {
      heroState.tiles = [...path[stepIdx].state];
      heroState.moves++;
      renderHeroPuzzle();
      stepIdx++;
    } else {
      stopHeroSolving();
      renderHeroPuzzle();
      showToast(`✅ AI solved the puzzle in ${path.length - 1} moves using GBFS!`, 'success');
    }
  }, 280);
}

export { state, heroState, handleRunSolver, handleReset, handleGenerateRandom, initHeroInteractivePuzzle };

/** JSDoc: Application lifecycle orchestrator */

export function getApplicationVersion() { return '1.0.0'; }
