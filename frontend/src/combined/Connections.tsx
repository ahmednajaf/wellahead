import { useState } from 'react';
import type { RecordNote } from './api';
export function RecordEditor({ onAdd, onClose }: { onAdd: (record: RecordNote) => void; onClose: () => void }) {
  const [text, setText] = useState(''), [confirmed, setConfirmed] = useState(false);
  return <section className="connection-preview" aria-label="Review a note"><h3>Review before sharing</h3><label>Only include details you want to share.<textarea value={text} maxLength={6000} onChange={e => { setText(e.target.value); setConfirmed(false); }} /></label>
    <label><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> Include this in my plan.</label>
    <button type="button" className="primary-button" disabled={!confirmed || !text.trim()} onClick={() => onAdd({ title: 'My note', text: text.trim(), source: 'Your record' })}>Include this record</button><button type="button" className="text-button" onClick={onClose}>Cancel</button>
  </section>;
}
