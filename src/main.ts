// ============================================================
//  «Банк в шорте» — учебный симулятор валютных операций
//  Объясняет, почему "курс вырос" — это убыток для банка,
//  который продал валюту (сел в шорт).
// ============================================================

// ---------- Типы ----------
type Side = "short" | "long" | null;

interface Pos {
  side: Side;
  amount: number; // объём в базовой валюте
  entry: number; // курс открытия
}

interface Game {
  base: number; // базовой валюты в наличии у банка
  quote: number; // котировки в наличии у банка
  pos: Pos;
  lastClose: { pnl: number; text: string } | null;
}

interface Scenario {
  id: string;
  pair: string; // "USD/JPY"
  base: string; // "USD" — базовая валюта (объём в ней)
  quote: string; // "JPY" — котировка
  baseSym: string; // "$" | "¥" | "₽"
  quoteSym: string;
  baseEmoji: string; // 💵 | 💴 | 💰
  quoteEmoji: string;
  entry: number; // курс продажи (стартовый)
  exit: number; // курс, до которого вырос (развязка задачки)
  digits: number; // точность курса: 2 | 4
  amount: number; // объём в базовой валюте
  sandboxCapital: number; // стартовый капитал песочницы в quote-валюте
  texts: {
    intro: string;
    wait: string;
    rise: string;
    result: string;
    analogy: string;
    quiz: [string, string, string];
  };
}

// ---------- Утилиты ----------
const $ = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

const fmt = (n: number): string => Math.round(n).toLocaleString("ru-RU");
const fmtRate = (n: number, digits: number): string =>
  n.toFixed(digits).replace(".", ",");
const now = (): string =>
  new Date().toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
const money = (n: number, sym: string): string =>
  `${n < 0 ? "−" : ""}${sym}${fmt(Math.abs(n))}`;

// ---------- Сценарии (каждая пара — отдельная задачка со своей текстовкой) ----------
const CURRENCY_NAMES: Record<string, string> = {
  USD: "Доллары",
  JPY: "Йены",
  RUB: "Рубли",
};

const SCENARIOS: Scenario[] = [
  {
    id: "usdjpy",
    pair: "USD/JPY",
    base: "USD",
    quote: "JPY",
    baseSym: "$",
    quoteSym: "¥",
    baseEmoji: "💵",
    quoteEmoji: "💴",
    entry: 109.78,
    exit: 119.58,
    digits: 2,
    amount: 1_000_000,
    sandboxCapital: 200_000_000,
    texts: {
      intro:
        "У банка лежит **{amt} USD** клиента, который просит перевести их в йены. Банк уверен, что доллар скоро **подешевеет**, поэтому решает сыграть на этом: продать доллары сейчас по {entry} ¥ за доллар, а позже откупить их **дешевле** и заработать на разнице. Это называется **короткая позиция (шорт)**.",
      wait: "Банк продал доллары. Теперь **долларов у банка нет** — он их **должен** клиенту. Зато у банка {gain} ¥ от продажи. Банк ждёт, что курс **упадёт ниже {entry}** — тогда откупит доллары дешевле и заработает. Покрути ползунок: как только курс поднимается выше {entry} — убыток растёт (красный).",
      rise: "Курс вырос до **{exit}** — доллар подорожал, банк ошибся в расчётах. Клиент требует вернуть его **{amt} USD**: долларов у банка нет, их надо **купить** по текущему курсу {exit}. Сейчас {amt} USD стоит {cost} ¥ вместо {gain} ¥, полученных при продаже.",
      result:
        "Вот и прикол: банк продал доллары по **{entry}**, а откупать должен по **{exit}** — **дороже**. Разница и есть убыток.",
      analogy:
        "Продал машину за **100** (думал, подешевеет), а она подорожала до **150** — чтобы «вернуть» машину, её нужно откупить за **150**; потерял **50**. Для шортиста «цена выросла» — это убыток.",
      quiz: [
        "Банк продал {amt} USD за йены по {entry} (шорт). Курс вырос до {exit}. Что с банком?",
        "Почему рост курса — это плохо для банка, который продал доллары?",
        "При каком курсе закрытия банк вышел бы «в ноль» (без прибыли и без убытка)?",
      ],
    },
  },
  {
    id: "rubusd",
    pair: "RUB/USD",
    base: "RUB",
    quote: "USD",
    baseSym: "₽",
    quoteSym: "$",
    baseEmoji: "💰",
    quoteEmoji: "💵",
    entry: 0.0111,
    exit: 0.0122,
    digits: 4,
    amount: 100_000_000,
    sandboxCapital: 5_000_000,
    texts: {
      intro:
        "Экспортёр принёс в банк **{amt} RUB** выручки и просит конвертировать их в доллары. Банк считает, что рубль скоро **укрепится** (станет дороже), и решает продать рубли сейчас по {entry} $ за рубль, а позже откупить их **дешевле** — **короткая позиция (шорт)** по рублю.",
      wait: "Рубли проданы: банк **должен их экспортёру**, зато у банка {gain} $ от продажи. Банк ждёт, что курс **упадёт ниже {entry}** — тогда откупит рубли дешевле и заработает. Покрути ползунок: рост курса выше {entry} — убыток (красный).",
      rise: "Курс вырос до **{exit}** — рубль подорожал, банк ошибся в расчётах. Экспортёр требует вернуть **{amt} RUB**: откупать рубли по {exit} $ вместо {entry}.",
      result:
        "Итог: банк продал рубли по **{entry}**, а откупать должен по **{exit}** — **дороже**. Разница и есть убыток.",
      analogy:
        "Ты продал свою коллекцию за **100** (был уверен, что подешевеет), а она подорожала до **150** — обратно откупать за **150**; потерял **50**. Для шортиста «цена выросла» — это убыток.",
      quiz: [
        "Экспортёр сдал в банк 100 млн рублей. Банк продал их за доллары по 0,0111 (шорт рубля). Курс вырос до 0,0122. Что с банком?",
        "Почему рост курса — это плохо для банка, который продал рубли?",
        "При каком курсе закрытия банк вышел бы «в ноль»?",
      ],
    },
  },
  {
    id: "usdrub",
    pair: "USD/RUB",
    base: "USD",
    quote: "RUB",
    baseSym: "$",
    quoteSym: "₽",
    baseEmoji: "💵",
    quoteEmoji: "💰",
    entry: 90.0,
    exit: 95.0,
    digits: 2,
    amount: 1_000_000,
    sandboxCapital: 10_000_000_000,
    texts: {
      intro:
        "Импортёр платит поставщику **{amt} USD** и просит банк продать его доллары за рубли. Банк ставит на **укрепление рубля**: продаёт доллары сейчас по {entry} ₽ за доллар, чтобы позже откупить их **дешевле** — **короткая позиция (шорт)** по доллару.",
      wait: "Доллары проданы: банк **должен их импортёру**. У банка {gain} ₽ от продажи. Банк ждёт курс **ниже {entry}** — тогда откупит доллары дешевле. Выше {entry} — убыток, проверь ползунком.",
      rise: "Курс вырос до **{exit}** — доллар подорожал, банк ошибся в расчётах. Импортёр требует вернуть **{amt} USD**: откупать доллары по {exit} ₽ вместо {entry}.",
      result:
        "Итог: банк продал доллары по **{entry}**, а откупать должен по **{exit}** — **дороже**. Разница и есть убыток.",
      analogy:
        "Продал билеты на концерт за **100**, был уверен, что подешевеют, а они подорожали до **150** — вернуть билеты за **150**; потерял **50**. Для шортиста «цена выросла» — это убыток.",
      quiz: [
        "Импортёр попросил банк продать 1 млн долларов за рубли по 90,0 (шорт доллара). Курс вырос до 95,0. Что с банком?",
        "Почему рост курса — это плохо для банка, который продал доллары?",
        "При каком курсе закрытия банк вышел бы «в ноль»?",
      ],
    },
  },
  {
    id: "jpyusd",
    pair: "JPY/USD",
    base: "JPY",
    quote: "USD",
    baseSym: "¥",
    quoteSym: "$",
    baseEmoji: "💴",
    quoteEmoji: "💵",
    entry: 0.0092,
    exit: 0.0102,
    digits: 4,
    amount: 100_000_000,
    sandboxCapital: 5_000_000,
    texts: {
      intro:
        "Клиент-инвестор просит конвертировать **{amt} JPY** в доллары. Банк считает, что йена скоро **укрепится**, и продаёт йены сейчас по {entry} $ за йену, чтобы позже откупить их **дешевле** — **короткая позиция (шорт)** по йене.",
      wait: "Йены проданы: банк **должен их инвестору**. У банка {gain} $ от продажи. Банк ждёт курс **ниже {entry}** — тогда откупит йены дешевле и заработает. Выше {entry} — убыток, проверь ползунком.",
      rise: "Курс вырос до **{exit}** — йена подорожала, банк ошибся в расчётах. Инвестор требует вернуть **{amt} JPY**: откупать йены по {exit} $ вместо {entry}.",
      result:
        "Итог: банк продал йены по **{entry}**, а откупать должен по **{exit}** — **дороже**. Разница и есть убыток.",
      analogy:
        "Продал редкую монету за **100** (думал, подешевеет), а она подорожала до **150** — откупать за **150**; потерял **50**. Для шортиста «цена выросла» — это убыток.",
      quiz: [
        "Банк продал 100 млн йен за доллары по 0,0092 (шорт йены). Курс вырос до 0,0102. Что с банком?",
        "Почему рост курса — это плохо для банка, который продал йены?",
        "При каком курсе закрытия банк вышел бы «в ноль»?",
      ],
    },
  },
];

// ---------- Расчёты сценария ----------
const gainOf = (s: Scenario): number => Math.round(s.entry * s.amount);
const costOf = (s: Scenario): number => Math.round(s.exit * s.amount);
const lossOf = (s: Scenario): number =>
  Math.round((s.exit - s.entry) * s.amount);

// Подстановка чисел в тексты-задачки: {entry} {exit} {amt} {gain} {cost} {loss} {base} {quote} {bSym} {qSym}
function fill(t: string, s: Scenario): string {
  const rep: Record<string, string> = {
    "{entry}": fmtRate(s.entry, s.digits),
    "{exit}": fmtRate(s.exit, s.digits),
    "{amt}": fmt(s.amount),
    "{gain}": fmt(gainOf(s)),
    "{cost}": fmt(costOf(s)),
    "{loss}": fmt(lossOf(s)),
    "{base}": s.base,
    "{quote}": s.quote,
    "{bSym}": s.baseSym,
    "{qSym}": s.quoteSym,
  };
  return t.replace(
    /\{(entry|exit|amt|gain|cost|loss|base|quote|bSym|qSym)\}/g,
    (m) => rep[m],
  );
}

// ---------- Состояние ----------
let curIdx = 0;
const cur = (): Scenario => SCENARIOS[curIdx];

let rate = SCENARIOS[0].entry;
let mode: "scenario" | "sandbox" = "scenario";

const scenario: Game = {
  base: SCENARIOS[0].amount,
  quote: 0,
  pos: { side: null, amount: 0, entry: 0 },
  lastClose: null,
};

const sandbox: Game = {
  base: 0,
  quote: SCENARIOS[0].sandboxCapital,
  pos: { side: null, amount: 0, entry: 0 },
  lastClose: null,
};

let scenarioStep = 0; // 0 продажа · 1 движение · 2 рост/клиент · 3 разбор · 4 викторина
let quizScore = 0;
interface LogEntry {
  t: string;
  title: string;
  amount: string;
  cls: "up" | "down" | "";
  icon: string;
}
const sandboxLog: LogEntry[] = [];

// ---------- DOM ----------
const elPairSelect = $("pair-select");
const elPairLabel = $("pair-label");
const elRate = $("rate");
const elRateDelta = $("rate-delta");
const elRateNote = $("rate-note");
const elSlider = $<HTMLInputElement>("rate-slider");
const elVaultBase = $("vault-base");
const elVaultBaseLabel = $("vault-base-label");
const elVaultBaseNote = $("vault-base-note");
const elVaultQuote = $("vault-quote");
const elVaultQuoteLabel = $("vault-quote-label");
const elVaultQuoteNote = $("vault-quote-note");
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
const elSbHint = $("sb-hint");
const elSbLog = $("sb-log");
const elThemeToggle = $("theme-toggle");

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
    box.appendChild(el("div", cls, t));
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

// ---------- Курс и слайдер ----------
function setSliderRange(): void {
  const s = cur();
  const span = s.entry * 0.2;
  const step = 1 / 10 ** s.digits;
  const lo = Math.round((s.entry - span) / step) * step;
  const hi = Math.round((s.entry + span) / step) * step;
  elSlider.min = String(lo);
  elSlider.max = String(hi);
  elSlider.step = String(step);
}

function setRate(v: number): void {
  const s = cur();
  rate = Math.round(v * 10 ** s.digits) / 10 ** s.digits;
  elSlider.value = String(rate);
  renderBoard();
}

// ---------- Сделки ----------
function openTrade(g: Game, side: "short" | "long"): void {
  g.pos = { side, amount: cur().amount, entry: rate };
  if (side === "short") {
    g.base = -cur().amount; // продали базовую валюту — ушли в долг
    g.quote += rate * cur().amount;
  } else {
    g.base = cur().amount;
    g.quote -= rate * cur().amount;
  }
  g.lastClose = null;
}

// PnL открытой позиции в quote-валюте
function openPnl(g: Game): number {
  if (!g.pos.side) return 0;
  return g.pos.side === "short"
    ? Math.round((g.pos.entry - rate) * g.pos.amount)
    : Math.round((rate - g.pos.entry) * g.pos.amount);
}

// Закрыть позицию по текущему курсу, вернуть зафиксированный PnL
function closeTrade(g: Game): number {
  const pnl = openPnl(g);
  if (g.pos.side === "short") {
    g.quote -= rate * g.pos.amount; // откупаем базовую валюту, чтобы вернуть
    g.base = 0;
  } else if (g.pos.side === "long") {
    g.quote += rate * g.pos.amount;
    g.base = 0;
  }
  g.pos = { side: null, amount: 0, entry: 0 };
  return pnl;
}

// ---------- Рендер ----------
function renderBoard(): void {
  const s = cur();
  const g = mode === "scenario" ? scenario : sandbox;
  // точка отсчёта дельты: курс открытия позиции, иначе стартовый курс задачки
  const ref = g.pos.side ? g.pos.entry : s.entry;
  const delta = rate - ref;
  const up = delta > 0;
  const down = delta < 0;
  const sym = up ? "▲" : down ? "▼" : "•";
  const cls = down ? "down" : up ? "up" : "";

  elPairLabel.textContent = s.pair;
  elRate.textContent = fmtRate(rate, s.digits);
  elRate.className = `ticker-value ${cls}`;
  elRateDelta.textContent = `${sym} ${fmtRate(Math.abs(delta), s.digits)}`;
  elRateDelta.className = `ticker-delta ${cls}`;
  elRateDelta.title = `Изменение от ${fmtRate(ref, s.digits)} (${
    g.pos.side ? "курс открытия позиции" : "старт задачки"
  })`;

  // Подсказка: для шортиста зелёный рост = плохо
  const baseName = CURRENCY_NAMES[s.base] ?? s.base;
  if (g.pos.side) {
    const dirWord = up
      ? "курс растёт"
      : down
        ? "курс падает"
        : "курс без движения";
    elRateNote.textContent =
      g.pos.side === "short"
        ? `Банк в ШОРТЕ: ${dirWord} → ${up ? "откупать дороже = ПЛОХО" : down ? "откупать дешевле = ХОРОШО" : ""}`
        : `${dirWord} → ${up ? `${baseName} дорожают = ХОРОШО` : down ? `${baseName} дешевеют = ПЛОХО` : ""}`;
  } else {
    elRateNote.textContent =
      "Пока нет открытой позиции — двигай курс и открывай сделки";
  }

  // Ящики
  elVaultBaseLabel.textContent = `${s.baseEmoji} ${baseName} у банка`;
  elVaultQuoteLabel.textContent = `${s.quoteEmoji} ${CURRENCY_NAMES[s.quote] ?? s.quote} у банка`;

  elVaultBase.textContent = fmt(g.base);
  elVaultBase.className = `vault-amount${g.base < 0 ? " debt" : ""}`;
  if (g.pos.side === "short") {
    elVaultBaseNote.textContent = `⚠️ банк ДОЛЖЕН клиенту ${fmt(s.amount)} ${s.base}`;
  } else if (g.base === 0) {
    elVaultBaseNote.textContent = `своих ${s.base} нет`;
  } else {
    elVaultBaseNote.textContent = "свои";
  }

  elVaultQuote.textContent = fmt(g.quote);
  elVaultQuote.className = `vault-amount${g.quote < 0 ? " debt" : ""}`;
  elVaultQuoteNote.textContent = g.lastClose
    ? `последняя сделка: ${g.lastClose.text}`
    : g.pos.side === "short"
      ? `${s.quote} от продажи ${s.base}`
      : g.pos.side === "long"
        ? `заплачено за ${s.base}`
        : "—";

  // Позиция
  elPosSide.textContent = g.pos.side
    ? g.pos.side === "short"
      ? "SHORT"
      : "LONG"
    : "—";
  elPosSide.className = g.pos.side ?? "";
  elPosAmount.textContent = g.pos.side
    ? `${fmt(g.pos.amount)} ${s.base}`
    : g.lastClose
      ? "закрыто"
      : "нет сделок";
  elPosEntry.textContent = g.pos.side
    ? `@ ${fmtRate(g.pos.entry, s.digits)}`
    : "";

  // PnL
  const pnl = g.pos.side ? openPnl(g) : (g.lastClose?.pnl ?? 0);
  elPnl.textContent = `Прибыль/убыток: ${money(pnl, s.quoteSym)}`;
  elPnl.className = `pnl ${pnl > 0 ? "up" : pnl < 0 ? "down" : "flat"}`;
  elPnl.classList.add("flash");
  setTimeout(() => elPnl.classList.remove("flash"), 500);
}

function flashSwap(): void {
  elVaults.classList.remove("swap");
  void elVaults.offsetWidth; // перезапуск анимации
  elVaults.classList.add("swap");
}

// Тостер в стиле уведомлений Т-банка: плашка сверху, автоскрытие
function toast(text: string, kind: "ok" | "err" | "info" = "ok"): void {
  const t = el("div", `toast ${kind}`, text);
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 350);
  }, 2600);
}

// ---------- Селектор валютных пар ----------
function renderPairSelect(): void {
  elPairSelect.replaceChildren(
    ...SCENARIOS.map((s, i) => {
      const b = el(
        "button",
        `pair-btn${i === curIdx ? " active" : ""}`,
        s.pair,
      );
      b.addEventListener("click", () => selectScenario(i));
      return b;
    }),
  );
}

function selectScenario(i: number): void {
  if (i === curIdx) return;
  curIdx = i;
  const s = cur();
  Object.assign(scenario, {
    base: s.amount,
    quote: 0,
    pos: { side: null, amount: 0, entry: 0 },
    lastClose: null,
  });
  Object.assign(sandbox, {
    base: 0,
    quote: s.sandboxCapital,
    pos: { side: null, amount: 0, entry: 0 },
    lastClose: null,
  });
  sandboxLog.length = 0;
  scenarioStep = 0;
  quizScore = 0;
  elQuiz.classList.add("hidden");
  elScenario.classList.remove("hidden");
  renderPairSelect();
  setSliderRange();
  setRate(s.entry);
  renderScenario();
  renderSandboxLog();
  elSbHint.textContent = `Двигай курс ползунком, открывай и закрывай позиции — и смотри, как меняется прибыль/убыток. Стартовый капитал: ${money(s.sandboxCapital, s.quoteSym)}.`;
  $<HTMLButtonElement>("sb-short").textContent =
    `⬇️ Продать ${fmt(s.amount)} ${s.base} (шорт)`;
  $<HTMLButtonElement>("sb-long").textContent =
    `⬆️ Купить ${fmt(s.amount)} ${s.base} (лонг)`;
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
  const s = cur();
  lesson("Шаг 1. Продажа валюты");
  p(fill(s.texts.intro, s));
  key(
    `💡 Курс сейчас: **${fmtRate(rate, s.digits)} ${s.quote} за 1 ${s.base}**. Продав ${fmt(s.amount)} ${s.base}, банк получит **${fmt(gainOf(s))} ${s.quote}**.`,
  );
  actions(
    btn(
      "btn-sell",
      `Продать ${fmt(s.amount)} ${s.base} за ${s.quote} по ${fmtRate(rate, s.digits)}`,
      () => {
        setRate(s.entry); // фиксируем стартовый курс задачки
        openTrade(scenario, "short");
        flashSwap();
        scenarioStep = 1;
        renderScenario();
      },
    ),
  );
}

function renderStep1(): void {
  const s = cur();
  lesson("Шаг 2. Банк ждёт падения");
  p(fill(s.texts.wait, s));
  key(
    `🎯 Банк надеется, что курс **упадёт ниже ${fmtRate(s.entry, s.digits)}**. Тогда он откупит ${s.base} дешевле и заработает.`,
    "good",
  );
  p(
    `Покрути ползунок курса и посмотри на строку **«Прибыль/убыток»**: как только курс поднимается выше **${fmtRate(s.entry, s.digits)}** — убыток растёт (красный).`,
  );
  key(
    `⚠️ ВАЖНО: для банка, который **продал** ${s.base} (шорт), **рост** курса — это **плохо**. ${s.base} у него нет, их нужно откупать обратно, а они стали **дороже**. «Курс вырос» радует только того, у кого ${s.base} **есть**.`,
    "bad",
  );
  actions(
    btn(
      "btn-primary",
      `📈 Курс вырос до ${fmtRate(s.exit, s.digits)} (как в задачке)`,
      () => {
        setRate(s.exit);
        scenarioStep = 2;
        renderScenario();
      },
    ),
  );
}

function renderStep2(): void {
  const s = cur();
  lesson("Шаг 3. Курс вырос — и это проблема");
  p(`Курс вырос до **${fmtRate(rate, s.digits)}**. Банк ошибся в расчётах.`);
  key(fill(s.texts.rise, s), "bad");
  p(
    `Вот и прикол: банк продал ${s.base} по **${fmtRate(s.entry, s.digits)}**, а откупать должен по **${fmtRate(rate, s.digits)}** — **дороже**. Разница и есть убыток.`,
  );
  actions(
    btn(
      "btn-buy",
      `Исполнить: купить ${fmt(s.amount)} ${s.base} и вернуть клиенту`,
      () => {
        const pnl = closeTrade(scenario);
        scenario.lastClose = {
          pnl,
          text: `${pnl < 0 ? "убыток" : "прибыль"} ${fmt(Math.abs(pnl))} ${s.quote}`,
        };
        flashSwap();
        toast(
          `Операция выполнена · ${pnl < 0 ? "убыток" : "прибыль"} ${money(Math.abs(pnl), s.quoteSym)}`,
          pnl >= 0 ? "ok" : "err",
        );
        scenarioStep = 3;
        renderScenario();
      },
    ),
  );
}

function renderStep3(): void {
  const s = cur();
  lesson("Шаг 4. Итог");
  math([
    [
      `Продал ${fmt(s.amount)} ${s.base} по ${fmtRate(s.entry, s.digits)}   → +${fmt(gainOf(s))} ${s.quote}`,
      "",
    ],
    [
      `Купил  ${fmt(s.amount)} ${s.base} по ${fmtRate(s.exit, s.digits)}   → −${fmt(costOf(s))} ${s.quote}`,
      "",
    ],
    ["───────────────────────────────────────────────", "dim"],
    [`Итог:  −${fmt(lossOf(s))} ${s.quote}   (убыток банка)`, "neg"],
  ]);
  key(
    `📉 **Банк потерял ${fmt(lossOf(s))} ${s.quote}.** Потому что продал ${s.base}, а когда понадобилось их вернуть — они уже стоили дороже.`,
    "bad",
  );
  key(fill(s.texts.analogy, s));
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

// ---------- Викторина (генерируется из текущего сценария) ----------
interface Q {
  text: string;
  options: { label: string; right: boolean }[];
  expl: string;
}

function makeQuiz(s: Scenario): Q[] {
  const loss = lossOf(s);
  const alt =
    Math.round((s.entry * 2 - s.exit) * 10 ** s.digits) / 10 ** s.digits;
  return [
    {
      text: fill(s.texts.quiz[0], s),
      options: [
        { label: `Заработал ${fmt(loss)} ${s.quote}`, right: false },
        { label: `Потерял ${fmt(loss)} ${s.quote}`, right: true },
        { label: "Ничего не изменилось — курс же просто вырос", right: false },
      ],
      expl: `Правильно! (${fmtRate(s.exit, s.digits)} − ${fmtRate(s.entry, s.digits)}) × ${fmt(s.amount)} = −${fmt(loss)} ${s.quote}. Банк продал ${s.base}, но должен их вернуть — откупал дороже.`,
    },
    {
      text: fill(s.texts.quiz[1], s),
      options: [
        {
          label: `Потому что у банка больше нет ${s.base}: их нужно покупать обратно дороже`,
          right: true,
        },
        { label: `Потому что ${s.quote} подешевела`, right: false },
        { label: "Потому что клиент может расстроиться", right: false },
      ],
      expl: `Да. Банк продал ${s.base} и остался «в долгу»: вернуть клиенту ${s.base} можно, только купив их заново — уже по более высокой цене.`,
    },
    {
      text: fill(s.texts.quiz[2], s),
      options: [
        { label: fmtRate(s.exit, s.digits), right: false },
        { label: fmtRate(s.entry, s.digits), right: true },
        { label: fmtRate(alt, s.digits), right: false },
      ],
      expl: `Ноль — когда откупил по той же цене, что продал: ${fmtRate(s.entry, s.digits)}. Ниже этого — прибыль, выше — убыток.`,
    },
  ];
}

function renderQuiz(): void {
  elQuizQuestions.replaceChildren();
  quizScore = 0;

  const scoreEl = el("div", "key");
  scoreEl.id = "quiz-score";
  elQuizQuestions.appendChild(scoreEl);

  for (const [qi, q] of makeQuiz(cur()).entries()) {
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
    quizScore >= 3
      ? `🎉 Все ответы верные (${quizScore}/3). Ты поняла, почему «курс вырос» — это убыток для шортиста!`
      : quizScore > 0
        ? `Верно ${quizScore} из 3. Если что-то не так — прокрути разбор ещё раз.`
        : "Пока ни одного верного — загляни в разбор на шаге 4.";
}

function resetScenario(): void {
  const s = cur();
  Object.assign(scenario, {
    base: s.amount,
    quote: 0,
    pos: { side: null, amount: 0, entry: 0 },
    lastClose: null,
  });
  scenarioStep = 0;
  quizScore = 0;
  elQuiz.classList.add("hidden");
  elScenario.classList.remove("hidden");
  if (mode !== "scenario") switchMode("scenario");
  setRate(s.entry);
  renderScenario();
}

// ---------- Песочница ----------
function renderSandboxLog(): void {
  elSbLog.replaceChildren();
  for (const l of sandboxLog) {
    const row = el("div", "entry");
    const icon = el("span", "tx-icon", l.icon);
    const mid = el("div", "tx-mid");
    const title = el("div", "tx-title", l.title);
    const time = el("div", "t", l.t);
    mid.append(title, time);
    const amount = el("span", `tx-amount ${l.cls}`, l.amount);
    row.append(icon, mid, amount);
    elSbLog.appendChild(row);
  }
  elSbLog.scrollTop = elSbLog.scrollHeight;
}

function logEntry(
  title: string,
  opts: { cls?: LogEntry["cls"]; icon?: string; amount?: string } = {},
): void {
  sandboxLog.push({
    t: now(),
    title,
    amount: opts.amount ?? "",
    cls: opts.cls ?? "",
    icon: opts.icon ?? "•",
  });
}

function initSandbox(): void {
  $("sb-short").addEventListener("click", () => {
    if (sandbox.pos.side) {
      logEntry("Сначала закрой текущую позицию", { icon: "⚠️" });
    } else {
      openTrade(sandbox, "short");
      flashSwap();
      logEntry(`Продажа ${fmt(sandbox.pos.amount)} ${cur().base} (шорт)`, {
        icon: "↓",
        cls: "up",
        amount: `+${money(rate * sandbox.pos.amount, cur().quoteSym)}`,
      });
    }
    renderSandboxLog();
    renderBoard();
  });

  $("sb-long").addEventListener("click", () => {
    if (sandbox.pos.side) {
      logEntry("Сначала закрой текущую позицию", { icon: "⚠️" });
    } else {
      openTrade(sandbox, "long");
      flashSwap();
      logEntry(`Покупка ${fmt(sandbox.pos.amount)} ${cur().base} (лонг)`, {
        icon: "↑",
        cls: "down",
        amount: `−${money(rate * sandbox.pos.amount, cur().quoteSym)}`,
      });
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
        text: `${pnl < 0 ? "убыток" : "прибыль"} ${fmt(Math.abs(pnl))} ${cur().quote}`,
      };
      flashSwap();
      logEntry(
        `Закрытие ${side === "short" ? "шорта" : "лонга"} @ ${fmtRate(rate, cur().digits)}`,
        {
          icon: "✓",
          cls: pnl >= 0 ? "up" : "down",
          amount: `${pnl >= 0 ? "+" : "−"}${money(Math.abs(pnl), cur().quoteSym)}`,
        },
      );
      toast(
        `Операция выполнена · ${pnl < 0 ? "убыток" : "прибыль"} ${money(Math.abs(pnl), cur().quoteSym)}`,
        pnl >= 0 ? "ok" : "err",
      );
    } else {
      logEntry("Нет открытой позиции", { icon: "ℹ️" });
    }
    renderSandboxLog();
    renderBoard();
  });
}

// ---------- Переключение темы ----------
function applyTheme(t: "light" | "dark"): void {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem("tds-theme", t);
  } catch {
    /* localStorage недоступен — тема просто не сохранится */
  }
  elThemeToggle.textContent = t === "dark" ? "☀️" : "🌙";
}

function initTheme(): void {
  const current =
    document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  elThemeToggle.textContent = current === "dark" ? "☀️" : "🌙";
  elThemeToggle.addEventListener("click", () =>
    applyTheme(
      document.documentElement.dataset.theme === "dark" ? "light" : "dark",
    ),
  );
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

renderPairSelect();
setSliderRange();
setRate(SCENARIOS[0].entry);
initTheme();
renderScenario();
initSandbox();
switchMode("scenario");
renderSandboxLog();
elSbHint.textContent = `Двигай курс ползунком, открывай и закрывай позиции — и смотри, как меняется прибыль/убыток. Стартовый капитал: ${money(cur().sandboxCapital, cur().quoteSym)}.`;
$<HTMLButtonElement>("sb-short").textContent =
  `⬇️ Продать ${fmt(cur().amount)} ${cur().base} (шорт)`;
$<HTMLButtonElement>("sb-long").textContent =
  `⬆️ Купить ${fmt(cur().amount)} ${cur().base} (лонг)`;
