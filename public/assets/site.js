(function () {
  'use strict';
  const header = document.querySelector('.bb-header');
  const toggle = header?.querySelector('.bb-menu-toggle');
  const links = header?.querySelector('.bb-nav-links');
  if (!header || !toggle || !links) return;
  header.classList.add('bb-ready');
  function close() { links.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
  toggle.addEventListener('click', function () {
    const open = links.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  links.addEventListener('click', event => { if (event.target.closest('a')) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { close(); if (header.contains(document.activeElement)) toggle.focus(); } });
  window.addEventListener('resize', () => { if (window.innerWidth > 1000) close(); });
})();
