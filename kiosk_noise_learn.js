/*
  좋은 마이크가 소음을 지운 뒤에 남는 말을 주문으로 되돌린다.
  튀김 소리, 공연장 함성, 옆 사람 메뉴, 안내 메아리, 울림, 한 글자 오인식.
  메뉴가 두 개이거나 함성만 남으면 고르지 않고 다시 듣는다.
*/
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (typeof window !== "undefined") {
        window.KioskNoise = api;
        const boot = function () {
            if (window.__kioskNoiseInstalled) return;
            if (typeof window.processVoiceCommand !== "function") return;
            window.__kioskNoiseInstalled = true;
            const previous = window.processVoiceCommand;
            window.processVoiceCommand = function (text) {
                let stage = "";
                let menus = [];
                try { stage = typeof currentStageName === "undefined" ? "" : currentStageName; } catch (e) {}
                try { menus = typeof customMenus === "undefined" ? [] : customMenus; } catch (e2) {}
                const heard = api.repair(text, stage, menus);
                if (heard.action === "repeat") {
                    if (typeof speakText === "function") speakText("다시 한번 말씀해 주세요.");
                    return true;
                }
                if (heard.action === "use") return previous.call(this, heard.text);
                return previous.apply(this, arguments);
            };
        };
        if (typeof document !== "undefined" && document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
        else boot();
    }
    root.KioskNoise = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    const TOKENS = ["짝짝짝", "앙코르", "떼창", "함성", "오빠", "지글", "치익", "쉬익", "부글", "웅웅", "환호"];
    const STT = {
        "치츠버거": "치즈버거",
        "치킨버거": "치킨버거",
        "불고비버거": "불고기버거",
        "아메리까노": "아메리카노",
        "아매리카노": "아메리카노",
        "까페라떼": "카페라떼",
        "카페라테": "카페라떼",
        "딸기라테": "딸기 라떼",
        "오랜지주스": "오렌지 주스",
        "오렌지쥬스": "오렌지 주스",
        "레몬애이드": "레몬 에이드",
        "쿠키셰이크": "쿠키 쉐이크",
        "치즈케익": "치즈 케이크",
        "초코케익": "초코 케이크",
        "당근케익": "당근 케이크",
        "소프트아이스크림": "소프트 아이스크림",
        "순대구갑": "순대국밥",
        "쇠고기국밥": "소고기국밥",
        "돼지구갑": "돼지국밥",
        "장미송이": "장미 한 송이",
        "카네이숀": "카네이션",
        "볼팬": "볼펜",
        "손수껀": "손수건",
        "양말세트": "양말 선물세트",
        "코라": "콜라",
        "콜랑": "콜라",
        "싸이다": "사이다",
        "달녁": "달력",
        "주문할라예": "주문할게요",
        "없심더": "없어요",
        "싸갈라예": "포장",
        "뜨시게": "따뜻하게"
    };

    function compact(text) {
        return String(text || "").toLowerCase().replace(/[^0-9a-z가-힣]/g, "");
    }

    function stripTokens(text) {
        let spoken = " " + String(text || "") + " ";
        TOKENS.forEach(function (token) {
            spoken = spoken.split(token).join(" ");
        });
        return spoken.replace(/\s+/g, " ").trim();
    }

    function undouble(text) {
        const raw = String(text || "");
        if (raw.length >= 2 && raw[0] === raw[1]) return raw.slice(1);
        return raw;
    }

    function coreOf(text) {
        return undouble(compact(text))
            .replace(/(주이소|해주세요|해줘|주소|해소|이여|이요|하나)$/g, "")
            .replace(/여$/g, "");
    }

    function namesOf(menus) {
        const list = [];
        (menus || []).forEach(function (menu) {
            const name = String(menu && menu.name || "").trim();
            const key = compact(name);
            if (key.length >= 2) list.push({ name: name, key: key });
        });
        list.sort(function (a, b) { return b.key.length - a.key.length; });
        return list;
    }

    function hitsIn(text, menus) {
        const found = [];
        const used = [];
        for (let i = 0; i < text.length; i++) used.push(false);
        namesOf(menus).forEach(function (menu) {
            let from = 0;
            while (from <= text.length - menu.key.length) {
                const at = text.indexOf(menu.key, from);
                if (at < 0) break;
                let overlap = false;
                for (let i = at; i < at + menu.key.length; i++) {
                    if (used[i]) overlap = true;
                }
                if (!overlap) {
                    for (let i = at; i < at + menu.key.length; i++) used[i] = true;
                    found.push(menu);
                    break;
                }
                from = at + 1;
            }
        });
        return found;
    }

    function distance(a, b) {
        if (Math.abs(a.length - b.length) > 1) return 2;
        const row = [];
        for (let j = 0; j <= b.length; j++) row[j] = j;
        for (let i = 1; i <= a.length; i++) {
            let prev = row[0];
            row[0] = i;
            for (let j = 1; j <= b.length; j++) {
                const cur = row[j];
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
                prev = cur;
            }
            if (row[b.length] > 1 && i === a.length) return 2;
        }
        return row[b.length] > 1 ? 2 : row[b.length];
    }

    function uniqueEdit(text, menus) {
        const near = [];
        namesOf(menus).forEach(function (menu) {
            const dist = text === menu.key ? 0 : distance(text, menu.key);
            if (dist === 1) near.push(menu.name);
        });
        return { one: near.length === 1 ? near[0] : "", many: near.length > 1 };
    }

    function menuStage(stage) {
        return stage === "open_order_prompt" || stage === "menu_grid" || stage === "category_select" || stage === "menu_confirm";
    }

    function repair(text, stage, menus) {
        const original = String(text || "").trim();
        if (!original) return { action: "pass", text: original, how: "empty" };
        const stripped = stripTokens(original);
        const hadNoise = compact(stripped) !== compact(original);
        const body = coreOf(stripped);
        if (hadNoise && !body) return { action: "repeat", text: "", how: "noise" };
        if (STT[body]) return { action: "use", text: STT[body], how: "stt" };
        const hits = hitsIn(body, menus);
        if (hits.length >= 2) return { action: "repeat", text: "", how: "two-menus" };
        if (hits.length === 1) {
            const rest = body.split(hits[0].key).join("");
            if (!rest || rest === "다음") return { action: "use", text: hits[0].name, how: rest ? "echo" : "menu" };
        }
        if (menuStage(stage) && body.length >= 4 && !/^(주문|단품|세트|포장|결제|카드|현금|없|아니|다음|따뜻|차갑|소리|확대|사용법|글씨|화면|안보|도움)/.test(body)) {
            const fuzzy = uniqueEdit(body, menus);
            if (fuzzy.one) return { action: "use", text: fuzzy.one, how: "fuzzy" };
            if (fuzzy.many) return { action: "repeat", text: "", how: "ambiguous" };
        }
        if (hadNoise) {
            const cleaned = stripped.replace(/\s+/g, " ").trim();
            const cleanedKey = compact(cleaned);
            if (!cleanedKey) return { action: "repeat", text: "", how: "noise" };
            if (hitsIn(cleanedKey, menus).length >= 2) return { action: "repeat", text: "", how: "two-menus" };
            if (/^더크게(말|말해|말해줘|해주세요|해줘)?$/.test(cleanedKey)) return { action: "use", text: "소리 키워", how: "volume" };
            return { action: "use", text: cleaned, how: "stripped" };
        }
        return { action: "pass", text: original, how: "pass" };
    }

    function chant(venue, n) {
        if (venue === "concert") return ["앙코르", "오빠", "함성", "떼창"][n % 4];
        return ["지글", "치익", "쉬익", "부글"][n % 4];
    }

    function distort(intent, spec) {
        const raw = String(intent || "").trim();
        const loud = !!spec.loud;
        const kind = Number(spec.kind) || 0;
        const venue = spec.venue || "fryer";
        if (loud || kind === 0) {
            if (kind === 0 && !loud) return raw.replace(/\s/g, "") + "이여";
            return raw;
        }
        if (kind === 1) return raw.replace(/요$/, "여");
        if (kind === 2) return spec.stt || raw;
        if (kind === 3) return chant(venue, spec.n || 0) + " " + raw;
        if (kind === 4) return raw + " " + (spec.neighbor || "") + " " + chant(venue, spec.n || 0);
        if (kind === 5) return raw + " 다음";
        if (kind === 6) return raw ? raw[0] + raw : raw;
        if (kind === 7) return venue === "concert" ? "앙코르 오빠 함성" : "지글 치익 부글";
        if (kind === 8) {
            const flat = raw.replace(/\s/g, "");
            if (flat.length < 4) return raw;
            const at = (spec.n || 0) % flat.length;
            const chars = flat.split("");
            chars[at] = String.fromCharCode(chars[at].charCodeAt(0) + 1);
            return chars.join("");
        }
        return raw;
    }

    return {
        repair: repair,
        distort: distort,
        compact: compact,
        tokens: TOKENS.slice()
    };
});
