// Кусок для Cloudflare Worker (menu-helper): адрес POST /vote — голоса друзей
// и случайные рецепты, которые друзья «подкидывают» на голосование.
// Вставь обработчик рядом с уже существующими /check и /recipe:
//
//   if (url.pathname === '/vote' && request.method === 'POST') return handleVote(request, env);
//
// Названия env.PASS / env.GH_TOKEN / env.REPO замени на те, что уже используются в твоём воркере,
// а CORS-заголовки сделай такими же, как у /recipe.
// Тело запроса: { pass, name, votes: { recipeId: 'love'|'yes'|'no'|'never' }, add: [кандидаты] }
// Ответ: { votes: <весь votes.json> }

const CAND_MAX = 50;

function cleanCand(c) {
  if (!c || typeof c !== 'object') return null;
  const id = String(c.id || '');
  if (!/^pv\d{1,9}$/.test(id)) return null;
  const source = String(c.source || '');
  if (source !== `https://www.povarenok.ru/recipes/show/${id.slice(2)}/`) return null;
  const name = String(c.name || '').trim().slice(0, 120);
  if (!name) return null;
  const img = String(c.image || '');
  return {
    id, name, source,
    tag: ['salad', 'hot', 'snack', 'dessert', 'drink', 'other'].includes(c.tag) ? c.tag : 'other',
    servings: Math.max(1, Math.min(200, Math.round(+c.servings || 4))),
    time: String(c.time || '').slice(0, 40),
    image: /^https:\/\/[^\s"'<>]+$/.test(img) ? img : '',
    ings: (Array.isArray(c.ings) ? c.ings : []).slice(0, 60).map(i => ({
      q: i && typeof i.q === 'number' && isFinite(i.q) ? i.q : null,
      u: String((i && i.u) || '').slice(0, 20),
      name: String((i && i.name) || '').slice(0, 80)
    })).filter(i => i.name),
    steps: (Array.isArray(c.steps) ? c.steps : []).slice(0, 30).map(s => String(s).slice(0, 800)).filter(Boolean),
    likes: Math.max(0, Math.round(+c.likes || 0)),
    addedBy: String(c.addedBy || '').slice(0, 30),
    ts: +c.ts || Date.now()
  };
}

async function handleVote(request, env) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  const out = (obj, status) => new Response(JSON.stringify(obj), { status: status || 200, headers: cors });
  const body = await request.json().catch(() => ({}));
  if (!body.pass || body.pass !== env.PASS) return out({ error: 'bad pass' }, 401);
  const name = String(body.name || '').trim().slice(0, 30);
  if (!name) return out({ error: 'нет имени' }, 400);

  const ok = { love: 1, yes: 1, no: 1, never: 1 };
  const mine = {};
  for (const k of Object.keys(body.votes || {}).slice(0, 500)) if (ok[body.votes[k]]) mine[String(k).slice(0, 40)] = body.votes[k];
  const add = (Array.isArray(body.add) ? body.add : []).slice(0, 10).map(cleanCand).filter(Boolean);

  const api = `https://api.github.com/repos/${env.REPO}/contents/votes.json`;
  const gh = { Authorization: `Bearer ${env.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'menu-helper' };
  const b64e = s => btoa(unescape(encodeURIComponent(s)));
  const b64d = s => decodeURIComponent(escape(atob(s.replace(/\s/g, ''))));

  for (let i = 0; i < 4; i++) {
    const r = await fetch(api, { headers: gh });
    let data = { v: 1, votes: {}, cands: [] }, sha;
    if (r.ok) { const j = await r.json(); sha = j.sha; try { data = JSON.parse(b64d(j.content)); } catch (e) {} }
    else if (r.status !== 404) return out({ error: 'GitHub ' + r.status }, 502);
    data.votes = data.votes && typeof data.votes === 'object' ? data.votes : {};
    data.cands = Array.isArray(data.cands) ? data.cands : [];
    data.votes[name] = mine;
    for (const c of add) if (!data.cands.some(x => x && x.id === c.id)) data.cands.push(c);
    if (data.cands.length > CAND_MAX) data.cands = data.cands.slice(-CAND_MAX);
    const put = await fetch(api, {
      method: 'PUT', headers: { ...gh, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Меню: голосование — ' + name, content: b64e(JSON.stringify(data, null, 1)), ...(sha ? { sha } : {}) })
    });
    if (put.ok) return out({ votes: data });
    if (put.status !== 409 && put.status !== 422) return out({ error: 'GitHub ' + put.status }, 502);
  }
  return out({ error: 'конфликт, попробуй ещё раз' }, 409);
}
