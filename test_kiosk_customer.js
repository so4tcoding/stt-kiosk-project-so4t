const assert = require("assert");
const Customer = require("./kiosk_customer.js");

const list = Customer.steps();
assert.ok(list.length >= 25);

function find(text) {
    return list.find(function (step) { return step.text === text; });
}

const hanwoo = find("한우불고기");
assert.strictEqual(hanwoo.intended, "한우 불고기");
assert.strictEqual(hanwoo.expect.stage, "quantity");

const category = find("불고기");
assert.strictEqual(category.expect.notStage, "quantity");

const typo = find("오렌쥐쥬스");
assert.strictEqual(typo.intended, "오렌지 주스");

const weather = find("안녕하세요 날씨 좋네요");
assert.strictEqual(weather.intended, "");
assert.strictEqual(weather.expect.type, "ignore");

assert.strictEqual(Customer.passes(
    { type: "itemStage", item: "한우", stage: "quantity" },
    { stage: "quantity", item: "한우 불고기", grid: "", spoken: "", place: "", count: 0 }
), true);
assert.strictEqual(Customer.passes(
    { type: "category", value: "불고기", notStage: "quantity" },
    { stage: "quantity", item: "한우 불고기", cat: "불고기", grid: "" }
), false);
assert.strictEqual(Customer.passes(
    { type: "ignore" },
    { stage: "menu_grid", item: "" }
), true);
assert.strictEqual(Customer.passes(
    { type: "place", value: "매장" },
    { stage: "summary", place: "매장에서 먹기", spoken: "총 금액은 4000원입니다." }
), true);

const groups = {};
list.forEach(function (step) { groups[step.group] = true; });
["시작", "메뉴", "수량", "단계", "추천", "결제", "용량"].forEach(function (group) {
    assert.ok(groups[group], group);
});

console.log("kiosk customer ok");
