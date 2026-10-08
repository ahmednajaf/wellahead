import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import App from '../combined/App';
import { exampleProfiles } from '../combined/example-profiles';

afterEach(() => vi.useRealTimers());

const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
const plan = () => ({
  route: 'prevention', intro: 'Your next steps.', actions: [], followUp: '', uncertainty: '',
  profile: { answers: ['35', 'No regular medication. Appendix removed when younger.', 'Mum had breast cancer at 42. Dad has high blood pressure.', '', '', 'Understand which checks to discuss.'], records: [], facts: [] },
});

test('Emma is a one-click demo and still requires explicit profile confirmation', async () => {
  vi.useFakeTimers();
  const fetch = vi.fn().mockImplementation(async () => json(plan())); vi.stubGlobal('fetch', fetch); render(<App />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My own draft.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Emma demo, age 35' }));
  expect(screen.getByRole('textbox')).toHaveValue(exampleProfiles['family-history'].text);
  expect(screen.getByRole('textbox')).toHaveFocus();
  expect(screen.getByRole('button', { name: 'Emma demo, age 35' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Apple Health/ })).not.toBeInTheDocument();
  expect(screen.getByRole('button', {name:'bupa Connect'})).toBeInTheDocument();
  expect(screen.queryByText('Alex’s Bupa health summary')).not.toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Review my health profile' }));
  expect(screen.getByRole('status')).toHaveTextContent('Getting your story ready to review…');
  await act(() => vi.advanceTimersByTimeAsync(2999));
  expect(screen.queryByRole('heading', { name: 'Here’s what we understood' })).not.toBeInTheDocument();
  await act(() => vi.advanceTimersByTimeAsync(1));
  vi.useRealTimers();
  expect(screen.getByRole('heading', { name: 'Here’s what we understood' })).toBeInTheDocument();
  expect(document.querySelectorAll('.review-grid article')).toHaveLength(6);
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.queryByRole('heading', { name: 'Notes you included' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Looks right' }));
  expect(screen.getByText('Emma · example profile')).toBeInTheDocument();
  const apple = screen.getByRole('button', { name: 'Apple Health' });
  expect(apple).toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(apple);
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Return to my story' }));
  expect(screen.getByRole('textbox')).toHaveValue('My own draft.');
  expect(screen.queryByText('Alex’s Bupa health summary')).not.toBeInTheDocument();
});

test('Emma’s stated age reaches confirmation without Bupa records and her story remains editable', async () => {
  vi.useFakeTimers();
  const fetch = vi.fn().mockImplementation(async () => json(plan())); vi.stubGlobal('fetch', fetch); render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Emma demo, age 35' }));
  expect(screen.getByRole('textbox')).toHaveValue(exampleProfiles['family-history'].text);
  expect(screen.queryByText('Alex’s Bupa health summary')).not.toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Review my health profile' }));
  await act(() => vi.advanceTimersByTimeAsync(3000));
  vi.useRealTimers();
  expect(fetch).not.toHaveBeenCalled();
  const age = screen.getByRole('heading', { name: 'Age' }).closest('article')!;
  expect(within(age).getByText('35')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Edit my story' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: exampleProfiles['family-history'].text.replace('I’m 35.', 'I’m 36.') } });
  fireEvent.click(screen.getByRole('button', { name: 'Review my health profile' }));
  await screen.findByRole('heading', { name: 'Here’s what we understood' });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toBe('/api/plan');
  expect(JSON.parse(fetch.mock.calls[0][1].body).intake).toBe(exampleProfiles['family-history'].text.replace('I’m 35.', 'I’m 36.'));
});

test('leaving the example restores the original story and selected note without mixing profile records', () => {
  vi.stubGlobal('fetch', vi.fn()); render(<App />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My own draft.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add a record' }));
  fireEvent.change(screen.getByLabelText('Only include details you want to share.'), { target: { value: 'My selected note.' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Include this in my plan.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Include this record' }));
  fireEvent.click(screen.getByRole('button', { name: 'Emma demo, age 35' }));
  expect(screen.queryByText('My selected note.')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Emma demo, age 35' }));
  expect(screen.getByRole('textbox')).toHaveValue('My own draft.');
  expect(screen.getByText('My selected note.')).toBeInTheDocument();
  expect(screen.queryByText('Alex’s Bupa health summary')).not.toBeInTheDocument();
});

test('leaving a pending cached example cancels its timer and restores the user draft', async () => {
  vi.useFakeTimers();
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch); render(<App />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My own draft.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Emma demo, age 35' }));
  fireEvent.click(screen.getByRole('button', { name: 'Review my health profile' }));
  expect(screen.getByRole('button', { name: 'Emma demo, age 35' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Return to my story' }));
  await act(() => vi.advanceTimersByTimeAsync(3000));
  expect(screen.getByRole('button', { name: 'Review my health profile' })).not.toBeDisabled();
  expect(screen.getByRole('textbox')).toHaveValue('My own draft.');
  expect(screen.queryByRole('heading', { name: 'Here’s what we understood' })).not.toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('adding a record to Emma uses the backend rather than ignoring new health information', async () => {
  const fetch = vi.fn().mockImplementation(async () => json(plan())); vi.stubGlobal('fetch', fetch); render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Emma demo, age 35' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add a record' }));
  fireEvent.change(screen.getByLabelText('Only include details you want to share.'), { target: { value: 'Additional test note.' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Include this in my plan.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Include this record' }));
  fireEvent.click(screen.getByRole('button', { name: 'Review my health profile' }));
  await screen.findByRole('heading', { name: 'Here’s what we understood' });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toBe('/api/plan');
  expect(JSON.parse(fetch.mock.calls[0][1].body).records[0].text).toBe('Additional test note.');
});

test('a check-in after cached Emma still goes to the normal guardrail route', async () => {
  vi.useFakeTimers();
  const fetch = vi.fn().mockResolvedValue(json({ route: 'human', title: 'A person can help with this', message: 'Contact a healthcare professional.', primary: { label: 'Call NHS 111', href: 'tel:111' }, note: 'This app has not contacted anyone.' }));
  vi.stubGlobal('fetch', fetch); render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Emma demo, age 35' }));
  fireEvent.click(screen.getByRole('button', { name: 'Review my health profile' }));
  await act(() => vi.advanceTimersByTimeAsync(3000));
  vi.useRealTimers();
  fireEvent.click(screen.getByRole('button', { name: 'Looks right' }));
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'How are you feeling today?' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Your health check-in' }), { target: { value: 'Should I change my medication?' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send health check-in' }));
  expect(await screen.findByRole('link', { name: 'Call NHS 111' })).toHaveAttribute('href', 'tel:111');
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toBe('/api/plan');
  expect(JSON.parse(fetch.mock.calls[0][1].body).intake).toBe(`${exampleProfiles['family-history'].text}\n\nToday's health check-in:\nShould I change my medication?`);
});
