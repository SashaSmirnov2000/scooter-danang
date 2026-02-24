'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Укажи здесь сумму комиссии за один оплаченный заказ (в донгах)
const COMMISSION_PER_ORDER = 50000; 

export default function PartnerCabinet() {
  const [refName, setRefName] = useState('');
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const cleanName = refName.trim().toLowerCase();
    const cleanPass = password.trim();

    const { data: partner, error: pError } = await supabase
      .from('partners')
      .select('name, password')
      .eq('name', cleanName)
      .eq('password', cleanPass)
      .maybeSingle();

    if (pError) {
      setError('Ошибка базы данных. Проверьте RLS политики.');
      setLoading(false);
      return;
    }

    if (!partner) {
      setError('Неверный логин или пароль');
      setLoading(false);
      return;
    }

    const [clicks, paid] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('referrer', partner.name),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('referrer', partner.name).eq('status', 'completed')
    ]);

    const paidCount = paid.count || 0;

    setStats({
      name: partner.name,
      clicks: clicks.count || 0,
      paid: paidCount,
      balance: paidCount * COMMISSION_PER_ORDER
    });
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!stats) {
    return (
      <div style={{ maxWidth: '400px', margin: '100px auto', padding: '25px', textAlign: 'center', fontFamily: 'sans-serif', backgroundColor: '#fff', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <h2 style={{ marginBottom: '10px' }}>Partner Login</h2>
        <form onSubmit={handleLogin}>
          <input 
            type="text" 
            placeholder="Ник рефки (Ref name)" 
            value={refName}
            onChange={(e) => setRefName(e.target.value)}
            style={{ width: '100%', padding: '14px', marginBottom: '12px', borderRadius: '10px', border: '1px solid #eee', boxSizing: 'border-box', backgroundColor: '#f9f9f9' }}
            required
          />
          <input 
            type="password" 
            placeholder="Пароль" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '14px', marginBottom: '20px', borderRadius: '10px', border: '1px solid #eee', boxSizing: 'border-box', backgroundColor: '#f9f9f9' }}
            required
          />
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: '#000', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
            {loading ? 'Вход...' : 'Войти в кабинет'}
          </button>
        </form>
        {error && <p style={{ color: '#ff4d4f', marginTop: '15px' }}>{error}</p>}
      </div>
    );
  }

  const refLink = `https://t.me/DragonBikeBot?start=${stats.name}`;

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif', color: '#333' }}>
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>Кабинет: {stats.name} ✨</h1>
      </header>

      {/* Основные карточки */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '15px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.clicks}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>Переходов</div>
        </div>
        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '15px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.paid}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>Оплат</div>
        </div>
      </div>

      {/* Карточка баланса */}
      <div style={{ background: '#000', color: '#fff', padding: '25px', borderRadius: '20px', textAlign: 'center', marginBottom: '30px', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '5px' }}>Ваш заработок (Balance)</div>
        <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.balance.toLocaleString()} VND</div>
      </div>

      {/* Реферальная ссылка */}
      <div style={{ background: '#f0f7ff', padding: '15px', borderRadius: '12px', border: '1px solid #cce3ff', marginBottom: '30px' }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 'bold', color: '#0056b3' }}>ВАША ССЫЛКА:</p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <code style={{ fontSize: '12px', flex: 1, wordBreak: 'break-all' }}>{refLink}</code>
          <button onClick={() => copyToClipboard(refLink)} style={{ background: '#0056b3', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
            {copied ? '✅' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Информация о выплатах */}
      <div style={{ background: '#fff', padding: '20px', borderRadius: '15px', border: '1px solid #eee', fontSize: '14px', lineHeight: '1.5' }}>
        <h3 style={{ marginTop: 0, fontSize: '16px' }}>💳 Выплаты (Payouts)</h3>
        <ul style={{ paddingLeft: '20px', margin: '10px 0' }}>
          <li>Минимальная сумма: **100,000 VND**</li>
          <li>Способы: **Vietnam QR** или **USDT**</li>
          <li>Срок обработки: **до 24 часов**</li>
        </ul>
        <p style={{ color: '#666', fontSize: '13px' }}>
          При достижении минимальной суммы напишите менеджеру для вывода средств:
        </p>
        <a 
          href="https://t.me/dragonbikesupport" 
          target="_blank" 
          style={{ display: 'block', textAlign: 'center', padding: '12px', background: '#24A1DE', color: '#fff', textDecoration: 'none', borderRadius: '10px', fontWeight: 'bold', marginTop: '10px' }}
        >
          Написать менеджеру 💬
        </a>
      </div>

      <button onClick={() => setStats(null)} style={{ width: '100%', marginTop: '40px', background: 'none', border: 'none', color: '#999', cursor: 'pointer', textDecoration: 'underline', fontSize: '13px' }}>
        Выйти из системы
      </button>
    </div>
  );
}