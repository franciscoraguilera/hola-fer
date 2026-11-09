(function () {
  'use strict';

  var raiz = document.documentElement;
  raiz.classList.add('js');

  function limitar(n, min, max) {
    return n < min ? min : n > max ? max : n;
  }

  var porRevelar = document.querySelectorAll(
    '.capitulo .foto, .capitulo .texto > p, .dicho > *, .extrano > *, .baul .foto, .baul__texto > p, .perdon > *, .caja, .cita > h2, .cita > p, .cita > form'
  );

  [].forEach.call(porRevelar, function (el) {
    el.classList.add('reveal');
    var i = [].indexOf.call(el.parentNode.children, el);
    if (i > 0) el.style.setProperty('--d', (i * 0.16).toFixed(2) + 's');
  });

  if ('IntersectionObserver' in window) {
    var ojo = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        ojo.unobserve(e.target);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });

    [].forEach.call(porRevelar, function (el) { ojo.observe(el); });
  } else {
    [].forEach.call(porRevelar, function (el) { el.classList.add('is-in'); });
  }

  var video = document.querySelector('.foto--video video');
  if (video && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) {
          var intento = video.play();
          if (intento && intento.catch) intento.catch(function () {});
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.35 }).observe(video);
  }

  var fijas = [].map.call(document.querySelectorAll('[data-scroll]'), function (el) {
    return {
      el: el,
      lineas: el.querySelectorAll('[data-at]'),
      textos: el.querySelectorAll('[data-from]'),
      pin: el.firstElementChild,
      esCielo: el.classList.contains('cielo')
    };
  });

  function suave(t) {
    return t * t * (3 - 2 * t);
  }

  function avanzar() {
    var barraEl = document.getElementById('radio');
    var barra = barraEl ? barraEl.offsetHeight : 0;

    fijas.forEach(function (s) {
      var caja = s.el.getBoundingClientRect();
      var recorrido = caja.height - s.pin.offsetHeight;
      var p = recorrido > 0 ? limitar((barra - caja.top) / recorrido, 0, 1) : 1;

      s.el.style.setProperty('--p', p.toFixed(4));

      [].forEach.call(s.lineas, function (l) {
        l.classList.toggle('is-on', p >= parseFloat(l.getAttribute('data-at')));
      });

      [].forEach.call(s.textos, function (t) {
        var desde = parseFloat(t.getAttribute('data-from'));
        var hasta = parseFloat(t.getAttribute('data-to'));
        t.classList.toggle('is-on', p >= desde && p < hasta);
      });

      if (s.esCielo) {
        var f = suave(limitar((p - 0.4) / 0.32, 0, 1));
        s.el.style.setProperty('--f', f.toFixed(4));
      }
    });
  }

  var pendiente = false;
  function pedir() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(function () {
      pendiente = false;
      avanzar();
    });
  }

  window.addEventListener('scroll', pedir, { passive: true });
  window.addEventListener('resize', pedir);
  avanzar();

  function sembrar(el, cuantas, semilla) {
    if (!el) return;
    var s = semilla;
    function azar() {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    }
    var puntos = [];
    for (var i = 0; i < cuantas; i++) {
      var x = (azar() * 100).toFixed(2);
      var y = (azar() * 100).toFixed(2);
      var r = azar();
      var grosor = r < 0.14 ? 2.1 : r < 0.5 ? 1.4 : 0.8;
      var brillo = (0.6 + azar() * 0.4).toFixed(2);
      puntos.push(x + 'vw ' + y + 'vh 1.5px ' + grosor + 'px rgba(255,255,255,' + brillo + ')');
      if (grosor > 2) {
        puntos.push(x + 'vw ' + y + 'vh 6px ' + grosor + 'px rgba(225,205,255,0.35)');
      }
    }
    el.style.boxShadow = puntos.join(',');
  }

  sembrar(document.querySelector('.cielo__estrellas'), 70, 2348);
  sembrar(document.querySelector('.cielo__estrellas--titilan'), 26, 9330);

  var caja = document.getElementById('caja');
  var zona = document.getElementById('botones');
  var si = document.getElementById('si');
  var no = document.getElementById('no');
  var nota = document.getElementById('nota');

  if (!caja || !zona || !si || !no) return;

  var notas = [
    '¿Segura?',
    'Mirá esa carita.',
    'El gatito lleva días sin dormir.',
    'Qué raro, ese botón anda fallando.',
    'Fer, por favor.',
    'Creo que solo funciona el otro botón.',
    'Puedo seguir así todo el día.',
    'El gatito y yo tenemos paciencia.'
  ];

  var intentos = 0;
  var ultimoSalto = 0;

  var estado = window.respuestaFer = { perdono: false, momentoSi: null, intentosNo: 0 };

  function soltar() {
    if (no.classList.contains('suelto')) return;
    var z = zona.getBoundingClientRect();
    var b = no.getBoundingClientRect();
    no.style.transition = 'none';
    no.style.left = (b.left - z.left) + 'px';
    no.style.top = (b.top - z.top) + 'px';
    no.classList.add('suelto');
    void no.offsetWidth;
    no.style.transition = '';
  }

  function seTocan(x, y, ancho, alto, r, aire) {
    return x < r.right + aire && x + ancho > r.left - aire &&
           y < r.bottom + aire && y + alto > r.top - aire;
  }

  function ubicar() {
    var z = zona.getBoundingClientRect();
    var area = zona.parentNode.getBoundingClientRect();
    var ancho = no.offsetWidth;
    var alto = no.offsetHeight;
    var ahoraX = (parseFloat(no.style.left) || 0) + z.left;
    var ahoraY = (parseFloat(no.style.top) || 0) + z.top;

    var borde = 8;
    var minX = area.left + borde;
    var maxX = area.right - ancho - borde;
    var minY = area.top + borde;
    var maxY = z.bottom - alto;

    var obstaculos = [[si.getBoundingClientRect(), 16]];
    var titulo = zona.parentNode.querySelector('h2');
    if (titulo) obstaculos.push([titulo.getBoundingClientRect(), 2]);
    if (nota) obstaculos.push([nota.getBoundingClientRect(), 0]);

    var mejor = null;
    var mejorDist = -1;

    for (var i = 0; i < 60; i++) {
      var x = minX + Math.random() * Math.max(0, maxX - minX);
      var y = minY + Math.random() * Math.max(0, maxY - minY);
      var choca = false;
      for (var j = 0; j < obstaculos.length; j++) {
        if (seTocan(x, y, ancho, alto, obstaculos[j][0], obstaculos[j][1])) { choca = true; break; }
      }
      if (choca) continue;
      var dist = Math.abs(x - ahoraX) + Math.abs(y - ahoraY);
      if (dist > mejorDist) {
        mejor = { x: x, y: y };
        mejorDist = dist;
      }
      if (dist > 130) break;
    }

    if (mejor) {
      no.style.left = (mejor.x - z.left).toFixed(1) + 'px';
      no.style.top = (mejor.y - z.top).toFixed(1) + 'px';
    }
  }

  function escapar() {
    soltar();
    intentos += 1;
    estado.intentosNo = intentos;
    ultimoSalto = Date.now();
    ubicar();

    no.style.setProperty('--s', Math.max(0.74, 1 - intentos * 0.035).toFixed(2));
    si.style.setProperty('--s', Math.min(1.4, 1 + intentos * 0.05).toFixed(2));

    if (nota) {
      var cual = intentos <= notas.length ? intentos - 1 : notas.length - 2 + (intentos % 2);
      nota.textContent = notas[cual];
    }
  }

  no.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    escapar();
  });

  no.addEventListener('click', function (e) {
    e.preventDefault();
    if (Date.now() - ultimoSalto > 350) escapar();
  });

  window.addEventListener('resize', function () {
    if (no.classList.contains('suelto')) ubicar();
  });

  var meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  function dos(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  si.addEventListener('click', function () {
    var pregunta = caja.querySelector('.caja__pregunta');
    var fin = caja.querySelector('.caja__final');
    var momento = document.getElementById('momento');
    var d = new Date();

    if (momento) {
      momento.textContent = d.getDate() + ' de ' + meses[d.getMonth()] + ', ' +
        dos(d.getHours()) + ':' + dos(d.getMinutes()) + '. El momento en que dijiste que sí.';
    }

    pregunta.hidden = true;
    fin.hidden = false;
    document.body.classList.add('perdonado');

    var cita = document.getElementById('cita');
    var sigue = document.getElementById('sigue');
    if (cita) cita.hidden = false;
    if (sigue) sigue.hidden = false;

    estado.perdono = true;
    estado.momentoSi = d.toISOString();
    try { document.dispatchEvent(new CustomEvent('fer:perdono')); } catch (e) {}

    var quieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    caja.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'center' });
  });
})();
