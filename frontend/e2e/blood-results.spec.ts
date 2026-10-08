import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';

test('Emma’s Bupa blood results populate every health area without model calls or personal-story leakage', async ({ page }, info) => {
  const calls:string[]=[];
  await page.route('**/api/**', route => { calls.push(route.request().url()); return route.abort(); });
  await page.setViewportSize({ width:1440, height:1000 });
  await page.goto('/');
  await page.getByRole('textbox',{name:'Tell us about your health'}).fill('My original story.');
  await page.getByRole('button',{name:'bupa Connect'}).click();
  await expect(page.getByRole('dialog')).toContainText('77 blood results');
  await page.getByRole('button',{name:'Open Emma’s profile'}).click();
  await expect(page.getByRole('heading',{name:'Here’s what we understood'})).toBeVisible();
  await page.getByRole('button',{name:'Looks right'}).click();
  await expect(page.locator('.system-results-hint')).toHaveCount(15);
  await expect(page.getByRole('group',{name:'Health optimisation score: 0%'})).toContainText('0 of 6');
  await page.screenshot({path:info.outputPath('emma-blood-dashboard.png'),fullPage:true});
  const names = ['Brain, mental health & sleep','Eyes','Oral','Lungs','Heart','Blood & nutrition','Liver','Hormones','Digestive','Kidneys & urinary','Sexual health','Muscles, bones & joints','Skin','Immune','Whole person'];
  for (const name of names) {
    await page.locator('.system-tile').filter({has:page.locator('.system-name',{hasText:name})}).filter({has:page.getByText(name,{exact:true})}).click();
    const panel=page.getByRole('region',{name:`${name} blood results`,exact:true});
    await expect(panel).toBeVisible();
    expect(await panel.locator('tbody tr').count()).toBeGreaterThan(0);
    if(name==='Heart') {
      await expect(panel.getByRole('row',{name:'LDL-C 82 mg/dL',exact:true})).toBeVisible();
      if (existsSync(new URL('../public/models/atelier/heart.glb', import.meta.url))) {
        await expect(page.locator('[data-source="atelier"][data-model="heart"]')).toBeVisible({timeout:15000});
      }
      await page.screenshot({path:info.outputPath('emma-heart-bloods.png'),fullPage:true});
    }
    if(name==='Lungs') await expect(panel.getByText(/not lung-function or oxygen-saturation tests/)).toBeVisible();
    if(name==='Sexual health') await expect(panel.getByText('Synthetic demo, early follicular phase')).toHaveCount(4);
    if(name==='Whole person') {
      await expect(panel.getByRole('row',{name:'Lead <1.0 µg/dL',exact:true})).toBeVisible();
      await expect(page.getByRole('button',{name:'Before',exact:true})).toBeVisible();
      await expect(page.getByRole('heading',{name:'Your priorities',exact:true})).toHaveCount(0);
    }
    await page.getByRole('button',{name:'← Back to your health'}).click();
  }
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:/^Blood & nutrition,/}).click();
  const panel=page.getByRole('region',{name:'Blood & nutrition blood results',exact:true});
  await panel.scrollIntoViewIfNeeded();
  await expect(panel.getByRole('row',{name:'Haemoglobin 13.4 g/dL',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('emma-bloods-mobile.png'),fullPage:true});
  expect(calls).toEqual([]);
  await page.getByRole('button',{name:'Return to my story'}).click();
  await expect(page.getByRole('textbox',{name:'Tell us about your health'})).toHaveValue('My original story.');
  await expect(page.locator('.blood-results-panel')).toHaveCount(0);
});
