/*
  직원처럼 받아 주는 음성.
  화면 문구와 주문 단계는 그대로 두고, 스피커로 나가는 말만 바꿉니다.
*/
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (typeof window !== "undefined") {
        window.__kioskTalkLine = api.talkLine;
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", api.install);
        else api.install();
    }
    root.KioskTalk = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    function polite(name) {
        const s = String(name || "").replace(/\s+/g, " ").trim();
        if (!s) return "";
        if (/요$|다$|까$|죠$/.test(s)) return s;
        const last = s.charCodeAt(s.length - 1);
        const batchim = last >= 0xAC00 && last <= 0xD7A3 && (last - 0xAC00) % 28 !== 0;
        return s + (batchim ? "이요" : "요");
    }

    function heardName(heard) {
        const s = String(heard || "").replace(/\s+/g, " ").trim();
        if (!s || s.length > 18) return "";
        if (/^(네|아니요|예|응|아니|주문|결제|포장|카드|현금|확대|소리|단|핫|아이스)$/.test(s)) return "";
        if (/가게|화면|글씨|글자|사용법|안녕|날씨/.test(s)) return "";
        return s;
    }

    function qtyUnit(qtyWord) {
        if (qtyWord === "잔") return "잔";
        if (qtyWord === "개") return "개";
        return "그릇";
    }

    function talkLine(text, heard, qtyWord) {
        const raw = String(text || "").replace(/\s+/g, " ").trim();
        if (!raw) return raw;
        if (/비밀번호/.test(raw)) return raw;

        const name = heardName(heard);
        const called = name ? polite(name) : "";

        if (/무슨 가게인가요|가게를 바꿔/.test(raw) || /국밥집, 카페, 햄버거집, 꽃집/.test(raw)) {
            return "안녕하세요. 어떤 가게에서 주문할까요. 국밥집, 카페, 햄버거집, 꽃집, 문구점, 선물가게, 이렇게 말씀해 주세요.";
        }
        if (/주문 시작이라고|주문을 시작하시려면|바로 주문하시려면/.test(raw)) {
            return "안녕하세요. 주문하시려면 주문할게요, 라고 말씀해 주세요. 사용법이 필요하면 사용법 알려줘, 라고 말씀해 주세요.";
        }
        if (/^쉽게 설명해드릴게요/.test(raw)) {
            return "쉽게 말씀드릴게요. 주문은 메뉴 이름으로 합니다. 글씨가 작으면 화면 확대, 소리가 작으면 소리 키워, 라고 말씀해 주세요.";
        }
        if (/메뉴 수량을 말씀|몇 잔인지|몇 개인지|수량을 정확히/.test(raw)) {
            const head = called ? called + ". " : "";
            return head + "몇 " + qtyUnit(qtyWord) + " 드릴까요.";
        }
        if (/작은 잔, 중간 잔, 큰 잔/.test(raw)) {
            return "잔은 어떻게 드릴까요. 작은 잔, 중간 잔, 큰 잔 중에서 말씀해 주세요.";
        }
        if (/^골라 주세요/.test(raw)) {
            return raw.replace(/^골라 주세요\.?\s*/, "어떤 맛이 좋으세요. ");
        }
        if (/세트로 하시려면/.test(raw)) {
            return "세트로 드릴까요, 햄버거만 드릴까요. 세트로 하시려면 세트, 햄버거만이면 단품이라고 말씀해 주세요.";
        }
        if (/추가하실 메뉴가 있습니까/.test(raw)) {
            return "더 필요하신 거 있으세요. 있으면 네, 없으면 아니요, 라고 말씀해 주세요.";
        }
        if (/다른 꽃이 있으면/.test(raw)) {
            return "다른 꽃도 필요하세요. 있으면 네, 없으면 아니요, 라고 말씀해 주세요.";
        }
        if (/다른 문구가 있으면/.test(raw)) {
            return "다른 문구도 필요하세요. 있으면 네, 없으면 아니요, 라고 말씀해 주세요.";
        }
        if (/다른 선물이 있으면/.test(raw)) {
            return "다른 선물도 필요하세요. 있으면 네, 없으면 아니요, 라고 말씀해 주세요.";
        }
        if (/여기서 드시|들고 가실지/.test(raw)) {
            return "여기서 드시고 가실래요, 포장해 드릴까요. 여기서 먹을게요, 또는 들고 갈게요, 라고 말씀해 주세요.";
        }
        if (/카드로 결제/.test(raw)) {
            return "카드로 할까요, 현금으로 할까요. 카드요, 또는 현금이요, 라고 말씀해 주세요.";
        }
        if (/따뜻하게 드시고 싶으시면/.test(raw)) {
            return "따뜻하게 드릴까요, 차갑게 드릴까요. 따뜻하게, 또는 차갑게, 라고 말씀해 주세요.";
        }
        const money = raw.match(/주문하신 총 금액은\s*(.+?)원입니다/);
        if (money) {
            return "다 고르셨어요. 총 " + money[1] + "원입니다. 맞으면 결제, 라고 말씀해 주세요.";
        }
        const picked = raw.match(/선택하신 게\s*(.+?)\s*맞습니까/);
        if (picked) {
            return polite(picked[1]) + ". 맞으면 네, 아니면 아니요, 라고 말씀해 주세요.";
        }
        if (/맛있게 드세요/.test(raw)) {
            return "감사합니다. 맛있게 드세요.";
        }
        if (/그 메뉴는 없습니다/.test(raw)) {
            return /^아,/.test(raw) ? raw : "아, " + raw;
        }
        if (/그 단어만으로는/.test(raw)) {
            return "아, 그 단어만으로는 모르겠어요. 메뉴 이름을 말씀해 주세요.";
        }
        if (/화면을 확대했습니다/.test(raw)) return "네, 화면을 확대했습니다.";
        if (/화면을 줄였습니다/.test(raw)) return "네, 화면을 줄였습니다.";
        if (/화면을 원래대로 돌렸습니다/.test(raw)) return "네, 화면을 원래대로 돌렸습니다.";
        if (/^저희 매장에는/.test(raw)) {
            return "무엇을 드릴까요. " + raw;
        }
        if (raw === "다시 한 번 말씀해주세요." || raw === "다시 한 번 말씀해 주세요.") {
            return "죄송해요. 다시 한 번만 말씀해 주세요.";
        }
        return raw;
    }

    function bestVoice() {
        let voices = [];
        try { voices = window.speechSynthesis.getVoices() || []; } catch (e) {}
        const ko = voices.filter(function (v) { return /ko/i.test(v.lang || ""); });
        function score(v) {
            const n = v.name || "";
            if (/SunHi/i.test(n) && /Natural/i.test(n)) return 0;
            if (/Natural|Neural|Online/i.test(n)) return 1;
            if (/Google/i.test(n)) return 2;
            if (/Heami|Yuna|InJoon/i.test(n)) return 3;
            return 4;
        }
        ko.sort(function (a, b) { return score(a) - score(b); });
        return ko[0] || null;
    }

    function install() {
        if (window.__kioskTalkInstalled) return;
        window.__kioskTalkInstalled = true;

        try {
            if (!localStorage.getItem("kiosk_talk_voice")) {
                const pitch = localStorage.getItem("kiosk_tts_pitch");
                const rate = localStorage.getItem("kiosk_tts_rate");
                if (!pitch || pitch === "1.15" || pitch === "0.7") localStorage.setItem("kiosk_tts_pitch", "1.0");
                if (!rate || rate === "0.95" || rate === "0.85") localStorage.setItem("kiosk_tts_rate", "0.96");
                localStorage.setItem("kiosk_talk_voice", "1");
            }
        } catch (e) {}

        const previousCommand = window.processVoiceCommand;
        if (typeof previousCommand === "function" && !previousCommand.__kioskTalk) {
            const wrapped = function (text) {
                try { window.__kioskHeard = String(text || "").trim(); } catch (e) {}
                return previousCommand.apply(this, arguments);
            };
            wrapped.__kioskTalk = true;
            window.processVoiceCommand = wrapped;
        }

        if (!window.speechSynthesis || typeof window.speechSynthesis.speak !== "function") return;
        if (window.speechSynthesis.speak.__kioskTalk) return;
        const previousSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
        const wrappedSpeak = function (utterance) {
            try {
                if (utterance && !utterance.__kioskTalk) {
                    utterance.__kioskTalk = true;
                    const heard = window.__kioskHeard || "";
                    const qtyWord = window.__kioskQtyWord || "";
                    utterance.text = talkLine(utterance.text, heard, qtyWord);
                    const voice = bestVoice();
                    if (voice) utterance.voice = voice;
                }
            } catch (e) {}
            return previousSpeak(utterance);
        };
        wrappedSpeak.__kioskTalk = true;
        window.speechSynthesis.speak = wrappedSpeak;
    }

    return { talkLine: talkLine, install: install };
});
