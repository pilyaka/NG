(function(){
var DEFAULT={v:1,people:[],goals:[{id:'g1',name:'Новый год',target:50000}],tx:[]};
var S=JSON.parse(JSON.stringify(DEFAULT));
var sha=null,loaded=false,loadErr='',saving=false,pending=false,err='',timer=null,first=true,lastLoad=0;
var ui={goal:null,form:{type:'in',person:'',amount:'',date:today(),note:''},settings:false,managePeople:false,newPerson:'',confirm:null,filter:'all',importOpen:false,importText:'',msg:'',auth:false,tokenInput:'',repoInput:''};

function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}catch(e){return null;}}
var token=ls('kopilka-token')||'';
ui.goal=ls('kopilka-goal');

// Репозиторий определяется из адреса: имя.github.io/репозиторий/
function detectRepo(){
  var m=location.hostname.match(/^([^.]+)\.github\.io$/i);
  if(m){var p=location.pathname.split('/').filter(Boolean);return m[1]+'/'+(p.length&&!/\.html?$/.test(p[0])?p[0]:m[1]+'.github.io');}
  return ls('kopilka-repo')||'';
}
var REPO=detectRepo();
var API=function(){return 'https://api.github.com/repos/'+REPO+'/contents/data.json';};
var readOnly=!token;

function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function uid(){return Math.random().toString(36).slice(2,9);}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function fmt(n){return new Intl.NumberFormat('ru-RU').format(Math.round(n))+' ₽';}
function num(s){var n=parseFloat(String(s).replace(/\s/g,'').replace(',','.'));return isFinite(n)?n:0;}
function fdate(s){if(!s)return'';var p=s.split('-');return p[2]+'.'+p[1]+'.'+p[0];}
function b64e(s){return btoa(unescape(encodeURIComponent(s)));}
function b64d(s){return decodeURIComponent(escape(atob(s.replace(/\s/g,''))));}
function goal(){var g=S.goals.find(function(x){return x.id===ui.goal;});if(!g){g=S.goals[0];ui.goal=g&&g.id;}return g;}
function person(id){return S.people.find(function(p){return p.id===id;});}
function stats(gid){var r={in:0,out:0,by:{}};S.tx.forEach(function(t){if(t.goalId!==gid)return;if(t.type==='in'){r.in+=t.amount;if(t.personId)r.by[t.personId]=(r.by[t.personId]||0)+t.amount;}else r.out+=t.amount;});return r;}
function headers(){var h={'Accept':'application/vnd.github+json'};if(token)h.Authorization='Bearer '+token;return h;}

function load(silent){
  if(!REPO){loaded=true;loadErr='norepo';render();return Promise.resolve();}
  if(saving||pending||timer)return Promise.resolve();
  lastLoad=Date.now();
  return fetch(API()+'?t='+Date.now(),{headers:headers(),cache:'no-store'}).then(function(r){
    if(r.status===404){sha=null;loaded=true;loadErr='';return;}
    if(r.status===401){token='';ls('kopilka-token',null);readOnly=true;throw new Error('Токен недействителен, войди заново');}
    if(!r.ok)throw new Error('GitHub ответил '+r.status+(r.status===403?' (лимит запросов, подожди минуту)':''));
    return r.json().then(function(j){sha=j.sha;S=JSON.parse(b64d(j.content));loaded=true;loadErr='';});
  }).catch(function(e){loaded=true;loadErr=e.message||String(e);}).then(function(){render();});
}

function save(){
  timer=null;
  if(saving){pending=true;return;}
  saving=true;err='';render();
  var body={message:'Копилка: обновление '+new Date().toLocaleString('ru-RU'),content:b64e(JSON.stringify(S,null,1))};
  if(sha)body.sha=sha;
  fetch(API(),{method:'PUT',headers:Object.assign({'Content-Type':'application/json'},headers()),body:JSON.stringify(body)}).then(function(r){
    if(r.status===409||r.status===422)throw {conflict:true};
    if(r.status===401||r.status===403)throw new Error('Нет прав на запись — проверь токен');
    if(!r.ok)throw new Error('GitHub ответил '+r.status);
    return r.json().then(function(j){sha=j.content.sha;});
  }).then(function(){
    saving=false;
    if(pending){pending=false;save();}else render();
  },function(e){
    saving=false;pending=false;
    if(e&&e.conflict){err='Данные поменялись на другом устройстве — загрузил свежие, повтори последнее действие.';load();}
    else{err='Не сохранилось: '+(e.message||e);render();}
  });
}
function commit(fn){if(readOnly||!loaded||loadErr)return;fn();render();clearTimeout(timer);timer=setTimeout(save,600);}

function statusHtml(){
  if(!loaded)return '<div class="status saving"><i></i>Загружаю…</div>';
  if(saving||timer)return '<div class="status saving"><i></i>Сохраняю…</div>';
  if(loadErr)return '<div class="status"><i></i>Нет связи</div>';
  return '<div class="status live"><i></i>'+(readOnly?'Просмотр':'Сохранено')+'</div>';
}

function authHtml(){
  var h='<div class="auth"><b>Вход для редактирования</b><div class="note">Нужен токен GitHub с доступом «Contents: Read and write» к этому репозиторию. Он хранится только в этом браузере.</div>';
  if(!detectRepoFromHost())h+='<label>Репозиторий (имя/репозиторий)</label><input id="repoInput" placeholder="nickname/kopilka" value="'+esc(ui.repoInput||REPO)+'">';
  h+='<label>Токен</label><input id="tokenInput" type="password" placeholder="github_pat_…" value="'+esc(ui.tokenInput)+'"><div class="tools" style="margin-top:12px"><button class="btn" data-a="login">Войти</button><button class="btn ghost" data-a="authToggle">Отмена</button></div></div>';
  return h;
}
function detectRepoFromHost(){return /\.github\.io$/i.test(location.hostname);}

function render(){
  var app=document.getElementById('app');
  var h='';
  h+='<header class="top"><div class="brand"><div class="logo">❄</div><div><h1>Копилка</h1><p>кто сколько скинулся</p></div></div><div class="hdr-r"><a class="mini" href="menu/" style="text-decoration:none">🍊 меню</a>'+statusHtml()+(token?'<button class="mini" data-a="logout">выйти</button>':'<button class="mini" data-a="authToggle">🔑 войти</button>')+'</div></header>';
  if(ui.auth&&!token)h+=authHtml();
  if(loadErr==='norepo'){h+='<div class="banner info">Открой страницу через адрес GitHub Pages или нажми «войти» и укажи репозиторий.</div>';app.innerHTML=h;return;}
  if(loadErr)h+='<div class="banner">Не удалось загрузить данные: '+esc(loadErr)+' <button class="mini" data-a="reload">ещё раз</button></div>';
  if(err)h+='<div class="banner">'+esc(err)+'</div>';
  if(ui.msg)h+='<div class="banner info">'+esc(ui.msg)+'</div>';
  if(!loaded){app.innerHTML=h;return;}

  var g=goal(),st=stats(g.id),target=g.target||0;
  var pct=target?Math.min(100,st.in/target*100):0;
  var share=S.people.length?target/S.people.length:0;
  var ro=!!loadErr,f=ui.form;

  h+='<nav class="goals">';
  S.goals.forEach(function(x){h+='<button class="chip'+(x.id===g.id?' on':'')+'" data-a="goal" data-id="'+x.id+'">'+esc(x.name)+'</button>';});
  if(!readOnly)h+='<button class="chip add" data-a="newGoal">+ цель</button>';
  h+='</nav>';

  h+='<section class="card hero"><div class="hero-top"><div><div class="label">Собрано на «'+esc(g.name)+'»</div><div class="big">'+fmt(st.in)+'</div><div class="sub">из '+fmt(target)+(share?' · по '+fmt(share)+' с человека':'')+'</div>'+(g.auto==='menu'?'<div class="note" style="margin-top:4px">сумма считается из <a href="menu/" style="color:var(--acc)">меню</a> автоматически</div>':'')+'</div><div style="text-align:right"><div class="pct">'+Math.floor(target?st.in/target*100:0)+'%</div>'+(readOnly?'':'<button class="mini" data-a="settings" style="margin-top:8px">⚙ цель</button>')+'</div></div>';
  h+='<div class="bar'+(pct>=100?' done':'')+'"><i style="width:'+pct.toFixed(1)+'%"></i></div>';
  h+='<div class="kpis"><div><span>Осталось собрать</span><b'+(st.in>=target?' class="pos"':'')+'>'+(st.in>=target?'Собрали ✓':fmt(target-st.in))+'</b></div><div><span>Потрачено</span><b class="neg">'+fmt(st.out)+'</b></div><div><span>В копилке сейчас</span><b>'+fmt(st.in-st.out)+'</b></div></div>';
  if(ui.settings&&!readOnly){
    var cnt=S.tx.filter(function(t){return t.goalId===g.id;}).length;
    h+='<div class="settings"><div class="row"><div><label>Название цели</label><input id="gName" value="'+esc(g.name)+'"></div><div><label>Сумма цели, ₽</label><input id="gTarget" inputmode="decimal" value="'+esc(g.target)+'"'+(g.auto==='menu'?' disabled title="считается из меню"':'')+'></div></div><div class="tools" style="margin-top:12px"><button class="btn" data-a="saveGoal"'+(ro?' disabled':'')+'>Сохранить</button>';
    if(S.goals.length>1)h+='<button class="btn red" data-a="delGoal"'+(ro?' disabled':'')+'>'+(ui.confirm==='goal'?'Точно удалить? ('+cnt+' записей)':'Удалить цель')+'</button>';
    h+='<button class="btn ghost" data-a="settings">Закрыть</button></div></div>';
  }
  h+='</section>';

  h+='<div class="grid"'+(readOnly?' style="grid-template-columns:1fr"':'')+'>';
  if(!readOnly){
    h+='<section class="card"><h2>Новая запись</h2><div class="seg"><button class="in'+(f.type==='in'?' on':'')+'" data-a="type" data-v="in">＋ Взнос</button><button class="out'+(f.type==='out'?' on':'')+'" data-a="type" data-v="out">− Расход</button></div><form id="txForm">';
    if(f.type==='in'){
      if(!S.people.length)h+='<div class="note">Сначала добавь участников →</div>';
      h+='<label>Кто скинул</label><select data-f="person"><option value="">— выбрать —</option>';
      S.people.forEach(function(p){h+='<option value="'+p.id+'"'+(f.person===p.id?' selected':'')+'>'+esc(p.name)+'</option>';});
      h+='</select>';
    }
    h+='<div class="row"><div><label>Сумма, ₽</label><input data-f="amount" inputmode="decimal" placeholder="0" value="'+esc(f.amount)+'"></div><div><label>Дата</label><input type="date" data-f="date" value="'+esc(f.date)+'"></div></div>';
    h+='<label>'+(f.type==='in'?'Комментарий':'На что потратили')+'</label><input data-f="note" placeholder="'+(f.type==='in'?'необязательно':'например, продукты, ёлка')+'" value="'+esc(f.note)+'">';
    h+='<button class="btn" type="submit"'+(ro?' disabled':'')+'>'+(f.type==='in'?'Добавить взнос':'Добавить расход')+'</button></form></section>';
  }
  h+='<section class="card"><h2>Участники'+(readOnly?'':'<button class="mini" data-a="manage">'+(ui.managePeople?'готово':'изменить')+'</button>')+'</h2>';
  if(!S.people.length)h+='<div class="empty">Пока никого нет</div>';
  S.people.slice().sort(function(a,b){return (st.by[b.id]||0)-(st.by[a.id]||0);}).forEach(function(p){
    var paid=st.by[p.id]||0,left=share-paid,w=share?Math.min(100,paid/share*100):0,done=share&&paid>=share;
    if(ui.managePeople&&!readOnly){
      var has=S.tx.some(function(t){return t.personId===p.id;});
      h+='<div class="person"><input data-rename="'+p.id+'" value="'+esc(p.name)+'"><button class="mini warn" data-a="delPerson" data-id="'+p.id+'">'+(ui.confirm==='p'+p.id?(has?'и все взносы?':'точно?'):'удалить')+'</button></div>';
    }else{
      h+='<div class="person"><div class="nm">'+esc(p.name)+'</div><div class="a"><b>'+fmt(paid)+'</b></div><div class="pbar'+(done?' done':'')+'"><i style="width:'+w.toFixed(1)+'%"></i></div><div class="sm"><span>'+(share?'доля '+fmt(share):'')+'</span><span class="'+(done?'pos':'')+'">'+(!share?'':done?(paid>share?'закрыл(а) +'+fmt(paid-share):'закрыл(а) ✓'):'осталось '+fmt(left))+'</span></div></div>';
    }
  });
  if(!readOnly)h+='<div class="addp"><input id="newPerson" placeholder="Имя участника" value="'+esc(ui.newPerson)+'"><button class="btn" data-a="addPerson"'+(ro?' disabled':'')+'>Добавить</button></div>';
  h+='</section></div>';

  var list=S.tx.filter(function(t){return t.goalId===g.id&&(ui.filter==='all'||t.type===ui.filter);}).sort(function(a,b){return (b.date||'').localeCompare(a.date||'')||(b.ts||0)-(a.ts||0);});
  h+='<section class="card"><h2>История<span class="filters">';
  [['all','все'],['in','взносы'],['out','расходы']].forEach(function(x){h+='<button class="mini'+(ui.filter===x[0]?'" style="color:var(--text);border-color:var(--acc)':'')+'" data-a="filter" data-v="'+x[0]+'">'+x[1]+'</button>';});
  h+='</span></h2>';
  if(!list.length)h+='<div class="empty">Записей пока нет</div>';
  list.forEach(function(t){
    var p=t.personId&&person(t.personId);
    h+='<div class="tx"'+(readOnly?' style="grid-template-columns:36px 1fr auto"':'')+'><div class="ic '+t.type+'">'+(t.type==='in'?'+':'−')+'</div><div><div class="t">'+(t.type==='in'?esc(p?p.name:'Взнос'):esc(t.note||'Расход'))+'</div><div class="d">'+fdate(t.date)+(t.type==='in'&&t.note?' · '+esc(t.note):'')+'</div></div><div class="a '+(t.type==='in'?'':'neg')+'">'+(t.type==='in'?'+':'−')+fmt(t.amount)+'</div>'+(readOnly?'':'<button class="mini del'+(ui.confirm===t.id?' warn':'')+'" data-a="delTx" data-id="'+t.id+'">'+(ui.confirm===t.id?'точно?':'×')+'</button>')+'</div>';
  });
  h+='</section>';

  if(S.goals.length>1){
    var T={in:0,out:0};
    h+='<section class="card"><h2>Все цели</h2><table><thead><tr><th>Цель</th><th>Собрано</th><th>Потрачено</th><th>Остаток</th></tr></thead><tbody>';
    S.goals.forEach(function(x){var s=stats(x.id);T.in+=s.in;T.out+=s.out;h+='<tr><td>'+esc(x.name)+'</td><td>'+fmt(s.in)+' / '+fmt(x.target)+'</td><td class="neg">'+fmt(s.out)+'</td><td>'+fmt(s.in-s.out)+'</td></tr>';});
    h+='</tbody><tfoot><tr><td>Итого</td><td>'+fmt(T.in)+'</td><td class="neg">'+fmt(T.out)+'</td><td>'+fmt(T.in-T.out)+'</td></tr></tfoot></table></section>';
  }
  if(!readOnly){
    h+='<section class="card"><h2>Резервная копия</h2><div class="tools"><button class="btn ghost" data-a="copy">Скопировать данные</button><button class="btn ghost" data-a="importToggle">Загрузить из копии</button></div>';
    if(ui.importOpen)h+='<textarea id="importText" rows="4" style="margin-top:12px" placeholder="Вставь сюда скопированные данные">'+esc(ui.importText)+'</textarea><button class="btn red" data-a="import">Заменить всё данными из копии</button>';
    h+='<div class="note">Вся история изменений также хранится в репозитории на GitHub (файл data.json).</div></section>';
  }
  app.className=first?'first':'';
  app.innerHTML=h;
  first=false;
}

document.addEventListener('input',function(e){
  var t=e.target;
  if(t.dataset.f)ui.form[t.dataset.f]=t.value;
  if(t.id==='newPerson')ui.newPerson=t.value;
  if(t.id==='importText')ui.importText=t.value;
  if(t.id==='tokenInput')ui.tokenInput=t.value;
  if(t.id==='repoInput')ui.repoInput=t.value;
});
document.addEventListener('change',function(e){
  var t=e.target;
  if(t.dataset.f)ui.form[t.dataset.f]=t.value;
  if(t.dataset.rename){var p=person(t.dataset.rename),v=t.value.trim();if(p&&v&&v!==p.name)commit(function(){p.name=v;});}
});
document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.id==='newPerson'){e.preventDefault();act('addPerson');}});
document.addEventListener('submit',function(e){
  e.preventDefault();
  var f=ui.form,amt=num(f.amount);
  if(amt<=0){ui.msg='Укажи сумму';render();return;}
  if(f.type==='in'&&!f.person){ui.msg='Выбери, кто скинул';render();return;}
  ui.msg='';
  commit(function(){
    S.tx.push({id:uid(),ts:Date.now(),type:f.type,goalId:goal().id,personId:f.type==='in'?f.person:null,amount:Math.round(amt*100)/100,date:f.date||today(),note:f.note.trim()});
    f.amount='';f.note='';
  });
});
document.addEventListener('click',function(e){var b=e.target.closest('[data-a]');if(b)act(b.dataset.a,b.dataset.id,b.dataset.v);});

function act(a,id,v){
  var keep=false;
  if(a==='goal'){ui.goal=id;ui.settings=false;ls('kopilka-goal',id);render();}
  else if(a==='type'){ui.form.type=v;render();}
  else if(a==='filter'){ui.filter=v;render();}
  else if(a==='settings'){ui.settings=!ui.settings;render();}
  else if(a==='manage'){ui.managePeople=!ui.managePeople;render();}
  else if(a==='importToggle'){ui.importOpen=!ui.importOpen;render();}
  else if(a==='authToggle'){ui.auth=!ui.auth;render();}
  else if(a==='reload'){loadErr='';loaded=false;render();load();}
  else if(a==='logout'){token='';ls('kopilka-token',null);readOnly=true;render();}
  else if(a==='login'){
    var tk=ui.tokenInput.trim(),rp=(ui.repoInput||REPO).trim().replace(/^https?:\/\/github\.com\//,'').replace(/\/$/,'');
    if(!tk||!/^[^\/\s]+\/[^\/\s]+$/.test(rp)){ui.msg='Заполни токен'+(detectRepoFromHost()?'':' и репозиторий в виде имя/репозиторий');render();return;}
    ui.msg='Проверяю токен…';render();
    fetch('https://api.github.com/repos/'+rp,{headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+tk}}).then(function(r){
      if(!r.ok)throw new Error(r.status===404?'репозиторий не найден или токен к нему без доступа':'GitHub ответил '+r.status);
      return r.json();
    }).then(function(j){
      if(j.permissions&&!j.permissions.push)throw new Error('у токена нет права на запись');
      token=tk;ls('kopilka-token',tk);if(!detectRepoFromHost()){REPO=rp;ls('kopilka-repo',rp);}
      readOnly=false;ui.auth=false;ui.tokenInput='';ui.msg='';loaded=false;loadErr='';render();load();
    }).catch(function(e){ui.msg='Не получилось войти: '+e.message;render();});
  }
  else if(a==='newGoal'){var ng={id:uid(),name:'Новая цель',target:10000};commit(function(){S.goals.push(ng);});ui.goal=ng.id;ui.settings=true;render();}
  else if(a==='saveGoal'){var g=goal(),n=document.getElementById('gName').value.trim(),tg=num(document.getElementById('gTarget').value);commit(function(){if(n)g.name=n;if(tg>=0)g.target=tg;});ui.settings=false;render();}
  else if(a==='delGoal'){if(ui.confirm!=='goal'){ui.confirm='goal';keep=true;render();}else{var gid=goal().id;commit(function(){S.goals=S.goals.filter(function(x){return x.id!==gid;});S.tx=S.tx.filter(function(t){return t.goalId!==gid;});});ui.goal=S.goals[0].id;ui.settings=false;render();}}
  else if(a==='addPerson'){var nm=ui.newPerson.trim();if(!nm)return;commit(function(){S.people.push({id:uid(),name:nm});ui.newPerson='';});}
  else if(a==='delPerson'){if(ui.confirm!=='p'+id){ui.confirm='p'+id;keep=true;render();}else commit(function(){S.people=S.people.filter(function(p){return p.id!==id;});S.tx=S.tx.filter(function(t){return t.personId!==id;});if(ui.form.person===id)ui.form.person='';});}
  else if(a==='delTx'){if(ui.confirm!==id){ui.confirm=id;keep=true;render();}else commit(function(){S.tx=S.tx.filter(function(t){return t.id!==id;});});}
  else if(a==='copy'){try{navigator.clipboard.writeText(JSON.stringify(S)).then(function(){ui.msg='Данные скопированы';render();},function(){ui.msg='Браузер не дал скопировать';render();});}catch(e){ui.msg='Браузер не дал скопировать';render();}}
  else if(a==='import'){try{var d=JSON.parse(ui.importText);if(!d.goals||!d.goals.length||!Array.isArray(d.people)||!Array.isArray(d.tx))throw 0;commit(function(){S=d;ui.importOpen=false;ui.importText='';ui.msg='Данные загружены';});}catch(e){ui.msg='Не похоже на копию из этой копилки';render();}}
  if(!keep&&ui.confirm)ui.confirm=null;
}

// снег
var snow=document.createElement('div');snow.className='snow';
for(var i=0;i<22;i++){var s=document.createElement('span');s.textContent=i%3?'·':'❄';s.style.left=Math.random()*100+'%';s.style.fontSize=(8+Math.random()*12)+'px';s.style.animationDuration=(9+Math.random()*14)+'s';s.style.animationDelay=(-Math.random()*20)+'s';snow.appendChild(s);}
document.body.appendChild(snow);

render();
load();
// подтягивать свежие данные, когда возвращаешься на вкладку, и раз в минуту
document.addEventListener('visibilitychange',function(){if(!document.hidden&&Date.now()-lastLoad>15000)load();});
setInterval(function(){if(!document.hidden&&Date.now()-lastLoad>60000)load();},20000);
})();
