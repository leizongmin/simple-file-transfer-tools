import logger from "../lib/logger";

process.on("uncaughtException", err => {
  logger.fatal("uncaughtException: %s", err.stack);
});
process.on("unhandledRejection", err => {
  logger.fatal("unhandledRejection: %s", err.stack);
});
