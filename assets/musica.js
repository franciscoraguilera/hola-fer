(function () {
  'use strict';

  var radio = document.getElementById('radio');
  var audio = document.getElementById('radio-audio');
  if (!radio || !audio) return;

  var rollo = document.getElementById('radio-rollo');
  var pos = document.getElementById('radio-pos');
  var tiempo = document.getElementById('radio-tiempo');
  var vol = document.getElementById('radio-vol');
  var btnPlay = document.getElementById('radio-play');
  var btnAnt = document.getElementById('radio-ant');
  var btnSig = document.getElementById('radio-sig');

  var canciones = [
    { src: 'assets/web/cancion-1.mp3', titulo: '¿Qué Se Siente Que Me Gustes Tanto?', artista: 'Daniel, Me Estás Matando' },
    { src: 'assets/web/cancion-2.mp3', titulo: 'Ternura', artista: 'Anitta' },
    { src: 'assets/web/cancion-3.mp3', titulo: 'Can’t Take My Eyes Off You', artista: 'Daniel Boaventura' }
  ];

  var actual = 0;
  var arrastrando = false;

  function medirBarra() {
    document.documentElement.style.setProperty('--barra', radio.offsetHeight + 'px');
  }
  medirBarra();
  window.addEventListener('resize', medirBarra);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(medirBarra);

  function mmss(s) {
    if (!isFinite(s) || s < 0) s = 0;
    s = Math.floor(s);
    var seg = s % 60;
    return Math.floor(s / 60) + ':' + (seg < 10 ? '0' : '') + seg;
  }

  function rotular(texto) {
    var partes = rollo.children;
    for (var i = 0; i < partes.length; i++) partes[i].textContent = texto;
    rollo.style.setProperty('--dur', Math.max(9, texto.length * 0.26).toFixed(1) + 's');
  }

  function rotuloDe(i) {
    var c = canciones[i];
    return (i + 1) + '/' + canciones.length + ' · ' + c.titulo + ' — ' + c.artista;
  }

  function pintar() {
    var total = audio.duration;
    var ahora = audio.currentTime || 0;
    var fraccion = isFinite(total) && total > 0 ? ahora / total : 0;
    if (!arrastrando) pos.value = Math.round(fraccion * 1000);
    pos.style.setProperty('--v', (pos.value / 10).toFixed(1) + '%');
    tiempo.textContent = mmss(ahora);
    tiempo.setAttribute('data-total', isFinite(total) ? ' / ' + mmss(total) : '');
  }

  function anunciar() {
    if (!('mediaSession' in navigator) || !window.MediaMetadata) return;
    var c = canciones[actual];
    navigator.mediaSession.metadata = new MediaMetadata({ title: c.titulo, artist: c.artista, album: 'Para Fer' });
  }

  function reproducir() {
    var intento = audio.play();
    if (intento && intento.catch) intento.catch(function () {});
  }

  function cargar(i, tocar) {
    var n = canciones.length;
    actual = ((i % n) + n) % n;
    audio.src = canciones[actual].src;
    pos.value = 0;
    pintar();
    if (tocar) {
      rotular(rotuloDe(actual));
      anunciar();
      reproducir();
    }
  }

  function siguiente() { cargar(actual + 1, true); }

  function anterior() {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      reproducir();
    } else {
      cargar(actual - 1, true);
    }
  }

  btnPlay.addEventListener('click', function () {
    if (audio.paused) reproducir();
    else audio.pause();
  });
  btnSig.addEventListener('click', siguiente);
  btnAnt.addEventListener('click', anterior);

  audio.addEventListener('play', function () {
    if (radio.classList.contains('sin-estrenar')) {
      rotular(rotuloDe(actual));
      anunciar();
    }
    radio.classList.add('suena');
    radio.classList.remove('sin-estrenar');
    btnPlay.setAttribute('aria-label', 'Pausar');
  });
  audio.addEventListener('pause', function () {
    radio.classList.remove('suena');
    btnPlay.setAttribute('aria-label', 'Reproducir');
  });
  audio.addEventListener('ended', siguiente);
  audio.addEventListener('timeupdate', pintar);
  audio.addEventListener('loadedmetadata', pintar);
  audio.addEventListener('error', function () {
    if (!audio.getAttribute('src')) return;
    radio.classList.remove('suena');
    rotular('No pude cargar esta canción. Probá con la siguiente.');
  });

  pos.addEventListener('input', function () {
    arrastrando = true;
    pos.style.setProperty('--v', (pos.value / 10).toFixed(1) + '%');
    if (isFinite(audio.duration)) tiempo.textContent = mmss(pos.value / 1000 * audio.duration);
  });
  pos.addEventListener('change', function () {
    if (isFinite(audio.duration)) audio.currentTime = pos.value / 1000 * audio.duration;
    arrastrando = false;
    pintar();
  });

  if (vol) {
    var pintarVol = function () {
      audio.volume = vol.value / 100;
      vol.style.setProperty('--v', vol.value + '%');
    };
    vol.addEventListener('input', pintarVol);
    pintarVol();
  }

  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', reproducir);
      navigator.mediaSession.setActionHandler('pause', function () { audio.pause(); });
      navigator.mediaSession.setActionHandler('previoustrack', anterior);
      navigator.mediaSession.setActionHandler('nexttrack', siguiente);
    } catch (e) {}
  }

  [].forEach.call(document.querySelectorAll('[data-cancion]'), function (el) {
    el.addEventListener('click', function () {
      cargar(parseInt(el.getAttribute('data-cancion'), 10) || 0, true);
    });
  });

  cargar(0, false);

  var GESTOS = ['pointerdown', 'pointerup', 'touchend', 'mousedown', 'click', 'keydown'];

  function soltarGestos() {
    GESTOS.forEach(function (g) { window.removeEventListener(g, alPrimerGesto, true); });
  }

  function alPrimerGesto(e) {
    if (e && e.target && radio.contains(e.target)) return;
    if (!audio.paused) return;
    reproducir();
  }

  audio.addEventListener('playing', soltarGestos);

  var primero = audio.play();
  if (primero && primero.catch) {
    primero.catch(function () {
      if (!audio.paused) return;
      GESTOS.forEach(function (g) { window.addEventListener(g, alPrimerGesto, true); });
    });
  }
})();
