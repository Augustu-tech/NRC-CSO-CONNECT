import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { hasPerm, type Perm } from "../config/permissions";

export function RequirePerm({ perm, children }: { perm: Perm; children: ReactNode }) {
  const { me, loadingMe } = useAuth();
  if (loadingMe) {
    return (
      <div className="py-16 text-center text-sm text-slate-500">Loading…</div>
    );
  }
  if (!me || !hasPerm(me, perm)) {
    return <Navigate to="/forbidden" replace />;
  }
  return <>{children}</>;
}
