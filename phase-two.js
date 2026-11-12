/* Elite Camp phase 2 — operational readiness */
(function(){
'use strict';
const H=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N=x=>Math.max(0,Math.floor(Number(x)||0));
const canEdit=()=>can('select')||can('scheduleEdit');
const items=()=>S.selected.filter(p=>ITEM(p.id));
const name=id=>{const x=ITEM(id);return x?L({ar:x.ar,en:x.en}):'برنامج محذوف'};
const title=x=>x?.name||'متطلب';
const codes={trainer:'مدرب',materials:'أدوات ومطبوعات',devices:'أجهزة وشبكة',space:'قاعة مجهزة',outdoor:'مساحة خارجية',transport:'نقل',guest:'ضيف أو خبير',safety:'أمن وسلامة',family:'موافقة الأسرة',media:'توثيق إعلامي',kit:'حقيبة تدريب',facility:'مرفق خارجي'};
let tab='programs';
function db(){
 S.prep??={};
 const d=S.prep.__phase2??(S.prep.__phase2={staff:[],programs:{},custom:[],overrides:{},hidden:[],transport:[],audit:null});
 d.staff??=[];d.programs??={};d.custom??=[];d.overrides??={};d.hidden??=[];d.transport??=[];
 if(!d.migrated){(S.prep.__manual||[]).forEach(r=>d.custom.push({id:r.id,name:r.name,category:'general',linked:[],owner:S.prep[r.id]?.owner||'',quantity:1,unit:'متطلب',details:'',reason:'',status:S.prep[r.id]?.done?'ready':'pending'}));d.migrated=true;}
 return d;
}
const staff=()=>[...(S.prep.__catering?.team||[]),...db().staff];
const member=id=>staff().find(x=>x.id===id)?.name||'غير محدد';
const info=id=>{const x=ITEM(id),d=db();return {trainers:[],safety:x?.need.includes('safety')||false,outdoor:x?.need.includes('outdoor')||false,safetyWhy:'',outdoorWhy:'',...(d.programs[id]||{})}};
const related=k=>items().filter(p=>ITEM(p.id).need.includes(k)).map(x=>x.id);
function requirements(){
 const d=db(),set=[...new Set(items().flatMap(x=>ITEM(x.id).need))];
 return [...set.filter(k=>!d.hidden.includes(k)).map(k=>({id:k,name:codes[k]||k,category:k,linked:related(k),quantity:1,unit:'متطلب',owner:'',details:'',reason:'',status:'pending',derived:true,...(d.overrides[k]||{})})),...d.custom.map(x=>({...x,derived:false}))];
}
const labelIds=ids=>(ids||[]).map(name).join('، ')||'لم تُحدد برامج';
const checkPrograms=selected=>'<div class="p2-checks">'+items().map(x=>'<label><input type="checkbox" data-p2-program="'+H(x.id)+'" '+((selected||[]).includes(x.id)?'checked':'')+'>'+H(name(x.id))+'</label>').join('')+'</div>';
const selected=attr=>[...document.querySelectorAll('['+attr+']:checked')].map(e=>e.getAttribute(attr));
const input=id=>document.getElementById(id)?.value||'';
const selectedChecks=()=>{const d=db(),errors=[];items().forEach(p=>{const a=info(p.id);if(!a.trainers.length)errors.push('لم يحدد مدرب: '+name(p.id));if(a.trainers.some(id=>!staff().some(x=>x.id===id)))errors.push('مدرب غير موجود: '+name(p.id));if(a.safety&&!a.safetyWhy.trim())errors.push('سبب الأمن والسلامة ناقص: '+name(p.id));if(a.outdoor&&!a.outdoorWhy.trim())errors.push('سبب المساحة الخارجية ناقص: '+name(p.id))});requirements().forEach(r=>{if(!r.owner?.trim())errors.push('المسؤول غير محدد: '+r.name);if(!r.details?.trim())errors.push('تفاصيل ناقصة: '+r.name);if(r.status!=='ready')errors.push('المتطلب غير مكتمل: '+r.name);if(['materials','safety','transport'].includes(r.category)&&!r.linked.length)errors.push('غير مرتبط ببرنامج: '+r.name)});d.transport.forEach(t=>{if(!t.linked?.length||!t.owner||N(t.seats)<1)errors.push('بيانات نقل ناقصة: '+t.name);if(N(t.passengers)>N(t.seats))errors.push('سعة النقل أقل من عدد المشاركين: '+t.name)});return errors};
const persist=()=>{db().audit=null;save();render({preserveScroll:true})};
function page(){
 const d=db(),pg=items(),req=requirements(),ext=pg.filter(p=>info(p.id).outdoor).length,safe=pg.filter(p=>info(p.id).safety).length,errors=selectedChecks();
 return '<div class="p2-workspace"><div class="p2-hero"><div><div class="eyebrow">المرحلة الثانية · التشغيل</div><h1>جاهزية المعسكر ومتطلبات التشغيل</h1><p>توزيع الكوادر، الأمن والسلامة، المساحات، الأدوات، النقل، والمتابعة التنفيذية.</p></div><div class="p2-actions"><button data-p2="back">العودة إلى الجدول</button><button class="primary" data-p2="tab" data-value="audit">تدقيق الجاهزية</button></div></div>'+
 '<div class="p2-metrics"><div><small>البرامج</small><b>'+pg.length+'</b></div><div><small>تحتاج أمن وسلامة</small><b>'+safe+'</b></div><div><small>تحتاج مساحة خارجية</small><b>'+ext+'</b><small>بحسب البرامج المختارة</small></div><div><small>المتطلبات</small><b>'+req.length+'</b></div><div><small>ملاحظات التدقيق</small><b>'+errors.length+'</b></div></div>'+
 '<nav class="p2-tabs">'+[['programs','البرامج والمدربون'],['requirements','المتطلبات التشغيلية'],['transport','النقل والمشاركون'],['audit','تدقيق الجاهزية']].map(([key,text])=>'<button data-p2="tab" data-value="'+key+'" class="'+(tab===key?'active':'')+'">'+text+'</button>').join('')+'</nav>'+
 (tab==='programs'?programsPage():tab==='requirements'?requirementsPage():tab==='transport'?transportPage():auditPage())+
 '<p class="p2-foot">التدقيق التشغيلي مستقل عن فحص اكتمال خطة البرامج. البيانات تحفظ في هذا المتصفح، ولا تمثل تصريحًا أو فحص سلامة ميدانيًا.</p></div>';
}
function programsPage(){
 const d=db();return '<div class="p2-heading"><div><h2>البرامج والمسؤوليات</h2><p>حدد أكثر من مدرب لكل برنامج، وسبب الحاجة لاشتراطات السلامة أو المساحات الخارجية.</p></div><button class="primary" data-p2="add-staff">+ إضافة مدرب</button></div>'+
 '<div class="p2-team">'+staff().map(x=>'<span>'+H(x.name)+' · '+H(x.role||'فريق المعسكر')+(d.staff.some(t=>t.id===x.id)?' <button data-p2="delete-staff" data-id="'+H(x.id)+'">×</button>':'')+'</span>').join('')+'</div>'+
 '<div class="p2-grid">'+items().map(p=>{const a=info(p.id);return '<article class="p2-card"><div class="p2-card-header"><h3>'+H(name(p.id))+'</h3><button data-p2="edit-program" data-id="'+H(p.id)+'">تعديل</button></div>'+
 '<p><b>المدربون:</b> '+H(a.trainers.map(member).join('، ')||'غير محددين')+'</p>'+
 '<p><b>الأمن والسلامة:</b> '+H(a.safety?(a.safetyWhy||'مطلوب — السبب غير موثق'):'غير مطلوب')+'</p>'+
 '<p><b>المساحة الخارجية:</b> '+H(a.outdoor?(a.outdoorWhy||'مطلوبة — السبب غير موثق'):'غير مطلوبة')+'</p></article>'}).join('')+'</div>'+
 (!items().length?'<div class="card">لا توجد برامج مختارة.</div>':'');
}
function requirementsPage(){
 return '<div class="p2-heading"><div><h2>المتطلبات التشغيلية</h2><p>إضافة وتعديل وحذف المتطلبات، مع عرض البرامج المرتبطة والأعداد.</p></div><button class="primary" data-p2="add-requirement">+ إضافة متطلب تشغيلي</button></div>'+
 '<div class="p2-grid">'+requirements().map(r=>'<article class="p2-card"><div class="p2-card-header"><h3>'+H(r.name)+'</h3><span class="pill '+(r.status==='ready'?'good':'line')+'">'+(r.status==='ready'?'جاهز':'قيد التجهيز')+'</span></div>'+
 '<p><b>البرامج:</b> '+H(labelIds(r.linked))+'</p><p><b>الكمية:</b> '+N(r.quantity)+' '+H(r.unit)+' · <b>المسؤول:</b> '+H(r.owner||'غير محدد')+'</p>'+
 '<p><b>التفاصيل:</b> '+H(r.details||'لم تُحدد')+'</p><div class="p2-actions"><button data-p2="edit-requirement" data-id="'+H(r.id)+'">تعديل</button><button data-p2="delete-requirement" data-id="'+H(r.id)+'">'+(r.derived?'استبعاد':'حذف')+'</button></div></article>').join('')+'</div>'+
 (db().hidden.length?'<div class="card spacer"><b>متطلبات مستبعدة يمكن استعادتها:</b> '+db().hidden.map(id=>'<button data-p2="restore" data-id="'+H(id)+'">'+H(codes[id]||id)+'</button>').join(' ')+'</div>':'');
}
function transportPage(){
 return '<div class="p2-heading"><div><h2>النقل والمشاركون</h2><p>ربط وسائل النقل بالبرامج والطلاب، مع متابعة السعة والوجهة والمسؤول.</p></div><button class="primary" data-p2="add-transport">+ إضافة نقل</button></div>'+
 '<div class="p2-grid">'+db().transport.map(t=>'<article class="p2-card"><div class="p2-card-header"><h3>'+H(t.name)+'</h3><span class="pill">'+N(t.seats)+' مقعدًا</span></div>'+
 '<p><b>الوجهة:</b> '+H(t.destination)+' · <b>المسؤول:</b> '+H(t.owner)+'</p><p><b>البرامج:</b> '+H(labelIds(t.linked))+'</p>'+
 '<p><b>المشاركون:</b> '+H((t.studentIds||[]).map(id=>S.students.find(x=>String(x.id)===id)?.ar||'غير موجود').join('، ')||'لم يُحددوا')+'</p>'+
 '<p><b>الإجمالي المتوقع:</b> '+N(t.passengers)+'</p><div class="p2-actions"><button data-p2="edit-transport" data-id="'+H(t.id)+'">تعديل</button><button data-p2="delete-transport" data-id="'+H(t.id)+'">حذف</button></div></article>').join('')+'</div>';
}
function auditPage(){
 const x=selectedChecks(),done=x.length===0&&items().length>0;
 return '<div class="p2-heading"><div><h2>التدقيق التشغيلي المستقل</h2><p>مراجعة المتطلبات الفعلية، دون الخلط مع زر فحص اكتمال خطة البرامج.</p></div><button class="primary" data-p2="approve-audit" '+(done&&canEdit()?'':'disabled')+'>توثيق التدقيق</button></div>'+
 '<div class="p2-audit"><b>'+(x.length?x.length+' ملاحظة تحتاج معالجة':'لا توجد نواقص آلية ظاهرة')+'</b><p>التوثيق يحتاج تحققًا بشريًا قبل التنفيذ.</p>'+
 x.map((m,i)=>'<div class="p2-issue">'+(i+1)+'. '+H(m)+'</div>').join('')+
 (db().audit&&done?'<p><b>آخر تدقيق: </b>'+H(new Date(db().audit.at).toLocaleString('ar-SA'))+'</p>':'')+'</div>';
}
function modal(html){openModal('<div class="p2-modal">'+html+'</div>')}
function programModal(id){
 const a=info(id);return modal('<h2>'+H(name(id))+'</h2><h3>إسناد المدربين (اختيار متعدد)</h3><div class="p2-checks">'+staff().map(x=>'<label><input type="checkbox" data-p2-staff="'+H(x.id)+'" '+(a.trainers.includes(x.id)?'checked':'')+'>'+H(x.name)+'</label>').join('')+'</div>'+
 '<label class="p2-inline"><input type="checkbox" id="p2-safety" '+(a.safety?'checked':'')+'> يحتاج أمن وسلامة</label><label>سبب الحاجة والإجراءات<textarea id="p2-safetywhy" rows="2">'+H(a.safetyWhy)+'</textarea></label>'+
 '<label class="p2-inline"><input type="checkbox" id="p2-outdoor" '+(a.outdoor?'checked':'')+'> يحتاج مساحة خارجية</label><label>سبب المساحة وعدد المشاركين<textarea id="p2-outdoorwhy" rows="2">'+H(a.outdoorWhy)+'</textarea></label>'+
 '<div class="p2-actions"><button data-act="close">إلغاء</button><button class="primary" data-p2="save-program" data-id="'+H(id)+'">حفظ</button></div>');
}
function staffModal(){modal('<h2>إضافة مدرب / مشرف</h2><label>الاسم<input id="p2-staff-name" maxlength="100"></label><label>الدور<select id="p2-staff-role"><option>مدرب</option><option>مشرف ميداني</option><option>أمن وسلامة</option><option>مسؤول نقل</option></select></label><div class="p2-actions"><button data-act="close">إلغاء</button><button class="primary" data-p2="save-staff">إضافة</button></div>')}
function requirementModal(id){
 const r=requirements().find(x=>x.id===id)||{name:'',category:'general',quantity:1,unit:'متطلب',owner:'',details:'',reason:'',status:'pending',linked:[],derived:false};
 return modal('<h2>'+(id?'تعديل متطلب':'إضافة متطلب تشغيلي')+'</h2><div class="p2-form">'+
 '<label>اسم المتطلب<input id="p2-req-name" maxlength="100" value="'+H(r.name)+'" '+(r.derived?'readonly':'')+'></label>'+
 '<label>الفئة<select id="p2-req-cat">'+[['materials','أدوات ومطبوعات'],['safety','أمن وسلامة'],['transport','نقل'],['facilities','تجهيزات ومساحات'],['staff','كوادر'],['general','أخرى']].map(([k,v])=>'<option value="'+k+'" '+(r.category===k?'selected':'')+'>'+v+'</option>').join('')+'</select></label>'+
 '<label>الكمية<input type="number" id="p2-req-qty" min="1" value="'+N(r.quantity)+'"></label><label>الوحدة<input id="p2-req-unit" maxlength="30" value="'+H(r.unit)+'"></label>'+
 '<label>المسؤول<input id="p2-req-owner" maxlength="100" value="'+H(r.owner)+'"></label><label>الحالة<select id="p2-req-status"><option value="pending">قيد التجهيز</option><option value="ready" '+(r.status==='ready'?'selected':'')+'>جاهز</option></select></label>'+
 '<label class="full">التفاصيل<textarea id="p2-req-details" rows="2">'+H(r.details)+'</textarea></label><label class="full">سبب الاحتياج<textarea id="p2-req-reason" rows="2">'+H(r.reason)+'</textarea></label>'+
 '<div class="full"><b>البرامج المرتبطة</b>'+checkPrograms(r.linked)+'</div></div><div class="p2-actions"><button data-act="close">إلغاء</button><button class="primary" data-p2="save-requirement" data-id="'+H(id||'')+'">حفظ</button></div>');
}
function transportModal(id){
 const t=db().transport.find(x=>x.id===id)||{name:'',destination:'',owner:'',seats:0,passengers:0,linked:[],studentIds:[]};
 return modal('<h2>إضافة / تعديل النقل</h2><div class="p2-form"><label>اسم خدمة النقل<input id="p2-tr-name" value="'+H(t.name)+'"></label>'+
 '<label>الوجهة<input id="p2-tr-destination" value="'+H(t.destination)+'"></label><label>المقاعد<input type="number" min="1" id="p2-tr-seats" value="'+N(t.seats)+'"></label>'+
 '<label>عدد المشاركين المتوقع<input type="number" min="0" id="p2-tr-pass" value="'+N(t.passengers)+'"></label>'+
 '<label class="full">المسؤول<input id="p2-tr-owner" value="'+H(t.owner)+'"></label><div class="full"><b>البرامج المرتبطة</b>'+checkPrograms(t.linked)+'</div>'+
 '<div class="full"><b>الطلاب المرتبطون بالنقل</b><p class="help">الأسماء الحالية تجريبية</p><div class="p2-checks">'+S.students.map(st=>'<label><input type="checkbox" data-p2-student="'+H(st.id)+'" '+((t.studentIds||[]).includes(String(st.id))?'checked':'')+'>'+H(st.ar)+'</label>').join('')+'</div></div></div>'+
 '<div class="p2-actions"><button data-act="close">إلغاء</button><button class="primary" data-p2="save-transport" data-id="'+H(id||'')+'">حفظ</button></div>');
}
function act(b){
 const a=b.dataset.p2,id=b.dataset.id,d=db();
 if(a==='tab'){tab=b.dataset.value;render({preserveScroll:true});return}
 if(a==='back'){S.step=5;page='builder';save();render();return}
 if(!canEdit())return toast('التعديل غير متاح لهذا الدور');
 if(a==='add-staff')return staffModal();
 if(a==='edit-program')return programModal(id);
 if(a==='add-requirement'||a==='edit-requirement')return requirementModal(id);
 if(a==='add-transport'||a==='edit-transport')return transportModal(id);
 if(a==='save-staff'){
  const name=input('p2-staff-name').trim(),role=input('p2-staff-role');
  if(name.length<2||staff().some(x=>x.name===name))return toast('الاسم غير صالح أو موجود بالفعل');
  d.staff.push({id:newId('trainer-'),name,role});closeModal();persist();return;
 }
 if(a==='delete-staff'){
  if(Object.values(d.programs).some(p=>p.trainers.includes(id)))return toast('المدرب مرتبط ببرنامج، أزل الارتباط أولًا');
  if(confirm('حذف عضو الفريق؟')){d.staff=d.staff.filter(x=>x.id!==id);persist()}return;
 }
 if(a==='save-program'){
  const trainers=selected('data-p2-staff'),safety=document.getElementById('p2-safety').checked,outdoor=document.getElementById('p2-outdoor').checked;
  const safetyWhy=input('p2-safetywhy').trim(),outdoorWhy=input('p2-outdoorwhy').trim();
  if(safety&&!safetyWhy)return toast('أدخل سبب الحاجة للأمن والسلامة');
  if(outdoor&&!outdoorWhy)return toast('أدخل سبب الحاجة للمساحة الخارجية');
  d.programs[id]={trainers,safety,outdoor,safetyWhy,outdoorWhy};closeModal();persist();return;
 }
 if(a==='save-requirement'){
  const name=input('p2-req-name').trim(),quantity=N(input('p2-req-qty')),unit=input('p2-req-unit').trim(),owner=input('p2-req-owner').trim();
  const details=input('p2-req-details').trim(),reason=input('p2-req-reason').trim(),category=input('p2-req-cat'),status=input('p2-req-status'),linked=selected('data-p2-program');
  if(name.length<2||quantity<1||!unit)return toast('استكمل اسم المتطلب والكمية والوحدة');
  if(status==='ready'&&(!details||!owner))return toast('لا يمكن اعتبار المتطلب جاهزًا دون المسؤول والتفاصيل');
  const existing=requirements().find(x=>x.id===id),record={name,quantity,unit,owner,details,reason,category,status,linked};
  if(existing?.derived)d.overrides[id]=record;
  else if(existing)Object.assign(d.custom.find(x=>x.id===id),record);
  else d.custom.push({id:newId('manual-prep-'),...record});
  closeModal();persist();return;
 }
 if(a==='delete-requirement'){
  if(!confirm('حذف / استبعاد المتطلب؟'))return;
  const r=requirements().find(x=>x.id===id);
  if(r?.derived){if(!d.hidden.includes(id))d.hidden.push(id)}else d.custom=d.custom.filter(x=>x.id!==id);
  persist();return;
 }
 if(a==='restore'){d.hidden=d.hidden.filter(x=>x!==id);persist();return}
 if(a==='save-transport'){
  const name=input('p2-tr-name').trim(),destination=input('p2-tr-destination').trim(),owner=input('p2-tr-owner').trim(),seats=N(input('p2-tr-seats')),passengers=N(input('p2-tr-pass'));
  const linked=selected('data-p2-program'),studentIds=selected('data-p2-student');
  if(!name||!destination||!owner||!seats||!linked.length)return toast('أكمل بيانات النقل والبرامج');
  if(passengers>seats||studentIds.length>seats)return toast('عدد المشاركين يتجاوز سعة النقل');
  const rec={name,destination,owner,seats,passengers,linked,studentIds},old=d.transport.find(t=>t.id===id);
  if(old)Object.assign(old,rec);else d.transport.push({id:newId('bus-'),...rec});
  closeModal();persist();return;
 }
 if(a==='delete-transport'){if(confirm('حذف النقل؟')){d.transport=d.transport.filter(t=>t.id!==id);persist()}return}
 if(a==='approve-audit'){
  if(selectedChecks().length||!items().length)return toast('يجب معالجة ملاحظات الجاهزية أولًا');
  d.audit={at:Date.now(),role:S.role};save();render({preserveScroll:true});toast('تم توثيق التدقيق');
 }
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-p2]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();act(b)},true);
NAV[2][1].push(['operations','الجاهزية ومتطلبات التشغيل','Operational readiness']);
PAGE_TITLES.operations=['الجاهزية ومتطلبات التشغيل','Operational readiness'];
PAGES.operations=page;
if(location.hash==='#operations')page='operations';
render({preserveScroll:true});
})();