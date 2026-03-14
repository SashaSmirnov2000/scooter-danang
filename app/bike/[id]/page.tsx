"use client";
import { useState, useEffect, useRef } from 'react';
import { useParams } from "next/navigation";
import { supabase } from "../../supabase";
import Link from "next/link";

export default function BikePage() {
  const params = useParams();

  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const [isReady, setIsReady] = useState(false);
  const [bike, setBike] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [ref, setRef] = useState<string>('');

  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSpecial, setIsSpecial] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    const savedLang = localStorage.getItem('userLang');
    if (savedLang === 'en' || savedLang === 'ru') setLang(savedLang as 'ru' | 'en');
    setIsReady(true);

    const initRefLogic = () => {
      const tg = (window as any).Telegram?.WebApp;
      const urlParams = new URLSearchParams(window.location.search);
      const startParam = urlParams.get('tgWebAppStartParam') || tg?.initDataUnsafe?.start_param;
      const savedRef = localStorage.getItem('referrer');
      if (startParam) { setRef(startParam); localStorage.setItem('referrer', startParam); return true; }
      else if (savedRef) { setRef(savedRef); return true; }
      return false;
    };

    initRefLogic();
    const interval = setInterval(() => { if (initRefLogic()) clearInterval(interval); }, 500);
    setTimeout(() => clearInterval(interval), 2000);

    async function loadBikeData() {
      const { data, error } = await supabase.from('scooters').select('*').eq('id', params.id).single();
      if (!error && data) setBike(data);
      setLoading(false);
    }
    if (params.id) loadBikeData();

    const tg = (window as any).Telegram?.WebApp;
    if (tg) { tg.ready(); tg.expand(); }
    return () => clearInterval(interval);
  }, [params.id]);

  const totalDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const calculateTotalOrderPrice = () => {
    const days = totalDays();
    if (days <= 0) return 0;
    const cleanPrice = (p: string) => parseInt(p?.replace(/\D/g, '') || '0');
    const p1 = cleanPrice(bike.price_day);
    const p2 = bike.price_2days ? cleanPrice(bike.price_2days) : p1;
    const finalDayPrice = days >= 2 ? p2 : p1;
    return (finalDayPrice * days).toLocaleString('de-DE');
  };

  const calcUsd = (vnd: string) => {
    const n = parseInt((vnd || '').replace(/\D/g, '') || '0');
    if (!n) return '';
    return `~$${Math.round(n / 26000)}`;
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const days = totalDays();
    if (days <= 0) { alert(lang === 'ru' ? "Выберите корректные даты" : "Select valid dates"); return; }
    setIsSubmitting(true);
    const tg = (window as any).Telegram?.WebApp;
    const user = tg?.initDataUnsafe?.user;
    const bookingData = {
      bike_id: bike.id, bike_model: bike.model, start_date: startDate, end_date: endDate,
      client_username: user?.username || 'web_user', telegram_id: user?.id,
      referrer: ref, total_price: calculateTotalOrderPrice() + " VND"
    };
    try {
      const { error: dbError } = await supabase.from('bookings').insert([bookingData]);
      if (dbError) throw dbError;
      await fetch('/api/send-telegram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bookingData) });
      setIsSubmitted(true);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const t = {
    ru: {
      back: "Назад", day: "1 сутки", month: "от 2 суток",
      btn: "Забронировать", helmets: "2 шлема в комплекте", clean: "В чистом состоянии",
      description: "Описание", transmission: "Трансмиссия", engine: "Двигатель", cc: "куб.",
      modalSub: "Даты аренды", submitBtn: "Отправить запрос",
      successTitle: "Запрос принят",
      successText: "Мы уже связываемся с владельцем. Вы можете закрыть приложение, мы пришлем уведомление в Telegram.",
      workingHours: "График: 10:00 — 22:00",
      close: "Закрыть", labelStart: "Начало аренды", labelEnd: "Конец аренды",
      total: "Дней", sum: "Итого",
      perDay: "в сутки", perDayLong: "от 2 суток",
      specialBadge: "Лучший прайс",
      specialTitle: "Длительная аренда",
      specialText: "Для аренды от 14 дней мы согласовываем индивидуальную цену с владельцем. После подтверждения наличия — пришлём вам лучшее предложение в Telegram.",
      specialBtn: "Запросить цену",
      specialSuccessTitle: "Запрос отправлен!",
      specialSuccessText: "Мы уже договариваемся с владельцем о лучшей цене для вас. Ожидайте уведомление в Telegram — обычно это занимает не более часа.",
    },
    en: {
      back: "Back", day: "1 day", month: "2+ days",
      btn: "Book Now", helmets: "2 helmets included", clean: "Clean condition",
      description: "Description", transmission: "Transmission", engine: "Engine", cc: "cc",
      modalSub: "Rental dates", submitBtn: "Send Request",
      successTitle: "Request Sent",
      successText: "We are contacting the owner. You can close the app; we will notify you via Telegram.",
      workingHours: "Hours: 10:00 AM — 10:00 PM",
      close: "Close", labelStart: "Start date", labelEnd: "End date",
      total: "Days", sum: "Total",
      perDay: "per day", perDayLong: "2+ days",
      specialBadge: "Best price",
      specialTitle: "Long-term rental",
      specialText: "For rentals of 14 days or more, we negotiate a personal price with the owner. Once availability is confirmed, we'll send you the best offer via Telegram.",
      specialBtn: "Request price",
      specialSuccessTitle: "Request sent!",
      specialSuccessText: "We're already negotiating the best price for you with the owner. Expect a Telegram notification — usually within an hour.",
    }
  };

  if (!isReady || loading) return (
    <div className="min-h-screen bg-[#f4f5f7] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" style={{ animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (!bike) return <div className="p-10 text-gray-700 text-center bg-[#f4f5f7] min-h-screen font-bold">Bike not found</div>;

  const gallery = [bike.image, ...(bike.images_gallery ? bike.images_gallery.split(',').map((s: string) => s.trim()) : [])];

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.targetTouches[0].clientX; };
  const onTouchMove  = (e: React.TouchEvent) => { touchEndX.current = e.targetTouches[0].clientX; };
  const onTouchEnd   = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50  && activePhotoIndex < gallery.length - 1) setActivePhotoIndex(p => p + 1);
    if (distance < -50 && activePhotoIndex > 0) setActivePhotoIndex(p => p - 1);
    touchStartX.current = null; touchEndX.current = null;
  };

  const goPrev = () => { if (activePhotoIndex > 0) setActivePhotoIndex(p => p - 1); };
  const goNext = () => { if (activePhotoIndex < gallery.length - 1) setActivePhotoIndex(p => p + 1); };

  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const quickRanges = [
    { label: '3 дн.',  days: 3,  special: false },
    { label: '5 дн.',  days: 5,  special: false },
    { label: '7 дн.',  days: 7,  special: false },
    { label: '10 дн.', days: 10, special: false },
    { label: '14 дн.', days: 14, special: true  },
    { label: '30 дн.', days: 30, special: true  },
  ];
  const applyQuick = (days: number) => {
    setStartDate(fmt(today));
    setEndDate(fmt(addDays(today, days)));
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,900;1,700;1,900&family=Barlow:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { background: #f4f5f7; }
        .font-display { font-family: 'Barlow Condensed', sans-serif; }
        .font-body    { font-family: 'Barlow', sans-serif; }

        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes modalIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0% { background-position:-200% center; } 100% { background-position:200% center; } }

        .fade-up  { animation: fadeUp 0.45s ease both; }
        .modal-in { animation: modalIn 0.3s cubic-bezier(0.22,1,0.36,1) both; }

        /* Price shimmer — only on the price text itself */
        .price-shimmer {
          background: linear-gradient(90deg, #16a34a 0%, #22c55e 45%, #16a34a 80%);
          background-size: 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }

        .btn-press:active { transform: scale(0.96); }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        input[type="date"] { -webkit-appearance: none; appearance: none; }
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.5; cursor: pointer; filter: invert(0.3); }

        /* Gallery tap zones */
        .gallery-tap-left, .gallery-tap-right {
          position: absolute; top: 0; bottom: 0; width: 40%; z-index: 10; cursor: pointer;
        }
        .gallery-tap-left  { left: 0; }
        .gallery-tap-right { right: 0; }

        /* Desktop arrows */
        .g-arrow {
          position: absolute; top: 50%; transform: translateY(-50%);
          width: 36px; height: 36px;
          background: rgba(255,255,255,0.9); backdrop-filter: blur(4px);
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          opacity: 0; transition: opacity 0.2s; pointer-events: none;
        }
        .gallery-wrap:hover .g-arrow { opacity: 1; }
        .g-arrow-l { left: 14px; }
        .g-arrow-r { right: 14px; }
        .g-arrow.gone { display: none; }

        /* Book btn */
        .book-btn {
          background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
          box-shadow: 0 4px 20px rgba(22,163,74,0.3);
          transition: box-shadow 0.2s, transform 0.15s;
        }
        .book-btn:hover { box-shadow: 0 6px 28px rgba(22,163,74,0.4); }

        /* Spec card */
        .spec-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 14px 16px;
        }

        /* Tag pill */
        .tag-pill {
          display: flex; align-items: center; gap: 7px;
          padding: 7px 14px;
          border-radius: 12px;
          font-family: 'Barlow', sans-serif;
          font-size: 12px; font-weight: 700;
          letter-spacing: 0.01em;
        }
        .tag-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

        /* Quick date buttons */
        .q-btn {
          flex: 1; padding: 10px 4px;
          border-radius: 12px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 12px; font-weight: 800;
          letter-spacing: 0.03em;
          border: 1.5px solid #e5e7eb;
          background: white; color: #6b7280;
          cursor: pointer; transition: all 0.15s;
          text-align: center; line-height: 1.2;
        }
        .q-btn:hover  { border-color: #16a34a; color: #15803d; background: #f0fdf4; }
        .q-btn.active { border-color: #16a34a; background: #16a34a; color: white; }
        .q-btn.special { border-color: #f59e0b; color: #b45309; background: #fffbeb; }
        .q-btn.special:hover { border-color: #d97706; background: #fef3c7; }
        .q-btn.special.active { border-color: #d97706; background: #f59e0b; color: white; }
        .q-btn-sub {
          display: block; font-size: 8px; font-weight: 700;
          letter-spacing: 0.04em; opacity: 0.75; margin-top: 1px;
        }

        /* Date input row */
        .date-field {
          background: #f9fafb;
          border: 1.5px solid #e5e7eb;
          border-radius: 16px;
          padding: 12px 14px;
        }
        .date-field:focus-within {
          border-color: #16a34a;
          background: #f0fdf4;
        }
        .date-label {
          font-family: 'Barlow', sans-serif;
          font-size: 11px; font-weight: 700;
          color: #9ca3af;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          display: block; margin-bottom: 4px;
        }
        .date-input {
          width: 100%; background: transparent;
          font-family: 'Barlow', sans-serif;
          font-size: 15px; font-weight: 700;
          color: #111827;
          border: none; outline: none;
          letter-spacing: 0.02em;
        }

        /* Summary row */
        .summary-box {
          background: #f0fdf4;
          border: 1.5px solid #bbf7d0;
          border-radius: 18px;
          padding: 16px 18px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .summary-label {
          font-family: 'Barlow', sans-serif;
          font-size: 11px; font-weight: 700;
          color: #6b7280; letter-spacing: 0.05em; text-transform: uppercase;
          margin-bottom: 2px;
        }
        .summary-value {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 26px; font-weight: 900;
          color: #111827; letter-spacing: 0.02em; line-height: 1;
        }
        .summary-value-green {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 22px; font-weight: 900;
          letter-spacing: 0.02em; line-height: 1;
        }
      `}</style>

      <main className="min-h-screen bg-[#f4f5f7] text-gray-900 font-body flex flex-col items-center overflow-x-hidden">

        {/* NAV */}
        <nav className="fixed top-0 w-full z-[100] bg-white/90 backdrop-blur-xl h-14 flex items-center px-4"
          style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.07), 0 2px 12px rgba(0,0,0,0.05)' }}>
          <Link href="/"
            className="btn-press flex items-center gap-2 bg-gray-100 border border-gray-200 px-4 py-2 rounded-xl font-body font-bold text-[13px] text-gray-700 hover:bg-gray-200 transition-all tracking-normal">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            {t[lang].back}
          </Link>
        </nav>

        <div className="w-full max-w-lg px-4 pt-20 pb-12 fade-up">

          {/* GALLERY */}
          <div
            className="gallery-wrap relative aspect-[3/4] w-full rounded-[2rem] overflow-hidden mb-4 bg-gray-100 touch-none"
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}
          >
            <div className="w-full h-full flex"
              style={{ transform: `translateX(-${activePhotoIndex * 100}%)`, transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1)' }}>
              {gallery.map((img, i) => (
                <img key={i} src={img} className="w-full h-full object-cover flex-shrink-0" alt={bike.model} />
              ))}
            </div>

            {/* Tap zones */}
            <div className="gallery-tap-left"  onClick={goPrev} />
            <div className="gallery-tap-right" onClick={goNext} />

            {/* Desktop arrows */}
            <div className={`g-arrow g-arrow-l ${activePhotoIndex === 0 ? 'gone' : ''}`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </div>
            <div className={`g-arrow g-arrow-r ${activePhotoIndex === gallery.length - 1 ? 'gone' : ''}`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>

            {/* Gradient overlay */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.15) 40%, transparent 65%)' }} />

            {/* Model name on photo */}
            <div className="absolute bottom-6 left-5 right-5 pointer-events-none">
              <h1 className="font-display font-black uppercase italic text-white leading-none drop-shadow-lg"
                style={{ fontSize: 'clamp(32px, 8vw, 44px)', letterSpacing: '0.04em' }}>
                {bike.model}
              </h1>
              <p className="text-white/65 font-body font-semibold mt-1.5"
                style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {bike.transmission} &nbsp;·&nbsp; {bike.engine} {lang === 'ru' ? 'куб.' : 'cc'}
              </p>
            </div>

            {/* Dots */}
            <div className="absolute bottom-5 right-5 flex gap-1.5 pointer-events-none">
              {gallery.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${activePhotoIndex === i ? 'w-5 bg-green-400' : 'w-1.5 bg-white/40'}`} />
              ))}
            </div>

            {/* Counter */}
            {gallery.length > 1 && (
              <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg pointer-events-none"
                style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.06em' }}>
                {activePhotoIndex + 1} / {gallery.length}
              </div>
            )}
          </div>

          {/* THUMBNAILS */}
          {gallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
              {gallery.map((img, idx) => (
                <button key={idx} onClick={() => setActivePhotoIndex(idx)}
                  className={`w-16 h-20 rounded-xl overflow-hidden flex-shrink-0 transition-all duration-200 ${
                    activePhotoIndex === idx
                      ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-[#f4f5f7] scale-95'
                      : 'opacity-45 hover:opacity-75'
                  }`}>
                  <img src={img} className="w-full h-full object-cover" alt="" />
                </button>
              ))}
            </div>
          )}

          {/* MAIN CARD */}
          <div className="bg-white rounded-[2rem] border border-gray-100 p-5 mb-4"
            style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-5">
              <div className="tag-pill" style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#15803d' }}>
                <span className="tag-dot bg-green-500" />
                {t[lang].helmets}
              </div>
              <div className="tag-pill" style={{ background:'#eff6ff', border:'1px solid #bfdbfe', color:'#1d4ed8' }}>
                <span className="tag-dot bg-blue-500" />
                {t[lang].clean}
              </div>
            </div>

            {/* Specs */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="spec-card text-center">
                <p className="font-body font-bold text-gray-400 mb-1.5"
                  style={{ fontSize:'11px', letterSpacing:'0.08em', textTransform:'uppercase' }}>
                  {t[lang].engine}
                </p>
                <p className="font-display font-black text-green-700"
                  style={{ fontSize:'18px', letterSpacing:'0.04em' }}>
                  {bike.engine} {t[lang].cc}
                </p>
              </div>
              <div className="spec-card text-center">
                <p className="font-body font-bold text-gray-400 mb-1.5"
                  style={{ fontSize:'11px', letterSpacing:'0.08em', textTransform:'uppercase' }}>
                  {t[lang].transmission}
                </p>
                <p className="font-display font-black text-gray-900"
                  style={{ fontSize:'16px', letterSpacing:'0.03em' }}>
                  {bike.transmission}
                </p>
              </div>
            </div>

            {/* Description */}
            {(bike.description_ru || bike.description_en) && (
              <div className="mb-5">
                <p className="font-body font-bold text-gray-400 mb-2"
                  style={{ fontSize:'11px', letterSpacing:'0.1em', textTransform:'uppercase' }}>
                  {t[lang].description}
                </p>
                <p className="font-body text-gray-600 leading-relaxed" style={{ fontSize:'14px', letterSpacing:'0.01em' }}>
                  {lang === 'ru' ? bike.description_ru : bike.description_en}
                </p>
              </div>
            )}

            {/* Price cards */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-center">
                <p className="font-body font-bold text-gray-400 mb-1.5"
                  style={{ fontSize:'11px', letterSpacing:'0.07em', textTransform:'uppercase' }}>
                  {t[lang].day}
                </p>
                <p className="font-display font-black text-gray-900"
                  style={{ fontSize:'20px', letterSpacing:'0.02em', lineHeight:1 }}>
                  {bike.price_day}
                </p>
                <p className="font-body text-gray-400 mt-1.5" style={{ fontSize:'12px', letterSpacing:'0.04em' }}>
                  {calcUsd(bike.price_day)}
                </p>
              </div>
              <div className="bg-green-50 rounded-2xl p-4 border border-green-100 text-center">
                <p className="font-body font-bold text-green-600 mb-1.5"
                  style={{ fontSize:'11px', letterSpacing:'0.07em', textTransform:'uppercase' }}>
                  {t[lang].month}
                </p>
                <p className="price-shimmer font-display font-black"
                  style={{ fontSize:'20px', letterSpacing:'0.02em', lineHeight:1 }}>
                  {bike.price_2days || bike.price_day}
                </p>
                <p className="font-body text-green-400 mt-1.5" style={{ fontSize:'12px', letterSpacing:'0.04em' }}>
                  {calcUsd(bike.price_2days || bike.price_day)}
                </p>
              </div>
            </div>

            {/* Book button */}
            <button
              onClick={() => { setShowModal(true); setIsSubmitted(false); setIsSpecial(false); }}
              className="btn-press book-btn w-full py-4 rounded-2xl text-white font-display font-black"
              style={{ fontSize:'15px', letterSpacing:'0.1em', textTransform:'uppercase' }}
            >
              {t[lang].btn}
            </button>
          </div>
        </div>

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />

            <div className="modal-in relative w-full max-w-sm bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl"
              style={{ maxHeight: '92vh', overflowY: 'auto', padding: '24px 20px 32px' }}>

              {!isSubmitted ? (
                <form onSubmit={handleBooking}>
                  {/* Handle */}
                  <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 sm:hidden" />

                  {/* Header */}
                  <div className="mb-6">
                    <h2 className="font-display font-black uppercase italic text-gray-900 leading-none"
                      style={{ fontSize:'26px', letterSpacing:'0.04em' }}>
                      {bike.model}
                    </h2>
                    <p className="font-body font-bold text-gray-400 mt-1"
                      style={{ fontSize:'12px', letterSpacing:'0.08em', textTransform:'uppercase' }}>
                      {t[lang].modalSub}
                    </p>
                  </div>

                  {/* Quick ranges */}
                  <div className="flex gap-1.5 mb-5 flex-wrap">
                    {quickRanges.map((r) => {
                      const isActive = startDate === fmt(today) && endDate === fmt(addDays(today, r.days));
                      return (
                        <button key={r.days} type="button"
                          onClick={() => { applyQuick(r.days); setIsSpecial(r.special); }}
                          className={`q-btn ${r.special ? 'special' : ''} ${isActive ? 'active' : ''}`}
                          style={{ minWidth: 0 }}>
                          {r.label}
                          {r.special && <span className="q-btn-sub">спец. цена</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Date inputs */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="date-field">
                      <label className="date-label">{t[lang].labelStart}</label>
                      <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                        className="date-input" />
                    </div>
                    <div className="date-field">
                      <label className="date-label">{t[lang].labelEnd}</label>
                      <input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                        className="date-input" />
                    </div>
                  </div>

                  {/* Summary — normal */}
                  {totalDays() > 0 && !isSpecial && (
                    <div className="summary-box mb-5">
                      <div>
                        <p className="summary-label">{t[lang].total}</p>
                        <p className="summary-value">{totalDays()} {lang === 'ru' ? 'дн.' : 'd.'}</p>
                      </div>
                      <div className="text-right">
                        <p className="summary-label" style={{ color:'#16a34a' }}>{t[lang].sum}</p>
                        <p className="price-shimmer summary-value-green">{calculateTotalOrderPrice()} ₫</p>
                        <p className="font-body font-semibold text-gray-400 mt-0.5"
                          style={{ fontSize:'12px', letterSpacing:'0.03em' }}>
                          {(() => {
                            const vnd = parseInt((calculateTotalOrderPrice() || '').toString().replace(/\D/g,'') || '0');
                            return vnd > 0 ? `≈ $${Math.round(vnd / 26000)}` : '';
                          })()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Summary — special (14+ days) */}
                  {totalDays() > 0 && isSpecial && (
                    <div className="mb-5" style={{
                      background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                      border: '1.5px solid #fcd34d',
                      borderRadius: '18px',
                      padding: '16px 18px',
                    }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div style={{
                            background: '#f59e0b', color: 'white',
                            borderRadius: '8px', padding: '3px 8px',
                            fontSize: '10px', fontWeight: 800,
                            letterSpacing: '0.06em', textTransform: 'uppercase',
                            fontFamily: "'Barlow Condensed', sans-serif",
                          }}>
                            ⭐ {t[lang].specialBadge}
                          </div>
                          <span className="font-display font-black text-amber-800"
                            style={{ fontSize: '14px', letterSpacing: '0.04em' }}>
                            {totalDays()} {lang === 'ru' ? 'дней' : 'days'}
                          </span>
                        </div>
                        {/* Estimated USD */}
                        <div style={{
                          background: 'rgba(255,255,255,0.7)',
                          border: '1px solid #fcd34d',
                          borderRadius: '10px',
                          padding: '4px 10px',
                          textAlign: 'center',
                        }}>
                          <p className="font-body font-bold text-amber-600"
                            style={{ fontSize: '9px', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1px' }}>
                            {lang === 'ru' ? 'от' : 'from'}
                          </p>
                          <p className="font-display font-black text-amber-800"
                            style={{ fontSize: '16px', letterSpacing: '0.03em', lineHeight: 1 }}>
                            {(() => {
                              const cleanPrice = (p: string) => parseInt(p?.replace(/\D/g, '') || '0');
                              const p2 = bike.price_2days ? cleanPrice(bike.price_2days) : cleanPrice(bike.price_day);
                              return `≈ $${Math.round((p2 * totalDays()) / 26000)}`;
                            })()}
                          </p>
                        </div>
                      </div>
                      <p className="font-body text-amber-800 leading-snug"
                        style={{ fontSize: '13px', letterSpacing: '0.01em' }}>
                        {t[lang].specialText}
                      </p>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowModal(false)}
                      className="btn-press flex-1 bg-gray-100 border border-gray-200 rounded-xl font-body font-bold text-gray-600 transition-all"
                      style={{ padding:'14px 8px', fontSize:'13px', letterSpacing:'0.04em' }}>
                      {t[lang].close}
                    </button>
                    <button type="submit" disabled={isSubmitting}
                      className="btn-press flex-[2] rounded-xl text-white font-body font-bold transition-all"
                      style={{
                        padding:'14px 8px', fontSize:'13px', letterSpacing:'0.04em',
                        background: isSpecial
                          ? 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)'
                          : 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                        boxShadow: isSpecial
                          ? '0 4px 20px rgba(217,119,6,0.35)'
                          : '0 4px 20px rgba(22,163,74,0.3)',
                      }}>
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" style={{ animation:'spin 0.8s linear infinite' }} />
                        </span>
                      ) : isSpecial ? t[lang].specialBtn : t[lang].submitBtn}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${isSpecial ? 'bg-amber-100 border border-amber-200' : 'bg-green-100 border border-green-200'}`}>
                    {isSpecial ? (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ) : (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    )}
                  </div>
                  <h2 className="font-display font-black uppercase italic text-gray-900 mb-3"
                    style={{ fontSize:'26px', letterSpacing:'0.04em' }}>
                    {isSpecial ? t[lang].specialSuccessTitle : t[lang].successTitle}
                  </h2>
                  <p className="font-body text-gray-500 leading-relaxed mb-4" style={{ fontSize:'14px' }}>
                    {isSpecial ? t[lang].specialSuccessText : t[lang].successText}
                  </p>
                  <div className="bg-gray-50 rounded-xl border border-gray-100 mb-6" style={{ padding:'12px 16px' }}>
                    <p className="font-body font-bold text-gray-400"
                      style={{ fontSize:'12px', letterSpacing:'0.06em', textTransform:'uppercase' }}>
                      {t[lang].workingHours}
                    </p>
                  </div>
                  <button onClick={() => setShowModal(false)}
                    className="btn-press w-full text-white rounded-xl font-body font-bold transition-all"
                    style={{
                      padding:'14px', fontSize:'13px', letterSpacing:'0.06em', textTransform:'uppercase',
                      background: isSpecial ? 'linear-gradient(135deg, #d97706, #f59e0b)' : '#111827',
                    }}>
                    OK
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}