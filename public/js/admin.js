const $ = (sel) => document.querySelector(sel);

let games = [];
let images = [];
let editingId = null;
let questions = [];
let currentUser = null;

// Auth Check
api('GET', '/api/auth/me').then(res => {
  if (!res.user) window.location.href = '/login.html';
  else {
    currentUser = res.user;
    document.getElementById('user-info').textContent = `Hoş geldin, ${currentUser.name}`;
    loadGames();
    loadImages();
  }
}).catch(() => window.location.href = '/login.html');

document.getElementById('logout-btn').addEventListener('click', () => {
  api('POST', '/api/auth/logout').then(() => window.location.href = '/login.html');
});

const gamesList = $('#games-list');
const imagesGrid = $('#images-grid');
const editor = $('#editor');
const questionList = $('#question-list');
const success = $('#success');

function defaultQuestions(n) {
  return Array.from({ length: n }, () => ({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
    type: 'image', imageId: null, points: 100,
  }));
}

// ---------- veri yükleme ----------
async function loadGames() {
  games = await api('GET', '/api/games');
  renderGames();
}
async function loadImages() {
  images = await api('GET', '/api/images');
  renderImages();
  if (!editor.classList.contains('hidden')) renderQuestions();
}

// ---------- oyun listesi ----------
function renderGames() {
  if (games.length === 0) {
    gamesList.innerHTML = '<p class="muted">Henüz oyun yok. "＋ Yeni Oyun" ile başla.</p>';
    return;
  }
  gamesList.innerHTML = games.map((g) => `
    <div class="game-card">
      <div class="gname">${escapeHtml(g.name)}</div>
      <div class="gcode">${g.code}</div>
      <div class="muted" style="font-size:13px;">Havuz: ${g.questionCount} soru | Hedef: ${g.pathLength || 5} adım</div>
      <div class="actions">
        <a class="btn btn-sm btn-board" href="/board/${g.code}" target="_blank">Tahta</a>
        <a class="btn btn-sm btn-moderate" href="/moderate/${g.code}" target="_blank">Moderatör</a>
        <button class="btn btn-sm" data-copy="${g.code}">Kopyala</button>
        <button class="btn btn-sm" data-edit="${g.id}">Düzenle</button>
        <button class="btn btn-sm btn-danger" data-del="${g.id}">Sil</button>
      </div>
    </div>`).join('');
}

gamesList.addEventListener('click', (e) => {
  const copy = e.target.closest('[data-copy]');
  if (copy) { navigator.clipboard?.writeText(copy.dataset.copy); copy.textContent = 'Kopyalandı ✓'; setTimeout(() => copy.textContent = 'Kopyala', 1200); return; }
  const edit = e.target.closest('[data-edit]');
  if (edit) {
    const id = edit.dataset.edit;
    api('GET', '/api/games/' + id).then(fullGame => openEditor(fullGame)).catch(e => alert('Oyun yüklenemedi.'));
    return;
  }
  const del = e.target.closest('[data-del]');
  if (del) {
    const g = games.find((x) => x.id === del.dataset.del);
    if (confirm(`"${g.name}" oyununu silmek istediğine emin misin?`)) {
      api('DELETE', '/api/games/' + g.id).then(loadGames);
    }
  }
});

// ---------- görseller ----------
function renderImages() {
  if (images.length === 0) {
    imagesGrid.innerHTML = '<p class="muted">Henüz görsel yok.</p>';
    return;
  }
  imagesGrid.innerHTML = images.map((img) => `
    <div class="img-tile" title="${escapeHtml(img.originalName)}">
      <img src="/api/images/${img.id}" alt="${escapeHtml(img.originalName)}" loading="lazy">
      <button class="del" data-img-del="${img.id}" title="Sil">✕</button>
    </div>`).join('');
}

imagesGrid.addEventListener('click', (e) => {
  const del = e.target.closest('[data-img-del]');
  if (del) {
    if (confirm('Bu görseli silmek istediğine emin misin?')) {
      api('DELETE', '/api/images/' + del.dataset.imgDel).then(loadImages);
    }
  }
});

// Görseli oku → gerekirse küçült → base64 data URL (Vercel gövde limitine takılmamak için)
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error('okunamadı'));
    fr.readAsDataURL(file);
  });
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('görsel yüklenemedi'));
    img.src = src;
  });
}
async function fileToUploadDataUrl(file) {
  const TARGET_SIZE = 1200; // Akıllı tahtalarda bulanıklaşmaması için ideal çözünürlük
  const QUALITY = 0.85; // %85 kalite
  const dataUrl = await readFileAsDataURL(file);
  
  if (file.type === 'image/svg+xml') return dataUrl; // SVG'leri doğrudan geçir
  
  const img = await loadImage(dataUrl);
  
  // Görselin en kısa kenarını bul (1:1 kırpma için)
  const minDim = Math.min(img.width, img.height);
  
  // Merkezden kırpmak için X ve Y ofsetleri
  const cropX = (img.width - minDim) / 2;
  const cropY = (img.height - minDim) / 2;
  
  // Çıktı boyutunu belirle (Görsel zaten 800'den küçükse kendi boyutunda kalsın)
  const finalSize = Math.min(minDim, TARGET_SIZE);
  
  const canvas = document.createElement('canvas');
  canvas.width = finalSize;
  canvas.height = finalSize;
  
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; 
  ctx.fillRect(0, 0, finalSize, finalSize);
  
  // img'nin kırpılan alanını alıp, canvas'ın tamamına (finalSize x finalSize) çiz
  ctx.drawImage(img, cropX, cropY, minDim, minDim, 0, 0, finalSize, finalSize);
  
  return canvas.toDataURL('image/jpeg', QUALITY);
}

async function uploadFiles(fileList) {
  const results = [];
  for (const file of fileList) {
    try {
      const dataUrl = await fileToUploadDataUrl(file);
      const r = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, originalName: file.name }),
      });
      if (!r.ok) {
        let msg = 'Yükleme hatası';
        try { msg = (await r.json()).message || (await r.json()).error || msg; } catch { /* yut */ }
        alert(msg);
        continue;
      }
      results.push(await r.json());
    } catch (e) {
      alert('Görsel işlenemedi: ' + (e.message || file.name));
    }
  }
  return results;
}

const imageInput = $('#image-input');
imageInput.addEventListener('change', async () => {
  if (imageInput.files.length) {
    await uploadFiles(imageInput.files);
    imageInput.value = '';
    await loadImages();
  }
});
$('#upload-drop').addEventListener('dragover', (e) => e.preventDefault());
$('#upload-drop').addEventListener('drop', async (e) => {
  e.preventDefault();
  if (e.dataTransfer.files.length) {
    await uploadFiles(e.dataTransfer.files);
    await loadImages();
  }
});

// ---------- zarf düzenleyici ----------
function renderQuestions() {
  questionList.innerHTML = '';
  questions.forEach((env, i) => {
    const row = document.createElement('div');
    row.className = 'qst-row';
    row.innerHTML = `
      <div class="qst-index">${i + 1}</div>
      <div class="qst-picker" data-i="${i}">
        ${env.imageId ? `
          <div class="thumb qst-pick-btn" data-i="${i}" style="border-color:var(--ok);" title="Değiştir">
            <img src="/api/images/${env.imageId}" alt="">
          </div>
        ` : `
          <button type="button" class="btn btn-sm btn-primary qst-pick-btn" data-i="${i}">🖼️ Soru Görseli Seç</button>
        `}
      </div>`;
    questionList.appendChild(row);
  });
}

let pickingForQuestion = null;

questionList.addEventListener('click', (e) => {
  const pickBtn = e.target.closest('.qst-pick-btn');
  if (pickBtn) {
    pickingForQuestion = +pickBtn.dataset.i;
    renderModalImages();
    $('#image-modal').classList.remove('hidden');
  }
});

// Modal işlemleri
$('#close-modal').addEventListener('click', () => $('#image-modal').classList.add('hidden'));

function renderModalImages() {
  const grid = $('#modal-images-grid');
  if (images.length === 0) {
    grid.innerHTML = '<p class="muted">Galeri boş. Yeni görsel yükleyin.</p>';
    return;
  }
  grid.innerHTML = images.map((img) => `
    <div class="img-tile" data-img="${img.id}" style="cursor:pointer;" title="${escapeHtml(img.originalName)}">
      <img src="/api/images/${img.id}" alt="">
    </div>`).join('');
}

$('#modal-images-grid').addEventListener('click', (e) => {
  const tile = e.target.closest('.img-tile[data-img]');
  if (tile && pickingForQuestion !== null) {
    questions[pickingForQuestion].imageId = tile.dataset.img;
    questions[pickingForQuestion].type = 'image';
    renderQuestions();
    $('#image-modal').classList.add('hidden');
  }
});

$('#modal-image-input').addEventListener('change', async (e) => {
  if (e.target.files.length) {
    const created = await uploadFiles(e.target.files);
    e.target.value = '';
    await loadImages();
    if (pickingForQuestion !== null && created.length) {
      questions[pickingForQuestion].imageId = created[0].id;
      questions[pickingForQuestion].type = 'image';
      renderQuestions();
      $('#image-modal').classList.add('hidden');
    } else {
      renderModalImages();
    }
  }
});

// ---------- editör aç/kapat ----------
function openEditor(game) {
  editingId = game ? game.id : null;
  $('#editor-title').textContent = game ? 'Oyunu Düzenle' : 'Yeni Oyun';
  $('#game-name-input').value = game ? game.name : '';
  $('#team-a-name').value = game && game.teams[0] ? game.teams[0].name : 'Grup A';
  $('#team-b-name').value = game && game.teams[1] ? game.teams[1].name : 'Grup B';
  $('#question-count').value = game ? game.questionCount : 12;
  $('#path-length').value = game ? (game.pathLength || 5) : 5;
  questions = game ? JSON.parse(JSON.stringify(game.questions)) : defaultQuestions(12);
  $('#games-section').classList.add('hidden');
  $('#images-section').classList.add('hidden');
  success.classList.add('hidden');
  editor.classList.remove('hidden');
  renderQuestions();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeEditor() {
  switchTab('games');
}

$('#new-game').addEventListener('click', () => openEditor(null));
$('#cancel-edit').addEventListener('click', closeEditor);
$('#success-done').addEventListener('click', closeEditor);

$('#question-count').addEventListener('change', () => {
  const n = Math.min(50, Math.max(2, Number($('#question-count').value) || 12));
  $('#question-count').value = n;
  while (questions.length < n) questions.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()), type: 'image', imageId: null, points: 1 });
  questions.length = n;
  renderQuestions();
});

$('#save-game').addEventListener('click', async () => {
  const payload = {
    name: $('#game-name-input').value.trim() || 'Yeni Oyun',
    teams: [
      { name: $('#team-a-name').value.trim() || 'Grup A' },
      { name: $('#team-b-name').value.trim() || 'Grup B' },
    ],
    questionCount: questions.length,
    pathLength: parseInt($('#path-length').value, 10) || 5,
    questions: questions.map((e) => ({ id: e.id, type: e.type, imageId: e.imageId, points: 1 })),
  };
  let game;
  if (editingId) game = await api('PUT', '/api/games/' + editingId, payload);
  else game = await api('POST', '/api/games', payload);
  editor.classList.add('hidden');
  await loadGames();
  showSuccess(game);
});

function showSuccess(game) {
  success.classList.remove('hidden');
  $('#success-code').textContent = game.code;
  $('#success-board').href = `${location.origin}/board/${game.code}`;
  $('#success-moderate').href = `${location.origin}/moderate/${game.code}`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$('#copy-code').addEventListener('click', () => {
  navigator.clipboard?.writeText($('#success-code').textContent);
  $('#copy-code').textContent = 'Kopyalandı ✓';
  setTimeout(() => $('#copy-code').textContent = '📋 Kodu Kopyala', 1200);
});

// ---------- sekmeler ----------
$('#tab-games').addEventListener('click', () => switchTab('games'));
$('#tab-images').addEventListener('click', () => switchTab('images'));
function switchTab(tab) {
  $('#tab-games').classList.toggle('active', tab === 'games');
  $('#tab-images').classList.toggle('active', tab === 'images');
  $('#games-section').classList.toggle('hidden', tab !== 'games');
  $('#images-section').classList.toggle('hidden', tab !== 'images');
  editor.classList.add('hidden');
  success.classList.add('hidden');
}

// ---------- başlat ----------
// loadGames(); and loadImages(); are now called after auth check

