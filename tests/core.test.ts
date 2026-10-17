import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { searchVendors, vendors } from "../lib/catalog";
import { answerQuestion, budgetRows, createProfile, guideReply, money, parseAmount, planText } from "../lib/planning";
import { createPlanPdf } from "../lib/pdf";

test("US search handles Turkish queries, filters, paging, and real empty results",()=>{
  assert.equal(vendors.length,28);
  const result=searchVendors("NEW YORK GELİNLİK");
  assert.ok(result.total>=2);
  assert.ok(result.results.every(v=>v.category==="bridal"&&v.city==="New York"));
  assert.ok(searchVendors("Saratoga mekan").results.some(v=>v.name==="Hall of Springs"));
  assert.ok(searchVendors("", "photography").results.every(v=>v.category==="photography"));
  assert.equal(searchVendors("olmayanfirma12345").total,0);
  assert.equal(searchVendors("", "", "",999).page,3);
  assert.ok(vendors.every(v=>new URL(v.url).protocol==="https:"));
});
test("USD parsing handles separators and rejects negative inputs",()=>{
  for(const text of ["$30,000","30.000 USD","30 bin dolar","30k dollars"])assert.equal(parseAmount(text),30000,text);
  assert.equal(parseAmount("150–180 guests"),180);
  assert.equal(parseAmount("-500"),0);
  assert.equal(budgetRows.reduce((a,b)=>a+b.percent,0),100);
  assert.equal(money(40000),"$40,000");
});
test("five answers produce a personalized US plan without invented availability",()=>{
  const profile=createProfile("Tuğçe");
  assert.match(answerQuestion(profile,"123"),/şehir/);
  assert.equal(profile.answers.length,0);
  for(const answer of ["New York, NY","150 guests","40000 USD","Modern bahçe","Fotoğraf ve mekân"])assert.equal(answerQuestion(profile,answer),"");
  assert.equal(profile.complete,true);
  assert.equal(profile.budget,40000);
  assert.equal(profile.city,"New York, NY");
  assert.match(planText(profile),/Tuğçe/);
  assert.match(planText(profile),/\$40,000/);
  assert.match(guideReply(profile,"Mekân rezervasyonu yapar mısın?"),/yetkim yok/);
  assert.match(guideReply(profile,"quantum gravity"),/yapay zekâ sohbeti henüz etkin değil/);
});
test("download is a valid multi-page PDF with Turkish font support",async()=>{
  const profile=createProfile("Tuğçe Çiğdem");
  for(const answer of ["Saratoga Springs, NY","150","$40,000","Şık ve çiçekli bahçe","Fotoğraf ve mekân"])answerQuestion(profile,answer);
  const bytes=await createPlanPdf(profile);
  const pdf=await PDFDocument.load(bytes);
  assert.ok(pdf.getPageCount()>=1);
  assert.equal(pdf.getTitle(),"Gelin Çiçeği — Düğün Planı");
  await writeFile(process.env.GC_TEST_PDF_PATH || join(tmpdir(),"gelin-cicegi-test-plan.pdf"),bytes);
});
