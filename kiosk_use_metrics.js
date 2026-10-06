/*
  키오스크를 쓸 때마다 성공/실패를 재고,
  알아듣지 못한 말은 기준 말로 학습한 뒤 학습 성공률과 로스율을 남긴다.
  화면 디자인과 주문 단계는 바꾸지 않는다.
*/
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }
    if (typeof window !== "undefined") {
        window.KioskUseMetrics = api;
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", function () {
                api.install();
            });
        } else {
            api.install();
        }
    }
    root.KioskUseMetrics = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    const ALIAS_KEY = "kiosk_command_alias_v1";
    const EVENT_KEY = "kiosk_use_metrics_v1";
    const DICT_KEY = "kiosk_final_learned_dict_v1";
    const YESNO = /^(네|내|예|넵|옙|아니|아니요|아니오|응|어|아|음)$/;

    function compact(text) {
        return String(text || "").toLowerCase().replace(/[^0-9a-z가-힣]/g, "");
    }

    function judgeUse(before, after) {
        if (!before || !after) return "failure";
        const keys = ["stage", "item", "count", "sugar", "step", "place", "cart"];
        for (let i = 0; i < keys.length; i++) {
            if (before[keys[i]] !== after[keys[i]]) return "success";
        }
        const spoken = String(after.spoken || "");
        if (spoken && spoken !== String(before.spoken || "")) {
            if (/다시 한 번|다시 말씀|알아듣지|정확히 말씀/.test(spoken)) return "failure";
            return "success";
        }
        return "failure";
    }

    function rememberAlias(store, variant, canonical) {
        const v = compact(variant);
        const c = compact(canonical);
        if (!store || !v || !c || v === c) return false;
        if (v.length < 4 || YESNO.test(v)) return false;
        if (String(variant).length > 40 || String(canonical).length > 40) return false;
        store[v] = String(canonical).trim();
        const keys = Object.keys(store);
        while (keys.length > 100) {
            delete store[keys.shift()];
        }
        return true;
    }

    function resolveAlias(store, text) {
        if (!store) return "";
        const hit = store[compact(text)];
        return hit ? String(hit) : "";
    }

    function summarize(events) {
        const list = Array.isArray(events) ? events : [];
        const uses = list.filter(function (e) { return e && e.kind === "use"; });
        const learns = list.filter(function (e) { return e && e.kind === "learn"; });
        const success = uses.filter(function (e) { return e.outcome === "success"; }).length;
        const failure = uses.filter(function (e) { return e.outcome === "failure"; }).length;
        const learnSuccess = learns.filter(function (e) { return e.outcome === "success"; }).length;
        const learnLoss = learns.filter(function (e) { return e.outcome === "loss"; }).length;
        const useTotal = success + failure;
        const learnTotal = learnSuccess + learnLoss;
        const seen = {};
        const learnedWords = [];
        learns.forEach(function (e) {
            if (e.outcome !== "success" || !e.text) return;
            const key = e.text + "→" + (e.canonical || "");
            if (seen[key]) return;
            seen[key] = true;
            learnedWords.push({ text: e.text, canonical: e.canonical || "" });
        });
        function pct(n, d) {
            return d ? Math.round((n / d) * 1000) / 10 : 0;
        }
        return {
            useTotal: useTotal,
            success: success,
            failure: failure,
            successRate: pct(success, useTotal),
            failureRate: pct(failure, useTotal),
            learnTotal: learnTotal,
            learnSuccess: learnSuccess,
            learnLoss: learnLoss,
            learnSuccessRate: pct(learnSuccess, learnTotal),
            lossRate: pct(learnLoss, learnTotal),
            learnedWords: learnedWords
        };
    }

    function loadJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function saveJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {}
    }

    function dictHas(canonical, variant) {
        const dict = loadJSON(DICT_KEY, {});
        const want = compact(canonical);
        const heard = compact(variant);
        const items = dict[canonical] || dict[String(canonical).trim()] || [];
        const lists = items.length ? [items] : Object.keys(dict).filter(function (key) {
            return compact(key) === want;
        }).map(function (key) { return dict[key]; });
        for (let i = 0; i < lists.length; i++) {
            const list = lists[i] || [];
            for (let j = 0; j < list.length; j++) {
                const text = typeof list[j] === "string" ? list[j] : list[j].text;
                if (compact(text) === heard) return true;
            }
        }
        return false;
    }

    function install() {
        if (typeof window === "undefined" || window.__kioskUseMetricsInstalled) return;
        if (typeof window.processVoiceCommand !== "function") return;
        window.__kioskUseMetricsInstalled = true;

        const previous = window.processVoiceCommand;

        function capture() {
            let sugar = null;
            try {
                sugar = tempItem && tempItem.beverageOptions ? tempItem.beverageOptions.sugar : null;
            } catch (e) {}
            let cart = "";
            try {
                cart = (orderState.items || []).map(function (item) {
                    return item.item + "x" + item.count;
                }).join(",");
            } catch (e2) {}
            return {
                stage: typeof currentStageName === "undefined" ? "" : currentStageName,
                item: (typeof tempItem !== "undefined" && tempItem && tempItem.item) || "",
                count: (typeof tempItem !== "undefined" && tempItem && tempItem.count) || 0,
                sugar: sugar,
                step: typeof optionStepIndex === "undefined" ? 0 : optionStepIndex,
                place: (typeof orderState !== "undefined" && orderState && orderState.place) || "",
                cart: cart,
                spoken: String(window.__kioskLastSpoken || "")
            };
        }

        function record(event) {
            const events = loadJSON(EVENT_KEY, []);
            events.push(event);
            saveJSON(EVENT_KEY, events.slice(-500));
            window.__kioskUseMetrics = summarize(loadJSON(EVENT_KEY, []));
            try {
                fetch("/api/use-metrics", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(event)
                }).catch(function () {});
            } catch (e) {}
        }

        function learn(canonical, variant) {
            const target = String(canonical || "").trim();
            const heard = String(variant || "").trim();
            const heardCompact = compact(heard);
            if (!target || !heard || heardCompact === compact(target)) return;
            if (heardCompact.length < 4 || YESNO.test(heardCompact)) {
                record({
                    kind: "learn",
                    outcome: "loss",
                    text: heard.slice(0, 40),
                    canonical: target.slice(0, 40),
                    stage: typeof currentStageName === "undefined" ? "" : currentStageName,
                    at: Date.now()
                });
                return;
            }
            let stored = false;
            try {
                if (typeof window.addLearnedVariant === "function") {
                    stored = window.addLearnedVariant(target, heard, { source: "use_metrics" }) === true;
                }
            } catch (e) {}
            const aliases = loadJSON(ALIAS_KEY, {});
            const aliased = rememberAlias(aliases, heard, target);
            if (aliased) saveJSON(ALIAS_KEY, aliases);
            let resolved = dictHas(target, heard) || (aliased && resolveAlias(aliases, heard) === target);
            try {
                if (!resolved && typeof window.findByLearnedDict === "function") {
                    const found = window.findByLearnedDict(heard);
                    const name = found && (found.name || found.standard || "");
                    resolved = compact(name) === compact(target);
                }
            } catch (e2) {}
            stored = stored || aliased;
            record({
                kind: "learn",
                outcome: stored && resolved ? "success" : "loss",
                text: heard.slice(0, 40),
                canonical: target.slice(0, 40),
                stage: typeof currentStageName === "undefined" ? "" : currentStageName,
                at: Date.now()
            });
        }

        window.processVoiceCommand = function measuredProcessVoiceCommand(text) {
            if (typeof window.__kioskTtsBlocking === "function" && window.__kioskTtsBlocking()) {
                return previous.apply(this, arguments);
            }
            let spoken = String(text || "");
            const alias = resolveAlias(loadJSON(ALIAS_KEY, {}), spoken);
            if (alias) spoken = alias;
            const before = capture();
            const intent = String(window.__kioskCustomerIntent || "").trim();
            let result;
            try {
                result = previous.call(this, spoken);
            } finally {
                const after = capture();
                const outcome = judgeUse(before, after);
                record({
                    kind: "use",
                    outcome: outcome,
                    text: String(text || "").slice(0, 40),
                    canonical: intent,
                    stage: before.stage,
                    at: Date.now()
                });
                if (outcome === "failure" && intent) learn(intent, text);
            }
            return result;
        };

        window.__kioskCustomerSay = function (text, intended) {
            window.__kioskCustomerIntent = String(intended || "");
            try {
                return window.processVoiceCommand(text);
            } finally {
                window.__kioskCustomerIntent = "";
            }
        };

        window.__kioskUseMetrics = summarize(loadJSON(EVENT_KEY, []));
        console.log("[kiosk] 사용 성공률과 학습 로스율을 기록합니다.");
    }

    return {
        compact: compact,
        judgeUse: judgeUse,
        rememberAlias: rememberAlias,
        resolveAlias: resolveAlias,
        summarize: summarize,
        install: install
    };
});
