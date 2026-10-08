/*
  초고령층 손님 500명이 화면 안에서 한 명씩 주문한다.
  안내 문장이 길거나 어려워 못 알아들은 경우와,
  알아듣고 한 말을 키오스크가 받지 못한 경우를 나눠 기록한다.
*/
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (typeof window !== "undefined") {
        window.KioskElderSim = api;
        window.__kioskRunElderSim = api.run;
        window.__kioskRunAgedSim = api.runAged;
        window.__kioskRunUntaught = api.runUntaughtMany;
    }
    root.KioskElderSim = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    const SHOPS = ["gukbap", "cafe", "burger", "flower", "stationery", "gift"];
    const SHOP_NAME = { gukbap: "국밥집", cafe: "카페", burger: "햄버거집", flower: "꽃집", stationery: "문구점", gift: "선물가게" };
    const SCREEN = {
        welcome: "첫 화면",
        open_order_prompt: "메뉴를 묻는 화면",
        category_select: "카테고리 화면",
        menu_grid: "메뉴판",
        menu_confirm: "메뉴 확인",
        quantity: "수량",
        temp: "온도",
        cup_size: "잔 크기",
        upsell: "세트 선택",
        beverage_option_prompt: "음료 옵션",
        beverage_option_step: "당도",
        add_more_prompt: "추가 주문",
        place: "매장 또는 포장",
        summary: "주문 내역",
        payment: "결제",
        guidance: "결제 안내",
        guide: "사용법",
        taste_select_prompt: "맛 선택",
        shop_ask: "가게 질문"
    };

    function mulberry32(seed) {
        let a = seed >>> 0;
        return function () {
            a |= 0;
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

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

    function resetOrder(shopId) {
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
        window.__kioskLastSpoken = "";
        window.__kioskHeard = "";
        window.__kioskExplainAt = 0;
        window.__kioskExplainSimple = false;
        try { window.zoomLevel = 0; zoomLevel = 0; } catch (e) {}
        currentStageName = "welcome";
    }

    function zoomNeed(bot) {
        const vision = Number(bot && bot.vision);
        if (vision >= 0.45) return 0;
        if (vision >= 0.3) return 1;
        if (vision >= 0.18) return 2;
        return 3;
    }

    function zoomNow() {
        return Math.max(0, Number(window.zoomLevel) || 0);
    }

    function readingStage(stage) {
        return stage === "category_select" || stage === "menu_grid" || stage === "menu_confirm" || stage === "open_order_prompt";
    }

    function snapshot() {
        const cart = (orderState && orderState.items) ? orderState.items.map(function (item) {
            return { name: item.name || item.item || "", count: item.count || 0 };
        }) : [];
        return {
            stage: currentStageName,
            item: (tempItem && tempItem.item) || "",
            count: tempItem ? Number(tempItem.count) || 0 : 0,
            place: (orderState && orderState.place) || "",
            pay: (orderState && orderState.pay) || "",
            cart: cart,
            spoken: String(window.__kioskLastSpoken || "")
        };
    }

    function say(text) {
        const before = snapshot();
        window.__kioskCustomerSay(text, "");
        return { before: before, after: snapshot() };
    }

    function heardLine(raw, heard, shopId) {
        const qty = shopId === "cafe" ? "잔" : (shopId === "gukbap" ? "" : "개");
        if (typeof window.__kioskTalkLine === "function") return window.__kioskTalkLine(raw, heard, qty);
        return String(raw || "");
    }

    function screenName(stage) {
        return SCREEN[stage] || stage || "알 수 없는 화면";
    }

    function countWord(n) {
        return ["", "한", "두", "세", "네"][n] || "한";
    }

    function unitOf(shopId) {
        return shopId === "cafe" ? "잔" : "개";
    }

    function shortMenu(name) {
        const known = {
            "돼지국밥": "국밥",
            "순대국밥": "순대",
            "소고기국밥": "국",
            "수육 백반": "백반",
            "한우 불고기": "불고기",
            "불고기 덮밥": "덮밥",
            "치즈버거": "버거",
            "불고기버거": "버거",
            "치킨버거": "치킨",
            "아메리카노": "커피",
            "카페라떼": "라떼",
            "딸기 라떼": "딸기",
            "오렌지 주스": "주스",
            "레몬 에이드": "에이드",
            "쿠키 쉐이크": "쉐이크",
            "치즈 케이크": "케이크",
            "초코 케이크": "케이크",
            "당근 케이크": "케이크",
            "소프트 아이스크림": "아이스크림",
            "장미 한 송이": "장미",
            "꽃다발": "꽃",
            "꽃바구니": "꽃",
            "양말 선물세트": "양말"
        };
        return known[name] || String(name || "").split(" ")[0];
    }

    function clearLine(goal, stage) {
        const n = countWord(goal.count);
        const unit = goal.unit;
        if (stage === "welcome") return "주문할게요";
        if (stage === "guide") return "주문할게요";
        if (stage === "shop_ask") return goal.shopName;
        if (stage === "menu_confirm") return "네";
        if (stage === "category_select" || stage === "menu_grid" || stage === "open_order_prompt") return goal.menu;
        if (stage === "quantity" || stage === "summary_add_quantity") return n + " " + unit;
        if (stage === "temp") return goal.hot ? "따뜻하게" : "아이스로";
        if (stage === "cup_size") return goal.large ? "큰 잔" : "중간 잔";
        if (stage === "upsell") return "단품";
        if (stage === "beverage_option_prompt" || stage === "beverage_option_step") return "아니요";
        if (stage === "add_more_prompt") return "아니요";
        if (stage === "place") return goal.takeout ? "포장" : "여기서 먹을게요";
        if (stage === "summary") return "결제";
        if (stage === "payment") return goal.card ? "카드" : "현금";
        if (stage === "taste_select_prompt") return "달콤";
        return goal.menu;
    }

    function messyLine(goal, stage, rand) {
        const n = countWord(goal.count);
        const unit = goal.unit;
        if (stage === "welcome" || stage === "guide") return rand() < 0.5 ? "밥 먹을게요" : "먹을래요";
        if (stage === "menu_confirm") return rand() < 0.5 ? "응" : "그거요";
        if (stage === "category_select" || stage === "menu_grid" || stage === "open_order_prompt") {
            if (rand() < 0.45) return shortMenu(goal.menu);
            if (rand() < 0.5) return goal.menu.replace(/\s/g, "") + "요";
            return goal.menu + " 주이소";
        }
        if (stage === "quantity" || stage === "summary_add_quantity") {
            const forms = [n + unit, n + " " + unit + "요", "하나", n + " " + unit + " 주이소"];
            return forms[Math.floor(rand() * forms.length)];
        }
        if (stage === "temp") return goal.hot ? "뜨겁게" : "차갑게";
        if (stage === "cup_size") return goal.large ? "크게" : "작게";
        if (stage === "upsell") return rand() < 0.5 ? "그냥" : "햄버거만";
        if (stage === "add_more_prompt" || stage === "beverage_option_prompt" || stage === "beverage_option_step") {
            return rand() < 0.5 ? "됐어" : "없어요";
        }
        if (stage === "place") return goal.takeout ? "가져갈게" : "여기서";
        if (stage === "summary") return rand() < 0.5 ? "카드" : "계산이요";
        if (stage === "payment") return goal.card ? "카드로요" : "현금으로";
        return "네";
    }

    function understands(line, bot) {
        const text = String(line || "").replace(/\s+/g, " ").trim();
        if (!text) return false;
        if (text.length > bot.maxChars) return false;
        const sentences = text.split(/[.?!]/).filter(function (part) { return part.trim(); }).length;
        if (sentences >= 3 && bot.hearing < 0.62) return false;
        if (/스몰|미디엄|라지|카테고리|밀리리터/.test(text) && bot.hearing < 0.85) return false;
        return true;
    }

    function confusedSay(rand) {
        const lines = ["뭐라고요", "다시요", "잘 모르겠어요"];
        return lines[Math.floor(rand() * lines.length)];
    }

    function moved(before, after) {
        if (before.stage !== after.stage) return true;
        if (before.item !== after.item && after.item) return true;
        if (before.count !== after.count && after.count) return true;
        if (before.place !== after.place && after.place) return true;
        if (before.pay !== after.pay && after.pay) return true;
        if (before.cart.length !== after.cart.length) return true;
        return false;
    }

    function done(goal, state) {
        const hit = state.cart.some(function (item) { return item.name === goal.menu && item.count >= 1; });
        return hit && (state.stage === "guidance" || state.stage === "done");
    }

    function wrongMenu(goal, before, after) {
        const naming = /open_order_prompt|menu_grid|category_select|menu_confirm/.test(before.stage);
        if (naming && after.item && after.item !== goal.menu) return after.item;
        const other = after.cart.filter(function (item) { return item.name && item.name !== goal.menu; });
        if (other.length && !after.cart.some(function (item) { return item.name === goal.menu; })) return other[0].name;
        return "";
    }

    function bugText(goal, before, after, said) {
        const spoken = String(after.spoken || "");
        const picked = wrongMenu(goal, before, after);
        if (picked) return "말은 '" + said + "'인데 '" + picked + "'로 들어감";
        if (before.stage === "quantity" && after.count && after.count !== goal.count) {
            return "'" + said + "'라고 했으나 " + after.count + goal.unit + "로 담김";
        }
        if (/뭐라고|안 들려|안들려/.test(said) && /소리를 키우/.test(spoken)) return "'" + said + "'라고 했더니 소리를 키우고 화면은 그대로임";
        if (before.stage === after.stage && /선택했습니다|키웠습니다|대답하지 않으셔도/.test(spoken)) {
            return "말은 알아들었으나 화면이 안 넘어감. 나온 말: " + spoken.slice(0, 42);
        }
        if (/없습니다/.test(spoken)) return "없는 메뉴라고 대답함";
        if (/그 단어만으로는/.test(spoken)) return "그 단어만으로는 메뉴를 고르지 못함";
        if (before.stage === after.stage) return "같은 화면에서 반응이 없음";
        return screenName(before.stage) + "에서 " + screenName(after.stage) + "로 넘어갔지만 주문이 끝나지 않음";
    }

    function ageFilter(aged) {
        if (!aged || typeof window === "undefined") return null;
        return window.KioskAgeFilter || null;
    }

    function runOne(index, aged) {
        const filter = ageFilter(aged);
        const rand = mulberry32(filter ? filter.seed(index) : (24000 + index * 131));
        const shopId = filter ? SHOPS[filter.shopSlot(index)] : SHOPS[index % SHOPS.length];
        resetOrder(shopId);
        const names = (typeof customMenus !== "undefined" ? customMenus : []).map(function (menu) { return menu.name; }).filter(Boolean);
        const menu = names[Math.floor(rand() * names.length)] || "돼지국밥";
        const hearing = 0.15 + rand() * 0.85;
        const clarity = rand();
        const agedBot = filter ? filter.profile(rand) : null;
        const goal = {
            id: index + 1,
            shopId: shopId,
            shopName: SHOP_NAME[shopId],
            menu: menu,
            count: 1 + Math.floor(rand() * 3),
            unit: unitOf(shopId),
            hot: rand() < 0.45,
            large: rand() < 0.5,
            takeout: rand() < 0.55,
            card: rand() < 0.62
        };
        const bot = agedBot || { hearing: hearing, clarity: clarity, maxChars: Math.round(36 + hearing * 80) };
        window.__kioskLastSpoken = "고객님, 반갑습니다! 주문을 시작하시려면 네, 키오스크 사용법이 궁금하시면 사용법 알려줘 라고 말씀해주세요.";
        const turns = [];
        let ttsFails = 0;
        let wordFails = 0;
        let ok = false;
        let lastHeard = "";
        let stuck = 0;
        for (let step = 0; step < 24; step++) {
            const state = snapshot();
            if (done(goal, state)) { ok = true; break; }
            const prompt = heardLine(state.spoken, lastHeard, shopId);
            const gotIt = filter ? filter.understands(prompt, bot) : understands(prompt, bot);
            let said;
            if (filter && !bot.visionSaid && bot.vision < 0.18 && state.stage === "welcome") {
                bot.visionSaid = true;
                said = "글씨가 안 보여요";
            } else if (filter && !bot.volumeSaid && bot.volume < 0.2) {
                bot.volumeSaid = true;
                said = "안 들려요";
            } else if (!gotIt) {
                said = filter ? filter.confused(rand) : confusedSay(rand);
            } else if (filter && bot.diction < 0.5) {
                said = filter.dialect(goal, state.stage, rand);
            } else if (!filter && clarity < 0.38) {
                said = messyLine(goal, state.stage, rand);
            } else {
                said = clearLine(goal, state.stage);
            }
            const result = say(said);
            lastHeard = said;
            const after = result.after;
            if (done(goal, after)) { ok = true; break; }
            const picked = wrongMenu(goal, result.before, after);
            const progressed = moved(result.before, after) && !picked;
            if (progressed) {
                stuck = 0;
                continue;
            }
            stuck += 1;
            const cause = gotIt ? "키오스크가 단어를 못 알아들음" : "TTS를 못 알아들음";
            let bug = bugText(goal, result.before, after, said);
            if (!gotIt && !/소리를 키우/.test(bug)) bug = "안내를 못 알아듣고 '" + said + "'라고 말함. " + bug;
            if (gotIt) wordFails += 1;
            else ttsFails += 1;
            turns.push({
                bot: goal.id,
                shop: goal.shopName,
                menu: goal.menu,
                screen: screenName(result.before.stage),
                said: said,
                prompt: String(prompt || "").slice(0, 90),
                cause: cause,
                bug: bug,
                next: screenName(after.stage)
            });
            if (picked) break;
            if (stuck >= 3) break;
        }
        if (!ok && !turns.length) {
            const state = snapshot();
            wordFails += 1;
            turns.push({
                bot: goal.id,
                shop: goal.shopName,
                menu: goal.menu,
                screen: screenName(state.stage),
                said: "",
                prompt: heardLine(state.spoken, lastHeard, shopId).slice(0, 90),
                cause: "키오스크가 단어를 못 알아들음",
                bug: "24번을 말해도 결제가 끝나지 않음",
                next: screenName(state.stage)
            });
        }
        return { id: goal.id, shop: goal.shopName, menu: goal.menu, ok: ok, hearing: Math.round(bot.hearing * 100), vision: bot.vision ? Math.round(bot.vision * 100) : null, volume: bot.volume ? Math.round(bot.volume * 100) : null, clarity: Math.round((bot.diction || bot.clarity) * 100), ttsFails: ttsFails, wordFails: wordFails, turns: turns };
    }

    function average(rows, key) {
        const nums = rows.map(function (row) { return row[key]; }).filter(function (n) { return typeof n === "number"; });
        if (!nums.length) return null;
        return Math.round(nums.reduce(function (sum, n) { return sum + n; }, 0) / nums.length);
    }

    function run(count, aged) {
        const n = count || 500;
        if (aged && typeof window !== "undefined" && window.KioskAgeFilter) window.KioskAgeFilter.applyVisual();
        const rows = [];
        try {
        for (let i = 0; i < n; i++) rows.push(runOne(i, aged));
        const success = rows.filter(function (row) { return row.ok; }).length;
        const failRows = rows.filter(function (row) { return !row.ok; });
        const ttsOnly = failRows.filter(function (row) { return row.ttsFails > 0 && row.wordFails === 0; }).length;
        const wordOnly = failRows.filter(function (row) { return row.wordFails > 0 && row.ttsFails === 0; }).length;
        const both = failRows.filter(function (row) { return row.ttsFails > 0 && row.wordFails > 0; }).length;
        const byShop = SHOPS.map(function (id) {
            const name = SHOP_NAME[id];
            const list = rows.filter(function (row) { return row.shop === name; });
            const won = list.filter(function (row) { return row.ok; }).length;
            return { shop: name, total: list.length, success: won, fail: list.length - won };
        });
        const groups = {};
        failRows.forEach(function (row) {
            row.turns.forEach(function (turn) {
                const key = [turn.screen, turn.said, turn.cause, turn.bug].join("|");
                if (!groups[key]) groups[key] = Object.assign({ count: 0, bots: [] }, turn);
                groups[key].count += 1;
                if (groups[key].bots.length < 8) groups[key].bots.push(turn.bot);
            });
        });
        const table = Object.keys(groups).map(function (key) { return groups[key]; });
        table.sort(function (a, b) { return b.count - a.count; });
        return {
            total: n,
            success: success,
            fail: n - success,
            successRate: Math.round(success / n * 1000) / 10,
            failRate: Math.round((n - success) / n * 1000) / 10,
            ttsOnly: ttsOnly,
            wordOnly: wordOnly,
            both: both,
            byShop: byShop,
            table: table,
            aged: !!aged,
            avgHearing: average(rows, "hearing"),
            avgVision: average(rows, "vision"),
            avgVolume: average(rows, "volume")
        };
        } finally {
            if (aged && typeof window !== "undefined" && window.KioskAgeFilter) window.KioskAgeFilter.clearVisual();
        }
    }

    function runAged(count) {
        return run(count, true);
    }

    const FOLLOW_STYLES = ["앞말", "뒷말", "둘째", "네", "존댓말", "따라하기"];

    function taughtCommands(prompt) {
        return String(prompt || "")
            .replace(/[.?!]/g, " ")
            .split(",")
            .map(function (part) {
                return part
                    .replace(/라고 말씀해 주세요/g, " ")
                    .replace(/말씀해 주세요/g, " ")
                    .replace(/해 주세요/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();
            })
            .filter(function (part) { return part && part !== "라고"; });
    }

    function followInstruction(prompt, style) {
        const parts = taughtCommands(prompt);
        if (!parts.length) return "잘 모르겠어요";
        if (style === 1) return parts[parts.length - 1];
        if (style === 2) return parts[Math.min(1, parts.length - 1)];
        if (style === 3) {
            const yes = parts.filter(function (part) { return part === "네" || part === "예"; })[0];
            return yes || parts[0];
        }
        if (style === 4) return /요$/.test(parts[0]) ? parts[0] : parts[0] + "요";
        if (style === 5) return parts.join(" ");
        return parts[0];
    }

    function orderFinished(state) {
        const hit = state.cart.some(function (item) { return item.name && item.count >= 1; });
        return hit && (state.stage === "guidance" || state.stage === "done");
    }

    function withQuiet(fn) {
        const prevQuiet = window.__kioskSimQuiet;
        const prevSuite = window.__kioskSuiteRunning;
        let prevUpdate = null;
        let prevFit = null;
        const origTimeout = window.setTimeout;
        const origInterval = window.setInterval;
        window.__kioskSimQuiet = true;
        window.__kioskSuiteRunning = true;
        window.setTimeout = function () { return 0; };
        window.setInterval = function () { return 0; };
        try { if (typeof updateUI === "function") { prevUpdate = updateUI; updateUI = function () {}; } } catch (e) {}
        try { if (typeof fitToScreen === "function") { prevFit = fitToScreen; fitToScreen = function () {}; } } catch (e2) {}
        try {
            return fn();
        } finally {
            window.setTimeout = origTimeout;
            window.setInterval = origInterval;
            window.__kioskSimQuiet = prevQuiet;
            window.__kioskSuiteRunning = prevSuite;
            try { if (prevUpdate) updateUI = prevUpdate; } catch (e3) {}
            try { if (prevFit) fitToScreen = prevFit; } catch (e4) {}
        }
    }

    function runUntaught(index) {
        return withQuiet(function () { return runUntaughtBody(index); });
    }

    function runUntaughtBody(index) {
        const filter = ageFilter(true);
        const rand = mulberry32(filter ? filter.seed(index) : (88021 + index * 251));
        const shopId = SHOPS[(filter ? filter.shopSlot(index) : index) % SHOPS.length];
        resetOrder(shopId);
        const bot = filter ? filter.profile(rand) : { hearing: 0.4, vision: 0.4, volume: 0.4, diction: 0.4, comprehension: 0.8, maxChars: 40, visionSaid: false, volumeSaid: false };
        const menuCount = (typeof customMenus !== "undefined" && customMenus && customMenus.length) || 1;
        bot.looks = Math.floor(rand() * menuCount);
        bot.zoomNeed = zoomNeed(bot);
        const style = index % FOLLOW_STYLES.length;
        window.__kioskLastSpoken = "고객님, 반갑습니다! 주문을 시작하시려면 네, 키오스크 사용법이 궁금하시면 사용법 알려줘 라고 말씀해주세요.";
        let instruction = heardLine(window.__kioskLastSpoken, "", shopId);
        let stuck = 0;
        let ok = false;
        let ordered = "";
        let stage = "welcome";
        let lastSaid = "";
        let zoomHigh = 0;
        for (let step = 0; step < 48; step++) {
            const state = snapshot();
            if (zoomNow() > zoomHigh) zoomHigh = zoomNow();
            if (orderFinished(state)) {
                ok = true;
                ordered = state.cart[0].name;
                stage = state.stage;
                break;
            }
            const gotIt = filter ? filter.understands(instruction, bot) : understands(instruction, bot);
            const grasped = filter && typeof filter.grasps === "function" ? filter.grasps(instruction, bot) : true;
            let said;
            const reading = readingStage(state.stage);
            const seeing = reading && zoomNow() < bot.zoomNeed;
            const quiet = filter && !bot.volumeSaid && bot.volume < 0.2;
            if (seeing) {
                said = "글씨가 안 보여요";
            } else if (quiet) {
                bot.volumeSaid = true;
                said = "안 들려요";
            } else if (!gotIt) {
                said = filter ? filter.confused(rand) : confusedSay(rand);
            } else if (!grasped) {
                said = "이해가 안 돼요";
            } else if (reading && /다음/.test(instruction)) {
                if (bot.looks > 0) {
                    said = "다음";
                    bot.looks -= 1;
                } else {
                    const offered = taughtCommands(instruction);
                    said = offered[0] || followInstruction(instruction, style);
                }
            } else {
                said = followInstruction(instruction, style);
            }
            const complaint = said === "글씨가 안 보여요" || said === "안 들려요";
            lastSaid = said;
            const zoomBefore = zoomNow();
            const explainBefore = Number(window.__kioskExplainAt) || 0;
            const result = say(said);
            if (zoomNow() > zoomHigh) zoomHigh = zoomNow();
            if (!complaint) instruction = heardLine(result.after.spoken, said, shopId);
            if (orderFinished(result.after)) {
                ok = true;
                ordered = result.after.cart[0] ? result.after.cart[0].name : "";
                stage = result.after.stage;
                break;
            }
            const progressed = moved(result.before, result.after) || result.before.spoken !== result.after.spoken || zoomNow() !== zoomBefore || (Number(window.__kioskExplainAt) || 0) !== explainBefore;
            if (progressed) stuck = 0;
            else stuck += 1;
            stage = result.after.stage;
            if (stuck >= 3) break;
        }
        return {
            id: index + 1,
            shop: SHOP_NAME[shopId],
            style: FOLLOW_STYLES[style],
            hearing: Math.round(bot.hearing * 100),
            vision: Math.round(bot.vision * 100),
            comprehension: Math.round((bot.comprehension || 0) * 100),
            zoomNeed: bot.zoomNeed,
            zoomed: zoomHigh,
            ok: ok,
            menu: ordered,
            stage: stage,
            said: ok ? "" : lastSaid,
            prompt: ok ? "" : instruction
        };
    }

    function runUntaughtMany(start, count) {
        const n = count || 0;
        const from = start || 0;
        let success = 0;
        const fails = [];
        const menus = {};
        let zoomNeeded = 0;
        let zoomOk = 0;
        let lowComp = 0;
        let lowHear = 0;
        return withQuiet(function () {
        for (let i = 0; i < n; i++) {
            const row = runUntaughtBody(from + i);
            if (row.ok) {
                success += 1;
                const key = row.shop + " " + row.menu;
                menus[key] = (menus[key] || 0) + 1;
                if (row.zoomNeed > 0) {
                    zoomNeeded += 1;
                    if (row.zoomed >= row.zoomNeed) zoomOk += 1;
                }
                if (row.comprehension < 55) lowComp += 1;
                if (row.hearing < 35) lowHear += 1;
            } else if (fails.length < 8) fails.push(row);
        }
        return { start: from, total: n, success: success, fail: n - success, fails: fails, menus: menus, zoomNeeded: zoomNeeded, zoomOk: zoomOk, lowComp: lowComp, lowHear: lowHear };
        });
    }

    function trace(shopId, lines) {
        resetOrder(shopId);
        window.__kioskLastSpoken = "고객님, 반갑습니다! 주문을 시작하시려면 네 라고 말씀해주세요.";
        return lines.map(function (text) {
            const result = say(text);
            return { said: text, from: result.before.stage, to: result.after.stage, item: result.after.item, count: result.after.count, cart: result.after.cart, pay: result.after.pay };
        });
    }

    return { run: run, runOne: runOne, trace: trace, runAged: runAged, runUntaught: runUntaught, runUntaughtMany: runUntaughtMany };
});
