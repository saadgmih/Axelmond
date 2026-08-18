import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { RotateCw, Sparkles } from "lucide-react";

interface Interactive3DLogoProps {
  className?: string;
  size?: number;
  reducedMotion?: boolean;
}

export default function Interactive3DLogo({
  className = "",
  size = 140,
  reducedMotion = false,
}: Interactive3DLogoProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);

  // Interaction & physics state refs
  const stateRef = useRef({
    isDragging: false,
    prevX: 0,
    prevY: 0,
    velX: 0,
    velY: 0,
    rotX: 0.1,
    rotY: 0,
    rotZ: 0,
    targetParallaxX: 0,
    targetParallaxY: 0,
    currentParallaxX: 0,
    currentParallaxY: 0,
    idleTime: 0,
    resetting: false,
  });

  // Function to smoothly reset the rotation to front view
  const handleResetRotation = useCallback(() => {
    const s = stateRef.current;
    s.resetting = true;
    s.velX = 0;
    s.velY = 0;
    setTimeout(() => {
      s.resetting = false;
    }, 600);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Check WebGL availability
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      setWebglSupported(false);
      return;
    }

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(size, size);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 4.2);

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xd1fae5, 1.2);
    scene.add(ambientLight);

    const dirLightTop = new THREE.DirectionalLight(0xffffff, 2.6);
    dirLightTop.position.set(3, 4, 4);
    scene.add(dirLightTop);

    const dirLightEmerald = new THREE.DirectionalLight(0x10b981, 3.2);
    dirLightEmerald.position.set(-4, -2, -3);
    scene.add(dirLightEmerald);

    const pointLightCyan = new THREE.PointLight(0x06b6d4, 3.5, 8);
    pointLightCyan.position.set(2, -2, 2);
    scene.add(pointLightCyan);

    const pointLightEmerald = new THREE.PointLight(0x34d399, 4.0, 8);
    pointLightEmerald.position.set(-2, 2, 2);
    scene.add(pointLightEmerald);

    // 3. 3D Root Group (contains everything for manipulation)
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 4. Medallion Geometry & Materials
    const radius = 1.15;
    const thickness = 0.22;
    const segments = 64;

    // Load Logo Texture
    const textureLoader = new THREE.TextureLoader();
    const logoTexture = textureLoader.load("/performance-logo-003a24a4-192.png", (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
    });

    // Medallion Side Material (Glossy Emerald/Titanium)
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x064e3b,
      roughness: 0.18,
      metalness: 0.9,
      emissive: 0x059669,
      emissiveIntensity: 0.22,
    });

    // Medallion Front/Back Material with Logo Texture
    const faceMaterial = new THREE.MeshStandardMaterial({
      map: logoTexture,
      transparent: true,
      roughness: 0.15,
      metalness: 0.4,
      emissive: 0x10b981,
      emissiveIntensity: 0.18,
    });

    // Materials array: [side, top (front face), bottom (back face)]
    const materials = [rimMaterial, faceMaterial, faceMaterial];

    const cylinderGeo = new THREE.CylinderGeometry(radius, radius, thickness, segments);
    // Orient cylinder so circular face faces Z axis (front)
    cylinderGeo.rotateX(Math.PI / 2);

    const medallionMesh = new THREE.Mesh(cylinderGeo, materials);
    rootGroup.add(medallionMesh);

    // Beveled Glow Edge Ring
    const torusGeo = new THREE.TorusGeometry(radius * 1.01, 0.035, 16, 64);
    const torusMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x34d399,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.9,
    });
    const edgeRing = new THREE.Mesh(torusGeo, torusMat);
    rootGroup.add(edgeRing);

    // 5. Gyro Orbital Rings
    const orbitalRing1Geo = new THREE.TorusGeometry(radius * 1.35, 0.015, 12, 64);
    const orbitalRing1Mat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.55,
    });
    const orbitalRing1 = new THREE.Mesh(orbitalRing1Geo, orbitalRing1Mat);
    orbitalRing1.rotation.x = Math.PI / 3;
    rootGroup.add(orbitalRing1);

    const orbitalRing2Geo = new THREE.TorusGeometry(radius * 1.5, 0.012, 12, 64);
    const orbitalRing2Mat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.4,
    });
    const orbitalRing2 = new THREE.Mesh(orbitalRing2Geo, orbitalRing2Mat);
    orbitalRing2.rotation.y = Math.PI / 4;
    orbitalRing2.rotation.x = -Math.PI / 6;
    rootGroup.add(orbitalRing2);

    // 6. Floating Energy Spark Particles
    const particleCount = 28;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleAngles = new Float32Array(particleCount);
    const particleSpeeds = new Float32Array(particleCount);
    const particleRadii = new Float32Array(particleCount);
    const particleYOffsets = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particleAngles[i] = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      particleSpeeds[i] = 0.01 + Math.random() * 0.015;
      particleRadii[i] = radius * 1.25 + Math.random() * 0.55;
      particleYOffsets[i] = (Math.random() - 0.5) * 0.8;

      particlePositions[i * 3] = Math.cos(particleAngles[i]) * particleRadii[i];
      particlePositions[i * 3 + 1] = particleYOffsets[i];
      particlePositions[i * 3 + 2] = Math.sin(particleAngles[i]) * particleRadii[i];
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

    // Particle Material
    const particleMat = new THREE.PointsMaterial({
      color: 0x6ee7b7,
      size: 0.06,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    rootGroup.add(particles);

    // 7. Interaction Handlers
    const state = stateRef.current;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      state.isDragging = true;
      setHasInteracted(true);
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      state.prevX = clientX;
      state.prevY = clientY;
      state.velX = 0;
      state.velY = 0;
      state.resetting = false;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      if (state.isDragging) {
        const dx = clientX - state.prevX;
        const dy = clientY - state.prevY;

        state.velY = dx * 0.009;
        state.velX = dy * 0.009;

        state.rotY += state.velY;
        state.rotX += state.velX;

        state.prevX = clientX;
        state.prevY = clientY;
        state.idleTime = 0;
      } else {
        // Hover parallax
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        state.targetParallaxX = ((clientX - centerX) / (rect.width / 2)) * 0.35;
        state.targetParallaxY = ((clientY - centerY) / (rect.height / 2)) * 0.35;
      }
    };

    const onPointerUp = () => {
      state.isDragging = false;
    };

    const onMouseEnter = () => {
      setIsHovered(true);
    };

    const onMouseLeave = () => {
      setIsHovered(false);
      state.isDragging = false;
      state.targetParallaxX = 0;
      state.targetParallaxY = 0;
    };

    // Attach DOM events to container
    container.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);

    container.addEventListener("touchstart", onPointerDown, { passive: true });
    window.addEventListener("touchmove", onPointerMove, { passive: true });
    window.addEventListener("touchend", onPointerUp);

    container.addEventListener("mouseenter", onMouseEnter);
    container.addEventListener("mouseleave", onMouseLeave);

    // 8. Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsedTime = clock.getElapsedTime();

      // Smooth parallax interpolation
      state.currentParallaxX += (state.targetParallaxX - state.currentParallaxX) * 0.1;
      state.currentParallaxY += (state.targetParallaxY - state.currentParallaxY) * 0.1;

      if (state.resetting) {
        // Smooth return to front
        state.rotX += (0.1 - state.rotX) * 0.15;
        state.rotY += (0 - state.rotY) * 0.15;
        state.rotZ += (0 - state.rotZ) * 0.15;
      } else if (!state.isDragging) {
        // Apply inertia friction
        state.rotY += state.velY;
        state.rotX += state.velX;

        state.velX *= 0.94;
        state.velY *= 0.94;

        // Auto-idle floating rotation
        if (Math.abs(state.velX) < 0.0005 && Math.abs(state.velY) < 0.0005) {
          state.idleTime += delta;
          if (!reducedMotion) {
            state.rotY += 0.008;
          }
        }
      }

      // Apply rotations to root group
      rootGroup.rotation.x = state.rotX + state.currentParallaxY;
      rootGroup.rotation.y = state.rotY + state.currentParallaxX;
      rootGroup.rotation.z = state.rotZ;

      // Gentle floating bobbing
      if (!reducedMotion) {
        rootGroup.position.y = Math.sin(elapsedTime * 1.8) * 0.08;
      }

      // Rotate orbital rings
      if (!reducedMotion) {
        orbitalRing1.rotation.z += 0.012;
        orbitalRing2.rotation.z -= 0.009;
      }

      // Animate Particles
      const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        if (!reducedMotion) {
          particleAngles[i] += particleSpeeds[i];
        }
        posArray[i * 3] = Math.cos(particleAngles[i]) * particleRadii[i];
        posArray[i * 3 + 1] =
          particleYOffsets[i] + Math.sin(elapsedTime * 2 + i) * 0.08;
        posArray[i * 3 + 2] = Math.sin(particleAngles[i]) * particleRadii[i];
      }
      posAttr.needsUpdate = true;

      // Orbiting light effect
      pointLightEmerald.position.x = Math.sin(elapsedTime * 1.5) * 2.5;
      pointLightEmerald.position.y = Math.cos(elapsedTime * 1.5) * 2.5;
      pointLightCyan.position.x = -Math.sin(elapsedTime * 1.2) * 2.8;
      pointLightCyan.position.z = Math.cos(elapsedTime * 1.2) * 2.8;

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animate();

    // 9. Cleanup
    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("mouseup", onPointerUp);
      container.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("touchend", onPointerUp);
      container.removeEventListener("mouseenter", onMouseEnter);
      container.removeEventListener("mouseleave", onMouseLeave);

      renderer.dispose();
      cylinderGeo.dispose();
      torusGeo.dispose();
      orbitalRing1Geo.dispose();
      orbitalRing2Geo.dispose();
      particleGeo.dispose();
      rimMaterial.dispose();
      faceMaterial.dispose();
      torusMat.dispose();
      orbitalRing1Mat.dispose();
      orbitalRing2Mat.dispose();
      particleMat.dispose();
      logoTexture.dispose();
    };
  }, [size, reducedMotion]);

  if (!webglSupported) {
    // Elegant CSS 3D fallback if WebGL is unavailable
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <img
          src="/assets/performance-logo-003a24a4-192.png"
          alt="Performance Académique"
          className="w-24 h-24 object-contain select-none animate-pulse"
          width={192}
          height={192}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex flex-col items-center justify-center select-none touch-none cursor-grab active:cursor-grabbing group ${className}`}
      style={{ width: size, height: size }}
      title="Cliquez et glissez pour faire pivoter le logo en 3D"
      onDoubleClick={handleResetRotation}
      role="img"
      aria-label="Logo 3D interactif - Faites glisser pour tourner"
    >
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="w-full h-full block filter drop-shadow-[0_0_25px_rgba(52,211,153,0.4)] transition-transform duration-300 group-hover:scale-105"
      />

      {/* Interactive Micro-hint / Action badge */}
      <div
        className={`absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-emerald-500/40 text-[9px] font-bold text-emerald-300 shadow-lg shadow-emerald-950/60 backdrop-blur-md transition-all duration-300 pointer-events-none whitespace-nowrap ${
          isHovered || !hasInteracted
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-1"
        }`}
      >
        <Sparkles className="w-2.5 h-2.5 text-emerald-400 animate-spin" style={{ animationDuration: "6s" }} />
        <span>3D interactif • Tournez-moi</span>
      </div>

      {/* Recenter Button on Hover */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleResetRotation();
        }}
        className="absolute top-0 right-0 p-1 rounded-full bg-slate-900/80 border border-slate-700/80 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all opacity-0 group-hover:opacity-100 shadow-md scale-90 hover:scale-100"
        title="Recentrer le logo"
        aria-label="Recentrer la rotation du logo 3D"
      >
        <RotateCw className="w-3 h-3" />
      </button>
    </div>
  );
}
