/**
 * index.js
 * 
 * Bot de WhatsApp para Gestión de Reservas de Lavandería
 * 
 * Funcionalidades principales:
 * - Escucha mensajes con mención @lavanderia (o privados para pruebas)
 * - Parsea fecha/hora usando lenguaje natural en español
 * - Valida disponibilidad de horarios en Google Sheets
 * - Registra nuevas reservas
 * - Responde de forma amigable y clara
 * 
 * Flujo:
 * 1. Bot se inicia y genera QR para escanear
 * 2. Mensaje entra → Verifica si contiene @lavanderia o es privado
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
  botMention: '@lavanderia', // Mención para activar el bot
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
  console.log('📋 Esperando mensajes con @lavanderia o en chats privados...\n');

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
 * EN GRUPOS: Procesa mensajes que contengan @lavanderia
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
    
    // NUEVO: Extraer nombre si viene en formato "@lavanderia mañana 3pm - Juan"
    const nameMatch = messageText.match(/\s+-\s+(.+)$/);
    let userName = null;
    
    if (nameMatch) {
      const extractedName = nameMatch[1].trim();
      if (extractedName.length > 0) {
        userName = extractedName;
      }
    }
    
    // Si no tiene nombre, rechazar el mensaje
    if (!userName) {
      console.log(`[DEBUG] ❌ Nombre faltante en mensaje: "${messageText}"`);
      await msg.reply(
        `⚠️ **Falta tu nombre**\n\n` +
        `Vuelve a escribir así:\n\n` +
        `@lavanderia mañana 3pm - Tu Nombre`
      );
      return;
    }
    
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
    const isAllowedGroup = groupName.toLowerCase() === allowedGroupName.toLowerCase();

    console.log(`[DEBUG] Mensaje recibido: "${messageText}" | Grupo: ${isGroupChat} (${groupName}) | @lavanderia: ${isBotMentioned} | Permitido: ${isAllowedGroup}`);

    // PASO 1: FILTRO PRINCIPAL - Solo procesar si es el grupo permitido
    // Ignorar COMPLETAMENTE mensajes privados y otros grupos
    if (!isGroupChat || !isAllowedGroup || !isBotMentioned) {
      console.log(`[DEBUG] ❌ Mensaje ignorado - Solo funciono en grupo "${allowedGroupName}" con @lavanderia`);
      return; // Ignorar silenciosamente SIN responder
    }

    console.log(`[DEBUG] ✅ Procesando mensaje del grupo permitido...`);

    // COMANDO ESPECIAL: #horario - Mostrar disponibilidad de un día
    // Ejemplos: "@lavanderia #horario viernes", "@lavanderia #horario hoy", "@lavanderia #horario mañana"
    const horarioMatch = messageText.match(/@lavanderia\s+#horario\s+(\S+)/i);
    if (horarioMatch) {
      const dayInput = horarioMatch[1];
      const resolvedDay = dateParser.resolveDayName(dayInput);
      
      if (!resolvedDay) {
        const validDays = 'lunes, martes, miércoles, jueves, viernes, sábado, domingo, hoy, mañana';
        await msg.reply(
          `❌ Día no válido: "${dayInput}"\n\n` +
          `Usa alguno de estos:\n` +
          `${validDays}`
        );
        return;
      }

      // Obtener horarios para ese día
      const schedule = await sheetManager.getScheduleByDay(resolvedDay);
      
      // Formatear nombre del día
      const dayNames = {
        'lunes': 'Lunes',
        'martes': 'Martes',
        'miercoles': 'Miércoles',
        'jueves': 'Jueves',
        'viernes': 'Viernes',
        'sabado': 'Sábado',
        'domingo': 'Domingo'
      };
      
      const displayName = dayNames[resolvedDay] || resolvedDay;
      let response = `📅 **${displayName}**\n\n`;
      
      // Mostrar disponibles
      if (schedule.available && schedule.available.length > 0) {
        response += `🟢 **Disponible:**\n`;
        schedule.available.forEach(slot => {
          response += `  • ${slot.start} - ${slot.end}\n`;
        });
      }
      
      // Mostrar ocupados
      if (schedule.occupied && schedule.occupied.length > 0) {
        response += `\n🔴 **Ocupado:**\n`;
        schedule.occupied.forEach(slot => {
          response += `  • ${slot.start} - ${slot.end}\n`;
        });
      }
      
      if (schedule.available.length === 0 && schedule.occupied.length === 0) {
        response += `✅ Sin datos - todos los horarios disponibles`;
      }
      
      response += `\n⏰ Horarios: 9:00 AM - 8:00 PM`;
      
      await msg.reply(response);
      return;
    }

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
        `**RESERVAR:**\n` +
        `• @lavanderia mañana 3pm - Juan\n` +
        `• @lavanderia viernes 5pm - María\n` +
        `• @lavanderia 22 3pm - Pedro\n\n` +
        `**VER DISPONIBILIDAD:**\n` +
        `• @lavanderia #horario viernes\n` +
        `• @lavanderia #horario hoy\n` +
        `• @lavanderia #horario mañana`
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
      const reservationData = {
        dateISO: parsedDateTime.isoDate,
        dateFormatted: parsedDateTime.dateOnlyString,
        timeString: parsedDateTime.timeString,
        userName: userName,
        userPhone: fromNumber
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
