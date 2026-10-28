/*
  관리자창 22개 TTS를 화면 대사로 쓰고, 주문/잡담을 먼저 가른다.
  첫 단어로 대사를 고르지 않는다. 저장한 문장이 있으면 그 문장, 없으면 기본 문장.
*/
(function (root, factory) {
    var api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (typeof window !== "undefined") {
        window.KioskTalk = api;
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { api.install(); });
        else api.install();
    }
})(typeof window !== "undefined" ? window : this, function () {
    var LEGACY_GUIDE = "쉽게 설명해드릴게요. 이 키오스크는 말로 주문합니다. 글씨가 작으면 화면 확대, 기기 소리가 작으면 소리 키워 라고 말씀해주세요. 이용 중 뭘 해야 할지 모를 때는 설명해 줘 라고 말씀하시면 화면을 안내해 드립니다. 자, 원하시는 메뉴를 말씀해주세요.";
    var LEGACY_FLAG = "kiosk_tts_guide_legacy_removed_v1";

    var LINES = [
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

    var ANCHORS = [
        { id: "tts_guide", re: /쉽게 설명해드릴게요|화면을 누르지 않고 말로 주문합니다|글씨가 작으면 화면 확대/ },
        { id: "tts_welcome", re: /첫 주문이신가요|고객님,\s*반갑습니다|키오스크 사용법이 궁금하시면|첫 주문이면 키오스크 사용 방식 알려줘|바로 주문하시려면 주문 시작|주문을 시작하시려면 주문 시작이라고/ },
        { id: "tts_cat_add", re: /추가로 주문하실 카테고리/ },
        { id: "tts_cat", re: /저희 매장에는\s*(.+?)\s*카테고리가 있습니다/, vars: function (m) { return m[1] ? [cleanVar(m[1])] : []; } },
        { id: "tts_grid_add", re: /어떤 메뉴를 추가하시겠/ },
        { id: "tts_grid", re: /(.+?)\s*등이 있습니다\.\s*어떤 메뉴를 주문/, vars: function (m) { return m[1] ? [cleanVar(m[1])] : []; } },
        { id: "tts_taste", re: /오늘의 추천 메뉴는\s*(.+?)이고,\s*제일 맛있는 메뉴는\s*(.+?)입니다|메뉴를 고르기 어려우신가요|어떤 맛이 드시고 싶으신가요|달콤한 맛, 상큼한 맛, 구수한 맛, 고소한 맛, 얼큰한 맛, 짭짤한 맛 중에서/, vars: function (m) { return m[1] && m[2] ? [cleanVar(m[1]), cleanVar(m[2])] : []; } },
        { id: "tts_confirm", re: /선택하신 게\s*(.+?)\s*맞습니까|선택하신 메뉴는\s*(.+?)입니다|맞으면\s*['"]?맞아['"]?라고 말씀해주세요/, vars: function (m) { return [m[1] || m[2]].filter(Boolean).map(cleanVar); } },
        { id: "tts_temp", re: /따뜻하게 드시고 싶으시면 따뜻하게|따뜻하게 드시면\s*['"]?따뜻하게['"]?/ },
        { id: "tts_upsell", re: /콜라나 감자튀김|세트로 하시려면\s*['"]?세트['"]?/ },
        { id: "tts_qty", re: /메뉴 수량을 말씀해주세요|몇 개를 주문하실지 수량|수량을 정확히 말씀해주세요/ },
        { id: "tts_cup", re: /컵 용량을|컵 사이즈를 스몰|이백 밀리리터, 삼백오십 밀리리터, 오백 밀리리터/ },
        { id: "tts_bev_prompt2", re: /커피 샷 추가, 시럽/ },
        { id: "tts_bev_prompt", re: /(.+?)\s*양을 조절하고 싶으시다면 네|옵션을 조절하시려면/, vars: function (m) { return m[1] ? [cleanVar(m[1])] : []; }, idFor: function (m, ctx) {
            if (m[0] && m[0].indexOf("옵션을 조절") !== -1 && isCoffee(ctx)) return "tts_bev_prompt2";
            return "tts_bev_prompt";
        } },
        { id: "tts_bev_step", re: /^(.*?),\s*1단계부터 5단계까지|1단계부터 5단계까지/, vars: function (m) { return m[1] ? [cleanVar(m[1])] : []; } },
        { id: "tts_bev_result", re: /선택하신 옵션으로 음료가 완성|이대로 주문하시려면/ },
        { id: "tts_add_more", re: /추가하실 메뉴가 있습니까|더 주문하시려면/ },
        { id: "tts_place", re: /여기서 드시고 가시나요|여기서 드실지, 들고 가실지/ },
        { id: "tts_summary", re: /주문하신 총 금액은\s*(.+?)원입니다|결제하시려면\s*['"]?결제['"]?라고 말씀해주세요\.\s*바꾸고 싶으면/, vars: function (m) { return m[1] ? [cleanVar(m[1])] : []; } },
        { id: "tts_payment", re: /카드로 결제 하실려면 네|결제 방식은/ },
        { id: "tts_insert", re: /기기 아래쪽에 결제 수단을 투입/ },
        { id: "tts_done", re: /맛있게 드세요/ }
    ];

    var YES_RE = /^(네|내|예|넵|옙|응|응응|어응|맞아|맞어|맞아요|맞습니다|틀려|틀렸어|아니|아니요|아니오|아니야|아냐|아뇨|좋아|오케이|오키)$/;
    var FILLER_RE = /^(어|음|아|오|으|그|헐|와|엥|어어|음음)$/;
    var FRIEND_RE = /(먹을까|좋을까|할까|어때|어떨까|먹지말|시키지말|어떻게생각|있잖아|솔직히|배고파|배고프|밥먹자|밥먹으러|밥먹고|카드게임|게임하자|게임할|카톡|인스타|유튜브|영화보|심심|잡담|수다|우리끼리|어제뭐|학교갔|집에가자|ㅋㅋ|ㅎㅎ|왜냐|거든$|더라고|잠깐만|이거봐|야너|너네|너희|친구야)/;
    var COMMAND_RE = /(주세요|할게요|해줘|해주|주문|결제|계산|포장|매장|취소|이전|처음)/;
    var ORDER_RE = /주문|결제|계산|결재|카드|현금|포장|매장|메뉴|국밥|국바|버거|아메리카노|라떼|카페|커피|콜라|사이다|케이크|아이스크림|주스|에이드|불고기|순대|수육|디저트|음료|추천|수량|한개|두개|세개|네개|다섯|하나|둘|셋|넷|한잔|두잔|세잔|한그릇|두그릇|한공기|따뜻|차갑|뜨겁|시원|아이스|핫|세트|단품|이전|처음|취소|확대|소리|스몰|미디엄|라지|밀리|단계|시럽|샷|얼음|당도|들고갈|가져갈|먹고갈|싸갈|돈낼|체크|신용|맞아|틀려|추가|빼줘|왼쪽|오른쪽|첫번째|번째|사용법|가이드|설명|도와|메뉴판|아무거나|인기|사장님|아아|뜨아|컵|용량|오케이|오키|잔만|공기/;

    var SYNONYMS = [
        ["돼지국바", "돼지국밥"],
        ["순대국바", "순대국밥"],
        ["소고기국바", "소고기국밥"],
        ["아메리카노우", "아메리카노"],
        ["아메리가노", "아메리카노"],
        ["까페라떼", "카페라떼"],
        ["카페라테", "카페라떼"],
        ["오렌지주스", "오렌지 주스"],
        ["레몬에이드", "레몬 에이드"],
        ["치즈케이크", "치즈 케이크"],
        ["소프트아이스크림", "소프트 아이스크림"],
        ["싸가지고갈게", "포장"],
        ["포장으로갈게", "포장"],
        ["여기서먹을게요", "매장"],
        ["앉아서먹을게요", "매장"],
        ["먹고갈게요", "매장"],
        ["가져갈래요", "포장"],
        ["들고갈래요", "포장"],
        ["차갑게주세요", "아이스"],
        ["사장님 추천", "추천"],
        ["사장님추천", "추천"],
        ["신용카드", "카드"],
        ["체크카드", "카드"],
        ["카드로할게", "카드"],
        ["현금으로할게", "현금"],
        ["계산할게", "결제"],
        ["계산해줘", "결제"],
        ["계산하자", "결제"],
        ["결재할게", "결제"],
        ["돈 낼게", "결제"],
        ["돈낼게", "결제"],
        ["인기메뉴", "추천"],
        ["맛있는거", "추천"],
        ["아무거나", "추천"],
        ["뒤로가줘", "이전 화면"],
        ["돌아가줘", "이전 화면"],
        ["처음부터다시", "처음으로"],
        ["다시처음", "처음으로"],
        ["그걸로해줘", "맞아"],
        ["그거로해줘", "맞아"],
        ["한 그릇", "한개"],
        ["두 그릇", "두개"],
        ["세 그릇", "세개"],
        ["한 공기", "한개"],
        ["두 공기", "두개"],
        ["한 잔", "한개"],
        ["두 잔", "두개"],
        ["세 잔", "세개"],
        ["한그릇", "한개"],
        ["두그릇", "두개"],
        ["세그릇", "세개"],
        ["한공기", "한개"],
        ["두공기", "두개"],
        ["한잔만", "한개"],
        ["한잔", "한개"],
        ["두잔", "두개"],
        ["세잔", "세개"],
        ["아이스크림", "소프트 아이스크림"],
        ["뜨겁게", "따뜻하게"],
        ["핫으로", "따뜻하게"],
        ["시원하게", "아이스"],
        ["싸갈게", "포장"],
        ["국바", "국밥"],
        ["아아", "아이스 아메리카노"],
        ["뜨아", "따뜻한 아메리카노"],
        ["오케이", "네"],
        ["오키", "네"],
        ["결재", "결제"]
    ].sort(function (a, b) { return b[0].length - a[0].length; });

    function cleanVar(value) {
        return String(value || "").replace(/\s+/g, " ").trim();
    }

    function compact(text) {
        return String(text || "").toLowerCase().replace(/[\s,.'?!?~…"“”‘’]+/g, "");
    }

    function rulesOf(ctx) {
        if (ctx && ctx.rules && ctx.rules.length) return ctx.rules;
        if (typeof window !== "undefined" && window.ALL_TTS_CONFIG && window.ALL_TTS_CONFIG.length) return window.ALL_TTS_CONFIG;
        return LINES;
    }

    function readSaved(id, ctx) {
        try {
            var store = (ctx && ctx.storage) || (typeof localStorage !== "undefined" ? localStorage : null);
            if (!store || typeof store.getItem !== "function") return "";
            var value = store.getItem(id);
            if (!value || !String(value).trim()) return "";
            if (id === "tts_guide" && String(value) === LEGACY_GUIDE) return "";
            return String(value);
        } catch (e) {
            return "";
        }
    }

    function menuList(ctx) {
        if (ctx && ctx.menus) return ctx.menus;
        try {
            if (typeof customMenus !== "undefined" && Array.isArray(customMenus)) return customMenus;
        } catch (e) {}
        return [];
    }

    function isCoffee(ctx) {
        if (ctx && ctx.optionKind === "coffee") return true;
        if (ctx && ctx.optionKind === "other") return false;
        try {
            if (typeof tempItem !== "undefined" && tempItem && typeof customMenus !== "undefined") {
                var found = customMenus.find(function (menu) { return menu.name === tempItem.item; });
                return !!(found && found.category === "커피");
            }
        } catch (e) {}
        return false;
    }

    function runtimeVars(id, ctx) {
        var menus = menuList(ctx);
        var names = menus.map(function (menu) { return menu.name; }).filter(Boolean);
        if (id === "tts_cat") {
            var cats = ctx && ctx.categories ? ctx.categories : [];
            if (!cats.length) {
                menus.forEach(function (menu) {
                    if (menu.category && cats.indexOf(menu.category) === -1) cats.push(menu.category);
                });
            }
            return [cats.join(", ") || "국밥, 햄버거, 커피"];
        }
        if (id === "tts_grid") {
            var grid = (ctx && ctx.grid) || [];
            if (!grid.length) {
                try { if (typeof currentGridMenus !== "undefined" && currentGridMenus.length) grid = currentGridMenus; } catch (e) {}
            }
            var list = grid.slice(0, 5).map(function (menu) {
                var price = menu.price != null ? Number(menu.price).toLocaleString("ko-KR") + "원" : "";
                return price ? menu.name + " " + price : menu.name;
            });
            return [list.join(", ") || names.slice(0, 5).join(", ") || "메뉴"];
        }
        if (id === "tts_taste") {
            var pair = tastePair(ctx, names);
            return [pair[0], pair[1]];
        }
        if (id === "tts_confirm") {
            var pending = ctx && ctx.pendingMenuName;
            if (!pending) {
                try { pending = typeof pendingMenuName !== "undefined" ? pendingMenuName : ""; } catch (e) { pending = ""; }
            }
            return [pending || names[0] || "이 메뉴"];
        }
        if (id === "tts_bev_prompt") return [ctx && ctx.optionLabel ? ctx.optionLabel : "얼음, 당도"];
        if (id === "tts_bev_step") {
            var optionName = ctx && ctx.optionName;
            if (!optionName) {
                try {
                    if (typeof optionList !== "undefined" && optionList.length && typeof optionStepIndex !== "undefined") {
                        optionName = optionList[optionStepIndex] && optionList[optionStepIndex].name;
                    }
                } catch (e) {}
            }
            return [optionName || "옵션"];
        }
        if (id === "tts_summary") return [orderAmount(ctx) || "0"];
        return [];
    }

    function tastePair(ctx, names) {
        if (ctx && ctx.tastePair && ctx.tastePair.length >= 2) return ctx.tastePair;
        try {
            if (typeof document !== "undefined") {
                var el = document.querySelector(".status-giant");
                var text = el ? (el.innerText || "") : "";
                var found = text.match(/오늘의 추천:\s*([^\n]+)\n[\s\S]*제일 맛있는 메뉴:\s*([^\n]+)/);
                if (found) return [cleanVar(found[1]), cleanVar(found[2])];
            }
        } catch (e) {}
        return [names[0] || "치즈버거", names[1] || "오렌지 주스"];
    }

    function orderAmount(ctx) {
        if (ctx && ctx.orderSum != null && ctx.orderSum !== "") return String(ctx.orderSum);
        try {
            if (typeof getMenuPrice !== "function" || typeof orderState === "undefined" || !orderState.items) return "";
            var sum = 0;
            orderState.items.forEach(function (item) {
                var price = getMenuPrice(item.item) * (item.count || 1);
                if (item.isSet) price += 2000 * (item.count || 1);
                sum += price;
            });
            return sum.toLocaleString("ko-KR");
        } catch (e) {
            return "";
        }
    }

    function mergeVars(captured, runtime) {
        var out = runtime.slice();
        (captured || []).forEach(function (value, index) {
            if (value) out[index] = value;
        });
        return out;
    }

    function applyTemplate(id, vars, ctx) {
        var rule = null;
        rulesOf(ctx).forEach(function (item) { if (item.id === id) rule = item; });
        var template = readSaved(id, ctx);
        if (!template) template = (rule && rule.default) || "";
        vars.forEach(function (value, index) {
            template = template.split("{" + index + "}").join(value == null ? "" : String(value));
        });
        return template;
    }

    function resolveSpeak(text, ctx) {
        var raw = text == null ? "" : String(text);
        if (!raw.trim()) return raw;
        for (var i = 0; i < ANCHORS.length; i++) {
            var anchor = ANCHORS[i];
            var matched = raw.match(anchor.re);
            if (!matched) continue;
            var id = anchor.idFor ? anchor.idFor(matched, ctx) : anchor.id;
            var captured = anchor.vars ? anchor.vars(matched) : [];
            return applyTemplate(id, mergeVars(captured, runtimeVars(id, ctx)), ctx);
        }
        return raw;
    }

    function menuHit(text, ctx) {
        var c = compact(text);
        var names = menuList(ctx).map(function (menu) { return compact(menu.name); }).filter(function (name) { return name.length >= 2; });
        for (var i = 0; i < names.length; i++) {
            if (c.indexOf(names[i]) !== -1) return true;
        }
        return false;
    }

    function judge(text, ctx) {
        var raw = String(text || "").trim();
        var c = compact(raw);
        if (!c) return "chatter";
        if (YES_RE.test(c)) return "order";
        if (FILLER_RE.test(c)) return "chatter";
        var friend = FRIEND_RE.test(c);
        var command = COMMAND_RE.test(c);
        if (friend && !command) return "chatter";
        if (/^(야|너|얘|근데)/.test(c) && !command && c.length > 2) return "chatter";
        if (menuHit(raw, ctx) || ORDER_RE.test(c)) return "order";
        if (friend) return "chatter";
        if (c.length >= 16) return "chatter";
        return "unclear";
    }

    function expand(text, ctx) {
        var spoken = String(text || "");
        var names = menuList(ctx).map(function (menu) { return menu.name; });
        SYNONYMS.forEach(function (pair) {
            var from = pair[0];
            var to = pair[1];
            if (spoken.indexOf(from) === -1) return;
            if (names.some(function (name) { return name.indexOf(from) !== -1 && spoken.indexOf(name) !== -1; })) return;
            var escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            spoken = spoken.replace(new RegExp(escaped + "(?![가-힣])", "g"), function (match, offset, whole) {
                if (to.indexOf(from) !== -1 && whole.slice(Math.max(0, offset - to.length), offset + match.length).indexOf(to) !== -1) return match;
                return to;
            });
        });
        return spoken;
    }

    function clearLegacyGuide() {
        try {
            if (typeof localStorage === "undefined") return;
            if (!localStorage.getItem(LEGACY_FLAG) && localStorage.getItem("tts_guide") === LEGACY_GUIDE) {
                localStorage.removeItem("tts_guide");
            }
            localStorage.setItem(LEGACY_FLAG, "1");
        } catch (e) {}
    }

    function guardLegacyGuideWrite() {
        try {
            if (typeof localStorage === "undefined" || localStorage.__kioskGuideGuard) return;
            var original = localStorage.setItem.bind(localStorage);
            localStorage.setItem = function (key, value) {
                if (key === "tts_guide" && value === LEGACY_GUIDE) return;
                return original(key, value);
            };
            localStorage.__kioskGuideGuard = true;
        } catch (e) {}
    }

    function install() {
        clearLegacyGuide();
        guardLegacyGuideWrite();
        if (typeof isValidContext === "function" && !isValidContext.__kioskTalk) {
            var prevValid = isValidContext;
            var wrappedValid = function (text) {
                var judged = api.judge(text);
                if (judged === "chatter") return false;
                if (judged === "order") return true;
                return prevValid(text);
            };
            wrappedValid.__kioskTalk = true;
            isValidContext = wrappedValid;
            if (typeof window !== "undefined") window.isValidContext = wrappedValid;
        }
        if (typeof processVoiceCommand === "function" && !processVoiceCommand.__kioskTalk) {
            var prevProcess = processVoiceCommand;
            var wrappedProcess = function (text) {
                if (api.judge(text) === "chatter") {
                    console.log("잡담으로 판단해 무시:", text);
                    return;
                }
                return prevProcess.call(this, api.expand(text));
            };
            wrappedProcess.__kioskTalk = true;
            processVoiceCommand = wrappedProcess;
            if (typeof window !== "undefined") window.processVoiceCommand = wrappedProcess;
        }
        if (typeof speakText === "function" && !speakText.__kioskTalkBridge && !speakText.__kioskTalkSpeak) {
            var prevSpeak = (typeof window !== "undefined" && window.__originalSpeakTextForMasterTTS) || speakText;
            var wrappedSpeak = function (text, onEnd) {
                var next = text;
                try { next = api.resolveSpeak(text); } catch (e) { next = text; }
                return prevSpeak(next, onEnd);
            };
            wrappedSpeak.__kioskTalkSpeak = true;
            speakText = wrappedSpeak;
            if (typeof window !== "undefined") window.speakText = wrappedSpeak;
        }
    }

    var api = {
        lines: LINES,
        legacyGuide: LEGACY_GUIDE,
        resolveSpeak: resolveSpeak,
        judge: judge,
        expand: expand,
        install: install
    };
    return api;
});
