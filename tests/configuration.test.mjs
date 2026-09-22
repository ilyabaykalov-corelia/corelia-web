import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom' });
after(() => server.close());
const { validateDocumentAttributes, validateDocumentField, displayAttribute } = await server.ssrLoadModule('/src/features/documents/utils/documentValidation.ts');
const { applyInputMask } = await server.ssrLoadModule('/src/features/documents/utils/inputMask.ts');
const { DocumentFields } = await server.ssrLoadModule('/src/features/documents/components/DocumentFields.tsx');
const { AttachmentDocumentFilesList } = await server.ssrLoadModule('/src/features/documents/components/DocumentFilesList.tsx');
const { documentsApi } = await server.ssrLoadModule('/src/api/documents.ts');
const { formatDateTime } = await server.ssrLoadModule('/src/utils/format.ts');
const catalog = async name => {
  const base = new URL(`../../corelia-system-tests/src/test/resources/customers/${name}/`, import.meta.url);
  const entities = await Promise.all((await readdir(new URL('data-model/entities/', base))).map(async file => JSON.parse(await readFile(new URL(`data-model/entities/${file}`, base), 'utf8'))));
  const ui = await Promise.all((await readdir(new URL('ui/', base))).map(async file => JSON.parse(await readFile(new URL(`ui/${file}`, base), 'utf8'))));
  return entities.map(type => {
    const fragment = ui.find(item => item.id === type.id);
    return { ...type, ui: fragment.ui, name: type.title, statuses: type.presentation.statuses, initialAttachmentRequired: type.attachments.initialRequired };
  });
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

test('configured masks normalize typing and paste before frontend validation', () => {
  const type = { id: 'PDS_CONTRACT', ui: { masks: { snils: '000-000-000 00' } }, schema: { required: ['snils'], properties: {
    snils: { type: 'string', pattern: '^\\d{3}-\\d{3}-\\d{3} \\d{2}$' },
  } } };
  assert.equal(applyInputMask('12345678900', type.ui.masks.snils), '123-456-789 00');
  assert.equal(applyInputMask('123-456-789 00', type.ui.masks.snils), '123-456-789 00');
  assert.match(validateDocumentField('snils', '1234567890', type), /формат/);
  assert.equal(validateDocumentField('snils', '12345678900', type), null);
  assert.equal(validateDocumentField('snils', '123-456-789 00', type), null);
});

test('field validation remains quiet until touched and is cleared on correction', () => {
  const type = { id: 'TEST', schema: { required: ['value'], properties: { value: { type: 'string', minLength: 3 } } } };
  assert.equal(validateDocumentField('value', undefined, type), 'Заполните поле «value»');
  assert.match(validateDocumentField('value', 'x', type), /минимум/);
  assert.equal(validateDocumentField('value', 'good', type), null);
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

test('detail data keeps configured type title and temporal fields', async () => {
  const oldFetch = globalThis.fetch;
  const document = {
    id: 'pds-1', typeCode: 'PDS_CONTRACT', typeName: 'Договор ПДС', status: 'DRAFT', statusLabel: 'Черновик',
    createdAt: '2026-09-22T10:15:20Z', versionCreatedAt: '2026-09-22T10:15:21Z',
    attachments: [{ id: 'attachment-1', documentId: 'pds-1', fileName: 'contract.pdf', contentType: 'application/pdf', size: 1, uploadedAt: '2026-09-22T10:15:22Z' }],
  };
  globalThis.fetch = async () => new Response(JSON.stringify(document), { status: 200, headers: { 'Content-Type': 'application/json' } });
  try {
    const detail = await documentsApi.getById('pds-1', 'PDS_CONTRACT');
    assert.equal(detail.documentType, 'Договор ПДС');
    for (const value of [detail.createdAt, detail.versionCreatedAt, detail.attachments[0].uploadedAt]) {
      assert.notEqual(formatDateTime(value), '—');
    }
  } finally { globalThis.fetch = oldFetch; }
});

test('attachment list renders a known uploadedAt value', () => {
  const uploadedAt = '2026-09-22T10:15:22Z';
  const html = renderToStaticMarkup(React.createElement(AttachmentDocumentFilesList, {
    attachments: [{ id: 'attachment-1', documentId: 'pds-1', fileName: 'contract.pdf', contentType: 'application/pdf', size: 1, uploadedAt, version: 1 }],
    onPreview() {}, onDownload() {},
  }));
  assert.ok(html.includes(formatDateTime(uploadedAt)));
  assert.ok(!html.includes('• — •'));
});
