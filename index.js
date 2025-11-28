/**
 * index.js
 * 
 * Bot de WhatsApp para Gestión de Reservas de Lavandería
 * 
 * Funcionalidades principales:
 * - Escucha mensajes con mención @bot (o privados para pruebas)
 * - Parsea fecha/hora usando lenguaje natural en español
 * - Valida disponibilidad de horarios en Google Sheets
 * - Registra nuevas reservas
 * - Responde de forma amigable y clara
 * 
 * Flujo:
 * 1. Bot se inicia y genera QR para escanear
 * 2. Mensaje entra → Verifica si contiene @bot o es privado
 * 3. Si sí, parsea la fecha/hora
 * 4. Verifica disponibilidad en Sheets
 * 5. Agrega reserva o responde con motivo de fallo
 */

const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const dotenv = require('dotenv');
const dateParser = require('./services/dateParser');
const sheetManager = require('./services/sheetManager');

// Cargar variables de entorno
dotenv.config();

/**
 * Configuración global del bot
 */
const BOT_CONFIG = {
  botMention: '@bot', // Mención para activar el bot
  ownerPhone: process.env.OWNER_PHONE, // Tu número para mensajes privados de prueba
  responseTimeout: 5000, // ms para esperar respuesta de Sheets
  timezone: 'America/Argentina/Buenos_Aires' // Ajustar según tu zona
};

/**
 * Crear cliente de WhatsApp
 * 
 * LocalAuth: Guarda sesión localmente (más estable que QR cada vez)
 * Useful props:
 * - puppeteer: { headless: true } (ejecutar sin UI)
 * - authTimeout: 60 (timeout en segundos para escanear QR)
 */
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  },
  takeoverOnConflict: true,
  takeoverTimeoutMs: 0
});

/**
 * Evento: QR generado (primera inicialización)
 * Muestra un link que puedes abrir en navegador para ver el QR limpio y escaneable
 */
client.on('qr', (qr) => {
  // Generar URL del QR usando servicio público (qr-server)
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
  
  console.log('\n' + '='.repeat(80));
  console.log('📱 CÓDIGO QR PARA ESCANEAR');
  console.log('='.repeat(80));
  console.log('\n🔐 OPCIÓN 1: Abre este link en tu navegador (más fácil):\n');
  console.log(`   👉 ${qrImageUrl}\n`);
  console.log('   Luego escanea el QR que ves en pantalla con tu teléfono\n');
  console.log('─'.repeat(80));
  console.log('\n🔐 OPCIÓN 2: Si prefieres usar la terminal:\n');
  console.log('   Menú WhatsApp → Dispositivos vinculados → Nuevo dispositivo');
  console.log('   Escanea este código:\n');
  qrcode.generate(qr, { small: true });
  console.log('─'.repeat(80));
  console.log('\n⏱️  Tienes 2 minutos para escanear antes de que expira\n');
  console.log('='.repeat(80) + '\n');
});

/**
 * Evento: Cliente listo
 * El bot está conectado y listo para recibir mensajes
 */
client.on('ready', async () => {
  console.log('\n✅ Bot conectado y listo');
  console.log('📋 Esperando mensajes con @bot o en chats privados...\n');

  // Intentar inicializar Google Sheets (sin bloquear si falla)
  setImmediate(async () => {
    try {
      await sheetManager.initialize();
    } catch (error) {
      console.error('❌ No se pudo conectar a Google Sheets:', error.message);
      console.log('⚠️ Las reservas no se guardarán hasta que se configure correctamente.');
    }
  });

  // Ejecutar limpieza de datos antiguos cada 2 horas
  setInterval(async () => {
    try {
      await sheetManager.cleanOldReservations();
    } catch (error) {
      console.error('❌ Error en limpieza automática:', error.message);
    }
  }, 2 * 60 * 60 * 1000); // 2 horas en milisegundos
});

/**
 * Evento: Cliente disconnected (manejo de reconexión)
 */
client.on('disconnected', (reason) => {
  console.log('🔌 Bot desconectado:', reason);
  process.exit(1);
});

/**
 * Evento: Mensaje recibido
 * 
 * ✅ FUNCIONA EN GRUPOS Y PRIVADOS
 * 
 * EN GRUPOS: Procesa mensajes que contengan @bot
 * EN PRIVADOS: Procesa todos los mensajes
 * 
 * Flujo:
 * Paso 1: Validar si debe procesar
 * Paso 2: Parsear fecha/hora
 * Paso 3: Validar disponibilidad
 * Paso 4: Guardar en Sheets
 * Paso 5: Responder al usuario
 */
client.on('message_create', async (msg) => {
  try {
    // Ignorar mensajes del bot a sí mismo
    if (msg.fromMe) {
      return;
    }

    // Obtener contexto del mensaje
    const messageText = msg.body;
    const fromNumber = msg.from.replace('@c.us', ''); // Limpiar formato de WhatsApp
    const isBotMentioned = messageText.toLowerCase().includes(BOT_CONFIG.botMention);
    
    // Detectar si es grupo o privado (más confiable)
    const isGroupChat = msg.from.includes('@g.us'); // Los grupos terminan en @g.us

    // Obtener nombre del grupo si es grupo
    let groupName = '';
    if (isGroupChat) {
      try {
        const chat = await msg.getChat();
        groupName = chat.name || '';
      } catch (e) {
        groupName = '';
      }
    }

    const allowedGroupName = process.env.ALLOWED_GROUP_NAME || 'botTest';
    const isAllowedGroup = groupName.toLowerCase().includes(allowedGroupName.toLowerCase());

    console.log(`[DEBUG] Mensaje recibido: "${messageText}" | Grupo: ${isGroupChat} (${groupName}) | @bot: ${isBotMentioned} | Permitido: ${isAllowedGroup}`);

    // PASO 1: FILTRO PRINCIPAL - Solo procesar si es el grupo permitido
    // Ignorar COMPLETAMENTE mensajes privados y otros grupos
    if (!isGroupChat || !isAllowedGroup || !isBotMentioned) {
      console.log(`[DEBUG] ❌ Mensaje ignorado - Solo funciono en grupo "${allowedGroupName}" con @bot`);
      return; // Ignorar silenciosamente SIN responder
    }

    console.log(`[DEBUG] ✅ Procesando mensaje del grupo permitido...`);

    // PASO 2: Parsear fecha/hora
    const parsedDateTime = dateParser.parseMessageForDateTime(
      messageText,
      BOT_CONFIG.botMention
    );

    console.log(`[DEBUG] Parse result:`, parsedDateTime);

    // Si no se pudo parsear, responder con los formatos válidos
    if (!parsedDateTime) {
      console.log(`[DEBUG] No se pudo parsear fecha/hora`);
      await msg.reply(
        `🤔 No entendí ese formato.\n\n` +
        `Usa alguno de estos:\n\n` +
        `• @bot lunes 3pm\n` +
        `• @bot mañana 15:00\n` +
        `• @bot 22 3pm\n` +
        `• @bot nov 22 3pm\n` +
        `• @bot 2025-11-22 15:00`
      );
      return;
    }

    console.log(
      `\n📨 Mensaje recibido de ${fromNumber}:`,
      `"${messageText}"`
    );
    console.log(`⏰ Fecha/Hora parseada: ${parsedDateTime.dateString}`);

    // PASO 3: Validar horario operacional (9 AM - 8 PM)
    const operationalCheck = sheetManager.isOperationalHours(parsedDateTime.timeString);
    
    if (!operationalCheck.isValid) {
      console.log(`⏰ Hora fuera del horario de operación: ${parsedDateTime.timeString}`);
      await msg.reply(operationalCheck.reason);
      return;
    }

    // PASO 4: Validar disponibilidad
    const availabilityResult = await sheetManager.isTimeSlotAvailable(
      parsedDateTime.isoDate,
      parsedDateTime.timeString
    );

    console.log(`[DEBUG] Disponibilidad:`, availabilityResult);

    if (!availabilityResult.isAvailable) {
      // Horario ocupado - enviar mensaje simplificado
      const nextAvailable = availabilityResult.nextAvailable;
      
      console.log(`⚠️ Horario NO disponible: ${parsedDateTime.dateString}`);
      
      let errorMessage = `⏰ Ese horario está ocupado.\n\n`;
      
      if (nextAvailable) {
        errorMessage += `Próximo disponible: ${nextAvailable}`;
      }
      
      await msg.reply(errorMessage);
      return;
    }

    // PASO 5: Guardar en Google Sheets
    try {
      // Obtener nombre y teléfono del usuario
      // En grupos, getContact() es problemático, así que usar valores por defecto
      let userName = 'Usuario WhatsApp';
      let userPhone = fromNumber.replace(/@g\.us|@c\.us/g, '');
      
      // Intentar obtener contacto, pero si falla, usar defaults
      try {
        const contact = await msg.getContact();
        if (contact?.name || contact?.pushname) {
          userName = contact.name || contact.pushname;
        }
        if (contact?.id?.user) {
          userPhone = contact.id.user;
        }
      } catch (contactError) {
        // Si falla getContact(), simplemente usar el número limpio
        console.log(`[DEBUG] No se pudo obtener contacto (normal en grupos), usando defaults`);
      }

      const reservationData = {
        dateISO: parsedDateTime.isoDate,
        dateFormatted: parsedDateTime.dateOnlyString,
        timeString: parsedDateTime.timeString,
        userName: userName,
        userPhone: userPhone
      };

      console.log(`[DEBUG] Guardando reserva:`, reservationData);

      await sheetManager.addReservation(reservationData);

      // PASO 6: Responder éxito
      console.log(`[DEBUG] Enviando respuesta de éxito...`);
      await msg.reply(
        `✅ ¡Reserva confirmada!\n\n` +
        `${parsedDateTime.dateString}\n\n` +
        `¡Nos vemos en la lavandería!`
      );

      console.log(`✅ Reserva guardada exitosamente.`);
    } catch (sheetError) {
      console.error('[DEBUG] Error al guardar en Sheets:', sheetError.message);
      console.error('[DEBUG] Stack:', sheetError.stack);

      // Responder error pero manteniendo el tono amigable
      await msg.reply(
        `❌ Error al guardar. Intenta de nuevo.`
      );
    }
  } catch (error) {
    console.error('[Bot] Error procesando mensaje:', error.message);
    console.error('[Bot] Stack:', error.stack);

    // Responder error genérico (sin revelar detalles internos)
    try {
      await msg.reply(
        `❌ Algo salió mal. Intenta de nuevo.`
      );
    } catch (replyError) {
      console.error('No se pudo enviar mensaje de error:', replyError.message);
    }
  }
});

/**
 * Evento: Fallo de autenticación
 */
client.on('auth_failure', (msg) => {
  console.error('❌ Fallo de autenticación:', msg);
  process.exit(1);
});

/**
 * Iniciar bot
 */
console.log('🚀 Iniciando Bot de Reservas de Lavandería...');
console.log('📝 Stack: whatsapp-web.js + chrono-node + google-spreadsheet\n');

client.initialize();

/**
 * Manejo de señales para apagado limpio
 */
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Apagando bot...');
  await client.destroy();
  console.log('✅ Bot desconectado.');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Apagando bot (SIGTERM)...');
  await client.destroy();
  console.log('✅ Bot desconectado.');
  process.exit(0);
});

module.exports = client;
