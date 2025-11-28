# 🚀 DEPLOYMENT A RAILWAY - Guía Completa

Este documento te guía paso a paso para desplegar tu bot a production en Railway de forma segura.

## ✅ Pre-requisitos

- [ ] Cuenta en GitHub con acceso al repo `guala19/botAgenda`
- [ ] Cuenta en Google Cloud con Service Account creado
- [ ] Google Sheet compartido con el email del Service Account
- [ ] Archivo JSON de credenciales descargado
- [ ] Número de teléfono del bot (para OWNER_PHONE)
- [ ] Nombre exacto del grupo WhatsApp (para ALLOWED_GROUP_NAME)

## 📋 Paso 1: Preparar Credenciales Google

### 1.1 Obtener el JSON de credenciales

```
Google Cloud Console
  └─ Tu proyecto
     └─ Service Accounts
        └─ Tu cuenta de servicio
           └─ Keys → Create JSON → Descargar botagenda-*.json
```

**Archivo esperado:** `botagenda-478614-e2daa61b626a.json`

### 1.2 Verificar Google Sheet

- Abre tu Google Sheet
- Copia el ID de la URL: `docs.google.com/spreadsheets/d/{ID}/edit`
- Comparte la hoja con el email del Service Account (ej: `residencia167@botagenda-478614.iam.gserviceaccount.com`)

### 1.3 Dockerfile

El repositorio incluye un `Dockerfile` personalizado que instala las librerías necesarias para Puppeteer/Chromium en Linux.

**Railway detecta automáticamente el Dockerfile y lo usa.** No necesitas hacer nada especial.

## 🔑 Paso 2: Configurar Railway

### 2.1 Crear Proyecto en Railway

```
1. Ir a railway.app
2. Click "New Project"
3. Seleccionar "Deploy from GitHub"
4. Autorizar Railway con GitHub
5. Seleccionar repo: guala19/botAgenda
6. Click "Deploy"
```

Railway comenzará el primer deploy automáticamente (fallará sin variables, es normal).

### 2.2 Agregar Variables de Entorno

**En Railway Dashboard:**

```
Tu Proyecto → Settings (rueda) → Variables
```

Agregar cada variable (Click "Add Variable"):

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `OWNER_PHONE` | `56965849477` | Tu teléfono (para pruebas privadas) |
| `ALLOWED_GROUP_NAME` | `botTest` | Nombre exacto del grupo WhatsApp |
| `BOT_MENTION` | `@bot` | Trigger para activar (no cambiar) |
| `GOOGLE_SHEETS_ID` | (tu ID) | De la URL del Sheet |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | (tu email) | Del archivo JSON |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | (ver abajo) | Contenido del JSON |
| `TIMEZONE` | `America/Argentina/Buenos_Aires` | Tu zona horaria |
| `NODE_ENV` | `production` | Entorno |
| `LOG_LEVEL` | `info` | Nivel de logging |

### 2.3 Agregar GOOGLE_SERVICE_ACCOUNT_JSON (Lo más importante)

Este es el paso crítico para la seguridad:

```
1. Abre archivo: botagenda-478614-e2daa61b626a.json
2. Copia TODO el contenido (desde { hasta })
3. En Railway → Click "Add Variable"
4. Nombre: GOOGLE_SERVICE_ACCOUNT_JSON
5. Valor: (pega aquí el JSON copiado)
6. Click "Save"
```

**⚠️ IMPORTANTE:** El JSON debe ser:
- ✅ Una sola línea (sin saltos de línea)
- ✅ Completo (desde `{` hasta `}`)
- ✅ Sin modificar

Ejemplo de cómo se vería en Railway:
```json
{"type":"service_account","project_id":"botagenda-478614","private_key_id":"abc123...","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"residencia167@botagenda-478614.iam.gserviceaccount.com",...}
```

## 🚀 Paso 3: Primer Deploy

Después de agregar todas las variables:

```
Railway → Tu Proyecto → Deploy (botón)
```

O simplemente haz push a GitHub en rama `main` y Railway redeploya automáticamente.

**⚠️ IMPORTANTE - Si es tu PRIMER deploy o añadiste Dockerfile:**

1. En Railway Dashboard, ve a tu proyecto
2. Click en **"Settings"** (rueda arriba a la derecha)
3. Busca **"Redeploy"** o **"Force Redeploy"**
4. Click para forzar rebuild con el Dockerfile
5. Espera a que termine (5-10 minutos)

Esto asegura que Railway instale todas las librerías necesarias para Puppeteer.

### Verificar que funciona:

1. Ve a **Logs** en Railway dashboard
2. Deberías ver algo como:
```
[SheetManager] ✅ Conectado a Google Sheets: Hoja 1
✅ Bot conectado y listo
📋 Esperando mensajes...
```

Si ves errores de credenciales, revisa que `GOOGLE_SERVICE_ACCOUNT_JSON` esté completo.

## 📱 Paso 4: Probar el Bot

1. Agrega el número del bot a un grupo WhatsApp
2. En el grupo, escribe: `@bot mañana 3pm`
3. El bot debe responder con confirmación

Si no responde:
- Verifica que el nombre del grupo sea exactamente `ALLOWED_GROUP_NAME`
- Verifica que mencionaste `@bot` (o tu `BOT_MENTION`)
- Revisa los logs en Railway dashboard

## 🔄 Paso 5: Cómo hacer cambios en el futuro

### Cambiar código:
```bash
# 1. Hacer cambios localmente
# 2. Commit
git add .
git commit -m "Tu mensaje"

# 3. Push a GitHub
git push origin main

# 4. Railway redeploya automáticamente
# Verifica los logs para confirmar
```

### Cambiar variables de entorno:
```
Railway Dashboard → Tu Proyecto → Variables → Editar → Save
```

El bot se reinicia automáticamente con las nuevas variables.

## 💰 Monitorear Gastos

Railway → Dashboard → Resource Usage

- Free Trial: $5 inicial
- Después: $1/mes mínimo (más si usas más recursos)
- Tu bot consume: ~$0.10-0.15/día

## 🔒 Seguridad - Checklist Final

```
✅ .env NUNCA está en GitHub (en .gitignore)
✅ Credenciales JSON NUNCA están en GitHub
✅ Credenciales SOLO en Railway variables
✅ Cada variable está configurada en Railway
✅ GOOGLE_SERVICE_ACCOUNT_JSON es el contenido JSON (no ruta a archivo)
✅ Código lee de process.env.GOOGLE_SERVICE_ACCOUNT_JSON
```

## 🐛 Troubleshooting

### "Cannot find variable GOOGLE_SERVICE_ACCOUNT_JSON"
- [ ] Verifica que la variable está agregada en Railway
- [ ] Revisa que el JSON está completo (sin truncar)
- [ ] Intenta re-copiar el JSON y guardarlo nuevamente

### Bot conectado pero no responde mensajes
- [ ] Verifica `ALLOWED_GROUP_NAME` es exacto
- [ ] Verifica `BOT_MENTION` es correcto
- [ ] Revisa logs en Railway: ¿hay errores?

### "Error: Credenciales inválidas"
- [ ] Revisa que el email del Service Account tiene acceso al Sheet
- [ ] Verifica que el GOOGLE_SHEETS_ID es correcto
- [ ] Intenta compartir el Sheet nuevamente con el Service Account

### Bot funciona localmente pero no en Railway
- [ ] Todos los `process.env.VARIABLE` tienen valor en Railway?
- [ ] Revisa los logs en Railway dashboard
- [ ] Verifica que `NODE_ENV=production`
- [ ] ✅ Railway usa Dockerfile personalizado (incluido en repo)

### "libgobject-2.0.so.0: cannot open shared object file"
- ✅ **SOLUCIONADO:** El Dockerfile incluido instala todas las librerías
- Railway auto-detecta Dockerfile y lo usa
- Si aún falla: Reconstruir en Railway → Settings → Redeploy

## 📞 Support

Si algo no funciona:

1. Revisa los logs en Railway dashboard
2. Verifica todas las variables están configuradas
3. Confirma que el código hace push a GitHub main
4. Verifica credenciales Google Cloud son válidas

---

**¡Listo para producción! 🎉**

El bot ahora corre 24/7 en Railway con auto-reinicio si falla.
