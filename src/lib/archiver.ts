import fs from "fs";
import archiver from "archiver";
import logger from "./logger";
import { getAllFilesFromDir } from "./common";

export async function compressDir(dir: string, out: NodeJS.WritableStream) {
  const list = await getAllFilesFromDir(dir);
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("warning", err => logger.warn("压缩文件警告", { err }));
  archive.on("error", err => logger.warn("压缩文件错误", { err }));
  archive.pipe(out);
  list.forEach(f => {
    archive.append(fs.createReadStream(f), { name: f.slice(dir.length + 1).replace(/\\/g, "/") });
  });
  archive.finalize();
}
