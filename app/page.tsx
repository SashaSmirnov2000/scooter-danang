"use client";
import { useState, useEffect } from 'react';
import { supabase } from './supabase'; // Наш мост к базе
import Link from 'next/link';

export default function Home() {
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const [bikes, setBikes] = useState<any[]>([]); // Состояние для байков из базы
  const [loading, setLoading] = useState(true);

  // 1. Загрузка языка и данных из Supabase
  useEffect(() => {
    // Читаем язык
    const savedLang = localStorage.getItem('userLang') as 'ru' | 'en';
    if (savedLang) setLang(savedLang);

    // Загружаем байки
    async function loadBikes() {
      const { data, error } = await supabase
        .from('scooters') // Твоя таблица
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
      title: "АРЕНДА СКУТЕРОВ В ДАНАНГЕ", 
      sub: "Каталог скутеров и мотоциклов", 
      btn: "Узнать наличие",
      day: "в сутки",
      month: "в месяц",
      loading: "Загрузка байков..."
    },
    en: { 
      title: "DANANG SCOOTER RENTAL", 
      sub: "Premium Motorbike & Scooter Rental", 
      btn: "Check Availability",
      day: "per day",
      month: "per month",
      loading: "Loading bikes..."
    }
  };

  return (
    <main className="bg-[#0b0f1a] min-h-screen text-white font-sans">
      <nav className="fixed top-0 w-full z-[100] bg-[#0b0f1a]/70 backdrop-blur-md border-b border-white/5 h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐉</span>
          <span className="font-black text-lg tracking-tighter uppercase italic text-white">Dragon Bike</span>
        </div>
        <button 
          onClick={toggleLang}
          className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase hover:bg-white/10 transition-colors"
        >
          {lang === 'ru' ? 'English' : 'Русский'}
        </button>
      </nav>

      <section className="relative h-[45vh] flex items-center justify-center pt-16">
        <div className="absolute inset-0 mx-4 mt-2 overflow-hidden rounded-[2.5rem] border border-white/5 opacity-40">
          <img src="/bridge.jpg" className="w-full h-full object-cover" alt="Danang" />
        </div>
        <div className="relative z-10 text-center px-6">
          <h1 className="text-4xl md:text-6xl font-black italic uppercase mb-2 leading-tight">{t[lang].title}</h1>
          <p className="text-green-400 text-sm font-bold tracking-[0.3em] uppercase">{t[lang].sub}</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-20 text-white/50">{t[lang].loading}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {bikes.map((s) => (
              <div key={s.id} className="group bg-[#161d2f] rounded-[2rem] p-5 border border-white/5 flex flex-col h-full hover:border-green-500/30 transition-all shadow-xl">
                <Link href={`/bike/${s.id}`} className="cursor-pointer flex-grow">
                  <div className="h-44 overflow-hidden rounded-[1.5rem] mb-4 bg-black/10 flex items-center justify-center">
                    <img src={s.image} className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-500" alt={s.model} />
                  </div>
                  <h3 className="text-xl font-bold mb-4 group-hover:text-green-400 transition-colors">{s.model}</h3>
                </Link>
                <div className="flex flex-col gap-4 pt-4 border-t border-white/5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-lg font-black">{s.price_day}</span>
                      <p className="text-[8px] text-white/30 uppercase font-bold tracking-tighter">{t[lang].day}</p>
                    </div>
                    <div className="border-l border-white/10 pl-3">
                      <span className="text-lg font-black text-green-400">{s.price_month}</span>
                      <p className="text-[8px] text-green-400/30 uppercase font-bold tracking-tighter">{t[lang].month}</p>
                    </div>
                  </div>
                  <a 
                    href={`https://wa.me/${s.vendor_phone}?text=${lang === 'ru' ? 'Здравствуйте! Хочу узнать наличие' : 'Hello! I want to check availability'} ${s.model}`} 
                    target="_blank" 
                    className="w-full bg-green-600 py-3 rounded-xl font-bold text-[11px] uppercase text-center flex items-center justify-center gap-2 hover:bg-green-500 transition-all active:scale-95 shadow-lg shadow-green-900/20"
                  >
                    <span>💬</span> {t[lang].btn}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}