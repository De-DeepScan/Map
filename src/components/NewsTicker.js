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
      backgroundColor: 'rgba(139, 0, 0, 0.9)',
      borderTop: '2px solid #ff0000',
      overflow: 'hidden',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
    }}>
      {/* Label BREAKING */}
      <div style={{
        backgroundColor: '#ff0000',
        color: 'white',
        padding: '8px 16px',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        fontSize: '14px',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        animation: 'pulse 1s infinite',
        zIndex: 1,
      }}>
        ⚠ BREAKING
      </div>

      {/* Texte défilant */}
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
          animation: 'ticker 15s linear infinite',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
          fontWeight: '500',
        }}>
          {currentNews} • • • {currentNews} • • •
        </div>
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

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}

export default NewsTicker;
