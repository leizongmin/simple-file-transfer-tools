import fs from "fs";
import path from "path";
import http from "http";
import rd from "rd/promises";
import fsExtra from "fs-extra";
import { X_CONTENT_MD5, getFileMd5, IServerAddress } from "./common";

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

export async function putDir(server: IServerAddress, dir: string, onProgress?: IOnProgress): Promise<IPutResult[]> {
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
      await putFileToServer(server, key, md5, file);
      if (onProgress) onProgress("success", { total: files.length, finishCount, file, key, md5 });
      result.push({ key, md5 });
    } catch (err) {
      if (onProgress) onProgress("fail", { total: files.length, finishCount, file, err });
    }
    finishCount++;
  }
  return result;
}

export async function putFile(server: IServerAddress, filepath: string): Promise<IPutResult> {
  const stats = await fsExtra.stat(filepath);
  if (!stats.isFile()) throw new Error(`不是一个文件：${filepath}`);
  const key = path.basename(filepath);
  const md5 = await getFileMd5(filepath);
  await putFileToServer(server, key, md5, filepath);
  return { key, md5 };
}

function putFileToServer(server: IServerAddress, key: string, md5: string, filepath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const req = http.request(
      {
        method: "PUT",
        hostname: server.host,
        port: server.port,
        path: `${server.path}/${encodeURIComponent(key)}`,
        headers: {
          [X_CONTENT_MD5]: md5,
          "content-type": "application/octet-stream",
        },
      },
      res => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(`status=${res.statusCode}`);
        }
      },
    );
    fs.createReadStream(filepath).pipe(req);
  });
}
