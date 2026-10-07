import { ReleaseNotesDialog } from "./release-notes-dialog";
import { publicBasePath, sitePath } from "./site-paths";

const games: Array<{
  href: string;
  image: string;
  title: string;
  description: string;
  meta: string;
}> = [
  {
    href: sitePath("/fang-den-stern"),
    image: `${publicBasePath}/startseite/fang-den-stern.svg`,
    title: "Fang den Stern!",
    description: "Tippe schnell auf Sterne und löse die Zahlenreihen.",
    meta: "20 Sekunden",
  },
  {
    href: sitePath("/fange-die-tiere"),
    image: `${publicBasePath}/startseite/fange-die-tiere.svg`,
    title: "Fange die Tiere",
    description: "Finde im Tierfeld immer das gesuchte Tier.",
    meta: "40 Sekunden",
  },
  {
    href: sitePath("/zwerge"),
    image: `${publicBasePath}/zwergengold-logo.png`,
    title: "Zwergengold",
    description: "Sammle Gold und lenke den Zwerg sicher durch den Tunnel.",
    meta: "Gold sammeln",
  },
  {
    href: sitePath("/schatz-merge"),
    image: `${publicBasePath}/startseite/schatz-merge.svg`,
    title: "Schatz-Merge",
    description: "Lass Schätze fallen und verbinde gleiche Gegenstände.",
    meta: "12 Schatzstufen",
  },
  {
    href: sitePath("/waren-sortieren"),
    image: `${publicBasePath}/startseite/waren-sortieren.svg`,
    title: "Waren sortieren",
    description: "Stelle drei gleiche Waren in ein Fach und räume den Laden auf.",
    meta: "12 Level",
  },
  {
    href: sitePath("/hungriges-loch"),
    image: `${publicBasePath}/startseite/hungriges-loch.svg`,
    title: "Hungriges Loch",
    description: "Verschlucke alles, werde größer und schnapp dir die Ziele.",
    meta: "10 Level",
  },
  {
    href: sitePath("/koenigreich"),
    image: `${publicBasePath}/startseite/koenigreich.svg`,
    title: "Königreich",
    description: "Tausche Edelsteine, besiege den Dunklen König und baue dein Reich auf.",
    meta: "12 Level",
  },
];

export default function Home() {
  return (
    <main className="home-shell">
      <section className="home-card" aria-labelledby="home-title">
        <p className="eyebrow">SPIELESAMMLUNG</p>
        <div className="home-title-row">
          <h1 id="home-title">Hanna&apos;s Spiele</h1>
          <small className="home-version">(v0.4.25)</small>
        </div>
        <p className="home-intro">Welches Spiel möchtest du spielen?</p>

        <div className="game-grid">
          {games.map((game) => (
            <a className="game-tile" href={game.href} key={game.href}>
              <div className="game-tile-icon" aria-hidden="true">
                <img src={game.image} alt="" width="150" height="150" />
              </div>
              <div className="game-tile-copy">
                <h2>{game.title}</h2>
                <p>{game.description}</p>
                <span>{game.meta} <b aria-hidden="true">→</b></span>
              </div>
            </a>
          ))}
        </div>

        <footer className="home-footer">
          <ReleaseNotesDialog />
        </footer>
      </section>
    </main>
  );
}
