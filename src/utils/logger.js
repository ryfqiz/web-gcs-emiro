// Centralized logging utility with environment awareness

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

class Logger {
  constructor() {
    this.level = import.meta.env.DEV ? LOG_LEVELS.DEBUG : LOG_LEVELS. WARN;
    this.isDevelopment = import.meta.env.DEV;
    this. prefix = '[Web-GCS]';
  }

  error(message, ...args) {
    if (this.level >= LOG_LEVELS.ERROR) {
      console.error(`${this.prefix} ❌`, message, ...args);
    }
  }

  warn(message, ...args) {
    if (this.level >= LOG_LEVELS.WARN) {
      console.warn(`${this.prefix} ⚠️`, message, ...args);
    }
  }

  info(message, ...args) {
    if (this.level >= LOG_LEVELS.INFO) {
      console. log(`${this.prefix} ℹ️`, message, ...args);
    }
  }

  debug(message, ...args) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      console.log(`${this.prefix} 🔍`, message, ...args);
    }
  }

  connection(message, data) {
    if (this. isDevelopment) {
      console. log(`${this.prefix} 🔌`, message, data);
    }
  }

  telemetry(message, data) {
    if (this. isDevelopment) {
      console.log(`${this.prefix} 📡`, message, data);
    }
  }

  video(message, data) {
    if (this.isDevelopment) {
      console.log(`${this.prefix} 📹`, message, data);
    }
  }

  map(message, data) {
    if (this.isDevelopment) {
      console.log(`${this.prefix} 🗺️`, message, data);
    }
  }
}

export const logger = new Logger();