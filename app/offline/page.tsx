'use client';

export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0015 0%, #1a0a2e 50%, #0a0015 100%)',
        color: '#f8f4ff',
        fontFamily: "'Inter', -apple-system, sans-serif",
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 72, marginBottom: 16 }}>📡</div>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 600, marginBottom: 8 }}>
        Нет подключения к сети
      </h1>
      <p style={{ color: 'rgba(248,244,255,0.55)', maxWidth: 360, lineHeight: 1.6 }}>
        WeatherWorld требует интернет для загрузки актуальных данных о погоде.
        Проверьте подключение и попробуйте снова.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: 24,
          padding: '10px 28px',
          borderRadius: 12,
          border: '1px solid rgba(168,85,247,0.4)',
          background: 'rgba(168,85,247,0.15)',
          color: '#e879f9',
          fontSize: '0.95rem',
          cursor: 'pointer',
          fontWeight: 500,
        }}
      >
        Обновить
      </button>
    </div>
  );
}
