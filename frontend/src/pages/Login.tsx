import { FormEvent, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ArrowLeft, Lock, User } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Sign In | NRC CSO";
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/dashboard");
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError("Invalid username or password.");
      } else if (err.response?.status === 403) {
        setError(err.response?.data?.detail || "Your account is inactive. Contact the Secretary.");
      } else if (err.response) {
        setError(`Server error: ${err.response.status}.`);
      } else {
        setError(`Network Error: Could not reach the API.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4 relative overflow-hidden font-sans">
      
      {/* Background Industrial Grid & Glow */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e1b4b]/80 via-[#0f172a] to-[#020617]"></div>
        <div className="absolute inset-0" style={{ 
          backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-faith-600/10 rounded-full blur-[100px]"></div>
      </div>

      <Link 
        to="/" 
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition"
      >
        <ArrowLeft size={16} /> Back to home
      </Link>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img src="/nrc_logo.png" alt="NRC CSO Logo" className="h-32 w-32 object-contain drop-shadow-2xl" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-gold-500 tracking-tight drop-shadow-sm">
              NRC CSO CONNECT
            </h1>
            <p className="text-[13px] font-bold text-amber-300 uppercase tracking-[0.25em] mt-3 drop-shadow-sm">
              Faith · Community · Service
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg text-center backdrop-blur-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 ml-1">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={16} className="text-slate-500" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-faith-500 focus:border-transparent transition-all"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 ml-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={16} className="text-slate-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-faith-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white hover:bg-slate-100 text-slate-900 font-semibold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] disabled:opacity-50 mt-2"
            >
              {loading ? "Authenticating…" : "Sign In"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs">
            <Link to="/forgot-password" className="text-slate-400 hover:text-white transition">Forgot password?</Link>
            <Link to="/register" className="text-amber-300 hover:text-amber-200 font-semibold transition">Create an account</Link>
          </div>

          <p className="text-center text-xs text-slate-500 mt-8">
            Restricted access. Authorized members only.
          </p>
        </div>
      </div>
    </div>
  );
}
