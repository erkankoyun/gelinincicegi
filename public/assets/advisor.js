(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    const root=document.querySelector('.gd-funnel');if(!root)return;
    const $=selector=>root.querySelector(selector);
    const phases={intro:$('.gd-phase--intro'),question:$('.gd-phase--question'),email:$('.gd-phase--email'),complete:$('.gd-phase--complete')};
    const name=$('.gd-funnel__name-input'),start=$('.gd-funnel__start-btn'),qForm=$('.gd-funnel__form'),answer=$('.gd-funnel__input'),qSubmit=$('.gd-funnel__submit-btn');
    const contact=$('.gd-funnel__email-form'),email=$('.gd-funnel__email-input'),phone=$('.gd-funnel__phone-input');
    const historyBox=$('.gd-advisor__history'),chatForm=$('.gd-advisor__form'),chatInput=$('.gd-advisor__input'),chatSubmit=$('.gd-advisor__submit');
    const pdf=$('.gd-funnel__pdf-btn'),sendEmail=$('.gd-funnel__email-btn'),emailStatus=$('.gd-funnel__email-status');
    const notice=document.createElement('p');notice.className='gc-error';notice.setAttribute('role','alert');root.append(notice);
    const key='gc-us-profile-v1';let session=localStorage.getItem(key)||'',busy=false,last=null;
    const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const rich=(node,s)=>{if(node)node.innerHTML=escape(s).replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');};
    function phase(which){Object.keys(phases).forEach(k=>{if(phases[k]){phases[k].hidden=k!==which;phases[k].classList.toggle('gd-hidden',k!==which);}});}
    function controls(){start.disabled=busy||!name.value.trim();if(qSubmit)qSubmit.disabled=busy||!answer.value.trim();const submit=contact?.querySelector('[type="submit"]');if(submit)submit.disabled=busy||!(email.value.trim()||phone.value.trim());if(chatSubmit)chatSubmit.disabled=busy||!chatInput.value.trim();}
    async function api(mode,values={}){
      const response=await fetch('/api/advisor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,session_id:session,...values})});
      if(mode==='download_pdf'&&response.ok)return response.blob();
      const data=await response.json();if(!response.ok)throw new Error(data.error||'İşlem tamamlanamadı.');return data;
    }
    async function action(fn){if(busy)return;busy=true;notice.textContent='';controls();try{await fn();}catch(error){notice.textContent=error.message;}finally{busy=false;controls();}}
    function append(role,text){const item=document.createElement('div');item.className='gd-advisor__msg gd-advisor__msg--'+role;rich(item,text);historyBox.append(item);historyBox.scrollTop=historyBox.scrollHeight;}
    function display(data){
      last=data;if(data.session_id){session=data.session_id;localStorage.setItem(key,session);}
      const progress=$('.gd-funnel__progress-fill');if(progress)progress.style.width=(data.is_complete?100:Math.min(95,(data.question_count||1)*16))+'%';
      const step=$('.gd-funnel__step-num');if(step)step.textContent=String(data.question_count||1);
      const badge=$('.gd-funnel__badge');if(badge)badge.textContent=(data.advisor_mode==='ai'?'Düğün Danışmanı':'Düğün Planlama Rehberi')+' · Gelin Çiçeği';
      if(data.is_complete){
        const stage=data.needs_email?'email':'complete';rich(phases[stage]?.querySelector('.gd-funnel__rich-reply'),data.reply);phase(stage);
        if(stage==='complete'){
          historyBox.replaceChildren();(data.profile?.history||[]).forEach(msg=>append(msg.role==='user'?'user':'assistant',msg.content));
          if(sendEmail){sendEmail.disabled=!data.email_enabled;sendEmail.hidden=!data.email_enabled;}
          if(emailStatus){emailStatus.style.display='block';emailStatus.textContent=data.email_enabled?'E-posta göndermek için aşağıdaki düğmeye basabilirsin.':'Planını PDF olarak indirebilirsin. E-posta gönderimi henüz etkin değil.';}
          const mode=$('.gd-advisor__mode');if(mode)mode.textContent=data.advisor_mode==='ai'?'Yapay zekâ danışmanı':'Planlama rehberi · Bütçe, mekân, takvim ve tedarikçi soruları';
        }
      }else{
        const question=$('.gd-funnel__question');if(question)question.textContent=data.next_question;
        const ack=$('.gd-funnel__ack');if(ack)ack.textContent=data.question_count>1?'Yanıtını kaydettim. Birlikte devam edelim.':'Merhaba '+data.user_name+'!';
        answer.value='';answer.disabled=false;phase('question');setTimeout(()=>answer.focus(),40);
      }
    }
    name.addEventListener('input',controls);name.addEventListener('keydown',e=>{if(e.key==='Enter'&&name.value.trim()){e.preventDefault();start.click();}});
    start.addEventListener('click',()=>action(async()=>display(await api('start',{name:name.value.trim()}))));
    answer.addEventListener('input',controls);qForm.addEventListener('submit',e=>{e.preventDefault();action(async()=>display(await api('message',{message:answer.value.trim()})));});
    [email,phone].forEach(input=>input?.addEventListener('input',controls));
    contact.addEventListener('submit',e=>{e.preventDefault();action(async()=>display(await api('contact',{email:email.value.trim(),phone:phone.value.trim()})));});
    chatInput.addEventListener('input',controls);
    chatInput.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!busy&&chatInput.value.trim()){e.preventDefault();chatForm.requestSubmit();}});
    chatForm.addEventListener('submit',e=>{e.preventDefault();const message=chatInput.value.trim();if(!message)return;action(async()=>{const data=await api('advisor_chat',{message});append('user',message);append('assistant',data.reply);chatInput.value='';});});
    root.querySelectorAll('.gd-funnel__reset-btn').forEach(button=>button.addEventListener('click',()=>action(async()=>{if(session)await api('reset');session='';last=null;localStorage.removeItem(key);name.value='';answer.value='';email.value='';phone.value='';historyBox.replaceChildren();phase('intro');})));
    pdf.addEventListener('click',()=>action(async()=>{const blob=await api('download_pdf');const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='gelin-cicegi-dugun-plani.pdf';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}));
    sendEmail.addEventListener('click',()=>action(async()=>{const data=await api('email_plan');if(emailStatus)emailStatus.textContent=data.message;}));
    const mode=document.createElement('p');mode.className='gd-advisor__mode';mode.textContent='Planlama rehberi';chatForm.before(mode);
    phase('intro');controls();
    if(session)action(async()=>{try{display(await api('resume'));}catch{session='';localStorage.removeItem(key);phase('intro');}});
  });
})();
