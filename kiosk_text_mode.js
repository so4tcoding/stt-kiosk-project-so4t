/*
  말로 하지 않고 글자로 주문을 넣어 보는 시험 칸.
  키오스크가 소리로 낼 문장은 아래 기록에 그대로 적힌다.
*/
(function (root, factory) {
    var api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (typeof document !== "undefined") {
        var start = function () { api.install(document, root); };
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
        else start();
    }
})(typeof window !== "undefined" ? window : globalThis, function () {
    function escapeHtml(value) {
        return String(value).replace(/[&<>"]/g, function (ch) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
        });
    }

    function install(doc, win) {
        if (!doc || !win || win.__kioskTextMode) return win && win.__kioskTextMode;
        var logEl = doc.getElementById("text-mode-log");
        var form = doc.getElementById("text-mode-form");
        var input = doc.getElementById("text-mode-input");
        var panel = doc.getElementById("text-mode");
        var toggle = doc.getElementById("text-mode-toggle");
        if (!logEl || !form || !input) return null;

        var lines = [];

        function paint() {
            logEl.innerHTML = lines.map(function (row) {
                var label = row.who === "me" ? "나" : "키오스크";
                return '<p class="text-mode-' + row.who + '"><b>' + label + "</b> " + escapeHtml(row.text) + "</p>";
            }).join("");
            logEl.scrollTop = logEl.scrollHeight;
        }

        function add(who, text) {
            var line = String(text || "").replace(/\s+/g, " ").trim();
            if (!line) return;
            lines.push({ who: who, text: line });
            if (lines.length > 30) lines.shift();
            paint();
        }

        win.__kioskOnSpoken = function (text) { add("kiosk", text); };

        function bootStillUp() {
            var boot = doc.getElementById("boot-overlay");
            if (!boot) return false;
            if (boot.style && boot.style.display === "none") return false;
            try {
                if (win.getComputedStyle) {
                    var view = win.getComputedStyle(boot);
                    if (view && view.display === "none") return false;
                }
            } catch (e) {}
            return true;
        }

        function sleeping() {
            return !!(doc.body && doc.body.classList && doc.body.classList.contains("button-sleep-mode"));
        }

        function wake() {
            if (bootStillUp()) {
                var btn = doc.getElementById("boot-btn");
                if (btn && typeof btn.click === "function") btn.click();
            }
            if (sleeping() && typeof win.exitButtonSleepMode === "function") {
                try { if (win.speechSynthesis) win.speechSynthesis.cancel(); } catch (e) {}
                try { win.isTtsSpeaking = false; } catch (e) {}
                try { win.exitButtonSleepMode(); } catch (e) {}
            }
        }

        function run(text) {
            var before = lines.length;
            try { win.__kioskHeard = text; } catch (e) {}
            if (typeof win.processVoiceCommand !== "function") {
                add("kiosk", "아직 주문을 받을 준비가 안 됐습니다. 시작하기를 누른 뒤 다시 보내세요.");
                return;
            }
            try {
                win.processVoiceCommand(text);
            } catch (e) {
                add("kiosk", "이 말은 처리하지 못했습니다.");
                return;
            }
            if (lines.length === before) add("kiosk", "이 말에는 소리로 대답하지 않았습니다.");
        }

        function send(raw) {
            var text = String(raw || "").replace(/\s+/g, " ").trim();
            if (!text) return false;
            add("me", text);
            input.value = "";
            var wait = bootStillUp() || sleeping();
            wake();
            if (wait) {
                setTimeout(function () {
                    try { if (win.speechSynthesis) win.speechSynthesis.cancel(); } catch (e) {}
                    try { win.isTtsSpeaking = false; } catch (e) {}
                    run(text);
                }, 800);
            } else {
                run(text);
            }
            return true;
        }

        form.addEventListener("submit", function (event) {
            if (event && event.preventDefault) event.preventDefault();
            send(input.value);
        });

        if (toggle && panel) {
            toggle.addEventListener("click", function () {
                var collapsed = panel.classList.toggle("is-collapsed");
                toggle.textContent = collapsed ? "열기" : "접기";
            });
        }

        var api = { send: send, add: add };
        win.__kioskTextMode = api;
        return api;
    }

    return { install: install };
});
