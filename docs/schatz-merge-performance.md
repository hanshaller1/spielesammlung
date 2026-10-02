# Schatz-Merge: Performance und Physik, Patch 0.4.16

Stand: 2. Oktober 2026. Ausgangspunkt: Tag `0.4.15`, Branch `feature/merge-spiel`.
Die vollständigen Messdaten stehen in [benchmarks/schatz-merge-0.4.16.json](benchmarks/schatz-merge-0.4.16.json).

## A. Ursprüngliche Ursachen

Vor den Änderungen wurden die zwölf Schätze bei jedem Frame aus Pfaden, Verläufen und Schrift aufgebaut. Jeder Body hatte `shadowBlur` 9 oder 19, die Vorschau 18 und jeder Partikel 12. Hintergrundverlauf, 26 Sterne, Wandgrafik und Gefahrenlinie wurden ebenfalls jedes Frame aufgebaut. DPR 2 erzeugte bei 390×620 CSS-Pixeln eine Zeichenfläche von 780×1240, also 967.200 Pixeln.

Die Messung mit sechsfacher CPU-Drosselung ergab schon bei fünf Bodies 19 FPS. Bei zwanzig Bodies waren es 7,9 FPS, obwohl die gemessene Matter-Zeit lediglich 0,98 ms betrug. Canvas-Befehle und Rasterisierung waren der erste Engpass. Die reine JavaScript-Befehlszeit erfasst asynchrones Rasterisieren und Browser-Scheduling nicht vollständig; die Differenz zur Frame-Zeit darf nicht pauschal als GPU-Zeit bezeichnet werden.

Physikalisch fehlte ein Wake-up nach Support-Verlust. Merges änderten die Welt zudem innerhalb von `collisionStart`, während Matter noch mit dem vorherigen Body-/Pair-Snapshot arbeitete. Das neue Objekt wurde ohne Platzprüfung eingefügt. Die bisherige Pop-Animation vergrößerte die Grafik um bis zu 30 Prozent ohne entsprechend größeren Collider. Diese vier Ursachen wurden getrennt behandelt.

## B. Vorher/Nachher

Chromium headless, CSS-Spielfeld 390×620, Geräte-DPR 2, CPU-Drosselung 6×. Identische Tierfolgen und Startpositionen; 180 Physikschritte zum Aufwärmen, anschließend 180 RAFs, davon die letzten 160 ausgewertet. Zählszenarien unterdrücken Merges und Game Over, damit die Body-Anzahl konstant bleibt. Jede Sekunde werden Bodies mit einem kleinen Impuls aufgeweckt. Das ist ein belastender Testaufbau und keine Änderung des normalen Spiels. Die neuen PNG-Silhouetten unterscheiden sich von den alten Vektorgrafiken; der Vergleich ist kein Test mit identischen Pixeln.

| Szenario | FPS vorher | FPS nachher | Frame Ø vorher/nachher | Frame p95 vorher/nachher |
|---|---:|---:|---:|---:|
| 5 Bodies | 19,0 | 60,0 | 52,7 / 16,7 ms | 66,7 / 16,7 ms |
| 10 Bodies | 12,9 | 60,0 | 77,5 / 16,7 ms | 83,4 / 16,7 ms |
| 15 Bodies | separat nicht gemessen | 60,0 | — / 16,7 ms | — / 16,8 ms |
| 20 Bodies | 7,9 | 52,5 | 127,2 / 19,1 ms | 149,9 / 33,4 ms |
| 30 Bodies | 5,7 | 31,2 | 174,5 / 32,1 ms | 183,4 / 50,0 ms |
| 30 kleine Bodies | 10,0 | 50,3 | 100,4 / 19,9 ms | 116,6 / 33,4 ms |
| 6 große Objekte | 7,7 | 60,0 | 129,6 / 16,7 ms | 149,9 / 16,8 ms |
| Merge-Ketten | 13,5 | 60,0 | 74,2 / 16,7 ms | 83,4 / 16,8 ms |

Nachher: LOW mit Render-DPR 1. Desktop ohne CPU-Drosselung und mit Render-DPR 2 erreicht in allen sieben Szenarien ungefähr 60 FPS.

Zusätzlich wurde die **echte React-Spielseite** mit 800×1280 CSS-Pixeln, Geräte-DPR 2 und CPU-Drosselung 6× gemessen:

| Szene | Automatische Qualität | Canvas | FPS | Frame p95 |
|---|---|---|---:|---:|
| 5 Bodies, Schatzfolge sichtbar | MEDIUM / DPR 1,25 | 561×829 | 60,0 | 16,7 ms |
| 20 Bodies, Schatzfolge sichtbar | LOW / DPR 1 | 449×663 | 60,0 | 16,8 ms |
| 20 Bodies, Schatzfolge verborgen | LOW / DPR 1 | 596×879 | 35,1 | 33,4 ms |

Diese Seite wurde nach 3,5 Sekunden Einlaufzeit über weitere 120 Frames beobachtet. Die Bodies konnten normal schlafen; anders als im Engine-Benchmark wurde kein regelmäßiger Aufweckimpuls gegeben. Die automatische Reduktion auf LOW wurde tatsächlich beobachtet. React hatte dabei ein bzw. zwei Commits, keinen Commit pro Frame.

## C. Canvas und DPR

| Stufe | Maximaler Render-DPR | Partikel insgesamt | Normaler Merge-Burst |
|---|---:|---:|---:|
| HIGH | 2 | 96 | 24 |
| MEDIUM | 1,25 | 48 | 12 |
| LOW | 1 | 24 | 6 |

Der tatsächliche Render-DPR ist zusätzlich durch den Geräte-DPR begrenzt. Geräte mit grober Eingabe, höchstens vier gemeldeten CPU-Kernen oder höchstens 4 GB gemeldetem Speicher beginnen bei MEDIUM. Desktop beginnt gewöhnlich bei HIGH. Drei Sekunden dauerhaft über 25 ms mittlerer Frame-Zeit reduzieren um eine Stufe. Zwischen zwei Reduktionen liegen mindestens 15 Sekunden. Während einer Sitzung wird nicht wieder hochgeschaltet; dadurch gibt es kein Hin- und Herspringen. Sehr große Intervalle durch Hintergrund-Tabs werden nicht zur Qualitätsentscheidung verwendet.

DPR-Änderungen verändern nur das Canvas-Backing und den Hintergrundcache. Sie skalieren keine Matter-Bodies. Bei 390×620 sinkt die Pixelmenge von 967.200 auf 241.800, also um 75 Prozent.

## D. Treasure-Rendering

Der Spielrenderer verwendet ausschließlich `drawImage()` mit Translation und Rotation. Die bisherige Pfad-/Gradientenfunktion wurde entfernt. Die Grafik wird bei Merge-Effekten nicht mehr unabhängig vom Collider aufgeblasen.

Bei zwanzig Bodies im gedrosselten Benchmark sinkt die gemessene Schatz-Befehlszeit von 1,81 auf 0,48 ms. Diese Zeit umfasst die Befehlsausgabe, nicht alle späteren Rasterkosten.

## E. Verbindliche Assets und Cache

Die gelieferten 36 PNGs wurden byteweise unverändert übernommen:

- `game/`: physische Spielobjekte.
- `preview/`: Aktuell/Als Nächstes.
- `guide/`: Schatzfolge.

Ein Manifest ordnet alle drei Verwendungsarten denselben zwölf Stufen zu. Jede Spielgrafik wird pro Basis-Pfad einmal geladen und dekodiert; die Promise und die Bilder werden im Modul gecacht. UI-Icons verwenden die vorhandenen PNGs als Bilder, keine Canvas-Ersatzgrafiken. PNGs werden auch bei Komponenten-Neumounts nicht erneut pro Frame geladen.

Einige Dateien enthalten am Rand Teile benachbarter Figuren. Nach ausdrücklicher Freigabe des Nutzers werden ausschließlich passende Quellrechtecke angezeigt. Die Originaldateien werden nicht beschnitten oder neu kodiert. Die SHA-256-Werte aller Dateien sind in den Messdaten dokumentiert.

Alle `game/`-Bilder werden mit **demselben** Faktor skaliert. Die eingebauten relativen Größen bleiben damit erhalten; die alten `size`-Multiplikatoren werden nicht ein zweites Mal angewendet. Bei 390×620 ist der gemeinsame Faktor `108 / 259 ≈ 0,417`. So passt auch der höchste zulässige Drop vollständig in die Vorschauzone. Der Spawn berücksichtigt die tatsächliche Bildhöhe. Die Folge-Vorschau wartet sowohl auf Collider- als auch auf sichtbare Bildgrenzen unterhalb der roten Linie.

| Stufe | Sichtbares Quellrechteck | Rendermaß bei 390×620, ungefähr |
|---|---:|---:|
| Goldnugget | 126×102 | 53×43 |
| Goldmünze | 173×132 | 72×55 |
| 2er-Münzstapel | 191×169 | 80×70 |
| Kleiner Edelstein | 187×170 | 78×71 |
| Großer Edelstein | 221×195 | 92×81 |
| Gold-/Edelsteinbeutel | 279×259 | 116×108 |
| Schatzkästchen | 291×240 | 121×100 |
| Goldener Kelch | 229×255 | 95×106 |
| Krone | 287×271 | 120×113 |
| Schatztruhe | 333×295 | 139×123 |
| Königsschatz | 362×303 | 151×126 |
| Goldener Thron | 315×315 | 131×131 |

Die Breite allein steigt in den gelieferten Designs nicht monoton, etwa beim Kelch. Diese verbindlichen Proportionen werden bewusst nicht normalisiert. Die UI-Icons werden dagegen in jeweils gleich große quadratische Rahmen eingepasst.

## F. Hintergrund, Schatten und Partikel

Verlauf, Sterne, Wände und Gefahrenlinie liegen in einem OffscreenCanvas beziehungsweise einem normalen Cache-Canvas. Neuaufbau nur bei echter Größen- oder Backing-DPR-Änderung. Während des Spiels wird der fertige Hintergrund kopiert. Die Hintergrund-Befehlszeit im 20-Body-Test sinkt von 0,34 auf 0,13 ms.

Es gibt keine Canvas-Blur-Schatten mehr pro Schatz, Vorschau oder Partikel. Die vorhandene CSS-Darstellung der UI bleibt bestehen. Partikel sind einfache Kreise mit begrenztem Gesamtbudget. Terminaleffekte dürfen bis zum doppelten normalen Burst erzeugen, bleiben aber innerhalb des Gesamtlimits. Eine Qualitätsreduktion reduziert auch einen bereits bestehenden Partikelbestand.

## G. Matter.js und Game Loop

Matter.js bleibt bei Version 0.20.0. Genau ein RAF-Loop; Physik und Bodies bleiben außerhalb von React-State. `1000/60` ms pro Physikschritt, maximal drei Schritte pro Frame und höchstens 50 ms neuer Zeitbeitrag. Es entsteht kein unbegrenzt wachsender Nachholrückstand. Pause und Ready zeichnen nur bei Bedarf.

Collision-Ereignisse sammeln Merge-Kandidaten. Entfernen und Einfügen erfolgen erst nach dem vollständigen Matter-Schritt. Metadata-Prüfungen verhindern doppelte Merges derselben Bodies. Die Engine sperrt zusätzlich einen zweiten Drop während der bereits bestehenden Vorschau-Sperre.

Score, Highscore, Reihenfolge, terminaler Merge, Shuffle-Bag und die Game-Over-Regel mit 1,5 Sekunden wurden beibehalten. Der einzige Bypass von Merges/Game Over dient explizit aktivierten Entwickler-Stressszenarien.

## H. Sleeping

Sleeping bleibt aktiviert; `sleepThreshold` bleibt 50. Ein Merge weckt Bodies in den geänderten Kontaktbereichen und den darüber liegenden Support-Spalten auf. Die Suche propagiert über betroffene Nachbarn, sodass auch schlafende Brücken erfasst werden. Unbetroffene Spalten bleiben schlafend. Es werden keine künstlichen Kräfte angewendet.

Bei einer echten Weltgrößenänderung werden skalierte Bodies einmal aufgeweckt, damit sie auf den neu positionierten Wänden/Boden zur Ruhe kommen. Normale Kontaktkorrekturen setzen den Schlafzähler bereits wacher Bodies nicht immer wieder zurück.

## I. Solver-Vergleich

Je Konfiguration 120 gültige Drops mit identischem Seed, anschließend ein festes 20-Body-Szenario mit 600 Messschritten. Kontaktpenetration wird anhand neu berechneter echter Kollisionen gemessen. Die Abläufe unterscheiden sich durch die Solver-Ergebnisse; Laufzeiten eines gesamten Drop-Laufs sind daher keine reine Kostenmessung gleicher Zustände.

| Position/Geschwindigkeit | Sleeping | 20-Body-Physik pro Schritt, Desktop | Peak-Penetration im Drop-Lauf | Tiefe nach mindestens 30 aufeinanderfolgenden Frames über 3 px |
|---|---|---:|---:|---:|
| 8/6 | an | 0,121 ms | 24,53 px | 7,85 px |
| **10/7** | **an** | **0,120 ms** | **18,08 px** | **0 px** |
| 12/8 | an | 0,144 ms | 14,30 px | 5,66 px |
| 8/6 | aus | 0,182 ms | 11,53 px | 6,91 px |

Gewählt: **10/7/4**. In diesem Vergleich bestand keine länger anhaltende Penetration über 3 px, ohne den Mehrpreis von 12/8. Die Spitze von 18,08 px ist ein kurzzeitiger Kontaktwert, keine dauerhaft akzeptierte Überlappung. Globales Abschalten von Sleeping erwies sich nicht als bessere Lösung.

## J. Collider und Masse

Collider werden aus vereinfachten Silhouetten der tatsächlichen PNG-Hauptfiguren aufgebaut. Nugget, Münze, Münzstapel, Edelsteine, Beutel, Kästchen, Krone, Truhe, Königsschatz und Thron sind jeweils ein konvexes Polygon mit höchstens zehn Eckpunkten. Die perspektivische Münze erhält eine ihrer sichtbaren Form folgende runde Polygonkontur. Nur der Kelch verwendet drei einfache Teile für Schale, Stiel und Fuß.

Im Szenario mit Kelch/Krone/Thron sinkt die Zahl physischer Teile von 30 auf 10. Die Formen verwenden dieselben Bildkoordinaten und denselben Maßstab wie der Renderer. Der Schwerpunktversatz wird weiterhin korrekt berücksichtigt. Der Debug-Modus zeichnet echte Parts, Schwerpunkt, Bounds, Tier/ID und Schlafstatus.

Die Konturen decken ungefähr 94–100 Prozent der deckenden Hauptfigur-Pixel ab. Bei der Münze und dem Stapel fehlen kleine Rundungssegmente; es sind vereinfachte Konturen, keine pixelgenauen Masken. Beim Thron füllt die konvexe Form kleine Hohlräume, etwa 16 Prozent zusätzliche Fläche. Die exakten Deckungswerte stehen in den Messdaten.

Materialdichte bleibt `0,0011 × densityScale`, Reibung und Rückprall bleiben stufenspezifisch unverändert. Die Masse folgt der tatsächlichen Collider-Fläche. Damit sind Rendergröße, physische Größe und Masse konsistent gekoppelt.

## K. Merge-Spawn und Restkontakte

Der gewünschte Mittelpunkt bleibt Ausgangspunkt. Vor dem Einfügen werden Nachbarn und Wände auf Kollisionen geprüft. Mehrere kleine Kandidaten oberhalb beziehungsweise leicht seitlich werden verglichen. Die Suchdistanz ist auf 40 Prozent der neuen Körperhöhe, höchstens 48 CSS-Pixel, begrenzt. Es wird die Position mit geringerer aufsummierter quadratischer Penetration gewählt. Der neue Body bleibt innerhalb von Wänden und Boden.

Ein großer Folgebody kann trotz dieser Platzprüfung in einem engen Stapel Restkontakte erzeugen. Drei lokale Durchgänge berechnen aktive Kontakte erneut. Korrekturen bleiben auf 4 Pixel pro Body/Kontakt/Durchgang begrenzt. An eine Wand gepresste Bodies werden nicht weiter durch die Wand gedrückt; die Kontaktkorrektur verteilt sich auf bewegliche Nachbarn. Die statischen Behälterebenen schließen verbleibende Wand-/Bodenpenetration. Translation verschiebt auch die vorherige Position und erzeugt keine zusätzliche kinetische Energie. 0,3 Pixel Toleranz verhindern permanentes Aufwecken durch Matters gewöhnlichen Slop.

## L. Prüfergebnisse

- 14 Schatz-Merge-Tests erfolgreich, darunter 600 gültige Drops über sechs Läufe sowie der vorhandene 300-Drop-/Resize-/Reset-Test.
- Keine NaN-Positionen/Geschwindigkeiten oder physikalischen Wand-/Bodendurchgänge in diesen Tests. Kontrolliert werden echte Collider-Vertices: Matter-Bounds enthalten zusätzlich eine vorausschauende Geschwindigkeitsmarge.
- Support-Verlust: betroffener schlafender Body wacht auf und fällt; entfernte unbetroffene Spalte bleibt schlafend.
- Alle zwölf Einzelstufen kommen nach seitlichen Kontakten zur Ruhe; Restpenetration im Einzeltest unter einem Pixel.
- Particle-Cap, Resize-Idempotenz, begrenzter Catch-up, Qualitätshysterese, vollständiges Überqueren der roten Linie und 100 Shuffle-Bags geprüft.
- Browserprüfung: Desktop 1440×900, Tablet 800×1280, Smartphone 390×844; alle Assets laden, gleich große Vorschaupanels, keine Seiten-Scrollbalken, genau ein Drop bei gleichzeitigem Loslassen zweier Touch-Punkte.
- Audio-Stress mit 40 gleichzeitigen Merge-Meldungen: maximal 24 aktive Stimmen, anschließend wieder null. Oszillatoren stoppen und werden zusammen mit Gain-Nodes getrennt; ein AudioContext pro Komponentenlebenszeit.
- TypeScript ohne Fehler mit den von Wrangler generierten Cloudflare-Runtime-Typen für den vorhandenen Worker; scoped ESLint fehlerfrei. Repository-Lint ohne Fehler, drei vorhandene Warnungen außerhalb Schatz-Merge.
- Pages-Build erfolgreich: sechs Routen, keine übersprungen. Auch der exportierte Stand wurde unter dem Projektpfad `/spielesammlung/` im Browser geprüft: alle PNGs laden und alle vier Spiele starten. Ihre Quelltexte wurden nicht verändert.
- Zusätzlicher allgemeiner UI-Komponententest: 3/4 erfolgreich. Der CSS-Test erwartet `--tw-enter-opacity`, das im Pages-CSS fehlt. Derselbe Fehler wurde nach isoliertem Build des unveränderten Tags 0.4.15 reproduziert. Deshalb keine vollständige grüne Repository-Testsuite behauptet und kein fremdes CSS verändert.

Der zuvor bereits fehlschlagende Schatz-Merge-Test „voller Kasten“ ist jetzt erfolgreich. Die Game-Over-Regel selbst wurde nicht umgeschrieben.

## M. Verbleibende Grenzen

Das echte Huawei MediaPad M5 war nicht angeschlossen. CPU-Drosselung, DPR und Headless-Chromium ersetzen dessen GPU, Speicherbandbreite, Browser und thermisches Verhalten nicht vollständig. Ein abschließender Test direkt auf dem Tablet steht aus. Die gemessenen Ziele sind unter der beschriebenen Simulation erfüllt, keine garantierten Hardware-FPS.

Bei dreißig gemischten Bodies gibt es weiterhin einzelne 50-ms-Frames. Kurze Merge-/Kollisionspenetrationen sind möglich; es wird keine mathematisch immer überlappungsfreie Physik behauptet. Die gelieferten PNGs sind teilweise am Dateirand abgeschnitten; fehlende Originalbildteile wurden nicht rekonstruiert.

Das bestehende Portrait-Tablet-Layout vergrößert das Spielfeld beim Verbergen der Schatzfolge (im 800×1280-Test etwa 455 auf 602 Pixel Außenbreite). Dieses Layout wurde in dieser technischen Aufgabe nicht umgebaut. Die echte Größenänderung wird korrekt verarbeitet und nicht mit einer DPR-Änderung verwechselt. Smartphone bleibt beim Toggle mittig und gleich groß; Desktop behält die Größe bei.

## N. Geänderte Dateien

- `app/schatz-merge/engine.ts`: Physik, Sprite-Renderer, Background-Cache, Kontaktstabilisierung und Debug-Ansicht.
- `app/schatz-merge/page.tsx`: PNG-UI-Icons, stabiler Resize-/RAF-Lifecycle, adaptive Qualität, Audio-Limits und Entwicklerschnittstelle.
- `app/schatz-merge/assets.ts`: Asset-Pfade und Lade-/Decode-Cache.
- `app/schatz-merge/sprite-profiles.ts`: zwölf Quellrechtecke und Collider-Profile.
- `app/schatz-merge/quality.ts`: Qualitätsbudgets und Hysterese.
- `app/schatz-merge/performance.ts`: separat gemessene Frame-/Render-/Physikwerte und UI-/Resize-Zähler.
- `public/schatz-merge/treasures/{game,preview,guide}/*.png`: alle 36 vom Nutzer bereitgestellten, zuvor ungetrackten Originalassets.
- `tests/schatz-merge-engine.test.mjs`: bestehende Tests erweitert und Drop-Abstände an den tatsächlichen Ablauf angepasst.
- `scripts/schatz-merge-benchmark.{mjs,html}`: Vorher/Nachher und gezielte Rendervergleiche.
- `scripts/schatz-merge-physics-benchmark.mjs`: Solver-/Sleeping-Vergleich und Kontaktmessungen.
- `scripts/schatz-merge-browser-check.mjs`: Layout, Touch, Assets, Audio und Spielrouten.
- `scripts/schatz-merge-page-profile.mjs`: Messung der echten Spielseite mit automatischer Qualität.
- Diese Dokumentation und `docs/benchmarks/schatz-merge-0.4.16.json`.
- `package.json`, `package-lock.json`, `app/release-notes.ts`, Versionsanzeige in `app/page.tsx`: vorgeschriebener Patch-Release.

## O. Größter Effekt und Reproduktion

Die Kombination aus geringerem DPR, gecachten Bildern und dem Entfernen der Blur-Schatten bringt den größten Unterschied. Die gezielten Vergleiche machen den DPR-Effekt besonders deutlich: Der neue Renderer erreicht mit zwanzig Bodies und DPR 2 nur 20,4 FPS, mit DPR 1 dagegen 52,5 FPS. Ausschließlich den Blur im alten Renderer abzuschalten steigert zwanzig Bodies nur von 7,9 auf 13,6 FPS. Die Render-Pixelmenge ist daher die wichtigste einzeln belegte Stellschraube auf dem gedrosselten System. Collider-Vereinfachung und Sleeping halten die zusätzlichen Stabilitätsmaßnahmen bezahlbar.

Prüfungen benötigen vorhandenes Playwright und Chromium; es wurden keine neuen Projektabhängigkeiten installiert. Unter Windows `PLAYWRIGHT_MODULE` auf den absoluten Pfad zu `playwright/index.mjs` und gegebenenfalls `CHROMIUM_PATH` auf die vorhandene Browserdatei setzen.

```powershell
node --test tests/schatz-merge-engine.test.mjs
node scripts/schatz-merge-physics-benchmark.mjs
node scripts/schatz-merge-benchmark.mjs --baseline
node scripts/schatz-merge-benchmark.mjs
npm.cmd run dev -- --port 5174
# In einem zweiten Terminal:
node scripts/schatz-merge-browser-check.mjs
node scripts/schatz-merge-page-profile.mjs
npm.cmd run build:pages
```

Der Baseline-Benchmark liest Tag 0.4.15 mit `git show` in den ignorierten Arbeitsordner; er wechselt keinen Branch. Engine-Benchmarks und Tests verwenden eigene Vite-Cache-Verzeichnisse, damit sie den laufenden Entwicklungsserver nicht mit veralteten optimierten Dependencies stören.

Optionale Benchmark-Variablen: `BENCHMARK_PROFILE=tablet-6x`, `BENCHMARK_CASES=5,20`, `BENCHMARK_DPR=2`, `BENCHMARK_NO_BLUR=1` und `BENCHMARK_OUTPUT=work/schatz-profile/vergleich.json`.

Entwicklerdiagnose: `/schatz-merge?smDebug=1`; zusätzlich `smColliders=1` für Collider oder `smQuality=LOW|MEDIUM|HIGH` zum Fixieren der Qualität. Ohne `smDebug=1` existieren weder Panel noch globale Entwicklerschnittstelle. Die Konsole kann mit `window.__schatzMerge.stress(20)` oder `.stress(6, "compound")`, `.stress(30, "small")`, `.stress(20, "chains")` Szenarien starten; `.snapshot()` liefert Messwerte. „Neu“ verlässt den Stressmodus und startet eine normale Runde.

Commit und Push erfolgen ausschließlich auf dem aktuellen Feature-Branch, einschließlich Patch-Tag. Es findet kein automatischer Main-Merge statt.
