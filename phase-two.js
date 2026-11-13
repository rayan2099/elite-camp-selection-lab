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
 d.staff??=[];d.programs??={};d.custom??=[];d.overrides??={};d.hidden??=[];d.transport??=[];d.assignmentDetails??={};d.activityAssignments??={};d.customDuties??=[];
 if(!d.migrated){(S.prep.__manual||[]).forEach(r=>d.custom.push({id:r.id,name:r.name,category:'general',linked:[],owner:S.prep[r.id]?.owner||'',quantity:1,unit:'متطلب',details:'',reason:'',status:S.prep[r.id]?.done?'ready':'pending'}));d.migrated=true;}
 return d;
}
const staff=()=>{const base=typeof window.campCateringTeamMembers==='function'?window.campCateringTeamMembers():(S.prep.__catering?.team||[]);
 const all=[...base];db().staff.forEach(m=>{const i=all.findIndex(x=>x.id===m.id);if(i>=0)all[i]={...all[i],...m};else all.push(m)});return all;};
const member=id=>staff().find(x=>x.id===id)?.name||'غير محدد';
const info=id=>{const x=ITEM(id),d=db();return {trainers:[],safety:x?.need.includes('safety')||false,outdoor:x?.need.includes('outdoor')||false,safetyWhy:'',outdoorWhy:'',...(d.programs[id]||{})}};
const related=k=>items().filter(p=>ITEM(p.id).need.includes(k)).map(x=>x.id);
function requirements(){
 const d=db(),set=[...new Set(items().flatMap(x=>ITEM(x.id).need))];
 return [...set.filter(k=>!d.hidden.includes(k)).map(k=>({id:k,name:codes[k]||k,category:k,linked:related(k),quantity:1,unit:'متطلب',owner:'',details:'',reason:'',status:'pending',derived:true,...(d.overrides[k]||{})})),...d.custom.map(x=>({...x,derived:false}))];
}
const labelIds=ids=>(ids||[]).map(name).join('، ')||'لم تُحدد برامج';
const checkPrograms=selected=>'<div class="p2-program-picker"><div class="p2-program-toolbar"><input type="search" data-p2-program-search placeholder="ابحث عن برنامج..." aria-label="البحث عن البرامج"><button type="button" data-p2-tool="clear-programs">إلغاء التحديد</button></div><div class="p2-checks p2-program-options">'+items().map(x=>'<label data-program-title="'+H(name(x.id).toLowerCase())+'"><input type="checkbox" data-p2-program="'+H(x.id)+'" '+((selected||[]).includes(x.id)?'checked':'')+'>'+H(name(x.id))+'</label>').join('')+'</div><small class="p2-program-count">'+(selected||[]).length+' برنامج محدد</small></div>';
const selected=attr=>[...document.querySelectorAll('['+attr+']:checked')].map(e=>e.getAttribute(attr));
const input=id=>document.getElementById(id)?.value||'';
const selectedChecks=()=>{const d=db(),errors=assignmentIssues();d.hidden.forEach(k=>{if(related(k).length)errors.push('متطلب أساسي مستبعد رغم ارتباطه ببرنامج: '+(codes[k]||k))});if(related('transport').length&&!d.transport.length)errors.push('توجد برامج تحتاج نقلًا دون إعداد رحلة أو وسيلة نقل');items().forEach(p=>{const a=info(p.id);if(!a.trainers.length)errors.push('لم يحدد مدرب: '+name(p.id));if(a.trainers.some(id=>!staff().some(x=>x.id===id)))errors.push('مدرب غير موجود: '+name(p.id));if(a.safety&&!a.safetyWhy.trim())errors.push('سبب الأمن والسلامة ناقص: '+name(p.id));if(a.outdoor&&!a.outdoorWhy.trim())errors.push('سبب المساحة الخارجية ناقص: '+name(p.id))});requirements().forEach(r=>{if(!r.owner?.trim())errors.push('المسؤول غير محدد: '+r.name);if(!r.details?.trim())errors.push('تفاصيل ناقصة: '+r.name);if(r.status!=='ready')errors.push('المتطلب غير مكتمل: '+r.name);if(['materials','safety','transport'].includes(r.category)&&!r.linked.length)errors.push('غير مرتبط ببرنامج: '+r.name)});d.transport.forEach(t=>{if(!t.linked?.length||!t.owner||N(t.seats)<1)errors.push('بيانات نقل ناقصة: '+t.name);if(N(t.passengers)>N(t.seats))errors.push('سعة النقل أقل من عدد المشاركين: '+t.name);if((t.studentIds||[]).length>N(t.seats))errors.push('عدد الطلاب المحددين يتجاوز السعة: '+t.name)});return errors};
function assignmentIssues(){
 const result=[],d=db();
 for(const p of items()){
  const infoP=info(p.id);
  for(const id of infoP.trainers||[]){
   const memberData=staff().find(m=>m.id===id);
   if(memberData?.active===false)result.push('عضو غير نشط مكلف بالبرنامج: '+name(p.id));
   const detail=d.assignmentDetails?.[id]?.[p.id];
   if(detail){
    const days=p2ProgramDays(p);
    if(!detail.days?.length||detail.days.some(n=>!days.includes(Number(n))))result.push('أيام تكليف غير متطابقة: '+name(p.id)+' · '+(memberData?.name||id));
   }
  }
 }
 for(const [staffId,slots] of Object.entries(d.activityAssignments||{})){
   if(!staff().some(x=>x.id===staffId))result.push('تكليف نشاط لعضو غير موجود ضمن فريق المعسكر');
   const seen=new Set();
   for(const key of slots||[]){
    if(seen.has(key))result.push('نشاط مكرر في تكليف العضو: '+staffId);seen.add(key);
    const [day,index]=key.split(':').map(Number);
    if(!Number.isInteger(day)||day<1||day>S.meta.days.length||!Number.isInteger(index)||index<0||index>=DAY_TEMPLATE.length)
       result.push('نشاط غير صالح أو يوم خارج المعسكر لدى: '+staffId);
   }
 }
 return result;
}
const persist=()=>{db().audit=null;save();render({preserveScroll:true})};
function pageOperations(){
 const d=db(),pg=items(),req=requirements(),ext=pg.filter(p=>info(p.id).outdoor).length,safe=pg.filter(p=>info(p.id).safety).length,errors=selectedChecks();
 return '<div class="p2-workspace"><div class="p2-hero"><div><div class="eyebrow">المرحلة الثانية · التشغيل</div><h1>جاهزية المعسكر ومتطلبات التشغيل</h1><p>توزيع الكوادر، الأمن والسلامة، المساحات، الأدوات، النقل، والمتابعة التنفيذية.</p></div><div class="p2-actions"><button data-p2="back">العودة إلى الجدول</button><button class="primary" data-p2="tab" data-value="audit">تدقيق الجاهزية</button></div></div>'+
 '<div class="p2-metrics"><div><small>البرامج</small><b>'+pg.length+'</b></div><div><small>تحتاج أمن وسلامة</small><b>'+safe+'</b></div><div><small>تحتاج مساحة خارجية</small><b>'+ext+'</b><small>بحسب البرامج المختارة</small></div><div><small>المتطلبات</small><b>'+req.length+'</b></div><div><small>ملاحظات التدقيق</small><b>'+errors.length+'</b></div></div>'+
 '<nav class="p2-tabs">'+[['programs','البرامج والمدربون'],['team','الفريق والصلاحيات'],['requirements','المتطلبات التشغيلية'],['transport','النقل والمشاركون'],['audit','تدقيق الجاهزية']].map(([key,text])=>'<button data-p2="tab" data-value="'+key+'" class="'+(tab===key?'active':'')+'">'+text+'</button>').join('')+'</nav>'+
 (tab==='programs'?programsPage():tab==='team'?teamPage():tab==='requirements'?requirementsPage():tab==='transport'?transportPage():auditPage())+
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

const p2RoleOptions=["مدرب","مشرف ميداني","مشرف التوزيع","مسؤول أمن وسلامة","مسؤول نقل","مسؤول تجهيزات","مسؤول التغذية","قائد برامج","مدير معسكر","مرافق","سائق"];
const p2Permissions=[["schedule","عرض جداول البرامج"],["activities","تسجيل تنفيذ الأنشطة"],["attendance","متابعة الحضور"],["safety","تسجيل بلاغات السلامة"],["resources","متابعة التجهيزات"],["transport","متابعة النقل"],["meals","متابعة الوجبات"],["reports","رفع التقارير"]];
const p2RoleDefaults={"مدرب":{"duties":["teach","reports"],"permissions":["schedule","activities","reports"]},"مشرف ميداني":{"duties":["supervise","reports"],"permissions":["schedule","attendance","activities","safety","reports"]},"مسؤول أمن وسلامة":{"duties":["safety","reports"],"permissions":["schedule","safety","reports"]},"مسؤول نقل":{"duties":["transport"],"permissions":["schedule","transport"]},"مسؤول تجهيزات":{"duties":["materials"],"permissions":["schedule","resources"]},"مسؤول التغذية":{"duties":["meals"],"permissions":["schedule","meals"]}};
const p2Duties=[["teach","تقديم البرامج"],["supervise","الإشراف على الطلاب"],["safety","متابعة السلامة"],["materials","تجهيز الأدوات"],["transport","مرافقة النقل"],["meals","استلام الوجبات"],["reports","تسليم التقرير اليومي"]];
const p2AllDuties=()=>[...p2Duties,...db().customDuties.map(x=>[x.id,x.name])];
const p2DutyAdmin=()=>can('select');
function p2DutyOptions(checked){
 return '<div id="p2-duty-list" class="p2-checks p2-duty-list">'+p2AllDuties().map(([key,label])=>
 '<div class="p2-duty-item"><label><input type="checkbox" data-p2-duty="'+H(key)+'" '+((checked||[]).includes(key)?'checked':'')+'>'+H(label)+'</label>'+
 (db().customDuties.some(x=>x.id===key)&&p2DutyAdmin()?'<div class="p2-duty-controls"><button type="button" data-p2-duty-action="edit" data-id="'+H(key)+'" title="تعديل المسؤولية">تعديل</button><button type="button" data-p2-duty-action="delete" data-id="'+H(key)+'" title="حذف المسؤولية">حذف</button></div>':'')+'</div>').join('')+'</div>';
}
function p2RefreshDutyOptions(){
 const box=document.getElementById('p2-duty-list');if(!box)return;
 const selectedKeys=[...box.querySelectorAll('[data-p2-duty]:checked')].map(x=>x.getAttribute('data-p2-duty'));
 const outer=document.createElement('div');outer.innerHTML=p2DutyOptions(selectedKeys);
 box.replaceWith(outer.firstElementChild);
}

const p2AssignmentRoles=[['lead','مدرب رئيسي'],['assistant','مدرب مساعد'],['supervisor','مشرف متابعة'],['support','مساندة تشغيلية']];
const p2AssignmentStates=[['planned','مخطط'],['confirmed','مؤكد'],['completed','تم التنفيذ']];
const p2CampTeams=()=>{const available=typeof TEAMS!=='undefined'?TEAMS:[];
 const configured=Array.isArray(S.meta?.teamList)?S.meta.teamList:[];
 return (configured.length?configured:available).slice(0,Math.max(0,Number(S.meta?.teams)||configured.length||available.length)).map(x=>({id:String(x.id),name:x.ar||x.name||x.en||'فريق'}));
};
const p2TeamLabels=ids=>(ids||[]).map(id=>p2CampTeams().find(x=>x.id===String(id))?.name).filter(Boolean).join('، ')||'جميع الفرق';

const p2ProgramDays=p=>{
 const all=S.meta?.days||[];
 const days=Array.isArray(p.days)&&p.days.length?p.days:(p.day?[p.day]:[]);
 const unique=[...new Set(days.map(Number).filter(n=>n>=1&&n<=all.length))];
 return unique.length?unique:all.map((_,i)=>i+1);
};
const p2FixedKey=(day,index)=>day+':'+index;
const p2FixedAssignments=staffId=>db().activityAssignments?.[staffId]||[];
const p2Details=(staffId,programId)=>db().assignmentDetails?.[staffId]?.[programId]||{};
const p2AssignedDays=(staffId,p)=>{const available=p2ProgramDays(p),detail=p2Details(staffId,p.id);
 return Array.isArray(detail.days)&&detail.days.length?detail.days.map(Number).filter(d=>available.includes(d)):available;
};
const p2AssignmentRows=(staffId,chosen)=>{
 const selectedIds=new Set(chosen||[]);
 return items().map(p=>{
   const selected=selectedIds.has(p.id),detail=p2Details(staffId,p.id),days=p2ProgramDays(p);
   const chosenDays=selected?p2AssignedDays(staffId,p):[];
   return '<article class="p2-assignment" data-p2-assignment="'+H(p.id)+'" data-program-title="'+H(name(p.id).toLowerCase())+'">'+
    '<label class="p2-assignment-select"><input type="checkbox" data-p2-program="'+H(p.id)+'" '+(selected?'checked':'')+'><span><b>'+H(name(p.id))+'</b><small>الأيام المخصصة للبرنامج: '+H(days.map(d=>'اليوم '+d).join('، '))+'</small></span></label>'+
    '<div class="p2-assignment-details" '+(selected?'':'hidden')+'><div class="p2-assignment-columns">'+
    '<label>طبيعة التكليف<select data-p2-role="'+H(p.id)+'">'+p2AssignmentRoles.map(([key,label])=>'<option value="'+key+'" '+((detail.role||'lead')===key?'selected':'')+'>'+label+'</option>').join('')+'</select></label>'+
    '<label>حالة التكليف<select data-p2-state="'+H(p.id)+'">'+p2AssignmentStates.map(([key,label])=>'<option value="'+key+'" '+((detail.status||'planned')===key?'selected':'')+'>'+label+'</option>').join('')+'</select></label></div>'+
    '<div class="p2-assignment-days"><b>أيام مشاركة العضو</b><div class="p2-assignment-day-options">'+days.map(d=>'<label><input type="checkbox" data-p2-day="'+H(p.id)+'" value="'+d+'" '+(chosenDays.includes(d)?'checked':'')+'> اليوم '+d+'</label>').join('')+'</div></div>'+
 '<div class="p2-assignment-teams"><div class="p2-assignment-teamhead"><b>الفرق المكلف بها في هذا البرنامج</b><small>اختياري · عدم التحديد يعني جميع الفرق</small></div><div class="p2-assignment-team-options">'+p2CampTeams().map(team=>'<label><input type="checkbox" data-p2-assignment-team="'+H(p.id)+'" value="'+H(team.id)+'" '+((detail.teamIds||[]).map(String).includes(team.id)?'checked':'')+'>'+H(team.name)+'</label>').join('')+'</div></div>'+
    '<label class="p2-assignment-note">مهمة العضو في البرنامج<input data-p2-note="'+H(p.id)+'" maxlength="200" value="'+H(detail.note||'')+'" placeholder="مثال: قيادة النشاط، تقييم المشاركين أو تجهيز الأدوات"></label></div>'+
    '</article>';
 }).join('');
};

function p2SchedulePrograms(day){
 const dayPrograms=items().filter(p=>p2ProgramDays(p).includes(day));
 const eligible=new Set(dayPrograms.map(p=>p.id)),placed=new Set(),rows=[];
 const source=typeof slotMap==='function'?slotMap(day):{};
 const template=typeof DAY_TEMPLATE!=='undefined'?DAY_TEMPLATE:[];
 for(let index=0;index<template.length;index++){
  const row=typeof scheduleRow==='function'?scheduleRow(day,index):template[index];
  const ids=row.slot?(source[row.slot]||[]).map(o=>o.x?.id||o.id):[];
  const shown=ids.filter(id=>eligible.has(id)&&!placed.has(id));shown.forEach(id=>placed.add(id));
  rows.push({time:row.t||'',title:row.ar||'فترة',ids:shown,index,fixed:!row.slot,custom:!!(row.slot&&typeof slotHasCustomActivity==='function'&&slotHasCustomActivity(day,index))});
 }
 return {rows,unplaced:dayPrograms.filter(p=>!placed.has(p.id))};
}
function p2ScheduleAssignmentWidget(staffId){
 const all=S.meta?.days||[],assigned=new Set(staffId?p2StaffPrograms(staffId):[]),fixedAssigned=new Set(staffId?p2FixedAssignments(staffId):[]);
 const blocks=all.map((dayObj,index)=>{
  const day=index+1,schedule=p2SchedulePrograms(day);
  const entry=(id,time)=>{
   const p=items().find(x=>x.id===id);if(!p)return '';
   const active=assigned.has(id)&&p2AssignedDays(staffId,p).includes(day);
   return '<div class="p2-sched-program"><div><b>'+H(name(id))+'</b><small>'+H(time||'الوقت غير محدد')+'</small></div>'+
    '<div class="p2-sched-actions"><label class="p2-bulk-pick"><input type="checkbox" data-p2-bulk-choice data-p2-bulk-type="program" data-p2-id="'+H(id)+'" data-p2-num="'+day+'"><span>تحديد</span></label><button type="button" data-p2-assign-day="'+H(id)+'" data-p2-assign-num="'+day+'" aria-pressed="'+active+'" class="'+(active?'assigned':'')+'">'+(active?'✓ مكلف':'+ إسناد')+'</button></div></div>';
  };
  const fixedEntry=r=>{const key=p2FixedKey(day,r.index),active=fixedAssigned.has(key);
   return '<div class="p2-sched-program p2-fixed-entry"><div><b>'+H(r.title)+'</b><small>نشاط تشغيلي · '+H(r.time||'الوقت غير محدد')+'</small></div><div class="p2-sched-actions"><label class="p2-bulk-pick"><input type="checkbox" data-p2-bulk-choice data-p2-bulk-type="fixed" data-p2-id="'+H(key)+'" data-p2-num="'+day+'"><span>تحديد</span></label><button type="button" data-p2-fixed="'+H(key)+'" aria-pressed="'+active+'" class="'+(active?'assigned':'')+'">'+(active?'✓ مكلف':'+ إسناد')+'</button></div></div>';};
  return '<section class="p2-schedule-day" data-p2-day-panel="'+day+'" '+(index?'hidden':'')+'>'+
   '<div class="p2-schedule-daytitle"><h5>اليوم '+day+' · '+H(L(dayObj))+'</h5><small>اضغط إسناد بجانب النشاط لتكليف العضو</small></div>'+
   '<div class="p2-schedule-rows">'+schedule.rows.map(r=>'<div class="p2-schedule-row '+(r.ids.length?'with-program':'')+'"><time dir="ltr">'+H(r.time)+'</time><div class="p2-schedule-activity"><span>'+H(r.title)+'</span>'+
     (r.ids.length?r.ids.map(id=>entry(id,r.time)).join(''):(r.fixed||r.custom)?fixedEntry(r):'<small>لا يوجد نشاط محدد في هذه الفترة</small>')+'</div></div>').join('')+'</div>'+
   (schedule.unplaced.length?'<div class="p2-schedule-unplaced"><b>برامج مرتبطة باليوم دون وقت محدد</b>'+schedule.unplaced.map(p=>entry(p.id,'لم يحدد الوقت بعد')).join('')+'</div>':'')+
   '</section>';
 }).join('');
 return '<div class="p2-schedule-box"><div class="p2-schedule-top"><h4>جدول المعسكر · إسناد مباشر</h4><p>مستمد من خطة المعسكر الحالية. اختر اليوم ثم اضغط إسناد بجانب البرنامج.</p></div>'+
 '<div class="p2-schedule-day-tabs">'+all.map((d,i)=>'<button type="button" data-p2-daytab="'+(i+1)+'" class="'+(i===0?'active':'')+'">اليوم '+(i+1)+'</button>').join('')+'</div>'+
 '<div class="p2-schedule-bulk"><div><b id="p2-bulk-count">لم تحدد أنشطة للإسناد الجماعي</b><small>حدد عدة أنشطة من يوم واحد أو أكثر، ثم اسندها دفعة واحدة.</small></div><div class="p2-schedule-bulk-actions"><button type="button" data-p2-bulk="select-day">تحديد أنشطة اليوم</button><button type="button" class="primary" data-p2-bulk="assign">إسناد المحدد</button><button type="button" data-p2-bulk="unassign">إلغاء إسناد المحدد</button><button type="button" data-p2-bulk="clear">مسح الاختيار</button></div></div><div class="p2-schedule-panels">'+blocks+'</div><div class="p2-schedule-live" id="p2-schedule-live" aria-live="polite"></div></div>';
}
function p2SyncScheduleButtons(id,day,active){
 document.querySelectorAll('[data-p2-assign-day]').forEach(b=>{
  if(b.getAttribute('data-p2-assign-day')!==id||Number(b.getAttribute('data-p2-assign-num'))!==day)return;
  b.setAttribute('aria-pressed',String(active));b.classList.toggle('assigned',active);b.textContent=active?'✓ مكلف':'+ إسناد';
 });
}
function p2UpdateAssignmentSummary(){
 const count=document.querySelectorAll('.p2-assignment-select input[data-p2-program]:checked').length;
 const node=document.getElementById('p2-assignment-count');if(node)node.textContent=count+' برنامج';
 const fixedCount=document.querySelectorAll('[data-p2-fixed][aria-pressed="true"]').length;
 const live=document.getElementById('p2-schedule-live');
 if(live)live.textContent='تم إسناد '+count+' برامج و'+fixedCount+' أنشطة تشغيلية. احفظ بيانات العضو لتثبيت التكليفات.';
}
function p2AssignmentsWidget(staffId){
 const assigned=staffId?p2StaffPrograms(staffId):[];
 return '<div class="p2-assignment-widget"><div class="p2-assignment-summary"><div><h4>البرامج المرتبطة بهذا العضو</h4><p>حدد البرنامج، ثم دوره وأيام مشاركته ومهمته وحالة التكليف.</p></div><span id="p2-assignment-count">'+assigned.length+' برنامج</span></div>'+
 p2ScheduleAssignmentWidget(staffId)+
 '<details class="p2-assignment-advanced"><summary>تفاصيل التكليفات: الأدوار والمهام والحالة</summary><div class="p2-program-toolbar"><input type="search" data-p2-assignment-search placeholder="بحث باسم البرنامج"><button type="button" data-p2-tool="clear-assignments">إلغاء الاختيار</button></div>'+
 '<div class="p2-assignment-list">'+(items().length?p2AssignmentRows(staffId,assigned):'<div class="p2-assignment-empty">لا توجد برامج معتمدة في خطة المعسكر. أضفها من تخطيط البرامج أولًا.</div>')+'</div></details></div>';
}
function p2ReadAssignments(){
 const ids=selected('data-p2-program'),result={},valid=[];
 for(const id of ids){
   const p=items().find(x=>x.id===id);if(!p)continue;
   const validDays=p2ProgramDays(p),days=[...document.querySelectorAll('[data-p2-day]:checked')].filter(el=>el.getAttribute('data-p2-day')===id).map(el=>Number(el.value)).filter(n=>validDays.includes(n));
   if(!days.length)return {error:'حدد يوم مشاركة واحدًا على الأقل في البرنامج: '+name(id)};
   const role=document.querySelector('[data-p2-role="'+id+'"]')?.value||'lead';
   const status=document.querySelector('[data-p2-state="'+id+'"]')?.value||'planned';
   if(!p2AssignmentRoles.some(x=>x[0]===role)||!p2AssignmentStates.some(x=>x[0]===status))return {error:'تفاصيل تكليف غير صالحة: '+name(id)};
   const validTeams=new Set(p2CampTeams().map(t=>t.id));
   const teamIds=[...document.querySelectorAll('[data-p2-assignment-team]:checked')].filter(el=>el.getAttribute('data-p2-assignment-team')===id).map(el=>String(el.value)).filter(t=>validTeams.has(t));
   result[id]={role,status,days:[...new Set(days)],teamIds:[...new Set(teamIds)],note:(document.querySelector('[data-p2-note="'+id+'"]')?.value||'').trim()};
   valid.push(id);
 }
 return {ids:valid,details:result};
}
const p2StaffPrograms=id=>items().filter(p=>info(p.id).trainers.includes(id)).map(p=>p.id);
const p2Checks=(attr,values,options)=>'<div class="p2-checks">'+options.map(([id,label])=>'<label><input type="checkbox" '+attr+'="'+H(id)+'" '+((values||[]).includes(id)?'checked':'')+'>'+H(label)+'</label>').join('')+'</div>';
function teamPage(){
 const all=staff(),local=db().staff;
 return '<div class="p2-heading"><div><h2>الفريق والصلاحيات والمسؤوليات</h2><p>سجل تفصيلي يربط الأعضاء بالبرامج والمهام والصلاحيات التشغيلية.</p></div><button class="primary" data-p2="add-staff">+ إضافة عضو</button></div>'+
 '<div class="card p2-notice">الصلاحيات المعروضة تكليفات تشغيلية للتخطيط، ولا تمنح حساب دخول أو تفويضًا تقنيًا داخل النظام.</div>'+
 '<div class="p2-grid">'+all.map(x=>'<article class="p2-card"><div class="p2-card-header"><h3>'+H(x.name)+'</h3><span class="pill">'+H(x.role||'عضو فريق')+'</span></div>'+
 '<p><b>البرامج والتكليفات:</b> '+(p2StaffPrograms(x.id).length?p2StaffPrograms(x.id).map(pid=>{const d=p2Details(x.id,pid),p=items().find(p=>p.id===pid);return '<span class="p2-assignment-tag">'+H(name(pid))+' · '+H(p2AssignmentRoles.find(r=>r[0]===d.role)?.[1]||'مدرب')+' · '+H(p2AssignedDays(x.id,p).map(n=>'يوم '+n).join('، '))+' · '+H(p2TeamLabels(d.teamIds))+'</span>'}).join(''):'لم تحدد')+'</p>'+
 '<p><b>المسؤوليات:</b> '+H(p2AllDuties().filter(a=>(x.duties||[]).includes(a[0])).map(a=>a[1]).join('، ')||'لم تحدد')+'</p>'+
 '<p><b>الصلاحيات التشغيلية:</b> '+H(p2Permissions.filter(a=>(x.permissions||[]).includes(a[0])).map(a=>a[1]).join('، ')||'لم تحدد')+'</p>'+
 '<p><b>الأنشطة التشغيلية:</b> '+H((db().activityAssignments?.[x.id]||[]).map(key=>{const [day,index]=key.split(':').map(Number);const r=typeof scheduleRow==='function'?scheduleRow(day,index):null;return r?'اليوم '+day+' · '+r.ar:'نشاط غير متاح'}).join('، ')||'لا يوجد')+'</p>'+
 '<p><b>حالة العضو:</b> '+(x.active===false?'غير نشط':'نشط')+'</p>'+
 ('<div class="p2-actions"><button data-p2="edit-staff" data-id="'+H(x.id)+'">تعديل البيانات والتكليفات</button><button data-p2="delete-staff" data-id="'+H(x.id)+'">حذف</button></div>')+
 '</article>').join('')+'</div>';
}
function staffModal(id){
 p2EditingDuty=null;
 const p=staff().find(x=>x.id===id)||{name:'',role:'مدرب',permissions:[],duties:[],active:true,notes:'',shift:'',contact:''};
 modal('<h2>'+(id?'تعديل عضو الفريق':'إضافة مدرب / مشرف')+'</h2><p class="help">حدد تفاصيل التكليف وليس الاسم والدور فقط.</p><div class="p2-form">'+
 '<label>الاسم<input id="p2-staff-name" maxlength="100" value="'+H(p.name)+'"></label>'+
 '<label>الدور<select id="p2-staff-role">'+p2RoleOptions.map(r=>'<option '+(r===p.role?'selected':'')+'>'+H(r)+'</option>').join('')+'</select></label>'+
 '<label>التواصل<input id="p2-staff-contact" maxlength="80" value="'+H(p.contact||'')+'"></label>'+
 '<label>فترة العمل<input id="p2-staff-shift" maxlength="100" value="'+H(p.shift||'')+'"></label>'+
 '<label class="full">تعليمات التكليف<textarea id="p2-staff-notes" rows="2">'+H(p.notes||'')+'</textarea></label>'+
 '<div class="full p2-duties-section"><div class="p2-member-section-head"><h3>المسؤوليات</h3><button type="button" data-p2-tool="suggest-role">اقتراح حسب الدور</button></div>'+
 p2DutyOptions(p.duties)+
 (p2DutyAdmin()?'<div class="p2-add-duty"><label for="p2-duty-name">مسؤولية مخصصة جديدة</label><div class="p2-add-duty-row"><input id="p2-duty-name" type="text" maxlength="100" placeholder="مثال: الإشراف على تجهيز الرحلات"><button type="button" data-p2-duty-action="save" class="primary" id="p2-duty-save">+ إضافة مسؤولية</button><button type="button" data-p2-duty-action="cancel" id="p2-duty-cancel" hidden>إلغاء التعديل</button></div><small>تُضاف المسؤولية إلى مكتبة المعسكر لتكون متاحة لجميع أعضاء الفريق.</small></div>':'')+'</div>'+
 '<div class="full"><h3>الصلاحيات التشغيلية</h3><p class="help">توثيق فقط، وليس تفويضًا للدخول.</p>'+p2Checks('data-p2-permission',p.permissions,p2Permissions)+'</div>'+
 '<div class="full">'+p2AssignmentsWidget(id)+'</div>'+
 '<label class="full p2-inline"><input type="checkbox" id="p2-staff-active" '+(p.active===false?'':'checked')+'> نشط</label></div>'+
 '<div class="p2-actions"><button data-act="close">إلغاء</button><button class="primary" data-p2="save-staff" data-id="'+H(id||'')+'">حفظ بيانات العضو</button></div>');
}
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
 if(a==='edit-staff')return staffModal(id);
 if(a==='edit-program')return programModal(id);
 if(a==='add-requirement'||a==='edit-requirement')return requirementModal(id);
 if(a==='add-transport'||a==='edit-transport')return transportModal(id);

 if(a==='save-staff'){
  const person=db().staff.find(x=>x.id===id),name=input('p2-staff-name').trim(),role=input('p2-staff-role');
  if(name.length<2||staff().some(x=>x.name===name&&x.id!==id))return toast('تحقق من الاسم أو التكرار');
  const assignment=p2ReadAssignments();if(assignment.error)return toast(assignment.error);
  const fixedKeys=[...document.querySelectorAll('[data-p2-fixed][aria-pressed="true"]')].map(b=>b.getAttribute('data-p2-fixed'));
  const conflicts=p2DetectAssignmentConflicts(assignment,fixedKeys);
  if(conflicts.length&&!confirm('تنبيه: توجد أنشطة متزامنة لهذا العضو:\n'+conflicts.slice(0,5).join('\n')+'\nهل تريد حفظ التكليف رغم التعارض؟'))return;
  const linked=assignment.ids,active=document.getElementById('p2-staff-active').checked;
  if(!active&&linked.length)return toast('لا يمكن إسناد برامج لعضو غير نشط');
  const staffId=person?.id||id||newId('trainer-');
  const value={id:staffId,name,role,contact:input('p2-staff-contact').trim(),shift:input('p2-staff-shift').trim(),notes:input('p2-staff-notes').trim(),active,
    permissions:selected('data-p2-permission').filter(v=>p2Permissions.some(x=>x[0]===v)),
    duties:selected('data-p2-duty').filter(v=>p2AllDuties().some(x=>x[0]===v))};
  if(person)Object.assign(person,value);else d.staff.push(value);
  d.assignmentDetails[staffId]=assignment.details;
  d.activityAssignments[staffId]=fixedKeys;

  items().forEach(p=>{const old=info(p.id),trainers=new Set(old.trainers);if(linked.includes(p.id))trainers.add(staffId);else trainers.delete(staffId);d.programs[p.id]={...old,trainers:[...trainers]};});
  closeModal();persist();return;
 }
 if(a==='delete-staff'){
  if(Object.values(d.programs).some(p=>(p.trainers||[]).includes(id))||(d.activityAssignments?.[id]||[]).length)return toast('أزل البرامج والأنشطة المكلف بها العضو قبل حذفه');
  if((S.prep.__catering?.meals||[]).some(m=>m.supervisorId===id))return toast('هذا العضو مسؤول عن وجبات. غيّر مسؤول الوجبات قبل حذفه.');
  if(!staff().some(m=>m.id===id))return toast('العضو غير موجود.');
  if(confirm('حذف العضو من فريق المعسكر؟')){
    d.staff=d.staff.filter(x=>x.id!==id);
    if(Array.isArray(S.prep.__catering?.team))S.prep.__catering.team=S.prep.__catering.team.filter(x=>x.id!==id);
    delete d.assignmentDetails[id];delete d.activityAssignments[id];
    persist();
  }return;
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

function p2DetectAssignmentConflicts(assignment,fixedKeys){
 const matches=[];
 const byDay=new Map();
 const add=(day,time,label)=>{
  const stamps=String(time||'').match(/\d{1,2}:\d{2}/g)||[];
  if(!stamps.length)return;
  const minutes=x=>{const parts=x.split(':').map(Number);return parts[0]*60+parts[1]};
  const start=minutes(stamps[0]),end=stamps[1]?minutes(stamps[1]):start+1;
  if(end<=start)return;
  if(!byDay.has(day))byDay.set(day,[]);
  byDay.get(day).push({start,end,label});
 };
 for(let day=1;day<=S.meta.days.length;day++){
  const schedule=p2SchedulePrograms(day);
  for(const row of schedule.rows){
   for(const programId of row.ids){
    if(assignment.details[programId]?.days.includes(day))add(day,row.time,name(programId));
   }
   if(fixedKeys.includes(p2FixedKey(day,row.index)))add(day,row.time,row.title);
  }
 }
 for(const [day,entries] of byDay){
  for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
   const a=entries[i],b=entries[j];
   if(a.start<b.end&&b.start<a.end)matches.push('اليوم '+day+': '+a.label+' و'+b.label);
  }
 }
 return [...new Set(matches)];
}
function p2SetActivity(id,day,active){
 if(id.includes(':')){
  const btn=[...document.querySelectorAll('[data-p2-fixed]')].find(x=>x.getAttribute('data-p2-fixed')===id);
  if(!btn)return;
  btn.setAttribute('aria-pressed',String(active));btn.classList.toggle('assigned',active);btn.textContent=active?'✓ مكلف':'+ إسناد';
 }else{
  const row=[...document.querySelectorAll('.p2-assignment')].find(r=>r.getAttribute('data-p2-assignment')===id);
  if(!row)return;
  const main=row.querySelector('input[data-p2-program]'),dayBoxes=[...row.querySelectorAll('[data-p2-day]')],box=dayBoxes.find(x=>Number(x.value)===day);
  if(!main||!box)return;
  box.checked=active;
  main.checked=dayBoxes.some(x=>x.checked);
  const details=row.querySelector('.p2-assignment-details');if(details)details.hidden=!main.checked;
  p2SyncScheduleButtons(id,day,active);
 }
 p2UpdateAssignmentSummary();
}
function p2SelectedBulkChoices(){
 return [...document.querySelectorAll('[data-p2-bulk-choice]:checked')].map(x=>({id:x.getAttribute('data-p2-id'),day:Number(x.getAttribute('data-p2-num'))}));
}
function p2UpdateBulkCount(){
 const count=p2SelectedBulkChoices().length,node=document.getElementById('p2-bulk-count');
 if(node)node.textContent=count?count+' نشاط محدد للإسناد الجماعي':'لم تحدد أنشطة للإسناد الجماعي';
}
document.addEventListener('click',e=>{
 const tab=e.target.closest('[data-p2-daytab]');
 if(tab){e.preventDefault();e.stopImmediatePropagation();const day=tab.getAttribute('data-p2-daytab');
 document.querySelectorAll('[data-p2-daytab]').forEach(b=>b.classList.toggle('active',b===tab));
 document.querySelectorAll('[data-p2-day-panel]').forEach(p=>p.hidden=p.getAttribute('data-p2-day-panel')!==day);return;}
 const fixed=e.target.closest('[data-p2-fixed]');
 if(fixed){e.preventDefault();e.stopImmediatePropagation();const key=fixed.getAttribute('data-p2-fixed');p2SetActivity(key,Number(key.split(':')[0]),fixed.getAttribute('aria-pressed')!=='true');return;}
 const bulk=e.target.closest('[data-p2-bulk]');
 if(bulk){e.preventDefault();e.stopImmediatePropagation();const op=bulk.getAttribute('data-p2-bulk');
  if(op==='select-day'){const panel=document.querySelector('[data-p2-day-panel]:not([hidden])');panel?.querySelectorAll('[data-p2-bulk-choice]').forEach(x=>x.checked=true);}
  else if(op==='clear'){document.querySelectorAll('[data-p2-bulk-choice]').forEach(x=>x.checked=false);}
  else{const choices=p2SelectedBulkChoices();if(!choices.length){toast('حدد نشاطًا واحدًا على الأقل من الجدول.');return;}
    choices.forEach(x=>p2SetActivity(x.id,x.day,op==='assign'));}
  p2UpdateBulkCount();return;
 }
 const button=e.target.closest('[data-p2-assign-day]');if(!button)return;
 e.preventDefault();e.stopImmediatePropagation();
 const id=button.getAttribute('data-p2-assign-day'),day=Number(button.getAttribute('data-p2-assign-num'));
 const row=[...document.querySelectorAll('.p2-assignment')].find(r=>r.getAttribute('data-p2-assignment')===id);
 if(!row)return;
 const main=row.querySelector('input[data-p2-program]'),days=[...row.querySelectorAll('[data-p2-day]')];
 const current=days.find(x=>Number(x.value)===day);if(!main||!current)return;
 p2SetActivity(id,day,!(main.checked&&current.checked));
},true);
document.addEventListener('change',e=>{if(e.target.matches('[data-p2-bulk-choice]'))p2UpdateBulkCount()},true);
document.addEventListener('change',e=>{
 if(!e.target.matches('[data-p2-day]'))return;
 const row=e.target.closest('.p2-assignment');if(!row)return;
 const id=row.getAttribute('data-p2-assignment'),main=row.querySelector('input[data-p2-program]');
 if(!main)return;
 main.checked=[...row.querySelectorAll('[data-p2-day]')].some(x=>x.checked);
 const detail=row.querySelector('.p2-assignment-details');if(detail)detail.hidden=!main.checked;
 p2SyncScheduleButtons(id,Number(e.target.value),main.checked&&e.target.checked);
 p2UpdateAssignmentSummary();
},true);
document.addEventListener('change',e=>{
 if(!e.target.matches('.p2-assignment-select input[data-p2-program]'))return;
 const row=e.target.closest('.p2-assignment'),details=row?.querySelector('.p2-assignment-details');
 if(details)details.hidden=!e.target.checked;
 const count=document.getElementById('p2-assignment-count');
 if(count)count.textContent=document.querySelectorAll('.p2-assignment-select input:checked').length+' برنامج';
 const id=row?.getAttribute('data-p2-assignment'),days=[...(row?.querySelectorAll('[data-p2-day]')||[])];
 if(id){if(e.target.checked&&!days.some(x=>x.checked))days.forEach(x=>x.checked=true);
 days.forEach(x=>p2SyncScheduleButtons(id,Number(x.value),e.target.checked&&x.checked));}
},true);
document.addEventListener('input',e=>{
 if(!e.target.matches('[data-p2-assignment-search]'))return;
 const q=e.target.value.trim().toLowerCase();
 document.querySelectorAll('.p2-assignment').forEach(row=>{row.hidden=!!q&&!row.dataset.programTitle.includes(q)});
},true);
document.addEventListener('input',e=>{if(!e.target.matches('[data-p2-program-search]'))return;const holder=e.target.closest('.p2-program-picker'),q=e.target.value.trim().toLowerCase();holder?.querySelectorAll('.p2-program-options label').forEach(el=>el.hidden=!!q&&!el.dataset.programTitle.includes(q));},true);
document.addEventListener('change',e=>{if(!e.target.matches('[data-p2-program]'))return;const p=e.target.closest('.p2-program-picker'),count=p?.querySelector('.p2-program-count');if(count)count.textContent=p.querySelectorAll('[data-p2-program]:checked').length+' برنامج محدد';},true);

let p2EditingDuty=null;
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-p2-duty-action]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(!p2DutyAdmin())return toast('إدارة مكتبة المسؤوليات متاحة للإدارة فقط');
 const action=b.getAttribute('data-p2-duty-action'),key=b.getAttribute('data-id'),nameField=document.getElementById('p2-duty-name'),saveBtn=document.getElementById('p2-duty-save'),cancelBtn=document.getElementById('p2-duty-cancel');
 if(action==='cancel'){p2EditingDuty=null;if(nameField)nameField.value='';if(saveBtn)saveBtn.textContent='+ إضافة مسؤولية';if(cancelBtn)cancelBtn.hidden=true;return;}
 if(action==='edit'){const item=db().customDuties.find(x=>x.id===key);if(!item)return;
  p2EditingDuty=key;if(nameField){nameField.value=item.name;nameField.focus();}
  if(saveBtn)saveBtn.textContent='حفظ تعديل المسؤولية';if(cancelBtn)cancelBtn.hidden=false;return;}
 if(action==='delete'){
  const item=db().customDuties.find(x=>x.id===key);if(!item)return;
  if(!confirm('حذف المسؤولية «'+item.name+'» من المكتبة وإزالتها من جميع أعضاء الفريق؟'))return;
  db().customDuties=db().customDuties.filter(x=>x.id!==key);
  db().staff.forEach(m=>{m.duties=(m.duties||[]).filter(x=>x!==key)});
  if(p2EditingDuty===key){p2EditingDuty=null;if(nameField)nameField.value='';if(saveBtn)saveBtn.textContent='+ إضافة مسؤولية';if(cancelBtn)cancelBtn.hidden=true;}
  save();p2RefreshDutyOptions();return;
 }
 if(action==='save'){
  const title=(nameField?.value||'').trim().replace(/\s+/g,' ');
  if(title.length<3)return toast('اكتب اسم مسؤولية واضحًا من 3 أحرف على الأقل');
  if(p2AllDuties().some(([id,label])=>label.toLocaleLowerCase()===title.toLocaleLowerCase()&&id!==p2EditingDuty))return toast('المسؤولية موجودة مسبقًا');
  if(p2EditingDuty){const existing=db().customDuties.find(x=>x.id===p2EditingDuty);if(!existing)return toast('تعذر العثور على المسؤولية');existing.name=title;}
  else db().customDuties.push({id:newId('duty-'),name:title});
  save();p2RefreshDutyOptions();p2EditingDuty=null;if(nameField)nameField.value='';if(saveBtn)saveBtn.textContent='+ إضافة مسؤولية';if(cancelBtn)cancelBtn.hidden=true;
 }
},true);
document.addEventListener('click',e=>{const b=e.target.closest('[data-p2-tool]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const holder=b.closest('.p2-program-picker');if(b.dataset.p2Tool==='suggest-role'){const role=document.getElementById('p2-staff-role')?.value,defaultSet=p2RoleDefaults[role];if(defaultSet){document.querySelectorAll('[data-p2-duty]').forEach(box=>box.checked=defaultSet.duties.includes(box.getAttribute('data-p2-duty')));document.querySelectorAll('[data-p2-permission]').forEach(box=>box.checked=defaultSet.permissions.includes(box.getAttribute('data-p2-permission')))}return;}
 if(b.dataset.p2Tool==='clear-assignments'){document.querySelectorAll('.p2-assignment-select input[data-p2-program]').forEach(box=>box.checked=false);document.querySelectorAll('.p2-assignment-details').forEach(x=>x.hidden=true);document.querySelectorAll('[data-p2-assign-day]').forEach(x=>{x.setAttribute('aria-pressed','false');x.classList.remove('assigned');x.textContent='+ إسناد'});p2UpdateAssignmentSummary();return;}
 if(b.dataset.p2Tool==='clear-programs')holder?.querySelectorAll('[data-p2-program]').forEach(box=>box.checked=false);const count=holder?.querySelector('.p2-program-count');if(count)count.textContent='0 برنامج محدد';},true);
document.addEventListener('click',e=>{const b=e.target.closest('[data-p2]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();act(b)},true);

/* Optional assignment directly from step 5 schedule preview.
   Uses the same underlying Phase 2 staff/program/day records. */
function scheduleAssignStaffList(){
 return staff().filter(x=>x.active!==false);
}
function scheduleAssignAssignees(kind,day,token){
 const d=db();
 if(kind==='activity'){
  const key=String(day)+':'+String(token);
  return scheduleAssignStaffList().filter(m=>(d.activityAssignments[m.id]||[]).includes(key));
 }
 return scheduleAssignStaffList().filter(m=>{
  if(!(info(token).trainers||[]).includes(m.id))return false;
  const item=items().find(p=>String(p.id)===String(token));
  if(!item)return false;
  return p2AssignedDays(m.id,item).includes(Number(day));
 });
}
function scheduleAssignInline(kind,day,token){
 const selected=scheduleAssignAssignees(kind,day,token);
 return '<span class="p2-inline-assignment noprint"><button type="button" class="p2-inline-assign-button" data-p2-schedule-assign="'+H(kind)+'" data-day="'+Number(day)+'" data-token="'+H(token)+'">'+(selected.length?'إسناد · '+selected.length:'إسناد')+'</button>'+
 (selected.length?'<small class="p2-inline-assignees" title="'+H(selected.map(m=>m.name).join('، '))+'">'+H(selected.map(m=>m.name).join('، '))+'</small>':'')+'</span>';
}
function scheduleAssignModal(kind,day,token){
 const n=Number(day),id=String(token);
 if(!canEdit())return toast('الإسناد غير متاح لهذا الدور');
 if(!Number.isInteger(n)||n<1||n>S.meta.days.length)return toast('اليوم غير صالح');
 let activity='';
 if(kind==='activity'){
  const index=Number(id);
  if(!Number.isInteger(index)||index<0||index>=DAY_TEMPLATE.length)return toast('النشاط غير موجود');
  const row=scheduleRow(n,index),listed=row.slot?(slotMap(n)[row.slot]||[]):[];
  if(row.slot&&listed.length)return toast('اختر إسناد البرنامج مباشرة من البطاقة');
  if(row.slot&&!slotHasCustomActivity(n,index))return toast('أضف نشاطًا لهذه الفترة قبل إسناده');
  activity=row.ar;
 }else if(kind==='program'){
  const p=items().find(x=>String(x.id)===id);
  if(!p||!p2ProgramDays(p).includes(n))return toast('البرنامج غير موجود في هذا اليوم');
  activity=name(id);
 }else return toast('نوع التكليف غير صالح');
 const chosen=new Set(scheduleAssignAssignees(kind,n,id).map(m=>m.id));
 const members=scheduleAssignStaffList();
 const key=kind==='activity'?n+':'+id:id;
 openModal('<div class="p2-schedule-assign-modal" dir="rtl"><div class="p2-schedule-assign-header"><small>الجدول · اليوم '+n+'</small><h2>إسناد '+H(activity)+'</h2><p>اختر شخصًا أو أكثر. الإسناد اختياري، ويمكنك ترك النشاط دون مسؤول.</p></div>'+
 '<div class="p2-schedule-assign-toolbar"><span id="p2-schedule-assign-count">'+chosen.size+' أعضاء محددين</span><button type="button" data-p2-schedule-select="all">تحديد الكل</button><button type="button" data-p2-schedule-select="none">مسح الاختيار</button></div>'+
 '<div class="p2-schedule-assign-search"><input type="search" id="p2-schedule-assign-search" placeholder="البحث باسم المدرب أو المشرف" aria-label="البحث في أعضاء الفريق"></div>'+
 '<div class="p2-schedule-assign-members">'+(members.length?members.map(m=>'<label class="p2-schedule-assign-member" data-member-search="'+H((m.name+' '+(m.role||'')).toLowerCase())+'"><input type="checkbox" data-p2-schedule-member="'+H(m.id)+'" '+(chosen.has(m.id)?'checked':'')+'><span><b>'+H(m.name)+'</b><small>'+H(m.role||'عضو الفريق')+'</small></span></label>').join(''):'<div class="p2-assignment-empty">لا يوجد مدربون أو مشرفون مسجلون. أضفهم من تبويب «الفريق والصلاحيات» أولًا.</div>')+'</div>'+
 '<p class="p2-schedule-assign-note">التعديل يخص هذا اليوم فقط، ولا يغيّر تكليفات بقية الأيام أو حالة جاهزية الخطة.</p>'+
 '<div class="p2-schedule-assign-actions"><button type="button" data-act="close">إلغاء</button><button type="button" class="primary" data-p2-schedule-save="'+H(kind)+'" data-day="'+n+'" data-token="'+H(id)+'">حفظ الإسناد</button></div></div>');
}
function scheduleAssignSave(kind,day,token,ids){
 const d=db(),n=Number(day),id=String(token),valid=new Set(scheduleAssignStaffList().map(m=>m.id));
 const selectedIds=new Set(ids.filter(x=>valid.has(x)));
 if(kind==='activity'){
  const key=n+':'+id;
  staff().forEach(m=>{
   const values=new Set(d.activityAssignments[m.id]||[]);
   if(selectedIds.has(m.id))values.add(key);else values.delete(key);
   d.activityAssignments[m.id]=[...values];
  });
 }else if(kind==='program'){
  const p=items().find(x=>String(x.id)===id);
  if(!p)return false;
  for(const m of staff()){
   const prior=info(id),trainers=new Set(prior.trainers||[]);
   const details=d.assignmentDetails[m.id]||{};
   const existing=details[id];
   const chosenDays=new Set(existing?.days?.length?existing.days.map(Number):trainers.has(m.id)?p2ProgramDays(p):[]);
   if(selectedIds.has(m.id))chosenDays.add(n);else chosenDays.delete(n);
   if(chosenDays.size){trainers.add(m.id);details[id]={role:'lead',status:'planned',note:'',...existing,days:[...chosenDays].sort((a,b)=>a-b)};}
   else{trainers.delete(m.id);delete details[id];}
   d.assignmentDetails[m.id]=details;
   d.programs[id]={...prior,trainers:[...trainers]};
  }
 }else return false;
 d.audit=null;save();render({preserveScroll:true});return true;
}
function scheduleAssignUpdateCount(){
 const count=document.querySelectorAll('[data-p2-schedule-member]:checked').length,node=document.getElementById('p2-schedule-assign-count');
 if(node)node.textContent=count+' أعضاء محددين';
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-p2-schedule-assign]');
 if(button){event.preventDefault();event.stopImmediatePropagation();scheduleAssignModal(button.dataset.p2ScheduleAssign,button.dataset.day,button.dataset.token);return;}
 const control=event.target.closest('[data-p2-schedule-select]');
 if(control){event.preventDefault();event.stopImmediatePropagation();document.querySelectorAll('[data-p2-schedule-member]').forEach(el=>{if(control.dataset.p2ScheduleSelect==='none'||!el.closest('label')?.hidden)el.checked=control.dataset.p2ScheduleSelect==='all'});scheduleAssignUpdateCount();return;}
 const saveButton=event.target.closest('[data-p2-schedule-save]');
 if(saveButton){event.preventDefault();event.stopImmediatePropagation();
  if(!canEdit())return toast('الإسناد غير متاح لهذا الدور');
  const ids=[...document.querySelectorAll('[data-p2-schedule-member]:checked')].map(el=>el.dataset.p2ScheduleMember);
  if(!scheduleAssignSave(saveButton.dataset.p2ScheduleSave,saveButton.dataset.day,saveButton.dataset.token,ids))return toast('تعذر حفظ الإسناد');
  closeModal();toast('تم حفظ الإسناد الاختياري');return;
 }
},true);
document.addEventListener('change',event=>{if(event.target.matches('[data-p2-schedule-member]'))scheduleAssignUpdateCount()},true);
document.addEventListener('input',event=>{
 if(event.target.id!=='p2-schedule-assign-search')return;
 const q=event.target.value.trim().toLowerCase();
 document.querySelectorAll('.p2-schedule-assign-member').forEach(el=>el.hidden=!!q&&!el.dataset.memberSearch.includes(q));
},true);
window.campScheduleAssignInline=scheduleAssignInline;
window.campScheduleAssignModal=scheduleAssignModal;

/* Navigation is centrally ordered in index.html. */
PAGE_TITLES.operations=['الجاهزية ومتطلبات التشغيل','Operational readiness'];
PAGES.operations=pageOperations;
if(location.hash==='#operations')page='operations';
render({preserveScroll:true});
})();