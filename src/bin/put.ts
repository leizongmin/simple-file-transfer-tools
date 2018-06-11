import path from "path";
import commander from "commander";
import logger from "../lib/logger";
import { VERSION, pickConfig, parseServerAddress, DEFAULT_PORT } from "../lib/common";
import { putFile, putDir } from "../lib/put";

commander
  .version(VERSION)
  .option("-f, --file <file>", "要上传的文件", "")
  .option("-d, --dir <dir>", "要上传的目录", "")
  .option("-s, --server <server>", "远程服务器地址（host:port/path）", `127.0.0.1:${DEFAULT_PORT}/data`)
  .option("-c, --config <config_file>", "指定配置文件")
  .parse(process.argv);

const config: any = pickConfig(commander, ["file", "dir", "server"]);
const server = parseServerAddress(config.server.trim());
const file = path.resolve(config.file.trim());
const dir = path.resolve(config.dir.trim());
if (config.file) logger.info("要上传的文件：%s", file);
if (config.dir) logger.info("要上传的目录：%s", dir);
logger.info("远程服务器地址：%s:%s %s", server.host, server.port, server.path);

async function main() {
  if (config.file) {
    const file = path.resolve(config.file);
    logger.info("[1/1] 正在上传文件：%s", file);
    const { key, md5 } = await putFile(server, file);
    logger.info("[1/1] 上传文件成功文件：%s（key=%s, md5=%s）", file, key, md5);
  } else if (config.dir) {
    let total = 0;
    let failTotal = 0;
    await putDir(server, path.resolve(config.dir), (type, data) => {
      if (type === "upload") {
        total++;
        logger.info("[%s/%s] 正在上传文件：%s", data.finishCount, data.total, data.file);
      } else if (type === "success") {
        logger.info(
          "[%s/%s] 上传文件成功文件：%s（key=%s, md5=%s）",
          data.finishCount,
          data.total,
          data.file,
          data.key,
          data.md5,
        );
      } else {
        failTotal++;
        logger.error("[%s/%s] 上传文件失败：%s", data.finishCount, data.total, data.file, { err: data.err });
      }
      if (failTotal > 0) {
        logger.error("共上传 %s 个文件，其中 %s 上传失败", total, failTotal);
      } else {
        logger.info("共上传 %s 个文件，全部成功", total);
      }
    });
  } else {
    logger.warn("没有指定上传文件");
  }
}

main()
  .then(() => {
    logger.info("完成");
    process.exit();
  })
  .catch(err => {
    logger.fatal(err);
    process.exit(1);
  });
