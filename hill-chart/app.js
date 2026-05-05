const SHEET_URL = 'https://script.google.com/a/macros/bit.ly/s/AKfycbyZj0kUzg-YYS5Y-8UL9NL-vwDb1KTu5hG2JGLuieuUDPRZHhrECUrxNBAyVLzIF5sApQ/exec';

const W = 700, H = 200, BASELINE = 182, HILL_HEIGHT = 145;
const COLORS = [
  '#1D9E75','#378ADD','#D85A30','#7F77DD',
  '#D4537E','#BA7517','#639922','#E24B4A'
];

let features = [];

// ── Curve ────────────────────────────────────────────
function getY(pct) {
  return BASELINE - Math.sin((pct / 100) * Math.PI) * HILL_HEIGHT;
}

function buildCurve() {
  const d = Array.from({ length: 201 }, (_, i) => {
    const pct = (i / 200) * 100;
    return `${(pct / 100) * W},${getY(pct)}`;
  }).join(' L ');
  document.getElementById('hill-path').setAttribute('d', `M 0,${BASELINE} L ${d}`);
}

// ── Dots ─────────────────────────────────────────────
function renderDots() {
  const ns = 'http://www.w3.org/2000/svg';
  const layer = document.getElementById('dots-layer');
  layer.innerHTML = '';

  features.forEach(f => {
    const x = (f.progress / 100) * W;
    const y = getY(f.progress);

    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', 13);
    circle.setAttribute('fill', f.color);
    circle.setAttribute('opacity', '0.88');

    const label = document.createElementNS(ns, 'text');
    label.setAttribute('x', x);
    label.setAttribute('y', y - 18);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '11');
    label.setAttribute('fill', '#555');
    label.textContent = f.name.length > 13 ? f.name.slice(0, 12) + '…' : f.name;

    const pctText = document.createElementNS(ns, 'text');
    pctText.setAttribute('x', x);
    pctText.setAttribute('y', y + 4);
    pctText.setAttribute('text-anchor', 'middle');
    pctText.setAttribute('font-size', '9');
    pctText.setAttribute('fill', 'white');
    pctText.setAttribute('font-weight', '600');
    pctText.textContent = f.progress + '%';

    [circle, label, pctText].forEach(el => layer.appendChild(el));
  });
}

// ── Table ────────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById('rows');
  tbody.innerHTML = '';

  features.forEach((f, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span class="dot" style="background:${f.color}"></span>${f.name}
      </td>
      <td style="text-align:right">
        <input type="number" min="0" max="100" value="${f.progress}"
               oninput="updateProgress(${i}, +this.value)"/>
      </td>
      <td>
        <input type="range" min="0" max="100" step="1" value="${f.progress}"
               oninput="updateProgress(${i}, +this.value)"/>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateProgress(index, val) {
  features[index].progress = Math.min(100, Math.max(0, val || 0));
  renderTable();
  renderDots();
}

// ── Load from Google Sheet ───────────────────────────
async function loadSheet() {
  const status = document.getElementById('status');
  status.textContent = 'Loading…';

  try {
    const res = await fetch(SHEET_URL);
    const data = await res.json();

    features = data
      .filter(row => row.name && row.progress !== undefined)
      .map((row, i) => ({
        name: row.name,
        progress: Math.min(100, Math.max(0, Number(row.progress))),
        color: COLORS[i % COLORS.length],
      }));

    renderTable();
    renderDots();
    status.textContent = `Loaded ${features.length} features from sheet.`;
  } catch (e) {
    status.textContent = 'Could not load sheet. Check your URL.';
    console.error(e);
  }
}

// ── Stamp to Miro board ──────────────────────────────
async function stampToBoard() {
  const svgEl = document.getElementById('hill');
  const svgString = new XMLSerializer().serializeToString(svgEl);
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  await miro.board.createImage({ url, x: 0, y: 0, width: 700 });
  URL.revokeObjectURL(url);
}

// ── Init ─────────────────────────────────────────────
miro.board.ui.on('icon:click', async () => {
  await miro.board.ui.openPanel({ url: 'index.html' });
});

buildCurve();
loadSheet();
