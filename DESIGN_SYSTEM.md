# Design System - My Planet (Infection Simulation)

## Vue d'ensemble du projet

Une simulation 3D interactive d'une pandémie mondiale avec un style **digital/cyberpunk**.
L'infection commence à Paris et se propage à tous les pays en 5 minutes.

---

## Palette de couleurs

### Couleurs principales

| Nom | Hex | Usage |
|-----|-----|-------|
| **Rouge Alerte** | `#ff0044` | Alertes, infection, textes importants |
| **Cyan Digital** | `#00ffff` | Bordures UI, textes secondaires, glow |
| **Vert Néon** | `#00ff00` | Indicateurs "LIVE", statut positif |
| **Rouge Infection** | `#ff0000` | Zones infectées sur la carte |

### Couleurs de fond

| Nom | Hex | Usage |
|-----|-----|-------|
| **Fond principal** | `#000a14` | Écrans d'intro/fin |
| **Fond UI** | `rgba(0, 10, 20, 0.95)` | Panneaux HUD, ticker |
| **Fond scène** | `#000010` | Canvas 3D |

### Couleurs secondaires

| Nom | Hex | Usage |
|-----|-----|-------|
| **Magenta** | `#ff00ff` | Anneaux holographiques |
| **Cyan clair** | `#00ddff` | Grille océan |
| **Vert menthe** | `#00ff88` | Accents tertiaires |
| **Jaune alerte** | `#ffff00` | Progression moyenne |
| **Orange alerte** | `#ff8800` | Progression élevée |

### Opacités standard

- Glow fort: `opacity: 0.9`
- Éléments UI: `opacity: 0.8`
- Texte secondaire: `opacity: 0.7`
- Éléments désactivés: `opacity: 0.3`

---

## Typographie

### Police principale
```css
font-family: "Courier New", "Consolas", monospace;
```

### Tailles de texte

| Usage | Taille |
|-------|--------|
| Titre principal (ALERT, PLANÈTE) | `72px - 120px` |
| Sous-titre | `24px` |
| Texte UI | `14px - 18px` |
| Labels | `12px` |
| Petits indicateurs | `10px` |

### Styles de texte

```css
/* Texte avec glow */
text-shadow: 0 0 10px #ff0044, 0 0 20px #ff0044;

/* Texte digital */
letter-spacing: 2px - 8px;
text-transform: uppercase;
font-weight: bold;
```

---

## Effets visuels

### Glow (Lueur néon)

```css
/* Box glow */
box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);

/* Text glow rouge */
text-shadow: 0 0 20px #ff0044, 0 0 40px #ff0044, 0 0 80px rgba(255, 0, 68, 0.5);

/* Text glow cyan */
text-shadow: 0 0 10px #00ffff, 0 0 20px rgba(0, 255, 255, 0.5);
```

### Scanlines (Lignes de balayage)

```css
background: repeating-linear-gradient(
  0deg,
  transparent,
  transparent 2px,
  rgba(0, 255, 255, 0.03) 2px,
  rgba(0, 255, 255, 0.03) 4px
);
```

### Bordures UI

```css
border: 1px solid #00ffff;
/* ou pour alerte */
border: 1px solid #ff0044;
```

---

## Animations

### Clignotement (Blink)

```css
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
/* Usage: animation: blink 1s infinite; */
```

### Pulsation

```css
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}
/* Usage: animation: pulse 2s ease-in-out infinite; */
```

### Glitch

```css
@keyframes glitch {
  0%, 90%, 100% { opacity: 1; transform: translateX(0); }
  92% { opacity: 0.8; transform: translateX(-2px); }
  94% { opacity: 1; transform: translateX(2px); }
  96% { opacity: 0.9; transform: translateX(0); }
}
/* Usage: animation: glitch 2s infinite; */
```

### Ticker (Défilement)

```css
@keyframes ticker {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
/* Usage: animation: ticker 20s linear infinite; */
```

---

## Composants UI

### Coins de cadre

```css
/* Coin supérieur gauche */
{
  position: absolute;
  top: 30px;
  left: 30px;
  width: 60px;
  height: 60px;
  border-top: 3px solid #ff0044;
  border-left: 3px solid #ff0044;
  box-shadow: 0 0 15px rgba(255, 0, 68, 0.5);
}
```

### Barre de progression

```css
/* Container */
{
  height: 20px;
  background-color: rgba(0, 20, 40, 0.8);
  border: 1px solid #00ffff;
}

/* Fill */
{
  background: linear-gradient(90deg, ${color}88, ${color});
  box-shadow: 0 0 20px ${color};
}
```

### Indicateur LIVE

```css
{
  width: 6px;
  height: 6px;
  background-color: #00ff00;
  border-radius: 50%;
  animation: blink 1s infinite;
  box-shadow: 0 0 8px #00ff00;
}
```

---

## Timings

### Écran d'intro (AlertIntro)
- Durée d'un clignotement: `800ms`
- Nombre de clignotements: `6`
- Fade out: `800ms`

### Animation caméra
- Durée: `20 secondes`
- Distance début: `3.2` (proche)
- Distance fin: `6` (vue globale)
- Délai initial: `500ms`

### Propagation infection
- Intervalle entre vagues: `1200ms`
- Durée remplissage pays: `1500ms`
- Durée totale: `5 minutes`

### Écran final (InfectionComplete)
- Fade in fond: `1.5s`
- Apparition contenu: `800ms` après fade

---

## Structure des écrans

### 1. AlertIntro
- Fond sombre avec scanlines
- "ALERT" clignotant en rouge
- "Global Threat Detected" en cyan
- Code de menace en vert
- Coins de cadre animés

### 2. Scène principale
- Planète 3D avec grille océan
- HUD en haut à gauche (timer + progression)
- Ticker en bas (news défilantes)
- Anneaux holographiques autour de la Terre

### 3. InfectionComplete
- Icône biohazard ☣ pulsante
- "PLANÈTE INFECTÉE" en rouge
- Statistiques en cyan/vert
- Coins de cadre

---

## Icônes et symboles

| Symbole | Unicode | Usage |
|---------|---------|-------|
| ⚠ | U+26A0 | Alerte, warning |
| ☣ | U+2623 | Biohazard, infection |
| ▶ | U+25B6 | Indicateur actif |
| ░ | U+2591 | Séparateur digital |

---

## Fichiers clés

| Fichier | Description |
|---------|-------------|
| `AlertIntro.js` | Écran d'introduction |
| `InfectionComplete.js` | Écran de fin |
| `InfectionHUD.js` | Panel de progression |
| `NewsTicker.js` | Bande d'actualités |
| `InfectionOrigin.js` | Point de départ (Paris) |
| `CountryInfectionLayer.js` | Rendu des pays infectés |
| `useCountryInfection.js` | Logique de propagation |

---

## Notes techniques

### Three.js / React Three Fiber
- Rayon Terre: `EARTH_RADIUS` (défini dans `geoUtils.js`)
- Vitesse rotation: `0.001`
- Triangulation polygones: bibliothèque `earcut`

### Performances
- Les pays utilisent `memo()` pour éviter re-renders
- Les géométries sont créées une fois et réutilisées
- Le spread interval s'adapte au nombre de pays infectés

---

## Exemple de code - Style digital

```jsx
<div style={{
  fontFamily: '"Courier New", "Consolas", monospace',
  fontSize: '24px',
  color: '#00ffff',
  letterSpacing: '4px',
  textTransform: 'uppercase',
  textShadow: '0 0 10px #00ffff, 0 0 20px #00ffff',
  animation: 'glitch 2s infinite',
}}>
  DIGITAL TEXT
</div>
```
