/* Camp-scoped meal preparation: separate planner tab. */
(function(){
'use strict';
const e=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const types=[['breakfast','إفطار'],['lunch','غداء'],['dinner','عشاء'],['snack','وجبة خفيفة'],['other','أخرى']];
const needs=['المكسرات','الحليب','البيض','القمح/الجلوتين','السمسم','الأسماك','المحار','الصويا','أخرى'];
const n=v=>Math.max(0,Math.floor(Number(v)||0)),money=v=>Math.max(0,Number(v)||0),fmt=v=>money(v).toLocaleString('en-US',{maximumFractionDigits:2});
let section='schedule';
function db(){
 S.prep??={};
 if(!S.prep.__catering){
  S.prep.__catering={staff:{supervisors:0,trainers:0,other:0},people:[],special:[],meals:[]};
  (Array.isArray(S.prep.__meals)?S.prep.__meals:[]).forEach(m=>S.prep.__catering.meals.push({id:m.id||newId('meal-'),day:n(m.day)||1,type:m.type||'other',time:m.time||'12:00',menu:m.details||'',supplier:'',supervisor:m.supervisor||'',servings:null,unitPrice:0,specialPrice:0,specialMenu:'',specialIds:[],confirmed:false}));
 }
 return S.prep.__catering;
}
const participants=()=>[...(S.students||[]).map(x=>({id:'s-'+x.id,name:L({ar:x.ar,en:x.en}),demo:true})),...db().people.map(x=>({id:x.id,name:x.name,demo:false}))];
const pname=id=>participants().find(x=>x.id===id)?.name||'مشارك غير معروف';
const total=()=>n(S.meta.students)+Object.values(db().staff).reduce((s,v)=>s+n(v),0);
const specialsOf=m=>db().special.filter(r=>(m.specialIds||[]).includes(r.id));
const servings=m=>m.servings===null||m.servings===undefined?total():n(m.servings);
const cost=m=>{const special=Math.min(servings(m),specialsOf(m).length);return (servings(m)-special)*money(m.unitPrice)+special*money(m.specialPrice)};
const type=k=>types.find(x=>x[0]===k)?.[1]||'وجبة';
function issues(m){
 let arr=[];
 if(!m.menu?.trim())arr.push('تفاصيل القائمة');
 if(!m.supplier?.trim())arr.push('المورد');
 if(!m.supervisor?.trim())arr.push('المشرف');
 if(!m.time)arr.push('التوقيت');
 if(servings(m)<=0)arr.push('عدد الحصص');
 if(specialsOf(m).length&&!m.specialMenu?.trim())arr.push('وجبة بديلة');
 if(specialsOf(m).some(r=>!r.parentOK||!r.kitchenOK))arr.push('تأكيد الحالات الخاصة');
 if(!m.confirmed)arr.push('تأكيد المورد');
 return arr;
}
function card(label,value,detail){return '<div class="cp-stat"><small>'+label+'</small><strong>'+e(value)+'</strong><small>'+detail+'</small></div>'}
function head(text,hint){return '<div class="cp-head"><h2>'+text+'</h2><p class="help">'+hint+'</p></div>'}
function pageMeals(){
 const d=db(),ready=d.meals.filter(m=>!issues(m).length).length,staff=total()-n(S.meta.students);
 return pageHead('إدارة الوجبات والتغذية','Meal preparation','تجهيز غذائي شامل مرتبط بالمعسكر الحالي، من عدد المستفيدين إلى التوريد والحساسية الغذائية.','Camp-specific meals, catering and dietary planning.',
 '<button class="primary" data-cp="new-meal">+ إضافة وجبة</button>')+
 '<div class="cp-privacy">تنبيه خصوصية: تحتوي ترتيبات الحساسية على بيانات حساسة لطلاب قُصّر. هذه نسخة تجريبية تحفظ البيانات محليًا في المتصفح دون نظام صلاحيات أو تخزين طبي آمن. لا تُدخل بيانات صحية حقيقية قبل توفير الحماية المناسبة. يجب التحقق من المكونات والتحضير مع ولي الأمر ومقدم الطعام.</div>'+
 '<div class="cp-stats">'+card('الطلاب المتوقعون',n(S.meta.students),'من بيانات المعسكر')+card('الطاقم',staff,'مشرفون ومدربون ومرافقون')+card('المستفيدون لكل وجبة',total(),'العدد الافتراضي')+card('حالات غذائية خاصة',d.special.length,'مسجلة بالاسم')+card('وجبات مستوفية',ready+' / '+d.meals.length,'وفق متطلبات التجهيز')+card('ميزانية الوجبات',fmt(d.meals.reduce((a,m)=>a+cost(m),0))+' ر.س','تكلفة تقديرية')+'</div>'+
 '<div class="cp-tabs">'+[['schedule','خطة الوجبات'],['counts','الأعداد والمستفيدون'],['special','الحساسية والتغذية الخاصة'],['audit','مراجعة الجاهزية']].map(([id,t])=>'<button data-cp="tab" data-val="'+id+'" class="'+(section===id?'active':'')+'">'+t+'</button>').join('')+'</div>'+
 (section==='schedule'?scheduleView():section==='counts'?countsView():section==='special'?specialView():auditView());
}
function scheduleView(){
 const list=[...db().meals].sort((a,b)=>a.day-b.day||a.time.localeCompare(b.time));
 return head('خطة الوجبات اليومية','نوع الوجبة، وقتها، محتواها، حصصها، المسؤول عنها، والمطبخ المجهّز.')+
 '<div class="cp-actions"><button class="primary" data-cp="new-meal">+ تخطيط وجبة جديدة</button></div>'+
 (!list.length?'<div class="card">لم تُخطط وجبات هذا المعسكر بعد. ابدأ بإضافة وجبة وربطها باليوم.</div>':
 '<div class="cp-list">'+list.map(m=>{const special=specialsOf(m),missing=issues(m);return '<article class="cp-record"><div class="cp-between"><div><span class="cp-accent">اليوم '+m.day+' · '+e(type(m.type))+' · '+e(m.time)+'</span><h3>'+e(m.menu||'لم تحدد قائمة الطعام')+'</h3><p class="help">المورد: '+e(m.supplier||'غير محدد')+' | المشرف: '+e(m.supervisor||'غير محدد')+'</p></div><span class="pill '+(missing.length?'orange':'good')+'">'+(missing.length?'ناقص '+missing.length+' متطلبات':'مستوفٍ')+'</span></div>'+
 '<div class="cp-quant"><span>الحصص <b>'+servings(m)+'</b></span><span>العادية <b>'+Math.max(0,servings(m)-special.length)+'</b></span><span>الخاصة <b>'+special.length+'</b></span><span>التكلفة <b>'+fmt(cost(m))+' ر.س</b></span></div>'+
 (special.length?'<p class="cp-highlight">الحالات الخاصة: '+e(special.map(s=>pname(s.id)).join('، '))+' — الوجبة البديلة: '+e(m.specialMenu||'غير محددة')+'</p>':'')+
 (missing.length?'<p class="help">يلزم استكمال: '+e(missing.join('، '))+'</p>':'')+
 '<div class="cp-actions"><button class="small" data-cp="edit-meal" data-id="'+e(m.id)+'">تعديل التفاصيل</button><button class="small danger" data-cp="del-meal" data-id="'+e(m.id)+'">حذف</button></div></article>'}).join('')+'</div>')+
 '<div class="cp-privacy">يجب مطابقة عدد الحصص مع الحضور الفعلي والطاقم، وليس العدد المتوقع فقط، قبل تأكيد الطلب.</div>';
}
function countsView(){
 const d=db(),people=participants();
 return head('الأعداد والمستفيدون','العدد المتوقع قد يختلف عن قائمة الطلاب المسجلة؛ لا تفترض اكتمال أسماء المشاركين.')+
 '<div class="cp-cols"><div class="card"><h3>حساب الحصص</h3><label>عدد الطلاب المتوقع<input id="cp-students" type="number" min="0" value="'+n(S.meta.students)+'"></label><label>عدد المشرفين<input id="cp-supervisors" type="number" min="0" value="'+n(d.staff.supervisors)+'"></label><label>عدد المدربين<input id="cp-trainers" type="number" min="0" value="'+n(d.staff.trainers)+'"></label><label>المرافقون والسائقون<input id="cp-other" type="number" min="0" value="'+n(d.staff.other)+'"></label><button class="primary" data-cp="save-counts">حفظ أعداد المستفيدين</button><p class="help">تحديث الطلاب يغيّر بيانات المعسكر أيضًا، والعدد يصبح الأساس الافتراضي لحصص الوجبات الجديدة.</p></div>'+
 '<div class="card"><h3>الأسماء المتاحة للتغذية الخاصة</h3><div class="cp-names">'+people.map(p=>'<div>'+e(p.name)+(p.demo?' <small>تجريبي</small>':' <button class="small danger" data-cp="del-person" data-id="'+e(p.id)+'">حذف</button>')+'</div>').join('')+'</div><label>إضافة مشارك للتجهيز<input id="cp-person-name" maxlength="100" placeholder="اسم أو معرف المشارك"></label><button class="primary" data-cp="add-person">إضافة مشارك</button><p class="help">الأسماء المسجلة: '+people.length+' | الطلاب المتوقعون: '+n(S.meta.students)+'. قائمة الأسماء الحالية تجريبية أو مدخلة يدويًا.</p></div></div>';
}
function specialView(){
 const d=db();
 return head('الترتيبات الغذائية الخاصة','اختر المشاركين الذين يحتاجون تجهيزًا خاصًا، وحدد مكونات يجب تجنبها وتعليمات مؤكدة من الأسرة والمطبخ.')+
 '<div class="cp-actions"><button class="primary" data-cp="new-special">+ تحديد طالب بتغذية خاصة</button></div>'+
 (!d.special.length?'<div class="card">لم تُسجّل حالات غذائية خاصة بعد. عدم التسجيل لا يعني عدم وجود حساسية.</div>':
 '<div class="cp-list">'+d.special.map(s=>'<article class="cp-record"><div class="cp-between"><div><h3>'+e(pname(s.id))+'</h3><p>'+e(s.kind)+' · '+e(s.allergens.join('، ')||'تعليمات خاصة')+'</p><p class="help">'+e(s.notes||'لا توجد تعليمات')+'</p></div><span class="pill '+(s.parentOK&&s.kitchenOK?'good':'orange')+'">'+(s.parentOK&&s.kitchenOK?'تأكيدان موثقان':'بانتظار التحقق')+'</span></div><p class="help">'+(s.parentOK?'✓':'○')+' تأكيد ولي الأمر · '+(s.kitchenOK?'✓':'○')+' تأكيد المطبخ</p><div class="cp-actions"><button class="small" data-cp="edit-special" data-id="'+e(s.id)+'">تعديل</button><button class="small danger" data-cp="del-special" data-id="'+e(s.id)+'">حذف</button></div></article>').join('')+'</div>')+
 '<div class="cp-privacy">يجب التحقق من التحسس والتلوث التبادلي وتعليمات التحضير والتقديم مع الأسرة والمختصين ومقدم الطعام. تأكيد الحقول ليس ضمانًا طبيًا.</div>';
}
function auditView(){
 const d=db(),days=S.meta.days.map((day,i)=>({day:i+1,label:L(day),list:d.meals.filter(m=>m.day===i+1)}));
 const failures=d.meals.filter(m=>issues(m).length);
 return head('تدقيق جاهزية التغذية','لا يتحول تجهيز الوجبات إلى حالة جاهزة لمجرد وجود أزرار أو حقول.')+
 '<div class="cp-cols"><div class="card"><h3>تغطية أيام المعسكر</h3>'+days.map(x=>'<p>اليوم '+x.day+' · '+e(x.label)+': <b>'+x.list.length+' وجبة</b></p>').join('')+'</div>'+
 '<div class="card"><h3>الوجبات التي تحتاج استكمالًا</h3>'+(failures.length?failures.map(m=>'<p><b>اليوم '+m.day+' · '+e(type(m.type))+'</b>: '+e(issues(m).join('، '))+'</p>').join(''):'لا توجد نواقص في الوجبات المسجلة.')+'</div>'+
 '<div class="card"><h3>مراجعة الحالات الخاصة</h3><p>إجمالي الحالات: '+d.special.length+'</p><p>تأكيد ولي الأمر: '+d.special.filter(s=>s.parentOK).length+'</p><p>تأكيد المطبخ: '+d.special.filter(s=>s.kitchenOK).length+'</p><p>عدد الطلاب المتوقع: '+n(S.meta.students)+'</p><p>الأسماء المسجلة: '+participants().length+'</p></div></div>'+
 '<div class="cp-privacy">لإقفال التجهيز تشغيليًا يلزم اعتماد العدد الفعلي، خطة الوجبات لجميع الأيام، توقيت التوريد، مراجعة الحساسية، والوجبات البديلة. هذه أداة متابعة وليست اعتمادًا طبيًا أو موافقة تلقائية.</div>';
}
function mealModal(id){
 const d=db(),m=d.meals.find(x=>x.id===id),v=m||{day:1,type:'lunch',time:'13:00',menu:'',supplier:'',supervisor:'',servings:total(),unitPrice:0,specialPrice:0,specialMenu:'',specialIds:d.special.map(s=>s.id),confirmed:false};
 openModal('<h2>'+(m?'تعديل الوجبة':'تخطيط وجبة جديدة')+'</h2><p class="help">حدد محتوى الوجبة وحصصها، وخصص قوائم بديلة للحالات المسجلة.</p><div class="cp-form">'+
 '<label>اليوم<select id="cm-day">'+S.meta.days.map((day,i)=>'<option value="'+(i+1)+'" '+(v.day===i+1?'selected':'')+'>اليوم '+(i+1)+' · '+e(L(day))+'</option>').join('')+'</select></label>'+
 '<label>نوع الوجبة<select id="cm-type">'+types.map(([id,label])=>'<option value="'+id+'" '+(v.type===id?'selected':'')+'>'+label+'</option>').join('')+'</select></label>'+
 '<label>وقت التقديم<input type="time" id="cm-time" value="'+e(v.time)+'"></label>'+
 '<label>إجمالي الحصص<input type="number" min="0" id="cm-servings" value="'+n(v.servings)+'"></label>'+
 '<label class="full">القائمة الغذائية ومكوناتها<textarea id="cm-menu" rows="3">'+e(v.menu)+'</textarea></label>'+
 '<label>المورد / المطبخ<input id="cm-supplier" maxlength="120" value="'+e(v.supplier)+'"></label>'+
 '<label>المشرف المسؤول<input id="cm-supervisor" maxlength="120" value="'+e(v.supervisor)+'"></label>'+
 '<label>سعر الحصة العادية (ر.س)<input type="number" step=".01" min="0" id="cm-price" value="'+money(v.unitPrice)+'"></label>'+
 '<label>سعر الحصة الخاصة (ر.س)<input type="number" step=".01" min="0" id="cm-special-price" value="'+money(v.specialPrice)+'"></label>'+
 '<div class="full"><b>الطلاب الذين يحتاجون وجبات مخصصة لهذه الوجبة</b><div class="cp-checkboxes">'+(d.special.length?d.special.map(s=>'<label><input type="checkbox" data-cm-special="'+e(s.id)+'" '+(v.specialIds?.includes(s.id)?'checked':'')+'>'+e(pname(s.id))+'</label>').join(''):'لا توجد حالات خاصة مسجلة حتى الآن.')+'</div></div>'+
 '<label class="full">محتوى الوجبة الخاصة وطريقة تجهيزها<textarea id="cm-special-menu" rows="2">'+e(v.specialMenu)+'</textarea></label>'+
 '<label class="full cp-check"><input type="checkbox" id="cm-confirmed" '+(v.confirmed?'checked':'')+'> تم تأكيد الكميات والمكونات والتوقيت مع المورد</label></div>'+
 '<div class="cp-actions"><button data-act="close">إلغاء</button><button class="primary" data-cp="save-meal" data-id="'+e(id||'')+'">حفظ الوجبة</button></div>');
}
function specialModal(id){
 const d=db(),v=d.special.find(s=>s.id===id)||{id:'',kind:'حساسية غذائية',allergens:[],notes:'',parentOK:false,kitchenOK:false};
 if(!participants().length)return toast('أضف مشاركين أولًا.');
 openModal('<h2>'+(id?'تعديل الحالة الغذائية':'تحديد مشارك بتغذية خاصة')+'</h2><div class="cp-form"><label>الطالب / المشارك<select id="cs-id" '+(id?'disabled':'')+'><option value="">اختر المشارك</option>'+participants().map(p=>'<option value="'+e(p.id)+'" '+(p.id===v.id?'selected':'')+'>'+e(p.name)+(p.demo?' (تجريبي)':'')+'</option>').join('')+'</select></label>'+
 '<label>نوع الاحتياج<select id="cs-kind">'+['حساسية غذائية','عدم تحمل غذائي','نظام غذائي خاص','حسب توجيه طبي'].map(t=>'<option '+(t===v.kind?'selected':'')+'>'+t+'</option>').join('')+'</select></label>'+
 '<div class="full"><b>المكونات التي يجب تجنبها</b><div class="cp-checkboxes">'+needs.map(t=>'<label><input type="checkbox" data-cs-allergen="'+e(t)+'" '+(v.allergens.includes(t)?'checked':'')+'>'+t+'</label>').join('')+'</div></div>'+
 '<label class="full">تعليمات معتمدة من ولي الأمر<textarea id="cs-notes" rows="3">'+e(v.notes)+'</textarea></label>'+
 '<label class="full cp-check"><input type="checkbox" id="cs-parent" '+(v.parentOK?'checked':'')+'> تم التحقق مع ولي الأمر</label>'+
 '<label class="full cp-check"><input type="checkbox" id="cs-kitchen" '+(v.kitchenOK?'checked':'')+'> أكد المطبخ القدرة على تجهيز الوجبة دون مكونات محظورة وتجنب التلوث التبادلي</label></div>'+
 '<div class="cp-actions"><button data-act="close">إلغاء</button><button class="primary" data-cp="save-special" data-id="'+e(id||'')+'">حفظ الحالة</button></div>');
}
function commit(){save();render({preserveScroll:true})}
function handle(b){
 const a=b.dataset.cp,id=b.dataset.id,d=db();
 if(a==='tab'){section=b.dataset.val;render({preserveScroll:true});return}
 if(a==='new-meal'||a==='edit-meal'){mealModal(id);return}
 if(a==='new-special'||a==='edit-special'){specialModal(id);return}
 if(a==='save-counts'){S.meta.students=n($('#cp-students').value);d.staff={supervisors:n($('#cp-supervisors').value),trainers:n($('#cp-trainers').value),other:n($('#cp-other').value)};commit();toast('حُفظت أعداد المستفيدين.');return}
 if(a==='add-person'){const name=$('#cp-person-name').value.trim();if(name.length<2)return toast('اكتب اسمًا واضحًا.');if(participants().some(p=>p.name===name))return toast('الاسم موجود مسبقًا.');d.people.push({id:newId('guest-'),name});commit();return}
 if(a==='del-person'){if(d.special.some(s=>s.id===id))return toast('احذف احتياج التغذية الخاص لهذا المشارك أولًا.');d.people=d.people.filter(p=>p.id!==id);commit();return}
 if(a==='del-meal'){if(confirm('حذف الوجبة من الخطة؟')){d.meals=d.meals.filter(m=>m.id!==id);commit()}return}
 if(a==='del-special'){if(confirm('حذف الحالة الغذائية؟')){d.special=d.special.filter(s=>s.id!==id);d.meals.forEach(m=>m.specialIds=(m.specialIds||[]).filter(x=>x!==id));commit()}return}
 if(a==='save-meal'){
  const m=d.meals.find(x=>x.id===id),newValue={id:m?.id||newId('meal-'),day:n($('#cm-day').value),type:$('#cm-type').value,time:$('#cm-time').value,menu:$('#cm-menu').value.trim(),supplier:$('#cm-supplier').value.trim(),supervisor:$('#cm-supervisor').value.trim(),servings:n($('#cm-servings').value),unitPrice:money($('#cm-price').value),specialPrice:money($('#cm-special-price').value),specialMenu:$('#cm-special-menu').value.trim(),specialIds:$$('[data-cm-special]:checked').map(x=>x.dataset.cmSpecial),confirmed:$('#cm-confirmed').checked};
  if(!newValue.day||!newValue.menu||!newValue.time)return toast('اليوم وقائمة الطعام والتوقيت مطلوبة.');
  if(newValue.specialIds.length>newValue.servings)return toast('عدد الحصص أقل من الحالات الخاصة.');
  if(m)Object.assign(m,newValue);else d.meals.push(newValue);closeModal();commit();return;
 }
 if(a==='save-special'){
  const sid=id||$('#cs-id').value,allergens=$$('[data-cs-allergen]:checked').map(x=>x.dataset.csAllergen);
  if(!sid||!participants().some(x=>x.id===sid))return toast('اختر مشاركًا.');
  if(!id&&d.special.some(x=>x.id===sid))return toast('المشارك مسجل مسبقًا.');
  const data={id:sid,kind:$('#cs-kind').value,allergens,notes:$('#cs-notes').value.trim(),parentOK:$('#cs-parent').checked,kitchenOK:$('#cs-kitchen').checked};
  if(!allergens.length&&!data.notes)return toast('حدد الاحتياج أو التعليمات.');
  const existing=d.special.find(x=>x.id===id);if(existing)Object.assign(existing,data);else d.special.push(data);
  closeModal();commit();return;
 }
}
const st=document.createElement('style');
st.textContent='.cp-privacy{background:#fff4e8;color:#734414;border:1px solid #f2d5b9;border-radius:9px;padding:12px 15px;font-size:12.5px;margin:15px 0}.cp-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.cp-stat{padding:16px;background:var(--surface);border:1px solid var(--line);border-radius:10px;display:flex;flex-direction:column;gap:6px}.cp-stat strong{font-size:26px}.cp-stat small{color:var(--muted)}.cp-tabs{display:flex;flex-wrap:wrap;gap:9px;margin:18px 0;border-bottom:1px solid var(--line);padding-bottom:13px}.cp-tabs button{font:inherit;padding:10px 13px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--fg);cursor:pointer}.cp-tabs button.active{background:var(--accent);color:white}.cp-head h2{font-size:19px}.cp-actions{display:flex;justify-content:flex-end;gap:9px;margin:12px 0}.cp-list{display:grid;gap:12px}.cp-record{border:1px solid var(--line);background:var(--surface);border-radius:12px;padding:17px}.cp-record h3{margin:5px 0}.cp-between{display:flex;justify-content:space-between;gap:10px}.cp-accent{color:var(--accent);font-size:12px;font-weight:700}.cp-quant{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:15px 0}.cp-quant span{background:var(--soft);border-radius:7px;padding:10px;font-size:12px}.cp-highlight{background:var(--accentsoft);border-radius:7px;padding:10px;font-size:12px}.cp-cols{display:grid;grid-template-columns:repeat(2,1fr);gap:13px}.cp-cols .card{display:flex;flex-direction:column;gap:10px}.cp-cols label,.cp-form label{display:grid;gap:6px;font-size:13px}.cp-cols input,.cp-form input,.cp-form select,.cp-form textarea{font:inherit;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--fg);padding:8px;width:100%}.cp-names{max-height:240px;overflow:auto;display:grid;gap:6px}.cp-names>div{border-bottom:1px solid var(--line);padding:6px}.cp-form{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:15px 0}.cp-form .full{grid-column:1/-1}.cp-checkboxes{display:flex;flex-wrap:wrap;gap:11px;margin-top:9px}.cp-checkboxes label,.cp-check{display:flex!important;align-items:center;gap:7px}.cp-checkboxes input,.cp-check input{width:auto}@media(max-width:800px){.cp-stats,.cp-cols{grid-template-columns:repeat(2,1fr)}}@media(max-width:540px){.cp-stats,.cp-cols,.cp-form{grid-template-columns:1fr}.cp-quant{grid-template-columns:repeat(2,1fr)}.cp-between{flex-direction:column}}';
document.head.append(st);
NAV[1][1].push(['meals','إدارة الوجبات والتغذية','Meals & catering']);
PAGE_TITLES.meals=['إدارة الوجبات والتغذية','Meal preparation'];
PAGES.meals=pageMeals;
document.addEventListener('click',event=>{const b=event.target.closest('[data-cp]');if(!b)return;event.preventDefault();event.stopImmediatePropagation();handle(b)},true);
if(location.hash==='#meals'||S.page==='meals')page='meals';
render({preserveScroll:true});
})();