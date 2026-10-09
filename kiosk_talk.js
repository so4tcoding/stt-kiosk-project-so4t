/**
 * 관리자 22종 TTS를 단계 안내에 연결하고,
 * 주문 말과 잡담을 한 번에 가른다.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    root.KioskTalk = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    const LINES = [
        { id: "tts_welcome", default: "첫 주문이신가요? 첫 주문이면 키오스크 사용 방식 알려줘 라고 말씀해주세요. 바로 주문하시려면 주문 시작이라고 말씀해주세요." },
        { id: "tts_guide", default: "쉽게 설명해드릴게요. 주문은 메뉴 이름으로 합니다. 글씨가 작으면 화면 확대, 소리가 작으면 소리 키워 라고 말씀해 주세요." },
        { id: "tts_cat", default: "저희 매장에는 {0} 카테고리가 있습니다. 무엇을 드시겠습니까?" },
        { id: "tts_cat_add", default: "추가로 주문하실 카테고리를 골라주세요. 추가 주문이 없으시면 결제라고 말씀해주세요." },
        { id: "tts_grid", default: "{0} 등이 있습니다. 어떤 메뉴를 주문하시겠습니까?" },
        { id: "tts_grid_add", default: "어떤 메뉴를 추가하시겠습니까? 위치나 이름으로 말씀해주세요." },
        { id: "tts_taste", default: "골라 주세요. 달콤, 상큼, 구수, 고소, 얼큰, 짭짤입니다. 오늘의 추천 메뉴는 {0}이고, 제일 맛있는 메뉴는 {1}입니다." },
        { id: "tts_confirm", default: "선택하신 게 {0} 맞습니까? 맞으면 네, 틀리면 아니요 라고 대답해주세요." },
        { id: "tts_temp", default: "따뜻하게 드시고 싶으시면 따뜻하게, 차갑게 드시고 싶으시면 차갑게 라고 말씀해주세요." },
        { id: "tts_upsell", default: "세트로 하시려면 세트, 햄버거만이면 단품이라고 말씀해 주세요." },
        { id: "tts_qty", default: "메뉴 수량을 말씀해주세요." },
        { id: "tts_cup", default: "작은 잔, 중간 잔, 큰 잔 중에서 말씀해 주세요." },
        { id: "tts_bev_prompt2", default: "커피 샷 추가, 시럽, 얼음 양을 조절하고 싶으시다면 네, 추가할 게 없으시다면 아니요라고 해주세요." },
        { id: "tts_bev_prompt", default: "{0} 양을 조절하고 싶으시다면 네, 추가할 게 없으시다면 아니요라고 해주세요." },
        { id: "tts_bev_step", default: "{0}, 1단계부터 5단계까지 조절 하실 수 있습니다. 몇 단계로 할까요?" },
        { id: "tts_bev_result", default: "선택하신 옵션으로 음료가 완성되었습니다. 이대로 주문하시겠습니까?" },
        { id: "tts_add_more", default: "추가하실 메뉴가 있습니까. 있으면 네, 없으면 아니요 라고 말씀해주세요." },
        { id: "tts_place", default: "여기서 드시고 가시나요, 아니면 포장해서 들고 가시나요? 여기서 먹을래요, 또는 들고 갈래요 라고 말씀해주세요." },
        { id: "tts_summary", default: "주문하신 총 금액은 {0}원입니다. 맞으시면 결제라고 말씀해주세요." },
        { id: "tts_payment", default: "카드로 결제 하실려면 네, 현금으로 결제하실려면 아니요 라고 말씀해주세요." },
        { id: "tts_insert", default: "기기 아래쪽에 결제 수단을 투입해 주세요." },
        { id: "tts_done", default: "감사합니다. 맛있게 드세요." }
    ];

    function compact(text) {
        return String(text || "")
            .toLowerCase()
            .replace(/[.,?!'"“”~…。！？]/g, "")
            .replace(/\s+/g, "");
    }

    function tidy(text) {
        return String(text || "").replace(/\s+/g, " ").trim();
    }

    function hasMenu(text, menus) {
        const s = compact(text);
        const list = Array.isArray(menus) ? menus : [];
        for (let i = 0; i < list.length; i++) {
            const name = compact(list[i] && list[i].name);
            if (name.length >= 2 && s.indexOf(name) !== -1) return true;
        }
        return false;
    }

    function lineOf(lines, id) {
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].id === id) return lines[i];
        }
        return null;
    }

    function fill(template, vars) {
        let out = String(template || "");
        (vars || []).forEach(function (value, index) {
            out = out.split("{" + index + "}").join(value == null ? "" : String(value));
        });
        return out;
    }

    function resolveSpeak(text, ctx) {
        const context = ctx || {};
        if (context.raw) return text;
        const raw = String(text == null ? "" : text);
        const spoken = tidy(raw);
        if (!spoken) return raw;

        const lines = Array.isArray(context.lines) && context.lines.length ? context.lines : LINES;
        const stage = String(context.stage || "");
        const saved = typeof context.saved === "function" ? context.saved : function () { return ""; };

        function say(id, vars) {
            const rule = lineOf(lines, id);
            if (!rule) return raw;
            let custom = "";
            try { custom = String(saved(id) || ""); } catch (e) { custom = ""; }
            const template = custom.trim() ? custom : rule.default;
            return fill(template, vars || []);
        }

        if ((stage === "welcome" || stage === "sleep" || stage === "idle") &&
            /^메뉴 이름을 말씀해 주세요\.?$/.test(spoken)) {
            return say("tts_welcome");
        }

        const rules = [
            { id: "tts_bev_prompt2", re: /커피 샷 추가, 시럽, 얼음/ },
            { id: "tts_bev_prompt", re: /^(.+?) 양을 조절하고 싶으시다면 네/ },
            { id: "tts_bev_step", re: /^(.+?), 1단계부터 5단계까지/ },
            { id: "tts_cat", re: /저희 매장에는 (.+?) 카테고리가 있습니다/ },
            { id: "tts_cat", re: /현재 메뉴 종류는 (.+?) 입니다/ },
            { id: "tts_cat", re: /메뉴 종류는 (.+?) 입니다/ },
            { id: "tts_cat_add", re: /추가로 주문하실 카테고리/ },
            { id: "tts_grid_add", re: /추가하실 메뉴 이름을 말씀|어떤 메뉴를 추가하시겠습니까/ },
            { id: "tts_grid", re: /^(.+?) 등이 있습니다\. 어떤 메뉴를 주문하시겠습니까/ },
            { id: "tts_taste", re: /오늘의 추천 메뉴는 (.+?)이고, 제일 맛있는 메뉴는 (.+?)입니다/ },
            { id: "tts_confirm", re: /선택하신 게 (.+?) 맞습니까/ },
            { id: "tts_confirm", re: /선택하신 메뉴는 (.+?)입니다/ },
            { id: "tts_summary", re: /총 금액은\s*([0-9,]+)\s*원/ },
            { id: "tts_welcome", re: /첫 주문이신가요|고객님,\s*반갑습니다|첫 주문이면 키오스크 사용 방식/ },
            { id: "tts_guide", re: /쉽게 설명해드릴게요/ },
            { id: "tts_temp", re: /따뜻하게 드시고 싶으시면|따뜻하게 드시면/ },
            { id: "tts_upsell", re: /세트로 하시려면/ },
            { id: "tts_qty", re: /^메뉴 수량을 말씀해주세요|^몇 (?:잔|개|그릇)인지 말씀해 주세요/ },
            { id: "tts_cup", re: /작은 잔, 중간 잔, 큰 잔|컵 사이즈를 스몰/ },
            { id: "tts_bev_result", re: /선택하신 옵션으로 음료가 완성/ },
            { id: "tts_add_more", re: /추가하실 메뉴가 있습니까|다른\s+.+?[이가]\s*있으면 네|더 주문하시려면/ },
            { id: "tts_place", re: /여기서 드시고 가시나요|여기서 드실지/ },
            { id: "tts_payment", re: /카드로 결제|결제 방식은/ },
            { id: "tts_insert", re: /기기 아래쪽에 결제 수단/ },
            { id: "tts_done", re: /^감사합니다\.?\s*맛있게 드세요/ }
        ];

        for (let i = 0; i < rules.length; i++) {
            const rule = rules[i];
            const match = spoken.match(rule.re);
            if (!match) continue;
            if (rule.id === "tts_grid" && /추가하실 메뉴/.test(spoken)) continue;
            if (rule.id === "tts_cat" && /추가로 주문하실 카테고리/.test(spoken)) continue;
            if (rule.id === "tts_summary" && /장바구니에 추가/.test(spoken)) continue;
            return say(rule.id, match.slice(1));
        }

        if (/골라 주세요\. 달콤|고르실 수 있는 맛은 달콤/.test(spoken)) {
            const menus = Array.isArray(context.menus) ? context.menus : [];
            const first = (menus[0] && menus[0].name) || "치즈버거";
            const second = (menus[1] && menus[1].name) || "오렌지 주스";
            return say("tts_taste", [first, second]);
        }

        if (/맞으면 ['"]?맞아['"]?라고/.test(spoken)) {
            return say("tts_confirm", [context.pendingMenu || "이 메뉴"]);
        }

        return raw;
    }

    function judge(text, menus) {
        const raw = tidy(text);
        const c = compact(raw);
        if (!c) return { kind: "pass", reason: "empty", order: 0, chat: 0 };

        if (/^(어|음|아|오|으|음음)$/.test(c)) {
            return { kind: "chat", reason: "filler", order: 0, chat: 2 };
        }

        if (/^(네|내|예|넵|옙|응|웅|네네|응응|맞아|맞아요|맞습니다|좋아요|좋아|오케이|오키|ok|이대로|그대로|아니요|아니오|아니|아니야|아뇨|노)$/.test(c)) {
            return { kind: "order", reason: "yesno", order: 3, chat: 0 };
        }

        let order = 0;
        let chat = 0;

        if (/(우리|너|야)/.test(c) && /(먹을래|마실래|먹자|마시자)/.test(c) &&
            !/주세요|주문|한개|한잔|두잔|하나|두그릇/.test(c)) {
            return { kind: "chat", reason: "between", order: 0, chat: 4 };
        }

        if (hasMenu(raw, menus)) order += 3;
        if (/국밥|불고기|햄버거|버거|아메리카노|라떼|카페라떼|에이드|주스|케이크|아이스크림|콜라|사이다|메뉴판|추천|아무거나|인기메뉴|잘나가는|주문시작|주문할게|주문할래|시킬게|포장|테이크아웃|가져갈|들고갈|매장|먹고갈|결제|계산|신용카드|체크카드|현금|현찰|세트|단품|따뜻|차갑|아이스|핫으로|스몰|미디엄|라지|작은잔|중간잔|큰잔|컵사이즈|샷|시럽|당도|휘핑|한개|두개|세개|네개|한잔|두잔|세잔|한그릇|두그릇|사용법|화면확대|글씨크게|소리크게|안보여|안들려|이전|처음으로|취소|첫번째|두번째|세번째|오른쪽|왼쪽|단계/.test(c)) {
            order += 3;
        }
        if (/^카드(요|로요|로할게요|결제)?$/.test(c) || /카드로|카드결제/.test(c)) order += 3;
        if (/주세요|부탁|담아|주문/.test(c)) order += 2;

        if (/영화|드라마|게임할|학교|회사|출근|퇴근|전화왔|카톡|날씨|춥다|더워|졸려|자기야|여보/.test(c) &&
            !/주세요|주문|결제|포장|매장|한개|한잔|두잔/.test(c)) {
            return { kind: "chat", reason: "leisure", order: order, chat: 4 };
        }

        if (/(우리|너|야)/.test(c) && /(먹자|마시자|갈까|볼까|했지|했잖아|어디야|몇시)/.test(c) &&
            !/주세요|주문|결제|한개|한잔|두잔/.test(c)) {
            chat += 4;
        }
        if (/ㅋㅋ|ㅎㅎ|대박|헐|엄마|아빠|밥먹었|밥먹음/.test(c)) chat += 2;
        if (/먹었어|먹을래|마실래|뭐먹을까/.test(c) && !/주세요|주문|한개|한잔|두잔|포장|결제/.test(c)) chat += 3;

        let kind = "pass";
        if (chat >= 3 && order < 3) kind = "chat";
        else if (chat >= 4 && !/주세요|주문시작|결제|포장해/.test(c)) kind = "chat";
        else if (order >= 3) kind = "order";
        else if (chat >= 2 && order === 0) kind = "chat";

        return { kind: kind, reason: kind, order: order, chat: chat };
    }

    function expand(text, stage, menus) {
        const raw = tidy(text);
        const c = compact(raw);
        const name = String(stage || "");
        if (!c) return raw;

        const alias = {
            "아아": "아이스 아메리카노",
            "아아요": "아이스 아메리카노",
            "아아주세요": "아이스 아메리카노",
            "아아하나": "아이스 아메리카노 한 개",
            "뜨아": "따뜻한 아메리카노",
            "뜨아요": "따뜻한 아메리카노",
            "아메": "아메리카노",
            "치케": "치즈 케이크",
            "치즈케익": "치즈 케이크",
            "소프트콘": "소프트 아이스크림"
        };
        if (alias[c]) return alias[c];

        if (name === "welcome" || name === "sleep" || name === "idle") {
            if (/사용법|사용방식|처음이야|어떻게써|가이드/.test(c)) return "사용법 알려줘";
            if (/주문할게|주문할래|주문시작|바로주문|시킬게|시작할게/.test(c)) return "주문 시작";
        }

        const recommendStages = {
            welcome: 1, category_select: 1, menu_grid: 1, add_more_prompt: 1, open_order_prompt: 1
        };
        if (recommendStages[name] && !hasMenu(raw, menus) &&
            /아무거나|인기메뉴|인기있는|잘나가는|뭐가맛있|맛있는거|결정장애|추천/.test(c)) {
            return "추천해줘";
        }

        if (name === "place" || name === "takeout" || name === "dining_option") {
            if (/포장|가져갈|들고갈|테이크아웃|싸갈|싸주|가져가/.test(c)) return "포장";
            if (/매장|여기서먹|먹고갈|안에서먹|앉아서|자리/.test(c)) return "매장";
        }

        if (name === "payment") {
            if (/카드|체크|신용/.test(c) && !/현금/.test(c)) return "카드";
            if (/현금|현찰|돈으로/.test(c)) return "현금";
        }

        if (name === "temp") {
            if (/따뜻|뜨겁|핫|hot/.test(c)) return "따뜻하게";
            if (/차갑|시원|아이스|얼음|ice/.test(c)) return "아이스";
        }

        if (name === "upsell") {
            if (/단품|버거만|세트없이|세트말고/.test(c)) return "단품";
            if (/세트/.test(c)) return "세트";
        }

        if (name === "cup_size" || name === "size_select") {
            if (/그란데|벤티|라지|큰잔|큰거|오백|500/.test(c)) return "큰 잔";
            if (/숏|스몰|작은잔|작은거|이백|200/.test(c)) return "작은 잔";
            if (/톨|레귤러|미디엄|미디움|중간잔|보통잔|삼백오십|350/.test(c)) return "중간 잔";
        }

        if ((name === "quantity" || name === "summary_add_quantity") && !hasMenu(raw, menus)) {
            if (/^(하나|한개|한잔|한그릇|원)(이)?요?$/.test(c)) return "한 개";
            if (/^(둘|두개|두잔|두그릇|투)(이)?요?$/.test(c)) return "두 개";
            if (/^(셋|세개|세잔|세그릇|쓰리)(이)?요?$/.test(c)) return "세 개";
            if (/^(넷|네개|네잔)(이)?요?$/.test(c)) return "네 개";
        }

        const yesStages = {
            welcome: 1, menu_confirm: 1, temp: 1, upsell: 1, beverage_option_prompt: 1,
            beverage_result: 1, add_more_prompt: 1, summary: 1, payment: 1
        };
        if (yesStages[name]) {
            if (/^(그래|그래요|웅|응응|네네|오키|오케이|ok|좋아|좋아요|맞아|맞아요|그걸로|그거요|이대로|알겠어|알겠어요)$/.test(c)) return "네";
            if (/^(싫어|싫어요|아니|아니야|아뇨|아니요|노|노노|됐어|필요없어|필요없어요|없어|없어요)$/.test(c)) {
                if (name === "beverage_result" && /됐어|없어요/.test(c)) return raw;
                return "아니요";
            }
        }

        return raw;
    }

    return {
        lines: LINES,
        compact: compact,
        resolveSpeak: resolveSpeak,
        judge: judge,
        expand: expand
    };
});
