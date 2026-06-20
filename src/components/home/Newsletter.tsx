"use client";

export function Newsletter() {
  return (
    <section className="bg-zinc-900 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-inner">
      <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      
      <div className="relative z-10 text-center md:text-left space-y-2">
        <h3 className="text-2xl font-bold tracking-tight text-white">Join the SmartDuka Club</h3>
        <p className="text-sm text-zinc-400 font-medium max-w-sm leading-relaxed">
          Get exclusive offers, early access to multi-vendor collection drops, and zero-tax checkout windows.
        </p>
      </div>

      <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 relative z-10">
        <input
          type="email"
          placeholder="Enter your email address"
          className="w-full sm:w-64 h-12 px-4 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
        />
        <button className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm px-6 h-12 rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap">
          Join Club
        </button>
      </div>
    </section>
  );
}