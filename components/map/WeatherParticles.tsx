'use client';
import { useEffect, useRef } from 'react';

interface WeatherParticlesProps {
  precipMm: number;
  conditionCode: number;
  windKph: number;
  windDeg: number;
  isDay: 0 | 1;
}

function isSnow(code: number): boolean {
  if (code >= 600 && code <= 699) return true;
  return [1066,1114,1117,1210,1213,1216,1219,1222,1225,1255,1258,1261,1264,1279,1282].includes(code);
}

function isRain(code: number): boolean {
  if (code >= 300 && code <= 599) return true;
  return [1063,1072,1150,1153,1168,1171,1180,1183,1186,1189,1192,1195,1198,1201,1240,1243,1246].includes(code);
}

interface Drop { x: number; y: number; speed: number; len: number; alpha: number; }
interface WindStreak {
  x: number; y: number;
  trail: { x: number; y: number }[];
  age: number; maxAge: number; speed: number; alpha: number;
}

export default function WeatherParticles({ precipMm, conditionCode, windKph, windDeg, isDay }: WeatherParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const dropsRef  = useRef<Drop[]>([]);
  const streaksRef = useRef<WindStreak[]>([]);

  const snow = isSnow(conditionCode);
  const rain = isRain(conditionCode);
  // Show precipitation if condition code indicates it (API precipMm can lag behind)
  const showPrecip = rain || snow;
  // Show wind flow particles when wind >= 15 kph
  const showWind = windKph >= 15;
  // Respect user preference to reduce motion
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const active = (showPrecip || showWind) && !prefersReduced;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ── Wind direction vector (where wind BLOWS TO, canvas Y-down) ──
    // windDeg=0 → from North → blows South (+y) → vx=0, vy=+1
    // windDeg=90 → from East → blows West (-x) → vx=-1, vy=0
    // windDeg=270 → from West → blows East (+x) → vx=+1, vy=0
    const rad  = (windDeg * Math.PI) / 180;
    const wvx  = -Math.sin(rad);
    const wvy  =  Math.cos(rad);
    const wNorm = Math.min(windKph, 120) / 120; // 0..1

    let w = canvas.offsetWidth;
    let h = canvas.offsetHeight;
    let frameCount = 0;

    // ── Precipitation drops ──
    function initDrops() {
      const intensity = Math.min(Math.max(precipMm, 0.3), 30) / 30;
      const n = snow
        ? Math.round(60 + intensity * 120)
        : Math.round(150 + intensity * 300);
      dropsRef.current = Array.from({ length: n }, () => makeDropScatter());
    }

    function makeDrop(scatter: boolean): Drop {
      const intensity = Math.min(Math.max(precipMm, 0.3), 30) / 30;
      return {
        x: Math.random() * (w + 100) - 50,
        y: scatter ? Math.random() * h : -15,
        speed: snow
          ? 1.5 + Math.random() * 1.5
          : 7 + intensity * 10 + Math.random() * 5,
        len: snow
          ? 3 + Math.random() * 2.5
          : 14 + intensity * 18 + Math.random() * 10,
        alpha: 0.25 + Math.random() * 0.45,
      };
    }
    const makeDropScatter = () => makeDrop(true);
    const makeDropTop     = () => makeDrop(false);

    // ── Wind streaks ──
    function initStreaks() {
      const n = Math.round(55 + wNorm * 110);
      streaksRef.current = Array.from({ length: n }, () => {
        const s = makeStreak();
        s.age = Math.floor(Math.random() * s.maxAge); // stagger ages on init
        return s;
      });
    }

    function makeStreak(): WindStreak {
      const spd = (2.5 + wNorm * 5.5) * (0.65 + Math.random() * 0.7);
      // Weighted spawn on upwind edge, proportional to wind components
      const absX = Math.abs(wvx), absY = Math.abs(wvy);
      const spawnOnVertical = Math.random() < absX / (absX + absY + 1e-6);
      let sx: number, sy: number;
      if (spawnOnVertical) {
        sx = wvx > 0 ? -20 : w + 20;
        sy = Math.random() * h;
      } else {
        sx = Math.random() * w;
        sy = wvy > 0 ? -20 : h + 20;
      }
      return {
        x: sx, y: sy,
        trail: [],
        age: 0,
        maxAge: 70 + Math.floor(Math.random() * 80),
        speed: spd,
        alpha: 0.13 + Math.random() * 0.22,
      };
    }

    function resize() {
      w = canvas!.width  = canvas!.offsetWidth;
      h = canvas!.height = canvas!.offsetHeight;
      if (showPrecip) initDrops();
      if (showWind)   initStreaks();
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function frame() {
      if (!ctx) return;
      frameCount++;
      ctx.clearRect(0, 0, w, h);

      // ── Wind streaks (flowing trail particles) ──
      if (showWind) {
        for (const s of streaksRef.current) {
          s.trail.push({ x: s.x, y: s.y });
          const MAX_TRAIL = 28;
          if (s.trail.length > MAX_TRAIL) s.trail.shift();

          s.x += wvx * s.speed;
          s.y += wvy * s.speed;
          s.age++;

          const oob = s.x < -70 || s.x > w + 70 || s.y < -70 || s.y > h + 70;
          if (s.age > s.maxAge || oob) {
            Object.assign(s, makeStreak());
            continue;
          }

          if (s.trail.length < 3) continue;

          // Fade-in for first 20% of life, fade-out for last 20%
          const lifeRatio = Math.min(s.age / (s.maxAge * 0.2), 1, (s.maxAge - s.age) / (s.maxAge * 0.2));

          for (let i = 1; i < s.trail.length; i++) {
            const t = i / s.trail.length; // 0=tail, 1=head
            ctx.strokeStyle = `rgba(180,220,255,${t * s.alpha * lifeRatio})`;
            ctx.lineWidth = 0.5 + t * wNorm * 1.3;
            ctx.beginPath();
            ctx.moveTo(s.trail[i - 1].x, s.trail[i - 1].y);
            ctx.lineTo(s.trail[i].x, s.trail[i].y);
            ctx.stroke();
          }
        }
      }

      // ── Rain drops ──
      if (showPrecip && !snow) {
        ctx.save();
        ctx.lineCap = 'round';
        for (const d of dropsRef.current) {
          // Physics: vertical fall + horizontal wind push
          const vx = wvx * wNorm * 3.5;
          const vy = d.speed;
          const mag = Math.sqrt(vx * vx + vy * vy) || 1;
          // Draw streak from head back along velocity
          const a = d.alpha * (isDay ? 0.55 : 0.42);
          ctx.strokeStyle = `rgba(175,215,255,${a})`;
          ctx.lineWidth = 0.7 + wNorm * 0.45;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - (vx / mag) * d.len, d.y - (vy / mag) * d.len);
          ctx.stroke();

          d.x += vx;
          d.y += vy;
          if (d.y > h + 20 || d.x < -80 || d.x > w + 80) {
            Object.assign(d, makeDropTop());
          }
        }
        ctx.restore();
      }

      // ── Snowflakes ──
      if (showPrecip && snow) {
        ctx.save();
        for (const d of dropsRef.current) {
          ctx.globalAlpha = d.alpha;
          ctx.shadowBlur  = 5;
          ctx.shadowColor = 'rgba(200,230,255,0.8)';
          ctx.fillStyle   = `rgba(225,240,255,${d.alpha})`;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.len * 0.45, 0, Math.PI * 2);
          ctx.fill();

          // Natural sway + wind drift
          d.x += wvx * wNorm * 1.2 + Math.sin(d.y * 0.025 + frameCount * 0.05) * 0.35;
          d.y += d.speed;
          if (d.y > h + 10 || d.x < -50 || d.x > w + 50) {
            Object.assign(d, makeDropTop());
          }
        }
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(frame);
    }

    animRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [active, precipMm, conditionCode, windKph, windDeg, isDay, snow, showPrecip, showWind]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 450,
      }}
      aria-hidden="true"
    />
  );
}
