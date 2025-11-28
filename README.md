# 🚀 Bot Agenda Lavandería

WhatsApp bot para reservas de lavandería. Automatiza scheduling con verificación de disponibilidad y almacenamiento en Google Sheets.

## ✨ Características

- ✅ Reservas por WhatsApp en grupo cerrado
- ✅ Prevención de conflictos (1 hora por lavada)
- ✅ Almacenamiento persistente en Google Sheets
- ✅ Auto-limpieza (14 días de retención)
- ✅ 5 formatos de entrada simples y predecibles
- ✅ Horarios de operación 9 AM - 8 PM
- ✅ Funciona 24/7 con Railway

## 📋 Cómo Reservar

Usa UNO de estos 5 formatos. El bot responde con confirmación:

```
1️⃣  @bot lunes 3pm              → Próximo lunes a las 3 PM
    @bot próximo viernes 17:00   → Próximo viernes a las 17:00
2️⃣  @bot nov 22 3pm            → 22 de noviembre a las 3 PM  
3️⃣  @bot mañana 15:00           → Mañana a las 15:00
4️⃣  @bot 2025-11-22 15:00       → Fecha exacta ISO
5️⃣  @bot 22 3pm                → Día 22 del mes actual
```

## 🔐 Configuración (`.env`)

### Variables Requeridas

```env
# Información del grupo WhatsApp
OWNER_PHONE=56965849477                    # Tu número
ALLOWED_GROUP_NAME=botTest                 # Nombre EXACTO del grupo
BOT_MENTION=@bot                           # Trigger para activar

# Google Sheets (obtener de URL y credenciales)
GOOGLE_SHEETS_ID=1Rx4uRjqhD4Vqu9BGyB...   # De la URL del Sheet
GOOGLE_SERVICE_ACCOUNT_EMAIL=...@iam...   # Del archivo JSON

# Google Service Account (NUNCA commitear a GitHub)
# OPCIÓN 1: Para Railway/Docker/Producción
#   → Pegar el JSON completo como string (sin saltos de línea)
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# OPCIÓN 2: Para desarrollo local
#   → Ruta al archivo JSON
# GOOGLE_SERVICE_ACCOUNT_JSON=./botagenda-478614-e2daa61b626a.json
```

**Nunca commitear a GitHub** - archivo `.env` está en `.gitignore`.

## 🚀 Despliegue en Railway (Recomendado)

### Paso 1: Conectar GitHub
```
1. Ir a railway.app
2. Click "New Project" → "Deploy from GitHub"
3. Autorizar y seleccionar repo: guala19/botAgenda
4. Railway auto-detecta package.json
```

### Paso 2: Agregar Variables de Entorno
En **Railway Dashboard → Variables**:

```
OWNER_PHONE=56965849477
ALLOWED_GROUP_NAME=botTest
BOT_MENTION=@bot
GOOGLE_SHEETS_ID=1Rx4uRjqhD4Vqu9BGyBjtcMHHTCQ_JMl_L3XdH8lswTE
GOOGLE_SERVICE_ACCOUNT_EMAIL=residencia167@botagenda-478614.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_JSON=(pegar JSON completo sin saltos)
TIMEZONE=America/Argentina/Buenos_Aires
NODE_ENV=production
LOG_LEVEL=info
```

**Para `GOOGLE_SERVICE_ACCOUNT_JSON`:**
- Abre archivo JSON de credenciales
- Copia TODO desde `{` hasta `}`
- Pégalo en Railway

### Paso 3: Desplegar
- Railway auto-redeploya en cada push a `main`
- El bot corre 24/7 sin hibernación
- Auto-reinicia si falla

### Costos
- **Free Trial:** $5 de crédito (≈30-50 días)
- **Hobby Plan:** $5/mes (cubre consumo del bot)
- El bot consume ~$0.10-0.15/día

## 💻 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Configurar .env
cp .env.example .env

# Editar .env con credenciales locales
# GOOGLE_SERVICE_ACCOUNT_JSON=./botagenda-478614-e2daa61b626a.json

# Iniciar
npm start
```

El bot muestra QR en terminal → escanea con WhatsApp.

## 🔒 Seguridad

### Lo que NUNCA debe ir a GitHub
```
❌ .env (credenciales reales)
❌ *.json (credenciales)
❌ .wwebjs_auth/ (sesión)
❌ .wwebjs_cache/ (cache)
```

Estos están excluidos en `.gitignore` automáticamente.

### Lo que SÍ puede ir
```
✅ .env.example (plantilla)
✅ credentials.example.json (template)
✅ código fuente
✅ package.json
```

El código ya lee credenciales de variables de entorno, así es seguro para production.

## 🧪 Testing

```bash
# Prueba formato de fechas
node test-regex.js

# Salida esperada:
# Input: 'hoy a las 22 horas'
# Valid: YES
#   Hora: 22:00, Fecha: 2025-11-27
```

## 📊 Operación

- **Horarios:** 9:00 AM - 8:00 PM
- **Duración:** 1 hora por reserva
- **Auto-limpieza:** Cada 2 horas (reservas >14 días)
- **Uptime:** 24/7 con Railway

## 📁 Estructura

```
botAgenda/
├── index.js                 → Orquestador principal
├── services/
│   ├── dateParser.js       → Parsea 5 formatos
│   └── sheetManager.js     → Google Sheets + disponibilidad
├── utils/
│   ├── logger.js           → Logging
│   ├── responses.js        → Mensajes del bot
│   └── validators.js       → Validaciones
├── .env.example            → Plantilla (nunca commitear .env)
└── package.json            → Dependencias
```

## 🎯 Flujo de Reserva

```
Usuario: "@bot viernes 3pm"
            ↓
[index.js] → Valida grupo autorizado
            ↓
[dateParser] → Detecta "viernes 3pm"
             → Calcula próximo viernes 15:00
            ↓
[sheetManager] → ¿Está libre 15:00-16:00?
               ↓
Sí: Guarda → ✅ Confirmación
No: Sugiere → ⏳ Próximo disponible
```

## 🐛 Troubleshooting

| Problema | Solución |
|----------|----------|
| Bot no responde | Verifica estés en grupo "botTest" |
| "No entendí formato" | Usa uno de los 5 formatos válidos |
| No guarda en Sheet | Revisa credenciales en .env |
| QR no aparece | Elimina `.wwebjs_auth/` |

---

**Creado con ❤️ para Residencia 167**
