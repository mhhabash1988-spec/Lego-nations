# LEGO NATIONS LIVE

Mobile-first HTML5 team game prototype for TikTok LIVE.

## Included
- Arabic mobile-friendly browser game with seven teams.
- Demo controls for joining teams and sending test gifts.
- Node.js WebSocket server using the unofficial tiktok-live-connector package.
- Render deployment configuration.

## Run server locally
1. Install Node.js 20 or newer.
2. Open the server directory and run npm install.
3. Run npm start.
4. Serve the repository root using a static web server.

## Hosting
Deploy the server on Render using the included render.yaml. Deploy the static website on Cloudflare Pages from the repository root. After deployment, set the frontend API base URL to the server URL; the current prototype defaults to the same origin.

## Important
TikTok LIVE integration is unofficial and may break when TikTok changes its service or the connector package. The project has not yet been deployed or live-tested. Free hosting may sleep or restart. Never add TikTok passwords, cookies, or session tokens to this repository; enter only a public username.