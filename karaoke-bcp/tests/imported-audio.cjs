const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const imported = require('../songs/AUDIOS-IMPORTADOS.json');
async function main() {
  const browser = await chromium.launch({channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true});
  try {
    const context = await browser.newContext();
    await context.route('https://www.gstatic.com/firebasejs/**', route => route.fulfill({
      contentType: 'text/javascript', body: route.request().url().includes('firebase-app.js')
        ? 'export const initializeApp=()=>({});'
        : 'export const getFirestore=()=>({});export const doc=()=>({});export const serverTimestamp=()=>0;export const setDoc=async()=>{throw new Error("offline")};export const onSnapshot=(r,cb)=>{queueMicrotask(()=>cb({exists:()=>false}));return ()=>{}};',
    }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto((process.env.KARAOKE_BASE_URL || 'http://127.0.0.1:5181/karaoke-bcp/') + '?room=IMPORT_TEST');
    await page.locator('#audio').waitFor({state:'attached'});
    assert.equal(await page.locator('.song.enabled').count(), 23);
    assert.equal(await page.locator('.song.disabled').count(), 0);
    for (const song of imported) {
      await page.locator(`[data-song="${song.id}"]`).click();
      await page.locator('[data-version="full"]').click();
      await page.waitForFunction(() => {
        const audio = document.querySelector('#audio');
        return !audio.paused && audio.currentTime > 0 && audio.readyState >= 2;
      });
      const duration = await page.locator('#audio').evaluate(audio => audio.duration);
      assert.ok(Math.abs(duration - song.durationSeconds) < 1, `${song.id}: duration mismatch`);
      await page.waitForFunction(() => document.querySelector('#version').textContent.includes('aproximados'));
      await page.waitForFunction(() => !['', '♪', 'Letra pendiente de sincronizar'].includes(document.querySelector('#currentBase').textContent));
      await page.locator('#seek').evaluate(input => { input.value = 50; input.dispatchEvent(new Event('input')); input.dispatchEvent(new Event('change')); });
      assert.ok(await page.locator('#audio').evaluate(audio => audio.currentTime > audio.duration * .45));
      await page.locator('#backBtn').click();
      await page.waitForFunction(() => !document.querySelector('#selectorView').hidden);
    }
    assert.deepEqual(errors, []);
    console.log(`Imported audio: ${imported.length} tracks decoded, played, sought and displayed lyrics.`);
  } finally { await browser.close(); }
}
main().catch(error => {console.error(error);process.exitCode=1;});
