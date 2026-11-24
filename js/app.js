import { dishes as demoDishes, weekMenu as demoWeekMenu, demoReviews as demoSeedReviews, missingDishes } from './data.js';
import { api } from './api.js';

let dishes = [...demoDishes];
let weekMenu = [...demoWeekMenu];
let demoReviews = [...demoSeedReviews];

const STORAGE_KEYS = {
  reviews: 'smg-demo-reviews-v1',
  user: 'smg-demo-user-v1',
  moderation: 'smg-demo-moderation-v1',
  reports: 'smg-demo-reports-v1',
  language: 'smg-language-v1'
};

const state = {
  page: 'home',
  selectedDay: 1,
  activeDishId: null,
  filters: new Set(),
  search: '',
  language: safeStorageGet(STORAGE_KEYS.language) || 'tr',
  locales: { tr: {}, en: {} },
  demoUser: api.enabled ? null : readJSON(STORAGE_KEYS.user, null),
  remoteUser: null,
  remoteReviews: [],
  adminReviews: [],
  userReviews: api.enabled ? [] : readJSON(STORAGE_KEYS.reviews, []),
  moderation: readJSON(STORAGE_KEYS.moderation, {}),
  reports: readJSON(STORAGE_KEYS.reports, []),
  pendingReviewDish: null,
  pendingPhotos: []
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const getDish = (id) => dishes.find((dish) => dish.id === id);
const t = (key) => state.locales[state.language]?.[key] ?? state.locales.tr?.[key] ?? key;
const localized = (dish, key) => state.language === 'en' ? (dish[`${key}En`] || dish[key]) : dish[key];
const dishName = (dish) => state.language === 'en' ? dish.en : dish.name;
const dishCategory = (dish) => state.language === 'en' ? dish.categoryEn : dish.category;
const weekDayName = (day) => state.language === 'en' ? day.dayEn : day.day;

function safeStorageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function readJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch { return fallback; }
}
function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    showToast(state.language === 'en' ? 'Browser storage is full or unavailable.' : 'Tarayıcı depolama alanı dolu veya kullanılamıyor.');
    return false;
  }
}
function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}
function formatDate(dateValue, includeTime = false) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  const locale = state.language === 'en' ? 'en-GB' : 'tr-TR';
  return new Intl.DateTimeFormat(locale, includeTime ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}
function showToast(message) {
  const region = $('#toast-region');
  if (!region) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  region.append(toast);
  window.setTimeout(() => toast.remove(), 3600);
}

async function loadLocales() {
  try {
    const [trResponse, enResponse] = await Promise.all([
      fetch('./locales/tr.json'),
      fetch('./locales/en.json')
    ]);
    if (!trResponse.ok || !enResponse.ok) throw new Error('Locale files unavailable');
    state.locales.tr = await trResponse.json();
    state.locales.en = await enResponse.json();
  } catch (error) {
    console.warn('Locale files could not be loaded. Turkish fallback labels will be used.', error);
    state.locales.tr = {};
    state.locales.en = {};
  }
}

function applyTranslations() {
  document.documentElement.lang = state.language;
  $$('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    const translated = t(key);
    // Only project-owned locale files supply HTML for editorial line breaks.
    if (translated.includes('<br>') || translated.includes('<em>')) element.innerHTML = translated;
    else element.textContent = translated;
  });
  $$('[data-i18n-placeholder]').forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  $('#language-toggle').setAttribute('aria-label', state.language === 'tr' ? 'Switch to English' : 'Türkçe diline geç');
  $$('#language-toggle').forEach((button) => button.classList.toggle('is-en', state.language === 'en'));
  const currentDate = new Date();
  $('#today-date').textContent = formatDate(currentDate);
  renderDaySelector();
}

function tagLabel(tag) {
  const known = { vegan: 'diet_vegan', vegetarian: 'diet_vegetarian', glutenFree: 'diet_glutenFree', lowCal: 'diet_lowCal', highProtein: 'diet_highProtein' };
  return t(known[tag] || tag);
}
function tagsHTML(dish) {
  return dish.tags.slice(0, 3).map((tag) => `<span class="diet-tag">${escapeHTML(tagLabel(tag))}</span>`).join('');
}
function dishImage(dish, extraClass = '') {
  const alt = `${dishName(dish)} — ${t('representativeImage')}`;
  return `<img class="${extraClass}" src="${escapeHTML(dish.image)}" alt="${escapeHTML(alt)}" loading="lazy" onerror="this.onerror=null;this.style.opacity='.15';this.alt='${escapeHTML(t('imageNotLoaded'))}'">`;
}
function dishCardHTML(dish, options = {}) {
  const compact = options.compact === true;
  return `
    <article class="menu-card" tabindex="0" role="button" aria-label="${escapeHTML(dishName(dish))} ${escapeHTML(t('details'))}" data-open-dish="${dish.id}">
      <div class="menu-card-image">
        ${dishImage(dish)}
        <span class="image-chip">${escapeHTML(dishCategory(dish))}</span>
        <span class="image-save" aria-hidden="true">↗</span>
      </div>
      <div class="card-body">
        <div class="card-kicker">${escapeHTML(t('estimate'))} · ${escapeHTML(dish.portion)}</div>
        <h3 class="card-title">${escapeHTML(dishName(dish))}</h3>
        <p class="card-description">${escapeHTML(localized(dish, 'description'))}</p>
        ${compact ? '' : `<div class="diet-tags">${tagsHTML(dish)}</div>`}
        <div class="card-meta"><span class="kcal">${dish.calories} <small>kcal</small></span><span class="card-arrow">↗</span></div>
      </div>
    </article>`;
}

function renderDaySelector() {
  const selector = $('#day-selector');
  if (!selector) return;
  selector.innerHTML = weekMenu.map((day, index) => `
    <button class="day-tab ${state.selectedDay === index ? 'active' : ''}" data-day="${index}" aria-pressed="${state.selectedDay === index}">
      <small>${day.date}</small><span>${state.language === 'en' ? ['Mon','Tue','Wed','Thu','Fri'][index] : day.short}</span>
    </button>`).join('');
}

function renderDailyMenu() {
  const day = weekMenu[state.selectedDay];
  const selectedDishes = day.items.map(getDish).filter(Boolean);
  $('#daily-menu-grid').innerHTML = selectedDishes.map((dish) => dishCardHTML(dish)).join('');
  const totals = selectedDishes.reduce((sum, dish) => {
    ['calories', 'protein', 'carbs', 'fat', 'fiber', 'salt'].forEach((key) => sum[key] += dish[key]);
    return sum;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, salt: 0 });
  $('#daily-calories').textContent = Math.round(totals.calories).toLocaleString(state.language === 'en' ? 'en-US' : 'tr-TR');
  const macros = [
    { key: 'protein', label: t('protein'), value: totals.protein, max: 100 },
    { key: 'carbs', label: t('carbs'), value: totals.carbs, max: 180 },
    { key: 'fat', label: t('fat'), value: totals.fat, max: 80 }
  ];
  $('#macro-list').innerHTML = macros.map((item) => `
    <div class="macro-row"><span>${escapeHTML(item.label)}</span><span class="macro-track"><span class="macro-fill" style="display:block;width:${Math.min(100, item.value / item.max * 100)}%"></span></span><strong>${item.value.toFixed(1)} g</strong></div>`).join('');
}

function renderFeatured() {
  const ids = ['et-yahni', 'firin-tavuk', 'mevsim-salata'];
  $('#featured-grid').innerHTML = ids.map((id) => {
    const dish = getDish(id);
    return `<article class="featured-card" tabindex="0" role="button" data-open-dish="${dish.id}">${dishImage(dish)}<div class="featured-card-content"><small>${escapeHTML(dishCategory(dish))} · ${dish.calories} kcal</small><h3>${escapeHTML(dishName(dish))}</h3><span>${escapeHTML(t('details'))} ↗</span></div></article>`;
  }).join('');
}

function renderWeekly() {
  $('#weekly-grid').innerHTML = weekMenu.map((day, index) => `
    <section class="weekly-day">
      <div class="weekly-day-head"><strong>${escapeHTML(weekDayName(day))}</strong><small>${day.date} NOV</small></div>
      ${day.items.map((id) => {
        const dish = getDish(id);
        return `<div class="weekly-item" tabindex="0" role="button" data-open-dish="${dish.id}">${dishImage(dish)}<span><strong>${escapeHTML(dishName(dish))}</strong><small>${dish.calories} kcal · ${escapeHTML(dishCategory(dish))}</small></span></div>`;
      }).join('')}
      <button class="weekly-day-button" data-day-open="${index}">${escapeHTML(t('viewDayMenu'))}</button>
    </section>`).join('');
}

function filteredDishes() {
  const query = state.search.trim().toLocaleLowerCase(state.language === 'tr' ? 'tr-TR' : 'en-GB');
  return dishes.filter((dish) => {
    const searchHaystack = [dish.name, dish.en, dish.description, dish.descriptionEn, dish.category, dish.categoryEn].join(' ').toLocaleLowerCase(state.language === 'tr' ? 'tr-TR' : 'en-GB');
    if (query && !searchHaystack.includes(query)) return false;
    for (const filter of state.filters) {
      if (filter === 'lowCal' && dish.calories > 150) return false;
      if (filter === 'highProtein' && dish.protein < 20) return false;
      if (['vegan', 'vegetarian', 'glutenFree'].includes(filter) && !dish.tags.includes(filter)) return false;
    }
    return true;
  });
}

function renderDiscover() {
  const results = filteredDishes();
  $('#discover-grid').innerHTML = results.map((dish) => dishCardHTML(dish)).join('');
  $('#empty-state').classList.toggle('hidden', results.length > 0);
  $('#discover-grid').classList.toggle('hidden', results.length === 0);
  $('#collection-count').textContent = `${String(dishes.length).padStart(2, '0')} ${state.language === 'en' ? 'DISHES' : 'YEMEK'}`;
  $('#result-text').textContent = `${results.length} ${t('searchResults')}`;
  $('#filter-count').textContent = state.filters.size;
  $$('.filter-chip').forEach((chip) => chip.classList.toggle('active', state.filters.has(chip.dataset.filter)));
}

function getAllReviews() {
  const source = api.enabled ? state.remoteReviews : [...demoReviews, ...state.userReviews];
  return source.filter((review) => state.moderation[review.id] !== 'hidden');
}
function getDishReviews(dishId) {
  return getAllReviews().filter((review) => review.dishId === dishId);
}
function reviewCardHTML(review, compact = false) {
  const dish = getDish(review.dishId);
  const ownerName = state.remoteUser?.display_name || state.demoUser?.name;
  const isOwner = Boolean(review.owner && ownerName && review.user === ownerName);
  const isDemo = review.demo;
  const dateLabel = formatDate(review.date, false);
  const reviewImages = review.images || (review.image ? [review.image] : []);
  const imageHTML = reviewImages.length ? `${isDemo ? `<span class="review-demo-photo-tag">${escapeHTML(t('reviewDemoImage'))}</span>` : ''}<div class="review-photo-gallery">${reviewImages.map((image) => `<img class="review-photo" src="${escapeHTML(image)}" alt="${escapeHTML(state.language === 'en' ? 'Review photo preview' : 'Yorum fotoğrafı önizlemesi')}" loading="lazy">`).join('')}</div>` : ''; 
  return `<article class="review-card" data-review-card="${escapeHTML(review.id)}">
    <div class="review-head"><span class="review-avatar">${escapeHTML(review.initial || review.user?.[0] || '?')}</span><span class="review-person"><strong>${escapeHTML(review.user || (state.language === 'en' ? 'Guest' : 'Misafir'))}</strong><small>${escapeHTML(dateLabel)}${isDemo ? ` · ${escapeHTML(t('reviewDemo'))}` : ''}</small></span><span class="review-dish">${escapeHTML(dish ? dishName(dish) : '')}</span></div>
    <p class="review-text">${escapeHTML(review.text).replace(/\n/g, '<br>')}</p>${imageHTML}
    ${compact ? '' : `<div class="review-actions">${isOwner ? `<button data-review-action="edit" data-review-id="${escapeHTML(review.id)}">${escapeHTML(t('edit'))}</button><button data-review-action="delete" data-review-id="${escapeHTML(review.id)}">${escapeHTML(t('delete'))}</button>` : `<button data-review-action="report" data-review-id="${escapeHTML(review.id)}">⚑ ${escapeHTML(t('report'))}</button>`}</div>`}
  </article>`;
}

function renderCommunity() {
  const sort = $('#review-sort')?.value || 'newest';
  const reviews = getAllReviews().sort((a, b) => sort === 'oldest' ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date));
  $('#community-feed').innerHTML = reviews.length ? reviews.map((review) => reviewCardHTML(review)).join('') : `<div class="empty-state"><span>✳</span><h3>${escapeHTML(t('noReviews'))}</h3></div>`;
  $('#review-count').textContent = reviews.length;
  $('#profile-review-count').textContent = api.enabled ? state.remoteReviews.filter((review) => review.owner).length : state.userReviews.filter((review) => review.owner).length;
  $('.demo-caption')?.classList.toggle('hidden', api.enabled);
  $('#admin-review-count').textContent = String(reviews.length).padStart(2, '0');
  renderModeration();
}

async function refreshAdminDashboard() {
  const accessNotice = $('#admin-access-notice');
  const stats = $('#admin-stats');
  const grid = $('#admin-grid');
  const infoBanner = $('#admin-info-banner');
  if (!api.enabled) {
    accessNotice?.classList.add('hidden');
    stats?.classList.remove('hidden');
    grid?.classList.remove('hidden');
    $('#admin-mode-badge').textContent = state.language === 'en' ? 'DEMO ADMIN' : 'DEMO YÖNETİCİ';
    $('#admin-info-banner p').textContent = t('adminDemoDisclaimer');
    return;
  }
  if (!state.remoteUser?.is_admin) {
    accessNotice?.classList.remove('hidden');
    $('#admin-access-message').textContent = state.language === 'en'
      ? 'Administrator access is required. Sign in with an administrator account to view management data.'
      : 'Yönetim verilerini görüntülemek için yönetici hesabıyla giriş yapmalısın.';
    stats?.classList.add('hidden');
    grid?.classList.add('hidden');
    infoBanner?.classList.add('hidden');
    $('#admin-mode-badge').textContent = state.language === 'en' ? 'ADMIN ACCESS REQUIRED' : 'YÖNETİCİ GİRİŞİ GEREKLİ';
    return;
  }
  accessNotice?.classList.add('hidden');
  stats?.classList.remove('hidden');
  grid?.classList.remove('hidden');
  infoBanner?.classList.remove('hidden');
  $('#admin-mode-badge').textContent = state.language === 'en' ? 'LIVE ADMIN' : 'CANLI YÖNETİM';
  $('#admin-info-banner p').textContent = state.language === 'en'
    ? 'Connected to the backend. OBS synchronization is still disabled until the university approves an access method.'
    : 'Backend bağlantısı kuruldu. Üniversite onaylı erişim yöntemi sağlanana kadar OBS senkronizasyonu devre dışıdır.';
  const [dishResult, missingResult, obsResult, reportResult] = await Promise.all([
    api.get('/dishes'), api.get('/admin/missing-data'), api.get('/admin/obs/status'), api.get('/admin/reports')
  ]);
  $('#admin-total-dishes').textContent = String(dishResult.count ?? dishResult.items?.length ?? 0);
  $('#admin-missing-count').textContent = String(missingResult.count ?? missingResult.items?.length ?? 0).padStart(2, '0');
  $('#admin-review-count').textContent = String(state.adminReviews.length).padStart(2, '0');
  $('#admin-obs-status').textContent = obsResult.connected
    ? (state.language === 'en' ? 'Connected' : 'Bağlı')
    : (state.language === 'en' ? 'Not connected' : 'Bağlı değil');
  $('#admin-obs-note').textContent = obsResult.message || (state.language === 'en' ? 'Approval required' : 'Yetkilendirme gerekli');
  const missingLabels = {
    photo: state.language === 'en' ? 'Photo' : 'Fotoğraf',
    ingredients: state.language === 'en' ? 'Ingredients' : 'Malzemeler',
    recipe: state.language === 'en' ? 'Recipe' : 'Tarif',
    nutrition: state.language === 'en' ? 'Nutrition values' : 'Besin değerleri'
  };
  const rows = missingResult.items || [];
  $('#missing-list').innerHTML = rows.length ? rows.map((item) => `
    <div class="missing-item"><span class="missing-thumb">◈</span><span><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML((item.missing || []).map((key) => missingLabels[key] || key).join(' · '))}</small></span><span class="pill pill-warning">${state.language === 'en' ? 'Missing' : 'Eksik'}</span></div>
  `).join('') : `<p class="muted small">${state.language === 'en' ? 'No missing dish data.' : 'Eksik yemek verisi bulunmuyor.'}</p>`;
  await refreshAdminReviews();
  $('#admin-review-count').textContent = String(state.adminReviews.length).padStart(2, '0');
  const reports = reportResult.items || [];
  $('#admin-report-list').innerHTML = reports.length ? reports.map((report) => `\n    <div class=\"moderation-row\"><span class=\"review-avatar\">⚑</span><span><strong>${escapeHTML(report.reporter)} → ${escapeHTML(report.review_user)}</strong><small>${escapeHTML(report.reason)} · ${escapeHTML(report.review_body)}</small></span><span class=\"pill ${report.status === 'open' ? 'pill-warning' : 'pill-success'}\">${escapeHTML(report.status)}</span><span class=\"moderation-actions\"><button data-report-moderate=\"resolved\" data-report-id=\"${report.id}\">${state.language === 'en' ? 'Resolve' : 'Çözüldü'}</button><button data-report-moderate=\"dismissed\" data-report-id=\"${report.id}\">${state.language === 'en' ? 'Dismiss' : 'Kapat'}</button></span></div>\n  `).join('') : `<p class=\"muted small\">${state.language === 'en' ? 'No user reports.' : 'Kullanıcı bildirimi bulunmuyor.'}</p>`;
  renderModeration();
}

function renderModeration() {
  const all = api.enabled && state.remoteUser?.is_admin ? state.adminReviews : [...state.userReviews, ...demoReviews];
  $('#moderation-list').innerHTML = all.length ? all.slice().reverse().map((review) => {
    const dish = getDish(review.dishId);
    const status = review.status || state.moderation[review.id] || 'published';
    return `<div class="moderation-row"><span class="review-avatar">${escapeHTML(review.initial || '?')}</span><span><strong>${escapeHTML(review.user)} · ${escapeHTML(dish ? dishName(dish) : '')}</strong><small>${escapeHTML(review.text)}</small></span><span class="pill ${status === 'hidden' ? 'pill-warning' : 'pill-success'}">${status === 'hidden' ? (state.language === 'en' ? 'Hidden' : 'Gizli') : (state.language === 'en' ? 'Published' : 'Yayında')}</span><span class="moderation-actions"><button data-moderate="show" data-review-id="${escapeHTML(review.id)}">${state.language === 'en' ? 'Show' : 'Onayla'}</button><button data-moderate="hide" data-review-id="${escapeHTML(review.id)}">${state.language === 'en' ? 'Hide' : 'Gizle'}</button></span></div>`;
  }).join('') : `<p class="muted small">${escapeHTML(t('noReviews'))}</p>`;
}

function nutritionMarkup(dish) {
  const values = [
    ['calories', dish.calories, 'kcal'], ['protein', dish.protein, 'g'], ['carbs', dish.carbs, 'g'],
    ['fat', dish.fat, 'g'], ['fiber', dish.fiber, 'g'], ['salt', dish.salt, 'g']
  ];
  return values.map(([key, value, unit]) => `<div class="nutrient-box"><strong>${value}</strong><small>${escapeHTML(t(key))} · ${unit}</small></div>`).join('');
}

function renderDishDetail(dishId) {
  const dish = getDish(dishId);
  if (!dish) return;
  state.activeDishId = dishId;
  const reviews = getDishReviews(dishId);
  const ingredients = state.language === 'en' ? dish.ingredientsEn : dish.ingredients;
  const steps = localized(dish, 'steps');
  const allergens = dish.allergens.length ? dish.allergens : [t('noKnownAllergens')];
  $('#dish-detail-content').innerHTML = `
    <button class="detail-back" data-nav="home">← ${escapeHTML(t('backToMenu'))}</button>
    <div class="detail-hero">
      <div class="detail-photo-wrap">${dishImage(dish)}<span class="image-disclaimer">${escapeHTML(t('representativeImage'))}</span></div>
      <div class="detail-copy"><p class="eyebrow"><span class="eyebrow-line"></span>${escapeHTML(dishCategory(dish).toLocaleUpperCase())} · ${escapeHTML(t('estimate').toLocaleUpperCase())}</p><h1>${escapeHTML(dishName(dish))}<span class="heading-period">.</span></h1><p class="detail-description">${escapeHTML(localized(dish, 'description'))}</p><div class="diet-tags">${tagsHTML(dish)}</div><div class="detail-stats"><div class="detail-stat"><strong>${dish.calories}</strong><small>kcal / ${escapeHTML(dish.portion)}</small></div><div class="detail-stat"><strong>${escapeHTML(dish.prep)}</strong><small>${escapeHTML(t('prepTime'))}</small></div><div class="detail-stat"><strong>${escapeHTML(dish.cook)}</strong><small>${escapeHTML(t('cookTime'))}</small></div></div><button class="button button-dark" data-review-for="${dish.id}">${escapeHTML(t('addReview'))}<span>↗</span></button></div>
    </div>
    <section class="detail-section"><div class="detail-columns"><div class="detail-info-card"><div class="detail-section-head"><div><p class="eyebrow">01 / ${escapeHTML(t('ingredients').toLocaleUpperCase())}</p><h2>${escapeHTML(t('ingredients'))}</h2></div><span class="pill pill-muted">${escapeHTML(dish.portion)}</span></div><div class="ingredient-list">${ingredients.map(([name, amount]) => `<div class="ingredient-row"><span>${escapeHTML(name)}</span><span>${escapeHTML(amount)}</span></div>`).join('')}</div></div><div class="detail-info-card"><div class="detail-section-head"><div><p class="eyebrow">02 / ${escapeHTML(t('recipe').toLocaleUpperCase())}</p><h2>${escapeHTML(t('recipe'))}</h2></div></div>${steps.map((step, index) => `<div class="recipe-step"><b>0${index + 1}</b><span>${escapeHTML(step)}</span></div>`).join('')}<p class="detail-note">ⓘ ${escapeHTML(t('approximateRecipe'))}</p></div></div></section>
    <section class="detail-section"><div class="detail-columns"><div class="detail-info-card"><div class="detail-section-head"><div><p class="eyebrow">03 / ${escapeHTML(t('nutritionFacts').toLocaleUpperCase())}</p><h2>${escapeHTML(t('nutritionFacts'))}</h2></div><span class="pill pill-warning">${escapeHTML(t('estimate'))}</span></div><div class="nutrient-grid">${nutritionMarkup(dish)}</div><p class="detail-note">ⓘ ${escapeHTML(t('nutritionEstimateNote'))}</p></div><div class="detail-info-card"><div class="detail-section-head"><div><p class="eyebrow">04 / ${escapeHTML(t('allergens').toLocaleUpperCase())}</p><h2>${escapeHTML(t('allergens'))}</h2></div></div><div class="allergen-list">${allergens.map((allergen) => `<span class="allergen-chip">${escapeHTML(allergen)}</span>`).join('')}</div><p class="detail-note">${escapeHTML(t('allergenUnknown'))}. ${escapeHTML(state.language === 'en' ? 'Cross-contact has not been verified.' : 'Çapraz bulaşma bilgisi doğrulanmamıştır.')}</p></div></div></section>
    <section class="detail-section"><div class="detail-section-head"><div><p class="eyebrow">05 / ${escapeHTML(t('communitySection'))}</p><h2>${escapeHTML(t('dishReviews'))}</h2></div><button class="text-button" data-review-for="${dish.id}"><span>${escapeHTML(t('addReview'))}</span><span>↗</span></button></div><div class="review-feed">${reviews.length ? reviews.map((review) => reviewCardHTML(review)).join('') : `<div class="info-banner"><span class="info-banner-icon">✳</span><p>${escapeHTML(t('noDishReviews'))}</p></div>`}</div></section>
  `;
  showPage('detail');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showPage(page) {
  state.page = page;
  $$('.page').forEach((element) => element.classList.toggle('active', element.dataset.page === page));
  $$('.nav-link').forEach((button) => button.classList.toggle('active', button.dataset.nav === page || (page === 'detail' && button.dataset.nav === 'discover')));
  $('#mobile-nav').classList.remove('open');
  $('#mobile-menu-button').setAttribute('aria-expanded', 'false');
  if (page === 'community') renderCommunity();
  if (page === 'discover') renderDiscover();
  if (page === 'profile') renderCommunity();
  if (page === 'admin') { refreshAdminDashboard().catch((error) => showToast(error.message)); renderModeration(); }
  if (page !== 'detail') window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openModal(content) {
  $('#modal-root').innerHTML = `<div class="modal-card" role="dialog" aria-modal="true">${content}<button class="modal-close" type="button" aria-label="${escapeHTML(t('close'))}" id="modal-close">×</button></div>`;
  $('#modal-close').addEventListener('click', closeModal);
}
function closeModal() {
  $('#modal-root').innerHTML = '';
  state.pendingPhotos = [];
}

function openAuthModal() {
  if (api.enabled) {
    openRemoteAuthModal();
    return;
  }
  openModal(`<p class="eyebrow"><span class="eyebrow-line"></span>SMART MEAL GUIDE · DEMO</p><h2>${escapeHTML(t('demoLoginTitle'))}</h2><p class="modal-lead">${escapeHTML(t('demoLoginLead'))}</p><form id="demo-login-form"><div class="form-field"><label for="display-name">${escapeHTML(t('displayName'))}</label><input id="display-name" name="displayName" maxlength="28" required value="${escapeHTML(state.demoUser?.name || '')}" placeholder="${escapeHTML(state.language === 'en' ? 'Your display name' : 'Görünen adın')}"></div><button class="button button-dark button-full" type="submit">${escapeHTML(t('continueDemo'))} ↗</button></form><p class="form-footnote">${escapeHTML(t('authDisclaimer'))}</p>`);
  $('#demo-login-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = $('#display-name').value.trim();
    if (!name) return;
    state.demoUser = { name, initial: name.slice(0, 1).toLocaleUpperCase(state.language === 'tr' ? 'tr-TR' : 'en-GB') };
    writeJSON(STORAGE_KEYS.user, state.demoUser);
    closeModal();
    $('#profile-name').textContent = state.language === 'en' ? `${name}'s demo profile` : `${name} adlı demo profil`;
    $('.profile-button .avatar').textContent = state.demoUser.initial;
    $('#profile-trigger .avatar').textContent = state.demoUser.initial;
    showToast(t('demoAccount'));
    if (state.pendingReviewDish) {
      const dishId = state.pendingReviewDish;
      state.pendingReviewDish = null;
      openReviewModal(dishId);
    }
  });
}

function openRemoteAuthModal() {
  const loginLabel = state.language === 'en' ? 'Sign in' : 'Giriş yap';
  const registerLabel = state.language === 'en' ? 'Create account' : 'Hesap oluştur';
  const displayLabel = state.language === 'en' ? 'Display name' : 'Görünen ad';
  const emailLabel = state.language === 'en' ? 'Email' : 'E-posta';
  const passwordLabel = state.language === 'en' ? 'Password' : 'Şifre';
  const intro = state.language === 'en' ? 'Use your Smart Meal Guide account to contribute.' : 'Yorum paylaşmak için Smart Meal Guide hesabınla giriş yap.';
  openModal(`<p class="eyebrow"><span class="eyebrow-line"></span>SMART MEAL GUIDE · ACCOUNT</p><h2>${state.language === 'en' ? 'Welcome' : 'Hoş geldin'}</h2><p class="modal-lead">${escapeHTML(intro)}</p><form id="remote-auth-form"><div class="form-field"><label for="auth-mode">${state.language === 'en' ? 'Operation' : 'İşlem'}</label><select id="auth-mode"><option value="login">${loginLabel}</option><option value="register">${registerLabel}</option></select></div><div class="form-field hidden" id="auth-display-wrap"><label for="auth-display-name">${escapeHTML(displayLabel)}</label><input id="auth-display-name" maxlength="40" minlength="2" autocomplete="nickname"></div><div class="form-field"><label for="auth-email">${escapeHTML(emailLabel)}</label><input id="auth-email" type="email" required autocomplete="email"></div><div class="form-field"><label for="auth-password">${escapeHTML(passwordLabel)}</label><input id="auth-password" type="password" required minlength="10" maxlength="128" autocomplete="current-password"></div><button class="button button-dark button-full" type="submit" id="auth-submit">${loginLabel} ↗</button></form><p class="form-footnote">${state.language === 'en' ? 'The backend checks the account. Your password is never stored in this browser application.' : 'Hesap doğrulaması backend üzerinde yapılır. Şifren uygulama koduna kaydedilmez.'}</p>`);
  const mode = $('#auth-mode');
  const displayWrap = $('#auth-display-wrap');
  const password = $('#auth-password');
  const submit = $('#auth-submit');
  mode.addEventListener('change', () => {
    const register = mode.value === 'register';
    displayWrap.classList.toggle('hidden', !register);
    $('#auth-display-name').required = register;
    password.autocomplete = register ? 'new-password' : 'current-password';
    submit.textContent = `${register ? registerLabel : loginLabel} ↗`;
  });
  $('#remote-auth-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    try {
      const operation = mode.value;
      const payload = { email: $('#auth-email').value.trim(), password: password.value };
      if (operation === 'register') payload.display_name = $('#auth-display-name').value.trim();
      state.remoteUser = await api.post(`/auth/${operation}`, payload);
      state.demoUser = null;
      await refreshRemoteReviews();
      if (state.remoteUser?.is_admin) { await refreshAdminReviews(); await refreshAdminDashboard(); }
      closeModal();
      renderProfile(); renderCommunity();
      showToast(state.language === 'en' ? 'Signed in successfully.' : 'Hesap girişi başarılı.');
      if (state.pendingReviewDish) {
        const dishId = state.pendingReviewDish;
        state.pendingReviewDish = null;
        openReviewModal(dishId);
      }
    } catch (error) {
      showToast(error.message || (state.language === 'en' ? 'Could not sign in.' : 'Giriş yapılamadı.'));
    } finally {
      submit.disabled = false;
    }
  });
}

async function refreshRemoteReviews() {
  if (!api.enabled) return;
  const result = await api.get('/reviews/recent?limit=100');
  state.remoteReviews = (result.items || []).map((review) => {
    const name = review.user || 'Member';
    return {
      id: `api-${review.id}`,
      remoteId: review.id,
      userId: review.userId,
      user: name,
      initial: name.slice(0, 1).toLocaleUpperCase(state.language === 'tr' ? 'tr-TR' : 'en-GB'),
      dishId: review.dishId,
      text: review.text,
      date: review.date,
      images: (review.images || []).map((image) => api.asset(image)),
      owner: Boolean(state.remoteUser && Number(review.userId) === Number(state.remoteUser.id)),
      status: review.status,
      demo: false
    };
  });
}

async function refreshAdminReviews() {
  if (!api.enabled || !state.remoteUser?.is_admin) return;
  const result = await api.get('/admin/reviews');
  state.adminReviews = (result.items || []).map((review) => {
    const name = review.user || 'Member';
    return {
      id: `api-${review.id}`, remoteId: review.id, user: name,
      initial: name.slice(0, 1).toLocaleUpperCase(state.language === 'tr' ? 'tr-TR' : 'en-GB'),
      dishId: review.dish_id, text: review.body, date: review.created_at,
      images: (review.images || []).map((image) => api.asset(image)),
      owner: false, status: review.status, demo: false
    };
  });
}

async function loadRemoteContent() {
  if (!api.enabled) return;
  try {
    try { state.remoteUser = await api.get('/auth/me'); } catch { state.remoteUser = null; }
    const dishResult = await api.get('/dishes');
    if (Array.isArray(dishResult.items) && dishResult.items.length) dishes = dishResult.items;
    const menuResult = await api.get('/menus/active');
    if (menuResult.menu?.items?.length) {
      const names = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
      const namesEn = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const grouped = Array.from({ length: 5 }, () => []);
      for (const item of menuResult.menu.items) {
        const index = Number.isInteger(item.day_index) ? item.day_index : -1;
        const matched = item.dish_id ? getDish(item.dish_id) : dishes.find((d) => d.name.toLocaleLowerCase('tr-TR') === String(item.original_dish_name).toLocaleLowerCase('tr-TR'));
        if (index >= 0 && index < 5 && matched) grouped[index].push(matched.id);
      }
      const start = menuResult.menu.week_start_date ? new Date(`${menuResult.menu.week_start_date}T00:00:00`) : null;
      weekMenu = grouped.map((items, index) => ({
        day: names[index], dayEn: namesEn[index], short: ['Pzt','Sal','Çar','Per','Cum'][index],
        date: start && !Number.isNaN(start.getTime()) ? String(new Date(start.getTime() + index * 86400000).getDate()) : '—',
        items
      }));
    }
    await refreshRemoteReviews();
    if (state.remoteUser?.is_admin) await refreshAdminReviews();
  } catch (error) {
    console.warn('Backend content could not be loaded; demo content remains available.', error);
    showToast(state.language === 'en' ? 'Backend unavailable. Showing demo content.' : 'Backend erişilemiyor. Örnek içerik gösteriliyor.');
  }
}

async function uploadPendingPhotos(reviewId) {
  if (!state.pendingPhotos.length) return;
  const formData = new FormData();
  for (let index = 0; index < state.pendingPhotos.length; index += 1) {
    const response = await fetch(state.pendingPhotos[index]);
    const blob = await response.blob();
    formData.append('files', blob, `review-${index + 1}.jpg`);
  }
  await api.upload(`/reviews/${reviewId}/images`, formData);
}

function openReviewModal(dishId = null, editId = null) {
  if ((api.enabled && !state.remoteUser) || (!api.enabled && !state.demoUser)) {
    state.pendingReviewDish = dishId;
    openAuthModal();
    return;
  }
  const existing = editId ? getAllReviews().find((review) => review.id === editId && review.owner) : null;
  if (editId && !existing) return;
  state.pendingPhotos = existing?.remoteId ? [] : (existing?.images ? [...existing.images] : (existing?.image ? [existing.image] : []));
  const selectedId = dishId || existing?.dishId || state.activeDishId || weekMenu[state.selectedDay]?.items?.[0] || dishes[0]?.id;
  const options = dishes.map((dish) => `<option value="${escapeHTML(dish.id)}" ${dish.id === selectedId ? 'selected' : ''}>${escapeHTML(dishName(dish))}</option>`).join('');
  const preview = `<div id="photo-preview">${state.pendingPhotos.map((image, index) => `<div class="upload-preview"><img src="${escapeHTML(image)}" alt="Photo preview"><button type="button" data-remove-photo="${index}">${escapeHTML(t('previewRemove'))}</button></div>`).join('')}</div>`;
  const reviewEyebrow = api.enabled ? 'COMMUNITY' : 'COMMUNITY · DEMO';
  const reviewLead = api.enabled ? (state.language === 'en' ? 'Your review and photos will be saved to the connected service.' : 'Yorumun ve fotoğrafların bağlı sunucuya kaydedilecek.') : t('reviewLocal');
  openModal(`<p class="eyebrow"><span class="eyebrow-line"></span>${reviewEyebrow}</p><h2>${escapeHTML(existing ? t('edit') : t('writeReview'))}</h2><p class="modal-lead">${escapeHTML(reviewLead)}</p><form id="review-form"><div class="form-field"><label for="review-dish">${escapeHTML(t('selectDish'))}</label><select id="review-dish" required>${options}</select></div><div class="form-field"><label for="review-copy">${escapeHTML(t('reviewText'))}</label><textarea id="review-copy" maxlength="1200" required placeholder="${escapeHTML(t('reviewPlaceholder'))}">${escapeHTML(existing?.text || '')}</textarea></div><div class="form-field"><label for="review-photo-input">${escapeHTML(t('addPhoto'))}</label><input type="file" id="review-photo-input" accept="image/jpeg,image/png,image/webp" multiple><small class="muted">${escapeHTML(t('photoHint'))}</small>${preview}</div><button class="button button-dark button-full" type="submit">${escapeHTML(existing ? t('saveChanges') : t('sendReview'))} ↗</button></form><p class="form-footnote">${escapeHTML(t('authDisclaimer'))}</p>`);

  $('#review-photo-input').addEventListener('change', async (event) => {
    const files = [...(event.target.files || [])];
    if (!files.length) return;
    if (state.pendingPhotos.length + files.length > 4) {
      showToast(state.language === 'en' ? 'You can add up to 4 photos.' : 'En fazla 4 fotoğraf ekleyebilirsin.');
      event.target.value = ''; return;
    }
    if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
      showToast(t('invalidImage')); event.target.value = ''; return;
    }
    if (files.some((file) => file.size > 8 * 1024 * 1024)) {
      showToast(t('imageTooLarge')); event.target.value = ''; return;
    }
    try {
      const compressed = await Promise.all(files.map(compressImage));
      state.pendingPhotos.push(...compressed);
      renderPhotoPreview(state.pendingPhotos);
    } catch (error) {
      console.error(error);
      showToast(t('invalidImage'));
    }
    event.target.value = '';
  });
  $('#photo-preview').addEventListener('click', (event) => {
    const remove = event.target.closest('[data-remove-photo]');
    if (!remove) return;
    state.pendingPhotos.splice(Number(remove.dataset.removePhoto), 1);
    renderPhotoPreview(state.pendingPhotos);
  });
  $('#review-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = $('#review-copy').value.trim();
    if (!text) { showToast(t('reviewRequired')); return; }
    const selectedDish = $('#review-dish').value;
    const submitButton = $('#review-form button[type="submit"]');
    submitButton.disabled = true;
    try {
      if (api.enabled) {
        let reviewId;
        if (existing?.remoteId) {
          await api.patch(`/reviews/${existing.remoteId}`, { dish_id: selectedDish, body: text });
          reviewId = existing.remoteId;
        } else {
          const created = await api.post('/reviews', { dish_id: selectedDish, body: text });
          reviewId = created.id;
        }
        await uploadPendingPhotos(reviewId);
        await refreshRemoteReviews();
        closeModal();
        renderCommunity();
        if (state.page === 'detail' && state.activeDishId) renderDishDetail(state.activeDishId);
        showToast(state.language === 'en' ? 'Your review has been saved.' : 'Yorumun sunucuya kaydedildi.');
        return;
      }
      if (existing) {
        existing.dishId = selectedDish;
        existing.text = text;
        existing.images = [...state.pendingPhotos];
        existing.date = new Date().toISOString();
        writeJSON(STORAGE_KEYS.reviews, state.userReviews);
        closeModal();
        renderCommunity();
        if (state.page === 'detail' && state.activeDishId) renderDishDetail(state.activeDishId);
        showToast(t('reviewUpdated'));
        return;
      }
      const name = state.demoUser.name;
      const review = {
        id: `local-${Date.now()}`,
        user: name,
        initial: name.slice(0, 1).toLocaleUpperCase(state.language === 'tr' ? 'tr-TR' : 'en-GB'),
        dishId: selectedDish,
        text,
        date: new Date().toISOString(),
        images: [...state.pendingPhotos],
        owner: true,
        demo: false
      };
      state.userReviews.push(review);
      writeJSON(STORAGE_KEYS.reviews, state.userReviews);
      closeModal();
      if (state.page === 'detail') renderDishDetail(review.dishId);
      else renderCommunity();
      showToast(t('reviewSaved'));
    } catch (error) {
      showToast(error.message || (state.language === 'en' ? 'Review could not be saved.' : 'Yorum kaydedilemedi.'));
    } finally {
      if ($('#review-form button[type="submit"]')) $('#review-form button[type="submit"]').disabled = false;
    }
  });
}

function renderPhotoPreview(images) {
  $('#photo-preview').innerHTML = images.map((dataURL, index) => `<div class="upload-preview"><img src="${escapeHTML(dataURL)}" alt="Photo preview"><button type="button" data-remove-photo="${index}">${escapeHTML(t('previewRemove'))}</button></div>`).join('');
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('File read failed'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Image decode failed'));
      image.onload = () => {
        const maxDimension = 1200;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) return reject(new Error('Canvas unavailable'));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function reportReview(reviewId) {
  if (api.enabled) {
    if (!state.remoteUser) { openAuthModal(); return; }
    const review = getAllReviews().find((item) => item.id === reviewId);
    if (!review?.remoteId) return;
    api.post(`/reviews/${review.remoteId}/report`, { reason: 'User reported this review for administrator review.' })
      .then(() => showToast(t('reviewReported'))).catch((error) => showToast(error.message));
    return;
  }
  if (!state.demoUser) { openAuthModal(); return; }
  if (!state.reports.includes(reviewId)) state.reports.push(reviewId);
  writeJSON(STORAGE_KEYS.reports, state.reports);
  showToast(t('reviewReported'));
}

function handleReviewAction(action, reviewId) {
  const review = getAllReviews().find((item) => item.id === reviewId);
  if (!review) return;
  if (action === 'edit') {
    if (!review.owner) return;
    openReviewModal(review.dishId, reviewId);
  } else if (action === 'delete') {
    if (!review.owner) return;
    const confirmed = window.confirm(state.language === 'en' ? 'Delete this review?' : 'Bu yorumu silmek istiyor musun?');
    if (!confirmed) return;
    if (api.enabled && review.remoteId) {
      api.delete(`/reviews/${review.remoteId}`).then(async () => {
        await refreshRemoteReviews(); renderCommunity();
        if (state.page === 'detail' && state.activeDishId) renderDishDetail(state.activeDishId);
        showToast(t('reviewDeleted'));
      }).catch((error) => showToast(error.message));
      return;
    }
    state.userReviews = state.userReviews.filter((item) => item.id !== reviewId);
    writeJSON(STORAGE_KEYS.reviews, state.userReviews);
    renderCommunity();
    if (state.page === 'detail' && state.activeDishId) renderDishDetail(state.activeDishId);
    showToast(t('reviewDeleted'));
  } else if (action === 'report') {
    reportReview(reviewId);
  }
}

function renderProfile() {
  const name = state.remoteUser?.display_name || state.demoUser?.name || (state.language === 'en' ? 'Demo visitor' : 'Demo ziyaretçisi');
  const initials = state.remoteUser?.display_name?.[0] || state.demoUser?.initial || 'A';
  $('#profile-name').textContent = api.enabled ? name : (state.language === 'en' ? `${name}'s demo profile` : `${name} adlı demo profil`);
  const profileStatus = $('#profile-status');
  if (profileStatus) profileStatus.textContent = api.enabled ? (state.remoteUser ? (state.language === 'en' ? 'Connected account' : 'Bağlı kullanıcı hesabı') : (state.language === 'en' ? 'Not signed in' : 'Oturum açılmadı')) : t('demoAccount');
  $('#profile-edit').textContent = api.enabled ? (state.remoteUser ? (state.language === 'en' ? 'Account' : 'Hesap işlemleri') : (state.language === 'en' ? 'Sign in / Register' : 'Giriş yap / Kayıt ol')) : t('editProfile');
  $('#profile-logout').classList.toggle('hidden', api.enabled ? !state.remoteUser : !state.demoUser);
  $('#profile-review-count').textContent = api.enabled ? state.remoteReviews.filter((review) => review.owner).length : state.userReviews.filter((review) => review.owner).length;
  const accountState = $('#profile-account-state');
  if (accountState) accountState.textContent = api.enabled ? (state.remoteUser ? (state.remoteUser.is_admin ? 'ADMIN' : 'ACTIVE') : 'GUEST') : (state.demoUser ? 'DEMO' : 'GUEST');
  $('#profile-trigger .avatar').textContent = initials;
  $('.profile-button .avatar').textContent = initials;
}

function handlePDFSelection(file) {
  const status = $('#pdf-status');
  if (!file) return;
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    status.textContent = t('pdfInvalid'); showToast(t('pdfInvalid')); return;
  }
  if (file.size > 15 * 1024 * 1024) {
    status.textContent = t('pdfTooLarge'); showToast(t('pdfTooLarge')); return;
  }
  if (api.enabled) {
    status.textContent = state.language === 'en' ? 'Uploading and extracting PDF…' : 'PDF yükleniyor ve metni çıkarılıyor…';
    const formData = new FormData(); formData.append('file', file);
    api.upload('/admin/menus/import', formData).then((result) => {
      status.textContent = `${file.name} · ${result.items_found} ${state.language === 'en' ? 'draft items detected' : 'taslak yemek satırı bulundu'}`;
      showToast(state.language === 'en' ? 'PDF imported; administrator review is required.' : 'PDF içe aktarıldı; yönetici kontrolü gerekli.');
    }).catch((error) => { status.textContent = error.message; showToast(error.message); });
  } else {
    status.textContent = `${file.name} — ${t('pdfSelected')}`;
    showToast(t('pdfSelected'));
  }
}

function bindEvents() {
  $('#modal-root').addEventListener('click', (event) => { if (event.target.id === 'modal-root') closeModal(); });
  document.addEventListener('keydown', (event) => {
    const interactiveDish = event.target.closest?.('[data-open-dish]');
    if (interactiveDish && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); interactiveDish.click(); }
  });
  document.addEventListener('click', (event) => {
    const nav = event.target.closest('[data-nav]');
    if (nav) {
      const page = nav.dataset.nav;
      showPage(page);
      if (nav.dataset.scroll && page === 'home') {
        window.setTimeout(() => $('#daily-menu').scrollIntoView({ behavior: 'smooth' }), 50);
      }
      return;
    }
    const dishTarget = event.target.closest('[data-open-dish]');
    if (dishTarget) { renderDishDetail(dishTarget.dataset.openDish); return; }
    const reviewFor = event.target.closest('[data-review-for]');
    if (reviewFor) { openReviewModal(reviewFor.dataset.reviewFor); return; }
    const dayButton = event.target.closest('[data-day]');
    if (dayButton) {
      state.selectedDay = Number(dayButton.dataset.day);
      renderDaySelector();
      renderDailyMenu();
      return;
    }
    const dayOpen = event.target.closest('[data-day-open]');
    if (dayOpen) {
      state.selectedDay = Number(dayOpen.dataset.dayOpen);
      renderDaySelector(); renderDailyMenu(); showPage('home');
      window.setTimeout(() => $('#daily-menu').scrollIntoView({ behavior: 'smooth' }), 50);
      return;
    }
    const chip = event.target.closest('[data-filter]');
    if (chip) {
      const filter = chip.dataset.filter;
      state.filters.has(filter) ? state.filters.delete(filter) : state.filters.add(filter);
      renderDiscover();
      return;
    }
    const reviewAction = event.target.closest('[data-review-action]');
    if (reviewAction) { handleReviewAction(reviewAction.dataset.reviewAction, reviewAction.dataset.reviewId); return; }
    const reportModerate = event.target.closest('[data-report-moderate]');
    if (reportModerate) {
      if (!api.enabled || !state.remoteUser?.is_admin) { showToast(state.language === 'en' ? 'Administrator access is required.' : 'Yönetici yetkisi gerekli.'); return; }
      api.patch(`/admin/reports/${reportModerate.dataset.reportId}`, { status: reportModerate.dataset.reportModerate })
        .then(() => refreshAdminDashboard())
        .then(() => showToast(state.language === 'en' ? 'Report status updated.' : 'Bildirim durumu güncellendi.'))
        .catch((error) => showToast(error.message));
      return;
    }
    const moderate = event.target.closest('[data-moderate]');
    if (moderate) {
      const status = moderate.dataset.moderate === 'hide' ? 'hidden' : 'published';
      if (api.enabled) {
        const review = state.adminReviews.find((item) => item.id === moderate.dataset.reviewId);
        if (!review?.remoteId || !state.remoteUser?.is_admin) { showToast(state.language === 'en' ? 'Administrator access is required.' : 'Yönetici yetkisi gerekli.'); return; }
        api.patch(`/admin/reviews/${review.remoteId}/moderation`, { status }).then(async () => {
          await refreshAdminReviews(); await refreshRemoteReviews(); renderModeration(); renderCommunity();
          showToast(status === 'hidden' ? t('reviewHidden') : t('reviewApproved'));
        }).catch((error) => showToast(error.message));
      } else {
        state.moderation[moderate.dataset.reviewId] = status;
        writeJSON(STORAGE_KEYS.moderation, state.moderation);
        renderModeration(); renderCommunity();
        showToast(status === 'hidden' ? t('reviewHidden') : t('reviewApproved'));
      }
      return;
    }
  });

  $('#day-selector').addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-day]')) event.target.click();
  });
  $('#dish-search').addEventListener('input', (event) => { state.search = event.target.value; renderDiscover(); });
  $('#filter-toggle').addEventListener('click', () => $('#filter-panel').classList.toggle('hidden'));
  $('#clear-filters').addEventListener('click', () => { state.filters.clear(); state.search = ''; $('#dish-search').value = ''; renderDiscover(); });
  $('#review-sort').addEventListener('change', renderCommunity);
  $('#community-write').addEventListener('click', () => openReviewModal());
  $('#profile-trigger').addEventListener('click', () => { renderProfile(); showPage('profile'); });
  $('#profile-edit').addEventListener('click', openAuthModal);
  $('#profile-logout')?.addEventListener('click', async () => {
    if (api.enabled) {
      try { await api.post('/auth/logout', {}); } catch (error) { showToast(error.message); return; }
      state.remoteUser = null; state.adminReviews = [];
      await refreshRemoteReviews(); renderProfile(); renderCommunity();
      showToast(state.language === 'en' ? 'Signed out.' : 'Oturum kapatıldı.');
    } else {
      state.demoUser = null;
      try { localStorage.removeItem(STORAGE_KEYS.user); } catch { /* ignore */ }
      renderProfile(); showToast(state.language === 'en' ? 'Demo profile cleared.' : 'Demo profil kapatıldı.');
    }
  });
  $('#search-trigger').addEventListener('click', () => { showPage('discover'); window.setTimeout(() => $('#dish-search').focus(), 80); });
  $('#language-toggle').addEventListener('click', () => {
    state.language = state.language === 'tr' ? 'en' : 'tr';
    writeJSON(STORAGE_KEYS.language, state.language);
    try { localStorage.setItem(STORAGE_KEYS.language, state.language); } catch { /* ignore */ }
    applyTranslations(); renderDailyMenu(); renderFeatured(); renderWeekly(); renderDiscover(); renderCommunity(); renderProfile();
    if (state.page === 'detail' && state.activeDishId) renderDishDetail(state.activeDishId);
  });
  $('#mobile-menu-button').addEventListener('click', () => {
    const nav = $('#mobile-nav');
    nav.classList.toggle('open');
    $('#mobile-menu-button').setAttribute('aria-expanded', String(nav.classList.contains('open')));
  });
  $('#choose-pdf').addEventListener('click', () => $('#pdf-upload').click());
  $('#pdf-upload').addEventListener('change', (event) => handlePDFSelection(event.target.files?.[0]));
  $('#back-to-top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault(); showPage('discover'); window.setTimeout(() => $('#dish-search').focus(), 80);
    }
  });
}

async function init() {
  await loadLocales();
  await loadRemoteContent();
  applyTranslations();
  renderDaySelector();
  renderDailyMenu();
  renderFeatured();
  renderWeekly();
  renderDiscover();
  renderCommunity();
  renderProfile();
  bindEvents();
  if (state.language === 'en') applyTranslations();
}

init();
