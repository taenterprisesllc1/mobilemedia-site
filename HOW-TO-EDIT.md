# How to update the Mobile Media website

## The easy way: the online editor

Go to **mobilemedia.pro/admin**, log in with GitHub, and pick a section:

| Section | What's in it |
|---|---|
| **Page Backgrounds** | The drone clip behind each of the 7 pages, its location label, sun glow and color |
| **Films (video portfolio)** | Add a film by pasting a YouTube/Vimeo link or uploading a video |
| **Photo Gallery** | Upload photos, choose a category and add a caption |
| **Services & Prices** | Service names, descriptions, starting prices and icons |
| **Home Page** | Headline, tagline and button text |
| **About** | Story, photo, years flying, certifications, gear and team |
| **Reviews** | Client quotes |
| **Contact Page** | Intro text and the "Service Type" choices |
| **Business Info & Social Links** | Phone, email, service area, logo and social links |
| **Filter Categories** | The filter buttons on Films and Gallery |
| **Search Engine (Google) Text** | The title and description Google shows |

To use it:

1. Make your changes, then click **Publish → Publish now**.
2. The live site updates in about a minute.
3. Refresh to see the change.

Lists, such as films, photos, services and reviews, have **Add** buttons. You can drag items to reorder them, and the first film is the big featured one.

---

## File-size tips

Uploads go to your GitHub storage, so keep files reasonably small:

| What | Best format |
|---|---|
| **Background videos** | MP4, 1080p, 10–30 seconds, ideally under 15 MB, no sound needed |
| **Films** | For long or large films, **upload to YouTube or Vimeo and paste the link** (best quality, no size limits). Upload an MP4 only for short clips under ~25 MB. |
| **Photos** | JPG, about 2000 px on the long side, under ~1 MB |
| **Team headshots** | About 400×400 px |

Free tools for shrinking files:

- **HandBrake** for videos. The "Fast 1080p30" preset works well.
- **Squoosh.app** for photos.

---

## Editing the files directly (optional)

All content lives in the **`content/`** folder as simple files: `films.json`, `gallery.json`, `backgrounds.json` and so on. You can also edit them on GitHub with the ✏️ pencil.

Two rules keep them valid:

- Keep the quotes and commas exactly as they are.
- No comma after the last item in a list.

Uploaded media is stored in `assets/`:

- `assets/videos/backgrounds/`
- `assets/videos/films/`
- `assets/photos/`
- `assets/images/team/`

---

## If something looks wrong

- **A photo doesn't show:** the file path is wrong, or the file wasn't uploaded. Re-pick it in the editor.
- **A page is blank or broken after a direct file edit:** usually a missing comma or quote in a `content/*.json` file. Open the file on GitHub, use **History**, and restore the previous version.
- **A change doesn't appear:** wait a minute, then hard-refresh with Cmd+Shift+R on Mac or Ctrl+Shift+R on Windows.

## Drone lighting

If you swap a background for very different footage (for example, sunny to night), the 3D drone's lighting for that page is set in `world.js` (the `PAGES` list). It still looks fine without changes, but it can be re-matched for a perfect blend.
