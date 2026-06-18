# Como vincular o PCUIRN na Tuya Cloud

## O problema mais comum

O portal **iot.tuya.com NÃO vincula o app "Positivo Casa Inteligente"** diretamente.

Ele só aceita escanear QR com:
- **Smart Life** (recomendado)
- **Tuya Smart**

O PCUIRN é Tuya por baixo — funciona nos dois apps. Você pode **manter no app Positivo** e **também adicionar no Smart Life** com a mesma conta/e-mail, ou migrar o dispositivo pro Smart Life só pra pegar as credenciais.

---

## Passo 1 — Criar conta no portal

1. Acesse https://iot.tuya.com
2. **Register** / cadastre-se (pode ser com o mesmo e-mail do app)
3. Confirme o e-mail se pedir

---

## Passo 2 — Assinar o plano IoT Core (obrigatório)

Sem isso a API não funciona e algumas telas ficam bloqueadas.

1. Menu esquerdo: **Cloud** → **Cloud Project** (ou **Pricing**)
2. Procure **IoT Core** / **Upgrade IoT Core Plan**
3. Ative o plano **gratuito** (Free / Trial) se disponível

---

## Passo 3 — Criar o projeto

1. **Cloud** → **Cloud Project** → **Project Management**
2. **Create Cloud Project**
3. Preencha:
   - **Project Name**: qualquer (ex: `pcuirn`)
   - **Development Method**: **Smart Home** ← obrigatório
   - **Data Center**: **Western America** ← **Brasil usa este, NÃO Europa!**
4. **Create**

### Pegar Access ID e Secret

Dentro do projeto → aba **Overview** → seção **Authorization Key**:
- **Access ID** (ou Client ID) → `TUYA_ACCESS_ID`
- **Access Secret** (ou Client Secret) → `TUYA_ACCESS_SECRET`

No `.env`:
```env
TUYA_ACCESS_ID=...
TUYA_ACCESS_SECRET=...
TUYA_REGION=us
```

---

## Passo 4 — Fechar o assistente (muita gente trava aqui!)

Se aparecer um **wizard/assistente** no topo da página do projeto:

> *"Configuration Wizard" / "Quick Start"*

**Feche ele** (X ou "Skip"). O menu **Devices** com opção de vincular conta **só aparece depois** de sair do wizard.

---

## Passo 5 — Vincular conta do app

### Caminho na interface nova (2024+)

1. Entre no seu projeto
2. Aba **Devices**
3. **Link App Account** (ou **Link Tuya App Account**)
4. **Add App Account**
5. Escolha **Tuya App Account Authorization**
6. Aparece um **QR Code**

### Caminho alternativo (interface antiga)

1. **Cloud** → **Development** → **My Cloud Projects**
2. Clique no projeto → aba **Devices**
3. **Link Tuya App Account** → **Add App Account**

---

## Passo 6 — Escanear com Smart Life (não com Positivo!)

1. Instale **Smart Life** (App Store / Play Store)
2. Crie conta com o **mesmo e-mail** ou adicione o PCUIRN no Smart Life:
   - **+** → adicionar dispositivo → **Infravermelho** / IR
   - Ou: se já estiver no Positivo, às vezes aparece ao logar com mesma conta Tuya
3. No Smart Life: **Perfil (Me)** → ícone de **scan/QR** (canto superior)
4. Escaneie o QR do portal
5. Toque **Confirm** / **Confirmar login**

Depois no portal:
- **Device linking method**: **Automatic Link**
- **Permission**: **Read, Write, and Manage**
- **OK**

---

## Passo 7 — Ver se o dispositivo apareceu

1. Mesma aba **Devices** → **All Devices**
2. Deve listar o PCUIRN

Se **não aparecer**:
- Confirme **Data Center = Western America** (Brasil)
- No Smart Life: **Me** → **Settings** → **Account and Security** → veja o **Region** (deve bater com US/Western America)
- A conta só pode estar em **2 projetos** — desvincule de outro projeto se necessário
- Tente trocar o data center no canto superior direito do portal

---

## Passo 8 — Rodar nosso script

```bash
cp .env.example .env
# cola Access ID, Secret, TUYA_REGION=us

node cloud.js
```

---

## Alternativa: pegar local_key pelo API Explorer

Se vinculou mas o `cloud.js` não mostra a `localKey`:

1. Portal → **Cloud** → **API Explorer**
2. **Device Management** → **Get Device Details** (ou *Query Device Details in Bulk*)
3. Cole o `device_id` do PCUIRN
4. **Submit** → no JSON vem `"local_key": "..."`

---

## Resumo rápido

| Item | Valor para Brasil |
|------|-------------------|
| Data Center no portal | **Western America** |
| `TUYA_REGION` no .env | **us** |
| App pra escanear QR | **Smart Life** (não Positivo) |
| URL da API | `https://openapi.tuyaus.com` |
