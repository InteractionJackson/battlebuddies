// ============================
// STATE
// ============================
const state = {
  mode: null,          // 'los' | 'htl' | 'siege'
  viewMode: 'basic',   // 'basic' | 'wartable'
  round: 1,
  activePlayer: 0,     // 0 or 1
  maxRounds: 5,
  players: [
    { name: 'Player 1', kills: 0, score: 0, usedOrders: [], activeOrder: null, shaken: false },
    { name: 'Player 2', kills: 0, score: 0, usedOrders: [], activeOrder: null, shaken: false }
  ],
  objectives: [
    { name: 'Objective 1', pts: 1, holder: 'contested' },
    { name: 'Centre', pts: 2, holder: 'contested' },
    { name: 'Objective 3', pts: 1, holder: 'contested' }
  ],
  siegeObjectives: [
    { name: 'Objective 1', holder: 'contested' },
    { name: 'Objective 2', holder: 'contested' },
    { name: 'Objective 3', holder: 'contested' }
  ],
  battleLog: [],
  battleActive: false
};

const MODE_META = {
  los:  { label: 'Last One Standing', emoji: '💀' },
  htl:  { label: 'Hold the Line',     emoji: '🚩' },
  siege:{ label: 'Siege',             emoji: '🏰' }
};

const ORDERS = {
  advance:   { key: 'advance',   name: 'Advance',        icon: '🏃', tagline: 'Move further this turn',    effect: 'Move up to 9" instead of 6" this turn',          phase: 'move'   },
  focusfire: { key: 'focusfire', name: 'Focus Fire',      icon: '🎯', tagline: 'Sharpen your aim',          effect: 'Re-roll hit rolls of 1 during shooting',          phase: 'shoot'  },
  holdline:  { key: 'holdline',  name: 'Hold the Line',   icon: '🛡️', tagline: 'Armour up',                effect: 'Your saves are 3+ instead of 4+ this turn',       phase: 'save'   },
  charge:    { key: 'charge',    name: 'Charge!',         icon: '⚡', tagline: 'Rush the enemy',            effect: 'Add 2 to all charge roll results this turn',      phase: 'charge' }
};

// ============================
// SCREEN NAVIGATION
// ============================
let currentScreen = 'rules';

function showScreen(id) {
  if (state.viewMode === 'wartable' && id !== 'battle') exitWarTable();
  const screens = document.querySelectorAll('.screen');
  screens.forEach(s => {
    if (s.id === 'screen-' + currentScreen) {
      s.classList.add('exit-left');
      setTimeout(() => {
        s.classList.remove('active', 'exit-left');
        s.style.display = 'none';
      }, 280);
    }
  });
  const next = document.getElementById('screen-' + id);
  if (next) {
    setTimeout(() => {
      next.style.display = 'block';
      requestAnimationFrame(() => {
        next.classList.add('active');
      });
    }, 60);
  }
  currentScreen = id;
}

// ============================
// PHASE CARDS
// ============================
function togglePhase(id) {
  const card = document.getElementById('phase-' + id);
  const body = document.getElementById('phase-body-' + id);
  const isOpen = card.classList.contains('open');

  // Close all
  document.querySelectorAll('.phase-card').forEach(c => {
    c.classList.remove('open');
  });
  document.querySelectorAll('.phase-body').forEach(b => {
    b.style.maxHeight = '0';
  });

  if (!isOpen) {
    card.classList.add('open');
    body.style.maxHeight = body.scrollHeight + 'px';
  }
}

// ============================
// SETUP SCREEN
// ============================
const SETUP_META = {
  los: {
    icon: '💀',
    instruction: `<strong>Pick your sides.</strong> Set up your models at opposite ends of the table. Try to keep the numbers even. When you're ready, tap Start the battle.`,
    checks: [
      { icon: '🪖', text: 'Both players pick their models' },
      { icon: '↔️', text: 'Set up at opposite ends of the table' },
      { icon: '⚖️', text: 'Keep model counts even' }
    ]
  },
  htl: {
    icon: '🚩',
    instruction: `<strong>Place three objective markers</strong> before anyone sets up. Spread them out — one on each side and one in the middle works well. Then both players set up at opposite ends as normal. When you're ready, tap Start the battle.`,
    checks: [
      { icon: '📍', text: 'Place one objective on the left' },
      { icon: '📍', text: 'Place one objective in the centre' },
      { icon: '📍', text: 'Place one objective on the right' },
      { icon: '↔️', text: 'Both players set up at opposite ends' }
    ]
  },
  siege: {
    icon: '🏰',
    instruction: `<strong>Decide who is attacking and who is defending.</strong> The defender places three objectives anywhere in their half, then sets up their models there too. The attacker sets up along the opposite edge. Give the attacker 25% more models to keep things fair — if the defender has 8 models, the attacker gets 10. When you're ready, tap Start the battle.`,
    checks: [
      { icon: '🛡️', text: 'Defender places 3 objectives in their half' },
      { icon: '🛡️', text: 'Defender sets up their models in their half' },
      { icon: '⚔️', text: 'Attacker sets up along the opposite edge' },
      { icon: '➕', text: 'Give the attacker ~25% more models' }
    ]
  }
};

function showSetup(mode) {
  state.mode = mode;
  const meta = SETUP_META[mode];
  const modeMeta = MODE_META[mode];

  document.getElementById('setup-mode-name').textContent = modeMeta.label;
  document.getElementById('setup-hero-icon').textContent = meta.icon;
  document.getElementById('setup-instruction-text').innerHTML = meta.instruction;

  const checklist = document.getElementById('setup-checklist');
  checklist.innerHTML = meta.checks.map(c => `
    <div class="setup-check-item">
      <span class="setup-check-icon">${c.icon}</span>
      <span class="setup-check-text">${c.text}</span>
    </div>`).join('');

  showScreen('setup');
}

// ============================
// BATTLESHOCK CHECK
// ============================
function showBattleshockCheck() {
  const ap = state.activePlayer;
  const p = state.players[ap];
  updateWTModalOrientation();
  document.getElementById('bshock-round-label').textContent = `Round ${state.round} of ${state.maxRounds}`;
  document.getElementById('bshock-player-label').textContent = `${p.name}'s Turn`;
  document.getElementById('bshock-step1').style.display = '';
  document.getElementById('bshock-step2').style.display = 'none';
  const modal = document.getElementById('battleshock-modal');
  modal.style.display = 'flex';
  requestAnimationFrame(() => modal.classList.add('show'));
}

function closeBattleshockModal(callback) {
  const modal = document.getElementById('battleshock-modal');
  modal.classList.remove('show');
  setTimeout(() => { modal.style.display = 'none'; if (callback) callback(); }, 200);
}

function battleshockNo() {
  closeBattleshockModal(() => showCommandPhase());
}

function battleshockYes() {
  document.getElementById('bshock-step1').style.display = 'none';
  document.getElementById('bshock-step2').style.display = '';
}

function battleshockHeld() {
  logEvent('battleshock_held', { round: state.round, player: state.players[state.activePlayer].name });
  closeBattleshockModal(() => showCommandPhase());
}

function battleshockBroke() {
  logEvent('battleshock_broke', { round: state.round, player: state.players[state.activePlayer].name });
  state.players[state.activePlayer].shaken = true;
  closeBattleshockModal(() => showCommandPhase());
}

// ============================
// COMMAND PHASE
// ============================
function showCommandPhase() {
  const ap = state.activePlayer;
  const p = state.players[ap];
  updateWTModalOrientation();

  document.getElementById('cmd-round-label').textContent = `Round ${state.round} of ${state.maxRounds}`;
  document.getElementById('cmd-player-label').textContent = `${p.name}'s Turn`;

  const orderKeys = ['advance', 'focusfire', 'holdline', 'charge'];
  const listEl = document.getElementById('cmd-order-list');
  listEl.innerHTML = orderKeys.map(key => {
    const o = ORDERS[key];
    const used = p.usedOrders.includes(key);
    return `
      <div class="order-card ${used ? 'order-used' : ''}" onclick="selectOrder('${key}')">
        <div class="order-card-icon">${o.icon}</div>
        <div class="order-card-info">
          <div class="order-card-name">${o.name}</div>
          <div class="order-card-effect">${o.effect}</div>
        </div>
        <span class="order-used-tag">Used</span>
      </div>`;
  }).join('');

  const allUsed = p.usedOrders.length >= orderKeys.length;
  document.querySelector('#command-modal .command-skip .btn').textContent =
    allUsed ? 'Continue to Battle →' : 'Skip for now';

  updateTurnLabel();
  renderBattle();
  if (currentScreen !== 'battle') {
    showScreen('battle');
  }

  const modal = document.getElementById('command-modal');
  modal.style.display = 'flex';
  requestAnimationFrame(() => modal.classList.add('show'));
}

function selectOrder(key) {
  const ap = state.activePlayer;
  const p = state.players[ap];
  if (key) {
    logEvent('order', { round: state.round, player: p.name, orderKey: key });
  } else {
    logEvent('order_skip', { round: state.round, player: p.name });
  }
  p.activeOrder = key;
  if (key && !p.usedOrders.includes(key)) {
    p.usedOrders.push(key);
  }
  const modal = document.getElementById('command-modal');
  modal.classList.remove('show');
  setTimeout(() => { modal.style.display = 'none'; }, 200);
  updateTurnLabel();
  renderBattle();
}

// ============================
// BATTLE INIT
// ============================
function startBattle() {
  const mode = state.mode;
  state.battleLog = [];
  state.battleActive = true;
  state.viewMode = 'basic';
  document.getElementById('war-table').classList.remove('show');
  wtBandState = 0;
  resetBattleReport();
  history.pushState(null, '');
  state.round = 1;
  state.activePlayer = 0;
  state.players[0].kills = 0;
  state.players[0].score = 0;
  state.players[0].usedOrders = [];
  state.players[0].activeOrder = null;
  state.players[0].shaken = false;
  state.players[1].kills = 0;
  state.players[1].score = 0;
  state.players[1].usedOrders = [];
  state.players[1].activeOrder = null;
  state.players[1].shaken = false;
  state.objectives.forEach(o => o.holder = 'contested');
  state.siegeObjectives.forEach(o => o.holder = 'contested');

  document.getElementById('battle-mode-icon').textContent = MODE_META[mode].emoji;
  document.getElementById('battle-mode-label').textContent = MODE_META[mode].label;
  showCommandPhase();
}

function updateTurnLabel() {
  const p = state.players[state.activePlayer];
  document.getElementById('battle-turn-label').textContent = `Round ${state.round}`;
  const isLast = state.round >= state.maxRounds && state.activePlayer === 1;
  document.getElementById('battle-next-btn').textContent = isLast ? 'End Game →' : 'Next Turn →';
}

// ============================
// RENDER BATTLE
// ============================
function renderBattle() {
  const el = document.getElementById('battle-content');
  if (state.mode === 'los') el.innerHTML = renderLOS();
  else if (state.mode === 'htl') el.innerHTML = renderHTL();
  else if (state.mode === 'siege') el.innerHTML = renderSiege();

  renderTurnTrack();
  attachNameEditing();

  if (state.viewMode === 'wartable') renderWarTable();
}

function renderTurnTrack() {
  let dots = document.getElementById('battle-progress-dots');
  if (!dots) return;
  let html = '';
  for (let i = 1; i <= state.maxRounds; i++) {
    let cls = i < state.round ? 'done' : i === state.round ? 'current' : '';
    html += `<div class="turn-dot ${cls}"></div>`;
  }
  dots.innerHTML = html;
}

function renderOrderReminder() {
  const p = state.players[state.activePlayer];
  if (!p.activeOrder) return '';
  const o = ORDERS[p.activeOrder];
  return `
    <div class="order-reminder">
      <div class="order-reminder-icon">${o.icon}</div>
      <div class="order-reminder-text"><strong>${o.name}:</strong> ${o.effect}</div>
    </div>`;
}

function renderShakenReminder() {
  const p = state.players[state.activePlayer];
  if (!p.shaken) return '';
  return `
    <div class="shaken-reminder">
      <div class="order-reminder-icon">⚠️</div>
      <div class="order-reminder-text"><strong>Shaken:</strong> Your models are shaken — move up to 3 inches this turn only.</div>
    </div>`;
}

function renderLOS() {
  return `
    ${renderOrderReminder()}
    ${renderShakenReminder()}
    <div class="player-panels">
      ${renderPlayerPanel(0, 'kills', '⚔️ Kills')}
      ${renderPlayerPanel(1, 'kills', '⚔️ Kills')}
    </div>
    <div style="text-align:center; color:var(--text-muted); font-size:13px; margin-top:4px; padding:0 4px;">
      Count enemy models removed from the table
    </div>
  `;
}

function renderHTL() {
  const p0 = state.players[0];
  const p1 = state.players[1];
  let objHtml = '';
  state.objectives.forEach((obj, i) => {
    objHtml += `
      <div class="objective-card">
        <div class="objective-top">
          <div class="objective-name">
            ${obj.name}
            ${obj.pts === 2 ? '<span class="obj-pts-badge">2 pts</span>' : '<span class="obj-pts-badge">1 pt</span>'}
          </div>
        </div>
        <div class="objective-toggle">
          <button class="toggle-btn ${obj.holder === 'p1' ? 'active-p1' : ''}" onclick="setObjHolder('htl', ${i}, 'p1')" id="htl-toggle-${i}-p1">${p0.name}</button>
          <button class="toggle-btn ${obj.holder === 'contested' ? 'active-contested' : ''}" onclick="setObjHolder('htl', ${i}, 'contested')" id="htl-toggle-${i}-contested">Contested</button>
          <button class="toggle-btn ${obj.holder === 'p2' ? 'active-p2' : ''}" onclick="setObjHolder('htl', ${i}, 'p2')" id="htl-toggle-${i}-p2">${p1.name}</button>
        </div>
      </div>`;
  });
  return `
    ${renderOrderReminder()}
    ${renderShakenReminder()}
    <div class="player-panels">
      ${renderPlayerPanel(0, 'score', '🚩 Points')}
      ${renderPlayerPanel(1, 'score', '🚩 Points')}
    </div>
    <div class="objectives-section mt-4">
      <h3>Objectives</h3>
      <div class="objective-list">${objHtml}</div>
    </div>
    <div style="text-align:center; color:var(--text-muted); font-size:12px; margin-top:10px;">
      Points are scored at the <strong>end of each round</strong> — tap Next Turn after Player 2.
    </div>
  `;
}

function renderSiege() {
  const p0 = state.players[0];
  const p1 = state.players[1];
  let objHtml = '';
  state.siegeObjectives.forEach((obj, i) => {
    objHtml += `
      <div class="objective-card">
        <div class="objective-top">
          <div class="objective-name">${obj.name}</div>
        </div>
        <div class="objective-toggle">
          <button class="toggle-btn ${obj.holder === 'attacker' ? 'active-attacker' : ''}" onclick="setObjHolder('siege', ${i}, 'attacker')" id="siege-toggle-${i}-attacker">⚔️ Attacker</button>
          <button class="toggle-btn ${obj.holder === 'contested' ? 'active-contested' : ''}" onclick="setObjHolder('siege', ${i}, 'contested')" id="siege-toggle-${i}-contested">Contested</button>
          <button class="toggle-btn ${obj.holder === 'defender' ? 'active-defender' : ''}" onclick="setObjHolder('siege', ${i}, 'defender')" id="siege-toggle-${i}-defender">🛡️ Defender</button>
        </div>
      </div>`;
  });
  return `
    ${renderOrderReminder()}
    ${renderShakenReminder()}
    <div class="siege-roles">
      <div class="siege-role-card attacker">
        <div class="siege-role-label">Attacker</div>
        <div class="siege-role-name" id="siege-attacker-name">${p0.name}</div>
      </div>
      <div class="siege-role-card defender">
        <div class="siege-role-label">Defender</div>
        <div class="siege-role-name" id="siege-defender-name">${p1.name}</div>
      </div>
    </div>
    <div class="objectives-section">
      <h3>Objectives</h3>
      <div class="objective-list">${objHtml}</div>
    </div>
    <div style="text-align:center; color:var(--text-muted); font-size:12px; margin-top:10px; padding:0 4px;">
      Capture all 3 for a decisive victory. Hold 2 to win. Hold 1 or fewer — Defender wins!
    </div>
  `;
}

function renderPlayerPanel(idx, statKey, statLabel) {
  const p = state.players[idx];
  const cls = idx === 0 ? 'p1' : 'p2';
  const val = p[statKey];
  const isActive = state.activePlayer === idx;

  // Row 1: name + battle shocked indicator
  const shakenBadge = p.shaken ? `<div class="tile-shocked-pill">⚡️</div>` : '';

  // Row 2: order pill (top) + kill counter (below)
  let orderPill = '';
  if (p.activeOrder) {
    const o = ORDERS[p.activeOrder];
    orderPill = `<div class="tile-order-pill${isActive ? '' : ' tile-order-pill--dim'}">${o.icon} ${o.name}</div>`;
  }
  const counterLabel = statLabel.replace(/^[^\w]+/, '').toLowerCase();
  const killCounter = `
    <div class="tile-kill-counter">
      <div class="tile-kill-number" id="tile-score-${idx}">${val}</div>
      <div class="tile-kill-label">${counterLabel}</div>
    </div>`;

  // Row 3: +/− buttons (LOS only — HTL scores automatically from objectives)
  const controls = isActive && state.mode === 'los' ? `
    <div class="tile-controls">
      <button class="tile-btn tile-btn-minus" onclick="adjustKills(${idx}, -1)">−</button>
      <button class="tile-btn tile-btn-plus" onclick="adjustKills(${idx}, 1)">+</button>
    </div>` : '';

  return `
    <div class="player-panel ${cls}${isActive ? ' active-turn' : ''}">
      <div class="tile-row-1">
        <div class="tile-name-wrap">
          <div class="tile-player-name" id="pname-display-${idx}" onclick="startEditName(${idx})" title="Tap to edit">${escHtml(p.name)}</div>
          <input class="player-name-input" id="pname-input-${idx}" value="${escHtml(p.name)}" onblur="finishEditName(${idx})" onkeydown="nameKeydown(event, ${idx})">
        </div>
        ${shakenBadge}
      </div>
      <div class="tile-row-2">
        ${orderPill}
        ${killCounter}
      </div>
      ${controls}
    </div>`;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================
// WAR TABLE
// ============================
let wtBandState = 0; // 0 = objectives panel, 1 = exit/rules panel
let wtSwipeStartX = null;

function enterWarTable() {
  state.viewMode = 'wartable';
  wtBandState = 0;
  renderWarTable();
  document.getElementById('war-table').classList.add('show');
}

function exitWarTable() {
  state.viewMode = 'basic';
  document.getElementById('war-table').classList.remove('show');
  document.body.classList.remove('wt-flip-modals');
}

function setWTBandState(i) {
  wtBandState = i;
  renderWarTable();
}

function wtBandTouchStart(e) {
  if (state.mode === 'los') return;
  wtSwipeStartX = e.touches[0].clientX;
}

function wtBandTouchEnd(e) {
  if (wtSwipeStartX === null || state.mode === 'los') { wtSwipeStartX = null; return; }
  const dx = e.changedTouches[0].clientX - wtSwipeStartX;
  wtSwipeStartX = null;
  if (Math.abs(dx) < 40) return;
  setWTBandState(dx < 0 ? 1 : 0);
}

// Modals should face whichever player is currently active in War Table mode
function updateWTModalOrientation() {
  const flip = state.viewMode === 'wartable' && state.activePlayer === 1;
  document.body.classList.toggle('wt-flip-modals', flip);
}

function renderWarTable() {
  const el = document.getElementById('war-table');
  if (!el) return;
  el.innerHTML = `
    <div class="wt-half wt-rotated">${renderWTHalf(1)}</div>
    <div class="wt-band" ontouchstart="wtBandTouchStart(event)" ontouchend="wtBandTouchEnd(event)">${renderWTBand()}</div>
    <div class="wt-half">${renderWTHalf(0)}</div>
  `;
  updateWTModalOrientation();
}

function renderWTProgress() {
  let dots = '';
  for (let i = 1; i <= state.maxRounds; i++) {
    let cls = i < state.round ? 'done' : i === state.round ? 'current' : '';
    dots += `<div class="turn-dot ${cls}"></div>`;
  }
  return `<div class="wt-progress"><div class="wt-progress-label">Round ${state.round} of ${state.maxRounds}</div><div class="wt-progress-dots">${dots}</div></div>`;
}

function renderWTBanner(idx) {
  const p = state.players[idx];
  if (state.activePlayer !== idx) return '';
  let html = '';
  if (p.shaken) {
    html += `<div class="wt-banner wt-shaken"><span class="wt-banner-icon">⚠️</span><span>Shaken — Move up to 3" this turn only</span></div>`;
  }
  if (p.activeOrder) {
    const o = ORDERS[p.activeOrder];
    html += `<div class="wt-banner wt-order"><span class="wt-banner-icon">${o.icon}</span><span><strong>${o.name}:</strong> ${o.effect}</span></div>`;
  }
  return html;
}

function renderWTCard(idx) {
  const p = state.players[idx];
  const opp = state.players[idx === 0 ? 1 : 0];
  const cls = idx === 0 ? 'p1' : 'p2';

  let body = '';
  if (state.mode === 'los') {
    body = `
      <div class="wt-card-label">⚔️ Kills</div>
      <div class="wt-kill-controls">
        <button class="btn btn-icon btn-icon-danger" onclick="adjustKills(${idx}, -1)">−</button>
        <div class="wt-score-value">${p.kills}</div>
        <button class="btn btn-icon btn-icon-primary" onclick="adjustKills(${idx}, 1)">+</button>
      </div>
      <div class="wt-opponent-stat">${escHtml(opp.name)}: <strong>${opp.kills}</strong> kills</div>`;
  } else if (state.mode === 'htl') {
    body = `
      <div class="wt-card-label">🚩 Points</div>
      <div class="wt-score-value">${p.score}</div>`;
  } else if (state.mode === 'siege') {
    const role = idx === 0 ? 'Attacker' : 'Defender';
    const icon = idx === 0 ? '⚔️' : '🛡️';
    body = `<div class="wt-card-label">${icon} ${role}</div>`;
  }

  return `
    <div class="wt-card ${cls}">
      <div class="wt-card-name">${escHtml(p.name)}</div>
      ${body}
    </div>`;
}

function renderWTTurnControl(idx) {
  if (state.activePlayer === idx) {
    return `<button class="wt-complete-btn" onclick="nextTurn()">Complete turn ✓</button>`;
  }
  const opp = state.players[idx === 0 ? 1 : 0];
  return `<div class="wt-waiting">Waiting for ${escHtml(opp.name)}</div>`;
}

function renderWTHalf(idx) {
  return `
    ${renderWTProgress()}
    ${renderWTBanner(idx)}
    ${renderWTCard(idx)}
    ${renderWTTurnControl(idx)}
  `;
}

function renderWTObjectives() {
  const p0 = state.players[0];
  const p1 = state.players[1];
  if (state.mode === 'htl') {
    return state.objectives.map((obj, i) => `
      <div class="wt-obj-row">
        <div class="wt-obj-name">${escHtml(obj.name)} <span class="obj-pts-badge">${obj.pts === 2 ? '2 pts' : '1 pt'}</span></div>
        <div class="objective-toggle">
          <button class="toggle-btn ${obj.holder === 'p1' ? 'active-p1' : ''}" onclick="setObjHolder('htl', ${i}, 'p1')">${escHtml(p0.name)}</button>
          <button class="toggle-btn ${obj.holder === 'contested' ? 'active-contested' : ''}" onclick="setObjHolder('htl', ${i}, 'contested')">Contested</button>
          <button class="toggle-btn ${obj.holder === 'p2' ? 'active-p2' : ''}" onclick="setObjHolder('htl', ${i}, 'p2')">${escHtml(p1.name)}</button>
        </div>
      </div>`).join('');
  }
  return state.siegeObjectives.map((obj, i) => `
    <div class="wt-obj-row">
      <div class="wt-obj-name">${escHtml(obj.name)}</div>
      <div class="objective-toggle">
        <button class="toggle-btn ${obj.holder === 'attacker' ? 'active-attacker' : ''}" onclick="setObjHolder('siege', ${i}, 'attacker')">⚔️ ${escHtml(p0.name)}</button>
        <button class="toggle-btn ${obj.holder === 'contested' ? 'active-contested' : ''}" onclick="setObjHolder('siege', ${i}, 'contested')">Contested</button>
        <button class="toggle-btn ${obj.holder === 'defender' ? 'active-defender' : ''}" onclick="setObjHolder('siege', ${i}, 'defender')">🛡️ ${escHtml(p1.name)}</button>
      </div>
    </div>`).join('');
}

function renderWTBandDots() {
  return `
    <div class="wt-band-dots">
      <div class="wt-band-dot ${wtBandState === 0 ? 'active' : ''}" onclick="setWTBandState(0)"></div>
      <div class="wt-band-dot ${wtBandState === 1 ? 'active' : ''}" onclick="setWTBandState(1)"></div>
    </div>`;
}

function renderWTBandActions() {
  return `
    <div class="wt-band-actions">
      <button class="wt-band-btn" onclick="exitWarTable()">↩️ Basic</button>
      <button class="wt-band-btn" onclick="showRulebookModal()">📖 Rules</button>
      <button class="wt-band-btn wt-band-btn-exit" onclick="attemptExitBattle()">✕ Exit</button>
    </div>`;
}

function renderWTBand() {
  if (state.mode === 'los') {
    return `<div class="wt-band-slim">${renderWTBandActions()}</div>`;
  }
  if (wtBandState === 0) {
    return `
      <div class="wt-band-objectives">${renderWTObjectives()}</div>
      ${renderWTBandDots()}`;
  }
  return `
    ${renderWTBandActions()}
    ${renderWTBandDots()}`;
}

// ============================
// NAME EDITING
// ============================
function attachNameEditing() {
  // inputs are already rendered, no extra attachment needed
}

function startEditName(idx) {
  const display = document.getElementById(`pname-display-${idx}`);
  const input = document.getElementById(`pname-input-${idx}`);
  if (!display || !input) return;
  display.style.display = 'none';
  input.style.display = 'block';
  input.focus();
  input.select();
}

function finishEditName(idx) {
  const display = document.getElementById(`pname-display-${idx}`);
  const input = document.getElementById(`pname-input-${idx}`);
  if (!display || !input) return;
  const newName = input.value.trim() || `Player ${idx + 1}`;
  state.players[idx].name = newName;
  display.textContent = newName;
  input.style.display = 'none';
  display.style.display = '';
  // Update siege role names if visible
  const sAtk = document.getElementById('siege-attacker-name');
  const sDef = document.getElementById('siege-defender-name');
  if (sAtk && idx === 0) sAtk.textContent = newName;
  if (sDef && idx === 1) sDef.textContent = newName;
  // Re-render objective toggles to update player names
  if (state.mode === 'htl') {
    const objList = document.querySelector('.objective-list');
    if (objList) objList.innerHTML = buildHTLObjectiveHTML();
  }
}

function nameKeydown(e, idx) {
  if (e.key === 'Enter') finishEditName(idx);
  if (e.key === 'Escape') {
    const input = document.getElementById(`pname-input-${idx}`);
    if (input) input.value = state.players[idx].name;
    finishEditName(idx);
  }
}

function buildHTLObjectiveHTML() {
  const p0 = state.players[0];
  const p1 = state.players[1];
  let html = '';
  state.objectives.forEach((obj, i) => {
    html += `
      <div class="objective-card">
        <div class="objective-top">
          <div class="objective-name">
            ${obj.name}
            ${obj.pts === 2 ? '<span class="obj-pts-badge">2 pts</span>' : '<span class="obj-pts-badge">1 pt</span>'}
          </div>
        </div>
        <div class="objective-toggle">
          <button class="toggle-btn ${obj.holder === 'p1' ? 'active-p1' : ''}" onclick="setObjHolder('htl', ${i}, 'p1')">${escHtml(p0.name)}</button>
          <button class="toggle-btn ${obj.holder === 'contested' ? 'active-contested' : ''}" onclick="setObjHolder('htl', ${i}, 'contested')">Contested</button>
          <button class="toggle-btn ${obj.holder === 'p2' ? 'active-p2' : ''}" onclick="setObjHolder('htl', ${i}, 'p2')">${escHtml(p1.name)}</button>
        </div>
      </div>`;
  });
  return html;
}

// ============================
// KILLS
// ============================
function adjustKills(idx, delta) {
  state.players[idx].kills = Math.max(0, state.players[idx].kills + delta);
  const scoreEl = document.getElementById(`tile-score-${idx}`);
  if (scoreEl) scoreEl.textContent = state.players[idx].kills;
  if (state.viewMode === 'wartable') renderWarTable();
}

// ============================
// OBJECTIVES
// ============================
function setObjHolder(mode, idx, holder) {
  if (mode === 'htl') {
    state.objectives[idx].holder = holder;
  } else {
    state.siegeObjectives[idx].holder = holder;
  }
  // Update toggle buttons
  const suffixes = mode === 'htl' ? ['p1','contested','p2'] : ['attacker','contested','defender'];
  const values = mode === 'htl' ? ['p1','contested','p2'] : ['attacker','contested','defender'];
  const prefix = mode === 'htl' ? 'htl' : 'siege';
  suffixes.forEach((s, i) => {
    const btn = document.getElementById(`${prefix}-toggle-${idx}-${s}`);
    if (btn) {
      btn.className = 'toggle-btn';
      if (values[i] === holder) btn.classList.add(`active-${s}`);
    }
  });
  if (state.viewMode === 'wartable') renderWarTable();
}

// ============================
// NEXT TURN / END GAME
// ============================
function nextTurn() {
  // HTL scores at end of each full round (after P2's half)
  if (state.mode === 'htl' && state.activePlayer === 1) {
    scoreHTLTurn();
  }

  // Snapshot both players' stats for the battle log
  logEvent('halfturn_end', {
    round: state.round,
    player: state.players[state.activePlayer].name,
    p0kills: state.players[0].kills, p0score: state.players[0].score,
    p1kills: state.players[1].kills, p1score: state.players[1].score
  });

  // Clear the ending player's per-turn state
  const ending = state.activePlayer;
  state.players[ending].activeOrder = null;
  state.players[ending].shaken = false;

  // Advance: P1 → P2, or P2 → next round P1
  if (state.activePlayer === 0) {
    state.activePlayer = 1;
    renderBattle();
    showBattleshockCheck();
  } else {
    if (state.round >= state.maxRounds) {
      endGame();
      return;
    }
    state.round++;
    state.activePlayer = 0;
    renderBattle();
    showBattleshockCheck();
  }
}

function scoreHTLTurn() {
  state.objectives.forEach(obj => {
    if (obj.holder === 'p1') state.players[0].score += obj.pts;
    if (obj.holder === 'p2') state.players[1].score += obj.pts;
  });
  // Scores reflected via re-render in nextTurn → showCommandPhase → renderBattle
}

// ============================
// END GAME
// ============================
function endGame() {
  if (state.mode === 'los') {
    const p0k = state.players[0].kills;
    const p1k = state.players[1].kills;
    if (p0k === p1k) {
      showTiebreakModal();
      return;
    }
    showResult();
  } else if (state.mode === 'htl') {
    showResult();
  } else if (state.mode === 'siege') {
    showResult();
  }
}

function showResult() {
  state.battleActive = false;
  resetBattleReport();
  const mode = state.mode;
  const p0 = state.players[0];
  const p1 = state.players[1];
  let trophy = '🏆';
  let title = '';
  let subtitle = '';
  let winnerText = '';
  let scoresHtml = '';

  if (mode === 'los') {
    const w = p0.kills > p1.kills ? 0 : 1;
    title = `${state.players[w].name} wins!`;
    subtitle = 'Most kills takes the victory';
    winnerText = `👑 ${state.players[w].name} wins with ${state.players[w].kills} kills!`;
    scoresHtml = `
      <div class="result-score-row result-p1">
        <span class="result-player-name">${escHtml(p0.name)}</span>
        <span class="result-player-score">${p0.kills} kills</span>
      </div>
      <div class="result-score-row result-p2">
        <span class="result-player-name">${escHtml(p1.name)}</span>
        <span class="result-player-score">${p1.kills} kills</span>
      </div>`;
  } else if (mode === 'htl') {
    const w = p0.score >= p1.score ? 0 : 1;
    const tied = p0.score === p1.score;
    title = tied ? "It's a Draw!" : `${state.players[w].name} wins!`;
    subtitle = 'Most points wins the line';
    winnerText = tied
      ? `🤝 Both players scored ${p0.score} points — it's a draw!`
      : `👑 ${state.players[w].name} wins with ${state.players[w].score} points!`;
    scoresHtml = `
      <div class="result-score-row result-p1">
        <span class="result-player-name">${escHtml(p0.name)}</span>
        <span class="result-player-score">${p0.score} pts</span>
      </div>
      <div class="result-score-row result-p2">
        <span class="result-player-name">${escHtml(p1.name)}</span>
        <span class="result-player-score">${p1.score} pts</span>
      </div>`;
  } else if (mode === 'siege') {
    const attackerHeld = state.siegeObjectives.filter(o => o.holder === 'attacker').length;
    let resultText = '';
    if (attackerHeld === 3) {
      title = `${p0.name} wins!`;
      subtitle = 'Decisive Attacker Victory';
      resultText = `💥 ${p0.name} captured all 3 objectives — Decisive Attacker Victory!`;
      trophy = '⚔️';
    } else if (attackerHeld === 2) {
      title = `${p0.name} wins!`;
      subtitle = 'Attacker Victory';
      resultText = `⚔️ ${p0.name} captured 2 objectives — Attacker Victory!`;
    } else if (attackerHeld === 1) {
      title = `${p1.name} wins!`;
      subtitle = 'Defender Victory';
      resultText = `🛡️ ${p1.name} held the line — Defender Victory!`;
    } else {
      title = `${p1.name} wins!`;
      subtitle = 'Decisive Defender Victory';
      resultText = `🛡️ ${p1.name} repelled the assault — Decisive Defender Victory!`;
      trophy = '🛡️';
    }
    winnerText = resultText;
    scoresHtml = `
      <div class="result-score-row result-p1">
        <span class="result-player-name">⚔️ ${escHtml(p0.name)} (Attacker)</span>
        <span class="result-player-score">${attackerHeld}/3 objs</span>
      </div>
      <div class="result-score-row result-p2">
        <span class="result-player-name">🛡️ ${escHtml(p1.name)} (Defender)</span>
        <span class="result-player-score">${3 - attackerHeld}/3 objs</span>
      </div>`;
  }

  document.getElementById('result-trophy').textContent = trophy;
  document.getElementById('result-title').textContent = title;
  document.getElementById('result-subtitle').textContent = subtitle;
  document.getElementById('result-scores').innerHTML = scoresHtml;
  document.getElementById('result-winner-row').textContent = winnerText;

  showScreen('result');
}

// ============================
// ABANDON BATTLE
// ============================
function attemptExitBattle() {
  if (state.battleActive) {
    showAbandonModal();
  } else {
    showScreen('modes');
  }
}

function showAbandonModal() {
  const modal = document.getElementById('abandon-modal');
  modal.style.display = 'flex';
  requestAnimationFrame(() => modal.classList.add('show'));
}

function hideAbandonModal() {
  const modal = document.getElementById('abandon-modal');
  modal.classList.remove('show');
  setTimeout(() => { modal.style.display = 'none'; }, 200);
}

function confirmAbandonBattle() {
  state.battleActive = false;
  // Instantly close any open sub-modals so the battle screen is clean
  ['battleshock-modal', 'command-modal'].forEach(id => {
    const m = document.getElementById(id);
    if (m) { m.classList.remove('show'); m.style.display = 'none'; }
  });
  const modal = document.getElementById('abandon-modal');
  modal.classList.remove('show');
  setTimeout(() => { modal.style.display = 'none'; showScreen('modes'); }, 200);
}

window.addEventListener('popstate', function() {
  if (state.battleActive) {
    history.pushState(null, '');
    showAbandonModal();
  }
});

// ============================
// TIEBREAK MODAL
// ============================
function showTiebreakModal() {
  document.getElementById('tiebreak-p1-label').textContent =
    `${state.players[0].name} — Models Remaining`;
  document.getElementById('tiebreak-p2-label').textContent =
    `${state.players[1].name} — Models Remaining`;
  document.getElementById('tiebreak-p1-input').value = 0;
  document.getElementById('tiebreak-p2-input').value = 0;
  const modal = document.getElementById('tiebreak-modal');
  modal.style.display = 'flex';
  requestAnimationFrame(() => modal.classList.add('show'));
}

function hideTiebreakModal() {
  const modal = document.getElementById('tiebreak-modal');
  modal.classList.remove('show');
  setTimeout(() => modal.style.display = 'none', 200);
}

function resolveTiebreak() {
  const p0models = parseInt(document.getElementById('tiebreak-p1-input').value) || 0;
  const p1models = parseInt(document.getElementById('tiebreak-p2-input').value) || 0;
  hideTiebreakModal();

  // Temporarily adjust kills for display — use models remaining as tiebreak
  // We store in score temporarily for display
  state.players[0]._tiebreak = p0models;
  state.players[1]._tiebreak = p1models;

  const p0k = state.players[0].kills;
  const p1k = state.players[1].kills;
  const p0 = state.players[0];
  const p1 = state.players[1];

  let winnerText = '';
  if (p0models > p1models) {
    winnerText = `👑 ${p0.name} wins the tiebreak — more models remaining (${p0models} vs ${p1models})!`;
  } else if (p1models > p0models) {
    winnerText = `👑 ${p1.name} wins the tiebreak — more models remaining (${p1models} vs ${p0models})!`;
  } else {
    winnerText = `🤝 Still a perfect draw! Both players win equally!`;
  }

  const scoresHtml = `
    <div class="result-score-row result-p1">
      <span class="result-player-name">${escHtml(p0.name)}</span>
      <span class="result-player-score">${p0.kills} kills · ${p0models} left</span>
    </div>
    <div class="result-score-row result-p2">
      <span class="result-player-name">${escHtml(p1.name)}</span>
      <span class="result-player-score">${p1.kills} kills · ${p1models} left</span>
    </div>`;

  document.getElementById('result-trophy').textContent = '🏆';
  document.getElementById('result-title').textContent = 'Tiebreak!';
  document.getElementById('result-subtitle').textContent = 'Equal kills — most models remaining wins';
  document.getElementById('result-scores').innerHTML = scoresHtml;
  document.getElementById('result-winner-row').textContent = winnerText;

  showScreen('result');
}

// ============================
// PLAY AGAIN
// ============================
function playAgain() {
  startBattle();
}

// ============================
// INITIAL PHASE BODY HEIGHTS
// ============================
document.querySelectorAll('.phase-body').forEach(b => {
  b.style.maxHeight = '0';
});

// ============================
// RULEBOOK MODAL
// ============================
function showRulebookModal() {
  const modal = document.getElementById('rulebook-modal');
  modal.style.display = 'flex';
  // Reset all rulebook phase cards closed each time
  document.querySelectorAll('#rb-phase-list .phase-body').forEach(b => {
    b.style.maxHeight = '0';
  });
  document.querySelectorAll('#rb-phase-list .phase-card').forEach(c => {
    c.classList.remove('open');
  });
  requestAnimationFrame(() => modal.classList.add('show'));
}

function hideRulebookModal() {
  const modal = document.getElementById('rulebook-modal');
  modal.classList.remove('show');
  setTimeout(() => { modal.style.display = 'none'; }, 250);
}

function rulebookOverlayClick(e) {
  if (e.target === document.getElementById('rulebook-modal')) hideRulebookModal();
}

function toggleRbPhase(id) {
  const card = document.getElementById('rb-phase-' + id);
  const body = document.getElementById('rb-phase-body-' + id);
  const isOpen = card.classList.contains('open');
  document.querySelectorAll('#rb-phase-list .phase-card').forEach(c => c.classList.remove('open'));
  document.querySelectorAll('#rb-phase-list .phase-body').forEach(b => { b.style.maxHeight = '0'; });
  if (!isOpen) {
    card.classList.add('open');
    body.style.maxHeight = body.scrollHeight + 'px';
  }
}

// ============================
// BATTLE LOG
// ============================
function logEvent(type, data) {
  state.battleLog.push(Object.assign({ type }, data));
}

function buildBattleContext() {
  const mode = state.mode;
  const p0 = state.players[0];
  const p1 = state.players[1];
  let ctx = `BATTLE REPORT DATA\n\nMode: ${MODE_META[mode].label}\nCommander 1: ${p0.name} | Commander 2: ${p1.name}\n\nTURN EVENTS:\n`;

  state.battleLog.forEach(e => {
    if (e.type === 'order') {
      const o = ORDERS[e.orderKey];
      ctx += `Round ${e.round} — ${e.player}: issued the ${o.name} command (${o.effect})\n`;
    } else if (e.type === 'order_skip') {
      ctx += `Round ${e.round} — ${e.player}: issued no command order\n`;
    } else if (e.type === 'battleshock_held') {
      ctx += `Round ${e.round} — ${e.player}: Battleshock passed — squad held their nerve\n`;
    } else if (e.type === 'battleshock_broke') {
      ctx += `Round ${e.round} — ${e.player}: Battleshock FAILED — squad was shaken (move 3" only)\n`;
    } else if (e.type === 'halfturn_end') {
      if (mode === 'los') {
        ctx += `Round ${e.round}, end of ${e.player}'s half: ${p0.name} ${e.p0kills} kills | ${p1.name} ${e.p1kills} kills\n`;
      } else if (mode === 'htl') {
        ctx += `Round ${e.round}, end of ${e.player}'s half: ${p0.name} ${e.p0score} pts | ${p1.name} ${e.p1score} pts\n`;
      }
    }
  });

  ctx += '\nFINAL RESULT:\n';
  if (mode === 'los') {
    const w = p0.kills > p1.kills ? p0.name : (p1.kills > p0.kills ? p1.name : null);
    ctx += w ? `${w} wins — ${p0.name}: ${p0.kills} kills, ${p1.name}: ${p1.kills} kills\n`
             : `Draw — both commanders scored ${p0.kills} kills\n`;
  } else if (mode === 'htl') {
    const w = p0.score > p1.score ? p0.name : (p1.score > p0.score ? p1.name : null);
    ctx += w ? `${w} wins — ${p0.name}: ${p0.score} pts, ${p1.name}: ${p1.score} pts\n`
             : `Draw — both commanders scored ${p0.score} points\n`;
  } else if (mode === 'siege') {
    const held = state.siegeObjectives.filter(o => o.holder === 'attacker').length;
    ctx += `${p0.name} (Attacker) captured ${held}/3 objectives — `;
    ctx += held >= 2 ? `${p0.name} wins\n` : `${p1.name} (Defender) wins\n`;
  }
  return ctx;
}

// ============================
// BATTLE REPORT
// ============================
function resetBattleReport() {
  const btn = document.getElementById('battle-report-btn');
  if (btn) { btn.disabled = false; btn.textContent = '📜 Read the Battle Report'; }
  const keySection = document.getElementById('api-key-section');
  if (keySection) keySection.classList.add('hidden');
  const reportSection = document.getElementById('battle-report-section');
  if (reportSection) reportSection.classList.add('hidden');
  const content = document.getElementById('battle-report-content');
  if (content) content.innerHTML = '';
}

async function generateBattleReport() {
  const apiKey = localStorage.getItem('bb_anthropic_key');
  if (!apiKey) {
    document.getElementById('api-key-section').classList.remove('hidden');
    document.getElementById('api-key-input').focus();
    return;
  }

  const btn = document.getElementById('battle-report-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Generating…';
  document.getElementById('api-key-section').classList.add('hidden');

  const section = document.getElementById('battle-report-section');
  const content = document.getElementById('battle-report-content');
  section.classList.remove('hidden');
  content.innerHTML = '<div class="battle-report-loading">The scribes are writing…</div>';

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: 'You are a Warhammer 40K Black Library author. Write a grimdark battle report as a short story of no more than 3 paragraphs. Use the game events provided to shape the narrative. Reference the players as opposing commanders. Make it dramatic, atmospheric, and gloriously over the top in the Black Library style. No lists, no commentary, just pure narrative prose.',
        messages: [{ role: 'user', content: buildBattleContext() }]
      })
    });

    if (!res.ok) {
      if (res.status === 401) localStorage.removeItem('bb_anthropic_key');
      throw new Error(res.status);
    }

    const data = await res.json();
    const story = data.content[0].text.trim();
    const html = story.split(/\n\n+/).map(p => `<p>${escHtml(p)}</p>`).join('');
    content.innerHTML = `<div class="battle-report-body"><div class="battle-report-text">${html}</div></div>`;
    btn.textContent = '📜 Battle Report';

  } catch (err) {
    content.innerHTML = '<div class="battle-report-error">The scribes were lost in battle. No report today.</div>';
    btn.disabled = false;
    btn.textContent = '📜 Read the Battle Report';
  }
}

function saveApiKey() {
  const val = document.getElementById('api-key-input').value.trim();
  if (!val) return;
  localStorage.setItem('bb_anthropic_key', val);
  document.getElementById('api-key-section').classList.add('hidden');
  generateBattleReport();
}
