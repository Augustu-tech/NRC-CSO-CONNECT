import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export default function Forbidden() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-sm">
        <ShieldAlert className="mx-auto text-slate-400" size={48} strokeWidth={1.5} />
        <h2 className="text-lg font-semibold text-slate-900 mt-4">
          Access denied
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Your role does not have permission to view this page.
        </p>
        <Link
          to="/"
          className="inline-block mt-5 text-sm text-faith-700 hover:underline"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
