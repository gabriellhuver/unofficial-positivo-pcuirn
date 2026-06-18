#!/usr/bin/env node
/**
 * Login na API do app Positivo Casa Inteligente (sem Smart Life).
 * Rode: node positivo.js
 *
 * .env:
 *   POSITIVO_EMAIL=seu@email.com
 *   POSITIVO_PASSWORD=sua_senha
 */

require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SESSION_FILE = path.join(__dirname, 'storage/session.json');
const FORCE_LOGIN = process.argv.includes('--login') || process.env.POSITIVO_FORCE_LOGIN === '1';

const CLIENT_ID = 'qk4c93xsttfjsm4ktr94';
/** Mobile app signing secret — extracted from the Positivo Casa Inteligente APK (not a user credential). */
const SECRET_KEY = 'A_9v5dh8yngmhtxdjen7t7qqx5ggmdf5su_w7vm9gr7meys387fpj7y7yrvx8w554cd';
const ENDPOINT = 'https://a1.tuyaus.com/api.json';
const DEVICE_ID = '5fe5abb36728cce7b9cd2185625edccbd6d9bd787e40';

const email = (process.env.POSITIVO_EMAIL || '').trim().toLowerCase();
const password = process.env.POSITIVO_PASSWORD || '';

if (!email || !password) {
  console.error('\n❌ Coloque no .env:\n');
  console.error('   POSITIVO_EMAIL=email_do_app_positivo');
  console.error('   POSITIVO_PASSWORD=senha_do_app\n');
  process.exit(1);
}

function mobileHash(data) {
  const prehash = crypto.createHash('md5').update(data).digest('hex');
  return prehash.slice(8, 16) + prehash.slice(0, 8) + prehash.slice(24, 32) + prehash.slice(16, 24);
}

function sign(params, postData) {
  const KEYS = ['a', 'v', 'lat', 'lon', 'lang', 'deviceId', 'imei', 'imsi', 'appVersion', 'ttid', 'isH5', 'h5Token', 'os', 'clientId', 'postData', 'time', 'requestId', 'n4h5', 'sid', 'sp', 'et'];
  const data = { ...params };
  if (postData) data.postData = postData;

  let strToSign = '';
  for (const key of Object.keys(data).sort()) {
    if (!KEYS.includes(key) || data[key] == null || String(data[key]).length === 0) continue;
    if (strToSign) strToSign += '||';
    strToSign += key === 'postData' ? `${key}=${mobileHash(data[key])}` : `${key}=${data[key]}`;
  }

  return crypto.createHmac('sha256', SECRET_KEY).update(strToSign).digest('hex');
}

function textbookEncrypt(nHex, eHex, message) {
  const n = BigInt(nHex);
  const e = BigInt(eHex);
  let m = 0n;
  for (const b of message) m = (m << 8n) + BigInt(b);

  let c = 1n;
  let base = m % n;
  let exp = e;
  while (exp > 0n) {
    if (exp & 1n) c = (c * base) % n;
    base = (base * base) % n;
    exp >>= 1n;
  }

  // Igual Python long_to_bytes — sem padding até o tamanho da chave
  let hex = c.toString(16);
  if (hex.length % 2) hex = `0${hex}`;
  return hex;
}

function encPassword(publicKey, exponent, pass) {
  const md5hex = crypto.createHash('md5').update(pass, 'utf8').digest('hex');
  return '0'.repeat(64) + textbookEncrypt(publicKey, exponent, Buffer.from(md5hex, 'utf8'));
}

async function api(action, postData, sid, extra = {}) {
  const postJson = postData ? JSON.stringify(postData) : null;
  const API_VERSIONS = {
    'tuya.m.device.sub.list': '1.1',
    'tuya.m.infrared.keydata.get': '2.0',
  };
  const version = API_VERSIONS[action] || '1.0';

  const params = {
    appVersion: '1.1.6',
    appRnVersion: '5.14',
    channel: 'oem',
    deviceId: DEVICE_ID,
    platform: 'Linux',
    requestId: crypto.randomUUID(),
    lang: 'en',
    a: action,
    clientId: CLIENT_ID,
    osSystem: '9',
    os: 'Android',
    timeZoneId: 'America/Sao_Paulo',
    ttid: `sdk_tuya@${CLIENT_ID}`,
    et: '0.0.1',
    v: version,
    sdkVersion: '3.10.0',
    time: String(Math.floor(Date.now() / 1000)),
    ...extra,
  };

  if (sid) params.sid = sid;
  params.sign = sign(params, postJson);

  const url = `${ENDPOINT}?${new URLSearchParams(params)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'User-Agent': 'TY-UA=APP/Android/1.1.6/SDK/null' },
    body: postJson ? new URLSearchParams({ postData: postJson }) : undefined,
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(`${json.errorCode}: ${json.errorMsg || 'erro na API'}`);
  }
  return json.result;
}

async function login() {
  const token = await api('tuya.m.user.email.token.create', { countryCode: 55, email });
  const loginInfo = await api('tuya.m.user.email.password.login', {
    countryCode: '55',
    email,
    ifencrypt: 1,
    options: '{"group": 1}',
    passwd: encPassword(token.publicKey, token.exponent, password),
    token: token.token,
  });
  return { sid: loginInfo.sid, uid: loginInfo.uid || null };
}

function loadSession() {
  try {
    if (!fs.existsSync(SESSION_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    if (data.email !== email || !data.sid) return null;
    return data;
  } catch {
    return null;
  }
}

function saveSession(session) {
  const dir = path.dirname(SESSION_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    SESSION_FILE,
    JSON.stringify(
      {
        sid: session.sid,
        email,
        uid: session.uid || null,
        savedAt: new Date().toISOString(),
      },
      null,
      2
    ),
    'utf8'
  );
}

function clearSession() {
  try {
    if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
  } catch {
    // ignore
  }
}

async function validateSession(sid) {
  try {
    await api('tuya.m.location.list', null, sid);
    return true;
  } catch (err) {
    const msg = String(err.message);
    if (msg.includes('USER_SESSION_INVALID')) return false;
    // Outros erros: sessão provavelmente ainda vale
    return true;
  }
}

async function getSession(options = {}) {
  const quiet = options.quiet === true;
  if (!FORCE_LOGIN) {
    const cached = loadSession();
    if (cached) {
      const ok = await validateSession(cached.sid);
      if (ok) {
        if (!quiet) console.log(`♻️  Sessão em cache (${cached.savedAt})\n`);
        return cached.sid;
      }
      if (!quiet) console.log('⚠️  Sessão expirada — fazendo login de novo...\n');
      clearSession();
    }
  }

  const { sid, uid } = await login();
  saveSession({ sid, uid });
  if (!quiet) console.log('✅ Login OK (sessão salva em storage/session.json)\n');
  return sid;
}

async function main() {
  console.log('\n📱 Login Positivo Casa Inteligente...\n');

  const sid = await getSession({ quiet: false });

  const groups = await api('tuya.m.location.list', null, sid);
  const found = [];

  for (const group of groups) {
    const gid = group.groupId || group.gid || group.id;
    const list = await api('tuya.m.my.group.device.list', null, sid, { gid });

    for (const item of list) {
      const info = await api('tuya.m.device.get', { devId: item.devId }, sid);
      const localKey = info.localKey || info.local_key || null;

      found.push({
        name: info.name || item.name,
        deviceId: info.devId || item.devId,
        localKey,
        ip: info.ip || process.env.DEVICE_IP || null,
        productId: info.productId,
        online: info.isOnline,
        category: info.category || info.productType,
      });
    }
  }

  if (!found.length) {
    console.log('Nenhum dispositivo na conta.\n');
    return;
  }

  console.log(`Encontrados: ${found.length}\n`);

  for (const d of found) {
    console.log('═'.repeat(50));
    console.log(`📱 ${d.name}`);
    console.log('═'.repeat(50));
    console.log(`   deviceId  : ${d.deviceId}`);
    console.log(`   localKey  : ${d.localKey || '(não veio na API — tente cloud.js)'}`);
    console.log(`   ip        : ${d.ip || '(not returned — try discover.js or cloud.js)'}`);
    console.log(`   productId : ${d.productId || '?'}`);
    console.log(`   online    : ${d.online}`);
    console.log('');
    console.log('   → Add to .env:');
    console.log(`   DEVICE_ID=${d.deviceId}`);
    if (d.localKey) console.log(`   DEVICE_LOCAL_KEY=${d.localKey}`);
    if (d.ip) console.log(`   DEVICE_IP=${d.ip}`);
    console.log('');
  }

  fs.writeFileSync('devices.json', JSON.stringify(found, null, 2));
  console.log('Salvo em devices.json');
  console.log('\nPróximo: node probe.js');
  console.log('Forçar novo login: node positivo.js --login\n');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌', err.message);
    if (String(err.message).includes('USER_SESSION_INVALID')) {
      clearSession();
      console.error('\nSessão inválida — rode de novo (ou: node positivo.js --login)\n');
    }
    if (err.message.includes('USER_PASSWD_WRONG')) {
      console.error('\nE-mail ou senha recusados pela API Tuya.');
      console.error('Confere o e-mail exato em Conta e Segurança no app.\n');
    }
    process.exit(1);
  });
}

module.exports = { getSession, api, loadSession, clearSession };
