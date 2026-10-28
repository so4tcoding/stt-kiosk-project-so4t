const assert = require("assert");
const KioskTalk = require("./kiosk_talk.js");

const MENUS = [
    { name: "돼지국밥", price: 9000, category: "국밥" },
    { name: "치즈버거", price: 6900, category: "햄버거" },
    { name: "아메리카노", price: 3500, category: "커피" },
    { name: "카페라떼", price: 4300, category: "커피" },
    { name: "오렌지 주스", price: 4000, category: "음료" },
    { name: "소프트 아이스크림", price: 3000, category: "디저트" }
];

const SAMPLES = {
    tts_cat: ["국밥, 햄버거, 커피"],
    tts_grid: ["치즈버거 6,900원, 불고기버거 7,400원"],
    tts_taste: ["치즈버거", "오렌지 주스"],
    tts_confirm: ["치즈버거"],
    tts_bev_prompt: ["얼음, 당도, 과일 토핑"],
    tts_bev_step: ["샷"],
    tts_summary: ["9,000"]
};

function fill(template, vars) {
    let text = template;
    (vars || []).forEach((value, index) => {
        text = text.split("{" + index + "}").join(value);
    });
    return text;
}

function memoryStorage(initial) {
    const data = Object.assign({}, initial || {});
    return {
        getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
        setItem(key, value) { data[key] = String(value); }
    };
}

const ctx = {
    menus: MENUS,
    categories: ["국밥", "햄버거", "커피"],
    grid: [
        { name: "치즈버거", price: 6900 },
        { name: "불고기버거", price: 7400 }
    ],
    pendingMenuName: "치즈버거",
    optionName: "샷",
    optionKind: "other",
    optionLabel: "얼음, 당도, 과일 토핑",
    orderSum: "9,000",
    tastePair: ["치즈버거", "오렌지 주스"]
};

assert.strictEqual(KioskTalk.lines.length, 22);

KioskTalk.lines.forEach((line) => {
    const spoken = fill(line.default, SAMPLES[line.id] || []);
    const resolved = KioskTalk.resolveSpeak(spoken, ctx);
    assert.strictEqual(resolved, spoken, line.id + " default should be spoken");
    assert.strictEqual(KioskTalk.resolveSpeak(resolved, ctx), resolved, line.id + " should stay stable");
});

const storage = memoryStorage({ tts_qty: "몇 개 드릴까요?" });
assert.strictEqual(
    KioskTalk.resolveSpeak("메뉴 이름이나 위치를 다시 말씀해주세요.", { storage }),
    "메뉴 이름이나 위치를 다시 말씀해주세요."
);
assert.strictEqual(
    KioskTalk.resolveSpeak("메뉴 수량을 말씀해주세요.", { storage }),
    "몇 개 드릴까요?"
);
assert.strictEqual(
    KioskTalk.resolveSpeak("알겠습니다. 다시 메뉴를 골라주세요.", { storage }),
    "알겠습니다. 다시 메뉴를 골라주세요."
);
assert.strictEqual(
    KioskTalk.resolveSpeak("네, 감사합니다.", { storage: memoryStorage({ tts_done: "또 오세요." }) }),
    "네, 감사합니다."
);
assert.strictEqual(
    KioskTalk.resolveSpeak("감사합니다. 맛있게 드세요.", { storage: memoryStorage({ tts_done: "또 오세요." }) }),
    "또 오세요."
);

assert.strictEqual(
    KioskTalk.resolveSpeak("맞으면 '맞아'라고 말씀해주세요. 틀리면 '아니야'라고 말씀해주세요.", ctx),
    "선택하신 게 치즈버거 맞습니까? 맞으면 네, 틀리면 아니요 라고 대답해주세요."
);
assert.strictEqual(
    KioskTalk.resolveSpeak("따뜻하게 드시면 '따뜻하게', 차갑게 드시면 '아이스'라고 말씀해주세요.", ctx),
    KioskTalk.lines.find((line) => line.id === "tts_temp").default
);
assert.strictEqual(
    KioskTalk.resolveSpeak("세트로 하시려면 '세트', 햄버거만 드시려면 '단품'이라고 말씀해주세요.", ctx),
    KioskTalk.lines.find((line) => line.id === "tts_upsell").default
);
assert.strictEqual(
    KioskTalk.resolveSpeak("결제 방식은 '카드' 또는 '현금'이라고 말씀해주세요.", ctx),
    KioskTalk.lines.find((line) => line.id === "tts_payment").default
);
assert.strictEqual(
    KioskTalk.resolveSpeak("결제하시려면 '결제'라고 말씀해주세요. 바꾸고 싶으면 '이전 화면'이라고 말씀해주세요.", ctx),
    "주문하신 총 금액은 9,000원입니다. 맞으시면 결제라고 말씀해주세요."
);
assert.strictEqual(
    KioskTalk.resolveSpeak(KioskTalk.legacyGuide, ctx),
    KioskTalk.lines.find((line) => line.id === "tts_guide").default
);
assert.strictEqual(
    KioskTalk.resolveSpeak("고객님, 반갑습니다! 주문을 시작하시려면 네, 키오스크 사용법이 궁금하시면 사용법 알려줘 라고 말씀해주세요.", ctx),
    KioskTalk.lines.find((line) => line.id === "tts_welcome").default
);
assert.strictEqual(
    KioskTalk.resolveSpeak("옵션을 조절하시려면 '조절하기', 그냥 주문하시려면 '그냥 주문'이라고 말씀해주세요.", Object.assign({}, ctx, { optionKind: "coffee" })),
    KioskTalk.lines.find((line) => line.id === "tts_bev_prompt2").default
);

const customConfirm = memoryStorage({ tts_confirm: "고객님, {0} 맞으세요?" });
assert.strictEqual(
    KioskTalk.resolveSpeak("선택하신 게 치즈버거 맞습니까? 맞으면 네, 틀리면 아니요 라고 대답해주세요.", { storage: customConfirm, pendingMenuName: "치즈버거" }),
    "고객님, 치즈버거 맞으세요?"
);
assert.strictEqual(
    KioskTalk.resolveSpeak("고객님, 치즈버거 맞으세요?", { storage: customConfirm, pendingMenuName: "치즈버거" }),
    "고객님, 치즈버거 맞으세요?"
);

assert.strictEqual(KioskTalk.judge("야 너 돼지국밥 먹을까"), "chatter");
assert.strictEqual(KioskTalk.judge("오늘 날씨가 너무 더워서 집에 가고 싶다"), "chatter");
assert.strictEqual(KioskTalk.judge("카드게임 할래"), "chatter");
assert.strictEqual(KioskTalk.judge("어"), "chatter");
assert.strictEqual(KioskTalk.judge("네"), "order");
assert.strictEqual(KioskTalk.judge("계산할게"), "order");
assert.strictEqual(KioskTalk.judge("돼지국밥 두 그릇이랑 아메리카노 아이스로 포장하고 카드 결제할게", ctx), "order");
assert.strictEqual(KioskTalk.judge("아아 한잔", ctx), "order");
assert.strictEqual(KioskTalk.judge("사장님 추천"), "order");
assert.strictEqual(KioskTalk.judge("소리 키워줘"), "order");

assert.strictEqual(KioskTalk.expand("계산할게"), "결제");
assert.strictEqual(KioskTalk.expand("아아 한잔"), "아이스 아메리카노 한개");
assert.strictEqual(KioskTalk.expand("돼지국바 두 그릇"), "돼지국밥 두개");
assert.strictEqual(KioskTalk.expand("소프트 아이스크림 하나", ctx), "소프트 아이스크림 하나");
assert.strictEqual(KioskTalk.expand("아메리카노 주세요", ctx), "아메리카노 주세요");
assert.strictEqual(KioskTalk.expand("오케이"), "네");

const started = Date.now();
for (let i = 0; i < 3000; i++) {
    KioskTalk.judge(i % 2 ? "야 오늘 영화 볼까 심심하다" : "아메리카노 아이스 한잔 포장 카드로 결제할게", ctx);
}
const elapsed = Date.now() - started;
assert.ok(elapsed < 500, "judge should stay fast, took " + elapsed + "ms");

console.log("kiosk_talk tests passed in " + elapsed + "ms for 3000 judgments");
