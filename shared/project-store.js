/* Shared project data for the desktop and mobile prototypes.
   Replace this local adapter with a backend adapter when the project needs one. */
((root) => {
  'use strict';

  const STORAGE_KEY = 'renoguard.homeowner.v1';
  const PROPOSAL_COST = 180;
  const PROJECT_BUDGET = 45000;
  const ORIGINAL_COMMITMENT = 42250;
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

  function getInitialState() {
    return {
      version: 1,
      proposal: { status: 'pending', approvedAt: null },
      notificationsRead: false,
      defects: [
        { id: 'DEF-002', room: 'Main bedroom', title: 'Cracked floor tiles', category: 'Flooring', status: 'approval', description: 'Two floor tiles near the window are cracked. The original tile is out of stock until 12 Oct.', reported: '13 Sep 2026', photoName: '' },
        { id: 'DEF-003', room: 'Kitchen', title: 'Cabinet doors realigned', category: 'Carpentry', status: 'verification', description: 'The contractor has adjusted the cabinet hinges. Check that the doors align and open smoothly before marking the repair as verified.', reported: '15 Sep 2026', photoName: '' },
        { id: 'DEF-004', room: 'Bedroom 2', title: 'Paint touch-up', category: 'Painting', status: 'scheduled', description: 'Uneven paint coverage near the door frame. A touch-up is scheduled for 19 Sep.', reported: '16 Sep 2026', photoName: '' },
        { id: 'DEF-001', room: 'Living room', title: 'Loose power outlet secured', category: 'Electrical', status: 'verified', description: 'The outlet was secured and checked. The homeowner verified the repair on 15 Sep.', reported: '14 Sep 2026', photoName: '' }
      ],
      activity: [
        { title: 'Tile replacement proposed', text: 'Main bedroom · +S$180, no handover delay', time: '17 Sep · John Tan', type: 'file' },
        { title: 'Cabinet alignment completed', text: 'Kitchen · Ready for your inspection', time: '16 Sep · John Tan', type: 'check' },
        { title: 'Paint touch-up scheduled', text: 'Bedroom 2 · Planned for 19 Sep', time: '16 Sep · John Tan', type: 'clock' }
      ]
    };
  }

  function requireText(value, name, maxLength, minLength = 0) {
    if (typeof value !== 'string' || value.length < minLength || value.length > maxLength) {
      throw new TypeError(`${name} must contain ${minLength}–${maxLength} characters.`);
    }
    return value;
  }

  function validateState(value) {
    if (!value || value.version !== 1 || !Array.isArray(value.defects) || !Array.isArray(value.activity) || !['pending', 'approved'].includes(value.proposal?.status)) {
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
      if (typeof defect.followupNote === 'string' && defect.followupNote) record.followupNote = requireText(defect.followupNote, 'Follow-up note', 800);
      ['updatedAt', 'withdrawnAt'].forEach(key => {
        if (typeof defect[key] === 'string') record[key] = requireText(defect[key], 'Record date', 120);
      });
      return record;
    });
    if (!defaults.defects.every(defect => seen.has(defect.id))) throw new TypeError('The sample project records must be retained.');
    const proposal = {
      status: value.proposal.status,
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
    return { version: 1, proposal, notificationsRead: Boolean(value.notificationsRead), defects, activity };
  }

  function readSavedState() {
    let saved;
    try {
      saved = root.localStorage.getItem(STORAGE_KEY);
      storageAvailable = true;
    } catch {
      storageAvailable = false;
      return getInitialState();
    }
    if (!saved) return getInitialState();
    try {
      return validateState(JSON.parse(saved));
    } catch {
      // Corrupt or obsolete demo data should not prevent either interface opening.
      return getInitialState();
    }
  }

  let state = readSavedState();

  function getState() {
    return clone(state);
  }

  function getMetrics(projectState = state) {
    const approved = ORIGINAL_COMMITMENT + (projectState.proposal.status === 'approved' ? PROPOSAL_COST : 0);
    const pending = projectState.proposal.status === 'pending' ? 1 : 0;
    return {
      approved,
      available: PROJECT_BUDGET - approved,
      openDefects: projectState.defects.filter(defect => !['verified', 'withdrawn'].includes(defect.status)).length,
      pending,
      actions: pending + projectState.defects.filter(defect => ['verification', 'followup'].includes(defect.status)).length
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
    state = validateState(next);
    try {
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

  function approveProposal() {
    if (state.proposal.status === 'approved') return getState();
    const next = getState();
    next.proposal.status = 'approved';
    next.proposal.approvedAt = new Date().toLocaleString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    const defect = next.defects.find(item => item.id === 'DEF-002');
    defect.status = 'scheduled';
    defect.description = 'Two floor tiles near the window are cracked. The original tile is out of stock until 12 Oct. You approved the Ivory Sand replacement; repair is planned for 19 Sep.';
    addActivity(next, `You approved VO-003 (+${money(PROPOSAL_COST)}). Main bedroom repair is scheduled for 19 Sep.`);
    return saveState(next);
  }

  function requestRevision(text) {
    if (state.proposal.status === 'approved') return getState();
    const description = requireText(typeof text === 'string' ? text.trim() : text, 'Revision request', 800, 10);
    const next = getState();
    next.proposal.revisionRequest = { text: description, savedAt: new Date().toISOString() };
    addActivity(next, 'You saved a revision request for VO-003. No change was approved.', 'file');
    return saveState(next);
  }

  function withdrawApproval() {
    const next = getState();
    const defect = next.defects.find(item => item.id === 'DEF-002');
    if (next.proposal.status !== 'approved' || defect.status !== 'scheduled') return next;
    next.proposal.lastApprovedAt = next.proposal.approvedAt;
    next.proposal.approvedAt = null;
    next.proposal.withdrawnAt = new Date().toLocaleString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    next.proposal.status = 'pending';
    defect.status = 'approval';
    defect.description = getInitialState().defects.find(item => item.id === 'DEF-002').description;
    addActivity(next, `You withdrew approval for VO-003. The ${money(PROPOSAL_COST)} change is no longer committed.`, 'refresh');
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
    const next = getState();
    const nextId = Math.max(4, ...next.defects.map(defect => Number(defect.id.replace('DEF-', '')) || 0)) + 1;
    const id = `DEF-${String(nextId).padStart(3, '0')}`;
    next.defects.unshift({ id, room: record.room, category: record.category, title: `${record.category} issue`, description, status: 'reported', reported: 'Just now · local demo', photoName });
    addActivity(next, `You saved a ${record.category.toLowerCase()} defect report for ${record.room.toLowerCase()} (${id}).`, 'defect');
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
    return saveState(getInitialState());
  }

  root.addEventListener?.('storage', event => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    state = readSavedState();
    notify('storage');
  });

  root.RenoGuardStore = Object.freeze({
    constants: Object.freeze({ PROPOSAL_COST, PROJECT_BUDGET, ORIGINAL_COMMITMENT, ROOMS, DEFECT_CATEGORIES }),
    getInitialState,
    getState,
    saveState,
    getMetrics,
    money,
    get storageAvailable() { return storageAvailable; },
    subscribe,
    approveProposal,
    withdrawApproval,
    requestRevision,
    verifyRepair,
    followupRepair,
    restoreVerification,
    addDefect,
    updateDefect,
    withdrawDefect,
    restoreDefect,
    markNotificationsRead,
    reset
  });
})(typeof window === 'undefined' ? globalThis : window);
