import { supabase } from "@/integrations/supabase/client";

export type PIAStatus = "pending" | "active" | "suspended" | "rejected";
export type SubmissionStatus =
  | "draft" | "submitted" | "under_review" | "changes_requested" | "resubmitted"
  | "approved" | "live" | "rejected" | "archived" | "suspended";

export type PIA = {
  id: string; full_name: string; phone: string; email: string;
  national_id: string | null; county: string | null; town: string | null;
  assigned_region: string | null; mpesa_number: string | null;
  referred_by_code: string | null; agent_code: string | null;
  status: PIAStatus; admin_notes: string | null;
  approved_at: string | null; last_login_at: string | null;
  applied_at: string; created_at: string; updated_at: string;
};

export type Supplier = {
  id: string; agent_id: string; agent_code: string | null;
  name: string; contact_person: string | null; phone: string;
  alt_phone: string | null; email: string | null;
  county: string | null; town: string | null; address: string | null;
  product_categories: string[] | null; registration_number: string | null;
  status: string; admin_notes: string | null;
  created_at: string; updated_at: string;
};

export type Submission = {
  id: string; agent_id: string; agent_code: string | null;
  supplier_introduction_id: string | null;
  name: string; category: string | null; subcategory: string | null;
  description: string | null; specifications: string | null;
  supplier_price: number | null; proposed_selling_price: number | null;
  stock: number | null; stock_status: string | null;
  min_order_qty: number | null; delivery_available: boolean | null;
  delivery_locations: string | null; warranty: string | null;
  condition: string | null; brand: string | null; model: string | null;
  images: string[] | null; main_image: string | null;
  agent_notes: string | null; admin_notes: string | null;
  status: SubmissionStatus; reviewer_id: string | null;
  review_started_at: string | null; approved_at: string | null;
  approved_by: string | null; published_at: string | null;
  published_product_id: string | null; rejection_reason: string | null;
  resubmission_allowed: boolean; created_at: string; updated_at: string;
};

export const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = {
  draft: "Draft", submitted: "Submitted", under_review: "Under Review",
  changes_requested: "Changes Requested", resubmitted: "Resubmitted",
  approved: "Approved", live: "Live", rejected: "Rejected",
  archived: "Archived", suspended: "Suspended",
};

export const PIA_STATUS_LABEL: Record<PIAStatus, string> = {
  pending: "Pending Approval", active: "Active", suspended: "Suspended", rejected: "Rejected",
};

export async function getMyPIA(): Promise<PIA | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("product_intro_agents" as never).select("*").eq("id", user.id).maybeSingle();
  return data as PIA | null;
}

export async function listMySubmissions(agentId: string): Promise<Submission[]> {
  const { data } = await supabase.from("product_submissions" as never)
    .select("*").eq("agent_id", agentId).order("created_at", { ascending: false });
  return (data as Submission[]) || [];
}

export async function listMySuppliers(agentId: string): Promise<Supplier[]> {
  const { data } = await supabase.from("supplier_introductions" as never)
    .select("*").eq("agent_id", agentId).order("created_at", { ascending: false });
  return (data as Supplier[]) || [];
}

export async function listAllPIA(): Promise<PIA[]> {
  const { data } = await supabase.from("product_intro_agents" as never).select("*").order("applied_at", { ascending: false });
  return (data as PIA[]) || [];
}

export async function listAllSubmissions(): Promise<Submission[]> {
  const { data } = await supabase.from("product_submissions" as never).select("*").order("created_at", { ascending: false });
  return (data as Submission[]) || [];
}

export async function listAllSuppliers(): Promise<Supplier[]> {
  const { data } = await supabase.from("supplier_introductions" as never).select("*").order("created_at", { ascending: false });
  return (data as Supplier[]) || [];
}

export async function updatePIAStatus(id: string, status: PIAStatus, admin_notes?: string) {
  const patch: Record<string, unknown> = { status };
  if (admin_notes !== undefined) patch.admin_notes = admin_notes;
  return supabase.from("product_intro_agents" as never).update(patch as never).eq("id", id);
}

export async function updateSubmissionStatus(id: string, patch: Partial<Submission>) {
  return supabase.from("product_submissions" as never).update(patch as never).eq("id", id);
}

export async function updateSupplier(id: string, patch: Partial<Supplier>) {
  return supabase.from("supplier_introductions" as never).update(patch as never).eq("id", id);
}

export async function insertSubmission(row: Partial<Submission>) {
  return supabase.from("product_submissions" as never).insert(row as never).select().single();
}

export async function insertSupplier(row: Partial<Supplier>) {
  return supabase.from("supplier_introductions" as never).insert(row as never).select().single();
}

export async function recordReview(row: {
  submission_id: string; action: string; from_status?: string; to_status?: string;
  reason_codes?: string[]; notes?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  return supabase.from("product_submission_reviews" as never).insert({ ...row, admin_id: user?.id ?? null } as never);
}

export async function publishSubmission(id: string) {
  return supabase.rpc("publish_product_submission" as never, { _submission_id: id } as never);
}

export async function notifyUser(user_id: string, title: string, body: string, link?: string) {
  return supabase.from("notifications").insert({ user_id, title, body, link: link ?? null } as never);
}

export async function logActivity(row: {
  action: string; agent_id?: string | null; submission_id?: string | null;
  supplier_id?: string | null; details?: Record<string, unknown>;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  return supabase.from("pia_activity_log" as never).insert({
    actor_id: user?.id ?? null,
    actor_role: null,
    agent_id: row.agent_id ?? null,
    submission_id: row.submission_id ?? null,
    supplier_id: row.supplier_id ?? null,
    action: row.action,
    details: row.details ?? {},
  } as never);
}

/* ============================================================
 * PIA Commissions (1% commission tracking)
 * ============================================================ */
export type CommissionStatus =
  | "pending" | "confirmed" | "approved" | "paid"
  | "on_hold" | "cancelled" | "reversed" | "disputed";

export type PIACommission = {
  id: string;
  order_id: string;
  order_item_key: string;
  product_id: string | null;
  product_name: string;
  supplier_introduction_id: string | null;
  supplier_name: string | null;
  agent_id: string | null;
  agent_code: string | null;
  agent_name: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  unit_price: number;
  quantity: number;
  line_value: number;
  commission_rate: number;
  commission_amount: number;
  order_status: string | null;
  commission_status: CommissionStatus;
  order_date: string | null;
  completion_date: string | null;
  confirmed_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  payment_method: string | null;
  admin_notes: string | null;
  reversal_reason: string | null;
  created_at: string;
  updated_at: string;
};

export const COMMISSION_STATUS_LABEL: Record<CommissionStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  approved: "Approved for Payment",
  paid: "Paid",
  on_hold: "On Hold",
  cancelled: "Cancelled",
  reversed: "Reversed",
  disputed: "Disputed",
};

export function commissionBadgeClass(s: CommissionStatus) {
  switch (s) {
    case "paid": return "bg-primary/15 text-primary";
    case "approved": return "bg-primary/10 text-primary";
    case "confirmed": return "bg-accent/15 text-accent-foreground";
    case "pending": return "bg-secondary text-muted-foreground";
    case "on_hold": return "bg-yellow-100 text-yellow-800";
    case "cancelled":
    case "reversed":
    case "disputed": return "bg-destructive/10 text-destructive";
    default: return "bg-secondary text-muted-foreground";
  }
}

export async function listMyCommissions(agentId: string): Promise<PIACommission[]> {
  const { data } = await supabase.from("pia_commissions" as never)
    .select("*").eq("agent_id", agentId).order("created_at", { ascending: false });
  return (data as PIACommission[]) || [];
}

export async function listAllCommissions(): Promise<PIACommission[]> {
  const { data } = await supabase.from("pia_commissions" as never)
    .select("*").order("created_at", { ascending: false });
  return (data as PIACommission[]) || [];
}

export async function setCommissionStatus(id: string, status: CommissionStatus, note?: string) {
  return supabase.rpc("set_pia_commission_status" as never, {
    _commission_id: id, _new_status: status, _note: note ?? null,
  } as never);
}

export async function markCommissionPaid(id: string, args: {
  amount: number; method: string; reference: string; mpesa?: string; note?: string;
}) {
  return supabase.rpc("mark_pia_commission_paid" as never, {
    _commission_id: id,
    _amount: args.amount,
    _method: args.method,
    _reference: args.reference,
    _mpesa: args.mpesa ?? null,
    _note: args.note ?? null,
  } as never);
}

export function submissionBadgeClass(s: SubmissionStatus) {
  switch (s) {
    case "live":
    case "approved":
      return "bg-primary/10 text-primary";
    case "changes_requested":
    case "rejected":
    case "suspended":
      return "bg-destructive/10 text-destructive";
    case "under_review":
    case "submitted":
    case "resubmitted":
      return "bg-accent/10 text-accent-foreground";
    default:
      return "bg-secondary text-muted-foreground";
  }
}