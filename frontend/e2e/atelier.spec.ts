import { test, expect } from '@playwright/test';
import { systems } from '../src/combined/domains';
import { atelierModels } from '../src/combined/atelier-models.js';
import { existsSync } from 'node:fs';
const plan={route:'prevention',profile:{answers:['31','','','','',''],records:[],facts:[]},intro:'Your plan',actions:[],followUp:'',uncertainty:''};
for (const fallback of [false,true]) test(`Atelier organs retain textures and controls (${fallback?'canvas':'default'})`,async({page},info)=>{
 test.setTimeout(120000);
 const entries=fallback?[['heart','heart']]:Object.entries(atelierModels);
 expect(entries.every(([,asset])=>existsSync(new URL(`../public/models/atelier/${asset}.glb`,import.meta.url)))).toBe(true);
 if(fallback)await page.addInitScript(()=>{const getContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind:string,...args:unknown[]){if(kind.includes('webgl'))return null;return getContext.apply(this,[kind,...args] as never); } as typeof getContext;});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/plan',r=>r.fulfill({json:plan}));await page.setViewportSize({width:1280,height:900});await page.goto('/');await page.getByRole('textbox',{name:'Tell us about your health'}).fill('I am 31.');await page.getByRole('button',{name:'Review my health profile'}).click();await page.getByRole('button',{name:'Looks right'}).click();
 for(const [id,asset] of entries){
  await page.getByRole('button',{name:systems.find(s=>s.id===id)!.name,exact:true}).click();
  const model=page.locator(`[data-source="atelier"][data-model="${asset}"]`);
  await expect(model).toBeVisible({timeout:30000});await expect(model).toHaveAttribute('data-renderer',fallback?'textured-canvas':/webgl|textured-canvas/);
  await expect(model.locator('canvas')).toHaveCount(1);await expect(page.getByRole('link',{name:'Model credits'})).toHaveCount(0);
  await page.screenshot({path:info.outputPath(`${asset}.png`),fullPage:true});
  await model.focus();await page.keyboard.press('ArrowRight');await page.getByRole('button',{name:'Zoom in'}).click();await page.getByRole('button',{name:'Reset',exact:true}).click();await page.getByRole('button',{name:'Back to your health'}).click();await expect(page.locator('[data-source="atelier"]')).toHaveCount(0);
 }
 expect(errors).toEqual([]);
});
