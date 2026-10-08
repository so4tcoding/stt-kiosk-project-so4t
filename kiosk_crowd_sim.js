/*
  튀김기 앞과 아이돌 공연장에서 말한 주문이 메뉴까지 가는지 센다.
  함성만 들리거나 옆 사람 메뉴가 섞이면 다시 말한 뒤의 결과까지 본다.
*/
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (typeof window !== "undefined") {
        window.KioskCrowdSim = api;
        window.__kioskRunCrowd = api.run;
    }
    root.KioskCrowdSim = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    const SHOPS = ["gukbap", "cafe", "burger", "flower", "stationery", "gift"];
    const SHOP_NAME = { gukbap: "국밥집", cafe: "카페", burger: "햄버거집", flower: "꽃집", stationery: "문구점", gift: "선물가게" };
    const KINDS = ["사투리", "보청기", "오인식", "주변소음", "옆사람", "안내메아리", "울림", "함성만", "한글자"];

    function hush() {
        window.__kioskTtsBlocking = function () { return false; };
        window.isTtsSpeaking = false;
        window.__ttsHardBlock = false;
        window.speakText = function (text) {
            if (text) window.__kioskLastSpoken = String(text);
            window.isTtsSpeaking = false;
        };
        try { speakText = window.speakText; } catch (e) {}
    }

    function reset(shopId) {
        hush();
        if (typeof window.__kioskApplyShop === "function") window.__kioskApplyShop(shopId);
        orderState = { items: [], place: "", pay: "" };
        tempItem = emptyTempItem();
        isAddOnPhase = false;
        optionList = [];
        optionStepIndex = 0;
        selectedCategory = "";
        currentGridMenus = [];
        pendingMenuName = "";
        pendingMenuIndex = -1;
        window.__kioskExplainAt = 0;
        window.__kioskExplainSimple = false;
        try { zoomLevel = 0; window.zoomLevel = 0; } catch (e) {}
        currentStageName = "welcome";
        window.__kioskLastSpoken = "";
    }

    function pairs() {
        const list = [];
        SHOPS.forEach(function (shop) {
            reset(shop);
            (customMenus || []).forEach(function (menu) {
                list.push({ shop: shop, shopName: SHOP_NAME[shop], menu: menu.name });
            });
        });
        return list;
    }

    function snap() {
        const cart = (orderState.items || []).map(function (item) {
            return { name: item.name || item.item || "", count: item.count || 0 };
        });
        return {
            stage: currentStageName,
            item: (tempItem && tempItem.item) || "",
            cart: cart,
            spoken: String(window.__kioskLastSpoken || "")
        };
    }

    function intent(stage, menu) {
        if (stage === "welcome" || stage === "guide") return "주문할게요";
        if (stage === "open_order_prompt" || stage === "category_select" || stage === "menu_grid" || stage === "menu_confirm") return menu;
        if (stage === "upsell") return "단품";
        if (stage === "temp") return "따뜻하게";
        if (stage === "quantity" || stage === "summary_add_quantity") return "한 개";
        if (stage === "cup_size") return "중간 잔";
        if (stage === "beverage_option_prompt" || stage === "beverage_option_step" || stage === "add_more_prompt") return "없어요";
        if (stage === "place") return "포장";
        if (stage === "summary") return "결제";
        if (stage === "payment") return "카드";
        if (stage === "taste_select_prompt") return "달콤";
        return menu;
    }

    function neighborOf(menu, names) {
        for (let i = 0; i < names.length; i++) {
            if (names[i] !== menu) return names[i];
        }
        return menu;
    }

    function sttOf(menu) {
        const key = String(menu || "").replace(/\s/g, "");
        const map = {
            "치즈버거": "치츠버거",
            "치킨버거": "치킨버거",
            "불고기버거": "불고비버거",
            "아메리카노": "아메리까노",
            "카페라떼": "까페라떼",
            "딸기 라떼": "딸기라테",
            "오렌지 주스": "오랜지주스",
            "레몬 에이드": "레몬애이드",
            "쿠키 쉐이크": "쿠키셰이크",
            "치즈 케이크": "치즈케익",
            "초코 케이크": "초코케익",
            "당근 케이크": "당근케익",
            "소프트 아이스크림": "소프트아이스크림",
            "순대국밥": "순대구갑",
            "소고기국밥": "쇠고기국밥",
            "돼지국밥": "돼지구갑",
            "장미 한 송이": "장미송이",
            "카네이션": "카네이숀",
            "볼펜": "볼팬",
            "손수건": "손수껀",
            "양말 선물세트": "양말세트",
            "콜라": "코라",
            "사이다": "싸이다",
            "달력": "달녁"
        };
        return map[menu] || map[key] || "";
    }

    function say(text) {
        const before = snap();
        window.processVoiceCommand(text);
        return { before: before, after: snap(), heard: text };
    }

    function wrong(menu, state) {
        if (state.item && state.item !== menu) return state.item;
        const other = state.cart.filter(function (item) { return item.name && item.name !== menu; });
        if (other.length && !state.cart.some(function (item) { return item.name === menu; })) return other[0].name;
        return "";
    }

    function finished(menu, state) {
        return state.cart.some(function (item) { return item.name === menu && item.count >= 1; }) && (state.stage === "guidance" || state.stage === "done");
    }

    function runOne(index, venue, catalog) {
        const noise = window.KioskNoise;
        const row = catalog[index % catalog.length];
        const kind = index % KINDS.length;
        reset(row.shop);
        const names = (customMenus || []).map(function (menu) { return menu.name; });
        const spec = {
            kind: kind,
            venue: venue,
            n: index,
            neighbor: neighborOf(row.menu, names),
            stt: sttOf(row.menu) || row.menu
        };
        let retries = 0;
        let wrongName = "";
        let last = "";
        let stage = "welcome";
        for (let step = 0; step < 28; step++) {
            const state = snap();
            if (finished(row.menu, state)) {
                return { ok: true, wrong: "", retries: retries, kind: KINDS[kind], shop: row.shopName, menu: row.menu, venue: venue };
            }
            const bad = wrong(row.menu, state);
            if (bad) {
                wrongName = bad;
                stage = state.stage;
                break;
            }
            const line = intent(state.stage, row.menu);
            const menuStage = state.stage === "open_order_prompt" || state.stage === "menu_grid" || state.stage === "category_select" || state.stage === "menu_confirm";
            let heard = line;
            if (menuStage) heard = noise.distort(line, spec);
            else if (kind === 0 && state.stage === "welcome") heard = "주문할라예";
            else if (kind === 0 && state.stage === "temp") heard = "뜨시게";
            else if (kind === 0 && (state.stage === "add_more_prompt" || state.stage === "beverage_option_prompt")) heard = "없심더";
            else if (kind === 0 && state.stage === "place") heard = "싸갈라예";
            else if (kind === 1) heard = line.replace(/요$/, "여");
            last = heard;
            const result = say(heard);
            const again = /다시/.test(result.after.spoken) || (menuStage && result.after.stage === result.before.stage && !result.after.item);
            if (again && retries < 3) {
                retries += 1;
                const retry = say(noise.distort(line, { kind: kind, venue: venue, loud: true, stt: row.menu }));
                if (wrong(row.menu, retry.after)) {
                    wrongName = wrong(row.menu, retry.after);
                    stage = retry.after.stage;
                    break;
                }
                if (finished(row.menu, retry.after)) {
                    return { ok: true, wrong: "", retries: retries, kind: KINDS[kind], shop: row.shopName, menu: row.menu, venue: venue };
                }
                continue;
            }
            if (wrong(row.menu, result.after)) {
                wrongName = wrong(row.menu, result.after);
                stage = result.after.stage;
                break;
            }
            stage = result.after.stage;
        }
        return {
            ok: finished(row.menu, snap()) && !wrongName,
            wrong: wrongName,
            retries: retries,
            kind: KINDS[kind],
            shop: row.shopName,
            menu: row.menu,
            venue: venue,
            stage: stage,
            said: last,
            spoken: String(window.__kioskLastSpoken || "").slice(0, 80)
        };
    }

    function run(venue, count, start) {
        const venueName = venue === "concert" ? "concert" : "fryer";
        const n = count || 0;
        const from = start || 0;
        const prevQuiet = window.__kioskSimQuiet;
        const prevSuite = window.__kioskSuiteRunning;
        const origTimeout = window.setTimeout;
        const origInterval = window.setInterval;
        window.__kioskSimQuiet = true;
        window.__kioskSuiteRunning = true;
        window.setTimeout = function () { return 0; };
        window.setInterval = function () { return 0; };
        let prevUpdate = null;
        let prevFit = null;
        try { if (typeof updateUI === "function") { prevUpdate = updateUI; updateUI = function () {}; } } catch (e) {}
        try { if (typeof fitToScreen === "function") { prevFit = fitToScreen; fitToScreen = function () {}; } } catch (e2) {}
        try {
            const catalog = pairs();
            let success = 0;
            let wrong = 0;
            let retried = 0;
            const byKind = {};
            const fails = [];
            KINDS.forEach(function (name) { byKind[name] = { total: 0, success: 0, wrong: 0 }; });
            for (let i = 0; i < n; i++) {
                const row = runOne(from + i, venueName, catalog);
                byKind[row.kind].total += 1;
                if (row.retries) retried += 1;
                if (row.wrong) {
                    wrong += 1;
                    byKind[row.kind].wrong += 1;
                }
                if (row.ok && !row.wrong) {
                    success += 1;
                    byKind[row.kind].success += 1;
                } else if (fails.length < 8) fails.push(row);
            }
            return {
                venue: venueName,
                start: from,
                total: n,
                menus: catalog.length,
                success: success,
                fail: n - success,
                wrong: wrong,
                retried: retried,
                byKind: byKind,
                fails: fails
            };
        } finally {
            window.setTimeout = origTimeout;
            window.setInterval = origInterval;
            window.__kioskSimQuiet = prevQuiet;
            window.__kioskSuiteRunning = prevSuite;
            try { if (prevUpdate) updateUI = prevUpdate; } catch (e3) {}
            try { if (prevFit) fitToScreen = prevFit; } catch (e4) {}
        }
    }

    return { run: run, kinds: KINDS.slice() };
});
