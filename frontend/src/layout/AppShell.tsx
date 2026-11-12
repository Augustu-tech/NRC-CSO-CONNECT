import { useMemo, useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { hasPerm } from "../config/permissions";
import { NAV, SECTION_LABELS, type NavSection } from "../config/navConfig";
import NotificationBell from "../components/NotificationBell";

const SECTIONS: NavSection[] = ["main", "community", "operations", "admin"];

export default function AppShell() {
  const { me, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true); // <-- New desktop toggle state
  const location = useLocation();

  const visible = useMemo(() => NAV.filter((n) => hasPerm(me, n.perm)), [me]);

  const grouped = useMemo(() => {
    const map: Record<NavSection, typeof visible> = {
      main: [],
      community: [],
      operations: [],
      admin: [],
    };
    for (const item of visible) map[item.section].push(item);
    return map;
  }, [visible]);

  const currentLabel = useMemo(() => {
    const match = NAV.find(
      (n) =>
        n.path === location.pathname ||
        (n.path !== "/dashboard" && location.pathname.startsWith(n.path)),
    );
    return match?.label ?? "Dashboard";
  }, [location.pathname]);

  // Update browser tab title based on current page
  useEffect(() => {
    document.title = `${currentLabel} | NRC CSO`;
  }, [currentLabel]);

  return (
    <div className="min-h-full flex bg-slate-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 h-screen bg-faith-900 text-slate-200 z-40
          flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} 
          ${desktopOpen ? "md:w-64 md:translate-x-0" : "md:w-0 md:opacity-0 md:overflow-hidden"}`}
      >
        <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between whitespace-nowrap overflow-hidden">
          <div className="flex items-center gap-3">
            <img
              src="/nrc_logo.png"
              alt="NRC CSO Logo"
              className="h-11 w-11 object-contain rounded-full bg-white flex-shrink-0"
            />
            <div>
              <p className="text-white font-bold text-sm leading-tight tracking-wide">
                NRC CSO
              </p>
              <p className="text-faith-400 text-[10px] tracking-[0.2em] uppercase mt-0.5">
                Connect
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
          {SECTIONS.map((section) =>
            grouped[section].length === 0 ? null : (
              <div key={section}>
                <p className="px-3 text-[10px] uppercase tracking-wider text-faith-400 mb-1 whitespace-nowrap">
                  {SECTION_LABELS[section]}
                </p>
                <ul className="space-y-0.5">
                  {grouped[section].map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.path}>
                        <NavLink
                          to={item.path}
                          onClick={() => setMobileOpen(false)}
                          end={item.path === "/dashboard"}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap
                             ${
                               isActive
                                 ? "bg-white/10 text-white"
                                 : "text-slate-300 hover:bg-white/5 hover:text-white"
                             }`
                          }
                        >
                          <Icon
                            size={16}
                            strokeWidth={2}
                            className="flex-shrink-0"
                          />
                          <span>{item.label}</span>
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ),
          )}
        </nav>

        <div className="border-t border-white/10 px-3 py-3 overflow-hidden">
          <div className="px-2 mb-2 whitespace-nowrap">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Signed in as</p>
            <p className="text-sm text-white font-semibold truncate mt-0.5">
              {me?.full_name || me?.first_name || me?.username}
            </p>
            <p className="text-[11px] text-gold-500 font-medium capitalize mt-0.5">
              {me?.is_superuser ? "Super Administrator" : (me?.role || "member").replace(/_/g, " ")}
            </p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                       text-slate-300 hover:bg-white/5 hover:text-white whitespace-nowrap"
          >
            <LogOut size={16} className="flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col transition-all duration-300">
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 md:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.innerWidth < 768) {
                  setMobileOpen(true);
                } else {
                  setDesktopOpen(!desktopOpen);
                }
              }}
              className="text-slate-600 hover:text-slate-900 transition"
              aria-label="Toggle menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-sm font-medium text-slate-700">
              {currentLabel}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="text-xs text-slate-400 hidden md:block border-l border-slate-200 pl-4">
              {me?.current_mphakati_label ?? ""}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
