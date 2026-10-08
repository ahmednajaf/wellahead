import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { test, expect, vi } from 'vitest';
import App from '../combined/App';
import { checkedContact } from '../combined/api';
import { checkAnswer } from '../../../server/core.mjs';
const story='I am 56. I enjoy walking. I have no chest pain.';
const plan={route:'prevention',profile:{answers:['56','','','I enjoy walking.','',''],records:[],facts:[]},intro:'A plan around you.',actions:[],followUp:'',uncertainty:''};
const json=(v:unknown)=>new Response(JSON.stringify(v),{headers:{'Content-Type':'application/json'}});
async function dashboard(fetch:ReturnType<typeof vi.fn>) {
 vi.stubGlobal('fetch',fetch);render(<App/>);fireEvent.change(screen.getByRole('textbox'),{target:{value:story}});fireEvent.click(screen.getByRole('button',{name:'Review my health profile'}));fireEvent.click(await screen.findByRole('button',{name:'Looks right'}));
 await screen.findByRole('button',{name:'How are you feeling today?'});fireEvent.click(screen.getByRole('button',{name:'How are you feeling today?'}));
}
function send(message:string) { fireEvent.change(screen.getByRole('textbox',{name:'Your health check-in'}),{target:{value:message}});fireEvent.click(screen.getByRole('button',{name:'Send health check-in'})); }
test('emergency check-in reaches Rob’s submitted-story route',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(json(plan)).mockResolvedValueOnce(json(await checkAnswer('I have chest pain.')));await dashboard(fetch);send('I have chest pain.');
 expect(await screen.findByRole('link',{name:'Call 999'})).toHaveAttribute('href','tel:999');expect(fetch).toHaveBeenCalledTimes(2);expect(fetch.mock.calls[1][0]).toBe('/api/plan');expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({intake:`${story}\n\nToday's health check-in:\nI have chest pain.`,records:[]});
});
test.each(['I want to walk outdoors.'])('check-in uses the same planner, not new UI rules: %s',async message=>{
 const fetch=vi.fn().mockImplementation(async()=>json(plan));await dashboard(fetch);send(message);await waitFor(()=>expect(screen.queryByRole('dialog',{name:'How’s your health today?'})).not.toBeInTheDocument());
 expect(fetch.mock.calls.map(c=>c[0])).toEqual(['/api/plan','/api/plan']);expect(screen.getByRole('heading',{name:'Here’s what we understood'})).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Looks right'}));expect(screen.getByRole('button',{name:'How are you feeling today?'})).toBeInTheDocument();
});
test('Rob’s out-of-scope handoff works from check-in and offers a fresh start',async()=>{
 const message='Should I change my medication?';
 const fetch=vi.fn().mockResolvedValueOnce(json(plan)).mockResolvedValueOnce(json(await checkAnswer(message)));await dashboard(fetch);send(message);
 expect(await screen.findByRole('link',{name:'Call NHS 111'})).toHaveAttribute('href','tel:111');
 expect(screen.getByRole('link',{name:'Find your GP'})).toHaveAttribute('href','https://www.nhs.uk/service-search/find-a-gp');
 expect(screen.queryByRole('link',{name:'Call 999'})).not.toBeInTheDocument();
 expect(screen.getAllByRole('button')).toHaveLength(1);
 fireEvent.click(screen.getByRole('button',{name:'Start again'}));
 expect(screen.getByRole('textbox',{name:'Tell us about your health'})).toHaveValue('');
});
test('cancelled check-in ignores a late result and preserves the current plan',async()=>{
 let resolve!:(r:Response)=>void;const fetch=vi.fn().mockResolvedValueOnce(json(plan)).mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));await dashboard(fetch);send('I want to walk more.');fireEvent.click(screen.getByRole('button',{name:'Close health check-in'}));resolve(json(plan));
 await waitFor(()=>expect(screen.queryByRole('dialog',{name:'How’s your health today?'})).not.toBeInTheDocument());expect(screen.getByRole('button',{name:'How are you feeling today?'})).toBeInTheDocument();
});
test('failed check-in preserves its draft and hides arbitrary server errors',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(json(plan)).mockResolvedValueOnce(new Response('private error',{status:503}));await dashboard(fetch);send('I want to walk more.');await screen.findByRole('alert');expect(screen.getByRole('textbox',{name:'Your health check-in'})).toHaveValue('I want to walk more.');expect(screen.queryByText('private error')).not.toBeInTheDocument();
});
test('malformed support cannot render an incorrect phone number',async()=>{
 const contact=await checkAnswer('I have chest pain.');expect(()=>checkedContact({...contact,primary:{label:'Call now',href:'tel:111'}})).toThrow();expect(()=>checkedContact({route:'human'})).toThrow();
 const human=await checkAnswer('Should I change my medication?');expect(()=>checkedContact(human)).not.toThrow();expect(()=>checkedContact({...human,primary:{label:'Call now',href:'tel:999'}})).toThrow();
});
