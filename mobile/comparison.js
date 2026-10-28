/* Table and card comparisons share quotation facts and approval controls. */
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
    }),
    Object.freeze({
      key: 'option-c',
      selectionKey: 'avorio',
      label: 'Option C',
      tile: 'Avorio Matte',
      image: 'assets/materials/avorio.svg',
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

  function choice(option, selectedTile, disabled, showText = false) {
    return `<label class="comparison-choice"><input type="radio" name="replacement-tile" data-review-tile="${option.selectionKey}" value="${option.selectionKey}" aria-label="Choose ${escapeHTML(option.tile)}"${selectedTile === option.selectionKey ? ' checked' : ''}${disabled ? ' disabled' : ''}>${showText ? '<span>Choose this tile</span>' : ''}</label>`;
  }

  function tileIdentity(option, titleTag = 'strong') {
    return `<img src="${option.image}" alt="${escapeHTML(option.tile)} tile sample"><div class="comparison-identity"><small class="comparison-option-label">${escapeHTML(option.label)}</small><${titleTag} class="comparison-tile-name">${escapeHTML(option.tile)}</${titleTag}></div>`;
  }

  function table(selectedTile, disabled) {
    return `<div class="comparison-carousel" data-comparison-variant="a"><p class="comparison-swipe-hint">Swipe the table or use the arrows to compare all three options</p><div class="comparison-table-wrap" id="comparison-scroll" tabindex="0" aria-label="Scrollable tile comparison table">
      <table class="comparison-table">
        <caption class="sr-only">Three replacement options for the unavailable original bathroom tile</caption>
        <thead><tr><th scope="col">Details</th>${proposedTiles().map(option => `<th scope="col"${columnAttributes(option, '', selectedTile)}>${tileIdentity(option)}</th>`).join('')}</tr></thead>
        <tbody>${ROW_ORDER.filter(field => field !== 'tile').map(field => `<tr data-specification="${field}"><th scope="row">${escapeHTML(LABELS[field])}</th>${proposedTiles().map(option => `<td${columnAttributes(option, field, selectedTile)}>${valueHTML(option, field)}</td>`).join('')}</tr>`).join('')}<tr class="comparison-selection"><th scope="row">Your choice</th>${proposedTiles().map(option => `<td${columnAttributes(option, '', selectedTile)}>${choice(option, selectedTile, disabled)}</td>`).join('')}</tr></tbody>
      </table>
    </div><div class="comparison-pager"><button type="button" data-action="comparison-prev" aria-label="Previous tile option">‹</button><span class="comparison-pages" aria-label="Table position"><i class="active"></i><i></i><i></i></span><button type="button" data-action="comparison-next" aria-label="Next tile option">›</button></div></div>`;
  }

  function cards(selectedTile, disabled) {
    return `<div class="comparison-cards" data-comparison-variant="b">${proposedTiles().map(option => `<article class="comparison-card${selectedTile === option.selectionKey ? ' is-selected' : ''}"><header class="comparison-card-heading">${tileIdentity(option, 'h3')}</header><dl>${ROW_ORDER.filter(field => field !== 'tile').map(field => `<div data-specification="${field}"><dt>${escapeHTML(LABELS[field])}</dt><dd>${valueHTML(option, field)}</dd></div>`).join('')}</dl><div class="comparison-card-choice">${choice(option, selectedTile, disabled, true)}</div></article>`).join('')}</div>`;
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

  window.RenoGuardComparison = Object.freeze({
    render(variant = 'a', { selectedTile = null, disabled = false } = {}) {
      return `<fieldset class="comparison-options"><legend class="sr-only">Compare the original tile and choose a replacement</legend>${String(variant).toLowerCase() === 'b' ? cards(selectedTile, disabled) : table(selectedTile, disabled)}</fieldset>`;
    },
    originalBrief,
    impact,
    selectionSummary
  });
})();
