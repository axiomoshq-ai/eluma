/**
 * Eluma v15 Production-Grade — core/ui.js
 * Общие UI-компоненты: тосты с иконками, интерактивные модальные окна, безопасное экранирование, статус-бейджи и SVG-иконки
 */

(function () {
  'use strict';

  window.Eluma = window.Eluma || {};
  window.Olksi = window.Eluma;

  // 1. Безопасное экранирование HTML (с защитой от бага escapeHtml(0))
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // 2. 100% Векторные SVG-иконки (ZERO EMOJI)
  const SVG_ICONS = {
    star: '<svg width="14" height="14" viewBox="0 0 24 24" fill="#D97706" stroke="#D97706" stroke-width="2" style="display:inline-block;vertical-align:-2px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    starOutline: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2" style="display:inline-block;vertical-align:-2px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px"><polyline points="20 6 9 17 4 12"/></svg>',
    camera: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    bolt: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    flame: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c1.38 0 3-1 3-3.5 0-2-1.5-3-2-4.5-.5 1.5-1.5 2.5-2.5 3.5-.5.5-1 1.2-1 2z"/><path d="M12 2c1 3 4 5 4 9a6 6 0 1 1-12 0c0-4 3-7 5-9 1 1.5 1.5 2.5 2 3.5.5-1.5 1-2.5 1-3.5z"/></svg>',
    clock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    radar: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px"><circle cx="12" cy="12" r="3"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49m12.73-4.24a12 12 0 0 1 0 16.97M3.51 20.49a12 12 0 0 1 0-16.97"/></svg>',
    pin: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    shield: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    chevronRight: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px"><polyline points="9 18 15 12 9 6"/></svg>',
    play: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display:inline-block;vertical-align:-2px"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    edit: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    book: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    user: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    logout: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };

  // 3. Рендерер бейджа статуса из единого словаря
  function renderStatusBadge(statusKey) {
    const sMap = (window.Eluma && window.Eluma.STATUS_MAP) || (window.Olksi && window.Olksi.STATUS_MAP) || {};
    const item = Object.values(sMap).find(s => s.key === statusKey) || { label: statusKey, badgeClass: 'badge-status-pill badge-neutral' };
    return `<span class="${item.badgeClass}">${escapeHtml(item.label)}</span>`;
  }

  // 4. Уведомления (Toasts с векторными иконками и акцентами)
  let toastTimer = null;
  function showFeedbackToast(title, msg, type = 'info') {
    const toast = document.getElementById('feedbackToast');
    const tTitle = document.getElementById('toastTitle');
    const tMsg = document.getElementById('toastMsg');
    const tIcon = document.getElementById('toastIcon');
    if (!toast) return;

    if (tTitle) tTitle.textContent = title;
    if (tMsg) tMsg.textContent = msg;

    if (tIcon) {
      if (type === 'success') tIcon.innerHTML = SVG_ICONS.check;
      else if (type === 'error') tIcon.innerHTML = SVG_ICONS.close;
      else if (type === 'warning') tIcon.innerHTML = SVG_ICONS.clock;
      else tIcon.innerHTML = SVG_ICONS.info;
    }

    toast.className = 'feedback-toast active toast-' + type;

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('active');
    }, 3800);
  }

  // 5. Модальные окна
  function openModal(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    el.classList.add('active');
    document.body.classList.add('modal-open');
  }

  function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    el.classList.remove('active');
    if (!document.querySelector('.modal-backdrop.active')) {
      document.body.classList.remove('modal-open');
    }
  }

  function handleBackdropClick(e) {
    if (e.target && e.target.classList.contains('modal-backdrop')) {
      e.target.classList.remove('active');
      if (!document.querySelector('.modal-backdrop.active')) {
        document.body.classList.remove('modal-open');
      }
    }
  }

  // 6. Управление темой (Светлая / Тёмная)
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('eluma_theme', next);
      localStorage.setItem('olksi_theme', next);
    } catch (_) {}
  }

  function applyTheme() {
    try {
      const saved = localStorage.getItem('eluma_theme') || localStorage.getItem('olksi_theme');
      if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
      }
    } catch (_) {}
  }

  // 7. Интерактивный компонент 5 звёзд для отзывов
  let selectedReviewStars = 5;
  function selectReviewStars(val) {
    selectedReviewStars = parseInt(val, 10) || 5;
    const container = document.getElementById('empReviewStarsPicker');
    if (!container) return;

    const stars = container.querySelectorAll('.star-picker-btn');
    stars.forEach((btn, idx) => {
      const starVal = idx + 1;
      const isFilled = starVal <= selectedReviewStars;
      btn.classList.toggle('active', isFilled);
      btn.classList.toggle('filled', isFilled);
      btn.innerHTML = isFilled ? SVG_ICONS.star : SVG_ICONS.starOutline;
    });

    const hiddenInput = document.getElementById('empReviewStarsValue') || document.getElementById('reviewStarsValueInput');
    if (hiddenInput) hiddenInput.value = selectedReviewStars;
  }

  function getSelectedReviewStars() {
    return selectedReviewStars;
  }

  // 8. Демо-аккаунты для переключения профилей (Синхронизировано с seed.js Самары)
  const DEMO_ACCOUNTS = [
    { id: 1, role: 'worker', name: 'Алексей К.', sub: 'Исполнитель · 12 смен', rating: '4.96', initials: 'АК' },
    { id: 2, role: 'worker', name: 'Дмитрий М.', sub: 'Исполнитель · 1 смена', rating: '4.70', initials: 'ДМ' },
    { id: 101, role: 'employer', name: 'ООО «СтройСамара Логистика»', sub: 'Заказчик · Склад и логистика', rating: '4.98', initials: 'СЛ' },
    { id: 102, role: 'employer', name: 'Елена В.', sub: 'Частный заказчик · Дом и переезд', rating: '4.98', initials: 'ЕВ' },
    { id: 103, role: 'employer', name: 'Сеть ПВЗ «Самара Маркет»', sub: 'Заказчик · Ритейл и ПВЗ', rating: '4.99', initials: 'СМ' }
  ];

  function openAccountSwitcherModal() {
    const listEl = document.getElementById('accountSwitcherModalList');
    const store = (window.Eluma && window.Eluma.store) || (window.Olksi && window.Olksi.store);
    const currentUser = store && store.state && store.state.currentUser ? store.state.currentUser : null;
    const currentId = currentUser ? currentUser.id : null;

    if (listEl) {
      listEl.innerHTML = DEMO_ACCOUNTS.map(acc => {
        const isActive = acc.id === currentId || (currentId === null && acc.id === 1);
        return `
          <button type="button" class="account-switcher-row ${isActive ? 'active' : ''}" onclick="window.Eluma.UI.handleSelectDemoAccount(${acc.id}, '${acc.role}')">
            <div class="acc-row-avatar">${escapeHtml(acc.initials)}</div>
            <div class="acc-row-info">
              <div class="acc-row-title-line">
                <strong class="acc-row-name">${escapeHtml(acc.name)}</strong>
              </div>
              <span class="acc-row-sub">${escapeHtml(acc.sub)} · ${SVG_ICONS.star} ${escapeHtml(acc.rating)}</span>
            </div>
            ${isActive ? '<span class="acc-row-active-tag">Текущий</span>' : '<span class="acc-row-action-link">Войти</span>'}
          </button>
        `;
      }).join('');
    }
    openModal('accountSwitcherModal');
  }

  function handleSelectDemoAccount(userId, role) {
    const store = (window.Eluma && window.Eluma.store) || (window.Olksi && window.Olksi.store);
    if (store && typeof store.switchProfile === 'function') {
      store.switchProfile(userId, role);
    }
    closeModal('accountSwitcherModal');
    const targetFile = role === 'employer' ? 'employer.html' : 'worker.html';
    const currentPath = window.location.pathname;
    if (!currentPath.endsWith(targetFile)) {
      window.location.href = targetFile;
    } else {
      window.location.reload();
    }
  }

  // 9. Модалка платёжного поручения СБП (Банк России / НСПК)
  function openSbpVoucherModal(item) {
    const data = item || {};
    const modal = document.getElementById('sbpVoucherModal');
    if (!modal) return;

    const numEl = document.getElementById('sbpVoucherNumber');
    const dateEl = document.getElementById('sbpVoucherDate');
    const bankEl = document.getElementById('sbpVoucherBank');
    const amountEl = document.getElementById('sbpVoucherAmount');
    const recipientEl = document.getElementById('sbpVoucherRecipient');
    const opIdEl = document.getElementById('sbpVoucherOpId');

    const amountNum = typeof data.amount === 'number' ? data.amount : parseInt(String(data.amount || '0').replace(/\D/g, ''), 10) || 14850;
    const dateStr = data.date || new Date().toLocaleDateString('ru-RU');
    const opId = data.operationId || 'SBP-63-SAM-' + Math.floor(100000 + Math.random() * 900000);
    const store = (window.Eluma && window.Eluma.store) || (window.Olksi && window.Olksi.store);
    const user = store && store.state && store.state.currentUser ? store.state.currentUser : null;
    const workerName = user && user.name ? user.name : 'Алексей К.';
    const bankName = (store && store.state && store.state.workerPayoutBank) || 'Т-Банк (Тинькофф)';

    if (numEl) numEl.textContent = 'Распоряжение СБП #' + opId;
    if (dateEl) dateEl.textContent = dateStr;
    if (bankEl) bankEl.textContent = bankName;
    if (amountEl) amountEl.textContent = amountNum.toLocaleString('ru-RU') + ' ₽';
    if (recipientEl) recipientEl.textContent = workerName + ' (самозанятый, НПД)';
    if (opIdEl) opIdEl.textContent = opId;

    openModal('sbpVoucherModal');
  }

  // 9b. Генератор детальных интерьерно-архитектурных иллюстраций объектов смен (Zero-Network, 100% Offline)
  function getOrderPhotoUrl(order) {
    if (!order) return '';
    if (order.customPhotoUrl && typeof order.customPhotoUrl === 'string' && order.customPhotoUrl.trim()) {
      return order.customPhotoUrl;
    }

    const cat = order.category || 'Склад/Ритейл';
    const id = Number(order.id) || 1;
    let badgeText = 'Складской терминал';
    let sceneSvg = '';

    if (cat === 'Склад/Ритейл') {
      const isAlt = id % 2 === 0;
      badgeText = isAlt ? 'Зона ТСД и сборки' : 'Складской терминал';
      sceneSvg = `
        <defs>
          <linearGradient id="whBg_${id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1E232B"/>
            <stop offset="60%" stop-color="#282F3B"/>
            <stop offset="100%" stop-color="#14181F"/>
          </linearGradient>
          <linearGradient id="whFloor_${id}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#343C49"/>
            <stop offset="100%" stop-color="#1B2027"/>
          </linearGradient>
          <radialGradient id="whLight_${id}" cx="50%" cy="15%" r="65%">
            <stop offset="0%" stop-color="#FFE8B5" stop-opacity="0.32"/>
            <stop offset="100%" stop-color="#FFE8B5" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="whRack_${id}" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#D97706"/>
            <stop offset="100%" stop-color="#B45309"/>
          </linearGradient>
          <linearGradient id="whBox_${id}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#D49A6A"/>
            <stop offset="100%" stop-color="#9C6B43"/>
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#whBg_${id})"/>
        <polygon points="0,170 400,170 400,300 0,300" fill="url(#whFloor_${id})"/>
        <line x1="0" y1="230" x2="400" y2="230" stroke="#FBBF24" stroke-dasharray="14,10" stroke-width="2.5" stroke-opacity="0.6"/>
        <line x1="120" y1="170" x2="60" y2="300" stroke="#FBBF24" stroke-dasharray="10,8" stroke-width="2" stroke-opacity="0.5"/>
        <line x1="280" y1="170" x2="340" y2="300" stroke="#FBBF24" stroke-dasharray="10,8" stroke-width="2" stroke-opacity="0.5"/>
        <polygon points="160,0 240,0 360,260 40,260" fill="url(#whLight_${id})"/>
        <rect x="0" y="10" width="400" height="14" fill="#14181F"/>
        <line x1="200" y1="24" x2="200" y2="46" stroke="#94A3B8" stroke-width="1.5"/>
        <polygon points="186,46 214,46 222,58 178,58" fill="#E2E8F0"/>
        <rect x="30" y="60" width="10" height="200" fill="url(#whRack_${id})"/>
        <rect x="130" y="60" width="10" height="200" fill="url(#whRack_${id})"/>
        <line x1="30" y1="105" x2="140" y2="105" stroke="#94A3B8" stroke-width="4"/>
        <line x1="30" y1="155" x2="140" y2="155" stroke="#94A3B8" stroke-width="4"/>
        <line x1="30" y1="205" x2="140" y2="205" stroke="#94A3B8" stroke-width="4"/>
        <rect x="44" y="78" width="38" height="26" rx="2" fill="url(#whBox_${id})"/>
        <rect x="86" y="74" width="40" height="30" rx="2" fill="#E2E8F0" fill-opacity="0.88"/>
        <rect x="44" y="128" width="42" height="26" rx="2" fill="url(#whBox_${id})"/>
        <rect x="90" y="124" width="36" height="30" rx="2" fill="url(#whBox_${id})"/>
        <polygon points="210,235 295,215 375,235 290,260" fill="#92400E"/>
        <rect x="235" y="170" width="115" height="60" rx="4" fill="#3B82F6" fill-opacity="0.85"/>
        <line x1="235" y1="190" x2="350" y2="190" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="1.5"/>
        <line x1="235" y1="210" x2="350" y2="210" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="1.5"/>
        <line x1="290" y1="170" x2="290" y2="230" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="1.5"/>
        <rect x="250" y="180" width="28" height="18" rx="2" fill="#FFFFFF"/>
        <line x1="254" y1="185" x2="274" y2="185" stroke="#1E293B" stroke-width="1.5"/>
        <line x1="254" y1="189" x2="270" y2="189" stroke="#1E293B" stroke-width="1.5"/>
        <line x1="254" y1="193" x2="272" y2="193" stroke="#1E293B" stroke-width="1.5"/>
      `;
    } else if (cat === 'ПВЗ') {
      badgeText = 'Пункт выдачи заказов';
      sceneSvg = `
        <defs>
          <linearGradient id="pvzBg_${id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#F1F5F9"/>
            <stop offset="60%" stop-color="#E2E8F0"/>
            <stop offset="100%" stop-color="#CBD5E1"/>
          </linearGradient>
          <linearGradient id="pvzFloor_${id}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#E2E8F0"/>
            <stop offset="100%" stop-color="#CBD5E1"/>
          </linearGradient>
          <linearGradient id="pvzDesk_${id}" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#1E293B"/>
            <stop offset="100%" stop-color="#334155"/>
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#pvzBg_${id})"/>
        <polygon points="0,175 400,175 400,300 0,300" fill="url(#pvzFloor_${id})"/>
        <line x1="0" y1="175" x2="400" y2="175" stroke="#94A3B8" stroke-width="1.5"/>
        <rect x="70" y="18" width="100" height="5" rx="2" fill="#FFFFFF" opacity="0.95"/>
        <rect x="230" y="18" width="100" height="5" rx="2" fill="#FFFFFF" opacity="0.95"/>
        <rect x="35" y="55" width="200" height="120" rx="4" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
        <line x1="35" y1="95" x2="235" y2="95" stroke="#CBD5E1" stroke-width="1.5"/>
        <line x1="35" y1="135" x2="235" y2="135" stroke="#CBD5E1" stroke-width="1.5"/>
        <line x1="100" y1="55" x2="100" y2="175" stroke="#CBD5E1" stroke-width="1.5"/>
        <line x1="170" y1="55" x2="170" y2="175" stroke="#CBD5E1" stroke-width="1.5"/>
        <rect x="42" y="65" width="24" height="28" rx="2" fill="#D4A373"/>
        <rect x="70" y="70" width="26" height="23" rx="2" fill="#C69263"/>
        <rect x="106" y="62" width="30" height="31" rx="2" fill="#E2D9C8"/>
        <rect x="140" y="68" width="25" height="25" rx="2" fill="#475569"/>
        <rect x="44" y="104" width="48" height="28" rx="2" fill="#64748B"/>
        <rect x="105" y="102" width="28" height="30" rx="2" fill="#D4A373"/>
        <rect x="138" y="106" width="27" height="26" rx="2" fill="#C69263"/>
        <rect x="260" y="50" width="105" height="125" rx="3" fill="#F8FAFC" stroke="#94A3B8" stroke-width="1.5"/>
        <path d="M268,54 Q278,90 274,170 L308,170 Q305,90 312,54 Z" fill="#64748B" fill-opacity="0.85"/>
        <circle cx="338" cy="80" r="14" fill="#E2E8F0" stroke="#94A3B8" stroke-width="1.5"/>
        <polygon points="120,210 380,210 360,290 80,290" fill="url(#pvzDesk_${id})"/>
        <rect x="150" y="172" width="55" height="36" rx="3" fill="#0F172A" stroke="#475569" stroke-width="1.5"/>
        <rect x="154" y="176" width="47" height="28" rx="1" fill="#38BDF8" fill-opacity="0.8"/>
        <path d="M230,195 L242,185 L248,190 L238,202 Z" fill="#F59E0B"/>
        <rect x="238" y="200" width="4" height="12" fill="#475569"/>
        <ellipse cx="240" cy="212" rx="10" ry="3" fill="#334155"/>
      `;
    } else if (cat === 'Физическая помощь') {
      badgeText = 'Квартира · Переезд';
      sceneSvg = `
        <defs>
          <linearGradient id="aptBg_${id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#FEF3C7" stop-opacity="0.4"/>
            <stop offset="60%" stop-color="#F3F4F6"/>
            <stop offset="100%" stop-color="#E5E7EB"/>
          </linearGradient>
          <linearGradient id="aptFloor_${id}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#D97706" stop-opacity="0.75"/>
            <stop offset="100%" stop-color="#92400E" stop-opacity="0.9"/>
          </linearGradient>
          <linearGradient id="aptWindow_${id}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#BAE6FD"/>
            <stop offset="100%" stop-color="#E0F2FE"/>
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#aptBg_${id})"/>
        <polygon points="0,170 400,170 400,300 0,300" fill="url(#aptFloor_${id})"/>
        <line x1="0" y1="170" x2="400" y2="170" stroke="#78350F" stroke-width="1.5"/>
        <line x1="100" y1="170" x2="50" y2="300" stroke="#78350F" stroke-width="1"/>
        <line x1="200" y1="170" x2="180" y2="300" stroke="#78350F" stroke-width="1"/>
        <line x1="300" y1="170" x2="310" y2="300" stroke="#78350F" stroke-width="1"/>
        <rect x="35" y="40" width="110" height="115" rx="3" fill="url(#aptWindow_${id})" stroke="#CBD5E1" stroke-width="2"/>
        <line x1="90" y1="40" x2="90" y2="155" stroke="#FFFFFF" stroke-width="2.5"/>
        <line x1="35" y1="95" x2="145" y2="95" stroke="#FFFFFF" stroke-width="2.5"/>
        <rect x="180" y="70" width="75" height="145" rx="3" fill="#475569" stroke="#334155" stroke-width="2"/>
        <rect x="178" y="115" width="79" height="8" fill="#FBBF24"/>
        <rect x="178" y="165" width="79" height="8" fill="#FBBF24"/>
        <rect x="210" y="113" width="12" height="12" rx="2" fill="#1F2937"/>
        <rect x="275" y="135" width="75" height="60" rx="3" fill="#C28854" stroke="#9A6233" stroke-width="1.5"/>
        <line x1="275" y1="165" x2="350" y2="165" stroke="#78350F" stroke-dasharray="6,4" stroke-width="1.5"/>
        <rect x="285" y="85" width="60" height="50" rx="3" fill="#D49A6A" stroke="#9A6233" stroke-width="1.5"/>
        <line x1="285" y1="110" x2="345" y2="110" stroke="#78350F" stroke-dasharray="5,3" stroke-width="1.5"/>
        <polyline points="295,100 295,92 292,94 295,92 298,94" stroke="#78350F" stroke-width="1.5" fill="none"/>
        <polyline points="302,100 302,92 299,94 302,92 305,94" stroke="#78350F" stroke-width="1.5" fill="none"/>
        <circle cx="160" cy="245" r="14" fill="#1F2937" stroke="#94A3B8" stroke-width="2"/>
        <circle cx="160" cy="245" r="5" fill="#E2E8F0"/>
        <line x1="160" y1="245" x2="140" y2="190" stroke="#EF4444" stroke-width="4" stroke-linecap="round"/>
      `;
    } else if (cat === 'Мелкий ремонт') {
      badgeText = 'Бытовой монтаж';
      sceneSvg = `
        <defs>
          <linearGradient id="repBg_${id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1E293B"/>
            <stop offset="60%" stop-color="#334155"/>
            <stop offset="100%" stop-color="#0F172A"/>
          </linearGradient>
          <linearGradient id="repBench_${id}" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#78350F"/>
            <stop offset="100%" stop-color="#B45309"/>
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#repBg_${id})"/>
        <rect x="30" y="45" width="115" height="95" rx="3" fill="#0284C7" fill-opacity="0.88" stroke="#38BDF8" stroke-width="1.5"/>
        <line x1="45" y1="65" x2="130" y2="65" stroke="#FFFFFF" stroke-opacity="0.7" stroke-width="1.5"/>
        <line x1="45" y1="85" x2="110" y2="85" stroke="#FFFFFF" stroke-opacity="0.7" stroke-width="1.5"/>
        <line x1="45" y1="105" x2="125" y2="105" stroke="#FFFFFF" stroke-opacity="0.7" stroke-width="1.5"/>
        <circle cx="95" cy="85" r="14" fill="none" stroke="#FFFFFF" stroke-opacity="0.7" stroke-width="1.5"/>
        <polygon points="0,175 400,175 400,300 0,300" fill="url(#repBench_${id})"/>
        <line x1="0" y1="175" x2="400" y2="175" stroke="#451A03" stroke-width="2"/>
        <path d="M245,130 L285,130 L290,145 L265,150 L260,195 L242,195 L245,150 Z" fill="#D94E28"/>
        <rect x="285" y="133" width="22" height="6" fill="#94A3B8"/>
        <rect x="238" y="195" width="30" height="15" rx="2" fill="#0F172A"/>
        <rect x="90" y="160" width="105" height="65" rx="4" fill="#0F172A" stroke="#D94E28" stroke-width="2"/>
        <rect x="125" y="152" width="35" height="8" rx="2" fill="#475569"/>
        <rect x="90" y="188" width="105" height="6" fill="#D94E28"/>
        <circle cx="108" cy="182" r="3" fill="#FBBF24"/>
        <circle cx="178" cy="182" r="3" fill="#FBBF24"/>
        <rect x="150" y="245" width="160" height="16" rx="3" fill="#F59E0B" stroke="#D97706" stroke-width="1.5"/>
        <circle cx="230" cy="253" r="5" fill="#22C55E"/>
        <circle cx="230" cy="253" r="2" fill="#FFFFFF"/>
        <rect x="315" y="195" width="60" height="40" rx="3" fill="#334155" stroke="#64748B" stroke-width="1.5"/>
        <circle cx="330" cy="210" r="3" fill="#CBD5E1"/>
        <circle cx="345" cy="210" r="3" fill="#CBD5E1"/>
        <circle cx="360" cy="210" r="3" fill="#CBD5E1"/>
        <circle cx="330" cy="225" r="3" fill="#CBD5E1"/>
        <circle cx="345" cy="225" r="3" fill="#CBD5E1"/>
      `;
    } else if (cat === 'Помощь на участке') {
      badgeText = 'Загородный участок';
      sceneSvg = `
        <defs>
          <linearGradient id="yardSky_${id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#BAE6FD"/>
            <stop offset="60%" stop-color="#FEF3C7"/>
            <stop offset="100%" stop-color="#FED7AA"/>
          </linearGradient>
          <linearGradient id="yardGrass_${id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#22C55E"/>
            <stop offset="100%" stop-color="#15803D"/>
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#yardSky_${id})"/>
        <polygon points="40,150 55,90 70,150" fill="#064E3B"/>
        <polygon points="50,150 65,75 80,150" fill="#047857"/>
        <polygon points="70,150 85,95 100,150" fill="#064E3B"/>
        <polygon points="105,150 120,85 135,150" fill="#047857"/>
        <rect x="220" y="85" width="135" height="75" fill="#78350F" rx="2"/>
        <polygon points="210,85 287,35 365,85" fill="#991B1B"/>
        <rect x="245" y="105" width="30" height="30" rx="2" fill="#FEF08A" stroke="#78350F" stroke-width="2"/>
        <line x1="260" y1="105" x2="260" y2="135" stroke="#78350F" stroke-width="1.5"/>
        <line x1="245" y1="120" x2="275" y2="120" stroke="#78350F" stroke-width="1.5"/>
        <rect x="300" y="110" width="28" height="50" rx="2" fill="#451A03"/>
        <polygon points="0,150 400,150 400,300 0,300" fill="url(#yardGrass_${id})"/>
        <path d="M140,150 Q160,220 110,300 L180,300 Q210,220 180,150 Z" fill="#CBD5E1" stroke="#94A3B8" stroke-width="1.5"/>
        <circle cx="105" cy="245" r="12" fill="#1F2937" stroke="#64748B" stroke-width="2"/>
        <polygon points="75,205 135,205 125,235 85,235" fill="#DC2626"/>
        <line x1="60" y1="195" x2="90" y2="215" stroke="#475569" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="120" y1="230" x2="105" y2="245" stroke="#475569" stroke-width="3"/>
        <line x1="210" y1="210" x2="245" y2="280" stroke="#D97706" stroke-width="3"/>
        <polyline points="238,272 250,282 240,285" fill="none" stroke="#475569" stroke-width="2.5"/>
      `;
    } else {
      badgeText = 'Городская доставка';
      sceneSvg = `
        <defs>
          <linearGradient id="crSky_${id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0F172A"/>
            <stop offset="60%" stop-color="#1E293B"/>
            <stop offset="100%" stop-color="#334155"/>
          </linearGradient>
          <linearGradient id="crRoad_${id}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#1E293B"/>
            <stop offset="100%" stop-color="#0F172A"/>
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#crSky_${id})"/>
        <rect x="40" y="90" width="45" height="90" fill="#1E293B"/>
        <rect x="70" y="60" width="55" height="120" fill="#0F172A"/>
        <rect x="140" y="80" width="60" height="100" fill="#1E293B"/>
        <rect x="220" y="100" width="50" height="80" fill="#0F172A"/>
        <rect x="290" y="70" width="70" height="110" fill="#1E293B"/>
        <rect x="80" y="75" width="6" height="8" rx="1" fill="#FEF08A"/>
        <rect x="95" y="75" width="6" height="8" rx="1" fill="#FEF08A"/>
        <rect x="80" y="95" width="6" height="8" rx="1" fill="#FEF08A"/>
        <rect x="155" y="95" width="6" height="8" rx="1" fill="#38BDF8"/>
        <rect x="175" y="95" width="6" height="8" rx="1" fill="#FEF08A"/>
        <rect x="310" y="85" width="6" height="8" rx="1" fill="#FEF08A"/>
        <rect x="330" y="85" width="6" height="8" rx="1" fill="#FEF08A"/>
        <polygon points="0,170 400,170 400,300 0,300" fill="url(#crRoad_${id})"/>
        <path d="M40,240 Q160,180 230,220 T360,190" fill="none" stroke="#38BDF8" stroke-width="4" stroke-linecap="round" stroke-dasharray="8,6"/>
        <circle cx="360" cy="190" r="8" fill="#D94E28" stroke="#FFFFFF" stroke-width="2"/>
        <circle cx="40" cy="240" r="6" fill="#38BDF8" stroke="#FFFFFF" stroke-width="2"/>
        <rect x="170" y="155" width="85" height="85" rx="6" fill="#F97316" stroke="#C2410C" stroke-width="2"/>
        <rect x="178" y="165" width="69" height="35" rx="3" fill="#EA580C"/>
        <line x1="170" y1="210" x2="255" y2="210" stroke="#FFFFFF" stroke-width="4"/>
        <line x1="170" y1="225" x2="255" y2="225" stroke="#FFFFFF" stroke-width="4"/>
        <rect x="195" y="172" width="35" height="18" rx="2" fill="#FFFFFF" fill-opacity="0.9"/>
        <line x1="202" y1="181" x2="223" y2="181" stroke="#C2410C" stroke-width="2"/>
      `;
    }

    const fullSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
        ${sceneSvg}
      </svg>
    `.trim();

    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(fullSvg);
  }

  // 10. Командная строка / Command Palette (Ctrl+K / Cmd+K)
  let commandPaletteItems = [];
  let selectedCommandIndex = 0;

  function initCommandPalette() {
    const isWorker = document.getElementById('workerTasksList') !== null;
    commandPaletteItems = [
      { id: 'home', title: isWorker ? 'Смены в Самаре (Лента)' : 'Мои заказы (Лента)', shortcut: '1', action: () => { if (isWorker && window.Eluma.Worker) window.Eluma.Worker.navigate('home'); else if (window.Eluma.Employer) window.Eluma.Employer.navigate('home'); } },
      { id: 'chats', title: 'Чаты и сообщения', shortcut: '2', action: () => { if (isWorker && window.Eluma.Worker) window.Eluma.Worker.navigate('chats'); else if (window.Eluma.Employer) window.Eluma.Employer.navigate('chats'); } },
      { id: 'finances', title: isWorker ? 'Выплаты и доход (СБП)' : 'Баланс и эскроу', shortcut: '3', action: () => { if (isWorker && window.Eluma.Worker) window.Eluma.Worker.navigate('payouts'); else if (window.Eluma.Employer) window.Eluma.Employer.navigate('balance'); } },
      { id: 'profile', title: isWorker ? 'Обучение и профиль (Допуски)' : 'Профиль компании', shortcut: '4', action: () => { if (isWorker && window.Eluma.Worker) window.Eluma.Worker.navigate('profile'); else if (window.Eluma.Employer) window.Eluma.Employer.navigate('profile'); } }
    ];

    if (isWorker) {
      commandPaletteItems.push(
        { id: 'my', title: 'Мои активные смены', shortcut: 'M', action: () => { if (window.Eluma.Worker) window.Eluma.Worker.navigate('my'); } },
        { id: 'npd', title: 'Налоговый кабинет НПД и банк СБП', shortcut: 'N', action: () => { openModal('npdTaxCabinetModal'); } },
        { id: 'hub_alab', title: 'Гео-радар: ст.м. Алабинская (1.5 км)', shortcut: 'H1', action: () => { if (window.Eluma.Worker) { window.Eluma.Worker.setRadarHub('alabinskaya'); window.Eluma.Worker.setRadarRadius(1.5); } } },
        { id: 'hub_cosmo', title: 'Гео-радар: ТРК Космопорт (3 км)', shortcut: 'H2', action: () => { if (window.Eluma.Worker) { window.Eluma.Worker.setRadarHub('cosmoport'); window.Eluma.Worker.setRadarRadius(3); } } }
      );
    } else {
      commandPaletteItems.push(
        { id: 'create', title: 'Создать новую смену (Публикация)', shortcut: 'C', action: () => { if (window.Eluma.Employer) window.Eluma.Employer.navigate('create'); } },
        { id: 'topup', title: 'Пополнить депозит эскроу (+10 000 ₽)', shortcut: 'T', action: () => { if (window.Eluma.Employer) window.Eluma.Employer.topUpEscrow(10000); } },
        { id: 'csv', title: 'Выгрузить реестр смен в CSV', shortcut: 'E', action: () => { if (window.Eluma.Employer) window.Eluma.Employer.exportEscrowCsv(); } }
      );
    }

    commandPaletteItems.push(
      { id: 'theme', title: 'Переключить тему оформления (Светлая / Темная)', shortcut: 'T', action: () => { toggleTheme(); } },
      { id: 'switch_acc', title: 'Сменить демо-аккаунт платформы...', shortcut: 'A', action: () => { openAccountSwitcherModal(); } }
    );

    // Global Key Listener for Ctrl+K / Cmd+K
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        openCommandPalette();
      } else if (e.key === 'Escape') {
        const pal = document.getElementById('globalCommandPaletteModal');
        if (pal && pal.classList.contains('active')) {
          closeCommandPalette();
        }
      }
    });
  }

  function openCommandPalette() {
    const modal = document.getElementById('globalCommandPaletteModal');
    if (!modal) return;
    openModal('globalCommandPaletteModal');
    selectedCommandIndex = 0;
    const input = document.getElementById('commandPaletteInput');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 50);
    }
    renderCommandPaletteResults('');
  }

  function closeCommandPalette() {
    closeModal('globalCommandPaletteModal');
  }

  function onCommandPaletteInput(query) {
    selectedCommandIndex = 0;
    renderCommandPaletteResults(query);
  }

  function renderCommandPaletteResults(query) {
    const container = document.getElementById('commandPaletteResults');
    if (!container) return;

    const q = (query || '').toLowerCase().trim();
    const filtered = commandPaletteItems.filter(item => {
      if (!q) return true;
      return item.title.toLowerCase().includes(q) || item.shortcut.toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      container.innerHTML = '<div class="palette-empty-note">Действий не найдено</div>';
      return;
    }

    container.innerHTML = filtered.map((item, idx) => {
      const isSelected = idx === selectedCommandIndex;
      return `
        <div class="palette-item-row ${isSelected ? 'selected' : ''}" onclick="window.Eluma.UI.executeCommandByIndex(${idx})">
          <div class="palette-item-main">
            <span class="palette-item-title">${escapeHtml(item.title)}</span>
          </div>
          <span class="palette-item-badge">${escapeHtml(item.shortcut)}</span>
        </div>
      `;
    }).join('');
  }

  function executeCommandByIndex(idx) {
    const input = document.getElementById('commandPaletteInput');
    const q = input ? input.value.toLowerCase().trim() : '';
    const filtered = commandPaletteItems.filter(item => {
      if (!q) return true;
      return item.title.toLowerCase().includes(q) || item.shortcut.toLowerCase().includes(q);
    });

    const target = filtered[idx];
    if (target && typeof target.action === 'function') {
      closeCommandPalette();
      target.action();
    }
  }

  function onCommandPaletteKeydown(e) {
    const input = document.getElementById('commandPaletteInput');
    const q = input ? input.value.toLowerCase().trim() : '';
    const filtered = commandPaletteItems.filter(item => {
      if (!q) return true;
      return item.title.toLowerCase().includes(q) || item.shortcut.toLowerCase().includes(q);
    });

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedCommandIndex = (selectedCommandIndex + 1) % Math.max(1, filtered.length);
      renderCommandPaletteResults(q);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedCommandIndex = (selectedCommandIndex - 1 + filtered.length) % Math.max(1, filtered.length);
      renderCommandPaletteResults(q);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeCommandByIndex(selectedCommandIndex);
    }
  }

  // Auto-init command palette on DOM ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initCommandPalette);
    } else {
      initCommandPalette();
    }
  }

  const UI = {
    escapeHtml,
    SVG_ICONS,
    renderStatusBadge,
    getOrderPhotoUrl,
    showFeedbackToast,
    openModal,
    closeModal,
    handleBackdropClick,
    toggleTheme,
    applyTheme,
    selectReviewStars,
    getSelectedReviewStars,
    openAccountSwitcherModal,
    handleSelectDemoAccount,
    openSbpVoucherModal,
    openCommandPalette,
    closeCommandPalette,
    onCommandPaletteInput,
    onCommandPaletteKeydown,
    executeCommandByIndex
  };

  window.Eluma.UI = UI;
  window.Olksi.UI = UI;
})();
