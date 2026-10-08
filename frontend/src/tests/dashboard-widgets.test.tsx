import { render, screen, fireEvent, within } from '@testing-library/react';
import { test, expect, vi } from 'vitest';
import Dashboard from '../combined/Dashboard';
import type { Action, Plan } from '../combined/api';

const action = (id:string):Action => ({id,title:`Step ${id}`,idea:`Existing suggestion ${id}`,reason:'From the plan',systems:[],context:'',step:'',uncertainty:'',sources:[]});
test('home separates outstanding Bupa and NHS names from booked appointments and completed items', () => {
 const checks=['one','two','three','four','five','six'].map(id=>({id,title:`Test ${id}`,status:'confirm_suitability',authority:'Bupa',explanation:'Confirm suitability with a clinician.',trigger:'Existing backend rule',sourceUrl:'https://www.bupa.co.uk/'}));
 const plan={actions:[action('walk')],recommendations:{primary:checks[0],optional:[...checks.slice(1),{...checks[0],id:'excluded',title:'Excluded test',status:'not_eligible'}],nice:[],nhs:[{...checks[0],id:'nhs-check',title:'NHS Health Check',authority:'NHS',status:'due',sourceUrl:'https://www.nhs.uk/'},{...checks[0],id:'nhs-current',title:'Current NHS check',authority:'NHS',status:'up_to_date'}],uncertainties:[]}} as unknown as Plan, onPlan=vi.fn(), onCalendar=vi.fn();
 const before=JSON.stringify(plan);
 render(<Dashboard plan={plan} progress={{'check:five':'booked','check:six':'completed'}} onCalendar={onCalendar} onOpen={()=>{}} onPlan={onPlan} />);
 const list=within(screen.getByRole('list',{name:'Recommended Bupa and NHS tests'}));
 expect(list.getAllByRole('listitem')).toHaveLength(5);
 expect(list.getByText('Test two')).toBeInTheDocument();expect(list.getByText('NHS Health Check')).toBeInTheDocument();
 expect(list.queryByText(/^Discuss /)).not.toBeInTheDocument();expect(list.queryByText('Current NHS check')).not.toBeInTheDocument();
 expect(list.queryByText('Step walk')).not.toBeInTheDocument();
 expect(list.queryByText('Excluded test')).not.toBeInTheDocument();
 expect(list.queryByText('Confirm suitability with a clinician.')).not.toBeInTheDocument();
 expect(list.queryByText('Test five')).not.toBeInTheDocument();
 expect(screen.queryByText('Test six')).not.toBeInTheDocument();
 const booked=within(screen.getByRole('list',{name:'Booked appointments'}));
 expect(booked.getAllByRole('listitem')).toHaveLength(1);expect(booked.getByText('Discuss Test five')).toBeInTheDocument();
 expect(screen.queryByRole('tab')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'View your full health plan'}));expect(onPlan).toHaveBeenCalledOnce();
 fireEvent.click(list.getByRole('button',{name:'View details for Test two'}));expect(onPlan).toHaveBeenLastCalledWith('two');expect(onCalendar).not.toHaveBeenCalled();
 fireEvent.click(list.getByRole('button',{name:'Book time for Test two in Google Calendar'}));expect(onPlan).toHaveBeenCalledTimes(2);
 expect(onCalendar).toHaveBeenCalledWith({id:'two',todoId:'check:two',title:'Discuss Test two',intent:'schedule'});
 expect(JSON.stringify(plan)).toBe(before);
 expect(document.querySelectorAll('.dashboard-widgets > section')).toHaveLength(2);
});
test('an empty action list does not fill the widget with invented recommendations', () => {
 render(<Dashboard plan={{actions:[]} as unknown as Plan} onCalendar={()=>{}} onOpen={()=>{}} onPlan={()=>{}} />);
 expect(screen.queryByRole('list',{name:'Recommended Bupa and NHS tests'})).not.toBeInTheDocument();
 expect(screen.getByText('No Bupa or NHS tests to arrange in this plan.')).toBeInTheDocument();
});
test('the backend scope notice is visible on the dashboard without adult recommendations', () => {
 const intro='This demo uses guidance for adults aged 19 and over, so it cannot offer an adult prevention plan for your age.';
 render(<Dashboard plan={{actions:[],intro} as unknown as Plan} onCalendar={()=>{}} onOpen={()=>{}} onPlan={()=>{}} />);
 expect(screen.getByText(intro)).toBeInTheDocument();
 expect(screen.queryByRole('list',{name:'Recommended Bupa and NHS tests'})).not.toBeInTheDocument();
});
