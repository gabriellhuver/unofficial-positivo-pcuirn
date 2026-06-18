import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || '';

async function api(path, options) {
  const res = await fetch(`${API}${path}`, options);
  const json = await res.json();
  if (!json.success && json.ok !== true) throw new Error(json.error || 'Erro na API');
  return json;
}

function RemotePanel({ title, icon, children, onSend, sending }) {
  return (
    <section className="card remote-card">
      <h2>{icon} {title}</h2>
      {children}
    </section>
  );
}

export default function App() {
  const [catalog, setCatalog] = useState(null);
  const [gateway, setGateway] = useState(null);
  const [tab, setTab] = useState('tv');
  const [acMode, setAcMode] = useState(0);
  const [acTemp, setAcTemp] = useState(22);
  const [acFan, setAcFan] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([api('/api/commands'), api('/api/remotes')])
      .then(([cat, rem]) => {
        setCatalog(cat);
        setGateway(rem.gateway);
      })
      .catch((e) => setMsg(`Erro: ${e.message}`))
      .finally(() => setLoading(false));
  }, []);

  async function sendTv(command) {
    setSending(`tv-${command}`);
    setMsg('');
    try {
      const res = await api('/api/tv/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      setMsg(`✅ TV → ${res.button}`);
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setSending('');
    }
  }

  async function sendAc(action) {
    setSending(`ac-${action}`);
    setMsg('');
    try {
      const body = action === 'set'
        ? { action, mode: acMode, temp: acTemp, fan: acFan }
        : { action };
      const res = await api('/api/ac/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const label = action === 'set'
        ? `${res.button} (${catalog.ac.modes.find(m => m.value === acMode)?.label} ${acTemp}°C)`
        : res.button;
      setMsg(`✅ Ar → ${label}`);
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setSending('');
    }
  }

  if (loading) return <div className="app"><p className="loading">Carregando...</p></div>;
  if (!catalog) return <div className="app"><p className="loading">Sem dados</p></div>;

  return (
    <div className="app">
      <header>
        <h1>🏠 Casa Inteligente</h1>
        <p className="sub">Controle IR — TV & Ar Condicionado</p>
        {gateway && (
          <p className="gateway">
            PCUIRN <span className={gateway.online ? 'on' : 'off'}>{gateway.online ? '● online' : '○ offline'}</span>
          </p>
        )}
      </header>

      <nav className="tabs">
        <button type="button" className={tab === 'tv' ? 'active' : ''} onClick={() => setTab('tv')}>📺 TV</button>
        <button type="button" className={tab === 'ac' ? 'active' : ''} onClick={() => setTab('ac')}>❄️ Ar</button>
      </nav>

      {tab === 'tv' && (
        <RemotePanel title="Samsung TV" icon="📺">
          <div className="grid tv-power">
            <button type="button" className="power" disabled={!!sending} onClick={() => sendTv('power')}>
              {sending === 'tv-power' ? '...' : '⏻ Power'}
            </button>
          </div>
          <div className="grid">
            {catalog.tv.commands.filter((c) => c.id !== 'power').map((c) => (
              <button key={c.id} type="button" disabled={!!sending} onClick={() => sendTv(c.id)}>
                <span className="btn-icon">{c.icon}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
          <div className="dpad">
            <button type="button" className="dpad-btn" disabled={!!sending} onClick={() => sendTv('nav_up')}>↑</button>
            <div className="dpad-mid">
              <button type="button" className="dpad-btn" disabled={!!sending} onClick={() => sendTv('nav_left')}>←</button>
              <button type="button" className="dpad-btn ok" disabled={!!sending} onClick={() => sendTv('ok')}>OK</button>
              <button type="button" className="dpad-btn" disabled={!!sending} onClick={() => sendTv('nav_right')}>→</button>
            </div>
            <button type="button" className="dpad-btn" disabled={!!sending} onClick={() => sendTv('nav_down')}>↓</button>
          </div>
        </RemotePanel>
      )}

      {tab === 'ac' && (
        <RemotePanel title={`Ar ${catalog.ac.brand}`} icon="❄️">
          <div className="grid ac-power">
            <button type="button" className="on" disabled={!!sending} onClick={() => sendAc('on')}>
              {sending === 'ac-on' ? '...' : '▶ Ligar'}
            </button>
            <button type="button" className="off" disabled={!!sending} onClick={() => sendAc('off')}>
              {sending === 'ac-off' ? '...' : '⏹ Desligar'}
            </button>
          </div>

          <div className="ac-controls">
            <label>
              Modo
              <select value={acMode} onChange={(e) => setAcMode(Number(e.target.value))}>
                {catalog.ac.modes.map((m) => (
                  <option key={m.id} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>

            {acMode !== 2 && (
              <label>
                Temperatura — {acTemp}°C
                <input
                  type="range"
                  min={catalog.ac.tempMin}
                  max={catalog.ac.tempMax}
                  value={acTemp}
                  onChange={(e) => setAcTemp(Number(e.target.value))}
                />
              </label>
            )}

            <label>
              Ventilador
              <select value={acFan} onChange={(e) => setAcFan(Number(e.target.value))}>
                {catalog.ac.fanSpeeds.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </label>
          </div>

          <button type="button" className="apply" disabled={!!sending} onClick={() => sendAc('set')}>
            {sending === 'ac-set' ? 'Enviando...' : `Aplicar ${catalog.ac.modes.find(m => m.value === acMode)?.label} ${acMode !== 2 ? acTemp + '°C' : ''}`}
          </button>
        </RemotePanel>
      )}

      {msg && <p className="toast">{msg}</p>}
    </div>
  );
}
