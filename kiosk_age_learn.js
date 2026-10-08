/*
  노화 필터로 말한 사투리를, 키오스크가 이미 아는 말로 다시 배운다.
  국밥, 버거, 불고기, 꽃, 케이크처럼 메뉴가 여러 개인 짧은 말은 고르지 않는다.
*/
(function () {
    function install() {
        if (window.__kioskAgeLearnInstalled) return;
        if (typeof window.processVoiceCommand !== "function") return;
        window.__kioskAgeLearnInstalled = true;
        const previous = window.processVoiceCommand;
        window.processVoiceCommand = function (text) {
            const stage = typeof currentStageName === "undefined" ? "" : currentStageName;
            const raw = String(text || "").replace(/[\s.,?!~]/g, "");
            let next = "";

            if (/뭐라고예|다시말해주소|잘모르겠구만|뭐라고요|다시요|잘모르겠어요/.test(raw)) {
                if (typeof speakText === "function") speakText("다시 말해 주세요.");
                return true;
            } else if ((stage === "welcome" || stage === "guide") && /주문할라|묵을라|밥묵|시작하자/.test(raw)) {
                next = "주문할게요";
            } else if (stage === "temp" && /뜨신|따끈/.test(raw)) {
                next = "따뜻하게";
            } else if (stage === "temp" && /시원|차갑|차게/.test(raw) && !/뜨/.test(raw)) {
                next = "차갑게";
            } else if (stage === "place" && /싸가|싸서/.test(raw)) {
                next = "포장";
            } else if (stage === "place" && /묵고|묵을/.test(raw) && !/싸|포장|가져/.test(raw)) {
                next = "여기서 먹을게요";
            } else if (stage === "upsell" && /^그냥(이여|하소|이요)?$/.test(raw)) {
                next = "단품";
            } else if (stage === "upsell" && /세트/.test(raw)) {
                next = "세트";
            } else if (stage === "summary" && /맞구만|됐소|계산하소|계산할라/.test(raw)) {
                next = "결제";
            } else if (stage === "menu_confirm" && /맞구만/.test(raw)) {
                next = "네";
            } else if ((stage === "quantity" || stage === "summary_add_quantity") && /그룻/.test(raw)) {
                next = String(text || "").replace(/그룻/g, "그릇");
            } else if ((stage === "quantity" || stage === "summary_add_quantity") && /마요|주소/.test(raw)) {
                next = String(text || "").replace(/마요|주소/g, "").trim() || "한 개";
            } else if ((stage === "add_more_prompt" || stage === "beverage_option_prompt" || stage === "beverage_option_step") && /없|됐소|됐시/.test(raw)) {
                next = "없어요";
            } else if (stage === "taste_select_prompt" && /달콤허게|달콤/.test(raw)) {
                next = "달콤";
            } else if (stage === "payment" && /카드/.test(raw)) {
                next = "카드";
            } else if (stage === "payment" && /현금/.test(raw)) {
                next = "현금";
            } else if (stage === "open_order_prompt" || stage === "menu_grid" || stage === "category_select" || stage === "menu_confirm") {
                const cleaned = raw.replace(/주소|이여|해소|해주세요|해줘/g, "").replace(/하나$/g, "");
                let hits = [];
                try {
                    if (cleaned.length >= 2) {
                        (customMenus || []).forEach(function (menu) {
                            const name = String(menu && menu.name || "").replace(/\s/g, "");
                            if (!name) return;
                            if (name.indexOf(cleaned) !== -1 || cleaned.indexOf(name) !== -1) hits.push(menu.name);
                        });
                    }
                } catch (e) {}
                if (hits.length === 1) next = hits[0];
            }

            if (next) return previous.call(this, next);
            return previous.apply(this, arguments);
        };
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();
