const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
async function main() {
  const settings = await import(`data:text/javascript;base64,${fs.readFileSync(path.join(root,'audio-settings.js')).toString('base64')}`);
  assert.equal(settings.lyricTime(10, 300), 9.7);
  assert.equal(settings.lyricTime(10, -300), 10.3);
  assert.equal(settings.normalizeDelay(Infinity), 0);
  assert.equal(settings.normalizeDelay(99999), 2500);
  assert.equal(settings.normalizeDelay(-99999), -1500);
  const browser = await chromium.launch({channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless:true});
  try {
    const context = await browser.newContext();
    await context.route('https://www.gstatic.com/firebasejs/**', route => route.abort());
    const page = await context.newPage(), errors=[];
    page.on('pageerror', e => errors.push(e.message));
    const base = process.env.KARAOKE_BASE_URL || 'http://127.0.0.1:5181/karaoke-bcp/';
    await page.goto(base + '?room=OFFLINE_TEST');
    await page.locator('.offline-indicator[data-state="downloading"]').waitFor({timeout:30000});
    await page.locator('.offline-indicator[data-state="ready"]').waitFor({timeout:120000});
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    const manifest = require('../offline-assets.json');
    const result = await page.evaluate(async () => {
      const keys = (await caches.keys()).filter(name=>name.startsWith('samay-karaoke-'));
      const cache = await caches.open(keys[0]);
      return (await cache.keys()).length;
    });
    assert.ok(result >= manifest.assets.length);
    await context.setOffline(true);
    await page.reload();
    await page.locator('.offline-indicator[data-state="ready"]').waitFor();
    assert.equal(await page.locator('.song.enabled').count(),23);
    assert.ok(await page.locator('#selectorView .brandWordmark').evaluate(img => img.complete && img.naturalWidth > 0));
    // Cold-load each available track from the cache, including seeks into full MP3 files.
    const songs = await page.evaluate(async () => (await import('./songs/catalog.js')).SONGS.filter(song=>song.enabled));
    for (const song of songs) {
      await page.locator(`[data-song="${song.id}"]`).click();
      await page.locator('[data-version="full"]').click();
      await page.waitForFunction(() => { const a=document.querySelector('#audio');return !a.paused && a.currentTime>0 && a.readyState>=2; });
      await page.locator('#seek').evaluate(input=>{input.value=60;input.dispatchEvent(new Event('input'));input.dispatchEvent(new Event('change'));});
      await page.waitForFunction(() => {const a=document.querySelector('#audio');return a.currentTime > a.duration*.55 && a.readyState>=2;});
      await page.waitForFunction(() => !['', '♪', 'Letra pendiente de sincronizar', 'Vamos a cantar'].includes(document.querySelector('#currentBase').textContent));
      await page.locator('#backBtn').click();
      await page.waitForFunction(()=>!document.querySelector('#selectorView').hidden);
    }
    // A positive delay holds back actual lyrics without seeking or changing the audio clock.
    await page.locator('[data-song="carinito"]').click();
    await page.locator('[data-version="full"]').click();
    const expected = await page.evaluate(async()=>{
      const data=await (await fetch('songs/carinito/lyrics-timed.json')).json();
      const lines=data.lyrics;
      const i=lines.findIndex((line,index)=>index>0 && line.text!==lines[index-1].text && line.start-lines[index-1].start>.5);
      const audio=document.querySelector('#audio');
      audio.pause();audio.currentTime=lines[i].start+.1;
      return {text:lines[i].text,previous:lines[i-1].text,time:audio.currentTime};
    });
    await page.waitForFunction(text=>document.querySelector('#currentBase').textContent===text,expected.text);
    await page.locator('.device-open').click();
    await page.locator('#bluetoothDelay').evaluate(input=>{input.value=300;input.dispatchEvent(new Event('input'));});
    assert.equal(await page.locator('#delayValue').textContent(), '+300 ms');
    assert.equal(await page.locator('#currentBase').textContent(),expected.previous);
    assert.ok(Math.abs(await page.locator('#audio').evaluate(a=>a.currentTime)-expected.time)<.01);
    await page.locator('#calibrationPlay').click();
    await page.waitForFunction(()=>!document.querySelector('#calibrationAudio').paused && document.querySelector('#calibrationAudio').readyState>=2);
    await page.locator('#calibrationAudio').evaluate(a=>{a.pause();a.currentTime=2.32;});
    await page.locator('#calibrationPlay').click();
    await page.locator('#calibrationPulse.flash').waitFor();
    await page.locator('.device-close').click();
    assert.equal(await page.locator('#calibrationAudio').evaluate(a=>a.paused),true);
    await page.reload();
    await page.locator('.device-open').click();
    assert.equal(await page.locator('#bluetoothDelay').inputValue(),'300');
    await page.locator('#resetDelay').click();
    await page.locator('.device-close').click();
    // Validate byte ranges, suffix requests and invalid ranges without network access.
    const ranges = await page.evaluate(async()=>{
      const url='songs/carinito/audio.mp3';
      const a=await fetch(url,{headers:{Range:'bytes=100-199'}});
      const b=await fetch(url,{headers:{Range:'bytes=-50'}});
      const c=await fetch(url,{headers:{Range:'bytes=999999999-'}});
      return [a.status,(await a.arrayBuffer()).byteLength,b.status,(await b.arrayBuffer()).byteLength,c.status];
    });
    assert.deepEqual(ranges,[206,100,206,50,416]);
    // Open pages never visited online, with query strings, entirely from the saved app.
    const editor = await context.newPage();
    await editor.goto(new URL('timing-editor.html?song=la-llorona',base).href);
    await editor.waitForFunction(()=>document.querySelector('#text').value.length>0);
    const admin = await context.newPage();
    await admin.goto(new URL('admin.html?room=OFFLINE_TEST',base).href);
    await admin.locator('[data-command="pause"]').click();
    const tv = await context.newPage();
    await tv.goto(new URL('player.html?room=OFFLINE_TEST',base).href);
    await tv.locator('#activateBtn').click();
    await tv.waitForFunction(()=>!document.querySelector('#activate').open);
    // Losing one cached resource must remove the green confirmation; retry repairs it.
    await page.evaluate(async()=>{
      for(const name of (await caches.keys()).filter(name=>name.startsWith('samay-karaoke-'))) {
        await (await caches.open(name)).delete(new URL('songs/amor-eterno/audio.mp3',location.href));
      }
      navigator.serviceWorker.controller.postMessage({type:'CHECK_OFFLINE'});
    });
    // Another open page may immediately retry the missing file while offline,
    // producing an error state rather than an idle incomplete state. Both are red.
    await page.waitForFunction(()=>['incomplete','error'].includes(document.querySelector('.offline-indicator').dataset.state));
    await context.setOffline(false);
    await page.locator('.offline-indicator[data-state="ready"]').waitFor({timeout:60000});
    assert.deepEqual(errors,[]);
    console.log('Offline: all 23 tracks, range seeks, cold pages, cache recovery, calibration and saved delay passed.');
  } finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
