(function () {
  'use strict';
  const labels = { bridal: 'Bridal wear', venue: 'Venue', photography: 'Photography', catering: 'Catering', florist: 'Florist' };
  document.addEventListener('DOMContentLoaded', function () {
    const intro = document.querySelector('.solr-search-intro-layout');
    const layout = document.querySelector('.solr-search-layout');
    const column = document.querySelector('.solr-search-layout__main');
    if (!intro || !layout || !column) return;
    const oldResults = column.querySelector('.tx-solr-search-results-plugin');
    const results = document.createElement('section');
    results.className = 'gc-results'; results.setAttribute('aria-label', 'Vendor search results');
    column.appendChild(results);
    const forms = Array.from(document.querySelectorAll('form.tx-solr-search-form, form[id="tx-solr-search-form-pi-results"]')).filter(f => f.querySelector('[name="q"]'));
    let state = new URLSearchParams(location.search);
    let controller;
    function el(tag, className, content) { const node = document.createElement(tag); if (className) node.className = className; if (content != null) node.textContent = content; return node; }
    function url() { return '/api/search?' + state.toString(); }
    function navigate(changes) {
      Object.keys(changes).forEach(key => changes[key] ? state.set(key, changes[key]) : state.delete(key));
      const next = 'search.html' + (state.toString() ? '?' + state : '');
      history.pushState(null, '', next); run();
    }
    function addSelect(parent, label, key, values) {
      const wrap = el('label','gc-filter'); wrap.append(el('span','',label));
      const select = el('select'); select.setAttribute('aria-label',label);
      const all = el('option','','All'); all.value = ''; select.append(all);
      values.forEach(value => { const option = el('option','',labels[value] || value); option.value = value; option.selected = state.get(key) === value; select.append(option); });
      select.addEventListener('change',()=>navigate({[key]:select.value,page:''}));
      wrap.append(select); parent.append(wrap);
    }
    async function run() {
      const q = state.get('q') || '';
      forms.forEach(form => { form.querySelector('[name="q"]').value=q; });
      // The retained layout CSS hides results while the Solr initial class remains.
      // Keep its form visible and transition the wrapper to the results state.
      if (oldResults) {
        oldResults.hidden = false;
        oldResults.classList.remove('tx-solr-search--initial', 'tx-solr-no-results');
        oldResults.classList.add('tx-solr-search--results');
      }
      intro.style.display='none'; layout.style.display='';
      results.replaceChildren(el('p','gc-search-status','Searching vendors…'));
      results.setAttribute('aria-busy','true');
      if (controller) controller.abort(); controller = new AbortController();
      try {
        const response = await fetch(url(),{signal:controller.signal});
        if (!response.ok) throw new Error('Search is unavailable. Please try again.');
        const data = await response.json();
        results.replaceChildren();
        const title = el('h2','gc-results-title', q ? 'Results for “'+q+'”' : 'US wedding vendors');
        const count = el('p','gc-search-status',data.total+' results · '+data.indexed_count+' listed vendors'); count.setAttribute('role','status');
        results.append(title,count);
        const filters = el('div','gc-filters'); addSelect(filters,'Category','category',data.categories); addSelect(filters,'City','city',data.cities); results.append(filters);
        if (!data.results.length) {
          results.append(el('p','gc-empty','No listed vendors match your search. Try another city or category.'));
          const browse = el('button','gc-action','Browse all vendors'); browse.type='button'; browse.onclick=()=>navigate({q:'',city:'',category:'',page:''}); results.append(browse);
        }
        data.results.forEach(vendor=>{
          const card=el('article','gc-result');
          const meta=el('p','gc-result-meta',(labels[vendor.category]||vendor.category)+' · '+vendor.city+', '+vendor.state);
          const heading=el('h3');const link=el('a','',vendor.name); link.href=vendor.url;link.target='_blank';link.rel='noopener noreferrer';heading.append(link);
          const address=el('a','gc-result-url',new URL(vendor.url).hostname);address.href=vendor.url;address.target='_blank';address.rel='noopener noreferrer';
          const desc=el('p','',vendor.description);
          const actions=el('div','gc-result-actions');
          const visit=el('a','gc-action','Visit website');visit.href=vendor.url;visit.target='_blank';visit.rel='noopener noreferrer';
          const map=el('a','gc-action gc-action-secondary','View on map');map.href='harita.html?vendor='+encodeURIComponent(vendor.id);
          actions.append(visit,map);card.append(meta,heading,address,desc,actions);results.append(card);
        });
        if (data.pages>1) {
          const paging=el('nav','gc-pagination');paging.setAttribute('aria-label','Search result pages');
          const previous=el('button','gc-action','Previous');previous.disabled=data.page<=1;previous.onclick=()=>navigate({page:String(data.page-1)});
          const next=el('button','gc-action','Next');next.disabled=data.page>=data.pages;next.onclick=()=>navigate({page:String(data.page+1)});
          paging.append(previous,el('span','',data.page+' / '+data.pages),next);results.append(paging);
        }
        results.append(el('p','gc-catalog-note','Results currently cover the US vendors in our directory. Confirm pricing, service areas and availability on each vendor’s official website.'));
      } catch (error) {
        if (error.name==='AbortError') return;
        results.replaceChildren(el('p','gc-error',error.message));
        const retry=el('button','gc-action','Try again');retry.onclick=run;results.append(retry);
      } finally { results.setAttribute('aria-busy','false'); }
    }
    forms.forEach(form=>{
      const input=form.querySelector('[name="q"]');
      input.placeholder='E.g. New York bridal or Saratoga venue';
      input.setAttribute('aria-label', 'Search by vendor, category or city');
      form.append(el('p','gc-catalog-note','Search our directory of US wedding vendors. Results cover the vendors currently listed.'));
      const button=form.querySelector('[type="submit"]');if(button){button.disabled=false;button.removeAttribute('aria-disabled');}
      form.addEventListener('submit',event=>{event.preventDefault();navigate({q:input.value.trim(),page:'',city:'',category:''});});
      const suggestions=el('div','gc-suggestions');suggestions.hidden=true;suggestions.setAttribute('role','listbox');input.parentElement.append(suggestions);
      let timer;let suggestionController;
      input.addEventListener('input',()=>{
        clearTimeout(timer);if(suggestionController)suggestionController.abort();
        if(input.value.trim().length<2){suggestions.hidden=true;return;}
        timer=setTimeout(async()=>{
          suggestionController=new AbortController();
          try {
            const r=await fetch('/api/search?q='+encodeURIComponent(input.value.trim()),{signal:suggestionController.signal});if(!r.ok)return;const data=await r.json();suggestions.replaceChildren();
            data.results.slice(0,5).forEach(v=>{const choice=el('button','',v.name+' · '+v.city);choice.type='button';choice.setAttribute('role','option');choice.onclick=()=>{input.value=v.name;suggestions.hidden=true;navigate({q:v.name,page:'',city:'',category:''});};suggestions.append(choice);});
            suggestions.hidden=!data.results.length;
          } catch { suggestions.hidden=true; }
        },250);
      });
      input.addEventListener('keydown',e=>{if(e.key==='Escape')suggestions.hidden=true;});
      form.addEventListener('focusout',()=>setTimeout(()=>{if(!form.contains(document.activeElement))suggestions.hidden=true;},150));
    });
    window.addEventListener('popstate',()=>{state=new URLSearchParams(location.search);run();});
    if(state.has('q')||state.has('city')||state.has('category'))run();
  });
})();
