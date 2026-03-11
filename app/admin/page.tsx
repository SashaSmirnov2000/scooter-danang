"use client";
import { useState, useEffect } from 'react';
import { supabase } from "../supabase";

const COMMISSION_PER_ORDER = 50000;

export default function AdminPage() {
    const [scooters, setScooters] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [partners, setPartners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'bikes' | 'bookings' | 'partners'>('bookings');
    
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');

    const [editingId, setEditingId] = useState<number | null>(null);

    const [model, setModel] = useState('');
    const [priceDay, setPriceDay] = useState('');
    const [price2Days, setPrice2Days] = useState(''); 
    const [priceMonth, setPriceMonth] = useState('');
    const [image, setImage] = useState('');
    const [imagesGallery, setImagesGallery] = useState(''); 
    const [engine, setEngine] = useState('');
    const [transmission, setTransmission] = useState('Автомат');
    const [noLicense, setNoLicense] = useState(false);
    const [sortOrder, setSortOrder] = useState('0');
    const [descriptionRu, setDescriptionRu] = useState('');
    const [descriptionEn, setDescriptionEn] = useState('');
    const [vendorPhone, setVendorPhone] = useState('84'); 
    const [mapUrl, setMapUrl] = useState(''); 

    useEffect(() => {
        if (isAuthenticated) {
            fetchData();
        }
    }, [isAuthenticated, activeTab]);

    async function fetchData() {
        setLoading(true);
        try {
            if (activeTab === 'bikes') {
                const { data } = await supabase.from('scooters').select('*').order('sort_order', { ascending: true });
                if (data) setScooters(data);
            } else if (activeTab === 'bookings') {
                const { data } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
                if (data) setBookings(data);
            } else if (activeTab === 'partners') {
                const { data } = await supabase.from('partners').select('*').neq('name', 'admin');
                if (data) setPartners(data);
            }
        } catch (error) {
            console.error("Ошибка загрузки:", error);
        }
        setLoading(false);
    }

    async function moveScooter(currentIndex: number, direction: 'up' | 'down') {
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= scooters.length) return;
        const currentScooter = scooters[currentIndex];
        const targetScooter = scooters[targetIndex];
        const { error: err1 } = await supabase.from('scooters').update({ sort_order: targetScooter.sort_order }).eq('id', currentScooter.id);
        const { error: err2 } = await supabase.from('scooters').update({ sort_order: currentScooter.sort_order }).eq('id', targetScooter.id);
        if (!err1 && !err2) fetchData();
    }

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (adminPassword === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) setIsAuthenticated(true);
        else { alert('Неверный пароль!'); setAdminPassword(''); }
    };

    const startEdit = (scooter: any) => {
        setEditingId(scooter.id);
        setModel(scooter.model);
        setPriceDay(scooter.price_day);
        setPrice2Days(scooter.price_2days || ''); 
        setPriceMonth(scooter.price_month);
        setImage(scooter.image);
        setImagesGallery(scooter.images_gallery || '');
        setEngine(scooter.engine || '');
        setTransmission(scooter.transmission || 'Автомат');
        setNoLicense(scooter.no_license || false);
        setSortOrder(scooter.sort_order?.toString() || '0');
        setDescriptionRu(scooter.description_ru || '');
        setDescriptionEn(scooter.description_en || '');
        setVendorPhone(scooter.vendor_phone || '84');
        setMapUrl(scooter.map_url || ''); 
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    async function handleSubmitScooter(e: React.FormEvent) {
        e.preventDefault();
        const scooterData = { model, price_day: priceDay, price_2days: price2Days, price_month: priceMonth, image, images_gallery: imagesGallery, engine, transmission, no_license: noLicense, sort_order: parseInt(sortOrder) || 0, description_ru: descriptionRu, description_en: descriptionEn, vendor_phone: vendorPhone, map_url: mapUrl };
        if (editingId) {
            const { error } = await supabase.from('scooters').update(scooterData).eq('id', editingId);
            if (!error) { setEditingId(null); resetForm(); fetchData(); }
        } else {
            const { error } = await supabase.from('scooters').insert([scooterData]);
            if (!error) { resetForm(); fetchData(); }
        }
    }

    const resetForm = () => {
        setModel(''); setPriceDay(''); setPrice2Days(''); setPriceMonth(''); setImage('');
        setImagesGallery(''); setEngine(''); setTransmission('Автомат');
        setNoLicense(false); setSortOrder('0');
        setDescriptionRu(''); setDescriptionEn(''); setVendorPhone('84'); setMapUrl('');
    };

    async function markAsPaid(booking: any) {
        const amountStr = prompt("Какую сумму зачислить партнеру?", COMMISSION_PER_ORDER.toString());
        if (amountStr === null) return;
        const amount = parseInt(amountStr);

        const { error: bError } = await supabase.from('bookings').update({ status: 'completed' }).eq('id', booking.id);
        
        if (!bError && booking.referrer) {
            const { data: partner } = await supabase.from('partners').select('balance').eq('name', booking.referrer).single();
            if (partner) {
                await supabase.from('partners').update({ balance: (partner.balance || 0) + amount }).eq('name', booking.referrer);
            }
        }
        fetchData();
    }

    async function handlePayout(partnerName: string) {
        if (!confirm(`Обнулить баланс партнера ${partnerName}?`)) return;
        const { error } = await supabase.from('partners').update({ balance: 0 }).eq('name', partnerName);
        if (!error) fetchData();
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#05070a] flex items-center justify-center p-4 text-white font-sans">
                <form onSubmit={handleLogin} className="bg-[#11141b] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl w-full max-w-sm text-center">
                    <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6"><span className="text-2xl">🔐</span></div>
                    <h2 className="text-xl font-bold mb-6 uppercase tracking-widest italic">Admin Access</h2>
                    <input type="password" placeholder="••••" className="w-full bg-black/40 p-4 rounded-2xl text-white border border-white/10 focus:border-green-500 outline-none mb-6 text-center text-2xl tracking-[0.5em]" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} autoFocus />
                    <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-2xl transition-all uppercase text-[10px] tracking-[0.2em]">Войти</button>
                </form>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#05070a] text-white p-4 md:p-8 font-sans">
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
                    <div>
                        <p className="text-green-500 text-[10px] font-black tracking-[0.3em] uppercase mb-2">Management</p>
                        <h1 className="text-4xl font-bold italic uppercase">Админ-панель</h1>
                    </div>
                    <div className="flex bg-[#11141b] p-1 rounded-2xl border border-white/5 overflow-x-auto">
                        <button onClick={() => setActiveTab('bookings')} className={`px-4 md:px-6 py-3 rounded-xl text-[10px] font-bold uppercase transition-all whitespace-nowrap ${activeTab === 'bookings' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}>Заявки</button>
                        <button onClick={() => setActiveTab('partners')} className={`px-4 md:px-6 py-3 rounded-xl text-[10px] font-bold uppercase transition-all whitespace-nowrap ${activeTab === 'partners' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}>Партнеры</button>
                        <button onClick={() => setActiveTab('bikes')} className={`px-4 md:px-6 py-3 rounded-xl text-[10px] font-bold uppercase transition-all whitespace-nowrap ${activeTab === 'bikes' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}>Байки</button>
                    </div>
                </div>

                {activeTab === 'bookings' && (
                    <div className="grid gap-4">
                        <div className="flex justify-between items-center mb-4 text-sm font-bold uppercase tracking-widest text-gray-500 italic">Последние бронирования <button onClick={fetchData} className="text-[10px] text-green-500">Обновить 🔄</button></div>
                        {loading ? <p>Загрузка...</p> : bookings.map(b => (
                            <div key={b.id} className={`p-6 rounded-[2rem] border transition-all flex flex-col md:flex-row justify-between items-center gap-6 ${b.status === 'completed' ? 'bg-green-500/5 border-green-500/20' : 'bg-[#11141b] border-white/5'}`}>
                                <div className="text-center md:text-left">
                                    <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
                                        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${b.status === 'completed' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black'}`}>{b.status === 'completed' ? 'Оплачено' : 'Ожидает'}</span>
                                        <span className="text-[10px] text-gray-500">@{b.client_username}</span>
                                    </div>
                                    <h4 className="text-xl font-bold uppercase italic">{b.bike_model}</h4>
                                    <p className="text-gray-500 text-[11px] uppercase tracking-wider">{b.start_date} — {b.end_date}</p>
                                    {b.referrer && <p className="text-[10px] text-blue-500 font-bold uppercase mt-2 italic">Партнер: {b.referrer}</p>}
                                </div>
                                {b.status === 'pending' && (
                                    <button onClick={() => markAsPaid(b)} className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">Подтвердить оплату ✅</button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'partners' && (
                    <div className="grid gap-4">
                        <div className="flex justify-between items-center mb-4 text-sm font-bold uppercase tracking-widest text-gray-500 italic">Балансы партнеров <button onClick={fetchData} className="text-[10px] text-green-500">Обновить 🔄</button></div>
                        {loading ? <p>Загрузка...</p> : partners.map(p => (
                            <div key={p.id} className="bg-[#11141b] p-6 rounded-[2rem] border border-white/5 flex justify-between items-center">
                                <div>
                                    <p className="text-green-500 font-black uppercase text-lg italic tracking-widest">{p.name}</p>
                                    <button onClick={() => handlePayout(p.name)} className="mt-2 text-[9px] bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-lg uppercase font-bold hover:bg-red-500 hover:text-white transition-all">Выплатить (обнулить) 💸</button>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold italic">{(p.balance || 0).toLocaleString()} VND</div>
                                    <div className="text-[9px] text-gray-500 uppercase font-black tracking-tighter italic">Текущий баланс</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'bikes' && (
                    <>
                        <form onSubmit={handleSubmitScooter} className="bg-[#11141b] p-8 rounded-[2.5rem] mb-16 border border-white/5 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 flex justify-between items-center">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 italic">{editingId ? 'Редактировать' : 'Добавить байк'}</h3>
                                {editingId && <button type="button" onClick={() => {setEditingId(null); resetForm();}} className="text-red-500 text-[10px] font-bold uppercase">Отмена ❌</button>}
                            </div>
                            <input className="bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white" placeholder="Модель" value={model} onChange={e => setModel(e.target.value)} required />
                            <input className="bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white" placeholder="WhatsApp" value={vendorPhone} onChange={e => setVendorPhone(e.target.value)} required />
                            <input className="bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white" placeholder="Цена день" value={priceDay} onChange={e => setPriceDay(e.target.value)} required />
                            <input className="bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white" placeholder="Цена месяц" value={priceMonth} onChange={e => setPriceMonth(e.target.value)} required />
                            <button type="submit" className={`md:col-span-2 p-5 rounded-2xl font-black uppercase text-[11px] tracking-widest text-white ${editingId ? 'bg-blue-600' : 'bg-green-600'}`}>{editingId ? 'Сохранить' : 'Опубликовать'}</button>
                        </form>
                        <div className="grid gap-4">
                            {scooters.map((s, idx) => (
                                <div key={s.id} className="bg-[#11141b] p-4 rounded-[2rem] flex justify-between items-center border border-white/5">
                                    <div className="flex items-center gap-4">
                                        <img src={s.image} className="w-12 h-12 object-cover rounded-xl" alt="" />
                                        <p className="font-bold uppercase italic text-sm">{s.model}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => startEdit(s)} className="text-blue-500 text-[10px] font-bold uppercase border border-blue-500/20 px-4 py-2 rounded-xl">Правка</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
                <div className="mt-20 text-center">
                    <button onClick={() => setIsAuthenticated(false)} className="text-[10px] font-black uppercase text-gray-600 hover:text-red-500 transition-all tracking-[0.3em]">Logout System _</button>
                </div>
            </div>
        </div>
    );
}