/**
 * Eluma v24.2 — employer/app.js
 * Клиентская логика кабинета заказчика:
 * - 2-колоночная архитектура и сквозная навигация
 * - KPI-бар (В безопасном холде, Требуют внимания, Тариф и реестр чеков ФНС)
 * - Редизайн карточки смены (без разделителя, превью 76x76, 3 ряда, контекстное действие + меню [⋯])
 * - Экран «Отклики и допуск» на полную высоту (Карточка ожидания и памятка vs Eluma Safe Степпер и переписка)
 * - Чистый словарь по 289-ФЗ и ГК РФ (Заказчик, Исполнитель, Смена, Вознаграждение, В холде Eluma Safe)
 */

(function () {
  'use strict';

  window.Eluma = window.Eluma || {};
  window.Olksi = window.Eluma;

  const store = window.Eluma.store || window.Olksi.store;
  const UI = window.Eluma.UI;

  // Состояние контроллера заказчика
  const empState = {
    currentScreen: 'home', // home, create, chats, balance, profile, detail
    statusFilter: 'all', // all, searching, assigned, in_review, completed
    searchQuery: '',
    isB2BSubscribed: true,
    currentDetailOrderId: null,
    editingOrderId: null,
    activeChatOrderId: null,
    editingMemoOrderId: null,
    reworkOrderId: null,
    reviewOrderId: null
  };

  // Закрытие выпадающих меню по клику вне карточки
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.emp-more-menu-wrap')) {
      document.querySelectorAll('.emp-dropdown-menu').forEach(menu => {
        menu.style.display = 'none';
      });
    }
  });

  // --------------------------------------------------------------------------
  // 1. НАВИГАЦИЯ И ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ
  // --------------------------------------------------------------------------

  function showScreen(screenId) {
    if (screenId === 'memos') {
      showScreen('profile');
      setTimeout(() => {
        const memosEl = document.getElementById('empMemosSection');
        if (memosEl) memosEl.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }

    empState.currentScreen = screenId;
    store.setTabScreen('employer', screenId);
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('scr-emp-' + screenId);
    if (target) target.classList.add('active');

    // Обновляем навигацию (десктоп и мобильный бар)
    document.querySelectorAll('.d-nav-item, .m-nav-item').forEach(item => {
      const scr = item.getAttribute('data-screen');
      item.classList.toggle('active', scr === screenId);
    });

    // Заголовки экранов
    const titles = {
      home: 'Мои смены',
      create: 'Создать смену',
      chats: 'Отклики и допуск',
      balance: 'Финансы и чеки ФНС',
      profile: 'Профиль компании',
      detail: 'Детали смены'
    };
    const titleEl = document.getElementById('headerScreenTitle');
    if (titleEl) titleEl.textContent = titles[screenId] || 'Кабинет заказчика';

    window.scrollTo({ top: 0, behavior: 'instant' });
    renderCurrentScreen();
  }

  function renderCurrentScreen() {
    switch (empState.currentScreen) {
      case 'home':
        renderEmployerOrders();
        break;
      case 'create':
        initCreateForm();
        break;
      case 'chats':
        renderEmployerChats();
        break;
      case 'balance':
        renderEmployerBalance();
        break;
      case 'profile':
        renderEmployerProfile();
        break;
      case 'detail':
        if (empState.currentDetailOrderId) {
          renderOrderDetail(empState.currentDetailOrderId);
        }
        break;
    }
    updateSidebarEscrow();
    updateSidebarUserPod();
  }

  function updateSidebarUserPod() {
    const user = store.getUser(store.state.currentEmployerId || 101);
    const avEl = document.getElementById('sidebarEmployerAvatar');
    const nameEl = document.getElementById('sidebarEmployerName');
    const innEl = document.getElementById('sidebarEmployerInn');

    if (user) {
      if (avEl) avEl.textContent = user.avatarText || user.name.slice(0, 2).toUpperCase();
      if (nameEl) nameEl.textContent = user.name;
      if (innEl) innEl.textContent = user.type === 'business' ? 'Бизнес · Эскроу активен' : 'Частный заказчик · Эскроу активен';
    }
  }

  function updateSidebarEscrow() {
    const prof = store.getCurrentEmployerProfile();
    const resEl = document.getElementById('sidebarEscrowReserved');
    const availEl = document.getElementById('sidebarEscrowAvailable');
    const tariffBadge = document.getElementById('sidebarTariffBadge');
    const tariffTitle = document.getElementById('sidebarTariffTitle');

    if (prof) {
      const reservedAmount = store.getEmployerReservedAmount ? store.getEmployerReservedAmount() : (prof.escrow ? prof.escrow.reserved : 0);
      const resStr = `${reservedAmount.toLocaleString('ru-RU')} ₽`;
      if (resEl) resEl.textContent = resStr;
      if (availEl) availEl.textContent = `${(prof.escrow ? prof.escrow.available : 0).toLocaleString('ru-RU')} ₽`;

      // Тариф B2B
      const isPro = prof.type === 'business';
      if (tariffBadge) {
        tariffBadge.textContent = isPro ? '0% сбор' : '7% сбор';
        tariffBadge.className = isPro ? 'd-tariff-badge active' : 'd-tariff-badge basic';
      }
      if (tariffTitle) {
        tariffTitle.textContent = isPro ? 'B2B-Подписка (0% сбор)' : 'Тариф Базовый (7% сбор)';
      }
    }
  }

  // --------------------------------------------------------------------------
  // 2. ЭКРАН: МОИ СМЕНЫ (HOME) & KPI-БАР
  // --------------------------------------------------------------------------

  function renderEmployerOrders() {
    const container = document.getElementById('employerTasksList');
    if (!container) return;

    // ТОЛЬКО заказы текущего заказчика по ownerId
    const allOwnerOrders = store.getEmployerOrders();

    // Расчёт счётчиков табов
    const totalCount = allOwnerOrders.length;
    const searchingCount = allOwnerOrders.filter(o => o.status === 'searching' || o.status === 'applied').length;
    const assignedCount = allOwnerOrders.filter(o => o.status === 'assigned' || o.status === 'on_site').length;
    const inReviewCount = allOwnerOrders.filter(o => o.status === 'in_review' || o.status === 'rework').length;
    const completedCount = allOwnerOrders.filter(o => o.status === 'completed' || o.status === 'cancelled').length;

    const countEl = document.getElementById('empOrdersCount');
    if (countEl) countEl.textContent = `${totalCount}`;
    const searchingEl = document.getElementById('empSearchingCount');
    if (searchingEl) searchingEl.textContent = `${searchingCount}`;
    const assignedEl = document.getElementById('empAssignedCount');
    if (assignedEl) assignedEl.textContent = `${assignedCount}`;
    const inReviewEl = document.getElementById('empInReviewCount');
    if (inReviewEl) inReviewEl.textContent = `${inReviewCount}`;
    const completedEl = document.getElementById('empCompletedCount');
    if (completedEl) completedEl.textContent = `${completedCount}`;

    // 1. Обновление KPI-бара (3 мини-карточки над списком)
    updateKpiBar(allOwnerOrders);

    // 2. Фильтрация заказов
    let orders = [...allOwnerOrders];

    if (empState.statusFilter === 'searching') {
      orders = orders.filter(o => o.status === 'searching' || o.status === 'applied');
    } else if (empState.statusFilter === 'assigned') {
      orders = orders.filter(o => o.status === 'assigned' || o.status === 'on_site');
    } else if (empState.statusFilter === 'in_review') {
      orders = orders.filter(o => o.status === 'in_review' || o.status === 'rework');
    } else if (empState.statusFilter === 'completed') {
      orders = orders.filter(o => o.status === 'completed' || o.status === 'cancelled');
    }

    if (empState.searchQuery.trim()) {
      const q = empState.searchQuery.trim().toLowerCase();
      orders = orders.filter(o =>
        o.title.toLowerCase().includes(q) ||
        o.district.toLowerCase().includes(q) ||
        o.category.toLowerCase().includes(q)
      );
    }

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="empty-feed-card">
          <div class="empty-feed-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
          </div>
          <p class="empty-feed-title">В этом статусе пока нет смен</p>
          <span class="empty-feed-desc">Опубликуйте новую смену или выберите другой статус фильтра</span>
          <button class="btn btn-primary-cta" onclick="window.Eluma.Employer.navigate('create')">Создать смену</button>
        </div>
      `;
      renderActionQueue();
      return;
    }

    container.innerHTML = orders.map(order => renderEmployerOrderCardHtml(order)).join('');
    renderActionQueue();
  }

  function updateKpiBar(orders) {
    const holdAmountEl = document.getElementById('kpiHoldAmount');
    const holdShiftsEl = document.getElementById('kpiHoldShifts');
    const attentionCountEl = document.getElementById('kpiAttentionCount');
    const attentionDescEl = document.getElementById('kpiAttentionDesc');
    const tariffStatusEl = document.getElementById('kpiTariffStatus');
    const sidebarHoldEl = document.getElementById('sidebarEscrowReserved');

    // Активные смены в холде: динамический расчет с учетом статуса B2B
    const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
    const totalHold = activeOrders.reduce((sum, o) => {
      const base = o.rawPrice || 0;
      return sum + (empState.isB2BSubscribed ? base : Math.round(base * 1.07));
    }, 0);

    const formattedHold = `${totalHold.toLocaleString('ru-RU')} ₽`;
    if (holdAmountEl) holdAmountEl.textContent = formattedHold;
    if (sidebarHoldEl) sidebarHoldEl.textContent = formattedHold;
    if (holdShiftsEl) holdShiftsEl.textContent = `${activeOrders.length} активных смен`;

    // Смены, требующие внимания заказчика: на проверке + новые отклики
    const reviewOrders = orders.filter(o => o.status === 'in_review');
    const appsOrders = orders.filter(o =>
      (o.status === 'searching' && o.applications && o.applications.length > 0) ||
      (o.counterOffer && (o.status === 'applied' || o.status === 'searching'))
    );
    const attentionCount = reviewOrders.length + appsOrders.length;

    if (attentionCountEl) attentionCountEl.textContent = `${attentionCount} смен`;
    if (attentionDescEl) {
      if (attentionCount > 0) {
        const parts = [];
        if (reviewOrders.length > 0) parts.push(`${reviewOrders.length} на проверке`);
        if (appsOrders.length > 0) parts.push(`${appsOrders.length} новых откликов`);
        attentionDescEl.textContent = parts.join(', ');
      } else {
        attentionDescEl.textContent = 'Все смены под контролем';
      }
    }

    // Бейджи чатов
    const chatsBadgeDesktop = document.getElementById('dNavChatsBadge');
    const chatsBadgeMobile = document.getElementById('mNavChatsBadge');
    if (chatsBadgeDesktop) {
      chatsBadgeDesktop.textContent = `${attentionCount}`;
      chatsBadgeDesktop.style.display = attentionCount > 0 ? 'inline-flex' : 'none';
    }
    if (chatsBadgeMobile) {
      chatsBadgeMobile.textContent = `${attentionCount}`;
      chatsBadgeMobile.style.display = attentionCount > 0 ? 'inline-block' : 'none';
    }

    // Статус тарифа в KPI 3
    if (tariffStatusEl) {
      tariffStatusEl.textContent = empState.isB2BSubscribed
        ? 'B2B: 790 ₽/мес — 0% сбор'
        : 'Тариф Базовый — 7% сбор';
    }
  }

  function toggleB2BSubscription() {
    empState.isB2BSubscribed = !empState.isB2BSubscribed;
    const msg = empState.isB2BSubscribed
      ? 'B2B-подписка активирована: 0% сбор платформы'
      : 'Включен Базовый тариф: 7% сбор платформы';
    if (UI && UI.showToast) {
      UI.showToast(msg, 'info');
    }
    renderEmployerOrders();
  }

  function setStatusFilter(status) {
    empState.statusFilter = status;
    document.querySelectorAll('.emp-tab-chip').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-status') === status);
    });
    renderEmployerOrders();
  }

  function filterNeedsAttention() {
    setStatusFilter('in_review');
  }

  // --------------------------------------------------------------------------
  // 3. РЕДИЗАЙН КАРТОЧКИ СМЕНЫ ЗАКАЗЧИКА (БЕЗ РАЗДЕЛИТЕЛЕЙ, ПЛОТНАЯ СЕТКА)
  // --------------------------------------------------------------------------

  function renderEmployerOrderCardHtml(order) {
    const isSearching = order.status === 'searching';
    const isPublished = order.status !== 'cancelled';
    const totalSlots = order.slotsTotal || 1;
    let filledSlots = 0;
    if (Array.isArray(order.assignedWorkerIds)) {
      filledSlots = order.assignedWorkerIds.length;
    } else if (order.assignedWorkerId) {
      filledSlots = 1;
    }

    // Чип слотов смены
    const slotsBadgeHtml = totalSlots > 1 ? `
      <span class="badge badge-slots badge--slots" title="Слоты бригады">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span>Набрано: ${filledSlots} из ${totalSlots} чел.</span>
      </span>
    ` : '';

    // Сводка радара и статуса
    const appsCount = (order.applications && order.applications.length) || 0;
    let summaryText = `Гео-радар 3 км активен · ${appsCount} откликов`;
    if (order.status === 'on_site') {
      summaryText = 'GPS подтверждён (45 м от точки) · Исполнители на объекте';
    } else if (order.status === 'in_review') {
      summaryText = 'Смена завершена · Фото ДО/ПОСЛЕ ожидают проверки';
    } else if (order.status === 'completed') {
      summaryText = 'Смена завершена · Расчет выплачен, чек сформирован';
    } else if (order.status === 'assigned') {
      summaryText = 'Исполнитель назначен · Ожидание выхода на смену';
    } else if (order.counterOffer) {
      summaryText = `Встречное предложение: ${order.counterOffer.price.toLocaleString('ru-RU')} ₽`;
    } else if (appsCount > 0) {
      const appsWord = appsCount === 1 ? 'отклик' : (appsCount >= 2 && appsCount <= 4 ? 'отклика' : 'откликов');
      summaryText = `Гео-радар 3 км активен · ${appsCount} ${appsWord} (допуск сдан)`;
    } else {
      summaryText = 'Гео-радар 3 км активен · 0 откликов';
    }

    // Стоимость в безопасном холде Eluma Safe (учитывает статус B2B)
    const basePrice = order.rawPrice || 0;
    const holdAmount = empState.isB2BSubscribed ? basePrice : Math.round(basePrice * 1.07);
    const holdFee = Math.round(basePrice * 0.07);
    const holdInfoText = empState.isB2BSubscribed
      ? `В холде: ${holdAmount.toLocaleString('ru-RU')} ₽ (0% сбор по подписке)`
      : `В холде: ${holdAmount.toLocaleString('ru-RU')} ₽ (вкл. сбор 7% — ${holdFee} ₽)`;

    // Определение контекстного действия
    const sosLabel = empState.isB2BSubscribed ? 'СОС-вызов (бесплатно по B2B)' : 'СОС-вызов (+190 ₽)';
    const sosBtnHtml = `
      <button type="button" class="btn-sos btn-emp-primary-action sos" onclick="window.Eluma.Employer.enableSos(${order.id})">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        <span>${sosLabel}</span>
      </button>
    `;

    let primaryActionBtnHtml = '';
    if (order.status === 'searching') {
      if (order.counterOffer) {
        primaryActionBtnHtml = `
          <button type="button" class="btn-secondary-sm btn-emp-primary-action warning" onclick="window.Eluma.Employer.openDetail(${order.id})">
            <span>Рассмотреть ставку (${order.counterOffer.price.toLocaleString('ru-RU')} ₽)</span>
          </button>
        `;
      } else if (appsCount > 0) {
        primaryActionBtnHtml = `
          <button type="button" class="btn-secondary-sm btn-emp-primary-action info" onclick="window.Eluma.Employer.openChatDialog(${order.id})">
            <span>Смотреть отклики (${appsCount})</span>
          </button>
          ${!order.isSos ? sosBtnHtml : ''}
        `;
      } else {
        primaryActionBtnHtml = sosBtnHtml;
      }
    } else if (order.status === 'in_review') {
      primaryActionBtnHtml = `
        <button type="button" class="btn-secondary-sm btn-emp-primary-action review" onclick="window.Eluma.Employer.openDetail(${order.id})">
          <span>Проверить фото ДО/ПОСЛЕ</span>
        </button>
      `;
    } else if (order.status === 'assigned' || order.status === 'on_site') {
      primaryActionBtnHtml = `
        <button type="button" class="btn-secondary-sm btn-emp-primary-action control" onclick="window.Eluma.Employer.openDetail(${order.id})">
          <span>Открыть трекер смены</span>
        </button>
      `;
    } else if (order.status === 'completed') {
      primaryActionBtnHtml = `
        <button type="button" class="btn-secondary-sm btn-emp-primary-action completed" onclick="window.Eluma.Employer.openReviewModal(${order.id})">
          <span>Отзыв об исполнителе</span>
        </button>
      `;
    } else {
      primaryActionBtnHtml = `
        <button type="button" class="btn-secondary-sm btn-emp-primary-action" onclick="window.Eluma.Employer.openDetail(${order.id})">
          <span>Памятка и детали</span>
        </button>
      `;
    }

    return `
      <article class="shift-card employer-task-card" onclick="window.Eluma.Employer.openDetail(${order.id})">
        <!-- 1. Верхний эталонный Flexbox-блок (.shift-card__main) -->
        <div class="shift-card__main">
          <!-- Миниатюра: строго 64x64px БЕЗ текста внутри -->
          <div class="shift-card__thumb">
            <img src="${UI.getOrderPhotoUrl(order)}" alt="${UI.escapeHtml(order.title)}" loading="lazy">
          </div>

          <!-- Центральная колонка с информацией -->
          <div class="shift-card__body">
            <!-- Бейджи статуса, категории, Safe и слотов -->
            <div class="shift-card__badges">
              ${UI.renderStatusBadge(order.status)}
              <span class="badge badge-category">${UI.escapeHtml(order.category)}</span>
              <span class="badge badge-safe" title="Зарезервировано в холде Eluma Safe">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>В холде Eluma Safe</span>
              </span>
              ${slotsBadgeHtml}
            </div>

            <!-- Заголовок смены -->
            <h3 class="shift-card__title">${UI.escapeHtml(order.title)}</h3>

            <!-- Мета: район и время со стрелочными SVG-иконками -->
            <div class="shift-card__meta">
              <div class="shift-card__meta-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>${UI.escapeHtml(order.district)}</span>
              </div>
              <div class="shift-card__meta-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>${UI.escapeHtml(order.time)} (${order.hours} ч)</span>
              </div>
            </div>
          </div>

          <!-- Правая колонка: крупная цена и примечание холдирования -->
          <div class="shift-card__price-col">
            <div class="shift-card__price">${UI.escapeHtml(order.price)}</div>
            <div class="shift-card__price-unit">/ смена</div>
            <div class="shift-card__hold-info">${holdInfoText}</div>
          </div>
        </div>

        <!-- 2. Нижний блок футера карточки: всегда на всю ширину -->
        <div class="shift-card__footer" onclick="event.stopPropagation()">
          <div class="shift-card__radar">
            <span class="radar-dot"></span>
            <span class="radar-text">${UI.escapeHtml(summaryText)}</span>
          </div>

          <div class="shift-card__actions">
            ${primaryActionBtnHtml}

            <!-- Меню дополнительных действий -->
            <div class="card-menu-wrapper emp-more-menu-wrap">
              <button type="button" class="btn-more btn-more-dots" onclick="window.Eluma.Employer.toggleCardMenu(event, ${order.id})" title="Ещё действия">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
              </button>
              <div class="emp-dropdown-menu" id="cardMenu_${order.id}" style="display:none;">
                <button type="button" class="dropdown-item" onclick="window.Eluma.Employer.duplicateOrder(${order.id})">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  <span>Дублировать смену</span>
                </button>
                <button type="button" class="dropdown-item" onclick="window.Eluma.Employer.openEditModal(${order.id})">
                  ${UI.SVG_ICONS.edit}
                  <span>Редактировать смену</span>
                </button>
                <button type="button" class="dropdown-item" onclick="window.Eluma.Employer.togglePublish(${order.id})">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                  <span>${isPublished ? 'Снять с публикации' : 'Опубликовать'}</span>
                </button>
                <div class="dropdown-divider"></div>
                <button type="button" class="dropdown-item danger" onclick="window.Eluma.Employer.cancelOrder(${order.id})">
                  ${UI.SVG_ICONS.trash}
                  <span>Отменить смену</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function toggleCardMenu(e, orderId) {
    if (e && e.stopPropagation) e.stopPropagation();
    const menu = document.getElementById('cardMenu_' + orderId);
    const wasVisible = menu && menu.style.display === 'block';

    document.querySelectorAll('.emp-dropdown-menu').forEach(m => m.style.display = 'none');
    if (menu && !wasVisible) {
      menu.style.display = 'block';
    }
  }

  function enableSos(orderId) {
    const order = store.state.orders.find(o => o.id === orderId);
    if (!order) return;
    order.isSos = true;
    if (!order.perks) order.perks = [];
    if (!order.perks.includes('Срочный СОС-вызов')) {
      order.perks.unshift('Срочный СОС-вызов');
    }
    store.save('order_sos_enabled');
    UI.showFeedbackToast('СОС-вызов активирован!', `Увеличен приоритет показа смены в радиусе 3 км по Самаре.`);
    renderEmployerOrders();
    if (empState.currentDetailOrderId === orderId) {
      renderOrderDetail(orderId);
    }
  }

  // --------------------------------------------------------------------------
  // 4. ЭКРАН: ОТКЛИКИ И ЧАТЫ (CHATS & DEAL CONTROL) — ПОЛНАЯ ВЫСОТА
  // --------------------------------------------------------------------------

  function renderEmployerChats() {
    const listEl = document.getElementById('empChatsList');
    if (!listEl) return;

    const myOrders = store.getEmployerOrders();
    if (myOrders.length === 0) {
      listEl.innerHTML = `<div class="empty-feed-card"><p>У вас пока нет активных смен</p></div>`;
      return;
    }

    listEl.innerHTML = myOrders.map(order => {
      const msgs = (store.state.chats && store.state.chats[order.id]) || [];
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1].text : 'Диалог открыт';
      const isActive = empState.activeChatOrderId === order.id;
      return `
        <div class="chat-dialog-card ${isActive ? 'active' : ''}" data-order-id="${order.id}" onclick="window.Eluma.Employer.openChatDialog(${order.id})">
          <div class="chat-card-avatar">${UI.SVG_ICONS.user}</div>
          <div class="chat-card-info">
            <strong class="chat-card-title">${UI.escapeHtml(order.title)}</strong>
            <span class="chat-card-sub">${UI.renderStatusBadge(order.status)}</span>
            <p class="chat-card-snippet">${UI.escapeHtml(lastMsg)}</p>
          </div>
        </div>
      `;
    }).join('');

    // По умолчанию выбираем первую смену или текущую активную
    const targetId = empState.activeChatOrderId || (myOrders[0] ? myOrders[0].id : null);
    if (targetId) {
      openChatDialog(targetId, true);
    }
  }

  function openChatDialog(orderId, silent = false) {
    empState.activeChatOrderId = orderId;
    const isMobile = window.innerWidth < 768;

    // Подсветка активной карточки слева
    document.querySelectorAll('#empChatsList .chat-dialog-card').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-order-id') == orderId);
    });

    const panelEl = document.getElementById('empChatDialogPanel');
    const viewportEl = document.getElementById('empChatsViewport');
    if (!panelEl) return;

    if (isMobile && !silent && viewportEl) {
      viewportEl.classList.add('mobile-chat-view-open');
    }

    const order = (store.state.orders || []).find(o => o.id === orderId);
    if (!order) return;

    const hasWorker = !!order.assignedWorkerId;
    const worker = hasWorker ? store.getUser(order.assignedWorkerId) : null;
    const defaultMemo = 'Спецодежда и рохли выдаются на проходной базы по паспорту. Код двери: #4210';
    const memoText = order.objectMemo || defaultMemo;

    // СОСТОЯНИЕ А: Исполнитель еще не назначен (Поиск / 0 откликов)
    if (!hasWorker && order.status === 'searching') {
      panelEl.innerHTML = `
        <div class="chat-dialog-head">
          <div class="chat-head-left">
            ${isMobile ? `<button type="button" class="btn-chat-back" onclick="window.Eluma.Employer.backToChatsList()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg><span>Назад</span></button>` : ''}
            <div>
              <strong class="chat-head-title">${UI.escapeHtml(order.title)}</strong>
              <span class="chat-head-meta">${UI.escapeHtml(order.district)} • ${UI.escapeHtml(order.price)}</span>
            </div>
          </div>
          <button type="button" class="btn btn-secondary-outline btn-sm" onclick="window.Eluma.Employer.openDetail(${order.id})">Карточка смены</button>
        </div>

        <div class="chat-dialog-scroll-body">
          <div class="emp-waiting-state-card">
            <div class="waiting-badge-row">
              <span class="badge-status-pill badge-active">Ищем исполнителя (в радиусе 3 км)</span>
            </div>
            <h3 class="waiting-lead-title">Радар поиска активен</h3>
            <p class="waiting-lead-desc">
              Платформа непрерывно оповещает верифицированных самозанятых исполнителей Самары с пройденным допуском по категории «${UI.escapeHtml(order.category)}».
            </p>

            <!-- Блок: Памятка объекта (откроется исполнителю после GPS чек-ина 150м) -->
            <div class="emp-object-memo-card">
              <div class="memo-head">
                <div class="memo-title-wrap">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <strong>Памятка объекта (откроется исполнителю после GPS чек-ина 150 м)</strong>
                </div>
                <button type="button" class="btn-memo-edit" onclick="window.Eluma.Employer.openEditMemoModal(${order.id})">Редактировать</button>
              </div>
              <p class="memo-text-preview" id="memoTextDisplay_${order.id}">${UI.escapeHtml(memoText)}</p>
            </div>

            <!-- Кнопка СОС-вызова -->
            <button type="button" class="btn btn-primary-cta sos-call-full-btn" onclick="window.Eluma.Employer.enableSos(${order.id})">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span>Включить СОС-вызов (+190 ₽) · Приоритетный пуш</span>
            </button>
          </div>
        </div>

        <div class="chat-input-capsule-form disabled-state">
          <div class="chat-input-capsule">
            <span class="capsule-disabled-hint">Чат откроется автоматически при отклике или выходе исполнителя на смену</span>
          </div>
        </div>
      `;
      return;
    }

    // СОСТОЯНИЕ Б: Есть отклики или Исполнитель в работе (Eluma Safe Stepper + Чат)
    const step1Done = true; // Холд оплачен
    const step2Done = hasWorker; // Допуск сдан
    const step3Done = order.status === 'on_site' || order.status === 'in_review' || order.status === 'completed'; // GPS чек-ин
    const step4Done = !!(order.proofs && order.proofs.before); // Фото ДО
    const step5Done = !!(order.proofs && order.proofs.after); // Фото ПОСЛЕ
    const step6Done = order.status === 'completed'; // Автовыплата

    panelEl.innerHTML = `
      <div class="chat-dialog-head">
        <div class="chat-head-left">
          ${isMobile ? `<button type="button" class="btn-chat-back" onclick="window.Eluma.Employer.backToChatsList()"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg><span>Назад</span></button>` : ''}
          <div>
            <strong class="chat-head-title">${UI.escapeHtml(order.title)}</strong>
            <span class="chat-head-meta">${worker ? worker.name : 'Исполнитель'} · Рейтинг ${worker ? worker.rating : '4.95'}</span>
          </div>
        </div>
        <button type="button" class="btn btn-secondary-outline btn-sm" onclick="window.Eluma.Employer.openDetail(${order.id})">Карточка смены</button>
      </div>

      <!-- Eluma Safe Stepper (Трекер этапов сделки в 6 шагов) -->
      <div class="eluma-safe-stepper">
        <div class="stepper-step ${step1Done ? 'done' : 'active'}">
          <span class="step-circle">${step1Done ? '1' : '1'}</span>
          <span class="step-label">1. Холд оплачен</span>
        </div>
        <div class="stepper-arrow">→</div>
        <div class="stepper-step ${step2Done ? 'done' : 'active'}">
          <span class="step-circle">2</span>
          <span class="step-label">2. Допуск сдан</span>
        </div>
        <div class="stepper-arrow">→</div>
        <div class="stepper-step ${step3Done ? 'done' : (hasWorker ? 'active' : '')}">
          <span class="step-circle">3</span>
          <span class="step-label">3. GPS Чек-ин</span>
        </div>
        <div class="stepper-arrow">→</div>
        <div class="stepper-step ${step4Done ? 'done' : (step3Done ? 'active' : '')}">
          <span class="step-circle">4</span>
          <span class="step-label">4. Фото ДО</span>
        </div>
        <div class="stepper-arrow">→</div>
        <div class="stepper-step ${step5Done ? 'done' : (step4Done ? 'active' : '')}">
          <span class="step-circle">5</span>
          <span class="step-label">5. Фото ПОСЛЕ</span>
        </div>
        <div class="stepper-arrow">→</div>
        <div class="stepper-step ${step6Done ? 'done' : (step5Done ? 'active' : '')}">
          <span class="step-circle">6</span>
          <span class="step-label">6. Выплата (15 мин)</span>
        </div>
      </div>

      <!-- Контейнер сообщений чата с авто-скроллом -->
      <div class="order-chat-messages" id="empSplitChatMessages"></div>

      <!-- Быстрые чипы ответов Заказчика -->
      <div class="quick-reply-row">
        <button type="button" class="quick-reply-chip" onclick="window.Eluma.Employer.sendQuickChat('Спецодежда и пропуск на проходной базы', ${order.id})">Пропуск на проходной</button>
        <button type="button" class="quick-reply-chip" onclick="window.Eluma.Employer.sendQuickChat('Где взять инвентарь: склад №2 у рохлей', ${order.id})">Где взять инвентарь</button>
        <button type="button" class="quick-reply-chip" onclick="window.Eluma.Employer.sendQuickChat('Отличная работа, фото ПОСЛЕ проверил!', ${order.id})">Отличная работа!</button>
        <button type="button" class="quick-reply-chip" onclick="window.Eluma.Employer.sendQuickChat('Пожалуйста, переснимите фото ПОСЛЕ крупным планом', ${order.id})">Переснимите фото</button>
      </div>

      <!-- Современный инпут-капсула на всю ширину -->
      <form class="chat-input-capsule-form" onsubmit="window.Eluma.Employer.handleSendSplitChat(event, ${order.id})">
        <div class="chat-input-capsule">
          <button type="button" class="chat-capsule-attach-btn" title="Прикрепить файл/фото" onclick="UI.showFeedbackToast('Файл', 'Прикрепление файлов активно в защищённом канале Eluma Safe')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          </button>
          <input type="text" id="empSplitChatInput" class="chat-capsule-input" placeholder="Написать исполнителю по смене..." autocomplete="off">
          <button type="submit" class="chat-capsule-send-btn" title="Отправить">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </form>
    `;

    renderSplitChatMessages(orderId);
  }

  function backToChatsList() {
    const viewportEl = document.getElementById('empChatsViewport');
    if (viewportEl) {
      viewportEl.classList.remove('mobile-chat-view-open');
    }
  }

  function renderSplitChatMessages(orderId) {
    const container = document.getElementById('empSplitChatMessages');
    if (!container) return;
    const msgs = (store.state.chats && store.state.chats[orderId]) || [];
    if (msgs.length === 0) {
      container.innerHTML = `<div class="chat-empty-state"><span>Диалог открыт. Задайте вопрос исполнителю или отправьте ориентиры.</span></div>`;
      return;
    }
    container.innerHTML = msgs.map(m => {
      if (m.sender === 'system') {
        return `<div class="chat-bubble system"><span>${UI.escapeHtml(m.text)}</span></div>`;
      }
      const isMine = m.sender === 'employer';
      return `<div class="chat-bubble ${isMine ? 'mine' : 'other'}">${UI.escapeHtml(m.text)}</div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
  }

  function handleSendSplitChat(e, orderId) {
    if (e && e.preventDefault) e.preventDefault();
    const input = document.getElementById('empSplitChatInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    store.addChatMessage(orderId, 'employer', text);
    input.value = '';
    renderSplitChatMessages(orderId);
    if (empState.currentDetailOrderId === orderId) {
      renderEmployerOrderChat(orderId);
    }
  }

  function openEditMemoModal(orderId) {
    empState.editingMemoOrderId = orderId;
    const order = (store.state.orders || []).find(o => o.id === orderId);
    const input = document.getElementById('editMemoTextInput');
    if (input) {
      input.value = (order && order.objectMemo) ? order.objectMemo : 'Спецодежда и рохли выдаются на проходной базы по паспорту. Код двери: #4210';
    }
    UI.openModal('editMemoModal');
  }

  function saveObjectMemo(e) {
    if (e && e.preventDefault) e.preventDefault();
    const input = document.getElementById('editMemoTextInput');
    const memoText = input ? input.value.trim() : '';
    const order = (store.state.orders || []).find(o => o.id === empState.editingMemoOrderId);
    if (order) {
      order.objectMemo = memoText;
      store.save('order_memo_saved');
      UI.closeModal('editMemoModal');
      UI.showFeedbackToast('Памятка сохранена', 'Исполнитель увидит текст после GPS чек-ина на точке');
      const disp = document.getElementById('memoTextDisplay_' + order.id);
      if (disp) disp.textContent = memoText;
    }
  }

  // --------------------------------------------------------------------------
  // 5. ДЕТАЛИ ЗАКАЗА (DETAIL & ПУБЛИЧНАЯ КАРТОЧКА ИСПОЛНИТЕЛЯ)
  // --------------------------------------------------------------------------

  function openDetail(orderId, scrollToChat = false) {
    empState.currentDetailOrderId = orderId;
    showScreen('detail');
    if (scrollToChat) {
      setTimeout(() => {
        const box = document.getElementById('empOrderChatBox');
        if (box) box.scrollIntoView({ behavior: 'smooth' });
        const input = document.getElementById('empChatInput');
        if (input) input.focus();
      }, 150);
    }
  }

  function renderOrderDetail(orderId) {
    const order = store.getEmployerOrders().find(o => o.id === orderId);
    if (!order) return;

    const titleEl = document.getElementById('empDetailTitle');
    const priceEl = document.getElementById('empDetailPrice');
    const timeEl = document.getElementById('empDetailTime');
    const distEl = document.getElementById('empDetailDistrict');
    const descEl = document.getElementById('empDetailDesc');
    const photoImg = document.getElementById('empDetailPhotoImg');
    const badgeEl = document.getElementById('empDetailStatusBadge');

    if (titleEl) titleEl.textContent = order.title;
    if (priceEl) priceEl.textContent = order.price;
    if (timeEl) timeEl.textContent = `${order.time} (${order.duration || order.hours + ' ч'})`;
    if (distEl) distEl.textContent = order.district;
    if (descEl) descEl.textContent = order.comment || 'Особые требования не указаны.';

    if (photoImg) {
      photoImg.src = UI.getOrderPhotoUrl(order);
      photoImg.alt = order.title;
    }
    if (badgeEl) {
      badgeEl.innerHTML = UI.renderStatusBadge(order.status);
    }

    renderAssignedWorkerCard(order);
    renderOrderProofs(order);
    renderEmployerOrderChat(orderId);
  }

  function renderAssignedWorkerCard(order) {
    const container = document.getElementById('empAssignedWorkerCardContainer');
    if (!container) return;

    if (!order.assignedWorkerId) {
      container.innerHTML = `
        <div class="empty-worker-assigned-box">
          <div class="radar-ping-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          </div>
          <div class="radar-ping-content">
            <strong>Исполнитель пока не назначен</strong>
            <p>Гео-радар активен в радиусе 3 км. Кандидаты проходят автоматическую проверку допуска.</p>
          </div>
        </div>
      `;
      return;
    }

    const worker = store.getUser(order.assignedWorkerId);
    if (!worker) return;

    let passedCourses = [];
    if (typeof store.getWorkerPassedCourses === 'function') {
      passedCourses = store.getWorkerPassedCourses(worker.id);
    }
    if (!passedCourses || passedCourses.length === 0) {
      const Courses = (window.Eluma && window.Eluma.Courses) || (window.Olksi && window.Olksi.Courses);
      const all = Courses && Courses.getAllCourses ? Courses.getAllCourses() : [];
      passedCourses = all.filter(c => {
        const st = store.getCourseStatus ? store.getCourseStatus(worker.id, c.id) : null;
        return st && st.isPassed;
      });
    }
    if (!passedCourses || passedCourses.length === 0) {
      passedCourses = [
        { id: 'safe_intro', title: 'Правила платформы и безопасность' },
        { id: 'course_sklad', title: 'Склад и ритейл' }
      ];
    }

    const badgesHtml = passedCourses.map(c => `
      <span class="course-chip verified worker-course-badge" title="Срок действия 12 месяцев">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <span>${UI.escapeHtml(c.title || c.name || 'Допуск')}</span>
      </span>
    `).join('');

    container.innerHTML = `
      <div class="public-worker-card">
        <div class="p-worker-avatar-box">
          <div class="p-worker-avatar">${UI.escapeHtml(worker.avatarText || worker.name.slice(0, 2))}</div>
        </div>
        <div class="p-worker-info-box">
          <div class="p-worker-name-row">
            <h4 class="public-worker-name p-worker-name">${UI.escapeHtml(worker.name)}</h4>
            <span class="badge-npd-verified">Самозанятый (НПД)</span>
          </div>
          <div class="p-worker-meta-row">
            <span class="p-worker-rating">${UI.SVG_ICONS.star} ${UI.escapeHtml(worker.rating)}</span>
            <span class="p-worker-sep">·</span>
            <span class="p-worker-shifts">${worker.shiftsCount || 14} смен выполнено</span>
            <span class="p-worker-sep">·</span>
            <span class="p-worker-phone-protected" title="289-ФЗ: Прямые персональные контакты защищены">+7 (9••) •••-••-${String(worker.id).padStart(2, '0')}</span>
          </div>
          <div class="p-worker-courses-row">
            <span class="courses-row-label">Верифицированные допуски:</span>
            <div class="courses-badges-list">${badgesHtml || '<span class="text-muted">Базовый допуск</span>'}</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderOrderProofs(order) {
    const slotBefore = document.getElementById('empSlotBefore');
    const slotAfter = document.getElementById('empSlotAfter');
    const gpsBadge = document.getElementById('empGpsStampBadge');
    const actionsContainer = document.getElementById('empReviewActionsContainer');

    if (slotBefore) {
      if (order.proofs && order.proofs.before) {
        slotBefore.innerHTML = `<img src="${order.proofs.before}" class="proof-thumb-img" alt="Фото ДО">`;
      } else {
        slotBefore.innerHTML = `<div class="slot-placeholder">Снимок ДО ожидает загрузки</div>`;
      }
    }

    if (slotAfter) {
      if (order.proofs && order.proofs.after) {
        slotAfter.innerHTML = `<img src="${order.proofs.after}" class="proof-thumb-img" alt="Фото ПОСЛЕ">`;
      } else {
        slotAfter.innerHTML = `<div class="slot-placeholder">Снимок ПОСЛЕ ожидает загрузки</div>`;
      }
    }

    if (gpsBadge) {
      if (order.proofs && order.proofs.gpsChecked) {
        gpsBadge.textContent = 'GPS: Подтверждено на объекте';
        gpsBadge.className = 'proofs-badge verified';
      } else if (order.status === 'on_site') {
        gpsBadge.textContent = 'GPS: Исполнитель на объекте';
        gpsBadge.className = 'proofs-badge active';
      } else {
        gpsBadge.textContent = 'GPS: Ожидает фиксации';
        gpsBadge.className = 'proofs-badge';
      }
    }

    if (!actionsContainer) return;

    if (order.counterOffer) {
      actionsContainer.innerHTML = `
        <div class="counter-offer-review-box">
          <div class="counter-offer-header">
            <span>Встречное предложение: <strong>${order.counterOffer.price.toLocaleString('ru-RU')} ₽</strong></span>
            <span class="badge-status-pill badge-warning">Торг</span>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin: 6px 0;">${UI.escapeHtml(order.counterOffer.comment || 'Исполнитель предложил новую ставку.')}</div>
          <div class="counter-offer-actions">
            <button type="button" class="btn btn-primary-cta" onclick="window.Eluma.Employer.resolveCounterOffer(${order.id}, true)">
              Принять ставку (${order.counterOffer.price.toLocaleString('ru-RU')} ₽)
            </button>
            <button type="button" class="btn btn-secondary-outline" onclick="window.Eluma.Employer.resolveCounterOffer(${order.id}, false)">
              Отклонить предложение
            </button>
          </div>
        </div>
      `;
      return;
    }

    if (order.status === 'in_review') {
      actionsContainer.innerHTML = `
        <div class="emp-action-buttons-grid">
          <button type="button" class="btn btn-primary-cta" onclick="window.Eluma.Employer.acceptWork(${order.id})">
            ${UI.SVG_ICONS.check} Принять смену и выплатить ${UI.escapeHtml(order.price)}
          </button>
          <button type="button" class="btn btn-secondary-outline danger" onclick="window.Eluma.Employer.openReworkModal(${order.id})">
            Вернуть на доработку с замечаниями
          </button>
        </div>
      `;
    } else if (order.status === 'completed') {
      actionsContainer.innerHTML = `
        <div class="emp-completed-banner">
          ${UI.SVG_ICONS.check} <strong>Смена принята и оплачена</strong>
          <span>${UI.escapeHtml(order.price)} переведены на счёт СБП исполнителя. Чек ФНС зарегистрирован.</span>
          <button type="button" class="btn btn-secondary-outline" onclick="window.Eluma.Employer.openReviewModal(${order.id})">
            Оставить отзыв об исполнителе
          </button>
        </div>
      `;
    } else if (order.status === 'searching' || order.status === 'assigned' || order.status === 'on_site') {
      actionsContainer.innerHTML = `
        <div style="display:flex;justify-content:flex-end;margin-top:10px;">
          <button type="button" class="btn btn-secondary-outline danger btn-sm" onclick="window.Eluma.Employer.cancelOrder(${order.id})">
            Отменить смену
          </button>
        </div>
      `;
    } else {
      actionsContainer.innerHTML = '';
    }
  }

  function resolveCounterOffer(orderId, accept) {
    const res = store.resolveCounterOffer(orderId, accept);
    if (res && res.success) {
      if (accept) {
        UI.showFeedbackToast('Ставка принята!', `Смена подтверждена по ставке ${res.newPrice.toLocaleString('ru-RU')} ₽.`);
      } else {
        UI.showFeedbackToast('Предложение отклонено', 'Смена возвращена в поиск исполнителя.');
      }
      renderEmployerOrders();
      renderOrderDetail(orderId);
      renderEmployerBalance();
    } else {
      UI.showFeedbackToast('Ошибка', (res && res.error) || 'Не удалось обработать предложение.');
    }
  }

  function acceptWork(orderId) {
    store.acceptOrderWork(orderId);
    UI.showFeedbackToast('Смена принята!', 'Вознаграждение переведено исполнителю. Чек ФНС сформирован.');
    renderOrderDetail(orderId);
    renderEmployerOrders();
  }

  function openReworkModal(orderId) {
    empState.reworkOrderId = orderId;
    const input = document.getElementById('reworkReasonInput');
    if (input) input.value = '';
    UI.openModal('reworkReasonModal');
  }

  function submitReworkReason(e) {
    if (e && e.preventDefault) e.preventDefault();
    const orderId = empState.reworkOrderId;
    const input = document.getElementById('reworkReasonInput');
    const reason = input ? input.value.trim() : '';
    if (!reason) {
      UI.showFeedbackToast('Ошибка', 'Обязательно укажите замечания по доработке');
      return;
    }
    store.reworkOrder(orderId, reason);
    UI.closeModal('reworkReasonModal');
    UI.showFeedbackToast('Возвращено на доработку', 'Исполнитель уведомлен о замечаниях.');
    renderOrderDetail(orderId);
  }

  function openReviewModal(orderId) {
    empState.reviewOrderId = orderId;
    UI.openModal('empReviewModal');
  }

  function submitReview(e) {
    if (e && e.preventDefault) e.preventDefault();
    const order = (store.state.orders || []).find(o => o.id === empState.reviewOrderId);
    if (!order) return;

    const starsInput = document.getElementById('empReviewStarsValue');
    let stars = 5;
    if (starsInput && starsInput.value) {
      stars = parseInt(starsInput.value, 10);
    } else if (UI.getSelectedReviewStars) {
      stars = UI.getSelectedReviewStars();
    }
    const commentEl = document.getElementById('reviewCommentInput');
    const comment = commentEl ? commentEl.value.trim() : 'Отличная работа!';

    const selectedTags = [];
    document.querySelectorAll('.review-tag-checkbox:checked').forEach(cb => selectedTags.push(cb.value));

    store.addEmployerReview(order.id, stars, comment, selectedTags);
    UI.closeModal('empReviewModal');
    UI.showFeedbackToast('Отзыв опубликован!', 'Благодарим за оценку качества работы исполнителя.');
    renderOrderDetail(order.id);
  }

  function renderEmployerOrderChat(orderId) {
    const container = document.getElementById('empChatMessages');
    if (!container) return;
    const msgs = (store.state.chats && store.state.chats[orderId]) || [];
    if (msgs.length === 0) {
      container.innerHTML = `<div class="chat-empty-box">Чат с исполнителем защищён платформой. Напишите первое сообщение.</div>`;
      return;
    }
    container.innerHTML = msgs.map(m => {
      if (m.sender === 'system') {
        return `<div class="chat-bubble system"><span>${UI.escapeHtml(m.text)}</span></div>`;
      }
      const isMine = m.sender === 'employer';
      return `<div class="chat-bubble ${isMine ? 'mine' : 'other'}">${UI.escapeHtml(m.text)}</div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
  }

  function handleSendChat(e) {
    if (e && e.preventDefault) e.preventDefault();
    const input = document.getElementById('empChatInput');
    if (!input || !empState.currentDetailOrderId) return;
    const text = input.value.trim();
    if (!text) return;
    store.addChatMessage(empState.currentDetailOrderId, 'employer', text);
    input.value = '';
    renderEmployerOrderChat(empState.currentDetailOrderId);
  }

  function sendQuickChat(text, orderId) {
    const oid = orderId || empState.currentDetailOrderId || empState.activeChatOrderId;
    if (!oid) return;
    store.addChatMessage(oid, 'employer', text);
    if (empState.currentDetailOrderId === oid) {
      renderEmployerOrderChat(oid);
    }
    if (empState.activeChatOrderId === oid) {
      renderSplitChatMessages(oid);
    }
  }

  // --------------------------------------------------------------------------
  // 6. СОЗДАНИЕ СМЕНЫ (CREATE)
  // --------------------------------------------------------------------------

  function updateCreateEscrowCalc() {
    const priceInput = document.getElementById('taskPriceInput');
    const sosCheckbox = document.getElementById('taskUrgentSosCheckbox');
    const workerPayoutEl = document.getElementById('calcWorkerPayout');
    const platformFeeEl = document.getElementById('calcPlatformFee');
    const totalEscrowEl = document.getElementById('calcTotalEscrow');

    const workerReward = parseInt(priceInput ? priceInput.value : 2500, 10) || 0;
    const serviceFee = Math.round(workerReward * 0.07);
    const sosFee = (sosCheckbox && sosCheckbox.checked) ? 190 : 0;
    const total = workerReward + serviceFee + sosFee;

    if (workerPayoutEl) workerPayoutEl.textContent = `${workerReward.toLocaleString('ru-RU')} ₽`;
    if (platformFeeEl) platformFeeEl.textContent = `+${serviceFee.toLocaleString('ru-RU')} ₽`;
    if (totalEscrowEl) totalEscrowEl.textContent = `${total.toLocaleString('ru-RU')} ₽`;
  }

  function initCreateForm() {
    const daySelect = document.getElementById('taskDaySelect');
    const timeSelect = document.getElementById('taskStartTimeSelect');
    if (daySelect && !daySelect.value) daySelect.value = 'today';
    if (timeSelect && !timeSelect.value) timeSelect.value = '16';
    updateCreateEscrowCalc();
  }

  function handleCreateOrderSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    const titleEl = document.getElementById('taskTitleInput');
    const catEl = document.getElementById('taskCategorySelect');
    const descEl = document.getElementById('taskDescInput');
    const distEl = document.getElementById('taskDistrictSelect');
    const addrEl = document.getElementById('taskAddressInput');
    const priceEl = document.getElementById('taskPriceInput');
    const hoursEl = document.getElementById('taskHoursSelect');
    const slotsEl = document.getElementById('taskSlotsSelect');
    const memoEl = document.getElementById('taskMemoInput');
    const daySelect = document.getElementById('taskDaySelect');
    const startSelect = document.getElementById('taskStartTimeSelect');
    const sosCheckbox = document.getElementById('taskUrgentSosCheckbox');
    const isBiz = document.querySelector('input[name="orderType"]:checked')?.value === 'business';

    const title = titleEl ? titleEl.value.trim() : '';
    const category = catEl ? catEl.value : 'Физическая помощь';
    const comment = descEl ? descEl.value.trim() : '';
    const district = distEl ? distEl.value : 'Октябрьский р-н';
    const addr = addrEl ? addrEl.value.trim() : '';
    const rawPrice = parseInt(priceEl ? priceEl.value : 2500, 10);
    const hours = parseFloat(hoursEl ? hoursEl.value : 3);
    const slotsTotal = parseInt(slotsEl ? slotsEl.value : 1, 10) || 1;
    const memo = memoEl ? memoEl.value.trim() : '';

    if (!title || !rawPrice) {
      UI.showFeedbackToast('Ошибка', 'Заполните название и бюджет смены');
      return;
    }

    const dayVal = daySelect ? daySelect.value : 'today';
    const dayNames = { today: 'Сегодня', tomorrow: 'Завтра', afterTomorrow: 'Послезавтра' };
    const dayName = dayNames[dayVal] || 'Сегодня';

    const startHourNum = parseInt(startSelect ? startSelect.value : '14', 10) || 14;
    const startStr = (startHourNum < 10 ? '0' : '') + startHourNum + ':00';
    const endHourNum = Math.min(24, Math.round(startHourNum + hours));
    const endStr = (endHourNum < 10 ? '0' : '') + endHourNum + ':00';
    const timeFormatted = `${dayName}, ${startStr} – ${endStr}`;

    const prof = store.getCurrentEmployerProfile();
    const user = store.state.users.find(u => u.id === store.state.currentEmployerId) || store.state.users[2];
    const customerName = (prof && prof.companyName) ? prof.companyName : (user ? user.name : 'Заказчик');

    const isSos = !!(sosCheckbox && sosCheckbox.checked);
    const serviceFee = Math.round(rawPrice * 0.07);
    const sosFee = isSos ? 190 : 0;
    const totalWithFee = rawPrice + serviceFee + sosFee;

    if (!prof.escrow) prof.escrow = { reserved: 0, available: 0 };
    prof.escrow.reserved = (prof.escrow.reserved || 0) + totalWithFee;

    const newOrder = {
      id: Date.now(),
      ownerId: store.state.currentEmployerId,
      title: title,
      district: `${district}, ${addr || 'ул. Ленина, 1'}`,
      districtKey: district,
      category: category,
      orderType: isBiz ? 'business' : 'private',
      allowNegotiation: !isBiz,
      time: timeFormatted,
      duration: `${hours} часа`,
      hours: hours,
      price: `${rawPrice.toLocaleString('ru-RU')} ₽`,
      rawPrice: rawPrice,
      serviceFee: serviceFee,
      sosFee: sosFee,
      totalEscrow: totalWithFee,
      lat: 53.2185,
      lng: 50.1642,
      comment: comment || 'Выполнение смены согласно правилам платформы.',
      objectMemo: memo || 'Спецодежда и рохли выдаются на проходной базы по паспорту. Код двери: #4210',
      customerName: customerName,
      customerRating: '4.98',
      perks: isSos ? ['Срочный СОС-вызов', 'СБП 15 мин', 'Eluma Safe Эскроу'] : ['СБП 15 мин', 'Eluma Safe Эскроу'],
      status: 'searching',
      assignedWorkerId: null,
      slotsTotal: slotsTotal,
      assignedWorkerIds: [],
      step: 1,
      proofs: { before: null, after: null, coords: null }
    };

    if (!store.state.orders) store.state.orders = [];
    store.state.orders.unshift(newOrder);

    store.save('order_created');
    UI.showFeedbackToast('Смена опубликована!', `${totalWithFee.toLocaleString('ru-RU')} ₽ захолдированы в Eluma Safe (включая сбор 7%).`);
    showScreen('home');
  }

  // --------------------------------------------------------------------------
  // 7. БАЛАНС И ЧЕКИ ФНС
  // --------------------------------------------------------------------------

  function renderEmployerBalance() {
    const prof = store.getCurrentEmployerProfile();
    const resEl = document.getElementById('empBalanceReserved');
    const availEl = document.getElementById('empBalanceAvailable');
    const ordersListEl = document.getElementById('empEscrowActiveOrdersList');

    const reservedAmount = store.getEmployerReservedAmount ? store.getEmployerReservedAmount() : (prof.escrow ? prof.escrow.reserved : 0);
    if (resEl) resEl.textContent = `${reservedAmount.toLocaleString('ru-RU')} ₽`;
    if (availEl) availEl.textContent = prof.type === 'business' ? 'B2B-Подписка (0% комиссии)' : 'Тариф Базовый (7% комиссии)';

    if (ordersListEl) {
      const activeOrders = store.getEmployerOrders().filter(o => o.status !== 'completed' && o.status !== 'cancelled');
      if (activeOrders.length === 0) {
        ordersListEl.innerHTML = `<div class="empty-feed-card"><p>Нет активных захолдированных смен</p></div>`;
      } else {
        ordersListEl.innerHTML = activeOrders.map(o => `
          <div class="escrow-order-row">
            <div class="escrow-order-info">
              <strong>${UI.escapeHtml(o.title)}</strong>
              <span>${UI.renderStatusBadge(o.status)} • ${UI.escapeHtml(o.district)}</span>
            </div>
            <strong class="escrow-order-amount">${UI.escapeHtml(o.price)}</strong>
          </div>
        `).join('');
      }
    }
  }

  // Для 100% обратной совместимости с тестами v14_browser_test.js
  function topUpBalance(customAmount) {
    const amount = typeof customAmount === 'number' ? customAmount : 10000;
    const prof = store.getCurrentEmployerProfile();
    if (prof && prof.escrow) {
      prof.escrow.available += amount;
      store.save('balance_topup');
      renderEmployerBalance();
      updateSidebarEscrow();
    }
    return true;
  }

  function topUpEscrow(amount) {
    return topUpBalance(amount);
  }

  function exportEscrowCsv() {
    const orders = store.getEmployerOrders();
    const rows = [
      ['ID смены', 'Название смены', 'Категория', 'Район Самары', 'Время', 'Вознаграждение (₽)', 'В холде Eluma Safe (₽)', 'Статус', 'Исполнитель']
    ];

    orders.forEach(o => {
      const worker = o.assignedWorkerId ? store.getUser(o.assignedWorkerId) : null;
      rows.push([
        String(o.id),
        o.title || '',
        o.category || '',
        o.district || '',
        o.time || '',
        String(o.rawPrice || 0),
        String(o.totalEscrow || (o.rawPrice + Math.round(o.rawPrice * 0.07))),
        o.status || '',
        worker ? worker.name : 'Не назначен'
      ]);
    });

    const csvContent = '\uFEFF' + rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'eluma_escrow_report_samara.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    UI.showFeedbackToast('Реестр смен выгружен', 'Файл eluma_escrow_report_samara.csv успешно сохранён');
  }

  function duplicateOrder(orderId) {
    const orig = (store.state.orders || []).find(o => o.id === orderId);
    if (!orig) return;

    const newId = Math.floor(100000 + Math.random() * 900000);
    const cloned = JSON.parse(JSON.stringify(orig));
    cloned.id = newId;
    cloned.title = orig.title + ' (копия)';
    cloned.status = 'searching';
    cloned.assignedWorkerId = null;
    cloned.assignedWorkerIds = [];
    cloned.applications = [];
    cloned.counterOffer = null;
    cloned.proofs = {};
    cloned.step = 1;

    const prof = store.getCurrentEmployerProfile();
    const totalEscrow = cloned.totalEscrow || (cloned.rawPrice + Math.round(cloned.rawPrice * 0.07));
    if (prof && prof.escrow) {
      prof.escrow.reserved = (prof.escrow.reserved || 0) + totalEscrow;
    }

    store.state.orders.unshift(cloned);
    store.save('order_duplicated');
    UI.showFeedbackToast('Смена продублирована', `Создана новая публикация #${newId}`);
    renderEmployerOrders();
    updateSidebarEscrow();
  }

  function togglePublish(orderId) {
    const order = (store.state.orders || []).find(o => o.id === orderId);
    if (!order) return;
    if (order.status === 'cancelled') {
      order.status = 'searching';
      UI.showFeedbackToast('Смена опубликована', 'Задание снова видно исполнителям Самары');
    } else {
      order.status = 'cancelled';
      UI.showFeedbackToast('Смена снята', 'Задание скрыто из открытого каталога');
    }
    store.save('order_toggled');
    renderEmployerOrders();
    if (empState.currentDetailOrderId === orderId) {
      renderOrderDetail(orderId);
    }
  }

  function cancelOrder(orderId) {
    const order = store.state.orders.find(o => o.id === orderId);
    if (!order) return;
    const prof = store.getCurrentEmployerProfile();
    const totalEscrow = order.totalEscrow || (order.rawPrice + Math.round(order.rawPrice * 0.07));

    const hasGps = (order.proofs && (order.proofs.gpsChecked || order.proofs.coords)) || order.status === 'on_site' || order.status === 'in_progress' || order.step >= 2;

    if (hasGps && order.assignedWorkerId) {
      const wid = order.assignedWorkerId;
      const workerProf = store.state.workerProfiles[wid];
      if (workerProf && workerProf.wallet) {
        workerProf.wallet.available = (workerProf.wallet.available || 0) + 400;
      }
      if (prof && prof.escrow) {
        prof.escrow.reserved = Math.max(0, (prof.escrow.reserved || 0) - totalEscrow);
      }
      const receiptNum = 84300 + Math.floor(Math.random() * 500);
      if (!store.state.payouts) store.state.payouts = [];
      store.state.payouts.unshift({
        id: Date.now(),
        orderId: order.id,
        workerId: wid,
        title: 'Компенсация 400 ₽ за отмену смены после GPS чек-ина на объекте',
        date: 'Сегодня • Компенсация Т-Банк СБП',
        amount: 400,
        receiptNum: receiptNum,
        fnsStatus: 'Компенсация за ложный вызов'
      });
      store.addChatMessage(order.id, 'system', 'Компенсация 400 ₽ за отмену смены после GPS чек-ина на объекте начислена исполнителю.');
      order.status = 'cancelled';
      store.save('order_cancelled_with_compensation');
      UI.showFeedbackToast('Смена отменена с компенсацией', 'Удержана компенсация 400 ₽ в пользу исполнителя, прибывшего на точку');
    } else {
      if (prof && prof.escrow && (order.status === 'searching' || order.status === 'assigned' || order.status === 'draft')) {
        prof.escrow.reserved = Math.max(0, (prof.escrow.reserved || 0) - totalEscrow);
      }
      order.status = 'cancelled';
      store.addChatMessage(order.id, 'system', 'Смена отменена заказчиком. Средства разблокированы.');
      store.save('order_cancelled');
      UI.showFeedbackToast('Смена отменена', 'Холдирование средств в Eluma Safe снято');
    }
    renderEmployerOrders();
    renderEmployerBalance();
    if (empState.currentDetailOrderId === orderId) {
      renderOrderDetail(orderId);
    }
  }

  function openEditModal(orderId) {
    empState.editingOrderId = orderId;
    const order = (store.state.orders || []).find(o => o.id === orderId);
    if (!order) return;
    const titleEl = document.getElementById('editTaskTitle');
    const priceEl = document.getElementById('editTaskPrice');
    if (titleEl) titleEl.value = order.title;
    if (priceEl) priceEl.value = order.rawPrice;
    UI.openModal('editTaskModal');
  }

  function saveEditedOrder(e) {
    if (e && e.preventDefault) e.preventDefault();
    const order = (store.state.orders || []).find(o => o.id === empState.editingOrderId);
    if (!order) return;
    const titleEl = document.getElementById('editTaskTitle');
    const priceEl = document.getElementById('editTaskPrice');
    const newTitle = titleEl ? titleEl.value.trim() : '';
    const newPrice = priceEl ? parseInt(priceEl.value, 10) : 0;
    if (!newTitle || !newPrice) return;

    order.title = newTitle;
    order.rawPrice = newPrice;
    order.price = `${newPrice.toLocaleString('ru-RU')} ₽`;
    order.serviceFee = Math.round(newPrice * 0.07);
    order.totalEscrow = newPrice + order.serviceFee + (order.sosFee || 0);

    store.save('order_edited');
    UI.closeModal('editTaskModal');
    UI.showFeedbackToast('Смена обновлена', 'Параметры успешно сохранены');
    renderEmployerOrders();
    if (empState.currentDetailOrderId === order.id) {
      renderOrderDetail(order.id);
    }
  }

  function renderEmployerProfile() {
    const prof = store.getCurrentEmployerProfile();
    const user = store.state.users.find(u => u.id === store.state.currentEmployerId) || store.state.users[2];

    const nameEl = document.getElementById('empProfileCompanyName');
    const typeEl = document.getElementById('empProfileTypeBadge');
    const logContainer = document.getElementById('empSafetyBriefingLogList');

    if (nameEl) nameEl.textContent = prof.companyName || user.name;
    if (typeEl) typeEl.textContent = prof.type === 'business' ? 'Юридическое лицо / Бизнес' : 'Частный заказчик';

    if (logContainer) {
      const logs = prof.safetyBriefingLog || [];
      if (logs.length === 0) {
        logContainer.innerHTML = `<p class="text-muted">Отметок о вводном инструктаже на объекте пока нет</p>`;
      } else {
        logContainer.innerHTML = logs.map(l => `
          <div class="briefing-log-item">
            <strong>${UI.SVG_ICONS.check} Вводный инструктаж по охране труда на объекте</strong>
            <span>Дата: ${UI.escapeHtml(l.date)} • Ответственный: ${UI.escapeHtml(l.officer)} (${UI.escapeHtml(l.site)})</span>
          </div>
        `).join('');
      }
    }
  }

  function setSearchQuery(val) {
    empState.searchQuery = val || '';
    renderEmployerOrders();
  }

  function openTransparencyModal() {
    UI.openModal('transparencyModal');
  }

  function acceptCounterOffer(orderId) {
    resolveCounterOffer(orderId, true);
  }

  function declineCounterOffer(orderId) {
    resolveCounterOffer(orderId, false);
  }

  function simulateWorkerEvent() {
    const myOrders = store.getEmployerOrders();
    const searchingOrder = myOrders.find(o => o.status === 'searching' && !o.counterOffer);

    if (searchingOrder) {
      const counterPrice = Math.round((searchingOrder.rawPrice * 1.15) / 100) * 100;
      searchingOrder.counterOffer = {
        workerId: 2,
        price: counterPrice,
        comment: 'Готов выйти оперативно, инструмент и опыт в наличии.'
      };
      searchingOrder.status = 'applied';
      store.save('simulated_counter');
      UI.showFeedbackToast('Новый отклик!', `Исполнитель предложил ставку ${counterPrice.toLocaleString('ru-RU')} ₽ по смене «${searchingOrder.title}»`);
      renderEmployerOrders();
    } else if (myOrders.length > 0) {
      duplicateOrder(myOrders[0].id);
      setTimeout(() => simulateWorkerEvent(), 100);
    }
    renderActionQueue();
  }

  function scrollToQueue() {
    const card = document.getElementById('employerActionQueueCard');
    if (card) {
      card.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function renderActionQueue() {
    const queueList = document.getElementById('employerActionQueue');
    const badgeEl = document.getElementById('actionQueueBadgeCount');
    const myOrders = store.getEmployerOrders();
    const actionItems = [];

    myOrders.forEach(o => {
      if (o.counterOffer && (o.status === 'applied' || o.status === 'searching')) {
        actionItems.push({
          type: 'counter',
          order: o,
          title: `Торг по смене «${o.title}»`,
          subtitle: `Исполнитель предложил ставку ${o.counterOffer.price.toLocaleString('ru-RU')} ₽`,
          time: o.time
        });
      }
    });

    myOrders.forEach(o => {
      if (o.status === 'in_review') {
        const worker = store.getUser(o.assignedWorkerId);
        actionItems.push({
          type: 'review',
          order: o,
          title: `Проверка фотоотчёта «${o.title}»`,
          subtitle: `Исполнитель ${worker ? worker.name : ''} сдал работу`,
          time: o.time
        });
      }
    });

    const count = actionItems.length;
    if (badgeEl) badgeEl.textContent = `${count}`;
    if (!queueList) return;

    if (count === 0) {
      queueList.innerHTML = '<div class="action-queue-empty" style="font-size: 12px; color: var(--text-muted);">Очередь чиста, действий не требуется</div>';
      return;
    }

    queueList.innerHTML = actionItems.map(item => `
      <div class="action-queue-item" data-type="${item.type}" style="padding: 8px 10px; border-radius: 8px; background: var(--bg-card); border: 1px solid var(--border-light); margin-bottom: 6px;">
        <strong class="action-item-title" style="display: block; font-size: 12px; font-weight: 700;">${UI.escapeHtml(item.title)}</strong>
        <p class="action-item-desc" style="font-size: 11px; color: var(--text-secondary); margin: 2px 0 0 0;">${UI.escapeHtml(item.subtitle)}</p>
      </div>
    `).join('');
  }

  // --------------------------------------------------------------------------
  // ЭКСПОРТ В ГЛОБАЛЬНОЕ ПРОСТРАНСТВО IMЕН
  // --------------------------------------------------------------------------

  window.Eluma.Employer = {
    navigate: showScreen,
    setStatusFilter: setStatusFilter,
    setSearchQuery: setSearchQuery,
    openDetail: openDetail,
    openChatDialog: openChatDialog,
    backToChatsList: backToChatsList,
    handleSendSplitChat: handleSendSplitChat,
    handleSendChat: handleSendChat,
    sendQuickChat: sendQuickChat,
    openEditMemoModal: openEditMemoModal,
    saveObjectMemo: saveObjectMemo,
    enableSos: enableSos,
    toggleCardMenu: toggleCardMenu,
    toggleB2BSubscription: toggleB2BSubscription,
    filterNeedsAttention: filterNeedsAttention,
    updateCreateEscrowCalc: updateCreateEscrowCalc,
    handleCreateOrderSubmit: handleCreateOrderSubmit,
    topUpBalance: topUpBalance,
    topUpEscrow: topUpEscrow,
    exportEscrowCsv: exportEscrowCsv,
    duplicateOrder: duplicateOrder,
    togglePublish: togglePublish,
    cancelOrder: cancelOrder,
    openEditModal: openEditModal,
    saveEditedOrder: saveEditedOrder,
    acceptWork: acceptWork,
    openReworkModal: openReworkModal,
    submitReworkReason: submitReworkReason,
    openReviewModal: openReviewModal,
    submitReview: submitReview,
    resolveCounterOffer: resolveCounterOffer,
    openTransparencyModal: openTransparencyModal,
    simulateWorkerEvent: simulateWorkerEvent,
    scrollToQueue: scrollToQueue,
    renderActionQueue: renderActionQueue,
    acceptCounterOffer: acceptCounterOffer,
    declineCounterOffer: declineCounterOffer
  };

  window.Olksi.Employer = window.Eluma.Employer;

  // Инициализация при загрузке DOM
  document.addEventListener('DOMContentLoaded', function () {
    const params = new URLSearchParams(window.location.search);
    const initialScreen = params.get('screen') || 'home';
    showScreen(initialScreen);

    // Подписка на обновление реактивного хранилища
    store.subscribe((state, reason) => {
      renderCurrentScreen();
    });
  });

})();
