import url from "url";
import fs from "fs";
import crypto from "crypto";
import rd from "rd";
import fsExtra from "fs-extra";

export const VERSION = require("../../package.json").version;

export const REGEXP_IP = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
export const REGEXP_PORT = /^\d+$/;

export const DEFAULT_PORT = 12345;
export const DEFAULT_TIMEOUT = 20000;

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
export const X_MODULE = "x-module";
export const MODULE_TYPE_FILE = "file";
export const X_TOKEN = "x-token";

export function pickConfig(commander: any, keys: string[]) {
  const ret: any = {};
  keys.forEach(k => (ret[k] = commander[k]));
  if (commander.config) {
    if (!fsExtra.existsSync(commander.config)) {
      throw new Error(`无法读取配置文件：${commander.config}`);
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

export interface IServerAddress {
  host: string;
  port: number;
  path: string;
  auth: string;
}

export function parseServerAddress(str: string): IServerAddress {
  const info = url.parse(`sftt://${str}`);
  return {
    host: info.hostname!,
    port: Number(info.port || DEFAULT_PORT),
    path: info.pathname!,
    auth: info.auth || "",
  };
}

export function getAllFilesFromDir(dir: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    rd.readFile(dir, (err, list) => {
      if (err) return reject(err);
      resolve(list);
    });
  });
}

export function getFileMd5(filepath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const hash = crypto.createHash("md5");
    const stream = fs.createReadStream(filepath);
    stream.on("data", chunk => hash.update(chunk));
    stream.on("end", () => {
      resolve(hash.digest("hex").toLocaleLowerCase());
    });
  });
}
