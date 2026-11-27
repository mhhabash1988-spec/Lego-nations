# LEGO NATIONS LIVE

Mobile-first HTML5 team game connected to a public TikTok LIVE stream through a Node.js backend.

## Live game behavior
- Enter the public username of the broadcaster who is currently LIVE.
- Viewers join one of seven teams by commenting with the exact team number (1–7).
- Gifts award the sender's selected team and player points based on the gift's diamond value.
- Gift streaks are counted once, at the final streak update.
- Gift senders who have not selected a team are not assigned automatically.
- No manual join or test-gift controls are included.

## Teams
1. Palestine
2. Israel
3. Jordan
4. Saudi Arabia
5. Syria
6. Egypt
7. UAE

## Run
Requires Node.js 20 or newer.
```sh
cd server
npm install
npm start
```

## Render
Root directory: `server`  
Build command: `npm install`  
Start command: `npm start`  
Health check: `/health`

## TikTok integration
The project uses the unofficial `tiktok-live-connector` package. It connects to a public LIVE stream using the broadcaster's username; it does not use TikTok passwords, cookies, or login tokens. TikTok can change its internal protocol without notice. A successful deployment does not prove that TikTok events are arriving; the integration must be tested against an active LIVE stream.

Never add passwords, cookies, session tokens, or other account credentials to this repository.
