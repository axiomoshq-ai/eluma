const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function capture() {
  const artifactDir = 'C:\\Users\\Nusik21\\.gemini\\antigravity\\brain\\90f6d611-00f4-4057-b4fc-80004267d8fa';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // 1. Worker Desktop with Geo-radar & Power Filter Bar
  const p1 = await context.newPage();
  await p1.goto('file://' + path.resolve(__dirname, '../worker.html'), { waitUntil: 'load' });
  await p1.waitForTimeout(600);
  await p1.screenshot({ path: path.join(artifactDir, 'eluma_v20_worker_desktop.png') });
  console.log('Captured eluma_v20_worker_desktop.png');

  // 2. Worker Slide-Over Drawer
  const firstCard = await p1.$('.worker-task-unit');
  if (firstCard) {
    await firstCard.click();
    await p1.waitForTimeout(400);
    await p1.screenshot({ path: path.join(artifactDir, 'eluma_v20_worker_drawer.png') });
    console.log('Captured eluma_v20_worker_drawer.png');
    await p1.click('.drawer-close-btn');
    await p1.waitForTimeout(200);
  }

  // 3. Worker NPD Tax Cabinet
  await p1.click('#headerNpdSbpBtn');
  await p1.waitForTimeout(300);
  await p1.screenshot({ path: path.join(artifactDir, 'eluma_v20_npd_cabinet.png') });
  console.log('Captured eluma_v20_npd_cabinet.png');
  await p1.click('#npdTaxCabinetModal .modal-close-ico');
  await p1.waitForTimeout(200);

  // 4. Command Palette
  await p1.keyboard.press('Control+k');
  await p1.waitForTimeout(300);
  await p1.screenshot({ path: path.join(artifactDir, 'eluma_v20_command_palette.png') });
  console.log('Captured eluma_v20_command_palette.png');
  await p1.keyboard.press('Escape');
  await p1.waitForTimeout(200);

  // 5. Employer Console with Action Queue
  const p2 = await context.newPage();
  await p2.goto('file://' + path.resolve(__dirname, '../employer.html'), { waitUntil: 'load' });
  await p2.waitForTimeout(600);
  // trigger 1 event for realistic demonstration
  await p2.click('.action-queue-sim-btn');
  await p2.waitForTimeout(400);
  await p2.screenshot({ path: path.join(artifactDir, 'eluma_v20_employer_console.png') });
  console.log('Captured eluma_v20_employer_console.png');

  await browser.close();
  console.log('All v20 screenshots captured successfully!');
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
