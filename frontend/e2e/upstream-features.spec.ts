import { test, expect, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
const comparisonAvailable = ['before','after'].every(name=>existsSync(new URL(`../public/models/ahmed-before-after/${name}.glb`,import.meta.url)));
const story='I am 31. I enjoy walking.';
const plan={route:'prevention',profile:{answers:['31','','','I enjoy walking.','',''],records:[],facts:[]},intro:'Make time for a walk.',actions:[],followUp:'',uncertainty:'',recommendations:{primary:null,nice:[],nhs:[],optional:[],uncertainties:[]}};
async function dashboard(page:Page, withBupa=false) {
 await page.route('**/api/plan',r=>r.fulfill({json:withBupa ? {...plan,recommendations:{...plan.recommendations,primary:{id:'assessment',title:'Health assessment',authority:'Bupa',status:'confirm_suitability',explanation:'Discuss suitability.',trigger:'Existing plan',sourceUrl:'https://www.bupa.co.uk/'}}} : plan}));await page.goto('/');await page.getByRole('textbox',{name:'Tell us about your health'}).fill(story);await page.getByRole('button',{name:'Review my health profile'}).click();await page.getByRole('button',{name:'Looks right'}).click();await expect(page.getByRole('button',{name:'How are you feeling today?',exact:true})).toBeVisible();
}
for(const fallback of [false,true])test(`Whole person before/after and face (${fallback?'software':'default'})`,async({page},info)=>{
 test.setTimeout(60000);
 expect(comparisonAvailable && existsSync(new URL('../public/models/atelier/heart.glb',import.meta.url))).toBe(true);
 if(fallback)await page.addInitScript(()=>{const getContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind:string,...args:unknown[]){if(kind.includes('webgl'))return null;return getContext.apply(this,[kind,...args] as never); } as typeof getContext;});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1200,height:900});await dashboard(page);await page.getByRole('button',{name:'Whole person',exact:true}).click();
 const model=page.locator('[data-model="colleague"]');await expect(model).toBeVisible({timeout:20000});await expect(model).toHaveAttribute('data-renderer',fallback?'textured-canvas':/webgl|textured-canvas/);await expect(page.getByRole('button',{name:'Face detail',exact:true})).toHaveCount(1);
 await expect(model).toHaveAttribute('data-variant','before');
 await page.screenshot({path:info.outputPath('whole-body-before.png'),fullPage:true});
 await page.getByRole('button',{name:'After',exact:true}).click();await expect(model).toHaveAttribute('data-variant','after');
 await expect(page.getByRole('button',{name:'After',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.screenshot({path:info.outputPath('whole-body-after.png'),fullPage:true});await page.getByRole('button',{name:'Face detail',exact:true}).click();await page.screenshot({path:info.outputPath('face-after.png'),fullPage:true});
 await page.getByRole('button',{name:'Before',exact:true}).click();await expect(model).toHaveAttribute('data-variant','before');
 await page.screenshot({path:info.outputPath('face-before.png'),fullPage:true});await model.focus();await page.keyboard.press('ArrowRight');await page.getByRole('button',{name:'Reset',exact:true}).click();
 await page.getByRole('button',{name:'Back to your health'}).click();await page.getByRole('button',{name:'Heart',exact:true}).click();await expect(page.locator('[data-model="heart"]')).toBeVisible();await expect(page.getByRole('button',{name:'Face detail'})).toHaveCount(0);expect(errors).toEqual([]);
});
test('comparison fits mobile and keeps Before available if After fails to load',async({page},info)=>{
 expect(comparisonAvailable).toBe(true);
 let fail=true;
 await page.route('**/models/ahmed-before-after/after.glb',route=>fail?route.fulfill({status:503,body:'Unavailable'}):route.continue());
 await page.addInitScript(()=>{const getContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind:string,...args:unknown[]){if(kind.includes('webgl'))return null;return getContext.apply(this,[kind,...args] as never); } as typeof getContext;});
 await page.setViewportSize({width:390,height:844});await dashboard(page);await page.getByRole('button',{name:'Whole person',exact:true}).click();
 const model=page.locator('[data-model="colleague"]');await expect(model).toHaveAttribute('data-variant','before');
 await page.getByRole('button',{name:'After',exact:true}).click();await expect(page.getByRole('status')).toContainText('This view could not load');
 await expect(model).toHaveAttribute('data-variant','before');await expect(page.getByRole('button',{name:'Face detail'})).toBeEnabled();
 fail=false;await page.getByRole('button',{name:'After',exact:true}).click();await expect(model).toHaveAttribute('data-variant','after');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('comparison-mobile.png'),fullPage:true});
});
test('real Calendar endpoint requires setup or sign-in before allowing a write',async({page},info)=>{
 const response=await page.request.get('/api/calendar/status');expect(response.ok()).toBe(true);const status=await response.json();expect(typeof status.configured).toBe('boolean');expect(status.connected).toBe(false);
 await dashboard(page,true);await page.getByRole('button',{name:'Book time for Health assessment in Google Calendar'}).click();await expect(page.getByRole('dialog',{name:'Make time for your health'})).toBeVisible();
 if(status.configured)await expect(page.getByRole('button',{name:'Sign in with Google'})).toBeVisible();else await expect(page.getByText('One-time Google setup needed')).toBeVisible();
 await expect(page.getByRole('button',{name:'Confirm & add to Google Calendar'})).toBeDisabled();await page.screenshot({path:info.outputPath('calendar-setup.png'),fullPage:true});await page.getByRole('button',{name:'Close calendar'}).click();await expect(page.getByRole('button',{name:'Book time for Health assessment in Google Calendar'})).toBeFocused();
});
test('Calendar saves only reviewed event fields after explicit confirmation',async({page},info)=>{
 await page.route('**/api/calendar/status',r=>r.fulfill({json:{configured:true,connected:true,email:'test@example.invalid',csrf:'test-csrf'}}));let writes=0;let payload:Record<string,unknown>={};
 await page.route('**/api/calendar/events',r=>{writes++;payload=r.request().postDataJSON();expect(r.request().headers()['x-calendar-csrf']).toBe('test-csrf');return r.fulfill({json:{id:'test-event',title:payload.title,start:{dateTime:payload.start},email:'test@example.invalid',htmlLink:'https://calendar.google.com/calendar/event?eid=test'}});});
 await dashboard(page,true);await page.getByRole('button',{name:'Book time for Health assessment in Google Calendar'}).click();await expect(page.getByText('test@example.invalid',{exact:true})).toBeVisible();expect(writes).toBe(0);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:info.outputPath('calendar-review-mobile.png'),fullPage:true});await page.getByLabel('Calendar title',{exact:true}).fill('My appointment');await page.getByRole('combobox',{name:'This is',exact:true}).selectOption('appointment');await page.getByRole('button',{name:'Confirm & add to Google Calendar'}).click();await expect(page.getByRole('dialog')).not.toBeVisible();await expect(page.getByRole('list',{name:'Booked appointments'})).toBeVisible();
 expect(writes).toBe(1);expect(payload.confirmed).toBe(true);expect(Object.keys(payload).sort()).toEqual(['confirmed','duration','kind','requestId','start','timeZone','title']);expect(JSON.stringify(payload)).not.toContain(story);await expect(page.getByRole('link',{name:'View in Google Calendar'})).toHaveAttribute('href','https://calendar.google.com/calendar/event?eid=test');
});

test('Calendar sign-in callback refreshes the connection without saving an event',async({page})=>{
 let connected=false,writes=0;
 await page.route('**/api/calendar/status',r=>r.fulfill({json:connected?{configured:true,connected:true,email:'test@example.invalid',csrf:'test-csrf'}:{configured:true,connected:false}}));
 await page.context().route('**/api/calendar/start',r=>{connected=true;return r.fulfill({status:302,headers:{Location:'/calendar-connected.html?result=connected'}});});
 await page.route('**/api/calendar/events',r=>{writes++;return r.fulfill({status:500,json:{error:'Unexpected write'}});});
 await dashboard(page,true);await page.getByRole('button',{name:'Book time for Health assessment in Google Calendar'}).click();
 const popupPromise=page.waitForEvent('popup');await page.getByRole('button',{name:'Sign in with Google'}).click();const popup=await popupPromise;
 await expect(popup.getByRole('heading',{name:'Calendar connected'})).toBeVisible();await expect(page.getByText('test@example.invalid',{exact:true})).toBeVisible();expect(writes).toBe(0);await popup.close();await page.getByRole('button',{name:'Close calendar'}).click();
});

test('onboarding keeps only Bupa without opening Calendar or sending the story',async({page})=>{
 let requests=0;page.on('request',r=>{if(r.url().endsWith('/api/plan')||r.url().includes('/api/calendar/'))requests++;});await page.goto('/');await page.getByRole('textbox',{name:'Tell us about your health'}).fill(story);await expect(page.getByRole('button',{name:'Google Calendar Connect'})).toHaveCount(0);await expect(page.getByRole('button',{name:'bupa Connect'})).toBeVisible();await expect(page.getByRole('button',{name:/Apple Health/})).toHaveCount(0);expect(requests).toBe(0);await expect(page.getByRole('textbox',{name:'Tell us about your health'})).toHaveValue(story);
});
test('Bupa previews cached Emma and restores the user story without a model call',async({page})=>{
 const requests:string[]=[];await page.route('**/api/**',route=>{requests.push(route.request().url());return route.abort();});await page.goto('/');await page.getByRole('textbox',{name:'Tell us about your health'}).fill(story);await page.getByRole('button',{name:'bupa Connect'}).click();await expect(page.getByRole('dialog',{name:'Bupa example connection'})).toContainText('Emma Thompson · 35');await expect(page.getByText(/No Bupa account is connected/)).toBeVisible();await page.getByRole('button',{name:'Open Emma’s profile'}).click();await expect(page.getByRole('heading',{name:'Here’s what we understood'})).toBeVisible();await page.getByRole('button',{name:'Looks right'}).click();await expect(page.getByText('Emma · example profile')).toBeVisible();await expect(page.locator('.system-results-hint')).toHaveCount(15);expect(requests).toEqual([]);await page.getByRole('button',{name:'Return to my story'}).click();await expect(page.getByRole('textbox',{name:'Tell us about your health'})).toHaveValue(story);
});
