/* featured.js – loads destination data from the back‑end API and renders the featured cards */

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('featured-destinations');

  // Fetch data from backend API (port 4000 if frontend is on 3000, or relative /api)
  const apiUrl = (window.location.port === '3000') ? 'http://localhost:4000/api/destinations' : '/api/destinations';
  fetch(apiUrl)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      window.allDestinations = data; // expose globally for search filtering
      if (container) render(data);
    })
    .catch(err => {
      console.warn('Direct API load failed, trying local proxy / fallback', err);
      const basePath = window.location.pathname.includes('/pages/') ? '../' : '';
      fetch('/api/destinations')
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .catch(() => fetch(basePath + 'data/destinations.json').then(r => r.json()))
        .then(r => r.json())
        .then(data => {
          window.allDestinations = data;
          if (container) render(data);
        })
        .catch(e => console.error('Unable to load destinations', e));
    });

  // Search box – filter the displayed cards as the user types
  const searchInput = document.getElementById('dest-search');
  if (searchInput && container) {
    searchInput.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      const filtered = (window.allDestinations || []).filter(d =>
        d.name.toLowerCase().includes(q) || (d.country && d.country.toLowerCase().includes(q))
      );
      render(filtered);
    });
  }

  function render(destinations) {
    if (!container) return;
    if (!destinations || destinations.length === 0) {
      container.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:56px 16px;color:var(--ink-muted);">
          <p style="font-size:18px;margin-bottom:16px;">No destinations match your criteria.</p>
          <button type="button" class="btn btn-secondary" id="reset-filter-btn" style="cursor:pointer;">Reset filters</button>
        </div>`;
      const resetBtn = container.querySelector('#reset-filter-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          const searchInput = document.getElementById('dest-search');
          if (searchInput) searchInput.value = '';
          document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
          if (window.renderFeatured && window.allDestinations) {
            window.renderFeatured(window.allDestinations);
          }
        });
      }
      return;
    }
    container.innerHTML = destinations.map(createCard).join('');
    // After rendering, attach favorite button and card click listeners
    attachFavoriteHandlers(container);
    attachCardClickHandlers(container);
  }
  window.renderFeatured = render;
  window.createFeaturedCard = createCard;
  window.attachFavoriteHandlers = attachFavoriteHandlers;
  window.attachCardClickHandlers = attachCardClickHandlers;

  function attachCardClickHandlers(rootElement = document) {
    const cards = rootElement.querySelectorAll('.dest-card');
    cards.forEach(card => {
      card.style.cursor = 'pointer';
      let touchMoved = false;
      card.addEventListener('touchstart', () => { touchMoved = false; }, { passive: true });
      card.addEventListener('touchmove', () => { touchMoved = true; }, { passive: true });
      card.addEventListener('click', e => {
        if (touchMoved) return;
        if (e.target.closest('.bookmark-btn') || e.target.closest('a')) return;
        const destId = card.dataset.id;
        if (destId) {
          const basePath = window.location.pathname.includes('/pages/') ? '' : 'pages/';
          window.location.href = `${basePath}destination.html?id=${destId}`;
        }
      });
    });
  }

  function createCard(dest) {
    const cardId = dest.id;
    const budget = dest.budget_category || '$';
    const season = dest.best_travel_season || 'Year‑round';
    const overview = dest.overview || '';
    const rating = dest.rating || 4.9;
    const tagline = dest.tagline || dest.country;
    const basePath = window.location.pathname.includes('/pages/') ? '../' : '';
    const detailsUrl = `${window.location.pathname.includes('/pages/') ? '' : 'pages/'}destination.html?id=${dest.id}`;
    const jpgPath = `${basePath}assets/images/${dest.name.toLowerCase()}.jpg`;
    const svgPath = `${basePath}assets/images/${dest.name.toLowerCase()}.svg`;
    const mediaHtml = `<img src="${jpgPath}" alt="${dest.name}" onerror="this.onerror=null; this.src='${svgPath}';" loading="lazy" style="width:100%;height:100%;object-fit:cover;transition:transform .4s ease;"/>`;
    
    return `
      <article class="dest-card" data-id="${dest.id}">
        <div class="dest-media" style="background:#EFE7DA;position:relative;overflow:hidden;">
          ${mediaHtml}
          <div style="position:absolute;bottom:10px;left:10px;background:rgba(20,38,30,0.75);backdrop-filter:blur(6px);color:#FAF8F5;padding:3px 8px;border-radius:12px;font-size:11.5px;font-weight:600;display:flex;align-items:center;gap:4px;z-index:2;">
            <span style="color:#F59E0B;">★</span> ${rating}
          </div>
          <button type="button" class="bookmark-btn" aria-label="Save ${dest.name} to favorites">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C86D44" stroke-width="1.8"><path d="M6 4h12v17l-6-4-6 4V4z"/></svg>
          </button>
        </div>
        <div class="dest-body">
          <div class="top">
            <h3>${dest.name}</h3>
            <span class="budget-tag">${budget}</span>
          </div>
          <span class="region" style="font-weight:500;">${tagline}</span>
          <p style="margin-top:10px;color:var(--ink-muted);font-size:13.5px;line-height:1.5;">${overview}</p>
          <div class="dest-foot">
            <span class="season-tag">🗓️ ${season}</span>
            <a href="${detailsUrl}" style="font-size:13px;font-weight:600;color:var(--primary);">Explore Guide →</a>
          </div>
        </div>
      </article>`;
  }
function attachFavoriteHandlers(rootElement = document) {
    const buttons = rootElement.querySelectorAll('.bookmark-btn');
    buttons.forEach(btn => {
      // Prevent attaching multiple listeners
      if (btn.dataset.favAttached) return;
      btn.dataset.favAttached = 'true';
      
      const card = btn.closest('.dest-card');
      const destId = card ? card.dataset.id : null;
      if (!destId) return;
      // initial state from localStorage
      const isFav = loadFavorites().includes(destId);
      if (isFav) btn.classList.add('on');
      btn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (loadFavorites().includes(destId)) {
          removeFavorite(destId);
          btn.classList.remove('on');
          btn.setAttribute('aria-pressed', 'false');
        } else {
          saveFavorite(destId);
          btn.classList.add('on');
          btn.setAttribute('aria-pressed', 'true');
        }
      });
    });
  }
});
