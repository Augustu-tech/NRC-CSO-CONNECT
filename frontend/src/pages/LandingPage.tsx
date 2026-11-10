import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  useEffect(() => {
    document.title = "NRC CSO CONNECT | Faith, Community, Service, Excellence";
  }, []);

  // You can replace this URL with a photo of your church or community
  const bgImage = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop";

  return (
    <div className="relative min-h-screen w-full flex flex-col font-sans">
      
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={bgImage} 
          alt="NRC CSO Background" 
          className="w-full h-full object-cover"
        />
        {/* Soft gradient overlay for text readability (like the screenshot) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60"></div>
      </div>

      {/* Top Navigation */}
      <header className="relative z-20 w-full px-6 py-6 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img src="/logo-white.png" alt="NRC CSO" className="h-10 w-10 object-contain rounded-full bg-white/10 backdrop-blur-sm p-1" />
          <span className="font-semibold text-white tracking-wide text-lg">NRC CSO</span>
        </div>
        
        <div className="flex items-center gap-6">
          <Link 
            to="/login" 
            className="text-sm font-medium text-white/80 hover:text-white transition"
          >
            Sign In
          </Link>
          <Link 
            to="/login" 
            className="text-sm font-semibold bg-white text-slate-900 hover:bg-slate-100 px-6 py-2.5 rounded-full transition-all shadow-sm"
          >
            Enter Portal
          </Link>
        </div>
      </header>

      {/* Hero Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 max-w-4xl mx-auto pb-20 mt-10">
        
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-medium mb-8 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-gold-400"></span>
          Faith · Community · Service · Excellence
        </div>

        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-serif font-medium text-white tracking-tight leading-[1.1] drop-shadow-lg">
          Faith that unites us.<br />
          Service that defines us.
        </h1>

        {/* Subheadline */}
        <p className="mt-6 text-base md:text-lg text-white/90 max-w-xl mx-auto font-medium drop-shadow-md">
          The digital home for the NRC Catholic Students' Organization. Tracking participation, ensuring transparency, and growing our community.
        </p>

        {/* Call to Action */}
        <div className="mt-10">
          <Link 
            to="/login"
            className="inline-flex items-center justify-center bg-white text-slate-900 hover:bg-slate-100 font-semibold px-8 py-3.5 rounded-full transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            Enter Portal
          </Link>
        </div>

      </main>

      {/* Bottom Logos / Affiliates (like the screenshot) */}
      <footer className="relative z-10 w-full px-6 py-8 flex flex-col items-center border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <p className="text-[10px] text-white/60 uppercase tracking-widest mb-4 font-semibold">Our Affiliates</p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-80">
          <span className="text-white font-serif text-lg font-semibold">Choir</span>
          <span className="text-white font-serif text-lg font-semibold">YCS</span>
          <span className="text-white font-serif text-lg font-semibold">Charismatic</span>
          <span className="text-white font-serif text-lg font-semibold">Drama</span>
        </div>
      </footer>

    </div>
  );
}
