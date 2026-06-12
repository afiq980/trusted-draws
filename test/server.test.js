import test from 'node:test';
import assert from 'node:assert';
import supertest from 'supertest';
import { createApp } from '../server.js';

function createMockPool() {
  const draws = [];
  const entries = [];
  const drawResults = [];

  return {
    query(statement, params) {
      const normalized = statement.trim().toLowerCase();

      if (normalized.startsWith('select * from draws where public_id = $1')) {
        return Promise.resolve({ rows: draws.filter((draw) => draw.public_id === params[0]) });
      }

      if (normalized.startsWith('select * from draws where admin_token = $1')) {
        return Promise.resolve({ rows: draws.filter((draw) => draw.admin_token === params[0]) });
      }

      if (normalized.startsWith('insert into draws')) {
        const draw = {
          id: `draw-${draws.length + 1}`,
          public_id: params[0],
          admin_token: params[1],
          title: params[2],
          description: params[3],
          organizer_name: params[4],
          organizer_email: params[5],
          entry_format: params[6],
          uniqueness_rule: params[7],
          num_winners: params[8],
          allow_weighted: params[9],
          settings: params[10],
          verification_key: params[11],
          status: params[12],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        draws.push(draw);
        return Promise.resolve({ rows: [draw] });
      }

      if (normalized.startsWith('select count(*) from entries where draw_id = $1')) {
        const count = entries.filter((entry) => entry.draw_id === params[0]).length;
        return Promise.resolve({ rows: [{ count }] });
      }

      if (normalized.startsWith('select * from entries where draw_id = $1 order by created_at asc')) {
        return Promise.resolve({ rows: entries.filter((entry) => entry.draw_id === params[0]) });
      }

      if (normalized.startsWith('select * from entries where draw_id = $1 and entry_hash = $2')) {
        return Promise.resolve({ rows: entries.filter((entry) => entry.draw_id === params[0] && entry.entry_hash === params[1]) });
      }

      if (normalized.startsWith('insert into entries')) {
        const entry = {
          id: `entry-${entries.length + 1}`,
          draw_id: params[0],
          entry_text: params[1],
          entry_hash: params[2],
          weight: params[3],
          created_at: new Date().toISOString()
        };
        entries.push(entry);
        return Promise.resolve({ rows: [entry] });
      }

      if (normalized.startsWith('select * from draw_results where draw_id = $1 order by position asc')) {
        return Promise.resolve({ rows: drawResults.filter((result) => result.draw_id === params[0]) });
      }

      if (normalized.startsWith('select dr.*, e.entry_text from draw_results')) {
        const resultRows = drawResults
          .filter((result) => result.draw_id === params[0])
          .map((result) => ({ ...result, entry_text: entries.find((e) => e.id === result.entry_id)?.entry_text || '' }));
        return Promise.resolve({ rows: resultRows });
      }

      if (normalized.startsWith('insert into draw_results')) {
        const createdAt = new Date().toISOString();
        const drawResult = {
          id: `result-${drawResults.length + 1}`,
          draw_id: params[0],
          entry_id: params[1],
          position: params[2],
          winner_hash: params[3],
          selected_at: createdAt,
          created_at: createdAt
        };
        drawResults.push(drawResult);
        return Promise.resolve({ rows: [drawResult] });
      }

      if (normalized.startsWith('update draws set status = $1')) {
        const draw = draws.find((d) => d.id === params[1]);
        if (draw) {
          draw.status = params[0];
          draw.updated_at = new Date().toISOString();
        }
        return Promise.resolve({});
      }

      if (normalized.startsWith('begin') || normalized.startsWith('commit') || normalized.startsWith('rollback')) {
        return Promise.resolve({});
      }

      return Promise.reject(new Error(`Unhandled SQL: ${statement}`));
    }
  };
}

const pool = createMockPool();
const app = createApp(pool, { initializeDb: false });
const request = supertest(app);

test('GET / returns index page', async () => {
  const response = await request.get('/');
  assert.equal(response.status, 200);
  assert.match(response.text, /Trusted Draws/);
});

test('POST /draw creates draw and renders created page', async () => {
  const response = await request
    .post('/draw')
    .type('form')
    .send({
      title: 'Test Draw',
      description: 'A sample draw',
      organizerName: 'Alice',
      organizerEmail: 'alice@example.com',
      entryFormat: 'username'
    });

  assert.equal(response.status, 200);
  assert.match(response.text, /Public link/);
  assert.match(response.text, /Admin link/);
});

test('POST /submit/:publicId accepts a valid entry', async () => {
  const createResponse = await request
    .post('/draw')
    .type('form')
    .send({
      title: 'Submit Draw',
      description: 'Submit test',
      organizerName: 'Bob',
      organizerEmail: 'bob@example.com',
      entryFormat: 'username'
    });

  const match = createResponse.text.match(/\/draw\/([A-Za-z0-9_-]{20})/);
  assert.ok(match, 'Expected public link in response');
  const publicId = match[1];

  const submitResponse = await request
    .post(`/submit/${publicId}`)
    .type('form')
    .send({ entryText: 'bob-123' });

  assert.equal(submitResponse.status, 200);
  assert.match(submitResponse.text, /Entry submitted successfully!/);
});
