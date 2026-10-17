(function () {
  'use strict';
  const labels = { bridal: 'Gelinlik', venue: 'Mekân', photography: 'Fotoğraf', catering: 'Catering', florist: 'Çiçek' };
  document.addEventListener('DOMContentLoaded', function () {
    const intro = document.querySelector('.solr-search-intro-layout');
    const layout = document.querySelector('.solr-search-layout');
    const column = document.querySelector('.solr-search-layout__main');
    if (!intro || !layout || !column) return;
    const oldResults = column.querySelector('.tx-solr-search-results-plugin');
    if (oldResults) oldResults.hidden = true;
    const results = document.createElement('section');
    results.className = 'gc-results'; results.setAttribute('aria-label', 'Firma arama sonuçları');
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
      const all = el('option','','Tümü'); all.value = ''; select.append(all);
      values.forEach(value => { const option = el('option','',labels[value] || value); option.value = value; option.selected = state.get(key) === value; select.append(option); });
      select.addEventListener('change',()=>navigate({[key]:select.value,page:''}));
      wrap.append(select); parent.append(wrap);
    }
    async function run() {
      const q = state.get('q') || '';
      forms.forEach(form => { form.querySelector('[name="q"]').value=q; });
      intro.style.display='none'; layout.style.display='';
      results.replaceChildren(el('p','gc-search-status','Firmalar aranıyor…'));
      results.setAttribute('aria-busy','true');
      if (controller) controller.abort(); controller = new AbortController();
      try {
        const response = await fetch(url(),{signal:controller.signal});
        if (!response.ok) throw new Error('Arama hizmetine ulaşılamıyor. Lütfen tekrar dene.');
        const data = await response.json();
        results.replaceChildren();
        const title = el('h2','gc-results-title', q ? '“'+q+'” için sonuçlar' : 'Amerika’daki düğün firmaları');
        const count = el('p','gc-search-status',data.total+' sonuç · '+data.indexed_count+' kayıtlı firma'); count.setAttribute('role','status');
        results.append(title,count);
        const filters = el('div','gc-filters'); addSelect(filters,'Kategori','category',data.categories); addSelect(filters,'Şehir','city',data.cities); results.append(filters);
        if (!data.results.length) {
          results.append(el('p','gc-empty','Bu arama için kayıtlı firma bulunamadı. Şehri veya kategoriyi değiştirerek tekrar dene.'));
          const browse = el('button','gc-action','Tüm firmaları gör'); browse.type='button'; browse.onclick=()=>navigate({q:'',city:'',category:'',page:''}); results.append(browse);
        }
        data.results.forEach(vendor=>{
          const card=el('article','gc-result');
          const meta=el('p','gc-result-meta',(labels[vendor.category]||vendor.category)+' · '+vendor.city+', '+vendor.state);
          const heading=el('h3');const link=el('a','',vendor.name); link.href=vendor.url;link.target='_blank';link.rel='noopener noreferrer';heading.append(link);
          const address=el('a','gc-result-url',new URL(vendor.url).hostname);address.href=vendor.url;address.target='_blank';address.rel='noopener noreferrer';
          const desc=el('p','',vendor.description);
          const actions=el('div','gc-result-actions');
          const visit=el('a','gc-action','Resmi siteyi aç');visit.href=vendor.url;visit.target='_blank';visit.rel='noopener noreferrer';
          const map=el('a','gc-action gc-action-secondary','Haritada gör');map.href='harita.html?vendor='+encodeURIComponent(vendor.id);
          actions.append(visit,map);card.append(meta,heading,address,desc,actions);results.append(card);
        });
        if (data.pages>1) {
          const paging=el('nav','gc-pagination');paging.setAttribute('aria-label','Sonuç sayfaları');
          const previous=el('button','gc-action','Önceki');previous.disabled=data.page<=1;previous.onclick=()=>navigate({page:String(data.page-1)});
          const next=el('button','gc-action','Sonraki');next.disabled=data.page>=data.pages;next.onclick=()=>navigate({page:String(data.page+1)});
          paging.append(previous,el('span','',data.page+' / '+data.pages),next);results.append(paging);
        }
        results.append(el('p','gc-catalog-note','Sonuçlar şu anda kayıtlı Amerika firmalarıyla sınırlıdır. Fiyat, hizmet bölgesi ve uygun tarihi resmi firma sitesinden doğrula.'));
      } catch (error) {
        if (error.name==='AbortError') return;
        results.replaceChildren(el('p','gc-error',error.message));
        const retry=el('button','gc-action','Tekrar dene');retry.onclick=run;results.append(retry);
      } finally { results.setAttribute('aria-busy','false'); }
    }
    forms.forEach(form=>{
      const input=form.querySelector('[name="q"]');
      input.placeholder='Örn. New York gelinlik veya Saratoga mekân';
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
