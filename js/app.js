/* ==========================================================================
   ОКТАН — core interactions
   GSAP + ScrollTrigger + Lenis. Всё через transform/opacity.
   ========================================================================== */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COARSE  = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined';

  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ------------------------------------------------------------ 1. LENIS */
  var lenis = null;

  function initSmoothScroll() {
    if (REDUCED || typeof window.Lenis === 'undefined') return;

    lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      touchMultiplier: 1.6
    });

    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  function scrollTo(target) {
    if (lenis) lenis.scrollTo(target, { offset: -70 });
    else {
      var el = typeof target === 'string' ? document.querySelector(target) : target;
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70 });
    }
  }

  /* -------------------------------------------------------- 2. SPLIT TEXT */
  // Разбивает текст на строки-обёртки с маской. Работает по словам,
  // группируя их по offsetTop — так строки честные, а не «по символам вслепую».
  function splitLines(el) {
    if (el.dataset.split === 'done') return Array.prototype.slice.call(el.querySelectorAll('.line > span'));
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    el.textContent = '';
    var frag = document.createDocumentFragment();
    var words = text.split(' ').map(function (w) {
      var s = document.createElement('span');
      s.className = 'w';
      s.style.display = 'inline-block';
      s.textContent = w;
      frag.appendChild(s);
      frag.appendChild(document.createTextNode(' '));
      return s;
    });
    el.appendChild(frag);

    var lines = [], current = null, top = null;
    words.forEach(function (w) {
      var t = Math.round(w.offsetTop);
      if (top === null || Math.abs(t - top) > 4) { top = t; current = []; lines.push(current); }
      current.push(w);
    });

    el.textContent = '';
    var out = [];
    lines.forEach(function (group) {
      var mask = document.createElement('span');
      mask.className = 'line';
      mask.style.display = 'block';
      mask.style.overflow = 'hidden';
      var inner = document.createElement('span');
      inner.style.display = 'inline-block';
      inner.style.willChange = 'transform';
      inner.textContent = group.map(function (w) { return w.textContent; }).join(' ');
      mask.appendChild(inner);
      el.appendChild(mask);
      out.push(inner);
    });
    el.dataset.split = 'done';
    return out;
  }

  function splitChars(el) {
    var text = el.textContent;
    el.textContent = '';
    var out = [];
    text.split('').forEach(function (ch) {
      var s = document.createElement('span');
      s.style.display = 'inline-block';
      s.style.willChange = 'transform';
      s.textContent = ch === ' ' ? ' ' : ch;
      el.appendChild(s);
      out.push(s);
    });
    return out;
  }

  /* --------------------------------------------------------- 3. PRELOADER */
  function initPreloader(done) {
    var pre = document.querySelector('.preloader');
    if (!pre) { done(); return; }

    // Прелоадер показываем один раз за сессию — повторный вход не должен ждать.
    if (sessionStorage.getItem('oktan_seen') === '1' || REDUCED || !hasGSAP) {
      pre.remove();
      document.body.classList.remove('is-locked');
      done();
      return;
    }
    sessionStorage.setItem('oktan_seen', '1');

    document.body.classList.add('is-locked');

    var counter = pre.querySelector('[data-count]');
    var bar     = pre.querySelector('.preloader__bar i');
    var logo    = pre.querySelectorAll('.preloader__logo span');
    var sub     = pre.querySelector('.preloader__sub');
    var obj     = { v: 0 };

    var tl = gsap.timeline({
      onComplete: function () {
        document.body.classList.remove('is-locked');
        pre.remove();
        done();
      }
    });

    tl.to(logo, { yPercent: 0, duration: 0.9, stagger: 0.045, ease: 'expo.out' }, 0)
      .to(sub, { opacity: 1, duration: 0.6 }, 0.35)
      .to(obj, {
        v: 100, duration: 1.35, ease: 'power2.inOut',
        onUpdate: function () {
          var v = Math.round(obj.v);
          if (counter) counter.textContent = v < 10 ? '00' + v : v < 100 ? '0' + v : v;
        }
      }, 0.1)
      .to(bar, { width: '100%', duration: 1.35, ease: 'power2.inOut' }, 0.1)
      .to(pre.querySelectorAll('.preloader__mark, .preloader__bottom'), {
        opacity: 0, y: -20, duration: 0.5, ease: 'power2.in'
      }, 1.55)
      .to(pre, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, 1.7);
  }

  /* --------------------------------------------- 4. PAGE TRANSITIONS (curtain) */
  function initTransitions() {
    var curtain = document.querySelector('.curtain');
    var word    = document.querySelector('.curtain__word');
    if (!curtain || !hasGSAP) return;

    var bars = curtain.querySelectorAll('i');

    // Вход: шторка уходит вверх
    gsap.set(bars, { scaleY: 1, transformOrigin: 'top' });
    gsap.to(bars, {
      scaleY: 0, duration: REDUCED ? 0.01 : 0.85, ease: 'expo.inOut',
      stagger: { each: 0.05, from: 'start' },
      onComplete: function () { curtain.style.display = 'none'; }
    });

    document.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      if (href.startsWith('#')) {
        e.preventDefault();
        if (href.length > 1) scrollTo(href);
        closeMenu();
        return;
      }
      if (!href.endsWith('.html') && href !== '/') return;
      if (a.getAttribute('aria-current') === 'page') { e.preventDefault(); return; }

      e.preventDefault();
      closeMenu(true);

      curtain.style.display = '';
      if (word) word.textContent = a.dataset.label || 'Октан';

      var tl = gsap.timeline({
        onComplete: function () { window.location.href = href; }
      });
      tl.set(bars, { scaleY: 0, transformOrigin: 'bottom' })
        .to(bars, { scaleY: 1, duration: 0.6, ease: 'expo.inOut', stagger: 0.045 })
        .to(word, { opacity: 1, duration: 0.35 }, 0.3);
    });

    // Возврат по «назад» из bfcache — снять шторку
    window.addEventListener('pageshow', function (ev) {
      if (ev.persisted) {
        curtain.style.display = 'none';
        if (word) gsap.set(word, { opacity: 0 });
      }
    });
  }

  /* ------------------------------------------------------- 5. CUSTOM CURSOR */
  function initCursor() {
    if (COARSE || REDUCED || !hasGSAP) return;

    var ring = document.createElement('div');
    ring.className = 'cursor';
    ring.innerHTML = '<span class="cursor__label"></span>';
    var dot = document.createElement('div');
    dot.className = 'cursor-dot';
    document.body.append(ring, dot);

    var label = ring.querySelector('.cursor__label');
    var rx = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3' });
    var ry = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3' });
    var dx = gsap.quickTo(dot, 'x', { duration: 0.1, ease: 'power2' });
    var dy = gsap.quickTo(dot, 'y', { duration: 0.1, ease: 'power2' });

    window.addEventListener('mousemove', function (e) {
      rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
    }, { passive: true });

    var hoverSel = 'a, button, [data-cursor], .compare, input, textarea, select';
    document.addEventListener('mouseover', function (e) {
      var t = e.target.closest(hoverSel);
      if (!t) return;
      if (t.matches('input, textarea, select')) {
        document.body.classList.add('cursor-text');
      } else {
        document.body.classList.add('cursor-hover');
        label.textContent = t.dataset.cursor || '';
      }
    });
    document.addEventListener('mouseout', function (e) {
      if (!e.target.closest(hoverSel)) return;
      document.body.classList.remove('cursor-hover', 'cursor-text');
      label.textContent = '';
    });
  }

  /* ---------------------------------------------------------- 6. MAGNETIC */
  function initMagnetic() {
    if (COARSE || REDUCED || !hasGSAP) return;
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      var strength = parseFloat(el.dataset.magnetic) || 0.35;
      var qx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
      var qy = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });

      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        qx((e.clientX - (r.left + r.width / 2)) * strength);
        qy((e.clientY - (r.top + r.height / 2)) * strength);
      });
      el.addEventListener('mouseleave', function () { qx(0); qy(0); });
    });
  }

  /* ------------------------------------------------------------ 7. HEADER */
  function initHeader() {
    var header = document.querySelector('.header');
    var prog   = document.querySelector('.progress i');
    if (!header) return;

    var onScroll = function () {
      var y = window.scrollY;
      header.classList.toggle('is-stuck', y > 40);
      if (prog) {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        prog.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* -------------------------------------------------------------- 8. MENU */
  var menuOpen = false, menuTl = null;

  function initMenu() {
    var burger = document.querySelector('.burger');
    var menu   = document.querySelector('.menu');
    if (!burger || !menu) return;

    var links = menu.querySelectorAll('.menu__link');
    var aside = menu.querySelectorAll('.menu__aside > *');

    if (hasGSAP) {
      menuTl = gsap.timeline({ paused: true })
        .set(menu, { visibility: 'visible' })
        .to(menu, { clipPath: 'inset(0 0 0% 0)', duration: 0.75, ease: 'expo.inOut' })
        .to(links, { y: 0, duration: 0.8, stagger: 0.06, ease: 'expo.out' }, 0.25)
        .from(aside, { opacity: 0, y: 24, duration: 0.6, stagger: 0.08, ease: 'power3.out' }, 0.4);
    }

    burger.addEventListener('click', function () { menuOpen ? closeMenu() : openMenu(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuOpen) closeMenu();
    });
  }

  function openMenu() {
    var menu = document.querySelector('.menu');
    var burger = document.querySelector('.burger');
    if (!menu) return;
    menuOpen = true;
    document.body.classList.add('menu-open');
    burger.setAttribute('aria-expanded', 'true');
    menu.removeAttribute('aria-hidden');
    if (lenis) lenis.stop();
    if (menuTl) menuTl.play(); else { menu.style.visibility = 'visible'; menu.style.clipPath = 'inset(0)'; }
  }

  function closeMenu(instant) {
    var menu = document.querySelector('.menu');
    var burger = document.querySelector('.burger');
    if (!menu || !menuOpen) return;
    menuOpen = false;
    document.body.classList.remove('menu-open');
    if (burger) burger.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
    if (lenis) lenis.start();
    if (menuTl) { instant ? menuTl.pause(0).progress(0) : menuTl.reverse(); }
    else { menu.style.visibility = 'hidden'; menu.style.clipPath = 'inset(0 0 100% 0)'; }
  }

  /* ------------------------------------------------------------ 9. REVEALS */
  function initReveals() {
    if (!hasGSAP) {
      document.querySelectorAll('[data-reveal]').forEach(function (el) { el.style.opacity = 1; });
      return;
    }

    // Строчный reveal заголовков
    document.querySelectorAll('[data-reveal="lines"]').forEach(function (el) {
      var lines = splitLines(el);
      gsap.set(lines, { yPercent: REDUCED ? 0 : 110 });
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: function () {
          gsap.to(lines, { yPercent: 0, duration: REDUCED ? 0.01 : 1, stagger: 0.08, ease: 'expo.out' });
        }
      });
    });

    // Простое появление блоков
    document.querySelectorAll('[data-reveal="up"]').forEach(function (el, i) {
      gsap.fromTo(el,
        { y: REDUCED ? 0 : 46, opacity: 0 },
        {
          y: 0, opacity: 1, duration: REDUCED ? 0.01 : 0.95, ease: 'expo.out',
          delay: (parseFloat(el.dataset.delay) || 0),
          scrollTrigger: { trigger: el, start: 'top 90%', once: true }
        });
    });

    // Групповой stagger по детям
    document.querySelectorAll('[data-reveal="stagger"]').forEach(function (el) {
      gsap.fromTo(el.children,
        { y: REDUCED ? 0 : 40, opacity: 0 },
        {
          y: 0, opacity: 1, duration: REDUCED ? 0.01 : 0.9, ease: 'expo.out', stagger: 0.09,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        });
    });

    // Параллакс-слои
    if (!REDUCED) {
      document.querySelectorAll('[data-parallax]').forEach(function (el) {
        gsap.to(el, {
          yPercent: parseFloat(el.dataset.parallax) || -12,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });
    }

    // Линия таймлайна
    document.querySelectorAll('.tl-item').forEach(function (el) {
      ScrollTrigger.create({ trigger: el, start: 'top 82%', once: true,
        onEnter: function () { el.classList.add('is-in'); } });
    });
  }

  /* ---------------------------------------------------------- 10. COUNTERS */
  function initCounters() {
    document.querySelectorAll('[data-counter]').forEach(function (el) {
      var end = parseFloat(el.dataset.counter);
      var dec = (el.dataset.decimals | 0);
      var run = function () {
        if (REDUCED || !hasGSAP) { el.textContent = end.toFixed(dec); return; }
        var o = { v: 0 };
        gsap.to(o, {
          v: end, duration: 1.8, ease: 'power2.out',
          onUpdate: function () { el.textContent = o.v.toFixed(dec); }
        });
      };
      if (hasGSAP) ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: run });
      else run();
    });
  }

  /* ---------------------------------------------------------- 11. MARQUEE */
  function initMarquee() {
    document.querySelectorAll('.marquee').forEach(function (m) {
      var track = m.querySelector('.marquee__track');
      if (!track) return;

      // Дублируем содержимое, чтобы лента шла бесшовно
      var html = track.innerHTML;
      track.innerHTML = html + html;

      if (REDUCED || !hasGSAP) return;
      var dir = m.dataset.dir === 'right' ? 1 : -1;
      var speed = parseFloat(m.dataset.speed) || 26;

      gsap.set(track, { xPercent: dir === -1 ? 0 : -50 });
      var tween = gsap.to(track, {
        xPercent: dir === -1 ? -50 : 0,
        duration: speed, ease: 'none', repeat: -1
      });

      // Скорость реагирует на скролл — «живая» лента
      if (window.ScrollTrigger) {
        ScrollTrigger.create({
          trigger: m, start: 'top bottom', end: 'bottom top',
          onUpdate: function (self) {
            tween.timeScale(1 + Math.min(Math.abs(self.getVelocity() / 900), 4));
          }
        });
      }
    });
  }

  /* ------------------------------------------------- 12. HORIZONTAL SCROLL */
  function initHScroll() {
    var block = document.querySelector('[data-hscroll]');
    if (!block || !hasGSAP || !window.ScrollTrigger) return;

    var track = block.querySelector('.hscroll__track');
    var bar   = block.querySelector('.hscroll__hint .bar i');
    if (!track) return;

    // На узких экранах горизонтальный pin ломает UX — заменяем на нативный свайп
    var mm = gsap.matchMedia();
    mm.add('(min-width: 1025px)', function () {
      var distance = function () { return track.scrollWidth - window.innerWidth + 80; };
      var tw = gsap.to(track, {
        x: function () { return -distance(); },
        ease: 'none',
        scrollTrigger: {
          trigger: block,
          start: 'top top',
          end: function () { return '+=' + distance(); },
          pin: true, scrub: 0.8, invalidateOnRefresh: true,
          onUpdate: function (self) {
            if (bar) bar.style.width = (20 + self.progress * 80) + '%';
          }
        }
      });
      return function () { tw.scrollTrigger && tw.scrollTrigger.kill(); tw.kill(); gsap.set(track, { x: 0 }); };
    });

    mm.add('(max-width: 1024px)', function () {
      var vp = block.querySelector('.hscroll__viewport');
      if (vp) {
        vp.style.overflowX = 'auto';
        vp.style.scrollSnapType = 'x mandatory';
        vp.style.paddingBottom = '1rem';
        track.querySelectorAll('.svc-card').forEach(function (c) { c.style.scrollSnapAlign = 'center'; });
      }
      return function () { if (vp) { vp.style.overflowX = ''; vp.style.scrollSnapType = ''; } };
    });
  }

  /* --------------------------------------------------------- 13. ACCORDION */
  function initAccordion() {
    document.querySelectorAll('.acc').forEach(function (acc) {
      var items = acc.querySelectorAll('.acc__item');
      items.forEach(function (item) {
        var head = item.querySelector('.acc__head');
        var body = item.querySelector('.acc__body');
        if (!head || !body) return;

        head.setAttribute('aria-expanded', 'false');

        head.addEventListener('click', function () {
          var isOpen = item.classList.contains('is-open');

          // Аккордеон одиночный: закрываем соседей
          items.forEach(function (other) {
            if (other === item || !other.classList.contains('is-open')) return;
            other.classList.remove('is-open');
            other.querySelector('.acc__head').setAttribute('aria-expanded', 'false');
            collapse(other.querySelector('.acc__body'));
          });

          item.classList.toggle('is-open', !isOpen);
          head.setAttribute('aria-expanded', String(!isOpen));
          isOpen ? collapse(body) : expand(body);
        });
      });
    });

    function expand(body) {
      var h = body.firstElementChild.offsetHeight;
      if (hasGSAP && !REDUCED) gsap.to(body, { height: h, duration: 0.6, ease: 'expo.out',
        onComplete: function () { body.style.height = 'auto'; ScrollTrigger && ScrollTrigger.refresh(); } });
      else body.style.height = 'auto';
    }
    function collapse(body) {
      if (hasGSAP && !REDUCED) gsap.to(body, { height: 0, duration: 0.45, ease: 'expo.inOut' });
      else body.style.height = '0px';
    }
  }

  /* ----------------------------------------------------------- 14. FILTERS */
  function initFilters() {
    var bar = document.querySelector('[data-filters]');
    if (!bar) return;
    var items = document.querySelectorAll('[data-cat]');

    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter');
      if (!btn) return;
      bar.querySelectorAll('.filter').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      var cat = btn.dataset.filter;

      items.forEach(function (item) {
        var show = cat === 'all' || item.dataset.cat === cat;
        item.classList.toggle('is-hidden', !show);
        if (show && hasGSAP && !REDUCED) {
          gsap.fromTo(item, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
        }
      });
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  }

  /* ------------------------------------------------- 15. BEFORE/AFTER SLIDER */
  function initCompare() {
    document.querySelectorAll('.compare').forEach(function (box) {
      var after  = box.querySelector('.compare__side--after');
      var handle = box.querySelector('.compare__handle');
      if (!after || !handle) return;

      var dragging = false;

      var set = function (clientX) {
        var r = box.getBoundingClientRect();
        var p = Math.min(Math.max((clientX - r.left) / r.width, 0.02), 0.98);
        after.style.clipPath = 'inset(0 0 0 ' + p * 100 + '%)';
        handle.style.left = p * 100 + '%';
      };

      box.addEventListener('pointerdown', function (e) { dragging = true; box.setPointerCapture(e.pointerId); set(e.clientX); });
      box.addEventListener('pointermove', function (e) { if (dragging) set(e.clientX); });
      box.addEventListener('pointerup',   function () { dragging = false; });
      box.addEventListener('pointercancel', function () { dragging = false; });

      // Доступность с клавиатуры
      box.setAttribute('tabindex', '0');
      box.setAttribute('role', 'slider');
      box.setAttribute('aria-label', 'Сравнение «было — стало»');
      box.setAttribute('aria-valuemin', '0');
      box.setAttribute('aria-valuemax', '100');
      box.setAttribute('aria-valuenow', '50');
      var pos = 50;
      box.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        pos = Math.min(Math.max(pos + (e.key === 'ArrowRight' ? 4 : -4), 2), 98);
        after.style.clipPath = 'inset(0 0 0 ' + pos + '%)';
        handle.style.left = pos + '%';
        box.setAttribute('aria-valuenow', String(Math.round(pos)));
      });
    });
  }

  /* -------------------------------------------------------------- 16. FORM */
  function initForms() {
    document.querySelectorAll('form[data-form]').forEach(function (form) {
      var success = form.querySelector('.form__success');

      // Плавающие лейблы
      form.querySelectorAll('.field input, .field textarea, .field select').forEach(function (input) {
        var sync = function () {
          input.closest('.field').classList.toggle('is-filled', !!input.value);
        };
        input.addEventListener('input', sync);
        input.addEventListener('change', sync);
        input.addEventListener('blur', function () { sync(); validate(input); });
        sync();
      });

      // Маска телефона: +7 (XXX) XXX-XX-XX
      var phone = form.querySelector('input[type="tel"]');
      if (phone) {
        phone.addEventListener('input', function () {
          var d = phone.value.replace(/\D/g, '');
          if (d.startsWith('8')) d = '7' + d.slice(1);
          if (!d.startsWith('7')) d = '7' + d;
          d = d.slice(0, 11);
          var out = '+7';
          if (d.length > 1) out += ' (' + d.slice(1, 4);
          if (d.length >= 5) out += ') ' + d.slice(4, 7);
          if (d.length >= 8) out += '-' + d.slice(7, 9);
          if (d.length >= 10) out += '-' + d.slice(9, 11);
          phone.value = out;
        });
        phone.addEventListener('focus', function () { if (!phone.value) phone.value = '+7 ('; });
      }

      function validate(input) {
        var field = input.closest('.field');
        if (!field) return true;
        var val = input.value.trim();
        var ok = true, msg = '';

        if (input.required && !val) { ok = false; msg = 'Заполните поле'; }
        else if (input.type === 'tel' && val && val.replace(/\D/g, '').length !== 11) { ok = false; msg = 'Введите номер полностью'; }
        else if (input.type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) { ok = false; msg = 'Проверьте адрес почты'; }
        else if (input.name === 'name' && val && val.length < 2) { ok = false; msg = 'Слишком короткое имя'; }

        field.classList.toggle('has-error', !ok);
        var err = field.querySelector('.field__error');
        if (err) err.textContent = msg;
        input.setAttribute('aria-invalid', String(!ok));
        return ok;
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var inputs = Array.prototype.slice.call(form.querySelectorAll('input, textarea, select'))
          .filter(function (i) { return i.type !== 'checkbox' && i.type !== 'submit'; });

        var valid = inputs.map(validate).every(Boolean);

        var agree = form.querySelector('input[type="checkbox"][required]');
        if (agree && !agree.checked) {
          valid = false;
          if (hasGSAP && !REDUCED) gsap.fromTo(agree.closest('.form__agree'),
            { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
        }

        if (!valid) {
          var firstErr = form.querySelector('.has-error input, .has-error textarea, .has-error select');
          if (firstErr) firstErr.focus();
          if (hasGSAP && !REDUCED) gsap.fromTo(form, { x: -8 }, { x: 0, duration: 0.55, ease: 'elastic.out(1, 0.35)' });
          return;
        }

        // Бэкенда нет — имитируем отправку. Точку интеграции см. в README.
        var btn = form.querySelector('button[type="submit"]');
        if (btn) { btn.disabled = true; btn.dataset.was = btn.textContent; btn.textContent = 'Отправляем…'; }

        setTimeout(function () {
          if (btn) { btn.disabled = false; btn.textContent = btn.dataset.was; }
          if (!success) { form.reset(); return; }
          success.classList.add('is-on');
          if (hasGSAP && !REDUCED) {
            gsap.fromTo(success, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'expo.out' });
          } else { success.style.opacity = 1; }
          form.reset();
          form.querySelectorAll('.field').forEach(function (f) { f.classList.remove('is-filled', 'has-error'); });
          success.setAttribute('role', 'status');
        }, 750);
      });

      var again = form.querySelector('[data-form-reset]');
      if (again && success) {
        again.addEventListener('click', function () {
          if (hasGSAP && !REDUCED) gsap.to(success, { opacity: 0, duration: 0.35,
            onComplete: function () { success.classList.remove('is-on'); } });
          else { success.style.opacity = 0; success.classList.remove('is-on'); }
        });
      }
    });
  }

  /* --------------------------------------------------- 17. HERO ENTRANCE */
  function heroEntrance() {
    var hero = document.querySelector('.hero');
    if (!hero || !hasGSAP) return;

    var titleLines = hero.querySelectorAll('.hero__title .line > span');
    var rest = hero.querySelectorAll('[data-hero-fade]');

    var tl = gsap.timeline();
    tl.fromTo(titleLines, { yPercent: 110 }, {
      yPercent: 0, duration: REDUCED ? 0.01 : 1.25, stagger: 0.085, ease: 'expo.out'
    }, 0)
      .fromTo(rest, { opacity: 0, y: 26 }, {
        opacity: 1, y: 0, duration: REDUCED ? 0.01 : 0.9, stagger: 0.07, ease: 'expo.out'
      }, 0.35);

    // Заголовок «уезжает» при скролле — глубина сцены
    if (!REDUCED && window.ScrollTrigger) {
      gsap.to(hero.querySelector('.hero__inner'), {
        yPercent: -14, opacity: 0.25, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
      });
    }
  }

  /* --------------------------------------------------------------- 18. BOOT */
  function boot() {
    initSmoothScroll();
    initHeader();
    initMenu();
    initCursor();
    initMagnetic();
    initTransitions();
    initMarquee();
    initAccordion();
    initFilters();
    initCompare();
    initForms();

    initPreloader(function () {
      heroEntrance();
      initReveals();
      initCounters();
      initHScroll();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });

    // Пересчёт после загрузки шрифтов — иначе строки бьются криво
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Экспорт для hero3d.js
  window.OKTAN = { REDUCED: REDUCED, COARSE: COARSE, splitChars: splitChars, scrollTo: scrollTo };
})();
