'use strict';
// Move names follow the linked community references in SOURCES.md.
// Damage, selection and animation behavior are this game's own rules.
const move = (name, effect, kind = 'CURSED TECHNIQUE') => ({ name, effect, kind });
const roster = {
  yuji: { id:'yuji', name:'Yuji', title:'THE VESSEL', image:'yuji.svg', color:'#ffab75', moves:[
    move('Black Flash','black-flash')
  ] },
  gojo: { id:'gojo', name:'Gojo', title:'THE HONORED ONE', image:'gojo.svg', color:'#79dcff', moves:[
    move('Hollow Purple','hollow')
  ] },
  sukuna: { id:'sukuna', name:'Sukuna', title:'KING OF CURSES', image:'sukuna.svg', color:'#ff7d93', moves:[
    move('Dismantle','slashes')
  ] },
  megumi: { id:'megumi', name:'Megumi', title:'TEN SHADOWS', image:'megumi.svg', color:'#87e9b0', moves:[
    move('Nue','lightning','SHIKIGAMI SUMMON')
  ] },
  mahoraga: { id:'mahoraga', name:'Mahoraga', title:'DIVINE GENERAL', image:'mahoraga.svg', color:'#efd48a', moves:[
    move('World Slash','world-slash','SHIKIGAMI TECHNIQUE')
  ] }
};
