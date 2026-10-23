const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const artifactDir = 'C:\\Users\\Nusik21\\.gemini\\antigravity\\brain\\90f6d611-00f4-4057-b4fc-80004267d8fa';

  // 1. Worker Light Mode Feed
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto('file://' + path.resolve('worker.html').replace(/\\/g, '/'));
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(artifactDir, 'eluma_v22_worker_light.png'), fullPage: false });
    console.log('Saved eluma_v22_worker_light.png');

    // 2. Map pin hover
    const mapPin = await page.$('.map-price-bubble');
    if (mapPin) {
      await mapPin.hover();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(artifactDir, 'eluma_v22_map_hover.png'), fullPage: false });
      console.log('Saved eluma_v22_map_hover.png');
    }

    // 3. Worker Dark Mode Feed
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(artifactDir, 'eluma_v22_worker_dark.png'), fullPage: false });
    console.log('Saved eluma_v22_worker_dark.png');

    await page.close();
  }

  // 4. Employer Light Mode Desktop
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto('file://' + path.resolve('employer.html').replace(/\\/g, '/'));
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(artifactDir, 'eluma_v22_employer_desktop.png'), fullPage: false });
    console.log('Saved eluma_v22_employer_desktop.png');
    await page.close();
  }

  await browser.close();
  console.log('All v22 screenshots captured successfully!');
})();
