/* ============================================================
   SITE ENGINE — builds the page from content.js.
   To change text, videos, photos or backgrounds, use the editor at
   /admin (or the files in content/). See HOW-TO-EDIT.md.
   ============================================================ */

const SITE = window.SITE || {};
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t;
const smooth = (t) => t * t * (3 - 2 * t);
const pad = (k) => String(k).padStart(2, "0");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const getPath = (path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), SITE);
const warn = (msg) => console.warn(`[content] ${msg}`);

/* ---------- Turn content.js into the lists the site uses ---------- */
const CATEGORY_LABELS = Object.fromEntries((SITE.categories || []).map((c) => [c.id, c.label]));

// Accepts a YouTube link, a Vimeo link, or a video file path
function parseVideo(url = "") {
  url = String(url).trim();
  if (!url) return {};
  const yt = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/i);
  if (yt) return { youtube: yt[1] };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vm) return { vimeo: vm[1] };
  if (/^[\w-]{11}$/.test(url) && !/\./.test(url)) return { youtube: url }; // bare YouTube ID
  return { file: url };
}

const PORTFOLIO_VIDEOS = ((SITE.films && SITE.films.items) || []).map((v) => ({
  title: v.title || "", category: v.category || "", thumb: v.thumb || "", ...parseVideo(v.file || v.video),
}));
const GALLERY_PHOTOS = ((SITE.gallery && SITE.gallery.items) || []).filter((p) => p.photo).map((p) => ({
  src: p.photo, thumb: p.thumb || p.photo, category: p.category || "", caption: p.caption || "",
}));
const PHOTOS_PER_PAGE = (SITE.gallery && SITE.gallery.perPage) || 8;
const BACKGROUNDS = (SITE.pages || []).map((p) => ({
  src: p.video || "", poster: p.poster || "", start: p.start ?? 0.3, endTrim: p.endTrim ?? 0.4,
  flare: p.sunGlow || (p.sunX != null && p.sunY != null ? [Number(p.sunX), Number(p.sunY)] : null), tone: p.color || "", place: p.place || "",
}));

// Catch common typos early
PORTFOLIO_VIDEOS.forEach((v, i) => { if (v.category && !CATEGORY_LABELS[v.category]) warn(`Film #${i + 1} "${v.title}" uses category "${v.category}", which isn't in the categories list.`); });
GALLERY_PHOTOS.forEach((p, i) => { if (p.category && !CATEGORY_LABELS[p.category]) warn(`Photo #${i + 1} uses category "${p.category}", which isn't in the categories list.`); });

/* ---------- Fill the page from content.js ---------- */
const ICONS = {
  camera: '<path d="M4 7h3l2-3h6l2 3h3v13H4z"/><circle cx="12" cy="13" r="4"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
  editing: '<path d="M3 5h18v14H3zM3 9h18M8 5v4M16 5v4"/><path d="M10 12.5v4l3.5-2z"/>',
  home: '<path d="M3 11l9-7 9 7v9H3z"/><path d="M9 20v-6h6v6"/>',
  star: '<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/>',
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  drone: '<circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
};
const SOCIAL_ICONS = {
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" class="fill"/>',
  youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9v6l5-3z" class="fill"/>',
  tiktok: '<path d="M14 3v11.5a3.5 3.5 0 11-3.5-3.5"/><path d="M14 3c.5 2.8 2.3 4.5 5 4.8"/>',
  facebook: '<path d="M15 3h-2.5A3.5 3.5 0 009 6.5V10H6.5v3.5H9V21h3.5v-7.5H15l.5-3.5h-3V7a1 1 0 011-1H15z"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 014 0v4M12 10v7"/>',
  x: '<path d="M4 4l16 16M20 4L4 20"/>',
};

(function renderContent() {
  const B = SITE.business || {};
  // Simple text and image slots
  $$("[data-text]").forEach((el) => { const v = getPath(el.dataset.text); if (v != null) el.textContent = v; });
  $$("[data-src]").forEach((el) => { const v = getPath(el.dataset.src); if (v) el.src = v; else el.remove(); });
  $$(".nav__logo-img").forEach((img) => (img.alt = B.name || ""));
  if (SITE.seo) {
    if (SITE.seo.title) document.title = SITE.seo.title;
    const md = $('meta[name="description"]');
    if (md && SITE.seo.description) md.content = SITE.seo.description;
  }

  // Page locations (shown in the corner)
  $$(".scene").forEach((s, i) => { s.dataset.place = (BACKGROUNDS[i] && BACKGROUNDS[i].place) || ""; s.dataset.time = ""; });

  // Category filters
  const filterHTML = `<button class="filter is-active" data-filter="all">All</button>` +
    (SITE.categories || []).map((c) => `<button class="filter" data-filter="${esc(c.id)}">${esc(c.label)}</button>`).join("");
  $$(".filters").forEach((f) => (f.innerHTML = filterHTML));

  // Services
  $("#servicesGrid").innerHTML = ((SITE.services && SITE.services.items) || []).map((s) => `
    <article class="card">
      <div class="card__icon"><svg viewBox="0 0 24 24">${ICONS[s.icon] || ICONS.drone}</svg></div>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.text)}</p>
      ${s.price ? `<p class="price">Starting at <strong>${esc(s.price)}</strong></p>` : ""}
    </article>`).join("");

  // About
  const A = SITE.about || {};
  $("#aboutStory").innerHTML = (A.story || []).map((p) => `<p class="muted">${esc(p)}</p>`).join("");
  $("#certList").innerHTML = (A.certifications || []).map((c) => `<li>${esc(c)}</li>`).join("");
  $("#gearList").innerHTML = (A.gear || []).map((c) => `<li>${esc(c)}</li>`).join("");
  $("#teamList").innerHTML = (A.team || []).map((m) => `
    <div class="member">${m.photo ? `<img src="${esc(m.photo)}" alt="" loading="lazy" />` : ""}<div><strong>${esc(m.name)}</strong><span>${esc(m.role)}</span></div></div>`).join("");

  // Reviews
  $("#slideTrack").innerHTML = ((SITE.testimonials && SITE.testimonials.items) || []).map((t) => `
    <figure class="slide">
      <blockquote>“${esc(t.quote)}”</blockquote>
      <figcaption><strong>${esc(t.name)}</strong><span>${esc(t.role)}</span></figcaption>
    </figure>`).join("");

  // Contact
  const C = SITE.contact || {};
  $("#serviceSelect").innerHTML = `<option value="" disabled selected>Select a service</option>` +
    (C.serviceOptions || []).map((o) => `<option>${esc(o)}</option>`).join("");
  if (B.phone) $("#phoneLink").href = "tel:" + B.phone.replace(/[^\d+]/g, "");
  if (B.email) $("#emailLink").href = "mailto:" + B.email;
  $("#socials").innerHTML = Object.entries(B.social || {}).filter(([, url]) => url).map(([name, url]) =>
    `<a href="${esc(url)}" target="_blank" rel="noopener" aria-label="${esc(name)}"><svg viewBox="0 0 24 24">${SOCIAL_ICONS[name] || SOCIAL_ICONS.instagram}</svg></a>`).join("");
  if (B.formEndpoint) $("#quoteForm").setAttribute("action", B.formEndpoint);
})();

/* ---------- Logo: remove the black background so it floats over the 3D world ----------
   (If you get a transparent PNG of the logo, point the <img> tags at it and this does nothing.) */
$$("img.nav__logo-img, img.hero__logo").forEach((img) => {
  const key = () => {
    if (!/\.jpe?g$/i.test(img.src) || img.dataset.keyed) return;
    try {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height);
      const px = d.data;
      for (let i = 0; i < px.length; i += 4) {
        const lum = Math.max(px[i], px[i + 1], px[i + 2]);
        const a = Math.min(1, Math.max(0, (lum - 14) / 24)); // pure black → transparent, dark grey body stays
        px[i + 3] = Math.round(a * 255);
      }
      g.putImageData(d, 0, 0);
      img.dataset.keyed = "1";
      img.src = c.toDataURL("image/png");
      img.style.mixBlendMode = "normal";
    } catch (e) { /* leave the original image */ }
  };
  img.complete ? key() : img.addEventListener("load", key, { once: true });
});

/* ---------- Mobile menu ---------- */
const navToggle = $("#navToggle");
const navLinks = $("#navLinks");
const setMenu = (open) => {
  navToggle.setAttribute("aria-expanded", String(open));
  navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  navLinks.classList.toggle("is-open", open);
};
navToggle.addEventListener("click", () => setMenu(navToggle.getAttribute("aria-expanded") !== "true"));

/* ---------- Video portfolio ---------- */
const hasSource = (v) => Boolean(v.youtube || v.vimeo || v.file);
const videoThumb = (v) => v.thumb || (v.youtube ? `https://i.ytimg.com/vi/${v.youtube}/maxresdefault.jpg` : "");

const videoGrid = $("#videoGrid");
videoGrid.innerHTML = PORTFOLIO_VIDEOS.map((v, i) => {
  const featured = i === 0;
  return `
  <button class="video-card${featured ? " is-featured" : ""}${hasSource(v) ? "" : " is-placeholder"}" data-category="${esc(v.category)}" data-index="${i}" aria-label="Play ${esc(v.title)}">
    ${videoThumb(v) ? `<img src="${esc(videoThumb(v))}" alt="" loading="lazy" />` : v.file ? `<video class="thumbvid" src="${esc(v.file)}#t=1" muted playsinline preload="metadata"></video>` : ""}
    ${featured && v.file ? `<video class="preview" data-autoplay data-src="${esc(v.file)}" muted loop playsinline preload="none"></video>` : ""}
    ${hasSource(v) ? "" : `<span class="placeholder-tag">+ Add video link</span>`}
    <span class="play"><svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg></span>
    <span class="video-card__meta">
      <span class="video-card__cat">${esc(CATEGORY_LABELS[v.category] || v.category)}</span>
      <span class="video-card__title">${esc(v.title)}</span>
    </span>
  </button>`;
}).join("");
$$("video[data-autoplay]").forEach((v) => v.addEventListener("playing", () => v.classList.add("is-playing")));

// Hover previews (devices with a mouse)
if (matchMedia("(hover: hover)").matches) {
  $$(".video-card", videoGrid).forEach((card) => {
    const v = PORTFOLIO_VIDEOS[Number(card.dataset.index)];
    if (!v || !v.file || card.classList.contains("is-featured")) return;
    let pv;
    card.addEventListener("mouseenter", () => {
      if (!pv) {
        pv = document.createElement("video");
        Object.assign(pv, { src: v.file, muted: true, loop: true, playsInline: true, className: "preview" });
        pv.addEventListener("playing", () => pv.classList.add("is-playing"));
        const img = card.querySelector("img");
        img ? img.after(pv) : card.prepend(pv);
      }
      pv.play().catch(() => {});
    });
    card.addEventListener("mouseleave", () => { if (pv) { pv.pause(); pv.classList.remove("is-playing"); } });
  });
}

/* ---------- Photo gallery ---------- */
const photoGrid = $("#photoGrid");
const loadMoreBtn = $("#loadMore");
photoGrid.innerHTML = GALLERY_PHOTOS.map((p, i) => `
  <button class="masonry__item" data-category="${esc(p.category)}" data-index="${i}" aria-label="View photo: ${esc(p.caption || CATEGORY_LABELS[p.category])}">
    <img src="${esc(p.thumb || p.src)}" alt="${esc(p.caption || "")}" loading="lazy" data-missing-photo />
  </button>`).join("");

$$("img[data-missing-photo]", photoGrid).forEach((img) => img.addEventListener("error", () => {
  warn(`Photo not found: ${img.getAttribute("src")} — check the file path in the editor`);
  img.closest(".masonry__item").classList.add("is-broken", "is-hidden");
  renderPhotos();
}));
let photoFilter = "all";
let photoLimit = PHOTOS_PER_PAGE;
function renderPhotos() {
  let shown = 0, matching = 0;
  $$(".masonry__item", photoGrid).forEach((el) => {
    const match = !el.classList.contains("is-broken") && (photoFilter === "all" || el.dataset.category === photoFilter);
    if (match) matching++;
    const visible = match && shown < photoLimit;
    if (visible) shown++;
    el.classList.toggle("is-hidden", !visible);
  });
  loadMoreBtn.classList.toggle("is-hidden", matching <= photoLimit);
}
loadMoreBtn.addEventListener("click", () => { photoLimit += PHOTOS_PER_PAGE; renderPhotos(); });

/* ---------- Filters ---------- */
$$(".filters").forEach((group) => {
  group.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter");
    if (!btn) return;
    $$(".filter", group).forEach((b) => b.classList.toggle("is-active", b === btn));
    const f = btn.dataset.filter;
    if (group.dataset.filterGroup === "videos") {
      $$(".video-card", videoGrid).forEach((el) => el.classList.toggle("is-hidden", f !== "all" && el.dataset.category !== f));
    } else {
      photoFilter = f;
      photoLimit = PHOTOS_PER_PAGE;
      renderPhotos();
    }
  });
});
renderPhotos();

/* ---------- Lightbox ---------- */
const lb = $("#lightbox");
const lbStage = $("#lbStage");
const lbCaption = $("#lbCaption");
let lbItems = [], lbIndex = 0, lbMode = "photo", lastFocus = null;

const visibleIndexes = (container, selector) =>
  $$(selector, container).filter((el) => !el.classList.contains("is-hidden")).map((el) => Number(el.dataset.index));

function renderVideo(v) {
  if (v.youtube) return `<div class="frame"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.youtube)}?autoplay=1&rel=0&modestbranding=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="${esc(v.title)}"></iframe></div>`;
  if (v.vimeo) return `<div class="frame"><iframe src="https://player.vimeo.com/video/${encodeURIComponent(v.vimeo)}?autoplay=1&title=0&byline=0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="${esc(v.title)}"></iframe></div>`;
  if (v.file) return `<div class="frame"><video src="${esc(v.file)}" controls autoplay playsinline></video></div>`;
  return `<div class="frame"><div class="empty"><div><strong>Video slot ready</strong>Add a <code>youtube</code>, <code>vimeo</code> or <code>file</code> value for<br>“${esc(v.title)}” in <code>script.js</code> → PORTFOLIO_VIDEOS.</div></div></div>`;
}
function showLightboxItem() {
  const idx = lbItems[lbIndex];
  if (lbMode === "video") {
    const v = PORTFOLIO_VIDEOS[idx];
    lbStage.innerHTML = renderVideo(v);
    lbCaption.textContent = `${CATEGORY_LABELS[v.category] || ""} — ${v.title}`;
  } else {
    const p = GALLERY_PHOTOS[idx];
    lbStage.innerHTML = `<img src="${esc(p.src)}" alt="${esc(p.caption || "")}" />`;
    lbCaption.textContent = `${lbIndex + 1} / ${lbItems.length}${p.caption ? " — " + p.caption : ""}`;
  }
  $("#lbPrev").style.display = $("#lbNext").style.display = lbItems.length > 1 ? "" : "none";
}
function openLightbox(mode, index) {
  lbMode = mode;
  lbItems = mode === "video" ? visibleIndexes(videoGrid, ".video-card") : visibleIndexes(photoGrid, ".masonry__item");
  lbIndex = Math.max(0, lbItems.indexOf(index));
  lastFocus = document.activeElement;
  lb.hidden = false;
  requestAnimationFrame(() => lb.classList.add("is-open"));
  document.documentElement.style.overflow = "hidden";
  showLightboxItem();
  $("#lbClose").focus();
}
function closeLightbox() {
  lb.classList.remove("is-open");
  document.documentElement.style.overflow = "";
  setTimeout(() => { lb.hidden = true; lbStage.innerHTML = ""; }, 300);
  if (lastFocus) lastFocus.focus({ preventScroll: true });
}
const step = (d) => { lbIndex = (lbIndex + d + lbItems.length) % lbItems.length; showLightboxItem(); };
videoGrid.addEventListener("click", (e) => { const c = e.target.closest(".video-card"); if (c) openLightbox("video", Number(c.dataset.index)); });
photoGrid.addEventListener("click", (e) => { const c = e.target.closest(".masonry__item"); if (c) openLightbox("photo", Number(c.dataset.index)); });
$("#lbClose").addEventListener("click", closeLightbox);
$("#lbPrev").addEventListener("click", () => step(-1));
$("#lbNext").addEventListener("click", () => step(1));
lb.addEventListener("click", (e) => { if (e.target === lb || e.target === lbStage) closeLightbox(); });
document.addEventListener("keydown", (e) => {
  if (lb.hidden) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowRight") step(1);
  if (e.key === "ArrowLeft") step(-1);
});
let touchX = null;
lb.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
lb.addEventListener("touchend", (e) => {
  if (touchX === null || lbMode !== "photo") return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  touchX = null;
});

/* ---------- Testimonials slider ---------- */
(() => {
  const slider = $("#slider");
  const track = $(".slider__track", slider);
  const slides = $$(".slide", track);
  const dots = $("#sliderDots");
  let i = 0, timer;
  dots.innerHTML = slides.map((_, n) => `<button aria-label="Go to review ${n + 1}"></button>`).join("");
  const go = (n) => {
    i = (n + slides.length) % slides.length;
    track.style.transform = `translateX(-${i * 100}%)`;
    $$("button", dots).forEach((d, k) => d.classList.toggle("is-active", k === i));
  };
  const auto = () => { clearInterval(timer); timer = setInterval(() => go(i + 1), 6000); };
  $$("button", dots).forEach((d, k) => d.addEventListener("click", () => { go(k); auto(); }));
  $("#prevSlide").addEventListener("click", () => { go(i - 1); auto(); });
  $("#nextSlide").addEventListener("click", () => { go(i + 1); auto(); });
  slider.addEventListener("mouseenter", () => clearInterval(timer));
  slider.addEventListener("mouseleave", auto);
  let sx = null;
  slider.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
  slider.addEventListener("touchend", (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) { go(dx < 0 ? i + 1 : i - 1); auto(); }
    sx = null;
  });
  go(0); auto();
})();

/* ---------- Contact form ---------- */
const form = $("#quoteForm");
const statusEl = $("#formStatus");
form.querySelector('input[type="date"]').min = new Date().toISOString().split("T")[0];
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  let valid = true;
  $$("[required]", form).forEach((f) => {
    const ok = f.type === "email" ? /^\S+@\S+\.\S+$/.test(f.value) : f.value.trim() !== "";
    f.closest(".field").classList.toggle("is-invalid", !ok);
    if (!ok) valid = false;
  });
  if (!valid) { statusEl.className = "form__status err"; statusEl.textContent = "Please fill in the highlighted fields."; return; }
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = "Sending…";
  try {
    const isLocal = location.protocol === "file:" || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    if (form.getAttribute("action")) {
      // A form service URL is set in Business Info (e.g. Formspree)
      const res = await fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error();
    } else if (!isLocal) {
      // Netlify's built-in form handling (submissions appear in Netlify → Forms, with email alerts)
      const res = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(new FormData(form)).toString() });
      if (!res.ok) throw new Error();
    } else {
      await new Promise((r) => setTimeout(r, 700)); // local preview: demo only, nothing is sent
    }
    form.reset();
    statusEl.className = "form__status ok";
    statusEl.textContent = (SITE.contact && SITE.contact.successMessage) || "Thanks! We'll be in touch soon.";
  } catch {
    statusEl.className = "form__status err";
    statusEl.textContent = "Something went wrong — please call or email us directly.";
  } finally {
    btn.disabled = false; btn.textContent = "Request a Quote";
  }
});
$$("input, select, textarea", form).forEach((f) => f.addEventListener("input", () => f.closest(".field").classList.remove("is-invalid")));
$("#year").textContent = new Date().getFullYear();

/* ============================================================
   THE FLIGHT — one continuous scroll through every page
   ------------------------------------------------------------
   Timeline:  [page 1] → zoom-through → [page 2] → zoom-through → …
   While a page is "held", tall content scrolls in place; then the
   page flies past the camera and the next one drops into view.
   window.FLIGHT is read by world.js to drive the 3D scene.
   ============================================================ */
(() => {
  const flight = $("#flight");
  const scenes = $$(".scene", flight);
  const n = scenes.length;
  const rail = $("#rail");
  const hudAlt = $("#hudAlt"), hudNum = $("#hudNum"), hudSeason = $("#hudSeason"), bar = $("#progressBar");
  const navAnchors = $$(".nav__links a:not(.btn)");
  window.FLIGHT = { pos: 0, transition: 0, count: n, velocity: 0 };

  $("#hudTotal").textContent = pad(n);
  scenes.forEach((s, i) => {
    s.style.zIndex = n - i;
    s._inner = $(".scene__inner", s);
    s._parts = [...s._inner.children].slice(0, 6);
    s._videos = $$("video[data-autoplay]", s);
    rail.insertAdjacentHTML("beforeend", `<button type="button" data-i="${i}" aria-label="Go to ${esc(s.dataset.label)}"><span>${esc(s.dataset.label)}</span><i></i></button>`);
  });
  const railBtns = $$("button", rail);

  /* --- Layout: how much scroll each page and each transition takes --- */
  let layout = [], total = 0, T = 0, REST = 0;
  function measure() {
    const vh = innerHeight;
    const mobile = innerWidth <= 900;
    const top = mobile ? 84 : 96;
    const bottom = mobile ? 70 : 64;
    const avail = vh - top - bottom;
    T = vh * (mobile ? 0.8 : 0.95);   // scroll distance of one fly-through
    REST = vh * 0.22;                 // pause before/after in-place scrolling
    let y = 0;
    scenes.forEach((s, i) => {
      const h = s._inner.offsetHeight;
      const overflow = Math.max(0, h - avail);
      let offsetTop = overflow ? top : top + (avail - h) / 2;
      if (s.classList.contains("scene--hero") && mobile) offsetTop = Math.max(top, vh - bottom - h - 10);
      s._inner.style.top = `${offsetTop}px`;
      const hold = (i === 0 ? REST : REST * 2) + overflow;
      layout[i] = { start: y, hold, overflow };
      y += hold + (i < n - 1 ? T : 0);
    });
    total = y;
    flight.style.height = `${total + vh}px`;
    update();
  }

  /* Where to scroll to reach page i */
  const targetFor = (i) => flight.offsetTop + (i === 0 ? 0 : layout[i].start + 2);

  function stateAt(y) {
    for (let i = 0; i < n; i++) {
      const L = layout[i];
      const holdEnd = L.start + L.hold;
      if (y < holdEnd || i === n - 1) return { i, t: 0, inHold: y - L.start };
      if (y < holdEnd + T) return { i, t: (y - holdEnd) / T, inHold: L.hold };
    }
    return { i: n - 1, t: 0, inHold: 0 };
  }

  /* --- Background footage: one clip per page, zooming through to the next --- */
  const bgWrap = $("#bg");
  const flareEl = $("#flare");
  const bgs = BACKGROUNDS.slice(0, n).map((b, i) => {
    const v = document.createElement("video");
    Object.assign(v, { muted: true, playsInline: true, preload: "none", poster: b.poster });
    v.setAttribute("muted", "");
    v.style.zIndex = n - i;
    v.addEventListener("loadedmetadata", () => { if (b.start) v.currentTime = b.start; });
    v.addEventListener("timeupdate", () => {   // seamless loop that skips fades at either end
      if (v.duration && v.currentTime > v.duration - (b.endTrim || 0.3)) v.currentTime = b.start || 0;
    });
    v.addEventListener("ended", () => { v.currentTime = b.start || 0; v.play().catch(() => {}); });
    bgWrap.appendChild(v);
    return { el: v, cfg: b };
  });
  const loadBg = (k) => { const b = bgs[k]; if (b && !b.el.getAttribute("src")) { b.el.src = b.cfg.src; b.el.preload = "auto"; } };
  loadBg(0); loadBg(1);

  function renderBackground(cur, t) {
    const pos = cur + (t > 0 ? smooth(t) : 0);
    for (let k = cur - 1; k <= cur + 2; k++) loadBg(k);
    bgs.forEach(({ el, cfg }, i) => {
      const d = pos - i;
      let op = 0, scale = 1.04, blur = 0;
      if (d > -1 && d < 0) {                    // next clip drops in from slightly zoomed
        const e = d + 1;
        op = clamp((e - 0.1) / 0.55);
        scale = 1.3 - 0.26 * easeOut(e);
      } else if (d >= 0 && d < 1) {             // current clip: hold, then fly straight through
        op = 1 - easeIn(clamp(d / 0.9));
        scale = 1.04 + 0.75 * easeIn(d);
        blur = Math.sin(Math.PI * d) * 6;
      } else if (i === n - 1 && d >= 1) { op = 1; }
      if (reduceMotion) { scale = 1.04; blur = 0; }
      el.style.opacity = op.toFixed(3);
      el.style.transform = `scale(${scale.toFixed(4)})`;
      el.style.filter = [cfg.tone || "", blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : ""].join(" ").trim();
      el.style.visibility = op > 0.002 ? "visible" : "hidden";
      if (op > 0.002) { if (el.paused && el.getAttribute("src")) el.play().catch(() => {}); }
      else if (!el.paused) el.pause();
    });
    // Gold sun glow follows where the sun sits in the current shot
    const a = BACKGROUNDS[Math.min(n - 1, Math.floor(pos))]?.flare, b = BACKGROUNDS[Math.min(n - 1, Math.floor(pos) + 1)]?.flare;
    const f = pos - Math.floor(pos);
    if (a || b) {
      const A = a || b, B = b || a;
      flareEl.style.setProperty("--fx", `${A[0] + (B[0] - A[0]) * f}%`);
      flareEl.style.setProperty("--fy", `${A[1] + (B[1] - A[1]) * f}%`);
    }
    flareEl.style.opacity = (a && b ? 1 : a ? 1 - f : f) * (1 - Math.sin(Math.PI * f) * 0.6);
  }

  let lastActive = -1, lastY = 0, lastTime = performance.now();

  function update() {
    const y = clamp(-flight.getBoundingClientRect().top, 0, total);
    const { i: cur, t, inHold } = stateAt(y);
    const now = performance.now();
    window.FLIGHT.velocity = (y - lastY) / Math.max(16, now - lastTime);
    lastY = y; lastTime = now;

    scenes.forEach((s, i) => {
      let op = 0, scale = 1, copyIn = 0, copyOut = 0, scrolled = 0;
      if (i === cur) {
        const L = layout[i];
        scrolled = L.overflow ? L.overflow * clamp((inHold - (i === 0 ? 0 : REST)) / L.overflow) : 0;
        if (t === 0) {                          // holding: tiny push-in while you read
          op = 1; copyIn = 1;
          scale = 1 + 0.015 * clamp(inHold / Math.max(1, L.hold));
        } else {                                // exiting: fly straight through the page
          const x = t;
          op = 1 - easeIn(clamp(x / 0.75));
          scale = 1.015 + 0.95 * easeIn(x);
          copyIn = 1; copyOut = clamp(x * 1.8);
        }
      } else if (i === cur + 1 && t > 0) {      // entering: drop down into the next page
        const e = t;
        op = clamp((e - 0.3) / 0.6);
        scale = 1.32 - 0.32 * easeOut(e);
        copyIn = clamp((e - 0.35) / 0.65);
      }
      if (reduceMotion) scale = 1;

      const visible = op > 0.002;
      s.style.visibility = visible ? "visible" : "hidden";
      s.style.opacity = op.toFixed(3);
      s.style.transform = `scale(${scale.toFixed(4)})`;
      s.inert = op < 0.5;

      // Staggered reveal of the first few blocks, then lift away on exit
      s._parts.forEach((el, k) => {
        const v = clamp((copyIn - k * 0.08) / 0.6);
        el.style.opacity = v.toFixed(3);
        el.style.transform = reduceMotion || v === 1 ? "" : `translateY(${((1 - easeOut(v)) * 46).toFixed(1)}px)`;
      });
      s._inner.style.opacity = (1 - copyOut).toFixed(3);
      s._inner.style.transform = `translateY(${(-scrolled - (reduceMotion ? 0 : copyOut * 60)).toFixed(1)}px)`;

      s._videos.forEach((v) => {
        if (visible) {
          if (!v.getAttribute("src")) v.src = v.dataset.src;
          if (v.paused) v.play().catch(() => {});
        } else if (!v.paused) v.pause();
      });
    });

    const pos = cur + (t > 0 ? smooth(t) : 0);
    renderBackground(cur, t);
    window.FLIGHT.pos = pos;
    window.FLIGHT.transition = t;

    const active = t > 0.5 ? Math.min(n - 1, cur + 1) : cur;
    if (active !== lastActive) {
      hudNum.textContent = pad(active + 1);
      const s = scenes[active];
      hudSeason.textContent = (s.dataset.time ? `${s.dataset.place} · ${s.dataset.time}` : s.dataset.place).toUpperCase();
      railBtns.forEach((b, k) => b.classList.toggle("is-active", k === active));
      navAnchors.forEach((a) => a.classList.toggle("is-current", a.getAttribute("href") === `#${s.dataset.id}`));
      lastActive = active;
    }
    hudAlt.textContent = Math.round(120 + (pos / Math.max(1, n - 1)) * 280);
    bar.style.width = `${((y / Math.max(1, total)) * 100).toFixed(2)}%`;
  }

  /* --- Gentle snap: never leave a page stuck halfway through a fly-through --- */
  let snapTimer;
  function snap() {
    const y = clamp(-flight.getBoundingClientRect().top, 0, total);
    const { i, t } = stateAt(y);
    if (t <= 0.02 || t >= 0.98) return;
    const holdEnd = layout[i].start + layout[i].hold;
    const dest = t < 0.4 ? holdEnd - 1 : holdEnd + T + 2;
    window.scrollTo({ top: flight.offsetTop + dest, behavior: reduceMotion ? "auto" : "smooth" });
  }

  let ticking = false;
  addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; update(); }); }
    clearTimeout(snapTimer);
    snapTimer = setTimeout(snap, 220);
  }, { passive: true });
  addEventListener("resize", () => requestAnimationFrame(measure));
  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(() => requestAnimationFrame(measure));
    scenes.forEach((s) => ro.observe(s._inner));
  }

  /* --- In-page links (#work, #contact …) fly to that page --- */
  const goTo = (i) => window.scrollTo({ top: targetFor(i), behavior: reduceMotion ? "auto" : "smooth" });
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const i = scenes.findIndex((s) => `#${s.dataset.id}` === a.getAttribute("href"));
    if (i < 0) return;
    e.preventDefault();
    setMenu(false);
    goTo(i);
  });
  rail.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) goTo(Number(b.dataset.i)); });

  // Keyboard: PageDown / PageUp hop a whole page
  document.addEventListener("keydown", (e) => {
    if (!lb.hidden || e.target.closest("input, textarea, select")) return;
    if (e.key === "PageDown" || e.key === "PageUp") {
      e.preventDefault();
      const target = clamp(lastActive + (e.key === "PageDown" ? 1 : -1), 0, n - 1);
      goTo(target);
    }
  });

  /* REC timecode */
  const hudTime = $("#hudTime");
  const t0 = performance.now();
  setInterval(() => {
    const s = (performance.now() - t0) / 1000;
    hudTime.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(Math.floor(s) % 60)}`;
  }, 1000);

  measure();
  // Links like yoursite.com/#contact open straight on that page
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (location.hash) {
    const i = scenes.findIndex((s) => `#${s.dataset.id}` === location.hash);
    if (i > 0) {
      const jump = () => { measure(); window.scrollTo({ top: targetFor(i), behavior: "auto" }); };
      jump();
      addEventListener("load", () => setTimeout(jump, 80), { once: true });
    }
  }
  addEventListener("hashchange", () => {
    const i = scenes.findIndex((s) => `#${s.dataset.id}` === location.hash);
    if (i >= 0) goTo(i);
  });
})();
