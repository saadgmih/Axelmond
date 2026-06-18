export function scrollToSupportReportForm(behavior: ScrollBehavior = "smooth") {
  document.getElementById("support-report-form")?.scrollIntoView({ behavior, block: "start" });
}
