# Casa Inteligente — Positivo PCUIRN

Control the **Positivo Smart Controle Universal 2** (PCUIRN) outside the official app: REST API, web UI, and MCP tools for Cursor / Claude Desktop.

The device is a Tuya-based IR blaster. This project reverse-engineers the **Positivo Casa Inteligente** mobile API (not Smart Life) and documents how IR commands reach your TV and air conditioner through the cloud.

> **Disclaimer:** This is an unofficial community project. It is not affiliated with Positivo or Tuya. Use at your own risk.

### TL;DR

1. **Setup:** `npm install` → copy `.env.example` → paste Positivo app **email + password** → configure MCP in Cursor (once)
2. **Use:** open Cursor chat and say *"liga o ar no 23"* or *"turn on the TV"* — done. No `npm start`, no device IDs, no Tuya Cloud.

---

## What works

| Feature | Method | Notes |
|---------|--------|-------|
| TV power, volume, channels, navigation | Cloud IR | Works without closing the mobile app |
| AC on/off, mode, temperature, fan | Cloud IR | Gree-style button keys (`M0_T23_S0`) |
| Device discovery | Positivo API / UDP scan | `positivo.js`, `discover.js` |
| Local LAN control | TuyAPI | Optional; only one client at a time |
| Cursor / Claude chat control | MCP server | `mcp/server.js` |

---

## Requirements

- Node.js 18+
- A Positivo Casa Inteligente account (same email/password as the mobile app)
- PCUIRN paired in the app with IR remotes configured (TV, AC, etc.)

---

## Setup (5 minutes)

### What you actually need

| `.env` variable | Required? | Used for |
|-----------------|-----------|----------|
| `POSITIVO_EMAIL` | **Yes** | Login to Positivo API |
| `POSITIVO_PASSWORD` | **Yes** | Login to Positivo API |
| `DEVICE_ID` | No | Local LAN only (`probe.js`, `/api/local/status`) |
| `DEVICE_LOCAL_KEY` | No | Local LAN only |
| `DEVICE_IP` | No | Local LAN only |
| `TUYA_ACCESS_ID` / `TUYA_ACCESS_SECRET` | No | Alternative way to get `localKey` — see [SETUP-TUYA.md](SETUP-TUYA.md) |

**Cloud control (TV, AC, API, web UI, MCP) only needs your Positivo app email and password.** No Tuya IoT Cloud developer account, no Smart Life, no `iot.tuya.com` project.

The PCUIRN must already be paired in the Positivo app with your IR remotes (TV, AC, etc.) configured.

### Quick start

```bash
git clone https://github.com/YOUR_USER/positivo-pcuirn.git
cd positivo-pcuirn

npm install
cp .env.example .env
```

Edit `.env` — only these two lines are required:

```env
POSITIVO_EMAIL=your@email.com
POSITIVO_PASSWORD=your_app_password
```

Then:

```bash
npm run build    # install + build frontend (first time only)
npm start        # API + UI → http://localhost:3000
```

Test from another terminal:

```bash
# Health check
curl http://localhost:3000/api/health

# List IR remotes (TV, AC…)
curl http://localhost:3000/api/remotes

# Turn on TV
curl -X POST http://localhost:3000/api/tv/send \
  -H "Content-Type: application/json" \
  -d '{"command":"power"}'

# AC at 23°C (cool, auto fan)
curl -X POST http://localhost:3000/api/ac/send \
  -H "Content-Type: application/json" \
  -d '{"action":"set","mode":0,"temp":23,"fan":0}'
```

On first run, login happens automatically and the session is saved to `storage/session.json` (gitignored). You don't need to run any other setup script.

### Optional: device ID / localKey (local LAN only)

**Skip this** if you only use cloud control (TV, AC, Cursor, web UI).

One command does everything — login, list devices, print `.env` lines, save cache:

```bash
node positivo.js
```

Look for **Smart Controle Universal 2** (`productId: lwpag3bu0faaowlj`). Copy the printed lines into `.env` only if you need local control (`probe.js`).

If IP is missing, run `node discover.js` to find it on your Wi-Fi.

You do **not** need Tuya IoT Cloud (`iot.tuya.com`) for normal use — see [SETUP-TUYA.md](SETUP-TUYA.md) only as a last resort.

### Cursor MCP (one-time)

1. **Cursor Settings → MCP** → add server (see `mcp/cursor-mcp.example.json`)
2. Set the **absolute path** to `mcp/server.js`
3. Restart Cursor

The MCP server uses the same `.env` (email + password). **`npm start` does not need to be running** for Cursor control.

### Development (split API + UI)

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run frontend:dev      # http://localhost:5173 (proxies to API)
```

---

## How to use

After setup, pick how you want to control things. **No device IDs, no curl, no Tuya Cloud** required for the options below.

### 1. Cursor / Claude — just ask (recommended)

With MCP configured, talk to the AI in normal language. It calls the tools and sends IR commands over the cloud.

**You don't need `npm start` running.** Only `.env` with email + password.

Examples (Portuguese or English — both work):

| You say | What happens |
|---------|----------------|
| *"Liga o ar no 23"* | AC on, cool mode, 23°C |
| *"Desliga o ar"* | AC off |
| *"Coloca o ar em 16 graus"* | Sets temperature to 16°C |
| *"Liga a TV"* | TV power |
| *"Aumenta o volume da TV"* | Volume up |
| *"Turn on the AC at 23 degrees"* | Same as above |
| *"Mute the TV"* | TV mute |

The agent picks the right MCP tool (`ac_set_temperature`, `tv_power`, etc.) automatically. You never type tool names yourself.

If something fails, check that MCP is enabled in Cursor and `.env` has the correct Positivo credentials.

### 2. Web UI

```bash
npm start
```

Open **http://localhost:3000** — buttons for TV and AC (mode, temperature, fan).

### 3. API / curl / scripts

With `npm start` running:

```bash
curl -X POST http://localhost:3000/api/ac/send \
  -H "Content-Type: application/json" \
  -d '{"action":"set","mode":0,"temp":23,"fan":0}'
```

Or without the server:

```bash
node test-control.js send TV power
node test-control.js send "Ar condicionado" "power off"
```

---

## How it was built (reverse engineering)

### 1. The hardware

| Item | Value |
|------|-------|
| Product | Positivo Smart Controle Universal 2 |
| Internal name | PCUIRN |
| Tuya `productId` | `lwpag3bu0faaowlj` |
| Role | IR gateway — exposes virtual remotes (TV, AC) as Tuya sub-devices |

The gateway stores learned IR codes. Virtual remotes appear as separate devices under your account.

### 2. Positivo uses Tuya, but not Smart Life

The official app talks to Tuya's **mobile API** at `https://a1.tuyaus.com/api.json` (US region). Authentication uses the same account as the Positivo app — **not** a Tuya IoT Cloud developer project.

App credentials (`clientId`, signing secret, virtual `deviceId`) were extracted from the Positivo Casa Inteligente APK. They live in `positivo.js` and are **app-level constants**, not user secrets. Your personal credentials go only in `.env`.

### 3. Request signing

Every API call is signed with HMAC-SHA256. The implementation in `positivo.js` follows the Tuya mobile SDK:

1. Sort selected query parameters
2. Hash `postData` with a custom MD5 shuffle (`mobileHash`)
3. Build `key=value||key=value` string
4. Sign with the app secret

Password login uses RSA encryption of the MD5-hashed password (`encPassword`), matching Tuya's mobile flow.

### 4. Session management

After login, a `sid` (session id) is cached in `storage/session.json` (gitignored). The client revalidates the session and re-logins when it expires.

### 5. Listing devices

```
tuya.m.location.list
  → tuya.m.my.group.device.list (per home/group)
    → tuya.m.device.get (per device → deviceId, localKey, ip, productId)
```

`node positivo.js` prints everything you need for `.env` and writes `devices.json` locally (also gitignored).

### 6. IR remotes and buttons

IR remotes are sub-devices of the gateway:

```
tuya.m.device.sub.list          # list remotes (TV, AC, …)
tuya.m.infrared.record.get      # remote metadata
tuya.m.infrared.keydata.get     # button list + compressed IR payloads
tuya.m.device.dp.publish        # send IR (DPS payload)
```

Important constants discovered:

| Constant | Value | Meaning |
|----------|-------|---------|
| `IR_VENDOR` | `3` | Vendor code for Positivo IR payloads |
| Gateway `productId` | `lwpag3bu0faaowlj` | Used to auto-detect the PCUIRN |

Each button maps to a DPS object. Learned buttons use `study_key`; preloaded Gree AC codes use `send_ir` with a compressed pulse and extension field `99999`.

### 7. Gree air conditioner key format

The AC remote uses Tuya's standard Gree encoding. Button names follow:

```
M{mode}_T{temp}_S{fan}     # cool/heat/auto/dry
M2_S{fan}                    # fan-only mode (no temperature)
```

| Mode | Value |
|------|-------|
| Cool | `0` |
| Heat | `1` |
| Fan | `2` |
| Auto | `3` |
| Dry | `4` |

Examples: `M0_T23_S0` = cool 23°C auto fan, `power on` / `power off` for toggle.

This mapping is in `lib/commands.js`.

### 8. Cloud vs local control

**Cloud (recommended):** `tuya.m.device.dp.publish` via the Positivo API. The gateway receives the command over the internet. No need to close the mobile app.

**Local (optional):** Direct TCP to the device with [TuyAPI](https://github.com/codetheweb/tuyapi) using `DEVICE_ID`, `DEVICE_LOCAL_KEY`, and `DEVICE_IP`. Only one connection at a time — close the app first. Test with `node probe.js`.

**LAN discovery:** `node discover.js` broadcasts on Tuya UDP ports `6666`/`6667` to find devices on your Wi-Fi.

### 9. Alternative: Tuya IoT Cloud (optional, rarely needed)

Only for **local LAN** control when `node positivo.js` does not return a `localKey`. Cloud IR does **not** use this. See [SETUP-TUYA.md](SETUP-TUYA.md).

---

## REST API

Base URL: `http://localhost:3000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/devices` | List account devices |
| GET | `/api/commands` | TV/AC command catalog |
| GET | `/api/remotes` | IR remotes on the gateway |
| GET | `/api/remotes/:name/buttons` | Buttons for a remote |
| POST | `/api/tv/send` | Send TV command (`{ "command": "power" }`) |
| POST | `/api/ac/send` | Send AC action |
| POST | `/api/ir/send` | Raw IR (`{ "remote": "TV", "button": "power" }`) |
| GET | `/api/local/status` | Local DPS via TuyAPI |

### Examples

```bash
# List remotes
curl http://localhost:3000/api/remotes

# TV power
curl -X POST http://localhost:3000/api/tv/send \
  -H "Content-Type: application/json" \
  -d '{"command":"power"}'

# AC: cool mode, 23°C, auto fan
curl -X POST http://localhost:3000/api/ac/send \
  -H "Content-Type: application/json" \
  -d '{"action":"set","mode":0,"temp":23,"fan":0}'

# AC off
curl -X POST http://localhost:3000/api/ac/send \
  -H "Content-Type: application/json" \
  -d '{"action":"off"}'
```

---

## Web UI

See [How to use → Web UI](#2-web-ui).

---

## MCP server (reference)

Tools exposed to Cursor / Claude Desktop. For day-to-day use, just ask in chat — see [How to use → Cursor](#1-cursor--claude--just-ask-recommended).

### Tools

| Tool | Action |
|------|--------|
| `tv_power` | TV power toggle |
| `tv_volume_up` / `tv_volume_down` | Volume |
| `tv_mute` | Mute |
| `tv_channel_up` / `tv_channel_down` | Channels |
| `tv_ok` / `tv_menu` | Navigation |
| `tv_send` | Any catalog command by id |
| `ac_power_on` / `ac_power_off` | AC power |
| `ac_set` | Mode + temp + fan (numeric) |
| `ac_set_temperature` | Set temp (cool mode) |
| `ac_set_mode` | Set mode by name |
| `list_commands` | Show available commands |

### Cursor config

```json
{
  "mcpServers": {
    "casa-inteligente": {
      "command": "node",
      "args": ["/absolute/path/to/positivo-pcuirn/mcp/server.js"]
    }
  }
}
```

### Claude Desktop

Same config in `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS).

---

## CLI scripts

| Script | Purpose |
|--------|---------|
| `node positivo.js` | Login + list devices, write `devices.json` |
| `node positivo.js --login` | Force fresh login |
| `node discover.js` | UDP scan for Tuya devices on LAN |
| `node probe.js` | Test local TuyAPI connection |
| `node cloud.js` | List devices via Tuya IoT Cloud |
| `node test-control.js list` | List devices (service layer) |
| `node test-control.js send TV power` | Send IR via cloud |
| `npm run mcp` | Run MCP server (stdio) |

---

## Project structure

```
lib/
  positivo-client.js   # Tuya mobile API + IR layer
  commands.js          # TV/AC command catalog (Gree keys)
  service.js           # Shared service for API + MCP
  local-device.js      # TuyAPI local connection
positivo.js            # Login, signing, session cache
src/server.js          # Express API + static UI
mcp/server.js          # MCP stdio server
frontend/              # React UI
storage/session.json   # Cached login session (gitignored)
devices.json           # Device cache from positivo.js (gitignored)
```

---

## Security & secrets

**Never commit:**

| File | Contains |
|------|----------|
| `.env` | Your email, password, device keys |
| `storage/session.json` | Active API session |
| `devices.json` | Device IDs, local keys, IPs |
| `.cursor/mcp.json` | Local IDE paths |

Copy `.env.example` → `.env` and use `devices.example.json` as a reference for the cache format.

If `localKey` values were ever committed or shared, rotate them by removing and re-adding the device in the Positivo app, then re-run `node positivo.js`.

The `CLIENT_ID` / `SECRET_KEY` in `positivo.js` are embedded in the public APK — they identify the app, not your account.

---

## License

MIT — see [LICENSE](LICENSE).
