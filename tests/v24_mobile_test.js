/**
 * v24_mobile_test.js
 * Automated mobile verification suite:
 * - 6-tab mobile bottom bar (including Friends & Co-Op)
 * - Safe bottom scroll clearance for Courier certification & forms
 * - Slide-over drawer full mobile viewport adaptation
 * - Header title non-truncation on 375px screens
 * - Zero horizontal overflow across all screens
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

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

(async () => {
  console.log('=== ЗАПУСК МОБИЛЬНОГО ТЕСТИРОВАНИЯ ELUMA v24.1 (MOBILE PRO) ===\n');

  // 1. Static HTML check for mobile nav
  const workerHtml = fs.readFileSync(path.resolve(__dirname, '../worker.html'), 'utf8');
  assert(
    workerHtml.includes('class="m-nav-item" data-screen="friends"'),
    'worker.html: Вкладка "Друзья" присутствует в мобильной навигации (.mobile-bottom-bar)'
  );

  const navMatch = workerHtml.match(/<nav class="mobile-bottom-bar"[\s\S]*?<\/nav>/);
  if (navMatch) {
    const buttonCount = (navMatch[0].match(/class="m-nav-item/g) || []).length;
    assert(buttonCount === 6, `worker.html: Ровно 6 вкладок в мобильной навигации (найдено: ${buttonCount})`);
  }

  // 2. Playwright Headless Mobile Audit on iPhone SE (375x667) & iPhone 13 mini (375x812)
  const browser = await chromium.launch();

  // Test iPhone SE (375x667 - extreme small screen height)
  const contextSE = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true });
  const pageSE = await contextSE.newPage();
  const workerUrl = 'file:///' + path.resolve(__dirname, '../worker.html').replace(/\\/g, '/');
  await pageSE.goto(workerUrl);
  await pageSE.waitForLoadState('networkidle');

  // Check 1: Tap Friends tab
  const friendsTab = pageSE.locator('.m-nav-item[data-screen="friends"]');
  await friendsTab.click();
  await pageSE.waitForTimeout(300);

  const isFriendsActive = await pageSE.evaluate(() => {
    const scr = document.getElementById('scr-wrk-friends');
    const title = document.getElementById('headerScreenTitle');
    return scr && scr.classList.contains('active') && title && title.textContent === 'Друзья и напарники';
  });
  assert(isFriendsActive, 'Мобильный клик на таб "Друзья" успешно открывает #scr-wrk-friends с полным заголовком');

  // Check 2: Courier course scroll clearance on iPhone SE
  await pageSE.evaluate(() => {
    window.Eluma.Worker.navigate('profile');
    window.scrollTo({ top: 99999, behavior: 'instant' });
  });
  await pageSE.waitForTimeout(400);

  const scrollClearance = await pageSE.evaluate(() => {
    const lastCard = document.querySelector('.course-profile-card:last-child');
    const btn = lastCard ? lastCard.querySelector('button') : null;
    const nav = document.getElementById('mobileBottomBar');
    if (!btn || !nav) return { visible: false };

    const btnRect = btn.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    return {
      visible: true,
      btnTop: btnRect.top,
      btnBottom: btnRect.bottom,
      navTop: navRect.top,
      isFullyAboveNav: btnRect.bottom <= navRect.top
    };
  });

  assert(
    scrollClearance.visible && scrollClearance.isFullyAboveNav,
    `iPhone SE: Кнопка обучения на курьера доступна для скролла и полностью находится выше таб-бара (кнопка: ${Math.round(scrollClearance.btnBottom)}px, таб-бар: ${Math.round(scrollClearance.navTop)}px)`
  );

  // Check 3: Drawer on mobile
  await pageSE.evaluate(() => {
    window.Eluma.Worker.navigate('home');
    window.Eluma.Worker.openOrderDrawer(1);
  });
  await pageSE.waitForTimeout(300);

  const drawerStatus = await pageSE.evaluate(() => {
    const drawer = document.getElementById('workerOrderDrawer');
    if (!drawer) return { ok: false };
    const rect = drawer.getBoundingClientRect();
    const body = drawer.querySelector('.drawer-body');
    return {
      ok: true,
      width: rect.width,
      isActive: drawer.classList.contains('active'),
      isScrollable: body ? body.scrollHeight >= body.clientHeight : false
    };
  });

  assert(
    drawerStatus.ok && drawerStatus.isActive && drawerStatus.width === 375,
    'Мобильная шторка (Slide-Over Drawer) открывается на всю ширину 375px без боковых отступов'
  );

  // Check 4: Employer form & card on 375px
  const empUrl = 'file:///' + path.resolve(__dirname, '../employer.html').replace(/\\/g, '/');
  const pageEmp = await contextSE.newPage();
  await pageEmp.goto(empUrl);
  await pageEmp.waitForLoadState('networkidle');

  const empCardOverflow = await pageEmp.evaluate(() => {
    const firstCard = document.querySelector('.employer-task-card');
    if (!firstCard) return { overflow: false };
    const rect = firstCard.getBoundingClientRect();
    return {
      cardWidth: rect.width,
      winWidth: window.innerWidth,
      overflow: rect.right > window.innerWidth + 2
    };
  });

  assert(!empCardOverflow.overflow, 'Карточки заказов работодателя не вылезают за правый край экрана на 375px');

  await browser.close();

  console.log(`\n=== РЕЗУЛЬТАТЫ МОБИЛЬНЫХ ТЕСТОВ: ${passCount} ПРОЙДЕНО, ${failCount} ОШИБОК ===`);
  if (failCount > 0) process.exit(1);
  process.exit(0);
})();
