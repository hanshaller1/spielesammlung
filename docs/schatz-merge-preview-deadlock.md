# Schatz-Merge: Pending-Drop-/Preview-Deadlock (0.4.17)

## Nachgewiesene Ursache

Die alte Engine blockierte die Preview bis `min(Matter bounds.min.y, visualTop)` vollständig unter der roten Linie lag. Game Over prüfte dagegen ausschließlich `bounds.min.y` und Geschwindigkeit. Ein gedrehter Beutel (Stufe 6, 45 Grad), dessen physischer oberer Rand bei y=125 und damit unter der Linie y=124 liegt, dessen Grafikrechteck aber darüber hinausragt, reproduzierte den Fehler: auch nach 360 Frames / sechs Simulationssekunden blieb Pending aktiv, ohne Game Over. Ein schlafender Body bewegt sich nicht aus diesem Zustand heraus.

Bei Merges wurde das Pending-Flag außerdem mit einem logischen ODER auf jeden größeren Nachfolger übertragen. Die ursprüngliche Überquerung wurde erst nach sämtlichen Merges ausgewertet. Dadurch konnte eine schon ausreichende Überquerung durch das Wachstum des Nachfolgers verloren gehen. Eine zweite, unabhängig gesetzte UI-Sperre konnte zusätzlich hängen bleiben, wenn die Engine einen Drop ablehnte und deshalb kein Freigabe-Callback erzeugte.

## Neue Zustandsverwaltung

- Ausschließlich die Engine besitzt einen einzelnen `PendingDrop`-Datensatz. `previewBlockedByPendingDrop` und `canDrop` sind daraus abgeleitete Getter. Es gibt weder ein eigenes UI-Pending-Ref noch gespeicherte Pending-Flags an mehreren Body-Metadaten.
- `drop()` bestätigt die Annahme mit `true` und lehnt weitere Drops atomar mit `false` ab. Die UI liest für Eingaben und Rendering denselben Engine-Getter. Der bestehende Mehrfinger-Schutz bleibt erhalten.
- Die Überquerung wird nach jedem Solver-Schritt **vor** dem Entfernen der Merge-Eltern und noch einmal nach der Kontaktstabilisierung geprüft. Eine festgestellte Überquerung ist endgültig; spätere Merges können sie nicht zurücknehmen.
- Merged der ursprüngliche Drop bereits innerhalb des Einwurfbereichs, darf ausschließlich ein dort tatsächlich blockierender Nachfolger den bestehenden Token behalten. Das ist keine pauschale Weitergabe an alle Merge-Ergebnisse: Ein Nachfolger unterhalb der Linie beendet das Pending sofort. Ein dort ruhender/schlafender Nachfolger führt über die gemeinsame Gefahrenprüfung zu Game Over.
- Ein terminaler Merge beendet den Token ohne Nachfolger. Freigabe löscht den Token vor dem Callback; damit wird der nächste Schatz genau einmal aus dem unveränderten Shuffle-Bag übernommen. Reset und Game Over löschen Pending ebenfalls; Game Over hat Vorrang vor einer gleichzeitigen Preview-Freigabe.

## Gemeinsame rote Linie und Fail-safe

Beide Prüfungen verwenden denselben oberen Rand: das Minimum aus tatsächlichen Collider-Vertices und dem gedrehten Grafikrechteck einschließlich des vorhandenen Render-Offsets. Matters vorsorglicher Geschwindigkeitsrand in den Broad-Phase-Bounds ist keine tatsächliche Objektkante.

Vollständig frei bedeutet `top > dangerLine + 0.5 px`. Bis einschließlich dieser gemeinsamen Grenze ist die Gefahrenzone belegt. Die halbe Pixelbreite verhindert, dass kleine Solverbewegungen an der Linie ständig zwischen den beiden Entscheidungen wechseln. Die bestehende Geschwindigkeitsgrenze von 1.6 und die Gefahrendauer von 1500 ms bleiben erhalten; schlafende Bodies gelten ausdrücklich als ruhend. Es gibt keine künstlichen Positionssprünge und keinen pauschalen Pending-Timeout.

Nach jedem abgeschlossenen Update gilt: Während der Runde ist entweder Drop möglich oder genau ein vorhandener, nicht verbrauchter Body blockiert den angenommenen Drop. Fehlt Body oder Metadatum unerwartet, erkennt die Engine die verwaiste Ownership und gibt einmalig frei. Debug-Recovery-Zähler und Grund bleiben sichtbar. In den normalen langen Testläufen wurde dieser Fail-safe nicht benötigt.

`?smDebug=1` zeigt zusätzlich UI-Pending (abgeleitet), Engine-Sperre, Freigabestatus, Game Over, Anzahl wartender Bodies (abgeleitet: 0/1), ursprüngliche Drop-ID, aktuelle Blocker-ID/Stufe, physische/sichtbare Oberkante, Matter-Bounds, Linie/Toleranz, Geschwindigkeit, Sleeping, Pending-Dauer und Recovery-Zähler/Grund.

## Prüfung am 6. Oktober 2026

- **23/23 Engine-Tests erfolgreich**, davon neun neue Fälle: direkter Merge, Kettenmerge nach Überquerung, Kettenmerge vor Überquerung/Gefahrenzone, gedrehter schlafender Beutel, Sleeping/Subpixel-Jitter, terminaler Merge, fehlender Body/Metadatensatz, kein fester Timeout und 400 zufällige Drops.
- Der neue Langtest prüft die zentrale Invariante nach jedem Frame. Jeder der 400 akzeptierten Drops muss binnen sechs Simulationssekunden entweder genau eine Preview-Freigabe oder Game Over erhalten. Dazu kommen die bestehenden 300-Drop-/Resize- und 600-Drop-Physiktests, alle zwölf Collider, Support-Wakeup, Partikellimit, adaptive Qualität und Shuffle-Bag.
- **300 echte Eingabe-Drops im Chromium-Pages-Build**, ohne direkte Engine-Drops oder Stress-Szenen: Desktop 100 / 54 Merges / 1 Game Over (61.4 s), Tablet 100 / 40 / 2 (69.5 s), Smartphone 100 / 45 / 1 (61.9 s). Insgesamt 296 Freigaben und vier Game Overs, keine JavaScript-Fehler, keine Deadlocks und keine Orphan-Recoveries; bis Stufe 9 erreicht. Ein vorheriger vollständiger Durchlauf mit weiteren 300 Browser-Drops war ebenfalls erfolgreich. Maus und Touch, Rand- und Mitteldrops, schnelle Merges, Support-Wechsel, volle Stapel sowie Pause/Weiter geprüft.
- Zusätzlich eine Runde im sichtbaren In-App-Browser über Maus/Tastatur gespielt und visuell kontrolliert: bewegte und gedrehte Schätze, neue Preview, wachsende Stapel, Merges bis Schatzkästchen und reguläres Game Over bei 900 Punkten. Große Ketten bis Stufe 9 und terminale Stufe 12 zusätzlich deterministisch im Engine-Test geprüft.
- Bestehender Browsercheck erfolgreich auf Desktop/Tablet/Smartphone: Assets, gleich große Preview-Panels, Mehrfinger-Release erzeugt genau einen Drop, Sound-Stimmenlimit und Start aller Spiele. Bestehende Tablet-Layout-Unterschiede beim Guide-Toggle bleiben außerhalb dieser Aufgabe unverändert.
- Bestehende CPU-6-Tablet-Performanceprobe: fünf Bodies 60.0 FPS; 20 Bodies 50.8 FPS mit Schatzfolge bzw. 45.5 FPS ohne. Physikzeit 0.18–0.28 ms pro Frame, Solver unverändert. Synthetische Messung parallel zum Browser-Langtest, keine Zusage für reale Tablet-Hardware.
- TypeScript mit bestehenden generierten Cloudflare-Typen, gezieltes ESLint und Production-/Pages-Build erfolgreich. Die normale Windows-Buildalternative ist `npm.cmd run build:pages`.

Der wiederholbare Browser-Langtest liegt in `scripts/schatz-merge-preview-check.mjs` (Playwright wie bei den vorhandenen Browserchecks; optional `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, `GAME_URL`). Messdateien/Screenshots verbleiben unter dem ignorierten `work/schatz-profile/`.

Unverändert: Assets und Sprite-Caches, adaptive DPR, Physiksolver 10/7/4, Collider/Größen/Masse, Kontaktkorrektur, Merge-Platzierung, Support-Wakeup, Sleeping, Partikellimit, Spielsteuerung, Layout, Schatzfolge, Score/Highscore, Shuffle-Bag und Sound. Die Versions-/Release-Dateien werden ausschließlich gemäß Repository-Regeln aktualisiert.
