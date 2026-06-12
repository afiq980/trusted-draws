import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import { nanoid } from 'nanoid';
import { createClient } from '@supabase/supabase-js';
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

const supabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YW1wbGUiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNTIzMjAyMiwiZXhwIjoxNjQ2NzY4MDIyfQ.SUFcjwNIXa6J8xy16twVI97I3PbkLgSck9LWMRJWYWE'
);

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
  const { data: drawData, error: drawError } = await supabase.from('draws').select('*').eq('public_id', publicId).single();
  if (drawError || !drawData) {
    return res.status(404).send('Draw not found');
  }
  const { data: entriesData, error: entriesError } = await supabase.from('entries').select('count()', { count: 'exact' }).eq('draw_id', drawData.id);
  const entryCount = entriesData ? entriesData.length : 0;
  res.render('draw', { draw: drawData, entryCount, message: null });
});

app.get('/draw/:publicId/results', async (req, res) => {
  const { publicId } = req.params;
  const { data: drawData, error: drawError } = await supabase.from('draws').select('*').eq('public_id', publicId).single();
  if (drawError || !drawData) {
    return res.status(404).send('Draw not found');
  }
  const { data: results, error: resultsError } = await supabase.from('draw_results').select('position, winner_hash, selected_at').eq('draw_id', drawData.id).order('position', { ascending: true });
  res.render('results', { draw: drawData, results: results || [] });
});

app.get('/manage/:adminToken', async (req, res) => {
  const { adminToken } = req.params;
  const { data: drawData, error: drawError } = await supabase.from('draws').select('*').eq('admin_token', adminToken).single();
  if (drawError || !drawData) {
    return res.status(404).send('Management panel not found');
  }
  const { data: entries, error: entriesError } = await supabase.from('entries').select('*').eq('draw_id', drawData.id).order('created_at', { ascending: true });
  const { data: results, error: resultsError } = await supabase.from('draw_results').select('*, entries(entry_text)').eq('draw_id', drawData.id).order('position', { ascending: true });
  const enrichedResults = results ? results.map(r => ({ ...r, entry_text: r.entries?.entry_text })) : [];
  res.render('manage', { draw: drawData, entries: entries || [], results: enrichedResults, message: null });
});

app.post('/draw', async (req, res) => {
  const { title, description, organizerName, organizerEmail, entryFormat } = req.body;
  const publicId = nanoid(20);
  const adminToken = nanoid(32);
  const verificationKey = buildVerificationKey(publicId);
  const status = 'open';
  const numWinners = 1;
  const uniquenessRule = 'unique';

  const { data: drawData, error } = await supabase.from('draws').insert([{
    public_id: publicId,
    admin_token: adminToken,
    title,
    description,
    organizer_name: organizerName,
    organizer_email: organizerEmail,
    entry_format: entryFormat,
    uniqueness_rule: uniquenessRule,
    num_winners: numWinners,
    allow_weighted: false,
    settings: {},
    verification_key: verificationKey,
    status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }]).select().single();

  res.render('created', { draw: drawData });
});

app.post('/submit/:publicId', async (req, res) => {
  const { publicId } = req.params;
  const { entryText } = req.body;
  const { data: drawData, error: drawError } = await supabase.from('draws').select('*').eq('public_id', publicId).single();
  if (drawError || !drawData) {
    return res.status(404).send('Draw not found');
  }
  if (drawData.status !== 'open') {
    return res.status(400).send('Entry submission is closed');
  }
  const entryHash = hashValue(entryText + drawData.verification_key);
  if (drawData.uniqueness_rule === 'unique') {
    const { data: existing, error: existingError } = await supabase.from('entries').select('*').eq('draw_id', drawData.id).eq('entry_hash', entryHash);
    if (existing && existing.length) {
      const { data: entriesData } = await supabase.from('entries').select('count()', { count: 'exact' }).eq('draw_id', drawData.id);
      const entryCount = entriesData ? entriesData.length : 0;
      return res.render('draw', { draw: drawData, entryCount, message: 'You have already entered.' });
    }
  }

  await supabase.from('entries').insert([{
    draw_id: drawData.id,
    entry_text: entryText,
    entry_hash: entryHash,
    weight: 1,
    created_at: new Date().toISOString()
  }]);
  
  const { data: entriesData } = await supabase.from('entries').select('count()', { count: 'exact' }).eq('draw_id', drawData.id);
  const entryCount = entriesData ? entriesData.length : 0;
  res.render('draw', { draw: drawData, entryCount, message: 'Entry submitted successfully!' });
});

app.post('/draw/:adminToken/execute', async (req, res) => {
  const { adminToken } = req.params;
  const { data: drawData, error: drawError } = await supabase.from('draws').select('*').eq('admin_token', adminToken).single();
  if (drawError || !drawData) {
    return res.status(404).send('Draw not found');
  }
  if (drawData.status !== 'open') {
    return res.status(400).send('Draw cannot be executed in this state');
  }
  const { data: entries, error: entriesError } = await supabase.from('entries').select('*').eq('draw_id', drawData.id);
  if (!entries || !entries.length) {
    return res.status(400).send('No entries available');
  }

  const shuffled = entries.sort(() => 0.5 - Math.random());
  const winners = shuffled.slice(0, drawData.num_winners);

  try {
    for (let i = 0; i < winners.length; i += 1) {
      const winner = winners[i];
      await supabase.from('draw_results').insert([{
        draw_id: drawData.id,
        entry_id: winner.id,
        position: i + 1,
        winner_hash: hashValue(winner.entry_text + drawData.verification_key),
        selected_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }]);
    }
    await supabase.from('draws').update({ status: 'drawn', updated_at: new Date().toISOString() }).eq('id', drawData.id);
  } catch (error) {
    return res.status(500).send('Error executing draw');
  }

  const { data: entriesAfter } = await supabase.from('entries').select('*').eq('draw_id', drawData.id).order('created_at', { ascending: true });
  const { data: results } = await supabase.from('draw_results').select('*, entries(entry_text)').eq('draw_id', drawData.id).order('position', { ascending: true });
  const enrichedResults = results ? results.map(r => ({ ...r, entry_text: r.entries?.entry_text })) : [];
  res.render('manage', { draw: { ...drawData, status: 'drawn' }, entries: entriesAfter || [], results: enrichedResults, message: 'Draw executed successfully.' });
});

app.post('/draw/:adminToken/publish', async (req, res) => {
  const { adminToken } = req.params;
  const { data: drawData, error: drawError } = await supabase.from('draws').select('*').eq('admin_token', adminToken).single();
  if (drawError || !drawData) {
    return res.status(404).send('Draw not found');
  }
  await supabase.from('draws').update({ status: 'published', published_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', drawData.id);
  const { data: entriesAfter } = await supabase.from('entries').select('*').eq('draw_id', drawData.id).order('created_at', { ascending: true });
  const { data: results } = await supabase.from('draw_results').select('*, entries(entry_text)').eq('draw_id', drawData.id).order('position', { ascending: true });
  const enrichedResults = results ? results.map(r => ({ ...r, entry_text: r.entries?.entry_text })) : [];
  res.render('manage', { draw: { ...drawData, status: 'published' }, entries: entriesAfter || [], results: enrichedResults, message: 'Results published.' });
});

app.get('/verify/:publicId', async (req, res) => {
  const { publicId } = req.params;
  const { data: drawData, error: drawError } = await supabase.from('draws').select('*').eq('public_id', publicId).single();
  if (drawError || !drawData) {
    return res.status(404).send('Draw not found');
  }
  res.render('verify', { draw: drawData, result: null });
});

app.post('/verify/:publicId', async (req, res) => {
  const { publicId } = req.params;
  const { entryText } = req.body;
  const { data: drawData, error: drawError } = await supabase.from('draws').select('*').eq('public_id', publicId).single();
  if (drawError || !drawData) {
    return res.status(404).send('Draw not found');
  }
  const entryHash = hashValue(entryText + drawData.verification_key);
  const { data: winner, error: winnerError } = await supabase.from('draw_results').select('position').eq('draw_id', drawData.id).eq('winner_hash', entryHash).order('position', { ascending: true }).limit(1).single();
  const result = winner ? { winner: true, position: winner.position } : { winner: false };
  res.render('verify', { draw: drawData, result });
});

export default app;

if (process.argv[1] === __filename) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Trusted Draws server listening on port ${PORT}`);
  });
}
