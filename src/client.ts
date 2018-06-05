import fs from "fs";
import path from "path";
import http from "http";
import crypto from "crypto";
import rd from "rd";
import commander from "commander";
import logger from "./logger";
import { X_CONTENT_MD5 } from "./common";

commander
  .version(require("../package.json").version)
  .option("-f, --file <file>", "要上传的文件", "")
  .option("-d, --dir <dir>", "要上传的目录", "")
  .option("-s, --server <server>", "远程服务器地址（host:port/path）", "127.0.0.1:12345/data")
  .parse(process.argv);

const server = parseServerAddress(commander.server.trim());
const file = path.resolve(commander.file.trim());
const dir = path.resolve(commander.dir.trim());
if (commander.file) logger.info("要上传的文件：%s", file);
if (commander.dir) logger.info("要上传的目录：%s", dir);
logger.info("远程服务器地址：%s:%s %s", server.host, server.port, server.path);

if (commander.file) {
  uploads([{ filepath: file, key: path.basename(file) }]);
} else if (commander.dir) {
  uploads(
    rd.readFileSync(dir).map(filepath => {
      return { filepath, key: filepath.slice(dir.length + 1).replace(/\\/g, "/") };
    }),
  );
} else {
  logger.warn("没有指定上传文件");
}

function parseServerAddress(str: string): { host: string; port: number; path: string } {
  const s = str.split(/\/|\:/);
  return { host: s[0], port: Number(s[1]), path: `/${s[2]}` };
}

function uploads(list: Array<{ filepath: string; key: string }>) {
  if (list.length < 1) {
    logger.warn("没有指定上传文件");
    return;
  }
  (async function() {
    let counter = 0;
    for (let { filepath, key } of list) {
      counter++;
      const md5 = await getFileMd5(filepath);
      logger.info("[%s/%s] 上传文件：%s（md5=%s）", counter, list.length, key, md5);
      try {
        await uploadFile(md5, key, filepath);
      } catch (err) {
        logger.error("上传文件失败：%s <= %s", key, filepath, { err });
      }
    }
  })().catch(err => {
    logger.fatal(err);
  });
}

function uploadFile(md5: string, key: string, filepath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const req = http.request(
      {
        method: "PUT",
        hostname: server.host,
        port: server.port,
        path: `${server.path}/${key}`,
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

function getFileMd5(filepath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const hash = crypto.createHash("md5");
    const stream = fs.createReadStream(filepath);
    stream.on("data", chunk => hash.update(chunk));
    stream.on("end", () => {
      resolve(hash.digest("hex").toLocaleLowerCase());
    });
  });
}
