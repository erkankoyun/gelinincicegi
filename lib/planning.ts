import { normalize, searchVendors } from "./catalog";

export type Profile = {
  name: string; city: string; guests: number; budget: number; currency: "USD";
  style: string; priorities: string; answers: string[]; complete: boolean;
  history: { role: "user" | "assistant"; content: string }[];
};
export const questions = [
  "Which US city and state are you planning your wedding in? For example, New York, NY or Miami, FL.",
  "About how many guests are you expecting? For example, 100 or 150–180 guests.",
  "What is your total wedding budget in US dollars? For example, $30,000 or 40000 USD.",
  "What kind of wedding are you dreaming of? For example, modern, classic, garden, beach or an intimate ceremony.",
  "What are your two biggest priorities? You could choose the venue, photography, bridal wear, food, entertainment or budget management.",
];
export const budgetRows = [
  { label: "Venue and catering", percent: 45 }, { label: "Photography and video", percent: 12 },
  { label: "Bridal wear and attire", percent: 10 }, { label: "Flowers and decor", percent: 8 },
  { label: "Music and entertainment", percent: 8 }, { label: "Other expenses", percent: 7 },
  { label: "Contingency fund", percent: 10 },
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
  if (answer.length > 500) return "Please keep your answer under 500 characters.";
  const step = profile.answers.length;
  if (step >= 5) return "Your profile is already complete.";
  if (step === 0) {
    if (answer.length < 2 || !/[a-zA-ZçğıöşüÇĞİÖŞÜ]/.test(answer)) return "Please enter your city and state.";
    profile.city = answer;
  } else if (step === 1) {
    const count = parseAmount(answer);
    if (!Number.isFinite(count) || count < 1 || count > 10000) return "Please enter a guest count between 1 and 10,000.";
    profile.guests = Math.ceil(count);
  } else if (step === 2) {
    const budget = parseAmount(answer);
    if (!Number.isFinite(budget) || budget < 100 || budget > 10000000) return "Please enter your total budget in US dollars, for example 30000 USD.";
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
  const budget = budgetRows.map(r => `${r.label}: ${money(Math.round(p.budget*r.percent/100))} (${r.percent}%)`).join("\n");
  const matches = suggestedVendors(p);
  return `${p.name}, your wedding profile is ready!\n\n**Your wedding profile**\nCity: ${p.city}\nGuests: ${p.guests}\nTotal budget: ${money(p.budget)}\nStyle: ${p.style}\nPriorities: ${p.priorities}\n\n**Suggested budget breakdown**\n${budget}\n\nThis breakdown is a planning example, not a vendor quote or current market pricing. Your total planning budget per guest is approximately ${money(p.budget/p.guests)}.\n\n**Your first steps**\n1. Confirm your preferred date, city and state.\n2. Request written, all-inclusive quotes from at least three venues. Compare taxes, service charges, cancellation terms and rain plans.\n3. Once your venue is confirmed, schedule photography, music and bridal appointments.\n4. Track your seating arrangements and menu choices alongside your guest count.\n5. Include taxes and service charges in your total budget, and set aside your contingency fund.\n\n**Vendors to research**\n${matches.length ? matches.map(v=>`${v.name} — ${v.city}\n${v.url}`).join("\n") : "Our directory does not have vendors in this city yet. Try nearby cities and request quotes through vendors’ official websites."}\n\nConfirm reservations, availability and pricing directly with each vendor.`;
}
export function guideReply(p: Profile, message: string) {
  const text = normalize(message);
  if (/rezerv|available|availability|musait|book/.test(text)) return "I cannot check live availability or make reservations. Use vendor search to visit the official website and confirm dates and pricing directly. Review the written contract and refund or cancellation terms before finalizing your payment schedule.";
  if (/butce|budget|maliyet|fiyat|cost|price/.test(text)) return `${p.name}, with your ${money(p.budget)} budget, you could start by allocating ${money(p.budget*0.45)} to the venue and catering. With ${p.guests} guests, your total budget per guest is approximately ${money(p.budget/p.guests)}. These are planning allocations, not vendor quotes. Ask for taxes, service charges and mandatory extras in writing, and include every item in your total budget.`;
  if (/mekan|venue|salon/.test(text)) return `For ${p.city}, compare seated capacity for ${p.guests} guests, your preferred date and your ${p.style} style. Request at least three written quotes covering food and drinks, taxes and service charges, accessibility, cancellation terms and a bad-weather plan. ${suggestedVendors(p).map(v=>v.name+": "+v.url).join("\n") || "Our directory has no vendors in this city yet. Try searching a nearby city."}`;
  if (/fotograf|photo|video/.test(text)) return "Ask photographers for a full wedding gallery, delivery schedule, coverage hours, second-photographer options, backup equipment and image usage rights in writing. The starting photography and video allocation in your plan is " + money(p.budget*0.12) + ". This allocation is not a vendor quote.";
  if (/gelinlik|dress|bridal|kiyafet|attire/.test(text)) return `Bring your ${p.style} inspiration, venue details and wedding season to your bridal appointment. Ask about delivery dates, fittings and alteration fees. Your example attire allocation is ${money(p.budget*0.10)}; confirm current prices with the boutique.`;
  if (/takvim|timeline|tarih|zaman|schedule/.test(text)) return "Start by confirming your date and venue together. Then plan photography, music, attire and your guest list. As the day approaches, combine your final guest count, seating chart and vendor arrival times into one wedding-day schedule. Base specific deadlines on each vendor’s contract.";
  if (/yemek|cater|menu|food|alerji|allerg/.test(text)) return `For ${p.guests} guests, ask about service style and the deadline for your final headcount. Make sure your quote clearly covers a tasting, allergies, vegetarian options, children’s meals, staffing and equipment. Include taxes and service charges in the total.`;
  if (/cicek|flower|dekor|decor|florist/.test(text)) return `Define your ${p.style} look with a few main colors and focal points. Your starting example allocation for flowers and decor is ${money(p.budget*0.08)}. Ask about seasonal alternatives, setup and collection times, and rental return terms.`;
  if (/muzik|music|dj|band|eglence|entertain/.test(text)) return "Compare coverage hours, breaks, sound and lighting, venue noise limits, backup equipment and overtime charges in writing. List your entrance music, first dance and last song separately.";
  if (/oturma|seating|masa|guest|davetli/.test(text)) return `Organize your ${p.guests} guests into family and friend groups, then add them to the Seating Planner. Specify who should sit together or apart. Check accessibility, high chairs and service aisles before finalizing the layout.`;
  if (/teklif|quote/.test(text)) return "Use vendor search to request written quotes directly from official websites. Compare the same guest count, date and service scope, and ask each vendor to include taxes, service charges and mandatory extras.";
  return `${p.name}, I can use your profile (${p.city}, ${p.guests} guests, ${money(p.budget)}) to help with budgets, venues, photography, bridal wear, catering, music and timelines. You are using the planning guide; open-ended AI chat is not enabled yet. Could you add more detail about one of these topics?`;
}
