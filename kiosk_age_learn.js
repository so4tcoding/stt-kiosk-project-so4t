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

            if ((stage === "welcome" || stage === "guide") && /주문할라|묵을라|밥묵|시작하자/.test(raw)) {
                next = "주문할게요";
            } else if (stage === "temp" && /뜨신|따끈/.test(raw)) {
                next = "따뜻하게";
            } else if (stage === "temp" && /차게/.test(raw) && !/뜨/.test(raw)) {
                next = "차갑게";
            } else if (stage === "place" && /묵고|묵을/.test(raw) && !/싸|포장|가져/.test(raw)) {
                next = "여기서 먹을게요";
            } else if (stage === "upsell" && /^그냥(이여|하소|이요)?$/.test(raw)) {
                next = "단품";
            } else if (stage === "summary" && /맞구만|됐소|계산하소|계산할라/.test(raw)) {
                next = "결제";
            } else if (stage === "menu_confirm" && /맞구만/.test(raw)) {
                next = "네";
            } else if ((stage === "quantity" || stage === "summary_add_quantity") && /그룻/.test(raw)) {
                next = String(text || "").replace(/그룻/g, "그릇");
            } else if ((stage === "add_more_prompt" || stage === "beverage_option_prompt" || stage === "beverage_option_step") && /없다/.test(raw)) {
                next = "없어요";
            } else if (stage === "taste_select_prompt" && /달콤허게/.test(raw)) {
                next = "달콤";
            }

            if (next) return previous.call(this, next);
            return previous.apply(this, arguments);
        };
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();
