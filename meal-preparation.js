/* Camp-scoped meal preparation: separate planner tab. */
(function(){
'use strict';
const e=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const types=[['breakfast','إفطار'],['lunch','غداء'],['dinner','عشاء'],['snack','وجبة خفيفة'],['other','أخرى']];
const needs=['المكسرات','الحليب','البيض','القمح/الجلوتين','السمسم','الأسماك','المحار','الصويا','أخرى'];
const n=v=>Math.max(0,Math.floor(Number(v)||0)),money=v=>Math.max(0,Number(v)||0),fmt=v=>money(v).toLocaleString('en-US',{maximumFractionDigits:2});
let section='schedule',dayChoice='all';
function db(){
 S.prep??={};
 if(!S.prep.__catering){
  S.prep.__catering={staff:{supervisors:0,trainers:0,other:0},team:[],people:[],special:[],meals:[]};
  (Array.isArray(S.prep.__meals)?S.prep.__meals:[]).forEach(m=>S.prep.__catering.meals.push({id:m.id||newId('meal-'),day:n(m.day)||1,type:m.type||'other',time:m.time||'12:00',menu:m.details||'',supplier:'',supervisor:m.supervisor||'',servings:null,unitPrice:0,specialPrice:0,specialMenu:'',specialIds:[],confirmed:false}));
 }
 return S.prep.__catering;
}
const team=()=>{const d=db();if(!Array.isArray(d.team))d.team=[];
 // Seed a few clearly labelled demo supervisors only once per camp.
 // They can be deleted/replaced from the team-management section.
 if(!d.demoTeamSeeded){
   const examples=[
     {id:'demo-meals-1',name:'أحمد العتيبي',role:'مشرف ميداني',demo:true},
     {id:'demo-meals-2',name:'خالد القحطاني',role:'مسؤول التغذية',demo:true},
     {id:'demo-meals-3',name:'محمد الحربي',role:'مدرب',demo:true},
     {id:'demo-meals-4',name:'عبدالله الدوسري',role:'مشرف التوزيع',demo:true}
   ];
   examples.forEach(member=>{if(!d.team.some(x=>x.id===member.id||x.name===member.name))d.team.push(member)});
   d.demoTeamSeeded=true;
 }
 // Preserve existing supervisor assignments from the earlier free-text form.
 d.meals.forEach(m=>{if(!m.supervisorId&&typeof m.supervisor==='string'&&m.supervisor.trim()){
   let member=d.team.find(t=>t.name===m.supervisor.trim());
   if(!member){member={id:newId('staff-'),name:m.supervisor.trim(),role:'مشرف (سجل سابق)'};d.team.push(member)}
   m.supervisorId=member.id;
 }});
 return d.team};
const supervisorName=id=>team().find(x=>x.id===id)?.name||'';
const supervisorOptions=id=>'<option value="">اختر المسؤول من فريق المعسكر</option>'+team().map(x=>'<option value="'+e(x.id)+'" '+(id===x.id?'selected':'')+'>'+e(x.name)+' · '+e(x.role)+(x.demo?' (تجريبي)':'')+'</option>').join('');
const participants=()=>[...(S.students||[]).map(x=>({id:'s-'+x.id,name:L({ar:x.ar,en:x.en}),demo:true})),...db().people.map(x=>({id:x.id,name:x.name,demo:false}))];
const pname=id=>participants().find(x=>x.id===id)?.name||'مشارك غير معروف';
const total=()=>n(S.meta.students)+Object.values(db().staff).reduce((s,v)=>s+n(v),0);
const specialsOf=m=>db().special.filter(r=>(m.specialIds||[]).includes(r.id)&&(m.audienceMode!=='selected'||(m.audienceIds||[]).includes(r.id)));
const servings=m=>m.audienceMode==='selected'?new Set((m.audienceIds||[]).filter(id=>participants().some(p=>p.id===id))).size:(m.servings===null||m.servings===undefined?total():n(m.servings));
const regularCount=m=>Math.max(0,servings(m)-specialsOf(m).length);
const sharedSize=m=>Math.max(1,n(m.peoplePerTray)||1);
const regularUnits=m=>m.serviceMode==='shared'?Math.ceil(regularCount(m)/sharedSize(m)):regularCount(m);
const cost=m=>regularUnits(m)*money(m.unitPrice)+specialsOf(m).length*money(m.specialPrice);
const type=k=>types.find(x=>x[0]===k)?.[1]||'وجبة';
function issues(m){
 let arr=[];
 if(!m.menu?.trim())arr.push('تفاصيل القائمة');
 if(!m.supplier?.trim())arr.push('المورد');
 if(!m.supervisorId||!supervisorName(m.supervisorId))arr.push('المشرف المسؤول من الفريق');
 if(!m.time)arr.push('التوقيت');
 if(!m.deliveryTime)arr.push('موعد وصول المورد');
 if(!m.serviceLocation?.trim())arr.push('موقع تقديم الطعام');
 if(servings(m)<=0)arr.push(m.audienceMode==='selected'?'اختر الطلاب المستفيدين من الوجبة':'عدد المستفيدين');
 if(m.audienceMode==='selected'&&(m.audienceIds||[]).some(id=>!participants().some(p=>p.id===id)))arr.push('مشارك محدد غير موجود في القائمة');
 if(m.audienceMode==='selected'&&(m.specialIds||[]).some(id=>!(m.audienceIds||[]).includes(id)))arr.push('حالة غذائية خاصة خارج قائمة المستفيدين');
 if(specialsOf(m).length>servings(m))arr.push('الحالات الخاصة أكثر من المستفيدين');
 if(m.serviceMode==='shared'&&(!n(m.peoplePerTray)||n(m.peoplePerTray)<2))arr.push('عدد الأفراد لكل طبق جماعي');
 if(m.serviceMode==='shared'&&!m.servingNotes?.trim())arr.push('طريقة توزيع الأطباق الجماعية');
 if(specialsOf(m).length&&!m.specialMenu?.trim())arr.push('وجبة بديلة');
 if(specialsOf(m).some(r=>!r.parentOK||!r.kitchenOK))arr.push('تأكيد الحالات الخاصة');
 if(!m.confirmed)arr.push('تأكيد المورد');
 if(!team().length)arr.push('تعريف فريق التشغيل');
 return arr;
}
function card(label,value,detail){return '<div class="cp-stat"><small>'+label+'</small><strong>'+e(value)+'</strong><small>'+detail+'</small></div>'}
function head(text,hint){return '<div class="cp-head"><h2>'+text+'</h2><p class="help">'+hint+'</p></div>'}
function pageMeals(){
 const d=db(),planned=d.meals.length,ready=d.meals.filter(m=>issues(m).length===0).length;
 const participantsCount=total(),plannedDays=new Set(d.meals.map(m=>m.day)).size,days=S.meta.days.length;
 const completion=planned?Math.round(ready/planned*100):0;
 const sum=d.meals.reduce((x,m)=>x+cost(m),0),pending=planned-ready,notPlanned=Math.max(0,days-plannedDays);
 const tabs=[['schedule','خطة الوجبات',planned],['counts','الأعداد والفريق',participantsCount],['special','التغذية الخاصة',d.special.length],['audit','مراجعة الجاهزية',pending+notPlanned]];
 return '<div class="catering-workspace">'+
 '<section class="catering-hero"><div><div class="catering-kicker">أكاديمية النخبة · الإدارة التشغيلية</div><h1>تجهيز الوجبات والتغذية</h1><p>نظرة واحدة على خطة الطعام: ماذا سيُقدَّم، ولمن، وكم نحتاج، ومن المسؤول عن الاستلام والتوزيع.</p></div>'+
 '<div class="catering-hero-actions"><button type="button" class="primary" data-cp="new-meal">+ إضافة وجبة</button><button type="button" class="catering-secondary" data-cp="print-options">طباعة ملخص الوجبات</button><button type="button" class="catering-secondary" data-cp="tab" data-val="audit">فحص الجاهزية</button></div></section>'+
 '<section class="catering-summary" aria-label="مؤشرات تجهيز الوجبات">'+
 '<div class="catering-summary-item"><small>إجمالي المستفيدين</small><strong>'+participantsCount+'</strong><span>'+n(S.meta.students)+' طالب · '+(participantsCount-n(S.meta.students))+' طاقم</span></div>'+
 '<div class="catering-summary-item"><small>الوجبات المخططة</small><strong>'+planned+'</strong><span>'+plannedDays+' من '+days+' أيام بها وجبات</span></div>'+
 '<div class="catering-summary-item"><small>الاحتياجات الغذائية الخاصة</small><strong>'+d.special.length+'</strong><span>يلزم توثيقها مع الأسرة والمورد</span></div>'+
 '<div class="catering-summary-item"><small>التكلفة التقديرية</small><strong>'+fmt(sum)+' <small>ر.س</small></strong><span>تشمل الأطباق الجماعية والفردية والخاصة</span></div></section>'+
 '<section class="catering-progress"><div><div class="catering-progress-title"><strong>جاهزية الوجبات المسجلة</strong><span>'+ready+' من '+planned+' مستوفية</span></div><div class="catering-progress-track" role="progressbar" aria-valuenow="'+completion+'" aria-valuemin="0" aria-valuemax="100"><span style="width:'+completion+'%"></span></div><small>'+(pending?pending+' وجبة تحتاج استكمال المتطلبات. ':'')+(notPlanned?notPlanned+' أيام لم تُسجّل لها وجبات.':'راجع أعداد الحضور قبل تأكيد الكميات.')+'</small></div><button type="button" data-cp="tab" data-val="audit">عرض النواقص ←</button></section>'+
 '<nav class="cp-tabs" aria-label="أقسام إدارة التغذية">'+tabs.map(([id,label,num])=>'<button type="button" data-cp="tab" data-val="'+id+'" class="'+(section===id?'active':'')+'" aria-current="'+(section===id?'page':'false')+'">'+label+' <span class="number">'+num+'</span></button>').join('')+'</nav>'+
 '<main class="catering-section">'+(section==='schedule'?scheduleView():section==='counts'?countsView():section==='special'?specialView():auditView())+'</main>'+
 '<div class="catering-insight"><span>ⓘ</span><div><b>خصوصية وسلامة التغذية</b> — بيانات الطلاب في هذه النسخة تجريبية وتُحفظ محليًا في المتصفح. لا تُدخل بيانات حساسية حقيقية لقُصّر قبل إضافة ضوابط الصلاحيات والتخزين الآمن. يجب تأكيد الاحتياجات الغذائية مع ولي الأمر ومقدم الطعام، والتحقق من تجنب التلوث التبادلي.</div></div></div>';
}
function scheduleView(){
 const all=db().meals.slice().sort((a,b)=>a.day-b.day||String(a.time).localeCompare(String(b.time)));
 const activeDay=dayChoice==='all'?'all':Number(dayChoice);
 const items=all.filter(m=>activeDay==='all'||m.day===activeDay);
 const dayButtons='<div class="catering-day-strip" aria-label="تصفية الوجبات حسب اليوم">'+
 '<button type="button" class="catering-day '+(dayChoice==='all'?'active':'')+'" data-cp="day" data-val="all"><b>جميع الأيام</b><small>الخطة كاملة</small><span class="catering-day-count">'+all.length+' وجبة</span></button>'+
 S.meta.days.map((d,i)=>{const count=all.filter(m=>m.day===i+1).length;return '<button type="button" class="catering-day '+(activeDay===i+1?'active':'')+'" data-cp="day" data-val="'+(i+1)+'"><b>اليوم '+(i+1)+'</b><small>'+e(L(d))+'</small><span class="catering-day-count">'+count+' وجبة</span></button>'}).join('')+'</div>';
 const list=items.map(m=>{
   const missing=issues(m),special=specialsOf(m),group=m.serviceMode==='shared';
   return '<article class="catering-meal"><div class="catering-meal-top"><span class="catering-meal-type">'+(group?'◉':'◌')+' '+e(type(m.type))+' · اليوم '+m.day+'</span><span class="catering-meal-status '+(!missing.length?'ready':'')+'">'+(missing.length?missing.length+' متطلبات ناقصة':'مستوفية المتطلبات')+'</span></div>'+
   '<div class="catering-meal-body"><h3>'+e(m.menu||'لم تُحدد قائمة الطعام')+'</h3><div class="catering-meal-sub">'+e(m.time||'الوقت غير محدد')+' · '+(group?'تقديم جماعي · طبق لكل '+sharedSize(m)+' أشخاص':'تقديم فردي')+'</div>'+
   '<div class="catering-meal-kpis"><div><small>المستفيدون</small><b>'+servings(m)+'</b></div><div><small>'+(group?'الأطباق الجماعية':'الوجبات الفردية')+'</small><b>'+regularUnits(m)+'</b></div><div><small>وجبات خاصة</small><b>'+special.length+'</b></div></div>'+
   '<div class="catering-meal-sub"><b>المستفيدون:</b> '+(m.audienceMode==='selected'?'<strong>مجموعة محددة ('+servings(m)+' طلاب)</strong> · '+e((m.audienceIds||[]).map(pname).slice(0,4).join('، '))+((m.audienceIds||[]).length>4?' وآخرون':''):'جميع المستفيدين')+'</div>'+ '<div class="catering-meal-sub"><b>المشرف:</b> '+e(supervisorName(m.supervisorId)||'لم يحدد')+' <span style="margin:0 4px">·</span> <b>المورد:</b> '+e(m.supplier||'لم يحدد')+'</div>'+
   '<div class="catering-meal-sub"><b>موعد الوصول:</b> '+e(m.deliveryTime||'لم يحدد')+' <span style="margin:0 4px">·</span> <b>الموقع:</b> '+e(m.serviceLocation||'لم يحدد')+'</div>'+
   (special.length?'<div class="catering-insight" style="margin:10px 0 0"><span>!</span><span>'+special.length+' وجبات خاصة منفصلة: '+e(special.map(x=>pname(x.id)).join('، '))+'.</span></div>':'')+
   (missing.length?'<div class="catering-meal-sub" style="margin-top:8px;color:#a05e25">يلزم استكمال: '+e(missing.slice(0,3).join('، '))+(missing.length>3?' وغيرها':'')+'</div>':'')+
   '</div><div class="catering-meal-footer"><div><span class="catering-badge">التكلفة: '+fmt(cost(m))+' ر.س</span></div><div class="cp-actions"><button type="button" class="small" data-cp="edit-meal" data-id="'+e(m.id)+'">تعديل الوجبة</button><button type="button" class="small danger" data-cp="del-meal" data-id="'+e(m.id)+'">حذف</button></div></div></article>';
 }).join('');
 return '<div class="catering-section-head"><div><h2>خطة الوجبات اليومية</h2><p>اختر اليوم لمعرفة الوجبات المقررة، والكميات، والتكلفة، وحالة جاهزية كل طلب.</p></div><div class="cp-actions"><button type="button" class="primary" data-cp="new-meal">+ وجبة جديدة</button></div></div>'+
 dayButtons+
 (items.length?'<div class="catering-grid">'+list+'</div>':
 '<div class="catering-empty"><div class="catering-empty-icon">♧</div><h3>لا توجد وجبات مخططة '+(activeDay==='all'?'بعد':'لهذا اليوم')+'</h3><p>أضف الإفطار والغداء والعشاء أو أي وجبة أخرى، وحدد الأعداد والمورد والمشرف واحتياجات التغذية الخاصة.</p><button type="button" class="primary" data-cp="new-meal">+ إضافة أول وجبة</button></div>')+
 '<div class="catering-insight"><span>ⓘ</span><span>الوجبات الجماعية تُحسب بعدد الأطباق وفق سعة الطبق، وتُفصل عنها الوجبات الخاصة بالحساسية. راجع الحضور والطاقم قبل إرسال الطلب النهائي.</span></div>';
}
function countsView(){
 const d=db(),people=participants();
 return head('الأعداد والمستفيدون','العدد المتوقع قد يختلف عن قائمة الطلاب المسجلة؛ لا تفترض اكتمال أسماء المشاركين.')+
 '<div class="cp-cols"><div class="card"><h3>حساب الحصص والمستفيدين</h3><label>عدد الطلاب المتوقع<input id="cp-students" type="number" min="0" value="'+n(S.meta.students)+'"></label><label>عدد المشرفين<input id="cp-supervisors" type="number" min="0" value="'+n(d.staff.supervisors)+'"></label><label>عدد المدربين<input id="cp-trainers" type="number" min="0" value="'+n(d.staff.trainers)+'"></label><label>المرافقون والسائقون<input id="cp-other" type="number" min="0" value="'+n(d.staff.other)+'"></label><button class="primary" data-cp="save-counts">حفظ أعداد المستفيدين</button><p class="help">تحديث الطلاب يغيّر بيانات المعسكر أيضًا، والعدد يصبح الأساس الافتراضي لحصص الوجبات الجديدة.</p></div>'+
 '<div class="card"><h3>الأسماء المتاحة للتغذية الخاصة</h3><div class="cp-names">'+people.map(p=>'<div>'+e(p.name)+(p.demo?' <small>تجريبي</small>':' <button class="small danger" data-cp="del-person" data-id="'+e(p.id)+'">حذف</button>')+'</div>').join('')+'</div><label>إضافة مشارك للتجهيز<input id="cp-person-name" maxlength="100" placeholder="اسم أو معرف المشارك"></label><button class="primary" data-cp="add-person">إضافة مشارك</button><p class="help">الأسماء المسجلة: '+people.length+' | الطلاب المتوقعون: '+n(S.meta.students)+'. قائمة الأسماء الحالية تجريبية أو مدخلة يدويًا.</p></div></div>'+
 '<div class="card cp-team"><h3>فريق الإشراف والتوزيع</h3><p class="help">أضف أسماء أعضاء فريق هذا المعسكر لتظهر ضمن قائمة المشرف المسؤول عند تجهيز كل وجبة.</p>'+
 '<div class="cp-team-list">'+team().map(t=>'<div class="cp-team-item"><span>'+e(t.name)+' · '+e(t.role)+(t.demo?' (تجريبي)':'')+'</span><button class="small danger" data-cp="del-team" data-id="'+e(t.id)+'">حذف</button></div>').join('')+'</div>'+
 '<label>اسم عضو الفريق<input id="ct-name" maxlength="100" placeholder="اسم المشرف أو المدرب"></label>'+
 '<label>دوره في المعسكر<select id="ct-role"><option>مشرف ميداني</option><option>مدرب</option><option>مسؤول التغذية</option><option>قائد برامج</option><option>مدير معسكر</option><option>مرافق</option></select></label>'+
 '<button class="primary" data-cp="add-team">إضافة للفريق</button></div>';
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
 const d=db(),days=S.meta.days.map((label,i)=>({day:i+1,title:L(label),list:d.meals.filter(m=>m.day===i+1)}));
 const pending=d.meals.filter(m=>issues(m).length),unconfirmed=d.special.filter(s=>!s.parentOK||!s.kitchenOK);
 const line=(name,detail,ok)=>'<div class="catering-check"><div><b>'+e(name)+'</b><div><span>'+e(detail)+'</span></div></div><em class="'+(ok?'okay':'')+'">'+(ok?'مستوفٍ':'يحتاج متابعة')+'</em></div>';
 return '<div class="catering-section-head"><div><h2>مراجعة جاهزية التغذية</h2><p>قائمة تحقق تشغيلية تساعد الإدارة على معرفة النواقص قبل المعسكر، دون إصدار اعتماد آلي.</p></div></div>'+
 '<div class="catering-review"><section class="catering-review-card"><h3>تغطية أيام المعسكر</h3>'+days.map(x=>line('اليوم '+x.day+' · '+x.title,x.list.length+' وجبة مسجلة',x.list.length>0)).join('')+'</section>'+
 '<section class="catering-review-card"><h3>توثيق التغذية الخاصة</h3>'+line('حالات الاحتياج الغذائي','إجمالي الحالات: '+d.special.length,unconfirmed.length===0)+line('تأكيدات ولي الأمر',d.special.filter(s=>s.parentOK).length+' من '+d.special.length,d.special.every(s=>s.parentOK))+line('تأكيدات المطبخ',d.special.filter(s=>s.kitchenOK).length+' من '+d.special.length,d.special.every(s=>s.kitchenOK))+
 line('أعداد المستفيدين','متوقع '+n(S.meta.students)+' طالب و '+(total()-n(S.meta.students))+' طاقم',total()>0)+'</section></div>'+
 '<section class="catering-review-card" style="margin-top:13px"><h3>نواقص الوجبات المسجلة</h3>'+(pending.length?pending.map(m=>line('اليوم '+m.day+' · '+type(m.type),issues(m).join(' · '),false)).join(''):'<p class="help">لا توجد نواقص في حقول الوجبات المسجلة. تأكد من خطة جميع الأيام ومطابقة العدد الفعلي.</p>')+'</section>'+
 '<div class="catering-insight"><span>!</span><div><b>قاعدة الاعتماد:</b> هذه لوحة متابعة، وليست شهادة سلامة غذائية. تأكيد التوريد والأعداد والحساسيات والتجهيز في الميدان مسؤولية الفريق المختص ومقدم الطعام.</div></div>';
}

/* Separate professional print report, filtered without changing the live day selection. */
function printMealOptions(){
 const numDays=S.meta.days.length;
 const defaultDay=dayChoice==='all'?'all':String(dayChoice);
 openModal('<div class="catering-print-options"><h2>طباعة ملخص الوجبات</h2><p class="help">اختر نطاق التقرير. سيُطبع الملخص فقط دون أزرار التحكم، وتُجمع الكميات والتكاليف لكل يوم.</p>'+
 '<label class="catering-print-label">نطاق التقرير<select id="cp-print-scope"><option value="all" '+(defaultDay==='all'?'selected':'')+'>جميع أيام المعسكر ('+numDays+' أيام)</option>'+
 S.meta.days.map((day,i)=>'<option value="'+(i+1)+'" '+(defaultDay===String(i+1)?'selected':'')+'>اليوم '+(i+1)+' · '+e(L(day))+'</option>').join('')+'</select></label>'+
 '<div class="catering-print-preview" id="cp-print-preview" aria-live="polite"></div>'+
 '<div class="catering-print-note">تتضمن الطباعة العدد الإجمالي للمستفيدين، والكميات، والوجبات الخاصة بعددها فقط، والمورد، والمشرف، والموقع، والتكلفة. لا تتضمن أسماء الطلاب أو تفاصيل الحساسية.</div>'+
 '<div class="cp-actions"><button type="button" data-act="close">إلغاء</button><button type="button" class="primary" data-cp="print-report">طباعة الملخص / حفظ PDF</button></div></div>');
 refreshPrintPreview();
}
function mealsForPrint(scope){
 return db().meals.filter(m=>scope==='all'||m.day===Number(scope))
  .slice().sort((a,b)=>a.day-b.day||String(a.time||'').localeCompare(String(b.time||'')));
}
function refreshPrintPreview(){
 const target=$('#cp-print-preview');if(!target)return;
 const scope=$('#cp-print-scope')?.value||'all',list=mealsForPrint(scope);
 const days=scope==='all'?S.meta.days.length:1;
 target.innerHTML='<div><b>'+list.length+'</b><span>وجبة مسجلة</span></div>'+
 '<div><b>'+days+'</b><span>'+(scope==='all'?'أيام معسكر':'يوم محدد')+'</span></div>'+
 '<div><b>'+fmt(list.reduce((sum,m)=>sum+cost(m),0))+'</b><span>ريال إجمالي تقديري</span></div>';
}
function printableReport(scope){
 const days=scope==='all'?S.meta.days.map((day,i)=>({day:i+1,name:L(day)})):
  [{day:Number(scope),name:L(S.meta.days[Number(scope)-1]||{ar:'اليوم المحدد'})}];
 const list=mealsForPrint(scope);
 const rowsForDay=day=>list.filter(m=>m.day===day);
 const sum=(items,field)=>items.reduce((acc,m)=>acc+field(m),0);
 const title=scope==='all'?'جميع أيام المعسكر':'اليوم '+scope;
 const camp=S.meta.campAr||'المعسكر';
 const printedAt=new Date().toLocaleString('ar-SA-u-ca-gregory-nu-latn',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
 const row=m=>'<tr><td>'+e(type(m.type))+'<small>'+e(m.time||'—')+'</small></td>'+
 '<td>'+e(m.menu||'لم تحدد')+'<small>'+e(m.serviceMode==='shared'?'جماعية · طبق لكل '+sharedSize(m)+' أشخاص':'فردية')+'</small></td>'+
 '<td class="num">'+servings(m)+'</td><td class="num">'+regularUnits(m)+'</td><td class="num">'+specialsOf(m).length+'</td>'+
 '<td>'+e(m.supplier||'—')+'<small>'+e(m.deliveryTime||'')+'</small></td>'+
 '<td>'+e(supervisorName(m.supervisorId)||'—')+'<small>'+e(m.serviceLocation||'')+'</small></td>'+
 '<td class="num">'+fmt(cost(m))+'</td></tr>';
 const sections=days.map(day=>{
   const m=rowsForDay(day.day);
   return '<section class="catering-print-day"><div class="catering-print-dayhead"><div><h2>اليوم '+day.day+' · '+e(day.name)+'</h2><p>'+m.length+' وجبة مسجلة</p></div><strong>'+fmt(sum(m,cost))+' ر.س</strong></div>'+
   (m.length?'<table><thead><tr><th>الوجبة والوقت</th><th>القائمة وطريقة التقديم</th><th>مستفيدون</th><th>وجبات / أطباق عادية</th><th>وجبات خاصة</th><th>المورد / الوصول</th><th>المشرف / الموقع</th><th>التكلفة (ر.س)</th></tr></thead><tbody>'+m.map(row).join('')+
   '</tbody><tfoot><tr><td colspan="2">مجموع اليوم</td><td class="num">'+sum(m,servings)+'</td><td class="num">'+sum(m,regularUnits)+'</td><td class="num">'+sum(m,x=>specialsOf(x).length)+'</td><td colspan="2"></td><td class="num">'+fmt(sum(m,cost))+'</td></tr></tfoot></table>':
   '<div class="catering-print-blank">لا توجد وجبات مخططة لهذا اليوم.</div>')+'</section>';
 }).join('');
 return '<div class="catering-print-document" dir="rtl"><header class="catering-print-head"><div><div class="catering-print-brand">أكاديمية النخبة | إدارة التغذية</div><h1>ملخص خطة الوجبات</h1><p>'+e(camp)+' · '+e(title)+'</p></div><div class="catering-print-date">تاريخ إعداد التقرير<br><b>'+e(printedAt)+'</b></div></header>'+
 '<div class="catering-print-totals"><div><span>الأيام المشمولة</span><strong>'+days.length+'</strong></div><div><span>الوجبات المسجلة</span><strong>'+list.length+'</strong></div>'+
 '<div><span>الوجبات/الأطباق العادية</span><strong>'+sum(list,regularUnits)+'</strong></div><div><span>الوجبات الخاصة</span><strong>'+sum(list,m=>specialsOf(m).length)+'</strong></div>'+
 '<div><span>إجمالي التكلفة التقديرية</span><strong>'+fmt(sum(list,cost))+' ر.س</strong></div></div>'+
 sections+
 '<footer class="catering-print-foot"><b>تنبيه تشغيلي:</b> إجماليات المستفيدين بالجدول هي عدد الحصص المخططة لكل وجبة وليست عدد أشخاص فريدين. يجب مراجعة الحضور والكميات والتوريد الفعلي قبل التنفيذ. تم إخفاء هويات الطلاب ومعلومات الحساسية من التقرير.</footer></div>';
}
function printMealReport(){
 const scope=$('#cp-print-scope')?.value||'all';
 if(scope!=='all'&&(!Number.isInteger(Number(scope))||Number(scope)<1||Number(scope)>S.meta.days.length))
   return toast('اختر يومًا صحيحًا للطباعة.');
 let printable=document.getElementById('catering-print-report');
 if(!printable){printable=document.createElement('div');printable.id='catering-print-report';document.body.appendChild(printable)}
 printable.innerHTML=printableReport(scope);
 closeModal();
 window.print();
}
document.addEventListener('change',event=>{if(event.target?.id==='cp-print-scope')refreshPrintPreview()},true);

function mealModal(id){
 const d=db(),m=d.meals.find(x=>x.id===id),v=m||{audienceMode:'all',audienceIds:[],day:dayChoice==='all'?1:Number(dayChoice),type:'lunch',time:'13:00',menu:'',supplier:'',supervisorId:'',serviceMode:'individual',peoplePerTray:5,servingNotes:'',deliveryTime:'',serviceLocation:'',equipment:'',servings:total(),unitPrice:0,specialPrice:0,specialMenu:'',specialIds:d.special.map(s=>s.id),confirmed:false};
 openModal('<div class="catering-modal"><div class="catering-modal-head"><div class="catering-kicker">التجهيز التشغيلي</div><h2>'+(m?'تعديل الوجبة':'إضافة وجبة جديدة')+'</h2><p>حدد يوم الوجبة وطريقة تقديمها، ثم كمياتها والمورد والمشرف.</p></div><div class="catering-modal-step">01 · توقيت الوجبة وطريقة التقديم</div><div class="cp-form">'+
 '<label>اليوم<select id="cm-day">'+S.meta.days.map((day,i)=>'<option value="'+(i+1)+'" '+(v.day===i+1?'selected':'')+'>اليوم '+(i+1)+' · '+e(L(day))+'</option>').join('')+'</select></label>'+
 '<label>نوع الوجبة<select id="cm-type">'+types.map(([id,label])=>'<option value="'+id+'" '+(v.type===id?'selected':'')+'>'+label+'</option>').join('')+'</select></label>'+
 '<label>وقت التقديم<input type="time" id="cm-time" value="'+e(v.time)+'"></label>'+
 '<label id="cm-servings-field">إجمالي المستفيدين من الوجبة<input type="number" min="0" id="cm-servings" value="'+(v.audienceMode==='selected'?(v.audienceIds||[]).length:servings(v))+'"><small class="help" id="cm-servings-explain">يشمل الطلاب والطاقم ما لم تحدد مجموعة طلاب معينة.</small></label>'+
 '<div class="full cm-audience-box"><div class="cm-audience-header"><div><b>لمن ستُقدم هذه الوجبة؟</b><small>اختر جميع المستفيدين أو مجموعة محددة من الطلاب. يفصل النظام الحالات الغذائية الخاصة تلقائيًا.</small></div><span class="cm-count-badge" id="cm-audience-label">جميع المستفيدين</span></div><div class="cm-audience-switch" role="group" aria-label="نطاق المستفيدين">'+
 '<label class="cm-audience-choice"><input name="cm-audience-mode" type="radio" value="all" '+((v.audienceMode||'all')==='all'?'checked':'')+'><span><strong>جميع المستفيدين</strong><small>الطلاب والطاقم بحسب العدد المسجل</small></span></label>'+
 '<label class="cm-audience-choice"><input name="cm-audience-mode" type="radio" value="selected" '+(v.audienceMode==='selected'?'checked':'')+'><span><strong>طلاب محددون</strong><small>اختر الأسماء لهذه الوجبة فقط</small></span></label></div>'+
 '<div id="cm-student-picker" class="cm-student-picker" '+(v.audienceMode==='selected'?'':'hidden')+'><div class="cm-student-tools"><input type="search" id="cm-student-search" autocomplete="off" placeholder="ابحث باسم الطالب…"><button type="button" data-catering="select-visible">تحديد الظاهر</button><button type="button" data-catering="clear-students">إلغاء التحديد</button></div><div class="cm-student-list" id="cm-student-list">'+
 (participants().length?participants().map(p=>'<label class="cm-student-option" data-student-name="'+e(p.name.toLowerCase())+'"><input type="checkbox" data-cm-student="'+e(p.id)+'" '+((v.audienceIds||[]).includes(p.id)?'checked':'')+'><span>'+e(p.name)+(p.demo?' <small>تجريبي</small>':'')+'</span></label>').join(''):'<div class="cm-student-empty">لا توجد أسماء في قائمة المعسكر. أضف أسماء من «الأعداد والفريق» أولًا.</div>')+
 '</div><div class="cm-student-foot"><span id="cm-students-selected">0 طالب محدد</span><span>لا يُضاف الطاقم تلقائيًا إلى وجبة الطلاب المحددين</span></div></div></div>'+
 '<label>طريقة التقديم<select id="cm-mode"><option value="individual" '+((v.serviceMode||'individual')==='individual'?'selected':'')+'>وجبات فردية (وجبة لكل شخص)</option><option value="shared" '+(v.serviceMode==='shared'?'selected':'')+'>أطباق جماعية (طبق لمجموعة)</option></select></label>'+
 '<label class="cm-shared">الطبق الجماعي يكفي كم شخصًا؟<input type="number" min="2" max="100" id="cm-group-size" value="'+Math.max(2,n(v.peoplePerTray)||5)+'"></label>'+
 '<label class="cm-shared full">طريقة التوزيع والتجهيز<textarea id="cm-serving-notes" rows="2" placeholder="مثال: صحن رز ودجاج لكل 5 طلاب، يقدم على الطاولات حسب الفرق">'+e(v.servingNotes||'')+'</textarea></label>'+
 '<div class="full catering-modal-step">02 · قائمة الطعام والتوريد</div>'+ '<label class="full">القائمة الغذائية ومكوناتها<textarea id="cm-menu" rows="3">'+e(v.menu)+'</textarea></label>'+
 '<label>المورد / المطبخ<input id="cm-supplier" maxlength="120" value="'+e(v.supplier)+'"></label>'+
 '<label>موعد وصول الطعام<input id="cm-delivery" type="time" value="'+e(v.deliveryTime||'')+'"></label>'+
 '<label>موقع التقديم<input id="cm-location" maxlength="120" placeholder="مثال: صالة الطعام" value="'+e(v.serviceLocation||'')+'"></label>'+
 '<label>تجهيزات التقديم<textarea id="cm-equipment" rows="2" placeholder="صحون، أدوات تقديم، طاولات…">'+e(v.equipment||'')+'</textarea></label>'+
 '<label>مشرف الاستلام والتوزيع<select id="cm-supervisor">'+supervisorOptions(v.supervisorId)+'</select><small class="help">من قائمة فريق المعسكر</small></label>'+
 '<label>سعر الوجبة / الطبق (ر.س)<input type="number" step=".01" min="0" id="cm-price" value="'+money(v.unitPrice)+'"><small class="help" id="cm-price-hint">السعر للوحدة، وليس للشخص في الأطباق الجماعية</small></label>'+
 '<label>سعر الوجبة الخاصة (ر.س)<input type="number" step=".01" min="0" id="cm-special-price" value="'+money(v.specialPrice)+'"></label>'+
 '<div class="full catering-modal-step">03 · الوجبات الخاصة والمراجعة</div>'+ '<div class="full"><b>الطلاب الذين يحتاجون وجبات مخصصة لهذه الوجبة</b><div class="cp-checkboxes">'+(d.special.length?d.special.map(s=>'<label><input type="checkbox" data-cm-special="'+e(s.id)+'" '+(v.specialIds?.includes(s.id)?'checked':'')+'>'+e(pname(s.id))+'</label>').join(''):'لا توجد حالات خاصة مسجلة حتى الآن.')+'</div></div>'+
 '<label class="full">تفاصيل الوجبة البديلة<textarea id="cm-special-menu" rows="2">'+e(v.specialMenu)+'</textarea></label>'+
 '<div class="full cp-calc" id="cm-preview" aria-live="polite"></div>'+
 '<label class="full cp-check"><input type="checkbox" id="cm-confirmed" '+(v.confirmed?'checked':'')+'> تم تأكيد الكميات والمكونات والتوقيت مع المورد</label></div>'+
 '<div class="cp-actions"><button data-act="close">إلغاء</button><button class="primary" data-cp="save-meal" data-id="'+e(id||'')+'">حفظ الوجبة</button></div></div>');
 updateMealPreview();
}
function updateMealPreview(){
 const mode=$('#cm-mode')?.value;if(!mode)return;
 const group=mode==='shared',field=$('#cm-group-size'),notes=$('#cm-serving-notes');
 document.querySelectorAll('.cm-shared').forEach(el=>el.hidden=!group);
 if(field)field.disabled=!group;if(notes)notes.disabled=!group;
 const selectedMode=document.querySelector('input[name="cm-audience-mode"]:checked')?.value==='selected';
 const studentChecks=[...document.querySelectorAll('[data-cm-student]:checked')];
 const chosenIds=studentChecks.map(el=>el.dataset.cmStudent);
 const count=selectedMode?chosenIds.length:n($('#cm-servings')?.value);
 const servingsField=$('#cm-servings-field'),countInput=$('#cm-servings'),studentPanel=$('#cm-student-picker');
 if(servingsField)servingsField.hidden=selectedMode;
 if(countInput&&selectedMode)countInput.value=String(count);
 if(studentPanel)studentPanel.hidden=!selectedMode;
 const audienceLabel=$('#cm-audience-label');if(audienceLabel)audienceLabel.textContent=selectedMode?count+' طلاب محددين':'جميع المستفيدين';
 const selectedLabel=$('#cm-students-selected');if(selectedLabel)selectedLabel.textContent=count+' طالب محدد';
 document.querySelectorAll('[data-cm-special]').forEach(el=>{
   const permitted=!selectedMode||chosenIds.includes(el.dataset.cmSpecial);
   el.disabled=!permitted;
   if(!permitted)el.checked=false;
   const label=el.closest('label');if(label)label.classList.toggle('cm-special-not-eligible',!permitted);
 });
 const ids=[...document.querySelectorAll('[data-cm-special]:checked')].map(el=>el.dataset.cmSpecial);
 const special=ids.length,regular=Math.max(0,count-special),size=Math.max(2,n(field?.value)||5),units=group?Math.ceil(regular/size):regular;
 const estimate=units*money($('#cm-price')?.value)+special*money($('#cm-special-price')?.value);
 const preview=$('#cm-preview');if(preview)preview.innerHTML='<b>ملخص التجهيز</b><div class="cp-quant"><span>المستفيدون <b>'+count+'</b></span><span>'+(group?'الأطباق الجماعية':'الوجبات الفردية')+' <b>'+units+'</b></span><span>الوجبات الخاصة <b>'+special+'</b></span><span>التكلفة <b>'+fmt(estimate)+' ر.س</b></span></div>'+(group?'<p class="help">الحساب: '+regular+' مستفيدًا من الطعام العادي ÷ '+size+' أشخاص للطبق، مع التقريب للأعلى. الوجبات الخاصة تُحسب منفصلة.</p>':'');
}
function specialModal(id){
 const d=db(),v=d.special.find(s=>s.id===id)||{id:'',kind:'حساسية غذائية',allergens:[],notes:'',parentOK:false,kitchenOK:false};
 if(!participants().length)return toast('أضف مشاركين أولًا.');
 openModal('<div class="catering-modal"><div class="catering-modal-head"><div class="catering-kicker">تجهيز غذائي خاص</div><h2>'+(id?'تعديل الحالة الغذائية':'تحديد مشارك بتغذية خاصة')+'</h2><p>وثّق الاحتياج الغذائي مع ولي الأمر والمطبخ قبل إعداد الوجبات.</p></div><div class="cp-form"><label>الطالب / المشارك<select id="cs-id" '+(id?'disabled':'')+'><option value="">اختر المشارك</option>'+participants().map(p=>'<option value="'+e(p.id)+'" '+(p.id===v.id?'selected':'')+'>'+e(p.name)+(p.demo?' (تجريبي)':'')+'</option>').join('')+'</select></label>'+
 '<label>نوع الاحتياج<select id="cs-kind">'+['حساسية غذائية','عدم تحمل غذائي','نظام غذائي خاص','حسب توجيه طبي'].map(t=>'<option '+(t===v.kind?'selected':'')+'>'+t+'</option>').join('')+'</select></label>'+
 '<div class="full"><b>المكونات التي يجب تجنبها</b><div class="cp-checkboxes">'+needs.map(t=>'<label><input type="checkbox" data-cs-allergen="'+e(t)+'" '+(v.allergens.includes(t)?'checked':'')+'>'+t+'</label>').join('')+'</div></div>'+
 '<label class="full">تعليمات معتمدة من ولي الأمر<textarea id="cs-notes" rows="3">'+e(v.notes)+'</textarea></label>'+
 '<label class="full cp-check"><input type="checkbox" id="cs-parent" '+(v.parentOK?'checked':'')+'> تم التحقق مع ولي الأمر</label>'+
 '<label class="full cp-check"><input type="checkbox" id="cs-kitchen" '+(v.kitchenOK?'checked':'')+'> أكد المطبخ القدرة على تجهيز الوجبة دون مكونات محظورة وتجنب التلوث التبادلي</label></div>'+
 '<div class="cp-actions"><button data-act="close">إلغاء</button><button class="primary" data-cp="save-special" data-id="'+e(id||'')+'">حفظ الحالة</button></div></div>');
}
function commit(){save();render({preserveScroll:true})}
function handle(b){
 const a=b.dataset.cp,id=b.dataset.id,d=db();
 if(a==='tab'){section=b.dataset.val;render({preserveScroll:true});return}
 if(a==='print-options'){printMealOptions();return}
 if(a==='print-report'){printMealReport();return}
 if(a==='day'){dayChoice=b.dataset.val;render({preserveScroll:true});return}
 if(a==='new-meal'||a==='edit-meal'){mealModal(id);return}
 if(a==='new-special'||a==='edit-special'){specialModal(id);return}
 if(a==='save-counts'){S.meta.students=n($('#cp-students').value);d.staff={supervisors:n($('#cp-supervisors').value),trainers:n($('#cp-trainers').value),other:n($('#cp-other').value)};commit();toast('حُفظت أعداد المستفيدين.');return}
 if(a==='add-team'){
  const name=$('#ct-name')?.value.trim(),role=$('#ct-role')?.value;
  if(!name||name.length<2)return toast('أدخل اسم المسؤول.');
  if(team().some(x=>x.name===name))return toast('هذا العضو مسجل مسبقًا.');
  team().push({id:newId('staff-'),name,role});commit();toast('تمت إضافة عضو الفريق.');return;
 }
 if(a==='del-team'){
  if(d.meals.some(m=>m.supervisorId===id))return toast('هذا العضو مسؤول عن وجبة. أسند الوجبات إلى مسؤول آخر أولًا.');
  if(confirm('حذف العضو من فريق المعسكر؟')){d.team=team().filter(x=>x.id!==id);commit()}return;
 }
 if(a==='add-person'){const name=$('#cp-person-name').value.trim();if(name.length<2)return toast('اكتب اسمًا واضحًا.');if(participants().some(p=>p.name===name))return toast('الاسم موجود مسبقًا.');d.people.push({id:newId('guest-'),name});commit();return}
 if(a==='del-person'){if(d.special.some(s=>s.id===id))return toast('احذف احتياج التغذية الخاص لهذا المشارك أولًا.');d.people=d.people.filter(p=>p.id!==id);commit();return}
 if(a==='del-meal'){if(confirm('حذف الوجبة من الخطة؟')){d.meals=d.meals.filter(m=>m.id!==id);commit()}return}
 if(a==='del-special'){if(confirm('حذف الحالة الغذائية؟')){d.special=d.special.filter(s=>s.id!==id);d.meals.forEach(m=>m.specialIds=(m.specialIds||[]).filter(x=>x!==id));commit()}return}
 if(a==='save-meal'){
  const m=d.meals.find(x=>x.id===id),newValue={id:m?.id||newId('meal-'),day:n($('#cm-day').value),type:$('#cm-type').value,time:$('#cm-time').value,menu:$('#cm-menu').value.trim(),supplier:$('#cm-supplier').value.trim(),supervisorId:$('#cm-supervisor').value,audienceMode:document.querySelector('input[name="cm-audience-mode"]:checked')?.value||'all',audienceIds:[...document.querySelectorAll('[data-cm-student]:checked')].map(el=>el.dataset.cmStudent),serviceMode:$('#cm-mode').value,peoplePerTray:n($('#cm-group-size').value),servingNotes:$('#cm-serving-notes').value.trim(),deliveryTime:$('#cm-delivery').value,serviceLocation:$('#cm-location').value.trim(),equipment:$('#cm-equipment').value.trim(),servings:n($('#cm-servings').value),unitPrice:money($('#cm-price').value),specialPrice:money($('#cm-special-price').value),specialMenu:$('#cm-special-menu').value.trim(),specialIds:$$('[data-cm-special]:checked').map(x=>x.dataset.cmSpecial),confirmed:$('#cm-confirmed').checked};
  if(!newValue.day||!newValue.menu||!newValue.time)return toast('اليوم وقائمة الطعام والتوقيت مطلوبة.');
  if(newValue.audienceMode==='selected'){
   newValue.servings=newValue.audienceIds.length;
   if(!newValue.audienceIds.length)return toast('اختر طالبًا واحدًا على الأقل لهذه الوجبة.');
   if(newValue.audienceIds.some(studentId=>!participants().some(p=>p.id===studentId)))return toast('بعض الطلاب المحددين لم يعودوا في القائمة.');
   if(newValue.specialIds.some(studentId=>!newValue.audienceIds.includes(studentId)))return toast('يجب أن يكون الطالب ذو الوجبة الخاصة ضمن الطلاب المحددين.');
  }else newValue.audienceIds=[];
  if(newValue.specialIds.length>newValue.servings)return toast('عدد المستفيدين أقل من الحالات الخاصة.');
  if(!newValue.supervisorId||!supervisorName(newValue.supervisorId))return toast('اختر المشرف المسؤول من فريق المعسكر قبل حفظ الوجبة.');
  if(newValue.serviceMode==='shared'&&(newValue.peoplePerTray<2||!newValue.servingNotes))return toast('حدد عدد الأشخاص لكل طبق وطريقة التقديم الجماعي.');
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
const extra=document.createElement('style');extra.textContent='.cp-team{margin-top:14px;display:grid;gap:10px}.cp-team label{display:grid;gap:5px}.cp-team select{font:inherit;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--fg)}.cp-team-list{display:grid;gap:7px}.cp-team-item{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding:5px}.cp-calc{background:var(--accentsoft);padding:12px;border-radius:9px}.cm-shared[hidden]{display:none!important}';document.head.append(extra);
document.addEventListener('change',ev=>{if(ev.target.closest('#modal')&&(ev.target.name==='cm-audience-mode'||ev.target.hasAttribute('data-cm-student')))updateMealPreview()},true);
document.addEventListener('input',ev=>{if(ev.target.id==='cm-student-search'){const query=ev.target.value.trim().toLocaleLowerCase();document.querySelectorAll('.cm-student-option').forEach(el=>el.hidden=!!query&&!el.dataset.studentName.includes(query));}},true);
document.addEventListener('click',ev=>{
 const btn=ev.target.closest('[data-catering]');if(!btn||!btn.closest('#modal'))return;
 ev.preventDefault();ev.stopImmediatePropagation();
 const visible=[...document.querySelectorAll('.cm-student-option')].filter(el=>!el.hidden);
 if(btn.dataset.catering==='select-visible')visible.forEach(el=>{const box=el.querySelector('[data-cm-student]');if(box)box.checked=true});
 if(btn.dataset.catering==='clear-students')document.querySelectorAll('[data-cm-student]').forEach(box=>box.checked=false);
 updateMealPreview();
},true);
document.addEventListener('input',ev=>{if(ev.target.closest('#modal')&&['cm-servings','cm-group-size','cm-price','cm-special-price'].includes(ev.target.id))updateMealPreview()},true);
document.addEventListener('change',ev=>{if(ev.target.closest('#modal')&&(ev.target.id==='cm-mode'||ev.target.hasAttribute('data-cm-special')))updateMealPreview()},true);
NAV[1][1].push(['meals','إدارة الوجبات والتغذية','Meals & catering']);
PAGE_TITLES.meals=['إدارة الوجبات والتغذية','Meal preparation'];
PAGES.meals=pageMeals;
document.addEventListener('click',event=>{const b=event.target.closest('[data-cp]');if(!b)return;event.preventDefault();event.stopImmediatePropagation();handle(b)},true);
if(location.hash==='#meals'||S.page==='meals')page='meals';
render({preserveScroll:true});
})();