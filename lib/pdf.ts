import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { pdfFontBase64 } from "./pdf-font";
import { planText, type Profile } from "./planning";

export async function createPlanPdf(profile: Profile) {
  const doc = await PDFDocument.create();
  doc.setTitle("Gelin Çiçeği — Düğün Planı");
  doc.setAuthor("Gelin Çiçeği");
  doc.registerFontkit(fontkit);
  const bytes = Uint8Array.from(atob(pdfFontBase64), char => char.charCodeAt(0));
  const font = await doc.embedFont(bytes, { subset: true });
  const chars = new Set(font.getCharacterSet());
  const safe = (s: string) => Array.from(s).map(c => chars.has(c.codePointAt(0)!) ? c : "").join("");
  let page = doc.addPage([595.28, 841.89]);
  let y = 785;
  const addHeader = () => { page.drawText("Gelin Çiçeği", { x: 45, y, font, size: 22, color: rgb(0.67,0.12,0.29) }); y -= 34; };
  addHeader();
  const text = safe(planText(profile).replace(/\*\*/g, ""));
  for (const paragraph of text.split("\n")) {
    let line = "";
    const lines: string[] = [];
    for (const word of paragraph.split(/\s+/)) {
      if (font.widthOfTextAtSize(word, 10) > 505) {
        if (line) { lines.push(line); line = ""; }
        for (const char of word) {
          if (font.widthOfTextAtSize(line + char, 10) > 505) { lines.push(line); line = char; }
          else line += char;
        }
        continue;
      }
      const candidate = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(candidate, 10) > 505 && line) { lines.push(line); line = word; }
      else line = candidate;
    }
    lines.push(line);
    for (const content of lines) {
      if (y < 55) { page = doc.addPage([595.28,841.89]); y = 785; addHeader(); }
      if (content) page.drawText(content, { x: 45, y, font, size: 10, color: rgb(0.16,0.17,0.19) });
      y -= content ? 15 : 9;
    }
  }
  const pages = doc.getPages();
  pages.forEach((p,index)=>p.drawText(`${index+1} / ${pages.length}  •  Gelin Çiçeği`, { x: 45, y: 28, font, size: 8, color: rgb(0.45,0.45,0.45) }));
  return doc.save();
}
