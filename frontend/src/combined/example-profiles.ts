import type { RecordNote } from './api';

export type ExampleProfileId = 'family-history';
type ExampleProfile = { id: ExampleProfileId; name: string; age?: number; description: string; text: string; records: RecordNote[] };

// Fictional inputs. The unchanged Emma demo has a prepared result in emma-demo.ts;
// edited stories still use Rob's backend extraction and recommendation rules.
export const exampleProfiles: Record<ExampleProfileId, ExampleProfile> = {
  'family-history': {
    id: 'family-history', name: 'Emma', age: 35, description: 'Family history',
    text: 'I’m Emma and I’m 35. Generally I feel pretty healthy. I don’t take any regular medication and I’m not seeing my GP for anything at the moment. I had my appendix removed when I was younger but otherwise I’ve never had any major health problems. My mum had breast cancer when she was 42, which is something I worry about. My dad has high blood pressure. I’d mainly like to make sure I’m healthy and understand whether there’s anything I should be checking as I get older.',
    records: [],
  },
};
