/**
 * v24_multislot_friends_test.js
 * Comprehensive automated verification for Eluma v24:
 * Multi-Slot Shifts, Co-Op Friends, Left Filter & Dev Capsule
 */

global.window = global;
global.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; }
};

require('../core/seed.js');
require('../core/store.js');
const getInitialDatabase = window.Eluma.Seed.getInitialDatabase;
const store = window.Eluma.store;
store.seedInitialData();

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

console.log('=== ЗАПУСК ВЕРИФИКАЦИИ ELUMA v24: MULTI-SLOT & CO-OP FRIENDS ===\n');

// 1. Seed Data Integrity
const seedDb = getInitialDatabase();

assert(Array.isArray(seedDb.friends) && seedDb.friends.length === 4, 'Root seed содержит массив friends из 4 напарников');
const friend2 = seedDb.friends.find(f => f.userId === 2);
const friend3 = seedDb.friends.find(f => f.userId === 3);
const friend4 = seedDb.friends.find(f => f.userId === 4);
const friend5 = seedDb.friends.find(f => f.userId === 5);

assert(friend2 && friend2.name === 'Дмитрий М.' && friend2.CoOpCount === 3, 'Друг #2 Дмитрий М. корректно задан с CoOpCount: 3');
assert(friend3 && friend3.name === 'Максим Волков' && friend3.CoOpCount === 5, 'Друг #3 Максим Волков корректно задан с CoOpCount: 5');
assert(friend4 && friend4.name === 'Артём Самойлов' && friend4.CoOpCount === 2, 'Друг #4 Артём Самойлов корректно задан с CoOpCount: 2');
assert(friend5 && friend5.name === 'Кирилл Демидов' && friend5.CoOpCount === 1, 'Друг #5 Кирилл Демидов корректно задан с CoOpCount: 1');

// All 18 orders have slotsTotal and assignedWorkerIds
assert(seedDb.orders.length === 18, 'В базе ровно 18 заказов');
const allHaveSlots = seedDb.orders.every(o => typeof o.slotsTotal === 'number' && o.slotsTotal >= 1);
assert(allHaveSlots, 'Все 18 заказов содержат валидное поле slotsTotal >= 1');

const allHaveAssignedArr = seedDb.orders.every(o => Array.isArray(o.assignedWorkerIds));
assert(allHaveAssignedArr, 'Все 18 заказов содержат массив assignedWorkerIds');

// Orders 1, 7, 8 have friend assigned but stay in searching
const o1 = seedDb.orders.find(o => o.id === 1);
const o7 = seedDb.orders.find(o => o.id === 7);
const o8 = seedDb.orders.find(o => o.id === 8);
assert(o1.assignedWorkerIds.includes(2) && o1.assignedWorkerId === null && o1.status === 'searching', 'Заказ #1: напарник #2 в слотах, заказ открыт для поиска');
assert(o7.assignedWorkerIds.includes(2) && o7.assignedWorkerId === null && o7.status === 'searching', 'Заказ #7: напарник #2 в слотах, заказ открыт для поиска');
assert(o8.assignedWorkerIds.includes(3) && o8.assignedWorkerId === null && o8.status === 'searching', 'Заказ #8: напарник #3 в слотах, заказ открыт для поиска');

// 2. Core Store Methods
// store is initialized

// getOrderSlotsMeta
const metaO7 = store.getOrderSlotsMeta(o7, 1);
assert(metaO7.total === 4, 'Заказ #7: total слотов = 4');
assert(metaO7.filled === 1, 'Заказ #7: занято 1 место (напарник #2)');
assert(metaO7.left === 3, 'Заказ #7: свободно 3 места');
assert(metaO7.isFull === false, 'Заказ #7: смена не заполнена');
assert(metaO7.isWorkerAssigned === false, 'Исполнитель 1 еще не записан');
assert(metaO7.assignedFriends.length === 1 && metaO7.assignedFriends[0].name === 'Дмитрий М.', 'assignedFriends корректно возвращает Дмитрия М.');

// Worker 2 meta
const metaO7Worker2 = store.getOrderSlotsMeta(o7, 2);
assert(metaO7Worker2.isWorkerAssigned === true, 'Для исполнителя 2 флаг isWorkerAssigned === true');

// Co-Op stats
const coOpStats = store.getCoOpStats();
assert(coOpStats.coOpShiftsTotal === 11, `Суммарные совместные смены = 11 (получено: ${coOpStats.coOpShiftsTotal})`);
assert(coOpStats.buddiesCount === 4, `Количество напарников = 4 (получено: ${coOpStats.buddiesCount})`);
assert(coOpStats.referralCode === 'ELUMA-SAMARA-63', `Реферальный промокод = ELUMA-SAMARA-63`);

// 3. Co-Op Shift Booking
const bookRes = store.bookShiftWithFriend(7, 3, 1);
assert(bookRes.success === true, 'bookShiftWithFriend успешно выполнен');
assert(bookRes.order.assignedWorkerIds.includes(1) && bookRes.order.assignedWorkerIds.includes(3), 'Оба исполнителя (1 и друг 3) добавлены в assignedWorkerIds');
assert(bookRes.order.assignedWorkerId === 1, 'Обратная совместимость: order.assignedWorkerId равен wid');
assert(bookRes.order.step === 1, 'Обратная совместимость: order.step равен 1');

// After booking: slots filled = 3 (worker 2, worker 1, worker 3), left = 1
const updatedMeta7 = store.getOrderSlotsMeta(bookRes.order, 1);
assert(updatedMeta7.filled === 3 && updatedMeta7.left === 1, 'После бронирования слотов занято 3 из 4, остался 1');

// Invite friend
const inviteRes = store.inviteFriendToShift(8, 4, 1);
assert(inviteRes.success === true && inviteRes.inviteCode.length > 0, 'inviteFriendToShift успешно сгенерировал инвайт');

// Add friend by contact
const addFriendRes = store.addFriendByContact('Сергей Смирнов', '+7 (927) 333-44-55', 'Курьер / Склад');
assert(addFriendRes.success === true, 'addFriendByContact успешно выполнил добавление');
assert(store.getFriends().length === 5, 'Список напарников увеличился до 5');
assert(store.getFriends().some(f => f.name === 'Сергей Смирнов'), 'Новый напарник Сергей Смирнов присутствует в списке');

// 4. Discovery Filters & Sorting
store.seedInitialData();
const freshStore = store;

// Filter multiSlots
const multiSlotOrders = freshStore.getDiscoveryOrders({ multiSlots: true });
assert(multiSlotOrders.length > 0 && multiSlotOrders.every(o => o.slotsTotal > 1), 'Фильтр multiSlots возвращает только смены с slotsTotal > 1');

// Filter friendsInShift
const friendOrders = freshStore.getDiscoveryOrders({ friendsInShift: true });
assert(friendOrders.length === 3, `Фильтр friendsInShift возвращает ровно 3 смены с друзьями (получено: ${friendOrders.length})`);
assert(friendOrders.every(o => [1, 7, 8].includes(o.id)), 'Смены с друзьями строго соответствуют id: 1, 7, 8');

// Sort by slots
const sortedBySlots = freshStore.getDiscoveryOrders({ sortBy: 'slots' });
assert(sortedBySlots[0].slotsTotal >= sortedBySlots[sortedBySlots.length - 1].slotsTotal, 'Сортировка sortBy: slots упорядочивает по убыванию slotsTotal');

// Sort by friends
const sortedByFriends = freshStore.getDiscoveryOrders({ sortBy: 'friends' });
const firstThreeIds = sortedByFriends.slice(0, 3).map(o => o.id);
assert(firstThreeIds.includes(1) && firstThreeIds.includes(7) && firstThreeIds.includes(8), 'Сортировка sortBy: friends поднимает смены с друзьями наверх');

// 5. Employer Order Creation with Slots
const createdOrder = freshStore.createOrder({
  ownerId: 101,
  category: 'Склад/Ритейл',
  title: 'Бригада на ночную инвентаризацию',
  description: 'Комплектовка товаров',
  address: 'г. Самара, Заводское шоссе, 18',
  budget: 9000,
  slotsTotal: 4,
  lat: 53.195,
  lng: 50.185
});

assert(createdOrder.slotsTotal === 4, 'Созданный заказчиком заказ сохраняет slotsTotal: 4');
assert(Array.isArray(createdOrder.assignedWorkerIds) && createdOrder.assignedWorkerIds.length === 0, 'Созданный заказ имеет пустой assignedWorkerIds');
const createdMeta = freshStore.getOrderSlotsMeta(createdOrder);
assert(createdMeta.total === 4 && createdMeta.left === 4 && createdMeta.filled === 0, 'Метаданные созданного заказа: 0 из 4 занято, 4 свободно');

console.log(`\n=== РЕЗУЛЬТАТЫ: ${passCount} ПРОЙДЕНО, ${failCount} ОШИБОК ===`);
if (failCount > 0) {
  process.exit(1);
}
process.exit(0);
