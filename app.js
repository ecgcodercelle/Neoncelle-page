/* =============================================
   NEON CELLE — app.js (Zentraler Komplett-Fix)
   Galerie + Events-Preview + Navigation
   ============================================= */

// ── 1. GALLERY DATA ────────────────────────────────────
const GALLERY_STORAGE_KEY = 'neonCelleGalleryImages';
let GALLERY_IMAGES = [];
let currentFilter = 'all';
let lightboxImages = [];
let lightboxIndex = 0;

async function loadGalleryImages() {
  const stored = localStorage.getItem(GALLERY_STORAGE_KEY);
  const hasStored = stored !== null;

  if (hasStored) {
    try {
      const parsed = JSON.parse(stored);
      GALLERY_IMAGES = Array.isArray(parsed) ? parsed : [];
      return;
    } catch {
      GALLERY_IMAGES = [];
      return;
    }
  }

  // Noch nie initialisiert -> galerie.json als Start-Datensatz laden
  try {
    const res = await fetch('galerie.json');
    const seed = res.ok ? await res.json() : [];
    GALLERY_IMAGES = Array.isArray(seed) ? seed : [];
  } catch {
    GALLERY_IMAGES = [];
  }
  localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(GALLERY_IMAGES));
}

function renderGallery(filter) {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;

  const filtered = filter === 'all'
    ? GALLERY_IMAGES
    : GALLERY_IMAGES.filter(img => img.filter === filter);

  lightboxImages = filtered;
  grid.innerHTML = '';

  filtered.forEach((img, i) => {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.dataset.index = i;
    item.innerHTML = `
      <img src="${img.src}" alt="Neon Celle Foto" loading="lazy"
           onerror="this.parentElement.style.display='none'" />
      <div class="overlay">🔍</div>`;
    item.addEventListener('click', () => openLightbox(i));
    grid.appendChild(item);
  });
}

// Filter Buttons initialisieren
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderGallery(currentFilter);
  });
});

// ── 2. LIGHTBOX ───────────────────────────────────
function openLightbox(index) {
  lightboxIndex = index;
  const lb = document.getElementById('lightbox');
  if (lb) lb.classList.add('open');
  updateLightboxImage();
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (lb) lb.classList.remove('open');
  document.body.style.overflow = '';
}

function updateLightboxImage() {
  const img = document.getElementById('lightboxImg');
  const counter = document.getElementById('lightboxCounter');
  if (img) img.src = lightboxImages[lightboxIndex]?.src || '';
  if (counter) counter.textContent = `${lightboxIndex + 1} / ${lightboxImages.length}`;
}

document.getElementById('lightboxClose')?.addEventListener('click', closeLightbox);
document.getElementById('lightboxPrev')?.addEventListener('click', () => {
  lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
  updateLightboxImage();
});
document.getElementById('lightboxNext')?.addEventListener('click', () => {
  lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
  updateLightboxImage();
});

// Keyboard Navigation für die Lightbox
document.addEventListener('keydown', (e) => {
  const lb = document.getElementById('lightbox');
  if (!lb?.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') { lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length; updateLightboxImage(); }
  if (e.key === 'ArrowRight') { lightboxIndex = (lightboxIndex + 1) % lightboxImages.length; updateLightboxImage(); }
});

// Schließen durch Klick auf den grauen Hintergrund
document.getElementById('lightbox')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('lightbox')) closeLightbox();
});

// Hilfsfunktion für sicheren Text (Schutz vor HTML-Fehlern)
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// ── 3. EVENTS PREVIEW (Auslesen aus dem Admin-System) ─────────
async function loadEventsPreview() {
  const timeline = document.getElementById('eventsTimeline');
  if (!timeline) return;

  const STORAGE_KEY = 'neonCelleLiveEvents';
  const MONTHS = ['JAN','FEB','MÄR','APR','MAI','JUN','JUL','AUG','SEP','OKT','NOV','DEZ'];

  try {
    // Holt die Live-Daten aus dem Browser-Speicher (Admin-Terminal)
    const stored = localStorage.getItem(STORAGE_KEY);
    const hasStored = stored !== null;
    let events = hasStored ? JSON.parse(stored) : [];
    console.log('[DEBUG] hasStored:', hasStored, 'events:', events);

    // Noch NIE initialisiert (Schlüssel existiert gar nicht)? -> termine.json als Start-Datensatz laden
    // Wurde bewusst alles gelöscht (Schlüssel existiert, ist aber leer), NICHT nachfüllen.
    if (!hasStored) {
      try {
        const res = await fetch('termine.json');
        const seed = res.ok ? await res.json() : [];
        events = Array.isArray(seed) ? seed : [];
      } catch {
        events = [];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    }

    // Chronologisch sortieren und nur die nächsten 3 Events holen
    const upcoming = events.sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0, 3);
    console.log('[DEBUG] upcoming.length:', upcoming.length, upcoming);

    if (upcoming.length === 0) {
      const eventsSection = document.getElementById('events');
      if (eventsSection) eventsSection.style.display = 'none';
      timeline.innerHTML = '';
      return;
    }

    let html = '<div class="plan-flow-preview">';
    upcoming.forEach((ev, i) => {
      const d = new Date(ev.date);
      const month = MONTHS[d.getMonth()];
      const day = String(d.getDate()).padStart(2,'0');
      const isLeft = (i % 2 === 0);

      // ── MEHRTAGE-EVENT: von–bis am Datum anzeigen ──
      let dayDisplay = day;
      let monthDisplay = month;
      let isRange = false;

      if (ev.endDate) {
        const [ey, em, ed] = ev.endDate.split('-').map(Number);
        const endMonthIdx = em - 1;
        const sameDay = d.getFullYear() === ey && d.getMonth() === endMonthIdx && d.getDate() === ed;

        if (!sameDay) {
          isRange = true;
          const endDay = String(ed).padStart(2, '0');
          dayDisplay = `${day}–${endDay}`;
          monthDisplay = (endMonthIdx === d.getMonth()) ? month : `${month}–${MONTHS[endMonthIdx]}`;
        }
      }

      html += `
        <div class="plan-row-preview ${isLeft ? 'left' : 'right'}" style="animation-delay:${i * 0.08}s">
          ${isLeft ? `
            <div class="plan-card-preview">
              <span class="plan-card-month-p">${monthDisplay}</span>
              <span class="plan-card-day-p"${isRange ? ' style="font-size:1rem; white-space:nowrap;"' : ''}>${dayDisplay}</span>
            </div>
            <div class="plan-text-preview" style="text-align: left;">
              <div class="preview-title">${escHtml(ev.title)}</div>
              ${ev.desc ? `<div class="preview-desc" style="font-size:0.8rem; color:var(--text-muted); margin-top:4px; font-family:var(--font-alt);">${escHtml(ev.desc)}</div>` : ''}
              ${ev.time ? `<div style="font-size:0.85rem; color:#00f3ff; font-weight:600; text-transform:none; margin-top:4px;">⏰ ${ev.time} Uhr</div>` : ''}
            </div>
          ` : `
            <div class="plan-text-preview" style="text-align: right;">
              <div class="preview-title">${escHtml(ev.title)}</div>
              ${ev.desc ? `<div class="preview-desc" style="font-size:0.8rem; color:var(--text-muted); margin-top:4px; font-family:var(--font-alt);">${escHtml(ev.desc)}</div>` : ''}
              ${ev.time ? `<div style="font-size:0.85rem; color:#00f3ff; font-weight:600; text-transform:none; margin-top:4px;">⏰ ${ev.time} Uhr</div>` : ''}
            </div>
            <div class="plan-card-preview">
              <span class="plan-card-month-p">${monthDisplay}</span>
              <span class="plan-card-day-p"${isRange ? ' style="font-size:1rem; white-space:nowrap;"' : ''}>${dayDisplay}</span>
            </div>
          `}
        </div>`;

      if (i < upcoming.length - 1) {
        html += `
          <div class="plan-curve-preview">
            <svg viewBox="0 0 600 50" preserveAspectRatio="none" fill="none">
              <path d="${isLeft ? 'M 140 5 C 140 45, 460 5, 460 45' : 'M 460 5 C 460 45, 140 5, 140 45'}" stroke="#DE5D93" stroke-width="2.5" stroke-linecap="round" fill="none"/>
            </svg>
          </div>`;
      }
    });
    html += `<div class="plan-more-preview" style="text-align: right; padding: 20px 0 0; font-size: 1.3rem; font-weight: 900; color: #fff;">MORE TO COME <span style="color:var(--accent-pink)">❗</span></div></div>`;
    console.log('[DEBUG] HTML Länge, die geschrieben wird:', html.length);
    timeline.innerHTML = html;
    console.log('[DEBUG] timeline.innerHTML danach:', timeline.innerHTML.length);

  } catch (error) {
    console.error("Fehler beim Laden der Events-Preview:", error);
    timeline.innerHTML = '<p style="text-align:center; color:var(--accent-pink);">Fehler beim Laden der Event-Vorschau.</p>';
  }
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* =============================================
   START
============================================= */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Galerie laden
    await loadGalleryImages();

    if (document.getElementById("galleryGrid")) {
      renderGallery(currentFilter);
    }

    // Event-Vorschau auf der Startseite laden
    if (document.getElementById("eventsTimeline")) {
      await loadEventsPreview();
    }

  } catch (err) {
    console.error("Fehler beim Initialisieren:", err);
  }
});