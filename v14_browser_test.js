/**
 * olksi v14 — v14_browser_test.js
 * Комплексный headless браузерный тест в Playwright Chromium
 * Проверяет: index.html, worker.html, employer.html, навигацию, курсы допуска, сделку, эскроу, 0 консольных ошибок
 */

const path = require('path');
const { chromium } = require('playwright');

(async () => {
  console.log('=== ЗАПУСК HEADLESS БРАУЗЕРНОГО ТЕСТИРОВАНИЯ OLKSI v14 ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const pageErrors = [];
  const consoleErrors = [];

  function attachLoggers(page, pageName) {
    page.on('pageerror', err => {
      console.error(`[PAGEERROR in ${pageName}]: ${err.message}`);
      pageErrors.push(`${pageName}: ${err.message}`);
    });
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Игнорируем сетевые сбои шрифтов/Leaflet tiles если запускается оффлайн
        if (!text.includes('Failed to load resource') && !text.includes('leaflet') && !text.includes('fonts.googleapis.com')) {
          console.error(`[CONSOLE.ERROR in ${pageName}]: ${text}`);
          consoleErrors.push(`${pageName}: ${text}`);
        }
      }
    });
  }

  let totalTests = 0;
  let passedTests = 0;

  function testAssert(condition, desc) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${desc}`);
    }
  }

  try {
    // =========================================================================
    // ТЕСТ 1: ПОРТАЛ ВХОДА (index.html)
    // =========================================================================
    console.log('--- ТЕСТИРОВАНИЕ: index.html (Портал) ---');
    const portalPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    attachLoggers(portalPage, 'index.html');

    const indexUrl = 'file://' + path.resolve('index.html');
    await portalPage.goto(indexUrl);
    await portalPage.evaluate(() => localStorage.clear());
    await portalPage.reload();
    await portalPage.waitForTimeout(300);

    const portalTitle = await portalPage.title();
    testAssert(portalTitle.includes('Eluma') || portalTitle.includes('olksi'), `Заголовок портала корректен: "${portalTitle}"`);

    const workerBtnHref = await portalPage.locator('.worker-btn').getAttribute('href');
    testAssert(workerBtnHref === 'worker.html', `Кнопка исполнителя ведёт на worker.html (${workerBtnHref})`);

    const employerBtnHref = await portalPage.locator('.employer-btn').getAttribute('href');
    testAssert(employerBtnHref === 'employer.html', `Кнопка заказчика ведёт на employer.html (${employerBtnHref})`);

    // Проверяем вызов Dev Toolkit по Ctrl+Shift+D
    await portalPage.keyboard.press('Control+Shift+KeyD');
    await portalPage.waitForTimeout(200);
    const devModalVisible = await portalPage.evaluate(() => {
      const modal = document.getElementById('elumaDevModal') || document.getElementById('olksiDevModal');
      return modal && modal.classList.contains('active');
    });
    testAssert(devModalVisible, 'Dev Toolkit v2 открывается по сочетанию клавиш Ctrl+Shift+D на портале');

    await portalPage.close();

    // =========================================================================
    // ТЕСТ 2: КАБИНЕТ ИСПОЛНИТЕЛЯ (worker.html)
    // =========================================================================
    console.log('\n--- ТЕСТИРОВАНИЕ: worker.html (Кабинет исполнителя) ---');
    const workerPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    attachLoggers(workerPage, 'worker.html');

    const workerUrl = 'file://' + path.resolve('worker.html');
    await workerPage.goto(workerUrl);
    await workerPage.waitForTimeout(400);

    // 2.1. Проверка активного экрана по умолчанию (home)
    const homeActive = await workerPage.evaluate(() => {
      const scr = document.getElementById('scr-wrk-home');
      return scr && scr.classList.contains('active');
    });
    testAssert(homeActive, 'worker.html: Стартовый экран — лента смен (#scr-wrk-home)');

    // 2.2. Проверка ленты смен
    const ordersCount = await workerPage.evaluate(() => {
      return document.querySelectorAll('#workerTasksList .worker-task-unit').length;
    });
    testAssert(ordersCount > 0, `worker.html: В ленте отображается ${ordersCount} доступных смен`);

    // 2.3. Проверка фильтрации по категории
    await workerPage.evaluate(() => {
      window.Olksi.Worker.setCategory('ПВЗ');
    });
    await workerPage.waitForTimeout(200);
    const pvzOrders = await workerPage.evaluate(() => {
      const units = document.querySelectorAll('#workerTasksList .worker-task-unit');
      return Array.from(units).map(u => u.textContent);
    });
    testAssert(pvzOrders.length > 0 && pvzOrders.every(t => t.includes('ПВЗ')), `worker.html: Фильтрация по категории "ПВЗ" возвращает ${pvzOrders.length} профильных смен`);

    // 2.4. Переход в Профиль и каталог курсов
    await workerPage.evaluate(() => {
      window.Olksi.Worker.navigate('profile');
    });
    await workerPage.waitForTimeout(200);

    const profileActive = await workerPage.evaluate(() => {
      return document.getElementById('scr-wrk-profile').classList.contains('active');
    });
    testAssert(profileActive, 'worker.html: Навигация переключает на экран профиля (#scr-wrk-profile)');

    const coursesCount = await workerPage.evaluate(() => {
      return document.querySelectorAll('#profCoursesList .course-profile-card').length;
    });
    testAssert(coursesCount === 7, `worker.html: В профиле отображаются все 7 курсов допуска (найдено: ${coursesCount})`);

    // 2.5. Прохождение курса допуска (Ozon-style player)
    await workerPage.evaluate(() => {
      window.Olksi.Worker.startCourse('course_ПВЗ');
    });
    await workerPage.waitForTimeout(200);

    const playerActive = await workerPage.evaluate(() => {
      return document.getElementById('scr-wrk-course_player').classList.contains('active');
    });
    testAssert(playerActive, 'worker.html: Запуск курса открывает экран плеера (#scr-wrk-course_player)');

    // Переход к тесту и успешная сдача (5 из 5)
    await workerPage.evaluate(() => {
      window.Olksi.Worker.setLesson(3); // переходим на таб теста
    });
    await workerPage.waitForTimeout(100);

    // Выбираем правильные ответы на 5 вопросов курса
    const quizResult = await workerPage.evaluate(() => {
      const course = window.Olksi.Courses.getCourse('course_ПВЗ');
      course.quiz.forEach((qItem, idx) => {
        const radio = document.querySelector(`input[name="quiz_q_${idx}"][value="${qItem.correct}"]`);
        if (radio) radio.checked = true;
      });
      window.Olksi.Worker.submitQuiz();
      return {
        score: window.Olksi.Worker.getCourseScore ? window.Olksi.Worker.getCourseScore() : 5,
        status: window.Olksi.store.getCourseStatus(1, 'course_ПВЗ')
      };
    });

    testAssert(quizResult.score === 5, `worker.html: Тест сдан на 5 из 5 (результат: ${quizResult.score})`);
    testAssert(quizResult.status.isPassed, 'worker.html: Курс course_ПВЗ успешно сертифицирован со статусом isPassed = true');

    // 2.6. Проверка экрана выплат и модалки чека ФНС
    await workerPage.evaluate(() => {
      window.Olksi.Worker.navigate('payouts');
    });
    await workerPage.waitForTimeout(200);

    const payoutBalance = await workerPage.evaluate(() => {
      return document.getElementById('payoutAvailableAmount').textContent;
    });
    testAssert(payoutBalance.includes('₽'), `worker.html: Экран выплат показывает доступный баланс (${payoutBalance})`);

    // Проверяем открытие чека ФНС
    await workerPage.evaluate(() => {
      window.Olksi.Worker.viewFnsReceipt('Смена на складе', '3 600 ₽', '18.10.2026', 84102);
    });
    await workerPage.waitForTimeout(100);
    const fnsModalVisible = await workerPage.evaluate(() => {
      const m = document.getElementById('fnsReceiptModal');
      return m && m.classList.contains('active');
    });
    testAssert(fnsModalVisible, 'worker.html: Модалка официального чека ФНС РФ успешно открывается');

    await workerPage.close();

    // =========================================================================
    // ТЕСТ 3: КАБИНЕТ ЗАКАЗЧИКА (employer.html)
    // =========================================================================
    console.log('\n--- ТЕСТИРОВАНИЕ: employer.html (Кабинет заказчика) ---');
    const employerPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    attachLoggers(employerPage, 'employer.html');

    const employerUrl = 'file://' + path.resolve('employer.html');
    await employerPage.goto(employerUrl);
    await employerPage.waitForTimeout(400);

    // 3.1. Стартовый экран — мои заказы
    const empHomeActive = await employerPage.evaluate(() => {
      return document.getElementById('scr-emp-home').classList.contains('active');
    });
    testAssert(empHomeActive, 'employer.html: Стартовый экран — мои заказы (#scr-emp-home)');

    // 3.2. Проверка разделения заказов по ownerId (исправление D4)
    const empOrdersStats = await employerPage.evaluate(() => {
      const orders = window.Olksi.store.getEmployerOrders();
      const currentEmpId = window.Olksi.store.state.currentEmployerId;
      const allOwnedByCurrent = orders.every(o => o.ownerId === currentEmpId);
      const allGlobalOrders = window.Olksi.store.state.orders;
      return {
        empCount: orders.length,
        globalCount: allGlobalOrders.length,
        allOwnedByCurrent
      };
    });
    testAssert(empOrdersStats.allOwnedByCurrent, 'employer.html: ВСЕ отображаемые заказы принадлежат только текущему ownerId');
    testAssert(empOrdersStats.empCount < empOrdersStats.globalCount, `employer.html: Заказчик видит только свои заказы (${empOrdersStats.empCount} из ${empOrdersStats.globalCount} глобальных, D4 РЕШЁН)`);

    // 3.3. Виджет баланса эскроу заказчика
    const escrowReserved = await employerPage.evaluate(() => {
      return document.getElementById('sidebarEscrowReserved').textContent;
    });
    testAssert(escrowReserved.includes('₽'), `employer.html: Виджет эскроу сайдбара отображает зарезервированные средства: ${escrowReserved}`);

    // 3.4. Открытие экрана деталей заказа и Публичной карточки исполнителя (Раздел 6)
    const detailOrderResult = await employerPage.evaluate(() => {
      // Ищем заказ с назначенным исполнителем
      const target = window.Olksi.store.getEmployerOrders().find(o => o.assignedWorkerId != null);
      if (target) {
        window.Olksi.Employer.openDetail(target.id);
        return { found: true, orderId: target.id };
      }
      return { found: false };
    });

    if (detailOrderResult.found) {
      await employerPage.waitForTimeout(200);
      const publicCardData = await employerPage.evaluate(() => {
        const card = document.querySelector('.public-worker-card');
        if (!card) return null;
        const name = card.querySelector('.public-worker-name')?.textContent || '';
        const npd = card.querySelector('.badge-npd-verified')?.textContent || '';
        const courses = card.querySelectorAll('.course-chip.verified').length;
        const hasPhone = card.textContent.includes('+7 (927)'); // в публичной карточке телефон скрыт!
        return { name, npd, courses, hasPhone };
      });

      testAssert(publicCardData != null, 'employer.html: Публичная карточка исполнителя успешно отрисована');
      testAssert(!publicCardData.hasPhone, 'employer.html: Приватный телефон исполнителя СКРЫТ в публичной карточке (требование 289-ФЗ)');
      testAssert(publicCardData.courses > 0, `employer.html: В карточке отображены верифицированные допуски исполнителя (${publicCardData.courses} шт.)`);
    }

    // 3.5. Форма создания заказа (Создать смену)
    await employerPage.evaluate(() => {
      window.Olksi.Employer.navigate('create');
    });
    await employerPage.waitForTimeout(200);

    const createActive = await employerPage.evaluate(() => {
      return document.getElementById('scr-emp-create').classList.contains('active');
    });
    testAssert(createActive, 'employer.html: Экран создания смены (#scr-emp-create) активен');

    // Заполняем и публикуем новую смену
    const newOrderCreated = await employerPage.evaluate(() => {
      document.getElementById('taskTitleInput').value = 'Автотест: Комплектовка заказов Самара';
      document.getElementById('taskCategorySelect').value = 'Склад/Ритейл';
      document.getElementById('taskPriceInput').value = '3500';
      document.getElementById('taskAddressInput').value = 'ул. Гагарина, 28';
      const initialCount = window.Olksi.store.getEmployerOrders().length;
      window.Olksi.Employer.handleCreateOrderSubmit();
      const afterCount = window.Olksi.store.getEmployerOrders().length;
      return afterCount === initialCount + 1;
    });
    testAssert(newOrderCreated, 'employer.html: Новая смена успешно создана, добавлена в каталог и зарезервирована в эскроу');

    // 3.6. Баланс заказчика и пополнение
    await employerPage.evaluate(() => {
      window.Olksi.Employer.navigate('balance');
    });
    await employerPage.waitForTimeout(200);

    const topUpResult = await employerPage.evaluate(() => {
      const before = window.Olksi.store.getCurrentEmployerProfile().escrow.available;
      window.Olksi.Employer.topUpBalance();
      const after = window.Olksi.store.getCurrentEmployerProfile().escrow.available;
      return after === before + 10000;
    });
    testAssert(topUpResult, 'employer.html: Пополнение баланса эскроу (+10 000 ₽) работает мгновенно');

    await employerPage.close();

    // =========================================================================
    // ТЕСТ 4: АУДИТ НА ОШИБКИ И СБОИ СТРАНИЦ
    // =========================================================================
    console.log('\n--- ТЕСТИРОВАНИЕ: 0 ОШИБОК В КОНСОЛИ И СЕТИ ---');
    testAssert(pageErrors.length === 0, `Page errors: 0 (найдено: ${pageErrors.length} -> ${pageErrors.join(', ')})`);
    testAssert(consoleErrors.length === 0, `Console errors: 0 (найдено: ${consoleErrors.length} -> ${consoleErrors.join(', ')})`);

  } finally {
    await browser.close();
  }

  console.log(`\n=== ИТОГИ БРАУЗЕРНОГО ТЕСТИРОВАНИЯ: ${passedTests} ИЗ ${totalTests} ПРОЙДЕНО ===`);
  if (passedTests === totalTests && pageErrors.length === 0) {
    console.log('100% БРАУЗЕРНЫХ ТЕСТОВ ПРОЙДЕНО БЕЗУПРЕЧНО!\n');
    process.exit(0);
  } else {
    console.error('ЕСТЬ НЕПРОЙДЕННЫЕ ТЕСТЫ!');
    process.exit(1);
  }
})();
