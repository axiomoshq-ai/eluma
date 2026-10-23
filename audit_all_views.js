const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const consoleMsgs = [];
  const pageErrors = [];
  page.on('console', msg => {
    if (!msg.text().includes('Download the Vue Devtools') && !msg.text().includes('Failed to load resource')) {
      consoleMsgs.push(msg.text());
    }
  });
  page.on('pageerror', err => pageErrors.push(err.message));

  console.log('=== ЭТАП 1: АУДИТ ПОРТАЛА (index.html) ===');
  await page.goto('file://' + path.resolve('index.html').replace(/\\/g, '/'));
  
  for (const w of [360, 480, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width: w, height: 800 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log(`Portal @ ${w}px: overflow-x=${overflow}`);
  }

  console.log('\n=== ЭТАП 2: АУДИТ КАБИНЕТА ИСПОЛНИТЕЛЯ (worker.html) ===');
  await page.goto('file://' + path.resolve('worker.html').replace(/\\/g, '/'));
  
  const workerScreens = [
    { name: 'Лента смен', id: 'home', action: () => window.Olksi.Worker.navigate('home') },
    { name: 'Мои записи (Активные)', id: 'my', action: () => { window.Olksi.Worker.myTab = 'active'; window.Olksi.Worker.navigate('my'); } },
    { name: 'Мои записи (Архив)', id: 'my_archive', action: () => { window.Olksi.Worker.myTab = 'archive'; window.Olksi.Worker.navigate('my'); } },
    { name: 'Выплаты и СБП', id: 'payouts', action: () => window.Olksi.Worker.navigate('payouts') },
    { name: 'Чаты', id: 'chats', action: () => window.Olksi.Worker.navigate('chats') },
    { name: 'Профиль и курсы', id: 'profile', action: () => window.Olksi.Worker.navigate('profile') },
    { name: 'Плеер курса Ozon', id: 'course_player', action: () => window.Olksi.Worker.startCourse('safe_intro') },
    { name: 'Детали смены #1', id: 'detail', action: () => window.Olksi.Worker.openDetail(1) }
  ];

  for (const scr of workerScreens) {
    for (const w of [360, 768, 1440]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.evaluate(scr.action);
      await page.waitForTimeout(100);
      const res = await page.evaluate(() => {
        const active = document.querySelector('.screen.active');
        const overflow = document.documentElement.scrollWidth > window.innerWidth;
        return {
          activeId: active ? active.id : 'NONE',
          overflow
        };
      });
      const ok = !res.overflow && res.activeId !== 'NONE';
      console.log(`Worker [${scr.name}] @ ${w}px: ${ok ? 'OK' : 'FAIL'} (active=${res.activeId}, overflow=${res.overflow})`);
    }
  }

  console.log('\n=== ЭТАП 3: АУДИТ МОДАЛОК ИСПОЛНИТЕЛЯ ===');
  // 1. Модалка чека ФНС
  await page.evaluate(() => window.Olksi.Worker.viewFnsReceipt(101));
  const fnsVisible = await page.evaluate(() => {
    const m = document.getElementById('fnsReceiptModal');
    return m && getComputedStyle(m).display !== 'none';
  });
  console.log('Модалка чека ФНС: ' + (fnsVisible ? 'OK' : 'FAIL'));
  await page.evaluate(() => window.Olksi.UI.closeModal('fnsReceiptModal'));

  // 2. Модалка встречного предложения (counter-offer)
  await page.evaluate(() => {
    window.Olksi.UI.openModal('counterOfferModal');
  });
  const counterVisible = await page.evaluate(() => {
    const m = document.getElementById('counterOfferModal');
    return m && getComputedStyle(m).display !== 'none';
  });
  console.log('Модалка встречного предложения: ' + (counterVisible ? 'OK' : 'FAIL'));
  await page.evaluate(() => window.Olksi.UI.closeModal('counterOfferModal'));

  // 3. Dev Toolkit
  await page.evaluate(() => (window.Eluma.DevToolkit || window.Olksi.DevToolkit).toggleModal());
  const devToolkitVisible = await page.evaluate(() => {
    const m = document.getElementById('elumaDevModal') || document.getElementById('olksiDevModal');
    return m && m.classList.contains('active') && getComputedStyle(m).display !== 'none';
  });
  console.log('Панель Dev Toolkit: ' + (devToolkitVisible ? 'OK' : 'FAIL'));
  await page.evaluate(() => (window.Eluma.DevToolkit || window.Olksi.DevToolkit).toggleModal());

  console.log('\n=== ЭТАП 4: АУДИТ КАБИНЕТА ЗАКАЗЧИКА (employer.html) ===');
  await page.goto('file://' + path.resolve('employer.html').replace(/\\/g, '/'));
  
  const employerScreens = [
    { name: 'Мои заказы', id: 'home', action: () => window.Olksi.Employer.navigate('home') },
    { name: 'Создание смены', id: 'create', action: () => window.Olksi.Employer.navigate('create') },
    { name: 'Детали заказа #1', id: 'detail', action: () => window.Olksi.Employer.openDetail(1) },
    { name: 'Чаты', id: 'chats', action: () => window.Olksi.Employer.navigate('chats') },
    { name: 'Эскроу и баланс', id: 'balance', action: () => window.Olksi.Employer.navigate('balance') },
    { name: 'Профиль компании', id: 'profile', action: () => window.Olksi.Employer.navigate('profile') }
  ];

  for (const scr of employerScreens) {
    for (const w of [360, 768, 1440]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.evaluate(scr.action);
      await page.waitForTimeout(100);
      const res = await page.evaluate(() => {
        const active = document.querySelector('.screen.active');
        const overflow = document.documentElement.scrollWidth > window.innerWidth;
        return {
          activeId: active ? active.id : 'NONE',
          overflow
        };
      });
      const ok = !res.overflow && res.activeId !== 'NONE';
      console.log(`Employer [${scr.name}] @ ${w}px: ${ok ? 'OK' : 'FAIL'} (active=${res.activeId}, overflow=${res.overflow})`);
    }
  }

  console.log('\n=== ЭТАП 5: АУДИТ МОДАЛОК ЗАКАЗЧИКА ===');
  // 1. Модалка замечаний доработки
  await page.evaluate(() => window.Olksi.Employer.openReworkModal(1));
  const reworkVisible = await page.evaluate(() => {
    const m = document.getElementById('reworkReasonModal');
    return m && getComputedStyle(m).display !== 'none';
  });
  console.log('Модалка замечаний доработки: ' + (reworkVisible ? 'OK' : 'FAIL'));
  await page.evaluate(() => window.Olksi.UI.closeModal('reworkReasonModal'));

  // 2. Модалка отзыва
  await page.evaluate(() => window.Olksi.Employer.openReviewModal(1));
  const reviewVisible = await page.evaluate(() => {
    const m = document.getElementById('empReviewModal');
    return m && getComputedStyle(m).display !== 'none';
  });
  console.log('Модалка отзыва заказчика: ' + (reviewVisible ? 'OK' : 'FAIL'));
  await page.evaluate(() => window.Olksi.UI.closeModal('empReviewModal'));

  // 3. Модалка прозрачности 289-ФЗ
  await page.evaluate(() => window.Olksi.Employer.openTransparencyModal());
  const transparencyVisible = await page.evaluate(() => {
    const m = document.getElementById('transparencyModal');
    return m && getComputedStyle(m).display !== 'none';
  });
  console.log('Модалка прозрачности 289-ФЗ: ' + (transparencyVisible ? 'OK' : 'FAIL'));
  await page.evaluate(() => window.Olksi.UI.closeModal('transparencyModal'));

  // 4. Модалка редактирования цены/описания
  await page.evaluate(() => window.Olksi.Employer.openEditModal(1));
  const editVisible = await page.evaluate(() => {
    const m = document.getElementById('editTaskModal');
    return m && getComputedStyle(m).display !== 'none';
  });
  console.log('Модалка редактирования цены/описания: ' + (editVisible ? 'OK' : 'FAIL'));
  await page.evaluate(() => window.Olksi.UI.closeModal('editTaskModal'));

  console.log('\n=== ЭТАП 6: АУДИТ ТЁМНОЙ ТЕМЫ И ПАЛИТРЫ ===');
  await page.evaluate(() => window.Olksi.UI.toggleTheme());
  const isDark = await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark');
  console.log('Тёмная тема включена: ' + isDark);
  await page.evaluate(() => window.Olksi.UI.toggleTheme());

  console.log('\nИТОГО ОШИБОК СТРАНИЦЫ (pageerror): ' + pageErrors.length);
  if (pageErrors.length > 0) {
    console.error('Page errors:', pageErrors);
  }

  await browser.close();
})();
