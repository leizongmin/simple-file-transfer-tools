import fs from "fs";
import path from "path";
import http from "http";
import rd from "rd/promises";
import fsExtra from "fs-extra";
import { X_MODULE, X_TOKEN, MODULE_TYPE_FILE, X_CONTENT_MD5, getFileMd5, IServerAddress } from "./common";

export interface IPutResult {
  key: string;
  md5: string;
}

export type IOnProgress = (
  type: "upload" | "success" | "fail",
  data: {
    total: number;
    finishCount: number;
    file: string;
    key?: string;
    md5?: string;
    err?: Error;
  },
) => void;

export interface IPutOptions {
  timeout?: number;
}

export async function putDir(
  server: IServerAddress,
  dir: string,
  onProgress?: IOnProgress,
  options?: IPutOptions,
): Promise<IPutResult[]> {
  dir = path.resolve(dir);
  const stats = await fsExtra.stat(dir);
  if (!stats.isDirectory()) throw new Error(`不是一个文件夹：${dir}`);
  const files = await rd.readFile(dir);
  const result: IPutResult[] = [];
  let finishCount = 0;
  for (const file of files) {
    try {
      if (onProgress) onProgress("upload", { total: files.length, finishCount, file });
      const key = file.slice(dir.length + 1).replace(/\\/g, "/");
      const md5 = await getFileMd5(file);
      await putFileToServer(server, key, md5, file, options);
      if (onProgress) onProgress("success", { total: files.length, finishCount: finishCount + 1, file, key, md5 });
      result.push({ key, md5 });
    } catch (err) {
      if (onProgress) onProgress("fail", { total: files.length, finishCount: finishCount + 1, file, err });
    }
    finishCount++;
  }
  return result;
}

export async function putFile(server: IServerAddress, filepath: string, options?: IPutOptions): Promise<IPutResult> {
  const stats = await fsExtra.stat(filepath);
  if (!stats.isFile()) throw new Error(`不是一个文件：${filepath}`);
  const key = path.basename(filepath);
  const md5 = await getFileMd5(filepath);
  await putFileToServer(server, key, md5, filepath, options);
  return { key, md5 };
}

function putFileToServer(
  server: IServerAddress,
  key: string,
  md5: string,
  filepath: string,
  options: IPutOptions = {},
): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    let tid: number;
    const req = http.request(
      {
        method: "PUT",
        hostname: server.host,
        port: server.port,
        path: path.join(server.path, encodeURIComponent(key)),
        headers: {
          [X_MODULE]: MODULE_TYPE_FILE,
          [X_TOKEN]: "",
          [X_CONTENT_MD5]: md5,
          "content-type": "application/octet-stream",
        },
        timeout: options.timeout,
      },
      res => {
        clearTimeout(tid);
        if (res.statusCode === 200) {
          resolve(res);
        } else {
          reject(`status=${res.statusCode}`);
        }
      },
    );
    fs.createReadStream(filepath).pipe(req);
    req.on("error", err => reject(err));

    if (options.timeout! > 0) {
      tid = setTimeout(() => {
        const err = new Error(`上传文件超时！（${options!.timeout}ms）`);
        reject(err);
        req.destroy(err);
      }, options.timeout);
    }
  });
}
