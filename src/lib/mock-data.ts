// Curated demo data for the SignForge dashboard. Replace with live queries per phase.

export type DocStatus = "draft" | "pending" | "signed" | "completed" | "declined" | "expired";

export const statusMeta: Record<DocStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  pending: { label: "Pending", className: "bg-warning/15 text-warning" },
  signed: { label: "Signed", className: "bg-accent/15 text-accent" },
  completed: { label: "Completed", className: "bg-success/15 text-success" },
  declined: { label: "Declined", className: "bg-destructive/15 text-destructive" },
  expired: { label: "Expired", className: "bg-destructive/10 text-destructive/80" },
};

export const documents = [
  { id: "d1", title: "Master Services Agreement — Acme Corp", type: "PDF", status: "pending" as DocStatus, pages: 24, updated: "2h ago", recipients: ["j.doe@acme.io", "legal@acme.io"], size: "2.4 MB" },
  { id: "d2", title: "NDA — Quantum Ventures", type: "PDF", status: "completed" as DocStatus, pages: 6, updated: "5h ago", recipients: ["ceo@quantum.vc"], size: "820 KB" },
  { id: "d3", title: "Employment Contract — R. Nakamura", type: "DOCX", status: "signed" as DocStatus, pages: 11, updated: "Yesterday", recipients: ["r.nakamura@mail.com"], size: "1.1 MB" },
  { id: "d4", title: "Q3 Vendor Invoice Bundle", type: "XLSX", status: "draft" as DocStatus, pages: 3, updated: "2d ago", recipients: [], size: "540 KB" },
  { id: "d5", title: "Property Lease — 44 Harbor St", type: "PDF", status: "pending" as DocStatus, pages: 18, updated: "3d ago", recipients: ["tenant@mail.com", "agent@realty.co"], size: "3.2 MB" },
  { id: "d6", title: "Partnership MoU — Helio Labs", type: "PDF", status: "declined" as DocStatus, pages: 9, updated: "4d ago", recipients: ["ops@helio.io"], size: "1.7 MB" },
  { id: "d7", title: "Consulting SOW — Redshift", type: "PDF", status: "completed" as DocStatus, pages: 14, updated: "6d ago", recipients: ["pm@redshift.dev"], size: "2.0 MB" },
  { id: "d8", title: "Onboarding Packet — New Hires", type: "PDF", status: "expired" as DocStatus, pages: 21, updated: "1w ago", recipients: ["hr@company.com"], size: "4.1 MB" },
];

export const templates = [
  { id: "t1", title: "Standard NDA", category: "Legal", uses: 342, fields: 8, updated: "1d ago" },
  { id: "t2", title: "Sales Contract", category: "Sales", uses: 218, fields: 14, updated: "3d ago" },
  { id: "t3", title: "Offer Letter", category: "HR", uses: 176, fields: 11, updated: "1w ago" },
  { id: "t4", title: "Consulting Agreement", category: "Legal", uses: 129, fields: 16, updated: "2w ago" },
  { id: "t5", title: "Invoice Approval", category: "Finance", uses: 98, fields: 6, updated: "2w ago" },
  { id: "t6", title: "Vendor Onboarding", category: "Ops", uses: 64, fields: 12, updated: "3w ago" },
];

export const signatures = [
  { id: "s1", name: "Primary Signature", type: "Drawn", isDefault: true, font: "cursive" },
  { id: "s2", name: "Formal Full Name", type: "Typed", isDefault: false, font: "serif" },
  { id: "s3", name: "Initials", type: "Drawn", isDefault: false, font: "cursive" },
  { id: "s4", name: "AI Enhanced", type: "AI", isDefault: false, font: "cursive" },
];

export const team = [
  { id: "m1", name: "Alex Rivera", email: "alex@signforge.io", role: "Admin", status: "active", initials: "AR" },
  { id: "m2", name: "Priya Shah", email: "priya@signforge.io", role: "Manager", status: "active", initials: "PS" },
  { id: "m3", name: "Marcus Cole", email: "marcus@signforge.io", role: "Member", status: "active", initials: "MC" },
  { id: "m4", name: "Lena Fischer", email: "lena@signforge.io", role: "Member", status: "invited", initials: "LF" },
  { id: "m5", name: "Tomás Vidal", email: "tomas@signforge.io", role: "Member", status: "active", initials: "TV" },
];

export const certificates = [
  { id: "c1", name: "SignForge Root CA", issuer: "SignForge CA", fingerprint: "3F:A2:9C:...:E1", status: "valid", validUntil: "2027-04-11" },
  { id: "c2", name: "Alex Rivera — eSign", issuer: "SignForge CA", fingerprint: "8B:11:74:...:A9", status: "valid", validUntil: "2026-11-02" },
  { id: "c3", name: "Enterprise TSA", issuer: "GlobalSign", fingerprint: "D4:60:2E:...:7C", status: "valid", validUntil: "2026-08-19" },
  { id: "c4", name: "Legacy Signing Cert", issuer: "SignForge CA", fingerprint: "1A:F0:B3:...:44", status: "expiring", validUntil: "2026-07-30" },
];

export const auditLogs = [
  { id: "a1", actor: "Alex Rivera", action: "Signed document", target: "MSA — Acme Corp", category: "signature", ip: "192.0.2.14", time: "10:42 AM" },
  { id: "a2", actor: "Priya Shah", action: "Sent for signature", target: "Property Lease — 44 Harbor St", category: "document", ip: "192.0.2.31", time: "10:05 AM" },
  { id: "a3", actor: "System", action: "Timestamp verified", target: "NDA — Quantum Ventures", category: "security", ip: "internal", time: "09:51 AM" },
  { id: "a4", actor: "Marcus Cole", action: "Uploaded document", target: "Q3 Vendor Invoice Bundle", category: "document", ip: "192.0.2.88", time: "09:20 AM" },
  { id: "a5", actor: "Lena Fischer", action: "Declined to sign", target: "Partnership MoU — Helio Labs", category: "signature", ip: "203.0.113.5", time: "Yesterday" },
  { id: "a6", actor: "System", action: "AES-256 encryption applied", target: "Employment Contract", category: "security", ip: "internal", time: "Yesterday" },
  { id: "a7", actor: "Alex Rivera", action: "Added team member", target: "tomas@signforge.io", category: "team", ip: "192.0.2.14", time: "2d ago" },
];

export const activityData = [
  { name: "Mon", sent: 24, signed: 18, completed: 12 },
  { name: "Tue", sent: 32, signed: 27, completed: 21 },
  { name: "Wed", sent: 28, signed: 24, completed: 19 },
  { name: "Thu", sent: 41, signed: 33, completed: 28 },
  { name: "Fri", sent: 38, signed: 35, completed: 31 },
  { name: "Sat", sent: 12, signed: 9, completed: 7 },
  { name: "Sun", sent: 8, signed: 6, completed: 5 },
];

export const statusBreakdown = [
  { name: "Completed", value: 58, color: "var(--color-success)" },
  { name: "Pending", value: 24, color: "var(--color-warning)" },
  { name: "Signed", value: 12, color: "var(--color-accent)" },
  { name: "Declined", value: 6, color: "var(--color-destructive)" },
];

export const turnaroundData = [
  { name: "Jan", hours: 26 },
  { name: "Feb", hours: 22 },
  { name: "Mar", hours: 19 },
  { name: "Apr", hours: 17 },
  { name: "May", hours: 14 },
  { name: "Jun", hours: 11 },
];
