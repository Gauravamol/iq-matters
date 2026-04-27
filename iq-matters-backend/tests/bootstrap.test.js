const test = require("node:test");
const assert = require("node:assert/strict");
const { bootstrapDatabase } = require("../src/db/bootstrap");

test("bootstrap skips matches migration when the matches table is absent", async () => {
  const queries = [];
  let released = false;
  const connection = {
    async query(sql) {
      const normalizedSql = String(sql).replace(/\s+/g, " ").trim();
      queries.push(normalizedSql);

      if (normalizedSql.includes("information_schema.tables")) {
        return [[]];
      }

      if (normalizedSql.includes("information_schema.columns")) {
        return [[]];
      }

      if (normalizedSql === "SELECT id FROM leaderboard_settings LIMIT 1") {
        return [[{ id: 1 }]];
      }

      return [[]];
    },
    release() {
      released = true;
    }
  };

  await bootstrapDatabase({
    getConnection: async () => connection
  });

  assert.equal(released, true);
  assert.equal(queries.some((query) => query.includes("ALTER TABLE matches")), false);
});
