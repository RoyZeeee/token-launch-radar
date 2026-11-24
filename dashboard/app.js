'use strict';

const data = window.RADAR;
const root = document.querySelector('#board');
const params = new URLSearchParams(location.hash.slice(1));
const market = { key: 'implied_value_usd', direction: -1, live: false };
const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 });
const money = value => value == null ? 'Unavailable' : dollars.format(value);
const growth = value => value == null ? '—' : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
const categoryOf = row => row.category || 'Other';

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text != null) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function group(tag, className, ...children) {
  const element = node(tag, null, className);
  element.append(...children);
  return element;
}

function button(text, action) {
  const control = node('button', text);
  control.type = 'button';
  control.addEventListener('click', action);
  return control;
}

function stat(label, value) {
  return group('div', 'fact', node('span', label), node('b', value));
}

function remember(key, value) {
  if (value) params.set(key, value);
  else params.delete(key);
  history.replaceState(null, '', params.size ? `#${params}` : location.pathname);
}

const search = node('input');
search.id = 'q';
search.type = 'search';
search.placeholder = 'Protocol, category or chain';
search.value = params.get('q') || '';
const category = node('select');
category.id = 'category';
for (const label of ['All categories', ...new Set([...data.rows, ...data.live].map(categoryOf).sort())]) {
  const option = node('option', label);
  option.value = label === 'All categories' ? '' : label;
  category.append(option);
}
category.value = params.get('category') || '';
const count = node('span', null, 'count');
count.setAttribute('aria-live', 'polite');
const results = node('section', null, 'panel table-wrap');
const detail = node('dialog', null, 'detail');
detail.setAttribute('aria-labelledby', 'detail-title');
detail.addEventListener('close', () => remember('p', ''));

function field(label, control) {
  const title = node('label', label);
  title.htmlFor = control.id;
  return group('div', 'field', title, control);
}

function switchMarket(live) {
  market.live = live;
  market.key = live ? 'mcap_usd' : 'implied_value_usd';
  market.direction = -1;
  renderRows();
}

const radarTab = button('Token unrecorded', () => switchMarket(false));
const liveTab = button('Market comparables', () => switchMarket(true));
search.addEventListener('input', () => {
  remember('q', search.value.trim());
  renderRows();
});
category.addEventListener('change', () => {
  remember('category', category.value);
  renderRows();
});

function selectedRows() {
  const query = search.value.trim().toLowerCase();
  return (market.live ? data.live : data.rows)
    .filter(row => !category.value || categoryOf(row) === category.value)
    .filter(row => [row.name, row.slug, categoryOf(row), ...row.chains].join(' ').toLowerCase().includes(query))
    .sort((a, b) => {
      const left = a[market.key];
      const right = b[market.key];
      if (left == null || right == null) return Number(left == null) - Number(right == null);
      const order = typeof left === 'string' ? left.localeCompare(right) : left - right;
      return order * market.direction || a.slug.localeCompare(b.slug);
    });
}

function column(key, label) {
  const heading = node('th');
  heading.scope = 'col';
  if (key === market.key) heading.setAttribute('aria-sort', market.direction === -1 ? 'descending' : 'ascending');
  const arrow = key === market.key ? (market.direction === -1 ? ' ↓' : ' ↑') : '';
  heading.append(button(label + arrow, () => {
    market.direction = market.key === key ? -market.direction : (key === 'name' || key === 'rank' ? 1 : -1);
    market.key = key;
    renderRows(key);
  }));
  heading.dataset.sort = key;
  return heading;
}

function renderRows(focusKey) {
  const rows = selectedRows();
  const valueKey = market.live ? 'mcap_usd' : 'implied_value_usd';
  radarTab.setAttribute('aria-pressed', String(!market.live));
  liveTab.setAttribute('aria-pressed', String(market.live));
  count.textContent = `${rows.length} of ${market.live ? data.live_size : data.board_size} protocols`;
  if (rows.length === 0) {
    results.replaceChildren(group('div', 'model', node('p', 'No protocols match these filters.'), button('Clear filters', () => {
      search.value = '';
      category.value = '';
      remember('q', '');
      remember('category', '');
      renderRows();
      search.focus();
    })));
    return;
  }

  const header = node('tr');
  if (!market.live) header.append(column('rank', 'Rank'));
  header.append(column('name', 'Protocol'), column('tvl_usd', 'TVL'), column('change_7d', 'TVL · 7d'));
  if (!market.live) header.append(column('age_days', 'Listed'));
  header.append(column(valueKey, market.live ? 'Market cap' : 'Implied value'));

  const body = node('tbody');
  const maxValue = Math.max(...rows.map(row => row[valueKey] || 0), 1);
  for (const row of rows) {
    const tr = node('tr');
    if (!market.live) tr.append(node('td', row.rank, 'num'));
    const label = market.live ? node('b', row.name) : button(row.name, () => openDetail(row));
    label.className = 'protocol-link';
    const networks = row.chains.slice(0, 2).join(', ');
    tr.append(group('td', 'protocol-cell', label, node('div', networks ? `${categoryOf(row)} · ${networks}` : categoryOf(row), 'sub')));
    tr.append(node('td', money(row.tvl_usd), 'num'));
    const tone = row.change_7d == null ? '' : row.change_7d < 0 ? 'neg' : 'pos';
    tr.append(node('td', growth(row.change_7d), `num ${tone}`));
    if (!market.live) tr.append(node('td', row.age_days == null ? '—' : `${row.age_days.toLocaleString('en-US')}d`, 'num'));
    const fill = node('i');
    fill.style.width = `${Math.max(2, (row[valueKey] || 0) / maxValue * 100)}%`;
    const bar = group('span', 'bar', fill);
    bar.setAttribute('aria-hidden', 'true');
    tr.append(group('td', null, group('div', 'implied', bar, node('span', money(row[valueKey]), 'num'))));
    body.append(tr);
  }
  const caption = node('caption', market.live ? 'Observed market values in the sealed snapshot' : 'Implied values for protocols with no token recorded', 'sub');
  results.replaceChildren(group('table', null, caption, group('thead', null, header), body));
  if (focusKey) results.querySelector(`[data-sort="${focusKey}"] button`)?.focus();
}

function openDetail(row) {
  remember('p', row.slug);
  const title = node('h2', row.name);
  title.id = 'detail-title';
  const close = button('Close', () => detail.close());
  close.className = 'close';
  const top = group('header', 'detail-head',
    group('div', null, node('span', `Rank ${row.rank} of ${data.board_size}`, 'brand-name'), title,
      node('p', [categoryOf(row), ...row.chains].join(' · '), 'sub')),
    close);
  const equation = group('div', 'equation',
    stat('TVL', money(row.tvl_usd)),
    stat('Seven-day TVL movement', growth(row.change_7d)),
    stat('Days since first listing', row.age_days ?? 'Unavailable'),
    stat('Peer market cap / TVL', `${row.peer_multiple.toFixed(3)}×`),
    stat('Growth multiplier', `${row.growth_multiplier}×`),
    stat('Maturity multiplier', `${row.maturity_multiplier}×`),
    stat('Implied value', money(row.implied_value_usd)));
  const plan = node('ol', null, 'steps');
  for (const step of row.farm_steps) {
    const cut = step.indexOf(' Cost: ');
    plan.append(group('li', null, node('b', cut < 0 ? step : step.slice(0, cut)), node('div', cut < 0 ? '' : step.slice(cut + 1), 'sub')));
  }
  detail.replaceChildren(top,
    group('section', 'detail-section', node('h3', 'Valuation breakdown'), equation),
    group('section', 'detail-section', node('h3', 'Campaign research plan'), plan));
  if (!detail.open) detail.showModal();
}

const model = data.model;
const methodology = group('details', 'panel model',
  node('summary', 'How the estimates are built'),
  node('p', 'The peer model fits how market-cap-to-TVL ratios vary with protocol size. It estimates a category adjustment in log space, blending its median with the global median using eight observations of weight for the global estimate.', 'sub'),
  node('p', `Implied value = TVL × peer multiple × growth factor × maturity factor. Seven-day TVL movement is clipped between ${model.growth_floor}% and ${model.growth_cap}%; missing movement uses 0%. Missing listing age uses ${model.unknown_age_days} days.`, 'sub'),
  node('p', 'Snapshot fields cannot confirm a future launch, a current campaign, or eligibility. The listed capital amounts are illustrative ceilings and transaction fees come from live wallet quotes.', 'sub'));
const validation = data.validation;
if (validation.peer_error !== null) {
  const baseline = validation.flat_error.toFixed(2);
  const peer = validation.peer_error.toFixed(2);
  methodology.append(node('p',
    `Held-out valuation check: ${peer}× median error versus ${baseline}× for a flat multiple. Fit on ${validation.train} older listed assets and evaluated on ${validation.test} assets listed from ${validation.split_date}; one observation per asset. All values come from the same snapshot, so this is a cross-sectional test and does not measure launch-day prices.`,
    'sub'));
}
const coverage = data.coverage;
methodology.append(node('p',
  `Snapshot audit: ${coverage.ranked} ranked, ${coverage.tokenRecorded} with a token recorded, ${coverage.excludedProducts} excluded by product or version rules, and ${coverage.outsideBoard} other candidates outside the board. Total: ${coverage.total} protocols.`,
  'sub'));
const masthead = group('header', 'top',
  group('div', 'brand', node('span', null, 'mark'), node('span', 'Token Radar', 'brand-name')),
  group('div', 'top-meta', node('span', `DefiLlama snapshot · ${data.as_of}`)));
const intro = group('section', 'lede',
  group('div', null, node('h1', 'Where a token could launch'),
    node('p', 'Compare peer-based valuations and recent liquidity movement, then inspect the evidence and research steps for each protocol.')),
  group('div', 'facts',
    stat('Official watchlist covered', `${data.watchlist_size} / ${data.watchlist_size}`),
    stat('Ranked / snapshot total', `${coverage.ranked} / ${coverage.total}`),
    stat('Earlier-stage protocols', data.early_size),
    stat('Median error on held-out peers', validation.peer_error === null ? 'Unavailable' : `${validation.peer_error.toFixed(2)}×`)));
const controls = group('section', 'controls', field('Search', search), field('Category', category), group('div', 'tabs', radarTab, liveTab), count);

root.replaceChildren(group('div', 'shell', masthead, intro, controls, results, methodology), detail);
root.setAttribute('aria-busy', 'false');
renderRows();
const selected = data.rows.find(row => row.slug === params.get('p'));
if (selected) openDetail(selected);
