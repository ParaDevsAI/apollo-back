export class Logger {
    static info(message, ...args) {
        console.log(`[INFO] ${new Date().toISOString()}: ${message}`, ...args);
    }
    static error(message, error) {
        console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error);
    }
    static warn(message, ...args) {
        console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, ...args);
    }
    static debug(message, ...args) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEBUG] ${new Date().toISOString()}: ${message}`, ...args);
        }
    }
}
//# sourceMappingURL=logger.js.map