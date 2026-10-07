import { ReleaseNotesDialog } from "./release-notes-dialog";
import { publicBasePath, sitePath } from "./site-paths";

const games: Array<{
  href: string;
  icon: string;
  iconClass: string;
  title: string;
  description: string;
  meta: string;
  image?: string;
}> = [
  {
    href: sitePath("/fang-den-stern"),
    icon: "★",
    iconClass: "home-star",
    title: "Fang den Stern!",
    description: "Tippe schnell auf Sterne und löse die Zahlenreihen.",
    meta: "20 Sekunden",
  },
  {
    href: sitePath("/fange-die-tiere"),
    icon: "🐯🐵🐨🐦",
    iconClass: "home-animals",
    title: "Fange die Tiere",
    description: "Finde im Tierfeld immer das gesuchte Tier.",
    meta: "40 Sekunden",
  },
  {
    href: sitePath("/zwerge"),
    icon: "",
    iconClass: "home-dwarf",
    image: `${publicBasePath}/zwergengold-logo.png`,
    title: "Zwergengold",
    description: "Sammle Gold und lenke den Zwerg sicher durch den Tunnel.",
    meta: "Gold sammeln",
  },
  {
    href: sitePath("/schatz-merge"),
    icon: "👑🪙💎",
    iconClass: "home-treasure",
    title: "Schatz-Merge",
    description: "Lass Schätze fallen und verbinde gleiche Gegenstände.",
    meta: "12 Schatzstufen",
  },
  {
    href: sitePath("/waren-sortieren"),
    icon: "🍎🥛🧸",
    iconClass: "home-goods",
    title: "Waren sortieren",
    description: "Stelle drei gleiche Waren in ein Fach und räume den Laden auf.",
    meta: "12 Level",
  },
  {
    href: sitePath("/hungriges-loch"),
    icon: "🍩🕳️🚗",
    iconClass: "home-hole",
    title: "Hungriges Loch",
    description: "Verschlucke alles, werde größer und schnapp dir die Ziele.",
    meta: "10 Level",
  },
];

export default function Home() {
  return (
    <main className="home-shell">
      <section className="home-card" aria-labelledby="home-title">
        <p className="eyebrow">SPIELESAMMLUNG</p>
        <div className="home-title-row">
          <h1 id="home-title">Hanna&apos;s Spiele</h1>
          <small className="home-version">(v0.4.18)</small>
        </div>
        <p className="home-intro">Welches Spiel möchtest du spielen?</p>

        <div className="game-grid">
          {games.map((game) => (
            <a className="game-tile" href={game.href} key={game.href}>
              <div className={`game-tile-icon ${game.iconClass}`} aria-hidden="true">
                {game.image ? <img src={game.image} alt="" width="150" height="150" /> : game.icon}
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
