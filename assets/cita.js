(function () {
  'use strict';

  var DESTINO = 'https://formsubmit.co/ajax/rolandoaguilera99@gmail.com';

  var dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  function dos(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function mayuscula(t) {
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function minuscula(t) {
    return t.charAt(0).toLowerCase() + t.slice(1);
  }

  var CLAVE = 'fer-avisos-pendientes';
  var CLAVE_SI = 'fer-dijo-que-si';
  var MAX_INTENTOS = 8;
  var VENCE_MS = 7 * 24 * 60 * 60 * 1000;

  var cola = [];
  var enviando = false;
  var intentos = 0;
  var reloj = null;

  function cargarCola() {
    try {
      var guardada = JSON.parse(window.localStorage.getItem(CLAVE));
      if (Array.isArray(guardada)) {
        var ahora = Date.now();
        cola = guardada.filter(function (a) { return a && a.carta && ahora - (a.creado || 0) < VENCE_MS; });
      }
    } catch (e) {}
  }

  function guardarCola() {
    try { window.localStorage.setItem(CLAVE, JSON.stringify(cola)); } catch (e) {}
  }

  function entregar(carta) {
    var control = window.AbortController ? new AbortController() : null;
    var corte = control ? setTimeout(function () { control.abort(); }, 20000) : null;

    return fetch(DESTINO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(carta),
      keepalive: true,
      signal: control ? control.signal : undefined
    }).then(function (resp) {
      return resp.json().catch(function () { return {}; }).then(function (datos) {
        if (corte) clearTimeout(corte);
        if (!resp.ok || String(datos.success) === 'false') throw new Error('rechazado');
      });
    });
  }

  function vaciar() {
    if (enviando || !cola.length) return;
    if (reloj) { clearTimeout(reloj); reloj = null; }
    enviando = true;

    entregar(cola[0].carta).then(function () {
      cola.shift();
      guardarCola();
      enviando = false;
      intentos = 0;
      vaciar();
    }, function () {
      enviando = false;
      intentos += 1;
      if (intentos >= MAX_INTENTOS) return;
      reloj = setTimeout(vaciar, Math.min(60000, 3000 * Math.pow(2, intentos - 1)));
    });
  }

  function despachar(carta) {
    cola.push({ creado: Date.now(), carta: carta });
    guardarCola();
    intentos = 0;
    vaciar();
  }

  function reintentar() {
    intentos = 0;
    vaciar();
  }

  window.addEventListener('online', reintentar);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) reintentar();
  });

  cargarCola();
  vaciar();

  var form = document.getElementById('cita-form');
  var fecha = document.getElementById('cita-fecha');
  var hora = document.getElementById('cita-hora');
  var lugares = document.getElementById('cita-lugares');
  var resumen = document.getElementById('cita-resumen');
  var aviso = document.getElementById('cita-aviso');
  var listo = document.getElementById('cita-listo');
  var confirmado = document.getElementById('cita-confirmado');
  var cambiar = document.getElementById('cita-cambiar');

  var ELIGE_FRAN = 'fran';
  var citaElegida = null;

  function lugarMarcado() {
    if (!lugares) return '';
    var marcado = lugares.querySelector('input[name="lugar"]:checked');
    return marcado ? marcado.value : '';
  }

  function leer() {
    if (!fecha || !hora || !fecha.value || !hora.value) return null;
    var p = fecha.value.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    if (isNaN(d.getTime())) return null;
    var h = hora.value.slice(0, 5);
    var cuando = new Date(+p[0], +p[1] - 1, +p[2], +h.slice(0, 2), +h.slice(3, 5));
    var lugar = lugarMarcado();
    var base = mayuscula(dias[d.getDay()]) + ' ' + d.getDate() + ' de ' + meses[d.getMonth()] + ', a las ' + h;

    return {
      iso: fecha.value,
      dia: dias[d.getDay()],
      fechaTexto: d.getDate() + ' de ' + meses[d.getMonth()] + ' de ' + d.getFullYear(),
      hora: h,
      lugar: lugar,
      eligeFran: lugar === ELIGE_FRAN,
      frase: base + (!lugar ? '' : lugar === ELIGE_FRAN ? '. El lugar lo elige TU marido.' : ', en ' + lugar),
      fraseCorreo: base + (!lugar ? '' : lugar === ELIGE_FRAN ? ' (el lugar lo elegís vos)' : ', en ' + lugar),
      yaPaso: cuando.getTime() < Date.now()
    };
  }

  function armar() {
    var estado = window.respuestaFer || {};
    var zona = '';
    try { zona = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}

    var siDeAntes = null;
    try { siDeAntes = window.localStorage.getItem(CLAVE_SI); } catch (e) {}

    return {
      perdono: !!estado.perdono || !!siDeAntes,
      momento_del_si: estado.momentoSi || siDeAntes || null,
      veces_que_apreto_no: estado.intentosNo || 0,
      cita: citaElegida ? {
        dia: citaElegida.dia,
        fecha: citaElegida.iso,
        fecha_en_palabras: citaElegida.fechaTexto,
        hora: citaElegida.hora,
        lugar: citaElegida.eligeFran ? null : citaElegida.lugar,
        lugar_lo_elige_fran: citaElegida.eligeFran
      } : null,
      enviado: new Date().toISOString(),
      zona_horaria: zona
    };
  }

  function carta(asunto) {
    var r = armar();
    var c = {
      _subject: asunto,
      _template: 'table',
      _captcha: 'false',
      '¿Te perdonó?': r.perdono ? 'Sí' : 'Todavía no apretó que sí',
      'Veces que apretó No': String(r.veces_que_apreto_no)
    };
    if (citaElegida) {
      c['Día'] = mayuscula(citaElegida.dia);
      c['Fecha'] = citaElegida.fechaTexto;
      c['Hora'] = citaElegida.hora;
      c['Lugar'] = citaElegida.eligeFran ? 'Lo elegís vos' : citaElegida.lugar;
    } else {
      c['Día, hora y lugar para hablar'] = 'Todavía no eligió';
    }
    c['JSON'] = JSON.stringify(r);
    return c;
  }

  document.addEventListener('fer:perdono', function () {
    try {
      window.localStorage.setItem(CLAVE_SI, (window.respuestaFer && window.respuestaFer.momentoSi) || new Date().toISOString());
    } catch (e) {}
    despachar(carta('Fer te perdonó' + (citaElegida ? ' (eligió ' + minuscula(citaElegida.fraseCorreo) + ')' : '')));
  });

  if (!form) return;

  var hoy = new Date();
  fecha.min = hoy.getFullYear() + '-' + dos(hoy.getMonth() + 1) + '-' + dos(hoy.getDate());

  function resumir() {
    var c = leer();
    resumen.textContent = c ? c.frase + '.' : '';
    fecha.classList.remove('falta');
    hora.classList.remove('falta');
    if (lugares) lugares.classList.remove('falta');
    aviso.textContent = '';
  }

  ['input', 'change'].forEach(function (ev) {
    fecha.addEventListener(ev, resumir);
    hora.addEventListener(ev, resumir);
  });
  if (lugares) lugares.addEventListener('change', resumir);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var c = leer();
    var lugar = lugarMarcado();

    var faltan = [];
    if (!fecha.value) faltan.push('el día');
    if (!hora.value) faltan.push('la hora');
    if (!lugar) faltan.push('el lugar');

    if (faltan.length || !c) {
      fecha.classList.toggle('falta', !fecha.value);
      hora.classList.toggle('falta', !hora.value);
      if (lugares) lugares.classList.toggle('falta', !lugar);
      var ultimo = faltan.pop();
      aviso.textContent = 'Falta elegir ' + (faltan.length ? faltan.join(', ') + ' y ' : '') + (ultimo || 'el día') + '.';
      return;
    }

    if (c.yaPaso) {
      aviso.textContent = 'Ese momento ya pasó. Elegí uno que todavía venga.';
      return;
    }

    var esCambio = !!citaElegida;
    citaElegida = c;

    confirmado.textContent = c.frase + '.';
    form.hidden = true;
    listo.hidden = false;

    despachar(carta((esCambio ? 'Cambio: ' : '') + 'Fer eligió ' + minuscula(c.fraseCorreo) +
      ' (te perdonó: ' + (armar().perdono ? 'sí' : 'todavía no') + ')'));
  });

  if (cambiar) {
    cambiar.addEventListener('click', function () {
      listo.hidden = true;
      form.hidden = false;
      fecha.focus();
    });
  }
})();
