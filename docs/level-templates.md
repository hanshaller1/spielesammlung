# Level-Templates in Zwergengold

Zwergengold besitzt drei voneinander getrennte, wiederverwendbare Leveltypen:

- `normal`: scrollender Minentunnel oder Waldpfad mit Brücken, Hindernisse, Sammelobjekte und Bodenklappe
- `bonus`: breiter Süßigkeitentunnel mit Truhe und Leiter-Ausgang
- `boss`: statische Arena mit Gegner-KI, Angriffen und Siegesbelohnung

Die Konfigurationen liegen in `app/zwerge/level-templates.ts`. Jede Spielwelt besteht aus einem passenden Eintrag in allen drei Listen. `ACTIVE_LEVEL_SET` legt den Start der ersten Welt fest; der laufende Levelmanager schaltet nach einem Boss-Sieg auf das nächste vollständige Set um.

## Aktuelle Abfolge

| Welt | Weg | Bonus | Endgegner |
| --- | --- | --- | --- |
| 1 | Die tiefe Mine | Süßigkeitenhöhle | Grimmzahn |
| 2 | Die glühende Kristallmine | Kristallzuckerhöhle | Kristallgrimmzahn |
| 3 | Am Erlenbach | Honigkeller | Erlenwart |
| 4 | Mondscheinforst | Mondzuckergrotte | Mondhirsch |

Nach zwei Minuten auf dem normalen Weg erscheint der Zugang zur Arena. Zeit im Bonusgang und Pausen zählen dafür nicht mit. Ein Boss-Sieg öffnet die nächste Welt. Mit dem Sieg über den Mondhirsch endet das Abenteuer.

## Eine weitere Welt ergänzen

1. Einen neuen `normal-levelN`-Eintrag anlegen und Tunnel, Tempo, Spawnregeln, Inhalte, Farben und Musik festlegen.
2. Einen neuen `bonus-levelN`-Eintrag mit Dauer, Süßigkeiten, Ausgang und eigener Gestaltung anlegen.
3. Einen neuen `boss-levelN`-Eintrag mit Gegner, Lebenspunkten, Angriffstakten, Belohnung und Arena-Gestaltung anlegen.
4. Die drei Einträge über `createLevelSet(world)` prüfen und in die Weltabfolge aufnehmen.

Die eigentliche Bewegungs-, Kollisions-, Sammel-, Übergangs- und Kampfmechanik bleibt dabei unverändert. Neue Welten benötigen deshalb im Normalfall nur zusätzliche Konfigurationsobjekte statt kopierter Spiellogik.
