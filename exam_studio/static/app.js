const state = {
  catalog: null,
  styles: null,
  mode: "workbook",
  subject: "",
  units: new Set(),
  count: 8,
  seed: 1,
  showAnswers: false,
  paper: null,
};

const $ = (id) => document.getElementById(id);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function showError(message) {
  const box = $("error");
  if (!message) {
    box.hidden = true;
    box.textContent = "";
    return;
  }
  box.hidden = false;
  box.textContent = message;
}

function currentSubject() {
  return (state.catalog.subjects || []).find((row) => row.subject === state.subject);
}

function renderSubjects() {
  const box = $("subjects");
  box.replaceChildren();
  state.catalog.subjects.forEach((row) => {
    const button = el("button", "chip" + (row.subject === state.subject ? " is-on" : ""), row.subject);
    button.type = "button";
    button.addEventListener("click", () => {
      state.subject = row.subject;
      state.units = new Set(row.units);
      renderSubjects();
      renderUnits();
    });
    box.appendChild(button);
  });
}

function renderUnits() {
  const box = $("units");
  box.replaceChildren();
  const row = currentSubject();
  if (!row) return;
  row.units.forEach((unit) => {
    const button = el("button", "chip" + (state.units.has(unit) ? " is-on" : ""), unit);
    button.type = "button";
    button.addEventListener("click", () => {
      if (state.units.has(unit)) {
        if (state.units.size === 1) return;
        state.units.delete(unit);
      } else {
        state.units.add(unit);
      }
      renderUnits();
    });
    box.appendChild(button);
  });
}

function renderStyles() {
  const box = $("style-list");
  box.replaceChildren();
  ["workbook", "mock"].forEach((kind) => {
    const block = el("div", "style-block");
    block.appendChild(el("h3", "", kind === "workbook" ? "문제집" : "모의고사"));
    const list = el("ul");
    (state.styles[kind].summary || []).forEach((line) => list.appendChild(el("li", "", line)));
    block.appendChild(list);
    box.appendChild(block);
  });
}

function choiceMark(index) {
  return "①②③④⑤⑥⑦⑧⑨⑩"[index] || String(index + 1);
}

function renderPaper() {
  const slot = $("paper");
  slot.replaceChildren();
  const paper = state.paper;
  if (!paper) return;

  const summary = el("div", "summary no-print");
  summary.appendChild(el("span", "stat", paper.mode === "mock" ? "모의고사" : "유형 문제집"));
  summary.appendChild(el("span", "stat", `${paper.questionCount}문항`));
  if (paper.minutes) summary.appendChild(el("span", "stat", `${paper.minutes}분`));
  if (paper.totalPoints) summary.appendChild(el("span", "stat", `${paper.totalPoints}점`));
  const jump = el("button", "ghost slim", state.showAnswers ? "정답 가리기" : "정답·해설 펼치기");
  jump.type = "button";
  jump.addEventListener("click", () => $("toggle-answers").click());
  summary.appendChild(jump);
  slot.appendChild(summary);

  paper.notices.forEach((notice) => slot.appendChild(el("p", "notice", notice)));

  const sheet = el("article", "sheet" + (paper.mode === "mock" ? " mock-sheet" : ""));
  sheet.appendChild(el("h2", "sheet-title", paper.title));
  const sub = el("div", "sheet-sub");
  if (paper.variant) sub.appendChild(el("span", "meta-pill", paper.variant));
  sub.appendChild(el("span", "meta-pill", paper.grade));
  sub.appendChild(el("span", "meta-pill", paper.subject));
  if (paper.minutes) sub.appendChild(el("span", "meta-pill", `제한 시간 ${paper.minutes}분`));
  if (paper.totalPoints) sub.appendChild(el("span", "meta-pill", `총점 ${paper.totalPoints}점`));
  sheet.appendChild(sub);

  if (paper.studentFields.length) {
    const identity = el("div", "identity");
    paper.studentFields.forEach((name) => identity.appendChild(el("span", "", name)));
    sheet.appendChild(identity);
  }
  sheet.appendChild(el("div", "rule"));

  paper.sections.forEach((section) => {
    if (section.unit) sheet.appendChild(el("div", "unit-label", section.unit));
    if (section.concept) {
      const concept = el("div", "concept");
      concept.appendChild(el("span", "kicker", "개념 CHECK"));
      concept.appendChild(el("h3", "", section.concept.title));
      concept.appendChild(el("p", "", section.concept.body));
      if (section.concept.caution) concept.appendChild(el("p", "caution", section.concept.caution));
      sheet.appendChild(concept);
    }
    section.items.forEach((item) => sheet.appendChild(renderItem(item, paper)));
  });
  slot.appendChild(sheet);

  if (paper.endAnswerKey) slot.appendChild(renderAnswerKey(paper));
  if (paper.answerSheet.length) slot.appendChild(renderOmr(paper));
  if (paper.showCommentary) slot.appendChild(renderCommentary(paper));

  slot.querySelectorAll("[data-answer]").forEach((node) => {
  node.hidden = !state.showAnswers;
  if (node.tagName === "DETAILS") node.open = state.showAnswers;
});
}

function renderItem(item, paper) {
  const card = el("section", "q-card");
  const top = el("div", "q-top");
  top.appendChild(el("span", "num", String(item.no)));
  if (item.face.tag) top.appendChild(el("span", "tag", item.face.tag));
  if (item.face.difficulty) {
    const dots = el("span", "dots");
    dots.dataset.level = item.face.difficulty;
    dots.append(el("i"), el("i"), el("i"));
    top.appendChild(dots);
  }
  if (item.face.points) top.appendChild(el("span", "points", `${item.face.points}점`));
  card.appendChild(top);
  card.appendChild(el("p", "stem", item.face.stem));

  if (item.face.type === "objective") {
    const list = el("ol", "choices");
    item.face.choices.forEach((choice, index) => {
      const li = el("li");
      li.appendChild(el("span", "choice-no", String(index + 1)));
      li.appendChild(el("span", "", choice));
      list.appendChild(li);
    });
    card.appendChild(list);
  } else {
    card.appendChild(el("div", "short-line"));
  }

  if (item.face.trap) {
    const trap = el("div", "trap");
    trap.appendChild(el("span", "kicker", "함정"));
    trap.appendChild(document.createTextNode(" " + item.face.trap));
    card.appendChild(trap);
  }

  if (paper.solutionCollapsed) {
    const box = el("details", "solution-box");
    box.dataset.answer = "1";
    box.appendChild(el("summary", "", "풀이 보기"));
    const body = el("div", "solution");
    body.appendChild(el("strong", "", `정답 ${item.commentary.answerLabel}`));
    body.appendChild(el("p", "", item.commentary.solution));
    box.appendChild(body);
    card.appendChild(box);
  }
  return card;
}

function renderAnswerKey(paper) {
  const key = el("section", "key");
  key.dataset.answer = "1";
  key.appendChild(el("span", "kicker", "정답"));
  const grid = el("div", "key-grid");
  paper.sections.forEach((section) => {
    section.items.forEach((item) => {
      grid.appendChild(el("span", "", `${item.no}  ${item.commentary.answerLabel}`));
    });
  });
  key.appendChild(grid);
  return key;
}

function renderOmr(paper) {
  const box = el("section", "key");
  box.dataset.answer = "1";
  box.appendChild(el("span", "kicker", "답안지"));
  const omr = el("div", "omr");
  paper.answerSheet.forEach((row) => {
    const line = el("div", "omr-row");
    line.appendChild(el("span", "num", String(row.no)));
    if (row.type === "short") {
      line.appendChild(el("span", "write-in", row.label));
    } else {
      const bubbles = el("span", "bubbles");
      for (let i = 0; i < 5; i += 1) {
        const mark = choiceMark(i);
        const bubble = el("span", "bubble" + (mark === row.label ? " on" : ""), String(i + 1));
        bubbles.appendChild(bubble);
      }
      line.appendChild(bubbles);
    }
    if (row.points) line.appendChild(el("span", "points", `${row.points}점`));
    omr.appendChild(line);
  });
  box.appendChild(omr);
  return box;
}

function renderCommentary(paper) {
  const box = el("section", "commentary");
  box.dataset.answer = "1";
  box.appendChild(el("span", "kicker", "해설"));
  paper.sections.forEach((section) => {
    section.items.forEach((item) => {
      const comment = el("article", "comment");
      const title = el("strong", "", `${item.no}. 정답 ${item.commentary.answerLabel}`);
      comment.appendChild(title);
      if (item.commentary.answerText && item.commentary.answerText !== item.commentary.answerLabel) {
        comment.appendChild(el("p", "", item.commentary.answerText));
      }
      comment.appendChild(el("p", "", item.commentary.solution));
      comment.appendChild(el("p", "", `함정  ${item.commentary.trap}`));
      box.appendChild(comment);
    });
  });
  return box;
}

async function loadMeta() {
  const [catalogRes, styleRes] = await Promise.all([fetch("/api/catalog"), fetch("/api/style")]);
  state.catalog = await catalogRes.json();
  state.styles = await styleRes.json();
  if (!state.subject && state.catalog.subjects.length) {
    state.subject = state.catalog.subjects[0].subject;
    state.units = new Set(state.catalog.subjects[0].units);
  }
  renderSubjects();
  renderUnits();
  renderStyles();
}

async function makePaper() {
  showError("");
  const units = [...state.units];
  if (!units.length) {
    showError("단원을 하나 이상 골라 주세요.");
    return;
  }
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: state.mode,
      subject: state.subject,
      units,
      count: state.count,
      seed: state.seed,
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    showError(payload.error || "문제를 만들지 못했습니다.");
    return;
  }
  state.paper = payload;
  state.showAnswers = false;
  $("toggle-answers").disabled = false;
  $("toggle-answers").textContent = "정답·해설 펼치기";
  $("print").disabled = false;
  renderPaper();
  $("paper").scrollIntoView({ behavior: "smooth", block: "start" });
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll(".mode").forEach((button) => {
    const on = button.dataset.mode === mode;
    button.classList.toggle("is-on", on);
    button.setAttribute("aria-checked", on ? "true" : "false");
  });
}

document.querySelectorAll(".mode").forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

$("count").addEventListener("input", (event) => {
  state.count = Number(event.target.value);
  $("count-label").textContent = String(state.count);
});

$("make").addEventListener("click", () => {
  state.seed = Date.now() % 100000;
  makePaper();
});

$("toggle-answers").addEventListener("click", () => {
  state.showAnswers = !state.showAnswers;
  $("toggle-answers").textContent = state.showAnswers ? "정답 가리기" : "정답·해설 펼치기";
  renderPaper();
});

$("print").addEventListener("click", () => window.print());

$("learn-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  showError("");
  const response = await fetch("/api/learn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: $("learn-kind").value, text: $("learn-text").value }),
  });
  const payload = await response.json();
  if (!response.ok) {
    showError(payload.error || "형식을 학습하지 못했습니다.");
    return;
  }
  state.styles = payload;
  $("learn-text").value = "";
  renderStyles();
});

$("reset-style").addEventListener("click", async () => {
  const response = await fetch("/api/style/reset", { method: "POST" });
  state.styles = await response.json();
  renderStyles();
});

loadMeta().catch(() => showError("스튜디오를 불러오지 못했습니다."));
