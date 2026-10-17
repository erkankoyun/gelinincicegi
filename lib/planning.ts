import { normalize, searchVendors } from "./catalog";

export type Profile = {
  name: string; city: string; guests: number; budget: number; currency: "USD";
  style: string; priorities: string; answers: string[]; complete: boolean;
  history: { role: "user" | "assistant"; content: string }[];
};
export const questions = [
  "Düğününü Amerika'nın hangi şehrinde ve eyaletinde planlıyorsun? Örneğin New York, NY veya Miami, FL.",
  "Yaklaşık kaç davetlin olacak? Örneğin 100 veya 150–180 kişi.",
  "Düğün için toplam bütçen kaç ABD doları? Örneğin $30,000 veya 40000 USD.",
  "Nasıl bir düğün hayal ediyorsun? Örneğin modern, klasik, bahçe, sahil veya sade bir nikâh.",
  "En önemli iki önceliğin ne? Mekân, fotoğraf, gelinlik, yemek, eğlence veya bütçe kontrolü yazabilirsin.",
];
export const budgetRows = [
  { label: "Mekân ve yemek", percent: 45 }, { label: "Fotoğraf ve video", percent: 12 },
  { label: "Gelinlik ve kıyafet", percent: 10 }, { label: "Çiçek ve dekor", percent: 8 },
  { label: "Müzik ve eğlence", percent: 8 }, { label: "Diğer giderler", percent: 7 },
  { label: "Yedek bütçe", percent: 10 },
];
export const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
export function parseAmount(input: string) {
  if (/^\s*\$?\s*-\s*\d/.test(input)) return 0;
  let text = input.toLowerCase().replace(/\$/g, "").replace(/usd|dolar|dollars?|kişi|kisi|guests?/g, "").trim();
  const multiplier = /\b(?:bin|thousand)\b|\d\s*k\b/.test(text) ? 1000 : 1;
  text = text.replace(/(\d)[,.](?=\d{3}(?:\D|$))/g, "$1");
  const matches = text.match(/\d+(?:[.,]\d+)?/g) || [];
  return matches.length ? Math.max(...matches.map(n => Number(n.replace(",", ".")))) * multiplier : 0;
}
export function createProfile(name: string): Profile {
  return { name, city: "", guests: 0, budget: 0, currency: "USD", style: "", priorities: "", answers: [], complete: false, history: [] };
}
export function answerQuestion(profile: Profile, answer: string) {
  answer = answer.replace(/\s+/g, " ").trim();
  if (answer.length > 500) return "Yanıtını 500 karakterden kısa yazabilir misin?";
  const step = profile.answers.length;
  if (step >= 5) return "Profil zaten tamamlandı.";
  if (step === 0) {
    if (answer.length < 2 || !/[a-zA-ZçğıöşüÇĞİÖŞÜ]/.test(answer)) return "Lütfen şehir ve eyalet adını yaz.";
    profile.city = answer;
  } else if (step === 1) {
    const count = parseAmount(answer);
    if (!Number.isFinite(count) || count < 1 || count > 10000) return "Lütfen 1 ile 10.000 arasında bir davetli sayısı yaz.";
    profile.guests = Math.ceil(count);
  } else if (step === 2) {
    const budget = parseAmount(answer);
    if (!Number.isFinite(budget) || budget < 100 || budget > 10000000) return "Lütfen toplam bütçeni ABD doları olarak yaz. Örneğin 30000 USD.";
    profile.budget = Math.round(budget);
  } else if (step === 3) profile.style = answer;
  else profile.priorities = answer;
  profile.answers.push(answer);
  profile.complete = profile.answers.length === 5;
  return "";
}
export function suggestedVendors(profile: Profile) {
  const city = profile.city.split(",")[0].trim().replace(/^nyc$/i, "New York").replace(/\bnew york city\b/i, "New York");
  return searchVendors("", "", city).results.slice(0, 4);
}
export function planText(p: Profile) {
  const budget = budgetRows.map(r => `${r.label}: ${money(Math.round(p.budget*r.percent/100))} (%${r.percent})`).join("\n");
  const matches = suggestedVendors(p);
  return `${p.name}, düğün profilin hazır!\n\n**Düğün profilin**\nŞehir: ${p.city}\nDavetli: ${p.guests} kişi\nToplam bütçe: ${money(p.budget)}\nTarz: ${p.style}\nÖncelikler: ${p.priorities}\n\n**Önerilen bütçe dağılımı**\n${budget}\n\nBu dağılım bir planlama örneğidir; firma teklifi veya güncel piyasa fiyatı değildir. Kişi başına toplam planlama bütçen yaklaşık ${money(p.budget/p.guests)}.\n\n**İlk adımların**\n1. Tarihini ve şehir/eyalet tercihini netleştir.\n2. En az üç mekândan tüm ücretleri içeren yazılı teklif iste. Vergi, servis bedeli, iptal ve yağmur planını karşılaştır.\n3. Mekân netleşince fotoğraf, müzik ve kıyafet randevularını planla.\n4. Yerleşim ve yemek seçimini davetli sayısıyla birlikte takip et.\n5. Vergi ve servis bedellerinin toplam bütçenin içinde olduğunu kontrol et; yedek bütçeni ayır.\n\n**Firma araştırması**\n${matches.length ? matches.map(v=>`${v.name} — ${v.city}\n${v.url}`).join("\n") : "Bu şehir için indeksimizde henüz firma bulunmuyor. Yakındaki şehirleri arayabilir ve resmi firma sitelerinden teklif isteyebilirsin."}\n\nRezervasyon, uygun tarih ve fiyat bilgilerini doğrudan firmadan doğrula.`;
}
export function guideReply(p: Profile, message: string) {
  const text = normalize(message);
  if (/rezerv|available|musait|book/.test(text)) return "Canlı müsaitlik veya rezervasyon yetkim yok. Firma aramasından resmi siteye ulaşarak tarih ve fiyatı doğrudan doğrula. Yazılı sözleşmeyi ve iade/iptal koşullarını görmeden ödeme planını kesinleştirme.";
  if (/butce|budget|maliyet|fiyat|cost/.test(text)) return `${p.name}, ${money(p.budget)} bütçende ${money(p.budget*0.45)} tutarını mekân ve yemek için bir ilk dağılım olarak ayırabilirsin. ${p.guests} davetli için toplam kişi başı bütçe yaklaşık ${money(p.budget/p.guests)}. Bu bir teklif değildir. Vergi, servis bedeli ve sözleşmedeki zorunlu ekleri yazılı iste; tüm kalemleri toplam bütçene dâhil et.`;
  if (/mekan|venue|salon|yer/.test(text)) return `${p.city} için önce ${p.guests} kişilik oturmalı kapasite, tarih ve ${p.style} tarzını karşılaştır. En az üç mekândan yazılı teklif iste; yemek ve içecek kapsamı, vergi/servis bedeli, erişilebilirlik, iptal ve kötü hava planı aynı listede bulunsun. ${suggestedVendors(p).map(v=>v.name+": "+v.url).join("\n") || "Bu şehirde henüz kayıtlı firmamız yok; başka bir şehri arayabilirsin."}`;
  if (/fotograf|photo|video/.test(text)) return "Fotoğrafçıdan tam bir düğün albümü örneği, teslim süresi, çekim saatleri, ikinci fotoğrafçı, yedek ekipman ve kullanım haklarını yazılı iste. Fotoğraf ve video için planındaki başlangıç payı " + money(p.budget*0.12) + ". Bu pay bir firma fiyatı değildir.";
  if (/gelinlik|dress|bridal|kiyafet/.test(text)) return `${p.style} tarzını, mekânın zeminini ve mevsimi gelinlik randevusuna götür. Teslim tarihi, prova ve tadilat ücretlerini sor. Kıyafet için örnek bütçe payın ${money(p.budget*0.10)}; güncel fiyatı mağazadan doğrula.`;
  if (/takvim|timeline|tarih|zaman|schedule/.test(text)) return "Önce tarih ve mekânı birlikte netleştir. Ardından fotoğraf, müzik, kıyafet ve davetli listesini planla. Düğüne yaklaşırken nihai davetli sayısı, oturma planı ve firma teslim saatlerini tek bir gün akışında birleştir. Kesin süreleri her firmanın sözleşmesine göre belirle.";
  if (/yemek|cater|menu|food|alerji/.test(text)) return `${p.guests} kişi için servis türünü ve kesin sayı bildirim tarihini sor. Menü tadımı, alerjiler, vejetaryen seçenekler, çocuk menüsü, personel ve ekipman teklifin içinde açıkça yazsın. Vergi ve servis bedelini toplam teklifin dışında bırakma.`;
  if (/cicek|flower|dekor|decor/.test(text)) return `${p.style} tarzını en fazla birkaç ana renk ve odak noktasıyla tanımla. Çiçek/dekor için ilk örnek payın ${money(p.budget*0.08)}. Mevsimsel alternatifleri, kurulum/toplama saatlerini ve kiralama iade şartlarını sor.`;
  if (/muzik|music|dj|band|eglence/.test(text)) return "Müzik hizmetinde süre, mola planı, ses/ışık kapsamı, mekânın ses sınırı, yedek ekipman ve fazla saat ücretini yazılı karşılaştır. Giriş, ilk dans ve son şarkı tercihlerini ayrı listele.";
  if (/oturma|seating|masa|guest|davetli/.test(text)) return `${p.guests} davetliyi aile ve arkadaş gruplarına ayırıp Oturma Planı aracına ekleyebilirsin. Birlikte veya ayrı oturması gereken kişileri belirt; erişilebilirlik, çocuk koltuğu ve servis koridorlarını son kontrolde değerlendir.`;
  if (/rezerv|available|musait|teklif|book/.test(text)) return "Canlı müsaitlik veya rezervasyon yetkim yok. Firma aramasından resmi siteye ulaşarak tarih ve fiyatı doğrudan doğrula. Yazılı sözleşmeyi ve iade/iptal koşullarını görmeden ödeme planını kesinleştirme.";
  return `${p.name}, profilini (${p.city}, ${p.guests} kişi, ${money(p.budget)}) kullanarak bütçe, mekân, fotoğraf, gelinlik, yemek, müzik ve takvim konusunda yardımcı olabilirim. Şu anda planlama rehberi çalışıyor; serbest yapay zekâ sohbeti henüz etkin değil. Sorunu bu başlıklardan biriyle biraz daha ayrıntılı yazar mısın?`;
}
