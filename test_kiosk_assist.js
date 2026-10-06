const assert = require("assert");
const Assist = require("./kiosk_assist.js");

const menus = [
    { name: "아메리카노", price: 3500, taste: "산미 낮음" },
    { name: "치즈 케이크", price: 5500, taste: "달콤한 맛" },
    { name: "불고기버거", price: 7400, taste: "달콤한 맛" }
];

function kind(text) {
    const found = Assist.classify(text, menus);
    return found ? found.kind : null;
}

assert.strictEqual(kind("이게 뭐야"), "help");
assert.strictEqual(kind("이게 뭔데"), "help");
assert.strictEqual(kind("이거 뭐야"), "help");
assert.strictEqual(kind("여기 뭐 하는 건데"), "help");
assert.strictEqual(kind("도와줘"), "help");
assert.strictEqual(kind("설명해 줘"), "help");

assert.strictEqual(kind("안 보여"), "see");
assert.strictEqual(kind("글씨가 안 보여"), "see");
assert.strictEqual(kind("잘 안 보여요"), "see");
assert.strictEqual(kind("밑에 안 보여"), null);

assert.strictEqual(kind("안 들려"), "hear");
assert.strictEqual(kind("잘 안 들려"), "hear");
assert.strictEqual(kind("소리 크게"), null);
assert.strictEqual(kind("화면 확대"), null);

assert.strictEqual(kind("아메리카노 뭐야"), "menu");
assert.strictEqual(kind("치즈 케이크가 뭐야"), "menu");
assert.strictEqual(Assist.classify("치즈 케이크 무슨 맛이야", menus).menu.name, "치즈 케이크");
assert.strictEqual(kind("아메리카노가 안 보여"), "see");
assert.strictEqual(kind("추천해줘"), "recommend");
assert.strictEqual(kind("아무거나"), "recommend");
assert.strictEqual(Assist.zoomSpeech(1), "화면을 1단계 확대했습니다.");
assert.strictEqual(Assist.zoomSpeech(3), "화면을 3단계 확대했습니다.");
assert.ok(Assist.recommendSpeech(menus[0]).includes("아메리카노"));
assert.strictEqual(Assist.recommendMenu(menus).name, "불고기버거");

const stages = [
    "welcome", "sleep", "open_order_prompt", "guide", "category_select", "menu_grid",
    "menu_confirm", "taste_select_prompt", "quantity", "summary_add_quantity", "temp",
    "upsell", "beverage_option_prompt", "drink_option", "option", "cup_size",
    "topping", "beverage_result", "place", "add_more_prompt", "summary", "payment",
    "done", "direct_drink_more_option_prompt", "admin_panel_open"
];

for (const stage of stages) {
    const text = Assist.stageHelp(stage, { gridNames: ["불고기버거", "아메리카노"], categories: ["국밥", "커피"] });
    assert.ok(text && text.length > 12, stage + " 안내가 비어 있습니다");
    assert.ok(!/배우는 중/.test(text), stage);
}

const grid = Assist.stageHelp("menu_grid", { gridNames: ["불고기버거", "아메리카노"] });
assert.ok(grid.includes("불고기버거"));
assert.ok(Assist.describeMenu(menus[0]).includes("3500") || Assist.describeMenu(menus[0]).includes("3,500"));

console.log("kiosk_assist tests passed");
