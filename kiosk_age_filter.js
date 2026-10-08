/*
  초고령 노화 필터.
  화면은 흐리게 보이고, 청력과 말소리가 사람마다 다르다.
  이전 500명과 다른 씨앗으로 다른 손님을 만든다.
*/
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (typeof window !== "undefined") window.KioskAgeFilter = api;
    root.KioskAgeFilter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    const STYLE_ID = "kiosk-age-filter-style";

    function seed(index) {
        return 88021 + index * 251;
    }

    function shopSlot(index) {
        return (index * 5 + 2) % 6;
    }

    function profile(rand) {
        const hearing = 0.2 + rand() * 0.55;
        const vision = 0.08 + rand() * 0.62;
        const volume = 0.1 + rand() * 0.7;
        const diction = rand();
        const comprehension = 0.12 + rand() * 0.8;
        return {
            hearing: hearing,
            vision: vision,
            volume: volume,
            diction: diction,
            clarity: diction,
            comprehension: comprehension,
            maxChars: Math.round(16 + hearing * 50),
            visionSaid: false,
            volumeSaid: false
        };
    }

    function grasps(line, bot) {
        const text = String(line || "").replace(/\s+/g, " ").trim();
        if (!text || !bot) return false;
        const ideas = text.split(",").map(function (part) { return part.trim(); }).filter(Boolean);
        const comprehension = Number(bot.comprehension);
        if (ideas.length >= 2 && comprehension < 0.55) return false;
        if (text.replace(/[\s.?!]/g, "").length >= 14 && comprehension < 0.32) return false;
        return true;
    }

    function understands(line, bot) {
        const text = String(line || "").replace(/\s+/g, " ").trim();
        if (!text) return false;
        if (text.length > bot.maxChars) return false;
        if (bot.volume < 0.18 && text.length > 22) return false;
        const sentences = text.split(/[.?!]/).filter(function (part) { return part.trim(); }).length;
        if (sentences >= 3 && bot.hearing < 0.8) return false;
        if (sentences >= 2 && bot.hearing < 0.28 && bot.volume < 0.3) return false;
        if (/스몰|미디엄|라지|카테고리|밀리리터/.test(text)) return false;
        return true;
    }

    function confused(rand) {
        const lines = ["뭐라고예", "다시 말해 주소", "잘 모르겠구만"];
        return lines[Math.floor(rand() * lines.length)];
    }

    function countWord(n) {
        return ["", "한", "두", "세", "네"][n] || "한";
    }

    function shortMenu(name) {
        const known = {
            "돼지국밥": "돼지",
            "순대국밥": "순대",
            "소고기국밥": "소고기",
            "수육 백반": "수육",
            "한우 불고기": "한우",
            "불고기 덮밥": "덮밥",
            "치즈버거": "치즈버거",
            "불고기버거": "불고기버거",
            "치킨버거": "치킨",
            "아메리카노": "아메리카노",
            "카페라떼": "카페라떼",
            "딸기 라떼": "딸기",
            "오렌지 주스": "오렌지",
            "레몬 에이드": "레몬",
            "쿠키 쉐이크": "쿠키",
            "치즈 케이크": "치즈케이크",
            "초코 케이크": "초코",
            "당근 케이크": "당근",
            "티라미수": "티라미수",
            "소프트 아이스크림": "아이스크림",
            "장미 한 송이": "장미",
            "카네이션": "카네이션",
            "안개꽃": "안개",
            "꽃다발": "꽃다발",
            "꽃바구니": "바구니",
            "화분": "화분",
            "볼펜": "볼펜",
            "편지지": "편지",
            "축하 카드": "축하",
            "수첩": "수첩",
            "달력": "달력",
            "손수건": "손수건",
            "머그컵": "머그",
            "양말 선물세트": "양말",
            "보온병": "보온"
        };
        return known[name] || String(name || "").split(" ")[0];
    }

    function dialect(goal, stage, rand) {
        const n = countWord(goal.count);
        const unit = goal.unit;
        const name = goal.menu;
        if (stage === "welcome" || stage === "guide") return rand() < 0.5 ? "주문할라요" : "밥 묵을라요";
        if (stage === "menu_confirm") return "맞구만";
        if (stage === "category_select" || stage === "menu_grid" || stage === "open_order_prompt") {
            const roll = rand();
            if (roll < 0.35) return shortMenu(name);
            if (roll < 0.55) return name + " 주소";
            if (roll < 0.75) return name.replace(/\s/g, "") + "이여";
            return name + " 하나 해소";
        }
        if (stage === "quantity" || stage === "summary_add_quantity") {
            const forms = [n + "그룻", n + unit + "만", "하나마요", n + " " + unit + " 주소"];
            return forms[Math.floor(rand() * forms.length)];
        }
        if (stage === "temp") return goal.hot ? (rand() < 0.5 ? "뜨신 거로" : "따끈허게") : (rand() < 0.5 ? "차게" : "시원허게");
        if (stage === "cup_size") return goal.large ? "큰컵으로" : "작은컵으로";
        if (stage === "upsell") return rand() < 0.5 ? "그냥이여" : "세트 마이소";
        if (stage === "add_more_prompt" || stage === "beverage_option_prompt" || stage === "beverage_option_step") {
            return rand() < 0.5 ? "됐소" : "없다 아이가";
        }
        if (stage === "place") {
            if (goal.takeout) return rand() < 0.5 ? "싸가요" : "가져갈라요";
            return rand() < 0.5 ? "묵고 갈게요" : "여기서 묵을라요";
        }
        if (stage === "summary") return rand() < 0.5 ? "맞구만" : "계산하소";
        if (stage === "payment") return goal.card ? "카드루 하소" : "현금이로";
        if (stage === "taste_select_prompt") return "달콤허게";
        return "네";
    }

    function applyVisual() {
        if (typeof document === "undefined") return;
        document.documentElement.classList.add("kiosk-aged");
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = [
            "html.kiosk-aged #fit-wrapper {",
            "  filter: blur(1.15px) contrast(0.76) sepia(0.45) saturate(0.62) brightness(0.9);",
            "}",
            "html.kiosk-aged #fit-wrapper::after {",
            "  content: '';",
            "  position: absolute;",
            "  inset: 0;",
            "  pointer-events: none;",
            "  background: radial-gradient(circle at center, transparent 42%, rgba(90, 70, 30, 0.38) 100%);",
            "}"
        ].join("\n");
        document.head.appendChild(style);
        const wrapper = document.getElementById("fit-wrapper");
        if (wrapper && getComputedStyle(wrapper).position === "static") wrapper.style.position = "relative";
    }

    function clearVisual() {
        if (typeof document === "undefined") return;
        document.documentElement.classList.remove("kiosk-aged");
    }

    return {
        seed: seed,
        shopSlot: shopSlot,
        profile: profile,
        understands: understands,
        grasps: grasps,
        confused: confused,
        dialect: dialect,
        shortMenu: shortMenu,
        applyVisual: applyVisual,
        clearVisual: clearVisual
    };
});
