import fsExtra from "fs-extra";
import logger from "./logger";

export const REGEXP_IP = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
export const REGEXP_PORT = /^\d+$/;

export function formatIpListInput(input: string, defaultValue: string) {
  return (
    input
      .split(",")
      .map(v => v.trim())
      .filter(v => v)
      .filter(v => {
        REGEXP_IP.lastIndex = 0;
        return REGEXP_IP.test(v);
      })
      .join(",") || defaultValue
  );
}

export const X_CONTENT_MD5 = "x-content-md5";

export function pickConfig(commander: any, keys: string[]) {
  const ret: any = {};
  keys.forEach(k => (ret[k] = commander[k]));
  if (commander.config) {
    if (!fsExtra.existsSync(commander.config)) {
      return logger.fatal(`无法读取配置文件：${commander.config}`);
    }
    const c = fsExtra.readJsonSync(commander.config);
    keys.forEach(k => {
      if (typeof c[k] !== "undefined") {
        ret[k] = c[k];
      }
    });
  }
  return ret;
}

process.on("uncaughtException", err => {
  logger.fatal("uncaughtException: %s", err.stack);
});
process.on("unhandledRejection", err => {
  logger.fatal("unhandledRejection: %s", err.stack);
});
