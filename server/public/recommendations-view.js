// Provider and programme rules arrive as server-owned copy. Never render raw HTML.
export function renderRecommendations(container, data) {
  container.replaceChildren();
  container.hidden = !data;
  if (!data) return;
  const element = (tag, text, parent = container) => {
    const node = document.createElement(tag); node.textContent = text; parent.append(node); return node;
  };
  element('h2', 'Checks and services to consider');
  element('p', 'Based on what you shared. Confirm suitability before booking.');
  const groups = [
    ['Your Bupa assessment option', data.primary ? [data.primary] : []],
    ['Optional Bupa discussions', data.optional || []],
    ['NHS screening and checks', data.nhs || []],
    ['Risk reviews with a clinician', data.nice || []]
  ];
  for (const [title, items] of groups) {
    if (!items.length) continue;
    const section = element('section', ''); element('h3', title, section);
    for (const item of items) {
      const detail = element('details', '', section);
      detail.dataset.recommendationId = item.id;
      element('summary', `${item.title} · ${item.status.replaceAll('_', ' ')}`, detail);
      element('p', item.explanation, detail);
      element('p', `Why this appears: ${item.trigger}`, detail);
      if (item.clinicianReview) element('p', 'Discuss this with a clinician before choosing a test.', detail);
      if (item.availableWithSelectedProduct === false) element('p', 'Not listed as an add-on to your selected assessment; confirm options with Bupa.', detail);
      const link = element('a', `${item.authority} guidance ↗`, detail);
      if (/^https:\/\/(?:www\.)?(?:bupa\.co\.uk|nhs\.uk|nice\.org\.uk)\//.test(item.sourceUrl)) link.href = item.sourceUrl;
      link.target = '_blank'; link.rel = 'noopener noreferrer';
    }
  }
  for (const uncertainty of data.uncertainties || []) element('p', uncertainty);
}
