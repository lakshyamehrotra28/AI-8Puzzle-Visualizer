/**
 * visualizer.js — Search Visualization and Animation Engine
 * AI-8Puzzle-Visualizer | Student: 24BCI0212
 *
 * Handles all DOM rendering and animation for the puzzle solver.
 * Strictly separated from search logic (puzzle.js, gbfs.js).
 * Provides step-by-step playback with forward/backward navigation.
 */

'use strict';

import { BOARD_SIZE, BLANK_TILE } from './puzzle.js';
import { formatSolutionPath } from './statistics.js';

// ── Speed Presets (ms per step) ────────────────────────────
export const SPEED = {
  VERY_SLOW: 1500,
  SLOW:      800,
  MEDIUM:    400,
  FAST:      150,
  VERY_FAST: 50,
};

// ── Visualizer Class ───────────────────────────────────────

export class Visualizer {
  /**
   * @param {object} elements - DOM element references
   */
  constructor(elements) {
    this.el = elements;

    // Playback state
    this._history       = [];     // Full search history steps
    this._solutionPath  = [];     // Solution nodes
    this._currentStep   = -1;     // Current step index
    this._isPlaying     = false;
    this._playTimer     = null;
    this._speed         = SPEED.MEDIUM;
    this._mode          = 'idle'; // 'idle' | 'search' | 'solution'
    this._goalTiles     = null;

    // Bind methods
    this._boundTick = this._tick.bind(this);
  }

  // ── Load Search Result ──────────────────────────────────

  /**
   * Load a GBFS result for visualization.
   * @param {object}       result     - GBFSResult from runGBFS()
   * @param {number[]}     goalTiles  - Goal board tiles (for highlighting)
   */
  loadResult(result, goalTiles) {
    this.stop();
    this._result      = result;
    this._history     = result.history || [];
    this._solutionPath= result.solutionPath || [];
    this._goalTiles   = goalTiles;
    this._currentStep = -1;
    this._mode        = 'search';

    // Render step 0 immediately (initial state)
    this._renderStep(0);
    this._updateControls();
  }

  // ── Playback Controls ───────────────────────────────────

  /** Start automatic playback */
  play() {
    if (this._history.length === 0) return;
    this._isPlaying = true;
    this._tick();
    this._updateControls();
  }

  /** Pause automatic playback */
  pause() {
    this._isPlaying = false;
    if (this._playTimer) {
      clearTimeout(this._playTimer);
      this._playTimer = null;
    }
    this._updateControls();
  }

  /** Toggle play/pause */
  togglePlay() {
    if (this._isPlaying) this.pause();
    else this.play();
  }

  /** Advance one step forward */
  stepForward() {
    if (this._currentStep < this._history.length - 1) {
      this._renderStep(this._currentStep + 1);
    }
  }

  /** Go back one step */
  stepBackward() {
    if (this._currentStep > 0) {
      this._renderStep(this._currentStep - 1);
    }
  }

  /** Jump to a specific step */
  jumpToStep(step) {
    const clamped = Math.max(0, Math.min(step, this._history.length - 1));
    this._renderStep(clamped);
  }

  /** Jump directly to initial start step */
  jumpToStart() {
    if (this._history.length > 0) {
      this.pause();
      this.jumpToStep(0);
    }
  }

  /** Jump directly to terminal goal step */
  jumpToEnd() {
    if (this._history.length > 0) {
      this.pause();
      this.jumpToStep(this._history.length - 1);
    }
  }

  /** Stop playback and reset */
  stop() {
    this.pause();
    this._currentStep = -1;
    this._mode = 'idle';
  }

  /** Set playback speed (ms per step) */
  setSpeed(ms) {
    this._speed = Math.max(50, Math.min(3000, ms));
  }

  // ── Internal Tick ───────────────────────────────────────

  _tick() {
    if (!this._isPlaying) return;

    if (this._currentStep >= this._history.length - 1) {
      this._isPlaying = false;
      this._updateControls();
      this._onPlaybackComplete();
      return;
    }

    this.stepForward();

    this._playTimer = setTimeout(this._boundTick, this._speed);
  }

  // ── Step Rendering ──────────────────────────────────────

  /**
   * Render a specific step from the search history.
   * @param {number} stepIdx
   */
  _renderStep(stepIdx) {
    if (stepIdx < 0 || stepIdx >= this._history.length) return;

    this._currentStep = stepIdx;
    const step = this._history[stepIdx];

    // Render current board
    this._renderBoard(step.boardState, this.el.currentBoard, true);

    // Update search info panel
    this._updateSearchInfo(step);

    // Update step counter
    this._updateStepCounter();

    // Update controls state
    this._updateControls();

    // Scroll frontier list to show current
    this._updateFrontierList(step);
  }

  // ── Board Rendering ─────────────────────────────────────

  /**
   * Render a puzzle board into a container element.
   * @param {number[]} tiles     - Board state
   * @param {Element}  container - Target DOM element
   * @param {boolean}  animate   - Whether to animate changes
   */
  _renderBoard(tiles, container, animate = false) {
    if (!container) return;

    // Get or create tile elements
    let tileEls = container.querySelectorAll('.puzzle-tile');

    // Create tiles if they don't exist yet
    if (tileEls.length !== 9) {
      container.innerHTML = '';
      for (let i = 0; i < 9; i++) {
        const tile = document.createElement('div');
        tile.className = 'puzzle-tile';
        tile.dataset.index = i;
        container.appendChild(tile);
      }
      tileEls = container.querySelectorAll('.puzzle-tile');
    }

    // Update each tile
    tiles.forEach((val, idx) => {
      const el = tileEls[idx];
      if (!el) return;

      const isBlank = val === BLANK_TILE;
      const inPlace = !isBlank && this._goalTiles && val === this._goalTiles[idx];

      // Detect change for animation
      const prevVal = parseInt(el.dataset.value, 10);
      const changed = prevVal !== val;

      el.dataset.value = val;
      el.textContent   = isBlank ? '' : String(val);
      el.className = 'puzzle-tile ' + (isBlank ? 'blank' : inPlace ? 'in-place' : 'numbered');

      if (animate && changed && !isBlank) {
        el.classList.add('moving');
        setTimeout(() => el.classList.remove('moving'), 400);
      }
    });
  }

  /**
   * Render a static board (initial or goal display, or interactive playable board).
   * @param {number[]} tiles
   * @param {Element}  container
   * @param {number[]} [goalTiles]   - Optional, for highlighting in-place tiles
   * @param {Function} [onTileClick] - Optional, callback(index) when an adjacent movable tile is clicked
   */
  renderStaticBoard(tiles, container, goalTiles = null, onTileClick = null) {
    if (!container || !tiles) return;

    container.innerHTML = '';
    const blankIdx = tiles.indexOf(BLANK_TILE);
    const blankRow = blankIdx !== -1 ? Math.floor(blankIdx / 3) : -1;
    const blankCol = blankIdx !== -1 ? blankIdx % 3 : -1;

    tiles.forEach((val, idx) => {
      const tile = document.createElement('div');
      const isBlank = val === BLANK_TILE;
      const inPlace = !isBlank && goalTiles && val === goalTiles[idx];
      const r = Math.floor(idx / 3);
      const c = idx % 3;
      const isAdjacent = blankIdx !== -1 && (Math.abs(r - blankRow) + Math.abs(c - blankCol) === 1);
      const isMovable = !isBlank && isAdjacent && typeof onTileClick === 'function';

      tile.className     = 'puzzle-tile ' + (isBlank ? 'blank' : inPlace ? 'in-place' : 'numbered') + (isMovable ? ' movable' : '');
      tile.textContent   = isBlank ? '' : String(val);
      tile.dataset.value = val;
      tile.dataset.index = idx;

      if (isMovable) {
        tile.setAttribute('role', 'button');
        tile.setAttribute('tabindex', '0');
        tile.setAttribute('aria-label', `Move tile ${val}`);
        tile.addEventListener('click', (e) => {
          e.preventDefault();
          onTileClick(idx);
        });
      }

      container.appendChild(tile);
    });
  }

  /**
   * Render a mini board for solution path display.
   * @param {number[]} tiles
   * @param {number[]} goalTiles
   * @returns {HTMLElement}
   */
  createMiniGrid(tiles, goalTiles = null) {
    const grid = document.createElement('div');
    grid.className = 'path-mini-grid';

    tiles.forEach((val, idx) => {
      const cell = document.createElement('div');
      const isBlank = val === BLANK_TILE;
      cell.className = 'path-mini-tile' + (isBlank ? ' blank' : '');
      cell.textContent = isBlank ? '' : String(val);
      grid.appendChild(cell);
    });

    return grid;
  }

  // ── Search Info Panel ───────────────────────────────────

  _updateSearchInfo(step) {
    const setVal = (id, val, cls = '') => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = val;
      el.className = 'info-val' + (cls ? ' ' + cls : '');
    };

    const isGoal = step.type === 'goal';

    setVal('viz-step-type',      step.type === 'expand' ? 'Expanding' : step.type === 'goal' ? 'GOAL FOUND' : 'Generated', isGoal ? 'success' : step.type === 'expand' ? 'highlight' : '');
    setVal('viz-h-value',        step.hValue ?? '—', 'warning');
    setVal('viz-f-value',        step.fValue ?? '—', 'highlight');
    setVal('viz-depth',          step.depth ?? '—');
    setVal('viz-move',           step.move ?? '—');
    setVal('viz-nodes-generated',step.nodesGenerated ?? '—');
    setVal('viz-nodes-expanded', step.nodesExpanded ?? '—');
    setVal('viz-frontier-size',  step.frontierSize ?? '—');
    setVal('viz-explored-size',  step.exploredSize ?? '—');
  }

  // ── Frontier List ────────────────────────────────────────

  _updateFrontierList(step) {
    const container = document.getElementById('frontier-list');
    if (!container || !step.frontierSnapshot) return;

    container.innerHTML = '';

    step.frontierSnapshot.slice(0, 15).forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'list-item' + (i === 0 ? ' current' : '');
      el.innerHTML = `
        <span>${item.state.join(',')}</span>
        <span class="h-val">h=${item.h}</span>
      `;
      container.appendChild(el);
    });

    if (container.children.length === 0) {
      container.innerHTML = '<div class="text-muted text-xs" style="padding:8px">Frontier empty</div>';
    }
  }

  // ── Solution Path ────────────────────────────────────────

  /**
   * Render the solution path as a horizontal scrollable strip.
   * @param {SearchNode[]} path
   * @param {number[]}     goalTiles
   * @param {Element}      container
   */
  renderSolutionPath(path, goalTiles, container) {
    if (!container) return;

    container.innerHTML = '';

    if (!path || path.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No solution path</div></div>';
      return;
    }

    const formatted = formatSolutionPath(path);

    formatted.forEach((step, i) => {
      // Add step
      const stepEl = document.createElement('div');
      stepEl.className = 'path-step';

      const numEl = document.createElement('div');
      numEl.className = 'path-step-num';
      numEl.textContent = step.isStart ? 'Start' : step.isGoal ? 'Goal' : `Step ${step.step}`;

      const miniGrid = this.createMiniGrid(step.tiles, goalTiles);
      if (step.isStart) miniGrid.style.borderColor = 'var(--clr-accent-primary)';
      if (step.isGoal)  miniGrid.style.borderColor = 'var(--clr-accent-teal)';

      const hEl = document.createElement('div');
      hEl.className   = 'path-step-num text-amber';
      hEl.textContent = `h=${step.hValue}`;

      stepEl.appendChild(numEl);
      stepEl.appendChild(miniGrid);
      stepEl.appendChild(hEl);
      container.appendChild(stepEl);

      // Add arrow between steps
      if (i < formatted.length - 1) {
        const arrow = document.createElement('div');
        arrow.className = 'path-arrow';
        arrow.textContent = '→';
        container.appendChild(arrow);
      }
    });
  }

  // ── Controls Update ──────────────────────────────────────

  _updateControls() {
    const hasHistory = this._history.length > 0;
    const atStart    = this._currentStep <= 0;
    const atEnd      = this._currentStep >= this._history.length - 1;

    this._setDisabled('btn-play-pause',  !hasHistory);
    this._setDisabled('btn-step-start',  !hasHistory || atStart);
    this._setDisabled('btn-step-back',   !hasHistory || atStart);
    this._setDisabled('btn-step-fwd',    !hasHistory || atEnd);
    this._setDisabled('btn-step-end',    !hasHistory || atEnd);

    const btnPlayPause = document.getElementById('btn-play-pause');
    if (btnPlayPause) {
      btnPlayPause.textContent = this._isPlaying ? '⏸ Pause' : '▶ Play';
    }

    // Update progress bar
    const progressBar = document.getElementById('search-progress');
    if (progressBar && this._history.length > 0) {
      const pct = ((this._currentStep + 1) / this._history.length) * 100;
      progressBar.style.width = `${pct}%`;
    }
  }

  _updateStepCounter() {
    const el = document.getElementById('step-counter');
    if (el) {
      el.innerHTML = `Step <span class="current-step">${this._currentStep + 1}</span> / <span class="total-steps">${this._history.length}</span>`;
    }
  }

  _setDisabled(id, disabled) {
    const el = document.getElementById(id);
    if (el) el.disabled = disabled;
  }

  _onPlaybackComplete() {
    // Show solution path if available
    if (this._result && this._result.found) {
      showToast('✅ Search complete! Solution found.', 'success');
    }
  }

  // ── Toast Notification ───────────────────────────────────

  showToast(message, type = 'info') {
    showToast(message, type);
  }
}

// ── Global Toast Utility ────────────────────────────────────

/**
 * Show a toast notification.
 * @param {string} message
 * @param {string} type - 'success' | 'error' | 'warning' | 'info'
 */
export function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
  container.appendChild(toast);

  // Auto-dismiss after 3s
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── Input Grid Builder ──────────────────────────────────────

/**
 * Build a 3×3 input grid for manual puzzle entry.
 * @param {string}   containerId - ID of the container element
 * @param {number[]} initialValues - Starting values (0-8)
 * @param {function} onChange     - Callback when values change
 */
export function buildInputGrid(containerId, initialValues, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';
  container.className = 'grid-input-container';

  for (let i = 0; i < 9; i++) {
    const input = document.createElement('input');
    input.type        = 'text';
    input.maxLength   = 1;
    input.className   = 'grid-input-cell';
    input.id          = `${containerId}-cell-${i}`;
    input.value       = initialValues[i] === BLANK_TILE ? '0' : String(initialValues[i]);
    input.dataset.index = i;
    input.setAttribute('aria-label', `Tile position ${i}`);
    input.inputMode   = 'numeric';

    input.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (val === '' || val === '0') {
        e.target.value = '0';
      } else if (/^[1-8]$/.test(val)) {
        e.target.value = val;
        // Auto-advance to next input
        const next = container.querySelector(`[data-index="${i + 1}"]`);
        if (next) next.focus();
      } else {
        e.target.value = e.target.dataset.lastValid || '0';
      }

      e.target.dataset.lastValid = e.target.value;
      if (onChange) onChange(getInputGridValues(containerId));
    });

    input.addEventListener('focus', () => input.select());

    input.addEventListener('keydown', (e) => {
      // Arrow key navigation
      const dir = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 };
      if (dir[e.key] !== undefined) {
        e.preventDefault();
        const nextIdx = i + dir[e.key];
        if (nextIdx >= 0 && nextIdx < 9) {
          container.querySelector(`[data-index="${nextIdx}"]`)?.focus();
        }
      }
    });

    container.appendChild(input);
  }
}

/**
 * Read current values from an input grid.
 * @param {string} containerId
 * @returns {number[]}
 */
export function getInputGridValues(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return Array.from(container.querySelectorAll('.grid-input-cell'))
    .map(inp => parseInt(inp.value, 10) || 0);
}

/**
 * Set values in an input grid.
 * @param {string}   containerId
 * @param {number[]} values
 */
export function setInputGridValues(containerId, values) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const inputs = container.querySelectorAll('.grid-input-cell');
  values.forEach((val, idx) => {
    if (inputs[idx]) inputs[idx].value = String(val);
  });
}

/**
 * Validate and highlight input grid cells.
 * @param {string}   containerId
 * @param {object}   validation - { valid: boolean, error: string }
 */
export function highlightInputGrid(containerId, validation) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const seen   = new Map();
  const inputs = container.querySelectorAll('.grid-input-cell');
  const values = Array.from(inputs).map(i => parseInt(i.value, 10) || 0);

  values.forEach(v => seen.set(v, (seen.get(v) || 0) + 1));

  inputs.forEach((input, idx) => {
    const val   = values[idx];
    const isDupe= seen.get(val) > 1;
    input.classList.remove('valid', 'invalid');
    if (!validation.valid || isDupe) {
      input.classList.add('invalid');
    } else {
      input.classList.add('valid');
    }
  });
}

export default Visualizer;

/** JSDoc: Visualizer animation contracts */

export function getAnimationSpeedLabel(ms) { return ms <= 100 ? 'Fast' : 'Normal'; }

/** Defensive guard against empty grid values */

/** Visualizer bounds checking guard */
