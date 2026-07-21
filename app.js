const indicatorData = {
  activity: {
    label: "炎症 / 活动指标",
    items: {
      c3: { short: "C3", name: "补体 C3", unit: "g/L", low: .79, high: 1.52, max: 1.8, records: [
        ["2024-08-16", .42, "仁济医院", "初次建档"], ["2024-11-22", .47, "仁济医院", ""], ["2025-02-14", .45, "瑞金医院", "复查"], ["2025-06-21", .51, "仁济医院", ""], ["2025-10-09", .55, "仁济医院", "剂量调整后复查"], ["2026-03-12", .587, "仁济医院", ""], ["2026-06-26", .59, "仁济医院", "状态稳定"]
      ]},
      c4: { short: "C4", name: "补体 C4", unit: "g/L", low: .16, high: .38, max: .5, records: [["2024-08-16",.09,"仁济医院",""],["2024-11-22",.11,"仁济医院",""],["2025-06-21",.13,"仁济医院",""],["2026-03-12",.15,"仁济医院",""],["2026-06-26",.17,"仁济医院","进入参考范围"]] },
      dsdna: { short: "抗 dsDNA", name: "抗 dsDNA 抗体", unit: "IU/mL", low: 0, high: 100, max: 280, records: [["2024-08-16",240,"仁济医院",""],["2024-11-22",218,"仁济医院",""],["2025-06-21",176,"仁济医院",""],["2026-03-12",128,"仁济医院",""],["2026-06-26",106,"仁济医院","持续下降"]] },
      esr: { short: "血沉", name: "红细胞沉降率", unit: "mm/h", low: 0, high: 20, max: 65, records: [["2024-08-16",55,"仁济医院",""],["2025-02-14",42,"瑞金医院",""],["2025-10-09",31,"仁济医院",""],["2026-06-26",24,"仁济医院",""]] },
      crp: { short: "CRP", name: "C 反应蛋白", unit: "mg/L", low: 0, high: 8, max: 26, records: [["2024-08-16",18,"仁济医院",""],["2025-02-14",12,"瑞金医院",""],["2026-03-12",6.4,"仁济医院",""],["2026-06-26",5.8,"仁济医院",""]] }
    }
  },
  kidney: { label: "肾脏风险", items: {
    protein24: { short:"24 小时尿蛋白", name:"24 小时尿蛋白定量", unit:"g/24h", low:0, high:.15, max:1.2, records:[["2024-08-16",.92,"仁济医院",""],["2025-02-14",.64,"瑞金医院",""],["2025-10-09",.38,"仁济医院",""],["2026-06-26",.21,"仁济医院","继续观察"]] },
    upcr: { short:"尿蛋白肌酐比", name:"尿蛋白肌酐比", unit:"mg/g", low:0, high:150, max:700, records:[["2024-08-16",580,"仁济医院",""],["2025-06-21",390,"仁济医院",""],["2026-06-26",168,"仁济医院",""]] },
    egfr: { short:"eGFR", name:"肾小球滤过率", unit:"mL/min", low:90, high:130, max:150, records:[["2024-08-16",94,"仁济医院",""],["2025-06-21",98,"仁济医院",""],["2026-06-26",101,"仁济医院",""]] },
    creatinine: { short:"血肌酐", name:"血肌酐", unit:"μmol/L", low:41, high:73, max:110, records:[["2024-08-16",68,"仁济医院",""],["2025-06-21",65,"仁济医院",""],["2026-06-26",63,"仁济医院",""]] }
  }},
  blood: { label:"血象指标", items: {
    wbc:{short:"白细胞",name:"白细胞计数",unit:"×10⁹/L",low:3.5,high:9.5,max:12,records:[["2024-08-16",3.1,"仁济医院",""],["2025-06-21",3.6,"仁济医院",""],["2026-06-26",4.2,"仁济医院",""]]},
    hb:{short:"血红蛋白",name:"血红蛋白",unit:"g/L",low:115,high:150,max:180,records:[["2024-08-16",102,"仁济医院",""],["2025-06-21",111,"仁济医院",""],["2026-06-26",121,"仁济医院",""]]},
    platelets:{short:"血小板",name:"血小板计数",unit:"×10⁹/L",low:125,high:350,max:420,records:[["2024-08-16",118,"仁济医院",""],["2025-06-21",144,"仁济医院",""],["2026-06-26",168,"仁济医院",""]]}
  }},
  other:{label:"其他指标",items:{igg:{short:"IgG",name:"免疫球蛋白 G",unit:"g/L",low:7,high:16,max:22,records:[["2025-10-09",17.4,"仁济医院","自定义指标"],["2026-06-26",15.8,"仁济医院",""]]}}}
};

let currentCategory = "activity";
let currentIndicator = "c3";
let currentRange = "1y";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const formatDate = value => { const d = new Date(`${value}T00:00:00`); return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`; };
const formatLongDate = value => { const d = new Date(`${value}T00:00:00`); return `${d.getFullYear()} 年 ${d.getMonth()+1} 月 ${d.getDate()} 日`; };
const formatNumber = value => Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));

function currentItem(){ return indicatorData[currentCategory].items[currentIndicator]; }

const checkEntryFields={
  value:["activity","c3","unit","low","high"],c4Value:["activity","c4","c4Unit","c4Low","c4High"],dsdnaValue:["activity","dsdna","dsdnaUnit","dsdnaLow","dsdnaHigh"],esrValue:["activity","esr","esrUnit","esrLow","esrHigh"],crpValue:["activity","crp","crpUnit","crpLow","crpHigh"],
  protein24Value:["kidney","protein24","protein24Unit","protein24Low","protein24High"],upcrValue:["kidney","upcr","upcrUnit","upcrLow","upcrHigh"],egfrValue:["kidney","egfr","egfrUnit","egfrLow","egfrHigh"],creatinineValue:["kidney","creatinine","creatinineUnit","creatinineLow","creatinineHigh"],
  wbcValue:["blood","wbc","wbcUnit","wbcLow","wbcHigh"],hbValue:["blood","hb","hbUnit","hbLow","hbHigh"],plateletsValue:["blood","platelets","plateletsUnit","plateletsLow","plateletsHigh"],iggValue:["other","igg","iggUnit","iggLow","iggHigh"]
};

function latestEntered(item,index,fallback){
  const record=[...(item?.records||[])].reverse().find(row=>row[index]!==undefined&&row[index]!==null&&String(row[index]).trim()!=="");
  return record?record[index]:fallback;
}
function rememberedIndicatorFields(item){
  return {
    unit:item?.entryDefaults?.unit??latestEntered(item,4,item.unit),
    low:item?.entryDefaults?.low??latestEntered(item,5,item.low),
    high:item?.entryDefaults?.high??latestEntered(item,6,item.high)
  };
}
function rememberEntryFields(item,{unit,low,high,hospital}){
  const previous=item.entryDefaults||{};
  item.entryDefaults={...previous,unit,low,high,updatedAt:Date.now()};
  if(hospital&&hospital!=="未填写医院")item.entryDefaults.hospital=hospital;
}
function latestEnteredHospital(){
  const remembered=Object.values(indicatorData).flatMap(category=>Object.values(category.items)).map(item=>item.entryDefaults).filter(preference=>preference?.hospital).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];
  if(remembered)return remembered.hospital;
  const records=Object.values(indicatorData).flatMap(category=>Object.values(category.items).flatMap(item=>(item.records||[]).map((record,index)=>({record,index}))));
  records.sort((a,b)=>String(b.record[0]||"").localeCompare(String(a.record[0]||""))||b.index-a.index);
  return records.find(({record})=>record[2]&&record[2]!=="未填写医院")?.record[2]||"";
}
function applyQuickEntryDefaults(){
  const form=$("#quickForm"),item=currentItem(),remembered=rememberedIndicatorFields(item);
  form.elements.unit.value=remembered.unit??"";
  form.elements.low.value=remembered.low??"";
  form.elements.high.value=remembered.high??"";
  form.elements.hospital.value=latestEnteredHospital();
}
function applyCheckEntryDefaults(){
  const form=$("#checkForm");
  form.elements.hospital.value=latestEnteredHospital();
  Object.values(checkEntryFields).forEach(([category,key,unitField,lowField,highField])=>{
    const item=indicatorData[category]?.items[key];if(!item)return;
    const remembered=rememberedIndicatorFields(item);
    if(form.elements[unitField])form.elements[unitField].value=remembered.unit??"";
    if(form.elements[lowField])form.elements[lowField].value=remembered.low??"";
    if(form.elements[highField])form.elements[highField].value=remembered.high??"";
  });
}
window.SLEEntryDefaults={applyQuickEntryDefaults,applyCheckEntryDefaults,rememberedIndicatorFields,latestEnteredHospital};
$$('#checkForm input[name="low"],#checkForm input[name="high"],#checkForm input[name$="Low"],#checkForm input[name$="High"],#quickForm input[name="low"],#quickForm input[name="high"]').forEach(input=>input.step="any");

function renderPicker(){
  const picker = $("#indicatorPicker");
  const entries=Object.entries(indicatorData[currentCategory].items).filter(([,item])=>!item.isHidden);
  if(!entries.some(([key])=>key===currentIndicator))currentIndicator=entries[0]?.[0];
  picker.innerHTML = entries.length?entries.map(([key,item]) => `<button class="indicator-pill ${key===currentIndicator?"is-active":""}" data-indicator="${key}">${item.short}</button>`).join(""):`<span class="picker-no-items">当前分类没有显示中的指标</span>`;
  $$(".indicator-pill", picker).forEach(button => button.addEventListener("click", () => { currentIndicator = button.dataset.indicator; renderIndicator(); }));
}

function getStatus(value,item){ if(value<item.low) return ["偏低","warning","low"]; if(value>item.high) return ["偏高","error","low"]; return ["范围内","success","normal"]; }

function renderReferenceRail(value,low,high,itemMax){
  const numbers=[value,low,high,itemMax].map(Number).filter(Number.isFinite);
  let scaleMin=Math.min(...numbers,0),scaleMax=Math.max(...numbers,1);
  if(scaleMin<0)scaleMin*=1.12;
  if(scaleMax>0)scaleMax*=scaleMax===Number(itemMax)?1:1.12;
  if(scaleMax<=scaleMin)scaleMax=scaleMin+1;
  const span=scaleMax-scaleMin,position=number=>Math.min(100,Math.max(0,(Number(number)-scaleMin)/span*100));
  const rangeStart=position(Math.min(low,high)),rangeEnd=position(Math.max(low,high));
  const normalRange=$(".normal-range"),labels=$$(".rail-labels span");
  if(normalRange){normalRange.style.left=`${rangeStart}%`;normalRange.style.right=`${100-rangeEnd}%`;}
  if(Number.isFinite(Number(value)))$("#valuePin").style.left=`${Math.min(98,Math.max(2,position(value)))}%`;
  if(labels[0])labels[0].textContent=formatNumber(scaleMin);
  if(labels.at(-1))labels.at(-1).textContent=formatNumber(scaleMax);
}

function renderIndicator(){
  renderPicker();
  const item=currentItem();if(!item)return;
  const latest=item.records.at(-1), previous=item.records.at(-2);
  $("#indicatorFullName").textContent=item.name;$("#historyCount").textContent=item.records.length;$("#rangeLabel").textContent=`参考范围 ${formatNumber(item.low)}-${formatNumber(item.high)}`;$("#chartUnit").textContent=item.unit;$("#trendChart").setAttribute("aria-label",`${item.name}长期趋势图`);$("#quickModalTitle").textContent=`添加 ${item.short} 数据`;const units=new Set(item.records.map(record=>record[4]||item.unit));$("#unitMismatchWarning").hidden=units.size<2;
  if(!latest){$("#latestValue").textContent="暂无";$("#latestUnit").textContent=item.unit;$("#statusBadge").className="status-badge neutral";$("#statusBadge").textContent="暂无数据";$("#changeLine").innerHTML="<span>添加第一条检查结果后，这里会显示变化情况。</span>";$("#valuePin").style.display="none";renderReferenceRail(NaN,item.low,item.high,item.max);renderChart();renderHistory();if(window.lucide)lucide.createIcons();return;}
  $("#valuePin").style.display="block";
  const latestUnit=latest[4]||item.unit,latestLow=latest[5]??item.low,latestHigh=latest[6]??item.high,previousUnit=previous?.[4]||item.unit,comparable=!previous||previousUnit===latestUnit,delta=previous&&comparable?latest[1]-previous[1]:0,status=getStatus(latest[1],{low:latestLow,high:latestHigh});
  $("#indicatorFullName").textContent=item.name; $("#latestValue").textContent=formatNumber(latest[1]); $("#latestUnit").textContent=latestUnit;$("#rangeLabel").textContent=`参考范围 ${formatNumber(latestLow)}-${formatNumber(latestHigh)}`;
  $("#statusBadge").className=`status-badge ${status[1]}`; $("#statusBadge").textContent=status[0]; renderReferenceRail(latest[1],latestLow,latestHigh,item.max);
  const direction=delta>=0?"上升":"下降"; $("#changeLine").innerHTML=previous&&!comparable?`<span class="trend-up"><i data-lucide="triangle-alert"></i>与上次单位不同，暂不计算变化</span><span>${formatLongDate(latest[0])}</span>`:`<span class="trend-up"><i data-lucide="trending-${delta>=0?"up":"down"}"></i>${previous?`较上次${direction} ${formatNumber(Math.abs(delta))} ${latestUnit}`:"首条检查记录"}</span><span>${formatLongDate(latest[0])}</span>`;
  renderChart(); renderHistory(); if(window.lucide) lucide.createIcons();
}

function filteredRecords(records){
  if(!records.length)return [];
  if(currentRange==="all") return records; const months={"6m":6,"1y":12,"2y":24}[currentRange]; const latest=new Date(`${records.at(-1)[0]}T00:00:00`); const cutoff=new Date(latest); cutoff.setMonth(cutoff.getMonth()-months); const result=records.filter(r=>new Date(`${r[0]}T00:00:00`)>=cutoff); return result.length?result:records.slice(-1);
}

function renderChart(){
  const item=currentItem(), records=filteredRecords(item.records), svg=$("#trendChart"), mobile=window.matchMedia("(max-width: 767px)").matches,wrapWidth=$('.chart-wrap')?.clientWidth||0; const W=mobile?Math.max(280,wrapWidth):960,H=mobile?230:300,pad=mobile?{l:38,r:10,t:14,b:34}:{l:44,r:18,t:18,b:38};let plotW=W-pad.l-pad.r;const plotH=H-pad.t-pad.b;svg.setAttribute("viewBox",`0 0 ${W} ${H}`);svg.setAttribute("preserveAspectRatio","xMidYMid meet");
  if(!records.length){const emptyTop=H*.26,emptyHeight=H*.4;svg.innerHTML=`<rect class="range-area" x="${pad.l}" y="${emptyTop}" width="${plotW}" height="${emptyHeight}" rx="8"/><text class="axis-label" x="${pad.l+plotW/2}" y="${emptyTop+emptyHeight/2-7}" text-anchor="middle">暂无趋势数据</text><text class="axis-label" x="${pad.l+plotW/2}" y="${emptyTop+emptyHeight/2+14}" text-anchor="middle">添加检查结果后自动生成曲线</text>`;return;}
  const lowDate=new Date(`${records[0][0]}T00:00:00`).getTime(), highDate=new Date(`${records.at(-1)[0]}T00:00:00`).getTime(), dateSpan=Math.max(1,highDate-lowDate);
  const yMax=Math.max(item.max,...records.map(r=>r[1]))*1.08;if(mobile){pad.l=Math.min(76,Math.max(38,16+formatNumber(yMax).length*6));plotW=W-pad.l-pad.r;}const x=v=>pad.l+(new Date(`${v}T00:00:00`).getTime()-lowDate)/dateSpan*plotW, y=v=>pad.t+(1-v/yMax)*plotH;
  let html=""; for(let i=0;i<5;i++){const yy=pad.t+i*plotH/4,val=yMax*(1-i/4);html+=`<line class="grid-line" x1="${pad.l}" y1="${yy}" x2="${W-pad.r}" y2="${yy}"/><text class="axis-label" x="${pad.l-10}" y="${yy+4}" text-anchor="end">${formatNumber(val)}</text>`;}
  const rangeTop=y(item.high),rangeBottom=y(item.low); html+=`<rect class="range-area" x="${pad.l}" y="${rangeTop}" width="${plotW}" height="${Math.max(2,rangeBottom-rangeTop)}" rx="3"/>`;
  const pts=records.map(r=>[x(r[0]),y(r[1]),r]); html+=`<path class="trend-path" d="${pts.map((p,i)=>`${i?"L":"M"}${p[0]},${p[1]}`).join(" ")}"/>`;
  records.forEach((r,i)=>{const p=pts[i];html+=`<circle class="trend-dot" tabindex="0" data-index="${i}" cx="${p[0]}" cy="${p[1]}" r="3.4"/>`;});
  const labels=[records[0],records[Math.floor((records.length-1)/2)],records.at(-1)]; const unique=[...new Map(labels.map(r=>[r[0],r])).values()]; unique.forEach(r=>html+=`<text class="axis-label" x="${x(r[0])}" y="${H-10}" text-anchor="middle">${formatDate(r[0]).slice(0,7)}</text>`); svg.innerHTML=html;
  $$(".trend-dot",svg).forEach(dot=>{ const show=()=>showTooltip(dot,records[Number(dot.dataset.index)]); dot.addEventListener("mouseenter",show); dot.addEventListener("focus",show); dot.addEventListener("mouseleave",hideTooltip); dot.addEventListener("blur",hideTooltip); });
}

function showTooltip(dot,r){ const item=currentItem(),tip=$("#chartTooltip"),wrap=$(".chart-wrap"),svg=$("#trendChart"),unit=r[4]||item.unit,low=r[5]??item.low,high=r[6]??item.high; const box=svg.getBoundingClientRect(),wrapBox=wrap.getBoundingClientRect(),viewBox=svg.viewBox.baseVal,cx=Number(dot.getAttribute("cx"))/viewBox.width*box.width+(box.left-wrapBox.left),cy=Number(dot.getAttribute("cy"))/viewBox.height*box.height+(box.top-wrapBox.top); tip.innerHTML=`<span>${formatLongDate(r[0])}</span><strong>${formatNumber(r[1])} ${unit}</strong><span>参考范围 ${formatNumber(low)}-${formatNumber(high)} · ${r[2]}</span>`;tip.style.left=`${cx}px`;tip.style.top=`${cy}px`;tip.classList.add("is-visible"); }
function hideTooltip(){ $("#chartTooltip").classList.remove("is-visible"); }

function renderHistory(){ const item=currentItem();if(!item.records.length){$("#historyBody").innerHTML=`<tr class="empty-table-row"><td colspan="6"><div class="inline-empty"><span><i data-lucide="clipboard-plus"></i></span><strong>暂无检查记录</strong><small>录入第一条结果后，将在这里按时间展示。</small></div></td></tr>`;return;}$("#historyBody").innerHTML=[...item.records].reverse().map(r=>{const low=r[5]??item.low,high=r[6]??item.high,unit=r[4]||item.unit,status=r[1]<low?["偏低","low"]:r[1]>high?["偏高","low"]:["范围内","normal"];return `<tr><td data-label="检查日期">${formatDate(r[0])}</td><td data-label="检查结果" class="numeric">${formatNumber(r[1])} <small>${unit}</small><span class="record-status ${status[1]}">${status[0]}</span></td><td data-label="参考范围">${formatNumber(low)}-${formatNumber(high)} ${unit}</td><td data-label="医院">${r[2]}</td><td data-label="备注">${r[3]||"未填写"}</td><td><div class="row-actions"><button class="icon-button small" data-history-action="edit" data-record-date="${r[0]}" aria-label="编辑记录"><i data-lucide="pencil"></i></button><button class="icon-button small" data-history-action="delete" data-record-date="${r[0]}" aria-label="删除记录"><i data-lucide="trash-2"></i></button></div></td></tr>`}).join(""); }

function switchView(view){
  $$('[data-view-panel]').forEach(panel=>panel.classList.toggle("is-active",panel.dataset.viewPanel===view));
  $$(".nav-item").forEach(item=>{const active=item.dataset.view===view;item.classList.toggle("is-active",active);if(active)item.setAttribute("aria-current","page");else item.removeAttribute("aria-current");});
  $("#breadcrumbTitle").textContent={indicators:"指标",medications:"用药",profile:"我的"}[view]; window.scrollTo({top:0,behavior:"smooth"});
}

function openModal(id){ const modal=document.getElementById(id); if(!modal)return; modal.classList.add("is-open");modal.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";setTimeout(()=>$("input,button",modal)?.focus(),50); }
function closeModal(modal){ if(!modal)return;modal.classList.remove("is-open");modal.setAttribute("aria-hidden","true");if(!$(".modal.is-open"))document.body.style.overflow=""; }
function showToast(title="保存成功",description="趋势图和最新结果已同步更新"){ const toast=$("#toast");$("strong",toast).textContent=title;$("small",toast).textContent=description;toast.classList.add("is-visible");clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove("is-visible"),4500); }
function saveQuick(form){ const fd=new FormData(form),item=currentItem(),unit=fd.get("unit")||item.unit,low=fd.get("low")===""?item.low:Number(fd.get("low")),high=fd.get("high")===""?item.high:Number(fd.get("high")),hospital=fd.get("hospital")||"未填写医院";rememberEntryFields(item,{unit,low,high,hospital});item.records.push([fd.get("date"),Number(fd.get("value")),hospital,fd.get("notes")||"",unit,low,high,item.name]);item.max=Math.max(item.max||0,high*1.2,Number(fd.get("value"))*1.2);item.records.sort((a,b)=>a[0].localeCompare(b[0]));renderIndicator();closeModal(form.closest(".modal"));form.reset();window.dispatchEvent(new CustomEvent("sle:data-changed"));showToast(); }

const medicationColorOptions=[
  {name:"淡蓝",value:"#DDEBFF"},{name:"雾蓝",value:"#E4ECF5"},{name:"天青",value:"#D9F0F4"},
  {name:"薄荷绿",value:"#DDF3EA"},{name:"淡绿色",value:"#E4F2D8"},{name:"青绿色",value:"#D8F0E0"},
  {name:"奶油黄",value:"#FFF1C7"},{name:"柠檬黄",value:"#F8F0B8"},{name:"杏色",value:"#FBE4CC"},
  {name:"淡橙色",value:"#FFE0C2"},{name:"淡粉色",value:"#F9DCE5"},{name:"玫瑰粉",value:"#F6D1D8"},
  {name:"淡紫色",value:"#EADDF7"},{name:"薰衣草",value:"#DDDDF8"},{name:"灰紫色",value:"#E8E2ED"}
];
window.SLE_MEDICATION_COLORS=medicationColorOptions;
const defaultMedicationColor=medicationColorOptions[0];
function medicationColorPickerHTML(){
  const options=medicationColorOptions.map((color,index)=>`<label class="med-color-option" title="${color.name}"><input type="radio" name="color" value="${color.value}" data-color-name="${color.name}" ${index===0?"checked":""} /><span class="med-color-swatch" style="--med-icon-bg:${color.value}"><i data-lucide="check"></i></span><span class="sr-only">${color.name}</span></label>`).join("");
  return `<fieldset class="med-color-fieldset"><legend>药品标识颜色</legend><p>用于药物卡片的药片图标背景，方便快速区分不同药物。</p><div class="med-color-grid" role="radiogroup" aria-label="选择药品标识颜色">${options}</div><div class="med-color-preview"><span class="med-color-preview-icon" style="--med-icon-bg:${defaultMedicationColor.value}"><i data-lucide="pill"></i></span><span>当前选择 <strong data-med-color-name>${defaultMedicationColor.name}</strong></span></div></fieldset>`;
}
function medicationColor(value){return medicationColorOptions.find(color=>color.value.toUpperCase()===String(value||"").toUpperCase())||defaultMedicationColor;}
const medicationDosageFormIcons={"片剂":"pill","胶囊剂":"pill","颗粒剂":"package","口服液":"cup-soda","注射液":"syringe","预充式注射剂":"syringe","冻干粉针剂":"snowflake","乳膏 / 软膏":"paintbrush","滴眼液":"eye","其他":"shapes"};
function medicationDosageIcon(dosageForm,recordType){return medicationDosageFormIcons[dosageForm]||(recordType==="biologic"?"syringe":recordType==="infusion"?"droplets":recordType==="other"?"clipboard-plus":"pill");}
window.SLEMedicationDosageIcon=medicationDosageIcon;

const medicationFormConfigs={
  longTerm:{kicker:"LONG-TERM MEDICATION",title:"添加长期用药",description:"剂量、频率或品牌变化时，应创建新的用药阶段。",submit:"保存长期用药",html:`
    <section class="med-form-section"><div class="med-form-section-head"><h3>药物信息</h3><p>记录当前阶段实际使用的药物与品牌</p></div><div class="form-grid">
      <label><span>药物通用名称 *</span><input name="name" required placeholder="例如：泼尼松" /></label><label><span>商品名或品牌</span><input name="brand" placeholder="例如：醋酸泼尼松片" /></label>
      <label><span>药物分类</span><select name="category"><option>糖皮质激素</option><option>免疫抑制剂</option><option>抗疟药</option><option>生物制剂 / 单抗</option><option>输注 / 冲击治疗</option><option>辅助用药</option><option>其他治疗</option></select></label><label><span>剂型</span><select name="dosageForm"><option value="">请选择剂型</option><option data-icon="pill">片剂</option><option data-icon="pill">胶囊剂</option><option data-icon="package">颗粒剂</option><option data-icon="cup-soda">口服液</option><option data-icon="syringe">注射液</option><option data-icon="syringe">预充式注射剂</option><option data-icon="snowflake">冻干粉针剂</option><option data-icon="paintbrush">乳膏 / 软膏</option><option data-icon="eye">滴眼液</option><option data-icon="shapes">其他</option></select></label>
    </div>${medicationColorPickerHTML()}</section>
    <section class="med-form-section"><div class="med-form-section-head"><h3>当前用药阶段</h3><p>结束日期留空表示目前仍在使用</p></div><div class="form-grid three-columns">
      <label><span>开始日期 *</span><input name="startDate" type="date" required /></label><label><span>结束日期</span><input name="endDate" type="date" /></label><label><span>单次剂量 *</span><input name="dose" type="number" step="0.001" required placeholder="0.000" /></label>
      <label><span>剂量单位</span><select name="unit"><option>mg</option><option>g</option><option>μg</option><option>mL</option><option>IU</option><option>U</option><option>片</option><option>粒</option><option>支</option><option>瓶</option><option>自定义单位</option></select></label><label><span>使用频率</span><select name="frequency"><option>每日一次</option><option>每日两次</option><option>每日三次</option><option>每日四次</option><option>隔日一次</option><option>每周一次</option><option>每两周一次</option><option>每四周一次</option><option>每月一次</option><option>按疗程</option><option>必要时使用</option><option>自定义频率</option></select></label><label><span>给药途径</span><select name="route"><option>口服</option><option>皮下注射</option><option>静脉注射</option><option>静脉输注</option><option>肌内注射</option><option>外用</option><option>其他</option></select></label>
    </div></section>
    <section class="med-form-section"><div class="med-form-section-head"><h3>补充说明</h3></div><div class="form-grid">
      <label><span>医院或医生</span><input name="hospital" placeholder="选填" /></label><label><span>用药原因</span><input name="purpose" placeholder="选填" /></label><label class="med-form-full"><span>原始用药说明</span><textarea name="instruction" placeholder="按处方或医嘱原文记录"></textarea></label><label class="med-form-full"><span>备注</span><textarea name="notes" placeholder="记录个人补充说明"></textarea></label>
    </div></section>`},
  biologic:{kicker:"BIOLOGIC TREATMENT PLAN",title:"添加单抗或生物制剂",description:"先建立治疗方案；每次实际给药需在方案中单独记录。",submit:"保存治疗方案",html:`
    <section class="med-form-section"><div class="med-form-section-head"><h3>治疗方案</h3><p>计划日期不会被系统自动认定为已经完成给药</p></div><div class="form-grid">
      <label><span>药物名称 *</span><input name="name" required placeholder="例如：贝利尤单抗" /></label><label><span>商品名或品牌</span><input name="brand" placeholder="例如：倍力腾" /></label>
      <label><span>疗程开始日期 *</span><input name="startDate" type="date" required /></label><label><span>疗程结束日期</span><input name="endDate" type="date" /></label>
    </div><div class="form-grid three-columns">
      <label><span>计划单次剂量 *</span><input name="dose" type="number" step="0.001" required placeholder="0.000" /></label><label><span>剂量单位</span><select name="unit"><option>mg</option><option>g</option><option>mL</option><option>IU</option><option>支</option></select></label><label><span>计划频率</span><select name="frequency"><option>每周一次</option><option>每两周一次</option><option>每四周一次</option><option>每月一次</option><option>按疗程</option></select></label>
      <label><span>给药途径</span><select name="route"><option>皮下注射</option><option>静脉输注</option><option>静脉注射</option></select></label><label><span>医院</span><input name="hospital" placeholder="选填" /></label><label><span>首次给药状态</span><select name="completionStatus"><option>尚未记录</option><option>按计划完成</option><option>延期</option><option>取消</option></select></label>
      <label class="med-form-full"><span>方案备注</span><textarea name="notes" placeholder="记录医生说明或方案细节"></textarea></label>
    </div></section>`},
  infusion:{kicker:"INFUSION / PULSE THERAPY",title:"添加输注或冲击治疗",description:"适用于短期静脉治疗、冲击疗程和其他阶段性治疗。",submit:"保存治疗疗程",html:`
    <section class="med-form-section"><div class="med-form-section-head"><h3>治疗信息</h3></div><div class="form-grid">
      <label><span>治疗名称 *</span><input name="name" required placeholder="例如：甲泼尼龙冲击" /></label><label><span>治疗类型</span><select name="category"><option>冲击治疗</option><option>静脉输注</option><option>短期静脉治疗</option><option>血浆置换</option><option>其他短期疗程</option></select></label>
      <label><span>开始日期 *</span><input name="startDate" type="date" required /></label><label><span>结束日期</span><input name="endDate" type="date" /></label>
    </div></section>
    <section class="med-form-section"><div class="med-form-section-head"><h3>剂量与实施</h3></div><div class="form-grid three-columns">
      <label><span>单次剂量</span><input name="dose" type="number" step="0.001" placeholder="0.000" /></label><label><span>每日剂量</span><input name="dailyDose" type="number" step="0.001" placeholder="0.000" /></label><label><span>累计剂量</span><input name="cumulativeDose" type="number" step="0.001" placeholder="0.000" /></label>
      <label><span>剂量单位</span><select name="unit"><option>mg</option><option>g</option><option>mL</option><option>IU</option><option>次</option></select></label><label><span>实施次数</span><input name="sessionCount" type="number" min="1" placeholder="例如：5" /></label><label><span>医院</span><input name="hospital" placeholder="选填" /></label>
      <label><span>科室</span><input name="department" placeholder="选填" /></label><label><span>治疗原因</span><input name="purpose" placeholder="选填" /></label><label><span>不良反应</span><input name="adverseReaction" placeholder="没有可留空" /></label>
      <label class="med-form-full"><span>备注</span><textarea name="notes" placeholder="记录疗程和实施情况"></textarea></label>
    </div></section>`},
  other:{kicker:"OTHER TREATMENT",title:"添加其他治疗",description:"用于记录无法归入常规药物、单抗或输注疗程的治疗。",submit:"保存其他治疗",html:`
    <section class="med-form-section"><div class="med-form-section-head"><h3>治疗记录</h3></div><div class="form-grid">
      <label><span>治疗名称 *</span><input name="name" required placeholder="输入治疗名称" /></label><label><span>治疗类型</span><input name="category" placeholder="例如：康复治疗" /></label>
      <label><span>开始日期 *</span><input name="startDate" type="date" required /></label><label><span>结束日期</span><input name="endDate" type="date" /></label>
      <label><span>医院或机构</span><input name="hospital" placeholder="选填" /></label><label><span>治疗原因</span><input name="purpose" placeholder="选填" /></label>
      <label class="med-form-full"><span>治疗内容</span><textarea name="instruction" placeholder="记录治疗方式、频率或执行内容"></textarea></label><label class="med-form-full"><span>备注</span><textarea name="notes" placeholder="记录个人观察或补充说明"></textarea></label>
    </div></section>`}
};
const escapeHTML=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
function openMedicationForm(type){
  const config=medicationFormConfigs[type];if(!config)return;
  $("#medicationFormKicker").textContent=config.kicker;$("#medicationFormTitle").textContent=config.title;$("#medicationFormDescription").textContent=config.description;$("#medicationRecordType").value=type;$("#medicationFormFields").innerHTML=config.html;$("#saveMedicationRecord").textContent=config.submit;
  if(window.lucide)lucide.createIcons();
  closeModal($("#medicationModal"));openModal("medicationFormModal");
}
function addMedicationRecord(data){
  const type=data.recordType,name=escapeHTML(data.name),brand=escapeHTML(data.brand||data.category||"未填写品牌"),dose=escapeHTML(data.dose||data.dailyDose||"未填写"),unit=escapeHTML(data.unit||""),frequency=escapeHTML(data.frequency||data.sessionCount?`${data.frequency||data.sessionCount}${data.frequency?"":" 次"}`:"按记录执行"),start=escapeHTML(data.startDate?.replaceAll("-",".")||"未填写"),endDate=String(data.endDate||"").trim(),end=escapeHTML(endDate.replaceAll("-",".")),color=medicationColor(data.color),dosageForm=escapeHTML(data.dosageForm||"");
  if(type==="longTerm"||type==="biologic"){
    const icon=medicationDosageIcon(data.dosageForm,type),status=endDate?"已停药":"使用中",statusKey=endDate?"stopped":"active",period=endDate?`${start} 至 ${end}`:`${start} 至今`;
    $(".medication-cards .wide-empty")?.remove();$(".medication-cards").insertAdjacentHTML("beforeend",`<article class="med-card dynamic-med-card" data-medication-color="${color.value}" data-medication-status="${statusKey}" data-medication-dosage-form="${dosageForm}"><div class="med-card-head"><span class="med-icon" style="--med-icon-bg:${color.value}" title="${dosageForm?`剂型：${dosageForm} · `:""}标识颜色：${color.name}"><i data-lucide="${icon}"></i></span><span class="status-badge medication-status status-${statusKey}">${status}</span></div><h3>${name}</h3><p>${brand}</p><div class="dose"><strong>${dose}</strong><span>${unit}${frequency?` · ${frequency}`:""}</span></div><dl><div><dt>用药阶段</dt><dd>${period}</dd></div><div><dt>最近调整</dt><dd>${endDate?`${end} · 结束用药`:"刚刚 · 开始用药"}</dd></div></dl><div class="card-actions"><button>${type==="biologic"?"记录给药":"调整剂量"}</button><button class="icon-button small" aria-label="更多操作"><i data-lucide="more-horizontal"></i></button></div></article>`);
    $("#currentMedicationCount").textContent=$$(".med-card").length;
    const lanes=$("#medicationLanes"),laneExists=$$(".medication-lane",lanes).some(lane=>$(".drug-name",lane)?.textContent.trim()===String(data.name||"").trim());
    if(!laneExists){const laneContent=type==="biologic"?`<div class="lane-track nodes"><i style="left:85%"></i></div>`:`<div class="lane-track"><span class="drug-bar dynamic-drug-bar">${dose}${unit?` ${unit}`:""}${frequency?` · ${frequency}`:""}</span></div>`;$(".causality-note",lanes).insertAdjacentHTML("beforebegin",`<div class="medication-lane" data-medication-name="${name}" style="--med-color:${color.value}"><span class="drug-name">${name}</span>${laneContent}</div>`);}
    const timeline=$(".timeline-scroll"),timelineExists=$$(".timeline-row",timeline).some(row=>$("strong",row)?.childNodes[0]?.textContent.trim()===String(data.name||"").trim());
    if(!timelineExists){const category=escapeHTML(data.category||(type==="biologic"?"生物制剂":"长期用药")),timelineContent=type==="biologic"?`<div class="timeline-track timeline-nodes"><i style="left:85%"></i></div>`:`<div class="timeline-track"><span class="stage dynamic-stage">${dose}${unit?` ${unit}`:""}${frequency?` · ${frequency}`:""}</span></div>`;timeline.insertAdjacentHTML("beforeend",`<div class="timeline-row dynamic-med-card" data-medication-name="${name}" style="--med-color:${color.value}"><strong>${name}<small>${category}</small></strong>${timelineContent}</div>`);}
  }else{
    const category=escapeHTML(data.category||"其他治疗"),label=escapeHTML(data.startDate?.replaceAll("-",".")||"新增记录");
    $(".timeline-scroll").insertAdjacentHTML("beforeend",`<div class="timeline-row dynamic-med-card" data-medication-name="${name}" style="--med-color:${color.value}"><strong>${name}<small>${category}</small></strong><div class="timeline-track"><span class="stage dynamic-stage">${label}${data.sessionCount?` · ${escapeHTML(data.sessionCount)} 次`:""}</span></div></div>`);
  }
  if(window.lucide)lucide.createIcons();
}

function updateLabItemSelection(){
  const selected=$$(".lab-item-option input:checked",$("#labItemGroups"));
  const button=$("#addSelectedLabItems");
  button.disabled=!selected.length;
  button.textContent=selected.length?`添加所选 ${selected.length} 项`:"添加所选项目";
}
function appendLabEntry(option){
  if(option.classList.contains("is-added"))return;
  const {key,name}=option.dataset;
  const item=Object.values(indicatorData).map(category=>category.items[key]).find(Boolean);
  const remembered=rememberedIndicatorFields(item||option.dataset);
  const unit=remembered.unit??option.dataset.unit??"",low=remembered.low??option.dataset.low??"",high=remembered.high??option.dataset.high??"";
  $(".lab-entry-list").insertAdjacentHTML("beforeend",`<div class="lab-entry" data-item-key="${key}"><strong>${name}</strong><label><span>结果</span><input name="${key}Value" type="number" step="0.001" placeholder="0.000" /></label><label><span>单位</span><input name="${key}Unit" value="${unit}" /></label><label><span>参考下限</span><input name="${key}Low" type="number" step="any" value="${low}" /></label><label><span>参考上限</span><input name="${key}High" type="number" step="any" value="${high}" /></label></div>`);
  option.classList.add("is-added");
  const checkbox=$("input",option);checkbox.checked=false;checkbox.disabled=true;
  option.insertAdjacentHTML("beforeend","<em>已添加</em>");
}

$$('[data-view]').forEach(button=>button.addEventListener("click",()=>switchView(button.dataset.view)));
$$('[data-open-modal]').forEach(button=>button.addEventListener("click",()=>{if(button.dataset.openModal==="quickModal")applyQuickEntryDefaults();if(button.dataset.openModal==="checkModal")applyCheckEntryDefaults();openModal(button.dataset.openModal);}));
$$('[data-close-modal]').forEach(button=>button.addEventListener("click",()=>closeModal(button.closest(".modal"))));
$$('.category-tab').forEach(button=>button.addEventListener("click",()=>{ currentCategory=button.dataset.category;currentIndicator=Object.keys(indicatorData[currentCategory].items)[0];$$('.category-tab').forEach(tab=>{const active=tab===button;tab.classList.toggle("is-active",active);tab.setAttribute("aria-selected",String(active));});renderIndicator(); }));
$$('.check-category-tab').forEach(button=>button.addEventListener("click",()=>{$$('.check-category-tab').forEach(tab=>{const active=tab===button;tab.classList.toggle("is-active",active);tab.setAttribute("aria-selected",String(active));});$$('.check-category-panel').forEach(panel=>{const active=panel.dataset.checkPanel===button.dataset.checkCategory;panel.classList.toggle("is-active",active);panel.hidden=!active;});}));
$$('.chart-controls .segmented button').forEach(button=>button.addEventListener("click",()=>{currentRange=button.dataset.range;button.parentElement.querySelectorAll("button").forEach(b=>b.classList.toggle("is-active",b===button));renderChart();}));
$$('[data-medication-type]').forEach(button=>button.addEventListener("click",()=>openMedicationForm(button.dataset.medicationType)));
$('#backToMedicationTypes').addEventListener("click",()=>{closeModal($('#medicationFormModal'));openModal('medicationModal');});
$('#medicationDetailForm').addEventListener("change",event=>{const form=event.currentTarget,preview=$(".med-color-preview-icon",form);if(event.target.name==="color"){const color=medicationColor(event.target.value),name=$("[data-med-color-name]",form);if(preview)preview.style.setProperty("--med-icon-bg",color.value);if(name)name.textContent=color.name;}if(event.target.name==="dosageForm"&&preview){preview.innerHTML=`<i data-lucide="${medicationDosageIcon(event.target.value,form.elements.recordType?.value)}"></i>`;if(window.lucide)lucide.createIcons();}});
$('#medicationSwitch').addEventListener("change",event=>$('#medicationLanes').classList.toggle("is-hidden",!event.target.checked));
$$('.theme-toggle').forEach(button=>button.addEventListener("click",()=>{const root=document.documentElement,dark=root.dataset.theme!=="dark";root.dataset.theme=dark?"dark":"light";$$('.theme-toggle').forEach(b=>b.innerHTML=`<i data-lucide="${dark?"sun":"moon"}"></i>`);if(window.lucide)lucide.createIcons();}));
$('#quickForm').addEventListener("submit",event=>{event.preventDefault();saveQuick(event.currentTarget)});
$('#checkForm').addEventListener("submit",event=>{
  event.preventDefault();
  const form=event.currentTarget,fd=new FormData(form);
  const now=new Date(),today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const recordDate=String(fd.get("date")||"").trim()||today;
  const hospital=String(fd.get("hospital")||"").trim()||"未填写医院";
  const optionalNumber=(field,fallback)=>{const raw=fd.get(field);return raw===null||String(raw).trim()===""?fallback:Number(raw);};
  let firstSaved=null,savedCount=0;

  Object.entries(checkEntryFields).forEach(([field,[category,key,unitField,lowField,highField]])=>{
    const raw=fd.get(field);
    if(raw===null||String(raw).trim()==="")return;
    const value=Number(raw),item=indicatorData[category]?.items[key];
    if(!item||!Number.isFinite(value))return;
    const unit=String(fd.get(unitField)||"").trim()||item.unit;
    const low=optionalNumber(lowField,item.low),high=optionalNumber(highField,item.high);
    rememberEntryFields(item,{unit,low,high,hospital});
    item.max=Math.max(item.max||0,high*1.2,value*1.2);
    item.records.push([recordDate,value,hospital,fd.get("notes")||"",unit,low,high,item.name]);
    item.records.sort((a,b)=>a[0].localeCompare(b[0]));
    if(!firstSaved)firstSaved=[category,key];
    savedCount++;
  });

  if(!firstSaved){showToast("没有可保存的结果","请至少填写一个检查指标的结果");return;}
  [currentCategory,currentIndicator]=firstSaved;
  $$('.category-tab').forEach(tab=>{const active=tab.dataset.category===currentCategory;tab.classList.toggle('is-active',active);tab.setAttribute('aria-selected',String(active));});
  renderIndicator();
  window.dispatchEvent(new CustomEvent("sle:data-changed"));
  closeModal(form.closest(".modal"));
  form.reset();
  showToast("检查记录已保存",`已记录 ${savedCount} 个已填写指标`);
});
$('#indicatorForm').addEventListener("submit",event=>event.preventDefault());
$('#medicationDetailForm').addEventListener("submit",event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));addMedicationRecord(data);window.dispatchEvent(new CustomEvent("sle:medication-added",{detail:data}));closeModal($('#medicationFormModal'));event.currentTarget.reset();const historical=["longTerm","biologic"].includes(data.recordType)&&data.endDate;showToast(historical?"历史用药已保存":"用药记录已保存",historical?"已加入“暂停/停止”列表和历年用药时间轴":data.recordType==="longTerm"||data.recordType==="biologic"?"已加入当前用药并创建首个阶段":"已加入历年用药时间轴");});
$$('.lab-item-option input:not(:disabled)').forEach(input=>input.addEventListener("change",updateLabItemSelection));
$('#labItemSearch').addEventListener("input",event=>{const query=event.target.value.trim().toLowerCase();let visibleCount=0;$$('.lab-item-group').forEach(group=>{let groupCount=0;$$('.lab-item-option',group).forEach(option=>{const visible=!query||option.dataset.search.toLowerCase().includes(query);option.hidden=!visible;if(visible){groupCount++;visibleCount++;}});group.hidden=!groupCount;});$('#labItemEmpty').classList.toggle("is-visible",!visibleCount);});
$('#addSelectedLabItems').addEventListener("click",()=>{const selected=$$(".lab-item-option input:checked",$('#labItemGroups'));selected.forEach(input=>appendLabEntry(input.closest('.lab-item-option')));updateLabItemSelection();closeModal($('#labItemModal'));if(window.lucide)lucide.createIcons();});
$('#toast button').addEventListener("click",()=>$('#toast').classList.remove("is-visible"));
document.addEventListener("keydown",event=>{if(event.key==="Escape")closeModal($$(".modal.is-open").at(-1));});
let chartResizeTimer;window.addEventListener("resize",()=>{clearTimeout(chartResizeTimer);chartResizeTimer=setTimeout(renderChart,120);});
renderIndicator(); if(window.lucide)lucide.createIcons();
