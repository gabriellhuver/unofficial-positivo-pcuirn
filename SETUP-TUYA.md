# Tuya IoT Cloud setup (optional)

> **You probably don't need this.** Cloud IR control (TV, AC, API, MCP) only requires `POSITIVO_EMAIL` and `POSITIVO_PASSWORD` in `.env`.
>
> Use this guide only if you want **local LAN control** (`probe.js`, `/api/local/status`) and `node positivo.js` did not return a `localKey`.

---

## The common gotcha

The [iot.tuya.com](https://iot.tuya.com) portal does **not** link the **Positivo Casa Inteligente** app directly.

QR linking only works with:
- **Smart Life** (recommended)
- **Tuya Smart**

The PCUIRN is Tuya hardware underneath — it works in both apps. You can keep using the Positivo app and **also** add the device in Smart Life with the same email, or pair it in Smart Life only to fetch credentials.

---

## Step 1 — Create a portal account

1. Go to https://iot.tuya.com
2. **Register** (same email as the app is fine)
3. Confirm your email if prompted

---

## Step 2 — Subscribe to IoT Core (required)

Without this, the API won't work and some screens stay locked.

1. Left menu: **Cloud** → **Cloud Project** (or **Pricing**)
2. Find **IoT Core** / **Upgrade IoT Core Plan**
3. Enable the **free** plan (Free / Trial) if available

---

## Step 3 — Create the project

1. **Cloud** → **Cloud Project** → **Project Management**
2. **Create Cloud Project**
3. Fill in:
   - **Project Name**: anything (e.g. `pcuirn`)
   - **Development Method**: **Smart Home** ← required
   - **Data Center**: **Western America** ← **Brazil uses this, NOT Europe!**
4. **Create**

### Get Access ID and Secret

Inside the project → **Overview** tab → **Authorization Key**:
- **Access ID** (or Client ID) → `TUYA_ACCESS_ID`
- **Access Secret** (or Client Secret) → `TUYA_ACCESS_SECRET`

Add to `.env`:

```env
TUYA_ACCESS_ID=...
TUYA_ACCESS_SECRET=...
TUYA_REGION=us
```

---

## Step 4 — Close the wizard (many people get stuck here!)

If a **Configuration Wizard** / **Quick Start** banner appears at the top:

**Close it** (X or "Skip"). The **Devices** tab with account linking **only appears after** leaving the wizard.

---

## Step 5 — Link the app account

### New UI (2024+)

1. Open your project
2. **Devices** tab
3. **Link App Account** (or **Link Tuya App Account**)
4. **Add App Account**
5. Choose **Tuya App Account Authorization**
6. A **QR Code** appears

### Old UI

1. **Cloud** → **Development** → **My Cloud Projects**
2. Click your project → **Devices** tab
3. **Link Tuya App Account** → **Add App Account**

---

## Step 6 — Scan with Smart Life (not Positivo!)

1. Install **Smart Life** (App Store / Play Store)
2. Sign in with the **same email**, or add the PCUIRN in Smart Life:
   - **+** → add device → **Infrared** / IR
   - Or: if already in Positivo, it may appear when logging in with the same Tuya account
3. In Smart Life: **Profile (Me)** → **scan/QR** icon (top corner)
4. Scan the portal QR code
5. Tap **Confirm**

Then on the portal:
- **Device linking method**: **Automatic Link**
- **Permission**: **Read, Write, and Manage**
- **OK**

---

## Step 7 — Confirm the device appeared

1. Same **Devices** tab → **All Devices**
2. The PCUIRN should be listed

If it **doesn't appear**:
- Confirm **Data Center = Western America** (Brazil)
- In Smart Life: **Me** → **Settings** → **Account and Security** → check **Region** (must match US/Western America)
- An account can only be linked to **2 projects** — unlink from another project if needed
- Try switching data center in the portal's top-right corner

---

## Step 8 — Run the script

```bash
node cloud.js
```

Copy the printed `DEVICE_ID`, `DEVICE_LOCAL_KEY`, and `DEVICE_IP` into `.env`, then test:

```bash
node probe.js
```

> Close the Positivo app on your phone before `probe.js` — only one local connection at a time.

---

## Alternative: get local_key via API Explorer

If linking worked but `cloud.js` doesn't show `localKey`:

1. Portal → **Cloud** → **API Explorer**
2. **Device Management** → **Get Device Details** (or *Query Device Details in Bulk*)
3. Paste the PCUIRN `device_id`
4. **Submit** → JSON includes `"local_key": "..."`

---

## Quick reference (Brazil)

| Item | Value |
|------|-------|
| Portal data center | **Western America** |
| `TUYA_REGION` in `.env` | **us** |
| App to scan QR | **Smart Life** (not Positivo) |
| API URL | `https://openapi.tuyaus.com` |
