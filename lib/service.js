const {
  getSession,
  listDevices,
  getGateway,
  listRemotes,
  getIrButtons,
  sendIrButton,
  getDeviceStatus,
  findRemote,
} = require('./positivo-client');
const { getLocalStatus } = require('./local-device');
const { getCatalog, resolveTvButton, resolveAcAction } = require('./commands');

async function withSession(fn) {
  const sid = await getSession({ quiet: true });
  return fn(sid);
}

async function getDevices() {
  return withSession((sid) => listDevices(sid, { quiet: true }));
}

async function getRemotes() {
  return withSession(async (sid) => {
    const devices = await listDevices(sid, { quiet: true });
    const gw = getGateway(devices);
    if (!gw) throw new Error('Gateway não encontrado');
    const remotes = await listRemotes(sid, gw.deviceId);
    return {
      gateway: { name: gw.name, deviceId: gw.deviceId, online: gw.online },
      remotes: remotes.map((r) => ({
        name: r.name || r.devId,
        deviceId: r.devId,
        productId: r.productId,
      })),
    };
  });
}

async function getButtons(remoteName) {
  return withSession(async (sid) => {
    const { gateway, remote } = await findRemote(sid, remoteName);
    const buttons = await getIrButtons(sid, gateway.deviceId, remote.devId);
    return {
      remote: remote.name || remote.devId,
      buttons: buttons.map((b) => ({ name: b.name, learned: b.learned })),
    };
  });
}

async function sendIr(remoteName, buttonName) {
  return withSession(async (sid) => {
    const { gateway, remote } = await findRemote(sid, remoteName);
    const btn = await sendIrButton(sid, gateway.deviceId, remote.devId, buttonName);
    return {
      remote: remote.name || remote.devId,
      button: btn.name,
      via: 'cloud',
    };
  });
}

async function sendTv(commandId) {
  const button = resolveTvButton(commandId);
  const result = await sendIr('TV', button);
  return { ...result, command: commandId };
}

async function sendAc({ action, mode = 0, temp = 22, fan = 0 }) {
  const button = resolveAcAction(action, { mode, temp, fan });
  const result = await sendIr('Ar condicionado', button);
  return { ...result, action, mode, temp, fan, button };
}

async function getStatus(deviceId) {
  return withSession((sid) => getDeviceStatus(sid, deviceId || process.env.DEVICE_ID));
}

module.exports = {
  getCatalog,
  getDevices,
  getRemotes,
  getButtons,
  sendIr,
  sendTv,
  sendAc,
  getStatus,
  getLocalStatus,
};
