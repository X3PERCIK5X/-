const DRAFT_KEY = 'demo_catalog_admin_draft_v1';

const state = {
  config: {},
  categories: [],
  products: [],
  selectedProductId: null,
  productSearch: '',
};

const ui = {
  status: document.getElementById('status'),
  loadSourceBtn: document.getElementById('loadSourceBtn'),
  saveDraftBtn: document.getElementById('saveDraftBtn'),
  resetDraftBtn: document.getElementById('resetDraftBtn'),
  addBannerBtn: document.getElementById('addBannerBtn'),
  addArticleBtn: document.getElementById('addArticleBtn'),
  addCategoryBtn: document.getElementById('addCategoryBtn'),
  addProductBtn: document.getElementById('addProductBtn'),
  productSearch: document.getElementById('productSearch'),
  bannersList: document.getElementById('bannersList'),
  articlesList: document.getElementById('articlesList'),
  categoriesList: document.getElementById('categoriesList'),
  productsList: document.getElementById('productsList'),
  productForm: document.getElementById('productForm'),
  productCategorySelect: document.getElementById('productCategorySelect'),
  downloadConfigBtn: document.getElementById('downloadConfigBtn'),
  downloadCategoriesBtn: document.getElementById('downloadCategoriesBtn'),
  downloadProductsBtn: document.getElementById('downloadProductsBtn'),
  sendToBotBtn: document.getElementById('sendToBotBtn'),
  readonlyAbout: document.getElementById('readonlyAbout'),
  readonlyProduction: document.getElementById('readonlyProduction'),
  readonlyPayment: document.getElementById('readonlyPayment'),
  readonlyContacts: document.getElementById('readonlyContacts'),
};

function setStatus(text, isError = false) {
  if (!ui.status) return;
  ui.status.textContent = text;
  ui.status.style.color = isError ? '#ff8a8a' : '#9ea8bf';
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function parseLines(text) {
  return String(text || '')
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean);
}

function renderReadonlyTexts() {
  ui.readonlyAbout.value = state.config.aboutText || '';
  ui.readonlyProduction.value = state.config.productionText || '';
  ui.readonlyPayment.value = state.config.paymentText || '';
  ui.readonlyContacts.value = state.config.contactsText || '';
}

function moveItem(arr, from, to) {
  if (from < 0 || from >= arr.length || to < 0 || to >= arr.length || from === to) return;
  const [item] = arr.splice(from, 1);
  arr.splice(to, 0, item);
}

function bindSwipeReorder(el, onLeft, onRight) {
  let startX = 0;
  el.addEventListener('touchstart', (e) => { startX = e.changedTouches?.[0]?.clientX || 0; }, { passive: true });
  el.addEventListener('touchend', (e) => {
    const endX = e.changedTouches?.[0]?.clientX || 0;
    const dx = endX - startX;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) onLeft();
    else onRight();
  }, { passive: true });
}

function renderBanners() {
  const list = Array.isArray(state.config.homeBanners) ? state.config.homeBanners : [];
  ui.bannersList.innerHTML = '';
  list.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'item';
    card.draggable = true;
    card.dataset.index = String(index);
    card.innerHTML = `
      <div class="head">
        <div class="title">Баннер #${index + 1}</div>
        <div class="mini-actions">
          <button type="button" data-act="up">↑</button>
          <button type="button" data-act="down">↓</button>
          <button type="button" data-act="delete" class="danger">Удалить</button>
        </div>
      </div>
      <div class="grid">
        <label>ID<input data-field="id" value="${item.id || ''}" /></label>
        <label>Стиль
          <select data-field="style">
            <option value="promo" ${item.style === 'promo' ? 'selected' : ''}>promo</option>
            <option value="sales" ${item.style === 'sales' ? 'selected' : ''}>sales</option>
          </select>
        </label>
        <label class="full">Kicker<input data-field="kicker" value="${item.kicker || ''}" /></label>
        <label class="full">Заголовок<input data-field="title" value="${item.title || ''}" /></label>
        <label class="full">Текст<textarea data-field="text" rows="2">${item.text || ''}</textarea></label>
        <label class="full">CTA<input data-field="cta" value="${item.cta || ''}" /></label>
      </div>
    `;

    bindSwipeReorder(card, () => { moveItem(list, index, index + 1); renderBanners(); }, () => { moveItem(list, index, index - 1); renderBanners(); });

    card.addEventListener('dragstart', (e) => e.dataTransfer?.setData('text/plain', String(index)));
    card.addEventListener('dragover', (e) => e.preventDefault());
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      const from = Number(e.dataTransfer?.getData('text/plain'));
      const to = index;
      if (Number.isFinite(from)) {
        moveItem(list, from, to);
        renderBanners();
      }
    });

    card.addEventListener('input', (e) => {
      const target = e.target;
      const field = target.dataset?.field;
      if (!field) return;
      list[index][field] = target.value;
    });

    card.addEventListener('click', (e) => {
      const act = e.target.dataset?.act;
      if (!act) return;
      if (act === 'up') moveItem(list, index, index - 1);
      if (act === 'down') moveItem(list, index, index + 1);
      if (act === 'delete') list.splice(index, 1);
      renderBanners();
    });

    ui.bannersList.appendChild(card);
  });
}

function renderArticles() {
  const list = Array.isArray(state.config.homeArticles) ? state.config.homeArticles : [];
  ui.articlesList.innerHTML = '';
  list.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'item';
    card.innerHTML = `
      <div class="head">
        <div class="title">Статья #${index + 1}</div>
        <div class="mini-actions">
          <button type="button" data-act="up">↑</button>
          <button type="button" data-act="down">↓</button>
          <button type="button" data-act="delete" class="danger">Удалить</button>
        </div>
      </div>
      <div class="grid">
        <label>ID<input data-field="id" value="${item.id || ''}" /></label>
        <label>Экран
          <select data-field="screen">
            ${['about', 'production', 'payment', 'contacts'].map((v) => `<option value="${v}" ${item.screen === v ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </label>
        <label class="full">Kicker<input data-field="kicker" value="${item.kicker || ''}" /></label>
        <label class="full">Заголовок<input data-field="title" value="${item.title || ''}" /></label>
        <label class="full">Текст<textarea data-field="text" rows="2">${item.text || ''}</textarea></label>
      </div>
    `;

    bindSwipeReorder(card, () => { moveItem(list, index, index + 1); renderArticles(); }, () => { moveItem(list, index, index - 1); renderArticles(); });

    card.addEventListener('input', (e) => {
      const target = e.target;
      const field = target.dataset?.field;
      if (!field) return;
      list[index][field] = target.value;
    });

    card.addEventListener('click', (e) => {
      const act = e.target.dataset?.act;
      if (!act) return;
      if (act === 'up') moveItem(list, index, index - 1);
      if (act === 'down') moveItem(list, index, index + 1);
      if (act === 'delete') list.splice(index, 1);
      renderArticles();
    });

    ui.articlesList.appendChild(card);
  });
}

function renderCategories() {
  ui.categoriesList.innerHTML = '';
  state.categories.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'item';
    card.innerHTML = `
      <div class="head">
        <div class="title">Раздел #${index + 1}</div>
        <div class="mini-actions">
          <button type="button" data-act="up">↑</button>
          <button type="button" data-act="down">↓</button>
          <button type="button" data-act="delete" class="danger">Удалить</button>
        </div>
      </div>
      <div class="grid">
        <label>ID<input data-field="id" value="${item.id || ''}" /></label>
        <label>groupId<input data-field="groupId" value="${item.groupId || ''}" /></label>
        <label class="full">Название<input data-field="title" value="${item.title || ''}" /></label>
        <label class="full">Картинка (URL)<input data-field="image" value="${item.image || ''}" /></label>
      </div>
    `;

    card.addEventListener('input', (e) => {
      const target = e.target;
      const field = target.dataset?.field;
      if (!field) return;
      state.categories[index][field] = target.value;
      if (field === 'title' || field === 'id') renderProductCategoryOptions();
    });

    card.addEventListener('click', (e) => {
      const act = e.target.dataset?.act;
      if (!act) return;
      if (act === 'up') moveItem(state.categories, index, index - 1);
      if (act === 'down') moveItem(state.categories, index, index + 1);
      if (act === 'delete') state.categories.splice(index, 1);
      renderCategories();
      renderProductCategoryOptions();
    });

    bindSwipeReorder(card, () => { moveItem(state.categories, index, index + 1); renderCategories(); }, () => { moveItem(state.categories, index, index - 1); renderCategories(); });
    ui.categoriesList.appendChild(card);
  });
}

function getFilteredProducts() {
  const q = String(state.productSearch || '').trim().toLowerCase();
  if (!q) return state.products;
  return state.products.filter((p) => String(p.title || '').toLowerCase().includes(q) || String(p.id || '').toLowerCase().includes(q));
}

function renderProductsList() {
  const list = getFilteredProducts();
  ui.productsList.innerHTML = '';
  list.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `product-row ${state.selectedProductId === item.id ? 'active' : ''}`;
    btn.textContent = `${item.title || '(без названия)'} · ${item.id || ''}`;
    btn.addEventListener('click', () => {
      state.selectedProductId = item.id;
      renderProductsList();
      fillProductForm();
    });
    ui.productsList.appendChild(btn);
  });
}

function renderProductCategoryOptions() {
  const current = ui.productCategorySelect.value;
  ui.productCategorySelect.innerHTML = state.categories
    .map((c) => `<option value="${c.id}">${c.title || c.id}</option>`)
    .join('');
  if (current) ui.productCategorySelect.value = current;
}

function fillProductForm() {
  const form = ui.productForm;
  const p = state.products.find((x) => x.id === state.selectedProductId);
  if (!p) {
    form.reset();
    return;
  }
  form.id.value = p.id || '';
  form.categoryId.value = p.categoryId || '';
  form.sku.value = p.sku || '';
  form.badge.value = p.badge || '';
  form.title.value = p.title || '';
  form.shortDescription.value = p.shortDescription || '';
  form.description.value = p.description || '';
  form.price.value = Number(p.price || 0);
  form.oldPrice.value = Number(p.oldPrice || 0);
  form.discountPercent.value = Number(p.discountPercent || 0);
  form.imagesText.value = Array.isArray(p.images) ? p.images.join('\n') : '';
  form.specsText.value = Array.isArray(p.specs) ? p.specs.join('\n') : '';
  form.tagsText.value = Array.isArray(p.tags) ? p.tags.join(', ') : '';
}

function saveCurrentProductFromForm() {
  const form = ui.productForm;
  const idx = state.products.findIndex((x) => x.id === state.selectedProductId);
  if (idx < 0) {
    setStatus('Сначала выберите товар.', true);
    return;
  }

  const next = {
    ...state.products[idx],
    id: String(form.id.value || '').trim(),
    categoryId: String(form.categoryId.value || '').trim(),
    sku: String(form.sku.value || '').trim(),
    badge: String(form.badge.value || '').trim(),
    title: String(form.title.value || '').trim(),
    shortDescription: String(form.shortDescription.value || '').trim(),
    description: String(form.description.value || '').trim(),
    price: Number(form.price.value || 0),
    oldPrice: Number(form.oldPrice.value || 0),
    discountPercent: Number(form.discountPercent.value || 0),
    images: parseLines(form.imagesText.value),
    specs: parseLines(form.specsText.value),
    tags: String(form.tagsText.value || '').split(',').map((v) => v.trim()).filter(Boolean),
  };

  if (!next.id || !next.title || !next.categoryId) {
    setStatus('ID, название и категория обязательны.', true);
    return;
  }

  if (next.id !== state.selectedProductId && state.products.some((x) => x.id === next.id)) {
    setStatus('Товар с таким ID уже есть.', true);
    return;
  }

  state.products[idx] = next;
  state.selectedProductId = next.id;
  renderProductsList();
  setStatus('Товар сохранен в памяти админки.');
}

function addProduct() {
  const id = uid('product');
  const categoryId = state.categories[0]?.id || '';
  const item = {
    id,
    title: 'Новый товар',
    price: 0,
    sku: '',
    shortDescription: '',
    description: '',
    specs: [],
    images: [''],
    categoryId,
    oldPrice: 0,
    discountPercent: 0,
    badge: '',
    tags: [],
  };
  state.products.unshift(item);
  state.selectedProductId = id;
  renderProductsList();
  fillProductForm();
}

function addBanner() {
  if (!Array.isArray(state.config.homeBanners)) state.config.homeBanners = [];
  state.config.homeBanners.push({
    id: uid('banner'),
    style: 'promo',
    kicker: 'Новый баннер',
    title: 'Заголовок',
    text: 'Описание предложения',
    cta: 'Подробнее',
  });
  renderBanners();
}

function addArticle() {
  if (!Array.isArray(state.config.homeArticles)) state.config.homeArticles = [];
  state.config.homeArticles.push({
    id: uid('article'),
    kicker: 'Новый раздел',
    title: 'Заголовок',
    text: 'Краткое описание',
    screen: 'about',
  });
  renderArticles();
}

function addCategory() {
  state.categories.push({
    id: uid('catalog'),
    groupId: 'custom',
    title: 'Новый раздел',
    image: '',
  });
  renderCategories();
  renderProductCategoryOptions();
}

function saveDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({
    config: state.config,
    categories: state.categories,
    products: state.products,
  }));
  setStatus('Черновик сохранен локально.');
}

function downloadFile(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function loadFromFiles() {
  try {
    const [configRes, categoriesRes, productsRes] = await Promise.all([
      fetch('config.json', { cache: 'no-store' }),
      fetch('data/categories.json', { cache: 'no-store' }),
      fetch('data/products.json', { cache: 'no-store' }),
    ]);
    state.config = await configRes.json();
    state.categories = await categoriesRes.json();
    state.products = await productsRes.json();

    if (!Array.isArray(state.config.homeBanners)) state.config.homeBanners = [];
    if (!Array.isArray(state.config.homeArticles)) state.config.homeArticles = [];

    state.selectedProductId = state.products[0]?.id || null;
    renderAll();
    setStatus('Данные загружены из файлов проекта.');
  } catch (err) {
    console.error(err);
    setStatus('Ошибка загрузки исходных файлов.', true);
  }
}

function loadDraftOrSource() {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return loadFromFiles();
  try {
    const draft = JSON.parse(raw);
    state.config = draft.config || {};
    state.categories = Array.isArray(draft.categories) ? draft.categories : [];
    state.products = Array.isArray(draft.products) ? draft.products : [];
    state.selectedProductId = state.products[0]?.id || null;
    renderAll();
    setStatus('Загружен локальный черновик.');
  } catch {
    loadFromFiles();
  }
}

function renderAll() {
  renderBanners();
  renderArticles();
  renderCategories();
  renderProductCategoryOptions();
  renderProductsList();
  fillProductForm();
  renderReadonlyTexts();
}

function bind() {
  ui.loadSourceBtn.addEventListener('click', loadFromFiles);
  ui.saveDraftBtn.addEventListener('click', saveDraft);
  ui.resetDraftBtn.addEventListener('click', () => {
    localStorage.removeItem(DRAFT_KEY);
    loadFromFiles();
  });

  ui.addBannerBtn.addEventListener('click', addBanner);
  ui.addArticleBtn.addEventListener('click', addArticle);
  ui.addCategoryBtn.addEventListener('click', addCategory);
  ui.addProductBtn.addEventListener('click', addProduct);

  ui.productSearch.addEventListener('input', () => {
    state.productSearch = ui.productSearch.value;
    renderProductsList();
  });

  ui.productForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveCurrentProductFromForm();
  });

  document.getElementById('deleteProductBtn').addEventListener('click', () => {
    const idx = state.products.findIndex((x) => x.id === state.selectedProductId);
    if (idx < 0) return;
    state.products.splice(idx, 1);
    state.selectedProductId = state.products[0]?.id || null;
    renderProductsList();
    fillProductForm();
    setStatus('Товар удален.');
  });

  ui.downloadConfigBtn.addEventListener('click', () => downloadFile('config.json', state.config));
  ui.downloadCategoriesBtn.addEventListener('click', () => downloadFile('categories.json', state.categories));
  ui.downloadProductsBtn.addEventListener('click', () => downloadFile('products.json', state.products));

  ui.sendToBotBtn.addEventListener('click', () => {
    const payload = {
      type: 'admin_export_meta',
      updatedAt: new Date().toISOString(),
      stats: {
        banners: (state.config.homeBanners || []).length,
        articles: (state.config.homeArticles || []).length,
        categories: state.categories.length,
        products: state.products.length,
      },
      note: 'Полный JSON скачайте кнопками и загрузите в репозиторий.',
    };

    const tg = window.Telegram?.WebApp;
    if (!tg || typeof tg.sendData !== 'function') {
      setStatus('Открывайте админку из Telegram, чтобы отправить данные в бота.', true);
      return;
    }
    tg.sendData(JSON.stringify(payload));
    setStatus('В бот отправлена сводка. Полные JSON скачайте отдельно.');
  });
}

bind();
loadDraftOrSource();
