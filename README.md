# Gelin Çiçeği — Amerika

ABD düğün firmaları için arama, beş adımlı düğün danışmanı, PDF planı, firma haritası ve oturma planı. Kaynak tasarım korunmuştur; favicon, kullanıcının sağladığı gül görselidir.

## Çalışan akışlar

- `/api/search`: 28 resmi kaynaklı ABD firma kaydında Türkçe/İngilizce anahtar sözcük araması; kategori/şehir filtreleri ve sayfalama. Kayıtlar `lib/vendors.json` içinde kaynak URL ve kontrol tarihiyle tutulur. Bu, tüm interneti arayan bir motor değildir. İşletmelere ait fiyat, puan veya canlı müsaitlik uydurulmaz.
- `/api/advisor`: Beş soruyla ABD şehri, davetli, USD bütçesi, tarz ve öncelikleri alır. Profil D1 üzerinde 30 gün erişilebilir kalır; rastgele 256 bit oturum anahtarıyla korunur. Soru yanıtları, iletişim kaydı, kaldığı yerden devam, sıfırlama ve PDF çıktısı desteklenir.
- PDF: Türkçe karakter desteği, bütçe dağılımı ve kişisel adımlar içeren gerçek PDF dosyası.
- Danışman: Varsayılan olarak açıkça etiketlenen planlama rehberi. Yapay zekâ için gerekli servis ayarları girildiğinde AI SDK üzerinden gerçek model yanıtı kullanılır. Yapay zekâ hatası durumunda başarılı yanıt taklidi yapılmaz.
- E-posta: Kayıt işlemi otomatik e-posta göndermez. İlgili düğmeye ziyaretçi bastığında, kendi profilindeki e-posta adresine işlem e-postası gönderilir. Gönderim ancak Resend ve doğrulanmış gönderen ayarları tamamlandığında açılır; aksi halde PDF seçeneği sunulur.
- Harita: Şehir düzeyinde yaklaşık ABD konumları, resmi site ve yol tarifi bağlantıları. Kesin adres iddiasında bulunulmaz.

## Geliştirme

Node.js 22.13+ ve pnpm gerekir. `pnpm install`, `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`.

Statik sayfalar ve görseller `public/`; sunucu API yolları `app/api/`; iş mantığı `lib/`; D1 şeması `db/schema.ts`; sürümlü şema göçleri `drizzle/` içindedir. D1 binding adı `DB` olarak korunmalıdır. Sites yayınında şema göçleri uygulanır. `dist/`, bağımlılıklar, yerel durum ve gerçek ortam dosyaları kaynak depoya eklenmez.

## Servis ayarları

`.env.example` yalnızca değişken adlarını içerir. Gerçek değerler Sites çalışma ortamı ayarlarında secret olarak tanımlanır; tarayıcıya veya GitHub'a yazılmaz.

| Değişken | Kullanım |
| --- | --- |
| `AI_GATEWAY_API_KEY` | AI Gateway erişim anahtarı |
| `AI_MODEL` | Gateway'in güncel model listesinde bulunan `provider/model` kimliği |
| `RESEND_API_KEY` | İşlem e-postası gönderimi için kısıtlı API anahtarı |
| `EMAIL_FROM` | Kullanıcının doğruladığı alandaki gönderen adresi |

AI Gateway model kataloğu: https://ai-gateway.vercel.sh/v1/models

Resend gönderim belgesi: https://resend.com/docs/api-reference/emails/send-email

Özgün sitenin kapalı sunucu kodu ve taranmış firma indeksi bu arşivde yoktur. Tam veri kapsamını aktarmak için sahibinden kaynak/veritabanı dışa aktarımı veya belgelenmiş API erişimi gerekir. ABD firma kapsamı bu bağımsız başlangıç indeksiyle sınırlıdır. Bu sürümde gerçek AI ve e-posta anahtarları yapılandırılmamıştır; onaylı servis bilgileri sağlandığında etkinleştirilebilir.
