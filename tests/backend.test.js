'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const bcrypt = require('bcryptjs');
const directory = fs.mkdtempSync(path.join(os.tmpdir(),'planb-backend-test-'));
for (const key of ['APPLICATION_ID_SECRET','VERCEL','LIBSQL_URL','TURSO_DATABASE_URL','LIBSQL_AUTH_TOKEN','TURSO_AUTH_TOKEN','GOOGLE_APPS_SCRIPT_SECRET','GMAIL_USER','GMAIL_PASS','SMTP_USER','SMTP_PASS']) delete process.env[key];
Object.assign(process.env,{ NODE_ENV:'test', DATABASE_PATH:path.join(directory,'test.sqlite'), JWT_SECRET:'test-only-secret-with-more-than-thirty-two-characters', ADMIN_USERNAME:'test-admin', ADMIN_PASSWORD_HASH:bcrypt.hashSync('test-password-123',4) });
const app = require('../server');
const db = require('../database');
const helpers = require('../lib/intake');
let server,base,cookie;
const pdf=Buffer.from('%PDF-1.4\nSynthetic test document.\n%%EOF');
async function request(route,options={}){const response=await fetch(base+route,options);const content=await response.text();let body;try{body=JSON.parse(content);}catch{body=content;}return{response,body};}
function form(fields={},file=pdf,name='test.pdf'){
    const body=new FormData();for(const [key,value]of Object.entries({name:'Synthetic Applicant',mobile:'9999999999',city:'Akola',email:'',application_id:'client-selected-id',...fields}))body.append(key,value);
    body.append('resume',new Blob([file],{type:'application/pdf'}),name);return body;
}
const json=(body,authorized=false)=>({method:'POST',headers:{'Content-Type':'application/json',...(authorized?{Cookie:cookie}:{})},body:JSON.stringify(body)});
test.before(async()=>{await db.ready;assert.equal(db.available,true);server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));base='http://127.0.0.1:'+server.address().port;});
test.after(async()=>{await new Promise(resolve=>server.close(resolve));await db.close();fs.rmSync(directory,{recursive:true,force:true});});

test('private source files, database and configuration never become public static files',async()=>{
    for(const route of ['/server.js','/database.js','/.env','/planb.sqlite','/package.json','/google-apps-script-code.gs','/lib/database-adapter.js','/data/site-facts.json','/.git/config']){
        const {response,body}=await request(route);assert.equal(response.status,404,route);assert.doesNotMatch(String(body),/supersecretplanbkey|CREATE TABLE|GOOGLE_APPS_SCRIPT_SECRET/,route);
    }
    const {response}=await request('/');assert.equal(response.status,200);assert.equal(response.headers.has('ratelimit'),false,'static navigation must not consume the API quota');
    assert.equal((await request('/this-page-does-not-exist')).response.status,404);
    assert.equal((await request('/this-page-does-not-exist.html',{redirect:'manual'})).response.status,404);
});
test('canonical open jobs match their source IDs and reject closed/pending applications',async()=>{
    const {body}=await request('/api/jobs');assert.ok(body.length>0);assert.ok(body.every(job=>job.status==='Open'));assert.ok(!body.some(job=>[2,3,4,5,18,19,21,22,23].includes(job.id)));
    const actual=(await db.query('SELECT id FROM jobs ORDER BY id')).rows.map(row=>row.id);const expected=require('../jobs.json').map(job=>job.id).sort((a,b)=>a-b);assert.deepEqual(actual,expected);
    for(const id of [2,3,4,5,18,19,21,22,23])assert.equal((await request('/api/applications',{method:'POST',body:form({job_id:String(id)})})).response.status,409);
    assert.equal((await request('/api/applications',{method:'POST',body:form({job_id:'999999'})})).response.status,404);
});
test('admin actions require a real configured account and use an HttpOnly session',async()=>{
    assert.equal((await request('/api/admin/test-email')).response.status,401);
    assert.equal((await request('/api/indexnow/submit',json({urls:['https://planbcareers.in/']}))).response.status,401);
    assert.equal((await request('/api/admin/login',json({username:'admin',password:'admin123'}))).response.status,401);
    const login=await request('/api/admin/login',json({username:'test-admin',password:'test-password-123'}));assert.equal(login.response.status,200);assert.equal(login.body.token,undefined);
    const header=login.response.headers.get('set-cookie');assert.match(header,/HttpOnly/i);assert.match(header,/SameSite=Strict/i);cookie=header.split(';')[0];
    assert.equal((await request('/api/admin/session',{headers:{Cookie:cookie}})).body.authenticated,true);
    const diagnostic=await request('/api/admin/test-email',{headers:{Cookie:cookie}});assert.equal(diagnostic.body.configured,false);assert.match(diagnostic.body.message,/No email was sent/);
    assert.equal((await request('/api/jobs',json({title:'Silent drift'},true))).response.status,409);
    assert.equal((await request('/api/admin/team',{...json({name:'Test',designation:'Test'},true),headers:{'Content-Type':'application/json',Cookie:cookie,Origin:'https://untrusted.example'}})).response.status,403);
});
test('application save is durable, retries bind to the whole payload and private resumes are never leaked',async()=>{
    const original=await request('/api/applications',{method:'POST',body:form()});assert.equal(original.response.status,201);assert.match(original.body.applicationId,/^PB-[A-F0-9]{32}$/);assert.equal(original.body.resumeUrl,undefined);assert.equal(original.body.resume_url,undefined);assert.equal(original.body.notifications.admin,'not_configured');
    const retry=await request('/api/applications',{method:'POST',body:form()});assert.equal(retry.body.applicationId,original.body.applicationId);assert.equal(retry.body.duplicate,true);assert.equal(retry.body.notifications.admin,'not_repeated');
    const collision=await request('/api/applications',{method:'POST',body:form({name:'Different Synthetic Applicant',mobile:'8888888888'})});assert.equal(collision.response.status,201);assert.notEqual(collision.body.applicationId,original.body.applicationId);
    assert.equal((await db.query('SELECT COUNT(*) AS n FROM applications')).rows[0].n,2);
    const resumeRoute='/api/admin/applications/'+original.body.applicationId+'/resume';assert.equal((await request(resumeRoute)).response.status,401);
    const resume=await request(resumeRoute,{headers:{Cookie:cookie}});assert.equal(resume.response.status,200);assert.equal(resume.body,pdf.toString());assert.match(resume.response.headers.get('content-disposition'),/attachment/);
    const file=(await db.query('SELECT id FROM stored_files WHERE private=1 LIMIT 1')).rows[0];assert.equal((await request('/api/media/'+file.id)).response.status,404);
    const lookup=await request('/api/trust/verify-candidate?q=1');assert.equal(lookup.response.status,410);assert.doesNotMatch(JSON.stringify(lookup.body),/Synthetic|9999999999/);
});
test('resume validation and request limits reject disguised or oversized files',async()=>{
    assert.equal((await request('/api/applications',{method:'POST',body:form({},Buffer.from('<script>bad</script>'),'test.pdf')})).response.status,400);
    assert.equal((await request('/api/applications',{method:'POST',body:form({},Buffer.alloc(5*1024*1024+1),'large.pdf')})).response.status,413);
    assert.equal((await request('/api/applications',{method:'POST',body:form({},pdf,'test.svg')})).response.status,400);
    assert.equal((await request('/api/applications',{method:'POST',body:form({},Buffer.from('504b03040000000000000000000000000000000000000000','hex'),'disguised.docx')})).response.status,400);
});
test('admission field aliases persist honestly and supply the same WhatsApp link contract',async()=>{
    const result=await request('/api/admission-enquiries',json({student_name:'Synthetic Student',mobile:'9999999999',whatsapp:'8888888888',interested_course:'Test Course'}));assert.equal(result.response.status,201);assert.equal(result.body.whatsappUrl,result.body.admin_whatsapp_link);
    const saved=(await db.query('SELECT whatsapp_number FROM admission_enquiries')).rows[0];assert.equal(saved.whatsapp_number,'8888888888');
});
test('media bytes are stored and served durably without local upload files',async()=>{
    const image=await require('sharp')({create:{width:2,height:2,channels:3,background:'#ffffff'}}).png().toBuffer();
    const body=new FormData();body.append('category','Office Photos');body.append('files',new Blob([image],{type:'image/png'}),'test.png');
    const result=await request('/api/admin/media',{method:'POST',headers:{Cookie:cookie},body});assert.equal(result.response.status,201);const file=result.body.files[0];
    const media=await fetch(base+file.url);assert.equal(media.status,200);assert.equal(media.headers.get('content-type'),'image/webp');assert.ok((await media.arrayBuffer()).byteLength>0);
    const removed=await request('/api/admin/media/'+file.id,{method:'DELETE',headers:{Cookie:cookie}});assert.equal(removed.response.status,200);assert.equal((await request(file.url)).response.status,404);
});
test('serverless without persistent storage fails closed rather than reporting a saved record',()=>{
    const childScript=`const app=require('./server');const server=app.listen(0,'127.0.0.1',async()=>{const base='http://127.0.0.1:'+server.address().port;const form=new FormData();for(const[k,v]of Object.entries({name:'Synthetic',mobile:'9999999999',city:'Akola'}))form.append(k,v);form.append('resume',new Blob(['%PDF-1.4 test']),'test.pdf');const application=await fetch(base+'/api/applications',{method:'POST',body:form});const admission=await fetch(base+'/api/admission-enquiries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({student_name:'Synthetic',mobile:'9999999999',whatsapp:'8888888888'})});const login=await fetch(base+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});console.log(JSON.stringify({application:application.status,applicationBody:await application.json(),admission:admission.status,admissionBody:await admission.json(),login:login.status,mode:require('./database').mode}));server.close();});`;
    const result=spawnSync(process.execPath,['-e',childScript],{cwd:path.join(__dirname,'..'),env:{...process.env,NODE_ENV:'production',VERCEL:'1',JWT_SECRET:''},encoding:'utf8',timeout:20000});assert.equal(result.status,0,result.stderr);const output=JSON.parse(result.stdout.trim());assert.equal(output.mode,'unavailable');assert.equal(output.application,503);assert.equal(output.applicationBody.success,false);assert.equal(output.admission,503);assert.equal(output.admissionBody.success,false);assert.equal(output.admissionBody.fallback.requires_send,true);assert.match(output.admissionBody.whatsappUrl,/wa.me/);assert.equal(output.login,503);
});
test('libSQL adapter uses real remote transactions and rejects ephemeral file URLs',async()=>{
    const calls=[];const context={module:{exports:{}},process:{env:{VERCEL:'1',LIBSQL_URL:'libsql://synthetic.example',LIBSQL_AUTH_TOKEN:'test'}},require:name=>name==='@libsql/client'?{createClient:()=>({execute:async statement=>{calls.push(statement);return{rows:[{value:'stored'}],lastInsertRowid:7n,rowsAffected:1};},batch:async(statements,mode)=>calls.push({statements,mode}),close:()=>{}})}:require(name)};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../lib/database-adapter.js'),'utf8'),context);const remote=context.module.exports.createDatabase();assert.equal(remote.mode,'libsql');assert.equal((await remote.execute('SELECT value')).rows[0].value,'stored');await remote.batch([{sql:'INSERT INTO records VALUES (?)',args:['synthetic']}]);assert.equal(calls[1].mode,'write');await remote.close();context.process.env.LIBSQL_URL='file:/tmp/ephemeral.db';assert.throws(()=>context.module.exports.createDatabase(),/remote/);
});
test('spreadsheet intake escapes formulas and rejects a colliding application fingerprint',()=>{
    const source=fs.readFileSync(path.join(__dirname,'../google-apps-script-code.gs'),'utf8');const existingId='PB-'+'A'.repeat(32);let writes=0;
    const existing=Array(19).fill('');existing[0]=existingId;existing[11]='private.pdf';existing[12]='https://drive.google.com/private-other-candidate';existing[18]='b'.repeat(64);
    const context={PropertiesService:{getScriptProperties:()=>({getProperty:key=>({API_SECRET:'test',SPREADSHEET_ID:'synthetic',DRIVE_FOLDER_ID:'synthetic'}[key]||'')})},ContentService:{MimeType:{JSON:'json'},createTextOutput:value=>({setMimeType:()=>value})},LockService:{getScriptLock:()=>({waitLock:()=>{},releaseLock:()=>{}})},SpreadsheetApp:{openById:()=>({getSheetByName:()=>({getLastRow:()=>2,getRange:(r,c,rs,cs)=>({getValues:()=>cs===1?[[existingId]]:[existing]}),appendRow:()=>{writes++;}})})}};
    vm.runInNewContext(source,context);assert.equal(context.safeCell_('  =HYPERLINK("bad")'),"'  =HYPERLINK(\"bad\")");assert.equal(context.safeCell_('+123'),"'+123");assert.equal(context.safeCell_('normal'),'normal');
    const result=JSON.parse(context.doPost({postData:{contents:JSON.stringify({secret:'test',applicationId:existingId,requestHash:'a'.repeat(64)})}}));assert.equal(result.success,false);assert.equal(result.resumeUrl,undefined);assert.equal(writes,0);
    assert.equal(helpers.safeCell('\t@SUM(1)'),"'\t@SUM(1)");
});

test('email status waits for transport acceptance and reports failures honestly',async()=>{
    let acceptAdmin, rejectApplicant, completed=false;
    const context={module:{exports:{}},Buffer,process:{env:{SMTP_USER:'synthetic@example.test',SMTP_PASS:'synthetic-password'}},console:{warn:()=>{}},require:name=>name==='nodemailer'?{createTransport:()=>({sendMail:message=>new Promise((resolve,reject)=>{if(message.to==='candidate@example.test')rejectApplicant=reject;else acceptAdmin=resolve;})})}:require(name)};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../lib/intake.js'),'utf8'),context);
    const pending=context.module.exports.notifyApplication({name:'Synthetic',mobile:'9999999999',email:'candidate@example.test',city:'Akola',role:'Test'},null,'PB-TEST').then(value=>{completed=true;return value;});
    await Promise.resolve();assert.equal(completed,false);acceptAdmin({accepted:['admin@example.test']});rejectApplicant(new Error('simulated SMTP failure'));
    const result=await pending;assert.equal(result.admin,'sent');assert.equal(result.applicant,'failed');
});

test('legacy pages redirect directly and only the approved resume template can be downloaded',async()=>{
    for(const [oldPath,newPath] of Object.entries({'connect':'/contact','apply-admission':'/admissions#enquiry','admissions-impact':'/admissions','jobs-impact':'/jobs','women-wfh-impact':'/women-wfh','students-earning-impact':'/jobs/freshers'})){
        for(const suffix of ['', '.html']){const result=await request('/'+oldPath+suffix,{redirect:'manual'});assert.equal(result.response.status,301);assert.equal(result.response.headers.get('location'),newPath);}
    }
    const template='/resources/Plan_B_Careers_ATS_Resume_Template_Branded.docx';
    if(fs.existsSync(path.join(__dirname,'..',template))) assert.equal((await request(template)).response.status,200);
    assert.equal((await request('/resources/private.docx')).response.status,404);
    assert.equal((await request('/resources/resume-guide')).response.status,200);
    assert.deepEqual((await request('/api/images/offer-letters')).body,[]);
    assert.equal((await request('/api/images/unknown-private-folder')).response.status,404);
});

test('migration revokes the historical administrator password without inventing a replacement',()=>{
    const childScript=`const sqlite=require('sqlite3');const bcrypt=require('bcryptjs');const connection=new sqlite.Database(process.env.DATABASE_PATH);connection.serialize(()=>{connection.run('CREATE TABLE admins (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT)');connection.run('INSERT INTO admins (id,username,password) VALUES (1,?,?)',['admin',bcrypt.hashSync('admin123',4)],error=>{if(error)throw error;connection.close(async()=>{const db=require('./database');await db.ready;const result=await db.query('SELECT COUNT(*) AS count FROM admins');console.log(JSON.stringify(result.rows[0]));await db.close();});});});`;
    const result=spawnSync(process.execPath,['-e',childScript],{cwd:path.join(__dirname,'..'),env:{...process.env,DATABASE_PATH:path.join(directory,'legacy.sqlite'),ADMIN_USERNAME:'admin',ADMIN_PASSWORD_HASH:bcrypt.hashSync('admin123',4)},encoding:'utf8',timeout:10000});assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout.trim()).count,0);
});

test('every Script intake path requires version 2 and probes the deployment before sending personal data',async()=>{
    const calls=[];
    const env={GOOGLE_APPS_SCRIPT_SECRET:'synthetic-only-test-secret',GOOGLE_APPS_SCRIPT_VERSION:''};
    let probeVersion=1,receiptVersion=2;
    const id='PB-'+'C'.repeat(32);
    const context={module:{exports:{}},Buffer,AbortSignal,process:{env},console:{error:()=>{}},require,fetch:async(url,options)=>{
        calls.push({url,options});
        return {ok:true,json:async()=>options.method==='POST'?{success:true,version:receiptVersion,applicationId:id,resumeUrl:'https://drive.google.com/private-synthetic'}:{success:true,version:probeVersion}};
    }};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../lib/intake.js'),'utf8'),context);
    const intake=context.module.exports;
    assert.equal(intake.gasConfigured(),false);
    await assert.rejects(intake.submitToGoogleAppsScript({applicationId:id,name:'Synthetic'}),error=>error.status===503);
    assert.equal(calls.length,0,'secret-only configuration must not contact the legacy Script');
    env.GOOGLE_APPS_SCRIPT_VERSION='2';assert.equal(intake.gasConfigured(),true);
    await assert.rejects(intake.submitToGoogleAppsScript({applicationId:id,name:'Synthetic'}),error=>error.code==='STORAGE_NOT_CONFIRMED');
    assert.equal(calls.length,1);assert.equal(calls[0].options.body,undefined,'version probe contains no candidate data');
    assert.equal(calls[0].options.method,undefined,'an old version is rejected before a POST');
    probeVersion=2;receiptVersion=1;calls.length=0;
    await assert.rejects(intake.submitToGoogleAppsScript({applicationId:id,name:'Synthetic'}),error=>error.code==='STORAGE_NOT_CONFIRMED');
    assert.equal(calls.length,2,'version 2 was checked before POST');
    receiptVersion=2;calls.length=0;
    const accepted=await intake.submitToGoogleAppsScript({applicationId:id,name:'Synthetic'});
    assert.equal(accepted.applicationId,id);assert.equal(accepted.version,2);
    assert.equal(calls[1].options.method,'POST');
});

test('production intake requires a stable retry secret even when durable storage is available',()=>{
    const childScript=`const databasePath=require.resolve('./database');require.cache[databasePath]={id:databasePath,filename:databasePath,loaded:true,exports:{ready:Promise.resolve(),available:true,mode:'synthetic',query:async()=>{throw new Error('No storage call is allowed in this configuration test');}}};const app=require('./server');const server=app.listen(0,'127.0.0.1',async()=>{const base='http://127.0.0.1:'+server.address().port;const health=await fetch(base+'/api/health');const result=await fetch(base+'/api/applications',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});console.log(JSON.stringify({health:await health.json(),status:result.status,body:await result.json()}));server.close();});`;
    const result=spawnSync(process.execPath,['-e',childScript],{cwd:path.join(__dirname,'..'),env:{...process.env,NODE_ENV:'production',VERCEL:'1',APPLICATION_ID_SECRET:'',JWT_SECRET:'',GOOGLE_APPS_SCRIPT_SECRET:''},encoding:'utf8',timeout:10000});assert.equal(result.status,0,result.stderr);const output=JSON.parse(result.stdout.trim());assert.equal(output.health.storageAvailable,true);assert.equal(output.health.applicationIntakeAvailable,false);assert.equal(output.status,503);assert.equal(output.body.success,false);assert.equal(output.body.code,'STORAGE_CONFIGURATION');
});
