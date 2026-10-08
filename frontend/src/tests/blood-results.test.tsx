import csv from '../combined/data/mock_normal_patient_blood_results.csv?raw';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import App from '../combined/App';
import BloodResults from '../combined/BloodResults';
import { emmaBloodReport } from '../combined/emma-blood-results';
import { bloodResultsFor } from '../combined/blood-results';
import { systems } from '../combined/domains';
import { emmaDemoSnapshot } from '../combined/emma-demo-snapshot';
import { planTodos } from '../combined/plan-progress';

afterEach(() => vi.useRealTimers());

test('all 77 supplied CSV rows survive with exact values, units, categories and patient metadata', () => {
  const cell = (value: string) => /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
  const header = 'Patient,Age,Sex,Demo patient,Category,Biomarker,Mock result,Units,Notes';
  const rows = emmaBloodReport.results.map(row => [emmaBloodReport.patient, String(emmaBloodReport.age), emmaBloodReport.sex, 'True', row.category, row.biomarker, row.value, row.units, row.notes].map(cell).join(','));
  expect([header, ...rows].join('\n')).toBe(csv.replace(/^\uFEFF/, '').replaceAll('\r\n', '\n').trimEnd());
  expect(rows).toHaveLength(77);
  expect(new Set(emmaBloodReport.results.map(row => row.id)).size).toBe(77);
});

test('all domains have results while preserving each original category and avoiding duplicate rows', () => {
  let directCount = 0;
  for (const system of systems) {
    const rows = bloodResultsFor(emmaBloodReport, system.id);
    expect(rows.count).toBeGreaterThan(0);
    expect(new Set([...rows.direct, ...rows.related].map(row => row.id)).size).toBe(rows.count);
    for (const row of rows.direct) expect(row.category).toBe(system.name);
    if (!rows.direct.length) expect(rows.context).not.toBe('');
    directCount += rows.direct.length;
  }
  expect(directCount).toBe(77);
  expect(bloodResultsFor(emmaBloodReport, 'lungs').direct).toEqual([]);
  expect(bloodResultsFor(emmaBloodReport, 'lungs').related.map(row => row.biomarker)).toEqual(['RBC', 'Haemoglobin']);
  expect(bloodResultsFor(undefined, 'heart').count).toBe(0);
  expect(bloodResultsFor(emmaBloodReport, 'unknown').count).toBe(0);
  expect(planTodos({ ...emmaDemoSnapshot.plan, bloodResults: emmaBloodReport })).toEqual(planTodos(emmaDemoSnapshot.plan));
});

test.each(systems)('$name displays every mapped result with provenance, without a clinical normality label', system => {
  const { container } = render(<BloodResults report={emmaBloodReport} system={system.id} name={system.name} />);
  const rows = bloodResultsFor(emmaBloodReport, system.id);
  expect(container.querySelectorAll('tbody tr')).toHaveLength(rows.count);
  expect(screen.getByText(/Emma Thompson · 35 · Female · Synthetic data/)).toBeInTheDocument();
  expect(screen.getByText(/Collection date and reference ranges were not provided/)).toBeInTheDocument();
  if (!rows.direct.length) expect(screen.getByText(`No dedicated ${system.name.toLowerCase()} tests are included in this report.`)).toBeInTheDocument();
  if (system.id === 'whole') expect(within(screen.getByRole('row', { name: /Lead/ })).getByText('<1.0')).toBeInTheDocument();
  if (system.id === 'reproductive') expect(screen.getAllByText('Synthetic demo, early follicular phase')).toHaveLength(4);
});

test('Bupa opens cached Emma with blood results after three seconds and restores the personal draft on exit', async () => {
  vi.useFakeTimers(); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch); render(<App />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My personal story.' } });
  fireEvent.click(screen.getByRole('button', { name: 'bupa Connect' }));
  expect(screen.getByRole('dialog', { name: 'Bupa example connection' })).toHaveTextContent('Emma Thompson · 35');
  fireEvent.click(screen.getByRole('button', { name: 'Open Emma’s profile' }));
  await act(() => vi.advanceTimersByTimeAsync(2999));
  expect(screen.queryByRole('heading', { name: 'Here’s what we understood' })).not.toBeInTheDocument();
  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(screen.getByRole('heading', { name: 'Here’s what we understood' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Looks right' }));
  expect(document.querySelectorAll('.system-results-hint')).toHaveLength(15);
  fireEvent.click(screen.getByRole('button', { name: /^Blood & nutrition,/ }));
  expect(screen.getByRole('region', { name: 'Blood & nutrition blood results' })).toBeInTheDocument();
  expect(screen.getByRole('row', { name: /Haemoglobin 13.4 g\/dL/ })).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Return to my story' }));
  expect(screen.getByRole('textbox')).toHaveValue('My personal story.');
  expect(screen.queryByRole('heading', { name: 'Your blood results' })).not.toBeInTheDocument();
  vi.useRealTimers();
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ route:'prevention', profile:{answers:['56','','','','',''],records:[],facts:[]}, actions:[], intro:'Your plan', followUp:'', uncertainty:'' }), { headers:{'Content-Type':'application/json'} }));
  fireEvent.click(screen.getByRole('button', { name:'Review my health profile' }));
  await screen.findByRole('heading', { name:'Here’s what we understood' });
  fireEvent.click(screen.getByRole('button', { name:'Looks right' }));
  expect(document.querySelectorAll('.system-results-hint')).toHaveLength(0);
  expect(screen.queryByText('Emma · example profile')).not.toBeInTheDocument();
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ intake:'My personal story.', records:[] });
});

test('cancelling Bupa loading cannot replace the personal story with Emma or her results', async () => {
  vi.useFakeTimers(); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch); render(<App />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My personal story.' } });
  fireEvent.click(screen.getByRole('button', { name: 'bupa Connect' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open Emma’s profile' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await act(() => vi.advanceTimersByTimeAsync(3000));
  expect(screen.getByRole('textbox')).toHaveValue('My personal story.');
  expect(screen.queryByText('Emma · example profile')).not.toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});
