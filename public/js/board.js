const code = codeFromPath();
const tracksContainer = document.getElementById('tracks-container');
const scoreboardEl = document.getElementById('scoreboard');
const overlay = document.getElementById('overlay');
const questionOverlay = document.getElementById('question-overlay');
const questionImg = document.getElementById('question-img');

let state = null;
let lastSeq = null;
let animationRequests = {};

function animateMouseTo(i, mouseEl, targetLeft) {
  if (animationRequests[i]) cancelAnimationFrame(animationRequests[i]);
  
  const startLeft = parseFloat(mouseEl.style.left) || 0;
  const duration = 1000;
  const startTime = performance.now();
  
  function step(time) {
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    
    const currentLeft = startLeft + (targetLeft - startLeft) * ease;
    const currentY = Math.sin((currentLeft / 100) * Math.PI * 4) * 40;
    
    mouseEl.style.left = `${currentLeft}%`;
    mouseEl.style.top = `calc(50% + ${currentY}%)`;
    
    if (progress < 1) {
      animationRequests[i] = requestAnimationFrame(step);
    }
  }
  animationRequests[i] = requestAnimationFrame(step);
}

const MOUSE_EMOJIS = ['🐁', '🐁'];

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

let currentMaxSteps = 0;

function renderTracks() {
  const maxSteps = state.pathLength || 5;
  
  if (tracksContainer.children.length === 0 || currentMaxSteps !== maxSteps) {
    currentMaxSteps = maxSteps;
    tracksContainer.innerHTML = state.teams.slice(0, 2).map((t, i) => {
      let cheeseStops = '';
      for (let step = 1; step < maxSteps; step++) {
        const left = (step / maxSteps) * 100;
        const yOffset = Math.sin((left / 100) * Math.PI * 4) * 40; // percent
        cheeseStops += `<div id="cheese-${i}-${step}" class="cheese-stop" style="position:absolute; left:${left}%; top: calc(50% + ${yOffset}%); transform:translate(-50%, -50%) scale(1); opacity: 1; transition: all 0.5s ease; z-index:1;">
          <img src="/img/cheese.svg" alt="Cheese">
        </div>`;
      }

      let pathD = 'M 0 50';
      for(let x = 1; x <= 100; x++) {
        const y = 50 + Math.sin((x / 100) * Math.PI * 4) * 40;
        pathD += ` L ${x} ${y}`;
      }

      return `
        <div class="track-wrapper">
          <div class="track-header" style="color: var(--team${i === 0 ? 'A' : 'B'})">${escapeHtml(t.name)}</div>
          <div class="track-path" id="track-path-${i}">
            <svg width="100%" height="100%" style="position:absolute; top:0; left:0; z-index:0; overflow:visible;" preserveAspectRatio="none" viewBox="0 0 100 100">
              <path d="${pathD}" fill="none" stroke="var(--line)" stroke-width="4" stroke-dasharray="8 8" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            
            ${cheeseStops}
            
            <div id="cage-${i}" class="cage-stop" style="position:absolute; left:100%; top:50%; transform:translate(-50%, -50%); z-index:2;">
              <img src="/img/mouse-${i === 0 ? 'white' : 'black'}.svg" alt="Mouse">
            </div>

            <div class="mouse-char" id="mouse-${i}" 
                 style="left: 0%; top: 50%; transform: translate(-50%, -50%);"
                 onclick="onMouseClick(event)">
               <img src="/img/mouse-${i === 0 ? 'white' : 'black'}.svg" alt="Mouse">
            </div>
          </div>
        </div>
      `;
    }).join('');
    // Force reflow
    tracksContainer.offsetHeight;
  }

  // Update DOM smartly
  state.teams.slice(0, 2).forEach((t, i) => {
    const progress = Math.min(t.score, maxSteps) / maxSteps * 100;
    const isMyTurn = (i === state.currentTeam && state.lastOpened == null && !state.finished);

    const mouseEl = document.getElementById(`mouse-${i}`);
    if (mouseEl) {
      if (isMyTurn) mouseEl.classList.add('clickable-mouse');
      else mouseEl.classList.remove('clickable-mouse');
      mouseEl.style.pointerEvents = isMyTurn ? 'auto' : 'none';

      const currentTarget = parseFloat(mouseEl.getAttribute('data-target'));
      if (isNaN(currentTarget) || currentTarget !== progress) {
         mouseEl.setAttribute('data-target', progress);
         animateMouseTo(i, mouseEl, progress);
      }
    }

    const cageEl = document.getElementById(`cage-${i}`);
    if (cageEl) {
      if (t.score >= maxSteps) cageEl.classList.add('open');
      else cageEl.classList.remove('open');
    }

    for (let step = 1; step < maxSteps; step++) {
      const cheeseEl = document.getElementById(`cheese-${i}-${step}`);
      if (cheeseEl) {
        const eaten = t.score >= step;
        cheeseEl.style.transform = `translate(-50%, -50%) scale(${eaten ? 0 : 1})`;
        cheeseEl.style.opacity = eaten ? 0 : 1;
      }
    }
  });
}

window.onMouseClick = (e) => {
  e.preventDefault();
  roomAction(code, { action: 'open-next' }).catch(() => {});
};

function renderQuestion() {
  if (state.lastOpened != null) {
    const env = state.questions[state.lastOpened];
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
