/* KioskTalk: 22종 관리자 TTS를 화면 대사에 맞추고, 주문/잡담을 먼저 가른다.
   첫 단어 포함 여부로 대사를 고르지 않는다. */
(function (root) {
    const FALLBACK_TTS = [
        { id: "tts_welcome", default: "첫 주문이신가요? 첫 주문이면 키오스크 사용 방식 알려줘 라고 말씀해주세요. 바로 주문하시려면 주문 시작이라고 말씀해주세요." },
        { id: "tts_guide", default: "쉽게 설명해드릴게요. 이 키오스크는 화면을 누르지 않고 말로 주문합니다. 먹고 싶은 메뉴 이름을 말씀하시고, 몇 개 주문할지 수량을 말씀하시면 됩니다. 그 다음 매장인지 포장인지 말하고, 마지막으로 카드 또는 현금이라고 말씀하시면 주문이 끝납니다. 중간에 잘못 골랐으면 이전 화면이라고 말씀하시면 됩니다. 이제 주문을 시작하겠습니다." },
        { id: "tts_cat", default: "저희 매장에는 {0} 카테고리가 있습니다. 무엇을 드시겠습니까?" },
        { id: "tts_cat_add", default: "추가로 주문하실 카테고리를 골라주세요. 추가 주문이 없으시면 결제라고 말씀해주세요." },
        { id: "tts_grid", default: "{0} 등이 있습니다. 어떤 메뉴를 주문하시겠습니까?" },
        { id: "tts_grid_add", default: "어떤 메뉴를 추가하시겠습니까? 위치나 이름으로 말씀해주세요." },
        { id: "tts_taste", default: "오늘의 추천 메뉴는 {0}이고, 제일 맛있는 메뉴는 {1}입니다. 고르실 수 있는 맛은 달콤한 맛, 상큼한 맛, 구수한 맛, 고소한 맛, 얼큰한 맛, 짭짤한 맛이 있습니다. 어떤 맛이 드시고 싶으신가요?" },
        { id: "tts_confirm", default: "선택하신 게 {0} 맞습니까? 맞으면 네, 틀리면 아니요 라고 대답해주세요." },
        { id: "tts_temp", default: "따뜻하게 드시고 싶으시면 따뜻하게, 차갑게 드시고 싶으시면 차갑게 라고 말씀해주세요." },
        { id: "tts_upsell", default: "콜라나 감자튀김을 같이 드시고 싶으시나요? 같이 드시고 싶으시면 네, 햄버거만 드시고 싶으시면 아니요 라고 말씀해주세요." },
        { id: "tts_qty", default: "메뉴 수량을 말씀해주세요." },
        { id: "tts_cup", default: "컵 용량을 말씀해주세요. 이백 밀리리터, 삼백오십 밀리리터, 오백 밀리리터 중에서 말씀하시면 됩니다." },
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

    const SAMPLES = {
        tts_cat: ["국밥, 불고기, 햄버거, 커피, 음료, 디저트"],
        tts_grid: ["돼지국밥 9000원, 순대국밥 9500원, 치즈버거 6900원"],
        tts_taste: ["돼지국밥", "치즈버거"],
        tts_confirm: ["아메리카노"],
        tts_bev_prompt: ["얼음, 당도, 과일 토핑"],
        tts_bev_step: ["얼음"],
        tts_summary: ["12000"]
    };

    const CHATTER_END = /(먹을까|마실까|좋을까|어떨까|할까|갈까|살까|어떄|어때|있지|맛있지|그치)$/;
    const CHATTER_WORD = /근데|있잖아|솔직히|장난|배고프|밥먹자|우리끼리|수다|잡담|어떻게생각해|그니까|그냥얘기|야이거|너뭐해|친구야/;
    const ORDER_WORD = /주문|결제|계산|카드|현금|현찰|포장|매장|메뉴판|메뉴보여|추천|취소|이전|처음|사용법|주세요|해줘|할게요|할게|한개|두개|세개|네개|한잔|두잔|세잔|국밥|버거|커피|라떼|아메|아아|주스|에이드|쉐이크|케이크|아이스크림|콜라|사이다|따뜻|차갑|아이스|핫으로|스몰|미디엄|라지|작은컵|큰컵|달달|달콤|매운|얼큰|상큼|고소|짭짤|구수|세트|단품|확대|소리|음소거|샷|시럽|당도|휘핑|여기서먹|먹고갈|가져갈|들고갈|테이크아웃|첫번째|두번째|왼쪽|오른쪽/;
    const YESNO = /^(네|네네|예|옙|응|어|아니|아니요|아니오|아뇨|아니야|아냐|맞아|맞아요|틀려|틀렸어)$/;

    const WHOLE = [
        [/^(주문할게|주문할게요|주문하자|시작할게|바로주문|주문시작|주문시작해)$/, "주문 시작"],
        [/^(메뉴판|메뉴보여|메뉴보여줘|메뉴뭐있어|뭐있어|뭐가있어|뭐가있어요|음식뭐있어)$/, "메뉴판 보여줘"],
        [/^(추천|추천해|추천해줘|추천해주세요|아무거나|뭐먹지|뭐먹을지모르겠어)$/, "추천해줘"],
        [/^(사용법|사용방법|사용법알려줘|설명서|어떻게써|가이드|처음이라모르겠어)$/, "사용법 알려줘"],
        [/^(포장|포장해|포장해주세요|포장해줘|가져갈게|가져갈게요|들고갈게|들고갈게요|싸줘|테이크아웃|가지고갈게)$/, "포장"],
        [/^(매장|매장에서|여기서먹을게|여기서먹을게요|먹고갈게|먹고갈게요|먹고갈래|안에서먹을게)$/, "매장"],
        [/^(카드|카드로|카드로낼게|카드로낼게요|카드결제|신용카드|체크카드)$/, "카드"],
        [/^(현금|현금으로|현금으로낼게|현찰|돈으로낼게)$/, "현금"],
        [/^(결제|결제할게|결제할게요|계산|계산할게|계산할게요|계산해줘)$/, "결제"],
        [/^(따뜻|따뜻하게|핫|핫으로|뜨겁게|뜨거운거|뜨거운걸로)$/, "따뜻하게"],
        [/^(차갑게|아이스|아이스로|시원하게|시원한거|차갑게해줘)$/, "차갑게"],
        [/^(네|네네|예|옙|응|응응|맞아|맞아요|맞습니다|그래|좋아요|이대로)$/, "네"],
        [/^(아니|아니요|아니오|아뇨|아녀|아니야|아냐|틀려|틀려요|틀렸어)$/, "아니요"],
        [/^(한잔|하나|한개|일잔)$/, "한 개"],
        [/^(두잔|두개|둘|투잔)$/, "두 개"],
        [/^(세잔|세개|셋|석잔)$/, "세 개"],
        [/^(네잔|네개|넷)$/, "네 개"],
        [/^(스몰|작은컵|작은거|작은사이즈|이백|이백밀리|이백밀리리터)$/, "스몰"],
        [/^(미디엄|중간|중간컵|보통사이즈|삼백오십|삼백오십밀리)$/, "미디엄"],
        [/^(라지|큰컵|큰거|큰사이즈|오백|오백밀리)$/, "라지"],
        [/^(달달|달달한|달달한거|단거|달콤|달콤한)$/, "달콤"],
        [/^(새콤|새콤한|상큼|상큼한)$/, "상큼"],
        [/^(매운|매운거|매콤|매콤한|얼큰|얼큰한)$/, "얼큰"],
        [/^(고소|고소한|고소한거)$/, "고소"],
        [/^(짭짤|짭짤한|짠거|짠맛)$/, "짭짤"],
        [/^(구수|구수한|담백|담백한)$/, "구수"]
    ];

    const PHRASES = [
        [/아이스\s*아메리?\s*카노|아메리\s*카\s*노|아메리\s*카노|아메리가노|아메리카너/g, "아메리카노"],
        [/(?<![가-힣])아아(?![가-힣])/g, "아메리카노"],
        [/카페\s*라테|까페라떼|카페라테/g, "카페라떼"],
        [/오랜지\s*주스|오렌지\s*쥬스|오렌지쥬스/g, "오렌지 주스"],
        [/레모네이드|레몬\s*에이드/g, "레몬 에이드"],
        [/치즈\s*케익|치즈케익/g, "치즈 케이크"],
        [/소프트콘|소프트\s*아이스크림/g, "소프트 아이스크림"],
        [/돼지\s*국밥|돼지국빱/g, "돼지국밥"],
        [/순대\s*국밥|순댓국/g, "순대국밥"],
        [/불고기\s*버거|불고기보거/g, "불고기버거"],
        [/치즈\s*버거|치즈보거/g, "치즈버거"],
        [/결재/g, "결제"],
        [/가져\s*갈게(?:요)?|들고\s*갈게(?:요)?|포장\s*해\s*줘|포장해\s*주세요/g, "포장"],
        [/여기서\s*먹을게(?:요)?|먹고\s*갈게(?:요)?/g, "매장"],
        [/카드로\s*낼게(?:요)?|신용\s*카드/g, "카드"],
        [/현금으로\s*낼게(?:요)?|현금으로\s*계산/g, "현금"],
        [/계산\s*할게(?:요)?|계산해\s*줘/g, "결제"],
        [/한\s*잔/g, "한 개"],
        [/두\s*잔/g, "두 개"],
        [/세\s*잔/g, "세 개"],
        [/핫으로|뜨거운\s*거/g, "따뜻하게"],
        [/아이스로|시원하게/g, "차갑게"],
        [/달달한\s*거/g, "달콤"],
        [/매운\s*거/g, "얼큰"]
    ];

    let lastStage = "";
    let stageArmed = true;

    function read(name) {
        try { return root[name]; } catch (e) { return undefined; }
    }

    function stageNow() {
        let s = "";
        try { s = String(typeof currentStageName !== "undefined" ? currentStageName : ""); }
        catch (e) { s = ""; }
        if (!s) s = String(read("currentStageName") || "");
        if (s !== lastStage) {
            lastStage = s;
            stageArmed = true;
        }
        return s;
    }

    function menus() {
        try {
            if (typeof customMenus !== "undefined" && Array.isArray(customMenus)) return customMenus;
        } catch (e) {}
        const fromRoot = read("customMenus");
        return Array.isArray(fromRoot) ? fromRoot : [];
    }

    function flag(name) {
        try {
            if (name === "isAddOnPhase" && typeof isAddOnPhase !== "undefined") return !!isAddOnPhase;
        } catch (e) {}
        return !!read(name);
    }

    function compact(text) {
        return String(text || "").toLowerCase().replace(/[\s.,?!'"~]/g, "");
    }

    function configList() {
        const live = read("ALL_TTS_CONFIG");
        return Array.isArray(live) && live.length ? live : FALLBACK_TTS;
    }

    function storedLine(id) {
        let saved = null;
        try {
            const ls = root.localStorage;
            if (ls && typeof ls.getItem === "function") saved = ls.getItem(id);
        } catch (e) {}
        if (saved == null || String(saved).trim() === "") return "";
        return String(saved);
    }

    function defaultLine(id) {
        const row = configList().find(function (r) { return r.id === id; });
        return row ? String(row.default || "") : "";
    }

    function applyVars(template, vars) {
        let out = String(template || "");
        const list = vars || [];
        for (let i = 0; i < list.length; i++) {
            out = out.split("{" + i + "}").join(list[i] == null ? "" : String(list[i]));
        }
        return out;
    }

    function liveCats() {
        const cats = [];
        menus().forEach(function (m) {
            if (m && m.category && cats.indexOf(m.category) < 0) cats.push(m.category);
        });
        return cats.join(", ") || SAMPLES.tts_cat[0];
    }

    function liveGrid() {
        let list = [];
        try {
            if (typeof currentGridMenus !== "undefined" && Array.isArray(currentGridMenus) && currentGridMenus.length) {
                list = currentGridMenus;
            }
        } catch (e) {}
        if (!list.length) list = menus();
        const parts = list.slice(0, 5).map(function (m) {
            const price = m && m.price ? Number(m.price).toLocaleString("ko-KR") : "";
            return price ? (m.name + " " + price + "원") : (m && m.name ? m.name : "");
        }).filter(Boolean);
        return parts.join(", ") || SAMPLES.tts_grid[0];
    }

    function liveTaste() {
        const list = menus();
        const a = list[0] && list[0].name ? list[0].name : SAMPLES.tts_taste[0];
        const b = list[1] && list[1].name ? list[1].name : SAMPLES.tts_taste[1];
        return [a, b];
    }

    function liveConfirm() {
        try {
            if (typeof pendingMenuName !== "undefined" && pendingMenuName) return String(pendingMenuName);
        } catch (e) {}
        try {
            if (typeof tempItem !== "undefined" && tempItem && tempItem.item) return String(tempItem.item);
        } catch (e) {}
        return SAMPLES.tts_confirm[0];
    }

    function liveOptionName() {
        try {
            if (typeof optionList !== "undefined" && typeof optionStepIndex !== "undefined" && optionList[optionStepIndex]) {
                return optionList[optionStepIndex].name || "얼음";
            }
        } catch (e) {}
        return "얼음";
    }

    function liveSum() {
        try {
            if (typeof orderState !== "undefined" && orderState && Array.isArray(orderState.items)) {
                let sum = 0;
                orderState.items.forEach(function (i) {
                    const menu = menus().find(function (m) { return m.name === i.item; });
                    const price = menu ? Number(menu.price) || 0 : 0;
                    sum += price * (Number(i.count) || 1);
                });
                if (sum > 0) return String(sum);
            }
        } catch (e) {}
        return SAMPLES.tts_summary[0];
    }

    function capture(id, text) {
        const t = String(text || "");
        if (id === "tts_cat") {
            const m = t.match(/에는\s*(.*?)\s*카테고리/);
            return [m && m[1] ? m[1] : liveCats()];
        }
        if (id === "tts_grid") {
            const m = t.match(/^(.*?)\s*등이 있습니다/);
            return [m && m[1] ? m[1] : liveGrid()];
        }
        if (id === "tts_taste") {
            const m = t.match(/추천 메뉴는\s*(.*?)이고,\s*제일 맛있는 메뉴는\s*(.*?)입니다/);
            if (m) return [m[1], m[2]];
            return liveTaste();
        }
        if (id === "tts_confirm") {
            const m = t.match(/선택하신\s*(?:게|메뉴가)?\s*(.*?)\s*맞/);
            return [m && m[1] ? m[1] : liveConfirm()];
        }
        if (id === "tts_bev_prompt") {
            const m = t.match(/^(.*?)\s*양을 조절/);
            return [m && m[1] ? m[1] : SAMPLES.tts_bev_prompt[0]];
        }
        if (id === "tts_bev_step") {
            const m = t.match(/^(.*?),\s*1단계부터/);
            return [m && m[1] ? m[1] : liveOptionName()];
        }
        if (id === "tts_summary") {
            const m = t.match(/총\s*(?:금액|합계)은?\s*([0-9,]+)\s*원/);
            return [m && m[1] ? m[1] : liveSum()];
        }
        return SAMPLES[id] ? SAMPLES[id].slice() : [];
    }

    function line(id, text) {
        const template = storedLine(id) || defaultLine(id);
        if (!template) return "";
        return applyVars(template, capture(id, text));
    }

    function matchAnchor(text) {
        const t = String(text || "");
        if (/카테고리가 있습니다/.test(t)) return "tts_cat";
        if (/추가로 주문하실 카테고리/.test(t)) return "tts_cat_add";
        if (/등이 있습니다/.test(t) && /어떤 메뉴를 주문/.test(t)) return "tts_grid";
        if (/어떤 메뉴를 추가하시겠/.test(t)) return "tts_grid_add";
        if (/달콤한 맛/.test(t) && /짭짤한 맛/.test(t) && /추천 메뉴|고르기 어려|맛이 드시|어떤 맛/.test(t)) return "tts_taste";
        if (/선택하신/.test(t) && /맞(?:습니까|으신가요|나요)/.test(t)) return "tts_confirm";
        if (/따뜻하게/.test(t) && /차갑게/.test(t)) return "tts_temp";
        if (/콜라/.test(t) && /감자|세트|햄버거만/.test(t)) return "tts_upsell";
        if (/수량을 말씀|몇 개를 주문하실지/.test(t)) return "tts_qty";
        if (/컵/.test(t) && /사이즈|용량|밀리|스몰|라지/.test(t)) return "tts_cup";
        if (/샷/.test(t) && /시럽/.test(t) && /조절/.test(t)) return "tts_bev_prompt2";
        if (/양을 조절하고 싶으시다면/.test(t)) return "tts_bev_prompt";
        if (/1단계부터 5단계/.test(t)) return "tts_bev_step";
        if (/음료가 완성|이대로 주문하시겠/.test(t)) return "tts_bev_result";
        if (/추가하실 메뉴가 있|다른 메뉴를 더 추가/.test(t)) return "tts_add_more";
        if (/포장/.test(t) && /드시|먹을래|들고/.test(t)) return "tts_place";
        if (/총 금액은|주문하신 총|총 합계/.test(t)) return "tts_summary";
        if (/카드/.test(t) && /현금/.test(t) && /결제/.test(t)) return "tts_payment";
        if (/투입/.test(t)) return "tts_insert";
        if (/맛있게 드세요/.test(t)) return "tts_done";
        if (/쉽게 설명|말로 주문|키오스크 사용 방식/.test(t) && t.length > 40) return "tts_guide";
        if (/첫 주문|주문을 시작하시겠|주문을 시작하시려면/.test(t) && /주문/.test(t) && !/무엇을 드시/.test(t)) return "tts_welcome";
        return "";
    }

    function stageLine(stage) {
        if (stage === "category_select") return flag("isAddOnPhase") ? "tts_cat_add" : "tts_cat";
        if (stage === "menu_grid") return flag("isAddOnPhase") ? "tts_grid_add" : "tts_grid";
        if (stage === "beverage_option_prompt") {
            try {
                const item = (typeof tempItem !== "undefined" && tempItem) ? tempItem.item : "";
                const menu = menus().find(function (m) { return m.name === item; });
                if (menu && menu.category === "커피") return "tts_bev_prompt2";
            } catch (e) {}
            return "tts_bev_prompt";
        }
        const map = {
            welcome: "tts_welcome",
            guide: "tts_guide",
            taste_select_prompt: "tts_taste",
            menu_confirm: "tts_confirm",
            temp: "tts_temp",
            upsell: "tts_upsell",
            quantity: "tts_qty",
            cup_size: "tts_cup",
            beverage_option_step: "tts_bev_step",
            beverage_result: "tts_bev_result",
            add_more_prompt: "tts_add_more",
            place: "tts_place",
            summary: "tts_summary",
            payment: "tts_payment",
            guidance: "tts_insert",
            done: "tts_done"
        };
        return map[stage] || "";
    }

    function isSideComment(text) {
        return /^(네[,.]|아니요|다시 한 번|다시 한번|현재 |비밀번호|소리를 |화면을 |추천 기능|바로 결제|키오스크 사용법 안내를 마칩니다)/.test(String(text || "").trim());
    }

    function resolveSpeak(text) {
        const raw = String(text || "");
        if (!raw.trim()) return raw;
        if (root.__kioskTTSBypass) return raw;
        const stage = stageNow();
        const anchored = matchAnchor(raw);
        if (anchored) {
            stageArmed = false;
            return line(anchored, raw) || raw;
        }
        const id = stageLine(stage);
        if (stageArmed && id && raw.trim().length >= 12 && !isSideComment(raw)) {
            stageArmed = false;
            return line(id, raw) || raw;
        }
        return raw;
    }

    function previewLine(id, raw) {
        const template = String(raw || "").trim() || defaultLine(id);
        const vars = capture(id, template);
        const samples = SAMPLES[id] || [];
        const filled = vars.map(function (v, i) {
            if (v && String(v).indexOf("{") === -1) return v;
            return samples[i] || v || "";
        });
        return applyVars(template, filled.length ? filled : samples);
    }

    function judge(text) {
        const c = compact(text);
        if (!c) return { kind: "chatter", score: -1, compact: c };
        if (YESNO.test(c)) return { kind: "order", score: 5, compact: c };
        const asksFriend = CHATTER_END.test(c);
        const hasOrder = ORDER_WORD.test(c) || menuHit(c);
        if (asksFriend && !/주세요|해줘|할게요|할게|주문시작/.test(c)) {
            return { kind: "chatter", score: -6, compact: c };
        }
        if (CHATTER_WORD.test(c) && !hasOrder) return { kind: "chatter", score: -4, compact: c };
        if (hasOrder) return { kind: "order", score: 4, compact: c };
        if (c.length >= 18) return { kind: "chatter", score: -2, compact: c };
        return { kind: "unknown", score: 0, compact: c };
    }

    function menuHit(c) {
        const list = menus();
        for (let i = 0; i < list.length; i++) {
            const name = compact(list[i] && list[i].name);
            if (name && name.length >= 2 && c.indexOf(name) >= 0) return true;
        }
        return /국밥|버거|라떼|아메|주스|콜라|사이다|케이크|아이스크림|에이드|쉐이크|불고기|수육/.test(c);
    }

    function expand(text) {
        let t = String(text || "").replace(/\s+/g, " ").trim();
        if (!t) return t;
        const c = compact(t);
        for (let i = 0; i < WHOLE.length; i++) {
            if (WHOLE[i][0].test(c)) return WHOLE[i][1];
        }
        for (let i = 0; i < PHRASES.length; i++) {
            PHRASES[i][0].lastIndex = 0;
            t = t.replace(PHRASES[i][0], PHRASES[i][1]);
        }
        return t.replace(/\s+/g, " ").trim();
    }

    function install() {
        if (root.__kioskTalkInstalled) return;
        root.__kioskTalkInstalled = true;

        let prevValid = null;
        try { prevValid = typeof isValidContext === "function" ? isValidContext : null; } catch (e) {}
        if (!prevValid && typeof root.isValidContext === "function") prevValid = root.isValidContext;
        if (typeof prevValid === "function" && !prevValid.__kioskTalk) {
            const wrappedValid = function (text) {
                const judged = api.judge(text);
                if (judged.kind === "chatter") return false;
                if (judged.kind === "order") return true;
                return prevValid(text);
            };
            wrappedValid.__kioskTalk = true;
            try { isValidContext = wrappedValid; } catch (e) {}
            root.isValidContext = wrappedValid;
        }

        let prevCmd = null;
        try { prevCmd = typeof processVoiceCommand === "function" ? processVoiceCommand : null; } catch (e) {}
        if (!prevCmd && typeof root.processVoiceCommand === "function") prevCmd = root.processVoiceCommand;
        if (typeof prevCmd === "function" && !prevCmd.__kioskTalk) {
            const wrappedCmd = function (text) {
                const judged = api.judge(text);
                if (judged.kind === "chatter") {
                    console.log("잡담으로 판단해 무시:", text);
                    return { ignored: true, reason: "chatter" };
                }
                const expanded = api.expand(text);
                return prevCmd.call(this, expanded);
            };
            wrappedCmd.__kioskTalk = true;
            try { processVoiceCommand = wrappedCmd; } catch (e) {}
            root.processVoiceCommand = wrappedCmd;
        }
        try {
            const legacyGuide = "쉽게 설명해드릴게요. 이 키오스크는 말로 주문합니다. 글씨가 작으면 화면 확대, 기기 소리가 작으면 소리 키워 라고 말씀해주세요. 이용 중 뭘 해야 할지 모를 때는 설명해 줘 라고 말씀하시면 화면을 안내해 드립니다. 자, 원하시는 메뉴를 말씀해주세요.";
            if (root.localStorage && root.localStorage.getItem("tts_guide") === legacyGuide) {
                root.localStorage.removeItem("tts_guide");
            }
        } catch (e) {}
        try {
            if (typeof showWelcomeScreen === "function") showWelcomeScreen();
        } catch (e) {}
        console.log("KioskTalk 준비: 22종 TTS, 주문/잡담 빠른 판단");
    }

    const api = {
        judge: judge,
        expand: expand,
        resolveSpeak: resolveSpeak,
        previewLine: previewLine,
        install: install
    };
    root.KioskTalk = api;

    if (root.document) {
        if (root.document.readyState === "loading") {
            root.document.addEventListener("DOMContentLoaded", install);
        } else {
            install();
        }
    }
})(typeof window !== "undefined" ? window : globalThis);
