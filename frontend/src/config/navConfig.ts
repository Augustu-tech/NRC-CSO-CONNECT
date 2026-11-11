import {
  LayoutDashboard, Trophy, Users, CalendarDays, Megaphone, Heart,
  Wallet, FileSpreadsheet, Settings, ScrollText, User, Vote, Shield, GraduationCap,
  type LucideIcon,
} from "lucide-react";
import type { Perm } from "./permissions";

export type NavSection = "main" | "community" | "operations" | "admin";

export type NavItem = {
  label: string;
  path: string;
  perm: Perm;
  icon: LucideIcon;
  section: NavSection;
};

export const NAV: NavItem[] = [
  { label: "Dashboard",        path: "/dashboard",              perm: "dashboard.view",       icon: LayoutDashboard, section: "main" },
  { label: "Leaderboard",      path: "/leaderboard",   perm: "leaderboard.view",     icon: Trophy,          section: "main" },
  { label: "My Profile",       path: "/profile",       perm: "dashboard.view",       icon: User,            section: "main" },
  { label: "Awards History",   path: "/awards",        perm: "leaderboard.view",     icon: Trophy,          section: "main" },
  { label: "Elections",        path: "/elections",     perm: "leaderboard.view",     icon: Vote,            section: "main" },

  { label: "Members",          path: "/members",       perm: "members.view",         icon: Users,           section: "community" },
  { label: "Activities",       path: "/activities",    perm: "activities.view",      icon: CalendarDays,    section: "community" },
  { label: "Affiliates",       path: "/affiliates",   perm: "affiliates.view",      icon: Users,           section: "community" },
  { label: "Announcements",    path: "/announcements", perm: "announcements.view",   icon: Megaphone,       section: "community" },
  { label: "Prayer Intentions",path: "/prayer",        perm: "prayer.view",          icon: Heart,           section: "community" },
  { label: "Finalists",        path: "/finalists",    perm: "dashboard.view",       icon: GraduationCap,   section: "community" },

  { label: "Finance",          path: "/finance",       perm: "finance.view_aggregate", icon: Wallet,        section: "operations" },
  { label: "Reports",          path: "/reports",       perm: "reports.view",         icon: FileSpreadsheet, section: "operations" },

  { label: "Scoring Rules",    path: "/scoring-settings", perm: "scoring.manage",   icon: Settings,        section: "admin" },
  { label: "User Management",  path: "/users",         perm: "settings.manage",      icon: Shield,          section: "admin" },
  { label: "Settings",         path: "/settings",      perm: "settings.manage",      icon: Settings,        section: "admin" },
  { label: "Audit Log",        path: "/audit",         perm: "audit.view",           icon: ScrollText,      section: "admin" },
];

export const SECTION_LABELS: Record<NavSection, string> = {
  main: "Main",
  community: "Community",
  operations: "Operations",
  admin: "Administration",
};
