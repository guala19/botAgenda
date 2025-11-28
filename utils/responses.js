/**
 * utils/responses.js
 * 
 * Plantillas de respuestas del bot
 * Centralizado aquí para fácil customización
 */

const MESSAGES = {
  // Éxito
  SUCCESS_RESERVATION: (dateString, timeString) => {
    return (
      `✅ ¡Reserva confirmada!\n\n` +
      `${dateString}\n\n` +
      `¡Nos vemos en la lavandería!`
    );
  },

  // Errores de parsing
  INVALID_TIME_FORMAT: () => {
    return (
      `🤔 No entendí ese formato.\n\n` +
      `Usa alguno de estos:\n\n` +
      `• @lavanderia lunes 3pm\n` +
      `• @lavanderia mañana 15:00\n` +
      `• @lavanderia 22 3pm\n` +
      `• @lavanderia nov 22 3pm\n` +
      `• @lavanderia 2025-11-22 15:00`
    );
  },

  INVALID_MESSAGE_FORMAT: () => {
    return (
      `❌ Mensaje no válido.\n\n` +
      `Por favor, escribe tu solicitud de forma clara.`
    );
  },

  // Errores de disponibilidad
  TIME_SLOT_OCCUPIED: (dateString) => {
    return (
      `⏰ Ese horario está ocupado.\n\n` +
      `Intenta con otra hora o fecha.`
    );
  },

  // Errores del sistema
  DATABASE_ERROR: () => {
    return (
      `❌ Error al guardar. Intenta de nuevo.`
    );
  },

  GENERIC_ERROR: () => {
    return (
      `❌ Algo salió mal. Intenta de nuevo.`
    );
  },

  // Help/Info
  HELP_MESSAGE: () => {
    return (
      `📋 *Cómo usar este bot:*\n\n` +
      `Escribe el día y hora en que quieres lavar:\n` +
      `• "Mañana a las 5pm"\n` +
      `• "Hoy a las 10 de la mañana"\n` +
      `• "Miércoles a las 7:30"\n\n` +
      `El bot verificará disponibilidad y confirmará tu reserva.`
    );
  },

  // Confirmación de espera
  PROCESSING: () => {
    return `⏳ Procesando tu solicitud...`;
  },

  // Cancelación
  CANCELLATION_SUCCESS: (dateString) => {
    return (
      `✅ Reserva cancelada.\n\n` +
      `📅 ${dateString}\n\n` +
      `Lamentamos que no puedas venir.`
    );
  },

  CANCELLATION_NOT_FOUND: () => {
    return (
      `❌ No encontramos esa reserva.\n\n` +
      `Por favor, verifica la fecha y hora.`
    );
  },

  // Listado de reservas
  NO_RESERVATIONS: () => {
    return (
      `📭 No tienes reservas programadas.\n\n` +
      `¿Quieres hacer una nueva?`
    );
  },

  RESERVATIONS_HEADER: () => {
    return `📋 *Tus reservas:*\n`;
  },

  RESERVATION_ITEM: (index, dateString, timeString) => {
    return `${index}. ${dateString} a las ${timeString}`;
  }
};

/**
 * Retorna mensaje según tipo de error
 * 
 * @param {string} errorType - Tipo de error
 * @param {object} data - Datos contextuales (opcional)
 * @returns {string} - Mensaje formateado
 */
function getErrorMessage(errorType, data = {}) {
  const errorMessages = {
    INVALID_TIME: MESSAGES.INVALID_TIME_FORMAT(),
    INVALID_MESSAGE: MESSAGES.INVALID_MESSAGE_FORMAT(),
    TIME_OCCUPIED: MESSAGES.TIME_SLOT_OCCUPIED(data.dateString || 'ese horario'),
    DATABASE_ERROR: MESSAGES.DATABASE_ERROR(),
    GENERIC: MESSAGES.GENERIC_ERROR(),
    CANCELLED_NOT_FOUND: MESSAGES.CANCELLATION_NOT_FOUND()
  };

  return errorMessages[errorType] || MESSAGES.GENERIC_ERROR();
}

/**
 * Retorna mensaje de éxito
 * 
 * @param {string} dateString - Fecha formateada
 * @param {string} timeString - Hora formateada
 * @returns {string} - Mensaje de confirmación
 */
function getSuccessMessage(dateString, timeString) {
  return MESSAGES.SUCCESS_RESERVATION(dateString, timeString);
}

/**
 * Retorna mensaje de cancelación
 * 
 * @param {string} dateString - Fecha formateada
 * @returns {string} - Mensaje de cancelación
 */
function getCancellationMessage(dateString) {
  return MESSAGES.CANCELLATION_SUCCESS(dateString);
}

module.exports = {
  MESSAGES,
  getErrorMessage,
  getSuccessMessage,
  getCancellationMessage
};
