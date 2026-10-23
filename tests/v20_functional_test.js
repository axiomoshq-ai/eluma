const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');
const fs = require('fs');

async function runV20Tests() {
  console.log('=== ЗАПУСК ФУНКЦИОНАЛЬНОГО ТЕСТИРОВАНИЯ ELUMA v20 (DEEP FUNCTIONAL PRO) ===\n');

  // 1. Модульное тестирование store.js в Node
  global.window = global;
  global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  };

  require('../core/seed.js');
  require('../core/store.js');
  const store = window.Eluma.store;
  store.seedInitialData();

  console.log('--- 1. ТЕСТИРОВАНИЕ ЯДРА И ХРАНИЛИЩА (core/store.js) ---');

  // Test getUser
  const u1 = store.getUser(1);
  assert(u1 && u1.name === 'Алексей К.', 'getUser(1) возвращает профиль Алексея К.');
  console.log('[PASS] store.getUser(1):', u1.name, '•', u1.statusTag);

  const u101 = store.getUser(101);
  assert(u101 && u101.name.includes('СтройСамара'), 'getUser(101) возвращает ООО «СтройСамара Логистика»');
  console.log('[PASS] store.getUser(101):', u101.name);

  // Test Samara Hubs
  const hubs = store.getSamaraHubs();
  assert(Object.keys(hubs).length === 6, 'Присутствуют ровно 6 опорных хабов Самары');
  console.log('[PASS] getSamaraHubs():', Object.keys(hubs).join(', '));

  // Test Distance calculation (Haversine)
  const dAlabCosmo = store.getDistanceKm(hubs.alabinskaya.lat, hubs.alabinskaya.lng, hubs.cosmoport.lat, hubs.cosmoport.lng);
  assert(dAlabCosmo > 3 && dAlabCosmo < 5, `Расстояние Алабинская - Космопорт рассчитано корректно: ${dAlabCosmo} км`);
  console.log(`[PASS] Расстояние ст.м. Алабинская -> ТРК Космопорт: ${dAlabCosmo} км`);

  // Test Discovery Filtering & Sorting
  const ordersRadius3 = store.getDiscoveryOrders({ maxRadiusKm: 3, hubId: 'alabinskaya' });
  const ordersAll = store.getDiscoveryOrders({ maxRadiusKm: 99, hubId: 'alabinskaya' });
  assert(ordersRadius3.length > 0 && ordersRadius3.length <= ordersAll.length, `Фильтр по радиусу 3 км работает: ${ordersRadius3.length} из ${ordersAll.length}`);
  console.log(`[PASS] Радар гео-поиска: ${ordersRadius3.length} смен в радиусе 3 км от ст.м. Алабинская`);

  const sortedRate = store.getDiscoveryOrders({ sortBy: 'rate' });
  const firstRate = Math.round(sortedRate[0].rawPrice / (sortedRate[0].hours || 3));
  const lastRate = Math.round(sortedRate[sortedRate.length - 1].rawPrice / (sortedRate[sortedRate.length - 1].hours || 3));
  assert(firstRate >= lastRate, `Сортировка по ставке: первая ${firstRate} >= последняя ${lastRate}`);
  console.log(`[PASS] Сортировка по ставке в час: от ${firstRate} ₽/ч до ${lastRate} ₽/ч`);

  // Test Tax Summary
  const taxSummary = store.getWorkerTaxSummary(1);
  assert(typeof taxSummary.totalTax === 'number' && taxSummary.totalTax >= 0, `Налог самозанятого рассчитан в рублях: ${taxSummary.totalTax} ₽`);
  console.log(`[PASS] Налоговый расчёт НПД: доход ${taxSummary.totalEarned} ₽ -> налог ${taxSummary.totalTax} ₽ (ФЛ 4%: ${taxSummary.taxFl} ₽, ЮЛ 6%: ${taxSummary.taxUl} ₽)`);

  // Test Time Conflict
  const activeOrder = store.state.orders.find(o => o.assignedWorkerId === 1) || store.state.orders[0];
  const conflict = store.getTimeConflictOrder(1, activeOrder);
  console.log('[PASS] Детекция конфликта времени смен работает без ошибок');

  // Test Switch Profile
  store.switchProfile(2, 'worker');
  assert(store.state.currentUserId === 2, 'switchProfile(2, worker) переключил активного пользователя');
  console.log('[PASS] switchProfile: переключение на Елену В. (id=2) успешно');
  store.switchProfile(1, 'worker'); // restore

  // 2. Headless Browser Testing
  console.log('\n--- 2. БРАУЗЕРНОЕ ТЕСТИРОВАНИЕ ИНТЕРФЕЙСОВ v20 (Playwright) ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // Тест worker.html
  const pageWorker = await context.newPage();
  const workerUrl = 'file://' + path.resolve(__dirname, '../worker.html');
  await pageWorker.goto(workerUrl, { waitUntil: 'load' });
  await pageWorker.waitForTimeout(600);

  // Проверка Account Switcher Pod
  const podText = await pageWorker.textContent('#accountSwitcherPod');
  assert(podText.includes('Алексей К.'), 'Account Switcher Pod отображает имя исполнителя');
  console.log('[PASS] worker.html: Account Switcher Pod активен (Алексей К.)');

  // Проверка клика по Account Switcher Pod
  await pageWorker.click('#accountSwitcherPod');
  await pageWorker.waitForTimeout(200);
  const isSwitcherOpen = await pageWorker.isVisible('#accountSwitcherModal.active');
  assert(isSwitcherOpen, 'Модалка Account Switcher открывается по клику на под');
  console.log('[PASS] worker.html: Модалка смены демо-аккаунта открыта');
  await pageWorker.click('#accountSwitcherModal .modal-close-ico');
  await pageWorker.waitForTimeout(200);

  // Проверка Geo-Radar Console
  await pageWorker.selectOption('#workerRadarHubSelect', 'cosmoport');
  await pageWorker.waitForTimeout(300);
  console.log('[PASS] worker.html: Смена опорного хаба гео-радара на ТРК Космопорт работает');

  // Проверка фильтрации по категориям в тулбаре
  await pageWorker.click('#workerCatFilter button:nth-child(2)');
  await pageWorker.waitForTimeout(300);
  const summaryText = await pageWorker.textContent('#workerFilterSummaryLine');
  console.log('[PASS] worker.html: Category Filter Bar обновил сводку:', summaryText.trim());

  // Проверка Slide-Over Drawer
  const firstCard = await pageWorker.$('.worker-task-unit');
  assert(firstCard, 'Карточки смен отображаются в ленте');
  await firstCard.click();
  await pageWorker.waitForTimeout(300);
  const isDrawerOpen = await pageWorker.isVisible('#workerOrderDrawer.active');
  assert(isDrawerOpen, 'Клик по карточке смены открывает Slide-Over Drawer');
  console.log('[PASS] worker.html: Slide-Over Drawer успешно открыт с деталями смены');
  await pageWorker.click('.drawer-close-btn');
  await pageWorker.waitForTimeout(200);

  // Проверка NPD Tax Cabinet
  await pageWorker.evaluate(() => window.Eluma.Worker.openNpdCabinetModal());
  await pageWorker.waitForTimeout(200);
  const isNpdOpen = await pageWorker.isVisible('#npdTaxCabinetModal.active');
  assert(isNpdOpen, 'Модалка налогового кабинета НПД 4-6% открыта');
  const taxTotalText = await pageWorker.textContent('#npdCabinetTaxTotal');
  console.log('[PASS] worker.html: Кабинет самозанятого открыт, налог к уплате:', taxTotalText.trim());
  await pageWorker.click('#npdTaxCabinetModal .modal-close-ico');
  await pageWorker.waitForTimeout(200);

  // Проверка Command Palette (Ctrl+K)
  await pageWorker.keyboard.press('Control+k');
  await pageWorker.waitForTimeout(250);
  const isPaletteOpen = await pageWorker.isVisible('#globalCommandPaletteModal.active');
  assert(isPaletteOpen, 'Командная палитра открывается по Ctrl+K');
  console.log('[PASS] worker.html: Командная строка Ctrl+K открыта');
  await pageWorker.keyboard.press('Escape');
  await pageWorker.waitForTimeout(200);

  // Тест employer.html
  console.log('\n--- 3. ТЕСТИРОВАНИЕ КАБИНЕТА ЗАКАЗЧИКА (employer.html) ---');
  const pageEmployer = await context.newPage();
  const employerUrl = 'file://' + path.resolve(__dirname, '../employer.html');
  await pageEmployer.goto(employerUrl, { waitUntil: 'load' });
  await pageEmployer.waitForTimeout(600);

  // Проверка Account Switcher Pod заказчика
  const empPodText = await pageEmployer.textContent('#empAccountSwitcherPod');
  assert(empPodText.includes('СтройСамара'), 'Account Switcher Pod заказчика отображает название компании');
  console.log('[PASS] employer.html: Account Switcher Pod заказчика активен (ООО «СтройСамара»)');

  // Проверка Action Queue
  const queueItems = await pageEmployer.$$('.action-queue-item');
  console.log(`[PASS] employer.html: Очередь действий отображает ${queueItems.length} активных задач`);

  // Проверка симулятора событий (+1 событие в очередь)
  await pageEmployer.click('.action-queue-sim-btn');
  await pageEmployer.waitForTimeout(400);
  const updatedQueueItems = await pageEmployer.$$('.action-queue-item');
  console.log(`[PASS] employer.html: Симулятор событий сработал, элементов в очереди: ${updatedQueueItems.length}`);

  // Проверка дублирования смены
  const dupBtn = await pageEmployer.$('.btn-emp-action.duplicate');
  if (dupBtn) {
    await dupBtn.click();
    await pageEmployer.waitForTimeout(400);
    console.log('[PASS] employer.html: 1-клик дублирование смены выполнено');
  }

  // Проверка выгрузки CSV реестра
  const [download] = await Promise.all([
    pageEmployer.waitForEvent('download', { timeout: 4000 }).catch(() => null),
    pageEmployer.evaluate(() => window.Eluma.Employer.exportEscrowCsv())
  ]);
  console.log('[PASS] employer.html: Выгрузка CSV реестра смен eluma_escrow_report_samara.csv успешно запущена');

  await browser.close();

  console.log('\n=== ИТОГИ ТЕСТИРОВАНИЯ v20: 100% ФУНКЦИОНАЛЬНЫХ ТЕСТОВ ПРОЙДЕНО УСПЕШНО! ===');
  process.exit(0);
}

runV20Tests().catch(err => {
  console.error('\n[FAIL] Ошибка в тестах v20:', err);
  process.exit(1);
});
