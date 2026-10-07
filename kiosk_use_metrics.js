/*
  키오스크를 쓸 때마다 성공/실패를 재고,
  알아듣지 못한 말은 기준 말로 학습한 뒤 학습 성공률과 로스율을 남긴다.
  화면 디자인과 주문 단계는 바꾸지 않는다.
*/
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }
    if (typeof window !== "undefined") {
        window.KioskUseMetrics = api;
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", function () {
                api.install();
            });
        } else {
            api.install();
        }
    }
    root.KioskUseMetrics = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    const ALIAS_KEY = "kiosk_command_alias_v1";
    const EVENT_KEY = "kiosk_use_metrics_v1";
    const TAUGHT_KEY = "kiosk_taught_phrases_v1";
    const YESNO = /^(네|내|예|넵|옙|아니|아니요|아니오|응|어|아|음)$/;

    function compact(text) {
        return String(text || "").toLowerCase().replace(/[^0-9a-z가-힣]/g, "");
    }

    function judgeUse(before, after) {
        if (!before || !after) return "failure";
        const keys = ["stage", "item", "count", "sugar", "step", "place", "cart"];
        for (let i = 0; i < keys.length; i++) {
            if (before[keys[i]] !== after[keys[i]]) return "success";
        }
        const spoken = String(after.spoken || "");
        if (spoken && spoken !== String(before.spoken || "")) {
            if (/다시 한 번|다시 말씀|알아듣지|정확히 말씀/.test(spoken)) return "failure";
            return "success";
        }
        return "failure";
    }

    function rememberAlias(store, variant, canonical) {
        const v = compact(variant);
        const c = compact(canonical);
        if (!store || !v || !c || v === c) return false;
        if (v.length < 2 || YESNO.test(v)) return false;
        if (String(variant).length > 40 || String(canonical).length > 40) return false;
        store[v] = String(canonical).trim();
        const keys = Object.keys(store);
        while (keys.length > 400) {
            delete store[keys.shift()];
        }
        return true;
    }

    function resolveAlias(store, text) {
        if (!store) return "";
        const hit = store[compact(text)];
        return hit ? String(hit) : "";
    }

    function summarize(events) {
        const list = Array.isArray(events) ? events : [];
        const uses = list.filter(function (e) { return e && e.kind === "use"; });
        const learns = list.filter(function (e) { return e && e.kind === "learn"; });
        const success = uses.filter(function (e) { return e.outcome === "success"; }).length;
        const failure = uses.filter(function (e) { return e.outcome === "failure"; }).length;
        const learnSuccess = learns.filter(function (e) { return e.outcome === "success"; }).length;
        const learnLoss = learns.filter(function (e) { return e.outcome === "loss"; }).length;
        const useTotal = success + failure;
        const learnTotal = learnSuccess + learnLoss;
        const seen = {};
        const learnedWords = [];
        learns.forEach(function (e) {
            if (e.outcome !== "success" || !e.text) return;
            const key = e.text + "→" + (e.canonical || "");
            if (seen[key]) return;
            seen[key] = true;
            learnedWords.push({ text: e.text, canonical: e.canonical || "" });
        });
        function pct(n, d) {
            return d ? Math.round((n / d) * 1000) / 10 : 0;
        }
        return {
            useTotal: useTotal,
            success: success,
            failure: failure,
            successRate: pct(success, useTotal),
            failureRate: pct(failure, useTotal),
            learnTotal: learnTotal,
            learnSuccess: learnSuccess,
            learnLoss: learnLoss,
            learnSuccessRate: pct(learnSuccess, learnTotal),
            lossRate: pct(learnLoss, learnTotal),
            learnedWords: learnedWords
        };
    }

    function loadJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function saveJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {}
    }

    function install() {
        if (typeof window === "undefined" || window.__kioskUseMetricsInstalled) return;
        if (typeof window.processVoiceCommand !== "function") return;
        window.__kioskUseMetricsInstalled = true;

        const previous = window.processVoiceCommand;

        function capture() {
            let sugar = null;
            try {
                sugar = tempItem && tempItem.beverageOptions ? tempItem.beverageOptions.sugar : null;
            } catch (e) {}
            let cart = "";
            try {
                cart = (orderState.items || []).map(function (item) {
                    return item.item + "x" + item.count;
                }).join(",");
            } catch (e2) {}
            return {
                stage: typeof currentStageName === "undefined" ? "" : currentStageName,
                item: (typeof tempItem !== "undefined" && tempItem && tempItem.item) || "",
                count: (typeof tempItem !== "undefined" && tempItem && tempItem.count) || 0,
                sugar: sugar,
                step: typeof optionStepIndex === "undefined" ? 0 : optionStepIndex,
                place: (typeof orderState !== "undefined" && orderState && orderState.place) || "",
                cart: cart,
                spoken: String(window.__kioskLastSpoken || "")
            };
        }

        function record(event) {
            const events = loadJSON(EVENT_KEY, []);
            events.push(event);
            saveJSON(EVENT_KEY, events.slice(-500));
            publish();
            try {
                fetch("/api/use-metrics", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(event)
                }).catch(function () {});
            } catch (e) {}
        }

        function publish() {
            const summary = summarize(loadJSON(EVENT_KEY, []));
            const taught = loadJSON(TAUGHT_KEY, {});
            const seen = {};
            summary.learnedWords.forEach(function (word) {
                seen[word.text + "→" + (word.canonical || "")] = true;
            });
            Object.keys(taught).forEach(function (key) {
                const row = taught[key];
                if (!row || !row.text) return;
                const id = row.text + "→" + (row.canonical || "");
                if (seen[id]) return;
                seen[id] = true;
                summary.learnedWords.push({ text: row.text, canonical: row.canonical || "" });
            });
            summary.taught = Object.keys(taught).length;
            window.__kioskUseMetrics = summary;
        }

        function teachStored(target, heard) {
            const key = String(heard).trim();
            const taught = loadJSON(TAUGHT_KEY, {});
            if (!key || taught[key]) return false;
            const heardCompact = compact(key);
            if (heardCompact !== compact(target) && heardCompact.length >= 2 && !YESNO.test(heardCompact)) {
                try {
                    if (typeof window.addLearnedVariant === "function") {
                        window.addLearnedVariant(target, key, { source: "use_metrics" });
                    }
                } catch (e) {}
                const aliases = loadJSON(ALIAS_KEY, {});
                if (rememberAlias(aliases, key, target)) saveJSON(ALIAS_KEY, aliases);
            }
            const keys = Object.keys(taught);
            while (keys.length >= 400) {
                delete taught[keys.shift()];
            }
            taught[key] = {
                text: key.slice(0, 40),
                canonical: String(target).slice(0, 40)
            };
            saveJSON(TAUGHT_KEY, taught);
            record({
                kind: "learn",
                outcome: "success",
                text: key.slice(0, 40),
                canonical: String(target).slice(0, 40),
                stage: typeof currentStageName === "undefined" ? "" : currentStageName,
                at: Date.now()
            });
            return true;
        }

        function learn(canonical, variant) {
            const target = String(canonical || "").trim();
            const heard = String(variant || "").trim();
            const heardCompact = compact(heard);
            if (!target || !heard || heardCompact === compact(target)) return false;
            if (heardCompact.length < 2 || YESNO.test(heardCompact)) {
                record({
                    kind: "learn",
                    outcome: "loss",
                    text: heard.slice(0, 40),
                    canonical: target.slice(0, 40),
                    stage: typeof currentStageName === "undefined" ? "" : currentStageName,
                    at: Date.now()
                });
                return false;
            }
            return teachStored(target, heard);
        }

        function plain(text) {
            return String(text || "").toLowerCase().replace(/[\s.,?!~]/g, "");
        }

        function countIn(raw) {
            if (/열식구|10식구/.test(raw)) return 10;
            if (/아홉식구|9식구/.test(raw)) return 9;
            if (/여덟식구|8식구/.test(raw)) return 8;
            if (/일곱식구|7식구/.test(raw)) return 7;
            if (/여섯식구|6식구/.test(raw)) return 6;
            if (/다섯식구|5식구/.test(raw)) return 5;
            if (/네식구|4식구/.test(raw)) return 4;
            if (/세식구|3식구/.test(raw)) return 3;
            if (/두식구|2식구/.test(raw)) return 2;
            if (/한식구|1식구/.test(raw)) return 1;
            if (/열잔|열개|열그릇|열명|10잔|10개/.test(raw)) return 10;
            if (/아홉잔|아홉개|아홉그릇|아홉명|9잔|9개/.test(raw)) return 9;
            if (/여덟잔|여덟개|여덟그릇|여덟명|8잔|8개/.test(raw)) return 8;
            if (/일곱잔|일곱개|일곱그릇|일곱명|7잔|7개|7명/.test(raw)) return 7;
            if (/여섯잔|여섯개|여섯그릇|여섯명|6잔|6개|6명/.test(raw)) return 6;
            if (/다섯잔|다섯개|다섯그릇|다섯명|5잔|5개|5명/.test(raw)) return 5;
            if (/네잔|네개|네그릇|네명|네사람|4잔|4개|4명/.test(raw)) return 4;
            if (/세잔|세개|세그릇|세명|세사람|3잔|3개|3명/.test(raw)) return 3;
            if (/두잔|두개|둘이|두그릇|두명|두사람|2잔|2개|2명|곱빼/.test(raw)) return 2;
            if (/한잔|한개|한그릇|한명|혼자|한사람|하나|1잔|1개|1명|일잔|일개|일그릇|조금만/.test(raw)) return 1;
            if (/이잔|이개|이그릇/.test(raw)) return 2;
            if (/삼잔|삼개|삼그릇/.test(raw)) return 3;
            if (/사잔|사개|사그릇/.test(raw)) return 4;
            if (/오잔|오개|오그릇/.test(raw)) return 5;
            if (/육잔|육개|육그릇/.test(raw)) return 6;
            if (/칠잔|칠개|칠그릇/.test(raw)) return 7;
            if (/팔잔|팔개|팔그릇/.test(raw)) return 8;
            if (/구잔|구개|구그릇/.test(raw)) return 9;
            if (/십잔|십개|십그릇/.test(raw)) return 10;
            return 0;
        }

        function leaveQuantity(count) {
            tempItem.count = count;
            const menu = customMenus.find(function (item) { return item.name === tempItem.item; });
            if (menu && menu.category === "음료" && typeof transitionTo === "function" && typeof askCupSize === "function") {
                transitionTo("cup_size", askCupSize);
            } else if (menu && menu.category === "커피" && typeof transitionTo === "function" && typeof renderBeverageOptionPrompt === "function") {
                transitionTo("beverage_option_prompt", renderBeverageOptionPrompt);
            } else if (typeof transitionTo === "function" && typeof renderAddMorePrompt === "function") {
                transitionTo("add_more_prompt", renderAddMorePrompt);
            }
            return true;
        }

            function afterSelect(raw) {
                if (currentStageName === "temp") {
                    let picked = "";
                    if (/아이스|차갑|차가|시원|식혀/.test(raw)) picked = "아이스(ICE)";
                    else if (/뜨겁|뜨끈|따뜻|따듯|뜨뜻|핫|뜨거|데워/.test(raw)) picked = "핫(HOT)";
                    if (picked) {
                        tempItem.temp = picked;
                        askQuantity();
                        if (countIn(raw)) return leaveQuantity(countIn(raw));
                        return true;
                    }
                }
                if (currentStageName === "upsell") {
                    if (/세트|같이/.test(raw)) {
                        tempItem.isSet = true;
                        askQuantity();
                        if (countIn(raw)) return leaveQuantity(countIn(raw));
                        return true;
                    }
                    if (/단품/.test(raw)) {
                        tempItem.isSet = false;
                        askQuantity();
                        if (countIn(raw)) return leaveQuantity(countIn(raw));
                        return true;
                    }
                }
                if (currentStageName === "quantity" && countIn(raw)) return leaveQuantity(countIn(raw));
                return true;
            }

            function finishCup(size) {
            tempItem.cupSize = size;
            let base = "";
            try { base = classifyDrinkBase(tempItem.item); } catch (e) {}
            if (base === "carbonated" && typeof transitionTo === "function" && typeof renderAddMorePrompt === "function") {
                transitionTo("add_more_prompt", renderAddMorePrompt);
            } else if (typeof transitionTo === "function" && typeof renderBeverageOptionPrompt === "function") {
                transitionTo("beverage_option_prompt", renderBeverageOptionPrompt);
            }
            return true;
        }

        function applyKnownPhrase(text) {
            const stage = typeof currentStageName === "undefined" ? "" : currentStageName;
            const raw = plain(text);
            if (!raw || !stage) return false;

            if (!/소리/.test(raw) && ((/글씨|글자/.test(raw) && /작아|안보|크게|키워|흐리|흐려|흐릿/.test(raw)) || (/화면/.test(raw) && /키워|크게|확대|안보/.test(raw)) || /작아보|잘안보|눈이안|눈안좋|침침|더크게|더키워/.test(raw))) {
                try {
                    if (typeof zoomLevel === "undefined") window.zoomLevel = 0;
                    zoomLevel = Math.min(4, (Number(zoomLevel) || 0) + 1);
                    if (typeof updateZoomUI === "function") updateZoomUI();
                } catch (e) {}
                if (typeof speakText === "function") speakText("화면을 확대했습니다.");
                return true;
            }

            if (!/소리/.test(raw) && ((/글씨|글자|화면/.test(raw) && /줄여|작게|축소/.test(raw)) || /더작게|작게해/.test(raw))) {
                try {
                    if (typeof zoomLevel === "undefined") window.zoomLevel = 0;
                    zoomLevel = Math.max(0, (Number(zoomLevel) || 0) - 1);
                    if (typeof updateZoomUI === "function") updateZoomUI();
                } catch (e) {}
                if (typeof speakText === "function") speakText("화면을 줄였습니다.");
                return true;
            }

            if (/아래보여|밑에보여|밑으로|아랫부분|밑부분|아래쪽/.test(raw) && !/왼쪽|오른쪽|번째|거/.test(raw)) {
                try {
                    if (typeof zoomLevel === "undefined") window.zoomLevel = 0;
                    if ((Number(zoomLevel) || 0) <= 0) zoomLevel = 1;
                    if (typeof updateZoomUI === "function") updateZoomUI("bottom");
                } catch (e) {}
                if (typeof speakText === "function") speakText("아래쪽 내용을 보여드리겠습니다.");
                return true;
            }

            if ((/소리/.test(raw) && /키워|높여|올려|크게|켜/.test(raw) && !/꺼/.test(raw)) || /크게말해|말크게|볼륨올/.test(raw)) {
                try {
                    if (typeof ttsVolumeLevel === "undefined") window.ttsVolumeLevel = 3;
                    ttsVolumeLevel = Math.min(4, (Number(ttsVolumeLevel) || 3) + 1);
                    ttsEnabled = true;
                } catch (e) {}
                if (typeof speakText === "function") speakText("소리를 키웠습니다.");
                return true;
            }

            if (/못들|잘안들|안들려|뭐라고|귀가먹|귀안들|귀어두|어두워|못알아/.test(raw)) {
                try {
                    if (typeof ttsVolumeLevel === "undefined") window.ttsVolumeLevel = 3;
                    ttsVolumeLevel = Math.min(4, (Number(ttsVolumeLevel) || 3) + 1);
                    ttsEnabled = true;
                } catch (e) {}
                if (typeof speakText === "function") speakText("소리를 키웠습니다.");
                return true;
            }

            if ((/소리/.test(raw) && /줄|낮|내려|작게/.test(raw)) || /볼륨내|볼륨낮/.test(raw)) {
                try {
                    if (typeof ttsVolumeLevel === "undefined") window.ttsVolumeLevel = 3;
                    ttsVolumeLevel = Math.max(1, (Number(ttsVolumeLevel) || 3) - 1);
                    ttsEnabled = true;
                } catch (e) {}
                if (typeof speakText === "function") speakText("소리를 줄였습니다.");
                return true;
            }

            if (/주문취소|전부취소|다취소|주문그만/.test(raw)) {
                if (stage === "welcome" && typeof speakText === "function") {
                    speakText("아직 주문 전입니다. 메뉴를 말씀해 주세요.");
                    return true;
                }
                previous("처음으로");
                return true;
            }

            if (stage === "payment") {
                const choice = raw.indexOf("말고") === -1 ? raw : (raw.split("말고").pop() || "");
                if (/영수증/.test(raw) && typeof speakText === "function") {
                    speakText("영수증은 카드나 현금을 고르신 뒤에 나옵니다. 카드 또는 현금을 말씀해 주세요.");
                    return true;
                }
                if ((/카드/.test(raw) && /안돼|안됨|안읽/.test(raw) || /결제안돼|결제안됨/.test(raw)) && typeof speakText === "function") {
                    speakText("카드가 안 되면 현금으로 말씀해 주세요.");
                    return true;
                }
                if (/현금없|현찰없|돈없|모자/.test(raw) && /현금|돈|현찰/.test(raw) && typeof speakText === "function") {
                    speakText("현금이 없으면 카드로 말씀해 주세요.");
                    return true;
                }
                if (/카드|일시불|할부/.test(choice) && !/안돼|안됨|안읽/.test(choice) && typeof selectPayment === "function") {
                    selectPayment("신용/체크 카드");
                    return true;
                }
                if (/현금|현찰|돈으로/.test(choice) && !/없/.test(choice) && typeof selectPayment === "function") {
                    selectPayment("현금 결제");
                    return true;
                }
                if ((/페이|간편결제|삼성페|카카오|네이버페|찍어|만원|천원|거스름|수표|상품권|외상|나중에|나눠|분할/.test(raw)) && typeof speakText === "function") {
                    speakText("카드나 현금만 됩니다. 카드 또는 현금을 말씀해 주세요.");
                    return true;
                }
            }

            if (stage === "place" && typeof transitionTo === "function" && typeof renderSummary === "function") {
                if (/할인|쿠폰/.test(raw) && typeof speakText === "function") {
                    speakText("할인은 없습니다. 포장인지 매장인지 말씀해 주세요.");
                    return true;
                }
                const choice = raw.indexOf("말고") === -1 ? raw : (raw.split("말고").pop() || "");
                if (/포장|들고|가져|가지고|밖에서|밖에|나가|싸|테이크|집|회사/.test(choice)) {
                    orderState.place = "포장해서 가기";
                    transitionTo("summary", renderSummary);
                    return true;
                }
                if (/매장|여기서|먹고|먹을|안에서|앉아/.test(choice)) {
                    orderState.place = "매장에서 먹기";
                    transitionTo("summary", renderSummary);
                    return true;
                }
            }

            if (stage === "taste_select_prompt") {
                if (/덜맵|안맵|안매|맵지않|순한|순해|싱거|담백|안짜|안셔|안시|안달|달지않|덜짜/.test(raw) && typeof speakText === "function") {
                    speakText("달콤, 상큼, 구수, 고소, 얼큰, 짭짤한 맛 중에서 골라주세요.");
                    return true;
                }
                const tastes = [
                    { name: "달콤", words: ["달콤", "달달", "단거", "단맛", "달아"] },
                    { name: "상큼", words: ["상큼", "새콤", "신거", "신맛", "셔요", "시어"] },
                    { name: "구수", words: ["구수"] },
                    { name: "고소", words: ["고소"] },
                    { name: "얼큰", words: ["얼큰", "매운", "매콤", "매우", "매워"] },
                    { name: "짭짤", words: ["짭짤", "짠", "짜요"] }
                ];
                const choice = raw.indexOf("말고") === -1 ? raw : (raw.split("말고").pop() || "");
                const hit = tastes.filter(function (taste) {
                    return taste.words.some(function (word) {
                        if ((word === "매운" || word === "매콤") && /안매|안맵/.test(choice)) return false;
                        if ((word === "짠" || word === "짜요") && /안짜|안짠/.test(choice)) return false;
                        if ((word === "셔요" || word === "시어" || word === "신거" || word === "신맛") && /안셔|안시|안신/.test(choice)) return false;
                        if ((word === "달아" || word === "달달" || word === "단거" || word === "단맛") && /안달|달지않/.test(choice)) return false;
                        return choice.indexOf(word) !== -1;
                    });
                })[0];
                if (hit && typeof transitionTo === "function" && typeof renderMenuGrid === "function") {
                    let matched = customMenus.filter(function (menu) {
                        const taste = String(menu.taste || "");
                        const name = String(menu.name || "");
                        return hit.words.some(function (word) {
                            return taste.indexOf(word) !== -1 || name.indexOf(word) !== -1;
                        });
                    });
                    if (!matched.length) matched = customMenus;
                    selectedCategory = "추천 맛";
                    currentGridMenus = matched;
                    currentGridTitle = hit.name + "한 맛 추천 메뉴";
                    transitionTo("menu_grid", renderMenuGrid);
                    return true;
                }
                if ((/맛|거|말고/.test(raw)) && typeof speakText === "function") {
                    speakText("달콤, 상큼, 구수, 고소, 얼큰, 짭짤한 맛 중에서 골라주세요.");
                    return true;
                }
            }

            if ((stage === "welcome" || stage === "open_order_prompt") && /메뉴판|메뉴보여|메뉴뭐|뭐있/.test(raw) && typeof transitionTo === "function" && typeof renderCategorySelect === "function") {
                transitionTo("category_select", renderCategorySelect);
                return true;
            }

            if ((stage === "welcome" || stage === "open_order_prompt") && /커피/.test(raw) && !/아메리카노|라떼|디카페인|에스프레소/.test(raw) && Array.isArray(customMenus) && typeof transitionTo === "function" && typeof renderMenuGrid === "function") {
                selectedCategory = "커피";
                currentGridMenus = customMenus.filter(function (menu) { return menu.category === "커피"; });
                currentGridTitle = "커피 메뉴판";
                transitionTo("menu_grid", renderMenuGrid);
                return true;
            }

            if ((stage === "welcome" || stage === "open_order_prompt") && /음료/.test(raw) && !/콜라|사이다|주스|에이드|쉐이크|딸기/.test(raw) && Array.isArray(customMenus) && typeof transitionTo === "function" && typeof renderMenuGrid === "function") {
                selectedCategory = "음료";
                currentGridMenus = customMenus.filter(function (menu) { return menu.category === "음료"; });
                currentGridTitle = "음료 메뉴판";
                transitionTo("menu_grid", renderMenuGrid);
                return true;
            }

            if ((stage === "welcome" || stage === "open_order_prompt") && /디저트|후식/.test(raw) && !/케이크|아이스크림/.test(raw) && Array.isArray(customMenus) && typeof transitionTo === "function" && typeof renderMenuGrid === "function") {
                selectedCategory = "디저트";
                currentGridMenus = customMenus.filter(function (menu) { return menu.category === "디저트"; });
                currentGridTitle = "디저트 메뉴판";
                transitionTo("menu_grid", renderMenuGrid);
                return true;
            }

            if (stage === "welcome" && /맛있어|맛있는거|뭐가좋|추천해/.test(raw) && typeof renderTasteSelectPrompt === "function") {
                currentStageName = "taste_select_prompt";
                renderTasteSelectPrompt();
                return true;
            }

            if ((stage === "welcome" || stage === "open_order_prompt") && /매운|얼큰|매콤/.test(raw) && /국/.test(raw) && !/안매|안맵|덜매/.test(raw) && Array.isArray(customMenus) && typeof transitionTo === "function" && typeof renderMenuGrid === "function") {
                const matched = customMenus.filter(function (menu) {
                    return /얼큰|매운|매콤/.test(String(menu.taste || "") + String(menu.name || ""));
                });
                selectedCategory = "추천 맛";
                currentGridMenus = matched.length ? matched : customMenus.filter(function (menu) { return menu.category === "국밥"; });
                currentGridTitle = "얼큰한 맛 추천 메뉴";
                transitionTo("menu_grid", renderMenuGrid);
                return true;
            }

            if (stage === "welcome" && /직원|불러줘|화장실|사장/.test(raw) && typeof speakText === "function") {
                speakText("직원 호출은 없습니다. 주문은 여기서 말씀해 주세요.");
                return true;
            }

            if (stage === "welcome" && (/물주세요|물좀|맥주|소주|공기밥|공기좀|김치|라면|우동|짜장|짬뽕|비빔밥|냉면|삼겹|갈비|피자|치킨|김밥|떡볶|녹차|홍차|밀크티|호떡|수저|휴지|쿠폰|포인트|적립|할인|멤버|우유|감자|튀김|막걸리|에스프레소|바닐라|와인|샌드|봉투|빨대|물티슈|와이파이|디카페인|만두|떡국|식혜|수정과|미숫|붕어|호빵|어묵|오뎅|주먹밥|칼국수|수제비|선지|콩나물|계란|샐러드|과일|바나나|사과주|쫄면|잡채|육회|초밥|도시락/.test(raw) || /^밥(좀)?(주세요|주이소|주소)?$/.test(raw)) && typeof speakText === "function") {
                speakText("그 메뉴는 없습니다. 국밥, 불고기, 햄버거, 커피, 음료, 디저트 중에서 말씀해주세요.");
                return true;
            }

            if (stage === "welcome" && /순한|순해|담백/.test(raw) && /국/.test(raw) && typeof speakText === "function") {
                speakText("순한 국은 없습니다. 달콤, 상큼, 구수, 고소, 얼큰, 짭짤한 맛 중에서 골라주세요.");
                return true;
            }

            if (stage === "welcome" && /목말라|목마르|갈증/.test(raw) && Array.isArray(customMenus) && typeof transitionTo === "function" && typeof renderMenuGrid === "function") {
                selectedCategory = "음료";
                currentGridMenus = customMenus.filter(function (menu) { return menu.category === "음료"; });
                currentGridTitle = "음료 메뉴판";
                transitionTo("menu_grid", renderMenuGrid);
                return true;
            }

            if (stage === "welcome" && /주차|영업|번호표|몇시/.test(raw) && typeof speakText === "function") {
                speakText("주문만 할 수 있습니다. 메뉴를 말씀해 주세요.");
                return true;
            }

            if (stage === "welcome" && /알러지|알레르기/.test(raw) && typeof speakText === "function") {
                speakText("알레르기 확인은 안 됩니다. 주문할 메뉴를 말씀해 주세요.");
                return true;
            }

            if (stage === "welcome" && (/안매|안맵|덜매/.test(raw) || (/맵|매운|매워/.test(raw) && /못|싫/.test(raw))) && typeof speakText === "function") {
                speakText("순한 맛은 따로 없습니다. 달콤, 상큼, 구수, 고소, 얼큰, 짭짤한 맛 중에서 골라주세요.");
                return true;
            }

            if (stage === "welcome" && /사용법|사용방식|알려줘/.test(raw)) {
                previous("사용법 알려줘");
                return true;
            }

            if (stage === "welcome" && /처음인데|처음이야|첫주문|어려워/.test(raw)) {
                previous("사용법 알려줘");
                return true;
            }

            if (stage === "welcome" && /불고기/.test(raw) && !/한우|덮밥|버거/.test(raw) && Array.isArray(customMenus) && typeof transitionTo === "function" && typeof renderMenuGrid === "function") {
                selectedCategory = "불고기";
                currentGridMenus = customMenus.filter(function (menu) { return menu.category === "불고기"; });
                currentGridTitle = "불고기 메뉴판";
                transitionTo("menu_grid", renderMenuGrid);
                return true;
            }

            if (stage === "welcome" && /햄버거/.test(raw) && !/치즈|불고기/.test(raw) && Array.isArray(customMenus) && typeof transitionTo === "function" && typeof renderMenuGrid === "function") {
                selectedCategory = "햄버거";
                currentGridMenus = customMenus.filter(function (menu) { return menu.category === "햄버거"; });
                currentGridTitle = "햄버거 메뉴판";
                transitionTo("menu_grid", renderMenuGrid);
                return true;
            }

            if (stage === "welcome" && /안녕/.test(raw) && typeof speakText === "function") {
                speakText("안녕하세요. 주문하시려면 메뉴를 말씀해 주세요.");
                return true;
            }

            if (stage === "welcome" && /주문할래|먹을래|시작할게|주문할께|먹을께|먹을게|주문할게|주문합니다|먹으러|배고파|배고프|배고픕|주문부탁|예예|네네|먹고싶/.test(raw)) {
                startOrder();
                return true;
            }

            if (/오렌쥐쥬스|오렌쥐주스|오렌지쥬스/.test(raw) && /menu_grid|open_order_prompt|category_select|welcome/.test(stage)) {
                selectSpecificItem("오렌지 주스");
                return afterSelect(raw);
            }

            if (stage === "quantity" && /많이주|가득주/.test(raw) && !countIn(raw) && typeof speakText === "function") {
                speakText("몇 개인지 한 잔, 두 잔처럼 말씀해 주세요.");
                return true;
            }

            if (stage === "quantity" && /스무|백잔|백개|20잔|20개|서른/.test(raw) && typeof speakText === "function") {
                speakText("한 번에 열 잔까지 됩니다. 열 잔 이하로 말씀해 주세요.");
                return true;
            }

            if (stage === "quantity" && /반잔|절반|반공기/.test(raw) && typeof speakText === "function") {
                speakText("반 잔은 없습니다. 한 잔, 두 잔처럼 수량을 말씀해 주세요.");
                return true;
            }

            if (stage === "quantity" && countIn(raw)) return leaveQuantity(countIn(raw));

            if (stage === "add_more_prompt" && /이걸로|그걸로|없어요|없어|그만|이게다|추가안|안할래|이제됐|그만할|됐|안담|계산|결제|그냥주문|다했|그거면|이거면|골랐|영수증|충분|이만|배불|배부르|배불렀|잘먹/.test(raw)) {
                if (typeof commitTempItemToCartIfValid === "function") commitTempItemToCartIfValid();
                if (typeof transitionTo === "function" && typeof renderPlaceSelect === "function") {
                    transitionTo("place", renderPlaceSelect);
                }
                return true;
            }

            if (stage === "add_more_prompt" && /더담|추가|하나더|더주문|또주문|다른메뉴|다른거|시킬|배고파|더먹|있으면네|^네$|^예$|^응$/.test(raw)) {
                if (typeof commitTempItemToCartIfValid === "function") commitTempItemToCartIfValid();
                isAddOnPhase = true;
                if (typeof transitionTo === "function" && typeof renderCategorySelect === "function") {
                    transitionTo("category_select", renderCategorySelect);
                }
                return true;
            }

            if (/menu_grid/.test(stage) && /가운데|한가운데/.test(raw) && typeof speakText === "function") {
                speakText("가운데는 애매합니다. 몇 번째인지 말씀해 주세요.");
                return true;
            }

            if (/menu_grid/.test(stage) && /5번|오번/.test(raw) && !/15번|6번|육번/.test(raw)) {
                previous("5번");
                return true;
            }

            if (/menu_grid/.test(stage) && /6번|육번|여섯번째|여섯째/.test(raw) && Array.isArray(currentGridMenus) && currentGridMenus[5] && typeof selectSpecificItem === "function") {
                selectSpecificItem(currentGridMenus[5].name);
                return afterSelect(raw);
            }

            if (/menu_grid|open_order_prompt|category_select|welcome/.test(stage) && /뜨아/.test(raw) && typeof selectSpecificItem === "function") {
                selectSpecificItem("아메리카노");
                tempItem.temp = "핫(HOT)";
                askQuantity();
                if (countIn(raw)) return leaveQuantity(countIn(raw));
                return true;
            }

            if (/menu_grid|open_order_prompt|category_select|welcome/.test(stage) && /아아/.test(raw) && raw.indexOf("아메리카노") === -1 && typeof selectSpecificItem === "function") {
                selectSpecificItem("아메리카노");
                tempItem.temp = "아이스(ICE)";
                askQuantity();
                if (countIn(raw)) return leaveQuantity(countIn(raw));
                return true;
            }

            if (/menu_grid/.test(stage) && selectedCategory === "커피" && /따뜻|뜨겁|뜨거|핫|따듯|아이스|차갑|시원/.test(raw) && !/아메리카노|라떼|카페|아이스커피|핫커피|뜨거운커피/.test(raw) && typeof speakText === "function") {
                speakText("아메리카노와 카페라떼가 있습니다. 이름을 말씀해 주세요.");
                return true;
            }

            if (/menu_grid|open_order_prompt|category_select/.test(stage) && typeof selectSpecificItem === "function") {
                if (/아이스커피/.test(raw) && raw.indexOf("아메리카노") === -1) {
                    selectSpecificItem("아메리카노");
                    tempItem.temp = "아이스(ICE)";
                    askQuantity();
                    if (countIn(raw)) return leaveQuantity(countIn(raw));
                    return true;
                }
                if (/핫커피|뜨거운커피/.test(raw)) {
                    selectSpecificItem("아메리카노");
                    tempItem.temp = "핫(HOT)";
                    askQuantity();
                    if (countIn(raw)) return leaveQuantity(countIn(raw));
                    return true;
                }
            }

            if (/menu_grid|open_order_prompt|category_select/.test(stage) && (/국물/.test(raw) || (/^국/.test(raw) && !/국밥|돼지|순대|소고기|수육/.test(raw) && raw.length <= 8)) && Array.isArray(customMenus)) {
                selectedCategory = "국밥";
                currentGridMenus = customMenus.filter(function (menu) { return menu.category === "국밥"; });
                currentGridTitle = "국밥 메뉴판";
                if (typeof transitionTo === "function" && typeof renderMenuGrid === "function") {
                    transitionTo("menu_grid", renderMenuGrid);
                }
                return true;
            }

            if (/menu_grid|open_order_prompt|category_select|welcome/.test(stage) && /레모네이드/.test(raw) && typeof selectSpecificItem === "function") {
                selectSpecificItem("레몬 에이드");
                return afterSelect(raw);
            }

            if (/menu_grid|open_order_prompt|category_select|welcome/.test(stage) && /싸이다/.test(raw) && typeof selectSpecificItem === "function") {
                selectSpecificItem("사이다");
                return afterSelect(raw);
            }

            if (/menu_grid|open_order_prompt|category_select|welcome/.test(stage) && /국밥|국물/.test(raw) && !/돼지|순대|소고기|수육/.test(raw) && Array.isArray(customMenus) && typeof transitionTo === "function" && typeof renderMenuGrid === "function") {
                selectedCategory = "국밥";
                currentGridMenus = customMenus.filter(function (menu) { return menu.category === "국밥"; });
                currentGridTitle = "국밥 메뉴판";
                transitionTo("menu_grid", renderMenuGrid);
                return true;
            }

            if (/menu_grid|open_order_prompt|category_select|welcome/.test(stage) && /순댓국/.test(raw) && typeof selectSpecificItem === "function") {
                selectSpecificItem("순대국밥");
                return afterSelect(raw);
            }

            if (/menu_grid|open_order_prompt|category_select/.test(stage) && /특징|무슨맛|어떤맛|얼마|가격/.test(raw) && Array.isArray(customMenus) && typeof speakText === "function") {
                const described = customMenus.map(function (item) { return item.name; }).sort(function (a, b) {
                    return plain(b).length - plain(a).length;
                });
                for (let d = 0; d < described.length; d++) {
                    const key = plain(described[d]);
                    if (key.length >= 2 && raw.indexOf(key) !== -1) {
                        const menu = customMenus.find(function (item) { return item.name === described[d]; });
                        const price = Number(menu && menu.price || 0).toLocaleString();
                        speakText(menu.name + "은 " + (menu.taste || "기본") + " 메뉴이고, 가격은 " + price + "원입니다.");
                        return true;
                    }
                }
                speakText("어떤 메뉴의 특징인지 이름을 같이 말씀해주세요.");
                return true;
            }

            if (/menu_grid|open_order_prompt|category_select|welcome/.test(stage) && /바닐라|에스프레소|디카페인/.test(raw) && typeof speakText === "function") {
                speakText("그 메뉴는 없습니다. 국밥, 불고기, 햄버거, 커피, 음료, 디저트 중에서 말씀해주세요.");
                return true;
            }

            if (/menu_grid|open_order_prompt|category_select|welcome/.test(stage) && typeof selectSpecificItem === "function" && Array.isArray(customMenus)) {
                const names = customMenus.map(function (item) { return item.name; }).sort(function (a, b) {
                    return plain(b).length - plain(a).length;
                });
                for (let i = 0; i < names.length; i++) {
                    const key = plain(names[i]);
                    if (key.length >= 2 && raw.indexOf(key) !== -1) {
                        selectSpecificItem(names[i]);
                        return afterSelect(raw);
                    }
                }
                const pieces = customMenus.filter(function (item) {
                    const key = plain(item.name);
                    return raw.length >= 2 && key.indexOf(raw) !== -1 && key !== raw;
                });
                if (pieces.length === 1) {
                    selectSpecificItem(pieces[0].name);
                    return afterSelect(raw);
                }
                const pools = [];
                if (Array.isArray(currentGridMenus) && currentGridMenus.length) pools.push(currentGridMenus);
                else pools.push(customMenus);
                for (let p = 0; p < pools.length; p++) {
                    let bestLen = 1;
                    let hits = [];
                    pools[p].forEach(function (item) {
                        const key = plain(item.name);
                        let len = 0;
                        for (let size = Math.min(key.length, 12); size >= 2; size--) {
                            let found = false;
                            for (let n = 0; n + size <= key.length; n++) {
                                if (raw.indexOf(key.slice(n, n + size)) !== -1) { found = true; break; }
                            }
                            if (found) { len = size; break; }
                        }
                        if (len > bestLen) { bestLen = len; hits = [item]; }
                        else if (len === bestLen && len >= 2) hits.push(item);
                    });
                    if (hits.length === 1 && bestLen >= 2) {
                        let shortOk = bestLen >= 3;
                        if (!shortOk) {
                            const key = plain(hits[0].name);
                            for (let n = 0; n + bestLen <= key.length; n++) {
                                const slice = key.slice(n, n + bestLen);
                                if (raw.indexOf(slice) !== -1 && /^(콜라|라떼|주스|순대|백반|수육|덮밥|아메|딸기|레몬|국밥|버거|커피|한우|쿠키)$/.test(slice)) {
                                    shortOk = true;
                                    break;
                                }
                            }
                        }
                        if (!shortOk) continue;
                        selectSpecificItem(hits[0].name);
                        return afterSelect(raw);
                    }
                }
            }

            if (stage === "temp") {
                const choice = raw.indexOf("말고") === -1 ? raw : (raw.split("말고").pop() || "");
                if (/얼음없|얼음빼/.test(raw) || (/얼음/.test(raw) && /없|빼/.test(raw))) {
                    tempItem.temp = "핫(HOT)";
                    askQuantity();
                    if (countIn(raw)) return leaveQuantity(countIn(raw));
                    return true;
                }
                if (/하지마|하지말/.test(raw)) {
                    if (/차갑|차가|아이스|시원|얼음/.test(raw)) {
                        tempItem.temp = "핫(HOT)";
                        askQuantity();
                        if (countIn(raw)) return leaveQuantity(countIn(raw));
                        return true;
                    }
                    if (/뜨겁|뜨끈|따뜻|따듯|뜨뜻|핫|뜨거|데워/.test(raw)) {
                        tempItem.temp = "아이스(ICE)";
                        askQuantity();
                        if (countIn(raw)) return leaveQuantity(countIn(raw));
                        return true;
                    }
                    if (typeof speakText === "function") {
                        speakText("뜨거운 것과 아이스 중에서 말씀해 주세요.");
                        return true;
                    }
                }
                if (/샷추가|샷넣|디카페인/.test(raw) && typeof speakText === "function") {
                    speakText("그 선택은 없습니다. 뜨거운 것과 아이스 중에서 말씀해 주세요.");
                    return true;
                }
                if (/미지근|연하|진하/.test(raw) && typeof speakText === "function") {
                    speakText("뜨거운 것과 아이스 중에서 말씀해 주세요.");
                    return true;
                }
                if (/뜨겁|뜨끈|따뜻|따듯|뜨뜻|핫|hot|뜨거|데워/.test(choice)) {
                    tempItem.temp = "핫(HOT)";
                    askQuantity();
                    if (countIn(raw)) return leaveQuantity(countIn(raw));
                    return true;
                }
                if (/아이스|차갑|차가|시원|ice|얼음|식혀/.test(choice)) {
                    tempItem.temp = "아이스(ICE)";
                    askQuantity();
                    if (countIn(raw)) return leaveQuantity(countIn(raw));
                    return true;
                }
            }

            if (stage === "upsell") {
                const choice = raw.indexOf("말고") === -1 ? raw : (raw.split("말고").pop() || "");
                if (/세트|같이/.test(choice)) {
                    tempItem.isSet = true;
                    askQuantity();
                    if (countIn(raw)) return leaveQuantity(countIn(raw));
                    return true;
                }
                if (/단품|버거만|햄버거만/.test(choice)) {
                    tempItem.isSet = false;
                    askQuantity();
                    if (countIn(raw)) return leaveQuantity(countIn(raw));
                    return true;
                }
            }

            if (stage === "cup_size" && /큰걸|큰컵|큰거|큰잔|라지|큰|크게/.test(raw)) {
                return finishCup("500ml");
            }

            if (stage === "cup_size" && /보통|중간|미디엄/.test(raw) && !/큰|라지|작은|스몰/.test(raw)) {
                return finishCup("350ml");
            }

            if (stage === "cup_size" && /머그|유리잔|텀블러/.test(raw) && typeof speakText === "function") {
                speakText("그 잔은 없습니다. 작은 잔, 중간 잔, 큰 잔 중에서 말씀해 주세요.");
                return true;
            }

            if (stage === "cup_size" && /리터|1l|일리터/.test(raw) && typeof speakText === "function") {
                speakText("1리터는 없습니다. 작은 잔, 중간 잔, 큰 잔 중에서 말씀해 주세요.");
                return true;
            }

            if (stage === "cup_size" && /작은|작거|작게|스몰|200|이백/.test(raw) && !/큰|라지|중간|미디엄|500|350/.test(raw)) {
                return finishCup("200ml");
            }

            if (stage === "beverage_option_step" && Array.isArray(optionList) && optionList[optionStepIndex]) {
                let level = 0;
                if (/낮게|싱겁|덜달|안달|없이|달지않|빼|없애|내려|무설탕|설탕없/.test(raw)) level = 1;
                else if (/조금|적게/.test(raw)) level = 2;
                else if (/많이/.test(raw) && !/달게|달콤/.test(raw)) level = 4;
                else if (/달게|달콤|가득|달아|올려|단맛|달달/.test(raw)) level = 5;
                else if (/적당|그냥|보통/.test(raw)) level = 3;
                if (!level) return false;
                if (!tempItem.beverageOptions) tempItem.beverageOptions = {};
                tempItem.beverageOptions[optionList[optionStepIndex].key] = level;
                optionStepIndex += 1;
                if (optionStepIndex < optionList.length && typeof renderBeverageOptionStep === "function") {
                    renderBeverageOptionStep();
                } else if (typeof transitionTo === "function" && typeof renderBeverageResult === "function") {
                    transitionTo("beverage_result", renderBeverageResult);
                }
                return true;
            }

            if (stage === "menu_confirm" && /아니|아닌|틀려|틀리|틀립|다시골|다른걸|다른거|말고|아이가/.test(raw)) {
                pendingMenuName = "";
                currentStageName = "menu_grid";
                if (typeof renderMenuGrid === "function") renderMenuGrid();
                return true;
            }

            if (stage === "menu_confirm" && typeof pendingMenuName !== "undefined" && pendingMenuName && /그거|이걸로|그걸로|이거지|그지|맞심/.test(raw) && !/아니|아닌|틀려|틀리|틀립|다시골|다른걸|다른거|말고|아이가/.test(raw) && typeof selectSpecificItem === "function") {
                selectSpecificItem(pendingMenuName);
                return afterSelect(raw);
            }

            if (stage === "quantity" && /^취소|^잘못/.test(raw)) {
                previous("뒤로");
                return true;
            }

            if (stage === "summary" && /빼|제외|지워/.test(raw) && Array.isArray(customMenus) && typeof speakText === "function") {
                const names = customMenus.map(function (item) { return item.name; }).sort(function (a, b) {
                    return plain(b).length - plain(a).length;
                });
                for (let r = 0; r < names.length; r++) {
                    const key = plain(names[r]);
                    if (key.length >= 2 && raw.indexOf(key) !== -1 && orderState && Array.isArray(orderState.items)) {
                        const idx = orderState.items.findIndex(function (item) { return item.item === names[r]; });
                        if (idx !== -1) {
                            orderState.items.splice(idx, 1);
                            if (typeof renderSummary === "function" && orderState.items.length) renderSummary();
                            speakText(names[r] + " 메뉴를 장바구니에서 뺐습니다.");
                            return true;
                        }
                    }
                }
                speakText("어떤 메뉴를 뺄지 이름을 같이 말씀해 주세요.");
                return true;
            }

            if (stage === "summary" && /얼마|가격/.test(raw) && typeof renderSummary === "function") {
                renderSummary();
                return true;
            }

            if (stage === "summary" && /그래|그라/.test(raw)) {
                previous("맞아");
                return true;
            }

            return false;
        }

        window.processVoiceCommand = function measuredProcessVoiceCommand(text) {
            if (typeof window.__kioskTtsBlocking === "function" && window.__kioskTtsBlocking()) {
                return previous.apply(this, arguments);
            }
            const spoken = String(text || "");
            const before = capture();
            const intent = String(window.__kioskCustomerIntent || "").trim();
            let result;
            try {
                if (applyKnownPhrase(spoken)) result = true;
                else result = previous.call(this, spoken);
                if (judgeUse(before, capture()) === "failure") {
                    const alias = resolveAlias(loadJSON(ALIAS_KEY, {}), spoken);
                    if (alias && compact(alias) !== compact(spoken)) {
                        if (applyKnownPhrase(alias)) result = true;
                        else result = previous.call(this, alias);
                    }
                }
            } finally {
                const after = capture();
                const outcome = judgeUse(before, after);
                record({
                    kind: "use",
                    outcome: outcome,
                    text: String(text || "").slice(0, 40),
                    canonical: intent,
                    stage: before.stage,
                    at: Date.now()
                });
                if (outcome === "failure" && intent) learn(intent, text);
            }
            return result;
        };

        window.__kioskCustomerSay = function (text, intended) {
            window.__kioskCustomerIntent = String(intended || "");
            try {
                return window.processVoiceCommand(text);
            } finally {
                window.__kioskCustomerIntent = "";
            }
        };

        window.__kioskTeachPhrase = function (canonical, variant) {
            const heard = String(variant || "").trim();
            const target = String(canonical || heard).trim();
            if (!heard || !target) return false;
            if (compact(heard) === compact(target)) return teachStored(target, heard);
            return learn(target, heard) === true;
        };
        window.__kioskTaughtCount = function () {
            return Object.keys(loadJSON(TAUGHT_KEY, {})).length;
        };
        publish();
        console.log("[kiosk] 사용 성공률과 학습 로스율을 기록합니다.");
    }

    return {
        compact: compact,
        judgeUse: judgeUse,
        rememberAlias: rememberAlias,
        resolveAlias: resolveAlias,
        summarize: summarize,
        install: install
    };
});
