import { test, expect } from '@playwright/test';

const story='I enjoy walking.';
const plan={route:'prevention',profile:{answers:['','','',story,'',''],records:[],facts:[]},intro:'Your plan',actions:[],followUp:'',uncertainty:''};

test('personal typing works after demos, preserves failed submissions, and submits with Enter',async({page})=>{
 let requests=0;
 await page.route('**/api/plan',route=>{
  requests++;expect(route.request().postDataJSON()).toEqual({intake:story,records:[]});
  return requests===1?route.fulfill({status:503,json:{error:'Private upstream detail'}}):route.fulfill({json:plan});
 });
 await page.goto('/');
 const input=page.getByRole('textbox',{name:'Tell us about your health'});
 await page.getByText('Speak or type naturally.',{exact:true}).click();await expect(input).toBeFocused();
 await input.fill(story);
 await page.getByRole('button', { name: 'Emma demo, age 35' }).click();
 await page.getByRole('button', { name: 'Emma demo, age 35' }).click();
 await expect(input).toHaveValue(story);await expect(page.locator('.onboarding-record')).toHaveCount(0);
 await input.focus();await page.keyboard.press('Shift+Enter');expect(requests).toBe(0);
 await input.fill(story);await page.keyboard.press('Enter');
 await expect(page.getByRole('alert')).toContainText('Your words are still here');await expect(input).toHaveValue(story);
 await expect(page.getByText('Private upstream detail')).toHaveCount(0);
 await input.press('Enter');await expect(page.getByRole('heading',{name:'Here’s what we understood'})).toBeVisible();
 await expect(page.locator('.review-grid article')).toHaveCount(6);expect(requests).toBe(2);
 await expect(page.locator('.review-grid article').filter({has:page.getByRole('heading',{name:'Daily habits'})})).toContainText(story);
});

test('voice after switching demos fills the same field for review and never auto-submits',async({page})=>{
 // A synthetic audio stream exercises the actual recorder and WAV path without
 // using the user's microphone or sending audio to a live transcription model.
 await page.addInitScript(()=>{
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{
   const audio=new AudioContext(),source=audio.createOscillator(),gain=audio.createGain(),output=audio.createMediaStreamDestination();
   source.frequency.value=220;gain.gain.value=.08;source.connect(gain);gain.connect(output);source.start();await audio.resume();
   for(const track of output.stream.getTracks()){const stop=track.stop.bind(track);track.stop=()=>{stop();source.stop();void audio.close();};}
   return output.stream;
  }});
 });
 let transcriptions=0,submissions=0;
 await page.route('**/api/transcribe',route=>{transcriptions++;expect(route.request().headers()['content-type']).toBe('audio/wav');return route.fulfill({json:{text:story}});});
 await page.route('**/api/plan',route=>{submissions++;expect(route.request().postDataJSON()).toEqual({intake:story,records:[]});return route.fulfill({json:plan});});
 await page.goto('/');await page.getByRole('button', { name: 'Emma demo, age 35' }).click();await page.getByRole('button', { name: 'Emma demo, age 35' }).click();
 await page.getByRole('button',{name:'Start recording'}).click();await expect(page.getByRole('button',{name:'Stop recording'})).toBeVisible();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();expect(transcriptions).toBe(0);
 await page.getByRole('button',{name:'Start recording'}).click();await expect(page.getByText('1s / 180s',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Stop recording'}).click();
 const input=page.getByRole('textbox',{name:'Tell us about your health'});
 await expect(input).toHaveValue(story);expect(transcriptions).toBe(1);expect(submissions).toBe(0);
 await page.getByRole('button',{name:'Review my health profile'}).click();await expect(page.getByRole('heading',{name:'Here’s what we understood'})).toBeVisible();expect(submissions).toBe(1);
});
