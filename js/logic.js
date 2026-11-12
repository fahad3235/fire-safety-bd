// fire-safety-bd -- pure logic (no DOM). Node-testable.
// Works in browser (window.LOGIC) and in node (module.exports).
(function (root) {
  'use strict';

  var BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

  function toBnDigits(value) {
    return String(value).replace(/[0-9]/g, function (d) { return BN_DIGITS[+d]; });
  }

  function fmtNum(value, lang) {
    var n = Number(value);
    if (!isFinite(n)) return String(value);
    var s = n.toLocaleString('en-US');
    return lang === 'bn' ? toBnDigits(s) : s;
  }

  // answers: { questionId: 'yes' | 'no' } (partial ok -- unanswered count as safe).
  // Returns { score, band, fixes: [question, ...] } sorted by weight desc.
  function scoreRisk(questions, answers) {
    var deduction = 0;
    var fixes = [];
    questions.forEach(function (q) {
      var ans = answers[q.id];
      var risky = (q.riskIf === 'yes' && ans === 'yes') || (q.riskIf === 'no' && ans === 'no');
      if (risky) { deduction += q.w; fixes.push(q); }
    });
    var score = Math.max(0, 100 - deduction);
    fixes.sort(function (a, b) { return b.w - a.w; });
    return { score: score, band: bandFor(score), fixes: fixes };
  }

  function bandFor(score) {
    if (score >= 90) return 'low';
    if (score >= 70) return 'moderate';
    if (score >= 50) return 'high';
    return 'critical';
  }

  function extinguisherFor(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  // quizAnswers: array of chosen option indexes, aligned with QUIZ order.
  function quizScore(quiz, answers) {
    var correct = 0;
    quiz.forEach(function (q, i) { if (answers[i] === q.a) correct++; });
    return { correct: correct, total: quiz.length };
  }

  // checked: { itemId: true } ; returns { done, total }.
  function checklistProgress(checklist, checked) {
    var total = 0, done = 0;
    checklist.forEach(function (g) {
      g.items.forEach(function (it) {
        total++;
        if (checked[it.id]) done++;
      });
    });
    return { done: done, total: total };
  }

  // Escape plan validation. Returns { ok, errors: [key, ...] }.
  function validateEscapePlan(plan) {
    var errors = [];
    var members = Number(plan.members);
    if (!plan.members || !isFinite(members) || members < 1 || members > 50 ||
        String(plan.members).trim() !== String(Math.floor(members))) errors.push('members');
    if (!plan.meeting || !String(plan.meeting).trim()) errors.push('meeting');
    if (!plan.exit1 || !String(plan.exit1).trim()) errors.push('exit1');
    return { ok: errors.length === 0, errors: errors };
  }

  function validateRiskBank(questions) {
    var ids = {};
    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      if (!q.id || ids[q.id]) return { ok: false, error: 'dupId' };
      ids[q.id] = true;
      if (typeof q.w !== 'number' || q.w <= 0) return { ok: false, error: 'badWeight' };
      if (q.riskIf !== 'yes' && q.riskIf !== 'no') return { ok: false, error: 'badRiskIf' };
      if (!q.q_en || !q.q_bn || !q.fix_en || !q.fix_bn) return { ok: false, error: 'missingText' };
    }
    return { ok: true };
  }

  function validateQuizBank(quiz) {
    var ids = {};
    for (var i = 0; i < quiz.length; i++) {
      var q = quiz[i];
      if (!q.id || ids[q.id]) return { ok: false, error: 'dupId' };
      ids[q.id] = true;
      if (!q.q_en || !q.q_bn || !q.why_en || !q.why_bn) return { ok: false, error: 'missingText' };
      if (!Array.isArray(q.opts_en) || q.opts_en.length !== 4) return { ok: false, error: 'badOpts' };
      if (!Array.isArray(q.opts_bn) || q.opts_bn.length !== 4) return { ok: false, error: 'badOptsBn' };
      if (typeof q.a !== 'number' || q.a < 0 || q.a > 3) return { ok: false, error: 'badAnswer' };
    }
    return { ok: true };
  }

  var LOGIC = {
    toBnDigits: toBnDigits, fmtNum: fmtNum, scoreRisk: scoreRisk, bandFor: bandFor,
    extinguisherFor: extinguisherFor, quizScore: quizScore,
    checklistProgress: checklistProgress, validateEscapePlan: validateEscapePlan,
    validateRiskBank: validateRiskBank, validateQuizBank: validateQuizBank
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = LOGIC;
  root.LOGIC = LOGIC;
})(typeof window !== 'undefined' ? window : globalThis);
