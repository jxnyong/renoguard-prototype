/* RenoGuard is a local, interactive prototype. No information is sent to a server. */
(() => {
  'use strict';

  const Store = window.RenoGuardStore;
  if (!Store) throw new Error('Load shared/project-store.js before app.js.');
  const { PROPOSAL_COST, PROJECT_BUDGET, ORIGINAL_COMMITMENT } = Store.constants;
  const money = Store.money;
  const tileName = () => state.proposal.tile === 'sabbia' ? 'Sabbia Matte' : 'Grigio Matte';
  const handover = () => state.proposal.status === 'approved' ? '14 Jul' : '1 Jul';
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const icon = name => `<svg aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
  const photos = new Map();
  let reportDraft = { room: '', category: '', description: '', photoName: '' };
  let editingReportId = null;
  let draftPhoto = '';
  let returnFocus = null;
  let currentPanel = '';
  let currentDefectId = '';
  let approvalInProgress = false;

  let state = Store.getState();
  let dialog;
  let modalKicker;
  let modalTitle;
  let modalContent;
  let liveRegion;

  function announce(message) {
    if (!liveRegion) return;
    liveRegion.textContent = '';
    requestAnimationFrame(() => { liveRegion.textContent = message; });
  }

  function metrics() {
    return Store.getMetrics(state);
  }

  function statusInfo(status) {
    return {
      approval: ['Awaiting your approval', 'amber'],
      verification: ['Ready to inspect', 'green'],
      scheduled: ['Repair scheduled', 'neutral'],
      verified: ['Verified', 'green'],
      reported: ['Reported · saved locally', 'neutral'],
      followup: ['Follow-up needed', 'amber'],
      withdrawn: ['Withdrawn · record retained', 'neutral']
    }[status] || ['In progress', 'neutral'];
  }

  function badge(label, tone = 'neutral') {
    return `<span class="status-badge ${tone}">${escapeHTML(label)}</span>`;
  }

  function button(label, action, type = 'secondary', extra = '') {
    return `<button type="button" class="button ${type}" data-action="${action}" ${extra}>${escapeHTML(label)}</button>`;
  }

  function openButton(label, panel, type = 'secondary', extra = '') {
    return `<button type="button" class="button ${type}" data-open="${panel}" ${extra}>${escapeHTML(label)} ${icon('arrow-right')}</button>`;
  }

  function row(label, value) {
    return `<div class="detail-row"><dt>${escapeHTML(label)}</dt><dd>${value}</dd></div>`;
  }

  function localNote() {
    return `<p class="form-note">${Store.storageAvailable ? 'Demo changes are saved on this device. Nothing is sent to the contractor.' : 'Browser storage is unavailable. Changes work for this session but may disappear when you reload.'}</p>`;
  }

  function updateDashboard() {
    const totals = metrics();
    const values = { handover: handover(), available: money(totals.available), approved: money(totals.approved), 'open-defects': totals.openDefects, 'action-count': totals.actions, 'pending-count': totals.pending };
    document.querySelectorAll('[data-value]').forEach(element => {
      if (Object.prototype.hasOwnProperty.call(values, element.dataset.value)) element.textContent = values[element.dataset.value];
    });
    const proposalApproved = state.proposal.status === 'approved';
    document.querySelectorAll('[data-proposal-status]').forEach(element => {
      element.textContent = proposalApproved ? 'Approved' : 'Approval needed';
      element.classList.toggle('green', proposalApproved);
      element.classList.toggle('amber', !proposalApproved);
    });
    document.querySelectorAll('[data-proposal-cta]').forEach(element => {
      element.textContent = proposalApproved ? 'View approved change' : 'Review proposed change';
    });
    document.querySelectorAll('[data-proposal-note]').forEach(element => {
      element.textContent = proposalApproved ? `Approved in this demo. Your remaining allowance is ${money(totals.available)}.` : state.proposal.revisionRequest ? 'Revision request saved locally. No cost has been approved.' : 'Original tile unavailable. A replacement is ready for your review.';
    });
    const repair = state.defects.find(defect => defect.id === 'DEF-003');
    document.querySelectorAll('[data-verification-status]').forEach(element => {
      const [label, tone] = statusInfo(repair.status);
      element.textContent = label;
      element.classList.remove('green', 'amber', 'neutral');
      element.classList.add(tone);
    });
    document.querySelectorAll('[data-verification-cta]').forEach(element => {
      element.textContent = repair.status === 'verified' ? 'View repair record' : repair.status === 'followup' ? 'View follow-up' : 'Inspect repair';
    });
    const verificationTitle = document.querySelector('#verification-card h3');
    const verificationDescription = document.querySelector('#verification-card > p:not(.card-eyebrow)');
    if (verificationTitle) verificationTitle.textContent = repair.status === 'verified' ? 'Cabinet repair verified' : repair.status === 'followup' ? 'Cabinet alignment needs follow-up' : 'Cabinet alignment completed';
    if (verificationDescription) verificationDescription.textContent = repair.status === 'verified' ? 'You verified the cabinet alignment in this demo. Reopen the record if the issue returns.' : repair.status === 'followup' ? 'You recorded that the cabinet alignment needs more work. The issue remains open for follow-up.' : 'Your cabinet doors have been realigned. Check the work before marking the defect as resolved.';
    document.querySelectorAll('[data-notification-dot]').forEach(element => { element.hidden = state.notificationsRead; });
    const proposalCard = document.getElementById('proposal-card');
    const verificationCard = document.getElementById('verification-card');
    if (proposalCard) proposalCard.hidden = proposalApproved;
    if (verificationCard) verificationCard.hidden = repair.status === 'verified';
    const attentionGrid = document.querySelector('.attention-grid');
    if (attentionGrid) attentionGrid.classList.toggle('single-card', proposalApproved || repair.status === 'verified');
    const emptyAttention = document.getElementById('attention-empty');
    if (emptyAttention) emptyAttention.hidden = totals.actions !== 0;
    const otherFollowups = state.defects.filter(defect => defect.status === 'followup' && defect.id !== 'DEF-003');
    const followupCard = document.getElementById('followup-card');
    if (followupCard) {
      followupCard.hidden = otherFollowups.length === 0;
      const note = followupCard.querySelector('p');
      if (note) note.textContent = `${otherFollowups.length} repair ${otherFollowups.length === 1 ? 'record needs' : 'records need'} another check. Review the details and contact John about the remaining issue.`;
    }
    const activityList = document.getElementById('activity-list');
    if (activityList) activityList.innerHTML = activityHTML(state.activity.slice(0, 3));
  }

  function activityHTML(items, tag = 'div') {
    return items.map(item => `<${tag} class="activity-item"><span class="activity-marker">${icon(['file', 'check', 'clock', 'defect', 'refresh'].includes(item.type) ? item.type : 'info')}</span><div class="activity-copy"><strong>${escapeHTML(item.title || item.text)}</strong>${item.title ? `<p>${escapeHTML(item.text)}</p>` : ''}<small>${escapeHTML(item.time)}</small></div></${tag}>`).join('');
  }

  function showPanel(panel, title, kicker, content, trigger) {
    if (!dialog) return;
    if (!dialog.open) returnFocus = trigger || document.activeElement;
    currentPanel = panel;
    modalKicker.textContent = kicker;
    modalTitle.textContent = title;
    modalContent.innerHTML = content;
    dialog.dataset.panel = panel;
    modalContent.scrollTop = 0;
    if (!dialog.open) dialog.showModal();
    requestAnimationFrame(() => { modalTitle.focus({ preventScroll: true }); });
  }

  function closePanel() {
    if (!dialog?.open) return;
    saveReportDraft();
    dialog.close();
  }

  function proposalPanel(trigger) {
    const approved=state.proposal.status==='approved';
    const totals=metrics();
    showPanel('proposal','New bathroom floor tiles','VO-015 · DEF-021',`<div class="panel-stack">${badge(approved?'Approved':'Pending approval',approved?'green':'amber')}<p class="panel-intro">The original Bianco Matte tile is out of stock until September 2026. John proposes two replacement finishes, each at an additional S$250.</p><div class="comparison-grid">${[['grigio','Grigio Matte','Cool grey · closest wall match'],['sabbia','Sabbia Matte','Warmer sand tone']].map(([key,name,tone])=>`<div class="comparison-item"><h4>${name}</h4><p>${tone}</p><p>600 × 600 mm · matte porcelain</p>${approved?badge(state.proposal.tile===key?'Chosen tile':'Alternative'):button(state.proposal.tile===key?'Selected':'Choose this tile','choose-tile','secondary',`data-tile="${key}"`)}</div>`).join('')}</div><section class="impact-box"><dl class="detail-grid">${row('Chosen tile',tileName())}${row('Additional cost','S$250')}${row('Completion','1 Jul → 14 Jul 2026')}${row('Remaining budget',money(approved?totals.available:totals.available-250))}</dl></section><p><a href="/#preview/bathroom">Open the mobile AR room preview</a></p><div class="panel-actions">${approved?openButton('View budget','budget','primary'):button('Review approval','review-approval','primary')+button('Request changes','request-revision')}${approved?button('Withdraw approval','withdraw-approval-review'):''}${openButton('Read quotation','documents')}</div>${localNote()}</div>`,trigger);
  }

  function approvalPanel() {
    if (state.proposal.status === 'approved') return proposalPanel();
    const totals = metrics();
    showPanel('approval-confirm', 'Approve this change?', 'Your decision', `<div class="panel-stack">
      <p class="panel-intro">You are approving ${tileName()} replacement tiles for DEF-021 in the bathroom.</p>
      <section class="impact-box"><dl class="detail-grid">${row('Additional cost', `<strong>${money(PROPOSAL_COST)}</strong>`)}${row('New committed costs', money(totals.approved + PROPOSAL_COST))}${row('Remaining allowance', `<strong>${money(totals.available - PROPOSAL_COST)}</strong>`)}${row('Repair / handover', '14 Jul 2026 · was 1 Jul')}</dl></section>
      <p>This decision will update the budget and repair record in this prototype. No payment will be made and no real approval will be sent.</p>
      <div class="panel-actions">${button(`Confirm approval · ${money(PROPOSAL_COST)}`, 'confirm-approval', 'primary')}${openButton('Back to review', 'proposal')}</div>
      ${localNote()}</div>`);
  }

  function confirmApproval() {
    if (state.proposal.status === 'approved' || approvalInProgress) return;
    approvalInProgress = true;
    state = Store.approveProposal();
    updateDashboard();
    approvalInProgress = false;
    showPanel('approval-success', 'Change approved', 'Local demo receipt · VO-015', `<div class="panel-stack">
      ${badge('Approval recorded', 'green')}<p class="panel-intro">Your additional cost of ${money(PROPOSAL_COST)} is now included in the project budget. The bathroom repair is scheduled for 14 Jul.</p>
      <section class="impact-box"><dl class="detail-grid">${row('Committed costs', money(metrics().approved))}${row('Remaining allowance', `<strong>${money(metrics().available)}</strong>`)}${row('Handover', '14 Jul 2026 · was 1 Jul')}</dl></section>
      <div class="panel-actions">${openButton('View approved change', 'proposal', 'primary')}${button('Back to overview', 'close')}</div>${localNote()}</div>`);
    announce(`Change approved. Remaining allowance ${money(metrics().available)}. ${metrics().actions} action remaining.`);
  }

  function revisionPanel() {
    if (state.proposal.status === 'approved') return proposalPanel();
    showPanel('revision', 'Request a proposal change', 'VO-015 · Bathroom · DEF-021', `<div class="panel-stack"><p class="panel-intro">Describe what you would like John to revise about the proposed replacement tiles. Saving this request does not approve any cost.</p><section class="impact-box"><h3>Useful details to include</h3><p>Ask about a closer colour match, a physical sample, or the additional ${money(PROPOSAL_COST)} cost. Your request stays linked to VO-015 and the bathroom defect.</p></section><form id="revision-form" novalidate><div class="form-field"><label for="revision-description">What would you like changed?</label><textarea id="revision-description" name="description" rows="4" maxlength="800" required placeholder="For example, can you propose a closer colour match and show a physical sample before I approve?" aria-describedby="revision-error">${escapeHTML(state.proposal.revisionRequest?.text || '')}</textarea><p class="field-error" id="revision-error" hidden></p></div><div class="panel-actions"><button type="submit" class="button primary">Save revision request</button>${openButton('Back to proposal', 'proposal')}</div>${localNote()}</form><p class="form-note">This is a simulated request recorded on your device. Use your usual contact channel to send a real request.</p></div>`);
  }

  function withdrawApprovalReview() {
    const defect = state.defects.find(item => item.id === 'DEF-021');
    if (state.proposal.status !== 'approved' || defect.status !== 'scheduled') return proposalPanel();
    showPanel('withdraw-approval-confirm', 'Withdraw this approval?', 'Correct a local decision · VO-015', `<div class="panel-stack"><p class="panel-intro">The proposal will return to awaiting approval and the bathroom repair will wait for your decision. The earlier approval remains in the record.</p><section class="impact-box"><dl class="detail-grid">${row('Remaining allowance now', money(metrics().available))}${row('Remaining allowance after withdrawal', `<strong>${money(metrics().available + PROPOSAL_COST)}</strong>`)}${row('Cost removed from committed changes', money(PROPOSAL_COST))}</dl></section><p>No payment or refund occurs. This corrects your local demo decision; it does not contact the contractor.</p><div class="panel-actions">${button('Confirm withdrawal', 'withdraw-approval-confirm', 'danger')}${openButton('Keep approval', 'proposal')}</div>${localNote()}</div>`);
  }

  function submitRevision(event) {
    if (event.target.id !== 'revision-form') return;
    event.preventDefault();
    if (state.proposal.status === 'approved') return proposalPanel();
    const field = event.target.elements.description;
    const text = field.value.trim().slice(0, 800);
    const error = document.getElementById('revision-error');
    if (text.length < 10) {
      field.setAttribute('aria-invalid', 'true');
      error.textContent = 'Describe the requested change in at least 10 characters.';
      error.hidden = false;
      field.focus();
      return;
    }
    state = Store.requestRevision(text);
    updateDashboard();
    showPanel('revision-success', 'Revision request saved', 'Local demo record · VO-015', `<div class="panel-stack">${badge('Saved locally', 'green')}<p class="panel-intro">Your request is linked to the bathroom tile proposal and DEF-021. Your allowance is still <strong>${money(metrics().available)}</strong>.</p><section class="impact-box"><h3>Your request</h3><p>${escapeHTML(text)}</p></section><p>No message has been sent to John. The proposal still needs a separate approval decision.</p><div class="panel-actions">${openButton('View project contact', 'contact', 'primary')}${openButton('Back to proposal', 'proposal')}</div>${localNote()}</div>`);
    announce('Revision request saved locally. Budget unchanged.');
  }

  function budgetPanel(trigger) {
    const totals = metrics();
    const approved = state.proposal.status === 'approved';
    showPanel('budget', 'Your project budget', 'Budget tracker', `<div class="panel-stack">
      <p class="panel-intro">See what has been committed and how much of your renovation budget is still available.</p>
      <section class="impact-box"><dl class="detail-grid">${row('Project budget', money(PROJECT_BUDGET))}${row('Original committed costs', money(ORIGINAL_COMMITMENT))}${row('Approved changes', money(approved ? PROPOSAL_COST : 0))}${row('Total committed', money(totals.approved))}${row('Remaining allowance', `<strong>${money(totals.available)}</strong>`)}</dl></section>
      <section class="panel-section"><h3>${approved ? 'Latest approved change' : 'Awaiting your approval'}</h3><button type="button" class="linked-record" data-open="proposal">${icon('changes')} VO-015 · Bathroom tile replacement · +${money(PROPOSAL_COST)} ${icon('chevron-right')}</button>
      <p class="form-note">${approved ? `The ${money(PROPOSAL_COST)} change is already included above.` : `This proposal is not included in committed costs yet. Approving it would leave ${money(totals.available - PROPOSAL_COST)}.`}</p></section>
      <p class="form-note">This is a cost tracker, not a wallet or payment service. Figures are sample project data.</p>${localNote()}</div>`, trigger);
  }

  function defectListPanel(trigger) {
    const open = state.defects.filter(defect => !['verified', 'withdrawn'].includes(defect.status));
    const verified = state.defects.filter(defect => defect.status === 'verified');
    const withdrawn = state.defects.filter(defect => defect.status === 'withdrawn');
    const list = items => items.map(defect => { const [label, tone] = statusInfo(defect.status); return `<button type="button" class="defect-item" data-action="defect-detail" data-id="${escapeHTML(defect.id)}"><span>${badge(label, tone)}<strong>${escapeHTML(defect.title)}</strong><small>${escapeHTML(defect.id)} · ${escapeHTML(defect.room)}</small></span>${icon('chevron-right')}</button>`; }).join('');
    showPanel('defects', 'Defects and repairs', `${open.length} open · ${verified.length} verified`, `<div class="panel-stack"><p class="panel-intro">Keep each issue connected to its room, repair progress, and your final inspection.</p><div class="panel-actions">${openButton('Report a defect', 'report', 'primary')}</div><section class="panel-section"><h3>Open issues</h3><div class="defect-list">${list(open) || '<p class="empty-state">No open issues are recorded.</p>'}</div></section><section class="panel-section"><h3>Verified repairs</h3><div class="defect-list">${list(verified) || '<p class="empty-state">No verified repairs yet.</p>'}</div></section>${withdrawn.length ? `<section class="panel-section"><h3>Withdrawn reports</h3><p class="form-note">These records are retained and can be restored.</p><div class="defect-list">${list(withdrawn)}</div></section>` : ''}</div>`, trigger);
  }

  function defectDetail(id, trigger) {
    const defect = state.defects.find(item => item.id === id);
    if (!defect) return defectListPanel(trigger);
    currentDefectId = id;
    const [label, tone] = statusInfo(defect.status);
    const photo = photos.get(defect.id);
    let nextStep = '';
    if (defect.status === 'approval') nextStep = `<section class="impact-box"><h3>Your next step</h3><p>Review the replacement tile quotation. Approval is needed before this repair can proceed.</p>${openButton('Review tile replacement', 'proposal', 'primary')}</section>`;
    if (defect.status === 'scheduled') nextStep = `<section class="impact-box"><h3>Next update</h3><p>${id === 'DEF-021' ? 'Replacement tiles approved. John plans to complete the repair on 14 Jul.' : 'John plans to complete the paint touch-up on 26 Jun.'} You can verify the result once the repair is marked ready for inspection.</p></section>`;
    if (defect.status === 'verification') nextStep = `<section class="impact-box"><h3>Inspect before you verify</h3><p>At the kitchen, check the gaps between the cabinet doors, open and close each door, and look for rubbing or loose hinges.</p><p>Only verify after checking the repair yourself. If the issue remains, record a follow-up instead.</p><div class="panel-actions">${button('I inspected it · verify repair', 'verify-review', 'primary', `data-id="${escapeHTML(id)}"`)}${button('Issue still needs work', 'followup-review', 'secondary', `data-id="${escapeHTML(id)}"`)}</div></section>`;
    if (defect.status === 'verified') nextStep = `<section class="impact-box"><h3>Repair verified</h3><p>${id === 'DEF-003' ? 'You recorded that the cabinet repair passed your inspection in this demo.' : 'This sample repair was verified by the homeowner on 15 Jun.'}</p>${button('Reopen for follow-up', 'followup-review', 'secondary', `data-id="${escapeHTML(id)}"`)}</section>`;
    if (defect.status === 'followup') nextStep = `<section class="impact-box"><h3>Follow-up recorded</h3><p>This issue remains open. Discuss the remaining problem with John and ask for another repair inspection.</p><div class="panel-actions">${openButton('View project contact', 'contact')}${id === 'DEF-003' ? button('Return to ready for inspection', 'restore-verification', 'quiet', `data-id="${escapeHTML(id)}"`) : ''}</div><p class="form-note">This is a local demo record. No follow-up has been sent.</p></section>`;
    if (defect.status === 'reported') nextStep = `<section class="impact-box"><h3>Report saved on this device</h3><p>The room, category, and description have been added to your demo records. Contact John separately to report a real issue.</p><div class="panel-actions">${button('Edit report', 'edit-report', 'secondary', `data-id="${escapeHTML(id)}"`)}${button('Withdraw report', 'withdraw-report-review', 'quiet', `data-id="${escapeHTML(id)}"`)}</div>${openButton('View project contact', 'contact')}</section>`;
    if (defect.status === 'withdrawn') nextStep = `<section class="impact-box"><h3>Report withdrawn</h3><p>This record is retained but is not counted as an open defect. You can restore it if the issue still needs attention.</p>${button('Restore report', 'restore-report', 'secondary', `data-id="${escapeHTML(id)}"`)}</section>`;
    if (defect.followupNote) nextStep += `<section class="panel-section"><h3>Your follow-up note</h3><p>${escapeHTML(defect.followupNote)}</p></section>`;
    showPanel('defect-detail', defect.title, `${defect.id} · ${defect.room}`, `<div class="panel-stack">${badge(label, tone)}<p class="panel-intro">${escapeHTML(defect.description)}</p><dl class="detail-grid">${row('Room', escapeHTML(defect.room))}${row('Category', escapeHTML(defect.category || 'Other'))}${row('Reported', escapeHTML(defect.reported || 'This demo session'))}${row('Responsible person', 'John Tan · Northline Interiors')}</dl>${photo ? `<img class="report-photo" src="${photo}" alt="Your attached defect photograph">` : defect.photoName ? `<p class="form-note">Photo selected: ${escapeHTML(defect.photoName)}. Photo previews last for the current session.</p>` : ''}${nextStep}<div class="panel-actions">${openButton('All defects', 'defects')}${id === 'DEF-021' && state.proposal.status === 'approved' ? openButton('View approved change', 'proposal') : ''}</div>${localNote()}</div>`, trigger);
  }

  function verificationReview(id) {
    const defect = state.defects.find(item => item.id === id);
    if (!defect || defect.status !== 'verification') return defectDetail(id);
    currentDefectId = id;
    showPanel('verify-confirm', 'Mark this repair verified?', `${defect.id} · ${defect.room}`, `<div class="panel-stack"><p class="panel-intro">Confirm you have inspected the cabinet alignment and the doors now work as expected.</p><p>The issue will move to verified repairs. You can reopen it later if you find a problem.</p><div class="panel-actions">${button('Confirm repair verified', 'verify-confirm', 'primary', `data-id="${escapeHTML(id)}"`)}${button('Back to inspection', 'defect-detail', 'secondary', `data-id="${escapeHTML(id)}"`)}</div>${localNote()}</div>`);
  }

  function verifyRepair(id) {
    const defect = state.defects.find(item => item.id === id);
    if (!defect || defect.status !== 'verification') return defectDetail(id);
    state = Store.verifyRepair(id);
    updateDashboard();
    defectDetail(id);
    announce(`Repair verified. ${metrics().openDefects} open defects remain.`);
  }

  function followupReview(id) {
    const defect = state.defects.find(item => item.id === id);
    if (!defect) return;
    showPanel('followup-confirm', 'Keep this issue open?', `${defect.id} · ${defect.room}`, `<div class="panel-stack"><p class="panel-intro">Record that this repair needs more work. It will be marked “Follow-up needed” in your local demo records.</p><p>No message is sent. You can discuss the problem with John using your usual contact channel.</p><div class="panel-actions">${button('Record follow-up', 'followup-confirm', 'primary', `data-id="${escapeHTML(id)}"`)}${button('Back to repair', 'defect-detail', 'secondary', `data-id="${escapeHTML(id)}"`)}</div>${localNote()}</div>`);
  }

  function saveReportDraft() {
    const form = document.getElementById('report-form');
    if (!form) return;
    reportDraft.room = form.elements.room.value;
    reportDraft.category = form.elements.category.value;
    reportDraft.description = form.elements.description.value;
  }

  function reportPanel(trigger, editId = null) {
    if (editId) {
      const defect = state.defects.find(item => item.id === editId);
      if (!defect || defect.status !== 'reported') return defectDetail(editId, trigger);
      reportDraft = { room: defect.room, category: defect.category, description: defect.description, photoName: defect.photoName };
      draftPhoto = photos.get(editId) || '';
    } else if (editingReportId) {
      reportDraft = { room: '', category: '', description: '', photoName: '' };
      draftPhoto = '';
    }
    if (!editId && trigger?.dataset.room) reportDraft.room = trigger.dataset.room;
    editingReportId = editId;
    const rooms = Store.constants.ROOMS;
    const categories = Store.constants.DEFECT_CATEGORIES;
    const options = (values, selected) => values.map(value => `<option value="${escapeHTML(value)}" ${selected === value ? 'selected' : ''}>${escapeHTML(value)}</option>`).join('');
    showPanel('report', editId ? 'Edit defect report' : 'Report a defect', editId ? `Local record · ${editId}` : 'Add a project record', `<div class="panel-stack"><p class="panel-intro">Describe the issue and its location.</p><form id="report-form" data-edit-id="${escapeHTML(editId || '')}" novalidate>
      <div class="form-field"><label for="report-room">Room <span aria-hidden="true">*</span></label><select id="report-room" name="room" required aria-describedby="room-error"><option value="">Choose a room</option>${options(rooms, reportDraft.room)}</select><p class="field-error" id="room-error" hidden></p></div>
      <div class="form-field"><label for="report-category">Category <span aria-hidden="true">*</span></label><select id="report-category" name="category" required aria-describedby="category-error"><option value="">Choose a category</option>${options(categories, reportDraft.category)}</select><p class="field-error" id="category-error" hidden></p></div>
      <div class="form-field"><label for="report-description">What needs fixing? <span aria-hidden="true">*</span></label><textarea id="report-description" name="description" rows="4" maxlength="800" required placeholder="For example, the lower kitchen cabinet door rubs against the frame when opened." aria-describedby="description-help description-error">${escapeHTML(reportDraft.description)}</textarea><p class="form-note" id="description-help">Include the location and what you noticed. Maximum 800 characters.</p><p class="field-error" id="description-error" hidden></p></div>
      <div class="form-field"><label for="report-photo">Add a photo <span>(optional)</span></label><input type="file" id="report-photo" name="photo" accept="image/jpeg,image/png,image/webp" aria-describedby="photo-help photo-error"><p class="form-note" id="photo-help">JPG, PNG, or WebP · up to 5 MB. Photo previews stay in this session and are never uploaded.</p><p class="field-error" id="photo-error" hidden></p><div id="photo-preview">${draftPhoto ? `<img class="report-photo" src="${draftPhoto}" alt="Selected defect photograph"><p class="form-note">${escapeHTML(reportDraft.photoName)}</p>${button('Remove photo', 'remove-photo', 'quiet')}` : ''}</div></div>
      <div class="panel-actions"><button type="submit" class="button primary">${editId ? 'Save report changes' : 'Save defect report'}</button>${button('Cancel', 'close')}</div>${localNote()}</form></div>`, trigger);
  }

  function setFieldError(form, fieldName, message) {
    const field = form.elements[fieldName];
    const error = document.getElementById(`${fieldName}-error`);
    if (field) field.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (error) { error.textContent = message; error.hidden = !message; }
  }

  function submitReport(event) {
    if (event.target.id !== 'report-form') return;
    event.preventDefault();
    const form = event.target;
    saveReportDraft();
    const errors = {
      room: reportDraft.room ? '' : 'Choose the room where the issue is located.',
      category: reportDraft.category ? '' : 'Choose a category for this issue.',
      description: reportDraft.description.trim().length >= 10 ? '' : 'Describe the issue in at least 10 characters.'
    };
    Object.entries(errors).forEach(([field, message]) => setFieldError(form, field, message));
    const firstInvalid = Object.keys(errors).find(field => errors[field]);
    if (firstInvalid) { form.elements[firstInvalid].focus(); announce('Check the highlighted fields before saving the report.'); return; }
    const editId = form.dataset.editId;
    if (editId && state.defects.find(defect => defect.id === editId)?.status !== 'reported') {
      defectDetail(editId);
      announce('This report cannot be edited in its current status.');
      return;
    }
    const record = { room: reportDraft.room, category: reportDraft.category, description: reportDraft.description.trim().slice(0, 800), photoName: reportDraft.photoName };
    state = editId ? Store.updateDefect(editId, record) : Store.addDefect(record);
    const id = editId || state.defects[0].id;
    if (draftPhoto) photos.set(id, draftPhoto);
    else if (!record.photoName) photos.delete(id);
    reportDraft = { room: '', category: '', description: '', photoName: '' };
    draftPhoto = '';
    editingReportId = null;
    updateDashboard();
    defectDetail(id);
    announce(`Defect report ${id} ${editId ? 'updated' : 'saved'} on this device. ${metrics().openDefects} open defects.`);
  }

  function withdrawReportReview(id) {
    const defect = state.defects.find(item => item.id === id);
    if (!defect || defect.status !== 'reported') return defectDetail(id);
    showPanel('withdraw-report-confirm', 'Withdraw this defect report?', `${id} · ${defect.room}`, `<div class="panel-stack"><p class="panel-intro">This report will move out of open defects. Its description and history will remain available, and you can restore it later.</p><p>No message will be sent to the contractor.</p><div class="panel-actions">${button('Confirm report withdrawal', 'withdraw-report-confirm', 'danger', `data-id="${escapeHTML(id)}"`)}${button('Keep report', 'defect-detail', 'secondary', `data-id="${escapeHTML(id)}"`)}</div>${localNote()}</div>`);
  }

  function previewPhoto(input) {
    const form = document.getElementById('report-form');
    if (!form) return;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setFieldError(form, 'photo', 'Choose a JPG, PNG, or WebP image smaller than 5 MB.');
      input.value = '';
      return;
    }
    setFieldError(form, 'photo', '');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string' || !reader.result.startsWith('data:image/')) return;
      draftPhoto = reader.result;
      reportDraft.photoName = file.name;
      const preview = document.getElementById('photo-preview');
      if (preview) preview.innerHTML = `<img class="report-photo" src="${draftPhoto}" alt="Selected defect photograph"><p class="form-note">${escapeHTML(file.name)}</p>${button('Remove photo', 'remove-photo', 'quiet')}`;
    };
    reader.onerror = () => setFieldError(form, 'photo', 'This photo could not be opened. Try a different image.');
    reader.readAsDataURL(file);
  }

  function roomsPanel(trigger) {
    const rooms = Store.constants.ROOMS;
    showPanel('rooms', 'Your rooms', 'Punggol · 4-room BTO', `<div class="panel-stack"><p class="panel-intro">Choose a room to view its records.</p><img class="room-preview" src="../assets/living-room.png" alt="Illustrative living room with a neutral palette and warm wood furniture"><p class="form-note">Illustrative design reference. It is not a scan or a verified view of your actual home.</p><div class="room-grid">${rooms.map(room => { const records = state.defects.filter(defect => defect.room === room && !['verified', 'withdrawn'].includes(defect.status)); return `<button type="button" class="room-tile" data-action="room-detail" data-room="${escapeHTML(room)}">${icon('home')}<strong>${escapeHTML(room)}</strong><span>${records.length ? `${records.length} open ${records.length === 1 ? 'issue' : 'issues'}` : 'No open issues'}</span>${icon('chevron-right')}</button>`; }).join('')}</div><p class="form-note">Room grouping is illustrative; this is not a scale floor plan.</p></div>`, trigger);
  }

  function roomDetail(room) {
    const defects = state.defects.filter(defect => defect.room === room);
    showPanel('room-detail', room, 'Room records', `<div class="panel-stack"><p class="panel-intro">${room === 'Bathroom' ? 'The replacement tile proposal is linked to the cracked floor tiles in this room.' : `Track reported issues and completed repairs in the ${escapeHTML(room.toLowerCase())}.`}</p><div class="defect-list">${defects.map(defect => { const [label, tone] = statusInfo(defect.status); return `<button type="button" class="defect-item" data-action="defect-detail" data-id="${escapeHTML(defect.id)}"><span>${badge(label, tone)}<strong>${escapeHTML(defect.title)}</strong><small>${escapeHTML(defect.id)}</small></span>${icon('chevron-right')}</button>`; }).join('') || '<p class="empty-state">No defects are recorded for this room.</p>'}</div><div class="panel-actions">${openButton('Report a defect', 'report', 'primary', `data-room="${escapeHTML(room)}"`)}${openButton('All rooms', 'rooms')}</div></div>`);
  }

  function timelinePanel(trigger) {
    const stages = [
      ['Site preparation', '29 May', 'Complete'], ['Electrical and plumbing', '15 Jun', 'Complete'], ['Tiling', '18 Jun', 'In progress'], ['Carpentry and repairs', '26 Jun', 'Upcoming'], ['Final inspection and handover', handover(), 'Upcoming']
    ];
    showPanel('timeline', 'Renovation timeline', `Target handover · ${handover()} 2026`, `<div class="panel-stack"><p class="panel-intro">Stage 3 of 5 is in progress.</p><ol class="defect-list">${stages.map(([title, date, status], index) => `<li class="defect-item"><span>${badge(status, status === 'Complete' ? 'green' : status === 'In progress' ? 'amber' : 'neutral')}<strong>${index + 1}. ${title}</strong><small>${date} 2026</small></span>${icon(status === 'Complete' ? 'check' : 'clock')}</li>`).join('')}</ol><section class="impact-box"><h3>Bathroom repair · 14 Jul</h3><p>${state.proposal.status === 'approved' ? 'The replacement tile change is approved. Completion is planned for 14 Jul 2026.' : 'The repair is waiting for your replacement tile decision. The original tile is unavailable until September 2026; the proposed alternative is available now.'}</p>${openButton(state.proposal.status === 'approved' ? 'View approved change' : 'Review change', 'proposal')}</section><p class="form-note">These are sample project dates for the 18 Jun demo. Handover is a planned milestone, subject to a satisfactory final inspection.</p></div>`, trigger);
  }

  function documentsPanel(trigger) {
    showPanel('documents', 'Project documents', 'Connected project records', `<div class="panel-stack"><p class="panel-intro">Original scope and variation quotations.</p><div class="document-list"><button type="button" class="document-item" data-action="document" data-document="scope">${icon('file')}<span>Original flooring scope<small>Contract extract · 2 Apr 2026 · sample</small></span>${icon('chevron-right')}</button><button type="button" class="document-item" data-action="document" data-document="quotation">${icon('file')}<span>VO-015 · Replacement tile quotation<small>18 Jun 2026 · ${state.proposal.status === 'approved' ? 'approved in this demo' : 'awaiting approval'}</small></span>${icon('chevron-right')}</button></div><p class="form-note">These are readable sample records, not uploaded PDFs or legal contracts.</p></div>`, trigger);
  }

  function documentPanel(type) {
    const quotation = type === 'quotation';
    showPanel('document', quotation ? 'Replacement tile quotation' : 'Original flooring scope', quotation ? 'Sample document · VO-015' : 'Sample contract extract', `<div class="panel-stack"><p class="form-note">Fictional project document for this prototype.</p><section class="panel-section"><h3>${quotation ? 'Variation order · VO-015' : 'Flooring specification'}</h3><dl class="detail-grid">${row('Project', 'Thomas Eng · Punggol 4-room BTO')}${row('Prepared by', 'John Tan · Northline Interiors')}${row('Issued', quotation ? '18 Jun 2026' : '2 Apr 2026')}${row('Room', 'Bathroom')}</dl></section><section class="panel-section"><h3>${quotation ? 'Proposed change' : 'Agreed scope'}</h3><p>${quotation ? 'Replace three cracked Bianco Matte floor tiles with Grigio Matte or Sabbia Matte porcelain, 600 × 600 mm, matte finish. The alternative is a different shade. The original product is unavailable until September 2026.' : 'Supply and install Bianco Matte porcelain floor tiles, 600 × 600 mm, matte finish in the bathroom. Installation and standard defect rectification are included in the agreed renovation scope.'}</p>${quotation ? `<dl class="detail-grid">${row('Remove tiles & prepare floor',money(80))}${row('Tile price difference',money(120))}${row('Laying & grouting',money(50))}${row('Total additional cost', `<strong>${money(PROPOSAL_COST)}</strong>`)}${row('Planned repair', '14 Jul 2026')}${row('Target handover', '14 Jul 2026 · was 1 Jul')}${row('Approval status', state.proposal.status === 'approved' ? 'Approved by Thomas Eng in this demo' : 'Awaiting homeowner approval')}</dl>` : '<p>Any substitution affecting material, appearance, cost, or timing should be reviewed and explicitly approved by the homeowner before proceeding.</p>'}</section><div class="panel-actions">${openButton('View linked change', 'proposal', 'primary')}${openButton('All documents', 'documents')}</div></div>`);
  }

  function assistantPanel(trigger, topic = '') {
    const totals = metrics();
    const answers = {
      change: `<p>The original Bianco Matte tile is unavailable until <strong>September 2026</strong>. John proposes Grigio Matte or Sabbia Matte, both 600 × 600 mm matte porcelain in a different shade.</p><p>The additional cost is <strong>${money(PROPOSAL_COST)}</strong>. Proposed completion is 14 Jul, about two weeks later than 1 Jul.</p>${openButton('Read source · VO-015', 'proposal')}`,
      budget: `<p>Your sample budget is ${money(PROJECT_BUDGET)} and committed costs are <strong>${money(totals.approved)}</strong>, leaving <strong>${money(totals.available)}</strong>.</p><p>${state.proposal.status === 'approved' ? 'The tile replacement is already included in these figures.' : `The pending ${money(PROPOSAL_COST)} tile proposal is not included yet. Approval would leave ${money(totals.available - PROPOSAL_COST)}.`}</p>${openButton('Read source · Budget', 'budget')}`,
      next: `<p>${totals.actions ? `${totals.actions} ${totals.actions === 1 ? 'action needs' : 'actions need'} your attention.` : 'There are no pending homeowner decisions in this demo.'}</p><ul>${state.proposal.status === 'pending' ? '<li>Review VO-015 and decide on the replacement tiles.</li>' : ''}${state.defects.find(defect => defect.id === 'DEF-003').status === 'verification' ? '<li>Inspect the kitchen cabinet doors before verifying the repair.</li>' : ''}${state.defects.some(defect => defect.status === 'followup') ? '<li>Review the repairs marked for follow-up and discuss them with John.</li>' : ''}<li>Keep track of open defects before final inspection.</li></ul>${openButton('See defect records', 'defects')}`
    };
    showPanel('assistant', 'Project helper', 'Sample project answers', `<div class="panel-stack"><p class="panel-intro">Choose a project question.</p>${topic && answers[topic] ? `<section class="chat-answer" aria-live="polite">${answers[topic]}</section>` : ''}<div class="suggested-prompts">${button('What is changing?', 'assistant-topic', 'secondary', 'data-topic="change"')}${button('How much budget is left?', 'assistant-topic', 'secondary', 'data-topic="budget"')}${button('What needs my attention?', 'assistant-topic', 'secondary', 'data-topic="next"')}</div><p class="form-note">Prewritten demo answers.</p></div>`, trigger);
  }

  function notificationsPanel(trigger) {
    state = Store.markNotificationsRead();
    updateDashboard();
    showPanel('notifications', 'Project updates', 'Notifications', `<div class="panel-stack"><ul class="defect-list">${activityHTML(state.activity.slice(0, 8), 'li')}</ul><div class="panel-actions">${openButton('View change request', 'proposal')}${openButton('View defects', 'defects')}</div><p class="form-note">Sample updates and your local demo activity. There are no live contractor notifications.</p></div>`, trigger);
  }

  function contactPanel(trigger) {
    showPanel('contact', 'Your project contact', 'Northline Interiors', `<div class="panel-stack"><p class="panel-intro">John Tan is the project contact in this fictional demo.</p><dl class="detail-grid">${row('Project lead', 'John Tan')}${row('Company', 'Northline Interiors')}${row('Current responsibilities', 'Quotations, repair scheduling, and handover coordination')}</dl><section class="impact-box"><h3>Before you contact your contractor</h3><p>Include the relevant record number, room, and question. For the tile replacement, refer to <strong>VO-015 / DEF-021 · Bathroom</strong>.</p></section><p class="form-note">No real phone number, email address, or messaging service is connected to this prototype. Use your actual contractor’s usual contact channel.</p><div class="panel-actions">${openButton('View related proposal', 'proposal')}${openButton('View defect records', 'defects')}</div></div>`, trigger);
  }

  function projectPanel(trigger) {
    showPanel('project', 'Project details', 'Homeowner demo', `<div class="panel-stack"><dl class="detail-grid">${row('Homeowner', 'Thomas Eng')}${row('Home', 'Punggol · 4-room BTO')}${row('Project lead', 'John Tan · Northline Interiors')}${row('Demo reference date', '18 Jun 2026')}${row('Target handover',handover()+' 2026')}${row('Prototype storage', Store.storageAvailable ? 'Saved in this browser on this device' : 'Session only · browser storage unavailable')}</dl><p class="form-note">This is a seeded homeowner prototype. No real account or sign-in is required. Your demo activity is not synced to other devices.</p><section class="panel-section"><h3>Start the demo again</h3><p>Restore the sample proposal, defects, budget, and activity. Your local reports and decisions will be removed.</p>${button('Reset demo', 'reset-review', 'secondary')}</section></div>`, trigger);
  }

  function resetReview() {
    showPanel('reset-confirm', 'Reset the demo?', 'Restore sample project', `<div class="panel-stack"><p class="panel-intro">This removes the defect reports, approval decisions, photo previews, and repair checks you made in this browser. The original sample project will be restored.</p><div class="panel-actions">${button('Reset demo', 'reset-confirm', 'danger')}${openButton('Keep my changes', 'project')}</div></div>`);
  }

  function resetDemo() {
    closePanel();
    state = Store.reset();
    reportDraft = { room: '', category: '', description: '', photoName: '' };
    editingReportId = null;
    draftPhoto = '';
    photos.clear();
    updateDashboard();
    announce('Demo reset. Original project records restored.');
  }

  function openPanel(panel, trigger, options = {}) {
    saveReportDraft();
    if (panel === 'defects' && options.defectId) return defectDetail(options.defectId, trigger);
    const panels = { proposal: proposalPanel, budget: budgetPanel, defects: defectListPanel, rooms: roomsPanel, timeline: timelinePanel, documents: documentsPanel, assistant: assistantPanel, notifications: notificationsPanel, report: reportPanel, contact: contactPanel, project: projectPanel };
    if (panel === 'report' && options.room) reportDraft.room = options.room;
    if (panels[panel]) panels[panel](trigger);
  }

  function handleAction(element) {
    const id = element.dataset.id;
    switch (element.dataset.action) {
      case 'choose-tile': state=Store.selectTile(element.dataset.tile); updateDashboard(); proposalPanel(); break;
      case 'close': closePanel(); break;
      case 'review-approval': approvalPanel(); break;
      case 'confirm-approval': confirmApproval(); break;
      case 'withdraw-approval-review': withdrawApprovalReview(); break;
      case 'withdraw-approval-confirm':
        state = Store.withdrawApproval(); updateDashboard(); proposalPanel();
        announce(state.proposal.status === 'pending' ? 'Approval withdrawn locally. The proposal is awaiting review and your allowance is updated.' : 'Approval cannot be withdrawn after the repair has progressed.');
        break;
      case 'request-revision': revisionPanel(); break;
      case 'defect-detail': defectDetail(id, element); break;
      case 'edit-report': reportPanel(element, id); break;
      case 'withdraw-report-review': withdrawReportReview(id); break;
      case 'withdraw-report-confirm':
        state = Store.withdrawDefect(id); updateDashboard(); defectDetail(id);
        announce('Report withdrawn. The record is retained and can be restored.');
        break;
      case 'restore-report':
        state = Store.restoreDefect(id); updateDashboard(); defectDetail(id);
        announce('Report restored to open defects.');
        break;
      case 'verify-review': verificationReview(id); break;
      case 'verify-confirm': verifyRepair(id); break;
      case 'followup-review': followupReview(id); break;
      case 'followup-confirm': {
        const defect = state.defects.find(item => item.id === id);
        if (!defect || defect.status === 'followup') break;
        state = Store.followupRepair(id);
        updateDashboard(); defectDetail(id);
        announce(`Follow-up recorded for ${id}. The issue remains open.`);
        break;
      }
      case 'restore-verification': {
        const defect = state.defects.find(item => item.id === id);
        if (!defect || defect.status !== 'followup') break;
        state = Store.restoreVerification(id);
        updateDashboard(); defectDetail(id);
        announce('Repair restored to ready for your inspection.');
        break;
      }
      case 'room-detail': roomDetail(element.dataset.room); break;
      case 'document': documentPanel(element.dataset.document); break;
      case 'assistant-topic': assistantPanel(null, element.dataset.topic); break;
      case 'reset-review': resetReview(); break;
      case 'reset-confirm': resetDemo(); break;
      case 'remove-photo': {
        draftPhoto = ''; reportDraft.photoName = '';
        const preview = document.getElementById('photo-preview');
        const input = document.getElementById('report-photo');
        if (preview) preview.innerHTML = '';
        if (input) { input.value = ''; input.focus(); }
        break;
      }
    }
  }

  function init() {
    dialog = document.getElementById('modal');
    modalKicker = document.getElementById('modal-kicker');
    modalTitle = document.getElementById('modal-title');
    modalContent = document.getElementById('modal-content');
    if (!dialog || !modalKicker || !modalTitle || !modalContent) return;
    modalTitle.tabIndex = -1;
    dialog.setAttribute('aria-labelledby', 'modal-title');
    liveRegion = document.querySelector('[data-live-status]');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.className = 'sr-only';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      document.body.append(liveRegion);
    }
    document.addEventListener('click', event => {
      if (!(event.target instanceof Element)) return;
      const close = event.target.closest('[data-close], [data-home]');
      if (close) { event.preventDefault(); closePanel(); return; }
      const action = event.target.closest('[data-action]');
      if (action) { event.preventDefault(); handleAction(action); return; }
      const opener = event.target.closest('[data-open]');
      if (opener) { event.preventDefault(); openPanel(opener.dataset.open, opener, { room: opener.dataset.room, defectId: opener.dataset.defectId }); }
    });
    document.addEventListener('submit', submitReport);
    document.addEventListener('submit', submitRevision);
    document.addEventListener('change', event => {
      if (event.target.id === 'report-photo') previewPhoto(event.target);
      if (event.target.closest?.('#report-form')) saveReportDraft();
    });
    document.addEventListener('input', event => {
      if (event.target.closest?.('#report-form')) saveReportDraft();
    });
    dialog.addEventListener('cancel', () => { saveReportDraft(); });
    dialog.addEventListener('close', () => {
      currentPanel = '';
      const focusTarget = returnFocus?.isConnected && returnFocus.getClientRects().length ? returnFocus : document.getElementById('main');
      if (focusTarget && typeof focusTarget.focus === 'function') focusTarget.focus({ preventScroll: true });
      returnFocus = null;
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closePanel();
    });
    Store.subscribe((next, metadata) => {
      if (metadata.source === 'storage') {
        photos.forEach((photo, id) => {
          const previous = state.defects.find(defect => defect.id === id);
          const updated = next.defects.find(defect => defect.id === id);
          if (!updated || previous?.photoName !== updated.photoName || previous?.updatedAt !== updated.updatedAt) photos.delete(id);
        });
      }
      state = next;
      updateDashboard();
      if (metadata.source === 'storage') {
        if (dialog.open && currentPanel === 'proposal') proposalPanel();
        if (dialog.open && currentPanel === 'budget') budgetPanel();
        if (dialog.open && currentPanel === 'defects') defectListPanel();
        if (dialog.open && currentPanel === 'rooms') roomsPanel();
        if (dialog.open && currentPanel === 'defect-detail') defectDetail(currentDefectId);
        if (dialog.open && currentPanel === 'approval-confirm') state.proposal.status === 'approved' ? proposalPanel() : approvalPanel();
        if (dialog.open && currentPanel === 'verify-confirm') verificationReview(currentDefectId);
        announce('Project demo updated from another tab.');
      }
    });
    updateDashboard();
    window.RenoGuard = Object.freeze({
      resetDemo,
      getState: () => JSON.parse(JSON.stringify({ ...state, metrics: metrics(), storageAvailable: Store.storageAvailable }))
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
