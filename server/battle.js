const TEAMS = [
  { id: 1, name: "فلسطين", flag: "🇵🇸", color: "#23c98b" },
  { id: 2, name: "إسرائيل", flag: "🇮🇱", color: "#659cff" },
  { id: 3, name: "الأردن", flag: "🇯🇴", color: "#ff6969" },
  { id: 4, name: "السعودية", flag: "🇸🇦", color: "#91d35e" },
  { id: 5, name: "سوريا", flag: "🇸🇾", color: "#ffc45e" },
  { id: 6, name: "مصر", flag: "🇪🇬", color: "#ff9365" },
  { id: 7, name: "الإمارات", flag: "🇦🇪", color: "#bd91ff" }
];

const bases = [[0,-5],[4,-3],[5,2],[1,5],[-4,4],[-5,-1],[0,0]];
const key = (q,r) => q + "," + r;
const cells = [];
const cellMap = new Map();
const directions = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
const ammo = Array(8).fill(0);\nconst active = new Set();
let tickNo = 0;

function reset() {
  cells.length = 0;
  cellMap.clear();
  for (let q=-5;q<=5;q++) for(let r=-5;r<=5;r++) {
    if (Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r)) <= 5) {
      const cell={q,r,owner:0,hp:0,base:false};
      cells.push(cell); cellMap.set(key(q,r),cell);
    }
  }
  bases.forEach(([q,r],i)=>{
    const c=cellMap.get(key(q,r));
    c.owner=i+1;c.hp=5;c.base=true;
  });
  ammo.fill(0);active.clear();tickNo=0;
}
function neighbors(c) {
  return directions.map(([dq,dr])=>cellMap.get(key(c.q+dq,c.r+dr))).filter(Boolean);
}
function counts() {
  const out=Array(8).fill(0);
  for(const c of cells) if(c.owner) out[c.owner]++;
  return out;
}
function boost(team, amount) {
  if(team>=1 && team<=7) { active.add(team); ammo[team]+=Math.max(1,Math.min(20,Math.ceil(amount/5))); }
}
function join(team) {
  if(team<1 || team>7) return;
  // Joining chooses a nation; it does not reset an established battle.
  ammo[team]+=1;
}
function tick() {
  tickNo++;
  const shots=[];
  for(let team=1;team<=7;team++) {
    if(tickNo%2!==0 && ammo[team]<=0) continue;
    const owned=cells.filter(c=>c.owner===team);
    if(!owned.length) continue;
    const frontier=owned.map(c=>({c,targets:neighbors(c).filter(n=>n.owner!==team)})).filter(x=>x.targets.length);
    if(!frontier.length) continue;
    const source=frontier[Math.floor(Math.random()*frontier.length)];
    const target=source.targets[Math.floor(Math.random()*source.targets.length)];
    if(ammo[team]>0) ammo[team]--;
    // A successful hit claims neutral land; enemy land needs repeated hits.
    if(target.owner===0){target.owner=team;target.hp=1;}
    else if(target.base){target.hp=Math.max(1,target.hp-1);if(target.hp===1 && target.owner!==team){target.owner=team;target.base=false;}}
    else {target.owner=team;target.hp=1;}
    shots.push({team,from:{q:source.c.q,r:source.c.r},to:{q:target.q,r:target.r}});
  }
  return {type:"battle-tick",tick:tickNo,cells:cells.map(c=>({q:c.q,r:c.r,owner:c.owner,base:c.base,hp:c.hp})),counts:counts(),shots};
}
function snapshot() {
  return {type:"battle-state",tick:tickNo,cells:cells.map(c=>({q:c.q,r:c.r,owner:c.owner,base:c.base,hp:c.hp})),counts:counts(),teams:TEAMS};
}
reset();
module.exports={TEAMS,reset,join,boost,tick,snapshot};
