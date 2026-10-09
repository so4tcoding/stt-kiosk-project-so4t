const assert = require("assert");
const Age = require("./kiosk_age_filter.js");

function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

assert.notStrictEqual(Age.seed(0), 24000);
assert.notStrictEqual(Age.seed(3), 24000 + 3 * 131);
assert.notStrictEqual(Age.shopSlot(0), 0);
assert.strictEqual(Age.shopSlot(1), (5 + 2) % 6);

const bot = Age.profile(mulberry32(Age.seed(4)));
assert.ok(bot.hearing >= 0.2 && bot.hearing <= 0.75);
assert.ok(bot.vision >= 0.08 && bot.vision < 0.75);
assert.ok(bot.volume >= 0.1 && bot.volume <= 0.8);
assert.ok(bot.maxChars >= 26 && bot.maxChars <= 54);
assert.ok(bot.comprehension >= 0.12 && bot.comprehension < 0.92);
assert.strictEqual(Age.grasps("주문할게요.", { comprehension: 0.2 }), true);
assert.strictEqual(Age.grasps("돼지국밥, 다음.", { comprehension: 0.2 }), false);
assert.strictEqual(Age.grasps("돼지국밥, 다음.", { comprehension: 0.8 }), true);
assert.strictEqual(Age.grasps("맞으면 결제라고 말씀해 주세요.", { comprehension: 0.2 }), true);
assert.strictEqual(Age.grasps("주문하신 메뉴가 맞는지 지금 바로 확인해 주세요.", { comprehension: 0.2 }), false);

const weak = { hearing: 0.2, volume: 0.12, maxChars: 20 };
assert.strictEqual(Age.understands("주문할게요, 라고 말씀해 주세요.", weak), true);
assert.strictEqual(Age.understands("스몰, 미디엄, 라지 중에서 말씀해 주세요.", weak), false);
assert.strictEqual(Age.understands("가".repeat(40), weak), false);

const goal = { menu: "돼지국밥", count: 2, unit: "개", hot: true, large: true, takeout: false, card: true };
const welcome = Age.dialect(goal, "welcome", function () { return 0.1; });
assert.ok(welcome === "주문할라요" || welcome === "밥 묵을라요");
assert.strictEqual(Age.dialect(goal, "temp", function () { return 0.1; }), "뜨신 거로");
assert.strictEqual(Age.dialect(goal, "place", function () { return 0.1; }), "묵고 갈게요");

console.log("kiosk age filter tests passed");
