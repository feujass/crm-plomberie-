"use client";

import { useEffect, useRef, useState } from "react";

type RoutePoint = { x: number; y: number; delay: number };

const BASE_W = 320;
const BASE_H = 600;

const DOTMAP_ROUTES: { start: RoutePoint; end: RoutePoint; color: string }[] = [
  { start: { x: 100, y: 150, delay: 0 }, end: { x: 200, y: 80, delay: 2 }, color: "#3b82f6" },
  { start: { x: 200, y: 80, delay: 2 }, end: { x: 260, y: 120, delay: 4 }, color: "#3b82f6" },
  { start: { x: 50, y: 50, delay: 1 }, end: { x: 150, y: 180, delay: 3 }, color: "#3b82f6" },
  { start: { x: 280, y: 60, delay: 0.5 }, end: { x: 180, y: 180, delay: 2.5 }, color: "#3b82f6" },
];

function scalePoint(p: RoutePoint, w: number, h: number): RoutePoint {
  return { x: (p.x / BASE_W) * w, y: (p.y / BASE_H) * h, delay: p.delay };
}

export function DotMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const generateDots = (width: number, height: number) => {
    const dots: { x: number; y: number; radius: number; opacity: number }[] = [];
    const gap = 12;
    const dotRadius = 1;

    for (let x = 0; x < width; x += gap) {
      for (let y = 0; y < height; y += gap) {
        const isInMapShape =
          (x < width * 0.25 && x > width * 0.05 && y < height * 0.4 && y > height * 0.1) ||
          (x < width * 0.25 && x > width * 0.15 && y < height * 0.8 && y > height * 0.4) ||
          (x < width * 0.45 && x > width * 0.3 && y < height * 0.35 && y > height * 0.15) ||
          (x < width * 0.5 && x > width * 0.35 && y < height * 0.65 && y > height * 0.35) ||
          (x < width * 0.7 && x > width * 0.45 && y < height * 0.5 && y > height * 0.1) ||
          (x < width * 0.8 && x > width * 0.65 && y < height * 0.8 && y > height * 0.6);

        if (isInMapShape && Math.random() > 0.3) {
          dots.push({ x, y, radius: dotRadius, opacity: Math.random() * 0.5 + 0.1 });
        }
      }
    }
    return dots;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
      canvas.width = width;
      canvas.height = height;
    });

    resizeObserver.observe(parent);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!dimensions.width || !dimensions.height) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const c = ctx;

    const dots = generateDots(dimensions.width, dimensions.height);
    const scaledRoutes = DOTMAP_ROUTES.map((route) => ({
      ...route,
      start: scalePoint(route.start, dimensions.width, dimensions.height),
      end: scalePoint(route.end, dimensions.width, dimensions.height),
    }));

    let animationFrameId = 0;
    let startTime = Date.now();

    function drawDots() {
      c.clearRect(0, 0, dimensions.width, dimensions.height);
      dots.forEach((dot) => {
        c.beginPath();
        c.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        c.fillStyle = `rgba(255, 255, 255, ${dot.opacity})`;
        c.fill();
      });
    }

    function drawRoutes() {
      const currentTime = (Date.now() - startTime) / 1000;

      scaledRoutes.forEach((route) => {
        const elapsed = currentTime - route.start.delay;
        if (elapsed <= 0) return;

        const duration = 3;
        const progress = Math.min(elapsed / duration, 1);

        const x = route.start.x + (route.end.x - route.start.x) * progress;
        const y = route.start.y + (route.end.y - route.start.y) * progress;

        c.beginPath();
        c.moveTo(route.start.x, route.start.y);
        c.lineTo(x, y);
        c.strokeStyle = route.color;
        c.lineWidth = 1.5;
        c.stroke();

        c.beginPath();
        c.arc(route.start.x, route.start.y, 3, 0, Math.PI * 2);
        c.fillStyle = route.color;
        c.fill();

        c.beginPath();
        c.arc(x, y, 3, 0, Math.PI * 2);
        c.fillStyle = "#60a5fa";
        c.fill();

        c.beginPath();
        c.arc(x, y, 6, 0, Math.PI * 2);
        c.fillStyle = "rgba(96, 165, 250, 0.3)";
        c.fill();

        if (progress === 1) {
          c.beginPath();
          c.arc(route.end.x, route.end.y, 3, 0, Math.PI * 2);
          c.fillStyle = route.color;
          c.fill();
        }
      });
    }

    function animate() {
      drawDots();
      drawRoutes();

      const currentTime = (Date.now() - startTime) / 1000;
      if (currentTime > 15) {
        startTime = Date.now();
      }

      animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions.width, dimensions.height]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
