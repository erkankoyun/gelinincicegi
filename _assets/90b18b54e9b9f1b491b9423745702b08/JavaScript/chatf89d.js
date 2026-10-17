(function () {
  'use strict';

  var MIN_ANIM_MS = 720;

  function pause(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function postJson(url, data) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function safeStr(val) {
    return (val == null ? '' : String(val)).trim();
  }

  function extractAck(reply, nextQ) {
    if (!reply || !nextQ) return '';
    return reply.replace(nextQ, '').replace(/^\s+|\s+$/g, '');
  }

  /**
   * Render API reply text into an element with safe sanitization.
   * Converts **bold** and newlines. No raw HTML passthrough.
   */
  function renderRichText(text, el) {
    if (!el || !text) return;
    var esc = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    esc = esc.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    esc = esc.replace(/\n/g, '<br>');
    el.innerHTML = esc;
  }

  function buildProfileRows(data) {
    var rows = [];
    if (data.city) {
      rows.push(['Lokasyon', [data.city, data.district].filter(Boolean).join(' / ')]);
    }
    if (data.guests_min > 0) {
      var g = (data.guests_max && data.guests_max !== data.guests_min)
        ? data.guests_min + '\u2013' + data.guests_max
        : String(data.guests_min);
      rows.push(['Davetli', g]);
    }
    if (data.budget_low > 0) {
      var currency = safeStr(data.budget_currency) || 'TL';
      var hi = (data.budget_high && data.budget_high !== data.budget_low)
        ? '\u2013' + data.budget_high : '';
      rows.push(['B\u00fct\u00e7e', data.budget_low + hi + ' ' + currency]);
    }
    if (data.style) rows.push(['Tarz', data.style]);
    if (Array.isArray(data.priorities) && data.priorities.length > 0) {
      rows.push(['\u00d6ncelikler', data.priorities.join(', ')]);
    }
    return rows;
  }

  function fillSummary(el, data) {
    if (!el) return;
    el.innerHTML = '';
    buildProfileRows(data).forEach(function (pair) {
      var row = document.createElement('div');
      row.className = 'gd-funnel__profile-row';
      var lbl = document.createElement('span');
      lbl.className = 'gd-funnel__profile-label';
      lbl.textContent = pair[0];
      var val = document.createElement('span');
      val.className = 'gd-funnel__profile-value';
      val.textContent = pair[1];
      row.appendChild(lbl);
      row.appendChild(val);
      el.appendChild(row);
    });
  }

  function initFunnel(root) {
    var endpoint   = root.dataset.apiEndpoint;
    var sessionKey = root.dataset.sessionKey || 'gd-funnel';
    var maxQ       = parseInt(root.dataset.maxQuestions || '5', 10);
    if (!endpoint) return;

    /* --- DOM refs ------------------------------------------------ */
    var stage         = root.querySelector('.gd-funnel__stage');
    var progressFill  = root.querySelector('.gd-funnel__progress-fill');
    var phaseIntro    = root.querySelector('.gd-phase--intro');
    var phaseQuestion = root.querySelector('.gd-phase--question');
    var phaseEmail    = root.querySelector('.gd-phase--email');
    var phaseComplete = root.querySelector('.gd-phase--complete');

    var stepNum    = root.querySelector('.gd-phase--question .gd-funnel__step-num');
    var stepTotal  = root.querySelector('.gd-phase--question .gd-funnel__step-total');
    var ackEl      = root.querySelector('.gd-phase--question .gd-funnel__ack');
    var questionEl = root.querySelector('.gd-phase--question .gd-funnel__question');
    var qForm      = root.querySelector('.gd-phase--question .gd-funnel__form');
    var qInput     = root.querySelector('.gd-phase--question .gd-funnel__input');
    var qSubmit    = root.querySelector('.gd-phase--question .gd-funnel__submit-btn');

    var emailRichReply = root.querySelector('.gd-phase--email .gd-funnel__rich-reply');
    var eForm          = root.querySelector('.gd-phase--email .gd-funnel__email-form');
    var eInput         = root.querySelector('.gd-phase--email .gd-funnel__email-input');
    var ePhoneInput    = root.querySelector('.gd-phase--email .gd-funnel__phone-input');
    var eSubmit        = root.querySelector('.gd-phase--email .gd-funnel__submit-btn');

    var completeRichReply = root.querySelector('.gd-phase--complete .gd-funnel__rich-reply');
    var pdfBtn            = root.querySelector('.gd-funnel__pdf-btn');
    var emailBtn          = root.querySelector('.gd-funnel__email-btn');
    var emailStatus       = root.querySelector('.gd-funnel__email-status');

    var advisorHistory = root.querySelector('.gd-advisor__history');
    var advisorForm    = root.querySelector('.gd-advisor__form');
    var advisorInput   = root.querySelector('.gd-advisor__input');
    var advisorSubmit  = root.querySelector('.gd-advisor__submit');

    var startBtn  = root.querySelector('.gd-funnel__start-btn');
    var nameInput = root.querySelector('.gd-funnel__name-input');
    var resetBtns = root.querySelectorAll('.gd-funnel__reset-btn');

    /* --- State --------------------------------------------------- */
    var sessionId      = localStorage.getItem(sessionKey) || '';
    var isAnimating    = false;
    var completionData = null; // stored when needs_email:true
    var userName       = '';   // capitalized name from API

    if (stepTotal) stepTotal.textContent = String(maxQ);

    /* --- Helpers ------------------------------------------------- */
    function setProgress(count) {
      if (!progressFill) return;
      var pct = Math.max(4, Math.min(100, Math.round((count / (maxQ + 1)) * 100)));
      progressFill.style.width = pct + '%';
      if (stepNum) stepNum.textContent = String(Math.min(count, maxQ));
    }

    function showPhase(name) {
      [
        ['intro',    phaseIntro],
        ['question', phaseQuestion],
        ['email',    phaseEmail],
        ['complete', phaseComplete]
      ].forEach(function (pair) {
        if (!pair[1]) return;
        if (pair[0] === name) pair[1].classList.remove('gd-hidden');
        else pair[1].classList.add('gd-hidden');
      });
    }

    function runTransition(apiPromise, updateFn) {
      if (isAnimating) return;
      isAnimating = true;
      stage.classList.add('gd-animating');
      Promise.all([
        apiPromise.catch(function () { return null; }),
        pause(MIN_ANIM_MS)
      ]).then(function (results) {
        updateFn(results[0]);
      }).finally(function () {
        stage.classList.remove('gd-animating');
        isAnimating = false;
      });
    }

    /* --- PDF download ------------------------------------------- */
    if (pdfBtn) {
      pdfBtn.addEventListener('click', function () {
        if (!sessionId) return;
        pdfBtn.disabled = true;
        pdfBtn.textContent = '⏳ Hazırlanıyor…';
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'download_pdf', session_id: sessionId })
        })
          .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.blob();
          })
          .then(function (blob) {
            var url  = URL.createObjectURL(blob);
            var a    = document.createElement('a');
            var slug = (userName || 'benim').toLowerCase()
              .replace(/ğ/g,'g').replace(/ş/g,'s').replace(/ı/g,'i')
              .replace(/ö/g,'o').replace(/ü/g,'u').replace(/ç/g,'c')
              .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            a.href     = url;
            a.download = slug + 'in-dugun-plani.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          })
          .catch(function () {
            alert('PDF oluşturulurken bir sorun oluştu. Lütfen tekrar deneyin.');
          })
          .finally(function () {
            pdfBtn.disabled = false;
            pdfBtn.textContent = '📄 PDF İndir';
          });
      });
    }

    /* --- Email plan button -------------------------------------- */
    if (emailBtn) {
      emailBtn.addEventListener('click', function () {
        if (!sessionId) return;
        emailBtn.disabled = true;
        emailBtn.textContent = 'Gönderiliyor…';
        if (emailStatus) { emailStatus.style.display = 'none'; emailStatus.textContent = ''; }

        fetch('/api/gelincicegi-chat', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ mode: 'email_plan', session_id: sessionId })
        })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.success) {
            emailBtn.textContent = '✅ E-posta Gönderildi';
            emailBtn.disabled = true;
            if (emailStatus) {
              emailStatus.textContent = data.message || 'Planın e-postana gönderildi!';
              emailStatus.style.display = 'block';
              emailStatus.style.cssText = 'display:block;color:#065f46;background:#d1fae5;border-radius:8px;padding:10px 14px;margin-top:8px;font-size:13px';
            }
          } else {
            emailBtn.disabled = false;
            emailBtn.textContent = '✉️ Planı E-postama Gönder';
            var msg = data.message || data.error || 'Bir hata oluştu. Lütfen tekrar deneyin.';
            if (emailStatus) {
              emailStatus.textContent = msg;
              emailStatus.style.cssText = 'display:block;color:#991b1b;background:#fee2e2;border-radius:8px;padding:10px 14px;margin-top:8px;font-size:13px';
            } else {
              alert(msg);
            }
          }
        })
        .catch(function () {
          emailBtn.disabled = false;
          emailBtn.textContent = '✉️ Planı E-postama Gönder';
          if (emailStatus) {
            emailStatus.textContent = 'Bağlantı hatası. Lütfen tekrar deneyin.';
            emailStatus.style.cssText = 'display:block;color:#991b1b;background:#fee2e2;border-radius:8px;padding:10px 14px;margin-top:8px;font-size:13px';
          }
        });
      });
    }

    /* --- Advisor chat ------------------------------------------- */
    function appendAdvisorMsg(role, text) {
      if (!advisorHistory) return;
      var msg = document.createElement('div');
      msg.className = 'gd-advisor__msg gd-advisor__msg--' + role;
      msg.innerHTML = String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      advisorHistory.appendChild(msg);
      advisorHistory.scrollTop = advisorHistory.scrollHeight;
    }

    if (advisorInput) {
      advisorInput.addEventListener('input', function () {
        if (advisorSubmit) advisorSubmit.disabled = this.value.trim() === '';
      });
      advisorInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey && advisorSubmit && !advisorSubmit.disabled) {
          e.preventDefault();
          if (advisorForm) advisorForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      });
    }

    if (advisorForm) {
      advisorForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var text = advisorInput ? advisorInput.value.trim() : '';
        if (!text || !sessionId) return;

        appendAdvisorMsg('user', text);
        if (advisorInput)  { advisorInput.value = ''; advisorInput.disabled = true; }
        if (advisorSubmit) advisorSubmit.disabled = true;

        var typing = document.createElement('div');
        typing.className = 'gd-advisor__msg gd-advisor__msg--typing';
        typing.innerHTML = '<span></span><span></span><span></span>';
        advisorHistory.appendChild(typing);
        advisorHistory.scrollTop = advisorHistory.scrollHeight;

        postJson(endpoint, { mode: 'advisor_chat', session_id: sessionId, message: text })
          .then(function (data) {
            if (advisorHistory.contains(typing)) advisorHistory.removeChild(typing);
            appendAdvisorMsg('assistant', safeStr(data.reply));
          })
          .catch(function () {
            if (advisorHistory.contains(typing)) advisorHistory.removeChild(typing);
            appendAdvisorMsg('assistant', 'Şu an teknik bir sorun var. Lütfen tekrar dene 🙏');
          })
          .finally(function () {
            if (advisorInput)  { advisorInput.disabled = false; advisorInput.focus(); }
            if (advisorSubmit) advisorSubmit.disabled = true;
          });
      });
    }

    /* --- Name input on intro ------------------------------------ */
    if (nameInput && startBtn) {
      nameInput.addEventListener('input', function () {
        startBtn.disabled = this.value.trim() === '';
      });
      nameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && this.value.trim() !== '') {
          e.preventDefault();
          startBtn.click();
        }
      });
    }

    /* --- Start button ------------------------------------------- */
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        if (isAnimating) return;
        var rawName = nameInput ? nameInput.value.trim() : '';
        runTransition(
          postJson(endpoint, { mode: 'start', session_id: sessionId, name: rawName }),
          function (data) {
            if (!data) { showPhase('question'); return; }
            sessionId = data.session_id || sessionId;
            localStorage.setItem(sessionKey, sessionId);
            if (data.user_name) userName = safeStr(data.user_name);
            var q   = safeStr(data.next_question || data.reply);
            var ack = extractAck(safeStr(data.reply), q);
            if (ackEl)     ackEl.textContent = ack;
            if (questionEl) questionEl.textContent = q;
            if (qInput)  { qInput.value = ''; qInput.placeholder = 'Yanıt\u0131n\u0131 yaz\u2026'; }
            if (qSubmit) { qSubmit.disabled = true; qSubmit.textContent = 'Devam et'; }
            setProgress(data.question_count || 1);
            showPhase('question');
            if (qInput) setTimeout(function () { qInput.focus(); }, 50);
          }
        );
      });
    }

    /* --- Question input ----------------------------------------- */
    if (qInput) {
      qInput.addEventListener('input', function () {
        if (qSubmit) qSubmit.disabled = this.value.trim() === '';
      });
      qInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey && !isAnimating && qSubmit && !qSubmit.disabled) {
          e.preventDefault();
          if (qForm) qForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      });
    }

    if (qForm) {
      qForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (isAnimating) return;
        var text = qInput ? qInput.value.trim() : '';
        if (!text) return;
        if (qInput)  qInput.disabled  = true;
        if (qSubmit) qSubmit.disabled = true;

        runTransition(
          postJson(endpoint, { mode: 'message', session_id: sessionId, message: text }),
          function (data) {
            if (!data) {
              if (questionEl) questionEl.textContent = 'Bir sorun olu\u015ftu. L\u00fctfen tekrar deneyin.';
              showPhase('question');
              if (qInput) qInput.disabled = false;
              return;
            }
            if (data.is_complete && data.needs_email) {
              /* Store for later use in complete phase */
              completionData = data;
              if (data.user_name) userName = safeStr(data.user_name);
              renderRichText(safeStr(data.reply), emailRichReply);
              setProgress(maxQ + 1);
              showPhase('email');
              if (eInput)       { eInput.value = '';       eInput.disabled = false; }
              if (ePhoneInput)  { ePhoneInput.value = '';  ePhoneInput.disabled = false; }
              if (eSubmit) eSubmit.disabled = true;
              if (eInput) setTimeout(function () { eInput.focus(); }, 50);
            } else if (data.is_complete && !data.needs_email) {
              var disp = completionData || data;
              renderRichText(safeStr(disp.reply), completeRichReply);
              setProgress(maxQ + 1);
              showPhase('complete');
            } else {
              var q   = safeStr(data.next_question);
              var ack = extractAck(safeStr(data.reply), q);
              if (ackEl)     ackEl.textContent = ack;
              if (questionEl) questionEl.textContent = q;
              if (qInput)  { qInput.value = ''; qInput.disabled = false; qInput.placeholder = 'Yanıtını yaz…'; }
              if (qSubmit) { qSubmit.disabled = true; qSubmit.textContent = 'Devam et'; }
              setProgress(data.question_count || 1);
              showPhase('question');
              if (qInput) setTimeout(function () { qInput.focus(); }, 50);
            }
          }
        );
      });
    }

    /* --- Email / phone inputs ------------------------------------ */
    function updateContactSubmit() {
      var hasEmail = eInput  && eInput.value.trim() !== '';
      var hasPhone = ePhoneInput && ePhoneInput.value.trim() !== '';
      if (eSubmit) eSubmit.disabled = !(hasEmail || hasPhone);
    }

    if (eInput)      eInput.addEventListener('input',      updateContactSubmit);
    if (ePhoneInput) ePhoneInput.addEventListener('input', updateContactSubmit);

    if (eForm) {
      eForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (isAnimating) return;
        var email = eInput      ? eInput.value.trim()      : '';
        var phone = ePhoneInput ? ePhoneInput.value.trim() : '';
        if (!email && !phone) return;
        if (eInput)      { eInput.disabled      = true; }
        if (ePhoneInput) { ePhoneInput.disabled  = true; }
        if (eSubmit)     { eSubmit.disabled      = true; }

        runTransition(
          postJson(endpoint, { mode: 'contact', session_id: sessionId, email: email, phone: phone }),
          function () {
            /* Use the stored completion plan */
            var disp = completionData || {};
            renderRichText(safeStr(disp.reply), completeRichReply);
            setProgress(maxQ + 1);
            showPhase('complete');
          }
        );
      });
    }

    /* --- Reset buttons ------------------------------------------ */
    resetBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        sessionId      = '';
        isAnimating    = false;
        completionData = null;
        userName       = '';
        stage.classList.remove('gd-animating');
        localStorage.removeItem(sessionKey);
        if (nameInput)     { nameInput.value = ''; }
        if (startBtn)      { startBtn.disabled = true; }
        if (qInput)        { qInput.value = ''; qInput.disabled = false; }
        if (qSubmit)       qSubmit.disabled = true;
        if (eInput)        { eInput.value = ''; eInput.disabled = false; }
        if (ePhoneInput)   { ePhoneInput.value = ''; ePhoneInput.disabled = false; }
        if (eSubmit)       eSubmit.disabled = true;
        if (advisorHistory) advisorHistory.innerHTML = '';
        setProgress(0);
        showPhase('intro');
      });
    });

    showPhase('intro');
    setProgress(0);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.gd-funnel').forEach(initFunnel);
  });
})();
