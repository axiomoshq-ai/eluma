const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
  
  await page.goto('file://' + path.resolve('worker.html').replace(/\\/g, '/'));
  await page.evaluate(() => window.Olksi.Worker.navigate('home'));
  await page.waitForTimeout(100);

  const testCss = `
    @media (max-width: 600px) {
      .app-header {
        padding: 8px 12px;
      }
      .header-inner {
        gap: 6px;
      }
      .header-status-pill {
        display: none !important;
      }
      .header-quick-create-btn span {
        display: none !important;
      }
      .header-title-box {
        min-width: 0;
        flex: 1;
        overflow: hidden;
      }
      .header-screen-title {
        font-size: 15px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .app-body-content {
        padding: 12px 10px !important;
        overflow-x: hidden !important;
        max-width: 100vw !important;
      }
      .feed-top-toolbar {
        width: 100%;
        max-width: 100%;
      }
      .unit-top-badges-row {
        flex-wrap: wrap !important;
        gap: 8px !important;
      }
      .unit-shields-right {
        flex-wrap: wrap !important;
      }
      .unit-main-row {
        flex-direction: column !important;
        gap: 10px !important;
      }
      .unit-payout-box, .unit-price-col {
        align-items: flex-start !important;
        text-align: left !important;
      }
      .unit-bottom-row {
        flex-wrap: wrap !important;
        gap: 10px !important;
      }
      .worker-task-unit, .employer-task-card {
        padding: 14px 12px !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
      }
      .split-feed-col {
        min-width: 0 !important;
        width: 100% !important;
      }
      .worker-tasks-list {
        min-width: 0 !important;
        width: 100% !important;
      }
      .chats-split-grid {
        display: block !important;
        height: auto !important;
      }
      .chats-conversation-col {
        min-width: 0 !important;
      }
      .chat-messages-container {
        max-height: 400px !important;
      }
      .profile-info-grid, .profile-grid, .profile-metrics-grid {
        grid-template-columns: 1fr !important;
      }
      .payouts-history-table {
        display: block !important;
        overflow-x: auto !important;
      }
    }
  `;

  await page.addStyleTag({ content: testCss });
  await page.waitForTimeout(100);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log('Worker Home:', { overflow, scrollWidth });

  const screens = ['home', 'payouts', 'chats', 'profile'];
  for (const scr of screens) {
    await page.evaluate((s) => window.Olksi.Worker.navigate(s), scr);
    await page.waitForTimeout(50);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    console.log(`Worker [${scr}]:`, { overflow: ov, scrollWidth: sw });
  }

  // Course player
  await page.evaluate(() => window.Olksi.Worker.startCourse('safe_intro'));
  await page.waitForTimeout(50);
  const cOv = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log('Worker Course player:', { overflow: cOv });

  // Employer profile
  await page.goto('file://' + path.resolve('employer.html').replace(/\\/g, '/'));
  await page.addStyleTag({ content: testCss });
  await page.evaluate(() => window.Olksi.Employer.navigate('profile'));
  await page.waitForTimeout(50);
  const empProfileOv = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log('Employer Profile:', { overflow: empProfileOv });

  await browser.close();
})();
