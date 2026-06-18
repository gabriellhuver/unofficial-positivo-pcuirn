#!/usr/bin/env node
/**
 * Conecta localmente no dispositivo e mostra o status (DPS).
 * Rode: node probe.js
 *
 * Precisa no .env:
 *   DEVICE_ID=
 *   DEVICE_LOCAL_KEY=
 *   DEVICE_IP=        (opcional — descobre sozinho se vazio)
 */

require('dotenv').config();
const TuyAPI = require('tuyapi');

const id = process.env.DEVICE_ID;
const key = process.env.DEVICE_LOCAL_KEY;
const ip = process.env.DEVICE_IP || undefined;

if (!id || !key) {
  console.error('\n❌ Configure o .env:\n');
  console.error('   DEVICE_ID=...');
  console.error('   DEVICE_LOCAL_KEY=...');
  console.error('   DEVICE_IP=...   (opcional)\n');
  console.error('Rode antes: node positivo.js  (ou node cloud.js)\n');
  process.exit(1);
}

console.log('\n🔌 Conectando localmente...\n');
console.log(`   deviceId : ${id}`);
console.log(`   ip       : ${ip || '(auto)'}`);
console.log('\n   ⚠️  Feche o app Positivo no celular (só 1 conexão por vez)\n');

const device = new TuyAPI({
  id,
  key,
  ip,
  issueGetOnConnect: true,
  version: '3.3',
});

const timeout = setTimeout(() => {
  console.error('❌ Timeout — dispositivo não respondeu em 15s');
  try { device.disconnect(); } catch {}
  process.exit(1);
}, 15000);

device.on('connected', () => {
  console.log('✅ Conectado!\n');
});

device.on('discovered', (info) => {
  console.log(`   IP descoberto: ${info.address}:${info.port}\n`);
});

device.on('data', (data) => {
  clearTimeout(timeout);

  console.log('═'.repeat(50));
  console.log('📊 Status / DPS recebido:');
  console.log('═'.repeat(50));
  console.log(JSON.stringify(data, null, 2));
  console.log('');

  if (data.dps) {
    console.log('DPS legível:');
    for (const [code, value] of Object.entries(data.dps)) {
      console.log(`   [${code}] = ${JSON.stringify(value)}`);
    }
    console.log('');
  }

  console.log('Se apareceu DPS acima, o controle local funciona! 🎉\n');
  try { device.disconnect(); } catch {}
  process.exit(0);
});

device.on('error', (err) => {
  clearTimeout(timeout);
  console.error('❌ Erro:', err.message);
  console.error('\nTente:');
  console.error('  • Confirmar localKey no cloud.js');
  console.error('  • Colocar DEVICE_IP manualmente');
  console.error('  • Fechar o app no celular');
  console.error('  • Dispositivo na mesma rede\n');
  process.exit(1);
});

device
  .find({ timeout: 8000 })
  .then(() => device.connect())
  .catch((err) => {
    clearTimeout(timeout);
    console.error('❌ Falha ao conectar:', err.message);
    process.exit(1);
  });
