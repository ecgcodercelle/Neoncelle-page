/* =============================================
   NEON CELLE — Header Loader
   Lädt header.html (normal) oder header-admin.html (admin)
   in <div id="site-header"></div> und markiert die aktive Seite.
   ============================================= */
(function () {
  var script = document.currentScript;
  var type = script.getAttribute('data-type') || 'public';
  var targetId = script.getAttribute('data-target') || 'site-header';
  var file = type === 'admin' ? 'header-admin.html' : 'header.html';

  fetch(file)
    .then(function (res) { return res.text(); })
    .then(function (html) {
      var el = document.getElementById(targetId);
      if (!el) return;
      el.innerHTML = html;
      setupHeader(el);
    })
    .catch(function (err) {
      console.error('Header konnte nicht geladen werden:', err);
    });

  function setupHeader(el) {
    var path = location.pathname.split('/').pop() || 'index.html';
    var onIndex = path === 'index.html' || path === '';

    // Auf der Startseite reichen reine Anker (#about statt index.html#about)
    el.querySelectorAll('a[href^="index.html#"]').forEach(function (a) {
      if (onIndex) {
        a.setAttribute('href', a.getAttribute('href').replace('index.html', ''));
      }
    });

    // Aktuelle Seite in der Navigation hervorheben
    el.querySelectorAll('a[href]').forEach(function (a) {
      var hrefFile = a.getAttribute('href').split('#')[0];
      if (hrefFile && hrefFile === path) a.classList.add('active');
    });
  }
})();
