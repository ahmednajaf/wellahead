import { exampleProfiles, type ExampleProfileId } from './example-profiles';

export default function ExampleProfiles({ selected, disabled, onSelect }: {
  selected: ExampleProfileId | null; disabled: boolean; onSelect: (id: ExampleProfileId | null) => void;
}) {
  const emma = exampleProfiles['family-history'];
  return <button type="button" className="demo-profile-switch" aria-label="Emma demo, age 35"
    aria-pressed={selected === emma.id} disabled={disabled} onClick={() => onSelect(selected === emma.id ? null : emma.id)}>
    <span>Demo</span><strong>{emma.name} · {emma.age}</strong>
  </button>;
}
