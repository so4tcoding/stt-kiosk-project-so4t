const assert = require("assert");
const Talk = require("./kiosk_talk.js");

const shop = Talk.talkLine("무슨 가게인가요? 국밥집, 카페, 햄버거집, 꽃집, 문구점, 선물가게 중에서 말씀해 주세요.");
assert.ok(shop.startsWith("안녕하세요."));
assert.ok(shop.includes("꽃집"));
assert.ok(shop.includes("말씀해 주세요"));

assert.strictEqual(
    Talk.talkLine("메뉴 수량을 말씀해주세요.", "돼지국밥", ""),
    "돼지국밥이요. 몇 그릇 드릴까요."
);
assert.strictEqual(
    Talk.talkLine("몇 잔인지 말씀해 주세요.", "초코 케이크", "잔"),
    "초코 케이크요. 몇 잔 드릴까요."
);
assert.strictEqual(
    Talk.talkLine("몇 개인지 말씀해 주세요.", "꽃다발", "개"),
    "꽃다발이요. 몇 개 드릴까요."
);
assert.strictEqual(
    Talk.talkLine("메뉴 수량을 말씀해주세요.", "네", ""),
    "몇 그릇 드릴까요."
);

const cup = Talk.talkLine("작은 잔, 중간 잔, 큰 잔 중에서 말씀해 주세요.");
assert.ok(cup.includes("작은 잔, 중간 잔, 큰 잔"));

const taste = Talk.talkLine("골라 주세요. 달콤, 상큼, 구수, 고소, 얼큰, 짭짤입니다. 오늘의 추천 메뉴는 돼지국밥이고, 제일 맛있는 메뉴는 한우 불고기입니다.");
assert.ok(taste.startsWith("어떤 맛이 좋으세요."));
assert.ok(taste.includes("달콤"));
assert.ok(taste.includes("돼지국밥"));

assert.ok(Talk.talkLine("세트로 하시려면 세트, 햄버거만이면 단품이라고 말씀해 주세요.").includes("단품"));
assert.ok(Talk.talkLine("추가하실 메뉴가 있습니까. 있으면 네, 없으면 아니요 라고 말씀해주세요.").includes("네"));
assert.ok(Talk.talkLine("다른 꽃이 있으면 네, 없으면 아니요 라고 말씀해 주세요.").includes("꽃"));

const place = Talk.talkLine("여기서 드시고 가시나요, 아니면 포장해서 들고 가시나요?");
assert.ok(place.includes("포장"));
assert.ok(place.includes("먹을게요"));

const pay = Talk.talkLine("카드로 결제 하실려면 네, 현금으로 결제하실려면 아니요 라고 말씀해주세요.");
assert.ok(pay.includes("카드"));
assert.ok(pay.includes("현금"));

assert.strictEqual(
    Talk.talkLine("주문하신 총 금액은 12,000원입니다. 맞으시면 결제라고 말씀해주세요."),
    "다 고르셨어요. 총 12,000원입니다. 맞으면 결제, 라고 말씀해 주세요."
);
assert.ok(Talk.talkLine("쉽게 설명해드릴게요. 주문은 메뉴 이름으로 합니다.").startsWith("쉽게 말씀드릴게요."));
assert.ok(Talk.talkLine("그 메뉴는 없습니다. 커피, 음료 중에서 말씀해 주세요.").startsWith("아, 그 메뉴는 없습니다."));
assert.ok(Talk.talkLine("그 단어만으로는 모르겠습니다. 메뉴 이름을 말씀해 주세요.").includes("이름"));
assert.strictEqual(Talk.talkLine("화면을 확대했습니다."), "네, 화면을 확대했습니다.");
assert.strictEqual(Talk.talkLine("화면을 줄였습니다."), "네, 화면을 줄였습니다.");
assert.ok(Talk.talkLine("화면을 원래대로 돌렸습니다.").includes("원래"));
assert.strictEqual(Talk.talkLine("비밀번호를 말씀해주세요."), "비밀번호를 말씀해주세요.");
assert.strictEqual(Talk.talkLine("주문 내역입니다."), "주문 내역입니다.");

console.log("kiosk talk tests passed");
