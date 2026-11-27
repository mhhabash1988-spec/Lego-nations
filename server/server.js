const express=require("express");
const path=require("path");
const http=require("http");
const WebSocket=require("ws");
const {TikTokLiveConnection}=require("tiktok-live-connector");
const app=express();
app.use(express.json({limit:"20kb"}));
app.use(express.static(path.join(__dirname,"public")));
const server=http.createServer(app);
const wss=new WebSocket.Server({server});
const clients=new Set(),userTeams=new Map();
let live=null,liveUsername=null,connected=false;
function broadcast(payload){const data=JSON.stringify(payload);for(const c of clients)if(c.readyState===WebSocket.OPEN)c.send(data)}
function status(state,message,extra={}){broadcast({type:"status",status:state,message,...extra})}
function normalizeUsername(value){let s=String(value||"").trim();s=s.replace(/^https?:\/\/(www\.)?tiktok\.com\//i,"").split(/[/?#]/)[0].replace(/^@+/,"");return s}
function getUser(e){const u=e?.user||{};const name=u.uniqueId||u.displayId||u.nickname||"viewer";return{username:String(name).replace(/^@/,""),key:String(name).replace(/^@/,"").toLowerCase(),nickname:u.nickname||name}}
function onChat(e){const u=getUser(e),comment=String(e?.comment??e?.content??"").trim(),m=comment.match(/^([1-7])$/);if(m){const team=Number(m[1]);userTeams.set(u.key,team);broadcast({type:"join",username:u.username,nickname:u.nickname,team,comment})}else broadcast({type:"chat",username:u.username,nickname:u.nickname,comment})}
function onGift(e){const u=getUser(e),giftType=e?.giftDetails?.giftType??e?.gift?.type??e?.giftType,repeatEnd=e?.repeatEnd;if((giftType===1||giftType==="1")&&!(repeatEnd===1||repeatEnd===true))return;const team=userTeams.get(u.key)||null;const diamonds=Number(e?.giftDetails?.diamondCount??e?.gift?.diamondCount??e?.diamondCount??0),count=Math.max(1,Number(e?.repeatCount||1)),points=Math.max(0,Math.min(1000000,diamonds*count));broadcast({type:"gift",username:u.username,nickname:u.nickname,giftName:e?.giftDetails?.giftName||e?.giftName||"هدية",team,diamonds:points})}
wss.on("connection",ws=>{clients.add(ws);ws.send(JSON.stringify({type:"status",status:connected?"connected":"disconnected",message:connected?"متصل بالبث المباشر":"بانتظار الاتصال بالبث",username:liveUsername}));ws.on("close",()=>clients.delete(ws))});
app.get("/health",(_q,r)=>r.json({ok:true,service:"lego-nations-live",connected,username:liveUsername}));
app.get("/state",(_q,r)=>r.json({connected,username:liveUsername}));
app.post("/connect",async(req,res)=>{const username=normalizeUsername(req.body?.username);if(!/^[a-zA-Z0-9._]{2,24}$/.test(username))return res.status(400).json({error:"اسم المستخدم غير صحيح. أدخل المعرّف الموجود بعد @ فقط."});try{if(live){try{await live.disconnect()}catch(_){}live=null}connected=false;liveUsername=username;userTeams.clear();status("connecting","جارٍ العثور على البث المباشر...",{username});const connection=new TikTokLiveConnection(username,{enableExtendedGiftInfo:true});connection.on("chat",onChat);connection.on("gift",onGift);connection.on("connected",s=>{connected=true;status("connected","تم الاتصال بالبث المباشر",{username,roomId:s?.roomId||null})});connection.on("disconnected",d=>{connected=false;status("disconnected","انقطع الاتصال بالبث المباشر",{username,reason:d?.reason||""})});connection.on("error",e=>{console.error("TikTok connector error:",e?.info||e,e?.exception||"");broadcast({type:"connector-error",message:"حدث خطأ أثناء استقبال أحداث TikTok."})});live=connection;const state=await connection.connect();connected=true;status("connected","تم الاتصال بالبث المباشر. اكتبوا رقم الفريق من 1 إلى 7.",{username,roomId:state?.roomId||null});return res.json({ok:true,username,roomId:state?.roomId||null})}catch(e){connected=false;live=null;console.error("TikTok LIVE connection failed:",e);status("error","تعذر الاتصال. تأكد أن الحساب يبث الآن وأن اسم المستخدم صحيح.",{username});return res.status(502).json({error:"تعذر الاتصال ببث TikTok. يجب أن يكون الحساب في بث مباشر فعلياً."})}});
server.listen(process.env.PORT||3000,()=>console.log("LEGO NATIONS LIVE server ready"));
