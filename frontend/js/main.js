// main.js - Ferð logic & interactive mobile/desktop controllers

document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Navigation Drawer Toggle
  const navToggleBtn = document.getElementById('nav-toggle-btn');
  const mobileDrawer = document.getElementById('mobile-nav-drawer');
  if (navToggleBtn && mobileDrawer) {
    const closeDrawer = () => {
      mobileDrawer.classList.remove('open');
      navToggleBtn.classList.remove('open');
      navToggleBtn.setAttribute('aria-expanded', 'false');
    };

    navToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = mobileDrawer.classList.toggle('open');
      navToggleBtn.classList.toggle('open');
      navToggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close drawer when clicking any link inside it
    mobileDrawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeDrawer);
    });

    // Close on outside click or touch on mobile
    document.addEventListener('click', (e) => {
      if (mobileDrawer.classList.contains('open') && !mobileDrawer.contains(e.target) && !navToggleBtn.contains(e.target)) {
        closeDrawer();
      }
    });

    document.addEventListener('touchstart', (e) => {
      if (mobileDrawer.classList.contains('open') && !mobileDrawer.contains(e.target) && !navToggleBtn.contains(e.target)) {
        closeDrawer();
      }
    }, { passive: true });
  }

  // 2. Mobile Bottom Navigation Dock Controller & Active Highlighting
  const bottomBar = document.querySelector('.mobile-bottom-bar');
  if (bottomBar) {
    const navItems = bottomBar.querySelectorAll('.nav-item');
    const currentPath = window.location.pathname;
    const isHome = currentPath.endsWith('/') || currentPath.endsWith('/index.html') || currentPath.endsWith('final') || currentPath.endsWith('final/');

    const setActiveNav = (matchPattern) => {
      navItems.forEach(item => {
        const href = item.getAttribute('href') || '';
        item.classList.toggle('active', href.includes(matchPattern));
      });
    };

    if (isHome) {
      const sections = [
        { id: 'destinations', target: '#destinations' },
        { id: 'match', target: '#match' },
        { id: 'food', target: '#food' }
      ];
      const onScrollUpdate = () => {
        const scrollPos = window.scrollY + 160;
        let activeTarget = '#destinations';
        sections.forEach(sec => {
          const el = document.getElementById(sec.id);
          if (el && el.offsetTop <= scrollPos) {
            activeTarget = sec.target;
          }
        });
        setActiveNav(activeTarget);
      };
      window.addEventListener('scroll', onScrollUpdate, { passive: true });
      onScrollUpdate();
    } else {
      // For subpages (explore, favorites, food-culture, destination, about)
      navItems.forEach(item => {
        const href = item.getAttribute('href') || '';
        const pageTarget = href.split('#')[0].replace(/^\.\.\//, '').replace(/^pages\//, '');
        if (pageTarget && currentPath.includes(pageTarget)) {
          item.classList.add('active');
        }
      });
    }

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
    });
  }

  // 3. Simple filter state handling for budget, season, interests
  let filterState = { budget: null, season: null, interests: [] };

  // Chip click handling
  document.querySelectorAll('.chip').forEach(chip => {
    if (chip.classList.contains('active') && !filterState.interests.includes(chip.textContent.trim())) {
      filterState.interests.push(chip.textContent.trim());
      chip.setAttribute('aria-pressed', 'true');
    }
    chip.addEventListener('click', () => {
      const interest = chip.textContent.trim();
      const idx = filterState.interests.indexOf(interest);
      if (idx === -1) {
        filterState.interests.push(interest);
        chip.classList.add('active');
        chip.setAttribute('aria-pressed', 'true');
      } else {
        filterState.interests.splice(idx, 1);
        chip.classList.remove('active');
        chip.setAttribute('aria-pressed', 'false');
      }
      applyCurrentFilters();
    });
  });

  function applyCurrentFilters() {
    if (!window.allDestinations) return;
    const filtered = typeof applyFilters === 'function' 
        ? applyFilters(window.allDestinations, filterState)
        : window.allDestinations;
    if (typeof window.renderFeatured === 'function') {
      window.renderFeatured(filtered);
    }
  }

  // 4. Search Button & Input Handling with Auto-Scroll to Results & Keyboard Dismissal
  const searchInput = document.getElementById('dest-search');
  const searchBtn = document.getElementById('search-btn');

  const scrollToResults = () => {
    // Dismiss mobile keyboard so full results viewport is immediately visible
    if (searchInput) {
      searchInput.blur();
    }

    const target = document.getElementById('destinations') || document.getElementById('featured-destinations');
    if (target) {
      const header = document.querySelector('header');
      const headerOffset = header ? header.offsetHeight + 18 : 80;
      const elementPosition = target.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth'
      });
    } else {
      const q = searchInput ? searchInput.value.trim() : '';
      const basePath = window.location.pathname.includes('/pages/') ? '' : 'pages/';
      window.location.href = `${basePath}explore.html${q ? '?search=' + encodeURIComponent(q) : ''}#destinations`;
    }
  };

  const handleSearch = () => {
    if (!searchInput) return;
    const q = searchInput.value.toLowerCase().trim();
    if (!window.allDestinations) return;
    const filtered = window.allDestinations.filter(d =>
      !q || d.name.toLowerCase().includes(q) || (d.country && d.country.toLowerCase().includes(q))
    );
    if (typeof window.renderFeatured === 'function') {
      window.renderFeatured(filtered);
    }
  };

  if (searchBtn) {
    searchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleSearch();
      scrollToResults();
    });
  }

  if (searchInput) {
    // Live filter while typing
    searchInput.addEventListener('input', handleSearch);

    // Hitting Enter triggers search, dismisses keyboard, and scrolls to results
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch();
        scrollToResults();
      }
    });
  }

  // Handle URL query ?search= on explore.html or index.html
  const urlParams = new URLSearchParams(window.location.search);
  const querySearch = urlParams.get('search');
  if (querySearch && searchInput) {
    searchInput.value = querySearch;
    const initSearch = () => {
      if (window.allDestinations && typeof window.renderFeatured === 'function') {
        handleSearch();
        setTimeout(scrollToResults, 160);
      } else {
        setTimeout(initSearch, 50);
      }
    };
    initSearch();
  }

  // 5. Segmented buttons logic (touch-friendly on mobile)
  document.querySelectorAll('.segmented button').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.parentElement;
      parent.querySelectorAll('button').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    });
  });

  // 6. Budget slider logic (click + drag + touch with live readout)
  const rangeTrack = document.querySelector('.range-track');
  if (rangeTrack) {
    const thumb = rangeTrack.querySelector('.range-thumb');
    const fill = rangeTrack.querySelector('.range-fill');
    const labels = document.querySelectorAll('.range-labels span');
    let isDragging = false;

    const updateSlider = (clientX) => {
      const rect = rangeTrack.getBoundingClientRect();
      const x = clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));

      if (thumb) thumb.style.left = (percent * 100) + '%';
      if (fill) fill.style.width = (percent * 100) + '%';

      labels.forEach(l => l.classList.remove('active'));

      let budget = '$$';
      if (percent < 0.33) {
        budget = '$';
        if (labels[0]) labels[0].classList.add('active');
      } else if (percent > 0.66) {
        budget = '$$$';
        if (labels[2]) labels[2].classList.add('active');
      } else {
        budget = '$$';
        if (labels[1]) labels[1].classList.add('active');
      }
      filterState.budget = budget;
    };

    // Default mid-range label active
    if (labels[1]) labels[1].classList.add('active');

    rangeTrack.addEventListener('click', e => {
      updateSlider(e.clientX);
    });
    rangeTrack.addEventListener('mousedown', e => {
      isDragging = true;
      updateSlider(e.clientX);
    });
    window.addEventListener('mousemove', e => {
      if (isDragging) updateSlider(e.clientX);
    });
    window.addEventListener('mouseup', () => {
      if (isDragging) isDragging = false;
    });

    rangeTrack.addEventListener('touchstart', e => {
      if (e.touches && e.touches.length) updateSlider(e.touches[0].clientX);
    }, { passive: true });
    rangeTrack.addEventListener('touchmove', e => {
      if (e.touches && e.touches.length) updateSlider(e.touches[0].clientX);
    }, { passive: true });
  }

  // 7. Recommendation match form handling with mobile auto-scroll
  const matchForm = document.querySelector('.match-form');
  if (matchForm) {
    matchForm.addEventListener('submit', function(e){
      e.preventDefault();
      const prefs = { budget: filterState.budget, season: null, interests: filterState.interests, travelType: null, duration: null };
      const typeBtn = document.querySelector('.segmented[aria-label="Travel type"] .active');
      if (typeBtn) prefs.travelType = typeBtn.textContent.trim();
      const durBtn = document.querySelector('.segmented[aria-label="Trip duration"] .active');
      if (durBtn) prefs.duration = durBtn.textContent.trim();
      
      if (typeof window.getRecommendations === 'function' && window.allDestinations) {
        const recs = window.getRecommendations(window.allDestinations, prefs);
        const resultCard = document.querySelector('.result-card');
        if (resultCard && recs.length) {
          const basePath = window.location.pathname.includes('/pages/') ? '' : 'pages/';
          let html = `
            <div class="top-row" style="cursor:pointer;" onclick="window.location.href='${basePath}destination.html?id=${recs[0].id}'">
              <div>
                <span class="eyebrow-label" style="color:var(--ink-muted);">Your top match</span>
                <h3>${recs[0].name}</h3>
                <span class="region">${recs[0].country}</span>
              </div>
              <span class="match-pill">${recs[0].match}% Match</span>
            </div>
            <div class="result-meta">
              <span>💰 ${recs[0].budget_category || ''}</span>
              <span>🗓️ ${recs[0].best_travel_season || ''}</span>
              <span>🌿 ${(recs[0].travel_interests||[]).join(', ')}</span>
            </div>
            <div class="result-list">`;
          for (let i = 1; i < recs.length; i++) {
            const d = recs[i];
            html += `
              <div class="result-row" style="cursor:pointer;" onclick="window.location.href='${basePath}destination.html?id=${d.id}'">
                <div>
                  <div class="name">${d.name}</div>
                  <div class="place">${d.country}</div>
                </div>
                <span class="mini-pill">${d.match}% Match</span>
              </div>`;
          }
          html += '</div>';
          resultCard.innerHTML = html;

          // Smooth scroll to recommendation card on mobile
          setTimeout(() => {
            const header = document.querySelector('header');
            const headerOffset = header ? header.offsetHeight + 18 : 80;
            const elementPosition = resultCard.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({
              top: Math.max(0, offsetPosition),
              behavior: 'smooth'
            });
          }, 60);
        }
      }
    });
  }

  // 8. Make initial sample matches in .result-card clickable
  const initResultCard = document.querySelector('.result-card');
  if (initResultCard) {
    const basePath = window.location.pathname.includes('/pages/') ? '' : 'pages/';
    const initialMapping = [
      { selector: '.top-row', id: '4' },                  // Kerala
      { selector: '.result-row:nth-child(1)', id: '2' },   // Bali
      { selector: '.result-row:nth-child(2)', id: '6' },   // Hanoi
      { selector: '.result-row:nth-child(3)', id: '3' }    // Kyoto
    ];
    initialMapping.forEach(item => {
      const el = initResultCard.querySelector(item.selector);
      if (el) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => {
          window.location.href = `${basePath}destination.html?id=${item.id}`;
        });
      }
    });
  }

  // 9. Newsletter form submission feedback
  document.querySelectorAll('.newsletter-form').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      if (input && input.value.trim()) {
        const email = input.value.trim();
        form.innerHTML = `<p style="color:var(--secondary);font-weight:600;padding:12px 0;">✓ Thank you! We've sent a dispatch confirmation to ${email}.</p>`;
      }
    });
  });
});
