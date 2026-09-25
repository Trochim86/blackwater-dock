# ROADMAP — BLACKWATER DOCK

Stan: **v5** (prototyp kompletny gameplayowo). Cel: wydanie na itch.io, potem Steam.

## Faza 1 — "wydawalność" (przed itch.io)

1. **Save system** (top priorytet)
   - Persystencja `G.stats` (credits, upg, sys, dives, best) w `localStorage`
     (w standalone/Electron działa bez ograniczeń; klucz np. `blackwater-save-v1`).
   - Zapis po każdym `endDive`, zakupie, naprawie. Przycisk "reset postępów" w ustawieniach.
2. ~~**Pauza + ustawienia**~~ — ZROBIONE (poza utrwaleniem, patrz niżej)
   - `ESC` / `⚙` = pauza: `frame()` nie nalicza `dt`, `G.pausedMs` odejmowane od
     czasu misji. Overlay = płyta grodziowa z zamrożoną wstęgą głębokości.
   - Ustawienia: głośność master/ping/ambient (osobne szyny `AU.ambG`/`AU.pingG`),
     czułość steru, retro CRT, pełny ekran (Fullscreen API), reset postępów.
   - **Zostaje do zrobienia:** `G.settings` przepada po odświeżeniu strony —
     utrwalenie razem z punktem 1 (ten sam klucz `blackwater-save-v1`).
3. **Lokalizacja EN/PL**
   - Słownik `L10N = {pl:{...}, en:{...}}`; wszystkie stringi UI przez funkcję `t(key)`.
4. **Onboarding** — 1 misja treningowa (TUTORIAL): skrypt kroków z podpowiedziami.
5. **Balans** — publiczny playtest; dane: czas misji, % porażek, przyczyny.

## Faza 2 — treść (itch.io feedback → Steam)

6. **Modyfikatory misji** (z makiet Rorka)
   - BLACKOUT: sonar tylko z pingów (bez warstwic poza falą), nagroda ×1.5.
   - WRECK FIELD: 3× hazardy + 2× salvage, gęsta mgła.
7. **Kampania** — łańcuch 10–12 misji z prostą fabułą (zaginiona stacja badawcza),
   odblokowywanie tras, stałe decyzje (spalone mosty).
8. **Załoga** — 3 sloty perków (nawigator: +dryf info, mechanik: tańsze naprawy,
   akustyk: +zasięg pasywny). Rekrutacja za kredyty.
9. **Przecieki** — przy hull>75%: minigra uszczelniania przedziału (czasówka).
10. **Muzyka** — ambient dark-drone, 2–3 utwory + stingery (sztorm, dokowanie).
11. **Gamepad** — Gamepad API; mapowanie analogów na kurs/ciąg.

## Faza 3 — Steam

12. **Wrapper Electron lub Tauri**
    - Electron: `electron-forge` + `steamworks.js` (osiągnięcia, cloud save, overlay).
    - Tauri (lżejszy): wymaga mostka Rust do Steamworks — trudniejsze, ale 10 MB.
13. **Steamworks** — konto partnera, 100 USD/app (zwrot po 1000 USD przychodu),
    W-8BEN, strona sklepu, capsule art, trailer, "Coming Soon" ≥ 2 tyg. przed premierą.
14. **Osiągnięcia** — STEADY HAND, STORM RUNNER, pełny magazyn, kampania 100%…
15. **Build matrix** — Windows (must), Linux/SteamDeck (łatwy bonus z Electron/Tauri),
    macOS (wymaga notaryzacji Apple, 99 USD/rok — decyzja później).

## Oprawa wizualna — zrobione (poza fazami)

- **Teren 3D wypełniony** — painter's algorithm daje zasłanianie; jasność oczka
  z nachylenia stoku ku kamerze (fizycznie: silniejszy odbiór sonaru).
- **Czoło pingu w 3D** — fala z `firePing()` rozświetla teren, przez który
  właśnie przechodzi (`LIT[]`, `PING_BAND`).
- **Opad morski** (`G.snow`) — cząstki w układzie świata, znoszone przez sztorm.
- **Żywa kamera** — `G.cam.pitch` z różnicy do głębokości docelowej,
  `G.cam.bank` z prędkości kątowej kursu, kołysanie w sztormie.
- **Dok w perspektywie** — widok z dziobu; ściany korytarza stoją tam, gdzie
  zaczyna się kara, a bramownica na pułapie z listy kontrolnej.
- **3D na pełnym panelu** — TAB przełącza teraz dwa układy ekranu (CHART / TERRAIN),
  nie dwa dolne instrumenty. Mapa zwija się do minimapy rysowanej tą samą funkcją
  `chart()` pod transformacją canvasu. W trybie TERRAIN doszły kontakty salvage
  i namiar na waypoint (ze strzałką „ZAWRÓĆ", gdy cel jest za rufą), bo bez nich
  główny widok nie pozwalał nawigować.

- **Sprite'y pixel art dla kontaktów** — 7 kształtów (5 typów salvage + kontener
  + wrak) jako tablice stringów, bez plików w repo. Widoczne na mapie, w widoku 3D
  i w magazynie ładunku. Sprite pojawia się dopiero w `sprRange()` — identyfikacja
  kontaktu stała się nagrodą za SONAR ARRAY, a nie darmową informacją.

- **Legenda symboli** — druga zakładka płyty pauzy (ESC): 7 sekcji, 23 wiersze,
  katalog sylwetek i ściąga klawiszy. Ikony rysuje ten sam kod, co ekran gry, więc
  legenda nie może rozjechać się z sonarem. Zbiera dług z punktu 4 (onboarding):
  misja treningowa nadal potrzebna, ale gracz ma już gdzie sprawdzić, co widzi.

- **Dno 3D: rozstaw, faktura, głazy** — trzy zmiany zrobione razem, bo zależą od siebie.
  (1) Rzędy siatki rozłożone geometrycznie: na ekranie było 269 px przy dziobie i 8 px
  przy horyzoncie, jest 58 / 26. (2) `terr()` dostał grzbiet `|sin|` i drobną falę —
  średnia głębokość dna nie drgnęła na żadnej z 6 tras, więc balans stoi, a warstwice
  na mapie przy okazji mocno zyskały. (3) Głazy i wychodnie z hasha komórki świata:
  pierwsza rzecz w kadrze o znanym rozmiarze. Koszt całości: 0.63 → 1.22 ms na wywołanie
  `drawSonar()` przy budżecie 16.7 ms.

  Zmierzone przy okazji, warte zapamiętania: **siatka nigdy nie była wąskim gardłem.**
  Przy kroku 52 m odtwarzała dno z błędem 0.30 m przy 380 m reliefu — zagęszczanie jej
  bez dołożenia treści do `terr()` nie dodałoby ani jednego kształtu.

- **Teren jako chmura punktów** — siatka drutowa zniknęła. Zostały punkty w węzłach
  (warstwa trwała, niosąca ostrzeżenie o głębokości), prawie czarne wypełnienia
  (tylko zasłanianie) i krawędzie, które **rysuje wyłącznie przechodząca fala pingu**
  i gasną w 2.8 s. Uzasadnienie: sonar zwraca dyskretne sondowania — punkty to dane,
  krawędź to domysł, więc ma ją rysować ten ping, który ją wytworzył.
  **To zmiana balansu, nie tapety:** PASSIVE nie wysyła pingów, więc w widoku terenu
  zostają same punkty. ACTIVE zaczyna zarabiać na swój pobór baterii, a kadencja
  pingu (1.4 s przy zagrożeniu vs 2.6 s normalnie) sprawia, że fale się nakładają
  i teren robi się najczytelniejszy dokładnie wtedy, gdy jest najgroźniej.
  Koszt: 2.5 → 3.4 ms na wywołanie `drawSonar()` (1.35×) przy budżecie 16.7 ms.
  Do obserwacji w playteście: czy PASSIVE nie zrobił się zbyt karzący.

- **Kierunek: rysunek techniczny (blueprint)** — pierwszy krok zrobiony na ekranie
  VESSEL. Przekrój wzdłużny jako arkusz kreślarski: trzy grubości linii o ścisłym
  znaczeniu, szraf jako informacja o przecięciu (kontrszraf = stan krytyczny),
  odnośniki z półką pismem szeryfowym pochyłym, numeracja wręgów, tabela wymiarów,
  przekrój poprzeczny, metryczka. Wprowadzony **drugi rejestr pisma**: sans = przyrząd,
  szeryf = kreślarstwo.
  Zasada rozlewania na resztę gry: **kreślarstwo najmocniej tam, gdzie informacja
  jest ustalona, najsłabiej tam, gdzie żywa.**
  ZROBIONE: VESSEL (ARK. 03), MISSIONS (ARK. 01 — karta jako arkusz nawigacyjny
  z sondowaniami i szrafem mielizn, tabela tras liniowana pionowo), LOGBOOK (ARK. 02).
  ZOSTAJE: dok (linie wymiarowe korytarza i alignmentu) oraz sonar — ten dostaje
  **tylko** hierarchię grubości linii i styl odnośników; nie wolno zamienić żywego
  echa w statyczny arkusz.
  Świadomie odrzucone: inwersja na jasne tło (ciemność jest nośna — czoło pingu
  świeci, bo jest jaśniejsze od tła) i zdobiona rama (bije się z ascezą przyrządów).

- **Rozpoznanie akwenu na karcie** — obszary niezbadane są zaszrafowane i odsłaniają
  się razem z czołem pingu. Konwencja wzięta z map morskich („limit of survey"),
  gdzie tak właśnie znaczy się niezmierzone akweny. Trasa jest skartowana przed
  startem, więc zbaczanie z kursu ma teraz realny koszt: poza korytarzem karta jest
  pusta. W PASSIVE odsłania tylko wąski pas przy kadłubie — kolejny powód, by włączyć
  ACTIVE. Koszt: 0.16 → 0.24 ms (1.5×) po cache'owaniu ścieżki.
  Do obserwacji w playteście: czy korytarz startowy (340 m) nie jest za wąski
  albo za szeroki.

Do rozważenia dalej: kominy hydrotermalne (pióropusz cząstek z dna — najmocniejszy
pozostały efekt i naturalna mechanika: zagłusza sonar), zawiesina przydenna widoczna
przy prześwicie < 60 m, krawędź uskoku w `terr()`, caustics przy powierzchni, wstrząs
kadru przy uderzeniu w dno, animacja 2 klatek dla dryfujących kontenerów.

## Znane długi techniczne

- Jeden plik ~97 KB — przy fazie 2 rozważyć split na moduły ES (index + src/).
- `pixelate()` (retro CRT) to zdecydowanie najdroższa operacja klatki przy
  rasteryzacji programowej. Na GPU nieistotna, ale gdyby kiedyś celować w słabszy
  sprzęt — to pierwszy kandydat do optymalizacji (np. render do mniejszego canvasa
  zamiast downsamplingu pełnego).
- `S.hull` (ciśnienie per misja) vs `sys()` (kondycja persystentna) — dwa systemy
  obrażeń; działa, ale wymaga jasnej komunikacji w UI.
- Brak object poolingu w pingach/echach — OK przy obecnej skali.
- Test smoke nie pokrywa: shop (zakupy), stocznia (naprawy), magazyn ładunku
  (dopisać scenariusze). Widok 3D, dok, retro i legenda są już pokryte.
