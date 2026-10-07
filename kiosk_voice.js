/*
  키오스크가 내는 소리는 이 파일만 담당한다.
  예전 패치가 쌓아 둔 pitch, rate, Heami 선택은 건너뛰고
  페이지가 열릴 때 저장해 둔 원래 speechSynthesis만 호출한다.
*/
(function () {
    if (window.__kioskVoiceEngine) return;

    var PITCH = 1;
    var RATE = 0.94;
    var REMOTE = "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ko&q=";
    var queue = [];
    var playing = null;
    var generation = 0;
    var allowRemote = true;
    var remoteBrokenUntil = 0;
    var resumeTimer = 0;
    var loggedRemote = false;
    var loggedLocal = false;

    function nativeSpeak(utterance) {
        if (typeof window.__kioskNativeSpeak === "function") return window.__kioskNativeSpeak(utterance);
        return null;
    }

    function nativeCancel() {
        if (typeof window.__kioskNativeCancel === "function") {
            try { window.__kioskNativeCancel(); } catch (e) {}
        }
    }

    function voices() {
        try { return window.speechSynthesis.getVoices() || []; } catch (e) { return []; }
    }

    function pickVoice() {
        var list = voices();
        var ko = list.filter(function (v) {
            return /ko/i.test(v.lang || "") || /korean|한국/i.test(v.name || "");
        });
        function score(v) {
            var n = v.name || "";
            if (/SunHi/i.test(n) && /Natural|Neural|Online/i.test(n)) return 0;
            if (/Google/i.test(n)) return 1;
            if (/SunHi/i.test(n)) return 2;
            if (/Yuna/i.test(n)) return 3;
            if (/InJoon/i.test(n)) return 4;
            if (/Natural|Neural|Online/i.test(n)) return 5;
            if (/Heami/i.test(n)) return 30;
            return 10;
        }
        ko.sort(function (a, b) { return score(a) - score(b); });
        return ko[0] || null;
    }

    function spokenText(utterance) {
        var raw = String((utterance && utterance.text) || "").replace(/\s+/g, " ").trim();
        if (!raw) return "";
        try {
            if (typeof window.__kioskTalkLine === "function") {
                var line = window.__kioskTalkLine(raw, window.__kioskHeard || "", window.__kioskQtyWord || "");
                if (line && String(line).trim()) return String(line).trim();
            }
        } catch (e) {}
        return raw;
    }

    function volumeOf(job) {
        var n = job.utterance && typeof job.utterance.volume === "number" ? job.utterance.volume : 1;
        if (!(n >= 0 && n <= 1)) return 1;
        return n;
    }

    function pieces(text) {
        var rest = String(text || "").trim();
        var out = [];
        while (rest.length > 160 && out.length < 5) {
            var cut = rest.lastIndexOf(" ", 160);
            if (cut < 40) cut = rest.lastIndexOf(".", 160);
            if (cut < 40) cut = 160;
            out.push(rest.slice(0, cut).trim());
            rest = rest.slice(cut).trim();
        }
        if (rest) out.push(rest);
        return out.filter(Boolean);
    }

    function setBusy(on) {
        window.isTtsSpeaking = !!on;
        window.__kioskTTSBusy = !!on;
        window.__TTS_FINAL_MIC_OFF = !!on;
        if (on) {
            try {
                if (typeof window.stopHybridSTT === "function") window.stopHybridSTT();
            } catch (e) {}
        }
    }

    function release() {
        if (playing || queue.length) return;
        window.isTtsSpeaking = false;
        window.__kioskTTSBusy = false;
        window.__TTS_FINAL_MIC_OFF = false;
        clearTimeout(resumeTimer);
        resumeTimer = setTimeout(function () {
            if (window.isTtsSpeaking || playing || queue.length) return;
            try {
                if (typeof window.startHybridSTT === "function") window.startHybridSTT();
            } catch (e) {}
        }, 350);
    }

    function fireStart(job) {
        if (job.started || job.done) return;
        job.started = true;
        try {
            if (typeof job.utterance.onstart === "function") job.utterance.onstart({ type: "start" });
        } catch (e) {}
    }

    function afterJob(job, ok, err) {
        if (job.done || job.gen !== generation) return;
        job.done = true;
        clearTimeout(job.timer);
        stopJobAudio(job);
        if (playing === job) playing = null;
        try {
            if (ok && typeof job.utterance.onend === "function") job.utterance.onend({ type: "end" });
            else if (!ok && typeof job.utterance.onerror === "function") job.utterance.onerror({ type: "error", error: err || "canceled" });
        } catch (e) {}
        if (queue.length) pump();
        else release();
    }

    function stopJobAudio(job) {
        if (!job || !job.audio) return;
        try {
            job.audio.onended = null;
            job.audio.onerror = null;
            job.audio.pause();
        } catch (e) {}
        job.audio = null;
    }

    function armTimer(job) {
        var cap = Math.min(18000, Math.max(4000, job.text.length * 140));
        job.timer = setTimeout(function () {
            if (job.done || job.gen !== generation) return;
            nativeCancel();
            afterJob(job, true);
        }, cap);
    }

    function makeUtterance(text) {
        var Ctor = window.SpeechSynthesisUtterance;
        var u = typeof Ctor === "function" ? new Ctor(text) : { text: text };
        u.lang = "ko-KR";
        u.pitch = PITCH;
        u.rate = RATE;
        return u;
    }

    function playLocal(job) {
        if (job.done || job.gen !== generation || job.local) return;
        job.local = true;
        stopJobAudio(job);
        fireStart(job);

        function go() {
            if (job.done || job.gen !== generation) return;
            var u = makeUtterance(job.text);
            u.volume = volumeOf(job);
            var voice = pickVoice();
            if (voice) u.voice = voice;
            if (!loggedLocal) {
                loggedLocal = true;
                console.log("[목소리] 컴퓨터 목소리:", voice ? voice.name : "기본", "pitch", PITCH, "rate", RATE);
            }
            u.onend = function () {
                if (job.done || job.gen !== generation) return;
                afterJob(job, true);
            };
            u.onerror = function (ev) {
                if (job.done || job.gen !== generation) return;
                afterJob(job, false, (ev && ev.error) || "synthesis-failed");
            };
            try {
                nativeSpeak(u);
            } catch (e) {
                afterJob(job, false, "synthesis-failed");
            }
        }

        if (voices().length || job.waitedVoices) {
            setTimeout(go, 40);
            return;
        }
        job.waitedVoices = true;
        var ran = false;
        function once() {
            if (ran) return;
            ran = true;
            go();
        }
        try { window.speechSynthesis.addEventListener("voiceschanged", once); } catch (e) {}
        setTimeout(once, 300);
    }

    function playRemote(job) {
        if (job.done || job.gen !== generation) return;
        if (typeof window.Audio !== "function") {
            allowRemote = false;
            playLocal(job);
            return;
        }
        var parts = pieces(job.text);
        var index = 0;
        fireStart(job);

        function handoff(why) {
            if (job.done || job.gen !== generation || job.local) return;
            if (why === "gesture") allowRemote = false;
            else remoteBrokenUntil = Date.now() + 120000;
            console.log("[목소리] 사람 목소리를 못 써서 컴퓨터 목소리로 바꿉니다.", why);
            playLocal(job);
        }

        function next() {
            if (job.done || job.gen !== generation || job.local) return;
            if (index >= parts.length) {
                afterJob(job, true);
                return;
            }
            var a = new window.Audio();
            job.audio = a;
            a.preload = "auto";
            a.volume = volumeOf(job);
            a.onerror = function () { handoff("network"); };
            a.onended = function () {
                if (job.done || job.gen !== generation || job.local) return;
                index += 1;
                next();
            };
            a.src = REMOTE + encodeURIComponent(parts[index]);
            var started = a.play();
            if (started && typeof started.then === "function") {
                started.then(function () {
                    if (!loggedRemote) {
                        loggedRemote = true;
                        console.log("[목소리] 사람 목소리로 말합니다.");
                    }
                }).catch(function (err) {
                    handoff(err && err.name === "NotAllowedError" ? "gesture" : "play");
                });
            }
        }

        next();
    }

    function pump() {
        if (playing || !queue.length) return;
        var job = queue.shift();
        playing = job;
        setBusy(true);
        armTimer(job);
        if (!allowRemote || Date.now() < remoteBrokenUntil || job.text.length > 420) playLocal(job);
        else playRemote(job);
    }

    function speak(utterance) {
        var text = spokenText(utterance);
        if (text) {
            try {
                if (typeof window.__kioskOnSpoken === "function") window.__kioskOnSpoken(text);
            } catch (e) {}
        }
        if (!text) {
            if (utterance && typeof utterance.onend === "function") {
                setTimeout(function () {
                    try { utterance.onend({ type: "end" }); } catch (e) {}
                }, 0);
            }
            return;
        }
        queue.push({
            utterance: utterance || {},
            text: text,
            gen: generation,
            done: false,
            started: false,
            local: false
        });
        pump();
    }
    speak.__kioskVoice = true;

    function cancel() {
        generation += 1;
        var jobs = [];
        if (playing) jobs.push(playing);
        jobs.push.apply(jobs, queue);
        queue = [];
        playing = null;
        nativeCancel();
        jobs.forEach(function (job) {
            if (job.done) return;
            job.done = true;
            clearTimeout(job.timer);
            stopJobAudio(job);
            try {
                if (typeof job.utterance.onerror === "function") job.utterance.onerror({ type: "error", error: "interrupted" });
            } catch (e) {}
        });
        release();
    }
    cancel.__kioskVoice = true;

    function claim() {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.speak = speak;
        window.speechSynthesis.cancel = cancel;
        try {
            window.localStorage.setItem("kiosk_tts_pitch", "1");
            window.localStorage.setItem("kiosk_tts_rate", "0.94");
            window.localStorage.removeItem("kiosk_manual_tts_voice");
        } catch (e) {}
        try { (window.document || document).documentElement.setAttribute("data-kiosk-voice", "1"); } catch (e) {}
    }

    window.addEventListener("pointerdown", function () {
        allowRemote = true;
    }, true);

    claim();
    var doc = window.document || document;
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", claim);
    setTimeout(claim, 0);
    setTimeout(claim, 400);
    setTimeout(claim, 1500);

    window.__kioskVoiceEngine = { claim: claim, speak: speak, cancel: cancel };
})();
