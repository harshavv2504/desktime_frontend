// Isolated browser QA. All API writes are intercepted; production data is never changed.
import { chromium } from 'playwright-core';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const output=resolve(process.env.QA_OUTPUT || '../../artifacts/dashboard-qa');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const failures=[];const screenshots=[];
page.on('pageerror',e=>failures.push(e.message));
let loggedIn=false,empty=false,failSave=false,rules=[];
const now=new Date().toISOString();
const devices=['Maya Sharma','Arjun Rao','Priya Nair'].map((name,i)=>({employee_id:`EMP00${i+1}`,employee_name:name,id:`device-${i}`,revoked:false,last_seen:now,state:i===2?'idle':'active',app:'Code.exe'}));
const events=Array.from({length:42},(_,i)=>({...devices[i%3],device_id:`device-${i%3}`,id:`event-${i}`,start:new Date(Date.UTC(2026,9,5,4,0,i*10)).toISOString(),end:new Date(Date.UTC(2026,9,5,4,0,i*10+10)).toISOString(),seconds:10,state:i%8===0?'idle':'active',app:i%2?'chrome.exe':'Code.exe',domain:i%2?'github.com':'',window_title:i%2?'':'C:\\Voicedots\\workspace\\frontend\\src\\Dashboard.tsx | Voicedots | Visual Studio Code',project:'Voicedots dashboard',task:'Workspace improvements',category:i%3?'productive':'unrated',verification_signals:i===2?[{kind:'bounded_pointer',window_seconds:300,span_x_px:32,span_y_px:17,sample_count:61}]:[]}));
const attendance=devices.map((d,i)=>({...d,date:'2026-10-05',first:events[0].start,last:now,active:18000+i*1000,idle:800,locked:300,paused:1800,unknown:600,productive:14000,neutral:1500,unproductive:1000,unrated:1500+i*1000,credited:19000,required:28800,remaining:9800,productivity:72.5,effectiveness:48.6,lunch:1800,break:600,break_overrun:0}));
const policy={work_start:'09:00',work_end:'18:45',work_days:[0,1,2,3,4,5],holidays:[],idle_seconds:300,retention_days:90,screenshot_seconds:300,screenshot_retention_days:30,minimum_minutes:480,lunch_minutes:30,break_minutes:15,credit_idle:false,lunch_paid:true,break_paid:false};
let image='';
await page.route('**/qa-video.mp4',async route=>route.fulfill({contentType:'video/mp4',body:await readFile(resolve('tools/fixtures/recording.mp4'))}));
await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname.split('/api/')[1];const post=route.request().method()==='POST';let status=200,data={};
  if(path==='session'&&!loggedIn){status=401;data={error:'Sign in required'};}
  else if(path==='login'){loggedIn=true;data={username:'admin',csrf:'qa-only',server_url:'https://api.example.test'};}
  else if(path==='session')data={username:'admin',csrf:'qa-only',server_url:'https://api.example.test'};
  else if(path==='devices')data={devices:empty?[]:devices};
  else if(path==='report')data={events:empty?[]:events,attendance:empty?[]:attendance};
  else if(path==='recordings')data={recordings:empty?[]:[{id:'clip-1',employee_id:'EMP001',time:now,duration:120,signals:[{kind:'bounded_pointer',window_seconds:300,span_x_px:20,span_y_px:30,sample_count:61}]}]};
  else if(path==='recording')data={url:'http://127.0.0.1:5174/qa-video.mp4'};
  else if(path==='screenshots')data={screenshots:empty?[]:[{id:'shot-1',employee_id:'EMP001',time:now},{id:'shot-2',employee_id:'EMP001',time:new Date(Date.now()-300000).toISOString()},{id:'shot-3',employee_id:'EMP002',time:now}]};
  else if(path==='policy') {if(post)Object.assign(policy,route.request().postDataJSON());data={policy};}
  else if(path==='categories') {if(post){if(failSave){status=500;data={error:'Could not save rules. Please retry.'};}else rules=route.request().postDataJSON();}if(status===200)data={categories:rules};}
  else if(path==='projects')data={projects:['Voicedots dashboard','Customer onboarding']};
  else if(path==='invite')data={code:'DEMO-ENROLLMENT-CODE'};
  else if(path==='audit')data={audit:[{time:now,action:'policy',detail:'Updated daily work target to 8 hours.'}]};
  else if(path==='shot')data={image};
  else if(path==='logout'){loggedIn=false;}
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
});
async function capture(name){
  await page.evaluate(()=>document.fonts.ready);
  await page.mouse.move(0,0);
  await page.screenshot({path:resolve(output,name+'.png'),fullPage:true,animations:'disabled'});screenshots.push(name);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
  assert(!overflow,`${name}: horizontal page overflow`);
  if(await page.locator('dialog[open]').count()) {
    const original=page.viewportSize();
    for(const size of [{width:1920,height:1080},{width:1280,height:720}]) {
      await page.setViewportSize(size);
      await page.screenshot({path:resolve(output,`${name}-${size.width}.png`),fullPage:true,animations:'disabled'});
      screenshots.push(`${name}-${size.width}`);
      const box=await page.locator('dialog[open]').boundingBox();
      assert(box.x>=0&&box.y>=0&&box.x+box.width<=size.width+1&&box.y+box.height<=size.height+1,`${name}: dialog outside viewport`);
      assert(await page.locator('dialog[open] .dialog-heading').isVisible());
    }
    await page.setViewportSize(original);
  }

}
async function auditSelects(context){
 const original=page.viewportSize();
 for(const size of [{width:1920,height:1080},{width:1280,height:720}]){
  await page.setViewportSize(size);
  const selects=page.locator('dialog[open]').count().then(n=>n?page.locator('dialog[open] select:visible'):page.locator('main select:visible'));
  const list=await selects;
  for(let i=0;i<await list.count();i++){
   const control=list.nth(i);await control.scrollIntoViewIfNeeded();
   assert.equal(await control.evaluate(e=>getComputedStyle(e).appearance),'base-select');
   const value=await control.inputValue();await control.click();
   assert(await control.evaluate(e=>e.matches(':open')));
   const name=`open-${context}-${i}-${size.width}`;
   await page.screenshot({path:resolve(output,name+'.png')});screenshots.push(name);
   const options=control.locator('option');const box=await options.first().boundingBox();
   assert(box&&box.x>=0&&box.x+box.width<=size.width+1,`${name}: clipped menu`);
   await page.keyboard.press('Escape');assert.equal(await control.inputValue(),value);
   assert(!await control.evaluate(e=>e.matches(':open')));
   if(await page.locator('dialog[open]').count())assert(await page.locator('dialog[open]').isVisible());
  }
 }
 await page.setViewportSize(original);
}
const nav=async title=>{await page.getByRole('navigation',{name:'Workspace'}).getByRole('button',{name:title,exact:true}).click();await page.getByRole('heading',{name:title,level:1}).waitFor();};
const close=async()=>page.getByRole('button',{name:'Close dialog'}).click();
try {
 await page.goto('http://127.0.0.1:5174');await page.getByLabel('Username').waitFor();await capture('01-login');
 image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1100;c.height=620;const x=c.getContext('2d');x.fillStyle='#20212b';x.fillRect(0,0,1100,620);x.fillStyle='#30313c';x.fillRect(0,0,1100,45);x.font='18px monospace';x.fillStyle='#b6a1dc';x.fillText('VISUAL QA FIXTURE — not an employee screenshot',25,30);x.fillStyle='#d9cee8';['Dashboard.tsx','', 'export default function Dashboard() {','  return <Workspace title="Voicedots" />;','}'].forEach((t,i)=>x.fillText(t,60,100+i*35));return c.toDataURL('image/png').split(',')[1];});
 await page.getByLabel('Username').fill('qa-manager');await page.getByLabel('Password',{exact:true}).fill('fixture-only-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByText('Employee work targets').waitFor();
 await auditSelects('employee-filter');
 const pages=['Overview','Team & devices','Attendance','Apps & websites','Productivity rules','Activity timeline','Projects & tasks','Screenshots','Workspace settings'];
 for(let i=0;i<pages.length;i++){await nav(pages[i]);await capture(`desktop-${i+1}-${pages[i].replace(/[^a-z]/gi,'-')}`);}
 for(const name of ['Targets & breaks','Tracking & storage']){await page.getByRole('tab',{name}).click();await capture('desktop-settings-'+name.split(' ')[0]);}
 await page.getByRole('tab',{name:'Targets & breaks'}).click();await page.getByLabel(/Minimum work hours per day/).fill('7.5');await page.getByRole('button',{name:'Save work policy'}).click();await page.getByText('Work policy saved.').waitFor();assert.equal(policy.minimum_minutes,450);
 await page.getByRole('button',{name:'Add employee',exact:true}).first().click();await capture('dialog-invite');await page.getByLabel('Employee name').fill('QA User');await page.getByLabel('Employee ID',{exact:true}).fill('QA001');await page.getByRole('button',{name:'Create enrollment code'}).click();await page.getByText('DEMO-ENROLLMENT-CODE').waitFor();await capture('dialog-enrollment-code');await close();
 for(const [button,name] of [['Manage projects','projects'],['Change password','password'],['View audit log','audit'],['Whitelist apps & sites →','classification']]){await page.getByRole('button',{name:button,exact:true}).click();if(name==='audit')await page.getByText('Updated daily work target to 8 hours.').waitFor();await capture('dialog-'+name);await close();}
 await nav('Screenshots');await page.getByRole('button',{name:'Watch recording'}).click();await page.locator('video').evaluate(v=>new Promise(resolve=>{if(v.readyState>=1)resolve();else v.onloadedmetadata=resolve;}));assert.equal(await page.locator('video').evaluate(v=>v.duration),120);await page.locator('video').evaluate(v=>{v.currentTime=20;});await capture('verification-video-player');await page.getByRole('button',{name:'Close recording'}).click();await page.getByRole('button',{name:/Open screenshot/}).first().click();await page.getByRole('img',{name:/Screenshot for/}).waitFor();await capture('dialog-screenshot');await page.getByRole('button',{name:'Previous screenshot'}).click();assert(await page.getByRole('button',{name:'Previous screenshot'}).isDisabled());await page.keyboard.press('ArrowRight');assert(await page.getByRole('button',{name:'Next screenshot'}).isDisabled());await capture('screenshot-carousel');await close();
 await nav('Team & devices');await page.getByRole('button',{name:/Revoke/}).first().click();await capture('dialog-revoke');await close();
 await page.getByRole('button',{name:'Edit work policy',exact:true}).first().click();await page.getByLabel('Policy source').selectOption('override');await capture('employee-policy-fixed');await auditSelects('employee-policy');const arrangement=page.getByLabel('Work arrangement');await arrangement.focus();await page.keyboard.press('Space');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');assert.equal(await arrangement.inputValue(),'part_time');await arrangement.selectOption('full_time');const hours=page.getByLabel('Required work hours per day');await hours.fill('25');await page.getByRole('button',{name:'Approve & save work policy'}).click();assert.equal(await hours.evaluate(e=>e.validity.rangeOverflow),true);await capture('policy-invalid-hours');await hours.fill('8');await page.getByLabel('Work arrangement').selectOption('consultant');await page.getByLabel('Required work hours per day').fill('2');await page.getByRole('combobox',{name:/^Schedule/}).selectOption('flexible');await capture('employee-policy-flexible');await page.setViewportSize({width:1440,height:1000});await close();
 await nav('Productivity rules');await page.getByRole('button',{name:'Whitelist Code.exe',exact:true}).click();await page.getByRole('button',{name:'Whitelist github.com',exact:true}).click();await page.locator('.rule-options summary').first().click();await capture('rules-edit-advanced');await auditSelects('rules');
 failSave=true;await page.getByRole('button',{name:'Save productivity rules'}).click();await page.getByRole('alert').waitFor();await capture('rules-save-error');failSave=false;await page.getByRole('button',{name:'Save productivity rules'}).click();await page.getByText('Productivity rules saved. Reports recalculated.').waitFor();assert(rules.some(r=>r.match==='Code.exe'&&r.target==='app'&&r.category==='productive'));assert(rules.some(r=>r.match==='github.com'&&r.target==='domain'&&r.match_kind==='domain'));await capture('rules-saved');
 await nav('Activity timeline');await page.getByLabel('Only verification flags').check();assert.equal(await page.getByText('Needs verification',{exact:true}).count(),1);await capture('timeline-filtered');
 for(const size of [{width:1280,height:720}]){
  await page.setViewportSize(size);
  for(let i=0;i<pages.length;i++){await nav(pages[i]);await capture(`${size.width}-${i+1}-${pages[i].replace(/[^a-z]/gi,'-')}`);}
  await page.getByRole('tab',{name:'Targets & breaks'}).click();await capture(`${size.width}-settings-targets`);
  await page.getByRole('button',{name:'Add employee',exact:true}).first().click();await capture(`${size.width}-dialog-invite`);await close();
 }
 empty=true;await nav('Overview');await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByText('No records in this period').waitFor();await capture('mobile-empty-overview');
 await nav('Screenshots');await capture('mobile-empty-screenshots');
 assert.equal(failures.length,0,failures.join('\n'));
 await writeFile(resolve(output,'manifest.json'),JSON.stringify({screenshots,failures,checks:['login','all 9 pages at desktop and laptop widths','all 8 dialogs including manager employee policy','settings tabs','hours conversion','whitelist app + domain save','failed save retains edits','verification filter','empty states','no horizontal page overflow','no browser exceptions']},null,2));
 console.log(`PASS: ${screenshots.length} screenshots; all page and component checks passed. ${output}`);
} finally {await browser.close();}

