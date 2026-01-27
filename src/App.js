import { useState } from 'react';
import { Scene } from './components';
import { AlertIntro } from './components/AlertIntro';
import './App.css';

/**
 * Composant App
 *
 * Composant principal de l'application
 * Affiche la scène 3D avec la planète Terre et le système d'infection
 */
function App() {
  const [introComplete, setIntroComplete] = useState(false);

  return (
    <div className="App">
      {/* Вступительный экран ALERT */}
      {!introComplete && (
        <AlertIntro onComplete={() => setIntroComplete(true)} />
      )}

      {/* Scène 3D avec la Terre et l'infection */}
      <Scene startAnimation={introComplete} />
    </div>
  );
}

export default App;
