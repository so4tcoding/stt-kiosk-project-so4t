const assert = require("assert");
const Talk = require("./kiosk_talk.js");

const menus = [
    { name: "돼지국밥", price: 9000 },
    { name: "아메리카노", price: 3500 },
    { name: "치즈 케이크", price: 5500 }
];

function say(text, ctx) {
    return Talk.resolveSpeak(text, Object.assign({ menus: menus, stage: "welcome" }, ctx || {}));
}

const welcome = Talk.lines[0].default;
assert.strictEqual(say("메뉴 이름을 말씀해 주세요.", { stage: "welcome" }), welcome);
assert.strictEqual(say("메뉴 이름을 말씀해 주세요.", { stage: "menu_grid" }), "메뉴 이름을 말씀해 주세요.");
assert.ok(say("고객님, 반갑습니다! 주문을 시작하시려면 네, 키오스크 사용법이 궁금하시면 사용법 알려줘 라고 말씀해주세요.").indexOf("첫 주문") === 0);
assert.strictEqual(
    say("알겠습니다. 다시 메뉴를 골라주세요.", { stage: "menu_grid" }),
    "알겠습니다. 다시 메뉴를 골라주세요."
);
assert.strictEqual(say("네, 소리를 3단계로 올렸습니다."), "네, 소리를 3단계로 올렸습니다.");
assert.ok(say("네, 감사합니다.").indexOf("맛있게 드세요") === -1);

assert.strictEqual(
    say("저희 매장에는 국밥, 커피 카테고리가 있습니다. 무엇을 드시겠습니까?"),
    "저희 매장에는 국밥, 커피 카테고리가 있습니다. 무엇을 드시겠습니까?"
);
assert.ok(say("현재 메뉴 종류는 국밥, 음료 입니다. 원하시는 카테고리를 말씀해주세요.").indexOf("국밥, 음료") !== -1);

assert.ok(say("돼지국밥 9,000원, 순대국밥 8,000원 등이 있습니다. 어떤 메뉴를 주문하시겠습니까?").indexOf("돼지국밥") === 0);
assert.ok(say("돼지국밥 9,000원 등이 있습니다. 추가하실 메뉴 이름을 말씀해주세요. 더 없으면 결제라고 말씀해주세요.").indexOf("어떤 메뉴를 추가") === 0);

assert.strictEqual(
    say("선택하신 게 아메리카노 맞습니까? 맞으면 네, 틀리면 아니요 라고 대답해주세요."),
    "선택하신 게 아메리카노 맞습니까? 맞으면 네, 틀리면 아니요 라고 대답해주세요."
);
assert.ok(say("주문하신 메뉴는 콜라 1개입니다. 총 금액은 2000원입니다. 맞으시면 결제라고 말씀해주세요.").indexOf("2000원") !== -1);
assert.strictEqual(say("감사합니다. 맛있게 드세요."), Talk.lines[21].default);
assert.ok(say("다른 꽃이 있으면 네, 없으면 아니요 라고 말씀해 주세요.").indexOf("추가하실 메뉴가 있습니까") === 0);

const customWelcome = say("메뉴 이름을 말씀해 주세요.", {
    stage: "welcome",
    saved: function (id) { return id === "tts_welcome" ? "어서 오세요. {0}" : ""; }
});
assert.strictEqual(customWelcome, "어서 오세요. {0}");

assert.ok(say("골라 주세요. 달콤, 상큼, 구수, 고소, 얼큰, 짭짤입니다.").indexOf("돼지국밥") !== -1);
assert.ok(say("골라 주세요. 달콤, 상큼, 구수, 고소, 얼큰, 짭짤입니다.").indexOf("아메리카노") !== -1);

function kind(text) {
    return Talk.judge(text, menus).kind;
}

assert.strictEqual(kind("돼지국밥 하나"), "order");
assert.strictEqual(kind("아메리카노 주세요"), "order");
assert.strictEqual(kind("포장해서 가져갈게요"), "order");
assert.strictEqual(kind("카드로 할게요"), "order");
assert.strictEqual(kind("네"), "order");
assert.strictEqual(kind("추천해줘"), "order");
assert.strictEqual(kind("아무거나"), "order");
assert.strictEqual(kind("사용법 알려줘"), "order");
assert.strictEqual(kind("안 보여"), "order");
assert.strictEqual(kind("우리 돼지국밥 하나 주세요"), "order");

assert.strictEqual(kind("야 너 밥 먹었어?"), "chat");
assert.strictEqual(kind("우리 영화 보러 갈까"), "chat");
assert.strictEqual(kind("엄마 아까 그 영화 재밌었지"), "chat");
assert.strictEqual(kind("ㅋㅋㅋ 대박"), "chat");
assert.strictEqual(kind("음"), "chat");
assert.strictEqual(kind("너 아메리카노 먹을래"), "chat");
assert.strictEqual(kind(""), "pass");

assert.strictEqual(Talk.expand("주문할게요", "welcome", menus), "주문 시작");
assert.strictEqual(Talk.expand("가져갈게요", "place", menus), "포장");
assert.strictEqual(Talk.expand("먹고 갈게요", "place", menus), "매장");
assert.strictEqual(Talk.expand("카드로 할게요", "payment", menus), "카드");
assert.strictEqual(Talk.expand("그란데", "cup_size", menus), "큰 잔");
assert.strictEqual(Talk.expand("두 잔이요", "quantity", menus), "두 개");
assert.strictEqual(Talk.expand("아메리카노 두 잔", "quantity", menus), "아메리카노 두 잔");
assert.strictEqual(Talk.expand("아아", "menu_grid", menus), "아이스 아메리카노");
assert.strictEqual(Talk.expand("아무거나요", "category_select", menus), "추천해줘");
assert.strictEqual(Talk.expand("그래요", "menu_confirm", menus), "네");
assert.strictEqual(Talk.expand("핫으로 주세요", "temp", menus), "따뜻하게");

const started = Date.now();
const samples = [
    "돼지국밥 하나", "야 영화 보러 갈까", "카드로 할게요", "ㅋㅋ", "아메리카노 주세요",
    "우리 뭐 먹을까", "포장", "네", "학교 가야 해", "추천해줘"
];
for (let i = 0; i < 2000; i++) {
    Talk.judge(samples[i % samples.length], menus);
}
const elapsed = Date.now() - started;
assert.ok(elapsed < 250, "판별이 너무 느립니다: " + elapsed + "ms");

console.log("kiosk_talk tests passed in " + elapsed + "ms for 2000 judgments");
