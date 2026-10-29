const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../mobile/loop11-completion.js'), 'utf8');

function harness(query = 'variant=a&study=quotation&l11_uid=112897', options = {}) {
  let clicks = 0;
  let available = !options.missing;
  const timers = [], notes = [];
  const location = { href: `https://example.test/?${query}&approved_tile=sabbia#approval-receipt/sabbia` };
  const button = { disabled: !!options.disabled, getAttribute: () => null,
    getClientRects: () => options.hidden ? [] : [{}], click: () => { clicks++; } };
  const document = {
    querySelector: () => options.noReceipt ? null : {},
    createElement: () => ({ isConnected: true, setAttribute() {} }),
    getElementById(id) {
      if (id === 'content') return { appendChild: note => notes.push(note) };
      if (id !== 'loop11-eui-iframe') throw Error('Unexpected target');
      if (options.crossOrigin) return { get contentDocument() { throw Error('SecurityError'); } };
      return available ? { contentDocument: { getElementById(id) {
        assert.equal(id, 'loop11_eui_id_completeTaskButton'); return button;
      } } } : null;
    }
  };
  const window = { setTimeout: callback => timers.push(callback) };
  vm.runInNewContext(source, { window, document, location, URL });
  return { fire: tile => window.RenoGuardLoop11.approvalRecorded(tile),
    flush() { let limit = 100; while (timers.length && limit--) timers.shift()(); assert.ok(limit > 0); },
    ready() { available = true; }, location, notes, clicks: () => clicks };
}
for (const [variant, uid] of [['a', '112897'], ['b', '112898']]) {
  test(`Version ${variant}: delayed, once-only completion`, () => {
    const h = harness(`variant=${variant}&study=quotation&l11_uid=${uid}`);
    h.fire('sabbia'); h.fire('sabbia'); assert.equal(h.clicks(), 0);
    h.flush(); h.fire('sabbia'); h.flush(); assert.equal(h.clicks(), 1);
  });
}
for (const query of ['', 'variant=a&study=quotation', 'variant=a&walkthrough=1&l11_uid=112897',
  'variant=b&study=quotation&l11_uid=112897', 'variant=a&study=quotation&l11_uid=112897&l11_autocomplete=0']) {
  test(`Does not activate outside the intended study: ${query}`, () => {
    const h = harness(query); h.fire('sabbia'); h.flush(); assert.equal(h.clicks(), 0); assert.equal(h.notes.length, 0);
  });
}
test('Wrong tile and absent receipt do not complete', () => {
  for (const h of [harness(), harness(undefined, { noReceipt: true })]) {
    h.fire('grigio'); h.flush(); assert.equal(h.clicks(), 0);
  }
  const h = harness(undefined, { noReceipt: true }); h.fire('sabbia'); h.flush(); assert.equal(h.clicks(), 0);
});
test('Navigating away cancels pending completion', () => {
  const h = harness(); h.fire('sabbia'); h.location.href = 'https://example.test/#budget';
  h.flush(); assert.equal(h.clicks(), 0);
});
for (const options of [{ missing: true }, { crossOrigin: true }, { disabled: true }, { hidden: true }]) {
  test(`Safe manual fallback: ${JSON.stringify(options)}`, () => {
    const h = harness(undefined, options); h.fire('sabbia'); h.flush();
    assert.equal(h.clicks(), 0); assert.match(h.notes[0].textContent, /Select.*Task completed/);
  });
}
test('Waits for a late-loaded Loop11 interface', () => {
  const h = harness(undefined, { missing: true }); h.fire('sabbia'); h.ready(); h.flush(); assert.equal(h.clicks(), 1);
});
