/* 관리자 22종 TTS와 주문/잡담 빠른 판별.
   대사는 첫 단어가 아니라 문장 앵커나 현재 화면으로만 고른다.
   저장된 대사가 있으면 그 문장, 없으면 관리자 기본 문장을 말한다. */
(function (root) {
    "use strict";

    var LEGACY_GUIDE = "쉽게 설명해드릴게요. 이 키오스크는 말로 주문합니다. 글씨가 작으면 화면 확대, 기기 소리가 작으면 소리 키워 라고 말씀해주세요. 이용 중 뭘 해야 할지 모를 때는 설명해 줘 라고 말씀하시면 화면을 안내해 드립니다. 자, 원하시는 메뉴를 말씀해주세요.";

    var DEFAULT_LINES = [
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

    var ANCHORS = [
        { id: "tts_bev_prompt2", re: /커피 샷 추가/ },
        { id: "tts_bev_prompt", re: /양을 조절하고 싶으시다면/ },
        { id: "tts_bev_step", re: /1단계부터 5단계/ },
        { id: "tts_bev_result", re: /선택하신 옵션으로 음료가 완성|음료 옵션이 완성/ },
        { id: "tts_cup", re: /컵 용량을 말씀|컵 사이즈를|이백 밀리리터, 삼백오십/ },
        { id: "tts_taste", re: /오늘의 추천 메뉴는|메뉴를 고르기 어려우신가요|고르실 수 있는 맛은 달콤한 맛/ },
        { id: "tts_confirm", re: /선택하신 게|선택하신 메뉴는/ },
        { id: "tts_grid_add", re: /어떤 메뉴를 추가하시겠습니까/ },
        { id: "tts_grid", re: /등이 있습니다/ },
        { id: "tts_cat_add", re: /추가로 주문하실 카테고리/ },
        { id: "tts_cat", re: /카테고리가 있습니다|현재 메뉴 종류는/ },
        { id: "tts_summary", re: /총 금액은/ },
        { id: "tts_payment", re: /카드로 결제|현금으로 결제하실려면|결제 방식은 카드 또는 현금/ },
        { id: "tts_insert", re: /결제 수단을 투입/ },
        { id: "tts_done", re: /맛있게 드세요/ },
        { id: "tts_place", re: /여기서 드시고 가시나요|여기서 드실지/ },
        { id: "tts_add_more", re: /추가하실 메뉴가 있습니까|다른 메뉴를 더 추가하시겠습니까/ },
        { id: "tts_upsell", re: /콜라나 감자튀김|콜라와 감자튀김/ },
        { id: "tts_temp", re: /따뜻하게 드시고 싶으시면|차갑게 드시고 싶으시면/ },
        { id: "tts_qty", re: /메뉴 수량을 말씀|몇 개를 주문하실지/ },
        { id: "tts_guide", re: /쉽게 설명해드릴게요|화면을 누르지 않고 말로 주문|글씨가 작으면 화면 확대/ },
        { id: "tts_welcome", re: /첫 주문이신가요|고객님,\s*반갑습니다|주문을 시작하시겠습니까|첫 주문이면 키오스크 사용 방식 알려줘/ }
    ];

    var STAGE_TO_LINE = {
        welcome: "tts_welcome",
        guide: "tts_guide",
        category_select: "tts_cat",
        menu_grid: "tts_grid",
        taste_select_prompt: "tts_taste",
        menu_confirm: "tts_confirm",
        temp: "tts_temp",
        upsell: "tts_upsell",
        quantity: "tts_qty",
        cup_size: "tts_cup",
        beverage_option_prompt: "tts_bev_prompt",
        beverage_option_step: "tts_bev_step",
        beverage_result: "tts_bev_result",
        add_more_prompt: "tts_add_more",
        place: "tts_place",
        summary: "tts_summary",
        payment: "tts_payment",
        guidance: "tts_insert",
        done: "tts_done"
    };

    var EXPAND_RULES = [
        [/아이스\s*아아|아아\s*아이스/g, "아이스 아메리카노"],
        [/뜨\s*아(?![가-힣])/g, "따뜻한 아메리카노"],
        [/(?<![가-힣])아아(?![가-힣])/g, "아메리카노"],
        [/(?<![가-힣])아메(?!리카노)(?![가-힣])/g, "아메리카노"],
        [/국바/g, "국밥"],
        [/치버/g, "치즈버거"],
        [/불버/g, "불고기버거"],
        [/소프트콘/g, "소프트 아이스크림"],
        [/(?<!소프트\s*)아이스크림/g, "소프트 아이스크림"],
        [/치즈\s*케익|치즈케익|(?<!치즈\s*)케익/g, "치즈 케이크"],
        [/(?<!치즈\s*)케이크/g, "치즈 케이크"],
        [/쥬스/g, "주스"],
        [/계산할게요|계산할게|계산하자|계산해\s*줘/g, "결제"],
        [/한\s*잔|(?<![가-힣])하나요(?![가-힣])/g, "한 개"],
        [/두\s*잔|(?<![가-힣])둘이요(?![가-힣])/g, "두 개"],
        [/세\s*잔|(?<![가-힣])셋이요(?![가-힣])/g, "세 개"],
        [/포장할게요|포장할게|(?<![가-힣])포장이요(?![가-힣])|싸\s*줘(?:요)?|가져갈게요|가져갈게/g, "포장"],
        [/먹고\s*갈게요|먹고\s*갈게|여기서\s*먹을게요|여기서\s*먹을게|(?<![가-힣])매장이요(?![가-힣])/g, "매장"],
        [/카드로\s*할게요|카드로\s*할게|(?<![가-힣])카드요(?![가-힣])|신용카드/g, "카드"],
        [/(?<![가-힣])현금요(?![가-힣])|현금으로|현찰/g, "현금"],
        [/핫으로|핫이요|따뜻이요/g, "따뜻하게"],
        [/아이스요|차갑게요/g, "차갑게"],
        [/메뉴\s*보여\s*줘/g, "메뉴판"],
        [/달달한거|달달한|단\s*거/g, "달콤한 맛"],
        [/매운거|매운|칼칼/g, "얼큰한 맛"],
        [/새콤|신\s*거/g, "상큼한 맛"],
        [/짠\s*거/g, "짭짤한 맛"],
        [/작은\s*거/g, "스몰"],
        [/중간\s*거|보통\s*사이즈/g, "미디엄"],
        [/큰\s*거/g, "라지"]
    ];

    var STRONG = [
        "아메리카노", "카페라떼", "돼지국밥", "순대국밥", "소고기국밥", "치즈버거", "불고기버거",
        "딸기라떼", "오렌지주스", "레몬에이드", "쿠키쉐이크", "콜라", "사이다", "치즈케이크",
        "소프트아이스크림", "국밥", "햄버거", "커피", "음료", "디저트", "불고기", "수육", "덮밥",
        "주스", "에이드", "케이크", "결제", "카드", "현금", "포장", "매장", "테이크아웃",
        "주문시작", "바로주문", "주문할게", "메뉴판", "추천", "사용법", "이전화면", "처음으로",
        "화면확대", "소리크게", "소리작게", "글씨크게", "달콤", "상큼", "구수", "고소", "얼큰",
        "짭짤", "매콤", "스몰", "미디엄", "라지", "이백", "삼백오십", "오백", "따뜻", "차갑",
        "아이스", "세트", "단품", "샷", "시럽", "당도", "첫번째", "두번째", "세번째", "네번째",
        "왼쪽", "오른쪽", "추가해", "빼줘", "취소"
    ];

    var WEAK = ["한개", "두개", "세개", "네개", "다섯개", "여섯개", "하나", "둘이요"];
    var YES = {
        "네": 1, "예": 1, "응": 1, "내": 1, "넵": 1, "옙": 1, "넹": 1, "어응": 1, "응응": 1,
        "맞아": 1, "맞아요": 1, "맞습니다": 1, "좋아요": 1, "좋아": 1, "그래": 1, "이대로": 1,
        "아니": 1, "아니요": 1, "아니오": 1, "아니야": 1, "아냐": 1, "아뇨": 1, "아녀": 1,
        "싫어": 1, "싫어요": 1, "틀려": 1, "틀렸어": 1, "다시": 1, "진짜요": 1
    };
    var FILLER = { "어": 1, "음": 1, "아": 1, "오": 1, "흠": 1, "글쎄": 1, "몰라": 1, "그냥": 1 };
    var CHATTER_RE = /어제|저번|학교|회사|영화|게임|친구|있잖아|왜냐하면|그래서|날씨|배고프|피곤|졸려|숙제|시험|출근|퇴근|오랜만|어디야|뭐해|전화해|카톡|대박|헐|미쳤|사랑해|ㅋㅋ|ㅎㅎ|ㅠㅠ|너뭐|너는|우리뭐|우리는|야너/;
    var CHATTER_END_RE = /(먹을까|좋을까|할까|어떨까|어때|먹지|있는데|있고|있잖아)$/;
    var PASS_RE = /비밀번호|관리자 설정|장바구니에|추가했습니다|뺐습니다|비었습니다|처음 화면으로|결제 단계로|준비하겠습니다|화면을 \d|소리를 \d|단계로 올렸|단계로 줄|단계 확대|단어사전|절전|맛 특징|가격을 다시|이전 화면으로 돌아|설명이 준비|우유갑|현재 단계에서는|반짝이는 버튼|빛나는 버튼|큰 소리가 감지|주문 번호|아래쪽 내용|원래 크기|화면입니다|현재 화면|지금은 |안내를 마칩니다|바로 주문을 시작하겠습니다|메뉴가 성공적으로/;

    function lines() {
        var configured = root.ALL_TTS_CONFIG;
        if (configured && configured.length >= 22) return configured;
        return DEFAULT_LINES;
    }

    function lineById(id) {
        var list = lines();
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) return list[i];
        }
        return null;
    }

    function compact(text) {
        return String(text || "").toLowerCase().replace(/[\s.,?!'"~]+/g, "");
    }

    function readState() {
        try {
            var state = root.__kioskTalkState;
            if (!state || typeof state !== "object") return {};
            return state;
        } catch (e) {
            return {};
        }
    }

    function storedLine(id) {
        var saved = "";
        try {
            if (root.localStorage) saved = root.localStorage.getItem(id) || "";
        } catch (e) {
            saved = "";
        }
        saved = String(saved).trim();
        if (!saved) return "";
        if (id === "tts_guide" && saved === LEGACY_GUIDE) return "";
        return saved;
    }

    function uniqueCategories(state) {
        var names = [];
        var menus = state.menus || [];
        for (var i = 0; i < menus.length; i++) {
            var category = menus[i] && menus[i].category;
            if (category && names.indexOf(category) < 0) names.push(category);
        }
        return names.join(", ");
    }

    function formatWon(value) {
        var digits = String(Math.round(Number(value) || 0));
        return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    function sumOrder(state) {
        var items = state.orderItems || [];
        var menus = state.menus || [];
        var sum = 0;
        for (var i = 0; i < items.length; i++) {
            var item = items[i] || {};
            var price = 0;
            for (var j = 0; j < menus.length; j++) {
                if (menus[j] && menus[j].name === item.item) {
                    price = Number(menus[j].price) || 0;
                    break;
                }
            }
            sum += price * (Number(item.count) || 1);
            if (item.isSet) sum += 2000 * (Number(item.count) || 1);
        }
        return sum ? formatWon(sum) : "";
    }

    function varsFor(id, source, state) {
        var match;
        if (id === "tts_cat") {
            match = source.match(/매장에는\s+(.+?)\s+카테고리/) || source.match(/메뉴 종류는\s+(.+?)\s+입니다/);
            return [match ? match[1] : (uniqueCategories(state) || "국밥, 불고기, 햄버거, 커피, 음료, 디저트")];
        }
        if (id === "tts_grid") {
            match = source.match(/^(.+?)\s*등이 있습니다/);
            if (match) return [match[1]];
            var grid = state.grid || [];
            var names = [];
            for (var i = 0; i < grid.length && i < 5; i++) {
                names.push(grid[i].name + " " + formatWon(grid[i].price) + "원");
            }
            return [names.join(", ") || "메뉴"];
        }
        if (id === "tts_taste") {
            match = source.match(/추천 메뉴는\s+(.+?)이고,\s*제일 맛있는 메뉴는\s+(.+?)입니다/);
            if (match) return [match[1], match[2]];
            var menus = state.menus || [];
            return [
                menus[0] ? menus[0].name : "치즈버거",
                menus[1] ? menus[1].name : "오렌지 주스"
            ];
        }
        if (id === "tts_confirm") {
            match = source.match(/선택하신 게\s+(.+?)\s+맞습니까/) || source.match(/선택하신 메뉴는\s+(.+?)입니다/);
            return [(match && match[1]) || state.pendingMenu || "이 메뉴"];
        }
        if (id === "tts_bev_prompt") {
            match = source.match(/^(.+?)\s+양을 조절/);
            return [(match && match[1]) || "얼음, 당도"];
        }
        if (id === "tts_bev_step") {
            match = source.match(/^(.+?),\s*1단계부터/);
            var option = (state.optionList || [])[state.optionStepIndex || 0];
            return [(match && match[1]) || (option && option.name) || "옵션"];
        }
        if (id === "tts_summary") {
            match = source.match(/총 금액은\s*([0-9,]+)\s*원/);
            return [(match && match[1]) || sumOrder(state) || "0"];
        }
        return [];
    }

    function fill(id, template, source, state) {
        var vars = varsFor(id, source, state);
        var out = template;
        for (var i = 0; i < vars.length; i++) {
            out = out.split("{" + i + "}").join(vars[i] == null ? "" : String(vars[i]));
        }
        return out;
    }

    function anchorId(text) {
        for (var i = 0; i < ANCHORS.length; i++) {
            if (ANCHORS[i].re.test(text)) return ANCHORS[i].id;
        }
        return "";
    }

    function stageLineId(state) {
        var stage = state.stage || "";
        if (stage === "category_select" && state.addOn) return "tts_cat_add";
        if (stage === "menu_grid" && state.addOn) return "tts_grid_add";
        if (stage === "beverage_option_prompt") {
            var item = (state.tempItem && state.tempItem.item) || "";
            var menus = state.menus || [];
            var category = "";
            for (var i = 0; i < menus.length; i++) {
                if (menus[i] && menus[i].name === item) category = menus[i].category || "";
            }
            if (!item || category === "커피" || /아메리카노|라떼|커피/.test(item)) return "tts_bev_prompt2";
            return "tts_bev_prompt";
        }
        return STAGE_TO_LINE[stage] || "";
    }

    function renderLine(id, source, state) {
        var rule = lineById(id);
        if (!rule) return source;
        var template = storedLine(id) || rule.default;
        return fill(id, template, source, state);
    }

    function resolveSpeak(text) {
        var raw = String(text || "");
        if (!raw.trim() || PASS_RE.test(raw)) return raw;
        var state = readState();
        var id = anchorId(raw);
        if (!id) {
            id = stageLineId(state);
            if (id && !/말씀|하시겠|있습니까|맞습니까|투입|맛있게|골라|단계|카테고리|메뉴/.test(raw)) id = "";
        }
        if (!id) return raw;
        return renderLine(id, raw, state);
    }

    function expand(text) {
        var out = String(text || "");
        for (var i = 0; i < EXPAND_RULES.length; i++) {
            var source = EXPAND_RULES[i][0].source;
            out = out.replace(new RegExp(source, "g"), EXPAND_RULES[i][1]);
        }
        return out.replace(/\s+/g, " ").trim();
    }

    function hasAny(compactText, words) {
        for (var i = 0; i < words.length; i++) {
            if (compactText.indexOf(words[i]) !== -1) return true;
        }
        return false;
    }

    function judge(text) {
        var spoken = expand(text);
        var c = compact(spoken);
        if (!c) return "chatter";
        if (CHATTER_END_RE.test(c)) return "chatter";
        if (YES[c]) return "order";
        if (FILLER[c]) return "chatter";
        var strong = hasAny(c, STRONG) || /[0-9]+개|[0-9]+번/.test(c);
        if (strong) return "order";
        if (CHATTER_RE.test(c)) return "chatter";
        if (hasAny(c, WEAK)) return "order";
        if (c.length <= 1) return "chatter";
        return "unsure";
    }

    function shouldSkipWhisper(text) {
        var verdict = judge(text);
        return verdict === "order" || verdict === "chatter";
    }

    function dropLegacyGuide() {
        try {
            if (root.localStorage && root.localStorage.getItem("tts_guide") === LEGACY_GUIDE) {
                root.localStorage.removeItem("tts_guide");
            }
        } catch (e) {}
        try {
            var input = root.document && root.document.getElementById("tts_guide");
            if (input && input.value === LEGACY_GUIDE) {
                var rule = lineById("tts_guide");
                input.value = rule ? rule.default : input.value;
            }
        } catch (e) {}
    }

    function installSpeak() {
        var current = root.speakText;
        if (typeof current !== "function" || current.__kioskTalkSpeak) return;
        function resolvedSpeak(text, onEndCallback) {
            var spoken = text;
            try { spoken = resolveSpeak(text); } catch (e) { spoken = text; }
            return current.call(root, spoken, onEndCallback);
        }
        resolvedSpeak.__kioskTalkSpeak = true;
        root.speakText = resolvedSpeak;
        if (root.window) root.window.speakText = resolvedSpeak;
    }

    function installCommand() {
        var current = root.processVoiceCommand;
        if (typeof current !== "function" || current.__kioskTalkCmd) return;
        function wrapped(text) {
            var expanded = expand(text);
            if (judge(expanded) === "chatter") {
                if (root.console) root.console.log("🚫 잡담으로 판단해 주문을 진행하지 않습니다:", text);
                return;
            }
            var args = Array.prototype.slice.call(arguments);
            args[0] = expanded;
            return current.apply(this, args);
        }
        wrapped.__kioskTalkCmd = true;
        root.processVoiceCommand = wrapped;
        if (root.window) root.window.processVoiceCommand = wrapped;
    }

    function installValid() {
        var current = root.isValidContext;
        if (typeof current !== "function" || current.__kioskTalkValid) return;
        function wrapped(text) {
            var expanded = expand(text);
            var verdict = judge(expanded);
            if (verdict === "chatter") return false;
            if (verdict === "order") return true;
            return current.call(this, expanded);
        }
        wrapped.__kioskTalkValid = true;
        root.isValidContext = wrapped;
        if (root.window) root.window.isValidContext = wrapped;
    }

    function install() {
        dropLegacyGuide();
        installSpeak();
        installCommand();
        installValid();
    }

    var api = {
        lines: lines,
        resolveSpeak: resolveSpeak,
        expand: expand,
        judge: judge,
        shouldSkipWhisper: shouldSkipWhisper,
        install: install,
        dropLegacyGuide: dropLegacyGuide,
        LEGACY_GUIDE: LEGACY_GUIDE
    };

    root.KioskTalk = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;

    if (root.document) {
        install();
        var delays = [0, 800, 2200, 4200];
        for (var i = 0; i < delays.length; i++) {
            root.setTimeout(install, delays[i]);
        }
    }
})(typeof globalThis !== "undefined" ? globalThis : this);
