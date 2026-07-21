(() => {
  const pad = value => String(value).padStart(2, "0");
  const toDateValue = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const parseDate = value => value ? new Date(`${value}T00:00:00`) : new Date();
  const formatDate = value => {
    if (!value) return "请选择日期";
    const date = parseDate(value);
    return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
  };
  const escapeText = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const fieldLabel = control => {
    const label = control.closest("label");
    const directLabel = label ? [...label.children].find(child => child.tagName === "SPAN") : null;
    return directLabel?.textContent.replace("*", "").trim() || control.getAttribute("aria-label") || (control.tagName === "SELECT" ? "选择选项" : "选择日期");
  };

  document.body.insertAdjacentHTML("beforeend", `
    <div class="control-picker" id="selectControlPicker" aria-hidden="true">
      <div class="control-picker-backdrop" data-control-close></div>
      <section class="control-picker-sheet" role="dialog" aria-modal="true" aria-labelledby="selectControlTitle">
        <div class="control-picker-handle" aria-hidden="true"></div>
        <header><div class="control-picker-heading"><small>SELECT OPTION</small><h2 id="selectControlTitle">选择选项</h2><p>选择后会立即带入当前表单</p></div><span class="control-option-count" aria-live="polite"></span><button type="button" class="icon-button" data-control-close aria-label="关闭"><i data-lucide="x"></i></button></header>
        <label class="control-picker-search" hidden><i data-lucide="search"></i><input type="search" aria-label="搜索选项" placeholder="搜索选项" autocomplete="off" /></label>
        <div class="control-option-list" role="listbox"></div>
      </section>
    </div>
    <div class="control-picker calendar-picker" id="calendarControlPicker" aria-hidden="true">
      <div class="control-picker-backdrop" data-control-close></div>
      <section class="control-picker-sheet" role="dialog" aria-modal="true" aria-labelledby="calendarControlTitle">
        <div class="control-picker-handle" aria-hidden="true"></div>
        <header><div><small>SELECT DATE</small><h2 id="calendarControlTitle">选择日期</h2></div><button type="button" class="icon-button" data-control-close aria-label="关闭"><i data-lucide="x"></i></button></header>
        <div class="calendar-month-nav"><button type="button" data-calendar-move="-1" aria-label="上个月"><i data-lucide="chevron-left"></i></button><div class="calendar-period-controls"><button type="button" class="calendar-period-button" data-calendar-years aria-expanded="false"><strong id="calendarYearLabel"></strong><i data-lucide="chevron-down"></i></button><button type="button" class="calendar-period-button" data-calendar-months aria-expanded="false"><strong id="calendarMonthLabel"></strong><i data-lucide="chevron-down"></i></button></div><button type="button" data-calendar-move="1" aria-label="下个月"><i data-lucide="chevron-right"></i></button></div>
        <div class="calendar-year-panel" hidden><div class="calendar-year-grid" role="listbox" aria-label="选择年份"></div></div>
        <div class="calendar-month-panel" hidden><div class="calendar-month-grid" role="listbox" aria-label="选择月份"></div></div>
        <div class="calendar-weekdays" aria-hidden="true"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div>
        <div class="calendar-days" role="grid"></div>
        <footer><div class="calendar-footer-secondary"><button type="button" class="calendar-clear">清除</button><button type="button" class="calendar-today">今天</button></div><button type="button" class="calendar-confirm">确认</button></footer>
      </section>
    </div>
  `);

  const selectPicker = document.querySelector("#selectControlPicker");
  const calendarPicker = document.querySelector("#calendarControlPicker");
  let activeSelect = null;
  let activeDate = null;
  let activeTrigger = null;
  let calendarView = new Date();
  let pendingDateValue = "";

  const optionHints = {
    activity: "补体、炎症与自身抗体",
    kidney: "尿检、蛋白尿与肾功能",
    blood: "血细胞与血红蛋白相关指标",
    other: "免疫球蛋白及自定义指标",
    "糖皮质激素": "激素类长期治疗",
    "免疫抑制剂": "免疫调节与维持治疗",
    "抗疟药": "SLE 常用基础治疗",
    "生物制剂 / 单抗": "按治疗方案记录实际给药",
    "输注 / 冲击治疗": "短期静脉治疗与疗程",
    "辅助用药": "预防和改善伴随症状",
    "其他治疗": "无法归入常规分类的治疗",
    "片剂": "普通片、肠溶片或缓释片",
    "胶囊剂": "硬胶囊或软胶囊",
    "颗粒剂": "颗粒或冲剂",
    "口服液": "口服溶液或混悬液",
    "注射液": "需使用注射器给药",
    "预充式注射剂": "预先装填的一次性注射装置",
    "冻干粉针剂": "使用前需要溶解配制",
    "乳膏 / 软膏": "皮肤或局部外用",
    "滴眼液": "眼部滴用制剂",
    "每日一次": "每天固定使用 1 次",
    "每日两次": "每天固定使用 2 次",
    "每日三次": "每天固定使用 3 次",
    "每日四次": "每天固定使用 4 次",
    "隔日一次": "每两天使用 1 次",
    "每周一次": "每 7 天使用 1 次",
    "每两周一次": "每 14 天使用 1 次",
    "每四周一次": "每 28 天使用 1 次",
    "每月一次": "每自然月使用 1 次",
    "按疗程": "按医生制定的疗程执行",
    "必要时使用": "根据症状或医嘱使用",
    "口服": "经口服用",
    "皮下注射": "皮下完成注射",
    "静脉注射": "静脉推注给药",
    "静脉输注": "静脉滴注或输液",
    "肌内注射": "肌肉内完成注射",
    "外用": "用于皮肤或局部区域",
    "按计划完成": "本次治疗按原计划完成",
    "延期完成": "延后但已经完成",
    "部分完成": "只完成部分计划剂量或疗程",
    "取消": "本次治疗没有实施",
    mg: "毫克",
    g: "克",
    "μg": "微克",
    mL: "毫升",
    IU: "国际单位",
    U: "单位"
  };

  const optionHint = option => option.dataset.description || optionHints[option.value] || optionHints[option.textContent.trim()] || "";

  function positionSheet(picker, trigger, preferredWidth) {
    const sheet = picker.querySelector(".control-picker-sheet");
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, preferredWidth), window.innerWidth - 32);
    const left = Math.min(Math.max(16, rect.left), window.innerWidth - width - 16);
    const estimatedHeight = picker === calendarPicker ? 460 : 420;
    const below = window.innerHeight - rect.bottom - 12;
    const top = below >= Math.min(estimatedHeight, 320) ? rect.bottom + 8 : Math.max(16, rect.top - Math.min(estimatedHeight, rect.top - 16) - 8);
    sheet.style.setProperty("--picker-left", `${left}px`);
    sheet.style.setProperty("--picker-top", `${top}px`);
    sheet.style.setProperty("--picker-width", `${width}px`);
    sheet.style.setProperty("--picker-max-height", `${Math.max(220, window.innerHeight - top - 16)}px`);
  }

  function openPicker(picker, trigger, width) {
    positionSheet(picker, trigger, width);
    activeTrigger = trigger;
    picker.classList.add("is-open");
    document.body.classList.add("control-picker-open");
    picker.setAttribute("aria-hidden", "false");
    trigger.setAttribute("aria-expanded", "true");
    if (window.lucide) lucide.createIcons();
  }

  function closePicker(picker, returnFocus = true) {
    if (!picker) return;
    picker.classList.remove("is-open");
    picker.setAttribute("aria-hidden", "true");
    document.querySelectorAll('.enhanced-control-button[aria-expanded="true"]').forEach(button => button.setAttribute("aria-expanded", "false"));
    if (picker === selectPicker) activeSelect = null;
    if (picker === calendarPicker) { activeDate = null; pendingDateValue = ""; }
    if (!document.querySelector(".control-picker.is-open")) document.body.classList.remove("control-picker-open");
    const triggerToRestore = activeTrigger;
    activeTrigger = null;
    if (returnFocus && triggerToRestore) requestAnimationFrame(() => triggerToRestore.focus());
  }

  function syncSelect(select) {
    const button = select.closest(".enhanced-control")?.querySelector(".enhanced-control-button");
    if (!button) return;
    const option = select.selectedOptions[0];
    const optionIcon = option?.dataset.icon;
    let leading = button.querySelector(".enhanced-control-option-icon");
    if (optionIcon && !leading) {
      button.insertAdjacentHTML("afterbegin", '<span class="enhanced-control-option-icon" aria-hidden="true"></span>');
      leading = button.querySelector(".enhanced-control-option-icon");
    }
    if (leading) {
      leading.hidden = !optionIcon;
      leading.innerHTML = optionIcon ? `<i data-lucide="${escapeText(optionIcon)}"></i>` : "";
    }
    button.querySelector(".enhanced-control-value").textContent = option?.textContent || "请选择";
    button.setAttribute("aria-label", `${fieldLabel(select)}：${option?.textContent || "请选择"}`);
    button.classList.toggle("is-placeholder", !select.value);
    button.disabled = select.disabled;
    if (optionIcon && window.lucide) lucide.createIcons();
  }

  function renderSelectOptions(query = "") {
    if (!activeSelect) return;
    const list = selectPicker.querySelector(".control-option-list");
    const options = [...activeSelect.options].filter(option => option.textContent.toLowerCase().includes(query.trim().toLowerCase()));
    selectPicker.querySelector(".control-option-count").textContent = `${options.length} 个选项`;
    list.innerHTML = options.length ? options.map(option => {
      const hint = optionHint(option);
      const icon = option.dataset.icon;
      return `<button type="button" role="option" data-option-value="${escapeText(option.value)}" aria-selected="${option.selected}" ${option.disabled ? "disabled" : ""}><span class="control-option-marker">${icon ? `<i data-lucide="${escapeText(icon)}"></i>` : option.selected ? '<i data-lucide="check"></i>' : ""}</span><span class="control-option-copy"><strong>${escapeText(option.textContent)}</strong>${hint ? `<small>${escapeText(hint)}</small>` : ""}</span><span class="control-option-state">${option.selected ? "已选择" : ""}</span></button>`;
    }).join("") : `<div class="control-picker-empty"><i data-lucide="search-x"></i><strong>没有匹配选项</strong><small>换一个关键词试试</small></div>`;
    if (window.lucide) lucide.createIcons();
  }

  function openSelect(select, trigger) {
    document.querySelectorAll(".control-picker.is-open").forEach(open => closePicker(open, false));
    activeSelect = select;
    selectPicker.querySelector("#selectControlTitle").textContent = fieldLabel(select);
    const search = selectPicker.querySelector(".control-picker-search");
    const searchInput = search.querySelector("input");
    search.hidden = select.options.length < 8;
    searchInput.value = "";
    renderSelectOptions();
    openPicker(selectPicker, trigger, 360);
    requestAnimationFrame(() => (search.hidden ? selectPicker.querySelector('[aria-selected="true"]') : searchInput)?.focus());
  }

  function enhanceSelect(select) {
    if (select.dataset.controlEnhanced) return;
    select.dataset.controlEnhanced = "true";
    const wrapper = document.createElement("div");
    wrapper.className = "enhanced-control enhanced-select";
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    select.classList.add("enhanced-native-control");
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "enhanced-control-button";
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = `<span class="enhanced-control-value"></span><i data-lucide="chevron-down"></i>`;
    wrapper.appendChild(button);
    button.addEventListener("click", () => openSelect(select, button));
    button.addEventListener("keydown", event => {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openSelect(select, button);
      }
    });
    select.addEventListener("change", () => syncSelect(select));
    syncSelect(select);
  }

  function syncDate(input) {
    const button = input.closest(".enhanced-control")?.querySelector(".enhanced-control-button");
    if (!button) return;
    button.querySelector(".enhanced-control-value").textContent = formatDate(input.value);
    button.setAttribute("aria-label", `${fieldLabel(input)}：${formatDate(input.value)}`);
    button.classList.toggle("is-placeholder", !input.value);
    button.disabled = input.disabled;
  }

  function dateAllowed(input, value) {
    if (input.min && value < input.min) return false;
    if (input.max && value > input.max) return false;
    return true;
  }

  function calendarYearBounds() {
    const currentYear = new Date().getFullYear();
    const minYear = activeDate?.min ? Number(activeDate.min.slice(0, 4)) : 1900;
    const maxYear = activeDate?.max ? Number(activeDate.max.slice(0, 4)) : currentYear + 10;
    return { minYear, maxYear };
  }

  function renderCalendarYears() {
    if (!activeDate) return;
    const selectedYear = calendarView.getFullYear();
    const { minYear, maxYear } = calendarYearBounds();
    const years = [];
    for (let year = maxYear; year >= minYear; year -= 1) {
      years.push(`<button type="button" role="option" data-calendar-year="${year}" aria-selected="${year === selectedYear}">${year} 年</button>`);
    }
    const grid = calendarPicker.querySelector(".calendar-year-grid");
    grid.innerHTML = years.join("");
    requestAnimationFrame(() => grid.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "center" }));
  }

  function calendarMonthAllowed(year, month) {
    const firstValue = `${year}-${pad(month + 1)}-01`;
    const lastValue = `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`;
    if (activeDate?.min && lastValue < activeDate.min) return false;
    if (activeDate?.max && firstValue > activeDate.max) return false;
    return true;
  }

  function renderCalendarMonths() {
    if (!activeDate) return;
    const selectedYear = calendarView.getFullYear();
    const selectedMonth = calendarView.getMonth();
    const grid = calendarPicker.querySelector(".calendar-month-grid");
    grid.innerHTML = Array.from({ length: 12 }, (_, month) => {
      const allowed = calendarMonthAllowed(selectedYear, month);
      return `<button type="button" role="option" data-calendar-month="${month}" aria-selected="${month === selectedMonth}" ${allowed ? "" : "disabled"}>${month + 1} 月</button>`;
    }).join("");
  }

  function setCalendarPickerMode(mode = "days") {
    const showingYears = mode === "years";
    const showingMonths = mode === "months";
    calendarPicker.querySelector(".calendar-year-panel").hidden = !showingYears;
    calendarPicker.querySelector(".calendar-month-panel").hidden = !showingMonths;
    calendarPicker.querySelector(".calendar-weekdays").hidden = mode !== "days";
    calendarPicker.querySelector(".calendar-days").hidden = mode !== "days";
    calendarPicker.querySelector("[data-calendar-years]").setAttribute("aria-expanded", String(showingYears));
    calendarPicker.querySelector("[data-calendar-months]").setAttribute("aria-expanded", String(showingMonths));
    if (showingYears) renderCalendarYears();
    if (showingMonths) renderCalendarMonths();
  }

  function renderCalendar() {
    if (!activeDate) return;
    const year = calendarView.getFullYear();
    const month = calendarView.getMonth();
    const yearButton = calendarPicker.querySelector("[data-calendar-years]");
    const monthButton = calendarPicker.querySelector("[data-calendar-months]");
    calendarPicker.querySelector("#calendarYearLabel").textContent = `${year} 年`;
    calendarPicker.querySelector("#calendarMonthLabel").textContent = `${month + 1} 月`;
    yearButton.setAttribute("aria-label", `选择年份，当前 ${year} 年`);
    monthButton.setAttribute("aria-label", `选择月份，当前 ${month + 1} 月`);
    setCalendarPickerMode();
    const firstDay = new Date(year, month, 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayValue = toDateValue(new Date());
    const cells = [];
    for (let index = 0; index < 42; index += 1) {
      const day = index - offset + 1;
      if (day < 1 || day > daysInMonth) { cells.push('<span class="calendar-day-empty"></span>'); continue; }
      const value = `${year}-${pad(month + 1)}-${pad(day)}`;
      const selected = pendingDateValue === value;
      const today = todayValue === value;
      const allowed = dateAllowed(activeDate, value);
      cells.push(`<button type="button" role="gridcell" data-date-value="${value}" aria-selected="${selected}" ${allowed ? "" : "disabled"} class="${today ? "is-today" : ""} ${selected ? "is-selected" : ""}"><span>${day}</span></button>`);
    }
    calendarPicker.querySelector(".calendar-days").innerHTML = cells.join("");
    calendarPicker.querySelector(".calendar-clear").hidden = activeDate.required;
    if (window.lucide) lucide.createIcons();
  }

  function openCalendar(input, trigger) {
    document.querySelectorAll(".control-picker.is-open").forEach(open => closePicker(open, false));
    activeDate = input;
    pendingDateValue = input.value;
    calendarView = parseDate(input.value);
    calendarPicker.querySelector("#calendarControlTitle").textContent = fieldLabel(input);
    renderCalendar();
    openPicker(calendarPicker, trigger, 336);
    requestAnimationFrame(() => (calendarPicker.querySelector(".is-selected") || calendarPicker.querySelector(".is-today") || calendarPicker.querySelector("[data-date-value]"))?.focus());
  }

  function setDateValue(value) {
    if (!activeDate) return;
    const input = activeDate;
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    syncDate(input);
    closePicker(calendarPicker);
  }

  function previewDateValue(value) {
    if (!activeDate || (value && !dateAllowed(activeDate, value))) return;
    pendingDateValue = value;
    if (value) calendarView = parseDate(value);
    renderCalendar();
  }

  function enhanceDate(input) {
    if (input.dataset.controlEnhanced) return;
    input.dataset.controlEnhanced = "true";
    const wrapper = document.createElement("div");
    wrapper.className = "enhanced-control enhanced-date";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    input.classList.add("enhanced-native-control");
    input.tabIndex = -1;
    input.setAttribute("aria-hidden", "true");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "enhanced-control-button";
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = `<span class="enhanced-control-value"></span><i data-lucide="calendar-days"></i>`;
    wrapper.appendChild(button);
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      openCalendar(input, button);
    });
    input.addEventListener("focus", () => input.blur());
    input.addEventListener("click", event => event.preventDefault());
    input.addEventListener("invalid", event => { event.preventDefault(); openCalendar(input, button); });
    input.addEventListener("change", () => syncDate(input));
    syncDate(input);
  }

  function enhanceControls(root = document) {
    const selects = [...(root.matches?.('select:not([data-control-enhanced])') ? [root] : []), ...(root.querySelectorAll?.('select:not([data-control-enhanced])') || [])];
    const dates = [...(root.matches?.('input[type="date"]:not([data-control-enhanced])') ? [root] : []), ...(root.querySelectorAll?.('input[type="date"]:not([data-control-enhanced])') || [])];
    selects.forEach(enhanceSelect);
    dates.forEach(enhanceDate);
    if ((selects.length || dates.length) && window.lucide) lucide.createIcons();
    return selects.length + dates.length;
  }

  selectPicker.addEventListener("click", event => {
    const option = event.target.closest("[data-option-value]");
    if (option && activeSelect) { activeSelect.value = option.dataset.optionValue; activeSelect.dispatchEvent(new Event("input", { bubbles: true })); activeSelect.dispatchEvent(new Event("change", { bubbles: true })); syncSelect(activeSelect); closePicker(selectPicker); return; }
    if (event.target.closest("[data-control-close]")) closePicker(selectPicker);
  });
  selectPicker.querySelector(".control-picker-search input").addEventListener("input", event => renderSelectOptions(event.target.value));
  selectPicker.querySelector(".control-option-list").addEventListener("keydown", event => {
    const options = [...selectPicker.querySelectorAll('[role="option"]:not(:disabled)')];
    const index = options.indexOf(document.activeElement);
    if (event.key === "ArrowDown") { event.preventDefault(); (options[index + 1] || options[0])?.focus(); }
    if (event.key === "ArrowUp") { event.preventDefault(); (options[index - 1] || options.at(-1))?.focus(); }
    if (event.key === "Home") { event.preventDefault(); options[0]?.focus(); }
    if (event.key === "End") { event.preventDefault(); options.at(-1)?.focus(); }
  });

  calendarPicker.addEventListener("click", event => {
    const year = event.target.closest("[data-calendar-year]");
    if (year) { calendarView = new Date(Number(year.dataset.calendarYear), calendarView.getMonth(), 1); renderCalendar(); return; }
    const month = event.target.closest("[data-calendar-month]");
    if (month) { calendarView = new Date(calendarView.getFullYear(), Number(month.dataset.calendarMonth), 1); renderCalendar(); return; }
    const yearToggle = event.target.closest("[data-calendar-years]");
    if (yearToggle) { setCalendarPickerMode(yearToggle.getAttribute("aria-expanded") === "true" ? "days" : "years"); return; }
    const monthToggle = event.target.closest("[data-calendar-months]");
    if (monthToggle) { setCalendarPickerMode(monthToggle.getAttribute("aria-expanded") === "true" ? "days" : "months"); return; }
    const move = event.target.closest("[data-calendar-move]");
    if (move) { calendarView = new Date(calendarView.getFullYear(), calendarView.getMonth() + Number(move.dataset.calendarMove), 1); renderCalendar(); return; }
    const day = event.target.closest("[data-date-value]"); if (day) { previewDateValue(day.dataset.dateValue); return; }
    if (event.target.closest(".calendar-today")) { previewDateValue(toDateValue(new Date())); return; }
    if (event.target.closest(".calendar-clear")) { previewDateValue(""); return; }
    if (event.target.closest(".calendar-confirm")) { setDateValue(pendingDateValue); return; }
    if (event.target.closest("[data-control-close]")) closePicker(calendarPicker);
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !document.querySelector(".control-picker.is-open")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelectorAll(".control-picker.is-open").forEach(closePicker);
  }, true);
  document.addEventListener("click", event => { const opener = event.target.closest("[data-open-modal]"); if (!opener) return; setTimeout(() => { const modal = document.getElementById(opener.dataset.openModal); modal?.querySelectorAll("select, input[type='date']").forEach(control => control.tagName === "SELECT" ? syncSelect(control) : syncDate(control)); }, 0); });
  document.addEventListener("reset", event => setTimeout(() => event.target.querySelectorAll("select, input[type='date']").forEach(control => control.tagName === "SELECT" ? syncSelect(control) : syncDate(control)), 0));
  window.addEventListener("resize", () => document.querySelectorAll(".control-picker.is-open").forEach(closePicker));

  const observer = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => { if (node.nodeType === 1) enhanceControls(node); })));
  observer.observe(document.body, { childList: true, subtree: true });
  enhanceControls();
})();
