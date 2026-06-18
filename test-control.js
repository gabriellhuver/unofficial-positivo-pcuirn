#!/usr/bin/env node
/**
 * Script de teste — listar dispositivos e enviar comandos IR.
 *
 * Uso:
 *   node test-control.js list
 *   node test-control.js remotes
 *   node test-control.js buttons [TV|Ar condicionado]
 *   node test-control.js send <remoto> <botão>     ex: send TV power
 *   node test-control.js status [deviceId]
 *   node test-control.js local
 */

require('dotenv').config();

const {
  getSession,
  listDevices,
  getGateway,
  listRemotes,
  getIrButtons,
  sendIrButton,
  getDeviceStatus,
} = require('./lib/positivo-client');
const { getLocalStatus } = require('./lib/local-device');

const [,, cmd, arg1, arg2] = process.argv;

const HELP = `
Comandos:
  list              Lista dispositivos da conta
  remotes           Lista controles IR (TV, AC...) no PCUIRN
  buttons [nome]    Lista botões IR de um remoto
  send <remoto> <botão>   Envia comando IR via nuvem
  status [id]       Status DPS via nuvem
  local             Status via conexão local (TuyAPI)

Exemplos:
  node test-control.js buttons TV
  node test-control.js send TV power
  node test-control.js send "Ar condicionado" power_on
`;

async function cmdList(sid) {
  const devices = await listDevices(sid);
  console.log(`\n📱 ${devices.length} dispositivo(s)\n`);
  for (const d of devices) {
    console.log(`  ${d.isGateway ? '🎛️ ' : '📺'} ${d.name}`);
    console.log(`     id: ${d.deviceId}  online: ${d.online}  ip: ${d.ip || '?'}`);
  }
  console.log('');
}

async function cmdRemotes(sid) {
  const devices = await listDevices(sid);
  const gw = getGateway(devices);
  if (!gw) throw new Error('Gateway PCUIRN não encontrado');

  const remotes = await listRemotes(sid, gw.deviceId);
  console.log(`\n🎛️  Gateway: ${gw.name} (${gw.deviceId})\n`);
  for (const r of remotes) {
    console.log(`  📺 ${r.name || r.devId}`);
    console.log(`     id: ${r.devId}  product: ${r.productId || '?'}`);
  }
  console.log('');
}

async function findRemote(sid, name) {
  const devices = await listDevices(sid);
  const gw = getGateway(devices);
  if (!gw) throw new Error('Gateway não encontrado');

  const remotes = await listRemotes(sid, gw.deviceId);
  const remote = remotes.find(
    (r) =>
      (r.name || '').toLowerCase().includes(name.toLowerCase()) ||
      r.devId === name
  );
  if (!remote) {
    const names = remotes.map((r) => r.name || r.devId).join(', ');
    throw new Error(`Remoto "${name}" não encontrado. Disponíveis: ${names}`);
  }
  return { gw, remote };
}

async function cmdButtons(sid, remoteName) {
  const { gw, remote } = await findRemote(sid, remoteName || 'TV');
  const buttons = await getIrButtons(sid, gw.deviceId, remote.devId);

  console.log(`\n🔘 Botões: ${remote.name} (${buttons.length})\n`);
  for (const b of buttons) {
    console.log(`  • ${b.name}${b.learned ? ' (aprendido)' : ''}`);
  }
  console.log('');
}

async function cmdSend(sid, remoteName, buttonName) {
  if (!remoteName || !buttonName) {
    throw new Error('Uso: send <remoto> <botão>  ex: send TV power');
  }
  const { gw, remote } = await findRemote(sid, remoteName);
  const btn = await sendIrButton(sid, gw.deviceId, remote.devId, buttonName);

  console.log(`\n✅ Comando enviado!`);
  console.log(`   remoto : ${remote.name}`);
  console.log(`   botão  : ${btn.name}`);
  console.log(`   via    : nuvem Positivo\n`);
}

async function cmdStatus(sid, deviceId) {
  const id = deviceId || process.env.DEVICE_ID;
  const status = await getDeviceStatus(sid, id);
  console.log('\n📊 Status (nuvem):\n');
  console.log(JSON.stringify(status, null, 2));
  console.log('');
}

async function cmdLocal() {
  console.log('\n🔌 Conexão local...\n');
  const data = await getLocalStatus();
  console.log('📊 Resposta local:\n');
  console.log(JSON.stringify(data, null, 2));
  console.log('');
}

async function main() {
  if (!cmd || cmd === 'help' || cmd === '-h') {
    console.log(HELP);
    return;
  }

  const needsCloud = cmd !== 'local';
  const sid = needsCloud ? await getSession({ quiet: cmd !== 'list' }) : null;

  switch (cmd) {
    case 'list':
      await cmdList(sid);
      break;
    case 'remotes':
      await cmdRemotes(sid);
      break;
    case 'buttons':
      await cmdButtons(sid, arg1 || 'TV');
      break;
    case 'send':
      await cmdSend(sid, arg1, arg2);
      break;
    case 'status':
      await cmdStatus(sid, arg1);
      break;
    case 'local':
      await cmdLocal();
      break;
    default:
      console.error(`Comando desconhecido: ${cmd}`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
