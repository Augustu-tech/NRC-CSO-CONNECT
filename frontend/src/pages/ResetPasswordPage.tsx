import { FormEvent, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { resetPasswordConfirm } from "../api/client";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");
  
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!uid || !token) {
      setError("Invalid reset link.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await resetPasswordConfirm({ uid, token, new_password: password });
      alert("Password reset successfully! Please log in.");
      navigate("/login");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Reset failed. Link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-serif font-bold text-gold-500">Set New Password</h1>
          <p className="text-xs font-bold text-amber-300 uppercase tracking-[0.2em] mt-2">Choose a strong password</p>
        </div>
        
        <form onSubmit={submit} className="space-y-5">
          {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm text-center">{error}</div>}
          
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="password"
              required
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-faith-500"
            />
          </div>
          
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="password"
              required
              placeholder="Confirm New Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-faith-500"
            />
          </div>

          <button disabled={loading} className="w-full bg-white text-slate-900 font-semibold py-3 rounded-xl hover:bg-slate-100 transition">
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-slate-400 hover:text-white">Cancel and return to login</Link>
        </div>
      </div>
    </div>
  );
}
