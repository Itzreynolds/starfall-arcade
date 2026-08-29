(() => {
  const config = window.STARFALL_CONFIG || {};
  const games = config.games || [];
  const updates = config.updates || [];
  const roadmap = config.roadmap || [];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function setupStars() {
    const layer = $("#stars");
    if (!layer) return;
    const count = Math.min(95, Math.max(44, Math.floor(innerWidth / 16)));
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const star = document.createElement("i");
      const size = (Math.random() * 2.2 + .7).toFixed(2);
      star.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;width:${size}px;height:${size}px;animation-delay:${Math.random()*5}s;opacity:${.2+Math.random()*.72}`;
      frag.append(star);
    }
    layer.replaceChildren(frag);
  }

  function setupNav() {
    const button = $("#navToggle");
    const nav = $("#mainNav");
    if (!button || !nav) return;
    button.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      button.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", e => {
      if (e.target.closest("a")) nav.classList.remove("open");
    });
  }

  function setupExternalLinks() {
    const discord = config.links?.discord?.trim();
    $$('[data-link="discord"]').forEach(link => {
      if (discord) {
        link.href = discord;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.classList.remove("disabled-link");
        link.removeAttribute("aria-disabled");
      } else {
        link.href = "community.html";
        link.classList.add("disabled-link");
        link.setAttribute("aria-disabled", "true");
        link.title = "Discord invite will be added here when the community server is ready.";
      }
    });
  }

  function gameCard(game) {
    const live = game.status === "live";
    const art = game.cover
      ? `<img src="${escapeHtml(game.cover)}" alt="${escapeHtml(game.title)} cover artwork" loading="lazy">`
      : `<div class="locked-art"><span class="locked-star">✦</span><span class="signal-line"></span><span class="signal-line short"></span></div>`;
    const status = live ? "LIVE" : "LOCKED";
    return `<article class="game-card ${live ? "" : "locked"}" data-genres="${escapeHtml((game.genres||[]).join('|'))}">
      <div class="game-card-art">${art}<span class="status-pill ${live ? "live" : "locked"}">${status}</span></div>
      <div class="game-card-body">
        <div class="tag-row">${(game.genres||[]).slice(0,4).map(g => `<span>${escapeHtml(g)}</span>`).join("")}</div>
        <div class="title-row"><h3>${escapeHtml(game.title)}</h3>${game.version ? `<b>${escapeHtml(game.version)}</b>` : ""}</div>
        <p class="game-tagline">${escapeHtml(game.tagline)}</p>
        <p>${escapeHtml(game.description)}</p>
        <div class="game-card-footer"><small>${escapeHtml(game.release || "")}</small><div>${game.page ? `<a class="text-link" href="${escapeHtml(game.page)}">Details</a>` : ""}${game.play ? `<a class="button tiny primary" target="_blank" rel="noreferrer" href="${escapeHtml(game.play)}">Play</a>` : `<span class="locked-label">Reveal later</span>`}</div></div>
      </div>
    </article>`;
  }

  function renderGames() {
    const target = $("#gameGrid");
    if (!target) return;
    const filters = $("#gameFilters");
    const search = $("#gameSearch");
    const categories = ["All", ...new Set(games.flatMap(game => game.genres || []))];

    if (filters) filters.innerHTML = categories.map((category, i) => `<button class="filter-button ${i === 0 ? "active" : ""}" data-filter="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join("");

    const apply = () => {
      const active = $(".filter-button.active", filters)?.dataset.filter || "All";
      const query = (search?.value || "").trim().toLowerCase();
      const filtered = games.filter(game => {
        const categoryMatch = active === "All" || (game.genres || []).includes(active);
        const haystack = [game.title, game.tagline, game.description, ...(game.genres || [])].join(" ").toLowerCase();
        return categoryMatch && (!query || haystack.includes(query));
      });
      target.innerHTML = filtered.length ? filtered.map(gameCard).join("") : `<div class="empty-state"><strong>No games found.</strong><span>Try another filter or search.</span></div>`;
    };

    filters?.addEventListener("click", e => {
      const button = e.target.closest("[data-filter]");
      if (!button) return;
      $$(".filter-button", filters).forEach(x => x.classList.remove("active"));
      button.classList.add("active");
      apply();
    });
    search?.addEventListener("input", apply);
    apply();
  }

  function updateCard(item) {
    return `<article class="news-card"><div class="news-meta"><span>${escapeHtml(item.date)}</span><span>${escapeHtml(item.game)}</span><span>${escapeHtml(item.type)}</span></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.excerpt)}</p><a class="text-link" href="${escapeHtml(item.url)}">Read update →</a></article>`;
  }

  function renderUpdates() {
    $$('[data-updates]').forEach(target => {
      const limit = Number(target.dataset.limit || updates.length);
      target.innerHTML = updates.slice(0, limit).map(updateCard).join("");
    });
  }

  function renderRoadmap() {
    const target = $("#roadmapList");
    if (!target) return;
    target.innerHTML = roadmap.map(item => `<article class="roadmap-item ${escapeHtml(item.status)}"><div class="roadmap-number">${escapeHtml(item.phase)}</div><div><div class="roadmap-top"><h3>${escapeHtml(item.title)}</h3><span>${escapeHtml(item.status)}</span></div><p>${escapeHtml(item.text)}</p></div></article>`).join("");
  }

  function activeNav() {
    const current = document.body.dataset.page;
    if (!current) return;
    $$(`[data-nav]`).forEach(link => link.classList.toggle("active", link.dataset.nav === current));
  }

  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();
  setupStars();
  setupNav();
  setupExternalLinks();
  renderGames();
  renderUpdates();
  renderRoadmap();
  activeNav();
})();
