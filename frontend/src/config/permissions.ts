import type { Me } from "../api/client";

export type Role =
  | "super_admin" | "chairperson" | "vice_chairperson"
  | "secretary" | "vice_secretary"
  | "treasurer" | "vice_treasurer"
  | "organizing_secretary" | "publicity_secretary"
  | "mphakati_leader" | "affiliate_coordinator"
  | "patron" | "auditor" | "member";

export type Perm =
  | "dashboard.view"
  | "leaderboard.view"
  | "members.view" | "members.manage"
  | "activities.view" | "activities.manage"
  | "finance.view_aggregate" | "finance.view_detail" | "finance.manage"
  | "announcements.view" | "announcements.manage"
  | "affiliates.view" | "affiliates.manage"
  | "prayer.view" | "prayer.submit" | "prayer.moderate"
  | "reports.view"
  | "scoring.view" | "scoring.manage"
  | "settings.manage"
  | "audit.view";

// Explicit table = auditable. No wildcards.
export const ROLE_PERMS: Record<Role, Perm[]> = {
  super_admin: [
    "dashboard.view","leaderboard.view",
    "members.view","members.manage",
    "activities.view","activities.manage",
    "finance.view_aggregate","finance.view_detail","finance.manage",
    "announcements.view","announcements.manage",
    "affiliates.view","affiliates.manage",
    "prayer.view","prayer.submit","prayer.moderate",
    "reports.view","scoring.view","scoring.manage",
    "settings.manage","audit.view",
  ],
  chairperson: [
    "dashboard.view","leaderboard.view",
    "members.view","members.manage",
    "activities.view","activities.manage",
    "finance.view_aggregate",
    "announcements.view","announcements.manage",
    "affiliates.view","affiliates.manage",
    "prayer.view","prayer.moderate",
    "reports.view","scoring.view","audit.view",
  ],
  vice_chairperson: [
    "dashboard.view","leaderboard.view",
    "members.view","members.manage",
    "activities.view","activities.manage",
    "finance.view_aggregate",
    "announcements.view","announcements.manage",
    "affiliates.view","affiliates.manage",
    "prayer.view","prayer.moderate",
    "reports.view","scoring.view",
  ],
  secretary: [
    "dashboard.view","leaderboard.view",
    "members.view","members.manage",
    "activities.view","activities.manage",
    "announcements.view","announcements.manage",
    "affiliates.view","affiliates.manage",
    "prayer.view","prayer.moderate",
    "reports.view","scoring.view",
  ],
  vice_secretary: [
    "dashboard.view","leaderboard.view",
    "members.view","members.manage",
    "activities.view","activities.manage",
    "announcements.view","announcements.manage",
    "affiliates.view","affiliates.manage",
    "prayer.view","prayer.moderate",
    "reports.view","scoring.view",
  ],
  treasurer: [
    "dashboard.view","leaderboard.view",
    "members.view",
    "activities.view",
    "finance.view_aggregate","finance.view_detail","finance.manage",
    "announcements.view","prayer.view",
    "reports.view","scoring.view",
  ],
  vice_treasurer: [
    "dashboard.view","leaderboard.view",
    "members.view",
    "activities.view",
    "finance.view_aggregate","finance.view_detail","finance.manage",
    "announcements.view","prayer.view",
    "reports.view","scoring.view",
  ],
  organizing_secretary: [
    "dashboard.view","leaderboard.view",
    "members.view",
    "activities.view","activities.manage",
    "announcements.view",
    "prayer.view",
    "reports.view","scoring.view",
  ],
  publicity_secretary: [
    "dashboard.view","leaderboard.view",
    "activities.view",
    "announcements.view","announcements.manage",
    "prayer.view",
    "reports.view","scoring.view",
  ],
  mphakati_leader: [
    "dashboard.view","leaderboard.view",
    "members.view","members.manage",
    "activities.view","activities.manage",
    "announcements.view","prayer.view",
    "reports.view","scoring.view",
  ],
  affiliate_coordinator: [
    "dashboard.view","leaderboard.view",
    "members.view",
    "activities.view","activities.manage",
    "affiliates.view","affiliates.manage",
    "announcements.view","prayer.view",
    "reports.view","scoring.view",
  ],
  patron: [
    "dashboard.view","leaderboard.view",
    "finance.view_aggregate",
    "reports.view","scoring.view",
  ],
  auditor: [
    "dashboard.view","leaderboard.view",
    "members.view","activities.view",
    "finance.view_aggregate","finance.view_detail",
    "announcements.view","prayer.view",
    "reports.view","scoring.view","audit.view",
  ],
  member: [
    "dashboard.view","leaderboard.view",
    "announcements.view","prayer.view","prayer.submit",
  ],
};

export function hasPerm(me: Me | null, perm: Perm): boolean {
  if (!me) return false;
  if (me.is_superuser) return true;
  const perms = ROLE_PERMS[me.role as Role];
  return perms ? perms.includes(perm) : false;
}
