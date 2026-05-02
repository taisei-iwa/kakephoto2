"use client";
import Image from "@/components/VImage";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { LangSwitcher } from "../_components/LangSwitcher";

function FadeInOnScroll({
  children,
  className,
  delay = 0,
}: {
  children?: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

function SpMessageBlock({
  msg,
  index,
}: {
  msg: { img: string; alt: string; lines: string[] };
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <div ref={ref} className="mb-[40px]">
      <motion.div
        className="relative w-full h-[220px] overflow-hidden mb-[20px]"
        initial={{ opacity: 0, y: 32, scale: 1.04 }}
        animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <Image
          src={msg.img}
          alt={msg.alt}
          fill
          className={index === 2 ? "object-cover scale-[1.15] object-[center_35%]" : "object-cover"}
        />
      </motion.div>
      <motion.div
        className="text-[#710b26] text-[13px] tracking-[1px] leading-[26px] text-center"
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.06, delayChildren: 0.25 } },
        }}
      >
        {msg.lines.map((line, j) => (
          <motion.p
            key={j}
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
            }}
          >
            {line || " "}
          </motion.p>
        ))}
      </motion.div>
    </div>
  );
}

const vwPx = (n: number) => `calc(100vw * ${n} / 1920)`;
const vhPx = (n: number) => `calc(100vh * ${n} / 1080)`;

const MESSAGES_EN = [
  {
    img: "/images/message-photo1.jpg",
    alt: "Kireji fabric",
    lines: [
      "“Carrying Tradition, Weaving the Future”",
      "",
      "Skill refined on the front lines",
      "of cultural heritage restoration —",
      "work that protects history.",
      "",
      "A craft no machine can replicate;",
      "each piece breathes with the artisan,",
      "fully handmade.",
      "",
      "In the soft, living texture only handwork brings,",
      "our artisans deliver their pride.",
    ],
  },
  {
    img: "/images/message-photo2.jpg",
    alt: "A space with a hanging scroll",
    lines: [
      "“Crossing the Threshold, Settling into Daily Life”",
      "",
      "We gently overturn the old idea",
      "that hanging scrolls feel formal",
      "or out of reach.",
      "",
      "A presence that fits today’s living rooms",
      "with surprising ease.",
      "",
      "Easier to handle, closer to you.",
      "Adding quiet color",
      "to the everyday scenes of your life.",
    ],
  },
  {
    img: "/images/message-photo3.jpg",
    alt: "A scroll holding family memories",
    lines: [
      "“Framing Memory, Offering the Heart”",
      "",
      "A family’s smile,",
      "a moment you want to keep close.",
      "",
      "Memories from your digital library,",
      "given form —",
      "one scroll, made for one world.",
      "",
      "A gift for someone who has cared for you,",
      "or for a special anniversary.",
      "",
      "Feelings words cannot quite carry,",
      "entrusted to a lasting form.",
    ],
  },
];

function MessageTextBlock({
  msg,
  index,
  onActive,
  holdVh,
}: {
  msg: (typeof MESSAGES_EN)[number];
  index: number;
  onActive: (i: number) => void;
  holdVh: number;
}) {
  const stickyRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stickyRef, { margin: "-40% 0px -40% 0px" });

  useEffect(() => {
    if (inView) onActive(index);
  }, [inView, index, onActive]);

  return (
    <div className="relative w-full" style={{ height: `${holdVh}vh` }}>
      <div
        ref={stickyRef}
        className="sticky top-0 w-full flex items-center"
        style={{
          height: "100vh",
          color: "#710b26",
          fontSize: vwPx(18),
          letterSpacing: vwPx(2),
          lineHeight: vwPx(40),
          fontFamily: "Zen Old Mincho",
        }}
      >
        <div>
          {msg.lines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function StickyMessageSectionEn() {
  const [activeIndex, setActiveIndex] = useState(0);
  const holds = [200, 200, 200];
  const totalVh = holds.reduce((a, b) => a + b, 0);

  return (
    <section className="relative w-full bg-white" style={{ height: `${totalVh}vh` }}>
      <div className="sticky top-0 w-full overflow-hidden" style={{ height: "100vh" }}>
        <div className="absolute inset-0 overflow-hidden">
          <Image src="/images/message-bg.jpg" alt="" fill className="object-cover opacity-40" />
        </div>

        <h2
          className="absolute z-20"
          style={{
            left: vwPx(99),
            top: vhPx(60),
            color: "#710b26",
            fontSize: vwPx(40),
            letterSpacing: vwPx(16),
          }}
        >
          Message
        </h2>

        <div
          className="absolute overflow-hidden"
          style={{ left: 0, top: vhPx(220), width: vwPx(960), height: vwPx(648) }}
        >
          {MESSAGES_EN.map((m, i) => (
            <motion.div
              key={i}
              className="absolute inset-0"
              initial={false}
              animate={{ opacity: activeIndex === i ? 1 : 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <Image src={m.img} alt={m.alt} fill className="object-cover" priority={i === 0} />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="absolute top-0 z-20" style={{ left: vwPx(1110), width: vwPx(560), height: "100%" }}>
        {MESSAGES_EN.map((m, i) => (
          <MessageTextBlock key={i} msg={m} index={i} onActive={setActiveIndex} holdVh={holds[i]} />
        ))}
      </div>
    </section>
  );
}

function SpBackToTop() {
  const [visible, setVisible] = useState(false);
  const idleTimer = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setVisible(false);
      if (idleTimer.current !== null) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => {
        if (window.scrollY > 400) setVisible(true);
      }, 400);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (idleTimer.current !== null) window.clearTimeout(idleTimer.current);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <motion.button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      initial={{ opacity: 0, y: 16 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="fixed bottom-[24px] right-[16px] z-50 w-[44px] h-[44px] rounded-full bg-[#710b26]/80 backdrop-blur-sm flex items-center justify-center shadow-md"
      style={{ pointerEvents: visible ? "auto" : "none" }}
    >
      <span className="block w-[10px] h-[10px] border-t-[2px] border-l-[2px] border-white rotate-45 translate-y-[2px]" />
    </motion.button>
  );
}

function SpPage() {
  const [isChrome, setIsChrome] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent;
    setIsChrome(/CriOS|Chrome/i.test(ua) && !/Edg|OPR|EdgiOS/i.test(ua));
  }, []);
  const taglineBottom = isChrome ? 64 : 28;

  return (
    <main className="w-[375px] overflow-hidden" style={{ fontFamily: "Zen Old Mincho, serif" }}>
      <SpBackToTop />
      {/* ===== FV ===== */}
      <section data-sp-theme="dark" className="relative w-[375px] h-[680px] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/sp-fv-bg.jpg"
            alt="KAKEPHOTO"
            fill
            className="object-cover scale-[1.25]"
            style={{ objectPosition: isChrome ? "center calc(50% - 9px)" : "center" }}
            priority
          />
        </div>
        <div className="absolute top-[20px] left-[16px] z-10">
          <Image src="/images/footer-logo.svg" alt="KAKEPHOTO" width={72} height={112} />
        </div>
        <div className="absolute top-[2px] right-[6px] z-20">
          <LangSwitcher lang="en" variant="sp" />
        </div>
        <div className="absolute right-[16px] text-right text-white z-10" style={{ bottom: `${taglineBottom}px` }}>
          <p className="text-[13px] tracking-[2px] font-medium">FULL CUSTOM MADE</p>
          <p className="text-[10px] tracking-[1.5px] mt-1">Each piece is made exclusively for one photograph.</p>
        </div>
      </section>

      {/* ===== Concept ===== */}
      <section data-sp-theme="dark" className="relative w-[375px] bg-[#710b26] text-white pt-[120px] pb-[380px] overflow-hidden">
        <FadeInOnScroll className="absolute top-[100px] right-0 w-[140px] h-[180px] overflow-hidden" delay={0}>
          <Image src="/images/concept-photo1.jpg" alt="" fill className="object-cover" />
        </FadeInOnScroll>
        <FadeInOnScroll className="absolute top-[280px] left-0 w-[120px] h-[160px] overflow-hidden" delay={0.15}>
          <Image src="/images/concept-photo2.jpg" alt="" fill className="object-cover" />
        </FadeInOnScroll>

        <div className="relative z-10 px-[20px]">
          <h2 className="text-[24px] tracking-[8px] mb-[60px] text-center">Concept</h2>

          <div className="text-center mb-[40px]">
            <p className="text-[20px] tracking-[4px] leading-[34px]">
              Wrap your photograph<br />in Japanese beauty.
            </p>
          </div>

          <div className="text-center text-[13px] tracking-[2px] leading-[32px] mb-[50px]">
            <p>Our scrolls are not made from a catalog.</p>
            <p>&nbsp;</p>
            <p>Each one is built entirely for your photograph,</p>
            <p>entirely for your space.</p>
            <p>&nbsp;</p>
            <p>Hanging scroll &times; Photograph</p>
            <p>Two expressions born in different eras,</p>
            <p>brought into a single form.</p>
            <p>&nbsp;</p>
            <p>The blank space, the &ldquo;ma,&rdquo;</p>
            <p>the culture of seasonal display the scroll holds &mdash;</p>
            <p>and the photograph&rsquo;s power to capture a single moment.</p>
            <p>&nbsp;</p>
            <p>Honoring both,</p>
            <p>we shape a new form of art.</p>
          </div>
        </div>

        <FadeInOnScroll className="absolute bottom-[200px] left-[30px] w-[130px] h-[160px] overflow-hidden" delay={0}>
          <Image src="/images/concept-photo3.jpg" alt="" fill className="object-cover" />
        </FadeInOnScroll>
        <FadeInOnScroll className="absolute bottom-[100px] right-[20px] w-[150px] h-[170px] overflow-hidden" delay={0.15}>
          <Image src="/images/concept-photo.jpg" alt="" fill className="object-cover" />
        </FadeInOnScroll>
      </section>

      {/* ===== Transition ===== */}
      <section data-sp-theme="light" className="relative w-[375px] h-[300px] overflow-hidden">
        <Image src="/images/transition-bg.jpg" alt="" fill className="object-cover" />
        <div className="absolute top-0 left-0 w-full h-[30px] bg-[#D1C4B2] z-10" />
        <div className="absolute bottom-0 left-0 w-full h-[30px] bg-[#D1C4B2] z-10" />
        <div className="absolute top-[30px] left-0 w-[12px] h-[calc(100%-60px)] bg-[#D1C4B2] z-10" />
        <div className="absolute top-[30px] right-0 w-[12px] h-[calc(100%-60px)] bg-[#D1C4B2] z-10" />
      </section>

      {/* ===== Message ===== */}
      <section data-sp-theme="light" className="relative w-[375px] bg-white overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/images/message-bg.jpg" alt="" fill className="object-cover opacity-40" />
        </div>
        <div className="relative z-10 px-[20px] pt-[80px] pb-[50px]">
          <h2 className="text-[#710b26] text-[24px] tracking-[8px] mb-[80px] text-center">Message</h2>

          {MESSAGES_EN.map((msg, i) => (
            <SpMessageBlock key={i} msg={msg} index={i} />
          ))}
        </div>
      </section>

      {/* ===== Order ===== */}
      <section data-sp-theme="dark" className="relative w-[375px] bg-[#710b26] text-white px-[20px] py-[50px]">
        <h2 className="text-[24px] tracking-[8px] mb-[40px] text-center">Order</h2>
        <p className="text-[12px] tracking-[1px] leading-[24px] text-center mb-[30px]">
          Every scroll is made to order. Not only the photograph,<br />but the kireji fabric &mdash; its color, its texture &mdash;<br />and the balance of the whole composition.<br />We treasure the time spent imagining your space<br />and shaping each piece with you.
        </p>

        {/* Fully Custom Order */}
        <div className="bg-[#FFFFFB] text-[#710b26] rounded-sm overflow-hidden mb-[20px]">
          <div className="relative w-full h-[220px]">
            <Image src="/images/order-photo.jpg" alt="Fully Custom Order" fill className="object-cover" />
          </div>
          <div className="p-[16px]">
            <div className="mb-1">
              <h3 className="text-[18px] tracking-[3px]">Fully Custom Order</h3>
              <span className="text-[12px] tracking-[2px] text-[#323232]">Photo size FREE</span>
            </div>
            <div className="text-[12px] tracking-[1px] text-black leading-[24px] mb-2">
              <p>Height: 110&ndash;130cm / Width: 30cm+</p>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-[16px] tracking-[2px] text-black">From &yen;88,000</span>
              <span className="text-[11px] tracking-[1px] text-black">(tax &amp; shipping incl., Japan only)</span>
            </div>
            <p className="text-[12px] tracking-[1px] text-black leading-[22px]">
              Choose any print size from postcard to A3. No restrictions on kireji fabric or final form &mdash; every detail can be customized to your vision.
            </p>
          </div>
        </div>

        {/* Miyabi */}
        <div className="bg-[#FFFFFB] text-[#710b26] rounded-sm overflow-hidden mb-[20px]">
          <div className="relative w-full h-[220px]">
            <Image src="/images/order-photo-miyabi.jpg" alt="Miyabi course" fill className="object-cover" />
          </div>
          <div className="p-[16px]">
            <div className="mb-1">
              <h3 className="text-[18px] tracking-[3px]">Miyabi</h3>
              <span className="text-[12px] tracking-[2px] text-[#323232]">Photo size A4</span>
            </div>
            <div className="text-[12px] tracking-[1px] text-black leading-[24px] mb-2">
              <p>Height: 100&ndash;120cm / Width: 23cm+</p>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-[16px] tracking-[2px] text-black">&yen;46,000</span>
              <span className="text-[11px] tracking-[1px] text-black">(tax &amp; shipping incl., Japan only)</span>
            </div>
            <p className="text-[12px] tracking-[1px] text-black leading-[22px]">
              Your photograph enlarged and printed at A4. Choose your favorite combination from a curated lineup of kireji fabrics and forms.
            </p>
          </div>
        </div>

        {/* Kiwami */}
        <div className="bg-[#FFFFFB] text-[#710b26] rounded-sm overflow-hidden mb-[90px]">
          <div className="relative w-full h-[220px]">
            <Image src="/images/order-photo-kiwami.jpg" alt="Kiwami course" fill className="object-cover" />
          </div>
          <div className="p-[16px]">
            <div className="mb-1">
              <h3 className="text-[18px] tracking-[3px]">Kiwami</h3>
              <span className="text-[12px] tracking-[2px] text-[#323232]">Photo size A3</span>
            </div>
            <div className="text-[12px] tracking-[1px] text-black leading-[24px] mb-2">
              <p>Height: 110&ndash;130cm / Width: 30cm+</p>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-[16px] tracking-[2px] text-black">&yen;77,000</span>
              <span className="text-[11px] tracking-[1px] text-black">(tax &amp; shipping incl., Japan only)</span>
            </div>
            <p className="text-[12px] tracking-[1px] text-black leading-[22px]">
              Your photograph enlarged to a striking A3. Dynamic in size, yet rendered with vivid detail.
            </p>
          </div>
        </div>

        {/* Ordering process */}
        <h3 className="text-[18px] tracking-[3px] text-center underline mb-[24px]">How to Order</h3>
        <div className="mb-[60px]">
          {[
            { step: "Step 1", text: "Reach out via our official LINE or the contact form." },
            { step: "Step 2", text: "Our artisan will follow up to discuss the details." },
            { step: "Step 3", text: "We curate kireji fabric recommendations from your photograph." },
            { step: "Step 4", text: "Once you approve the fabric, we begin crafting." },
          ].map((item, i) => (
            <div key={i} className="border-b border-white/30 py-[12px]">
              <span className="text-[14px] tracking-[3px] block mb-1">{item.step}</span>
              <span className="text-[12px] tracking-[1px] leading-[22px]">{item.text}</span>
            </div>
          ))}
        </div>

        <p className="text-[10px] tracking-[0.5px] text-center leading-[18px] mb-[30px] -mt-[40px]">
          * Pricing varies with the fabric and specifications. We will tailor a comfortable proposal to your preferences and budget &mdash; please feel free to reach out.
        </p>

        {/* CTA */}
        <a href="https://line.me/R/ti/p/@447updgf" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 w-full h-[56px] bg-[#f7f7f7] text-[#710b26] text-[13px] tracking-[2px] mb-[12px]">
          Order via Official LINE
          <Image src="/images/line-icon.svg" alt="LINE" width={32} height={30} />
        </a>
        <Link href="/en/contact" className="flex items-center justify-center gap-2 w-full h-[56px] bg-[#f7f7f7] text-[#710b26] text-[13px] tracking-[2px] mb-[30px]">
          Order via Contact Form
          <span className="inline-block w-[24px] h-[1px] bg-[#710b26] relative">
            <span className="absolute right-0 top-1/2 -translate-y-1/2 border-r-[1.5px] border-t-[1.5px] border-[#710b26] w-[6px] h-[6px] rotate-45" />
          </span>
        </Link>

        {/* Gallery */}
        <div className="overflow-hidden -mx-[20px] mb-[30px]">
          <motion.div
            className="flex w-max"
            animate={{ x: [0, -1680] }}
            transition={{ duration: 70, ease: "linear", repeat: Infinity }}
          >
            {[...Array(20)].map((_, i) => (
              <div key={i} className="w-[160px] h-[120px] bg-[#d9d9d9] shrink-0 ml-[8px] overflow-hidden relative">
                <Image src={`/images/gallery${String((i % 10) + 1).padStart(2, "0")}.jpg`} alt="" fill className="object-cover" />
              </div>
            ))}
          </motion.div>
        </div>

        {/* Footer */}
        <footer className="text-white pt-[20px] flex flex-col items-center">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
            className="w-[60px] h-[94px] relative mb-[16px] cursor-pointer"
          >
            <Image src="/images/footer-logo.svg" alt="KAKEPHOTO" fill className="object-contain" />
          </button>
          <div className="flex items-center gap-[20px] mb-[16px]">
            <a href="https://www.instagram.com/kakephoto_art/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-[8px]">
              <Image src="/images/instagram-icon.svg" alt="Instagram" width={14} height={14} />
              <span className="text-[12px] tracking-[1px]">Instagram</span>
            </a>
            <a href="https://line.me/R/ti/p/@447updgf" target="_blank" rel="noopener noreferrer" className="flex items-center gap-[8px]">
              <Image src="/images/line-icon-white.svg" alt="LINE" width={15} height={14} />
              <span className="text-[12px] tracking-[1px]">LINE</span>
            </a>
          </div>
          <p className="text-[10px] tracking-[0.8px] mb-[8px]"><a href="/en/privacy-policy">Privacy Policy</a> | <a href="/en/cancel-policy">Shopping Guide</a></p>
          <p className="text-[9px] tracking-[0.8px]">©︎KAKEPHOTO All Rights Reserved.</p>
        </footer>
      </section>
    </main>
  );
}

export default function HomeEn() {
  return (
    <>
      <div className="vp-sp-only vp-sp-root">
        <SpPage />
      </div>
      <div className="vp-pc-only vp-pc-root">
        <main className="w-[1920px]">
          {/* ===== FV ===== */}
          <section className="relative w-[1920px] h-[1450px] overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <Image
                src="/images/fv-bg.jpg"
                alt="KAKEPHOTO main visual"
                width={2929}
                height={1953}
                className="absolute max-w-none"
                style={{ width: "152.55%", height: "134.68%", left: "-51.41%", top: "-33.59%" }}
                priority
                unoptimized
              />
            </div>
            <div className="absolute top-[60px] left-[42px] z-10">
              <Image src="/images/logo-horizontal.svg" alt="KAKEPHOTO" width={269} height={30} />
            </div>
            <div className="absolute top-[28px] right-[40px] z-20">
              <LangSwitcher lang="en" variant="pc" />
            </div>
            <div className="absolute top-[312px] left-[820px] z-10">
              <Image src="/images/logo-center.svg" alt="KAKEPHOTO" width={280} height={441} />
            </div>
            <p className="absolute top-[946px] right-[99px] text-right text-white text-[22px] tracking-[4.4px] font-medium z-10">
              FULL CUSTOM MADE
            </p>
            <p className="absolute top-[977px] right-[99px] text-right text-white text-[18px] tracking-[3.6px] z-10">
              Each piece is made exclusively for one photograph.
            </p>
          </section>

          {/* ===== Concept ===== */}
          <section className="relative w-[1920px] h-[1975px] bg-[#710b26] text-white overflow-hidden">
            <FadeInOnScroll className="absolute top-[168px] left-[1500px] w-[320px] h-[400px] overflow-hidden" delay={0}>
              <Image src="/images/concept-photo1.jpg" alt="" fill className="object-cover" />
            </FadeInOnScroll>
            <FadeInOnScroll className="absolute top-[568px] left-0 w-[429px] h-[350px] overflow-hidden" delay={0.15}>
              <Image src="/images/concept-photo2.jpg" alt="" fill className="object-cover" />
            </FadeInOnScroll>
            <FadeInOnScroll className="absolute top-[1391px] left-[172px] w-[352px] h-[364px] overflow-hidden" delay={0.3}>
              <Image src="/images/concept-photo3.jpg" alt="" fill className="object-cover" />
            </FadeInOnScroll>
            <FadeInOnScroll className="absolute top-[1143px] left-[1430px] w-[390px] h-[480px] overflow-hidden" delay={0.2}>
              <Image src="/images/concept-photo.jpg" alt="" fill className="object-cover" />
            </FadeInOnScroll>

            <h2 className="absolute top-[183px] left-[99px] text-[40px] tracking-[16px] text-white">
              Concept
            </h2>

            <div className="absolute top-[470px] left-[660px] w-[600px] text-center">
              <p className="text-[40px] tracking-[10px] leading-[64px]">
                Wrap your photograph<br />in Japanese beauty.
              </p>
            </div>

            <div className="absolute top-[981px] left-[655px] w-[613px] text-center text-[22px] tracking-[4.4px] leading-[50px]">
              <p>Our scrolls are not made from a catalog.</p>
              <p>&nbsp;</p>
              <p>Each one is built entirely for your photograph,</p>
              <p>entirely for your space.</p>
              <p>&nbsp;</p>
              <p>Hanging scroll &times; Photograph</p>
              <p>Two expressions born in different eras, brought into a single form.</p>
              <p>&nbsp;</p>
              <p>The blank space, the &ldquo;ma,&rdquo; the culture of seasonal display the scroll holds,</p>
              <p>and the photograph&rsquo;s power to capture a single moment.</p>
              <p>&nbsp;</p>
              <p>Honoring both,</p>
              <p>we shape a new form of art.</p>
            </div>
          </section>

          {/* ===== Transition ===== */}
          <section className="relative w-[1920px] h-[860px] overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <Image
                src="/images/transition-bg.jpg"
                alt=""
                width={1930}
                height={2894}
                className="absolute max-w-none"
                style={{ width: 1930, height: 2894, left: -10, top: -306 }}
                unoptimized
              />
            </div>
            <div className="absolute top-0 left-0 w-full h-[64px] bg-[#D1C4B2] z-10" />
            <div className="absolute bottom-0 left-0 w-full h-[64px] bg-[#D1C4B2] z-10" />
            <div className="absolute top-[64px] left-0 w-[26px] h-[calc(100%-128px)] bg-[#D1C4B2] z-10" />
            <div className="absolute top-[64px] right-0 w-[26px] h-[calc(100%-128px)] bg-[#D1C4B2] z-10" />
          </section>
        </main>
      </div>

      {/* ===== Message — Sticky Scroll ===== */}
      <div className="vp-pc-only">
        <StickyMessageSectionEn />
      </div>

      <div className="vp-pc-only vp-pc-root">
        <main className="w-[1920px]">
          {/* ===== Order + Footer ===== */}
          <section className="relative w-[1920px] h-[3298px] bg-[#710b26] text-white">
            <h2 className="absolute z-10 left-[99px] top-[118px] text-[40px] tracking-[16px]">Order</h2>
            <p className="absolute z-10 left-[523px] top-[308px] w-[875px] text-[18px] tracking-[2px] leading-[42px] text-center" style={{ fontFamily: "Zen Old Mincho" }}>
              Every scroll is made to order. Not only the photograph,<br />but the kireji fabric &mdash; its color, its texture &mdash; and the balance of the whole composition.<br />We treasure the time spent imagining your space,<br />shaping each piece together with you.
            </p>

            {/* Fully Custom Order */}
            <div className="absolute left-[99px] top-[579px] w-[1721px] h-[557px] bg-[#FFFFFB] text-[#710b26] rounded-sm overflow-hidden">
              <div className="absolute left-[54px] top-[61px] w-[650px] h-[430px] overflow-hidden">
                <Image src="/images/order-photo.jpg" alt="Fully Custom Order scroll" fill className="object-cover" />
              </div>
              <h3 className="absolute left-[801px] top-[88px] text-[28px] tracking-[5px] leading-[50px]">Fully Custom Order</h3>
              <span className="absolute left-[801px] top-[145px] text-[18px] tracking-[5px] text-[#323232] leading-[40px]">Photo size FREE</span>
              <div className="absolute left-[802px] top-[210px] text-[14px] tracking-[3px] text-black leading-[30px]">
                <p>Height: 110&ndash;130cm</p>
                <p>Width: 30cm+</p>
              </div>
              <span className="absolute left-[1500px] top-[200px] text-[18px] tracking-[3px] text-black leading-[40px]">From &yen;88,000</span>
              <span className="absolute left-[1500px] top-[235px] text-[14px] tracking-[1.5px] text-black leading-[30px]">(tax &amp; shipping incl., Japan only)</span>
              <p className="absolute left-[802px] top-[300px] w-[860px] text-[16px] tracking-[3px] text-black leading-[28px]">
                Choose any print size from postcard to A3. No restrictions on kireji fabric or final form &mdash; every detail can be customized to your vision.<br />Recommended for those who want their preferences realized without compromise.
              </p>
            </div>

            {/* Miyabi & Kiwami */}
            <div className="absolute left-[99px] top-[1175px] w-[1721px] h-[522px] bg-[#FFFFFB] text-[#710b26] rounded-sm overflow-hidden">
              <h3 className="absolute left-[54px] top-[54px] text-[28px] tracking-[5px] leading-[50px]">Miyabi</h3>
              <span className="absolute left-[54px] top-[110px] text-[18px] tracking-[5px] text-[#323232] leading-[40px]">Photo size A4</span>
              <div className="absolute left-[54px] top-[170px] w-[382px] h-[252px] overflow-hidden">
                <Image src="/images/order-photo-miyabi.jpg" alt="Miyabi course" fill className="object-cover" />
              </div>
              <p className="absolute left-[475px] top-[170px] w-[326px] text-[14px] tracking-[2px] text-black leading-[26px]">
                Your photograph enlarged and printed at A4. Choose your favorite combination from a curated lineup of kireji fabrics and forms, and we will shape your ideal finished image together.
              </p>
              <div className="absolute left-[54px] top-[440px] text-[14px] tracking-[3px] text-black leading-[28px]">
                <p>Height: 100&ndash;120cm</p>
                <p>Width: 23cm+</p>
              </div>
              <span className="absolute left-[327px] top-[435px] text-[18px] tracking-[3px] text-black leading-[30px]">&yen;46,000</span>
              <span className="absolute left-[327px] top-[465px] text-[14px] tracking-[1.5px] text-black leading-[30px]">(tax &amp; shipping incl., Japan only)</span>

              <h3 className="absolute left-[913px] top-[51px] text-[28px] tracking-[5px] leading-[50px]">Kiwami</h3>
              <span className="absolute left-[913px] top-[110px] text-[18px] tracking-[5px] text-[#323232] leading-[40px]">Photo size A3</span>
              <div className="absolute left-[913px] top-[170px] w-[382px] h-[252px] overflow-hidden">
                <Image src="/images/order-photo-kiwami.jpg" alt="Kiwami course" fill className="object-cover" />
              </div>
              <p className="absolute left-[1334px] top-[170px] w-[326px] text-[14px] tracking-[2px] text-black leading-[26px]">
                Your photograph enlarged to a striking A3. Dynamic in size yet rendered with vivid detail, so your treasured memories return with renewed presence. A scale that anchors the room &mdash; equally welcome at home and as a memento or celebration gift.
              </p>
              <div className="absolute left-[918px] top-[440px] text-[14px] tracking-[3px] text-black leading-[28px]">
                <p>Height: 110&ndash;130cm</p>
                <p>Width: 30cm+</p>
              </div>
              <span className="absolute left-[1176px] top-[435px] text-[18px] tracking-[3px] text-black leading-[30px]">&yen;77,000</span>
              <span className="absolute left-[1176px] top-[465px] text-[14px] tracking-[1.5px] text-black leading-[30px]">(tax &amp; shipping incl., Japan only)</span>
            </div>

            {/* Ordering process */}
            <div className="absolute left-[300px] top-[1899px] w-[1320px]">
              <h3 className="text-[28px] tracking-[7px] text-center underline mb-[60px]">How to Order</h3>
              <div>
                {[
                  { step: "Step 1", text: "Reach out via our official LINE or the contact form." },
                  { step: "Step 2", text: "Our artisan will follow up to discuss the details." },
                  { step: "Step 3", text: "We curate kireji fabric recommendations based on your photograph. Let us know if you have any color preferences at this stage." },
                  { step: "Step 4", text: "Once you have reviewed the actual fabrics, we begin crafting." },
                ].map((item, i) => (
                  <div key={i} className="border-b border-white/30 py-[20px] flex gap-[30px] items-baseline">
                    <span className="text-[22px] tracking-[6px] shrink-0 w-[160px]">{item.step}</span>
                    <span className="text-[18px] tracking-[2px]">{item.text}</span>
                  </div>
                ))}
              </div>
              <p className="mt-[30px] w-full text-center text-[14px] tracking-[1px]">
                * Pricing varies with the fabric and specifications. We will tailor a comfortable proposal to your preferences and budget &mdash; please feel free to reach out.
              </p>
            </div>

            {/* CTA Buttons */}
            <a
              href="https://line.me/R/ti/p/@447updgf"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute left-[300px] top-[2430px] flex items-center justify-center gap-4 w-[640px] h-[110px] bg-[#f7f7f7] border border-white text-[#710b26] text-[20px] tracking-[3px] hover:opacity-90 transition-opacity"
            >
              Order via KAKEPHOTO Official LINE
              <Image src="/images/line-icon.svg" alt="LINE" width={57} height={54} />
            </a>
            <Link
              href="/en/contact"
              className="absolute left-[980px] top-[2430px] flex items-center justify-center gap-4 w-[640px] h-[110px] bg-[#f7f7f7] border border-white text-[#710b26] text-[20px] tracking-[3px] hover:opacity-90 transition-opacity"
            >
              Order via Contact Form
              <span className="inline-block w-[41px] h-[1px] bg-[#710b26] relative ml-2">
                <span className="absolute right-0 top-1/2 -translate-y-1/2 border-r-[2px] border-t-[2px] border-[#710b26] w-[8px] h-[8px] rotate-45" />
              </span>
            </Link>

            {/* Gallery */}
            <div className="absolute left-0 top-[2729px] w-[1920px] overflow-hidden">
              <motion.div
                className="flex w-max"
                animate={{ x: [0, -3990] }}
                transition={{ duration: 90, ease: "linear", repeat: Infinity }}
              >
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="w-[380px] h-[280px] bg-[#d9d9d9] shrink-0 ml-[19px] overflow-hidden relative">
                    <Image src={`/images/gallery${String((i % 10) + 1).padStart(2, "0")}.jpg`} alt="" fill className="object-cover" />
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Footer */}
            <footer className="absolute left-[100px] top-[3081px] w-[1720px] h-[217px] text-white">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                aria-label="Back to top"
                className="absolute left-0 top-0 w-[110px] h-[173px] cursor-pointer hover:opacity-80 transition-opacity"
              >
                <Image src="/images/footer-logo.svg" alt="KAKEPHOTO" fill className="object-contain" />
              </button>

              <div className="absolute right-0 top-[33px] flex items-center gap-[32px]">
                <a href="https://www.instagram.com/kakephoto_art/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-[12px]">
                  <Image src="/images/instagram-icon.svg" alt="Instagram" width={18} height={18} />
                  <span className="text-[18px] tracking-[1.8px]">Instagram</span>
                </a>
                <a href="https://line.me/R/ti/p/@447updgf" target="_blank" rel="noopener noreferrer" className="flex items-center gap-[12px]">
                  <Image src="/images/line-icon-white.svg" alt="LINE" width={19} height={18} />
                  <span className="text-[18px] tracking-[1.8px]">LINE</span>
                </a>
              </div>

              <div className="absolute left-0 top-[195px] flex items-center gap-[20px] text-[14px] tracking-[1.4px]">
                <Link href="/en/privacy-policy" className="hover:opacity-80">Privacy Policy</Link>
                <span className="opacity-60">|</span>
                <Link href="/en/cancel-policy" className="hover:opacity-80">Shopping Guide</Link>
              </div>

              <p className="absolute left-[738px] top-[167px] text-[12px] tracking-[1.2px]">
                ©︎KAKEPHOTO All Rights Reserved.
              </p>
            </footer>
          </section>
        </main>
      </div>
    </>
  );
}
