/* Shared daily chart for Search Console and Analytics. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const n = value => Number.isFinite(value) ? CSLData.FMT.int(value) : '—';
  const esc = value => String(value).replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[char]));
  const win = group => group.window || (group.start_date && group.end_date
    ? `${group.start_date} to ${group.end_date}` : 'Reporting window unavailable');

  function detailsTable(label, rows) {
    return `<div class="table-scroll"><table><thead><tr><th scope="col">Date</th><th scope="col">${esc(label)}</th></tr></thead>
      <tbody>${rows.map(([day,value]) => `<tr><th scope="row">${esc(day)}</th><td>${esc(n(value))}</td></tr>`).join('')}</tbody></table></div>`;
  }

  const displayDay = day => new Intl.DateTimeFormat('en-US', {month:'short', day:'numeric', timeZone:'UTC'})
    .format(new Date(day + 'T00:00:00Z'));

  function renderTrend(id, title, properties, metrics, incomplete = false) {
    const target = $(id);
    if (!target) return;
    const choices = list => list.map(([value,label]) => `<option value="${esc(value)}">${esc(label)}</option>`).join('');
    target.innerHTML = `<div class="panel growth-trend"><div class="trend-head"><h3>${esc(title)}</h3><div class="trend-controls">
      ${properties.length > 1 ? `<label>Property<select data-trend-property>${choices(properties.map(([key,label]) => [key,label]))}</select></label>` : ''}
      <label>Metric<select data-trend-metric>${choices(metrics)}</select></label></div></div><div data-trend-content aria-live="polite"></div></div>`;
    const propertySelect = target.querySelector('[data-trend-property]');
    const metricSelect = target.querySelector('[data-trend-metric]');
    const content = target.querySelector('[data-trend-content]');

    function update() {
      const [,property,source,state] = properties.find(([key]) => key === propertySelect?.value) || properties[0];
      const [metric,label] = metrics.find(([key]) => key === metricSelect.value);
      const first = Date.parse(`${source.start_date}T00:00:00Z`);
      const last = Date.parse(`${source.end_date}T00:00:00Z`);
      const days = (last - first) / 86_400_000 + 1;
      const values = new Map((source.daily || []).map(row => [row.date, row[metric]]));
      const rows = Number.isInteger(days) && days > 0 && days <= 31 ? Array.from({length:days}, (_,index) => {
        const day = new Date(first + index * 86_400_000).toISOString().slice(0,10);
        return [day, values.get(day)];
      }) : [];
      const measured = rows.filter(([,value]) => Number.isFinite(value));
      const status = state.status === 'stale' ? ' · Needs refresh' : '';
      const measurement = incomplete && source.pageview_tracking_ok === false ? ' · Incomplete GA4 measurement' : '';
      const context = `<p class="muted trend-context">${esc(win(source) + status + measurement)}</p>`;
      if (!measured.length) {
        content.innerHTML = context + '<p class="muted">Daily data is unavailable for this selection.</p>';
        return;
      }
      const max = Math.max(1,...measured.map(([,value]) => value));
      const dailyBars = rows.map(([day,value]) => Number.isFinite(value)
        ? `<i style="height:${Math.max(0,value/max*100)}%" title="${esc(`${displayDay(day)} · ${n(value)} ${label.toLowerCase()}`)}"></i>`
        : `<i class="missing" title="${esc(`${displayDay(day)} · No data`)}"></i>`).join('');
      content.innerHTML = `${context}<div class="trend-visual" role="img" aria-label="${esc(`${property} daily ${label.toLowerCase()} from ${source.start_date} through ${source.end_date}`)}">
        <div class="trend-scale muted"><span>${n(max)}</span><span>0</span></div><div class="trend-bars">${dailyBars}</div>
        <div class="trend-dates muted"><span>${displayDay(source.start_date)}</span><span>${displayDay(source.end_date)}</span></div>
        </div><details class="trend-days"><summary>View daily totals</summary>${detailsTable(label,rows)}</details>`;
    }
    propertySelect?.addEventListener('change',update);
    metricSelect.addEventListener('change',update);
    update();
  }

  window.CSLTrends = {renderTrend};
})();
