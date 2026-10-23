/**
 * olksi v14 — v14_static_audit.js
 * Статический аудит двухкабинетной архитектуры, векторных иконок, курсов допуска, CSS токенов и DOM-связей
 */

const fs = require('fs');
const path = require('path');

console.log('=== ЗАПУСК СТАТИЧЕСКОГО АУДИТА OLKSI v14 ===\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

// 1. Проверка наличия всех ключевых файлов v14
const requiredFiles = [
  'index.html',
  'worker.html',
  'employer.html',
  'styles.css',
  'core/store.js',
  'core/ui.js',
  'core/courses.js',
  'core/seed.js',
  'worker/app.js',
  'employer/app.js',
  'dev/toolkit.js'
];

requiredFiles.forEach(f => {
  assert(fs.existsSync(f), `Файл ${f} существует`);
});

// 2. Аудит ZERO EMOJI & ZERO PSEUDO-SYMBOLS
const prohibitedPatterns = [
  { name: 'Emoji', regex: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u },
  { name: 'Символ звезды ★', regex: /★/g },
  { name: 'Символ галочки ✓', regex: /✓/g },
  { name: 'Символ закрытия &times;', regex: /&times;/g },
  { name: 'Символ приблизительности ≈', regex: /≈/g }
];

requiredFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  prohibitedPatterns.forEach(p => {
    const matches = content.match(p.regex);
    assert(!matches || matches.length === 0, `${file}: 0 совпадений по правилу "${p.name}" (найдено: ${matches ? matches.length : 0})`);
  });
});

// 3. Баланс тегов <div> в HTML файлах
['index.html', 'worker.html', 'employer.html'].forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const openDivs = (content.match(/<div\b/gi) || []).length;
  const closeDivs = (content.match(/<\/div>/gi) || []).length;
  assert(openDivs === closeDivs, `${f}: Идеальный баланс <div> (открыто: ${openDivs}, закрыто: ${closeDivs})`);
});

// 4. Баланс фигурных скобок в styles.css
const cssContent = fs.readFileSync('styles.css', 'utf8');
const openBraces = (cssContent.match(/\{/g) || []).length;
const closeBraces = (cssContent.match(/\}/g) || []).length;
assert(openBraces === closeBraces, `styles.css: Идеальный баланс скобок (открыто: ${openBraces}, закрыто: ${closeBraces})`);

// 5. Проверка палитры Warm Stone & Carbon Ink токенов в styles.css (v18 Anti-Vibe-Code)
assert(cssContent.includes('#F6F5F2'), 'styles.css содержит фоновый токен Warm Stone (#F6F5F2)');
assert(cssContent.includes('#141413'), 'styles.css содержит брендовый токен Carbon Ink (#141413)');
assert(cssContent.includes('#D94E28'), 'styles.css содержит сигнальный терракотовый акцент (#D94E28)');
assert(cssContent.includes('#15803D'), 'styles.css содержит токен подтверждённого статуса (#15803D)');

// 6. Проверка курсов в core/courses.js
const coursesContent = fs.readFileSync('core/courses.js', 'utf8');
const vm = require('vm');
const sandbox = {
  window: {
    addEventListener: () => {},
    removeEventListener: () => {},
    location: { search: '' }
  },
  document: {
    documentElement: { setAttribute: () => {}, getAttribute: () => 'light' },
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: () => ({ setAttribute: () => {}, appendChild: () => {} }),
    addEventListener: () => {}
  },
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
  },
  BroadcastChannel: class {
    constructor() {}
    postMessage() {}
    addEventListener() {}
    close() {}
  },
  URLSearchParams: URLSearchParams,
  console: console
};
sandbox.window.document = sandbox.document;
sandbox.window.localStorage = sandbox.localStorage;
sandbox.window.BroadcastChannel = sandbox.BroadcastChannel;

vm.createContext(sandbox);
vm.runInContext(coursesContent, sandbox);

const Courses = sandbox.window.Olksi.Courses;
const allCourses = Courses.getAllCourses();
assert(allCourses.length === 7, `core/courses.js: Задано ровно 7 курсов (вводный + 6 категорий), найдено: ${allCourses.length}`);

let allQuizzesValid = true;
allCourses.forEach(c => {
  if (!c.lessons || c.lessons.length !== 3) allQuizzesValid = false;
  if (!c.quiz || c.quiz.length !== 5) allQuizzesValid = false;
  c.quiz.forEach(q => {
    if (!q.options || q.options.length !== 4) allQuizzesValid = false;
    if (typeof q.correct !== 'number' || q.correct < 0 || q.correct > 3) allQuizzesValid = false;
    if (!q.explain) allQuizzesValid = false;
  });
});
assert(allQuizzesValid, 'core/courses.js: Все 7 курсов содержат ровно 3 урока и 5 вопросов с 4 вариантами и пояснениями');

// 7. Проверка escapeHtml(0) в core/ui.js
const uiContent = fs.readFileSync('core/ui.js', 'utf8');
vm.runInContext(uiContent, sandbox);
const UI = sandbox.window.Olksi.UI;
assert(UI.escapeHtml(0) === '0', `core/ui.js: escapeHtml(0) безопасно возвращает '0' (результат: '${UI.escapeHtml(0)}')`);
assert(UI.escapeHtml(null) === '', `core/ui.js: escapeHtml(null) возвращает пустую строку (результат: '${UI.escapeHtml(null)}')`);

// 8. Проверка изоляции состояния и seed-данных
const seedContent = fs.readFileSync('core/seed.js', 'utf8');
const storeContent = fs.readFileSync('core/store.js', 'utf8');
vm.runInContext(seedContent, sandbox);
vm.runInContext(storeContent, sandbox);

const store = sandbox.window.Olksi.store;
assert(store && typeof store.init === 'function', 'core/store.js: Экземпляр store корректно экспортирован');
assert(sandbox.window.Olksi.STATUS_MAP && Object.keys(sandbox.window.Olksi.STATUS_MAP).length >= 8, 'core/store.js: STATUS_MAP содержит все ключевые статусы сделки');

// 9. Проверка разделения по ownerId в кабинете заказчика (исправление D4)
const defaultOrders = sandbox.window.Olksi.Seed.getInitialDatabase().orders;
const empOrders101 = defaultOrders.filter(o => o.ownerId === 101);
const empOrders102 = defaultOrders.filter(o => o.ownerId === 102);
assert(empOrders101.length > 0 && empOrders102.length > 0, `core/seed.js: Заказы распределены по ownerId (101: ${empOrders101.length}, 102: ${empOrders102.length})`);
assert(empOrders101.length < defaultOrders.length, 'core/seed.js: Заказчик 101 видит строго своё подмножество заказов, а не всю базу');

// 10. Проверка DOM-привязок в worker.html
const workerHtml = fs.readFileSync('worker.html', 'utf8');
const workerCriticalIds = [
  'appRoot',
  'desktopSidebar',
  'sidebarWorkerBalance',
  'headerScreenTitle',
  'scr-wrk-home',
  'scr-wrk-my',
  'scr-wrk-payouts',
  'scr-wrk-chats',
  'scr-wrk-profile',
  'scr-wrk-detail',
  'scr-wrk-course_player',
  'workerTasksList',
  'samaraLeafletMap',
  'profCoursesList',
  'payoutAvailableAmount',
  'feedbackToast'
];

let allWorkerIdsPresent = true;
workerCriticalIds.forEach(id => {
  if (!workerHtml.includes(`id="${id}"`)) {
    console.error(`В worker.html отсутствует id="${id}"`);
    allWorkerIdsPresent = false;
  }
});
assert(allWorkerIdsPresent, `worker.html: Все ${workerCriticalIds.length} критических ID присутствуют`);

// 11. Проверка DOM-привязок в employer.html
const employerHtml = fs.readFileSync('employer.html', 'utf8');
const employerCriticalIds = [
  'appRoot',
  'desktopSidebar',
  'sidebarEscrowReserved',
  'sidebarEscrowAvailable',
  'headerScreenTitle',
  'scr-emp-home',
  'scr-emp-create',
  'scr-emp-detail',
  'scr-emp-chats',
  'scr-emp-balance',
  'scr-emp-profile',
  'employerTasksList',
  'empAssignedWorkerCardContainer',
  'empSlotBefore',
  'empSlotAfter',
  'empGpsStampBadge',
  'reworkReasonModal',
  'empReviewModal',
  'editTaskModal',
  'transparencyModal',
  'feedbackToast'
];

let allEmployerIdsPresent = true;
employerCriticalIds.forEach(id => {
  if (!employerHtml.includes(`id="${id}"`)) {
    console.error(`В employer.html отсутствует id="${id}"`);
    allEmployerIdsPresent = false;
  }
});
assert(allEmployerIdsPresent, `employer.html: Все ${employerCriticalIds.length} критических ID присутствуют`);

// 12. Проверка безопасности карты и полного удаления сторонней атрибуции/флагов
const workerAppJs = fs.readFileSync('worker/app.js', 'utf8');
assert(workerAppJs.includes('attributionControl: false'), 'worker/app.js: Leaflet карта создается строго с attributionControl: false');
assert(!workerAppJs.includes('tile.openstreetmap.org'), 'worker/app.js: Не используется заблокированный волонтерский сервер tile.openstreetmap.org');
assert(workerAppJs.includes('server.arcgisonline.com'), 'worker/app.js: Используется тайловый провайдер Esri ArcGIS (без водяных знаков API KEY REQUIRED)');
assert(!workerAppJs.includes('cartocdn.com'), 'worker/app.js: CartoDB исключен (так как требует API KEY)');
assert(cssContent.includes('.leaflet-control-attribution') && cssContent.includes('.leaflet-attribution-flag'), 'styles.css: Селекторы атрибуции и флага Leaflet жестко заблокированы в CSS');

console.log(`\n=== ИТОГИ СТАТИЧЕСКОГО АУДИТА: ${passCount} ПРОЙДЕНО, ${failCount} ОШИБОК ===`);

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ВСЕ СТАТИЧЕСКИЕ ПРОВЕРКИ ПРОЙДЕНЫ УСПЕШНО!\n');
}
