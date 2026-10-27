/* Shared review components keep quotation facts and decision controls identical. */
(() => {
  'use strict';

  const DATA = Object.freeze([
    Object.freeze({
      key: 'original',
      selectionKey: null,
      label: 'Original',
      tile: 'Bianco Matte',
      image: 'assets/materials/bianco.webp',
      size: '600 × 600 mm',
      finish: 'Matte porcelain',
      stock: 'Out of stock',
      extraCost: '—',
      completion: '1 Jul 2026',
      completionNote: 'Original agreed target'
    }),
    Object.freeze({
      key: 'option-a',
      selectionKey: 'grigio',
      label: 'Option A',
      tile: 'Grigio Matte',
      image: 'assets/materials/grigio.webp',
      size: '600 × 600 mm',
      finish: 'Matte porcelain',
      stock: 'Available',
      extraCost: '+S$250',
      completion: '14 Jul 2026'
    }),
    Object.freeze({
      key: 'option-b',
      selectionKey: 'sabbia',
      label: 'Option B',
      tile: 'Sabbia Matte',
      image: 'assets/materials/sabbia.webp',
      size: '600 × 600 mm',
      finish: 'Matte porcelain',
      stock: 'Available',
      extraCost: '+S$250',
      completion: '14 Jul 2026'
    })
  ]);

  const LABELS = Object.freeze({ tile: 'Tile', size: 'Size', finish: 'Finish', stock: 'Stock*', extraCost: 'Extra cost', completion: 'Completion' });
  const ROW_ORDER = Object.freeze(['tile', 'size', 'finish', 'stock', 'extraCost', 'completion']);

  const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  function valueHTML(option, field) {
    const value = escapeHTML(option[field]);
    return field === 'completion' && option.completionNote
      ? `${value}<small class="comparison-original-target">${escapeHTML(option.completionNote)}</small>`
      : value;
  }

  function columnAttributes(option, field, selectedTile) {
    const classes = [];
    if (option.key === 'original' && field === 'stock') classes.push('stock-alert');
    if (option.selectionKey && option.selectionKey === selectedTile) classes.push('is-selected');
    return `${option.selectionKey ? ` data-tile-column="${option.selectionKey}"` : ''}${classes.length ? ` class="${classes.join(' ')}"` : ''}`;
  }

  const proposedTiles = () => DATA.filter(option => option.selectionKey);
  const formatMoney = value => `S$${Number(value).toLocaleString('en-SG')}`;
  const symbol = name => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;

  function table(variant, selectedTile) {
    return `<div class="quotation-comparison comparison-table-wrap" data-comparison-variant="${variant}">
      <table class="comparison-table">
        <caption class="sr-only">Original bathroom tile specification and two replacement options</caption>
        <thead><tr><th scope="col">Specification</th>${DATA.map(option => `<th scope="col"${columnAttributes(option, '', selectedTile)}><img src="${option.image}" alt="${escapeHTML(option.tile)} tile sample">${escapeHTML(option.label)}</th>`).join('')}</tr></thead>
        <tbody>${ROW_ORDER.map(field => `<tr data-specification="${field}"><th scope="row">${escapeHTML(LABELS[field])}</th>${DATA.map(option => `<td${columnAttributes(option, field, selectedTile)}>${valueHTML(option, field)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>`;
  }

  function choices({ selectedTile = null, disabled = false } = {}) {
    const tones = { grigio: 'Cool grey', sabbia: 'Warm sand' };
    return `<fieldset class="review-tile-options"><legend class="sr-only">Choose your replacement tile</legend>${proposedTiles().map(option => `<label class="review-tile-option${selectedTile === option.selectionKey ? ' is-selected' : ''}${disabled ? ' is-disabled' : ''}"><img src="${option.image}" alt=""><span class="review-tile-copy"><small>${escapeHTML(option.label)} · ${tones[option.selectionKey]}</small><strong>${escapeHTML(option.tile)}</strong><span>600 × 600 mm · Matte porcelain</span></span><input type="radio" name="replacement-tile" data-review-tile="${option.selectionKey}" value="${option.selectionKey}" aria-label="Choose ${escapeHTML(option.tile)}"${selectedTile === option.selectionKey ? ' checked' : ''}${disabled ? ' disabled' : ''}></label>`).join('')}</fieldset>`;
  }

  function originalBrief() {
    return `<div class="review-original"><img src="${DATA[0].image}" alt="Bianco Matte tile sample"><div><small>Original tile</small><strong>Bianco Matte</strong><span>Out of stock until Sep 2026</span></div></div>`;
  }

  function impact({ availableBudget = 30000, approved = false } = {}) {
    const available = Number.isFinite(Number(availableBudget)) ? Number(availableBudget) : 30000;
    const before = approved ? available + 250 : available;
    const after = approved ? available : available - 250;
    return `<div class="review-impact"><div class="review-added-cost"><span>Additional cost</span><strong>+S$250</strong></div><dl class="review-impact-details"><div><dt>Remaining budget</dt><dd><span><small>Before this change</small><span>${formatMoney(before)}</span></span>${symbol('arrow')}<strong><small>${approved ? 'After approval' : 'If approved'}</small><span>${formatMoney(after)}</span></strong></dd></div><div><dt>Completion date</dt><dd><span><small>Original target</small><time datetime="2026-07-01">1 Jul 2026</time></span>${symbol('arrow')}<strong><small>Revised target</small><time datetime="2026-07-14">14 Jul 2026</time></strong></dd><p>About 2 weeks later</p></div></dl><div class="review-payment">${symbol('clock')}<span><strong>New bathroom tiles</strong><small>${approved ? 'S$250 due 14 Jul 2026' : 'If approved: S$250 due 14 Jul 2026'}</small></span></div></div>`;
  }

  function selectionSummary({ selectedTile = null, editTarget = '' } = {}) {
    const tile = proposedTiles().find(option => option.selectionKey === selectedTile);
    if (!tile) return '<div class="review-selection-summary is-empty" data-review-selection=""><span>Choose a replacement tile before approving.</span></div>';
    return `<div class="review-selection-summary" data-review-selection="${tile.selectionKey}"><img src="${tile.image}" alt="${escapeHTML(tile.tile)} tile sample"><span><small>Chosen tile</small><strong>${escapeHTML(tile.tile)}</strong></span>${editTarget ? `<a href="#${escapeHTML(editTarget)}" aria-label="Change your chosen tile">Change</a>` : ''}</div>`;
  }

  function progress(step, { canContinue = false, canConfirm = false } = {}) {
    const current = Math.min(3, Math.max(1, Number(step) || 1));
    const steps = [
      { title: 'Tile', route: 'change/VO-015', enabled: true },
      { title: 'Cost & timing', route: 'change/VO-015/impact', enabled: canContinue },
      { title: 'Confirm', route: 'approve/VO-015', enabled: canConfirm }
    ];
    return `<nav class="review-progress" aria-label="Approval review steps"><ol>${steps.map((item, index) => {
      const number = index + 1;
      const body = `<span class="review-step-number" aria-hidden="true">${number < current ? symbol('check') : number}</span><span>${item.title}</span>`;
      return `<li class="${number === current ? 'is-current' : number < current ? 'is-complete' : ''}">${number === current ? `<span aria-current="step"><span class="sr-only">Step ${number} of 3: </span>${body}</span>` : item.enabled ? `<a href="#${item.route}" aria-label="Step ${number}: ${item.title}">${body}</a>` : `<span aria-disabled="true"><span class="sr-only">Step ${number}: </span>${body}</span>`}</li>`;
    }).join('')}</ol></nav>`;
  }

  window.RenoGuardComparison = Object.freeze({
    render(variant = 'a', { selectedTile = null } = {}) {
      return table(String(variant).toLowerCase() === 'b' ? 'b' : 'a', selectedTile);
    },
    choices,
    originalBrief,
    impact,
    selectionSummary,
    progress
  });
})();
