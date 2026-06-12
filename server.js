import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import { nanoid } from 'nanoid';
import pg from 'pg';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(helmet());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/trusted_draws'
});

function hashValue(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function buildVerificationKey(publicId) {
  return hashValue(publicId);
}

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/draw/:publicId', async (req, res) => {
  const { publicId } = req.params;
  const draw = await pool.query('select * from draws where public_id = $1', [publicId]);
  if (!draw.rows.length) {
    return res.status(404).send('Draw not found');
  }
  const entries = await pool.query('select count(*) from entries where draw_id = $1', [draw.rows[0].id]);
  res.render('draw', { draw: draw.rows[0], entryCount: entries.rows[0].count, message: null });
});

app.get('/draw/:publicId/results', async (req, res) => {
  const { publicId } = req.params;
  const drawResult = await pool.query('select * from draws where public_id = $1', [publicId]);
  if (!drawResult.rows.length) {
    return res.status(404).send('Draw not found');
  }
  const draw = drawResult.rows[0];
  const results = await pool.query('select position, winner_hash, selected_at from draw_results where draw_id = $1 order by position asc', [draw.id]);
  res.render('results', { draw, results: results.rows });
});

app.get('/manage/:adminToken', async (req, res) => {
  const { adminToken } = req.params;
  const draw = await pool.query('select * from draws where admin_token = $1', [adminToken]);
  if (!draw.rows.length) {
    return res.status(404).send('Management panel not found');
  }
  const entries = await pool.query('select * from entries where draw_id = $1 order by created_at asc', [draw.rows[0].id]);
  const results = await pool.query('select dr.*, e.entry_text from draw_results dr join entries e on e.id = dr.entry_id where dr.draw_id = $1 order by dr.position asc', [draw.rows[0].id]);
  res.render('manage', { draw: draw.rows[0], entries: entries.rows, results: results.rows, message: null });
});

app.post('/draw', async (req, res) => {
  const { title, description, organizerName, organizerEmail, entryFormat } = req.body;
  const publicId = nanoid(20);
  const adminToken = nanoid(32);
  const verificationKey = buildVerificationKey(publicId);
  const status = 'open';
  const numWinners = 1;
  const uniquenessRule = 'unique';

  const insert = await pool.query(
    `insert into draws (public_id, admin_token, title, description, organizer_name, organizer_email, entry_format, uniqueness_rule, num_winners, allow_weighted, settings, verification_key, status, created_at, updated_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now(), now()) returning *`,
    [publicId, adminToken, title, description, organizerName, organizerEmail, entryFormat, uniquenessRule, numWinners, false, {}, verificationKey, status]
  );

  res.render('created', { draw: insert.rows[0] });
});

app.post('/submit/:publicId', async (req, res) => {
  const { publicId } = req.params;
  const { entryText } = req.body;
  const drawResult = await pool.query('select * from draws where public_id = $1', [publicId]);
  if (!drawResult.rows.length) {
    return res.status(404).send('Draw not found');
  }
  const draw = drawResult.rows[0];
  if (draw.status !== 'open') {
    return res.status(400).send('Entry submission is closed');
  }
  const entryHash = hashValue(entryText + draw.verification_key);
  if (draw.uniqueness_rule === 'unique') {
    const existing = await pool.query('select * from entries where draw_id = $1 and entry_hash = $2', [draw.id, entryHash]);
    if (existing.rows.length) {
      return res.render('draw', { draw, entryCount: (await pool.query('select count(*) from entries where draw_id = $1', [draw.id])).rows[0].count, message: 'You have already entered.' });
    }
  }

  await pool.query('insert into entries (draw_id, entry_text, entry_hash, weight, created_at) values ($1,$2,$3,$4, now())', [draw.id, entryText, entryHash, 1]);
  const entryCount = await pool.query('select count(*) from entries where draw_id = $1', [draw.id]);
  res.render('draw', { draw, entryCount: entryCount.rows[0].count, message: 'Entry submitted successfully!' });
});

app.post('/draw/:adminToken/execute', async (req, res) => {
  const { adminToken } = req.params;
  const drawResult = await pool.query('select * from draws where admin_token = $1', [adminToken]);
  if (!drawResult.rows.length) {
    return res.status(404).send('Draw not found');
  }
  const draw = drawResult.rows[0];
  if (draw.status !== 'open') {
    return res.status(400).send('Draw cannot be executed in this state');
  }
  const entries = await pool.query('select * from entries where draw_id = $1', [draw.id]);
  if (!entries.rows.length) {
    return res.status(400).send('No entries available');
  }

  const shuffled = entries.rows.sort(() => 0.5 - Math.random());
  const winners = shuffled.slice(0, draw.num_winners);

  await pool.query('begin');
  try {
    for (let i = 0; i < winners.length; i += 1) {
      const winner = winners[i];
      await pool.query(
        'insert into draw_results (draw_id, entry_id, position, winner_hash, selected_at, created_at) values ($1,$2,$3,$4, now(), now())',
        [draw.id, winner.id, i + 1, hashValue(winner.entry_text + draw.verification_key)]
      );
    }
    await pool.query('update draws set status = $1, updated_at = now() where id = $2', ['drawn', draw.id]);
    await pool.query('commit');
  } catch (error) {
    await pool.query('rollback');
    throw error;
  }

  const entriesAfter = await pool.query('select * from entries where draw_id = $1 order by created_at asc', [draw.id]);
  const results = await pool.query('select dr.*, e.entry_text from draw_results dr join entries e on e.id = dr.entry_id where dr.draw_id = $1 order by dr.position asc', [draw.id]);
  res.render('manage', { draw: { ...draw, status: 'drawn' }, entries: entriesAfter.rows, results: results.rows, message: 'Draw executed successfully.' });
});

app.post('/draw/:adminToken/publish', async (req, res) => {
  const { adminToken } = req.params;
  const drawResult = await pool.query('select * from draws where admin_token = $1', [adminToken]);
  if (!drawResult.rows.length) {
    return res.status(404).send('Draw not found');
  }
  const draw = drawResult.rows[0];
  await pool.query('update draws set status = $1, published_at = now(), updated_at = now() where id = $2', ['published', draw.id]);
  const entriesAfter = await pool.query('select * from entries where draw_id = $1 order by created_at asc', [draw.id]);
  const results = await pool.query('select dr.*, e.entry_text from draw_results dr join entries e on e.id = dr.entry_id where dr.draw_id = $1 order by dr.position asc', [draw.id]);
  res.render('manage', { draw: { ...draw, status: 'published' }, entries: entriesAfter.rows, results: results.rows, message: 'Results published.' });
});

app.get('/verify/:publicId', async (req, res) => {
  const { publicId } = req.params;
  const drawResult = await pool.query('select * from draws where public_id = $1', [publicId]);
  if (!drawResult.rows.length) {
    return res.status(404).send('Draw not found');
  }
  res.render('verify', { draw: drawResult.rows[0], result: null });
});

app.post('/verify/:publicId', async (req, res) => {
  const { publicId } = req.params;
  const { entryText } = req.body;
  const drawResult = await pool.query('select * from draws where public_id = $1', [publicId]);
  if (!drawResult.rows.length) {
    return res.status(404).send('Draw not found');
  }
  const draw = drawResult.rows[0];
  const entryHash = hashValue(entryText + draw.verification_key);
  const winner = await pool.query('select dr.position from draw_results dr join entries e on e.id = dr.entry_id where dr.draw_id = $1 and dr.winner_hash = $2 order by dr.position asc limit 1', [draw.id, entryHash]);
  const result = winner.rows.length ? { winner: true, position: winner.rows[0].position } : { winner: false };
  res.render('verify', { draw, result });
});

export default app;

if (process.argv[1] === __filename) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Trusted Draws server listening on port ${PORT}`);
  });
}
