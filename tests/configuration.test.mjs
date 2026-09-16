import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom' });
after(() => server.close());
const { validateDocumentAttributes, displayAttribute } = await server.ssrLoadModule('/src/features/documents/utils/documentValidation.ts');
const { DocumentFields } = await server.ssrLoadModule('/src/features/documents/components/DocumentFields.tsx');
const { documentsApi } = await server.ssrLoadModule('/src/api/documents.ts');
const catalog = async name => {
  const source = JSON.parse(await readFile(new URL(`../../corelia/corelia-system-tests/src/test/resources/customers/${name}/configuration.json`, import.meta.url), 'utf8'));
  return source.documentTypes.map(type => ({ ...type, name: type.title, statuses: type.presentation.statuses, initialAttachmentRequired: type.attachments.initialRequired }));
};

test('one form renderer accepts two independently configured catalogs', async () => {
  const a = await catalog('customer-a'), b = await catalog('customer-b');
  assert.equal(a.length, 2); assert.equal(b.length, 5);
  for (const definition of [...a, ...b]) {
    const value = definition.schema.properties.value.type === 'boolean' ? false : 0;
    const attributes = { title: 'Example', value };
    assert.equal(validateDocumentAttributes({ documentTypeId: definition.id, attributes }, definition), null);
    const html = renderToStaticMarkup(React.createElement(DocumentFields, { definition, value: attributes, onChange() {} }));
    for (const name of definition.ui.fields) assert.ok(html.includes(definition.schema.properties[name].title || name));
    assert.ok(!html.includes('СНИЛС'));
  }
  assert.notEqual(validateDocumentAttributes({ documentTypeId: a[0].id, attributes: { title: 'One', value: false } }, b[0]), null);
  assert.equal(displayAttribute(false), 'Нет'); assert.equal(displayAttribute(0), '0');
});

test('schema rules handle calendar dates, unicode length, integers and enums', () => {
  const type = { id: 'TEST', schema: { required: ['date', 'count'], properties: {
    date: { type: 'string', format: 'date' }, count: { type: 'integer', minimum: 0, maximum: 3 },
    label: { type: 'string', maxLength: 1 }, option: { type: 'string', enum: ['a', 'b'] },
  } } };
  const payload = { documentTypeId: 'TEST', attributes: { date: '2024-02-29', count: 0, label: '😀', option: 'a' } };
  assert.equal(validateDocumentAttributes(payload, type), null);
  for (const [field, value] of [['date', '2026-02-30'], ['count', 1.5], ['count', 4], ['label', '😀😀'], ['option', 'c']]) {
    assert.notEqual(validateDocumentAttributes({ ...payload, attributes: { ...payload.attributes, [field]: value } }, type), null);
  }
});

test('API preserves arbitrary attributes and command concurrency metadata', async () => {
  const calls = [];
  const oldFetch = globalThis.fetch;
  const document = { id: 'doc', typeCode: 'CUSTOM', typeName: 'Custom', attributes: { enabled: false, amount: 0, label: 'Title' }, status: 'OPEN', statusLabel: 'Open', version: 2, changeToken: 'next' };
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), method: init?.method, body: init?.body ? JSON.parse(init.body) : undefined });
    return new Response(JSON.stringify(document), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const created = await documentsApi.create({ documentTypeId: 'CUSTOM', attributes: document.attributes, requestId: 'create-key' });
    assert.deepEqual(created.attributes, document.attributes);
    assert.deepEqual(calls[0].body.attributes, document.attributes);
    assert.equal(calls[0].body.requestId, 'create-key');
    await documentsApi.update('doc', { documentTypeId: 'CUSTOM', attributes: document.attributes, expectedVersion: 1, changeToken: 'old', requestId: 'update-key' });
    assert.deepEqual(calls[1].body, { attributes: document.attributes, expectedVersion: 1, changeToken: 'old', requestId: 'update-key' });
    await documentsApi.completeApproval('doc', { actionCode: 'CUSTOM_ACTION' });
    assert.ok(calls.some(call => call.url.endsWith('/documents/CUSTOM/doc/actions/CUSTOM_ACTION') && call.method === 'POST'));
  } finally { globalThis.fetch = oldFetch; }
});
