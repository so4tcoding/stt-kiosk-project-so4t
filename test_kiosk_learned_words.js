const assert = require("assert");
const Customer = require("./kiosk_customer.js");
const words = require("./kiosk_learned_words.js");

const notKiosk = new Set(["안녕하세요 날씨 좋네요"]);
const seen = new Map();
let visited = 0;
Customer.steps().forEach(function (step) {
    if (!step) return;
    visited += 1;
    const heard = String(step.text || "").trim();
    const target = String(step.intended || heard).trim();
    if (!heard || !target || seen.has(heard) || notKiosk.has(heard)) return;
    seen.set(heard, target);
});

assert.strictEqual(visited, 1311);
assert.strictEqual(words.length, seen.size);
words.forEach(function (row) {
    assert.strictEqual(seen.get(row[0]), row[1]);
});
seen.forEach(function (target, heard) {
    assert.ok(words.some(function (row) { return row[0] === heard && row[1] === target; }), heard);
});

global.window = {};
delete require.cache[require.resolve("./kiosk_learned_words.js")];
require("./kiosk_learned_words.js");
assert.strictEqual(window.__kioskTrainedTarget("오렌쥐쥬스"), "오렌지 주스");
assert.strictEqual(window.__kioskTrainedTarget("라지"), "라지");
assert.strictEqual(window.__kioskTrainedTarget("세트로 주세요"), "세트");
assert.strictEqual(window.__kioskTrainedHit("추천해줘"), true);
assert.strictEqual(window.__kioskTrainedTarget("안녕하세요 날씨 좋네요"), "");
assert.strictEqual(window.__kioskTrainedHit("안녕하세요 날씨 좋네요"), false);

console.log("kiosk learned words ok");
