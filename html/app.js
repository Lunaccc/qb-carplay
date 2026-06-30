/* ============================================================
   qb-carplay  —  app.js  (vanilla)  ·  CarPlay arayuzu
   ============================================================ */
(function () {
    "use strict";

    var $ = function (id) { return document.getElementById(id); };
    var resName = (typeof GetParentResourceName !== "undefined") ? GetParentResourceName() : "qb-carplay";

    function nui(name, data) {
        return fetch("https://" + resName + "/" + name, {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=UTF-8" },
            body: JSON.stringify(data || {})
        }).then(function (r) { return r.json().catch(function () { return {}; }); })
          .catch(function () { return {}; });
    }

    var state = { open: false, mode: "local", hasXsound: false, playing: false, muted: false, volume: 0.45, current: null };

    /* ---------------- ikonlar ---------------- */
    var SVG = {
        home: '<svg viewBox="0 0 24 24"><path d="M12 3l9 8h-2.5v9h-5v-6h-3v6h-5v-9H3z"/></svg>',
        yt: '<svg viewBox="0 0 24 24"><path d="M23 12s0-3.8-.5-5.6a2.9 2.9 0 0 0-2-2C18.7 4 12 4 12 4s-6.7 0-8.5.4a2.9 2.9 0 0 0-2 2C1 8.2 1 12 1 12s0 3.8.5 5.6a2.9 2.9 0 0 0 2 2C5.3 20 12 20 12 20s6.7 0 8.5-.4a2.9 2.9 0 0 0 2-2C23 15.8 23 12 23 12zM10 15.5v-7l6 3.5-6 3.5z"/></svg>',
        spotify: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.6 14.4a.62.62 0 0 1-.86.21c-2.35-1.44-5.3-1.76-8.79-.96a.62.62 0 1 1-.28-1.21c3.8-.87 7.08-.5 9.72 1.1.3.18.39.57.21.86zm1.23-2.74a.78.78 0 0 1-1.07.26c-2.69-1.65-6.79-2.13-9.97-1.17a.78.78 0 1 1-.45-1.49c3.63-1.1 8.15-.56 11.23 1.33.37.22.49.7.26 1.07zm.1-2.85C14.8 8.96 9.3 8.78 6.2 9.72a.93.93 0 1 1-.54-1.78c3.56-1.08 9.63-.87 13.43 1.39a.93.93 0 1 1-.95 1.6z"/></svg>',
        car: '<svg viewBox="0 0 24 24"><path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11h.5a1.5 1.5 0 0 1 1.5 1.5V17a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4.5A1.5 1.5 0 0 1 4.5 11H5zm2.2-.5h9.6l-1-3a.6.6 0 0 0-.55-.4H8.75a.6.6 0 0 0-.56.4l-1 3zM7 14.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg>',
        nav: '<svg viewBox="0 0 24 24"><path d="M12 2l9 4.5-9 15-9-15L12 2zm0 3.2L6.3 8 12 17.4 17.7 8 12 5.2z"/></svg>',
        gear: '<svg viewBox="0 0 24 24"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 4l-2-1.5.4-2.4-2.2-1-1.5-1.9L13 6 11 6 8.8 5.2 7.3 7.1l-2.2 1 .4 2.4L3 12l2 1.5-.4 2.4 2.2 1 1.5 1.9L11 18l2 0 2.2.8 1.5-1.9 2.2-1-.4-2.4L21 12z"/></svg>',
        pin: '<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>',
        cross: '<svg viewBox="0 0 24 24"><path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z"/></svg>',
        shield: '<svg viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5l8-3z"/></svg>',
        wrench: '<svg viewBox="0 0 24 24"><path d="M21 7a5 5 0 0 1-6.7 4.7L7 19l-3-3 7.3-7.3A5 5 0 0 1 18 3l-2.5 2.5L17 8l2.5-2.5c.3.5.5 1 .5 1.5z"/></svg>',
        plane: '<svg viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V18l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-4.5L21 16z"/></svg>',
        fuel: '<svg viewBox="0 0 24 24"><path d="M5 3h8a1 1 0 0 1 1 1v16H4V4a1 1 0 0 1 1-1zm1 3v4h6V6H6zm10 1.5l2 2V17a1.5 1.5 0 0 0 3 0V8l-3-3-1 1 .5.5z"/></svg>',
        engine: '<svg viewBox="0 0 24 24"><path d="M7 6h6v2h2l2 2h2v3h-2v3h2v2h-4l-2 2H7v-3H4v-5h3V6zm2 2v8h3l2-2h2v-1h-2l-2-2H9V8z"/></svg>',
        lock: '<svg viewBox="0 0 24 24"><path d="M6 10V8a6 6 0 1 1 12 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h1zm2 0h8V8a4 4 0 1 0-8 0v2zm4 4a1.5 1.5 0 0 0-1 2.6V18h2v-1.4A1.5 1.5 0 0 0 12 14z"/></svg>',
        lights: '<svg viewBox="0 0 24 24"><path d="M9 4h3a7 7 0 0 1 0 14H9a5 5 0 0 1 0-10V4zm0 6a3 3 0 0 0 0 6h3a5 5 0 0 0 0-10H9v4zm9-3h4v2h-4V7zm0 4h5v2h-5v-2zm0 4h4v2h-4v-2z"/></svg>',
        neon: '<svg viewBox="0 0 24 24"><path d="M12 2l2.4 5.6L20 8l-4 4 1 6-5-2.8L7 18l1-6-4-4 5.6-.4L12 2z"/></svg>'
    };

    /* ---------------- rail / view ---------------- */
    var RAIL = [
        { key: "home",     name: "Ana",     cls: "ic-home",     svg: SVG.home,    view: "home" },
        { key: "youtube",  name: "YouTube", cls: "ic-youtube",  svg: SVG.yt,      music: "yt" },
        { key: "spotify",  name: "Spotify", cls: "ic-spotify",  svg: SVG.spotify, music: "spotify" },
        { key: "vehicle",  name: "Araç",    cls: "ic-vehicle",  svg: SVG.car,     view: "vehicle" },
        { key: "nav",      name: "Harita",  cls: "ic-nav",      svg: SVG.nav,     view: "nav" },
        { key: "settings", name: "Ayarlar", cls: "ic-settings", svg: SVG.gear,    view: "settings" }
    ];
    function buildRail() {
        var box = $("railApps"); if (!box) return; box.innerHTML = "";
        RAIL.forEach(function (a) {
            var b = document.createElement("button");
            b.className = "rail-app"; b.setAttribute("data-key", a.key);
            b.innerHTML = '<span class="ra-ic ' + a.cls + '">' + a.svg + '</span><span class="ra-name">' + a.name + '</span>';
            b.addEventListener("click", function () { if (a.music) openMusic(a.music); else showView(a.view); });
            box.appendChild(b);
        });
    }
    function setRailActive(key) {
        document.querySelectorAll(".rail-app").forEach(function (el) { el.classList.toggle("active", el.getAttribute("data-key") === key); });
    }
    function showView(name) {
        document.querySelectorAll(".cp-view").forEach(function (v) { v.classList.remove("active"); });
        var v = $("view-" + name); if (v) v.classList.add("active");
        if (name !== "music") setRailActive(name);
    }
    function currentSkin() { return $("view-music").classList.contains("spotify") ? "spotify" : "yt"; }
    function openMusic(skin) {
        var mv = $("view-music"), input = $("ytInput");
        if (skin === "spotify") {
            mv.classList.add("spotify");
            $("musicTitle").textContent = "Spotify";
            $("musicNote").textContent = "Spotify linki";
            input.placeholder = "Spotify şarkı linkini yapıştır...";
        } else {
            mv.classList.remove("spotify");
            $("musicTitle").textContent = "YouTube";
            $("musicNote").textContent = "YouTube linki";
            input.placeholder = "YouTube linkini yapıştır...";
        }
        showView("music");
        setRailActive(skin === "spotify" ? "spotify" : "youtube");
    }

    /* ---------------- nav ---------------- */
    function buildNav(points) {
        var list = $("navList"); if (!list) return; list.innerHTML = "";
        (points || []).forEach(function (p) {
            var item = document.createElement("div"); item.className = "nav-item";
            item.innerHTML = '<div class="nav-ic">' + (SVG[p.icon] || SVG.pin) + '</div><div><div class="nav-tx">' + p.label + '</div><div class="nav-sub">GPS işareti koy</div></div>';
            item.addEventListener("click", function () {
                nui("nav", { x: p.x, y: p.y });
                item.style.borderColor = "var(--accent)";
                setTimeout(function () { item.style.borderColor = ""; }, 600);
            });
            list.appendChild(item);
        });
    }

    /* ---------------- neon + duvar kagidi ---------------- */
    var NEON = ["#8fb2e6", "#ff4d6d", "#1ed760", "#ffd24d", "#b76dff", "#4dd0e1", "#ff7a3d", "#ffffff"];
    function buildNeon() {
        var box = $("neonColors"); if (!box) return; box.innerHTML = "";
        NEON.forEach(function (hex) {
            var b = document.createElement("button"); b.className = "swatch"; b.style.background = hex;
            b.addEventListener("click", function () { nui("control", { action: "neoncolor", value: hex }); });
            box.appendChild(b);
        });
    }
    function buildWallpapers() {
        var row = $("wpRow"); if (!row) return; row.innerHTML = "";
        var wps = ["wp-aurora", "wp-sunset", "wp-mint", "wp-dark"];
        var tablet = document.querySelector(".cp-tablet");
        wps.forEach(function (w, i) {
            var b = document.createElement("button"); b.className = "wp " + w + (i === 0 ? " sel" : "");
            b.addEventListener("click", function () {
                wps.forEach(function (x) { tablet.classList.remove(x); });
                tablet.classList.add(w);
                row.querySelectorAll(".wp").forEach(function (e) { e.classList.remove("sel"); });
                b.classList.add("sel");
            });
            row.appendChild(b);
        });
    }

    /* ---------------- arac kontrolleri ---------------- */
    function bindControls() {
        document.querySelectorAll(".ci").forEach(function (el) { var k = el.getAttribute("data-i"); if (SVG[k]) el.innerHTML = SVG[k]; });
        document.querySelectorAll("[data-act]").forEach(function (el) {
            el.addEventListener("click", function () { nui("control", { action: el.getAttribute("data-act"), value: el.getAttribute("data-val") }); });
        });
    }
    function applyControls(d) {
        if (!d) return;
        var set = function (sel, on) { var e = document.querySelector(sel); if (e) e.classList.toggle("on", !!on); };
        set('.ctrl[data-act="engine"]', d.engine);
        set('.ctrl[data-act="lock"]', d.locked);
        set('.ctrl[data-act="lights"]', d.lights);
        set('.ctrl[data-act="neon"]', d.neon);
        if (d.windows) for (var i = 0; i < 4; i++) set('.pill[data-act="window"][data-val="' + i + '"]', d.windows[i]);
        if (d.doors) [0, 1, 4, 5].forEach(function (i) { set('.pill[data-act="door"][data-val="' + i + '"]', d.doors[i + 1]); });
    }

    /* ---------------- telemetri ---------------- */
    function applyTelemetry(m) {
        var setTxt = function (id, v) { var e = $(id); if (e) e.textContent = v; };
        var setW = function (id, p) { var e = $(id); if (e) e.style.width = Math.max(0, Math.min(100, p)) + "%"; };
        setTxt("gSpeed", m.speed); setW("gSpeedFill", (m.speed / 200) * 100);
        setTxt("gRpm", m.rpm); setW("gRpmFill", m.rpm);
        setTxt("gFuel", m.fuel); setW("gFuelFill", m.fuel);
        setTxt("gHealth", m.health); setW("gHealthFill", m.health);
        setTxt("homeSpeed", m.speed); setTxt("homeFuel", m.fuel); setTxt("homeGear", m.gear);
    }

    /* ---------------- saat / tarih ---------------- */
    var DAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
    var MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    function tick() {
        var d = new Date();
        var t = ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
        ["cpClock", "homeClock"].forEach(function (id) { var e = $(id); if (e) e.textContent = t; });
        var hd = $("homeDate"); if (hd) hd.textContent = d.getDate() + " " + MONTHS[d.getMonth()] + " · " + DAYS[d.getDay()];
    }

    /* ============================================================
       MUZIK
       ============================================================ */
    var ytPlayer = null, ytReady = false, pendingVideo = null;
    var fmt = function (s) { s = Math.max(0, s | 0); return (s / 60 | 0) + ":" + ("0" + (s % 60)).slice(-2); };

    window.onYouTubeIframeAPIReady = function () {
        try {
            ytPlayer = new YT.Player("yt-player", {
                height: "150", width: "260",
                playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, playsinline: 1, rel: 0 },
                events: {
                    onReady: function () { ytReady = true; ytPlayer.setVolume(Math.round(state.volume * 100)); if (pendingVideo) { loadLocal(pendingVideo); pendingVideo = null; } },
                    onStateChange: function (e) { if (e.data === 1) setPlaying(true); else if (e.data === 2 || e.data === 0) setPlaying(false); }
                }
            });
        } catch (err) {}
    };

    function loadLocal(videoId) {
        if (!ytReady || !ytPlayer) {
            pendingVideo = videoId;
            setTimeout(function () { if (pendingVideo === videoId && (!ytReady || !ytPlayer)) { var a = $("mnAuthor"); if (a) a.textContent = "Yerel oynatma başlatılamadı — xsound ekle (öneri)"; } }, 5000);
            return;
        }
        try {
            ytPlayer.loadVideoById(videoId);
            ytPlayer.setVolume(Math.round(state.volume * 100));
            if (state.muted) ytPlayer.mute(); else ytPlayer.unMute();
            ytPlayer.playVideo();
        } catch (e) {}
    }

    function setPlaying(p) {
        state.playing = p;
        ["mcToggle", "homeNpToggle", "railNpToggle"].forEach(function (id) { var e = $(id); if (e) e.classList.toggle("playing", p); });
    }

    function setBackdrop(url) {
        var bg = $("mnBg"); if (!bg) return;
        if (url) { bg.style.backgroundImage = 'url("' + url + '")'; bg.classList.add("show"); }
        else { bg.classList.remove("show"); }
    }

    function setNowPlaying(msg) {
        state.current = msg;
        var title = msg.title || "YouTube";
        var sub = msg.author || (msg.mode === "xsound" ? "Araçtan çalıyor" : "");
        var art = $("mnArt");
        if (msg.thumb) { art.src = msg.thumb; art.classList.add("has"); setBackdrop(msg.thumb); } else { art.classList.remove("has"); setBackdrop(null); }
        $("mnTitle").textContent = title; $("mnAuthor").textContent = sub;
        $("homeNp").setAttribute("data-empty", "0");
        if (msg.thumb) { var ha = $("homeNpArt"); ha.src = msg.thumb; ha.classList.add("has"); }
        $("homeNpTitle").textContent = title; $("homeNpSub").textContent = sub;
        $("railNp").setAttribute("data-empty", "0");
        if (msg.thumb) $("railNpArt").src = msg.thumb;
    }
    function clearNowPlaying() {
        state.current = null; setPlaying(false);
        var a = $("mnArt"); if (a) a.classList.remove("has");
        $("mnTitle").textContent = "Çalmıyor"; $("mnAuthor").textContent = "Bir link yapıştırıp çal"; setBackdrop(null);
        $("homeNp").setAttribute("data-empty", "1"); var ha = $("homeNpArt"); if (ha) ha.classList.remove("has");
        $("homeNpTitle").textContent = "Çalmıyor"; $("homeNpSub").textContent = "Bir şarkı seç";
        $("railNp").setAttribute("data-empty", "1");
        var sf = $("seekFill"); if (sf) sf.style.width = "0%"; $("mnCur").textContent = "0:00"; $("mnDur").textContent = "0:00";
    }

    function playUrl() {
        var input = $("ytInput"); var url = (input.value || "").trim(); if (!url) return;
        var source = $("view-music").classList.contains("spotify") ? "spotify" : "youtube";
        $("mnAuthor").textContent = "Yükleniyor...";
        nui("musicPlay", { url: url, source: source }).then(function (r) { if (r && r.ok === false && r.msg) $("mnAuthor").textContent = r.msg; });
    }
    function togglePlay() {
        if (state.mode === "local") {
            if (!ytPlayer) return;
            var st = -1; try { st = ytPlayer.getPlayerState(); } catch (e) {}
            if (st === 1) { try { ytPlayer.pauseVideo(); } catch (e) {} } else { try { ytPlayer.playVideo(); } catch (e) {} }
        } else {
            if (state.playing) { nui("musicControl", { action: "pause" }); setPlaying(false); }
            else { nui("musicControl", { action: "resume" }); setPlaying(true); }
        }
    }
    function stopMusic() {
        if (state.mode === "local") { if (ytPlayer) { try { ytPlayer.stopVideo(); } catch (e) {} } }
        else nui("musicControl", { action: "stop" });
        clearNowPlaying();
    }
    function setVolume(v) {
        v = Math.max(0, Math.min(1, v)); state.volume = v; state.muted = (v === 0);
        if (state.mode === "local") { if (ytPlayer && ytReady) { try { ytPlayer.setVolume(Math.round(v * 100)); if (v > 0) ytPlayer.unMute(); } catch (e) {} } }
        else nui("musicControl", { action: "volume", value: v });
        var s1 = $("volSlider"), s2 = $("setVol");
        if (s1) s1.value = Math.round(v * 100); if (s2) s2.value = Math.round(v * 100);
    }

    setInterval(function () {
        if (state.mode !== "local" || !ytPlayer || !ytReady || !state.playing) return;
        try {
            var cur = ytPlayer.getCurrentTime() || 0, dur = ytPlayer.getDuration() || 0;
            $("mnCur").textContent = fmt(cur); $("mnDur").textContent = fmt(dur);
            var sf = $("seekFill"); if (sf) sf.style.width = (dur ? (cur / dur) * 100 : 0) + "%";
        } catch (e) {}
    }, 500);

    /* ---------------- mesaj koprusu ---------------- */
    window.addEventListener("message", function (e) {
        var d = e.data || {};
        switch (d.action) {
            case "open":
                state.open = true; state.hasXsound = !!d.hasXsound; state.mode = d.hasXsound ? "xsound" : "local";
                $("cp-root").classList.remove("hidden");
                if (d.vehicle) { $("cpVehName").textContent = d.vehicle.name || "Araç"; $("homeSub").textContent = d.vehicle.name || "CarPlay"; var vp = $("vehPlate"); if (vp) vp.textContent = d.vehicle.plate || ""; }
                buildNav(d.nav || []); applyControls(d.controls);
                var badge = d.hasXsound ? "3D SES" : "YEREL";
                $("cpAudioMode").textContent = badge; $("setModeBadge").textContent = badge;
                $("setModeDesc").textContent = d.hasXsound ? "xsound aktif · etraftakiler duyar" : "Yerel · sadece sen duyarsın";
                showView("home"); tick();
                break;
            case "close": state.open = false; $("cp-root").classList.add("hidden"); break;
            case "forceStop":
                if (state.mode === "local" && ytPlayer) { try { ytPlayer.stopVideo(); } catch (e) {} }
                clearNowPlaying(); break;
            case "telemetry": applyTelemetry(d); break;
            case "controls": applyControls(d.data); break;
            case "musicError": $("mnAuthor").textContent = d.msg || "Çalınamadı"; break;
            case "meta":
                if (d.title) { $("mnTitle").textContent = d.title; $("homeNpTitle").textContent = d.title; }
                if (d.author) { $("mnAuthor").textContent = d.author; $("homeNpSub").textContent = d.author; }
                if (d.thumb) { var ma = $("mnArt"); ma.src = d.thumb; ma.classList.add("has"); setBackdrop(d.thumb); var ha = $("homeNpArt"); ha.src = d.thumb; ha.classList.add("has"); $("railNpArt").src = d.thumb; }
                break;
            case "nowPlaying":
                state.mode = d.mode || state.mode;
                if (typeof d.volume === "number") setVolume(d.volume);
                setNowPlaying(d);
                if (d.mode === "local") loadLocal(d.videoId);
                setPlaying(true);
                openMusic(currentSkin());
                break;
        }
    });

    /* ---------------- baglama ---------------- */
    function init() {
        buildRail(); buildNeon(); buildWallpapers(); bindControls();

        $("cpClose").addEventListener("click", function () { nui("close"); });
        $("cp-root").addEventListener("mousedown", function (e) { if (e.target === $("cp-root")) nui("close"); });
        document.addEventListener("keydown", function (e) { if (e.key === "Escape" && state.open) nui("close"); });

        $("ytPlay").addEventListener("click", playUrl);
        $("ytInput").addEventListener("keydown", function (e) { if (e.key === "Enter") playUrl(); });
        $("mcToggle").addEventListener("click", togglePlay);
        $("mcStop").addEventListener("click", stopMusic);
        $("mcMute").addEventListener("click", function () { setVolume(state.muted ? 0.45 : 0); });

        $("homeNp").addEventListener("click", function () { openMusic(currentSkin()); });
        $("homeNpToggle").addEventListener("click", function (e) { e.stopPropagation(); togglePlay(); });
        $("railNp").addEventListener("click", function () { openMusic(currentSkin()); });

        $("volSlider").addEventListener("input", function () { setVolume(this.value / 100); });
        $("setVol").addEventListener("input", function () { setVolume(this.value / 100); });
        $("seekTrack").addEventListener("click", function (e) {
            if (state.mode !== "local" || !ytPlayer || !ytReady) return;
            var r = this.getBoundingClientRect();
            try { ytPlayer.seekTo(((e.clientX - r.left) / r.width) * (ytPlayer.getDuration() || 0), true); } catch (err) {}
        });

        tick(); setInterval(tick, 10000); clearNowPlaying();
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
