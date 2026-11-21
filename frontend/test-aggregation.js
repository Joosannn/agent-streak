// Tests for the pure leaderboard logic in app.js (no browser, no wallet).
// Run: node --test frontend/test-aggregation.js
// (app.js guards all DOM/wallet code behind typeof window, so requiring it
// in Node only loads the pure functions.)

const test = require("node:test");
const assert = require("node:assert/strict");
const { aggregateLeaderboard, recentCheckIns, displayHandle, utcDayNumber } =
  require("./app.js");

const A = "0x1111111111111111111111111111111111111111";
const B = "0x2222222222222222222222222222222222222222";
const C = "0x3333333333333333333333333333333333333333";

function ev(player, handle, day, streak, blockNumber = day) {
  return { player, handle, day, streak, blockNumber };
}

test("single player builds a streak across days", () => {
  const rows = aggregateLeaderboard([
    ev(A, "arzen", 20400, 1),
    ev(A, "arzen", 20401, 2),
    ev(A, "arzen", 20402, 3),
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].handle, "arzen");
  assert.equal(rows[0].streak, 3);
  assert.equal(rows[0].total, 3);
  assert.equal(rows[0].lastDay, 20402);
});

test("streak reset after a missed day keeps latest streak, totals accumulate", () => {
  const rows = aggregateLeaderboard([
    ev(A, "arzen", 20400, 1),
    ev(A, "arzen", 20401, 2),
    ev(A, "arzen", 20403, 1), // missed day 20402 -> streak resets to 1
  ]);
  assert.equal(rows[0].streak, 1);
  assert.equal(rows[0].total, 3);
  assert.equal(rows[0].lastDay, 20403);
});

test("ranking: streak first, then total check-ins", () => {
  const rows = aggregateLeaderboard([
    ev(A, "alice", 20400, 1),
    ev(A, "alice", 20401, 2),
    ev(B, "bob", 20400, 1),
    ev(B, "bob", 20401, 2),
    ev(B, "bob", 20402, 3),
    ev(B, "bob", 20403, 1), // bob resets to streak 1, but has 4 total
    ev(C, "carol", 20400, 1),
    ev(C, "carol", 20401, 2), // carol streak 2, total 2
  ]);
  // alice streak 2 total 2, bob streak 1 total 4, carol streak 2 total 2.
  // Order: alice/carol (streak 2) before bob (streak 1); alice vs carol
  // tie on streak+total -> alphabetical handle.
  assert.deepEqual(rows.map((r) => r.handle), ["alice", "carol", "bob"]);
  assert.equal(rows[2].total, 4);
});

test("same address with different case merges into one row", () => {
  const rows = aggregateLeaderboard([
    ev(A, "arzen", 20400, 1),
    ev(A.toUpperCase(), "arzen", 20401, 2),
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].total, 2);
  assert.equal(rows[0].streak, 2);
});

test("limit caps the leaderboard at 10", () => {
  const events = [];
  for (let i = 0; i < 15; i++) {
    events.push(ev(`0x${String(i + 1).padStart(40, "0")}`, `user${i}`, 20400, 1));
  }
  assert.equal(aggregateLeaderboard(events).length, 10);
  assert.equal(aggregateLeaderboard(events, 3).length, 3);
});

test("empty events -> empty leaderboard", () => {
  assert.deepEqual(aggregateLeaderboard([]), []);
});

test("recentCheckIns returns newest first, capped", () => {
  const events = [ev(A, "arzen", 20400, 1), ev(B, "bob", 20401, 1), ev(C, "carol", 20402, 1)];
  const recent = recentCheckIns(events, 2);
  assert.deepEqual(recent.map((e) => e.handle), ["carol", "bob"]);
});

test("displayHandle appends .ai only when missing", () => {
  assert.equal(displayHandle("arzen"), "arzen.ai");
  assert.equal(displayHandle("arzen.ai"), "arzen.ai");
  assert.equal(displayHandle(""), "—");
  assert.equal(displayHandle(null), "—");
});

test("utcDayNumber matches floor(unix / 86400)", () => {
  const d = new Date("2026-11-19T00:00:00Z");
  assert.equal(utcDayNumber(d), Math.floor(d.getTime() / 1000 / 86400));
});
