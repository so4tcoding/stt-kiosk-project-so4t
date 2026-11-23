"""기말 문제 형식 학습기와 출제기.

시중 문제집 문장을 복제하지 않는다. data/exemplars 의 자체 형식 예시에서
개념 카드, 대표 유형, 5지선다, 배점, 답안지 분리 같은 구성만 읽고,
data/question_bank.json 의 문항을 문제집 또는 모의고사로 조판한다.
"""

from __future__ import annotations

import json
import random
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
EXEMPLARS = DATA / "exemplars"
BANK_PATH = DATA / "question_bank.json"
CUSTOM_PATH = DATA / "custom_styles.json"

CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩"
DIFF_RANK = {"하": 0, "중": 1, "상": 2}
BOOL_KEYS = {
    "showConceptCard",
    "showCaution",
    "showTrapOnItem",
    "showPointsOnItem",
    "showDifficulty",
    "headerTime",
    "headerScore",
    "separateAnswerSheet",
    "separateCommentary",
    "solutionCollapsed",
    "groupByUnit",
    "representativeFirst",
    "endAnswerKey",
}


def load_bank():
    bank = json.loads(BANK_PATH.read_text(encoding="utf-8"))
    if not isinstance(bank, list) or not bank:
        raise ValueError("문항 꾸러미가 비어 있습니다.")
    return bank


def validate_bank(bank=None):
    bank = load_bank() if bank is None else bank
    seen = set()
    for item in bank:
        qid = item.get("id")
        if not qid or qid in seen:
            raise ValueError(f"문항 아이디가 겹치거나 없습니다: {qid}")
        seen.add(qid)
        if item.get("difficulty") not in DIFF_RANK:
            raise ValueError(f"{qid} 난이도를 확인하세요.")
        kind = item.get("type")
        if kind == "objective":
            if len(item.get("choices") or []) != 5:
                raise ValueError(f"{qid} 선지는 5개여야 합니다.")
            if not 1 <= int(item.get("answer") or 0) <= 5:
                raise ValueError(f"{qid} 정답 번호를 확인하세요.")
        elif kind == "short":
            if not str(item.get("answerText") or "").strip():
                raise ValueError(f"{qid} 단답 정답이 없습니다.")
        else:
            raise ValueError(f"{qid} 문항 형식을 확인하세요.")
        for key in ("stem", "solution", "trap", "subject", "unit", "grade"):
            if not str(item.get(key) or "").strip():
                raise ValueError(f"{qid}에 {key}가 없습니다.")
    return bank


def read_exemplar(kind: str) -> str:
    path = EXEMPLARS / f"{kind}.txt"
    if not path.exists():
        raise ValueError("형식 예시를 찾지 못했습니다.")
    return path.read_text(encoding="utf-8")


def _flag(text: str, negative: str, positive: str, default: bool) -> bool:
    if negative and re.search(negative, text):
        return False
    if positive and re.search(positive, text):
        return True
    return default


def learn_text(kind: str, text: str) -> dict:
    """시험지 문장에서 조판 규칙만 뽑는다. 원문은 결과에 넣지 않는다."""
    if kind not in ("workbook", "mock"):
        raise ValueError("문제집 또는 모의고사를 골라 주세요.")
    raw = text or ""
    found = [i for i, mark in enumerate(CIRCLED, start=1) if mark in raw]
    choice_count = max(found) if found else 5

    show_points = _flag(
        raw,
        r"배점[^\n]{0,16}(적지 않|숨|넣지 않|표시하지)",
        r"(\d+\s*점|배점을 적|문항마다 배점)",
        kind == "mock",
    )
    show_concept = _flag(
        raw,
        r"개념 카드[^\n]{0,24}넣지 않",
        r"\[개념\]|개념\s*CHECK|개념 정리|(?<!넣지 않는 )개념 카드",
        kind == "workbook",
    )
    show_trap = _flag(
        raw,
        r"함정은[^\n]{0,24}해설",
        r"함정",
        False,
    )
    show_difficulty = _flag(
        raw,
        r"난이도[^\n]{0,12}(적지 않|숨|넣지 않)",
        r"난이도|\[하\]|\[중\]|\[상\]",
        kind == "workbook",
    )
    header_time = _flag(raw, "", r"제한\s*시간", False)
    header_score = _flag(raw, "", r"총점|100\s*점", False)
    separate_sheet = _flag(raw, "", r"답안지|OMR", False)
    has_commentary = "해설" in raw
    student_fields = [name for name in ("반", "번호", "이름") if name in raw]

    if kind == "workbook":
        student_fields = []
        if re.search(r"배점[^\n]{0,16}(적지 않|숨|넣지 않|표시하지)", raw):
            show_points = False
    if kind == "mock":
        show_difficulty = False
        show_concept = False if re.search(r"개념 카드[^\n]{0,24}넣지 않", raw) else show_concept
        if re.search(r"함정은[^\n]{0,24}해설", raw):
            show_trap = False

    return {
        "kind": kind,
        "choiceStyle": "circled" if re.search(r"[①②③④⑤]", raw) else "circled",
        "choiceCount": choice_count if choice_count >= 2 else 5,
        "showConceptCard": show_concept if kind == "workbook" else False,
        "showCaution": bool(re.search(r"\[주의\]|주의", raw)) and kind == "workbook" and show_concept,
        "showTrapOnItem": bool(show_trap) and kind == "workbook",
        "showPointsOnItem": bool(show_points) and kind == "mock",
        "showDifficulty": bool(show_difficulty) and kind == "workbook",
        "headerTime": bool(header_time) if kind == "mock" else False,
        "headerScore": bool(header_score) if kind == "mock" else False,
        "separateAnswerSheet": bool(separate_sheet) if kind == "mock" else False,
        "separateCommentary": kind == "mock" and has_commentary,
        "solutionCollapsed": kind == "workbook" and has_commentary,
        "groupByUnit": kind == "workbook",
        "representativeFirst": ("대표" in raw) or kind == "workbook",
        "endAnswerKey": kind == "workbook",
        "studentFields": student_fields if kind == "mock" else [],
        "normalizeScore": 100 if kind == "mock" and header_score else None,
        "variantLabel": "홀수형" if kind == "mock" and "홀수형" in raw else "",
        "shape": "round",
    }


def load_custom() -> dict:
    if not CUSTOM_PATH.exists():
        return {}
    try:
        data = json.loads(CUSTOM_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def save_custom(data: dict) -> None:
    CUSTOM_PATH.parent.mkdir(parents=True, exist_ok=True)
    CUSTOM_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def merge_profiles(base: dict, extra: dict) -> dict:
    """나중에 배운 형식은 기존 규칙 위에 더한다. 원문은 합치지 않는다."""
    merged = dict(base)
    for key, value in extra.items():
        if key in BOOL_KEYS and isinstance(value, bool):
            merged[key] = bool(merged.get(key)) or value
        elif key == "choiceCount":
            merged[key] = max(int(merged.get(key) or 0), int(value or 0))
        elif key == "studentFields" and isinstance(value, list):
            fields = []
            for name in [*(merged.get(key) or []), *value]:
                if name not in fields:
                    fields.append(name)
            merged[key] = fields
        elif key == "variantLabel" and value:
            merged[key] = value
        elif key == "normalizeScore" and value:
            merged[key] = value
        elif key == "choiceStyle" and value:
            merged[key] = value
        elif key == "shape":
            merged[key] = "round"
    merged["kind"] = base["kind"]
    return merged


def get_styles() -> dict:
    styles = {
        "workbook": learn_text("workbook", read_exemplar("workbook")),
        "mock": learn_text("mock", read_exemplar("mock")),
    }
    custom = load_custom()
    for kind in ("workbook", "mock"):
        extra = custom.get(kind)
        if isinstance(extra, dict):
            styles[kind] = merge_profiles(styles[kind], extra)
    return styles


def summarize(style: dict) -> list:
    lines = []
    if style.get("showConceptCard"):
        lines.append("단원 앞에 둥근 개념 카드를 붙입니다.")
    else:
        lines.append("시험지에는 개념 카드를 넣지 않습니다.")
    if style.get("kind") == "workbook" and style.get("representativeFirst"):
        lines.append("대표 유형을 앞에 두고, 비슷한 문제를 난이도 순으로 잇습니다.")
    if style.get("showDifficulty"):
        lines.append("문항 난이도를 점 세 개로 보여 줍니다.")
    if style.get("showTrapOnItem"):
        lines.append("함정은 문항 아래 짧은 메모로 둡니다.")
    elif style.get("kind") == "mock":
        lines.append("함정과 풀이는 해설지에만 둡니다.")
    if style.get("showPointsOnItem"):
        lines.append("문항마다 배점을 적고, 총점은 100점으로 맞춥니다.")
    if style.get("headerTime"):
        lines.append("제한 시간을 시험지 머리에 적습니다.")
    if style.get("separateAnswerSheet"):
        lines.append("OMR형 답안지를 시험지와 분리합니다.")
    if style.get("variantLabel"):
        lines.append("홀수형 표기를 달아 모의고사 표지를 만듭니다.")
    if style.get("choiceStyle") == "circled":
        lines.append("선지는 ①부터 ⑤까지 동그란 번호로 둡니다.")
    if style.get("solutionCollapsed"):
        lines.append("풀이는 접어 두고, 필요할 때 펼칩니다.")
    lines.append("카드, 버튼, 답안 칸은 둥근 모서리로 조판합니다.")
    return lines


def style_payload() -> dict:
    styles = get_styles()
    return {
        kind: {"profile": styles[kind], "summary": summarize(styles[kind])}
        for kind in ("workbook", "mock")
    }


def learn(kind: str, text: str) -> dict:
    raw = (text or "").strip()
    if len(raw) > 20000:
        raise ValueError("형식 예시는 2만 자 안으로 붙여 주세요.")
    if len(raw) < 8:
        raise ValueError("형식 예시를 조금 더 붙여 주세요.")
    extracted = learn_text(kind, raw)
    custom = load_custom()
    custom[kind] = extracted
    save_custom(custom)
    return style_payload()


def reset_custom() -> dict:
    if CUSTOM_PATH.exists():
        CUSTOM_PATH.unlink()
    return style_payload()


def catalog(bank=None) -> dict:
    bank = validate_bank(bank)
    subjects = []
    units = {}
    for item in bank:
        subject = item["subject"]
        if subject not in units:
            units[subject] = []
            subjects.append({"subject": subject, "grade": item["grade"], "units": units[subject]})
        if item["unit"] not in units[subject]:
            units[subject].append(item["unit"])
    return {"subjects": subjects}


def _minutes(count: int) -> int:
    rounded = int(round((count * 2) / 5.0) * 5)
    return max(10, rounded)


def scale_points(items: list, total: int = 100) -> list:
    count = len(items)
    if count == 0:
        return []
    bases = [max(1, int(item.get("basePoints") or 2)) for item in items]
    weight = sum(bases)
    raw = [base * total / weight for base in bases]
    points = [int(value) for value in raw]
    leftover = total - sum(points)
    order = sorted(range(count), key=lambda i: (raw[i] - points[i], bases[i]), reverse=True)
    for step in range(leftover):
        points[order[step % count]] += 1
    return points


def pick_workbook(pool: list, units: list, count: int) -> dict:
    grouped = {unit: [] for unit in units}
    for item in pool:
        grouped[item["unit"]].append(item)
    ordered = {}
    for unit in units:
        reps = [item for item in grouped[unit] if item.get("role") == "representative"]
        rest = [item for item in grouped[unit] if item.get("role") != "representative"]
        rest.sort(key=lambda item: (DIFF_RANK[item["difficulty"]], item["id"]))
        ordered[unit] = reps + rest
    picked = {unit: [] for unit in units}
    left = count
    layer = 0
    while left > 0:
        moved = False
        for unit in units:
            if layer < len(ordered[unit]) and left > 0:
                picked[unit].append(ordered[unit][layer])
                left -= 1
                moved = True
        if not moved:
            break
        layer += 1
    return picked


def pick_mock(pool: list, count: int, rng: random.Random) -> list:
    buckets = {"하": [], "중": [], "상": []}
    for item in pool:
        buckets[item["difficulty"]].append(item)
    for level in buckets:
        buckets[level].sort(key=lambda item: item["id"])
        rng.shuffle(buckets[level])
    low = round(count * 0.3)
    mid = round(count * 0.5)
    high = count - low - mid
    if high < 0:
        mid = max(0, mid + high)
        high = 0
    targets = {"하": low, "중": mid, "상": high}
    picked = []
    for level in ("하", "중", "상"):
        take = buckets[level][: targets[level]]
        picked.extend(take)
        del buckets[level][: targets[level]]
    if len(picked) < count:
        rest = [item for level in ("하", "중", "상") for item in buckets[level]]
        rng.shuffle(rest)
        picked.extend(rest[: count - len(picked)])
    rng.shuffle(picked)
    return picked[:count]


def _mark(number: int) -> str:
    if 1 <= number <= len(CIRCLED):
        return CIRCLED[number - 1]
    return str(number)


def _concept(items: list, style: dict):
    if not style.get("showConceptCard"):
        return None
    host = next((item for item in items if item.get("role") == "representative" and item.get("concept")), None)
    if host is None:
        host = next((item for item in items if item.get("concept")), None)
    if host is None:
        return None
    card = {"title": host.get("conceptTitle") or host["unit"], "body": host["concept"]}
    if style.get("showCaution") and host.get("caution"):
        card["caution"] = host["caution"]
    return card


def _present(item: dict, number: int, style: dict, points: int) -> dict:
    objective = item["type"] == "objective"
    answer_label = _mark(int(item["answer"])) if objective else str(item.get("answerText") or "")
    answer_text = item["choices"][int(item["answer"]) - 1] if objective else str(item.get("answerText") or "")
    tag = None
    if style.get("groupByUnit"):
        tag = "대표 유형" if item.get("role") == "representative" else "유사 문제"
    face = {
        "stem": item["stem"],
        "type": item["type"],
        "choices": item["choices"] if objective else [],
        "choiceStyle": style.get("choiceStyle") or "circled",
        "points": points if style.get("showPointsOnItem") else None,
        "difficulty": item["difficulty"] if style.get("showDifficulty") else None,
        "tag": tag,
        "trap": item["trap"] if style.get("showTrapOnItem") else None,
    }
    commentary = {
        "answerLabel": answer_label,
        "answerText": answer_text,
        "solution": item["solution"],
        "trap": item["trap"],
        "unit": item["unit"],
        "points": points,
    }
    sheet = {
        "no": number,
        "type": item["type"],
        "label": answer_label,
        "points": points,
    }
    return {"no": number, "id": item["id"], "face": face, "commentary": commentary, "sheet": sheet}


def generate(mode: str, subject: str, units=None, count: int = 8, seed: int = 1, styles=None) -> dict:
    if mode not in ("workbook", "mock"):
        raise ValueError("문제집 또는 모의고사를 골라 주세요.")
    if not subject:
        raise ValueError("과목을 골라 주세요.")
    try:
        count = int(count)
        seed = int(seed)
    except (TypeError, ValueError):
        raise ValueError("문항 수와 시드는 숫자여야 합니다.")
    count = max(1, min(count, 30))
    bank = validate_bank()
    styles = styles or get_styles()
    style = styles[mode]
    subject_items = [item for item in bank if item["subject"] == subject]
    if not subject_items:
        raise ValueError("과목을 찾지 못했습니다.")
    available = []
    for item in subject_items:
        if item["unit"] not in available:
            available.append(item["unit"])
    if units:
        unknown = [unit for unit in units if unit not in available]
        if unknown:
            raise ValueError("단원을 찾지 못했습니다.")
        use_units = [unit for unit in available if unit in set(units)]
    else:
        use_units = available
    if not use_units:
        raise ValueError("단원을 하나 이상 골라 주세요.")
    pool = [item for item in subject_items if item["unit"] in use_units]
    notices = []
    rng = random.Random(seed)

    if mode == "workbook":
        picked_map = pick_workbook(pool, use_units, count)
        flat = [item for unit in use_units for item in picked_map[unit]]
    else:
        flat = pick_mock(pool, count, rng)
        picked_map = {"문항": flat}
        use_units = ["문항"]

    if len(flat) < count:
        notices.append(
            f"이 범위에는 문제가 {len(flat)}문항 있어서, 요청한 {count}문항 중 {len(flat)}문항만 넣었습니다."
        )

    points = scale_points(flat, 100) if style.get("normalizeScore") else [int(item.get("basePoints") or 2) for item in flat]
    point_by_id = {item["id"]: points[index] for index, item in enumerate(flat)}

    sections = []
    number = 1
    sheets = []
    for unit in use_units:
        items = picked_map[unit]
        if not items:
            continue
        presented = []
        for item in items:
            row = _present(item, number, style, point_by_id[item["id"]])
            presented.append(row)
            sheets.append(row["sheet"])
            number += 1
        section = {
            "unit": unit if mode == "workbook" else "",
            "concept": _concept(items, style),
            "items": presented,
        }
        sections.append(section)

    grade = subject_items[0]["grade"]
    if mode == "workbook":
        title = f"{grade} {subject} 기말 대비 유형서"
    else:
        title = f"{grade} {subject} 기말 모의고사"

    return {
        "mode": mode,
        "title": title,
        "subject": subject,
        "grade": grade,
        "variant": style.get("variantLabel") or "",
        "minutes": _minutes(len(flat)) if style.get("headerTime") else None,
        "totalPoints": 100 if style.get("headerScore") else None,
        "studentFields": list(style.get("studentFields") or []),
        "shape": "round",
        "sections": sections,
        "answerSheet": sheets if style.get("separateAnswerSheet") else [],
        "showCommentary": bool(style.get("separateCommentary")),
        "solutionCollapsed": bool(style.get("solutionCollapsed")),
        "endAnswerKey": bool(style.get("endAnswerKey")),
        "notices": notices,
        "styleSummary": summarize(style),
        "questionCount": len(flat),
    }
