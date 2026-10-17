import { findAnswers } from './wedding-info-data.js';
const form=document.getElementById('bb-info-form');
const input=document.getElementById('bb-info-question');
const output=document.getElementById('bb-info-answer');
const topics=document.getElementById('bb-guide-topics');
const status=document.getElementById('bb-guide-status');
let entries=[];
function el(tag,text,className){const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node;}
function addLinks(parent,entry){entry.links.forEach(link=>{const a=el('a',link.label+' →');a.href=link.href;a.style.display='inline-block';a.style.marginRight='18px';parent.append(a);});}
function answer(question){
  output.replaceChildren();output.append(el('p','You asked: '+question,'bb-asked'));
  if(!entries.length){output.append(el('p','The wedding guide is still loading. Please try again shortly.'));return;}
  const matches=findAnswers(question,entries);
  if(!matches.length){output.append(el('h2','Let’s find your starting point'),el('p','Try a question about budgets, venues, timelines, bridal wear, guest outfits, gifts, photography, food, flowers, music or seating. You can also choose a topic below.'));}
  matches.forEach(entry=>{const article=el('article');article.append(el('h2',entry.title),el('p',entry.answer));addLinks(article,entry);output.append(article);});
  output.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});
}
form.addEventListener('submit',event=>{event.preventDefault();const question=input.value.trim();if(question)answer(question);});
input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();form.requestSubmit();}});
document.querySelectorAll('[data-question]').forEach(button=>button.addEventListener('click',()=>{input.value=button.dataset.question;answer(input.value);}));
async function load(){
  try{
    const response=await fetch('assets/wedding-guide.json');if(!response.ok)throw new Error();entries=await response.json();topics.replaceChildren();
    entries.forEach(entry=>{const detail=el('details');detail.append(el('summary',entry.title),el('p',entry.answer));addLinks(detail,entry);topics.append(detail);});status.textContent='';
  }catch{status.replaceChildren(el('span','The guide could not be loaded. '));const retry=el('button','Try again','bb-button');retry.type='button';retry.addEventListener('click',load);status.append(retry);}
}
load();
