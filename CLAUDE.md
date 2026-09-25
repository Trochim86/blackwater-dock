# CLAUDE.md — kontekst projektu dla Claude Code

## Czym jest ten projekt

BLACKWATER DOCK — gra przeglądarkowa (łódź podwodna, sonar, sztormy, dokowanie).
**Cała gra żyje w jednym pliku `index.html`** — to świadoma decyzja architektoniczna
na etapie prototypu. Nie rozbijaj na moduły bez wyraźnej prośby użytkownika.
Vanilla JS, canvas 2D, WebAudio. Zero frameworków, zero bundlera, zero zależności runtime.

Język UI: mieszanka EN (nazwy instrumentów jak na makietach) i PL (komunikaty, opisy).
Komunikaty toast i opisy dla gracza — po polsku. Docelowo planowana lokalizacja EN.

## Mapa kodu (sekcje w `<script>` oznaczone komentarzami `/* ---- X ---- */`)

- **Stan globalny `G`** — sub (pozycja, hdg, thr, depth, batt, hull...), mission,
  wpts/wpIdx, hazards, salvage, cargo, pings, storm, dock, stats (persystentne
  między misjami: credits, upg, sys, dives...).
- **`MISSIONS[]`** — 6 tras; parametry: dmin/dmax, storm (0–3), haz, wp, len, credits.
- **`setupMission(m)`** — reset stanu + deterministyczny RNG `mulberry(seed)`;
  generuje waypointy, hazardy (z głębokością!), salvage, sztorm.
- **Audio `AU`** — WebAudio: hum silnika, szum głębin, `sonarPing()`, `creak()`.
  Inicjalizacja po pierwszym geście użytkownika (`audioKick`). Mute: `#snd-btn`.
- **Echo Pulse** — `firePing()` (zasięg zależny od trybu sonaru, upgrade'u i stanu
  SONAR ARRAY), `updatePings()` (kontakty = hazards + salvage; snapshot `sx,sy`
  + `seen`). Rendering ech w `drawSonar` z fade (`echoFadeT()`).
- **Teren** — `terr(x,y)` (suma sinusów, deterministyczna), `seabed(x,y)` (głębokość
  dna z terr, zależna od misji). Warstwice: marching squares w `ensureTerrain()`
  cache'owane na offscreen canvas `tcache`, re-render gdy łódź ucieknie z paddingu.
- **Systemy łodzi** — `sys()` = 6 przedziałów {sonar,cargo,control,battery,engine,ballast},
  kondycja 5–100, **persystuje między misjami**. `sysDmg(keys,a)` przy zdarzeniach.
  `sysF(k)` = 0.55..1.0 mnożnik wydajności. Efekty: engine→spdCap, ballast→tempo
  zanurzania, sonar→zasięg pingu i confidence, battery→drain, control→dryf w doku.
- **`updateDive(dt)`** — ruch, grounding (dno!), kolizje hazardów (2D + |Δdepth|<45),
  pickup salvage (dist<75, |Δdepth|<40), bateria, sztorm, waypointy → `enterDock()`.
- **`updateDock(dt)`** — korytarz, lateral drift, alignment, manual/assist, capture,
  `D.roll` (przechył kadru z tempa znoszenia, liczony tu — nie w renderze).
- **`endDive(success,...)`** — kredyty (+ sprzedaż cargo), statystyki, overlay.
- **Rendery** — `drawDock()`, `drawMissionMap()`, `drawHdgTape()` oraz `drawSonar()`,
  która jest teraz **dyspozytorem dwóch układów ekranu** (`G.view3d`, klawisz TAB):
  - `chart()` + `profile2d()` — mapa z góry na pełnym panelu, profil głębokości pod spodem,
  - `terrain3d()` + `minimap()` — teren 3D na pełnym panelu, mapa zwinięta do koła.

  Wspólne na wierzchu: `compassRose()`, `bearingScale()` i — tylko w trybie mapy —
  `depthScale()` (w 3D tę rolę pełni DOM-owy `#depth-rail`).
- **Rozpoznanie akwenu (`G.fog`)** — karta pokazuje TYLKO to, co przebadałeś;
  reszta jest zaszrafowana. Na mapach morskich tak właśnie znaczy się obszary
  niezbadane („limit of survey"), więc konwencja pokrywa się z fikcją gry.
  Siatka `FOG_CELL=100 m` × `FOG_N=200` (20 km kwadrat) zakotwiczona w punkcie
  startu; najdłuższa misja ma 7.2 km, więc łódź z niej nie ucieknie.
  Odsłaniają, w kolejności: **ping** (`fogMark` pierścieniem w `updatePings()`,
  promień `range*0.55` — kartowanie dna wymaga mocniejszego powrotu niż samo
  wykrycie kontaktu, więc jest krótszy od zasięgu echa), **kadłub** (wąski pas
  w `updateDive`, jedyne źródło w PASSIVE) i **korytarz trasy** odsłonięty
  w `setupMission` (`fogLane`) — bez tego startowałbyś zupełnie na ślepo.
  Szraf leży w `chart()` **po warstwicach, a przed trasą i echami**: zakrywa
  batymetrię, ale nie własne odczyty — echo, które złapałeś, jest twoją wiedzą
  niezależnie od stanu kartowania.
  **Wydajność:** ścieżka niezbadanych komórek jest cache'owana (`fogPath`)
  i budowana w układzie SIATKI, nie ekranu — ruch łodzi załatwia `translate()`,
  więc sam nie unieważnia cache'u. Przebudowa przy zmianie okna widoczności albo
  nie częściej niż co 120 ms. Bez tego karta kosztowała 3.7×, z tym 1.5×.
  Świadomie NIE dotyczy `profile2d()` ani widoku 3D: to instrumenty patrzące
  na żywo, a nie karta. Panel profilu musi być **kryjący**, inaczej przecieka
  przez niego szraf.
- **Minimapa** — nie ma drugiej implementacji mapy. `minimap()` ustawia clip + skalę
  na canvasie i wywołuje **tę samą `chart()`**. Flaga `lite` wycisza `label()`
  (opisy zeszłyby do ~4 px), a `liteK = 1/k` przywraca ikonie łodzi właściwy rozmiar
  ekranowy. Jeśli dodajesz coś do `chart()`, pojawi się też na minimapie.
- **`terrain3d()`** — projekcja `proj(lat,depth,z)`, siatka `T3_ROWS`×`T3_COLS`
  nad `seabed()`, **trapezowa**: rozstaw kolumn rośnie z odległością (`spread`),
  a pierwszy rząd startuje dopiero na `T3_ZNEAR` — tuż przy kamerze oczka rozdmuchuje
  perspektywa na pół ekranu i nic nie wnoszą.
  Rzędy stoją w `T3_Z[]` w **postępie geometrycznym**, nie co stały metraż: perspektywa
  ściska dal, więc równy krok 52 m dawał na ekranie pas 269 px przy dziobie i 8 px przy
  horyzoncie (32×). Stały iloraz daje 58 / 26 px. To wymusiło dwie rzeczy:
  `T3_NEAR[]` (mgła z **odległości**, nie z numeru rzędu — indeks przestał być miarą
  dystansu; ten sam wektor karmi `build3dPal()`), oraz gęstsze kolumny (19 → 29),
  bo geometryczne rzędy zamieniają oczka wysokie na szerokie i siatka zaczyna
  czytać się jak poziome pasy. Ogniskowa `f` związana z wysokością panelu, żeby
  kompozycja nie zależała od rozmiaru okna. Rysowanie **od najdalszego rzędu do
  najbliższego** (painter's algorithm).
- **Trzy warstwy terenu.** Nie ma już stałej siatki drutowej — rysują ją trzy
  warstwy o rozdzielnych zadaniach, każda z własną paletą z `build3dPal()`:
  1. **Wypełnienia** (`q3dPal`) — prawie nieprzezroczyste i prawie w kolorze toni.
     Ich jedyna praca to zasłanianie (painter's algorithm). Mają być sylwetką,
     nie powierzchnią: gdy je rozjaśnisz, chmura punktów tonie w tle.
  2. **Punkty w węzłach** (`q3dPt`) — warstwa **trwała**, jedyna widoczna między
     pingami, więc to ona niesie ostrzeżenie o głębokości (pasmo 1 = pomarańcz).
     Batchowane jak oczka: `rect()` na węzeł, jeden `fill()` na kubełek koloru —
     rozmiar wolno zmieniać w obrębie ścieżki, więc bliskie węzły są większe za darmo.
  3. **Krawędzie** (`q3dLit` / `q3dLitD`) — rysuje je **wyłącznie** przechodząca
     fala i gasną w `EDGE_DECAY`. Dwa przebiegi: szeroka poświata + wąski rdzeń.
  Powód nie jest estetyczny: sonar zwraca dyskretne sondowania, więc punkty to
  dane, a krawędź to interpretacja — i ma ją rysować ten ping, który ją wytworzył.
  **Konsekwencja gameplayowa: PASSIVE nie pinguje wcale, więc pokazuje same punkty.**
- **`LIT[]` to pamięć węzła, nie pasmo.** Dla każdego wierzchołka: kiedy fala tu
  dotarła (`t0 + dist/PING_SPEED`) i ile z tego zostało. Liczone **analitycznie
  z odległości**, bo siatka żyje w układzie kamery i co klatkę leży w innym miejscu
  świata — tablicy indeksowanej (r,c) nie da się użyć jako pamięci. `EDGE_DECAY`
  nie jest dowolne: węzeł przy dziobie fala trafia po 0.11 s, więc jego ślad musi
  dożyć następnego pingu (kadencja 2.6 s), inaczej mruga tam, gdzie się patrzy.
  `updatePings()` przycina `G.pings` dokładnie do `range/PING_SPEED + EDGE_DECAY`.
  Najgorętsza pętla renderu (696 węzłów × żywe pingi): granice pierścienia liczone
  raz na ping i trzymane jako kwadraty, żeby test na węzeł był bez pierwiastka.
  Kontakty (hazardy **i** salvage) oraz namiar na waypoint są tu obowiązkowe —
  w tym trybie to jest główny widok, mapa jest tylko w rogu.
- **Głazy i wychodnie** — `ROCK_CELL` + `rhash(i,j,s)`: nie ma ich listy ani miejsca
  w `G`. Obecność, pozycję, rozmiar i kształt daje hash komórki świata, więc są wszędzie,
  są deterministyczne i nie kosztują pamięci. Po co: w kadrze 3D nie było **nic**
  o znanym rozmiarze, więc nie dało się ocenić, czy grzbiet jest 200 czy 800 m przed
  dziobem. To sceneria, nie kontakt — brak echa na mapie, brak opisu, brak kolizji
  (leżą na dnie, którego i tak nie wolno dotknąć), a barwę biorą z pasma głębokości
  tak samo jak oczka pod nimi. Znikają, gdy skala spadnie poniżej ~0.75 px ekranu na
  piksel sprite'a — ta sama zasada co przy kontaktach, plus `fade` przy granicy, żeby
  nie wyskakiwały z niczego. Rysowane **wewnątrz** pętli rzędów, zaraz po swoim rzędzie,
  więc zasłanianie robi ten sam painter's algorithm co dla terenu.
  **Sadzone na `surfD()`, nie na `seabed()`** — rysowana siatka to interpolacja liniowa,
  która ścina grzbiety nawet o 25 m; kamień posadzony na prawdziwym dnie wisiał
  w wodzie nad narysowanym stokiem.
- **Sprite'y kontaktów** — `SPR{}` to tablice stringów ('.' puste, '1'..'3' jasność),
  pieczone raz do offscreen canvasa w `sprite(name,rgb)` i blitowane przez
  `drawSprite()` z `imageSmoothingEnabled=false`. Kolor wstrzykuje wywołujący,
  więc jeden zestaw kształtów obsługuje zagrożenia (pomarańcz) i ładunek (zieleń).
  Żadnych plików ani data URI — kształty są edytowalne i diffowalne w repo.
  **To nie są modele, tylko rozdzielczość echa**: powyżej `sprRange()` kontakt jest
  rombem i „KONTAKT NIEZIDENTYFIKOWANY", poniżej — sprite z nazwą. Zasięg liczy się
  z anteny (`upg().sonar`, `sys().sonar`), więc ulepszenie sonaru widać na ekranie.
  Typ, namiar, głębokość i wartość salvage są jawne **zawsze** — bramkowana jest
  tylko nazwa, żeby nie odbierać graczowi danych do decyzji.
  Nowy kształt: dopisz do `SPR` i zmapuj nazwę w `SPR_OF`.
  Surowe echa (romb / kwadrat z krzyżem) siedzą w `blipHazard()` / `blipSalvage()` —
  wydzielone z `chart()`, bo rysuje je też legenda.
- **Kamera 3D + opad morski** — `G.cam{pitch,bank}` w `updateCam(dt)`: przechył
  z prędkości kątowej kursu, pochylenie z różnicy do głębokości docelowej (łapie
  balast i awaryjne wynurzenie) + kołysanie w sztormie. `G.snow` = cząstki we
  **współrzędnych świata**, `updateSnow(dt)` / `drawSnow(ctx,proj,dp,alpha)`.
  W trybie `dock` S.x/S.y stoją, więc opad jest dosuwany ręcznie (`adv`).
- **Dok w perspektywie** — `drawDock()` to widok z dziobu, nie z góry. Świat jest
  w osi korytarza, kamera w `D.lateral`, więc `proj` odejmuje `D.lateral`. Ściany
  stoją na `±DOCK_HALF` = dokładnie tam, gdzie zaczyna się kara za wyjście
  z korytarza. Bramownica na wysokości `dockD` = pułapu z listy kontrolnej,
  clampowanej do `S.depth` — za głęboko widzisz dok **nad sobą**, płycej nic nie
  udaje błędu. Celownik na środku ekranu = oś łodzi.
- **Depth rail** — `#depth-rail` (DOM, nie canvas) po lewej od sonaru: skala
  0 → `dmax*1.18`, pasmo robocze misji, żywa linia dna, linia CRUSH, głębokość
  docelowa i bug bieżącej głębokości. `buildRailTicks(root)` raz na misję,
  `paintRail(root)` co klatkę z `updateHUD()`. Ten sam markup (selektory po
  klasach, bez id) renderuje `#pz-rail` na płycie pauzy.
- **Pauza + ustawienia** — `G.paused`, ESC / `#gear-btn`. `frame()` przy pauzie
  robi `last=now` i wychodzi (dt nie rośnie). `G.pausedMs` odejmowane od czasu
  misji w `endDive()` i `logEv()`. Panel: `openPause/closePause/togglePause`,
  `renderPauseStats()`, `syncSettingsUI()`. Ustawienia w `G.settings`
  {vol,ping,amb,sens,retro} — **nieutrwalane** (czeka na save system).
  Płyta ma dwie zakładki (`showPauseTab`): USTAWIENIA i LEGENDA.
- **Legenda** — `LEGEND[]` (sekcje: rows / spr / keys / note) + `renderLegend()`.
  **Ikony to próbki wycięte z ekranu, nie ilustracje**: rysują je te same funkcje
  co gra (`drawSubIcon`, `blipHazard`, `blipSalvage`, `drawSprite`), a barwy idą
  z tej samej palety (`q3dPal`, kolory `.dr-*`); pipsy to dosłownie te same
  elementy `.pip` co w HUD. Reszta kształtów siedzi w `LG{}` — dopisując wiersz,
  szukaj najpierw funkcji, która już to rysuje. Kolumny rozdziela **JS** po
  zmierzonych `offsetHeight` (sekcje wrzucone najpierw do kolumny 0, potem
  do najkrótszej): `column-count` przy `break-inside:avoid` zostawiał jedną
  kolumnę pustą, a drugą uciętą. Liczba kolumn z `innerWidth` (3 / 2 / 1),
  przebudowa tylko przy jej zmianie — stąd `renderLegend()` w listenerze `resize`.
- **Audio buses** — `AU.master` → `AU.ambG` (hum + szum + creak) i `AU.pingG`
  (ping). `applyAudio()` to jedyne miejsce liczące gainy z `G.settings` + mute.
- **Retro CRT** — `G.retro` + `pixelate(cv,ctx)` (downsample 2px + nearest-neighbour
  + fosfor) wywoływane w `frame()`; CSS `body.retro` (scanlines, flicker).
- **Dwa rejestry pisma.** `--font` (Barlow Condensed) = **przyrząd**: odczyty na żywo,
  przyciski, nawigacja, HUD. `--serif` (Georgia/Times, systemowy) = **kreślarstwo**:
  opisy na planszach, metryczki, tabele — jak na arkuszu Admiralicji, gdzie cały
  arkusz opisany jest jedną ręką. Nie mieszaj ich w obrębie jednego elementu.
- **VESSEL = plansza techniczna** — `buildVesselPlate()` generuje cały arkusz raz
  (~300 elementów SVG); `renderVessel()` tylko podmienia barwy i liczby. Zasady:
  - `LW` = **trzy** grubości linii o ścisłym znaczeniu (obrys / linia ukryta / cienka).
    To jest ta jedna rzecz, która odróżnia rysunek techniczny od ładnego wykresu.
    Wcześniej w kodzie chodziło dziesięć wartości bez reguły.
  - **Szraf = materiał przecięty płaszczyzną cięcia**, czyli informacja, nie ozdoba.
    Kadłub sztywny 45°, zbiorniki balastowe 45° w drugą stronę i rzadziej — tak
    na arkuszu rozróżnia się sąsiadujące elementy. `hatchD()` zwraca JEDNĄ ścieżkę
    zamiast wielu `<line>` (40 vs 400 elementów w DOM).
  - **Kontrszraf = stan krytyczny** (<40%), bo na arkuszach tak znaczy się element
    do wymiany. Balast ma własną, cichszą skalę: jego pierścień to ~40% arkusza,
    więc ta sama skala co dla przedziałów zamalowałaby cały rysunek.
  - Zbiorniki balastowe leżą **między poszyciem a kadłubem sztywnym** (jak w realnej
    łodzi) — `clipPath` z `clip-rule="evenodd"` wycina pierścień.
  - Odnośniki z półką + pismo szeryfowe pochyłe, numeracja wręgów na linii bazowej,
    metryczka (`#vs-plate-rev` pokazuje liczbę zanurzeń), tabela wymiarów, przekrój
    poprzeczny na śródokręciu.
  - Arkusz skaluje się z panelem, więc **najmniejsze pismo nie może zejść poniżej
    ~9.5 px** w jednostkach viewBox — przy 1150 px szerokości okna staje się nieczytelne.
- **VESSEL — reszta** — `renderVessel()`:
  lista systemów, magazyn (`#cargo-grid`, 6 slotów), stocznia (naprawa 2 CR/pkt,
  tylko gdy `!G.running`).
- **Shop** — `UPGRADES[]` + `renderShop()` na ekranie MISSIONS.
- **MISSIONS** — `renderRoutes()` rysuje paski `.rstrip` (nie tabelę). Każda trasa
  ma profil głębokości na **wspólnej** skali `DEPTH_SCALE=1200 m`, więc kolumnę
  czyta się w pionie jak wykres batymetryczny. `COND{}` mapuje emoji warunków na
  etykiety słowne, `DIFF{}` na 4-działkowy miernik.
  Tabela jest **liniowana pionowo** (`gap:0` + `border-left` na komórkach) — dlatego
  `.rstrip>div` ma wymuszony `display:flex`. **Uwaga:** ta reguła raz już przewróciła
  `.rs-depth` na pion i zgniotła podziałkę; dlatego jest jawny nadpis
  `.rstrip>.rs-depth{flex-direction:row}`. Sam `.rs-dtrack` ma obrys i kreskę na 600 m,
  żeby pasmo było czytane na tle pełnej skali, a nie wisiało w pustce.
- **`drawMissionMap()` to arkusz nawigacyjny**, nie tło pod ikonami: siatka
  z opisami marginesu (A–F / 1–3), **sondowania punktowe** (rozsypane liczby
  głębokości — najbardziej rozpoznawalna cecha mapy morskiej), **szraf mielizn**
  pod 45°, podziałka liniowa, strzałka północy, metryczka. Sondowania i mielizny
  liczy `terr()`, więc karta nie kłamie — pokazuje ten sam teren, po którym płyniesz.
  Opisy portów przy prawej krawędzi (`p[0]>0.66`) idą w lewo, inaczej wchodzą
  na metryczkę.
- **LOGBOOK** — ten sam rejestr kreślarski: `.dive-table` liniowana pionowo,
  wartości i nagłówki szeryfem, stopka `ARK. 02`.
- **`frame()`** — główna pętla rAF; cadence pingów, creaki, hum, pixelate, odświeżanie
  vessel co 0.8 s gdy zakładka aktywna.

## Konwencje i pułapki

- Wszystkie wymiary rysowania mnożone przez `dp = devicePixelRatio`.
- `sizeCanvases()` USTAWIA width/height canvasa = **czyści go**. Zawsze najpierw
  sizeCanvases, potem rysowanie (była to przyczyna buga pustej mapy misji).
  Listener `resize` musi po `sizeCanvases()` przerysować mapę misji — sonar,
  dock i tape odmalowują się co klatkę, mapa tylko na żądanie.
- `#screen-missions` to flex-column: jego dzieci mają `flex:none`, bo inaczej
  `flex-shrink` zgniata `#mission-map-wrap` (270 px bez treści) do zera.
- Świat 2D: `1 px == 1 m`, ekran→świat przez `scale=0.22*dp`, `w2s()` w drawSonar.
- Kierunek: hdg 0° = północ; kąt rysowania `d2r(hdg-90)`.
- Deterministyczny RNG per misja — nie używaj `Math.random()` w generacji świata
  (jest OK w efektach, np. creak). Głazy idą osobną drogą (`rhash`), bo mają istnieć
  poza trasą misji i bez stanu.
- **`terr()` ma dwie warstwy i nie wolno ich mylić.** Trzy pierwsze składowe (fale
  3048 / 1302 / 993 m) to nawigacja — na nich stoi balans głębokości misji. Dwie
  ostatnie to faktura; `RIDGE_M` odejmuje średnią `|sin|`, żeby dno się nie podniosło
  (sprawdzone: średnia głębokość dna nie drgnęła na żadnej z 6 tras).
  **Najkrótsza fala ~520 m jest związana z siatką 3D**: największy krok rzędu to
  ~149 m, czyli 3.5 próbki na falę. Schodząc niżej zaczniesz aliasować dal — najpierw
  zagęść `T3_ROWS`, potem dokładaj wysokie częstotliwości. Zmiana `terr()` dotyka też
  kolizji z dnem, wstęgi głębokości i warstwic — mierz, nie zgaduj.
- Stan gry jest w pamięci — **brak zapisu na dysk** (top priorytet w ROADMAP).
- Kolory w gorących pętlach rysowania bierz z gotowej palety (`q3dPal`/`q3dLit`,
  `build3dPal()`), nie sklejaj `'rgba('+...` per element — kwantyzacja pozwala
  zebrać oczka o tym samym kolorze w jedną ścieżkę i wypełnić jednym `fill()`.
- **Nie ufaj fps z headless chromium.** Rasteryzuje canvas na CPU (SwiftShader),
  więc pomiar zdominuje `pixelate()` — ~9 ms/klatkę wobec ~0.01 ms na GPU — i waha
  się 60 → 20 między przebiegami. Mierz `ms/wywołanie` funkcji rysującej (mediana
  z kilku serii), tak jak robi to sekcja 6 smoke testu.
- Testy: `test/smoke.test.js` (Playwright, chromium). Po każdej większej zmianie
  uruchom i sprawdź `errors: none` + zrób screenshot.

## Jak weryfikować zmiany

```bash
npx serve .                    # podgląd na żywo
node test/smoke.test.js        # smoke test (npm i -D playwright)
```

Przy zmianach w rysowaniu rób screenshot przez Playwright i oglądaj plik —
regressiony wizualne łatwo przeoczyć w samym kodzie. Widok 3D i dok sprawdzaj
w kilku stanach naraz (daleko / poza korytarzem / blisko i za głęboko) — błędy
projekcji ujawniają się dopiero na skrajnych wartościach.

## Roadmapa

Szczegóły w `docs/ROADMAP.md`. Priorytety: (1) save system, (2) pauza+ustawienia,
(3) lokalizacja EN, (4) modyfikatory Blackout/Wreck Field, (5) kampania,
(6) wrapper Electron/Tauri + Steamworks.
