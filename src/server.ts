import os from "os";
import fs from "fs";
import path from "path";
import http from "http";
import crypto from "crypto";
import fsExtra from "fs-extra";
import commander from "commander";
import archiver from "archiver";
import rd from "rd";
import logger from "./logger";
import { REGEXP_IP, REGEXP_PORT, formatIpListInput, X_CONTENT_MD5, pickConfig } from "./common";

commander
  .version(require("../package.json").version)
  .option("-i, --ip <ip>", "允许的来源IP地址，多个地址通过逗号分隔", formatIpListInput, "127.0.0.1")
  .option("-p, --port <port>", "监听的端口", REGEXP_PORT, "12345")
  .option("-h, --host <host>", "监听的地址", REGEXP_IP, "0.0.0.0")
  .option("-d, --dir <dir>", "文件根目录", ".")
  .option("-c, --config <config_file>", "指定配置文件")
  .parse(process.argv);

const config: any = pickConfig(commander, ["ip", "port", "host", "dir"]);
const port = Number(config.port);
const ipList = (config.ip as string)
  .trim()
  .split(",")
  .map(v => v.trim())
  .filter(v => v);
const host = config.host.trim() as string;
const dir = path.resolve(config.dir.trim());
process.chdir(dir);
logger.info("文件根目录：%s", dir);
logger.info("允许的来源IP地址：%s", ipList.join(", "));

const server = http.createServer(function(req, res) {
  if (ipList.indexOf(req.socket.remoteAddress!) === -1) {
    logger.warn("拒绝来自%s的请求", req.socket.remoteAddress);
    res.writeHead(403);
    res.end();
    return;
  }
  logger.info("处理来自%s的请求：%s %s", req.socket.remoteAddress, req.method, req.url);
  switch (req.method) {
    case "GET":
      run(req, res, getFile);
      break;
    case "PUT":
      run(req, res, putFile);
      break;
    default:
      logger.warn("不支持请求方法：%s", req.method);
      res.writeHead(405);
      res.end();
  }
});
server.listen(port, host, () => {
  logger.info("监听地址：%s:%s", host, port);
});
server.on("error", err => {
  logger.fatal(err);
});

type HandleFunction = Function;

function run(req: http.IncomingMessage, res: http.ServerResponse, handle: HandleFunction) {
  handle(req, res).catch((err: Error) => {
    logger.error("处理请求出错：%s %s", req.method, req.url, { err });
    if (!res.headersSent) {
      res.writeHead(500);
      res.end(err.stack);
    }
  });
}

async function getFile(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const { success, filepath } = resolvePath(req.url!);
  if (!success) {
    res.writeHead(403);
    res.end();
    logger.warn("不允许访问文件：%s", filepath);
    return;
  }
  const exists = await fsExtra.pathExists(filepath);
  if (!exists) {
    res.writeHead(404);
    res.end();
    logger.warn("文件不存在：%s", filepath);
    return;
  }
  const stats = await fsExtra.stat(filepath);
  if (stats.isFile()) {
    logger.info("读取文件：%s", filepath);
    res.writeHead(200, { "content-type": "application/octet-stream" });
    fs.createReadStream(filepath).pipe(res);
  } else if (stats.isDirectory()) {
    logger.info("读取目录：%s", filepath);
    rd.readFile(filepath, (err, list) => {
      if (err) {
        logger.error(err);
        res.writeHead(500);
        res.end();
        return;
      }
      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.on("warning", err => logger.warn("压缩文件警告", { err }));
      archive.on("error", err => logger.warn("压缩文件错误", { err }));
      archive.pipe(res);
      if (list) {
        list.forEach(f => {
          archive.append(fs.createReadStream(f), { name: f.slice(filepath.length + 1).replace(/\\/g, "/") });
        });
      }
      archive.finalize();
    });
  } else {
    logger.info("无法识别的文件类型：%j", stats);
    res.writeHead(500);
    res.end();
  }
}

async function putFile(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const { success, filepath } = resolvePath(req.url!);
  if (!success) {
    res.writeHead(403);
    res.end();
    logger.warn("不允许访问文件：%s", filepath);
    return;
  }
  await fsExtra.ensureDir(path.dirname(filepath));
  const tmpFile = path.resolve(os.tmpdir(), `${Date.now()}-${Math.random()}=${Math.random()}.tmp`);
  const hashStream = crypto.createHash("md5");
  const fileStream = fs.createWriteStream(tmpFile);
  req.on("data", chunk => {
    fileStream.write(chunk);
    hashStream.update(chunk);
  });
  req.on("end", () => {
    run(req, res, async function() {
      fileStream.end();
      const md5 = hashStream.digest("hex").toLowerCase();
      let isVerify = false;
      if (req.headers[X_CONTENT_MD5]) {
        if (String(req.headers[X_CONTENT_MD5]).toLowerCase() !== md5) {
          res.writeHead(400);
          res.end();
          logger.warn("校验文件失败：%s != %s", md5, req.headers[X_CONTENT_MD5]);
          fsExtra.unlink(tmpFile);
          return;
        }
        isVerify = true;
      }
      logger.info("写入文件：%s（md5=%s, verify=%s）", filepath, md5, isVerify);
      await fsExtra.move(tmpFile, filepath, { overwrite: true });
      res.end();
    });
  });
}

function resolvePath(url: string): { success: boolean; filepath: string } {
  const filepath = path.resolve(dir, url.slice(1));
  if (filepath.slice(0, dir.length + 1) === `${dir}${path.sep}`) {
    return { success: true, filepath };
  }
  if (filepath === dir) {
    return { success: true, filepath };
  }
  return { success: false, filepath };
}
