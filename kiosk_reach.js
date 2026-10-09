/*
  짧은 주문 말을 화면이 넘어가게 받는다.
  요약에서 카드/현금, 음료 옵션에서 없어요/됐어, 세트 화면의 그냥.
*/
(function () {
    function install() {
        if (window.__kioskReachInstalled) return;
        if (typeof window.processVoiceCommand !== "function") return;
        window.__kioskReachInstalled = true;
        const previous = window.processVoiceCommand;
        window.processVoiceCommand = function (text) {
            const stage = typeof currentStageName === "undefined" ? "" : currentStageName;
            const raw = String(text || "").replace(/[\s.,?!~]/g, "");
            try { window.__kioskHeard = String(text || "").trim(); } catch (e) {}

            if (stage === "summary" && /카드/.test(raw) && !/안돼|안됨|안읽/.test(raw) && typeof selectPayment === "function") {
                selectPayment("신용/체크 카드");
                return true;
            }
            if (stage === "summary" && /현금|현찰/.test(raw) && !/없/.test(raw) && typeof selectPayment === "function") {
                selectPayment("현금 결제");
                return true;
            }
            if (stage === "beverage_option_prompt" && /없|됐|아니|안해/.test(raw) && typeof transitionTo === "function" && typeof renderAddMorePrompt === "function") {
                transitionTo("add_more_prompt", renderAddMorePrompt);
                return true;
            }
            if (stage === "upsell" && /^그냥(요|해줘|해주세요)?$/.test(raw) && typeof askQuantity === "function") {
                tempItem.isSet = false;
                askQuantity();
                return true;
            }
            return previous.apply(this, arguments);
        };
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();
