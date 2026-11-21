# Spotify clone

A static music library built with HTML, CSS and JavaScript. Play the two recordings included in the project or browse the original cover artwork. The player loads its scripts, styles, images and audio from the checkout.

## Open the player

Open the root entry in a browser. The original player URL also works directly. [Root entry](index.html) · [Original player](Spotify/index.html)

To serve the project locally, run this command from the repository root.

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Then open the local library. Shelf links such as `#discover-song` also work from the root. [Open the local player](http://127.0.0.1:8000/)

## Library

| Artist | Recording | Genre |
| --- | --- | --- |
| Chime | Win & Lose | Melodic dubstep |
| Hush | Models | Dubstep |

The three artwork shelves contain 21 distinct bundled images. *Mere Naam Tu* appears in two original collections, giving 22 cover placements. Entries marked **Artwork only** open a full-cover preview. Playback continues while searching or viewing artwork.

## Playback and search

Choose a release to start it. Its button and the player’s main button both pause and resume the current recording. Previous and Next wrap through the two releases and preserve the current play or pause state. Natural playback advances from Chime to Hush and stops at the end of *Models*.

Drag the timeline to seek or use the volume slider to change level. Mute restores the previous audible level when toggled again. With JavaScript disabled, each recording has native browser audio controls.

| Key | Action |
| --- | --- |
| Space | Play or pause. A focused button keeps its native action. |
| Left or right arrow | Seek backward or forward five seconds. |
| M | Mute or unmute. |
| / | Focus library search. |
| Escape | Clear the search field or close an artwork preview. |

Search accepts words from titles, performers and genres in any order. Text inputs and sliders keep their normal keyboard behavior.

## Tests

With Node.js 20 or later, run the catalogue and case-sensitive asset checks from the repository root.

```sh
npm test
```

For the browser suite, install the test dependency and run it with a locally installed Chrome. Set `CHROME_PATH` to a compatible executable if Chrome is installed in a custom location.

```sh
npm ci
npm run test:browser
```

The browser tests serve the checkout under a project subdirectory and exercise real MP3 playback, both entry URLs, keyboard and touch-width controls, artwork previews, and playback recovery.

Original project by **Aditya Pratap Vishwakarma** with **#teamDigiCoders**.
