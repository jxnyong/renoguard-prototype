/* Shared project data for the desktop and mobile prototypes.
   Replace this local adapter with a backend adapter when the project needs one. */
((root) => {
  'use strict';

  const isDesktop = /(?:^|\/)web(?:\/|$)/.test(root.location?.pathname || '');
  const query = new URLSearchParams(root.location?.search || '');
  const requestedVariant = query.get('variant');
  const UI_VARIANT = !isDesktop && ['a', 'b'].includes(requestedVariant) ? requestedVariant : null;
  const VARIANT_CONTEXT = UI_VARIANT !== null;
  const requestedStudy = query.get('study');
  const STUDY_MODE = VARIANT_CONTEXT && ['scenario', 'quotation'].includes(requestedStudy) ? requestedStudy : null;
  const STUDY_CONTEXT = STUDY_MODE !== null;
  const scopedKey = key => VARIANT_CONTEXT ? `${key}.variant.${UI_VARIANT}` : key;
  const STORAGE_KEY = scopedKey('renoguard.homeowner.v2');
  const WALKTHROUGH_KEY = scopedKey('renoguard.walkthrough.v1');
  const DEMO_MODE_KEY = scopedKey('renoguard.mobileDemoMode');
  const SCENARIO_DATE = '18 Jun 2026';
  const PROPOSAL_COST = 250;
  const PROJECT_BUDGET = 45000;
  const ORIGINAL_COMMITMENT = 15000;
  const ROOMS = Object.freeze(['Living room', 'Main bedroom', 'Bedroom 2', 'Kitchen', 'Bathroom']);
  const DEFECT_CATEGORIES = Object.freeze(['Flooring', 'Carpentry', 'Painting', 'Electrical', 'Plumbing', 'Other']);
  const DEFECT_STATUSES = ['approval', 'verification', 'scheduled', 'verified', 'reported', 'followup', 'withdrawn'];
  const listeners = new Set();
  const clone = value => JSON.parse(JSON.stringify(value));
  let storageAvailable = true;

  function money(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new TypeError('A budget amount must be a finite number.');
    return `S$${number.toLocaleString('en-SG', { maximumFractionDigits: 0 })}`;
  }

  function getInitialState(mode = 'explore') {
    const initial = {
      version: 2,
      demoMode: mode,
      proposal: { status: 'pending', approvedAt: null, tile: 'grigio', selectionMade: isDesktop },
      notificationsRead: false,
      defects: [
        { id: 'DEF-021', room: 'Bathroom', title: 'Cracked bathroom floor tiles', category: 'Flooring', status: 'approval', description: 'Hairline cracks across three newly installed tiles beside the shower. Bianco Matte is out of stock until September 2026.', reported: '15 Jun 2026', photoName: '' },
        { id: 'DEF-003', room: 'Kitchen', title: 'Cabinet doors realigned', category: 'Carpentry', status: 'verification', description: 'The contractor has adjusted the cabinet hinges. Check that the doors align and open smoothly before marking the repair as verified.', reported: '15 Jun 2026', photoName: '' },
        { id: 'DEF-004', room: 'Bedroom 2', title: 'Paint touch-up', category: 'Painting', status: 'scheduled', description: 'Uneven paint coverage near the door frame. A touch-up is scheduled for 26 Jun.', reported: '16 Jun 2026', photoName: '' },
        { id: 'DEF-001', room: 'Living room', title: 'Loose power outlet secured', category: 'Electrical', status: 'verified', description: 'The outlet was secured and checked. The homeowner verified the repair on 15 Jun.', reported: '14 Jun 2026', photoName: '' }
      ],
      activity: [
        { title: 'Tile replacement proposed', text: 'Bathroom · +S$250, completion proposed for 14 Jul', time: '18 Jun · John Tan', type: 'file' },
        { title: 'Cabinet alignment completed', text: 'Kitchen · Ready for your inspection', time: '17 Jun · John Tan', type: 'check' },
        { title: 'Paint touch-up scheduled', text: 'Bedroom 2 · Planned for 26 Jun', time: '17 Jun · John Tan', type: 'clock' }
      ]
    };
    if (mode === 'walkthrough') {
      initial.walkthrough = { guidance: !VARIANT_CONTEXT, reported: STUDY_MODE === 'quotation', reviewed: false, previewed: false, previewedTiles: [], quoteRead: false, budgetChecked: false, updatedBudgetViewed: false, paymentViewed: false };
      initial.activity = [];
      initial.notificationsRead = true;
    }
    return initial;
  }

  function requireText(value, name, maxLength, minLength = 0) {
    if (typeof value !== 'string' || value.length < minLength || value.length > maxLength) {
      throw new TypeError(`${name} must contain ${minLength}–${maxLength} characters.`);
    }
    return value;
  }

  function validateState(value) {
    if (!value || value.version !== 2 || !Array.isArray(value.defects) || !Array.isArray(value.activity) || !['pending', 'approved'].includes(value.proposal?.status)) {
      throw new TypeError('Invalid RenoGuard project state.');
    }
    const seen = new Set();
    const defaults = getInitialState();
    const defects = value.defects.map(defect => {
      if (!defect || !/^DEF-\d{3,}$/.test(defect.id) || seen.has(defect.id) || !DEFECT_STATUSES.includes(defect.status)) {
        throw new TypeError('Each defect must have a unique record ID and a valid status.');
      }
      seen.add(defect.id);
      const seed = defaults.defects.find(item => item.id === defect.id);
      const record = {
        id: defect.id,
        room: requireText(defect.room, 'Room', 80, 1),
        title: requireText(defect.title, 'Defect title', 160, 1),
        category: requireText(defect.category ?? seed?.category ?? 'Other', 'Category', 80, 1),
        status: defect.status,
        description: requireText(defect.description ?? seed?.description ?? '', 'Description', 800),
        reported: requireText(defect.reported ?? seed?.reported ?? 'This demo session', 'Reported date', 80),
        photoName: requireText(defect.photoName ?? '', 'Photo filename', 255)
      };
      if (Object.prototype.hasOwnProperty.call(defect, 'samplePhotos')) {
        if (typeof defect.samplePhotos !== 'boolean') throw new TypeError('Sample photos must be enabled or disabled.');
        record.samplePhotos = defect.samplePhotos;
      }
      if (defect.changeRequest) record.changeRequest = { savedAt: requireText(defect.changeRequest.savedAt, 'Request date', 120), description: requireText(defect.changeRequest.description, 'Request description', 800, 10), room: requireText(defect.changeRequest.room, 'Request room', 80, 1), category: requireText(defect.changeRequest.category, 'Request category', 80, 1) };
      if (typeof defect.followupNote === 'string' && defect.followupNote) record.followupNote = requireText(defect.followupNote, 'Follow-up note', 800);
      ['updatedAt', 'withdrawnAt'].forEach(key => {
        if (typeof defect[key] === 'string') record[key] = requireText(defect[key], 'Record date', 120);
      });
      return record;
    });
    if (!defaults.defects.every(defect => seen.has(defect.id))) throw new TypeError('The sample project records must be retained.');
    const proposal = {
      status: value.proposal.status,
      tile: ['grigio', 'sabbia', 'avorio'].includes(value.proposal.tile) ? value.proposal.tile : 'grigio',
      selectionMade: value.proposal.status === 'approved' || value.proposal.selectionMade === true,
      approvedAt: value.proposal.approvedAt == null ? null : requireText(value.proposal.approvedAt, 'Approval date', 120)
    };
    ['lastApprovedAt', 'withdrawnAt'].forEach(key => {
      if (typeof value.proposal[key] === 'string') proposal[key] = requireText(value.proposal[key], 'Proposal history date', 120);
    });
    if (value.proposal.revisionRequest) {
      proposal.revisionRequest = {
        text: requireText(value.proposal.revisionRequest.text, 'Revision request', 800, 10),
        savedAt: requireText(value.proposal.revisionRequest.savedAt, 'Revision date', 120)
      };
    }
    const activity = value.activity.filter(item => item && typeof item.text === 'string').slice(0, 20).map(item => {
      const record = {
        text: requireText(item.text, 'Activity description', 1000),
        time: requireText(item.time ?? 'This demo session', 'Activity date', 120),
        type: ['file', 'check', 'clock', 'defect', 'refresh', 'info'].includes(item.type) ? item.type : 'info'
      };
      if (typeof item.title === 'string') record.title = requireText(item.title, 'Activity title', 200);
      return record;
    });
    const demoMode = value.demoMode === 'walkthrough' ? 'walkthrough' : 'explore';
    const validated = { version: 2, demoMode, proposal, notificationsRead: Boolean(value.notificationsRead), defects, activity };
    if (demoMode === 'walkthrough') {
      const previous = value.walkthrough || {};
      validated.walkthrough = Object.fromEntries(['reported', 'reviewed', 'quoteRead', 'budgetChecked'].map(key => [key, Boolean(previous[key])]));
      validated.walkthrough.guidance = STUDY_CONTEXT ? false : typeof previous.guidance === 'boolean' ? previous.guidance : !VARIANT_CONTEXT;
      // Preserve a completed preview step from older saves that did not track each tile.
      validated.walkthrough.previewedTiles = Array.isArray(previous.previewedTiles)
        ? [...new Set(previous.previewedTiles.filter(tile => ['grigio', 'sabbia', 'avorio'].includes(tile)))]
        : previous.previewed ? ['grigio', 'sabbia'] : [];
    validated.walkthrough.previewed = validated.walkthrough.reported && validated.walkthrough.previewedTiles.length === 3;
      ['updatedBudgetViewed', 'paymentViewed'].forEach(key => {
        validated.walkthrough[key] = proposal.status === 'approved' && Boolean(previous[key]);
      });
      if (!validated.walkthrough.reported && proposal.status === 'approved') throw new TypeError('Report the scenario defect before approving its proposal.');
    }
    return validated;
  }

  function preferredMode() {
    if (isDesktop) return 'explore';
    if (STUDY_CONTEXT) return 'walkthrough';
    const fallback = VARIANT_CONTEXT ? 'walkthrough' : 'explore';
    try {
      const saved = root.localStorage.getItem(DEMO_MODE_KEY);
      return ['explore', 'walkthrough'].includes(saved) ? saved : fallback;
    } catch { return fallback; }
  }

  const storageKey = mode => mode === 'walkthrough' ? WALKTHROUGH_KEY : STORAGE_KEY;
  let activeMode = preferredMode();

  function readSavedState(mode = activeMode) {
    if (STUDY_CONTEXT) return getInitialState(mode);
    let saved;
    try {
      saved = root.localStorage.getItem(storageKey(mode));
      storageAvailable = true;
    } catch {
      storageAvailable = false;
      return getInitialState(mode);
    }
    if (!saved) return getInitialState(mode);
    try {
      return validateState({ ...JSON.parse(saved), demoMode: mode });
    } catch {
      // Corrupt or obsolete demo data should not prevent either interface opening.
      return getInitialState(mode);
    }
  }

  let state = readSavedState();

  function getState() {
    return clone(state);
  }

  function getProjectDefects(projectState = state) {
    const records = projectState.demoMode === 'walkthrough'
      ? projectState.defects.filter(defect => !['DEF-003', 'DEF-004', 'DEF-001'].includes(defect.id) && (defect.id !== 'DEF-021' || projectState.walkthrough?.reported))
      : projectState.defects;
    return clone(records);
  }

  function hasProposal(projectState = state) {
    return projectState.demoMode !== 'walkthrough' || Boolean(projectState.walkthrough?.reported);
  }

  function getMetrics(projectState = state) {
    const approved = ORIGINAL_COMMITMENT + (projectState.proposal.status === 'approved' ? PROPOSAL_COST : 0);
    const pending = hasProposal(projectState) && projectState.proposal.status === 'pending' ? 1 : 0;
    const records = getProjectDefects(projectState);
    return {
      approved,
      available: PROJECT_BUDGET - approved,
      openDefects: records.filter(defect => !['verified', 'withdrawn'].includes(defect.status)).length,
      pending,
      actions: pending + records.filter(defect => ['verification', 'followup'].includes(defect.status)).length
    };
  }

  function notify(source) {
    listeners.forEach(listener => {
      try {
        listener(getState(), { source });
      } catch (error) {
        // One interface subscriber must not stop another subscriber receiving a change.
        root.console?.error('RenoGuard project subscriber failed.', error);
      }
    });
  }

  function saveState(next) {
    // Validate before replacing the in-memory state or writing persistent data.
    const validated = validateState(next);
    if (validated.demoMode !== activeMode) throw new TypeError('Save project data in its own demo mode.');
    state = validated;
    if (STUDY_CONTEXT) {
      notify('local');
      return getState();
    }
    try {
      root.localStorage.setItem(storageKey(activeMode), JSON.stringify(state));
      storageAvailable = true;
    } catch {
      // Private browsing, quota, and blocked storage all retain a usable session.
      storageAvailable = false;
    }
    notify('local');
    return getState();
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('A subscriber must be a function.');
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function addActivity(next, text, type = 'check') {
    next.activity.unshift({ text, time: 'Just now · demo', type });
    next.activity = next.activity.slice(0, 20);
    next.notificationsRead = false;
  }

  function selectTile(tile) {
    if (!['grigio', 'sabbia', 'avorio'].includes(tile)) throw new TypeError('Choose a proposed tile.');
    if (!hasProposal()) throw new Error('Report the bathroom defect to receive the sample proposal.');
    if (state.proposal.status === 'approved' || (state.proposal.tile === tile && state.proposal.selectionMade)) return getState();
    const next = getState();
    next.proposal.tile = tile;
    next.proposal.selectionMade = true;
    return saveState(next);
  }

  function decisionTime() {
    const walkthrough = state.demoMode === 'walkthrough';
    const date = walkthrough ? new Date('2026-06-18T02:30:00.000Z') : new Date();
    return date.toLocaleString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', ...(walkthrough ? { timeZone: 'Asia/Singapore' } : {}) });
  }

  function clearPostApprovalProgress(next) {
    if (next.demoMode !== 'walkthrough') return;
    next.walkthrough.updatedBudgetViewed = false;
    next.walkthrough.paymentViewed = false;
  }

  function approveProposal() {
    if (!hasProposal()) throw new Error('Report the bathroom defect before reviewing its proposal.');
    if (state.proposal.status === 'approved') return getState();
    if (!isDesktop && !state.proposal.selectionMade) throw new Error('Choose a replacement tile before approving this change.');
    const next = getState();
    next.proposal.status = 'approved';
    next.proposal.selectionMade = true;
    next.proposal.approvedAt = decisionTime();
    clearPostApprovalProgress(next);
    const defect = next.defects.find(item => item.id === 'DEF-021');
    defect.status = 'scheduled';
    defect.description = `Hairline cracks across three bathroom floor tiles. You approved ${{ grigio: 'Grigio Matte', sabbia: 'Sabbia Matte', avorio: 'Avorio Matte' }[next.proposal.tile]} replacement tiles. Completion and payment are planned for 14 Jul 2026.`;
    addActivity(next, `You approved VO-015 (+${money(PROPOSAL_COST)}). Bathroom tile replacement is scheduled for completion on 14 Jul 2026.`);
    return saveState(next);
  }

  function requestRevision(text) {
    if (!hasProposal()) throw new Error('A proposal must be available before requesting changes.');
    if (state.proposal.status === 'approved') return getState();
    const description = requireText(typeof text === 'string' ? text.trim() : text, 'Revision request', 800, 10);
    const next = getState();
    next.proposal.revisionRequest = { text: description, savedAt: new Date().toISOString() };
    addActivity(next, 'You saved a revision request for VO-015. No change was approved.', 'file');
    return saveState(next);
  }

  function withdrawApproval() {
    const next = getState();
    const defect = next.defects.find(item => item.id === 'DEF-021');
    if (next.proposal.status !== 'approved' || defect.status !== 'scheduled') return next;
    next.proposal.lastApprovedAt = next.proposal.approvedAt;
    next.proposal.approvedAt = null;
    next.proposal.withdrawnAt = decisionTime();
    next.proposal.status = 'pending';
    clearPostApprovalProgress(next);
    defect.status = 'approval';
    defect.description = getInitialState().defects.find(item => item.id === 'DEF-021').description;
    addActivity(next, `You withdrew approval for VO-015. The ${money(PROPOSAL_COST)} change is no longer committed.`, 'refresh');
    return saveState(next);
  }

  function findDefect(next, id) {
    const defect = next.defects.find(item => item.id === id);
    if (!defect) throw new RangeError('The defect record was not found.');
    return defect;
  }

  function verifyRepair(id) {
    const next = getState();
    const defect = findDefect(next, id);
    if (defect.status !== 'verification') return next;
    defect.status = 'verified';
    delete defect.followupNote;
    addActivity(next, `You verified the repair for ${defect.id} in the ${defect.room.toLowerCase()}.`);
    return saveState(next);
  }

  function followupRepair(id, note = '') {
    const description = requireText(typeof note === 'string' ? note.trim() : note, 'Follow-up note', 800);
    const next = getState();
    const defect = findDefect(next, id);
    if (!['verification', 'verified'].includes(defect.status)) return next;
    defect.status = 'followup';
    if (description) defect.followupNote = description;
    else delete defect.followupNote;
    addActivity(next, `You recorded follow-up needed for ${defect.id}.`, 'refresh');
    return saveState(next);
  }

  function restoreVerification(id) {
    const next = getState();
    const defect = findDefect(next, id);
    if (defect.status !== 'followup') return next;
    defect.status = 'verification';
    delete defect.followupNote;
    addActivity(next, `You returned ${id} to ready for inspection.`, 'refresh');
    return saveState(next);
  }

  function addDefect(record) {
    if (!record || !ROOMS.includes(record.room) || !DEFECT_CATEGORIES.includes(record.category)) throw new TypeError('Choose a valid room and defect category.');
    const description = requireText(typeof record.description === 'string' ? record.description.trim() : record.description, 'Defect description', 800, 10);
    const photoName = requireText(record.photoName ?? '', 'Photo filename', 255);
    const samplePhotos = record.samplePhotos === undefined ? true : record.samplePhotos;
    if (typeof samplePhotos !== 'boolean') throw new TypeError('Sample photos must be enabled or disabled.');
    const next = getState();
    if (next.demoMode === 'walkthrough' && !next.walkthrough.reported) {
      if (record.room !== 'Bathroom' || record.category !== 'Flooring') throw new TypeError('The walkthrough starts with the bathroom flooring defect.');
      const defect = findDefect(next, 'DEF-021');
      Object.assign(defect, { description, photoName, samplePhotos, status: 'approval', reported: 'Just now' });
      next.defects = [defect, ...next.defects.filter(item => item.id !== defect.id)];
      next.walkthrough.reported = true;
      addActivity(next, 'You reported cracked bathroom tiles (DEF-021).', 'defect');
      addActivity(next, 'Demo update: John proposed three replacement tiles in VO-015 (+S$250, completion 14 Jul).', 'file');
      return saveState(next);
    }
    const nextId = Math.max(4, ...next.defects.map(defect => Number(defect.id.replace('DEF-', '')) || 0)) + 1;
    const id = `DEF-${String(nextId).padStart(3, '0')}`;
    next.defects.unshift({ id, room: record.room, category: record.category, title: `${record.category} issue`, description, status: 'reported', reported: 'Just now · local demo', photoName, samplePhotos });
    addActivity(next, `You saved a ${record.category.toLowerCase()} defect report for ${record.room.toLowerCase()} (${id}).`, 'defect');
    return saveState(next);
  }

  function requestDefectChange(id) {
    const next=getState();
    const defect=findDefect(next,id);
    if(defect.status!=='reported'||defect.changeRequest)return next;
    defect.changeRequest={savedAt:new Date().toISOString(),description:defect.description,room:defect.room,category:defect.category};
    addActivity(next,`You saved a change request for ${id}. No spending was approved.`,'file');
    return saveState(next);
  }

  function updateDefect(id, payload) {
    const next = getState();
    const defect = findDefect(next, id);
    if (defect.status !== 'reported') return next;
    if (!payload || typeof payload !== 'object') throw new TypeError('Provide the updated defect details.');
    const room = payload.room ?? defect.room;
    const category = payload.category ?? defect.category;
    if (!ROOMS.includes(room) || !DEFECT_CATEGORIES.includes(category)) throw new TypeError('Choose a valid room and defect category.');
    const descriptionValue = payload.description ?? defect.description;
    const description = requireText(typeof descriptionValue === 'string' ? descriptionValue.trim() : descriptionValue, 'Defect description', 800, 10);
    const photoName = requireText(payload.photoName ?? defect.photoName, 'Photo filename', 255);
    if (Object.prototype.hasOwnProperty.call(payload, 'samplePhotos')) {
      if (typeof payload.samplePhotos !== 'boolean') throw new TypeError('Sample photos must be enabled or disabled.');
      defect.samplePhotos = payload.samplePhotos;
    }
    Object.assign(defect, { room, category, description, photoName, title: `${category} issue`, updatedAt: new Date().toISOString() });
    addActivity(next, `You edited the local defect report ${id}.`, 'file');
    return saveState(next);
  }

  function withdrawDefect(id) {
    const next = getState();
    const defect = findDefect(next, id);
    if (defect.status !== 'reported') return next;
    defect.status = 'withdrawn';
    defect.withdrawnAt = new Date().toISOString();
    addActivity(next, `You withdrew the local defect report ${id}. The record is retained.`, 'refresh');
    return saveState(next);
  }

  function restoreDefect(id) {
    const next = getState();
    const defect = findDefect(next, id);
    if (defect.status !== 'withdrawn') return next;
    defect.status = 'reported';
    addActivity(next, `You restored the local defect report ${id}.`, 'refresh');
    return saveState(next);
  }

  function markNotificationsRead() {
    if (state.notificationsRead) return getState();
    const next = getState();
    next.notificationsRead = true;
    return saveState(next);
  }

  function reset() {
    const initial = getInitialState(activeMode);
    if (activeMode === 'walkthrough') initial.walkthrough.guidance = state.walkthrough.guidance;
    return saveState(initial);
  }

  function restartWalkthrough() {
    if (STUDY_CONTEXT) throw new Error('Open the full walkthrough to restart the complete scenario.');
    if (isDesktop) throw new Error('Open the mobile app to restart the full walkthrough.');
    const previous = activeMode === 'walkthrough' ? state : readSavedState('walkthrough');
    const initial = getInitialState('walkthrough');
    initial.walkthrough.guidance = previous.walkthrough.guidance;
    activeMode = 'walkthrough';
    try { root.localStorage.setItem(DEMO_MODE_KEY, activeMode); }
    catch { storageAvailable = false; }
    return saveState(initial);
  }

  function switchDemo(mode) {
    if (STUDY_CONTEXT) return getState();
    if (!['explore', 'walkthrough'].includes(mode)) throw new TypeError('Choose a valid demo mode.');
    if (mode === activeMode) return getState();
    activeMode = mode;
    state = readSavedState(mode);
    try { root.localStorage.setItem(DEMO_MODE_KEY, mode); }
    catch { storageAvailable = false; }
    notify('local');
    return getState();
  }

  function markWalkthroughStep(step) {
    if (state.demoMode !== 'walkthrough' || !state.walkthrough.reported || !['reviewed', 'quoteRead', 'budgetChecked', 'updatedBudgetViewed', 'paymentViewed'].includes(step) || state.walkthrough[step]) return getState();
    if (['updatedBudgetViewed', 'paymentViewed'].includes(step) && state.proposal.status !== 'approved') return getState();
    const next = getState();
    next.walkthrough[step] = true;
    return saveState(next);
  }

  function setWalkthroughGuidance(enabled) {
    if (STUDY_CONTEXT) return getState();
    if (typeof enabled !== 'boolean') throw new TypeError('Walkthrough guidance must be enabled or disabled.');
    if (state.demoMode !== 'walkthrough' || state.walkthrough.guidance === enabled) return getState();
    const next = getState();
    next.walkthrough.guidance = enabled;
    return saveState(next);
  }

  function recordTilePreview(tile) {
    if (!['grigio', 'sabbia', 'avorio'].includes(tile)) throw new TypeError('Preview a proposed tile.');
    if (state.demoMode !== 'walkthrough' || !state.walkthrough.reported || state.walkthrough.previewedTiles.includes(tile)) return getState();
    const next = getState();
    next.walkthrough.previewedTiles.push(tile);
    next.walkthrough.previewed = next.walkthrough.previewedTiles.length === 3;
    return saveState(next);
  }

  root.addEventListener?.('storage', event => {
    if (STUDY_CONTEXT) return;
    if ((event.key === DEMO_MODE_KEY || event.key === null) && !isDesktop) activeMode = preferredMode();
    else if (event.key !== storageKey(activeMode) && event.key !== null) return;
    state = readSavedState();
    notify('storage');
  });

  root.RenoGuardStore = Object.freeze({
    constants: Object.freeze({ PROPOSAL_COST, PROJECT_BUDGET, ORIGINAL_COMMITMENT, ROOMS, DEFECT_CATEGORIES, UI_VARIANT, VARIANT_CONTEXT, STUDY_CONTEXT, STUDY_MODE, SCENARIO_DATE }),
    getInitialState,
    getState,
    saveState,
    getMetrics,
    getProjectDefects,
    hasProposal,
    money,
    get storageAvailable() { return storageAvailable; },
    subscribe,
    selectTile,
    approveProposal,
    withdrawApproval,
    requestRevision,
    verifyRepair,
    followupRepair,
    restoreVerification,
    addDefect,
    requestDefectChange,
    updateDefect,
    withdrawDefect,
    restoreDefect,
    markNotificationsRead,
    reset,
    restartWalkthrough,
    switchDemo,
    markWalkthroughStep,
    setWalkthroughGuidance,
    recordTilePreview
  });
})(typeof window === 'undefined' ? globalThis : window);
