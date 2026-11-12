import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { checkInWithToken } from "../api/client";
import { Card } from "../ui/Card";

function formatApiError(err: any): string {
  const data = err?.response?.data;
  if (!data) return err?.message || "Could not reach the server.";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  // Fallback: pull first message from any field
  for (const val of Object.values(data)) {
    if (Array.isArray(val) && val.length > 0) return String(val[0]);
    if (typeof val === "string") return val;
  }
  return "Check-in failed. Please try again.";
}

export default function CheckInPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [activityTitle, setActivityTitle] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No check-in token was provided.");
      return;
    }

    checkInWithToken(token)
      .then((res) => {
        setStatus("success");
        setMessage(res.data.detail || "Attendance recorded successfully.");
        setActivityTitle(res.data.activity || "");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(formatApiError(err));
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <Card className="w-full max-w-sm p-8 text-center bg-white/10 backdrop-blur-xl border-white/20">
        {status === "loading" && (
          <div className="flex flex-col items-center">
            <Loader2 size={48} className="text-faith-400 animate-spin mb-4" />
            <p className="text-white">Recording attendance...</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center">
            <CheckCircle2 size={64} className="text-emerald-400 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Checked In!</h2>
            {activityTitle && (
              <p className="text-sm text-amber-300 font-medium mb-1">{activityTitle}</p>
            )}
            <p className="text-sm text-slate-300 mb-6">{message}</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full bg-white text-slate-900 font-semibold py-3 rounded-xl hover:bg-slate-100 transition"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center">
            <XCircle size={64} className="text-red-400 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Check-in Failed</h2>
            <p className="text-sm text-slate-300 bg-red-900/30 border border-red-500/30 rounded-lg p-3 w-full mb-6">
              {message}
            </p>
            <Link
              to="/login"
              className="w-full bg-faith-600 text-white font-semibold py-3 rounded-xl hover:bg-faith-500 transition mb-2"
            >
              Sign In
            </Link>
            <Link to="/" className="text-faith-300 hover:text-white text-xs mt-2 underline">
              Return to Home
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
