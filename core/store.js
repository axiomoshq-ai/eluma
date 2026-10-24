/**
 * Eluma v15 Production-Grade — core/store.js
 * Единое хранилище, модель данных, шина реактивных событий и финансовый шлюз Eluma Safe
 */

(function () {
  'use strict';

  window.Eluma = window.Eluma || {};
  window.Olksi = window.Eluma; // Алиас для 100% обратной совместимости

  const STORAGE_KEY = 'eluma_db_v15';
  const DEV_MODE_KEY = 'eluma_dev_mode';

  // 1. Единый словарь статусов платформы (единственный источник истины)
  const STATUS_MAP = {
    DRAFT: { key: 'draft', label: 'Черновик', badgeClass: 'badge-status-pill badge-neutral' },
    SEARCHING: { key: 'searching', label: 'Ищем исполнителя', badgeClass: 'badge-status-pill badge-active' },
    APPLIED: { key: 'applied', label: 'Отклик получен', badgeClass: 'badge-status-pill badge-info' },
    ASSIGNED: { key: 'assigned', label: 'Взят вами', badgeClass: 'badge-status-pill badge-assigned' },
    ON_SITE: { key: 'on_site', label: 'На месте (GPS)', badgeClass: 'badge-status-pill badge-warning' },
    IN_REVIEW: { key: 'in_review', label: 'На проверке', badgeClass: 'badge-status-pill badge-warning' },
    REWORK: { key: 'rework', label: 'На доработке', badgeClass: 'badge-status-pill badge-danger' },
    COMPLETED: { key: 'completed', label: 'Завершена', badgeClass: 'badge-status-pill badge-success' },
    CANCELLED: { key: 'cancelled', label: 'Снята', badgeClass: 'badge-status-pill badge-neutral' }
  };

  // Межвкладочный канал
  let broadcastChannel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel('eluma_bus');
    }
  } catch (_) {}

  // 2. Класс Store
  class Store {
    constructor() {
      this.state = null;
      this.listeners = new Set();
      this.init();
    }

    init() {
      // Проверка URL-параметров: ?reset=1
      if (typeof window !== 'undefined' && window.location) {
        const params = new URLSearchParams(window.location.search);
        if (params.get('reset') === '1') {
          this.resetStorage('all');
          try {
            const cleanUrl = window.location.pathname + (params.get('dev') === '1' ? '?dev=1' : '');
            window.history.replaceState({}, document.title, cleanUrl);
          } catch (_) {}
        }
        if (params.get('dev') === '1') {
          try { localStorage.setItem(DEV_MODE_KEY, '1'); } catch (_) {}
        }
      }

      this.load();

      // Слушатели внешних изменений (соседние вкладки)
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('storage', (e) => {
          if (e.key === STORAGE_KEY) {
            this.load(false);
            this.notify('storage_sync');
          }
        });
      }

      if (broadcastChannel) {
        broadcastChannel.onmessage = (msg) => {
          if (msg && msg.data && msg.data.type === 'state_changed') {
            this.load(false);
            this.notify(msg.data.reason || 'broadcast_sync');
          }
        };
      }
    }

    // Загрузка состояния из localStorage
    load(seedIfEmpty = true) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.version === 15) {
            this.state = parsed;
            return;
          }
        }
      } catch (e) {
        console.warn('Ошибка чтения eluma_db_v15 из localStorage:', e);
      }

      if (seedIfEmpty) {
        this.seedInitialData();
      }
    }

    // Сохранение состояния в localStorage
    save(reason = 'update') {
      try {
        if (!this.state) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {
        console.warn('Ошибка сохранения eluma_db_v15:', e);
      }
      this.notify(reason);
      if (broadcastChannel) {
        try {
          broadcastChannel.postMessage({ type: 'state_changed', reason });
        } catch (_) {}
      }
    }

    // Подписка на изменения состояния
    subscribe(callback) {
      this.listeners.add(callback);
      return () => this.listeners.delete(callback);
    }

    notify(reason) {
      this.listeners.forEach((cb) => {
        try { cb(this.state, reason); } catch (err) { console.error('Ошибка в слушателе store:', err); }
      });
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('eluma:state-changed', { detail: { reason } }));
          window.dispatchEvent(new CustomEvent('olksi:state-changed', { detail: { reason } }));
        } catch (_) {}
      }
    }

    // Безопасный сброс (затрагивает строго ключи Eluma)
    resetStorage(scope = 'all') {
      try {
        if (scope === 'all') {
          localStorage.removeItem(STORAGE_KEY);
          const legacy = [
            'olksi_db_v14_2', 'olksi_db_v14_1', 'olksi_db_v14',
            'olksi_smena_session_v13', 'olksi_smena_state_v12', 'olksi_smena_state_v11'
          ];
          legacy.forEach(k => { try { localStorage.removeItem(k); } catch (_) {} });
          try { sessionStorage.clear(); } catch (_) {}
        }
      } catch (_) {}

      this.seedInitialData();
      this.save('reset');
    }

    seedInitialData() {
      const seedModule = (window.Eluma && window.Eluma.Seed) || (window.Olksi && window.Olksi.Seed);
      if (seedModule && typeof seedModule.getInitialDatabase === 'function') {
        this.state = seedModule.getInitialDatabase();
      } else {
        // Минимальный запасной сид
        this.state = {
          version: 15,
          currentUserId: 1,
          currentRoleId: 'worker',
          currentEmployerId: 101,
          users: [],
          workerProfiles: {},
          employerProfiles: {},
          orders: [],
          courseProgress: {},
          reviews: [],
          payouts: [],
          chats: {}
        };
      }
      try {
        if (!localStorage.getItem('eluma_session_active')) {
          localStorage.setItem('eluma_session_active', '1');
        }
        if (!localStorage.getItem('eluma_active_role')) {
          localStorage.setItem('eluma_active_role', 'worker');
        }
      } catch (e) {}
    }

    // ------------------------------------------------------------------------
    // ВЫЧИСЛЯЕМЫЕ СВОЙСТВА И ГЕТТЕРЫ (Derived State)
    // ------------------------------------------------------------------------

    getUser(userId) {
      if (!userId) return null;
      const id = Number(userId) || userId;
      const u = (this.state && this.state.users || []).find(x => x.id === id);
      if (!u) return null;

      const res = Object.assign({}, u);
      if (res.role === 'worker') {
        const prof = this.state.workerProfiles && this.state.workerProfiles[id];
        res.statusTag = (prof && prof.tier === 'pro') ? 'PRO' : 'СМЗ';
        res.rating = prof && prof.rating ? prof.rating.toFixed(2) : '4.96';
        res.avatarText = res.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
      } else {
        res.statusTag = res.type === 'business' ? 'Бизнес' : 'P2P';
        res.avatarText = res.name.slice(0, 2).toUpperCase();
      }
      return res;
    }

    getSamaraHubs() {
      return {
        alabinskaya: { id: 'alabinskaya', name: 'Октябрьский (м. Алабинская)', district: 'Октябрьский р-н', lat: 53.2095, lng: 50.1450 },
        cosmoport: { id: 'cosmoport', name: 'Советский (ТЦ Космопорт)', district: 'Советский р-н', lat: 53.2145, lng: 50.1930 },
        kuybyshev_sq: { id: 'kuybyshev_sq', name: 'Ленинский (пл. Куйбышева)', district: 'Ленинский р-н', lat: 53.1950, lng: 50.1015 },
        viva_land: { id: 'viva_land', name: 'Кировский (Вива Лэнд)', district: 'Кировский р-н', lat: 53.2410, lng: 50.2515 },
        moscow_sh: { id: 'moscow_sh', name: 'Промышленный (Московское ш.)', district: 'Промышленный р-н', lat: 53.2380, lng: 50.2140 },
        samarskiy: { id: 'samarskiy', name: 'Самарский (ул. Куйбышева)', district: 'Самарский р-н', lat: 53.1865, lng: 50.0890 }
      };
    }

    getDistanceKm(lat1, lng1, lat2, lng2) {
      if (!lat1 || !lng1 || !lat2 || !lng2) return 0;
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round(R * c * 10) / 10;
    }

    getWorkerRadarHub() {
      const hubs = this.getSamaraHubs();
      const currentHubId = (this.state && this.state.workerRadarHub) || 'alabinskaya';
      return hubs[currentHubId] || hubs.alabinskaya;
    }

    setWorkerRadarHub(hubId) {
      if (!this.state) return;
      this.state.workerRadarHub = hubId;
      this.save('radar_hub_changed');
    }

    getOrderDistanceForWorker(order, hubId = null) {
      if (!order || !order.lat || !order.lng) return 0;
      const hubs = this.getSamaraHubs();
      const hub = (hubId && hubs[hubId]) || this.getWorkerRadarHub();
      return this.getDistanceKm(hub.lat, hub.lng, order.lat, order.lng);
    }

    getCurrentWorkerProfile() {
      const uid = this.state.currentUserId || 1;
      return (this.state.workerProfiles && this.state.workerProfiles[uid]) || {
        userId: uid,
        baseCompletedShifts: 0,
        rating: 5.0,
        tier: 'standard',
        wallet: { available: 0, hold72h: 0, pending: 0 }
      };
    }

    getCurrentEmployerProfile() {
      const eid = this.state.currentEmployerId || 101;
      return (this.state.employerProfiles && this.state.employerProfiles[eid]) || {
        userId: eid,
        type: 'business',
        companyName: 'ООО «СтройСамара Логистика»',
        escrow: { reserved: 0, available: 50000 }
      };
    }

    // Только заказы текущего работодателя
    getEmployerOrders(employerId = null) {
      const eid = employerId || this.state.currentEmployerId || 101;
      return (this.state.orders || []).filter(o => o.ownerId === eid);
    }

    // Динамический расчёт реального резерва эскроу (с учётом 7% сервисного сбора платформы)
    getEmployerReservedAmount(employerId = null) {
      const eid = employerId || this.state.currentEmployerId || 101;
      const activeStatuses = ['searching', 'applied', 'assigned', 'on_site', 'in_review', 'rework'];
      const activeOrders = (this.state.orders || []).filter(o => o.ownerId === eid && activeStatuses.includes(o.status));
      return activeOrders.reduce((sum, o) => {
        const fee = Math.round((o.rawPrice || 0) * 0.07);
        return sum + (o.rawPrice || 0) + fee;
      }, 0);
    }

    // Синхронизация резерва эскроу работодателя
    syncEmployerEscrow(employerId = null) {
      const eid = employerId || this.state.currentEmployerId || 101;
      if (this.state.employerProfiles && this.state.employerProfiles[eid] && this.state.employerProfiles[eid].escrow) {
        this.state.employerProfiles[eid].escrow.reserved = this.getEmployerReservedAmount(eid);
      }
    }

    // Доступные смены для каталога исполнителя (многомерная фильтрация и сортировка v20)
    getDiscoveryOrders(categoryOrFilters = 'all', query = '', hotOnly = false) {
      let filters = {};
      if (typeof categoryOrFilters === 'object' && categoryOrFilters !== null) {
        filters = Object.assign({}, categoryOrFilters);
      } else {
        filters = {
          category: categoryOrFilters || 'all',
          query: query || '',
          hotOnly: !!hotOnly
        };
      }

      let list = (this.state.orders || []).filter(o => o.status !== 'completed' && o.status !== 'cancelled' && o.status !== 'draft');

      // 1. Категория
      if (filters.category && filters.category !== 'all') {
        list = list.filter(o => o.category === filters.category);
      }

      // 2. Текстовый поиск
      if (filters.query && filters.query.trim()) {
        const q = filters.query.trim().toLowerCase();
        list = list.filter(o =>
          (o.title && o.title.toLowerCase().includes(q)) ||
          (o.district && o.district.toLowerCase().includes(q)) ||
          (o.customerName && o.customerName.toLowerCase().includes(q)) ||
          (o.address && o.address.toLowerCase().includes(q))
        );
      }

      // 3. hotOnly / 2500+
      if (filters.hotOnly) {
        list = list.filter(o => o.rawPrice >= 2500);
      }

      // 4. Радиус гео-радара (maxRadiusKm: 1.5, 3, 5, 99)
      const radius = Number(filters.maxRadiusKm);
      const hubId = filters.hubId || (this.state && this.state.workerRadarHub) || 'alabinskaya';
      if (radius && radius < 90) {
        list = list.filter(o => this.getOrderDistanceForWorker(o, hubId) <= radius);
      }

      // 5. Только с моим допуском (onlyEligible)
      if (filters.onlyEligible) {
        const wid = this.resolveWorkerId(filters.workerId);
        list = list.filter(o => this.canWorkerTakeOrder(wid, o).allowed);
      }

      // 6. Фильтрация по дням (dayFilter: 'today', 'tomorrow')
      if (filters.dayFilter && filters.dayFilter !== 'all') {
        const df = String(filters.dayFilter).toLowerCase();
        if (df === 'today') {
          list = list.filter(o => o.time && o.time.toLowerCase().includes('сегодня'));
        } else if (df === 'tomorrow') {
          list = list.filter(o => o.time && o.time.toLowerCase().includes('завтра'));
        }
      }

      // 7. Минимальная часовая ставка (minHourlyRate: 850)
      if (filters.minHourlyRate) {
        const minRate = Number(filters.minHourlyRate);
        list = list.filter(o => {
          const hours = o.hours || 3;
          const rate = Math.round((o.rawPrice || 0) / hours);
          return rate >= minRate;
        });
      }

      // 8. Возможен торг (onlyNegotiable)
      if (filters.onlyNegotiable) {
        list = list.filter(o => !!o.allowNegotiation);
      }

      // 9. Диапазон цены От / До (minPrice, maxPrice)
      if (filters.minPrice && Number(filters.minPrice) > 0) {
        const minP = Number(filters.minPrice);
        list = list.filter(o => (o.rawPrice || 0) >= minP);
      }
      if (filters.maxPrice && Number(filters.maxPrice) > 0) {
        const maxP = Number(filters.maxPrice);
        list = list.filter(o => (o.rawPrice || 0) <= maxP);
      }

      // 10. Длительность смены (durationGroup: 'short' <= 3ч, 'long' >= 3.5ч)
      if (filters.durationGroup && filters.durationGroup !== 'all') {
        if (filters.durationGroup === 'short') {
          list = list.filter(o => (o.hours || 3) <= 3);
        } else if (filters.durationGroup === 'long') {
          list = list.filter(o => (o.hours || 3) >= 3.5);
        }
      }

      // 11. Только бизнес-заказчики (onlyBusiness)
      if (filters.onlyBusiness) {
        list = list.filter(o => o.orderType === 'business' || (o.customerType && o.customerType.includes('Бизнес')) || (o.customerName && (o.customerName.includes('ООО') || o.customerName.includes('Сеть'))));
      }

      // 12. Бригадные многоместные смены от 2 человек (multiSlots / chkMultiSlots)
      if (filters.multiSlots || filters.chkMultiSlots) {
        list = list.filter(o => (o.slotsTotal || 1) > 1);
      }

      // 13. Смены, где уже записаны друзья (friendsInShift / chkFriendsInShift)
      if (filters.friendsInShift || filters.chkFriendsInShift) {
        list = list.filter(o => {
          const meta = this.getOrderSlotsMeta(o);
          return meta.assignedFriends.length > 0;
        });
      }

      // 14. Сортировка (sortBy: 'distance', 'hourly_desc', 'price_desc', 'urgent', 'slots', 'friends')
      const sortBy = filters.sortBy || 'distance';
      list.sort((a, b) => {
        if (sortBy === 'distance') {
          return this.getOrderDistanceForWorker(a, hubId) - this.getOrderDistanceForWorker(b, hubId);
        } else if (sortBy === 'hourly_desc' || sortBy === 'rate') {
          const rateA = Math.round((a.rawPrice || 0) / (a.hours || 3));
          const rateB = Math.round((b.rawPrice || 0) / (b.hours || 3));
          return rateB - rateA;
        } else if (sortBy === 'price_desc' || sortBy === 'price') {
          return (b.rawPrice || 0) - (a.rawPrice || 0);
        } else if (sortBy === 'urgent') {
          const urgentA = a.isUrgent ? 1 : 0;
          const urgentB = b.isUrgent ? 1 : 0;
          return urgentB - urgentA;
        } else if (sortBy === 'slots') {
          return (b.slotsTotal || 1) - (a.slotsTotal || 1);
        } else if (sortBy === 'friends') {
          const fa = this.getOrderSlotsMeta(a).assignedFriends.length;
          const fb = this.getOrderSlotsMeta(b).assignedFriends.length;
          return fb - fa;
        }
        return 0;
      });

      return list;
    }

    // Подсчёт количества смен по рубрикам маркетплейса с учётом текущих фильтров
    getCategoryCounts(baseFilters = {}) {
      const filtersWithoutCat = Object.assign({}, baseFilters, { category: 'all' });
      const orders = this.getDiscoveryOrders(filtersWithoutCat);
      const counts = {
        all: orders.length,
        'ПВЗ': 0,
        'Помощь на участке': 0,
        'Склад/Ритейл': 0,
        'Физическая помощь': 0,
        'Мелкий ремонт': 0,
        'Курьер': 0
      };
      orders.forEach(o => {
        if (o.category && counts.hasOwnProperty(o.category)) {
          counts[o.category]++;
        }
      });
      return counts;
    }

    // Заказы, на которые записан исполнитель
    getWorkerActiveOrders(workerId = null) {
      const wid = this.resolveWorkerId(workerId);
      return (this.state.orders || []).filter(o => o.assignedWorkerId === wid && o.status !== 'completed' && o.status !== 'cancelled');
    }

    getWorkerCompletedOrders(workerId = null) {
      const wid = this.resolveWorkerId(workerId);
      return (this.state.orders || []).filter(o => o.assignedWorkerId === wid && o.status === 'completed');
    }

    resolveWorkerId(workerId = null) {
      if (workerId === 'worker_experienced') return 1;
      if (workerId === 'worker_newbie') return 2;
      return workerId ? (Number(workerId) || workerId) : (this.state.currentUserId || 1);
    }

    getTabScreen(role, defaultScreen = 'home') {
      try {
        if (typeof sessionStorage !== 'undefined') {
          return sessionStorage.getItem('eluma_' + role + '_screen') || defaultScreen;
        }
      } catch (_) {}
      return defaultScreen;
    }

    setTabScreen(role, screen) {
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('eluma_' + role + '_screen', screen);
        }
      } catch (_) {}
    }

    // Динамический подсчет числа выполненных смен (стаж + выполненные в сессии)
    getWorkerCompletedShiftsCount(workerId = null) {
      const wid = this.resolveWorkerId(workerId);
      const prof = this.state.workerProfiles && this.state.workerProfiles[wid];
      const base = (prof && typeof prof.baseCompletedShifts === 'number') ? prof.baseCompletedShifts : 0;
      const sessionCount = (this.state.orders || []).filter(o => o.assignedWorkerId === wid && o.status === 'completed').length;
      return base + sessionCount;
    }

    // Рейтинг исполнителя
    getWorkerRatingMeta(workerId = null) {
      const wid = this.resolveWorkerId(workerId);
      const prof = this.state.workerProfiles && this.state.workerProfiles[wid];
      const workerReviews = (this.state.reviews || []).filter(r => r.toUserId === wid && r.toRole === 'worker');

      if (prof && prof.rating) {
        return {
          rating: prof.rating.toFixed(2),
          count: (prof.baseCompletedShifts || 0) + workerReviews.length,
          isNewbie: prof.tier === 'standard' || (prof.baseCompletedShifts || 0) < 3,
          stars: prof.rating
        };
      }
      if (workerReviews.length < 3) {
        return { rating: 'Новичок', count: workerReviews.length, isNewbie: true, stars: 5.0 };
      }
      const sum = workerReviews.reduce((acc, r) => acc + (r.stars || 5), 0);
      const avg = (sum / workerReviews.length).toFixed(1);
      return { rating: avg, count: workerReviews.length, isNewbie: false, stars: parseFloat(avg) };
    }

    // Надежность исполнителя (% смен без отмен)
    getWorkerReliability(workerId = null) {
      const count = this.getWorkerCompletedShiftsCount(workerId);
      if (count < 3) return null;
      return '98%'; // 98% без срывов
    }

    // Проверка статуса курса допуска
    getCourseStatus(workerId = null, courseId) {
      const wid = this.resolveWorkerId(workerId);
      const progress = this.state.courseProgress && this.state.courseProgress[wid] && this.state.courseProgress[wid][courseId];
      if (!progress || !progress.passedAt) {
        return { status: 'not_started', label: 'Не пройден', isPassed: false, isExpiring: false };
      }
      const now = Date.now();
      const validUntil = new Date(progress.validUntil).getTime();
      const diffDays = Math.ceil((validUntil - now) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        return { status: 'expired', label: 'Истёк', isPassed: false, isExpiring: false, daysLeft: 0 };
      }
      if (diffDays <= 14) {
        return { status: 'expiring', label: `Истекает через ${diffDays} дн.`, isPassed: true, isExpiring: true, daysLeft: diffDays };
      }
      return { status: 'passed', label: 'Пройден', isPassed: true, isExpiring: false, bestScore: progress.bestScore, validUntil: progress.validUntil };
    }

    getWorkerPassedCourses(workerId = null) {
      const wid = this.resolveWorkerId(workerId);
      const Courses = (window.Eluma && window.Eluma.Courses) || (window.Olksi && window.Olksi.Courses);
      const all = Courses && Courses.getAllCourses ? Courses.getAllCourses() : [];
      const user = this.getUser(wid);
      const userDopuski = (user && user.allowedCategories) || [];

      return all.filter(c => {
        const st = this.getCourseStatus(wid, c.id);
        if (st && st.isPassed) return true;
        if (userDopuski.includes(c.id) || userDopuski.includes(c.category)) return true;
        return false;
      });
    }

    // Допущен ли исполнитель к смене
    canWorkerTakeOrder(workerId = null, order) {
      const wid = this.resolveWorkerId(workerId);
      // 1. Проверяем общий вводный курс
      const introCourse = this.getCourseStatus(wid, 'safe_intro');
      if (!introCourse.isPassed) {
        return { allowed: false, requiredCourseId: 'safe_intro', courseName: 'Правила Eluma Safe и безопасная сделка' };
      }
      // 2. Проверяем курс по категории заказа
      const catCourseId = 'course_' + (order.category || 'Склад/Ритейл');
      const catCourse = this.getCourseStatus(wid, catCourseId);
      if (!catCourse.isPassed) {
        return { allowed: false, requiredCourseId: catCourseId, courseName: order.category };
      }
      return { allowed: true };
    }

    isWorkerEligibleForCategory(category, workerId = null) {
      const wid = this.resolveWorkerId(workerId);
      if (category === 'safe_intro') {
        const intro = this.getCourseStatus(wid, 'safe_intro');
        return intro && intro.isPassed;
      }
      const intro = this.getCourseStatus(wid, 'safe_intro');
      if (!intro.isPassed) return false;
      const catCourse = this.getCourseStatus(wid, 'course_' + category);
      return catCourse && catCourse.isPassed;
    }

    // Метаданные слотов смены и участие напарников
    getOrderSlotsMeta(order, workerId = null) {
      if (!order) {
        return { total: 1, filled: 0, left: 1, isFull: false, isWorkerAssigned: false, assignedFriends: [], assignedUsers: [] };
      }
      const wid = this.resolveWorkerId(workerId);
      const total = Number(order.slotsTotal) || 1;
      let assignedIds = [];
      if (Array.isArray(order.assignedWorkerIds)) {
        assignedIds = [...order.assignedWorkerIds];
      } else if (order.assignedWorkerId) {
        assignedIds = [order.assignedWorkerId];
      }
      // Убираем дубликаты
      assignedIds = Array.from(new Set(assignedIds));

      const filled = assignedIds.length;
      const left = Math.max(0, total - filled);
      const isFull = left === 0;
      const isWorkerAssigned = assignedIds.includes(wid) || order.assignedWorkerId === wid;

      const friendsList = this.state.friends || [];
      const usersList = this.state.users || [];

      const assignedFriends = friendsList.filter(f => assignedIds.includes(f.userId));
      const assignedUsers = usersList.filter(u => assignedIds.includes(u.id));

      return {
        total,
        filled,
        left,
        isFull,
        isWorkerAssigned,
        assignedFriends,
        assignedUsers
      };
    }

    // Список друзей-напарников текущего пользователя
    getFriends() {
      return this.state.friends || [];
    }

    // Сводная статистика совместных смен (Co-Op)
    getCoOpStats() {
      const friends = this.getFriends();
      const totalCoOpShifts = friends.reduce((sum, f) => sum + (Number(f.coOpCount || f.CoOpCount) || 0), 0);
      return {
        totalFriends: friends.length,
        totalCoOpShifts: totalCoOpShifts || 11,
        coOpShiftsTotal: totalCoOpShifts || 11,
        activeBuddiesCount: friends.length,
        buddiesCount: friends.length,
        referralCode: 'ELUMA-SAMARA-63'
      };
    }

    // Проверка конфликта времени с уже взятыми сменами
    getTimeConflictOrder(workerId = null, targetOrder) {
      if (!targetOrder || !targetOrder.time) return null;
      const wid = this.resolveWorkerId(workerId);
      const activeOrders = this.getWorkerActiveOrders(wid);

      function parseTimeSlot(timeStr) {
        if (!timeStr) return null;
        const s = timeStr.toLowerCase();
        let day = 'other';
        if (s.includes('сегодня')) day = 'today';
        else if (s.includes('завтра')) day = 'tomorrow';
        else if (s.includes('послезавтра')) day = 'after_tomorrow';

        // Ищем часы формата 16:00 – 18:30 или 16:00 - 18:30
        const match = timeStr.match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/);
        if (!match) return null;
        const startH = parseInt(match[1], 10) + parseInt(match[2], 10) / 60;
        const endH = parseInt(match[3], 10) + parseInt(match[4], 10) / 60;
        return { day, start: startH, end: endH };
      }

      const targetSlot = parseTimeSlot(targetOrder.time);
      if (!targetSlot) return null;

      for (const order of activeOrders) {
        if (order.id === targetOrder.id) continue;
        const slot = parseTimeSlot(order.time);
        if (slot && slot.day === targetSlot.day) {
          // Интервалы [startA, endA] и [startB, endB] пересекаются если startA < endB && startB < endA
          if (targetSlot.start < slot.end && slot.start < targetSlot.end) {
            return order;
          }
        }
      }
      return null;
    }

    // Детальная налоговая сводка НПД
    getWorkerTaxSummary(workerId = null) {
      const wid = this.resolveWorkerId(workerId);
      const payouts = (this.state.payouts || []).filter(p => !p.isWithdrawal);

      let flIncome = 0;
      let ulIncome = 0;

      payouts.forEach(p => {
        const amt = Math.abs(p.amount || 0);
        const title = (p.title || '').toLowerCase();
        // Если в названии указано частный / физлицо или Елена В. — ставка 4%, иначе юрлицо 6%
        if (title.includes('елена') || title.includes('частн') || title.includes('переезд')) {
          flIncome += amt;
        } else {
          ulIncome += amt;
        }
      });

      const totalIncome = flIncome + ulIncome;
      const flTax = Math.round(flIncome * 0.04);
      const ulTax = Math.round(ulIncome * 0.06);
      const totalTax = flTax + ulTax;
      const effectiveRate = totalIncome > 0 ? (totalTax / totalIncome * 100).toFixed(1) : '4.8';

      return {
        totalIncome,
        totalEarned: totalIncome,
        flIncome,
        ulIncome,
        flTax,
        taxFl: flTax,
        ulTax,
        taxUl: ulTax,
        totalTax,
        effectiveRate
      };
    }

    // ------------------------------------------------------------------------
    // ДЕЙСТВИЯ (MUTATIONS)
    // ------------------------------------------------------------------------

    // Откликнуться на смену (прямой отклик либо встречное предложение цены, поддержка записи с напарником)
    applyForOrder(orderId, workerId = null, counterPrice = null, counterComment = null, friendIds = []) {
      const wid = this.resolveWorkerId(workerId);
      const order = (this.state.orders || []).find(o => o.id === orderId);
      if (!order) return { success: false, error: 'Заказ не найден' };

      const check = this.canWorkerTakeOrder(wid, order);
      if (!check.allowed) {
        return { success: false, needsCourse: true, requiredCourseId: check.requiredCourseId, courseName: check.courseName };
      }

      const workerUser = (this.state.users || []).find(u => u.id === wid);
      const workerName = workerUser ? workerUser.name : 'Исполнитель';

      if (counterPrice && counterPrice !== order.rawPrice) {
        // Честное встречное предложение цены (P2P торг): статус 'applied', без самоназначения
        order.status = 'applied';
        order.counterOffer = {
          workerId: wid,
          workerName: workerName,
          price: counterPrice,
          originalPrice: order.rawPrice,
          comment: counterComment || 'Готов выполнить по предложенной ставке'
        };

        this.addChatMessage(
          order.id,
          'worker',
          `Предложена ставка ${counterPrice.toLocaleString('ru-RU')} ₽: «${counterComment || 'Готов приступить к выполнению'}». Ожидает решения заказчика.`
        );

        this.save('counter_offer_submitted');
        return { success: true, order, isCounter: true };
      }

      // Прямой отклик / взятие смены с учётом слотов
      if (!Array.isArray(order.assignedWorkerIds)) {
        order.assignedWorkerIds = order.assignedWorkerId ? [order.assignedWorkerId] : [];
      }

      if (!order.assignedWorkerIds.includes(wid)) {
        order.assignedWorkerIds.push(wid);
      }

      // Добавляем друзей если переданы и есть доступные слоты
      const validFriendIds = Array.isArray(friendIds) ? friendIds : (friendIds ? [friendIds] : []);
      const bookedFriendNames = [];
      const totalSlots = order.slotsTotal || 1;

      validFriendIds.forEach(fid => {
        if (order.assignedWorkerIds.length < totalSlots && !order.assignedWorkerIds.includes(fid)) {
          order.assignedWorkerIds.push(fid);
          const fObj = (this.state.friends || []).find(f => f.userId === fid);
          if (fObj) {
            bookedFriendNames.push(fObj.name);
            fObj.coOpCount = (fObj.coOpCount || 0) + 1;
            fObj.CoOpCount = fObj.coOpCount;
            fObj.statusText = 'Записан с вами на смену';
          }
        }
      });

      // 100% обратная совместимость со всеми существующими тестами
      order.assignedWorkerId = wid;
      order.status = 'assigned';
      order.step = 1;

      let chatMsg = `Исполнитель ${workerName} подтвердил участие в смене. Ожидается прибытие по GPS.`;
      if (bookedFriendNames.length > 0) {
        chatMsg = `Исполнитель ${workerName} подтвердил участие в смене вместе с напарником (${bookedFriendNames.join(', ')}). Ожидается прибытие по GPS.`;
      }

      this.addChatMessage(order.id, 'worker', chatMsg);
      this.save('order_applied');
      return { success: true, order, isCounter: false, bookedFriends: bookedFriendNames };
    }

    // Совместная запись на смену с другом в 1 клик
    bookShiftWithFriend(orderId, friendUserId, workerId = null) {
      return this.applyForOrder(orderId, workerId, null, null, [friendUserId]);
    }

    // Пригласить друга в уже открытую смену (если есть свободные слоты)
    inviteFriendToShift(orderId, friendUserId, workerId = null) {
      const order = (this.state.orders || []).find(o => o.id === orderId);
      if (!order) return { success: false, error: 'Смена не найдена' };

      const meta = this.getOrderSlotsMeta(order, workerId);
      if (meta.left <= 0) {
        return { success: false, error: 'Все слоты в смене уже заняты' };
      }

      if (!Array.isArray(order.assignedWorkerIds)) {
        order.assignedWorkerIds = order.assignedWorkerId ? [order.assignedWorkerId] : [];
      }

      if (!order.assignedWorkerIds.includes(friendUserId)) {
        order.assignedWorkerIds.push(friendUserId);
      }

      const friend = (this.state.friends || []).find(f => f.userId === friendUserId);
      const friendName = friend ? friend.name : 'Напарник';
      if (friend) {
        friend.coOpCount = (friend.coOpCount || 0) + 1;
        friend.CoOpCount = friend.coOpCount;
        friend.statusText = 'Приглашён в вашу смену';
      }

      this.addChatMessage(
        order.id,
        'worker',
        `К смене присоединился напарник ${friendName}. Свободно мест: ${Math.max(0, (order.slotsTotal || 1) - order.assignedWorkerIds.length)}.`
      );

      this.save('friend_invited_to_shift');
      return { success: true, order, friend, inviteCode: `ELUMA-INV-${order.id}-${friendUserId}` };
    }

    // Добавить друга-напарника по контакту
    addFriendByContact(name, phone, roleTag = 'Напарник · Склад') {
      if (!name || !phone) return { success: false, error: 'Укажите имя и телефон' };
      if (!this.state.friends) this.state.friends = [];

      const existingFriend = this.state.friends.find(f => f.phone === phone);
      if (existingFriend) {
        return { success: true, friend: existingFriend, alreadyExists: true };
      }

      const allIds = [
        ...(this.state.users || []).map(u => u.id),
        ...this.state.friends.map(f => f.userId)
      ];
      const nextId = Math.max(...allIds, 5) + 1;

      const newFriend = {
        userId: nextId,
        name: name.trim(),
        phone: phone.trim(),
        rating: '5.00',
        shifts: 0,
        coOpCount: 0,
        CoOpCount: 0,
        roleTag: roleTag.trim() || 'Напарник · Склад',
        statusText: 'Новый контакт · Готов к совместным выходам',
        allowedCategories: ['Физическая помощь', 'Склад/Ритейл', 'ПВЗ']
      };

      this.state.friends.push(newFriend);

      if (!this.state.users) this.state.users = [];
      this.state.users.push({
        id: nextId,
        role: 'worker',
        name: newFriend.name,
        phone: newFriend.phone,
        city: 'Самара',
        createdAt: new Date().toLocaleDateString('ru-RU'),
        specialization: newFriend.roleTag,
        rating: 5.0,
        shifts: 0
      });

      this.save('friend_added');
      return { success: true, friend: newFriend };
    }

    // Решение заказчика по встречному предложению цены
    resolveCounterOffer(orderId, accept) {
      const order = (this.state.orders || []).find(o => o.id === orderId);
      if (!order || !order.counterOffer) return { success: false, error: 'Встречное предложение не найдено' };

      const eid = order.ownerId || this.state.currentEmployerId || 101;
      const empProf = this.state.employerProfiles && this.state.employerProfiles[eid];

      if (accept) {
        const newPrice = order.counterOffer.price;
        const diff = newPrice - order.rawPrice;
        const diffWithFee = Math.round(diff * 1.07);

        // Если цена выросла, проверяем и дорезервируем из доступного эскроу
        if (diffWithFee > 0 && empProf && empProf.escrow) {
          if (empProf.escrow.available < diffWithFee) {
            empProf.escrow.available += (diffWithFee + 5000); // авто-пополнение демо-баланса
          }
          empProf.escrow.available -= diffWithFee;
        } else if (diffWithFee < 0 && empProf && empProf.escrow) {
          empProf.escrow.available += Math.abs(diffWithFee); // возврат разницы заказчику
        }

        order.rawPrice = newPrice;
        order.price = `${newPrice.toLocaleString('ru-RU')} ₽`;
        order.assignedWorkerId = order.counterOffer.workerId;
        order.status = 'assigned';
        order.step = 1;
        const acceptedWorker = order.counterOffer.workerName;
        order.counterOffer = null;

        this.addChatMessage(
          order.id,
          'employer',
          `Заказчик принял ставку ${order.price}. Смена назначена исполнителю ${acceptedWorker}. Разница эскроу скорректирована.`
        );
      } else {
        order.counterOffer = null;
        order.status = 'searching';
        this.addChatMessage(
          order.id,
          'employer',
          'Заказчик отклонил встречное предложение цены. Заказ возвращён в открытый поиск Самары.'
        );
      }

      this.syncEmployerEscrow(eid);
      this.save('counter_offer_resolved');
      return { success: true, newPrice: order.rawPrice, accepted: accept };
    }

    // Отметка о прибытии по GPS на объект
    checkInOrderLocation(orderId, coords = '53.2185, 50.1642 (Самара, точность 5м)') {
      const order = (this.state.orders || []).find(o => o.id === orderId);
      if (!order) return false;

      order.status = 'on_site';
      order.step = 2;
      if (!order.proofs) order.proofs = {};
      order.proofs.coords = coords;

      this.addChatMessage(
        order.id,
        'system',
        'Геолокация подтверждена по GPS Самары: исполнитель на месте. Фотофиксация разблокирована.'
      );

      this.save('order_checkin');
      return true;
    }

    // Сдача фотоотчёта ДО/ПОСЛЕ
    submitOrderProofs(orderId, beforePhoto, afterPhoto) {
      const order = (this.state.orders || []).find(o => o.id === orderId);
      if (!order) return false;

      order.status = 'in_review';
      order.step = 3;
      if (!order.proofs) order.proofs = {};
      order.proofs.before = beforePhoto;
      order.proofs.after = afterPhoto;
      order.proofs.submittedAt = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

      this.addChatMessage(
        order.id,
        'worker',
        'Фотоотчёт ДО и ПОСЛЕ сдан на приёмку заказчику.'
      );

      this.save('order_proofs_submitted');
      return true;
    }

    // Добавление сообщения в чат сделки
    addChatMessage(orderId, sender, text) {
      if (!this.state.chats) this.state.chats = {};
      if (!this.state.chats[orderId]) this.state.chats[orderId] = [];
      const msg = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        sender: sender, // 'system' | 'worker' | 'employer'
        text: text,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      };
      this.state.chats[orderId].push(msg);
      this.save('chat_message');
      return msg;
    }

    // Двухуровневая приёмка смены заказчиком и выплата (Профи: СБП 15 мин, Новичок: холд 72 ч)
    approveShiftAndPay(orderId) {
      const order = (this.state.orders || []).find(o => o.id === orderId);
      if (!order) return false;

      order.status = 'completed';
      order.step = 4;
      order.completedAt = new Date().toLocaleDateString('ru-RU');

      const wid = order.assignedWorkerId || this.state.currentUserId || 1;
      const reward = order.rawPrice || 2400;

      if (!this.state.workerProfiles[wid]) {
        this.state.workerProfiles[wid] = { wallet: { available: 0, hold72h: 0, pending: 0 } };
      }
      if (!this.state.workerProfiles[wid].wallet) {
        this.state.workerProfiles[wid].wallet = { available: 0, hold72h: 0, pending: 0 };
      }
      if (typeof this.state.workerProfiles[wid].wallet.hold72h !== 'number') {
        this.state.workerProfiles[wid].wallet.hold72h = 0;
      }

      // Проверка уровня: Профи (>= 10 смен и рейтинг >= 4.8) vs Стандарт (холд 72 ч)
      const completedCount = this.getWorkerCompletedShiftsCount(wid);
      const ratingMeta = this.getWorkerRatingMeta(wid);
      const isPro = completedCount >= 10 && ratingMeta.stars >= 4.8;

      let fnsStatus = '';
      let chatMessageText = '';
      const receiptNum = 84100 + Math.floor(Math.random() * 899);

      if (isPro) {
        this.state.workerProfiles[wid].wallet.available = (this.state.workerProfiles[wid].wallet.available || 0) + reward;
        fnsStatus = 'Выплачено за 15 мин (Профи 4.8+)';
        chatMessageText = `Работа принята заказчиком. ${order.price} переведены исполнителю по СБП за 15 мин (Профи 4.8+). Сформирован чек ФНС № НПД-${receiptNum}.`;
      } else {
        this.state.workerProfiles[wid].wallet.hold72h = (this.state.workerProfiles[wid].wallet.hold72h || 0) + reward;
        fnsStatus = 'Зачислено в гарантийный холд 72 ч';
        chatMessageText = `Работа принята заказчиком. ${order.price} зачислены в гарантийный холд 72 ч (защита качества Eluma). Сформирован чек ФНС № НПД-${receiptNum}.`;
      }

      // Пересчёт эскроу заказчика
      const eid = order.ownerId || 101;
      this.syncEmployerEscrow(eid);

      // Запись в историю выплат
      if (!this.state.payouts) this.state.payouts = [];
      this.state.payouts.unshift({
        id: Date.now(),
        orderId: order.id,
        workerId: wid,
        title: `Выплата по заказу #${order.id}: ${order.title}`,
        date: isPro ? 'Сегодня • Т-Банк СБП (15 мин)' : 'Сегодня • Гарантийный холд 72 ч',
        amount: reward,
        receiptNum: receiptNum,
        fnsStatus: fnsStatus,
        isHold: !isPro
      });

      this.addChatMessage(order.id, 'system', chatMessageText);
      this.save('order_accepted');
      return true;
    }

    // Приёмка работы (алиас)
    acceptOrderWork(orderId) {
      return this.approveShiftAndPay(orderId);
    }

    // Возврат работы на доработку (rework)
    reworkOrder(orderId, reasonText) {
      const order = (this.state.orders || []).find(o => o.id === orderId);
      if (!order) return false;

      order.status = 'rework';
      order.step = 2; // возврат на этап исправления фотоотчёта
      order.reworkReason = reasonText || 'Требуется исправление замечаний заказчика';

      this.addChatMessage(
        order.id,
        'employer',
        `Заказ возвращён на доработку. Замечания заказчика: «${order.reworkReason}». Пожалуйста, устраните замечания и переснимите фото.`
      );

      this.save('order_rework');
      return true;
    }

    // Отмена заказа заказчиком (с удержанием 400 ₽ штрафа после подтверждения GPS)
    cancelOrderByEmployer(orderId) {
      const order = (this.state.orders || []).find(o => o.id === orderId);
      if (!order) return false;

      const eid = order.ownerId || 101;
      const empProf = this.state.employerProfiles && this.state.employerProfiles[eid];
      const totalReserved = Math.round(order.rawPrice * 1.07);

      if (order.status === 'on_site' || order.step >= 2) {
        // Штраф 400 ₽ за ложный вызов после прибытия исполнителя по GPS
        const penalty = 400;
        const refund = Math.max(0, totalReserved - penalty);
        const wid = order.assignedWorkerId || 1;

        if (this.state.workerProfiles && this.state.workerProfiles[wid]) {
          const wWallet = this.state.workerProfiles[wid].wallet;
          wWallet.available = (wWallet.available || 0) + penalty;
        }

        if (empProf && empProf.escrow) {
          empProf.escrow.available = (empProf.escrow.available || 0) + refund;
        }

        order.status = 'cancelled';
        this.addChatMessage(
          order.id,
          'system',
          `Заказчик отменил смену после прибытия исполнителя. Удержана компенсация 400 ₽ в пользу исполнителя. Остаток (${refund} ₽) возвращён заказчику.`
        );
      } else {
        // До прибытия: полный возврат средств эскроу заказчику
        if (empProf && empProf.escrow) {
          empProf.escrow.available = (empProf.escrow.available || 0) + totalReserved;
        }
        order.status = 'cancelled';
        this.addChatMessage(
          order.id,
          'system',
          `Заказ снят с публикации. Полная сумма резерва (${totalReserved} ₽) возвращена на доступный баланс эскроу.`
        );
      }

      this.syncEmployerEscrow(eid);
      this.save('order_cancelled');
      return true;
    }

    // Вывод доступных средств по СБП
    withdrawAvailablePayout(workerId = null) {
      const wid = this.resolveWorkerId(workerId);
      const prof = this.state.workerProfiles && this.state.workerProfiles[wid];
      if (!prof || !prof.wallet || prof.wallet.available <= 0) {
        return { success: false, error: 'Нет доступных средств для вывода' };
      }

      const amount = prof.wallet.available;
      prof.wallet.available = 0;
      const receiptNum = 84200 + Math.floor(Math.random() * 799);

      if (!this.state.payouts) this.state.payouts = [];
      this.state.payouts.unshift({
        id: Date.now(),
        orderId: null,
        workerId: wid,
        title: `Вывод по СБП на ${prof.payoutAccount}`,
        date: 'Сегодня • Выведено на карту (СБП)',
        amount: amount,
        receiptNum: receiptNum,
        fnsStatus: 'Успешно переведено без комиссии',
        isWithdrawal: true
      });

      this.save('payout_withdrawn');
      return { success: true, amount, account: prof.payoutAccount };
    }

    // Создание нового заказа работодателем
    createOrder(orderData) {
      const eid = orderData.ownerId || this.state.currentEmployerId || 101;
      const empProf = this.state.employerProfiles && this.state.employerProfiles[eid];
      const fee = Math.round(orderData.rawPrice * 0.07);
      const totalEscrow = orderData.rawPrice + fee;

      // Списание с доступного баланса
      if (empProf && empProf.escrow) {
        if (empProf.escrow.available < totalEscrow) {
          empProf.escrow.available += (totalEscrow + 10000); // авто-пополнение демо-баланса
        }
        empProf.escrow.available -= totalEscrow;
      }

      const newId = (this.state.orders || []).reduce((max, o) => Math.max(max, o.id), 0) + 1;
      const fullOrder = Object.assign({
        id: newId,
        ownerId: eid,
        status: 'searching',
        step: 0,
        slotsTotal: Number(orderData.slotsTotal) || 1,
        assignedWorkerIds: Array.isArray(orderData.assignedWorkerIds) ? orderData.assignedWorkerIds : [],
        proofs: { before: null, after: null, coords: null }
      }, orderData);

      if (!Array.isArray(fullOrder.assignedWorkerIds)) {
        fullOrder.assignedWorkerIds = [];
      }
      if (!fullOrder.slotsTotal || fullOrder.slotsTotal < 1) {
        fullOrder.slotsTotal = 1;
      }

      if (!this.state.orders) this.state.orders = [];
      this.state.orders.unshift(fullOrder);

      this.addChatMessage(
        newId,
        'system',
        `Смена успешно опубликована. Вознаграждение ${fullOrder.price} + сбор 7% (${fee} ₽) зарезервированы в Eluma Safe.`
      );

      this.syncEmployerEscrow(eid);
      this.save('order_created');
      return fullOrder;
    }

    // Отмена записи исполнителем (до подтверждения GPS)
    cancelOrderByWorker(orderId) {
      const order = (this.state.orders || []).find(o => o.id === orderId);
      if (!order) return { success: false, error: 'Заказ не найден' };

      const prevStatus = order.status;
      order.assignedWorkerId = null;
      order.status = 'searching';
      order.step = 0;
      order.counterOffer = null;

      this.addChatMessage(
        order.id,
        'system',
        'Исполнитель отказался от смены. Заказ возвращён в открытый поиск Самары.'
      );

      this.save('worker_cancelled_shift');
      return { success: true, order, prevStatus };
    }

    // Смена банка выплат СБП
    updateWorkerPayoutBank(bankName, workerId = null) {
      const wid = this.resolveWorkerId(workerId);
      if (!this.state.workerProfiles) this.state.workerProfiles = {};
      if (!this.state.workerProfiles[wid]) this.state.workerProfiles[wid] = {};
      this.state.workerProfiles[wid].payoutAccount = bankName;
      this.save('worker_bank_updated');
      return this.state.workerProfiles[wid];
    }

    // Быстрое переключение демо-профиля
    switchProfile(userId, role = null) {
      const id = Number(userId) || userId;
      const user = this.getUser(id);
      const targetRole = role || (user ? user.role : 'worker');

      this.state.currentUserId = id;
      this.state.currentRoleId = targetRole;

      if (targetRole === 'employer') {
        this.state.currentEmployerId = id;
      }

      this.save('profile_switched');
      return { success: true, user, role: targetRole };
    }

    // Сдача теста курса
    completeCourseTest(courseId, score, workerId = null) {
      const wid = this.resolveWorkerId(workerId);
      if (!this.state.courseProgress) this.state.courseProgress = {};
      if (!this.state.courseProgress[wid]) this.state.courseProgress[wid] = {};

      const d = new Date();
      const validDate = new Date();
      validDate.setFullYear(d.getFullYear() + 1);

      this.state.courseProgress[wid][courseId] = {
        courseId: courseId,
        version: 1,
        status: 'passed',
        bestScore: score,
        passedAt: d.toLocaleDateString('ru-RU'),
        validUntil: validDate.toLocaleDateString('ru-RU')
      };

      this.save('course_passed');
      return this.state.courseProgress[wid][courseId];
    }
  }

  // Создаем глобальный синглтон
  window.Eluma.STATUS_MAP = STATUS_MAP;
  window.Eluma.store = new Store();
  window.Olksi.STATUS_MAP = STATUS_MAP;
  window.Olksi.store = window.Eluma.store;
})();
