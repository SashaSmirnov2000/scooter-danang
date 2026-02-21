"use client";
import { useState, useEffect } from 'react';
import { useParams } from "next/navigation";
import { supabase } from "../../supabase"; 
import Link from "next/link";

export default function BikePage() {
  const params = useParams();
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const [bike, setBike] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState('');

  // Состояния для бронирования
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('userLang') as 'ru' | 'en';
    if (saved) setLang(saved);

    async function loadBikeData() {
      const { data, error } = await supabase
        .from('scooters')
        .select('*')
        .eq('id', params.id)
        .single();

      if (!error) {
        setBike(data);
        setActivePhoto(data.image);
      }
      setLoading(false);
    }
    if (params.id) loadBikeData();
  }, [params.id]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const tg = (window as any).Telegram?.WebApp;
    const username = tg?.initDataUnsafe?.user?.username || 'web_user';

    const { error } = await supabase.from('bookings').insert([{
      bike_id: bike.id,
      bike_model: bike.model,
      start_date: startDate,
      end_date: endDate,
      client_username: username
    }]);

    if (!error) {
      setIsSubmitted(true);
    } else {
      alert("Error: " + error.message);
    }
    setIsSubmitting(false);
  };

  const t = {
    ru: { 
      back: "← Назад", engine: "Объем", year: "Год", day: "В сутки", month: "В месяц", 
      btn: "Забронировать", included: "В стоимость включено:",
      modalSub: "Укажите даты аренды", submitBtn: "Отправить запрос",
      successTitle: "Заявка принята!", successText: "Мы скоро свяжемся с вами в Telegram.",
      close: "Закрыть", features: ["2 защитных шлема", "Техподдержка 24/7", "Чистый байк"]
    },
    en: { 
      back: "← Back", engine: "Engine", year: "Year", day: "Per day", month: "Per month", 
      btn: "Book Now", included: "What's included:",
      modalSub: "Select rental dates", submitBtn: "Send Request",
      successTitle: "Sent!", successText: "We will contact you on Telegram shortly.",
      close: "Close", features: ["2 Helmets", "24/7 Support", "Clean condition"]
    }
  };

  if (loading) return <div className="min-h-screen bg-[#05070a] flex items-center justify-center"><div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!bike) return <div className="p-10 text-white text-center bg-[#05070a] min-h-screen">Bike not found</div>;

  const gallery = [bike.image];
  if (bike.images_gallery) {
    const extra = bike.images_gallery.split(',').map((s: string) => s.trim());
    gallery.push(...extra);
  }

  return (
    <main className="min-h-screen bg-[#05070a] text-white font-sans selection:bg-green-500/30 pb-20">
      <div className="max-w-6xl mx-auto px-6 py-8">
        
        {/* Navigation */}
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="text-gray-500 hover:text-white transition-colors uppercase text-[10px] font-bold tracking-[0.2em]">{t[lang].back}</Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start text-left">
          {/* Gallery */}
          <div className="space-y-6">
            <div className="aspect-[4/3] rounded-[2.5rem] overflow-hidden bg-[#11141b] border border-white/5">
              <img src={activePhoto} className="w-full h-full object-contain p-4" alt={bike.model} />
            </div>
            {gallery.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {gallery.map((img, idx) => (
                  <button key={idx} onClick={() => setActivePhoto(img)} className={`relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 transition-all ${activePhoto === img ? 'border-green-500' : 'border-transparent opacity-50'}`}>
                    <img src={img} className="w-full h-full object-cover" alt="preview" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col text-left">
            <h1 className="text-4xl md:text-6xl font-bold uppercase italic tracking-tighter mb-4">{bike.model}</h1>
            
            <div className="flex gap-3 mb-8">
              <span className="bg-white/5 px-4 py-1.5 rounded-full border border-white/5 text-[10px] font-bold text-green-500 uppercase tracking-widest">{bike.engine}CC</span>
              <span className="bg-white/5 px-4 py-1.5 rounded-full border border-white/5 text-[10px] font-bold uppercase tracking-widest">{bike.year}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-[#11141b] p-6 rounded-[2rem] border border-white/5">
                <p className="text-[9px] text-gray-500 uppercase font-black mb-1">{t[lang].day}</p>
                <p className="text-2xl font-bold">{bike.price_day}</p>
              </div>
              <div className="bg-[#11141b] p-6 rounded-[2rem] border border-green-500/20">
                <p className="text-[9px] text-green-500 uppercase font-black mb-1">{t[lang].month}</p>
                <p className="text-2xl font-bold text-green-400">{bike.price_month}</p>
              </div>
            </div>

            <div className="bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 mb-10 text-left">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-gray-500">{t[lang].included}</h3>
              <div className="space-y-3">
                {t[lang].features.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs font-medium">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                    {f}
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={() => {setShowModal(true); setIsSubmitted(false);}}
              className="w-full bg-green-600 hover:bg-green-500 py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 text-white"
            >
              {t[lang].btn}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL WINDOW */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-[#11141b] border border-white/10 rounded-[2.5rem] p-7 animate-in slide-in-from-bottom duration-300 shadow-2xl">
            {!isSubmitted ? (
              <form onSubmit={handleBooking} className="text-left">
                <h2 className="text-2xl font-bold mb-1 uppercase italic text-white">{bike.model}</h2>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-8">{t[lang].modalSub}</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] text-gray-400 uppercase font-black ml-4 block mb-1.5">Дата начала</label>
                    <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-green-500" style={{ colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-400 uppercase font-black ml-4 block mb-1.5">Дата окончания</label>
                    <input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-green-500" style={{ colorScheme: 'dark' }} />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-white/5 py-4 rounded-2xl text-[10px] font-bold uppercase text-white">
                    {t[lang].close}
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex-[2] bg-green-600 py-4 rounded-2xl text-[10px] font-bold uppercase text-white shadow-lg shadow-green-900/40">
                    {isSubmitting ? '...' : t[lang].submitBtn}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl text-green-500">✓</span>
                </div>
                <h2 className="text-2xl font-bold mb-3 uppercase italic text-white">{t[lang].successTitle}</h2>
                <p className="text-gray-400 text-xs px-4 mb-8">{t[lang].successText}</p>
                <button onClick={() => setShowModal(false)} className="w-full bg-white/5 border border-white/10 py-4 rounded-2xl text-[10px] font-bold uppercase text-white">{t[lang].close}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}