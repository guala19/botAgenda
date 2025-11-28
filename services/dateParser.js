/**
 * dateParser.js - Versión Simplificada
 * 
 * Solo entiende 5 formatos específicos:
 * 1. "lunes 3pm" o "próximo lunes 3pm" - Día de semana + hora
 * 2. "nov 22 3pm" - Mes + día + hora
 * 3. "mañana 15:00" - Relativo + hora
 * 4. "2025-11-22 15:00" - ISO exacto
 * 5. "22 3pm" - Día del mes actual + hora
 */

const chrono = require('chrono-node');

/**
 * Convierte formato "XX horas" a "XX:00" si es necesario
 * Ej: "22 horas" → "22:00", "3 horas" → "03:00"
 */
function normalizeHourFormat(text) {
  // Buscar patrón "número + horas"
  const horasMatch = text.match(/^(\d{1,2})\s+horas?$/i);
  if (horasMatch) {
    const hour = parseInt(horasMatch[1]);
    return `${String(hour).padStart(2, '0')}:00`;
  }
  return text;
}

/**
 * Limpia el mensaje removiendo la mención del bot
 */
function cleanMessage(text, botMention = '@bot') {
  return text.replace(new RegExp(botMention, 'gi'), '').trim();
}

/**
 * Formatea solo la hora (HH:MM)
 */
function formatTimeOnly(date) {
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Formatea la fecha en ISO (YYYY-MM-DD)
 */
function formatDateISO(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Formatea la fecha legible en español
 */
function formatDateToSpanish(date) {
  const options = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Intl.DateTimeFormat('es-ES', options).format(date);
}

/**
 * Formatea solo la fecha (DD/MM/YYYY)
 */
function formatDateOnly(date) {
  return date.toLocaleDateString('es-ES');
}

/**
 * FORMATO 1: "lunes 3pm" o "próximo lunes 3pm" o "lunes a las 3 horas" - Día de semana + hora
 */
function parseFormat1(text) {
  // Acepta: "lunes 3pm", "próximo lunes 3pm", "proximo lunes 3pm", "lunes a las 3 horas"
  const regex = /^(?:pr[óo]xim[ao]\s+)?(lunes|martes|mi[eé]rcoles|jueves|viernes|s[áa]bado|domingo)\s+(.+)$/i;
  const match = text.match(regex);
  
  if (!match) return null;
  
  const dayName = match[1].toLowerCase().replace(/á/g, 'a').replace(/é/g, 'e').replace(/ó/g, 'o');
  let timePart = match[2];
  
  // Limpiar "a las" del timePart para que chrono lo entienda mejor
  // Ej: "a las 3 horas" → "3 horas" → "03:00"
  timePart = timePart.replace(/^a\s+las?\s+/i, '').trim();
  timePart = normalizeHourFormat(timePart);
  
  const weekdayMap = {
    'lunes': 1, 'martes': 2, 'miercoles': 3,
    'jueves': 4, 'viernes': 5, 'sabado': 6, 'domingo': 0
  };
  
  const timeResults = chrono.parse(timePart, { lang: 'es' });
  if (!timeResults || timeResults.length === 0) return null;
  
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  let parsedDate = new Date(currentYear, currentMonth, currentDay);
  
  // Avanzar hasta el próximo día de la semana deseado
  const targetDayOfWeek = weekdayMap[dayName];
  while (parsedDate.getDay() !== targetDayOfWeek || parsedDate <= now) {
    parsedDate.setDate(parsedDate.getDate() + 1);
  }
  
  // Aplicar hora
  const timeDate = timeResults[0].start.date();
  parsedDate.setHours(timeDate.getHours());
  parsedDate.setMinutes(timeDate.getMinutes());
  parsedDate.setSeconds(0);
  
  return parsedDate;
}

/**
 * FORMATO 2: "nov 22 3pm" o "noviembre 22 a las 3 horas" - Mes + día + hora
 */
function parseFormat2(text) {
  const regex = /^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\s+(\d{1,2})\s+(.+)$/i;
  const match = text.match(regex);
  
  if (!match) return null;
  
  const monthName = match[1].toLowerCase();
  const day = parseInt(match[2]);
  let timePart = match[3];
  
  // Limpiar "a las" del timePart para que chrono lo entienda mejor
  timePart = timePart.replace(/^a\s+las?\s+/i, '').trim();
  timePart = normalizeHourFormat(timePart);
  
  const monthMap = {
    'enero': 0, 'ene': 0,
    'febrero': 1, 'feb': 1,
    'marzo': 2, 'mar': 2,
    'abril': 3, 'abr': 3,
    'mayo': 4, 'may': 4,
    'junio': 5, 'jun': 5,
    'julio': 6, 'jul': 6,
    'agosto': 7, 'ago': 7,
    'septiembre': 8, 'sep': 8,
    'octubre': 9, 'oct': 9,
    'noviembre': 10, 'nov': 10,
    'diciembre': 11, 'dic': 11
  };
  
  const timeResults = chrono.parse(timePart, { lang: 'es' });
  if (!timeResults || timeResults.length === 0) return null;
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const month = monthMap[monthName];
  
  let parsedDate = new Date(currentYear, month, day);
  
  // Si la fecha es en el pasado, usar el próximo año
  if (parsedDate < now) {
    parsedDate = new Date(currentYear + 1, month, day);
  }
  
  // Aplicar hora
  const timeDate = timeResults[0].start.date();
  parsedDate.setHours(timeDate.getHours());
  parsedDate.setMinutes(timeDate.getMinutes());
  parsedDate.setSeconds(0);
  
  return parsedDate;
}

/**
 * FORMATO 3: "mañana 15:00" o "hoy 3pm" o "hoy a las 22 horas" - Relativo + hora
 */
function parseFormat3(text) {
  // Acepta: "hoy 3pm", "hoy 15:00", "hoy a las 22 horas", "mañana 5pm", etc.
  const regex = /^(hoy|mañana|manana|pasado\s+mañana|pasado\s+manana|pasadomañana|pasadomanana)\s+(.+)$/i;
  const match = text.match(regex);
  
  if (!match) return null;
  
  const keyword = match[1].toLowerCase().replace(/á/g, 'a');
  let timePart = match[2];
  
  // Limpiar "a las" del timePart para que chrono lo entienda mejor
  // Ej: "a las 22 horas" → "22 horas" → "22:00"
  timePart = timePart.replace(/^a\s+las?\s+/i, '').trim();
  timePart = normalizeHourFormat(timePart);
  
  const timeResults = chrono.parse(timePart, { lang: 'es' });
  if (!timeResults || timeResults.length === 0) return null;
  
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  let parsedDate;
  
  if (keyword === 'hoy') {
    parsedDate = new Date(currentYear, currentMonth, currentDay);
  } else if (keyword === 'mañana' || keyword === 'manana') {
    parsedDate = new Date(currentYear, currentMonth, currentDay + 1);
  } else if (keyword.includes('pasado')) {
    parsedDate = new Date(currentYear, currentMonth, currentDay + 2);
  } else {
    return null;
  }
  
  // Aplicar hora
  const timeDate = timeResults[0].start.date();
  parsedDate.setHours(timeDate.getHours());
  parsedDate.setMinutes(timeDate.getMinutes());
  parsedDate.setSeconds(0);
  
  return parsedDate;
}

/**
 * FORMATO 4: "2025-11-22 15:00" - ISO exacto
 */
function parseFormat4(text) {
  const regex = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/;
  const match = text.match(regex);
  
  if (!match) return null;
  
  const year = parseInt(match[1]);
  const month = parseInt(match[2]) - 1; // Restar 1 porque los meses son 0-11
  const day = parseInt(match[3]);
  const hour = parseInt(match[4]);
  const minute = parseInt(match[5]);
  
  const parsedDate = new Date(year, month, day, hour, minute, 0);
  
  return parsedDate;
}

/**
 * FORMATO 5: "22 3pm" o "22 a las 3 horas" - Día del mes actual + hora
 */
function parseFormat5(text) {
  const regex = /^(\d{1,2})\s+(.+)$/;
  const match = text.match(regex);
  
  if (!match) return null;
  
  const day = parseInt(match[1]);
  let timePart = match[2];
  
  // Validar que sea un día válido (1-31)
  if (day < 1 || day > 31) return null;
  
  // Limpiar "a las" del timePart para que chrono lo entienda mejor
  timePart = timePart.replace(/^a\s+las?\s+/i, '').trim();
  timePart = normalizeHourFormat(timePart);
  
  const timeResults = chrono.parse(timePart, { lang: 'es' });
  if (!timeResults || timeResults.length === 0) return null;
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  let parsedDate = new Date(currentYear, currentMonth, day);
  
  // Si la fecha es en el pasado, usar el próximo mes
  if (parsedDate < now) {
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    parsedDate = new Date(nextYear, nextMonth, day);
  }
  
  // Aplicar hora
  const timeDate = timeResults[0].start.date();
  parsedDate.setHours(timeDate.getHours());
  parsedDate.setMinutes(timeDate.getMinutes());
  parsedDate.setSeconds(0);
  
  return parsedDate;
}

/**
 * FUNCIÓN PRINCIPAL - Parsea el mensaje
 */
function parseMessageForDateTime(messageText, botMention = '@bot') {
  try {
    const cleanedText = cleanMessage(messageText, botMention).trim();
    
    console.log(`[dateParser] Texto limpio: "${cleanedText}"`);
    
    // Intentar cada formato en orden
    let parsedDate = null;
    let format = null;
    
    parsedDate = parseFormat1(cleanedText);
    if (parsedDate) format = 1;
    
    if (!parsedDate) {
      parsedDate = parseFormat2(cleanedText);
      if (parsedDate) format = 2;
    }
    
    if (!parsedDate) {
      parsedDate = parseFormat3(cleanedText);
      if (parsedDate) format = 3;
    }
    
    if (!parsedDate) {
      parsedDate = parseFormat4(cleanedText);
      if (parsedDate) format = 4;
    }
    
    if (!parsedDate) {
      parsedDate = parseFormat5(cleanedText);
      if (parsedDate) format = 5;
    }
    
    if (!parsedDate) {
      console.log(`[dateParser] ❌ Formato no reconocido`);
      return null;
    }
    
    console.log(`[dateParser] ✅ Formato ${format}: ${formatDateToSpanish(parsedDate)}`);
    
    return {
      date: parsedDate,
      isValid: true,
      timeString: formatTimeOnly(parsedDate),
      dateString: formatDateToSpanish(parsedDate),
      isoDate: formatDateISO(parsedDate),
      dateOnlyString: formatDateOnly(parsedDate)
    };
  } catch (error) {
    console.error('[dateParser] Error:', error.message);
    return null;
  }
}

module.exports = {
  parseMessageForDateTime,
  cleanMessage,
  formatDateToSpanish,
  formatTimeOnly,
  formatDateOnly,
  formatDateISO
};
