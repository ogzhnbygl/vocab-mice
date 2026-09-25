const code = codeFromPath();
const tracksContainer = document.getElementById('tracks-container');
const scoreboardEl = document.getElementById('scoreboard');
const overlay = document.getElementById('overlay');
const questionOverlay = document.getElementById('question-overlay');
const questionImg = document.getElementById('question-img');

let state = null;
let lastSeq = null;

const MOUSE_EMOJIS = ['🐁', '🐭'];

function onState(s) {
  const prev = state;
  const isChanged = !prev || prev.actionSeq !== s.actionSeq;
  state = s;
  
  if (lastSeq !== null && s.actionSeq > lastSeq && s.lastAction) {
    handleAction(s.lastAction);
  }
  
  lastSeq = s.actionSeq;
  if (isChanged) render();
  if (s.finished && (!prev || !prev.finished)) showWinner();
}

function handleAction(a) {
  if (a.type === 'judge' && a.outcome === 'incorrect') {
    playCatAnimation(a.teamIndex);
  }
}

function playCatAnimation(teamIndex) {
  vibrate([100, 50, 100]);
  const trackPath = document.getElementById(`track-path-${teamIndex}`);
  const mouseEl = document.getElementById(`mouse-${teamIndex}`);
  if (!trackPath || !mouseEl) return;

  const cat = document.createElement('div');
  cat.className = 'cat-attack';
  cat.textContent = '🐈‍⬛';
  trackPath.appendChild(cat);
  
  // Mouse scare animation
  mouseEl.classList.add('mouse-scared');

  // Cat will attack up to where the mouse is
  const mouseLeft = parseInt(mouseEl.style.left || '0', 10);
  cat.style.setProperty('--attack-pos', `${mouseLeft}%`);

  setTimeout(() => {
    cat.remove();
    mouseEl.classList.remove('mouse-scared');
  }, 1500);
}

function render() {
  document.getElementById('game-name').textContent = state.name;
  document.getElementById('code').textContent = state.code;
  
  if (!state.started) {
    tracksContainer.style.display = 'none';
    document.getElementById('waiting-screen').style.display = 'block';
    scoreboardEl.style.opacity = '0.5';
  } else {
    tracksContainer.style.display = '';
    document.getElementById('waiting-screen').style.display = 'none';
    scoreboardEl.style.opacity = '1';
  }

  renderScoreboard();
  renderTracks();
  renderQuestion();
}

function renderScoreboard() {
  scoreboardEl.innerHTML = state.teams.map((t, i) => `
    <div class="team-card ${i === state.currentTeam ? 'active' : ''} ${i === 0 ? 'team-a' : 'team-b'}">
      <div class="team-name">${escapeHtml(t.name)}</div>
      <div class="team-score">${t.score}</div>
      ${i === state.currentTeam ? '<div class="turn-badge">SIRA</div>' : ''}
    </div>`).join('');
}

function renderTracks() {
  const maxSteps = Math.max(5, Math.ceil(state.envelopes.length / 2));
  
  tracksContainer.innerHTML = state.teams.slice(0, 2).map((t, i) => {
    // Current progress percentage
    const progress = Math.min(t.score, maxSteps) / maxSteps * 100;
    
    let cheeseStops = '';
    for (let step = 1; step < maxSteps; step++) {
      const left = (step / maxSteps) * 100;
      cheeseStops += `<div class="cheese-stop" style="position:absolute; left:${left}%; transform:translateX(-50%)">🧀</div>`;
    }

    const cageOpen = t.score >= maxSteps;

    return `
      <div class="track-wrapper">
        <div class="track-header" style="color: var(--team${i === 0 ? 'A' : 'B'})">${escapeHtml(t.name)}</div>
        <div class="track-path" id="track-path-${i}">
          <div class="track-line"></div>
          
          <div class="cheese-stop" style="position:absolute; left:0; transform:translateX(-50%); opacity:0;"></div>
          ${cheeseStops}
          
          <div class="cage-stop ${cageOpen ? 'open' : ''}" style="position:absolute; left:100%; transform:translateX(-50%)">
            ${cageOpen ? '🐭' : '🐭'}
          </div>

          <div class="mouse-char" id="mouse-${i}" style="left: ${progress}%">${MOUSE_EMOJIS[i] || '🐭'}</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderQuestion() {
  if (state.lastOpened != null) {
    const env = state.envelopes[state.lastOpened];
    questionImg.src = env.imageId ? `/api/images/${env.imageId}` : '';
    questionImg.style.display = env.imageId ? 'block' : 'none';
    if (!env.imageId) {
      questionImg.parentElement.innerHTML = '<div style="font-size:40px; padding:40px; color:var(--muted);">Görsel Yok</div>';
    }
    questionOverlay.hidden = false;
  } else {
    questionOverlay.hidden = true;
  }
}

function showOverlay(icon, title, sub) {
  document.getElementById('overlay-icon').textContent = icon;
  document.getElementById('overlay-title').textContent = title;
  document.getElementById('overlay-sub').textContent = sub || '';
  overlay.hidden = false;
  vibrate(120);
}

document.getElementById('overlay-close').addEventListener('click', () => { 
  overlay.hidden = true; 
  if (state && state.finished) {
    setTimeout(() => {
      roomAction(code, { action: 'reset' }).catch(() => {});
    }, 3000);
  }
});

function showWinner() {
  const sorted = [...state.teams].sort((a, b) => b.score - a.score);
  const tie = sorted.length > 1 && sorted[0].score === sorted[1].score;
  showOverlay(
    tie ? '🤝' : '🏆',
    tie ? 'Berabere!' : `${sorted[0].name} kazandı!`,
    tie ? `Skor: ${sorted[0].score} — ${sorted[1].score}` : `${sorted[0].name} arkadaşını kurtardı!`
  );
  if (!tie && window.confetti) {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } }), 500);
  }
}

function onNotFound() {
  document.body.innerHTML = '<div class="fatal">Oyun bulunamadı. Lütfen kodu kontrol et.</div>';
}

pollRoom(code, onState, onNotFound);
