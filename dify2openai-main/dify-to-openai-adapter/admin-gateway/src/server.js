const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const { nanoid } = require('nanoid');
const { init, run, all, get } = require('./db');

const PORT = process.env.PORT || 4000;
const ADAPTER_BASE_URL = process.env.ADAPTER_BASE_URL || 'http://localhost:3100';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, '../public')));

const now = () => new Date().toISOString();

const requireApiKey = async (req, res, next) => {
  const auth = req.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth.trim();
  if (!token) {
    return res.status(401).json({ error: 'Missing API key' });
  }
  const apiKey = await get('SELECT * FROM api_keys WHERE api_key = ? AND status = ?', [token, 'active']);
  if (!apiKey) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  req.apiKey = apiKey;
  await run('UPDATE api_keys SET last_used_at = ? WHERE id = ?', [now(), apiKey.id]);
  next();
};

const findMapping = async (apiKeyId, model) => {
  return get(
    'SELECT * FROM mappings WHERE api_key_id = ? AND model_name = ?',
    [apiKeyId, model]
  );
};

app.get('/api/keys', async (req, res) => {
  const rows = await all('SELECT * FROM api_keys ORDER BY id DESC');
  res.json(rows);
});

app.post('/api/keys', async (req, res) => {
  const { name, owner } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const apiKey = `sk-${nanoid(32)}`;
  const createdAt = now();
  await run(
    'INSERT INTO api_keys (name, api_key, status, owner, created_at) VALUES (?, ?, ?, ?, ?)',
    [name, apiKey, 'active', owner || '', createdAt]
  );
  const row = await get('SELECT * FROM api_keys WHERE api_key = ?', [apiKey]);
  res.json(row);
});

app.delete('/api/keys/:id', async (req, res) => {
  await run('DELETE FROM api_keys WHERE id = ?', [req.params.id]);
  await run('DELETE FROM mappings WHERE api_key_id = ?', [req.params.id]);
  res.json({ status: 'ok' });
});

app.get('/api/mappings', async (req, res) => {
  const rows = await all(`
    SELECT m.*, k.name AS key_name, k.api_key AS key_value
    FROM mappings m
    JOIN api_keys k ON k.id = m.api_key_id
    ORDER BY m.id DESC
  `);
  res.json(rows);
});

app.post('/api/mappings', async (req, res) => {
  const {
    api_key_id,
    dify_api_key,
    dify_base_url,
    model_name,
    app_type,
  } = req.body || {};
  if (!api_key_id || !dify_api_key || !dify_base_url || !model_name) {
    return res.status(400).json({ error: 'missing fields' });
  }
  const createdAt = now();
  await run(
    `INSERT INTO mappings (api_key_id, dify_api_key, dify_base_url, model_name, app_type, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [api_key_id, dify_api_key, dify_base_url, model_name, app_type || 'chatbot', createdAt]
  );
  res.json({ status: 'ok' });
});

app.delete('/api/mappings/:id', async (req, res) => {
  await run('DELETE FROM mappings WHERE id = ?', [req.params.id]);
  res.json({ status: 'ok' });
});

app.get('/api/adapter-config', async (req, res) => {
  const rows = await all('SELECT * FROM mappings ORDER BY id ASC');
  const modelMappings = {};
  rows.forEach((row) => {
    modelMappings[row.model_name] = {
      dify_api_key: row.dify_api_key,
      dify_base_url: row.dify_base_url,
      app_name: row.model_name,
      description: `${row.model_name} ${row.app_type}`,
      app_type: row.app_type,
      supports_streaming: true,
      supports_blocking: row.app_type !== 'agent',
      default_mode: row.app_type !== 'agent' ? 'blocking' : 'streaming'
    };
  });
  res.json({
    model_mappings: modelMappings,
    settings: {
      port: 3100,
      host: '0.0.0.0',
      default_model: Object.keys(modelMappings)[0] || ''
    }
  });
});

app.get('/v1/models', requireApiKey, async (req, res) => {
  const rows = await all(
    'SELECT model_name AS id, model_name AS name, app_type AS type FROM mappings WHERE api_key_id = ?',
    [req.apiKey.id]
  );
  res.json({ object: 'list', data: rows });
});

app.post('/v1/chat/completions', requireApiKey, async (req, res) => {
  const model = req.body?.model;
  if (!model) return res.status(400).json({ error: 'model is required' });
  const mapping = await findMapping(req.apiKey.id, model);
  if (!mapping) return res.status(404).json({ error: 'mapping not found for model' });

  try {
    const adapterUrl = `${ADAPTER_BASE_URL.replace(/\/$/, '')}/v1/chat/completions`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${mapping.dify_api_key}`,
    };

    if (req.body?.stream) {
      const response = await axios.post(adapterUrl, req.body, {
        headers,
        responseType: 'stream',
      });
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      response.data.pipe(res);
      return;
    }

    const response = await axios.post(adapterUrl, req.body, { headers });
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/v1/completions', requireApiKey, async (req, res) => {
  const model = req.body?.model;
  if (!model) return res.status(400).json({ error: 'model is required' });
  const mapping = await findMapping(req.apiKey.id, model);
  if (!mapping) return res.status(404).json({ error: 'mapping not found for model' });
  try {
    const adapterUrl = `${ADAPTER_BASE_URL.replace(/\/$/, '')}/v1/completions`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${mapping.dify_api_key}`,
    };
    if (req.body?.stream) {
      const response = await axios.post(adapterUrl, req.body, {
        headers,
        responseType: 'stream',
      });
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      response.data.pipe(res);
      return;
    }
    const response = await axios.post(adapterUrl, req.body, { headers });
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', adapter: ADAPTER_BASE_URL });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

init().then(() => {
  app.listen(PORT, () => {
    console.log(`Admin gateway running at http://localhost:${PORT}`);
    console.log(`Adapter base: ${ADAPTER_BASE_URL}`);
  });
});

