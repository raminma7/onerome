"use client";
/**
 * Interactive product demo for the landing hero.
 * A tiny, self-running version of the app: swipe cards → mutual match → exclusive chat → loop.
 * Visitors can drag the cards or tap the buttons; the phone tilts in 3D with the pointer.
 */
import { Clock3, Heart, MapPin, SendHorizontal, Sparkles, X } from "lucide-react";
import {
  AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform, type PanInfo,
} from "motion/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Ring } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Scene = "colosseum" | "dome" | "pines" | "trevi";
type DemoProfile = { name: string; age: number; hood: string; score: number; tags: string[]; scene: Scene; sky: [string, string, string] };

const PROFILES: DemoProfile[] = [
  { name: "Giulia", age: 31, hood: "Monti", score: 92, tags: ["Arte", "Cinema", "Vino"], scene: "dome", sky: ["#ff9a8b", "#ff6a88", "#ffd29d"] },
  { name: "Marco", age: 33, hood: "Trastevere", score: 84, tags: ["Cucina", "Viaggi"], scene: "colosseum", sky: ["#7f7fd5", "#86a8e7", "#ffd1a1"] },
  { name: "Sofia", age: 29, hood: "Pigneto", score: 78, tags: ["Musica", "Foto"], scene: "pines", sky: ["#a18cd1", "#fbc2eb", "#ffb067"] },
  { name: "Luca", age: 35, hood: "Prati", score: 88, tags: ["Storia", "Opera"], scene: "trevi", sky: ["#f6d365", "#fda085", "#e0384b"] },
];

/** Stylised Roman skylines (pure SVG, no photos of people). */
function Skyline({ scene }: { scene: Scene }) {
  return (
    <svg viewBox="0 0 300 220" className="absolute inset-x-0 bottom-0 w-full" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id={`g-${scene}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a0f18" stopOpacity=".55" />
          <stop offset="1" stopColor="#14080b" stopOpacity=".95" />
        </linearGradient>
      </defs>
      <g fill={`url(#g-${scene})`}>
        {scene === "colosseum" && (
          <>
            <path d="M20 220V120c0-22 260-22 260 0v100z" />
            <g fill="#ffffff" opacity=".13">
              {Array.from({ length: 9 }, (_, i) => (
                <g key={i}>
                  <path d={`M${36 + i * 27} 220v-34a10 10 0 0 1 20 0v34z`} />
                  <path d={`M${36 + i * 27} 172v-24a10 10 0 0 1 20 0v24z`} />
                </g>
              ))}
            </g>
          </>
        )}
        {scene === "dome" && (
          <>
            <path d="M0 220v-50h40v-14h18v14h22v-40c0-34 30-62 70-66V56h6v8c40 4 70 32 70 66v40h22v-26h16v26h36v50z" />
            <rect x="148" y="38" width="10" height="22" rx="3" />
            <circle cx="153" cy="34" r="5" />
          </>
        )}
        {scene === "pines" && (
          <>
            <path d="M0 196h300v24H0z" />
            <ellipse cx="80" cy="120" rx="70" ry="22" />
            <rect x="76" y="120" width="8" height="80" />
            <ellipse cx="220" cy="140" rx="56" ry="18" />
            <rect x="216" y="140" width="7" height="60" />
            <path d="M110 196v-30h16v-12h10v12h16v30z" />
          </>
        )}
        {scene === "trevi" && (
          <>
            <path d="M10 220V110h280v110z" />
            <path d="M0 110h300v-12H0z" />
            <g fill="#ffffff" opacity=".12">
              {[40, 90, 190, 240].map((x) => <rect key={x} x={x} y="120" width="14" height="100" />)}
              <path d="M130 220v-60a20 20 0 0 1 40 0v60z" />
            </g>
          </>
        )}
      </g>
      {/* stars */}
      <g fill="#fff" opacity=".7">
        <circle cx="40" cy="30" r="1.2" /><circle cx="250" cy="22" r="1" /><circle cx="200" cy="60" r=".9" /><circle cx="90" cy="70" r="1" />
      </g>
    </svg>
  );
}

function CardArt({ p }: { p: DemoProfile }) {
  return (
    <div className="absolute inset-0" style={{ background: `radial-gradient(70% 55% at 25% 15%, ${p.sky[1]} 0%, transparent 70%), radial-gradient(60% 50% at 85% 35%, ${p.sky[2]} 0%, transparent 70%), linear-gradient(180deg, ${p.sky[0]} 0%, #6b1d34 100%)` }}>
      <div className="absolute right-8 top-20 size-24 rounded-full bg-[radial-gradient(circle,#fff9_0%,#fff0_70%)]" />
      <Skyline scene={p.scene} />
    </div>
  );
}

function SwipeCard({ p, onSwipe, interactive }: { p: DemoProfile; onSwipe: (dir: "like" | "pass") => void; interactive: boolean }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-16, 16]);
  const likeOpacity = useTransform(x, [15, 80], [0, 1]);
  const passOpacity = useTransform(x, [-80, -15], [1, 0]);

  const fling = useCallback(
    async (dir: "like" | "pass") => {
      await animate(x, dir === "like" ? 360 : -360, { duration: 0.35, ease: [0.22, 1, 0.36, 1] });
      onSwipe(dir);
    },
    [onSwipe, x],
  );

  // Expose imperative fling through a custom event so buttons and autoplay can trigger it.
  useEffect(() => {
    const handler = (e: Event) => fling((e as CustomEvent<"like" | "pass">).detail);
    window.addEventListener("onerome-demo-swipe", handler);
    return () => window.removeEventListener("onerome-demo-swipe", handler);
  }, [fling]);

  return (
    <motion.div
      style={{ x, rotate }}
      drag={interactive ? "x" : false}
      dragElastic={0.8}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={(_: unknown, info: PanInfo) => {
        if (info.offset.x > 70) fling("like");
        else if (info.offset.x < -70) fling("pass");
      }}
      initial={{ scale: 0.92, y: 14, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
      className="absolute inset-0 cursor-grab overflow-hidden rounded-[1.6rem] shadow-[0_20px_40px_-15px_rgb(0_0_0/0.5)] active:cursor-grabbing"
    >
      <CardArt p={p} />
      <div className="absolute inset-x-3 top-2.5 flex gap-1">
        {[0, 1, 2].map((i) => <span key={i} className={cn("h-[3px] flex-1 rounded-full", i ? "bg-white/35" : "bg-white")} />)}
      </div>
      <div className="glass-dark absolute right-2.5 top-5 flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2 text-[11px] font-bold text-white">
        <Ring value={p.score} size={24} stroke={2.8} track="rgb(255 255 255 / 0.2)"><Sparkles className="size-2.5 text-apricot" /></Ring>
        {p.score}%
      </div>
      <motion.span style={{ opacity: likeOpacity }} className="absolute left-4 top-12 -rotate-12 rounded-lg border-[3px] border-[#4ade80] px-2 text-lg font-black tracking-wider text-[#4ade80]">LIKE</motion.span>
      <motion.span style={{ opacity: passOpacity }} className="absolute right-4 top-12 rotate-12 rounded-lg border-[3px] border-white px-2 text-lg font-black tracking-wider text-white">NOPE</motion.span>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-4 pt-16 text-white">
        <p className="text-[1.65rem] font-bold leading-none tracking-tight">{p.name} <span className="text-base font-light">{p.age}</span></p>
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-white/80"><MapPin className="size-3" /> {p.hood}, Roma</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {p.tags.map((t) => <span key={t} className="glass-dark rounded-full px-2 py-0.5 text-[10px] font-medium">{t}</span>)}
        </div>
      </div>
    </motion.div>
  );
}

const HEART_BURST = Array.from({ length: 14 }, (_, i) => ({ id: i, x: (Math.cos((i / 14) * Math.PI * 2) * 110) | 0, y: (Math.sin((i / 14) * Math.PI * 2) * 140) | 0, s: 0.6 + (i % 3) * 0.25 }));

export function HeroPhone() {
  const t = useTranslations("landing");
  const reduce = useReducedMotion();
  const [stage, setStage] = useState<"deck" | "match" | "chat">("deck");
  const [index, setIndex] = useState(0);
  const [chatStep, setChatStep] = useState(0);
  const [touched, setTouched] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  // 3D tilt following the pointer
  const rx = useSpring(0, { stiffness: 120, damping: 14 });
  const ry = useSpring(0, { stiffness: 120, damping: 14 });
  const px = useSpring(0, { stiffness: 80, damping: 16 });
  const py = useSpring(0, { stiffness: 80, damping: 16 });
  const floatX = useTransform(px, (v) => v * -18);
  const floatY = useTransform(py, (v) => v * -18);
  const floatX2 = useTransform(px, (v) => v * 26);
  const floatY2 = useTransform(py, (v) => v * 26);
  function onPointerMove(e: React.PointerEvent) {
    if (reduce || e.pointerType !== "mouse" || !wrap.current) return;
    const r = wrap.current.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    ry.set(nx * 16);
    rx.set(-ny * 12);
    px.set(nx);
    py.set(ny);
  }
  function onPointerLeave() {
    rx.set(0); ry.set(0); px.set(0); py.set(0);
  }

  const current = PROFILES[index % PROFILES.length];
  const next = PROFILES[(index + 1) % PROFILES.length];
  const isMatchCard = current.name === "Giulia";

  const onSwipe = useCallback(
    (dir: "like" | "pass") => {
      if (dir === "like" && PROFILES[index % PROFILES.length].name === "Giulia") {
        setStage("match");
      } else {
        setIndex((i) => i + 1);
      }
    },
    [index],
  );

  // Autoplay story: pass a couple of cards, like Giulia, match, chat, loop.
  useEffect(() => {
    if (reduce) return;
    let timer: ReturnType<typeof setTimeout>;
    if (stage === "deck") {
      timer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent("onerome-demo-swipe", { detail: isMatchCard ? "like" : "pass" }));
      }, touched ? 4200 : 2300);
    } else if (stage === "match") {
      timer = setTimeout(() => { setStage("chat"); setChatStep(0); }, 2600);
    } else if (chatStep < 5) {
      timer = setTimeout(() => setChatStep((s) => s + 1), [900, 1300, 1600, 1300, 1700][chatStep]);
    } else {
      timer = setTimeout(() => { setStage("deck"); setIndex((i) => i + 1); }, 3200);
    }
    return () => clearTimeout(timer);
  }, [stage, chatStep, isMatchCard, touched, reduce, index]);

  const tap = (dir: "like" | "pass") => {
    setTouched(true);
    window.dispatchEvent(new CustomEvent("onerome-demo-swipe", { detail: dir }));
  };

  return (
    <div ref={wrap} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} className="relative mx-auto w-[270px] select-none [perspective:1200px] sm:w-[310px]">
      <div className="bg-brand pointer-events-none absolute -inset-12 rounded-full opacity-45 blur-3xl" />

      <motion.div style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }} className="relative">
        {/* Phone */}
        <div className="relative rounded-[3rem] bg-gradient-to-b from-[#3a2a2e] to-[#120c0d] p-[10px] shadow-[0_50px_100px_-30px_rgb(0_0_0/0.75),inset_0_0_0_1.5px_rgb(255_255_255/0.12)]">
          <span className="absolute -left-[3px] top-28 h-14 w-[3px] rounded-l bg-[#2a1d20]" />
          <span className="absolute -right-[3px] top-36 h-20 w-[3px] rounded-r bg-[#2a1d20]" />
          <div className="relative h-[540px] overflow-hidden rounded-[2.4rem] bg-ivory text-ink sm:h-[600px]">
            {/* status bar */}
            <div className="relative z-30 flex items-center justify-between px-6 pt-3 text-[11px] font-semibold text-ink">
              <span>9:41</span>
              <span className="absolute left-1/2 top-2 h-[22px] w-[86px] -translate-x-1/2 rounded-full bg-black" />
              <span className="flex items-center gap-1"><span className="h-2 w-3.5 rounded-[3px] border border-ink/70" /></span>
            </div>

            <AnimatePresence mode="wait">
              {stage !== "chat" ? (
                <motion.div key="deck" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="absolute inset-0 pt-9">
                  <div className="flex items-center justify-between px-4 pb-2">
                    <span className="text-xl font-bold tracking-tight">Scopri</span>
                    <span className="bg-brand squircle flex size-7 items-center justify-center text-white"><Heart className="size-3.5" fill="currentColor" /></span>
                  </div>
                  <div className="absolute inset-x-3 bottom-[5.5rem] top-[4.6rem]">
                    <div className="absolute inset-0 translate-y-2.5 scale-[0.94] overflow-hidden rounded-[1.6rem] opacity-60"><CardArt p={next} /></div>
                    <SwipeCard key={index} p={current} onSwipe={onSwipe} interactive={stage === "deck"} />
                  </div>
                  <div className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-4">
                    <button type="button" onClick={() => tap("pass")} aria-label="Pass"
                      className="flex size-12 items-center justify-center rounded-full bg-white text-ink-soft shadow-lift transition active:scale-90"><X className="size-5" strokeWidth={2.6} /></button>
                    <button type="button" onClick={() => tap("like")} aria-label="Like"
                      className={cn("bg-brand flex size-[3.6rem] items-center justify-center rounded-full text-white shadow-glow transition active:scale-90", isMatchCard && stage === "deck" && "animate-heartbeat")}>
                      <Heart className="size-6" fill="currentColor" />
                    </button>
                    <span className="flex size-12 items-center justify-center rounded-full bg-white text-ink-soft shadow-lift"><Sparkles className="size-5 text-coral" /></span>
                  </div>

                  {/* Match overlay */}
                  <AnimatePresence>
                    {stage === "match" && (
                      <motion.div key="match" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="bg-night absolute inset-0 z-40 flex flex-col items-center justify-center text-white">
                        {HEART_BURST.map((h) => (
                          <motion.span key={h.id} initial={{ x: 0, y: 0, scale: 0, opacity: 1 }} animate={{ x: h.x, y: h.y, scale: h.s, opacity: 0 }}
                            transition={{ duration: 1.4, ease: "easeOut", delay: 0.15 }} className="absolute text-rose">
                            <Heart className="size-6" fill="currentColor" />
                          </motion.span>
                        ))}
                        <div className="relative flex h-40 w-56 items-center justify-center">
                          <motion.div initial={{ x: -60, rotate: -20, opacity: 0 }} animate={{ x: -34, rotate: -10, opacity: 1 }} transition={{ type: "spring", bounce: 0.4 }}
                            className="absolute h-36 w-24 overflow-hidden rounded-2xl ring-[3px] ring-white"><CardArt p={PROFILES[2]} /></motion.div>
                          <motion.div initial={{ x: 60, rotate: 20, opacity: 0 }} animate={{ x: 34, rotate: 10, opacity: 1 }} transition={{ type: "spring", bounce: 0.4 }}
                            className="absolute h-36 w-24 overflow-hidden rounded-2xl ring-[3px] ring-white"><CardArt p={PROFILES[0]} /></motion.div>
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.35, type: "spring", bounce: 0.6 }}
                            className="bg-brand absolute top-[7.5rem] z-10 flex size-12 items-center justify-center rounded-full shadow-glow ring-4 ring-night"><Heart className="size-5" fill="currentColor" /></motion.span>
                        </div>
                        <motion.p initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="text-brand-light mt-8 text-4xl font-bold tracking-tight">{t("mockMatch")}</motion.p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div key="chat" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="absolute inset-0 flex flex-col pt-9">
                  <div className="glass flex items-center gap-2.5 border-x-0 border-t-0 px-3 pb-2.5 pt-1">
                    <span className="bg-brand rounded-full p-[2px]"><span className="relative block size-9 overflow-hidden rounded-full ring-2 ring-white"><CardArt p={PROFILES[0]} /></span></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold leading-tight">Giulia</p>
                      <p className="flex items-center gap-1 text-[10px] font-medium text-coral"><span className="size-1.5 animate-pulse rounded-full bg-coral" />{t("mockOnline")}</p>
                    </div>
                    <Ring value={96} size={34} stroke={3}><span className="text-[9px] font-bold">72h</span></Ring>
                  </div>
                  <div className="bg-ambient flex flex-1 flex-col justify-end gap-2 px-3 pb-3">
                    <div className="mx-auto mb-auto mt-4 flex flex-col items-center gap-2 text-center">
                      <span className="bg-brand flex size-11 items-center justify-center rounded-full text-white shadow-glow"><Heart className="size-5" fill="currentColor" /></span>
                      <p className="text-[13px] font-bold">{t("mockMatch")}</p>
                      <p className="glass rounded-full px-3 py-1 text-[10px] font-semibold text-muted">{t("mockOnline")} · 72h</p>
                    </div>
                    <AnimatePresence>
                      {chatStep >= 1 && <Bubble key="m1" mine>{t("mockMessage1")}</Bubble>}
                      {chatStep === 2 && <Typing key="t1" label={t("mockTyping")} />}
                      {chatStep >= 3 && <Bubble key="m2">{t("mockMessage2")}</Bubble>}
                      {chatStep >= 4 && <Bubble key="m3" mine>{t("mockMessage3")}</Bubble>}
                      {chatStep >= 5 && (
                        <motion.div key="date" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.5 }}
                          className="bg-night mx-auto mt-1 flex items-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-semibold text-white shadow-lift">
                          <span>📍</span> First Date · Monti · 18:00
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="glass flex items-center gap-2 border-x-0 border-b-0 px-3 pb-5 pt-2.5">
                    <span className="flex-1 rounded-full bg-ink/[0.05] px-3 py-2 text-[11px] text-muted">…</span>
                    <span className="bg-brand flex size-8 items-center justify-center rounded-full text-white"><SendHorizontal className="size-3.5" /></span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <span className="absolute bottom-1.5 left-1/2 z-50 h-1 w-24 -translate-x-1/2 rounded-full bg-ink/80" />
          </div>
        </div>
      </motion.div>

      {/* Floating fragments with parallax */}
      <motion.div style={{ x: floatX, y: floatY }} className="pointer-events-none absolute -left-[9.5rem] top-28 hidden xl:block">
        <div className="glass flex animate-float items-center gap-2.5 rounded-2xl px-3 py-2.5 shadow-lift [--r:-6deg]">
          <Ring value={92} size={40} stroke={4}><Sparkles className="size-4 text-coral" /></Ring>
          <div className="leading-tight"><p className="text-sm font-bold text-ink">92%</p><p className="text-[10px] text-muted">Arte · Cinema · Vino</p></div>
        </div>
      </motion.div>
      <motion.div style={{ x: floatX2, y: floatY2 }} className="pointer-events-none absolute -right-[7.5rem] top-[55%] hidden xl:block">
        <div className="glass flex animate-float items-center gap-2.5 rounded-2xl px-3 py-2.5 shadow-lift [--r:5deg] [animation-delay:1.2s]">
          <span className="bg-brand flex size-9 items-center justify-center rounded-xl text-white"><Clock3 className="size-4" /></span>
          <div className="leading-tight"><p className="text-sm font-bold text-ink">72h</p><p className="text-[10px] text-muted">1 : 1</p></div>
        </div>
      </motion.div>
      <motion.div style={{ x: floatX, y: floatY2 }} className="pointer-events-none absolute -left-[8.5rem] bottom-28 hidden xl:block">
        <div className="bg-brand flex animate-float items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold text-white shadow-glow [--r:4deg] [animation-delay:2s]">
          <Heart className="size-3.5" fill="currentColor" /> {t("mockMatch")}
        </div>
      </motion.div>

      <p className="mt-6 text-center text-xs font-medium text-white/50">{t("heroHint")}</p>
    </div>
  );
}

function Bubble({ children, mine }: { children: React.ReactNode; mine?: boolean }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", bounce: 0.35, duration: 0.45 }}
      className={cn("max-w-[82%] rounded-[1.1rem] px-3 py-2 text-[12.5px] leading-snug", mine ? "bg-brand ml-auto rounded-br-md text-white" : "rounded-bl-md bg-white text-ink shadow-soft")}
    >
      {children}
    </motion.div>
  );
}

function Typing({ label }: { label: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }} className="flex items-center gap-2" aria-label={label}>
      <span className="flex gap-1 rounded-[1.1rem] rounded-bl-md bg-white px-3 py-2.5 shadow-soft">
        {[0, 1, 2].map((i) => (
          <motion.span key={i} className="size-1.5 rounded-full bg-muted" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />
        ))}
      </span>
    </motion.div>
  );
}
