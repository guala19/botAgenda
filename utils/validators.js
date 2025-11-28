/**
 * utils/validators.js
 * 
 * Funciones de validación para entrada de usuario
 */

/**
 * Valida formato de número de teléfono mexicano
 * Acepta: 52xxxxxxxxxx, +52xxxxxxxxxx, xxxxxxxxxx
 * 
 * @param {string} phone - Número a validar
 * @returns {boolean} - true si es válido
 */
function isValidMexicanPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Remover caracteres especiales
  const cleaned = phone.replace(/\D/g, '');

  // Debe tener 10 dígitos (sin código país) o 12 (con código país 52)
  return cleaned.length === 10 || (cleaned.length === 12 && cleaned.startsWith('52'));
}

/**
 * Normaliza número de teléfono al formato 52xxxxxxxxxx
 * 
 * @param {string} phone - Número a normalizar
 * @returns {string|null} - Número normalizado o null si inválido
 */
function normalizePhoneNumber(phone) {
  if (!isValidMexicanPhone(phone)) {
    return null;
  }

  let cleaned = phone.replace(/\D/g, '');

  // Si tiene 10 dígitos, agregar código país
  if (cleaned.length === 10) {
    cleaned = '52' + cleaned;
  }

  return cleaned;
}

/**
 * Valida que la hora esté en formato HH:MM (24h)
 * 
 * @param {string} time - Tiempo a validar
 * @returns {boolean} - true si es válido
 */
function isValidTimeFormat(time) {
  if (!time || typeof time !== 'string') {
    return false;
  }

  const regex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(time);
}

/**
 * Valida que la fecha esté en formato ISO YYYY-MM-DD
 * 
 * @param {string} dateStr - Fecha a validar
 * @returns {boolean} - true si es válido y es en el futuro o hoy
 */
function isValidDateISO(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return false;
  }

  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) {
    return false;
  }

  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) {
    return false;
  }

  // Validar que sea futuro o hoy
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date >= today;
}

/**
 * Valida que la fecha esté en formato DD/MM/YYYY
 * 
 * @param {string} dateStr - Fecha a validar
 * @returns {boolean} - true si es válido
 */
function isValidDateDDMMYYYY(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return false;
  }

  const regex = /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
  if (!regex.test(dateStr)) {
    return false;
  }

  const [day, month, year] = dateStr.split('/');
  const date = new Date(year, month - 1, day);

  // Validar que sea una fecha real
  return date.getFullYear() === parseInt(year) &&
         date.getMonth() === parseInt(month) - 1 &&
         date.getDate() === parseInt(day);
}

/**
 * Valida que el mensaje tenga contenido válido
 * 
 * @param {string} message - Mensaje a validar
 * @returns {boolean} - true si es válido
 */
function isValidMessage(message) {
  if (!message || typeof message !== 'string') {
    return false;
  }

  // Debe tener entre 3 y 200 caracteres
  const trimmed = message.trim();
  return trimmed.length >= 3 && trimmed.length <= 200;
}

/**
 * Verifica si el mensaje contiene mención del bot
 * 
 * @param {string} message - Mensaje a verificar
 * @param {string} botMention - Mención del bot (default: @lavanderia)
 * @returns {boolean} - true si contiene mención
 */
function hasBotMention(message, botMention = '@lavanderia') {
  if (!message || typeof message !== 'string') {
    return false;
  }

  return message.toLowerCase().includes(botMention.toLowerCase());
}

module.exports = {
  isValidMexicanPhone,
  normalizePhoneNumber,
  isValidTimeFormat,
  isValidDateISO,
  isValidDateDDMMYYYY,
  isValidMessage,
  hasBotMention
};
