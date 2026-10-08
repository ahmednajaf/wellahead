import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
const story='I am 31. I enjoy walking and want to move more.';
const review={intake:story,answers:['31','','','I enjoy walking.','','Move more'],facts:[],records:[]};
const action={id:'move',title:'Make time for a walk',idea:'Take a short walk during your break.',reason:'You enjoy walking.',systems:['heart','lungs','brain'],step:'Choose a time that works for you.',context:'I enjoy walking',uncertainty:'Adapt activity to your ability.',sources:[]};
// Browser contract fixtures: automated tests never require a paid model call.
const plan={route:'prevention',profile:{answers:review.answers,records:[],facts:[]},intro:'A plan around your day.',actions:[action,{...action,id:'food',title:'Make room for nourishing food',idea:'Add vegetables to a meal you already enjoy.',systems:['gut']},{...action,id:'strength',title:'Build strength for everyday life',idea:'Choose a strengthening activity that fits your routine.',systems:['muscles']}],followUp:'',uncertainty:'A starting point to discuss with your clinician.',recommendations:{primary:null,optional:[],nhs:[],nice:[{id:'qrisk3',title:'Formal cardiovascular risk review',status:'confirm_suitability',authority:'NICE',explanation:'Confirm suitability with a clinician.',trigger:'Age in the matrix range.',sourceUrl:'https://www.nice.org.uk/guidance/ng238',clinicianReview:true}],uncertainties:[]}};
test('presentation onboarding, confirmation, fifteen domains and matrix detail', async ({page}, info) => {
 const errors: string[]=[];page.on('pageerror',e=>errors.push(e.message));let plans=0;
 await page.route('**/api/plan',r=>{plans++;expect(r.request().postDataJSON()).toEqual({intake:story,records:[]});return r.fulfill({json:plan});});
 await page.setViewportSize({width:1440,height:1000});await page.goto('/');
 await expect(page.getByRole('heading',{name:'A little about you'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Google Calendar Connect'})).toHaveCount(0);await expect(page.getByRole('button',{name:'bupa Connect'})).toBeVisible();
 await expect(page.locator('.siri-orb')).toHaveCount(0);
 await page.screenshot({path:info.outputPath('onboarding.png'),fullPage:true});
 await page.getByRole('textbox',{name:'Tell us about your health'}).fill(story);await page.getByRole('button',{name:'Review my health profile'}).click();
 await expect(page.getByRole('heading',{name:'Here’s what we understood'})).toBeVisible();expect(plans).toBe(1);
 await page.screenshot({path:info.outputPath('confirmation.png'),fullPage:true});
 await page.getByRole('button',{name:'Looks right'}).click();await expect(page.getByRole('button',{name:'How are you feeling today?',exact:true})).toBeVisible();expect(plans).toBe(1);
 await expect(page.locator('.system-grid img')).toHaveCount(15);
 const score=page.getByRole('group',{name:'Health optimisation score: 0%'}), agent=page.getByRole('button',{name:'How are you feeling today?'});
 await expect(page.getByRole('button',{name:/Health optimisation score/})).toHaveCount(0);
 await score.click();await expect(page.getByRole('dialog')).toHaveCount(0);
 for(const property of ['background-image','border-radius','backdrop-filter']) await expect(agent).toHaveCSS(property,await score.evaluate((element,name)=>getComputedStyle(element).getPropertyValue(name),property));
 for(const icon of await page.locator('.system-grid img').all())expect(await icon.evaluate(e=>(e as HTMLImageElement).complete && (e as HTMLImageElement).naturalWidth>0)).toBe(true);
 const rowCount=()=>page.locator('.compact-launcher .system-tile').evaluateAll(items=>new Set(items.map(e=>Math.round(e.getBoundingClientRect().top))).size);
 expect(await rowCount()).toBe(2);
 await expect(page.locator('.dashboard-widgets > section')).toHaveCount(2);
 await expect(page.getByText('No Bupa or NHS tests to arrange in this plan.')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Your next steps'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Appointments',exact:true})).toBeVisible();
 await expect(page.getByText('No appointments booked yet. Book from Your next steps.')).toBeVisible();
 await expect(page.locator('.combined-plan')).toHaveCount(0);
 await page.screenshot({path:info.outputPath('home.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});expect(await rowCount()).toBe(2);
 await expect(agent.locator('svg')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Whole person',exact:true}).scrollIntoViewIfNeeded();await expect(page.getByRole('button',{name:'Whole person',exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('mobile-dashboard.png'),fullPage:true});
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('button',{name:'View your full health plan',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Your health plan',exact:true})).toBeVisible();await expect(page.locator('.matrix-results')).toBeVisible();
 await page.getByRole('button',{name:'Home',exact:true}).click();

 await page.getByRole('button',{name:'Heart, 2 linked items',exact:true}).click();
 if(existsSync(new URL('../public/models/atelier/heart.glb',import.meta.url))) await expect(page.locator('[data-model="heart"]')).toBeVisible();
 else await expect(page.getByRole('status')).toHaveText('This anatomy model could not load. Your health plan is still available.');
 await expect(page.getByRole('heading',{name:'Risk reviews with a clinician'})).toBeVisible();await page.getByText('Formal cardiovascular risk review · confirm suitability',{exact:true}).click();await expect(page.getByText('Confirm suitability with a clinician.')).toBeVisible();
 await page.screenshot({path:info.outputPath('heart.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Back to your health'}).click();await page.getByRole('button',{name:'Oral',exact:true}).click();await expect(page.getByText('No reference anatomy model is supplied for oral.')).toBeVisible();
 await page.getByRole('button',{name:'Clear & start again'}).click();await expect(page.getByRole('textbox')).toHaveValue('');
 await page.screenshot({path:info.outputPath('mobile-onboarding.png'),fullPage:true});expect(errors).toEqual([]);
});

test('microphone transcript waits for user submission without an orb', async ({page}) => {
 await page.addInitScript(()=>{
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{
   const context=new AudioContext();await context.resume();const oscillator=context.createOscillator(),gain=context.createGain(),destination=context.createMediaStreamDestination();
   gain.gain.value=0;oscillator.connect(gain);gain.connect(destination);oscillator.start();
   (window as unknown as {testSound:(level:number)=>void}).testSound=level=>{gain.gain.value=level;};
   return destination.stream;
  }});
 });
 let transcriptions=0,intakes=0;
 await page.route('**/api/transcribe',r=>{transcriptions++;return r.fulfill({json:{text:story,elapsedMs:1}});});
 await page.route('**/api/plan',r=>{intakes++;return r.fulfill({json:plan});});
 await page.goto('/');await page.getByRole('button',{name:'Start recording'}).click();await expect(page.getByRole('button',{name:'Stop recording'})).toBeVisible();
 await expect(page.locator('.siri-orb')).toHaveCount(0);
 await page.evaluate(()=>(window as unknown as {testSound:(level:number)=>void}).testSound(.08));await expect(page.getByRole('meter')).toHaveAttribute('value',/0\.[1-9]/);
 await page.evaluate(()=>(window as unknown as {testSound:(level:number)=>void}).testSound(0));await expect(page.locator('.siri-orb')).toHaveCount(0);
 await expect(page.getByText('1s / 180s',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Stop recording'}).click();await expect(page.getByRole('textbox')).toHaveValue(story);expect(transcriptions).toBe(1);expect(intakes).toBe(0);await expect(page.locator('.siri-orb')).toHaveCount(0);
 await page.getByRole('button',{name:'Review my health profile'}).click();await expect(page.getByRole('heading',{name:'Here’s what we understood'})).toBeVisible();expect(intakes).toBe(1);
 await page.getByRole('button',{name:'Looks right'}).click();await expect(page.getByRole('button',{name:'How are you feeling today?',exact:true})).toBeVisible();expect(intakes).toBe(1);
});

async function dashboardCheckIn(page: import('@playwright/test').Page) {
 await page.route('**/api/plan',r=>r.fulfill({json:plan}));
 await page.goto('/');await page.getByRole('textbox',{name:'Tell us about your health'}).fill(story);
 await page.getByRole('button',{name:'Review my health profile'}).click();await page.getByRole('button',{name:'Looks right'}).click();
 await page.getByRole('button',{name:'How are you feeling today?'}).click();
 await expect(page.getByRole('dialog',{name:'How’s your health today?'})).toBeVisible();
}
test('dashboard emergency check-in uses Rob’s real submitted-input rule',async({page},info)=>{
 let intakes=0,plans=0;page.on('request',r=>{if(r.url().endsWith('/api/intake'))intakes++;if(r.url().endsWith('/api/plan'))plans++;});
 await page.setViewportSize({width:1440,height:1000});await dashboardCheckIn(page);
 await page.unroute('**/api/plan');
 await expect(page.locator('.siri-orb')).toHaveCount(0);
 await page.getByRole('textbox',{name:'Your health check-in'}).fill('I have chest pain.');
 await page.screenshot({path:info.outputPath('check-in.png'),fullPage:true});
 await expect(page.getByRole('link',{name:'Call 999',exact:true})).toHaveCount(0);expect(intakes).toBe(0);expect(plans).toBe(1);
 // Rob's real plan endpoint interrupts before any paid model call.
 await page.getByRole('button',{name:'Send health check-in'}).click();
 await expect(page.getByRole('link',{name:'Call 999',exact:true})).toHaveAttribute('href','tel:999');
 await expect(page.getByText(/This app has not contacted anyone/)).toBeVisible();
 expect(intakes).toBe(0);expect(plans).toBe(2);
 await page.screenshot({path:info.outputPath('guardrail-999.png'),fullPage:true});
});

test('medication-change check-in uses Rob’s restored real human handoff',async({page})=>{
 let plans=0;page.on('request',r=>{if(r.url().endsWith('/api/plan'))plans++;});
 await dashboardCheckIn(page);await page.unroute('**/api/plan');
 await page.getByRole('textbox',{name:'Your health check-in'}).fill('Should I change my medication?');
 await page.getByRole('button',{name:'Send health check-in'}).click();
 await expect(page.getByRole('dialog',{name:'How’s your health today?'})).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Call NHS 111',exact:true})).toHaveAttribute('href','tel:111');
 await expect(page.getByRole('link',{name:'Find your GP'})).toBeVisible();await expect(page.getByRole('link',{name:'Call 999',exact:true})).toHaveCount(0);
 expect(plans).toBe(2);await expect(page.locator('.contact-screen').getByRole('button')).toHaveCount(1);await page.getByRole('button',{name:'Start again'}).click();await expect(page.getByRole('textbox',{name:'Tell us about your health'})).toHaveValue('');
});

test('dashboard check-in dialog closes with Escape and restores focus',async({page},info)=>{
 await dashboardCheckIn(page);await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('textbox',{name:'Your health check-in'}).fill('I would like to walk more.');
 await page.screenshot({path:info.outputPath('mobile-check-in.png'),fullPage:true});
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'How are you feeling today?'})).toBeFocused();
 await expect(page.getByRole('heading',{name:'Your next steps'})).toBeVisible();
});

test('emergency voice transcript stays editable and routes only after send',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{
   const context=new AudioContext();await context.resume();const oscillator=context.createOscillator(),gain=context.createGain(),destination=context.createMediaStreamDestination();gain.gain.value=.08;oscillator.connect(gain);gain.connect(destination);oscillator.start();return destination.stream;
  }});
 });
 let intakes=0,checks=0;page.on('request',r=>{if(r.url().endsWith('/api/plan'))intakes++;if(r.url().endsWith('/api/check'))checks++;});
 await page.route('**/api/transcribe',r=>r.fulfill({json:{text:'I have chest pain.',elapsedMs:1}}));
 await dashboardCheckIn(page);await page.unroute('**/api/plan');
 await page.getByRole('button',{name:'Start speaking'}).click();await expect(page.getByText('1s / 180s',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Stop recording'}).click();
 await expect(page.getByRole('textbox',{name:'Your health check-in'})).toHaveValue('I have chest pain.');
 await expect(page.getByRole('link',{name:'Call 999',exact:true})).toHaveCount(0);expect(intakes).toBe(1);expect(checks).toBe(0);
 await page.getByRole('textbox',{name:'Your health check-in'}).fill('I have chest pain right now.');
 await page.getByRole('button',{name:'Send health check-in'}).click();
 await expect(page.getByRole('link',{name:'Call 999',exact:true})).toHaveAttribute('href','tel:999');expect(intakes).toBe(2);expect(checks).toBe(0);
});
