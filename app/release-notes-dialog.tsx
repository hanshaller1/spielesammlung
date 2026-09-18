"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { releaseNotes } from "./release-notes";

export function ReleaseNotesDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="release-notes-link" type="button">
          Release Notes
        </button>
      </DialogTrigger>
      <DialogContent className="release-notes-dialog">
        <DialogHeader>
          <DialogTitle className="release-notes-title">Release Notes</DialogTitle>
          <DialogDescription className="release-notes-description">
            Was sich in Hanna&apos;s Spiele verändert hat.
          </DialogDescription>
        </DialogHeader>

        <div className="release-notes-list">
          {releaseNotes.map((release) => (
            <article className="release-note" key={release.version}>
              <div className="release-note-heading">
                <h2>Version {release.version}</h2>
                <time>{release.date}</time>
              </div>
              <h3>{release.title}</h3>
              <ul>
                {release.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
              <details className="release-commits">
                <summary>{release.commits.length} {release.commits.length === 1 ? "Commit" : "Commits"} anzeigen</summary>
                <ul>
                  {release.commits.map((commit) => (
                    <li key={commit.id}>
                      <code>{commit.id}</code>
                      <span>{commit.description}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </article>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
