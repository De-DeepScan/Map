import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * HolographicRings - Голографические кольца данных вокруг планеты
 *
 * Создаёт несколько вращающихся колец с:
 * - Бегущими цифрами и символами
 * - Пульсирующим свечением
 * - Разными скоростями вращения
 */

// Символы для отображения на кольцах
const DATA_SYMBOLS = '01アイウエオカキクケコ∆∇◊□○●◆▲▼<>{}[]';

/**
 * Отдельное кольцо с данными
 */
function DataRing({
  radius = 3,
  segments = 64,
  color = '#00ffff',
  rotationSpeed = 0.5,
  tilt = 0,
  opacity = 0.6,
  dashPattern = [0.1, 0.05],
  pulseSpeed = 2,
}) {
  const ringRef = useRef();
  const materialRef = useRef();

  // Создаём геометрию кольца
  const geometry = useMemo(() => {
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [radius, segments]);

  // Анимация
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.y += rotationSpeed * 0.01;
    }
    if (materialRef.current) {
      // Пульсация opacity
      const pulse = Math.sin(state.clock.elapsedTime * pulseSpeed) * 0.2 + 0.8;
      materialRef.current.opacity = opacity * pulse;
      // Анимация dash offset для эффекта движения
      materialRef.current.dashOffset -= rotationSpeed * 0.02;
    }
  });

  return (
    <group ref={ringRef} rotation={[tilt, 0, 0]}>
      <line geometry={geometry}>
        <lineDashedMaterial
          ref={materialRef}
          color={color}
          transparent
          opacity={opacity}
          dashSize={dashPattern[0]}
          gapSize={dashPattern[1]}
          linewidth={1}
        />
      </line>
    </group>
  );
}

/**
 * Плавающие символы данных на орбите
 */
function FloatingSymbols({
  count = 30,
  radius = 3.2,
  color = '#00ffff',
  speed = 0.3,
  tilt = 0,
}) {
  const groupRef = useRef();
  const symbolsRef = useRef([]);

  // Генерируем позиции и символы
  const symbols = useMemo(() => {
    const items = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const char = DATA_SYMBOLS[Math.floor(Math.random() * DATA_SYMBOLS.length)];
      items.push({
        angle,
        char,
        offset: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
      });
    }
    return items;
  }, [count]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += speed * 0.01;
    }

    // Обновляем позиции символов
    symbolsRef.current.forEach((sprite, i) => {
      if (sprite) {
        const symbol = symbols[i];
        // Пульсация размера
        const scale = 0.08 + Math.sin(state.clock.elapsedTime * symbol.speed + symbol.offset) * 0.02;
        sprite.scale.set(scale, scale, scale);

        // Мерцание
        const flicker = Math.sin(state.clock.elapsedTime * 3 + symbol.offset) > 0.3 ? 1 : 0.3;
        if (sprite.material) {
          sprite.material.opacity = flicker;
        }
      }
    });
  });

  // Создаём canvas текстуру для каждого символа
  const createSymbolTexture = (char) => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, 64, 64);

    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  };

  return (
    <group ref={groupRef} rotation={[tilt, 0, 0]}>
      {symbols.map((symbol, i) => {
        const x = Math.cos(symbol.angle) * radius;
        const z = Math.sin(symbol.angle) * radius;
        const y = (Math.random() - 0.5) * 0.3;

        return (
          <sprite
            key={i}
            ref={(el) => (symbolsRef.current[i] = el)}
            position={[x, y, z]}
            scale={[0.1, 0.1, 0.1]}
          >
            <spriteMaterial
              map={createSymbolTexture(symbol.char)}
              transparent
              opacity={0.8}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        );
      })}
    </group>
  );
}

/**
 * Светящаяся дуга (сегмент кольца)
 */
function GlowingArc({
  radius = 3,
  startAngle = 0,
  endAngle = Math.PI / 2,
  color = '#00ffff',
  tilt = 0,
  rotationSpeed = 0.5,
}) {
  const arcRef = useRef();
  const materialRef = useRef();

  const geometry = useMemo(() => {
    const segments = 32;
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (i / segments) * (endAngle - startAngle);
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [radius, startAngle, endAngle]);

  useFrame((state) => {
    if (arcRef.current) {
      arcRef.current.rotation.y += rotationSpeed * 0.01;
    }
    if (materialRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.3 + 0.7;
      materialRef.current.opacity = pulse;
    }
  });

  return (
    <group ref={arcRef} rotation={[tilt, 0, 0]}>
      <line geometry={geometry}>
        <lineBasicMaterial
          ref={materialRef}
          color={color}
          transparent
          opacity={0.8}
          linewidth={2}
          blending={THREE.AdditiveBlending}
        />
      </line>
    </group>
  );
}

/**
 * Главный компонент - все голографические кольца
 */
export function HolographicRings({
  earthRadius = 2,
  primaryColor = '#00ffff',
  secondaryColor = '#ff00ff',
  tertiaryColor = '#ffff00',
}) {
  const groupRef = useRef();

  return (
    <group ref={groupRef}>
      {/* Основное кольцо - горизонтальное */}
      <DataRing
        radius={earthRadius + 0.8}
        color={primaryColor}
        rotationSpeed={0.3}
        tilt={Math.PI / 12}
        opacity={0.5}
        dashPattern={[0.15, 0.05]}
        pulseSpeed={1.5}
      />

      {/* Второе кольцо - наклонное */}
      <DataRing
        radius={earthRadius + 1.0}
        color={secondaryColor}
        rotationSpeed={-0.4}
        tilt={Math.PI / 4}
        opacity={0.4}
        dashPattern={[0.08, 0.08]}
        pulseSpeed={2}
      />

      {/* Третье кольцо - другой наклон */}
      <DataRing
        radius={earthRadius + 1.2}
        color={tertiaryColor}
        rotationSpeed={0.25}
        tilt={-Math.PI / 6}
        opacity={0.35}
        dashPattern={[0.2, 0.1]}
        pulseSpeed={1}
      />

      {/* Плавающие символы на первом кольце */}
      <FloatingSymbols
        count={25}
        radius={earthRadius + 0.85}
        color={primaryColor}
        speed={0.3}
        tilt={Math.PI / 12}
      />

      {/* Плавающие символы на втором кольце */}
      <FloatingSymbols
        count={20}
        radius={earthRadius + 1.05}
        color={secondaryColor}
        speed={-0.4}
        tilt={Math.PI / 4}
      />

      {/* Светящиеся дуги - акценты */}
      <GlowingArc
        radius={earthRadius + 0.75}
        startAngle={0}
        endAngle={Math.PI / 3}
        color={primaryColor}
        tilt={Math.PI / 12}
        rotationSpeed={0.6}
      />

      <GlowingArc
        radius={earthRadius + 0.95}
        startAngle={Math.PI}
        endAngle={Math.PI * 1.5}
        color={secondaryColor}
        tilt={Math.PI / 4}
        rotationSpeed={-0.5}
      />

      <GlowingArc
        radius={earthRadius + 1.15}
        startAngle={Math.PI / 2}
        endAngle={Math.PI}
        color={tertiaryColor}
        tilt={-Math.PI / 6}
        rotationSpeed={0.4}
      />
    </group>
  );
}

export default HolographicRings;
