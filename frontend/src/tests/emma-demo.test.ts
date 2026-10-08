import { afterEach, expect, test, vi } from 'vitest';
import { checkedProfile } from '../combined/api';
import { isEmmaDemo, loadEmmaDemo } from '../combined/emma-demo';
import { emmaDemoSnapshot } from '../combined/emma-demo-snapshot';
import { emmaBloodReport } from '../combined/emma-blood-results';
import { exampleProfiles } from '../combined/example-profiles';
import { buildHistory } from '../../../server/history.mjs';
import { materialize } from '../../../server/evidence.mjs';
import { recommend } from '../../../server/recommendations.mjs';

afterEach(() => vi.useRealTimers());

test('the prepared demo matches Rob’s matrix and catalogue without inferring Emma’s own conditions or anatomy', () => {
  const { intake, plan } = emmaDemoSnapshot;
  expect(intake).toBe(exampleProfiles['family-history'].text);
  const profile = checkedProfile(plan.profile);
  const history = buildHistory(profile, profile.facts, intake);
  expect(history.facts).toEqual(profile.facts);
  expect(history.conditions).toEqual([]);
  expect(history.medications).toEqual([]);
  expect(history.demographics.age).toBe(35);
  expect(history.demographics.sex_at_birth).toBeNull();
  expect(history.demographics.has_cervix).toBeNull();
  expect(history.lifestyle.smoking_status).toBeNull();
  expect(plan.recommendations).toEqual(recommend(history, { today: new Date('2026-09-18T12:00:00Z') }));
  for (const action of plan.actions) {
    const original = materialize([action.id], profile)[0];
    expect(action.step).toBe(original.step);
    expect(action.uncertainty).toBe(original.uncertainty);
    expect(action.sources).toEqual(original.sources.map(({ url, title, publisher }: { url: string; title: string; publisher: string }) => ({ url, title, publisher })));
  }
});

test('the cache requires an explicit Emma selection and exactly her unmodified story without records', () => {
  const story = emmaDemoSnapshot.intake;
  expect(isEmmaDemo('family-history', story, [])).toBe(true);
  expect(isEmmaDemo(null, story, [])).toBe(false);
  expect(isEmmaDemo('family-history', story + '\nI have chest pain.', [])).toBe(false);
  expect(isEmmaDemo('family-history', story, [{ title: 'Note', text: 'New information', source: 'User' }])).toBe(false);
});

test('each demo run gets an independent copy; cancelled waits never return a plan', async () => {
  vi.useFakeTimers();
  const first = loadEmmaDemo(new AbortController().signal);
  await vi.advanceTimersByTimeAsync(3000);
  const firstPlan = await first;
  firstPlan.profile!.answers[0] = '99';
  firstPlan.actions.length = 0;
  firstPlan.bloodResults!.results[0].value = '999';
  const second = loadEmmaDemo(new AbortController().signal);
  await vi.advanceTimersByTimeAsync(3000);
  expect(await second).toEqual({ ...emmaDemoSnapshot.plan, bloodResults: emmaBloodReport });
  const controller = new AbortController();
  const cancelled = expect(loadEmmaDemo(controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  controller.abort();
  await cancelled;
  expect(vi.getTimerCount()).toBe(0);
  await expect(loadEmmaDemo(controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  expect(vi.getTimerCount()).toBe(0);
});
