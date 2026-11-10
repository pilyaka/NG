(function(){
'use strict';

/* ================= утилиты ================= */
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch(e){return null;}}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function uid(){return Math.random().toString(36).slice(2,10);}
function clone(o){return JSON.parse(JSON.stringify(o));}
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function rub(n){return new Intl.NumberFormat('ru-RU').format(Math.round(n))+' ₽';}
function b64e(s){return btoa(unescape(encodeURIComponent(s)));}
function b64d(s){return decodeURIComponent(escape(atob(s.replace(/\s/g,''))));}
function safeUrl(u){u=String(u||'').trim();return /^https?:\/\/[^\s"'<>]+$/i.test(u)?u:'';}
function cap(s){s=String(s||'');return s.charAt(0).toUpperCase()+s.slice(1);}

/* ================= числа и единицы ================= */
var FRAC={'½':.5,'¼':.25,'¾':.75,'⅓':1/3,'⅔':2/3};
var NUMRE=/(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?(?:\s*[-–—]\s*\d+(?:[.,]\d+)?)?|[½¼¾⅓⅔])/;
function toNum(s){
  s=String(s==null?'':s).trim();if(!s)return null;
  if(FRAC[s]!=null)return FRAC[s];
  var m;
  if((m=s.match(/^(\d+)\s+(\d+)\/(\d+)$/)))return +m[1]+m[2]/m[3];
  if((m=s.match(/^(\d+)\/(\d+)$/)))return m[2]>0?m[1]/m[2]:null;
  if((m=s.match(/^(\d+(?:[.,]\d+)?)\s*[-–—]\s*(\d+(?:[.,]\d+)?)$/)))return Math.max(parseFloat(m[1].replace(',','.')),parseFloat(m[2].replace(',','.')));
  var n=parseFloat(s.replace(/\s/g,'').replace(',','.'));
  return isFinite(n)?n:null;
}
var NB='(?![а-яёa-z])';
var UNITS=[
  [new RegExp('^(кг|килограмм[а-яё]*)'+NB+'\\.?'),'кг'],
  [new RegExp('^(г|гр|грамм[а-яё]*)'+NB+'\\.?'),'г'],
  [new RegExp('^(мл|миллилитр[а-яё]*)'+NB+'\\.?'),'мл'],
  [new RegExp('^(л|литр[а-яё]*)'+NB+'\\.?'),'л'],
  [new RegExp('^(шт|штук[а-яё]*|штуки)'+NB+'\\.?'),'шт'],
  [/^(ст\.?\s?л\.?|столов[а-яё]*\s+лож[а-яё]*)/,'ст. л.'],
  [/^(ч\.?\s?л\.?|чайн[а-яё]*\s+лож[а-яё]*)/,'ч. л.'],
  [/^стакан[а-яё]*/,'стакан'],
  [/^зубч[а-яё]*/,'зубчик'],
  [/^(пуч[а-яё]*)/,'пучок'],
  [/^бан[а-яё]*/,'банка'],
  [new RegExp('^(уп|упак[а-яё]*)'+NB+'\\.?'),'уп.'],
  [/^пач[а-яё]*/,'пачка'],
  [/^бутыл[а-яё]*/,'бутылка'],
  [/^щеп[а-яё]*/,'щепотка'],
  [/^дол[ье][а-яё]*/,'долька'],
  [/^веточ[а-яё]*/,'веточка'],
  [/^лист[а-яё]*/,'лист'],
  [/^кус[а-яё]*/,'кусок'],
  [/^ломт[а-яё]*/,'ломтик'],
  [/^голов[а-яё]*/,'головка'],
  [/^палоч[а-яё]*/,'палочка'],
  [/^горст[а-яё]*/,'горсть']
];
var PACKISH={'банка':1,'уп.':1,'пачка':1,'бутылка':1};
function matchUnit(str){
  var s=String(str||'').toLowerCase();
  for(var i=0;i<UNITS.length;i++){var m=s.match(UNITS[i][0]);if(m)return{u:UNITS[i][1],len:m[0].length};}
  return null;
}
function normU(u){u=String(u||'').trim();if(!u)return '';var m=matchUnit(u);return m&&m.len>=u.replace(/\.$/,'').length-1?m.u:u.toLowerCase();}
function base(q,u){u=normU(u);if(u==='кг')return{q:q*1000,u:'г'};if(u==='л')return{q:q*1000,u:'мл'};return{q:q,u:u};}
function fnum(n){if(n==null||!isFinite(n))return '';var r=n>=100?Math.round(n):n>=10?Math.round(n*10)/10:Math.round(n*100)/100;return String(r).replace('.',',');}
function fq(q,u){
  if(q==null)return u||'';
  if(u==='г'&&q>=1000)return fnum(q/1000)+' кг';
  if(u==='мл'&&q>=1000)return fnum(q/1000)+' л';
  return fnum(q)+(u?' '+u:'');
}
function cleanName(s){
  s=String(s||'').replace(/\(\s*\)/g,'').replace(/\s{2,}/g,' ');
  s=s.replace(/^[\s,:;—–\-.·]+/,'').replace(/[\s,:;—–\-.·(]+$/,'').trim();
  return cap(s);
}
function firstNum(s){var re=new RegExp(NUMRE.source,'g'),m;while((m=re.exec(s))){if(!/^\s*%/.test(s.slice(m.index+m[0].length)))return m;}return null;}
function parseIng(line){
  var s=String(line||'').replace(/ /g,' ').replace(/^[•\-*–—·▪●✓✔]+\s*/,'').replace(/\s+/g,' ').trim();
  var low=s.toLowerCase();
  var taste=/(по вкусу|для подачи|по желанию|для жарки|для смазывания|для украшения)/.exec(low);
  var m=firstNum(s);
  if(!m){
    var nm=taste?s.slice(0,taste.index)+' '+s.slice(taste.index+taste[0].length):s;
    return {q:null,u:taste?'по вкусу':'',name:cleanName(nm)};
  }
  var q=toNum(m[0]),before=s.slice(0,m.index),after=s.slice(m.index+m[0].length).replace(/^\s+/,'');
  var u='',um=matchUnit(after);
  if(um){u=um.u;after=after.slice(um.len);}
  var name=cleanName(before+' '+after);
  var guessed=!u;if(!u)u='шт';
  return {q:q,u:u,name:name,guessed:guessed};
}
function parsePack(text){
  var t=String(text||'').trim();if(!t)return null;
  var m=NUMRE.exec(t);
  if(!m){var u0=matchUnit(t);return u0?{packQ:1,packU:u0.u,packLabel:t}:null;}
  var q=toNum(m[0]),after=t.slice(m.index+m[0].length).trim(),um=matchUnit(after);
  return {packQ:q,packU:um?um.u:'шт',packLabel:t};
}
function parseTime(iso){
  var m=String(iso||'').match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/);
  if(!m)return '';var mins=(+(m[1]||0))*1440+(+(m[2]||0))*60+(+(m[3]||0));
  if(!mins)return '';var h=Math.floor(mins/60),mm=mins%60;
  return (h?h+' ч':'')+(h&&mm?' ':'')+(mm?mm+' мин':'');
}
function parseText(t){
  var lines=String(t||'').split(/\r?\n/).map(function(s){return s.replace(/ /g,' ').trim();}).filter(Boolean);
  var res={name:'',servings:null,time:'',ings:[],steps:[]},mode='auto';
  lines.forEach(function(l){
    var low=l.toLowerCase();
    if(/^(ингредиенты|состав|продукты|вам понадобится|понадобится)/.test(low)&&l.length<45){mode='ing';var sv0=low.match(/(\d+)\s*(порц|персон|чел)/);if(sv0&&!res.servings)res.servings=+sv0[1];return;}
    if(/^(приготовление|способ приготовления|как готовить|как приготовить|шаги|пошаговый рецепт|инструкция)/.test(low)&&l.length<50){mode='step';return;}
    var sv=low.match(/(\d+)\s*(порц|персон|чел)/);
    if(sv){if(!res.servings)res.servings=+sv[1];if(!res.ings.length&&mode!=='step'){var nm=l.replace(/[,(—–-]*\s*(на\s*)?\d+\s*(порц|персон|чел)[а-яё.]*\)?/i,'').trim();if(nm&&!res.name)res.name=cleanName(nm);}return;}
    var tm=low.match(/^(время( приготовления)?|готовить)\s*:?\s*(.+)$/);if(tm&&l.length<50){res.time=tm[3];return;}
    if(mode==='step'){res.steps.push(l.replace(/^(шаг\s*)?\d+[.)]?\s+/i,''));return;}
    if(/:$/.test(l)&&!/\d/.test(l)&&l.length<40)return;
    if((/^(шаг\s*)?\d+[.)]\s+\S/i.test(l)&&l.length>30)||l.length>90){res.steps.push(l.replace(/^(шаг\s*)?\d+[.)]\s+/i,''));return;}
    var ing=parseIng(l);
    if(ing.q!=null&&ing.guessed&&(l.length>35||TIMER_RE.test(l))){res.steps.push(l);return;}
    delete ing.guessed;
    if(ing.q!=null||ing.u==='по вкусу'||mode==='ing'){if(ing.name)res.ings.push(ing);return;}
    if(!res.name&&!res.ings.length){res.name=cleanName(l);return;}
    if(l.length>40)res.steps.push(l);else if(ing.name)res.ings.push(ing);
  });
  return res;
}
function htmlText(s){var d=document.createElement('textarea');d.innerHTML=String(s==null?'':s).replace(/<[^>]*>/g,' ');return d.value.replace(/\s+/g,' ').trim();}
function findRecipe(o,depth){
  if(!o||typeof o!=='object'||depth>6)return null;
  if(Array.isArray(o)){for(var i=0;i<o.length;i++){var r=findRecipe(o[i],depth+1);if(r)return r;}return null;}
  var t=o['@type'];if(t==='Recipe'||(Array.isArray(t)&&t.indexOf('Recipe')>=0))return o;
  if(o['@graph'])return findRecipe(o['@graph'],depth+1);
  for(var k in o){if(o[k]&&typeof o[k]==='object'){var r2=findRecipe(o[k],depth+1);if(r2)return r2;}}
  return null;
}
function flatSteps(x,out){
  if(!x)return out;
  if(typeof x==='string'){x.split(/\n+/).forEach(function(s){s=htmlText(s);if(s)out.push(s.replace(/^(шаг\s*)?\d+[.)]\s+/i,''));});return out;}
  if(Array.isArray(x)){x.forEach(function(y){flatSteps(y,out);});return out;}
  if(x.itemListElement)return flatSteps(x.itemListElement,out);
  if(x.text)return flatSteps(x.text,out);
  if(x.name)return flatSteps(x.name,out);
  return out;
}
function parseHtml(html){
  var doc=new DOMParser().parseFromString(html,'text/html'),rec=null;
  var ss=doc.querySelectorAll('script[type="application/ld+json"]');
  for(var i=0;i<ss.length&&!rec;i++){try{rec=findRecipe(JSON.parse(ss[i].textContent),0);}catch(e){}}
  var res={name:'',servings:null,time:'',image:'',ings:[],steps:[]};
  if(rec){
    res.name=htmlText(rec.name);
    var y=rec.recipeYield;if(Array.isArray(y))y=y[0];var ym=String(y==null?'':y).match(/\d+/);if(ym)res.servings=+ym[0];
    res.time=parseTime(rec.totalTime||rec.cookTime||'');
    var im=rec.image;if(Array.isArray(im))im=im[0];if(im&&typeof im==='object')im=im.url||im.contentUrl;res.image=safeUrl(im);
    (rec.recipeIngredient||rec.ingredients||[]).forEach(function(s){var p=parseIng(htmlText(s));if(p.name)res.ings.push(p);});
    res.steps=flatSteps(rec.recipeInstructions,[]);
  }else{
    var ings=doc.querySelectorAll('[itemprop="recipeIngredient"],[itemprop="ingredients"]');
    if(!ings.length)return null;
    var n=doc.querySelector('[itemprop="name"]')||doc.querySelector('h1');res.name=n?htmlText(n.textContent):'';
    ings.forEach(function(el){var p=parseIng(htmlText(el.textContent));if(p.name)res.ings.push(p);});
    doc.querySelectorAll('[itemprop="recipeInstructions"]').forEach(function(el){flatSteps(el.textContent,res.steps);});
    var yy=doc.querySelector('[itemprop="recipeYield"]');if(yy){var m2=yy.textContent.match(/\d+/);if(m2)res.servings=+m2[0];}
    var og=doc.querySelector('meta[property="og:image"]');if(og)res.image=safeUrl(og.getAttribute('content'));
  }
  if(!res.ings.length)return null;
  return res;
}

/* ================= справочники ================= */
var TAGS=[['salad','салат'],['hot','горячее'],['snack','закуска'],['dessert','десерт'],['drink','напиток'],['other','другое']];
function tagName(t){for(var i=0;i<TAGS.length;i++)if(TAGS[i][0]===t)return TAGS[i][1];return 'другое';}
var DEPTS=['Овощи и фрукты','Мясо и рыба','Молочное и яйца','Бакалея и консервы','Хлеб и выпечка','Напитки','Другое'];
var DEPT_KW=[
  [0,/картоф|морков|свекл|лук|чеснок|капуст|огурц?|помидор|томат|перец болг|зелен|укроп|петруш|кинз|базилик|салат|авокадо|яблок|груш|мандарин|апельсин|лимон|лайм|гранат|виноград|банан|ананас|киви|ягод|клюкв|брусник|гриб|шампиньон|редис|кабач|баклаж|тыкв|имбир|сельдер/],
  [1,/мяс|свин|говя|телят|баран|кур|индей|утк|фарш|колбас|ветчин|бекон|сосиск|грудин|филе|печен|сельд|селед|рыб|лосос|семг|форел|кревет|икр|кальмар|краб|мид|тунец|шпрот/],
  [2,/молок|сметан|сливк|сыр|творог|кефир|йогурт|масло сливоч|сливочн|яйц|яйко|маскарпоне|моцарел/],
  [5,/вино|сок|вода|коньяк|ром|шампан|пиво|чай|кофе|морс|лимонад/],
  [4,/хлеб|батон|багет|тарталет|лаваш|печенье|бисквит|корж|слоен|тесто/],
  [3,/майонез|горош|кукуруз|мук|сахар|соль|перец|специ|корица|гвоздик|мускат|лавров|масло растит|масло олив|подсолн|оливк|маслин|рис|гречк|макарон|паст|консерв|уксус|горчиц|кетчуп|соус|желатин|разрыхл|ванил|какао|шоколад|орех|изюм|мед|мёд|крахмал|сод/]
];
function guessDept(name){var n=String(name||'').toLowerCase().replace(/ё/g,'е');for(var i=0;i<DEPT_KW.length;i++)if(DEPT_KW[i][1].test(n))return DEPTS[DEPT_KW[i][0]];return 'Другое';}
function pkey(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9%]+/g,' ').replace(/\s+/g,' ').trim();}

var ICON={
  salad:'<path d="M3 11h18a9 9 0 0 1-18 0zM8 11c0-3 2-5 5-6M12 11c1-2 3-3 5-3"/>',
  hot:'<path d="M4 10h16v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zM2 10h20M9 6c0-1 1-2 0-3M14 6c0-1 1-2 0-3"/>',
  snack:'<path d="M4 12h16l-2 7H6zM9 9h.01M12 8h.01M15 9h.01"/>',
  dessert:'<path d="M4 11h16v9H4zM4 15c2 1 4 1 6 0s4-1 6 0 4 1 4 0M12 11V7M12 4.5v.5"/>',
  drink:'<path d="M5 9h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 11h2a2 2 0 0 1 0 4h-2M9 3v3M12 3v3"/>',
  other:'<path d="M8 3v6a2 2 0 0 0 4 0V3M10 11v10M16 3c-2 2-2 7 0 9v9"/>',
  back:'<path d="M15 18l-6-6 6-6"/>'
};
function svg(name,size,sw){return '<svg aria-hidden="true" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+(sw||1.5)+'" stroke-linecap="round" stroke-linejoin="round">'+(ICON[name]||ICON.other)+'</svg>';}

/* ================= доступ и хранилище ================= */
function detectRepo(){
  var m=location.hostname.match(/^([^.]+)\.github\.io$/i);
  if(m){var p=location.pathname.split('/').filter(Boolean);return m[1]+'/'+(p.length&&!/\.html?$/.test(p[0])?p[0]:m[1]+'.github.io');}
  return ls('kopilka-repo')||'';
}
var REPO=detectRepo();
var token=ls('kopilka-token')||'',pass=ls('menu-pass')||'',me=ls('menu-name')||'';
function role(){return token?'admin':(pass?'friend':'guest');}
function isAdmin(){return role()==='admin';}
function canEdit(){return role()!=='guest';}
function api(p){return 'https://api.github.com/repos/'+REPO+'/contents/'+p;}
function ghHeaders(){var h={'Accept':'application/vnd.github+json'};if(token)h.Authorization='Bearer '+token;return h;}
function ghGet(p){
  return fetch(api(p)+'?t='+Date.now(),{headers:ghHeaders(),cache:'no-store'}).then(function(r){
    if(r.status===404)return {sha:null,data:null};
    if(r.status===401){token='';ls('kopilka-token',null);throw new Error('Токен недействителен, войди заново');}
    if(!r.ok)throw new Error('GitHub ответил '+r.status+(r.status===403?' (лимит запросов, подожди минуту)':''));
    return r.json().then(function(j){return {sha:j.sha,data:JSON.parse(b64d(j.content))};});
  });
}
function ghPut(p,data,sha,message){
  var body={message:message,content:b64e(JSON.stringify(data,null,1))};if(sha)body.sha=sha;
  return fetch(api(p),{method:'PUT',headers:Object.assign({'Content-Type':'application/json'},ghHeaders()),body:JSON.stringify(body)}).then(function(r){
    if(r.status===409||r.status===422)throw {conflict:true,message:'конфликт'};
    if(r.status===401||r.status===403)throw new Error('нет прав на запись — проверь токен');
    if(!r.ok)throw new Error('GitHub ответил '+r.status);
    return r.json().then(function(j){return j.content.sha;});
  });
}

/* ================= состояние ================= */
var DEFAULT_MENU={v:1,settings:{workerUrl:'',goalName:'Продукты'},products:{},recipes:[],shop:{}};
function normalize(d){
  d=d&&typeof d==='object'?d:clone(DEFAULT_MENU);
  d.settings=Object.assign({workerUrl:'',goalName:'Продукты'},d.settings||{});
  d.products=d.products||{};d.recipes=Array.isArray(d.recipes)?d.recipes:[];d.shop=d.shop||{};
  d.recipes.forEach(function(r){r.ings=Array.isArray(r.ings)?r.ings:[];r.steps=Array.isArray(r.steps)?r.steps:[];r.servings=+r.servings||4;if(!r.portions)r.portions=r.servings;});
  return d;
}
var M=normalize(null),msha=null,K=null,ksha=null;
var loaded=false,loadErr='',saving=false,pendingSave=false,kSaving=false,err='',msg='',lastLoad=0,first=true;
var ops=[],saveTimer=null,syncTimer=null;
var ui={filter:'menu',draft:null,imp:{tab:'link',url:'',text:'',busy:false,msg:''},auth:false,authMode:pass||!token?'friend':'admin',inTok:'',inPass:'',inName:me,sel:{},receipt:'',shopName:'',confirm:null,view:{},cook:null,timers:[],settings:false,pfilter:'all',showHave:false};

function load(){
  if(!REPO){loaded=true;loadErr='norepo';render();return Promise.resolve();}
  if(saving||ops.length||kSaving)return Promise.resolve();
  lastLoad=Date.now();
  return Promise.all([ghGet('menu.json'),ghGet('data.json').catch(function(){return {sha:null,data:null};})]).then(function(a){
    if(ops.length||saving)return;
    M=normalize(a[0].data);msha=a[0].sha;K=a[1].data;ksha=a[1].sha;loaded=true;loadErr='';
    scheduleSync();
  }).catch(function(e){loaded=true;loadErr=e.message||String(e);}).then(function(){render();});
}

/* ---- запись меню (только админ) ---- */
function mutate(fn){
  if(!isAdmin())return;
  fn(M);ops.push(fn);render();
  clearTimeout(saveTimer);saveTimer=setTimeout(saveMenu,700);
  scheduleSync();
}
function saveMenu(tries){
  saveTimer=null;tries=tries||0;
  if(saving){pendingSave=true;return;}
  if(!ops.length)return;
  saving=true;err='';renderStatus();
  var n=ops.length;
  ghPut('menu.json',M,msha,'Меню: обновление '+new Date().toLocaleString('ru-RU')).then(function(sha){
    msha=sha;ops=ops.slice(n);saving=false;
    if(ops.length||pendingSave){pendingSave=false;saveMenu();}else render();
  },function(e){
    saving=false;
    if(e&&e.conflict&&tries<3){
      ghGet('menu.json').then(function(r){M=normalize(r.data);msha=r.sha;ops.forEach(function(f){f(M);});saveMenu(tries+1);},function(e2){err='Не сохранилось: '+(e2.message||e2);render();});
      return;
    }
    err='Не сохранилось: '+(e.message||e);render();
  });
}

/* ---- связь с копилкой ---- */
function kgoal(){
  if(!K||!K.goals)return null;var nm=String(M.settings.goalName||'Продукты').trim().toLowerCase();
  return K.goals.find(function(g){return String(g.name).trim().toLowerCase()===nm;})||null;
}
function kspent(g){if(!K||!g)return 0;return (K.tx||[]).reduce(function(s,t){return t.goalId===g.id&&t.type==='out'?s+t.amount:s;},0);}
function scheduleSync(){if(!isAdmin()||!loaded)return;clearTimeout(syncTimer);syncTimer=setTimeout(syncTarget,1500);}
function syncTarget(){
  var g=kgoal();if(!g)return;
  var total=Math.round(totals(shopping()).plan);
  if(g.target===total&&g.auto==='menu')return;
  kSaving=true;renderStatus();
  kApply(function(k){
    var nm=String(M.settings.goalName||'Продукты').trim().toLowerCase();
    var gg=(k.goals||[]).find(function(x){return String(x.name).trim().toLowerCase()===nm;});
    if(gg){gg.target=total;gg.auto='menu';}
  },'Меню: сумма цели «'+g.name+'» = '+total).then(function(){kSaving=false;render();},function(e){kSaving=false;err='Копилка не обновилась: '+(e.message||e);render();});
}
function kApply(fn,message,tries){
  tries=tries||0;
  return ghGet('data.json').then(function(r){
    if(!r.data)throw new Error('не нашёл данные копилки (data.json)');
    K=r.data;ksha=r.sha;fn(K);
    return ghPut('data.json',K,ksha,message);
  }).then(function(sha){ksha=sha;},function(e){
    if(e&&e.conflict&&tries<3)return kApply(fn,message,tries+1);
    throw e;
  });
}

/* ================= расчёты ================= */
function prodOf(name){return M.products[pkey(name)];}
function packFrac(ing,p){
  if(ing.q==null||ing.q==='')return null;
  if(!p||!p.packQ)return undefined;
  var a=base(+ing.q,ing.u),b=base(+p.packQ,p.packU);
  if(a.u===b.u)return a.q/b.q;
  if(PACKISH[a.u])return +ing.q;
  return NaN;
}
function portionsOf(r,local){return (local&&ui.view[r.id])||r.portions||r.servings||1;}
function dishCost(r,f){
  var sum=0,unknown=0;
  r.ings.forEach(function(i){var p=prodOf(i.name),x=packFrac(i,p);if(x===null)return;if(x===undefined||isNaN(x)||p.price==null){unknown++;return;}sum+=x*f*p.price;});
  return {sum:sum,unknown:unknown};
}
function shopping(){
  var items={},taste={};
  M.recipes.forEach(function(r){
    if(!r.inMenu)return;var f=portionsOf(r)/(r.servings||1);
    r.ings.forEach(function(i){
      var k=pkey(i.name);if(!k)return;
      if(i.q==null||i.q===''){var t=taste[k]||(taste[k]={key:k,name:i.name,from:[]});if(t.from.indexOf(r.name)<0)t.from.push(r.name);return;}
      var p=M.products[k];
      var it=items[k]||(items[k]={key:k,name:(p&&p.name)||i.name,frac:0,needs:{},from:[],bad:false,nopack:false});
      if(it.from.indexOf(r.name)<0)it.from.push(r.name);
      var b=base(+i.q*f,i.u);it.needs[b.u]=(it.needs[b.u]||0)+b.q;
      var x=packFrac(i,p);
      if(x===undefined)it.nopack=true;else if(isNaN(x))it.bad=true;else it.frac+=x*f;
    });
  });
  var list=Object.keys(items).map(function(k){
    var it=items[k],p=M.products[k]||{};
    it.p=p;it.dept=p.dept||guessDept(it.name);it.state=M.shop[k]||'';
    it.packs=(!it.nopack&&!it.bad&&it.frac>0)?Math.ceil(it.frac-1e-6):0;
    it.cost=(it.packs&&p.price!=null)?it.packs*p.price:null;
    it.needText=Object.keys(it.needs).map(function(u){return fq(it.needs[u],u);}).join(' + ');
    it.left=null;
    if(it.packs){var pb=base(+p.packQ,p.packU);if(it.needs[pb.u]!=null){var l=it.packs*pb.q-it.needs[pb.u];if(l>pb.q*0.02)it.left=fq(l,pb.u);}}
    return it;
  });
  list.sort(function(a,b){return a.name.localeCompare(b.name,'ru');});
  return {list:list,taste:Object.keys(taste).map(function(k){return taste[k];})};
}
function totals(sh){
  var t={plan:0,left:0,noPrice:0,bad:0,count:0,done:0};
  sh.list.forEach(function(it){
    if(it.state==='have')return;t.count++;if(it.state==='bought')t.done++;
    if(it.cost==null){if(it.bad)t.bad++;else t.noPrice++;return;}
    t.plan+=it.cost;if(it.state!=='bought')t.left+=it.cost;
  });
  return t;
}
function packText(p){if(!p||!p.packQ)return '';return p.packLabel||fq(+p.packQ,p.packU);}
function allProductKeys(){
  var set={};Object.keys(M.products).forEach(function(k){set[k]=1;});
  M.recipes.forEach(function(r){r.ings.forEach(function(i){var k=pkey(i.name);if(k&&i.q!=null&&i.q!=='')set[k]=set[k]||1;});});
  return Object.keys(set);
}
function usage(k){var n=[];M.recipes.forEach(function(r){if(r.ings.some(function(i){return pkey(i.name)===k;}))n.push(r);});return n;}

/* ================= маршруты ================= */
function route(){
  var h=location.hash.replace(/^#\/?/,'').split('/');
  if(h[0]==='r'&&h[1])return {v:'recipe',id:h[1]};
  if(h[0]==='edit'&&h[1])return {v:'edit',id:h[1]};
  if(h[0]==='new')return {v:'edit',id:null};
  if(h[0]==='shop')return {v:'shop'};
  if(h[0]==='products')return {v:'products'};
  return {v:'list'};
}
function go(h){location.hash=h;}
function recipe(id){return M.recipes.find(function(r){return r.id===id;});}

/* ================= отрисовка ================= */
var app=document.getElementById('app');
function statusHtml(){
  if(!loaded)return '<div class="status saving" id="st"><i></i>Загружаю…</div>';
  if(saving||saveTimer||kSaving)return '<div class="status saving" id="st"><i></i>Сохраняю…</div>';
  if(loadErr)return '<div class="status" id="st"><i></i>Нет связи</div>';
  var r=role();
  return '<div class="status live" id="st"><i></i>'+(r==='admin'?'Сохранено':r==='friend'?'Вход: '+esc(me||'друг'):'Просмотр')+'</div>';
}
function renderStatus(){var s=document.getElementById('st');if(s)s.outerHTML=statusHtml();}

function header(){
  var r=role(),h='<header class="top"><div class="brand"><div class="logo">'+svg('other',22,2)+'</div><div><h1>Меню</h1><p>что готовим на НГ</p></div></div><div class="hdr-r">'+statusHtml();
  if(r==='admin')h+='<button class="mini'+(ui.settings?' on':'')+'" data-a="settings">⚙</button>';
  h+=r==='guest'?'<button class="mini" data-a="authToggle">🔑 войти</button>':'<button class="mini" data-a="logout">выйти</button>';
  return h+'</div></header>';
}
function authHtml(){
  var h='<div class="auth"><div class="seg"><button class="'+(ui.authMode==='friend'?'on':'')+'" data-a="authMode" data-v="friend">Я друг</button><button class="'+(ui.authMode==='admin'?'on':'')+'" data-a="authMode" data-v="admin">Я админ</button></div>';
  if(ui.authMode==='friend'){
    h+='<div class="note mt0">Друзья могут добавлять и править рецепты. В меню их включает админ, цены тоже заполняет админ.</div>';
    h+='<div class="row"><div><label for="inName">Как тебя зовут</label><input id="inName" data-m="inName" value="'+esc(ui.inName)+'"></div><div><label for="inPass">Кодовое слово</label><input id="inPass" type="password" data-m="inPass" value="'+esc(ui.inPass)+'"></div></div>';
  }else{
    h+='<div class="note mt0">Тот же токен GitHub, что в копилке. Если ты уже вошла в копилку на этом устройстве — войдёшь автоматически.</div>';
    if(!/\.github\.io$/i.test(location.hostname))h+='<label for="inRepo">Репозиторий (имя/репозиторий)</label><input id="inRepo" data-m="inRepo" value="'+esc(ui.inRepo||REPO)+'">';
    h+='<label for="inTok">Токен</label><input id="inTok" type="password" placeholder="github_pat_…" data-m="inTok" value="'+esc(ui.inTok)+'">';
  }
  return h+'<div class="tools" style="margin-top:12px"><button class="btn" data-a="login">Войти</button><button class="btn ghost" data-a="authToggle">Отмена</button></div></div>';
}
function settingsHtml(){
  return '<section class="card"><h2>Настройки</h2><div class="row"><div><label for="setW">Адрес сервиса (Cloudflare Worker)</label><input id="setW" data-m="setW" placeholder="https://menu-helper.имя.workers.dev" value="'+esc(ui.setW!=null?ui.setW:M.settings.workerUrl)+'"></div><div><label for="setG">Цель в копилке</label><input id="setG" data-m="setG" value="'+esc(ui.setG!=null?ui.setG:M.settings.goalName)+'"></div></div><div class="note">Сервис нужен для импорта по ссылке и для рецептов от друзей. Сумма цели в копилке пересчитывается из меню автоматически.</div><div class="tools" style="margin-top:12px"><button class="btn" data-a="saveSettings">Сохранить</button><button class="btn ghost" data-a="settings">Закрыть</button></div></section>';
}
function navHtml(rt){
  var sh=shopping(),t=totals(sh);
  var h='<nav class="nav"><a class="chip back" href="../">'+svg('back',14,2)+'Копилка</a><span class="sep"></span>';
  h+='<a class="chip'+(rt.v==='list'||rt.v==='recipe'?' on':'')+'" href="#/">Рецепты <small>'+M.recipes.length+'</small></a>';
  h+='<a class="chip'+(rt.v==='shop'?' on':'')+'" href="#/shop">Покупки <small>'+t.count+'</small></a>';
  h+='<a class="chip'+(rt.v==='products'?' on':'')+'" href="#/products">Цены'+(t.noPrice||t.bad?' <small class="wrn">'+(t.noPrice+t.bad)+'</small>':'')+'</a>';
  if(canEdit())h+='<a class="chip add" href="#/new">+ рецепт</a>';
  return h+'</nav>';
}
function phHtml(r,cls){
  var img=safeUrl(r.image);
  return '<div class="ph'+(cls?' '+cls:'')+'">'+svg(r.tag||'other',cls?60:44,1.4)+(img?'<img src="'+esc(img)+'" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">':'')+'<span class="pill">'+esc(tagName(r.tag))+'</span>'+(r.addedBy?'<span class="pill2">'+esc(r.addedBy)+'</span>':'')+'</div>';
}

function viewList(){
  var sh=shopping(),t=totals(sh),g=kgoal(),spent=kspent(g),inMenu=M.recipes.filter(function(r){return r.inMenu;});
  var h='<section class="card hero"><div class="hero-top"><div><div class="label">Покупки целыми упаковками · '+inMenu.length+' '+plural(inMenu.length,'блюдо','блюда','блюд')+'</div><div class="big">'+rub(t.plan)+'</div><div class="sub">'+(g?'цель «'+esc(g.name)+'» в копилке: '+rub(g.target)+(Math.round(t.plan)!==g.target?' · обновится':''):K?'в копилке нет цели «'+esc(M.settings.goalName)+'»':'копилка не загрузилась')+'</div></div>';
  var pct=t.plan?Math.min(100,spent/t.plan*100):0;
  h+='<div style="text-align:right"><div class="pct">'+Math.floor(pct)+'%</div><div class="note mt0">куплено</div></div></div>';
  h+='<div class="bar"><i style="width:'+pct.toFixed(1)+'%"></i></div>';
  h+='<div class="kpis"><div><span>Потрачено (копилка)</span><b class="neg">'+rub(spent)+'</b></div><div><span>Осталось купить</span><b>≈ '+rub(t.left)+'</b></div><div><span>Без цены</span><b class="'+(t.noPrice+t.bad?'wrn':'pos')+'">'+(t.noPrice+t.bad?(t.noPrice+t.bad)+' '+plural(t.noPrice+t.bad,'продукт','продукта','продуктов'):'всё есть ✓')+'</b></div></div>';
  if(t.noPrice+t.bad)h+='<div class="note">Сумма без учёта продуктов без цены. <a href="#/products">Заполнить цены →</a></div>';
  h+='</section>';

  var list=M.recipes.filter(function(r){return ui.filter==='all'?true:ui.filter==='menu'?r.inMenu:ui.filter==='off'?!r.inMenu:r.tag===ui.filter;});
  var off=M.recipes.filter(function(r){return !r.inMenu;}).length;
  h+='<section class="card"><h2>Блюда<span class="filters">';
  [['menu','в меню'],['all','все']].concat(off?[['off','предложены · '+off]]:[]).concat(TAGS).forEach(function(x){h+='<button class="mini'+(ui.filter===x[0]?' on':'')+'" data-a="filter" data-v="'+x[0]+'">'+x[1]+'</button>';});
  h+='</span></h2>';
  if(!list.length)h+='<div class="empty">'+(M.recipes.length?'Здесь пусто — выбери другой фильтр':'Рецептов пока нет'+(canEdit()?'. <a href="#/new">Добавить первый →</a>':''))+'</div>';
  h+='<div class="grid-r">';
  list.forEach(function(r){
    var dc=dishCost(r,portionsOf(r)/(r.servings||1));
    h+='<a class="rc'+(r.inMenu?'':' off')+'" href="#/r/'+esc(r.id)+'">'+phHtml(r)+'<div class="bd"><div class="nm">'+esc(r.name)+'</div><div class="mt">'+portionsOf(r)+' '+plural(portionsOf(r),'порция','порции','порций')+(r.time?' · '+esc(r.time):'')+' · '+r.ings.length+' ингр.</div><div class="ft">';
    if(isAdmin())h+='<button class="inm'+(r.inMenu?' on':'')+'" data-a="inmenu" data-id="'+esc(r.id)+'">'+(r.inMenu?'в меню ✓':'+ в меню')+'</button>';
    else h+='<span class="inm'+(r.inMenu?' on':'')+'">'+(r.inMenu?'в меню ✓':'предложено')+'</span>';
    h+='<b>'+(dc.sum?'≈ '+rub(dc.sum):'—')+(dc.unknown?'<span class="wrn" title="без цены"> ?</span>':'')+'</b></div></div></a>';
  });
  return h+'</div></section>';
}

var TIMER_RE=/(\d+)(?:\s*[-–—]\s*(\d+))?\s*(минут[а-яё]*|мин\.?|час[а-яё]*|ч\.?(?![а-яё]))/i;
function stepTimer(s){var m=String(s).match(TIMER_RE);if(!m)return null;var n=+(m[2]||m[1]);if(/^ч/i.test(m[3]))n*=60;return n>0&&n<=600?n:null;}

function viewRecipe(id){
  var r=recipe(id);if(!r)return '<section class="card"><div class="empty">Рецепт не найден. <a href="#/">К списку</a></div></section>';
  var por=portionsOf(r,!isAdmin()),f=por/(r.servings||1),dc=dishCost(r,f),src=safeUrl(r.source);
  var h='<a class="back" href="#/">'+svg('back',18,2)+'Все рецепты</a>';
  h+='<div class="two"><div>'+phHtml(r,'tall');
  h+='<div class="meta-tags"><span class="t-pill">'+esc(tagName(r.tag))+'</span><span class="t-ol'+(r.inMenu?' acc':'')+'">'+(r.inMenu?'в меню ✓':'не в меню')+'</span>'+(r.addedBy?'<span class="t-ol">добавил(а) '+esc(r.addedBy)+'</span>':'')+'</div>';
  h+='<h1 class="rtitle">'+esc(r.name)+'</h1><div class="note">'+(r.time?esc(r.time)+' · ':'')+'в рецепте на '+r.servings+' '+plural(r.servings,'порцию','порции','порций')+(src?' · <a href="'+esc(src)+'" target="_blank" rel="noopener noreferrer">источник ↗</a>':'')+'</div>';
  h+='<div class="tools" style="margin:12px 0 14px">';
  if(isAdmin())h+='<button class="mini'+(r.inMenu?' accent':'')+'" data-a="inmenu" data-id="'+esc(r.id)+'">'+(r.inMenu?'убрать из меню':'+ в меню')+'</button>';
  if(canEdit())h+='<a class="mini" href="#/edit/'+esc(r.id)+'">изменить</a>';
  if(isAdmin())h+='<button class="mini'+(ui.confirm==='del'+r.id?' warn':'')+'" data-a="delRecipe" data-id="'+esc(r.id)+'">'+(ui.confirm==='del'+r.id?'точно удалить?':'удалить')+'</button>';
  h+='</div>';
  h+='<section class="card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div><div class="label" style="margin-bottom:6px">Порции'+(isAdmin()?' в меню':'')+'</div><div class="stepper"><button aria-label="Меньше порций" data-a="por" data-id="'+esc(r.id)+'" data-v="-1">−</button><b>'+por+'</b><button aria-label="Больше порций" data-a="por" data-id="'+esc(r.id)+'" data-v="1">+</button></div></div><div style="text-align:right"><div class="label">доля в покупках</div><div class="big" style="font-size:26px;margin:2px 0">≈ '+rub(dc.sum)+'</div><div class="note mt0">'+(dc.unknown?'<span class="wrn">'+dc.unknown+' без цены</span>':'все цены есть')+'</div></div></section>';
  h+='<section class="card"><h2>Ингредиенты<span class="tl">справа — доля упаковки на блюдо</span></h2>';
  if(!r.ings.length)h+='<div class="empty">Нет ингредиентов</div>';
  r.ings.forEach(function(i){
    var p=prodOf(i.name),x=packFrac(i,p),q=(i.q==null||i.q==='')?(i.u||'по вкусу'):fq(+i.q*f,normU(i.u)||i.u);
    var info='',price='—';
    if(x===null)info='';
    else if(x===undefined)info='<span class="wrn">нет упаковки в справочнике</span>';
    else if(isNaN(x))info='<span class="wrn">единицы не совпадают с упаковкой ('+esc(packText(p))+')</span>';
    else{info='уп. '+esc(packText(p))+(p.price!=null?' — '+rub(p.price):' · <span class="wrn">нет цены</span>');if(p.price!=null)price='≈ '+rub(x*f*p.price);}
    h+='<div class="ing"><div><div class="n">'+esc(i.name)+'</div><div class="q">'+esc(q)+(info?' · '+info:'')+'</div></div><div class="p">'+price+'</div></div>';
  });
  h+='</section></div><div>';
  h+='<section class="card"><h2>Как готовить</h2>';
  if(!r.steps.length)h+='<div class="empty">Шаги не добавлены</div>';
  r.steps.forEach(function(s,ix){var tm=stepTimer(s);h+='<div class="step"><div class="num">'+(ix+1)+'</div><div><div class="tx">'+esc(s)+'</div>'+(tm?'<button class="tmr" data-a="timer" data-v="'+tm+'" data-id="'+esc(r.name+', шаг '+(ix+1))+'">таймер '+tm+' мин</button>':'')+'</div></div>';});
  if(r.steps.length)h+='<button class="btn" data-a="cook" data-id="'+esc(r.id)+'">Режим «Готовлю»</button>';
  return h+'</section></div></div>';
}

function draftFrom(r){
  if(!r)return {id:null,name:'',tag:'other',servings:'4',time:'',source:'',image:'',ings:[{q:'',u:'',name:''}],steps:'',prod:{}};
  return {id:r.id,name:r.name,tag:r.tag||'other',servings:String(r.servings||4),time:r.time||'',source:r.source||'',image:r.image||'',
    ings:r.ings.map(function(i){return {q:i.q==null?'':fnum(+i.q),u:i.u||'',name:i.name};}),steps:r.steps.join('\n'),prod:{}};
}
function effProd(key){
  var p=M.products[key],e=ui.draft&&ui.draft.prod[key];
  if(!e)return p;
  var pk=parsePack(e.pack);
  return {name:(p&&p.name)||'',packQ:pk?pk.packQ:null,packU:pk?pk.packU:'',packLabel:pk?pk.packLabel:'',price:toNum(e.price),dept:p&&p.dept};
}
function viewEdit(rt){
  if(!canEdit())return '<section class="card"><div class="empty">Чтобы добавлять рецепты, нажми «🔑 войти».</div></section>';
  var d=ui.draft,adm=isAdmin();
  var h='<a class="back" href="'+(d.id?'#/r/'+esc(d.id):'#/')+'">'+svg('back',18,2)+(d.id?'К рецепту':'Все рецепты')+'</a>';
  h+='<div class="two"><div>';
  if(!d.id){
    var I=ui.imp;
    h+='<section class="card"><h2>Откуда берём</h2><div class="seg"><button class="'+(I.tab==='link'?'on':'')+'" data-a="impTab" data-v="link">Ссылка</button><button class="'+(I.tab==='text'?'on':'')+'" data-a="impTab" data-v="text">Текстом</button><button class="'+(I.tab==='manual'?'on':'')+'" data-a="impTab" data-v="manual">Вручную</button></div>';
    if(I.tab==='link'){
      h+='<label for="impUrl" class="mt0">Ссылка на рецепт</label><input id="impUrl" data-m="imp.url" inputmode="url" placeholder="https://…" value="'+esc(I.url)+'">';
      h+='<button class="btn" data-a="impLink"'+(I.busy?' disabled':'')+'>'+(I.busy?'Загружаю…':'Загрузить')+'</button>';
      if(!M.settings.workerUrl)h+='<div class="note wrn">Импорт по ссылке заработает, когда админ подключит сервис (⚙ → адрес сервиса). Пока можно вставить текст.</div>';
      else h+='<div class="note">Если сайт не отдаст рецепт — скопируй текст со страницы во вкладку «Текстом».</div>';
    }else if(I.tab==='text'){
      h+='<label for="impText" class="mt0">Скопируй рецепт со страницы и вставь сюда</label><textarea id="impText" data-m="imp.text" rows="7" placeholder="Оливье — 6 порций&#10;Картофель — 4 шт.&#10;Майонез 250 г&#10;Соль по вкусу&#10;&#10;Приготовление&#10;1. Отварить картофель…">'+esc(I.text)+'</textarea>';
      h+='<button class="btn" data-a="impText">Разобрать</button>';
    }else h+='<div class="note mt0">Заполни поля ниже.</div>';
    if(I.msg)h+='<div class="banner '+(I.ok?'info':'warn')+'" style="margin:12px 0 0">'+esc(I.msg)+'</div>';
    h+='</section>';
  }
  h+='<section class="card"><h2>'+(d.id?'Правка рецепта':'Проверь, что получилось')+'</h2>';
  h+='<div class="row3"><div><label for="dName" class="mt0">Название</label><input id="dName" data-d="name" value="'+esc(d.name)+'"></div><div><label for="dServ" class="mt0">Порций в рецепте</label><input id="dServ" data-d="servings" inputmode="numeric" value="'+esc(d.servings)+'"></div><div><label for="dTime" class="mt0">Время</label><input id="dTime" data-d="time" placeholder="40 мин" value="'+esc(d.time)+'"></div></div>';
  h+='<label>Тип блюда</label><div class="filters">';TAGS.forEach(function(x){h+='<button class="mini'+(d.tag===x[0]?' on':'')+'" data-a="dTag" data-v="'+x[0]+'">'+x[1]+'</button>';});h+='</div>';
  h+='<div class="row"><div><label for="dSrc">Ссылка на источник</label><input id="dSrc" data-d="source" placeholder="необязательно" value="'+esc(d.source)+'"></div><div><label for="dImg">Ссылка на фото</label><input id="dImg" data-d="image" placeholder="необязательно" value="'+esc(d.image)+'"></div></div>';
  h+='</section>';
  h+='<section class="card"><h2>Ингредиенты<span class="tl">кол-во · ед. · продукт</span></h2>';
  if(adm)h+='<div class="note mt0" style="margin-bottom:10px">Упаковка и цена общие для всех рецептов — заполняешь продукт один раз.</div>';
  else h+='<div class="note mt0" style="margin-bottom:10px">Упаковки и цены заполняет админ.</div>';
  d.ings.forEach(function(i,ix){
    var key=pkey(i.name),p=key?effProd(key):null,e=d.prod[key];
    var hint='',bad=false,qv=toNum(i.q);
    if(!i.name.trim())hint='';
    else if(qv==null){hint='<span class="mut">без количества — в покупки не попадёт</span>';}
    else if(!p||!p.packQ){hint=adm?'<span class="wrn">новый продукт — укажи упаковку и цену</span>':'<span class="mut">новый продукт — упаковку заполнит админ</span>';bad=adm;}
    else{var x=packFrac({q:qv,u:i.u},p);
      if(isNaN(x)){hint='<span class="wrn">в рецепте «'+esc(normU(i.u)||i.u)+'», а упаковка «'+esc(packText(p))+'» — укажи в тех же единицах</span>';bad=true;}
      else hint='<span class="pos">'+(e?'':'из справочника · ')+'доля '+fnum(x)+' уп.'+(p.price!=null?' ≈ '+rub(x*p.price):'')+'</span>'+(p.price==null?' <span class="wrn">нет цены</span>':'');}
    h+='<div class="er'+(bad?' bad':'')+'"><div class="l1"><input id="iq'+ix+'" aria-label="Количество" data-ing="'+ix+'" data-k="q" inputmode="decimal" value="'+esc(i.q)+'"><input id="iu'+ix+'" aria-label="Единица" data-ing="'+ix+'" data-k="u" list="units" value="'+esc(i.u)+'"><input id="in'+ix+'" aria-label="Продукт" data-ing="'+ix+'" data-k="name" value="'+esc(i.name)+'"><button class="x" aria-label="Удалить строку" data-a="delIng" data-v="'+ix+'">×</button></div>';
    if(adm&&key&&qv!=null){
      var pk=e?e.pack:packText(M.products[key]),pp=e?e.price:(M.products[key]&&M.products[key].price!=null?String(M.products[key].price):'');
      h+='<div class="l2"><span class="tag">упаковка</span><input id="ip'+ix+'" aria-label="Размер упаковки" data-dp="'+esc(key)+'" data-k="pack" placeholder="напр. 400 г" value="'+esc(pk)+'"><input id="ic'+ix+'" aria-label="Цена упаковки" data-dp="'+esc(key)+'" data-k="price" inputmode="decimal" placeholder="₽" value="'+esc(pp)+'"></div>';
    }
    if(hint)h+='<div class="hint">'+hint+'</div>';
    h+='</div>';
  });
  h+='<datalist id="units"><option value="г"><option value="кг"><option value="мл"><option value="л"><option value="шт"><option value="ст. л."><option value="ч. л."><option value="стакан"><option value="зубчик"><option value="пучок"><option value="банка"><option value="уп."><option value="по вкусу"></datalist>';
  h+='<button class="btn ghost" data-a="addIng">+ строка</button></section>';
  h+='</div><div><section class="card"><h2>Как готовить</h2><label for="dSteps" class="mt0">Каждый шаг с новой строки. «25 мин» в шаге станет таймером.</label><textarea id="dSteps" data-d="steps" rows="12">'+esc(d.steps)+'</textarea>';
  h+='<div class="row" style="margin-top:4px"><a class="btn ghost" href="'+(d.id?'#/r/'+esc(d.id):'#/')+'">Отмена</a><button class="btn" data-a="saveRecipe"'+(ui.busy?' disabled':'')+'>'+(ui.busy?'Сохраняю…':'Сохранить')+'</button></div>';
  if(!adm)h+='<div class="note">Рецепт появится в «предложенных», в меню его включит админ.</div>';
  return h+'</section></div></div>';
}

function viewShop(){
  var sh=shopping(),t=totals(sh),adm=isAdmin(),g=kgoal(),spent=kspent(g);
  var h='<section class="card"><div class="kpis"><div><span>Осталось купить</span><b>≈ '+rub(t.left)+'</b></div><div><span>Потрачено (копилка)</span><b class="neg">'+rub(spent)+'</b></div><div><span>По плану всего</span><b>'+rub(t.plan)+'</b></div></div>';
  h+='<div class="bar thin"><i style="width:'+(t.count?(t.done/t.count*100).toFixed(1):0)+'%"></i></div><div class="note mt0">куплено '+t.done+' из '+t.count+' '+plural(t.count,'позиции','позиций','позиций')+(t.noPrice+t.bad?' · <span class="wrn">'+(t.noPrice+t.bad)+' без цены</span> — <a href="#/products">заполнить</a>':'')+'</div></section>';
  if(!sh.list.length){return h+'<section class="card"><div class="empty">Список пуст — включи блюда в меню на странице рецептов.</div></section>';}
  var have=sh.list.filter(function(it){return it.state==='have';});
  DEPTS.forEach(function(dep){
    var items=sh.list.filter(function(it){return it.dept===dep&&it.state!=='have';});if(!items.length)return;
    var sum=items.reduce(function(s,it){return s+(it.cost||0);},0);
    h+='<section class="card"><h2>'+esc(dep)+'<span class="tl">'+(sum?'≈ '+rub(sum):'')+'</span></h2>';
    items.forEach(function(it){h+=shopRow(it,adm);});
    h+='</section>';
  });
  if(sh.taste.length)h+='<section class="card"><h2>По вкусу<span class="tl">проверь, что есть дома</span></h2><div class="note mt0">'+sh.taste.map(function(x){return esc(x.name);}).join(', ')+'</div></section>';
  if(have.length){
    h+='<section class="card"><h2>Есть дома · '+have.length+'<button class="mini" data-a="showHave">'+(ui.showHave?'скрыть':'показать')+'</button></h2>';
    if(ui.showHave)have.forEach(function(it){h+=shopRow(it,adm);});
    h+='</section>';
  }
  if(adm){
    var keys=Object.keys(ui.sel).filter(function(k){return ui.sel[k];}),plan=0,cnt=0;
    sh.list.forEach(function(it){if(ui.sel[it.key]){cnt++;plan+=it.cost||0;}});
    h+='<section class="card buy"><h2>Записать покупку в копилку</h2>';
    if(!cnt)h+='<div class="note mt0">Отметь галочками, что купила, и впиши сумму по чеку.</div>';
    else{
      h+='<div class="note mt0">Отмечено: '+cnt+' '+plural(cnt,'позиция','позиции','позиций')+' · по плану ≈ '+rub(plan)+'</div>';
      h+='<div class="row"><div><label for="rcpt">Сумма по чеку, ₽</label><input id="rcpt" data-m="receipt" inputmode="decimal" value="'+esc(ui.receipt)+'"></div><div><label for="rshop">Где купили</label><input id="rshop" data-m="shopName" placeholder="необязательно" value="'+esc(ui.shopName)+'"></div></div>';
      h+='<button class="btn" data-a="purchase"'+(ui.busy?' disabled':'')+'>'+(ui.busy?'Записываю…':'Записать расход в «'+esc(g?g.name:M.settings.goalName)+'»')+'</button>';
      h+='<div class="tools" style="margin-top:8px"><button class="mini" data-a="markBought">отметить купленным без записи</button><button class="mini" data-a="clearSel">снять отметки</button></div>';
      if(!g)h+='<div class="note wrn">В копилке нет цели «'+esc(M.settings.goalName)+'» — создай её там или поправь название в ⚙.</div>';
    }
    h+='</section>';
  }
  return h;
}
function shopRow(it,adm){
  var bought=it.state==='bought',have=it.state==='have',sel=!!ui.sel[it.key];
  var qty=it.packs?(it.packs+' × '+esc(packText(it.p))):esc(it.needText);
  var from='нужно '+esc(it.needText)+' · '+esc(it.from.join(', '))+(it.left?' · останется '+esc(it.left):'')+(it.bad?' · <span class="wrn">единицы рецепта не совпадают с упаковкой ('+esc(packText(it.p))+') — поправь на странице «Цены» или в рецепте</span>':'');
  var pr=it.cost!=null?rub(it.cost):it.bad?'<span class="wrn">ед.?</span>':'<span class="wrn">нет цены</span>';
  var h='<div class="sh'+(bought||have?' done':'')+'">';
  if(adm&&!bought&&!have)h+='<button class="box'+(sel?' on':'')+'" aria-label="Отметить" data-a="sel" data-id="'+esc(it.key)+'">'+(sel?'✓':'')+'</button>';
  else h+='<button class="box'+(bought?' gray':'')+'" aria-label="'+(bought?'Куплено':'Позиция')+'" disabled>'+(bought?'✓':have?'⌂':'')+'</button>';
  h+='<div><div class="n">'+esc(it.name)+' <span class="mut" style="font-weight:500">· '+qty+'</span></div><div class="f">'+from+'</div></div><div class="p">'+pr+'</div>';
  if(adm){
    h+='<div class="acts">';
    if(bought)h+='<button class="mini" data-a="setState" data-id="'+esc(it.key)+'" data-v="">вернуть в список</button>';
    else if(have)h+='<button class="mini" data-a="setState" data-id="'+esc(it.key)+'" data-v="">нужно купить</button>';
    else h+='<button class="mini" data-a="setState" data-id="'+esc(it.key)+'" data-v="have">есть дома</button>';
    h+='</div>';
  }
  return h+'</div>';
}

function viewProducts(){
  var adm=isAdmin(),keys=allProductKeys();
  var rows=keys.map(function(k){var p=M.products[k]||{},u=usage(k);return {k:k,p:p,name:p.name||(function(){for(var i=0;i<M.recipes.length;i++)for(var j=0;j<M.recipes[i].ings.length;j++)if(pkey(M.recipes[i].ings[j].name)===k)return M.recipes[i].ings[j].name;return k;})(),use:u};});
  rows.sort(function(a,b){return a.name.localeCompare(b.name,'ru');});
  var miss=rows.filter(function(r){return !r.p.packQ||r.p.price==null;});
  var h='<section class="card"><h2>Справочник продуктов<span class="filters"><button class="mini'+(ui.pfilter==='all'?' on':'')+'" data-a="pfilter" data-v="all">все · '+rows.length+'</button><button class="mini'+(ui.pfilter==='miss'?' on':'')+'" data-a="pfilter" data-v="miss">не заполнены · '+miss.length+'</button></span></h2>';
  h+='<div class="note mt0" style="margin-bottom:8px">Упаковка — как продаётся в магазине: «400 г», «1 кг», «10 шт», «банка 680 г». Цена — за одну такую упаковку.'+(adm?'':' Заполняет админ.')+'</div>';
  var list=ui.pfilter==='miss'?miss:rows;
  if(!list.length)h+='<div class="empty">'+(rows.length?'Всё заполнено ✓':'Продукты появятся, когда добавишь рецепты')+'</div>';
  list.forEach(function(r,ix){
    var uses=r.use.map(function(x){return x.name;}).join(', ');
    h+='<div class="pr"><div><div class="n">'+esc(r.name)+'</div><div class="u">'+(uses?esc(uses):'не используется')+'</div></div>';
    if(adm){
      h+='<input id="pp'+ix+'" aria-label="Упаковка" data-pp="'+esc(r.k)+'" data-k="pack" placeholder="упаковка" value="'+esc(packText(r.p))+'">';
      h+='<input id="pc'+ix+'" aria-label="Цена, ₽" data-pp="'+esc(r.k)+'" data-k="price" inputmode="decimal" placeholder="₽" value="'+esc(r.p.price!=null?r.p.price:'')+'">';
      h+='<select id="pd'+ix+'" aria-label="Отдел" data-pp="'+esc(r.k)+'" data-k="dept">';
      var cur=r.p.dept||guessDept(r.name);DEPTS.forEach(function(dp){h+='<option'+(dp===cur?' selected':'')+'>'+esc(dp)+'</option>';});
      h+='</select>';
    }else{
      h+='<div>'+(packText(r.p)?esc(packText(r.p)):'<span class="mut">—</span>')+'</div><div><b>'+(r.p.price!=null?rub(r.p.price):'<span class="mut">—</span>')+'</b></div><div class="u">'+esc(r.p.dept||guessDept(r.name))+'</div>';
    }
    h+='</div>';
  });
  return h+'</section>';
}

function plural(n,a,b,c){n=Math.abs(n)%100;var m=n%10;if(n>10&&n<20)return c;if(m>1&&m<5)return b;if(m===1)return a;return c;}

var lastRoute='';
function render(){
  var ae=document.activeElement,aid=ae&&ae.id,ss=null,se=null;
  try{if(aid&&ae.selectionStart!=null){ss=ae.selectionStart;se=ae.selectionEnd;}}catch(e){}
  var rt=route(),key=rt.v+(rt.id||'');
  if(loaded&&rt.v==='edit'&&(!ui.draft||ui.draftKey!==key)){ui.draft=draftFrom(rt.id?recipe(rt.id):null);ui.draftKey=key;ui.imp={tab:M.settings.workerUrl?'link':'text',url:'',text:'',busy:false,msg:''};}
  var h=header();
  if(ui.auth&&role()==='guest')h+=authHtml();
  if(loadErr==='norepo'){app.innerHTML=h+'<div class="banner info">Открой страницу через адрес GitHub Pages или нажми «войти» как админ и укажи репозиторий.</div>';return;}
  if(loadErr)h+='<div class="banner">Не удалось загрузить: '+esc(loadErr)+' <button class="mini" data-a="reload">ещё раз</button></div>';
  if(err)h+='<div class="banner">'+esc(err)+' <button class="mini" data-a="dismiss">ок</button></div>';
  if(msg)h+='<div class="banner info">'+esc(msg)+' <button class="mini" data-a="dismiss">ок</button></div>';
  if(isAdmin()&&ui.settings)h+=settingsHtml();
  if(!loaded){app.innerHTML=h;app.className='';return;}
  h+=navHtml(rt);
  if(rt.v==='recipe')h+=viewRecipe(rt.id);
  else if(rt.v==='edit')h+=viewEdit(rt);
  else if(rt.v==='shop')h+=viewShop();
  else if(rt.v==='products')h+=viewProducts();
  else h+=viewList();
  app.className=first?'':'calm';first=false;
  app.innerHTML=h;
  if(key!==lastRoute){if(lastRoute)window.scrollTo(0,0);lastRoute=key;}
  else if(aid){var el=document.getElementById(aid);if(el){try{el.focus({preventScroll:true});if(ss!=null)el.setSelectionRange(ss,se);}catch(e){}}}
  renderCook();
}

/* ================= режим готовки и таймеры ================= */
var cookEl=document.getElementById('cook'),wake=null;
function renderCook(){
  if(!ui.cook){cookEl.innerHTML='';return;}
  var r=recipe(ui.cook.id);if(!r){ui.cook=null;cookEl.innerHTML='';return;}
  var i=ui.cook.i,s=r.steps[i]||'',tm=stepTimer(s);
  cookEl.innerHTML='<div class="cook" role="dialog" aria-label="Режим готовки"><div class="hd"><b>'+esc(r.name)+'</b><button class="mini" data-a="cookClose">закрыть ✕</button></div><div class="bodyc"><div class="sn">Шаг '+(i+1)+' из '+r.steps.length+'</div><div class="st">'+esc(s)+'</div>'+(tm?'<button class="btn ghost" style="width:auto" data-a="timer" data-v="'+tm+'" data-id="'+esc(r.name+', шаг '+(i+1))+'">Запустить таймер '+tm+' мин</button>':'')+'</div><div class="nav2"><button class="btn ghost" data-a="cookPrev"'+(i?'':' disabled')+'>← Назад</button><button class="btn" data-a="'+(i<r.steps.length-1?'cookNext':'cookClose')+'">'+(i<r.steps.length-1?'Дальше →':'Готово ✓')+'</button></div></div>';
}
var timersEl=document.createElement('div');timersEl.className='timers';document.body.appendChild(timersEl);
function renderTimers(){
  var now=Date.now();
  timersEl.innerHTML=ui.timers.map(function(t){var left=Math.max(0,Math.round((t.end-now)/1000));var mm=Math.floor(left/60),s=left%60;return '<div class="timer'+(left?'':' ring')+'"><span>'+esc(t.label)+'</span><b>'+(left?mm+':'+String(s).padStart(2,'0'):'готово!')+'</b><button class="mini" data-a="timerOff" data-id="'+t.id+'">✕</button></div>';}).join('');
}
function beep(){try{var C=window.AudioContext||window.webkitAudioContext,c=new C();[0,.35,.7].forEach(function(d){var o=c.createOscillator(),g=c.createGain();o.frequency.value=880;o.connect(g);g.connect(c.destination);g.gain.setValueAtTime(.25,c.currentTime+d);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+d+.3);o.start(c.currentTime+d);o.stop(c.currentTime+d+.3);});}catch(e){}try{navigator.vibrate&&navigator.vibrate([300,150,300,150,300]);}catch(e){}}
setInterval(function(){
  if(!ui.timers.length)return;var now=Date.now();
  ui.timers.forEach(function(t){if(!t.rang&&t.end<=now){t.rang=true;beep();}});
  renderTimers();
},1000);

/* ================= действия ================= */
function setPath(obj,path,val){var p=path.split('.');var o=obj;for(var i=0;i<p.length-1;i++)o=o[p[i]];o[p[p.length-1]]=val;}
document.addEventListener('input',function(e){
  var t=e.target,d=t.dataset;
  if(d.m)setPath(ui,d.m,t.value);
  if(d.d&&ui.draft)ui.draft[d.d]=t.value;
  if(d.ing!=null&&ui.draft){ui.draft.ings[+d.ing][d.k]=t.value;}
  if(d.dp&&ui.draft){var k=d.dp,cur=ui.draft.prod[k];if(!cur){var p=M.products[k];cur=ui.draft.prod[k]={pack:packText(p),price:p&&p.price!=null?String(p.price):''};}cur[d.k]=t.value;}
});
document.addEventListener('change',function(e){
  var t=e.target,d=t.dataset;
  if((d.ing!=null||d.dp)&&ui.draft){render();return;}
  if(d.pp&&isAdmin()){
    var k=d.pp,f=d.k,v=t.value;
    var nameGuess=(function(){for(var i=0;i<M.recipes.length;i++)for(var j=0;j<M.recipes[i].ings.length;j++)if(pkey(M.recipes[i].ings[j].name)===k)return M.recipes[i].ings[j].name;return k;})();
    mutate(function(m){
      var p=m.products[k]||(m.products[k]={name:cap(nameGuess),packQ:null,packU:'',packLabel:'',price:null,dept:null});
      if(f==='pack'){var pk=parsePack(v);p.packQ=pk?pk.packQ:null;p.packU=pk?pk.packU:'';p.packLabel=pk?pk.packLabel:'';}
      else if(f==='price'){var n=toNum(v);p.price=n!=null&&n>=0?n:null;}
      else if(f==='dept')p.dept=v;
    });
  }
});
document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.id==='impUrl'){e.preventDefault();act('impLink');}});
document.addEventListener('click',function(e){var b=e.target.closest('[data-a]');if(!b||b.disabled)return;e.preventDefault();act(b.dataset.a,b.dataset.id,b.dataset.v);});
var msgAt=0;
window.addEventListener('hashchange',function(){ui.confirm=null;if(Date.now()-msgAt>1500){msg='';err='';}render();});

function act(a,id,v){
  var keep=false;
  if(a==='authToggle'){ui.auth=!ui.auth;render();}
  else if(a==='authMode'){ui.authMode=v;render();}
  else if(a==='dismiss'){err='';msg='';render();}
  else if(a==='reload'){loadErr='';loaded=false;render();load();}
  else if(a==='settings'){ui.settings=!ui.settings;ui.setW=null;ui.setG=null;render();}
  else if(a==='saveSettings'){var w=(ui.setW!=null?ui.setW:M.settings.workerUrl).trim().replace(/\/+$/,''),gn=(ui.setG!=null?ui.setG:M.settings.goalName).trim()||'Продукты';
    if(w&&!/^https:\/\//.test(w)){msg='';err='Адрес сервиса должен начинаться с https://';render();return;}
    mutate(function(m){m.settings.workerUrl=w;m.settings.goalName=gn;});ui.settings=false;render();}
  else if(a==='logout'){token='';pass='';ls('kopilka-token',null);ls('menu-pass',null);ui.sel={};render();}
  else if(a==='login')login();
  else if(a==='filter'){ui.filter=v;render();}
  else if(a==='pfilter'){ui.pfilter=v;render();}
  else if(a==='showHave'){ui.showHave=!ui.showHave;render();}
  else if(a==='inmenu'){var r=recipe(id);if(r){var val=!r.inMenu;mutate(function(m){var x=m.recipes.find(function(y){return y.id===id;});if(x)x.inMenu=val;});}}
  else if(a==='por'){var r2=recipe(id);if(!r2)return;
    if(isAdmin()){var nv=Math.max(1,Math.min(200,portionsOf(r2)+(+v)));mutate(function(m){var x=m.recipes.find(function(y){return y.id===id;});if(x)x.portions=nv;});}
    else{ui.view[id]=Math.max(1,Math.min(200,portionsOf(r2,true)+(+v)));render();}}
  else if(a==='delRecipe'){if(ui.confirm!=='del'+id){ui.confirm='del'+id;keep=true;render();}else{mutate(function(m){m.recipes=m.recipes.filter(function(y){return y.id!==id;});});go('#/');}}
  else if(a==='cook'){ui.cook={id:id,i:0};try{navigator.wakeLock&&navigator.wakeLock.request('screen').then(function(w){wake=w;},function(){});}catch(e){}renderCook();}
  else if(a==='cookNext'){ui.cook.i++;renderCook();}
  else if(a==='cookPrev'){ui.cook.i=Math.max(0,ui.cook.i-1);renderCook();}
  else if(a==='cookClose'){ui.cook=null;try{wake&&wake.release();}catch(e){}wake=null;renderCook();}
  else if(a==='timer'){ui.timers.push({id:uid(),label:id||'Таймер',end:Date.now()+(+v)*60000});renderTimers();}
  else if(a==='timerOff'){ui.timers=ui.timers.filter(function(t){return t.id!==id;});renderTimers();}
  // редактор
  else if(a==='impTab'){ui.imp.tab=v;ui.imp.msg='';render();}
  else if(a==='impText'){var p=parseText(ui.imp.text);if(!p.ings.length&&!p.steps.length){ui.imp.ok=false;ui.imp.msg='Не нашёл ни ингредиентов, ни шагов — проверь текст.';render();return;}applyImport(p,'');}
  else if(a==='impLink')importLink();
  else if(a==='dTag'){ui.draft.tag=v;render();}
  else if(a==='addIng'){ui.draft.ings.push({q:'',u:'',name:''});render();var el=document.getElementById('iq'+(ui.draft.ings.length-1));if(el)el.focus();}
  else if(a==='delIng'){ui.draft.ings.splice(+v,1);if(!ui.draft.ings.length)ui.draft.ings.push({q:'',u:'',name:''});render();}
  else if(a==='saveRecipe')saveRecipe();
  // покупки
  else if(a==='sel'){ui.sel[id]=!ui.sel[id];render();}
  else if(a==='clearSel'){ui.sel={};render();}
  else if(a==='setState'){mutate(function(m){if(v)m.shop[id]=v;else delete m.shop[id];});delete ui.sel[id];}
  else if(a==='markBought'){var ks=Object.keys(ui.sel).filter(function(k){return ui.sel[k];});mutate(function(m){ks.forEach(function(k){m.shop[k]='bought';});});ui.sel={};render();}
  else if(a==='purchase')purchase();
  if(!keep&&ui.confirm&&a!=='delRecipe')ui.confirm=null;
}

function login(){
  if(ui.authMode==='admin'){
    var tk=(ui.inTok||'').trim(),rp=((ui.inRepo||REPO)||'').trim().replace(/^https?:\/\/github\.com\//,'').replace(/\/$/,'');
    if(!tk||!/^[^\/\s]+\/[^\/\s]+$/.test(rp)){err='Заполни токен'+(/\.github\.io$/i.test(location.hostname)?'':' и репозиторий');render();return;}
    msg='Проверяю токен…';err='';render();
    fetch('https://api.github.com/repos/'+rp,{headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+tk}}).then(function(r){
      if(!r.ok)throw new Error(r.status===404?'репозиторий не найден или токен к нему без доступа':'GitHub ответил '+r.status);return r.json();
    }).then(function(j){
      if(j.permissions&&!j.permissions.push)throw new Error('у токена нет права на запись');
      token=tk;ls('kopilka-token',tk);if(!/\.github\.io$/i.test(location.hostname)){REPO=rp;ls('kopilka-repo',rp);}
      ui.auth=false;ui.inTok='';msg='';loaded=false;render();load();
    }).catch(function(e){msg='';err='Не получилось войти: '+e.message;render();});
  }else{
    var nm=(ui.inName||'').trim(),ps=(ui.inPass||'').trim();
    if(!nm||!ps){err='Впиши имя и кодовое слово';render();return;}
    if(!M.settings.workerUrl){err='Админ ещё не подключил сервис для друзей';render();return;}
    msg='Проверяю…';err='';render();
    fetch(M.settings.workerUrl+'/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pass:ps})}).then(function(r){
      if(r.status===401)throw new Error('неверное кодовое слово');if(!r.ok)throw new Error('сервис ответил '+r.status);
      pass=ps;me=nm.slice(0,30);ls('menu-pass',pass);ls('menu-name',me);ui.auth=false;msg='';render();
    }).catch(function(e){msg='';err='Не получилось войти: '+(e.message||e);render();});
  }
}

function applyImport(p,url){
  var d=ui.draft;
  if(p.name)d.name=p.name;if(p.servings)d.servings=String(p.servings);if(p.time)d.time=p.time;if(url)d.source=url;if(p.image)d.image=p.image;
  if(p.ings.length)d.ings=p.ings.map(function(i){return {q:i.q==null?'':fnum(i.q),u:i.u||'',name:i.name};});
  if(p.steps.length)d.steps=p.steps.join('\n');
  var bad=p.ings.filter(function(i){return i.q==null;}).length;
  ui.imp.ok=true;ui.imp.msg='Нашёл '+p.ings.length+' '+plural(p.ings.length,'ингредиент','ингредиента','ингредиентов')+' и '+p.steps.length+' '+plural(p.steps.length,'шаг','шага','шагов')+'. Проверь строки ниже'+(bad?' — '+bad+' без количества':'')+'.';
  render();
}
function importLink(){
  var url=safeUrl(ui.imp.url);
  if(!url){ui.imp.ok=false;ui.imp.msg='Это не похоже на ссылку — нужна полная, с https://';render();return;}
  if(!M.settings.workerUrl){ui.imp.ok=false;ui.imp.msg='Сервис для импорта ещё не подключён — вставь текст рецепта во вкладке «Текстом».';render();return;}
  ui.imp.busy=true;ui.imp.msg='';render();
  fetch(M.settings.workerUrl+'/fetch?url='+encodeURIComponent(url)).then(function(r){if(!r.ok)throw new Error('сайт ответил '+r.status);return r.text();}).then(function(html){
    ui.imp.busy=false;var p=parseHtml(html);
    if(!p){ui.imp.ok=false;ui.imp.msg='Этот сайт не отдал рецепт в понятном виде. Скопируй текст со страницы во вкладку «Текстом».';ui.draft.source=url;render();return;}
    applyImport(p,url);
  }).catch(function(e){ui.imp.busy=false;ui.imp.ok=false;ui.imp.msg='Не получилось загрузить ('+(e.message||e)+'). Скопируй текст со страницы во вкладку «Текстом».';render();});
}
function cleanDraft(){
  var d=ui.draft;
  var r={id:d.id||uid(),name:d.name.trim().slice(0,120),tag:d.tag,servings:Math.max(1,Math.min(200,Math.round(toNum(d.servings)||4))),time:d.time.trim().slice(0,40),source:safeUrl(d.source),image:safeUrl(d.image),
    ings:d.ings.filter(function(i){return i.name.trim();}).map(function(i){var q=toNum(i.q);return {q:q,u:(q==null?(i.u.trim()||'по вкусу'):(normU(i.u)||i.u.trim()||'шт')).slice(0,20),name:cap(i.name.trim()).slice(0,80)};}),
    steps:d.steps.split(/\n+/).map(function(s){return s.trim().replace(/^(шаг\s*)?\d+[.)]\s+/i,'');}).filter(Boolean)};
  return r;
}
function saveRecipe(){
  var r=cleanDraft();
  if(!r.name){err='Впиши название';render();return;}
  if(!r.ings.length){err='Добавь хотя бы один ингредиент';render();return;}
  err='';
  if(isAdmin()){
    var prod=ui.draft.prod,isNew=!ui.draft.id;
    mutate(function(m){
      var ex=m.recipes.find(function(y){return y.id===r.id;});
      if(ex){r.inMenu=ex.inMenu;r.portions=ex.portions;r.addedBy=ex.addedBy;r.ts=ex.ts;var ix=m.recipes.indexOf(ex);m.recipes[ix]=r;}
      else{r.inMenu=true;r.portions=r.servings;r.addedBy='';r.ts=Date.now();m.recipes.push(r);}
      r.ings.forEach(function(i){var k=pkey(i.name);if(k&&i.q!=null&&!m.products[k])m.products[k]={name:i.name,packQ:null,packU:'',packLabel:'',price:null,dept:null};});
      Object.keys(prod).forEach(function(k){var e=prod[k],p=m.products[k];if(!p)return;var pk=parsePack(e.pack);p.packQ=pk?pk.packQ:null;p.packU=pk?pk.packU:'';p.packLabel=pk?pk.packLabel:'';var n=toNum(e.price);p.price=n!=null&&n>=0?n:null;});
    });
    ui.draft=null;msg=isNew?'Рецепт добавлен и включён в меню':'';msgAt=Date.now();go('#/r/'+r.id);
  }else{
    if(!M.settings.workerUrl){err='Сервис для друзей не подключён';render();return;}
    ui.busy=true;render();
    fetch(M.settings.workerUrl+'/recipe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pass:pass,name:me,recipe:r})}).then(function(res){
      return res.json().catch(function(){return {};}).then(function(j){
        if(res.status===401){pass='';ls('menu-pass',null);throw new Error('кодовое слово больше не подходит, войди заново');}
        if(!res.ok)throw new Error(j.error||('сервис ответил '+res.status));
        M=normalize(j.menu);msha=j.sha;
      });
    }).then(function(){ui.busy=false;ui.draft=null;msg='Сохранено! Админ увидит рецепт в «предложенных».';msgAt=Date.now();go('#/r/'+r.id);},function(e){ui.busy=false;err='Не сохранилось: '+(e.message||e);render();});
  }
}
function purchase(){
  var sh=shopping(),keys=Object.keys(ui.sel).filter(function(k){return ui.sel[k];}),amt=toNum(ui.receipt);
  if(!keys.length)return;
  if(!amt||amt<=0){err='Впиши сумму по чеку';render();return;}
  var g=kgoal();if(!g){err='В копилке нет цели «'+M.settings.goalName+'»';render();return;}
  var names=sh.list.filter(function(it){return ui.sel[it.key];}).map(function(it){return it.name.toLowerCase();}).join(', ');
  var shop=(ui.shopName||'').trim(),note=('Продукты'+(shop?' ('+shop+')':'')+': '+names);if(note.length>160)note=note.slice(0,157)+'…';
  var gid=g.id,tx={id:uid(),ts:Date.now(),type:'out',goalId:gid,personId:null,amount:Math.round(amt*100)/100,date:today(),note:note};
  ui.busy=true;err='';kSaving=true;render();
  kApply(function(k){if(!(k.tx||[]).some(function(t){return t.id===tx.id;}))(k.tx=k.tx||[]).push(tx);},'Меню: покупка '+rub(amt)).then(function(){
    ui.busy=false;kSaving=false;ui.sel={};ui.receipt='';ui.shopName='';msg='Записано в копилку: −'+rub(amt);
    mutate(function(m){keys.forEach(function(k){m.shop[k]='bought';});});
  },function(e){ui.busy=false;kSaving=false;err='Не записалось в копилку: '+(e.message||e);render();});
}

/* ================= фон с едой ================= */
(function(){
  var shapes=[
    '<circle cx="7" cy="17" r="3"/><circle cx="16" cy="18" r="3"/><path d="M7 14C8 9 11 5 15 3M16 15c-1-5-1-9-1-12M15 3c2 0 4 1 5 3-2 0-4-1-5-3z"/>',
    '<circle cx="12" cy="13" r="8"/><path d="M12 5c1-2 3-3 5-3 0 2-2 3-5 3zM8 12c1-2 3-3 5-3"/>',
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6"/><path d="M12 6v12M6 12h12M7.8 7.8l8.4 8.4M16.2 7.8l-8.4 8.4"/>',
    '<path d="M5 19L15 9a2.5 2.5 0 0 1 3.5 3.5L8.5 22.5zM17 7l3-3M18.5 9.5l3.5-1M15 6.5l1-4M9 15l2 2M11.5 12.5l2 2"/>',
    '<path d="M4 4l16 4-11 13zM8 9.5h.01M13 10.5h.01M10 14h.01"/>',
    '<path d="M8 3v6a2 2 0 0 0 4 0V3M10 11v10M16 3c-2 2-2 7 0 9v9"/>',
    '<path d="M12 21c-4 0-7-3-7-8 0-4 3-6 7-6s7 2 7 6c0 5-3 8-7 8zM12 7c0-2 1-4 3-4"/>'
  ];
  var f=document.createElement('div');f.className='food';f.setAttribute('aria-hidden','true');var h='';
  for(var i=0;i<16;i++){var sz=26+Math.random()*34;h+='<svg style="left:'+(Math.random()*96).toFixed(1)+'%;top:'+(Math.random()*94).toFixed(1)+'%;width:'+sz.toFixed(0)+'px;height:'+sz.toFixed(0)+'px;animation-duration:'+(8+Math.random()*10).toFixed(1)+'s;animation-delay:-'+(Math.random()*10).toFixed(1)+'s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'+shapes[i%shapes.length]+'</svg>';}
  f.innerHTML=h;document.body.insertBefore(f,document.body.firstChild);
})();

window.__menuTest={parseIng:parseIng,parseText:parseText,parseHtml:parseHtml,parsePack:parsePack,packFrac:packFrac,base:base,toNum:toNum,guessDept:guessDept,pkey:pkey};
render();
load();
document.addEventListener('visibilitychange',function(){if(!document.hidden&&Date.now()-lastLoad>30000)load();});
})();
