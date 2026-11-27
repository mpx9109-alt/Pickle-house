/* 아늑한 일반 집 · 피클 비서실
   - 방 클릭 → 상세 패널 + 피클 이동(FLIP)
   - 배우자 피클 자리 인사
   - 할 일 메모장(localStorage)
   - 낮/밤 램프 (localStorage)
*/
(function () {
  "use strict";

  /* ---------------- 방 데이터 ---------------- */
  var ROOMS = {
    study: {
      name: "서재",
      icon: "📚",
      tag: "이직 · 이력서",
      bubble: "마감이 코앞이에요. 이력서부터 볼까요?",
      note: "마감은 공고에 적힌 날짜 기준이에요. 지원은 종화 님이 직접, 준비물은 같이 봐요.",
      items: [
        { title: "진한공업(도블레) 품질·물류관리 책임자", meta: "지원 후보 · 마감 11/28", due: "2026-11-28" },
        { title: "제이시스메디칼 김포 HUB 재고·3PL", meta: "지원 후보 · 마감 11/30", due: "2026-11-30" },
        { title: "파스토풀필먼트 청라센터", meta: "지원 후보 · 마감 12/04", due: "2026-12-04" },
        { title: "쿠팡 인천 AM 인재풀", meta: "인천 단독 AM 공고는 없고, 전국 인재풀 접수 중이에요", state: "wait" }
      ]
    },
    living: {
      name: "거실",
      icon: "🛋️",
      tag: "생활 · 환급",
      bubble: "환급이랑 포인트, 챙길 걸 모아 뒀어요.",
      note: "금액은 확인된 것만 적었어요.",
      items: [
        { title: "연말정산 미리보기", meta: "예상 환급 약 81.6만 원 · 결정세액 0원", state: "good" },
        { title: "상반기 근로장려금", meta: "12/17 입금 확인 예정", state: "wait" },
        { title: "네이버페이 포인트", meta: "11,537원 보유", state: "good" },
        { title: "매일 07:00 클릭 적립", meta: "매일 아침 자동으로 등록돼요", state: "good" }
      ]
    },
    work: {
      name: "작업실",
      icon: "💻",
      tag: "업무 · CS",
      bubble: "CS 한 건이 기다리고 있어요.",
      note: "회사 일은 요약만 남겼어요.",
      items: [
        { title: "파사몰 CS — 회원탈퇴 메일", meta: "처리 대기", state: "today" },
        { title: "알리바바 그라인딩 팁 배송", meta: "배송 추적 중", state: "wait" },
        { title: "쿠팡 주문이행 기준 점검", meta: "목표 90점", state: "open" }
      ]
    },
    entry: {
      name: "현관 · 차고",
      icon: "🚗",
      tag: "집 · 차량",
      bubble: "현관문 견적이랑 차 리콜, 여기서 봐요.",
      note: "견적은 시세 조사 단계까지예요.",
      items: [
        { title: "현관문 교체 시세 조사", meta: "견적 비교 중", state: "open" },
        { title: "코란도(54주4408) 리콜 내역", meta: "확인 완료", state: "done" }
      ]
    },
    utility: {
      name: "다용도실",
      icon: "🧺",
      tag: "잔일 보관",
      bubble: "잔일은 여기 모아 두고 하나씩 꺼내요.",
      note: "잔일은 하나씩 꺼내 쓰는 서랍이에요.",
      items: [
        { title: "LG 정수기 받침대", meta: "구매 완료", state: "done" },
        { title: "롱패딩 추천 조사", meta: "후보 정리 중", state: "open" },
        { title: "아이클라우드 연락처 정리", meta: "진행 중", state: "open" }
      ]
    }
  };

  var STATE_LABEL = {
    today: { text: "오늘 처리", cls: "today", item: "item--today" },
    soon: { text: "마감 임박", cls: "soon", item: "item--soon" },
    open: { text: "진행 중", cls: "open", item: "item--" },
    wait: { text: "대기", cls: "wait", item: "item--" },
    good: { text: "확인", cls: "good", item: "item--good" },
    done: { text: "완료", cls: "done", item: "item--done" }
  };

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- 요소 ---------------- */
  var $ = function (sel) { return document.querySelector(sel); };
  var dateLine = $("#dateLine");
  var lampBtn = $("#lampBtn");
  var lampIcon = $("#lampIcon");
  var lampLabel = $("#lampLabel");
  var house = $("#house");
  var sheet = $("#sheet");
  var sheetKicker = $("#sheetKicker");
  var sheetTitle = $("#sheetTitle");
  var sheetBody = $("#sheetBody");
  var sheetClose = $("#sheetClose");
  var scrim = $("#scrim");
  var spouseBtn = $(".spouse");
  var spouseBubble = $("#spouseBubble");

  /* ---------------- 날짜 · 인사 ---------------- */
  function greeting(d) {
    var h = d.getHours();
    if (h < 6) return "늦은 밤이네요";
    if (h < 11) return "좋은 아침이에요";
    if (h < 17) return "좋은 오후예요";
    if (h < 21) return "좋은 저녁이에요";
    return "늦은 밤이네요";
  }

  function updateDate() {
    var now = new Date();
    var date = new Intl.DateTimeFormat("ko-KR", {
      year: "numeric", month: "long", day: "numeric", weekday: "long"
    }).format(now);
    var time = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
    dateLine.textContent = date + " · " + time;
  }

  /* ---------------- 피클 캐릭터 ---------------- */
  var pickle = document.createElement("div");
  pickle.className = "pickle";
  pickle.setAttribute("aria-hidden", "true");
  pickle.innerHTML =
    '<span class="bubble" id="bubble" aria-live="polite"></span>' +
    '<svg class="pickle-body" viewBox="0 0 100 100" focusable="false" aria-hidden="true">' +
      '<g class="body-anim">' +
        '<g fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round">' +
          '<path d="M31 25v51M69 25v51M31 51h38M31 76h38"/>' +
        "</g>" +
        '<circle cx="43" cy="37" r="4.4" fill="#242424"/>' +
        '<circle cx="57" cy="37" r="4.4" fill="#242424"/>' +
        '<ellipse cx="36" cy="45" rx="4.8" ry="2.7" fill="#ffffff" opacity=".45"/>' +
        '<ellipse cx="64" cy="45" rx="4.8" ry="2.7" fill="#ffffff" opacity=".45"/>' +
      "</g>" +
    "</svg>";
  var bubble = pickle.querySelector("#bubble");

  function setBubble(text) {
    if (!bubble) return;
    bubble.textContent = text;
    bubble.classList.remove("pop");
    void bubble.offsetWidth;
    bubble.classList.add("pop");
  }

  function currentSlot() {
    return house.querySelector(".pickle-slot");
  }

  function placePickle(slot) {
    if (!slot || pickle.parentElement === slot) return;
    slot.appendChild(pickle);
  }

  function movePickle(key) {
    var room = house.querySelector('.room[data-room="' + key + '"]');
    if (!room) return;
    var slot = room.querySelector(".pickle-slot");
    if (!slot || pickle.parentElement === slot) return;

    if (reduceMotion || !pickle.animate) {
      placePickle(slot);
      return;
    }

    var first = pickle.getBoundingClientRect();
    placePickle(slot);
    var last = pickle.getBoundingClientRect();
    var dx = first.left - last.left;
    var dy = first.top - last.top;

    pickle.animate(
      [
        { transform: "translate(" + dx + "px," + dy + "px)" },
        { transform: "translate(" + dx * 0.45 + "px," + (dy * 0.45 - 26) + "px)", offset: 0.55 },
        { transform: "translate(0, 0)" }
      ],
      { duration: 620, easing: "cubic-bezier(.3,.85,.3,1)" }
    );
  }

  /* ---------------- 상세 시트 ---------------- */
  var lastFocus = null;

  function ddayLabel(dueISO) {
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var p = dueISO.split("-");
    var target = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    var diff = Math.round((target - today) / 86400000);
    if (diff === 0) return { text: "오늘 마감", cls: "today", item: "item--today" };
    if (diff > 0) return { text: "D-" + diff, cls: diff <= 3 ? "soon" : "open", item: diff <= 3 ? "item--soon" : "item--" };
    return { text: "마감 지남", cls: "wait", item: "item--" };
  }

  function buildSheet(key) {
    var data = ROOMS[key];
    if (!data) return;

    sheetKicker.textContent = data.tag;
    sheetTitle.textContent = data.icon + " " + data.name;
    sheetBody.textContent = "";

    data.items.forEach(function (item) {
      var chip;
      if (item.due) {
        chip = ddayLabel(item.due);
      } else {
        var s = STATE_LABEL[item.state] || STATE_LABEL.open;
        chip = { text: s.text, cls: s.cls, item: s.item };
      }

      var li = document.createElement("div");
      li.className = "item " + (chip.item || "");

      var badge = document.createElement("span");
      badge.className = "chip chip--" + chip.cls;
      badge.textContent = chip.text;

      var title = document.createElement("p");
      title.className = "item-title";
      title.textContent = item.title;

      var meta = document.createElement("p");
      meta.className = "item-meta";
      meta.textContent = item.meta;

      li.appendChild(badge);
      li.appendChild(title);
      li.appendChild(meta);
      sheetBody.appendChild(li);
    });

    if (data.note) {
      var note = document.createElement("p");
      note.className = "sheet-note";
      note.textContent = data.note;
      sheetBody.appendChild(note);
    }
  }

  function openSheet(key) {
    lastFocus = document.activeElement;
    buildSheet(key);
    sheet.hidden = false;
    scrim.hidden = false;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(function () {
      sheet.classList.add("is-open");
      scrim.classList.add("show");
      sheet.setAttribute("aria-hidden", "false");
      sheetClose.focus({ preventScroll: true });
    });
  }

  function closeSheet() {
    if (!sheet.classList.contains("is-open")) return;
    sheet.classList.remove("is-open");
    scrim.classList.remove("show");
    sheet.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    window.setTimeout(function () {
      if (!sheet.classList.contains("is-open")) {
        sheet.hidden = true;
        scrim.hidden = true;
      }
    }, reduceMotion ? 0 : 380);

    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  /* ---------------- 방 선택 ---------------- */
  function selectRoom(key) {
    var room = house.querySelector('.room[data-room="' + key + '"]');
    if (!room) return;

    house.querySelectorAll(".room.is-active").forEach(function (r) {
      r.classList.remove("is-active");
    });
    room.classList.add("is-active");

    movePickle(key);
    setBubble(ROOMS[key].bubble);
    openSheet(key);
  }

  house.querySelectorAll(".room").forEach(function (room) {
    var btn = room.querySelector(".room-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      selectRoom(room.getAttribute("data-room"));
    });
  });

  sheetClose.addEventListener("click", closeSheet);
  scrim.addEventListener("click", closeSheet);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeSheet();
      return;
    }
    if (e.key === "Tab" && sheet.classList.contains("is-open")) {
      var focusables = sheet.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      var firstEl = focusables[0];
      var lastEl = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
  });

  /* ---------------- 배우자 피클 ---------------- */
  if (spouseBtn && spouseBubble) {
    var spouseLines = [
      "오늘도 평화롭네요 🍵",
      "종화 님, 물 한 잔 어떠세요?",
      "거실 불은 제가 켜 둘게요 🌙",
      "하뚜는 잘 자고 있을까요?"
    ];
    var spouseIdx = 0;
    var spouseTimer = null;

    spouseBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      spouseIdx = (spouseIdx + 1) % spouseLines.length;
      spouseBubble.textContent = spouseLines[spouseIdx];
      spouseBubble.classList.add("show");
      window.clearTimeout(spouseTimer);
      spouseTimer = window.setTimeout(function () {
        spouseBubble.classList.remove("show");
      }, 4200);
    });
  }

  /* ---------------- 램프(낮/밤) ---------------- */
  var THEME_KEY = "pickle-house.theme";

  function applyTheme(theme) {
    var night = theme === "night";
    document.documentElement.setAttribute("data-theme", night ? "night" : "day");
    lampBtn.setAttribute("aria-pressed", night ? "true" : "false");
    lampIcon.textContent = night ? "☀️" : "🌙";
    lampLabel.textContent = night ? "낮 켜기" : "밤 켜기";
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", night ? "#191614" : "#FBF5E9");
  }

  (function initTheme() {
    var saved = null;
    try { saved = window.localStorage.getItem(THEME_KEY); } catch (err) { saved = null; }
    applyTheme(saved === "night" ? "night" : "day");
  })();

  lampBtn.addEventListener("click", function () {
    var next = document.documentElement.getAttribute("data-theme") === "night" ? "day" : "night";
    applyTheme(next);
    try { window.localStorage.setItem(THEME_KEY, next); } catch (err) { /* 저장이 막혀도 동작만 */ }
  });

  /* ---------------- 할 일 메모장 ---------------- */
  var TODO_KEY = "pickle-house.todos.v1";
  var memoForm = $("#memoForm");
  var memoInput = $("#memoInput");
  var memoList = $("#memoList");
  var memoEmpty = $("#memoEmpty");
  var memoCount = $("#memoCount");
  var memoClear = $("#memoClear");
  var todos = loadTodos();

  function loadTodos() {
    try {
      var raw = window.localStorage.getItem(TODO_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(function (t) { return t && typeof t.text === "string" && t.text.trim(); })
        .map(function (t) {
          return {
            id: String(t.id || Math.random().toString(36).slice(2)),
            text: String(t.text).slice(0, 120),
            done: !!t.done
          };
        });
    } catch (err) {
      return [];
    }
  }

  function saveTodos() {
    try { window.localStorage.setItem(TODO_KEY, JSON.stringify(todos)); } catch (err) { /* 무시 */ }
  }

  function renderTodos() {
    memoList.textContent = "";

    todos.forEach(function (todo) {
      var li = document.createElement("li");
      li.className = "memo-item" + (todo.done ? " done" : "");
      li.dataset.id = todo.id;

      var tick = document.createElement("button");
      tick.type = "button";
      tick.className = "tick";
      tick.setAttribute("role", "checkbox");
      tick.setAttribute("aria-checked", todo.done ? "true" : "false");
      tick.setAttribute("aria-label", (todo.done ? "완료 취소: " : "완료 표시: ") + todo.text);

      var text = document.createElement("span");
      text.className = "memo-text";
      text.textContent = todo.text;

      var del = document.createElement("button");
      del.type = "button";
      del.className = "memo-del";
      del.setAttribute("aria-label", "삭제: " + todo.text);
      del.textContent = "✕";

      li.appendChild(tick);
      li.appendChild(text);
      li.appendChild(del);
      memoList.appendChild(li);
    });

    var left = todos.filter(function (t) { return !t.done; }).length;
    memoCount.textContent = left + "개 남음";
    memoEmpty.hidden = todos.length > 0;
  }

  memoForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var value = memoInput.value.trim();
    if (!value) {
      memoInput.focus();
      return;
    }
    todos.unshift({
      id: Math.random().toString(36).slice(2),
      text: value.slice(0, 120),
      done: false
    });
    memoInput.value = "";
    saveTodos();
    renderTodos();
    memoInput.focus();
  });

  memoList.addEventListener("click", function (e) {
    var tick = e.target.closest(".tick");
    var del = e.target.closest(".memo-del");
    var item = e.target.closest(".memo-item");
    if (!item) return;
    var id = item.dataset.id;

    if (tick) {
      todos = todos.map(function (t) {
        return t.id === id ? { id: t.id, text: t.text, done: !t.done } : t;
      });
      saveTodos();
      renderTodos();
      return;
    }

    if (del) {
      todos = todos.filter(function (t) { return t.id !== id; });
      saveTodos();
      renderTodos();
    }
  });

  memoClear.addEventListener("click", function () {
    var remaining = todos.filter(function (t) { return !t.done; });
    if (remaining.length === todos.length) return;
    todos = remaining;
    saveTodos();
    renderTodos();
  });

  /* ---------------- 시작 ---------------- */
  updateDate();
  window.setInterval(updateDate, 30000);

  renderTodos();
  placePickle(currentSlot() || document.querySelector(".pickle-slot"));
  setBubble(greeting(new Date()) + ", 종화 님. 방을 눌러 보세요.");
})();
