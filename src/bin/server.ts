import path from "path";
import commander from "commander";
import logger from "../lib/logger";
import { VERSION, REGEXP_IP, REGEXP_PORT, formatIpListInput, pickConfig } from "../lib/common";
import { Server } from "../lib/server";
import "./catch_error";

commander
  .version(VERSION)
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

const server = new Server({ ipList, dir });
server.listen(host, port);
