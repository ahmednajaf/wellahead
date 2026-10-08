import type { BloodReport } from './blood-results';
export type RecordNote = { title: string; text: string; source: string };
export type Profile = { answers: string[]; records: RecordNote[]; facts: { key: string; value: string; evidence: string }[] };
export type Contact = { route: 'emergency' | 'human'; title: string; message: string; primary: { label: string; href: string }; secondary?: { label: string; href: string }; note: string };
export type Action = { id: string; title: string; idea: string; reason: string; context: string; backup?: string; step: string; uncertainty: string; systems: string[]; sources: { url: string; title: string; publisher: string }[]; calendar?: { description: string; location: string } };
export type Plan = { route: 'prevention'; profile?: Profile; bloodResults?: BloodReport; intro: string; actions: Action[]; followUp: string; uncertainty: string; demoScenario?: string; recommendations?: Parameters<typeof import('../../../server/public/recommendations-view.js').renderRecommendations>[1] };
export async function request<T>(path: string, input: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(190000)]) : AbortSignal.timeout(190000), cache: 'no-store' });
  if (!response.ok) throw new Error('The request did not finish. Your words are still here. Please try again.');
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Invalid server response. Please try again.');
  return response.json();
}
export const safeLink = (url: string) => /^(https:\/\/|tel:(?:111|999)$)/.test(url) ? url : undefined;

export function checkedContact(input: unknown): Contact {
  const value = input as Contact;
  if (!value || !['emergency','human'].includes(value.route)
      || typeof value.title !== 'string' || typeof value.message !== 'string' || typeof value.note !== 'string'
      || typeof value.primary?.label !== 'string' || value.primary.href !== (value.route === 'emergency' ? 'tel:999' : 'tel:111')
      || (value.secondary && (typeof value.secondary.label !== 'string' || typeof value.secondary.href !== 'string' || !safeLink(value.secondary.href)))) {
    throw new Error('Invalid support response. Please try again.');
  }
  return value;
}

export function checkedProfile(value: unknown): Profile {
  const profile = value as Profile;
  if (!profile || !Array.isArray(profile.answers) || profile.answers.length !== 6 || profile.answers.some(s => typeof s !== 'string')
      || !Array.isArray(profile.records) || profile.records.some(r => !r || typeof r.title !== 'string' || typeof r.text !== 'string' || typeof r.source !== 'string')
      || !Array.isArray(profile.facts) || profile.facts.some(f => !f || typeof f.key !== 'string' || typeof f.value !== 'string' || typeof f.evidence !== 'string')) throw new Error('Invalid profile response.');
  return profile;
}
