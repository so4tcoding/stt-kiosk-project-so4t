const assert = require("assert");

const spoken = [];
global.window = {
    speechSynthesis: {
        speak: function () { throw new Error("wrapper speak must not run"); },
        cancel: function () {},
        getVoices: function () {
            return [
                { name: "Microsoft Heami - Korean", lang: "ko-KR" },
                { name: "Google 한국어", lang: "ko-KR" }
            ];
        },
        addEventListener: function () {}
    },
    localStorage: {
        data: {},
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(this.data, k) ? this.data[k] : null; },
        setItem: function (k, v) { this.data[k] = String(v); },
        removeItem: function (k) { delete this.data[k]; }
    },
    addEventListener: function () {},
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    __kioskNativeSpeak: function (u) { spoken.push(u); },
    __kioskNativeCancel: function () {},
    __kioskTalkLine: function (text) { return "줄:" + text; },
    Audio: function () {
        this.play = function () {
            var err = new Error("blocked");
            err.name = "NotAllowedError";
            return Promise.reject(err);
        };
    }
};
global.document = { addEventListener: function () {}, readyState: "complete" };

require("./kiosk_voice.js");

assert.strictEqual(window.speechSynthesis.speak.__kioskVoice, true);
assert.strictEqual(window.localStorage.getItem("kiosk_tts_pitch"), "1");
assert.strictEqual(window.localStorage.getItem("kiosk_tts_rate"), "0.94");

let ended = 0;
window.speechSynthesis.speak({
    text: "메뉴 수량을 말씀해주세요.",
    volume: 1,
    pitch: 0.7,
    rate: 0.85,
    onend: function () { ended += 1; }
});

setTimeout(function () {
    assert.strictEqual(spoken.length, 1);
    assert.strictEqual(spoken[0].text, "줄:메뉴 수량을 말씀해주세요.");
    assert.strictEqual(spoken[0].pitch, 1);
    assert.strictEqual(spoken[0].rate, 0.94);
    assert.strictEqual(spoken[0].voice.name, "Google 한국어");
    spoken[0].onend();
    assert.strictEqual(ended, 1);
    assert.strictEqual(window.isTtsSpeaking, false);
    console.log("voice engine ok");
}, 120);
