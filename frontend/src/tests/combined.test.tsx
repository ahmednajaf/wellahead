import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { test, expect, vi } from 'vitest';
import App from '../combined/App';
const story='I am 56. I enjoy walking.';
const plan={route:'prevention',profile:{answers:['56','','','I enjoy walking.','',''],records:[],facts:[]},intro:'A plan around you.',followUp:'',uncertainty:'',actions:[]};
const json=(value:unknown)=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
function review() { fireEvent.change(screen.getByRole('textbox'),{target:{value:story}});fireEvent.click(screen.getByRole('button',{name:'Review my health profile'})); }
test('six extracted sections are confirmed without a second planner call',async()=>{
 const fetch=vi.fn().mockResolvedValue(json(plan));vi.stubGlobal('fetch',fetch);render(<App/>);review();
 await screen.findByRole('heading',{name:'Here’s what we understood'});expect(document.querySelectorAll('.review-grid article')).toHaveLength(6);expect(screen.getByRole('heading',{name:'Age'})).toBeInTheDocument();expect(screen.getByText('56',{exact:true})).toBeInTheDocument();expect(fetch).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByRole('button',{name:'Looks right'}));await screen.findByRole('button',{name:'How are you feeling today?'});
 expect(fetch).toHaveBeenCalledTimes(1);expect(fetch.mock.calls[0][0]).toBe('/api/plan');expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({intake:story,records:[]});
 expect(document.querySelectorAll('.system-grid img')).toHaveLength(15);
});
test('corrections re-extract the story using the same upstream endpoint',async()=>{
 const fetch=vi.fn().mockImplementation(async()=>json(plan));vi.stubGlobal('fetch',fetch);render(<App/>);review();await screen.findByRole('heading',{name:'Here’s what we understood'});fireEvent.click(screen.getByRole('button',{name:'Edit my story'}));
 expect(screen.getByRole('textbox')).toHaveValue(story);fireEvent.change(screen.getByRole('textbox'),{target:{value:'I am 57.'}});fireEvent.click(screen.getByRole('button',{name:'Review my health profile'}));
 await screen.findByRole('heading',{name:'Here’s what we understood'});expect(fetch).toHaveBeenCalledTimes(2);expect(JSON.parse(fetch.mock.calls[1][1].body).intake).toBe('I am 57.');
});
test('presentation onboarding has no invented connections or canned plans',()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);render(<App/>);expect(screen.queryByText(/Optional · demo|Try the exercise demo/)).not.toBeInTheDocument();expect(fetch).not.toHaveBeenCalled();
});
test('cancelling a plan preserves the review and ignores a late response',async()=>{
 let resolve!:(value:Response)=>void;vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(r=>{resolve=r;})));render(<App/>);review();fireEvent.click(screen.getByRole('button',{name:'Cancel'}));resolve(json(plan));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Review my health profile'})).not.toBeDisabled());expect(screen.getByRole('textbox')).toHaveValue(story);expect(screen.queryByRole('button',{name:'How are you feeling today?'})).not.toBeInTheDocument();
});
test('server failure leaves the story review intact without exposing error bodies',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('private upstream failure',{status:503})));render(<App/>);review();
 await screen.findByRole('alert');expect(screen.getByRole('textbox')).toHaveValue(story);expect(screen.queryByText('private upstream failure')).not.toBeInTheDocument();
});
