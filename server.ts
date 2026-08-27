import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_SCS: any[] = [];
const DEFAULT_EQUIPMENTS: any[] = [];

interface DataStore {
  scs: any[];
  equipments: any[];
  lastModified: number;
}

function loadStore(): DataStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.scs)) return data;
    }
  } catch (err) {
    console.error('Error reading store file, falling back to defaults:', err);
  }
  const initial = {
    scs: DEFAULT_SCS,
    equipments: DEFAULT_EQUIPMENTS,
    lastModified: Date.now()
  };
  saveStore(initial);
  return initial;
}

function saveStore(store: DataStore) {
  try {
    store.lastModified = Date.now();
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing store file:', err);
  }
}

// Global data store reference
let store = loadStore();

// ================= API ROUTES FOR MULTI-DEVICE SYNC =================

// 1. Health & Sync Status Endpoint
app.get('/api/sync-status', (req, res) => {
  res.json({
    status: 'online',
    lastModified: store.lastModified,
    scCount: store.scs.length,
    equipmentCount: store.equipments.length,
    serverTime: new Date().toISOString()
  });
});

// 2. SC Endpoints
app.get('/api/scs', (req, res) => {
  res.json(store.scs);
});

app.post('/api/scs', (req, res) => {
  const newSC = req.body;
  if (!newSC.id) {
    newSC.id = 'sc-' + Math.random().toString(36).substring(2, 9);
  }
  store.scs.unshift(newSC);
  saveStore(store);
  res.status(201).json(newSC);
});

app.put('/api/scs/:id', (req, res) => {
  const id = req.params.id;
  const updatedSC = req.body;
  const idx = store.scs.findIndex((s) => s.id === id);
  if (idx !== -1) {
    store.scs[idx] = { ...updatedSC, id };
    saveStore(store);
    res.json(store.scs[idx]);
  } else {
    store.scs.unshift({ ...updatedSC, id });
    saveStore(store);
    res.json(updatedSC);
  }
});

app.delete('/api/scs/:id', (req, res) => {
  const id = req.params.id;
  store.scs = store.scs.filter((s) => s.id !== id);
  saveStore(store);
  res.json({ success: true });
});

app.post('/api/scs/bulk', (req, res) => {
  const list = req.body;
  if (Array.isArray(list)) {
    store.scs = list;
    saveStore(store);
    res.json({ success: true, count: store.scs.length });
  } else {
    res.status(400).json({ error: 'Array required' });
  }
});

// 3. Equipment Endpoints
app.get('/api/equipments', (req, res) => {
  res.json(store.equipments);
});

app.post('/api/equipments', (req, res) => {
  const eq = req.body;
  if (!eq.id) {
    eq.id = 'eq-' + Math.random().toString(36).substring(2, 9);
  }
  const idx = store.equipments.findIndex((e) => e.id === eq.id);
  if (idx !== -1) {
    store.equipments[idx] = eq;
  } else {
    store.equipments.unshift(eq);
  }
  saveStore(store);
  res.json(eq);
});

app.delete('/api/equipments/:id', (req, res) => {
  const id = req.params.id;
  store.equipments = store.equipments.filter((e) => e.id !== id);
  saveStore(store);
  res.json({ success: true });
});

app.post('/api/equipments/bulk', (req, res) => {
  const list = req.body;
  if (Array.isArray(list)) {
    store.equipments = list;
    saveStore(store);
    res.json({ success: true, count: store.equipments.length });
  } else {
    res.status(400).json({ error: 'Array required' });
  }
});

// 4. Reset & Clear Endpoints
app.post('/api/reset', (req, res) => {
  store = {
    scs: DEFAULT_SCS,
    equipments: DEFAULT_EQUIPMENTS,
    lastModified: Date.now()
  };
  saveStore(store);
  res.json({ success: true, scs: store.scs, equipments: store.equipments });
});

app.post('/api/clear', (req, res) => {
  store = {
    scs: [],
    equipments: [],
    lastModified: Date.now()
  };
  saveStore(store);
  res.json({ success: true });
});

// ================= VITE MIDDLEWARE SETUP =================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MCM Montagens server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
