const assert = require("assert");
const Noise = require("./kiosk_noise_learn.js");

const menus = [
    "돼지국밥", "순대국밥", "소고기국밥", "수육 백반", "한우 불고기", "불고기 덮밥",
    "치즈버거", "불고기버거", "치킨버거", "아메리카노", "카페라떼", "딸기 라떼",
    "오렌지 주스", "레몬 에이드", "쿠키 쉐이크", "콜라", "사이다", "치즈 케이크",
    "소프트 아이스크림", "초코 케이크", "당근 케이크", "티라미수", "장미 한 송이",
    "카네이션", "안개꽃", "꽃다발", "꽃바구니", "화분", "볼펜", "편지지", "축하 카드",
    "수첩", "달력", "손수건", "머그컵", "양말 선물세트", "보온병"
].map(function (name) { return { name: name }; });

function repair(text, stage) {
    return Noise.repair(text, stage || "open_order_prompt", menus);
}

assert.strictEqual(repair("치즈버거").text, "치즈버거");
assert.strictEqual(repair("지글 치즈버거 앙코르").text, "치즈버거");
assert.strictEqual(repair("함성 아메리까노").text, "아메리카노");
assert.strictEqual(repair("치츠버거").text, "치즈버거");
assert.strictEqual(repair("치치즈버거").text, "치즈버거");
assert.strictEqual(repair("치즈버거 다음").text, "치즈버거");
assert.strictEqual(repair("치즈버거 콜라 지글").action, "repeat");
assert.strictEqual(repair("볼펜 편지지 지글").action, "repeat");
assert.strictEqual(repair("지글 편지지").text, "편지지");
assert.strictEqual(repair("편편지지").text, "편지지");
assert.strictEqual(repair("앙코르 더 크게", "welcome").text, "소리 키워");
assert.strictEqual(repair("지글 더 크게", "open_order_prompt").text, "소리 키워");
assert.strictEqual(repair("앙코르 오빠 함성").action, "repeat");
assert.strictEqual(repair("지글 치익 부글").action, "repeat");
assert.strictEqual(repair("코라").text, "콜라");
assert.strictEqual(repair("더 크게 말해 줘", "welcome").action, "pass");
assert.strictEqual(repair("안녕하세요 날씨 좋네요", "welcome").action, "pass");
assert.strictEqual(repair("결제", "summary").action, "pass");
assert.strictEqual(repair("주문할게요", "welcome").action, "pass");
assert.notStrictEqual(repair("주문할게요 콜라 지글", "welcome").text, "콜라");

const bitten = Noise.distort("치즈버거", { kind: 8, n: 0, venue: "fryer" });
const back = repair(bitten);
assert.ok(back.action === "use" || back.action === "repeat", bitten + " " + back.action);
if (back.action === "use") assert.strictEqual(back.text, "치즈버거");

assert.strictEqual(Noise.distort("치즈버거", { kind: 4, neighbor: "콜라", venue: "concert", n: 1 }).indexOf("콜라") >= 0, true);
assert.strictEqual(repair(Noise.distort("치즈버거", { kind: 4, neighbor: "콜라", venue: "concert", n: 1 })).action, "repeat");
assert.strictEqual(Noise.distort("치즈버거", { kind: 4, loud: true }), "치즈버거");
assert.strictEqual(Noise.repair(Noise.dust("치즈버거", 0)).text, "치즈버거");
assert.strictEqual(Noise.repair(Noise.dust("글씨가 안 보여요", 1), "category_select").text, "글씨가 안 보여요");
assert.strictEqual(Noise.repair(Noise.dust("안 들려요", 2), "category_select").text, "안 들려요");
assert.strictEqual(Noise.repair(Noise.dust("다음", 3), "category_select").text, "다음");
assert.strictEqual(Noise.repair(Noise.dust("이해가 안 돼요", 0), "quantity").text, "이해가 안 돼요");
assert.strictEqual(Noise.dust("볼펜", 0).endsWith("웅웅"), true);
assert.strictEqual(Noise.dust("볼펜", 3).endsWith("지글"), true);

menus.forEach(function (menu) {
    const flat = menu.name.replace(/\s/g, "");
    if (flat.length < 4) return;
    for (let i = 0; i < flat.length; i++) {
        const chars = flat.split("");
        chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
        const heard = repair(chars.join(""));
        if (heard.action === "use") assert.strictEqual(heard.text, menu.name, chars.join(""));
        else assert.strictEqual(heard.action, "repeat", chars.join("") + " " + heard.action + " " + heard.text);
    }
});

console.log("noise ok");
