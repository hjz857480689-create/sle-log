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
const urineVolumeOf = record => {
  const raw = record?.[8]?.volume;
  if(raw===undefined||raw===null||String(raw).trim()==="")return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

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
  const urineFields=$("#quickUrineVolumeFields"),isProtein24=currentCategory==="kidney"&&currentIndicator==="protein24";
  urineFields.hidden=!isProtein24;
  form.elements.urineVolume.disabled=!isProtein24;
  form.elements.urineVolume.value="";
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

const indicatorDescriptions={
  wbc:"反映免疫防御与感染风险",hb:"反映携氧能力与贫血程度",platelets:"反映凝血和骨髓造血状态",
  c3:"补体消耗可用于辅助观察疾病活动",c4:"与 C3 结合观察补体消耗变化",dsdna:"辅助观察 SLE 活动度的特异性抗体",esr:"反映体内炎症反应的非特异性指标",crp:"反映急性炎症与感染变化",
  protein24:"观察 24 小时内尿蛋白总量",upcr:"用单次尿样评估尿蛋白水平",egfr:"估算肾小球滤过功能",creatinine:"反映肾脏滤过与代谢废物清除能力"
};
const expandedIndicatorHistoryCards=new Set();
const indicatorHistoryPages=new Map();

function indicatorRangeLabel(){return {"6m":"近 6 个月","1y":"近 1 年","3y":"3 年","all":"全部"}[currentRange]||"近 1 年";}

function miniTrendChart(item,records){
  const W=720,H=150,pad={l:18,r:18,t:18,b:28};
  if(!records.length)return `<div class="indicator-mini-empty"><i data-lucide="chart-no-axes-column-increasing"></i><span>暂无趋势数据</span></div>`;
  const latest=records.at(-1),low=Number(latest[5]??item.low),high=Number(latest[6]??item.high),values=[...records.map(record=>Number(record[1])),low,high].filter(Number.isFinite);
  let min=Math.min(...values),max=Math.max(...values);const reserve=Math.max((max-min)*.18,Math.abs(max||1)*.06,.01);min-=reserve;max+=reserve;if(max<=min)max=min+1;
  const start=new Date(`${records[0][0]}T00:00:00`).getTime(),end=new Date(`${records.at(-1)[0]}T00:00:00`).getTime(),span=Math.max(1,end-start),plotW=W-pad.l-pad.r,plotH=H-pad.t-pad.b;
  const x=date=>pad.l+(new Date(`${date}T00:00:00`).getTime()-start)/span*plotW,y=value=>pad.t+(max-Number(value))/(max-min)*plotH;
  const rangeTop=Math.min(y(low),y(high)),rangeBottom=Math.max(y(low),y(high)),points=records.map(record=>[x(record[0]),y(record[1]),record]);
  const path=points.length===1?"":`<path class="indicator-mini-path" d="${points.map((point,index)=>`${index?"L":"M"}${point[0].toFixed(2)},${point[1].toFixed(2)}`).join(" ")}"/>`;
  const dots=points.map(point=>{
    const date=point[2][0],value=formatNumber(point[2][1]),unit=point[2][4]||item.unit,label=`${formatLongDate(date)}：${value} ${unit}`;
    return `<g class="indicator-mini-point" role="button" tabindex="0" data-point-series="${escapeHTML(item.name)}" data-point-date="${escapeHTML(date)}" data-point-value="${escapeHTML(value)}" data-point-unit="${escapeHTML(unit)}" aria-label="${escapeHTML(label)}"><circle class="indicator-mini-hit" cx="${point[0].toFixed(2)}" cy="${point[1].toFixed(2)}" r="22"/><circle class="indicator-mini-ring" cx="${point[0].toFixed(2)}" cy="${point[1].toFixed(2)}" r="9.5"/><circle class="indicator-mini-dot" cx="${point[0].toFixed(2)}" cy="${point[1].toFixed(2)}" r="5"/></g>`;
  }).join("");
  const volumeRecords=records.filter(record=>urineVolumeOf(record)!==null),volumeMax=volumeRecords.length?Math.max(...volumeRecords.map(record=>urineVolumeOf(record)),1)*1.15:1,yVolume=value=>pad.t+(1-Number(value)/volumeMax)*plotH;
  const volumePoints=volumeRecords.map(record=>[x(record[0]),yVolume(urineVolumeOf(record)),record]);
  const volumePath=volumePoints.length>1?`<path class="indicator-mini-volume-path" d="${volumePoints.map((point,index)=>`${index?"L":"M"}${point[0].toFixed(2)},${point[1].toFixed(2)}`).join(" ")}"/>`:"";
  const volumeDots=volumePoints.map(point=>{const date=point[2][0],value=formatNumber(urineVolumeOf(point[2])),label=`${formatLongDate(date)}：尿量 ${value} 毫升`;return `<g class="indicator-mini-point indicator-mini-volume-point" role="button" tabindex="0" data-point-series="尿量" data-point-date="${escapeHTML(date)}" data-point-value="${escapeHTML(value)}" data-point-unit="毫升" aria-label="${escapeHTML(label)}"><circle class="indicator-mini-hit" cx="${point[0].toFixed(2)}" cy="${point[1].toFixed(2)}" r="22"/><circle class="indicator-mini-ring" cx="${point[0].toFixed(2)}" cy="${point[1].toFixed(2)}" r="9.5"/><circle class="indicator-mini-dot indicator-mini-volume-dot" cx="${point[0].toFixed(2)}" cy="${point[1].toFixed(2)}" r="4.5"/></g>`;}).join("");
  const startLabel=formatDate(records[0][0]).slice(0,7),endLabel=formatDate(records.at(-1)[0]).slice(0,7);
  const legend=volumePoints.length?`<div class="indicator-dual-legend"><span><i></i>尿蛋白（${escapeHTML(item.unit)}）</span><span><i></i>尿量（毫升）</span></div>`:"";
  return `<svg class="indicator-mini-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHTML(item.name)}${indicatorRangeLabel()}趋势图"><rect class="indicator-mini-range" x="${pad.l}" y="${rangeTop.toFixed(2)}" width="${plotW}" height="${Math.max(3,rangeBottom-rangeTop).toFixed(2)}" rx="5"/><line class="indicator-mini-limit" x1="${pad.l}" y1="${y(high).toFixed(2)}" x2="${W-pad.r}" y2="${y(high).toFixed(2)}"/><line class="indicator-mini-limit" x1="${pad.l}" y1="${y(low).toFixed(2)}" x2="${W-pad.r}" y2="${y(low).toFixed(2)}"/>${path}${volumePath}${dots}${volumeDots}<text class="indicator-mini-date" x="${pad.l}" y="${H-6}">${startLabel}</text>${endLabel!==startLabel?`<text class="indicator-mini-date" x="${W-pad.r}" y="${H-6}" text-anchor="end">${endLabel}</text>`:""}</svg>${legend}<div class="indicator-mini-tooltip" role="status" aria-live="polite" aria-hidden="true"><time></time><strong></strong><small></small></div>`;
}

function hideIndicatorPointTooltip(chart,force=false){
  if(!chart)return;
  const tooltip=$(".indicator-mini-tooltip",chart);
  if(!tooltip||(!force&&tooltip.classList.contains("is-pinned")))return;
  tooltip.classList.remove("is-visible","is-pinned");
  tooltip.setAttribute("aria-hidden","true");
  $$(".indicator-mini-point.is-active",chart).forEach(point=>point.classList.remove("is-active"));
}

function showIndicatorPointTooltip(point,pinned=false){
  const chart=point?.closest(".indicator-card-chart"),tooltip=chart&&$(".indicator-mini-tooltip",chart),dot=point&&$(".indicator-mini-dot",point);
  if(!chart||!tooltip||!dot)return;
  $$(".indicator-mini-point.is-active",chart).forEach(item=>item.classList.remove("is-active"));
  point.classList.add("is-active");
  $("time",tooltip).textContent=formatLongDate(point.dataset.pointDate);
  $("strong",tooltip).textContent=`${point.dataset.pointValue} ${point.dataset.pointUnit}`;
  const series=$("small",tooltip);if(series)series.textContent=point.dataset.pointSeries||"检查结果";
  const chartRect=chart.getBoundingClientRect(),dotRect=dot.getBoundingClientRect(),rawX=dotRect.left+dotRect.width/2-chartRect.left;
  tooltip.style.left=`${rawX}px`;
  tooltip.style.top=`${Math.max(8,dotRect.top-chartRect.top-8)}px`;
  tooltip.classList.add("is-visible");
  tooltip.classList.toggle("is-pinned",pinned);
  tooltip.setAttribute("aria-hidden","false");
  const inset=8,half=tooltip.offsetWidth/2;
  tooltip.style.left=`${Math.min(chart.clientWidth-half-inset,Math.max(half+inset,rawX))}px`;
}

function indicatorMedicationContext(records){
  const chartStart=records.length?new Date(`${records[0][0]}T00:00:00`).getTime():-Infinity,chartEnd=records.length?new Date(`${records.at(-1)[0]}T23:59:59`).getTime():Infinity;
  const cards=$$(".med-card").filter(card=>{
    const period=$("dl dd",card)?.textContent.trim()||"",dates=period.match(/\d{4}\.\d{2}\.\d{2}/g)||[];
    if(!dates.length)return true;
    const start=new Date(`${dates[0].replaceAll(".","-")}T00:00:00`).getTime(),end=dates[1]?new Date(`${dates[1].replaceAll(".","-")}T23:59:59`).getTime():Infinity;
    return start<=chartEnd&&end>=chartStart;
  });
  if(!cards.length)return `<div class="indicator-medication-empty"><i data-lucide="pill"></i><span><strong>该时间段暂无用药</strong><small>添加用药记录后，将用于时间对照。</small></span></div>`;
  return `<div class="indicator-medication-grid">${cards.map(card=>{const name=$("h3",card)?.textContent.trim()||"未命名药品",dose=$(".dose",card)?.textContent.replace(/\s+/g," ").trim()||"未记录剂量",status=$(".medication-status",card)?.textContent.trim()||$(".status-badge",card)?.textContent.trim()||"已记录",period=$("dl dd",card)?.textContent.trim()||"已纳入当前时间对照",color=card.dataset.medicationColor||"#E4ECF5";return `<div class="indicator-medication-item" style="--med-color:${escapeHTML(color)}"><i></i><span><strong>${escapeHTML(name)}</strong><small>${escapeHTML(dose)} · ${escapeHTML(period)}</small></span><em>${escapeHTML(status)}</em></div>`;}).join("")}</div>`;
}

function indicatorRecentRecords(key,item){
  const allRecords=[...item.records].reverse(),pageSize=5,pageToken=`${currentCategory}:${key}`,totalPages=Math.max(1,Math.ceil(allRecords.length/pageSize)),page=Math.min(totalPages,Math.max(1,indicatorHistoryPages.get(pageToken)||1)),records=allRecords.slice((page-1)*pageSize,page*pageSize);
  indicatorHistoryPages.set(pageToken,page);
  if(!records.length)return "";
  const pagination=totalPages>1?`<nav class="indicator-history-pagination" aria-label="${escapeHTML(item.name)}历史记录翻页"><button type="button" data-history-page="${page-1}" data-history-page-key="${key}" ${page===1?"disabled":""} aria-label="上一页"><i data-lucide="chevron-left"></i><span>上一页</span></button><small>${page} / ${totalPages}</small><button type="button" data-history-page="${page+1}" data-history-page-key="${key}" ${page===totalPages?"disabled":""} aria-label="下一页"><span>下一页</span><i data-lucide="chevron-right"></i></button></nav>`:"";
  return `<div class="indicator-recent-records"><h4>历史记录</h4>${records.map(record=>{const volume=key==="protein24"?urineVolumeOf(record):null;return `<div class="indicator-record-row"><time>${formatDate(record[0])}</time><strong>${formatNumber(record[1])} <small>${escapeHTML(record[4]||item.unit)}</small>${volume!==null?`<em>尿量 ${formatNumber(volume)} 毫升</em>`:""}</strong><span>${escapeHTML(record[2]||"未填写医院")}</span><span class="indicator-record-actions"><button type="button" class="icon-button small" data-indicator-record="${key}" data-history-action="edit" data-record-date="${record[0]}" aria-label="编辑 ${formatDate(record[0])} 记录"><i data-lucide="pencil"></i></button><button type="button" class="icon-button small" data-indicator-record="${key}" data-history-action="delete" data-record-date="${record[0]}" aria-label="删除 ${formatDate(record[0])} 记录"><i data-lucide="trash-2"></i></button></span></div>`;}).join("")}${pagination}</div>`;
}

function renderIndicatorList(){
  const list=$("#indicatorTrendList");if(!list)return;
  const entries=Object.entries(indicatorData[currentCategory].items).filter(([,item])=>!item.isHidden);
  list.innerHTML=entries.length?entries.map(([key,item])=>{
    const latest=item.records.at(-1),records=filteredRecords(item.records),low=latest?.[5]??item.low,high=latest?.[6]??item.high,status=latest?getStatus(latest[1],{low,high}):["暂无数据","neutral","empty"],statusText=status[0]==="范围内"?"正常":status[0],expanded=expandedIndicatorHistoryCards.has(`${currentCategory}:${key}`),panelId=`indicator-history-${currentCategory}-${key}`,latestVolume=key==="protein24"?urineVolumeOf(latest):null;
    return `<article class="indicator-trend-card status-${status[1]}" data-indicator-card="${key}">
      <div class="indicator-card-summary"><div class="indicator-card-copy"><div class="indicator-card-title"><h2>${escapeHTML(item.name)}</h2><span class="status-badge ${status[1]}">${statusText}</span></div><p>${escapeHTML(indicatorDescriptions[key]||item.notes||`连续观察${item.name}的长期变化`)}</p><small>参考 ${formatNumber(low)}-${formatNumber(high)} ${escapeHTML(latest?.[4]||item.unit)}</small></div><div class="indicator-card-value"><strong>${latest?formatNumber(latest[1]):"--"}</strong><span>${escapeHTML(latest?.[4]||item.unit)}</span>${latestVolume!==null?`<small>尿量 ${formatNumber(latestVolume)} 毫升</small>`:""}</div></div>
      <div class="indicator-card-chart">${miniTrendChart(item,records)}</div>
      <div class="indicator-card-actions"><button type="button" class="indicator-add-data" data-indicator-add="${key}"><i data-lucide="plus"></i>添加数据</button><button type="button" class="indicator-expand" data-indicator-history="${key}" aria-expanded="${expanded}" aria-controls="${panelId}"><span>${expanded?"收起历史记录":"查看历史记录"}</span><i data-lucide="chevron-down"></i></button></div>
      <div class="indicator-card-details indicator-history-details" id="${panelId}" ${expanded?"":"hidden"}>${indicatorRecentRecords(key,item)}</div>
    </article>`;
  }).join(""):`<div class="indicator-list-empty"><i data-lucide="chart-no-axes-column-increasing"></i><strong>当前分类没有显示中的指标</strong><small>可以添加新指标，或从指标设置中恢复已隐藏项。</small></div>`;
  if(window.lucide)lucide.createIcons();
}
window.renderIndicatorList=renderIndicatorList;

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
  renderIndicatorList();
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
  if(currentRange==="all") return records; const months={"6m":6,"1y":12,"2y":24,"3y":36}[currentRange]||12; const latest=new Date(`${records.at(-1)[0]}T00:00:00`); const cutoff=new Date(latest); cutoff.setMonth(cutoff.getMonth()-months); const result=records.filter(r=>new Date(`${r[0]}T00:00:00`)>=cutoff); return result.length?result:records.slice(-1);
}

function renderChart(){
  const item=currentItem(), records=filteredRecords(item.records), svg=$("#trendChart"), mobile=window.matchMedia("(max-width: 767px)").matches,wrapWidth=$('.chart-wrap')?.clientWidth||0,isProtein24=currentCategory==="kidney"&&currentIndicator==="protein24",volumeRecords=isProtein24?records.filter(record=>urineVolumeOf(record)!==null):[]; const W=mobile?Math.max(280,wrapWidth):960,H=mobile?230:300,pad=mobile?{l:38,r:volumeRecords.length?46:10,t:14,b:34}:{l:44,r:volumeRecords.length?60:18,t:18,b:38};let plotW=W-pad.l-pad.r;const plotH=H-pad.t-pad.b;svg.setAttribute("viewBox",`0 0 ${W} ${H}`);svg.setAttribute("preserveAspectRatio","xMidYMid meet");
  if(!records.length){const emptyTop=H*.26,emptyHeight=H*.4;svg.innerHTML=`<rect class="range-area" x="${pad.l}" y="${emptyTop}" width="${plotW}" height="${emptyHeight}" rx="8"/><text class="axis-label" x="${pad.l+plotW/2}" y="${emptyTop+emptyHeight/2-7}" text-anchor="middle">暂无趋势数据</text><text class="axis-label" x="${pad.l+plotW/2}" y="${emptyTop+emptyHeight/2+14}" text-anchor="middle">添加检查结果后自动生成曲线</text>`;return;}
  const lowDate=new Date(`${records[0][0]}T00:00:00`).getTime(), highDate=new Date(`${records.at(-1)[0]}T00:00:00`).getTime(), dateSpan=Math.max(1,highDate-lowDate);
  const yMax=Math.max(item.max,...records.map(r=>r[1]))*1.08;if(mobile){pad.l=Math.min(76,Math.max(38,16+formatNumber(yMax).length*6));plotW=W-pad.l-pad.r;}const x=v=>pad.l+(new Date(`${v}T00:00:00`).getTime()-lowDate)/dateSpan*plotW, y=v=>pad.t+(1-v/yMax)*plotH;
  let html=""; for(let i=0;i<5;i++){const yy=pad.t+i*plotH/4,val=yMax*(1-i/4);html+=`<line class="grid-line" x1="${pad.l}" y1="${yy}" x2="${W-pad.r}" y2="${yy}"/><text class="axis-label" x="${pad.l-10}" y="${yy+4}" text-anchor="end">${formatNumber(val)}</text>`;}
  const rangeTop=y(item.high),rangeBottom=y(item.low); html+=`<rect class="range-area" x="${pad.l}" y="${rangeTop}" width="${plotW}" height="${Math.max(2,rangeBottom-rangeTop)}" rx="3"/>`;
  const pts=records.map(r=>[x(r[0]),y(r[1]),r]); html+=`<path class="trend-path" d="${pts.map((p,i)=>`${i?"L":"M"}${p[0]},${p[1]}`).join(" ")}"/>`;
  records.forEach((r,i)=>{const p=pts[i];html+=`<circle class="trend-dot" tabindex="0" data-index="${i}" cx="${p[0]}" cy="${p[1]}" r="3.4"/>`;});
  if(volumeRecords.length){
    const volumeMax=Math.max(...volumeRecords.map(record=>urineVolumeOf(record)),1)*1.12,yVolume=value=>pad.t+(1-Number(value)/volumeMax)*plotH,volumePts=volumeRecords.map(record=>[x(record[0]),yVolume(urineVolumeOf(record)),record]);
    if(volumePts.length>1)html+=`<path class="trend-volume-path" d="${volumePts.map((point,index)=>`${index?"L":"M"}${point[0]},${point[1]}`).join(" ")}"/>`;
    volumePts.forEach((point,index)=>{html+=`<circle class="trend-volume-dot" tabindex="0" data-volume-index="${index}" cx="${point[0]}" cy="${point[1]}" r="3.2"/>`;});
    html+=`<text class="axis-label volume-axis" x="${W-pad.r+8}" y="${pad.t+4}">${formatNumber(volumeMax)}</text><text class="axis-label volume-axis" x="${W-pad.r+8}" y="${pad.t+plotH}">0</text><text class="axis-label volume-axis" x="${W-pad.r+8}" y="${pad.t+plotH/2}" transform="rotate(90 ${W-pad.r+8} ${pad.t+plotH/2})" text-anchor="middle">尿量（毫升）</text>`;
  }
  const labels=[records[0],records[Math.floor((records.length-1)/2)],records.at(-1)]; const unique=[...new Map(labels.map(r=>[r[0],r])).values()]; unique.forEach(r=>html+=`<text class="axis-label" x="${x(r[0])}" y="${H-10}" text-anchor="middle">${formatDate(r[0]).slice(0,7)}</text>`); svg.innerHTML=html;
  $$(".trend-dot",svg).forEach(dot=>{ const show=()=>showTooltip(dot,records[Number(dot.dataset.index)]); dot.addEventListener("mouseenter",show); dot.addEventListener("focus",show); dot.addEventListener("mouseleave",hideTooltip); dot.addEventListener("blur",hideTooltip); });
  $$(".trend-volume-dot",svg).forEach(dot=>{const show=()=>showTooltip(dot,volumeRecords[Number(dot.dataset.volumeIndex)],"volume");dot.addEventListener("mouseenter",show);dot.addEventListener("focus",show);dot.addEventListener("mouseleave",hideTooltip);dot.addEventListener("blur",hideTooltip);});
}

function showTooltip(dot,r,series="indicator"){ const item=currentItem(),tip=$("#chartTooltip"),wrap=$(".chart-wrap"),svg=$("#trendChart"),unit=r[4]||item.unit,low=r[5]??item.low,high=r[6]??item.high; const box=svg.getBoundingClientRect(),wrapBox=wrap.getBoundingClientRect(),viewBox=svg.viewBox.baseVal,cx=Number(dot.getAttribute("cx"))/viewBox.width*box.width+(box.left-wrapBox.left),cy=Number(dot.getAttribute("cy"))/viewBox.height*box.height+(box.top-wrapBox.top); tip.innerHTML=series==="volume"?`<span>${formatLongDate(r[0])}</span><strong>${formatNumber(urineVolumeOf(r))} 毫升</strong><span>24 小时尿量 · ${r[2]}</span>`:`<span>${formatLongDate(r[0])}</span><strong>${formatNumber(r[1])} ${unit}</strong><span>参考范围 ${formatNumber(low)}-${formatNumber(high)} · ${r[2]}</span>`;tip.style.left=`${cx}px`;tip.style.top=`${cy}px`;tip.classList.add("is-visible"); }
function hideTooltip(){ $("#chartTooltip").classList.remove("is-visible"); }

function renderHistory(){ const item=currentItem();if(!item.records.length){$("#historyBody").innerHTML=`<tr class="empty-table-row"><td colspan="6"><div class="inline-empty"><span><i data-lucide="clipboard-plus"></i></span><strong>暂无检查记录</strong><small>录入第一条结果后，将在这里按时间展示。</small></div></td></tr>`;return;}$("#historyBody").innerHTML=[...item.records].reverse().map(r=>{const low=r[5]??item.low,high=r[6]??item.high,unit=r[4]||item.unit,status=r[1]<low?["偏低","low"]:r[1]>high?["偏高","low"]:["范围内","normal"],volume=currentIndicator==="protein24"?urineVolumeOf(r):null;return `<tr><td data-label="检查日期">${formatDate(r[0])}</td><td data-label="检查结果" class="numeric">${formatNumber(r[1])} <small>${unit}</small>${volume!==null?`<span class="record-companion">尿量 ${formatNumber(volume)} 毫升</span>`:""}<span class="record-status ${status[1]}">${status[0]}</span></td><td data-label="参考范围">${formatNumber(low)}-${formatNumber(high)} ${unit}</td><td data-label="医院">${r[2]}</td><td data-label="备注">${r[3]||"未填写"}</td><td><div class="row-actions"><button class="icon-button small" data-history-action="edit" data-record-date="${r[0]}" aria-label="编辑记录"><i data-lucide="pencil"></i></button><button class="icon-button small" data-history-action="delete" data-record-date="${r[0]}" aria-label="删除记录"><i data-lucide="trash-2"></i></button></div></td></tr>`}).join(""); }

function switchView(view){
  $$('[data-view-panel]').forEach(panel=>panel.classList.toggle("is-active",panel.dataset.viewPanel===view));
  $$(".nav-item").forEach(item=>{const active=item.dataset.view===view;item.classList.toggle("is-active",active);if(active)item.setAttribute("aria-current","page");else item.removeAttribute("aria-current");});
  $("#breadcrumbTitle").textContent={indicators:"指标",medications:"用药",profile:"我的"}[view]; window.scrollTo({top:0,behavior:"smooth"});
}

function openModal(id){ const modal=document.getElementById(id); if(!modal)return; modal.classList.add("is-open");modal.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";setTimeout(()=>$("input,button",modal)?.focus(),50); }
function closeModal(modal){ if(!modal)return;modal.classList.remove("is-open");modal.setAttribute("aria-hidden","true");if(!$(".modal.is-open"))document.body.style.overflow=""; }
function showToast(title="保存成功",description="趋势图和最新结果已同步更新"){ const toast=$("#toast");$("strong",toast).textContent=title;$("small",toast).textContent=description;toast.classList.add("is-visible");clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove("is-visible"),4500); }
function saveQuick(form){
  const fd=new FormData(form),item=currentItem(),unit=fd.get("unit")||item.unit,low=fd.get("low")===""?item.low:Number(fd.get("low")),high=fd.get("high")===""?item.high:Number(fd.get("high")),hospital=fd.get("hospital")||"未填写医院",value=Number(fd.get("value"));
  rememberEntryFields(item,{unit,low,high,hospital});
  const record=[fd.get("date"),value,hospital,fd.get("notes")||"",unit,low,high,item.name],volumeRaw=fd.get("urineVolume"),volume=currentCategory==="kidney"&&currentIndicator==="protein24"&&volumeRaw!==null&&String(volumeRaw).trim()!==""?Number(volumeRaw):null;
  if(Number.isFinite(volume))record[8]={volume};
  item.records.push(record);item.max=Math.max(item.max||0,high*1.2,value*1.2);item.records.sort((a,b)=>a[0].localeCompare(b[0]));renderIndicator();closeModal(form.closest(".modal"));form.reset();window.dispatchEvent(new CustomEvent("sle:data-changed"));showToast("保存成功",Number.isFinite(volume)?"尿蛋白和尿量已加入对照曲线":"趋势图和最新结果已同步更新");
}

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
    <section class="med-form-section"><div class="med-form-section-head"><h3>备注</h3></div><div class="form-grid one-column">
      <label><span>备注（选填）</span><textarea name="notes" placeholder="记录需要补充的用药信息"></textarea></label>
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
    const primaryAction=type==="biologic"?`<button data-medication-primary-action="administration" ${endDate?"hidden":""}>记录给药</button>`:"";
    $(".medication-cards .wide-empty")?.remove();$(".medication-cards").insertAdjacentHTML("beforeend",`<article class="med-card dynamic-med-card" data-medication-color="${color.value}" data-medication-status="${statusKey}" data-medication-record-type="${escapeHTML(type)}" data-medication-start-date="${escapeHTML(data.startDate||"")}" data-medication-end-date="${escapeHTML(endDate)}" data-medication-dosage-form="${dosageForm}"><div class="med-card-head"><span class="med-icon" style="--med-icon-bg:${color.value}" title="${dosageForm?`剂型：${dosageForm} · `:""}标识颜色：${color.name}"><i data-lucide="${icon}"></i></span><span class="status-badge medication-status status-${statusKey}">${status}</span></div><h3>${name}</h3><p>${brand}</p><div class="dose"><strong>${dose}</strong><span>${unit}${frequency?` · ${frequency}`:""}</span></div><dl><div><dt>用药阶段</dt><dd>${period}</dd></div><div><dt>最近调整</dt><dd>${endDate?`${end} · 结束用药`:"刚刚 · 开始用药"}</dd></div></dl><div class="card-actions">${primaryAction}<button class="icon-button small" aria-label="更多操作"><i data-lucide="more-horizontal"></i></button></div></article>`);
    $("#currentMedicationCount").textContent=$$(".med-card").length;
    const timeline=$(".timeline-scroll"),timelineExists=$$(".timeline-row",timeline).some(row=>$("strong",row)?.childNodes[0]?.textContent.trim()===String(data.name||"").trim());
    if(!timelineExists){const category=escapeHTML(data.category||(type==="biologic"?"生物制剂":"长期用药")),timelineContent=type==="biologic"?`<div class="timeline-track timeline-nodes"><i style="left:85%"></i></div>`:`<div class="timeline-track"><span class="stage dynamic-stage">${dose}${unit?` ${unit}`:""}${frequency?` · ${frequency}`:""}</span></div>`;timeline.insertAdjacentHTML("beforeend",`<div class="timeline-row dynamic-med-card" data-medication-name="${name}" style="--med-color:${color.value}"><strong>${name}<small>${category}</small></strong>${timelineContent}</div>`);}
  }else if(type==="other"){
    const icon=medicationDosageIcon(data.dosageForm,type),category=escapeHTML(data.category||"其他治疗"),status=endDate?"已停药":"使用中",statusKey=endDate?"stopped":"active",period=endDate?`${start} 至 ${end}`:`${start} 至今`,hospital=escapeHTML(data.hospital||"未填写机构");
    $(".medication-cards .wide-empty")?.remove();
    $(".medication-cards").insertAdjacentHTML("beforeend",`<article class="med-card dynamic-med-card other-treatment-card" data-medication-color="${color.value}" data-medication-status="${statusKey}" data-medication-record-type="other" data-medication-start-date="${escapeHTML(data.startDate||"")}" data-medication-end-date="${escapeHTML(endDate)}"><div class="med-card-head"><span class="med-icon" style="--med-icon-bg:${color.value}" title="其他治疗 · 标识颜色：${color.name}"><i data-lucide="${icon}"></i></span><span class="status-badge medication-status status-${statusKey}">${status}</span></div><h3>${name}</h3><p>${category}</p><dl><div><dt>治疗阶段</dt><dd>${period}</dd></div><div><dt>医院或机构</dt><dd>${hospital}</dd></div></dl><div class="card-actions"><button class="icon-button small" aria-label="${name}更多操作"><i data-lucide="more-horizontal"></i></button></div></article>`);
    $("#currentMedicationCount").textContent=$$(".med-card").length;
    const label=escapeHTML(data.startDate?.replaceAll("-",".")||"新增记录");
    $(".timeline-scroll").insertAdjacentHTML("beforeend",`<div class="timeline-row dynamic-med-card" data-medication-name="${name}" style="--med-color:${color.value}"><strong>${name}<small>${category}</small></strong><div class="timeline-track"><span class="stage dynamic-stage">${label}</span></div></div>`);
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
$$('[data-category-range]').forEach(button=>button.addEventListener("click",()=>{currentRange=button.dataset.categoryRange;$$('[data-category-range]').forEach(rangeButton=>rangeButton.classList.toggle("is-active",rangeButton===button));renderIndicatorList();}));
$$('.check-category-tab').forEach(button=>button.addEventListener("click",()=>{$$('.check-category-tab').forEach(tab=>{const active=tab===button;tab.classList.toggle("is-active",active);tab.setAttribute("aria-selected",String(active));});$$('.check-category-panel').forEach(panel=>{const active=panel.dataset.checkPanel===button.dataset.checkCategory;panel.classList.toggle("is-active",active);panel.hidden=!active;});}));
$$('.chart-controls .segmented button').forEach(button=>button.addEventListener("click",()=>{currentRange=button.dataset.range;button.parentElement.querySelectorAll("button").forEach(b=>b.classList.toggle("is-active",b===button));renderChart();}));
$$('[data-medication-type]').forEach(button=>button.addEventListener("click",()=>openMedicationForm(button.dataset.medicationType)));
$('#backToMedicationTypes').addEventListener("click",()=>{closeModal($('#medicationFormModal'));openModal('medicationModal');});
$('#medicationDetailForm').addEventListener("change",event=>{const form=event.currentTarget,preview=$(".med-color-preview-icon",form);if(event.target.name==="color"){const color=medicationColor(event.target.value),name=$("[data-med-color-name]",form);if(preview)preview.style.setProperty("--med-icon-bg",color.value);if(name)name.textContent=color.name;}if(event.target.name==="dosageForm"&&preview){preview.innerHTML=`<i data-lucide="${medicationDosageIcon(event.target.value,form.elements.recordType?.value)}"></i>`;if(window.lucide)lucide.createIcons();}});
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
    const record=[recordDate,value,hospital,fd.get("notes")||"",unit,low,high,item.name];
    if(key==="protein24"){
      const volumeRaw=fd.get("protein24UrineVolume"),volume=volumeRaw!==null&&String(volumeRaw).trim()!==""?Number(volumeRaw):null;
      if(Number.isFinite(volume))record[8]={volume};
    }
    item.records.push(record);
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
document.addEventListener("click",event=>{
  const chartPoint=event.target.closest('[data-point-date]');
  if(chartPoint){
    const chart=chartPoint.closest(".indicator-card-chart"),tooltip=$(".indicator-mini-tooltip",chart),wasPinned=tooltip?.classList.contains("is-pinned")&&chartPoint.classList.contains("is-active");
    if(wasPinned)hideIndicatorPointTooltip(chart,true);else showIndicatorPointTooltip(chartPoint,true);
    return;
  }
  $$(".indicator-mini-tooltip.is-pinned").forEach(tooltip=>hideIndicatorPointTooltip(tooltip.closest(".indicator-card-chart"),true));
  const pageButton=event.target.closest('[data-history-page]');
  if(pageButton&&!pageButton.disabled){const key=pageButton.dataset.historyPageKey,token=`${currentCategory}:${key}`;indicatorHistoryPages.set(token,Number(pageButton.dataset.historyPage));renderIndicatorList();return;}
  const historyButton=event.target.closest('[data-indicator-history]');
  if(historyButton){const key=historyButton.dataset.indicatorHistory,token=`${currentCategory}:${key}`;if(expandedIndicatorHistoryCards.has(token))expandedIndicatorHistoryCards.delete(token);else expandedIndicatorHistoryCards.add(token);renderIndicatorList();return;}
  const addButton=event.target.closest('[data-indicator-add]');
  if(addButton){currentIndicator=addButton.dataset.indicatorAdd;renderIndicator();applyQuickEntryDefaults();openModal('quickModal');return;}
  const recordButton=event.target.closest('[data-indicator-record]');
  if(recordButton)currentIndicator=recordButton.dataset.indicatorRecord;
});
document.addEventListener("pointerover",event=>{const point=event.target.closest('[data-point-date]');if(point&&!point.closest(".indicator-card-chart")?.querySelector(".indicator-mini-tooltip.is-pinned"))showIndicatorPointTooltip(point);});
document.addEventListener("pointerout",event=>{const point=event.target.closest('[data-point-date]');if(point&&!point.contains(event.relatedTarget))hideIndicatorPointTooltip(point.closest(".indicator-card-chart"));});
document.addEventListener("focusin",event=>{const point=event.target.closest('[data-point-date]');if(point)showIndicatorPointTooltip(point);});
document.addEventListener("focusout",event=>{const point=event.target.closest('[data-point-date]');if(point)hideIndicatorPointTooltip(point.closest(".indicator-card-chart"));});
document.addEventListener("keydown",event=>{
  const point=event.target.closest?.('[data-point-date]');
  if(point&&(event.key==="Enter"||event.key===" ")){event.preventDefault();showIndicatorPointTooltip(point,true);return;}
  if(event.key==="Escape"){$$(".indicator-mini-tooltip.is-visible").forEach(tooltip=>hideIndicatorPointTooltip(tooltip.closest(".indicator-card-chart"),true));closeModal($$(".modal.is-open").at(-1));}
});
let chartResizeTimer;window.addEventListener("resize",()=>{clearTimeout(chartResizeTimer);chartResizeTimer=setTimeout(renderChart,120);});
renderIndicator(); if(window.lucide)lucide.createIcons();
