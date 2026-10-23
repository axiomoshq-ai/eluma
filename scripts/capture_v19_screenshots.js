const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch({ headless: true });

  const outDir = 'C:/Users/Nusik21/.gemini/antigravity/brain/90f6d611-00f4-4057-b4fc-80004267d8fa';
  const baseUri = 'file:///' + path.resolve(__dirname, '..').replace(/\\/g, '/');

  // 1. Worker Desktop (Light Mode)
  const contextLight = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });
  const page1 = await contextLight.newPage();
  await page1.goto(baseUri + '/worker.html');
  await page1.evaluate(() => {
    localStorage.removeItem('eluma_theme');
    localStorage.removeItem('olksi_theme');
    document.documentElement.removeAttribute('data-theme');
  });
  await page1.waitForTimeout(500);
  await page1.screenshot({ path: path.join(outDir, 'eluma_v19_worker_desktop.png') });

  // 2. Worker Dark Mode
  await page1.evaluate(() => window.Eluma.UI.toggleTheme());
  await page1.waitForTimeout(500);
  await page1.screenshot({ path: path.join(outDir, 'eluma_v19_worker_dark.png') });
  await page1.close();

  // 3. Employer Desktop (Light Mode)
  const page2 = await contextLight.newPage();
  await page2.goto(baseUri + '/employer.html');
  await page2.evaluate(() => {
    localStorage.removeItem('eluma_theme');
    localStorage.removeItem('olksi_theme');
    document.documentElement.removeAttribute('data-theme');
  });
  await page2.waitForTimeout(500);
  await page2.screenshot({ path: path.join(outDir, 'eluma_v19_employer_desktop.png') });

  // 4. Employer Dark Mode
  await page2.evaluate(() => window.Eluma.UI.toggleTheme());
  await page2.waitForTimeout(500);
  await page2.screenshot({ path: path.join(outDir, 'eluma_v19_employer_dark.png') });

  // 5. Employer Create Shift Screen (Light Mode)
  await page2.evaluate(() => {
    window.Eluma.UI.toggleTheme();
    window.Eluma.Employer.navigate('create');
  });
  await page2.waitForTimeout(500);
  await page2.screenshot({ path: path.join(outDir, 'eluma_v19_employer_create.png') });
  await page2.close();

  // 6. Mobile Worker View (375x812, Light Mode)
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 1
  });
  const page3 = await mobileContext.newPage();
  await page3.goto(baseUri + '/worker.html');
  await page3.evaluate(() => {
    localStorage.removeItem('eluma_theme');
    localStorage.removeItem('olksi_theme');
    document.documentElement.removeAttribute('data-theme');
  });
  await page3.waitForTimeout(600);
  await page3.screenshot({ path: path.join(outDir, 'eluma_v19_worker_mobile.png') });
  await page3.close();

  await browser.close();
  console.log('All v19 screenshots captured successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
