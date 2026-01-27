import { Scene } from './components';
import './App.css';

/**
 * Composant App
 *
 * Composant principal de l'application
 * Affiche la scène 3D avec la planète Terre et le système d'infection
 */
function App() {
  return (
    <div className="App">
      {/* Scène 3D avec la Terre et l'infection */}
      <Scene />
    </div>
  );
}

export default App;
