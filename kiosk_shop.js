/*
  처음 한 번만 가게를 물어 보고, 그 가게에 맞게 메뉴를 빼거나 더한다.
  화면 모양은 그대로 둔다.
*/
(function () {
    const SHOP_KEY = "kiosk_shop_v1";
    const SHOP_LINE = "국밥집, 카페, 햄버거집, 꽃집, 문구점, 선물가게";
    const PROFILES = {
        gukbap: {
            qtyWord: "",
            hint: "",
            extra: [],
            keep: function () { return true; }
        },
        cafe: {
            qtyWord: "잔",
            hint: "그 메뉴는 없습니다. 커피, 음료, 디저트 중에서 말씀해 주세요.",
            extra: [
                { name: "초코 케이크", price: 5900, taste: "진한 초코, 달콤한 맛", category: "디저트" },
                { name: "당근 케이크", price: 5700, taste: "고소한 당근, 달콤한 맛", category: "디저트" },
                { name: "티라미수", price: 6200, taste: "커피 향, 달콤한 맛", category: "디저트" }
            ],
            keep: function (menu) {
                return menu.category === "커피" || menu.category === "음료" || menu.category === "디저트";
            }
        },
        burger: {
            qtyWord: "개",
            hint: "그 메뉴는 없습니다. 햄버거, 콜라, 사이다, 디저트 중에서 말씀해 주세요.",
            extra: [
                { name: "치킨버거", price: 7200, taste: "바삭한 치킨, 고소한 맛", category: "햄버거" }
            ],
            keep: function (menu) {
                return menu.category === "햄버거" || menu.name === "콜라" || menu.name === "사이다" || menu.name === "치즈 케이크" || menu.name === "소프트 아이스크림";
            }
        },
        flower: {
            qtyWord: "개",
            hint: "그 메뉴는 없습니다. 꽃, 화분 중에서 말씀해 주세요.",
            extra: [
                { name: "장미 한 송이", price: 3000, taste: "붉은 장미", category: "꽃" },
                { name: "카네이션", price: 2500, taste: "분홍 카네이션", category: "꽃" },
                { name: "안개꽃", price: 4000, taste: "하얀 안개꽃", category: "꽃" },
                { name: "꽃다발", price: 25000, taste: "계절 꽃다발", category: "꽃" },
                { name: "꽃바구니", price: 35000, taste: "축하 꽃바구니", category: "꽃" },
                { name: "화분", price: 18000, taste: "작은 초록 화분", category: "화분" }
            ],
            keep: function () { return false; }
        },
        stationery: {
            qtyWord: "개",
            hint: "그 메뉴는 없습니다. 문구 중에서 말씀해 주세요.",
            extra: [
                { name: "볼펜", price: 1500, taste: "검은 볼펜", category: "문구" },
                { name: "편지지", price: 3000, taste: "편지지 한 세트", category: "문구" },
                { name: "축하 카드", price: 2000, taste: "손글씨 카드", category: "문구" },
                { name: "수첩", price: 5000, taste: "작은 수첩", category: "문구" },
                { name: "달력", price: 7000, taste: "벽걸이 달력", category: "문구" }
            ],
            keep: function () { return false; }
        },
        gift: {
            qtyWord: "개",
            hint: "그 메뉴는 없습니다. 선물 중에서 말씀해 주세요.",
            extra: [
                { name: "손수건", price: 8000, taste: "면 손수건", category: "선물" },
                { name: "머그컵", price: 12000, taste: "따뜻한 머그컵", category: "선물" },
                { name: "양말 선물세트", price: 15000, taste: "부드러운 양말", category: "선물" },
                { name: "보온병", price: 22000, taste: "따뜻한 보온병", category: "선물" }
            ],
            keep: function () { return false; }
        }
    };

    function plain(text) {
        return String(text || "").toLowerCase().replace(/[\s.,?!~]/g, "");
    }

    function copyMenu(menu) {
        return {
            name: menu.name,
            price: menu.price,
            taste: menu.taste,
            category: menu.category
        };
    }

    function paintIcons() {
        const icons = { "꽃": "💐", "화분": "🪴", "문구": "✏️", "선물": "🎁" };
        const tones = { "꽃": "warm", "화분": "cool", "문구": "primary", "선물": "warm" };
        try {
            Object.keys(icons).forEach(function (key) {
                categoryIconMap[key] = icons[key];
                categoryToneMap[key] = tones[key];
            });
            exactMenuIconMap["장미 한 송이"] = "🌹";
            exactMenuIconMap["카네이션"] = "🌷";
            exactMenuIconMap["안개꽃"] = "💐";
            exactMenuIconMap["꽃다발"] = "💐";
            exactMenuIconMap["꽃바구니"] = "🧺";
            exactMenuIconMap["화분"] = "🪴";
            exactMenuIconMap["초코 케이크"] = "🍫";
            exactMenuIconMap["당근 케이크"] = "🍰";
            exactMenuIconMap["티라미수"] = "🍰";
            exactMenuIconMap["치킨버거"] = "🍔";
            exactMenuIconMap["볼펜"] = "🖊️";
            exactMenuIconMap["편지지"] = "✉️";
            exactMenuIconMap["축하 카드"] = "💌";
            exactMenuIconMap["수첩"] = "📓";
            exactMenuIconMap["달력"] = "📅";
            exactMenuIconMap["손수건"] = "🧣";
            exactMenuIconMap["머그컵"] = "☕";
            exactMenuIconMap["양말 선물세트"] = "🧦";
            exactMenuIconMap["보온병"] = "🧴";
        } catch (e) {}
    }

    function snapshot() {
        if (window.__kioskMenuSnapshot || typeof customMenus === "undefined" || !Array.isArray(customMenus)) return;
        window.__kioskMenuSnapshot = customMenus.map(copyMenu);
    }

    function applyProfile(id) {
        const profile = PROFILES[id];
        if (!profile || !window.__kioskMenuSnapshot || typeof customMenus === "undefined") return false;
        const next = [];
        const removed = [];
        window.__kioskMenuSnapshot.forEach(function (menu) {
            if (profile.keep(menu)) next.push(copyMenu(menu));
            else removed.push(menu.name);
        });
        (profile.extra || []).forEach(function (menu) {
            if (!next.some(function (item) { return item.name === menu.name; })) next.push(copyMenu(menu));
        });
        customMenus.splice(0, customMenus.length);
        next.forEach(function (menu) { customMenus.push(menu); });
        window.__kioskShopId = id;
        window.__kioskQtyWord = profile.qtyWord || "";
        window.__kioskMenuHint = profile.hint || "";
        window.__kioskRemovedNames = removed;
        paintIcons();
        try { paintShopAdmin(); } catch (e) {}
        return true;
    }

    function parseShop(text) {
        const raw = plain(text);
        if (!raw) return "";
        if (/꽃집|꽃가게|플라워|생화|^꽃$/.test(raw)) return "flower";
        if (/문구점|문구|필기구|편지지|^편지$/.test(raw)) return "stationery";
        if (/선물가게|선물집|기념품|^선물$/.test(raw)) return "gift";
        if (/햄버거|버거집|패스트/.test(raw)) return "burger";
        if (/카페|커피숍|커피집|커피전문|커피가게/.test(raw)) return "cafe";
        if (/국밥|한식|분식|식당/.test(raw)) return "gukbap";
        if (/커피/.test(raw) && !/라떼|아메리카노/.test(raw)) return "cafe";
        return "";
    }

    const SHOP_LABELS = [
        ["gukbap", "국밥집"],
        ["cafe", "카페"],
        ["burger", "햄버거집"],
        ["flower", "꽃집"],
        ["stationery", "문구점"],
        ["gift", "선물가게"]
    ];

    function shopPhrase(label) {
        const code = label.charCodeAt(label.length - 1) - 0xac00;
        const batchim = code >= 0 && code <= 11171 && code % 28 !== 0;
        return label + (batchim ? "으로" : "로");
    }

    function paintShopAdmin() {
        const box = document.getElementById("admin-shop-box");
        if (!box) return;
        const current = window.__kioskShopId || "";
        const note = document.getElementById("admin-shop-now");
        const picked = SHOP_LABELS.filter(function (pair) { return pair[0] === current; })[0];
        if (note) note.textContent = picked ? ("지금 가게: " + picked[1]) : "가게를 골라 주세요.";
        SHOP_LABELS.forEach(function (pair) {
            const button = box.querySelector('[data-shop="' + pair[0] + '"]');
            if (!button) return;
            const on = pair[0] === current;
            button.setAttribute("aria-pressed", on ? "true" : "false");
            button.style.background = on ? "#e76f51" : "rgba(255,255,255,0.12)";
            button.style.color = "#fff";
            button.style.borderColor = on ? "#fff" : "rgba(255,255,255,0.35)";
        });
    }

    function chooseShop(id) {
        const pair = SHOP_LABELS.filter(function (item) { return item[0] === id; })[0];
        if (!pair) return false;
        snapshot();
        if (!applyProfile(id)) return false;
        try { localStorage.setItem(SHOP_KEY, id); } catch (e) {}
        paintShopAdmin();
        const draft = document.getElementById("admin-draft-box");
        const line = shopPhrase(pair[1]) + " 바꿨습니다.";
        if (draft) draft.innerText = line;
        try { if (typeof currentStageName !== "undefined") currentStageName = "admin_panel_open"; } catch (e) {}
        if (typeof speakText === "function") speakText(line);
        return true;
    }

    function mountShopAdmin() {
        if (!document.getElementById("admin-panel") || document.getElementById("admin-shop-box")) {
            paintShopAdmin();
            return;
        }
        const draft = document.getElementById("admin-draft-box");
        if (!draft) return;
        const box = document.createElement("div");
        box.id = "admin-shop-box";
        box.style.cssText = "width:100%;background:rgba(255,255,255,0.1);padding:16px;border-radius:16px;border:1px solid rgba(255,255,255,0.2);margin-bottom:16px;";
        box.innerHTML = '<h3 style="color:#fff;font-weight:800;margin:0 0 8px;font-size:20px;">가게 설정</h3><p id="admin-shop-now" style="color:#e8d9c0;font-size:15px;margin:0 0 12px;">가게를 골라 주세요.</p><div id="admin-shop-buttons" style="display:flex;flex-wrap:wrap;gap:8px;"></div>';
        draft.insertAdjacentElement("afterend", box);
        const row = box.querySelector("#admin-shop-buttons");
        SHOP_LABELS.forEach(function (pair) {
            const button = document.createElement("button");
            button.type = "button";
            button.dataset.shop = pair[0];
            button.textContent = pair[1];
            button.style.cssText = "min-width:108px;min-height:52px;padding:10px 14px;border-radius:14px;border:2px solid rgba(255,255,255,0.35);font-weight:800;font-size:18px;cursor:pointer;";
            button.addEventListener("click", function () { chooseShop(pair[0]); });
            row.appendChild(button);
        });
        paintShopAdmin();
    }

    function askShop() {
        window.__kioskShopAsked = true;
        try { currentStageName = "shop_ask"; } catch (e) {}
        if (typeof updateUI === "function") {
            updateUI(
                "무슨 가게인가요?",
                "가게 종류를 한 번만 말씀해 주세요.",
                '<div class="status-giant border-emerald-500 text-emerald-700 bg-white/75"><div style="font-size:1.15em; font-weight:900; line-height:1.35;">국밥집, 카페, 햄버거집<br>꽃집, 문구점, 선물가게</div></div>'
            );
        }
        try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
        setTimeout(function () {
            if (typeof currentStageName !== "undefined" && currentStageName !== "shop_ask") return;
            if (typeof speakText === "function") {
                speakText("무슨 가게인가요? " + SHOP_LINE + " 중에서 말씀해 주세요.");
            }
        }, 80);
    }

    function install() {
        if (window.__kioskShopInstalled) return;
        if (typeof window.processVoiceCommand !== "function" || typeof customMenus === "undefined") return;
        window.__kioskShopInstalled = true;
        snapshot();
        paintIcons();

        try {
            if (typeof renderAddMorePrompt === "function" && !renderAddMorePrompt.__shopAdd) {
                const prevAdd = renderAddMorePrompt;
                const wrappedAdd = function () {
                    const id = window.__kioskShopId || "";
                    const line = id === "flower" ? "다른 꽃이 있으면 네, 없으면 아니요 라고 말씀해 주세요."
                        : id === "stationery" ? "다른 문구가 있으면 네, 없으면 아니요 라고 말씀해 주세요."
                        : id === "gift" ? "다른 선물이 있으면 네, 없으면 아니요 라고 말씀해 주세요."
                        : "";
                    if (line && typeof updateUI === "function" && typeof speakText === "function") {
                        updateUI("다른 메뉴를 더 추가하시겠습니까?", "추가 주문 여부를 말씀해주세요.", '<div class="status-giant border-indigo-300 text-indigo-700 bg-indigo-50/50">대답 예: "네" / "아니요"</div>');
                        speakText(line);
                        return;
                    }
                    return prevAdd.apply(this, arguments);
                };
                wrappedAdd.__shopAdd = true;
                renderAddMorePrompt = wrappedAdd;
            }
        } catch (e) {}

        const previous = window.processVoiceCommand;
        window.processVoiceCommand = function (text) {
            const stage = typeof currentStageName === "undefined" ? "" : currentStageName;
            const raw = plain(text);
            if (/가게바꿔|가게변경|가게다시|다른가게/.test(raw)) {
                try { localStorage.removeItem(SHOP_KEY); } catch (e) {}
                askShop();
                return true;
            }
            if (stage === "shop_ask") {
                if (typeof window.__kioskTtsBlocking === "function" && window.__kioskTtsBlocking()) return;
                const id = parseShop(text);
                if (!id) {
                    if (/화면|글씨|글자|소리|확대|안들|안보|작아|크게/.test(raw)) {
                        return previous.apply(this, arguments);
                    }
                    if (typeof speakText === "function") speakText(SHOP_LINE + " 중에서 다시 말씀해 주세요.");
                    return true;
                }
                applyProfile(id);
                try { localStorage.setItem(SHOP_KEY, id); } catch (e) {}
                if (typeof showWelcomeScreen === "function") showWelcomeScreen();
                return true;
            }
            return previous.apply(this, arguments);
        };

        window.__kioskApplyShop = applyProfile;
        window.__kioskParseShop = parseShop;
        window.__kioskChooseShop = chooseShop;
        mountShopAdmin();

        let saved = "";
        try { saved = localStorage.getItem(SHOP_KEY) || ""; } catch (e) {}
        if (PROFILES[saved]) applyProfile(saved);
        else {
            applyProfile("gukbap");
            try { localStorage.setItem(SHOP_KEY, "gukbap"); } catch (e3) {}
        }
        try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e2) {}
        setTimeout(function () {
            if (typeof showWelcomeScreen === "function") showWelcomeScreen();
        }, 80);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();
