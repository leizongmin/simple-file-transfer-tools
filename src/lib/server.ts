import os from "os";
import fs from "fs";
import path from "path";
import http from "http";
import crypto from "crypto";
import fsExtra from "fs-extra";
import logger from "./logger";
import { X_CONTENT_MD5 } from "./common";
import { compressDir } from "./archiver";

export interface ServerOptions {
  ipList: string[];
  dir: string;
}

export class Server {
  protected server: http.Server | null = null;

  constructor(public readonly options: ServerOptions) {}

  public listen(host: string, port: number) {
    this.attach(http.createServer());
    this.server!.listen(port, host, () => {
      logger.info("监听地址：%s:%s", host, port);
    });
    this.server!.on("error", err => {
      logger.fatal(err);
    });
  }

  public attach(server: http.Server) {
    this.server = server;
    server.on("request", (req, res) => {
      if (this.options.ipList.indexOf(req.socket.remoteAddress!) === -1) {
        logger.warn("拒绝来自%s的请求", req.socket.remoteAddress);
        res.writeHead(403);
        res.end();
        return;
      }
      logger.info("处理来自%s的请求：%s %s", req.socket.remoteAddress, req.method, req.url);
      switch (req.method) {
        case "GET":
          run(req, res, () => this.getFile(req, res));
          break;
        case "PUT":
          run(req, res, () => this.putFile(req, res));
          break;
        default:
          logger.warn("不支持请求方法：%s", req.method);
          res.writeHead(405);
          res.end();
      }
    });
  }

  public async getFile(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const { success, filepath } = resolvePath(this.options.dir, req.url!);
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
      await compressDir(filepath, res);
    } else {
      logger.info("无法识别的文件类型：%j", stats);
      res.writeHead(500);
      res.end();
    }
  }

  public async putFile(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const { success, filepath } = resolvePath(this.options.dir, req.url!);
    if (!success) {
      res.writeHead(403);
      res.end();
      logger.warn("不允许访问文件：%s", filepath);
      return;
    }
    await fsExtra.ensureDir(path.dirname(filepath));
    const tmpFile = path.resolve(os.tmpdir(), `${Date.now()}-${Math.random()}-${Math.random()}.tmp`);
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
            await fsExtra.unlink(tmpFile);
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
}

function run(req: http.IncomingMessage, res: http.ServerResponse, handle: Function) {
  handle(req, res).catch((err: Error) => {
    logger.error("处理请求出错：%s %s", req.method, req.url, { err });
    if (!res.headersSent) {
      res.writeHead(500);
      res.end(err.stack);
    }
  });
}

function resolvePath(dir: string, url: string): { success: boolean; filepath: string } {
  const filepath = decodeURIComponent(path.resolve(dir, url.slice(1)));
  if (filepath.slice(0, dir.length + 1) === `${dir}${path.sep}`) {
    return { success: true, filepath };
  }
  if (filepath === dir) {
    return { success: true, filepath };
  }
  return { success: false, filepath };
}
