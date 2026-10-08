const assert = require("assert");
const Talk = require("./kiosk_talk.js");

function sentences(text) {
    return String(text).split(/[.?!]/).filter(function (part) { return part.trim(); }).length;
}

function heardOk(text) {
    assert.ok(text.length <= 46, text + " length " + text.length);
    assert.ok(sentences(text) < 3, text);
    assert.ok(!/스몰|미디엄|라지|카테고리|밀리리터/.test(text), text);
}

const shop = Talk.talkLine("무슨 가게인가요? 국밥집, 카페, 햄버거집, 꽃집, 문구점, 선물가게 중에서 말씀해 주세요.");
assert.ok(shop.includes("꽃집"));
assert.ok(shop.includes("선물가게"));
heardOk(shop);

assert.strictEqual(
    Talk.talkLine("메뉴 수량을 말씀해주세요.", "돼지국밥", ""),
    "몇 그릇 드릴까요."
);
assert.strictEqual(
    Talk.talkLine("몇 잔인지 말씀해 주세요.", "초코 케이크", "잔"),
    "몇 잔 드릴까요."
);
assert.strictEqual(
    Talk.talkLine("몇 개인지 말씀해 주세요.", "꽃다발", "개"),
    "몇 개 드릴까요."
);
assert.strictEqual(
    Talk.talkLine("메뉴 수량을 말씀해주세요.", "네", ""),
    "몇 그릇 드릴까요."
);

const cup = Talk.talkLine("작은 잔, 중간 잔, 큰 잔 중에서 말씀해 주세요.");
assert.strictEqual(cup, "작은 잔, 중간 잔, 큰 잔.");
assert.strictEqual(
    Talk.talkLine("컵 사이즈를 스몰, 미디엄, 라지 중에서 말씀해 주세요."),
    "작은 잔, 중간 잔, 큰 잔."
);

const taste = Talk.talkLine("골라 주세요. 달콤, 상큼, 구수, 고소, 얼큰, 짭짤입니다. 오늘의 추천 메뉴는 돼지국밥이고, 제일 맛있는 메뉴는 한우 불고기입니다.");
assert.strictEqual(taste, "달콤, 짭짤, 얼큰.");

assert.strictEqual(Talk.talkLine("세트로 하시려면 세트, 햄버거만이면 단품이라고 말씀해 주세요."), "세트요, 단품이요.");
assert.strictEqual(Talk.talkLine("추가하실 메뉴가 있습니까. 있으면 네, 없으면 아니요 라고 말씀해주세요."), "더 있으면 네, 없으면 아니요.");
assert.strictEqual(Talk.talkLine("다른 꽃이 있으면 네, 없으면 아니요 라고 말씀해 주세요."), "더 있으면 네, 없으면 아니요.");

const place = Talk.talkLine("여기서 드시고 가시나요, 아니면 포장해서 들고 가시나요? 여기서 먹을래요, 또는 들고 갈래요 라고 말씀해주세요.");
assert.ok(place.includes("포장"));
assert.ok(place.includes("먹을게요"));

const pay = Talk.talkLine("카드로 결제 하실려면 네, 현금으로 결제하실려면 아니요 라고 말씀해주세요.");
assert.ok(pay.includes("카드"));
assert.ok(pay.includes("현금"));

assert.strictEqual(
    Talk.talkLine("주문하신 총 금액은 12,000원입니다. 맞으시면 결제라고 말씀해주세요."),
    "맞으면 결제라고 말씀해 주세요."
);
assert.strictEqual(
    Talk.talkLine("주문하신 메뉴는 돼지국밥 1개입니다. 총 금액은 8000원입니다. 맞으시면 결제라고 말씀해주세요."),
    "맞으면 결제라고 말씀해 주세요."
);
assert.strictEqual(
    Talk.talkLine("포장으로 선택하셨습니다. 주문하신 메뉴는 돼지국밥 1개입니다. 총 금액은 9000원입니다. 맞으시면 결제라고 말씀해주세요."),
    "맞으면 결제라고 말씀해 주세요."
);
assert.strictEqual(
    Talk.talkLine("매장에서 드시기를 선택했습니다. 주문하신 메뉴는 오렌지 주스 1개입니다. 총 금액은 4000원입니다. 맞으시면 결제라고 말씀해주세요."),
    "맞으면 결제라고 말씀해 주세요."
);
const menuList = "딸기 라떼 4800원, 오렌지 주스 4000원 등이 있습니다. 어떤 메뉴를 주문하시겠습니까?";
assert.strictEqual(Talk.talkLine(menuList), menuList);
const addonBoard = "추가 메뉴입니다. 국밥, 불고기, 햄버거, 커피, 음료, 디저트 입니다. 원하시는 메뉴를 말씀해 주세요.";
assert.strictEqual(Talk.talkLine(addonBoard), addonBoard);
assert.strictEqual(
    Talk.talkLine("저희 매장에는 국밥, 불고기 카테고리가 있습니다. 무엇을 드시겠습니까?"),
    "메뉴 이름을 말씀해 주세요."
);
assert.strictEqual(Talk.talkLine("쉽게 설명해드릴게요. 주문은 메뉴 이름으로 합니다."), "메뉴 이름을 말씀해 주세요.");
assert.strictEqual(Talk.talkLine("그 메뉴는 없습니다. 커피, 음료 중에서 말씀해 주세요."), "그 메뉴는 없습니다.");
assert.ok(Talk.talkLine("그 단어만으로는 모르겠습니다. 메뉴 이름을 말씀해 주세요.").includes("이름"));
assert.strictEqual(Talk.talkLine("화면을 확대했습니다."), "네, 화면을 확대했습니다.");
assert.strictEqual(Talk.talkLine("화면을 줄였습니다."), "네, 화면을 줄였습니다.");
assert.ok(Talk.talkLine("화면을 원래대로 돌렸습니다.").includes("원래"));
assert.strictEqual(Talk.talkLine("비밀번호를 말씀해주세요."), "비밀번호를 말씀해주세요.");
assert.strictEqual(Talk.talkLine("주문 내역입니다."), "주문 내역입니다.");
assert.strictEqual(Talk.talkLine("커피 샷 추가, 시럽, 얼음 양을 조절하고 싶으시다면 네, 추가할 게 없으시다면 아니요라고 해주세요."), "없으면 아니요.");

[
    "고객님, 반갑습니다! 주문을 시작하시려면 네, 키오스크 사용법이 궁금하시면 사용법 알려줘 라고 말씀해주세요.",
    "무엇을 드시고 싶으세요? 메뉴를 아시면 이름을 말씀해 주세요.",
    "따뜻한 것과 아이스 중에서 말씀해 주세요.",
    "기기 아래쪽에 결제 수단을 투입해 주세요."
].forEach(function (line) {
    heardOk(Talk.talkLine(line));
});

console.log("kiosk talk tests passed");
