(async () => {
  const STATE_KEY = "sle-log-prototype-state-v2";
  const cloud = window.SLECloud;
  const isLocalDemo = Boolean(cloud?.localDemo);
  const clone = value => JSON.parse(JSON.stringify(value));
  const safeText = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const today = () => new Date().toISOString().slice(0, 10);
  const normalizeUsername = value => String(value || "").trim().toLowerCase();
  const validUsername = value => /^[\p{Script=Han}A-Za-z0-9_]{3,20}$/u.test(String(value || "").trim());
  const validPassword = value => /^(?=.*[A-Za-z])(?=.*\d).{8,20}$/.test(String(value || ""));
  const emptyIndicatorState = () => {
    const indicators = clone(indicatorData);
    Object.values(indicators).forEach(category => Object.values(category.items).forEach(item => { item.records = []; }));
    return indicators;
  };
  const demoMedicationLogs = {
    "泼尼松": { status: "使用中", stages: [{ date: "2026-02-18", type: "减少剂量", dose: "15", unit: "mg", frequency: "每日一次", reason: "病情稳定" }], administrations: [], observations: [] },
    "吗替麦考酚酯": { status: "使用中", stages: [{ date: "2025-09-03", type: "开始用药", dose: "0.5", unit: "g", frequency: "每日两次", reason: "维持治疗" }], administrations: [], observations: [] },
    "贝利尤单抗": { status: "治疗中", stages: [], administrations: [{ date: "2026-06-26", dose: "200", unit: "mg", hospital: "仁济医院", status: "按计划完成", adverse: "无" }], observations: [] }
  };
  const defaultState = {
    version: 2,
    session: isLocalDemo,
    profile: isLocalDemo
      ? { nickname: "韩锦泽", username: "hanjinze", createdAt: "2024.08.16" }
      : { nickname: "新用户", username: "", createdAt: today().replaceAll("-", ".") },
    account: isLocalDemo ? { password: "Sle@1234" } : {},
    // Prototype data is available only in the explicit localhost demo. A real
    // account must never inherit records from the static HTML prototype.
    indicators: isLocalDemo ? null : emptyIndicatorState(),
    addedMedicationRecords: [],
    deletedMedicationNames: [],
    medicationColors: {},
    medicationLogs: isLocalDemo ? clone(demoMedicationLogs) : {},
    medicationsCleared: !isLocalDemo,
    lastSync: "今天 09:42"
  };

  function emptyCloudState(user) {
    const result = clone(defaultState);
    result.session = false;
    result.account = {};
    result.profile = {
      nickname: user?.user_metadata?.nickname || user?.user_metadata?.username || "新用户",
      username: normalizeUsername(user?.user_metadata?.username),
      createdAt: today().replaceAll("-", ".")
    };
    result.indicators = emptyIndicatorState();
    result.addedMedicationRecords = [];
    result.deletedMedicationNames = [];
    result.medicationColors = {};
    result.medicationLogs = {};
    result.medicationsCleared = true;
    result.lastSync = "尚未同步";
    return result;
  }

  let state = clone(defaultState);
  let cloudUser = null;
  let cloudBootError = null;
  if (isLocalDemo) {
    try { state = { ...clone(defaultState), ...(JSON.parse(localStorage.getItem(STATE_KEY)) || {}) }; }
    catch { state = clone(defaultState); }
  } else if (cloud?.configured) {
    document.querySelector("#authShell").hidden = false;
    document.querySelector("#appShell").hidden = true;
    const sessionResult = await cloud.getSession();
    cloudUser = sessionResult.user;
    cloudBootError = sessionResult.error;
    if (cloudUser) {
      const remote = await cloud.loadState();
      cloudBootError ||= remote.error;
      state = remote.state ? { ...clone(defaultState), ...remote.state } : emptyCloudState(cloudUser);
      state.profile = { ...defaultState.profile, ...(state.profile || {}) };
      state.profile.username ||= normalizeUsername(cloudUser.user_metadata?.username);
      if (!remote.state && !remote.error) await cloud.saveState(state);
    }
  }
  state.profile = { ...defaultState.profile, ...(state.profile || {}) };
  state.account = isLocalDemo ? { ...defaultState.account, ...(state.account || {}) } : {};
  if (!validUsername(state.profile.username)) state.profile.username = defaultState.profile.username;
  state.medicationLogs ||= clone(defaultState.medicationLogs);
  state.addedMedicationRecords ||= [];
  state.deletedMedicationNames ||= [];
  state.medicationColors ||= {};
  const medicationDateValue = value => {
    const timestamp = Date.parse(String(value || "").trim());
    return Number.isFinite(timestamp) ? timestamp : -Infinity;
  };
  const lifecycleStatus = type => ({ "暂停用药": "已暂停", "停止用药": "已停药", "恢复用药": "使用中" })[type];
  let correctedHistoricalMedicationStatus = false;
  new Set(state.addedMedicationRecords.map(record => String(record?.name || "").trim()).filter(Boolean)).forEach(name => {
    const records = state.addedMedicationRecords.filter(record => String(record?.name || "").trim() === name);
    const latestRecord = records.reduce((latest, record) => medicationDateValue(record.startDate) >= medicationDateValue(latest?.startDate) ? record : latest, null);
    const log = state.medicationLogs[name];
    if (!latestRecord || !log) return;
    const stages = log.stages || [];
    let latestStartStageIndex = -1;
    for (let index = stages.length - 1; index >= 0; index -= 1) {
      const stage = stages[index];
      if (stage.type === "开始用药" && medicationDateValue(stage.date) === medicationDateValue(latestRecord.startDate)) {
        latestStartStageIndex = index;
        break;
      }
    }
    const latestLifecycle = stages.map((stage, index) => ({ stage, index })).filter(({ stage, index }) => lifecycleStatus(stage.type) && (latestStartStageIndex >= 0 ? index > latestStartStageIndex : medicationDateValue(stage.date) >= medicationDateValue(latestRecord.startDate))).at(-1)?.stage;
    const inferredStatus = latestLifecycle ? lifecycleStatus(latestLifecycle.type) : String(latestRecord.endDate || "").trim() ? "已停药" : "使用中";
    if (inferredStatus === "已停药" && latestLifecycle?.type === "停止用药" && !String(latestRecord.endDate || "").trim()) {
      latestRecord.endDate = latestLifecycle.date;
      correctedHistoricalMedicationStatus = true;
    }
    if (log.status !== inferredStatus) {
      log.status = inferredStatus;
      correctedHistoricalMedicationStatus = true;
    }
  });
  let cleanedPrototypeMedicationData = false;
  if (!isLocalDemo) {
    const ownedMedicationNames = new Set(state.addedMedicationRecords.map(record => String(record?.name || "").trim()).filter(Boolean));
    const ownEntriesOnly = source => Object.fromEntries(Object.entries(source || {}).filter(([name]) => ownedMedicationNames.has(name)));
    const medicationLogs = ownEntriesOnly(state.medicationLogs);
    const medicationColors = ownEntriesOnly(state.medicationColors);
    const hasVisibleMedication = state.addedMedicationRecords.some(record => !state.deletedMedicationNames.includes(record.name));
    cleanedPrototypeMedicationData = Object.keys(medicationLogs).length !== Object.keys(state.medicationLogs).length
      || Object.keys(medicationColors).length !== Object.keys(state.medicationColors).length
      || state.medicationsCleared !== !hasVisibleMedication;
    state.medicationLogs = medicationLogs;
    state.medicationColors = medicationColors;
    state.medicationsCleared = !hasVisibleMedication;
    if ((cleanedPrototypeMedicationData || correctedHistoricalMedicationStatus) && cloudUser) await cloud.saveState(state);
  }
  if (isLocalDemo && correctedHistoricalMedicationStatus) localStorage.setItem(STATE_KEY, JSON.stringify(state));

  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal compact-modal" id="confirmModal" aria-hidden="true" role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle">
      <div class="modal-backdrop" data-feature-close></div><div class="modal-panel compact confirm-panel"><span class="confirm-icon"><i data-lucide="alert-triangle"></i></span><h2 id="confirmTitle">确认操作</h2><p id="confirmDescription"></p><div class="modal-actions"><button class="button secondary" type="button" data-feature-close>取消</button><button class="button destructive" type="button" id="confirmActionButton">确认</button></div></div>
    </div>
    <div class="modal compact-modal" id="recordEditModal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="recordEditTitle">
      <div class="modal-backdrop" data-feature-close></div><div class="modal-panel compact"><div class="modal-header"><div><p class="section-kicker">编辑结果</p><h2 id="recordEditTitle">编辑检查记录</h2><p>修改后，最新结果和趋势图会同步更新。</p></div><button class="icon-button" data-feature-close aria-label="关闭"><i data-lucide="x"></i></button></div><form id="recordEditForm"><input type="hidden" name="originalDate" /><div class="form-grid one-column"><label><span>检查日期 *</span><input name="date" type="date" required /></label><div class="inline-fields"><label><span>检查结果 *</span><input name="value" type="number" step="0.001" required /></label><label><span>单位</span><input name="unit" /></label></div><label data-edit-urine-volume hidden><span>24 小时尿量（选填）</span><span class="fixed-unit-input"><input name="urineVolume" type="number" step="1" min="0" inputmode="decimal" /><b>毫升</b></span></label><div class="inline-fields"><label><span>参考下限</span><input name="low" type="number" step="0.001" /></label><label><span>参考上限</span><input name="high" type="number" step="0.001" /></label></div><label><span>医院</span><input name="hospital" /></label><label><span>备注</span><textarea name="notes"></textarea></label></div><div class="modal-actions"><button class="button secondary" type="button" data-feature-close>取消</button><button class="button primary" type="submit">保存修改</button></div></form></div>
    </div>
    <div class="modal compact-modal" id="indicatorSettingsModal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="indicatorSettingsTitle">
      <div class="modal-backdrop" data-feature-close></div><div class="modal-panel compact"><div class="modal-header"><div><p class="section-kicker">INDICATOR SETTINGS</p><h2 id="indicatorSettingsTitle">指标设置</h2><p>默认设置只影响之后录入的数据，不改变历史记录。</p></div><button class="icon-button" data-feature-close aria-label="关闭"><i data-lucide="x"></i></button></div><form id="indicatorSettingsForm"><div class="form-grid one-column"><label><span>指标名称</span><input name="name" required /></label><label><span>指标简称</span><input name="shortName" /></label><label><span>默认单位</span><input name="unit" /></label><div class="inline-fields"><label><span>默认参考下限</span><input name="low" type="number" step="0.001" /></label><label><span>默认参考上限</span><input name="high" type="number" step="0.001" /></label></div></div><div class="indicator-order-actions"><button type="button" data-order-action="left"><i data-lucide="arrow-left"></i>向前移动</button><button type="button" data-order-action="right">向后移动<i data-lucide="arrow-right"></i></button></div><div class="modal-actions"><button class="button secondary" type="button" id="hideIndicatorButton">隐藏指标</button><button class="button primary" type="submit">保存设置</button></div></form></div>
    </div>
    <div class="modal compact-modal" id="accountEditModal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="accountEditTitle">
      <div class="modal-backdrop" data-feature-close></div><div class="modal-panel compact"><div class="modal-header"><div><p class="section-kicker">ACCOUNT SETTINGS</p><h2 id="accountEditTitle">修改账号信息</h2><p id="accountEditDescription"></p></div><button class="icon-button" data-feature-close aria-label="关闭"><i data-lucide="x"></i></button></div><form id="accountEditForm"><input type="hidden" name="type" /><div class="form-grid one-column" id="accountEditFields"></div><p class="form-error" data-account-error></p><div class="modal-actions"><button class="button secondary" type="button" data-feature-close>取消</button><button class="button primary" type="submit">保存修改</button></div></form></div>
    </div>
    <div class="modal compact-modal" id="medicationActionsModal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="medicationActionsTitle">
      <div class="modal-backdrop" data-feature-close></div><div class="modal-panel compact"><div class="modal-header"><div><p class="section-kicker">MEDICATION ACTIONS</p><h2 id="medicationActionsTitle">用药操作</h2><p id="medicationActionsDescription"></p></div><button class="icon-button" data-feature-close aria-label="关闭"><i data-lucide="x"></i></button></div><div class="med-action-list"><button data-med-task="details"><i data-lucide="history"></i><span><strong>查看详情</strong><small>阶段、给药与观察记录</small></span><i data-lucide="chevron-right"></i></button><button data-med-task="adjust"><i data-lucide="sliders-horizontal"></i><span><strong>调整剂量</strong><small>结束当前阶段并创建新阶段</small></span><i data-lucide="chevron-right"></i></button><button data-med-task="observation"><i data-lucide="notebook-pen"></i><span><strong>添加观察记录</strong><small>症状、化验、不良反应或个人感受</small></span><i data-lucide="chevron-right"></i></button><button data-med-task="pause"><i data-lucide="pause"></i><span><strong>暂停用药</strong><small>保留当前阶段和暂停日期</small></span><i data-lucide="chevron-right"></i></button><button data-med-task="stop"><i data-lucide="circle-stop"></i><span><strong>停止用药</strong><small>结束当前用药阶段</small></span><i data-lucide="chevron-right"></i></button></div></div>
    </div>
    <div class="modal" id="medicationTaskModal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="medicationTaskTitle">
      <div class="modal-backdrop" data-feature-close></div><div class="modal-panel medication-form-panel"><div class="modal-header"><div><p class="section-kicker" id="medicationTaskKicker">MEDICATION RECORD</p><h2 id="medicationTaskTitle">记录用药变化</h2><p id="medicationTaskDescription"></p></div><button class="icon-button" data-feature-close aria-label="关闭"><i data-lucide="x"></i></button></div><form id="medicationTaskForm"><input type="hidden" name="action" /><input type="hidden" name="medicationName" /><div id="medicationTaskFields"></div><div class="modal-actions"><button class="button secondary" type="button" data-feature-close>取消</button><button class="button primary" type="submit">保存记录</button></div></form><div id="medicationDetailsContent"></div></div>
    </div>
  `);
  document.querySelector(".med-action-list").insertAdjacentHTML("beforeend", `<button class="danger-action" data-med-task="delete"><i data-lucide="trash-2"></i><span><strong>删除用药</strong><small>删除错误添加的药品及其全部记录</small></span><i data-lucide="chevron-right"></i></button>`);
  document.querySelector('[data-med-task="details"]').insertAdjacentHTML("afterend", `<button data-med-task="color"><i data-lucide="palette"></i><span><strong>修改标识颜色</strong><small>同步更新药品卡片与历年用药时间轴</small></span><i data-lucide="chevron-right"></i></button>`);

  let pendingConfirm = null;
  let selectedMedication = "";
  let currentMedicationFilter = "active";
  let currentTimelineFilter = "全部";
  let currentTimelineRange = "2 年";
  const timelineZoomLevels = [
    { key: "year", label: "年刻度", pixelsPerMonth: 12, gridMonths: 12 },
    { key: "quarter", label: "季度刻度", pixelsPerMonth: 24, gridMonths: 3 },
    { key: "month", label: "月刻度", pixelsPerMonth: 60, gridMonths: 1 },
    { key: "week", label: "周刻度", pixelsPerMonth: 168, gridDays: 7 }
  ];
  let currentTimelineZoomIndex = 2;
  let timelineFitMode = false;

  function persist() {
    state.indicators = clone(indicatorData);
    renderMedicationTimeline();
    window.renderIndicatorList?.();
    if (isLocalDemo) localStorage.setItem(STATE_KEY, JSON.stringify(state));
    else if (cloud?.configured && cloudUser) cloud.queueSave(state);
    updateProfileUI();
  }
  function setSyncStatus(title, description, mode = "ready") {
    const syncTitle = document.querySelector("#syncTitle");
    const syncDescription = document.querySelector("#syncDescription");
    if (syncTitle) syncTitle.textContent = title;
    if (syncDescription) syncDescription.textContent = description;
    document.querySelectorAll(".sync-status strong, .sync-mini").forEach(node => {
      if (node.classList.contains("sync-mini")) node.lastChild.textContent = mode === "error" ? "同步失败" : mode === "pending" ? "同步中" : "已同步";
      else node.textContent = mode === "error" ? "同步失败" : mode === "pending" ? "同步中" : "已同步";
    });
  }
  function openFeatureModal(id) { const modal = document.getElementById(id); if (!modal) return; modal.classList.add("is-open"); modal.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; if (window.lucide) lucide.createIcons(); }
  function closeFeatureModal(modal) { if (!modal) return; modal.classList.remove("is-open"); modal.setAttribute("aria-hidden", "true"); if (!document.querySelector(".modal.is-open")) document.body.style.overflow = ""; }
  function confirmAction(title, description, confirmLabel, action, destructive = true) {
    document.querySelector("#confirmTitle").textContent = title;
    document.querySelector("#confirmDescription").textContent = description;
    const button = document.querySelector("#confirmActionButton");
    button.textContent = confirmLabel;
    button.className = `button ${destructive ? "destructive" : "primary"}`;
    pendingConfirm = action;
    openFeatureModal("confirmModal");
  }
  function downloadFile(filename, content, type) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

  function updateProfileUI() {
    document.querySelectorAll("[data-profile-nickname]").forEach(node => node.textContent = state.profile.nickname);
    document.querySelectorAll("[data-profile-username]").forEach(node => node.textContent = state.profile.username);
    document.querySelectorAll("[data-profile-created]").forEach(node => node.textContent = state.profile.createdAt);
    document.querySelectorAll("[data-profile-avatar], .avatar").forEach(node => node.textContent = state.profile.nickname.slice(0, 1));
    const accountStrong = document.querySelector(".account-chip strong"); const accountSmall = document.querySelector(".account-chip small"); if (accountStrong) accountStrong.textContent = state.profile.nickname; if (accountSmall) accountSmall.textContent = state.profile.username ? `@${state.profile.username}` : "用户名账号";
    const resultCount = Object.values(indicatorData).reduce((total, category) => total + Object.values(category.items).reduce((sum, item) => sum + item.records.length, 0), 0);
    const medCount = document.querySelectorAll(".med-card").length;
    const summary = document.querySelector("[data-profile-summary]"); if (summary) summary.textContent = `${resultCount} 项检查 · ${medCount} 种药物`;
  }
  function showAuth(show) { document.querySelector("#authShell").hidden = !show; document.querySelector("#appShell").hidden = show; document.body.classList.toggle("auth-visible", show); if (window.lucide) lucide.createIcons(); }
  function switchAuthView(target) { document.querySelectorAll("[data-auth-view]").forEach(view => { const active = view.dataset.authView === target; view.classList.toggle("is-active", active); view.querySelector("[data-form-error]")?.replaceChildren(); }); if (window.lucide) lucide.createIcons(); }
  function clearMedicationUI() {
    document.querySelectorAll(".med-card, .timeline-row, .medication-lane").forEach(node => node.remove());
    document.querySelector("#currentMedicationCount").textContent = "0";
    document.querySelector(".medication-cards").innerHTML = `<div class="wide-empty"><span><i data-lucide="pill"></i></span><strong>还没有当前用药</strong><small>点击“添加用药”建立第一条用药阶段。</small></div>`;
  }

  if (state.indicators) {
    Object.keys(indicatorData).forEach(category => { if (state.indicators[category]?.items) indicatorData[category].items = state.indicators[category].items; });
  }
  if (!isLocalDemo || state.medicationsCleared) clearMedicationUI();
  if (!state.medicationsCleared) {
    state.deletedMedicationNames.forEach(name => removeMedicationFromUI(name));
    state.addedMedicationRecords.filter(record => !state.deletedMedicationNames.includes(record.name)).forEach(record => addMedicationRecord(record));
  }
  renderMedicationTimeline();
  refreshMedicationCardStates();
  renderIndicator();
  updateProfileUI();
  showAuth(isLocalDemo ? !state.session : !cloudUser);
  const serviceNotice = document.querySelector("[data-auth-service-notice]");
  if (!isLocalDemo && !cloud?.configured) {
    serviceNotice.hidden = false;
    serviceNotice.textContent = "云端服务尚未配置，暂时无法开放注册登录。";
    document.querySelectorAll("#loginForm button[type='submit'], #registerForm button[type='submit']").forEach(button => button.disabled = true);
  } else if (cloudBootError) {
    serviceNotice.hidden = false;
    serviceNotice.textContent = "暂时无法连接云端，请检查网络或云端配置后重试。";
  }
  if (!isLocalDemo && cloudUser) {
    setSyncStatus(cloudBootError ? "云端读取失败" : "全部数据已同步", cloudBootError ? "已载入本机缓存，请稍后重新同步" : "数据已安全保存到云端", cloudBootError ? "error" : "ready");
    document.querySelector(".profile-summary .status-badge").innerHTML = '<i data-lucide="shield-check"></i>云端用户名账号';
  }

  window.addEventListener("sle:cloud-sync", event => {
    if (event.detail?.pending) setSyncStatus("正在同步数据", "正在把本地变更保存到云端", "pending");
    else if (event.detail?.ok) setSyncStatus("全部数据已同步", "最近同步于刚刚 · 云端连接正常", "ready");
    else setSyncStatus("同步失败", "本地缓存已保留，请检查网络后重试", "error");
  });

  window.addEventListener("sle:data-changed", persist);
  window.addEventListener("sle:medication-added", event => { const record = event.detail; state.addedMedicationRecords.push(record); state.deletedMedicationNames = state.deletedMedicationNames.filter(name => name !== record.name); state.medicationsCleared = false; const initialStatus = String(record.endDate || "").trim() ? "已停药" : "使用中"; const log = state.medicationLogs[record.name] ||= { status: initialStatus, stages: [], administrations: [], observations: [] }; if (["longTerm", "biologic"].includes(record.recordType)) { log.status = initialStatus; log.stages.push({ date: record.startDate, endDate: record.endDate, type: "开始用药", brand: record.brand, dose: record.dose, unit: record.unit, frequency: record.frequency, route: record.route, instruction: record.instruction, reason: record.purpose, notes: record.notes }); } refreshMedicationCardStates(); persist(); });

  document.addEventListener("click", event => {
    const medicationViewButton = event.target.closest('[data-view="medications"]'); if (medicationViewButton) setTimeout(() => renderMedicationTimeline(), 0);
    const timelineExpandButton = event.target.closest(".timeline-expand-button"); if (timelineExpandButton) { toggleTimelineExpanded(); return; }
    const timelineZoomButton = event.target.closest("[data-timeline-zoom-step]"); if (timelineZoomButton) { changeTimelineZoom(Number(timelineZoomButton.dataset.timelineZoomStep)); return; }
    const timelineFitButton = event.target.closest("[data-timeline-fit]"); if (timelineFitButton) { fitMedicationTimeline(); return; }
    const timelineStage = event.target.closest(".timeline-stage"); if (timelineStage) { const timeline = timelineStage.closest(".timeline-scroll"); if (timeline?.dataset.dragged === "true") { timeline.dataset.dragged = "false"; return; } const row = timelineStage.closest(".timeline-row"), detail = timelineStage.dataset.detail || timelineStage.title; showToast(row?.dataset.medicationName || "用药阶段", detail); return; }
    const modalOpener = event.target.closest("[data-open-modal]");
    if (modalOpener?.dataset.openModal === "quickModal") { const form = document.querySelector("#quickForm"); form.elements.date.value = today(); window.SLEEntryDefaults?.applyQuickEntryDefaults(); }
    if (modalOpener?.dataset.openModal === "checkModal") { document.querySelector("#checkForm").elements.date.value = today(); window.SLEEntryDefaults?.applyCheckEntryDefaults(); }
    if (modalOpener?.dataset.openModal === "indicatorModal") document.querySelector("#indicatorForm").elements.category.value = currentCategory;
    const passwordToggle = event.target.closest("[data-password-toggle]"); if (passwordToggle) { const input = passwordToggle.parentElement.querySelector("input"); const reveal = input.type === "password"; input.type = reveal ? "text" : "password"; passwordToggle.setAttribute("aria-pressed", String(reveal)); passwordToggle.setAttribute("aria-label", reveal ? "隐藏密码" : "显示密码"); passwordToggle.innerHTML = `<i data-lucide="${reveal ? "eye" : "eye-off"}"></i>`; if (window.lucide) lucide.createIcons(); input.focus(); return; }
    const close = event.target.closest("[data-feature-close]"); if (close) { closeFeatureModal(close.closest(".modal")); return; }
    const authTarget = event.target.closest("[data-auth-target]"); if (authTarget) { switchAuthView(authTarget.dataset.authTarget); return; }
    const historyButton = event.target.closest("[data-history-action]"); if (historyButton) { handleHistoryAction(historyButton.dataset.historyAction, historyButton.dataset.recordDate, historyButton.dataset.indicatorRecord || currentIndicator); return; }
    const accountButton = event.target.closest("[data-account-action]"); if (accountButton) { handleAccountAction(accountButton.dataset.accountAction); return; }
    const dataButton = event.target.closest("[data-data-action]"); if (dataButton) { handleDataAction(dataButton.dataset.dataAction); return; }
    const orderButton = event.target.closest("[data-order-action]"); if (orderButton) { moveIndicator(orderButton.dataset.orderAction); return; }
    const medicationFilter = event.target.closest("[data-medication-filter]"); if (medicationFilter) { currentMedicationFilter = medicationFilter.dataset.medicationFilter; document.querySelectorAll("[data-medication-filter]").forEach(button => { const active = button === medicationFilter; button.classList.toggle("is-active", active); button.setAttribute("aria-selected", String(active)); }); applyMedicationFilter(); return; }
    const medButton = event.target.closest(".med-card button"); if (medButton) { handleMedicationCardButton(medButton); return; }
    const medTask = event.target.closest("[data-med-task]"); if (medTask) { openMedicationTask(medTask.dataset.medTask, selectedMedication); return; }
    const timelineFilter = event.target.closest(".timeline-filter button"); if (timelineFilter) { currentTimelineFilter = timelineFilter.textContent.trim(); timelineFilter.parentElement.querySelectorAll("button").forEach(button => button.classList.toggle("is-active", button === timelineFilter)); applyTimelineFilter(); }
    const timelineRange = event.target.closest(".timeline-range-control button"); if (timelineRange) { currentTimelineRange = timelineRange.textContent.trim(); timelineRange.parentElement.querySelectorAll("button").forEach(button => button.classList.toggle("is-active", button === timelineRange)); renderMedicationTimeline(); }
  });

  document.querySelector("#confirmActionButton").addEventListener("click", () => { const action = pendingConfirm; pendingConfirm = null; closeFeatureModal(document.querySelector("#confirmModal")); if (action) action(); });

  const authMessage = error => {
    const message = String(error?.message || "");
    if (/invalid login credentials/i.test(message)) return "用户名或密码不正确";
    if (/user already registered|already been registered/i.test(message)) return "该用户名已经注册，请直接登录";
    if (/password/i.test(message)) return "密码不符合安全要求";
    if (/rate limit|too many/i.test(message)) return "操作过于频繁，请稍后再试";
    return message || "云端服务暂时不可用，请稍后重试";
  };
  const setFormBusy = (form, busy, label) => {
    const button = form.querySelector("button[type='submit']");
    button.disabled = busy;
    if (label) button.textContent = label;
  };

  document.querySelector("#loginForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget, data = new FormData(form), error = form.querySelector("[data-form-error]"), username = normalizeUsername(data.get("username")), password = String(data.get("password") || "");
    if (!validUsername(username)) { error.textContent = "用户名需为 3–20 位中文、字母、数字或下划线"; return; }
    if (isLocalDemo) {
      if (username !== state.profile.username || password !== state.account.password) { error.textContent = "用户名或密码不正确"; return; }
      error.textContent = ""; state.session = true; persist(); showAuth(false); form.elements.password.value = ""; showToast("登录成功", "本地测试数据已加载"); return;
    }
    if (!cloud?.configured) { error.textContent = "云端服务尚未配置"; return; }
    error.textContent = ""; setFormBusy(form, true, "登录中…");
    const result = await cloud.signIn(username, password);
    if (result.error) { error.textContent = authMessage(result.error); setFormBusy(form, false, "登录"); return; }
    location.reload();
  });
  document.querySelector("#registerForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget, data = new FormData(form), error = form.querySelector("[data-form-error]"), username = normalizeUsername(data.get("username")), password = String(data.get("password") || ""), confirmPassword = String(data.get("confirmPassword") || "");
    if (!validUsername(username)) { error.textContent = "用户名需为 3–20 位中文、字母、数字或下划线"; return; }
    if (!validPassword(password)) { error.textContent = "密码需为 8–20 位，并同时包含字母和数字"; return; }
    if (password !== confirmPassword) { error.textContent = "两次输入的密码不一致"; return; }
    if (!data.get("consent")) { error.textContent = "请先同意服务协议与隐私政策"; return; }
    if (isLocalDemo) { error.textContent = ""; state.profile = { nickname: username, username, createdAt: today().replaceAll("-", ".") }; state.account.password = password; state.session = true; persist(); showAuth(false); form.reset(); showToast("账号已创建", "本地测试账号已登录"); return; }
    if (!cloud?.configured) { error.textContent = "云端服务尚未配置"; return; }
    error.textContent = ""; setFormBusy(form, true, "创建账号中…");
    const result = await cloud.signUp(username, password, username);
    if (result.error) { error.textContent = authMessage(result.error); setFormBusy(form, false, "注册并登录"); return; }
    if (!result.data?.session) { error.textContent = "账号已创建，但云端仍要求邮箱确认；请联系管理员调整登录设置后再注册。"; setFormBusy(form, false, "注册并登录"); return; }
    location.reload();
  });

  document.querySelector("#indicatorForm").addEventListener("submit", event => {
    event.preventDefault(); const form = event.currentTarget, data = Object.fromEntries(new FormData(form)), error = form.querySelector("[data-form-error]");
    const duplicate = Object.values(indicatorData).some(category => Object.values(category.items).some(item => item.name.trim() === data.name.trim()));
    if (duplicate) { error.textContent = "已存在同名指标"; return; }
    error.textContent = ""; const key = `custom_${Date.now()}`, low = Number(data.low || 0), high = Number(data.high || Math.max(1, low + 1));
    indicatorData[data.category].items[key] = { short: data.shortName || data.name, name: data.name, unit: data.unit || "未设置", low, high, max: Math.max(high * 1.2, 1), records: [], notes: data.notes || "" };
    currentCategory = data.category; currentIndicator = key; document.querySelectorAll(".category-tab").forEach(tab => { const active = tab.dataset.category === currentCategory; tab.classList.toggle("is-active", active); tab.setAttribute("aria-selected", String(active)); }); renderIndicator(); persist(); closeModal(document.querySelector("#indicatorModal")); form.reset(); showToast("指标已创建", "可以立即添加第一条数据");
  });

  document.querySelector("#indicatorSettingsForm").addEventListener("submit", event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)), item = currentItem(); item.name = data.name; item.short = data.shortName || data.name; item.unit = data.unit || item.unit; item.low = Number(data.low); item.high = Number(data.high); item.max = Math.max(item.max || 0, item.high * 1.2); renderIndicator(); persist(); closeFeatureModal(document.querySelector("#indicatorSettingsModal")); showToast("指标设置已保存", "历史记录快照保持不变"); });
  document.querySelector("#hideIndicatorButton").addEventListener("click", () => confirmAction("隐藏这个指标？", "隐藏后可以从添加指标窗口恢复显示，历史数据不会删除。", "隐藏指标", () => { currentItem().isHidden = true; const next = Object.entries(indicatorData[currentCategory].items).find(([, item]) => !item.isHidden); if (next) currentIndicator = next[0]; renderIndicator(); persist(); closeFeatureModal(document.querySelector("#indicatorSettingsModal")); showToast("指标已隐藏", "历史数据仍然保留"); }));

  function handleHistoryAction(action, date, indicatorKey = currentIndicator) {
    if (indicatorKey && indicatorData[currentCategory]?.items?.[indicatorKey]) currentIndicator = indicatorKey;
    const item = currentItem(), record = item.records.find(row => row[0] === date); if (!record) return;
    if (action === "delete") { confirmAction("删除这条检查记录？", `${formatLongDate(date)} 的 ${item.short} 结果将被永久删除。`, "删除记录", () => { item.records = item.records.filter(row => row !== record); renderIndicator(); persist(); showToast("记录已删除", "趋势图和最新结果已更新"); }); return; }
    const form = document.querySelector("#recordEditForm"),isProtein24=currentCategory==="kidney"&&indicatorKey==="protein24",volumeField=form.querySelector("[data-edit-urine-volume]"); form.elements.originalDate.value = date; form.elements.date.value = record[0]; form.elements.date.dispatchEvent(new Event("change", { bubbles: true })); form.elements.value.value = record[1]; form.elements.unit.value = record[4] || item.unit; form.elements.low.value = record[5] ?? item.low; form.elements.high.value = record[6] ?? item.high; form.elements.hospital.value = record[2]; form.elements.notes.value = record[3]; volumeField.hidden=!isProtein24;form.elements.urineVolume.disabled=!isProtein24;form.elements.urineVolume.value=isProtein24&&record?.[8]?.volume!==undefined?record[8].volume:""; document.querySelector("#recordEditTitle").textContent = `编辑 ${item.short} 记录`; openFeatureModal("recordEditModal");
  }
  document.querySelector("#recordEditForm").addEventListener("submit", event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)), item = currentItem(), record = item.records.find(row => row[0] === data.originalDate); if (!record) return; record[0] = data.date; record[1] = Number(data.value); record[2] = data.hospital || "未填写医院"; record[3] = data.notes || ""; record[4] = data.unit; record[5] = data.low === "" ? item.low : Number(data.low); record[6] = data.high === "" ? item.high : Number(data.high); if(currentCategory==="kidney"&&currentIndicator==="protein24"){const raw=data.urineVolume;if(raw!==undefined&&String(raw).trim()!=="")record[8]={volume:Number(raw)};else delete record[8];} item.max = Math.max(item.max || 0, record[6] * 1.2, record[1] * 1.2); item.records.sort((a, b) => a[0].localeCompare(b[0])); renderIndicator(); persist(); closeFeatureModal(document.querySelector("#recordEditModal")); showToast("记录已更新", "趋势图和最新结果已同步"); });

  function moveIndicator(direction) { const items = indicatorData[currentCategory].items, entries = Object.entries(items), index = entries.findIndex(([key]) => key === currentIndicator), target = direction === "left" ? index - 1 : index + 1; if (target < 0 || target >= entries.length) { showToast("无法继续移动", "已经位于当前方向的末端"); return; } [entries[index], entries[target]] = [entries[target], entries[index]]; indicatorData[currentCategory].items = Object.fromEntries(entries); renderPicker(); persist(); }

  async function handleAccountAction(action) {
    if (action === "logout") {
      if (isLocalDemo) { state.session = false; persist(); showAuth(true); switchAuthView("login"); return; }
      const result = await cloud.signOut();
      if (result.error) { showToast("退出失败", authMessage(result.error)); return; }
      location.reload(); return;
    }
    if (action === "delete-account") {
      confirmAction("注销账号并删除全部数据？", "云端账号、指标、用药、观察记录和个人设置都会被永久删除，此操作无法撤销。", "注销并删除", async () => {
        if (isLocalDemo) { localStorage.removeItem(STATE_KEY); showAuth(true); switchAuthView("register"); showToast("账号已注销", "本地测试数据已经删除"); return; }
        const result = await cloud.deleteAccount();
        if (result.error) { showToast("注销失败", authMessage(result.error)); return; }
        location.reload();
      }); return;
    }
    const form = document.querySelector("#accountEditForm"), fields = document.querySelector("#accountEditFields"), title = document.querySelector("#accountEditTitle"), description = document.querySelector("#accountEditDescription"); form.elements.type.value = action;
    if (action === "nickname") { title.textContent = "修改昵称"; description.textContent = "昵称只用于界面展示。"; fields.innerHTML = `<label><span>新昵称</span><input name="value" required value="${safeText(state.profile.nickname)}" /></label>`; }
    if (action === "username") { title.textContent = "修改用户名"; description.textContent = "输入当前密码确认身份，下次将使用新用户名登录。"; fields.innerHTML = `<label><span>新用户名</span><input name="username" type="text" autocomplete="username" minlength="3" maxlength="20" required value="${safeText(state.profile.username)}" /></label><label><span>当前密码</span><div class="password-field"><input name="currentPassword" type="password" autocomplete="current-password" required placeholder="输入当前登录密码" /><button type="button" data-password-toggle aria-label="显示密码" aria-pressed="false"><i data-lucide="eye-off"></i></button></div></label>`; }
    if (action === "password") { title.textContent = "修改登录密码"; description.textContent = "新密码需为 8–20 位，并同时包含字母和数字。"; fields.innerHTML = `<label><span>当前密码</span><div class="password-field"><input name="currentPassword" type="password" autocomplete="current-password" required placeholder="输入当前密码" /><button type="button" data-password-toggle aria-label="显示密码" aria-pressed="false"><i data-lucide="eye-off"></i></button></div></label><label><span>新密码</span><div class="password-field"><input name="newPassword" type="password" autocomplete="new-password" minlength="8" maxlength="20" required placeholder="8–20 位，包含字母和数字" /><button type="button" data-password-toggle aria-label="显示密码" aria-pressed="false"><i data-lucide="eye-off"></i></button></div></label><label><span>确认新密码</span><div class="password-field"><input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" maxlength="20" required placeholder="再次输入新密码" /><button type="button" data-password-toggle aria-label="显示密码" aria-pressed="false"><i data-lucide="eye-off"></i></button></div></label>`; }
    openFeatureModal("accountEditModal");
  }
  document.querySelector("#accountEditForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget, data = Object.fromEntries(new FormData(form)), error = form.querySelector("[data-account-error]");
    if (data.type === "username" && !validUsername(data.username)) { error.textContent = "用户名需为 3–20 位中文、字母、数字或下划线"; return; }
    if (data.type === "password") {
      if (!validPassword(data.newPassword)) { error.textContent = "新密码需为 8–20 位，并同时包含字母和数字"; return; }
      if (data.newPassword !== data.confirmPassword) { error.textContent = "两次输入的新密码不一致"; return; }
    }
    if (isLocalDemo) {
      if (["username", "password"].includes(data.type) && data.currentPassword !== state.account.password) { error.textContent = "当前密码不正确"; return; }
      if (data.type === "username") state.profile.username = normalizeUsername(data.username);
      if (data.type === "password") state.account.password = data.newPassword;
    } else {
      if (["username", "password"].includes(data.type)) {
        const verified = await cloud.reauthenticate(state.profile.username, data.currentPassword);
        if (verified.error) { error.textContent = "当前密码不正确"; return; }
      }
      if (data.type === "username") {
        const changed = await cloud.updateUsername(data.username);
        if (changed.error) { error.textContent = authMessage(changed.error); return; }
        state.profile.username = normalizeUsername(data.username);
      }
      if (data.type === "password") {
        const changed = await cloud.updatePassword(data.newPassword);
        if (changed.error) { error.textContent = authMessage(changed.error); return; }
      }
    }
    error.textContent = "";
    if (data.type === "nickname") state.profile.nickname = data.value;
    persist();
    if (!isLocalDemo && cloudUser) await cloud.flush(state);
    closeFeatureModal(document.querySelector("#accountEditModal"));
    showToast(data.type === "password" ? "登录密码已更新" : "账号信息已更新", data.type === "password" ? "下次登录请使用新密码" : data.type === "username" ? "下次登录请使用新用户名" : "新的信息已生效");
  });

  function indicatorExcelRows() {
    const rows = [["分类", "指标", "日期", "结果", "单位", "参考下限", "参考上限", "24 小时尿量", "尿量单位", "医院", "备注"]];
    Object.values(indicatorData).forEach(category => Object.values(category.items).forEach(item => item.records.forEach(record => {const raw=record?.[8]?.volume,hasVolume=raw!==undefined&&raw!==null&&String(raw).trim()!=="";rows.push([category.label, record[7] || item.name, record[0], record[1], record[4] || item.unit, record[5] ?? item.low, record[6] ?? item.high, hasVolume?Number(raw):"", hasVolume?"毫升":"", record[2] || "", record[3] || ""]);} )));
    return rows;
  }
  function medicationExcelRows() {
    const rows = [["药物", "记录类型", "日期", "状态", "剂量", "单位", "频率或方案", "地点", "内容或原因"]], loggedNames = new Set(Object.keys(state.medicationLogs));
    document.querySelectorAll(".med-card").forEach(card => { const name = medicationNameFromCard(card); if (loggedNames.has(name)) return; const dose = card.querySelector(".dose strong")?.textContent.trim() || "", detail = card.querySelector(".dose span")?.textContent.trim() || "", status = card.querySelector(".status-badge")?.textContent.trim() || ""; rows.push([name, "当前用药", "", status, dose, "", detail, "", card.querySelector("p")?.textContent.trim() || ""]); });
    Object.entries(state.medicationLogs).forEach(([name, log]) => {
      (log.stages || []).forEach(item => rows.push([name, "用药阶段", item.date || "", log.status || "", item.dose || "", item.unit || "", item.frequency || "", "", item.reason || item.type || item.notes || ""]));
      (log.administrations || []).forEach(item => rows.push([name, "实际给药", item.date || "", item.status || "", item.dose || "", item.unit || "", "", item.hospital || "", item.adverse || item.notes || ""]));
      (log.observations || []).forEach(item => rows.push([name, "观察记录", item.date || "", "", "", "", item.type || "", "", item.content || ""]));
    });
    return rows;
  }
  function excelSheet(rows, widths) {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = widths.map(width => ({ wch: width }));
    if (rows[0]?.length) sheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(0, rows.length - 1), c: rows[0].length - 1 } }) };
    return sheet;
  }
  function appendExcelSheet(workbook, name, rows, widths) {
    XLSX.utils.book_append_sheet(workbook, excelSheet(rows, widths), name);
  }
  function excelLibraryReady() {
    if (window.XLSX) return true;
    showToast("暂时无法导出", "Excel 组件未成功加载，请刷新页面后重试");
    return false;
  }
  function cleanBackupState() {
    persist();
    const backup = clone(state);
    delete backup.account;
    backup.session = false;
    return backup;
  }
  function addRecoverySheet(workbook, backup) {
    const json = JSON.stringify(backup), size = 30000, chunks = [];
    for (let index = 0; index < json.length; index += size) chunks.push([chunks.length + 1, json.slice(index, index + size)]);
    appendExcelSheet(workbook, "恢复数据", [["顺序", "恢复数据（请勿修改此工作表）"], ...chunks], [10, 110]);
    workbook.Workbook ||= {};
    workbook.Workbook.Sheets = workbook.SheetNames.map(name => ({ name, Hidden: name === "恢复数据" ? 1 : 0 }));
  }
  function exportExcel(kind) {
    if (!excelLibraryReady()) return;
    const workbook = XLSX.utils.book_new(), date = today();
    workbook.Props = { Title: "SLE记录簿数据", Subject: "个人疾病管理记录", Author: "SLE记录簿", CreatedDate: new Date() };
    if (kind === "backup") {
      const backup = cleanBackupState();
      appendExcelSheet(workbook, "账户信息", [["项目", "内容"], ["昵称", state.profile.nickname || ""], ["用户名", state.profile.username || ""], ["加入时间", state.profile.createdAt || ""], ["导出时间", new Date().toLocaleString("zh-CN")], ["说明", "本文件包含个人健康记录，请妥善保管。"]], [18, 56]);
      appendExcelSheet(workbook, "指标记录", indicatorExcelRows(), [16, 22, 14, 12, 16, 14, 14, 16, 12, 22, 34]);
      appendExcelSheet(workbook, "用药记录", medicationExcelRows(), [22, 14, 14, 12, 12, 12, 22, 22, 38]);
      addRecoverySheet(workbook, backup);
      XLSX.writeFile(workbook, `SLE记录簿-完整备份-${date}.xlsx`, { compression: true });
      showToast("完整备份已导出", "Excel 中包含指标、用药和可恢复数据");
      return;
    }
    if (kind === "indicators") {
      appendExcelSheet(workbook, "指标记录", indicatorExcelRows(), [16, 22, 14, 12, 16, 14, 14, 16, 12, 22, 34]);
      XLSX.writeFile(workbook, `SLE记录簿-指标记录-${date}.xlsx`, { compression: true });
      showToast("指标表格已导出", "已生成可直接打开的 Excel 文件");
      return;
    }
    appendExcelSheet(workbook, "用药记录", medicationExcelRows(), [22, 14, 14, 12, 12, 12, 22, 22, 38]);
    XLSX.writeFile(workbook, `SLE记录簿-用药记录-${date}.xlsx`, { compression: true });
    showToast("用药表格已导出", "已生成可直接打开的 Excel 文件");
  }
  async function readBackupFile(file) {
    if (file.name.toLowerCase().endsWith(".json")) return JSON.parse(await file.text());
    if (!excelLibraryReady()) throw new Error("xlsx-unavailable");
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" }), sheet = workbook.Sheets["恢复数据"];
    if (!sheet) throw new Error("missing-recovery-sheet");
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
    const json = rows.slice(1).filter(row => row[1]).sort((left, right) => Number(left[0]) - Number(right[0])).map(row => String(row[1])).join("");
    return JSON.parse(json);
  }
  function handleDataAction(action) {
    if (action === "export-backup-xlsx") exportExcel("backup");
    if (action === "export-indicators-xlsx") exportExcel("indicators");
    if (action === "export-medications-xlsx") exportExcel("medications");
    if (action === "import-backup") document.querySelector("#backupFileInput").click();
    if (action === "clear-indicators") confirmAction("删除全部指标数据？", "所有指标的历史结果会被清空，自定义指标设置仍会保留。", "删除指标数据", () => { Object.values(indicatorData).forEach(category => Object.values(category.items).forEach(item => item.records = [])); renderIndicator(); persist(); showToast("指标数据已清空", "指标设置和分类仍然保留"); });
    if (action === "clear-medications") confirmAction("删除全部用药数据？", "当前用药、治疗阶段、给药和观察记录都会被清空。", "删除用药数据", () => { state.addedMedicationRecords = []; state.deletedMedicationNames = []; state.medicationColors = {}; state.medicationLogs = {}; state.medicationsCleared = true; clearMedicationUI(); persist(); showToast("用药数据已清空", "可以随时重新添加记录"); if (window.lucide) lucide.createIcons(); });
  }
  document.querySelector("#exportIndicatorCsv")?.addEventListener("click", () => exportExcel("indicators"));
  document.querySelector("#backupFileInput").addEventListener("change", async event => { const file = event.target.files[0]; if (!file) return; try { const imported = await readBackupFile(file); if (!imported.profile || !imported.indicators) throw new Error("invalid"); delete imported.account; delete imported.session; if (isLocalDemo) localStorage.setItem(STATE_KEY, JSON.stringify({ ...imported, session: false })); else { const saved = await cloud.flush(imported); if (saved.error) throw saved.error; } showToast("备份验证成功", "页面将重新载入恢复后的数据"); setTimeout(() => location.reload(), 700); } catch { showToast("无法恢复备份", "请选择由 SLE记录簿导出的完整备份 Excel"); } event.target.value = ""; });

  document.querySelector("#manualSyncButton").addEventListener("click", async event => { const button = event.currentTarget; if (!navigator.onLine) { setSyncStatus("同步失败", "当前网络不可用，恢复连接后可重新同步", "error"); showToast("暂时无法同步", "请检查网络连接后重试"); return; } button.disabled = true; button.innerHTML = `<i data-lucide="refresh-cw" class="spin"></i>同步中`; setSyncStatus("正在同步数据", isLocalDemo ? "正在检查本地数据" : "正在把最新记录保存到云端", "pending"); if (window.lucide) lucide.createIcons(); if (isLocalDemo) { persist(); await new Promise(resolve => setTimeout(resolve, 300)); } else { const result = await cloud.flush(state); if (result.error) { button.disabled = false; button.innerHTML = `<i data-lucide="refresh-cw"></i>重新同步`; setSyncStatus("同步失败", "本地缓存已保留，请稍后重试", "error"); showToast("同步失败", authMessage(result.error)); if (window.lucide) lucide.createIcons(); return; } } state.lastSync = "刚刚"; button.disabled = false; button.innerHTML = `<i data-lucide="check"></i>同步完成`; setSyncStatus("全部数据已同步", isLocalDemo ? "本地测试数据已保存" : "最近同步于刚刚 · 云端连接正常", "ready"); if (window.lucide) lucide.createIcons(); });
  window.addEventListener("offline", () => { document.querySelector("#syncTitle").textContent = "等待网络连接"; document.querySelector("#syncDescription").textContent = "本地变更已保留，联网后可以手动同步"; });
  window.addEventListener("online", () => { document.querySelector("#syncTitle").textContent = "网络已恢复"; document.querySelector("#syncDescription").textContent = "点击重新同步，将本地变更发送到云端"; });

  function medicationNameFromCard(card) { return card?.querySelector("h3")?.textContent.trim() || "未命名药物"; }
  function medicationColorChoice(value) {
    const colors = window.SLE_MEDICATION_COLORS || [];
    return colors.find(color => color.value.toUpperCase() === String(value || "").toUpperCase()) || colors[0];
  }
  function timelineTimestamp(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
    if (!match) return NaN;
    const timestamp = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    const date = new Date(timestamp);
    return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]) ? timestamp : NaN;
  }
  function timelineDateLabel(timestamp, includeDay = false) {
    const date = new Date(timestamp), year = date.getUTCFullYear(), month = String(date.getUTCMonth() + 1).padStart(2, "0"), day = String(date.getUTCDate()).padStart(2, "0");
    return includeDay ? `${year}.${month}.${day}` : `${year}.${month}`;
  }
  function timelineSourceGroups() {
    const groups = new Map();
    const visibleRecords = state.addedMedicationRecords.filter(record => record?.name && !state.deletedMedicationNames.includes(record.name));
    visibleRecords.forEach(record => {
      const group = groups.get(record.name) || { name: record.name, category: record.category || (record.recordType === "biologic" ? "生物制剂 / 单抗" : record.recordType === "infusion" ? "输注 / 冲击" : "其他治疗"), records: [], log: state.medicationLogs[record.name] || {} };
      group.records.push(record);
      if (record.category) group.category = record.category;
      groups.set(record.name, group);
    });
    Object.entries(state.medicationLogs || {}).forEach(([name, log]) => {
      if (state.deletedMedicationNames.includes(name) || groups.has(name) || !isLocalDemo) return;
      const row = [...document.querySelectorAll(".timeline-row")].find(item => item.dataset.medicationName === name);
      groups.set(name, { name, category: row?.querySelector("small")?.textContent.trim() || "其他治疗", records: [], log });
    });
    return [...groups.values()];
  }
  function timelineDatedItems(groups) {
    const dates = [];
    groups.forEach(group => {
      group.records.forEach(record => [record.startDate, record.endDate].forEach(value => { const timestamp = timelineTimestamp(value); if (Number.isFinite(timestamp)) dates.push(timestamp); }));
      ["stages", "administrations"].forEach(key => (group.log[key] || []).forEach(item => [item.date, item.endDate].forEach(value => { const timestamp = timelineTimestamp(value); if (Number.isFinite(timestamp)) dates.push(timestamp); })));
    });
    return dates;
  }
  function timelineBounds(groups) {
    const day = 86400000, now = timelineTimestamp(today()), dates = timelineDatedItems(groups), latest = dates.length ? Math.max(...dates, now) : now;
    let end = currentTimelineRange === "全部" ? latest : now;
    let start;
    if (currentTimelineRange === "6 个月") { const date = new Date(end); date.setUTCMonth(date.getUTCMonth() - 6); start = date.getTime(); }
    else if (currentTimelineRange === "1 年") { const date = new Date(end); date.setUTCFullYear(date.getUTCFullYear() - 1); start = date.getTime(); }
    else if (currentTimelineRange === "5 年") { const date = new Date(end); date.setUTCFullYear(date.getUTCFullYear() - 5); start = date.getTime(); }
    else if (currentTimelineRange === "全部" && dates.length) { const earliest = new Date(Math.min(...dates)); start = Date.UTC(earliest.getUTCFullYear(), 0, 1); }
    else { const date = new Date(end); date.setUTCFullYear(date.getUTCFullYear() - 2); start = date.getTime(); }
    if (!Number.isFinite(start) || start >= end) start = end - 365 * day;
    return { start, end, span: Math.max(day, end - start) };
  }
  function timelinePosition(timestamp, bounds) { return (timestamp - bounds.start) / bounds.span * 100; }
  function timelineMonthSpan(bounds) { return Math.max(.25, bounds.span / (86400000 * 365.2425 / 12)); }
  function timelineZoomLayout(timeline, bounds) {
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const labelWidth = mobile ? 88 : 104;
    const fallbackWidth = mobile ? window.innerWidth - 32 : Math.min(1100, window.innerWidth - 320);
    const endPadding = parseFloat(getComputedStyle(timeline).paddingRight) || 0;
    const availableTrackWidth = Math.max(240, (timeline.clientWidth || fallbackWidth) - labelWidth - endPadding);
    const months = timelineMonthSpan(bounds);
    let config = timelineZoomLevels[currentTimelineZoomIndex];
    if (timelineFitMode) {
      const fittedPixelsPerMonth = availableTrackWidth / months;
      config = fittedPixelsPerMonth >= 92 ? timelineZoomLevels[3] : fittedPixelsPerMonth >= 36 ? timelineZoomLevels[2] : fittedPixelsPerMonth >= 16 ? timelineZoomLevels[1] : timelineZoomLevels[0];
    }
    const trackWidth = Math.round(timelineFitMode ? availableTrackWidth : Math.max(availableTrackWidth, months * config.pixelsPerMonth));
    const gridSize = config.gridDays ? trackWidth / (bounds.span / 86400000) * config.gridDays : trackWidth / months * config.gridMonths;
    timeline.style.setProperty("--timeline-label-width", `${labelWidth}px`);
    timeline.style.setProperty("--timeline-track-width", `${trackWidth}px`);
    timeline.style.setProperty("--timeline-grid-size", `${Math.max(18, gridSize).toFixed(2)}px`);
    timeline.dataset.effectiveZoom = config.key;
    const scale = document.querySelector("[data-timeline-scale]");
    if (scale) scale.textContent = timelineFitMode ? "适应" : config.label;
    const fitButton = document.querySelector("[data-timeline-fit]");
    if (fitButton) { fitButton.classList.toggle("is-active", timelineFitMode); fitButton.setAttribute("aria-pressed", String(timelineFitMode)); }
    document.querySelectorAll("[data-timeline-zoom-step]").forEach(button => { const step = Number(button.dataset.timelineZoomStep); button.disabled = !timelineFitMode && (step < 0 ? currentTimelineZoomIndex === 0 : currentTimelineZoomIndex === timelineZoomLevels.length - 1); });
    return { config, labelWidth, trackWidth };
  }
  function timelineAxisTicks(bounds, config, trackWidth) {
    const ticks = [{ timestamp: bounds.start, label: timelineDateLabel(bounds.start), edge: "start" }];
    const startDate = new Date(bounds.start);
    let cursor;
    if (config.key === "year") cursor = Date.UTC(startDate.getUTCFullYear() + 1, 0, 1);
    else if (config.key === "quarter") { const nextQuarterMonth = Math.floor(startDate.getUTCMonth() / 3) * 3 + 3; cursor = Date.UTC(startDate.getUTCFullYear(), nextQuarterMonth, 1); }
    else if (config.key === "month") cursor = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 1);
    else { const weekday = startDate.getUTCDay() || 7; cursor = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate() + (8 - weekday)); }
    const minimumGap = 46 / Math.max(1, trackWidth) * bounds.span;
    while (cursor < bounds.end) {
      if (cursor - bounds.start > minimumGap && bounds.end - cursor > minimumGap) {
        const date = new Date(cursor), year = date.getUTCFullYear(), month = date.getUTCMonth();
        const label = config.key === "year" ? String(year) : config.key === "quarter" ? `${year} Q${Math.floor(month / 3) + 1}` : config.key === "month" ? timelineDateLabel(cursor) : `${String(month + 1).padStart(2, "0")}.${String(date.getUTCDate()).padStart(2, "0")}`;
        ticks.push({ timestamp: cursor, label });
      }
      if (config.key === "year") cursor = Date.UTC(new Date(cursor).getUTCFullYear() + 1, 0, 1);
      else if (config.key === "quarter") cursor = Date.UTC(new Date(cursor).getUTCFullYear(), new Date(cursor).getUTCMonth() + 3, 1);
      else if (config.key === "month") cursor = Date.UTC(new Date(cursor).getUTCFullYear(), new Date(cursor).getUTCMonth() + 1, 1);
      else cursor += 7 * 86400000;
    }
    ticks.push({ timestamp: bounds.end, label: currentTimelineRange === "全部" && bounds.end > timelineTimestamp(today()) ? timelineDateLabel(bounds.end) : "现在", edge: "end" });
    return ticks;
  }
  function timelineAxisHTML(bounds, config, trackWidth) {
    const ticks = timelineAxisTicks(bounds, config, trackWidth).map(tick => `<b class="${tick.edge ? `is-${tick.edge}` : ""}" style="left:${timelinePosition(tick.timestamp, bounds).toFixed(3)}%">${safeText(tick.label)}</b>`).join("");
    return `<span></span><div class="timeline-axis-labels">${ticks}</div>`;
  }
  function timelineViewportAnchor(timeline, bounds) {
    const labelWidth = parseFloat(getComputedStyle(timeline).getPropertyValue("--timeline-label-width")) || 104;
    const trackWidth = parseFloat(getComputedStyle(timeline).getPropertyValue("--timeline-track-width")) || Math.max(1, timeline.scrollWidth - labelWidth);
    const trackPosition = Math.max(0, Math.min(trackWidth, timeline.scrollLeft + timeline.clientWidth / 2 - labelWidth));
    return bounds.start + trackPosition / Math.max(1, trackWidth) * bounds.span;
  }
  function restoreTimelineAnchor(timeline, bounds, timestamp) {
    const labelWidth = parseFloat(getComputedStyle(timeline).getPropertyValue("--timeline-label-width")) || 104;
    const trackWidth = parseFloat(getComputedStyle(timeline).getPropertyValue("--timeline-track-width")) || Math.max(1, timeline.scrollWidth - labelWidth);
    const position = Math.max(0, Math.min(1, (timestamp - bounds.start) / bounds.span));
    timeline.scrollLeft = Math.max(0, Math.min(timeline.scrollWidth - timeline.clientWidth, labelWidth + position * trackWidth - timeline.clientWidth / 2));
  }
  function timelineCategoryMatches(category) {
    const keywords = { "糖皮质激素": ["糖皮质激素"], "免疫抑制剂": ["免疫抑制剂"], "抗疟药": ["抗疟药"], "生物制剂 / 单抗": ["生物制剂", "单抗"], "输注 / 冲击": ["输注", "冲击"], "辅助用药": ["辅助用药"] }[currentTimelineFilter];
    return !keywords || keywords.some(keyword => String(category || "").includes(keyword));
  }
  function applyTimelineFilter() {
    document.querySelectorAll(".timeline-row").forEach(row => {
      const filteredOut = !timelineCategoryMatches(row.dataset.timelineCategory);
      row.hidden = filteredOut;
      row.classList.toggle("is-filtered-out", filteredOut);
    });
    const visible = [...document.querySelectorAll(".timeline-row")].some(row => !row.hidden);
    document.querySelector(".timeline-empty")?.toggleAttribute("hidden", visible);
  }
  function scrollTimelineToLatest() {
    const timeline = document.querySelector(".timeline-scroll");
    if (!timeline) return;
    requestAnimationFrame(() => requestAnimationFrame(() => { timeline.scrollLeft = Math.max(0, timeline.scrollWidth - timeline.clientWidth); }));
  }
  function changeTimelineZoom(step, anchorTimestamp) {
    const timeline = document.querySelector(".timeline-scroll"); if (!timeline) return;
    const bounds = timelineBounds(timelineSourceGroups()), anchor = Number.isFinite(anchorTimestamp) ? anchorTimestamp : timelineViewportAnchor(timeline, bounds);
    if (timelineFitMode) { const effectiveIndex = timelineZoomLevels.findIndex(level => level.key === timeline.dataset.effectiveZoom); if (effectiveIndex >= 0) currentTimelineZoomIndex = effectiveIndex; }
    timelineFitMode = false;
    currentTimelineZoomIndex = Math.max(0, Math.min(timelineZoomLevels.length - 1, currentTimelineZoomIndex + step));
    renderMedicationTimeline({ anchorTimestamp: anchor });
  }
  function fitMedicationTimeline(anchorTimestamp) {
    const timeline = document.querySelector(".timeline-scroll"); if (!timeline) return;
    const bounds = timelineBounds(timelineSourceGroups()), anchor = Number.isFinite(anchorTimestamp) ? anchorTimestamp : timelineViewportAnchor(timeline, bounds);
    timelineFitMode = true;
    renderMedicationTimeline({ anchorTimestamp: anchor });
  }
  function toggleTimelineExpanded(force) {
    const card = document.querySelector(".timeline-card"), button = card?.querySelector(".timeline-expand-button");
    if (!card || !button) return;
    const timeline = card.querySelector(".timeline-scroll"), bounds = timelineBounds(timelineSourceGroups()), anchor = timelineViewportAnchor(timeline, bounds);
    const expanded = typeof force === "boolean" ? force : !card.classList.contains("is-expanded");
    card.classList.toggle("is-expanded", expanded);
    document.body.classList.toggle("timeline-expanded-open", expanded);
    button.setAttribute("aria-expanded", String(expanded));
    button.setAttribute("aria-label", expanded ? "退出放大时间轴" : "放大时间轴并横屏查看");
    button.innerHTML = `<i data-lucide="${expanded ? "minimize-2" : "maximize-2"}"></i><span>${expanded ? "退出" : "放大"}</span>`;
    if (window.lucide) lucide.createIcons();
    setTimeout(() => renderMedicationTimeline({ anchorTimestamp: anchor }), 0);
  }
  function updateTimelineStageLabels(timeline) {
    timeline.querySelectorAll(".timeline-stage").forEach(stage => {
      const width = stage.getBoundingClientRect().width;
      stage.textContent = width < 42 ? "" : width < 92 ? stage.dataset.shortLabel : stage.dataset.fullLabel;
      stage.classList.toggle("is-icon-only", width < 42);
    });
  }
  function renderMedicationTimeline(options = {}) {
    const timeline = document.querySelector(".timeline-scroll"), axis = timeline?.querySelector(".timeline-axis");
    if (!timeline || !axis) return;
    const groups = timelineSourceGroups(), bounds = timelineBounds(groups);
    const layout = timelineZoomLayout(timeline, bounds);
    axis.innerHTML = timelineAxisHTML(bounds, layout.config, layout.trackWidth);
    timeline.querySelectorAll(".timeline-row, .timeline-empty").forEach(row => row.remove());
    const now = timelineTimestamp(today()), rows = [];

    groups.forEach(group => {
      const log = group.log || {}, stages = [...(log.stages || [])].filter(item => Number.isFinite(timelineTimestamp(item.date))).sort((left, right) => timelineTimestamp(left.date) - timelineTimestamp(right.date));
      if (!stages.length) group.records.filter(record => ["longTerm", "biologic"].includes(record.recordType) && Number.isFinite(timelineTimestamp(record.startDate))).forEach(record => stages.push({ date: record.startDate, endDate: record.endDate, type: "开始用药", dose: record.dose, unit: record.unit, frequency: record.frequency }));
      const marks = [];
      stages.forEach((stage, index) => {
        const start = timelineTimestamp(stage.date), next = timelineTimestamp(stages[index + 1]?.date), explicitEnd = timelineTimestamp(stage.endDate);
        if (stage.dose !== undefined && stage.dose !== "") {
          const end = Number.isFinite(explicitEnd) ? explicitEnd : Number.isFinite(next) ? next : now;
          if (end >= bounds.start && start <= bounds.end) {
            const clippedStart = Math.max(start, bounds.start), clippedEnd = Math.min(Math.max(end, start + 86400000), bounds.end), left = Math.max(0, timelinePosition(clippedStart, bounds)), width = Math.max(.65, timelinePosition(clippedEnd, bounds) - left), shortLabel = stage.dose && `${stage.dose} ${stage.unit || ""}`.trim(), label = [shortLabel, stage.frequency].filter(Boolean).join(" · ") || stage.type || "用药阶段", detail = `${timelineDateLabel(start, true)} 至 ${timelineDateLabel(end, true)} · ${label}`;
            marks.push(`<span class="stage timeline-stage" role="button" tabindex="0" aria-label="${safeText(detail)}" style="left:${left.toFixed(3)}%;width:${width.toFixed(3)}%" data-short-label="${safeText(shortLabel || stage.type || "阶段")}" data-full-label="${safeText(label)}" data-detail="${safeText(detail)}" title="${safeText(detail)}">${safeText(label)}</span>`);
          }
        } else if (start >= bounds.start && start <= bounds.end) {
          marks.push(`<i class="timeline-event status-event" style="left:${timelinePosition(start, bounds).toFixed(3)}%" title="${safeText(`${timelineDateLabel(start, true)} · ${stage.type || "阶段变化"}`)}"><span>${safeText(stage.type || "阶段变化")}</span></i>`);
        }
      });
      (log.administrations || []).filter(item => Number.isFinite(timelineTimestamp(item.date))).sort((left, right) => timelineTimestamp(left.date) - timelineTimestamp(right.date)).forEach(item => {
        const timestamp = timelineTimestamp(item.date); if (timestamp < bounds.start || timestamp > bounds.end) return;
        const label = [item.dose && `${item.dose} ${item.unit || ""}`.trim(), item.status].filter(Boolean).join(" · ");
        marks.push(`<i class="timeline-event administration-event" style="left:${timelinePosition(timestamp, bounds).toFixed(3)}%" title="${safeText(`${timelineDateLabel(timestamp, true)} · ${label || "实际给药"}`)}"></i>`);
      });
      group.records.filter(record => !["longTerm", "biologic"].includes(record.recordType)).forEach(record => {
        const start = timelineTimestamp(record.startDate), end = timelineTimestamp(record.endDate); if (!Number.isFinite(start)) return;
        const label = record.recordType === "infusion" ? `${record.sessionCount || ""}${record.sessionCount ? " 次 · " : ""}${record.dose || ""} ${record.unit || ""}`.trim() : record.dose || record.category || "治疗记录";
        if (Number.isFinite(end) && end > start && end >= bounds.start && start <= bounds.end) {
          const clippedStart = Math.max(start, bounds.start), clippedEnd = Math.min(end, bounds.end), left = timelinePosition(clippedStart, bounds), width = Math.max(.65, timelinePosition(clippedEnd, bounds) - left);
          const detail = `${timelineDateLabel(start, true)} 至 ${timelineDateLabel(end, true)} · ${label}`;
          marks.push(`<span class="stage timeline-stage treatment-stage" role="button" tabindex="0" aria-label="${safeText(detail)}" style="left:${left.toFixed(3)}%;width:${width.toFixed(3)}%" data-short-label="${safeText(label.split(" · ")[0] || "疗程")}" data-full-label="${safeText(label)}" data-detail="${safeText(detail)}" title="${safeText(detail)}">${safeText(label)}</span>`);
        } else if (start >= bounds.start && start <= bounds.end) marks.push(`<i class="timeline-event treatment-event" style="left:${timelinePosition(start, bounds).toFixed(3)}%" title="${safeText(`${timelineDateLabel(start, true)} · ${label}`)}"></i>`);
      });
      if (!marks.length) return;
      const recordColor = group.records.find(record => record.color)?.color, color = state.medicationColors[group.name] || recordColor || "#E4ECF5";
      const earliest = Math.min(...[...stages.map(item => timelineTimestamp(item.date)), ...(log.administrations || []).map(item => timelineTimestamp(item.date)), ...group.records.map(item => timelineTimestamp(item.startDate))].filter(Number.isFinite));
      rows.push({ earliest, html: `<div class="timeline-row" data-medication-name="${safeText(group.name)}" data-timeline-category="${safeText(group.category)}" style="--med-color:${safeText(color)}"><strong title="${safeText(group.name)}">${safeText(group.name)}</strong><div class="timeline-track">${marks.join("")}</div></div>` });
    });
    rows.sort((left, right) => left.earliest - right.earliest).forEach(row => timeline.insertAdjacentHTML("beforeend", row.html));
    timeline.insertAdjacentHTML("beforeend", `<div class="timeline-empty" ${rows.length ? "hidden" : ""}><strong>当前时间范围内暂无用药记录</strong><small>切换时间范围，或添加带日期的用药记录。</small></div>`);
    document.querySelector(".timeline-card").dataset.range = currentTimelineRange;
    applyTimelineFilter();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      updateTimelineStageLabels(timeline);
      if (Number.isFinite(options.anchorTimestamp)) restoreTimelineAnchor(timeline, bounds, options.anchorTimestamp);
      else timeline.scrollLeft = Math.max(0, timeline.scrollWidth - timeline.clientWidth);
    }));
  }
  document.addEventListener("keydown", event => { if (event.key === "Escape" && document.querySelector(".timeline-card.is-expanded")) toggleTimelineExpanded(false); });
  document.addEventListener("keydown", event => { const stage = event.target.closest?.(".timeline-stage"); if (stage && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); stage.click(); } });
  window.addEventListener("orientationchange", () => { const timeline = document.querySelector(".timeline-scroll"), bounds = timelineBounds(timelineSourceGroups()), anchor = timelineViewportAnchor(timeline, bounds); setTimeout(() => renderMedicationTimeline({ anchorTimestamp: anchor }), 180); });
  function setupTimelineInteractions() {
    const timeline = document.querySelector(".timeline-scroll"); if (!timeline || timeline.dataset.interactionsReady) return;
    timeline.dataset.interactionsReady = "true";
    let pointerStart = 0, scrollStart = 0, dragging = false, pinchDistance = 0, pinchAnchor = NaN;
    timeline.addEventListener("pointerdown", event => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      pointerStart = event.clientX; scrollStart = timeline.scrollLeft; dragging = true; timeline.dataset.dragged = "false"; timeline.classList.add("is-dragging"); timeline.setPointerCapture(event.pointerId);
    });
    timeline.addEventListener("pointermove", event => {
      if (!dragging) return;
      const movement = event.clientX - pointerStart; if (Math.abs(movement) > 4) timeline.dataset.dragged = "true";
      timeline.scrollLeft = scrollStart - movement;
    });
    const stopDragging = event => { if (!dragging) return; dragging = false; timeline.classList.remove("is-dragging"); if (timeline.hasPointerCapture?.(event.pointerId)) timeline.releasePointerCapture(event.pointerId); };
    timeline.addEventListener("pointerup", stopDragging); timeline.addEventListener("pointercancel", stopDragging);
    const touchDistance = touches => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    timeline.addEventListener("touchstart", event => {
      if (event.touches.length !== 2 || !timeline.closest(".timeline-card")?.classList.contains("is-expanded")) return;
      pinchDistance = touchDistance(event.touches);
      const midpoint = (event.touches[0].clientX + event.touches[1].clientX) / 2, bounds = timelineBounds(timelineSourceGroups()), rect = timeline.getBoundingClientRect(), labelWidth = parseFloat(getComputedStyle(timeline).getPropertyValue("--timeline-label-width")) || 88, trackWidth = parseFloat(getComputedStyle(timeline).getPropertyValue("--timeline-track-width")) || 1, trackPosition = Math.max(0, Math.min(trackWidth, timeline.scrollLeft + midpoint - rect.left - labelWidth));
      pinchAnchor = bounds.start + trackPosition / trackWidth * bounds.span;
    }, { passive: true });
    timeline.addEventListener("touchmove", event => {
      if (event.touches.length !== 2 || !pinchDistance || !timeline.closest(".timeline-card")?.classList.contains("is-expanded")) return;
      if (event.cancelable) event.preventDefault();
      const distance = touchDistance(event.touches), ratio = distance / pinchDistance;
      if (ratio > 1.18) { changeTimelineZoom(1, pinchAnchor); pinchDistance = distance; }
      else if (ratio < .84) { changeTimelineZoom(-1, pinchAnchor); pinchDistance = distance; }
    }, { passive: false });
    timeline.addEventListener("touchend", event => { if (event.touches.length < 2) { pinchDistance = 0; pinchAnchor = NaN; } }, { passive: true });
  }
  setupTimelineInteractions();
  function medicationColorEditorHTML(name) {
    const card = [...document.querySelectorAll(".med-card")].find(item => medicationNameFromCard(item) === name);
    const current = medicationColorChoice(state.medicationColors[name] || card?.dataset.medicationColor);
    const options = (window.SLE_MEDICATION_COLORS || []).map(color => `<label class="med-color-option" title="${safeText(color.name)}"><input type="radio" name="color" value="${color.value}" data-color-name="${safeText(color.name)}" ${color.value === current.value ? "checked" : ""} /><span class="med-color-swatch" style="--med-icon-bg:${color.value}"><i data-lucide="check"></i></span><span class="sr-only">${safeText(color.name)}</span></label>`).join("");
    return `<fieldset class="med-color-fieldset medication-color-editor"><legend>药品标识颜色</legend><p>颜色会同步用于药品卡片和历年用药时间轴。</p><div class="med-color-grid" role="radiogroup" aria-label="选择药品标识颜色">${options}</div><div class="med-color-preview"><span class="med-color-preview-icon" style="--med-icon-bg:${current.value}"><i data-lucide="pill"></i></span><span>当前选择 <strong data-med-color-name>${safeText(current.name)}</strong></span></div></fieldset>`;
  }
  function paintMedicationColor(name, value) {
    const color = medicationColorChoice(value);
    document.querySelectorAll(".med-card").forEach(card => {
      if (medicationNameFromCard(card) !== name) return;
      card.dataset.medicationColor = color.value;
      card.querySelector(".med-icon")?.style.setProperty("--med-icon-bg", color.value);
    });
    document.querySelectorAll(".medication-lane, .timeline-row").forEach(node => {
      if (node.dataset.medicationName === name) node.style.setProperty("--med-color", color.value);
    });
    return color;
  }
  function updateMedicationColor(name, value) {
    const color = paintMedicationColor(name, value);
    state.medicationColors[name] = color.value;
    state.addedMedicationRecords.forEach(record => { if (record.name === name) record.color = color.value; });
    return color;
  }
  function medicationStatusKey(status) {
    if (status === "已暂停") return "paused";
    if (status === "已停药") return "stopped";
    return "active";
  }
  function applyMedicationCardStatus(card, status) {
    const key = medicationStatusKey(status);
    const badge = card.querySelector(".status-badge");
    card.dataset.medicationStatus = key;
    if (badge) {
      badge.textContent = key === "active" ? "使用中" : status;
      badge.className = `status-badge medication-status status-${key}`;
    }
    const administrationButton = card.querySelector('[data-medication-primary-action="administration"]') || [...card.querySelectorAll(".card-actions > button")].find(button => button.textContent.trim() === "记录给药");
    if (administrationButton) administrationButton.hidden = key !== "active";
  }
  function sortMedicationCards() {
    const container = document.querySelector(".medication-cards");
    if (!container) return;
    const priority = { active: 0, paused: 1, stopped: 2 };
    [...container.querySelectorAll(".med-card")]
      .sort((left, right) => priority[left.dataset.medicationStatus] - priority[right.dataset.medicationStatus])
      .forEach(card => container.appendChild(card));
  }
  function applyMedicationFilter() {
    const container = document.querySelector(".medication-cards");
    if (!container) return;
    container.querySelector(".medication-filter-empty")?.remove();
    const cards = [...container.querySelectorAll(".med-card")];
    if (!cards.length) { document.querySelector("#currentMedicationCount").textContent = "0"; return; }
    const visibleCards = cards.filter(card => currentMedicationFilter === "active" ? card.dataset.medicationStatus === "active" : card.dataset.medicationStatus !== "active");
    cards.forEach(card => { card.hidden = !visibleCards.includes(card); });
    document.querySelector("#currentMedicationCount").textContent = String(visibleCards.length);
    if (!visibleCards.length) {
      const active = currentMedicationFilter === "active";
      container.insertAdjacentHTML("beforeend", `<div class="wide-empty medication-filter-empty"><span><i data-lucide="${active ? "pill" : "pause"}"></i></span><strong>${active ? "没有使用中的药物" : "没有暂停或停止的药物"}</strong><small>${active ? "新增或恢复用药后会显示在这里。" : "暂停或停止用药后会显示在这里。"}</small></div>`);
      if (window.lucide) lucide.createIcons();
    }
  }
  function refreshMedicationCardStates() {
    document.querySelectorAll(".med-card").forEach(card => {
      const name = medicationNameFromCard(card);
      if (state.medicationColors[name]) paintMedicationColor(name, state.medicationColors[name]);
      const hasOwnEndDate = Boolean(String(card.dataset.medicationEndDate || "").trim());
      const log = state.medicationLogs[name];
      const latestDoseStage = [...(log?.stages || [])].filter(stage => stage.date && stage.dose !== undefined && stage.dose !== "").sort((left, right) => String(right.date).localeCompare(String(left.date)))[0];
      if (!hasOwnEndDate && latestDoseStage && (log?.stages || []).length > 1) {
        const recent = card.querySelector("dl div:nth-child(2) dd");
        if (recent) recent.textContent = `${String(latestDoseStage.date).replaceAll("-", ".")} · ${latestDoseStage.type || "调整剂量"}`;
      }
      const status = hasOwnEndDate ? "已停药" : log?.status || card.querySelector(".status-badge")?.textContent.trim() || "使用中";
      applyMedicationCardStatus(card, status);
    });
    sortMedicationCards();
    applyMedicationFilter();
  }
  function removeMedicationFromUI(name) {
    document.querySelectorAll(".med-card").forEach(card => { if (medicationNameFromCard(card) === name) card.remove(); });
    document.querySelectorAll(".medication-lane, .timeline-row").forEach(node => { if (node.dataset.medicationName === name) node.remove(); });
    const cards = document.querySelectorAll(".med-card"), container = document.querySelector(".medication-cards");
    if (!cards.length && container) container.innerHTML = `<div class="wide-empty"><span><i data-lucide="pill"></i></span><strong>还没有当前用药</strong><small>点击“添加用药”建立第一条用药阶段。</small></div>`;
    applyMedicationFilter();
    if (window.lucide) lucide.createIcons();
  }
  function latestOpenMedicationRecord(name) {
    return state.addedMedicationRecords
      .filter(record => record.name === name && ["longTerm", "biologic"].includes(record.recordType) && !String(record.endDate || "").trim())
      .sort((left, right) => String(right.startDate || "").localeCompare(String(left.startDate || "")))[0];
  }
  function configureMedicationActions(card, name) {
    const log = state.medicationLogs[name] || {};
    const status = String(card.dataset.medicationEndDate || "").trim() ? "已停药" : log.status || "使用中";
    const isActive = status === "使用中", isPaused = status === "已暂停";
    const supportsDoseAdjustment = ["longTerm", "biologic"].includes(card.dataset.medicationRecordType);
    const pauseButton = document.querySelector('[data-med-task="pause"], [data-med-task="resume"]');
    if (pauseButton) {
      pauseButton.dataset.medTask = isPaused ? "resume" : "pause";
      pauseButton.querySelector("strong").textContent = isPaused ? "恢复用药" : "暂停用药";
      pauseButton.querySelector("small").textContent = isPaused ? "从指定日期创建新的恢复阶段" : "保留当前阶段和暂停日期";
      pauseButton.hidden = !isActive && !isPaused;
    }
    const adjustButton = document.querySelector('[data-med-task="adjust"]');
    const observationButton = document.querySelector('[data-med-task="observation"]');
    const stopButton = document.querySelector('[data-med-task="stop"]');
    if (adjustButton) adjustButton.hidden = !isActive || !supportsDoseAdjustment;
    if (observationButton) observationButton.hidden = status === "已停药";
    if (stopButton) stopButton.hidden = status === "已停药";
  }
  function handleMedicationCardButton(button) { const card = button.closest(".med-card"), name = medicationNameFromCard(card); selectedMedication = name; if (button.textContent.includes("调整剂量")) openMedicationTask("adjust", name); else if (button.textContent.includes("记录给药")) openMedicationTask("administration", name); else { configureMedicationActions(card, name); document.querySelector("#medicationActionsTitle").textContent = name; document.querySelector("#medicationActionsDescription").textContent = "选择要记录或查看的操作。"; openFeatureModal("medicationActionsModal"); } }
  function openMedicationTask(action, name) {
    selectedMedication = name; closeFeatureModal(document.querySelector("#medicationActionsModal")); const form = document.querySelector("#medicationTaskForm"), fields = document.querySelector("#medicationTaskFields"), details = document.querySelector("#medicationDetailsContent"); form.hidden = action === "details"; details.hidden = action !== "details"; form.elements.action.value = action; form.elements.medicationName.value = name;
    const title = document.querySelector("#medicationTaskTitle"), description = document.querySelector("#medicationTaskDescription"), kicker = document.querySelector("#medicationTaskKicker"), submitButton = form.querySelector('.button[type="submit"]');
    submitButton.textContent = "保存记录";
    if (action === "adjust") { kicker.textContent = "NEW MEDICATION STAGE"; title.textContent = `调整 ${name}`; description.textContent = "保存后会结束上一阶段并创建新的用药阶段。"; fields.innerHTML = `<div class="form-grid"><label><span>调整日期 *</span><input name="date" type="date" value="${today()}" required /></label><label><span>调整类型</span><select name="type"><option>增加剂量</option><option>减少剂量</option><option>调整频率</option><option>更换品牌</option><option>恢复用药</option><option>其他调整</option></select></label><label><span>当前品牌</span><input name="brand" placeholder="记录本阶段实际品牌" /></label><label><span>新剂量 *</span><input name="dose" type="number" step="0.001" required /></label><label><span>剂量单位</span><select name="unit"><option>mg</option><option>g</option><option>μg</option><option>mL</option><option>IU</option><option>U</option><option>片</option><option>粒</option><option>支</option><option>瓶</option></select></label><label><span>使用频率</span><select name="frequency"><option>每日一次</option><option>每日两次</option><option>每日三次</option><option>每日四次</option><option>隔日一次</option><option>每周一次</option><option>每两周一次</option><option>每四周一次</option><option>每月一次</option><option>按疗程</option><option>必要时使用</option></select></label><label><span>给药途径</span><select name="route"><option>口服</option><option>皮下注射</option><option>静脉注射</option><option>静脉输注</option><option>肌内注射</option><option>外用</option><option>其他</option></select></label><label><span>调整原因</span><input name="reason" /></label><label class="med-form-full"><span>原始用药说明</span><textarea name="instruction" placeholder="按处方或医嘱原文记录"></textarea></label><label class="med-form-full"><span>备注</span><textarea name="notes"></textarea></label></div>`; }
    if (action === "administration") { kicker.textContent = "ACTUAL ADMINISTRATION"; title.textContent = `记录 ${name} 给药`; description.textContent = "只记录实际发生的给药，不根据计划日期自动完成。"; fields.innerHTML = `<div class="form-grid"><label><span>实施日期 *</span><input name="date" type="date" value="${today()}" required /></label><label><span>实际剂量 *</span><input name="dose" type="number" step="0.001" required /></label><label><span>剂量单位</span><select name="unit"><option>mg</option><option>g</option><option>mL</option><option>IU</option></select></label><label><span>给药地点</span><input name="hospital" /></label><label><span>完成状态</span><select name="status"><option>按计划完成</option><option>延期完成</option><option>部分完成</option><option>取消</option></select></label><label><span>不良反应</span><input name="adverse" placeholder="没有可留空" /></label><label class="med-form-full"><span>备注</span><textarea name="notes"></textarea></label></div>`; }
    if (action === "observation") { kicker.textContent = "PERSONAL OBSERVATION"; title.textContent = `添加 ${name} 观察记录`; description.textContent = "观察记录用于个人回顾，不生成治疗结论。"; fields.innerHTML = `<div class="form-grid one-column"><label><span>观察日期 *</span><input name="date" type="date" value="${today()}" required /></label><label><span>观察类型</span><select name="type"><option>症状变化</option><option>化验变化</option><option>不良反应</option><option>感染</option><option>住院</option><option>医生评价</option><option>个人感受</option><option>其他</option></select></label><label><span>观察内容 *</span><textarea name="content" required></textarea></label><label><span>关联检查记录</span><select name="relatedReport"><option value="">不关联</option><option>${currentItem()?.short || "当前指标"} 最近一次检查</option></select></label></div>`; }
    if (action === "color") { kicker.textContent = "MEDICATION COLOR"; title.textContent = `修改 ${name} 颜色`; description.textContent = "使用颜色快速区分不同药品。"; fields.innerHTML = medicationColorEditorHTML(name); submitButton.textContent = "保存颜色"; }
    if (action === "details") { kicker.textContent = "MEDICATION DETAILS"; title.textContent = name; description.textContent = "查看所有历史阶段、实际给药和观察记录。"; renderMedicationDetails(name, details); }
    if (action === "delete") { confirmAction(`删除 ${name}？`, "该药品的当前信息、全部历史阶段、实际给药和观察记录都会被删除。此操作无法撤销。", "删除用药", () => { state.addedMedicationRecords = state.addedMedicationRecords.filter(record => record.name !== name); state.deletedMedicationNames = [...new Set([...state.deletedMedicationNames, name])]; delete state.medicationLogs[name]; delete state.medicationColors[name]; removeMedicationFromUI(name); persist(); showToast(`${name} 已删除`, "相关用药记录已从卡片和时间轴中移除"); }); return; }
    if (action === "pause" || action === "resume" || action === "stop") { const label = action === "pause" ? "暂停用药" : action === "resume" ? "恢复用药" : "停止用药"; confirmAction(`${label}？`, `系统会创建 ${name} 的“${label}”阶段并保留全部历史数据。`, label, () => { const log = state.medicationLogs[name] ||= { stages: [], administrations: [], observations: [] }; const actionDate = today(); log.status = action === "pause" ? "已暂停" : action === "resume" ? "使用中" : "已停药"; log.stages.push({ date: actionDate, type: label, reason: "" }); if (action === "stop") { const record = latestOpenMedicationRecord(name); if (record) record.endDate = actionDate; document.querySelectorAll(".med-card").forEach(card => { if (medicationNameFromCard(card) !== name || String(card.dataset.medicationEndDate || "").trim()) return; card.dataset.medicationEndDate = actionDate; const period = card.querySelector("dl div:first-child dd"); if (period) period.textContent = `${String(card.dataset.medicationStartDate || "").replaceAll("-", ".")} 至 ${actionDate.replaceAll("-", ".")}`; }); } updateMedicationCardStatus(name, log.status); persist(); showToast(`${name} ${label}`, "历史阶段已完整保留"); }); return; }
    openFeatureModal("medicationTaskModal");
  }
  function updateMedicationCardStatus(name, status) { document.querySelectorAll(".med-card").forEach(card => { if (medicationNameFromCard(card) !== name) return; const cardStatus = String(card.dataset.medicationEndDate || "").trim() ? "已停药" : status; applyMedicationCardStatus(card, cardStatus); }); sortMedicationCards(); applyMedicationFilter(); }
  function renderMedicationDetails(name, container) {
    const log = state.medicationLogs[name] || { stages: [], administrations: [], observations: [] }, card = [...document.querySelectorAll(".med-card")].find(item => medicationNameFromCard(item) === name), brand = card?.querySelector("p")?.textContent.trim() || "未填写", currentDose = card?.querySelector(".dose")?.textContent.replace(/\s+/g, " ").trim() || "未填写", allDates = [...(log.stages || []), ...(log.administrations || []), ...(log.observations || [])].map(item => item.date).filter(Boolean).sort(), firstDate = allDates[0] || card?.querySelector("dd")?.textContent.split(" ")[0] || "未记录", dosageStages = (log.stages || []).filter(item => item.dose !== undefined && item.dose !== ""), currentStage = dosageStages.at(-1) || (log.stages || []).at(-1) || {};
    const block = (title, items, renderer) => `<section class="detail-log-section"><div><h3>${title}</h3><span>${items.length}</span></div>${items.length ? `<div class="detail-log-list">${items.map(renderer).join("")}</div>` : `<div class="detail-empty">暂无记录</div>`}</section>`;
    const stageValues = dosageStages.map(item => Number(item.dose)).filter(Number.isFinite), stageMax = Math.max(...stageValues, 1), stepChart = stageValues.length ? `<section class="dose-step-section"><div><h3>剂量变化</h3><small>阶梯图仅展示已记录阶段</small></div><div class="dose-step-chart">${dosageStages.map(item => `<span style="--step:${Math.max(18, Number(item.dose || 0) / stageMax * 100)}%"><b>${safeText(item.dose || "-")} ${safeText(item.unit || "")}</b><i></i><small>${safeText(item.date || "")}</small></span>`).join("")}</div></section>` : "";
    container.innerHTML = `<div class="detail-status"><span>当前状态</span><strong>${safeText(log.status || "使用中")}</strong></div><div class="medication-detail-summary"><div><span>当前品牌</span><strong>${safeText(brand)}</strong></div><div><span>当前剂量与频率</span><strong>${safeText(currentDose)}</strong></div><div><span>给药途径</span><strong>${safeText(currentStage.route || "未记录")}</strong></div><div><span>首次使用日期</span><strong>${safeText(firstDate)}</strong></div></div>${stepChart}${block("历史阶段", log.stages || [], item => `<article><strong>${safeText(item.type || "阶段记录")}</strong><span>${safeText(item.date || "")}</span><p>${safeText([item.dose && `${item.dose} ${item.unit || ""}`, item.frequency, item.reason].filter(Boolean).join(" · "))}</p></article>`)}${block("实际给药与不良反应", log.administrations || [], item => `<article><strong>${safeText(`${item.dose || ""} ${item.unit || ""}`)}</strong><span>${safeText(item.date || "")}</span><p>${safeText([item.status, item.hospital, item.adverse].filter(Boolean).join(" · "))}</p></article>`)}${block("观察记录", log.observations || [], item => `<article><strong>${safeText(item.type || "个人观察")}</strong><span>${safeText(item.date || "")}</span><p>${safeText(item.content || "")}</p></article>`)}`;
  }
  document.querySelector("#medicationTaskForm").addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (data.action === "color") {
      const color = updateMedicationColor(data.medicationName, data.color);
      persist();
      closeFeatureModal(document.querySelector("#medicationTaskModal"));
      showToast("药品颜色已更新", `${data.medicationName} 已改为${color.name}`);
      return;
    }
    const log = state.medicationLogs[data.medicationName] ||= { status: "使用中", stages: [], administrations: [], observations: [] };
    if (data.action === "adjust") { log.stages.push(data); log.status = "使用中"; const record = latestOpenMedicationRecord(data.medicationName); if (record) Object.assign(record, { dose: data.dose, unit: data.unit, frequency: data.frequency, route: data.route, brand: data.brand || record.brand }); document.querySelectorAll(".med-card").forEach(card => { if (medicationNameFromCard(card) === data.medicationName && !String(card.dataset.medicationEndDate || "").trim()) { const dose = card.querySelector(".dose"); if (dose) dose.innerHTML = `<strong>${safeText(data.dose)}</strong><span>${safeText(data.unit)} · ${safeText(data.frequency)}</span>`; const recent = card.querySelector("dl div:nth-child(2) dd"); if (recent) recent.textContent = `${String(data.date || "").replaceAll("-", ".")} · ${safeText(data.type || "调整剂量")}`; } }); updateMedicationCardStatus(data.medicationName, log.status); }
    if (data.action === "administration") log.administrations.push(data);
    if (data.action === "observation") log.observations.push(data);
    persist();
    closeFeatureModal(document.querySelector("#medicationTaskModal"));
    showToast("用药记录已保存", data.action === "adjust" ? "新的用药阶段已经创建" : "记录已加入药物详情");
  });
  document.querySelector("#medicationTaskForm").addEventListener("change", event => {
    if (event.target.name !== "color") return;
    const color = medicationColorChoice(event.target.value);
    const form = event.currentTarget;
    form.querySelector(".med-color-preview-icon")?.style.setProperty("--med-icon-bg", color.value);
    const name = form.querySelector("[data-med-color-name]");
    if (name) name.textContent = color.name;
  });

  document.querySelectorAll('[data-open-modal="indicatorModal"]').forEach(button => button.addEventListener("click", () => renderHiddenIndicators()));
  function renderHiddenIndicators() { let manager = document.querySelector("#hiddenIndicatorManager"); if (!manager) { manager = document.createElement("div"); manager.id = "hiddenIndicatorManager"; manager.className = "hidden-indicator-manager"; document.querySelector("#indicatorForm .modal-actions").before(manager); } const hidden = []; Object.entries(indicatorData).forEach(([category, data]) => Object.entries(data.items).forEach(([key, item]) => { if (item.isHidden) hidden.push({ category, key, item }); })); manager.innerHTML = hidden.length ? `<div class="hidden-manager-title"><strong>已隐藏指标</strong><small>点击恢复显示</small></div>${hidden.map(({ category, key, item }) => `<button type="button" data-restore-category="${category}" data-restore-key="${key}"><span>${safeText(item.short)}</span><i data-lucide="eye"></i></button>`).join("")}` : ""; manager.querySelectorAll("[data-restore-key]").forEach(button => button.addEventListener("click", () => { indicatorData[button.dataset.restoreCategory].items[button.dataset.restoreKey].isHidden = false; persist(); renderHiddenIndicators(); renderPicker(); showToast("指标已恢复", "已重新显示在对应分类中"); })); if (window.lucide) lucide.createIcons(); }

  if (window.lucide) lucide.createIcons();
})();
