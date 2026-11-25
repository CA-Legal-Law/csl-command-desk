(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const number = new Intl.NumberFormat('en-US', {maximumFractionDigits: 2});
  const money = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'});
  const percent = new Intl.NumberFormat('en-US', {style: 'percent', maximumFractionDigits: 1});
  const month = new Intl.DateTimeFormat('en-US', {month: 'short', year: 'numeric', timeZone: 'UTC'});
  const day = new Intl.DateTimeFormat('en-US', {dateStyle: 'medium', timeZone: 'UTC'});
  const pacific = new Intl.DateTimeFormat('en-US', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Los_Angeles'});
  const text = (value, format=number) => Number.isFinite(value) ? format.format(value) : '—';
  const date = value => day.format(new Date(value + 'T00:00:00Z'));
  const el = (tag, value, className) => {
    const element = document.createElement(tag);
    if (value != null) element.textContent = value;
    if (className) element.className = className;
    return element;
  };

  function table(id, headings, rows) {
    const result = el('table');
    const heading = result.createTHead().insertRow();
    for (const label of headings) {
      const header = el('th', label);
      header.scope = 'col';
      heading.append(header);
    }
    const body = result.createTBody();
    for (const {label, cells, below} of rows) {
      const row = body.insertRow();
      const header = el('th', label);
      header.scope = 'row';
      row.append(header);
      for (const cell of cells) row.append(el('td',cell));
      if (below) row.cells[1].dataset.below = 'true';
    }
    $(id).replaceChildren(result);
  }

  function metric(label, value, note) {
    const card = el('article',null,'metric');
    card.append(el('p',label,'label'), el('strong',text(value)), el('p',note,'note'));
    return card;
  }

  function track(value, maximum) {
    const bar = el('span',null,'bar-fill');
    bar.setAttribute('aria-hidden','true');
    bar.style.width = `${Math.max(0, value || 0) / maximum * 100}%`;
    return bar;
  }

  function renderFunnel(funnel) {
    const stages = [['New leads',funnel.new_leads], ['Consults on calendar',funnel.scheduled], ['Consults held',funnel.held],
      ['Agreements sent',funnel.offers], ['Weighted new-client sign-ups',funnel.weighted_signups]];
    const maximum = Math.max(1,...stages.map(([,value]) => value || 0));
    $('funnel-steps').replaceChildren(...stages.map(([label,value]) => {
      const row = el('div',null,'funnel-row');
      const background = el('span',null,'bar-track');
      background.append(track(value,maximum));
      row.append(el('span',label),el('strong',text(value)),background);
      return row;
    }));
  }

  function renderFollowUp(data) {
    const items = [
      ['Review open agreements',text(data.unsigned_agreements),'Check status and next steps for unsigned agreements tied to consultations in the last 45 days.'],
      ['Verify consultation outcomes',text(data.follow_up.unverified_outcome,percent),'Confirm held, canceled, or no-show status in Lawmatics for consults missing verified outcomes in the last 28 days.'],
      ['Fill in missing lead sources',text(data.follow_up.unknown_source,percent),'Resolve unknown sources from the last 28 days before comparing channels by conversion.'],
      ['Reconcile sign-up units',text(data.weighted_reconciliation_gap),'Review the difference between tracker sign-up units and signed records matched to consultations.']
    ];
    $('follow-up-items').replaceChildren(...items.map(([title,value,description]) => {
      const row = el('article',null,'follow-up');
      const content = el('div');
      content.append(el('h3',title),el('p',description,'caption'));
      row.append(el('strong',value),content);
      return row;
    }));
  }

  let history = [];
  function renderTrend() {
    const selection = $('trend-metric').value;
    if (!history.some(row => Number.isFinite(row[selection]))) {
      $('monthly-trend').replaceChildren(el('p','Monthly figures are unavailable.','caption'));
      return;
    }
    const max = Math.max(1,...history.map(row => row[selection] || 0));
    const chart = el('div',null,'trend-grid');
    for (const record of history) {
      const column = el('div',null,'trend-column');
      const plot = el('div',null,'trend-plot');
      const value = record[selection];
      const bar = el('span',null,'bar-fill');
      bar.setAttribute('aria-hidden','true');
      bar.style.height = `${Math.max(0, value || 0) / max * 78}%`;
      plot.append(el('strong',text(value)),bar);
      column.append(plot,el('p',month.format(new Date(record.month + '-01T00:00:00Z')),'caption'));
      chart.append(column);
    }
    $('monthly-trend').replaceChildren(chart);
  }

  function renderScorecard(data) {
    const {period,source,funnel,indicators,activity} = data;
    const stale = source.status === 'stale' || Date.now() - Date.parse(source.at) > 36 * 3600000;
    const label = source.kind === 'google_sheets' ? 'Google Sheets refreshed' : 'Saved workbook dated';
    $('scorecard-period').textContent = `${date(period.start)} to ${date(period.end)}`;
    $('scorecard-state').textContent = `${label} ${pacific.format(new Date(source.at))} PT${stale ? ' · Needs refresh' : ''}`;
    $('scorecard-state').dataset.stale = stale;
    $('highlights').replaceChildren(
      metric('Consultations held',funnel.held,'Selected workbook period'),
      metric('Signed and matched',data.signed_consult_records,'Signed records matched to consults'),
      metric('Paid initial invoice units',indicators.paid_units.current,'Month to date · weighted'),
      metric('Open unsigned agreements',data.unsigned_agreements,'Consults from the last 45 days')
    );
    renderFunnel(funnel);
    renderFollowUp(data);
    history = data.history;
    renderTrend();
    table('targets',['Metric','Latest','Prior','Goal'],[
      ['Consultation show rate',indicators.show_rate], ['Agreements sent within one day',indicators.fast_offers],
      ['Weighted sign-ups per held consult',indicators.close_rate]
    ].map(([label,{current,prior,target}]) => ({label,cells:[current,prior,target].map(value => text(value,percent)),
      below:Number.isFinite(current) && Number.isFinite(target) && current < target})));
    table('activity-table',['Metric','Total','Days','Through'],[
      ['Appointments set by Smith.ai',activity.smith_bookings,number], ['Meta Ads spend',activity.meta_spend,money],
      ['Meta Ads leads',activity.meta_leads,number], ['ChatGPT Ads spend',activity.chatgpt_spend,money],
      ['ChatGPT Ads leads',activity.chatgpt_leads,number]
    ].map(([label,{total,days,latest},format]) => ({label,cells:[text(total,format),text(days),latest ? date(latest) : '—']})));
    document.body.dataset.scorecardLoaded = 'true';
  }

  async function json(path) {
    const response = await fetch(path, {cache:'no-store'});
    if (!response.ok) throw new Error('Data unavailable');
    return response.json();
  }

  async function refreshScorecard() {
    if (document.visibilityState === 'hidden') return;
    try {
      renderScorecard(await json('./scorecard.json'));
    } catch {
      $('scorecard-state').textContent = document.body.dataset.scorecardLoaded
        ? 'Could not refresh. Showing the last scorecard loaded.' : 'Scorecard data is unavailable.';
      $('scorecard-state').dataset.stale = 'true';
    }
  }

  json('../metrics.json').then(metrics => {
    const clio = metrics.clio;
    const source = CSLData.sourceState(metrics,'clio');
    if (source.status === 'unavailable') throw new Error('Clio unavailable');
    const timestamp = metrics._meta.sources.clio.at;
    const currentMonth = metrics._meta.generated_date?.slice(0,7);
    const period = clio.recent_matters_window || {};
    const receiptPeriod = period.start_date && period.end_date ? `${date(period.start_date)} to ${date(period.end_date)}` : '—';
    $('clio-date').textContent = `Clio refreshed ${pacific.format(new Date(timestamp))} PT${source.status === 'stale' ? ' · Needs refresh' : ''}`;
    table('clio',['Metric','Value','Period'],[
      ['Applied collections',text(clio.collected_by_month?.[currentMonth],money),'Month to date'],
      ['Outstanding invoices',text(clio.ar_total,money),'At snapshot'],
      ['Invoice balance over 90 days',text(clio.ar_over_90,money),'At snapshot'],
      ['New matters with receipts',text(clio.new_paying_clients_30d),receiptPeriod],
      ['Open matters',text(clio.matters_open),'At snapshot']
    ].map(([label,...cells]) => ({label,cells})));
  }).catch(() => { $('clio-date').textContent = 'Clio figures are unavailable.'; });

  $('trend-metric').addEventListener('change',renderTrend);
  refreshScorecard();
  window.setInterval(refreshScorecard,86_400_000);
  document.addEventListener('visibilitychange',() => {
    if (document.visibilityState === 'visible') refreshScorecard();
  });
})();
