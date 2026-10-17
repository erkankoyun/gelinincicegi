# Gelin Çiçeği

Türkçe düğün planlama sitesi. Ana sayfa `index.html` dosyasıdır; derleme gerektirmez.

## Sayfalar

- Ana sayfa / arama: `index.html`, `search.html`
- Harita: `harita.html`
- Oturma planı: `oturma-plani.html`
- Düğün danışmanı: `danisman.html`

## Mevcut kapsam

Yüklenen arşiv, sitenin HTML/CSS/JavaScript kopyasını içerir. Sunucu tarafındaki TYPO3/PHP uygulaması, Solr arama veritabanı ve danışman API kodları arşivde bulunmaz. Bu nedenle arama ve danışman hizmetleri, sunucu bağlantısı tamamlanana kadar kullanılamaz; ilgili sayfalarda bu durum belirtilmiştir. Oturma planı tarayıcıda çalışır. Harita, arşivdeki örnek kayıtları kullanır ve harita katmanları için internet bağlantısı gerektirir.

## Yayınlama

Dosyalar herhangi bir statik web sunucusuyla yayınlanabilir. GitHub Pages kullanılırsa kaynak olarak `main` dalındaki kök dizin seçilir. `.nojekyll`, alt çizgiyle başlayan varlık dizinlerini korur. Adres alanlarının tamamı proje alt dizininde çalışabilecek şekilde göreli tutulmuştur.
