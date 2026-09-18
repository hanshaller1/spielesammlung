# Level-Templates in Zwergengold

Zwergengold besitzt drei voneinander getrennte, wiederverwendbare Leveltypen:

- `normal`: scrollender Minentunnel, Hindernisse, Sammelobjekte und Bodenklappe
- `bonus`: breiter Süßigkeitentunnel mit Truhe und Leiter-Ausgang
- `boss`: statische Arena mit Gegner-KI, Angriffen und Siegesbelohnung

Die Konfigurationen liegen in `app/zwerge/level-templates.ts`. Jede Spielwelt besteht aus einem passenden Eintrag in allen drei Listen. `ACTIVE_LEVEL_SET` legt den Start der ersten Welt fest; der laufende Levelmanager schaltet nach einem Boss-Sieg auf das nächste vollständige Set um.

## Aktuelle Abfolge

- Welt 1 startet mit Normal 1, Bonus 1 und Boss 1.
- Nach dem Sieg über Boss 1 beginnt automatisch Normal 2.
- In Welt 2 führen geöffnete Klappen in Bonus 2; nach zwei Minuten Normal 2 folgt Boss 2.
- Nach Boss 2 bleibt das Spiel in Welt 2 und setzt Normal 2 fort.

Welt 2 hat eine eigene Kristallmine, eine blau leuchtende Kristallzucker-Bonushöhle und den stärkeren Kristallgrimmzahn. Die gemeinsame Mechanik bleibt dieselbe, die Unterschiede liegen in den Templates.

## Eine weitere Welt ergänzen

1. Einen neuen `normal-levelN`-Eintrag anlegen und Tunnel, Tempo, Spawnregeln, Inhalte, Farben und Musik festlegen.
2. Einen neuen `bonus-levelN`-Eintrag mit Dauer, Süßigkeiten, Ausgang und eigener Gestaltung anlegen.
3. Einen neuen `boss-levelN`-Eintrag mit Gegner, Lebenspunkten, Angriffstakten, Belohnung und Arena-Gestaltung anlegen.
4. Die drei Einträge über `createLevelSet(world)` prüfen und in die Weltabfolge aufnehmen.

Die eigentliche Bewegungs-, Kollisions-, Sammel-, Übergangs- und Kampfmechanik bleibt dabei unverändert. Neue Welten benötigen deshalb im Normalfall nur zusätzliche Konfigurationsobjekte statt kopierter Spiellogik.
