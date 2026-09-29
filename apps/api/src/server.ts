import { buildApi } from "./app.js";

const host = process.env.MERCATURA_API_HOST ?? "127.0.0.1";
const port = Number(process.env.MERCATURA_API_PORT ?? "3001");

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid MERCATURA_API_PORT: ${process.env.MERCATURA_API_PORT ?? "3001"}`);
}

const app = buildApi({ logger: true });

try {
  await app.listen({
    host,
    port,
  });
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exitCode = 1;
}
