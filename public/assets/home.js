(() => {
  'use strict';
  const navToggle = document.querySelector('.bb-menu-toggle');
  const navLinks = document.querySelector('.bb-nav-links');
  if (navToggle && navLinks) {
    const closeMenu = () => {
      navLinks.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    };
    navToggle.addEventListener('click', () => {
      const expanded = navLinks.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(expanded));
    });
    navLinks.addEventListener('click', event => {
      if (event.target.closest('a')) closeMenu();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && navLinks.classList.contains('is-open')) {
        closeMenu();
        navToggle.focus();
      }
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1120) closeMenu();
    });
  }

  const form = document.querySelector('#vendor-search-form');
  const input = document.querySelector('#vendor-search-input');
  const results = document.querySelector('#vendor-results');
  const suggestions = document.querySelector('#vendor-suggestions');
  if (!form || !input || !results || !suggestions) return;

  const names = { bridal:'Bridal Wear', venue:'Venue', photography:'Photography',
    catering:'Catering', florist:'Florist' };
  let params = new URLSearchParams(location.search);
  let searchController = null;
  let suggestController = null;
  let debounceTimer = null;
  let searchToken = 0;

  function element(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  }
  function link(text, href, className, external = false) {
    const node = element('a', className, text);
    node.href = href;
    if (external) { node.target = '_blank'; node.rel = 'noopener noreferrer'; }
    return node;
  }
  function safeExternalUrl(value) {
    try { const url = new URL(value); return /^https?:$/.test(url.protocol) ? url.href : null; }
    catch { return null; }
  }
  function update(changes) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === undefined || (value === '' && key !== 'q')) next.delete(key);
      else next.set(key, String(value));
    }
    params = next;
    const url = new URL(location.href);
    url.search = params.toString();
    history.pushState(null, '', url.pathname + url.search + url.hash);
    hideSuggestions();
    void loadResults();
  }
  function hideSuggestions() {
    suggestions.hidden = true;
    suggestions.replaceChildren();
  }
  function selectFilter(name, title, options) {
    const label = element('label', 'bb-filter');
    const caption = element('span', '', title);
    const select = element('select');
    select.setAttribute('aria-label', title);
    const all = element('option', '', 'All ' + title.toLowerCase() + 's');
    all.value = '';
    select.append(all);
    for (const optionValue of options) {
      const option = element('option', '', names[optionValue] || optionValue);
      option.value = optionValue;
      option.selected = params.get(name) === optionValue;
      select.append(option);
    }
    select.addEventListener('change', () => update({[name]:select.value, page:null}));
    label.append(caption, select);
    return label;
  }
  function showMessage(message, error = false) {
    const messageBox = element('p', error ? 'bb-error' : 'bb-loading', message);
    messageBox.setAttribute('role', 'status');
    results.replaceChildren(messageBox);
  }
  async function loadResults() {
    const requestNumber = ++searchToken;
    if (searchController) searchController.abort();
    searchController = new AbortController();
    input.value = params.get('q') || '';
    results.hidden = false;
    results.setAttribute('aria-busy', 'true');
    showMessage('Searching wedding vendors…');
    try {
      const response = await fetch('/api/search?' + params.toString(), { signal:searchController.signal });
      if (!response.ok) throw new Error('Search is temporarily unavailable. Please try again.');
      const data = await response.json();
      if (requestNumber !== searchToken) return;
      const vendors = Array.isArray(data.results) ? data.results : [];
      const title = element('h1', '', params.get('q') ? 'Results for “' + params.get('q') + '”' : 'Browse Wedding Vendors');
      const count = element('p', 'bb-results-count', String(data.total || 0) + ' vendors found');
      count.setAttribute('role', 'status');
      const heading = element('div');
      heading.append(title, count);
      const filters = element('div', 'bb-filters');
      filters.append(
        selectFilter('category', 'Category', Array.isArray(data.categories) ? data.categories : []),
        selectFilter('city', 'City', Array.isArray(data.cities) ? data.cities : [])
      );
      const resultsHead = element('div', 'bb-results-head');
      resultsHead.append(heading, filters);
      const list = element('div', 'bb-result-list');
      for (const vendor of vendors) {
        const article = element('article', 'bb-result');
        const category = names[vendor.category] || vendor.category || 'Wedding Vendor';
        article.append(element('p', 'bb-result-meta',
          [category, vendor.city, vendor.state].filter(Boolean).join(' · ')));
        const h2 = element('h2');
        const website = safeExternalUrl(vendor.url);
        if (website) h2.append(link(vendor.name, website, '', true));
        else h2.textContent = vendor.name || 'Vendor';
        article.append(h2);
        if (website) article.append(link(new URL(website).hostname, website, 'bb-result-url', true));
        if (vendor.description) article.append(element('p', '', vendor.description));
        const actions = element('div', 'bb-result-actions');
        if (website) actions.append(link('Visit Website', website, 'bb-action', true));
        if (vendor.id != null) actions.append(link('View on Map',
          'harita.html?vendor=' + encodeURIComponent(vendor.id),
          'bb-action bb-action-secondary'));
        article.append(actions);
        list.append(article);
      }
      const children = [resultsHead];
      if (vendors.length) children.push(list);
      else children.push(element('p', 'bb-empty',
        'No matching vendors in our directory. Try a different city or wedding service.'));
      if ((data.pages || 1) > 1) {
        const pages = element('nav', 'bb-pagination');
        pages.setAttribute('aria-label', 'Search result pages');
        const previous = element('button', '', 'Previous');
        previous.type = 'button';
        previous.disabled = data.page <= 1;
        previous.addEventListener('click', () => update({page:Math.max(1, Number(data.page)-1)}));
        const next = element('button', '', 'Next');
        next.type = 'button';
        next.disabled = data.page >= data.pages;
        next.addEventListener('click', () => update({page:Math.min(Number(data.pages), Number(data.page)+1)}));
        pages.append(previous, element('span', '', data.page + ' of ' + data.pages), next);
        children.push(pages);
      }
      children.push(element('p', 'bb-results-note',
        'Our directory includes selected U.S. wedding businesses. Confirm current pricing, availability and service areas directly with each vendor.'));
      results.replaceChildren(...children);
    } catch (error) {
      if (error.name === 'AbortError' || requestNumber !== searchToken) return;
      const message = element('p', 'bb-error', error.message || 'Unable to load results.');
      const retry = element('button', 'bb-action', 'Try Again');
      retry.type = 'button';
      retry.addEventListener('click', () => void loadResults());
      results.replaceChildren(message, retry);
    } finally {
      if (requestNumber === searchToken) results.setAttribute('aria-busy', 'false');
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    update({q:input.value.trim(),city:null,category:null,page:null});
  });
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    suggestController?.abort();
    const query = input.value.trim();
    if (query.length < 2) { hideSuggestions(); return; }
    debounceTimer = setTimeout(async () => {
      const controller = new AbortController();
      suggestController = controller;
      try {
        const response = await fetch('/api/search?q=' + encodeURIComponent(query), {signal:controller.signal});
        if (!response.ok) { hideSuggestions(); return; }
        const data = await response.json();
        if (controller.signal.aborted || input.value.trim() !== query) return;
        suggestions.replaceChildren();
        for (const vendor of (data.results || []).slice(0,5)) {
          const item = element('button', 'bb-suggestion', vendor.name + ' · ' + vendor.city);
          item.type = 'button';
          item.setAttribute('role', 'option');
          item.addEventListener('click', () => {
            input.value = vendor.name;
            update({q:vendor.name,city:null,category:null,page:null});
          });
          suggestions.append(item);
        }
        suggestions.hidden = !suggestions.childElementCount;
      } catch (error) { if (error.name !== 'AbortError') hideSuggestions(); }
    }, 300);
  });
  input.addEventListener('keydown', event => { if (event.key === 'Escape') hideSuggestions(); });
  document.addEventListener('click', event => {
    if (!form.contains(event.target)) hideSuggestions();
  });
  window.addEventListener('popstate', () => {
    params = new URLSearchParams(location.search);
    if (params.has('q') || params.has('category') || params.has('city')) void loadResults();
    else { searchController?.abort(); ++searchToken; results.hidden = true; input.value = ''; }
  });
  if (params.has('q') || params.has('category') || params.has('city')) void loadResults();
})();