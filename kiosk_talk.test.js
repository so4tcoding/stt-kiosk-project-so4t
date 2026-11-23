const test = require("node:test");
const assert = require("node:assert/strict");

const store = {};
global.localStorage = {
    getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem(key, value) { store[key] = String(value); },
    removeItem(key) { delete store[key]; }
};
global.__kioskTalkState = {};

const talk = require("./kiosk_talk.js");

const WELCOME = "첫 주문이신가요? 첫 주문이면 키오스크 사용 방식 알려줘 라고 말씀해주세요. 바로 주문하시려면 주문 시작이라고 말씀해주세요.";
const GUIDE = "쉽게 설명해드릴게요. 이 키오스크는 화면을 누르지 않고 말로 주문합니다. 먹고 싶은 메뉴 이름을 말씀하시고, 몇 개 주문할지 수량을 말씀하시면 됩니다. 그 다음 매장인지 포장인지 말하고, 마지막으로 카드 또는 현금이라고 말씀하시면 주문이 끝납니다. 중간에 잘못 골랐으면 이전 화면이라고 말씀하시면 됩니다. 이제 주문을 시작하겠습니다.";
const TASTE = "오늘의 추천 메뉴는 치즈버거이고, 제일 맛있는 메뉴는 오렌지 주스입니다. 고르실 수 있는 맛은 달콤한 맛, 상큼한 맛, 구수한 맛, 고소한 맛, 얼큰한 맛, 짭짤한 맛이 있습니다. 어떤 맛이 드시고 싶으신가요?";
const GRID_ADD = "어떤 메뉴를 추가하시겠습니까? 위치나 이름으로 말씀해주세요.";

test("22종 기본 대사가 어뚱한 문장 대신 나간다", () => {
    assert.equal(talk.lines().length, 22);
    assert.equal(
        talk.resolveSpeak("주문을 시작하시겠습니까? 주문하시려면 주문 시작 또는 네 라고 말씀해주세요."),
        WELCOME
    );
    assert.equal(
        talk.resolveSpeak("고객님, 반갑습니다! 주문을 시작하시려면 네, 키오스크 사용법이 궁금하시면 사용법 알려줘 라고 말씀해주세요."),
        WELCOME
    );
    assert.equal(talk.resolveSpeak(talk.LEGACY_GUIDE), GUIDE);
    assert.equal(
        talk.resolveSpeak("저희 매장에는 국밥, 커피 카테고리가 있습니다. 무엇을 드시겠습니까?"),
        "저희 매장에는 국밥, 커피 카테고리가 있습니다. 무엇을 드시겠습니까?"
    );
    assert.equal(
        talk.resolveSpeak("추가로 주문하실 카테고리를 골라주세요. 추가 주문이 없으시면 결제라고 말씀해주세요."),
        "추가로 주문하실 카테고리를 골라주세요. 추가 주문이 없으시면 결제라고 말씀해주세요."
    );
    assert.equal(
        talk.resolveSpeak("돼지국밥 9,000원, 순대국밥 9,500원 등이 있습니다. 어떤 메뉴를 주문하시겠습니까?"),
        "돼지국밥 9,000원, 순대국밥 9,500원 등이 있습니다. 어떤 메뉴를 주문하시겠습니까?"
    );
    assert.equal(talk.resolveSpeak("어떤 메뉴를 추가하시겠습니까? 위치나 이름으로 말씀해주세요."), GRID_ADD);
    assert.equal(
        talk.resolveSpeak("메뉴를 고르기 어려우신가요? 달콤한 맛, 상큼한 맛, 구수한 맛, 고소한 맛, 얼큰한 맛, 짭짤한 맛 중에서 원하시는 맛이 있습니까?"),
        TASTE
    );
    assert.equal(
        talk.resolveSpeak("선택하신 게 돼지국밥 맞습니까? 맞으면 네, 틀리면 아니요 라고 대답해주세요."),
        "선택하신 게 돼지국밥 맞습니까? 맞으면 네, 틀리면 아니요 라고 대답해주세요."
    );
    assert.equal(
        talk.resolveSpeak("따뜻하게 드시고 싶으시면 따뜻하게, 차갑게 드시고 싶으시면 차갑게 라고 말씀해주세요."),
        "따뜻하게 드시고 싶으시면 따뜻하게, 차갑게 드시고 싶으시면 차갑게 라고 말씀해주세요."
    );
    assert.match(talk.resolveSpeak("콜라와 감자튀김 세트를 같이 드시고 싶으신가요?"), /콜라나 감자튀김/);
    assert.equal(talk.resolveSpeak("몇 개를 주문하실지 수량을 정확히 말씀해주세요."), "메뉴 수량을 말씀해주세요.");
    assert.equal(
        talk.resolveSpeak("컵 사이즈를 스몰, 미디엄, 라지 중에서 말씀해 주세요."),
        "컵 용량을 말씀해주세요. 이백 밀리리터, 삼백오십 밀리리터, 오백 밀리리터 중에서 말씀하시면 됩니다."
    );
    assert.match(talk.resolveSpeak("커피 샷 추가, 시럽, 얼음 양을 조절하고 싶으시다면 네, 추가할 게 없으시다면 아니요라고 해주세요."), /커피 샷 추가/);
    assert.equal(
        talk.resolveSpeak("얼음, 당도, 과일 토핑 양을 조절하고 싶으시다면 네, 추가할 게 없으시다면 아니요라고 해주세요."),
        "얼음, 당도, 과일 토핑 양을 조절하고 싶으시다면 네, 추가할 게 없으시다면 아니요라고 해주세요."
    );
    assert.equal(
        talk.resolveSpeak("시럽, 1단계부터 5단계까지 조절 하실 수 있습니다. 몇 단계로 할까요?"),
        "시럽, 1단계부터 5단계까지 조절 하실 수 있습니다. 몇 단계로 할까요?"
    );
    assert.match(talk.resolveSpeak("선택하신 옵션으로 음료가 완성되었습니다. 이대로 주문하시겠습니까?"), /음료가 완성/);
    assert.match(talk.resolveSpeak("추가하실 메뉴가 있습니까. 있으면 네, 없으면 아니요 라고 말씀해주세요."), /추가하실 메뉴가 있습니까/);
    assert.match(talk.resolveSpeak("여기서 드실지, 들고 가실지 말씀해주세요."), /여기서 드시고 가시나요/);
    assert.equal(
        talk.resolveSpeak("주문하신 총 금액은 12000원입니다. 맞으시면 결제라고 말씀해주세요."),
        "주문하신 총 금액은 12000원입니다. 맞으시면 결제라고 말씀해주세요."
    );
    assert.equal(
        talk.resolveSpeak("결제 방식은 카드 또는 현금이라고 말씀해주세요."),
        "카드로 결제 하실려면 네, 현금으로 결제하실려면 아니요 라고 말씀해주세요."
    );
    assert.equal(talk.resolveSpeak("기기 아래쪽에 결제 수단을 투입해 주세요."), "기기 아래쪽에 결제 수단을 투입해 주세요.");
    assert.equal(talk.resolveSpeak("감사합니다. 맛있게 드세요."), "감사합니다. 맛있게 드세요.");
});

test("첫 단어가 겹쳐도 다른 대사로 바뀌지 않는다", () => {
    localStorage.setItem("tts_grid_add", "추가 메뉴를 말해주세요");
    const spoken = talk.resolveSpeak("메뉴를 고르기 어려우신가요? 달콤한 맛 중에서 원하시는 맛이 있습니까?");
    assert.equal(spoken, TASTE);
    assert.notEqual(spoken, "추가 메뉴를 말해주세요");
    localStorage.removeItem("tts_grid_add");
});

test("관리자에 저장한 대사가 기본 문장보다 우선한다", () => {
    localStorage.setItem("tts_welcome", "어서 오세요. 주문 시작이라고 말씀해주세요.");
    assert.equal(
        talk.resolveSpeak("주문을 시작하시겠습니까? 주문하시려면 주문 시작 또는 네 라고 말씀해주세요."),
        "어서 오세요. 주문 시작이라고 말씀해주세요."
    );
    localStorage.removeItem("tts_welcome");
});

test("예전 사용법 문장은 한 번 지우고 2번 대사를 남긴다", () => {
    localStorage.setItem("tts_guide", talk.LEGACY_GUIDE);
    talk.dropLegacyGuide();
    assert.equal(localStorage.getItem("tts_guide"), null);
    assert.equal(talk.resolveSpeak("쉽게 설명해드릴게요. 화면을 누르지 않고 말로 주문합니다."), GUIDE);
});

test("도움말, 비밀번호, 담기 안내는 22종 대사로 바꾸지 않는다", () => {
    assert.match(talk.resolveSpeak("첫 화면입니다. 주문 시작이라고 말씀해주세요."), /첫 화면입니다/);
    assert.equal(talk.resolveSpeak("비밀번호가 틀렸습니다."), "비밀번호가 틀렸습니다.");
    assert.equal(talk.resolveSpeak("돼지국밥 1개를 장바구니에 추가했습니다."), "돼지국밥 1개를 장바구니에 추가했습니다.");
});

test("같은 화면의 짧은 재질문도 그 화면 대사로 맞춘다", () => {
    global.__kioskTalkState = { stage: "quantity" };
    assert.equal(talk.resolveSpeak("수량을 다시 말씀해주세요."), "메뉴 수량을 말씀해주세요.");
    global.__kioskTalkState = { stage: "menu_grid", addOn: true };
    assert.equal(talk.resolveSpeak("위치를 말씀해주세요."), GRID_ADD);
    global.__kioskTalkState = {};
});

test("줄임말을 주문 단어로 펼친다", () => {
    assert.equal(talk.expand("아아 한잔"), "아메리카노 한 개");
    assert.equal(talk.expand("아이스 아아"), "아이스 아메리카노");
    assert.equal(talk.expand("국바 하나요"), "국밥 한 개");
    assert.equal(talk.expand("계산할게요"), "결제");
    assert.equal(talk.expand("치즈 케이크"), "치즈 케이크");
    assert.equal(talk.expand("소프트 아이스크림"), "소프트 아이스크림");
    assert.equal(talk.expand(talk.expand("아아 한잔")), "아메리카노 한 개");
});

test("주문과 잡담을 서버 없이 바로 가른다", () => {
    assert.equal(talk.judge("아아 한잔"), "order");
    assert.equal(talk.judge("국바 하나요"), "order");
    assert.equal(talk.judge("계산할게"), "order");
    assert.equal(talk.judge("네"), "order");
    assert.equal(talk.judge("돼지국밥 두 개 포장"), "order");
    assert.equal(talk.judge("카드요"), "order");
    assert.equal(talk.judge("야 너 뭐해"), "chatter");
    assert.equal(talk.judge("어제 학교에서 영화 재밌었어"), "chatter");
    assert.equal(talk.judge("어제 한잔 했어"), "chatter");
    assert.equal(talk.judge("돼지국밥 먹을까"), "chatter");
    assert.equal(talk.judge("음"), "chatter");
    assert.equal(talk.judge(""), "chatter");
    assert.equal(talk.shouldSkipWhisper("아아 한잔"), true);
    assert.equal(talk.shouldSkipWhisper("어제 학교에서 영화 재밌었어"), true);
    assert.equal(talk.judge("음 그거"), "unsure");
    assert.equal(talk.shouldSkipWhisper("음 그거"), false);

    const started = Date.now();
    for (let i = 0; i < 2000; i++) {
        talk.judge(i % 2 ? "아아 한잔 포장" : "어제 친구랑 영화 봤어");
    }
    assert.ok(Date.now() - started < 500);
});
