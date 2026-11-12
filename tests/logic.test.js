// fire-safety-bd -- node unit tests for js/logic.js + js/data.js (no DOM).
// Usage: node tests/logic.test.js   (exit 0 = all green)
const L = require('../js/logic.js');
const D = require('../js/data.js');
let count = 0, failures = 0;
function check(name, cond, extra) {
  count++;
  console.log((cond ? 'ok - ' : 'FAIL - ') + name + (cond ? '' : ' :: ' + (extra || '')));
  if (!cond) failures++;
}

// ---- Data integrity ----
check('risk bank has 10 questions', D.RISK_QUESTIONS.length === 10, 'got ' + D.RISK_QUESTIONS.length);
check('risk bank validates clean', L.validateRiskBank(D.RISK_QUESTIONS).ok === true,
  JSON.stringify(L.validateRiskBank(D.RISK_QUESTIONS)));
check('risk weights sum to 92', D.RISK_QUESTIONS.reduce((s, q) => s + q.w, 0) === 92);
check('risk bank has 7 yes-risky + 3 no-risky',
  D.RISK_QUESTIONS.filter(q => q.riskIf === 'yes').length === 7 &&
  D.RISK_QUESTIONS.filter(q => q.riskIf === 'no').length === 3);
check('risk bank rejects dup id',
  L.validateRiskBank(D.RISK_QUESTIONS.concat([D.RISK_QUESTIONS[0]])).error === 'dupId');
check('risk bank rejects bad weight',
  L.validateRiskBank([{ id: 'x', w: 0, riskIf: 'yes', q_en: 'a', q_bn: 'b', fix_en: 'c', fix_bn: 'd' }]).error === 'badWeight');
check('quiz bank has 10 questions', D.QUIZ.length === 10);
check('quiz bank validates clean', L.validateQuizBank(D.QUIZ).ok === true,
  JSON.stringify(L.validateQuizBank(D.QUIZ)));
check('quiz bank rejects bad answer index',
  L.validateQuizBank([{ id: 'x', q_en: 'a', q_bn: 'b', why_en: 'c', why_bn: 'd',
    opts_en: ['1', '2', '3', '4'], opts_bn: ['1', '2', '3', '4'], a: 4 }]).error === 'badAnswer');
check('extinguisher list has 5 types', D.EXTINGUISHERS.length === 5);
check('extinguisher classes are A/F/E/C/B',
  D.EXTINGUISHERS.map(e => e.cls).join('') === 'AFECB');
check('emergency numbers are 999, 102, 02223355555',
  D.EMERGENCY_NUMBERS.map(n => n.num).join(',') === '999,102,02223355555');
check('checklist has 4 groups, 22 items',
  D.CHECKLIST.length === 4 &&
  D.CHECKLIST.reduce((s, g) => s + g.items.length, 0) === 22);
check('checklist item ids unique',
  new Set(D.CHECKLIST.flatMap(g => g.items.map(i => i.id))).size === 22);
check('facts total 27059, electrical 34.7%',
  D.FACTS_2025.total === 27059 && D.FACTS_2025.causes[0].pct === 34.7);
check('facts cause percentages sum to 66.8',
  Math.abs(D.FACTS_2025.causes.reduce((s, c) => s + c.pct, 0) - 66.8) < 0.001);
check('both languages present for every UI string',
  Object.keys(D.STRINGS.en).every(k => D.STRINGS.bn[k] !== undefined));

// ---- Risk scoring ----
const allSafe = { wiring: 'no', multiplug: 'no', overnight: 'no', cylinder: 'no',
  leakcheck: 'yes', unattended: 'no', smoking: 'no', exits: 'no', extinguisher: 'yes', plan: 'yes' };
const allRisky = { wiring: 'yes', multiplug: 'yes', overnight: 'yes', cylinder: 'yes',
  leakcheck: 'no', unattended: 'yes', smoking: 'yes', exits: 'yes', extinguisher: 'no', plan: 'no' };
let r = L.scoreRisk(D.RISK_QUESTIONS, allSafe);
check('all-safe answers score 100 / low / no fixes',
  r.score === 100 && r.band === 'low' && r.fixes.length === 0, JSON.stringify(r));
r = L.scoreRisk(D.RISK_QUESTIONS, allRisky);
check('all-risky answers score 8 / critical / 10 fixes',
  r.score === 8 && r.band === 'critical' && r.fixes.length === 10, JSON.stringify(r));
check('fixes sorted by weight desc (12 first)',
  L.scoreRisk(D.RISK_QUESTIONS, allRisky).fixes[0].id === 'wiring');
r = L.scoreRisk(D.RISK_QUESTIONS, { wiring: 'yes' });
check('one risky answer (wiring 12) scores 88 / moderate',
  r.score === 88 && r.band === 'moderate' && r.fixes.length === 1, JSON.stringify(r));
r = L.scoreRisk(D.RISK_QUESTIONS, { wiring: 'yes', multiplug: 'yes', smoking: 'yes', cylinder: 'yes' });
check('four risky (12+10+10+10) scores 58 / high',
  r.score === 58 && r.band === 'high', JSON.stringify(r));
r = L.scoreRisk(D.RISK_QUESTIONS, { wiring: 'yes', multiplug: 'yes', smoking: 'yes', cylinder: 'yes', overnight: 'yes' });
check('five risky scores 50 / high boundary',
  r.score === 50 && r.band === 'high', JSON.stringify(r));
r = L.scoreRisk(D.RISK_QUESTIONS, {});
check('empty answers score 100 (unanswered count as safe)', r.score === 100);
check('bandFor boundaries: 90 low, 89 moderate, 70 moderate, 69 high, 50 high, 49 critical',
  L.bandFor(90) === 'low' && L.bandFor(89) === 'moderate' && L.bandFor(70) === 'moderate' &&
  L.bandFor(69) === 'high' && L.bandFor(50) === 'high' && L.bandFor(49) === 'critical');

// ---- Extinguisher lookup ----
check('oil fire -> class F, never mentions water',
  L.extinguisherFor(D.EXTINGUISHERS, 'oil').cls === 'F' &&
  /water/i.test(L.extinguisherFor(D.EXTINGUISHERS, 'oil').never_en));
check('electrical fire -> class E, use mentions CO2',
  L.extinguisherFor(D.EXTINGUISHERS, 'electrical').use_en.includes('CO₂'));
check('unknown extinguisher id returns null', L.extinguisherFor(D.EXTINGUISHERS, 'lava') === null);

// ---- Quiz scoring ----
check('quiz all-correct scores 10/10',
  L.quizScore(D.QUIZ, D.QUIZ.map(q => q.a)).correct === 10);
check('quiz all-wrong scores 0/10',
  L.quizScore(D.QUIZ, D.QUIZ.map(q => (q.a + 1) % 4)).correct === 0);
check('quiz half-correct scores 5/10',
  L.quizScore(D.QUIZ, D.QUIZ.map((q, i) => i < 5 ? q.a : (q.a + 1) % 4)).correct === 5);

// ---- Checklist progress ----
check('checklist progress 0/22 empty', (() => { const p = L.checklistProgress(D.CHECKLIST, {}); return p.done === 0 && p.total === 22; })());
check('checklist progress counts checked only',
  L.checklistProgress(D.CHECKLIST, { k1: true, e2: true, x5: true }).done === 3);
check('checklist progress ignores unknown ids',
  L.checklistProgress(D.CHECKLIST, { nope: true }).done === 0);

// ---- Escape plan validation ----
check('valid escape plan passes',
  L.validateEscapePlan({ members: '4', meeting: 'big tree', exit1: 'main stairs' }).ok === true);
check('escape plan rejects 0 members',
  L.validateEscapePlan({ members: '0', meeting: 'x', exit1: 'y' }).errors.includes('members'));
check('escape plan rejects 51 members',
  L.validateEscapePlan({ members: '51', meeting: 'x', exit1: 'y' }).errors.includes('members'));
check('escape plan rejects empty meeting point',
  L.validateEscapePlan({ members: '3', meeting: '  ', exit1: 'y' }).errors.includes('meeting'));
check('escape plan rejects empty exit1',
  L.validateEscapePlan({ members: '3', meeting: 'x', exit1: '' }).errors.includes('exit1'));
check('escape plan accepts optional exit2/date missing',
  L.validateEscapePlan({ members: '2', meeting: 'gate', exit1: 'stairs', exit2: '', date: '' }).ok === true);

// ---- Formatting ----
check('Bengali digits convert 102 -> ১০২', L.toBnDigits('102') === '১০২');
check('fmtNum bn converts 27,059', L.fmtNum(27059, 'bn') === '২৭,০৫৯');
check('fmtNum en keeps 27,059', L.fmtNum(27059, 'en') === '27,059');

console.log('\n' + count + ' checks, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
