export class Logger {
  static info(message: string, ...args: any[]): void {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, ...args);
  }

  static error(message: string, error?: Error, ...args: any[]): void {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error, ...args);
  }

  static warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, ...args);
  }

  static debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] ${new Date().toISOString()}: ${message}`, ...args);
    }
  }
}