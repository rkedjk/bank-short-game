// ============================================================
//  «Банк в шорте» — учебный симулятор валютных операций
//  Объясняет, почему "курс вырос" — это убыток для банка,
//  который продал доллары (сел в шорт).
// ============================================================

// ---------- Типы ----------
type Side = "short" | "long" | null;

interface Pos {
  side: Side;
  amount: number; // объём в USD (всегда 0 или 1 000 000)
  entry: number; // курс открытия
}

interface Game {
  usd: number; // доллары в наличии у банка
  jpy: number; // йены в наличии у банка
  pos: Pos;
  lastClose: { pnl: number; text: string } | null;
}

// ---------- Утилиты ----------
const $ = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

const fmt = (n: number): string => Math.round(n).toLocaleString("ru-RU");
const fmtRate = (n: number): string => n.toFixed(2);
const now = (): string =>
  new Date().toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

// ---------- Состояние ----------
const AMOUNT = 1_000_000;
const SANDBOX_START_JPY = 200_000_000;

let rate = 109.78;
let lastRate = 109.78;
let mode: "scenario" | "sandbox" = "scenario";

const scenario: Game = {
  usd: AMOUNT,
  jpy: 0,
  pos: { side: null, amount: 0, entry: 0 },
  lastClose: null,
};

const sandbox: Game = {
  usd: 0,
  jpy: SANDBOX_START_JPY,
  pos: { side: null, amount: 0, entry: 0 },
  lastClose: null,
};

let scenarioStep = 0; // 0 продажа · 1 движение · 2 рост/клиент · 3 разбор · 4 викторина
let quizScore = 0;
interface LogEntry {
  t: string;
  text: string;
  cls: "up" | "down" | "";
}
const sandboxLog: LogEntry[] = [];

// ---------- DOM ----------
const elRate = $("rate");
const elRateDelta = $("rate-delta");
const elRateNote = $("rate-note");
const elSlider = $<HTMLInputElement>("rate-slider");
const elVaultUsd = $("vault-usd");
const elVaultUsdNote = $("vault-usd-note");
const elVaultJpy = $("vault-jpy");
const elVaultJpyNote = $("vault-jpy-note");
const elVaults = $("vaults");
const elPosSide = $("pos-side");
const elPosAmount = $("pos-amount");
const elPosEntry = $("pos-entry");
const elPnl = $("pnl");
const elScenario = $("scenario");
const elSandbox = $("sandbox");
const elQuiz = $("quiz");
const elProgress = $("scenario-progress");
const elLesson = $("lesson");
const elLessonActions = $("lesson-actions");
const elQuizQuestions = $("quiz-questions");
const elSbLog = $("sb-log");

// ---------- DOM-хелперы (без innerHTML) ----------
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

// Вставляет текст с поддержкой **жирного** (безопасно, без innerHTML)
function rich(node: HTMLElement, text: string): void {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    if (i % 2 === 1) {
      const s = document.createElement("strong");
      s.textContent = part;
      node.appendChild(s);
    } else {
      node.appendChild(document.createTextNode(part));
    }
  }
}

function lesson(title: string): void {
  elLesson.replaceChildren();
  elLesson.appendChild(el("h2", "lesson-title", title));
}
function p(text: string): HTMLElement {
  const n = el("p");
  rich(n, text);
  elLesson.appendChild(n);
  return n;
}
function key(text: string, cls?: string): HTMLElement {
  const n = el("div", cls ? `key ${cls}` : "key");
  rich(n, text);
  elLesson.appendChild(n);
  return n;
}
function math(lines: Array<[string, "neg" | "pos" | "dim" | ""]>): void {
  const box = el("div", "math");
  for (const [t, cls] of lines) {
    const line = el("div", cls, t);
    box.appendChild(line);
  }
  elLesson.appendChild(box);
}
function actions(...btns: HTMLButtonElement[]): void {
  elLessonActions.replaceChildren(...btns);
}
function btn(
  cls: string,
  text: string,
  onClick: () => void,
): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = `btn ${cls}`;
  b.textContent = text;
  b.addEventListener("click", onClick);
  return b;
}

// ---------- Сделки ----------
function openTrade(g: Game, side: "short" | "long"): void {
  g.pos = { side, amount: AMOUNT, entry: rate };
  if (side === "short") {
    // продаём доллары: отдаём 1 млн USD (уходим в долг перед клиентом), получаем йены
    g.usd = -AMOUNT;
    g.jpy += rate * AMOUNT;
  } else {
    // покупаем доллары: отдаём йены, получаем 1 млн USD
    g.usd = AMOUNT;
    g.jpy -= rate * AMOUNT;
  }
  g.lastClose = null;
}

// PnL открытой позиции в йенах
function openPnl(g: Game): number {
  if (!g.pos.side) return 0;
  // йены считаем целыми, чтобы не копить ошибки плавающей точки
  return g.pos.side === "short"
    ? Math.round((g.pos.entry - rate) * g.pos.amount)
    : Math.round((rate - g.pos.entry) * g.pos.amount);
}

// Закрыть позицию по текущему курсу, вернуть зафиксированный PnL
function closeTrade(g: Game): number {
  const pnl = openPnl(g);
  if (g.pos.side === "short") {
    // откупаем доллары, чтобы вернуть клиенту: платим йенами
    g.jpy -= rate * g.pos.amount;
    g.usd = 0; // долг погашен, своих долларов нет
  } else if (g.pos.side === "long") {
    // продаём доллары обратно
    g.jpy += rate * g.pos.amount;
    g.usd = 0;
  }
  g.pos = { side: null, amount: 0, entry: 0 };
  return pnl;
}

function setRate(v: number): void {
  lastRate = rate;
  rate = Math.round(v * 100) / 100;
  elSlider.value = String(rate);
  renderBoard();
}

// ---------- Рендер ----------
function renderBoard(): void {
  const g = mode === "scenario" ? scenario : sandbox;
  const up = rate > lastRate;
  const down = rate < lastRate;

  elRate.textContent = fmtRate(rate);
  elRate.className = `ticker-value ${down ? "down" : up ? "up" : ""}`;
  elRateDelta.textContent = `${up ? "▲" : down ? "▼" : "•"} ${fmtRate(Math.abs(rate - lastRate))}`;
  elRateDelta.className = `ticker-delta ${down ? "down" : up ? "up" : ""}`;

  // Подсказка: для шортиста зелёный рост = плохо
  const short = g.pos.side === "short";
  if (g.pos.side) {
    const dirWord = up
      ? "курс растёт"
      : down
        ? "курс падает"
        : "курс без движения";
    elRateNote.textContent = short
      ? `Банк в ШОРТЕ: ${dirWord} → ${up ? "откупать дороже = ПЛОХО" : down ? "откупать дешевле = ХОРОШО" : ""}`
      : `${dirWord} → ${up ? "доллары дорожают = ХОРОШО" : down ? "доллары дешевеют = ПЛОХО" : ""}`;
  } else {
    elRateNote.textContent =
      "Пока нет открытой позиции — двигай курс и открывай сделки";
  }

  // Ящики
  elVaultUsd.textContent = fmt(g.usd);
  elVaultUsd.className = `vault-amount${g.usd < 0 ? " debt" : ""}`;
  if (g.pos.side === "short") {
    elVaultUsdNote.textContent = "⚠️ банк ДОЛЖЕН клиенту 1 000 000 USD";
  } else if (g.usd === 0) {
    elVaultUsdNote.textContent = "своих долларов нет";
  } else {
    elVaultUsdNote.textContent = "свои";
  }

  elVaultJpy.textContent = fmt(g.jpy);
  elVaultJpy.className = `vault-amount${g.jpy < 0 ? " debt" : ""}`;
  elVaultJpyNote.textContent = g.lastClose
    ? `последняя сделка: ${g.lastClose.text}`
    : g.pos.side === "short"
      ? "йены от продажи долларов"
      : g.pos.side === "long"
        ? "заплачено за доллары"
        : "—";

  // Позиция
  elPosSide.textContent = g.pos.side
    ? g.pos.side === "short"
      ? "SHORT"
      : "LONG"
    : "—";
  elPosSide.className = g.pos.side ?? "";
  elPosAmount.textContent = g.pos.side
    ? `${fmt(g.pos.amount)} USD`
    : g.lastClose
      ? "закрыто"
      : "нет сделок";
  elPosEntry.textContent = g.pos.side ? `@ ${fmtRate(g.pos.entry)}` : "";

  // PnL
  const pnl = g.pos.side ? openPnl(g) : (g.lastClose?.pnl ?? 0);
  elPnl.textContent = `Прибыль/убыток: ${pnl < 0 ? "−" : "+"}¥${fmt(Math.abs(pnl))}`;
  elPnl.className = `pnl ${pnl > 0 ? "up" : pnl < 0 ? "down" : "flat"}`;
  elPnl.classList.add("flash");
  setTimeout(() => elPnl.classList.remove("flash"), 500);
}

function flashSwap(): void {
  elVaults.classList.remove("swap");
  void elVaults.offsetWidth; // перезапуск анимации
  elVaults.classList.add("swap");
}

// ---------- Сценарий ----------
const SCENARIO_TITLES = [
  "Продажа",
  "Движение курса",
  "Рост курса",
  "Разбор",
  "Викторина",
];

function renderScenario(): void {
  elProgress.replaceChildren(
    ...SCENARIO_TITLES.map((t, i) => {
      const cls =
        i < scenarioStep ? "done" : i === scenarioStep ? "active" : "";
      const dot = el("span", `step-dot ${cls}`, String(i + 1));
      dot.title = t;
      return dot;
    }),
  );

  switch (scenarioStep) {
    case 0:
      renderStep0();
      break;
    case 1:
      renderStep1();
      break;
    case 2:
      renderStep2();
      break;
    case 3:
      renderStep3();
      break;
    case 4:
      renderStep4();
      break;
  }
  elSlider.disabled = scenarioStep !== 1 && scenarioStep !== 2;
  renderBoard();
}

function renderStep0(): void {
  lesson("Шаг 1. Продажа долларов");
  p(
    "У банка лежит **1 000 000 USD** клиента. Банк считает, что доллар скоро **подешевеет** относительно йены. Поэтому он решает сыграть на этом: **продать доллары сейчас**, а позже откупить их **дешевле** и заработать на разнице. Это называется **короткая позиция (шорт)**.",
  );
  key(
    `💡 Курс сейчас: **${fmtRate(rate)} ¥ за 1 USD**. Продав 1 млн USD, банк получит **${fmt(AMOUNT * 109.78)} ¥**.`,
  );
  actions(
    btn("btn-sell", `Продать 1 000 000 USD за ¥ по ${fmtRate(rate)}`, () => {
      if (rate !== 109.78) setRate(109.78); // фиксируем курс из задачи
      openTrade(scenario, "short");
      flashSwap();
      scenarioStep = 1;
      renderScenario();
    }),
  );
}

function renderStep1(): void {
  lesson("Шаг 2. Банк ждёт падения");
  p(
    "Банк продал доллары. Теперь **долларов у банка нет** — он их **должен** клиенту. Зато у банка **" +
      fmt(109.78 * AMOUNT) +
      " ¥** от продажи.",
  );
  key(
    `🎯 Банк надеется, что курс **упадёт ниже ${fmtRate(scenario.pos.entry)}**. Тогда он откупит доллары дешевле и заработает.`,
    "good",
  );
  p(
    "Покрути ползунок курса и посмотри на строку **«Прибыль/убыток»**: как только курс поднимается выше **" +
      fmtRate(scenario.pos.entry) +
      "** — убыток растёт (красный).",
  );
  key(
    "⚠️ ВАЖНО: для банка, который **продал** доллары (шорт), **рост** курса — это **плохо**. Долларов у него нет, их нужно откупать обратно, а они стали **дороже**. «Курс вырос» радует только того, у кого доллары **есть**.",
    "bad",
  );
  actions(
    btn("btn-primary", "📈 Курс вырос до 119,58 (как в задаче)", () => {
      setRate(119.58);
      scenarioStep = 2;
      renderScenario();
    }),
  );
}

function renderStep2(): void {
  lesson("Шаг 3. Курс вырос — и это проблема");
  p(`Курс вырос до **${fmtRate(rate)}**. Банк ошибся в расчётах.`);
  key(
    `🚨 Клиент требует вернуть его **1 000 000 USD**. Долларов у банка нет — их надо **купить** по текущему (выросшему) курсу ${fmtRate(rate)}. Сейчас 1 млн USD стоит **${fmt(rate * AMOUNT)} ¥** вместо ${fmt(109.78 * AMOUNT)} ¥, полученных при продаже.`,
    "bad",
  );
  p(
    `Вот и прикол: банк продал доллары по **109,78**, а откупать должен по **${fmtRate(rate)}** — **дороже**. Разница и есть убыток.`,
  );
  actions(
    btn("btn-buy", "Исполнить: купить 1 000 000 USD и вернуть клиенту", () => {
      const pnl = closeTrade(scenario);
      scenario.lastClose = {
        pnl,
        text: `${scenario.pos.entry < rate ? "убыток" : "прибыль"} ${fmt(Math.abs(pnl))} ¥`,
      };
      flashSwap();
      scenarioStep = 3;
      renderScenario();
    }),
  );
}

function renderStep3(): void {
  lesson("Шаг 4. Итог");
  math([
    ["Продал 1 000 000 USD по 109,78   → +109 780 000 ¥", ""],
    ["Купил  1 000 000 USD по 119,58   → −119 580 000 ¥", ""],
    ["───────────────────────────────────────────────", "dim"],
    ["Итог:  −9 800 000 ¥   (убыток банка)", "neg"],
  ]);
  key(
    "📉 **Банк потерял 9 800 000 ¥.** Потому что продал доллары, а когда понадобилось их вернуть — они уже стоили дороже.",
    "bad",
  );
  key(
    "🧠 Аналогия: продал машину за **100** (думал, подешевеет), а она подорожала до **150**. Теперь, чтобы «вернуть» машину, её нужно откупить за **150** — потерял **50**. Для шортиста «цена выросла» — это убыток.",
  );
  actions(
    btn("btn-primary", "✅ Перейти к проверке понимания", () => {
      scenarioStep = 4;
      renderScenario();
    }),
  );
}

function renderStep4(): void {
  elScenario.classList.add("hidden");
  elQuiz.classList.remove("hidden");
  quizScore = 0;
  renderQuiz();
}

// ---------- Викторина ----------
interface Q {
  text: string;
  options: { label: string; right: boolean }[];
  expl: string;
}

const QUESTIONS: Q[] = [
  {
    text: "Банк продал 1 млн USD за ¥ по курсу 109,78 (шорт). Курс вырос до 119,58. Что с банком?",
    options: [
      { label: "Заработал 9 800 000 ¥", right: false },
      { label: "Потерял 9 800 000 ¥", right: true },
      { label: "Ничего не изменилось — курс же просто вырос", right: false },
    ],
    expl: "Правильно! (119,58 − 109,78) × 1 000 000 = −9 800 000 ¥. Банк продал доллары, но должен их вернуть — откупал дороже.",
  },
  {
    text: "Почему рост курса — это плохо для банка, который продал доллары?",
    options: [
      {
        label:
          "Потому что у банка больше нет долларов: их нужно покупать обратно дороже",
        right: true,
      },
      { label: "Потому что йена подешевела", right: false },
      { label: "Потому что клиент может расстроиться", right: false },
    ],
    expl: "Да. Банк продал доллары и остался «в долгу»: вернуть клиенту доллары можно, только купив их заново — уже по более высокой цене.",
  },
  {
    text: "При каком курсе закрытия банк вышел бы «в ноль» (без прибыли и без убытка)?",
    options: [
      { label: "119,58", right: false },
      { label: "109,78", right: true },
      { label: "99,78", right: false },
    ],
    expl: "Ноль — когда откупил по той же цене, что продал: 109,78. Ниже этого — прибыль, выше — убыток.",
  },
];

function renderQuiz(): void {
  elQuizQuestions.replaceChildren();
  quizScore = 0;

  const scoreEl = el("div", "key");
  scoreEl.id = "quiz-score";
  elQuizQuestions.appendChild(scoreEl);

  for (const [qi, q] of QUESTIONS.entries()) {
    const box = el("div", "q");
    const qh = el("div", "q-text", `${qi + 1}. ${q.text}`);
    const opts = el("div", "q-options");
    const expl = el("div", "q-expl");
    box.append(qh, opts, expl);

    const btns: HTMLButtonElement[] = [];
    for (const o of q.options) {
      const b = document.createElement("button");
      b.className = "q-opt";
      b.textContent = o.label;
      b.addEventListener("click", () => {
        if (b.disabled) return;
        for (const [j, oo] of q.options.entries()) {
          btns[j].classList.add(oo.right ? "right" : "wrong");
          btns[j].disabled = true;
        }
        if (o.right) quizScore++;
        expl.textContent = o.right
          ? "✅ Верно! " + q.expl
          : "❌ Нет. " + q.expl;
        updateQuizScore();
      });
      btns.push(b);
      opts.appendChild(b);
    }

    elQuizQuestions.appendChild(box);
  }

  elQuizQuestions.appendChild(
    btn("btn-primary", "🔄 Пройти сценарий заново", resetScenario),
  );
}

function updateQuizScore(): void {
  const s = $<HTMLElement>("quiz-score");
  s.textContent =
    quizScore >= QUESTIONS.length
      ? `🎉 Все ответы верные (${quizScore}/${QUESTIONS.length}). Ты поняла, почему «курс вырос» — это убыток для шортиста!`
      : quizScore > 0
        ? `Верно ${quizScore} из ${QUESTIONS.length}. Если что-то не так — прокрути разбор ещё раз.`
        : "Пока ни одного верного — загляни в разбор на шаге 4.";
}

function resetScenario(): void {
  Object.assign(scenario, {
    usd: AMOUNT,
    jpy: 0,
    pos: { side: null, amount: 0, entry: 0 },
    lastClose: null,
  });
  scenarioStep = 0;
  quizScore = 0;
  elQuiz.classList.add("hidden");
  elScenario.classList.remove("hidden");
  if (mode !== "scenario") switchMode("scenario");
  setRate(109.78);
  renderScenario();
}

// ---------- Песочница ----------
function renderSandboxLog(): void {
  elSbLog.replaceChildren();
  for (const l of sandboxLog) {
    const row = el("div", "entry");
    const time = el("span", "t", l.t + "  ");
    row.appendChild(time);
    rich(row, l.text);
    if (l.cls) {
      const out = el("span", l.cls, l.text);
      row.replaceChildren(time, out);
    }
    elSbLog.appendChild(row);
  }
  elSbLog.scrollTop = elSbLog.scrollHeight;
}

function logEntry(text: string, cls: LogEntry["cls"] = ""): void {
  sandboxLog.push({ t: now(), text, cls });
}

function initSandbox(): void {
  $("sb-short").addEventListener("click", () => {
    if (sandbox.pos.side) {
      logEntry("⚠️ Сначала закрой текущую позицию");
    } else {
      openTrade(sandbox, "short");
      flashSwap();
      logEntry(`📌 Открыт SHORT 1 000 000 USD @ ${fmtRate(sandbox.pos.entry)}`);
    }
    renderSandboxLog();
    renderBoard();
  });

  $("sb-long").addEventListener("click", () => {
    if (sandbox.pos.side) {
      logEntry("⚠️ Сначала закрой текущую позицию");
    } else {
      openTrade(sandbox, "long");
      flashSwap();
      logEntry(`📌 Открыт LONG 1 000 000 USD @ ${fmtRate(sandbox.pos.entry)}`);
    }
    renderSandboxLog();
    renderBoard();
  });

  $("sb-close").addEventListener("click", () => {
    if (sandbox.pos.side) {
      const side = sandbox.pos.side;
      const pnl = closeTrade(sandbox);
      sandbox.lastClose = {
        pnl,
        text: `${pnl < 0 ? "убыток" : "прибыль"} ${fmt(Math.abs(pnl))} ¥`,
      };
      flashSwap();
      logEntry(
        `🔒 Закрыт ${side.toUpperCase()} @ ${fmtRate(rate)} → ${pnl >= 0 ? "+" : "−"}${fmt(Math.abs(pnl))} ¥`,
        pnl >= 0 ? "up" : "down",
      );
    } else {
      logEntry("ℹ️ Нет открытой позиции");
    }
    renderSandboxLog();
    renderBoard();
  });
}

// ---------- Переключение вкладок ----------
function switchMode(m: "scenario" | "sandbox"): void {
  mode = m;
  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.toggle("active", t.getAttribute("data-tab") === m);
  });
  elScenario.classList.toggle("hidden", m !== "scenario");
  elSandbox.classList.toggle("hidden", m !== "sandbox");
  if (scenarioStep === 4 && m === "scenario") {
    elQuiz.classList.remove("hidden");
  } else {
    elQuiz.classList.add("hidden");
  }
  elSlider.disabled =
    m === "scenario" && scenarioStep !== 1 && scenarioStep !== 2;
  renderBoard();
}

// ---------- Инициализация ----------
document.querySelectorAll(".tab").forEach((t) => {
  t.addEventListener("click", () =>
    switchMode(t.getAttribute("data-tab") as "scenario" | "sandbox"),
  );
});

elSlider.addEventListener("input", () => {
  setRate(parseFloat(elSlider.value));
});

setRate(109.78);
renderScenario();
initSandbox();
switchMode("scenario");
renderSandboxLog();
