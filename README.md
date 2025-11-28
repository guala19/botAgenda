# 🚀 Bot Agenda Lavandería

WhatsApp bot para reservas de lavandería. Automatiza scheduling con verificación de disponibilidad y almacenamiento en Google Sheets.

## ✨ Características

- ✅ Reservas por WhatsApp en grupo cerrado
- ✅ Prevención de conflictos (1 hora por lavada)
- ✅ Almacenamiento persistente en Google Sheets
- ✅ Auto-limpieza (14 días de retención)
- ✅ 5 formatos de entrada simples y predecibles

## 📋 Cómo Reservar

Usa UNO de estos 5 formatos. El bot responde con confirmación y próximos horarios disponibles:

```
1️⃣  @bot lunes 3pm              → Próximo lunes a las 3 PM
    @bot próximo viernes 17:00   → Próximo viernes a las 17:00
2️⃣  @bot nov 22 3pm            → 22 de noviembre a las 3 PM  
3️⃣  @bot mañana 15:00           → Mañana a las 15:00
4️⃣  @bot 2025-11-22 15:00       → Fecha exacta ISO
5️⃣  @bot 22 3pm                → Día 22 del mes actual
```

**Ejemplo:** Si escribes `@bot viernes 4pm`, el bot:
1. Detecta: viernes a las 4 PM (próximo viernes)
2. Verifica disponibilidad (¿hay lavadora libre 4-5 PM?)
3. Guarda en Google Sheets con teléfono y timestamp
4. Responde: `✅ Reserva confirmada: viernes 22/11 a las 16:00`

## 🔧 Instalación

```bash
# Instalar dependencias
npm install

# Copiar configuración
cp .env.example .env

# Editar .env con credenciales Google Cloud
# Asignar ALLOWED_GROUP_NAME al nombre exacto del grupo WhatsApp

# Iniciar bot
npm start
```

El bot mostrará un **código QR** en terminal. Escanea con WhatsApp para autenticar.

## 🔐 Configuración (`.env`)

```env
# Google Cloud (Service Account)
GOOGLE_SHEETS_ID=tu_id_aqui
GOOGLE_SERVICE_ACCOUNT_JSON=./credenciales.json
GOOGLE_SERVICE_ACCOUNT_EMAIL=tu_email@botagenda.iam.gserviceaccount.com

# Bot settings
ALLOWED_GROUP_NAME=botTest           # Nombre exacto del grupo WhatsApp
TIMEZONE=America/Argentina/Buenos_Aires
BOT_MENTION=@bot

# Logging
LOG_LEVEL=info
NODE_ENV=development
```

## 📁 Estructura del Código

```
botAgenda/
├── index.js                 → 🎯 Orquestador principal bot
├── services/
│   ├── dateParser.js       → Parsea 5 formatos específicos
│   └── sheetManager.js     → Google Sheets CRUD + disponibilidad
├── utils/
│   ├── logger.js           → Logging con colores
│   ├── responses.js        → Mensajes predefinidos bot
│   └── validators.js       → Validaciones de entrada
├── .env                     → Configuración (gitignored)
└── package.json            → Dependencias
```

## 🎯 Flujo de Reserva

```
Usuario: "@bot viernes 3pm"
            ↓
[index.js] → Valida que sea en grupo autorizado
            ↓
[dateParser.js] → Detecta "viernes 3pm"
                → Calcula próximo viernes 15:00
            ↓
[sheetManager.js] → isTimeSlotAvailable()
                  → Revisa si 15:00-16:00 está libre
            ↓
Si disponible: Guarda en Sheet → ✅ Confirmación
Si no: Sugiere próximo horario → ⏳ Intenta otro
```

## ⚙️ Stack Tecnológico

| Componente | Librería | Uso |
|---|---|---|
| Cliente WhatsApp | whatsapp-web.js | Conexión a WhatsApp Web |
| Parser de horas | chrono-node | Parsea solo el horario (HH:MM) |
| Google Sheets | google-spreadsheet | Persistencia de datos |
| Autenticación | google-auth-library | JWT Service Account |
| Configuración | dotenv | Variables de entorno |

## 🧪 Testing Manual

1. Agregate al grupo "botTest"
2. Verifica `.env` apunta a Google Sheet compartida
3. Ejecuta `npm start` - deberías ver QR
4. Escanea QR con WhatsApp
5. Prueba: `@bot mañana 3pm`
6. Verifica que aparezca en Google Sheets

## 🐛 Troubleshooting

| Problema | Solución |
|----------|----------|
| Bot no responde | Verificar que estés en grupo "botTest" |
| "No entendí el formato" | Usar uno de los 5 formatos válidos |
| No se guarda en Sheet | Revisar credenciales en .env |
| QR no aparece | Eliminar carpeta `.wwebjs_auth` |

## 📊 Google Sheet

**Columnas automáticas:**
- Usuario, Teléfono, Fecha, Hora, ISO Date, Timestamp

**Auto-cleanup:** Borra reservas > 14 días cada 2 horas

## 👨‍💻 Para Developers

**Agregar nuevo formato:** Edita `services/dateParser.js`, agrega función `parseFormat6()`

**Cambiar duración lavada:** `services/sheetManager.js` línea ~150, variable `washDuration`

**Modificar intervalo limpieza:** `services/sheetManager.js` línea ~290, `setInterval()`

---

**Creado con ❤️ para Residencia 167**
