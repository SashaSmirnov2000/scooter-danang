"use client";
import { useState } from 'react';
import { scooters } from './data';

export default function Home() {
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  
  const t = {
    ru: { 
      title: "АРЕНДА СКУТЕРОВ В ДАНАНГЕ", 
      sub: "Каталог скутеров и мотоциклов", 
      btn: "Узнать наличие" 
    },
    en: { 
      title: "DANANG SCOOTER RENTAL", 
      sub: "Premium Motorbike & Scooter Rental", 
      btn: "Check Availability" 
    }
  };

  return (
    <main className="bg-[#0b0f1a] min-h-screen text-white font-sans selection:bg-green-500">
      
      {/* 1. НАВИГАЦИЯ */}
      <nav className="fixed top-0 w-full z-[100] bg-[#0b0f1a]/70 backdrop-blur-md border-b border-white/5 h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐉</span>
          <span className="font-black text-lg tracking-tighter uppercase italic text-white">Dragon Bike</span>
        </div>
        
        <button 
          onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')} 
          className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all"
        >
          {lang === 'ru' ? 'English' : 'Русский'}
        </button>
      </nav>

      {/* 2. КОМПАКТНЫЙ HERO */}
      <section className="relative h-[45vh] min-h-[350px] w-full flex items-center justify-center pt-16">
        <div className="absolute inset-0 z-0 mx-4 mt-2 overflow-hidden rounded-[2.5rem] border border-white/5">
          <img 
            src="/bridge.jpg" 
            className="w-full h-full object-cover opacity-40 scale-105"
            alt="Danang Bridge"
            onError={(e) => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1559592442-7e18259f63cc?q=80&w=2000";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f1a] via-transparent to-transparent"></div>
        </div>

        <div className="relative z-10 text-center px-6">
          <h1 className="text-4xl md:text-6xl font-black italic uppercase leading-tight mb-2 tracking-tighter">
            {t[lang].title}
          </h1>
          <p className="text-green-400 text-sm md:text-lg font-bold tracking-[0.3em] uppercase opacity-90">
            {t[lang].sub}
          </p>
        </div>
      </section>

      {/* 3. КАТАЛОГ */}
      <section className="max-w-7xl mx-auto px-6 py-6 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {scooters.map((s) => (
            <div key={s.id} className="group bg-[#161d2f] rounded-[2rem] p-5 border border-white/5 hover:border-green-500/40 transition-all duration-500 shadow-xl">
              
              <div className="h-44 overflow-hidden rounded-[1.5rem] mb-4 bg-black/10 flex items-center justify-center">
                <img 
                  src={s.image} 
                  className="w-full h-full object-contain p-2 transition-transform duration-700 group-hover:scale-110" 
                  alt={s.model} 
                />
              </div>
              
              <h3 className="text-xl font-bold mb-4 tracking-tight group-hover:text-green-400 transition-colors">{s.model}</h3>
              
              <div className="flex flex-col gap-4 pt-4 border-t border-white/5">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-2xl font-black text-white">{s.price}</span>
                    <p className="text-[9px] text-white/30 uppercase font-bold tracking-tighter">
                      {lang === 'ru' ? 'цена в сутки' : 'per day'}
                    </p>
                  </div>
                </div>
                
                <a 
                  href={`https://wa.me/${s.phone}`} 
                  target="_blank"
                  className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold text-[11px] uppercase shadow-lg shadow-green-900/20 text-center transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span className="text-sm">💬</span> {t[lang].btn}
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-12 text-center text-[10px] text-white/20 tracking-[0.4em] font-bold uppercase">
        Dragon Bike Danang 2026 • Quality First
      </footer>

    </main>
  );
}