const fs = require('fs');
const path = require('path');
const { getSession, api } = require('../positivo');

const IR_VENDOR = '3';
const GATEWAY_PRODUCT_ID = 'lwpag3bu0faaowlj';
const DEVICES_FILE = path.join(__dirname, '../devices.json');

async function listDevices(sid, { quiet } = {}) {
  if (fs.existsSync(DEVICES_FILE) && !process.env.POSITIVO_REFRESH_DEVICES) {
    return JSON.parse(fs.readFileSync(DEVICES_FILE, 'utf8'));
  }

  const groups = await api('tuya.m.location.list', null, sid);
  const found = [];

  for (const group of groups) {
    const gid = group.groupId || group.gid || group.id;
    const list = await api('tuya.m.my.group.device.list', null, sid, { gid });

    for (const item of list) {
      const info = await api('tuya.m.device.get', { devId: item.devId }, sid);
      found.push({
        name: info.name || item.name,
        deviceId: info.devId || item.devId,
        localKey: info.localKey || info.local_key || null,
        ip: info.ip || process.env.DEVICE_IP || null,
        productId: info.productId,
        online: info.isOnline,
        category: info.category || info.productType,
        isGateway: info.productId === GATEWAY_PRODUCT_ID,
      });
    }
  }

  if (!quiet) {
    fs.writeFileSync(DEVICES_FILE, JSON.stringify(found, null, 2));
  }
  return found;
}

function getGateway(devices) {
  return (
    devices.find((d) => d.productId === GATEWAY_PRODUCT_ID) ||
    devices.find((d) => /controle|universal|ir/i.test(d.name || '')) ||
    devices.find((d) => d.deviceId === process.env.DEVICE_ID)
  );
}

async function listRemotes(sid, gatewayId) {
  return api('tuya.m.device.sub.list', { meshId: gatewayId }, sid);
}

function parseIrButtons(record, sid, gatewayId, remoteId) {
  if (record?.exts && JSON.parse(record.exts).study === 1) {
    return api(
      'tuya.m.infrared.learn.get',
      { devId: gatewayId, gwId: gatewayId, subDevId: remoteId, vender: IR_VENDOR },
      sid
    ).then((buttons) =>
      buttons.map((b) => ({
        name: b.keyName || b.name,
        learned: true,
        dps: {
          1: 'study_key',
          3: '',
          7: Buffer.from(BigInt(`0x${b.compressPulse}`).toString(16).padStart(2, '0'), 'hex').toString('base64'),
        },
      }))
    );
  }

  return api(
    'tuya.m.infrared.keydata.get',
    {
      devId: record.devId,
      devTypeId: String(record.devTypeId),
      gwId: record.gwId,
      remoteId: String(record.remoteId),
      vender: IR_VENDOR,
    },
    sid
  ).then((buttons) => {
    const list = buttons.compressPulseList || [];
    return list.map((b) => ({
      name: b.keyName || b.key,
      learned: false,
      dps: {
        1: 'send_ir',
        3: JSON.parse(b.exts)['99999'],
        4: b.compressPulse,
        10: 300,
        13: 0,
      },
    }));
  });
}

async function getIrButtons(sid, gatewayId, remoteId) {
  const record = await api(
    'tuya.m.infrared.record.get',
    { devId: remoteId, gwId: remoteId, subDevId: remoteId, vender: IR_VENDOR },
    sid
  );
  return parseIrButtons(record, sid, gatewayId, remoteId);
}

async function sendDps(sid, deviceId, gatewayId, dps) {
  return api(
    'tuya.m.device.dp.publish',
    { devId: deviceId, gwId: gatewayId, dps: JSON.stringify(dps) },
    sid
  );
}

async function sendIrButton(sid, gatewayId, remoteId, buttonName, buttonsCache) {
  const buttons = buttonsCache || (await getIrButtons(sid, gatewayId, remoteId));
  const btn = buttons.find(
    (b) => b.name && b.name.toLowerCase() === String(buttonName).toLowerCase()
  );
  if (!btn) {
    const names = buttons.map((b) => b.name).join(', ');
    throw new Error(`Botão "${buttonName}" não encontrado. Disponíveis: ${names || '(nenhum)'}`);
  }
  await sendDps(sid, remoteId, gatewayId, btn.dps);
  return btn;
}

async function getDeviceStatus(sid, deviceId) {
  return api('tuya.m.device.dp.get', { devId: deviceId }, sid);
}

async function findRemote(sid, name) {
  const devices = await listDevices(sid, { quiet: true });
  const gw = getGateway(devices);
  if (!gw) throw new Error('Gateway PCUIRN não encontrado');

  const remotes = await listRemotes(sid, gw.deviceId);
  const remote = remotes.find(
    (r) =>
      (r.name || '').toLowerCase().includes(String(name).toLowerCase()) ||
      r.devId === name
  );
  if (!remote) {
    const names = remotes.map((r) => r.name || r.devId).join(', ');
    throw new Error(`Remoto "${name}" não encontrado. Disponíveis: ${names}`);
  }
  return { gateway: gw, remote };
}

module.exports = {
  IR_VENDOR,
  GATEWAY_PRODUCT_ID,
  getSession,
  api,
  listDevices,
  getGateway,
  listRemotes,
  getIrButtons,
  sendDps,
  sendIrButton,
  getDeviceStatus,
  findRemote,
};
