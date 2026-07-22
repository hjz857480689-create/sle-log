/* Ensure the vendored SheetJS build is exposed in browsers that inject CommonJS globals. */
(function exposeSheetJsToWindow() {
  if (typeof window === "undefined" || (window.XLSX && window.XLSX.writeFile)) return;
  if (typeof make_xlsx_lib !== "function") return;

  window.XLSX = window.XLSX || {};
  make_xlsx_lib(window.XLSX);
}());
