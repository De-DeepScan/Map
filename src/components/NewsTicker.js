import { useState, useEffect, useRef } from 'react';

/**
 * NewsTicker
 *
 * Новостная лента с заголовками о распространении вируса
 * - Автоматическая смена заголовков
 * - Бегущая строка
 * - Стиль breaking news
 */

// Шаблоны новостей
const NEWS_TEMPLATES = [
  { text: "BREAKING: First case of unknown virus detected in Paris", delay: 0 },
  { text: "France declares state of health emergency", delay: 15000 },
  { text: "Virus spreads to neighboring Belgium and Germany", delay: 30000 },
  { text: "WHO monitoring situation closely", delay: 45000 },
  { text: "Spain reports first confirmed cases", delay: 60000 },
  { text: "Italy closes northern borders", delay: 75000 },
  { text: "UK confirms virus has reached London", delay: 90000 },
  { text: "European Union holds emergency summit", delay: 105000 },
  { text: "Virus detected in North Africa", delay: 120000 },
  { text: "Asian countries strengthen border controls", delay: 135000 },
  { text: "First cases reported in Russia", delay: 150000 },
  { text: "Global pandemic declared by WHO", delay: 180000 },
  { text: "Virus spreads to all continents", delay: 210000 },
  { text: "Scientists racing to develop vaccine", delay: 240000 },
  { text: "World leaders call for international cooperation", delay: 270000 },
];

export function NewsTicker({ startTime = null, isRunning = true }) {
  const [currentNews, setCurrentNews] = useState(NEWS_TEMPLATES[0].text);
  const [newsIndex, setNewsIndex] = useState(0);
  const tickerRef = useRef(null);

  // Suivre le temps et changer les nouvelles
  useEffect(() => {
    if (!isRunning || !startTime) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;

      // Trouver la dernière nouvelle qui devrait être affichée
      let latestIndex = 0;
      for (let i = NEWS_TEMPLATES.length - 1; i >= 0; i--) {
        if (elapsed >= NEWS_TEMPLATES[i].delay) {
          latestIndex = i;
          break;
        }
      }

      if (latestIndex !== newsIndex) {
        setNewsIndex(latestIndex);
        setCurrentNews(NEWS_TEMPLATES[latestIndex].text);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, startTime, newsIndex]);

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      backgroundColor: 'rgba(0, 10, 20, 0.95)',
      borderTop: '1px solid #00ffff',
      borderBottom: '1px solid #00ffff',
      overflow: 'hidden',
      height: '44px',
      display: 'flex',
      alignItems: 'center',
      boxShadow: '0 0 20px rgba(0, 255, 255, 0.3), inset 0 0 30px rgba(0, 255, 255, 0.05)',
    }}>
      {/* Label BREAKING - digital style */}
      <div style={{
        backgroundColor: 'transparent',
        border: '1px solid #ff0044',
        color: '#ff0044',
        padding: '6px 14px',
        fontFamily: '"Courier New", "Consolas", monospace',
        fontWeight: 'bold',
        fontSize: '12px',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        animation: 'glitch 2s infinite',
        marginLeft: '10px',
        letterSpacing: '2px',
        textShadow: '0 0 10px #ff0044, 0 0 20px #ff0044',
        boxShadow: '0 0 10px rgba(255, 0, 68, 0.5)',
      }}>
        ▶ ALERT
      </div>

      {/* Séparateur digital */}
      <div style={{
        width: '2px',
        height: '20px',
        backgroundColor: '#00ffff',
        margin: '0 15px',
        boxShadow: '0 0 10px #00ffff',
      }} />

      {/* Texte défilant - digital style */}
      <div
        ref={tickerRef}
        style={{
          flex: 1,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        <div style={{
          display: 'inline-block',
          paddingLeft: '100%',
          animation: 'ticker 20s linear infinite',
          color: '#00ffff',
          fontFamily: '"Courier New", "Consolas", monospace',
          fontSize: '14px',
          fontWeight: 'bold',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          textShadow: '0 0 10px #00ffff, 0 0 20px rgba(0, 255, 255, 0.5)',
        }}>
          {currentNews} ░░░ {currentNews} ░░░
        </div>
      </div>

      {/* Indicateur de signal */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        marginRight: '15px',
        marginLeft: '10px',
      }}>
        <div style={{
          width: '6px',
          height: '6px',
          backgroundColor: '#00ff00',
          borderRadius: '50%',
          animation: 'blink 1s infinite',
          boxShadow: '0 0 8px #00ff00',
        }} />
        <span style={{
          fontFamily: '"Courier New", monospace',
          fontSize: '10px',
          color: '#00ff00',
          letterSpacing: '1px',
        }}>LIVE</span>
      </div>

      {/* Styles CSS pour les animations */}
      <style>{`
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @keyframes glitch {
          0%, 90%, 100% {
            opacity: 1;
            transform: translateX(0);
          }
          92% {
            opacity: 0.8;
            transform: translateX(-2px);
          }
          94% {
            opacity: 1;
            transform: translateX(2px);
          }
          96% {
            opacity: 0.9;
            transform: translateX(0);
          }
        }

        @keyframes blink {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}

export default NewsTicker;
