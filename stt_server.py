#uvicorn stt_server:app --host 0.0.0.0 --port 8000
import os
import csv
import io
import uuid
import time
import shutil
import zipfile
import tempfile
from pathlib import Path
from datetime import datetime
from threading import Lock

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from faster_whisper import WhisperModel


# ============================================================
# 기본 설정
# ============================================================

ADMIN_PASSWORD = "0302"

BASE_DIR = Path(__file__).resolve().parent

KIOSK_HTML = BASE_DIR / "kiosk.html"

COLLECT_DIR = BASE_DIR / "voice_collection_data"
COLLECT_AUDIO_DIR = COLLECT_DIR / "audio"
COLLECT_META_CSV = COLLECT_DIR / "metadata.csv"

COLLECT_AUDIO_DIR.mkdir(parents=True, exist_ok=True)

RAW_DATASET_DIR = BASE_DIR / "kiosk_training_data"
RAW_AUDIO_DIR = RAW_DATASET_DIR / "audio"
RAW_METADATA_CSV = RAW_DATASET_DIR / "metadata_raw.csv"

RAW_AUDIO_DIR.mkdir(parents=True, exist_ok=True)

MODELS_DIR = BASE_DIR / "models"
ACTIVE_MODEL_DIR = MODELS_DIR / "whisper-kiosk-ct2-int8"

MODELS_DIR.mkdir(parents=True, exist_ok=True)

CPU_THREADS = int(os.environ.get("WHISPER_CPU_THREADS", "4"))

DEFAULT_MODEL_PATH = str(ACTIVE_MODEL_DIR) if ACTIVE_MODEL_DIR.exists() else "base"
MODEL_PATH = os.environ.get("WHISPER_MODEL", DEFAULT_MODEL_PATH)

model_lock = Lock()


# ============================================================
# FastAPI
# ============================================================

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Whisper Prompt
# ============================================================

INITIAL_PROMPT = (
    "이 음성은 한국어 음식점 키오스크 주문 및 키오스크 조작 명령입니다. "
    "사용자는 메뉴명, 수량, 옵션, 결제 방식, 장소 선택, 화면 제어, 도움 요청을 짧게 말합니다. "

    "메뉴는 돼지국밥, 순대국밥, 소고기국밥, 수육 백반, 한우 불고기, 불고기 덮밥, "
    "치즈버거, 불고기버거, 아메리카노, 카페라떼, 딸기 라떼, 오렌지 주스, "
    "레몬 에이드, 쿠키 쉐이크, 콜라, 사이다, 치즈 케이크, 소프트 아이스크림입니다. "

    "카테고리는 국밥, 불고기, 햄버거, 커피, 음료, 디저트입니다. "

    "자주 나오는 주문 명령은 주문 시작, 메뉴판 보여줘, 추천해줘, 한 개, 두 개, 세 개, "
    "매장, 포장, 카드, 현금, 결제, 추가, 취소, 이전 화면, 처음으로입니다. "

    "화면 제어 명령은 화면 확대, 글씨 크게, 안 보여, 잘 안 보여, 아래 보여줘, 밑에 보여줘, "
    "원래대로, 화면 축소, 확대 해제입니다. "

    "소리 제어 명령은 소리 크게, 안 들려, 잘 안 들려, 소리 작게, 음소거입니다. "

    "도움 요청 표현은 사용법 알려줘, 이게 뭐야, 어떻게 대답하라고, 뭐라고 말하면 돼, "
    "다시 설명해줘, 메뉴 다시 말해줘, 한 번 더 말해줘입니다. "

    "장소 선택은 매장, 여기서 먹을게요, 먹고 갈게요, 포장, 들고 갈게요, 가져갈게요로 인식하세요. "
    "결제 방식은 카드, 신용카드, 체크카드, 현금, 현찰로 인식하세요. "

    "아메리카노를 아니요로 착각하지 마세요. "
    "아니요, 아니야, 아뇨는 부정 표현입니다. "
    "아메리카노, 카페라떼, 치즈 케이크, 소프트 아이스크림은 메뉴명입니다. "

    "치즈 케이크와 소프트 아이스크림은 서로 다른 메뉴입니다. "
    "케이크, 케익, 치즈케익이라고 들리면 치즈 케이크로 인식하세요. "
    "아이스크림, 소프트콘이라고 들리면 소프트 아이스크림으로 인식하세요. "
)


# ============================================================
# 모델 로딩
# ============================================================

def load_whisper_model(model_path: str):
    print(f"[STT] Loading model: {model_path}")
    print(f"[STT] CPU threads: {CPU_THREADS}")

    return WhisperModel(
        model_path,
        device="cpu",
        compute_type="int8",
        cpu_threads=CPU_THREADS,
        num_workers=1
    )


model = load_whisper_model(MODEL_PATH)


def reload_whisper_model(model_path: str):
    global model
    global MODEL_PATH

    print(f"[STT] Reloading model: {model_path}")
    new_model = load_whisper_model(model_path)

    MODEL_PATH = model_path
    model = new_model

    print(f"[STT] Model reloaded: {MODEL_PATH}")


# ============================================================
# 공통 유틸
# ============================================================

def check_password(password: str):
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="wrong password")


def normalize_kiosk_text(text: str) -> str:
    text = (text or "").strip()

    replacements = [
        # 메뉴명 보정
        ("아메리카 너", "아메리카노"),
        ("아메리카 노", "아메리카노"),
        ("아메리가노", "아메리카노"),
        ("아메리카노우", "아메리카노"),

        ("카페 라테", "카페라떼"),
        ("카페 라떼", "카페라떼"),
        ("까페라떼", "카페라떼"),
        ("까페 라떼", "카페라떼"),

        ("돼지 국밥", "돼지국밥"),
        ("순대 국밥", "순대국밥"),
        ("소고기 국밥", "소고기국밥"),

        ("불고기 보거", "불고기버거"),
        ("불고기 버거", "불고기버거"),
        ("치즈 보거", "치즈버거"),
        ("치즈 버거", "치즈버거"),

        ("오랜지", "오렌지"),
        ("쥬스", "주스"),
        ("레모네이드", "레몬 에이드"),
        ("싸이다", "사이다"),

        ("치즈 케익", "치즈 케이크"),
        ("치즈케익", "치즈 케이크"),
        ("치즈 케잌", "치즈 케이크"),
        ("치즈케잌", "치즈 케이크"),

        ("소포트 아이스크림", "소프트 아이스크림"),
        ("소프트콘", "소프트 아이스크림"),

        # 결제어 보정
        ("결재", "결제"),
        ("카도로", "카드로"),
        ("카도", "카드"),
        ("현끔", "현금"),
        ("현찰", "현금"),

        # 화면 제어 보정
        ("원래데로", "원래대로"),
        ("원레대로", "원래대로"),
        ("확대 해재", "확대 해제"),
        ("확대해재", "확대 해제"),
        ("글자 크게", "글씨 크게"),
        ("글씨 키워", "글씨 크게"),
        ("글자 키워", "글씨 크게"),
        ("안보여", "안 보여"),
        ("잘안보여", "잘 안 보여"),

        # 소리 제어 보정
        ("안들려", "안 들려"),
        ("잘안들려", "잘 안 들려"),
        ("소리 키워", "소리 크게"),
        ("소리켜줘", "소리 크게"),
        ("소리 올려", "소리 크게"),
        ("소리 줄여", "소리 작게"),
        ("소리 낮춰", "소리 작게"),

        # 이동/복구 보정
        ("이전으로", "이전 화면"),
        ("뒤로가", "이전 화면"),
        ("뒤로 가", "이전 화면"),
        ("전화면", "이전 화면"),
        ("처음 화면", "처음으로"),
        ("처음부터", "처음으로"),

        # 장소 선택 보정
        ("매장으로", "매장"),
        ("여기서 먹을게", "매장"),
        ("먹고 갈게", "매장"),
        ("먹고갈게", "매장"),
        ("안에서 먹을게", "매장"),

        ("포장해줘", "포장"),
        ("포장할게", "포장"),
        ("들고갈게", "포장"),
        ("들고 갈게", "포장"),
        ("가져갈게", "포장"),
        ("테이크 아웃", "테이크아웃"),

        # 도움말/질문 보정
        ("뭐라고 대답해", "어떻게 대답하라고"),
        ("뭐라고 말해", "뭐라고 말하면 돼"),
        ("어떻게 말해", "뭐라고 말하면 돼"),
        ("다시 말해", "다시 설명해줘"),
        ("한번 더", "한 번 더"),
    ]

    for wrong, right in replacements:
        text = text.replace(wrong, right)

    return text


def is_repeated_hallucination(text: str) -> bool:
    text = (text or "").strip()

    if not text:
        return True

    words = text.split()

    if len(words) >= 8:
        counts = {}

        for word in words:
            counts[word] = counts.get(word, 0) + 1

        max_count = max(counts.values())

        if max_count / len(words) >= 0.7:
            return True

    no_space = text.replace(" ", "")

    repeated_tokens = ["네", "예", "응", "음", "어"]

    for token in repeated_tokens:
        if len(no_space) >= len(token) * 5:
            repeat_count = len(no_space) // len(token)

            if no_space == token * repeat_count:
                return True

    return False


def save_raw_training_sample(audio_bytes: bytes, whisper_text: str) -> str:
    sample_id = datetime.now().strftime("%Y%m%d_%H%M%S") + "_" + uuid.uuid4().hex[:8]

    audio_filename = f"{sample_id}.webm"
    audio_path = RAW_AUDIO_DIR / audio_filename

    with open(audio_path, "wb") as f:
        f.write(audio_bytes)

    is_new_file = not RAW_METADATA_CSV.exists()

    with open(RAW_METADATA_CSV, "a", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "id",
                "audio",
                "whisper_text",
                "correct_text",
                "created_at"
            ]
        )

        if is_new_file:
            writer.writeheader()

        writer.writerow({
            "id": sample_id,
            "audio": str(audio_path.resolve()).replace("\\", "/"),
            "whisper_text": whisper_text or "",
            "correct_text": "",
            "created_at": datetime.now().isoformat(timespec="seconds")
        })

    return sample_id


COLLECT_FIELDNAMES = [
    "id",
    "filename",
    "participant",
    "sentence",
    "intent",
    "menu",
    "quantity",
    "action",
    "domain",
    "condition",
    "dialect",
    "round_index",
    "created_at",
    "user_agent"
]


def ensure_collection_header():
    if not COLLECT_META_CSV.exists():
        with open(COLLECT_META_CSV, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=COLLECT_FIELDNAMES)
            writer.writeheader()
        return

    with open(COLLECT_META_CSV, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        old_fields = reader.fieldnames or []
        rows = list(reader)

    if old_fields == COLLECT_FIELDNAMES:
        return

    migrated_rows = []

    for row in rows:
        migrated = {}

        for field in COLLECT_FIELDNAMES:
            migrated[field] = row.get(field, "")

        if not migrated.get("intent"):
            migrated["intent"] = "UNKNOWN"

        migrated_rows.append(migrated)

    backup_path = COLLECT_META_CSV.with_suffix(".backup.csv")
    shutil.copyfile(COLLECT_META_CSV, backup_path)

    with open(COLLECT_META_CSV, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=COLLECT_FIELDNAMES)
        writer.writeheader()
        writer.writerows(migrated_rows)

    print(f"[COLLECT] metadata migrated. backup={backup_path}")


def append_collection_metadata(row: dict):
    ensure_collection_header()

    with open(COLLECT_META_CSV, "a", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=COLLECT_FIELDNAMES,
            extrasaction="ignore"
        )
        writer.writerow(row)


def find_ct2_model_dir(root: Path) -> Path:
    candidates = []

    for path in root.rglob("model.bin"):
        candidates.append(path.parent)

    if not candidates:
        raise FileNotFoundError(
            "model.bin을 찾을 수 없습니다. 올바른 whisper-kiosk-ct2-int8.zip이 아닙니다."
        )

    return candidates[0]


# ============================================================
# 기본 / 키오스크
# ============================================================

@app.get("/")
def health_check():
    return {
        "status": "ok",
        "model": MODEL_PATH,
        "cpu_threads": CPU_THREADS
    }


@app.get("/kiosk.html")
def serve_kiosk_html():
    if not KIOSK_HTML.exists():
        raise HTTPException(status_code=404, detail="kiosk.html not found")

    return FileResponse(KIOSK_HTML)


@app.get("/kiosk")
def serve_kiosk_alias():
    if not KIOSK_HTML.exists():
        raise HTTPException(status_code=404, detail="kiosk.html not found")

    return FileResponse(KIOSK_HTML)


@app.get("/favicon.ico")
def favicon():
    return {"ok": True}


# ============================================================
# STT API
# ============================================================

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    start_time = time.time()

    suffix = ".webm"

    if file.filename:
        _, ext = os.path.splitext(file.filename)

        if ext:
            suffix = ext

    audio_bytes = await file.read()

    if not audio_bytes:
        return {
            "text": "",
            "error": "empty audio"
        }

    tmp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        with model_lock:
            segments, info = model.transcribe(
                tmp_path,
                language="ko",
                task="transcribe",
                beam_size=3,
                best_of=3,
                vad_filter=True,
                vad_parameters={
                    "min_silence_duration_ms": 500,
                    "speech_pad_ms": 200
                },
                initial_prompt=INITIAL_PROMPT,
                condition_on_previous_text=False,
                temperature=0.0,
                compression_ratio_threshold=2.4,
                log_prob_threshold=-1.0,
                no_speech_threshold=0.6,
                without_timestamps=True
            )

        text = " ".join([segment.text for segment in segments]).strip()
        text = normalize_kiosk_text(text)

        elapsed = round(time.time() - start_time, 3)

        if is_repeated_hallucination(text):
            print(f"[STT] repeated hallucination ignored: {text} / elapsed={elapsed}s")

            return {
                "text": "",
                "language": info.language,
                "duration": info.duration,
                "elapsed": elapsed,
                "filtered": "repeated_hallucination"
            }

        sample_id = save_raw_training_sample(audio_bytes, text)

        print(f"[STT] text={text} / elapsed={elapsed}s / sample_id={sample_id}")

        return {
            "text": text,
            "language": info.language,
            "duration": info.duration,
            "elapsed": elapsed,
            "sample_id": sample_id
        }

    except Exception as e:
        elapsed = round(time.time() - start_time, 3)

        print(f"[STT ERROR] {str(e)} / elapsed={elapsed}s")

        return {
            "text": "",
            "error": str(e),
            "elapsed": elapsed
        }

    finally:
        if tmp_path:
            try:
                os.remove(tmp_path)
            except Exception:
                pass


# ============================================================
# 수집 앱 HTML
# ============================================================

COLLECT_HTML = r"""
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>키오스크 음성 수집</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body{
    font-family:system-ui,"Noto Sans KR",sans-serif;
    background:#f5ead7;
    margin:0;
    padding:18px;
    color:#3f3326;
}
.app{
    max-width:720px;
    margin:auto;
    background:white;
    border-radius:24px;
    padding:22px;
    box-shadow:0 20px 50px #0002;
}
input,button{
    font-size:18px;
    padding:14px;
    border-radius:14px;
    margin:6px 0;
}
input{
    width:100%;
    border:2px solid #d8b98e;
    box-sizing:border-box;
}
button{
    border:0;
    background:#e76f51;
    color:white;
    font-weight:900;
    cursor:pointer;
}
button:disabled{
    opacity:.5;
    cursor:not-allowed;
}
.box{
    background:#fff8ec;
    border-radius:18px;
    padding:16px;
    margin:12px 0;
}
.sentence{
    font-size:30px;
    font-weight:900;
    line-height:1.25;
}
.meta{
    display:flex;
    gap:8px;
    flex-wrap:wrap;
    margin:10px 0;
}
.badge{
    background:#ffe2bd;
    border-radius:999px;
    padding:8px 12px;
    font-weight:900;
    font-size:14px;
}
.condition,.dialect{
    font-size:18px;
    font-weight:800;
    background:#fde7cf;
    border-radius:14px;
    padding:10px;
    margin-top:8px;
}
.dialect{
    background:#e8f3e8;
}
.hidden{
    display:none;
}
audio{
    width:100%;
    margin-top:10px;
}
.small{
    color:#7c6b58;
    font-size:14px;
}
</style>
</head>
<body>
<div class="app">
<h1>키오스크 음성 학습 수집</h1>
<p>주문 문장, 키오스크 기능어, 도움 요청, 일반 대화를 다양하게 수집합니다.</p>

<div id="loginBox" class="box">
<p>비밀번호: 0302</p>
<input id="passwordInput" type="password" placeholder="비밀번호">
<input id="participantInput" placeholder="이름 또는 닉네임">
<button onclick="login()">시작하기</button>
</div>

<div id="taskBox" class="hidden">
<div id="counterText">0개 완료</div>

<div class="box">
<div>읽을 문장</div>
<div class="sentence" id="sentenceText"></div>

<div class="meta">
<span class="badge" id="intentBadge">INTENT</span>
<span class="badge" id="domainBadge">DOMAIN</span>
<span class="badge" id="menuBadge">MENU</span>
<span class="badge" id="quantityBadge">QTY</span>
</div>

<div>말하는 조건</div>
<div class="condition" id="conditionText"></div>

<div>말투/사투리 조건</div>
<div class="dialect" id="dialectText"></div>

<div class="small">
같은 문장은 한 바퀴 동안 다시 나오지 않습니다. 다른 문장을 누르면 다음 고유 문장으로 넘어갑니다.
</div>
</div>

<button onclick="speakPrompt()">문장 읽어주기</button>
<button id="recordBtn" onclick="startRecording()">녹음 시작</button>
<button id="stopBtn" onclick="stopRecording()" disabled>녹음 종료</button>
<audio id="playback" controls class="hidden"></audio>
<br>
<button id="uploadBtn" onclick="uploadRecording()" disabled>서버에 업로드</button>
<button onclick="nextTask()">다른 문장</button>
<div id="statusText">대기 중</div>
</div>
</div>

<script>
const PASSWORD_KEY="kiosk_collect_password";
const PARTICIPANT_KEY="kiosk_collect_participant";

let password="";
let participant="";
let completedCount=0;
let roundIndex=0;

let currentSentence="";
let currentIntent="";
let currentMenu="";
let currentQuantity="";
let currentAction="";
let currentDomain="";
let currentCondition="";
let currentDialect="";

let mediaStream=null;
let recorder=null;
let chunks=[];
let recordedBlob=null;

const REPEAT_PER_SENTENCE = 1;

const menuItems = [
    { name:"돼지국밥", category:"soup" },
    { name:"순대국밥", category:"soup" },
    { name:"소고기국밥", category:"soup" },
    { name:"수육 백반", category:"meal" },
    { name:"한우 불고기", category:"meal" },
    { name:"불고기 덮밥", category:"meal" },

    { name:"치즈버거", category:"burger" },
    { name:"불고기버거", category:"burger" },

    { name:"아메리카노", category:"coffee" },
    { name:"카페라떼", category:"coffee" },
    { name:"딸기 라떼", category:"latte" },

    { name:"오렌지 주스", category:"juice" },
    { name:"레몬 에이드", category:"ade" },
    { name:"쿠키 쉐이크", category:"shake" },
    { name:"콜라", category:"soda" },
    { name:"사이다", category:"soda" },

    { name:"치즈 케이크", category:"dessert" },
    { name:"소프트 아이스크림", category:"icecream" }
];

const quantities = [
    ["한 개", "1"],
    ["하나", "1"],
    ["1개", "1"],
    ["두 개", "2"],
    ["둘", "2"],
    ["2개", "2"],
    ["세 개", "3"],
    ["셋", "3"],
    ["3개", "3"],
    ["네 개", "4"],
    ["4개", "4"],
    ["다섯 개", "5"],
    ["5개", "5"]
];

const highQuantities = [
    ["열 개", "10"],
    ["10개", "10"],
    ["50개", "50"],
    ["99개", "99"]
];

const orderTemplates = [
    "{menu} {qty} 주세요",
    "{menu} {qty} 주문할게요",
    "{menu} {qty} 담아 주세요",
    "{menu} {qty} 추가해 주세요",
    "{menu} {qty} 시킬게요",
    "{menu} {qty} 할게요",
    "{menu} {qty} 부탁해요",
    "{menu} {qty} 넣어 주세요"
];

const shortOrderTemplates = [
    "{menu} 주세요",
    "{menu} 추가",
    "{menu} 할게요",
    "{menu} 주문할게요",
    "{menu} 부탁해요"
];

const singleMenuTemplates = [
    "{menu}",
    "{menu}요",
    "{menu} 할게요"
];

const soupMealOptionTemplates = [
    "{menu} 포장해 주세요",
    "{menu} 매장에서 먹을게요",
    "{menu} 덜 맵게 해 주세요",
    "{menu} 맵게 해 주세요",
    "{menu} 밥 적게 주세요",
    "{menu} 밥 많이 주세요",
    "{menu} 국물 많이 주세요"
];

const burgerOptionTemplates = [
    "{menu} 세트로 주세요",
    "{menu} 단품으로 주세요",
    "{menu} 피클 빼 주세요",
    "{menu} 소스 빼 주세요",
    "{menu} 치즈 추가해 주세요",
    "{menu} 양상추 빼 주세요",
    "{menu} 포장해 주세요",
    "{menu} 매장에서 먹을게요"
];

const coffeeOptionTemplates = [
    "{menu} 아이스로 주세요",
    "{menu} 따뜻하게 주세요",
    "{menu} 샷 추가해 주세요",
    "{menu} 시럽 추가해 주세요",
    "{menu} 시럽 빼 주세요",
    "{menu} 200ml로 주세요",
    "{menu} 350ml로 주세요",
    "{menu} 500ml로 주세요",
    "{menu} 얼음 적게 해 주세요",
    "{menu} 얼음 많이 해 주세요",
    "{menu} 연하게 해 주세요",
    "{menu} 진하게 해 주세요"
];

const latteOptionTemplates = [
    "{menu} 아이스로 주세요",
    "{menu} 따뜻하게 주세요",
    "{menu} 샷 추가해 주세요",
    "{menu} 시럽 추가해 주세요",
    "{menu} 시럽 빼 주세요",
    "{menu} 200ml로 주세요",
    "{menu} 350ml로 주세요",
    "{menu} 500ml로 주세요",
    "{menu} 얼음 적게 해 주세요",
    "{menu} 얼음 많이 해 주세요"
];

const coldDrinkOptionTemplates = [
    "{menu} 얼음 적게 해 주세요",
    "{menu} 얼음 많이 해 주세요",
    "{menu} 200ml로 주세요",
    "{menu} 350ml로 주세요",
    "{menu} 500ml로 주세요",
    "{menu} 당도 낮게 해 주세요",
    "{menu} 당도 보통으로 해 주세요",
    "{menu} 당도 높게 해 주세요"
];

const pearlDrinkOptionTemplates = [
    "{menu} 펄 추가해 주세요",
    "{menu} 펄 빼 주세요"
];

const sodaOptionTemplates = [
    "{menu} 얼음 적게 주세요",
    "{menu} 얼음 많이 주세요",
    "{menu} 라지로 주세요",
    "{menu} 미디엄으로 주세요",
    "{menu} 포장해 주세요"
];

const dessertOptionTemplates = [
    "{menu} 포장해 주세요",
    "{menu} 매장에서 먹을게요"
];

const icecreamOptionTemplates = [
    "{menu} 하나 주세요",
    "{menu} 두 개 주세요",
    "{menu} 포장해 주세요",
    "{menu} 컵으로 주세요",
    "{menu} 콘으로 주세요"
];

const modifyTemplates = [
    "{menu} 빼 주세요",
    "{menu} 취소해 주세요",
    "{menu} 하나 더 추가해 주세요",
    "{menu} 두 개로 바꿔 주세요",
    "{menu} 말고 다른 걸로 할게요"
];

const paySentences = [
    "결제할게요",
    "카드로 결제할게요",
    "현금으로 계산할게요",
    "현금으로 결제할게요",
    "주문 완료할게요",
    "이대로 결제해 주세요",
    "계산할게요"
];

const cancelSentences = [
    "주문 취소해 주세요",
    "전체 취소해 주세요",
    "다시 주문할게요",
    "처음부터 다시 할게요",
    "방금 주문 취소해 주세요"
];

const navigationSentences = [
    "주문 시작",
    "바로 주문",
    "주문할게요",
    "이전 화면",
    "이전으로",
    "뒤로",
    "뒤로 가",
    "처음으로",
    "처음 화면",
    "처음부터 다시",
    "국밥 보여줘",
    "불고기 보여줘",
    "햄버거 메뉴 보여줘",
    "커피 메뉴 보여줘",
    "음료 보여줘",
    "디저트 보여줘",
    "화면 확대",
    "글씨 크게",
    "안 보여",
    "아래 보여줘",
    "원래대로",
    "소리 크게",
    "안 들려",
    "소리 작게",
    "사용법 알려줘",
    "메뉴 다시 말해줘",
    "이게 뭐야",
    "네",
    "예",
    "맞아",
    "이대로",
    "아니요",
    "아니야",
    "다시"
];

const categoryCommandSentences = [
    "국밥",
    "국밥 보여줘",
    "국밥 메뉴 보여줘",
    "불고기",
    "불고기 보여줘",
    "불고기 메뉴 보여줘",
    "햄버거",
    "햄버거 보여줘",
    "햄버거 메뉴 보여줘",
    "커피",
    "커피 보여줘",
    "커피 메뉴 보여줘",
    "음료",
    "음료 보여줘",
    "음료 메뉴 보여줘",
    "디저트",
    "디저트 보여줘",
    "디저트 메뉴 보여줘",
    "메뉴판",
    "메뉴판 보여줘",
    "메뉴 보여줘",
    "메뉴 알려줘",
    "뭐 있어요",
    "뭐가 있어요",
    "음식 뭐 있어요",
    "주문할 메뉴 보여줘"
];

const placeSentences = [
    "매장",
    "매장에서",
    "매장에서 먹을게요",
    "여기서 먹을게요",
    "여기서 먹고 갈게요",
    "먹고 갈게요",
    "안에서 먹을게요",
    "포장",
    "포장해 주세요",
    "포장할게요",
    "들고 갈게요",
    "가져갈게요",
    "밖에서 먹을게요",
    "테이크아웃",
    "테이크아웃 할게요"
];

const paymentWordSentences = [
    "결제",
    "결제할게요",
    "계산",
    "계산할게요",
    "이대로 결제",
    "주문 완료",
    "주문 끝",
    "카드",
    "카드로",
    "카드로 결제",
    "신용카드",
    "체크카드",
    "카드 결제할게요",
    "현금",
    "현금으로",
    "현금으로 결제",
    "현찰",
    "돈으로 낼게요"
];

const screenCommandSentences = [
    "화면 확대",
    "화면 확대해줘",
    "글씨 크게",
    "글씨 크게 해줘",
    "글자 크게",
    "글자 크게 해줘",
    "안 보여",
    "잘 안 보여",
    "글씨가 안 보여",
    "메뉴가 안 보여",
    "돋보기",
    "돋보기 켜줘",
    "더 크게 보여줘",
    "아래 보여줘",
    "밑에 보여줘",
    "밑에 안 보여",
    "아래가 안 보여",
    "아랫부분 보여줘",
    "더 아래 보여줘",
    "위로 올려줘",
    "위쪽 보여줘",
    "처음 부분 보여줘",
    "원래대로",
    "화면 원래대로",
    "화면 확대 해제",
    "확대 해제",
    "화면 축소",
    "작게 해줘",
    "글씨 작게",
    "줄여줘"
];

const volumeCommandSentences = [
    "소리 크게",
    "소리 크게 해줘",
    "소리 키워줘",
    "소리 올려줘",
    "잘 안 들려",
    "안 들려",
    "목소리가 작아",
    "더 크게 말해줘",
    "소리 작게",
    "소리 줄여줘",
    "소리 낮춰줘",
    "너무 시끄러워",
    "목소리가 너무 커",
    "음소거",
    "소리 꺼줘",
    "소리 켜줘",
    "음소거 해제"
];

const navigationMoreSentences = [
    "이전",
    "이전 화면",
    "이전으로",
    "뒤로",
    "뒤로 가",
    "뒤로가기",
    "전화면",
    "전 화면",
    "한 단계 전으로",
    "처음",
    "처음으로",
    "처음 화면",
    "처음부터",
    "다시 시작",
    "처음부터 다시 할게요",
    "취소",
    "그만",
    "안 할래요",
    "주문 취소",
    "전체 취소",
    "다시 주문할게요"
];

const repeatGuideSentences = [
    "메뉴 다시 말해줘",
    "메뉴 다시 읽어줘",
    "메뉴판 다시 말해줘",
    "메뉴판 다시 읽어줘",
    "한 번 더 말해줘",
    "다시 말해줘",
    "다시 설명해줘",
    "천천히 말해줘",
    "방금 뭐라고 했어",
    "다시 알려줘"
];

const helpQuestionSentences = [
    "사용법 알려줘",
    "키오스크 사용법 알려줘",
    "키오스크 사용 방식 알려줘",
    "주문 방법 알려줘",
    "어떻게 주문해",
    "어떻게 사용해",
    "처음이라 모르겠어",
    "잘 모르겠어",
    "뭘 해야 돼",
    "뭘 말해야 돼",
    "뭐라고 말하면 돼",
    "어떻게 대답하라고",
    "어떻게 대답해야 돼",
    "여기서 뭐라고 해야 돼",
    "이게 뭐야",
    "이 버튼 뭐야",
    "마이크가 뭐야",
    "장바구니가 뭐야",
    "결제는 어떻게 해",
    "수량은 어떻게 말해",
    "옵션은 어떻게 골라",
    "컵 용량은 뭐야",
    "매장 포장 뭐야",
    "매장하고 포장 중에 뭐라고 해",
    "여기서 먹는 건 뭐라고 말해",
    "들고 가는 건 뭐라고 말해",
    "카드 현금 뭐라고 말해",
    "카드로 하려면 뭐라고 해",
    "현금으로 하려면 뭐라고 해",
    "추천해줘",
    "아무거나 추천해줘",
    "뭐 먹을지 모르겠어",
    "뭐가 맛있어",
    "인기 메뉴 알려줘"
];

const standaloneOptionSentences = [
    "밥",
    "밥 적게",
    "밥 많이",
    "밥 보통",
    "국물 많이",
    "국물 적게",
    "맵게",
    "덜 맵게",
    "순하게",
    "얼큰하게",
    "채소",
    "채소 빼기",
    "채소 많이",
    "피클",
    "피클 빼기",
    "피클 많이",
    "소스",
    "소스 적게",
    "소스 많이",
    "치즈 추가",
    "양파 빼기",
    "토마토 빼기",
    "아이스",
    "차갑게",
    "따뜻하게",
    "핫",
    "얼음",
    "얼음 적게",
    "얼음 많이",
    "얼음 빼기",
    "샷",
    "샷 추가",
    "시럽",
    "시럽 적게",
    "시럽 많이",
    "당도",
    "당도 낮게",
    "당도 높게",
    "휘핑",
    "휘핑 많이",
    "펄",
    "펄 추가",
    "크럼블",
    "크럼블 추가",
    "200ml",
    "이백 밀리리터",
    "350ml",
    "삼백오십 밀리리터",
    "500ml",
    "오백 밀리리터",
    "스몰",
    "미디엄",
    "라지"
];

const positionSelectSentences = [
    "왼쪽",
    "오른쪽",
    "왼쪽 거",
    "오른쪽 거",
    "위에 왼쪽",
    "위에 오른쪽",
    "아래 왼쪽",
    "아래 오른쪽",
    "밑에서 왼쪽",
    "밑에서 오른쪽",
    "첫 번째",
    "두 번째",
    "세 번째",
    "네 번째",
    "1번",
    "2번",
    "3번",
    "4번",
    "마지막",
    "맨 아래",
    "끝에 있는 거"
];

const yesNoSentences = [
    "네",
    "예",
    "넵",
    "옙",
    "맞아",
    "맞습니다",
    "이대로",
    "아니요",
    "아니야",
    "아뇨",
    "틀려",
    "다시",
    "다시 고를게요"
];

const kioskRelatedQuestionSentences = [
    "이 메뉴 무슨 맛이야",
    "이 메뉴 설명해줘",
    "이 메뉴 특징 알려줘",
    "아메리카노 무슨 맛이야",
    "돼지국밥 무슨 맛이야",
    "치즈 케이크 설명해줘",
    "이백 밀리리터가 얼마나 돼",
    "삼백오십 밀리리터가 얼마나 돼",
    "오백 밀리리터가 얼마나 돼"
];

const ignoreSentences = [
    "너 국밥 먹을래",
    "너 뭐 먹을래",
    "엄마 나 뭐 먹지",
    "야 이거 되는 거 맞아",
    "이거 녹음 되고 있냐",
    "마이크 켜졌어",
    "잠깐만 기다려 봐",
    "나 아직 못 정했어",
    "오늘 학교 끝나고 뭐 해",
    "이따가 피시방 갈래",
    "이거 말하면 되는 거야",
    "아니 너 먼저 골라",
    "나는 배 안 고파",
    "아까 먹은 거 또 먹을래",
    "국밥집 갈래",
    "편의점 갈까",
    "집에 가서 먹자",
    "여기 사람 많다",
    "뒤에 사람 기다린다",
    "빨리 골라",
    "이거 카메라 찍히는 거야",
    "소리 너무 작지 않아",
    "내 말 들려",
    "이거 테스트야",
    "아무 말이나 해 봐",
    "너 오늘 뭐 했어",
    "점심 뭐 먹었어",
    "이 메뉴 맛있나",
    "사진 찍지 마",
    "장난치지 마",
    "여기 말고 다른 데 가자",
    "아직 고르는 중이야",
    "나한테 물어보지 마"
];

const extraIgnoreSentences = [
    "나 키오스크 잘 못해",
    "키오스크 어렵다",
    "키오스크 무섭다",
    "뒤에 사람 많다",
    "나중에 주문할게",
    "아직 고르는 중이야",
    "뭐 먹을지 생각 중이야",
    "이거 말하면 주문되는 거야",
    "아직 말하지 마",
    "이 메뉴 맛있어 보여",
    "저 사람 먼저 해도 돼",
    "직원 불러야 하나",
    "어디를 눌러야 하는지 모르겠다"
];

const contextIgnoreTemplates = [
    "너 {menu} 먹을래",
    "나는 {menu} 별로야",
    "{menu} 맛있어 보여",
    "{menu} 먹으러 갈까",
    "어제 {menu} 먹었어",
    "{menu} 말고 다른 데 가자",
    "너는 {menu} 좋아해",
    "집에 {menu} 있어",
    "{menu} 생각난다",
    "{menu} 먹고 싶긴 한데 여기서는 말고",
    "나중에 {menu} 먹자",
    "{menu}는 어제 먹었잖아"
];

const conditions=[
    "평소 목소리로 말하세요.",
    "저음으로 낮게 말하세요.",
    "고음으로 높게 말하세요.",
    "천천히 또박또박 말하세요.",
    "조금 빠르게 말하세요.",
    "작은 목소리로 말하세요.",
    "큰 목소리로 말하세요.",
    "마이크에서 조금 멀리 떨어져 말하세요.",
    "마이크 가까이에서 말하세요.",
    "고개를 왼쪽으로 돌리고 말하세요.",
    "고개를 오른쪽으로 돌리고 말하세요.",
    "피곤한 목소리로 말하세요.",
    "어르신처럼 천천히 말하세요.",
    "의자에 기대서 말하세요."
];

const dialects=[
    "표준어로 말하세요.",
    "경상도 느낌으로 말하세요. 예: 주이소, 맞다, 아이다.",
    "전라도 느낌으로 말하세요. 예: 줘잉, 맞당께, 아니랑께.",
    "충청도 느낌으로 말하세요. 예: 줘유, 맞아유, 아녀유.",
    "어르신 말투로 말하세요.",
    "친구에게 말하듯 자연스럽게 말하세요.",
    "키오스크 앞에서 주문하듯 말하세요.",
    "단어를 또박또박 끊어서 말하세요."
];

function fillTemplate(template, menu, qtyText){
    return template
        .replaceAll("{menu}", menu)
        .replaceAll("{qty}", qtyText || "");
}

function getAllowedOptionTemplates(category){
    if(category === "soup" || category === "meal"){
        return soupMealOptionTemplates;
    }

    if(category === "burger"){
        return burgerOptionTemplates;
    }

    if(category === "coffee"){
        return coffeeOptionTemplates;
    }

    if(category === "latte"){
        return latteOptionTemplates;
    }

    if(category === "juice" || category === "ade" || category === "shake"){
        return coldDrinkOptionTemplates;
    }

    if(category === "soda"){
        return sodaOptionTemplates;
    }

    if(category === "dessert"){
        return dessertOptionTemplates;
    }

    if(category === "icecream"){
        return icecreamOptionTemplates;
    }

    return [];
}

function canUsePearl(category){
    return category === "latte" || category === "ade" || category === "shake";
}

function canUseHighQuantity(category){
    return category === "soda" || category === "dessert" || category === "icecream";
}

function buildPromptBank(){
    const rows=[];
    const seen=new Set();

    function add(sentence, intent, menu="", quantity="", action="", domain="kiosk"){
        sentence=String(sentence).replace(/\s+/g," ").trim();

        if(!sentence) return;

        const key=sentence + "||" + intent;

        if(seen.has(key)) return;

        seen.add(key);

        rows.push({
            sentence,
            intent,
            menu,
            quantity,
            action,
            domain
        });
    }

    for(const item of menuItems){
        const menu = item.name;
        const category = item.category;

        let quantityList = [...quantities];

        if(canUseHighQuantity(category)){
            quantityList = quantityList.concat(highQuantities);
        }

        for(const [qtyText, qtyNum] of quantityList){
            for(const template of orderTemplates){
                add(fillTemplate(template, menu, qtyText), "ORDER", menu, qtyNum, "add", "kiosk");
            }
        }

        for(const template of shortOrderTemplates){
            add(fillTemplate(template, menu, ""), "ORDER", menu, "", "add", "kiosk");
        }

        for(const template of singleMenuTemplates){
            add(fillTemplate(template, menu, ""), "ORDER", menu, "", "select", "kiosk");
        }

        const allowedOptions = getAllowedOptionTemplates(category);

        for(const template of allowedOptions){
            add(fillTemplate(template, menu, ""), "ORDER", menu, "", "option", "kiosk");
        }

        if(canUsePearl(category)){
            for(const template of pearlDrinkOptionTemplates){
                add(fillTemplate(template, menu, ""), "ORDER", menu, "", "option", "kiosk");
            }
        }

        for(const template of modifyTemplates){
            add(fillTemplate(template, menu, ""), "MODIFY", menu, "", "modify", "kiosk");
        }
    }

    for(const sentence of categoryCommandSentences){
        add(sentence, "CONTROL", "", "", "category_or_menu_board", "kiosk");
    }

    for(const sentence of placeSentences){
        add(sentence, "CONTROL", "", "", "place", "kiosk");
    }

    for(const sentence of paymentWordSentences){
        add(sentence, "PAY", "", "", "pay", "kiosk");
    }

    for(const sentence of screenCommandSentences){
        add(sentence, "CONTROL", "", "", "screen", "kiosk");
    }

    for(const sentence of volumeCommandSentences){
        add(sentence, "CONTROL", "", "", "volume", "kiosk");
    }

    for(const sentence of navigationMoreSentences){
        add(sentence, "CONTROL", "", "", "navigation", "kiosk");
    }

    for(const sentence of repeatGuideSentences){
        add(sentence, "CONTROL", "", "", "repeat_guide", "kiosk");
    }

    for(const sentence of helpQuestionSentences){
        add(sentence, "CONTROL", "", "", "help", "kiosk");
    }

    for(const sentence of standaloneOptionSentences){
        add(sentence, "CONTROL", "", "", "option_word", "kiosk");
    }

    for(const sentence of positionSelectSentences){
        add(sentence, "CONTROL", "", "", "position_select", "kiosk");
    }

    for(const sentence of yesNoSentences){
        add(sentence, "CONTROL", "", "", "yes_no", "kiosk");
    }

    for(const sentence of kioskRelatedQuestionSentences){
        add(sentence, "CONTROL", "", "", "kiosk_question", "kiosk");
    }

    for(const sentence of paySentences){
        add(sentence, "PAY", "", "", "pay", "kiosk");
    }

    for(const sentence of cancelSentences){
        add(sentence, "CANCEL", "", "", "cancel", "kiosk");
    }

    for(const sentence of navigationSentences){
        add(sentence, "CONTROL", "", "", "control", "kiosk");
    }

    for(const sentence of ignoreSentences){
        add(sentence, "IGNORE", "", "", "", "non_kiosk");
    }

    for(const sentence of extraIgnoreSentences){
        add(sentence, "IGNORE", "", "", "", "non_kiosk");
    }

    for(const item of menuItems){
        const menu = item.name;

        for(const template of contextIgnoreTemplates){
            add(fillTemplate(template, menu, ""), "IGNORE", menu, "", "", "non_kiosk");
        }
    }

    return rows;
}

function hashString(str){
    let h=2166136261;

    for(let i=0;i<str.length;i++){
        h^=str.charCodeAt(i);
        h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);
    }

    return Math.abs(h>>>0);
}

function seededRandom(seed){
    let t=seed+0x6D2B79F5;

    return function(){
        t+=0x6D2B79F5;
        let r=Math.imul(t^(t>>>15),1|t);
        r^=r+Math.imul(r^(r>>>7),61|r);
        return ((r^(r>>>14))>>>0)/4294967296;
    };
}

function shuffledCopy(arr, seedText){
    const copy=[...arr];
    const rand=seededRandom(hashString(seedText));

    for(let i=copy.length-1;i>0;i--){
        const j=Math.floor(rand()*(i+1));
        [copy[i],copy[j]]=[copy[j],copy[i]];
    }

    return copy;
}

let PROMPT_BANK=[];
let PROMPT_ORDER=[];

function rebuildPromptOrder(){
    PROMPT_BANK=buildPromptBank();
    PROMPT_ORDER=shuffledCopy(PROMPT_BANK, participant || "default");
}

function getTotalTasks(){
    return PROMPT_BANK.length * REPEAT_PER_SENTENCE;
}

function buildTaskByIndex(index){
    if(PROMPT_ORDER.length===0){
        rebuildPromptOrder();
    }

    const zero=index-1;
    const promptIndex=zero % PROMPT_ORDER.length;
    const repeatCycle=Math.floor(zero / PROMPT_ORDER.length);

    if(repeatCycle >= REPEAT_PER_SENTENCE){
        return null;
    }

    const prompt=PROMPT_ORDER[promptIndex];

    const conditionIndex=(promptIndex + repeatCycle) % conditions.length;
    const dialectIndex=(promptIndex * 3 + repeatCycle) % dialects.length;

    return {
        sentence: prompt.sentence,
        intent: prompt.intent,
        menu: prompt.menu,
        quantity: prompt.quantity,
        action: prompt.action,
        domain: prompt.domain,
        condition: conditions[conditionIndex],
        dialect: dialects[dialectIndex]
    };
}

function saveLocalProgress(){
    localStorage.setItem("kiosk_collect_completed_"+participant,String(completedCount));
}

function loadLocalProgress(){
    const v=localStorage.getItem("kiosk_collect_completed_"+participant);
    const n=parseInt(v||"0",10);
    return Number.isNaN(n)?0:n;
}

async function login(){
    password=document.getElementById("passwordInput").value.trim();
    participant=document.getElementById("participantInput").value.trim();

    if(password!=="0302"){
        alert("비밀번호가 틀렸습니다.");
        return;
    }

    if(!participant){
        alert("이름 또는 닉네임을 입력하세요.");
        return;
    }

    localStorage.setItem(PASSWORD_KEY,password);
    localStorage.setItem(PARTICIPANT_KEY,participant);

    rebuildPromptOrder();

    try{
        const res=await fetch(`/api/progress?password=$${encodeURIComponent(password)}&participant=$${encodeURIComponent(participant)}`);

        if(res.ok){
            const data=await res.json();
            completedCount=Number(data.completed||0);
        }else{
            completedCount=loadLocalProgress();
        }
    }catch(e){
        completedCount=loadLocalProgress();
    }

    roundIndex=completedCount+1;

    document.getElementById("loginBox").classList.add("hidden");
    document.getElementById("taskBox").classList.remove("hidden");

    showTask(roundIndex);
}

function showTask(index){
    const totalTasks=getTotalTasks();

    if(index>totalTasks){
        document.getElementById("sentenceText").textContent="모든 녹음이 완료되었습니다.";
        document.getElementById("conditionText").textContent="수고하셨습니다.";
        document.getElementById("dialectText").textContent="종료해도 됩니다.";
        document.getElementById("counterText").textContent=`${totalTasks}개 완료`;
        return;
    }

    const task=buildTaskByIndex(index);

    if(!task){
        document.getElementById("sentenceText").textContent="모든 녹음이 완료되었습니다.";
        document.getElementById("conditionText").textContent="수고하셨습니다.";
        document.getElementById("dialectText").textContent="종료해도 됩니다.";
        document.getElementById("counterText").textContent=`${totalTasks}개 완료`;
        return;
    }

    currentSentence=task.sentence;
    currentIntent=task.intent;
    currentMenu=task.menu;
    currentQuantity=task.quantity;
    currentAction=task.action;
    currentDomain=task.domain;
    currentCondition=task.condition;
    currentDialect=task.dialect;
    roundIndex=index;

    recordedBlob=null;
    chunks=[];

    document.getElementById("sentenceText").textContent=currentSentence;
    document.getElementById("intentBadge").textContent=currentIntent || "UNKNOWN";
    document.getElementById("domainBadge").textContent=currentDomain || "";
    document.getElementById("menuBadge").textContent=currentMenu || "";
    document.getElementById("quantityBadge").textContent=currentQuantity ? ("수량 " + currentQuantity) : "";

    document.getElementById("conditionText").textContent=currentCondition;
    document.getElementById("dialectText").textContent=currentDialect;

    document.getElementById("counterText").textContent=`$${completedCount}개 완료 / 전체 $${totalTasks}개`;
    document.getElementById("statusText").textContent=`${roundIndex}번째 문장입니다.`;

    document.getElementById("recordBtn").disabled=false;
    document.getElementById("stopBtn").disabled=true;
    document.getElementById("uploadBtn").disabled=true;

    const playback=document.getElementById("playback");
    playback.classList.add("hidden");
    playback.src="";

    speakPrompt();
}

function nextTask(){
    showTask(roundIndex+1);
}

function speakPrompt(){
    const text=`읽을 문장입니다. $${currentSentence}. 조건입니다. $${currentCondition}. 말투 조건입니다. ${currentDialect}`;
    const u=new SpeechSynthesisUtterance(text);

    u.lang="ko-KR";
    u.rate=0.95;

    speechSynthesis.cancel();
    speechSynthesis.speak(u);
}

async function startRecording(){
    try{
        chunks=[];
        recordedBlob=null;

        mediaStream=await navigator.mediaDevices.getUserMedia({
            audio:{
                echoCancellation:true,
                noiseSuppression:true,
                autoGainControl:true
            }
        });

        let mimeType="";
        const candidates=[
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/mp4",
            "audio/aac"
        ];

        for(const c of candidates){
            if(MediaRecorder.isTypeSupported(c)){
                mimeType=c;
                break;
            }
        }

        recorder=mimeType ? new MediaRecorder(mediaStream,{mimeType}) : new MediaRecorder(mediaStream);

        recorder.ondataavailable=e=>{
            if(e.data&&e.data.size>0){
                chunks.push(e.data);
            }
        };

        recorder.onstop=()=>{
            recordedBlob=new Blob(chunks,{type:mimeType||"audio/webm"});

            const playback=document.getElementById("playback");
            playback.src=URL.createObjectURL(recordedBlob);
            playback.classList.remove("hidden");

            document.getElementById("uploadBtn").disabled=false;
            document.getElementById("statusText").textContent="녹음 완료. 확인 후 업로드하세요.";

            if(mediaStream){
                mediaStream.getTracks().forEach(t=>t.stop());
            }
        };

        recorder.start();

        document.getElementById("recordBtn").disabled=true;
        document.getElementById("stopBtn").disabled=false;
        document.getElementById("statusText").textContent="녹음 중입니다.";
    }catch(e){
        console.error(e);
        alert("마이크 권한을 허용해주세요.");
    }
}

function stopRecording(){
    if(recorder&&recorder.state==="recording"){
        recorder.stop();
    }

    document.getElementById("recordBtn").disabled=false;
    document.getElementById("stopBtn").disabled=true;
}

async function uploadRecording(){
    if(!recordedBlob){
        alert("녹음 파일이 없습니다.");
        return;
    }

    const formData=new FormData();

    formData.append("password",password);
    formData.append("participant",participant);
    formData.append("sentence",currentSentence);
    formData.append("intent",currentIntent);
    formData.append("menu",currentMenu);
    formData.append("quantity",currentQuantity);
    formData.append("action",currentAction);
    formData.append("domain",currentDomain);
    formData.append("condition",currentCondition);
    formData.append("dialect",currentDialect);
    formData.append("round_index",String(roundIndex));
    formData.append("file",recordedBlob,`recording_${Date.now()}.webm`);

    document.getElementById("statusText").textContent="업로드 중...";

    const res=await fetch("/api/upload",{
        method:"POST",
        body:formData
    });

    if(!res.ok){
        const txt=await res.text();
        console.error(txt);
        alert("업로드 실패");
        document.getElementById("statusText").textContent="업로드 실패";
        return;
    }

    const data=await res.json();

    completedCount=roundIndex;
    saveLocalProgress();

    document.getElementById("statusText").textContent=`업로드 완료: ${data.id}`;

    setTimeout(()=>{
        showTask(roundIndex+1);
    },800);
}

window.addEventListener("load",()=>{
    document.getElementById("passwordInput").value=localStorage.getItem(PASSWORD_KEY)||"";
    document.getElementById("participantInput").value=localStorage.getItem(PARTICIPANT_KEY)||"";
});
</script>
</body>
</html>
"""


# ============================================================
# 관리자 HTML
# ============================================================

COLLECT_ADMIN_HTML = r"""
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>키오스크 음성 수집 관리자</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body{
    font-family:system-ui,"Noto Sans KR",sans-serif;
    background:#f5ead7;
    padding:24px;
    color:#3f3326;
}
.wrap{
    max-width:1200px;
    margin:auto;
    background:white;
    border-radius:24px;
    padding:24px;
}
input{
    padding:12px;
    font-size:16px;
    border-radius:12px;
    border:2px solid #d8b98e;
}
button,a.btn{
    display:inline-block;
    border:0;
    background:#e76f51;
    color:white;
    font-weight:900;
    padding:12px 16px;
    border-radius:999px;
    text-decoration:none;
    cursor:pointer;
    margin:4px;
}
table{
    border-collapse:collapse;
    width:100%;
    margin-top:18px;
    font-size:13px;
}
th,td{
    border-bottom:1px solid #eee;
    padding:8px;
    text-align:left;
    vertical-align:top;
}
th{
    background:#fff4df;
}
</style>
</head>
<body>
<div class="wrap">
<h1>키오스크 음성 수집 관리자</h1>
<input id="pw" type="password" placeholder="비밀번호">
<button onclick="loadList()">목록 보기</button>
<button onclick="downloadZip()">전체 ZIP 다운로드</button>
<div id="summary"></div>
<table>
<thead>
<tr>
<th>ID</th>
<th>참여자</th>
<th>문장</th>
<th>Intent</th>
<th>Menu</th>
<th>Qty</th>
<th>Action</th>
<th>Domain</th>
<th>조건</th>
<th>사투리</th>
<th>Round</th>
<th>시간</th>
<th>파일</th>
</tr>
</thead>
<tbody id="tbody"></tbody>
</table>
</div>

<script>
function getPw(){
    return document.getElementById("pw").value.trim();
}

async function loadList(){
    const pw=getPw();
    const res=await fetch(`/api/list?password=${encodeURIComponent(pw)}`);

    if(!res.ok){
        alert("비밀번호가 틀렸거나 오류입니다.");
        return;
    }

    const data=await res.json();

    document.getElementById("summary").innerHTML=`<h3>총 ${data.count}개</h3>`;

    const tbody=document.getElementById("tbody");
    tbody.innerHTML="";

    for(const row of data.rows.reverse()){
        const filename=(row.filename||"").split("/").pop().split("\\\\").pop();

        const tr=document.createElement("tr");

        tr.innerHTML=`
<td>${row.id||""}</td>
<td>${row.participant||""}</td>
<td>${row.sentence||""}</td>
<td>${row.intent||""}</td>
<td>${row.menu||""}</td>
<td>${row.quantity||""}</td>
<td>${row.action||""}</td>
<td>${row.domain||""}</td>
<td>${row.condition||""}</td>
<td>${row.dialect||""}</td>
<td>${row.round_index||""}</td>
<td>${row.created_at||""}</td>
<td><a class="btn" href="/download/audio/$${filename}?password=$${encodeURIComponent(pw)}">다운</a></td>
`;

        tbody.appendChild(tr);
    }
}

function downloadZip(){
    const pw=getPw();

    if(!pw){
        alert("비밀번호를 입력하세요.");
        return;
    }

    location.href=`/download/all.zip?password=${encodeURIComponent(pw)}`;
}
</script>
</body>
</html>
"""


# ============================================================
# 수집 앱 API
# ============================================================

@app.get("/collect", response_class=HTMLResponse)
def collect_index():
    return HTMLResponse(COLLECT_HTML)


@app.get("/collect/", response_class=HTMLResponse)
def collect_index_slash():
    return HTMLResponse(COLLECT_HTML)


@app.get("/collect/admin", response_class=HTMLResponse)
def collect_admin():
    return HTMLResponse(COLLECT_ADMIN_HTML)


@app.post("/api/upload")
async def collect_upload_audio(
    request: Request,
    password: str = Form(...),
    participant: str = Form(...),
    sentence: str = Form(...),
    intent: str = Form(default="UNKNOWN"),
    menu: str = Form(default=""),
    quantity: str = Form(default=""),
    action: str = Form(default=""),
    domain: str = Form(default=""),
    condition: str = Form(...),
    dialect: str = Form(...),
    round_index: str = Form(...),
    file: UploadFile = File(...)
):
    check_password(password)

    audio_bytes = await file.read()

    if not audio_bytes:
        raise HTTPException(status_code=400, detail="empty audio")

    sample_id = datetime.now().strftime("%Y%m%d_%H%M%S") + "_" + uuid.uuid4().hex[:8]

    content_type = file.content_type or ""

    if "mp4" in content_type:
        ext = ".mp4"
    elif "aac" in content_type:
        ext = ".aac"
    elif "mpeg" in content_type:
        ext = ".mp3"
    elif "wav" in content_type:
        ext = ".wav"
    else:
        ext = ".webm"

    filename = f"{sample_id}{ext}"
    audio_path = COLLECT_AUDIO_DIR / filename

    with open(audio_path, "wb") as f:
        f.write(audio_bytes)

    append_collection_metadata({
        "id": sample_id,
        "filename": f"audio/{filename}",
        "participant": participant,
        "sentence": sentence,
        "intent": intent or "UNKNOWN",
        "menu": menu,
        "quantity": quantity,
        "action": action,
        "domain": domain,
        "condition": condition,
        "dialect": dialect,
        "round_index": round_index,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "user_agent": request.headers.get("user-agent", "")
    })

    return {
        "ok": True,
        "id": sample_id,
        "filename": filename
    }


@app.get("/api/progress")
def collect_get_progress(password: str, participant: str):
    check_password(password)
    ensure_collection_header()

    count = 0
    max_round = 0

    if COLLECT_META_CSV.exists():
        with open(COLLECT_META_CSV, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)

            for row in reader:
                if (row.get("participant") or "").strip() == participant.strip():
                    count += 1

                    try:
                        r = int(row.get("round_index") or "0")
                    except Exception:
                        r = 0

                    if r > max_round:
                        max_round = r

    return {
        "participant": participant,
        "count": count,
        "completed": max_round,
        "next_index": max_round + 1
    }


@app.get("/api/list")
def collect_list_files(password: str):
    check_password(password)
    ensure_collection_header()

    rows = []

    if COLLECT_META_CSV.exists():
        with open(COLLECT_META_CSV, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

    return {
        "count": len(rows),
        "rows": rows
    }


@app.get("/download/all.zip")
def collect_download_all(password: str):
    check_password(password)
    ensure_collection_header()

    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(COLLECT_META_CSV, "metadata.csv")

        for audio_file in COLLECT_AUDIO_DIR.glob("*"):
            if audio_file.is_file():
                z.write(audio_file, f"audio/{audio_file.name}")

    zip_buffer.seek(0)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": "attachment; filename=kiosk_voice_collection.zip"
        }
    )


@app.get("/download/audio/{filename}")
def collect_download_audio(filename: str, password: str):
    check_password(password)

    audio_path = COLLECT_AUDIO_DIR / filename

    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="file not found")

    return FileResponse(audio_path, filename=filename)


# ============================================================
# 모델 관리 API
# ============================================================

@app.get("/admin/model-info")
def admin_model_info(password: str):
    check_password(password)

    return {
        "model_path": MODEL_PATH,
        "active_model_dir_exists": ACTIVE_MODEL_DIR.exists(),
        "active_model_dir": str(ACTIVE_MODEL_DIR),
        "models_dir": str(MODELS_DIR)
    }


@app.post("/admin/upload-model")
async def admin_upload_model(
    password: str = Form(...),
    file: UploadFile = File(...)
):
    check_password(password)

    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="zip 파일만 업로드 가능합니다.")

    upload_dir = MODELS_DIR / "_upload_tmp"
    extract_dir = MODELS_DIR / "_extract_tmp"
    new_dir = MODELS_DIR / "whisper-kiosk-ct2-int8.new"
    backup_dir = MODELS_DIR / "whisper-kiosk-ct2-int8.backup"

    for p in [upload_dir, extract_dir, new_dir]:
        if p.exists():
            shutil.rmtree(p)

    upload_dir.mkdir(parents=True, exist_ok=True)
    extract_dir.mkdir(parents=True, exist_ok=True)

    zip_path = upload_dir / "uploaded_model.zip"

    model_bytes = await file.read()

    if not model_bytes:
        raise HTTPException(status_code=400, detail="empty zip file")

    with open(zip_path, "wb") as f:
        f.write(model_bytes)

    try:
        with zipfile.ZipFile(zip_path, "r") as z:
            z.extractall(extract_dir)

        actual_model_dir = find_ct2_model_dir(extract_dir)

        shutil.copytree(actual_model_dir, new_dir)

        if backup_dir.exists():
            shutil.rmtree(backup_dir)

        if ACTIVE_MODEL_DIR.exists():
            ACTIVE_MODEL_DIR.rename(backup_dir)

        new_dir.rename(ACTIVE_MODEL_DIR)

        with model_lock:
            reload_whisper_model(str(ACTIVE_MODEL_DIR))

        return {
            "ok": True,
            "message": "model uploaded, extracted, and reloaded",
            "model_path": str(ACTIVE_MODEL_DIR)
        }

    except Exception as e:
        try:
            if ACTIVE_MODEL_DIR.exists():
                shutil.rmtree(ACTIVE_MODEL_DIR)

            if backup_dir.exists():
                backup_dir.rename(ACTIVE_MODEL_DIR)
        except Exception as restore_error:
            print("[MODEL RESTORE ERROR]", restore_error)

        raise HTTPException(status_code=500, detail=str(e))

    finally:
        for p in [upload_dir, extract_dir]:
            if p.exists():
                shutil.rmtree(p)