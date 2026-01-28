import { useState, useEffect } from 'react';

/**
 * AlertIntro
 *
 * Вступительный экран с ALERT перед началом
 * - Мигает 6 раз
 * - Затем исчезает и показывает планету
 */
export function AlertIntro({ onComplete }) {
  const [visible, setVisible] = useState(true);
  const [blinkCount, setBlinkCount] = useState(0);
  const [isOn, setIsOn] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  // Эффект мигания
  useEffect(() => {
    if (blinkCount >= 6) {
      // После 3 миганий - начинаем fadeout
      setTimeout(() => {
        setFadeOut(true);
        // После fadeout - вызываем onComplete
        setTimeout(() => {
          setVisible(false);
          if (onComplete) onComplete();
        }, 800);
      }, 500);
      return;
    }

    // Мигание: вкл -> выкл -> вкл (один цикл)
    const blinkInterval = setInterval(() => {
      setIsOn(prev => {
        if (!prev) {
          // Был выключен, включаем - это конец одного мигания
          setBlinkCount(c => c + 1);
        }
        return !prev;
      });
    }, 800); // 800ms на каждое состояние (медленнее)

    return () => clearInterval(blinkInterval);
  }, [blinkCount, onComplete]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000a14',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      opacity: fadeOut ? 0 : 1,
      transition: 'opacity 0.8s ease-out',
    }}>
      {/* Сканлайны на фоне */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 255, 0.03) 2px, rgba(0, 255, 255, 0.03) 4px)',
        pointerEvents: 'none',
      }} />

      {/* Главный ALERT */}
      <div style={{
        opacity: isOn ? 1 : 0.1,
        transition: 'opacity 0.3s ease-in-out',
        textAlign: 'center',
      }}>
        {/* Иконка предупреждения */}
        <div style={{
          fontSize: '80px',
          marginBottom: '30px',
          color: '#ff0044',
          textShadow: isOn ? '0 0 30px #ff0044, 0 0 60px #ff0044, 0 0 90px #ff0044' : 'none',
          animation: isOn ? 'pulse-icon 0.5s ease-in-out infinite' : 'none',
        }}>
          ⚠
        </div>

        {/* ALERT текст */}
        <div style={{
          fontFamily: '"Courier New", "Consolas", monospace',
          fontSize: '120px',
          fontWeight: 'bold',
          color: '#ff0044',
          letterSpacing: '20px',
          textShadow: isOn
            ? '0 0 20px #ff0044, 0 0 40px #ff0044, 0 0 80px #ff0044, 0 0 120px rgba(255, 0, 68, 0.5)'
            : 'none',
        }}>
          ALERT
        </div>

        {/* Подзаголовок */}
        <div style={{
          fontFamily: '"Courier New", "Consolas", monospace',
          fontSize: '24px',
          color: '#00ffff',
          letterSpacing: '8px',
          marginTop: '40px',
          textShadow: isOn ? '0 0 10px #00ffff, 0 0 20px #00ffff' : 'none',
          textTransform: 'uppercase',
        }}>
          Global Threat Detected
        </div>

        {/* Линия */}
        <div style={{
          width: '400px',
          height: '2px',
          backgroundColor: isOn ? '#00ffff' : 'transparent',
          margin: '30px auto',
          boxShadow: isOn ? '0 0 10px #00ffff, 0 0 20px #00ffff' : 'none',
        }} />

        {/* Код угрозы */}
        <div style={{
          fontFamily: '"Courier New", monospace',
          fontSize: '16px',
          color: '#00ff00',
          letterSpacing: '4px',
          opacity: isOn ? 0.8 : 0.2,
        }}>
          THREAT CODE: BIO-X7 ░░░ ORIGIN: PARIS, FRANCE
        </div>
      </div>

      {/* Углы рамки */}
      <div style={{
        position: 'absolute',
        top: '40px',
        left: '40px',
        width: '60px',
        height: '60px',
        borderTop: `3px solid ${isOn ? '#ff0044' : '#331111'}`,
        borderLeft: `3px solid ${isOn ? '#ff0044' : '#331111'}`,
        boxShadow: isOn ? '0 0 15px rgba(255, 0, 68, 0.5)' : 'none',
        transition: 'all 0.15s',
      }} />
      <div style={{
        position: 'absolute',
        top: '40px',
        right: '40px',
        width: '60px',
        height: '60px',
        borderTop: `3px solid ${isOn ? '#ff0044' : '#331111'}`,
        borderRight: `3px solid ${isOn ? '#ff0044' : '#331111'}`,
        boxShadow: isOn ? '0 0 15px rgba(255, 0, 68, 0.5)' : 'none',
        transition: 'all 0.15s',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '40px',
        left: '40px',
        width: '60px',
        height: '60px',
        borderBottom: `3px solid ${isOn ? '#ff0044' : '#331111'}`,
        borderLeft: `3px solid ${isOn ? '#ff0044' : '#331111'}`,
        boxShadow: isOn ? '0 0 15px rgba(255, 0, 68, 0.5)' : 'none',
        transition: 'all 0.15s',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '40px',
        right: '40px',
        width: '60px',
        height: '60px',
        borderBottom: `3px solid ${isOn ? '#ff0044' : '#331111'}`,
        borderRight: `3px solid ${isOn ? '#ff0044' : '#331111'}`,
        boxShadow: isOn ? '0 0 15px rgba(255, 0, 68, 0.5)' : 'none',
        transition: 'all 0.15s',
      }} />

      {/* CSS анимации */}
      <style>{`
        @keyframes pulse-icon {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}

export default AlertIntro;
