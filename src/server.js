require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const service = require('../lib/service');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'casa-inteligente-pcuirn' });
});

app.get('/api/devices', async (req, res) => {
  try {
    const devices = await service.getDevices();
    res.json({ success: true, devices });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/commands', (req, res) => {
  res.json({ success: true, ...service.getCatalog() });
});

app.post('/api/tv/send', async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) return res.status(400).json({ success: false, error: 'command obrigatório' });
    const result = await service.sendTv(command);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/ac/send', async (req, res) => {
  try {
    const { action, mode, temp, fan } = req.body;
    if (!action) return res.status(400).json({ success: false, error: 'action obrigatório (on|off|set)' });
    const result = await service.sendAc({ action, mode, temp, fan });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/remotes', async (req, res) => {
  try {
    const data = await service.getRemotes();
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/remotes/:remote/buttons', async (req, res) => {
  try {
    const data = await service.getButtons(req.params.remote);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/ir/send', async (req, res) => {
  try {
    const { remote, button } = req.body;
    if (!remote || !button) {
      return res.status(400).json({ success: false, error: 'remote e button são obrigatórios' });
    }
    const result = await service.sendIr(remote, button);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/local/status', async (req, res) => {
  try {
    const data = await service.getLocalStatus();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`\n🏠 Casa Inteligente API → http://localhost:${PORT}`);
  console.log(`   API:  http://localhost:${PORT}/api/devices`);
  console.log(`   UI:   http://localhost:${PORT}\n`);
});
