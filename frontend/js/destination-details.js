/* destination-details.js – loads a single destination based on ?id query param */

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const container = document.getElementById('detail');
  const renderNotFound = () => {
    container.innerHTML = `
      <section style="padding:120px 0 80px; text-align:center;">
        <div class="wrap">
          <span style="font-size:48px;display:block;margin-bottom:16px;">🧭</span>
          <h2 style="font-size:36px;margin-bottom:12px;">Destination Not Found</h2>
          <p style="color:var(--ink-muted);font-size:17px;margin-bottom:28px;max-width:40ch;margin-left:auto;margin-right:auto;">We couldn't find the destination you were looking for. Explore our full directory to find your next journey.</p>
          <a href="explore.html" class="btn btn-primary">Browse All Destinations</a>
        </div>
      </section>`;
  };

  if (!id) {
    renderNotFound();
    return;
  }

  // Helper to get destinations (use already loaded data if available)
  const loadDestinations = () => {
    if (window.allDestinations) {
      return Promise.resolve(window.allDestinations);
    }
    const apiUrl = (window.location.port === '3000') ? 'http://localhost:4000/api/destinations' : '/api/destinations';
    return fetch(apiUrl)
      .then(r => {
        if (!r.ok) throw new Error('API request failed');
        return r.json();
      })
      .catch(() => {
        return fetch('/api/destinations').then(r => r.json());
      })
      .catch(() => {
        return fetch('../data/destinations.json').then(r => r.json());
      })
      .then(data => {
        window.allDestinations = data;
        return data;
      });
  };

  loadDestinations().then(destinations => {
    const dest = destinations.find(d => String(d.id) === id);
    if (!dest) {
      renderNotFound();
      return;
    }
    const jpgPath = `../assets/images/${dest.name.toLowerCase()}.jpg`;
    const svgPath = `../assets/images/${dest.name.toLowerCase()}.svg`;
    const mediaHtml = `<img src="${jpgPath}" alt="${dest.name}" onerror="this.onerror=null; this.src='${svgPath}';" style="width:100%;height:100%;object-fit:cover;box-shadow:0 12px 32px rgba(30,58,47,0.12);"/>`;
    const isFav = typeof loadFavorites === 'function' && loadFavorites().includes(String(dest.id));
    
    const html = `
      <section style="padding:48px 0 64px;">
        <div class="wrap">
          <a href="explore.html" style="font-size:14px;font-weight:600;color:var(--ink-muted);margin-bottom:28px;display:inline-flex;align-items:center;gap:8px;">
            ← Back to Explore
          </a>
          <div class="detail-hero-grid" style="margin-top:16px;">
            <div>
              <div class="dest-media" style="border-radius:20px;overflow:hidden;aspect-ratio:4/3;background:#EFE7DA;position:relative;">
                 ${mediaHtml}
              </div>
            </div>
            <div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                <div class="eyebrow-label">${dest.country}</div>
                <div style="background:rgba(200,109,68,0.12);color:var(--secondary);padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;">
                  ★ ${dest.rating || 4.9} · Highly Rated
                </div>
              </div>
              <h1 style="font-size:clamp(32px, 6vw, 48px);line-height:1.18;margin-bottom:12px;">${dest.name}</h1>
              <p style="color:var(--secondary);font-size:18px;font-weight:500;margin-bottom:20px;">${dest.tagline || ''}</p>
              <p style="color:var(--ink-muted);font-size:16.5px;line-height:28px;">${dest.overview || ''}</p>
              
              <div style="display:flex;gap:12px;margin-top:28px;align-items:center;flex-wrap:wrap;">
                <span class="budget-tag" style="font-size:14px;padding:6px 14px;">💰 ${dest.budget_category || ''} Budget</span>
                <span class="season-tag" style="font-size:14px;padding:6px 14px;">🗓️ Best in ${dest.best_travel_season || ''}</span>
              </div>
              
              <div style="margin-top:24px;display:flex;gap:8px;flex-wrap:wrap;">
                 ${(dest.travel_interests||[]).map(i => `<span class="chip active" style="cursor:default;">${i}</span>`).join('')}
              </div>

              <div class="detail-actions" style="margin-top:36px;display:flex;gap:16px;flex-wrap:wrap;">
                <button type="button" id="detail-fav-btn" class="btn ${isFav ? 'btn-secondary' : 'btn-primary'}" style="cursor:pointer;display:inline-flex;align-items:center;gap:8px;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M6 4h12v17l-6-4-6 4V4z"/></svg>
                  <span>${isFav ? 'Saved in Favorites' : 'Save to Favorites'}</span>
                </button>
                <a href="../index.html#match" class="btn btn-ghost" style="border-color:var(--rule);color:var(--ink);">Match Score Quiz</a>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <section style="background:var(--surface-warm);padding:64px 0;">
        <div class="wrap detail-info-grid">
           <div style="background:var(--surface-card);padding:32px;border-radius:16px;border:1px solid var(--rule);">
              <h2 style="font-size:28px;margin-bottom:20px;color:var(--primary);display:flex;align-items:center;gap:10px;">
                <span>🏛️</span> Top Attractions
              </h2>
              <ul style="list-style:none;color:var(--ink-muted);display:flex;flex-direction:column;gap:14px;font-size:16px;padding:0;">
                ${(dest.attractions||[]).map(a => `<li style="display:flex;align-items:center;gap:10px;"><span style="color:var(--secondary);font-size:18px;">✓</span> <span style="color:var(--ink);font-weight:500;">${a}</span></li>`).join('')}
              </ul>
           </div>
           <div style="background:var(--surface-card);padding:36px;border-radius:16px;border:1px solid var(--rule);">
              <h2 style="font-size:28px;margin-bottom:20px;color:var(--primary);display:flex;align-items:center;gap:10px;">
                <span>🍜</span> Signature Local Food
              </h2>
              <ul style="list-style:none;color:var(--ink-muted);display:flex;flex-direction:column;gap:14px;font-size:16px;padding:0;">
                ${(dest.local_food||[]).map(f => `<li style="display:flex;align-items:center;gap:10px;"><span style="color:var(--secondary);font-size:18px;">•</span> <span style="color:var(--ink);font-weight:500;">${f}</span></li>`).join('')}
              </ul>
           </div>
        </div>
      </section>`;
    container.innerHTML = html;

    const favBtn = document.getElementById('detail-fav-btn');
    if (favBtn) {
      favBtn.addEventListener('click', () => {
        const currentlyFav = loadFavorites().includes(String(dest.id));
        if (currentlyFav) {
          removeFavorite(String(dest.id));
          favBtn.classList.remove('btn-secondary');
          favBtn.classList.add('btn-primary');
          favBtn.querySelector('span').textContent = 'Save to Favorites';
          favBtn.querySelector('svg').setAttribute('fill', 'none');
        } else {
          saveFavorite(String(dest.id));
          favBtn.classList.remove('btn-primary');
          favBtn.classList.add('btn-secondary');
          favBtn.querySelector('span').textContent = 'Saved in Favorites';
          favBtn.querySelector('svg').setAttribute('fill', 'currentColor');
        }
      });
    }
  }).catch(err => {
    console.error('Error loading destination data:', err);
    container.textContent = 'Error loading destination data.';
  });
});
