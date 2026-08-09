/* ==========================================================================
   ОКТАН — сквозные элементы (шапка, меню, шторка, прогресс, футер).
   Один источник правды на все страницы. Выполняется с defer ДО app.js,
   поэтому app.js уже находит готовый DOM.
   ========================================================================== */
(function () {
  'use strict';

  var PAGES = [
    { href: 'index.html',    label: 'Главная',   idx: '01' },
    { href: 'services.html', label: 'Услуги',    idx: '02' },
    { href: 'about.html',    label: 'О сервисе', idx: '03' },
    { href: 'works.html',    label: 'Работы',    idx: '04' },
    { href: 'contacts.html', label: 'Контакты',  idx: '05' }
  ];

  var PHONE_HREF = 'tel:+74951234567';
  var PHONE_TEXT = '+7 (495) 123-45-67';

  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (here === '') here = 'index.html';

  function current(href) { return href.toLowerCase() === here; }
  function aria(href) { return current(href) ? ' aria-current="page"' : ''; }

  /* --------------------------------------------------------------- HEADER */
  function header() {
    var nav = PAGES.map(function (p) {
      return '<a href="' + p.href + '" data-label="' + p.label + '"' + aria(p.href) + '>' + p.label + '</a>';
    }).join('');

    return '' +
      '<div class="progress" aria-hidden="true"><i></i></div>' +
      '<header class="header">' +
        '<div class="header__inner">' +
          '<a class="logo" href="index.html" data-label="Октан" aria-label="Октан — на главную">' +
            '<span class="logo__mark" aria-hidden="true"></span>' +
            '<span class="logo__text">Ок<b>тан</b></span>' +
          '</a>' +
          '<nav class="nav" aria-label="Основная навигация">' + nav + '</nav>' +
          '<div class="header__actions">' +
            '<a class="header__phone" href="' + PHONE_HREF + '">' + PHONE_TEXT + '</a>' +
            '<a class="btn" href="contacts.html" data-label="Контакты" data-magnetic="0.3" data-cursor="Записаться">' +
              'Записаться<span class="btn__arrow" aria-hidden="true">↗</span>' +
            '</a>' +
            '<button class="burger" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="fullmenu">' +
              '<i></i><i></i>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</header>';
  }

  /* ----------------------------------------------------------------- MENU */
  function menu() {
    var items = PAGES.map(function (p) {
      return '<li><a class="menu__link" href="' + p.href + '" data-label="' + p.label + '"' + aria(p.href) + '>' +
        '<em>' + p.idx + '</em>' + p.label + '</a></li>';
    }).join('');

    return '' +
      '<div class="menu" id="fullmenu" aria-hidden="true">' +
        '<div class="menu__grid">' +
          '<nav aria-label="Меню сайта"><ul class="menu__list">' + items + '</ul></nav>' +
          '<div class="menu__aside">' +
            '<div>' +
              '<p class="mono">Записаться на диагностику</p>' +
              '<a class="big" href="' + PHONE_HREF + '">' + PHONE_TEXT + '</a>' +
            '</div>' +
            '<div>' +
              '<p class="mono">Адрес</p>' +
              '<p>Москва, ул. Автозаводская, 23к9<br>10 минут от м. Автозаводская</p>' +
            '</div>' +
            '<div>' +
              '<p class="mono">Режим работы</p>' +
              '<p>Пн–Сб 09:00–21:00 · Вс 10:00–18:00<br>Выездная помощь — круглосуточно</p>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* -------------------------------------------------------------- CURTAIN */
  function curtain() {
    return '<div class="curtain" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>' +
           '<div class="curtain__word" aria-hidden="true"></div>';
  }

  /* --------------------------------------------------------------- FOOTER */
  function footer() {
    var links = PAGES.map(function (p) {
      return '<li><a href="' + p.href + '" data-label="' + p.label + '">' + p.label + '</a></li>';
    }).join('');

    return '' +
      '<footer class="footer">' +
        '<div class="shell">' +
          '<div class="footer__grid">' +
            '<div class="footer__brand">' +
              '<a class="logo" href="index.html" data-label="Октан">' +
                '<span class="logo__mark" aria-hidden="true"></span>' +
                '<span class="logo__text">Ок<b>тан</b></span>' +
              '</a>' +
              '<p>Технический центр полного цикла. Чиним то, что другие предлагают заменить целиком.</p>' +
            '</div>' +
            '<div><h4>Разделы</h4><ul>' + links + '</ul></div>' +
            '<div><h4>Услуги</h4><ul>' +
              '<li><a href="services.html" data-label="Услуги">Компьютерная диагностика</a></li>' +
              '<li><a href="services.html" data-label="Услуги">Ремонт двигателя</a></li>' +
              '<li><a href="services.html" data-label="Услуги">Ремонт АКПП</a></li>' +
              '<li><a href="services.html" data-label="Услуги">Кузов и покраска</a></li>' +
              '<li><a href="services.html" data-label="Услуги">Выездная помощь</a></li>' +
            '</ul></div>' +
            '<div><h4>Контакты</h4><address>' +
              '<div><a href="' + PHONE_HREF + '">' + PHONE_TEXT + '</a></div>' +
              '<div><a href="mailto:service@oktan-msk.ru">service@oktan-msk.ru</a></div>' +
              '<div>Москва, ул. Автозаводская, 23к9</div>' +
              '<div>Пн–Сб 09:00–21:00 · Вс 10:00–18:00</div>' +
            '</address></div>' +
          '</div>' +
          '<div class="footer__word" aria-hidden="true">Октан</div>' +
          '<div class="footer__bottom">' +
            '<span class="mono">© 2020–2026 ТЦ «Октан»</span>' +
            '<span class="mono">Портфолио-проект · Москва</span>' +
          '</div>' +
        '</div>' +
      '</footer>';
  }

  /* ------------------------------------------------------------- MOUNTING */
  function mount(name, html) {
    var slot = document.querySelector('[data-chrome="' + name + '"]');
    if (!slot) return;
    slot.outerHTML = html;
  }

  mount('header', header() + menu() + curtain());
  mount('footer', footer());
})();
