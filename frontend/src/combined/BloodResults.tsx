import { bloodResultsFor, type BloodReport, type BloodResult } from './blood-results';
import './blood-results.css';

export default function BloodResults({ report, system, name }: { report: BloodReport; system: string; name: string }) {
  const results = bloodResultsFor(report, system);
  return <section className="blood-results-panel" aria-label={`${name} blood results`}>
    <header><span className="eyebrow">BUPA DEMO · BLOOD RESULTS</span><h2>Your blood results</h2><p>{report.patient} · {report.age} · {report.sex} · Synthetic data</p></header>
    {results.direct.length > 0 && <ResultTable rows={results.direct} caption={`Results categorised as ${name} in the supplied report`} />}
    {results.related.length > 0 && <><h3>Related blood markers</h3>{!results.direct.length && <p>No dedicated {name.toLowerCase()} tests are included in this report.</p>}<p>{results.context}</p><ResultTable rows={results.related} caption={`Related markers for ${name}`} showCategory /></>}
    {!results.count && <p>No relevant blood results are supplied for this area.</p>}
    <details className="blood-source"><summary>About these results</summary><p>From {report.sourceFile}. Values and units are shown as supplied. Collection date and reference ranges were not provided, so results are not classified as normal or abnormal.</p><p>This is a fictional Bupa connection, not a live account or laboratory feed. These results do not change your plan or optimisation score.</p></details>
  </section>;
}

function ResultTable({ rows, caption, showCategory = false }: { rows: BloodResult[]; caption: string; showCategory?: boolean }) {
  return <div className="blood-table-scroll" role="region" aria-label={caption} tabIndex={0}><table className="blood-table"><caption>{caption}</caption><thead><tr><th scope="col">Test</th><th scope="col">Result</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><th scope="row">{row.biomarker}{showCategory && <small>{row.category}</small>}{row.notes !== 'Synthetic demo result' && <small>{row.notes}</small>}</th><td><strong>{row.value}</strong> <span>{row.units}</span></td></tr>)}</tbody></table></div>;
}
