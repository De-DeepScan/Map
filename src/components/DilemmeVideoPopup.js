import { useState, useEffect, useCallback } from 'react';
import dilemmes from '../dilemme.json';

/**
 * DilemmeVideoPopup
 *
 * Affiche des videos en pop-up suite a un dilemme
 * - Position aleatoire sur l'ecran
 * - 1 ou 2 videos selon le choix
 * - Style digital/futuriste
 */

// Generer une position aleatoire pour un pop-up
function getRandomPosition(index, total) {
  // Diviser l'ecran en zones pour eviter le chevauchement
  const padding = 50;
  const popupWidth = 400;
  const popupHeight = 300;

  if (total === 1) {
    // Une seule video: position centrale aleatoire
    return {
      top: padding + Math.random() * (window.innerHeight - popupHeight - padding * 2),
      left: padding + Math.random() * (window.innerWidth - popupWidth - padding * 2),
    };
  } else {
    // Deux videos: une a gauche, une a droite
    const verticalPos = padding + Math.random() * (window.innerHeight - popupHeight - padding * 2);
    if (index === 0) {
      return {
        top: verticalPos,
        left: padding + Math.random() * (window.innerWidth / 2 - popupWidth - padding),
      };
    } else {
      return {
        top: verticalPos + (Math.random() - 0.5) * 100,
        left: window.innerWidth / 2 + Math.random() * (window.innerWidth / 2 - popupWidth - padding),
      };
    }
  }
}

// Composant pour une video individuelle
function VideoPopup({ videoSrc, position, onClose, index }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Animation d'apparition
    const timer = setTimeout(() => setShowContent(true), 100 + index * 200);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: '400px',
        zIndex: 9000 + index,
        opacity: showContent ? 1 : 0,
        transform: showContent ? 'scale(1)' : 'scale(0.8)',
        transition: 'all 0.4s ease-out',
      }}
    >
      {/* En-tete du pop-up */}
      <div
        style={{
          background: 'linear-gradient(90deg, #ff0044 0%, #880022 100%)',
          padding: '8px 15px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTopLeftRadius: '4px',
          borderTopRightRadius: '4px',
          boxShadow: '0 0 20px rgba(255, 0, 68, 0.5)',
        }}
      >
        <span
          style={{
            fontFamily: '"Courier New", monospace',
            fontSize: '12px',
            color: '#fff',
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}
        >
          CONSEQUENCE #{index + 1}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '0 5px',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Conteneur video */}
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.95)',
          border: '2px solid #ff0044',
          borderTop: 'none',
          borderBottomLeftRadius: '4px',
          borderBottomRightRadius: '4px',
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 0, 68, 0.3)',
        }}
      >
        {/* Loading indicator */}
        {!isLoaded && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#ff0044',
              fontFamily: '"Courier New", monospace',
              fontSize: '14px',
            }}
          >
            CHARGEMENT...
          </div>
        )}

        <video
          src={videoSrc}
          autoPlay
          playsInline
          onLoadedData={() => setIsLoaded(true)}
          onEnded={onClose}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
        />

        {/* Scanlines overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.1) 2px, rgba(0, 0, 0, 0.1) 4px)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Coins decoratifs */}
      <div
        style={{
          position: 'absolute',
          bottom: -5,
          left: -5,
          width: '15px',
          height: '15px',
          borderBottom: '2px solid #00ffff',
          borderLeft: '2px solid #00ffff',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -5,
          right: -5,
          width: '15px',
          height: '15px',
          borderBottom: '2px solid #00ffff',
          borderRight: '2px solid #00ffff',
        }}
      />
    </div>
  );
}

export function DilemmeVideoPopup({ dilemmeId, choiceId, onClose }) {
  const [videos, setVideos] = useState([]);
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    if (!dilemmeId || !choiceId) {
      setVideos([]);
      return;
    }

    // Trouver le dilemme
    const dilemme = dilemmes.find(d => d.id === String(dilemmeId));
    if (!dilemme) {
      console.warn('[DilemmeVideoPopup] Dilemme non trouve:', dilemmeId);
      setVideos([]);
      return;
    }

    // Trouver le choix
    const choice = dilemme.choices.find(c => c.id === String(choiceId));
    if (!choice) {
      console.warn('[DilemmeVideoPopup] Choix non trouve:', choiceId);
      setVideos([]);
      return;
    }

    // Collecter les videos
    const videoList = [];
    if (choice.nom_video) {
      videoList.push(`/dilemnes/${choice.nom_video}`);
    }
    if (choice.nom_video2) {
      videoList.push(`/dilemnes/${choice.nom_video2}`);
    }

    if (videoList.length === 0) {
      console.log('[DilemmeVideoPopup] Pas de video pour ce choix');
      setVideos([]);
      return;
    }

    // Generer les positions aleatoires
    const newPositions = videoList.map((_, i) => getRandomPosition(i, videoList.length));

    setVideos(videoList);
    setPositions(newPositions);

    console.log('[DilemmeVideoPopup] Affichage de', videoList.length, 'video(s)');
  }, [dilemmeId, choiceId]);

  // Fermer une video specifique
  const handleCloseVideo = useCallback((index) => {
    setVideos(prev => {
      const newVideos = [...prev];
      newVideos.splice(index, 1);
      // Si plus de videos, appeler onClose
      if (newVideos.length === 0 && onClose) {
        onClose();
      }
      return newVideos;
    });
    setPositions(prev => {
      const newPositions = [...prev];
      newPositions.splice(index, 1);
      return newPositions;
    });
  }, [onClose]);

  if (videos.length === 0) return null;

  return (
    <>
      {videos.map((videoSrc, index) => (
        <VideoPopup
          key={`${videoSrc}-${index}`}
          videoSrc={videoSrc}
          position={positions[index] || { top: 100, left: 100 }}
          onClose={() => handleCloseVideo(index)}
          index={index}
        />
      ))}
    </>
  );
}

export default DilemmeVideoPopup;
