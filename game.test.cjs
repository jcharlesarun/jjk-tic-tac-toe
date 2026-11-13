// Run: node game.test.cjs. Exercises actual game handlers with a DOM substitute.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const html = fs.readFileSync(`${__dirname}/index.html`, 'utf8');
function element(index) {
  const attrs = {}; let text='', inner='';
  return {dataset:{index},style:{setProperty(){}},disabled:false,hidden:false,value:'',files:[],
    get textContent(){return text},set textContent(value){text=String(value)},
    get innerHTML(){return inner},set innerHTML(value){inner=value;text=''},
    classList:{add(){},toggle(){}},setAttribute(k,v){attrs[k]=String(v)},getAttribute(k){return attrs[k]},removeAttribute(k){delete attrs[k]},
    addEventListener(event,handler){this[event]=handler},focus(){this.focused=true}
  };
}
const elements=Object.fromEntries([...html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)].map(m=>[m[1],Object.assign(element(),{hidden:/\bhidden\b/.test(m[0])})]));
const cells=Array.from({length:9},(_,i)=>element(i)), game=element(), scene=element(), events={};
const timers=new Map(); let timerId=0, reducedMotion=false, deferImages=false;
const pendingImages=[], revokedUrls=[];
const context=vm.createContext({document:{querySelectorAll:()=>cells,querySelector:s=>s==='.game'?game:scene,
  getElementById(id){assert.ok(elements[id],`Missing element ${id}`);return elements[id]},addEventListener:(e,h)=>events[e]=h},
  window:{matchMedia:()=>({matches:reducedMotion})},
  setTimeout(handler,delay){const id=++timerId;timers.set(id,{handler,delay});return id},clearTimeout:id=>timers.delete(id),
  URL:{createObjectURL:file=>file.corrupt?'blob:bad':file.url||'blob:portrait',revokeObjectURL(url){revokedUrls.push(url)}},
  Image:class{set src(value){if(deferImages)pendingImages.push(this);else value==='blob:bad'?this.onerror():this.onload()}}
});
for(const file of ['characters.js','rules.js','game.js']) vm.runInContext(fs.readFileSync(`${__dirname}/${file}`,'utf8'),context,{filename:require('node:path').join(__dirname,file)});
const roster=vm.runInContext('roster',context);
const click=id=>elements[id].click(), move=i=>cells[i].click(), play=seq=>seq.forEach(move);
const hp=p=>Number(elements[`hp-${p}`].textContent), status=()=>elements['game-status'].textContent;
function fire(delay){const entry=[...timers.entries()].find(([,t])=>t.delay===delay);assert.ok(entry,`Expected ${delay}ms timer`);timers.delete(entry[0]);entry[1].handler()}
function select(first='gojo',second='sukuna'){
  click('change-fighters'); elements['choose-x'].value=first; elements['choose-o'].value=second;
  elements['choose-x'].change(); click('start-battle');
}
assert.ok(!html.includes('id="attack-picker"'));
assert.equal(elements['character-select'].hidden,false);
assert.equal(elements['battle-content'].hidden,true);
events.keydown({key:'Escape',preventDefault(){throw Error('Inactive game must not capture keys')}});
move(0); assert.equal(cells[0].innerHTML,''); // No moves before selection.
select(); move(4); move(4); assert.equal(status(),"Sukuna's turn");
assert.equal(cells[4].getAttribute('data-player'),'Gojo');
select('yuji','yuji');assert.equal(elements['start-battle'].disabled,true);assert.equal(elements['battle-content'].hidden,true);
let matchups=0;
for(const first of Object.values(roster)) for(const second of Object.values(roster)){
  if(first.id===second.id)continue;
  assert.equal(first.moves.length,1);select(first.id,second.id);
  play([0,3,1,4,2]); // Automatically launches the winner's only move.
  assert.equal(elements['attack-overlay'].hidden,false);
  assert.equal(elements['attack-title'].textContent,first.moves[0].name);
  assert.equal(elements['attacker-image'].src,first.image);assert.equal(elements['defender-image'].src,second.image);
  assert.ok(status().includes('is preparing'));assert.equal(hp('o'),5);
  assert.ok(cells.every(cell=>cell.disabled)); assert.equal(game.inert,true);
  move(8);click('new-round');assert.equal(elements['round-number'].textContent,'01');
  fire(1700);assert.equal(hp('o'),4);assert.equal(hp('x'),5);
  click('skip-animation');click('skip-animation');assert.equal(hp('o'),4);assert.equal(timers.size,0);
  click('new-round');assert.equal(status(),`${second.name}'s turn`);
  // Second player wins the next round and attacks from the left of the animation.
  play([0,3,1,4,2]);assert.equal(elements['attack-title'].textContent,second.moves[0].name);
  assert.equal(elements['attacker-image'].src,second.image);
  click('skip-animation');assert.equal(hp('x'),4);assert.equal(hp('o'),4);matchups++;
}
// All winning lines for either side.
const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
let winCases=0;
for(const line of lines){
  const others=Array.from({length:9},(_,i)=>i).filter(i=>!line.includes(i));
  select();play([line[0],others[0],line[1],others[1],line[2]]);click('skip-animation');assert.equal(hp('o'),4);winCases++;
  let opponent;
  outer:for(const a of others)for(const b of others)for(const c of others){
    if(new Set([a,b,c]).size===3&&!lines.some(l=>l.every(p=>[a,b,c].includes(p)))){opponent=[a,b,c];break outer}
  }
  select();play([opponent[0],line[0],opponent[1],line[1],opponent[2],line[2]]);click('skip-animation');assert.equal(hp('x'),4);winCases++;
}
// Every fighter can win a battle, with health reaching zero precisely on hit 5.
for(const fighter of Object.values(roster)){
  select(fighter.id,fighter.id==='gojo'?'sukuna':'gojo');
  for(let round=1;round<=5;round++){
    play(round%2?[0,3,1,4,2]:[3,0,4,1,8,2]);
    assert.equal(hp('o'),6-round);fire(1700);assert.equal(hp('o'),5-round);
    click('skip-animation');if(round<5)click('new-round');
  }
  assert.equal(status(),`${fighter.name} wins the battle!`);assert.equal(elements['new-round'].textContent,'New battle');
  move(8);assert.equal(hp('o'),0);click('new-round');assert.equal(hp('o'),5);assert.equal(hp('x'),5);
}
select();play([0,1,2,4,3,5,7,6,8]);assert.equal(status(),'Draw! No damage dealt.');
assert.equal(hp('x'),5);assert.equal(hp('o'),5);assert.equal(timers.size,0);assert.equal(elements['attack-overlay'].hidden,true);
click('new-round');assert.equal(status(),"Sukuna's turn");
select();play([0,3,1,4,2]);click('reset-match');assert.equal(timers.size,0);assert.equal(hp('o'),5);
assert.equal(game.inert,false);assert.equal(elements['attack-overlay'].hidden,true);
play([0,3,1,4,2]);events.keydown({key:'Escape',preventDefault(){}});assert.equal(hp('o'),4);assert.equal(timers.size,0);
select();play([0,3,1,4,2]);fire(3800);assert.equal(hp('o'),4);assert.equal(elements['attack-overlay'].hidden,true);assert.equal(timers.size,0);
reducedMotion=true;select('megumi','yuji');play([0,3,1,4,2]);assert.equal(hp('o'),4);assert.equal(timers.size,1);fire(1500);reducedMotion=false;
// Portrait validation and use still work.
select();click('change-fighters');elements['portrait-x'].files=[{type:'text/html',size:1}];elements['portrait-x'].change();
assert.ok(elements['upload-status-x'].textContent.includes('Choose a PNG'));
elements['portrait-x'].files=[{type:'image/png',size:100,corrupt:true}];elements['portrait-x'].change();
assert.ok(elements['upload-status-x'].textContent.includes('could not be opened'));
elements['portrait-x'].files=[{type:'image/png',size:100}];elements['portrait-x'].change();click('start-battle');
play([0,3,1,4,2]);assert.equal(elements['attacker-image'].src,'blob:portrait');assert.ok(cells[0].innerHTML.includes('blob:portrait'));
click('skip-animation');click('change-fighters');click('restore-x');assert.equal(elements['preview-x'].src,'gojo.svg');
// Boundary sizes, cancelling the file picker, and portrait replacement.
elements['portrait-x'].files=[];elements['portrait-x'].change();
elements['portrait-x'].files=[{type:'image/png',size:5*1024*1024+1}];elements['portrait-x'].change();
assert.ok(elements['upload-status-x'].textContent.includes('under 5 MB'));
elements['portrait-x'].files=[{type:'image/png',size:5*1024*1024,url:'blob:limit'}];elements['portrait-x'].change();
assert.equal(elements['preview-x'].src,'blob:limit');
elements['portrait-x'].files=[{type:'image/jpeg',size:100,url:'blob:replacement'}];elements['portrait-x'].change();
assert.ok(revokedUrls.includes('blob:limit'));assert.equal(elements['preview-x'].src,'blob:replacement');
click('restore-x');click('restore-x');assert.equal(elements['preview-x'].src,'gojo.svg');
// Async races: starting waits for image decoding; changing fighters discards stale results.
deferImages=true;
elements['portrait-x'].files=[{type:'image/webp',size:100,url:'blob:stale'}];elements['portrait-x'].change();
assert.equal(elements['start-battle'].disabled,true);click('start-battle');assert.equal(elements['battle-content'].hidden,true);
elements['choose-x'].value='yuji';elements['choose-x'].change();pendingImages.shift().onload();
assert.equal(elements['preview-x'].src,'yuji.svg');assert.ok(revokedUrls.includes('blob:stale'));
elements['portrait-o'].files=[{type:'image/png',size:100,url:'blob:wait'}];elements['portrait-o'].change();
click('start-battle');assert.equal(elements['battle-content'].hidden,true);
pendingImages.shift().onload();assert.equal(elements['start-battle'].disabled,false);
// A stale failure must not overwrite a newer upload's loading message.
elements['portrait-x'].files=[{type:'image/png',size:100,url:'blob:old-error'}];elements['portrait-x'].change();
elements['portrait-x'].files=[{type:'image/png',size:100,url:'blob:latest'}];elements['portrait-x'].change();
pendingImages.shift().onerror();assert.equal(elements['upload-status-x'].textContent,'Loading portrait...');
pendingImages.shift().onload();assert.equal(elements['preview-x'].src,'blob:latest');
deferImages=false;
// Invalid selections never start a battle.
elements['choose-x'].value='missing';elements['choose-x'].change();click('start-battle');
assert.equal(elements['battle-content'].hidden,true);assert.equal(elements['start-battle'].disabled,true);
elements['choose-x'].value='gojo';elements['choose-o'].value='missing';elements['choose-o'].change();click('start-battle');
assert.equal(elements['battle-content'].hidden,true);
// Keyboard focus stays on Continue during the attack and returns afterward.
select();play([0,3,1,4,2]);let prevented=false;
events.keydown({key:'Tab',preventDefault(){prevented=true}});
assert.equal(prevented,true);assert.equal(elements['skip-animation'].focused,true);
events.keydown({key:'a',preventDefault(){throw Error('Unrelated keys must not be captured')}});
click('skip-animation');assert.equal(elements['new-round'].focused,true);
for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g))fs.readFileSync(`${__dirname}/${m[1]}`);
for(const fighter of Object.values(roster))fs.readFileSync(`${__dirname}/${fighter.image}`);
console.log(`PASS: ${matchups} matchups, ${winCases} win patterns, 5 automatic signature attacks, all fighters' five-hit victories, impact timing, skip/Escape/reset, draws, reduced motion, portraits and local assets. DOM-substitute checks only.`);
