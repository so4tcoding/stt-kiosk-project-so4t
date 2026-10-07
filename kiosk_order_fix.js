/*
  메뉴판에서 "밑에서 n번째", "오른쪽 꺼", "왼쪽 꺼"를 고른다.
  메뉴 이름이 들어 있으면 이름 쪽이 이긴다.
  세번째, 첫번째, 3번처럼 위에서 세는 말은 기존 주문에 맡긴다.
*/
(function () {
    function install() {
        if (window.__kioskOrderFixInstalled) return;
        if (typeof window.processVoiceCommand !== "function") return;
        window.__kioskOrderFixInstalled = true;
        const previous = window.processVoiceCommand;

        function squash(text) {
            return String(text || "").replace(/[\s.,?!~]/g, "");
        }

        function ordinal(raw) {
            const digit = raw.match(/([0-9]+)(번째|번)/);
            if (digit) return parseInt(digit[1], 10);
            const steps = [
                [/열번째|열째|열번/, 10],
                [/아홉번째|아홉째|아홉번/, 9],
                [/여덟번째|여덟째|여덟번/, 8],
                [/일곱번째|일곱째|일곱번/, 7],
                [/여섯번째|여섯째|여섯번/, 6],
                [/다섯번째|다섯째|다섯번/, 5],
                [/네번째|넷째|네번/, 4],
                [/세번째|셋째|세번/, 3],
                [/두번째|둘째|두번/, 2],
                [/첫번째|첫째|첫번|일번/, 1]
            ];
            for (let i = 0; i < steps.length; i++) {
                if (steps[i][0].test(raw)) return steps[i][1];
            }
            return 0;
        }

        function hasMenuName(text, menus) {
            const raw = squash(text);
            const named = (menus || []).slice().sort(function (a, b) {
                return squash(b && b.name).length - squash(a && a.name).length;
            });
            for (let i = 0; i < named.length; i++) {
                const name = squash(named[i] && named[i].name);
                if (name.length >= 2 && raw.indexOf(name) !== -1) return true;
            }
            return false;
        }

        function sayMissing() {
            if (typeof speakText === "function") speakText("그 번호는 없습니다.");
        }

        function pickMenu(menus, index) {
            if (index < 0 || index >= menus.length) {
                sayMissing();
                return true;
            }
            const menu = menus[index];
            if (typeof highlightMenuConfirm === "function") highlightMenuConfirm(menu, index);
            else if (typeof selectSpecificItem === "function") selectSpecificItem(menu.name);
            return true;
        }

        function openCategory(cats, index) {
            if (index < 0 || index >= cats.length) {
                sayMissing();
                return true;
            }
            const name = cats[index];
            selectedCategory = name;
            currentGridMenus = customMenus.filter(function (menu) { return menu.category === name; });
            currentGridTitle = name + " 메뉴판";
            if (typeof transitionTo === "function" && typeof renderMenuGrid === "function") {
                transitionTo("menu_grid", renderMenuGrid);
            }
            return true;
        }

        function finishSummaryAdd() {
            const place = window.__kioskSummaryPlace || "";
            window.__kioskSummaryAdd = false;
            window.__kioskSummaryPlace = "";
            if (typeof tempItem !== "undefined" && tempItem) tempItem.presetCount = 0;
            if (typeof commitTempItemToCartIfValid === "function") commitTempItemToCartIfValid();
            if (typeof orderState !== "undefined" && orderState && place) orderState.place = place;
            if (typeof transitionTo === "function" && typeof renderSummary === "function") {
                transitionTo("summary", renderSummary);
            }
            return true;
        }

        function beginSummaryAdd(menu, count) {
            const place = (typeof orderState !== "undefined" && orderState && orderState.place) || "";
            window.__kioskSummaryAdd = true;
            window.__kioskSummaryPlace = place;
            window.__kioskSummaryQtySkipped = false;
            tempItem.item = menu.name;
            tempItem.count = count;
            tempItem.presetCount = count;
            tempItem.isSet = false;
            tempItem.temp = "기본";
            tempItem.options = "";
            tempItem.beverageOptions = null;
            tempItem.cupSize = "";
            const cat = menu.category || "";
            if (cat === "햄버거" && typeof askUpsell === "function") {
                askUpsell();
                return true;
            }
            if (cat === "커피" && typeof askTemperature === "function") {
                askTemperature();
                return true;
            }
            if (cat === "음료" && typeof transitionTo === "function" && typeof askCupSize === "function") {
                transitionTo("cup_size", askCupSize);
                return true;
            }
            return finishSummaryAdd();
        }

        if (typeof askQuantity === "function" && !askQuantity.__kioskSummaryCount) {
            const previousAsk = askQuantity;
            askQuantity = function () {
                const preset = typeof tempItem !== "undefined" && tempItem ? tempItem.presetCount : 0;
                if (!(preset > 0) || !window.__kioskSummaryAdd || window.__kioskSummaryQtySkipped) return previousAsk.apply(this, arguments);
                window.__kioskSummaryQtySkipped = true;
                tempItem.count = preset;
                let cat = "";
                try {
                    const row = customMenus.find(function (menu) { return menu.name === tempItem.item; });
                    cat = row ? row.category : "";
                } catch (e) {}
                if (cat === "음료" && typeof transitionTo === "function" && typeof askCupSize === "function") {
                    return transitionTo("cup_size", askCupSize);
                }
                if (cat === "커피" && typeof transitionTo === "function" && typeof renderBeverageOptionPrompt === "function") {
                    return transitionTo("beverage_option_prompt", renderBeverageOptionPrompt);
                }
                return finishSummaryAdd();
            };
            askQuantity.__kioskSummaryCount = true;
        }

        if (typeof transitionTo === "function" && !transitionTo.__kioskSummaryPlace) {
            const previousTransition = transitionTo;
            transitionTo = function (stageName, renderFn) {
                if (window.__kioskSummaryAdd && (stageName === "menu_grid" || stageName === "category_select" || stageName === "welcome" || stageName === "menu_confirm")) {
                    window.__kioskSummaryAdd = false;
                    window.__kioskSummaryPlace = "";
                    window.__kioskSummaryQtySkipped = false;
                }
                if (window.__kioskSummaryAdd && (stageName === "add_more_prompt" || stageName === "place")) {
                    const kept = window.__kioskSummaryPlace || ((typeof orderState !== "undefined" && orderState && orderState.place) || "");
                    if (kept) {
                        window.__kioskSummaryAdd = false;
                        window.__kioskSummaryPlace = "";
                        if (typeof tempItem !== "undefined" && tempItem) tempItem.presetCount = 0;
                        if (typeof commitTempItemToCartIfValid === "function") commitTempItemToCartIfValid();
                        if (typeof orderState !== "undefined" && orderState) orderState.place = kept;
                        return previousTransition.call(this, "summary", renderSummary);
                    }
                }
                return previousTransition.apply(this, arguments);
            };
            transitionTo.__kioskSummaryPlace = true;
        }

        window.processVoiceCommand = function (text) {
            const allowTts = typeof window.__kioskAllowDuringTts === "function" && window.__kioskAllowDuringTts(text);
            if (typeof window.__kioskTtsBlocking === "function" && window.__kioskTtsBlocking() && !allowTts) {
                return previous.apply(this, arguments);
            }
            try { window.__kioskHeard = String(text || "").trim(); } catch (e) {}
            const stage = typeof currentStageName === "undefined" ? "" : currentStageName;
            if (stage === "upsell") {
                const heard = squash(text);
                if (/세트/.test(heard) && /뭐|설명|뭔/.test(heard)) {
                    if (typeof speakText === "function") speakText("세트는 2000원이 더해집니다. 세트 또는 단품.");
                    return true;
                }
            }
            if (stage === "summary" && /추가/.test(squash(text))) {
                const count = typeof parseNumber === "function" ? parseNumber(String(text || "")) : 0;
                let menu = null;
                try { if (typeof findMatchingMenu === "function") menu = findMatchingMenu(text); } catch (e) {}
                if (menu && count > 0) return beginSummaryAdd(menu, count);
            }
            if (stage === "beverage_result") {
                const heard = squash(text);
                if (/이대로|그대로|이상태/.test(heard) && !/다시|아니/.test(heard) && typeof transitionTo === "function" && typeof renderAddMorePrompt === "function") {
                    transitionTo("add_more_prompt", renderAddMorePrompt);
                    return true;
                }
            }
            if (stage !== "menu_grid" && stage !== "category_select") {
                return previous.apply(this, arguments);
            }

            const raw = squash(text);
            if (/안보/.test(raw)) return previous.apply(this, arguments);

            let list = [];
            if (stage === "menu_grid") {
                try { list = (currentGridMenus || []).slice(); } catch (e) { list = []; }
                if (hasMenuName(text, list)) return previous.apply(this, arguments);
            } else {
                try {
                    list = [];
                    customMenus.forEach(function (menu) {
                        if (menu && menu.category && list.indexOf(menu.category) === -1) list.push(menu.category);
                    });
                } catch (e2) { list = []; }
                if (list.some(function (name) {
                    const key = squash(name);
                    return key.length >= 2 && raw.indexOf(key) !== -1;
                })) return previous.apply(this, arguments);
            }
            if (!list.length) return previous.apply(this, arguments);

            const fromBottom = /밑에서|아래에서|하단에서|맨아래/.test(raw);
            const number = ordinal(raw);
            const hasRight = /오른쪽|우측|오른편/.test(raw);
            const hasLeft = /왼쪽|좌측|왼편/.test(raw);
            if (!fromBottom && !hasRight && !hasLeft) return previous.apply(this, arguments);
            if (number > 0 && !fromBottom) return previous.apply(this, arguments);
            if (hasLeft && hasRight) return previous.apply(this, arguments);

            let index = -2;
            if (fromBottom && number > 0) {
                index = list.length - number;
            } else if (fromBottom && hasRight && !hasLeft) {
                const rows = Math.ceil(list.length / 2);
                index = (rows - 1) * 2 + 1;
                if (index >= list.length) index = list.length - 1;
            } else if (fromBottom && hasLeft && !hasRight) {
                const rows = Math.ceil(list.length / 2);
                index = (rows - 1) * 2;
            } else if (!fromBottom && hasRight && !hasLeft) {
                index = 1;
            } else if (!fromBottom && hasLeft && !hasRight) {
                index = 0;
            }
            if (index < -1) return previous.apply(this, arguments);
            if (stage === "menu_grid") return pickMenu(list, index);
            return openCategory(list, index);
        };
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();
