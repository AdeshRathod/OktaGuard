// src/index.js
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const logger = require("./logger");
const config = require("./config");
const { init } = require("./storage");
const routes = require("./routes");
const worker = require("./worker");

async function main() {
  await init();

  const app = express();
  app.use(cors());
  app.use(bodyParser.json());

  // API routes
  app.use("/api", routes);

  // Serve frontend dashboard (if you build one in /public)
  app.use(express.static(path.join(__dirname, "public")));

  const port = config.PORT || 3000;
  app.listen(port, () => {
    logger.info(`OktaGuard running on http://localhost:${port}`);
  });

  // start background worker loop
  worker.startLoop();
}

main().catch((err) => {
  logger.error("Fatal: " + err.message);
  process.exit(1);
});
