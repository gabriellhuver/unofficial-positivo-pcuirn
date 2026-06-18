/** Comandos curados — TV e Ar condicionado (Gree) */

const TV = {
  remote: 'TV',
  commands: [
    { id: 'power', label: 'Power', icon: '⏻', button: 'power' },
    { id: 'volume_up', label: 'Vol +', icon: '🔊', button: 'volume_up' },
    { id: 'volume_down', label: 'Vol −', icon: '🔉', button: 'volume down' },
    { id: 'mute', label: 'Mudo', icon: '🔇', button: 'mute' },
    { id: 'channel_up', label: 'Canal +', icon: '▲', button: 'channel_up' },
    { id: 'channel_down', label: 'Canal −', icon: '▼', button: 'channel_down' },
    { id: 'ok', label: 'OK', icon: '✓', button: 'ok' },
    { id: 'menu', label: 'Menu', icon: '☰', button: 'menu' },
    { id: 'nav_up', label: '↑', icon: '↑', button: 'navigate_up' },
    { id: 'nav_down', label: '↓', icon: '↓', button: 'navigate_down' },
    { id: 'nav_left', label: '←', icon: '←', button: 'navigate_left' },
    { id: 'nav_right', label: '→', icon: '→', button: 'navigate_right' },
  ],
};

const AC = {
  remote: 'Ar condicionado',
  brand: 'Gree',
  modes: [
    { id: 'cool', label: 'Frio', value: 0 },
    { id: 'heat', label: 'Quente', value: 1 },
    { id: 'fan', label: 'Ventilar', value: 2 },
    { id: 'auto', label: 'Auto', value: 3 },
    { id: 'dry', label: 'Seco', value: 4 },
  ],
  fanSpeeds: [
    { id: 0, label: 'Auto' },
    { id: 1, label: 'Baixa' },
    { id: 2, label: 'Média' },
    { id: 3, label: 'Alta' },
  ],
  tempMin: 16,
  tempMax: 30,
  powerOn: 'power on',
  powerOff: 'power off',

  /** Monta chave IR Gree: M0_T22_S1 ou M2_S2 (só ventilar) */
  buildKey(mode, temp, fan) {
    if (mode === 2) return `M2_S${fan}`;
    return `M${mode}_T${temp}_S${fan}`;
  },
};

function getCatalog() {
  return {
    tv: {
      remote: TV.remote,
      commands: TV.commands.map(({ id, label, icon }) => ({ id, label, icon })),
    },
    ac: {
      remote: AC.remote,
      brand: AC.brand,
      modes: AC.modes,
      fanSpeeds: AC.fanSpeeds,
      tempMin: AC.tempMin,
      tempMax: AC.tempMax,
    },
  };
}

function resolveTvButton(commandId) {
  const cmd = TV.commands.find((c) => c.id === commandId);
  if (!cmd) throw new Error(`Comando TV "${commandId}" inválido`);
  return cmd.button;
}

function resolveAcAction(action, { mode = 0, temp = 22, fan = 0 } = {}) {
  if (action === 'on') return AC.powerOn;
  if (action === 'off') return AC.powerOff;
  if (action === 'set') return AC.buildKey(mode, temp, fan);
  throw new Error(`Ação AC "${action}" inválida — use on, off ou set`);
}

module.exports = { TV, AC, getCatalog, resolveTvButton, resolveAcAction };
