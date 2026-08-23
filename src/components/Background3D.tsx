import React, { useEffect, useRef } from "react";

interface Background3DProps {
  reducedMotion?: boolean;
}

interface Node3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  color: string;
}

interface Polyhedron3D {
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  vRotX: number;
  vRotY: number;
  size: number;
  vertices: { x: number; y: number; z: number }[];
  edges: [number, number][];
}

export default function Background3D({ reducedMotion = false }: Background3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Mouse tracking for 3D parallax tilt
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX - width / 2) / (width / 2);
      targetMouseY = (e.clientY - height / 2) / (height / 2);
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Initialize 3D Nodes (Floating Particles in 3D Space)
    const nodeCount = Math.min(70, Math.floor((width * height) / 18000));
    const nodes: Node3D[] = [];

    const emeraldColors = [
      "rgba(52, 211, 153, ", // emerald-400
      "rgba(16, 185, 129, ", // emerald-500
      "rgba(6, 182, 212, ", // cyan-500
      "rgba(110, 231, 183, ", // emerald-300
    ];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: (Math.random() - 0.5) * 1400,
        y: (Math.random() - 0.5) * 1000,
        z: Math.random() * 1000 - 500,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        vz: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2.2 + 1.2,
        color: emeraldColors[Math.floor(Math.random() * emeraldColors.length)],
      });
    }

    // Helper: Build a 3D Icosahedron
    const createIcosahedron = (
      size: number,
    ): { vertices: { x: number; y: number; z: number }[]; edges: [number, number][] } => {
      const t = (1.0 + Math.sqrt(5.0)) / 2.0;
      const vRaw = [
        [-1, t, 0],
        [1, t, 0],
        [-1, -t, 0],
        [1, -t, 0],
        [0, -1, t],
        [0, 1, t],
        [0, -1, -t],
        [0, 1, -t],
        [t, 0, -1],
        [t, 0, 1],
        [-t, 0, -1],
        [-t, 0, 1],
      ];

      const vertices = vRaw.map(([x, y, z]) => {
        const len = Math.sqrt(x * x + y * y + z * z);
        return {
          x: (x / len) * size,
          y: (y / len) * size,
          z: (z / len) * size,
        };
      });

      const edges: [number, number][] = [
        [0, 11],
        [0, 5],
        [0, 1],
        [0, 7],
        [0, 10],
        [1, 5],
        [1, 7],
        [1, 8],
        [1, 9],
        [2, 11],
        [2, 10],
        [2, 4],
        [2, 3],
        [3, 9],
        [3, 4],
        [3, 8],
        [4, 5],
        [4, 9],
        [4, 11],
        [5, 11],
        [6, 7],
        [6, 8],
        [6, 10],
        [6, 2],
        [6, 3],
        [7, 8],
        [7, 10],
        [8, 9],
        [9, 3],
        [10, 11],
      ];

      return { vertices, edges };
    };

    // Initialize 3D Floating Polyhedrons
    const polyhedrons: Polyhedron3D[] = [
      {
        x: -width * 0.35,
        y: -height * 0.2,
        z: 100,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        vRotX: 0.004,
        vRotY: 0.006,
        size: 90,
        ...createIcosahedron(90),
      },
      {
        x: width * 0.35,
        y: height * 0.25,
        z: 200,
        rotX: 0.5,
        rotY: 0.2,
        rotZ: 0.1,
        vRotX: -0.003,
        vRotY: 0.005,
        size: 70,
        ...createIcosahedron(70),
      },
    ];

    // Global 3D rotation angles
    let globalAngleY = 0;
    let globalAngleX = 0;
    const fov = 450; // Perspective Focal Length

    const render = () => {
      // Smooth mouse interpolation
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      const speedMultiplier = reducedMotion ? 0.1 : 1.0;
      globalAngleY += 0.001 * speedMultiplier;
      globalAngleX = mouseY * 0.15;

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      // Render 3D Floating Polyhedrons
      polyhedrons.forEach((poly) => {
        if (!reducedMotion) {
          poly.rotX += poly.vRotX;
          poly.rotY += poly.vRotY;
        }

        const cosY = Math.cos(poly.rotY);
        const sinY = Math.sin(poly.rotY);
        const cosX = Math.cos(poly.rotX);
        const sinX = Math.sin(poly.rotX);

        // Transform vertices
        const projected = poly.vertices.map((v) => {
          // Local 3D rotation
          const x1 = v.x * cosY - v.z * sinY;
          const z1 = v.z * cosY + v.x * sinY;
          const y1 = v.y * cosX - z1 * sinX;
          const z2 = z1 * cosX + v.y * sinX;

          // World position + Mouse Parallax
          const wx = x1 + poly.x + mouseX * 40;
          const wy = y1 + poly.y + mouseY * 40;
          const wz = z2 + poly.z;

          // Perspective Projection
          const scale = fov / (fov + wz + 500);
          return {
            px: cx + wx * scale,
            py: cy + wy * scale,
            scale,
            alpha: Math.max(0.1, Math.min(0.6, scale * 0.5)),
          };
        });

        // Draw wireframe edges with glowing gradient
        ctx.lineWidth = 1.2;
        poly.edges.forEach(([i1, i2]) => {
          const p1 = projected[i1];
          const p2 = projected[i2];
          if (!p1 || !p2) return;

          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);
          ctx.strokeStyle = `rgba(52, 211, 153, ${Math.min(p1.alpha, p2.alpha) * 0.4})`;
          ctx.shadowColor = "rgba(16, 185, 129, 0.5)";
          ctx.shadowBlur = 8;
          ctx.stroke();
          ctx.shadowBlur = 0;
        });
      });

      // Update & Render 3D Particle Nodes
      const projectedNodes: { px: number; py: number; scale: number; node: Node3D; alpha: number }[] = [];

      const cosGY = Math.cos(globalAngleY + mouseX * 0.2);
      const sinGY = Math.sin(globalAngleY + mouseX * 0.2);
      const cosGX = Math.cos(globalAngleX);
      const sinGX = Math.sin(globalAngleX);

      nodes.forEach((node) => {
        if (!reducedMotion) {
          node.x += node.vx;
          node.y += node.vy;
          node.z += node.vz;

          // Boundary bouncing in 3D box
          if (Math.abs(node.x) > 700) node.vx *= -1;
          if (Math.abs(node.y) > 500) node.vy *= -1;
          if (Math.abs(node.z) > 500) node.vz *= -1;
        }

        // Apply global 3D scene rotation
        const rx1 = node.x * cosGY - node.z * sinGY;
        const rz1 = node.z * cosGY + node.x * sinGY;
        const ry1 = node.y * cosGX - rz1 * sinGX;
        const rz2 = rz1 * cosGX + node.y * sinGX;

        const scale = fov / (fov + rz2 + 400);
        const px = cx + rx1 * scale;
        const py = cy + ry1 * scale;

        const alpha = Math.max(0.1, Math.min(0.85, (rz2 + 500) / 1000));
        projectedNodes.push({ px, py, scale, node, alpha });
      });

      // Draw 3D Connection Lines between nearby nodes
      ctx.lineWidth = 0.75;
      for (let i = 0; i < projectedNodes.length; i++) {
        for (let j = i + 1; j < projectedNodes.length; j++) {
          const n1 = projectedNodes[i];
          const n2 = projectedNodes[j];
          const dx = n1.px - n2.px;
          const dy = n1.py - n2.py;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            const lineAlpha = (1 - dist / 130) * 0.25 * Math.min(n1.alpha, n2.alpha);
            ctx.beginPath();
            ctx.moveTo(n1.px, n1.py);
            ctx.lineTo(n2.px, n2.py);
            ctx.strokeStyle = `rgba(52, 211, 153, ${lineAlpha})`;
            ctx.stroke();
          }
        }
      }

      // Draw 3D Particle Points
      projectedNodes.forEach(({ px, py, scale, node, alpha }) => {
        const r = Math.max(0.8, node.radius * scale);
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = `${node.color}${alpha.toFixed(2)})`;
        ctx.shadowColor = "rgba(52, 211, 153, 0.8)";
        ctx.shadowBlur = scale > 1 ? 10 : 4;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0 transition-opacity duration-1000"
      aria-hidden="true"
    />
  );
}
