/**
 * utils/logger.js
 * 
 * Módulo simple de logging con niveles
 * Útil para debugging y monitoreo en producción
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

const LOG_COLORS = {
  ERROR: '\x1b[31m', // Rojo
  WARN: '\x1b[33m',  // Amarillo
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[35m'  // Magenta
};

const RESET = '\x1b[0m';

class Logger {
  constructor(namespace = 'Bot') {
    this.namespace = namespace;
    this.level = process.env.LOG_LEVEL || 'INFO';
  }

  /**
   * Formatea timestamp en formato legible
   */
  getTimestamp() {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
  }

  /**
   * Log genérico con nivel
   */
  log(level, message, data = null) {
    const timestamp = this.getTimestamp();
    const color = LOG_COLORS[level] || '';
    
    let output = `${color}[${timestamp}] [${level}] [${this.namespace}]${RESET} ${message}`;
    
    if (data) {
      output += ` ${JSON.stringify(data, null, 2)}`;
    }

    console.log(output);
  }

  error(message, data = null) {
    this.log(LOG_LEVELS.ERROR, message, data);
  }

  warn(message, data = null) {
    this.log(LOG_LEVELS.WARN, message, data);
  }

  info(message, data = null) {
    this.log(LOG_LEVELS.INFO, message, data);
  }

  debug(message, data = null) {
    if (this.level === 'DEBUG') {
      this.log(LOG_LEVELS.DEBUG, message, data);
    }
  }
}

module.exports = Logger;
