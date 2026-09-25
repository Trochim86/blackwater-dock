# BLACKWATER DOCK

Klimatyczna gra przeglądarkowa o prowadzeniu łodzi podwodnej Kestrel-7 przez sztormy,
ciemne głębiny i precyzyjne manewry dokowania. Cała gra to **jeden plik `index.html`**
(HTML + CSS + vanilla JS, canvas 2D, WebAudio) — zero zależności, zero builda.

## Szybki start

```bash
# opcja 1: po prostu otwórz plik w przeglądarce
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux

# opcja 2: lokalny serwer (zalecane przy dalszym rozwoju)
npx serve .              # -> http://localhost:3000
```

## Sterowanie

| Klawisz | Akcja |
|---|---|
| `←` `→` | kurs (heading) |
| `↑` `↓` | ciąg (throttle 0–8) |
| `Z` `X` | trym balastu (głębokość) |
| `S` | tryb sonaru: OFF → PASSIVE → ACTIVE |
| `P` | awaryjne wynurzenie (koszt baterii) |
| `H` / `E` | decyzja sztormowa: trzymaj kurs / tnij na wschód |
| `TAB` | dolny instrument: profil 2D ↔ teren 3D |
| przycisk `▦ PIXEL` | tryb retro CRT |
| przycisk `🔊 AUDIO` | dźwięk on/off |

## Mechaniki (stan obecny — v5)

- **Echo Pulse** — przeszkody i ładunek widoczne tylko po oświetleniu falą pingu;
  echa bledną, dryfujące obiekty zostawiają "ostatnią znaną pozycję".
  ACTIVE: zasięg 1500 m, koszt baterii za ping. PASSIVE: bez pingu, ciągły nasłuch 420 m.
- **Teren** — heightmapa `terr(x,y)`; warstwice na sonarze, profil 2D i wireframe 3D.
  Dno jest fizyczne: szuranie po grzbiecie = obrażenia balastu/silnika.
- **Sztorm** — timer, decyzja H/E z realnym kosztem; brak decyzji = najgorsza opcja.
- **Dokowanie** — korytarz, prąd znoszący, checklist, manual vs assisted alignment.
- **VESSEL** — przekrój łodzi, 6 przedziałów z osobnym stanem uszkodzeń, każdy
  wpływa na osiągi (silnik→prędkość, balast→trym, sonar→zasięg pingu, itd.).
  Uszkodzenia persystują między misjami; naprawa w stoczni za kredyty.
- **Salvage** — zielone kontakty; podpłyń na ich głębokość, 6 slotów magazynu,
  sprzedaż automatyczna po zadokowaniu, utrata przy porażce.
- **Sklep** — Sonar Amplifier / Aux Battery / Reinforced Hull (ekran MISSIONS).
- **6 misji**, logbook ze statystykami, best run, odznaki.

## Struktura kodu (wszystko w `index.html`)

1. `<style>` — stylistyka "instrument panelu" + skin okrętowy + retro CRT + vessel.
2. `<body>` — nav, HUD, ekrany: `#screen-dive`, `#screen-dock`, `#screen-vessel`,
   `#screen-missions`, `#screen-logbook`, overlay końca misji.
3. `<script>` — sekcje oznaczone komentarzami `/* ---- NAZWA ---- */`:
   stan `G`, misje `MISSIONS`, audio `AU`, echo pulse, sztorm, `updateDive/updateDock`,
   rendery (`drawSonar`, `drawDock`, `drawMissionMap`, profil/3D), vessel, shop,
   logbook, pętla `frame()`.

Szczegółowa mapa kodu i konwencje: **`CLAUDE.md`** (czyta ją też Claude Code).
Plan rozwoju: **`docs/ROADMAP.md`**.

## Testy

`test/smoke.test.js` — smoke test w Playwright (wymaga `npm i -D playwright`):

```bash
node test/smoke.test.js
```

## Praca z Claude Code

```bash
cd blackwater-dock
claude
```

Claude Code automatycznie wczyta `CLAUDE.md`. Przykładowe polecenia:
- *"dodaj tryb blackout jako modyfikator misji zgodnie z roadmapą"*
- *"przenieś stan gry do localStorage zgodnie z sekcją Save System w ROADMAP"*
- *"uruchom smoke test i napraw co się wysypie"*
