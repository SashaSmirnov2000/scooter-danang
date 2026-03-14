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
    <span className="text-[7px] text-white/25 font-bold leading-none">
      {toUsd(vnd)}
    </span>
  );
}

// ── SVG icons ─────────────────────────────────────────────────────────────
const IconAuto = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
  </svg>
);
const IconSemi = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20V4M5 12l7-8 7 8"/>
  </svg>
);
const IconManual = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>
    <path d="M6 16V6l12 10V6"/>
  </svg>
);
const IconNoLicense = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
);

// ── Skeleton ───────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-[#0f1117] rounded-[1.8rem] border border-white/5 overflow-hidden flex flex-col animate-pulse">
      <div className="aspect-[4/5] w-full bg-white/5" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-2 w-16 bg-white/10 rounded" />
        <div className="h-4 w-3/4 bg-white/10 rounded" />
        <div className="grid grid-cols-2 gap-1.5 mt-1">
          <div className="h-10 bg-white/5 rounded-lg" />
          <div className="h-10 bg-white/5 rounded-lg" />
        </div>
        <div className="h-8 bg-white/10 rounded-lg mt-1" />
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
      if (tg.BackgroundColor) tg.setHeaderColor('#05070a');
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
      rate: "Курс: 1$ ≈ 26k",
      close: "Закрыть", total: "Дней:", cc: "cc",
      noBikes: "В этой категории пока нет байков",
      badgeNoLicense: "Без прав",
      noLicenseLabel: "Не нужны права",
    },
    en: {
      title: "Rent scooters and motorcycles", location: "Da Nang",
      btn: "Details", day: "1 day", month: "2+ days",
      rate: "Rate: 1$ ≈ 26k",
      close: "Close", total: "Days:", cc: "cc",
      noBikes: "No bikes in this category yet",
      badgeNoLicense: "No license",
      noLicenseLabel: "License free",
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,900;1,700;1,900&family=Barlow:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        body { background: #05070a; }
        .font-display { font-family: 'Barlow Condensed', sans-serif; }
        .font-body    { font-family: 'Barlow', sans-serif; }

        .grain::after {
          content: '';
          position: fixed; inset: 0; z-index: 200;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
          opacity: 0.025;
        }
        .hero-glow {
          position: absolute; width: 600px; height: 300px;
          background: radial-gradient(ellipse at center, rgba(34,197,94,0.10) 0%, transparent 70%);
          top: 50%; left: 50%; transform: translate(-50%, -50%);
          pointer-events: none;
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .card-enter { animation: cardIn 0.45s cubic-bezier(0.22,1,0.36,1) both; }
        .nav-border {
          position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(34,197,94,0.25), transparent);
        }
        .cat-active {
          box-shadow: 0 0 20px rgba(34,197,94,0.25), inset 0 1px 0 rgba(255,255,255,0.1);
        }
        .card-img-overlay {
          background: linear-gradient(180deg, transparent 50%, rgba(5,7,10,0.65) 80%, rgba(5,7,10,0.95) 100%);
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .price-shimmer {
          background: linear-gradient(90deg, #22c55e 0%, #4ade80 40%, #22c55e 80%);
          background-size: 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
        .btn-press:active { transform: scale(0.94); }
        .bike-grid > *:nth-child(1) { animation-delay: 0.04s; }
        .bike-grid > *:nth-child(2) { animation-delay: 0.08s; }
        .bike-grid > *:nth-child(3) { animation-delay: 0.12s; }
        .bike-grid > *:nth-child(4) { animation-delay: 0.16s; }
        .bike-grid > *:nth-child(5) { animation-delay: 0.20s; }
        .bike-grid > *:nth-child(6) { animation-delay: 0.24s; }
        .bike-grid > *:nth-child(7) { animation-delay: 0.28s; }
        .bike-grid > *:nth-child(8) { animation-delay: 0.32s; }
        .dot-sep {
          display: inline-block; width: 3px; height: 3px;
          background: rgba(255,255,255,0.2); border-radius: 50%; vertical-align: middle;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.6s ease both; }
        .badge-nolicense {
          background: rgba(34,197,94,0.15);
          border: 1px solid rgba(34,197,94,0.35);
          color: #4ade80;
          backdrop-filter: blur(6px);
        }
      `}</style>

      <main className="grain bg-[#05070a] min-h-screen text-white font-body flex flex-col selection:bg-green-500/30">

        {/* ── NAV ─────────────────────────────────────────────────────── */}
        <nav className="fixed top-0 w-full z-[100] bg-[#05070a]/80 backdrop-blur-xl h-16 flex items-center justify-between px-4">
          <div className="nav-border" />
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 flex items-center justify-center">
              <div className="absolute inset-0 bg-green-500/20 rounded-xl blur-md" />
              <div className="relative w-9 h-9 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center text-lg shadow-lg">🐉</div>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display font-black text-[13px] tracking-tighter uppercase text-white">Dragon Bike</span>
              <span className="text-[7px] text-green-400 font-bold tracking-[0.25em] uppercase">Danang</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-xl text-[9px] font-black text-green-400 tracking-tighter uppercase whitespace-nowrap font-display">
              {t[lang].rate}
            </div>
            <button onClick={toggleLang} className="btn-press bg-white/5 border border-white/10 w-10 h-8 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center hover:bg-white/10 hover:border-white/20">
              {lang === 'ru' ? 'EN' : 'RU'}
            </button>
          </div>
        </nav>

        {/* ── HERO ────────────────────────────────────────────────────── */}
        <section className="relative pt-24 pb-5 flex flex-col items-center justify-center text-center px-4 overflow-hidden">

          {/* Dragon bridge — shifted right to show dragon head (left side of bridge) */}
          <div className="absolute top-0 inset-0 z-0 h-[38vh]">
            <img
              src="https://static.vinwonders.com/2022/12/Dragon-Bridge-thumb.jpg"
              className="w-full h-full object-cover opacity-45"
              alt="Dragon Bridge"
              style={{ filter: 'saturate(1.1) contrast(1.05)', objectPosition: '70% center' }}
            />
            {/* left fade — keeps left side (title area) readable */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, #05070a 0%, rgba(5,7,10,0.6) 30%, transparent 60%, #05070a 100%)' }} />
            {/* bottom fade */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#05070a] via-[#05070a]/20 to-transparent" />
            {/* top edge */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#05070a]/50 to-transparent" style={{ height: '30%' }} />
            <div className="hero-glow" />
          </div>

          {/* Title */}
          <div className="relative z-10 mb-5 fade-up">
            <h1
              className="font-display text-[26px] font-black uppercase italic tracking-tight cursor-pointer active:opacity-70 leading-none"
              onClick={() => setActiveCategory('All')}
            >
              {t[lang].title}
            </h1>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span className="w-8 h-px bg-green-500/40" />
              <p className="text-green-400 text-[9px] font-bold tracking-[0.3em] uppercase">{t[lang].location}</p>
              <span className="w-8 h-px bg-green-500/40" />
            </div>
          </div>

          {/* Category filter */}
          <div className="relative z-10 w-full max-w-2xl mx-auto px-1 fade-up" style={{ animationDelay: '0.1s' }}>
            {/* Top row: 3 regular categories */}
            <div className="flex gap-1.5 mb-1.5">
              {categories.filter(c => c.id !== 'Электро').map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(isActive ? 'All' : cat.id)}
                    className={`btn-press flex-1 px-2 py-2.5 rounded-xl font-display font-black text-[9px] uppercase tracking-tighter transition-all duration-200 border flex items-center justify-center gap-1.5
                      ${isActive
                        ? 'cat-active bg-green-500/90 border-green-400/60 text-white scale-[1.02]'
                        : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/10'
                      }`}
                  >
                    <cat.Icon />
                    {lang === 'ru' ? cat.ru : cat.en}
                  </button>
                );
              })}
            </div>

            {/* Bottom row: No license — full width */}
            {(() => {
              const cat = categories.find(c => c.id === 'Электро')!;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  onClick={() => setActiveCategory(isActive ? 'All' : cat.id)}
                  className={`btn-press w-full rounded-xl transition-all duration-200 font-display flex items-center justify-between px-4 py-3 border
                    ${isActive
                      ? 'cat-active bg-green-500/90 border-green-400/60 text-white'
                      : 'border-white/10 text-gray-300 hover:text-white hover:border-white/20'
                    }`}
                  style={!isActive ? { background: 'linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(255,255,255,0.03) 100%)' } : {}}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${isActive ? 'bg-black/20' : 'bg-green-500/10 border border-green-500/20'}`}>
                      <cat.Icon />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[12px] font-black uppercase tracking-tight leading-none">
                        {lang === 'ru' ? 'Без прав' : 'No License'}
                      </span>
                      <span className={`text-[8px] font-bold uppercase tracking-wider leading-none mt-0.5 ${isActive ? 'text-green-100/70' : 'text-green-500/60'}`}>
                        {lang === 'ru' ? cat.sub!.ru : cat.sub!.en}
                      </span>
                    </div>
                  </div>
                  <div className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg ${isActive ? 'bg-black/20 text-green-100' : 'bg-green-500/10 border border-green-500/20 text-green-400'}`}>
                    {t[lang].noLicenseLabel}
                  </div>
                </button>
              );
            })()}
          </div>
        </section>

        {/* ── GRID ────────────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-3 pb-20 relative z-20 w-full">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredBikes.length === 0 ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center opacity-40">
                <IconManual />
              </div>
              <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">{t[lang].noBikes}</p>
            </div>
          ) : (
            <div className="bike-grid grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {filteredBikes.map((s, idx) => (
                <div
                  key={s.id}
                  className="card-enter group bg-[#0c0e13] rounded-[1.8rem] border border-white/[0.06] overflow-hidden flex flex-col transition-all duration-300 hover:border-green-500/25 hover:-translate-y-0.5"
                  style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)', animationDelay: `${idx * 0.04}s` }}
                >
                  <Link href={`/bike/${s.id}`} className="relative aspect-[4/5] w-full overflow-hidden block">
                    <img src={s.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={s.model} />
                    <div className="card-img-overlay absolute inset-0" />
                    {s.no_license && (
                      <div className="absolute top-2.5 left-2.5">
                        <div className="badge-nolicense px-2 py-1 rounded-md text-[7px] font-black uppercase tracking-tighter font-display">
                          {t[lang].badgeNoLicense}
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-2.5 right-2.5 bg-black/50 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[7px] font-bold border border-white/10 text-white/50">
                      {s.year}
                    </div>
                  </Link>

                  <div className="p-3 flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1.5 text-[8px] font-black uppercase tracking-widest text-green-500/70">
                      <span>{s.transmission}</span>
                      <span className="dot-sep" />
                      <span>{s.engine}{t[lang].cc}</span>
                    </div>
                    <h3 className="font-display text-[14px] font-black uppercase italic tracking-tighter mb-3 leading-none truncate">
                      {s.model}
                    </h3>
                    <div className="grid grid-cols-2 gap-1.5 mb-3.5">
                      <div className="bg-white/[0.04] rounded-xl p-2 border border-white/5">
                        <p className="text-[6px] text-gray-500 uppercase font-black mb-0.5 font-display tracking-wider">{t[lang].day}</p>
                        <div className="flex items-baseline gap-1 flex-wrap">
                          <p className="font-display text-[10px] font-black tracking-tighter">{s.price_day}</p>
                          <PriceUsd price={s.price_day} />
                        </div>
                      </div>
                      <div className="bg-green-500/[0.07] rounded-xl p-2 border border-green-500/10">
                        <p className="text-[6px] text-green-500/50 uppercase font-black mb-0.5 font-display tracking-wider">{t[lang].month}</p>
                        <div className="flex items-baseline gap-1 flex-wrap">
                          <p className="font-display text-[10px] font-black tracking-tighter price-shimmer">
                            {s.price_2days || s.price_day}
                          </p>
                          <PriceUsd price={s.price_2days || s.price_day} />
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/bike/${s.id}`}
                      className="btn-press w-full bg-white text-black py-2.5 rounded-xl font-display font-black text-[10px] uppercase tracking-wide transition-all flex items-center justify-center gap-1.5 hover:bg-green-400 hover:text-black shadow-md hover:shadow-green-500/20"
                    >
                      {t[lang].btn}
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" className="opacity-50">
                        <path d="M1 9L9 1M9 1H2M9 1V8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── FOOTER ──────────────────────────────────────────────────── */}
        <footer className="w-full py-8 text-center mt-auto" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center justify-center gap-2">
            <span className="w-4 h-px bg-green-500/20" />
            <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.3em] font-display">Dragon Bike &bull; 2026</p>
            <span className="w-4 h-px bg-green-500/20" />
          </div>
        </footer>
      </main>
    </>
  );
}