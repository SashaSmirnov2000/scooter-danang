"use client";
import { useState, useEffect } from 'react';
import { supabase } from "../supabase";

export default function AdminPage() {
    const [scooters, setScooters] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'bikes' | 'bookings'>('bookings');
    
    // БЕЗОПАСНОСТЬ
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');

    // Поля для нового байка
    const [model, setModel] = useState('');
    const [priceDay, setPriceDay] = useState('');
    const [priceMonth, setPriceMonth] = useState('');
    const [image, setImage] = useState('');
    const [imagesGallery, setImagesGallery] = useState(''); 
    const [engine, setEngine] = useState('');
    const [year, setYear] = useState('');
    const [vendorPhone, setVendorPhone] = useState('84'); 

    useEffect(() => {
        if (isAuthenticated) {
            fetchData();
        }
    }, [isAuthenticated, activeTab]);

    async function fetchData() {
        setLoading(true);
        if (activeTab === 'bikes') {
            const { data } = await supabase.from('scooters').select('*').order('id', { ascending: false });
            if (data) setScooters(data);
        } else {
            const { data } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
            if (data) setBookings(data);
        }
        setLoading(false);
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        // Проверка пароля через таблицу partners (где name = admin)
        const { data, error } = await supabase
            .from('partners')
            .select('*')
            .eq('name', 'admin')
            .eq('password', adminPassword)
            .maybeSingle();

        if (data) {
            setIsAuthenticated(true);
        } else {
            alert('Доступ запрещен! Неверный пароль.');
            setAdminPassword('');
        }
    };

    // --- Функции для байков ---
    async function addScooter(e: React.FormEvent) {
        e.preventDefault();
        const { error } = await supabase.from('scooters').insert([{ 
            model, price_day: priceDay, price_month: priceMonth, image, 
            images_gallery: imagesGallery, engine, year, vendor_phone: vendorPhone 
        }]);
        if (!error) {
            alert('Байк добавлен');
            setModel(''); setPriceDay(''); setPriceMonth(''); setImage(''); fetchData();
        }
    }

    async function deleteScooter(id: number) {
        if (!confirm('Удалить байк?')) return;
        await supabase.from('scooters').delete().eq('id', id);
        fetchData();
    }

    // --- Функции для заявок ---
    async function markAsPaid(id: string) {
        const { error } = await supabase
            .from('bookings')
            .update({ status: 'completed' })
            .eq('id', id);
        
        if (!error) fetchData();
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#05070a] flex items-center justify-center p-4">
                <form onSubmit={handleLogin} className="bg-[#11141b] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl w-full max-w-sm text-center">
                    <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <span className="text-2xl">🔐</span>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-widest">Admin Secure Access</h2>
                    <input 
                        type="password" 
                        placeholder="ADMIN PASSWORD" 
                        className="w-full bg-black/40 p-4 rounded-2xl text-white border border-white/10 focus:border-green-500 outline-none mb-6 text-center"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        autoFocus
                    />
                    <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-2xl transition-all uppercase text-[10px] tracking-[0.2em]">
                        Авторизоваться
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#05070a] text-white p-4 md:p-8 font-sans">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
                    <div>
                        <p className="text-green-500 text-[10px] font-black tracking-[0.3em] uppercase mb-2">Central Control</p>
                        <h1 className="text-4xl font-bold italic uppercase">Management</h1>
                    </div>
                    <div className="flex bg-[#11141b] p-1 rounded-2xl border border-white/5">
                        <button 
                            onClick={() => setActiveTab('bookings')}
                            className={`px-6 py-3 rounded-xl text-[10px] font-bold uppercase transition-all ${activeTab === 'bookings' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Заявки
                        </button>
                        <button 
                            onClick={() => setActiveTab('bikes')}
                            className={`px-6 py-3 rounded-xl text-[10px] font-bold uppercase transition-all ${activeTab === 'bikes' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Байки
                        </button>
                    </div>
                </div>

                {/* Tab: BOOKINGS */}
                {activeTab === 'bookings' && (
                    <div className="grid gap-6">
                        <h2 className="text-xl font-bold uppercase italic text-gray-400">Список бронирований</h2>
                        {loading ? <p className="text-center py-10">Загрузка заявок...</p> : bookings.map(b => (
                            <div key={b.id} className={`p-6 rounded-[2rem] border transition-all flex flex-col md:flex-row justify-between items-center gap-6 ${b.status === 'completed' ? 'bg-green-500/5 border-green-500/20' : 'bg-[#11141b] border-white/5'}`}>
                                <div className="text-center md:text-left">
                                    <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
                                        <span className="text-xs bg-white/5 px-3 py-1 rounded-full text-gray-400">#{b.id.slice(0,5)}</span>
                                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${b.status === 'completed' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black'}`}>
                                            {b.status === 'completed' ? 'Оплачено' : 'Ожидает'}
                                        </span>
                                    </div>
                                    <h4 className="text-xl font-bold uppercase italic">{b.bike_model}</h4>
                                    <p className="text-gray-400 text-sm mt-1">Клиент: <span className="text-white">@{b.client_username}</span></p>
                                    <p className="text-gray-500 text-xs uppercase tracking-tighter mt-1">{b.start_date} — {b.end_date}</p>
                                    {b.referrer && (
                                        <p className="mt-2 text-[10px] text-blue-400 font-bold uppercase italic">Партнер: {b.referrer}</p>
                                    )}
                                </div>
                                
                                {b.status === 'pending' && (
                                    <button 
                                        onClick={() => markAsPaid(b.id)}
                                        className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-green-900/20"
                                    >
                                        Подтвердить оплату ✅
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Tab: BIKES (твой старый код) */}
                {activeTab === 'bikes' && (
                    <>
                        <form onSubmit={addScooter} className="bg-[#11141b] p-8 rounded-[2.5rem] mb-16 border border-white/5 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 flex justify-between">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Добавить новый байк</h3>
                            </div>
                            <input className="bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white text-sm" placeholder="Модель" value={model} onChange={e => setModel(e.target.value)} required />
                            <input className="bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white text-sm" placeholder="WhatsApp (без +)" value={vendorPhone} onChange={e => setVendorPhone(e.target.value)} required />
                            <input className="bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white text-sm" placeholder="Цена за день" value={priceDay} onChange={e => setPriceDay(e.target.value)} required />
                            <input className="bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white text-sm" placeholder="Цена за месяц" value={priceMonth} onChange={e => setPriceMonth(e.target.value)} required />
                            <input className="bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white text-sm" placeholder="Объем двигателя" value={engine} onChange={e => setEngine(e.target.value)} />
                            <input className="bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white text-sm" placeholder="Год выпуска" value={year} onChange={e => setYear(e.target.value)} />
                            <input className="md:col-span-2 bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white text-sm" placeholder="Ссылка на фото" value={image} onChange={e => setImage(e.target.value)} required />
                            <button type="submit" className="md:col-span-2 bg-green-600 hover:bg-green-500 p-5 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all">Опубликовать в каталог</button>
                        </form>

                        <div className="grid gap-4">
                            {scooters.map(s => (
                                <div key={s.id} className="bg-[#11141b] p-4 rounded-[2rem] flex justify-between items-center border border-white/5">
                                    <div className="flex items-center gap-4">
                                        <img src={s.image} className="w-12 h-12 object-cover rounded-xl" alt="" />
                                        <p className="font-bold uppercase italic text-sm">{s.model}</p>
                                    </div>
                                    <button onClick={() => deleteScooter(s.id)} className="text-red-500 text-[10px] font-bold uppercase border border-red-500/20 px-4 py-2 rounded-xl hover:bg-red-500 hover:text-white transition-all">Удалить</button>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}