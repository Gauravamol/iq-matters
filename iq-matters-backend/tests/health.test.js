const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createExpressApp } = require("../src/app");

test("health endpoint reports ok without bootstrapping the database", async () => {
  const app = createExpressApp();

  const response = await request(app).get("/health").expect(200);

  assert.deepEqual(response.body, { status: "ok" });
});

test("root endpoint identifies the API", async () => {
  const app = createExpressApp();

  const response = await request(app).get("/").expect(200);

  assert.equal(response.body.message, "IQ Matters API running");
});
