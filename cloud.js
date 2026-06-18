#!/usr/bin/env node
/**
 * Lista dispositivos do projeto Tuya Cloud (iot.tuya.com).
 * Rode: node cloud.js
 *
 * Precisa no .env:
 *   TUYA_ACCESS_ID=
 *   TUYA_ACCESS_SECRET=
 *   TUYA_REGION=eu   (cn | us | eu | in)
 */

require('dotenv').config();
const { TuyaContext } = require('@tuya/tuya-connector-nodejs');

const REGIONS = {
  cn: 'https://openapi.tuyacn.com',
  us: 'https://openapi.tuyaus.com',
  eu: 'https://openapi.tuyaeu.com',
  in: 'https://openapi.tuyain.com',
};

const accessId = process.env.TUYA_ACCESS_ID;
const accessSecret = process.env.TUYA_ACCESS_SECRET;
const region = process.env.TUYA_REGION || 'us';

if (!accessId || !accessSecret) {
  console.error('\n❌ Configure o .env primeiro:\n');
  console.error('   TUYA_ACCESS_ID=...');
  console.error('   TUYA_ACCESS_SECRET=...');
  console.error('   TUYA_REGION=eu\n');
  console.error('Como pegar: https://iot.tuya.com → Cloud → seu projeto → Access ID/Secret\n');
  process.exit(1);
}

const tuya = new TuyaContext({
  baseUrl: REGIONS[region] || REGIONS.eu,
  accessKey: accessId,
  secretKey: accessSecret,
});

async function main() {
  console.log('\n☁️  Buscando dispositivos na Tuya Cloud...\n');
  console.log(`   Região: ${region} → ${REGIONS[region]}\n`);

  const listRes = await tuya.request({
    path: '/v1.0/iot-03/devices',
    method: 'GET',
  });

  if (!listRes.success) {
    console.error('❌ Erro na API:', listRes.msg || listRes.code || listRes);
    process.exit(1);
  }

  const list = listRes.result?.list || listRes.result || [];

  if (!list.length) {
    console.log('Nenhum dispositivo no projeto.');
    console.log('\nDica: vincule o app Positivo Casa Inteligente ao projeto no iot.tuya.com\n');
    return;
  }

  console.log(`Encontrados: ${list.length}\n`);

  for (const item of list) {
    const id = item.id;
    let detail = null;

    try {
      detail = await tuya.device.detail({ device_id: id });
    } catch (e) {
      // segue com dados básicos
    }

    const d = detail?.result || {};
    const localKey = d.local_key || item.local_key || '(não retornado)';
    const ip = d.ip || item.ip || '(desconhecido)';

    console.log('═'.repeat(50));
    console.log(`📱 ${item.name || item.custom_name || id}`);
    console.log('═'.repeat(50));
    console.log(`   deviceId  : ${id}`);
    console.log(`   localKey  : ${localKey}`);
    console.log(`   ip        : ${ip}`);
    console.log(`   productId : ${item.product_id || d.product_id || '?'}`);
    console.log(`   category  : ${item.category || '?'}`);
    console.log(`   online    : ${item.is_online ?? d.is_online ?? '?'}`);
    console.log(`   firmware  : ${d.ver_sw || '?'}`);

    if (d.status?.length) {
      console.log('\n   Status (DPS):');
      for (const s of d.status) {
        console.log(`     ${s.code} = ${JSON.stringify(s.value)}`);
      }
    }
    console.log('');

    console.log('   → Cole no .env:');
    console.log(`   DEVICE_ID=${id}`);
    if (localKey !== '(não retornado)') console.log(`   DEVICE_LOCAL_KEY=${localKey}`);
    if (ip !== '(desconhecido)') console.log(`   DEVICE_IP=${ip}`);
    console.log('');
  }

  console.log('Próximo: node probe.js\n');
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
