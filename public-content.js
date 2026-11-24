'use strict';
const data=require('./articles.json');
const allowlist=require('./publication-allowlist.json');
const assert=require('node:assert/strict');
const categories=['Mythology','Geography','Competition','World & Society','History','Characters','Organizations','Culture & Society','Craftsmanship','Artifacts','Magic','Literature','Terminology'];
const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
function keys(o,expected){assert.ok(o&&typeof o==='object'&&!Array.isArray(o));assert.deepEqual(Object.keys(o).sort(),[...expected].sort(),'Unexpected or missing publication field')}
function validate(d,allow){
  keys(d,['articles']);keys(allow,['ids']);assert.ok(Array.isArray(d.articles)&&Array.isArray(allow.ids));
  const approved=new Set(allow.ids),ids=new Set(),routes=new Set();
  assert.equal(approved.size,allow.ids.length);for(const id of approved)assert.match(id,slugPattern);
  for(const a of d.articles){
    keys(a,['id','title','slug','category','description','content','relatedIds','aliases','publication']);
    assert.ok(approved.has(a.id),'Article not on publication allowlist');
    assert.match(a.id,slugPattern);assert.match(a.slug,slugPattern);assert.ok(!ids.has(a.id));ids.add(a.id);
    assert.ok(nonempty(a.title)&&nonempty(a.description)&&categories.includes(a.category));
    keys(a.publication,['status','canon']);assert.ok(['legacy_public','author_approved'].includes(a.publication.status));assert.ok(nonempty(a.publication.canon));
    assert.ok(Array.isArray(a.content)&&Array.isArray(a.relatedIds)&&Array.isArray(a.aliases));
    for(const s of a.content){keys(s,['heading','body']);assert.ok(nonempty(s.heading)&&nonempty(s.body))}
    for(const s of [a.slug,...a.aliases]){assert.match(s,slugPattern);assert.ok(!routes.has(s),'Duplicate route');routes.add(s)}
    assert.equal(new Set(a.relatedIds).size,a.relatedIds.length);
  }
  assert.deepEqual([...ids].sort(),[...approved].sort(),'Allowlist and dataset disagree');
  for(const a of d.articles)for(const id of a.relatedIds){assert.ok(id!==a.id&&ids.has(id),'Related article is not published')}
  return d.articles;
}
const articles=validate(data,allowlist);
module.exports={articles,categories,validate};
