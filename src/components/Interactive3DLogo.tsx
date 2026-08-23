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
    rotX: 0,
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
        precision: "highp",
        stencil: false,
        depth: true,
      });
    } catch {
      setWebglSupported(false);
      return;
    }

    // Ultra-High Resolution Rendering for Retina/4K & browser zoom clarity
    const updateResolution = () => {
      // Support up to 3.5x supersampling so zooming in remains crystal clear (4K quality)
      const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 2.5), 4);
      renderer.setPixelRatio(dpr);
      renderer.setSize(size, size, false);
    };

    updateResolution();
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 3.9);

    // 2. Dynamic Realistic Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const dirLightKey = new THREE.DirectionalLight(0xffffff, 3.2);
    dirLightKey.position.set(3, 4, 4);
    scene.add(dirLightKey);

    const dirLightRim = new THREE.DirectionalLight(0x34d399, 2.8);
    dirLightRim.position.set(-3, -3, 2.5);
    scene.add(dirLightRim);

    const pointLightEmerald = new THREE.PointLight(0x10b981, 4.0, 7);
    pointLightEmerald.position.set(1.6, 1.6, 1.6);
    scene.add(pointLightEmerald);

    const pointLightCyan = new THREE.PointLight(0x06b6d4, 3.5, 7);
    pointLightCyan.position.set(-1.6, -1.4, 1.6);
    scene.add(pointLightCyan);

    // 3. 3D Root Group (contains the volumetric logo)
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 4. Load Ultra-High Definition Logo Texture (1024x1024)
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const textureLoader = new THREE.TextureLoader();

    const configureHighResTexture = (tex: THREE.Texture) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = maxAnisotropy;
      tex.needsUpdate = true;
    };

    const logoTexture = textureLoader.load(
      "/performance-logo-symbol.png",
      (tex) => configureHighResTexture(tex),
      undefined,
      () => {
        // Fallback if 1024 is missing
        textureLoader.load("/performance-logo-003a24a4-192.png", (fallbackTex) => {
          configureHighResTexture(fallbackTex);
        });
      },
    );

    // Mirrored texture for the back face
    const backTexture = logoTexture.clone();
    backTexture.wrapS = THREE.RepeatWrapping;
    backTexture.repeat.x = -1;
    backTexture.offset.x = 1;

    // 5. High-Fidelity 3D Layered Extrusion (Volumetric Solid Feel)
    const sliceCount = 28;
    const depth = 0.18; // Physical 3D thickness
    const planeSize = 2.15;
    const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize, 1, 1);

    // Front Face (Crystal clear, ultra-sharp, anti-aliased alpha)
    const frontMat = new THREE.MeshStandardMaterial({
      map: logoTexture,
      transparent: true,
      alphaTest: 0.01,
      roughness: 0.12,
      metalness: 0.3,
      emissive: 0x10b981,
      emissiveIntensity: 0.06,
      side: THREE.FrontSide,
      depthWrite: true,
    });

    // Back Face
    const backMat = new THREE.MeshStandardMaterial({
      map: backTexture,
      transparent: true,
      alphaTest: 0.01,
      roughness: 0.12,
      metalness: 0.3,
      emissive: 0x10b981,
      emissiveIntensity: 0.06,
      side: THREE.BackSide,
      depthWrite: true,
    });

    // Metallic Emerald Extruded Edge Profile
    const edgeMat = new THREE.MeshStandardMaterial({
      map: logoTexture,
      transparent: true,
      alphaTest: 0.03,
      color: 0x047857,
      roughness: 0.22,
      metalness: 0.88,
      emissive: 0x065f46,
      emissiveIntensity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: true,
    });

    // Build the micro-slice extrusion stack
    const halfDepth = depth / 2;
    for (let i = 0; i < sliceCount; i++) {
      const zPos = -halfDepth + (i / (sliceCount - 1)) * depth;
      let mat: THREE.Material = edgeMat;

      if (i === sliceCount - 1) {
        mat = frontMat;
      } else if (i === 0) {
        mat = backMat;
      }

      const sliceMesh = new THREE.Mesh(planeGeo, mat);
      sliceMesh.position.z = zPos;
      rootGroup.add(sliceMesh);
    }

    // 6. Floating Spark Particles (High Quality Point Sprites)
    const particleCount = 24;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleAngles = new Float32Array(particleCount);
    const particleSpeeds = new Float32Array(particleCount);
    const particleRadii = new Float32Array(particleCount);
    const particleYOffsets = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particleAngles[i] = (i / particleCount) * Math.PI * 2;
      particleSpeeds[i] = 0.007 + Math.random() * 0.01;
      particleRadii[i] = 1.38 + Math.random() * 0.4;
      particleYOffsets[i] = (Math.random() - 0.5) * 0.8;

      particlePositions[i * 3] = Math.cos(particleAngles[i]) * particleRadii[i];
      particlePositions[i * 3 + 1] = particleYOffsets[i];
      particlePositions[i * 3 + 2] = Math.sin(particleAngles[i]) * particleRadii[i];
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x6ee7b7,
      size: 0.042,
      transparent: true,
      opacity: 0.8,
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

        state.velY = dx * 0.0075;
        state.velX = dy * 0.0075;

        state.rotY += state.velY;
        state.rotX += state.velX;

        state.prevX = clientX;
        state.prevY = clientY;
        state.idleTime = 0;
      } else {
        // Subtle hover parallax
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        state.targetParallaxX = ((clientX - centerX) / (rect.width / 2)) * 0.22;
        state.targetParallaxY = ((clientY - centerY) / (rect.height / 2)) * 0.22;
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

    // Attach DOM events
    container.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);

    container.addEventListener("touchstart", onPointerDown, { passive: true });
    window.addEventListener("touchmove", onPointerMove, { passive: true });
    window.addEventListener("touchend", onPointerUp);

    container.addEventListener("mouseenter", onMouseEnter);
    container.addEventListener("mouseleave", onMouseLeave);

    const onWindowResize = () => {
      updateResolution();
    };
    window.addEventListener("resize", onWindowResize);

    // 8. Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsedTime = clock.getElapsedTime();

      // Smooth parallax interpolation
      state.currentParallaxX += (state.targetParallaxX - state.currentParallaxX) * 0.08;
      state.currentParallaxY += (state.targetParallaxY - state.currentParallaxY) * 0.08;

      if (state.resetting) {
        // Smooth return to front
        state.rotX += (0 - state.rotX) * 0.15;
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
            state.rotY += 0.005;
          }
        }
      }

      // Apply rotations to root group
      rootGroup.rotation.x = state.rotX + state.currentParallaxY;
      rootGroup.rotation.y = state.rotY + state.currentParallaxX;
      rootGroup.rotation.z = state.rotZ;

      // Gentle floating bobbing
      if (!reducedMotion) {
        rootGroup.position.y = Math.sin(elapsedTime * 1.4) * 0.04;
      }

      // Animate Particles
      const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        if (!reducedMotion) {
          particleAngles[i] += particleSpeeds[i];
        }
        posArray[i * 3] = Math.cos(particleAngles[i]) * particleRadii[i];
        posArray[i * 3 + 1] = particleYOffsets[i] + Math.sin(elapsedTime * 1.5 + i) * 0.04;
        posArray[i * 3 + 2] = Math.sin(particleAngles[i]) * particleRadii[i];
      }
      posAttr.needsUpdate = true;

      // Orbiting specular point lights for rich reflections on 3D edges
      pointLightEmerald.position.x = Math.sin(elapsedTime * 1.1) * 2.1;
      pointLightEmerald.position.y = Math.cos(elapsedTime * 1.1) * 2.1;
      pointLightCyan.position.x = -Math.sin(elapsedTime * 0.85) * 2.3;
      pointLightCyan.position.z = Math.cos(elapsedTime * 0.85) * 2.3;

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
      window.removeEventListener("resize", onWindowResize);

      renderer.dispose();
      planeGeo.dispose();
      particleGeo.dispose();
      frontMat.dispose();
      backMat.dispose();
      edgeMat.dispose();
      particleMat.dispose();
      logoTexture.dispose();
      backTexture.dispose();
    };
  }, [size, reducedMotion]);

  if (!webglSupported) {
    // Accessible CSS fallback
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <img
          src="/performance-logo-symbol.png"
          alt="Performance Académique"
          className="w-24 h-24 object-contain select-none drop-shadow-[0_0_25px_rgba(52,211,153,0.4)]"
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
      {/* 3D WebGL Canvas with Ultra-HD Retina/4K sharp display */}
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="block filter drop-shadow-[0_0_28px_rgba(52,211,153,0.35)] transition-transform duration-300 group-hover:scale-105"
      />

      {/* Interactive Micro-hint / Action badge */}
      <div
        className={`absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-emerald-500/40 text-[9px] font-bold text-emerald-300 shadow-lg shadow-emerald-950/60 backdrop-blur-md transition-all duration-300 pointer-events-none whitespace-nowrap ${
          isHovered || !hasInteracted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
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
