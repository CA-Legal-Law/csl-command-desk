/* Shared metric hydration and source status for the Command Desk and review. */
(function () {
  "use strict";
  const names = {ads: "Google Ads / LSA", gsc: "Search Console", ga4: "Google Analytics",
    callrail: "CallRail", lawmatics: "Lawmatics", clio: "Clio", smith: "Smith.ai",
    intake: "Intake", qbo: "QuickBooks"};
  const FMT = {
    usd0: n => "$" + Math.round(n).toLocaleString("en-US"),
    usd2: n => "$" + n.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2}),
    int: n => Math.round(n).toLocaleString("en-US"),
    pct0: n => (n * 100).toFixed(0) + "%", pct1: n => (n * 100).toFixed(1) + "%",
    ratio: n => n.toFixed(1) + ":1", mult: n => n.toFixed(1) + "×"
  };
  const dig = (o, path) => path.split(".").reduce((a, k) => a == null ? undefined : a[k], o);
  function date(value) {
    if (!value) return null;
    // Older CI snapshots used UTC timestamps without an explicit offset.
    const text = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value + "T12:00:00Z" :
      /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : value + "Z";
    const parsed = new Date(text);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  function stamp(value) {
    const parsed = date(value);
    return parsed ? new Intl.DateTimeFormat("en-US", {dateStyle: "medium", timeZone: "UTC"}).format(parsed) : "date unavailable";
  }
  function ageDays(value, now = Date.now()) {
    const parsed = date(value);
    return parsed ? Math.max(0, Math.floor((now - parsed.getTime()) / 86400000)) : null;
  }
  function sourceState(m, key, now = Date.now()) {
    const info = dig(m, "_meta.sources." + key) || {};
    const data = m[key] || {};
    const at = date(info.at);
    const captured = data.captured_at || info.captured_at;
    if (data.mode === "snapshot" || info.status === "snapshot") return {
      status: "snapshot", label: "Saved report", detail: `Captured ${stamp(captured)} · ${ageDays(captured, now) ?? "unknown"} days old · ${data.period_ytd || info.period || "period unavailable"}`};
    if (!info.status || info.status === "failed" || !Object.keys(data).length) return {
      status: "unavailable", label: "Unavailable", detail: "No usable source data"};
    const stale = info.status === "stale" || !at || now - at.getTime() > 36 * 3600000;
    const snapshot = data.snapshot_captured_at || info.snapshot_captured_at;
    return {status: stale ? "stale" : "current", label: stale ? "Needs refresh" : "Current",
      detail: `Last successful pull ${stamp(info.at)}` + (stale ? ` · ${ageDays(info.at, now) ?? "unknown"} days old` : "") +
        (snapshot ? ` · Plan and usage snapshot ${stamp(snapshot)} (${ageDays(snapshot, now) ?? "unknown"} days old)` : "")};
  }
  function metricState(m, path) {
    const [group, field] = path.split(".");
    if (group === "_meta") return {status: "current", detail: "Snapshot generation date"};
    if (group === "smith" && ((m.smith || {}).snapshot_fields || ["last_full_month_calls", "last_full_month_over_plan", "plan_calls_included", "trailing_3mo_appointments_scheduled", "trailing_3mo_calls_transferred", "trailing_3mo_intakes_filled", "month_to_date_spam_blocked"]).includes(field)) {
      return {status: "snapshot", detail: "Smith.ai saved report captured " + stamp((m.smith || {}).snapshot_captured_at)};
    }
    const deps = group === "derived" ? ["ads", "clio", "lawmatics", "callrail"] : [group];
    const states = deps.map(k => ({...sourceState(m, k), key: k}));
    return {status: states.some(s => s.status === "unavailable") ? "unavailable" :
      states.some(s => s.status === "stale") ? "stale" : states.some(s => s.status === "snapshot") ? "snapshot" : "current",
      detail: states.map(s => `${names[s.key] || s.key}: ${s.detail}`).join("; ")};
  }
  function hydrate(m, root = document) {
    let filled = 0;
    root.querySelectorAll("[data-m]").forEach(el => {
      const v = dig(m, el.dataset.m), formatter = FMT[el.dataset.fmt];
      const state = metricState(m, el.dataset.m);
      const usable = v != null && (typeof v === "string" || typeof v === "number" && Number.isFinite(v)) &&
        (!formatter || typeof v === "number") && state.status !== "unavailable";
      el.dataset.quality = usable ? state.status : "unavailable";
      el.title = usable ? state.detail : "Metric unavailable in this snapshot";
      if (!usable) { el.textContent = "—"; return; }
      if (el.hasAttribute("data-count") && typeof v === "number") {
        const scaled = v * Number(el.dataset.scale || 1);
        el.textContent = formatter ? formatter(scaled) : (el.dataset.pre || "") +
          scaled.toLocaleString("en-US", {minimumFractionDigits: +(el.dataset.dec || 0), maximumFractionDigits: +(el.dataset.dec || 0)}) + (el.dataset.suf || "");
      } else el.textContent = formatter ? formatter(v) : v;
      el.classList.add("hydrated"); filled++;
    });
    return filled;
  }
  function node(tag, text, className) {
    const el = document.createElement(tag); el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  function renderStatus(m) {
    const panel = document.getElementById("data-status");
    if (!panel) return;
    panel.replaceChildren();
    const states = Object.keys(names).map(key => ({key, ...sourceState(m, key)}));
    const count = state => states.filter(s => s.status === state).length;
    const issues = count("stale") + count("unavailable");
    panel.dataset.state = issues ? "attention" : "ready";
    panel.append(node("p", `${count("current")} current · ${count("snapshot")} saved report${count("snapshot") === 1 ? "" : "s"} · ${issues} stale or unavailable`, "data-summary"));
    const generated = dig(m, "_meta.generated_at");
    const time = date(generated);
    panel.append(node("p", "Dashboard generated " + (time ? new Intl.DateTimeFormat("en-US", {dateStyle: "medium", timeStyle: "short", timeZone: "America/Los_Angeles"}).format(time) + " PT" : "date unavailable") + ". Source dates below apply to the figures. Saved reports are historical.", "data-caption"));
    states.filter(s => s.status === "snapshot").forEach(s => panel.append(node("p", `${names[s.key]}: ${s.detail}`, "data-caption")));
    const details = document.createElement("details"); details.open = issues > 0;
    details.append(node("summary", "Source dates and availability"));
    const list = node("ul", "", "data-source-list");
    states.forEach(s => {
      const li = document.createElement("li"); li.dataset.source = s.key; li.dataset.quality = s.status;
      li.append(node("strong", names[s.key]), node("span", s.label, "data-badge"), node("span", s.detail, "data-source-detail")); list.append(li);
    });
    const pending = document.createElement("li"); pending.dataset.quality = "unavailable";
    pending.append(node("strong", "Business Profile"), node("span", "Not connected", "data-badge"), node("span", "No API feed; local profile figures are historical.", "data-source-detail")); list.append(pending);
    details.append(list); panel.append(details);
    document.querySelectorAll("[data-source-pill]").forEach(el => {
      const key = el.dataset.sourcePill, state = sourceState(m, key);
      el.classList.toggle("live", state.status === "current"); el.classList.toggle("issue", state.status !== "current");
      el.title = state.detail; el.querySelector("b").textContent = (names[key] || key) + " · " + state.label;
    });
    const footer = document.getElementById("freshness");
    if (footer) footer.textContent = panel.querySelector(".data-summary").textContent + " · " + stamp(generated);
  }
  function fail() {
    document.querySelectorAll("[data-m]").forEach(el => { el.textContent = "—"; el.dataset.quality = "unavailable"; });
    const panel = document.getElementById("data-status");
    if (panel) { panel.dataset.state = "attention"; panel.replaceChildren(node("p", "Metrics unavailable. Reload to retry; no current figures can be verified.", "data-summary")); }
    const footer = document.getElementById("freshness"); if (footer) footer.textContent = "Metrics unavailable";
  }
  window.CSLData = {FMT, dig, sourceState, metricState, hydrate, renderStatus, fail};
})();
