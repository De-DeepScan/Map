import { Scene } from './components';
import './App.css';

/**
 * Composant App
 *
 * Composant principal de l'application
 * Affiche la scène 3D avec la planète Terre en plein écran
 */
function App() {
  return (
    <div className="App">
      {/* Scène 3D avec la Terre */}
      <Scene />

      {/* Superposition d'informations */}
      <div className="info-overlay">
        <h1>Planet Earth</h1>
        <p>Drag to rotate &bull; Scroll to zoom</p>
      </div>
    </div>
  );
}

export default App;
