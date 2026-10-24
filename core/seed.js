/**
 * Eluma v18 Production-Grade — core/seed.js
 * Эталонная база данных Самары (3 профиля заказчиков, 2 профиля исполнителей, 18 смен, 0 предустановленных GPS-меток)
 * Интерливинг смен для разнообразия первого экрана (Anti-Vibe-Code v18)
 */

(function () {
  'use strict';

  window.Eluma = window.Eluma || {};
  window.Olksi = window.Eluma;

  function getInitialDatabase() {
    return {
      version: 18,
      currentUserId: 1, // По умолчанию: Алексей К. (Профи)
      currentRoleId: 'worker', // 'worker' | 'employer'
      currentEmployerId: 101, // По умолчанию: ООО «СтройСамара Логистика»

      // Список зарегистрированных пользователей Самары
      users: [
        {
          id: 1,
          role: 'worker',
          name: 'Алексей К.',
          phone: '+7 (927) 700-12-34',
          city: 'Самара',
          createdAt: '12.01.2026'
        },
        {
          id: 2,
          role: 'worker',
          name: 'Дмитрий М.',
          phone: '+7 (917) 111-22-33',
          city: 'Самара',
          createdAt: '10.10.2026',
          specialization: 'Склад / Грузчик',
          rating: 4.78,
          shifts: 8
        },
        {
          id: 3,
          role: 'worker',
          name: 'Максим Волков',
          phone: '+7 (927) 654-32-10',
          city: 'Самара',
          createdAt: '01.09.2026',
          specialization: 'Склад / ПВЗ',
          rating: 4.94,
          shifts: 19
        },
        {
          id: 4,
          role: 'worker',
          name: 'Артём Самойлов',
          phone: '+7 (937) 900-44-55',
          city: 'Самара',
          createdAt: '15.08.2026',
          specialization: 'Курьер / Участок',
          rating: 4.91,
          shifts: 15
        },
        {
          id: 5,
          role: 'worker',
          name: 'Кирилл Демидов',
          phone: '+7 (927) 210-77-88',
          city: 'Самара',
          createdAt: '05.07.2026',
          specialization: 'Монтаж / Ремонт',
          rating: 4.89,
          shifts: 11
        },
        {
          id: 6,
          role: 'worker',
          name: 'Иван С.',
          phone: '+7 (927) 300-44-55',
          city: 'Самара',
          createdAt: '01.06.2026',
          specialization: 'Склад / Комплектовщик',
          rating: 4.88,
          shifts: 14
        },
        {
          id: 7,
          role: 'worker',
          name: 'Павел Н.',
          phone: '+7 (937) 400-66-77',
          city: 'Самара',
          createdAt: '20.05.2026',
          specialization: 'Грузчик / Монтаж',
          rating: 4.85,
          shifts: 12
        },
        {
          id: 101,
          role: 'employer',
          type: 'business',
          name: 'ООО «СтройСамара Логистика»',
          companyName: 'ООО «СтройСамара Логистика»',
          phone: '+7 (846) 200-50-50',
          city: 'Самара',
          createdAt: '05.02.2026'
        },
        {
          id: 102,
          role: 'employer',
          type: 'private',
          name: 'Елена В.',
          companyName: 'Частный заказчик',
          phone: '+7 (927) 888-99-00',
          city: 'Самара',
          createdAt: '15.08.2026'
        },
        {
          id: 103,
          role: 'employer',
          type: 'business',
          name: 'Сеть ПВЗ и Ритейл «Самара Маркет»',
          companyName: 'Сеть ПВЗ и Ритейл «Самара Маркет»',
          phone: '+7 (846) 310-80-80',
          city: 'Самара',
          createdAt: '20.03.2026'
        }
      ],

      // Профили исполнителей
      workerProfiles: {
        1: {
          userId: 1,
          baseCompletedShifts: 12,
          rating: 4.96,
          tier: 'pro',
          taxStatus: 'npd',
          npdVerifiedAt: '15.01.2026',
          payoutAccount: 'Т-Банк •••• 8412 (СБП)',
          wallet: { available: 14850, hold72h: 0, pending: 0 },
          onboarding: { form: true, npd: true, sbp: true }
        },
        2: {
          userId: 2,
          baseCompletedShifts: 8,
          rating: 4.78,
          tier: 'standard',
          taxStatus: 'npd',
          npdVerifiedAt: '10.10.2026',
          payoutAccount: 'Сбербанк •••• 1094 (СБП)',
          wallet: { available: 1900, hold72h: 0, pending: 0 },
          onboarding: { form: true, npd: true, sbp: true }
        },
        3: {
          userId: 3,
          baseCompletedShifts: 19,
          rating: 4.94,
          tier: 'pro',
          taxStatus: 'npd',
          npdVerifiedAt: '01.09.2026',
          payoutAccount: 'Т-Банк •••• 9921 (СБП)',
          wallet: { available: 5200, hold72h: 0, pending: 0 },
          onboarding: { form: true, npd: true, sbp: true }
        },
        4: {
          userId: 4,
          baseCompletedShifts: 15,
          rating: 4.91,
          tier: 'pro',
          taxStatus: 'npd',
          npdVerifiedAt: '15.08.2026',
          payoutAccount: 'Альфа-Банк •••• 3341 (СБП)',
          wallet: { available: 4100, hold72h: 0, pending: 0 },
          onboarding: { form: true, npd: true, sbp: true }
        },
        5: {
          userId: 5,
          baseCompletedShifts: 11,
          rating: 4.89,
          tier: 'standard',
          taxStatus: 'npd',
          npdVerifiedAt: '05.07.2026',
          payoutAccount: 'ВТБ •••• 7712 (СБП)',
          wallet: { available: 3300, hold72h: 0, pending: 0 },
          onboarding: { form: true, npd: true, sbp: true }
        }
      },

      // Список друзей-напарников текущего исполнителя в Самаре
      friends: [
        { userId: 2, name: 'Дмитрий М.', phone: '+7 (917) 111-22-33', rating: '4.78', shifts: 8, coOpCount: 3, CoOpCount: 3, roleTag: 'Склад · Погрузка', statusText: 'Уже записан на смену сегодня', allowedCategories: ['Физическая помощь', 'Склад/Ритейл'] },
        { userId: 3, name: 'Максим Волков', phone: '+7 (927) 654-32-10', rating: '4.94', shifts: 19, coOpCount: 5, CoOpCount: 5, roleTag: 'ПВЗ · ТСД-комплектовка', statusText: 'Свободен · Готов выйти за компанию', allowedCategories: ['ПВЗ', 'Склад/Ритейл', 'Физическая помощь'] },
        { userId: 4, name: 'Артём Самойлов', phone: '+7 (937) 900-44-55', rating: '4.91', shifts: 15, coOpCount: 2, CoOpCount: 2, roleTag: 'Курьер · Участок', statusText: 'Свободен после 14:00', allowedCategories: ['Курьер', 'Помощь на участке', 'Физическая помощь'] },
        { userId: 5, name: 'Кирилл Демидов', phone: '+7 (927) 210-77-88', rating: '4.89', shifts: 11, coOpCount: 1, CoOpCount: 1, roleTag: 'Сборка мебели · Склад', statusText: 'Свободен завтра', allowedCategories: ['Мелкий ремонт', 'Склад/Ритейл'] }
      ],

      // Профили заказчиков (3 профиля с чистым разделением)
      employerProfiles: {
        101: {
          userId: 101,
          type: 'business',
          companyName: 'ООО «СтройСамара Логистика»',
          verified: true,
          sites: [
            {
              id: 'site-1',
              name: 'Логистический комплекс «Кировский»',
              address: 'Самара, пр. Кирова, 147',
              district: 'Кировский р-н',
              type: 'Складской терминал класса А',
              coords: '53.2384, 50.2189',
              officer: 'Иванов С.П. (Инженер по ОТ)',
              phone: '+7 (927) 800-44-12',
              memo: 'Въезд через КПП-2 со стороны ул. Береговой. Охраннику предъявить паспорт для временного пропуска. Спецодежда, защитные перчатки и рохли выдаются у диспетчера смены. Код от калитки склада: #4210.',
              activeShiftsCount: 2
            },
            {
              id: 'site-2',
              name: 'Центральный распределительный склад №2',
              address: 'Самара, ул. Мориса Тореза, 67',
              district: 'Железнодорожный р-н',
              type: 'Сортировочный хаб',
              coords: '53.1978, 50.1745',
              officer: 'Иванов С.П. (Инженер по ОТ)',
              phone: '+7 (927) 800-44-12',
              memo: 'Вход со двора, металлическая серая дверь. Раздевалка и шкафчики на 2-м этаже. Выдача сканеров ТСД и инструктаж по ячейкам стеллажей у бригадира перед сменой.',
              activeShiftsCount: 1
            },
            {
              id: 'site-3',
              name: 'Торговый павильон / Шоурум «Аврора»',
              address: 'Самара, ул. Авроры, 110',
              district: 'Советский р-н',
              type: 'Торговая точка и ритейл',
              coords: '53.1890, 50.1980',
              officer: 'Смирнова О.В. (Администратор)',
              phone: '+7 (927) 310-99-01',
              memo: 'Служебный вход с торца здания. Форма одежды — опрятная (тёмный низ, чистая обувь). Разгрузка профилей и выкладка на витрины до открытия зала в 10:00.',
              activeShiftsCount: 1
            }
          ],
          safetyBriefingLog: [
            { date: '19.10.2026', officer: 'Иванов С.П. (Инженер по ОТ)', site: 'Пр. Кирова, 147' },
            { date: '15.10.2026', officer: 'Иванов С.П. (Инженер по ОТ)', site: 'Склад №2' }
          ],
          escrow: { reserved: 18511, available: 45000 } // Сумма 6 заказов (17 300 ₽) + 7% сбор = 18 511 ₽
        },
        102: {
          userId: 102,
          type: 'private',
          companyName: 'Елена В.',
          verified: true,
          sites: [
            {
              id: 'site-201',
              name: 'Квартира на Садовой',
              address: 'Самара, ул. Садовая, 210, кв. 45',
              district: 'Ленинский р-н',
              type: 'Жилой объект',
              coords: '53.1955, 50.1018',
              officer: 'Елена В. (Собственник)',
              phone: '+7 (927) 200-11-22',
              memo: 'Домофон 45В. 4-й этаж, есть грузопассажирский лифт. Войлочные подкладки на ножках мебели уже подготовлены. Бахилы и перчатки при входе.',
              activeShiftsCount: 1
            }
          ],
          safetyBriefingLog: [],
          escrow: { reserved: 14338, available: 20000 } // Сумма 6 заказов + 7% сбор
        },
        103: {
          userId: 103,
          type: 'business',
          companyName: 'Сеть ПВЗ и Ритейл «Самара Маркет»',
          verified: true,
          sites: [
            {
              id: 'site-301',
              name: 'ПВЗ «Самара Маркет» на Гагарина',
              address: 'Самара, ул. Гагарина, 82',
              district: 'Советский р-н',
              type: 'Пункт выдачи заказов',
              coords: '53.2012, 50.1876',
              officer: 'Ковалева Н.А. (Управляющая сетью)',
              phone: '+7 (927) 777-33-01',
              memo: 'Вход со стороны двора через служебную дверь. Код замка #1082. Сортировка посылок по ячейкам со сканером ТСД. Чай и зона отдыха для сотрудников на складе.',
              activeShiftsCount: 1
            }
          ],
          safetyBriefingLog: [
            { date: '18.10.2026', officer: 'Ковалева Н.А. (Управляющая сетью)', site: 'ПВЗ Гагарина, 82' }
          ],
          escrow: { reserved: 18404, available: 50000 } // Сумма 6 заказов (17 200 ₽) + 7% сбор = 18 404 ₽
        }
      },

      // Прогресс по курсам допуска
      courseProgress: {
        1: {
          'safe_intro': { courseId: 'safe_intro', version: 1, status: 'passed', bestScore: 5, passedAt: '15.01.2026', validUntil: '15.01.2027' },
          'course_ПВЗ': { courseId: 'course_ПВЗ', version: 1, status: 'passed', bestScore: 5, passedAt: '16.01.2026', validUntil: '16.01.2027' },
          'course_Помощь на участке': { courseId: 'course_Помощь на участке', version: 1, status: 'passed', bestScore: 4, passedAt: '20.04.2026', validUntil: '20.04.2027' },
          'course_Склад/Ритейл': { courseId: 'course_Склад/Ритейл', version: 1, status: 'passed', bestScore: 5, passedAt: '18.01.2026', validUntil: '18.01.2027' },
          'course_Физическая помощь': { courseId: 'course_Физическая помощь', version: 1, status: 'passed', bestScore: 5, passedAt: '15.01.2026', validUntil: '15.01.2027' },
          'course_Мелкий ремонт': { courseId: 'course_Мелкий ремонт', version: 1, status: 'passed', bestScore: 4, passedAt: '02.02.2026', validUntil: '02.02.2027' }
        },
        2: {
          'safe_intro': { courseId: 'safe_intro', version: 1, status: 'passed', bestScore: 4, passedAt: '12.10.2026', validUntil: '12.10.2027' },
          'course_Физическая помощь': { courseId: 'course_Физическая помощь', version: 1, status: 'passed', bestScore: 5, passedAt: '12.10.2026', validUntil: '12.10.2027' },
          'course_Склад/Ритейл': { courseId: 'course_Склад/Ритейл', version: 1, status: 'passed', bestScore: 5, passedAt: '14.10.2026', validUntil: '14.10.2027' }
        },
        3: {
          'safe_intro': { courseId: 'safe_intro', version: 1, status: 'passed', bestScore: 5, passedAt: '01.09.2026', validUntil: '01.09.2027' },
          'course_ПВЗ': { courseId: 'course_ПВЗ', version: 1, status: 'passed', bestScore: 5, passedAt: '02.09.2026', validUntil: '02.09.2027' },
          'course_Склад/Ритейл': { courseId: 'course_Склад/Ритейл', version: 1, status: 'passed', bestScore: 5, passedAt: '03.09.2026', validUntil: '03.09.2027' },
          'course_Физическая помощь': { courseId: 'course_Физическая помощь', version: 1, status: 'passed', bestScore: 5, passedAt: '04.09.2026', validUntil: '04.09.2027' }
        },
        4: {
          'safe_intro': { courseId: 'safe_intro', version: 1, status: 'passed', bestScore: 5, passedAt: '15.08.2026', validUntil: '15.08.2027' },
          'course_Курьер': { courseId: 'course_Курьер', version: 1, status: 'passed', bestScore: 5, passedAt: '16.08.2026', validUntil: '16.08.2027' },
          'course_Помощь на участке': { courseId: 'course_Помощь на участке', version: 1, status: 'passed', bestScore: 5, passedAt: '17.08.2026', validUntil: '17.08.2027' },
          'course_Физическая помощь': { courseId: 'course_Физическая помощь', version: 1, status: 'passed', bestScore: 4, passedAt: '18.08.2026', validUntil: '18.08.2027' }
        },
        5: {
          'safe_intro': { courseId: 'safe_intro', version: 1, status: 'passed', bestScore: 5, passedAt: '05.07.2026', validUntil: '05.07.2027' },
          'course_Мелкий ремонт': { courseId: 'course_Мелкий ремонт', version: 1, status: 'passed', bestScore: 5, passedAt: '06.07.2026', validUntil: '06.07.2027' },
          'course_Склад/Ритейл': { courseId: 'course_Склад/Ритейл', version: 1, status: 'passed', bestScore: 4, passedAt: '07.07.2026', validUntil: '07.07.2027' }
        }
      },

      // 18 эталонных смен Самары — интерливинг заказчиков для разнообразия ленты (Anti-Vibe-Code v18)
      orders: [
        // 1. [101] ООО «СтройСамара Логистика» — Бизнес-смена (Физическая помощь, 3 200 ₽)
        {
          id: 1,
          ownerId: 101,
          title: 'Выгрузка партии керамогранита и сухих смесей',
          district: 'Кировский р-н, пр. Кирова, 147 (Вива Лэнд)',
          districtKey: 'Кировский р-н',
          category: 'Физическая помощь',
          orderType: 'business',
          allowNegotiation: false,
          time: 'Сегодня, 18:00 – 21:30',
          duration: 'Смена 3.5 ч',
          hours: 3.5,
          price: '3 200 ₽',
          rawPrice: 3200,
          lat: 53.2268,
          lng: 50.2697,
          comment: 'Разгрузка фургона поставщика: 4 паллета плитки на первый этаж стройбазы. Рохля и тележки выдаются.',
          customerName: 'ООО «СтройСамара Логистика»',
          customerRating: '4.95',
          perks: ['Рохля и тележки выдаются', 'Спецодежда на месте', 'Тёплый бокс'],
          status: 'searching',
          assignedWorkerId: null,
          slotsTotal: 3,
          assignedWorkerIds: [2],
          applications: [
            { workerId: 3, name: 'Максим Волков', rating: '4.94', status: 'ready', time: '10 мин назад' },
            { workerId: 4, name: 'Артём Самойлов', rating: '4.91', status: 'ready', time: '25 мин назад' }
          ],
          step: 0,
          proofs: { before: null, after: null, coords: null }
        },

        // 2. [102] Елена В. — Частный заказ (Физическая помощь / Помощь при переезде, 2 400 ₽)
        {
          id: 2,
          ownerId: 102,
          title: 'Помощь при переезде: поднять шкаф и коробки',
          district: 'Октябрьский р-н, ул. Ново-Садовая, 160М',
          districtKey: 'Октябрьский р-н',
          category: 'Физическая помощь',
          orderType: 'private',
          allowNegotiation: true,
          time: 'Сегодня, 16:00 – 18:30',
          duration: 'Задача 2.5 ч',
          hours: 2.5,
          price: '2 400 ₽',
          rawPrice: 2400,
          lat: 53.2185,
          lng: 50.1642,
          comment: 'Поднять разобранный шкаф-пенал и 6 коробок на 5 этаж. Грузовой лифт работает, подъезд со двора.',
          customerName: 'Елена В.',
          customerRating: '4.98',
          perks: ['Грузовой лифт работает', 'Чай и вода на месте', 'СБП 15 мин'],
          status: 'searching',
          assignedWorkerId: null,
          slotsTotal: 3,
          assignedWorkerIds: [],
          step: 0,
          proofs: { before: null, after: null, coords: null }
        },

        // 3. [103] Сеть ПВЗ и Ритейл «Самара Маркет» — Бизнес-смена (ПВЗ, 2 800 ₽)
        {
          id: 3,
          ownerId: 103,
          title: 'Приёмка вечерней машины и сканирование ТСД в ПВЗ Ozon',
          district: 'Советский р-н, ул. Гагарина, 82',
          districtKey: 'Советский р-н',
          category: 'ПВЗ',
          orderType: 'business',
          allowNegotiation: false,
          time: 'Сегодня, 19:00 – 22:30',
          duration: 'Смена 3.5 ч',
          hours: 3.5,
          price: '2 800 ₽',
          rawPrice: 2800,
          lat: 53.1970,
          lng: 50.1980,
          comment: 'Разгрузка мешков и коробок с отправлениями, сканирование ШК на складских стеллажах ПВЗ Ozon.',
          customerName: 'Сеть ПВЗ и Ритейл «Самара Маркет»',
          customerRating: '4.95',
          perks: ['Тёплый ПВЗ', 'Чайный уголок', 'Шаговая доступность метро'],
          status: 'searching',
          assignedWorkerId: null,
          slotsTotal: 2,
          assignedWorkerIds: [],
          step: 0,
          proofs: { before: null, after: null, coords: null }
        },

        // 4. [102] Елена В. — Частный заказ (Мелкий ремонт, 2 700 ₽)
        {
          id: 4,
          ownerId: 102,
          title: 'Сборка комода и книжного шкафа IKEA',
          district: 'Октябрьский р-н, ул. Мичурина, 148',
          districtKey: 'Октябрьский р-н',
          category: 'Мелкий ремонт',
          orderType: 'private',
          allowNegotiation: true,
          time: 'Завтра, 14:00 – 17:00',
          duration: 'Задача 3 ч',
          hours: 3,
          price: '2 700 ₽',
          rawPrice: 2700,
          lat: 53.2125,
          lng: 50.1610,
          comment: 'Собрать по инструкции комод Мальм и книжный стеллаж Билли. Шуруповёрт и отвёртки есть у меня.',
          customerName: 'Елена В.',
          customerRating: '4.98',
          perks: ['Инструмент на месте', 'Светлая квартира', 'Оплата СБП'],
          status: 'searching',
          assignedWorkerId: null,
          slotsTotal: 1,
          assignedWorkerIds: [],
          step: 0,
          proofs: { before: null, after: null, coords: null }
        },

        // 5. [101] ООО «СтройСамара Логистика» — Бизнес-смена (Склад/Ритейл, 3 600 ₽)
        {
          id: 5,
          ownerId: 101,
          title: 'Комплектация стройматериалов со сканером ТСД',
          district: 'Промышленный р-н, Московское шоссе, 18-й км',
          districtKey: 'Промышленный р-н',
          category: 'Склад/Ритейл',
          orderType: 'business',
          allowNegotiation: false,
          time: 'Сегодня, 17:00 – 21:00',
          duration: 'Смена 4 ч',
          hours: 4,
          price: '3 600 ₽',
          rawPrice: 3600,
          lat: 53.2384,
          lng: 50.2189,
          comment: 'Сборка строительных заказов в логистическом комплексе. Обучение работе с терминалом Urovo за 10 минут.',
          customerName: 'ООО «СтройСамара Логистика»',
          customerRating: '4.95',
          perks: ['Обучение ТСД на месте', 'Служебный транспорт от м. Победа', 'Обед в столовой'],
          status: 'on_site',
          assignedWorkerId: 6,
          slotsTotal: 2,
          assignedWorkerIds: [6, 7],
          step: 2,
          proofs: { before: 'assets/sample_before.jpg', after: null, coords: '53.2384, 50.2189 (45 м от точки)' }
        },

        // 6. [103] Сеть ПВЗ и Ритейл «Самара Маркет» — Бизнес-смена (Курьер, 2 600 ₽)
        {
          id: 6,
          ownerId: 103,
          title: 'Пеший курьер: доставка заказов клиентам в радиусе 1.5 км',
          district: 'Октябрьский р-н, ул. Осипенко, 3',
          districtKey: 'Октябрьский р-н',
          category: 'Курьер',
          orderType: 'business',
          allowNegotiation: false,
          time: 'Завтра, 14:00 – 17:30',
          duration: 'Смена 3.5 ч',
          hours: 3.5,
          price: '2 600 ₽',
          rawPrice: 2600,
          lat: 53.2089,
          lng: 50.1345,
          comment: 'Адресная доставка малогабаритных посылок (до 4 кг) в пешей доступности от станции метро Алабинская.',
          customerName: 'Сеть ПВЗ и Ритейл «Самара Маркет»',
          customerRating: '4.93',
          perks: ['Удобный район', 'Лёгкие посылки до 4 кг', 'Оплата СБП'],
          status: 'searching',
          assignedWorkerId: null,
          slotsTotal: 1,
          assignedWorkerIds: [],
          step: 0,
          proofs: { before: null, after: null, coords: null }
        },

        // 7. [102] Елена В. — Частный заказ (Физическая помощь, 1 900 ₽)
        {
          id: 7,
          ownerId: 102,
          title: 'Перестановка мебели в квартире после ремонта',
          district: 'Ленинский р-н, ул. Садовая, 210',
          districtKey: 'Ленинский р-н',
          category: 'Физическая помощь',
          orderType: 'private',
          allowNegotiation: true,
          time: 'Завтра, 11:00 – 13:00',
          duration: 'Задача 2 ч',
          hours: 2,
          price: '1 900 ₽',
          rawPrice: 1900,
          lat: 53.1955,
          lng: 50.1018,
          comment: 'Передвинуть диван, комод и книжный стеллаж в соседнюю комнату. Войлочные подкладки на ножках уже есть.',
          customerName: 'Елена В.',
          customerRating: '4.98',
          perks: ['Без подъёма по лестнице', 'СБП сразу', 'Чистый объект'],
          status: 'searching',
          assignedWorkerId: null,
          slotsTotal: 4,
          assignedWorkerIds: [2],
          step: 0,
          proofs: { before: null, after: null, coords: null }
        },

        // 8. [101] ООО «СтройСамара Логистика» — Бизнес-смена (Склад/Ритейл, 3 100 ₽)
        {
          id: 8,
          ownerId: 101,
          title: 'Сортировка профилей и металлоконструкций на складе',
          district: 'Железнодорожный р-н, ул. Мориса Тореза, 67',
          districtKey: 'Железнодорожный р-н',
          category: 'Склад/Ритейл',
          orderType: 'business',
          allowNegotiation: false,
          time: 'Завтра, 09:00 – 13:00',
          duration: 'Смена 4 ч',
          hours: 4,
          price: '3 100 ₽',
          rawPrice: 3100,
          lat: 53.1978,
          lng: 50.1745,
          comment: 'Маркировка и укладка алюминиевых направляющих по ячейкам стеллажей. Защитные перчатки выдаются.',
          customerName: 'ООО «СтройСамара Логистика»',
          customerRating: '4.95',
          perks: ['Тёплый склад', 'Перчатки выдаются', 'СБП 15 мин'],
          status: 'searching',
          assignedWorkerId: null,
          slotsTotal: 5,
          assignedWorkerIds: [3],
          step: 0,
          proofs: { before: null, after: null, coords: null }
        },

        // 9. [103] Сеть ПВЗ и Ритейл «Самара Маркет» — Бизнес-смена (ПВЗ, 3 500 ₽)
        {
          id: 9,
          ownerId: 103,
          title: 'Выдача заказов и приём возвратов в ПВЗ Wildberries',
          district: 'Ленинский р-н, ул. Молодогвардейская, 180',
          districtKey: 'Ленинский р-н',
          category: 'ПВЗ',
          orderType: 'business',
          allowNegotiation: false,
          time: 'Завтра, 10:00 – 15:00',
          duration: 'Смена 5 ч',
          hours: 5,
          price: '3 500 ₽',
          rawPrice: 3500,
          lat: 53.2001,
          lng: 50.1194,
          comment: 'Обслуживание клиентов на выдаче, проверка целостности возвратов и раскладка по коробкам.',
          customerName: 'Сеть ПВЗ и Ритейл «Самара Маркет»',
          customerRating: '4.95',
          perks: ['Оборудованное рабочее место', 'Кондиционер', 'СБП выплата'],
          status: 'searching',
          assignedWorkerId: null,
          slotsTotal: 3,
          assignedWorkerIds: [],
          step: 0,
          proofs: { before: null, after: null, coords: null }
        },

        // 10. [102] Елена В. — Частный заказ (Мелкий ремонт, 2 200 ₽)
        {
          id: 10,
          ownerId: 102,
          title: 'Замена двух смесителей и сифона на кухне',
          district: 'Самарский р-н, ул. Куйбышева, 105',
          districtKey: 'Самарский р-н',
          category: 'Мелкий ремонт',
          orderType: 'private',
          allowNegotiation: true,
          time: 'Сегодня, 18:30 – 20:30',
          duration: 'Задача 2 ч',
          hours: 2,
          price: '2 200 ₽',
          rawPrice: 2200,
          lat: 53.1878,
          lng: 50.0894,
          comment: 'Установить новый смеситель в мойку и заменить гофрированный сифон. Все прокладки и фум-лента куплены.',
          customerName: 'Елена В.',
          customerRating: '4.98',
          perks: ['Материалы куплены', 'Доступ к стояку открыт', 'Быстрый расчёт'],
          status: 'searching',
          assignedWorkerId: null,
          slotsTotal: 1,
          assignedWorkerIds: [],
          step: 0,
          proofs: { before: null, after: null, coords: null }
        },

        // 11. [101] ООО «СтройСамара Логистика» — Бизнес-смена (Физическая помощь, 2 600 ₽)
        {
          id: 11,
          ownerId: 101,
          title: 'Погрузка деревянных поддонов и строительной опалубки',
          district: 'Кировский р-н, Заводское шоссе, 27',
          districtKey: 'Кировский р-н',
          category: 'Физическая помощь',
          orderType: 'business',
          allowNegotiation: false,
          time: 'Завтра, 14:00 – 17:00',
          duration: 'Смена 3 ч',
          hours: 3,
          price: '2 600 ₽',
          rawPrice: 2600,
          lat: 53.2089,
          lng: 50.2541,
          comment: 'Штабелирование деревянных европоддонов в кузов бортового КамАЗа. Работа в паре со штатным грузчиком.',
          customerName: 'ООО «СтройСамара Логистика»',
          customerRating: '4.95',
          perks: ['Работа в паре', 'Спецодежда на объекте', 'Парковка'],
          status: 'in_review',
          assignedWorkerId: 6,
          slotsTotal: 2,
          assignedWorkerIds: [6, 7],
          step: 3,
          proofs: { before: 'assets/sample_before.jpg', after: 'assets/sample_after.jpg', coords: '53.2089, 50.2541' }
        },

        // 12. [103] Сеть ПВЗ и Ритейл «Самара Маркет» — Бизнес-смена (Склад/Ритейл, 3 000 ₽)
        {
          id: 12,
          ownerId: 103,
          title: 'Выкладка фасованного товара и оформление полок супермаркета',
          district: 'Октябрьский р-н, пр. Ленина, 12А',
          districtKey: 'Октябрьский р-н',
          category: 'Склад/Ритейл',
          orderType: 'business',
          allowNegotiation: false,
          time: 'Завтра, 08:00 – 12:00',
          duration: 'Смена 4 ч',
          hours: 4,
          price: '3 000 ₽',
          rawPrice: 3000,
          lat: 53.2140,
          lng: 50.1490,
          comment: 'Ротация и пополнение товарных запасов молочной и бакалейной продукции в торговом зале супермаркета.',
          customerName: 'Сеть ПВЗ и Ритейл «Самара Маркет»',
          customerRating: '4.95',
          perks: ['Тёплый зал', 'Спецодежда выдаётся', 'Скидка на обед'],
          status: 'searching',
          assignedWorkerId: null,
          slotsTotal: 3,
          assignedWorkerIds: [],
          step: 0,
          proofs: { before: null, after: null, coords: null }
        },

        // 13. [102] Елена В. — Частный заказ (Помощь на участке, 2 600 ₽)
        {
          id: 13,
          ownerId: 102,
          title: 'Покос газонной травы на дачном участке 6 соток',
          district: 'Красноглинский р-н, пос. Управленческий, СНТ «Салют»',
          districtKey: 'Красноглинский р-н',
          category: 'Помощь на участке',
          orderType: 'private',
          allowNegotiation: true,
          time: 'Завтра, 10:00 – 13:30',
          duration: 'Задача 3.5 ч',
          hours: 3.5,
          price: '2 600 ₽',
          rawPrice: 2600,
          lat: 53.3456,
          lng: 50.2198,
          comment: 'Скосить траву триммером вокруг дома и вдоль забора. Бензотриммер и леска предоставляются.',
          customerName: 'Елена В.',
          customerRating: '4.98',
          perks: ['Бензин и леска на даче', 'Вода и тень', 'Свежий воздух'],
          status: 'searching',
          assignedWorkerId: null,
          slotsTotal: 2,
          assignedWorkerIds: [],
          step: 0,
          proofs: { before: null, after: null, coords: null }
        },

        // 14. [101] ООО «СтройСамара Логистика» — Бизнес-смена (Помощь на участке / Склад, 2 400 ₽)
        {
          id: 14,
          ownerId: 101,
          title: 'Уборка складского бокса после инвентаризации',
          district: 'Промышленный р-н, ул. Ново-Вокзальная, 116',
          districtKey: 'Промышленный р-н',
          category: 'Помощь на участке',
          orderType: 'business',
          allowNegotiation: false,
          time: 'Послезавтра, 10:00 – 13:00',
          duration: 'Смена 3 ч',
          hours: 3,
          price: '2 400 ₽',
          rawPrice: 2400,
          lat: 53.2289,
          lng: 50.2241,
          comment: 'Сбор обрезков стрейч-плёнки и упаковочного картона в прессовальные мешки. Инвентарь и метлы выдаются.',
          customerName: 'ООО «СтройСамара Логистика»',
          customerRating: '4.95',
          perks: ['Инвентарь на месте', 'Спецодежда', 'Официальный чек'],
          status: 'completed',
          assignedWorkerId: 6,
          slotsTotal: 2,
          assignedWorkerIds: [6, 7],
          step: 4,
          proofs: { before: 'assets/sample_before.jpg', after: 'assets/sample_after.jpg', coords: '53.2289, 50.2241' }
        },

        // 15. [103] Сеть ПВЗ и Ритейл «Самара Маркет» — Бизнес-смена (ПВЗ, 2 900 ₽)
        {
          id: 15,
          ownerId: 103,
          title: 'Сортировка отправлений и подготовка курьерских маршрутов',
          district: 'Самарский р-н, ул. Венцека, 45',
          districtKey: 'Самарский р-н',
          category: 'ПВЗ',
          orderType: 'business',
          allowNegotiation: false,
          time: 'Послезавтра, 07:30 – 11:00',
          duration: 'Смена 3.5 ч',
          hours: 3.5,
          price: '2 900 ₽',
          rawPrice: 2900,
          lat: 53.1895,
          lng: 50.0980,
          comment: 'Утренняя сортировка прибывших посылок по зонам доставки и формирование путевых листов.',
          customerName: 'Сеть ПВЗ и Ритейл «Самара Маркет»',
          customerRating: '4.95',
          perks: ['Утренняя смена', 'Кофемашина', 'СБП 15 мин'],
          status: 'searching',
          assignedWorkerId: null,
          slotsTotal: 3,
          assignedWorkerIds: [],
          step: 0,
          proofs: { before: null, after: null, coords: null }
        },

        // 16. [102] Елена В. — Частный заказ (Помощь на участке, 2 100 ₽)
        {
          id: 16,
          ownerId: 102,
          title: 'Подготовка сада к зиме: обрезка сухих веток',
          district: 'Красноглинский р-н, пос. Красная Глинка, 3-й квартал',
          districtKey: 'Красноглинский р-н',
          category: 'Помощь на участке',
          orderType: 'private',
          allowNegotiation: true,
          time: 'Послезавтра, 11:00 – 14:00',
          duration: 'Задача 3 ч',
          hours: 3,
          price: '2 100 ₽',
          rawPrice: 2100,
          lat: 53.3812,
          lng: 50.1623,
          comment: 'Срезать сухие ветви яблонь секатором и сложить в мешки для вывоза. Стремянка и секатор есть.',
          customerName: 'Елена В.',
          customerRating: '4.98',
          perks: ['Стремянка выдаётся', 'Чай с пирожками', 'Оплата сразу'],
          status: 'searching',
          assignedWorkerId: null,
          slotsTotal: 2,
          assignedWorkerIds: [],
          step: 0,
          proofs: { before: null, after: null, coords: null }
        },

        // 17. [101] ООО «СтройСамара Логистика» — Бизнес-смена (Склад/Ритейл, 2 400 ₽)
        {
          id: 17,
          ownerId: 101,
          title: 'Разгрузка паллет с гипсокартоном в сектор комплектации',
          district: 'Советский р-н, ул. Авроры, 110',
          districtKey: 'Советский р-н',
          category: 'Склад/Ритейл',
          orderType: 'business',
          allowNegotiation: false,
          time: 'Послезавтра, 16:00 – 19:00',
          duration: 'Смена 3 ч',
          hours: 3,
          price: '2 400 ₽',
          rawPrice: 2400,
          lat: 53.1950,
          lng: 50.2080,
          comment: 'Перемещение упаковок ГКЛ гидравлической тележкой от ворот пандуса к зоне нарезки профилей.',
          customerName: 'ООО «СтройСамара Логистика»',
          customerRating: '4.95',
          perks: ['Рохли исправны', 'Инструктаж 5 мин', 'СБП сразу'],
          status: 'searching',
          assignedWorkerId: null,
          slotsTotal: 3,
          assignedWorkerIds: [],
          step: 0,
          proofs: { before: null, after: null, coords: null }
        },

        // 18. [103] Сеть ПВЗ и Ритейл «Самара Маркет» — Бизнес-смена (Склад/Ритейл, 2 400 ₽)
        {
          id: 18,
          ownerId: 103,
          title: 'Мерчандайзинг и проверка ценников в торговом зале',
          district: 'Железнодорожный р-н, ул. Агибалова, 19 (Ж/Д Вокзал)',
          districtKey: 'Железнодорожный р-н',
          category: 'Склад/Ритейл',
          orderType: 'business',
          allowNegotiation: false,
          time: 'Сегодня, 20:00 – 23:00',
          duration: 'Смена 3 ч',
          hours: 3,
          price: '2 400 ₽',
          rawPrice: 2400,
          lat: 53.1870,
          lng: 50.1250,
          comment: 'Сверка электронных ценников и выкладка прикассовой зоны супермаркета. Опыт не требуется.',
          customerName: 'Сеть ПВЗ и Ритейл «Самара Маркет»',
          customerRating: '4.95',
          perks: ['У вокзала', 'Удобная транспортная развязка', 'СБП 15 мин'],
          status: 'searching',
          assignedWorkerId: null,
          slotsTotal: 2,
          assignedWorkerIds: [],
          step: 0,
          proofs: { before: null, after: null, coords: null }
        }
      ],

      // Отклики исполнителей
      applications: [],

      // Чаты по заказам
      chats: {
        1: [
          {
            id: 'c1_1',
            orderId: 1,
            senderId: 101,
            senderRole: 'employer',
            senderName: 'ООО «СтройСамара Логистика»',
            text: 'Здравствуйте! Ждем вас сегодня к 18:00 у ворот №2 базы.',
            timestamp: '18.10.2026, 14:30',
            system: false
          }
        ],
        2: [
          {
            id: 'c2_1',
            orderId: 2,
            senderId: 102,
            senderRole: 'employer',
            senderName: 'Елена В.',
            text: 'Здравствуйте! Грузовой лифт работает, домофон 45В.',
            timestamp: '18.10.2026, 12:10',
            system: false
          }
        ]
      },

      // Официальные фискальные чеки ФНС (НПД)
      receipts: [
        {
          id: 'fns_receipt_84102',
          orderTitle: 'Смена на складе',
          amount: '3 600 ₽',
          date: '18.10.2026',
          inn: '631600841022',
          fnsNumber: '84102-НПД-2026',
          qrCodeUrl: '',
          taxAmount: '144 ₽'
        }
      ],

      // Отзывы
      reviews: [],

      // Выплаты
      payouts: [
        {
          id: 1,
          workerId: 1,
          title: 'Смена на складе',
          amount: 3600,
          date: '18.10.2026',
          receiptNum: 84102,
          status: 'completed'
        }
      ],

      // Транзакции банковского сплитования заказчика
      employerTransactions: [
        {
          id: 101,
          date: '24.10.2026, 18:00',
          orderTitle: 'Выгрузка партии керамогранита и сухих смесей',
          orderId: 1,
          workerName: 'Дмитрий М.',
          workerInn: '631609823145',
          npdStatus: 'Самозанятый (НПД активен)',
          amount: 3200,
          fee: 0,
          isB2B: true,
          holdStatus: 'hold_72h',
          holdStatusText: 'В холде 72 ч (проверка скрытых дефектов)',
          receiptNum: 'ФНС #84912-НПД',
          protocolAvailable: true
        },
        {
          id: 102,
          date: '23.10.2026, 14:30',
          orderTitle: 'Комплектация стройматериалов со сканером ТСД',
          orderId: 5,
          workerName: 'Иван С.',
          workerInn: '631204899211',
          npdStatus: 'Самозанятый (НПД активен)',
          amount: 3600,
          fee: 0,
          isB2B: true,
          holdStatus: 'paid_sbp',
          holdStatusText: 'Выплачено по СБП (Профи 4.8+)',
          receiptNum: 'ФНС #84844-НПД',
          protocolAvailable: true
        },
        {
          id: 103,
          date: '22.10.2026, 11:00',
          orderTitle: 'Сортировка профилей и металлоконструкций на складе',
          orderId: 8,
          workerName: 'Максим Волков',
          workerInn: '631892341209',
          npdStatus: 'Самозанятый (НПД активен)',
          amount: 3100,
          fee: 0,
          isB2B: true,
          holdStatus: 'paid_sbp',
          holdStatusText: 'Выплачено по СБП (Профи 4.8+)',
          receiptNum: 'ФНС #84721-НПД',
          protocolAvailable: true
        },
        {
          id: 104,
          date: '21.10.2026, 16:45',
          orderTitle: 'Уборка складского бокса после инвентаризации',
          orderId: 14,
          workerName: 'Павел Н.',
          workerInn: '631782341908',
          npdStatus: 'Самозанятый (НПД активен)',
          amount: 2800,
          fee: 0,
          isB2B: true,
          holdStatus: 'refund_dispute',
          holdStatusText: 'Возврат заказчику по спору (брак)',
          receiptNum: 'Возврат буфера банка',
          protocolAvailable: true
        }
      ]
    };
  }

  window.Eluma.Seed = {
    getInitialDatabase: getInitialDatabase
  };
  window.Olksi.Seed = window.Eluma.Seed;

})();
