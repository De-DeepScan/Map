import { useState, useEffect, useCallback } from 'react';
import { Scene } from './components';
import { AlertIntro } from './components/AlertIntro';
import { InfectionComplete } from './components/InfectionComplete';
import { GeoJsonProvider } from './context/GeoJsonContext';
import './App.css';

const TOTAL_TIME = 5 * 60 * 1000; // 5 минут

/**
 * Composant App
 *
 * Composant principal de l'application
 * Affiche la scène 3D avec la planète Terre et le système d'infection
 */
function App() {
  const [introComplete, setIntroComplete] = useState(false);
  const [infectionComplete, setInfectionComplete] = useState(false);
  const [startTime, setStartTime] = useState(null);

  // Запускаем таймер после intro
  useEffect(() => {
    if (introComplete && !startTime) {
      setStartTime(Date.now());
    }
  }, [introComplete, startTime]);

  // Проверяем прошло ли 5 минут
  useEffect(() => {
    if (!startTime || infectionComplete) return;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= TOTAL_TIME) {
        setInfectionComplete(true);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, infectionComplete]);

  // Callback для завершения заражения (вызывается из Scene)
  const handleInfectionComplete = useCallback(() => {
    setInfectionComplete(true);
  }, []);

  return (
    <GeoJsonProvider>
      <div className="App">
        {/* Вступительный экран ALERT */}
        {!introComplete && (
          <AlertIntro onComplete={() => setIntroComplete(true)} />
        )}

        {/* Scène 3D avec la Terre et l'infection */}
        <Scene
          startAnimation={introComplete}
          onInfectionComplete={handleInfectionComplete}
          totalInfectionTime={TOTAL_TIME}
        />

        {/* Финальный экран - Планета заражена */}
        <InfectionComplete visible={infectionComplete} />
      </div>
    </GeoJsonProvider>
  );
}

export default App;
