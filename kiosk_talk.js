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

    function oneLine(line) {
        let text = String(line || "").replace(/\s+/g, " ").trim();
        if (!text) return text;
        const parts = text.split(/[.?!]/).map(function (part) { return part.trim(); }).filter(Boolean);
        if (parts.length >= 2) {
            const last = parts[parts.length - 1];
            text = last.length <= 22 ? last : parts[0];
        }
        text = text.replace(/[.?!]+$/g, "").trim();
        if (text.length > 21) {
            if (/결제/.test(text)) text = "결제라고 해 주세요";
            else if (/주문/.test(text)) text = "주문할게요 해 주세요";
            else if (/포장|먹을게/.test(text)) text = "포장, 여기서 먹을게요";
            else if (/카드|현금/.test(text)) text = "카드요, 현금이요";
            else if (/세트|단품/.test(text)) text = "세트요, 단품이요";
            else if (/따뜻|차갑/.test(text)) text = "따뜻하게, 차갑게요";
            else if (/잔/.test(text)) text = "작은 잔, 중간 잔";
            else if (/달콤|맛/.test(text)) text = "달콤, 짭짤, 얼큰";
            else if (/그릇|개|잔/.test(text)) text = "몇 개 드릴까요";
            else text = "다시 말해 주세요";
        }
        if (!/[.?!]$/.test(text)) text += ".";
        return text;
    }

    function talkLine(text, heard, qtyWord) {
        const line = composeTalk(text, heard, qtyWord);
        const raw = String(text || "");
        if (!line) return line;
        if (/비밀번호/.test(raw)) return line;
        if (/추가 메뉴입니다|등이 있습니다/.test(raw)) return line;
        if (/무슨 가게인가요|가게를 바꿔|국밥집, 카페/.test(raw)) return line;
        return oneLine(line);
    }

    function composeTalk(text, heard, qtyWord) {
        const raw = String(text || "").replace(/\s+/g, " ").trim();
        if (!raw) return raw;
        if (/비밀번호/.test(raw)) return raw;
        if (/추가 메뉴입니다|등이 있습니다/.test(raw)) return raw;
        if (/매장에서 드시기를 선택했습니다/.test(raw)) return "매장에서 드시기를 선택했습니다. 맞으면 결제라고 말씀해 주세요.";
        if (/포장으로 선택하셨습니다/.test(raw)) return "포장으로 선택하셨습니다. 맞으면 결제라고 말씀해 주세요.";

        if (/무슨 가게인가요|가게를 바꿔/.test(raw) || /국밥집, 카페, 햄버거집, 꽃집/.test(raw)) {
            return fit("국밥집, 카페, 햄버거집, 꽃집, 문구점, 선물가게.");
        }
        if (/주문 시작이라고|주문을 시작하시려면|바로 주문하시려면|반갑습니다/.test(raw)) {
            return fit("주문할게요, 라고 말씀해 주세요.");
        }
        if (/^쉽게 설명해드릴게요/.test(raw)) {
            return fit("주문은 메뉴 이름으로 합니다.");
        }
        if (/무엇을 드시고|메뉴를 아시면|메뉴 이름을 아시면|지금은 메뉴를 말하는|메뉴판 보여줘/.test(raw)) {
            return fit("무엇을 드시고 싶으세요. 모르면 메뉴판 보여줘.");
        }
        if (/메뉴 수량을 말씀|몇 잔인지|몇 개인지|수량을 정확히/.test(raw)) {
            return fit("한 " + qtyUnit(qtyWord) + " 해 주세요.");
        }
        if (/작은 잔, 중간 잔, 큰 잔/.test(raw)) {
            return fit("작은 잔, 중간 잔, 큰 잔.");
        }
        if (/^골라 주세요|달콤, 상큼/.test(raw)) {
            return fit("달콤, 상큼, 구수, 고소, 얼큰, 짭짤.");
        }
        if (/세트로 하시려면|세트로 드릴까요/.test(raw)) {
            return fit("세트요, 단품이요.");
        }
        if (/추가하실 메뉴가 있습니까|있으면 네, 없으면 아니요|다른 꽃이 있으면|다른 문구가 있으면|다른 선물이 있으면|다른 음료가 있으면|다른 메뉴가 있으면/.test(raw)) {
            return fit("아니요 해 주세요.");
        }
        if (/여기서 드시|들고 가실지|포장해서/.test(raw)) {
            return fit("포장이요, 여기서 먹을게요.");
        }
        if (/카드로 결제|카드로 하실|현금으로 결제/.test(raw)) {
            return fit("카드요, 현금이요.");
        }
        if (/따뜻하게 드시고 싶으시면|따뜻한 것과 아이스|뜨거운 것과 아이스/.test(raw)) {
            return fit("따뜻하게요, 차갑게요.");
        }
        if (/조절하고 싶으시다면|추가할 게 없/.test(raw)) {
            return fit("없으면 아니요.");
        }
        if (/주문하신 메뉴는|총 금액은|맞으시면 결제/.test(raw)) {
            return fit("맞으면 결제라고 말씀해 주세요.");
        }
        const picked = raw.match(/선택하신 게\s*(.+?)\s*맞습니까/);
        if (picked) {
            return fit(polite(picked[1]) + ". 맞으면 네.");
        }
        if (/맛있게 드세요/.test(raw)) {
            return fit("맛있게 드세요.");
        }
        if (/그 메뉴는 없습니다/.test(raw)) {
            return fit("그 메뉴는 없습니다.");
        }
        if (/그 단어만으로는/.test(raw)) {
            return fit("메뉴 이름을 말씀해 주세요.");
        }
        if (/화면을 확대했습니다/.test(raw)) return "네, 화면을 확대했습니다.";
        if (/화면을 줄였습니다/.test(raw)) return "네, 화면을 줄였습니다.";
        if (/화면을 원래대로 돌렸습니다/.test(raw)) return "네, 화면을 원래대로 돌렸습니다.";
        if (/^저희 매장에는/.test(raw)) {
            return fit("메뉴 이름을 말씀해 주세요.");
        }
        if (raw === "다시 한 번 말씀해주세요." || raw === "다시 한 번 말씀해 주세요.") {
            return fit("다시 말씀해 주세요.");
        }
        return fit(raw);
    }

    function fit(line) {
        const text = String(line || "").replace(/\s+/g, " ").trim();
        if (/스몰|미디엄|라지|밀리리터/.test(text)) return "작은 잔, 중간 잔, 큰 잔.";
        if (/카테고리/.test(text)) return "메뉴 이름을 말씀해 주세요.";
        const sentences = text.split(/[.?!]/).filter(function (part) { return part.trim(); }).length;
        if (text.length <= 46 && sentences < 3) return text;
        if (/주문할게요/.test(text)) return "주문할게요, 라고 말씀해 주세요.";
        if (/메뉴 이름/.test(text)) return "메뉴 이름을 말씀해 주세요.";
        if (/결제/.test(text)) return "맞으면 결제라고 말씀해 주세요.";
        if (/포장|먹을게요/.test(text)) return "포장이요, 여기서 먹을게요.";
        if (/세트|단품/.test(text)) return "세트요, 단품이요.";
        if (/없|네/.test(text)) return "더 있으면 네, 없으면 아니요.";
        if (/따뜻|차갑/.test(text)) return "따뜻하게요, 차갑게요.";
        if (/잔/.test(text)) return "작은 잔, 중간 잔, 큰 잔.";
        if (/달콤|맛/.test(text)) return "달콤, 상큼, 구수, 고소, 얼큰, 짭짤.";
        return "다시 말씀해 주세요.";
    }

    function install() {
        if (window.__kioskTalkInstalled) return;
        window.__kioskTalkInstalled = true;

        const previousCommand = window.processVoiceCommand;
        if (typeof previousCommand === "function" && !previousCommand.__kioskTalk) {
            const wrapped = function (text) {
                try { window.__kioskHeard = String(text || "").trim(); } catch (e) {}
                return previousCommand.apply(this, arguments);
            };
            wrapped.__kioskTalk = true;
            window.processVoiceCommand = wrapped;
        }

    }

    return { talkLine: talkLine, install: install };
});
