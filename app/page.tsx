"use client";
import { useState, useEffect } from 'react';
import { supabase } from './supabase'; 
import Link from 'next/link';

export default function Home() {
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const [bikes, setBikes] = useState<any[]>([]); 
  const [filteredBikes, setFilteredBikes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ref, setRef] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  useEffect(() => {
    const savedLang = localStorage.getItem('userLang') as 'ru' | 'en';
    if (savedLang) setLang(savedLang);

    const initRefLogic = () => {
      const tg = (window as any).Telegram?.WebApp;
      const urlParams = new URLSearchParams(window.location.search);
      const refFromUrl = urlParams.get('tgWebAppStartParam');
      const refFromTgUnsafe = tg?.initDataUnsafe?.start_param;
      let refFromRaw = null;
      if (tg?.initData) {
        try {
          const rawParams = new URLSearchParams(tg.initData);
          const startParam = rawParams.get('start_param');
          if (startParam) refFromRaw = startParam;
        } catch (e) { console.error(e); }
      }
      const savedRef = localStorage.getItem('referrer');
      const activeRef = refFromUrl || refFromTgUnsafe || refFromRaw;
      if (activeRef) {
        setRef(activeRef);
        localStorage.setItem('referrer', activeRef);
        return true; 
      } else if (savedRef) {
        setRef(savedRef);
        return true;
      }
      return false;
    };

    initRefLogic();
    const interval = setInterval(() => { if (initRefLogic()) clearInterval(interval); }, 500);
    setTimeout(() => clearInterval(interval), 3000);

    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.BackgroundColor) tg.setHeaderColor('#05070a');
    }

    async function loadBikes() {
      const { data, error } = await supabase
        .from('scooters') 
        .select('*')
        // ИЗМЕНЕНО: сортировка по sort_order вместо даты создания
        .order('sort_order', { ascending: true });
      if (!error) {
        setBikes(data || []);
        setFilteredBikes(data || []);
      }
      setLoading(false);
    }
    loadBikes();
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeCategory === 'All') {
      setFilteredBikes(bikes);
    } else if (activeCategory === 'Электро') {
      const filtered = bikes.filter(bike => 
        bike.transmission === 'Электро' || 
        (bike.transmission === 'Полуавтомат' && Number(bike.engine) === 50) ||
        bike.no_license === true
      );
      setFilteredBikes(filtered);
    } else {
      const filtered = bikes.filter(bike => bike.transmission === activeCategory);
      setFilteredBikes(filtered);
    }
  }, [activeCategory, bikes]);

  const toggleLang = () => {
    const newLang = lang === 'ru' ? 'en' : 'ru';
    setLang(newLang);
    localStorage.setItem('userLang', newLang);
  };

  const categories = [
    { id: 'Автомат', ru: 'Автомат', en: 'Auto' },
    { id: 'Полуавтомат', ru: 'Полуавто', en: 'Semi' },
    { id: 'Механика', ru: 'Механика', en: 'Manual' },
    { id: 'Электро', ru: 'Электро / Без прав', en: 'Elec / No license' },
  ];

  const t = {
    ru: { 
      title: "Аренда скутеров", location: "Дананг, Вьетнам",
      btn: "Подробнее", day: "1 сутки", month: "от 2 суток",
      rate: "Курс: 1$ ≈ 26k",
      close: "Закрыть", total: "Дней:", cc: "cc",
      noBikes: "В этой категории пока нет байков",
      badgeNoLicense: "Без прав"
    },
    en: { 
      title: "Scooter Rental", location: "Da Nang",
      btn: "Details", day: "1 day", month: "2+ days",
      rate: "Rate: 1$ ≈ 26k",
      close: "Close", total: "Days:", cc: "cc",
      noBikes: "No bikes in this category yet",
      badgeNoLicense: "No license"
    }
  };

  return (
    <main className="bg-[#05070a] min-h-screen text-white font-sans flex flex-col selection:bg-green-500/30">
      
      <nav className="fixed top-0 w-full z-[100] bg-[#05070a]/90 backdrop-blur-md border-b border-white/5 h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-lg shadow-[0_0_15px_rgba(34,197,94,0.3)]">🐉</div>
          <div className="flex flex-col">
            <span className="font-black text-[12px] tracking-tighter uppercase leading-none text-white">Dragon Bike</span>
            <span className="text-[7px] text-green-500 font-bold tracking-[0.2em] uppercase">Danang</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-[9px] font-black text-green-500 tracking-tighter uppercase whitespace-nowrap">
            {t[lang].rate}
          </div>
          <button onClick={toggleLang} className="bg-white/5 border border-white/10 w-10 h-8 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all flex items-center justify-center">
            {lang === 'ru' ? 'EN' : 'RU'}
          </button>
        </div>
      </nav>

      <section className="relative pt-24 pb-4 flex flex-col items-center justify-center text-center px-4">
        <div className="absolute top-0 inset-0 z-0 h-[30vh]">
          <img src="https://static.vinwonders.com/2022/12/Dragon-Bridge-thumb.jpg" className="w-full h-full object-cover opacity-10" alt="Bridge" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05070a] via-transparent to-transparent" />
        </div>
        
        <div className="relative z-10 mb-6">
          <h1 className="text-2xl font-black uppercase italic tracking-tight cursor-pointer active:opacity-70" onClick={() => setActiveCategory('All')}>{t[lang].title}</h1>
          <p className="text-green-500 text-[10px] font-bold tracking-widest uppercase mt-1">{t[lang].location}</p>
        </div>

        <div className="relative z-10 w-full max-w-2xl mx-auto px-1">
          <div className="flex flex-wrap justify-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? 'All' : cat.id)}
                className={`px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all border shrink-0 ${
                  activeCategory === cat.id 
                  ? 'bg-green-600 border-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.2)] scale-[1.02]' 
                  : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                } ${cat.id === 'Электро' ? 'flex-[1.5] min-w-[150px]' : 'flex-1 min-w-[80px]'}`}
              >
                {lang === 'ru' ? cat.ru : cat.en}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-3 pb-20 relative z-20 w-full">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : filteredBikes.length === 0 ? (
          <div className="text-center py-20">
             <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">{t[lang].noBikes}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {filteredBikes.map((s) => (
              <div key={s.id} className="group bg-[#0f1117] rounded-[1.8rem] border border-white/5 overflow-hidden flex flex-col transition-all duration-300 hover:border-green-500/30 shadow-2xl">
                <Link href={`/bike/${s.id}`} className="relative aspect-[4/5] w-full overflow-hidden block">
                  <img src={s.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={s.model} />
                  
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {s.no_license && (
                      <div className="bg-green-500 text-black px-2 py-1 rounded-md text-[7px] font-black uppercase tracking-tighter shadow-lg">
                        {t[lang].badgeNoLicense}
                      </div>
                    )}
                  </div>

                  <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded text-[7px] font-bold border border-white/10 text-white/60">
                    {s.year}
                  </div>
                </Link>

                <div className="p-3 flex flex-col">
                  <div className="flex items-center gap-1.5 mb-1.5 text-[8px] font-black uppercase tracking-widest text-green-500/80">
                    <span>{s.transmission}</span>
                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                    <span>{s.engine}{t[lang].cc}</span>
                  </div>
                  <h3 className="text-[13px] font-black uppercase italic tracking-tighter mb-3 leading-none truncate">
                    {s.model}
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5 mb-4">
                    <div className="bg-white/5 rounded-lg p-1.5 border border-white/5">
                      <p className="text-[6px] text-gray-500 uppercase font-black mb-0.5">{t[lang].day}</p>
                      <p className="text-[9px] font-black tracking-tighter">{s.price_day}</p>
                    </div>
                    <div className="bg-green-500/5 rounded-lg p-1.5 border border-green-500/10">
                      <p className="text-[6px] text-green-500/50 uppercase font-black mb-0.5">{t[lang].month}</p>
                      <p className="text-[9px] font-black text-green-400 tracking-tighter">{s.price_2days || s.price_day}</p>
                    </div>
                  </div>
                  <Link href={`/bike/${s.id}`} className="w-full bg-white text-black py-2.5 rounded-lg font-black text-[9px] uppercase transition-all active:scale-95 flex items-center justify-center hover:bg-green-500 hover:text-white shadow-lg">
                    {t[lang].btn}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="w-full py-8 text-center border-t border-white/5 mt-auto">
        <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.3em]">Dragon Bike &bull; 2026</p>
      </footer>
    </main>
  );
}