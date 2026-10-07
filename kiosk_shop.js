/*
  처음 한 번만 가게를 물어 보고, 그 가게에 맞게 메뉴와 수량 말, 추가 질문을 바꾼다.
  화면 모양은 그대로 둔다.
*/
(function () {
    const SHOP_KEY = "kiosk_shop_v1";
    const PROFILES = {
        gukbap: {
            qtyWord: "",
            hint: "",
            keep: function () { return true; }
        },
        cafe: {
            qtyWord: "잔",
            hint: "그 메뉴는 없습니다. 커피, 음료, 디저트 중에서 말씀해 주세요.",
            keep: function (menu) {
                return menu.category === "커피" || menu.category === "음료" || menu.category === "디저트";
            }
        },
        burger: {
            qtyWord: "개",
            hint: "그 메뉴는 없습니다. 햄버거, 콜라, 사이다, 디저트 중에서 말씀해 주세요.",
            keep: function (menu) {
                return menu.category === "햄버거" || menu.name === "콜라" || menu.name === "사이다" || menu.name === "치즈 케이크" || menu.name === "소프트 아이스크림";
            }
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
        customMenus.splice(0, customMenus.length);
        next.forEach(function (menu) { customMenus.push(menu); });
        window.__kioskShopId = id;
        window.__kioskQtyWord = profile.qtyWord || "";
        window.__kioskMenuHint = profile.hint || "";
        window.__kioskRemovedNames = removed;
        return true;
    }

    function parseShop(text) {
        const raw = plain(text);
        if (!raw) return "";
        if (/햄버거|버거집|패스트/.test(raw)) return "burger";
        if (/카페|커피숍|커피집|커피전문|커피가게/.test(raw)) return "cafe";
        if (/국밥|한식|분식|식당/.test(raw)) return "gukbap";
        if (/커피/.test(raw) && !/라떼|아메리카노/.test(raw)) return "cafe";
        return "";
    }

    function askShop() {
        window.__kioskShopAsked = true;
        try { currentStageName = "shop_ask"; } catch (e) {}
        if (typeof updateUI === "function") {
            updateUI(
                "무슨 가게인가요?",
                "가게 종류를 한 번만 말씀해 주세요.",
                '<div class="status-giant border-emerald-500 text-emerald-700 bg-white/75"><div style="font-size:1.25em; font-weight:900; line-height:1.2;">국밥집, 카페, 햄버거집</div></div>'
            );
        }
        try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
        setTimeout(function () {
            if (typeof currentStageName !== "undefined" && currentStageName !== "shop_ask") return;
            if (typeof speakText === "function") {
                speakText("무슨 가게인가요? 국밥집, 카페, 햄버거집 중에서 말씀해 주세요.");
            }
        }, 80);
    }

    function install() {
        if (window.__kioskShopInstalled) return;
        if (typeof window.processVoiceCommand !== "function" || typeof customMenus === "undefined") return;
        window.__kioskShopInstalled = true;
        snapshot();

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
                    if (typeof speakText === "function") speakText("국밥집, 카페, 햄버거집 중에서 다시 말씀해 주세요.");
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

        let saved = "";
        try { saved = localStorage.getItem(SHOP_KEY) || ""; } catch (e) {}
        if (PROFILES[saved]) {
            applyProfile(saved);
            try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e2) {}
            setTimeout(function () {
                if (typeof showWelcomeScreen === "function") showWelcomeScreen();
            }, 80);
        } else {
            askShop();
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();
