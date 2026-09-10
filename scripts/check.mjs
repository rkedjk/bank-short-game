// Самопроверка математики сценариев «Банк в шорте».
// Запуск: node scripts/check.mjs  (npm run check)
// Логика не импортируется из src/main.ts (там DOM-слой), поэтому формулы
// продублированы. При рефакторинге математики в отдельный модуль — обновить и здесь.
import assert from 'node:assert/strict';

// PnL шорта: (курс_открытия − курс_закрытия) × объём (округляем до целых quote-валюты)
const shortPnl = (entry, exit, qty) => Math.round((entry - exit) * qty);
// PnL лонга: (курс_закрытия − курс_открытия) × объём
const longPnl = (entry, exit, qty) => Math.round((exit - entry) * qty);

// --- Все 4 сценария: продажа базовой валюты (шорт), курс вырос, откуп ---
const scenarios = [
  { pair: 'USD/JPY', entry: 109.78, exit: 119.58, amount: 1_000_000, loss: -9_800_000 },
  { pair: 'RUB/USD', entry: 0.0111, exit: 0.0122, amount: 100_000_000, loss: -110_000 },
  { pair: 'USD/RUB', entry: 90.0, exit: 95.0, amount: 1_000_000, loss: -5_000_000 },
  { pair: 'JPY/USD', entry: 0.0092, exit: 0.0102, amount: 100_000_000, loss: -100_000 },
];

for (const s of scenarios) {
  const result = shortPnl(s.entry, s.exit, s.amount);
  assert.equal(result, s.loss, `${s.pair}: убыток должен быть ${s.loss}`);
  // контрольные суммы: выручка от продажи − убыток = затраты на откуп
  assert.equal(
    Math.round(s.entry * s.amount) - s.loss,
    Math.round(s.exit * s.amount),
    `${s.pair}: выручка − убыток = затраты на откуп`,
  );
}

// --- Смысловые проверки (на примере USD/JPY) ---
const entry = 109.78;
const exit = 119.58;
const AMOUNT = 1_000_000;
assert.ok(shortPnl(entry, exit, AMOUNT) < 0, 'рост курса при шорте = убыток');
assert.ok(shortPnl(entry, 100, AMOUNT) > 0, 'падение курса при шорте = прибыль');
assert.equal(shortPnl(entry, entry, AMOUNT), 0, 'закрытие по цене открытия = ноль');
assert.ok(longPnl(100, 110, AMOUNT) > 0, 'рост курса при лонге = прибыль');

console.log('✅ Все проверки прошли, убытки по сценариям:');
for (const s of scenarios) {
  console.log(`   ${s.pair.padEnd(9)} → ${s.loss} ${s.pair.endsWith('JPY') ? '¥' : s.pair.startsWith('RUB') ? '$' : s.pair.endsWith('RUB') ? '₽' : '$'}`);
}
console.log('   короткая позиция: курс растёт → убыток; курс падает → прибыль');