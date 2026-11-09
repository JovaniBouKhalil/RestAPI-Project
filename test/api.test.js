import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { Note } from '../src/models/Note.js';
import { startTestDatabase, removeTestDirectory } from '../scripts/test-database.js';

describe('Notes API against real, disk-backed MongoDB', { concurrency: false }, () => {
  let mongo;
  let dbPath;
  let server;
  let baseUrl;

  before(async () => {
    ({ mongo, dbPath } = await startTestDatabase());
    await connectDatabase(mongo.getUri('assignment6_tests'));
    server = createApp().listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  }, { timeout: 300000 });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    if (mongo) await mongo.stop({ doCleanup: false });
    if (dbPath) await removeTestDirectory(dbPath);
  });

  beforeEach(async () => {
    await Note.deleteMany({});
  });

  async function request(method, route = '/api/notes', data, raw = false, headers = {}) {
    const response = await fetch(baseUrl + route, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: data === undefined ? undefined : raw ? data : JSON.stringify(data),
      signal: AbortSignal.timeout(20000),
    });
    const text = await response.text();
    return { status: response.status, headers: response.headers, text, body: text ? JSON.parse(text) : null };
  }

  async function create(data = { title: 'Exam topics', body: 'Hooks, Express, REST', tags: ['exam'] }) {
    const result = await request('POST', '/api/notes', data);
    assert.equal(result.status, 201);
    return result.body;
  }

  test('root describes the API and an empty list returns 200 and []', async () => {
    const root = await request('GET', '/');
    assert.equal(root.status, 200);
    assert.equal(root.body.notes, '/api/notes');
    assert.deepEqual((await request('GET')).body, []);
  });

  test('POST returns 201, a Location header, server metadata, and a stored MongoDB document', async () => {
    const result = await request('POST', '/api/notes', { title: '  Exam topics  ', tags: [' exam '] });
    assert.equal(result.status, 201);
    assert.match(result.body._id, /^[a-f0-9]{24}$/);
    assert.equal(result.headers.get('location'), `/api/notes/${result.body._id}`);
    assert.equal(result.body.title, 'Exam topics');
    assert.equal(result.body.body, '');
    assert.deepEqual(result.body.tags, ['exam']);
    assert.ok(Number.isFinite(Date.parse(result.body.createdAt)));
    assert.ok(Number.isFinite(Date.parse(result.body.updatedAt)));
    const stored = await mongoose.connection.db.collection('notes').findOne({ _id: new mongoose.Types.ObjectId(result.body._id) });
    assert.equal(stored.title, result.body.title);
  });

  test('GET list and GET one return the created note with 200', async () => {
    const note = await create();
    const list = await request('GET');
    assert.equal(list.status, 200);
    assert.deepEqual(list.body, [note]);
    const one = await request('GET', `/api/notes/${note._id}`);
    assert.equal(one.status, 200);
    assert.deepEqual(one.body, note);
  });

  test('PUT replaces writable fields, resets omitted fields, and preserves identity and creation time', async () => {
    const note = await create();
    const result = await request('PUT', `/api/notes/${note._id}`, { title: 'Replacement' });
    assert.equal(result.status, 200);
    assert.equal(result.body.title, 'Replacement');
    assert.equal(result.body.body, '');
    assert.deepEqual(result.body.tags, []);
    assert.equal(result.body._id, note._id);
    assert.equal(result.body.createdAt, note.createdAt);
    assert.ok(result.body.updatedAt >= note.updatedAt);
    assert.deepEqual((await request('GET', `/api/notes/${note._id}`)).body, result.body);
    assert.deepEqual((await request('PUT', `/api/notes/${note._id}`, { title: 'Replacement' })).body.tags, []);
  });

  test('PATCH changes supplied fields and preserves the rest', async () => {
    const note = await create();
    const result = await request('PATCH', `/api/notes/${note._id}`, { title: 'Updated' });
    assert.equal(result.status, 200);
    assert.equal(result.body.title, 'Updated');
    assert.equal(result.body.body, note.body);
    assert.deepEqual(result.body.tags, note.tags);
    assert.equal(result.body.createdAt, note.createdAt);
    assert.equal((await Note.findById(note._id)).title, 'Updated');
  });

  test('PATCH can clear optional fields with an empty string and array', async () => {
    const note = await create();
    const result = await request('PATCH', `/api/notes/${note._id}`, { body: '', tags: [] });
    assert.equal(result.status, 200);
    assert.equal(result.body.body, '');
    assert.deepEqual(result.body.tags, []);
  });

  test('DELETE returns an empty 204 and removes the database document', async () => {
    const note = await create();
    const result = await request('DELETE', `/api/notes/${note._id}`);
    assert.equal(result.status, 204);
    assert.equal(result.text, '');
    assert.equal(result.headers.get('content-type'), null);
    assert.equal(await Note.findById(note._id), null);
    assert.equal((await request('DELETE', `/api/notes/${note._id}`)).status, 404);
  });

  for (const method of ['GET', 'PUT', 'PATCH', 'DELETE']) {
    test(`${method} returns 404 for a valid but missing ObjectId`, async () => {
      const data = ['PUT', 'PATCH'].includes(method) ? { title: 'Valid title' } : undefined;
      const result = await request(method, '/api/notes/000000000000000000000001', data);
      assert.equal(result.status, 404);
      assert.deepEqual(result.body, { error: 'Note not found.' });
    });
    test(`${method} returns 400 for a malformed ObjectId`, async () => {
      const data = ['PUT', 'PATCH'].includes(method) ? { title: 'Valid title' } : undefined;
      const result = await request(method, '/api/notes/not-an-id', data);
      assert.equal(result.status, 400);
      assert.match(result.body.error, /ObjectId/);
    });
  }

  const invalidFields = [
    ['blank title', { title: '   ' }],
    ['numeric title', { title: 42 }],
    ['null title', { title: null }],
    ['object title', { title: { $ne: '' } }],
    ['long title', { title: 'x'.repeat(121) }],
    ['numeric body', { title: 'Valid', body: 42 }],
    ['null body', { title: 'Valid', body: null }],
    ['long body', { title: 'Valid', body: 'x'.repeat(5001) }],
    ['tags string', { title: 'Valid', tags: 'exam' }],
    ['null tags', { title: 'Valid', tags: null }],
    ['empty tag', { title: 'Valid', tags: [' '] }],
    ['numeric tag', { title: 'Valid', tags: [1] }],
    ['long tag', { title: 'Valid', tags: ['x'.repeat(31)] }],
    ['too many tags', { title: 'Valid', tags: Array(11).fill('exam') }],
    ['unknown field', { title: 'Valid', surprise: true }],
    ['client ID', { title: 'Valid', _id: '000000000000000000000001' }],
    ['client timestamp', { title: 'Valid', createdAt: '2000-01-01' }],
    ['update operator', { title: 'Valid', $set: { title: 'Injected' } }],
  ];

  for (const method of ['POST', 'PUT', 'PATCH']) {
    for (const [label, data] of invalidFields) {
      test(`${method} rejects ${label} without changing stored data`, async () => {
        const note = method === 'POST' ? null : await create();
        const route = note ? `/api/notes/${note._id}` : '/api/notes';
        const result = await request(method, route, data);
        assert.equal(result.status, 400);
        assert.equal(typeof result.body.error, 'string');
        assert.ok(Object.keys(result.body.details).length > 0);
        if (note) assert.deepEqual((await request('GET', route)).body, note);
        else assert.equal(await Note.countDocuments(), 0);
      });
    }
  }

  test('POST and PUT require a title; an empty PATCH is rejected', async () => {
    assert.equal((await request('POST', '/api/notes', {})).status, 400);
    const note = await create();
    assert.equal((await request('PUT', `/api/notes/${note._id}`, { body: 'Missing title' })).status, 400);
    assert.equal((await request('PATCH', `/api/notes/${note._id}`, {})).status, 400);
  });

  test('maximum allowed field lengths are accepted', async () => {
    const note = await create({ title: 'x'.repeat(120), body: 'x'.repeat(5000), tags: Array(10).fill('x'.repeat(30)) });
    assert.equal(note.title.length, 120);
    assert.equal(note.body.length, 5000);
    assert.equal(note.tags.length, 10);
  });

  for (const raw of ['null', '[]', '42', '"text"', 'true', '']) {
    test(`non-object JSON body ${JSON.stringify(raw)} returns 400`, async () => {
      const result = await request('POST', '/api/notes', raw, true);
      assert.equal(result.status, 400);
      assert.equal(typeof result.body.error, 'string');
    });
  }

  test('malformed JSON returns JSON 400 and the next request still works', async () => {
    const result = await request('POST', '/api/notes', '{"title":', true);
    assert.equal(result.status, 400);
    assert.match(result.body.error, /Malformed JSON/);
    assert.equal((await request('GET')).status, 200);
  });

  test('oversized JSON returns 413 and the server stays available', async () => {
    const result = await request('POST', '/api/notes', { title: 'Valid', body: 'x'.repeat(70000) });
    assert.equal(result.status, 413);
    assert.equal((await request('GET')).status, 200);
  });

  test('a write without application/json returns JSON 415', async () => {
    const result = await request('POST', '/api/notes', '{"title":"Valid"}', true, { 'Content-Type': 'text/plain' });
    assert.equal(result.status, 415);
    assert.match(result.body.error, /application\/json/);
  });

  test('unknown routes return JSON 404', async () => {
    const result = await request('GET', '/api/unknown');
    assert.equal(result.status, 404);
    assert.deepEqual(result.body, { error: 'Route not found.' });
  });

  test('search is case-insensitive literal title matching; sort and limit work', async () => {
    const first = await create({ title: 'Exam [REST]' });
    const second = await create({ title: 'Exam revision' });
    await create({ title: 'Shopping' });
    const search = await request('GET', '/api/notes?search=EXAM&sort=oldest&limit=1');
    assert.equal(search.status, 200);
    assert.deepEqual(search.body.map((note) => note._id), [first._id]);
    assert.deepEqual((await request('GET', '/api/notes?search=%5B')).body.map((note) => note._id), [first._id]);
    assert.deepEqual((await request('GET', '/api/notes?search=exam')).body.map((note) => note._id), [second._id, first._id]);
    assert.deepEqual((await request('GET', '/api/notes?search=missing')).body, []);
  });

  for (const query of ['sort=wrong', 'limit=0', 'limit=-1', 'limit=1.5', 'limit=101', 'limit=abc', 'search=a&search=b', 'sort=newest&sort=oldest', 'limit=1&limit=2', 'unknown=value', `search=${'a'.repeat(121)}`]) {
    test(`invalid query ${query.slice(0,45)} returns 400`, async () => {
      const result = await request('GET', `/api/notes?${query}`);
      assert.equal(result.status, 400);
      assert.equal(typeof result.body.error, 'string');
    });
  }

  test('the configured frontend origin receives CORS headers', async () => {
    const result = await request('GET', '/api/notes', undefined, false, { Origin: 'http://localhost:5173' });
    assert.equal(result.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    const preflight = await request('OPTIONS', '/api/notes', undefined, false, {
      Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST',
    });
    assert.equal(preflight.status, 204);
  });

  test('notes survive closing the API, restarting MongoDB, and reconnecting', async () => {
    const note = await create();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop({ doCleanup: false });
    await mongo.start();
    await connectDatabase(mongo.getUri('assignment6_tests'));
    server = createApp().listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    assert.deepEqual((await request('GET', `/api/notes/${note._id}`)).body, note);
  });

  test('a real database outage returns safe JSON 500 and requests recover after reconnecting', async () => {
    await mongoose.disconnect();
    const result = await request('GET');
    assert.equal(result.status, 500);
    assert.deepEqual(result.body, { error: 'Internal server error. Please try again later.' });
    assert.equal(result.text.includes('stack'), false);
    await connectDatabase(mongo.getUri('assignment6_tests'));
    assert.equal((await request('GET')).status, 200);
  });
});
