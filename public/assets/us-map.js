window.addEventListener('load',async function(){
  const host=document.querySelector('.gelincicegi-map-app');if(!host)return;
  const list=document.getElementById('gelincicegi-placesList');
  const labels={bridal:'Bridal wear',venue:'Venue',photography:'Photography',catering:'Catering',florist:'Florist'};
  try{
    const r=await fetch('/api/search');if(!r.ok)throw new Error();const first=await r.json();let vendors=first.results;
    for(let page=2;page<=first.pages;page++){const next=await fetch('/api/search?page='+page);if(next.ok)vendors=vendors.concat((await next.json()).results);}
    const map=new maplibregl.Map({container:'gelincicegi-map',style:'https://tiles.openfreemap.org/styles/bright',center:[-98.58,39.83],zoom:3});
    map.addControl(new maplibregl.NavigationControl(),'top-right');
    list.replaceChildren();
    const notice=document.createElement('p');notice.className='gc-catalog-note';notice.textContent='Markers show approximate city locations. Confirm the exact address and directions on the vendor’s official website.';list.append(notice);
    vendors.forEach(v=>{
      const card=document.createElement('div');card.className='place-item gc-map-card';
      const title=document.createElement('strong');title.textContent=v.name;
      const text=document.createElement('p');text.textContent=(labels[v.category]||v.category)+' · '+v.city+', '+v.state;
      const link=document.createElement('a');link.href=v.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Official website';
      const maps=document.createElement('a');maps.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(v.name+' '+v.city+' '+v.state);maps.target='_blank';maps.rel='noopener noreferrer';maps.textContent='Directions';
      card.append(title,text,link,document.createTextNode(' · '),maps);list.append(card);
      const popup=document.createElement('div');const name=document.createElement('strong');name.textContent=v.name;const city=document.createElement('p');city.textContent=v.city+', '+v.state+' · Approximate city location';popup.append(name,city);
      const offset=vendors.filter(x=>x.city===v.city).findIndex(x=>x.id===v.id);
      const marker=new maplibregl.Marker({color:'#ad254f'}).setLngLat([v.coords[1]+offset*0.006,v.coords[0]]).setPopup(new maplibregl.Popup().setDOMContent(popup)).addTo(map);
      card.addEventListener('click',event=>{if(event.target.closest('a'))return;map.flyTo({center:[v.coords[1],v.coords[0]],zoom:10});marker.togglePopup();});
      if(new URLSearchParams(location.search).get('vendor')===v.id)map.once('load',()=>{map.flyTo({center:[v.coords[1],v.coords[0]],zoom:10});marker.togglePopup();card.scrollIntoView({block:'nearest'});});
    });
  }catch{list.textContent='Vendors could not be loaded. Please try again.';}
});
