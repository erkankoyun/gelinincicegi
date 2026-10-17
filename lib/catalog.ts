import catalog from "./vendors.json";

export type Vendor = {
  id: string; name: string; category: string; city: string; state: string;
  url: string; description: string; keywords: string[]; coords: number[];
  source: string; checkedAt: string;
};
export const vendors = catalog as Vendor[];
export function normalize(value: string) {
  return value.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
const aliases: Record<string, string> = {
  gelinlik: "bridal", gelinligi: "bridal", dress: "bridal", dresses: "bridal", bridal: "bridal", gown: "bridal", gowns: "bridal", boutiques: "bridal",
  mekan: "venue", mekani: "venue", salon: "venue", venues: "venue", venue: "venue",
  fotograf: "photography", fotografci: "photography", photographer: "photography", photographers: "photography", photos: "photography", photo: "photography",
  cicek: "florist", cicekci: "florist", flowers: "florist", flower: "florist", florists: "florist", catering: "catering",
  nyc: "new york", istanbul: "istanbul", dugun: "wedding", dugunu: "wedding", weddings: "wedding",
};
export function searchVendors(query = "", category = "", city = "", page = 1) {
  const terms = normalize(query).split(" ").filter(Boolean).filter(x => !["in", "the", "and", "near", "icin", "bir", "bana", "bul"].includes(x));
  const selectedCategory = aliases[normalize(category)] || normalize(category);
  const found = vendors.map(vendor => {
    const haystack = normalize([vendor.name, vendor.category, vendor.city, vendor.state, vendor.description, ...vendor.keywords, "wedding dugun"].join(" "));
    if (selectedCategory && vendor.category !== selectedCategory) return null;
    if (city && !normalize(vendor.city + " " + vendor.state).includes(normalize(city))) return null;
    let score = 0;
    for (const term of terms) {
      const expanded = aliases[term] || term;
      if (!haystack.includes(expanded)) return null;
      score += normalize(vendor.name).includes(expanded) ? 5 : normalize(vendor.city).includes(expanded) ? 4 : 1;
    }
    return { vendor, score };
  }).filter((item): item is { vendor: Vendor; score: number } => item !== null).sort((a,b) => b.score-a.score || a.vendor.name.localeCompare(b.vendor.name));
  const limit = 10;
  const pages = Math.max(1, Math.ceil(found.length/limit));
  const currentPage = Math.min(pages, Math.max(1, Math.floor(page) || 1));
  return { query, total: found.length, page: currentPage, pages, limit, indexed_count: vendors.length, results: found.slice((currentPage-1)*limit, currentPage*limit).map(x => x.vendor), categories: [...new Set(vendors.map(v => v.category))], cities: [...new Set(vendors.map(v => v.city))].sort(), currency: "USD", country: "US" };
}
