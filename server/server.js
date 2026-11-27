const express = require("express");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");

const app = express();
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const clients = new Set();
const userTeams = new Map();
const battle = require("./battle");

let live = null;
let liveUsername = null;
let connected = false;

function broadcast(payload) {
  const data = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  }
}

function status(state, message, extra = {}) {
  broadcast({ type: "status", status: state, message, ...extra });
}

function normalizeUsername(value) {
  let valueText = String(value || "").trim();
  valueText = valueText
    .replace(/^https?:\/\/(www\.)?tiktok\.com\//i, "")
    .split(/[/?#]/)[0]
    .replace(/^@+/, "");
  return valueText;
}

function getUser(user) {
  const name = user?.uniqueId || user?.displayId || user?.nickname || "viewer";
  const username = String(name).replace(/^@/, "");
  return {
    username,
    key: username.toLowerCase(),
    nickname: user?.nickname || username
  };
}

function onChat(event) {
  const user = getUser(event?.user);
  const comment = String(event?.comment || "").trim();
  const match = comment.match(/^([1-7])$/);

  if (match) {
    const team = Number(match[1]);
    userTeams.set(user.key, team);
    battle.join(team);
    broadcast(battle.snapshot());
    broadcast({
      type: "join",
      username: user.username,
      nickname: user.nickname,
      team,
      comment
    });
  } else {
    broadcast({
      type: "chat",
      username: user.username,
      nickname: user.nickname,
      comment
    });
  }
}

function onGift(event) {
  const user = getUser(event?.user);

  // Combo gifts send several updates. Count only the final update so points
  // are not added repeatedly for the same streak.
  if (event?.streakable && !event?.repeatEnd) return;

  const team = userTeams.get(user.key) || null;
  const diamondCount = Math.max(0, Number(event?.diamondCount || 0));
  const repeatCount = Math.max(1, Number(event?.repeatCount || 1));
  const points = Math.min(1000000, diamondCount * repeatCount);
  if (team) battle.boost(team, points);

  broadcast({
    type: "gift",
    username: user.username,
    nickname: user.nickname,
    giftName: event?.giftName || "هدية",
    team,
    diamonds: points
  });
}

wss.on("connection", (socket) => {
  clients.add(socket);
  socket.send(JSON.stringify({
    type: "status",
    status: connected ? "connected" : "disconnected",
    message: connected ? "متصل بالبث المباشر" : "بانتظار الاتصال بالبث",
    username: liveUsername
  }));
  socket.send(JSON.stringify(battle.snapshot()));
  socket.on("close", () => clients.delete(socket));
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "lego-nations-live",
    connected,
    username: liveUsername
  });
});

app.get("/state", (_req, res) => {
  res.json({ connected, username: liveUsername, battle: battle.snapshot() });
});

app.post("/connect", async (req, res) => {
  const username = normalizeUsername(req.body?.username);

  if (!/^[a-zA-Z0-9._]{2,24}$/.test(username)) {
    return res.status(400).json({
      error: "اسم المستخدم غير صحيح. أدخل المعرّف الموجود بعد @ فقط."
    });
  }

  try {
    if (live) {
      try { live.disconnect(); } catch (_) {}
      live = null;
    }

    connected = false;
    liveUsername = username;
    userTeams.clear();
    battle.reset();
    broadcast(battle.snapshot());

    status("connecting", "جارٍ الاتصال بالبث المباشر...", { username });

    // ttl-live is built from its pinned upstream source during the Render build.
    // It signs the public LIVE WebSocket locally and does not call Euler Stream.
    const { TikTokLive } = await import(
      "./vendor/tiktok-signer/packages/tiktok-live/dist/index.js"
    );

    const connection = new TikTokLive(username, {
      fetchGifts: true,
      reconnect: { attempts: 5, initialMs: 2000, maxMs: 60000 }
    });

    connection.on("chat", onChat);
    connection.on("gift", onGift);

    connection.on("connected", (state) => {
      connected = true;
      status("connected", "تم الاتصال بالبث المباشر", {
        username,
        roomId: state?.roomId || connection.roomId || null
      });
    });

    connection.on("disconnected", (detail) => {
      connected = false;
      status("disconnected", "انقطع اتصال اللعبة بالبث أو يجري إعادة الاتصال", {
        username,
        reason: detail?.reason || ""
      });
    });

    connection.on("reconnecting", (detail) => {
      connected = false;
      status("connecting", "انقطع الاتصال مؤقتاً، جارٍ إعادة المحاولة...", {
        username,
        attempt: detail?.attempt || null
      });
    });

    connection.on("error", (error) => {
      console.error("TikTok LIVE event error:", error?.stack || error);
      broadcast({
        type: "connector-error",
        message: "حدث خطأ أثناء استقبال أحداث TikTok."
      });
    });

    live = connection;
    const state = await connection.connect();
    connected = true;

    status("connected", "تم الاتصال بالبث المباشر. اكتبوا رقم الفريق من 1 إلى 7.", {
      username,
      roomId: state?.roomId || connection.roomId || null
    });

    return res.json({
      ok: true,
      username,
      roomId: state?.roomId || connection.roomId || null
    });
  } catch (error) {
    connected = false;
    live = null;
    const detail = String(error?.message || error || "Unknown error");
    console.error("TikTok LIVE connection failed:", error?.stack || error);

    status("error", "تعذر الاتصال: " + detail, { username });

    return res.status(502).json({
      error: "تعذر الاتصال ببث TikTok: " + detail
    });
  }
});

setInterval(() => broadcast(battle.tick()), 850);

server.listen(process.env.PORT || 3000, () => {
  console.log("LEGO NATIONS LIVE server ready");
});
