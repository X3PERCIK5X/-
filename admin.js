const DRAFT_KEY = 'admin_catalog_v2_draft';
const HOLD_MS = 5000;

const state = {
  config: {},
  categories: [],
  products: [],
  currentScreen: 'home',
  currentCategoryId: null,
  currentProductId: null,
};

const ui = {
  screens: {
    home: document.getElementById('screen-home'),
    categories: document.getElementById('screen-categories'),
    products: document.getElementById('screen-products'),
    product: document.getElementById('screen-product'),
    publish: document.getElementById('screen-publish'),
  },
  navButtons: Array.from(document.querySelectorAll('.bottom-item')),
  saveDraftBtn: document.getElementById('saveDraftBtn'),
  reloadBtn: document.getElementById('reloadBtn'),

  addBannerBtn: document.getElementById('addBannerBtn'),
  addArticleBtn: document.getElementById('addArticleBtn'),
  addStoreBtn: document.getElementById('addStoreBtn'),
  addCategoryBtn: document.getElementById('addCategoryBtn'),
  addProductBtn: document.getElementById('addProductBtn'),
  addImageBtn: document.getElementById('addImageBtn'),
  addSpecBtn: document.getElementById('addSpecBtn'),

  bannersList: document.getElementById('bannersList'),
  articlesList: document.getElementById('articlesList'),
  storesList: document.getElementById('storesList'),
  categoriesGrid: document.getElementById('categoriesGrid'),
  productsGrid: document.getElementById('productsGrid'),
  productsTitle: document.getElementById('productsTitle'),
  productCard: document.getElementById('productCard'),

  aboutPreview: document.getElementById('aboutPreview'),
  productionPreview: document.getElementById('productionPreview'),
  paymentPreview: document.getElementById('paymentPreview'),
  contactsPreview: document.getElementById('contactsPreview'),

  status: document.getElementById('status'),
  downloadConfigBtn: document.getElementById('downloadConfigBtn'),
  downloadCategoriesBtn: document.getElementById('downloadCategoriesBtn'),
  downloadProductsBtn: document.getElementById('downloadProductsBtn'),
  sendToBotBtn: document.getElementById('sendToBotBtn'),

  editorModal: document.getElementById('editorModal'),
  editorTitle: document.getElementById('editorTitle'),
  editorInput: document.getElementById('editorInput'),
  editorTextarea: document.getElementById('editorTextarea'),
  editorCancel: document.getElementById('editorCancel'),
  editorSave: document.getElementById('editorSave'),
};

let editorSubmit = null;

function setStatus(text, error = false) {
  ui.status.textContent = text;
  ui.status.style.color = error ? '#ff9f9f' : '#9aabcf';
}

function safe(v, fallback) {
  try { return JSON.parse(v); } catch { return fallback; }
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function screen(name) {
  state.currentScreen = name;
  Object.entries(ui.screens).forEach(([k, el]) => el.classList.toggle('active', k === name));
  ui.navButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.screen === name));
}

function openEditor({ title, value = '', multiline = false, onSave }) {
  ui.editorTitle.textContent = title;
  ui.editorInput.classList.toggle('hidden', multiline);
  ui.editorTextarea.classList.toggle('hidden', !multiline);
  if (multiline) {
    ui.editorTextarea.value = value;
    ui.editorTextarea.focus();
  } else {
    ui.editorInput.value = value;
    ui.editorInput.focus();
  }
  editorSubmit = onSave;
  ui.editorModal.classList.remove('hidden');
  ui.editorModal.setAttribute('aria-hidden', 'false');
}

function closeEditor() {
  editorSubmit = null;
  ui.editorModal.classList.add('hidden');
  ui.editorModal.setAttribute('aria-hidden', 'true');
}

function bindHold(el, cb) {
  if (!el) return;
  let timer = null;
  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    el.classList.remove('hold-progress');
  };

  const start = (e) => {
    if (e.type === 'mousedown' && e.button !== 0) return;
    clear();
    el.classList.add('hold-progress');
    timer = setTimeout(() => {
      el.classList.remove('hold-progress');
      timer = null;
      cb();
    }, HOLD_MS);
  };

  el.addEventListener('mousedown', start);
  el.addEventListener('touchstart', start, { passive: true });
  ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach((ev) => el.addEventListener(ev, clear, { passive: true }));
}

function makeHoldEdit(el, { title, value, multiline = false, onSave }) {
  el.classList.add('holdable');
  bindHold(el, () => openEditor({ title, value: value(), multiline, onSave }));
}

function excerpt(text) {
  const clean = String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return clean.length > 120 ? `${clean.slice(0, 120)}…` : clean;
}

function categoryById(id) {
  return state.categories.find((c) => c.id === id);
}

function productById(id) {
  return state.products.find((p) => p.id === id);
}

function renderHome() {
  const banners = Array.isArray(state.config.homeBanners) ? state.config.homeBanners : [];
  ui.bannersList.innerHTML = '';
  banners.forEach((b, i) => {
    const card = document.createElement('article');
    card.className = 'banner-card';
    card.style.backgroundImage = `url('${b.image || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1400&q=70'}')`;
    card.innerHTML = `
      <span class="chip">${b.kicker || 'Баннер'}</span>
      <h3>${b.title || 'Заголовок'}</h3>
      <p>${b.text || ''}</p>
      <small>${b.cta || ''}</small>
    `;

    makeHoldEdit(card, {
      title: `Баннер #${i + 1}: JSON`,
      value: () => JSON.stringify(b, null, 2),
      multiline: true,
      onSave: (val) => {
        const parsed = safe(val, null);
        if (!parsed || typeof parsed !== 'object') return;
        banners[i] = parsed;
        renderHome();
      },
    });
    ui.bannersList.appendChild(card);
  });

  const articles = Array.isArray(state.config.homeArticles) ? state.config.homeArticles : [];
  ui.articlesList.innerHTML = '';
  articles.forEach((a, i) => {
    const card = document.createElement('article');
    card.className = 'article-card';
    card.innerHTML = `
      <span class="chip">${a.kicker || 'Статья'}</span>
      <h3>${a.title || 'Без заголовка'}</h3>
      <p>${a.text || ''}</p>
    `;
    makeHoldEdit(card, {
      title: `Статья #${i + 1}: JSON`,
      value: () => JSON.stringify(a, null, 2),
      multiline: true,
      onSave: (val) => {
        const parsed = safe(val, null);
        if (!parsed || typeof parsed !== 'object') return;
        articles[i] = parsed;
        renderHome();
      },
    });
    ui.articlesList.appendChild(card);
  });

  const stores = Array.isArray(state.config.storeLocations) ? state.config.storeLocations : [];
  ui.storesList.innerHTML = '';
  stores.forEach((s, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'store-chip';
    chip.textContent = `${s.city || 'Город'}: ${s.address || ''}`;
    makeHoldEdit(chip, {
      title: `Магазин #${i + 1}: JSON`,
      value: () => JSON.stringify(s, null, 2),
      multiline: true,
      onSave: (val) => {
        const parsed = safe(val, null);
        if (!parsed || typeof parsed !== 'object') return;
        stores[i] = parsed;
        renderHome();
      },
    });
    ui.storesList.appendChild(chip);
  });

  ui.aboutPreview.textContent = excerpt(state.config.aboutText);
  ui.productionPreview.textContent = excerpt(state.config.productionText);
  ui.paymentPreview.textContent = excerpt(state.config.paymentText);
  ui.contactsPreview.textContent = excerpt(state.config.contactsText);

  makeHoldEdit(document.getElementById('aboutBlock'), {
    title: 'Редактировать aboutText',
    value: () => state.config.aboutText || '',
    multiline: true,
    onSave: (v) => { state.config.aboutText = v; renderHome(); },
  });
  makeHoldEdit(document.getElementById('productionBlock'), {
    title: 'Редактировать productionText',
    value: () => state.config.productionText || '',
    multiline: true,
    onSave: (v) => { state.config.productionText = v; renderHome(); },
  });
  makeHoldEdit(document.getElementById('paymentBlock'), {
    title: 'Редактировать paymentText',
    value: () => state.config.paymentText || '',
    multiline: true,
    onSave: (v) => { state.config.paymentText = v; renderHome(); },
  });
  makeHoldEdit(document.getElementById('contactsBlock'), {
    title: 'Редактировать contactsText',
    value: () => state.config.contactsText || '',
    multiline: true,
    onSave: (v) => { state.config.contactsText = v; renderHome(); },
  });
}

function renderCategories() {
  ui.categoriesGrid.innerHTML = '';
  state.categories.forEach((cat, idx) => {
    const card = document.createElement('article');
    card.className = 'category-card';
    card.innerHTML = `
      <img class="category-cover" src="${cat.image || 'assets/placeholder.svg'}" alt="${cat.title || ''}" />
      <h3 class="category-title">${cat.title || 'Без названия'}</h3>
    `;

    const img = card.querySelector('.category-cover');
    const title = card.querySelector('.category-title');

    makeHoldEdit(img, {
      title: `Категория ${cat.title || idx + 1}: URL картинки`,
      value: () => cat.image || '',
      onSave: (v) => { cat.image = v.trim(); renderCategories(); },
    });

    makeHoldEdit(title, {
      title: `Категория ${cat.title || idx + 1}: заголовок`,
      value: () => cat.title || '',
      onSave: (v) => { cat.title = v.trim(); renderCategories(); },
    });

    card.addEventListener('click', () => {
      state.currentCategoryId = cat.id;
      renderProducts();
      screen('products');
    });

    ui.categoriesGrid.appendChild(card);
  });
}

function renderProducts() {
  const category = categoryById(state.currentCategoryId) || state.categories[0] || null;
  if (!category) {
    ui.productsTitle.textContent = 'Товары';
    ui.productsGrid.innerHTML = '';
    return;
  }
  state.currentCategoryId = category.id;
  ui.productsTitle.textContent = `Товары: ${category.title}`;

  const list = state.products.filter((p) => p.categoryId === category.id);
  ui.productsGrid.innerHTML = '';

  list.forEach((p) => {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${p.images?.[0] || 'assets/placeholder.svg'}" alt="${p.title || ''}" />
      <h3>${p.title || 'Без названия'}</h3>
      <p>${p.shortDescription || ''}</p>
      <div class="product-price">${Number(p.price || 0).toLocaleString('ru-RU')} ₽</div>
    `;

    const image = card.querySelector('img');
    const h3 = card.querySelector('h3');
    const desc = card.querySelector('p');
    const price = card.querySelector('.product-price');

    makeHoldEdit(image, {
      title: `${p.title}: URL фото`,
      value: () => p.images?.[0] || '',
      onSave: (v) => { p.images = [v.trim(), ...(p.images || []).slice(1)]; renderProducts(); },
    });

    makeHoldEdit(h3, {
      title: `${p.id}: заголовок`,
      value: () => p.title || '',
      onSave: (v) => { p.title = v.trim(); renderProducts(); },
    });

    makeHoldEdit(desc, {
      title: `${p.id}: краткое описание`,
      value: () => p.shortDescription || '',
      onSave: (v) => { p.shortDescription = v; renderProducts(); },
    });

    makeHoldEdit(price, {
      title: `${p.id}: цена`,
      value: () => String(p.price || 0),
      onSave: (v) => { p.price = Number(v) || 0; renderProducts(); },
    });

    card.addEventListener('click', () => {
      state.currentProductId = p.id;
      renderProduct();
      screen('product');
    });

    ui.productsGrid.appendChild(card);
  });
}

function renderProduct() {
  const p = productById(state.currentProductId);
  if (!p) {
    ui.productCard.innerHTML = '<p>Товар не выбран.</p>';
    return;
  }

  const images = Array.isArray(p.images) ? p.images : [];
  const specs = Array.isArray(p.specs) ? p.specs : [];

  ui.productCard.innerHTML = `
    <div class="gallery">
      ${images.map((src, i) => `<img class="js-img" data-index="${i}" src="${src || 'assets/placeholder.svg'}" alt="img-${i}" />`).join('')}
    </div>
    <h3 class="js-title">${p.title || ''}</h3>
    <div class="meta js-short">${p.shortDescription || ''}</div>
    <div class="product-price js-price">${Number(p.price || 0).toLocaleString('ru-RU')} ₽</div>
    <p class="js-desc">${p.description || ''}</p>
    <h4>Характеристики</h4>
    <ul class="spec-list">
      ${specs.map((s, i) => `<li class="js-spec" data-index="${i}">${s}</li>`).join('')}
    </ul>
  `;

  ui.productCard.querySelectorAll('.js-img').forEach((el) => {
    const i = Number(el.dataset.index || 0);
    makeHoldEdit(el, {
      title: `${p.id}: URL фото #${i + 1}`,
      value: () => p.images?.[i] || '',
      onSave: (v) => {
        p.images[i] = v.trim();
        renderProduct();
      },
    });
  });

  makeHoldEdit(ui.productCard.querySelector('.js-title'), {
    title: `${p.id}: заголовок`,
    value: () => p.title || '',
    onSave: (v) => { p.title = v.trim(); renderProduct(); renderProducts(); },
  });

  makeHoldEdit(ui.productCard.querySelector('.js-short'), {
    title: `${p.id}: короткий текст`,
    value: () => p.shortDescription || '',
    multiline: true,
    onSave: (v) => { p.shortDescription = v; renderProduct(); renderProducts(); },
  });

  makeHoldEdit(ui.productCard.querySelector('.js-price'), {
    title: `${p.id}: цена`,
    value: () => String(p.price || 0),
    onSave: (v) => { p.price = Number(v) || 0; renderProduct(); renderProducts(); },
  });

  makeHoldEdit(ui.productCard.querySelector('.js-desc'), {
    title: `${p.id}: описание`,
    value: () => p.description || '',
    multiline: true,
    onSave: (v) => { p.description = v; renderProduct(); },
  });

  ui.productCard.querySelectorAll('.js-spec').forEach((el) => {
    const i = Number(el.dataset.index || 0);
    makeHoldEdit(el, {
      title: `${p.id}: характеристика #${i + 1}`,
      value: () => p.specs?.[i] || '',
      onSave: (v) => {
        p.specs[i] = v;
        renderProduct();
      },
    });
  });
}

function addBanner() {
  if (!Array.isArray(state.config.homeBanners)) state.config.homeBanners = [];
  state.config.homeBanners.push({
    id: uid('banner'),
    style: 'promo',
    image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1400&q=70',
    kicker: 'Новый баннер',
    title: 'Новый заголовок',
    text: 'Текст баннера',
    cta: 'Подробнее',
  });
  renderHome();
}

function addArticle() {
  if (!Array.isArray(state.config.homeArticles)) state.config.homeArticles = [];
  state.config.homeArticles.push({
    id: uid('article'),
    kicker: 'Новая статья',
    title: 'Заголовок статьи',
    text: 'Короткий текст статьи',
    screen: 'about',
  });
  renderHome();
}

function addStore() {
  if (!Array.isArray(state.config.storeLocations)) state.config.storeLocations = [];
  state.config.storeLocations.push({ id: uid('store'), city: 'Новый город', address: 'Новый адрес' });
  renderHome();
}

function addCategory() {
  state.categories.push({
    id: uid('catalog'),
    groupId: 'custom',
    title: 'Новый раздел',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=70',
  });
  renderCategories();
}

function addProduct() {
  const categoryId = state.currentCategoryId || state.categories[0]?.id || '';
  if (!categoryId) {
    setStatus('Сначала добавьте категорию.', true);
    return;
  }
  const p = {
    id: uid('product'),
    title: 'Новый товар',
    price: 0,
    sku: '',
    shortDescription: 'Короткий текст',
    description: 'Описание',
    specs: ['Характеристика'],
    images: ['https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=70'],
    categoryId,
  };
  state.products.unshift(p);
  renderProducts();
}

function addImage() {
  const p = productById(state.currentProductId);
  if (!p) return;
  if (!Array.isArray(p.images)) p.images = [];
  p.images.push('https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=70');
  renderProduct();
}

function addSpec() {
  const p = productById(state.currentProductId);
  if (!p) return;
  if (!Array.isArray(p.specs)) p.specs = [];
  p.specs.push('Новая характеристика');
  renderProduct();
}

function downloadFile(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function saveDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({
    config: state.config,
    categories: state.categories,
    products: state.products,
  }));
  setStatus('Черновик сохранен.');
}

async function loadSource() {
  try {
    const [cfgRes, catRes, prodRes] = await Promise.all([
      fetch('config.json', { cache: 'no-store' }),
      fetch('data/categories.json', { cache: 'no-store' }),
      fetch('data/products.json', { cache: 'no-store' }),
    ]);
    state.config = await cfgRes.json();
    state.categories = await catRes.json();
    state.products = await prodRes.json();

    state.currentCategoryId = state.categories[0]?.id || null;
    state.currentProductId = state.products[0]?.id || null;

    renderHome();
    renderCategories();
    renderProducts();
    renderProduct();
    setStatus('Данные загружены из файлов.');
  } catch (e) {
    console.error(e);
    setStatus('Ошибка загрузки данных.', true);
  }
}

function loadDraftOrSource() {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) {
    loadSource();
    return;
  }
  try {
    const draft = JSON.parse(raw);
    state.config = draft.config || {};
    state.categories = Array.isArray(draft.categories) ? draft.categories : [];
    state.products = Array.isArray(draft.products) ? draft.products : [];
    state.currentCategoryId = state.categories[0]?.id || null;
    state.currentProductId = state.products[0]?.id || null;

    renderHome();
    renderCategories();
    renderProducts();
    renderProduct();
    setStatus('Загружен локальный черновик.');
  } catch {
    loadSource();
  }
}

function bind() {
  ui.navButtons.forEach((btn) => btn.addEventListener('click', () => {
    screen(btn.dataset.screen);
    if (btn.dataset.screen === 'products') renderProducts();
  }));

  ui.saveDraftBtn.addEventListener('click', saveDraft);
  ui.reloadBtn.addEventListener('click', loadSource);

  ui.addBannerBtn.addEventListener('click', addBanner);
  ui.addArticleBtn.addEventListener('click', addArticle);
  ui.addStoreBtn.addEventListener('click', addStore);
  ui.addCategoryBtn.addEventListener('click', addCategory);
  ui.addProductBtn.addEventListener('click', addProduct);
  ui.addImageBtn.addEventListener('click', addImage);
  ui.addSpecBtn.addEventListener('click', addSpec);

  ui.downloadConfigBtn.addEventListener('click', () => downloadFile('config.json', state.config));
  ui.downloadCategoriesBtn.addEventListener('click', () => downloadFile('categories.json', state.categories));
  ui.downloadProductsBtn.addEventListener('click', () => downloadFile('products.json', state.products));

  ui.sendToBotBtn.addEventListener('click', () => {
    const tg = window.Telegram?.WebApp;
    if (!tg || typeof tg.sendData !== 'function') {
      setStatus('Откройте внутри Telegram для отправки сводки.', true);
      return;
    }
    tg.sendData(JSON.stringify({
      type: 'admin_export_meta',
      updatedAt: new Date().toISOString(),
      banners: (state.config.homeBanners || []).length,
      articles: (state.config.homeArticles || []).length,
      categories: state.categories.length,
      products: state.products.length,
    }));
    setStatus('Сводка отправлена в бота.');
  });

  ui.editorCancel.addEventListener('click', closeEditor);
  ui.editorModal.addEventListener('click', (e) => {
    if (e.target === ui.editorModal) closeEditor();
  });
  ui.editorSave.addEventListener('click', () => {
    if (!editorSubmit) return closeEditor();
    const val = ui.editorTextarea.classList.contains('hidden') ? ui.editorInput.value : ui.editorTextarea.value;
    editorSubmit(val);
    closeEditor();
  });
}

bind();
loadDraftOrSource();
