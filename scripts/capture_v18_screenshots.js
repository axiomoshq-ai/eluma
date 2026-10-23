const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });

  const outDir = 'C:/Users/Nusik21/.gemini/antigravity/brain/90f6d611-00f4-4057-b4fc-80004267d8fa';
  const baseUri = 'file:///' + path.resolve(__dirname, '..').replace(/\\/g, '/');

  // 1. Index / Auth
  const page1 = await context.newPage();
  await page1.goto(baseUri + '/index.html');
  await page1.waitForTimeout(500);
  await page1.screenshot({ path: path.join(outDir, 'eluma_v18_index_auth.png') });
  await page1.close();

  // 2. Worker Desktop
  const page2 = await context.newPage();
  await page2.goto(baseUri + '/worker.html');
  await page2.waitForTimeout(800);
  await page2.screenshot({ path: path.join(outDir, 'eluma_v18_worker_desktop.png') });

  // 3. Worker Detail
  await page2.evaluate(() => window.Eluma.Worker.openDetail(1));
  await page2.waitForTimeout(600);
  await page2.screenshot({ path: path.join(outDir, 'eluma_v18_worker_detail.png') });
  await page2.close();

  // 4. Employer Desktop (2-Column Grid)
  const page3 = await context.newPage();
  await page3.goto(baseUri + '/employer.html');
  await page3.waitForTimeout(800);
  await page3.screenshot({ path: path.join(outDir, 'eluma_v18_employer_desktop.png') });

  // 5. Employer Create Shift
  await page3.evaluate(() => window.Eluma.Employer.navigate('create'));
  await page3.waitForTimeout(600);
  await page3.screenshot({ path: path.join(outDir, 'eluma_v18_employer_create.png') });

  // 6. Dev Toolkit
  await page3.evaluate(() => window.Eluma.DevToolkit && window.Eluma.DevToolkit.openModal && window.Eluma.DevToolkit.openModal());
  await page3.waitForTimeout(600);
  await page3.screenshot({ path: path.join(outDir, 'eluma_v18_dev_toolkit.png') });
  await page3.close();

  await browser.close();
  console.log('All v18 screenshots captured successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
