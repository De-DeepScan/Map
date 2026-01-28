import { useState, useEffect } from 'react';

/**
 * InfectionComplete
 *
 * Финальный экран после заражения всей планеты
 * - Digital стиль
 * - "Планета заражена"
 */
export function InfectionComplete({ visible = false }) {
  const [fadeIn, setFadeIn] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (visible) {
      // Начинаем fade in
      setTimeout(() => setFadeIn(true), 100);
      // Показываем контент с задержкой
      setTimeout(() => setShowContent(true), 800);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: fadeIn ? 'rgba(0, 5, 10, 0.95)' : 'transparent',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10000,
      transition: 'background-color 1.5s ease-in',
    }}>
      {/* Сканлайны */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 0, 68, 0.02) 2px, rgba(255, 0, 68, 0.02) 4px)',
        pointerEvents: 'none',
        opacity: fadeIn ? 1 : 0,
        transition: 'opacity 1s ease-in',
      }} />

      {/* Контент */}
      <div style={{
        opacity: showContent ? 1 : 0,
        transform: showContent ? 'scale(1)' : 'scale(0.9)',
        transition: 'all 1s ease-out',
        textAlign: 'center',
      }}>
        {/* Иконка биологической опасности */}
        <div style={{
          fontSize: '100px',
          marginBottom: '40px',
          color: '#ff0044',
          textShadow: '0 0 30px #ff0044, 0 0 60px #ff0044, 0 0 90px #ff0044',
          animation: 'pulse-complete 2s ease-in-out infinite',
        }}>
          ☣
        </div>

        {/* Главный текст */}
        <div style={{
          fontFamily: '"Courier New", "Consolas", monospace',
          fontSize: '72px',
          fontWeight: 'bold',
          color: '#ff0044',
          letterSpacing: '8px',
          textTransform: 'uppercase',
          textShadow: '0 0 20px #ff0044, 0 0 40px #ff0044, 0 0 80px rgba(255, 0, 68, 0.5)',
          marginBottom: '20px',
        }}>
          PLANÈTE
        </div>

        <div style={{
          fontFamily: '"Courier New", "Consolas", monospace',
          fontSize: '72px',
          fontWeight: 'bold',
          color: '#ff0044',
          letterSpacing: '8px',
          textTransform: 'uppercase',
          textShadow: '0 0 20px #ff0044, 0 0 40px #ff0044, 0 0 80px rgba(255, 0, 68, 0.5)',
        }}>
          INFECTÉE
        </div>

        {/* Линия */}
        <div style={{
          width: '500px',
          height: '2px',
          backgroundColor: '#ff0044',
          margin: '50px auto',
          boxShadow: '0 0 20px #ff0044, 0 0 40px #ff0044',
          animation: 'line-pulse 1.5s ease-in-out infinite',
        }} />

        {/* Статистика */}
        <div style={{
          fontFamily: '"Courier New", monospace',
          fontSize: '18px',
          color: '#00ffff',
          letterSpacing: '4px',
          textShadow: '0 0 10px #00ffff',
          marginBottom: '15px',
        }}>
          INFECTION RATE: 100%
        </div>

        <div style={{
          fontFamily: '"Courier New", monospace',
          fontSize: '14px',
          color: '#00ff00',
          letterSpacing: '3px',
          opacity: 0.8,
        }}>
          ░░░ TOUS LES PAYS INFECTÉS ░░░
        </div>

        {/* Дата */}
        <div style={{
          fontFamily: '"Courier New", monospace',
          fontSize: '12px',
          color: '#666',
          letterSpacing: '2px',
          marginTop: '40px',
        }}>
          SIMULATION TERMINÉE
        </div>
      </div>

      {/* Углы рамки */}
      <div style={{
        position: 'absolute',
        top: '30px',
        left: '30px',
        width: '80px',
        height: '80px',
        borderTop: '3px solid #ff0044',
        borderLeft: '3px solid #ff0044',
        boxShadow: '0 0 20px rgba(255, 0, 68, 0.5)',
        opacity: showContent ? 1 : 0,
        transition: 'opacity 1s ease-in 0.5s',
      }} />
      <div style={{
        position: 'absolute',
        top: '30px',
        right: '30px',
        width: '80px',
        height: '80px',
        borderTop: '3px solid #ff0044',
        borderRight: '3px solid #ff0044',
        boxShadow: '0 0 20px rgba(255, 0, 68, 0.5)',
        opacity: showContent ? 1 : 0,
        transition: 'opacity 1s ease-in 0.5s',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '30px',
        left: '30px',
        width: '80px',
        height: '80px',
        borderBottom: '3px solid #ff0044',
        borderLeft: '3px solid #ff0044',
        boxShadow: '0 0 20px rgba(255, 0, 68, 0.5)',
        opacity: showContent ? 1 : 0,
        transition: 'opacity 1s ease-in 0.5s',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '30px',
        right: '30px',
        width: '80px',
        height: '80px',
        borderBottom: '3px solid #ff0044',
        borderRight: '3px solid #ff0044',
        boxShadow: '0 0 20px rgba(255, 0, 68, 0.5)',
        opacity: showContent ? 1 : 0,
        transition: 'opacity 1s ease-in 0.5s',
      }} />

      {/* CSS анимации */}
      <style>{`
        @keyframes pulse-complete {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }

        @keyframes line-pulse {
          0%, 100% {
            opacity: 1;
            width: 500px;
          }
          50% {
            opacity: 0.7;
            width: 520px;
          }
        }
      `}</style>
    </div>
  );
}

export default InfectionComplete;
