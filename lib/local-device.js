const TuyAPI = require('tuyapi');

function getConfig() {
  const id = process.env.DEVICE_ID;
  const key = process.env.DEVICE_LOCAL_KEY;
  const ip = process.env.DEVICE_IP || undefined;
  if (!id || !key) throw new Error('DEVICE_ID e DEVICE_LOCAL_KEY obrigatórios no .env');
  return { id, key, ip };
}

function withDevice({ timeoutMs = 15000, version = '3.3' } = {}) {
  const { id, key, ip } = getConfig();
  const device = new TuyAPI({ id, key, ip, issueGetOnConnect: true, version });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      try { device.disconnect(); } catch {}
      reject(new Error('Timeout na conexão local'));
    }, timeoutMs);

    const done = (err, result) => {
      clearTimeout(timeout);
      try { device.disconnect(); } catch {}
      if (err) reject(err);
      else resolve(result);
    };

    device.on('error', (err) => done(err));
    device.on('data', (data) => done(null, data));

    device.find({ timeout: 8000 }).then(() => device.connect()).catch(done);
  });
}

async function getLocalStatus() {
  return withDevice();
}

async function setLocalDps(dps, version = '3.3') {
  const { id, key, ip } = getConfig();
  const device = new TuyAPI({ id, key, ip, version });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      try { device.disconnect(); } catch {}
      reject(new Error('Timeout'));
    }, 15000);

    device.on('error', reject);
    device.on('connected', () => {
      device.set({ multiple: true, dps }).then(() => {
        clearTimeout(timeout);
        try { device.disconnect(); } catch {}
        resolve({ success: true, dps });
      }).catch(reject);
    });

    device.find({ timeout: 8000 }).then(() => device.connect()).catch(reject);
  });
}

module.exports = { getLocalStatus, setLocalDps, withDevice, getConfig };
