/* Smoke test — BLACKWATER DOCK
 * Wymaga: npm i -D playwright && npx playwright install chromium
 * Uruchomienie: node test/smoke.test.js
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  const url = 'file://' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
  await page.goto(url);
  await page.waitForTimeout(1200);

  // 1. gra startuje
  const s1 = await page.evaluate(() => ({ running: G.running, mode: G.mode, salvage: G.salvage.length }));
  console.log('boot:', JSON.stringify(s1));

  // 2. sterowanie działa
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowUp');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(600);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(1500);
  const s2 = await page.evaluate(() => ({ spd: +G.sub.spd.toFixed(1), thr: G.sub.thr, dist: Math.round(G.distTravelled) }));
  console.log('input:', JSON.stringify(s2), s2.dist > 0 ? 'OK' : 'FAIL: łódź się nie rusza');

  // 3. echo pulse odsłania kontakty
  await page.evaluate(() => { const c = [...G.hazards, ...G.salvage][0]; G.sub.x = c.x - 500; G.sub.y = c.y; });
  await page.waitForTimeout(4000);
  const seen = await page.evaluate(() => [...G.hazards, ...G.salvage].some(c => c.seen > 0));
  console.log('echo pulse:', seen ? 'OK' : 'FAIL: ping nie odsłania kontaktów');

  // 4. przejście do dokowania i sukces
  await page.evaluate(() => { const w = G.wpts[G.wpts.length - 1]; G.wpIdx = G.wpts.length - 1; G.sub.x = w.x - 100; G.sub.y = w.y; });
  await page.waitForTimeout(1500);
  const dock = await page.evaluate(() => G.mode);
  console.log('dock transition:', dock === 'dock' ? 'OK' : 'FAIL: ' + dock);
  await page.click('#btn-assist');
  await page.evaluate(() => { G.dock.lateral = 3; G.sub.thr = 2; G.dock.dist = 120; });
  await page.waitForTimeout(6000);
  const end = await page.evaluate(() => ({ over: G.over, title: document.getElementById('ov-title').textContent }));
  console.log('docking:', JSON.stringify(end), end.over ? 'OK' : 'FAIL');

  // 5. zakładki renderują się bez błędów
  await page.evaluate(() => document.getElementById('overlay').classList.remove('show'));
  for (const tab of ['vessel', 'missions', 'logbook', 'dive']) {
    await page.click(`[data-tab="${tab}"]`);
    await page.waitForTimeout(300);
  }
  console.log('tabs: OK');

  // 5b. legenda: każdy wiersz ma ikonę, kolumny nie leją się w bok
  await page.keyboard.press('Escape');
  await page.click('#pz-tab-leg');
  await page.waitForTimeout(400);
  const leg = await page.evaluate(() => {
    const scroller = document.getElementById('pz-legend');
    const cols = [...scroller.querySelectorAll('.lg-col')];
    return {
      rows: document.querySelectorAll('.lg-row').length,
      // pusta studzienka = wiersz z literówką w nazwie ikony
      empty: [...document.querySelectorAll('.lg-ic')].filter(e => !e.firstElementChild).length,
      sprites: document.querySelectorAll('.lg-spr canvas').length,
      cols: cols.length,
      hScroll: scroller.scrollWidth > scroller.clientWidth + 1,
    };
  });
  const legOK = leg.rows > 0 && leg.empty === 0 && leg.sprites === 7 && !leg.hScroll;
  console.log('legenda:', JSON.stringify(leg), legOK ? 'OK' : 'FAIL');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // 6. tryby wizualne — mierzymy koszt rysowania (ms/wywołanie), nie fps.
  //    Headless chromium rasteryzuje canvas na CPU, więc licznik rAF pokazuje
  //    głównie koszt filtru CRT (pixelate ~9 ms/klatkę wobec ~0.01 ms na GPU)
  //    i potrafi wahać się 60 -> 20 między przebiegami na obciążonej maszynie.
  //    Poprzednia wersja mierzyła w dodatku ekran doku, bo po zadokowaniu
  //    G.mode === 'dock' — drawSonar nigdy nie był wywoływany.
  const bench = (name) => page.evaluate((n) => {
    const fn = window[n], runs = [];
    for (let k = 0; k < 7; k++) {
      const t0 = performance.now();
      for (let i = 0; i < 25; i++) fn();
      runs.push((performance.now() - t0) / 25);
    }
    runs.sort((a, b) => a - b);
    return +runs[3].toFixed(2);          // mediana, odporna na zakłócenia
  }, name);

  await page.evaluate(() => { G.over = false; G.mode = 'dive'; showTab('dive'); G.view3d = false; });
  await page.waitForTimeout(300);
  const cv = await page.evaluate(() => ({ w: sonar.width, h: sonar.height }));
  if (!cv.w || !cv.h) console.log('draw cost: FAIL — canvas sonaru ma zerowy rozmiar', JSON.stringify(cv));
  const c2d = await bench('drawSonar');
  await page.evaluate(() => { G.view3d = true; G.pings = []; firePing(); });
  const c3d = await bench('drawSonar');
  await page.evaluate(() => { G.mode = 'dock'; showTab('dive'); });
  await page.waitForTimeout(300);
  const cdk = await bench('drawDock');
  const worst = Math.max(c2d, c3d, cdk);
  console.log('draw ms — sonar 2D:', c2d, '| sonar 3D:', c3d, '| dock 3D:', cdk,
    worst < 8 ? 'OK' : 'WARN: rysowanie zjada budżet klatki (16.7 ms)');
  await page.click('#px-btn');
  await page.waitForTimeout(400);
  console.log('retro:', await page.evaluate(() => document.body.classList.contains('retro')) ? 'OK' : 'FAIL');

  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
