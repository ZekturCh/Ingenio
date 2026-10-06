const { chromium } = require('playwright');
const assert = require('node:assert/strict');

async function run() {
  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true,
    args: ['--autoplay-policy=user-gesture-required'],
  });
  try {
    const context = await browser.newContext({ hasTouch: true, viewport: { width: 1080, height: 1920 } });
    // No test commands reach a real Firebase room, including the offline fallback.
    await context.route('https://www.gstatic.com/firebasejs/**', route => route.fulfill({
      contentType: 'text/javascript', body: route.request().url().includes('firebase-app.js')
        ? 'export const initializeApp=()=>({});'
        : 'export const getFirestore=()=>({});export const doc=()=>({});export const serverTimestamp=()=>0;export const setDoc=async()=>{throw new Error("offline")};export const onSnapshot=(r,cb)=>{queueMicrotask(()=>cb({exists:()=>false}));return ()=>{}};',
    }));
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const url = new URL(process.env.KARAOKE_BASE_URL || 'http://127.0.0.1:5181/karaoke-bcp/');
    url.searchParams.set('room', 'SINGLESCREEN_TEST');
    await page.goto(url.href);
    await page.locator('#audio').waitFor({ state: 'attached' });
    assert.equal(await page.locator('#songs').evaluate(el => getComputedStyle(el).scrollbarWidth), 'none');
    assert.equal(await page.locator('#songs').getAttribute('tabindex'), '0');
    await page.locator('#search').fill('bareto');
    await page.locator('[data-song="carinito"]').tap();
    await page.locator('[data-version="chorus"]').tap();
    await page.waitForFunction(() => !document.querySelector('#audio').paused && document.querySelector('#audio').currentTime >= 57);
    assert.equal(context.pages().length, 1);
    assert.equal(await page.locator('#selectorView').isVisible(), false);
    assert.equal(await page.locator('#stage').isVisible(), true);
    assert.equal(await page.locator('#activate').count(), 0);
    assert.equal(await page.locator('#remaining').textContent(), '01:00');
    await page.locator('#backBtn').tap();
    await page.waitForFunction(() => !document.querySelector('#selectorView').hidden);
    assert.equal(await page.locator('#audio').evaluate(a => a.paused), true);
    assert.equal(await page.locator('#search').inputValue(), 'bareto');
    await page.locator('[data-song="carinito"]').tap();
    await page.locator('[data-version="full"]').tap();
    await page.waitForFunction(() => !document.querySelector('#audio').paused && document.querySelector('#audio').currentTime < 4);
    assert.equal(await page.locator('#remaining').textContent(), '03:43');
    await page.locator('#playBtn').tap();
    await page.waitForFunction(() => document.querySelector('#audio').paused);
    await page.evaluate(() => { const a = document.querySelector('#audio'); a.currentTime = 65; a.dispatchEvent(new Event('timeupdate')); });
    await page.waitForFunction(() => document.querySelector('#currentBase').textContent !== 'Letra no disponible');
    await page.evaluate(() => document.fonts.ready);
    for (const [width, height] of [[1080,1920],[390,844],[854,480]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const layout = await page.evaluate(() => {
        const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
        const panel = document.querySelector('.lyricPanel'), style = getComputedStyle(panel);
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          duplicateIds: ids.filter((id, i) => ids.indexOf(id) !== i),
          controlsVisible: document.querySelector('.controls').getBoundingClientRect().bottom <= innerHeight,
          lyricsFit: document.querySelector('#lyrics').scrollHeight <= panel.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) + 2,
        };
      });
      assert.deepEqual(layout, { overflow: false, duplicateIds: [], controlsVisible: true, lyricsFit: true });
    }
    await page.goBack();
    await page.waitForFunction(() => !document.querySelector('#selectorView').hidden);
    assert.equal(await page.locator('#audio').evaluate(a => a.paused), true);
    await page.goForward();
    await page.waitForFunction(() => !document.querySelector('#playbackView').hidden);
    assert.equal(await page.locator('#audio').evaluate(a => a.paused), true);
    assert.deepEqual(errors, []);
    console.log('Single-screen touch playback, offline fallback, back navigation and layouts: passed.');
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
