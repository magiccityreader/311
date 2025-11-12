# Birmingham 311 Map

This repository contains a ready-to-publish snapshot of the Magic City Reader 311 web application currently live at [https://admin.mcr.pub/311](https://admin.mcr.pub/311). All static assets (HTML, CSS, JavaScript, images, and web fonts) are committed at the repository root for easy archival or redeployment on GitHub or any other static hosting platform.

## Project structure
- `index.html`: Production markup from the live site with relative paths that work when the repository root is served as the web root (or a GitHub Pages site).
- `css/`, `js/`, `images/`, `fonts/`: Exact stylesheets, JavaScript bundles, social preview images, Leaflet assets, and Helvetica Now font files used in production.
- `favicon.ico`: Site icon from the live deployment.

## Running the static site locally
The front-end makes live XHR requests to `/api/...` endpoints, so the files must be served over HTTP(S) from the same origin that also provides the API.

1. From the repository root run one of:
   - `python3 -m http.server 8000`
   - `npx serve .`
2. Visit `http://localhost:8000/` (or whichever port you selected).
3. Ensure the backend 311 API is reachable at `http://localhost:8000/api/…`. You can do this by:
   - Running the API on the same host and configuring it to listen on the same origin.
   - Using a reverse proxy (nginx, Caddy, etc.) to forward `/api` requests to the production API at `https://admin.mcr.pub` or your own clone.

Without an API responding to these endpoints, the maps, heatmaps, and analytics panels will display loading errors.

## Deploying to GitHub Pages or another static host
1. Commit these files to the branch or `docs/` directory backed by your static host.
2. Configure hosting so that requests to `/api/*` are proxied to the live or self-hosted 311 API.
3. Push the changes—GitHub Pages (or your host) will serve the static files automatically once enabled.

## Updating the snapshot
1. Mirror the live site again (e.g. `wget --mirror --page-requisites --no-parent https://admin.mcr.pub/311/`).
2. Copy the updated assets into this repository, keeping file names consistent.
3. Re-check that all local references remain relative (no absolute paths pointing back to `admin.mcr.pub`).

## Notes on licensing
- The JavaScript and CSS were obtained from the public production site; confirm that redistribution aligns with Magic City Reader’s policies before publishing.
- The bundle includes Helvetica Now web fonts as used in production. These fonts may be subject to licensing restrictions; ensure you have the right to redistribute them before making the repository public.
- Leaflet assets are distributed under the BSD 2-Clause License; see the Leaflet project for details.
