/**
 * GelinCicegi Istanbul Map – TYPO3 Extension Script
 * Reads shop data from window.gelincicegiMapShops (set by Fluid template)
 */
window.addEventListener('load', function () {
  'use strict';

  const shops = window.gelincicegiMapShops || [];
  if (!shops.length) return;

  // Make the map app fill exactly the remaining viewport below the nav
  function fitAppHeight() {
    var app = document.querySelector('.gelincicegi-map-app');
    if (!app) return;
    var top = app.getBoundingClientRect().top + window.scrollY;
    app.style.height = 'calc(100vh - ' + top + 'px)';
  }
  fitAppHeight();
  window.addEventListener('resize', function () { fitAppHeight(); if (map) map.resize(); });

  let currentShopImages = [], currentImageIndex = 0;
  let map, markers = [], activeId = shops[0].id;
  let routeActive = false;

  const $ = (id) => document.getElementById('gelincicegi-' + id);

  const placesList = $('placesList');
  const detailOverlay = $('detailOverlay');
  const closeDetailBtn = $('closeDetailBtn');
  const detailImage = $('detailImage');
  const detailName = $('detailName');
  const detailRating = $('detailRating');
  const detailType = $('detailType');
  const detailStatus = $('detailStatus');
  const detailAddress = $('detailAddress');
  const detailPhone = $('detailPhone');
  const detailDescription = $('detailDescription');
  const detailOffer = $('detailOffer');
  const detailHours = $('detailHours');

  var dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  function parseOpeningHours(text) {
    if (!text || typeof text !== 'string') return null;
    var dayMap = { mo: 1, di: 2, mi: 3, do: 4, fr: 5, sa: 6, so: 0 };
    var schedule = {};
    text.split('\n').forEach(function (line) {
      line = line.trim().replace(/\s+/g, '').toLowerCase();
      if (!line) return;
      var ci = line.indexOf(':');
      if (ci < 1) return;
      var dayPart = line.substring(0, ci);
      var timePart = line.substring(ci + 1);
      var days = [];
      if (dayPart.indexOf('-') !== -1) {
        var dp = dayPart.split('-');
        var s = dayMap[dp[0]], e = dayMap[dp[1]];
        if (s === undefined || e === undefined) return;
        if (s <= e) { for (var d = s; d <= e; d++) days.push(d); }
        else { for (var d = s; d <= 6; d++) days.push(d); for (var d = 0; d <= e; d++) days.push(d); }
      } else {
        var d = dayMap[dayPart];
        if (d !== undefined) days.push(d);
      }
      var timeInfo = null;
      if (timePart !== '-' && timePart !== 'geschlossen' && timePart.indexOf('-') !== -1) {
        var tp = timePart.split('-');
        if (tp.length >= 2) timeInfo = { open: tp[0], close: tp[1] };
      }
      days.forEach(function (dd) { schedule[dd] = timeInfo; });
    });
    return Object.keys(schedule).length ? schedule : null;
  }

  function computeOpenStatus(shop) {
    if (shop.closed) return { isOpen: false, label: 'Dauerhaft geschlossen' };
    var schedule = parseOpeningHours(shop.status);
    if (!schedule) return { isOpen: null, label: shop.status || '' };
    var now = new Date();
    var day = now.getDay();
    var cur = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    var h = schedule.hasOwnProperty(day) ? schedule[day] : undefined;
    if (h === null) return { isOpen: false, label: 'Heute geschlossen' };
    if (h === undefined) return { isOpen: null, label: '' };
    if (cur >= h.open && cur < h.close) return { isOpen: true, label: 'Ge\u00f6ffnet \u00b7 schlie\u00dft um ' + h.close };
    if (cur < h.open) return { isOpen: false, label: 'Geschlossen \u00b7 \u00f6ffnet um ' + h.open };
    return { isOpen: false, label: 'Heute geschlossen' };
  }

  function formatHoursHtml(text) {
    if (!text || typeof text !== 'string') return '';
    var schedule = parseOpeningHours(text);
    if (!schedule) return '';
    var today = new Date().getDay();
    var html = '';
    [1, 2, 3, 4, 5, 6, 0].forEach(function (day) {
      if (!schedule.hasOwnProperty(day)) return;
      var h = schedule[day];
      var timeStr = h ? h.open + '\u2013' + h.close : 'Geschlossen';
      var cls = day === today ? ' today' : '';
      html += '<div class="hours-row' + cls + '"><span class="hours-day">' + dayNames[day] + '</span><span class="hours-time">' + timeStr + '</span></div>';
    });
    return html;
  }

  function popupHtml(shop) {
    const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(shop.name + ' ' + shop.address);
    const rawPhone = shop.phone ? shop.phone.replace(/[^+\d]/g, '') : '';
    const validPhone = rawPhone && rawPhone !== '021200000' && rawPhone !== '021600000';
    const websiteBtn = shop.website
      ? '<button class="mini-chip" type="button" onclick="window.open(\'' + shop.website.replace(/'/g, "\\'") + '\',\'_blank\')">Website</button>'
      : '<button class="mini-chip" type="button" disabled>Website</button>';
    const callBtn = validPhone
      ? '<button class="mini-chip" type="button" onclick="window.location.href=\'tel:' + rawPhone + '\'">Anrufen</button>'
      : '<button class="mini-chip" type="button" disabled>Anrufen</button>';
    const st = computeOpenStatus(shop);
    return '<div class="popup-card">' +
      '<button class="popup-close-btn" type="button" onclick="event.stopPropagation();window.gelincicegiClosePopups()">&#x2715;</button>' +
      '<div class="popup-row"><div class="popup-thumb" style="background-image:url(\'' + shop.image + '\')"></div><div>' +
      '<div class="popup-name">' + shop.name + '</div>' +
      '<div class="popup-rating">&#9733; ' + shop.rating.toFixed(1) + ' &bull; ' + shop.type + '</div>' +
      '<div class="popup-status ' + (st.isOpen === false ? 'closed' : '') + '">' + st.label + '</div>' +
      '</div></div>' +
      '<div class="popup-chips"><button class="mini-chip active popup-chip-wide" type="button" onclick="window.gelincicegiRouteBtn(\'' + shop.id + '\',this)">Wegbeschreibung</button>' + websiteBtn + callBtn + '</div>' +
      '</div>';
  }

  function makeMarker(shop) {
    var wrap = document.createElement('div');
    wrap.className = 'custom-marker';
    wrap.innerHTML = '<div class="rating-badge">\u2605 ' + shop.rating.toFixed(1) + '</div><div class="pin-dot"></div><div class="marker-popup">' + popupHtml(shop) + '</div>';
    wrap.addEventListener('click', function (e) { e.stopPropagation(); selectShop(shop.id, true); });
    return wrap;
  }

  function renderList() {
    placesList.innerHTML = '';
    shops.forEach(function (shop, i) {
      var item = document.createElement('div');
      item.className = 'place-item slide-in ' + (shop.id === activeId ? 'active' : '');
      item.style.animationDelay = (i * 75) + 'ms';
      var st = computeOpenStatus(shop);
      item.innerHTML = '<div class="place-thumb" style="background-image:url(\'' + shop.image + '\')"></div>' +
        '<div><div class="place-name">' + shop.name + '</div>' +
        '<div class="place-rating">\u2605 ' + shop.rating.toFixed(1) + ' \u2022 ' + shop.type + '</div>' +
        '<div class="place-status ' + (st.isOpen === false ? 'closed' : '') + '">' + st.label + '</div></div>';
      item.addEventListener('click', function () { selectShop(shop.id, true); });
      placesList.appendChild(item);
    });
  }

  function clearMarkers() { markers.forEach(function (m) { m.remove(); }); markers = []; }

  window.gelincicegiClosePopups = function () {
    document.querySelectorAll('.gelincicegi-map-app .marker-popup.open').forEach(function (p) { p.classList.remove('open'); });
  };

  function renderMarkers() {
    clearMarkers();
    shops.forEach(function (shop) {
      var el = makeMarker(shop);
      if (shop.id === activeId) {
        el.classList.add('active-marker');
        el.querySelector('.marker-popup').classList.add('open');
      }
      var marker = new maplibregl.Marker({ element: el, anchor: 'center', offset: [0, 0] })
        .setLngLat([shop.coords[1], shop.coords[0]])
        .addTo(map);
      markers.push(marker);
    });
  }

  function updateSlider() {
    detailImage.style.opacity = '0';
    setTimeout(function () {
      detailImage.style.backgroundImage = "url('" + currentShopImages[currentImageIndex] + "')";
      detailImage.style.opacity = '1';
      var dots = $('sliderDots');
      dots.innerHTML = '';
      currentShopImages.forEach(function (_, i) {
        var s = document.createElement('span');
        if (i === currentImageIndex) s.className = 'active';
        s.addEventListener('click', function () { currentImageIndex = i; updateSlider(); });
        dots.appendChild(s);
      });
    }, 200);
  }

  function openDetail(shop) {
    detailOverlay.classList.remove('hidden');
    detailOverlay.setAttribute('aria-hidden', 'false');
    currentShopImages = shop.images && shop.images.length ? shop.images : [shop.image];
    currentImageIndex = 0;
    detailImage.style.backgroundSize = 'cover';
    detailImage.style.backgroundPosition = 'center';
    updateSlider();
    detailName.textContent = shop.name;
    detailRating.textContent = shop.rating.toFixed(1);
    detailType.textContent = shop.type;
    var st = computeOpenStatus(shop);
    detailStatus.textContent = st.label;
    detailStatus.style.color = st.isOpen === true ? '#0d9d3d' : (st.isOpen === false ? '#dd4f57' : 'var(--muted)');
    detailHours.innerHTML = formatHoursHtml(shop.status);
    detailAddress.textContent = shop.address;
    detailPhone.textContent = shop.phone;
    detailDescription.innerHTML = shop.description || '';
    detailOffer.innerHTML = shop.offer || '';

    var btnDir = $('btnDirections');
    btnDir.disabled = false;
    btnDir.textContent = 'Wegbeschreibung';
    btnDir.onclick = function () { showRoute(shop, btnDir); };

    var btnWeb = $('btnWebsite');
    if (shop.website) { btnWeb.disabled = false; btnWeb.onclick = function () { window.open(shop.website, '_blank'); }; }
    else { btnWeb.disabled = true; btnWeb.onclick = null; }

    var btnCall = $('btnCall');
    var rawPhone = shop.phone ? shop.phone.replace(/[^+\d]/g, '') : '';
    var validPhone = rawPhone && rawPhone !== '021200000' && rawPhone !== '021600000';
    if (validPhone) { btnCall.disabled = false; btnCall.onclick = function () { window.location.href = 'tel:' + rawPhone; }; }
    else { btnCall.disabled = true; btnCall.onclick = null; }
  }

  function selectShop(id, fly) {
    activeId = id;
    renderList();
    renderMarkers();
    var shop = shops.find(function (s) { return s.id === id; });
    if (shop) {
      openDetail(shop);
      if (fly) {
        map.flyTo({ center: [shop.coords[1], shop.coords[0]], zoom: 11.8, duration: 900 });
      }
    }
  }

  function clearRoute() {
    routeActive = false;
    if (map) {
      if (map.getLayer('gelincicegi-route-line')) map.removeLayer('gelincicegi-route-line');
      if (map.getLayer('gelincicegi-route-casing')) map.removeLayer('gelincicegi-route-casing');
      if (map.getSource('gelincicegi-route')) map.removeSource('gelincicegi-route');
    }
    document.getElementById('gelincicegi-routeInfo').classList.add('hidden-bar');
    var btnDir = document.getElementById('gelincicegi-btnDirections');
    if (btnDir) { btnDir.textContent = 'Wegbeschreibung'; btnDir.disabled = false; }
    // reset any popup button text
    document.querySelectorAll('.popup-chip-wide').forEach(function (b) { b.textContent = 'Wegbeschreibung'; b.disabled = false; });
  }

  function showRouteInfo(distM, durS) {
    var km = distM / 1000;
    var min = durS / 60;
    document.getElementById('gelincicegi-routeDist').textContent = km < 1 ? Math.round(distM) + ' m' : km.toFixed(1) + ' km';
    document.getElementById('gelincicegi-routeDur').textContent = min < 60 ? Math.round(min) + ' Min.' : Math.floor(min / 60) + ' Std. ' + Math.round(min % 60) + ' Min.';
    document.getElementById('gelincicegi-routeInfo').classList.remove('hidden-bar');
  }

  function drawRoute(geojsonGeometry, fromLng, fromLat, toLng, toLat) {
    if (map.getLayer('gelincicegi-route-line')) map.removeLayer('gelincicegi-route-line');
    if (map.getLayer('gelincicegi-route-casing')) map.removeLayer('gelincicegi-route-casing');
    if (map.getSource('gelincicegi-route')) map.removeSource('gelincicegi-route');
    map.addSource('gelincicegi-route', { type: 'geojson', data: { type: 'Feature', geometry: geojsonGeometry } });
    map.addLayer({ id: 'gelincicegi-route-casing', type: 'line', source: 'gelincicegi-route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.85 } });
    map.addLayer({ id: 'gelincicegi-route-line', type: 'line', source: 'gelincicegi-route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#0F1A6D', 'line-width': 4, 'line-opacity': 0.92 } });
    routeActive = true;
    var minLng = Math.min(fromLng, toLng), maxLng = Math.max(fromLng, toLng);
    var minLat = Math.min(fromLat, toLat), maxLat = Math.max(fromLat, toLat);
    map.fitBounds([[minLng - 0.01, minLat - 0.01], [maxLng + 0.01, maxLat + 0.01]], { padding: { top: 60, bottom: 60, left: 60, right: 480 }, duration: 1000 });
  }

  function showRoute(shop, btn) {
    if (routeActive) { clearRoute(); return; }
    btn.textContent = 'Suche Route…';
    btn.disabled = true;
    if (!navigator.geolocation) {
      btn.textContent = 'Standort nicht verfügbar'; btn.disabled = false; return;
    }
    navigator.geolocation.getCurrentPosition(function (pos) {
      var uLng = pos.coords.longitude, uLat = pos.coords.latitude;
      var sLng = shop.coords[1], sLat = shop.coords[0];
      fetch('https://router.project-osrm.org/route/v1/driving/' + uLng + ',' + uLat + ';' + sLng + ',' + sLat + '?overview=full&geometries=geojson')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.routes || !data.routes.length) throw new Error('no route');
          var route = data.routes[0];
          drawRoute(route.geometry, uLng, uLat, sLng, sLat);
          showRouteInfo(route.distance, route.duration);
          btn.textContent = 'Route entfernen'; btn.disabled = false;
        })
        .catch(function () {
          if (routeActive) {
            btn.textContent = 'Route entfernen'; btn.disabled = false;
          } else {
            btn.textContent = 'Route nicht gefunden'; btn.disabled = false;
          }
        });
    }, function () {
      btn.textContent = 'Standort verweigert'; btn.disabled = false;
    }, { timeout: 8000 });
  }

  window.gelincicegiRouteBtn = function (shopId, el) {
    var shop = shops.find(function (s) { return s.id === shopId; });
    if (!shop) return;
    showRoute(shop, el);
  };

  function initMap() {
    map = new maplibregl.Map({
      container: 'gelincicegi-map',
      style: 'https://tiles.openfreemap.org/styles/bright',
      center: [29.01, 41.02],
      zoom: 10.1,
      attributionControl: true
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-left');
    map.addControl(new maplibregl.FullscreenControl(), 'top-left');
    map.on('load', function () {
      try {
        var layers = map.getStyle().layers || [];
        layers.forEach(function (layer) {
          if (layer.type === 'symbol' && map.getLayer(layer.id)) {
            try { map.setPaintProperty(layer.id, 'text-opacity', 0.55); } catch (e) {}
          }
        });
      } catch (e) {}
      renderList();
      renderMarkers();
      selectShop(activeId, false);
    });
  }

  document.getElementById('gelincicegi-routeClear').addEventListener('click', function () { clearRoute(); });

  $('sliderPrev').addEventListener('click', function (e) {
    e.stopPropagation();
    currentImageIndex = (currentImageIndex - 1 + currentShopImages.length) % currentShopImages.length;
    updateSlider();
  });
  $('sliderNext').addEventListener('click', function (e) {
    e.stopPropagation();
    currentImageIndex = (currentImageIndex + 1) % currentShopImages.length;
    updateSlider();
  });
  closeDetailBtn.addEventListener('click', function (e) {
    e.preventDefault(); e.stopPropagation();
    detailOverlay.classList.add('hidden');
    detailOverlay.setAttribute('aria-hidden', 'true');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      detailOverlay.classList.add('hidden');
      detailOverlay.setAttribute('aria-hidden', 'true');
    }
  });

  initMap();
});
