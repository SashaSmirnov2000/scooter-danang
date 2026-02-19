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

  useEffect(() => {
    const saved = localStorage.getItem('userLang') as 'ru' | 'en';
    if (saved) setLang(saved);

    async function loadBikeData() {
      const { data, error } = await supabase
        .from('scooters')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) {
        console.error('Ошибка загрузки байка:', error);
      } else {
        setBike(data);
        setActivePhoto(data.image);
      }
      setLoading(false);
    }

    if (params.id) loadBikeData();
  }, [params.id]);

  const toggleLang = () => {
    const newLang = lang === 'ru' ? 'en' : 'ru';
    setLang(newLang);
    localStorage.setItem('userLang', newLang);
  };

  const t = {
    ru: { 
      back: "← Назад в каталог", 
      engine: "Объем", 
      year: "Год", 
      day: "В сутки", 
      month: "В месяц", 
      btn: "Забронировать", 
      notFound: "Байк не найден", 
      loading: "Загрузка...",
      msg: "Здравствуйте! Хочу забронировать",
      included: "В стоимость включено:",
      features: ["2 защитных шлема", "Техподдержка 24/7", "Чистое состояние"]
    },
    en: { 
      back: "← Back to catalog", 
      engine: "Engine", 
      year: "Year", 
      day: "Per day", 
      month: "Per month", 
      btn: "Book via WhatsApp", 
      notFound: "Bike not found", 
      loading: "Loading...",
      msg: "Hello! I want to book",
      specs: "Specifications",
      included: "What's included:",
      features: ["2 Helmets", "24/7 Support", "Clean condition"]
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#05070a] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  
  if (!bike) return <div className="p-10 text-white text-center bg-[#05070a] min-h-screen">{t[lang].notFound}</div>;

  const gallery = [bike.image];
  if (bike.images_gallery) {
    const extra = bike.images_gallery.split(',').map((s: string) => s.trim());
    gallery.push(...extra);
  }

  return (
    <main className="min-h-screen bg-[#05070a] text-white font-sans selection:bg-green-500/30">
      <div className="max-w-6xl mx-auto px-6 py-12">
        
        {/* Navigation */}
        <div className="flex justify-between items-center mb-12">
          <Link href="/" className="text-gray-500 hover:text-white transition-colors uppercase text-[10px] font-bold tracking-[0.2em]">
            {t[lang].back}
          </Link>
          <button 
            onClick={toggleLang} 
            className="bg-white/5 border border-white/10 px-5 py-2 rounded-2xl text-[10px] font-bold uppercase hover:bg-white/10 transition-all"
          >
            {lang === 'ru' ? 'English' : 'Русский'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          
          {/* Gallery Section */}
          <div className="space-y-6">
            <div className="aspect-[4/3] rounded-[3rem] overflow-hidden bg-[#11141b] border border-white/5 shadow-2xl">
              <img 
                src={activePhoto} 
                className="w-full h-full object-cover" 
                alt={bike.model} 
              />
            </div>
            
            {gallery.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                {gallery.map((img, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setActivePhoto(img)}
                    className={`relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border-2 transition-all duration-300 ${activePhoto === img ? 'border-green-500 scale-95' : 'border-transparent opacity-40 hover:opacity-100'}`}
                  >
                    <img src={img} className="w-full h-full object-cover" alt="preview" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="flex flex-col">
            <div className="mb-10">
               <h1 className="text-5xl md:text-7xl font-bold uppercase italic tracking-tighter leading-tight mb-6">
                {bike.model}
              </h1>
              <div className="flex flex-wrap gap-4">
                <div className="bg-white/5 px-4 py-2 rounded-full border border-white/5 flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t[lang].engine}</span>
                  <span className="text-sm font-black text-green-500">{bike.engine}CC</span>
                </div>
                <div className="bg-white/5 px-4 py-2 rounded-full border border-white/5 flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t[lang].year}</span>
                  <span className="text-sm font-black">{bike.year}</span>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-[#11141b] p-6 rounded-[2.5rem] border border-white/5">
                <p className="text-[9px] text-gray-500 uppercase font-black mb-1 tracking-widest">{t[lang].day}</p>
                <p className="text-3xl font-bold">{bike.price_day}</p>
              </div>
              <div className="bg-[#11141b] p-6 rounded-[2.5rem] border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.05)]">
                <p className="text-[9px] text-green-500 uppercase font-black mb-1 tracking-widest">{t[lang].month}</p>
                <p className="text-3xl font-bold text-green-400">{bike.price_month}</p>
              </div>
            </div>

            {/* Features List */}
            <div className="bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 mb-10">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-gray-500">{t[lang].included}</h3>
              <div className="grid grid-cols-1 gap-4">
                {t[lang].features.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm font-medium">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Booking Button */}
            <a 
              href={`https://wa.me/${bike.vendor_phone}?text=${t[lang].msg} ${bike.model}`}
              target="_blank"
              className="w-full bg-green-600 hover:bg-green-500 text-white flex items-center justify-center py-7 rounded-[2rem] font-black text-[11px] md:text-xs uppercase tracking-[0.2em] transition-all shadow-[0_20px_40px_rgba(22,163,74,0.15)] active:scale-[0.98]"
            >
              {t[lang].btn}
            </a>
          </div>

        </div>
      </div>
    </main>
  );
}