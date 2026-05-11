// Centralised PDF report generation.
// Each function takes already-fetched API data and writes a polished
// branded PDF to the user's machine. Uses jsPDF + autoTable.

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Job, Vendor, AuditLog, Assignment, DashboardMetrics } from "@/lib/types";

const BRAND_NAVY: [number, number, number] = [10, 22, 40];
const BRAND_BLUE: [number, number, number] = [26, 86, 219];
const MUTED: [number, number, number] = [100, 116, 139];

function header(doc: jsPDF, title: string, subtitle?: string) {
  doc.setFillColor(...BRAND_NAVY);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 22, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("RetailFixIt", 14, 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(200);
  doc.text("Operations console", 14, 14);
  doc.setFontSize(8);
  doc.text(new Date().toLocaleString(), doc.internal.pageSize.getWidth() - 14, 9, { align: "right" });
  doc.text("Confidential", doc.internal.pageSize.getWidth() - 14, 14, { align: "right" });

  doc.setTextColor(...BRAND_NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, 14, 34);
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(subtitle, 14, 40);
  }
  doc.setDrawColor(230);
  doc.line(14, 44, doc.internal.pageSize.getWidth() - 14, 44);
}

function footer(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`RetailFixIt · Generated ${new Date().toISOString().slice(0, 10)}`, 14, h - 8);
    doc.text(`Page ${i} of ${pages}`, w - 14, h - 8, { align: "right" });
  }
}

function section(doc: jsPDF, y: number, title: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...BRAND_NAVY);
  doc.text(title, 14, y);
  doc.setDrawColor(240);
  doc.line(14, y + 1.5, doc.internal.pageSize.getWidth() - 14, y + 1.5);
  return y + 7;
}

function kv(doc: jsPDF, y: number, items: { label: string; value: string }[]) {
  const w = doc.internal.pageSize.getWidth() - 28;
  const col = w / 2;
  items.forEach((it, i) => {
    const cx = 14 + (i % 2) * col;
    const cy = y + Math.floor(i / 2) * 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(it.label.toUpperCase(), cx, cy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND_NAVY);
    doc.text(it.value || "—", cx, cy + 4);
  });
  return y + Math.ceil(items.length / 2) * 8 + 2;
}

const tableTheme = {
  headStyles: { fillColor: BRAND_NAVY, textColor: 255, fontSize: 9 },
  bodyStyles: { fontSize: 9, textColor: BRAND_NAVY },
  alternateRowStyles: { fillColor: [248, 249, 251] as [number, number, number] },
  styles: { cellPadding: 2.5 },
};

function save(doc: jsPDF, name: string) {
  doc.save(name);
}

// ---------- JOB REPORT ----------
export function generateJobReport(job: Job, opts: { vendor?: Vendor; assignments?: Assignment[]; audit?: AuditLog[] }) {
  const doc = new jsPDF();
  header(doc, `Job Report · ${job.reference}`, job.title);
  let y = 52;
  y = section(doc, y, "Overview");
  y = kv(doc, y, [
    { label: "Reference", value: job.reference },
    { label: "Status", value: job.status.replace("_", " ") },
    { label: "Priority", value: job.priority },
    { label: "Category", value: job.category },
    { label: "Created", value: new Date(job.createdAt).toLocaleString() },
    { label: "SLA due", value: new Date(job.slaDueAt).toLocaleString() },
    { label: "Estimated value", value: `$${job.estimatedValue.toLocaleString()}` },
    { label: "Complexity", value: job.complexityScore != null ? `${job.complexityScore}/100` : "—" },
  ]);
  y = section(doc, y + 4, "Customer");
  y = kv(doc, y, [
    { label: "Name", value: job.customerName },
    { label: "Phone", value: job.customerPhone ?? "—" },
    { label: "Address", value: `${job.address}, ${job.city}` },
    { label: "Region", value: job.region },
  ]);
  y = section(doc, y + 4, "Description");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_NAVY);
  const lines = doc.splitTextToSize(job.description, doc.internal.pageSize.getWidth() - 28);
  doc.text(lines, 14, y);
  y += lines.length * 5 + 4;

  if (job.aiSummary) {
    y = section(doc, y, "AI Summary");
    const s = doc.splitTextToSize(job.aiSummary, doc.internal.pageSize.getWidth() - 28);
    doc.text(s, 14, y);
    y += s.length * 5 + 4;
  }

  if (opts.vendor) {
    y = section(doc, y, "Assigned vendor");
    y = kv(doc, y, [
      { label: "Vendor", value: opts.vendor.name },
      { label: "Email", value: opts.vendor.email },
      { label: "Phone", value: opts.vendor.phone },
      { label: "Rating", value: `${opts.vendor.rating}` },
    ]);
  }

  if (opts.audit?.length) {
    autoTable(doc, {
      startY: y + 2,
      head: [["When", "Actor", "Action"]],
      body: opts.audit.filter(a => a.entityId === job.id).slice(0, 20).map(a => [new Date(a.createdAt).toLocaleString(), a.actor, a.action]),
      ...tableTheme,
    });
  }

  footer(doc);
  save(doc, `job-${job.reference}.pdf`);
}

// ---------- VENDOR REPORT ----------
export function generateVendorReport(vendor: Vendor, opts: { assignments?: Assignment[]; jobs?: Job[] }) {
  const doc = new jsPDF();
  header(doc, `Vendor Report · ${vendor.name}`, `${vendor.categories.join(", ")} · ${vendor.regions.join(", ")}`);
  let y = 52;
  y = section(doc, y, "Profile");
  y = kv(doc, y, [
    { label: "Status", value: vendor.status },
    { label: "Rating", value: `${vendor.rating} / 5` },
    { label: "Email", value: vendor.email },
    { label: "Phone", value: vendor.phone },
    { label: "Capacity", value: `${vendor.activeJobs} / ${vendor.capacity}` },
    { label: "Completed jobs", value: `${vendor.completedJobs}` },
    { label: "Avg response", value: `${vendor.avgResponseMinutes} min` },
    { label: "Last active", value: new Date(vendor.lastActiveAt).toLocaleString() },
  ]);

  if (opts.assignments?.length) {
    const jmap = new Map((opts.jobs ?? []).map(j => [j.id, j]));
    autoTable(doc, {
      startY: y + 4,
      head: [["Job", "Title", "Source", "Status", "Assigned"]],
      body: opts.assignments.slice(0, 30).map(a => {
        const j = jmap.get(a.jobId);
        return [j?.reference ?? a.jobId, j?.title ?? "—", a.assignedBy === "ai" ? "AI" : "Human", j?.status ?? a.status, new Date(a.assignedAt).toLocaleString()];
      }),
      ...tableTheme,
    });
  }
  footer(doc);
  save(doc, `vendor-${vendor.name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

// ---------- CUSTOMER REPORT ----------
export function generateCustomerReport(customerName: string, jobs: Job[]) {
  const doc = new jsPDF();
  const total = jobs.reduce((s, j) => s + j.estimatedValue, 0);
  header(doc, `Customer Report · ${customerName}`, `${jobs.length} job${jobs.length === 1 ? "" : "s"} · $${total.toLocaleString()} total value`);
  let y = 52;
  y = section(doc, y, "Summary");
  y = kv(doc, y, [
    { label: "Total jobs", value: `${jobs.length}` },
    { label: "Open", value: `${jobs.filter(j => !["completed", "cancelled"].includes(j.status)).length}` },
    { label: "Completed", value: `${jobs.filter(j => j.status === "completed").length}` },
    { label: "Estimated value", value: `$${total.toLocaleString()}` },
  ]);
  autoTable(doc, {
    startY: y + 4,
    head: [["Reference", "Title", "Category", "Status", "Priority", "Created"]],
    body: jobs.map(j => [j.reference, j.title, j.category, j.status, j.priority, new Date(j.createdAt).toLocaleDateString()]),
    ...tableTheme,
  });
  footer(doc);
  save(doc, `customer-${customerName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

// ---------- SERVICE / CATEGORY REPORT ----------
export function generateServiceReport(category: string, jobs: Job[]) {
  const doc = new jsPDF();
  header(doc, `Service Report · ${category}`, `${jobs.length} job${jobs.length === 1 ? "" : "s"} in this service line`);
  let y = 52;
  const open = jobs.filter(j => !["completed", "cancelled"].includes(j.status)).length;
  const value = jobs.reduce((s, j) => s + j.estimatedValue, 0);
  y = section(doc, y, "Summary");
  y = kv(doc, y, [
    { label: "Total", value: `${jobs.length}` },
    { label: "Open", value: `${open}` },
    { label: "Estimated value", value: `$${value.toLocaleString()}` },
    { label: "Urgent", value: `${jobs.filter(j => j.priority === "urgent").length}` },
  ]);
  autoTable(doc, {
    startY: y + 4,
    head: [["Reference", "Title", "Customer", "City", "Status", "Priority"]],
    body: jobs.map(j => [j.reference, j.title, j.customerName, j.city, j.status, j.priority]),
    ...tableTheme,
  });
  footer(doc);
  save(doc, `service-${category.toLowerCase()}.pdf`);
}

// ---------- OPERATIONS / OVERVIEW REPORT ----------
export function generateOperationsReport(metrics: DashboardMetrics, jobs: Job[], vendors: Vendor[]) {
  const doc = new jsPDF();
  header(doc, "Operations Report", "Platform-wide performance snapshot");
  let y = 52;
  y = section(doc, y, "Key metrics");
  y = kv(doc, y, [
    { label: "Open jobs", value: `${metrics.jobsOpen}` },
    { label: "Assigned today", value: `${metrics.jobsAssignedToday}` },
    { label: "Completed today", value: `${metrics.jobsCompletedToday}` },
    { label: "SLA breaches", value: `${metrics.slaBreaches}` },
    { label: "Avg assignment", value: `${metrics.avgAssignmentMinutes}m` },
    { label: "AI override rate", value: `${Math.round(metrics.aiOverrideRate * 100)}%` },
    { label: "Active vendors", value: `${metrics.vendorsActive}` },
    { label: "Total jobs", value: `${jobs.length}` },
  ]);
  autoTable(doc, {
    startY: y + 4,
    head: [["Status", "Count"]],
    body: metrics.jobsByStatus.map(s => [s.status.replace("_", " "), `${s.count}`]),
    ...tableTheme,
  });
  const after = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  autoTable(doc, {
    startY: after + 6,
    head: [["Top vendors", "Rating", "Active", "Completed"]],
    body: [...vendors].sort((a, b) => b.rating - a.rating).slice(0, 10).map(v => [v.name, `${v.rating}`, `${v.activeJobs}/${v.capacity}`, `${v.completedJobs}`]),
    ...tableTheme,
  });
  footer(doc);
  save(doc, `operations-${new Date().toISOString().slice(0, 10)}.pdf`);
}
