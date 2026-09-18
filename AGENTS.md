# Repository-Regeln

- Der Name dieses Repositorys ist `spielesammlung`.
- Die aktuelle Version wird in `package.json` und `package-lock.json` gepflegt.
- Jede normale, vom Nutzer gewünschte Anpassung erhöht vor dem Commit die Patch-Version um eins und erhält den passenden Git-Tag, zum Beispiel `0.1.1`.
- Jede inhaltlich getrennte Änderung erhält einen eigenen, gezielt revertierbaren Commit.
- Jede Commit-Nachricht beginnt mit dem Namen des betroffenen Spiels und einem Doppelpunkt, zum Beispiel `Zwergengold: ...` oder `Fang den Stern: ...`. Spielübergreifende Repository-, Versions- und Release-Änderungen beginnen mit `Spielesammlung: ...`.
- Für jeden Patch wird vor dem abschließenden Versions-Commit ein neuer Eintrag am Anfang von `app/release-notes.ts` ergänzt. Darin werden alle inhaltlichen Commits des Patches mit Kurzbeschreibung und siebenstelliger Commit-ID aufgeführt. Die Release Notes bleiben vollständig erhalten und werden nicht ersetzt.
- Der abschließende Versions- und Release-Notes-Commit wird durch den Git-Tag des Patches identifiziert und nicht selbst in den Release Notes aufgeführt, da ein Commit seine eigene, erst aus seinem Inhalt entstehende ID nicht enthalten kann.
- Die auf der Spiele-Hauptseite angezeigte Version muss immer dem neuen Git-Tag entsprechen.
- Die Minor- oder Major-Version darf nur erhöht werden, wenn der Nutzer dies ausdrücklich verlangt.
- Nach dem Versions-Commit wird der neue Tag zusammen mit dem Branch zum Remote übertragen.
