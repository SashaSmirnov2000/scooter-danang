"use client";
import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Link from 'next/link';

// ── helpers ────────────────────────────────────────────────────────────────
function parseVnd(str: string): number | null {
  if (!str) return null;
  const cleaned = String(str).replace(/[^\d]/g, '');
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : n;
}
function toUsd(vnd: number): string {
  const usd = vnd / 26000;
  if (usd < 1) return '<$1';
  return `~$${Math.round(usd)}`;
}
function PriceUsd({ price }: { price: string }) {
  const vnd = parseVnd(price);
  if (!vnd) return null;
  return (
    <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.02em' }}>
      {toUsd(vnd)}
    </span>
  );
}

// ── SVG icons ─────────────────────────────────────────────────────────────
const IconAuto = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
  </svg>
);
const IconSemi = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20V4M5 12l7-8 7 8"/>
  </svg>
);
const IconManual = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>
    <path d="M6 16V6l12 10V6"/>
  </svg>
);
const IconNoLicense = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
);

// ── Skeleton ───────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-[1.8rem] border border-gray-100 overflow-hidden flex flex-col animate-pulse shadow-sm">
      <div className="aspect-[4/5] w-full bg-gray-100" />
      <div className="p-3 flex flex-col gap-2.5">
        <div className="h-2.5 w-20 bg-gray-200 rounded" />
        <div className="h-5 w-3/4 bg-gray-200 rounded" />
        <div className="grid grid-cols-2 gap-1.5 mt-1">
          <div className="h-12 bg-gray-100 rounded-xl" />
          <div className="h-12 bg-gray-100 rounded-xl" />
        </div>
        <div className="h-9 bg-gray-200 rounded-xl mt-1" />
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Home() {
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const [bikes, setBikes] = useState<any[]>([]);
  const [filteredBikes, setFilteredBikes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ref, setRef] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem('userLang') as 'ru' | 'en';
    if (savedLang) setLang(savedLang);

    const savedCategory = sessionStorage.getItem('activeCategory');
    if (savedCategory) setActiveCategory(savedCategory);

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
      if (tg.BackgroundColor) tg.setHeaderColor('#ffffff');
    }

    async function loadBikes() {
      const { data, error } = await supabase
        .from('scooters')
        .select('*')
        .order('sort_order', { ascending: true });
      if (!error) setBikes(data || []);
      setLoading(false);
    }
    loadBikes();
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    sessionStorage.setItem('activeCategory', activeCategory);
    if (activeCategory === 'All') {
      setFilteredBikes(bikes);
    } else if (activeCategory === 'Электро') {
      setFilteredBikes(bikes.filter(bike =>
        bike.transmission === 'Электро' ||
        (bike.transmission === 'Полуавтомат' && Number(bike.engine) === 50) ||
        bike.no_license === true
      ));
    } else {
      setFilteredBikes(bikes.filter(bike => bike.transmission === activeCategory));
    }
  }, [activeCategory, bikes]);

  const toggleLang = () => {
    const newLang = lang === 'ru' ? 'en' : 'ru';
    setLang(newLang);
    localStorage.setItem('userLang', newLang);
  };

  const categories = [
    { id: 'Автомат',     ru: 'Автомат',  en: 'Auto',       Icon: IconAuto,      sub: null },
    { id: 'Полуавтомат', ru: 'Полуавто', en: 'Semi',       Icon: IconSemi,      sub: null },
    { id: 'Механика',    ru: 'Механика', en: 'Manual',     Icon: IconManual,    sub: null },
    { id: 'Электро',     ru: 'Без прав', en: 'No License', Icon: IconNoLicense,
      sub: { ru: 'Электро + до 50сс', en: 'Electric + under 50cc' } },
  ];

  const t = {
    ru: {
      title: "Аренда скутеров и мотоциклов", location: "Дананг, Вьетнам",
      btn: "Подробнее", day: "1 сутки", month: "от 2 суток",
      rate: "1$ ≈ 26k",
      cc: " куб.",
      noBikes: "В этой категории пока нет байков",
      badgeNoLicense: "Без прав",
      noLicenseLabel: "Не нужны права",
    },
    en: {
      title: "Rent scooters and motorcycles", location: "Da Nang",
      btn: "Details", day: "1 day", month: "2+ days",
      rate: "1$ ≈ 26k",
      cc: " cc",
      noBikes: "No bikes in this category yet",
      badgeNoLicense: "No license",
      noLicenseLabel: "License free",
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,900;1,700;1,900&family=Barlow:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { background: #f4f5f7; }
        .font-display { font-family: 'Barlow Condensed', sans-serif; }
        .font-body    { font-family: 'Barlow', sans-serif; }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .card-enter { animation: cardIn 0.4s cubic-bezier(0.22,1,0.36,1) both; }

        .cat-active { box-shadow: 0 4px 16px rgba(22,163,74,0.25); }

        .card-img-overlay {
          background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.45) 80%, rgba(0,0,0,0.72) 100%);
        }

        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .price-shimmer {
          background: linear-gradient(90deg, #16a34a 0%, #22c55e 45%, #16a34a 80%);
          background-size: 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }

        .btn-press:active { transform: scale(0.95); }

        .bike-grid > *:nth-child(1) { animation-delay: 0.03s; }
        .bike-grid > *:nth-child(2) { animation-delay: 0.06s; }
        .bike-grid > *:nth-child(3) { animation-delay: 0.09s; }
        .bike-grid > *:nth-child(4) { animation-delay: 0.12s; }
        .bike-grid > *:nth-child(5) { animation-delay: 0.15s; }
        .bike-grid > *:nth-child(6) { animation-delay: 0.18s; }
        .bike-grid > *:nth-child(7) { animation-delay: 0.21s; }
        .bike-grid > *:nth-child(8) { animation-delay: 0.24s; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.5s ease both; }

        .badge-nolicense {
          background: #dcfce7;
          border: 1px solid #86efac;
          color: #15803d;
        }

        .nav-shadow {
          box-shadow: 0 1px 0 rgba(0,0,0,0.06), 0 2px 12px rgba(0,0,0,0.05);
        }

        .bike-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .bike-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        }
      `}</style>

      <main className="bg-[#f4f5f7] min-h-screen text-gray-900 font-body flex flex-col selection:bg-green-200">

        {/* NAV */}
        <nav className="nav-shadow fixed top-0 w-full z-[100] bg-white/90 backdrop-blur-xl h-16 flex items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center text-lg shadow-md shadow-green-200">
              🐉
            </div>
            <div className="flex flex-col leading-none gap-0.5">
              <span className="font-display font-black uppercase text-gray-900"
                style={{ fontSize: '15px', letterSpacing: '0.04em' }}>Dragon Bike</span>
              <span className="font-body font-bold uppercase text-green-600"
                style={{ fontSize: '9px', letterSpacing: '0.22em' }}>Danang</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl font-display font-black uppercase text-green-700 whitespace-nowrap"
              style={{ fontSize: '11px', letterSpacing: '0.05em' }}>
              {t[lang].rate}
            </div>
            <button
              onClick={toggleLang}
              className="btn-press bg-gray-100 border border-gray-200 w-10 h-8 rounded-xl font-body font-black uppercase transition-all flex items-center justify-center hover:bg-gray-200 text-gray-700"
              style={{ fontSize: '11px', letterSpacing: '0.04em' }}
            >
              {lang === 'ru' ? 'EN' : 'RU'}
            </button>
          </div>
        </nav>

        {/* HERO */}
        <section className="relative pt-16 flex flex-col items-center justify-center text-center overflow-hidden">
          <div className="relative w-full h-[240px] overflow-hidden">
            <img
              src="https://static.vinwonders.com/2022/12/Dragon-Bridge-thumb.jpg"
              className="w-full h-full object-cover"
              alt="Dragon Bridge"
              style={{ filter: 'saturate(1.1) brightness(0.82)', objectPosition: '70% center' }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(244,245,247,0.7) 80%, #f4f5f7 100%)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(244,245,247,0.3) 0%, transparent 40%)' }} />

            <div className="absolute inset-0 flex flex-col items-center justify-center px-4 fade-up">
              <h1
                className="font-display font-black uppercase italic cursor-pointer leading-none text-white drop-shadow-lg"
                style={{ fontSize: 'clamp(22px, 6vw, 32px)', letterSpacing: '0.04em', textShadow: '0 2px 12px rgba(0,0,0,0.55)' }}
                onClick={() => setActiveCategory('All')}
              >
                {t[lang].title}
              </h1>
              <div className="flex items-center gap-2 mt-2.5">
                <span className="w-6 h-px bg-white/60" />
                <p className="font-body font-bold uppercase text-white/80"
                  style={{ fontSize: '10px', letterSpacing: '0.25em', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                  {t[lang].location}
                </p>
                <span className="w-6 h-px bg-white/60" />
              </div>
            </div>
          </div>

          {/* Category filter */}
          <div className="w-full max-w-2xl mx-auto px-3 py-4 fade-up" style={{ animationDelay: '0.1s' }}>
            {/* Top row */}
            <div className="flex gap-1.5 mb-1.5">
              {categories.filter(c => c.id !== 'Электро').map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(isActive ? 'All' : cat.id)}
                    className={`btn-press flex-1 py-2.5 rounded-xl font-display font-black uppercase transition-all duration-200 border flex items-center justify-center gap-1.5
                      ${isActive
                        ? 'cat-active bg-green-600 border-green-600 text-white scale-[1.02]'
                        : 'bg-white border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    style={{ fontSize: '11px', letterSpacing: '0.04em' }}
                  >
                    <cat.Icon />
                    {lang === 'ru' ? cat.ru : cat.en}
                  </button>
                );
              })}
            </div>

            {/* No license row */}
            {(() => {
              const cat = categories.find(c => c.id === 'Электро')!;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  onClick={() => setActiveCategory(isActive ? 'All' : cat.id)}
                  className={`btn-press w-full rounded-xl transition-all duration-200 flex items-center justify-between px-4 py-3 border
                    ${isActive
                      ? 'cat-active bg-green-600 border-green-600 text-white'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-white/20' : 'bg-green-100 border border-green-200 text-green-700'}`}>
                      <cat.Icon />
                    </div>
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="font-display font-black uppercase leading-none"
                        style={{ fontSize: '14px', letterSpacing: '0.04em' }}>
                        {lang === 'ru' ? 'Без прав' : 'No License'}
                      </span>
                      <span className="font-body font-semibold uppercase leading-none"
                        style={{ fontSize: '10px', letterSpacing: '0.06em', color: isActive ? 'rgba(255,255,255,0.75)' : '#16a34a' }}>
                        {lang === 'ru' ? cat.sub!.ru : cat.sub!.en}
                      </span>
                    </div>
                  </div>
                  <div className={`font-display font-black uppercase px-2.5 py-1.5 rounded-lg ${isActive ? 'bg-white/20 text-white' : 'bg-green-100 border border-green-200 text-green-700'}`}
                    style={{ fontSize: '10px', letterSpacing: '0.05em' }}>
                    {t[lang].noLicenseLabel}
                  </div>
                </button>
              );
            })()}
          </div>
        </section>

        {/* GRID */}
        <section className="max-w-7xl mx-auto px-3 pb-20 relative z-20 w-full">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredBikes.length === 0 ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center text-gray-400">
                <IconManual />
              </div>
              <p className="font-body font-bold uppercase text-gray-400"
                style={{ fontSize: '11px', letterSpacing: '0.12em' }}>
                {t[lang].noBikes}
              </p>
            </div>
          ) : (
            <div className="bike-grid grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {filteredBikes.map((s, idx) => (
                <div
                  key={s.id}
                  className="bike-card card-enter group bg-white rounded-[1.8rem] border border-gray-100 overflow-hidden flex flex-col"
                  style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)', animationDelay: `${idx * 0.04}s` }}
                >
                  {/* Photo */}
                  <Link href={`/bike/${s.id}`} className="relative aspect-[4/5] w-full overflow-hidden block">
                    <img
                      src={s.image}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      alt={s.model}
                    />
                    <div className="card-img-overlay absolute inset-0" />

                    {s.no_license && (
                      <div className="absolute top-2.5 left-2.5">
                        <div className="badge-nolicense px-2 py-1 rounded-md font-display font-black uppercase"
                          style={{ fontSize: '9px', letterSpacing: '0.05em' }}>
                          {t[lang].badgeNoLicense}
                        </div>
                      </div>
                    )}
                  </Link>

                  {/* Info */}
                  <div className="p-3 flex flex-col">

                    {/* Transmission · cc */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="font-body font-bold uppercase text-green-600"
                        style={{ fontSize: '10px', letterSpacing: '0.08em' }}>
                        {s.transmission}
                      </span>
                      <span style={{ display:'inline-block', width:3, height:3, background:'#d1d5db', borderRadius:'50%', verticalAlign:'middle', flexShrink:0 }} />
                      <span className="font-body font-bold uppercase text-green-600"
                        style={{ fontSize: '10px', letterSpacing: '0.08em' }}>
                        {s.engine}{t[lang].cc}
                      </span>
                    </div>

                    {/* Model name */}
                    <h3 className="font-display font-black uppercase italic text-gray-900 mb-3 leading-tight truncate"
                      style={{ fontSize: '16px', letterSpacing: '0.04em' }}>
                      {s.model}
                    </h3>

                    {/* Prices */}
                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                      <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                        <p className="font-body font-bold uppercase text-gray-400 mb-1"
                          style={{ fontSize: '9px', letterSpacing: '0.07em' }}>
                          {t[lang].day}
                        </p>
                        <div className="flex items-baseline gap-1 flex-wrap">
                          <span className="font-display font-black text-gray-900"
                            style={{ fontSize: '13px', letterSpacing: '0.02em', lineHeight: 1 }}>
                            {s.price_day}
                          </span>
                          <PriceUsd price={s.price_day} />
                        </div>
                      </div>
                      <div className="bg-green-50 rounded-xl p-2.5 border border-green-100">
                        <p className="font-body font-bold uppercase text-green-500 mb-1"
                          style={{ fontSize: '9px', letterSpacing: '0.07em' }}>
                          {t[lang].month}
                        </p>
                        <div className="flex items-baseline gap-1 flex-wrap">
                          <span className="price-shimmer font-display font-black"
                            style={{ fontSize: '13px', letterSpacing: '0.02em', lineHeight: 1 }}>
                            {s.price_2days || s.price_day}
                          </span>
                          <PriceUsd price={s.price_2days || s.price_day} />
                        </div>
                      </div>
                    </div>

                    {/* CTA */}
                    <Link
                      href={`/bike/${s.id}`}
                      className="btn-press w-full bg-gray-900 text-white rounded-xl font-display font-black uppercase transition-all flex items-center justify-center gap-1.5 hover:bg-green-600 shadow-sm"
                      style={{ padding: '10px 12px', fontSize: '12px', letterSpacing: '0.07em' }}
                    >
                      {t[lang].btn}
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.6 }}>
                        <path d="M1 9L9 1M9 1H2M9 1V8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* FOOTER */}
        <footer className="w-full py-8 text-center mt-auto border-t border-gray-200">
          <div className="flex items-center justify-center gap-2">
            <span className="w-4 h-px bg-gray-300" />
            <p className="font-display font-bold uppercase text-gray-400"
              style={{ fontSize: '10px', letterSpacing: '0.25em' }}>
              Dragon Bike &bull; 2026
            </p>
            <span className="w-4 h-px bg-gray-300" />
          </div>
        </footer>
      </main>
    </>
  );
}