'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {articles,categories}=require('./public-content');
const VERSION=require('./package.json').version,origin='https://aetherforge.prettyuwu.com';
const css=fs.readFileSync(path.join(__dirname,'wiki.css'),'utf8');
const {visuals,visualById}=require('./visual-content');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=a=>'/wiki/'+encodeURIComponent(a.slug);
const catLink=c=>'/category/'+encodeURIComponent(c);
const sorted=list=>[...list].sort((a,b)=>a.title.localeCompare(b.title,'en'));
const visibleCategories=categories.filter(c=>articles.some(a=>a.category===c));
const byId=new Map(articles.map(a=>[a.id,a]));
const bySlug=new Map(articles.map(a=>[a.slug,a]));
const categoryRows=new Map(categories.map(c=>[c,sorted(articles.filter(a=>a.category===c))]));
const metadata={'Mythology':['✦','Creation, dragons and ancient traditions.'],'Geography':['◇','Kingdoms, cities and places.'],'Competition':['⚔','The Ladder, Crucibles and competitive formats.'],'World & Society':['◈','Institutions, traditions and the wider world.'],'History':['◷','Recorded events, eras and unresolved history.'],'Characters':['♙','The people of Aetherforge.'],'Organizations':['♜','Houses, orders and governing bodies.'],'Culture & Society':['◉','Customs, identities and community.'],'Craftsmanship':['⚒','Forging, materials and equipment.'],'Artifacts':['✧','Daggers, seals and significant objects.'],'Magic':['✴','Extraordinary forces and their limits.'],'Literature':['▤','Stories and game worlds.'],'Terminology':['≡','Names, concepts and definitions.']};
const kingdoms=[['ash','Veyrath'],['cinder','Drakhar'],['ember','Pyrakon'],['damascus','Seraphyne'],['titanium','Aurelith'],['obsidian','Varkyros']];
const brandmark='<svg aria-hidden="true" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M20 3 34 11v17L20 37 6 28V11Z"/><path d="M10 28 20 10 30 28M14 22h12M20 3v4m0 26v4"/><path d="m20 15 3 5-3 5-3-5Z" fill="currentColor" stroke="none"/></svg>';

const glyph=c=>metadata[c]?.[0]||'◇';
const icon=c=>'<span class="icon" aria-hidden="true">'+esc(glyph(c))+'</span>';
const active=(p,current)=>p===current?' aria-current="page"':'';
const searchForm=(q='',c='',full=false)=>'<form class="searchform'+(full?' search-page-form':'')+'" action="/search" method="get" role="search" aria-label="'+(full?'Search results':'Site search')+'"><label class="sr-only" for="'+(full?'results-q':'site-q')+'">Search encyclopedia</label><input id="'+(full?'results-q':'site-q')+'" name="q" maxlength="200" placeholder="Search Aetherforge" value="'+esc(q)+'">'+(full?'<label class="sr-only" for="search-category">Category</label><select id="search-category" name="category"><option value="">All categories</option>'+visibleCategories.map(x=>'<option value="'+esc(x)+'"'+(x===c?' selected':'')+'>'+esc(x)+'</option>').join('')+'</select>':'')+'<button class="btn '+(full?'primary':'')+'">Search</button></form>';
function page(title,body,{path='/',description='Explore the encyclopedia of Aetherforge.',q='',noindex=false,toc=''}={}){
 const meta='<meta name="description" content="'+esc(description)+'"><meta property="og:title" content="'+esc(title)+' | Aetherforge Wiki"><meta property="og:description" content="'+esc(description)+'">'+(noindex?'<meta name="robots" content="noindex,follow">':'<link rel="canonical" href="'+esc(origin+path)+'">');
 const nav=[['/','Main page'],['/kingdoms','Six kingdoms'],['/chronology','Chronology'],['/articles','All articles'],['/random','Random article']];
 const links=nav.map(([p,n])=>'<li><a href="'+p+'"'+active(p,path)+'>'+n+'</a></li>').join('');
 const cats=visibleCategories.map(c=>'<li><a href="'+catLink(c)+'"'+active(catLink(c),path)+'>'+esc(c)+'</a></li>').join('');
 const menu='<details class="main-menu"><summary aria-label="Main menu"><span aria-hidden="true">☰</span></summary><nav class="menu-panel" aria-label="Main navigation"><h2>Navigation</h2><ul>'+links+'</ul><h2>Categories</h2><ul>'+cats+'</ul></nav></details>';
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#0c1015"><title>'+esc(title)+' | Aetherforge Wiki</title>'+meta+'<style>'+css+'</style></head><body><a class="skip" href="#main">Skip to content</a><header class="masthead">'+menu+'<a class="brand" href="/" aria-label="Aetherforge Wiki home"><span class="brandmark">'+brandmark+'</span><span><span class="brand-name">Aetherforge</span><span class="brand-sub">The encyclopedia</span></span></a>'+searchForm(q)+'</header><div class="shell'+(toc?' has-toc':'')+'">'+(toc?'<aside class="desktop-toc">'+toc+'</aside>':'')+'<main id="main">'+body+'</main></div><footer class="footer"><span>Aetherforge · FYI</span><span>Encyclopedia · v'+VERSION+'</span></footer></body></html>';
}
function crumb(c,extra=''){return '<nav class="crumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/articles">Articles</a>'+(c?'<span aria-hidden="true">/</span><a href="'+catLink(c)+'">'+esc(c)+'</a>':'')+(extra?'<span aria-hidden="true">/</span><span>'+esc(extra)+'</span>':'')+'</nav>'}
const heading=(label,title,href='',action='')=>'<h2 class="section-head">'+esc(title)+(href?'<a href="'+href+'">'+esc(action)+'</a>':'')+'</h2>';
const section=(label,title,body,href='',action='')=>'<section class="section">'+heading(label,title,href,action)+body+'</section>';
const pageHeading=(label,title,desc)=>'<header class="page-heading"><h1>'+esc(title)+'</h1><p>'+linkedText(desc)+'</p></header>';
const scopeDescriptions={'Established lore':'Established setting or character information; individual sections can have explicit qualifications.','Mythological tradition':'Traditional accounts, not necessarily confirmed historical events.','Uncertain tradition':'Disputed or unresolved accounts.','Provisional lore':'Worldbuilding that has not been finalized.','FYI competition rules':'Rules of the identified FYI league and season, not universal fictional lore.','Game reference':'Game design or mechanics; not necessarily implemented or part of literary canon.','Game and league reference':'Scoped game and league information.','Game reference and lore':'Mixed game and literary material, distinguished in the text.','Literature':'Reference to a literary work.','Provisional literature':'Working literary plans, not finalized story events.','Provisional game reference':'Proposed game design.'};
const scope=a=>'<div class="scope"><span class="tag" title="'+esc(scopeDescriptions[a.publication.canon]||a.publication.canon)+'">'+esc(a.publication.canon)+'</span></div>';
const norm=s=>String(s??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[’‘']/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const searchNames={
 'characters-lilith-vanthe':['Pretty','Lily','Lyra Northashe','Daggersmith'],
 'characters-lyra-acolyte12':['Acolyte12','Founder','Lyra'],
 'characters-travis-pope':['TPope'],'characters-draven-vale':['Daggs'],'characters-lauren':['Stick'],
 'characters-lyra-vale':['Ashborn'],'characters-cassian-rourke':['Golden Spark'],
 'characters-kael-varen':['First Ascendant'],'characters-aric-flare':['Ember Wolf'],
 'characters-torren-drake':['Last Cinder'],'characters-maera-sol':['Twice-Fallen'],
 'characters-selene-ardyn':['Damascus Hand'],'characters-caelor-rhyne':['Silver Measure'],
 'characters-malrek-voss':['Obsidian Crown'],'organizations-fyi':['Find Your Irons'],
 'mythology-kharadon':['King of Dragons','Keeper of the Eternal Forge'],
 'mythology-drakhar':['Unyielding'],'mythology-aurelith':['Silver Sentinel'],
 'mythology-varkyros':['Black Sovereign'],'mythology-pyrakon':['Flameborn'],
 'mythology-seraphyne':['Queen of Damascus'],'geography-serathis':['City of a Thousand Forges'],
 'geography-nocthar':['Black Crown']
};
const searchIndex=articles.map(a=>({a,title:norm(a.title),names:[a.slug,...a.aliases,...(searchNames[a.id]||[])].map(norm),category:norm(a.category),description:norm(a.description),headings:norm(a.content.map(s=>s.heading).join(' ')),body:norm(a.content.map(s=>s.body).join(' '))}));
const stopWords=new Set(['the','of','and','a','an','in','to']);
function search(q,c=''){
 const phrase=norm(q);let terms=phrase.split(' ').filter(Boolean);const useful=terms.filter(t=>!stopWords.has(t));if(useful.length)terms=useful;
 const rows=[];
 for(const x of searchIndex){
  if(c&&x.a.category!==c)continue;
  const names=[x.title,...x.names],fields=[...names,x.category,x.description,x.headings,x.body];
  if(!terms.every(t=>fields.some(s=>s.includes(t))))continue;
  let score=0;
  if(phrase){
   score+=x.title===phrase?1000:x.names.includes(phrase)?850:x.title.startsWith(phrase)?250:x.names.some(n=>n.startsWith(phrase))?220:x.title.includes(phrase)?150:x.names.some(n=>n.includes(phrase))?120:0;
   for(const t of terms)score+=names.some(n=>n.split(' ').includes(t))?65:names.some(n=>n.includes(t))?30:x.headings.includes(t)?15:x.description.includes(t)?10:x.category.includes(t)?7:2;
   if(x.description.includes(phrase))score+=12;
  }
  rows.push({a:x.a,score})
 }
 return rows.sort((x,y)=>y.score-x.score||x.a.title.localeCompare(y.a.title,'en')).map(x=>x.a)
}
function snippet(a,q){if(!q)return a.description;const terms=norm(q).split(' ').filter(Boolean);if(terms.some(t=>norm(a.description).includes(t)))return a.description;const s=a.content.find(x=>terms.some(t=>norm(x.body).includes(t)));if(!s)return a.description;const words=s.body.split(/\s+/),idx=words.findIndex(w=>terms.some(t=>norm(w).includes(t)));const start=Math.max(0,idx-12),end=Math.min(words.length,start+43);return (start?'… ':'')+words.slice(start,end).join(' ')+(end<words.length?' …':'')}
function highlight(value,q){const terms=String(q??'').trim().split(/\s+/).filter(t=>t.length>=2).slice(0,12).map(t=>t.replace(/[.*+?^$(){}|[\]\\]/g,'\\$&'));if(!terms.length)return esc(value);const re=new RegExp('('+terms.join('|')+')','giu');return String(value).split(re).map((s,i)=>i%2?'<mark>'+esc(s)+'</mark>':esc(s)).join('')}
function entries(list,{ranked=false,q=''}={}){return list.length?'<ol class="entries">'+(ranked?list:sorted(list)).map(a=>'<li class="entry"><a class="entry-title" href="'+link(a)+'">'+highlight(a.title,q)+'</a><p>'+linkedText(snippet(a,q),a,v=>highlight(v,q))+'</p><div class="result-meta"><a href="'+catLink(a.category)+'">'+esc(a.category)+'</a> · <span class="result-scope">'+esc(a.publication.canon)+'</span></div></li>').join('')+'</ol>':'<p class="empty">No matching articles. Try a different term or category.</p>'}
function articleLinks(list){return '<ul class="article-links">'+list.filter(Boolean).map(a=>'<li><a href="'+link(a)+'">'+esc(a.title)+'</a></li>').join('')+'</ul>'}
function directory(list){const groups=new Map();for(const a of sorted(list)){const k=a.title[0].toUpperCase();if(!groups.has(k))groups.set(k,[]);groups.get(k).push(a)}return '<nav class="alphabet" aria-label="Alphabetical index">'+[...groups.keys()].map(k=>'<a href="#letter-'+esc(k)+'">'+esc(k)+'</a>').join('')+'</nav>'+[...groups].map(([k,v])=>'<section><h2 class="letter-head" id="letter-'+esc(k)+'">'+esc(k)+'</h2>'+articleLinks(v)+'</section>').join('')}
function kingdomCards(){return '<ul class="kingdom-list">'+kingdoms.map(([slug,dragon])=>{const a=bySlug.get(slug);return a?'<li class="k-'+slug+'"><a href="'+link(a)+'">'+esc(a.title)+'</a> — '+linkedText(dragon,a)+'</li>':''}).join('')+'</ul>'}
function categoryCards(){return '<ul class="category-list">'+visibleCategories.map(c=>'<li><a href="'+catLink(c)+'">'+esc(c)+'</a> <span class="small">('+categoryRows.get(c).length+')</span></li>').join('')+'</ul>'}
function featured(list){return '<ul class="featured-list">'+list.filter(Boolean).map(a=>'<li><a href="'+link(a)+'">'+esc(a.title)+'</a> — '+linkedText(a.description,a)+'</li>').join('')+'</ul>'}
const featuredIds=['culture-society-the-six-kingdoms','mythology-kharadon','geography-vaelorian-citadel','competition-ladder-of-legends','mythology-eternal-forge','organizations-administrative-council'];
function related(a){const hub=new Set(a.id==='geography-'+a.slug?(kingdomHubs[a.slug]||[]):[]);const rows=a.relatedIds.map(id=>byId.get(id)).filter(b=>b&&!hub.has(b.id));if(!rows.length)return '';return '<section id="see-also" class="section"><h2>See also</h2>'+articleLinks(sorted(rows))+'</section>'}
const visualUrl=v=>'/media/'+v.id+'.webp';
const visualFor=a=>visuals.filter(v=>v.article_ids.includes(a.id));
function visualFigure(v,{eager=false,links=false}={}){
 return '<figure class="visual-figure'+(v.classification==='canonical'?' locked-visual':'')+'"><img src="'+visualUrl(v)+'" alt="'+esc(v.subject)+' — '+esc(v.title)+'" width="'+v.width+'" height="'+v.height+'" loading="'+(eager?'eager':'lazy')+'" decoding="async"><figcaption><span class="visual-label">'+esc(v.label)+'</span><strong>'+esc(v.title)+'</strong><span class="visual-note">'+esc(v.note)+'</span>'+(links?'<div class="visual-links">'+v.article_ids.map(id=>'<a href="'+link(byId.get(id))+'">'+esc(byId.get(id).title)+'</a>').join('')+'</div>':'')+'</figcaption></figure>';
}
function articleVisuals(a){
 const rows=visualFor(a).filter(v=>v.classification!=='canonical');
 return rows.length?section('Recovered artwork','Illustrations and concepts','<p class="small visual-intro">Existing artwork, not evidence of additional canon. Each image retains its original scope.</p><div class="visual-grid">'+rows.map(v=>visualFigure(v)).join('')+'</div>','/visuals','Visual archive'):'';
}
function visualArchive(){
 const groups=[['canonical','Locked visual canon'],['scene','Recovered scene illustrations'],['equipment_concept','Recovered equipment concepts']];
 return crumb()+pageHeading('Visual encyclopedia','Visual archive','Existing artwork recovered from Aetherforge’s earlier creative work. Only explicitly approved visual references are treated as locked canon.')+'<p class="small visual-intro">'+visuals.length+' recovered assets · '+new Set(visuals.flatMap(v=>v.article_ids)).size+' connected articles · No newly generated artwork. Missing or unverified subjects are intentionally left unillustrated.</p>'+groups.map(([kind,title])=>section('Visual scope',title,'<div class="visual-grid">'+visuals.filter(v=>v.classification===kind).map(v=>visualFigure(v,{links:true})).join('')+'</div>')).join('');
}

// Match published names and verified prose aliases, longest first. Never link self or ambiguous names by guess.
const termKey=s=>String(s).toLowerCase().replace(/[’‘]/g,"'");
const linkTerms=new Map();
function addTerm(label,id,mode='any'){
 const target=byId.get(id);if(!target)return;
 const key=termKey(label);
 if(!linkTerms.has(key))linkTerms.set(key,[]);
 const candidates=linkTerms.get(key);
 if(!candidates.some(c=>c.target.id===id&&c.mode===mode))candidates.push({target,mode,label});
}
const caseSensitive=new Set(['Ash','Cinder','Ember','Damascus','Titanium','Obsidian','Ignition','Crownless','Reformers','Kindled','Ironbound','Reforging','PJ','FYI','Soulless','Whiskey','Aether','Magic','Daggers','Irons']);
for(const a of articles){
 addTerm(a.title,a.id,caseSensitive.has(a.title)?'capital':'any');
 if(a.title.startsWith('The ')&&!a.title.includes(' ('))addTerm(a.title.slice(4),a.id,'capital');
}
const proseAliases={
 'artifacts-daggers':['Dagger System','dagger'],
 'artifacts-bloodied-daggers':['Bloodied Dagger'],
 'artifacts-crucible-daggers':['Crucible Dagger'],
 'artifacts-division-daggers':['Division Dagger'],
 'artifacts-dragonsteel-daggers':['Dragonsteel Dagger'],
 'artifacts-legendary-daggers':['Legendary Dagger'],
 'artifacts-participation-daggers':['Participation Dagger'],
 'artifacts-placement-daggers':['Placement Dagger'],
 'artifacts-playoff-daggers':['Playoff Dagger'],
 'artifacts-golden-crucible-dagger':['Golden Emerald Dagger'],
 'artifacts-identifier-117-3a':['117-3A'],
 'artifacts-kingdom-seals':['Kingdom Seal','Seal of Dominion','Seal of Endurance','Seal of Flame','Seal of Mastery','Seal of Precision','Seal of the Unbroken'],
 'competition-crucibles':['Crucible'],
 'competition-bold-challenges':['Bold Challenge','Bold Challenges'],
 'competition-direct-challenges':['Direct Challenge','Direct Challenges'],
 'competition-dragon-s-ascension-generations':['Generations'],
 'competition-ignition':['Ignition Registration Area','Last Spark','The Last Spark'],
 'competition-kharadon-s-ascension':['Kharadon’s Ascension Season I','Kharadon’s Ascension Season II'],
 'competition-ladder-of-legends':['Ladder'],
 'geography-ascension-bridges':['Ascension Bridge'],
 'geography-ash':['Ash Arrival Platform'],
 'geography-hall-of-the-six':['Founder’s Seat'],
 'geography-kharadon-s-summit':['Summit'],
 'geography-sparkhaven':['Competitor Dining Hall'],
 'geography-the-first-forge':['First Forge Control Chamber','The First Forge Control Chamber'],
 'history-war-of-the-broken-summit':['Broken Summit'],
 'mythology-kharadon':['Age of Kharadon'],
 'craftsmanship-irons':['Cinderian Brimstone','iron'],
 'craftsmanship-enchantments':['enchantment'],
 'craftsmanship-obsidian-material':['obsidian'],
 'organizations-administrative-council':['Council'],
 'organizations-ascendants-crownless':['Ascendants'],
 'characters-lilith-vanthe':['Lilith','Lily','Lyra Northashe','Pretty'],
 'characters-lyra-acolyte12':['Acolyte12','Lyra','Founder'],
 'characters-lyra-vale':['Ashborn'],
 'characters-travis-pope':['Travis','TPope'],
 'characters-ellen-vale':['Ellen'],
 'characters-draven-vale':['Draven','Daggs'],
 'characters-aeren-vale':['Aeren'],
 'characters-rowden-groves':['Rowden'],
 'characters-lauren':['Stick'],
 'characters-cassian-rourke':['Golden Spark'],
 'terminology-the-daggersmith-title':['Daggersmith'],
 'literature-the-daggersmith-game':['The Daggersmith game','Daggersmith game'],
 'literature-the-daggersmith-literary-work':['The Daggersmith prequel','Daggersmith prequel']
};
for(const [id,names] of Object.entries(proseAliases))for(const name of names)addTerm(name,id,['dagger','iron','enchantment','obsidian'].includes(name)?'lower':'capital');
// Unique character given names are valid shorthand, provided they are capitalized.
const firstNames=new Map();
for(const a of articles.filter(a=>a.category==='Characters')){
 const first=a.title.split(' ')[0];if(!firstNames.has(first))firstNames.set(first,[]);firstNames.get(first).push(a);
}
for(const [first,rows] of firstNames)if(rows.length===1&&rows[0].title!==first)addTerm(first,rows[0].id,'capital');
const unsafeSearchAliases=new Set(['Daggersmith','Founder','Lyra','Pretty','Stick','Unyielding','Ashborn']);
for(const [id,names] of Object.entries(searchNames))for(const name of names)if(!unsafeSearchAliases.has(name))addTerm(name,id,'capital');
// The same phrase can refer to a work, myth, title or material. Keep contextual rules explicit.
addTerm('The First Spark','literature-ignition-the-first-spark','context');
addTerm('First Spark','literature-ignition-the-first-spark','context');
addTerm('The Daggersmith','literature-the-daggersmith-game','context');
addTerm('The Daggersmith','literature-the-daggersmith-literary-work','context');
addTerm('The Daggersmith','terminology-the-daggersmith-title','context');
const reEscape=s=>s.replace(/[.*+?^$(){}|[\]\\]/g,'\\$&');
const termPattern=[...linkTerms.keys()].sort((a,b)=>b.length-a.length).map(k=>reEscape(k).replace(/'/g,"['’‘]")).join('|');
const termRegex=new RegExp('(?<![\\p{L}\\p{N}])(?:'+termPattern+')(?![\\p{L}\\p{N}])','giu');
const mythContext=new Set(['history-age-of-the-first-spark','magic-aether','mythology-eternal-forge','mythology-first-spark','mythology-unshaped-aether']);
function resolveMention(m,value,current){
 const key=termKey(m[0]),name=m[0],id=current?.id;
 const around=value.slice(Math.max(0,m.index-75),m.index+name.length+75);
 const before=value.slice(Math.max(0,m.index-30),m.index),after=value.slice(m.index+name.length,m.index+name.length+45);
 if(key==='first spark'||key==='the first spark'){
  if(mythContext.has(id)||/\b(mythic|primordial|elemental storm|emerged|emergence)\b/i.test(around))return byId.get('mythology-first-spark');
  if(/\b(?:era|described|manuscript|opening work|saga|novel|literary)\b/i.test(around)||id==='organizations-administrative-council')return byId.get('literature-ignition-the-first-spark');
  return null;
 }
 if(key==='the daggersmith'||key==='daggersmith'){
  if(/\b(?:game|simulation|player|craft successor|apprentice)\b/i.test(around)&&!/\bCouncil office\b/i.test(around))return byId.get('literature-the-daggersmith-game');
  if(/\b(?:prequel|novel|literary work|manuscript)\b/i.test(around))return byId.get('literature-the-daggersmith-literary-work');
  if(/^[A-Z]/.test(name.replace(/^the /i,''))&&(/\b(?:Council|title|Administrator|Lilith|office)\b/i.test(around)||id==='terminology-the-daggersmith-title'))return byId.get('terminology-the-daggersmith-title');
  return null;
 }
 if(key==='lyra'&&!['characters-lyra-acolyte12','organizations-administrative-council','organizations-fyi'].includes(id)&&!/\b(?:Acolyte12|Founder of FYI|founded FYI)\b/i.test(around))return null;
 if(key==='founder'&&!/\b(?:Council|FYI|Lyra|Acolyte12)\b/i.test(around))return null;
 if(key==='obsidian'){
  if(name==='obsidian'||/^\s+(?:heads?|blades?|stone|glass|material|metal)\b/i.test(after))return byId.get('craftsmanship-obsidian-material');
  return byId.get('geography-obsidian');
 }
 if(key==='ashborn'&&name!=='Ashborn')return null;
 if(key==='ascendants'&&/\bAge of\s*$/i.test(before))return null;
 if(['dagger','iron'].includes(key))return null; // ordinary objects aren't necessarily references to the corresponding system
 if(key==='pretty'&&(name!=='Pretty'||/^\s+(?:much|good|well|sure|clear|little|big|small)\b/i.test(after))||key==='stick'&&name!=='Stick')return null;
 if(key==='summit'&&name!=='Summit')return null;
 const candidates=(linkTerms.get(key)||[]).filter(c=>c.mode==='any'||c.mode==='capital'&&/^[A-Z]/.test(name.replace(/^the /i,''))||c.mode==='lower'&&name===name.toLowerCase());
 const unique=[...new Map(candidates.map(c=>[c.target.id,c.target])).values()];
 return unique.length===1?unique[0]:null;
}
function linkedText(value,current=null,format=esc){
 value=String(value);if(typeof format!=='function')format=esc;
 let out='',last=0;
 for(const m of value.matchAll(termRegex)){
  const target=resolveMention(m,value,current);
  if(!target||target.id===current?.id)continue;
  out+=format(value.slice(last,m.index))+'<a class="inline-lore" href="'+link(target)+'">'+format(m[0])+'</a>';last=m.index+m[0].length;
 }
 return out+format(value.slice(last));
}
const kingdomHubs={
 ash:['geography-morrowfall','mythology-veyrath','organizations-house-vale','organizations-house-mourn','organizations-greyhands','characters-lyra-vale','characters-maera-sol'],
 cinder:['geography-brazenhold','mythology-drakhar','organizations-house-drake','organizations-house-mordane','organizations-ironbound','characters-torren-drake'],
 ember:['geography-ember-ridge','mythology-pyrakon','organizations-house-flare','organizations-house-solvar','organizations-kindled','characters-aric-flare'],
 damascus:['geography-serathis','mythology-seraphyne','organizations-house-ardyn','organizations-house-velora','organizations-thousand-hands','characters-selene-ardyn'],
 titanium:['geography-aurelion','mythology-aurelith','organizations-house-rhyne','organizations-house-calix','organizations-sentinel-order','characters-caelor-rhyne'],
 obsidian:['geography-nocthar','mythology-varkyros','organizations-house-voss','organizations-house-vex','organizations-house-noirren','characters-malrek-voss']
};
function kingdomHub(a){
 const ids=a.id==='geography-'+a.slug&&kingdomHubs[a.slug];if(!ids)return '';
 const neighbors=kingdoms.map(([slug])=>bySlug.get(slug)).filter(b=>b&&b.id!==a.id);
 return '<section class="section" id="kingdom-directory" aria-label="Kingdom directory"><h2>Explore '+esc(a.title)+'</h2>'+articleLinks(ids.map(id=>byId.get(id)).filter(Boolean))+'</section>'+
 '<nav class="kingdom-switch" aria-label="Other kingdoms"><a href="/kingdoms">All kingdoms</a>'+neighbors.map(b=>'<a href="'+link(b)+'">'+esc(b.title)+'</a>').join('')+'</nav>';
}
const chronologyGroups=[
 ['Creation and early traditions','Mythological sequence; no fixed absolute dates.',['history-age-of-the-first-spark','mythology-unshaped-aether','mythology-first-spark','mythology-eternal-forge','mythology-kharadon','history-age-of-six-wings','history-war-of-the-six-crowns']],
 ['The founding of the Ladder','0 AL marks the formal founding. Other dates remain approximate or unknown.',['competition-ladder-of-legends','competition-ignition','geography-vaelorian-citadel','history-first-ascension','history-second-descent','history-lost-kael-period']],
 ['The age of champions','Broad historical grouping; the ages may overlap.',['history-age-of-ascendants','history-age-of-champions','history-darian-s-ascension','history-war-of-the-broken-summit']],
 ['Restoration and modern history','The Reforging precedes modern mortal administration.',['history-reforging','history-sanitization-of-history','organizations-administrative-council','competition-kharadon-s-ascension','history-ladder-awakening']]
];
function chronology(){return crumb('History')+pageHeading('Historical reference','Chronology','Explore the broad sequence of Aetherforge history. Myth, provisional accounts and disputed records retain their article scope; this is not a fixed year-by-year timeline.')+
 '<p class="chronology-note"><a href="'+link(byId.get('terminology-calendar-of-aetherforge'))+'">Calendar of Aetherforge · BL and AL</a></p>'+
 chronologyGroups.map(([title,note,ids])=>section('Historical period',title,'<p class="small chronology-note">'+esc(note)+'</p>'+entries(ids.map(id=>byId.get(id)).filter(Boolean),{ranked:true}))).join('')+
 '<p class="section"><a href="'+catLink('History')+'">Browse all history articles →</a></p>'}
// Curated, subject-specific reference fields. Each value must be present verbatim in the subject's published text.
const infoboxFacts={
 'characters-lilith-vanthe':['Character',[['Also known as','Lily'],['Competitive name','Pretty'],['Birth name','Lyra Northashe'],['Occupation','daggersmith'],['Division','Obsidian'],['Caddie','Ellen Vale']]],
 'mythology-kharadon':['Dragon',[['Title','King of Dragons'],['Role','Keeper of the Eternal Forge']]],
 'geography-morrowfall':['Geographic location',[['Role','regional center of Ash']]],
 'organizations-house-vale':['House',[['Kingdom','Ash'],['Known as','the Rebuilders'],['Motto','WE RISE AGAIN'],['Crest','silver ash-leaf']]],
 'artifacts-golden-crucible-dagger':['Artifact',[['Purpose','award for victory in a Crucible']]],
 'competition-ignition':['Competition',[['Role','gateway to the Ladder of Legends'],['Location','Sparkhaven'],['Venue','First Forge']]],
 'history-reforging':['Historical event',[['Event','restoration of the Ladder and its bridges after the Broken Summit']]]
};
Object.assign(infoboxFacts,{"characters-aeren-vale":["Character",[["Origin","Ash-born"],["Occupation","golfer"],["Membership","the Eight"]]],"characters-bustin":["Character",[["Titles","Forge Engineer and Architect of the Forge"],["Affiliation","Administrative Council"]]],"characters-ellen-vale":["Character",[["Origin","Ash-born"],["Occupation","golfer"],["Professional association","Lilith Vanthe’s lifelong caddie"]]],"characters-lyra-acolyte12":["Character",[["Also known as","Acolyte12"],["Titles","Founder of FYI, Sorceress Supreme"],["Affiliation","Administrative Council"]]],"characters-pj":["Character",[["Title","Vaelorian Seer"],["Affiliation","Administrative Council"]]],"characters-soulless":["Character",[["Title","Master of the Inferno"],["Affiliation","Administrative Council"]]],"characters-whiskey":["Character",[["Title","Aetherforge Sentinel"],["Affiliation","Administrative Council"]]],"characters-travis-pope":["Character",[["Competitive name","TPope"],["Origin","Obsidian-born"],["Occupation","golfer"]]],"characters-draven-vale":["Character",[["Competitive name","Daggs"],["Origin","Obsidian"],["Occupation","caddie"]]],"characters-kira":["Character",[["Origin","Ember-born"],["Occupation","smith"]]],"characters-darian-vex":["Character",[["Affiliation","House Vex"]]],"characters-cassian-rourke":["Character",[["Known as","the Golden Spark"],["Occupation","golfer"]]],"characters-lyra-vale":["Character",[["Known as","the Ashborn"],["Role","legendary champion"]]],"characters-rowden-groves":["Character",[["Division","Cinder"],["Occupation","golfer"]]],"artifacts-division-daggers":["Artifact",[["Purpose","progression through the Ladder"]]],"artifacts-kharadon-s-seal":["Artifact",[["Design","seven-pointed forge-star surrounding a central flame"],["Location","First Forge"]]],"artifacts-ancient-inscription":["Artifact",[["Discovery site","First Forge"]]],"competition-crucibles":["Competition",[["Format","competitive tournaments"]]],"competition-dragon-s-ascension":["Competition",[["Format","individual league competition"]]],"competition-aetherforge-inferno":["Competition",[["Format","team competition"],["Overseer","Soulless"]]],"competition-fyi-guilds-season-1":["Competition",[["Start","November 22, 2026"],["Duration","nine weeks"]]],"competition-guild-championship":["Competition",[["Format","season-ending contest"]]],"competition-christmas-exhibition":["Competition",[["Timing","week-five special event"]]]});
Object.assign(infoboxFacts,{"organizations-fyi":["Organization",[["Role","the organization"]]],"organizations-sentinel-order":["Organization",[["Role","an elite institution"]]]});
const kingdomCenters={ash:'Morrowfall',cinder:'Brazenhold',ember:'Ember Ridge',damascus:'Serathis',titanium:'Aurelion',obsidian:'Nocthar'};
for(const [slug,dragon] of kingdoms){
 const a=bySlug.get(slug);
 if(a)infoboxFacts[a.id]=['Kingdom',[['Associated dragon',dragon],['Regional center',kingdomCenters[slug]]]];
 const d=byId.get('mythology-'+dragon.toLowerCase());
 if(d)infoboxFacts[d.id]=['Dragon',[['Kingdom',a.title]]];
 const center=articles.find(x=>x.category==='Geography'&&x.title===kingdomCenters[slug]);
 if(center)infoboxFacts[center.id]=['Geographic location',[['Kingdom',a.title]]];
}
function infoboxData(a){
 const source=[a.description,...a.content.filter(s=>!/^provisional/i.test(s.heading)).map(s=>s.body)].join('\n');
 let fact=infoboxFacts[a.id];
 // Only extract unambiguous, expressly stated house associations and names from approved descriptions.
 if(!fact&&a.category==='Organizations'&&a.title.startsWith('House ')&&a.publication.canon==='Established lore'){
  const m=a.description.match(/\bis associated with (Ash|Cinder|Ember|Damascus|Titanium|Obsidian)\b/);
  if(m)fact=['House',[['Kingdom',m[1]]]];
 }
 if(!fact)return null;
 const [type,rows]=fact;const verified=rows.filter(([,value])=>source.includes(value));
 return verified.length?{type,rows:verified}:null;
}
function infobox(a){
 const info=infoboxData(a);if(!info)return '';
 return '<aside class="infobox'+(kingdomCenters[a.slug]?' k-'+a.slug:'')+'" aria-label="'+esc(info.type)+' infobox"><h2>'+esc(a.title)+'</h2><div class="infobox-type">'+esc(info.type)+'</div><table><tbody>'+info.rows.map(([label,value])=>'<tr><th scope="row">'+esc(label)+'</th><td>'+linkedText(value,a)+'</td></tr>').join('')+'</tbody></table></aside>';
}
function articleToc(a){
 const sections=a.content.map((s,i)=>'<li><a href="#section-'+(i+1)+'">'+esc(s.heading)+'</a></li>').join('');
 const hub=a.id==='geography-'+a.slug&&kingdomHubs[a.slug];
 const relatedIds=a.relatedIds.filter(id=>!hub||!hub.includes(id));
 return '<nav class="article-toc" aria-label="Table of contents"><ol><li><a href="#main">Beginning</a></li>'+sections+(hub?'<li><a href="#kingdom-directory">Explore '+esc(a.title)+'</a></li>':'')+(relatedIds.length?'<li><a href="#see-also">See also</a></li>':'')+'<li><a href="#categories">Categories</a></li></ol></nav>';
}
function articlePage(a){
 const pos=a.description.toLowerCase().indexOf(a.title.toLowerCase());
 const lead=pos<0?'<strong>'+esc(a.title)+'</strong> — '+linkedText(a.description,a):linkedText(a.description.slice(0,pos),a)+'<strong>'+esc(a.description.slice(pos,pos+a.title.length))+'</strong>'+linkedText(a.description.slice(pos+a.title.length),a);
 const contents=a.content.map((s,i)=>'<section id="section-'+(i+1)+'"><h2>'+linkedText(s.heading,a)+'</h2>'+s.body.split(/\n\s*\n/).map(p=>'<p>'+linkedText(p,a)+'</p>').join('')+'</section>').join('');
 const toc=articleToc(a);
 const info=infobox(a);
 return crumb(a.category,a.title)+'<header class="article-head"><h1>'+esc(a.title)+'</h1>'+scope(a)+'</header><details class="mobile-toc"><summary>Contents</summary>'+toc+'</details><article class="article"><p class="lead">'+lead+'</p>'+info+contents+'</article>'+kingdomHub(a)+related(a)+'<nav class="article-categories" id="categories" aria-label="Article categories">Category: <a href="'+catLink(a.category)+'">'+esc(a.category)+'</a></nav>';
}
function home(){
 return '<header class="welcome"><h1>Welcome to Aetherforge Wiki</h1><p>The encyclopedia of Aetherforge, from its kingdoms and ancient mythology to its history, institutions and competitive traditions.</p><p class="small"><a href="/articles">'+articles.length+' articles</a> · <a href="/chronology">Chronology</a> · <a href="/random">Random article</a></p></header><div class="home-columns"><section class="home-section"><h2>Featured lore</h2>'+featured(featuredIds.map(id=>byId.get(id)))+'</section><section class="home-section"><h2>The six kingdoms</h2>'+kingdomCards()+'<p><a href="/kingdoms">Kingdom directory</a></p><h2>Browse by category</h2>'+categoryCards()+'</section></div><p class="scope-note">Article scope labels distinguish established lore, mythological tradition, provisional worldbuilding, literature, and game or league references.</p>';
}
function render(p,q='',category=''){
 q=String(q??'').slice(0,200);category=categories.includes(category)?category:'';
 if(p==='/')return [200,page('Home',home(),{path:p})];
 if(p==='/kingdoms'){const overview=byId.get('culture-society-the-six-kingdoms');return [200,page('Six Kingdoms',crumb() +pageHeading('The world','The Six Kingdoms',overview?.description||'Explore the six kingdoms of Aetherforge.')+kingdomCards()+section('Foundational lore','Explore the world',featured([overview,bySlug.get('ladder-of-legends'),bySlug.get('ascension-bridges'),bySlug.get('sparkhaven')])),{path:p,description:overview?.description})]}
 if(p==='/chronology')return [200,page('Chronology',chronology(),{path:p,description:'Explore the broad historical sequence of Aetherforge.'})];
 if(p==='/articles')return [200,page('All articles',crumb()+pageHeading('Archive index','All articles',articles.length+' entries. Browse alphabetically or search the full encyclopedia.')+directory(articles),{path:p})];
 if(p==='/search'){const found=search(q,category);return [200,page('Search',pageHeading('Discovery','Search','Find articles by title, alternate name, subject or category.')+searchForm(q,category,true)+'<div class="results-heading"><h2>'+found.length+' results</h2><span class="small">'+(q?'For “'+esc(q)+'”':'All articles')+(category?' · '+esc(category):'')+'</span></div>'+entries(found,{ranked:true,q})+(!found.length?'<p class="section"><a href="/articles">Browse all articles</a> · <a href="/kingdoms">Browse kingdoms</a></p>':''),{path:p,q,noindex:true})]}
 if(p==='/random')return [200,page('Random article',pageHeading('Discovery','Discover a random article','A different entry from across the encyclopedia.')+featured([articles[Math.floor(Math.random()*articles.length)]]),{path:p,noindex:true})];
 if(p.startsWith('/category/')){const c=decodeURIComponent(p.slice(10));if(categories.includes(c)){const list=categoryRows.get(c);const chosen=featuredIds.map(id=>byId.get(id)).filter(a=>a&&a.category===c);const spotlight=(chosen.length?chosen: [...list].sort((a,b)=>b.relatedIds.length-a.relatedIds.length||a.title.localeCompare(b.title,'en'))).slice(0,3);return [200,page(c,crumb(c)+pageHeading('Lore category',c,(metadata[c]?.[1]||'Explore this category.')+' '+list.length+' articles.')+(list.length>3?section('Starting points','Explore this category',featured(spotlight)):'')+(c==='History'?'<p class="section"><a class="btn ghost" href="/chronology">Explore chronological history →</a></p>':'')+section('Complete index','All '+c.toLowerCase()+' articles',directory(list)),{path:catLink(c),description:'Explore '+c+' articles in Aetherforge.',noindex:!list.length})]}}
 if(p.startsWith('/wiki/')){const slug=decodeURIComponent(p.slice(6));const a=bySlug.get(slug)||articles.find(x=>x.aliases.includes(slug));if(a)return [200,page(a.title,articlePage(a),{path:link(a),description:a.description,toc:'<h2>Contents</h2>'+articleToc(a)})]}
 return [404,page('Not found',pageHeading('Archive','Article not found','This entry does not exist in the encyclopedia.')+'<a class="btn primary" href="/articles">Browse the archives →</a>',{path:p,noindex:true})];
}
function sitemap(){return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['/','/articles','/kingdoms','/chronology',...visibleCategories.map(catLink),...articles.map(link)].map(p=>'<url><loc>'+esc(origin+p)+'</loc></url>').join('')+'</urlset>'}
const server=http.createServer((req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");res.setHeader('Referrer-Policy','no-referrer');
 const send=(status,body,type='text/html; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type});res.end(req.method==='HEAD'?'':body)};
 if(req.method!=='GET'&&req.method!=='HEAD'){res.setHeader('Allow','GET, HEAD');return send(405,'Method not allowed','text/plain')}
 try{const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/author'||u.pathname==='/author/'||u.pathname==='/author/login'||u.pathname==='/author/articles'){res.writeHead(302,{Location:'/articles'});return res.end()}
 if(u.pathname.startsWith('/author/article/')){const a=byId.get(decodeURIComponent(u.pathname.slice('/author/article/'.length)));if(a){res.writeHead(301,{Location:link(a)});return res.end()}}
 if(u.pathname==='/random'){res.writeHead(302,{Location:link(articles[Math.floor(Math.random()*articles.length)]),'Cache-Control':'no-store'});return res.end()}
 if(u.pathname.startsWith('/media/')){const match=/^\/media\/(vis-[0-9]{3})\.webp$/.exec(u.pathname);const v=match&&visualById.get(match[1]);if(!v)return send(404,'Not found','text/plain; charset=utf-8');res.setHeader('Cache-Control','public, max-age=86400');res.setHeader('Content-Length',v.bytes.length);return send(200,v.bytes,'image/webp')}
 if(u.pathname==='/health')return send(200,JSON.stringify({status:'ok',version:VERSION,articles:articles.length}),'application/json');
 if(u.pathname==='/sitemap.xml')return send(200,sitemap(),'application/xml; charset=utf-8');
 if(u.pathname==='/robots.txt')return send(200,'User-agent: *\nDisallow: /search\nDisallow: /random\nSitemap: '+origin+'/sitemap.xml\n','text/plain; charset=utf-8');
 if(u.pathname==='/favicon.ico'||u.pathname==='/favicon.svg'){res.setHeader('Cache-Control','public, max-age=86400');return send(200,'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="9" fill="#171b22"/><path d="M20 4 34 12v16l-14 8-14-8V12Z M10 28 20 10 30 28 M14 22h12" fill="none" stroke="#d8b977" stroke-width="1.5"/></svg>','image/svg+xml')}
 if(u.pathname.startsWith('/wiki/')){const slug=decodeURIComponent(u.pathname.slice(6));const a=articles.find(x=>x.aliases.includes(slug));if(a){res.writeHead(301,{Location:link(a)});return res.end()}}
 const [status,body]=render(u.pathname,u.searchParams.get('q')||'',u.searchParams.get('category')||'');return send(status,body);
 }catch{return send(400,'Bad request','text/plain')}
});
if(require.main===module)server.listen(Number(process.env.PORT||3000),'0.0.0.0');
module.exports={render,esc,server,search,sitemap,link,catLink,infoboxData,linkedText};
