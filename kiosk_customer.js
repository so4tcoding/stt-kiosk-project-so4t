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
            { group: "결제", prep: "more", text: "아니요", intended: "아니요", expect: { type: "stage", value: "place" } }
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
        return false;
    }

    function run() {
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
            }
        }

        const report = { total: 0, passed: 0, learned: 0, missed: [], rows: [] };
        steps().forEach(function (step) {
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

    if (typeof window !== "undefined") window.__kioskRunCustomer = run;

    return { steps: steps, passes: passes, run: run };
});
