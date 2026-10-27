/* Mobile presentation layer. Project rules and persistence live in the shared store. */
(() => {
  'use strict';
  const Store = window.RenoGuardStore;
  if (!Store) throw new Error('Load the shared project store before the mobile app.');
  const { PROPOSAL_COST, PROJECT_BUDGET, ORIGINAL_COMMITMENT, ROOMS, DEFECT_CATEGORIES, UI_VARIANT, VARIANT_CONTEXT, STUDY_CONTEXT, STUDY_MODE } = Store.constants;
  const QUOTATION_STUDY = STUDY_MODE === 'quotation';
  const money = Store.money;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const roomSlug = room => room.toLowerCase().replaceAll(' ', '-');
  const roomFromSlug = slug => ROOMS.find(room => roomSlug(room) === slug);
  const primaryRoutes = ['overview', 'defects', 'changes', 'budget', 'more'];
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
  let mirrorPlan = false;
  let showFloorGuide = true;
  let approvalAcknowledged = false;
  let previewTile = null;
  let reviewImpactSeen = false;
  let reviewReturnRoute = null;
  let reviewSpecsExpanded = false;
  let reviewAtConfirmation = false;
  const materials = { grigio: { name: 'Grigio Matte', label: 'Option A', tone: 'Cool grey', note: 'Closest match to your wall tiles' }, sabbia: { name: 'Sabbia Matte', label: 'Option B', tone: 'Warm sand', note: 'A warmer tone with subtle stone texture' } };
  const demoDefectPhotos = {
    'DEF-021': [
      { src: 'assets/defects/cracked-tile-detail.webp', title: 'Cracked tile close-up', alt: 'A hairline crack running diagonally across a pale bathroom floor tile', closeup: true, sample: true },
      { src: 'assets/defects/cracked-bathroom-floor.webp', title: 'Tiles beside the shower', alt: 'Cracks across bathroom floor tiles beside the glass shower screen', sample: true }
    ],
    'DEF-003': [{ src: 'assets/defects/kitchen-cabinet-repair.webp', title: 'Cabinet doors after adjustment', alt: 'Kitchen cabinet doors with even gaps and a secure hinge after adjustment', sample: true }],
    'DEF-004': [{ src: 'assets/defects/bedroom-paint-issue.webp', title: 'Paint beside the door frame', alt: 'Uneven patches of white paint beside a timber bedroom door frame', sample: true }],
    'DEF-001': [{ src: 'assets/defects/secured-outlet.webp', title: 'Outlet after repair', alt: 'A white three-pin wall socket secured flush against the wall', sample: true }]
  };
  const tileName = () => materials[state.proposal.tile].name;
  const handover = () => state.proposal.status === 'approved' ? '14 Jul' : '1 Jul';

  function status(statusValue) {
    return {
      approval: ['Approval needed', 'amber'], verification: ['Ready to inspect', 'green'],
      scheduled: ['Repair scheduled', 'neutral'], verified: ['Verified', 'green'],
      reported: ['Reported', 'neutral'], followup: ['Follow-up needed', 'amber'],
      withdrawn: ['Withdrawn', 'neutral']
    }[statusValue] || ['In progress', 'neutral'];
  }
  const badge = (label, tone = 'neutral') => `<span class="status ${tone}">${esc(label)}</span>`;
  const statusBadge = value => badge(...status(value));
  const link = (label, target, type = 'secondary', extra = '') => `<a class="button ${type}" href="#${esc(target)}" ${extra}>${esc(label)}${icon('arrow')}</a>`;
  const action = (label, name, type = 'secondary', extra = '') => `<button type="button" class="button ${type}" data-action="${name}" ${extra}>${esc(label)}</button>`;
  const row = (label, value) => `<div><dt>${esc(label)}</dt><dd>${value}</dd></div>`;
  const heading = (title, eyebrow = '', intro = '', className = '') => `<div class="screen-heading ${esc(className)}">${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}<h1 id="screen-title" tabindex="-1">${esc(title)}</h1>${intro ? `<p class="intro">${esc(intro)}</p>` : ''}</div>`;
  const notice = (text, amber = false) => `<div class="notice${amber ? ' amber' : ''}">${icon('info')}<div>${text}</div></div>`;
  const section = (title, body) => `<section class="detail-section"><h2>${esc(title)}</h2>${body}</section>`;
  const documentLink = (label, detail, target) => `<a class="document-row" href="#${target}">${icon('file')}<span>${esc(label)}<small>${esc(detail)}</small></span>${icon('right')}</a>`;
  const projectDefects = () => Store.getProjectDefects(state);
  const findDefect = id => projectDefects().find(defect => defect.id === id);
  const totals = () => Store.getMetrics(state);
  const openDefects = () => projectDefects().filter(defect => !['verified', 'withdrawn'].includes(defect.status));
  const isWalkthrough = () => state.demoMode === 'walkthrough';
  const showWalkthroughHints = () => isWalkthrough() && state.walkthrough.guidance;
  const proposalReady = () => Store.hasProposal(state);
  const firstScenarioReport = () => isWalkthrough() && !state.walkthrough.reported;
  const demoName = () => isWalkthrough() ? 'Scenario walkthrough' : 'Explore project';
  const demoResetLabel = () => QUOTATION_STUDY ? 'Reset approval demo' : 'Reset demo';
  function fullScenarioURL(target = 'walkthrough') {
    const url = new URL(location.href);
    url.searchParams.delete('study');
    url.hash = target;
    return `${url.pathname}${url.search}${url.hash}`;
  }
  function demoSessionActions() {
    return `<div class="demo-session-actions" aria-label="Demo controls"><a class="text-link" href="#walkthrough">${icon('clock')}Walkthrough steps</a><a class="text-link danger-link" href="#reset">${icon('refresh')}${demoResetLabel()}</a></div>`;
  }


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
    try { return decodeURIComponent(hash) || (QUOTATION_STUDY ? 'change/VO-015' : 'overview'); }
    catch { return 'overview'; }
  }

  function headerTitle() {
    const [screen, detail] = route.split('/');
    const titles = {
      profile: 'Your profile', 'prototype-setup': 'Prototype setup', walkthrough: 'Walkthrough', rooms: 'Rooms & previews', room: 'Room details',
      preview: detail === 'bathroom' ? 'AR room preview' : '3D room view', material: 'Tile details',
      defect: 'Defect details', report: detail === 'edit' ? 'Edit report' : 'Report defect',
      'report-saved': 'Report saved', request: 'Request quotation', 'request-receipt': 'Request saved',
      'withdraw-report': 'Withdraw report', inspect: 'Inspect repair', 'verify-confirm': 'Verify repair',
      followup: 'Repair follow-up', change: 'Change details', approve: 'Review approval',
      'approval-receipt': 'Change approved', 'withdraw-approval': 'Withdraw approval', revision: 'Request changes',
      documents: 'Quotes & variations', document: detail === 'scope' ? 'Original quotation' : 'Tile quotation',
      timeline: 'Payments', updates: 'Updates', helper: 'Project helper', contact: 'Project contact',
      project: 'Project details', reset: 'Reset demo', 'restart-scenario': 'Restart walkthrough'
    };
    return titles[screen] || 'RenoGuard';
  }

  function parentTab(path) {
    const first = path.split('/')[0];
    if (['profile', 'prototype-setup'].includes(first)) return null;
    if (primaryRoutes.includes(first)) return first;
    if (['documents', 'document', 'timeline'].includes(first)) return 'budget';
    if (['rooms', 'room', 'preview', 'project', 'contact', 'helper', 'reset', 'restart-scenario', 'walkthrough'].includes(first)) return 'more';
    if (first === 'material') return 'changes';
    if (['defect', 'report', 'report-saved', 'request', 'request-receipt', 'withdraw-report', 'inspect', 'verify-confirm', 'followup'].includes(first)) return 'defects';
    if (['change', 'approve', 'approval-receipt', 'withdraw-approval', 'revision'].includes(first)) return 'changes';
    return 'overview';
  }

  function fallbackBack(path) {
    const first = path.split('/')[0];
    const id = path.split('/')[1];
    if (first === 'profile') return 'overview';
    if (first === 'prototype-setup') return 'profile';
    if (['inspect', 'verify-confirm', 'followup', 'withdraw-report'].includes(first)) return `defect/${id}`;
    if (['approve', 'approval-receipt', 'withdraw-approval', 'revision', 'material'].includes(first)) return 'change/VO-015';
    if (['request','request-receipt'].includes(first)) return `defect/${id}`;
    if (first === 'preview') return 'rooms';
    if (first === 'document') return 'documents';
    if (first === 'documents') return 'budget';
    if (['reset', 'restart-scenario'].includes(first)) return 'more';
    if (first === 'timeline') return 'budget';
    if (first === 'room') return 'rooms';
    if (first === 'report' && id === 'edit') return `defect/${path.split('/')[2]}`;
    if (first === 'report-saved') return `defect/${id}`;
    return parentTab(path);
  }

  function saveScreen() {
    if (!route) return;
    const viewport = screenScroller();
    scrollPositions.set(route, viewport === window ? window.scrollY : viewport.scrollTop);
    const reportForm = document.getElementById('report-form');
    if (reportForm) {
      const draft = reportDrafts.get(route);
      if (draft) Object.assign(draft, { room: reportForm.elements.room.value, category: reportForm.elements.category.value, description: reportForm.elements.description.value });
    }
    const textForm = document.getElementById('text-form');
    if (textForm) textDrafts.set(route, textForm.elements.description.value);
  }

  function screenScroller() {
    return window.matchMedia('(min-width: 600px)').matches ? document.querySelector('.app-viewport') : window;
  }

  function sizePhonePreview() {
    // Keep the design coordinates intact and scale the whole phone on shorter laptops.
    const scale = Math.min(1, (window.innerHeight - 48) / 844, (window.innerWidth - 48) / 390);
    document.documentElement.style.setProperty('--phone-scale', String(Math.max(.1, scale)));
  }

  function navigate(target, replace = false) {
    saveScreen();
    if (isReviewRoute(route) && ['preview/bathroom', 'document/quotation', 'budget'].includes(target)) reviewReturnRoute = route;
    else if (primaryRoutes.includes(target) && target !== 'budget') reviewReturnRoute = null;
    if (target === route) { scrollPositions.set(route, 0); render({ focus: true, restore: true }); return; }
    const depth = history.state?.renoMobile ? history.state.depth : 0;
    history[replace ? 'replaceState' : 'pushState']({ renoMobile: true, depth: replace ? depth : depth + 1 }, '', `#${target}`);
    route = target;
    enterScreen();
    render({ focus: true, restore: true });
  }

  function enterScreen() {
    state = Store.getState();
    const approved = state.proposal.status === 'approved';
    if (isReviewRoute(route)) {
      let canonical = route;
      if (!guidedReview() || approved) canonical = route === 'approve/VO-015' && approved ? route : 'change/VO-015';
      else if (!selectedTile()) canonical = 'change/VO-015';
      else if (route === 'approve/VO-015' && !reviewImpactSeen) canonical = 'change/VO-015/impact';
      if (canonical !== route) {
        route = canonical;
        history.replaceState({ ...history.state, renoMobile: true }, '', `#${route}`);
      }
      if (route === 'change/VO-015/impact') reviewImpactSeen = true;
    }
    const step = route === 'change/VO-015' ? 'reviewed' : route === 'document/quotation' ? 'quoteRead' : route === 'budget' ? approved ? 'updatedBudgetViewed' : 'budgetChecked' : route === 'timeline' && approved ? 'paymentViewed' : '';
    if (step && isWalkthrough() && state.walkthrough.reported && !state.walkthrough[step]) mutate(() => Store.markWalkthroughStep(step));
    if (['preview/bathroom', 'material/ivory', 'material/grey'].includes(route)) {
      previewTile = state.proposal.tile;
      if (isWalkthrough() && state.walkthrough.reported) mutate(() => Store.recordTilePreview(previewTile));
    }
    if (!route.startsWith('approve/')) approvalAcknowledged=false;
    if (route === 'updates' && !state.notificationsRead) mutate(() => Store.markNotificationsRead());
  }

  function updateChrome() {
    document.getElementById('notification-dot').hidden = state.notificationsRead;
    document.getElementById('change-nav-dot').hidden = totals().pending === 0;
    document.getElementById('defect-nav-dot').hidden = !projectDefects().some(defect => ['verification', 'followup'].includes(defect.status));
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
    return `<article class="card proposal-card"><div class="proposal-main"><div class="card-top">${badge(state.proposal.revisionRequest ? 'Changes requested · Not approved' : 'Your approval needed', 'amber')}<span class="record-id">VO-015</span></div><div class="proposal-title"><img class="proposal-thumbnail" src="assets/materials/${state.proposal.tile}.webp" alt="${tileName()} tile sample"><div><p class="eyebrow">Bathroom · Flooring</p><h3>New bathroom floor tiles</h3><p>Original tile out of stock. John has proposed two close matches.</p></div></div><div class="impact-inline"><div><small>Additional cost</small><strong>+${money(PROPOSAL_COST)}</strong></div><div><small>Proposed completion</small><strong class="date-impact">14 Jul <span>was 1 Jul</span></strong></div></div>${link('Review the two options', 'change/VO-015', 'primary')}</div><a class="card-link" href="#defect/DEF-021">${icon('defects')}Cracked bathroom tiles · DEF-021${icon('right')}</a></article>`;
  }

  function renovationProgress() {
    const stages = ['Prep', 'Electrical', 'Tiling', 'Carpentry', 'Handover'];
    return `<div class="progress-top"><span class="progress-ring" role="progressbar" aria-label="Renovation progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="60"><svg viewBox="0 0 76 76" aria-hidden="true" focusable="false"><circle class="progress-ring-track" cx="38" cy="38" r="32"/><circle class="progress-ring-fill" cx="38" cy="38" r="32" pathLength="100" stroke-dasharray="60 100" transform="rotate(-90 38 38)"/></svg><span class="progress-ring-copy"><strong>60%</strong><small>complete</small></span></span><div><p class="eyebrow">Your renovation</p><h2>Tiling &amp; carpentry</h2><p>Stage 3 of 5 · Handover ${handover()}</p></div></div><ol class="stage-progress" aria-label="Renovation stages">${stages.map((stage, index) => `<li class="${index < 2 ? 'completed' : index === 2 ? 'current' : ''}" ${index === 2 ? 'aria-current="step"' : ''}><span>${stage}<span class="sr-only"> · ${index < 2 ? 'Completed' : index === 2 ? 'Current stage' : 'Upcoming'}</span></span></li>`).join('')}</ol>`;
  }

  function overview() {
    const metrics = totals();
    const attention = [];
    if (proposalReady() && state.proposal.status === 'pending') attention.push(menuRow('Choose your bathroom tiles', '+S$250 · Completion 1 → 14 Jul', 'change/VO-015', 'changes', 'Approval needed'));
    projectDefects().filter(defect => ['verification', 'followup'].includes(defect.status)).forEach(defect => attention.push(menuRow(defect.title, `${defect.room} · ${defect.status === 'verification' ? 'Check the completed repair' : 'Review remaining work'}`, `defect/${defect.id}`, defect.status === 'verification' ? 'check' : 'defects', status(defect.status)[0])));
    return heading('Hi Thomas', 'Thursday, 18 June', 'Punggol · 4-room BTO', 'home-heading') + `<section class="card home-progress" aria-label="Renovation summary">${renovationProgress()}<div class="project-pair"><a href="#budget"><small>Remaining budget</small><strong>${money(metrics.available)}${icon('right')}</strong></a><a href="#defects"><small>Open defects</small><strong>${metrics.openDefects}${icon('right')}</strong></a></div></section>${walkthroughPrompt()}
      <section class="attention-section" aria-labelledby="attention-title"><div class="section-heading"><h2 id="attention-title">Needs attention${attention.length ? `<span class="count">${attention.length}</span>` : ''}</h2></div>${attention.length ? `<div class="menu-group attention-list">${attention.join('')}</div>` : `<div class="card caught-up">${icon('check')}<p>No decisions or repair checks waiting.</p></div>`}</section>
      <div class="quick-actions"><a href="#report">${icon('camera')}<span>Report a defect</span></a><a href="#timeline">${icon('clock')}<span>Payment timeline</span></a></div>
      <div class="section-heading"><h2>Rooms &amp; previews</h2><a class="text-link" href="#rooms">Explore${icon('arrow')}</a></div><div class="model-card home-model"><div class="model-caption"><span class="eyebrow">Room overview</span>${badge('3D cutaway', 'green')}</div>${window.RenoGuardRooms.scene({ defects: projectDefects(), tile: state.proposal.tile })}<p class="model-hint">Tap a room to explore · <span class="attention-key">!</span> needs attention</p></div>
      ${state.activity.length ? `<div class="section-heading"><h2>Recent updates</h2><a class="text-link" href="#updates">See all${icon('arrow')}</a></div><div class="card">${activityList(state.activity.slice(0, 2))}</div>` : ''}`;
  }

  function menuRow(title, detail, target, symbol, label = '') {
    return `<a class="menu-row" href="#${esc(target)}"><span class="menu-icon">${icon(symbol)}</span><span class="menu-copy">${label ? `<small class="menu-label">${esc(label)}</small>` : ''}<strong>${esc(title)}</strong><small>${esc(detail)}</small></span>${icon('right')}</a>`;
  }

  function moreScreen() {
    return heading('Project tools') +
      section('Documents & payments', `<div class="menu-group">${menuRow('Quotes & variations', 'Original scope and proposed changes', 'documents', 'file')}${menuRow('Payment timeline', `Target handover · ${handover()} 2026`, 'timeline', 'clock')}</div>`) +
      section('Your home', `<div class="menu-group">${menuRow('Rooms & AR preview', 'Explore your home and compare finishes', 'rooms', 'rooms')}${menuRow('Project details', 'Punggol · 4-room BTO', 'project', 'home')}${menuRow('Project contact', 'John Tan · Northline Interiors', 'contact', 'info')}</div>`) +
      section('Help', `<div class="menu-group">${menuRow('Project helper', 'Understand changes, costs and next steps', 'helper', 'sparkles')}</div>`) +
      (STUDY_CONTEXT ? '' : section('Demo modes', `<p class="help">Each mode keeps its own saved progress.</p><div class="demo-modes">${[['walkthrough', 'Scenario walkthrough', 'One bathroom defect, from report to updated project records.'], ['explore', 'Explore project', 'Multiple room issues, repairs and project records.']].map(([mode, title, description]) => `<button class="demo-mode" data-action="switch-demo" data-mode="${mode}" aria-pressed="${state.demoMode === mode}"><span><strong>${title}</strong><small>${description}</small></span>${state.demoMode === mode ? badge('Active', 'green') : icon('right')}</button>`).join('')}</div>`)) +
      section('Demo controls', `<div class="menu-group">${menuRow('Walkthrough steps', 'Report, review, preview and approve the tile change', 'walkthrough', 'clock')}${menuRow('Prototype setup', 'Versions and walkthrough settings', 'prototype-setup', 'changes')}</div>${QUOTATION_STUDY ? `<p class="help">The approval demo starts after the defect report.</p><div class="action-stack"><a class="button secondary" href="${esc(fullScenarioURL('restart-scenario'))}">Start full walkthrough${icon('arrow')}</a></div>` : ''}`) +
      `<div class="demo-reset">${link(demoResetLabel(), 'reset', 'danger')}<p class="help">${QUOTATION_STUDY ? 'Returns this quotation to pending, with no tile chosen.' : STUDY_CONTEXT ? 'Restarts this test session from the defect report.' : 'Resets only the active demo.'}</p></div><p class="demo-note">Interactive prototype. Reports and decisions stay in this browser; messages and payments are simulated.</p>`;
  }

  function walkthroughSteps() {
    const progress = state.walkthrough || {};
    return [
      { title: 'Report the cracked tiles', detail: 'Bathroom floor · DEF-021', target: 'report/room/bathroom', done: Boolean(progress.reported) },
      { title: 'Review the proposed change', detail: 'Two replacement tiles · +S$250 · 14 Jul', target: 'change/VO-015', done: Boolean(progress.reviewed) },
      { title: 'Compare both tile previews', detail: `${progress.previewedTiles?.length || 0} of 2 finishes viewed in the bathroom.`, target: 'preview/bathroom', done: Boolean(progress.previewed) },
      { title: 'Read the quotation', detail: 'Open VO-015 and check the S$250 cost breakdown.', target: 'documents', done: Boolean(progress.quoteRead) },
      { title: 'Check the budget', detail: 'S$30,000 becomes S$29,750 after approval.', target: 'budget', done: Boolean(progress.budgetChecked) },
      { title: 'Approve your chosen tile', detail: 'Confirm the cost and revised completion date.', target: 'approve/VO-015', done: state.proposal.status === 'approved' },
      { title: 'Review the updated budget', detail: 'Confirm S$29,750 remains after the S$250 approval.', target: 'budget', done: Boolean(progress.updatedBudgetViewed) },
      { title: 'Review the new payment milestone', detail: 'New bathroom tiles · S$250 due 14 Jul 2026 · unpaid.', target: 'timeline', done: Boolean(progress.paymentViewed) }
    ].map((step, index) => ({ ...step, beforeApproval: index > 0 && index < 5 }));
  }

  function walkthroughPrompt() {
    if (!showWalkthroughHints()) return '';
    const steps = walkthroughSteps();
    const index = steps.findIndex(step => !step.done && !(state.proposal.status === 'approved' && step.beforeApproval));
    const step = steps[index];
    return `<a class="walkthrough-prompt" href="#${step ? step.target : 'walkthrough'}"><span>${icon(step ? 'arrow' : 'check')}</span><div><small>${step ? `Walkthrough · Step ${index + 1} of ${steps.length}` : steps.every(item => item.done) ? 'Walkthrough completed' : 'Project updates checked'}</small><strong>${step ? step.title : 'View your updated project'}</strong></div>${icon('right')}</a>`;
  }

  function walkthroughScreen() {
    if (!isWalkthrough()) return heading('Scenario walkthrough', 'Bathroom tile replacement') + `<div class="action-stack">${action('Open scenario walkthrough', 'switch-demo', 'primary', 'data-mode="walkthrough"')}${link('Restart full walkthrough', 'restart-scenario')}${link('Back to project tools', 'more', 'quiet')}</div>`;
    const steps = walkthroughSteps();
    const current = steps.findIndex(step => !step.done && !(state.proposal.status === 'approved' && step.beforeApproval));
    return heading('Scenario walkthrough', 'Bathroom tile replacement') +
      (QUOTATION_STUDY ? notice('This approval demo starts with the bathroom defect already reported. Start the full walkthrough to include defect reporting.') + `<div class="action-stack"><a class="button secondary" href="${esc(fullScenarioURL('restart-scenario'))}">Start full walkthrough${icon('arrow')}</a></div>` : '') +
      `<ol class="request-timeline walkthrough-timeline">${steps.map((step, index) => {
        const skipped = !step.done && state.proposal.status === 'approved' && step.beforeApproval;
        return `<li class="${step.done ? 'complete' : index === current ? 'current' : skipped ? 'not-visited' : 'upcoming'}" ${index === current ? 'aria-current="step"' : ''}><span class="request-timeline-node" aria-hidden="true">${step.done ? icon('check') : skipped ? '—' : ''}</span><div class="request-step-copy"><h3>${step.title}</h3><p>${step.detail}</p>${skipped ? '<small class="walkthrough-skipped">Not completed</small>' : ''}<span class="sr-only">${step.done ? 'Completed' : skipped ? 'Not completed' : index === current ? 'Current step' : 'Upcoming'}</span></div></li>`;
      }).join('')}</ol><div class="action-stack">${current >= 0 ? link(`Continue · ${steps[current].title}`, steps[current].target, 'primary') : link('View updated budget', 'budget', 'primary')}${current < 0 ? link('View payment timeline', 'timeline') : ''}${!STUDY_CONTEXT ? link('Restart full walkthrough', 'restart-scenario') : ''}${link('Back to project tools', 'more', 'quiet')}</div>${STUDY_CONTEXT ? `<div class="demo-reset">${link(demoResetLabel(), 'reset', 'danger')}</div>` : ''}`;
  }

  function defectRow(defect) {
    const next = { approval: 'Review linked proposal', verification: 'Inspect before you verify', followup: 'Discuss remaining work', reported: defect.changeRequest ? 'Track quotation request' : 'View report', scheduled: 'Repair planned · see record', withdrawn: 'Restore if needed', verified: 'Reopen if the issue returns' }[defect.status];
    const photos = defectPhotos(defect);
    return `<a class="record-row" href="#defect/${esc(defect.id)}"><div class="record-content"><div class="record-topline">${defect.status === 'reported' && defect.changeRequest ? badge('Pending quotation', 'amber') : statusBadge(defect.status)}</div><div class="record-summary${photos.length ? ' has-photo' : ''}"><div><h3>${esc(defect.title)}</h3><p>${esc(defect.room)} · ${esc(defect.category)}</p></div>${photos.length ? `<span class="record-thumbnail">${photoImage(photos[0], true)}<span class="record-photo-count" aria-label="${photos.length} ${photos.length === 1 ? 'photo' : 'photos'}">${icon('camera')}${photos.length}</span></span>` : ''}</div><div class="record-meta"><span>${esc(defect.id)}</span><span>· ${esc(defect.reported.replace(' · local demo', ''))}</span></div><span class="next-label">${esc(next)}</span></div>${icon('right')}</a>`;
  }

  function defectPhotos(defect) {
    if (sessionPhotos.has(defect.id)) return [{ src: sessionPhotos.get(defect.id), title: 'Your attached photo', alt: 'Your attached defect photograph', sample: false }];
    if (defect.photoName) return [];
    if (defect.samplePhotos === false) return [];
    return demoDefectPhotos[defect.id] || [];
  }

  function photoImage(photo, thumbnail = false) {
    return `<img src="${esc(photo.src)}" alt="${thumbnail ? '' : esc(photo.alt)}" ${thumbnail ? 'loading="lazy" decoding="async"' : ''} class="${thumbnail && photo.closeup ? 'photo-image-closeup' : ''}">`;
  }

  function photoGallery(id, photos, source = 'record') {
    if (!photos.length) return '';
    return `<section class="defect-photos" aria-label="Defect photos"><div class="photo-heading"><h3>Photos <span>${photos.length}</span></h3>${photos.every(photo => photo.sample) ? '<small>Sample photos</small>' : ''}</div><div class="photo-thumbnails">${photos.map((photo, index) => `<button type="button" class="photo-thumbnail" data-action="open-defect-photo" data-id="${esc(id)}" data-index="${index}" data-source="${source}" aria-label="Open photo ${index + 1} of ${photos.length}: ${esc(photo.title)}">${photoImage(photo, true)}<span class="photo-zoom" aria-hidden="true">${icon('search')}</span></button>`).join('')}</div><p class="help">Tap a photo to enlarge.</p></section>`;
  }

  function reportPhotos(draft) {
    if (draft.photo) return [{ src: draft.photo, title: 'Your selected photo', alt: 'Your selected defect photograph', sample: false }];
    return draft.samplePhotos && !draft.photoName ? demoDefectPhotos['DEF-021'] : [];
  }

  function openDefectPhoto(id, index, source = 'record') {
    const defect = findDefect(id);
    const photos = source === 'report' ? reportPhotos(getReportDraft()) : defect ? defectPhotos(defect) : [];
    const photo = photos[index];
    if (!photo) return;
    const dialog = document.getElementById('room-dialog');
    dialog.classList.add('photo-viewer');
    document.getElementById('room-dialog-content').innerHTML = `<div class="sheet-handle" aria-hidden="true"></div><div class="heading-row"><div><p class="eyebrow">${esc(id)}${photo.sample ? ' · Sample photo' : ''}</p><h2 id="room-dialog-title">${esc(photo.title)}</h2></div><button type="button" class="icon-button" data-action="close-room" aria-label="Close photo">${icon('close')}</button></div><img class="defect-photo-full" src="${esc(photo.src)}" alt="${esc(photo.alt)}">${photos.length > 1 ? `<div class="photo-viewer-controls">${action('Previous', 'open-defect-photo', 'secondary compact', `data-id="${esc(id)}" data-index="${index - 1}" data-source="${source}" ${index === 0 ? 'disabled' : ''}`)}<span aria-live="polite">${index + 1} of ${photos.length}</span>${action('Next', 'open-defect-photo', 'secondary compact', `data-id="${esc(id)}" data-index="${index + 1}" data-source="${source}" ${index === photos.length - 1 ? 'disabled' : ''}`)}</div>` : ''}`;
    if (!dialog.open) dialog.showModal();
    else dialog.querySelector('[data-action="close-room"]').focus({ preventScroll: true });
  }

  function filteredDefects() {
    const search = filters.search.trim().toLowerCase();
    return projectDefects().filter(defect => {
      const matchesStatus = filters.status === 'open' ? !['verified', 'withdrawn'].includes(defect.status) : defect.status === filters.status;
      const searchable = `${defect.title} ${defect.id} ${defect.room} ${defect.category} ${defect.description}`.toLowerCase();
      return matchesStatus && (!filters.room || defect.room === filters.room) && (!search || search.split(/\s+/).every(term => searchable.includes(term)));
    });
  }

  function defectResults() {
    const records = filteredDefects();
    const hasFilters = Boolean(filters.room || filters.search.trim());
    return `<p class="result-count" role="status">${records.length} ${records.length === 1 ? 'record' : 'records'}</p><div class="stack">${records.map(defectRow).join('') || `<div class="empty-state">${icon('search')}<h2>No matching records</h2><p>${hasFilters ? 'Try another room or search term.' : filters.status === 'withdrawn' ? 'Withdrawn reports will stay here so they can be restored.' : filters.status === 'verified' ? 'Repairs will appear here after your inspection.' : 'No open defects are recorded.'}</p>${hasFilters ? action('Clear filters', 'clear-defect-filters') : link('Report a defect', 'report')}</div>`}</div>`;
  }

  function defectsScreen() {
    return heading('Defects & repairs') + link('Report a defect', 'report', 'primary') +
      `<div class="segmented" aria-label="Defect record status">${['open', 'verified', 'withdrawn'].map(value => `<button type="button" data-action="filter-status" data-status="${value}" aria-pressed="${filters.status === value}">${value[0].toUpperCase() + value.slice(1)}</button>`).join('')}</div>
      <div class="defect-filters"><label class="search-field">${icon('search')}<span class="sr-only">Search defect records</span><input id="defect-search" type="search" placeholder="Search by room or issue" value="${esc(filters.search)}"></label><div class="filter-row"><label for="defect-room">Filter by room</label><div class="room-filter-select"><select id="defect-room"><option value="">All rooms</option>${ROOMS.map(room => `<option value="${esc(room)}" ${filters.room === room ? 'selected' : ''}>${esc(room)}</option>`).join('')}</select><span id="defect-room-value" aria-hidden="true">${esc(filters.room || 'All rooms')}</span><svg aria-hidden="true"><use href="#i-right"></use></svg></div></div></div><div id="defect-results">${defectResults()}</div>`;
  }

  function refreshDefectResults() {
    const results = document.getElementById('defect-results');
    if (!results) return;
    document.getElementById('defect-room-value').textContent = filters.room || 'All rooms';
    results.innerHTML = defectResults();
    document.querySelectorAll('[data-action="filter-status"]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.status === filters.status)));
  }

  function roomsScreen() {
    return heading('Rooms & previews', 'Punggol · 4-room BTO') + `<div class="model-card"><div class="model-caption"><span class="eyebrow">Room overview</span>${action('Flip view', 'rotate-plan', 'quiet compact')}</div><div id="room-scene">${window.RenoGuardRooms.scene({ defects: projectDefects(), mirror: mirrorPlan, tile: state.proposal.tile })}</div><p class="model-hint">Tap a room for details.</p><div class="model-legend"><span><i></i> Room</span><span><b>!</b> Open issue</span></div></div><p class="help">Illustrative cutaway and room areas; not a measured survey of your home.</p><div class="section-heading"><h2>Rooms &amp; records</h2></div><div class="room-list">${ROOMS.map(room => { const issues=openDefects().filter(d=>d.room===room); return `<button class="room-list-item" data-action="open-room" data-room="${roomSlug(room)}"><span class="icon-tile">${icon(room==='Bathroom'?'camera':'rooms')}</span><span><strong>${esc(room)}</strong><small>${issues.length?`${issues.length} open ${issues.length===1?'issue':'issues'}`:'No open issues'}</small></span>${issues.length?'<b class="attention-key">!</b>':icon('right')}</button>`; }).join('')}</div>`;
  }

  function openRoom(slug) {
    const room = roomFromSlug(slug);
    if (!room) return;
    const dialog = document.getElementById('room-dialog');
    dialog.classList.remove('photo-viewer');
    const records = openDefects().filter(d => d.room === room);
    const metadata = window.RenoGuardRooms.rooms.find(r => r.name === room);
    document.getElementById('room-dialog-content').innerHTML = `<div class="sheet-handle" aria-hidden="true"></div><div class="heading-row"><p class="eyebrow">Room overview · ${metadata.area}</p>${action('Close', 'close-room', 'quiet compact')}</div><h2 id="room-dialog-title">${esc(room)}</h2><p class="intro">${records.length ? `${records.length} open ${records.length===1?'issue':'issues'} in this room` : 'No open issues in this room'}</p>${room==='Bathroom'&&proposalReady()?`<a class="room-change-summary" href="#change/VO-015">${icon('changes')}<span><strong>Bathroom floor tile replacement</strong><small>${state.proposal.status==='approved'?'Approved · '+tileName():'Approval needed · two tile options'} · +S$250</small></span>${icon('right')}</a>`:''}${records.map(d=>`<a class="sheet-record" href="#defect/${d.id}">${statusBadge(d.status)}<strong>${esc(d.title)}</strong>${icon('right')}</a>`).join('')}<div class="action-stack">${link(room==='Bathroom'&&!proposalReady()?'Report the bathroom tiles':room==='Bathroom'?'Open AR room preview':'Enter 3D room view',room==='Bathroom'&&!proposalReady()?'report/room/bathroom':`preview/${slug}`,'primary')}${link('Room details & records',`room/${slug}`)}</div>`;
    dialog.showModal();
  }

  function previewScreen(slug) {
    const room = roomFromSlug(slug);
    if (!room) return missing('Room not found', 'rooms');
    if(room !== 'Bathroom') return heading(room, '3D room view') + `<div class="model-card room-closeup"><div id="room-scene">${window.RenoGuardRooms.scene({only:slug,mirror:mirrorPlan})}</div>${action('Flip room view','rotate-plan','secondary')}</div>` + notice('Illustrative 3D cutaway. Furniture, finishes and dimensions are design references.') + `<div class="action-stack">${link('View room records',`room/${slug}`,'primary')}${link('Back to home overview','rooms')}</div>`;
    const preview = previewTile || state.proposal.tile;
    const material=materials[preview];
    const previewAction = state.proposal.status === 'approved' ? link('View approved change', 'change/VO-015', 'primary') : action(state.proposal.selectionMade ? 'Review selected tile' : 'Use this tile & review', 'use-preview-tile', 'primary');
    return `<div class="ar-preview"><div class="ar-scene ${preview==='sabbia'?'warm-floor':''}" id="ar-scene" role="region" aria-label="Bathroom preview with ${material.name} floor tiles"><img class="bathroom-photo" src="assets/bathroom.webp" alt="Realistic bathroom with a floating toilet, walnut cabinet and stone floor"><img class="floor-overlay colour" src="assets/materials/sabbia-colour.svg" alt=""><img class="floor-overlay warmth" src="assets/materials/sabbia-warmth.svg" alt=""><div class="ar-scene-top"><span class="ar-tag">${icon('camera')} Bathroom preview</span><span class="ar-demo">Simulated AR</span></div><div class="floor-area ${showFloorGuide?'':'is-hidden'}" id="floor-guide"><svg viewBox="0 0 390 540" preserveAspectRatio="none"><path d="M0 362 80 346 214 330 308 334 390 312"/><circle cx="80" cy="346" r="4"/><circle cx="214" cy="330" r="4"/><circle cx="308" cy="334" r="4"/></svg><span>Floor area · 4.5 m²</span></div><button class="floor-guide-button" data-action="toggle-floor" aria-pressed="${showFloorGuide}" aria-label="Show floor boundary">${icon('rooms')}</button><span class="preview-sample-label">Illustrative view · not a live camera</span></div><div class="ar-controls"><p class="eyebrow">Preview & choose a floor finish</p><div class="tile-options" aria-label="Bathroom floor tile options">${Object.entries(materials).map(([key,m])=>`<button data-action="select-tile" data-tile="${key}" aria-pressed="${preview===key}" ${state.proposal.status==='approved'?'disabled':''}><img src="assets/materials/${key}.webp" alt=""><span><small>${m.label}</small><strong>${m.name}</strong></span><i>${preview===key?'✓':''}</i></button>`).join('')}</div><p class="help ar-choice-status" id="ar-choice-status" aria-live="polite">${state.proposal.status === 'approved' ? 'Approved tile · ' + esc(tileName()) : state.proposal.selectionMade ? esc(tileName()) + ' selected for review. Not approved yet.' : 'Tap a finish to save your tile choice.'}</p><div id="material-summary" aria-live="polite"><h1 id="screen-title" tabindex="-1">${material.name}</h1><p>600 × 600 mm · Matte porcelain</p><span class="material-note">${icon('sparkles')}${material.note}</span></div><div class="ar-specs"><div><small>Extra cost</small><strong>+S$250</strong></div><div><small>Ready by</small><strong>14 Jul</strong></div><div><small>Finish</small><strong>Matte</strong></div></div>${state.proposal.status==='approved'?notice('This is your approved tile. Withdraw the approval first to select a different option.'):''}${previewAction}<p class="help">Colour and lighting are illustrative. Confirm a physical sample with your designer.</p></div></div>`;
  }

  function updateTile(tile) {
    if (state.proposal.status === 'approved' || !materials[tile]) return;
    approvalAcknowledged = false;
    const scene = document.getElementById('ar-scene');
    if (scene) {
      previewTile = tile;
      const changed = !state.proposal.selectionMade || state.proposal.tile !== tile;
      if (changed) { reviewImpactSeen = false; reviewAtConfirmation = false; }
      mutate(() => Store.selectTile(tile));
      if (isWalkthrough() && state.walkthrough.reported) mutate(() => Store.recordTilePreview(tile));
      const material = materials[tile];
      scene.classList.toggle('warm-floor', tile === 'sabbia');
      scene.setAttribute('aria-label', `Bathroom preview with ${material.name} floor tiles`);
      document.querySelectorAll('[data-action="select-tile"]').forEach(button => {
        const selected = button.dataset.tile === tile;
        button.setAttribute('aria-pressed', String(selected));
        button.querySelector('i').textContent = selected ? '✓' : '';
      });
      document.getElementById('material-summary').innerHTML = `<h1 id="screen-title" tabindex="-1">${material.name}</h1><p>600 × 600 mm · Matte porcelain</p><span class="material-note">${icon('sparkles')}${material.note}</span>`;
      document.getElementById('ar-choice-status').textContent = `${material.name} selected for review. Not approved yet.`;
      document.querySelector('[data-action="use-preview-tile"]').textContent = 'Review selected tile';
      announce(`${material.name} selected for review. Your budget is unchanged until approval.`);
    } else {
      reviewImpactSeen = false;
      reviewAtConfirmation = false;
      mutate(() => Store.selectTile(tile));
      render();
      document.querySelector(`[data-review-tile="${tile}"]`)?.focus({ preventScroll: true });
      announce(`${tileName()} selected. Additional cost S$250. Not approved yet.`);
    }
    document.getElementById('header-context').textContent = headerTitle();
    document.title = 'RenoGuard · Mobile';
  }

  function roomScreen(slug) {
    const room = roomFromSlug(slug);
    if (!room) return missing('Room not found', 'rooms');
    const records=projectDefects().filter(d=>d.room===room);
    return heading(room,'Room records') + `<a class="room-preview-link" href="#${room==='Bathroom'&&!proposalReady()?'report/room/bathroom':`preview/${slug}`}">${room==='Bathroom'?'<img src="assets/bathroom.webp" alt="Bathroom design preview">':window.RenoGuardRooms.scene({only:slug})}<span>${icon('camera')}${room==='Bathroom'&&!proposalReady()?'Report the bathroom tiles':room==='Bathroom'?'Explore tile options':'Enter 3D room view'}${icon('arrow')}</span></a>` + section('Defect records',`<div class="stack">${records.map(defectRow).join('')||'<div class="empty-state"><h3>No records yet</h3><p>Found an issue? Add a report below.</p></div>'}</div>`) + `<div class="action-stack">${link('Report an issue in this room',`report/room/${slug}`,'primary')}${link('All rooms','rooms')}</div>`;
  }

  function changesScreen() {
    if (!proposalReady()) return heading('Approvals') + `<div class="empty-state">${icon('changes')}<h2>No proposals to review yet</h2><p>Start the walkthrough by reporting the cracked bathroom tiles.</p>${link('Report the bathroom tiles', 'report/room/bathroom', 'primary')}</div>`;
    const pending = state.proposal.status === 'pending';
    const matching = filters.changes === (pending ? 'pending' : 'approved');
    return heading('Approvals') +
      `<div class="segmented" aria-label="Change request status">${['pending', 'approved'].map(value => `<button type="button" data-action="filter-changes" data-status="${value}" aria-pressed="${filters.changes === value}">${value === 'pending' ? 'Awaiting approval' : 'Approved'}</button>`).join('')}</div>` +
      (matching ? pending ? proposalCard() : `<a class="record-row" href="#change/VO-015"><div>${badge('Approved', 'green')}<h3>Bathroom tile replacement</h3><p>${tileName()} · +${money(PROPOSAL_COST)}</p><div class="record-meta">VO-015 · ${esc(state.proposal.approvedAt)}</div></div>${icon('right')}</a>` : `<div class="empty-state">${icon('changes')}<h2>${pending ? 'No approved changes yet' : 'No decisions waiting'}</h2><p>${pending ? 'Approved changes will appear here with their cost and decision record.' : 'Your tile replacement approval is recorded under Approved.'}</p>${action(pending ? 'View pending proposal' : 'View approved change', 'switch-change-filter')}</div>`);
  }

  const guidedReview = () => UI_VARIANT === 'b';
  const selectedTile = () => state.proposal.selectionMade ? state.proposal.tile : null;
  const isReviewRoute = path => ['change/VO-015', 'change/VO-015/impact', 'approve/VO-015'].includes(path);
  const reviewReturnTarget = () => reviewReturnRoute && isReviewRoute(reviewReturnRoute) ? reviewReturnRoute : 'change/VO-015';
  const decisionRoute = () => guidedReview() ? route === 'approve/VO-015' : route === 'change/VO-015';

  function reviewTop(title, step) {
    return heading(title, 'Bathroom · VO-015') +
      `<div class="review-meta">${badge(state.proposal.status === 'approved' ? 'Approved' : state.proposal.revisionRequest ? 'Changes requested' : 'Pending your approval', state.proposal.status === 'approved' ? 'green' : 'amber')}<span>John Tan · 18 Jun 2026</span></div>` +
      (guidedReview() && state.proposal.status !== 'approved' ? window.RenoGuardComparison.progress(step, { canContinue: Boolean(selectedTile()), canConfirm: Boolean(selectedTile()) && reviewImpactSeen }) : '');
  }

  function reviewContext() {
    return `<div class="review-context">${window.RenoGuardComparison.originalBrief()}<a class="review-related" href="#defect/DEF-021">${icon('defects')}<span>Cracked bathroom tiles · DEF-021</span>${icon('right')}</a></div>`;
  }

  function reviewSection(title, body) {
    return `<section class="review-section"><div class="review-section-heading"><h2>${esc(title)}</h2></div>${body}</section>`;
  }

  function reviewTileSection() {
    return reviewSection('Replacement options', window.RenoGuardComparison.choices({ selectedTile: selectedTile(), disabled: state.proposal.status === 'approved' }) +
      `<details class="review-specifications" ${reviewSpecsExpanded ? 'open' : ''}><summary>Compare full specifications</summary>${window.RenoGuardComparison.render('a', { selectedTile: selectedTile() })}<p class="help">Availability from the sample quotation dated 18 Jun 2026.</p></details>`);
  }

  function reviewSources() {
    const resources = [
      ['camera', 'Preview in your bathroom', 'Compare both floor finishes', 'preview/bathroom'],
      ['file', 'View quotation', 'Breakdown of the additional S$250', 'document/quotation'],
      ['budget', 'View project budget', `${money(totals().available)} remaining`, 'budget']
    ];
    return reviewSection('Supporting details', `<div class="review-resources">${resources.map(([symbol, title, detail, target]) => `<a class="review-resource" href="#${target}">${icon(symbol)}<span><strong>${title}</strong><small>${detail}</small></span>${icon('right')}</a>`).join('')}</div>`);
  }

  function reviewImpactSection() {
    return reviewSection('Cost & timing', window.RenoGuardComparison.impact({ availableBudget: totals().available, approved: state.proposal.status === 'approved' }));
  }

  function approvalConfirmation() {
    return `<section class="review-section review-confirmation" id="approval-summary"><div class="review-section-heading"><h2 id="approval-summary-title" tabindex="-1">Approval summary</h2></div>${window.RenoGuardComparison.selectionSummary({ selectedTile: selectedTile(), editTarget: 'change/VO-015' })}<dl class="review-confirm-details">${row('Additional cost', '<strong>+S$250</strong>')}${row('Remaining budget', `<strong>${money(totals().available - PROPOSAL_COST)}</strong>`)}${row('Completion', '<strong>14 Jul 2026</strong>')}</dl><label class="approval-check"><input type="checkbox" id="approval-acknowledgement" ${!selectedTile() ? 'disabled' : ''} ${approvalAcknowledged ? 'checked' : ''}><span>I have reviewed the tile, S$250 additional cost and revised completion date.</span></label><p class="help" id="approval-help">${!selectedTile() ? 'Choose a tile, then confirm the details.' : approvalAcknowledged ? 'Ready to record your decision.' : 'Select the checkbox to enable approval.'}</p><p class="help">Approval updates your budget and schedules the repair. No payment is taken.</p></section>`;
  }

  function variationActions() {
    if (state.proposal.status === 'approved') return `<a class="button danger" href="#withdraw-approval">Withdraw approval</a>${link('View receipt', `approval-receipt/${state.proposal.tile}`, 'primary')}`;
    const request = '<a class="button secondary" href="#revision">Request changes</a>';
    if (!guidedReview() && !reviewAtConfirmation && !approvalAcknowledged) return request + action('Review approval', 'review-summary', 'primary', selectedTile() ? '' : 'disabled aria-describedby="tile-choice-help"');
    if (decisionRoute()) return request + action('Approve · S$250', 'approve-confirm', 'primary', approvalAcknowledged && selectedTile() ? '' : 'disabled aria-describedby="approval-help"');
    const impact = route === 'change/VO-015/impact';
    return request + action(impact ? 'Review approval' : 'Continue', impact ? 'review-approval' : 'review-impact', 'primary', selectedTile() ? '' : 'disabled aria-describedby="tile-choice-help"');
  }

  function changeScreen() {
    const approved = state.proposal.status === 'approved';
    const impact = guidedReview() && route === 'change/VO-015/impact';
    const top = reviewTop(impact ? 'Cost & timing' : guidedReview() && !approved ? 'Choose your tile' : 'Review tile change', impact ? 2 : 1);
    const revision = state.proposal.revisionRequest ? reviewSection('Your revision request', `<div class="card"><p>${esc(state.proposal.revisionRequest.text)}</p><p class="help">Saved locally. No additional cost approved.</p></div>`) : '';
    const history = state.proposal.lastApprovedAt ? notice(`Previous approval withdrawn on ${esc(state.proposal.withdrawnAt)}. The decision history is retained.`) : '';
    if (approved) return `<div class="review-approval-page">${top}${window.RenoGuardComparison.selectionSummary({ selectedTile: selectedTile() })}${reviewImpactSection()}${reviewSources()}${revision}${history}</div>`;
    if (impact) return `<div class="review-approval-page">${top}${window.RenoGuardComparison.selectionSummary({ selectedTile: selectedTile(), editTarget: 'change/VO-015' })}<div class="review-section">${window.RenoGuardComparison.impact({ availableBudget: totals().available })}</div>${reviewSources()}${revision}${history}</div>`;
    return `<div class="review-approval-page">${top}${reviewContext()}${reviewTileSection()}<p class="help" id="tile-choice-help">${selectedTile() ? `${esc(tileName())} selected. No change approved yet.` : 'Choose a replacement tile.'}</p>${guidedReview() ? '' : reviewImpactSection()}${reviewSources()}${guidedReview() ? '' : approvalConfirmation()}${revision}${history}</div>`;
  }

  function materialScreen() { return previewScreen('bathroom'); }

  function approvalScreen() {
    if (state.proposal.status === 'approved') return approvalReceipt();
    return `<div class="review-approval-page">${reviewTop('Review & approve', 3)}${approvalConfirmation()}${reviewSources()}</div>`;
  }

  function approvalReceipt(expectedTile) {
    if (expectedTile && expectedTile !== state.proposal.tile) return missing('This is not the approved tile', `approval-receipt/${state.proposal.tile}`);
    if(state.proposal.status!=='approved')return missing('Approval is not recorded','change/VO-015');
    return `<div class="success-icon" data-approved-tile="${esc(state.proposal.tile)}">${icon('check')}</div>`+heading('Change approved','VO-015',`${tileName()} · Bathroom floor`)+`<div class="card"><dl class="details">${row('Approved by','Thomas Eng')}${row('Recorded',esc(state.proposal.approvedAt))}${row('Additional cost','S$250')}${row('Remaining budget',`<strong>${money(totals().available)}</strong>`)}${row('New completion','14 Jul 2026')}${row('Repair status','Scheduled')}${row('New payment milestone','New bathroom tiles · S$250 · 14 Jul')}${row('Payment status','Unpaid')}</dl></div><div class="action-stack">${link('View updated budget','budget','primary')}${link('View payment timeline','timeline')}</div>${demoSessionActions()}`;
  }

  function withdrawApprovalScreen() {
    if (state.proposal.status !== 'approved' || findDefect('DEF-021').status !== 'scheduled') return missing('Approval cannot be withdrawn', 'change/VO-015', 'You can withdraw only an approved change whose repair has not progressed beyond scheduled.');
    return heading('Withdraw this approval?', 'VO-015 · Bathroom tiles', 'The proposal will return to awaiting approval. The earlier approval remains in the record.') + `<div class="card"><dl class="details">${row('Remaining budget', money(totals().available))}${row('After withdrawal', `<span class="emphasis">${money(totals().available + PROPOSAL_COST)}</span>`)}${row('Cost removed from commitments', money(PROPOSAL_COST))}</dl></div>` + notice('The linked repair will wait for a new decision. No payment or refund occurs; this changes your local demo record.', true) + `<div class="action-stack">${action('Confirm approval withdrawal', 'withdraw-approval-confirm', 'danger')}${link('Keep approval', 'change/VO-015')}</div>`;
  }

  function budgetNavigation(current) {
    return `<nav class="budget-nav" aria-label="Budget sections">${[['Overview', 'budget'], ['Quotes', 'documents'], ['Payments', 'timeline']].map(([label, target]) => `<a href="#${target}" ${target === current ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`;
  }

  function budgetScreen() {
    const metrics=totals(),approved=state.proposal.status==='approved';
    return heading('Budget')+budgetNavigation('budget')+`<div class="money-card"><span class="money-label">Remaining budget${icon('budget')}</span><span class="money-value">${money(metrics.available)}</span><div class="budget-bar"><span style="width:${metrics.approved/PROJECT_BUDGET*100}%"></span></div><div class="money-footer"><small>${money(metrics.approved)} approved</small><small>${money(PROJECT_BUDGET)} total</small></div></div>`+
      (approved?`<a class="approved-banner" href="#approval-receipt">${icon('check')}<span><strong>New bathroom tiles approved</strong><small>${tileName()} · VO-015 · −S$250</small></span>${icon('right')}</a>`:proposalReady()?`<section class="card budget-impact"><div class="budget-impact-body"><div class="heading-row"><h2>If you approve <span class="record-ref">VO-015</span></h2>${badge('Pending approval')}</div><div class="budget-before-after"><span><small>Now</small><strong>${money(metrics.available)}</strong></span>${icon('arrow')}<span><small>After</small><strong>${money(metrics.available-PROPOSAL_COST)}</strong></span></div><p>Proposed completion: <strong>14 Jul 2026</strong> · originally 1 Jul.</p></div><a class="card-action" href="#${reviewReturnTarget()}"><span>Review proposed change</span>${icon('arrow')}</a></section>`:'')+
      section('Approved so far, by trade',`<div class="trade-list">${[['Carpentry',7200],['Tiling',3600+(approved?250:0)],['Electrical',3100],['Others',1100]].map(([name,amount])=>`<div><div class="heading-row"><strong>${name}</strong><span>${money(amount)}${name==='Tiling'&&!approved&&proposalReady()?'<small class="pending-cost"> +250 pending</small>':''}</span></div><div class="trade-bar"><span style="width:${amount/15000*100}%"></span></div></div>`).join('')}</div>`)+`<p class="demo-note">Approved costs are commitments, not payments. Pending changes are excluded until you approve.</p>`;
  }

  function defectScreen(id) {
    const defect = findDefect(id);
    if (!defect) return missing('Defect record not found', 'defects');
    const flash = flashes.get(`defect/${id}`);
    flashes.delete(`defect/${id}`);
    let next = '';
    if (defect.status === 'approval') next = notice('<strong>Your next step</strong>Review the replacement tile quotation before this repair can proceed.', true) + link('Review tile replacement', 'change/VO-015', 'primary');
    if (defect.status === 'verification') next = notice('<strong>Inspect before you verify</strong>Check the cabinet alignment and operation at your home. Record a follow-up if the issue remains.') + `<div class="action-stack">${link('Inspect the repair', `inspect/${id}`, 'primary')}${link('Issue still needs work', `followup/${id}`)}</div>`;
    if (defect.status === 'verified') next = notice('<strong>Repair verified</strong>Your record can be reopened if you find a remaining problem.') + `<div class="action-stack">${link('Reopen for follow-up', `followup/${id}`)}</div>`;
    if (defect.status === 'scheduled') next = notice(`<strong>Repair planned · see record</strong>${id === 'DEF-021' ? 'The replacement tile change is approved. Completion is planned for 14 Jul 2026.' : 'The paint touch-up is scheduled for 26 Jun.'} Verify the result once it is ready for inspection.`);
    if (defect.status === 'followup') next = notice('<strong>Follow-up recorded</strong>The issue remains open. Discuss the remaining work with John using your usual contact channel.', true) + `<div class="action-stack">${link('View project contact', 'contact')}${id === 'DEF-003' ? action('Return to ready for inspection', 'restore-inspection', 'secondary', `data-id="${id}"`) : ''}</div>`;
    if (defect.status === 'reported') next = defect.changeRequest
      ? section('Next step', `<p>Review the quotation and replacement options when they are ready.</p><div class="action-stack">${link('Track quotation request', `request-receipt/${id}`, 'primary')}</div>`)
      : section('Need a replacement?', `<p>Request a quotation to review the options and cost before approving work.</p><div class="action-stack">${link('Request a quotation', `request/${id}`)}</div>`);
    if (defect.status === 'withdrawn') next = notice('<strong>Report withdrawn</strong>The record is retained and excluded from open defects. You can restore it if needed.') + `<div class="action-stack">${action('Restore report', 'restore-report', 'primary', `data-id="${id}"`)}</div>`;
    return heading(defect.title, `${defect.id} · ${defect.room}`) + (defect.status === 'reported' && defect.changeRequest ? badge('Pending quotation', 'amber') : statusBadge(defect.status)) + (flash ? notice(esc(flash)) : '') + section('Issue details', `<div class="card issue-card"><p>${esc(defect.description)}</p>${photoGallery(id, defectPhotos(defect))}<details class="record-information"><summary>Report details</summary><dl class="details">${row('Room', esc(defect.room))}${row('Category', esc(defect.category))}${row('Reported', esc(defect.reported.replace(' · local demo', '')))}${row('Responsible person', 'John Tan · Northline Interiors')}</dl></details></div>`) +
      (defect.photoName && !sessionPhotos.has(id) ? notice(`Photo filename: ${esc(defect.photoName)}.<br>The preview is unavailable after reload or in another interface. Photos are not uploaded or shared.`) : '') +
      (defect.followupNote ? section('Your follow-up note', `<div class="card"><p>${esc(defect.followupNote)}</p></div>`) : '') + next +
      (id === 'DEF-021' && state.proposal.status === 'approved' ? `<a class="linked-row" href="#change/VO-015">${icon('changes')}View approved VO-015${icon('right')}</a>` : '') +
      (defect.status === 'reported' ? `<details class="manage-report"><summary>Manage report</summary><div class="action-stack">${link('Edit report', `report/edit/${id}`)}${link('Withdraw report', `withdraw-report/${id}`, 'danger')}</div></details>` : '');
  }

  function requestScreen(id) {
    const defect=findDefect(id);
    if(!defect||defect.status!=='reported')return missing('Request unavailable',`defect/${id}`);
    if(defect.changeRequest)return requestReceipt(id);
    return heading('Request a quotation',`${id} · ${defect.room}`,'Check the report details.')+`<div class="card"><p class="eyebrow">${esc(defect.room)} · ${esc(defect.category)}</p><p class="request-description">${esc(defect.description)}</p>${photoGallery(id, defectPhotos(defect))}<a class="text-link" href="#report/edit/${id}">Edit report${icon('arrow')}</a></div>`+notice('<strong>No spending approved yet.</strong>You will review the quotation, options and completion date before deciding.',true)+`<div class="action-stack">${action('Save quotation request','request-confirm','primary',`data-id="${id}"`)}</div><p class="demo-note">Prototype request · saved on this device.</p>`;
  }

  function requestReceipt(id) {
    const defect = findDefect(id);
    if (!defect?.changeRequest) return missing('No quotation request saved', `defect/${id}`);
    const saved = new Date(defect.changeRequest.savedAt);
    const savedTime = Number.isNaN(saved.valueOf()) ? 'Saved on this device' : saved.toLocaleString('en-SG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    const steps = [
      { title: 'Defect logged', detail: `${defect.id} · ${defect.reported.replace(' · local demo', '')}`, state: 'complete' },
      { title: 'Quotation request saved', detail: savedTime, state: 'complete' },
      { title: 'Pending quotation', detail: 'Next: John checks replacement options and costs.', state: 'current' },
      { title: 'Review & approve the variation', detail: 'You review the cost and timing before deciding.', state: 'upcoming' },
      { title: 'Repair scheduled', detail: 'Work can proceed after your approval.', state: 'upcoming' }
    ];
    return `<div class="request-confirmation"><header class="request-hero"><div class="request-send-mark">${icon('send')}</div><h1 id="screen-title" tabindex="-1">Quotation request saved</h1><p>No additional spending approved.</p>${badge('Pending quotation', 'amber')}</header><section class="request-progress card" aria-labelledby="request-progress-title"><h2 id="request-progress-title" class="eyebrow">What happens next</h2><ol class="request-timeline">${steps.map(step => `<li class="${step.state}" ${step.state === 'current' ? 'aria-current="step"' : ''}><span class="request-timeline-node" aria-hidden="true">${step.state === 'complete' ? icon('check') : ''}</span><div class="request-step-copy"><h3>${esc(step.title)}</h3><p>${esc(step.detail)}</p><span class="sr-only">${step.state === 'complete' ? 'Completed' : step.state === 'current' ? 'Current step' : 'Upcoming'}</span></div></li>`).join('')}</ol></section><div class="action-stack">${link('Back to home', 'overview', 'primary')}${link(`View defect ${id}`, `defect/${id}`)}</div><p class="demo-note">${STUDY_CONTEXT ? 'Saved for this test session.' : 'Saved on this device.'} No request has been sent to John.</p>${demoSessionActions()}</div>`;
  }

  function getReportDraft() {
    if (reportDrafts.has(route)) return reportDrafts.get(route);
    const [, mode, value] = route.split('/');
    const record = mode === 'edit' ? findDefect(value) : null;
    const guided = firstScenarioReport() && showWalkthroughHints() && mode !== 'edit';
    const draft = { scenarioStart: firstScenarioReport() && mode !== 'edit', room: guided ? 'Bathroom' : record?.room || (mode === 'room' ? roomFromSlug(value) || '' : ''), category: guided ? 'Flooring' : record?.category || '', description: guided ? 'Hairline cracks across three newly installed bathroom floor tiles beside the shower.' : record?.description || '', photoName: record?.photoName || '', photo: record ? sessionPhotos.get(record.id) || '' : '', samplePhotos: guided || Boolean(record && defectPhotos(record).some(photo => photo.sample)), loading: false, token: 0 };
    reportDrafts.set(route, draft);
    return draft;
  }

  function reportReceipt(id) {
    const defect = findDefect(id);
    if (!defect) return missing('Defect record not found', 'defects');
    return `<div class="report-confirmation"><header class="request-hero"><div class="request-send-mark">${icon('check')}</div><h1 id="screen-title" tabindex="-1">Defect report saved</h1><p>${esc(id)} · ${esc(defect.room)}</p></header><div class="card"><p class="eyebrow">${esc(defect.category)}</p><p class="request-description">${esc(defect.description)}</p></div>${isWalkthrough() && id === 'DEF-021' ? notice('<strong>Demo update: quotation ready</strong>John has proposed two replacement tiles. Review the sample proposal on your dashboard.') : ''}<div class="action-stack">${link(isWalkthrough() && id === 'DEF-021' ? 'Continue to dashboard' : 'Done', isWalkthrough() && id === 'DEF-021' ? 'overview' : 'defects', 'primary')}${link('View report', `defect/${id}`)}</div><p class="demo-note">${STUDY_CONTEXT ? 'Saved for this test session.' : 'Saved on this device.'}</p>${demoSessionActions()}</div>`;
  }

  function reportScreen() {
    const [, mode, id] = route.split('/');
    const editing = mode === 'edit';
    if (editing && findDefect(id)?.status !== 'reported') return missing('This report cannot be edited', `defect/${id}`, 'Only reports that have not progressed can be edited.');
    const draft = getReportDraft();
    const options = (values, selected) => values.map(value => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(value)}</option>`).join('');
    return heading(editing ? 'Edit defect report' : 'Report a defect', editing ? `Report · ${id}` : firstScenarioReport() && showWalkthroughHints() ? 'Scenario walkthrough · Step 1' : '', firstScenarioReport() && showWalkthroughHints() ? 'Report the cracked bathroom floor tiles to begin. * Required' : '* Required') +
      `<form id="report-form" novalidate><div class="form-summary" id="form-summary" role="alert" hidden></div><div class="field"><label for="report-room">Room *</label><select id="report-room" name="room" ${firstScenarioReport() && showWalkthroughHints()?'disabled':''} required aria-describedby="room-error"><option value="">Choose a room</option>${options(ROOMS, draft.room)}</select><p class="error" id="room-error"></p></div><div class="field"><label for="report-category">Category *</label><select id="report-category" name="category" ${firstScenarioReport() && showWalkthroughHints()?'disabled':''} required aria-describedby="category-error"><option value="">Choose a category</option>${options(DEFECT_CATEGORIES, draft.category)}</select><p class="error" id="category-error"></p></div><div class="field"><label for="report-description">What needs fixing? *</label><textarea id="report-description" name="description" minlength="10" maxlength="800" required aria-describedby="description-help description-error" placeholder="For example, the lower cabinet door rubs against its frame.">${esc(draft.description)}</textarea><p class="help" id="description-help">Include where it is and what you noticed. 10–800 characters.</p><p class="error" id="description-error"></p></div><div class="field"><label for="report-photo">Add a photo (optional)</label><input type="file" id="report-photo" name="photo" accept="image/jpeg,image/png,image/webp" aria-describedby="photo-help photo-error"><p class="help" id="photo-help">JPG, PNG or WebP · up to 5 MB.</p><p class="error" id="photo-error"></p><div id="photo-preview">${photoPreview(draft)}</div></div><div class="action-stack"><button class="button primary" type="submit" ${draft.loading ? 'disabled' : ''}>${draft.loading ? 'Reading photo…' : editing ? 'Save report changes' : 'Save defect report'}</button></div></form>`;
  }

  function photoPreview(draft) {
    const id = firstScenarioReport() ? 'DEF-021' : route.startsWith('report/edit/') ? route.split('/')[2] : 'New report';
    const photos = reportPhotos(draft);
    return `${photoGallery(id, photos, 'report')}${!photos.length && draft.photoName ? '<p class="help">Existing photo preview is unavailable in this session.</p>' : ''}${draft.photoName ? `<p class="help">${esc(draft.photoName)}</p>` : ''}${draft.photoName || draft.samplePhotos ? action(draft.samplePhotos ? 'Remove sample photos' : 'Remove photo', 'remove-photo', 'quiet') : firstScenarioReport() ? action('Use sample defect photos', 'use-sample-photos', 'quiet') : ''}`;
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
    if (draft.scenarioStart && isWalkthrough() && state.walkthrough.reported) { navigate('defect/DEF-021', true); announce('This walkthrough report is already saved.'); return; }
    const errors = { room: ROOMS.includes(draft.room) ? '' : 'Choose the room where the issue is located.', category: DEFECT_CATEGORIES.includes(draft.category) ? '' : 'Choose a category.', description: draft.description.trim().length >= 10 && draft.description.trim().length <= 800 ? '' : 'Describe the issue in 10–800 characters.' };
    Object.entries(errors).forEach(([name, message]) => setError(form, name, message));
    const first = Object.keys(errors).find(name => errors[name]);
    if (first) return formFailure('Check the highlighted fields before saving.', form.elements[first]);
    if (draft.loading) return formFailure('Wait for the photo preview to finish loading.');
    const [, mode, editId] = route.split('/');
    if (mode === 'edit' && findDefect(editId)?.status !== 'reported') return formFailure('This report has changed status and cannot be edited now.');
    try {
      const payload = { room: draft.room, category: draft.category, description: draft.description.trim(), photoName: draft.photoName, samplePhotos: draft.samplePhotos };
      mutate(() => mode === 'edit' ? Store.updateDefect(editId, payload) : Store.addDefect(payload));
      const id = mode === 'edit' ? editId : state.defects[0].id;
      if (draft.photo) sessionPhotos.set(id, draft.photo);
      else if (!draft.photoName) sessionPhotos.delete(id);
      if (mode === 'edit') flashes.set(`defect/${id}`, 'Report updated.');
      const savedRoute = route;
      navigate(mode === 'edit' ? `defect/${id}` : `report-saved/${id}`, true);
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
      draft.samplePhotos = false;
      if (route === photoRoute) document.getElementById('photo-preview').innerHTML = photoPreview(draft);
    };
    reader.onerror = () => { if (finish() && route === photoRoute) setError(document.getElementById('report-form'), 'photo', 'The photo could not be read. Try another image.'); };
    reader.readAsDataURL(file);
  }

  function withdrawReportScreen(id) {
    const defect = findDefect(id);
    if (!defect || defect.status !== 'reported') return missing('This report cannot be withdrawn', `defect/${id}`);
    return heading('Withdraw this report?', `${id} · ${defect.room}`, 'It will no longer count as an open defect. The record remains available and can be restored.') + `<div class="action-stack">${action('Confirm report withdrawal', 'withdraw-report-confirm', 'danger', `data-id="${id}"`)}${link('Keep report', `defect/${id}`)}</div>`;
  }

  function inspectionScreen(id) {
    const defect = findDefect(id);
    if (id !== 'DEF-003' || !defect || defect.status !== 'verification') return missing('This repair is not ready to inspect', `defect/${id}`, 'The current inspection checklist covers the kitchen cabinet repair. Check the record and contact John about other repairs.');
    const checks = inspections.get(id) || [false, false, false];
    inspections.set(id, checks);
    const labels = ['The cabinet doors align with even gaps.', 'Each door opens and closes smoothly, without rubbing.', 'The hinges feel secure and the original issue is resolved.'];
    return heading('Inspect the cabinet repair', `${id} · Kitchen`, 'Check each item at your home before verifying.') + `<form id="inspection-form" data-id="${id}" novalidate><div class="form-summary" id="form-summary" role="alert" hidden></div><div class="card"><ul class="checklist">${labels.map((label, index) => `<li><span>${index + 1}</span><label for="inspection-${index}"><input id="inspection-${index}" type="checkbox" name="check${index}" data-check-index="${index}" ${checks[index] ? 'checked' : ''}> ${label}</label></li>`).join('')}</ul></div><div class="action-stack"><button type="submit" class="button primary">Review verification</button>${link('Issue still needs work', `followup/${id}`)}</div></form>`;
  }

  function verificationScreen(id) {
    const defect = findDefect(id);
    if (id !== 'DEF-003' || !defect || defect.status !== 'verification') return missing('Repair status has changed', `defect/${id}`, 'Open the repair record to see its current status.');
    if (!inspections.get(id)?.every(Boolean)) return heading('Inspect before you verify', `${id} · Kitchen`, 'Complete the inspection checklist before confirming the repair.') + `<div class="action-stack">${link('Go to inspection checklist', `inspect/${id}`, 'primary')}</div>`;
    return heading('Mark this repair verified?', `${id} · Kitchen`, 'Moves this repair to Verified. You can reopen it later.') + `<div class="action-stack">${action('Confirm repair verified', 'verify-confirm', 'primary', `data-id="${id}"`)}${link('Back to inspection', `inspect/${id}`)}</div>`;
  }

  function textFormScreen(type, id) {
    if (type === 'revision' && state.proposal.status !== 'pending') return missing('This change is already approved', 'change/VO-015');
    const defect = type === 'followup' ? findDefect(id) : null;
    if (type === 'followup' && (!defect || !['verification', 'verified'].includes(defect.status))) return missing('This repair cannot be reopened now', `defect/${id}`);
    const value = textDrafts.get(route) ?? (type === 'revision' ? state.proposal.revisionRequest?.text || '' : '');
    return heading(type === 'revision' ? 'Request a proposal change' : 'Record a repair follow-up', type === 'revision' ? 'VO-015 · Bathroom · DEF-021' : `${id} · ${defect.room}`, '') +
      notice(type === 'revision' ? `Ask about a closer colour match, a physical sample, or the additional ${money(PROPOSAL_COST)}. Saving this request does not approve spending.` : 'No message is sent. Discuss the remaining issue with John using your usual contact channel.') +
      `<form id="text-form" data-kind="${type}" data-id="${esc(id || '')}" novalidate><div class="form-summary" id="form-summary" role="alert" hidden></div><div class="field"><label for="text-description">${type === 'revision' ? 'What would you like changed? *' : 'What still needs work? (optional)'}</label><textarea id="text-description" name="description" maxlength="800" ${type === 'revision' ? 'required minlength="10"' : ''} aria-describedby="text-help description-error">${esc(value)}</textarea><p class="help" id="text-help">${type === 'revision' ? '10–800 characters.' : 'Maximum 800 characters.'}</p><p class="error" id="description-error"></p></div><div class="action-stack"><button class="button primary" type="submit">${type === 'revision' ? 'Save revision request' : 'Save follow-up'}</button></div></form>`;
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
        navigate('change/VO-015');
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
    return heading('Quotes & variations') + budgetNavigation('documents') +
      section('Variation orders', proposalReady() ? `<div class="menu-group">${menuRow('Bathroom tile replacement', 'VO-015 · +S$250 · 18 Jun 2026', 'document/quotation', 'file', state.proposal.status === 'approved' ? 'Approved' : 'Awaiting your approval')}</div>` : '<p>No variation orders have been proposed yet.</p>') +
      section('Original scope', `<div class="menu-group">${menuRow('Main renovation quotation', 'Agreed scope · 2 Apr 2026', 'document/scope', 'file')}</div>`);
  }

  function documentScreen(type) {
    if(!['quotation','scope'].includes(type))return missing('Document not found','documents');
    const quote=type==='quotation';
    return heading(quote?'Bathroom tile variation':'Main renovation quotation',quote?'Sample document · VO-015':'Sample original scope',quote?'Prepared by John Tan · 18 Jun 2026':'Agreed scope · 2 Apr 2026')+(proposalReady()?`<a class="linked-row" href="#defect/DEF-021">${icon('defects')}Bathroom cracked tiles · DEF-021${icon('right')}</a>`:'')+section(quote?'Revised tile work':'Original bathroom flooring',`<p>${quote?'Replace the full 4.5 m² bathroom floor to keep a uniform finish because the original tile is out of stock. Remove the existing tiles, prepare the floor, and lay and grout your selected replacement.':'Supply and install Bianco Matte porcelain floor tiles, 600 × 600 mm, matte finish, as part of the agreed bathroom renovation.'}</p>`)+
      (quote?`<div class="card quote-breakdown"><dl class="details">${row('Remove tiles & prepare floor','S$80')}${row('Replacement tile price difference','S$120')}${row('Laying & grouting','S$50')}${row('Total additional cost','<strong>S$250</strong>')}${row('Options','Grigio Matte or Sabbia Matte')}${row('Proposed completion','14 Jul 2026 · was 1 Jul')}${row('Payment due','14 Jul 2026 · after approval')}</dl></div>`:'')+`<details class="record-information terms-explained"><summary>Terms explained</summary><div class="stack"><div><h3>Variation order</h3><p>A written change to your original scope and quotation. Review the added cost before approving.</p></div><div><h3>Lead time</h3><p>The time needed to source replacement tiles and arrange the work. The proposed finish date is about two weeks later.</p></div></div></details>`+`<div class="action-stack">${proposalReady()?link('Back to change review',reviewReturnTarget(),'primary'):link('All documents','documents','primary')}${link('Check my budget','budget')}${proposalReady()?link('All documents','documents','quiet'):''}</div>`;
  }

  function timelineScreen() {
    const approved=state.proposal.status==='approved';
    const items=[['Deposit','Paid · 2 Apr','S$1,500',true],['Hacking & masonry','Paid · 29 May','S$2,300',true],['Electrical works','Paid · 15 Jun','S$3,100',true],['Carpentry installation','Next · due 26 Jun','S$7,200',false]];
    if(approved)items.push(['New bathroom tiles','VO-015 · Unpaid · due 14 Jul 2026','S$250',false]);
    items.push(['Handover & final payment',approved?'14 Jul 2026 · was 1 Jul':'1 Jul 2026','S$900',false]);
    return heading('Payment timeline')+budgetNavigation('timeline')+`<div class="two-up timeline-stats"><div class="stat-card"><small>Paid milestones</small><strong>3 of ${items.length}</strong></div><div class="stat-card"><small>Target handover</small><strong>${handover()}</strong></div></div><ol class="payment-timeline">${items.map(([title,date,amount,paid])=>`<li class="${title==='New bathroom tiles'?'new-milestone':''}"><span class="timeline-node">${icon(paid?'check':title==='New bathroom tiles'?'plus':'clock')}</span><div><div class="heading-row"><h3>${title}</h3><strong>${amount}</strong></div><p>${date}</p>${title==='New bathroom tiles'?badge('New · approved change','green'):''}</div></li>`).join('')}</ol>`+notice('Base payment milestones total S$15,000. Approving the bathroom variation adds S$250. Paid and due amounts are tracked separately from your remaining budget; no payment is processed here.')+`<div class="action-stack">${!approved&&proposalReady()?link('Review pending tile change','change/VO-015'):''}</div>`;
  }

  function helperScreen(topic) {
    const metrics = totals();
    const answers = {
      change: !proposalReady() ? `<p>Start by reporting the cracked bathroom tiles. The sample replacement proposal will then appear for review.</p>${link('Report the bathroom tiles', 'report/room/bathroom')}` : `<p>The original tile is unavailable until <strong>September 2026</strong>. Choose between cool-grey Grigio Matte and warm-sand Sabbia Matte, both the same size and finish.</p><p>Additional cost: <strong>${money(PROPOSAL_COST)}</strong>. Proposed completion: 14 Jul 2026, about two weeks later than 1 Jul.</p>${link('Read source · VO-015', 'change/VO-015')}`,
      budget: `<p>Committed costs are <strong>${money(metrics.approved)}</strong>, leaving <strong>${money(metrics.available)}</strong> of the ${money(PROJECT_BUDGET)} budget.</p><p>${!proposalReady() ? 'No additional costs have been proposed yet.' : state.proposal.status === 'approved' ? 'The approved tile change is included.' : `The pending ${money(PROPOSAL_COST)} change is excluded. Approval would leave ${money(metrics.available - PROPOSAL_COST)}.`}</p>${link('Read source · Budget', 'budget')}`,
      next: `<p>${metrics.actions ? `${metrics.actions} ${metrics.actions === 1 ? 'action needs' : 'actions need'} your attention.` : 'No homeowner decisions are currently waiting.'}</p><p>Review pending changes, inspect repairs marked ready, and discuss issues marked for follow-up.</p>${link('Read source · Defect records', 'defects')}`
    };
    return heading('Project helper') + (answers[topic] ? `<div class="card stack" aria-live="polite">${answers[topic]}</div>` : '') + `<div class="action-stack">${link('What is changing?', 'helper/change')}${link('How much budget is left?', 'helper/budget')}${link('What needs my attention?', 'helper/next')}</div><p class="demo-note">Prewritten demo answers.</p>`;
  }

  function contactScreen() {
    return heading('Your project contact') + `<div class="card contact-card"><span class="avatar">JT</span><div><h2>John Tan</h2><small>Northline Interiors · Project lead</small></div></div>` + section('Before you contact John', `<p>For bathroom tile questions, refer to VO-015 / DEF-021.</p>`) + notice('No real phone, email, or messaging service is connected. Use your actual contractor’s usual contact channel.') + `<div class="action-stack">${link('View related proposal', 'change/VO-015')}${link('View defect records', 'defects')}</div>`;
  }

  function projectScreen() {
    return heading('Project details', 'Punggol · 4-room BTO') + `<div class="card"><dl class="details">${row('Homeowner', 'Thomas Eng')}${row('Project lead', 'John Tan · Northline Interiors')}${row('Current stage', 'Tiling & carpentry · Stage 3 of 5')}${row('Target handover', handover()+' 2026')}${row('Project budget', money(PROJECT_BUDGET))}</dl></div><div class="action-stack">${link('Project contact', 'contact')}${link('Rooms & previews', 'rooms')}</div>`;
  }

  function profileScreen() {
    return heading('Your profile') + `<div class="card profile-identity"><span class="profile-avatar" aria-hidden="true">TE</span><div><h2>Thomas Eng</h2><p>Homeowner</p></div></div>` +
      section('Your project', `<div class="menu-group">${menuRow('Punggol · 4-room BTO', 'View renovation details', 'project', 'home')}${menuRow('Project contact', 'John Tan · Northline Interiors', 'contact', 'info')}</div>`) +
      section('Demo & walkthrough', `<div class="menu-group">${menuRow('Walkthrough steps', 'Follow the bathroom tile scenario', 'walkthrough', 'clock')}${menuRow('Prototype setup', 'Preview versions and walkthrough settings', 'prototype-setup', 'changes')}</div>`) + `<div class="demo-reset">${link(demoResetLabel(), 'reset', 'danger')}</div>`;
  }

  function variantURL(variant, study = null) {
    return `${location.pathname}?variant=${variant}${study ? `&study=${study}` : ''}#${study === 'quotation' ? 'change/VO-015' : 'overview'}`;
  }

  function prototypeSetupScreen() {
    const versions = [['a', 'Version A', 'Review the tile, cost and timing together'], ['b', 'Version B', 'Review the change in three guided steps']];
    return heading('Prototype setup') +
      section('Compare versions', `<p>Both versions use the same scenario and actions, with separate saved progress.</p><div class="demo-modes">${versions.map(([value, title, description]) => `<a class="demo-mode" href="${esc(variantURL(value))}" ${VARIANT_CONTEXT && UI_VARIANT === value ? 'aria-current="page"' : ''}><span><strong>${title}</strong><small>${description}</small></span>${VARIANT_CONTEXT && UI_VARIANT === value ? badge('Active', 'green') : icon('right')}</a>`).join('')}</div>`) +
      section('Full scenario experiment', `<p>Start from defect reporting, with hints off and fresh progress on every reload.</p><div class="study-preview-links">${versions.map(([value, title]) => `<a class="button secondary" href="${esc(variantURL(value, 'scenario'))}">${title}${icon('arrow')}</a>`).join('')}</div>`) +
      section('Focused approval experiment', `<p>Start at the pending quotation, with hints off and fresh progress on each reload.</p><div class="study-preview-links">${versions.map(([value, title]) => `<a class="button secondary" href="${esc(variantURL(value, 'quotation'))}">${title}${icon('arrow')}</a>`).join('')}</div>`) +
      section('Walkthrough settings', STUDY_CONTEXT ? `<p>Experiment sessions keep hints off. Open the saved demo to configure hints for practice or filming.</p><div class="action-stack"><a class="button secondary" href="${esc(fullScenarioURL('prototype-setup'))}">Open saved demo settings${icon('arrow')}</a></div>` : isWalkthrough() ? `<div class="card"><label class="setting-toggle" for="walkthrough-guidance"><span><strong>Show walkthrough hints</strong><small>Suggested steps and a prefilled first report for practice or filming.</small></span><input id="walkthrough-guidance" type="checkbox" ${showWalkthroughHints() ? 'checked' : ''}></label></div><p class="help">For a new user-test session, turn hints off and reset the demo. Reset keeps this setting.</p><div class="action-stack">${link('View walkthrough steps', 'walkthrough', 'quiet')}${link('Restart full walkthrough', 'restart-scenario')}</div>` : `<p>Open Scenario walkthrough in Project tools to configure hints.</p>${link('Open project tools', 'more', 'quiet')}`) +
      `<div class="demo-reset">${link(demoResetLabel(), 'reset', 'danger')}</div><p class="demo-note">Scenario date: 18 Jun 2026. Designer responses and project updates are simulated. Experiment responses are not collected.</p>`;
  }

  function missing(title, target = 'overview', explanation = 'Open the connected record or return to your project overview.') {
    return heading(title, 'Project record') + `<div class="empty-state">${icon('info')}<p>${esc(explanation)}</p>${link('Back', target)}</div>`;
  }

  function screenHTML() {
    const [name, value] = route.split('/');
    if (!proposalReady() && (['change', 'approve', 'revision', 'material'].includes(name) || (name === 'document' && value === 'quotation') || (name === 'preview' && value === 'bathroom'))) return missing('Report the defect first', 'report/room/bathroom', 'The walkthrough starts with the cracked bathroom tiles. A sample replacement proposal becomes available after you save the report.');
    switch (name) {
      case 'overview': return overview();
      case 'more': return moreScreen();
      case 'profile': return profileScreen();
      case 'prototype-setup': return prototypeSetupScreen();
      case 'walkthrough': return walkthroughScreen();
      case 'rooms': return roomsScreen();
      case 'preview': return previewScreen(value);
      case 'room': return roomScreen(value);
      case 'defects': return defectsScreen();
      case 'defect': return defectScreen(value);
      case 'changes': return changesScreen();
      case 'change': return ['change/VO-015', 'change/VO-015/impact'].includes(route) ? changeScreen() : missing('Change not found', 'changes');
      case 'material': return materialScreen(value);
      case 'approve': return value === 'VO-015' ? approvalScreen() : missing('Change not found', 'changes');
      case 'approval-receipt': return approvalReceipt(value);
      case 'withdraw-approval': return withdrawApprovalScreen();
      case 'budget': return budgetScreen();
      case 'report': return reportScreen();
      case 'report-saved': return reportReceipt(value);
      case 'request': return requestScreen(value);
      case 'request-receipt': return requestReceipt(value);
      case 'withdraw-report': return withdrawReportScreen(value);
      case 'inspect': return inspectionScreen(value);
      case 'verify-confirm': return verificationScreen(value);
      case 'followup': return textFormScreen('followup', value);
      case 'revision': return textFormScreen('revision');
      case 'documents': return documentsScreen();
      case 'document': return documentScreen(value);
      case 'timeline': return timelineScreen();
      case 'updates': return heading('Project updates') + (state.activity.length ? `<div class="card">${activityList(state.activity)}</div>` : `<div class="empty-state"><h2>No updates yet</h2><p>Project activity appears here as you work through the demo.</p></div>`);
      case 'helper': return helperScreen(value);
      case 'contact': return contactScreen();
      case 'project': return projectScreen();
      case 'reset': return heading(QUOTATION_STUDY ? 'Reset approval demo?' : 'Reset this demo?', demoName(), QUOTATION_STUDY ? 'The quotation returns to pending with no tile chosen. The remaining budget returns to S$30,000. Your full walkthrough is kept.' : STUDY_CONTEXT ? 'Restart this test session from reporting the cracked tiles. Saved demos are kept.' : 'This mode’s reports, decisions and walkthrough progress will return to their starting point. Progress in the other mode is kept.') + `<div class="action-stack">${action(QUOTATION_STUDY ? 'Reset approval demo' : 'Confirm demo reset', 'reset-confirm', 'danger')}${link('Keep my changes', 'more')}</div>`;
      case 'restart-scenario': return heading('Restart full walkthrough?', 'Bathroom tile replacement', 'Start again from reporting the cracked tiles. This version’s walkthrough reports, tile choice and approval will reset. Explore project is kept.') + `<div class="action-stack">${STUDY_CONTEXT ? `<a class="button danger" href="${esc(fullScenarioURL('restart-scenario'))}">Open full walkthrough${icon('arrow')}</a>` : action('Restart walkthrough', 'restart-scenario-confirm', 'danger')}${link('Keep my progress', 'walkthrough')}</div>`;
      default: return missing('Screen not found');
    }
  }

  function render({ focus = false, restore = false } = {}) {
    updateChrome();
    content.innerHTML = screenHTML();
    document.querySelector('.mobile-app').classList.toggle('home-screen', route === 'overview');
    const variation = isReviewRoute(route) && proposalReady() && (state.proposal.status !== 'approved' || route.startsWith('change/'));
    document.querySelector('.mobile-app').classList.toggle('variation-mode', variation);
    const variationBar = document.getElementById('variation-actions');
    variationBar.hidden = !variation;
    variationBar.innerHTML = variation ? variationActions() : '';
    document.querySelector('.mobile-app').classList.toggle('request-confirmation-mode', Boolean(content.querySelector('.request-confirmation')));
    document.querySelector('.mobile-app').classList.toggle('preview-mode', Boolean(content.querySelector('.ar-preview')));
    document.querySelector('.mobile-app').classList.toggle('focused-mode', ['report', 'report-saved', 'request', 'revision', 'followup', 'inspect', 'verify-confirm', 'approve', 'withdraw-report', 'withdraw-approval'].includes(route.split('/')[0]));
    document.querySelector('.header-home').hidden = primaryRoutes.includes(route);
    const title = document.getElementById('screen-title');
    document.getElementById('header-context').textContent = headerTitle();
    document.title = 'RenoGuard · Mobile';
    if (focus) title?.focus({ preventScroll: true });
    if (restore) screenScroller().scrollTo({ top: scrollPositions.get(route) || 0, behavior: 'instant' });
  }

  function handleAction(button) {
    const id = button.dataset.id;
    state = Store.getState();
    try {
      switch (button.dataset.action) {
        case 'switch-demo':
          if (button.dataset.mode !== state.demoMode) { mutate(() => Store.switchDemo(button.dataset.mode)); clearTransientState(); }
          navigate('overview', true); announce(`${demoName()} opened. Saved progress is kept separately.`); break;
        case 'open-room': openRoom(button.dataset.room); break;
        case 'open-defect-photo': openDefectPhoto(id, Number(button.dataset.index), button.dataset.source); break;
        case 'request-confirm':
          if(findDefect(id)?.status!=='reported') { navigate(`defect/${id}`); break; }
          mutate(()=>Store.requestDefectChange(id)); navigate(`request-receipt/${id}`, true); announce('Quotation request saved locally. No spending approved.'); break;
        case 'close-room': document.getElementById('room-dialog').close(); break;
        case 'select-tile': updateTile(button.dataset.tile); break;
        case 'review-impact':
          if (selectedTile()) navigate('change/VO-015/impact');
          break;
        case 'review-approval':
          if (selectedTile() && reviewImpactSeen) navigate('approve/VO-015');
          break;
        case 'review-summary': {
          if (!selectedTile()) break;
          reviewAtConfirmation = true;
          document.getElementById('variation-actions').innerHTML = variationActions();
          document.getElementById('approval-summary').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
          document.getElementById('approval-summary-title').focus({ preventScroll: true });
          break;
        }
        case 'use-preview-tile':
          if (state.proposal.status !== 'pending') break;
          if (!state.proposal.selectionMade || state.proposal.tile !== (previewTile || state.proposal.tile)) { reviewImpactSeen = false; reviewAtConfirmation = false; }
          mutate(() => Store.selectTile(previewTile || state.proposal.tile)); approvalAcknowledged = false;
          navigate(reviewReturnTarget());
          break;
        case 'toggle-floor':
          showFloorGuide=!showFloorGuide; document.getElementById('floor-guide').classList.toggle('is-hidden',!showFloorGuide); button.setAttribute('aria-pressed',String(showFloorGuide)); break;
        case 'rotate-plan':
          mirrorPlan=!mirrorPlan; document.getElementById('room-scene').innerHTML=window.RenoGuardRooms.scene({defects:projectDefects(),mirror:mirrorPlan,tile:state.proposal.tile,only:route.startsWith('preview/')?route.split('/')[1]:''}); break;
        case 'back':
          if (isReviewRoute(route)) { navigate(guidedReview() && route === 'approve/VO-015' ? 'change/VO-015/impact' : guidedReview() && route === 'change/VO-015/impact' ? 'change/VO-015' : 'changes'); break; }
          if (reviewReturnRoute && ['preview/bathroom', 'document/quotation', 'budget'].includes(route)) { navigate(reviewReturnTarget()); break; }
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
        case 'clear-defect-filters':
          filters.room = ''; filters.search = '';
          document.getElementById('defect-room').value = '';
          document.getElementById('defect-search').value = '';
          refreshDefectResults(); document.getElementById('defect-room').focus();
          break;
        case 'approve-confirm':
          if (!state.proposal.selectionMade) { announce('Choose a replacement tile before approving.'); break; }
          if (guidedReview() && !reviewImpactSeen) { navigate('change/VO-015/impact'); announce('The proposal changed. Review the cost and timing before approving.'); break; }
          if(!decisionRoute() || !approvalAcknowledged || !document.getElementById('approval-acknowledgement')?.checked) { announce('Review the details and select the confirmation checkbox.'); break; }
          if(content.querySelector('[data-review-selection]')?.dataset.reviewSelection!==state.proposal.tile){ approvalAcknowledged=false; render(); announce('The selected tile changed. Review the details again.'); break; }
          if (state.proposal.status !== 'pending') { navigate('change/VO-015'); announce('This approval is already recorded.'); break; }
          mutate(() => Store.approveProposal()); filters.changes = 'approved';
          navigate(`approval-receipt/${state.proposal.tile}`); announce(`Change approved. Remaining allowance ${money(totals().available)}.`);
          break;
        case 'withdraw-approval-confirm':
          if (state.proposal.status !== 'approved' || findDefect('DEF-021')?.status !== 'scheduled') { navigate('change/VO-015'); announce('This approval is no longer eligible for withdrawal.'); break; }
          mutate(() => Store.withdrawApproval());
          if (state.proposal.status !== 'pending') { render(); announce('Approval cannot be withdrawn after the repair progresses.'); break; }
          filters.changes = 'pending'; navigate('change/VO-015'); announce('Approval withdrawn locally. Earlier decision retained.');
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
        case 'use-sample-photos':
        case 'remove-photo': {
          const draft = getReportDraft(); draft.token++; draft.loading = false; draft.photo = ''; draft.photoName = ''; draft.samplePhotos = button.dataset.action === 'use-sample-photos';
          document.getElementById('photo-preview').innerHTML = photoPreview(draft);
          const input = document.getElementById('report-photo'); input.value = ''; input.focus();
          const submit = document.querySelector('#report-form [type="submit"]'); submit.disabled = false; submit.textContent = route.includes('/edit/') ? 'Save report changes' : 'Save defect report';
          break;
        }
        case 'reset-confirm':
          mutate(() => Store.reset()); clearTransientState();
          navigate(QUOTATION_STUDY ? 'change/VO-015' : 'overview', true); announce(QUOTATION_STUDY ? 'Approval demo reset. Choose a tile to begin again.' : STUDY_CONTEXT ? 'Scenario demo reset. Begin with the bathroom defect report.' : `${demoName()} reset. The other demo was kept.`);
          break;
        case 'restart-scenario-confirm':
          if (STUDY_CONTEXT) break;
          mutate(() => Store.restartWalkthrough()); clearTransientState();
          navigate('walkthrough', true); announce('Full walkthrough restarted. Begin by reporting the cracked bathroom tiles. Explore project was kept.');
          break;
      }
    } catch (error) { announce(error.message); content.insertAdjacentHTML('afterbegin', notice(esc(error.message), true)); }
  }

  function clearTransientState() {
    reportDrafts.clear(); textDrafts.clear(); inspections.clear(); sessionPhotos.clear(); flashes.clear(); scrollPositions.clear();
    filters.status = 'open'; filters.room = ''; filters.search = ''; filters.changes = state.proposal.status === 'approved' ? 'approved' : 'pending';
    mirrorPlan = false; showFloorGuide = true; approvalAcknowledged = false; previewTile = null; reviewImpactSeen = false; reviewReturnRoute = null; reviewSpecsExpanded = false; reviewAtConfirmation = false;
    document.getElementById('room-dialog').close();
  }

  function init() {
    sizePhonePreview();
    window.addEventListener('resize', sizePhonePreview);
    content = document.getElementById('content');
    announcements = document.getElementById('announcements');
    if (!content || !announcements) return;
    history.scrollRestoration = 'manual';
    document.addEventListener('keydown',event=>{const room=event.target.closest?.('.model-room');if(room&&['Enter',' '].includes(event.key)){event.preventDefault();openRoom(room.dataset.room);}});
    const roomDialog=document.getElementById('room-dialog');
    roomDialog.addEventListener('click',event=>{if(event.target===roomDialog){const rect=roomDialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)roomDialog.close();}});
    const startup=document.getElementById('startup');
    const hero=new Image(); hero.src='assets/bathroom.webp';
    const ready=hero.decode().catch(()=>{});
    const dismissStartup=()=>{startup.classList.add('loaded');startup.setAttribute('aria-hidden','true');};
    Promise.all([document.fonts.ready,ready]).then(dismissStartup);
    window.setTimeout(dismissStartup,2500);
    route = STUDY_CONTEXT ? (QUOTATION_STUDY ? 'change/VO-015' : 'overview') : currentHash();
    if(state.proposal.status==='approved')filters.changes='approved';
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
      document.getElementById('room-dialog').close();
      navigate(target);
    });
    document.addEventListener('input', event => {
      if (event.target.id === 'defect-search') { filters.search = event.target.value; refreshDefectResults(); }
      if (event.target.closest?.('#report-form, #text-form')) saveScreen();
    });
    document.addEventListener('toggle', event => {
      if (event.target.matches?.('.review-specifications') && event.target.isConnected) reviewSpecsExpanded = event.target.open;
    }, true);
    document.addEventListener('change', event => {
      if (event.target.dataset.reviewTile) updateTile(event.target.dataset.reviewTile);
      if (event.target.id === 'walkthrough-guidance') {
        mutate(() => Store.setWalkthroughGuidance(event.target.checked)); render();
        document.getElementById('walkthrough-guidance').focus();
        announce(`Walkthrough hints ${showWalkthroughHints() ? 'on' : 'off'}. Reset the demo to start a fresh session.`);
      }
      if (event.target.id === 'defect-room') { filters.room = event.target.value; refreshDefectResults(); }
      if(event.target.id==='approval-acknowledgement') { approvalAcknowledged=event.target.checked; reviewAtConfirmation=true; document.getElementById('variation-actions').innerHTML=variationActions(); document.getElementById('approval-help').textContent=approvalAcknowledged?'Ready to record your decision.':'Select the checkbox to enable approval.'; }
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
      document.getElementById('room-dialog').close();
      saveScreen(); route = target; enterScreen(); render({ focus: true, restore: true });
    };
    window.addEventListener('popstate', historyChanged);
    window.addEventListener('hashchange', historyChanged);
    Store.subscribe((next, metadata) => {
      const modeChanged = next.demoMode !== state.demoMode;
      if(next.proposal.tile!==state.proposal.tile || next.proposal.status!==state.proposal.status || next.proposal.selectionMade!==state.proposal.selectionMade) { approvalAcknowledged=false; reviewImpactSeen=false; reviewAtConfirmation=false; }
      sessionPhotos.forEach((photo, id) => {
        const previous = state.defects.find(defect => defect.id === id);
        const updated = next.defects.find(defect => defect.id === id);
        if (!updated || updated.photoName !== previous?.photoName || updated.updatedAt !== previous?.updatedAt) sessionPhotos.delete(id);
      });
      state = next;
      updateChrome();
      if (mutating) return;
      if (modeChanged) { clearTransientState(); navigate('overview', true); announce(`${demoName()} opened in this tab.`); return; }
      saveScreen();
      if (!['report', 'revision', 'followup', 'inspect'].includes(route.split('/')[0])) render();
      if (metadata.source === 'storage') announce('Project records updated from the other interface.');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
