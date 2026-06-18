#!/usr/bin/env node
/**
 * Scan básico na rede — protocolo Tuya UDP (porta 6666/6667).
 * Rode: node discover.js
 *
 * O PCUIRN (e outros Tuya) respondem com JSON contendo gwId, productKey, ip, etc.
 */

const dgram = require('dgram');
const os = require('os');

const TIMEOUT_SEC = 8;
const BROADCAST_PORT = 6666;
const LISTEN_PORT = 6667;

function getLocalIps() {
  const ips = [];
  for (const iface of Object.values(os.networkInterfaces())) {
    for (const addr of iface || []) {
      if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address);
    }
  }
  return ips.length ? ips : ['127.0.0.1'];
}

function scan() {
  const found = [];
  const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

  console.log('\n🔍 Procurando dispositivos Tuya na rede...\n');
  console.log(`   Timeout: ${TIMEOUT_SEC}s`);
  console.log(`   Broadcast → porta ${BROADCAST_PORT}`);
  console.log(`   Escutando  → porta ${LISTEN_PORT}\n`);

  socket.on('message', (msg, rinfo) => {
    const text = msg.toString('utf8').trim();
    console.log('─'.repeat(50));
    console.log(`📡 Resposta de ${rinfo.address}:${rinfo.port}`);
    console.log('─'.repeat(50));

    try {
      const data = JSON.parse(text);
      console.log(JSON.stringify(data, null, 2));
      found.push({ ip: rinfo.address, type: 'json', ...data });
    } catch {
      const isBinary = /[\x00-\x08\x0e-\x1f]/.test(text.slice(0, 20));
      if (isBinary) {
        console.log('(resposta criptografada/binária — dispositivo Tuya encontrado!)');
        console.log(`   IP provável do dispositivo: ${rinfo.address}`);
        console.log(`   Tamanho do pacote: ${msg.length} bytes`);
        console.log(`   Hex (início): ${msg.slice(0, 32).toString('hex')}`);
        found.push({ ip: rinfo.address, type: 'encrypted', size: msg.length });
      } else {
        console.log('(não é JSON, raw):');
        console.log(text);
        found.push({ ip: rinfo.address, type: 'raw', raw: text });
      }
    }
    console.log('');
  });

  socket.on('error', (err) => {
    console.error('❌ Erro UDP:', err.message);
    process.exit(1);
  });

  socket.bind(LISTEN_PORT, () => {
    socket.setBroadcast(true);
    const ips = getLocalIps();
    console.log(`   IPs locais: ${ips.join(', ')}\n`);

    const send = () => {
      for (const ip of ips) {
        const payload = Buffer.from(JSON.stringify({ from: 'app', ip }));
        socket.send(payload, BROADCAST_PORT, '255.255.255.255');
        console.log(`   → broadcast enviado (from: ${ip})`);
      }
    };

    send();
    setTimeout(send, 2000);
    setTimeout(send, 4000);

    setTimeout(() => {
      socket.close();
      console.log('═'.repeat(50));
      console.log(`✅ Scan finalizado — ${found.length} resposta(s)\n`);

      if (found.length === 0) {
        console.log('Nada encontrado. Verifique:');
        console.log('  • PCUIRN ligado e na mesma rede Wi-Fi');
        console.log('  • Firewall não bloqueando UDP 6667');
        console.log('  • Rode com sudo se necessário (Linux/Mac)\n');
      } else {
        console.log('Campos úteis pra anotar:');
        for (const d of found) {
          if (d.type === 'encrypted') {
            console.log(`  • ip         : ${d.ip}  ← dispositivo respondeu (criptografado)`);
            console.log(`  • próximo    : pegar deviceId + localKey no Tuya Cloud (iot.tuya.com)`);
          } else {
            console.log(`  • gwId/devId : ${d.gwId || d.devId || '?'}`);
            console.log(`  • productKey : ${d.productKey || '?'}`);
            console.log(`  • ip         : ${d.ip || '?'}`);
            console.log(`  • version    : ${d.version || '?'}`);
            console.log(`  • token      : ${d.token ? '(presente)' : '(vazio — precisa Tuya Cloud)'}`);
          }
          console.log('');
        }
      }

      process.exit(0);
    }, TIMEOUT_SEC * 1000);
  });
}

scan();
