# ⚡ Quick Start - Configuración Rápida

## 🚀 Para Development Local (5 minutos)

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar template de configuración
cp .env.local.example .env

# 3. Editar .env con tus datos:
#    - OWNER_PHONE: Tu teléfono
#    - ALLOWED_GROUP_NAME: Nombre exacto del grupo WhatsApp
#    - GOOGLE_SHEETS_ID: De URL del Sheet
#    - GOOGLE_SERVICE_ACCOUNT_EMAIL: Del JSON
#    - GOOGLE_SERVICE_ACCOUNT_JSON: Ruta al JSON (ej: ./botagenda-478614-e2daa61b626a.json)

# 4. Iniciar bot
npm start

# 5. Escanear QR en terminal con WhatsApp
```

**El bot mostrará:**
```
[SheetManager] ✅ Conectado a Google Sheets: Hoja 1
✅ Bot conectado y listo
📋 Esperando mensajes con @bot o en chats privados...
```

Escribe en un grupo: `@bot mañana 3pm` → El bot debe responder ✅

---

## 🌐 Para Producción en Railway (10 minutos)

**Ver:** [`DEPLOYMENT.md`](DEPLOYMENT.md) para guía completa paso a paso.

Resumen rápido:

```
1. railway.app → New Project → Deploy from GitHub
2. Seleccionar repo: guala19/botAgenda
3. Railway → Variables → Agregar todas las ENV
4. Important: GOOGLE_SERVICE_ACCOUNT_JSON = JSON completo (sin archivo)
5. Deploy → Logs → Verificar ✅ conectado
```

---

## 🔒 Seguridad - Checklist

```
✅ .env NUNCA en GitHub (en .gitignore)
✅ JSON credenciales SOLO en Railway variables
✅ Código lee de process.env (seguro)
✅ GitHub solo tiene .env.example y credentials.example.json
```

---

## 📱 Cómo Reservar (5 formatos)

```
@bot lunes 3pm              → Próximo lunes 3 PM
@bot nov 22 3pm             → 22 nov 3 PM
@bot mañana 15:00           → Mañana 15:00
@bot 2025-11-22 15:00       → Fecha exacta
@bot 22 3pm                 → Día 22 mes actual
```

---

## 🧪 Testing

```bash
node test-regex.js
```

---

## 📞 Archivos importantes

- **README.md** - Overview y características
- **DEPLOYMENT.md** - Guía completa Railway
- **.env.example** - Variables para Railway
- **.env.local.example** - Variables para desarrollo local
- **services/** - Lógica del bot (no necesita cambios)

---

**¿Listo? Empieza con desarrollo local arriba 👆**
