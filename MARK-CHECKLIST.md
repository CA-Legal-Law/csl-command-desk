# Mark — action checklist

*Corcoran Smith Law · prepared by BizRnR, 2026-08-17*

**The number we're running the firm on:** every $1,000 of ad spend currently returns **$7,144**. The goal is **$10,000**. It's now the headline of the [Command Desk](https://ca-legal-law.github.io/csl-command-desk/).

**Sequencing: no budget increases until the measurement infrastructure is 100%.** Raising spend doesn't improve that ratio — it just buys more volume at whatever ratio already exists. Every item below either fixes the measurement or improves the ratio itself.

---

### 1. Send the LSA email — 2 min, today
To AttorneySync:

> *"Please transfer the Local Services Ads account into our manager account **439-649-2093**. Also, what was manager account **941-915-4532** used for?"*

**Why:** it's the best channel in the firm — 45 clients at ~$510 each — running in an account we can't see, audit, or pause. We confirmed via the Google Ads API that there is no other route in. We need owner access.

### 2. The $10,000 target — the point of focus
Today **$7,144** per $1,000 (71% of goal). Three levers get us to $10,000:

| Route | From → to | Change |
|---|---|---|
| **A.** Cost per conversion | $47.51 → **$33.94** | −29% |
| **B.** Lead → client rate | 11.0% → **15.4%** | +40% |
| **C.** Value per matter | $3,086 → **$4,319** | +40% |

A blend is realistic where any single one isn't: **$40 cost per conversion + 13% close rate = 10.03:1.** Both halves come from work already scoped — deduplicating the conversion actions and restoring the offline conversion feed pull cost down; faster lead response and same-day consult logging pull the close rate up.

### 3. Promote kp@ to CallRail Administrator — 1 min
CallRail → **Settings → Users** → kp@corcoransmithlaw.com → role **Administrator**.
**Why:** unlocks the API key for calls, lead sources, and speed-to-lead — which is lever B above.

### 4. Make kp@ a Search Console Owner — 1 min
[search.google.com/search-console](https://search.google.com/search-console) → select property **corcoransmithlaw.com** → **Settings** (left sidebar, gear icon) → **Users and permissions** → **Add user** → `kp@corcoransmithlaw.com` → Permission: **Owner** → Add.
**Why:** full search admin, and it's the fastest path to finishing Google Business Profile verification.

### 5. Decide the agency roster — 15 min
Confirm who's engaged going forward, then remove the rest:
- **Google Ads** → Admin → Access & security → remove access
- **CallRail** → Settings → Users → remove or demote

**Why:** three marketing firms currently hold live access with no coordination between them. That's how the August budget change happened without anyone knowing.

---

## Delegate this week — give KP access to complete

### 6. Website dev ticket — ~1 day, highest leverage on the list
Grant kp@corcoransmithlaw.com access to the site codebase and Cloudflare, and we'll do the work:

- **a.** Fire GA4 `form_submit` on form success — it **never fires**, so every organic lead is invisible
- **b.** Pass UTM + `gclid` into Lawmatics and Clio — the fields exist in both systems and are **100% empty**
- **c.** Fix the review badge — site says 21, actual count is 32
- **d.** Add internal links to the six city pages, which currently have none

**Why:** this one ticket closes three of our six remaining blind spots, including *which campaign actually makes money*. Until (b) is done, we can measure the firm's overall return but not any individual channel's.

---

### What "infrastructure 100%" means

Eight of fourteen business questions are live today. Items 1, 3 and 6 close five more; the last is Google's own approval queue. **Once those land, we'll have channel-level and campaign-level return — and that's the point at which scaling spend is a measured decision rather than a bet.**
