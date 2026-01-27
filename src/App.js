import { useState } from 'react';
import { Scene } from './components';
import { InfectionUI } from './components/InfectionUI';
import './App.css';

/**
 * Composant App
 *
 * Composant principal de l'application
 * Affiche la scène 3D avec la planète Terre et le système d'infection
 */
function App() {
  const [infectionStats, setInfectionStats] = useState({ infected: 0, routes: 0 });

  return (
    <div className="App">
      {/* Scène 3D avec la Terre et l'infection */}
      <Scene onInfectionStats={setInfectionStats} />

      {/* Interface d'infection */}
      <InfectionUI stats={infectionStats} />

      {/* Superposition d'informations */}
      <div className="info-overlay">
        <h1>Planet Earth</h1>
        <p>Drag to rotate &bull; Scroll to zoom</p>
      </div>
    </div>
  );
}

export default App;
