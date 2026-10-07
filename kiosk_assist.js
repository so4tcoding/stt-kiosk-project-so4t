/**
 * 키오스크 상황 안내.
 * 화면 디자인과 주문 단계 전이는 바꾸지 않고,
 * "이게 뭐야 / 안 보여 / 안 들려 / 메뉴가 뭐야"만 현재 단계에 맞게 고른다.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    root.KioskAssist = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    function squash(text) {
        return String(text || "")
            .toLowerCase()
            .replace(/[.,?!~"'“”]/g, "")
            .replace(/\s+/g, "");
    }

    function stripped(text) {
        return squash(text).replace(/이/g, "").replace(/가/g, "");
    }

    function forms(text) {
        const a = squash(text);
        const b = stripped(text);
        return a === b ? [a] : [a, b];
    }

    function any(text, pattern) {
        return forms(text).some(function (value) {
            return pattern.test(value);
        });
    }

    function findMenu(text, menus) {
        const s = squash(text);
        const list = Array.isArray(menus) ? menus.slice() : [];
        list.sort(function (a, b) {
            return squash(b && b.name).length - squash(a && a.name).length;
        });
        for (let i = 0; i < list.length; i++) {
            const name = squash(list[i] && list[i].name);
            if (name && s.indexOf(name) !== -1) return list[i];
        }
        return null;
    }

    /**
     * 주문 로직으로 넘기지 않고 여기서 끝낼 발화만 분류한다.
     * 밑에/아래가 안 보이는 경우는 기존 화면 이동 로직에 맡긴다.
     */
    function classify(text, menus) {
        const s = squash(text);
        if (!s) return null;

        if (/밑에안보|아래안보|하단안보|아랫부분안보/.test(s)) return null;

        if (/안보여|잘안보여|안보임|안보여요|글씨안보|글자가안|글씨가안|메뉴가안보/.test(s)) {
            return { kind: "see" };
        }

        if (/안들려|잘안들려|안들림|안들려요|못알아듣|목소리가안/.test(s)) {
            return { kind: "hear" };
        }

        const menu = findMenu(text, menus);
        if (menu && /뭐야|뭔데|무슨맛|어떤맛|특징|얼마|가격|설명/.test(s)) {
            return { kind: "menu", menu: menu };
        }

        if (any(text, /이게뭐야|이게뭔데|이거뭐야|이거뭔데|여기뭐야|여기뭔데|게뭐야|게뭔데|거뭐야|거뭔데|무슨화면|무슨기능|어떻게해|어떻게하는|도와줘|도와주|설명해|설명좀|모르겠어|잘모르|뭐라고말|뭐하면돼|뭐하는건데|사용법알려|사용법|뭐냐고|그게뭐/)) {
            return { kind: "help" };
        }

        return null;
    }

    function recommendMenu(menus) {
        const preferred = ["돼지국밥", "불고기버거", "카페라떼", "레몬 에이드", "치즈 케이크"];
        const list = Array.isArray(menus) ? menus : [];
        for (let i = 0; i < preferred.length; i++) {
            const found = list.find(function (menu) { return menu && menu.name === preferred[i]; });
            if (found) return found;
        }
        return list[0] || null;
    }

    function recommendSpeech(menu) {
        if (!menu) return "추천할 메뉴가 없습니다. 메뉴판을 먼저 열어주세요.";
        const price = Number(menu.price || 0).toLocaleString("ko-KR");
        const taste = menu.taste || menu.category || "인기";
        return "저희 매장은 " + menu.name + "이 유명합니다. " + menu.name + "은 " + taste + " 메뉴입니다. 가격은 " + price + "원입니다. 원하시면 " + menu.name + "이라고 말씀해주세요.";
    }

    function zoomSpeech(level) {
        const step = Math.max(1, Math.min(4, Number(level) || 1));
        return "화면을 " + step + "단계 확대했습니다.";
    }

    function joinNames(names, limit) {
        const list = (names || []).filter(Boolean).slice(0, limit || 6);
        if (!list.length) return "";
        return list.join(", ");
    }

    function stageHelp(stage, ctx) {
        const name = String(stage || "welcome");
        const grid = joinNames(ctx && ctx.gridNames, 6);
        const cats = joinNames(ctx && ctx.categories, 8) || "국밥, 불고기, 햄버거, 커피, 음료, 디저트";

        const table = {
            welcome: "지금 화면은 시작 화면입니다. 주문을 시작하시려면 주문 시작, 또는 네 라고 말씀해주세요. 메뉴를 보시려면 메뉴판 보여줘 라고 말씀해주세요.",
            sleep: "지금은 절전 화면입니다. 주문을 시작하시려면 주문 시작이라고 말씀해주세요.",
            idle: "지금 화면은 시작 화면입니다. 주문을 시작하시려면 주문 시작이라고 말씀해주세요.",
            open_order_prompt: "지금은 메뉴를 말하는 화면입니다. 메뉴 이름을 아시면 바로 말씀하시고, 모르시면 메뉴판 보여줘 라고 말씀해주세요.",
            guide: "지금은 사용법 안내입니다. 주문을 시작하시려면 주문 시작, 안내를 멈추시려면 그만이라고 말씀해주세요.",
            category_select: "지금은 메뉴 종류를 고르는 화면입니다. " + cats + " 중에서 하나만 말씀해주세요.",
            menu_grid: "지금은 메뉴판입니다. 메뉴 이름이나 위치, 예를 들어 첫 번째, 오른쪽 거 라고 말씀해주세요." + (grid ? " 화면에 있는 메뉴는 " + grid + " 입니다." : ""),
            menu_confirm: "지금은 고르신 메뉴가 맞는지 확인하는 화면입니다. 맞으면 네, 다른 메뉴면 아니요 라고 말씀해주세요.",
            taste_select_prompt: "지금은 맛으로 메뉴를 고르는 화면입니다. 달콤, 상큼, 구수, 고소, 얼큰, 짭짤 중에서 말씀해주세요.",
            quantity: "지금은 수량을 말하는 화면입니다. 한 개, 두 개, 세 개처럼 말씀해주세요.",
            summary_add_quantity: "추가할 수량을 말씀해주세요. 한 개, 두 개처럼 말씀하시면 됩니다.",
            temp: "지금은 뜨거운 음료와 차가운 음료를 고르는 화면입니다. 따뜻하게, 또는 아이스 라고 말씀해주세요.",
            upsell: "지금은 세트로 할지 묻는 화면입니다. 세트로 하시려면 네, 단품이면 아니요 라고 말씀해주세요.",
            beverage_option_prompt: "지금은 음료 옵션을 할지 묻는 화면입니다. 옵션을 고르시려면 네, 그대로 두시려면 아니요 라고 말씀해주세요.",
            drink_option: "지금은 음료 옵션 화면입니다. 얼음, 당도, 시럽, 샷, 휘핑처럼 화면에 있는 항목을 말씀하시거나, 1단계부터 5단계로 말씀해주세요.",
            option: "지금은 옵션 화면입니다. 화면에 있는 옵션 이름을 말씀하시거나, 1단계부터 5단계로 말씀해주세요. 이대로 두시려면 이대로 라고 말씀해주세요.",
            option_select: "지금은 옵션 화면입니다. 화면에 있는 옵션 이름을 말씀하시거나, 1단계부터 5단계로 말씀해주세요.",
            cup_size: "지금은 컵 크기 화면입니다. 이백 밀리리터, 삼백오십 밀리리터, 오백 밀리리터 중에서 말씀해주세요. 작은 컵, 중간 컵, 큰 컵이라고 하셔도 됩니다.",
            size_select: "지금은 컵 크기 화면입니다. 이백 밀리리터, 삼백오십 밀리리터, 오백 밀리리터 중에서 말씀해주세요.",
            topping: "지금은 토핑 양을 고르는 화면입니다. 1단계는 적게, 3단계는 보통, 5단계는 많이입니다.",
            topping_level: "지금은 토핑 양을 고르는 화면입니다. 1단계부터 5단계 중에서 말씀해주세요.",
            level_select: "지금은 단계를 고르는 화면입니다. 1단계부터 5단계 중에서 말씀해주세요.",
            beverage_result: "옵션을 모두 고르신 화면입니다. 이대로 주문하시려면 네, 다시 고르시려면 아니요 라고 말씀해주세요.",
            place: "지금은 매장과 포장을 고르는 화면입니다. 여기서 드시면 매장, 가져가시면 포장이라고 말씀해주세요.",
            takeout: "지금은 매장과 포장을 고르는 화면입니다. 여기서 드시면 매장, 가져가시면 포장이라고 말씀해주세요.",
            dining_option: "지금은 매장과 포장을 고르는 화면입니다. 여기서 드시면 매장, 가져가시면 포장이라고 말씀해주세요.",
            add_more_prompt: "지금은 더 주문할지 묻는 화면입니다. 더 필요하면 메뉴 이름을 말씀하시고, 끝내려면 결제라고 말씀해주세요.",
            summary: "지금은 주문 내역 화면입니다. 맞으면 결제, 메뉴를 더하려면 메뉴 이름, 처음부터면 처음으로 라고 말씀해주세요.",
            payment: "지금은 결제 방법 화면입니다. 카드로 하시려면 카드, 현금으로 하시려면 현금이라고 말씀해주세요.",
            complete: "주문이 끝난 화면입니다. 처음 화면으로 가시려면 처음으로 라고 말씀해주세요.",
            done: "주문이 끝난 화면입니다. 처음 화면으로 가시려면 처음으로 라고 말씀해주세요.",
            direct_drink_more_option_prompt: "음료 옵션을 더 고르는 화면입니다. 원하시는 옵션을 말씀하시거나, 넘어가시려면 아니요 라고 말씀해주세요.",
            admin_auth: "관리자 비밀번호를 말씀해주세요. 취소하시려면 취소라고 말씀해주세요.",
            admin_panel_open: "관리자 화면입니다. 닫으시려면 닫기라고 말씀해주세요."
        };

        return table[name] || "현재 화면에서 원하시는 메뉴 이름이나 명령을 말씀해주세요. 처음부터 하시려면 처음으로 라고 말씀해주세요.";
    }

    function describeMenu(menu) {
        const item = menu || {};
        const price = Number(item.price || 0).toLocaleString("ko-KR");
        const taste = item.taste ? String(item.taste) : "기본 구성";
        const name = item.name || "이 메뉴";
        return name + "은 " + taste + " 메뉴이고, 가격은 " + price + "원입니다. 주문하시려면 " + name + "이라고 말씀해주세요.";
    }

    return {
        squash: squash,
        classify: classify,
        stageHelp: stageHelp,
        describeMenu: describeMenu,
        findMenu: findMenu,
        recommendMenu: recommendMenu,
        recommendSpeech: recommendSpeech,
        zoomSpeech: zoomSpeech
    };
});
