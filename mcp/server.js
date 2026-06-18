#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const service = require('../lib/service');
const { getCatalog } = require('../lib/commands');

const server = new McpServer({
  name: 'casa-inteligente-pcuirn',
  version: '1.1.0',
});

function tool(name, description, schema, handler) {
  server.registerTool(name, { description, inputSchema: schema }, async (args) => {
    try {
      const result = await handler(args);
      return {
        content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      return { content: [{ type: 'text', text: `Erro: ${err.message}` }], isError: true };
    }
  });
}

const catalog = getCatalog();

// ── TV ──────────────────────────────────────────
tool('tv_power', 'Liga/desliga a TV', {}, () => service.sendTv('power'));
tool('tv_volume_up', 'Volume +', {}, () => service.sendTv('volume_up'));
tool('tv_volume_down', 'Volume −', {}, () => service.sendTv('volume_down'));
tool('tv_mute', 'Mudo', {}, () => service.sendTv('mute'));
tool('tv_channel_up', 'Canal +', {}, () => service.sendTv('channel_up'));
tool('tv_channel_down', 'Canal −', {}, () => service.sendTv('channel_down'));
tool('tv_ok', 'Botão OK da TV', {}, () => service.sendTv('ok'));
tool('tv_menu', 'Menu da TV', {}, () => service.sendTv('menu'));

tool(
  'tv_send',
  'Envia comando customizado da TV',
  { command: z.enum(catalog.tv.commands.map((c) => c.id)).describe('ID do comando') },
  ({ command }) => service.sendTv(command)
);

// ── Ar condicionado ─────────────────────────────
tool('ac_power_on', 'Liga o ar condicionado', {}, () => service.sendAc({ action: 'on' }));
tool('ac_power_off', 'Desliga o ar condicionado', {}, () => service.sendAc({ action: 'off' }));

tool(
  'ac_set',
  'Define modo, temperatura e ventilador do ar',
  {
    mode: z.number().min(0).max(4).describe('0=frio 1=quente 2=ventilar 3=auto 4=seco'),
    temp: z.number().min(16).max(30).default(22).describe('Temperatura °C (ignorado no modo ventilar)'),
    fan: z.number().min(0).max(3).default(0).describe('0=auto 1=baixa 2=média 3=alta'),
  },
  ({ mode, temp, fan }) => service.sendAc({ action: 'set', mode, temp, fan })
);

tool(
  'ac_set_temperature',
  'Define temperatura do ar (modo frio, 22°C padrão)',
  { temp: z.number().min(16).max(30).describe('Temperatura em °C') },
  ({ temp }) => service.sendAc({ action: 'set', mode: 0, temp, fan: 0 })
);

tool(
  'ac_set_mode',
  'Define modo do ar condicionado',
  {
    mode: z.enum(['cool', 'heat', 'fan', 'auto', 'dry']).describe('Modo do ar'),
    temp: z.number().min(16).max(30).optional().describe('Temperatura (não usar em fan)'),
  },
  ({ mode, temp }) => {
    const map = { cool: 0, heat: 1, fan: 2, auto: 3, dry: 4 };
    return service.sendAc({ action: 'set', mode: map[mode], temp: temp || 22, fan: 0 });
  }
);

// ── Info ────────────────────────────────────────
tool('list_commands', 'Lista comandos disponíveis de TV e Ar', {}, () => {
  const tv = catalog.tv.commands.map((c) => `tv: ${c.id} (${c.label})`).join('\n');
  const ac = catalog.ac.modes.map((m) => `ac modo: ${m.id} (${m.label})`).join('\n');
  return `${tv}\n${ac}\n\ntemp: ${catalog.ac.tempMin}-${catalog.ac.tempMax}°C`;
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
