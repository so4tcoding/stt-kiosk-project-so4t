/*
  사람마다 청력, 시력, 이해력이 다르다.
  가게는 바뀌고, 말 끝의 소음은 한 음절만 붙는다.
*/
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (typeof window !== "undefined") {
        window.KioskQuietSim = api;
        window.__kioskRunQuiet = api.run;
    }
    root.KioskQuietSim = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    const PLACES = ["가게 안", "창가", "계산대 옆", "복도"];

    function dustLine(text) {
        const noise = window.KioskNoise;
        if (!noise || typeof noise.dust !== "function") return text;
        return noise.dust(text, (Number(window.__kioskQuietIndex) || 0) % PLACES.length);
    }

    function afterSay(said, result) {
        const noise = window.KioskNoise;
        const menus = (typeof customMenus !== "undefined" && customMenus) || [];
        if (!noise || !result) return "";
        const names = {};
        menus.forEach(function (menu) { if (menu && menu.name) names[menu.name] = true; });
        const repaired = noise.repair(result.heard || said, result.before.stage, menus);
        if (repaired.action === "repeat") {
            const beforeCart = (result.before.cart || []).length;
            const afterCart = (result.after.cart || []).length;
            const picked = result.after.item && result.after.item !== result.before.item;
            if (afterCart > beforeCart || picked) return "다시 묻지 않고 메뉴를 고름";
            return "";
        }
        if (repaired.action === "use" && names[repaired.text]) {
            if (result.after.item && result.after.item !== repaired.text) return repaired.text + " 대신 " + result.after.item;
            const other = (result.after.cart || []).filter(function (item) { return item.name && item.name !== repaired.text; });
            const hit = (result.after.cart || []).some(function (item) { return item.name === repaired.text; });
            if (other.length && !hit) return repaired.text + " 대신 " + other[0].name;
        }
        return "";
    }

    function run(start, count) {
        const prevDust = window.__kioskDustLine;
        const prevAfter = window.__kioskAfterSay;
        window.__kioskDustLine = dustLine;
        window.__kioskAfterSay = afterSay;
        try {
            const row = window.KioskElderSim.runUntaughtMany(start || 0, count || 0);
            row.noise = "한 음절";
            row.places = PLACES.slice();
            return row;
        } finally {
            if (prevDust) window.__kioskDustLine = prevDust;
            else delete window.__kioskDustLine;
            if (prevAfter) window.__kioskAfterSay = prevAfter;
            else delete window.__kioskAfterSay;
        }
    }

    return { run: run, places: PLACES.slice() };
});
