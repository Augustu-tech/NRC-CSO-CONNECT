import { FormEvent, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, User, Lock, Mail, Hash } from "lucide-react";
import { registerUser, getMiphakati, type Mphakati } from "../api/client";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [miphakati, setMiphakati] = useState<Mphakati[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    document.title = "Register | NRC CSO";
    getMiphakati().then((r) => setMiphakati(r.data.results || r.data || []));
  }, []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      await registerUser({
        username: formData.get("username"),
        password: formData.get("password"),
        email: formData.get("email"),
        first_name: formData.get("first_name"),
        last_name: formData.get("last_name"),
        student_id: formData.get("student_id"),
        mphakati_id: Number(formData.get("mphakati_id")),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4 relative overflow-hidden font-sans py-12">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e1b4b]/80 via-[#0f172a] to-[#020617]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-faith-600/10 rounded-full blur-[100px]"></div>
      </div>

      <Link to="/login" className="absolute top-6 left-6 z-20 flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition">
        <ArrowLeft size={16} /> Back to Login
      </Link>

      <div className="relative z-10 w-full max-w-lg">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          
          <div className="text-center mb-6">
            <img src="/nrc_logo.png" alt="Logo" className="h-20 w-20 object-contain mx-auto mb-4" />
            <h1 className="text-2xl font-serif font-bold text-gold-500 tracking-tight">Join NRC CSO</h1>
            <p className="text-xs font-bold text-amber-300 uppercase tracking-[0.2em] mt-2">Create your account</p>
          </div>

          {success ? (
            <div className="text-center space-y-4 py-8">
              <div className="h-16 w-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <User size={32} />
              </div>
              <h2 className="text-xl font-bold text-white">Registration Submitted!</h2>
              <p className="text-sm text-slate-300">Your account is pending approval by the CSO Secretary. You will be notified once it is activated.</p>
              <Link to="/login" className="inline-block mt-4 bg-white text-slate-900 font-semibold px-6 py-2.5 rounded-xl">Return to Login</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg text-center">{error}</div>}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 ml-1">First Name</label>
                  <input name="first_name" required className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-faith-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 ml-1">Last Name</label>
                  <input name="last_name" required className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-faith-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 ml-1">Student ID</label>
                  <div className="relative">
                    <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input name="student_id" required className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-faith-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 ml-1">Mphakati</label>
                  <select name="mphakati_id" required className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-faith-500">
                    <option value="" className="text-slate-900">Select...</option>
                    {miphakati.map(m => <option key={m.id} value={m.id} className="text-slate-900">{m.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 ml-1">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input name="email" type="email" required className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-faith-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 ml-1">Username</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input name="username" required className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-faith-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 ml-1">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input name="password" type="password" required className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-faith-500" />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-white hover:bg-slate-100 text-slate-900 font-semibold py-3 rounded-xl transition-all mt-4">
                {loading ? "Submitting..." : "Register Account"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
