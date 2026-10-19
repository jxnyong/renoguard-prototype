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
  let mirrorPlan = false;
  let showFloorGuide = true;
  let approvalAcknowledged = false;
  const materials = { grigio: { name: 'Grigio Matte', label: 'Option A', tone: 'Cool grey', note: 'Closest match to your wall tiles' }, sabbia: { name: 'Sabbia Matte', label: 'Option B', tone: 'Warm sand', note: 'A warmer tone with subtle stone texture' } };
  const tileName = () => materials[state.proposal.tile].name;
  const handover = () => state.proposal.status === 'approved' ? '14 Jul' : '1 Jul';

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
    if (['room', 'preview', 'material'].includes(first)) return ['room','preview'].includes(first) ? 'rooms' : 'changes';
    if (['defect', 'report', 'request', 'request-receipt', 'withdraw-report', 'inspect', 'verify-confirm', 'followup'].includes(first)) return 'defects';
    if (['change', 'approve', 'approval-receipt', 'withdraw-approval', 'revision'].includes(first)) return 'changes';
    return 'overview';
  }

  function fallbackBack(path) {
    const first = path.split('/')[0];
    const id = path.split('/')[1];
    if (['inspect', 'verify-confirm', 'followup', 'withdraw-report'].includes(first)) return `defect/${id}`;
    if (['approve', 'approval-receipt', 'withdraw-approval', 'revision', 'material'].includes(first)) return 'change/VO-015';
    if (['request','request-receipt'].includes(first)) return `defect/${id}`;
    if (first === 'preview') return 'rooms';
    if (first === 'document') return 'documents';
    if (first === 'reset') return 'project';
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
    if (target === route) { scrollPositions.set(route, 0); render({ focus: true, restore: true }); return; }
    const depth = history.state?.renoMobile ? history.state.depth : 0;
    history[replace ? 'replaceState' : 'pushState']({ renoMobile: true, depth: replace ? depth : depth + 1 }, '', `#${target}`);
    route = target;
    enterScreen();
    render({ focus: true, restore: true });
  }

  function enterScreen() {
    state = Store.getState();
    if (!route.startsWith('approve/')) approvalAcknowledged=false;
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
    return `<article class="card proposal-card"><div class="proposal-main"><div class="card-top">${badge(state.proposal.revisionRequest ? 'Changes requested · Not approved' : 'Your approval needed', 'amber')}<span class="record-id">VO-015</span></div><div class="proposal-title"><img class="proposal-thumbnail" src="/assets/materials/${state.proposal.tile}.webp" alt="${tileName()} tile sample"><div><p class="eyebrow">Bathroom · Flooring</p><h3>New bathroom floor tiles</h3><p>Original tile out of stock. John has proposed two close matches.</p></div></div><div class="impact-inline"><div><small>Additional cost</small><strong>+${money(PROPOSAL_COST)}</strong></div><div><small>Proposed completion</small><strong class="date-impact">14 Jul <span>was 1 Jul</span></strong></div></div>${link('Review the two options', 'change/VO-015', 'primary')}</div><a class="card-link" href="#defect/DEF-021">${icon('defects')}Cracked bathroom tiles · DEF-021${icon('right')}</a></article>`;
  }

  function overview() {
    const metrics = totals();
    return heading('Hi Thomas', 'Thursday, 18 June', 'Punggol BTO · Your home, taking shape.') +
      (state.proposal.status === 'pending' ? proposalCard() : `<a class="approved-banner" href="#approval-receipt">${icon('check')}<span><strong>Bathroom tiles approved</strong><small>${tileName()} · +${money(PROPOSAL_COST)}</small></span>${icon('right')}</a>`) +
      `<section class="card home-progress"><div class="progress-top"><span class="progress-ring"><span>60%<small>complete</small></span></span><div><p class="eyebrow">Your renovation</p><h2>Tiling &amp; carpentry</h2><p>Stage 3 of 5 · Handover ${handover()}</p></div></div><div class="stage-bars" aria-label="Stage 3 of 5"><span class="done">Prep</span><span class="done">Electrical</span><span class="current">Tiling</span><span>Carpentry</span><span>Handover</span></div><div class="project-pair"><a href="#budget"><small>Remaining budget</small><strong>${money(metrics.available)}</strong></a><a href="#defects"><small>Open defects</small><strong>${metrics.openDefects}${icon('right')}</strong></a></div></section>
      <div class="section-heading"><h2>Step inside your home</h2><a class="text-link" href="#rooms">Explore${icon('arrow')}</a></div><div class="model-card home-model"><div class="model-caption"><span class="eyebrow">Interactive room overview</span>${badge('3D cutaway', 'green')}</div>${window.RenoGuardRooms.scene({ defects: state.defects, tile: state.proposal.tile })}<p class="model-hint">Tap a room to explore · <span class="attention-key">!</span> needs attention</p></div>
      <div class="quick-actions"><a href="#report">${icon('camera')}<span>Report defect</span></a><a href="#documents">${icon('file')}<span>Quotes &amp; variations</span></a></div><div class="section-heading"><h2>Recent updates</h2><a class="text-link" href="#updates">See all${icon('arrow')}</a></div><div class="card">${activityList(state.activity.slice(0, 2))}</div><p class="demo-note">Sample project · Saved on this device.</p>`;
  }

  function defectRow(defect) {
    const next = { approval: 'Review linked proposal', verification: 'Inspect before you verify', followup: 'Discuss remaining work', reported: 'Saved on this device', scheduled: 'Repair planned · see record', withdrawn: 'Restore if needed', verified: 'Reopen if the issue returns' }[defect.status];
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
    return heading('Your home, in view', 'Punggol · 4-room BTO', 'Explore each room and see what needs your attention.') + `<div class="model-card"><div class="model-caption"><span class="eyebrow">Room overview</span>${action('Flip view', 'rotate-plan', 'quiet compact')}</div><div id="room-scene">${window.RenoGuardRooms.scene({ defects: state.defects, mirror: mirrorPlan, tile: state.proposal.tile })}</div><p class="model-hint">Tap or hover over a room to highlight it.</p><div class="model-legend"><span><i></i> Room</span><span><b>!</b> Open issue</span></div></div><p class="help">Illustrative cutaway and room areas; not a measured survey of your home.</p><div class="section-heading"><h2>Rooms &amp; records</h2></div><div class="room-list">${ROOMS.map(room => { const issues=openDefects().filter(d=>d.room===room); return `<button class="room-list-item" data-action="open-room" data-room="${roomSlug(room)}"><span class="icon-tile">${icon(room==='Bathroom'?'camera':'rooms')}</span><span><strong>${esc(room)}</strong><small>${issues.length?`${issues.length} open ${issues.length===1?'issue':'issues'}`:'No open issues'}</small></span>${issues.length?'<b class="attention-key">!</b>':icon('right')}</button>`; }).join('')}</div>`;
  }

  function openRoom(slug) {
    const room = roomFromSlug(slug);
    if (!room) return;
    const dialog = document.getElementById('room-dialog');
    const records = openDefects().filter(d => d.room === room);
    const metadata = window.RenoGuardRooms.rooms.find(r => r.name === room);
    document.getElementById('room-dialog-content').innerHTML = `<div class="sheet-handle" aria-hidden="true"></div><div class="heading-row"><p class="eyebrow">Room overview · ${metadata.area}</p>${action('Close', 'close-room', 'quiet compact')}</div><h2 id="room-dialog-title">${esc(room)}</h2><p class="intro">${records.length ? `${records.length} open ${records.length===1?'issue':'issues'} in this room` : 'No open issues in this room'}</p>${room==='Bathroom'?`<a class="room-change-summary" href="#change/VO-015">${icon('changes')}<span><strong>Bathroom floor tile replacement</strong><small>${state.proposal.status==='approved'?'Approved · '+tileName():'Approval needed · two tile options'} · +S$250</small></span>${icon('right')}</a>`:''}${records.map(d=>`<a class="sheet-record" href="#defect/${d.id}">${statusBadge(d.status)}<strong>${esc(d.title)}</strong>${icon('right')}</a>`).join('')}<div class="action-stack">${link(room==='Bathroom'?'Open AR room preview':'Enter 3D room view',`preview/${slug}`,'primary')}${link('Room details & records',`room/${slug}`)}</div>`;
    dialog.showModal();
  }

  function previewScreen(slug) {
    const room = roomFromSlug(slug);
    if (!room) return missing('Room not found', 'rooms');
    if(room !== 'Bathroom') return heading(room, '3D room view', 'A closer look at the room layout and finishes.') + `<div class="model-card room-closeup"><div id="room-scene">${window.RenoGuardRooms.scene({only:slug,mirror:mirrorPlan})}</div>${action('Flip room view','rotate-plan','secondary')}</div>` + notice('Illustrative 3D cutaway. Furniture, finishes and dimensions are design references.') + `<div class="action-stack">${link('View room records',`room/${slug}`,'primary')}${link('Back to home overview','rooms')}</div>`;
    const material=materials[state.proposal.tile];
    return `<div class="ar-preview"><div class="ar-scene ${state.proposal.tile==='sabbia'?'warm-floor':''}" id="ar-scene" role="region" aria-label="Bathroom preview with ${material.name} floor tiles"><img class="bathroom-photo" src="/assets/bathroom.webp" alt="Realistic bathroom with a floating toilet, walnut cabinet and stone floor"><img class="floor-overlay colour" src="/assets/materials/sabbia-colour.svg" alt=""><img class="floor-overlay warmth" src="/assets/materials/sabbia-warmth.svg" alt=""><div class="ar-scene-top"><span class="ar-tag">${icon('camera')} Bathroom preview</span><span class="ar-demo">Simulated AR</span></div><div class="floor-area ${showFloorGuide?'':'is-hidden'}" id="floor-guide"><svg viewBox="0 0 390 540" preserveAspectRatio="none"><path d="M0 362 80 346 214 330 308 334 390 312"/><circle cx="80" cy="346" r="4"/><circle cx="214" cy="330" r="4"/><circle cx="308" cy="334" r="4"/></svg><span>Floor area · 4.5 m²</span></div><button class="floor-guide-button" data-action="toggle-floor" aria-pressed="${showFloorGuide}" aria-label="Show floor boundary">${icon('rooms')}</button><span class="preview-sample-label">Illustrative view · not a live camera</span></div><div class="ar-controls"><p class="eyebrow">Preview the floor finish</p><div class="tile-options" aria-label="Bathroom floor tile options">${Object.entries(materials).map(([key,m])=>`<button data-action="select-tile" data-tile="${key}" aria-pressed="${state.proposal.tile===key}" ${state.proposal.status==='approved'?'disabled':''}><img src="/assets/materials/${key}.webp" alt=""><span><small>${m.label}</small><strong>${m.name}</strong></span><i>${state.proposal.tile===key?'✓':''}</i></button>`).join('')}</div><div id="material-summary" aria-live="polite"><h1 id="screen-title" tabindex="-1">${material.name}</h1><p>600 × 600 mm · Matte porcelain</p><span class="material-note">${icon('sparkles')}${material.note}</span></div><div class="ar-specs"><div><small>Extra cost</small><strong>+S$250</strong></div><div><small>Ready by</small><strong>14 Jul</strong></div><div><small>Finish</small><strong>Matte</strong></div></div>${state.proposal.status==='approved'?notice('This is your approved tile. Withdraw the approval first to select a different option.'):''}${link(state.proposal.status==='approved'?'View approved change':'Use this tile · review change','change/VO-015','primary')}<p class="help">Colour and lighting are illustrative. Confirm a physical sample with your designer.</p></div></div>`;
  }

  function updateTile(tile) {
    if(state.proposal.status==='approved') return;
    mutate(()=>Store.selectTile(tile)); approvalAcknowledged=false;
    if(route.startsWith('preview/')) {
      const material=materials[tile];
      const scene=document.getElementById('ar-scene');
      scene.classList.toggle('warm-floor',tile==='sabbia');
      scene.setAttribute('aria-label',`Bathroom preview with ${material.name} floor tiles`);
      document.querySelectorAll('[data-action="select-tile"]').forEach(button=>{const selected=button.dataset.tile===tile; button.setAttribute('aria-pressed',String(selected));button.querySelector('i').textContent=selected?'✓':'';});
      document.getElementById('material-summary').innerHTML=`<h1 id="screen-title" tabindex="-1">${material.name}</h1><p>600 × 600 mm · Matte porcelain</p><span class="material-note">${icon('sparkles')}${material.note}</span>`;
    } else render();
    document.getElementById('header-context').textContent=route.startsWith('preview/bathroom')?'AR Room Preview':document.getElementById('screen-title')?.textContent;
    document.title=`${document.getElementById('screen-title')?.textContent || 'Project'} · RenoGuard Mobile`;
    announce(`${tileName()} selected. Additional cost S$250. Not approved yet.`);
  }

  function roomScreen(slug) {
    const room = roomFromSlug(slug);
    if (!room) return missing('Room not found', 'rooms');
    const records=state.defects.filter(d=>d.room===room);
    return heading(room,'Room records','Finishes, changes and repairs, kept together.') + `<a class="room-preview-link" href="#preview/${slug}">${room==='Bathroom'?'<img src="/assets/bathroom.webp" alt="Bathroom design preview">':window.RenoGuardRooms.scene({only:slug})}<span>${icon('camera')}${room==='Bathroom'?'Explore tile options':'Enter 3D room view'}${icon('arrow')}</span></a>` + section('Defect records',`<div class="stack">${records.map(defectRow).join('')||'<div class="empty-state"><h3>No records yet</h3><p>Found an issue? Add a report below.</p></div>'}</div>`) + `<div class="action-stack">${link('Report an issue in this room',`report/room/${slug}`,'primary')}${link('All rooms','rooms')}</div>`;
  }

  function changesScreen() {
    const pending = state.proposal.status === 'pending';
    const matching = filters.changes === (pending ? 'pending' : 'approved');
    return heading('Approvals', 'Review before work proceeds', 'Know what will change, what it costs, and what you have agreed to.') +
      `<div class="segmented" aria-label="Change request status">${['pending', 'approved'].map(value => `<button type="button" data-action="filter-changes" data-status="${value}" aria-pressed="${filters.changes === value}">${value === 'pending' ? 'Awaiting approval' : 'Approved'}</button>`).join('')}</div>` +
      (matching ? pending ? proposalCard() : `<a class="record-row" href="#change/VO-015"><div>${badge('Approved', 'green')}<h3>Bathroom tile replacement</h3><p>${tileName()} · +${money(PROPOSAL_COST)}</p><div class="record-meta">VO-015 · ${esc(state.proposal.approvedAt)}</div></div>${icon('right')}</a>` : `<div class="empty-state">${icon('changes')}<h2>${pending ? 'No approved changes yet' : 'No decisions waiting'}</h2><p>${pending ? 'Approved changes will appear here with their cost and decision record.' : 'Your tile replacement approval is recorded under Approved.'}</p>${action(pending ? 'View pending proposal' : 'View approved change', 'switch-change-filter')}</div>`);
  }

  function materialCard(key) {
    const m=materials[key];const selected=state.proposal.tile===key;
    return `<button class="material-choice ${selected?'selected':''}" data-action="select-tile" data-tile="${key}" aria-pressed="${selected}" ${state.proposal.status==='approved'?'disabled':''}><img src="/assets/materials/${key}.webp" alt="${m.tone} tile sample"><span><small>${m.label}</small><strong>${m.name}</strong><small>${m.tone} · +S$250</small></span><i>${selected?'✓':''}</i></button>`;
  }

  function changeScreen() {
    const approved=state.proposal.status==='approved';
    return heading('New bathroom floor tiles','Variation order · VO-015','Proposed by John Tan · 18 Jun 2026') + badge(approved?'Approved':'Pending your approval',approved?'green':'amber') + `<a class="linked-row" href="#defect/DEF-021">${icon('defects')}Linked to cracked tiles · DEF-021${icon('right')}</a>` + notice('Your original Bianco Matte tile is out of stock until September 2026. John has proposed two close matches.',true) +
      section('Original vs proposed',`<div class="comparison-table-wrap"><table class="comparison-table"><thead><tr><th scope="col">Specification</th><th scope="col"><img src="/assets/materials/bianco.webp" alt="Bianco tile">Original</th><th scope="col"><img src="/assets/materials/grigio.webp" alt="Grigio tile">Option A</th><th scope="col"><img src="/assets/materials/sabbia.webp" alt="Sabbia tile">Option B</th></tr></thead><tbody><tr><th scope="row">Tile</th><td>Bianco Matte</td><td>Grigio Matte</td><td>Sabbia Matte</td></tr><tr><th scope="row">Size (mm)</th><td>600 × 600</td><td>600 × 600</td><td>600 × 600</td></tr><tr><th scope="row">Stock*</th><td class="stock-alert">Out of stock</td><td>Available</td><td>Available</td></tr><tr><th scope="row">Extra cost</th><td>—</td><td>+S$250</td><td>+S$250</td></tr><tr><th scope="row">Completion</th><td>1 Jul</td><td>14 Jul</td><td>14 Jul</td></tr></tbody></table></div><p class="help">*Availability from the sample quote dated 18 Jun; subject to supplier confirmation.</p>`) +
      `<div class="change-impact"><div><small>Additional cost</small><strong>+S$250</strong><span>Same for both options</span></div><div><small>Completion change</small><strong>1 → 14 Jul</strong><span>About two weeks later</span></div></div>` +
      section(approved?'Your approved tile':'Choose a replacement',`<div class="material-choices">${materialCard('grigio')}${materialCard('sabbia')}</div>`) +
      section('Check before deciding',`<div class="stack">${documentLink('AR room preview','See both floor finishes in the bathroom','preview/bathroom')}${documentLink('Read the quotation','Breakdown of the additional S$250','document/quotation')}${documentLink('Check my budget',`${money(totals().available)} left${approved?'':` · ${money(totals().available-PROPOSAL_COST)} after approval`}`,'budget')}</div>`) +
      (state.proposal.revisionRequest?section('Your saved revision request',`<div class="card"><p>${esc(state.proposal.revisionRequest.text)}</p><p class="help">Saved locally. No additional cost approved.</p></div>`):'') +
      (state.proposal.lastApprovedAt?notice(`Previous approval withdrawn on ${esc(state.proposal.withdrawnAt)}. The decision history is retained.`):'') +
      `<div class="action-stack">${approved?link('View approval receipt','approval-receipt','primary')+link('Withdraw this approval','withdraw-approval','danger'):link('Review & approve','approve/VO-015','primary')+link('Request changes','revision')}</div>` + localNote();
  }

  function materialScreen() { return previewScreen('bathroom'); }

  function approvalScreen() {
    if(state.proposal.status==='approved') return approvalReceipt();
    return heading('Review & approve','Final confirmation · VO-015','Confirm your chosen tile, additional cost and revised completion date.') + section('1 · Your chosen tile',`<div class="material-choices">${materialCard('grigio')}${materialCard('sabbia')}</div>`) + section('2 · Check the details',`<div class="card"><dl class="details">${row('Tile',tileName())}${row('Additional cost','<strong>+S$250</strong>')}${row('Remaining budget',`${money(totals().available)} → <strong>${money(totals().available-PROPOSAL_COST)}</strong>`)}${row('Completion','1 Jul → 14 Jul 2026')}${row('Payment milestone','S$250 due 14 Jul 2026')}</dl></div>`) + `<label class="approval-check"><input type="checkbox" id="approval-acknowledgement" ${approvalAcknowledged?'checked':''}><span>I have reviewed the tile, S$250 additional cost and revised completion date.</span></label><p class="help" id="approval-help">${approvalAcknowledged?'Ready to record your decision.':'Select the checkbox to enable approval.'}</p><div class="action-stack">${action('Approve change · S$250','approve-confirm','primary',approvalAcknowledged?'':'disabled')}${link('Back to variation order','change/VO-015')}</div>` + notice('Approval updates this local prototype. It does not apply a legal signature, send a message or take payment. You can withdraw while the repair is still scheduled.');
  }

  function approvalReceipt() {
    if(state.proposal.status!=='approved')return missing('Approval is not recorded','change/VO-015');
    return `<div class="success-icon">${icon('check')}</div>`+heading('A clear decision. A step forward.','Change approved · VO-015',`${tileName()} has been recorded as your chosen bathroom tile.`)+`<div class="card"><dl class="details">${row('Approved by','Thomas Eng')}${row('Recorded',esc(state.proposal.approvedAt))}${row('Additional cost','S$250')}${row('Remaining budget',`<strong>${money(totals().available)}</strong>`)}${row('New completion','14 Jul 2026')}${row('New payment milestone','New bathroom tiles · S$250 · 14 Jul')}</dl></div><div class="action-stack">${link('View updated budget','budget','primary')}${link('View payment timeline','timeline')}${link('Back to home','overview','quiet')}</div>`+localNote();
  }

  function withdrawApprovalScreen() {
    if (state.proposal.status !== 'approved' || findDefect('DEF-021').status !== 'scheduled') return missing('Approval cannot be withdrawn', 'change/VO-015', 'You can withdraw only an approved change whose repair has not progressed beyond scheduled.');
    return heading('Withdraw this approval?', 'Correct a local decision', 'The proposal will return to awaiting approval. The earlier approval remains in the record.') + `<div class="card"><dl class="details">${row('Allowance now', money(totals().available))}${row('Allowance after withdrawal', `<span class="emphasis">${money(totals().available + PROPOSAL_COST)}</span>`)}${row('Cost removed from commitments', money(PROPOSAL_COST))}</dl></div>` + notice('The linked repair will wait for a new decision. No payment or refund occurs; this changes your local demo record.', true) + `<div class="action-stack">${action('Confirm approval withdrawal', 'withdraw-approval-confirm', 'danger')}${link('Keep approval', 'change/VO-015')}</div>`;
  }

  function budgetScreen() {
    const metrics=totals(),approved=state.proposal.status==='approved';
    return heading('Your project budget','Live cost tracker','A clear view of what’s committed and what’s left.')+`<div class="money-card"><span class="money-label">Remaining budget${icon('budget')}</span><span class="money-value">${money(metrics.available)}</span><div class="budget-bar"><span style="width:${metrics.approved/PROJECT_BUDGET*100}%"></span></div><div class="money-footer"><small>${money(metrics.approved)} approved</small><small>${money(PROJECT_BUDGET)} total</small></div></div>`+
      (approved?`<a class="approved-banner" href="#approval-receipt">${icon('check')}<span><strong>New bathroom tiles approved</strong><small>${tileName()} · VO-015 · −S$250</small></span>${icon('right')}</a>`:`<section class="card budget-impact"><div class="heading-row"><h3>If you approve VO-015</h3>${badge('Within budget','green')}</div><div class="budget-before-after"><span><small>Now</small><strong>${money(metrics.available)}</strong></span>${icon('arrow')}<span><small>After</small><strong>${money(metrics.available-PROPOSAL_COST)}</strong></span></div><p>Uses less than 1% of your remaining budget.</p>${link('Review proposed change','change/VO-015','quiet')}</section>`)+
      section('Approved so far, by trade',`<div class="trade-list">${[['Carpentry',7200],['Tiling',3600+(approved?250:0)],['Electrical',3100],['Others',1100]].map(([name,amount])=>`<div><div class="heading-row"><strong>${name}</strong><span>${money(amount)}${name==='Tiling'&&!approved?'<small class="pending-cost"> +250 pending</small>':''}</span></div><div class="trade-bar"><span style="width:${amount/15000*100}%"></span></div></div>`).join('')}</div>`)+`<div class="action-stack">${link('Payment timeline','timeline','primary')}${link('Variations & quotes','documents')}</div><p class="demo-note">Approved costs are commitments, not payments. Pending changes are excluded until you approve.</p>`;
  }

  function defectScreen(id) {
    const defect = findDefect(id);
    if (!defect) return missing('Defect record not found', 'defects');
    const flash = flashes.get(`defect/${id}`);
    let next = '';
    if (defect.status === 'approval') next = notice('<strong>Your next step</strong>Review the replacement tile quotation before this repair can proceed.', true) + link('Review tile replacement', 'change/VO-015', 'primary');
    if (defect.status === 'verification') next = notice('<strong>Inspect before you verify</strong>Check the cabinet alignment and operation at your home. Record a follow-up if the issue remains.') + `<div class="action-stack">${link('Inspect the repair', `inspect/${id}`, 'primary')}${link('Issue still needs work', `followup/${id}`)}</div>`;
    if (defect.status === 'verified') next = notice('<strong>Repair verified</strong>Your record can be reopened if you find a remaining problem.') + `<div class="action-stack">${link('Reopen for follow-up', `followup/${id}`)}</div>`;
    if (defect.status === 'scheduled') next = notice(`<strong>Repair planned · see record</strong>${id === 'DEF-021' ? 'The replacement tile change is approved. Completion is planned for 14 Jul 2026.' : 'The paint touch-up is scheduled for 26 Jun.'} Verify the result once it is ready for inspection.`);
    if (defect.status === 'followup') next = notice('<strong>Follow-up recorded</strong>The issue remains open. Discuss the remaining work with John using your usual contact channel.', true) + `<div class="action-stack">${link('View project contact', 'contact')}${id === 'DEF-003' ? action('Return to ready for inspection', 'restore-inspection', 'secondary', `data-id="${id}"`) : ''}</div>`;
    if (defect.status === 'reported') next = notice('<strong>Report saved locally</strong>No report has been sent. Contact John separately to report a real issue.') + `<div class="action-stack">${defect.changeRequest ? link('View change request',`request-receipt/${id}`,'primary') : link('Request a change',`request/${id}`,'primary')}${link('Edit report', `report/edit/${id}`)}${link('Withdraw report', `withdraw-report/${id}`, 'danger')}${link('View project contact', 'contact', 'quiet')}</div>`;
    if (defect.status === 'withdrawn') next = notice('<strong>Report withdrawn</strong>The record is retained and excluded from open defects. You can restore it if needed.') + `<div class="action-stack">${action('Restore report', 'restore-report', 'primary', `data-id="${id}"`)}</div>`;
    return heading(defect.title, `${defect.id} · ${defect.room}`) + statusBadge(defect.status) + (flash ? notice(esc(flash)) : '') + section('Issue details', `<p>${esc(defect.description)}</p><dl class="details">${row('Room', esc(defect.room))}${row('Category', esc(defect.category))}${row('Reported', esc(defect.reported))}${row('Responsible person', 'John Tan · Northline Interiors')}</dl>`) +
      (sessionPhotos.has(id) ? `<img class="photo-preview" src="${sessionPhotos.get(id)}" alt="Your attached defect photograph">` : defect.photoName ? notice(`Photo filename: ${esc(defect.photoName)}.<br>The preview is unavailable after reload or in another interface. Photos are not uploaded or shared.`) : '') +
      (defect.followupNote ? section('Your follow-up note', `<div class="card"><p>${esc(defect.followupNote)}</p></div>`) : '') + next +
      (id === 'DEF-021' && state.proposal.status === 'approved' ? `<a class="linked-row" href="#change/VO-015">${icon('changes')}View approved VO-015${icon('right')}</a>` : '') + `<div class="action-stack">${link('All defect records', 'defects', 'quiet')}</div>` + localNote();
  }

  function requestScreen(id) {
    const defect=findDefect(id);
    if(!defect||defect.status!=='reported')return missing('Request unavailable',`defect/${id}`);
    if(defect.changeRequest)return requestReceipt(id);
    return heading('Request a change',`${id} · ${defect.room}`,'Your defect details are filled in. Check them before requesting a quotation.')+`<div class="card"><dl class="details">${row('Linked defect',esc(defect.id))}${row('Room',esc(defect.room))}${row('Type',esc(defect.category))}</dl><p>${esc(defect.description)}</p></div><a class="text-link" href="#report/edit/${id}">Edit the defect details${icon('arrow')}</a>`+notice('<strong>Request only. No cost approved.</strong>John will need to review the issue and prepare a quotation. You will review the cost, options and timing separately.',true)+`<div class="action-stack">${action('Save change request','request-confirm','primary',`data-id="${id}"`)}${link('Not now',`defect/${id}`)}</div>`+localNote();
  }

  function requestReceipt(id) {
    const defect=findDefect(id);
    if(!defect?.changeRequest)return missing('No change request saved',`defect/${id}`);
    return `<div class="success-icon">${icon('check')}</div>`+heading('Change request saved',`${id} · ${defect.changeRequest.room}`,'You have not approved any additional spending.')+`<ol class="request-steps"><li><strong>Defect recorded</strong><p>${esc(defect.changeRequest.description)}</p></li><li><strong>Change request saved locally</strong><p>Linked to ${id}. No message was sent.</p></li><li><strong>Quotation needed</strong><p>Your designer will propose options, costs and timing before you decide.</p></li><li><strong>You review and approve</strong><p>Only an explicit approval adds a variation to your budget.</p></li></ol><div class="action-stack">${link('Back to defect record',`defect/${id}`,'primary')}${link('View current approvals','changes')}</div>`+localNote();
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
    if (type === 'revision' && state.proposal.status !== 'pending') return missing('This change is already approved', 'change/VO-015');
    const defect = type === 'followup' ? findDefect(id) : null;
    if (type === 'followup' && (!defect || !['verification', 'verified'].includes(defect.status))) return missing('This repair cannot be reopened now', `defect/${id}`);
    const value = textDrafts.get(route) ?? (type === 'revision' ? state.proposal.revisionRequest?.text || '' : '');
    return heading(type === 'revision' ? 'Request a proposal change' : 'Record a repair follow-up', type === 'revision' ? 'VO-015 · Bathroom · DEF-021' : `${id} · ${defect.room}`, type === 'revision' ? 'Describe what you would like John to revise before you approve.' : 'Keep the issue open and note what still needs attention.') +
      notice(type === 'revision' ? `Ask about a closer colour match, a physical sample, or the additional ${money(PROPOSAL_COST)}. Saving this request does not approve spending.` : 'No message is sent. Discuss the remaining issue with John using your usual contact channel.') +
      `<form id="text-form" data-kind="${type}" data-id="${esc(id || '')}" novalidate><div class="form-summary" id="form-summary" role="alert" hidden></div><div class="field"><label for="text-description">${type === 'revision' ? 'What would you like changed? *' : 'What still needs work? (optional)'}</label><textarea id="text-description" name="description" maxlength="800" ${type === 'revision' ? 'required minlength="10"' : ''} aria-describedby="text-help description-error">${esc(value)}</textarea><p class="help" id="text-help">${type === 'revision' ? '10–800 characters.' : 'Maximum 800 characters.'}</p><p class="error" id="description-error"></p></div><div class="action-stack"><button class="button primary" type="submit">${type === 'revision' ? 'Save revision request' : 'Save follow-up'}</button>${link('Keep draft & go back', type === 'revision' ? 'change/VO-015' : `defect/${id}`, 'quiet')}</div></form>` + localNote();
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
    return heading('Variations & quotes','Your project documents','The agreed scope and each change, in one place.')+`<div class="stack">${documentLink('VO-015 · Bathroom floor tiles',`John Tan · 18 Jun · ${state.proposal.status==='approved'?'Approved':'Pending approval'}`,'document/quotation')}${documentLink('Main renovation quotation','2 Apr 2026 · Original scope','document/scope')}</div>`+notice('Readable sample documents for this prototype. No PDF upload or external document service is connected.');
  }

  function documentScreen(type) {
    if(!['quotation','scope'].includes(type))return missing('Document not found','documents');
    const quote=type==='quotation';
    return heading(quote?'Bathroom tile variation':'Main renovation quotation',quote?'Sample document · VO-015':'Sample original scope',quote?'Prepared by John Tan · 18 Jun 2026':'Agreed scope · 2 Apr 2026')+`<a class="linked-row" href="#defect/DEF-021">${icon('defects')}Bathroom cracked tiles · DEF-021${icon('right')}</a>`+section(quote?'Revised tile work':'Original bathroom flooring',`<p>${quote?'Remove the cracked tiles, prepare the 4.5 m² bathroom floor, supply the selected replacement finish and lay and grout the new tiles.':'Supply and install Bianco Matte porcelain floor tiles, 600 × 600 mm, matte finish, as part of the agreed bathroom renovation.'}</p>`)+
      (quote?`<div class="card quote-breakdown"><dl class="details">${row('Remove tiles & prepare floor','S$80')}${row('Replacement tile price difference','S$120')}${row('Laying & grouting','S$50')}${row('Total additional cost','<strong>S$250</strong>')}${row('Options','Grigio Matte or Sabbia Matte')}${row('Proposed completion','14 Jul 2026 · was 1 Jul')}${row('Payment due','14 Jul 2026 · after approval')}</dl></div>`:'')+section('In plain English',`<div class="stack"><div><h3>Variation order</h3><p>A written change to your original scope and quotation. Review the added cost before approving.</p></div><div><h3>Lead time</h3><p>The time needed to source replacement tiles and arrange the work. The proposed finish date is about two weeks later.</p></div></div>`)+`<div class="action-stack">${link('View linked variation order','change/VO-015','primary')}${link('Check my budget','budget')}${link('All documents','documents','quiet')}</div>`;
  }

  function timelineScreen() {
    const approved=state.proposal.status==='approved';
    const items=[['Deposit','Paid · 2 Apr','S$1,500',true],['Hacking & masonry','Paid · 29 May','S$2,300',true],['Electrical works','Paid · 15 Jun','S$3,100',true],['Carpentry installation','Next · due 26 Jun','S$7,200',false]];
    if(approved)items.push(['New bathroom tiles','VO-015 · due 14 Jul 2026','S$250',false]);
    items.push(['Handover & final payment',approved?'14 Jul 2026 · was 1 Jul':'1 Jul 2026','S$900',false]);
    return heading('Payment timeline','Project milestones','Planned payments alongside your renovation progress.')+`<div class="two-up timeline-stats"><div class="stat-card"><small>Paid milestones</small><strong>3 of ${items.length}</strong></div><div class="stat-card"><small>Target handover</small><strong>${handover()}</strong></div></div><ol class="payment-timeline">${items.map(([title,date,amount,paid])=>`<li class="${title==='New bathroom tiles'?'new-milestone':''}"><span class="timeline-node">${icon(paid?'check':title==='New bathroom tiles'?'plus':'clock')}</span><div><div class="heading-row"><h3>${title}</h3><strong>${amount}</strong></div><p>${date}</p>${title==='New bathroom tiles'?badge('New · approved change','green'):''}</div></li>`).join('')}</ol>`+notice('Base payment milestones total S$15,000. Approving the bathroom variation adds S$250. Paid and due amounts are tracked separately from your remaining budget; no payment is processed here.')+`<div class="action-stack">${link('View budget','budget','primary')}${!approved?link('Review pending tile change','change/VO-015'):''}</div>`;
  }

  function helperScreen(topic) {
    const metrics = totals();
    const answers = {
      change: `<p>The original tile is unavailable until <strong>September 2026</strong>. Choose between cool-grey Grigio Matte and warm-sand Sabbia Matte, both the same size and finish.</p><p>Additional cost: <strong>${money(PROPOSAL_COST)}</strong>. Proposed completion: 14 Jul 2026, about two weeks later than 1 Jul.</p>${link('Read source · VO-015', 'change/VO-015')}`,
      budget: `<p>Committed costs are <strong>${money(metrics.approved)}</strong>, leaving <strong>${money(metrics.available)}</strong> of the ${money(PROJECT_BUDGET)} budget.</p><p>${state.proposal.status === 'approved' ? 'The approved tile change is included.' : `The pending ${money(PROPOSAL_COST)} change is excluded. Approval would leave ${money(metrics.available - PROPOSAL_COST)}.`}</p>${link('Read source · Budget', 'budget')}`,
      next: `<p>${metrics.actions ? `${metrics.actions} ${metrics.actions === 1 ? 'action needs' : 'actions need'} your attention.` : 'No homeowner decisions are currently waiting.'}</p><p>Review pending changes, inspect repairs marked ready, and discuss issues marked for follow-up.</p>${link('Read source · Defect records', 'defects')}`
    };
    return heading('A little clarity', 'Project helper · scripted demo', 'Quick explanations from the sample records, with links to their source.') + (answers[topic] ? `<div class="card stack" aria-live="polite">${answers[topic]}</div>` : '') + `<div class="action-stack">${link('What is changing?', 'helper/change')}${link('How much budget is left?', 'helper/budget')}${link('What needs my attention?', 'helper/next')}</div><p class="demo-note">Answers are prewritten for this prototype. No live AI or document analysis is connected.</p>`;
  }

  function contactScreen() {
    return heading('Your project contact', 'Fictional demo contact') + `<div class="card contact-card"><span class="avatar">JT</span><div><h2>John Tan</h2><small>Northline Interiors · Project lead</small></div></div>` + section('Before you contact John', `<p>Include the record number, room, and your question. For the tile replacement, refer to VO-015 / DEF-021 · Bathroom.</p>`) + notice('No real phone, email, or messaging service is connected. Use your actual contractor’s usual contact channel.') + `<div class="action-stack">${link('View related proposal', 'change/VO-015')}${link('View defect records', 'defects')}</div>`;
  }

  function projectScreen() {
    return heading('Your renovation', 'Homeowner demo') + `<div class="card"><dl class="details">${row('Homeowner', 'Thomas Eng')}${row('Home', 'Punggol · 4-room BTO')}${row('Project lead', 'John Tan · Northline Interiors')}${row('Demo reference date', '18 Jun 2026')}${row('Target handover', handover()+' 2026')}${row('Storage', Store.storageAvailable ? 'This browser on this device' : 'Session only')}</dl></div>` + notice('No real sign-in is needed. Desktop and mobile share local records when opened from the same web address in this browser. There is no account sync across devices.') + section('Start the demo again', `<p>Restore the original sample project. Your local reports and decisions will be removed.</p><div class="action-stack">${link('Reset demo', 'reset', 'danger')}</div>`) + `<div class="action-stack"><a class="button secondary" href="/web/">Open web dashboard${icon('arrow')}</a>${link('View project contact', 'contact')}</div>`;
  }

  function missing(title, target = 'overview', explanation = 'Open the connected record or return to your project overview.') {
    return heading(title, 'Project record') + `<div class="empty-state">${icon('info')}<p>${esc(explanation)}</p>${link('Back to project records', target)}</div>`;
  }

  function screenHTML() {
    const [name, value] = route.split('/');
    switch (name) {
      case 'overview': return overview();
      case 'rooms': return roomsScreen();
      case 'preview': return previewScreen(value);
      case 'room': return roomScreen(value);
      case 'defects': return defectsScreen();
      case 'defect': return defectScreen(value);
      case 'changes': return changesScreen();
      case 'change': return value === 'VO-015' ? changeScreen() : missing('Change not found', 'changes');
      case 'material': return materialScreen(value);
      case 'approve': return value === 'VO-015' ? approvalScreen() : missing('Change not found', 'changes');
      case 'approval-receipt': return approvalReceipt();
      case 'withdraw-approval': return withdrawApprovalScreen();
      case 'budget': return budgetScreen();
      case 'report': return reportScreen();
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
    document.querySelector('.mobile-app').classList.toggle('preview-mode',route.startsWith('preview/bathroom'));
    document.querySelector('.header-home').hidden = primaryRoutes.includes(route);
    const title = document.getElementById('screen-title');
    document.getElementById('header-context').textContent = route.startsWith('preview/bathroom')?'AR Room Preview':title?.textContent || 'Your project';
    document.title = `${title?.textContent || 'Project'} · RenoGuard Mobile`;
    if (focus) title?.focus({ preventScroll: true });
    if (restore) screenScroller().scrollTo({ top: scrollPositions.get(route) || 0, behavior: 'instant' });
  }

  function handleAction(button) {
    const id = button.dataset.id;
    state = Store.getState();
    try {
      switch (button.dataset.action) {
        case 'open-room': openRoom(button.dataset.room); break;
        case 'request-confirm':
          if(findDefect(id)?.status!=='reported') { navigate(`defect/${id}`); break; }
          mutate(()=>Store.requestDefectChange(id)); navigate(`request-receipt/${id}`); announce('Change request saved locally. No spending approved.'); break;
        case 'close-room': document.getElementById('room-dialog').close(); break;
        case 'select-tile': updateTile(button.dataset.tile); break;
        case 'toggle-floor':
          showFloorGuide=!showFloorGuide; document.getElementById('floor-guide').classList.toggle('is-hidden',!showFloorGuide); button.setAttribute('aria-pressed',String(showFloorGuide)); break;
        case 'rotate-plan':
          mirrorPlan=!mirrorPlan; document.getElementById('room-scene').innerHTML=window.RenoGuardRooms.scene({defects:state.defects,mirror:mirrorPlan,tile:state.proposal.tile,only:route.startsWith('preview/')?route.split('/')[1]:''}); break;
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
          if(!route.startsWith('approve/') || !approvalAcknowledged || !document.getElementById('approval-acknowledgement')?.checked) { announce('Review the details and select the confirmation checkbox.'); break; }
          if(content.querySelector('.material-choice[aria-pressed="true"]')?.dataset.tile!==state.proposal.tile){ approvalAcknowledged=false; render(); announce('The selected tile changed. Review the details again.'); break; }
          if (state.proposal.status !== 'pending') { navigate('change/VO-015'); announce('This approval is already recorded.'); break; }
          mutate(() => Store.approveProposal()); filters.changes = 'approved';
          navigate('approval-receipt'); announce(`Change approved. Remaining allowance ${money(totals().available)}.`);
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
          mirrorPlan=false; showFloorGuide=true; approvalAcknowledged=false;
          scrollPositions.clear(); navigate('overview', true); announce('Demo reset. Original project records restored.');
          break;
      }
    } catch (error) { announce(error.message); content.insertAdjacentHTML('afterbegin', notice(esc(error.message), true)); }
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
    const hero=new Image(); hero.src='/assets/bathroom.webp';
    const ready=hero.decode().catch(()=>{});
    const dismissStartup=()=>{startup.classList.add('loaded');startup.setAttribute('aria-hidden','true');};
    Promise.all([document.fonts.ready,ready]).then(dismissStartup);
    window.setTimeout(dismissStartup,2500);
    route = currentHash();
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
    document.addEventListener('change', event => {
      if(event.target.id==='approval-acknowledgement') { approvalAcknowledged=event.target.checked; document.querySelector('[data-action="approve-confirm"]').disabled=!approvalAcknowledged; document.getElementById('approval-help').textContent=approvalAcknowledged?'Ready to record your decision.':'Select the checkbox to enable approval.'; }
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
      if(next.proposal.tile!==state.proposal.tile || next.proposal.status!==state.proposal.status) approvalAcknowledged=false;
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
