const assert = require("assert");
const Metrics = require("./kiosk_use_metrics.js");

assert.strictEqual(Metrics.judgeUse(
    { stage: "welcome", item: "", count: 0, sugar: null, step: 0, place: "", cart: "", spoken: "" },
    { stage: "open_order_prompt", item: "", count: 0, sugar: null, step: 0, place: "", cart: "", spoken: "무엇을 드시고 싶으신가요?" }
), "success");

assert.strictEqual(Metrics.judgeUse(
    { stage: "welcome", item: "", count: 0, sugar: null, step: 0, place: "", cart: "", spoken: "" },
    { stage: "welcome", item: "", count: 0, sugar: null, step: 0, place: "", cart: "", spoken: "" }
), "failure");

assert.strictEqual(Metrics.judgeUse(
    { stage: "menu_grid", item: "", count: 0, sugar: null, step: 0, place: "", cart: "", spoken: "" },
    { stage: "menu_grid", item: "", count: 0, sugar: null, step: 0, place: "", cart: "", spoken: "다시 한 번 말씀해주세요." }
), "failure");

assert.strictEqual(Metrics.judgeUse(
    { stage: "menu_grid", item: "", count: 0, sugar: null, step: 0, place: "", cart: "", spoken: "" },
    { stage: "menu_grid", item: "", count: 0, sugar: null, step: 0, place: "", cart: "", spoken: "이 화면의 메뉴는 오렌지 주스입니다." }
), "success");

const store = {};
assert.strictEqual(Metrics.rememberAlias(store, "주문할래요", "네"), true);
assert.strictEqual(Metrics.resolveAlias(store, "주문 할래요"), "네");
assert.strictEqual(Metrics.rememberAlias(store, "네", "시작"), false);
assert.strictEqual(Metrics.rememberAlias(store, "ㅋ", "오렌지 주스"), false);
assert.strictEqual(Metrics.rememberAlias(store, "두잔", "두 개"), true);
assert.strictEqual(Metrics.resolveAlias(store, "두잔"), "두 개");

const summary = Metrics.summarize([
    { kind: "use", outcome: "success", text: "네" },
    { kind: "use", outcome: "success", text: "오렌지 주스" },
    { kind: "use", outcome: "failure", text: "주문할래요" },
    { kind: "learn", outcome: "success", text: "오렌쥐쥬스", canonical: "오렌지 주스" },
    { kind: "learn", outcome: "loss", text: "날씨좋네", canonical: "오렌지 주스" },
    { kind: "learn", outcome: "success", text: "오렌쥐쥬스", canonical: "오렌지 주스" }
]);
assert.strictEqual(summary.useTotal, 3);
assert.strictEqual(summary.success, 2);
assert.strictEqual(summary.failure, 1);
assert.strictEqual(summary.successRate, 66.7);
assert.strictEqual(summary.failureRate, 33.3);
assert.strictEqual(summary.learnSuccess, 2);
assert.strictEqual(summary.learnLoss, 1);
assert.strictEqual(summary.learnSuccessRate, 66.7);
assert.strictEqual(summary.lossRate, 33.3);
assert.strictEqual(summary.learnedWords.length, 1);
assert.strictEqual(summary.learnedWords[0].text, "오렌쥐쥬스");

console.log("kiosk use metrics ok");
