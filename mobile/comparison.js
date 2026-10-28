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
      tone: 'Cool grey',
      note: 'Grey stone with fine veining',
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
      tone: 'Warm sand',
      note: 'Soft sandstone texture',
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
      tone: 'Ivory mineral',
      note: 'Ivory porcelain with fine mineral flecks',
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

  function choice(option, selectedTile, disabled) {
    return `<label class="comparison-choice"><input type="radio" name="replacement-tile" data-review-tile="${option.selectionKey}" value="${option.selectionKey}" aria-label="Choose ${escapeHTML(option.tile)}"${selectedTile === option.selectionKey ? ' checked' : ''}${disabled ? ' disabled' : ''}></label>`;
  }

  function tileIdentity(option, titleTag = 'strong') {
    return `<img src="${option.image}" alt="${escapeHTML(option.tile)} tile sample"><div class="comparison-identity"><small class="comparison-option-label">${escapeHTML(option.label)}</small><${titleTag} class="comparison-tile-name">${escapeHTML(option.tile)}</${titleTag}></div>`;
  }

  function table(selectedTile, disabled) {
    const options = proposedTiles();
    return `<div class="comparison-carousel" data-comparison-variant="a"><p class="comparison-swipe-hint" id="comparison-hint">Swipe left or use the arrows to compare 3 options.</p><div class="comparison-table-wrap" id="comparison-scroll" tabindex="0" role="region" aria-label="Tile comparison" aria-describedby="comparison-hint">
      <table class="comparison-table">
        <caption class="sr-only">Three replacement options for the unavailable original bathroom tile</caption>
        <colgroup><col class="comparison-label-column">${options.map(() => '<col class="comparison-option-column">').join('')}</colgroup>
        <thead><tr><th scope="col">Details</th>${proposedTiles().map(option => `<th scope="col"${columnAttributes(option, '', selectedTile)}>${tileIdentity(option)}</th>`).join('')}</tr></thead>
        <tbody>${ROW_ORDER.filter(field => field !== 'tile').map(field => `<tr data-specification="${field}"><th scope="row">${escapeHTML(LABELS[field])}</th>${proposedTiles().map(option => `<td${columnAttributes(option, field, selectedTile)}>${valueHTML(option, field)}</td>`).join('')}</tr>`).join('')}<tr class="comparison-selection"><th scope="row">Your choice</th>${proposedTiles().map(option => `<td${columnAttributes(option, '', selectedTile)}>${choice(option, selectedTile, disabled)}</td>`).join('')}</tr></tbody>
      </table>
    </div><nav class="comparison-pager" aria-label="Tile comparison options"><button type="button" class="comparison-arrow" data-comparison-step="-1" aria-label="Previous tile option" disabled>${symbol('back')}</button><div class="comparison-position"><p class="comparison-position-label" role="status" aria-live="polite">Option A · 1 of 3</p><div class="comparison-pages">${options.map((option, index) => `<button type="button" data-comparison-page="${index}" aria-label="View ${escapeHTML(option.label)}: ${escapeHTML(option.tile)}"${index === 0 ? ' aria-current="true"' : ''}><span aria-hidden="true"></span></button>`).join('')}</div></div><button type="button" class="comparison-arrow" data-comparison-step="1" aria-label="Next tile option">${symbol('arrow')}</button></nav></div>`;
  }

  function cards(selectedTile, disabled) {
    return `<div class="comparison-cards" data-comparison-variant="b">${proposedTiles().map(option => `<article class="comparison-card${selectedTile === option.selectionKey ? ' is-selected' : ''}"><div class="comparison-card-content"><header class="comparison-card-heading">${tileIdentity(option, 'h3')}</header><dl>${ROW_ORDER.filter(field => field !== 'tile').map(field => `<div data-specification="${field}"><dt>${escapeHTML(LABELS[field])}</dt><dd>${valueHTML(option, field)}</dd></div>`).join('')}</dl></div>${choice(option, selectedTile, disabled)}</article>`).join('')}</div>`;
  }

  function originalBrief() {
    return `<div class="review-original"><img src="${DATA[0].image}" alt="Bianco Matte tile sample"><div><small>Original specification</small><strong>Bianco Matte</strong><span>600 × 600 mm · Matte porcelain</span><span class="original-stock">Out of stock until Sep 2026</span></div></div>`;
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

  function mount(root, { initialIndex = 0, onPositionChange = () => {} } = {}) {
    const carousel = root.querySelector('.comparison-carousel');
    if (!carousel) return null;
    const scroller = carousel.querySelector('.comparison-table-wrap');
    const options = proposedTiles();
    const clamp = value => Math.max(0, Math.min(options.length - 1, Number(value) || 0));
    let index = clamp(initialIndex);
    let optionWidth = 1;
    let requestedIndex = null;
    const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const update = () => {
      carousel.querySelector('[data-comparison-step="-1"]').disabled = index === 0;
      carousel.querySelector('[data-comparison-step="1"]').disabled = index === options.length - 1;
      carousel.querySelector('.comparison-position-label').textContent = `${options[index].label} · ${index + 1} of ${options.length}`;
      carousel.querySelectorAll('[data-comparison-page]').forEach(button => {
        if (Number(button.dataset.comparisonPage) === index) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });
      onPositionChange(index);
    };
    const goTo = (next, animate = true) => {
      index = clamp(next);
      const smooth = animate && !reducedMotion();
      requestedIndex = smooth ? index : null;
      scroller.scrollTo({ left: index * optionWidth, behavior: smooth ? 'smooth' : 'instant' });
      update();
    };
    const layout = () => {
      if (!scroller.clientWidth) return;
      const labelWidth = Math.round(Math.max(88, Math.min(104, scroller.clientWidth * .29)));
      optionWidth = scroller.clientWidth - labelWidth;
      carousel.style.setProperty('--comparison-label-width', `${labelWidth}px`);
      carousel.style.setProperty('--comparison-option-width', `${optionWidth}px`);
      goTo(index, false);
    };
    const onScroll = () => {
      if (requestedIndex !== null) {
        if (Math.abs(scroller.scrollLeft - requestedIndex * optionWidth) > 2) return;
        requestedIndex = null;
      }
      index = clamp(Math.round(scroller.scrollLeft / optionWidth));
      update();
    };
    const manualScroll = () => { requestedIndex = null; };
    const onClick = event => {
      const button = event.target.closest('[data-comparison-step], [data-comparison-page]');
      if (!button || !carousel.contains(button)) return;
      goTo(button.hasAttribute('data-comparison-page') ? Number(button.dataset.comparisonPage) : index + Number(button.dataset.comparisonStep));
    };
    const onKeyDown = event => {
      if (event.target !== scroller || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      goTo(event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : index + (event.key === 'ArrowRight' ? 1 : -1));
    };
    const observer = new ResizeObserver(layout);
    observer.observe(scroller);
    scroller.addEventListener('scroll', onScroll, { passive: true });
    scroller.addEventListener('pointerdown', manualScroll, { passive: true });
    scroller.addEventListener('wheel', manualScroll, { passive: true });
    carousel.addEventListener('click', onClick);
    scroller.addEventListener('keydown', onKeyDown);
    layout();
    return {
      goTo,
      destroy() {
        observer.disconnect();
        scroller.removeEventListener('scroll', onScroll);
        scroller.removeEventListener('pointerdown', manualScroll);
        scroller.removeEventListener('wheel', manualScroll);
        carousel.removeEventListener('click', onClick);
        scroller.removeEventListener('keydown', onKeyDown);
      }
    };
  }

  window.RenoGuardComparison = Object.freeze({
    materials: Object.freeze(Object.fromEntries(proposedTiles().map(option => [option.selectionKey, Object.freeze({ name: option.tile, label: option.label, tone: option.tone, note: option.note, image: option.image })]))),
    render(variant = 'a', { selectedTile = null, disabled = false } = {}) {
      return `<fieldset class="comparison-options"><legend class="sr-only">Compare the original tile and choose a replacement</legend>${String(variant).toLowerCase() === 'b' ? cards(selectedTile, disabled) : table(selectedTile, disabled)}</fieldset>`;
    },
    originalBrief,
    impact,
    selectionSummary,
    mount
  });
})();
