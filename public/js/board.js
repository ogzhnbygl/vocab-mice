const code = codeFromPath();
const tracksContainer = document.getElementById('tracks-container');
const scoreboardEl = document.getElementById('scoreboard');
const overlay = document.getElementById('overlay');
const questionOverlay = document.getElementById('question-overlay');
const questionImg = document.getElementById('question-img');

let state = null;
let lastSeq = null;
let animationRequests = {};

function showSpeechBubble(parentEl, text, duration = 2000) {
  let bubble = parentEl.querySelector('.speech-bubble');
  if (bubble) bubble.remove();

  bubble = document.createElement('div');
  bubble.className = 'speech-bubble';
  bubble.textContent = text;
  parentEl.appendChild(bubble);
  
  bubble.offsetHeight; // force reflow
  bubble.classList.add('show');
  
  setTimeout(() => {
    if (bubble.parentElement) {
      bubble.classList.remove('show');
      setTimeout(() => {
        if (bubble.parentElement) bubble.remove();
      }, 300);
    }
  }, duration);
}

function animateMouseTo(i, mouseEl, targetLeft, onComplete) {
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
    } else if (onComplete) {
      onComplete();
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

async function playCatAnimation(teamIndex) {
  vibrate([100, 50, 100]);
  const trackPath = document.getElementById(`track-path-${teamIndex}`);
  const mouseEl = document.getElementById(`mouse-${teamIndex}`);
  if (!trackPath || !mouseEl) return;

  if (animationRequests[teamIndex]) {
    cancelAnimationFrame(animationRequests[teamIndex]);
    animationRequests[teamIndex] = null;
  }

  const startLeft = parseFloat(mouseEl.style.left || '0');
  const escapeLeft = Math.max(0, startLeft - 20);
  const escapeY = Math.sin((escapeLeft / 100) * Math.PI * 4) * 40;
  
  const cat = document.createElement('div');
  cat.className = 'cat-chaser';
  cat.textContent = '🐈‍⬛';
  cat.style.position = 'absolute';
  cat.style.fontSize = '60px';
  cat.style.zIndex = '15';
  cat.style.left = `${escapeLeft + 70}%`;
  cat.style.top = `calc(50% + ${escapeY}%)`;
  cat.style.transform = 'translate(-50%, -50%) scaleX(-1)'; // cat faces left usually, but scaleX ensures orientation
  trackPath.appendChild(cat);
  
  showSpeechBubble(mouseEl, '😱', 800);
  const mouseImg = mouseEl.querySelector('img');
  mouseEl.style.transition = 'transform 0.2s';
  mouseEl.style.transform = 'translate(-50%, -50%) scale(1.2)';
  
  await new Promise(r => setTimeout(r, 400));
  
  mouseImg.style.transition = 'transform 0.1s';
  mouseImg.style.transform = 'scaleX(-1)';
  
  mouseEl.style.transition = 'left 0.4s ease-out, top 0.4s ease-out';
  mouseEl.style.left = `${escapeLeft}%`;
  mouseEl.style.top = `calc(50% + ${escapeY}%)`;
  
  cat.offsetHeight; // force reflow
  cat.style.transition = 'left 1s linear';
  cat.style.left = `${escapeLeft - 30}%`;
  
  await new Promise(r => setTimeout(r, 550));
  
  mouseEl.style.transition = 'top 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.6s ease';
  mouseEl.style.top = `calc(50% + ${escapeY - 50}%)`;
  mouseEl.style.transform = 'translate(-50%, -50%) rotate(360deg)';
  
  await new Promise(r => setTimeout(r, 300));
  
  mouseEl.style.transition = 'top 0.3s cubic-bezier(0.8, 0.2, 1, 0.2)';
  mouseEl.style.top = `calc(50% + ${escapeY}%)`;
  
  await new Promise(r => setTimeout(r, 450));
  
  cat.remove();
  mouseImg.style.transform = 'scaleX(1)';
  mouseEl.style.transform = 'translate(-50%, -50%) rotate(0deg)';
  showSpeechBubble(mouseEl, 'Phew! 😅', 1500);
  
  const startY = Math.sin((startLeft / 100) * Math.PI * 4) * 40;
  mouseEl.style.transition = 'left 0.8s ease-in-out, top 0.8s ease-in-out';
  mouseEl.style.left = `${startLeft}%`;
  mouseEl.style.top = `calc(50% + ${startY}%)`;
  
  await new Promise(r => setTimeout(r, 800));
  
  mouseEl.style.transition = ''; 
  const cageEl = document.getElementById(`cage-${teamIndex}`);
  if (cageEl) showSpeechBubble(cageEl, 'Help me!!', 2500);
}

async function playWinAnimation(teamIndex, heroEl, cageEl) {
  const friendImg = cageEl.querySelector('img');
  
  cageEl.classList.add('open');
  showSpeechBubble(cageEl, 'Thank you!! ❤️', 2000);
  
  await new Promise(r => setTimeout(r, 800));
  
  heroEl.style.transition = 'left 0.6s ease-out, top 0.6s ease-out';
  heroEl.style.left = 'calc(100% - 80px)';
  heroEl.style.top = '50%';
  
  if (friendImg) {
    friendImg.style.transition = 'transform 0.6s ease-out';
    friendImg.style.transform = 'translateX(-60px) scaleX(-1)';
  }
  
  await new Promise(r => setTimeout(r, 600));
  
  const heart = document.createElement('div');
  heart.className = 'win-heart';
  heart.textContent = '❤️';
  heart.style.position = 'absolute';
  heart.style.left = 'calc(100% - 40px)';
  heart.style.top = '40%';
  heart.style.fontSize = '40px';
  heart.style.transform = 'translate(-50%, -50%) scale(0)';
  heart.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  heart.style.zIndex = '20';
  document.getElementById(`track-path-${teamIndex}`).appendChild(heart);
  
  heart.offsetHeight; // force reflow
  heart.style.transform = 'translate(-50%, -50%) scale(1)';
  
  heroEl.classList.add('win-jump');
  if (friendImg) friendImg.classList.add('win-jump');
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
    const targetLeft = Math.min(t.score, maxSteps) / maxSteps * 100;
    const isMyTurn = (i === state.currentTeam && state.lastOpened == null && !state.finished);

    const mouseEl = document.getElementById(`mouse-${i}`);
    const cageEl = document.getElementById(`cage-${i}`);

    function updateCheeses(isImmediate = false) {
      let ateJustNow = false;
      for (let step = 1; step < maxSteps; step++) {
        const cheeseEl = document.getElementById(`cheese-${i}-${step}`);
        if (cheeseEl) {
          const eaten = t.score >= step;
          if (eaten && cheeseEl.style.opacity !== "0" && cheeseEl.style.opacity !== "") ateJustNow = true;
          cheeseEl.style.transform = `translate(-50%, -50%) scale(${eaten ? 0 : 1})`;
          cheeseEl.style.opacity = eaten ? 0 : 1;
        }
      }
      
      if (!isImmediate && ateJustNow && t.score < maxSteps) {
        const words = ['Yummy!', 'Delish!', 'Tasty!'];
        const word = words[Math.floor(Math.random() * words.length)];
        showSpeechBubble(mouseEl, word);
      }
      
      if (t.score >= maxSteps) {
        if (cageEl && !cageEl.classList.contains('open')) {
          if (isImmediate) {
            cageEl.classList.add('open');
            if (mouseEl) {
              mouseEl.style.left = 'calc(100% - 80px)';
              mouseEl.style.top = '50%';
              mouseEl.classList.add('win-jump');
            }
            const friendImg = cageEl.querySelector('img');
            if (friendImg) {
              friendImg.style.transform = 'translateX(-60px) scaleX(-1)';
              friendImg.classList.add('win-jump');
            }
            
            const heart = document.createElement('div');
            heart.className = 'win-heart';
            heart.textContent = '❤️';
            heart.style.position = 'absolute';
            heart.style.left = 'calc(100% - 40px)';
            heart.style.top = '40%';
            heart.style.fontSize = '40px';
            heart.style.transform = 'translate(-50%, -50%) scale(1)';
            heart.style.zIndex = '20';
            document.getElementById(`track-path-${i}`).appendChild(heart);
          } else {
            playWinAnimation(i, mouseEl, cageEl);
          }
        }
      } else {
        if (cageEl) {
           cageEl.classList.remove('open');
           const friendImg = cageEl.querySelector('img');
           if (friendImg) {
              friendImg.style.transform = 'scaleX(-1)';
              friendImg.classList.remove('win-jump');
           }
        }
        if (mouseEl) mouseEl.classList.remove('win-jump');
        document.getElementById(`track-path-${i}`).querySelectorAll('.win-heart').forEach(e => e.remove());
      }
    }

    if (mouseEl) {
      if (isMyTurn) mouseEl.classList.add('clickable-mouse');
      else mouseEl.classList.remove('clickable-mouse');
      mouseEl.style.pointerEvents = isMyTurn ? 'auto' : 'none';

      const currentTarget = parseFloat(mouseEl.getAttribute('data-target'));
      if (isNaN(currentTarget) || currentTarget !== targetLeft) {
         mouseEl.setAttribute('data-target', targetLeft);
         animateMouseTo(i, mouseEl, targetLeft, () => updateCheeses(false));
         if (isNaN(currentTarget)) updateCheeses(true); 
      } else {
         updateCheeses(true);
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
