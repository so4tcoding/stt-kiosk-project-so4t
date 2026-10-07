/*
  인공지능 고객.
  올바른 주문 말을 단계마다 넣고, 키오스크가 실행하지 못한 말은
  기준 말로 학습한 뒤 한 번 더 말한다.
*/
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (typeof window !== "undefined") {
        window.KioskCustomer = api;
        const start = function () {
            if (/[?&]customer=1(?:&|$)/.test(location.search)) api.run();
        };
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
        else start();
    }
    root.KioskCustomer = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    function steps() {
        return [
            { group: "시작", prep: "welcome", text: "네", intended: "", expect: { type: "stage", value: "open_order_prompt" } },
            { group: "시작", prep: "welcome", text: "주문할래요", intended: "네", expect: { type: "stage", value: "open_order_prompt" } },
            { group: "메뉴", prep: "open", text: "나 음료 마실래", intended: "음료", expect: { type: "category", value: "음료" } },
            { group: "메뉴", prep: "open", text: "한우불고기", intended: "한우 불고기", expect: { type: "itemStage", item: "한우", stage: "quantity" } },
            { group: "메뉴", prep: "open", text: "한우 불고기", intended: "한우 불고기", expect: { type: "itemStage", item: "한우", stage: "quantity" } },
            { group: "메뉴", prep: "open", text: "불고기", intended: "불고기", expect: { type: "category", value: "불고기", notStage: "quantity" } },
            { group: "메뉴", prep: "grid:음료", text: "오렌지 주스", intended: "오렌지 주스", expect: { type: "itemStage", item: "오렌지", stage: "quantity" } },
            { group: "메뉴", prep: "grid:음료", text: "오렌쥐쥬스", intended: "오렌지 주스", expect: { type: "itemStage", item: "오렌지", stage: "quantity" } },
            { group: "안내", prep: "grid:음료", text: "무슨 메뉴가 있는데", intended: "무슨 메뉴가 있는데", expect: { type: "spoken", value: "오렌지", stage: "menu_grid" } },
            { group: "안내", prep: "grid:음료", text: "그게 뭐냐고", intended: "이게 뭐야", expect: { type: "spoken", value: "메뉴", stage: "menu_grid" } },
            { group: "메뉴", prep: "grid:햄버거", text: "불고기버거", intended: "불고기버거", expect: { type: "itemStage", item: "불고기버거", stage: "upsell" } },
            { group: "메뉴", prep: "grid:커피", text: "아메리카노", intended: "아메리카노", expect: { type: "itemStage", item: "아메리카노", stage: "temp" } },
            { group: "메뉴", prep: "grid:국밥", text: "돼지국밥", intended: "돼지국밥", expect: { type: "itemStage", item: "돼지국밥", stage: "quantity" } },
            { group: "메뉴", prep: "grid:디저트", text: "치즈 케이크", intended: "치즈 케이크", expect: { type: "itemStage", item: "치즈", stage: "quantity" } },
            { group: "메뉴", prep: "grid:음료", text: "콜라", intended: "콜라", expect: { type: "itemStage", item: "콜라", stage: "quantity" } },
            { group: "수량", prep: "qty:오렌지 주스", text: "두 개", intended: "두 개", expect: { type: "count", count: 2, stage: "cup_size", item: "오렌지" } },
            { group: "수량", prep: "qty:오렌지 주스", text: "두잔", intended: "두 개", expect: { type: "count", count: 2, stage: "cup_size", item: "오렌지" } },
            { group: "수량", prep: "qty:한우 불고기", text: "세 개", intended: "세 개", expect: { type: "countLeave", count: 3, item: "한우" } },
            { group: "뒤로", prep: "qty:오렌지 주스", text: "이전으로", intended: "이전으로", expect: { type: "back", item: "오렌지" } },
            { group: "단계", prep: "opt", text: "1단계", intended: "1단계", expect: { type: "sugar", value: 1 } },
            { group: "단계", prep: "opt", text: "이단계", intended: "이단계", expect: { type: "sugar", value: 2 } },
            { group: "단계", prep: "opt", text: "삼 단계", intended: "삼 단계", expect: { type: "sugar", value: 3 } },
            { group: "단계", prep: "opt", text: "사단계", intended: "사단계", expect: { type: "sugar", value: 4 } },
            { group: "단계", prep: "opt", text: "오단계", intended: "오단계", expect: { type: "sugar", value: 5 } },
            { group: "추천", prep: "welcome", text: "추천해줘", intended: "추천해줘", expect: { type: "stage", value: "taste_select_prompt" } },
            { group: "추천", prep: "taste", text: "짭짤한 맛", intended: "짭짤", expect: { type: "gridHas", value: "한우", stage: "menu_grid" } },
            { group: "무시", prep: "grid:음료", text: "안녕하세요 날씨 좋네요", intended: "", expect: { type: "ignore" } },
            { group: "용량", prep: "cup:콜라", text: "라지", intended: "라지", expect: { type: "stage", value: "add_more_prompt" } },
            { group: "결제", prep: "place", text: "매장에서 먹을게요", intended: "매장에서", expect: { type: "place", value: "매장" } },
            { group: "결제", prep: "more", text: "아니요", intended: "아니요", expect: { type: "stage", value: "place" } },
            { group: "온도", prep: "temp:아메리카노", text: "뜨겁게요", intended: "핫", expect: { type: "hot" } },
            { group: "온도", prep: "temp:아메리카노", text: "아이스로 주세요", intended: "아이스", expect: { type: "ice" } },
            { group: "세트", prep: "upsell:불고기버거", text: "세트로 주세요", intended: "세트", expect: { type: "set" } },
            { group: "세트", prep: "upsell:불고기버거", text: "단품으로 주세요", intended: "단품", expect: { type: "single" } },
            { group: "단계", prep: "opt", text: "당도 낮게", intended: "1단계", expect: { type: "sugar", value: 1 } },
            { group: "단계", prep: "opt", text: "달게 해주세요", intended: "5단계", expect: { type: "sugar", value: 5 } },
            { group: "용량", prep: "cup:콜라", text: "작은 거로", intended: "스몰", expect: { type: "stage", value: "add_more_prompt" } },
            { group: "안내", prep: "grid:음료", text: "안 들려", intended: "안 들려", expect: { type: "spoken", value: "소리", stage: "menu_grid" } },
            { group: "메뉴", prep: "grid:국밥", text: "순대국밥", intended: "순대국밥", expect: { type: "itemStage", item: "순대", stage: "quantity" } },
            { group: "수량", prep: "qty:오렌지 주스", text: "한 잔만", intended: "한 개", expect: { type: "count", count: 1, stage: "cup_size", item: "오렌지" } },
            { group: "단계", prep: "opt", text: "당도 많이", intended: "4단계", expect: { type: "sugar", value: 4 } },
            { group: "결제", prep: "more", text: "없어요", intended: "아니요", expect: { type: "stage", value: "place" } },
            { group: "결제", prep: "more", text: "더 담을게요", intended: "네", expect: { type: "stage", value: "category_select" } },
            { group: "메뉴", prep: "grid:음료", text: "오렌지 주스 두 잔", intended: "오렌지 주스", expect: { type: "count", count: 2, stage: "cup_size", item: "오렌지" } },
            { group: "메뉴", prep: "grid:국밥", text: "돼지국밥 세 개", intended: "돼지국밥", expect: { type: "countLeave", count: 3, item: "돼지" } },
            { group: "수량", prep: "qty:한우 불고기", text: "네잔", intended: "네 개", expect: { type: "countLeave", count: 4, item: "한우" } },
            { group: "용량", prep: "cup:사이다", text: "보통 사이즈", intended: "미디엄", expect: { type: "stage", value: "add_more_prompt" } },
            { group: "결제", prep: "pay", text: "카드로 계산", intended: "카드", expect: { type: "pay", value: "카드" } },
            { group: "추천", prep: "taste", text: "얼큰한 맛", intended: "얼큰", expect: { type: "gridHas", value: "소고기", stage: "menu_grid" } },
            { group: "추천", prep: "taste", text: "담백한 거", intended: "", expect: { type: "spoken", value: "달콤", stage: "taste_select_prompt" } },
            { group: "메뉴", prep: "grid:커피", text: "아이스 아메리카노", intended: "아메리카노", expect: { type: "ice" } },
            { group: "메뉴", prep: "grid:햄버거", text: "치즈버거 세트", intended: "치즈버거", expect: { type: "set" } },
            { group: "용량", prep: "cup:사이다", text: "큰 걸로", intended: "라지", expect: { type: "stage", value: "add_more_prompt" } },
            { group: "단계", prep: "opt", text: "당도 가득", intended: "5단계", expect: { type: "sugar", value: 5 } },
            { group: "수량", prep: "qty:오렌지 주스", text: "2잔", intended: "두 개", expect: { type: "count", count: 2, stage: "cup_size", item: "오렌지" } },
            { group: "안내", prep: "grid:커피", text: "소리 키워 줘", intended: "소리", expect: { type: "spoken", value: "소리", stage: "menu_grid" } },
            { group: "결제", prep: "more", text: "그만 담을게요", intended: "아니요", expect: { type: "stage", value: "place" } },
            { group: "결제", prep: "more", text: "이게 다예요", intended: "아니요", expect: { type: "stage", value: "place" } },
            { group: "안내", prep: "grid:커피", text: "글자 키워 줘", intended: "확대", expect: { type: "spoken", value: "확대", stage: "menu_grid" } },
            { group: "온도", prep: "temp:아메리카노", text: "뜨끈하게", intended: "핫", expect: { type: "hot" } },
            { group: "추천", prep: "welcome", text: "뭐가 맛있어", intended: "추천해줘", expect: { type: "stage", value: "taste_select_prompt" } },
            { group: "결제", prep: "more", text: "추가 안 할래요", intended: "아니요", expect: { type: "stage", value: "place" } }
        ];
    }

    function passes(expect, after) {
        if (!expect) return false;
        if (expect.type === "stage") return after.stage === expect.value;
        if (expect.type === "category") {
            const ok = after.cat === expect.value || String(after.grid || "").indexOf(expect.value) >= 0;
            return ok && after.stage !== expect.notStage;
        }
        if (expect.type === "itemStage") return after.stage === expect.stage && String(after.item || "").indexOf(expect.item) >= 0;
        if (expect.type === "spoken") return after.stage === expect.stage && String(after.spoken || "").indexOf(expect.value) >= 0;
        if (expect.type === "count") {
            return after.count === expect.count && after.stage === expect.stage && String(after.item || "").indexOf(expect.item) >= 0;
        }
        if (expect.type === "countLeave") {
            return after.count === expect.count && after.stage !== "quantity" && String(after.item || "").indexOf(expect.item) >= 0;
        }
        if (expect.type === "back") return after.stage !== "quantity" && String(after.item || "").indexOf(expect.item) >= 0;
        if (expect.type === "sugar") return after.sugar === expect.value && after.step !== 1;
        if (expect.type === "gridHas") return after.stage === expect.stage && String(after.grid || "").indexOf(expect.value) >= 0;
        if (expect.type === "ignore") return after.stage === "menu_grid" && !after.item;
        if (expect.type === "place") return after.stage === "summary" && String(after.place || "").indexOf(expect.value) >= 0 && /원/.test(after.spoken || "");
        if (expect.type === "hot") return after.stage === "quantity" && /핫/.test(after.temp || "");
        if (expect.type === "ice") return after.stage === "quantity" && /아이스/.test(after.temp || "");
        if (expect.type === "set") return after.stage === "quantity" && after.set === true;
        if (expect.type === "single") return after.stage === "quantity" && after.set === false;
        if (expect.type === "pay") return String(after.pay || "").indexOf(expect.value || "") >= 0 && expect.value;
        return false;
    }

    function run(list) {
        if (typeof window.__kioskCustomerSay !== "function") {
            console.log("[고객] 사용 기록이 아직 없습니다.");
            return null;
        }
        const savedSpeak = window.speakText;
        const savedBlock = window.__kioskTtsBlocking;

        function hush() {
            window.__kioskTtsBlocking = function () { return false; };
            window.__kioskTtsHeardUntil = 0;
            window.__TTS_FINAL_MIC_OFF = false;
            window.__TTS_FINAL_MIC_OFF_UNTIL = 0;
            window.isTtsSpeaking = false;
            window.__ttsHardBlock = false;
            window.__ttsBlockUntil = 0;
            try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
            window.speakText = function (text) {
                if (text) window.__kioskLastSpoken = String(text);
                window.isTtsSpeaking = false;
                window.__ttsHardBlock = false;
                window.__kioskTtsHeardUntil = 0;
            };
            try { speakText = window.speakText; } catch (e) {}
        }

        function capture() {
            let sugar = null;
            try { sugar = tempItem && tempItem.beverageOptions ? tempItem.beverageOptions.sugar : null; } catch (e) {}
            let grid = "";
            try { grid = (currentGridMenus || []).map(function (menu) { return menu.name; }).join("|"); } catch (e2) {}
            return {
                stage: currentStageName,
                item: (tempItem && tempItem.item) || "",
                count: tempItem ? tempItem.count : 0,
                cat: selectedCategory || "",
                grid: grid,
                sugar: sugar,
                step: optionStepIndex,
                place: (orderState && orderState.place) || "",
                temp: (tempItem && tempItem.temp) || "",
                set: !!(tempItem && tempItem.isSet),
                pay: (orderState && orderState.pay) || "",
                spoken: String(window.__kioskLastSpoken || "")
            };
        }

        function blank() {
            hush();
            orderState = { items: [], place: "", pay: "" };
            tempItem = emptyTempItem();
            isAddOnPhase = false;
            optionList = [];
            optionStepIndex = 0;
            selectedCategory = "";
            currentGridMenus = [];
            pendingMenuName = "";
            window.__kioskLastSpoken = "";
            currentStageName = "welcome";
        }

        function prepare(kind) {
            blank();
            if (kind === "welcome") return;
            if (kind === "open") { currentStageName = "open_order_prompt"; return; }
            if (kind === "taste") { currentStageName = "taste_select_prompt"; return; }
            if (kind.indexOf("grid:") === 0) {
                const cat = kind.slice(5);
                selectedCategory = cat;
                currentGridMenus = customMenus.filter(function (menu) { return menu.category === cat; });
                currentStageName = "menu_grid";
                return;
            }
            if (kind.indexOf("qty:") === 0) {
                tempItem.item = kind.slice(4);
                tempItem.count = 0;
                currentStageName = "quantity";
                return;
            }
            if (kind.indexOf("cup:") === 0) {
                tempItem.item = kind.slice(4);
                tempItem.count = 1;
                tempItem.temp = "아이스(ICE)";
                currentStageName = "cup_size";
                return;
            }
            if (kind === "opt") {
                tempItem.item = "오렌지 주스";
                tempItem.count = 1;
                tempItem.cupSize = "500ml";
                tempItem.temp = "아이스(ICE)";
                tempItem.beverageOptions = { ice: 1, sugar: 1, syrup: 1, whip: 1, pearl: 1, fruit: 1 };
                const menu = customMenus.find(function (item) { return item.name === "오렌지 주스"; });
                optionList = generateDrinkOptions(tempItem.item, menu.category, tempItem.temp);
                optionStepIndex = optionList.findIndex(function (opt) { return opt.key === "sugar"; });
                currentStageName = "beverage_option_step";
                return;
            }
            if (kind === "place") {
                tempItem.item = "오렌지 주스";
                tempItem.count = 1;
                tempItem.temp = "기본";
                commitTempItemToCartIfValid();
                currentStageName = "place";
                return;
            }
            if (kind === "more") {
                tempItem.item = "오렌지 주스";
                tempItem.count = 1;
                currentStageName = "add_more_prompt";
                return;
            }
            if (kind.indexOf("temp:") === 0) {
                tempItem.item = kind.slice(5);
                currentStageName = "temp";
                return;
            }
            if (kind.indexOf("upsell:") === 0) {
                tempItem.item = kind.slice(7);
                currentStageName = "upsell";
                return;
            }
            if (kind === "pay") {
                tempItem.item = "오렌지 주스";
                tempItem.count = 1;
                tempItem.temp = "기본";
                commitTempItemToCartIfValid();
                orderState.place = "매장에서 먹기";
                currentStageName = "payment";
                return;
            }
            if (kind === "sum") {
                tempItem.item = "오렌지 주스";
                tempItem.count = 1;
                tempItem.temp = "기본";
                commitTempItemToCartIfValid();
                orderState.place = "매장에서 먹기";
                currentStageName = "summary";
            }
        }

        const report = { total: 0, passed: 0, learned: 0, missed: [], rows: [] };
        (list && list.length ? list : steps()).forEach(function (step) {
            hush();
            prepare(step.prep);
            window.__kioskCustomerSay(step.text, step.intended || "");
            let after = capture();
            let passed = passes(step.expect, after);
            let learned = false;
            if (!passed && step.intended) {
                prepare(step.prep);
                window.__kioskCustomerSay(step.text, "");
                after = capture();
                passed = passes(step.expect, after);
                learned = passed;
            }
            report.total += 1;
            if (passed) report.passed += 1;
            if (learned) report.learned += 1;
            if (!passed) {
                report.missed.push({
                    group: step.group,
                    text: step.text,
                    stage: after.stage,
                    item: after.item,
                    spoken: String(after.spoken || "").slice(0, 80)
                });
            }
            report.rows.push({ group: step.group, text: step.text, passed: passed, learned: learned, stage: after.stage, item: after.item });
        });

        window.speakText = savedSpeak;
        try { speakText = savedSpeak; } catch (e) {}
        window.__kioskTtsBlocking = savedBlock;
        window.__kioskCustomerReport = report;
        console.log("[고객] 통과 " + report.passed + "/" + report.total + ", 학습으로 살린 말 " + report.learned + ", 아직 실행 안 됨 " + report.missed.length);
        report.missed.forEach(function (miss) {
            console.log("[고객] 실행 안 됨:", miss.text, miss.stage, miss.item);
        });
        return report;
    }

    if (typeof window !== "undefined") {
        window.__kioskRunCustomer = function () { return run(steps()); };
        window.__kioskTryCustomer = function (extra) { return run(extra); };
    }

    return { steps: steps, passes: passes, run: run };
});
