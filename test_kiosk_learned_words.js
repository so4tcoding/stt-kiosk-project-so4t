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
assert.ok(words.length > seen.size);
const byHeard = new Map();
words.forEach(function (row) {
    if (!byHeard.has(row[0])) byHeard.set(row[0], row[1]);
});
seen.forEach(function (target, heard) {
    assert.strictEqual(byHeard.get(heard), target, heard);
});

global.window = {};
delete require.cache[require.resolve("./kiosk_learned_words.js")];
require("./kiosk_learned_words.js");
assert.strictEqual(window.__kioskTrainedTarget("오렌쥐쥬스"), "오렌지 주스");
assert.strictEqual(window.__kioskTrainedTarget("라지"), "라지");
assert.strictEqual(window.__kioskTrainedTarget("세트로 주세요"), "세트");
assert.strictEqual(window.__kioskTrainedHit("추천해줘"), true);
assert.strictEqual(window.__kioskTrainedTarget("돼지국밥 주세요"), "돼지국밥");
assert.strictEqual(window.__kioskTrainedTarget("여섯 잔 주세요"), "여섯 개");
assert.strictEqual(window.__kioskTrainedTarget("오랜지쥬스"), "오렌지 주스");
assert.strictEqual(window.__kioskTrainedTarget("장미 한송이"), "장미 한 송이");
assert.strictEqual(window.__kioskTrainedTarget("카드루 하소"), "카드");
assert.strictEqual(window.__kioskTrainedTarget("작은 컵"), "스몰");
assert.strictEqual(words.length, 4869);
assert.strictEqual(window.__kioskTrainedTarget("안녕하세요 날씨 좋네요"), "");
assert.strictEqual(window.__kioskTrainedHit("안녕하세요 날씨 좋네요"), false);
assert.strictEqual(window.__kioskTrainedTarget("결제"), "아니요");
assert.strictEqual(window.__kioskTrainedTarget("계산이요"), "아니요");
global.currentStageName = "summary";
assert.strictEqual(window.__kioskTrainedTarget("결제"), "결제");
assert.strictEqual(window.__kioskTrainedTarget("계산이요"), "결제");
global.currentStageName = "payment";
assert.strictEqual(window.__kioskTrainedTarget("카드로 계산"), "카드");
global.currentStageName = "";
assert.strictEqual(window.__kioskTrainedTarget("결제"), "아니요");

console.log("kiosk learned words ok");
