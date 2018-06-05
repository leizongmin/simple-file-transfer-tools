import logger from "./logger";

export const REGEXP_IP = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
export const REGEXP_PORT = /^\d+$/;
export const X_CONTENT_MD5 = "x-content-md5";

process.on("uncaughtException", err => {
  logger.fatal("uncaughtException", { err });
});
process.on("unhandledRejection", err => {
  logger.fatal("unhandledRejection", { err });
});
