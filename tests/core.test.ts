import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { searchVendors, vendors } from "../lib/catalog";
import { answerQuestion, questions, budgetRows, createProfile, guideReply, money, parseAmount, planText } from "../lib/planning";
import { createPlanPdf } from "../lib/pdf";

test("US search handles English and Turkish queries, filters, paging, and real empty results",()=>{
  assert.equal(vendors.length,28);
  const result=searchVendors("NEW YORK BRIDAL");
  assert.equal(searchVendors("NEW YORK GELİNLİK").total,result.total);
  assert.ok(result.total>=2);
  assert.ok(result.results.every(v=>v.category==="bridal"&&v.city==="New York"));
  assert.ok(searchVendors("New York wedding photographers").results.some(v=>v.name==="Susan Stripling Photography"));
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
  assert.match(answerQuestion(profile,"123"),/city and state/);
  assert.equal(profile.answers.length,0);
  for(const answer of ["New York, NY","150 guests","40000 USD","Modern garden","Photography and venue"])assert.equal(answerQuestion(profile,answer),"");
  assert.equal(profile.complete,true);
  assert.equal(profile.budget,40000);
  assert.equal(profile.city,"New York, NY");
  assert.match(planText(profile),/Tuğçe/);
  assert.match(planText(profile),/\$40,000/);
  assert.match(planText(profile),/Suggested budget breakdown/);
  assert.match(planText(profile),/Venue and catering: \$18,000 \(45%\)/);
  assert.equal(questions.length,5);
  assert.match(questions[0],/Which US city and state/);
  assert.match(questions[4],/two biggest priorities/);
  assert.match(guideReply(profile,"Can you book a venue?"),/cannot check live availability or make reservations/);
  assert.match(guideReply(profile,"quantum gravity"),/AI chat is not enabled yet/);
});
test("download is a valid English PDF with Unicode name support",async()=>{
  const profile=createProfile("Tuğçe Çiğdem");
  for(const answer of ["Saratoga Springs, NY","150","$40,000","Elegant garden","Photography and venue"])answerQuestion(profile,answer);
  const bytes=await createPlanPdf(profile);
  const pdf=await PDFDocument.load(bytes);
  assert.ok(pdf.getPageCount()>=1);
  assert.equal(pdf.getTitle(),"Gelin Çiçeği — Wedding Plan");
  await writeFile(process.env.GC_TEST_PDF_PATH || join(tmpdir(),"gelin-cicegi-test-plan.pdf"),bytes);
});
