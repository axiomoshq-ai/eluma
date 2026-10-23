/**
 * Eluma v15 — dev/toolkit.js
 * Dev Toolkit v3: панель тестирования, симуляции этапов и переключения кабинетов.
 * Доступна по кнопке в правом нижнем углу и по сочетанию клавиш Ctrl+Shift+D.
 */

(function () {
  'use strict';

  window.Eluma = window.Eluma || {};
  window.Olksi = window.Eluma;

  const store = window.Eluma.store || (window.Olksi && window.Olksi.store);
  const UI = window.Eluma.UI || (window.Olksi && window.Olksi.UI);
  const Courses = window.Eluma.Courses || (window.Olksi && window.Olksi.Courses);

  const errorLogs = [];

  // Перехват ошибок в журнал
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (e) => {
      errorLogs.unshift({
        time: new Date().toLocaleTimeString('ru-RU'),
        msg: e.message,
        source: e.filename ? e.filename.split('/').pop() : 'script',
        line: e.lineno
      });
      renderErrorLog();
    });

    window.addEventListener('unhandledrejection', (e) => {
      errorLogs.unshift({
        time: new Date().toLocaleTimeString('ru-RU'),
        msg: e.reason ? (e.reason.message || String(e.reason)) : 'Unhandled Rejection',
        source: 'promise',
        line: '-'
      });
      renderErrorLog();
    });

    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd' || e.key === 'В' || e.key === 'в')) {
        e.preventDefault();
        toggleModal();
      }
    });
  }

  function initDevToolkit() {
    renderDevPill();
    renderDevModal();
  }

  function renderDevPill() {
    let bar = document.getElementById('elumaDevBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'elumaDevBar';
      bar.className = 'eluma-dev-floating-pill olksi-dev-floating-pill';

      const path = (window.location.pathname || '').toLowerCase();
      const isEmployer = path.includes('employer');
      const isWorker = path.includes('worker');

      let switchBtnHtml = '';
      if (isWorker) {
        switchBtnHtml = `
          <button type="button" class="dev-role-switch-btn" onclick="window.location.href='employer.html'" title="Переключиться в кабинет заказчика">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4"/></svg>
            <span>Заказчик</span>
          </button>
        `;
      } else if (isEmployer) {
        switchBtnHtml = `
          <button type="button" class="dev-role-switch-btn" onclick="window.location.href='worker.html'" title="Переключиться в кабинет исполнителя">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4"/></svg>
            <span>Исполнитель</span>
          </button>
        `;
      } else {
        switchBtnHtml = `
          <button type="button" class="dev-role-switch-btn" onclick="window.location.href='worker.html'" title="Войти в кабинет исполнителя">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4"/></svg>
            <span>Кабинет</span>
          </button>
        `;
      }

      bar.innerHTML = `
        ${switchBtnHtml}
        <button type="button" class="dev-floating-btn" id="elumaDevBtn" onclick="window.Eluma.DevToolkit.toggleModal()" title="Dev Toolkit (Ctrl+Shift+D)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span>Dev</span>
        </button>
      `;
      document.body.appendChild(bar);
    }
  }

  function renderDevModal() {
    let modal = document.getElementById('elumaDevModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'elumaDevModal';
      modal.className = 'modal-backdrop dev-toolkit-backdrop';
      modal.onclick = (e) => {
        if (e.target === modal) toggleModal();
      };
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-sheet-dialog dev-toolkit-dialog-v2" onclick="event.stopPropagation()">
        <div class="modal-header-line">
          <div class="modal-title-box">
            <h3 class="modal-main-title">Dev Toolkit v3 • Инструменты тестирования</h3>
            <span class="modal-sub-label">Самара 2026 • Изолированная среда Eluma v15</span>
          </div>
          <button class="modal-close-ico" onclick="window.Eluma.DevToolkit.toggleModal()" title="Закрыть">
            ${UI.SVG_ICONS.close}
          </button>
        </div>

        <div class="dev-tabs-bar">
          <button class="dev-tab-btn active" data-tab="cabinets" onclick="window.Eluma.DevToolkit.switchTab('cabinets')">Кабинет</button>
          <button class="dev-tab-btn" data-tab="worker" onclick="window.Eluma.DevToolkit.switchTab('worker')">Исполнитель</button>
          <button class="dev-tab-btn" data-tab="employer" onclick="window.Eluma.DevToolkit.switchTab('employer')">Заказчик</button>
          <button class="dev-tab-btn" data-tab="deal" onclick="window.Eluma.DevToolkit.switchTab('deal')">Сделка</button>
          <button class="dev-tab-btn" data-tab="data" onclick="window.Eluma.DevToolkit.switchTab('data')">Данные</button>
        </div>

        <div class="dev-tab-content-box">
          <!-- ВКЛАДКА 1: КАБИНЕТ И РОЛИ -->
          <div class="dev-tab-panel active" id="devTab_cabinets">
            <div class="dev-control-group">
              <label class="dev-control-label">Быстрый переход между кабинетами:</label>
              <div class="dev-action-buttons-grid">
                <a href="worker.html" class="dev-nav-link-btn">
                  ${UI.SVG_ICONS.user} <span>Кабинет исполнителя (worker.html)</span>
                </a>
                <a href="employer.html" class="dev-nav-link-btn">
                  ${UI.SVG_ICONS.shield} <span>Кабинет заказчика (employer.html)</span>
                </a>
                <button type="button" class="dev-nav-link-btn special" onclick="window.Eluma.DevToolkit.openSideBySide()">
                  ${UI.SVG_ICONS.play} <span>Открыть оба кабинета рядом (Два окна)</span>
                </button>
              </div>
            </div>

            <div class="dev-control-group">
              <label class="dev-control-label">Выбор демо-профиля исполнителя:</label>
              <div class="dev-profile-select-grid">
                <button type="button" class="dev-profile-chip ${store.state.currentUserId === 1 ? 'active' : ''}" onclick="window.Eluma.DevToolkit.setWorkerProfile(1)">
                  <strong>Алексей К.</strong> <span>Про-статус (12 смен, рейтинг 4.96)</span>
                </button>
                <button type="button" class="dev-profile-chip ${store.state.currentUserId === 2 ? 'active' : ''}" onclick="window.Eluma.DevToolkit.setWorkerProfile(2)">
                  <strong>Дмитрий М.</strong> <span>Новичок (1 смена, холд 72 ч)</span>
                </button>
              </div>
            </div>

            <div class="dev-control-group">
              <label class="dev-control-label">Выбор демо-профиля заказчика:</label>
              <div class="dev-profile-select-grid">
                <button type="button" class="dev-profile-chip ${store.state.currentEmployerId === 101 ? 'active' : ''}" onclick="window.Eluma.DevToolkit.setEmployerProfile(101)">
                  <strong>ООО «СтройСамара Логистика»</strong> <span>B2B Логистика</span>
                </button>
                <button type="button" class="dev-profile-chip ${store.state.currentEmployerId === 102 ? 'active' : ''}" onclick="window.Eluma.DevToolkit.setEmployerProfile(102)">
                  <strong>Елена В.</strong> <span>Частное лицо (P2P)</span>
                </button>
                <button type="button" class="dev-profile-chip ${store.state.currentEmployerId === 103 ? 'active' : ''}" onclick="window.Eluma.DevToolkit.setEmployerProfile(103)">
                  <strong>«Самара Маркет»</strong> <span>ПВЗ и Ритейл</span>
                </button>
              </div>
            </div>
          </div>

          <!-- ВКЛАДКА 2: ИСПОЛНИТЕЛЬ И КУРСЫ -->
          <div class="dev-tab-panel" id="devTab_worker">
            <div class="dev-control-group">
              <label class="dev-control-label">Гарантийный холд 72 ч (двухуровневые выплаты):</label>
              <div class="dev-action-buttons-grid">
                <button type="button" class="dev-action-btn" onclick="window.Eluma.DevToolkit.releaseHold72h()">
                  <strong>Разморозить холд 72 ч досрочно</strong> <span>Перенести средства из hold72h в доступный баланс</span>
                </button>
              </div>
            </div>

            <div class="dev-control-group">
              <div class="dev-group-header">
                <label class="dev-control-label">Управление допусками по категориям:</label>
                <div class="dev-header-actions">
                  <button type="button" class="dev-mini-btn" onclick="window.Eluma.DevToolkit.passAllCourses()">Сдать ВСЕ в 1 клик</button>
                  <button type="button" class="dev-mini-btn danger" onclick="window.Eluma.DevToolkit.resetAllCourses()">Сбросить все</button>
                </div>
              </div>
              <div class="dev-courses-checklist" id="devCoursesChecklist">
                ${renderDevCoursesChecklist()}
              </div>
            </div>

            <div class="dev-control-group">
              <label class="dev-control-label">Моделирование истечения срока допуска:</label>
              <div class="dev-action-buttons-grid">
                <button type="button" class="dev-action-btn" onclick="window.Eluma.DevToolkit.ageCourseToExpiring('course_ПВЗ')">
                  <strong>Состарить допуск ПВЗ</strong> <span>Осталось 5 дней (статус «Скоро истекает»)</span>
                </button>
                <button type="button" class="dev-action-btn" onclick="window.Eluma.DevToolkit.ageCourseToExpired('course_ПВЗ')">
                  <strong>Сделать допуск ПВЗ истёкшим</strong> <span>Срок действия 12 мес. истёк</span>
                </button>
              </div>
            </div>
          </div>

          <!-- ВКЛАДКА 3: ЗАКАЗЧИК -->
          <div class="dev-tab-panel" id="devTab_employer">
            <div class="dev-control-group">
              <label class="dev-control-label">Быстрое создание смены:</label>
              <div class="dev-action-buttons-grid">
                <button type="button" class="dev-action-btn" onclick="window.Eluma.DevToolkit.createSampleOrder('ПВЗ')">
                  <strong>+ Тестовая смена: ПВЗ</strong> <span>2 800 ₽ • Октябрьский р-н</span>
                </button>
                <button type="button" class="dev-action-btn" onclick="window.Eluma.DevToolkit.createSampleOrder('Физическая помощь')">
                  <strong>+ Тестовая смена: Погрузка</strong> <span>3 200 ₽ • Кировский р-н</span>
                </button>
              </div>
            </div>

            <div class="dev-control-group">
              <label class="dev-control-label">Баланс эскроу заказчика:</label>
              <button type="button" class="dev-action-btn" onclick="window.Eluma.DevToolkit.topUpEscrow(10000)">
                <strong>+10 000 ₽ на эскроу-депозит</strong> <span>Мгновенное тестовое пополнение</span>
              </button>
            </div>
          </div>

          <!-- ВКЛАДКА 4: СДЕЛКА (END-TO-END) -->
          <div class="dev-tab-panel" id="devTab_deal">
            <div class="dev-deal-banner">
              <strong>Сквозная симуляция сделки Eluma Safe</strong>
              <p>Выполняет весь жизненный цикл заказа за 1 клик с реальной записью фотоотчёта, перечислением выплаты по СБП и чеком ФНС.</p>
              <button type="button" class="btn btn-primary-cta" onclick="window.Eluma.DevToolkit.runCompleteDeal()">
                Запустить полный цикл сделки (1 клик)
              </button>
            </div>

            <div class="dev-stepper-control">
              <label class="dev-control-label">Пошаговое продвижение выбранной смены:</label>
              <div class="dev-steps-grid">
                <button type="button" class="dev-step-btn" onclick="window.Eluma.DevToolkit.stepApply()">1. Откликнуться</button>
                <button type="button" class="dev-step-btn" onclick="window.Eluma.DevToolkit.stepCheckIn()">2. Я на месте (GPS)</button>
                <button type="button" class="dev-step-btn" onclick="window.Eluma.DevToolkit.stepProofs()">3. Сдать фотоотчёт</button>
                <button type="button" class="dev-step-btn" onclick="window.Eluma.DevToolkit.stepAccept()">4. Принять и оплатить</button>
              </div>
            </div>
          </div>

          <!-- ВКЛАДКА 5: ДАННЫЕ И СБРОС -->
          <div class="dev-tab-panel" id="devTab_data">
            <div class="dev-control-group">
              <label class="dev-control-label">Сброс и управление состоянием:</label>
              <div class="dev-action-buttons-grid">
                <button type="button" class="dev-action-btn danger" onclick="window.Eluma.DevToolkit.resetDatabase()">
                  <strong>Сбросить базу до заводского сида v15</strong>
                  <span>Очищает eluma_db_v15</span>
                </button>
                <button type="button" class="dev-action-btn" onclick="window.Eluma.DevToolkit.exportStateJson()">
                  <strong>Экспортировать состояние в JSON</strong>
                  <span>Скачать полный дамп базы данных</span>
                </button>
              </div>
            </div>

            <div class="dev-control-group">
              <label class="dev-control-label">Журнал ошибок JavaScript (window.onerror):</label>
              <div class="dev-error-log-box" id="devErrorLogBox">
                ${renderErrorLogHtml()}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderDevCoursesChecklist() {
    const allCourses = Courses.getAllCourses();
    const wid = store.state.currentUserId || 1;
    return allCourses.map(c => {
      const cStatus = store.getCourseStatus(wid, c.id);
      return `
        <div class="dev-course-row ${cStatus.isPassed ? 'passed' : 'pending'}">
          <div class="dev-course-info">
            <strong>${UI.escapeHtml(c.category)}</strong>
            <span>${cStatus.label}</span>
          </div>
          <button type="button" class="dev-toggle-btn ${cStatus.isPassed ? 'active' : ''}" onclick="window.Eluma.DevToolkit.toggleCourse('${c.id}')">
            ${cStatus.isPassed ? 'Сбросить' : 'Сдать'}
          </button>
        </div>
      `;
    }).join('');
  }

  function renderErrorLogHtml() {
    if (errorLogs.length === 0) {
      return `<p class="dev-error-empty">Ошибок в текущей сессии нет. Все скрипты работают штатно.</p>`;
    }
    return errorLogs.map(e => `
      <div class="dev-error-item">
        <span class="dev-error-time">${e.time}</span>
        <strong class="dev-error-msg">${UI.escapeHtml(e.msg)}</strong>
        <span class="dev-error-src">${e.source}:${e.line}</span>
      </div>
    `).join('');
  }

  function renderErrorLog() {
    const box = document.getElementById('devErrorLogBox');
    if (box) box.innerHTML = renderErrorLogHtml();
  }

  function toggleModal() {
    let modal = document.getElementById('elumaDevModal');
    if (!modal) {
      renderDevModal();
      modal = document.getElementById('elumaDevModal');
    }
    if (!modal) return;
    modal.classList.toggle('active');
    if (modal.classList.contains('active')) {
      renderDevModal();
    }
  }

  function switchTab(tabKey) {
    document.querySelectorAll('.dev-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabKey);
    });
    document.querySelectorAll('.dev-tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === 'devTab_' + tabKey);
    });
  }

  function openSideBySide() {
    try {
      window.open('worker.html', 'eluma_worker', 'width=720,height=900,left=80,top=60');
      window.open('employer.html', 'eluma_employer', 'width=720,height=900,left=820,top=60');
      UI.showFeedbackToast('Два окна открыты', 'Кабинеты синхронизируются в реальном времени');
    } catch (e) {
      console.warn(e);
    }
  }

  function setWorkerProfile(uid) {
    store.state.currentUserId = uid;
    store.save('user_switched');
    UI.showFeedbackToast('Профиль переключен', uid === 1 ? 'Алексей К. (Про)' : 'Дмитрий М. (Новичок)');
    renderDevModal();
  }

  function setEmployerProfile(eid) {
    store.state.currentEmployerId = eid;
    store.save('employer_switched');
    const name = eid === 101 ? 'ООО «СтройСамара Логистика»' : (eid === 102 ? 'Елена В.' : '«Самара Маркет»');
    UI.showFeedbackToast('Заказчик переключен', name);
    renderDevModal();
  }

  function passAllCourses() {
    const wid = store.state.currentUserId || 1;
    Courses.getAllCourses().forEach(c => {
      store.completeCourseTest(c.id, 5, wid);
    });
    UI.showFeedbackToast('Dev Toolkit', 'Все 7 курсов успешно сданы на 5/5!');
    renderDevModal();
  }

  function resetAllCourses() {
    const wid = store.state.currentUserId || 1;
    if (!store.state.courseProgress) store.state.courseProgress = {};
    store.state.courseProgress[wid] = {};
    store.save('courses_reset');
    UI.showFeedbackToast('Dev Toolkit', 'Все допуски исполнителя сброшены');
    renderDevModal();
  }

  function toggleCourse(courseId) {
    const wid = store.state.currentUserId || 1;
    const current = store.getCourseStatus(wid, courseId);
    if (current.isPassed) {
      if (store.state.courseProgress && store.state.courseProgress[wid]) {
        delete store.state.courseProgress[wid][courseId];
      }
      store.save('course_cleared');
    } else {
      store.completeCourseTest(courseId, 5, wid);
    }
    renderDevModal();
  }

  function ageCourseToExpiring(courseId) {
    const wid = store.state.currentUserId || 1;
    if (!store.state.courseProgress) store.state.courseProgress = {};
    if (!store.state.courseProgress[wid]) store.state.courseProgress[wid] = {};

    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 5);

    store.state.courseProgress[wid][courseId] = {
      courseId: courseId,
      version: 1,
      status: 'passed',
      bestScore: 5,
      passedAt: '01.01.2026',
      validUntil: expDate.toLocaleDateString('ru-RU')
    };
    store.save('course_aged');
    UI.showFeedbackToast('Курс состарен', 'Допуск истекает через 5 дней');
    renderDevModal();
  }

  function ageCourseToExpired(courseId) {
    const wid = store.state.currentUserId || 1;
    if (!store.state.courseProgress) store.state.courseProgress = {};
    if (!store.state.courseProgress[wid]) store.state.courseProgress[wid] = {};

    const expDate = new Date();
    expDate.setDate(expDate.getDate() - 10);

    store.state.courseProgress[wid][courseId] = {
      courseId: courseId,
      version: 1,
      status: 'expired',
      bestScore: 4,
      passedAt: '01.01.2025',
      validUntil: expDate.toLocaleDateString('ru-RU')
    };
    store.save('course_expired');
    UI.showFeedbackToast('Курс истёк', 'Срок действия 12 месяцев завершён');
    renderDevModal();
  }

  function releaseHold72h() {
    const prof = store.getCurrentWorkerProfile();
    if (!prof || !prof.wallet) {
      UI.showFeedbackToast('Ошибка', 'Профиль исполнителя не найден');
      return;
    }
    const holdAmount = prof.wallet.hold72h || 0;
    if (holdAmount <= 0) {
      UI.showFeedbackToast('Холд пуст', 'На гарантийном удержании нет средств (0 ₽)');
      return;
    }
    prof.wallet.available = (prof.wallet.available || 0) + holdAmount;
    prof.wallet.hold72h = 0;
    store.save('hold_released');
    UI.showFeedbackToast('Холд разморожен', `+${holdAmount.toLocaleString('ru-RU')} ₽ переведены в доступный баланс`);
    renderDevModal();
  }

  function createSampleOrder(category) {
    const newOrder = {
      id: Date.now(),
      ownerId: store.state.currentEmployerId || 101,
      title: `Тестовая смена: ${category}`,
      district: 'Октябрьский р-н, ул. Ново-Садовая, 100',
      districtKey: 'Октябрьский р-н',
      category: category,
      orderType: 'business',
      allowNegotiation: false,
      time: 'Сегодня, 18:00 – 21:00',
      duration: '3 часа',
      hours: 3,
      price: '3 000 ₽',
      rawPrice: 3000,
      totalEscrow: 3210,
      lat: 53.2185,
      lng: 50.1642,
      comment: `Срочная смена по направлению «${category}». Все условия согласованы.`,
      customerName: 'ООО «СтройСамара Логистика»',
      customerRating: '4.95',
      perks: ['СБП 15 мин', 'Eluma Safe'],
      status: 'searching',
      assignedWorkerId: null,
      step: 1,
      proofs: { before: null, after: null, coords: null }
    };
    store.state.orders.unshift(newOrder);
    store.save('sample_order_created');
    UI.showFeedbackToast('Заказ создан', `Смена #${newOrder.id} (${category}) добавлена`);
    toggleModal();
  }

  function topUpEscrow(amount = 10000) {
    const prof = store.getCurrentEmployerProfile();
    if (prof && prof.escrow) {
      prof.escrow.available += amount;
      store.save('escrow_topup');
      UI.showFeedbackToast('Эскроу пополнен', `+${amount.toLocaleString('ru-RU')} ₽ зачислены на счёт`);
    }
  }

  function getTargetOrder() {
    const openWorkerId = (window.Eluma && window.Eluma.Worker && window.Eluma.Worker.getCurrentDetailOrderId) ? window.Eluma.Worker.getCurrentDetailOrderId() : null;
    const openEmpId = (window.Eluma && window.Eluma.Employer && window.Eluma.Employer.getCurrentDetailOrderId) ? window.Eluma.Employer.getCurrentDetailOrderId() : null;
    const activeId = openWorkerId || openEmpId;
    if (activeId) {
      const found = store.state.orders.find(o => o.id === activeId);
      if (found) return found;
    }
    return store.state.orders.find(o => o.status !== 'completed' && o.status !== 'cancelled') || store.state.orders[0];
  }

  function runCompleteDeal() {
    let order = getTargetOrder();
    if (!order) return;

    const wid = store.state.currentUserId || 1;
    // 1. Автосдача курса
    store.completeCourseTest('safe_intro', 5, wid);
    store.completeCourseTest('course_' + order.category, 5, wid);

    // 2. Отклик
    store.applyForOrder(order.id, wid);

    // 3. GPS отметка
    store.checkInOrderLocation(order.id);

    // 4. Фотоотчёт
    const fakePhoto = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%230F172A'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2310B981' font-family='sans-serif' font-size='18'%3EEluma Safe Verified%3C/text%3E%3C/svg%3E";
    store.submitOrderProofs(order.id, fakePhoto, fakePhoto);

    // 5. Приёмка заказчиком
    store.acceptOrderWork(order.id);

    toggleModal();
    UI.showFeedbackToast('Сделка завершена!', `Смена #${order.id} принята. Выплата переведена, чек ФНС сформирован.`);
  }

  function resetDatabase() {
    store.resetStorage('all');
    UI.showFeedbackToast('База сброшена', 'Восстановлен чистый заводской сид Eluma v15');
    renderDevModal();
  }

  function exportStateJson() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(store.state, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `eluma_v15_backup_${Date.now()}.json`);
    dlAnchor.click();
  }

  // Экспорт
  window.Eluma.DevToolkit = {
    init: initDevToolkit,
    toggleModal,
    switchTab,
    openSideBySide,
    setWorkerProfile,
    setEmployerProfile,
    passAllCourses,
    resetAllCourses,
    toggleCourse,
    ageCourseToExpiring,
    ageCourseToExpired,
    releaseHold72h,
    createSampleOrder,
    topUpEscrow,
    runCompleteDeal,
    resetDatabase,
    exportStateJson,
    stepApply: () => {
      const order = getTargetOrder();
      if (order) store.applyForOrder(order.id, store.state.currentUserId || 1);
      toggleModal();
      UI.showFeedbackToast('Шаг 1 выполнен', `Отклик на смену #${order ? order.id : ''}`);
    },
    stepCheckIn: () => {
      const order = getTargetOrder();
      if (order) store.checkInOrderLocation(order.id);
      toggleModal();
      UI.showFeedbackToast('Шаг 2 выполнен', `GPS отметка подтверждена для #${order ? order.id : ''}`);
    },
    stepProofs: () => {
      const order = getTargetOrder();
      const p = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%230F172A'/%3E%3C/svg%3E";
      if (order) store.submitOrderProofs(order.id, p, p);
      toggleModal();
      UI.showFeedbackToast('Шаг 3 выполнен', `Фотоотчет сдан для #${order ? order.id : ''}`);
    },
    stepAccept: () => {
      const order = getTargetOrder();
      if (order) store.acceptOrderWork(order.id);
      toggleModal();
      UI.showFeedbackToast('Шаг 4 выполнен', `Смена #${order ? order.id : ''} принята и оплачена`);
    }
  };

  window.Olksi.DevToolkit = window.Eluma.DevToolkit;

  document.addEventListener('DOMContentLoaded', initDevToolkit);
})();
