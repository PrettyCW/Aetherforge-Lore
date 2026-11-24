'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const COOKIE='__Host-aetherforge-author',MAX=8*1024*1024,TTL=8*60*60*1000,IDLE=60*60*1000;
const CSRF_COOKIE='__Host-aetherforge-csrf';
const AAD=Buffer.from('aetherforge-author-archive-v1');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=id=>'/author/article/'+encodeURIComponent(id);
const sha=s=>crypto.createHash('sha256').update(s).digest();
const derive=s=>crypto.createHash('sha256').update('aetherforge-storage-key-v1\0').update(s).digest();
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const str=x=>typeof x==='string'&&x.length>0;
const list=x=>Array.isArray(x);
function validate(d){
 assert.ok(object(d));assert.deepEqual(Object.keys(d).sort(),['articles','claims','decisions','relationships','reviews','schemaVersion','sources'].sort());
 assert.equal(d.schemaVersion,1);
 for(const k of ['articles','claims','decisions','relationships','reviews','sources'])assert.ok(list(d[k])&&d[k].length<=20000);
 assert.ok(d.articles.length>0);
 const unique=(rows,key)=>{const ids=new Set();for(const x of rows){assert.ok(object(x)&&str(x[key])&&!ids.has(x[key]));ids.add(x[key])}return ids};
 const ids=unique(d.articles,'id'),claims=unique(d.claims,'id');unique(d.sources,'id');unique(d.decisions,'id');unique(d.relationships,'id');unique(d.reviews,'article_id');
 for(const a of d.articles){assert.ok(str(a.title)&&str(a.category)&&list(a.sections)&&list(a.aliases)&&a.aliases.every(x=>typeof x==='string')&&list(a.related_article_ids)&&list(a.citations)&&list(a.outstanding_questions));for(const s of a.sections){assert.ok(str(s.heading)&&typeof s.text==='string');for(const id of (s.claim_ids||[]))assert.ok(claims.has(id),'Missing section evidence');}for(const id of a.related_article_ids)assert.ok(ids.has(id)&&id!==a.id);for(const c of a.citations)assert.ok(object(c)&&str(c.claim_id)&&claims.has(c.claim_id),'Missing cited evidence');}
 const map=new Map(d.articles.map(a=>[a.id,a]));const pairs=new Set();
 for(const r of d.relationships){assert.ok(ids.has(r.article_a)&&ids.has(r.article_b)&&r.article_a!==r.article_b);const pair=[r.article_a,r.article_b].sort().join('\0');assert.ok(!pairs.has(pair));pairs.add(pair);assert.ok(map.get(r.article_a).related_article_ids.includes(r.article_b)&&map.get(r.article_b).related_article_ids.includes(r.article_a));}
 for(const a of d.articles){assert.equal(new Set(a.related_article_ids).size,a.related_article_ids.length);for(const id of a.related_article_ids)assert.ok(pairs.has([a.id,id].sort().join('\0')))}
 for(const r of d.reviews)assert.ok(ids.has(r.article_id));
 for(const q of d.decisions)assert.ok(str(q.subject)&&list(q.questions)&&list(q.article_ids)&&q.article_ids.every(id=>ids.has(id)));
 for(const c of d.claims)assert.ok(str(c.subject)&&typeof c.fact==='string');
 for(const s of d.sources)assert.ok(str(s.filename));
 return d;
}
function encrypt(bytes,key){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(AAD);const body=Buffer.concat([cipher.update(bytes),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),body])}
function decrypt(bytes,key){assert.ok(bytes.length>=28&&bytes.length<=MAX+28);const decipher=crypto.createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));decipher.setAAD(AAD);decipher.setAuthTag(bytes.subarray(12,28));return Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()])}
function prepareDirectory(dir){fs.mkdirSync(dir,{recursive:true,mode:0o700});if(process.getuid?.()===0){fs.chownSync(dir,1000,1000);fs.chmodSync(dir,0o700)}return dir}
function dropPrivileges(){if(process.getuid?.()===0){process.setgroups([]);process.setgid(1000);process.setuid(1000)}}
function createAuthor({hash='',dir='',origins=['https://aetherforge.prettyuwu.com','https://aetherforge-wiki-production.up.railway.app'],now=Date.now}={}){
 const enabled=/^[a-f0-9]{64}$/.test(hash)&&!!dir;
 const sessions=new Map();let attempts=[];
 const archive=dir&&path.join(dir,'encyclopedia.aesgcm');
 const form=(action,body,extra='')=>'<form method="post" action="'+action+'" '+extra+'>'+body+'</form>';
 const button=s=>'<button type="submit">'+esc(s)+'</button>';
 const nav='<nav><a href="/author">Archive</a><a href="/author/articles">Articles</a><a href="/author/decisions">Decisions &amp; recovery</a><a href="/author/sources">Sources</a><a href="/">Public wiki</a>'+form('/author/logout',button('Sign out'))+'</nav>';
 const search=form('/author/search','<label for="q">Search private articles</label><div class="search"><input id="q" name="q" maxlength="200" required>'+button('Search')+'</div>');
 function page(title,body,auth=false){return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>'+esc(title)+' | Author archive</title><style>:root{color-scheme:dark;--bg:#141315;--gold:#d6ad73;--text:#eee5d7;--muted:#a9a095;--line:#45392e}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.7 system-ui,sans-serif}main{max-width:1000px;margin:auto;padding:24px 5% 56px}h1,h2,h3{font-family:Georgia,serif;color:var(--gold);line-height:1.25}h1{font-size:clamp(32px,5vw,50px)}h2{border-bottom:1px solid var(--line);padding-bottom:8px;margin-top:32px}a{color:var(--gold)}nav{display:flex;gap:16px;align-items:center;flex-wrap:wrap;padding:12px 5%;border-bottom:1px solid var(--line)}nav form{margin-left:auto}input,button,select{font:inherit;padding:9px 12px;border:1px solid var(--line);border-radius:4px;background:#242124;color:var(--text);max-width:100%}button{cursor:pointer;color:var(--gold)}label{display:block;margin:12px 0 4px}.search{display:flex;gap:8px}.search input{flex:1;min-width:0}.muted{color:var(--muted)}.notice,.entry{border:1px solid var(--line);background:#201e21;padding:14px;margin:10px 0;border-radius:4px}.entry h3{margin:0}article{max-width:78ch}article p{white-space:pre-wrap}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;color:var(--muted)}details{margin:12px 0}summary{cursor:pointer}a:focus-visible,button:focus-visible,input:focus-visible{outline:2px solid var(--gold);outline-offset:3px}@media(max-width:600px){nav{gap:10px}nav form{margin-left:0}}</style></head><body>'+ (auth?nav:'<nav><a href="/">Public wiki</a></nav>')+'<main><p class="muted">AETHERFORGE · AUTHOR ARCHIVE</p>'+body+'</main></body></html>'}
 function csrfCookie(req){const entry=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(CSRF_COOKIE+'='));const value=entry?.slice(CSRF_COOKIE.length+1)||'';return /^[A-Za-z0-9_-]{43}$/.test(value)?value:''}
 function csrfValid(req,form){const token=csrfCookie(req),provided=form.get('_csrf');return !!token&&typeof provided==='string'&&provided.length===43&&crypto.timingSafeEqual(sha(token),sha(provided))}
 function send(req,res,status,body){
 if(body.includes('<form method="post"')){let token=csrfCookie(req);if(!token){token=crypto.randomBytes(32).toString('base64url');res.setHeader('Set-Cookie',CSRF_COOKIE+'='+token+'; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=28800')}body=body.replace(/<form method="post"[^>]*>/g,tag=>tag+'<input type="hidden" name="_csrf" value="'+token+'">')}
 res.writeHead(status,{'Content-Type':'text/html; charset=utf-8'});res.end(req.method==='HEAD'?'':body)}
 function rejected(req,res){return send(req,res,403,page('Forbidden','<h1>Request rejected</h1><p>Open a fresh page and retry the form.</p><p><a href="/author">Return to the author archive</a></p>'))}
 function redirect(res,to){res.writeHead(303,{Location:to});res.end()}
 function clear(res){res.setHeader('Set-Cookie',COOKIE+'=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0')}
 function prune(){const t=now();for(const [id,s] of sessions)if(t>=s.expires||t-s.last>=IDLE){s.key.fill(0);sessions.delete(id)}attempts=attempts.filter(t0=>t-t0<300000)}
 function session(req){prune();const m=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='));if(!m)return null;const id=m.slice(COOKIE.length+1),s=sessions.get(id);if(!s)return null;s.last=now();return {id,...s}}
 function login(req,res,status=200,message=''){return send(req,res,status,page('Sign in','<h1>Author sign in</h1>'+(message?'<p class="notice">'+esc(message)+'</p>':'')+form('/author/login','<label for="key">Author access key</label><input id="key" type="password" name="key" autocomplete="current-password" maxlength="256" required> '+button('Sign in'))))}
 async function body(req,limit){let total=0;const chunks=[];for await(const chunk of req){total+=chunk.length;if(total>limit){const e=new Error('limit');e.code='LIMIT';throw e}chunks.push(chunk)}return Buffer.concat(chunks)}
 async function readForm(req){if(!/^application\/x-www-form-urlencoded(?:;|$)/i.test(req.headers['content-type']||''))throw Error('form');return new URLSearchParams((await body(req,8192)).toString('utf8'))}
 function load(s){const buf=decrypt(fs.readFileSync(archive),s.key);try{return validate(JSON.parse(buf.toString('utf8')))}finally{buf.fill(0)}}
 function links(rows){return rows.length?rows.map(a=>'<div class="entry"><h3><a href="'+url(a.id)+'">'+esc(a.title)+'</a></h3><span class="muted">'+esc(a.category)+'</span></div>').join(''):'<p class="muted">No matching private articles.</p>'}
 function articleRefs(ids,map){return '<ul>'+ids.map(id=>map.has(id)?'<li><a href="'+url(id)+'">'+esc(map.get(id).title)+'</a></li>':'').join('')+'</ul>'}
 function detail(label,value){return '<details><summary>'+esc(label)+'</summary><pre>'+esc(JSON.stringify(value,null,2))+'</pre></details>'}
 return async function author(req,res,u){
 res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('Pragma','no-cache');res.setHeader('Vary','Cookie');res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
 const p=u.pathname,method=req.method;
 if(!enabled)return send(req,res,503,page('Unavailable','<h1>Author archive unavailable</h1><p>Author access is not configured.</p>'));
 if(!['GET','HEAD','POST'].includes(method)){res.setHeader('Allow','GET, HEAD, POST');return send(req,res,405,page('Not allowed','<h1>Method not allowed</h1>'))}
 if(method==='POST'&&(req.headers['sec-fetch-site']==='cross-site'||(req.headers.origin&&req.headers.origin!=='null'&&!origins.includes(req.headers.origin))))return rejected(req,res);
 let s=session(req);
 try{
 if(p==='/author/login'&&method==='POST'){
 prune();if(attempts.length>=12){res.setHeader('Retry-After','300');return login(req,res,429,'Too many attempts. Try again later.')}
 const fields=await readForm(req);if(!csrfValid(req,fields))return rejected(req,res);const key=(fields.get('key')||'').trim();
 const good=key.length<=256&&crypto.timingSafeEqual(sha(key),Buffer.from(hash,'hex'));
 if(!good){attempts.push(now());return login(req,res,401,'Invalid access key.')}
 attempts=[];if(s){sessions.get(s.id)?.key.fill(0);sessions.delete(s.id)}
 while(sessions.size>=32){const [id,old]=sessions.entries().next().value;old.key.fill(0);sessions.delete(id)}
 const id=crypto.randomBytes(32).toString('base64url');sessions.set(id,{key:derive(key),last:now(),expires:now()+TTL});
 res.setHeader('Set-Cookie',COOKIE+'='+id+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800');return redirect(res,'/author');
 }
 if(!s){if(p==='/author/login'&&(method==='GET'||method==='HEAD'))return login(req,res);return method==='POST'?send(req,res,401,page('Sign in required','<h1>Sign in required</h1>')):redirect(res,'/author/login')}
 if(p==='/author/logout'&&method==='POST'){if(!csrfValid(req,await readForm(req)))return rejected(req,res);sessions.get(s.id)?.key.fill(0);sessions.delete(s.id);clear(res);return redirect(res,'/author/login')}
 if(p==='/author/login')return redirect(res,'/author');
 if(p==='/author/import'&&method==='POST'){
 const ct=req.headers['content-type']||'';if(!/^multipart\/form-data;/i.test(ct))throw Error('multipart');
 const raw=await body(req,MAX+65536);const data=await new Request('https://localhost/',{method:'POST',headers:{'Content-Type':ct},body:raw}).formData();if(!csrfValid(req,data))return rejected(req,res);if(fs.existsSync(archive))return send(req,res,409,page('Archive exists','<h1>Archive already imported</h1><p>Existing data was not changed.</p>',true));const file=data.get('archive');
 if(!file||typeof file.arrayBuffer!=='function'||file.size>MAX)throw Error('file');
 const bytes=Buffer.from(await file.arrayBuffer());let enc;try{validate(JSON.parse(bytes.toString('utf8')));enc=encrypt(bytes,s.key)}finally{bytes.fill(0);raw.fill(0)}
 const tmp=path.join(dir,'.upload-'+crypto.randomBytes(12).toString('hex'));
 try{fs.writeFileSync(tmp,enc,{flag:'wx',mode:0o600});fs.linkSync(tmp,archive)}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp)}
 return redirect(res,'/author');
 }
 if(method==='POST'&&p!=='/author/search')return send(req,res,404,page('Not found','<h1>Not found</h1>',true));
 if(!fs.existsSync(archive)){return send(req,res,200,page('Import archive','<h1>Import your private encyclopedia</h1><p class="notice">No private archive has been imported. Select the prepared private JSON export. It is validated and encrypted before being stored.</p>'+form('/author/import','<label for="archive">Private import JSON</label><input id="archive" name="archive" type="file" accept=".json,application/json" required> '+button('Import encrypted archive'),'enctype="multipart/form-data"'),true))}
 const d=load(s),map=new Map(d.articles.map(a=>[a.id,a])),sorted=[...d.articles].sort((a,b)=>a.title.localeCompare(b.title,'en'));
 if(p==='/author')return send(req,res,200,page('Archive','<h1>Private encyclopedia</h1><p class="notice">Author-only · Encrypted storage · Read-only archive</p><p>'+d.articles.length+' articles · '+d.relationships.length+' relationship pairs · '+d.claims.length+' evidence records · '+d.sources.length+' sources · '+d.decisions.length+' decision / recovery records</p>'+search+'<h2>Browse categories</h2><ul>'+[...new Set(sorted.map(a=>a.category))].sort().map(c=>'<li><a href="/author/articles?category='+encodeURIComponent(c)+'">'+esc(c)+'</a></li>').join('')+'</ul>',true));
 if(p==='/author/articles'){const c=u.searchParams.get('category')||'';return send(req,res,200,page('Articles','<h1>'+esc(c||'All private articles')+'</h1>'+search+links(sorted.filter(a=>!c||a.category===c)),true))}
 if(p==='/author/search'&&method==='POST'){const fields=await readForm(req);if(!csrfValid(req,fields))return rejected(req,res);const q=(fields.get('q')||'').slice(0,200).trim();const terms=q.toLowerCase().split(/\s+/).filter(Boolean);const found=sorted.filter(a=>terms.length&&terms.every(t=>[a.title,a.category,...a.aliases,...a.sections.flatMap(s=>[s.heading,s.text])].join(' ').toLowerCase().includes(t)));return send(req,res,200,page('Private search','<h1>Search results</h1>'+search+'<p>'+found.length+' results for '+esc(q)+'</p>'+links(found),true))}
 if(p.startsWith('/author/article/')){const a=map.get(decodeURIComponent(p.slice('/author/article/'.length)));if(a)return send(req,res,200,page(a.title,'<p><a href="/author/articles">Articles</a> / '+esc(a.category)+'</p><article><h1>'+esc(a.title)+'</h1><p class="muted">'+esc(a.draft_state)+' · '+esc(a.spoiler)+' · '+esc((a.canon_statuses||[]).join(', '))+'</p>'+a.sections.map(x=>'<h2>'+esc(x.heading)+'</h2><p>'+esc(x.text)+'</p><p class="muted">'+(x.claim_ids||[]).map(id=>'<a href="/author/claim/'+encodeURIComponent(id)+'">'+esc(id)+'</a>').join(' · ')+'</p>').join('')+'<h2>Related articles</h2>'+articleRefs(a.related_article_ids,map)+'<h2>Source references</h2>'+a.citations.map(c=>detail(c.claim_id+' · '+(c.status||''),c)).join('')+'<h2>Editorial review</h2>'+detail('Publication review',a.publication_review)+detail('Outstanding questions',a.outstanding_questions)+detail('Additional evidence',a.unincorporated_evidence)+detail('Relationship records',d.relationships.filter(r=>r.article_a===a.id||r.article_b===a.id))+'</article>',true))}
 if(p==='/author/decisions')return send(req,res,200,page('Decisions and recovery','<h1>Decisions and source recovery</h1>'+d.decisions.map(q=>'<section class="entry"><h3>'+esc(q.subject)+'</h3><p class="muted">'+esc(q.type)+' · '+esc(q.status)+'</p><ul>'+q.questions.map(x=>'<li>'+esc(typeof x==='string'?x:JSON.stringify(x))+'</li>').join('')+'</ul>'+articleRefs(q.article_ids,map)+detail('Decision record',q)+'</section>').join(''),true));
 if(p==='/author/sources')return send(req,res,200,page('Sources','<h1>Source register</h1>'+d.sources.map(x=>detail(x.id+' · '+x.filename,x)).join('')+'<h2>Evidence index</h2><p class="muted">Curated source claims and recovered conversation summaries, distinguished in each record.</p>'+d.claims.map(x=>'<p><a href="/author/claim/'+encodeURIComponent(x.id)+'">'+esc(x.id)+' · '+esc(x.subject)+'</a></p>').join(''),true));
 if(p.startsWith('/author/claim/')){const c=d.claims.find(x=>x.id===decodeURIComponent(p.slice('/author/claim/'.length)));if(c)return send(req,res,200,page(c.subject,'<h1>'+esc(c.subject)+'</h1><p>'+esc(c.fact)+'</p>'+detail('Evidence and source reference',c),true))}
 return send(req,res,404,page('Not found','<h1>Private entry not found</h1>',true));
 }catch(e){const status=e.code==='LIMIT'?413:p==='/author/import'?400:500;return send(req,res,status,page('Request failed','<h1>Request failed</h1><p>'+ (p==='/author/import'?'The archive could not be imported. No existing archive was overwritten.':'The request could not be completed.')+'</p>',!!s))}
 };
}
module.exports={createAuthor,prepareDirectory,dropPrivileges,validate,encrypt,decrypt,derive};
