'use strict';
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');const cheerio=require('cheerio');
const root=path.resolve(__dirname,'..','dist');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(item=>item.isDirectory()?walk(path.join(dir,item.name)):[path.join(dir,item.name)]);
const files=walk(root), errors=[];let pages=0,schemas=0,links=0;
const exists=url=>{let p;try{p=decodeURIComponent(new URL(url,'https://planbcareers.in').pathname);}catch{return null;}const candidate=path.join(root,p==='/'?'index.html':p.replace(/^\//,''));return [candidate,candidate+'.html',path.join(candidate,'index.html')].find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());};
for(const file of files){
 const rel=path.relative(root,file);
 if(/(?:^|\/)(?:node_modules|lib|data|api|docs|tests|\.git)(?:\/|$)|\.(?:sqlite|gs|env|md)$|(?:^|\/)(?:server|database)\.js$|images\/(?:team|salary|receipts|offer-letters|payment-proofs|certificates|reviews)\//.test(rel))errors.push('Private file published: '+rel);
 if(!rel.endsWith('.html')||rel.startsWith('google'))continue;
 pages++;const $=cheerio.load(fs.readFileSync(file,'utf8'));
 if($('h1').length!==1)errors.push(rel+': requires one H1');
 if(!$('title').text().trim()||!$('meta[name="description"]').attr('content'))errors.push(rel+': missing title/description');
 if(!rel.startsWith('admin/')&&!$('link[rel="canonical"]').attr('href')?.startsWith('https://planbcareers.in/'))errors.push(rel+': invalid canonical');
 const ids=new Set();$('[id]').each((_,el)=>{const id=$(el).attr('id');if(ids.has(id))errors.push(rel+': duplicate ID '+id);ids.add(id);});
 $('script[type="application/ld+json"]').each((_,el)=>{try{const value=JSON.parse($(el).html());schemas++;const inspect=(node)=>{if(!node||typeof node!=='object')return;for(const [key,item] of Object.entries(node)){if(['url','logo','contentUrl'].includes(key)&&typeof item==='string'&&item.startsWith('https://planbcareers.in')&&!exists(item))errors.push(rel+': missing schema URL '+item);if(typeof item==='object')inspect(item);}};inspect(value);}catch{errors.push(rel+': invalid JSON-LD');}});
 $('[href],[src]').each((_,el)=>{const attr=$(el).attr('href')??$(el).attr('src');if(!attr||attr==='#'){errors.push(rel+': empty link');return;}if(/^(?:https?:|mailto:|tel:|data:|javascript:)/.test(attr))return;
  links++;const origin='https://planbcareers.in/'+(rel==='index.html'?'':rel.replace(/\.html$/,''));const url=new URL(attr,origin),target=exists(url.href);
  if(!target){errors.push(rel+': missing target '+attr);return;}
  if(url.hash&&target.endsWith('.html')){const other=cheerio.load(fs.readFileSync(target,'utf8'));const id=decodeURIComponent(url.hash.slice(1));if(!other('[id]').toArray().some(el=>other(el).attr('id')===id))errors.push(rel+': missing fragment '+attr);}
 });
}
for(const xml of ['sitemap.xml','sitemap-jobs.xml']){const text=fs.readFileSync(path.join(root,xml),'utf8');for(const match of text.matchAll(/<loc>([^<]+)<\/loc>/g)){const target=exists(match[1]);if(!target)errors.push(xml+': target absent '+match[1]);else {const $=cheerio.load(fs.readFileSync(target,'utf8'));if(/noindex/i.test($('meta[name="robots"]').attr('content')||''))errors.push(xml+': noindex target '+match[1]);if($('link[rel="canonical"]').attr('href')!==match[1])errors.push(xml+': canonical mismatch '+match[1]);}}}
if(errors.length){console.error([...new Set(errors)].join('\n'));process.exit(1);}
assert(files.length>50);console.log(`Validated ${pages} pages, ${schemas} JSON-LD blocks and ${links} internal links/assets. No private files or broken targets.`);
