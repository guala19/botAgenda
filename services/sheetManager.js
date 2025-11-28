/**
 * sheetManager.js
 * 
 * Módulo responsable de:
 * 1. Conectar con Google Sheets usando credenciales de Service Account
 * 2. Verificar si un horario está disponible (sin duplicados)
 * 3. Agregar nuevas reservas a la hoja
 * 4. Manejar errores de forma robusta
 */

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

class SheetManager {
  constructor() {
    this.doc = null;
    this.sheet = null;
    this.isInitialized = false;
  }

  /**
   * Inicializa la conexión con Google Sheets
   * 
   * IMPORTANTE: Usa variables de entorno para credentials (NUNCA archivos en repo):
   * - GOOGLE_SHEETS_ID: ID de la hoja (de la URL)
   * - GOOGLE_SERVICE_ACCOUNT_JSON: Contenido JSON como string (para Railway/Docker)
   *   O ruta al archivo JSON (para desarrollo local)
   * 
   * El JSON debe tener estructura estándar de Google Service Account:
   * {\n   *   "type": "service_account",
   *   "project_id": "...",
   *   "private_key_id": "...",
   *   "private_key": "...",
   *   "client_email": "...",
   *   "client_id": "...",
   *   "auth_uri": "...",
   *   "token_uri": "...",
   *   "auth_provider_x509_cert_url": "...",
   *   "client_x509_cert_url": "..."
   * }
   */
  async initialize() {
    try {
      const sheetsId = process.env.GOOGLE_SHEETS_ID;
      let credentialsEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_CREDENTIALS_B64;

      if (!sheetsId || !credentialsEnv) {
        console.error('[SheetManager] ❌ Faltan variables: GOOGLE_SHEETS_ID o GOOGLE_SERVICE_ACCOUNT_JSON/GOOGLE_CREDENTIALS_B64');
        this.isInitialized = false;
        return;
      }

      let credentials;

      try {
        // Si es Base64 (comienza sin { ni [), decodificar primero
        if (credentialsEnv.includes('=') && !credentialsEnv.startsWith('{')) {
          console.log('[SheetManager] 🔓 Decodificando credenciales desde Base64...');
          credentialsEnv = Buffer.from(credentialsEnv, 'base64').toString('utf-8');
        }
        
        // Intenta parsear como JSON
        credentials = JSON.parse(credentialsEnv);
      } catch (parseError) {
        // Si falla, intenta como ruta de archivo (para desarrollo local)
        const credentialsFile = path.resolve(credentialsEnv);
        if (!fs.existsSync(credentialsFile)) {
          console.error(`[SheetManager] ❌ Archivo no encontrado: ${credentialsFile}`);
          this.isInitialized = false;
          return;
        }
        credentials = JSON.parse(fs.readFileSync(credentialsFile, 'utf8'));
      }

      // Crear instancia de JWT para autenticación usando las credenciales del JSON
      const auth = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      // Inicializar documento de Sheets
      this.doc = new GoogleSpreadsheet(sheetsId, auth);
      await this.doc.loadInfo();

      // Obtener la primera hoja (o especificar una específica)
      this.sheet = this.doc.sheetsByIndex[0];
      this.isInitialized = true;

      console.log(
        '[SheetManager] ✅ Conectado a Google Sheets:',
        this.sheet.title
      );
    } catch (error) {
      console.error('[SheetManager] ❌ Error inicializando Sheets:', error.message);
      this.isInitialized = false;
    }
  }

  /**
   * Carga todas las filas de la hoja
   * @returns {array} - Array de objetos representando filas
   */
  async loadAllRows() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const rows = await this.sheet.getRows();
      return rows;
    } catch (error) {
      console.error('[SheetManager] Error cargando filas:', error.message);
      throw error;
    }
  }

  /**
   * Verifica si un horario está disponible considerando duraciones de lavado
   * 
   * REGLAS DE DISPONIBILIDAD:
   * - Cada lavado dura 1 hora
   * - Si alguien toma 15:00, ocupa: 15:00 a 16:00
   * - La siguiente disponible es 16:00
   * - No se puede agendar de 15:30 porque entraría en conflicto
   * 
   * @param {string} dateISO - Fecha en formato ISO (YYYY-MM-DD)
   * @param {string} timeString - Hora en formato HH:MM
   * @returns {object} - { isAvailable: boolean, conflictWith: object|null, nextAvailable: string|null }
   */
  
  /**
   * Valida que la hora solicitada esté dentro del horario operacional
   * Horario: 9 AM - 8 PM (09:00 - 20:00)
   * 
   * @param {string} timeString - Hora en formato HH:MM
   * @returns {object} - { isValid: boolean, reason: string|null }
   */
  isOperationalHours(timeString) {
    const [hour, minute] = timeString.split(':').map(Number);
    const timeInMinutes = hour * 60 + minute;
    
    const OPENING_HOUR = 9;  // 9 AM
    const CLOSING_HOUR = 20; // 8 PM
    const OPENING_MINUTES = OPENING_HOUR * 60;
    const CLOSING_MINUTES = CLOSING_HOUR * 60;
    
    if (timeInMinutes < OPENING_MINUTES || timeInMinutes >= CLOSING_MINUTES) {
      return {
        isValid: false,
        reason: `⏰ Horario fuera de operación (9:00 AM - 8:00 PM)`
      };
    }
    
    return {
      isValid: true,
      reason: null
    };
  }
  async isTimeSlotAvailable(dateISO, timeString) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const rows = await this.loadAllRows();

      // Convertir ISO a formato DD/MM/YYYY para buscar
      const [year, month, day] = dateISO.split('-');
      const dateFormatted = `${day}/${month}/${year}`;

      // Parseando la hora solicitada
      const [requestHour, requestMinute] = timeString.split(':').map(Number);
      const requestTimeInMinutes = requestHour * 60 + requestMinute;
      
      // Duración de un lavado en minutos
      const WASH_DURATION_MINUTES = 60; // 1 hora
      const requestEndTimeInMinutes = requestTimeInMinutes + WASH_DURATION_MINUTES;

      console.log(`[DEBUG isTimeSlotAvailable] Solicitando: ${timeString} (${requestTimeInMinutes} min desde medianoche)`);
      console.log(`[DEBUG isTimeSlotAvailable] Durará hasta: ${Math.floor(requestEndTimeInMinutes / 60)}:${String(requestEndTimeInMinutes % 60).padStart(2, '0')}`);

      // Revisar conflictos con reservas existentes
      let conflictingReservation = null;
      let nextAvailableTime = null;

      for (const row of rows) {
        const rowDate = row.get('Fecha Solicitada') || '';
        const rowTime = row.get('Hora Solicitada') || '';

        // Solo verificar si es la misma fecha
        if (rowDate !== dateFormatted) {
          continue;
        }

        // Parsear hora existente
        const [existingHour, existingMinute] = rowTime.split(':').map(Number);
        const existingTimeInMinutes = existingHour * 60 + existingMinute;
        const existingEndTimeInMinutes = existingTimeInMinutes + WASH_DURATION_MINUTES;

        console.log(`[DEBUG isTimeSlotAvailable] Comparando con existente: ${rowTime} (${existingTimeInMinutes}-${existingEndTimeInMinutes} min)`);

        // LÓGICA DE CONFLICTO:
        // Conflicto si: 
        //   - La hora solicitada comienza antes de que termine la existente Y
        //   - La hora solicitada termina después de que comience la existente
        const hasConflict = requestTimeInMinutes < existingEndTimeInMinutes && 
                           requestEndTimeInMinutes > existingTimeInMinutes;

        if (hasConflict) {
          console.log(`[DEBUG isTimeSlotAvailable] ❌ CONFLICTO encontrado con ${rowTime}`);
          conflictingReservation = {
            userName: row.get('Usuario') || 'Desconocido',
            userPhone: row.get('Teléfono') || 'N/A',
            time: rowTime,
            endTime: `${Math.floor(existingEndTimeInMinutes / 60)}:${String(existingEndTimeInMinutes % 60).padStart(2, '0')}`
          };
          
          // La siguiente disponible es cuando termina la reserva conflictiva
          nextAvailableTime = `${Math.floor(existingEndTimeInMinutes / 60)}:${String(existingEndTimeInMinutes % 60).padStart(2, '0')}`;
          break; // Salir al primer conflicto
        }
      }

      const isAvailable = !conflictingReservation;
      
      console.log(`[DEBUG isTimeSlotAvailable] Resultado: ${isAvailable ? '✅ DISPONIBLE' : '❌ OCUPADO'}`);
      if (nextAvailableTime) {
        console.log(`[DEBUG isTimeSlotAvailable] Siguiente disponible: ${nextAvailableTime}`);
      }

      return {
        isAvailable,
        conflictWith: conflictingReservation,
        nextAvailable: nextAvailableTime
      };
    } catch (error) {
      console.error('[SheetManager] Error verificando disponibilidad:', error.message);
      return {
        isAvailable: false,
        conflictWith: null,
        nextAvailable: null
      };
    }
  }

  /**
   * Agrega una nueva reserva a la hoja
   * 
   * Estructura de la fila:
   * Columna A: Usuario
   * Columna B: Teléfono  
   * Columna C: Fecha Solicitada
   * Columna D: Hora Solicitada
   * Columna E: Fecha ISO
   * Columna F: Timestamp
   * 
   * @param {object} reservaData - { dateISO, dateFormatted, timeString, userName, userPhone }
   * @returns {boolean} - true si se agregó exitosamente
   */
  async addReservation(reservaData) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const { dateISO, dateFormatted, timeString, userName, userPhone } = reservaData;

      console.log(`[DEBUG SheetManager] Guardando: ${userName} | ${userPhone} | ${dateFormatted} | ${timeString}`);

      // Crear fila con los datos (usar nombres simples sin caracteres especiales)
      const newRow = {
        Usuario: userName || 'Anónimo',
        Teléfono: userPhone || 'N/A',
        'Fecha Solicitada': dateFormatted || '',
        'Hora Solicitada': timeString || '',
        'Fecha ISO': dateISO || '',
        Timestamp: new Date().toISOString()
      };

      console.log(`[DEBUG SheetManager] Objeto a guardar:`, newRow);

      // Agregar fila a la hoja
      const addedRow = await this.sheet.addRow(newRow);
      
      console.log(`[DEBUG SheetManager] Fila agregada exitosamente`);

      console.log(
        '[SheetManager] ✅ Reserva agregada:',
        `${dateFormatted} ${timeString} - ${userName} (${userPhone})`
      );

      return true;
    } catch (error) {
      console.error('[SheetManager] Error agregando reserva:', error.message);
      console.error('[SheetManager] Stack:', error.stack);
      throw error;
    }
  }

  /**
   * Limpia las reservas antiguas (más de 2 semanas)
   * Se ejecuta automáticamente cada cierto tiempo
   */
  async cleanOldReservations() {
    try {
      if (!this.isInitialized) {
        return;
      }

      const rows = await this.loadAllRows();
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      let deletedCount = 0;

      for (const row of rows) {
        const timestampStr = row.get('Timestamp');
        if (!timestampStr) continue;

        const rowDate = new Date(timestampStr);
        if (rowDate < twoWeeksAgo) {
          await row.delete();
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        console.log(`[SheetManager] 🗑️ Limpiadas ${deletedCount} reservas antiguas (> 2 semanas)`);
      }
    } catch (error) {
      console.error('[SheetManager] Error limpiando reservas antiguas:', error.message);
    }
  }

  /**
   * Obtiene todas las reservas disponibles (para mostrar al usuario)
   * @returns {array} - Array de strings con reservas
   */
  async getAllReservations() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const rows = await this.loadAllRows();
      return rows.map((row) => ({
        fecha: row.get('Fecha'),
        hora: row.get('Hora'),
        usuario: row.get('Usuario'),
        telefono: row.get('Telefono')
      }));
    } catch (error) {
      console.error('[SheetManager] Error obteniendo reservas:', error.message);
      throw error;
    }
  }

  /**
   * Cancela una reserva por fecha, hora y usuario
   * @param {string} dateISO - Fecha en formato ISO
   * @param {string} timeString - Hora en formato HH:MM
   * @param {string} userPhone - Teléfono del usuario
   * @returns {boolean} - true si se canceló, false si no encontró
   */
  async cancelReservation(dateISO, timeString, userPhone) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const rows = await this.loadAllRows();
      const [year, month, day] = dateISO.split('-');
      const dateFormatted = `${day}/${month}/${year}`;

      // Buscar la fila para cancelar
      for (const row of rows) {
        const rowDate = row.get('Fecha') || '';
        const rowTime = row.get('Hora') || '';
        const rowPhone = row.get('Telefono') || '';

        if (rowDate === dateFormatted && rowTime === timeString && rowPhone === userPhone) {
          await row.delete();
          console.log(
            '[SheetManager] ✅ Reserva cancelada:',
            `${dateFormatted} ${timeString}`
          );
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('[SheetManager] Error cancelando reserva:', error.message);
      throw error;
    }
  }
}

module.exports = new SheetManager();
