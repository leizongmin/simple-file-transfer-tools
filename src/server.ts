import fs from "fs";
import path from "path";
import http from "http";
import fsExtra from "fs-extra";
import commander from "commander";
import logger from "./logger";

const REGEXP_IP = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const REGEXP_PORT = /^\d+$/;

commander
  .version(require("../package.json").version)
  .option("-i, --ip <ip>", "允许的来源IP地址", REGEXP_IP, "127.0.0.1")
  .option("-p, --port <port>", "监听的端口", REGEXP_PORT, "12345")
  .option("-h, --host <host>", "监听的地址", REGEXP_IP, "0.0.0.0")
  .option("-d, --dir <dir>", "文件根目录", ".")
  .parse(process.argv);

const port = Number(commander.port);
const ipList = (commander.ip as string)
  .trim()
  .split(",")
  .map(v => v.trim())
  .filter(v => v);
const host = commander.host.trim() as string;
const dir = path.resolve(commander.dir.trim());
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
  switch (req.method) {
    case "GET":
      run(req, res, getFile);
      break;
    case "PUT":
      run(req, res, putFile);
      break;
    default:
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

type HandleFunction = (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>;

function run(req: http.IncomingMessage, res: http.ServerResponse, handle: HandleFunction) {
  logger.info("处理来自%s的请求：%s %s", req.socket.remoteAddress, req.method, req.url);
  handle(req, res).catch(err => {
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
  logger.info("读取文件：%s", filepath);
  res.writeHead(200, { "content-type": "application/octet-stream" });
  fs.createReadStream(filepath).pipe(res);
}

async function putFile(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const { success, filepath } = resolvePath(req.url!);
  if (!success) {
    res.writeHead(403);
    res.end();
    logger.warn("不允许访问文件：%s", filepath);
    return;
  }
  logger.info("写入文件：%s", filepath);
  await fsExtra.ensureDir(path.dirname(filepath));
  req.pipe(fs.createWriteStream(filepath)).on("close", () => {
    res.writeHead(200);
    res.end();
  });
}

function resolvePath(url: string): { success: boolean; filepath: string } {
  const filepath = path.resolve(dir, url.slice(1));
  if (filepath.slice(0, dir.length + 1) === `${dir}${path.sep}`) {
    return { success: true, filepath };
  }
  return { success: false, filepath };
}
