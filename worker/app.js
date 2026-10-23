/**
 * Eluma v15 — worker/app.js
 * Клиентская логика кабинета исполнителя (смены, записи, выплаты, профиль, курсы допуска и плеер)
 */

(function () {
  'use strict';

  window.Eluma = window.Eluma || {};
  window.Olksi = window.Eluma;

  const store = window.Eluma.store || window.Olksi.store;
  const UI = window.Eluma.UI || window.Eluma.UI;
  const Courses = window.Eluma.Courses || window.Olksi.Courses;

  // Состояние контроллера исполнителя
  const workerState = {
    currentScreen: 'home', // home, my, payouts, chats, profile, detail, course_player
    selectedCategory: 'all',
    searchQuery: '',
    hotSlotsOnly: false,
    selectedDistrict: 'all',
    currentDetailOrderId: null,
    currentCoOpOrderId: null,
    selectedFriendIdForBooking: null,
    myTab: 'active', // active | archive
    activeCourseId: null,
    returnTo: null, // { orderId, action }
    courseLessonIdx: 0,
    courseQuizAnswers: {},
    courseQuizFinished: false,
    samaraMap: null,
    mapMarkers: [],
    radarHub: 'alabinskaya',
    radarRadius: 'all',
    radarCircle: null,
    sortBy: 'distance',
    minPrice: 0,
    maxPrice: 0,
    hourlyRateGroup: 0,
    dayGroup: 'all',
    durationGroup: 'all',
    powerFilters: {
      onlyEligible: false,
      today: false,
      tomorrow: false,
      minHourlyRate: false,
      onlyNegotiable: false,
      multiSlots: false,
      friendsInShift: false,
      onlyBusiness: false
    }
  };

  // --------------------------------------------------------------------------
  // НАВИГАЦИЯ И ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ
  // --------------------------------------------------------------------------

  function showScreen(screenId) {
    workerState.currentScreen = screenId;
    store.setTabScreen('worker', screenId);
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('scr-wrk-' + screenId);
    if (target) target.classList.add('active');

    // Обновляем навигацию
    document.querySelectorAll('.d-nav-item, .m-nav-item').forEach(item => {
      const scr = item.getAttribute('data-screen');
      item.classList.toggle('active', scr === screenId);
    });

    // Обновляем заголовок шапки
    const titles = {
      home: 'Смены в Самаре',
      my: 'Мои записи',
      payouts: 'Мой доход и выплаты',
      chats: 'Сообщения по сменам',
      friends: 'Друзья и напарники',
      profile: 'Профиль самозанятого',
      detail: 'Детали смены',
      course_player: 'Курс допуска к сменам'
    };
    const titleEl = document.getElementById('headerScreenTitle');
    if (titleEl) titleEl.textContent = titles[screenId] || 'Кабинет исполнителя';

    window.scrollTo({ top: 0, behavior: 'instant' });
    renderCurrentScreen();
  }

  function renderCurrentScreen() {
    switch (workerState.currentScreen) {
      case 'home':
        renderHomeFeed();
        initSamaraMap();
        break;
      case 'my':
        renderMyOrders();
        break;
      case 'payouts':
        renderPayouts();
        break;
      case 'chats':
        renderChats();
        break;
      case 'friends':
        renderFriendsScreen();
        break;
      case 'profile':
        renderProfile();
        break;
      case 'detail':
        if (workerState.currentDetailOrderId) {
          renderOrderDetail(workerState.currentDetailOrderId);
        }
        break;
      case 'course_player':
        renderCoursePlayer();
        break;
    }
    updateSidebarWallet();
  }

  function updateSidebarWallet() {
    const prof = store.getCurrentWorkerProfile();
    const balEl = document.getElementById('sidebarWorkerBalance');
    if (balEl && prof && prof.wallet) {
      balEl.textContent = `${prof.wallet.available.toLocaleString('ru-RU')} ₽`;
    }
  }

  // --------------------------------------------------------------------------
  // ЭКРАН: ЛЕНТА СМЕН (HOME)
  // --------------------------------------------------------------------------

  function getActiveFilterObj() {
    let dayFilter = null;
    if (workerState.dayGroup === 'today' || workerState.powerFilters.today) {
      dayFilter = 'today';
    } else if (workerState.dayGroup === 'tomorrow' || workerState.powerFilters.tomorrow) {
      dayFilter = 'tomorrow';
    }

    const minHourlyRate = workerState.hourlyRateGroup || (workerState.powerFilters.minHourlyRate ? 850 : 0);

    return {
      category: workerState.selectedCategory,
      query: workerState.searchQuery,
      hotOnly: workerState.hotSlotsOnly,
      maxRadiusKm: workerState.radarRadius === 'all' ? 99 : parseFloat(workerState.radarRadius),
      onlyEligible: !!workerState.powerFilters.onlyEligible,
      dayFilter: dayFilter,
      minHourlyRate: minHourlyRate,
      onlyNegotiable: !!workerState.powerFilters.onlyNegotiable,
      multiSlots: !!workerState.powerFilters.multiSlots,
      friendsInShift: !!workerState.powerFilters.friendsInShift,
      minPrice: workerState.minPrice || 0,
      maxPrice: workerState.maxPrice || 0,
      durationGroup: workerState.durationGroup || 'all',
      onlyBusiness: !!workerState.powerFilters.onlyBusiness,
      sortBy: workerState.sortBy,
      hubId: workerState.radarHub
    };
  }

  function renderHomeFeed() {
    const container = document.getElementById('workerTasksList');
    if (!container) return;

    // Подсчёт и обновление живых счётчиков рубрик в сайдбаре маркетплейса
    const activeFilters = getActiveFilterObj();
    if (typeof store.getCategoryCounts === 'function') {
      const counts = store.getCategoryCounts(activeFilters);
      document.querySelectorAll('.mp-cat-count').forEach(el => {
        const catKey = el.getAttribute('data-cat');
        if (catKey && counts.hasOwnProperty(catKey)) {
          el.textContent = counts[catKey];
        }
      });
    }

    // Синхронизация визуального активного класса на кнопках категорий
    const currentCat = workerState.selectedCategory;
    document.querySelectorAll('.cat-chip, .category-chip, .category-pill, .mp-cat-btn').forEach(btn => {
      const labelEl = btn.querySelector('.mp-cat-label');
      const text = (labelEl ? labelEl.textContent : btn.textContent).trim();
      const isActive = (currentCat === 'all' && (text.includes('Все') || text === 'all')) || text === currentCat;
      btn.classList.toggle('active', isActive);
    });

    // Синхронизация активных состояний сегментных кнопок и чекбоксов
    document.querySelectorAll('#rateFilterRow .mp-segment-btn').forEach(btn => {
      const r = Number(btn.getAttribute('data-rate')) || 0;
      btn.classList.toggle('active', r === workerState.hourlyRateGroup);
    });
    document.querySelectorAll('#dayFilterRow .mp-segment-btn').forEach(btn => {
      const d = btn.getAttribute('data-day') || 'all';
      btn.classList.toggle('active', d === workerState.dayGroup);
    });
    document.querySelectorAll('#durationFilterRow .mp-segment-btn').forEach(btn => {
      const d = btn.getAttribute('data-dur') || 'all';
      btn.classList.toggle('active', d === workerState.durationGroup);
    });

    const chkEligible = document.getElementById('chkOnlyEligible');
    if (chkEligible) chkEligible.checked = Boolean(workerState.powerFilters.onlyEligible);
    const chkNegotiable = document.getElementById('chkOnlyNegotiable');
    if (chkNegotiable) chkNegotiable.checked = Boolean(workerState.powerFilters.onlyNegotiable);
    const chkMulti = document.getElementById('chkMultiSlots');
    if (chkMulti) chkMulti.checked = Boolean(workerState.powerFilters.multiSlots);
    const chkFriends = document.getElementById('chkFriendsInShift');
    if (chkFriends) chkFriends.checked = Boolean(workerState.powerFilters.friendsInShift);
    const chkBusiness = document.getElementById('chkOnlyBusiness');
    if (chkBusiness) chkBusiness.checked = Boolean(workerState.powerFilters.onlyBusiness);

    const filterObj = activeFilters;
    const orders = store.getDiscoveryOrders(filterObj);

    const countEl = document.getElementById('discoveryCount');
    if (countEl) countEl.textContent = `${orders.length}`;

    // Подсчёт сводки и средней ставки в час
    const summaryEl = document.getElementById('workerFilterSummaryLine');
    if (summaryEl) {
      if (orders.length > 0) {
        let totalRates = 0;
        orders.forEach(o => {
          const h = o.hours || 3;
          const p = o.rawPrice || parseInt(String(o.price).replace(/\D/g, ''), 10) || 2400;
          totalRates += Math.round(p / h);
        });
        const avgRate = Math.round(totalRates / orders.length);
        const hubs = store.getSamaraHubs();
        const hubMeta = hubs[workerState.radarHub] || { name: 'Алабинская' };
        const radiusText = workerState.radarRadius === 'all' ? 'по всей Самаре' : `в радиусе ${workerState.radarRadius} км от ${hubMeta.name}`;
        summaryEl.innerHTML = `<span>Найдено <strong>${orders.length}</strong> смен ${radiusText} • Средняя ставка <strong>${avgRate} ₽/час</strong></span>`;
      } else {
        summaryEl.innerHTML = `<span>По вашим фильтрам смен не найдено. Попробуйте расширить радиус поиска.</span>`;
      }
    }

    // Обновляем бейдж активной смены в шапке
    updateHeaderActiveShift();

    // Обновляем плашку профиля в сайдбаре
    updateSidebarUserPod();

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="empty-feed-card">
          <div class="empty-feed-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <p class="empty-feed-title">В выбранном радиусе и фильтрах сейчас нет смен</p>
          <span class="empty-feed-desc">Попробуйте увеличить радиус радара или сбросить фильтры</span>
          <button class="btn btn-secondary-outline" onclick="window.Eluma.Worker.resetFilters()">Показать все смены</button>
        </div>
      `;
      renderSamaraMapMarkers();
      return;
    }

    container.innerHTML = orders.map(order => renderOrderCardHtml(order)).join('');
    renderNearestWidget();
    renderSamaraMapMarkers();
  }

  function updateHeaderActiveShift() {
    const badge = document.getElementById('headerActiveShiftBadge');
    if (!badge) return;
    const activeOrders = store.getWorkerActiveOrders();
    if (activeOrders.length > 0) {
      const current = activeOrders[0];
      badge.style.display = 'inline-flex';
      badge.innerHTML = `
        <span class="active-shift-dot"></span>
        <span class="active-shift-text">В работе: <strong>${UI.escapeHtml(current.title)}</strong> (${UI.escapeHtml(current.time)})</span>
      `;
    } else {
      badge.style.display = 'none';
    }
  }

  function openCurrentActiveShift() {
    const activeOrders = store.getWorkerActiveOrders();
    if (activeOrders.length > 0) {
      openDetail(activeOrders[0].id);
    }
  }

  function updateSidebarUserPod() {
    const user = store.state.currentUser || store.getUser(store.state.currentUserId || 1);
    const avEl = document.getElementById('sidebarWorkerAvatar');
    const nameEl = document.getElementById('sidebarWorkerName');
    const badgeEl = document.getElementById('sidebarWorkerTierBadge');
    const ratingEl = document.getElementById('sidebarWorkerRating');

    if (user) {
      if (avEl) avEl.textContent = user.avatarText || getCustomerInitials(user.name);
      if (nameEl) nameEl.textContent = user.name;
      if (badgeEl) badgeEl.textContent = user.statusTag || 'СМЗ';
      if (ratingEl) ratingEl.innerHTML = `${UI.SVG_ICONS.star} ${user.rating || '4.96'} · 12 смен`;
    }
  }

  function onRadarHubChange(hubId) {
    store.setWorkerRadarHub(hubId);
    workerState.radarHub = hubId;
    const hubs = store.getSamaraHubs();
    const hubCoords = hubs[hubId];
    if (workerState.samaraMap && hubCoords) {
      workerState.samaraMap.panTo([hubCoords.lat, hubCoords.lng]);
    }
    renderHomeFeed();
  }

  function setRadarRadius(radius) {
    workerState.radarRadius = radius;
    document.querySelectorAll('#radarRadiusPills .radar-pill').forEach(btn => {
      const r = btn.getAttribute('data-radius');
      btn.classList.toggle('active', r === String(radius));
    });
    renderHomeFeed();
  }

  function setSortBy(val) {
    workerState.sortBy = val;
    const sortLabels = {
      distance: 'По близости (км)',
      rate: 'По ставке (₽/ч ↓)',
      hourly_desc: 'По ставке (₽/ч ↓)',
      price: 'По выплате (₽ ↓)',
      price_desc: 'По выплате (₽ ↓)',
      urgent: 'Сначала срочные',
      slots: 'Сначала много мест',
      friends: 'Сначала с друзьями'
    };
    const select = document.getElementById('workerSortSelect');
    if (select && select.value !== val) {
      select.value = val;
    }
    const labelEl = document.getElementById('sortCurrentLabel');
    if (labelEl && sortLabels[val]) {
      labelEl.textContent = sortLabels[val];
    }
    document.querySelectorAll('#sortDropdownMenu .sort-dropdown-item').forEach(item => {
      const v = item.getAttribute('data-val');
      item.classList.toggle('active', v === val || (val === 'hourly_desc' && v === 'rate') || (val === 'price_desc' && v === 'price'));
    });
    renderHomeFeed();
  }

  function toggleSortDropdown(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const wrap = document.getElementById('workerSortDropdownWrap');
    const trigger = document.getElementById('sortDropdownTrigger');
    if (!wrap) return;
    const isOpen = wrap.classList.toggle('open');
    if (trigger) trigger.setAttribute('aria-expanded', String(isOpen));
  }

  function closeSortDropdown() {
    const wrap = document.getElementById('workerSortDropdownWrap');
    const trigger = document.getElementById('sortDropdownTrigger');
    if (wrap) wrap.classList.remove('open');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  function selectSortOption(val, label) {
    setSortBy(val);
    closeSortDropdown();
  }

  function clearSearch() {
    workerState.searchQuery = '';
    const inp = document.getElementById('workerSearchInput');
    if (inp) inp.value = '';
    renderHomeFeed();
  }

  function onPriceRangeChange() {
    const minInput = document.getElementById('filterMinPrice') || document.getElementById('filterMinPriceInput');
    const maxInput = document.getElementById('filterMaxPrice') || document.getElementById('filterMaxPriceInput');
    const minVal = minInput && minInput.value ? parseInt(minInput.value, 10) : 0;
    const maxVal = maxInput && maxInput.value ? parseInt(maxInput.value, 10) : 0;
    workerState.minPrice = isNaN(minVal) ? 0 : minVal;
    workerState.maxPrice = isNaN(maxVal) ? 0 : maxVal;
    renderHomeFeed();
  }

  function setRateFilter(rate) {
    workerState.hourlyRateGroup = Number(rate) || 0;
    workerState.powerFilters.minHourlyRate = workerState.hourlyRateGroup > 0;
    document.querySelectorAll('#rateFilterRow .mp-segment-btn').forEach(btn => {
      const r = Number(btn.getAttribute('data-rate')) || 0;
      btn.classList.toggle('active', r === workerState.hourlyRateGroup);
    });
    renderHomeFeed();
  }

  function setDurationFilter(dur) {
    workerState.durationGroup = dur || 'all';
    document.querySelectorAll('#durationFilterRow .mp-segment-btn').forEach(btn => {
      const d = btn.getAttribute('data-dur') || 'all';
      btn.classList.toggle('active', d === workerState.durationGroup);
    });
    renderHomeFeed();
  }

  function setDayFilter(day) {
    workerState.dayGroup = day || 'all';
    workerState.powerFilters.today = (day === 'today');
    workerState.powerFilters.tomorrow = (day === 'tomorrow');
    document.querySelectorAll('#dayFilterRow .mp-segment-btn').forEach(btn => {
      const d = btn.getAttribute('data-day') || 'all';
      btn.classList.toggle('active', d === workerState.dayGroup);
    });
    renderHomeFeed();
  }

  function toggleFilterChip(filterKey) {
    if (filterKey === 'today') {
      workerState.powerFilters.today = !workerState.powerFilters.today;
      if (workerState.powerFilters.today) {
        workerState.powerFilters.tomorrow = false;
        workerState.dayGroup = 'today';
      } else {
        workerState.dayGroup = 'all';
      }
    } else if (filterKey === 'tomorrow') {
      workerState.powerFilters.tomorrow = !workerState.powerFilters.tomorrow;
      if (workerState.powerFilters.tomorrow) {
        workerState.powerFilters.today = false;
        workerState.dayGroup = 'tomorrow';
      } else {
        workerState.dayGroup = 'all';
      }
    } else {
      workerState.powerFilters[filterKey] = !workerState.powerFilters[filterKey];
    }

    const checkMap = {
      onlyEligible: 'chkOnlyEligible',
      onlyNegotiable: 'chkOnlyNegotiable',
      multiSlots: 'chkMultiSlots',
      friendsInShift: 'chkFriendsInShift',
      onlyBusiness: 'chkOnlyBusiness'
    };
    if (checkMap[filterKey]) {
      const chk = document.getElementById(checkMap[filterKey]);
      if (chk) chk.checked = Boolean(workerState.powerFilters[filterKey]);
    }

    document.querySelectorAll('#dayFilterRow .mp-segment-btn').forEach(btn => {
      const d = btn.getAttribute('data-day') || 'all';
      btn.classList.toggle('active', d === workerState.dayGroup);
    });

    const chipMap = {
      onlyEligible: 'filterChipEligible',
      today: 'filterChipToday',
      tomorrow: 'filterChipTomorrow',
      minHourlyRate: 'filterChipMinRate',
      onlyNegotiable: 'filterChipNegotiable',
      multiSlots: 'filterChipMultiSlots',
      friendsInShift: 'filterChipFriendsInShift'
    };
    if (chipMap[filterKey]) {
      const btn = document.getElementById(chipMap[filterKey]);
      if (btn) btn.classList.toggle('active', Boolean(workerState.powerFilters[filterKey]));
    }

    renderHomeFeed();
  }

  function resetFilters() {
    workerState.selectedCategory = 'all';
    workerState.searchQuery = '';
    workerState.hotSlotsOnly = false;
    workerState.radarRadius = 'all';
    workerState.radarHub = 'alabinskaya';
    store.setWorkerRadarHub('alabinskaya');
    workerState.minPrice = 0;
    workerState.maxPrice = 0;
    workerState.hourlyRateGroup = 0;
    workerState.dayGroup = 'all';
    workerState.durationGroup = 'all';
    workerState.sortBy = 'distance';
    const sortLabel = document.getElementById('sortCurrentLabel');
    if (sortLabel) sortLabel.textContent = 'По близости (км)';
    document.querySelectorAll('#sortDropdownMenu .sort-dropdown-item').forEach((item, idx) => {
      item.classList.toggle('active', idx === 0);
    });
    const sortSelect = document.getElementById('workerSortSelect');
    if (sortSelect) sortSelect.value = 'distance';
    workerState.powerFilters = {
      onlyEligible: false,
      today: false,
      tomorrow: false,
      minHourlyRate: false,
      onlyNegotiable: false,
      multiSlots: false,
      friendsInShift: false,
      onlyBusiness: false
    };

    const searchInput = document.getElementById('workerSearchInput');
    if (searchInput) searchInput.value = '';

    ['filterMinPrice', 'filterMinPriceInput', 'filterMaxPrice', 'filterMaxPriceInput'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    const hubSelect = document.getElementById('workerRadarHubSelect');
    if (hubSelect) hubSelect.value = 'alabinskaya';

    ['chkOnlyEligible', 'chkOnlyNegotiable', 'chkMultiSlots', 'chkFriendsInShift', 'chkOnlyBusiness'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = false;
    });

    document.querySelectorAll('#radarRadiusPills .radar-pill').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-radius') === 'all');
    });

    document.querySelectorAll('#rateFilterRow .mp-segment-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-rate') === '0');
    });

    document.querySelectorAll('#dayFilterRow .mp-segment-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-day') === 'all');
    });

    document.querySelectorAll('#durationFilterRow .mp-segment-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-dur') === 'all');
    });

    document.querySelectorAll('.cat-chip, .category-chip, .category-pill, .mp-cat-btn').forEach((b, idx) => {
      b.classList.toggle('active', idx === 0);
    });

    document.querySelectorAll('.power-filter-chip').forEach(b => b.classList.remove('active'));

    const hubs = store.getSamaraHubs();
    const hubCoords = hubs.alabinskaya;
    if (workerState.samaraMap && hubCoords) {
      workerState.samaraMap.panTo([hubCoords.lat, hubCoords.lng]);
    }

    renderHomeFeed();
  }

  function getCustomerInitials(name) {
    if (!name) return 'EL';
    const clean = name.replace(/«|»|"|ООО|ИП|Сеть\s+ПВЗ\s+и\s+Ритейл/gi, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase() || 'EL';
  }

  function renderOrderCardHtml(order) {
    const check = store.canWorkerTakeOrder(store.state.currentUserId, order);
    const isApplied = order.assignedWorkerId === store.state.currentUserId;
    const isBiz = order.orderType === 'business';
    const hours = order.hours || 3;
    const rawPrice = order.rawPrice || parseInt(String(order.price).replace(/\D/g, ''), 10) || 2400;
    const hourlyRate = Math.round(rawPrice / hours);
    const distKm = store.getOrderDistanceForWorker(order, workerState.radarHub);
    const timeConflict = !isApplied ? store.getTimeConflictOrder(store.state.currentUserId, order) : null;

    const slotMeta = store.getOrderSlotsMeta(order, store.state.currentUserId);
    const totalSlots = slotMeta.total;
    const filledSlots = slotMeta.filled;
    const leftSlots = slotMeta.left;
    const assignedFriends = slotMeta.assignedFriends || [];

    // Визуальная шкала слотов бригады (если больше 1 слота)
    let slotsRowHtml = '';
    if (totalSlots > 1) {
      let scaleBarsHtml = '';
      for (let i = 0; i < totalSlots; i++) {
        const isFilled = i < filledSlots;
        scaleBarsHtml += `<span class="slot-bar-pip ${isFilled ? 'filled' : 'empty'}"></span>`;
      }

      let friendBadgeHtml = '';
      if (assignedFriends.length > 0) {
        const friendNames = assignedFriends.map(f => f.name).join(', ');
        friendBadgeHtml = `
          <span class="unit-friend-badge" title="Ваш напарник уже записан на эту смену">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>${UI.escapeHtml(friendNames)} в смене</span>
          </span>
        `;
      }

      const slotsStatusText = leftSlots > 0 ? `Свободно ${leftSlots} из ${totalSlots} мест` : 'Все места заняты';

      slotsRowHtml = `
        <div class="unit-slots-row">
          <div class="unit-slots-scale" title="${slotsStatusText}">
            ${scaleBarsHtml}
          </div>
          <span class="unit-slots-label">${slotsStatusText}</span>
          ${friendBadgeHtml}
        </div>
      `;
    }

    // Перки: максимум 2 реальных условия объекта + СБП без дублирования
    const uniquePerks = (order.perks || []).filter(p => !p.includes('СБП')).slice(0, 2);
    const perksText = ['СБП 15 мин', ...uniquePerks].join(' · ');

    let statusLineHtml = '';
    if (!check.allowed) {
      statusLineHtml = `
        <span class="unit-course-link" onclick="event.stopPropagation(); window.Eluma.Worker.startCourse('${check.requiredCourseId}', { orderId: ${order.id}, action: 'apply' })" title="Пройти короткий курс допуска">
          Пройти курс допуска (3 мин) →
        </span>
      `;
    } else {
      statusLineHtml = `
        <span class="unit-status-meta">Эскроу защищён · Допуск активен · ${UI.escapeHtml(perksText)}</span>
      `;
    }

    return `
      <article class="worker-task-unit ${isApplied ? 'applied' : ''} ${timeConflict ? 'has-conflict' : ''}" id="orderCard_${order.id}" onclick="window.Eluma.Worker.openOrderDrawer(${order.id})" onmouseenter="window.Eluma.Worker.highlightMapMarker(${order.id})" onmouseleave="window.Eluma.Worker.unhighlightMapMarker(${order.id})">
        <!-- Колонка 1: Фото объекта 140x108 -->
        <div class="unit-photo-wrap">
          <img class="unit-photo-img" src="${UI.getOrderPhotoUrl(order)}" alt="${UI.escapeHtml(order.title)}" loading="lazy">
          <span class="unit-photo-dist-badge">${distKm} км</span>
        </div>

        <!-- Колонка 2: Центральный информационный блок -->
        <div class="unit-body-col">
          <div class="customer-meta-line">
            <span class="customer-brand-name">${UI.escapeHtml(order.customerName)}</span>
            <span class="customer-meta-sep">·</span>
            <span class="customer-rating-text">${UI.SVG_ICONS.star} ${UI.escapeHtml(order.customerRating || '4.98')}</span>
            <span class="customer-meta-sep">·</span>
            <span class="customer-tier-text">${isBiz ? 'Бизнес' : 'Частный заказ'}</span>
          </div>

          <h3 class="unit-task-title">${UI.escapeHtml(order.title)}</h3>

          <div class="unit-location-time-line">
            <span>${UI.escapeHtml(order.district)}</span>
            <span class="unit-meta-sep">·</span>
            <span>${UI.escapeHtml(order.time)}</span>
            ${timeConflict ? `
              <span class="unit-meta-sep">·</span>
              <span class="order-conflict-warning-inline">${UI.SVG_ICONS.clock} Конфликт (${UI.escapeHtml(timeConflict.time)})</span>
            ` : ''}
          </div>

          ${slotsRowHtml}

          <div class="unit-status-single-line">
            ${statusLineHtml}
          </div>
        </div>

        <!-- Колонка 3: Правая колонка Цены и Действия (единый вертикальный блок) -->
        <div class="unit-ActionPrice-col" onclick="event.stopPropagation()">
          <div class="unit-payout-box">
            <span class="unit-payout-amount">${UI.escapeHtml(order.price)}</span>
            <span class="unit-payout-rate">${hourlyRate} ₽/ч · ${hours} ч</span>
          </div>

          <div class="unit-actions-box">
            ${order.allowNegotiation && !isApplied ? `
              <button type="button" class="btn-unit-secondary" onclick="window.Eluma.Worker.openCounterOffer(${order.id})">Торг</button>
            ` : ''}
            ${!isApplied && assignedFriends.length > 0 && leftSlots > 0 ? `
              <button type="button" class="btn-unit-coop join-friend" onclick="window.Eluma.Worker.joinFriendShiftDirect(${order.id}, event)" title="Присоединиться к напарнику">К другу</button>
            ` : (!isApplied && totalSlots > 1 && leftSlots >= 2 ? `
              <button type="button" class="btn-unit-coop" onclick="window.Eluma.Worker.openCoOpFriendModal(${order.id}, event)" title="Выйти на смену с напарником">+ С другом</button>
            ` : '')}
            <button type="button" class="btn-unit-apply ${isApplied ? 'applied' : ''}" onclick="window.Eluma.Worker.handleDirectApply(${order.id}, event)">
              ${isApplied ? 'Вы записаны' : 'Взять смену'}
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function handleDirectApply(orderId, event) {
    if (event && event.stopPropagation) event.stopPropagation();
    const order = (store.state.orders || []).find(o => o.id === orderId);
    if (!order) return;
    if (order.assignedWorkerId === store.state.currentUserId) {
      openDetail(orderId);
      return;
    }
    const check = store.canWorkerTakeOrder(store.state.currentUserId, order);
    if (!check.allowed) {
      startCourse(check.requiredCourseId, { orderId, action: 'apply' });
      return;
    }
    handleTakeShift(orderId);
  }

  function renderNearestWidget() {
    const el = document.getElementById('workerNearestBookingWidget');
    if (!el) return;

    const myActive = store.getWorkerActiveOrders();
    if (myActive.length === 0) {
      el.style.display = 'none';
      return;
    }

    const nearest = myActive[0];
    const durationLabel = nearest.orderType === 'private' ? `Задача ${nearest.hours} ч` : `Смена ${nearest.hours} ч`;

    el.style.display = 'block';
    el.innerHTML = `
      <div class="nearest-booking-inner" onclick="window.Eluma.Worker.openDetail(${nearest.id})">
        <div class="nearest-top-head">
          <span class="nearest-lead-badge">${UI.SVG_ICONS.clock} Ближайшая смена</span>
          <span class="nearest-status-chip">${UI.renderStatusBadge(nearest.status)}</span>
        </div>
        <div class="nearest-main-row">
          <div class="nearest-info-left">
            <strong class="nearest-title">${UI.escapeHtml(nearest.title)}</strong>
            <span class="nearest-district">${UI.escapeHtml(nearest.district)} • ${UI.escapeHtml(nearest.time)}</span>
          </div>
          <div class="nearest-rate-right">
            <strong class="nearest-amount">${UI.escapeHtml(nearest.price)}</strong>
            <span class="nearest-hour-rate">${durationLabel}</span>
          </div>
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // КАРТА САМАРЫ С ДЕГРАДАЦИЕЙ БЕЗ СЕТИ
  // --------------------------------------------------------------------------

  function initSamaraMap() {
    const mapContainer = document.getElementById('samaraLeafletMap');
    if (!mapContainer) return;

    // Безопасная инициализация: если Leaflet не загрузился (офлайн), деградируем без падения
    if (typeof L === 'undefined') {
      mapContainer.innerHTML = `
        <div class="offline-map-fallback">
          <div class="offline-map-content">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <strong>Карта районов Самары (Офлайн-режим)</strong>
            <span>Все 18 смен привязаны к геолокациям Самары</span>
            <div class="offline-district-chips">
              <span class="dist-chip active">Октябрьский</span>
              <span class="dist-chip">Ленинский</span>
              <span class="dist-chip">Советский</span>
              <span class="dist-chip">Кировский</span>
              <span class="dist-chip">Промышленный</span>
            </div>
          </div>
        </div>
      `;
      return;
    }

    try {
      if (!workerState.samaraMap) {
        // Полное отключение сторонней атрибуции и префикса Leaflet на уровне ядра библиотеки (0% флагов)
        if (window.L && L.Control && L.Control.Attribution) {
          L.Control.Attribution.prototype.options.prefix = false;
        }

        workerState.samaraMap = L.map('samaraLeafletMap', {
          zoomControl: false,
          attributionControl: false
        }).setView([53.215, 50.185], 12);

        // Надежный глобальный тайловый сервер Esri World Street Map:
        // БЕЗ водяных знаков "API KEY REQUIRED", БЕЗ блокировок 403 и БЕЗ сторонней символики
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 18,
          attribution: ''
        }).addTo(workerState.samaraMap);

        workerState.samaraMap.on('movestart zoomstart', () => {
          hideMapHoverCard(true);
        });
      }

      renderSamaraMapMarkers();
    } catch (e) {
      console.warn('Ошибка инициализации Leaflet:', e);
    }
  }

  function renderSamaraMapMarkers() {
    if (!workerState.samaraMap || typeof L === 'undefined') return;

    // Очищаем старые маркеры
    workerState.mapMarkers.forEach(m => workerState.samaraMap.removeLayer(m));
    workerState.mapMarkers = [];

    // Очищаем/рисуем радарный круг
    if (workerState.radarCircle) {
      workerState.samaraMap.removeLayer(workerState.radarCircle);
      workerState.radarCircle = null;
    }

    const hubs = store.getSamaraHubs();
    const currentHub = hubs[workerState.radarHub] || hubs.alabinskaya;

    if (workerState.radarRadius !== 'all') {
      const radiusMeters = parseFloat(workerState.radarRadius) * 1000;
      workerState.radarCircle = L.circle([currentHub.lat, currentHub.lng], {
        radius: radiusMeters,
        color: '#D94E28',
        weight: 1.5,
        dashArray: '4, 4',
        fillColor: '#D94E28',
        fillOpacity: 0.08
      }).addTo(workerState.samaraMap);
    }

    const filterObj = getActiveFilterObj();
    const orders = store.getDiscoveryOrders(filterObj);

    orders.forEach(o => {
      if (!o.lat || !o.lng) return;
      const icon = L.divIcon({
        className: 'custom-map-pin',
        html: `<div class="map-price-bubble" id="mapPin_${o.id}" onclick="window.Eluma.Worker.openOrderDrawer(${o.id})" onmouseenter="window.Eluma.Worker.showMapHoverCard(${o.id})" onmouseleave="window.Eluma.Worker.scheduleHideMapHoverCard()">${o.price}</div>`,
        iconSize: [60, 30]
      });
      const marker = L.marker([o.lat, o.lng], { icon }).addTo(workerState.samaraMap);
      marker._orderId = o.id;
      workerState.mapMarkers.push(marker);
    });
  }

  function highlightMapMarker(orderId) {
    const el = document.getElementById('mapPin_' + orderId);
    if (el) el.classList.add('pin-highlighted');
  }

  function unhighlightMapMarker(orderId) {
    const el = document.getElementById('mapPin_' + orderId);
    if (el) el.classList.remove('pin-highlighted');
  }

  // --------------------------------------------------------------------------
  // ПАРЯЩАЯ МИНИ-КАРТОЧКА С ФОТО ПРИ НАВЕДЕНИИ НА КАРТЕ (MAP HOVER MINI-CARD)
  // --------------------------------------------------------------------------

  let mapHoverTimeout = null;

  function showMapHoverCard(orderId) {
    if (mapHoverTimeout) {
      clearTimeout(mapHoverTimeout);
      mapHoverTimeout = null;
    }
    const card = document.getElementById('mapHoverPreviewCard');
    if (!card) return;

    const order = (store.state.orders || []).find(o => o.id === orderId);
    if (!order) return;

    highlightMapMarker(orderId);

    const distKm = store.getOrderDistanceForWorker(order, workerState.radarHub);
    const hours = order.hours || 3;
    const rawPrice = order.rawPrice || parseInt(String(order.price).replace(/\D/g, ''), 10) || 2400;
    const hourlyRate = Math.round(rawPrice / hours);
    const isApplied = order.assignedWorkerId === store.state.currentUserId;

    card.innerHTML = `
      <div class="map-hover-photo-wrap">
        <button type="button" class="map-hover-close-btn" onclick="window.Eluma.Worker.hideMapHoverCard(true)" aria-label="Закрыть">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <img class="map-hover-photo-img" src="${UI.getOrderPhotoUrl(order)}" alt="${UI.escapeHtml(order.title)}">
        <span class="map-hover-tag">${distKm} км · ${UI.escapeHtml(order.category)}</span>
      </div>
      <div class="map-hover-content">
        <div class="map-hover-top">
          <span class="map-hover-price">${UI.escapeHtml(order.price)}</span>
          <span class="map-hover-rate">${hourlyRate} ₽/ч · ${hours} ч</span>
        </div>
        <h4 class="map-hover-title" title="${UI.escapeHtml(order.title)}">${UI.escapeHtml(order.title)}</h4>
        <div class="map-hover-meta">
          <span>${UI.escapeHtml(order.district)}</span> · <span>${UI.escapeHtml(order.time)}</span>
        </div>
        <div class="map-hover-actions">
          <button type="button" class="btn-map-hover-more" onclick="window.Eluma.Worker.openOrderDrawer(${order.id})">Подробнее</button>
          <button type="button" class="btn-map-hover-apply" onclick="window.Eluma.Worker.handleDirectApply(${order.id}, event)">${isApplied ? 'Вы записаны' : 'Взять смену'}</button>
        </div>
      </div>
    `;

    // Динамическое умное позиционирование прямо возле точки на карте
    const mapWrapper = card.parentElement;
    if (mapWrapper && (typeof window === 'undefined' || window.innerWidth > 680)) {
      const wrapRect = mapWrapper.getBoundingClientRect();
      const pinEl = document.getElementById('mapPin_' + orderId);

      let pinCenterX = wrapRect.width ? wrapRect.width / 2 : 200;
      let pinTop = 80;
      let pinBottom = 110;

      if (pinEl && wrapRect.width) {
        const pinRect = pinEl.getBoundingClientRect();
        pinCenterX = (pinRect.left + pinRect.right) / 2 - wrapRect.left;
        pinTop = pinRect.top - wrapRect.top;
        pinBottom = pinRect.bottom - wrapRect.top;
      } else if (workerState.samaraMap && order.lat && order.lng) {
        try {
          const pt = workerState.samaraMap.latLngToContainerPoint([order.lat, order.lng]);
          pinCenterX = pt.x;
          pinTop = pt.y - 15;
          pinBottom = pt.y + 15;
        } catch (_) {}
      }

      const cardWidth = card.offsetWidth || 290;
      const cardHeight = card.offsetHeight || 240;

      // Центрируем по горизонтали относительно точки со страховкой от выхода за границы карты
      const minLeft = 10;
      const maxLeft = Math.max(minLeft, (wrapRect.width || 400) - cardWidth - 10);
      let cardLeft = pinCenterX - (cardWidth / 2);
      cardLeft = Math.max(minLeft, Math.min(maxLeft, cardLeft));

      // По вертикали: над пином (зазор 8px), а если близко к верхней границе карты — под пином (зазор 8px)
      const gap = 8;
      let cardTop;
      if (pinTop - gap - cardHeight >= 10) {
        cardTop = pinTop - gap - cardHeight;
      } else {
        cardTop = pinBottom + gap;
        if (wrapRect.height && cardTop + cardHeight > wrapRect.height - 10) {
          cardTop = Math.max(10, wrapRect.height - cardHeight - 10);
        }
      }

      card.style.left = Math.round(cardLeft) + 'px';
      card.style.top = Math.round(cardTop) + 'px';
      card.style.bottom = 'auto';
      card.style.right = 'auto';
    } else {
      card.style.left = '';
      card.style.top = '';
      card.style.bottom = '';
      card.style.right = '';
    }

    card.classList.add('active');
  }

  function scheduleHideMapHoverCard() {
    if (mapHoverTimeout) clearTimeout(mapHoverTimeout);
    mapHoverTimeout = setTimeout(() => {
      hideMapHoverCard(false);
    }, 220);
  }

  function cancelHideMapHoverCard() {
    if (mapHoverTimeout) {
      clearTimeout(mapHoverTimeout);
      mapHoverTimeout = null;
    }
  }

  function hideMapHoverCard(immediate = false) {
    if (mapHoverTimeout) {
      clearTimeout(mapHoverTimeout);
      mapHoverTimeout = null;
    }
    const card = document.getElementById('mapHoverPreviewCard');
    if (card) {
      card.classList.remove('active');
    }
    document.querySelectorAll('.map-price-bubble.pin-highlighted').forEach(el => el.classList.remove('pin-highlighted'));
  }

  // --------------------------------------------------------------------------
  // ЭКРАН: МОИ ЗАПИСИ (MY)
  // --------------------------------------------------------------------------

  function renderMyOrders() {
    const container = document.getElementById('workerMyTasksList');
    if (!container) return;

    const isArchive = workerState.myTab === 'archive';
    const list = isArchive ? store.getWorkerCompletedOrders() : store.getWorkerActiveOrders();

    const activeCount = store.getWorkerActiveOrders().length;
    const archiveCount = store.getWorkerCompletedOrders().length;

    const bActive = document.getElementById('myActiveCountBadge');
    const bArchive = document.getElementById('myArchiveCountBadge');
    if (bActive) bActive.textContent = `${activeCount}`;
    if (bArchive) bArchive.textContent = `${archiveCount}`;

    if (list.length === 0) {
      container.innerHTML = `
        <div class="empty-feed-card">
          <p>${isArchive ? 'Архив завершённых смен пока пуст.' : 'У вас пока нет активных записей. Выберите смену в каталоге!'}</p>
          ${!isArchive ? `<button class="btn btn-primary-cta" onclick="window.Eluma.Worker.navigate('home')">Найти смену</button>` : ''}
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(order => renderOrderCardHtml(order)).join('');
  }

  // --------------------------------------------------------------------------
  // ШТОРКА ПРЕДПРОСМОТРА СМЕНЫ (SLIDE-OVER DRAWER)
  // --------------------------------------------------------------------------

  function openOrderDrawer(orderId) {
    hideMapHoverCard(true);
    const order = (store.state.orders || []).find(o => o.id === orderId);
    if (!order) return;

    workerState.currentDetailOrderId = orderId;
    const drawer = document.getElementById('workerOrderDrawer');
    const backdrop = document.getElementById('workerOrderDrawerBackdrop');
    if (!drawer || !backdrop) {
      openDetail(orderId);
      return;
    }

    const check = store.canWorkerTakeOrder(store.state.currentUserId, order);
    const isApplied = order.assignedWorkerId === store.state.currentUserId;
    const distKm = store.getOrderDistanceForWorker(order, workerState.radarHub);
    const hours = order.hours || 3;
    const rawPrice = order.rawPrice || parseInt(String(order.price).replace(/\D/g, ''), 10) || 2400;
    const hourlyRate = Math.round(rawPrice / hours);
    const conflict = !isApplied ? store.getTimeConflictOrder(store.state.currentUserId, order) : null;

    const catBadge = document.getElementById('drawerCategoryBadge');
    const distBadge = document.getElementById('drawerDistanceBadge');
    const bannerImg = document.getElementById('drawerPhotoImg');
    const titleEl = document.getElementById('drawerOrderTitle');
    const priceEl = document.getElementById('drawerOrderPrice');
    const rateEl = document.getElementById('drawerHourlyRate');
    const timeEl = document.getElementById('drawerOrderTime');
    const addrEl = document.getElementById('drawerOrderAddress');
    const custEl = document.getElementById('drawerOrderCustomer');
    const eligEl = document.getElementById('drawerEligibilityTag');
    const descEl = document.getElementById('drawerOrderDesc');
    const conflictEl = document.getElementById('drawerConflictWarning');
    const takeBtn = document.getElementById('drawerTakeBtn');
    const coopBtn = document.getElementById('drawerCoOpBtn');
    const counterBtn = document.getElementById('drawerCounterBtn');
    const cancelBtn = document.getElementById('drawerCancelShiftBtn');

    const brigadeCard = document.getElementById('drawerBrigadeCard');
    const brigadeBadge = document.getElementById('drawerBrigadeBadge');
    const slotsBar = document.getElementById('drawerSlotsBar');
    const friendsList = document.getElementById('drawerAssignedFriendsList');

    const slotMeta = store.getOrderSlotsMeta(order, store.state.currentUserId);
    if (brigadeCard) {
      if (slotMeta.total > 1) {
        brigadeCard.style.display = 'block';
        if (brigadeBadge) brigadeBadge.textContent = `${slotMeta.filled} из ${slotMeta.total} мест занято`;
        if (slotsBar) {
          let pips = '';
          for (let i = 0; i < slotMeta.total; i++) {
            pips += `<span class="drawer-slot-pip ${i < slotMeta.filled ? 'filled' : 'empty'}"></span>`;
          }
          slotsBar.innerHTML = pips;
        }
        if (friendsList) {
          if (slotMeta.assignedFriends.length > 0) {
            friendsList.innerHTML = slotMeta.assignedFriends.map(f => `
              <div class="drawer-friend-item">
                <span class="friend-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
                <span class="friend-name">${UI.escapeHtml(f.name)} (${UI.escapeHtml(f.roleTag)})</span>
                <span class="friend-status-pill">В смене</span>
              </div>
            `).join('');
          } else {
            friendsList.innerHTML = `<span class="drawer-slots-free-note">Свободно мест для ваших напарников: ${slotMeta.left}</span>`;
          }
        }
      } else {
        brigadeCard.style.display = 'none';
      }
    }

    if (catBadge) catBadge.textContent = order.category || 'Смена';
    if (distBadge) distBadge.textContent = `${distKm} км от вас`;
    if (bannerImg) {
      bannerImg.src = UI.getOrderPhotoUrl(order);
      bannerImg.alt = order.title;
    }
    if (titleEl) titleEl.textContent = order.title;
    if (priceEl) priceEl.textContent = order.price;
    if (rateEl) rateEl.textContent = `${hourlyRate} ₽/час • ${hours} часа`;
    if (timeEl) timeEl.textContent = order.time;
    if (addrEl) addrEl.textContent = `${order.district}, ${order.address || 'Самара'}`;
    if (custEl) custEl.textContent = `${order.customerName} (${order.orderType === 'business' ? 'Бизнес' : 'P2P'})`;

    if (eligEl) {
      if (check.allowed) {
        eligEl.className = 'drawer-eligibility-tag allowed';
        eligEl.textContent = 'Допуск есть (12 мес.)';
      } else {
        eligEl.className = 'drawer-eligibility-tag needed';
        eligEl.textContent = `Требуется курс «${check.courseName || 'Допуск'}»`;
      }
    }

    if (descEl) descEl.textContent = order.comment || 'Особых требований не указано. Прибудьте на точку вовремя.';

    if (conflictEl) {
      if (conflict) {
        conflictEl.style.display = 'block';
        conflictEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> <span>Внимание: смена пересекается по времени с вашей записью «${UI.escapeHtml(conflict.title)}» (${UI.escapeHtml(conflict.time)})</span>`;
      } else {
        conflictEl.style.display = 'none';
      }
    }

    if (takeBtn) {
      if (isApplied) {
        takeBtn.textContent = 'Перейти к смене';
        takeBtn.onclick = () => { closeOrderDrawer(); openDetail(order.id); };
      } else if (!check.allowed) {
        takeBtn.textContent = 'Пройти курс допуска (3 мин)';
        takeBtn.onclick = () => { closeOrderDrawer(); startCourse(check.requiredCourseId, { orderId: order.id, action: 'apply' }); };
      } else {
        takeBtn.textContent = 'Взять смену';
        takeBtn.onclick = () => { closeOrderDrawer(); handleTakeShift(order.id); };
      }
    }

    if (coopBtn) {
      coopBtn.style.display = (!isApplied && slotMeta.total > 1 && slotMeta.left >= 1) ? 'block' : 'none';
      coopBtn.onclick = () => { closeOrderDrawer(); openCoOpFriendModal(order.id); };
    }

    if (counterBtn) {
      counterBtn.style.display = (!isApplied && order.allowNegotiation) ? 'block' : 'none';
      counterBtn.onclick = () => { closeOrderDrawer(); openCounterOffer(order.id); };
    }

    if (cancelBtn) {
      cancelBtn.style.display = isApplied && order.step < 2 ? 'block' : 'none';
      cancelBtn.onclick = () => { cancelMyShift(order.id); };
    }

    drawer.classList.add('active');
    backdrop.classList.add('active');
    drawer.setAttribute('aria-hidden', 'false');
  }

  function closeOrderDrawer() {
    const drawer = document.getElementById('workerOrderDrawer');
    const backdrop = document.getElementById('workerOrderDrawerBackdrop');
    if (drawer) {
      drawer.classList.remove('active');
      drawer.setAttribute('aria-hidden', 'true');
    }
    if (backdrop) backdrop.classList.remove('active');
  }

  function cancelMyShift(orderId) {
    if (!confirm('Вы действительно хотите отказаться от этой смены до прибытия на место?')) return;
    const res = store.cancelOrderByWorker(orderId);
    if (res && res.success) {
      UI.showFeedbackToast('Запись отменена', 'Смена возвращена в открытый каталог без штрафа');
      closeOrderDrawer();
      renderHomeFeed();
      if (workerState.currentScreen === 'my') renderMyOrders();
    }
  }

  // --------------------------------------------------------------------------
  // ЭКРАН: ДЕТАЛИ СМЕНЫ (DETAIL)
  // --------------------------------------------------------------------------

  function openDetail(orderId, scrollToChat = false) {
    workerState.currentDetailOrderId = orderId;
    showScreen('detail');
    if (scrollToChat) {
      setTimeout(() => {
        const box = document.getElementById('wrkOrderChatBox');
        if (box) box.scrollIntoView({ behavior: 'smooth' });
        const input = document.getElementById('wrkChatInput');
        if (input) input.focus();
      }, 150);
    }
  }

  function renderOrderDetail(orderId) {
    const order = (store.state.orders || []).find(o => o.id === orderId);
    if (!order) return;

    workerState.currentDetailOrderId = orderId;

    const check = store.canWorkerTakeOrder(store.state.currentUserId, order);
    const isApplied = order.assignedWorkerId === store.state.currentUserId;

    const titleEl = document.getElementById('wrkDetailTitle');
    const photoImg = document.getElementById('wrkDetailPhotoImg');
    const priceEl = document.getElementById('wrkDetailPrice');
    const badgeTierEl = document.getElementById('wrkDetailPayoutTierBadge');
    const timeEl = document.getElementById('wrkDetailTime');
    const distEl = document.getElementById('wrkDetailDistrict');
    const custEl = document.getElementById('wrkDetailCustomer');
    const descEl = document.getElementById('wrkDetailDesc');
    const badgeEl = document.getElementById('wrkDetailStatusBadge');
    const courseBadgeEl = document.getElementById('wrkDetailBriefingBadgeContainer');

    if (titleEl) titleEl.textContent = order.title;
    if (photoImg) {
      photoImg.src = UI.getOrderPhotoUrl(order);
      photoImg.alt = order.title;
    }
    if (priceEl) priceEl.textContent = order.price;

    if (badgeTierEl) {
      const completedCount = store.getWorkerCompletedShiftsCount();
      const ratingMeta = store.getWorkerRatingMeta();
      const isPro = completedCount >= 10 && ratingMeta.stars >= 4.8;
      const hoursNum = order.hours || 8;
      if (isPro) {
        badgeTierEl.textContent = `Смена ${hoursNum} ч • Выплата за 15 мин по СБП`;
      } else {
        badgeTierEl.textContent = `Смена ${hoursNum} ч • Холд 72 ч (защита качества)`;
      }
    }

    if (timeEl) timeEl.textContent = order.time;
    if (distEl) distEl.textContent = order.district;
    if (custEl) custEl.textContent = `${order.customerName} (Рейтинг ${order.customerRating || '4.95'})`;
    if (descEl) descEl.textContent = order.comment;

    if (badgeEl) {
      badgeEl.innerHTML = UI.renderStatusBadge(order.status);
    }

    if (courseBadgeEl) {
      if (check.allowed) {
        courseBadgeEl.innerHTML = `
          <span class="badge-briefing-ok">
            ${UI.SVG_ICONS.check} <span>Допуск к смене активен (12 мес.)</span>
          </span>
        `;
      } else {
        courseBadgeEl.innerHTML = `
          <button class="badge-briefing-needed" onclick="window.Eluma.Worker.startCourse('${check.requiredCourseId}', { orderId: ${order.id}, action: 'apply' })">
            ${UI.SVG_ICONS.book} <span>Пройти курс допуска «${UI.escapeHtml(check.courseName)}» (7 мин)</span>
          </button>
        `;
      }
    }

    const reworkBanner = document.getElementById('wrkDetailReworkBanner');
    if (reworkBanner) {
      if (order.status === 'rework') {
        reworkBanner.style.display = 'block';
        reworkBanner.innerHTML = `
          <div class="rework-notice-banner">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div>
              <strong>Заказчик вернул смену на доработку:</strong>
              <p style="margin: 4px 0 0 0;">${UI.escapeHtml(order.reworkReason || 'Пожалуйста, устраните замечания и сделайте повторный снимок ПОСЛЕ.')}</p>
            </div>
          </div>
        `;
      } else {
        reworkBanner.style.display = 'none';
      }
    }

    const counterOfferBanner = document.getElementById('wrkDetailCounterOfferBanner');
    if (counterOfferBanner) {
      if (order.counterOffer && order.status === 'applied') {
        counterOfferBanner.style.display = 'block';
        counterOfferBanner.innerHTML = `
          <div class="counter-offer-banner">
            <div class="counter-offer-header">
              <span>Ваше встречное предложение: <strong>${order.counterOffer.price.toLocaleString('ru-RU')} ₽</strong></span>
              <span class="badge-status-pill badge-warning">На рассмотрении</span>
            </div>
            <div style="font-size: 0.82rem; color: var(--text-muted);">Ожидает подтверждения или отклонения заказчиком.</div>
          </div>
        `;
      } else {
        counterOfferBanner.style.display = 'none';
      }
    }

    updateSafeStepper(order.step || 1);
    renderPhotoSlots(order);
    renderActionButtons(order, check);
    renderOrderChat(order.id);
  }

  function renderOrderChat(orderId) {
    const container = document.getElementById('wrkChatMessages');
    if (!container) return;

    const msgs = (store.state.chats && store.state.chats[orderId]) || [];
    if (msgs.length === 0) {
      container.innerHTML = `
        <div class="chat-empty-state">
          <span>Нет сообщений по заказу. Задайте вопрос заказчику или отправьте быстрый ответ.</span>
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
      const isOutgoing = m.sender === 'worker';
      return `
        <div class="chat-msg ${isOutgoing ? 'outgoing' : 'incoming'}">
          <div class="chat-msg-bubble">
            <div class="chat-msg-sender">${isOutgoing ? 'Вы (Исполнитель)' : 'Заказчик'}</div>
            <div class="chat-msg-text">${UI.escapeHtml(m.text)}</div>
            <div class="chat-msg-time">${UI.escapeHtml(m.time || '')}</div>
          </div>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  }

  function handleSendChat(e) {
    if (e && e.preventDefault) e.preventDefault();
    const input = document.getElementById('wrkChatInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const orderId = workerState.currentDetailOrderId;
    if (!orderId) return;

    store.addChatMessage(orderId, 'worker', text);
    input.value = '';
    renderOrderChat(orderId);
  }

  function sendQuickChat(text, targetOrderId = null) {
    const orderId = targetOrderId || workerState.currentDetailOrderId || workerState.activeChatOrderId;
    if (!orderId) return;
    store.addChatMessage(orderId, 'worker', text);
    renderOrderChat(orderId);
    renderSplitChatMessages(orderId);
    UI.showFeedbackToast('Сообщение отправлено', text);
  }

  function updateSafeStepper(step) {
    for (let i = 1; i <= 4; i++) {
      const s = document.getElementById('ws-step-' + i);
      const l = document.getElementById('ws-line-' + i);
      if (s) s.classList.toggle('completed', i <= step);
      if (l) l.classList.toggle('completed', i < step);
    }
  }

  function renderPhotoSlots(order) {
    const proofs = order.proofs || {};
    const beforeEl = document.getElementById('slotPreviewBefore');
    const afterEl = document.getElementById('slotPreviewAfter');
    const gpsEl = document.getElementById('wrkGpsBadge');

    if (beforeEl) {
      if (proofs.before) {
        beforeEl.innerHTML = `
          <div style="position:relative;width:100%;height:100%;">
            <img src="${proofs.before}" alt="Снимок ДО" style="width:100%;height:100%;object-fit:cover;border-radius:8px">
            ${order.step < 3 ? `<button type="button" class="btn-slot-retake" style="position:absolute;bottom:6px;right:6px;background:rgba(0,0,0,0.75);color:#fff;border:none;border-radius:4px;padding:3px 8px;font-size:0.75rem;cursor:pointer;" onclick="window.Eluma.Worker.uploadPhoto('before')">Переснять</button>` : ''}
          </div>
        `;
      } else {
        beforeEl.innerHTML = `<button type="button" class="btn-slot-upload" onclick="window.Eluma.Worker.uploadPhoto('before')">${UI.SVG_ICONS.camera} <span>Фото ДО</span></button>`;
      }
    }

    if (afterEl) {
      const canUploadAfter = (order.step || 1) >= 2 && proofs.before;
      if (proofs.after) {
        afterEl.innerHTML = `
          <div style="position:relative;width:100%;height:100%;">
            <img src="${proofs.after}" alt="Снимок ПОСЛЕ" style="width:100%;height:100%;object-fit:cover;border-radius:8px">
            ${order.step < 3 ? `<button type="button" class="btn-slot-retake" style="position:absolute;bottom:6px;right:6px;background:rgba(0,0,0,0.75);color:#fff;border:none;border-radius:4px;padding:3px 8px;font-size:0.75rem;cursor:pointer;" onclick="window.Eluma.Worker.uploadPhoto('after')">Переснять</button>` : ''}
          </div>
        `;
      } else if (!canUploadAfter) {
        afterEl.innerHTML = `<div class="slot-placeholder" style="font-size:0.75rem;padding:8px;text-align:center;color:var(--text-muted);display:flex;align-items:center;justify-content:center;height:100%;">Доступно после отметки прибытия (GPS) и фото ДО</div>`;
      } else {
        afterEl.innerHTML = `<button type="button" class="btn-slot-upload" onclick="window.Eluma.Worker.uploadPhoto('after')">${UI.SVG_ICONS.camera} <span>Фото ПОСЛЕ</span></button>`;
      }
    }

    if (gpsEl) {
      if (order.step >= 2) {
        gpsEl.className = 'proofs-badge verified';
        gpsEl.innerHTML = `${UI.SVG_ICONS.check} GPS: Самара подтверждено`;
      } else {
        gpsEl.className = 'proofs-badge';
        gpsEl.textContent = 'GPS: Требуется отметка на месте';
      }
    }
  }

  function renderActionButtons(order, check) {
    const btn = document.getElementById('wrkActionBtn');
    const counterBtn = document.getElementById('wrkCounterOfferBtn');
    if (!btn) return;

    const isApplied = order.assignedWorkerId === store.state.currentUserId;

    if (!isApplied) {
      if (!check.allowed) {
        btn.innerHTML = `<span>Пройти курс и записаться</span>`;
        btn.onclick = () => window.Eluma.Worker.startCourse(check.requiredCourseId, { orderId: order.id, action: 'apply' });
      } else {
        btn.innerHTML = `<span>Откликнуться на смену</span>`;
        btn.onclick = () => handleTakeShift(order.id);
      }
      if (counterBtn) {
        counterBtn.style.display = order.allowNegotiation ? 'inline-flex' : 'none';
        counterBtn.onclick = () => openCounterOffer(order.id);
      }
    } else {
      if (counterBtn) counterBtn.style.display = 'none';

      if (order.step === 1) {
        btn.innerHTML = `<span>Я на месте (Подтвердить GPS)</span>`;
        btn.onclick = () => handleCheckIn(order.id);
      } else if (order.step === 2) {
        btn.innerHTML = `<span>Сдать смену на проверку</span>`;
        btn.onclick = () => handleSubmitProofs(order.id);
      } else if (order.step === 3) {
        btn.innerHTML = `<span>На проверке заказчиком</span>`;
        btn.onclick = () => UI.showFeedbackToast('Ожидание приёмки', 'Заказчик проверяет фотоотчёт');
      } else if (order.step === 4) {
        btn.innerHTML = `<span>Смена выполнена и оплачена</span>`;
        btn.onclick = () => UI.showFeedbackToast('Оплачено', 'Средства уже зачислены в ваш кошелёк');
      }
    }
  }

  function handleTakeShift(orderId) {
    const res = store.applyForOrder(orderId);
    if (res.needsCourse) {
      window.Eluma.Worker.startCourse(res.requiredCourseId, { orderId, action: 'apply' });
      return;
    }
    if (res.success) {
      UI.showFeedbackToast('Вы записаны!', 'Смена взята в работу. Прибудьте на объект вовремя.');
      renderOrderDetail(orderId);
    }
  }

  function handleCheckIn(orderId) {
    store.checkInOrderLocation(orderId);
    UI.showFeedbackToast('Геолокация подтверждена', 'Точность 5 метров (Самара). Сделайте снимок ДО начала.');
    renderOrderDetail(orderId);
  }

  function handleSubmitProofs(orderId) {
    const order = (store.state.orders || []).find(o => o.id === orderId);
    if (!order || !order.proofs || !order.proofs.before || !order.proofs.after) {
      UI.showFeedbackToast('Внимание', 'Сначала загрузите снимки ДО и ПОСЛЕ');
      return;
    }
    store.submitOrderProofs(orderId, order.proofs.before, order.proofs.after);
    UI.showFeedbackToast('Фотоотчёт отправлен!', 'Заказчик получил уведомление о сдаче работы.');
    renderOrderDetail(orderId);
  }

  function openCounterOffer(orderId) {
    const order = (store.state.orders || []).find(o => o.id === orderId);
    if (!order) return;
    const priceInput = document.getElementById('counterOfferPriceInput');
    const currentPriceEl = document.getElementById('counterOfferCurrentPrice');
    if (priceInput) priceInput.value = order.rawPrice;
    if (currentPriceEl) currentPriceEl.textContent = order.price;
    UI.openModal('counterOfferModal');
  }

  function submitCounterOffer(e) {
    if (e && e.preventDefault) e.preventDefault();
    const orderId = workerState.currentDetailOrderId;
    const priceInput = document.getElementById('counterOfferPriceInput');
    const commentInput = document.getElementById('counterOfferCommentInput');
    const newPrice = parseInt(priceInput ? priceInput.value : 0, 10);
    if (!newPrice || newPrice < 300) {
      UI.showFeedbackToast('Ошибка', 'Введите корректную сумму');
      return;
    }
    const res = store.applyForOrder(orderId, store.state.currentUserId, newPrice, commentInput ? commentInput.value : '');
    UI.closeModal('counterOfferModal');
    if (res.needsCourse) {
      window.Eluma.Worker.startCourse(res.requiredCourseId, { orderId, action: 'apply' });
      return;
    }
    UI.showFeedbackToast('Предложение отправлено', `Встречная ставка ${newPrice.toLocaleString('ru-RU')} ₽ передана заказчику.`);
    renderOrderDetail(orderId);
  }

  function uploadPhoto(type) {
    const order = (store.state.orders || []).find(o => o.id === workerState.currentDetailOrderId);
    if (!order) return;

    if (type === 'after') {
      if ((order.step || 1) < 2 || !order.proofs || !order.proofs.before) {
        UI.showFeedbackToast('Действие заблокировано', 'Сначала подтвердите прибытие (GPS) и сделайте снимок ДО.');
        return;
      }
    }

    // Генерируем реалистичный холст с водяным знаком
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = type === 'before' ? '#1E293B' : '#0F172A';
    ctx.fillRect(0, 0, 600, 400);

    ctx.fillStyle = type === 'before' ? '#38BDF8' : '#10B981';
    ctx.font = 'bold 24px Manrope, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(type === 'before' ? 'СНИМОК ДО НАЧАЛА' : 'СНИМОК ПОСЛЕ СДАЧИ', 300, 180);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 310, 600, 90);
    ctx.fillStyle = '#10B981';
    ctx.fillRect(0, 310, 600, 3);

    ctx.textAlign = 'left';
    ctx.font = 'bold 12px Manrope, sans-serif';
    ctx.fillStyle = '#10B981';
    ctx.fillText('Eluma Safe Verified • 53.2185, 50.1642 (Самара)', 20, 345);

    ctx.font = '11px Manrope, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`Смена #${order.id} • ${new Date().toLocaleDateString('ru-RU')}, ${new Date().toLocaleTimeString('ru-RU')}`, 20, 370);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    if (!order.proofs) order.proofs = {};
    order.proofs[type] = dataUrl;
    store.save('photo_uploaded');
    renderPhotoSlots(order);
    UI.showFeedbackToast('Фото загружено', `Снимок ${type === 'before' ? 'ДО' : 'ПОСЛЕ'} успешно добавлен`);
  }

  // --------------------------------------------------------------------------
  // ЭКРАН: ВЫПЛАТЫ (PAYOUTS)
  // --------------------------------------------------------------------------

  function renderPayouts() {
    const prof = store.getCurrentWorkerProfile();
    const balEl = document.getElementById('payoutAvailableAmount');
    const shiftsEl = document.getElementById('incomeShiftsCount');
    const listEl = document.getElementById('payoutHistoryList');
    const holdBanner = document.getElementById('payoutHoldBanner');
    const holdAmountEl = document.getElementById('payoutHoldAmount');
    const holdAvailableEl = document.getElementById('payoutHoldAvailable');

    const available = prof && prof.wallet ? (prof.wallet.available || 0) : 0;
    const hold72h = prof && prof.wallet ? (prof.wallet.hold72h || 0) : 0;

    if (balEl) {
      balEl.textContent = `${available.toLocaleString('ru-RU')} ₽`;
    }
    if (shiftsEl) {
      shiftsEl.textContent = `${store.getWorkerCompletedShiftsCount()}`;
    }

    // Расчёт и вывод реальной суммы налога НПД (4-6%) в рублях
    const taxSummary = store.getWorkerTaxSummary(store.state.currentUserId || 1);
    const statCards = document.querySelectorAll('.payout-stat-card');
    if (statCards.length >= 2) {
      const taxCardVal = statCards[1].querySelector('.stat-card-value');
      if (taxCardVal) taxCardVal.textContent = `${taxSummary.totalTax.toLocaleString('ru-RU')} ₽ к уплате`;
    }

    if (holdBanner) {
      if (hold72h > 0) {
        holdBanner.style.display = 'flex';
        if (holdAmountEl) holdAmountEl.textContent = `${hold72h.toLocaleString('ru-RU')} ₽`;
        if (holdAvailableEl) holdAvailableEl.textContent = `${available.toLocaleString('ru-RU')} ₽`;
      } else {
        holdBanner.style.display = 'none';
      }
    }

    if (listEl) {
      const currentWorkerId = store.state.currentUserId || 1;
      const payouts = (store.state.payouts || []).filter(p => !p.workerId || p.workerId === currentWorkerId);
      if (payouts.length === 0) {
        listEl.innerHTML = `<div class="empty-feed-card"><p>Выплат пока не было</p></div>`;
      } else {
        listEl.innerHTML = payouts.map(p => {
          const isWithdrawal = p.isWithdrawal || p.amount < 0;
          const displayAmount = Math.abs(p.amount).toLocaleString('ru-RU');
          const prefix = isWithdrawal ? '-' : '+';
          const statusText = p.fnsStatus ? ` • ${p.fnsStatus}` : '';
          const actionOnClick = isWithdrawal
            ? `window.Eluma.UI.openSbpVoucherModal({ amount: ${Math.abs(p.amount)}, date: '${p.date}', operationId: '${p.operationId || 'SBP-63-SAM-' + p.id}' })`
            : `window.Eluma.Worker.viewFnsReceipt(${p.id})`;
          const linkText = isWithdrawal ? 'Распоряжение СБП' : `Чек ФНС № ${p.receiptNum}`;

          return `
            <div class="payout-history-item" onclick="${actionOnClick}">
              <div class="payout-item-left">
                <strong class="payout-item-title">${UI.escapeHtml(p.title)}</strong>
                <span class="payout-item-date">${UI.escapeHtml(p.date)}${statusText}</span>
              </div>
              <div class="payout-item-right">
                <strong class="payout-item-amount ${isWithdrawal ? 'withdrawal' : ''}">${prefix}${displayAmount} ₽</strong>
                <span class="payout-item-receipt-link ${isWithdrawal ? 'sbp-link' : ''}">${linkText}</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  function openNpdCabinetModal() {
    const summary = store.getWorkerTaxSummary(store.state.currentUserId || 1);
    const earnedEl = document.getElementById('npdCabinetTotalEarned');
    const taxFlEl = document.getElementById('npdCabinetTaxFl');
    const taxUlEl = document.getElementById('npdCabinetTaxUl');
    const taxTotalEl = document.getElementById('npdCabinetTaxTotal');
    const bankSelect = document.getElementById('npdBankSelect');

    if (earnedEl) earnedEl.textContent = `${summary.totalEarned.toLocaleString('ru-RU')} ₽`;
    if (taxFlEl) taxFlEl.textContent = `${summary.taxFl.toLocaleString('ru-RU')} ₽`;
    if (taxUlEl) taxUlEl.textContent = `${summary.taxUl.toLocaleString('ru-RU')} ₽`;
    if (taxTotalEl) taxTotalEl.textContent = `${summary.totalTax.toLocaleString('ru-RU')} ₽`;
    if (bankSelect && store.state.workerPayoutBank) {
      bankSelect.value = store.state.workerPayoutBank;
    }

    UI.openModal('npdTaxCabinetModal');
  }

  function onSelectPayoutBank(bankName) {
    store.updateWorkerPayoutBank(bankName);
    UI.showFeedbackToast('Банк СБП сохранён', `Выплаты будут моментально переводиться в ${bankName}`);
  }

  function withdrawAvailablePayout() {
    const prof = store.getCurrentWorkerProfile();
    const available = prof && prof.wallet ? (prof.wallet.available || 0) : 0;
    if (available <= 0) {
      UI.showFeedbackToast('Баланс 0 ₽', 'У вас нет доступных средств для вывода.');
      return;
    }

    const res = store.withdrawAvailablePayout(store.state.currentUserId);
    if (res && res.success) {
      UI.showFeedbackToast('Выплата отправлена по СБП', `Сумма ${res.amount.toLocaleString('ru-RU')} ₽ зачислена на карту Т-Банк. Чек ФНС сформирован.`);
      renderPayouts();
      updateSidebarWallet();
    } else {
      UI.showFeedbackToast('Ошибка', (res && res.error) || 'Не удалось выполнить вывод.');
    }
  }

  function withdrawPayout() {
    return withdrawAvailablePayout();
  }

  function viewFnsReceipt(taskTitleOrId, amount, date, receiptNum) {
    let p = null;
    if (typeof taskTitleOrId === 'string' && amount) {
      p = {
        title: taskTitleOrId,
        amount: amount,
        date: date || '18.10.2026',
        receiptNum: receiptNum || 84102
      };
    } else {
      const payouts = store.state.payouts || [];
      p = payouts.find(x => x.id === taskTitleOrId) || payouts[0] || {
        title: 'Смена на складе',
        amount: '3 600 ₽',
        date: '18.10.2026',
        receiptNum: 84102
      };
    }
    if (!p) return;
    const numEl = document.getElementById('fnsReceiptNumber');
    const dateEl = document.getElementById('fnsReceiptDate');
    const titleEl = document.getElementById('fnsReceiptTaskTitle');
    const totalEl = document.getElementById('fnsReceiptTotal');
    const bigTotalEl = document.getElementById('fnsReceiptBigTotal');

    const formattedAmount = typeof p.amount === 'number' ? `${p.amount.toLocaleString('ru-RU')} ₽` : String(p.amount);

    if (numEl) numEl.textContent = `Чек № НПД-2026-10-${p.receiptNum}`;
    if (dateEl) dateEl.textContent = p.date;
    if (titleEl) titleEl.textContent = p.title;
    if (totalEl) totalEl.textContent = formattedAmount;
    if (bigTotalEl) bigTotalEl.textContent = formattedAmount;

    UI.openModal('fnsReceiptModal');
  }

  // --------------------------------------------------------------------------
  // ЭКРАН: ЧАТЫ (CHATS)
  // --------------------------------------------------------------------------

  function renderChats() {
    const container = document.getElementById('wrkChatsList');
    if (!container) return;

    const myOrders = store.getWorkerActiveOrders().concat(store.getWorkerCompletedOrders());
    if (myOrders.length === 0) {
      container.innerHTML = `<div class="empty-feed-card"><p>У вас пока нет активных диалогов</p></div>`;
      return;
    }

    container.innerHTML = myOrders.map(order => {
      const msgs = (store.state.chats && store.state.chats[order.id]) || [];
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1].text : 'Диалог открыт';
      const isActive = workerState.activeChatOrderId === order.id;
      return `
        <div class="chat-dialog-card ${isActive ? 'active' : ''}" data-order-id="${order.id}" onclick="window.Eluma.Worker.openChatDialog(${order.id})">
          <div class="chat-card-avatar">${UI.SVG_ICONS.user}</div>
          <div class="chat-card-info">
            <strong class="chat-card-title">${UI.escapeHtml(order.title)}</strong>
            <span class="chat-card-sub">${UI.escapeHtml(order.customerName)}</span>
            <p class="chat-card-snippet">${UI.escapeHtml(lastMsg)}</p>
          </div>
        </div>
      `;
    }).join('');

    // If on desktop and there is an active dialog or first order, show it
    if (window.innerWidth >= 768) {
      const targetId = workerState.activeChatOrderId || (myOrders[0] ? myOrders[0].id : null);
      if (targetId) {
        openChatDialog(targetId, true);
      }
    }
  }

  function openChatDialog(orderId, silent = false) {
    workerState.activeChatOrderId = orderId;
    const isDesktop = window.innerWidth >= 768;
    if (!isDesktop && !silent) {
      openDetail(orderId, true);
      return;
    }

    document.querySelectorAll('#wrkChatsList .chat-dialog-card').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-order-id') == orderId);
    });

    const emptyEl = document.getElementById('wrkChatEmptySelection');
    const panelEl = document.getElementById('wrkChatDialogPanel');
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
            <span style="font-size:0.8rem;color:var(--text-muted);">${UI.escapeHtml(order.customerName)} • Заказ #${order.id}</span>
          </div>
          <button type="button" class="btn btn-secondary-outline" style="padding:6px 12px;font-size:0.8rem;" onclick="window.Eluma.Worker.openDetail(${order.id})">Карточка смены</button>
        </div>
        <div class="order-chat-messages" id="wrkSplitChatMessages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;"></div>
        <div class="quick-reply-row" style="padding:6px 12px;">
          <button type="button" class="quick-reply-chip" onclick="window.Eluma.Worker.sendQuickChat('Выехал на смену, буду вовремя', ${order.id})">Выехал на смену</button>
          <button type="button" class="quick-reply-chip" onclick="window.Eluma.Worker.sendQuickChat('Я на месте, ожидаю у входа', ${order.id})">Я на месте</button>
          <button type="button" class="quick-reply-chip" onclick="window.Eluma.Worker.sendQuickChat('Работа выполнена, загружаю фото', ${order.id})">Работа выполнена</button>
        </div>
        <form class="chat-input-row" onsubmit="window.Eluma.Worker.handleSendSplitChat(event, ${order.id})">
          <input type="text" id="wrkSplitChatInput" placeholder="Напишите сообщение..." autocomplete="off">
          <button type="submit" class="btn btn-primary-cta" style="padding:8px 16px;">Отправить</button>
        </form>
      `;
      renderSplitChatMessages(orderId);
    }
  }

  function renderSplitChatMessages(orderId) {
    const container = document.getElementById('wrkSplitChatMessages');
    if (!container) return;
    const msgs = (store.state.chats && store.state.chats[orderId]) || [];
    if (msgs.length === 0) {
      container.innerHTML = `<div class="chat-empty-state"><span>Диалог пуст. Напишите заказчику.</span></div>`;
      return;
    }
    container.innerHTML = msgs.map(m => {
      if (m.sender === 'system') {
        return `<div class="chat-bubble system"><span>${UI.escapeHtml(m.text)}</span></div>`;
      }
      const isMine = m.sender === 'worker';
      return `<div class="chat-bubble ${isMine ? 'mine' : 'other'}">${UI.escapeHtml(m.text)}</div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
  }

  function handleSendSplitChat(e, orderId) {
    if (e && e.preventDefault) e.preventDefault();
    const input = document.getElementById('wrkSplitChatInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    store.addChatMessage(orderId, 'worker', text);
    input.value = '';
    renderSplitChatMessages(orderId);
    if (workerState.currentDetailOrderId === orderId) {
      renderOrderChat(orderId);
    }
  }

  // --------------------------------------------------------------------------
  // ЭКРАН: ДРУЗЬЯ И НАПАРНИКИ (FRIENDS & CO-OP)
  // --------------------------------------------------------------------------

  function renderFriendsScreen() {
    const stats = store.getCoOpStats();
    const metricCoOp = document.getElementById('metricCoOpShifts');
    const metricBuddies = document.getElementById('metricActiveBuddies');
    const refCode = document.getElementById('friendsRefCode');
    const subCount = document.getElementById('friendsSubCount');

    if (metricCoOp) metricCoOp.textContent = `${stats.totalCoOpShifts}`;
    if (metricBuddies) metricBuddies.textContent = `${stats.activeBuddiesCount}`;
    if (refCode) refCode.textContent = stats.referralCode;
    if (subCount) subCount.textContent = `${stats.activeBuddiesCount} напарника в Самаре`;

    renderFriendsActiveShifts();
    renderFriendsCardsGrid();
  }

  function renderFriendsActiveShifts() {
    const listEl = document.getElementById('friendsActiveShiftsList');
    if (!listEl) return;

    // Смены, где в assignedWorkerIds есть друзья текущего исполнителя
    const orders = store.state.orders || [];
    const withFriends = orders.filter(o => {
      const meta = store.getOrderSlotsMeta(o, store.state.currentUserId);
      return meta.assignedFriends.length > 0;
    });

    if (withFriends.length === 0) {
      listEl.innerHTML = `
        <div class="empty-friends-shifts">
          <p class="empty-friends-title">Сейчас нет активных смен с напарниками</p>
          <span class="empty-friends-sub">Выберите любую смену из каталога и пригласите друга кнопкой «+ С другом»</span>
          <button type="button" class="btn btn-primary-cta" onclick="window.Eluma.Worker.navigate('home')">Перейти в каталог смен</button>
        </div>
      `;
      return;
    }

    listEl.innerHTML = withFriends.map(order => {
      const meta = store.getOrderSlotsMeta(order, store.state.currentUserId);
      const friend = meta.assignedFriends[0] || { name: 'Напарник' };
      const isAssigned = meta.isWorkerAssigned;
      const left = meta.left;

      return `
        <article class="friends-shift-card">
          <div class="friends-shift-photo">
            <img src="${UI.getOrderPhotoUrl(order)}" alt="${UI.escapeHtml(order.title)}" loading="lazy">
          </div>
          <div class="friends-shift-content">
            <div class="friends-shift-top">
              <span class="friends-shift-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span>${UI.escapeHtml(friend.name)} уже в смене</span>
              </span>
              <span class="friends-shift-meta">${left > 0 ? `Свободно ${left} из ${meta.total} мест` : 'Все места заняты'}</span>
            </div>
            <h4 class="friends-shift-name" onclick="window.Eluma.Worker.openOrderDrawer(${order.id})">${UI.escapeHtml(order.title)}</h4>
            <div class="friends-shift-meta">
              <span>${UI.escapeHtml(order.district)}</span> · <span>${UI.escapeHtml(order.time)}</span>
            </div>
          </div>
          <div class="friends-shift-action">
            <span class="unit-payout-amount">${UI.escapeHtml(order.price)}</span>
            ${isAssigned ? `
              <button type="button" class="btn-unit-apply applied" onclick="window.Eluma.Worker.openDetail(${order.id})">Вы записаны</button>
            ` : (left > 0 ? `
              <button type="button" class="btn btn-primary-cta btn-join-friend" onclick="window.Eluma.Worker.joinFriendShiftDirect(${order.id}, event)">
                Присоединиться к ${UI.escapeHtml(friend.name.split(' ')[0])}
              </button>
            ` : `
              <button type="button" class="btn btn-secondary-outline" disabled>Мест нет</button>
            `)}
          </div>
        </article>
      `;
    }).join('');
  }

  function renderFriendsCardsGrid() {
    const gridEl = document.getElementById('friendsCardsGrid');
    if (!gridEl) return;

    const friends = store.getFriends();
    gridEl.innerHTML = friends.map(f => {
      const initials = f.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      const coOpCount = f.coOpCount || f.CoOpCount || 0;
      const categoriesHtml = (f.allowedCategories || []).map(c => `
        <span class="cat-pill-micro">${UI.escapeHtml(c)}</span>
      `).join('');

      return `
        <div class="friend-card" id="friendCard_${f.userId}">
          <div class="friend-card-top">
            <div class="friend-card-avatar">${initials}</div>
            <div class="friend-card-info">
              <div class="friend-card-name-row">
                <strong class="friend-card-name">${UI.escapeHtml(f.name)}</strong>
                <span class="friend-rating-badge">${UI.SVG_ICONS.star} ${UI.escapeHtml(f.rating)}</span>
              </div>
              <span class="friend-card-role">${UI.escapeHtml(f.roleTag)}</span>
              <span class="friend-card-phone">${UI.escapeHtml(f.phone)}</span>
            </div>
          </div>

          <div class="friend-coop-stats-row">
            <span class="friend-coop-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>${coOpCount} совместных смен</span>
            </span>
            <div class="friend-status-row">
              <span class="friend-status-dot"></span>
              <span class="friend-status-text">${UI.escapeHtml(f.statusText)}</span>
            </div>
          </div>

          <div class="friend-categories-row">
            ${categoriesHtml}
          </div>

          <div class="friend-card-actions">
            <button type="button" class="btn btn-secondary-outline btn-sm w-full btn-friend-action" onclick="window.Eluma.Worker.filterShiftsForFriend(${f.userId})">
              Смотреть смены друга
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function filterShiftsForFriend(friendUserId) {
    showScreen('home');
    workerState.powerFilters.friendsInShift = true;
    const chk = document.getElementById('chkFriendsInShift');
    if (chk) chk.checked = true;
    renderHomeFeed();
  }

  function openCoOpFriendModal(orderId, event) {
    if (event && event.stopPropagation) event.stopPropagation();
    const order = (store.state.orders || []).find(o => o.id === orderId);
    if (!order) return;

    workerState.currentCoOpOrderId = orderId;
    const meta = store.getOrderSlotsMeta(order, store.state.currentUserId);

    const titleEl = document.getElementById('coOpShiftTitle');
    const metaEl = document.getElementById('coOpShiftMeta');
    const listEl = document.getElementById('coOpFriendsSelectList');

    if (titleEl) titleEl.textContent = order.title;
    if (metaEl) metaEl.textContent = `${order.district} • ${order.price} • Свободно мест: ${meta.left}`;

    const friends = store.getFriends();
    if (friends.length > 0 && !workerState.selectedFriendIdForBooking) {
      workerState.selectedFriendIdForBooking = friends[0].userId;
    }

    if (listEl) {
      listEl.innerHTML = friends.map(f => {
        const isSelected = f.userId === workerState.selectedFriendIdForBooking;
        const initials = f.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        return `
          <div class="coop-friend-option ${isSelected ? 'selected' : ''}" onclick="window.Eluma.Worker.selectCoOpFriend(${f.userId})">
            <div class="coop-friend-option-left">
              <div class="coop-friend-option-avatar">${initials}</div>
              <div class="coop-friend-option-info">
                <strong class="coop-friend-option-name">${UI.escapeHtml(f.name)}</strong>
                <span class="coop-friend-option-meta">${UI.escapeHtml(f.roleTag)} • Рейтинг ${UI.escapeHtml(f.rating)}</span>
              </div>
            </div>
            <div class="coop-friend-option-check">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>
        `;
      }).join('');
    }

    UI.openModal('coOpFriendModal');
  }

  function selectCoOpFriend(friendUserId) {
    workerState.selectedFriendIdForBooking = friendUserId;
    document.querySelectorAll('#coOpFriendsSelectList .coop-friend-option').forEach(el => {
      const oc = el.getAttribute('onclick') || '';
      el.classList.toggle('selected', oc.includes(`(${friendUserId})`));
    });
  }

  function confirmCoOpBooking() {
    const orderId = workerState.currentCoOpOrderId;
    const friendId = workerState.selectedFriendIdForBooking;
    if (!orderId || !friendId) {
      UI.showFeedbackToast('Выберите напарника', 'Пожалуйста, выберите друга из списка');
      return;
    }

    const order = (store.state.orders || []).find(o => o.id === orderId);
    if (!order) return;

    const check = store.canWorkerTakeOrder(store.state.currentUserId, order);
    if (!check.allowed) {
      UI.closeModal('coOpFriendModal');
      startCourse(check.requiredCourseId, { orderId, action: 'apply' });
      return;
    }

    const res = store.bookShiftWithFriend(orderId, friendId, store.state.currentUserId);
    if (res && res.success) {
      UI.closeModal('coOpFriendModal');
      const friend = store.getFriends().find(f => f.userId === friendId);
      const friendName = friend ? friend.name : 'напарником';
      UI.showFeedbackToast('Вы записаны!', `Совместная запись с ${friendName} успешно оформлена в эскроу`);
      renderHomeFeed();
      if (workerState.currentScreen === 'friends') renderFriendsScreen();
      if (workerState.currentScreen === 'my') renderMyOrders();
    } else {
      UI.showFeedbackToast('Ошибка', (res && res.error) || 'Не удалось записаться на смену');
    }
  }

  function joinFriendShiftDirect(orderId, event) {
    if (event && event.stopPropagation) event.stopPropagation();
    const order = (store.state.orders || []).find(o => o.id === orderId);
    if (!order) return;

    const check = store.canWorkerTakeOrder(store.state.currentUserId, order);
    if (!check.allowed) {
      startCourse(check.requiredCourseId, { orderId, action: 'apply' });
      return;
    }

    const meta = store.getOrderSlotsMeta(order, store.state.currentUserId);
    if (meta.left <= 0) {
      UI.showFeedbackToast('Мест нет', 'Все слоты в смене уже заняты');
      return;
    }

    const res = store.applyForOrder(orderId, store.state.currentUserId);
    if (res && res.success) {
      const friendName = meta.assignedFriends.length > 0 ? meta.assignedFriends[0].name : 'напарником';
      UI.showFeedbackToast('Вы в смене!', `Вы присоединились к смене вместе с ${friendName}`);
      renderHomeFeed();
      if (workerState.currentScreen === 'friends') renderFriendsScreen();
      if (workerState.currentScreen === 'my') renderMyOrders();
    }
  }

  function copyReferralCode() {
    const code = 'ELUMA-SAMARA-63';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        UI.showFeedbackToast('Код скопирован!', `${code} скопирован в буфер обмена`);
      }).catch(() => {
        UI.showFeedbackToast('Ваш реферальный код', code);
      });
    } else {
      UI.showFeedbackToast('Ваш реферальный код', code);
    }
  }

  function handleAddFriendSubmit(event) {
    if (event && event.preventDefault) event.preventDefault();
    const nameEl = document.getElementById('newFriendName');
    const phoneEl = document.getElementById('newFriendPhone');
    const roleEl = document.getElementById('newFriendRole');

    const name = nameEl ? nameEl.value.trim() : '';
    const phone = phoneEl ? phoneEl.value.trim() : '';
    const role = roleEl ? roleEl.value.trim() : 'Склад · Погрузка';

    if (!name || !phone) {
      UI.showFeedbackToast('Заполните поля', 'Укажите имя и телефон напарника');
      return;
    }

    const res = store.addFriendByContact(name, phone, role);
    if (res && res.success) {
      UI.closeModal('addFriendModal');
      if (nameEl) nameEl.value = '';
      if (phoneEl) phoneEl.value = '';
      UI.showFeedbackToast('Напарник добавлен!', `${res.friend.name} добавлен в список напарников Самары`);
      if (workerState.currentScreen === 'friends') {
        renderFriendsScreen();
      }
    }
  }

  function getCurrentDetailOrderId() {
    return workerState.currentDetailOrderId;
  }

  // --------------------------------------------------------------------------
  // ЭКРАН: ПРОФИЛЬ И «ОБУЧЕНИЕ И ДОПУСКИ» (PROFILE)
  // --------------------------------------------------------------------------

  function renderProfile() {
    const user = store.state.users.find(u => u.id === store.state.currentUserId) || store.state.users[0];
    const prof = store.getCurrentWorkerProfile();
    const ratingMeta = store.getWorkerRatingMeta();
    const completedCount = store.getWorkerCompletedShiftsCount();

    const nameEl = document.getElementById('profWorkerName');
    const phoneEl = document.getElementById('profWorkerPhone');
    const shiftsEl = document.getElementById('profCompletedShifts');
    const ratingEl = document.getElementById('profRatingValue');
    const coursesListEl = document.getElementById('profCoursesList');

    if (nameEl) nameEl.textContent = user.name;
    if (phoneEl) phoneEl.textContent = user.phone;
    if (shiftsEl) shiftsEl.textContent = `${completedCount}`;
    if (ratingEl) ratingEl.textContent = `${ratingMeta.rating}`;

    if (coursesListEl) {
      const allCourses = Courses.getAllCourses();
      coursesListEl.innerHTML = allCourses.map(c => {
        const cStatus = store.getCourseStatus(user.id, c.id);
        return `
          <div class="course-profile-card ${cStatus.isPassed ? 'passed' : 'pending'} ${cStatus.isExpiring ? 'expiring' : ''}">
            <div class="course-card-top">
              <span class="course-category-tag">${UI.escapeHtml(c.category)}</span>
              <span class="course-status-badge ${cStatus.isPassed ? 'ok' : 'warn'}">
                ${cStatus.isPassed ? UI.SVG_ICONS.check : UI.SVG_ICONS.clock} ${cStatus.label}
              </span>
            </div>
            <strong class="course-card-title">${UI.escapeHtml(c.title)}</strong>
            <div class="course-card-meta">
              <span>${c.minutes} минут</span> • <span>Тест 5 вопросов</span>
              ${cStatus.bestScore ? ` • <span>Балл: ${cStatus.bestScore}/5</span>` : ''}
            </div>
            <div class="course-card-actions">
              <button class="btn ${cStatus.isPassed ? 'btn-secondary-outline' : 'btn-primary-cta'}" onclick="window.Eluma.Worker.startCourse('${c.id}')">
                ${cStatus.isPassed ? 'Повторить курс' : 'Пройти обучение'}
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    // Обновление чек-листа допуска (шаг 4)
    const introStatus = store.getCourseStatus(user.id, 'safe_intro');
    const isIntroPassed = introStatus && introStatus.isPassed;
    const progressTextEl = document.querySelector('.onboarding-progress-text');
    const stepItems = document.querySelectorAll('.onboarding-step-item');
    if (stepItems && stepItems.length >= 4) {
      const step4 = stepItems[3];
      if (isIntroPassed) {
        step4.className = 'onboarding-step-item completed';
        step4.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>4. Базовый допуск безопасной работы подтверждён</span>
        `;
        if (progressTextEl) progressTextEl.textContent = 'Все 4 шага подтверждены • Допуск активен';
      } else {
        step4.className = 'onboarding-step-item active';
        step4.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2"><circle cx="12" cy="12" r="9"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>4. Базовый допуск безопасной работы (Пройти тест)</span>
        `;
        if (progressTextEl) progressTextEl.textContent = 'Шаги 1–3 подтверждены';
      }
    }
  }

  // --------------------------------------------------------------------------
  // ЭКРАН: ИНТЕРАКТИВНЫЙ ПЛЕЕР КУРСА ДОПУСКА (COURSE PLAYER)
  // --------------------------------------------------------------------------

  function startCourse(courseId, returnTo = null) {
    workerState.activeCourseId = courseId;
    workerState.returnTo = returnTo;
    workerState.courseLessonIdx = 0;
    workerState.courseQuizAnswers = {};
    workerState.courseQuizFinished = false;
    showScreen('course_player');
  }

  function renderCoursePlayer() {
    const course = Courses.getCourse(workerState.activeCourseId) || Courses.getCourse('safe_intro');
    const container = document.getElementById('scr-wrk-course_player');
    if (!container) return;

    container.innerHTML = `
      <div class="course-player-wrap">
        <div class="course-player-header">
          <button class="btn-back-link" onclick="window.Eluma.Worker.exitCourse()">
            ${UI.SVG_ICONS.close} Закрыть курс
          </button>
          <div class="course-header-titles">
            <span class="course-badge-pill">${UI.escapeHtml(course.category)}</span>
            <h2 class="course-lead-title">${UI.escapeHtml(course.title)}</h2>
          </div>
          <button type="button" class="btn btn-secondary-outline btn-demo-pass" onclick="window.Eluma.Worker.instantPassCourse()">
            ${UI.SVG_ICONS.check} <span>Сдать курс в 1 клик (Демо)</span>
          </button>
        </div>

        <div class="course-tabs-bar">
          <button class="course-tab-btn ${workerState.courseLessonIdx === 0 ? 'active' : ''}" onclick="window.Eluma.Worker.setLesson(0)">Урок 1</button>
          <button class="course-tab-btn ${workerState.courseLessonIdx === 1 ? 'active' : ''}" onclick="window.Eluma.Worker.setLesson(1)">Урок 2</button>
          <button class="course-tab-btn ${workerState.courseLessonIdx === 2 ? 'active' : ''}" onclick="window.Eluma.Worker.setLesson(2)">Урок 3</button>
          <button class="course-tab-btn ${workerState.courseLessonIdx === 3 ? 'active' : ''}" onclick="window.Eluma.Worker.setLesson(3)">Тест (5 вопросов)</button>
        </div>

        <div class="course-player-body">
          ${workerState.courseLessonIdx < 3 ? renderLessonContent(course, workerState.courseLessonIdx) : renderQuizContent(course)}
        </div>
      </div>
    `;
  }

  function renderLessonContent(course, idx) {
    const lesson = course.lessons[idx] || course.lessons[0];
    return `
      <div class="lesson-card">
        <h3 class="lesson-title">${UI.escapeHtml(lesson.title)}</h3>
        <p class="lesson-body-text">${UI.escapeHtml(lesson.body)}</p>
        <div class="lesson-keypoints-box">
          <strong>Ключевые правила урока:</strong>
          <ul>
            ${lesson.keyPoints.map(kp => `<li>${UI.SVG_ICONS.check} ${UI.escapeHtml(kp)}</li>`).join('')}
          </ul>
        </div>
        <div class="lesson-actions-row">
          ${idx > 0 ? `<button class="btn btn-secondary-outline" onclick="window.Eluma.Worker.setLesson(${idx - 1})">Назад</button>` : ''}
          <button class="btn btn-primary-cta" onclick="window.Eluma.Worker.setLesson(${idx + 1})">
            ${idx === 2 ? 'Перейти к тесту' : 'Следующий урок'}
          </button>
        </div>
      </div>
    `;
  }

  function renderQuizContent(course) {
    if (workerState.courseQuizFinished) {
      return renderQuizResult(course);
    }

    return `
      <div class="quiz-container">
        <div class="quiz-info-bar">
          <strong>Контрольный тест на допуск к смене</strong>
          <span>Необходимо ответить верно минимум на 4 из 5 вопросов (80%)</span>
        </div>
        <form class="quiz-form" onsubmit="window.Eluma.Worker.submitQuiz(event)">
          ${course.quiz.map((qItem, qIdx) => `
            <div class="quiz-question-card">
              <span class="quiz-q-num">Вопрос ${qIdx + 1} из 5</span>
              <p class="quiz-q-text">${UI.escapeHtml(qItem.q)}</p>
              <div class="quiz-options-list">
                ${qItem.options.map((opt, optIdx) => `
                  <label class="quiz-option-label">
                    <input type="radio" name="quiz_q_${qIdx}" value="${optIdx}" required>
                    <span>${UI.escapeHtml(opt)}</span>
                  </label>
                `).join('')}
              </div>
            </div>
          `).join('')}

          <div class="quiz-actions-bar">
            <button type="submit" class="btn btn-primary-cta">Сдать тест и получить допуск</button>
          </div>
        </form>
      </div>
    `;
  }

  function submitQuiz(e) {
    if (e && e.preventDefault) e.preventDefault();
    const course = Courses.getCourse(workerState.activeCourseId);
    if (!course) return;

    let score = 0;
    const errors = [];

    course.quiz.forEach((qItem, qIdx) => {
      const selected = document.querySelector(`input[name="quiz_q_${qIdx}"]:checked`);
      const val = selected ? parseInt(selected.value, 10) : -1;
      if (val === qItem.correct) {
        score++;
      } else {
        errors.push({ q: qItem.q, explain: qItem.explain });
      }
    });

    workerState.courseScore = score;
    workerState.courseErrors = errors;
    workerState.courseQuizFinished = true;

    if (score >= 4) {
      store.completeCourseTest(course.id, score);
    }
    renderCoursePlayer();
    return { score, isPassed: score >= 4, errors };
  }

  function renderQuizResult(course) {
    const isPassed = workerState.courseScore >= 4;
    return `
      <div class="quiz-result-card ${isPassed ? 'passed' : 'failed'}">
        <div class="result-icon-box">
          ${isPassed ? UI.SVG_ICONS.check : UI.SVG_ICONS.close}
        </div>
        <h2>${isPassed ? 'Поздравляем! Допуск получен' : 'Тест не пройден'}</h2>
        <p class="result-score-text">Ваш результат: <strong>${workerState.courseScore} из 5</strong> (${Math.round((workerState.courseScore / 5) * 100)}%)</p>
        <p class="result-sub-text">
          ${isPassed
            ? 'Допуск к сменам категории «' + UI.escapeHtml(course.category) + '» активен на 12 месяцев.'
            : 'Для допуска необходимо набрать минимум 4 правильных ответа. Повторите уроки и попробуйте снова.'}
        </p>

        ${workerState.courseErrors.length > 0 ? `
          <div class="quiz-errors-explanation">
            <strong>Разбор ошибок:</strong>
            <ul>
              ${workerState.courseErrors.map(err => `<li><strong>${UI.escapeHtml(err.q)}</strong><br>${UI.escapeHtml(err.explain)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <div class="result-actions-row">
          ${isPassed ? `
            ${workerState.returnTo ? `
              <button class="btn btn-primary-cta" onclick="window.Eluma.Worker.completeReturnTo()">
                Вернуться к смене и записаться
              </button>
            ` : `
              <button class="btn btn-primary-cta" onclick="window.Eluma.Worker.navigate('profile')">
                Вернуться в профиль
              </button>
            `}
          ` : `
            <button class="btn btn-primary-cta" onclick="window.Eluma.Worker.retryQuiz()">
              Попробовать снова
            </button>
          `}
        </div>
      </div>
    `;
  }

  function completeReturnTo() {
    const ret = workerState.returnTo;
    workerState.returnTo = null;
    if (ret && ret.orderId) {
      if (ret.action === 'apply') {
        store.applyForOrder(ret.orderId);
      }
      openDetail(ret.orderId);
    } else {
      showScreen('home');
    }
  }

  function retryQuiz() {
    workerState.courseQuizFinished = false;
    workerState.courseLessonIdx = 0;
    renderCoursePlayer();
  }

  function setLesson(idx) {
    workerState.courseLessonIdx = idx;
    renderCoursePlayer();
  }

  function exitCourse() {
    if (workerState.returnTo && workerState.returnTo.orderId) {
      openDetail(workerState.returnTo.orderId);
    } else {
      showScreen('profile');
    }
  }

  function instantPassCourse() {
    const course = Courses.getCourse(workerState.activeCourseId) || Courses.getCourse('safe_intro');
    store.completeCourseTest(course.id, 5);
    workerState.courseQuizFinished = true;
    workerState.courseScore = 5;
    workerState.courseErrors = [];
    workerState.courseLessonIdx = 3;
    UI.showFeedbackToast('Курс сдан (100%)', `Курс «${course.title}» успешно сдан на 100%! Допуск получен.`);
    renderCoursePlayer();
  }

  function setFeedViewMode(mode) {
    workerState.feedViewMode = mode;
    const btnList = document.getElementById('btnViewList');
    const btnMap = document.getElementById('btnViewMap');
    const feedCol = document.getElementById('splitFeedCol');
    const mapCol = document.getElementById('splitMapCol');

    if (mode === 'map') {
      if (btnList) btnList.classList.remove('active');
      if (btnMap) btnMap.classList.add('active');
      if (feedCol) feedCol.classList.add('mobile-hidden');
      if (mapCol) mapCol.classList.add('mobile-visible');
      if (workerState.samaraMap) {
        setTimeout(() => workerState.samaraMap.invalidateSize(), 150);
      }
    } else {
      if (btnList) btnList.classList.add('active');
      if (btnMap) btnMap.classList.remove('active');
      if (feedCol) feedCol.classList.remove('mobile-hidden');
      if (mapCol) mapCol.classList.remove('mobile-visible');
    }
  }

  // --------------------------------------------------------------------------
  // ИНИЦИАЛИЗАЦИЯ
  // --------------------------------------------------------------------------

  function initWorkerApp() {
    UI.applyTheme();
    store.subscribe(() => {
      renderCurrentScreen();
    });
    const initialScreen = store.getTabScreen('worker', 'home');
    showScreen(initialScreen);
  }

  // Экспорт контроллера в глобальный объект
  window.Eluma.Worker = {
    init: initWorkerApp,
    navigate: showScreen,
    openDetail,
    openOrderDrawer,
    closeOrderDrawer,
    cancelMyShift,
    openNpdCabinetModal,
    onSelectPayoutBank,
    openCurrentActiveShift,
    handleDirectApply,
    highlightMapMarker,
    unhighlightMapMarker,
    showMapHoverCard,
    scheduleHideMapHoverCard,
    cancelHideMapHoverCard,
    hideMapHoverCard,
    onRadarHubChange,
    setRadarHub: onRadarHubChange,
    setRadarRadius,
    setSortBy,
    toggleSortDropdown,
    closeSortDropdown,
    selectSortOption,
    toggleFilterChip,
    onPriceRangeChange,
    setRateFilter,
    setDurationFilter,
    setDayFilter,
    resetFilters,
    clearSearch,
    openChatDialog,
    handleSendSplitChat,
    getCurrentDetailOrderId: () => workerState.currentDetailOrderId,
    renderFriendsScreen,
    openCoOpFriendModal,
    selectCoOpFriend,
    confirmCoOpBooking,
    joinFriendShiftDirect,
    filterShiftsForFriend,
    copyReferralCode,
    handleAddFriendSubmit,
    startCourse,
    setLesson,
    submitQuiz,
    retryQuiz,
    exitCourse,
    instantPassCourse,
    completeReturnTo,
    handleTakeShift,
    handleCheckIn,
    handleSubmitProofs,
    uploadPhoto,
    openCounterOffer,
    submitCounterOffer,
    viewFnsReceipt,
    withdrawPayout,
    withdrawAvailablePayout,
    handleSendChat,
    sendQuickChat,
    setFeedViewMode,
    setCategory: (cat) => {
      workerState.selectedCategory = (cat === 'Все' || cat === 'all' || !cat) ? 'all' : cat;
      renderHomeFeed();
    },
    setSearchQuery: (query) => {
      workerState.searchQuery = query;
      renderHomeFeed();
    },
    getCourseScore: () => workerState.courseScore
  };

  window.Eluma.Worker = window.Eluma.Worker;

  // Автостарт при загрузке документа
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initWorkerApp);
    document.addEventListener('click', (e) => {
      const wrap = document.getElementById('workerSortDropdownWrap');
      if (wrap && !wrap.contains(e.target)) {
        closeSortDropdown();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSortDropdown();
      }
    });
  }
})();
