// fire-safety-bd -- app: tabs, risk checker, extinguisher finder, emergency,
// checklist, escape plan, quiz, facts. All state in localStorage; zero network.
(function () {
  'use strict';
  var D = window.DATA, L = window.LOGIC, I = window.I18N;
  var $ = function (id) { return document.getElementById(id); };
  var CHECK_KEY = 'fsbd-checklist-v1';
  var ESCAPE_KEY = 'fsbd-escape-v1';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function loadJSON(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ignore */ }
  }

  // ---------- tabs ----------
  var TABS = ['risk', 'ext', 'emergency', 'checklist', 'escape', 'quiz', 'facts'];
  var currentTab = 'risk';
  function showTab(id) {
    currentTab = id;
    TABS.forEach(function (t) {
      var btn = $('tab-' + t), panel = $('panel-' + t);
      if (btn) btn.classList.toggle('active', t === id);
      if (panel) panel.classList.toggle('active', t === id);
    });
    var renderers = { risk: renderRisk, ext: renderExt, emergency: renderEmergency,
      checklist: renderChecklist, escape: renderEscape, quiz: renderQuiz, facts: renderFacts };
    if (renderers[id]) renderers[id]();
    window.scrollTo(0, 0);
  }

  function applyStrings() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = I.t(el.getAttribute('data-i18n'));
    });
    document.documentElement.lang = I.getLang() === 'bn' ? 'bn' : 'en';
    $('lang-btn').textContent = I.t('langBtn');
    TABS.forEach(function (t) {
      var map = { risk: 'tabRisk', ext: 'tabExt', emergency: 'tabEmergency',
        checklist: 'tabChecklist', escape: 'tabEscape', quiz: 'tabQuiz', facts: 'tabFacts' };
      var b = $('tab-' + t);
      if (b) b.textContent = I.t(map[t]);
    });
  }

  // ---------- risk checker ----------
  var riskIdx = 0, riskAnswers = {};
  function renderRisk() {
    var panel = $('panel-risk');
    var qs = D.RISK_QUESTIONS;
    var answered = Object.keys(riskAnswers).length;
    if (riskIdx >= qs.length) { renderRiskResult(panel); return; }
    var q = qs[riskIdx];
    var lang = I.getLang();
    var html = '<h2>' + esc(I.t('riskTitle')) + '</h2>' +
      '<p class="intro">' + esc(I.t('riskIntro')) + '</p>' +
      '<div class="progress"><div class="bar" style="width:' + (answered / qs.length * 100) + '%"></div></div>' +
      '<p class="muted">' + L.fmtNum(answered, lang) + ' ' + esc(I.t('riskProgress')) + '</p>' +
      '<div class="card qcard"><p class="qnum">' + esc(I.t('riskQ')) + ' ' + L.fmtNum(riskIdx + 1, lang) + ' ' + esc(I.t('riskOf')) + ' ' + L.fmtNum(qs.length, lang) + '</p>' +
      '<p class="qtext">' + esc(lang === 'bn' ? q.q_bn : q.q_en) + '</p>' +
      '<div class="ynrow">' +
      '<button class="btn yes' + (riskAnswers[q.id] === 'yes' ? ' picked' : '') + '" data-ans="yes">' + esc(I.t('riskYes')) + '</button>' +
      '<button class="btn no' + (riskAnswers[q.id] === 'no' ? ' picked' : '') + '" data-ans="no">' + esc(I.t('riskNo')) + '</button>' +
      '</div></div>' +
      '<div class="navrow">' +
      (riskIdx > 0 ? '<button class="btn ghost" id="risk-back">' + esc(I.t('riskBack')) + '</button>' : '') +
      '<button class="btn primary" id="risk-next" ' + (riskAnswers[q.id] ? '' : 'disabled') + '>' +
      esc(riskIdx === qs.length - 1 ? I.t('riskSee') : I.t('riskNext')) + '</button></div>';
    panel.innerHTML = html;
    panel.querySelectorAll('[data-ans]').forEach(function (b) {
      b.addEventListener('click', function () {
        riskAnswers[q.id] = b.getAttribute('data-ans');
        renderRisk();
      });
    });
    var next = $('risk-next');
    if (next) next.addEventListener('click', function () { riskIdx++; renderRisk(); });
    var back = $('risk-back');
    if (back) back.addEventListener('click', function () { riskIdx--; renderRisk(); });
  }
  function renderRiskResult(panel) {
    var res = L.scoreRisk(D.RISK_QUESTIONS, riskAnswers);
    var lang = I.getLang();
    var bandKey = { low: 'riskBandLow', moderate: 'riskBandMod', high: 'riskBandHigh', critical: 'riskBandCrit' }[res.band];
    var bandDesc = { low: 'riskBandLowD', moderate: 'riskBandModD', high: 'riskBandHighD', critical: 'riskBandCritD' }[res.band];
    var html = '<h2>' + esc(I.t('riskTitle')) + '</h2>' +
      '<div class="card result ' + res.band + '">' +
      '<p class="muted">' + esc(I.t('riskScore')) + '</p>' +
      '<p class="score">' + L.fmtNum(res.score, lang) + '<span>/100</span></p>' +
      '<p class="band">' + esc(I.t(bandKey)) + '</p>' +
      '<p>' + esc(I.t(bandDesc)) + '</p></div>';
    if (res.fixes.length) {
      html += '<h3>' + esc(I.t('riskFixes')) + '</h3><ol class="fixes">';
      res.fixes.forEach(function (q, i) {
        html += '<li><strong>' + L.fmtNum(i + 1, lang) + '.</strong> ' +
          esc(lang === 'bn' ? q.fix_bn : q.fix_en) + '</li>';
      });
      html += '</ol>';
    } else {
      html += '<p class="good">' + esc(I.t('riskNoFixes')) + '</p>';
    }
    html += '<button class="btn primary" id="risk-restart">' + esc(I.t('riskRestart')) + '</button>';
    panel.innerHTML = html;
    $('risk-restart').addEventListener('click', function () {
      riskIdx = 0; riskAnswers = {}; renderRisk();
    });
  }

  // ---------- extinguisher finder ----------
  var extSel = null;
  function renderExt() {
    var panel = $('panel-ext');
    var lang = I.getLang();
    var html = '<h2>' + esc(I.t('extTitle')) + '</h2>' +
      '<p class="intro">' + esc(I.t('extIntro')) + '</p>' +
      '<div class="chiprow">' + D.EXTINGUISHERS.map(function (e) {
        return '<button class="chip' + (extSel === e.id ? ' picked' : '') + '" data-ext="' + e.id + '">' +
          esc(lang === 'bn' ? e.label_bn : e.label_en) + '</button>';
      }).join('') + '</div><div id="ext-detail"></div>' +
      '<div class="card pass"><h3>' + esc(I.t('passTitle')) + '</h3><ol class="passlist">' +
      [['passPull', 'passPullD'], ['passAim', 'passAimD'], ['passSqueeze', 'passSqueezeD'], ['passSweep', 'passSweepD']].map(function (p) {
        return '<li><strong>' + esc(I.t(p[0])) + '</strong> — ' + esc(I.t(p[1])) + '</li>';
      }).join('') + '</ol></div>' +
      '<p class="warn">' + esc(I.t('extTip')) + '</p>';
    panel.innerHTML = html;
    panel.querySelectorAll('[data-ext]').forEach(function (b) {
      b.addEventListener('click', function () { extSel = b.getAttribute('data-ext'); renderExt(); });
    });
    var det = $('ext-detail');
    if (extSel) {
      var e = L.extinguisherFor(D.EXTINGUISHERS, extSel);
      det.innerHTML = '<div class="card extcard"><p><strong>' + esc(I.t('extClass')) + ' ' + esc(e.cls) + ' — ' +
        esc(lang === 'bn' ? e.label_bn : e.label_en) + '</strong></p>' +
        '<p><strong>' + esc(I.t('extUse')) + ':</strong> ' + esc(lang === 'bn' ? e.use_bn : e.use_en) + '</p>' +
        '<p class="never"><strong>' + esc(I.t('extNever')) + ':</strong> ' + esc(lang === 'bn' ? e.never_bn : e.never_en) + '</p></div>';
    }
  }

  // ---------- emergency ----------
  function renderEmergency() {
    var panel = $('panel-emergency');
    var lang = I.getLang();
    var html = '<h2>' + esc(I.t('emTitle')) + '</h2><p class="intro">' + esc(I.t('emIntro')) + '</p>';
    D.EMERGENCY_NUMBERS.forEach(function (n) {
      html += '<div class="card numcard"><div><p class="bignum">' + esc(L.fmtNum(n.num, lang)) + '</p>' +
        '<p><strong>' + esc(lang === 'bn' ? n.name_bn : n.name_en) + '</strong></p>' +
        '<p class="muted">' + esc(lang === 'bn' ? n.desc_bn : n.desc_en) + '</p></div>' +
        '<a class="btn danger" href="tel:' + esc(n.tel) + '">' + esc(I.t('emCall')) + '</a></div>';
    });
    html += '<div class="card"><h3>' + esc(I.t('emTellTitle')) + '</h3><p class="muted">' +
      esc(I.t('emTellIntro')) + '</p><ol>' +
      D.TELL_OPERATOR.map(function (t) { return '<li>' + esc(lang === 'bn' ? t.bn : t.en) + '</li>'; }).join('') +
      '</ol></div>';
    panel.innerHTML = html;
  }

  // ---------- checklist ----------
  var checked = loadJSON(CHECK_KEY, {});
  function renderChecklist() {
    var panel = $('panel-checklist');
    var lang = I.getLang();
    var prog = L.checklistProgress(D.CHECKLIST, checked);
    var pct = prog.total ? Math.round(prog.done / prog.total * 100) : 0;
    var html = '<h2>' + esc(I.t('clTitle')) + '</h2><p class="intro">' + esc(I.t('clIntro')) + '</p>' +
      '<div class="progress"><div class="bar" style="width:' + pct + '%"></div></div>' +
      '<p class="muted">' + L.fmtNum(prog.done, lang) + ' / ' + L.fmtNum(prog.total, lang) + ' — ' +
      L.fmtNum(pct, lang) + '% ' + esc(I.t('clDone')) + '</p>';
    D.CHECKLIST.forEach(function (g) {
      html += '<div class="card"><h3>' + esc(lang === 'bn' ? g.title_bn : g.title_en) + '</h3>' +
        g.items.map(function (it) {
          return '<label class="check"><input type="checkbox" data-item="' + it.id + '"' +
            (checked[it.id] ? ' checked' : '') + '> <span>' + esc(lang === 'bn' ? it.bn : it.en) + '</span></label>';
        }).join('') + '</div>';
    });
    html += '<button class="btn ghost" id="cl-reset">' + esc(I.t('clReset')) + '</button>';
    panel.innerHTML = html;
    panel.querySelectorAll('[data-item]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        if (cb.checked) checked[cb.getAttribute('data-item')] = true;
        else delete checked[cb.getAttribute('data-item')];
        saveJSON(CHECK_KEY, checked);
        renderChecklist();
      });
    });
    $('cl-reset').addEventListener('click', function () {
      if (window.confirm(I.t('clResetConfirm'))) { checked = {}; saveJSON(CHECK_KEY, checked); renderChecklist(); }
    });
  }

  // ---------- escape plan ----------
  function renderEscape() {
    var panel = $('panel-escape');
    var saved = loadJSON(ESCAPE_KEY, null);
    var html = '<h2>' + esc(I.t('esTitle')) + '</h2><p class="intro">' + esc(I.t('esIntro')) + '</p>' +
      '<div class="card"><form id="escape-form">' +
      '<label>' + esc(I.t('esMembers')) + '<input type="number" id="es-members" min="1" max="50" inputmode="numeric" value="' + esc(saved ? saved.members : '') + '"></label>' +
      '<label>' + esc(I.t('esMeeting')) + '<input type="text" id="es-meeting" value="' + esc(saved ? saved.meeting : '') + '"></label>' +
      '<label>' + esc(I.t('esExit1')) + '<input type="text" id="es-exit1" value="' + esc(saved ? saved.exit1 : '') + '"></label>' +
      '<label>' + esc(I.t('esExit2')) + '<input type="text" id="es-exit2" value="' + esc(saved ? saved.exit2 : '') + '"></label>' +
      '<label>' + esc(I.t('esDate')) + '<input type="date" id="es-date" value="' + esc(saved ? saved.date : '') + '"></label>' +
      '<p class="err" id="es-err" hidden></p>' +
      '<button class="btn primary" type="submit">' + esc(I.t('esSave')) + '</button>' +
      ' <span class="muted" id="es-saved" hidden>' + esc(I.t('esSaved')) + '</span>' +
      '</form></div><div id="es-summary"></div>';
    panel.innerHTML = html;
    var form = $('escape-form');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var plan = { members: $('es-members').value, meeting: $('es-meeting').value,
        exit1: $('es-exit1').value, exit2: $('es-exit2').value, date: $('es-date').value };
      var v = L.validateEscapePlan(plan);
      var err = $('es-err');
      if (!v.ok) {
        var key = { members: 'esErrMembers', meeting: 'esErrMeeting', exit1: 'esErrExit1' }[v.errors[0]];
        err.textContent = I.t(key); err.hidden = false; return;
      }
      err.hidden = true;
      saveJSON(ESCAPE_KEY, plan);
      $('es-saved').hidden = false;
      renderEscapeSummary(plan);
    });
    if (saved && L.validateEscapePlan(saved).ok) renderEscapeSummary(saved);
    var printBtn = $('es-print');
    if (printBtn) printBtn.addEventListener('click', function () { window.print(); });
  }
  function renderEscapeSummary(plan) {
    var lang = I.getLang();
    var box = $('es-summary');
    if (!box) return;
    box.innerHTML = '<div class="card"><h3>' + esc(I.t('esSummary')) + '</h3>' +
      '<p><strong>' + esc(I.t('esMembers')) + '</strong> ' + L.fmtNum(plan.members, lang) + '</p>' +
      '<p><strong>' + esc(I.t('esMeeting')) + '</strong> ' + esc(plan.meeting) + '</p>' +
      '<p><strong>' + esc(I.t('esExit1')) + '</strong> ' + esc(plan.exit1) + '</p>' +
      (plan.exit2 ? '<p><strong>' + esc(I.t('esExit2')) + '</strong> ' + esc(plan.exit2) + '</p>' : '') +
      (plan.date ? '<p><strong>' + esc(I.t('esDate')) + '</strong> ' + esc(plan.date) + '</p>' : '') +
      '<button class="btn ghost" id="es-print">' + esc(I.t('esPrint')) + '</button></div>';
    var printBtn = $('es-print');
    if (printBtn) printBtn.addEventListener('click', function () { window.print(); });
  }

  // ---------- quiz ----------
  var quizIdx = 0, quizAnswers = [], quizDone = false;
  function renderQuiz() {
    var panel = $('panel-quiz');
    var lang = I.getLang();
    if (quizDone) { renderQuizResult(panel); return; }
    if (quizIdx >= D.QUIZ.length) { quizDone = true; renderQuizResult(panel); return; }
    var q = D.QUIZ[quizIdx];
    var picked = quizAnswers[quizIdx];
    var html = '<h2>' + esc(I.t('qzTitle')) + '</h2><p class="intro">' + esc(I.t('qzIntro')) + '</p>' +
      '<div class="progress"><div class="bar" style="width:' + (quizIdx / D.QUIZ.length * 100) + '%"></div></div>' +
      '<div class="card qcard"><p class="qnum">' + esc(I.t('riskQ')) + ' ' + L.fmtNum(quizIdx + 1, lang) + ' ' + esc(I.t('riskOf')) + ' ' + L.fmtNum(D.QUIZ.length, lang) + '</p>' +
      '<p class="qtext">' + esc(lang === 'bn' ? q.q_bn : q.q_en) + '</p>' +
      (lang === 'bn' ? q.opts_bn : q.opts_en).map(function (o, i) {
        var cls = 'opt';
        if (picked !== undefined) {
          if (i === q.a) cls += ' correct';
          else if (i === picked) cls += ' wrong';
        }
        return '<button class="' + cls + '" data-opt="' + i + '"' + (picked !== undefined ? ' disabled' : '') + '>' + esc(o) + '</button>';
      }).join('') +
      (picked !== undefined
        ? '<p class="feedback ' + (picked === q.a ? 'good' : 'bad') + '">' +
          esc(picked === q.a ? I.t('qzCorrect') : I.t('qzWrong')) + ' ' + esc(I.t('qzWhy')) + ' ' +
          esc(lang === 'bn' ? q.why_bn : q.why_en) + '</p>' : '') +
      '</div>' +
      (picked !== undefined
        ? '<button class="btn primary" id="quiz-next">' + esc(quizIdx === D.QUIZ.length - 1 ? I.t('qzFinish') : I.t('qzNext')) + '</button>'
        : '');
    panel.innerHTML = html;
    panel.querySelectorAll('[data-opt]').forEach(function (b) {
      b.addEventListener('click', function () {
        quizAnswers[quizIdx] = +b.getAttribute('data-opt');
        renderQuiz();
      });
    });
    var next = $('quiz-next');
    if (next) next.addEventListener('click', function () { quizIdx++; renderQuiz(); });
  }
  function renderQuizResult(panel) {
    var res = L.quizScore(D.QUIZ, quizAnswers);
    var lang = I.getLang();
    var html = '<h2>' + esc(I.t('qzTitle')) + '</h2>' +
      '<div class="card result"><p class="muted">' + esc(I.t('qzScore')) + '</p>' +
      '<p class="score">' + L.fmtNum(res.correct, lang) + '<span> / ' + L.fmtNum(res.total, lang) + '</span></p>' +
      '<p>' + esc(I.t('qzOutOf')) + '</p></div>' +
      '<button class="btn primary" id="quiz-retry">' + esc(I.t('qzRetry')) + '</button>';
    panel.innerHTML = html;
    $('quiz-retry').addEventListener('click', function () {
      quizIdx = 0; quizAnswers = []; quizDone = false; renderQuiz();
    });
  }

  // ---------- facts ----------
  function renderFacts() {
    var panel = $('panel-facts');
    var lang = I.getLang();
    var f = D.FACTS_2025;
    var html = '<h2>' + esc(I.t('faTitle')) + '</h2><p class="intro">' + esc(I.t('faIntro')) + '</p>' +
      '<div class="statgrid">' +
      statCard(L.fmtNum(f.total, lang), lang === 'bn' ? 'মোট অগ্নিকাণ্ড (২০২৫)' : 'Total fires (2025)') +
      statCard(L.fmtNum(f.perDay, lang), lang === 'bn' ? 'গড়ে প্রতিদিন' : 'Average per day') +
      statCard(L.fmtNum(f.deaths, lang), lang === 'bn' ? 'মৃত্যু' : 'Deaths') +
      statCard(L.fmtNum(f.injured, lang), lang === 'bn' ? 'আহত' : 'Injured') +
      statCard('৳' + L.fmtNum(f.lossCrore, lang) + ' ' + (lang === 'bn' ? 'কোটি' : 'crore'), lang === 'bn' ? 'সম্পদের ক্ষতি' : 'Property lost') +
      statCard('৳' + L.fmtNum(f.savedCrore, lang) + ' ' + (lang === 'bn' ? 'কোটি' : 'crore'), lang === 'bn' ? 'সম্পদ রক্ষা পেয়েছে' : 'Property saved') +
      '</div><div class="card"><h3>' + (lang === 'bn' ? 'কী কারণে আগুন লেগেছে' : 'What caused the fires') + '</h3>' +
      f.causes.map(function (c) {
        return '<div class="cause"><span>' + esc(lang === 'bn' ? c.bn : c.en) + '</span>' +
          '<div class="causebar"><div style="width:' + c.pct + '%"></div></div>' +
          '<span class="muted">' + L.fmtNum(c.pct, lang) + '% (' + L.fmtNum(c.n, lang) + ')</span></div>';
      }).join('') + '</div>' +
      '<p class="muted">' + esc(I.t('faNote')) + '</p>' +
      '<p class="muted">' + esc(I.t('faSource')) + '</p>';
    panel.innerHTML = html;
  }
  function statCard(value, label) {
    return '<div class="card stat"><p class="statnum">' + esc(value) + '</p><p class="muted">' + esc(label) + '</p></div>';
  }

  // ---------- init ----------
  function init() {
    applyStrings();
    TABS.forEach(function (t) {
      var b = $('tab-' + t);
      if (b) b.addEventListener('click', function () { showTab(t); });
    });
    $('lang-btn').addEventListener('click', function () {
      I.setLang(I.getLang() === 'bn' ? 'en' : 'bn');
      applyStrings();
      showTab(currentTab);
    });
    showTab('risk');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
