/* ДОРСНАБ · поведение страницы
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  /* Отметка «скрипт жив». Сторож в <head> ждёт её 1,8 секунды и, если её нет,
     снимает класс js, после чего все блоки становятся видимыми. Без этого
     404 на main.js, корпоративный фильтр или оборванная сеть оставляли
     страницу пустой ниже первого экрана: класс js ставится до отрисовки,
     а снять его было некому. Проверено блокировкой файла. */
  window.__dorsnabZhiv = 1;

  /* ---- 1. Мобильное меню ----
     Шторка ведёт себя как всплывающее окно: закрывается клавишей Escape и
     касанием мимо, возвращает фокус на кнопку, не выпускает обход клавишей
     Tab наружу и держит фон от прокрутки. Раньше не делала ничего из этого:
     открыв меню с клавиатуры, выйти из него было нечем. */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');

  if (burger && nav) {
    /* Всё, что лежит в <body> мимо шапки, на время шторки объявляется inert:
       страница под ней перестаёт принимать фокус, курсор и чтение голосом.
       Перехвата Tab на краях кольца для этого мало - он ловит только два
       положения фокуса (сама кнопка и последняя ссылка), а при открытой
       шторке на странице 67 фокусируемых элементов, 60 из них снаружи.
       Один клик по пустому месту, и Tab уходил вглубь спрятанной страницы.
       Список собирается по разметке, а не по именам тегов: новый блок
       рядом с main и footer накрывается сам, без правки скрипта.
       Браузер без поддержки inert атрибут просто игнорирует - тогда
       работает прежний перехват Tab, то есть хуже, чем сейчас, не станет. */
    var shapka = burger.closest ? burger.closest('header') : null;
    var fon = Array.prototype.filter.call(document.body.children, function (el) {
      return el !== shapka && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE';
    });
    var pogashen = [];

    var zakryt = function (vernutFokus) {
      if (!nav.classList.contains('open')) return;
      nav.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      /* Снимаем только с того, что гасили сами: чужой inert не трогаем */
      pogashen.forEach(function (el) { el.removeAttribute('inert'); });
      pogashen = [];
      if (vernutFokus) burger.focus();
    };

    var otkryt = function () {
      nav.classList.add('open');
      burger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      pogashen = fon.filter(function (el) { return !el.hasAttribute('inert'); });
      pogashen.forEach(function (el) { el.setAttribute('inert', ''); });
    };

    burger.addEventListener('click', function () {
      if (nav.classList.contains('open')) { zakryt(false); } else { otkryt(); }
    });

    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') zakryt(false);
    });

    document.addEventListener('keydown', function (e) {
      if (!nav.classList.contains('open')) return;
      if (e.key === 'Escape' || e.key === 'Esc') { zakryt(true); return; }
      if (e.key !== 'Tab') return;
      /* Кольцо обхода - вся шапка вместе со шторкой: логотип, ссылки меню,
         телефон и сама кнопка. Прежний перехват знал только два положения
         (кнопка и последняя ссылка меню) и держался на том, что кнопка стоит
         в разметке ПЕРЕД меню. 09.09 кнопку переставили за телефон, чтобы
         порядок обхода совпал с тем, что видит глаз (WCAG 2.4.3), и старое
         кольцо разомкнулось: за кнопкой в разметке не осталось ничего, кроме
         погашенного фона, и Tab с кнопки уводил фокус со страницы вообще.
         Список собирается по живой разметке, поэтому кнопка «Запросить расчёт»,
         спрятанная на узком экране, в кольцо не попадает. */
      var koltso = Array.prototype.filter.call(
        (shapka || nav).querySelectorAll('a[href], button:not([disabled])'),
        function (el) { return el.offsetWidth || el.offsetHeight || el.getClientRects().length; }
      );
      if (koltso.length < 2) return;
      var pervy = koltso[0];
      var posledny = koltso[koltso.length - 1];
      if (e.shiftKey && document.activeElement === pervy) { e.preventDefault(); posledny.focus(); }
      else if (!e.shiftKey && document.activeElement === posledny) { e.preventDefault(); pervy.focus(); }
    });

    document.addEventListener('click', function (e) {
      if (nav.classList.contains('open') && !nav.contains(e.target) && !burger.contains(e.target)) zakryt(false);
    });

    /* Развернули телефон в ландшафт - шторки уже нет, состояние сбрасываем */
    var uzko = window.matchMedia('(max-width: 860px)');
    if (uzko.addEventListener) {
      uzko.addEventListener('change', function (m) { if (!m.matches) zakryt(false); });
    }
  }

  /* ---- 2. Появление блоков при прокрутке ----
     Всё, что попадает в первый экран, показывается сразу и без движения:
     посетитель не должен видеть пустоту под первым экраном, пока не тронет
     колесо. Прежний порог (0.08 от высоты блока) высокие блоки не проходили:
     блок высотой 715px требовал 57 видимых пикселей, а получал 56, и первый
     экран приезжал с дырой. Наблюдаем только то, что реально ниже сгиба. */
  var risers = document.querySelectorAll('.rise');

  /* Ступенчатая подача. Раньше все 28 блоков главной появлялись одинаково:
     та же дистанция, та же длительность, та же кривая. Теперь у контейнера,
     все дети которого однотипны, проявляется не он сам, а его дети по очереди.

     Два словаря вместо одного: строка перечня короче и быстрее, карточка
     крупнее и едет дальше. Шаг задержки обрывается на пятом элементе -
     иначе десятая строка ждала бы почти полсекунды после первой.

     Классы ставит скрипт, а не разметка. Поэтому при сбое загрузки main.js
     ни один из этих блоков не окажется спрятанным: прятать их некому. */
  var GRUPPY = [
    ['gr-stroka', '.road, .list-row, .doc, .prop, .fact'],
    ['gr-karta',  '.member, .aud, .plogo, .contact-cell, .card']
  ];
  var SHAGOV = 5;

  function nastroitGruppu(el) {
    var deti = Array.prototype.filter.call(el.children, function (c) { return c.nodeType === 1; });
    if (deti.length < 2) return;
    for (var i = 0; i < GRUPPY.length; i++) {
      var vse = deti.every(function (c) { return c.matches(GRUPPY[i][1]); });
      if (!vse) continue;
      el.classList.add('rise--gr', GRUPPY[i][0]);
      deti.forEach(function (c, n) { c.style.setProperty('--i', Math.min(n, SHAGOV - 1)); });
      return;
    }
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('seen');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });

    var granica = window.innerHeight * 0.92;
    risers.forEach(function (el) {
      try { nastroitGruppu(el); } catch (e) { /* группа - улучшение, не условие */ }
      if (el.getBoundingClientRect().top < granica) {
        el.classList.add('seen');   /* первый экран: сразу, без анимации */
      } else {
        io.observe(el);
      }
    });
  } else {
    risers.forEach(function (el) { el.classList.add('seen'); });
  }

  /* Фокус никогда не стоит на невидимом. Наблюдатель объявлен с отрицательным
     rootMargin: нижние 10% экрана из зоны наблюдения исключены, чтобы блок
     не проявлялся, едва высунувшись из-за края. Но браузер, переводя фокус
     клавишей Tab на ссылку ниже экрана, прокручивает минимально и кладёт её
     ровно в эту исключённую полосу: на экране 1440x900 это точки 810-900.
     Класс seen не выдавался, элемент оставался полностью прозрачным и при
     этом держал фокус - вместе с кольцом фокуса. Воспроизведено дважды на
     главной (Tab 17 и Tab 42) и на контактах.
     Правкой одного rootMargin это не чинится: полоса считается от высоты
     окна, значит на другом экране вылезет в другом месте. Поэтому страховка
     стоит на самом событии: получил фокус - твой блок показан немедленно.
     Идём вверх по всем предкам с классом rise, потому что блоки вложены. */
  document.addEventListener('focusin', function (e) {
    var el = e.target;
    if (!el || !el.closest) return;
    var blok = el.closest('.rise');
    while (blok) {
      if (!blok.classList.contains('seen')) {
        blok.classList.add('seen');
        if (typeof io !== 'undefined' && io) {
          try { io.unobserve(blok); } catch (err) { /* уже снят с наблюдения */ }
        }
      }
      blok = blok.parentElement ? blok.parentElement.closest('.rise') : null;
    }
  });

  /* Материал в конструкции: управление доступно мышью и клавиатурой. */
  var model = document.querySelector('.material-model');
  if (model) {
    var choices = model.querySelectorAll('[data-material-choice]');
    var explanation = model.querySelector('.material-explanation');
    choices.forEach(function (button) {
      button.addEventListener('click', function () {
        var layer = button.getAttribute('data-material-choice');
        model.setAttribute('data-layer', layer);
        model.querySelectorAll('[data-material-image]').forEach(function (picture) {
          picture.hidden = picture.getAttribute('data-material-image') !== layer;
        });
        choices.forEach(function (choice) {
          choice.setAttribute('aria-pressed', String(choice === button));
        });
        explanation.textContent = layer === 'geo'
          ? 'Геосинтетика применяется для армирования конструкции.'
          : 'АДМ-2 вводится в асфальтобетонную смесь.';
      });
    });
    explanation.setAttribute('aria-live', 'polite');
    model.querySelector('.material-switch').hidden = false;
  }

  /* ---- 3. Формы заявки ----
     Заявка уходит на сервер (otpravit.php), а не в почтовую программу
     посетителя. Без JavaScript форма отправляется обычным POST на тот же
     адрес и сервер отвечает страницей: заявка не теряется.

     Форм на сайте несколько (главная и контакты), поэтому логика ищет свои
     части внутри формы, а не по общим на весь документ именам. Добавить
     форму на новую страницу можно одной разметкой, код трогать не нужно. */
  document.querySelectorAll('form.js-zayavka').forEach(function (form) {
    var msg = form.querySelector('.form-msg');
    var svodka = form.querySelector('.form-err');
    if (!msg) return;

    function pokazat(text, oshibka) {
      /* Ошибка перебивает речь, успех ждёт паузы. Раньше провал отправки
         объявлялся тем же вежливым тоном, что и «заявка принята»: человек,
         читающий страницу голосом, уходил уверенным, что заявка ушла, и
         не слышал телефона в сообщении. Атрибуты ставятся до текста,
         иначе браузер объявит содержимое по прежней вежливости. */
      msg.setAttribute('role', oshibka ? 'alert' : 'status');
      msg.setAttribute('aria-live', oshibka ? 'assertive' : 'polite');
      msg.textContent = text;
      /* Отказ заканчивается живой ссылкой на телефон и почту. Это
         единственный оставшийся у посетителя путь, и на телефоне он
         должен быть в одно касание, а не в переписывание цифр с экрана:
         заявка уже не ушла, второй раз человек не вернётся. */
      if (oshibka) {
        msg.appendChild(document.createTextNode(' Позвоните: '));
        var tel = document.createElement('a');
        tel.href = 'tel:+73432372772';
        tel.textContent = '+7 343 237-27-72';
        msg.appendChild(tel);
        msg.appendChild(document.createTextNode(' или напишите на '));
        var pochta = document.createElement('a');
        pochta.href = 'mailto:info@dor-snab.com';
        pochta.textContent = 'info@dor-snab.com';
        msg.appendChild(pochta);
        msg.appendChild(document.createTextNode('.'));
      }
      msg.classList.add('on');
      msg.classList.toggle('is-error', !!oshibka);
    }

    /* Ошибка живёт в двух местах: строкой у самого поля, чтобы её увидел
       глазами тот, кто уже смотрит на поле, и сводкой над формой, чтобы её
       услышал тот, кто читает страницу голосом. Раньше было одно сообщение
       под кнопкой, и на длинной форме оно оказывалось за краем экрана. */
    function stroka(field) {
      var ryadom = field.closest('.field, .consent');
      return ryadom ? ryadom.querySelector('.field-err') : null;
    }

    function chistoOshibki() {
      if (svodka) { svodka.textContent = ''; svodka.classList.remove('on'); }
      form.querySelectorAll('.field-err').forEach(function (p) { p.hidden = true; p.textContent = ''; });
      form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    }

    function oshibkaPolya(el) {
      var value = el.value.trim();
      if (el.name === 'name' && !value) return 'Укажите, как к вам обращаться.';
      if (el.name === 'phone') {
        if (!value) return 'Нужен телефон, чтобы ответить по расчёту.';
        var digits = value.replace(/\D/g, '').length;
        if (digits < 10 || digits > 18) return 'Проверьте телефон: нужен полный номер с кодом города или оператора.';
      }
      if (el.name === 'email' && value && !/^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(value)) return 'Проверьте почту: адрес пишется в виде name@company.ru.';
      if (el.name === 'consent' && !el.checked) return 'Отметьте согласие на обработку персональных данных.';
      return '';
    }

    form.querySelectorAll('input, textarea').forEach(function (el) {
      function snyat() {
        if (el.getAttribute('aria-invalid') !== 'true') return;
        var error = oshibkaPolya(el);
        var p = stroka(el);
        var link = svodka && Array.prototype.find.call(svodka.querySelectorAll('a'), function (a) { return a.getAttribute('href') === '#' + el.id; });
        if (error) {
          if (p && p.textContent !== error) p.textContent = error;
          if (link && link.textContent !== error) link.textContent = error;
          return;
        }
        el.removeAttribute('aria-invalid');
        if (p) { p.hidden = true; p.textContent = ''; }
        if (link) link.parentElement.remove();
        if (svodka) {
          var count = svodka.querySelectorAll('li').length;
          var title = svodka.querySelector('.form-err-t');
          if (!count) { svodka.textContent = ''; svodka.classList.remove('on'); }
          else if (title) title.textContent = count === 1
            ? 'Заявка не отправлена, одно поле требует внимания:'
            : 'Заявка не отправлена, полей требует внимания: ' + count + '.';
        }
      }
      el.addEventListener('input', snyat);
      el.addEventListener('change', snyat);
    });

    form.querySelectorAll('button[type=submit]').forEach(function (button) { button.disabled = false; });

    form.addEventListener('submit', function (e) {
      var knopka = form.querySelector('button[type=submit]');

      /* Повторное нажатие, пока заявка в пути, ничего не делает.
         Кнопка помечена aria-disabled, а не disabled: disabled выбрасывает
         фокус на body, и тот, кто идёт клавиатурой, теряет своё место. */
      if (knopka && knopka.getAttribute('aria-disabled') === 'true') {
        e.preventDefault();
        return false;
      }

      chistoOshibki();

      var name = form.querySelector('[name=name]');
      var phone = form.querySelector('[name=phone]');
      var consent = form.querySelector('[name=consent]');

      /* Все ошибки собираются за один проход. Раньше стояли три
         последовательных return: три незаполненных поля означали три
         отправки и три круга «нажал - прочитал - исправил». Форма заявки
         это единственная точка конверсии сайта, и каждый лишний круг
         здесь стоит заявки. Сводка списком заодно говорит голосом,
         сколько всего осталось, а не только про первое поле. */
      var mail = form.querySelector('[name=email]');

      /* Вид телефона и почты проверяется здесь, а не только на сервере.
         Сервер отказ отдаёт, но человек узнавал об этом уже после отправки:
         «12» уходило как телефон, «нетсобаки» как почта. Считаем цифры,
         а не рисунок номера: формат записи у всех свой, а меньше десяти
         цифр это не номер ни в одном из них. Восемнадцать - предел
         международного номера по Е.164 плюс запас на разделители. */
      var oshibki = [];
      [name, phone, mail, consent].forEach(function (field) {
        if (!field) return;
        var error = oshibkaPolya(field);
        if (error) oshibki.push([field, error]);
      });

      if (oshibki.length) {
        e.preventDefault();
        oshibki.forEach(function (o) {
          o[0].setAttribute('aria-invalid', 'true');
          var p = stroka(o[0]);
          if (p) { p.textContent = o[1]; p.hidden = false; }
        });
        if (svodka) {
          svodka.textContent = '';
          var zagolovok = document.createElement('p');
          zagolovok.className = 'form-err-t';
          zagolovok.textContent = oshibki.length === 1
            ? 'Заявка не отправлена, одно поле требует внимания:'
            : 'Заявка не отправлена, полей требует внимания: ' + oshibki.length + '.';
          svodka.appendChild(zagolovok);
          var spisok = document.createElement('ul');
          oshibki.forEach(function (o) {
            var punkt = document.createElement('li');
            var telo = o[0].id ? document.createElement('a') : document.createElement('span');
            if (o[0].id) {
              telo.href = '#' + o[0].id;
              telo.addEventListener('click', function (ev) { ev.preventDefault(); o[0].focus(); });
            }
            telo.textContent = o[1];
            punkt.appendChild(telo);
            spisok.appendChild(punkt);
          });
          svodka.appendChild(spisok);
          svodka.classList.add('on');
          svodka.focus();
        } else {
          oshibki[0][0].focus();
        }
        return false;
      }

      e.preventDefault();
      pokazat('Это предпросмотр: заявка не отправлена. Отправка будет подключена на рабочем хостинге.', false);
      return false;

      if (!window.fetch || !window.FormData) return;   /* уйдёт обычным POST */

      e.preventDefault();
      var podpis = knopka ? knopka.textContent : '';
      if (knopka) {
        knopka.setAttribute('aria-disabled', 'true');
        knopka.setAttribute('aria-busy', 'true');
        knopka.textContent = 'Отправляем…';
      }
      pokazat('Отправляем заявку.', false);

      /* Пятнадцать секунд и не больше: без предела зависшая сеть оставляла
         кнопку выключенной навсегда, а посетителя - без ответа и без
         возможности повторить. */
      var kontrol = window.AbortController ? new AbortController() : null;
      var srok = kontrol ? setTimeout(function () { kontrol.abort(); }, 15000) : 0;

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'X-Requested-With': 'fetch' },
        signal: kontrol ? kontrol.signal : undefined
      })
        /* Успех объявляется только тогда, когда сервер прислал разобранный
           JSON и в нём ok истинно. Прежний разбор считал успехом любой код
           200: на хостинге с PHP 5.6 файл otpravit.php не запускается,
           PHP печатает ошибку разбора и отдаёт её кодом 200, и посетитель
           читал «Заявка принята» при непришедшей заявке. Тот же исход даёт
           хостинг, который отдаёт .php текстом. Ответ не разобрался - это
           ошибка с телефоном, а не успех. */
        .then(function (r) {
          return r.text().then(function (t) {
            var razobrano = null;
            try { razobrano = JSON.parse(t); } catch (e) { razobrano = null; }
            return razobrano;
          });
        })
        .then(function (d) {
          if (d && typeof d === 'object' && d.ok === true) {
            form.reset();
            pokazat(d.text || 'Заявка принята. Ответим по расчёту на указанный телефон.', false);
          } else if (d && typeof d === 'object') {
            pokazat('Ошибка: ' + (d.text || 'заявка не ушла.'), true);
          } else {
            pokazat('Ошибка: заявка не ушла, сервер ответил неразборчиво.', true);
          }
        })
        .catch(function (err) {
          pokazat('Ошибка: ' + (err && err.name === 'AbortError'
            ? 'сервер не ответил за 15 секунд, заявка не подтверждена.'
            : 'заявка не ушла, связь с сервером не установлена.'), true);
        })
        .then(function () {
          if (srok) clearTimeout(srok);
          if (knopka) {
            knopka.removeAttribute('aria-disabled');
            knopka.removeAttribute('aria-busy');
            knopka.textContent = podpis;
          }
        });
    });
  });


  /* ---- 3.1 Откуда пришла заявка ----
     Кнопок, ведущих в форму, семь, и надписи у них разные: «подобрать под
     рецептуру», «запросить спецификацию», «запросить документы». Менеджер
     получал одинаковое письмо и начинал разговор с нуля. Раздел приезжает
     скрытым полем: с той же страницы через data-istochnik, с других -
     параметром ot в адресе. */
  var stranica = location.pathname.split('/').pop() || 'index.html';

  /* Кнопка в шапке стоит на всех девяти страницах и раздела не называет:
     её источник - сама страница, а не «шапка». Поэтому она считается общей,
     и определяем это по разметке (лежит внутри header), а не по надписи. */
  var shapka_bloka = document.querySelector('header');
  function obshchaya(a) { return !!(shapka_bloka && shapka_bloka.contains(a)); }

  /* Имя страницы берём из её заголовка, а не из словаря в скрипте: заголовки
     правят в разметке, и словарь тут разошёлся бы с сайтом на первой же правке. */
  function imya_stranicy() {
    var h1 = document.querySelector('h1');
    var t = h1 ? h1.textContent.replace(/\s+/g, ' ').trim() : '';
    return (t || stranica.replace(/\.html$/, '')).slice(0, 60);
  }

  /* Переход на другую страницу: источник едет параметром ot в адресе.
     Раньше эту ветку никто не заполнял, и она была мёртвой - параметр
     ot не ставила ни одна ссылка на сайте. Практический след: на политике
     обработки данных формы нет, кнопка шапки ведёт на контакты, и менеджер
     получал «контакты» вместо страницы, с которой человек пришёл.
     Адрес переписываем сразу при загрузке, а не по клику: тогда источник
     доезжает и при открытии ссылки в новой вкладке. Поисковику лишний
     адрес не вредит: на всех девяти страницах стоит canonical без параметров. */
  document.querySelectorAll('a[data-istochnik][href]').forEach(function (a) {
    var href = a.getAttribute('href') || '';
    var chasti = href.split('#');
    var put = chasti[0];
    var yakor = chasti[1] ? '#' + chasti[1] : '';
    if (!put || put.indexOf('?') !== -1) return;              /* свой якорь или адрес уже с параметром */
    if (!/\.html$/i.test(put)) return;                        /* tel:, mailto:, картинки - мимо */
    if (/^(https?:)?\/\//i.test(put)) return;                 /* чужой домен: имя нашей страницы туда не уезжает */
    if (put.split('/').pop() === stranica) return;            /* та же страница */
    var znachenie = obshchaya(a) ? imya_stranicy() : a.getAttribute('data-istochnik');
    a.setAttribute('href', put + '?ot=' + encodeURIComponent(znachenie) + yakor);
  });

  /* Ищем по имени поля, а не по id: id был только у формы на главной,
     поэтому на «Контактах» параметр ot не подхватывался и в письмо
     всегда уходило «контакты». */
  var polya_ist = document.querySelectorAll('input[name="istochnik"]');
  if (polya_ist.length) {
    var postavit = function (znachenie) {
      Array.prototype.forEach.call(polya_ist, function (pole) { pole.value = znachenie; });
    };
    var iz_adresa = new URLSearchParams(location.search).get('ot');
    if (iz_adresa) postavit(iz_adresa.slice(0, 60));

    document.querySelectorAll('[data-istochnik]').forEach(function (a) {
      /* Общая кнопка на странице с формой поле не трогает. Прежний код
         затирал ею уже определённый раздел: человек нажал «геосинтетика»,
         пролистал наверх, нажал кнопку шапки - и менеджеру уезжало «шапка»
         вместо геосинтетики. Без клика в поле лежит название страницы,
         проставленное разметкой, и оно всегда полезнее слова «шапка». */
      if (obshchaya(a)) return;
      a.addEventListener('click', function () {
        postavit(a.getAttribute('data-istochnik'));
      });
    });
  }

  /* ---- 4. Подсветка текущего раздела в меню ---- */
  document.querySelectorAll('.nav a').forEach(function (a) {
    if (a.getAttribute('href') === stranica) a.setAttribute('aria-current', 'page');
  });

  /* ---- 5. Копирование реквизитов ----
     Кнопка есть на «Контактах» и на «Реквизитах». Раньше один и тот же
     код лежал двумя копиями прямо в разметке этих страниц, и комментарий
     в нём уверял, что кнопка только одна. Теперь код общий: он берёт
     блок с реквизитами по id и обходит внутри него строки th / td.
     Блоком может быть и сама таблица (Контакты), и обёртка вокруг неё
     (Реквизиты, где 09.09 снят банковский блок и осталась одна карточка
     предприятия), - код смотрит на строки, а не на тег.

     Раздел стоит в условии, а не за проверкой с return на верхнем уровне.
     Прежний return выходил из всей обёртки: любой дописанный ниже код
     молча переставал работать на семи страницах из девяти - на всех,
     где кнопки копирования нет. */
  var btn = document.getElementById('copy-req');
  var table = document.getElementById('req-table');

  if (btn && table && !btn.dataset.bound) {
    btn.dataset.bound = '1';

    var label = btn.textContent;
    var timer = null;

    var collect = function () {
      var lines = [];
      Array.prototype.forEach.call(table.querySelectorAll('tr'), function (row) {
        var k = row.querySelector('th');
        var v = row.querySelector('td');
        if (k && v) {
          lines.push(k.textContent.replace(/\s+/g, ' ').trim() + ': ' +
                     v.textContent.replace(/\s+/g, ' ').trim());
        }
      });
      return lines.join('\n');
    };

    var msg = document.getElementById('copy-msg');

    var done = function () {
      /* Ширину замораживаем по исходной надписи. Иначе цель, по которой
         только что попал палец, ужимается с 307 до 145 точек, держит
         новый размер две секунды и разъезжается обратно: два прыжка
         раскладки на каждое копирование и промах при повторном нажатии. */
      var shirina = btn.getBoundingClientRect().width;
      if (shirina > parseFloat(btn.style.minWidth || 0)) {
        btn.style.minWidth = Math.ceil(shirina) + 'px';
      }
      btn.textContent = 'Скопировано';
      if (msg) msg.textContent = 'Реквизиты скопированы в буфер обмена';
      clearTimeout(timer);
      timer = setTimeout(function () {
        btn.textContent = label;
        if (msg) msg.textContent = '';
      }, 2000);
    };

    var fallback = function (text) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* браузер запретил */ }
      document.body.removeChild(ta);
    };

    /* Строк не осталось - кнопки нет. Код брал любые tr внутри блока, и после
       снятия банковской таблицы 09.09 такой случай перестал быть выдуманным:
       уберут из блока последнюю таблицу - и кнопка молча клала бы в буфер
       пустоту, отвечая при этом «Скопировано». Кнопка, которая врёт, хуже
       отсутствующей кнопки, поэтому в пустом блоке её просто не показываем. */
    if (!collect()) {
      btn.style.display = 'none';
      if (msg) msg.style.display = 'none';
    } else {
      btn.addEventListener('click', function () {
        var text = collect();
        if (!text) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () { fallback(text); });
        } else {
          fallback(text);
        }
      });
    }
  }
})();
