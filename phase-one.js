/* Phase 1 — native planner enhancements. Camp-scoped data only. */
(function(){
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const dlist=x=>[...new Set((x.days?.length?x.days:(x.day?[x.day]:[])).map(Number))].filter(n=>n>0&&n<=S.meta.days.length);
const mealList=()=>{S.prep.__meals??=[];return S.prep.__meals};
const mealType={breakfast:'إفطار',lunch:'غداء',dinner:'عشاء',snack:'وجبة خفيفة',other:'أخرى'};
/* Daily sections are collapsed by default. Remember explicit user choices across
   rerenders and navigation in the current session, scoped to the active camp. */
const dayDisclosureState=new Map();
const deletedMenuState=new Map();
const dayDisclosureKey=day=>String(S.activeId)+'::'+day;
function deletedDayPanel(day){
 const deleted=eliteDeletedItemsForDay(day);
 if(!deleted.length)return '<p class="help" style="margin:0">لا توجد برامج أو فعاليات محذوفة في هذا اليوم.</p>';
 return '<div class="p1-deleted-list">'+deleted.map(row=>{
   const type=row.kind==='program'?'برنامج':'فعالية';
   const action=row.kind==='program'
     ?'data-restore-deleted-program="'+E(row.id)+'"'
     :'data-act="restoreScheduleRow:'+day+','+row.index+'"';
   return '<div class="p1-deleted-item"><div class="p1-deleted-name"><b>'+E(row.name)+'</b><span>'+type+(row.time?' · '+E(clock(row.time)):'')+'</span></div>'
     +'<button type="button" class="small" '+action+'>استعادة</button></div>';
 }).join('')+'</div>';
}
function clock(s){return String(s).replace(/\b(\d{1,2}):(\d{2})\b/g,(v,h,m)=>{h=+h;return h<24&&+m<60?String(h%12||12).padStart(2,'0')+':'+m+' '+(h<12?'ص':'م'):v})}
function mealsPanel(day){const list=mealList().filter(m=>m.day===day);return '<div class="p1meals"><div class="row"><b>وجبات اليوم</b> <button class="small" data-p1="new" data-day="'+day+'" aria-label="إضافة وجبة لليوم '+day+'" title="إضافة وجبة لليوم '+day+'">+ إضافة وجبة</button></div>'+list.map(m=>'<div class="p1meal"><span><b>'+E(mealType[m.type])+'</b> · '+E(clock(m.time))+'<small style="display:block">'+E(m.details)+' | المشرف: '+E(m.supervisor)+'</small></span><span><button class="small" data-p1="edit" data-id="'+E(m.id)+'">تعديل</button><button class="small danger" data-p1="delete" data-id="'+E(m.id)+'">حذف</button></span></div>').join('')+'</div>'}
function mealModal(day,id){const m=mealList().find(v=>v.id===id);day=m?.day||+day;if(!can('select'))return;openModal('<h2>إدارة وجبة · اليوم '+day+'</h2><div class="fields spacer"><label class="fld">نوع الوجبة<select id="p1type">'+Object.entries(mealType).map(([k,v])=>'<option value="'+k+'" '+(m?.type===k?'selected':'')+'>'+v+'</option>').join('')+'</select></label><label class="fld">الوقت<input id="p1time" type="time" value="'+E(m?.time||'08:00')+'"></label><label class="fld">المشرف المسؤول<input id="p1super" maxlength="100" value="'+E(m?.supervisor||'')+'"></label><label class="fld wide">التفاصيل<textarea id="p1details" maxlength="800">'+E(m?.details||'')+'</textarea></label></div><button class="primary" data-p1="save" data-day="'+day+'" data-id="'+E(id||'')+'">حفظ الوجبة</button>')}
const oldDays=PAGES.days;
PAGES.days=function(){return oldDays()+'<section class="card spacer" id="p1-meal-management"><div class="row" style="align-items:center;gap:12px;flex-wrap:wrap"><div style="flex:1"><h2>تجهيز الوجبات والتغذية</h2><p class="help">خطة الوجبات لجميع أيام المعسكر، حصص الطلاب والطاقم، الوجبات الخاصة والحساسيات، والتوريد والتكاليف.</p></div><button class="primary" data-page="meals">فتح إدارة الوجبات</button></div></section>'};
const oldDayItems=dayItems;
dayItems=function(day){return S.selected.filter(x=>dlist(x).includes(+day)).map(x=>({x,i:ITEM(x.id)})).filter(o=>o.i).sort((a,b)=>(a.x.pri==='core'?0:1)-(b.x.pri==='core'?0:1))};
const oldEditModal=editModal;
editModal=function(id){oldEditModal(id);const box=document.getElementById('modalInner'),x=S.selected.find(v=>v.id===id)||pendingProgramChoice;if(!box||!x)return;
const t=box.querySelector('#eActivityType');if(t){const o=document.createElement('option');o.value='recreational';o.textContent='ترفيهي وترويحي';t.prepend(o);t.value=x.activityType||t.value}
const e=box.querySelector('#eDay');if(e){const legacy=e.closest('label');if(legacy){legacy.hidden=true;legacy.style.setProperty('display','none','important');legacy.setAttribute('aria-hidden','true');legacy.classList.add('p1-legacy-day-select')}const node=document.createElement('div');node.className='fld wide';node.id='p1days';node.innerHTML='<b>اختيار الأيام (يمكن اختيار أكثر من يوم)</b><div class="p1checks">'+S.meta.days.map((d,i)=>'<label><input type="checkbox" data-p1day="'+(i+1)+'" '+(dlist(x).includes(i+1)?'checked':'')+'> اليوم '+(i+1)+' · '+E(L(d))+'</label>').join('')+'</div>';e.closest('label').after(node)}};
const oldSaveEdit=saveEdit;
saveEdit=function(id){const chosen=[...document.querySelectorAll('[data-p1day]:checked')].map(e=>+e.dataset.p1day);if(document.getElementById('p1days')){if(!chosen.length)return toast('اختر يومًا واحدًا على الأقل');document.getElementById('eDay').value=String(chosen[0])}oldSaveEdit(id);const x=S.selected.find(v=>v.id===id);if(x&&chosen.length&&!document.getElementById('modal').open){x.days=chosen;x.day=chosen[0];save();render({preserveScroll:true})}};
const oldRender=render;
render=function(options){oldRender(options);phaseOneBindScheduleEditors();if(page==='days'){document.querySelectorAll('.daycol').forEach((col,i)=>{const n=i+1;const items=dayItems(n),present=new Set([...col.querySelectorAll('[data-act^="edit:"]')].map(e=>e.dataset.act.slice(5)));const anchor=col.querySelector('[data-act^="pickday:"]');items.filter(o=>!present.has(o.x.id)).forEach(o=>{const item=document.createElement('div');item.className='chip';item.innerHTML='<span>'+E(L({ar:o.i.ar,en:o.i.en}))+'</span><button class="small" data-p1="detail" data-id="'+E(o.x.id)+'">تفاصيل</button>';anchor?.before(item)});col.querySelectorAll('.chip [data-act^="edit:"]').forEach(span=>{const id=span.dataset.act.slice(5),chip=span.closest('.chip');if(chip&&!chip.querySelector('[data-p1="program-edit"]'))chip.insertAdjacentHTML('beforeend','<button class="small p1edit" data-p1="program-edit" data-id="'+E(id)+'">تعديل البرنامج</button>')});const tag=col.querySelector('.dayhead .pill');if(tag)tag.textContent=items.length+'/'+S.rules.perDayMax})}
if(page==='outputs'||page==='dashboard'||(page==='builder'&&S.step===5)){document.querySelectorAll('.schedule-print-pages .dayblock').forEach((block,i)=>{const header=block.querySelector('.daybar');if(!header||block.dataset.p1)return;block.dataset.p1='1';const button=document.createElement('button');button.className='small noprint';button.dataset.p1='toggle';const day=i+1,key=dayDisclosureKey(day);
const open=dayDisclosureState.get(key)===true;
const deleted=eliteDeletedItemsForDay(day);
const menuOpen=deletedMenuState.get(key)===true;
const deletedButton=document.createElement('button');
deletedButton.type='button';
deletedButton.className='small noprint p1-deleted-tag';
deletedButton.dataset.p1='deleted';
deletedButton.dataset.day=String(day);
deletedButton.setAttribute('aria-expanded',String(menuOpen));
deletedButton.textContent='البرامج المحذوفة ('+deleted.length+')';
header.append(deletedButton);
button.textContent=open?'إخفاء التفاصيل':'عرض التفاصيل';
button.setAttribute('aria-expanded',String(open));
header.append(button);
const content=document.createElement('div');content.className='p1daybody';content.hidden=!open;
while(header.nextSibling)content.append(header.nextSibling);block.append(content);
if(mealList().some(m=>m.day===day)){const x=document.createElement('div');x.innerHTML=mealsPanel(day);content.append(x)}
const removedPanel=document.createElement('div');
removedPanel.className='p1-deleted-panel noprint';
removedPanel.dataset.p1DeletedDay=String(day);
removedPanel.hidden=!menuOpen;
removedPanel.innerHTML='<div class="p1-deleted-heading"><b>البرامج والفعاليات المحذوفة · اليوم '+day+'</b><span>'+deleted.length+' عنصر</span></div>'+deletedDayPanel(day);
block.append(removedPanel)});const root=document.querySelector('.schedule-print-pages');if(root){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())if(!walker.currentNode.parentElement.closest('button,script,style'))nodes.push(walker.currentNode);nodes.forEach(n=>n.nodeValue=clock(n.nodeValue))}}};
/* Direct edit action bindings: avoid accidental interception by page-level handlers.
   The action buttons remain enabled for the field-supervisor role, but other actions stay role-gated. */
function phaseOneBindScheduleEditors(){
 document.querySelectorAll('button[data-act^="editScheduleRow:"],button[data-act^="editScheduleProgram:"]').forEach(btn=>{
   if(!(can('select')||can('scheduleEdit')))return;
   btn.disabled=false;
   btn.removeAttribute('aria-disabled');
   if(btn.dataset.p1EditWired)return;
   btn.dataset.p1EditWired='1';
   btn.addEventListener('click',function(event){
     event.preventDefault();event.stopImmediatePropagation();
     if(!(can('select')||can('scheduleEdit')))return toast('التعديل غير متاح لهذا الدور.');
     const action=this.dataset.act||'';
     if(action.startsWith('editScheduleRow:')){
       const [day,index]=action.slice('editScheduleRow:'.length).split(',');
       return editScheduleRow(Number(day),Number(index));
     }
     if(action.startsWith('editScheduleProgram:')){
       const id=action.slice('editScheduleProgram:'.length);
       return editModal(id);
     }
   });
 });
}

document.addEventListener('click',e=>{const b=e.target.closest('[data-p1]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const m=mealList().find(x=>x.id===b.dataset.id);
if(b.dataset.p1==='new'||b.dataset.p1==='edit')return mealModal(b.dataset.day,b.dataset.id);if(b.dataset.p1==='program-edit')return editModal(b.dataset.id);
if(b.dataset.p1==='save'){const type=document.getElementById('p1type').value,time=document.getElementById('p1time').value,supervisor=document.getElementById('p1super').value.trim(),details=document.getElementById('p1details').value.trim();if(!time||!supervisor)return toast('الوقت والمشرف حقول مطلوبة');const v={id:m?.id||'meal-'+Date.now(),day:+b.dataset.day,type,time,supervisor,details};if(m)Object.assign(m,v);else mealList().push(v);save();closeModal();render({preserveScroll:true});return}
if(b.dataset.p1==='delete'){if(m&&confirm('حذف هذه الوجبة؟')){S.prep.__meals=mealList().filter(v=>v.id!==m.id);save();render({preserveScroll:true})}return}
if(b.dataset.p1==='deleted'){
 const day=Number(b.dataset.day),key=dayDisclosureKey(day);
 const panel=b.closest('.dayblock')?.querySelector('[data-p1-deleted-day]');
 if(!panel)return;
 const open=panel.hidden;
 panel.hidden=!open;deletedMenuState.set(key,open);
 b.setAttribute('aria-expanded',String(open));
 return;
}
if(b.dataset.p1==='toggle'){
 const block=b.closest('.dayblock'),body=block?.querySelector('.p1daybody');
 if(!body)return;
 const index=[...block.parentElement.querySelectorAll('.dayblock')].indexOf(block);
 if(index<0)return;
 const open=body.hidden;
 dayDisclosureState.set(dayDisclosureKey(index+1),open);
 body.hidden=!open;
 b.textContent=open?'إخفاء التفاصيل':'عرض التفاصيل';
 b.setAttribute('aria-expanded',String(open));
 return;
}
if(b.dataset.p1==='detail'){const x=S.selected.find(v=>v.id===b.dataset.id),i=ITEM(b.dataset.id);if(!x||!i)return;openModal('<h2>'+E(L({ar:i.ar,en:i.en}))+'</h2><p class="help">'+E(x.pri==='core'?'مسار أساسي':'مسار مساند')+'</p><div class="note">الأيام: '+E(dlist(x).join('، '))+'<br>طبيعة النشاط: '+E(({theoretical:'نظري',practical:'عملي',recreational:'ترفيهي وترويحي'})[x.activityType||activityType(i)]||'غير محدد')+'</div><h3>تفريعات البرنامج</h3><p>'+E(x.activityBreakdown||'غير محددة')+'</p><h3>مبرر الاختيار</h3><p>'+E(x.why||'غير موثق')+'</p><button class="small" data-act="close">إغلاق</button>');return}
},true);
document.addEventListener('change',e=>{const field=e.target.dataset.edit;if(field?.startsWith('day:')){const x=S.selected.find(v=>v.id===field.slice(4));if(x){x.days=e.target.value?[+e.target.value]:[];save()}}},true);
const style=document.createElement('style');style.textContent='.p1daybody[hidden],.p1-deleted-panel[hidden]{display:none!important}.p1-deleted-tag{border-color:#eab6a8!important;color:#a0442c!important;background:#fff7f3!important;font-size:11px;font-weight:700;white-space:nowrap}.p1-deleted-tag:hover,.p1-deleted-tag[aria-expanded=true]{border-color:#c46a48!important;background:#ffe9dd!important}.p1-deleted-panel{margin-top:12px;padding:13px;border:1px solid var(--line);border-radius:10px;background:var(--soft);font-size:12px}.p1-deleted-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:9px}.p1-deleted-heading span{color:var(--muted)}.p1-deleted-list{display:grid;gap:7px}.p1-deleted-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 11px;border-radius:8px;background:var(--surface);border:1px solid var(--line)}.p1-deleted-name{display:flex;flex-direction:column;gap:2px;min-width:0}.p1-deleted-name span{font-size:10px;color:var(--muted)}.p1-deleted-item button{flex:none}.p1-legacy-day-select,.p1-legacy-day-select[hidden]{display:none!important} .p1meals{background:var(--surface);border:1px solid var(--line);padding:10px;border-radius:8px;margin-top:8px}.p1meal{display:flex;justify-content:space-between;gap:8px;border-top:1px solid var(--line);padding:8px 0;font-size:12px}.p1-meal-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-top:12px}.p1-meal-day{border:1px solid var(--line);border-radius:10px;padding:12px}.p1checks{display:flex;gap:8px;flex-wrap:wrap}.p1checks label{padding:7px;background:var(--soft);border-radius:7px}@media print{.p1daybody[hidden]{display:block!important}.p1meals button{display:none!important}}';document.head.append(style);
render({preserveScroll:true});
})();