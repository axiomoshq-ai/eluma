const { chromium } = require('playwright');
const path = require('path');

async function testMapHoverPosition() {
  console.log('--- TEST: Map Hover Pin Positioning ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const workerUrl = 'file://' + path.resolve(__dirname, '../worker.html');
  await page.goto(workerUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Find map pins
  const pins = await page.$$('.map-price-bubble');
  console.log(`Found ${pins.length} map pins.`);
  if (pins.length === 0) {
    throw new Error('No map pins found on map!');
  }

  // Hover over the first pin
  const firstPin = pins[0];
  const pinText = await firstPin.innerText();
  const pinBox = await firstPin.boundingBox();
  console.log(`Hovering over pin: "${pinText}" at x=${pinBox.x.toFixed(1)}, y=${pinBox.y.toFixed(1)}, w=${pinBox.width.toFixed(1)}, h=${pinBox.height.toFixed(1)}`);

  await firstPin.hover();
  await page.waitForTimeout(350);

  // Check card
  const card = await page.$('#mapHoverPreviewCard');
  const isVisible = await card.isVisible();
  const cardBox = await card.boundingBox();
  console.log(`Card visible: ${isVisible}`);
  console.log(`Card position: x=${cardBox.x.toFixed(1)}, y=${cardBox.y.toFixed(1)}, w=${cardBox.width.toFixed(1)}, h=${cardBox.height.toFixed(1)}`);

  // Distance between pin center and card center X
  const pinCenterX = pinBox.x + pinBox.width / 2;
  const cardCenterX = cardBox.x + cardBox.width / 2;
  const xDiff = Math.abs(pinCenterX - cardCenterX);
  console.log(`Center X difference: ${xDiff.toFixed(1)}px (should be small or aligned)`);

  // Vertical distance between pin and card
  const verticalGapAbove = pinBox.y - (cardBox.y + cardBox.height);
  const verticalGapBelow = cardBox.y - (pinBox.y + pinBox.height);
  console.log(`Vertical gap if above: ${verticalGapAbove.toFixed(1)}px, if below: ${verticalGapBelow.toFixed(1)}px`);

  const isAdjacent = (verticalGapAbove >= 0 && verticalGapAbove <= 30) || (verticalGapBelow >= 0 && verticalGapBelow <= 30);
  console.log(`Is card directly adjacent to pin? ${isAdjacent}`);

  if (!isAdjacent) {
    throw new Error(`Card is not adjacent to pin! verticalGapAbove=${verticalGapAbove}, verticalGapBelow=${verticalGapBelow}`);
  }

  // Take screenshot for visual inspection
  const screenshotPath = path.resolve('C:/Users/Nusik21/.gemini/antigravity/brain/90f6d611-00f4-4057-b4fc-80004267d8fa/eluma_v22_fixed_map_hover.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Screenshot saved to: ${screenshotPath}`);

  // Test hovering another pin (e.g. pin #5 or #10)
  if (pins.length > 5) {
    const anotherPin = pins[5];
    const anotherPinText = await anotherPin.innerText();
    const anotherPinBox = await anotherPin.boundingBox();
    console.log(`Hovering over another pin: "${anotherPinText}" at x=${anotherPinBox.x.toFixed(1)}, y=${anotherPinBox.y.toFixed(1)}`);
    await anotherPin.hover();
    await page.waitForTimeout(350);

    const anotherCardBox = await card.boundingBox();
    console.log(`Another card position: x=${anotherCardBox.x.toFixed(1)}, y=${anotherCardBox.y.toFixed(1)}`);
    const anotherGapAbove = anotherPinBox.y - (anotherCardBox.y + anotherCardBox.height);
    const anotherGapBelow = anotherCardBox.y - (anotherPinBox.y + anotherPinBox.height);
    const anotherAdjacent = (anotherGapAbove >= 0 && anotherGapAbove <= 30) || (anotherGapBelow >= 0 && anotherGapBelow <= 30);
    console.log(`Another pin card adjacent: ${anotherAdjacent}`);
    if (!anotherAdjacent) {
      throw new Error(`Card not adjacent to second pin!`);
    }
  }

  await browser.close();
  console.log('[PASS] Map hover pin positioning test succeeded 100%!');
}

testMapHoverPosition().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
