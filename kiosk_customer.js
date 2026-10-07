/*
  인공지능 고객.
  올바른 주문 말을 단계마다 넣고, 키오스크가 실행하지 못한 말은
  기준 말로 학습한 뒤 한 번 더 말한다.
*/
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    if (typeof window !== "undefined") {
        window.KioskCustomer = api;
        const start = function () {
            if (/[?&]customer=1(?:&|$)/.test(location.search)) api.run();
        };
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
        else start();
    }
    root.KioskCustomer = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    function steps() {
        return [
            { group: "시작", prep: "welcome", text: "네", intended: "", expect: { type: "stage", value: "open_order_prompt" } },
            { group: "시작", prep: "welcome", text: "주문할래요", intended: "네", expect: { type: "stage", value: "open_order_prompt" } },
            { group: "메뉴", prep: "open", text: "나 음료 마실래", intended: "음료", expect: { type: "category", value: "음료" } },
            { group: "메뉴", prep: "open", text: "한우불고기", intended: "한우 불고기", expect: { type: "itemStage", item: "한우", stage: "quantity" } },
            { group: "메뉴", prep: "open", text: "한우 불고기", intended: "한우 불고기", expect: { type: "itemStage", item: "한우", stage: "quantity" } },
            { group: "메뉴", prep: "open", text: "불고기", intended: "불고기", expect: { type: "category", value: "불고기", notStage: "quantity" } },
            { group: "메뉴", prep: "grid:음료", text: "오렌지 주스", intended: "오렌지 주스", expect: { type: "itemStage", item: "오렌지", stage: "quantity" } },
            { group: "메뉴", prep: "grid:음료", text: "오렌쥐쥬스", intended: "오렌지 주스", expect: { type: "itemStage", item: "오렌지", stage: "quantity" } },
            { group: "안내", prep: "grid:음료", text: "무슨 메뉴가 있는데", intended: "무슨 메뉴가 있는데", expect: { type: "spoken", value: "오렌지", stage: "menu_grid" } },
            { group: "안내", prep: "grid:음료", text: "그게 뭐냐고", intended: "이게 뭐야", expect: { type: "spoken", value: "메뉴", stage: "menu_grid" } },
            { group: "메뉴", prep: "grid:햄버거", text: "불고기버거", intended: "불고기버거", expect: { type: "itemStage", item: "불고기버거", stage: "upsell" } },
            { group: "메뉴", prep: "grid:커피", text: "아메리카노", intended: "아메리카노", expect: { type: "itemStage", item: "아메리카노", stage: "temp" } },
            { group: "메뉴", prep: "grid:국밥", text: "돼지국밥", intended: "돼지국밥", expect: { type: "itemStage", item: "돼지국밥", stage: "quantity" } },
            { group: "메뉴", prep: "grid:디저트", text: "치즈 케이크", intended: "치즈 케이크", expect: { type: "itemStage", item: "치즈", stage: "quantity" } },
            { group: "메뉴", prep: "grid:음료", text: "콜라", intended: "콜라", expect: { type: "itemStage", item: "콜라", stage: "quantity" } },
            { group: "수량", prep: "qty:오렌지 주스", text: "두 개", intended: "두 개", expect: { type: "count", count: 2, stage: "cup_size", item: "오렌지" } },
            { group: "수량", prep: "qty:오렌지 주스", text: "두잔", intended: "두 개", expect: { type: "count", count: 2, stage: "cup_size", item: "오렌지" } },
            { group: "수량", prep: "qty:한우 불고기", text: "세 개", intended: "세 개", expect: { type: "countLeave", count: 3, item: "한우" } },
            { group: "뒤로", prep: "qty:오렌지 주스", text: "이전으로", intended: "이전으로", expect: { type: "back", item: "오렌지" } },
            { group: "단계", prep: "opt", text: "1단계", intended: "1단계", expect: { type: "sugar", value: 1 } },
            { group: "단계", prep: "opt", text: "이단계", intended: "이단계", expect: { type: "sugar", value: 2 } },
            { group: "단계", prep: "opt", text: "삼 단계", intended: "삼 단계", expect: { type: "sugar", value: 3 } },
            { group: "단계", prep: "opt", text: "사단계", intended: "사단계", expect: { type: "sugar", value: 4 } },
            { group: "단계", prep: "opt", text: "오단계", intended: "오단계", expect: { type: "sugar", value: 5 } },
            { group: "추천", prep: "welcome", text: "추천해줘", intended: "추천해줘", expect: { type: "stage", value: "taste_select_prompt" } },
            { group: "추천", prep: "taste", text: "짭짤한 맛", intended: "짭짤", expect: { type: "gridHas", value: "한우", stage: "menu_grid" } },
            { group: "무시", prep: "grid:음료", text: "안녕하세요 날씨 좋네요", intended: "", expect: { type: "ignore" } },
            { group: "용량", prep: "cup:콜라", text: "라지", intended: "라지", expect: { type: "stage", value: "add_more_prompt" } },
            { group: "결제", prep: "place", text: "매장에서 먹을게요", intended: "매장에서", expect: { type: "place", value: "매장" } },
            { group: "결제", prep: "more", text: "아니요", intended: "아니요", expect: { type: "stage", value: "place" } },
            { group: "온도", prep: "temp:아메리카노", text: "뜨겁게요", intended: "핫", expect: { type: "hot" } },
            { group: "온도", prep: "temp:아메리카노", text: "아이스로 주세요", intended: "아이스", expect: { type: "ice" } },
            { group: "세트", prep: "upsell:불고기버거", text: "세트로 주세요", intended: "세트", expect: { type: "set" } },
            { group: "세트", prep: "upsell:불고기버거", text: "단품으로 주세요", intended: "단품", expect: { type: "single" } },
            { group: "단계", prep: "opt", text: "당도 낮게", intended: "1단계", expect: { type: "sugar", value: 1 } },
            { group: "단계", prep: "opt", text: "달게 해주세요", intended: "5단계", expect: { type: "sugar", value: 5 } },
            { group: "용량", prep: "cup:콜라", text: "작은 거로", intended: "스몰", expect: { type: "stage", value: "add_more_prompt" } },
            { group: "안내", prep: "grid:음료", text: "안 들려", intended: "안 들려", expect: { type: "spoken", value: "소리", stage: "menu_grid" } },
            { group: "메뉴", prep: "grid:국밥", text: "순대국밥", intended: "순대국밥", expect: { type: "itemStage", item: "순대", stage: "quantity" } },
            { group: "수량", prep: "qty:오렌지 주스", text: "한 잔만", intended: "한 개", expect: { type: "count", count: 1, stage: "cup_size", item: "오렌지" } },
            { group: "단계", prep: "opt", text: "당도 많이", intended: "4단계", expect: { type: "sugar", value: 4 } },
            { group: "결제", prep: "more", text: "없어요", intended: "아니요", expect: { type: "stage", value: "place" } },
            { group: "결제", prep: "more", text: "더 담을게요", intended: "네", expect: { type: "stage", value: "category_select" } },
            { group: "메뉴", prep: "grid:음료", text: "오렌지 주스 두 잔", intended: "오렌지 주스", expect: { type: "count", count: 2, stage: "cup_size", item: "오렌지" } },
            { group: "메뉴", prep: "grid:국밥", text: "돼지국밥 세 개", intended: "돼지국밥", expect: { type: "countLeave", count: 3, item: "돼지" } },
            { group: "수량", prep: "qty:한우 불고기", text: "네잔", intended: "네 개", expect: { type: "countLeave", count: 4, item: "한우" } },
            { group: "용량", prep: "cup:사이다", text: "보통 사이즈", intended: "미디엄", expect: { type: "stage", value: "add_more_prompt" } },
            { group: "결제", prep: "pay", text: "카드로 계산", intended: "카드", expect: { type: "pay", value: "카드" } },
            { group: "추천", prep: "taste", text: "얼큰한 맛", intended: "얼큰", expect: { type: "gridHas", value: "소고기", stage: "menu_grid" } },
            { group: "추천", prep: "taste", text: "담백한 거", intended: "", expect: { type: "spoken", value: "달콤", stage: "taste_select_prompt" } },
            { group: "메뉴", prep: "grid:커피", text: "아이스 아메리카노", intended: "아메리카노", expect: { type: "ice" } },
            { group: "메뉴", prep: "grid:햄버거", text: "치즈버거 세트", intended: "치즈버거", expect: { type: "set" } },
            { group: "용량", prep: "cup:사이다", text: "큰 걸로", intended: "라지", expect: { type: "stage", value: "add_more_prompt" } },
            { group: "단계", prep: "opt", text: "당도 가득", intended: "5단계", expect: { type: "sugar", value: 5 } },
            { group: "수량", prep: "qty:오렌지 주스", text: "2잔", intended: "두 개", expect: { type: "count", count: 2, stage: "cup_size", item: "오렌지" } },
            { group: "안내", prep: "grid:커피", text: "소리 키워 줘", intended: "소리", expect: { type: "spoken", value: "소리", stage: "menu_grid" } },
            { group: "결제", prep: "more", text: "그만 담을게요", intended: "아니요", expect: { type: "stage", value: "place" } },
            { group: "결제", prep: "more", text: "이게 다예요", intended: "아니요", expect: { type: "stage", value: "place" } },
            { group: "안내", prep: "grid:커피", text: "글자 키워 줘", intended: "확대", expect: { type: "spoken", value: "확대", stage: "menu_grid" } },
            { group: "온도", prep: "temp:아메리카노", text: "뜨끈하게", intended: "핫", expect: { type: "hot" } },
            { group: "추천", prep: "welcome", text: "뭐가 맛있어", intended: "추천해줘", expect: { type: "stage", value: "taste_select_prompt" } },
            { group: "결제", prep: "more", text: "추가 안 할래요", intended: "아니요", expect: { type: "stage", value: "place" } },
            { group: "추천", prep: "taste", text: "달달한 거", intended: "달콤", expect: { type: "gridHas", value: "덮밥", stage: "menu_grid" } },
            { group: "추천", prep: "taste", text: "새콤한 거", intended: "상큼", expect: { type: "gridHas", value: "레몬", stage: "menu_grid" } },
            { group: "수량", prep: "qty:돼지국밥", text: "한 그릇", intended: "한 개", expect: { type: "countLeave", count: 1, item: "돼지" } },
            { group: "수량", prep: "qty:돼지국밥", text: "두 그릇", intended: "두 개", expect: { type: "countLeave", count: 2, item: "돼지" } },
            { group: "온도", prep: "temp:아메리카노", text: "뜨거운 걸로", intended: "핫", expect: { type: "hot" } },
            { group: "단계", prep: "opt", text: "덜 달게", intended: "1단계", expect: { type: "sugar", value: 1 } },
            { group: "용량", prep: "cup:콜라", text: "큰 잔으로", intended: "라지", expect: { type: "stage", value: "add_more_prompt" } },
            { group: "메뉴", prep: "grid:커피", text: "아메", intended: "아메리카노", expect: { type: "itemStage", item: "아메리카노", stage: "temp" } },
            { group: "메뉴", prep: "grid:음료", text: "주스", intended: "오렌지 주스", expect: { type: "itemStage", item: "오렌지", stage: "quantity" } },
            { group: "안내", prep: "grid:커피", text: "소리 줄여 줘", intended: "소리", expect: { type: "spoken", value: "소리", stage: "menu_grid" } },
            { group: "온도", prep: "temp:아메리카노", text: "시원하게", intended: "아이스", expect: { type: "ice" } },
            { group: "용량", prep: "cup:콜라", text: "작은 잔으로", intended: "스몰", expect: { type: "stage", value: "add_more_prompt" } },
            { group: "결제", prep: "more", text: "계산이요", intended: "아니요", expect: { type: "stage", value: "place" } },
            { group: "결제", prep: "pay", text: "카드로 할게요", intended: "카드", expect: { type: "pay", value: "카드" } },
            { group: "시작", prep: "grid:음료", text: "처음부터", intended: "처음으로", expect: { type: "stage", value: "welcome" } },
            { group: "메뉴", prep: "grid:디저트", text: "아이스크림", intended: "소프트 아이스크림", expect: { type: "itemStage", item: "아이스크림", stage: "quantity" } },
            { group: "메뉴", prep: "grid:디저트", text: "케이크", intended: "치즈 케이크", expect: { type: "itemStage", item: "치즈", stage: "quantity" } },
            { group: "수량", prep: "qty:돼지국밥", text: "세 그릇", intended: "세 개", expect: { type: "countLeave", count: 3, item: "돼지" } },
            { group: "수량", prep: "qty:돼지국밥", text: "한 그릇만", intended: "한 개", expect: { type: "countLeave", count: 1, item: "돼지" } },
            { group: "메뉴", prep: "grid:커피", text: "라떼", intended: "카페라떼", expect: { type: "itemStage", item: "카페라떼", stage: "temp" } },
            { group: "메뉴", prep: "grid:커피", text: "따뜻한 라떼", intended: "카페라떼", expect: { type: "hot" } },
            { group: "메뉴", prep: "grid:음료", text: "레몬", intended: "레몬 에이드", expect: { type: "itemStage", item: "레몬", stage: "quantity" } },
            { group: "메뉴", prep: "grid:음료", text: "딸기", intended: "딸기 라떼", expect: { type: "itemStage", item: "딸기", stage: "quantity" } },
            { group: "용량", prep: "cup:사이다", text: "중간 걸로", intended: "미디엄", expect: { type: "stage", value: "add_more_prompt" } },
            { group: "단계", prep: "opt", text: "시럽 없이", intended: "1단계", expect: { type: "sugar", value: 1 } },
            { group: "결제", prep: "place", text: "가지고 갈게", intended: "포장", expect: { type: "place", value: "포장" } },
            { group: "결제", prep: "pay", text: "돈으로 낼게", intended: "현금", expect: { type: "pay", value: "현금" } },
            { group: "결제", prep: "more", text: "이제 됐어", intended: "아니요", expect: { type: "stage", value: "place" } },
            { group: "추천", prep: "taste", text: "달달하게", intended: "달콤", expect: { type: "gridHas", value: "덮밥", stage: "menu_grid" } },
            { group: "안내", prep: "grid:커피", text: "소리 내려 줘", intended: "소리", expect: { type: "spoken", value: "소리", stage: "menu_grid" } },
            { group: "안내", prep: "grid:커피", text: "글씨 키워 줘", intended: "확대", expect: { type: "spoken", value: "확대", stage: "menu_grid" } },
            { group: "메뉴", prep: "open", text: "음료수", intended: "음료", expect: { type: "category", value: "음료" } },
            { group: "메뉴", prep: "open", text: "국물", intended: "국밥", expect: { type: "category", value: "국밥", notStage: "quantity" } },
            { group: "수량", prep: "qty:오렌지 주스", text: "두 명이요", intended: "두 개", expect: { type: "count", count: 2, stage: "cup_size", item: "오렌지" } },
            { group: "결제", prep: "place", text: "포장으로", intended: "포장", expect: { type: "place", value: "포장" } },
            { group: "결제", prep: "place", text: "먹고 갈게", intended: "매장에서", expect: { type: "place", value: "매장" } },
            { group: "결제", prep: "pay", text: "현금으로 줄게", intended: "현금", expect: { type: "pay", value: "현금" } },
            { group: "추천", prep: "taste", text: "매운 거", intended: "얼큰", expect: { type: "gridHas", value: "소고기", stage: "menu_grid" } },
            { group: "추천", prep: "taste", text: "짠 거", intended: "짭짤", expect: { type: "gridHas", value: "한우", stage: "menu_grid" } },
            { group: "추천", prep: "taste", text: "단 거", intended: "달콤", expect: { type: "gridHas", value: "덮밥", stage: "menu_grid" } },
            { group: "추천", prep: "taste", text: "순한 거", intended: "", expect: { type: "spoken", value: "달콤", stage: "taste_select_prompt" } },
            { group: "메뉴", prep: "grid:음료", text: "에이드", intended: "레몬 에이드", expect: { type: "itemStage", item: "레몬", stage: "quantity" } },
            { group: "메뉴", prep: "grid:음료", text: "쉐이크", intended: "쿠키 쉐이크", expect: { type: "itemStage", item: "쿠키", stage: "quantity" } },
            { group: "메뉴", prep: "grid:음료", text: "주스 한 잔", intended: "오렌지 주스", expect: { type: "count", count: 1, stage: "cup_size", item: "오렌지" } },
            { group: "메뉴", prep: "grid:커피", text: "따뜻한 커피", intended: "커피", expect: { type: "spoken", value: "아메리카노", stage: "menu_grid" } },
            { group: "메뉴", prep: "open", text: "버거", intended: "햄버거", expect: { type: "category", value: "햄버거", notStage: "quantity" } },
            { group: "수량", prep: "qty:오렌지 주스", text: "세 명이요", intended: "세 개", expect: { type: "count", count: 3, stage: "cup_size", item: "오렌지" } },
            { group: "수량", prep: "qty:오렌지 주스", text: "혼자 먹을게요", intended: "한 개", expect: { type: "count", count: 1, stage: "cup_size", item: "오렌지" } },
            { group: "단계", prep: "opt", text: "안 달게", intended: "1단계", expect: { type: "sugar", value: 1 } },
            { group: "단계", prep: "opt", text: "최대로", intended: "5단계", expect: { type: "sugar", value: 5 } },
            { group: "안내", prep: "grid:커피", text: "크게 말해 줘", intended: "소리", expect: { type: "spoken", value: "소리", stage: "menu_grid" } },
            { group: "안내", prep: "grid:커피", text: "화면 좀 키워 줘", intended: "확대", expect: { type: "spoken", value: "확대", stage: "menu_grid" } },
            { group: "시작", prep: "welcome", text: "뭐가 좋아", intended: "추천해줘", expect: { type: "stage", value: "taste_select_prompt" } },
            { group: "시작", prep: "grid:국밥", text: "처음으로 돌아가", intended: "처음으로", expect: { type: "stage", value: "welcome" } },
            { group: "결제", prep: "more", text: "그만할래", intended: "아니요", expect: { type: "stage", value: "place" } },
            { group: "메뉴", prep: "grid:국밥", text: "국밥 하나", intended: "국밥", expect: { type: "category", value: "국밥", notStage: "quantity" } },
            { group: "수량", prep: "qty:오렌지 주스", text: "네 명이요", intended: "네 개", expect: { type: "count", count: 4, stage: "cup_size", item: "오렌지" } },
            { group: "메뉴", prep: "grid:음료", text: "콜라 세 잔", intended: "콜라", expect: { type: "count", count: 3, stage: "cup_size", item: "콜라" } },
            { group: "메뉴", prep: "grid:음료", text: "사이다 한 잔", intended: "사이다", expect: { type: "count", count: 1, stage: "cup_size", item: "사이다" } },
            { group: "메뉴", prep: "grid:디저트", text: "치즈케이크 하나", intended: "치즈 케이크", expect: { type: "countLeave", count: 1, item: "치즈" } },
            { group: "메뉴", prep: "grid:디저트", text: "아이스크림 두 개", intended: "소프트 아이스크림", expect: { type: "countLeave", count: 2, item: "아이스크림" } },
            { group: "뒤로", prep: "qty:오렌지 주스", text: "뒤로 갈게요", intended: "이전으로", expect: { type: "back", item: "오렌지" } },
            { group: "안내", prep: "grid:커피", text: "소리 좀 키워 줘", intended: "소리", expect: { type: "spoken", value: "소리", stage: "menu_grid" } },
            { group: "추천", prep: "taste", text: "신 거", intended: "상큼", expect: { type: "gridHas", value: "레몬", stage: "menu_grid" } },
            { group: "추천", prep: "taste", text: "안 매운 거", intended: "", expect: { type: "spoken", value: "달콤", stage: "taste_select_prompt" } },
            { group: "추천", prep: "taste", text: "달콤하게", intended: "달콤", expect: { type: "gridHas", value: "덮밥", stage: "menu_grid" } },
            { group: "추천", prep: "taste", text: "얼큰하게", intended: "얼큰", expect: { type: "gridHas", value: "소고기", stage: "menu_grid" } },
            { group: "추천", prep: "taste", text: "고소하게", intended: "고소", expect: { type: "gridHas", value: "치즈", stage: "menu_grid" } },
            { group: "추천", prep: "taste", text: "구수하게", intended: "구수", expect: { type: "gridHas", value: "아메리카노", stage: "menu_grid" } },
            { group: "단계", prep: "opt", text: "시럽 빼 주세요", intended: "1단계", expect: { type: "sugar", value: 1 } },
            { group: "결제", prep: "pay", text: "카드로 할게", intended: "카드", expect: { type: "pay", value: "카드" } },
            { group: "결제", prep: "place", text: "여기서 먹을게", intended: "매장에서", expect: { type: "place", value: "매장" } },
            { group: "결제", prep: "place", text: "밖에 나갈게", intended: "포장", expect: { type: "place", value: "포장" } },
            { group: "메뉴", prep: "grid:커피", text: "아메리카노 따뜻하게", intended: "아메리카노", expect: { type: "hot" } },
            { group: "메뉴", prep: "grid:커피", text: "카페라떼 아이스", intended: "카페라떼", expect: { type: "ice" } },
            { group: "세트", prep: "upsell:불고기버거", text: "세트 먹을래", intended: "세트", expect: { type: "set" } },
            { group: "온도", prep: "temp:아메리카노", text: "핫으로 주세요", intended: "핫", expect: { type: "hot" } },
            { group: "온도", prep: "temp:아메리카노", text: "차갑게 해 주세요", intended: "아이스", expect: { type: "ice" } },
            { group: "용량", prep: "cup:콜라", text: "350으로", intended: "미디엄", expect: { type: "stage", value: "add_more_prompt" } },
            { group: "용량", prep: "cup:콜라", text: "오백으로", intended: "라지", expect: { type: "stage", value: "add_more_prompt" } },
            { group: "용량", prep: "cup:콜라", text: "이백으로", intended: "스몰", expect: { type: "stage", value: "add_more_prompt" } },
            { group: "결제", prep: "place", text: "포장해 주이소", intended: "포장", expect: { type: "place", value: "포장" } },
            { group: "안내", prep: "grid:커피", text: "글씨가 작아", intended: "확대", expect: { type: "spoken", value: "확대", stage: "menu_grid" } },
            { group: "결제", prep: "more", text: "계산할래", intended: "아니요", expect: { type: "stage", value: "place" } },
            { group: "메뉴", prep: "open", text: "커피 주세요", intended: "커피", expect: { type: "category", value: "커피" } },
            { group: "메뉴", prep: "open", text: "디저트 주세요", intended: "디저트", expect: { type: "category", value: "디저트" } },
            { group: "메뉴", prep: "grid:불고기", text: "덮밥 두 개", intended: "불고기 덮밥", expect: { type: "countLeave", count: 2, item: "덮밥" } },
            { group: "메뉴", prep: "grid:국밥", text: "순대", intended: "순대국밥", expect: { type: "itemStage", item: "순대", stage: "quantity" } },
            { group: "메뉴", prep: "grid:국밥", text: "백반", intended: "수육 백반", expect: { type: "itemStage", item: "수육", stage: "quantity" } },
            { group: "결제", prep: "more", text: "그걸로 할게요", intended: "아니요", expect: { type: "stage", value: "place" } },
            { group: "결제", prep: "more", text: "됐어요", intended: "아니요", expect: { type: "stage", value: "place" } },
            { group: "안내", prep: "grid:커피", text: "소리 높여 줘", intended: "소리", expect: { type: "spoken", value: "소리", stage: "menu_grid" } },
            { group: "안내", prep: "grid:커피", text: "소리 낮춰 줘", intended: "소리", expect: { type: "spoken", value: "소리", stage: "menu_grid" } },
            { group: "안내", prep: "grid:커피", text: "볼륨 올려", intended: "소리", expect: { type: "spoken", value: "소리", stage: "menu_grid" } },
            { group: "안내", prep: "grid:커피", text: "볼륨 내려", intended: "소리", expect: { type: "spoken", value: "소리", stage: "menu_grid" } },
            { group: "안내", prep: "grid:커피", text: "글자 크게", intended: "확대", expect: { type: "spoken", value: "확대", stage: "menu_grid" } },
            { group: "안내", prep: "grid:커피", text: "글씨 크게", intended: "확대", expect: { type: "spoken", value: "확대", stage: "menu_grid" } },
            { group: "안내", prep: "grid:커피", text: "잘 안 보여", intended: "확대", expect: { type: "spoken", value: "확대", stage: "menu_grid" } },
            { group: "수량", prep: "qty:오렌지 주스", text: "두 잔만", intended: "두 개", expect: { type: "count", count: 2, stage: "cup_size", item: "오렌지" } },
            { group: "메뉴", prep: "grid:국밥", text: "국밥 두 그릇", intended: "국밥", expect: { type: "category", value: "국밥", notStage: "quantity" } },
            { group: "메뉴", prep: "grid:커피", text: "아이스 라떼", intended: "카페라떼", expect: { type: "ice" } },
            { group: "메뉴", prep: "grid:커피", text: "핫 라떼", intended: "카페라떼", expect: { type: "hot" } },
            { group: "메뉴", prep: "grid:음료", text: "딸기라떼 하나", intended: "딸기 라떼", expect: { type: "count", count: 1, stage: "cup_size", item: "딸기" } },
            { group: "결제", prep: "place", text: "들고 갈게", intended: "포장", expect: { type: "place", value: "포장" } },
            { group: "결제", prep: "place", text: "가져갈게", intended: "포장", expect: { type: "place", value: "포장" } },
            { group: "결제", prep: "place", text: "안에서 먹을게", intended: "매장에서", expect: { type: "place", value: "매장" } },
            { group: "안내", prep: "grid:커피", text: "못 들었어", intended: "안 들려", expect: { type: "spoken", value: "소리", stage: "menu_grid" } },
            { group: "결제", prep: "more", text: "결제해 주세요", intended: "아니요", expect: { type: "stage", value: "place" } },
            { group: "시작", prep: "grid:국밥", text: "처음으로 갈래", intended: "처음으로", expect: { type: "stage", value: "welcome" } },
            { group: "추천", prep: "taste", text: "덜 맵게", intended: "", expect: { type: "spoken", value: "달콤", stage: "taste_select_prompt" } },
            { group: "추천", prep: "taste", text: "싱거운 거", intended: "", expect: { type: "spoken", value: "달콤", stage: "taste_select_prompt" } },
            { group: "용량", prep: "cup:콜라", text: "미디엄으로", intended: "미디엄", expect: { type: "stage", value: "add_more_prompt" } },
            { group: "용량", prep: "cup:콜라", text: "라지로 주세요", intended: "라지", expect: { type: "stage", value: "add_more_prompt" } },
            { group: "용량", prep: "cup:콜라", text: "스몰로 주세요", intended: "스몰", expect: { type: "stage", value: "add_more_prompt" } },
            { group: "메뉴", prep: "grid:국밥", text: "돼지국밥으로", intended: "돼지국밥", expect: { type: "itemStage", item: "돼지", stage: "quantity" } },
            { group: "메뉴", prep: "grid:국밥", text: "순대국", intended: "순대국밥", expect: { type: "itemStage", item: "순대", stage: "quantity" } },
            { group: "메뉴", prep: "grid:국밥", text: "소고기국", intended: "소고기국밥", expect: { type: "itemStage", item: "소고기", stage: "quantity" } },
            { group: "온도", prep: "temp:아메리카노", text: "뜨겁게 해 주세요", intended: "핫", expect: { type: "hot" } },
            { group: "온도", prep: "temp:아메리카노", text: "따뜻하게 해줘", intended: "핫", expect: { type: "hot" } },
            { group: "메뉴", prep: "open", text: "커피로 할게요", intended: "커피", expect: { type: "category", value: "커피" } },
            { group: "메뉴", prep: "open", text: "음료로 할게요", intended: "음료", expect: { type: "category", value: "음료" } },
            { group: "메뉴", prep: "open", text: "디저트로", intended: "디저트", expect: { type: "category", value: "디저트" } },
            { group: "메뉴", prep: "open", text: "햄버거로", intended: "햄버거", expect: { type: "category", value: "햄버거", notStage: "quantity" } },
            { group: "메뉴", prep: "open", text: "불고기로", intended: "불고기", expect: { type: "category", value: "불고기", notStage: "quantity" } },
            { group: "메뉴", prep: "open", text: "국밥으로 할게요", intended: "국밥", expect: { type: "category", value: "국밥", notStage: "quantity" } },
            { group: "단계", prep: "opt", text: "조금 달게", intended: "2단계", expect: { type: "sugar", value: 2 } },
            { group: "단계", prep: "opt", text: "더 달게", intended: "5단계", expect: { type: "sugar", value: 5 } },
            { group: "단계", prep: "opt", text: "보통으로 해줘", intended: "3단계", expect: { type: "sugar", value: 3 } },
            { group: "용량", prep: "cup:콜라", text: "500으로", intended: "라지", expect: { type: "stage", value: "add_more_prompt" } },
            { group: "용량", prep: "cup:콜라", text: "200으로", intended: "스몰", expect: { type: "stage", value: "add_more_prompt" } },
            { group: "용량", prep: "cup:사이다", text: "큰 컵", intended: "라지", expect: { type: "stage", value: "add_more_prompt" } },
            { group: "용량", prep: "cup:사이다", text: "작은 컵", intended: "스몰", expect: { type: "stage", value: "add_more_prompt" } },
            { group: "용량", prep: "cup:사이다", text: "중간 컵", intended: "미디엄", expect: { type: "stage", value: "add_more_prompt" } },
            { group: "수량", prep: "qty:오렌지 주스", text: "세 잔만", intended: "세 개", expect: { type: "count", count: 3, stage: "cup_size", item: "오렌지" } },
            { group: "수량", prep: "qty:오렌지 주스", text: "네 잔만", intended: "네 개", expect: { type: "count", count: 4, stage: "cup_size", item: "오렌지" } },
            { group: "결제", prep: "place", text: "포장으로 할게요", intended: "포장", expect: { type: "place", value: "포장" } },
            { group: "결제", prep: "place", text: "먹고 갈게요", intended: "매장에서", expect: { type: "place", value: "매장" } },
            { group: "결제", prep: "pay", text: "카드요", intended: "카드", expect: { type: "pay", value: "카드" } },
            { group: "결제", prep: "pay", text: "현금이요", intended: "현금", expect: { type: "pay", value: "현금" } },
            { group: "결제", prep: "more", text: "추가 없어요", intended: "아니요", expect: { type: "stage", value: "place" } },
            { group: "결제", prep: "more", text: "더 안 담을게요", intended: "아니요", expect: { type: "stage", value: "place" } },
            { group: "세트", prep: "upsell:치즈버거", text: "단품으로 해줘", intended: "단품", expect: { type: "single" } },
            { group: "메뉴", prep: "grid:커피", text: "아이스커피", intended: "아메리카노", expect: { type: "ice" } },
            { group: "메뉴", prep: "grid:커피", text: "핫커피", intended: "아메리카노", expect: { type: "hot" } },
            { group: "시작", prep: "welcome", text: "추천 메뉴", intended: "추천해줘", expect: { type: "stage", value: "taste_select_prompt" } },
            { group: "안내", prep: "grid:커피", text: "다시 말해줘", intended: "다시", expect: { type: "spoken", value: "메뉴", stage: "menu_grid" } },
            { group: "안내", prep: "grid:커피", text: "천천히 말해줘", intended: "다시", expect: { type: "spoken", value: "메뉴", stage: "menu_grid" } },
            { group: "시작", prep: "welcome", text: "주문할께", intended: "네", expect: { type: "stage", value: "open_order_prompt" } },
            { group: "시작", prep: "welcome", text: "먹을께", intended: "네", expect: { type: "stage", value: "open_order_prompt" } },
            { group: "결제", prep: "more", text: "계산할께", intended: "아니요", expect: { type: "stage", value: "place" } },
            { group: "결제", prep: "place", text: "포장할께", intended: "포장", expect: { type: "place", value: "포장" } },
            { group: "결제", prep: "pay", text: "카드로 할께", intended: "카드", expect: { type: "pay", value: "카드" } },
            { group: "온도", prep: "temp:아메리카노", text: "뜨겁게 주이소", intended: "핫", expect: { type: "hot" } },
            { group: "온도", prep: "temp:아메리카노", text: "시원하게 주이소", intended: "아이스", expect: { type: "ice" } },
            { group: "수량", prep: "qty:돼지국밥", text: "한 그릇 주이소", intended: "한 개", expect: { type: "countLeave", count: 1, item: "돼지" } },
            { group: "메뉴", prep: "grid:커피", text: "아메리카노 하나", intended: "아메리카노", expect: { type: "itemStage", item: "아메리카노", stage: "temp" } },
            { group: "메뉴", prep: "grid:커피", text: "라떼 두 잔", intended: "카페라떼", expect: { type: "itemStage", item: "카페라떼", stage: "temp" } },
            { group: "메뉴", prep: "grid:햄버거", text: "치즈버거 하나", intended: "치즈버거", expect: { type: "itemStage", item: "치즈버거", stage: "upsell" } },
            { group: "메뉴", prep: "grid:국밥", text: "순대국밥 두 그릇", intended: "순대국밥", expect: { type: "countLeave", count: 2, item: "순대" } },
            { group: "메뉴", prep: "grid:국밥", text: "소고기국밥 하나", intended: "소고기국밥", expect: { type: "countLeave", count: 1, item: "소고기" } },
            { group: "메뉴", prep: "grid:디저트", text: "케이크 하나", intended: "치즈 케이크", expect: { type: "countLeave", count: 1, item: "치즈" } },
            { group: "메뉴", prep: "grid:디저트", text: "아이스크림 하나", intended: "소프트 아이스크림", expect: { type: "countLeave", count: 1, item: "아이스크림" } },
            { group: "메뉴", prep: "grid:국밥", text: "수육", intended: "수육 백반", expect: { type: "itemStage", item: "수육", stage: "quantity" } },
            { group: "용량", prep: "cup:콜라", text: "라지 사이즈", intended: "라지", expect: { type: "stage", value: "add_more_prompt" } },
            { group: "용량", prep: "cup:콜라", text: "스몰 사이즈", intended: "스몰", expect: { type: "stage", value: "add_more_prompt" } },
            { group: "단계", prep: "opt", text: "당도 없이", intended: "1단계", expect: { type: "sugar", value: 1 } },
            { group: "결제", prep: "place", text: "여기 먹을께", intended: "매장에서", expect: { type: "place", value: "매장" } },
            { group: "메뉴", prep: "grid:커피", text: "따뜻한 아메리카노 하나", intended: "아메리카노", expect: { type: "countLeave", count: 1, item: "아메리카노" } },
            { group: "메뉴", prep: "grid:커피", text: "아이스 아메리카노 두 잔", intended: "아메리카노", expect: { type: "countLeave", count: 2, item: "아메리카노" } },
            { group: "메뉴", prep: "grid:햄버거", text: "치즈버거 세트 두 개", intended: "치즈버거", expect: { type: "countLeave", count: 2, item: "치즈" } },
            { group: "메뉴", prep: "grid:햄버거", text: "불고기버거 단품 하나", intended: "불고기버거", expect: { type: "countLeave", count: 1, item: "불고기버거" } },
            { group: "메뉴", prep: "open", text: "국밥 주이소", intended: "국밥", expect: { type: "category", value: "국밥", notStage: "quantity" } },
            { group: "메뉴", prep: "open", text: "커피 주이소", intended: "커피", expect: { type: "category", value: "커피" } },
            { group: "메뉴", prep: "grid:음료", text: "콜라 주이소", intended: "콜라", expect: { type: "itemStage", item: "콜라", stage: "quantity" } },
            { group: "시작", prep: "welcome", text: "메뉴판 보여줘", intended: "메뉴판", expect: { type: "stage", value: "category_select" } },
            { group: "결제", prep: "pay", text: "카드로 주이소", intended: "카드", expect: { type: "pay", value: "카드" } },
            { group: "결제", prep: "place", text: "먹고갈께", intended: "매장에서", expect: { type: "place", value: "매장" } },
            { group: "결제", prep: "place", text: "가지고갈께", intended: "포장", expect: { type: "place", value: "포장" } },
            { group: "안내", prep: "grid:커피", text: "소리 더 키워", intended: "소리", expect: { type: "spoken", value: "소리", stage: "menu_grid" } },
            { group: "안내", prep: "grid:커피", text: "글자 더 크게", intended: "확대", expect: { type: "spoken", value: "확대", stage: "menu_grid" } }
        ];
    }

    function passes(expect, after) {
        if (!expect) return false;
        if (expect.type === "stage") return after.stage === expect.value;
        if (expect.type === "category") {
            const ok = after.cat === expect.value || String(after.grid || "").indexOf(expect.value) >= 0;
            return ok && after.stage !== expect.notStage;
        }
        if (expect.type === "itemStage") return after.stage === expect.stage && String(after.item || "").indexOf(expect.item) >= 0;
        if (expect.type === "spoken") return after.stage === expect.stage && String(after.spoken || "").indexOf(expect.value) >= 0;
        if (expect.type === "count") {
            return after.count === expect.count && after.stage === expect.stage && String(after.item || "").indexOf(expect.item) >= 0;
        }
        if (expect.type === "countLeave") {
            return after.count === expect.count && after.stage !== "quantity" && String(after.item || "").indexOf(expect.item) >= 0;
        }
        if (expect.type === "back") return after.stage !== "quantity" && String(after.item || "").indexOf(expect.item) >= 0;
        if (expect.type === "sugar") return after.sugar === expect.value && after.step !== 1;
        if (expect.type === "gridHas") return after.stage === expect.stage && String(after.grid || "").indexOf(expect.value) >= 0;
        if (expect.type === "ignore") return after.stage === "menu_grid" && !after.item;
        if (expect.type === "place") return after.stage === "summary" && String(after.place || "").indexOf(expect.value) >= 0 && /원/.test(after.spoken || "");
        if (expect.type === "hot") return after.stage === "quantity" && /핫/.test(after.temp || "");
        if (expect.type === "ice") return after.stage === "quantity" && /아이스/.test(after.temp || "");
        if (expect.type === "set") return after.stage === "quantity" && after.set === true;
        if (expect.type === "single") return after.stage === "quantity" && after.set === false;
        if (expect.type === "pay") return String(after.pay || "").indexOf(expect.value || "") >= 0 && expect.value;
        return false;
    }

    function run(list) {
        if (typeof window.__kioskCustomerSay !== "function") {
            console.log("[고객] 사용 기록이 아직 없습니다.");
            return null;
        }
        const savedSpeak = window.speakText;
        const savedBlock = window.__kioskTtsBlocking;

        function hush() {
            window.__kioskTtsBlocking = function () { return false; };
            window.__kioskTtsHeardUntil = 0;
            window.__TTS_FINAL_MIC_OFF = false;
            window.__TTS_FINAL_MIC_OFF_UNTIL = 0;
            window.isTtsSpeaking = false;
            window.__ttsHardBlock = false;
            window.__ttsBlockUntil = 0;
            try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
            window.speakText = function (text) {
                if (text) window.__kioskLastSpoken = String(text);
                window.isTtsSpeaking = false;
                window.__ttsHardBlock = false;
                window.__kioskTtsHeardUntil = 0;
            };
            try { speakText = window.speakText; } catch (e) {}
        }

        function capture() {
            let sugar = null;
            try { sugar = tempItem && tempItem.beverageOptions ? tempItem.beverageOptions.sugar : null; } catch (e) {}
            let grid = "";
            try { grid = (currentGridMenus || []).map(function (menu) { return menu.name; }).join("|"); } catch (e2) {}
            return {
                stage: currentStageName,
                item: (tempItem && tempItem.item) || "",
                count: tempItem ? tempItem.count : 0,
                cat: selectedCategory || "",
                grid: grid,
                sugar: sugar,
                step: optionStepIndex,
                place: (orderState && orderState.place) || "",
                temp: (tempItem && tempItem.temp) || "",
                set: !!(tempItem && tempItem.isSet),
                pay: (orderState && orderState.pay) || "",
                spoken: String(window.__kioskLastSpoken || "")
            };
        }

        function blank() {
            hush();
            orderState = { items: [], place: "", pay: "" };
            tempItem = emptyTempItem();
            isAddOnPhase = false;
            optionList = [];
            optionStepIndex = 0;
            selectedCategory = "";
            currentGridMenus = [];
            pendingMenuName = "";
            window.__kioskLastSpoken = "";
            currentStageName = "welcome";
        }

        function prepare(kind) {
            blank();
            if (kind === "welcome") return;
            if (kind === "open") { currentStageName = "open_order_prompt"; return; }
            if (kind === "taste") { currentStageName = "taste_select_prompt"; return; }
            if (kind.indexOf("grid:") === 0) {
                const cat = kind.slice(5);
                selectedCategory = cat;
                currentGridMenus = customMenus.filter(function (menu) { return menu.category === cat; });
                currentStageName = "menu_grid";
                return;
            }
            if (kind.indexOf("qty:") === 0) {
                tempItem.item = kind.slice(4);
                tempItem.count = 0;
                currentStageName = "quantity";
                return;
            }
            if (kind.indexOf("cup:") === 0) {
                tempItem.item = kind.slice(4);
                tempItem.count = 1;
                tempItem.temp = "아이스(ICE)";
                currentStageName = "cup_size";
                return;
            }
            if (kind === "opt") {
                tempItem.item = "오렌지 주스";
                tempItem.count = 1;
                tempItem.cupSize = "500ml";
                tempItem.temp = "아이스(ICE)";
                tempItem.beverageOptions = { ice: 1, sugar: 1, syrup: 1, whip: 1, pearl: 1, fruit: 1 };
                const menu = customMenus.find(function (item) { return item.name === "오렌지 주스"; });
                optionList = generateDrinkOptions(tempItem.item, menu.category, tempItem.temp);
                optionStepIndex = optionList.findIndex(function (opt) { return opt.key === "sugar"; });
                currentStageName = "beverage_option_step";
                return;
            }
            if (kind === "place") {
                tempItem.item = "오렌지 주스";
                tempItem.count = 1;
                tempItem.temp = "기본";
                commitTempItemToCartIfValid();
                currentStageName = "place";
                return;
            }
            if (kind === "more") {
                tempItem.item = "오렌지 주스";
                tempItem.count = 1;
                currentStageName = "add_more_prompt";
                return;
            }
            if (kind.indexOf("temp:") === 0) {
                tempItem.item = kind.slice(5);
                currentStageName = "temp";
                return;
            }
            if (kind.indexOf("upsell:") === 0) {
                tempItem.item = kind.slice(7);
                currentStageName = "upsell";
                return;
            }
            if (kind === "pay") {
                tempItem.item = "오렌지 주스";
                tempItem.count = 1;
                tempItem.temp = "기본";
                commitTempItemToCartIfValid();
                orderState.place = "매장에서 먹기";
                currentStageName = "payment";
                return;
            }
            if (kind === "sum") {
                tempItem.item = "오렌지 주스";
                tempItem.count = 1;
                tempItem.temp = "기본";
                commitTempItemToCartIfValid();
                orderState.place = "매장에서 먹기";
                currentStageName = "summary";
            }
        }

        const report = { total: 0, passed: 0, learned: 0, taught: 0, known: 0, missed: [], rows: [] };
        (list && list.length ? list : steps()).forEach(function (step) {
            hush();
            prepare(step.prep);
            window.__kioskCustomerSay(step.text, step.intended || "");
            let after = capture();
            let passed = passes(step.expect, after);
            let learned = false;
            if (!passed && step.intended) {
                prepare(step.prep);
                window.__kioskCustomerSay(step.text, "");
                after = capture();
                passed = passes(step.expect, after);
                learned = passed;
            }
            report.total += 1;
            if (passed) report.passed += 1;
            if (learned) report.learned += 1;
            if (passed && typeof window.__kioskTeachPhrase === "function") {
                const canonical = step.intended || step.text;
                if (window.__kioskTeachPhrase(canonical, step.text)) report.taught += 1;
            }
            if (!passed) {
                report.missed.push({
                    group: step.group,
                    text: step.text,
                    stage: after.stage,
                    item: after.item,
                    spoken: String(after.spoken || "").slice(0, 80)
                });
            }
            report.rows.push({ group: step.group, text: step.text, passed: passed, learned: learned, stage: after.stage, item: after.item });
        });

        window.speakText = savedSpeak;
        try { speakText = savedSpeak; } catch (e) {}
        window.__kioskTtsBlocking = savedBlock;
        if (typeof window.__kioskTaughtCount === "function") report.known = window.__kioskTaughtCount();
        window.__kioskCustomerReport = report;
        console.log("[고객] 통과 " + report.passed + "/" + report.total + ", 이번에 학습 " + (report.taught + report.learned) + ", 사전 " + report.known + ", 아직 실행 안 됨 " + report.missed.length);
        report.missed.forEach(function (miss) {
            console.log("[고객] 실행 안 됨:", miss.text, miss.stage, miss.item);
        });
        return report;
    }

    if (typeof window !== "undefined") {
        window.__kioskRunCustomer = function () { return run(steps()); };
        window.__kioskTryCustomer = function (extra) { return run(extra); };
    }

    return { steps: steps, passes: passes, run: run };
});
