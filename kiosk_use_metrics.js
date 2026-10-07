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
    const DICT_KEY = "kiosk_final_learned_dict_v1";
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
        while (keys.length > 100) {
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

    function dictHas(canonical, variant) {
        const dict = loadJSON(DICT_KEY, {});
        const want = compact(canonical);
        const heard = compact(variant);
        const items = dict[canonical] || dict[String(canonical).trim()] || [];
        const lists = items.length ? [items] : Object.keys(dict).filter(function (key) {
            return compact(key) === want;
        }).map(function (key) { return dict[key]; });
        for (let i = 0; i < lists.length; i++) {
            const list = lists[i] || [];
            for (let j = 0; j < list.length; j++) {
                const text = typeof list[j] === "string" ? list[j] : list[j].text;
                if (compact(text) === heard) return true;
            }
        }
        return false;
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
            window.__kioskUseMetrics = summarize(loadJSON(EVENT_KEY, []));
            try {
                fetch("/api/use-metrics", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(event)
                }).catch(function () {});
            } catch (e) {}
        }

        function learn(canonical, variant) {
            const target = String(canonical || "").trim();
            const heard = String(variant || "").trim();
            const heardCompact = compact(heard);
            if (!target || !heard || heardCompact === compact(target)) return;
            if (heardCompact.length < 2 || YESNO.test(heardCompact)) {
                record({
                    kind: "learn",
                    outcome: "loss",
                    text: heard.slice(0, 40),
                    canonical: target.slice(0, 40),
                    stage: typeof currentStageName === "undefined" ? "" : currentStageName,
                    at: Date.now()
                });
                return;
            }
            let stored = false;
            try {
                if (typeof window.addLearnedVariant === "function") {
                    stored = window.addLearnedVariant(target, heard, { source: "use_metrics" }) === true;
                }
            } catch (e) {}
            const aliases = loadJSON(ALIAS_KEY, {});
            const aliased = rememberAlias(aliases, heard, target);
            if (aliased) saveJSON(ALIAS_KEY, aliases);
            let resolved = dictHas(target, heard) || (aliased && resolveAlias(aliases, heard) === target);
            try {
                if (!resolved && typeof window.findByLearnedDict === "function") {
                    const found = window.findByLearnedDict(heard);
                    const name = found && (found.name || found.standard || "");
                    resolved = compact(name) === compact(target);
                }
            } catch (e2) {}
            stored = stored || aliased;
            record({
                kind: "learn",
                outcome: stored && resolved ? "success" : "loss",
                text: heard.slice(0, 40),
                canonical: target.slice(0, 40),
                stage: typeof currentStageName === "undefined" ? "" : currentStageName,
                at: Date.now()
            });
        }

        function plain(text) {
            return String(text || "").toLowerCase().replace(/[\s.,?!~]/g, "");
        }

        function countIn(raw) {
            if (/네잔|네개|4잔|4개/.test(raw)) return 4;
            if (/세잔|세개|3잔|3개/.test(raw)) return 3;
            if (/두잔|두개|둘이|2잔|2개/.test(raw)) return 2;
            if (/한잔|한개|1잔|1개/.test(raw)) return 1;
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

            if (/소리키워|소리크게|소리올려/.test(raw)) {
                try {
                    if (typeof ttsVolumeLevel === "undefined") window.ttsVolumeLevel = 3;
                    ttsVolumeLevel = Math.min(4, (Number(ttsVolumeLevel) || 3) + 1);
                    ttsEnabled = true;
                } catch (e) {}
                if (typeof speakText === "function") speakText("소리를 키웠습니다.");
                return true;
            }

            if (stage === "payment") {
                if (/카드/.test(raw) && typeof selectPayment === "function") {
                    selectPayment("신용/체크 카드");
                    return true;
                }
                if (/현금|현찰/.test(raw) && typeof selectPayment === "function") {
                    selectPayment("현금 결제");
                    return true;
                }
            }

            if (stage === "taste_select_prompt") {
                const tastes = ["달콤", "상큼", "구수", "고소", "얼큰", "짭짤"];
                const hit = tastes.filter(function (name) { return raw.indexOf(name) !== -1; })[0];
                if (hit && typeof transitionTo === "function" && typeof renderMenuGrid === "function") {
                    let matched = customMenus.filter(function (menu) {
                        return String(menu.taste || "").indexOf(hit) !== -1 || String(menu.name || "").indexOf(hit) !== -1;
                    });
                    if (!matched.length) matched = customMenus;
                    selectedCategory = "추천 맛";
                    currentGridMenus = matched;
                    currentGridTitle = hit + "한 맛 추천 메뉴";
                    transitionTo("menu_grid", renderMenuGrid);
                    return true;
                }
                if (/맛|거/.test(raw) && typeof speakText === "function") {
                    speakText("달콤, 상큼, 구수, 고소, 얼큰, 짭짤한 맛 중에서 골라주세요.");
                    return true;
                }
            }

            if (stage === "welcome" && /맛있어|맛있는거/.test(raw) && typeof renderTasteSelectPrompt === "function") {
                currentStageName = "taste_select_prompt";
                renderTasteSelectPrompt();
                return true;
            }

            if (stage === "welcome" && /주문할래|먹을래|시작할게/.test(raw)) {
                startOrder();
                return true;
            }

            if (/오렌쥐쥬스|오렌쥐주스|오렌지쥬스/.test(raw) && /menu_grid|open_order_prompt|category_select/.test(stage)) {
                selectSpecificItem("오렌지 주스");
                return true;
            }

            if (stage === "quantity" && countIn(raw)) return leaveQuantity(countIn(raw));

            if (stage === "add_more_prompt" && /이걸로|없어요|없어|그만|이게다/.test(raw)) {
                if (typeof commitTempItemToCartIfValid === "function") commitTempItemToCartIfValid();
                if (typeof transitionTo === "function" && typeof renderPlaceSelect === "function") {
                    transitionTo("place", renderPlaceSelect);
                }
                return true;
            }

            if (stage === "add_more_prompt" && /더담/.test(raw)) {
                if (typeof commitTempItemToCartIfValid === "function") commitTempItemToCartIfValid();
                isAddOnPhase = true;
                if (typeof transitionTo === "function" && typeof renderCategorySelect === "function") {
                    transitionTo("category_select", renderCategorySelect);
                }
                return true;
            }

            if (/menu_grid|open_order_prompt|category_select/.test(stage) && typeof selectSpecificItem === "function" && Array.isArray(customMenus)) {
                const names = customMenus.map(function (item) { return item.name; }).sort(function (a, b) {
                    return plain(b).length - plain(a).length;
                });
                for (let i = 0; i < names.length; i++) {
                    const key = plain(names[i]);
                    if (key.length >= 2 && raw.indexOf(key) !== -1) {
                        selectSpecificItem(names[i]);
                        if (currentStageName === "temp") {
                            if (/아이스|차갑|시원/.test(raw)) {
                                tempItem.temp = "아이스(ICE)";
                                askQuantity();
                                return true;
                            }
                            if (/뜨겁|뜨끈|따뜻|핫/.test(raw)) {
                                tempItem.temp = "핫(HOT)";
                                askQuantity();
                                return true;
                            }
                        }
                        if (currentStageName === "upsell") {
                            if (/세트|같이/.test(raw)) {
                                tempItem.isSet = true;
                                askQuantity();
                                return true;
                            }
                            if (/단품/.test(raw)) {
                                tempItem.isSet = false;
                                askQuantity();
                                return true;
                            }
                        }
                        if (currentStageName === "quantity" && countIn(raw)) return leaveQuantity(countIn(raw));
                        return true;
                    }
                }
            }

            if (stage === "temp") {
                if (/뜨겁|뜨끈|따뜻|핫|hot/.test(raw)) {
                    tempItem.temp = "핫(HOT)";
                    askQuantity();
                    return true;
                }
                if (/아이스|차갑|시원|ice/.test(raw)) {
                    tempItem.temp = "아이스(ICE)";
                    askQuantity();
                    return true;
                }
            }

            if (stage === "upsell") {
                if (/세트|같이/.test(raw)) {
                    tempItem.isSet = true;
                    askQuantity();
                    return true;
                }
                if (/단품|버거만|햄버거만/.test(raw)) {
                    tempItem.isSet = false;
                    askQuantity();
                    return true;
                }
            }

            if (stage === "cup_size" && /큰걸|큰컵|큰거|라지/.test(raw)) {
                return finishCup("500ml");
            }

            if (stage === "cup_size" && /보통사이즈|중간사이즈|미디엄/.test(raw) && !/큰|라지|작은|스몰/.test(raw)) {
                return finishCup("350ml");
            }

            if (stage === "cup_size" && /작은|작거|스몰|200|이백/.test(raw) && !/큰|라지|중간|미디엄|500|350/.test(raw)) {
                return finishCup("200ml");
            }

            if (stage === "beverage_option_step" && Array.isArray(optionList) && optionList[optionStepIndex]) {
                let level = 0;
                if (/달게|달콤|가득/.test(raw)) level = 5;
                else if (/많이/.test(raw)) level = 4;
                else if (/낮게|싱겁|덜달|안달/.test(raw)) level = 1;
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

            return false;
        }

        window.processVoiceCommand = function measuredProcessVoiceCommand(text) {
            if (typeof window.__kioskTtsBlocking === "function" && window.__kioskTtsBlocking()) {
                return previous.apply(this, arguments);
            }
            let spoken = String(text || "");
            const alias = resolveAlias(loadJSON(ALIAS_KEY, {}), spoken);
            if (alias) spoken = alias;
            const before = capture();
            const intent = String(window.__kioskCustomerIntent || "").trim();
            let result;
            try {
                if (applyKnownPhrase(spoken)) result = true;
                else result = previous.call(this, spoken);
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

        window.__kioskUseMetrics = summarize(loadJSON(EVENT_KEY, []));
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
