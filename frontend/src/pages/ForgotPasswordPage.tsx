import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { forgotPassword } from "../api/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      setSent(true); // Still show success to prevent email enumeration
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4 relative">
      <Link to="/login" className="absolute top-6 left-6 z-20 flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white">
        <ArrowLeft size={16} /> Back to Login
      </Link>

      <div className="relative z-10 w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        {sent ? (
          <div className="text-center">
            <CheckCircle2 size={64} className="text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
            <p className="text-sm text-slate-300">
              If an account exists with that email address, a password reset link has been sent to your inbox. Please check your spam folder if you don't see it within a few minutes.
            </p>
            <Link to="/login" className="inline-block mt-6 text-amber-300 hover:text-amber-200 font-semibold">Back to Login</Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-serif font-bold text-gold-500">Forgot Password</h1>
              <p className="text-xs font-bold text-amber-300 uppercase tracking-[0.2em] mt-2">Enter your registered email</p>
            </div>
            <form onSubmit={submit} className="space-y-5">
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-faith-500"
                />
              </div>
              <button disabled={loading} className="w-full bg-white text-slate-900 font-semibold py-3 rounded-xl hover:bg-slate-100 transition">
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
