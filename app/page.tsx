"use client";
import { useState, useEffect } from 'react';
import { supabase } from './supabase'; 
import Link from 'next/link';

export default function Home() {
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const [bikes, setBikes] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedLang = localStorage.getItem('userLang') as 'ru' | 'en';
    if (savedLang) setLang(savedLang);

    async function loadBikes() {
      const { data, error } = await supabase
        .from('scooters') 
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Ошибка базы:', error);
      } else {
        setBikes(data || []);
      }
      setLoading(false);
    }
    loadBikes();
  }, []);

  const toggleLang = () => {
    const newLang = lang === 'ru' ? 'en' : 'ru';
    setLang(newLang);
    localStorage.setItem('userLang', newLang);
  };
  
  const t = {
    ru: { 
      title: "Аренда скутеров и мотоциклов", 
      location: "Дананг, Вьетнам",
      sub: "PREMIUM MOTO RENTAL", 
      btn: "Забронировать",
      day: "в сутки",
      month: "в месяц",
      loading: "Загрузка байков..."
    },
    en: { 
      title: "Scooter & Moto Rental", 
      location: "Da Nang, Vietnam",
      sub: "PREMIUM MOTO RENTAL", 
      btn: "Book Now",
      day: "per day",
      month: "per month",
      loading: "Loading bikes..."
    }
  };

  return (
    <main className="bg-[#05070a] min-h-screen text-white font-sans flex flex-col overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-[100] bg-[#05070a]/80 backdrop-blur-xl border-b border-white/5 h-20 flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.4)] text-xl">🐉</div>
          <div className="flex flex-col">
            <span className="font-black text-xl tracking-tight uppercase leading-none">Dragon</span>
            <span className="text-[10px] text-green-500 font-bold tracking-[0.2em] uppercase">Bike</span>
          </div>
        </div>
        <button onClick={toggleLang} className="bg-white/5 border border-white/10 px-5 py-2 rounded-2xl text-[11px] font-bold uppercase hover:bg-white/10 transition-all">
          {lang === 'ru' ? 'English' : 'Русский'}
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden text-center px-6 pt-16 flex-shrink-0">
        <div className="absolute inset-0 z-0">
          <img src="https://static.vinwonders.com/2022/12/Dragon-Bridge-thumb.jpg" className="w-full h-full object-cover opacity-40" alt="Bridge" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05070a] via-[#05070a]/40 to-transparent" />
        </div>
        <div className="relative z-10">
          <div className="inline-block mb-4 px-4 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
            <h2 className="text-green-500 text-[10px] font-black tracking-[0.4em] uppercase">{t[lang].sub}</h2>
          </div>
          <h1 className="text-4xl md:text-7xl font-bold mb-4 tracking-tight uppercase italic">{t[lang].title}</h1>
          <p className="text-gray-400 text-lg md:text-xl font-light tracking-wide">{t[lang].location}</p>
        </div>
      </section>

      {/* Grid Section */}
      <section className="max-w-7xl mx-auto px-6 pb-24 -mt-10 relative z-20 flex-grow w-full">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {bikes.map((s) => (
              <div key={s.id} className="group bg-[#11141b] rounded-[2.5rem] border border-white/5 overflow-hidden transition-all hover:border-green-500/40 hover:shadow-2xl">
                <Link href={`/bike/${s.id}`} className="block relative h-64 overflow-hidden bg-white/5">
                  <img src={s.image} className="w-full h-full object-contain p-6 transition-transform duration-700 group-hover:scale-110" alt={s.model} />
                  <div className="absolute top-6 right-6 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-bold">{s.year}</div>
                </Link>
                <div className="p-8">
                  <h3 className="text-2xl font-bold mb-1 uppercase tracking-tight">{s.model}</h3>
                  <p className="text-gray-500 text-xs font-medium tracking-widest uppercase mb-6">{s.engine}cc • Automatic</p>
                  <div className="flex items-center justify-between bg-black/40 rounded-[1.8rem] p-5 border border-white/5 mb-6">
                    <div>
                      <p className="text-[9px] text-gray-500 uppercase font-black mb-1">{t[lang].day}</p>
                      <span className="text-xl font-bold text-white">{s.price_day}</span>
                    </div>
                    <div className="w-[1px] h-8 bg-white/10" />
                    <div className="text-right">
                      <p className="text-[9px] text-green-500 uppercase font-black mb-1">{t[lang].month}</p>
                      <span className="text-xl font-bold text-green-400">{s.price_month}</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Link href={`/bike/${s.id}`} className="flex-1 text-center bg-white/5 border border-white/10 py-4 rounded-2xl font-bold text-[10px] uppercase transition-all hover:bg-white/10">Details</Link>
                    <a href={`https://wa.me/${s.vendor_phone}?text=Hello! I want to book ${s.model}`} target="_blank" className="flex-[1.5] bg-green-600 hover:bg-green-500 py-4 rounded-2xl font-bold text-[10px] uppercase text-center transition-all shadow-lg shadow-green-900/20">{t[lang].btn}</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Фикс белого поля внизу */}
      <footer className="w-full py-10 bg-[#05070a] text-center border-t border-white/5">
        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">Dragon Bike Danang © 2026</p>
      </footer>
    </main>
  );
}