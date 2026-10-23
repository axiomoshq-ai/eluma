const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const artifactDir = 'C:\\Users\\Nusik21\\.gemini\\antigravity\\brain\\90f6d611-00f4-4057-b4fc-80004267d8fa';

  // 1. Worker Desktop Feed
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto('file://' + path.resolve('worker.html').replace(/\\/g, '/'));
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(artifactDir, 'eluma_v21_worker_feed.png'), fullPage: false });
    console.log('Saved eluma_v21_worker_feed.png');

    // Hover over the first task card to trigger map hover preview
    const firstCard = await page.$('.worker-task-unit');
    if (firstCard) {
      await firstCard.hover();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(artifactDir, 'eluma_v21_worker_map_hover.png'), fullPage: false });
      console.log('Saved eluma_v21_worker_map_hover.png');
    }

    // Worker Profile
    await page.evaluate(() => window.Eluma.Worker.navigate('profile'));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(artifactDir, 'eluma_v21_worker_profile.png'), fullPage: false });
    console.log('Saved eluma_v21_worker_profile.png');
    await page.close();
  }

  // 2. Worker Mobile (375x812)
  {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await page.goto('file://' + path.resolve('worker.html').replace(/\\/g, '/'));
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(artifactDir, 'eluma_v21_worker_mobile.png'), fullPage: false });
    console.log('Saved eluma_v21_worker_mobile.png');
    await page.close();
  }

  // 3. Employer Desktop
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto('file://' + path.resolve('employer.html').replace(/\\/g, '/'));
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(artifactDir, 'eluma_v21_employer_desktop.png'), fullPage: false });
    console.log('Saved eluma_v21_employer_desktop.png');
    await page.close();
  }

  await browser.close();
  console.log('All v21 screenshots captured successfully!');
})();
