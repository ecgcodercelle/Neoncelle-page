/* ==========================================================================
   NEON CELLE — LIFEPLAN & EVENTS LOGIK (REGISTRATION & GOLD LOOK) — TEIL 1
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const MONTHS_LONG  = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const MONTHS_SHORT = ['JAN','FEB','MÄR','APR','MAI','JUN','JUL','AUG','SEP','OKT','NOV','DEZ'];
  const CURRENT_YEAR = new Date().getFullYear();

  let events = [];
  let lastJSONString = '';
  let countdownInterval = null;
  let monthGroups = [];
  let currentMonthIdx = 0;

  // ─────────────────────────────
  // ESCAPE (SCHUTZ GEGEN HTML-INJEKTION)
  // ─────────────────────────────
  function esc(str) {
    return String(str || '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  // ─────────────────────────────
  // SINGLE SOURCE OF TRUTH: DATE PARSER
  // ─────────────────────────────
  function getEventDate(ev) {
    if (!ev?.date) return null;
    const d = new Date(ev.date);
    return isNaN(d.getTime()) ? null : d;
  }

  // ─────────────────────────────
  // MONATS-GRUPPEN (NIMMT ALLE EVENTS AUS TERMINE.JSON AUF)
  // ─────────────────────────────
  function computeMonthGroups(eventList) {
    const validEvents = eventList.filter(ev => {
      return getEventDate(ev) !== null;
    });

    const map = {};
    validEvents.forEach(ev => {
      const d = getEventDate(ev);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!map[key]) map[key] = { month: d.getMonth(), year: d.getFullYear(), events: [] };
      map[key].events.push(ev);
    });

    return Object.values(map).sort((a, b) => (a.year - b.year) || (a.month - b.month));
  }
  // ─────────────────────────────
  // LIVE FETCH MECHANIK VOM NODE.JS SERVER — TEIL 2
  // ─────────────────────────────
  async function loadData() {
    try {
      console.log("[DEBUG] Hole frische Event-Daten von der Schnittstelle...");
      const res = await fetch(API_BASE + '?action=events_list&t=' + Date.now());
      const seed = res.ok ? await res.json() : [];
      events = Array.isArray(seed) ? seed : [];
      console.log("[DEBUG] Erfolgreich vom Server geladen:", events);
    } catch (e) {
      console.error("[DEBUG] Fehler beim Server-Abruf:", e);
      events = [];
    }

    events.sort((a, b) => getEventDate(a) - getEventDate(b));

    const newJSON = JSON.stringify(events);
    if (newJSON === lastJSONString) return;
    lastJSONString = newJSON;

    monthGroups = computeMonthGroups(events);
    console.log("[DEBUG] Berechnete Gruppen im Ladevorgang:", monthGroups);

    const now = new Date();
    let passenderMonatIdx = -1;

    if (monthGroups.length > 0) {
        // 1) Gruppe suchen, die exakt zu Monat/Jahr von HEUTE passt
        passenderMonatIdx = monthGroups.findIndex(
          g => g.year === now.getFullYear() && g.month === now.getMonth()
        );

        // 2) Falls im aktuellen Monat nichts ansteht: nächste ZUKÜNFTIGE Gruppe nehmen
        if (passenderMonatIdx === -1) {
          passenderMonatIdx = monthGroups.findIndex(
            g => g.year > now.getFullYear() ||
                 (g.year === now.getFullYear() && g.month > now.getMonth())
          );
        }
        // Kein Fallback mehr auf vergangene Monate — bleibt -1, wenn nichts Aktuelles/Zukünftiges da ist
    }

    currentMonthIdx = passenderMonatIdx; // kann -1 sein -> "keine kommenden Events"

    const timelineTarget = document.getElementById('eventsTimeline');
    if (timelineTarget) {
        buildZigZagTimeline(timelineTarget);
    }
    
    renderYearOverview();
    setupCountdown();
  }

  // ─────────────────────────────
  // COUPLING: DYNAMISCHE PREVIEW TIMELINE MIT ANMELDE-FEATURES
  // ─────────────────────────────
  function buildZigZagTimeline(targetElement) {
    if (!targetElement) return;
    targetElement.innerHTML = '';

    if (!monthGroups || !monthGroups.length || currentMonthIdx === -1) {
      targetElement.innerHTML = `
        <div class="lp-empty">
          <div class="lp-empty-icon">📅</div>
          <p>Keine kommenden Events eingetragen.</p>
        </div>`;
      return;
    }

    if (currentMonthIdx >= monthGroups.length) currentMonthIdx = monthGroups.length - 1;
    if (currentMonthIdx < 0) currentMonthIdx = 0;

    const group = monthGroups[currentMonthIdx];
    const now = new Date(); 

    const nav = document.createElement('div');
    nav.className = 'plan-month-divider plan-month-nav';
    nav.style.cssText = 'display:flex; justify-content:center; align-items:center; margin-bottom:30px;';
    nav.innerHTML = `
      <div class="plan-month-label" style="text-align:center;">
        <span>${MONTHS_LONG[group.month]}</span>
        <span class="plan-month-year">${group.year}</span>
      </div>
    `;
    targetElement.appendChild(nav);

    const flow = document.createElement('div');
    flow.className = 'plan-flow-preview';

    group.events.forEach((ev, i) => {
      const d = getEventDate(ev);
      if (!d) return;

      const month = MONTHS_SHORT[d.getMonth()];
      const day = String(d.getDate()).padStart(2, '0');
      const isLeft = i % 2 === 0;

      const isPast = d < now;
      const hasLink = ev.link && ev.link.trim() !== "";
      
      const titleHtml = hasLink 
        ? `<a href="${ev.link}" target="_blank" class="preview-title" style="color: var(--accent-pink) !important; text-decoration: underline;">🔗 ${esc(ev.title)}</a>`
        : `<div class="preview-title">${esc(ev.title)}</div>`;

      const registerBanner = hasLink 
        ? `<div style="color: #ffffff; background: var(--accent-pink); font-size: 0.75rem; font-weight: 900; padding: 4px 10px; border-radius: 10px; width: fit-content; margin-bottom: 6px; letter-spacing: 1px; animation: pulseGlow 2s infinite;">ANMELDUNG OFFEN</div>`
        : '';

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
          monthDisplay = (endMonthIdx === d.getMonth()) ? month : `${month}–${MONTHS_SHORT[endMonthIdx]}`;
        }
      }

      const row = document.createElement('div');
      row.className = `plan-row-preview ${isLeft ? 'left' : 'right'}`;

      row.innerHTML = isLeft ? `
        <div class="plan-card-preview ${isPast ? 'past-event' : ''} ${hasLink ? 'registration-active' : ''}" data-type="${ev.type || 'default'}">
          <div class="plan-card-month-p">${monthDisplay}</div>
          <div class="plan-card-day-p">${dayDisplay}</div>
        </div>
        <div class="plan-text-preview">
          ${registerBanner}
          ${titleHtml}
          ${ev.desc ? `<div class="preview-desc">${esc(ev.desc)}</div>` : ''}
          ${ev.time ? `<div class="plan-event-time">⏰ ${ev.time} Uhr</div>` : ''}
        </div>
      ` : `
        <div class="plan-text-preview">
          ${registerBanner}
          ${titleHtml}
          ${ev.desc ? `<div class="preview-desc">${esc(ev.desc)}</div>` : ''}
          ${ev.time ? `<div class="plan-event-time">⏰ ${ev.time} Uhr</div>` : ''}
        </div>
        <div class="plan-card-preview ${isPast ? 'past-event' : ''} ${hasLink ? 'registration-active' : ''}" data-type="${ev.type || 'default'}">
          <div class="plan-card-month-p">${monthDisplay}</div>
          <div class="plan-card-day-p">${dayDisplay}</div>
        </div>
      `;

      flow.appendChild(row);

      const isLast = i === group.events.length - 1;
      if (!isLast) {
        const nextEv = group.events[i + 1];
        const nextD = getEventDate(nextEv);
        
        const currentIsPast = d < now;
        const nextIsPast = nextD && nextD < now;

        let strokeColor = "var(--accent-pink, #DE5D93)";
        
        if (currentIsPast && nextIsPast) {
            strokeColor = "#D7EC2D"; 
        } else if (currentIsPast && !nextIsPast) {
            strokeColor = "url(#goldToPinkGradient)"; 
        }

        const conn = document.createElement('div');
        conn.className = 'plan-curve-preview';
        conn.innerHTML = `
          <svg viewBox="0 0 600 60" preserveAspectRatio="none" fill="none">
            <defs>
              <linearGradient id="goldToPinkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#D7EC2D" />
                <stop offset="100%" stop-color="var(--accent-pink, #DE5D93)" />
              </linearGradient>
            </defs>
            <path d="${isLeft ? 'M 110 5 C 110 55, 490 5, 480 55' : 'M 490 5 C 490 55, 110 5, 110 55'}"
                  stroke="${strokeColor}" stroke-width="3" stroke-linecap="round"/>
          </svg>
        `;
        flow.appendChild(conn);
      }
    });

    const more = document.createElement('div');
    more.style.cssText = 'text-align:right;padding:24px 0;font-weight:900;font-family:var(--font-main);';
    more.innerHTML = `MORE TO COME <span style="color:var(--accent-pink)">!</span>`;
    flow.appendChild(more);

    targetElement.appendChild(flow);
  }
  // ─────────────────────────────
  // COUNTDOWN — TEIL 3
  // ─────────────────────────────
  function setupCountdown() {
    const now = new Date();
    let targetDate;

    const upcoming = events
      .map(ev => ({ ...ev, _date: getEventDate(ev) }))
      .filter(ev => ev._date && ev._date > now)
      .sort((a, b) => a._date - b._date);

    let nextEvent = upcoming.find(ev => ev.type === 'special' || ev.type === 'freizeit');

    const countdown = document.getElementById('countdown');
    const labelEl = document.getElementById('countdown-label');

    if (!nextEvent) {
      if (countdown) countdown.style.display = 'none';
      if (labelEl) labelEl.style.display = 'none';
      return;
    }

    targetDate = nextEvent._date;
    if (labelEl) labelEl.textContent = `Bis: ${nextEvent.title}`;

    function update() {
      const diff = targetDate - new Date();
      if (diff <= 0) return;

      const vals = {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff / 3600000) % 24),
        minutes: Math.floor((diff / 60000) % 60),
        seconds: Math.floor((diff / 1000) % 60)
      };

      for (const k in vals) {
        const el = document.getElementById(k);
        if (el) el.textContent = vals[k];
      }
    }

    clearInterval(countdownInterval);
    countdownInterval = setInterval(update, 1000);
    update();
  }

  // ─────────────────────────────
  // JAHRESÜBERSICHT MECHANIK
  // ─────────────────────────────
  function renderYearOverview() {
    const cardsEl = document.getElementById('monthCards');
    if (!cardsEl) return;

    const now = new Date();
    let year = CURRENT_YEAR;
    const withDates = events
      .map(ev => ({ ...ev, _date: getEventDate(ev) }))
      .filter(ev => ev._date);

    if (!withDates.some(ev => ev._date.getFullYear() === CURRENT_YEAR) && withDates.length) {
      year = withDates.slice().sort((a, b) => a._date - b._date)[0]._date.getFullYear();
    }

    const yearEvents = withDates
      .filter(ev => ev._date.getFullYear() === year)
      .sort((a, b) => a._date - b._date);

    const yearLabelEl = document.querySelector('.year-progress-header .year-label');
    if (yearLabelEl) yearLabelEl.textContent = String(year);

    const countEl = document.getElementById('yearCount');
    if (countEl) countEl.textContent = `${yearEvents.length} Event${yearEvents.length === 1 ? '' : 's'}`;

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);
    const yearSpan = endOfYear - startOfYear;

    const markersEl = document.getElementById('monthMarkers');
    if (markersEl) {
      markersEl.innerHTML = '';
      for (let m = 1; m < 12; m++) {
        const line = document.createElement('div');
        line.className = 'month-line';
        line.style.left = `${(m / 12) * 100}%`;
        markersEl.appendChild(line);
      }

      if (now.getFullYear() === year) {
        const pct = ((now - startOfYear) / yearSpan) * 100;
        const marker = document.createElement('div');
        marker.className = 'today-marker';
        marker.style.left = `${pct}%`;
        markersEl.appendChild(marker);
      }
    }

    const dotsEl = document.getElementById('eventDots');
    if (dotsEl) {
      dotsEl.innerHTML = '';
      yearEvents.forEach(ev => {
        const pct = ((ev._date - startOfYear) / yearSpan) * 100;
        const pin = document.createElement('div');
        pin.className = 'event-pin';
        pin.dataset.type = ev.type || 'default';
        pin.style.left = `${pct}%`;
        const dateStr = ev._date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        pin.innerHTML = `<span class="pin-tooltip">${esc(ev.title)} · ${dateStr}</span>`;
        dotsEl.appendChild(pin);
      });
    }

    cardsEl.innerHTML = '';
    for (let m = 0; m < 12; m++) {
      const monthEvents = yearEvents.filter(ev => ev._date.getMonth() === m);
      const card = document.createElement('div');
      card.className = `month-card${monthEvents.length ? ' has-events' : ''}`;
      card.innerHTML = `
        <div class="month-card-name">${MONTHS_LONG[m]}</div>
        <div class="month-card-count">${monthEvents.length}</div>
        <div class="month-card-label">Event${monthEvents.length === 1 ? '' : 'e'}</div>
        ${monthEvents.length ? `<div class="month-card-events">
          ${monthEvents.slice(0, 3).map(ev => `<div class="month-event-pill">${esc(ev.title)}</div>`).join('')}
          ${monthEvents.length > 3 ? `<div class="month-event-pill">+${monthEvents.length - 3} weitere</div>` : ''}
        </div>` : ''}
      `;
      cardsEl.appendChild(card);
    }
  }

  // Engine starten
  loadData();
});