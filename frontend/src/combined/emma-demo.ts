import type { Plan, RecordNote } from './api';
import type { ExampleProfileId } from './example-profiles';
import { emmaDemoSnapshot } from './emma-demo-snapshot';
import { emmaBloodReport } from './emma-blood-results';

export function isEmmaDemo(id: ExampleProfileId | null, intake: string, records: RecordNote[]): boolean {
  // Never reuse a fictional plan for edited stories, imported records or check-ins.
  return id === 'family-history' && intake === emmaDemoSnapshot.intake && records.length === 0;
}

export function loadEmmaDemo(signal: AbortSignal): Promise<Plan> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException('Demo cancelled', 'AbortError'));
    };
    if (signal.aborted) {
      reject(new DOMException('Demo cancelled', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve(structuredClone({ ...emmaDemoSnapshot.plan, bloodResults: emmaBloodReport }));
    }, 3000);
    signal.addEventListener('abort', abort, { once: true });
  });
}
