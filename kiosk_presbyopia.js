/*
  노안 필터.
  인공지능 고객이 화면의 글씨를 눈으로 읽을 때, 보이는 크기가 18px보다 작으면 불평한다.
  주문 말 1311단계는 바꾸지 않는다. 불평은 window.__kioskRunPresbyopia() 로만 모은다.
*/
(function () {
    var MIN_PX = 18;

    function ensureStyle() {
        if (document.getElementById("presbyopia-readable")) return;
        var style = document.createElement("style");
        style.id = "presbyopia-readable";
        style.textContent = [
            "#process-stepper > div { font-size: 20px !important; }",
            "#controls-area .status-giant { font-size: 1.35em !important; }",
            "#controls-area .text-xs { font-size: 1.2em !important; line-height: 1.35 !important; }",
            "#basket-text { font-size: 22px !important; }"
        ].join("\n");
        document.head.appendChild(style);
    }

    function wait(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    function visualScale(el) {
        var scale = 1;
        var node = el;
        while (node && node !== document.documentElement) {
            var tr = getComputedStyle(node).transform;
            if (tr && tr !== "none") {
                var matched = tr.match(/matrix\(([^)]+)\)/);
                if (matched) {
                    var a = parseFloat(matched[1].split(",")[0]);
                    if (a > 0.2 && a < 4) scale *= a;
                }
            }
            node = node.parentElement;
        }
        return scale;
    }

    function lineFor(text) {
        if (/①|②|③|④|⑤/.test(text)) return "위에 있는 단계 글씨가 작아서 안 보여요. " + text;
        if (/우유갑|생수병|캔 음료/.test(text)) return "컵 옆 설명이 작아서 뭐가 작은 잔인지 모르겠어요. " + text;
        if (/감자튀김|추가해줘/.test(text)) return "주문 내역 아래 글씨가 작아서 안 읽혀요. " + text;
        if (/대답 예|200ml|350ml|500ml/.test(text)) return "대답 예시가 작아서 안 보여요. " + text;
        return "이 글씨가 작아서 안 보여요. " + text;
    }

    function scan(stage) {
        var roots = [
            document.getElementById("fit-wrapper"),
            document.getElementById("process-stepper"),
            document.getElementById("floating-basket")
        ];
        var rows = [];
        roots.forEach(function (root) {
            if (!root) return;
            root.querySelectorAll("*").forEach(function (el) {
                if (el.children.length) return;
                var style = getComputedStyle(el);
                if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) === 0) return;
                var text = (el.innerText || "").replace(/\s+/g, " ").trim();
                if (text.length < 2 || /^[➔→·.•]+$/.test(text)) return;
                var rect = el.getBoundingClientRect();
                if (rect.width < 8 || rect.height < 8) return;
                var px = parseFloat(style.fontSize) || 0;
                var visual = Math.round(px * visualScale(el));
                var clipped = el.scrollWidth > el.clientWidth + 8;
                if (visual >= MIN_PX && !clipped) return;
                rows.push({
                    stage: stage,
                    text: text.slice(0, 40),
                    visual: visual,
                    clipped: clipped,
                    line: clipped ? "글씨가 잘려서 끝까지 안 보여요. " + text.slice(0, 40) : lineFor(text.slice(0, 40))
                });
            });
        });
        return rows;
    }

    function hush() {
        window.__kioskTtsBlocking = function () { return false; };
        window.speakText = function () {};
        try { speakText = window.speakText; } catch (e) {}
        var boot = document.getElementById("boot-overlay");
        if (boot) boot.style.display = "none";
    }

    async function run() {
        ensureStyle();
        hush();
        if (typeof window.__kioskApplyShop === "function") window.__kioskApplyShop("gukbap");
        var complaints = [];
        function add(stage) { complaints = complaints.concat(scan(stage)); }

        if (typeof showWelcomeScreen === "function") showWelcomeScreen();
        await wait(280);
        add("welcome");

        if (typeof transitionTo === "function" && typeof renderCategorySelect === "function") {
            transitionTo("category_select", renderCategorySelect);
        }
        await wait(280);
        add("category");

        try { currentStageName = "welcome"; } catch (e) {}
        if (typeof processVoiceCommand === "function") processVoiceCommand("커피");
        await wait(320);
        add("coffee");

        try { currentStageName = "welcome"; } catch (e2) {}
        if (typeof processVoiceCommand === "function") processVoiceCommand("추천해 줘");
        await wait(320);
        add("taste");

        try {
            tempItem.item = "콜라";
            tempItem.count = 1;
            if (typeof askQuantity === "function") askQuantity();
        } catch (e3) {}
        await wait(280);
        add("quantity");

        try {
            tempItem.item = "콜라";
            tempItem.count = 1;
            if (typeof askCupSize === "function") askCupSize();
        } catch (e4) {}
        await wait(280);
        add("cup");

        try {
            orderState = { items: [], place: "", pay: "" };
            tempItem.item = "돼지국밥";
            tempItem.count = 1;
            tempItem.temp = "기본";
            if (typeof commitTempItemToCartIfValid === "function") commitTempItemToCartIfValid();
            currentStageName = "summary";
            if (typeof renderSummary === "function") renderSummary();
        } catch (e5) {}
        await wait(280);
        add("summary");

        var unique = [];
        var seen = {};
        complaints.forEach(function (row) {
            var key = row.line;
            if (seen[key]) {
                if (seen[key].stages.indexOf(row.stage) < 0) seen[key].stages.push(row.stage);
                return;
            }
            var item = { line: row.line, text: row.text, visual: row.visual, stages: [row.stage] };
            seen[key] = item;
            unique.push(item);
        });
        unique.sort(function (a, b) { return a.visual - b.visual; });
        var report = { count: unique.length, complaints: unique, minPx: MIN_PX };
        window.__kioskPresbyopiaReport = report;
        return report;
    }

    if (typeof window !== "undefined") {
        window.__kioskRunPresbyopia = run;
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ensureStyle);
        else ensureStyle();
    }
})();
