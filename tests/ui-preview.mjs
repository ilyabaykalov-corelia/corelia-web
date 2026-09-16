// Local UI fixture: no real authentication, storage, workflow or outbound API calls.
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
const customer = process.argv[2] ?? 'customer-b';
if (!['customer-a', 'customer-b'].includes(customer)) throw new Error('Unknown fixture');
const config = JSON.parse(await readFile(new URL(`../../corelia/corelia-system-tests/src/test/resources/customers/${customer}/configuration.json`, import.meta.url), 'utf8'));
const types = config.documentTypes.map(t => ({ code: t.id, name: t.title, schema: t.schema, ui: t.ui, statuses: t.presentation.statuses, attachments: t.attachments, initialAttachmentRequired: t.attachments.initialRequired }));
const records = types.map((t, i) => ({ id: `fixture-${i}`, typeCode: t.code, typeName: t.name, attributes: { title: `Документ ${i + 1}`, value: t.schema.properties.value.type === 'boolean' ? false : 123.5 }, status: 'OPEN', statusLabel: 'Открыт', version: 1, currentVersion: 1, changeToken: 'fixture', attachments: [], workflow: { availableActions: [], executor: null } }));
const user = { id: 'fixture', login: 'fixture', fullName: 'Тестовый пользователь' };
const server = await createServer({ define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('') }, server: { host: '127.0.0.1', port: 7178, strictPort: true }, plugins: [{ name: 'fixture-api', configureServer(server) {
  server.middlewares.use('/api/core/v1', async (req, res) => {
    let source = ''; for await (const chunk of req) source += chunk;
    const body = source ? JSON.parse(source) : {}, path = req.url.split('?')[0];
    let result;
    if (path === '/auth/login') result = { accessToken: 'fixture.fake.signature', tokenType: 'Bearer', expiresAt: Date.now() + 3600000, expiresIn: 3600, user };
    else if (path === '/auth/me') result = user;
    else if (path === '/document-types') result = { items: types, total: types.length };
    else if (path === '/tasks/summary') result = { my: 0, available: 0 };
    else if (path === '/tasks/search') result = { items: [], total: 0 };
    else if (path.endsWith('/capabilities')) result = { capabilities: ['EDIT'] };
    else if (path.endsWith('/versions')) result = { items: [{ version: 1, current: true, createdBy: 'fixture', createdAt: '2026-09-16T00:00:00Z' }] };
    else if (path.endsWith('/search')) { const items = records.filter(r => !body.documentTypeId || body.documentTypeId === r.typeCode); result = { items, total: items.length }; }
    else if (/^\/documents\/[^/]+$/.test(path) && req.method === 'POST') {
      const type = types.find(t => t.code === path.split('/')[2]);
      result = { ...records[0], id: `fixture-${records.length}`, typeCode: type.code, typeName: type.name, attributes: body.attributes }; records.push(result);
    } else {
      result = records.find(r => r.id === path.split('/').at(-1));
      if (result && req.method === 'PATCH') { result.attributes = body.attributes; result.version++; }
    }
    res.statusCode = result ? 200 : 404; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(result ?? { message: 'Fixture route not implemented' }));
  });
} }] });
await server.listen(); console.log(`UI fixture ${customer}: http://127.0.0.1:7178`);
