export type ReleaseNote = {
  version: string;
  title: string;
  date: string;
  changes: string[];
  commits: Array<{ id: string; description: string }>;
};

// Neue Einträge immer oben ergänzen, damit der aktuelle Patch zuerst erscheint.
export const releaseNotes: ReleaseNote[] = [
  {
    version: "0.4.0",
    title: "Zuverlässiger Musikwechsel zwischen Leveltypen",
    date: "5. September 2026",
    changes: [
      "Beim Wechsel von Normal zu Bonus wird die Bonusmusik zuverlässig neu gestartet.",
      "Nach dem Bonuslevel wird die Normalmusik wieder korrekt gestartet.",
      "Beim Übergang in Boss 1 oder Boss 2 startet die Bossmusik zuverlässig.",
      "Nach Boss 1 wird beim Start von Normal-Level 2 ebenfalls die passende Musik aktiviert.",
      "Der Audio-Kontext wird beim Wechsel sauber angehalten und vor dem neuen Musikstück wieder aktiviert.",
    ],
    commits: [{ id: "88f7c59", description: "Zwergengold: Musik bei allen Levelübergängen zuverlässig neu starten" }],
  },
  {
    version: "0.3.21",
    title: "Hacklevel auf Leicht nach Holztreffern",
    date: "5. September 2026",
    changes: [
      "Zwergengold verwendet nur die Schwierigkeitsgrade Leicht und Normal.",
      "Auf Leicht steigt das Hackenlevel nach jeweils 4 Holztreffern.",
      "Jeder Treffer auf ein Holzbrett zählt, auch wenn das Brett erst beim nächsten Treffer zerstört wird.",
      "Normal bleibt unverändert.",
    ],
    commits: [{ id: "de9e1cb", description: "Zwergengold: Auf Leicht jeden Holztreffer für das Hackenlevel zählen" }],
  },
  {
    version: "0.3.20",
    title: "Schnelleres Hackenlevel auf Leicht",
    date: "5. September 2026",
    changes: [
      "Im Schwierigkeitsgrad Leicht steigt das Hackenlevel jetzt nach jeweils 7 zerstörten Holzhindernissen.",
      "Die Aufstiegsregeln für Normal und Schwer bleiben unverändert.",
    ],
    commits: [{ id: "212d3fc", description: "Zwergengold: Hackenlevel auf Leicht nach jeweils 7 Holz erhöhen" }],
  },
  {
    version: "0.3.19",
    title: "Bonuslevel-Ausgang am Leiterende",
    date: "5. September 2026",
    changes: [
      "Die Tür beziehungsweise der Ausgang befindet sich jetzt sichtbar am oberen Ende der Leiter.",
      "Die Leiter führt dadurch direkt in den Ausgang; der restliche Bonuslevel bleibt unverändert.",
    ],
    commits: [{ id: "1831343", description: "Zwergengold: Bonuslevel-Ausgang ans obere Leiterende verschoben" }],
  },
  {
    version: "0.3.18",
    title: "Boss-Darstellungen getauscht",
    date: "5. September 2026",
    changes: [
      "Boss 1 verwendet jetzt die bisherige blau-violette Boss-2-Darstellung.",
      "Boss 2 verwendet jetzt die bisherige gefährlichere Boss-1-Darstellung.",
      "Angriffe, Lebenspunkte, Sonderfähigkeiten und Levelabläufe bleiben unverändert.",
    ],
    commits: [{ id: "1b9382c", description: "Zwergengold: Boss-1- und Boss-2-Darstellungen getauscht" }],
  },
  {
    version: "0.3.17",
    title: "Neues Boss-2-Design",
    date: "5. September 2026",
    changes: [
      "Boss 2 nutzt jetzt dieselbe bedrohliche Zwergen-Silhouette wie Boss 1, ist aber durch eine kühle blau-violette Farbwelt klar eigenständig.",
      "Eine gegabelte Mütze, ein blau-grauer Bart, leuchtende Augen und Kristall-Schulterelemente geben Boss 2 ein eigenes Erscheinungsbild.",
      "Boss-Mechanik, Boss-2-Arena und alle anderen Level bleiben unverändert.",
    ],
    commits: [{ id: "67adf75", description: "Zwergengold: Boss 2 optisch an Boss 1 angelehnt und eigenständig differenziert" }],
  },
  {
    version: "0.3.16",
    title: "Final-Victory-Sequence nach Boss 2",
    date: "5. September 2026",
    changes: [
      "Ausschließlich nach Boss 2 zerfällt der besiegte Boss in leuchtende Kristallsplitter.",
      "Die Splitter sammeln sich sichtbar und setzen sich zu einer Krone zusammen.",
      "Die Krone schwebt zunächst zu groß über dem Zwerg, landet auf seinem Kopf und wird anschließend zurechtgerückt.",
      "Die Arena wird heller, erhält zusätzliche Kristall- und Funkelpartikel und zeigt die Siegerpose.",
      "Das animierte Abschlussbild bleibt mit ‚Krone erobert!‘ sichtbar und bietet Nochmal spielen sowie die Rückkehr zum Menü.",
      "Boss 1 verwendet weiterhin seinen normalen bisherigen Übergang.",
    ],
    commits: [{ id: "e48190c", description: "Zwergengold: Vollständige Final-Victory-Sequence ausschließlich nach Boss 2 umgesetzt" }],
  },
  {
    version: "0.3.15",
    title: "Verbesserter Bonuslevel-Ausgang über die Leiter",
    date: "5. September 2026",
    changes: [
      "Der Leiterausgang ist nun als dunkler, abgerundeter Felsbogen mit sichtbarer Öffnung gestaltet.",
      "Die Abschlusswand verwendet die Farben der jeweiligen Bonuswelt und fügt sich dadurch natürlicher in den Tunnel ein.",
      "Die Leiter wirkt nun direkt mit dem Felsaufgang verbunden.",
    ],
    commits: [{ id: "486c2f8", description: "Zwergengold: Bonuslevel-Ausgang über die Leiter verbessert" }],
  },
  {
    version: "0.3.14",
    title: "Dessert-Bonus und Level-Musik",
    date: "5. September 2026",
    changes: [
      "Bonus-Level 2 enthält jetzt Torten, Kuchenstücke und Eis in der Waffel.",
      "Das normale Level behält seine bisherige Musik.",
      "Bonuslevel erhalten ein fröhliches Musikthema.",
      "Bosslevel erhalten ein düsteres, treibendes Musikthema.",
      "Nach dem letzten Boss erklingt während des Finales ein triumphierendes, pompöses Musikthema.",
    ],
    commits: [{ id: "b296a59", description: "Zwergengold: Dessertobjekte für Bonus 2 und thematische Musik ergänzt" }],
  },
  {
    version: "0.3.13",
    title: "Kompakte Sammelanzeigen und Bonus-Spielzeuge",
    date: "5. September 2026",
    changes: [
      "Beim Einsammeln erscheint nur noch der Zahlenwert, zum Beispiel +1 oder +5.",
      "Gegenstände und Hindernisse erscheinen beim Betreten eines normalen Levels deutlich früher.",
      "Bonus-Level 2 enthält jetzt Teddybären, Spielzeugautos, Legobausteine und Malstifte.",
      "Schatztruhen tragen keine Beschriftung mehr und Bonus-Level-Klappen zeigen zwei gekreuzte Bretter.",
      "Gold und Edelsteine werden in der Spielstatistik als Symbole mit Anzahl angezeigt.",
    ],
    commits: [{ id: "0e16c0e", description: "Zwergengold: Sammelanzeigen, frühere Spawns, Spielzeuge und Klappenbild angepasst" }],
  },
  {
    version: "0.3.12",
    title: "Welt-2-Edelsteine und Entwickler-Startlevel",
    date: "5. September 2026",
    changes: [
      "Die Entwickleroptionen bieten jetzt Normal 1, Normal 2, Bonus 1, Bonus 2, Boss 1 und Boss 2 als direkte Startpunkte.",
      "Normal-Level 2 enthält zusätzlich zufällige weiße, grüne, rote und lila Edelsteine.",
      "Ein eigener Edelsteinzähler wurde neben dem Goldzähler ergänzt.",
      "Schatztruhen in Welt 2 werfen fünf zufällige Gold- und Edelstein-Gegenstände aus, mit einem höheren Edelsteinanteil.",
      "Die Bonuslevel-Abdeckung ist nun als Holzgitter gezeichnet.",
      "Bonus-Level 2 enthält Spielzeuge statt Süßigkeiten.",
    ],
    commits: [{ id: "a7bb958", description: "Zwergengold: Welt-2-Edelsteine, Spielzeuge und vollständige Startlevel-Auswahl ergänzt" }],
  },
  {
    version: "0.3.11",
    title: "Eigenständiges Design für Boss 2",
    date: "5. September 2026",
    changes: [
      "Boss 2 erhält eine deutlich andere Silhouette als Boss 1.",
      "Die neue Gestalt trägt eine kristalline violett-blaue Rüstung, leuchtende Augen und eine markante Kristallkrone.",
      "Die bedrohliche Boss-2-Atmosphäre bleibt erhalten, passt nun aber sichtbar zur Kristallwelt.",
    ],
    commits: [{ id: "6d40522", description: "Zwergengold: Eigenständiges kristallines Boss-2-Design ergänzt" }],
  },
  {
    version: "0.3.10",
    title: "Funkelnde Abschlussanimation",
    date: "5. September 2026",
    changes: ["Die Kristall-Finale nach Boss 2 erzeugt nun während der gesamten Animation laufend neue funkelnde Partikel."],
    commits: [{ id: "8c9ea4d", description: "Zwergengold: Funkelpartikel der Boss-2-Abschlussanimation stabilisiert" }],
  },
  {
    version: "0.3.9",
    title: "Boss-2-Finale und leichter Boss-Modus",
    date: "5. September 2026",
    changes: [
      "Nach dem Sieg über Boss 2 zeigt Zwergengold eine animierte Kristallkrone und die Abschlussmeldung ‚Welt 2 geschafft!‘.",
      "Die Abschlusssequenz läuft mehrere Sekunden als sichtbare Animation und beendet danach die Runde.",
      "Auf Schwierigkeit Leicht fällt beim Steinschlag nur noch ein Stein statt drei.",
      "Auf Schwierigkeit Leicht werfen die Bosse ihre Hacken deutlich seltener; Normal bleibt unverändert.",
    ],
    commits: [
      { id: "102e2f4", description: "Zwergengold: Boss-2-Abschlussanimation und leichtere Boss-Angriffe ergänzt" },
    ],
  },
  {
    version: "0.3.8",
    title: "Winkelwürfe für höhere Hackenlevel",
    date: "4. September 2026",
    changes: [
      "Ab Hackenlevel 4 fliegt die zweite Hacke in einem Winkel von 20 Grad zur ersten.",
      "Bei Hackenlevel 4 wechselt die zweite Hacke pro Wurf abwechselnd die Seite und beginnt links.",
      "Ab Hackenlevel 5 fliegen drei Hacken: eine gerade, eine 20 Grad nach links und eine 20 Grad nach rechts.",
      "Die Hacken besitzen nun echte seitliche Flugbahnen statt nur einer gedrehten Darstellung.",
      "Die normale Reload-Zeit bleibt unverändert und gilt für die gesamte Wurfaktion.",
    ],
    commits: [
      { id: "b80d91c", description: "Ab Hackenlevel 4 alternierende Winkelwürfe und ab Level 5 Dreifachwurf ergänzt" },
    ],
  },
  {
    version: "0.3.7",
    title: "Fließende Lichtübergänge ohne Bodenlinien",
    date: "4. September 2026",
    changes: [
      "Helle und dunkle Tunnelbereiche gehen nun weich ineinander über.",
      "Die Lichtstärke bleibt an den Tunnelabschnitten verankert und verändert sich nicht flackernd.",
      "Das Boden-Rendering verwendet eine zusammenhängende Fläche ohne sichtbare horizontale Segment- oder Rasterlinien.",
    ],
    commits: [
      { id: "0dc7441", description: "Lichtverlauf geglättet und letzte horizontale Bodenlinien aus dem Rendering entfernt" },
    ],
  },
  {
    version: "0.3.6",
    title: "Stabile Lichtzonen und Doppelhacken",
    date: "4. September 2026",
    changes: [
      "Helle und dunkle Tunnelabschnitte bleiben nun fest an der Tunnelgeometrie verankert.",
      "Fackeln hängen dauerhaft in den hellen Abschnitten und flackern oder verschwinden nicht mehr.",
      "Die Bodenfläche wird als zusammenhängende Form gezeichnet; störende horizontale Linien wurden entfernt.",
      "Ein Hackenwurf ab Level 3 erzeugt weiterhin zwei Hacken, aber die nächste Eingabe bleibt bis zum Ende der normalen Reload-Zeit gesperrt.",
    ],
    commits: [
      { id: "7cbfd8c", description: "Lichtzonen und Fackeln stabilisiert, Bodenlinien entfernt und Doppelhacken an Reload-Zeit gebunden" },
    ],
  },
  {
    version: "0.3.5",
    title: "Fackelbereiche und stärkere Hacke",
    date: "4. September 2026",
    changes: [
      "Das Normal-Level wechselt nun zwischen hellen und gedämpften, weiterhin erkennbaren Tunnelbereichen.",
      "In den hellen Bereichen hängen Fackeln an beiden Felswänden und werfen warmes Licht in den Tunnel.",
      "Steine können bereits mit Hackenlevel 2 zerstört werden; die bisherigen drei Trefferzustände bleiben erhalten.",
      "Ab Hackenlevel 3 werden pro Wurf zwei Hacken kurz nacheinander ausgelöst, unabhängig von der normalen Nachladezeit.",
    ],
    commits: [
      { id: "198c3fb", description: "Normallevel-Beleuchtung, Fackeln und Hackenlevel-2/Doppelhacken-Mechanik ergänzt" },
    ],
  },
  {
    version: "0.3.4",
    title: "Welt 2 mit neuen Level-Templates",
    date: "4. September 2026",
    changes: [
      "Für Normal, Bonus und Boss wurden vollständige Level-2-Konfigurationen ergänzt.",
      "Nach dem Sieg über Boss 1 beginnt automatisch Normal-Level 2.",
      "Normal-Level 2 führt über die Klappen in Bonus-Level 2 und nach zwei Minuten in Boss-Level 2.",
      "Die zweite Welt erhält eine eigene Kristallmine, eine Kristallzucker-Bonushöhle und den stärkeren Kristallgrimmzahn.",
      "Nach Boss 2 wird Normal-Level 2 innerhalb derselben Welt fortgesetzt.",
      "Die gemeinsame Spiel-, Kollisions-, Sammel- und Kampflogik bleibt unverändert und wird weiterhin von den Templates genutzt.",
    ],
    commits: [
      { id: "745adf8", description: "Welt-2-Templates und Weltabfolge für Zwergengold ergänzt" },
    ],
  },
  {
    version: "0.3.3",
    title: "Wiederverwendbare Level-Templates",
    date: "4. September 2026",
    changes: [
      "Normal-, Bonus- und Bosslevel besitzen nun jeweils ein eigenes typisiertes Basissystem.",
      "Die bestehende erste Welt bezieht Tunnel, Tempo, Spawnregeln, Übergänge, Gestaltung, Musik, Gegner und Belohnungen aus diesen Templates.",
      "Neue Welten können als normal-level2, bonus-level2 und boss-level2 ergänzt werden, ohne Bewegungs-, Kollisions-, Sammel- oder Kampflogik zu kopieren.",
      "Eine zentrale Levelset-Auswahl stellt sicher, dass immer die drei zusammengehörigen Templates derselben Welt verwendet werden.",
      "Eine Projektdokumentation beschreibt das Anlegen und Aktivieren weiterer Levelvarianten.",
      "Spielablauf und Balance der bisherigen ersten Welt bleiben unverändert.",
    ],
    commits: [
      { id: "39fe1fc", description: "Konfigurierbare Basissysteme für Normal-, Bonus- und Bosslevel eingeführt und Welt 1 darauf umgestellt" },
    ],
  },
  {
    version: "0.3.2",
    title: "Bosskampf gegen Grimmzahn",
    date: "4. September 2026",
    changes: [
      "Nach zwei Minuten verengt sich der normale Tunnel und führt durch einen Eingang in der horizontalen Felswand zur Bossarena.",
      "Das Bosslevel ist ein großer, unbewegter Raum: Der eigene Zwerg kämpft unten, während sich der größere böse Zwerg Grimmzahn oben bewegt.",
      "Beide Seiten greifen mit Hacken an; Grimmzahns Spezialfähigkeit ist ein vorher markierter dreifacher Steinschlag.",
      "Grimmzahn besitzt acht Lebenspunkte und wird bei niedriger Gesundheit schneller und angriffslustiger.",
      "Nach dem Sieg erscheint eine leuchtende goldene Krone und die Belohnung beträgt 25 Gold.",
      "Das Bosslevel kann über die Startlevel-Auswahl der aktivierten Entwickleroptionen direkt geöffnet werden.",
    ],
    commits: [
      { id: "b0da8c9", description: "Zwei-Minuten-Übergang, statische Bossarena, Grimmzahn-Kampf, Spezialangriff und Siegesbelohnung implementiert" },
    ],
  },
  {
    version: "0.3.1",
    title: "Natürlicher Bonuslevel-Abschluss",
    date: "4. September 2026",
    changes: [
      "Die Abschlusswand besitzt nun eine unregelmäßige statt einer geraden Felskante.",
      "An beiden Seiten geht die horizontale Felswand verzahnt und abgerundet in die senkrechten Tunnelwände über.",
      "Die Felsreihen sind leicht versetzt, damit der gesamte Ausgang wie ein zusammenhängender natürlicher Felsbereich wirkt.",
    ],
    commits: [
      { id: "20be3bc", description: "Abschlusswand natürlich mit den seitlichen Felswänden verbunden" },
    ],
  },
  {
    version: "0.3.0",
    title: "Durchgehender Süßigkeitenweg",
    date: "4. September 2026",
    changes: [
      "Im Bonuslevel erscheinen gegenüber Version 0.2.7 nochmals 25 Prozent mehr frei einsammelbare Süßigkeiten.",
      "Beim Start ist der gesamte sichtbare Bonusweg bereits gleichmäßig mit Süßigkeiten gefüllt.",
      "Zwischen den Süßigkeiten vor dem Zwerg und den neu nachkommenden Süßigkeiten entsteht keine längere leere Strecke mehr.",
    ],
    commits: [
      { id: "0244d95", description: "Süßigkeitenrate erhöht und den Bonusweg vom Start an durchgehend gefüllt" },
    ],
  },
  {
    version: "0.2.7",
    title: "Saubere Felsfront und direkter Bonusstart",
    date: "4. September 2026",
    changes: [
      "Die horizontale Abschlusswand besteht jetzt aus zwei versetzten, durchgehenden Felsreihen über die gesamte Spielfeldbreite.",
      "Beim Betreten der Bonushöhle liegen sofort fünf Süßigkeiten sichtbar vor dem Zwerg.",
      "Die Entwickleroptionen enthalten eine Startlevel-Auswahl für Normal und Bonus.",
      "Boss ist bereits als deaktivierte Option mit dem Hinweis ‚später‘ sichtbar und kann nach der späteren Implementierung freigeschaltet werden.",
    ],
    commits: [
      { id: "0f8d9b7", description: "Bonusabschluss verbessert, anfängliche Süßigkeitenspur und Entwickler-Startlevel ergänzt" },
    ],
  },
  {
    version: "0.2.6",
    title: "Kurviger Bonusgang mit Süßigkeitenregen",
    date: "4. September 2026",
    changes: [
      "Der Verlauf des Bonusgangs orientiert sich nun an den weich pendelnden Kurven der normalen Schwierigkeit.",
      "Der breite Gang verjüngt sich während der Anfahrt auf den Ausgang gleichmäßig und sichtbar zur Leiter hin.",
      "Im Bonuslevel erscheinen 50 Prozent mehr frei einsammelbare Süßigkeiten.",
      "Aus der großen Süßigkeitentruhe springen 75 Prozent mehr Süßigkeiten; statt 5 bis 8 sind es jetzt 9 bis 14 Stück.",
    ],
    commits: [
      { id: "458293e", description: "Bonusgang kurviger gestaltet, zur Leiter verjüngt und Süßigkeitenmenge erhöht" },
    ],
  },
  {
    version: "0.2.5",
    title: "Lebendigere Bonushöhle ohne Layoutsprung",
    date: "4. September 2026",
    changes: [
      "Der Bereich hinter der heranfahrenden Abschlusswand wird vollständig mit demselben Felsmuster wie die Wand gefüllt.",
      "Der Bonusgang bildet nun sanfte Kurven nach links und rechts, behält dabei aber durchgehend exakt dieselbe Breite.",
      "Die beiden Felsseiten folgen den Kurven des Bonusgangs.",
      "Der Bonusstatus ersetzt vorübergehend den Highscore im selben festen Anzeigefeld; dadurch verändert sich die Seitenhöhe beim Betreten des Bonuslevels nicht mehr.",
    ],
    commits: [
      { id: "da287de", description: "Felsbereich hinter dem Ausgang gefüllt, Bonusgang sanft gekrümmt und Statuslayout stabilisiert" },
    ],
  },
  {
    version: "0.2.4",
    title: "Natürlich heranfahrender Bonusausgang",
    date: "4. September 2026",
    changes: [
      "Felswand und Leiter am Ende des Bonuslevels werden nicht mehr plötzlich eingeblendet.",
      "Der Ausgang erscheint oberhalb des Spielfelds und bewegt sich mit derselben Geschwindigkeit wie Süßigkeiten und Schatztruhe auf den Zwerg zu.",
      "Während der Ausgang heranfährt, entstehen keine neuen Süßigkeiten mehr hinter der Abschlusswand.",
      "Erst wenn die Felswand ihre Endposition erreicht, stoppt der Bonuslauf und die Leiterprüfung beginnt.",
    ],
    commits: [
      { id: "0544594", description: "Bonusausgang natürlich mit der Spielwelt heranfahren lassen" },
    ],
  },
  {
    version: "0.2.3",
    title: "Überarbeitete Bonushöhle und Leiterprüfung",
    date: "4. September 2026",
    changes: [
      "Das Bonuslevel verläuft gerade und mittig; seine beiden Seitenwände sind gleich breit und bestehen jeweils aus zwei sichtbaren Felsreihen.",
      "Aus einer aufgeschossenen Bodenklappe ragt ein kleines Stück Leiter heraus.",
      "Berührt der Zwerg im Bonuslevel eine Seitenwand, nimmt er wie in der normalen Mine Schaden.",
      "Am Ende der Bonusstrecke steht eine horizontale Felswand mit einer mittigen Leiter.",
      "Der Zwerg muss die Leiter innerhalb von 3,5 Sekunden direkt erreichen, um hinaufzuklettern; beim Verfehlen verliert er ein Leben und kehrt in die normale Mine zurück.",
    ],
    commits: [
      { id: "950264a", description: "Symmetrische Bonushöhle, sichtbare Lukenleiter, Wandschaden und erreichbaren Leiterausgang ergänzt" },
    ],
  },
  {
    version: "0.2.2",
    title: "Zuverlässige Falltüren und 5er-Gold",
    date: "4. September 2026",
    changes: [
      "Die erste Bodenklappe erscheint bereits nach ungefähr 7 bis 10 Sekunden; ist ihre geplante Position belegt, wird kurzfristig erneut nach einem freien Platz gesucht.",
      "Neue Hindernisse halten Abstand zu sichtbaren Bodenklappen und können diese nicht mehr verdecken.",
      "5er-Goldmünzen erhöhen den Goldzähler beim Einsammeln zuverlässig um fünf; gleichzeitig berührte Sammelobjekte werden vollständig verarbeitet.",
    ],
    commits: [
      { id: "435df76", description: "Bodenklappen früher und zuverlässig erscheinen lassen" },
      { id: "7da96f1", description: "Einsammeln von 5er-Goldmünzen zuverlässig zählen" },
    ],
  },
  {
    version: "0.2.1",
    title: "Geheimes Süßigkeiten-Bonuslevel",
    date: "4. September 2026",
    changes: [
      "Die kleineren Zahlen in Fang den Stern wurden innerhalb der Sterne etwas nach unten verschoben und wirken dadurch besser zentriert.",
      "In Zwergengold erscheinen gelegentlich ungefährliche Bodenklappen, die mit zwei Hackentreffern geöffnet werden können.",
      "Läuft der Zwerg über eine geöffnete Klappe, fällt er in ein 20 Sekunden langes, besonders breites Bonuslevel ohne Schadensgefahr.",
      "Bonbons geben ein Gold, Lollis zwei Gold und Schokoladentafeln drei Gold.",
      "Eine große Süßigkeitentruhe lässt nach einem Hackentreffer eine zufällige Auswahl von Süßigkeiten herausspringen.",
      "Am Ende des Bonuslevels klettert der Zwerg über eine Leiter zurück und setzt seine normale Minenrunde fort.",
    ],
    commits: [
      { id: "3f34185", description: "Zahlen in den Sternen optisch nach unten zentriert" },
      { id: "eca2443", description: "Zerstörbare Bodenklappen und unverwundbares Süßigkeiten-Bonuslevel ergänzt" },
    ],
  },
  {
    version: "0.2.0",
    title: "Verfeinerte Schwierigkeitsgrade und Highscores",
    date: "4. September 2026",
    changes: [
      "Die Zahlen in den Sternen von Fang den Stern wurden verkleinert; der schwere Modus beginnt jetzt direkt mit zwei Sternen.",
      "Zwergengold speichert und zeigt für Leicht und Normal jeweils einen eigenen Highscore an.",
      "Der bisherige Zwergengold-Highscore wird automatisch dem normalen Schwierigkeitsgrad zugeordnet.",
      "Die Highscore-Vorgabe wurde aus den Entwickleroptionen entfernt; komplette Runden mit beim Start aktivierten Entwickleroptionen verändern keinen Highscore.",
      "Der aktuell ausgewählte Zwergengold-Highscore kann im Spielstartmenü zurückgesetzt werden.",
      "Spielbezogene Commit-Nachrichten nennen künftig das jeweilige Spiel; übergreifende Änderungen nennen die Spielesammlung.",
    ],
    commits: [
      { id: "04c4a06", description: "Fang den Stern startet im schweren Modus mit zwei Sternen und zeigt kleinere Zahlen" },
      { id: "c3935fa", description: "Zwergengold-Highscores nach Schwierigkeit getrennt und vor Entwicklerrunden geschützt" },
      { id: "30c4244", description: "Namenskonvention für zukünftige Commit-Nachrichten festgehalten" },
    ],
  },
  {
    version: "0.1.13",
    title: "Drei Schwierigkeitsgrade für Fang den Stern",
    date: "4. September 2026",
    changes: [
      "Im neuen bildschirmfüllenden Startmenü stehen die Schwierigkeitsgrade Leicht, Mittel und Schwer zur Auswahl.",
      "Leicht verwendet die ursprüngliche Spielmechanik mit jeweils einem einzelnen Stern.",
      "Mittel kombiniert einzelne Sterne mit vier 2er-, zwei 3er- und einer 4er-Zahlenfolge zu zufälligen Zeitpunkten.",
      "Schwer verwendet die bisherige Mechanik, bei der jede abgeschlossene Zahlenfolge um einen Stern wächst.",
      "Jeder Schwierigkeitsgrad besitzt einen eigenen Highscore; der bisherige Highscore wird dem schweren Modus zugeordnet.",
    ],
    commits: [
      { id: "5c606d1", description: "Drei Spielmechaniken, getrennte Highscores und großes Startmenü für Fang den Stern ergänzt" },
    ],
  },
  {
    version: "0.1.12",
    title: "Angepasste Stein-Beute",
    date: "4. September 2026",
    changes: [
      "Beim Zerstören eines Steins wurde die Herz-Wahrscheinlichkeit bei weniger als drei Leben von 10 auf 15 Prozent erhöht.",
      "Die Wahrscheinlichkeit für eine 5er-Goldmünze wurde von 30 auf 25 Prozent reduziert.",
      "Die Standard- und Rücksetzwerte der Entwickleroptionen wurden entsprechend angepasst; Herz und Münze bleiben gegenseitig ausgeschlossen.",
    ],
    commits: [
      { id: "b50c9fa", description: "Wahrscheinlichkeiten für Herz und 5er-Gold aus zerstörten Steinen angepasst" },
    ],
  },
  {
    version: "0.1.11",
    title: "Belohnungen aus zerstörten Steinen",
    date: "4. September 2026",
    changes: [
      "Beim Zerstören eines Steins kann mit 10 Prozent Wahrscheinlichkeit ein Herz herausspringen, sofern der Zwerg weniger als drei Leben besitzt.",
      "Alternativ kann mit 30 Prozent Wahrscheinlichkeit eine deutlich mit 5 markierte Goldmünze erscheinen, die beim Einsammeln fünf Gold gibt.",
      "Aus einem Stein kann höchstens eine der beiden Belohnungen entstehen; beide springen sichtbar heraus und müssen eingesammelt werden.",
      "Die Herz- und Münzwahrscheinlichkeit kann in den Entwickleroptionen unter der Stein-Beute getrennt eingestellt werden.",
    ],
    commits: [
      { id: "8573d25", description: "Exklusive Herz- und 5er-Goldbelohnungen für zerstörte Steine ergänzt" },
    ],
  },
  {
    version: "0.1.10",
    title: "Entwickleroptionen im Pause-Menü",
    date: "4. September 2026",
    changes: [
      "Bei aktivierten Entwickleroptionen erscheint im Pause-Menü ein zusätzlicher Button zur Entwicklerkonsole.",
      "Die aktuellen internen Spielwerte können dadurch während einer laufenden, pausierten Runde kontrolliert werden.",
      "Nach dem Schließen der Entwicklerkonsole bleibt das Spiel pausiert und kann normal fortgesetzt werden.",
    ],
    commits: [
      { id: "f434d42", description: "Entwicklerkonsole aus dem Pause-Menü erreichbar gemacht" },
    ],
  },
  {
    version: "0.1.9",
    title: "Versteckte Entwicklerkonsole",
    date: "4. September 2026",
    changes: [
      "Dreimaliges Tippen auf den Zwerg im Startmenü öffnet einen versteckten Dialog mit Entwickleroptionen.",
      "Eine zentrale Checkbox entscheidet, ob das nächste Spiel die Testwerte oder ausschließlich die normalen Standardwerte verwendet.",
      "Hackenlevel, zerstörtes Holz, Gold, Highscore, Leben, Unverwundbarkeit, Geschwindigkeit, Hindernisabstand und Tunnelbreite lassen sich gezielt vorgeben.",
      "Hindernisarten, Testobjekte, Stein-Schadensstufen und enge Kurven können für den Spielstart erzwungen werden.",
      "Trefferflächen und die Fairness-Prüfung können eingeblendet, aktuelle Spielwerte kontrolliert und Musik sowie einzelne Effekte getestet werden.",
      "Ein frei wählbarer Zufallsstartwert ermöglicht wiederholbare Spielsituationen; alle Entwicklerwerte lassen sich gemeinsam zurücksetzen.",
    ],
    commits: [
      { id: "1351a04", description: "Versteckte Entwicklerkonsole mit Spiel-, Welt-, Prüf- und Tonoptionen ergänzt" },
    ],
  },
  {
    version: "0.1.8",
    title: "Zerstörbare Steine",
    date: "4. September 2026",
    changes: [
      "Ab Hackenlevel 3 können Steine mit drei Treffern zerstört werden.",
      "Nach dem ersten Treffer zeigt der Stein einen deutlichen Riss, nach dem zweiten mehrere Risse und beim dritten Treffer zerbricht er.",
      "Hacken unter Level 3 prallen weiterhin am Stein ab und zeigen an, welches Level benötigt wird.",
    ],
    commits: [
      { id: "1b6141b", description: "Steine ab Hackenlevel 3 zerstörbar gemacht und sichtbare Rissstufen ergänzt" },
    ],
  },
  {
    version: "0.1.7",
    title: "Erreichbares Gold und Schatzkisten-Beute",
    date: "3. September 2026",
    changes: [
      "Gold und Schilde werden nur noch an freien Stellen erzeugt; wenn kein sicherer Platz vorhanden ist, wird das Sammelobjekt in diesem Durchlauf ausgelassen.",
      "Neu erscheinende Hindernisse dürfen vorhandene Sammelobjekte nicht mehr überdecken.",
      "Eine Schatzkiste zerbricht nach dem zweiten Treffer und schleudert drei einzelne Goldnuggets in den Tunnel.",
      "Die drei Nuggets erhöhen den Goldstand erst, wenn der Zwerg sie tatsächlich einsammelt.",
    ],
    commits: [
      { id: "6eb09fd", description: "Goldplatzierung abgesichert und einsammelbare Schatzkisten-Beute umgesetzt" },
    ],
  },
  {
    version: "0.1.6",
    title: "Natürlichere Felsvorsprünge",
    date: "3. September 2026",
    changes: [
      "Abrupte, vollständig gerade Felsvorsprünge wurden durch kurze natürliche Übergänge ersetzt.",
      "Beide Tunnelwände besitzen jetzt eine feine, unregelmäßige und dauerhaft stabile Felskontur.",
      "Die neue Kontur wird zugleich für Darstellung, Kollisionen und Objektplatzierung verwendet, damit keine unsichtbaren Kanten entstehen.",
    ],
    commits: [
      { id: "3b8d44c", description: "Gerade Tunnelkanten durch natürliche Felskonturen ersetzt" },
    ],
  },
  {
    version: "0.1.5",
    title: "Zurück zum einzelnen Tunnel",
    date: "3. September 2026",
    changes: [
      "Alternative Wege, Abzweigungen, Gabelungen, Sackgassen und gleichzeitig befahrbare Tunnel wurden wieder entfernt.",
      "Zwergengold erzeugt wieder genau einen durchgehenden Tunnel mit Kurven und Hindernissen.",
      "Größen, Bewegung und das detaillierte Felsdesign aus den vorherigen Optimierungen bleiben erhalten.",
    ],
    commits: [
      { id: "da3cf9e", description: "Verzweigungslogik entfernt und einzelnen Tunnel wiederhergestellt" },
    ],
  },
  {
    version: "0.1.4",
    title: "Ursprüngliche Spielgröße wiederhergestellt",
    date: "3. September 2026",
    changes: [
      "Die Verkleinerung aus Version 0.1.2 wurde für Spielfeld, Zwerg, Hindernisse, Gold, Schild, Hacke, Trefferfeedback und Tunnelbreiten zurückgenommen.",
      "Das detaillierte Fels- und Bergdesign aus Version 0.1.3 bleibt erhalten.",
      "Gabelungen und alternative Wege bleiben bestehen und wurden an das ursprüngliche Spielfeldformat angepasst.",
      "Die seitliche Schrittweite liegt etwas über dem alten Wert, damit Wechsel zwischen verzweigten Wegen fair bleiben.",
    ],
    commits: [
      { id: "c1411df", description: "Ursprüngliche Größe wiederhergestellt und Verzweigungen daran angepasst" },
    ],
  },
  {
    version: "0.1.3",
    title: "Schnellere Wege und schönere Felswände",
    date: "3. September 2026",
    changes: [
      "Die seitliche Schrittweite wurde an das größere Spielfeld angepasst, damit Ausweichen und der Wechsel zwischen Tunnelwegen wieder rechtzeitig möglich sind.",
      "Die glatten Wandbänder wurden durch ein dichtes, unregelmäßiges Felsmuster mit plastischen Tunnelkanten, Schattierungen und Rissen ersetzt.",
      "Das Felsmuster bewegt sich stabil mit der Mine und erzeugt keine blinkenden Elemente oder horizontalen Linien.",
    ],
    commits: [
      { id: "e9e6e7c", description: "Seitliche Bewegung an das größere Spielfeld angepasst" },
      { id: "2774e64", description: "Detaillierte Felswände und plastische Tunnelkanten wiederhergestellt" },
    ],
  },
  {
    version: "0.1.2",
    title: "Größere Mine und nachvollziehbare Änderungen",
    date: "3. September 2026",
    changes: [
      "Zwerg, Hindernisse, Gold, Hacke und das interne Minenraster sind kleiner; dadurch ist deutlich mehr von der Mine sichtbar.",
      "Die Mine erzeugt spielbare Gabelungen, alternative Wege, kurze Sackgassen und mehrere gleichzeitig befahrbare Tunnel.",
      "Kollisionen, Hindernisse, Sammelobjekte und Hackenwürfe berücksichtigen alle offenen Tunnelwege.",
      "Alle bisherigen und künftigen inhaltlichen Änderungen werden ihrer Version mit Commit-ID zugeordnet.",
    ],
    commits: [
      { id: "65e152f", description: "Zwergengold verkleinert und um verzweigte Minenwege erweitert" },
    ],
  },
  {
    version: "0.1.1",
    title: "Versionsanzeige und Release Notes",
    date: "3. September 2026",
    changes: [
      "Die aktuelle Version wird jetzt auf der Spiele-Hauptseite angezeigt.",
      "Ein neuer Link öffnet die Release Notes direkt in einem Dialog.",
      "Für jeden künftigen Patch wird ein neuer Abschnitt an diese Release Notes angehängt.",
    ],
    commits: [
      { id: "b01006b", description: "Versionsanzeige und Release-Notes-Dialog hinzugefügt" },
    ],
  },
  {
    version: "0.1.0",
    title: "Erste Version der Spielesammlung",
    date: "3. September 2026",
    changes: [
      "Die gemeinsame Startseite „Hanna's Spiele“ verbindet Fang den Stern, Fange die Tiere und Zwergengold.",
      "Fang den Stern erhielt einzelne und nummerierte Sternfolgen, eine verlässlich laufende Zeit, stetig wachsende Runden, kollisionsfreie Platzierung und eine Highscore-Rücksetzung.",
      "Fange die Tiere bietet Tiger, Affe, Koala und Vogel auf einem 4 × 5 großen Spielfeld, zufällige Tierwechsel, 40-Sekunden-Runden und eine Highscore-Rücksetzung.",
      "Zwergengold wurde als scrollendes Minenspiel mit drei Leben, Gold, Felsen, Holz, Schatztruhen, Schilden, Kurven und zunehmend engen Passagen aufgebaut.",
      "Zwergengold unterstützt Touch- und Tastatursteuerung, Pause und Rückkehr ins Spielmenü sowie die Schwierigkeitsgrade Leicht und Normal.",
      "Die levelbare, farblich erkennbare Hacke kann rotierend geworfen werden; Treffer, Abklingzeit und Kollisionen wurden mehrfach verbessert und fairer abgestimmt.",
      "Mine, Zwerg, Lauf- und Wurfanimationen, Hindernisse, Goldnuggets, Musik, Geräusche und das Zwergengold-Logo wurden grafisch und akustisch ausgebaut.",
      "Vor dem Start lässt sich ein Zwerg mit blauer, gelber oder roter Zipfelmütze auswählen; Vorschau und Spielfigur verwenden dieselbe Auswahl.",
      "Zwergengold zählt gesammeltes Gold als Highscore; das Startmenü nutzt die gesamte Bildschirmhöhe und hält Spielobjekte zuverlässig aus den Felswänden heraus.",
      "Das Projekt wurde in „spielesammlung“ umbenannt und eine feste semantische Versionierung mit Git-Tags eingeführt.",
    ],
    commits: [
      { id: "150a545", description: "Fang den Stern als erstes Spiel erstellt" },
      { id: "a55c507", description: "Nummerierte Sternfolgen ergänzt" },
      { id: "feb55d4", description: "Garantierte Häufigkeit der Sternfolgen eingeführt" },
      { id: "010c8fe", description: "Zeitsteuerung und Sternplatzierung überarbeitet" },
      { id: "3e6515d", description: "Aktive Sterne bleiben bis zum Antippen sichtbar" },
      { id: "0d4b059", description: "Spiele-Hauptseite und Fange die Tiere ergänzt" },
      { id: "3318120", description: "Vogel ergänzt und Zieltier zwischen Start und Runde vereinheitlicht" },
      { id: "b191e81", description: "Highscore-Rücksetzung für beide Spiele ergänzt" },
      { id: "777256b", description: "Sternrunden wachsen fortlaufend um jeweils einen Stern" },
      { id: "f84aa74", description: "Überlappende Sterne verhindert" },
      { id: "dd139c6", description: "Erste Version des scrollenden Zwergentunnels erstellt" },
      { id: "d4d82d1", description: "Kurven, Hindernisse und Hackenwurf ergänzt" },
      { id: "e009b49", description: "Fortschreitende Schwierigkeit eingeführt" },
      { id: "6dd88ff", description: "Drehende und levelbare Hacke umgesetzt" },
      { id: "1bcfc5f", description: "Spiel zu Zwergengold mit Goldwertung umgebaut" },
      { id: "3975752", description: "Spielbare Wandnischen ergänzt" },
      { id: "199035b", description: "Mine um Schatztruhen, Schild und Fairness-Prüfung erweitert; Nischen entfernt" },
      { id: "5fb7de9", description: "Audio und Abstände zwischen Hindernissen verbessert" },
      { id: "f0b1e7b", description: "Musiklautstärke und Anzeigen neu abgestimmt" },
      { id: "d8f30fd", description: "Kollisionen, Trefferflächen und parallele Hackenwürfe verbessert" },
      { id: "1874422", description: "Initiale Hacken-Nachladezeit und Zwergengold-Logo angepasst" },
      { id: "2c7d716", description: "Eigenes Zwergengold-Logo mit Zwerg und Zipfelmütze ergänzt" },
      { id: "da63e16", description: "Logo für zuverlässige Auslieferung umgestellt" },
      { id: "848c73b", description: "Weitere Kollisionskorrekturen und Pause ergänzt" },
      { id: "8620e8f", description: "Zwerg, Mine und Tastatursteuerung verbessert" },
      { id: "124609c", description: "Holz- und Steindesign sowie Hackenkollisionen überarbeitet" },
      { id: "bf76ea6", description: "Laufende Füße und neues Minenwandmuster ergänzt" },
      { id: "ad0f145", description: "Laufbewegung, Arme, Handhacke und Goldnuggets verbessert" },
      { id: "7f35bf8", description: "Zwergauswahl, Wurfanimation und Gold-Highscore ergänzt" },
      { id: "72c9261", description: "Mützenfarbe der Vorschau mit der Auswahl synchronisiert" },
      { id: "d0a4965", description: "Zwerg im Startmenü von vorne dargestellt" },
      { id: "96a98f9", description: "Schwierigkeitsgrade Leicht und Normal ergänzt" },
      { id: "1cd932b", description: "Pause-Menü führt zurück ins Zwergenspielmenü" },
      { id: "3cdece2", description: "Inhalt des Startdialogs nach oben gerückt" },
      { id: "586eac7", description: "Objekte vollständig innerhalb des Tunnels platziert" },
      { id: "78505a5", description: "Schrittweite der Links-Rechts-Bewegung halbiert" },
      { id: "d3b47a1", description: "Startmenü auf volle Bildschirmhöhe erweitert" },
      { id: "0c8f4c4", description: "Repository in spielesammlung umbenannt und Versionierung eingeführt" },
    ],
  },
];
