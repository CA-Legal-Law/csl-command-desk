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
  const formatFor = {number,money,percent};
  const WORKBOOK_TABS = [
    ['Command Dashboard','#funnel','Funnel, goals, and forecasts'], ['Rep View','#indicators','Firm indicators here. Individual performance in the firm workbook.'],
    ['Compare','#compare','Reporting-period comparison'], ['Sign-Up Attribution','#attribution','Signings and verification by channel'],
    ['Consultation Audit [NEW]','#audit','Audit totals here. Consultation records in the firm workbook.'],
    ['Funnel Scorecard','#rolling','Rolling funnel windows'], ['Pre-Consult Prep','#intake','Consultation preparation counts'],
    ['Lead Journey','#intake','Booking-class totals'], ['Missed Consults','#audit','Missed consultation count'],
    ['Off-Calendar Review','#audit','Pending review count'], ['Smith.ai Booking Gaps','#intake','Booking-gap review count'],
    ['Referral Log','#intake','Referral totals here. Individual referrals in the firm workbook.'], ['Ops Log','#audit','Operational exceptions'],
    ['Daily, Weekly, Monthly, Quarterly, Yearly Stats','#periods','Event-date activity by reporting interval'], ['Instructions','','Operating documentation in the firm workbook'],
    ['Funnel Indicators','#indicators','Performance against goals'], ['Funnel Ledger','#signing','Signing and timing totals here. Individual records in the firm workbook.'],
    ['Funnel KPI Feed','#activity','Tracker totals and coverage'], ['Funnel Maps & Goals','#funnel','Goal values here. Source mappings in the firm workbook.'],
    ['Funnel KPI Snapshot','','Historical fallback in the firm workbook'],
    ...['Dashboard (old)','Metrics','Draft Follow-Ups','Backfill 2026-10-23','SCRATCH - Automation Test','Consultation Audit']
      .map(name => [`[DO NOT USE] ${name}`,'','Archived in the firm workbook'])
  ];
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
      for (const cell of cells) {
        const data = el('td');
        data.append(cell);
        row.append(data);
      }
      if (below) row.cells[1].dataset.below = 'true';
    }
    if (!rows.length) {
      const cell = body.insertRow().insertCell();
      cell.colSpan = headings.length;
      cell.textContent = 'No data available for this report.';
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

  let periodReports = {};
  function renderPeriods() {
    const periods = periodReports[$('period-grain').value] || [];
    table('periods-table',['Period start','Days reported','New-lead calls','Smith.ai bookings','On calendar','Held','Sign-up units','Paid units'],
      periods.slice().reverse().map(item => ({label:date(item.start),cells:[item.days,item.new_lead_calls,item.appointments,item.scheduled,
        item.held,item.signups,item.paid_units].map(value => text(value))})));
  }

  function renderWorkbookReports(reports, months) {
    const numericReport = (id, headings, rows) => table(id,headings,(rows || []).map(([label,kind,...values]) =>
      ({label,cells:values.map(value => text(value,formatFor[kind]))})));
    numericReport('funnel-table',['Stage','Current','Prior','Goal','Projection'],reports.pace);
    numericReport('comparison-table',['Metric',...months.map(item => month.format(new Date(item.month + '-01T00:00:00Z')))],reports.comparison);
    numericReport('rolling-table',['Metric','Current','Last 30 days','Last 60 days','Last 90 days'],reports.rolling);
    numericReport('indicators-table',['Indicator','Current','Prior','Goal'],reports.indicators);
    for (const [id,title,rows] of [['channel-table','Channel',reports.channels],['service-table','Service',reports.services]]) {
      table(id,[title,'On calendar','Held','Signed','Close rate'],(rows || []).map(([label,scheduled,held,signed,rate]) =>
        ({label,cells:[text(scheduled),text(held),text(signed),text(rate,percent)]})));
    }
    table('attribution-table',['Channel','Logged signings','Verified source','Verified share'],(reports.attribution || []).map(([label,total,verified]) =>
      ({label,cells:[text(total),text(verified),text(total > 0 && Number.isFinite(verified) ? verified / total : null,percent)]})));
    table('signing-table',['Service','Signed','Earlier consult','Share','Avg. days to sign','Avg. days from send','Send date on file'],
      (reports.signing || []).map(([label,signed,earlier,share,delay,sendDelay,sendDates]) =>
        ({label,cells:[text(signed),text(earlier),text(share,percent),text(delay),text(sendDelay),text(sendDates)]})));
    table('audit-table',['Measure','Count'],(reports.audit || []).map(([label,value]) => ({label,cells:[text(value)]})));
    const intake = reports.intake || {};
    table('intake-table',['Measure','Count'],[
      ['Upcoming consultations in Pre-Consult Prep',intake.prep_upcoming], ['Past consultations in Pre-Consult Prep',intake.prep_past],
      ['Lead Journey entries with a booking classification',intake.journey_classified], ['Lead Journey entries marked booked',intake.journey_booked],
      ['Status entries in Smith.ai Booking Gaps',intake.booking_gaps_reviewed], ['Referral Log entries with a status',intake.referrals_logged]
    ].map(([label,value]) => ({label,cells:[text(value)]})));
    periodReports = reports.periods || {};
    renderPeriods();
  }

  function renderMarketing(metrics) {
    const {sourceState} = CSLData;
    const {renderTrend} = CSLTrends;
    const states = key => sourceState(metrics,key);
    const group = key => states(key).status === 'unavailable' ? {} : metrics[key];
    const period = data => data.start_date && data.end_date ? `${date(data.start_date)} to ${date(data.end_date)}` : 'Unavailable';
    const change = (current,prior) => Number.isFinite(current) && Number.isFinite(prior) && prior > 0
      ? `${current > prior ? '+' : ''}${percent.format((current-prior)/prior)}` : '—';
    const properties = [
      ['gsc','Corcoran Smith Law (CSL)'], ['gsc_cil','California Inheritance Law (CIL)'], ['gsc_ell','Employment Labor Law (ELL)']
    ].map(([key,label]) => [key,label,group(key),states(key)]);
    table('search-totals',['Property','Clicks','Clicks vs prior','Impressions','CTR','Avg. position','Reporting window'],
      properties.map(([,label,data,state]) => ({label,cells:[text(data.clicks),change(data.clicks,data.previous?.clicks),text(data.impressions),
        text(data.ctr,percent),text(data.avg_position),period(data) + (state.status === 'stale' ? ' · Needs refresh' : '')]})));
    renderTrend('gsc-trend','Daily search visibility',properties,[['clicks','Clicks'],['impressions','Impressions']]);
    table('search-queries',['Disclosed query','Clicks','Impressions','CTR','Avg. position'],(group('gsc').top_queries || []).map(row =>
      ({label:row.query,cells:[text(row.clicks),text(row.impressions),text(row.ctr,percent),text(row.position)]})));
    table('search-pages',['Page','Clicks','Impressions','CTR','Avg. position'],(group('gsc').top_pages || []).map(row =>
      ({label:String(row.page || '—').split('?')[0],cells:[text(row.clicks),text(row.impressions),text(row.ctr,percent),text(row.position)]})));

    const a = group('ga4');
    const status = states('ga4');
    const incomplete = a.pageview_tracking_ok === false;
    $('analytics-state').textContent = `${period(a)}${status.status === 'stale' ? ' · Needs refresh' : ''}${incomplete
      ? ` · Incomplete page-view measurement. GA4 recorded ${text(a.page_views)} page views across ${text(a.sessions_total)} sessions.` : ''}`;
    $('analytics-state').classList.toggle('warning',incomplete);
    table('analytics-totals',['Metric','Recorded','Prior period','Change'],[
      ['Sessions',a.sessions_total,a.previous?.sessions], ['Users',a.users_total,a.previous?.totalUsers],
      ['Page views',a.page_views,a.previous?.screenPageViews], ['Engaged sessions',a.engaged_sessions,a.previous?.engagedSessions],
      ['Key events',a.key_events_total,a.previous?.keyEvents], ['Consultation events',a.conversion_events]
    ].map(([label,value,prior]) => ({label,cells:[text(value),text(prior),change(value,prior)]})));
    renderTrend('ga4-trend','Daily recorded website activity',[['ga4','Google Analytics 4',a,status]],
      [['sessions','Recorded sessions'],['key_events','Recorded key events'],['page_views','Recorded page views']],true);
    table('analytics-channels',['Recorded channel','Sessions','Key events'],(a.channels || []).map(row =>
      ({label:row.channel,cells:[text(row.sessions),text(row.key_events)]})));
    table('analytics-events',['Recorded event','Count'],Object.entries(a.events || {}).map(([label,value]) => ({label,cells:[text(value)]})));
    table('analytics-pages',['Recorded landing page','Sessions','Key events'],(a.top_landing_pages || []).map(row =>
      ({label:String(row.page || '—').split('?')[0],cells:[text(row.sessions),text(row.key_events)]})));
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
    const reports = data.reports || {};
    renderWorkbookReports(reports,history);
    table('targets',['Metric','Latest','Prior','Goal'],[
      ['Consultation show rate',indicators.show_rate], ['Agreements sent within one day',indicators.fast_offers],
      ['Weighted sign-ups per held consult',indicators.close_rate]
    ].map(([label,{current,prior,target}]) => ({label,cells:[current,prior,target].map(value => text(value,percent)),
      below:Number.isFinite(current) && Number.isFinite(target) && current < target})));
    const tracker = reports.tracker || Object.entries(activity).map(([name,item]) => [name.replaceAll('_',' '),item.total,item.days,item.latest]);
    table('activity-table',['Metric','Total','Days','Through'],tracker.map(([label,total,days,latest]) =>
      ({label,cells:[text(total,/spend/i.test(label) ? money : number),text(days),latest ? date(latest) : '—']})));
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

  const metrics = json('../metrics.json');
  metrics.then(renderMarketing).catch(() => { $('analytics-state').textContent = 'Marketing figures are unavailable.'; });
  metrics.then(metrics => {
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
      ['Open matters',text(clio.matters_open),'At snapshot'], ['Pending matters',text(clio.matters_pending),'At snapshot'],
      ['Referrals awaiting firm assignment',text(clio.referrals_pending_firm),'At snapshot']
    ].map(([label,...cells]) => ({label,cells})));
  }).catch(() => { $('clio-date').textContent = 'Clio figures are unavailable.'; });

  $('trend-metric').addEventListener('change',renderTrend);
  $('period-grain').addEventListener('change',renderPeriods);
  const menu = document.querySelector('.report-menu');
  menu.addEventListener('click',event => { if (event.target.closest('a')) menu.open = false; });
  menu.addEventListener('keydown',event => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
  table('workbook-index',['Workbook tab','Available view'],WORKBOOK_TABS.map(([label,href,description]) => {
    if (!href) return {label,cells:[description]};
    const link = el('a',description);
    link.href = href;
    return {label,cells:[link]};
  }));
  refreshScorecard();
  window.setInterval(refreshScorecard,86_400_000);
  document.addEventListener('visibilitychange',() => {
    if (document.visibilityState === 'visible') refreshScorecard();
  });
})();
