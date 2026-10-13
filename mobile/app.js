/* Mobile presentation layer. Project rules and persistence live in the shared store. */
(() => {
  'use strict';
  const Store = window.RenoGuardStore;
  if (!Store) throw new Error('Load the shared project store before the mobile app.');
  const { PROPOSAL_COST, PROJECT_BUDGET, ORIGINAL_COMMITMENT, ROOMS, DEFECT_CATEGORIES } = Store.constants;
  const money = Store.money;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const roomSlug = room => room.toLowerCase().replaceAll(' ', '-');
  const roomFromSlug = slug => ROOMS.find(room => roomSlug(room) === slug);
  const primaryRoutes = ['overview', 'rooms', 'defects', 'changes', 'budget'];
  const scrollPositions = new Map();
  const reportDrafts = new Map();
  const textDrafts = new Map();
  const inspections = new Map();
  const sessionPhotos = new Map();
  const flashes = new Map();
  const filters = { status: 'open', room: '', search: '', changes: 'pending' };
  let state = Store.getState();
  let route = '';
  let mutating = false;
  let content;
  let announcements;

  function status(statusValue) {
    return {
      approval: ['Approval needed', 'amber'], verification: ['Ready to inspect', 'green'],
      scheduled: ['Repair scheduled', 'neutral'], verified: ['Verified', 'green'],
      reported: ['Reported · local demo', 'neutral'], followup: ['Follow-up needed', 'amber'],
      withdrawn: ['Withdrawn', 'neutral']
    }[statusValue] || ['In progress', 'neutral'];
  }
  const badge = (label, tone = 'neutral') => `<span class="status ${tone}">${esc(label)}</span>`;
  const statusBadge = value => badge(...status(value));
  const link = (label, target, type = 'secondary', extra = '') => `<a class="button ${type}" href="#${esc(target)}" ${extra}>${esc(label)}${icon('arrow')}</a>`;
  const action = (label, name, type = 'secondary', extra = '') => `<button type="button" class="button ${type}" data-action="${name}" ${extra}>${esc(label)}</button>`;
  const row = (label, value) => `<div><dt>${esc(label)}</dt><dd>${value}</dd></div>`;
  const heading = (title, eyebrow, intro = '') => `<div class="screen-heading"><p class="eyebrow">${esc(eyebrow)}</p><h1 id="screen-title" tabindex="-1">${esc(title)}</h1>${intro ? `<p class="intro">${esc(intro)}</p>` : ''}</div>`;
  const notice = (text, amber = false) => `<div class="notice${amber ? ' amber' : ''}">${icon('info')}<div>${text}</div></div>`;
  const localNote = () => '<p class="demo-note">Local demo only. Nothing is sent to your contractor, and no payment is taken.</p>';
  const section = (title, body) => `<section class="detail-section"><h2>${esc(title)}</h2>${body}</section>`;
  const documentLink = (label, detail, target) => `<a class="document-row" href="#${target}">${icon('file')}<span>${esc(label)}<small>${esc(detail)}</small></span>${icon('right')}</a>`;
  const findDefect = id => state.defects.find(defect => defect.id === id);
  const totals = () => Store.getMetrics(state);
  const openDefects = () => state.defects.filter(defect => !['verified', 'withdrawn'].includes(defect.status));

  function announce(text) {
    announcements.textContent = '';
    requestAnimationFrame(() => { announcements.textContent = text; });
  }

  function mutate(operation) {
    mutating = true;
    try { state = operation(); updateChrome(); return state; }
    finally { mutating = false; }
  }

  function currentHash() {
    const hash = location.hash.replace(/^#\/?/, '');
    try { return decodeURIComponent(hash) || 'overview'; }
    catch { return 'overview'; }
  }

  function parentTab(path) {
    const first = path.split('/')[0];
    if (primaryRoutes.includes(first)) return first;
    if (['room', 'material'].includes(first)) return first === 'room' ? 'rooms' : 'changes';
    if (['defect', 'report', 'withdraw-report', 'inspect', 'verify-confirm', 'followup'].includes(first)) return 'defects';
    if (['change', 'approve', 'approval-receipt', 'withdraw-approval', 'revision'].includes(first)) return 'changes';
    return 'overview';
  }

  function fallbackBack(path) {
    const first = path.split('/')[0];
    const id = path.split('/')[1];
    if (['inspect', 'verify-confirm', 'followup', 'withdraw-report'].includes(first)) return `defect/${id}`;
    if (['approve', 'approval-receipt', 'withdraw-approval', 'revision', 'material'].includes(first)) return 'change/VO-003';
    if (first === 'document') return 'documents';
    if (first === 'reset') return 'project';
    return parentTab(path);
  }

  function saveScreen() {
    if (!route) return;
    scrollPositions.set(route, window.scrollY || 0);
    const reportForm = document.getElementById('report-form');
    if (reportForm) {
      const draft = reportDrafts.get(route);
      if (draft) Object.assign(draft, { room: reportForm.elements.room.value, category: reportForm.elements.category.value, description: reportForm.elements.description.value });
    }
    const textForm = document.getElementById('text-form');
    if (textForm) textDrafts.set(route, textForm.elements.description.value);
  }

  function navigate(target, replace = false) {
    saveScreen();
    if (target === route) { scrollPositions.set(route, 0); render({ focus: true, restore: true }); return; }
    const depth = history.state?.renoMobile ? history.state.depth : 0;
    history[replace ? 'replaceState' : 'pushState']({ renoMobile: true, depth: replace ? depth : depth + 1 }, '', `#${target}`);
    route = target;
    enterScreen();
    render({ focus: true, restore: true });
  }

  function enterScreen() {
    state = Store.getState();
    if (route === 'updates' && !state.notificationsRead) mutate(() => Store.markNotificationsRead());
  }

  function updateChrome() {
    document.getElementById('notification-dot').hidden = state.notificationsRead;
    document.getElementById('change-nav-dot').hidden = totals().pending === 0;
    document.getElementById('defect-nav-dot').hidden = !state.defects.some(defect => ['verification', 'followup'].includes(defect.status));
    document.getElementById('storage-notice').hidden = Store.storageAvailable;
    document.querySelectorAll('[data-tab]').forEach(tab => {
      if (tab.dataset.tab === parentTab(route)) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });
    const detailed = !primaryRoutes.includes(route);
    document.querySelector('.app-header').classList.toggle('detail-header', detailed);
    document.querySelector('.brand').hidden = detailed;
    document.querySelector('.back-button').hidden = !detailed;
    document.getElementById('header-context').hidden = !detailed;
  }

  function proposalCard() {
    return `<article class="card proposal-card"><div class="proposal-main"><div class="card-top">${badge(state.proposal.revisionRequest ? 'Revision saved · Not approved' : 'Approval needed', 'amber')}<span class="record-id">VO-003</span></div><div class="proposal-title"><div class="tile-swatch" aria-hidden="true"></div><div><p class="eyebrow">Main bedroom</p><h3>Tile replacement proposed</h3><p>Original tile unavailable until 12 Oct. Review John’s alternative.</p></div></div><div class="impact-inline"><div><small>Additional cost</small><strong>+${money(PROPOSAL_COST)}</strong></div><div><small>Handover impact</small><strong class="date-impact">No delay</strong></div></div>${link('Review proposed change', 'change/VO-003', 'primary')}</div><a class="card-link" href="#defect/DEF-002">${icon('defects')}Linked to cracked bedroom tiles${icon('right')}</a></article>`;
  }

  function overview() {
    const metrics = totals();
    const attention = [];
    if (state.proposal.status === 'pending') attention.push(proposalCard());
    state.defects.filter(defect => ['verification', 'followup'].includes(defect.status)).forEach(defect => {
      attention.push(`<article class="card inspection-card"><span class="icon-tile">${icon(defect.status === 'verification' ? 'check' : 'refresh')}</span><div><p class="record-id">${esc(defect.room)} · ${esc(defect.id)}</p><h3>${esc(defect.status === 'verification' ? 'Cabinet alignment completed' : 'A repair needs follow-up')}</h3><p>${esc(defect.status === 'verification' ? 'Inspect the work before marking it verified.' : 'Review the remaining issue and discuss it with John.')}</p><a class="text-link" href="#defect/${defect.id}">${defect.status === 'verification' ? 'Inspect repair' : 'View follow-up'}${icon('arrow')}</a></div></article>`);
    });
    return heading('Welcome back, Thomas.', 'Punggol · 4-room BTO', 'A little closer to the home you imagined.') +
      `<div class="section-heading"><h2>Needs your attention <span class="count">${metrics.actions}</span></h2></div><div class="stack">${attention.join('') || `<div class="empty-state">${icon('check')}<h2>You’re all caught up.</h2><p>No decisions need your attention. Keep an eye on the remaining repairs before handover.</p>${link('View defect records', 'defects')}</div>`}</div>
      <div class="section-heading"><h2>Your project at a glance</h2></div><a class="money-card" href="#budget"><span class="money-label">Remaining allowance${icon('right')}</span><span class="money-value">${money(metrics.available)}</span><small>After approved costs · ${money(PROJECT_BUDGET)} budget</small></a>
      <div class="two-up"><a class="stat-card" href="#defects">${icon('defects')}<span>Open defects</span><strong>${metrics.openDefects}</strong><small>Through to verification</small></a><a class="stat-card" href="#timeline">${icon('clock')}<span>Target handover</span><strong>30 Sep</strong><small>2026 · Finishing stage</small></a></div><a class="card progress-card" href="#timeline"><div><h3>Your home is taking shape.</h3><p>4 of 6 stages complete</p></div><span class="progress-ring"><span>67%</span></span></a>
      <div class="section-heading"><h2>Picture your progress</h2><a class="text-link" href="#rooms">My rooms${icon('arrow')}</a></div><a class="card preview-card" href="#rooms"><img src="../assets/living-room.png" alt="Illustrative living room with warm oak finishes and a neutral sofa"><div class="preview-caption"><div><h3>Living &amp; dining</h3><p>Illustrative design reference</p></div>${icon('right')}</div></a>
      <div class="section-heading"><h2>Recent updates</h2><a class="text-link" href="#updates">View all${icon('arrow')}</a></div><div class="card">${activityList(state.activity.slice(0, 3))}</div>
      <div class="tool-grid"><a class="tool-link" href="#documents">${icon('file')}Your documents<small>Quotations &amp; records</small></a><a class="tool-link" href="#helper">${icon('sparkles')}A little clarity<small>Scope &amp; costs explained</small></a></div><div class="action-stack">${link('Report a defect', 'report')}</div><p class="demo-note">Sample project · 17 Sep 2026. Renovate with proof, not promises.</p>`;
  }

  function defectRow(defect) {
    const next = { approval: 'Review linked proposal', verification: 'Inspect before you verify', followup: 'Discuss remaining work', reported: 'Saved on this device', scheduled: 'Repair planned for 19 Sep', withdrawn: 'Restore if needed', verified: 'Reopen if the issue returns' }[defect.status];
    return `<a class="record-row" href="#defect/${esc(defect.id)}"><div>${statusBadge(defect.status)}<h3>${esc(defect.title)}</h3><p>${esc(defect.room)} · ${esc(defect.category)}</p><div class="record-meta"><span>${esc(defect.id)}</span><span>· ${esc(defect.reported)}</span></div><span class="next-label">${esc(next)}</span></div>${icon('right')}</a>`;
  }

  function filteredDefects() {
    const search = filters.search.trim().toLowerCase();
    return state.defects.filter(defect => {
      const matchesStatus = filters.status === 'open' ? !['verified', 'withdrawn'].includes(defect.status) : defect.status === filters.status;
      return matchesStatus && (!filters.room || defect.room === filters.room) && (!search || `${defect.title} ${defect.id} ${defect.room} ${defect.description}`.toLowerCase().includes(search));
    });
  }

  function defectResults() {
    const records = filteredDefects();
    return `<p class="result-count" role="status">${records.length} ${records.length === 1 ? 'record' : 'records'}${filters.room ? ` in ${esc(filters.room)}` : ''}</p><div class="stack">${records.map(defectRow).join('') || `<div class="empty-state">${icon('search')}<h2>No matching records</h2><p>${filters.search || filters.room ? 'Try another room or search term.' : filters.status === 'withdrawn' ? 'Withdrawn reports will stay here so they can be restored.' : filters.status === 'verified' ? 'Repairs will appear here after your inspection.' : 'No open defects are recorded.'}</p>${filters.search || filters.room ? action('Clear filters', 'clear-filters') : link('Report a defect', 'report')}</div>`}</div>`;
  }

  function defectsScreen() {
    return heading('Defects & repairs', 'Your project records', 'From first report to your final inspection.') + link('Report a defect', 'report', 'primary') +
      `<div class="segmented" aria-label="Defect record status">${['open', 'verified', 'withdrawn'].map(value => `<button type="button" data-action="filter-status" data-status="${value}" aria-pressed="${filters.status === value}">${value[0].toUpperCase() + value.slice(1)}</button>`).join('')}</div>
      <label class="search-field">${icon('search')}<span class="sr-only">Search defect records</span><input id="defect-search" type="search" placeholder="Search room, issue, or record…" value="${esc(filters.search)}"></label><div class="filter-row"><label for="room-filter">Filter by room</label><select id="room-filter"><option value="">All rooms</option>${ROOMS.map(room => `<option value="${esc(room)}" ${filters.room === room ? 'selected' : ''}>${esc(room)}</option>`).join('')}</select></div><div id="defect-results">${defectResults()}</div>`;
  }

  function refreshDefectResults() {
    const results = document.getElementById('defect-results');
    if (!results) return;
    results.innerHTML = defectResults();
    document.querySelectorAll('[data-action="filter-status"]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.status === filters.status)));
  }

  function roomsScreen() {
    return heading('Your rooms', 'Punggol · 4-room BTO', 'Find each room’s finishes and linked repair records.') +
      `<div class="room-map" aria-label="Illustrative room layout">${ROOMS.map((room, index) => {
        const records = openDefects().filter(defect => defect.room === room);
        const hint = records.some(defect => defect.status === 'approval') ? 'Approval needed' : records.some(defect => defect.status === 'verification') ? 'Ready to inspect' : records.some(defect => defect.status === 'followup') ? 'Follow-up needed' : records.some(defect => defect.status === 'scheduled') ? 'Repair scheduled' : records.length ? 'Report saved locally' : '';
        return `<a class="room-map-tile${index === 0 ? ' wide' : ''}" href="#room/${roomSlug(room)}">${icon('rooms')}<strong>${esc(room)}</strong><small>${records.length ? `${records.length} open ${records.length === 1 ? 'issue' : 'issues'}` : 'No open issues'}</small>${hint ? `<small>${hint}</small>` : ''}</a>`;
      }).join('')}</div><p class="help">Select a room to see its records. This is a schematic grouping, not a scale floor plan.</p><div class="action-stack">${link('Report a defect', 'report', 'primary')}</div>`;
  }

  function roomScreen(slug) {
    const room = roomFromSlug(slug);
    if (!room) return missing('Room not found', 'rooms');
    const records = state.defects.filter(defect => defect.room === room);
    return heading(room, 'Room records', room === 'Main bedroom' ? 'The replacement tile proposal is linked to this room’s cracked floor tiles.' : 'Keep this room’s issues and completed repairs together.') +
      (room === 'Living room' ? `<div class="card preview-card"><img src="../assets/living-room.png" alt="Illustrative living room with warm timber finishes"><div class="preview-caption"><p>Illustrative design reference, not a scan of your home.</p></div></div>` : '') +
      section('Defect records', `<div class="stack">${records.map(defectRow).join('') || `<div class="empty-state"><h3>No records yet</h3><p>Report an issue if you find something that needs attention.</p></div>`}</div>`) + `<div class="action-stack">${link('Report an issue in this room', `report/room/${slug}`, 'primary')}${link('All rooms', 'rooms')}</div>`;
  }

  function changesScreen() {
    const pending = state.proposal.status === 'pending';
    const matching = filters.changes === (pending ? 'pending' : 'approved');
    return heading('Project changes', 'Review before work proceeds', 'Know what will change, what it costs, and what you have agreed to.') +
      `<div class="segmented" aria-label="Change request status">${['pending', 'approved'].map(value => `<button type="button" data-action="filter-changes" data-status="${value}" aria-pressed="${filters.changes === value}">${value === 'pending' ? 'Awaiting approval' : 'Approved'}</button>`).join('')}</div>` +
      (matching ? pending ? proposalCard() : `<a class="record-row" href="#change/VO-003"><div>${badge('Approved', 'green')}<h3>Main bedroom tile replacement</h3><p>Ivory Sand porcelain · +${money(PROPOSAL_COST)}</p><div class="record-meta">VO-003 · ${esc(state.proposal.approvedAt)}</div></div>${icon('right')}</a>` : `<div class="empty-state">${icon('changes')}<h2>${pending ? 'No approved changes yet' : 'No decisions waiting'}</h2><p>${pending ? 'Approved changes will appear here with their cost and decision record.' : 'Your tile replacement approval is recorded under Approved.'}</p>${action(pending ? 'View pending proposal' : 'View approved change', 'switch-change-filter')}</div>`);
  }

  function materialCard(label, name, ivory = false) {
    return `<article class="material-card${ivory ? ' proposed' : ''}"><div class="tile-swatch${ivory ? ' ivory' : ''}" aria-hidden="true"></div><div><p class="eyebrow">${label}</p><h3>${name}</h3><p>600 × 600 mm · matte porcelain</p><p>${ivory ? 'Warmer ivory shade' : 'Cooler white shade'}</p>${badge(ivory ? 'Available in sample quote' : 'Out of stock until 12 Oct', ivory ? 'green' : 'amber')}<a class="material-expand" href="#material/${ivory ? 'ivory' : 'cloud'}">View illustrative finish${icon('right')}</a></div></article>`;
  }

  function changeScreen() {
    const approved = state.proposal.status === 'approved';
    const metrics = totals();
    const canWithdraw = approved && findDefect('DEF-002').status === 'scheduled';
    return heading('Review tile replacement', 'VO-003 · Main bedroom', 'Two cracked floor tiles need replacing. Review the available alternative before deciding.') + badge(approved ? 'Approved · recorded in this demo' : 'Awaiting your decision', approved ? 'green' : 'amber') +
      `<a class="linked-row" href="#defect/DEF-002">${icon('defects')}DEF-002 · Cracked floor tiles${icon('right')}</a>` +
      section('What will change', `<div class="comparison">${materialCard('Original', 'Cloud White porcelain')}${materialCard('Proposed replacement', 'Ivory Sand porcelain', true)}</div><p class="help">Same size and finish. Availability comes from the 17 Sep sample quotation and is not a reservation. Swatches are illustrative; check a physical sample to confirm colour.</p>`) +
      section('Cost & timeline', `<div class="card"><dl class="details">${row('Additional materials', money(PROPOSAL_COST))}${row('Additional labour', money(0))}${row('Remaining allowance before this change', money(approved ? metrics.available + PROPOSAL_COST : metrics.available))}${row(approved ? 'Allowance after approval' : 'Allowance if approved', `<span class="emphasis">${money(approved ? metrics.available : metrics.available - PROPOSAL_COST)}</span>`)}${row('Planned repair', '19 Sep 2026')}${row('Target handover', '30 Sep 2026 · unchanged')}</dl></div>`) +
      section('Supporting records', `<div class="stack">${documentLink('Replacement tile quotation', 'VO-003 · John Tan · 17 Sep 2026 · sample', 'document/quotation')}${documentLink('Original flooring scope', 'Contract extract · sample', 'document/scope')}</div>`) +
      (state.proposal.revisionRequest ? section('Your saved revision request', `<div class="card"><p>${esc(state.proposal.revisionRequest.text)}</p><p class="help">Saved locally; not sent to John. Saving a request does not approve spending.</p></div>`) : '') +
      (state.proposal.lastApprovedAt ? notice(`Earlier approval: ${esc(state.proposal.lastApprovedAt)}.<br>Withdrawn: ${esc(state.proposal.withdrawnAt)}. The decision record is retained.`) : '') +
      (approved ? `${notice(`<strong>Approval recorded</strong>${esc(state.proposal.approvedAt)} · Thomas Eng. The ${money(PROPOSAL_COST)} change is included in your budget.`)}<div class="action-stack">${link('View budget', 'budget', 'primary')}${canWithdraw ? link('Withdraw this approval', 'withdraw-approval', 'danger') : ''}</div>${!canWithdraw ? '<p class="help">Approval can only be withdrawn while the linked repair is still scheduled.</p>' : ''}` : `<div class="action-stack">${link('Review approval', 'approve/VO-003', 'primary')}${link('Request changes', 'revision')}</div><p class="help">Reviewing is not approval. You will explicitly confirm ${money(PROPOSAL_COST)} on the next screen.</p>`) + localNote();
  }

  function materialScreen(type) {
    if (!['ivory', 'cloud'].includes(type)) return missing('Material not found', 'change/VO-003');
    const ivory = type === 'ivory';
    return heading(ivory ? 'Ivory Sand porcelain' : 'Cloud White porcelain', 'Illustrative finish', '600 × 600 mm · matte porcelain') + `<div class="material-large"><div class="tile-swatch${ivory ? ' ivory' : ''}" role="img" aria-label="${ivory ? 'Warm ivory' : 'Cool white'} illustrative tile swatch"></div></div>` + notice('This CSS swatch illustrates the proposed colour difference. It is not a product photograph, colour-accurate sample, or live room preview.') + `<div class="action-stack">${link('Back to proposal', 'change/VO-003')}</div>`;
  }

  function approvalScreen() {
    if (state.proposal.status === 'approved') return approvalReceipt();
    return heading('Approve this change?', 'Final confirmation · VO-003', 'You are approving Ivory Sand replacement tiles for the main bedroom.') + `<div class="card"><dl class="details">${row('Additional cost', `<span class="emphasis">${money(PROPOSAL_COST)}</span>`)}${row('New committed costs', money(totals().approved + PROPOSAL_COST))}${row('Remaining allowance', money(totals().available - PROPOSAL_COST))}${row('Repair / handover', '19 Sep / 30 Sep · unchanged')}</dl></div>` + notice('This records your decision in the prototype and updates the budget and linked defect. No payment is made and no real approval is sent.') + `<div class="action-stack">${action(`Confirm approval · ${money(PROPOSAL_COST)}`, 'approve-confirm', 'primary')}${link('Back to review', 'change/VO-003')}</div>` + localNote();
  }

  function approvalReceipt() {
    if (state.proposal.status !== 'approved') return missing('Approval is not recorded', 'change/VO-003');
    return `<div class="success-icon">${icon('check')}</div>` + heading('Change approved', 'Local receipt · VO-003', 'Your tile replacement decision is now connected to the budget and repair record.') + `<div class="card"><dl class="details">${row('Approved by', 'Thomas Eng')}${row('Recorded', esc(state.proposal.approvedAt))}${row('Additional cost', money(PROPOSAL_COST))}${row('Remaining allowance', `<span class="emphasis">${money(totals().available)}</span>`)}${row('Planned repair', '19 Sep 2026')}${row('Target handover', '30 Sep 2026 · unchanged')}</dl></div><div class="action-stack">${link('View approved change', 'change/VO-003', 'primary')}${link('Back to overview', 'overview')}</div>` + localNote();
  }

  function withdrawApprovalScreen() {
    if (state.proposal.status !== 'approved' || findDefect('DEF-002').status !== 'scheduled') return missing('Approval cannot be withdrawn', 'change/VO-003', 'You can withdraw only an approved change whose repair has not progressed beyond scheduled.');
    return heading('Withdraw this approval?', 'Correct a local decision', 'The proposal will return to awaiting approval. The earlier approval remains in the record.') + `<div class="card"><dl class="details">${row('Allowance now', money(totals().available))}${row('Allowance after withdrawal', `<span class="emphasis">${money(totals().available + PROPOSAL_COST)}</span>`)}${row('Cost removed from commitments', money(PROPOSAL_COST))}</dl></div>` + notice('The linked repair will wait for a new decision. No payment or refund occurs; this changes your local demo record.', true) + `<div class="action-stack">${action('Confirm approval withdrawal', 'withdraw-approval-confirm', 'danger')}${link('Keep approval', 'change/VO-003')}</div>`;
  }

  function budgetScreen() {
    const metrics = totals();
    const approved = state.proposal.status === 'approved';
    return heading('Your project budget', 'Cost tracker', 'See what is committed and what is still available.') + `<div class="money-card"><span class="money-label">Remaining allowance${icon('budget')}</span><span class="money-value">${money(metrics.available)}</span><small>Project budget less approved costs</small></div>` +
      section('Where your budget stands', `<div class="card"><dl class="details">${row('Project budget', money(PROJECT_BUDGET))}${row('Original committed costs', money(ORIGINAL_COMMITMENT))}${row('Approved changes', money(approved ? PROPOSAL_COST : 0))}${row('Total committed', money(metrics.approved))}${row('Remaining allowance', `<span class="emphasis">${money(metrics.available)}</span>`)}</dl><div class="budget-bar" aria-hidden="true"><span style="width:${(metrics.approved / PROJECT_BUDGET * 100).toFixed(2)}%"></span></div><div class="legend"><span>Committed costs</span><span>Remaining allowance</span></div></div>`) +
      section(approved ? 'Latest approved change' : 'Awaiting approval', `<a class="record-row" href="#change/VO-003"><div>${badge(approved ? 'Included in committed costs' : 'Not committed yet', approved ? 'green' : 'amber')}<h3>Tile replacement · +${money(PROPOSAL_COST)}</h3><p>Main bedroom · VO-003</p></div>${icon('right')}</a>${!approved ? notice(`The pending proposal is excluded above. Approval would leave ${money(metrics.available - PROPOSAL_COST)}.`) : ''}`) + `<p class="demo-note">This is a cost tracker, not a wallet or payment service. Figures are sample project data.</p>`;
  }

  function defectScreen(id) {
    const defect = findDefect(id);
    if (!defect) return missing('Defect record not found', 'defects');
    const flash = flashes.get(`defect/${id}`);
    let next = '';
    if (defect.status === 'approval') next = notice('<strong>Your next step</strong>Review the replacement tile quotation before this repair can proceed.', true) + link('Review tile replacement', 'change/VO-003', 'primary');
    if (defect.status === 'verification') next = notice('<strong>Inspect before you verify</strong>Check the cabinet alignment and operation at your home. Record a follow-up if the issue remains.') + `<div class="action-stack">${link('Inspect the repair', `inspect/${id}`, 'primary')}${link('Issue still needs work', `followup/${id}`)}</div>`;
    if (defect.status === 'verified') next = notice('<strong>Repair verified</strong>Your record can be reopened if you find a remaining problem.') + `<div class="action-stack">${link('Reopen for follow-up', `followup/${id}`)}</div>`;
    if (defect.status === 'scheduled') next = notice(`<strong>Repair planned for 19 Sep</strong>${id === 'DEF-002' ? 'The replacement tile change is approved.' : 'The paint touch-up is scheduled.'} Verify the result once it is ready for inspection.`);
    if (defect.status === 'followup') next = notice('<strong>Follow-up recorded</strong>The issue remains open. Discuss the remaining work with John using your usual contact channel.', true) + `<div class="action-stack">${link('View project contact', 'contact')}${id === 'DEF-003' ? action('Return to ready for inspection', 'restore-inspection', 'secondary', `data-id="${id}"`) : ''}</div>`;
    if (defect.status === 'reported') next = notice('<strong>Report saved locally</strong>No report has been sent. Contact John separately to report a real issue.') + `<div class="action-stack">${link('Edit report', `report/edit/${id}`)}${link('Withdraw report', `withdraw-report/${id}`, 'danger')}${link('View project contact', 'contact', 'quiet')}</div>`;
    if (defect.status === 'withdrawn') next = notice('<strong>Report withdrawn</strong>The record is retained and excluded from open defects. You can restore it if needed.') + `<div class="action-stack">${action('Restore report', 'restore-report', 'primary', `data-id="${id}"`)}</div>`;
    return heading(defect.title, `${defect.id} · ${defect.room}`) + statusBadge(defect.status) + (flash ? notice(esc(flash)) : '') + section('Issue details', `<p>${esc(defect.description)}</p><dl class="details">${row('Room', esc(defect.room))}${row('Category', esc(defect.category))}${row('Reported', esc(defect.reported))}${row('Responsible person', 'John Tan · Northline Interiors')}</dl>`) +
      (sessionPhotos.has(id) ? `<img class="photo-preview" src="${sessionPhotos.get(id)}" alt="Your attached defect photograph">` : defect.photoName ? notice(`Photo filename: ${esc(defect.photoName)}.<br>The preview is unavailable after reload or in another interface. Photos are not uploaded or shared.`) : '') +
      (defect.followupNote ? section('Your follow-up note', `<div class="card"><p>${esc(defect.followupNote)}</p></div>`) : '') + next +
      (id === 'DEF-002' && state.proposal.status === 'approved' ? `<a class="linked-row" href="#change/VO-003">${icon('changes')}View approved VO-003${icon('right')}</a>` : '') + `<div class="action-stack">${link('All defect records', 'defects', 'quiet')}</div>` + localNote();
  }

  function getReportDraft() {
    if (reportDrafts.has(route)) return reportDrafts.get(route);
    const [, mode, value] = route.split('/');
    const record = mode === 'edit' ? findDefect(value) : null;
    const draft = { room: record?.room || (mode === 'room' ? roomFromSlug(value) || '' : ''), category: record?.category || '', description: record?.description || '', photoName: record?.photoName || '', photo: record ? sessionPhotos.get(record.id) || '' : '', loading: false, token: 0 };
    reportDrafts.set(route, draft);
    return draft;
  }

  function reportScreen() {
    const [, mode, id] = route.split('/');
    const editing = mode === 'edit';
    if (editing && findDefect(id)?.status !== 'reported') return missing('This report cannot be edited', `defect/${id}`, 'Only reports that have not progressed can be edited.');
    const draft = getReportDraft();
    const options = (values, selected) => values.map(value => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(value)}</option>`).join('');
    return heading(editing ? 'Edit defect report' : 'Report a defect', editing ? `Local record · ${id}` : 'Add a project record', 'Describe the issue and its location. Required fields are marked with an asterisk.') +
      `<form id="report-form" novalidate><div class="form-summary" id="form-summary" role="alert" hidden></div><div class="field"><label for="report-room">Room *</label><select id="report-room" name="room" required aria-describedby="room-error"><option value="">Choose a room</option>${options(ROOMS, draft.room)}</select><p class="error" id="room-error"></p></div><div class="field"><label for="report-category">Category *</label><select id="report-category" name="category" required aria-describedby="category-error"><option value="">Choose a category</option>${options(DEFECT_CATEGORIES, draft.category)}</select><p class="error" id="category-error"></p></div><div class="field"><label for="report-description">What needs fixing? *</label><textarea id="report-description" name="description" minlength="10" maxlength="800" required aria-describedby="description-help description-error" placeholder="For example, the lower cabinet door rubs against its frame.">${esc(draft.description)}</textarea><p class="help" id="description-help">Include where it is and what you noticed. 10–800 characters.</p><p class="error" id="description-error"></p></div><div class="field"><label for="report-photo">Add a photo (optional)</label><input type="file" id="report-photo" name="photo" accept="image/jpeg,image/png,image/webp" aria-describedby="photo-help photo-error"><p class="help" id="photo-help">JPG, PNG, or WebP · up to 5 MB. Preview stays in this mobile session; no upload.</p><p class="error" id="photo-error"></p><div id="photo-preview">${photoPreview(draft)}</div></div><div class="action-stack"><button class="button primary" type="submit" ${draft.loading ? 'disabled' : ''}>${draft.loading ? 'Reading photo…' : editing ? 'Save report changes' : 'Save defect report'}</button>${link('Keep draft & go back', editing ? `defect/${id}` : 'defects', 'quiet')}</div></form>` + localNote();
  }

  function photoPreview(draft) {
    return `${draft.photo ? `<img class="photo-preview" src="${draft.photo}" alt="Selected defect photograph">` : draft.photoName ? '<p class="help">Existing photo preview is unavailable in this session.</p>' : ''}${draft.photoName ? `<p class="help">${esc(draft.photoName)}</p>${action('Remove photo', 'remove-photo', 'quiet')}` : ''}`;
  }

  function setError(form, fieldName, message) {
    const field = form.elements[fieldName];
    if (field) field.setAttribute('aria-invalid', String(Boolean(message)));
    const error = document.getElementById(`${fieldName}-error`);
    if (error) error.textContent = message;
  }

  function formFailure(message, field) {
    const summary = document.getElementById('form-summary');
    if (summary) { summary.textContent = message; summary.hidden = false; }
    if (field) field.focus();
    announce(message);
  }

  function saveReport(event) {
    event.preventDefault();
    saveScreen();
    state = Store.getState();
    const form = event.target;
    const draft = getReportDraft();
    const errors = { room: ROOMS.includes(draft.room) ? '' : 'Choose the room where the issue is located.', category: DEFECT_CATEGORIES.includes(draft.category) ? '' : 'Choose a category.', description: draft.description.trim().length >= 10 && draft.description.trim().length <= 800 ? '' : 'Describe the issue in 10–800 characters.' };
    Object.entries(errors).forEach(([name, message]) => setError(form, name, message));
    const first = Object.keys(errors).find(name => errors[name]);
    if (first) return formFailure('Check the highlighted fields before saving.', form.elements[first]);
    if (draft.loading) return formFailure('Wait for the photo preview to finish loading.');
    const [, mode, editId] = route.split('/');
    if (mode === 'edit' && findDefect(editId)?.status !== 'reported') return formFailure('This report has changed status and cannot be edited now.');
    try {
      const payload = { room: draft.room, category: draft.category, description: draft.description.trim(), photoName: draft.photoName };
      mutate(() => mode === 'edit' ? Store.updateDefect(editId, payload) : Store.addDefect(payload));
      const id = mode === 'edit' ? editId : state.defects[0].id;
      if (draft.photo) sessionPhotos.set(id, draft.photo);
      else if (!draft.photoName) sessionPhotos.delete(id);
      flashes.set(`defect/${id}`, mode === 'edit' ? 'Report updated on this device. No message was sent.' : 'Report saved on this device. No message was sent.');
      const savedRoute = route;
      navigate(`defect/${id}`);
      reportDrafts.delete(savedRoute);
      announce(mode === 'edit' ? 'Defect report updated.' : 'Defect report saved locally.');
    } catch (error) { formFailure(error.message); }
  }

  function readPhoto(input) {
    const form = document.getElementById('report-form');
    const file = input.files?.[0];
    if (!file || !form) return;
    const draft = getReportDraft();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError(form, 'photo', 'Choose a JPG, PNG, or WebP image up to 5 MB.');
      input.value = '';
      return;
    }
    setError(form, 'photo', '');
    const token = ++draft.token;
    const photoRoute = route;
    draft.loading = true;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Reading photo…';
    const reader = new FileReader();
    const finish = () => {
      if (draft.token !== token) return false;
      draft.loading = false;
      if (route === photoRoute) {
        const button = document.querySelector('#report-form [type="submit"]');
        if (button) { button.disabled = false; button.textContent = photoRoute.includes('/edit/') ? 'Save report changes' : 'Save defect report'; }
      }
      return true;
    };
    reader.onload = () => {
      if (!finish()) return;
      if (typeof reader.result !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(reader.result)) return;
      draft.photo = reader.result;
      draft.photoName = file.name;
      if (route === photoRoute) document.getElementById('photo-preview').innerHTML = photoPreview(draft);
    };
    reader.onerror = () => { if (finish() && route === photoRoute) setError(document.getElementById('report-form'), 'photo', 'The photo could not be read. Try another image.'); };
    reader.readAsDataURL(file);
  }

  function withdrawReportScreen(id) {
    const defect = findDefect(id);
    if (!defect || defect.status !== 'reported') return missing('This report cannot be withdrawn', `defect/${id}`);
    return heading('Withdraw this report?', `${id} · ${defect.room}`, 'It will no longer count as an open defect. The record remains available and can be restored.') + notice('No message is sent to the contractor. This only changes your local demo record.') + `<div class="action-stack">${action('Confirm report withdrawal', 'withdraw-report-confirm', 'danger', `data-id="${id}"`)}${link('Keep report', `defect/${id}`)}</div>`;
  }

  function inspectionScreen(id) {
    const defect = findDefect(id);
    if (id !== 'DEF-003' || !defect || defect.status !== 'verification') return missing('This repair is not ready to inspect', `defect/${id}`, 'The current inspection checklist covers the kitchen cabinet repair. Check the record and contact John about other repairs.');
    const checks = inspections.get(id) || [false, false, false];
    inspections.set(id, checks);
    const labels = ['The cabinet doors align with even gaps.', 'Each door opens and closes smoothly, without rubbing.', 'The hinges feel secure and the original issue is resolved.'];
    return heading('Inspect the cabinet repair', `${id} · Kitchen`, 'Check the work at your home before verifying. Select each item only after inspecting it yourself.') + `<form id="inspection-form" data-id="${id}" novalidate><div class="form-summary" id="form-summary" role="alert" hidden></div><div class="card"><ul class="checklist">${labels.map((label, index) => `<li><span>${index + 1}</span><label for="inspection-${index}"><input id="inspection-${index}" type="checkbox" name="check${index}" data-check-index="${index}" ${checks[index] ? 'checked' : ''}> ${label}</label></li>`).join('')}</ul></div><div class="action-stack"><button type="submit" class="button primary">Review verification</button>${link('Issue still needs work', `followup/${id}`)}${link('Back to repair', `defect/${id}`, 'quiet')}</div></form>` + localNote();
  }

  function verificationScreen(id) {
    const defect = findDefect(id);
    if (id !== 'DEF-003' || !defect || defect.status !== 'verification') return missing('Repair status has changed', `defect/${id}`, 'Open the repair record to see its current status.');
    if (!inspections.get(id)?.every(Boolean)) return heading('Inspect before you verify', `${id} · Kitchen`, 'Complete the inspection checklist before confirming the repair.') + `<div class="action-stack">${link('Go to inspection checklist', `inspect/${id}`, 'primary')}</div>`;
    return heading('Mark this repair verified?', `${id} · Kitchen`, 'You have checked the alignment, door operation, and hinges. Confirm the repair passed your inspection.') + notice('The issue will move to verified repairs. You can reopen it if you find a remaining problem.') + `<div class="action-stack">${action('Confirm repair verified', 'verify-confirm', 'primary', `data-id="${id}"`)}${link('Back to inspection', `inspect/${id}`)}</div>` + localNote();
  }

  function textFormScreen(type, id) {
    if (type === 'revision' && state.proposal.status !== 'pending') return missing('This change is already approved', 'change/VO-003');
    const defect = type === 'followup' ? findDefect(id) : null;
    if (type === 'followup' && (!defect || !['verification', 'verified'].includes(defect.status))) return missing('This repair cannot be reopened now', `defect/${id}`);
    const value = textDrafts.get(route) ?? (type === 'revision' ? state.proposal.revisionRequest?.text || '' : '');
    return heading(type === 'revision' ? 'Request a proposal change' : 'Record a repair follow-up', type === 'revision' ? 'VO-003 · Main bedroom · DEF-002' : `${id} · ${defect.room}`, type === 'revision' ? 'Describe what you would like John to revise before you approve.' : 'Keep the issue open and note what still needs attention.') +
      notice(type === 'revision' ? `Ask about a closer colour match, a physical sample, or the additional ${money(PROPOSAL_COST)}. Saving this request does not approve spending.` : 'No message is sent. Discuss the remaining issue with John using your usual contact channel.') +
      `<form id="text-form" data-kind="${type}" data-id="${esc(id || '')}" novalidate><div class="form-summary" id="form-summary" role="alert" hidden></div><div class="field"><label for="text-description">${type === 'revision' ? 'What would you like changed? *' : 'What still needs work? (optional)'}</label><textarea id="text-description" name="description" maxlength="800" ${type === 'revision' ? 'required minlength="10"' : ''} aria-describedby="text-help description-error">${esc(value)}</textarea><p class="help" id="text-help">${type === 'revision' ? '10–800 characters.' : 'Maximum 800 characters.'}</p><p class="error" id="description-error"></p></div><div class="action-stack"><button class="button primary" type="submit">${type === 'revision' ? 'Save revision request' : 'Save follow-up'}</button>${link('Keep draft & go back', type === 'revision' ? 'change/VO-003' : `defect/${id}`, 'quiet')}</div></form>` + localNote();
  }

  function saveTextForm(event) {
    event.preventDefault();
    saveScreen();
    state = Store.getState();
    const form = event.target;
    const text = form.elements.description.value.trim();
    const revision = form.dataset.kind === 'revision';
    const invalid = text.length > 800 || (revision && text.length < 10);
    setError(form, 'description', invalid ? revision ? 'Describe the change in 10–800 characters.' : 'Keep the note within 800 characters.' : '');
    if (invalid) return formFailure('Check the highlighted field before saving.', form.elements.description);
    try {
      const source = route;
      if (revision) {
        if (state.proposal.status !== 'pending') return formFailure('This proposal has already been approved.');
        mutate(() => Store.requestRevision(text));
        navigate('change/VO-003');
        announce('Revision request saved locally. Budget unchanged.');
      } else {
        const id = form.dataset.id;
        if (!['verification', 'verified'].includes(findDefect(id)?.status)) return formFailure('This repair has changed status. Open its record before continuing.');
        mutate(() => Store.followupRepair(id, text));
        flashes.set(`defect/${id}`, 'Follow-up saved locally. The issue remains open.');
        navigate(`defect/${id}`);
        announce('Follow-up saved. No message was sent.');
      }
      textDrafts.delete(source);
    } catch (error) { formFailure(error.message); }
  }

  function activityList(items) {
    return `<ul class="activity-list">${items.map(item => `<li class="activity-item"><span class="activity-marker">${icon(({ file: 'file', check: 'check', clock: 'clock', defect: 'defects', refresh: 'refresh' })[item.type] || 'info')}</span><div><strong>${esc(item.title || item.text)}</strong>${item.title ? `<p>${esc(item.text)}</p>` : ''}<small>${esc(item.time)}</small></div></li>`).join('')}</ul>`;
  }

  function documentsScreen() {
    return heading('Project documents', 'Connected records', 'Read the agreed scope alongside subsequent changes.') + `<div class="stack">${documentLink('Original flooring scope', '26 Aug 2026 · sample contract extract', 'document/scope')}${documentLink('Replacement tile quotation', `VO-003 · 17 Sep 2026 · ${state.proposal.status === 'approved' ? 'approved' : 'awaiting approval'}`, 'document/quotation')}</div>` + notice('These are readable sample records, not uploaded PDFs or legal contracts.');
  }

  function documentScreen(type) {
    if (!['quotation', 'scope'].includes(type)) return missing('Document not found', 'documents');
    const quotation = type === 'quotation';
    return heading(quotation ? 'Replacement tile quotation' : 'Original flooring scope', quotation ? 'Sample document · VO-003' : 'Sample contract extract') + `<div class="card"><dl class="details">${row('Project', 'Thomas Eng · Punggol 4-room BTO')}${row('Prepared by', 'John Tan · Northline Interiors')}${row('Issued', quotation ? '17 Sep 2026' : '26 Aug 2026')}${row('Room', 'Main bedroom')}</dl></div>` +
      section(quotation ? 'Proposed change' : 'Agreed scope', `<p>${quotation ? 'Replace two cracked Cloud White floor tiles with Ivory Sand porcelain, 600 × 600 mm, matte finish. The alternative is a warmer shade. The original product is unavailable until 12 Oct.' : 'Supply and install Cloud White porcelain, 600 × 600 mm, matte finish in the main bedroom. Installation and standard defect rectification are included in the agreed scope.'}</p>`) +
      (quotation ? section('Quotation details', `<div class="card"><dl class="details">${row('Additional materials', money(PROPOSAL_COST))}${row('Additional labour', money(0))}${row('Total additional cost', `<span class="emphasis">${money(PROPOSAL_COST)}</span>`)}${row('Planned repair', '19 Sep 2026')}${row('Target handover', '30 Sep 2026 · unchanged')}${row('Status', state.proposal.status === 'approved' ? 'Approved locally by Thomas Eng' : 'Awaiting homeowner approval')}</dl></div>`) : notice('Material substitutions and changes affecting appearance, cost, or timing should be explicitly reviewed and approved before proceeding.')) + `<div class="action-stack">${link('View linked change', 'change/VO-003', 'primary')}${link('All documents', 'documents')}</div><p class="demo-note">Fictional project document for this prototype.</p>`;
  }

  function timelineScreen() {
    const stages = [['Design & scope confirmed', '26 Aug', 'Complete'], ['Site preparation', '30 Aug', 'Complete'], ['Electrical & plumbing', '6 Sep', 'Complete'], ['Flooring & carpentry', '14 Sep', 'Complete'], ['Defect checks & repairs', '15–23 Sep', 'In progress'], ['Final inspection & handover', '30 Sep', 'Upcoming']];
    return heading('Renovation timeline', 'Target handover · 30 Sep 2026', 'Four stages are complete. Repairs and checks are in progress before your final inspection.') + `<ol class="timeline">${stages.map(([title, date, label]) => `<li><span class="icon-tile">${icon(label === 'Complete' ? 'check' : 'clock')}</span><div><strong>${title}</strong>${badge(label, label === 'Complete' ? 'green' : label === 'In progress' ? 'amber' : 'neutral')}<p>${date} 2026</p></div></li>`).join('')}</ol>` + notice(`<strong>Main bedroom repair · 19 Sep</strong>${state.proposal.status === 'approved' ? 'Replacement tiles approved. The planned repair date is unchanged.' : 'Waiting for your replacement tile decision. The proposed alternative is available now.'}`) + `<div class="action-stack">${link('View tile replacement', 'change/VO-003')}</div><p class="demo-note">Dates are for the 17 Sep 2026 sample project. Handover is planned and subject to a satisfactory final inspection.</p>`;
  }

  function helperScreen(topic) {
    const metrics = totals();
    const answers = {
      change: `<p>The original tile is unavailable until <strong>12 Oct</strong>. The proposed Ivory Sand alternative has the same size and finish, with a warmer shade.</p><p>Additional cost: <strong>${money(PROPOSAL_COST)}</strong>. Planned repair: 19 Sep. Handover: 30 Sep, unchanged.</p>${link('Read source · VO-003', 'change/VO-003')}`,
      budget: `<p>Committed costs are <strong>${money(metrics.approved)}</strong>, leaving <strong>${money(metrics.available)}</strong> of the ${money(PROJECT_BUDGET)} budget.</p><p>${state.proposal.status === 'approved' ? 'The approved tile change is included.' : `The pending ${money(PROPOSAL_COST)} change is excluded. Approval would leave ${money(metrics.available - PROPOSAL_COST)}.`}</p>${link('Read source · Budget', 'budget')}`,
      next: `<p>${metrics.actions ? `${metrics.actions} ${metrics.actions === 1 ? 'action needs' : 'actions need'} your attention.` : 'No homeowner decisions are currently waiting.'}</p><p>Review pending changes, inspect repairs marked ready, and discuss issues marked for follow-up.</p>${link('Read source · Defect records', 'defects')}`
    };
    return heading('A little clarity', 'Project helper · scripted demo', 'Quick explanations from the sample records, with links to their source.') + (answers[topic] ? `<div class="card stack" aria-live="polite">${answers[topic]}</div>` : '') + `<div class="action-stack">${link('What is changing?', 'helper/change')}${link('How much budget is left?', 'helper/budget')}${link('What needs my attention?', 'helper/next')}</div><p class="demo-note">Answers are prewritten for this prototype. No live AI or document analysis is connected.</p>`;
  }

  function contactScreen() {
    return heading('Your project contact', 'Fictional demo contact') + `<div class="card contact-card"><span class="avatar">JT</span><div><h2>John Tan</h2><small>Northline Interiors · Project lead</small></div></div>` + section('Before you contact John', `<p>Include the record number, room, and your question. For the tile replacement, refer to VO-003 / DEF-002 · Main bedroom.</p>`) + notice('No real phone, email, or messaging service is connected. Use your actual contractor’s usual contact channel.') + `<div class="action-stack">${link('View related proposal', 'change/VO-003')}${link('View defect records', 'defects')}</div>`;
  }

  function projectScreen() {
    return heading('Your renovation', 'Homeowner demo') + `<div class="card"><dl class="details">${row('Homeowner', 'Thomas Eng')}${row('Home', 'Punggol · 4-room BTO')}${row('Project lead', 'John Tan · Northline Interiors')}${row('Demo reference date', '17 Sep 2026')}${row('Target handover', '30 Sep 2026')}${row('Storage', Store.storageAvailable ? 'This browser on this device' : 'Session only')}</dl></div>` + notice('No real sign-in is needed. Desktop and mobile share local records when opened from the same web address in this browser. There is no account sync across devices.') + section('Start the demo again', `<p>Restore the original sample project. Your local reports and decisions will be removed.</p><div class="action-stack">${link('Reset demo', 'reset', 'danger')}</div>`) + `<div class="action-stack"><a class="button secondary" href="../">Open web dashboard${icon('arrow')}</a>${link('View project contact', 'contact')}</div>`;
  }

  function missing(title, target = 'overview', explanation = 'Open the connected record or return to your project overview.') {
    return heading(title, 'Project record') + `<div class="empty-state">${icon('info')}<p>${esc(explanation)}</p>${link('Back to project records', target)}</div>`;
  }

  function screenHTML() {
    const [name, value] = route.split('/');
    switch (name) {
      case 'overview': return overview();
      case 'rooms': return roomsScreen();
      case 'room': return roomScreen(value);
      case 'defects': return defectsScreen();
      case 'defect': return defectScreen(value);
      case 'changes': return changesScreen();
      case 'change': return value === 'VO-003' ? changeScreen() : missing('Change not found', 'changes');
      case 'material': return materialScreen(value);
      case 'approve': return value === 'VO-003' ? approvalScreen() : missing('Change not found', 'changes');
      case 'approval-receipt': return approvalReceipt();
      case 'withdraw-approval': return withdrawApprovalScreen();
      case 'budget': return budgetScreen();
      case 'report': return reportScreen();
      case 'withdraw-report': return withdrawReportScreen(value);
      case 'inspect': return inspectionScreen(value);
      case 'verify-confirm': return verificationScreen(value);
      case 'followup': return textFormScreen('followup', value);
      case 'revision': return textFormScreen('revision');
      case 'documents': return documentsScreen();
      case 'document': return documentScreen(value);
      case 'timeline': return timelineScreen();
      case 'updates': return heading('Project updates', 'You’re up to date', 'Sample updates and your activity on this device.') + `<div class="card">${activityList(state.activity)}</div>` + localNote();
      case 'helper': return helperScreen(value);
      case 'contact': return contactScreen();
      case 'project': return projectScreen();
      case 'reset': return heading('Reset the demo?', 'Restore sample project', 'Your local reports, decisions, and photo previews will be removed. The original sample project will be restored.') + `<div class="action-stack">${action('Confirm demo reset', 'reset-confirm', 'danger')}${link('Keep my changes', 'project')}</div>`;
      default: return missing('Screen not found');
    }
  }

  function render({ focus = false, restore = false } = {}) {
    updateChrome();
    content.innerHTML = screenHTML();
    const title = document.getElementById('screen-title');
    document.getElementById('header-context').textContent = title?.textContent || 'Your project';
    document.title = `${title?.textContent || 'Project'} · RenoGuard Mobile`;
    if (focus) title?.focus({ preventScroll: true });
    if (restore) window.scrollTo({ top: scrollPositions.get(route) || 0, behavior: 'instant' });
  }

  function handleAction(button) {
    const id = button.dataset.id;
    state = Store.getState();
    try {
      switch (button.dataset.action) {
        case 'back':
          if (history.state?.renoMobile && history.state.depth > 0) { saveScreen(); history.back(); }
          else navigate(fallbackBack(route), true);
          break;
        case 'filter-status': filters.status = button.dataset.status; refreshDefectResults(); break;
        case 'filter-changes':
          filters.changes = button.dataset.status; render();
          document.querySelector(`[data-action="filter-changes"][data-status="${filters.changes}"]`)?.focus({ preventScroll: true });
          break;
        case 'switch-change-filter':
          filters.changes = state.proposal.status === 'approved' ? 'approved' : 'pending'; render();
          document.querySelector(`[data-action="filter-changes"][data-status="${filters.changes}"]`)?.focus({ preventScroll: true });
          break;
        case 'clear-filters':
          filters.room = ''; filters.search = '';
          document.getElementById('room-filter').value = '';
          document.getElementById('defect-search').value = '';
          refreshDefectResults(); document.getElementById('defect-search').focus();
          break;
        case 'approve-confirm':
          if (state.proposal.status !== 'pending') { navigate('change/VO-003'); announce('This approval is already recorded.'); break; }
          mutate(() => Store.approveProposal()); filters.changes = 'approved';
          navigate('approval-receipt'); announce(`Change approved. Remaining allowance ${money(totals().available)}.`);
          break;
        case 'withdraw-approval-confirm':
          if (state.proposal.status !== 'approved' || findDefect('DEF-002')?.status !== 'scheduled') { navigate('change/VO-003'); announce('This approval is no longer eligible for withdrawal.'); break; }
          mutate(() => Store.withdrawApproval());
          if (state.proposal.status !== 'pending') { render(); announce('Approval cannot be withdrawn after the repair progresses.'); break; }
          filters.changes = 'pending'; navigate('change/VO-003'); announce('Approval withdrawn locally. Earlier decision retained.');
          break;
        case 'verify-confirm':
          if (id !== 'DEF-003' || !inspections.get(id)?.every(Boolean) || findDefect(id)?.status !== 'verification') { navigate(`defect/${id}`); break; }
          mutate(() => Store.verifyRepair(id)); inspections.delete(id);
          flashes.set(`defect/${id}`, 'Repair verified after your inspection. You can reopen it if needed.');
          navigate(`defect/${id}`); announce('Repair verified. Open defect count updated.');
          break;
        case 'restore-inspection':
          if (id !== 'DEF-003' || findDefect(id)?.status !== 'followup') { render(); announce('This repair cannot be returned to the kitchen inspection checklist.'); break; }
          mutate(() => Store.restoreVerification(id)); inspections.delete(id); render(); announce('Repair returned to ready for inspection.');
          break;
        case 'withdraw-report-confirm':
          if (findDefect(id)?.status !== 'reported') { navigate(`defect/${id}`); announce('This report is no longer eligible for withdrawal.'); break; }
          mutate(() => Store.withdrawDefect(id));
          flashes.set(`defect/${id}`, 'Report withdrawn. Its record remains available and can be restored.');
          navigate(`defect/${id}`); announce('Report withdrawn locally.');
          break;
        case 'restore-report':
          if (findDefect(id)?.status !== 'withdrawn') { render(); announce('This report is already active or cannot be restored.'); break; }
          mutate(() => Store.restoreDefect(id)); flashes.set(`defect/${id}`, 'Report restored to open defects.'); render(); announce('Report restored.');
          break;
        case 'remove-photo': {
          const draft = getReportDraft(); draft.token++; draft.loading = false; draft.photo = ''; draft.photoName = '';
          document.getElementById('photo-preview').innerHTML = '';
          const input = document.getElementById('report-photo'); input.value = ''; input.focus();
          const submit = document.querySelector('#report-form [type="submit"]'); submit.disabled = false; submit.textContent = route.includes('/edit/') ? 'Save report changes' : 'Save defect report';
          break;
        }
        case 'reset-confirm':
          mutate(() => Store.reset()); reportDrafts.clear(); textDrafts.clear(); inspections.clear(); sessionPhotos.clear(); flashes.clear();
          filters.status = 'open'; filters.room = ''; filters.search = ''; filters.changes = 'pending';
          scrollPositions.clear(); navigate('overview', true); announce('Demo reset. Original project records restored.');
          break;
      }
    } catch (error) { announce(error.message); content.insertAdjacentHTML('afterbegin', notice(esc(error.message), true)); }
  }

  function init() {
    content = document.getElementById('content');
    announcements = document.getElementById('announcements');
    if (!content || !announcements) return;
    history.scrollRestoration = 'manual';
    route = currentHash();
    history.replaceState({ renoMobile: true, depth: 0 }, '', `#${route}`);
    enterScreen(); render({ restore: true });
    document.addEventListener('click', event => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest('[data-action]');
      if (button) { event.preventDefault(); handleAction(button); return; }
      const anchor = event.target.closest('a[href^="#"]');
      if (!anchor || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const target = anchor.getAttribute('href').slice(1);
      if (target === 'content') { content.focus(); return; }
      navigate(target);
    });
    document.addEventListener('input', event => {
      if (event.target.id === 'defect-search') { filters.search = event.target.value; refreshDefectResults(); }
      if (event.target.closest?.('#report-form, #text-form')) saveScreen();
    });
    document.addEventListener('change', event => {
      if (event.target.id === 'room-filter') { filters.room = event.target.value; refreshDefectResults(); }
      if (event.target.id === 'report-photo') readPhoto(event.target);
      if (event.target.closest?.('#report-form')) saveScreen();
      if (event.target.dataset.checkIndex !== undefined) {
        const id = route.split('/')[1];
        const checks = inspections.get(id) || [false, false, false];
        checks[Number(event.target.dataset.checkIndex)] = event.target.checked;
        inspections.set(id, checks);
      }
    });
    document.addEventListener('submit', event => {
      if (event.target.id === 'report-form') saveReport(event);
      if (event.target.id === 'text-form') saveTextForm(event);
      if (event.target.id === 'inspection-form') {
        event.preventDefault();
        const id = event.target.dataset.id;
        const firstUnchecked = [0, 1, 2].find(index => !event.target.elements[`check${index}`].checked);
        if (firstUnchecked !== undefined) formFailure('Complete each inspection check before continuing.', event.target.elements[`check${firstUnchecked}`]);
        else { inspections.set(id, [true, true, true]); navigate(`verify-confirm/${id}`); }
      }
    });
    const historyChanged = () => {
      const target = currentHash();
      if (target === route) return;
      saveScreen(); route = target; enterScreen(); render({ focus: true, restore: true });
    };
    window.addEventListener('popstate', historyChanged);
    window.addEventListener('hashchange', historyChanged);
    Store.subscribe((next, metadata) => {
      sessionPhotos.forEach((photo, id) => {
        const previous = state.defects.find(defect => defect.id === id);
        const updated = next.defects.find(defect => defect.id === id);
        if (!updated || updated.photoName !== previous?.photoName || updated.updatedAt !== previous?.updatedAt) sessionPhotos.delete(id);
      });
      state = next;
      updateChrome();
      if (mutating) return;
      saveScreen();
      if (!['report', 'revision', 'followup', 'inspect'].includes(route.split('/')[0])) render();
      if (metadata.source === 'storage') announce('Project records updated from the other interface.');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
