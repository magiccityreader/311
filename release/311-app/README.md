# Birmingham 311 Map (Static Package)

This directory contains a ready-to-publish snapshot of the Magic City Reader 311 web application currently live at [https://admin.mcr.pub/311](https://admin.mcr.pub/311). All static assets (HTML, CSS, JavaScript, images, and web fonts) are included for archival or redeployment on GitHub or any other static hosting platform.

## What is included
- `index.html`: the production markup from the live site with relative paths that work when the folder is served as the web root or from a GitHub Pages site.
- `css/`, `js/`, `images/`, `fonts/`: the exact stylesheets, JavaScript bundles, social preview images, Leaflet assets, and Helvetica Now font files used in production.
- `favicon.ico`: site icon used by the live deployment.

## Running the static site locally
Because the application makes live XHR requests to `/api/...` endpoints, you must serve the files over HTTP(S) from the same origin that also provides the API.

1. **Static file server** – from this directory run one of:
   - `python3 -m http.server 8000`
   - `npx serve .`
2. Visit `http://localhost:8000/` (or whatever port you selected).
3. Ensure the backend 311 API is reachable at `http://localhost:8000/api/…`. You can achieve this by:
   - Running the API on the same host and configuring it to listen on the same origin.
   - Using a reverse proxy (nginx, Caddy, etc.) to forward `/api` requests to the production API at `https://admin.mcr.pub` or your own clone.

Without an API responding to these endpoints, the maps, heatmaps, and analytics panels will display loading errors.

## Deploying to GitHub Pages or another static host
1. Move the contents of this folder (`index.html`, `css`, `js`, `images`, `fonts`, `favicon.ico`, `README.md`) into the root of your repository (or the `docs/` folder if you prefer the GitHub Pages `docs` workflow).
2. Configure your hosting environment so that requests to `/api/*` are proxied to the live or self-hosted 311 API.
3. Commit and push the code. GitHub Pages will serve the static files automatically once enabled.

## Updating the snapshot
To refresh the package in the future:
1. Mirror the live site again (e.g. using `wget --mirror --page-requisites --no-parent https://admin.mcr.pub/311/`).
2. Copy the updated assets into this directory, ensuring file names remain consistent.
3. Re-verify that all local references remain relative (no absolute paths pointing back to `admin.mcr.pub`).

## Notes on licensing
- The JavaScript and CSS were obtained from the public production site; confirm that redistribution aligns with Magic City Reader’s policies before publishing.
- The bundle includes Helvetica Now web fonts as used in production. These fonts may be subject to licensing restrictions; ensure you have the right to redistribute them before making the repository public.
- Leaflet assets are distributed under the BSD 2-Clause License; see the Leaflet project for details.

