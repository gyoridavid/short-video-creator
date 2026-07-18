import fs from "fs-extra";
import https from "https";
import http from "http";

import { logger } from "../logger";

export async function downloadFileFromUrl(
  url: string,
  destPath: string,
): Promise<void> {
  logger.debug(`Downloading file from ${url} to ${destPath}`);
  await new Promise<void>((resolve, reject) => {
    const fileStream = fs.createWriteStream(destPath);
    https
      .get(url, (response: http.IncomingMessage) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download file: ${response.statusCode}`));
          return;
        }

        response.pipe(fileStream);

        fileStream.on("finish", () => {
          fileStream.close();
          logger.debug(`File downloaded successfully to ${destPath}`);
          resolve();
        });
      })
      .on("error", (err: Error) => {
        fs.unlink(destPath, () => {});
        logger.error(err, "Error downloading file:");
        reject(err);
      });
  });
}
