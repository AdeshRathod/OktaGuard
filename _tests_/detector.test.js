// __tests__/detector.test.js
const detector = require("../src/services/detector");
const { db, init } = require("../src/storage");

beforeAll(async () => {
  await init();

  // clear DB for tests
  await db.read();
  db.set("alerts", []).write();
  db.set("state", { lastFetchISO: null, userCountries: {}, failedAttempts: {} }).write();
});

test("detect outside business hours", async () => {
  const hour = 3; // 3am UTC
  const ts = new Date();
  ts.setUTCHours(hour, 0, 0, 0);

  const log = {
    published: ts.toISOString(),
    outcome: { result: "SUCCESS" },
    actor: { alternateId: "user@example.com", id: "user123" },
    client: {
      geo: {
        country: "US",
      },
    },
  };

  const alerts = await detector.processLogs([log]);
  const found = alerts.find((a) => a.risk_type === "outside_business_hours");
  expect(found).toBeDefined();
});
