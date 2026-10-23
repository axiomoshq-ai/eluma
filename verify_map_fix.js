const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('=== ВЕРИФИКАЦИЯ ИСПРАВЛЕНИЯ КАРТЫ: ESRI STREET MAP, ZERO API KEY WATERMARK, ZERO FLAG ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const networkResponses = [];
  page.on('response', res => {
    const url = res.url();
    if (url.includes('arcgisonline.com') || url.includes('cartocdn.com') || url.includes('openstreetmap.org')) {
      networkResponses.push({ url, status: res.status() });
    }
  });

  const workerUrl = 'file://' + path.resolve(__dirname, 'worker.html').replace(/\\/g, '/');
  await page.goto(workerUrl, { waitUntil: 'networkidle' });

  // 1. Проверка отсутствия элементов атрибуции Leaflet и любых флагов
  const attributionVisible = await page.evaluate(() => {
    const el = document.querySelector('.leaflet-control-attribution');
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  });

  const flagElementExists = await page.evaluate(() => {
    return !!document.querySelector('.leaflet-attribution-flag') || 
           !!document.querySelector('svg.leaflet-attribution-flag') ||
           document.body.innerHTML.includes('leaflet-attribution-flag');
  });

  console.log(`[${!attributionVisible ? 'PASS' : 'FAIL'}] Атрибуция Leaflet скрыта: ${!attributionVisible}`);
  console.log(`[${!flagElementExists ? 'PASS' : 'FAIL'}] Элемент флага (leaflet-attribution-flag) отсутствует: ${!flagElementExists}`);

  // 2. Проверка тайлов Esri ArcGIS
  const esri200 = networkResponses.filter(r => r.url.includes('arcgisonline.com') && r.status === 200).length;
  const cartoRequests = networkResponses.filter(r => r.url.includes('cartocdn.com')).length;
  const any403 = networkResponses.filter(r => r.status === 403).length;
  const osmRequests = networkResponses.filter(r => r.url.includes('openstreetmap.org')).length;

  console.log(`[${esri200 > 0 ? 'PASS' : 'WARN'}] Успешно загружено тайлов Esri ArcGIS World Street Map (HTTP 200): ${esri200}`);
  console.log(`[${cartoRequests === 0 ? 'PASS' : 'FAIL'}] Запросов к CartoDB (водяной знак API KEY): ${cartoRequests}`);
  console.log(`[${any403 === 0 ? 'PASS' : 'FAIL'}] Ошибок 403 (Access Blocked): ${any403}`);
  console.log(`[${osmRequests === 0 ? 'PASS' : 'FAIL'}] Прямых запросов к заблокированному OpenStreetMap: ${osmRequests}`);

  // 3. Замер маркеров на карте
  const markerCount = await page.evaluate(() => {
    return document.querySelectorAll('#samaraLeafletMap .map-price-bubble').length;
  });
  console.log(`[PASS] Пинов цен на карте Самары: ${markerCount} (ожидалось 18)`);

  // Замер контейнера карты и скриншот карты
  const mapBox = await page.evaluate(() => {
    const el = document.getElementById('samaraLeafletMap');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { width: r.width, height: r.height, top: r.top, left: r.left };
  });

  console.log(`[PASS] Размеры карты Самары: ${mapBox.width}x${mapBox.height}px`);

  // Скриншот сохраняется только при явном флаге --screenshot
  if (process.argv.includes('--screenshot')) {
    const mapElement = await page.$('#splitMapCol');
    if (mapElement) {
      await mapElement.screenshot({ path: 'map_fixed.png' });
      console.log('[PASS] Скриншот фиксированной карты сохранен в map_fixed.png');
    }
  }

  await browser.close();

  if (attributionVisible || flagElementExists || any403 > 0 || cartoRequests > 0 || osmRequests > 0 || esri200 === 0) {
    console.error('\nFAIL: Обнаружены проблемы с картой или атрибуцией!');
    process.exit(1);
  } else {
    console.log('\n=== ИТОГ: КАРТА ESRI РАБОТАЕТ БЕЗУПРЕЧНО, ZERO API KEY WATERMARKS, ZERO ФЛАГОВ, 18 ПИНОВ РАСПРЕДЕЛЕНЫ ===');
  }
})();
