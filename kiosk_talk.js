/*
  관리자 창 22종 TTS와 주문/잡담 빠른 판별.
  대사는 첫 단어로 맞추지 않는다. 문장 전체의 장면만 맞춘다.
*/
(function (root, factory) {
    var api = factory();
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    root.KioskTalk = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    var LINES = [
        { id: "tts_welcome", label: "1. 첫 인사", default: "첫 주문이신가요? 첫 주문이면 키오스크 사용 방식 알려줘 라고 말씀해주세요. 바로 주문하시려면 주문 시작이라고 말씀해주세요." },
        { id: "tts_guide", label: "2. 사용법 안내", default: "쉽게 설명해드릴게요. 이 키오스크는 화면을 누르지 않고 말로 주문합니다. 먹고 싶은 메뉴 이름을 말씀하시고, 몇 개 주문할지 수량을 말씀하시면 됩니다. 그 다음 매장인지 포장인지 말하고, 마지막으로 카드 또는 현금이라고 말씀하시면 주문이 끝납니다. 중간에 잘못 골랐으면 이전 화면이라고 말씀하시면 됩니다. 이제 주문을 시작하겠습니다." },
        { id: "tts_cat", label: "3. 카테고리 선택 ({0}=카테고리명)", default: "저희 매장에는 {0} 카테고리가 있습니다. 무엇을 드시겠습니까?" },
        { id: "tts_cat_add", label: "4. 카테고리 (추가 주문)", default: "추가로 주문하실 카테고리를 골라주세요. 추가 주문이 없으시면 결제라고 말씀해주세요." },
        { id: "tts_grid", label: "5. 메뉴 선택 ({0}=메뉴목록)", default: "{0} 등이 있습니다. 어떤 메뉴를 주문하시겠습니까?" },
        { id: "tts_grid_add", label: "6. 메뉴 (추가 주문)", default: "어떤 메뉴를 추가하시겠습니까? 위치나 이름으로 말씀해주세요." },
        { id: "tts_taste", label: "7. 맛 추천 안내 ({0}=메뉴1, {1}=메뉴2)", default: "오늘의 추천 메뉴는 {0}이고, 제일 맛있는 메뉴는 {1}입니다. 고르실 수 있는 맛은 달콤한 맛, 상큼한 맛, 구수한 맛, 고소한 맛, 얼큰한 맛, 짭짤한 맛이 있습니다. 어떤 맛이 드시고 싶으신가요?" },
        { id: "tts_confirm", label: "8. 선택 메뉴 확인 ({0}=메뉴명)", default: "선택하신 게 {0} 맞습니까? 맞으면 네, 틀리면 아니요 라고 대답해주세요." },
        { id: "tts_temp", label: "9. 온도 선택 (핫/아이스)", default: "따뜻하게 드시고 싶으시면 따뜻하게, 차갑게 드시고 싶으시면 차갑게 라고 말씀해주세요." },
        { id: "tts_upsell", label: "10. 세트/단품 선택", default: "콜라나 감자튀김을 같이 드시고 싶으시나요? 같이 드시고 싶으시면 네, 햄버거만 드시고 싶으시면 아니요 라고 말씀해주세요." },
        { id: "tts_qty", label: "11. 수량 선택", default: "메뉴 수량을 말씀해주세요." },
        { id: "tts_cup", label: "12. 컵 사이즈 선택", default: "컵 용량을 말씀해주세요. 이백 밀리리터, 삼백오십 밀리리터, 오백 밀리리터 중에서 말씀하시면 됩니다." },
        { id: "tts_bev_prompt2", label: "13. 커피 옵션 안내", default: "커피 샷 추가, 시럽, 얼음 양을 조절하고 싶으시다면 네, 추가할 게 없으시다면 아니요라고 해주세요." },
        { id: "tts_bev_prompt", label: "14. 일반 음료 옵션 안내 ({0}=옵션종류)", default: "{0} 양을 조절하고 싶으시다면 네, 추가할 게 없으시다면 아니요라고 해주세요." },
        { id: "tts_bev_step", label: "15. 음료 옵션 세부 조절 ({0}=옵션명)", default: "{0}, 1단계부터 5단계까지 조절 하실 수 있습니다. 몇 단계로 할까요?" },
        { id: "tts_bev_result", label: "16. 음료 옵션 완료 확인", default: "선택하신 옵션으로 음료가 완성되었습니다. 이대로 주문하시겠습니까?" },
        { id: "tts_add_more", label: "17. 추가 주문 의향 묻기", default: "추가하실 메뉴가 있습니까. 있으면 네, 없으면 아니요 라고 말씀해주세요." },
        { id: "tts_place", label: "18. 매장/포장 선택", default: "여기서 드시고 가시나요, 아니면 포장해서 들고 가시나요? 여기서 먹을래요, 또는 들고 갈래요 라고 말씀해주세요." },
        { id: "tts_summary", label: "19. 주문 내역 및 결제 유도 ({0}=금액)", default: "주문하신 총 금액은 {0}원입니다. 맞으시면 결제라고 말씀해주세요." },
        { id: "tts_payment", label: "20. 카드/현금 선택", default: "카드로 결제 하실려면 네, 현금으로 결제하실려면 아니요 라고 말씀해주세요." },
        { id: "tts_insert", label: "21. 결제 수단 투입 안내", default: "기기 아래쪽에 결제 수단을 투입해 주세요." },
        { id: "tts_done", label: "22. 결제 완료 인사", default: "감사합니다. 맛있게 드세요." }
    ];

    var FALLBACK_MENUS = [
        { name: "돼지국밥", price: 9000, category: "국밥" },
        { name: "순대국밥", price: 9500, category: "국밥" },
        { name: "소고기국밥", price: 11000, category: "국밥" },
        { name: "수육 백반", price: 14000, category: "국밥" },
        { name: "한우 불고기", price: 18000, category: "불고기" },
        { name: "불고기 덮밥", price: 10500, category: "불고기" },
        { name: "치즈버거", price: 6900, category: "햄버거" },
        { name: "불고기버거", price: 7400, category: "햄버거" },
        { name: "아메리카노", price: 3500, category: "커피" },
        { name: "카페라떼", price: 4300, category: "커피" },
        { name: "딸기 라떼", price: 4800, category: "음료" },
        { name: "오렌지 주스", price: 4000, category: "음료" },
        { name: "레몬 에이드", price: 4800, category: "음료" },
        { name: "쿠키 쉐이크", price: 5300, category: "음료" },
        { name: "콜라", price: 2000, category: "음료" },
        { name: "사이다", price: 2000, category: "음료" },
        { name: "치즈 케이크", price: 5500, category: "디저트" },
        { name: "소프트 아이스크림", price: 3000, category: "디저트" }
    ];

    var MENU_ALIASES = [
        "아메리카노", "카페라떼", "딸기라떼", "돼지국밥", "순대국밥", "소고기국밥",
        "수육백반", "한우불고기", "불고기덮밥", "치즈버거", "불고기버거",
        "오렌지주스", "레몬에이드", "쿠키쉐이크", "콜라", "사이다", "치즈케이크",
        "소프트아이스크림", "국밥", "햄버거", "버거", "커피", "음료", "디저트", "불고기"
    ];

    var SHORT_ORDER = /^(네|내|예|응|넵|옙|아니|아니요|아니오|아뇨|아냐|맞아|맞어|맞습니다|틀려|틀렸어|좋아|이대로|카드|현금|포장|매장|결제|취소|이전|처음|추천|하나|둘|셋|넷|한개|두개|세개|한잔|두잔|세잔)$/;
    var COMMIT = /주세요|주문이요|주문해|주문할|주문시작|결제|계산할게|계산할|할게요|해줘|담아|포장해|취소해|추가해|빼줘|추천해|메뉴판/;
    var CHATTER = /먹을까|마실까|좋을까|어떨까|할까말까|있잖아|솔직히|배고파|배고프|밥먹자|밥먹으러|어떻게생각해|이거봐|장난|날씨|숙제|학교가자|친구야|ㅋㅋ|ㅎㅎ|근데우리|야너|수다/;
    var STAGE_CMD = /화면확대|글씨크게|소리크게|소리작게|음소거|이전화면|처음으로|세트|단품|스몰|미디엄|라지|아이스|따뜻하게|차갑게|핫으로|시럽|얼음|샷추가|당도/;

    function compact(text) {
        return String(text || "")
            .toLowerCase()
            .replace(/[.,?!'"“”~…]/g, "")
            .replace(/\s+/g, "");
    }

    function expand(text) {
        var t = String(text || "");
        if (!t) return t;

        var held = "\u0000딸기라떼\u0000";
        t = t.replace(/딸기\s*라떼/g, held);

        var pairs = [
            ["아이스 아메리카노", "아메리카노"],
            ["아이스아메리카노", "아메리카노"],
            ["아메리카 너", "아메리카노"],
            ["아메리카 노", "아메리카노"],
            ["아메리가노", "아메리카노"],
            ["아메리카노우", "아메리카노"],
            ["핫아메", "아메리카노"],
            ["뜨아", "아메리카노"],
            ["카페 라테", "카페라떼"],
            ["카페 라떼", "카페라떼"],
            ["까페라떼", "카페라떼"],
            ["카페라태", "카페라떼"],
            ["불고기 보거", "불고기버거"],
            ["불고기 버거", "불고기버거"],
            ["볼고기버거", "불고기버거"],
            ["불고기버가", "불고기버거"],
            ["치즈 보거", "치즈버거"],
            ["치즈 버거", "치즈버거"],
            ["치즈버가", "치즈버거"],
            ["돼지 국밥", "돼지국밥"],
            ["돼지국빱", "돼지국밥"],
            ["도야지국밥", "돼지국밥"],
            ["순대 국밥", "순대국밥"],
            ["순댓국밥", "순대국밥"],
            ["소고기 국밥", "소고기국밥"],
            ["쇠고기 국밥", "소고기국밥"],
            ["오렌지 쥬스", "오렌지 주스"],
            ["오렌지쥬스", "오렌지 주스"],
            ["오랜지 주스", "오렌지 주스"],
            ["오랜지주스", "오렌지 주스"],
            ["레모네이드", "레몬 에이드"],
            ["싸이다", "사이다"],
            ["치즈 케익", "치즈 케이크"],
            ["치즈케익", "치즈 케이크"],
            ["치즈케잌", "치즈 케이크"],
            ["소프트콘", "소프트 아이스크림"],
            ["테이크 아웃", "포장"],
            ["테이크아웃", "포장"],
            ["싸갈게", "포장"],
            ["가져갈게", "포장"],
            ["들고갈게", "포장"],
            ["먹고갈게", "매장"],
            ["여기서 먹을게", "매장"],
            ["계산할게", "결제"],
            ["계산할께", "결제"],
            ["결재", "결제"],
            ["현끔", "현금"],
            ["현찰", "현금"],
            ["한 잔", "한잔"],
            ["두 잔", "두잔"],
            ["세 잔", "세잔"],
            ["한 개", "한개"],
            ["두 개", "두개"],
            ["세 개", "세개"]
        ];

        for (var i = 0; i < pairs.length; i++) {
            if (t.indexOf(pairs[i][0]) !== -1) {
                t = t.split(pairs[i][0]).join(pairs[i][1]);
            }
        }

        t = t.replace(/(^|[^가-힣])아아(?=$|[^가-힣])/g, "$1아메리카노");
        t = t.replace(/(^|[^가-힣])라떼(?=$|[^가-힣])/g, function (all, pre, offset, str) {
            var before = str.slice(Math.max(0, offset - 6), offset);
            if (/딸기\s*$/.test(before) || before.indexOf("\u0000") !== -1) return all;
            return pre + "카페라떼";
        });

        t = t.split(held).join("딸기 라떼");
        return t;
    }

    function menuHit(compactText) {
        for (var i = 0; i < MENU_ALIASES.length; i++) {
            if (compactText.indexOf(MENU_ALIASES[i]) !== -1) return true;
        }
        return false;
    }

    function judge(text) {
        var original = String(text || "").trim();
        if (!original) return "chatter";

        var expanded = expand(original);
        var c = compact(expanded);
        var rawC = compact(original);
        if (!c) return "chatter";
        if (/^(어|음|아|오|에|으)$/.test(rawC)) return "chatter";
        if (SHORT_ORDER.test(c)) return "order";

        var chatter = CHATTER.test(rawC) || CHATTER.test(original);
        if (COMMIT.test(c) || COMMIT.test(rawC)) return "order";
        if (chatter) return "chatter";
        if (menuHit(c) || STAGE_CMD.test(c) || /한개|두개|세개|네개|다섯개|한잔|두잔|세잔|[0-9]+개|[0-9]+잔/.test(c)) {
            return "order";
        }
        return "unknown";
    }

    function linesOf(ctx) {
        if (ctx && ctx.lines) return ctx.lines;
        if (typeof window !== "undefined" && window.ALL_TTS_CONFIG && window.ALL_TTS_CONFIG.length) {
            return window.ALL_TTS_CONFIG;
        }
        return LINES;
    }

    function savedText(id, ctx) {
        if (ctx && typeof ctx.getItem === "function") return ctx.getItem(id) || "";
        try {
            if (typeof localStorage !== "undefined") return localStorage.getItem(id) || "";
        } catch (e) {}
        return "";
    }

    function stateOf(ctx) {
        if (ctx && ctx.state) return ctx.state;
        try {
            if (typeof window !== "undefined" && window.kioskState) return window.kioskState;
        } catch (e) {}
        return {};
    }

    function menusOf(st) {
        if (st.menus && st.menus.length) return st.menus;
        return FALLBACK_MENUS;
    }

    function menuNames(st) {
        var grid = st.grid && st.grid.length ? st.grid : menusOf(st);
        return grid.slice(0, 5).map(function (m) {
            var price = Number(m.price || 0).toLocaleString("ko-KR");
            return m.name + " " + price + "원";
        }).join(", ");
    }

    function categoryNames(st) {
        var menus = menusOf(st);
        var seen = [];
        menus.forEach(function (m) {
            if (m.category && seen.indexOf(m.category) === -1) seen.push(m.category);
        });
        return seen.join(", ") || "국밥, 불고기, 햄버거, 커피, 음료, 디저트";
    }

    function summaryAmount(text, st) {
        var found = String(text || "").match(/총 금액은\s*([0-9,]+)\s*원/);
        if (found) return found[1].replace(/,/g, "");
        var menus = menusOf(st);
        var items = (st.orderState && st.orderState.items) || [];
        var sum = 0;
        items.forEach(function (item) {
            var menu = null;
            for (var i = 0; i < menus.length; i++) {
                if (menus[i].name === item.item) menu = menus[i];
            }
            var count = item.count || 1;
            sum += ((menu && menu.price) || 0) * count;
            if (item.isSet) sum += 2000 * count;
        });
        return String(sum);
    }

    function slotsFor(id, text, st) {
        var m;
        if (id === "tts_cat") {
            m = text.match(/저희 매장에는 (.+?) 카테고리/) || text.match(/현재 메뉴 종류는 (.+?) 입니다/);
            return [m ? m[1] : categoryNames(st)];
        }
        if (id === "tts_grid") {
            m = text.match(/^(.*?) 등이 있습니다/);
            return [m && m[1] ? m[1] : menuNames(st)];
        }
        if (id === "tts_taste") {
            m = text.match(/오늘의 추천 메뉴는 (.+?)이고, 제일 맛있는 메뉴는 (.+?)입니다/);
            if (m) return [m[1], m[2]];
            var menus = menusOf(st);
            return [
                menus[0] ? menus[0].name : "치즈버거",
                menus[1] ? menus[1].name : "오렌지 주스"
            ];
        }
        if (id === "tts_confirm") {
            m = text.match(/선택하신 게 (.+?) 맞습니까/) || text.match(/선택하신 메뉴는 (.+?)입니다/);
            if (m) return [m[1].trim()];
            return [st.pendingMenuName || "선택하신 메뉴"];
        }
        if (id === "tts_bev_prompt") {
            m = text.match(/^(.+?) 양을 조절하고 싶으시다면/);
            return [m ? m[1] : "얼음, 당도"];
        }
        if (id === "tts_bev_step") {
            m = text.match(/^(.+?), 1단계부터 5단계/);
            if (m) return [m[1]];
            var opt = st.optionList && st.optionList[st.optionStepIndex];
            return [opt && opt.name ? opt.name : "옵션"];
        }
        if (id === "tts_summary") return [summaryAmount(text, st)];
        return [];
    }

    function fill(template, slots) {
        var out = template;
        for (var i = 0; i < slots.length; i++) {
            out = out.split("{" + i + "}").join(slots[i] == null ? "" : String(slots[i]));
        }
        return out;
    }

    var DETECTORS = [
        { id: "tts_done", test: function (t) { return /감사합니다[.!]?\s*맛있게 드세요/.test(t) && t.length < 80; } },
        { id: "tts_insert", test: function (t) { return t.indexOf("결제 수단을 투입") !== -1; } },
        { id: "tts_payment", test: function (t) { return /카드로 결제|현금으로 결제하실|결제 방식은|지금은 결제 방식/.test(t); } },
        { id: "tts_summary", test: function (t) { return /주문하신 총 금액|현재 주문 내역은|결제하시겠습니까|지금은 주문 내역/.test(t); } },
        { id: "tts_place", test: function (t) { return /여기서 드시고 가시나요|여기서 드실지|들고 가실지/.test(t); } },
        { id: "tts_add_more", test: function (t) { return /추가하실 메뉴가 있습니까|더 주문하시려면/.test(t); } },
        { id: "tts_bev_result", test: function (t) { return /선택하신 옵션으로 음료가 완성|이대로 주문하시려면/.test(t); } },
        { id: "tts_bev_step", test: function (t) { return /1단계부터 5단계/.test(t); } },
        { id: "tts_bev_prompt2", test: function (t) { return t.indexOf("커피 샷 추가") !== -1; } },
        { id: "tts_bev_prompt", test: function (t) { return t.indexOf("양을 조절하고 싶으시다면") !== -1; } },
        { id: "tts_cup", test: function (t) { return /컵 용량|컵 사이즈|이백 밀리리터, 삼백오십/.test(t); } },
        { id: "tts_qty", test: function (t) { return /메뉴 수량을 말씀|몇 개를 주문하실지|수량을 정확히 말씀|지금은 수량을 말하는/.test(t); } },
        { id: "tts_upsell", test: function (t) { return /콜라나 감자튀김|세트로 하시려면/.test(t); } },
        { id: "tts_temp", test: function (t) { return /따뜻하게 드시고 싶으시면|따뜻하게 드시면/.test(t); } },
        { id: "tts_confirm", test: function (t) { return /선택하신 게 .+ 맞습니까|선택하신 메뉴는 .+입니다|맞으면 네, 틀리면 아니요|맞으면 '맞아'/.test(t); } },
        { id: "tts_taste", test: function (t) { return /오늘의 추천 메뉴는|메뉴를 고르기 어려우신가요|고르실 수 있는 맛은|달콤, 상큼, 구수/.test(t); } },
        { id: "tts_grid_add", test: function (t) { return t.indexOf("어떤 메뉴를 추가하시겠습니까") !== -1; } },
        { id: "tts_grid", test: function (t) { return /등이 있습니다[.!]?\s*어떤 메뉴를 주문|메뉴 이름이나 위치를 다시|메뉴 위치나 이름을 말씀|지금은 메뉴판 화면/.test(t); } },
        { id: "tts_cat_add", test: function (t) { return t.indexOf("추가로 주문하실 카테고리") !== -1; } },
        { id: "tts_cat", test: function (t) { return /카테고리가 있습니다|현재 메뉴 종류는|어떤 카테고리를 원하시는지|무엇을 드시고 싶으신가요|지금은 메뉴 종류|지금은 먹고 싶은 메뉴/.test(t); } },
        { id: "tts_guide", test: function (t) { return /쉽게 설명해드릴게요|화면을 누르지 않고 말로 주문|이 키오스크는 말로 주문합니다/.test(t); } },
        { id: "tts_welcome", test: function (t) { return /첫 주문이신가요|주문을 시작하시겠습니까|반갑습니다! 주문을 시작|첫 주문이면 키오스크|사용법 알려줘 라고 말씀해주시면 주문을 시작|지금은 주문 시작 화면/.test(t); } }
    ];

    function resolveSpeak(text, ctx) {
        var raw = String(text || "");
        if (!raw.trim()) return raw;

        var lines = linesOf(ctx);
        var st = stateOf(ctx);
        var hit = null;
        for (var i = 0; i < DETECTORS.length; i++) {
            if (DETECTORS[i].test(raw)) {
                hit = DETECTORS[i];
                break;
            }
        }
        if (!hit) return raw;

        var rule = null;
        for (var j = 0; j < lines.length; j++) {
            if (lines[j].id === hit.id) rule = lines[j];
        }
        if (!rule) return raw;

        var custom = String(savedText(hit.id, ctx) || "").trim();
        var template = custom || rule.default;
        return fill(template, slotsFor(hit.id, raw, st));
    }

    function install() {
        var host = typeof window !== "undefined" ? window : null;
        if (!host || host.__kioskTalkInstalled) return;
        host.__kioskTalkInstalled = true;

        var prevProcess = host.processVoiceCommand;
        if (typeof prevProcess === "function" && !prevProcess.__kioskTalk) {
            var wrappedProcess = function (text) {
                return prevProcess.call(this, expand(text));
            };
            wrappedProcess.__kioskTalk = true;
            host.processVoiceCommand = wrappedProcess;
        }

        var prevValid = host.isValidContext;
        if (typeof prevValid === "function" && !prevValid.__kioskTalk) {
            var wrappedValid = function (text) {
                var verdict = judge(text);
                if (verdict === "chatter") return false;
                if (verdict === "order") return true;
                return prevValid.call(this, expand(text));
            };
            wrappedValid.__kioskTalk = true;
            host.isValidContext = wrappedValid;
        }
    }

    if (typeof document !== "undefined") {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", install);
        } else {
            install();
        }
    }

    return {
        lines: LINES,
        expand: expand,
        judge: judge,
        resolveSpeak: resolveSpeak,
        install: install
    };
});
