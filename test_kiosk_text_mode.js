const assert = require("assert");
const TextMode = require("./kiosk_text_mode.js");

function el(id) {
    return {
        id: id,
        value: "",
        style: {},
        classList: {
            names: {},
            toggle: function (name) {
                this.names[name] = !this.names[name];
                return this.names[name];
            },
            contains: function (name) { return !!this.names[name]; }
        },
        addEventListener: function (type, fn) { this["on" + type] = fn; },
        click: function () { this.clicked = true; }
    };
}

const nodes = {
    "text-mode-log": el("text-mode-log"),
    "text-mode-form": el("text-mode-form"),
    "text-mode-input": el("text-mode-input"),
    "text-mode": el("text-mode"),
    "text-mode-toggle": el("text-mode-toggle"),
    "boot-overlay": Object.assign(el("boot-overlay"), { style: { display: "none" } }),
    "boot-btn": el("boot-btn")
};
nodes["text-mode-log"].scrollTop = 0;

const doc = {
    body: { classList: { contains: function () { return false; } } },
    getElementById: function (id) { return nodes[id] || null; }
};
const heard = [];
const win = {
    processVoiceCommand: function (text) {
        heard.push(text);
        win.__kioskOnSpoken("대답:" + text);
    },
    getComputedStyle: function () { return { display: "block" }; }
};

const api = TextMode.install(doc, win);
assert.ok(api);
nodes["text-mode-input"].value = "아메리카노 다섯 개";
nodes["text-mode-form"].onsubmit({ preventDefault: function () {} });
assert.deepStrictEqual(heard, ["아메리카노 다섯 개"]);
assert.ok(nodes["text-mode-log"].innerHTML.includes("나"));
assert.ok(nodes["text-mode-log"].innerHTML.includes("아메리카노 다섯 개"));
assert.ok(nodes["text-mode-log"].innerHTML.includes("대답:아메리카노 다섯 개"));
assert.strictEqual(nodes["text-mode-input"].value, "");

win.processVoiceCommand = function () {};
api.send("날씨 좋네요");
assert.ok(nodes["text-mode-log"].innerHTML.includes("소리로 대답하지 않았습니다"));
console.log("text mode ok");
