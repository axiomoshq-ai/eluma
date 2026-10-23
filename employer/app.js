/**
 * Eluma v15 — employer/app.js
 * Клиентская логика кабинета заказчика (мои заказы, создание смен, отклики, приёмка фотоотчётов, баланс и эскроу)
 */

(function () {
  'use strict';

  window.Eluma = window.Eluma || {};
  window.Olksi = window.Eluma;

  const store = window.Eluma.store || window.Olksi.store;
  const UI = window.Eluma.UI || window.Eluma.UI;

  // Состояние контроллера заказчика
  const empState = {
    currentScreen: 'home', // home, create, chats, balance, profile, detail
    statusFilter: 'all', // all, searching, in_progress, completed
    searchQuery: '',
    currentDetailOrderId: null,
    editingOrderId: null
  };

  // --------------------------------------------------------------------------
  // НАВИГАЦИЯ И ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ
  // --------------------------------------------------------------------------

  function showScreen(screenId) {
    empState.currentScreen = screenId;
    store.setTabScreen('employer', screenId);
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('scr-emp-' + screenId);
    if (target) target.classList.add('active');

    // Обновляем навигацию
    document.querySelectorAll('.d-nav-item, .m-nav-item').forEach(item => {
      const scr = item.getAttribute('data-screen');
      item.classList.toggle('active', scr === screenId);
    });

    // Обновляем заголовок шапки
    const titles = {
      home: 'Мои заказы',
      create: 'Создать смену',
      chats: 'Отклики и чаты',
      balance: 'Баланс и эскроу',
      profile: 'Профиль компании',
      detail: 'Детали заказа'
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
    const asideAvailEl = document.getElementById('asideEscrowAvailable');
    const asideResEl = document.getElementById('asideEscrowReserved');
    if (prof && prof.escrow) {
      const resStr = `${prof.escrow.reserved.toLocaleString('ru-RU')} ₽`;
      const availStr = `${prof.escrow.available.toLocaleString('ru-RU')} ₽`;
      if (resEl) resEl.textContent = resStr;
      if (availEl) availEl.textContent = availStr;
      if (asideAvailEl) asideAvailEl.textContent = availStr;
      if (asideResEl) asideResEl.textContent = resStr;
    }
  }

  // --------------------------------------------------------------------------
  // ЭКРАН: МОИ ЗАКАЗЫ (HOME)
  // --------------------------------------------------------------------------

  function renderEmployerOrders() {
    const container = document.getElementById('employerTasksList');
    if (!container) return;

    // ТОЛЬКО заказы текущего работодателя по ownerId (исправление D4!)
    const allOwnerOrders = store.getEmployerOrders();

    // Обновляем счётчики табов
    const totalCount = allOwnerOrders.length;
    const searchingCount = allOwnerOrders.filter(o => o.status === 'searching' || o.status === 'applied').length;
    const inReviewCount = allOwnerOrders.filter(o => o.status === 'in_review' || o.status === 'rework' || o.status === 'assigned' || o.status === 'on_site').length;
    const completedCount = allOwnerOrders.filter(o => o.status === 'completed').length;

    const countEl = document.getElementById('empOrdersCount');
    if (countEl) countEl.textContent = `${totalCount}`;
    const searchingEl = document.getElementById('empSearchingCount');
    if (searchingEl) searchingEl.textContent = `${searchingCount}`;
    const inReviewEl = document.getElementById('empInReviewCount');
    if (inReviewEl) inReviewEl.textContent = `${inReviewCount}`;
    const completedEl = document.getElementById('empCompletedCount');
    if (completedEl) completedEl.textContent = `${completedCount}`;

    // Обновляем виджет сводки в правой колонке
    const asideActiveEl = document.getElementById('asideActiveCount');
    const asideReviewEl = document.getElementById('asideReviewCount');
    if (asideActiveEl) asideActiveEl.textContent = `${searchingCount}`;
    if (asideReviewEl) asideReviewEl.textContent = `${inReviewCount}`;

    // Подсвечиваем активный таб фильтра
    document.querySelectorAll('.emp-tab-chip').forEach(chip => {
      chip.classList.toggle('active', chip.getAttribute('data-status') === empState.statusFilter);
    });

    let orders = [...allOwnerOrders];

    if (empState.statusFilter === 'searching') {
      orders = orders.filter(o => o.status === 'searching' || o.status === 'applied');
    } else if (empState.statusFilter === 'in_review' || empState.statusFilter === 'in_progress') {
      orders = orders.filter(o => o.status === 'in_review' || o.status === 'rework' || o.status === 'assigned' || o.status === 'on_site');
    } else if (empState.statusFilter === 'completed') {
      orders = orders.filter(o => o.status === 'completed');
    }

    if (empState.searchQuery.trim()) {
      const q = empState.searchQuery.trim().toLowerCase();
      orders = orders.filter(o => o.title.toLowerCase().includes(q) || o.district.toLowerCase().includes(q));
    }

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="empty-feed-card">
          <div class="empty-feed-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
          </div>
          <p class="empty-feed-title">В этом статусе пока нет заказов</p>
          <span class="empty-feed-desc">Создайте новую смену или выберите другой статус</span>
          <button class="btn btn-primary-cta" onclick="window.Eluma.Employer.navigate('create')">Создать задание</button>
        </div>
      `;
      renderActionQueue();
      return;
    }

    container.innerHTML = orders.map(order => renderEmployerOrderCardHtml(order)).join('');
    renderActionQueue();
  }

  function setStatusFilter(status) {
    empState.statusFilter = status;
    renderEmployerOrders();
  }

  function renderEmployerOrderCardHtml(order) {
    const isSearching = order.status === 'searching';
    const isPublished = order.status !== 'cancelled';
    const durationLabel = order.orderType === 'private' ? `Задача ${order.hours} ч` : `Смена ${order.hours} ч`;

    // Расчёт слотов бригады
    const totalSlots = order.slotsTotal || 1;
    let filledSlots = 0;
    if (Array.isArray(order.assignedWorkerIds)) {
      filledSlots = order.assignedWorkerIds.length;
    } else if (order.assignedWorkerId) {
      filledSlots = 1;
    }
    const slotsBadgeHtml = totalSlots > 1 ? `
      <span class="emp-category-sep">·</span>
      <span class="emp-slots-badge" title="Слоты бригады">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span>${filledSlots} / ${totalSlots} мест</span>
      </span>
    ` : '';

    // Сводка откликов или назначенный исполнитель
    let summaryText = 'Радар 3 км активен • 0 откликов';
    if (order.assignedWorkerId) {
      const worker = store.getUser(order.assignedWorkerId);
      summaryText = `Исполнитель: ${worker ? worker.name : 'Назначен'} (Рейтинг ${worker ? worker.rating : '4.95'})`;
    } else if (order.counterOffer) {
      summaryText = `Встречное предложение: ${order.counterOffer.price.toLocaleString('ru-RU')} ₽`;
    } else if (order.applications && order.applications.length > 0) {
      summaryText = `Откликов: ${order.applications.length}`;
    }

    return `
      <article class="employer-task-card" onclick="window.Eluma.Employer.openDetail(${order.id})">
        <!-- Колонка 1: Фото объекта -->
        <div class="emp-photo-wrap">
          <img class="unit-photo-img" src="${UI.getOrderPhotoUrl(order)}" alt="${UI.escapeHtml(order.title)}" loading="lazy">
        </div>

        <!-- Колонка 2: Инфо -->
        <div class="emp-card-body-col">
          <div class="emp-meta-top-left">
            ${UI.renderStatusBadge(order.status)}
            <span class="emp-category-sep">·</span>
            <span class="emp-category-inline">${UI.escapeHtml(order.category)}</span>
            ${slotsBadgeHtml}
            <span class="emp-category-sep">·</span>
            <span class="badge-safe-deal" title="Средства заморожены в эскроу Eluma Safe">
              ${UI.SVG_ICONS.shield} <span>Эскроу</span>
            </span>
          </div>

          <h3 class="unit-task-title">${UI.escapeHtml(order.title)}</h3>

          <div class="unit-location-time-line">
            <span>${UI.escapeHtml(order.district)}</span>
            <span class="unit-meta-sep">·</span>
            <span>${UI.escapeHtml(order.time)}</span>
          </div>

          <div class="emp-responses-summary">
            <span>${UI.escapeHtml(summaryText)}</span>
          </div>
        </div>

        <!-- Колонка 3: Цена и Действия -->
        <div class="emp-action-price-col" onclick="event.stopPropagation()">
          <div class="unit-payout-box">
            <span class="unit-payout-amount">${UI.escapeHtml(order.price)}</span>
            <span class="unit-duration-pill">${durationLabel}</span>
          </div>

          <div class="emp-actions-btns">
            <button type="button" class="btn-emp-action duplicate" onclick="window.Eluma.Employer.duplicateOrder(${order.id})" title="Продублировать смену">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block;vertical-align:-2px"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Дублировать</span>
            </button>
            <button type="button" class="btn-emp-action edit" onclick="window.Eluma.Employer.openEditModal(${order.id})" title="Редактировать цену и описание">
              ${UI.SVG_ICONS.edit} <span>Изменить</span>
            </button>
            <button type="button" class="btn-emp-action toggle" onclick="window.Eluma.Employer.togglePublish(${order.id})">
              <span>${isPublished ? 'Снять' : 'Опубликовать'}</span>
            </button>
            <button type="button" class="btn-emp-action delete" onclick="window.Eluma.Employer.deleteOrder(${order.id})" title="Удалить заказ">
              ${UI.SVG_ICONS.trash} <span>Удалить</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  // --------------------------------------------------------------------------
  // ЭКРАН: ДЕТАЛИ ЗАКАЗА (DETAIL & ПУБЛИЧНАЯ КАРТОЧКА ИСПОЛНИТЕЛЯ)
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
    const order = (store.state.orders || []).find(o => o.id === orderId);
    if (!order) return;

    const titleEl = document.getElementById('empDetailTitle');
    const photoImg = document.getElementById('empDetailPhotoImg');
    const priceEl = document.getElementById('empDetailPrice');
    const timeEl = document.getElementById('empDetailTime');
    const distEl = document.getElementById('empDetailDistrict');
    const descEl = document.getElementById('empDetailDesc');
    const badgeEl = document.getElementById('empDetailStatusBadge');
    const workerCardBox = document.getElementById('empAssignedWorkerCardContainer');

    if (titleEl) titleEl.textContent = order.title;
    if (photoImg) {
      photoImg.src = UI.getOrderPhotoUrl(order);
      photoImg.alt = order.title;
    }
    if (priceEl) priceEl.textContent = order.price;
    if (timeEl) timeEl.textContent = `${order.time} (${order.duration})`;
    if (distEl) distEl.textContent = order.district;
    if (descEl) descEl.textContent = order.comment;

    if (badgeEl) {
      badgeEl.innerHTML = UI.renderStatusBadge(order.status);
    }

    // Рендерим ПУБЛИЧНУЮ КАРТОЧКУ ИСПОЛНИТЕЛЯ (Раздел 6 мастер-промпта)
    if (workerCardBox) {
      if (order.assignedWorkerId) {
        const workerUser = store.state.users.find(u => u.id === order.assignedWorkerId);
        const ratingMeta = store.getWorkerRatingMeta(order.assignedWorkerId);
        const shiftsCount = store.getWorkerCompletedShiftsCount(order.assignedWorkerId);
        const reliability = store.getWorkerReliability(order.assignedWorkerId);
        const check = store.canWorkerTakeOrder(order.assignedWorkerId, order);

        workerCardBox.innerHTML = `
          <div class="public-worker-card">
            <div class="public-card-head">
              <div class="public-worker-avatar">
                ${UI.SVG_ICONS.user}
              </div>
              <div class="public-worker-info">
                <div class="public-name-row">
                  <strong class="public-worker-name">${UI.escapeHtml(workerUser ? workerUser.name : 'Алексей К.')}</strong>
                  <span class="badge-npd-verified">${UI.SVG_ICONS.check} Самозанятый (НПД)</span>
                  <span class="badge-phone-verified">${UI.SVG_ICONS.check} Телефон подтверждён</span>
                </div>
                <div class="public-stats-row">
                  <span class="public-stat-item"><strong>${shiftsCount}</strong> смен выполнено</span>
                  <span class="public-stat-item">Рейтинг: <strong>${ratingMeta.rating}</strong> ${UI.SVG_ICONS.star} (${ratingMeta.count} отзывов)</span>
                  ${reliability ? `<span class="public-stat-item">Надёжность: <strong>${reliability}</strong></span>` : ''}
                </div>
              </div>
            </div>

            <div class="public-courses-row">
              <span class="public-courses-label">Пройденные курсы допуска:</span>
              <div class="public-courses-chips">
                <span class="course-chip verified">${UI.SVG_ICONS.check} Допуск к смене (${UI.escapeHtml(order.category)})</span>
                <span class="course-chip verified">${UI.SVG_ICONS.check} Правила Eluma Safe</span>
              </div>
            </div>

            <div class="public-transparency-hint">
              <span class="transparency-link" onclick="window.Eluma.Employer.openTransparencyModal()">Как формируется рейтинг исполнителя (289-ФЗ)?</span>
            </div>
          </div>
        `;
      } else {
        workerCardBox.innerHTML = `
          <div class="empty-worker-slot">
            ${UI.SVG_ICONS.radar}
            <strong>Исполнитель ещё не назначен</strong>
            <p>Заказ опубликован в открытом поиске Самары. Исполнители с подтверждённым допуском получат уведомление.</p>
          </div>
        `;
      }
    }

    renderPhotoVerification(order);
    renderReviewActions(order);
    renderEmployerOrderChat(order.id);
  }

  function renderEmployerOrderChat(orderId) {
    const container = document.getElementById('empChatMessages');
    if (!container) return;

    const msgs = (store.state.chats && store.state.chats[orderId]) || [];
    if (msgs.length === 0) {
      container.innerHTML = `
        <div class="chat-empty-state">
          <span>Нет сообщений по заказу. Отправьте инструкции или быстрый ответ исполнителю.</span>
        </div>
      `;
      return;
    }

    container.innerHTML = msgs.map(m => {
      if (m.sender === 'system') {
        return `
          <div class="chat-msg system">
            <span class="chat-msg-text">${UI.escapeHtml(m.text)}</span>
            <span class="chat-msg-time">${UI.escapeHtml(m.time || '')}</span>
          </div>
        `;
      }
      const isOutgoing = m.sender === 'employer';
      return `
        <div class="chat-msg ${isOutgoing ? 'outgoing' : 'incoming'}">
          <div class="chat-msg-bubble">
            <div class="chat-msg-sender">${isOutgoing ? 'Вы (Заказчик)' : 'Исполнитель'}</div>
            <div class="chat-msg-text">${UI.escapeHtml(m.text)}</div>
            <div class="chat-msg-time">${UI.escapeHtml(m.time || '')}</div>
          </div>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  }

  function handleSendEmployerChat(e) {
    if (e && e.preventDefault) e.preventDefault();
    const input = document.getElementById('empChatInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const orderId = empState.currentDetailOrderId;
    if (!orderId) return;

    store.addChatMessage(orderId, 'employer', text);
    input.value = '';
    renderEmployerOrderChat(orderId);
  }

  function sendQuickEmployerChat(text, targetOrderId = null) {
    const orderId = targetOrderId || empState.currentDetailOrderId || empState.activeChatOrderId;
    if (!orderId) return;
    store.addChatMessage(orderId, 'employer', text);
    renderEmployerOrderChat(orderId);
    renderSplitChatMessages(orderId);
    UI.showFeedbackToast('Сообщение отправлено', text);
  }

  function renderPhotoVerification(order) {
    const proofs = order.proofs || {};
    const beforeEl = document.getElementById('empSlotBefore');
    const afterEl = document.getElementById('empSlotAfter');
    const gpsEl = document.getElementById('empGpsStampBadge');

    if (beforeEl) {
      beforeEl.innerHTML = proofs.before
        ? `<img src="${proofs.before}" alt="Снимок ДО" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`
        : `<div class="slot-placeholder">Снимок ДО начала ожидает загрузки</div>`;
    }
    if (afterEl) {
      afterEl.innerHTML = proofs.after
        ? `<img src="${proofs.after}" alt="Снимок ПОСЛЕ" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`
        : `<div class="slot-placeholder">Снимок ПОСЛЕ окончания ожидает загрузки</div>`;
    }
    if (gpsEl) {
      if (proofs.coords) {
        gpsEl.className = 'proofs-badge verified';
        gpsEl.innerHTML = `${UI.SVG_ICONS.check} GPS-метка: ${UI.escapeHtml(proofs.coords)}`;
      } else {
        gpsEl.className = 'proofs-badge';
        gpsEl.textContent = 'GPS: Метка ожидает фиксации исполнителем';
      }
    }
  }

  function renderReviewActions(order) {
    const actionsContainer = document.getElementById('empReviewActionsContainer');
    if (!actionsContainer) return;

    if (order.counterOffer && (order.status === 'applied' || order.status === 'searching')) {
      actionsContainer.innerHTML = `
        <div class="counter-offer-banner">
          <div class="counter-offer-header">
            <span>Встречное предложение: <strong>${order.counterOffer.price.toLocaleString('ru-RU')} ₽</strong></span>
            <span class="badge-status-pill badge-warning">Торг</span>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">${UI.escapeHtml(order.counterOffer.comment || 'Исполнитель предложил новую ставку.')}</div>
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
            ${UI.SVG_ICONS.check} Принять работу и выплатить ${UI.escapeHtml(order.price)}
          </button>
          <button type="button" class="btn btn-secondary-outline danger" onclick="window.Eluma.Employer.openReworkModal(${order.id})">
            Вернуть на доработку с замечаниями
          </button>
        </div>
      `;
    } else if (order.status === 'completed') {
      actionsContainer.innerHTML = `
        <div class="emp-completed-banner">
          ${UI.SVG_ICONS.check} <strong>Работа принята и оплачена</strong>
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
    UI.showFeedbackToast('Работа принята!', 'Оплата переведена исполнителю. Чек ФНС сформирован.');
    renderOrderDetail(orderId);
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
      UI.showFeedbackToast('Ошибка', 'Обязательно укажите причину возврата на доработку');
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

    const starsEl = document.querySelector('input[name="reviewStars"]:checked');
    const starsInput = document.getElementById('empReviewStarsValue');
    let stars = 5;
    if (starsInput && starsInput.value) {
      stars = parseInt(starsInput.value, 10);
    } else if (starsEl) {
      stars = parseInt(starsEl.value, 10);
    } else if (UI.getSelectedReviewStars) {
      stars = UI.getSelectedReviewStars();
    }
    const commentEl = document.getElementById('reviewCommentInput');
    const comment = commentEl ? commentEl.value.trim() : 'Отличная работа!';

    const selectedTags = [];
    document.querySelectorAll('.review-tag-checkbox:checked').forEach(cb => selectedTags.push(cb.value));

    if (!store.state.reviews) store.state.reviews = [];
    store.state.reviews.unshift({
      id: Date.now(),
      orderId: order.id,
      fromUserId: store.state.currentEmployerId,
      toUserId: order.assignedWorkerId,
      toRole: 'worker',
      stars: stars,
      tags: selectedTags,
      comment: comment,
      createdAt: new Date().toLocaleDateString('ru-RU')
    });
    store.save('review_added');

    UI.closeModal('empReviewModal');
    UI.showFeedbackToast('Отзыв опубликован', 'Спасибо за оценку работы исполнителя!');
    renderOrderDetail(order.id);
  }

  // --------------------------------------------------------------------------
  // ЭКРАН: СОЗДАНИЕ СМЕНЫ (CREATE)
  // --------------------------------------------------------------------------

  function updateCreateEscrowCalc() {
    const priceInput = document.getElementById('taskPriceInput');
    const workerPayoutEl = document.getElementById('calcWorkerPayout');
    const platformFeeEl = document.getElementById('calcPlatformFee');
    const sosCheckbox = document.getElementById('taskUrgentSosCheckbox');
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
    // Устанавливаем дату и время по умолчанию
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

    if (!title || !rawPrice) {
      UI.showFeedbackToast('Ошибка', 'Заполните название и бюджет смены');
      return;
    }

    // Вычисление дня и временного интервала смены
    const dayVal = daySelect ? daySelect.value : 'today';
    const dayNames = {
      today: 'Сегодня',
      tomorrow: 'Завтра',
      afterTomorrow: 'Послезавтра'
    };
    const dayName = dayNames[dayVal] || (daySelect && daySelect.options[daySelect.selectedIndex] ? daySelect.options[daySelect.selectedIndex].text : 'Сегодня');

    const startHourNum = parseInt(startSelect ? startSelect.value : '14', 10) || 14;
    const startStr = (startHourNum < 10 ? '0' : '') + startHourNum + ':00';
    const endHourNum = Math.min(24, Math.round(startHourNum + hours));
    const endStr = (endHourNum < 10 ? '0' : '') + endHourNum + ':00';
    const timeFormatted = `${dayName}, ${startStr} – ${endStr}`;

    // Реальное имя компании текущего профиля заказчика
    const prof = store.getCurrentEmployerProfile();
    const user = store.state.users.find(u => u.id === store.state.currentEmployerId) || store.state.users[2];
    const customerName = (prof && prof.companyName) ? prof.companyName : (user ? user.name : 'Заказчик');

    // Сервисный сбор 7% (включая 1% в Гарантийный пул) и опциональный СОС-вызов
    const isSos = !!(sosCheckbox && sosCheckbox.checked);
    const serviceFee = Math.round(rawPrice * 0.07);
    const sosFee = isSos ? 190 : 0;
    const totalWithFee = rawPrice + serviceFee + sosFee;

    if (!prof.escrow) prof.escrow = { reserved: 0, available: 0 };
    if ((prof.escrow.available || 0) < totalWithFee) {
      UI.showFeedbackToast(
        'Недостаточно средств',
        `Свободный остаток: ${(prof.escrow.available || 0).toLocaleString('ru-RU')} ₽. К резервированию требуется ${totalWithFee.toLocaleString('ru-RU')} ₽ (включая сбор 7%). Пополните счёт.`
      );
      return;
    }

    prof.escrow.available -= totalWithFee;
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
    UI.showFeedbackToast('Смена опубликована!', `${totalWithFee.toLocaleString('ru-RU')} ₽ зарезервированы в эскроу (включая сбор 7%).`);
    showScreen('home');
  }

  // --------------------------------------------------------------------------
  // ЭКРАН: БАЛАНС И ЭСКРОУ (BALANCE)
  // --------------------------------------------------------------------------

  function renderEmployerBalance() {
    const prof = store.getCurrentEmployerProfile();
    const resEl = document.getElementById('empBalanceReserved');
    const availEl = document.getElementById('empBalanceAvailable');
    const ordersListEl = document.getElementById('empEscrowActiveOrdersList');

    if (resEl && prof) resEl.textContent = `${prof.escrow.reserved.toLocaleString('ru-RU')} ₽`;
    if (availEl && prof) availEl.textContent = `${prof.escrow.available.toLocaleString('ru-RU')} ₽`;

    if (ordersListEl) {
      const activeOrders = store.getEmployerOrders().filter(o => o.status !== 'completed' && o.status !== 'cancelled');
      if (activeOrders.length === 0) {
        ordersListEl.innerHTML = `<div class="empty-feed-card"><p>Нет активных зарезервированных смен</p></div>`;
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

  function topUpBalance(customAmount) {
    const amount = typeof customAmount === 'number' ? customAmount : 10000;
    const prof = store.getCurrentEmployerProfile();
    if (prof && prof.escrow) {
      prof.escrow.available += amount;
      store.save('balance_topup');
      UI.showFeedbackToast('Баланс пополнен', `+${amount.toLocaleString('ru-RU')} ₽ зачислены на счёт заказчика`);
      renderEmployerBalance();
      updateSidebarEscrow();
    }
  }

  function topUpEscrow(amount) {
    return topUpBalance(amount);
  }

  // --------------------------------------------------------------------------
  // ОЧЕРЕДЬ ДЕЙСТВИЙ ЗАКАЗЧИКА (ACTION QUEUE - Раздел 5 мастер-промпта v20)
  // --------------------------------------------------------------------------

  function renderActionQueue() {
    const queueList = document.getElementById('employerActionQueue');
    const badgeEl = document.getElementById('actionQueueBadgeCount');
    const headerCountEl = document.getElementById('headerQueueCount');
    const headerDotEl = document.getElementById('headerQueueDot');

    const myOrders = store.getEmployerOrders();
    const actionItems = [];

    // 1. Встречные предложения цены, ожидающие ответа заказчика
    myOrders.forEach(o => {
      if (o.counterOffer && (o.status === 'applied' || o.status === 'searching')) {
        actionItems.push({
          type: 'counter',
          order: o,
          title: `Торг по смене «${o.title}»`,
          subtitle: `Исполнитель предложил ставку ${o.counterOffer.price.toLocaleString('ru-RU')} ₽ (исходная: ${o.price})`,
          time: o.time
        });
      }
    });

    // 2. Смены, ожидающие приёмки фотоотчёта ДО/ПОСЛЕ
    myOrders.forEach(o => {
      if (o.status === 'in_review') {
        const worker = store.getUser(o.assignedWorkerId);
        actionItems.push({
          type: 'review',
          order: o,
          title: `Проверка фотоотчёта «${o.title}»`,
          subtitle: `Исполнитель ${worker ? worker.name : ''} сдал работу. Проверьте фото ДО и ПОСЛЕ`,
          time: o.time
        });
      }
    });

    const count = actionItems.length;
    if (badgeEl) badgeEl.textContent = `${count}`;
    if (headerCountEl) headerCountEl.textContent = `${count}`;
    if (headerDotEl) headerDotEl.style.display = count > 0 ? 'inline-block' : 'none';

    if (!queueList) return;

    if (count === 0) {
      queueList.innerHTML = `<div class="action-queue-empty">Очередь чиста, срочных действий не требуется</div>`;
      return;
    }

    queueList.innerHTML = actionItems.map(item => {
      if (item.type === 'counter') {
        return `
          <div class="action-queue-item counter-item">
            <div class="action-queue-item-head">
              <span class="action-item-badge warning">Торг</span>
              <span class="action-item-time">${UI.escapeHtml(item.time)}</span>
            </div>
            <strong class="action-item-title">${UI.escapeHtml(item.order.title)}</strong>
            <p class="action-item-desc">${UI.escapeHtml(item.subtitle)}</p>
            <div class="action-item-btns">
              <button type="button" class="btn btn-primary-cta btn-xs" onclick="window.Eluma.Employer.acceptCounterOffer(${item.order.id})">Принять ${item.order.counterOffer.price.toLocaleString('ru-RU')} ₽</button>
              <button type="button" class="btn btn-secondary-outline btn-xs" onclick="window.Eluma.Employer.declineCounterOffer(${item.order.id})">Отклонить</button>
            </div>
          </div>
        `;
      } else if (item.type === 'review') {
        return `
          <div class="action-queue-item review-item">
            <div class="action-queue-item-head">
              <span class="action-item-badge review">Фотоотчёт</span>
              <span class="action-item-time">${UI.escapeHtml(item.time)}</span>
            </div>
            <strong class="action-item-title">${UI.escapeHtml(item.order.title)}</strong>
            <p class="action-item-desc">${UI.escapeHtml(item.subtitle)}</p>
            <div class="action-item-btns">
              <button type="button" class="btn btn-primary-cta btn-xs" onclick="window.Eluma.Employer.openDetail(${item.order.id})">Проверить фото</button>
            </div>
          </div>
        `;
      }
      return '';
    }).join('');
  }

  function acceptCounterOffer(orderId) {
    const order = (store.state.orders || []).find(o => o.id === orderId);
    if (!order || !order.counterOffer) return;

    const offerPrice = order.counterOffer.price;
    order.rawPrice = offerPrice;
    order.price = `${offerPrice.toLocaleString('ru-RU')} ₽`;
    order.assignedWorkerId = order.counterOffer.workerId;
    order.status = 'assigned';
    order.step = 1;
    order.counterOffer = null;

    store.save('counter_accepted');
    UI.showFeedbackToast('Встречное предложение принято', `Ставка ${offerPrice.toLocaleString('ru-RU')} ₽ зафиксирована, исполнитель назначен на смену`);
    renderEmployerOrders();
  }

  function declineCounterOffer(orderId) {
    const order = (store.state.orders || []).find(o => o.id === orderId);
    if (!order) return;

    order.counterOffer = null;
    order.status = 'searching';

    store.save('counter_declined');
    UI.showFeedbackToast('Предложение отклонено', 'Смена возвращена в открытый каталог без изменения ставки');
    renderEmployerOrders();
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
    cloned.applications = [];
    cloned.counterOffer = null;
    cloned.proofs = {};
    cloned.step = 1;

    // Резервируем средства под дубликат смены
    const prof = store.getCurrentEmployerProfile();
    const totalEscrow = cloned.totalEscrow || (cloned.rawPrice + Math.round(cloned.rawPrice * 0.07));
    if (prof && prof.escrow) {
      if ((prof.escrow.available || 0) < totalEscrow) {
        prof.escrow.available += totalEscrow; // Авто-депозит для гладкого демо-опыта
      }
      prof.escrow.available -= totalEscrow;
      prof.escrow.reserved = (prof.escrow.reserved || 0) + totalEscrow;
    }

    store.state.orders.unshift(cloned);
    store.save('order_duplicated');
    UI.showFeedbackToast('Смена продублирована', `Создана новая публикация #${newId} с сохранением параметров и адреса`);
    renderEmployerOrders();
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

  function exportEscrowCsv() {
    const orders = store.getEmployerOrders();
    const rows = [
      ['ID смены', 'Название смены', 'Категория', 'Район Самары', 'Время', 'Ставка (₽)', 'Эскроу Резерв (₽)', 'Статус', 'Исполнитель']
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

  function simulateWorkerEvent() {
    const myOrders = store.getEmployerOrders();
    const searchingOrder = myOrders.find(o => o.status === 'searching' && !o.counterOffer);

    if (searchingOrder) {
      // Симулируем встречное предложение от Елены В.
      const counterPrice = Math.round((searchingOrder.rawPrice * 1.15) / 100) * 100;
      searchingOrder.counterOffer = {
        workerId: 2,
        price: counterPrice,
        comment: 'Готова выйти через 30 минут, свой спецкостюм и сан-книжка в наличии.'
      };
      searchingOrder.status = 'applied';
      store.save('simulated_counter');
      UI.showFeedbackToast('Новый отклик!', `Елена В. предложила встречную ставку ${counterPrice.toLocaleString('ru-RU')} ₽ по смене «${searchingOrder.title}»`);
      renderEmployerOrders();
      scrollToQueue();
      return;
    }

    const assignedOrder = myOrders.find(o => o.status === 'assigned' || o.status === 'on_site');
    if (assignedOrder) {
      // Симулируем сдачу фотоотчёта
      assignedOrder.status = 'in_review';
      assignedOrder.step = 3;
      if (!assignedOrder.proofs) assignedOrder.proofs = {};
      assignedOrder.proofs.before = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80';
      assignedOrder.proofs.after = 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=600&q=80';
      store.save('simulated_review');
      UI.showFeedbackToast('Смена сдана!', `Исполнитель загрузил фотоотчёт по смене «${assignedOrder.title}». Проверьте качество.`);
      renderEmployerOrders();
      scrollToQueue();
      return;
    }

    // Если нет подходящих смен, дублируем первую и создаем отклик
    if (myOrders.length > 0) {
      duplicateOrder(myOrders[0].id);
      setTimeout(() => simulateWorkerEvent(), 100);
    }
  }

  function scrollToQueue() {
    const card = document.getElementById('employerActionQueueCard');
    if (card) {
      card.scrollIntoView({ behavior: 'smooth' });
      card.classList.add('highlight-pulse');
      setTimeout(() => card.classList.remove('highlight-pulse'), 1800);
    }
  }

  // --------------------------------------------------------------------------
  // ЭКРАН: ЧАТЫ (CHATS)
  // --------------------------------------------------------------------------

  function renderEmployerChats() {
    const container = document.getElementById('empChatsList');
    if (!container) return;

    const myOrders = store.getEmployerOrders();
    if (myOrders.length === 0) {
      container.innerHTML = `<div class="empty-feed-card"><p>У вас пока нет активных диалогов</p></div>`;
      return;
    }

    container.innerHTML = myOrders.map(order => {
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

    if (window.innerWidth >= 768) {
      const targetId = empState.activeChatOrderId || (myOrders[0] ? myOrders[0].id : null);
      if (targetId) {
        openChatDialog(targetId, true);
      }
    }
  }

  function openChatDialog(orderId, silent = false) {
    empState.activeChatOrderId = orderId;
    const isDesktop = window.innerWidth >= 768;
    if (!isDesktop && !silent) {
      openDetail(orderId, true);
      return;
    }

    document.querySelectorAll('#empChatsList .chat-dialog-card').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-order-id') == orderId);
    });

    const emptyEl = document.getElementById('empChatEmptySelection');
    const panelEl = document.getElementById('empChatDialogPanel');
    if (emptyEl) emptyEl.style.display = 'none';
    if (panelEl) {
      panelEl.style.display = 'flex';
      panelEl.className = 'chat-dialog-panel';
      const order = (store.state.orders || []).find(o => o.id === orderId);
      if (!order) return;
      panelEl.innerHTML = `
        <div class="chat-dialog-header" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border-subtle);">
          <div class="chat-header-info">
            <strong style="display:block;font-size:0.95rem;">${UI.escapeHtml(order.title)}</strong>
            <span style="font-size:0.8rem;color:var(--text-muted);">${order.assignedWorkerId ? 'Исполнитель назначен' : 'Ищем исполнителя'} • Заказ #${order.id}</span>
          </div>
          <button type="button" class="btn btn-secondary-outline" style="padding:6px 12px;font-size:0.8rem;" onclick="window.Eluma.Employer.openDetail(${order.id})">Карточка смены</button>
        </div>
        <div class="order-chat-messages" id="empSplitChatMessages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;"></div>
        <div class="quick-reply-row" style="padding:6px 12px;">
          <button type="button" class="quick-reply-chip" onclick="window.Eluma.Employer.sendQuickChat('Ждём вас на точке, вход с торца', ${order.id})">Ждём на точке</button>
          <button type="button" class="quick-reply-chip" onclick="window.Eluma.Employer.sendQuickChat('Подтвердите прибытие через GPS', ${order.id})">Подтвердите GPS</button>
          <button type="button" class="quick-reply-chip" onclick="window.Eluma.Employer.sendQuickChat('Загрузите фотоотчёт ДО и ПОСЛЕ', ${order.id})">Загрузите фотоотчёт</button>
        </div>
        <form class="chat-input-row" onsubmit="window.Eluma.Employer.handleSendSplitChat(event, ${order.id})">
          <input type="text" id="empSplitChatInput" placeholder="Напишите сообщение..." autocomplete="off">
          <button type="submit" class="btn btn-primary-cta" style="padding:8px 16px;">Отправить</button>
        </form>
      `;
      renderSplitChatMessages(orderId);
    }
  }

  function renderSplitChatMessages(orderId) {
    const container = document.getElementById('empSplitChatMessages');
    if (!container) return;
    const msgs = (store.state.chats && store.state.chats[orderId]) || [];
    if (msgs.length === 0) {
      container.innerHTML = `<div class="chat-empty-state"><span>Диалог пуст. Напишите первое сообщение.</span></div>`;
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

  // --------------------------------------------------------------------------
  // ЭКРАН: ПРОФИЛЬ КОМПАНИИ (PROFILE)
  // --------------------------------------------------------------------------

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

  function cancelOrder(orderId) {
    const order = store.state.orders.find(o => o.id === orderId);
    if (!order) return;
    const prof = store.getCurrentEmployerProfile();
    const totalEscrow = order.totalEscrow || (order.rawPrice + Math.round(order.rawPrice * 0.07));

    // Проверка наличия GPS-чек-ина исполнителя на точке (защита исполнителя от срыва и увода мимо кассы)
    const hasGps = (order.proofs && (order.proofs.gpsChecked || order.proofs.coords)) || order.status === 'on_site' || order.status === 'in_progress' || order.step >= 2;

    if (hasGps && order.assignedWorkerId) {
      const wid = order.assignedWorkerId;
      const workerProf = store.state.workerProfiles[wid];
      if (workerProf && workerProf.wallet) {
        workerProf.wallet.available = (workerProf.wallet.available || 0) + 400;
      }
      const refund = Math.max(0, totalEscrow - 400);
      if (prof && prof.escrow) {
        prof.escrow.reserved = Math.max(0, (prof.escrow.reserved || 0) - totalEscrow);
        prof.escrow.available = (prof.escrow.available || 0) + refund;
      }
      const receiptNum = 84300 + Math.floor(Math.random() * 500);
      if (!store.state.payouts) store.state.payouts = [];
      store.state.payouts.unshift({
        id: Date.now(),
        orderId: order.id,
        workerId: wid,
        title: 'Компенсация 400 ₽ за отмену заказа после GPS-чек-ина на точке',
        date: 'Сегодня • Компенсация Т-Банк СБП',
        amount: 400,
        receiptNum: receiptNum,
        fnsStatus: 'Компенсация за ложный вызов'
      });
      store.addChatMessage(order.id, 'system', 'Компенсация 400 ₽ за отмену заказа после GPS-чек-ина на точке начислена исполнителю.');
      order.status = 'cancelled';
      store.save('order_cancelled_with_penalty');
      UI.showFeedbackToast('Заказ отменён со штрафом', 'Удержана компенсация 400 ₽ в пользу исполнителя, прибывшего на точку');
    } else {
      if (prof && prof.escrow && (order.status === 'searching' || order.status === 'assigned' || order.status === 'draft')) {
        prof.escrow.reserved = Math.max(0, (prof.escrow.reserved || 0) - totalEscrow);
        prof.escrow.available = (prof.escrow.available || 0) + totalEscrow;
      }
      order.status = 'cancelled';
      store.addChatMessage(order.id, 'system', 'Заказ отменён заказчиком. Средства возвращены на эскроу-счёт.');
      store.save('order_cancelled');
      UI.showFeedbackToast('Заказ отменён', 'Средства возвращены на свободный баланс эскроу');
    }
    renderEmployerOrders();
    renderEmployerBalance();
    if (empState.currentDetailOrderId === orderId) {
      renderOrderDetail(orderId);
    }
  }

  // --------------------------------------------------------------------------
  // ИНИЦИАЛИЗАЦИЯ
  // --------------------------------------------------------------------------

  function initEmployerApp() {
    UI.applyTheme();
    store.subscribe(() => {
      renderCurrentScreen();
    });
    const initialScreen = store.getTabScreen('employer', 'home');
    showScreen(initialScreen);
  }

  window.Eluma.Employer = {
    init: initEmployerApp,
    navigate: showScreen,
    setStatusFilter,
    setSearchQuery: (q) => {
      empState.searchQuery = q || '';
      renderEmployerOrders();
    },
    openDetail,
    openChatDialog,
    handleSendSplitChat,
    getCurrentDetailOrderId: () => empState.currentDetailOrderId,
    acceptWork,
    cancelOrder,
    openReworkModal,
    submitReworkReason,
    openReviewModal,
    submitReview,
    resolveCounterOffer,
    handleCreateOrderSubmit,
    updateCreateEscrowCalc,
    handleSendChat: handleSendEmployerChat,
    sendQuickChat: sendQuickEmployerChat,
    topUpBalance,
    topUpEscrow,
    exportEscrowCsv,
    duplicateOrder,
    acceptCounterOffer,
    declineCounterOffer,
    simulateWorkerEvent,
    scrollToQueue,
    renderActionQueue,
    openTransparencyModal: () => {
      UI.openModal('transparencyModal');
    },
    openEditModal: (orderId) => {
      const order = store.state.orders.find(o => o.id === orderId);
      if (!order) return;
      empState.editingOrderId = orderId;
      const titleInput = document.getElementById('editTaskTitle');
      const priceInput = document.getElementById('editTaskPrice');
      if (titleInput) titleInput.value = order.title;
      if (priceInput) priceInput.value = order.rawPrice;
      UI.openModal('editTaskModal');
    },
    saveEditedOrder: (e) => {
      if (e && e.preventDefault) e.preventDefault();
      const order = store.state.orders.find(o => o.id === empState.editingOrderId);
      if (!order) return;
      const titleInput = document.getElementById('editTaskTitle');
      const priceInput = document.getElementById('editTaskPrice');
      const prof = store.getCurrentEmployerProfile();

      if (titleInput && titleInput.value.trim()) {
        order.title = titleInput.value.trim();
      }

      if (priceInput && priceInput.value) {
        const newPrice = parseInt(priceInput.value, 10);
        const oldTotalEscrow = order.totalEscrow || (order.rawPrice + Math.round(order.rawPrice * 0.07));
        const newServiceFee = Math.round(newPrice * 0.07);
        const newTotalEscrow = newPrice + newServiceFee + (order.sosFee || 0);
        const diff = newTotalEscrow - oldTotalEscrow;

        if (diff > 0) {
          if (prof && prof.escrow && (prof.escrow.available || 0) < diff) {
            UI.showFeedbackToast('Недостаточно средств', `Для повышения цены требуется ещё ${diff.toLocaleString('ru-RU')} ₽ на эскроу.`);
            return;
          }
          if (prof && prof.escrow) {
            prof.escrow.available -= diff;
            prof.escrow.reserved = (prof.escrow.reserved || 0) + diff;
          }
        } else if (diff < 0) {
          const refund = Math.abs(diff);
          if (prof && prof.escrow) {
            prof.escrow.reserved = Math.max(0, (prof.escrow.reserved || 0) - refund);
            prof.escrow.available = (prof.escrow.available || 0) + refund;
          }
        }

        order.rawPrice = newPrice;
        order.price = `${newPrice.toLocaleString('ru-RU')} ₽`;
        order.serviceFee = newServiceFee;
        order.totalEscrow = newTotalEscrow;
      }

      store.save('order_edited');
      UI.closeModal('editTaskModal');
      UI.showFeedbackToast('Изменения сохранены', 'Параметры смены и эскроу-резерв пересчитаны');
      renderEmployerOrders();
      renderEmployerBalance();
    },
    togglePublish: (orderId) => {
      const order = store.state.orders.find(o => o.id === orderId);
      if (!order) return;
      if (order.status === 'cancelled') {
        const prof = store.getCurrentEmployerProfile();
        const totalEscrow = order.totalEscrow || (order.rawPrice + Math.round(order.rawPrice * 0.07));
        if (prof && prof.escrow) {
          if ((prof.escrow.available || 0) < totalEscrow) {
            UI.showFeedbackToast('Недостаточно средств', 'Пополните баланс эскроу для повторной публикации смены');
            return;
          }
          prof.escrow.available -= totalEscrow;
          prof.escrow.reserved = (prof.escrow.reserved || 0) + totalEscrow;
        }
        order.status = 'searching';
        store.save('publish_toggled');
        UI.showFeedbackToast('Заказ опубликован', 'Смена возвращена в поиск исполнителя');
        renderEmployerOrders();
        renderEmployerBalance();
      } else {
        cancelOrder(orderId);
      }
    },
    deleteOrder: (orderId) => {
      if (!confirm('Вы действительно хотите удалить этот заказ?')) return;
      const idx = store.state.orders.findIndex(o => o.id === orderId);
      if (idx !== -1) {
        const order = store.state.orders[idx];
        const prof = store.getCurrentEmployerProfile();
        const totalEscrow = order.totalEscrow || (order.rawPrice + Math.round(order.rawPrice * 0.07));

        if (order.status === 'searching' || order.status === 'unpublished') {
          if (prof && prof.escrow) {
            prof.escrow.reserved = Math.max(0, (prof.escrow.reserved || 0) - totalEscrow);
            prof.escrow.available = (prof.escrow.available || 0) + totalEscrow;
          }
        }

        store.state.orders.splice(idx, 1);
        store.save('order_deleted');
        UI.showFeedbackToast('Заказ удалён', 'Смена удалена, зарезервированные средства возвращены');
        renderEmployerOrders();
        renderEmployerBalance();
      }
    }
  };

  window.Eluma.Employer = window.Eluma.Employer;

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initEmployerApp);
  }
})();
