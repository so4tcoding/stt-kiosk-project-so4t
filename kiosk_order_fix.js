/*
  메뉴판에서 "밑에서 n번째", "오른쪽 꺼", "왼쪽 꺼"를 고른다.
  메뉴 이름이 들어 있으면 이름 쪽이 이긴다.
  세번째, 첫번째, 3번처럼 위에서 세는 말은 기존 주문에 맡긴다.
*/
(function () {
    function install() {
        if (window.__kioskOrderFixInstalled) return;
        if (typeof window.processVoiceCommand !== "function") return;
        window.__kioskOrderFixInstalled = true;
        const previous = window.processVoiceCommand;

        function squash(text) {
            return String(text || "").replace(/[\s.,?!~]/g, "");
        }

        function ordinal(raw) {
            const digit = raw.match(/([0-9]+)(번째|번)/);
            if (digit) return parseInt(digit[1], 10);
            const steps = [
                [/열번째|열째|열번/, 10],
                [/아홉번째|아홉째|아홉번/, 9],
                [/여덟번째|여덟째|여덟번/, 8],
                [/일곱번째|일곱째|일곱번/, 7],
                [/여섯번째|여섯째|여섯번/, 6],
                [/다섯번째|다섯째|다섯번/, 5],
                [/네번째|넷째|네번/, 4],
                [/세번째|셋째|세번/, 3],
                [/두번째|둘째|두번/, 2],
                [/첫번째|첫째|첫번|일번/, 1]
            ];
            for (let i = 0; i < steps.length; i++) {
                if (steps[i][0].test(raw)) return steps[i][1];
            }
            return 0;
        }

        function hasMenuName(text, menus) {
            const raw = squash(text);
            const named = (menus || []).slice().sort(function (a, b) {
                return squash(b && b.name).length - squash(a && a.name).length;
            });
            for (let i = 0; i < named.length; i++) {
                const name = squash(named[i] && named[i].name);
                if (name.length >= 2 && raw.indexOf(name) !== -1) return true;
            }
            return false;
        }

        function sayMissing() {
            if (typeof speakText === "function") speakText("그 번호는 없습니다.");
        }

        function pickMenu(menus, index) {
            if (index < 0 || index >= menus.length) {
                sayMissing();
                return true;
            }
            const menu = menus[index];
            if (typeof highlightMenuConfirm === "function") highlightMenuConfirm(menu, index);
            else if (typeof selectSpecificItem === "function") selectSpecificItem(menu.name);
            return true;
        }

        function openCategory(cats, index) {
            if (index < 0 || index >= cats.length) {
                sayMissing();
                return true;
            }
            const name = cats[index];
            selectedCategory = name;
            currentGridMenus = customMenus.filter(function (menu) { return menu.category === name; });
            currentGridTitle = name + " 메뉴판";
            if (typeof transitionTo === "function" && typeof renderMenuGrid === "function") {
                transitionTo("menu_grid", renderMenuGrid);
            }
            return true;
        }

        window.processVoiceCommand = function (text) {
            if (typeof window.__kioskTtsBlocking === "function" && window.__kioskTtsBlocking()) {
                return previous.apply(this, arguments);
            }
            try { window.__kioskHeard = String(text || "").trim(); } catch (e) {}
            const stage = typeof currentStageName === "undefined" ? "" : currentStageName;
            if (stage !== "menu_grid" && stage !== "category_select") {
                return previous.apply(this, arguments);
            }

            const raw = squash(text);
            if (/안보/.test(raw)) return previous.apply(this, arguments);

            let list = [];
            if (stage === "menu_grid") {
                try { list = (currentGridMenus || []).slice(); } catch (e) { list = []; }
                if (hasMenuName(text, list)) return previous.apply(this, arguments);
            } else {
                try {
                    list = [];
                    customMenus.forEach(function (menu) {
                        if (menu && menu.category && list.indexOf(menu.category) === -1) list.push(menu.category);
                    });
                } catch (e2) { list = []; }
                if (list.some(function (name) {
                    const key = squash(name);
                    return key.length >= 2 && raw.indexOf(key) !== -1;
                })) return previous.apply(this, arguments);
            }
            if (!list.length) return previous.apply(this, arguments);

            const fromBottom = /밑에서|아래에서|하단에서|맨아래/.test(raw);
            const number = ordinal(raw);
            const hasRight = /오른쪽|우측|오른편/.test(raw);
            const hasLeft = /왼쪽|좌측|왼편/.test(raw);
            if (!fromBottom && !hasRight && !hasLeft) return previous.apply(this, arguments);
            if (number > 0 && !fromBottom) return previous.apply(this, arguments);
            if (hasLeft && hasRight) return previous.apply(this, arguments);

            let index = -2;
            if (fromBottom && number > 0) {
                index = list.length - number;
            } else if (fromBottom && hasRight && !hasLeft) {
                const rows = Math.ceil(list.length / 2);
                index = (rows - 1) * 2 + 1;
                if (index >= list.length) index = list.length - 1;
            } else if (fromBottom && hasLeft && !hasRight) {
                const rows = Math.ceil(list.length / 2);
                index = (rows - 1) * 2;
            } else if (!fromBottom && hasRight && !hasLeft) {
                index = 1;
            } else if (!fromBottom && hasLeft && !hasRight) {
                index = 0;
            }
            if (index < -1) return previous.apply(this, arguments);
            if (stage === "menu_grid") return pickMenu(list, index);
            return openCategory(list, index);
        };
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();
