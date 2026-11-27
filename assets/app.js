/* 우리 집 집안일 · 피클 하우스
   - 방별 / 전체 체크리스트 (localStorage)
   - 담당 배지 탭 전환, 주기 표시, 추가·삭제, 오늘 달성률
   - 종화·수뚜 피클이 방을 오가며 응원
*/
(function () {
  "use strict";

  /* ---------------- 기본 데이터 ---------------- */
  var ROOM_ORDER = ["living", "kitchen", "bath", "bedroom", "entry"];

  var ROOMS = {
    living:  { name: "거실", icon: "🛋️", cheer: { jh: "거실부터 슥 돌까요?", su: "쿠션은 제가 탈게요 🛋️" } },
    kitchen: { name: "주방", icon: "🍳", cheer: { jh: "설거지, 제가 할게요.", su: "식세기는 제 차례예요 🍽️" } },
    bath:    { name: "욕실", icon: "🛁", cheer: { jh: "배수구는 제가 볼게요.", su: "수건 바꿔 둘게요 🧺" } },
    bedroom: { name: "안방 · 아이방", icon: "🛏️", cheer: { jh: "빨래는 제가 널어요.", su: "침구는 같이 털어요 ☁️" } },
    entry:   { name: "현관 · 다용도실", icon: "🚪", cheer: { jh: "분리수거 내려갈게요.", su: "택배 박스 접어 둘게요 📦" } }
  };

  var WHO = {
    jh: { label: "종화", cls: "jh" },
    su: { label: "수뚜", cls: "su" },
    both: { label: "같이", cls: "both" }
  };
  var WHO_NEXT = { jh: "su", su: "both", both: "jh" };
  var FREQ = { daily: "매일", weekly: "주간", any: "수시" };

  var SEED = [
    { room: "living", title: "로봇청소기 · 청소기 돌리기", who: "jh", freq: "daily" },
    { room: "living", title: "물걸레질", who: "su", freq: "weekly" },
    { room: "living", title: "소파 · 장난감 정리", who: "both", freq: "daily" },
    { room: "living", title: "창문 열어 환기", who: "su", freq: "daily" },

    { room: "kitchen", title: "설거지 · 식세기 돌리기", who: "jh", freq: "daily" },
    { room: "kitchen", title: "음식물쓰레기 비우기", who: "su", freq: "daily" },
    { room: "kitchen", title: "정수기 주변 닦기", who: "both", freq: "weekly" },
    { room: "kitchen", title: "장보기 목록 체크", who: "su", freq: "weekly" },

    { room: "bath", title: "샤워기 · 세면대 필터 상태 확인", who: "jh", freq: "weekly" },
    { room: "bath", title: "배수구 머리카락 정리", who: "jh", freq: "weekly" },
    { room: "bath", title: "수건 교체 · 세탁", who: "su", freq: "weekly" },
    { room: "bath", title: "곰팡이 · 물때 청소", who: "both", freq: "weekly" },

    { room: "bedroom", title: "빨래 · 건조기 돌리고 개기", who: "su", freq: "daily" },
    { room: "bedroom", title: "침구 털기", who: "both", freq: "weekly" },
    { room: "bedroom", title: "아이 용품 · 기저귀/젖병 챙기기", who: "jh", freq: "daily" },

    { room: "entry", title: "분리수거(플라스틱 · 종이 · 캔) 내놓기", who: "jh", freq: "weekly" },
    { room: "entry", title: "택배 박스 정리", who: "both", freq: "any" },
    { room: "entry", title: "신발장 · 현관 쓸기", who: "su", freq: "weekly" }
  ];

  var STORE = "pickle-house.chores.v2";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- 상태 ---------------- */
  var state = { day: "", items: [] };
  var filter = "all";
  var sheetRoom = null;

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function cleanWho(v) { return WHO[v] ? v : "both"; }
  function cleanFreq(v) { return FREQ[v] ? v : "any"; }
  function cleanRoom(v) { return ROOMS[v] ? v : "living"; }

  function load() {
    var raw = null;
    try { raw = window.localStorage.getItem(STORE); } catch (e) { raw = null; }

    if (!raw) {
      state.items = SEED.map(function (s) {
        return { id: uid(), room: s.room, title: s.title, who: s.who, freq: s.freq, done: false };
      });
      state.day = todayKey();
      save();
      return;
    }

    try {
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.items)) throw new Error("bad");
      state.day = typeof parsed.day === "string" ? parsed.day : todayKey();
      state.items = parsed.items
        .filter(function (i) { return i && typeof i.title === "string" && i.title.trim(); })
        .map(function (i) {
          return {
            id: String(i.id || uid()),
            room: cleanRoom(i.room),
            title: String(i.title).slice(0, 60),
            who: cleanWho(i.who),
            freq: cleanFreq(i.freq),
            done: !!i.done
          };
        });
    } catch (e) {
      state.items = [];
      state.day = todayKey();
    }
  }

  function save() {
    try { window.localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* 저장이 막혀도 동작만 */ }
  }

  function resetIfNewDay() {
    var today = todayKey();
    if (state.day === today) return false;
    state.day = today;
    state.items.forEach(function (i) { i.done = false; });
    save();
    return true;
  }

  /* ---------------- DOM ---------------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var dateLine = $("#dateLine");
  var lampBtn = $("#lampBtn");
  var lampIcon = $("#lampIcon");
  var lampLabel = $("#lampLabel");
  var house = $("#house");
  var sumPct = $("#sumPct");
  var sumSub = $("#sumSub");
  var sumBar = $("#sumBar");
  var whoCounts = $("#whoCounts");
  var allList = $("#allList");
  var listCount = $("#listCount");
  var addForm = $("#addForm");
  var addInput = $("#addInput");
  var addRoom = $("#addRoom");
  var addWho = $("#addWho");
  var addFreq = $("#addFreq");
  var sheet = $("#sheet");
  var sheetKicker = $("#sheetKicker");
  var sheetTitle = $("#sheetTitle");
  var sheetBody = $("#sheetBody");
  var sheetClose = $("#sheetClose");
  var sheetList = null;
  var sheetForm = null;
  var scrim = $("#scrim");
  var live = $("#live");
  var cheer = $("#cheer");
  var cheerDot = $("#cheerDot");
  var cheerText = $("#cheerText");

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function announce(msg) {
    if (!live) return;
    live.textContent = "";
    window.setTimeout(function () { live.textContent = msg; }, 40);
  }

  /* ---------------- 집계 ---------------- */
  function roomItems(room) {
    return state.items.filter(function (i) { return i.room === room; });
  }
  function roomDone(room) {
    return roomItems(room).filter(function (i) { return i.done; }).length;
  }
  function totals() {
    var total = state.items.length;
    var done = state.items.filter(function (i) { return i.done; }).length;
    return { total: total, done: done };
  }

  /* ---------------- 렌더 ---------------- */
  function renderSummary() {
    var t = totals();
    var pct = t.total ? Math.round((t.done / t.total) * 100) : 0;
    sumPct.textContent = pct;
    sumSub.textContent = t.done + " / " + t.total + " 완료";
    sumBar.style.width = pct + "%";

    whoCounts.textContent = "";
    ["jh", "su", "both"].forEach(function (key) {
      var mine = state.items.filter(function (i) { return i.who === key; });
      var done = mine.filter(function (i) { return i.done; }).length;
      var li = el("li", "who-count who-count--" + WHO[key].cls);
      li.appendChild(el("i", ""));
      li.appendChild(el("span", null, WHO[key].label + " " + done + "/" + mine.length));
      whoCounts.appendChild(li);
    });

    listCount.textContent = t.done + " / " + t.total;
  }

  function renderRooms() {
    ROOM_ORDER.forEach(function (key) {
      var total = roomItems(key).length;
      var done = roomDone(key);
      var card = house.querySelector('.room[data-room="' + key + '"]');
      if (!card) return;
      var badge = card.querySelector('[data-count="' + key + '"]');
      var sub = card.querySelector('[data-sub="' + key + '"]');
      var bar = card.querySelector('[data-bar="' + key + '"]');
      var prev = card.querySelector('[data-preview="' + key + '"]');
      if (badge) badge.textContent = total;
      if (sub) sub.textContent = done + " / " + total + " 완료";
      if (prev) {
        var list = roomItems(key);
        var next = null;
        for (var i = 0; i < list.length; i++) { if (!list[i].done) { next = list[i]; break; } }
        if (!next) next = list[0] || null;
        prev.textContent = next
          ? (list.length > 1 ? next.title + " 외 " + (list.length - 1) + "개" : next.title)
          : "아직 할 일이 없어요";
      }
      if (bar) bar.style.width = (total ? Math.round((done / total) * 100) : 0) + "%";
      card.classList.toggle("is-done", total > 0 && done === total);
      var label = card.querySelector(".room-btn");
      if (label) {
        label.setAttribute("aria-label",
          ROOMS[key].name + " 집안일 " + total + "개 중 " + done + "개 완료. 눌러서 보기");
      }
    });
  }

  function rowFor(item) {
    var li = el("li", "row" + (item.done ? " done" : ""));
    li.dataset.id = item.id;

    var tick = el("button", "tick");
    tick.type = "button";
    tick.setAttribute("role", "checkbox");
    tick.setAttribute("aria-checked", item.done ? "true" : "false");
    tick.setAttribute("aria-label", (item.done ? "완료 취소: " : "완료 표시: ") + item.title);
    tick.dataset.act = "toggle";

    var main = el("div", "row-main");
    var title = el("p", "row-title", item.title);
    var meta = el("div", "row-meta");

    var who = el("button", "who who--" + WHO[item.who].cls, WHO[item.who].label);
    who.type = "button";
    who.dataset.act = "who";
    who.title = "누르면 담당이 바뀌어요";
    who.setAttribute("aria-label", "담당 " + WHO[item.who].label + ". 눌러서 바꾸기");

    var freq = el("span", "freq", FREQ[item.freq]);

    meta.appendChild(who);
    meta.appendChild(freq);
    main.appendChild(title);
    main.appendChild(meta);

    var del = el("button", "del", "✕");
    del.type = "button";
    del.dataset.act = "del";
    del.setAttribute("aria-label", "삭제: " + item.title);

    li.appendChild(tick);
    li.appendChild(main);
    li.appendChild(del);
    return li;
  }

  function renderList() {
    allList.textContent = "";

    var items = state.items.filter(function (i) {
      return filter === "all" || i.who === filter;
    });

    if (!items.length) {
      allList.appendChild(el("p", "list-empty",
        filter === "all" ? "아직 집안일이 없어요. 아래에서 한 줄 추가해 보세요." : "이 담당의 집안일이 없어요."));
      return;
    }

    ROOM_ORDER.forEach(function (key) {
      var mine = items.filter(function (i) { return i.room === key; });
      if (!mine.length) return;

      var head = el("div", "group-head");
      head.appendChild(el("span", "g-icon", ROOMS[key].icon));
      head.appendChild(el("span", null, ROOMS[key].name));
      head.appendChild(el("span", "g-count",
        mine.filter(function (i) { return i.done; }).length + "/" + mine.length));
      allList.appendChild(head);

      var ul = el("ul", null);
      mine.forEach(function (item) { ul.appendChild(rowFor(item)); });
      allList.appendChild(ul);
    });
  }

  function renderSheetList() {
    if (!sheetList || !sheetRoom) return;
    sheetList.textContent = "";
    var mine = roomItems(sheetRoom);
    if (!mine.length) {
      sheetList.appendChild(el("p", "list-empty", "이 방에는 아직 집안일이 없어요. 아래에서 추가해 보세요."));
      return;
    }
    mine.forEach(function (item) { sheetList.appendChild(rowFor(item)); });
  }

  function renderAll() {
    renderSummary();
    renderRooms();
    renderList();
    renderSheetList();
  }

  /* ---------------- 배우자/집안일 조작 ---------------- */
  function findItem(id) {
    for (var i = 0; i < state.items.length; i++) {
      if (state.items[i].id === id) return state.items[i];
    }
    return null;
  }

  document.addEventListener("click", function (e) {
    var actEl = e.target.closest ? e.target.closest("[data-act]") : null;
    if (!actEl) return;
    var rowEl = actEl.closest(".row");
    if (!rowEl) return;
    var item = findItem(rowEl.dataset.id);
    if (!item) return;
    e.preventDefault();

    var act = actEl.dataset.act;
    var id = item.id;
    var inSheet = !!(sheetList && sheetList.contains(rowEl));

    if (act === "toggle") {
      item.done = !item.done;
      announce((item.done ? "완료: " : "완료 취소: ") + item.title);
    } else if (act === "who") {
      item.who = WHO_NEXT[item.who];
      announce(item.title + " 담당 " + WHO[item.who].label);
    } else if (act === "del") {
      var title = item.title;
      state.items = state.items.filter(function (i) { return i.id !== id; });
      announce("삭제: " + title);
    }

    save();
    renderAll();

    if (act !== "del") {
      var scope = inSheet ? sheetBody : document;
      var again = scope.querySelector('.row[data-id="' + id + '"] [data-act="' + act + '"]');
      if (again) again.focus({ preventScroll: true });
    } else {
      var next = sheetRoom ? sheetList : allList;
      if (next) next.setAttribute("tabindex", "-1");
      if (next) next.focus({ preventScroll: true });
    }
  });

  /* ---------------- 추가 ---------------- */
  function addItem(room, who, freq, title) {
    var t = String(title || "").trim();
    if (!t) return false;
    state.items.unshift({
      id: uid(),
      room: cleanRoom(room),
      title: t.slice(0, 60),
      who: cleanWho(who),
      freq: cleanFreq(freq),
      done: false
    });
    save();
    renderAll();
    announce("추가: " + t);
    return true;
  }

  addForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (addItem(addRoom.value, addWho.value, addFreq.value, addInput.value)) {
      addInput.value = "";
      addInput.focus();
    } else {
      addInput.focus();
    }
  });

  /* ---------------- 방 카드 ---------------- */
  house.querySelectorAll(".room").forEach(function (room) {
    var btn = room.querySelector(".room-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      openSheet(room.getAttribute("data-room"));
    });
  });

  /* ---------------- 상세 시트 ---------------- */
  var lastFocus = null;

  function buildSheetForm(roomKey) {
    var form = el("form", "add-form");
    form.autocomplete = "off";

    var input = el("input", "add-input");
    input.type = "text";
    input.maxLength = 60;
    input.placeholder = "이 방에 할 일 추가";
    input.setAttribute("aria-label", ROOMS[roomKey].name + "에 새 집안일");

    var row = el("div", "add-row");
    var who = el("select", "add-select");
    who.setAttribute("aria-label", "담당");
    Object.keys(WHO).forEach(function (k) {
      var o = el("option", null, WHO[k].label);
      o.value = k;
      who.appendChild(o);
    });
    var freq = el("select", "add-select");
    freq.setAttribute("aria-label", "주기");
    Object.keys(FREQ).forEach(function (k) {
      var o = el("option", null, FREQ[k]);
      o.value = k;
      freq.appendChild(o);
    });
    var btn = el("button", "add-btn", "추가");
    btn.type = "submit";

    row.appendChild(who);
    row.appendChild(freq);
    row.appendChild(btn);
    form.appendChild(input);
    form.appendChild(row);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (addItem(roomKey, who.value, freq.value, input.value)) {
        input.value = "";
        input.focus();
      }
    });

    return form;
  }

  function openSheet(roomKey) {
    if (!ROOMS[roomKey]) return;
    var room = ROOMS[roomKey];
    sheetRoom = roomKey;
    lastFocus = document.activeElement;

    $$(".room.is-active").forEach(function (r) { r.classList.remove("is-active"); });
    var card = house.querySelector('.room[data-room="' + roomKey + '"]');
    if (card) card.classList.add("is-active");

    sheetKicker.textContent = "오늘의 " + room.name;
    sheetTitle.textContent = room.icon + " " + room.name;
    sheetBody.textContent = "";

    sheetList = el("ul", "sheet-list");
    sheetBody.appendChild(sheetList);
    if (sheetForm && sheetForm.parentNode) sheetForm.remove();
    sheetForm = buildSheetForm(roomKey);
    sheet.appendChild(sheetForm);

    renderSheetList();

    sheet.hidden = false;
    scrim.hidden = false;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(function () {
      sheet.classList.add("is-open");
      scrim.classList.add("show");
      sheet.setAttribute("aria-hidden", "false");
      sheetClose.focus({ preventScroll: true });
    });

    movePickle(pickles.jh, roomKey);
    movePickle(pickles.su, roomKey);
    say("jh", room.cheer.jh, 3000);
    window.setTimeout(function () { say("su", room.cheer.su, 3000); }, 1900);
  }

  function closeSheet() {
    if (!sheet.classList.contains("is-open")) return;
    sheet.classList.remove("is-open");
    scrim.classList.remove("show");
    sheet.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    sheetRoom = null;

    window.setTimeout(function () {
      if (!sheet.classList.contains("is-open")) {
        sheet.hidden = true;
        scrim.hidden = true;
      }
    }, reduceMotion ? 0 : 380);

    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  sheetClose.addEventListener("click", closeSheet);
  scrim.addEventListener("click", closeSheet);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeSheet(); return; }
    if (e.key === "Tab" && sheet.classList.contains("is-open")) {
      var f = sheet.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------------- 필터 ---------------- */
  $$(".pill").forEach(function (pill) {
    pill.addEventListener("click", function () {
      filter = pill.getAttribute("data-filter") || "all";
      $$(".pill").forEach(function (p) {
        p.setAttribute("aria-pressed", p === pill ? "true" : "false");
      });
      renderList();
      var n = state.items.filter(function (i) { return filter === "all" || i.who === filter; }).length;
      announce((filter === "all" ? "전체" : WHO[filter].label) + " " + n + "개");
    });
  });

  /* ---------------- 피클 ---------------- */
  function pickleSvg(who) {
    var bow = who === "su"
      ? '<path d="M50 7c-3-5-11-4-11 2 0 4.5 6.5 7.5 11 11.5 4.5-4 11-7 11-11.5 0-6-8-7-11-2z" fill="#E86A82" opacity=".95"/>'
      : '<path d="M34 20c2-6 8-8 16-8s14 2 16 8" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"/>';
    return '<svg viewBox="0 0 100 100" focusable="false" aria-hidden="true">' +
      '<g class="body-anim">' +
        '<g fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round">' +
          '<path d="M31 27v50M69 27v50M31 52h38M31 77h38"/>' +
        "</g>" +
        '<circle cx="43" cy="39" r="4.2" fill="#242424"/>' +
        '<circle cx="57" cy="39" r="4.2" fill="#242424"/>' +
        '<ellipse cx="36" cy="46" rx="4.4" ry="2.5" fill="#ffffff" opacity=".4"/>' +
        '<ellipse cx="64" cy="46" rx="4.4" ry="2.5" fill="#ffffff" opacity=".4"/>' +
        bow +
      "</g></svg>";
  }

  function makePickle(who) {
    var p = el("div", "pickle pickle--" + who);
    p.dataset.who = who;
    p.setAttribute("aria-hidden", "true");
    p.insertAdjacentHTML("beforeend", pickleSvg(who));
    return p;
  }

  var pickles = { jh: makePickle("jh"), su: makePickle("su") };

  function slotFor(room, who) {
    return house.querySelector('.slot[data-slot="' + room + "-" + who + '"]');
  }

  function movePickle(p, room) {
    if (!p) return;
    var slot = slotFor(room, p.dataset.who);
    if (!slot || p.parentElement === slot) return;

    if (reduceMotion || !p.animate) { slot.appendChild(p); return; }

    var first = p.getBoundingClientRect();
    slot.appendChild(p);
    var last = p.getBoundingClientRect();
    var dx = first.left - last.left;
    var dy = first.top - last.top;

    p.animate(
      [
        { transform: "translate(" + dx + "px," + dy + "px)" },
        { transform: "translate(" + (dx * 0.45) + "px," + (dy * 0.45 - 18) + "px)", offset: 0.55 },
        { transform: "translate(0, 0)" }
      ],
      { duration: 560, easing: "cubic-bezier(.3,.85,.3,1)" }
    );
  }

  var cheerTimer = null;

  function say(who, text, hold) {
    if (!cheer || !cheerText) return;
    cheerText.textContent = (who === "su" ? "수뚜" : "종화") + " · " + text;
    if (cheerDot) cheerDot.className = "cheer-dot " + (who === "su" ? "su" : "jh");
    cheer.classList.add("is-on");
    window.clearTimeout(cheerTimer);
    cheerTimer = window.setTimeout(function () { cheer.classList.remove("is-on"); }, hold || 3200);
  }

  var CHEER_JH = ["오늘도 화이팅!", "저 청소기 돌리러 갈게요 🤖", "물 한 잔 마시고 할까요?", "거실 한번 돌아볼게요."];
  var CHEER_SU = ["저는 빨래 보러 갈게요 🧺", "수건 바꿔 둘게요!", "같이 하면 금방이에요 💛", "설거지는 제가요 🍽️"];
  var wanderRoom = { jh: "living", su: "living" };

  function wander() {
    if (sheet.classList.contains("is-open") || document.hidden) return;
    if (reduceMotion) return;
    var who = Math.random() < 0.5 ? "jh" : "su";
    var others = ROOM_ORDER.filter(function (r) { return r !== wanderRoom[who]; });
    var next = others[Math.floor(Math.random() * others.length)];
    wanderRoom[who] = next;
    movePickle(pickles[who], next);
    var lines = who === "jh" ? CHEER_JH : CHEER_SU;
    say(who, lines[Math.floor(Math.random() * lines.length)], 2800);
  }

  /* ---------------- 램프 ---------------- */
  var THEME_KEY = "pickle-house.theme";

  function applyTheme(theme) {
    var night = theme === "night";
    document.documentElement.setAttribute("data-theme", night ? "night" : "day");
    lampBtn.setAttribute("aria-pressed", night ? "true" : "false");
    lampIcon.textContent = night ? "☀️" : "🌙";
    lampLabel.textContent = night ? "낮 켜기" : "밤 켜기";
  }

  (function initTheme() {
    var saved = null;
    try { saved = window.localStorage.getItem(THEME_KEY); } catch (e) { saved = null; }
    applyTheme(saved === "night" ? "night" : "day");
  })();

  lampBtn.addEventListener("click", function () {
    var next = document.documentElement.getAttribute("data-theme") === "night" ? "day" : "night";
    applyTheme(next);
    try { window.localStorage.setItem(THEME_KEY, next); } catch (e) { /* 무시 */ }
  });

  /* ---------------- 날짜 ---------------- */
  function updateDate() {
    var now = new Date();
    var date = new Intl.DateTimeFormat("ko-KR", {
      month: "long", day: "numeric", weekday: "long"
    }).format(now);
    var time = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
    dateLine.textContent = date + " · " + time;
  }

  /* ---------------- 시작 ---------------- */
  load();
  if (resetIfNewDay()) announce("날이 바뀌어 오늘 체크리스트를 새로 시작했어요.");

  renderAll();
  updateDate();
  window.setInterval(updateDate, 30000);

  movePickle(pickles.jh, "living");
  movePickle(pickles.su, "living");
  window.setTimeout(function () { say("jh", "오늘도 화이팅, 종화 님!", 3200); }, 700);
  window.setTimeout(function () { say("su", "같이 하면 금방이에요 💛", 3200); }, 4200);

  window.setInterval(function () {
    if (resetIfNewDay()) { renderAll(); announce("날이 바뀌어 체크리스트를 새로 시작했어요."); }
  }, 60000);

  window.setInterval(wander, 13000);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && resetIfNewDay()) { renderAll(); }
  });
})();
