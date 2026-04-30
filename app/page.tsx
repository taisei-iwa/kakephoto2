"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";

function FadeInOnScroll({ children, className, delay = 0 }: { children?: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.8, ease: "easeOut", delay }}
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
        transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
      >
        <Image
          src={msg.img}
          alt={msg.alt}
          fill
          className={index === 2 ? "object-cover scale-[1.15] object-[center_35%]" : "object-cover"}
        />
      </motion.div>
      <motion.div
        className="text-[#710b26] text-[13px] tracking-[2px] leading-[28px] text-center"
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
            {line || "\u00A0"}
          </motion.p>
        ))}
      </motion.div>
    </div>
  );
}

// Responsive pixel→vw helper: design baseline is 1920 wide, 1080 tall.
// Widths / font-sizes scale with vw; vertical positions inside the sticky
// (100vh) use vh so the layout fills the viewport on any aspect ratio.
const vwPx = (n: number) => `calc(100vw * ${n} / 1920)`;
const vhPx = (n: number) => `calc(100vh * ${n} / 1080)`;

const MESSAGES = [
  {
    img: "/images/message-photo1.jpg",
    alt: "掛け軸の裂地",
    lines: [
      "「伝統を継ぎ、未来を綴る」",
      "文化財修復という、歴史を守る現場で",
      "磨かれた確かな技術。",
      "機械では決して生み出せない、",
      "一点一点、呼吸を合わせるような",
      "完全ハンドメイド。",
      "手仕事ならではの柔らかな風合いに、",
      "職人の誇りを込めてお届けします。",
    ],
  },
  {
    img: "/images/message-photo2.jpg",
    alt: "掛け軸のある空間",
    lines: [
      "「敷居をまたぎ、日常に馴染む」",
      "「掛軸は少し格式が高い」というこれまでの",
      "常識を、私たちは軽やかにひっくり返します。",
      "現代のリビングに、",
      "驚くほど自然にフィットする佇まい。",
      "もっと扱いやすく、もっと身近に。",
      "あなたの何気ない日常の風景に、",
      "そっと彩りを添えます。",
    ],
  },
  {
    img: "/images/message-photo3.jpg",
    alt: "掛け軸と家族の思い出",
    lines: [
      "「記憶を飾り、心を贈る」",
      "家族の笑顔や、心に留めておきたい",
      "大切な瞬間。",
      "デジタルの中にある思い出を「形」にして、",
      "世界にひとつだけの掛軸へ。",
      "お世話になった方への贈り物や、",
      "特別な記念日にも。",
      "言葉では伝えきれない想いを、",
      "確かな形に託して。",
    ],
  },
];

// Right-column text block. Wrapper height controls how long this message
// "holds" in view: a 200vh wrapper with a 100vh sticky inner gives 100vh of
// scroll during which the text stays pinned at viewport center — the "read
// pause" the user wants on the first and last messages.
function MessageTextBlock({
  msg,
  index,
  onActive,
  holdVh,
}: {
  msg: (typeof MESSAGES)[number];
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
          letterSpacing: vwPx(7.2),
          lineHeight: vwPx(50),
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

// Left column (image + h2 + bg) stays pinned for the whole section. Right
// column scrolls naturally: as each text block passes viewport center,
// activeIndex updates and the left image crossfades to the matching photo.
// All messages get extra hold (200vh) so the user has time to read.
function StickyMessageSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  const holds = [200, 200, 200]; // per-message wrapper heights (vh)
  const totalVh = holds.reduce((a, b) => a + b, 0);

  return (
    <section className="relative w-full bg-white" style={{ height: `${totalVh}vh` }}>
      {/* Pinned left side: bg texture + Message heading + image stack */}
      <div className="sticky top-0 w-full overflow-hidden" style={{ height: "100vh" }}>
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src="/images/message-bg.jpg"
            alt=""
            fill
            className="object-cover opacity-40"
          />
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
          {MESSAGES.map((m, i) => (
            <motion.div
              key={i}
              className="absolute inset-0"
              initial={false}
              animate={{ opacity: activeIndex === i ? 1 : 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <Image
                src={m.img}
                alt={m.alt}
                fill
                className="object-cover"
                priority={i === 0}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right-column text: absolute overlay spanning full section height */}
      <div
        className="absolute top-0 z-20"
        style={{ left: vwPx(1110), width: vwPx(534), height: "100%" }}
      >
        {MESSAGES.map((m, i) => (
          <MessageTextBlock
            key={i}
            msg={m}
            index={i}
            onActive={setActiveIndex}
            holdVh={holds[i]}
          />
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
      aria-label="トップに戻る"
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
  return (
    <main className="w-[375px] overflow-hidden" style={{ fontFamily: 'Zen Old Mincho, serif' }}>
      <SpBackToTop />
      {/* ===== FV ===== */}
      <section data-sp-theme="dark" className="relative w-[375px] h-[680px] overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/images/sp-fv-bg.jpg" alt="KAKEPHOTO" fill className="object-cover scale-[1.25] object-center" priority />
        </div>
        <div className="absolute top-[20px] left-[16px] z-10">
          <Image src="/images/footer-logo.svg" alt="KAKEPHOTO" width={72} height={112} />
        </div>
        <div className="absolute top-[140px] left-1/2 -translate-x-1/2 z-10 hidden">
          <Image src="/images/logo-center.svg" alt="KAKEPHOTO" width={150} height={236} />
        </div>
        <div className="absolute bottom-[28px] right-[16px] text-right text-white z-10">
          <p className="text-[13px] tracking-[2px] font-medium">FULL CUSTOM MADE</p>
          <p className="text-[10px] tracking-[1.5px] mt-1">Each piece is made exclusively for one photograph.</p>
        </div>
      </section>

      {/* ===== Concept ===== */}
      <section data-sp-theme="dark" className="relative w-[375px] bg-[#710b26] text-white pt-[120px] pb-[380px] overflow-hidden">
        {/* 装飾写真1 — 右上 */}
        <FadeInOnScroll className="absolute top-[100px] right-0 w-[140px] h-[180px] overflow-hidden" delay={0}>
          <Image src="/images/concept-photo1.jpg" alt="" fill className="object-cover" />
        </FadeInOnScroll>
        {/* 装飾写真2 — 左中 */}
        <FadeInOnScroll className="absolute top-[280px] left-0 w-[120px] h-[160px] overflow-hidden" delay={0.15}>
          <Image src="/images/concept-photo2.jpg" alt="" fill className="object-cover" />
        </FadeInOnScroll>

        <div className="relative z-10 px-[20px]">
          <h2 className="text-[24px] tracking-[8px] mb-[60px] text-center">Concept</h2>
          <div className="flex justify-center mb-[30px]">
            <div className="flex gap-[12px]">
              <div className="flex flex-col gap-[2px] text-[20px]" style={{ order: 2 }}>
                {"あなたの写真を".split("").map((c, i) => (
                  <span key={i} className="w-[20px] h-[30px] flex items-center justify-center">{c}</span>
                ))}
                <span className="w-[20px] h-[10px] flex items-center justify-center rotate-180">、</span>
              </div>
              <div className="flex flex-col gap-[2px] text-[20px]" style={{ order: 1 }}>
                {"日本の美で包む".split("").map((c, i) => (
                  <span key={i} className="w-[20px] h-[30px] flex items-center justify-center">{c}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center text-[13px] tracking-[2px] leading-[32px] mb-[50px]">
            <p>私たちの掛け軸は、既製品ではありません。</p>
            <p>&nbsp;</p>
            <p>すべてが、その写真、その空間のための</p>
            <p>完全オーダーメイドです。</p>
            <p>&nbsp;</p>
            <p>掛け軸×写真</p>
            <p>異なる時代に生まれた表現を</p>
            <p>ひとつのかたちに。</p>
            <p>&nbsp;</p>
            <p>掛け軸が持つ</p>
            <p>「余白」「間」「季節を飾る文化」と</p>
            <p>写真が持つ「一瞬を写し取る力」。</p>
            <p>&nbsp;</p>
            <p>そのどちらも大切にしながら、</p>
            <p>新しいアートとしての形を提案します。</p>
          </div>

        </div>

        {/* 装飾写真3 — 左下（少し中央寄り） */}
        <FadeInOnScroll className="absolute bottom-[200px] left-[30px] w-[130px] h-[160px] overflow-hidden" delay={0}>
          <Image src="/images/concept-photo3.jpg" alt="" fill className="object-cover" />
        </FadeInOnScroll>
        {/* 装飾写真4 — 右下（少し下げる） */}
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

          {[
            {
              img: "/images/message-photo1.jpg",
              alt: "掛け軸の裂地",
              lines: [
                "「伝統を継ぎ、未来を綴る」",
                "",
                "文化財修復という、",
                "歴史を守る現場で磨かれた",
                "確かな技術。",
                "",
                "機械では決して生み出せない、",
                "一点一点、呼吸を合わせるような",
                "完全ハンドメイド。",
                "",
                "手仕事ならではの柔らかな風合いに、",
                "職人の誇りを込めてお届けします。",
              ],
            },
            {
              img: "/images/message-photo2.jpg",
              alt: "掛け軸のある空間",
              lines: [
                "「敷居をまたぎ、日常に馴染む」",
                "",
                "「掛軸は少し格式が高い」",
                "というこれまでの常識を、",
                "私たちは軽やかにひっくり返します。",
                "",
                "現代のリビングに、",
                "驚くほど自然にフィットする佇まい。",
                "",
                "もっと扱いやすく、もっと身近に。",
                "あなたの何気ない日常の風景に、",
                "そっと彩りを添えます。",
              ],
            },
            {
              img: "/images/message-photo3.jpg",
              alt: "掛け軸と家族の思い出",
              lines: [
                "「記憶を飾り、心を贈る」",
                "",
                "家族の笑顔や、",
                "心に留めておきたい大切な瞬間。",
                "",
                "デジタルの中にある思い出を",
                "「形」にして、",
                "世界にひとつだけの掛軸へ。",
                "",
                "お世話になった方への贈り物や、",
                "特別な記念日にも。",
                "",
                "言葉では伝えきれない想いを、",
                "確かな形に託して。",
              ],
            },
          ].map((msg, i) => (
            <SpMessageBlock key={i} msg={msg} index={i} />
          ))}
        </div>
      </section>

      {/* ===== Order ===== */}
      <section data-sp-theme="dark" className="relative w-[375px] bg-[#710b26] text-white px-[20px] py-[50px]">
        <h2 className="text-[24px] tracking-[8px] mb-[40px] text-center">Order</h2>
        <p className="text-[12px] tracking-[1.5px] leading-[28px] text-center mb-[30px]">
          掛け軸は、オーダーにてお作りしています。<br />写真の内容だけでなく、裂地の色や質感、<br />全体の配色バランスまで。<br />空間や飾る場所を想像しながら、<br />一緒に仕立てていく時間も大切にしています。
        </p>

        {/* 特注オーダーメイド */}
        <div className="bg-[#FFFFFB] text-[#710b26] rounded-sm overflow-hidden mb-[20px]">
          <div className="relative w-full h-[220px]">
            <Image src="/images/order-photo.jpg" alt="特注オーダーメイド" fill className="object-cover" />
          </div>
          <div className="p-[16px]">
            <div className="mb-1">
              <h3 className="text-[18px] tracking-[4px]">特注オーダーメイド</h3>
              <span className="text-[12px] tracking-[2px] text-[#323232]">Photo size FREE</span>
            </div>
            <div className="text-[12px] tracking-[2px] text-black leading-[24px] mb-2">
              <p>縦：110-130cm / 横：30cm~</p>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-[16px] tracking-[2px] text-black">88,000円～</span>
              <span className="text-[11px] tracking-[1px] text-black">(税込/送料込)</span>
            </div>
            <p className="text-[12px] tracking-[1.5px] text-black leading-[22px]">
              写真の印刷サイズは、ハガキサイズからA3サイズまで自由にお選びいただけます。使用する裂地（きれじ）や完成形に制限はなく、自由なカスタマイズが可能です。
            </p>
          </div>
        </div>

        {/* 雅コース */}
        <div className="bg-[#FFFFFB] text-[#710b26] rounded-sm overflow-hidden mb-[20px]">
          <div className="relative w-full h-[220px]">
            <Image src="/images/order-photo-miyabi.jpg" alt="雅コース" fill className="object-cover" />
          </div>
          <div className="p-[16px]">
            <div className="mb-1">
              <h3 className="text-[18px] tracking-[4px]">雅コース</h3>
              <span className="text-[12px] tracking-[2px] text-[#323232]">Photo size A4</span>
            </div>
            <div className="text-[12px] tracking-[2px] text-black leading-[24px] mb-2">
              <p>縦：100-120cm / 横：23cm~</p>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-[16px] tracking-[2px] text-black">46,000円</span>
              <span className="text-[11px] tracking-[1px] text-black">(税込/送料込)</span>
            </div>
            <p className="text-[12px] tracking-[1.5px] text-black leading-[22px]">
              お写真をA4サイズに拡大印刷して仕上げます。あらかじめ厳選された裂地（きれじ）や形状のラインナップから、お好みの組み合わせをお選びいただけます。
            </p>
          </div>
        </div>

        {/* 極コース */}
        <div className="bg-[#FFFFFB] text-[#710b26] rounded-sm overflow-hidden mb-[90px]">
          <div className="relative w-full h-[220px]">
            <Image src="/images/order-photo-kiwami.jpg" alt="極コース" fill className="object-cover" />
          </div>
          <div className="p-[16px]">
            <div className="mb-1">
              <h3 className="text-[18px] tracking-[4px]">極コース</h3>
              <span className="text-[12px] tracking-[2px] text-[#323232]">Photo size A3</span>
            </div>
            <div className="text-[12px] tracking-[2px] text-black leading-[24px] mb-2">
              <p>縦：110-130cm / 横：30cm~</p>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-[16px] tracking-[2px] text-black">77,000円</span>
              <span className="text-[11px] tracking-[1px] text-black">(税込/送料込)</span>
            </div>
            <p className="text-[12px] tracking-[1.5px] text-black leading-[22px]">
              お写真を、存在感あふれるA3サイズに拡大印刷いたします。ダイナミックな大きさでありながら、細部まで鮮明に再現されます。
            </p>
          </div>
        </div>

        {/* オーダーの流れ */}
        <h3 className="text-[18px] tracking-[4px] text-center underline mb-[24px]">オーダーの流れ</h3>
        <div className="mb-[60px]">
          {[
            { step: "Step1", text: "まずは公式LINEもしくはお問合せからご連絡ください。" },
            { step: "Step2", text: "詳細をお伺いするため、後日、職人よりご連絡いたします。" },
            { step: "Step3", text: "写真からおすすめの裂地を選定させていただきます。" },
            { step: "Step4", text: "裂地を確認後、制作に移らせていただきます。" },
          ].map((item, i) => (
            <div key={i} className="border-b border-white/30 py-[12px]">
              <span className="text-[14px] tracking-[4px] block mb-1">{item.step}</span>
              <span className="text-[12px] tracking-[1.5px] leading-[22px]">{item.text}</span>
            </div>
          ))}
        </div>

        <p className="text-[10px] tracking-[0.5px] text-center leading-[18px] mb-[30px] -mt-[40px]">
          ※使用する裂地や仕様により、金額は変動します。ご希望やご予算に合わせて、無理のない形をご提案しますのでお気軽にご相談ください。
        </p>

        {/* CTA */}
        <a href="https://line.me/R/ti/p/@447updgf" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 w-full h-[56px] bg-[#f7f7f7] text-[#710b26] text-[13px] tracking-[2px] mb-[12px]">
          公式LINEからオーダーする
          <Image src="/images/line-icon.svg" alt="LINE" width={32} height={30} />
        </a>
        <Link href="/contact" className="flex items-center justify-center gap-2 w-full h-[56px] bg-[#f7f7f7] text-[#710b26] text-[13px] tracking-[2px] mb-[30px]">
          お問い合わせからオーダーする
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
            aria-label="トップに戻る"
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
          <p className="text-[10px] tracking-[0.8px] mb-[8px]"><a href="/privacy-policy">プライバシーポリシー</a> | <a href="/cancel-policy">キャンセルポリシー</a></p>
          <p className="text-[9px] tracking-[0.8px]">©︎KAKEPHOTO All Rights Reserved.</p>
        </footer>
      </section>
    </main>
  );
}

export default function Home() {
  return (
    <>
      <div className="vp-sp-only vp-sp-root">
        <SpPage />
      </div>
      <div className="vp-pc-only vp-pc-root">
        <main className="w-[1920px]">
          {/* ===== FV (First View) — Figma: 1920x1450 ===== */}
          <section className="relative w-[1920px] h-[1450px] overflow-hidden">
          {/* Background photo — Figma: left:-51.41% top:-33.59% w:152.55% h:134.68% */}
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src="/images/fv-bg.jpg"
              alt="KAKEPHOTO メインビジュアル"
              width={2929}
              height={1953}
              className="absolute max-w-none"
              style={{
                width: '152.55%',
                height: '134.68%',
                left: '-51.41%',
                top: '-33.59%',
              }}
              priority
            />
          </div>
          {/* 横ロゴ — Figma: x=42 y=60 */}
          <div className="absolute top-[60px] left-[42px] z-10">
            <Image
              src="/images/logo-horizontal.svg"
              alt="KAKEPHOTO"
              width={269}
              height={30}
            />
          </div>
          {/* センターロゴ — Figma: x=820 y=312 w=280 h=441 */}
          <div className="absolute top-[312px] left-[820px] z-10">
            <Image
              src="/images/logo-center.svg"
              alt="KAKEPHOTO"
              width={280}
              height={441}
            />
          </div>
          {/* FULL CUSTOM MADE — Figma: x=1517 y=946 w=304 right-aligned */}
          <p className="absolute top-[946px] right-[99px] text-right text-white text-[22px] tracking-[4.4px] font-medium z-10">
            FULL CUSTOM MADE
          </p>
          {/* Each piece... — Figma: x=1241 y=977 w=580 right-aligned */}
          <p className="absolute top-[977px] right-[99px] text-right text-white text-[18px] tracking-[3.6px] z-10">
            Each piece is made exclusively for one photograph.
          </p>
        </section>

        {/* ===== Concept — Figma: 1920x1695 ===== */}
        <section className="relative w-[1920px] h-[1975px] bg-[#710b26] text-white overflow-hidden">
          {/* 装飾写真1 — Figma: x=1500 y=168 w=320 h=400 */}
          <FadeInOnScroll className="absolute top-[168px] left-[1500px] w-[320px] h-[400px] overflow-hidden" delay={0}>
            <Image src="/images/concept-photo1.jpg" alt="" fill className="object-cover" />
          </FadeInOnScroll>
          {/* 装飾写真2 — Figma: x=0 y=568 w=429 h=350 */}
          <FadeInOnScroll className="absolute top-[568px] left-0 w-[429px] h-[350px] overflow-hidden" delay={0.15}>
            <Image src="/images/concept-photo2.jpg" alt="" fill className="object-cover" />
          </FadeInOnScroll>
          {/* 装飾写真3 — Figma: x=172 y=1231 w=352 h=364 */}
          <FadeInOnScroll className="absolute top-[1391px] left-[172px] w-[352px] h-[364px] overflow-hidden" delay={0.3}>
            <Image src="/images/concept-photo3.jpg" alt="" fill className="object-cover" />
          </FadeInOnScroll>

          {/* Concept写真 — Figma: x=1430 y=983 w=390 h=480 */}
          <FadeInOnScroll className="absolute top-[1143px] left-[1430px] w-[390px] h-[480px] overflow-hidden" delay={0.2}>
            <Image
              src="/images/concept-photo.jpg"
              alt="掛け軸のある暮らし"
              fill
              className="object-cover"
            />
          </FadeInOnScroll>

          {/* Concept文字 — Figma: x=99 y=183 */}
          <h2 className="absolute top-[183px] left-[99px] text-[40px] tracking-[16px] text-white">
            Concept
          </h2>

          {/* 縦書き — Figma: 右列x=967 左列x=923 y=340 gap=16px */}
          <div className="absolute top-[500px] left-[923px] flex gap-[16px]">
            {/* 右列: あなたの写真を、 */}
            <div className="flex flex-col gap-[4px] text-[28px] text-white" style={{ order: 2 }}>
              {"あなたの写真を".split("").map((c, i) => (
                <span key={i} className="w-[28px] h-[41px] flex items-center justify-center">{c}</span>
              ))}
              <span className="w-[28px] h-[14px] flex items-center justify-center text-[28px] rotate-180">、</span>
            </div>
            {/* 左列: 日本の美で包む */}
            <div className="flex flex-col gap-[4px] text-[28px] text-white" style={{ order: 1 }}>
              {"日本の美で包む".split("").map((c, i) => (
                <span key={i} className="w-[28px] h-[41px] flex items-center justify-center">{c}</span>
              ))}
            </div>
          </div>

          {/* 説明文 — Figma: x=655 y=821 w=613 */}
          <div className="absolute top-[981px] left-[655px] w-[613px] text-center text-[22px] tracking-[4.4px] leading-[50px]">
            <p>私たちの掛け軸は、既製品ではありません。</p>
            <p>&nbsp;</p>
            <p>すべてが、その写真、その空間のための</p>
            <p>完全オーダーメイドです。</p>
            <p>&nbsp;</p>
            <p>掛け軸×写真</p>
            <p>異なる時代に生まれた表現をひとつのかたちに。</p>
            <p>&nbsp;</p>
            <p>掛け軸が持つ 「余白」「間」「季節を飾る文化」と</p>
            <p>写真が持つ「一瞬を写し取る力」。</p>
            <p>&nbsp;</p>
            <p>そのどちらも大切にしながら、</p>
            <p>新しいアートとしての形を提案します。</p>
          </div>
        </section>

        {/* ===== Transition — Figma: 1920x860 ===== */}
        <section className="relative w-[1920px] h-[860px] overflow-hidden">
          {/* 背景画像 — Figma: x=-10 y=-306(section内) w=1930 h=2894 */}
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src="/images/transition-bg.jpg"
              alt=""
              width={1930}
              height={2894}
              className="absolute max-w-none"
              style={{
                width: 1930,
                height: 2894,
                left: -10,
                top: -306,
              }}
            />
          </div>
          {/* Top/bottom borders */}
          <div className="absolute top-0 left-0 w-full h-[64px] bg-[#D1C4B2] z-10" />
          <div className="absolute bottom-0 left-0 w-full h-[64px] bg-[#D1C4B2] z-10" />
          {/* Side borders */}
          <div className="absolute top-[64px] left-0 w-[26px] h-[calc(100%-128px)] bg-[#D1C4B2] z-10" />
          <div className="absolute top-[64px] right-0 w-[26px] h-[calc(100%-128px)] bg-[#D1C4B2] z-10" />
        </section>
        </main>
      </div>

      {/* ===== Message — Sticky Scroll (OUTSIDE zoom — uses vw/vh) ===== */}
      <div className="vp-pc-only">
        <StickyMessageSection />
      </div>

      <div className="vp-pc-only vp-pc-root">
        <main className="w-[1920px]">
        {/* ===== Order + Footer — Figma: bg 1920x3143 ===== */}
        <section className="relative w-[1920px] h-[3298px] bg-[#710b26] text-white">
          <h2 className="absolute z-10 left-[99px] top-[118px] text-[40px] tracking-[16px]">Order</h2>
          <p className="absolute z-10 left-[523px] top-[308px] w-[875px] text-[18px] tracking-[3.6px] leading-[50px] text-center" style={{ fontFamily: 'Zen Old Mincho' }}>
            掛け軸は、　オーダーにてお作りしています。<br />写真の内容だけでなく、　裂地の色や質感、　全体の配色バランスまで。<br />空間や飾る場所を想像しながら、<br />一緒に仕立てていく時間も　大切にしています。
          </p>

          {/* 特注オーダーメイド — Figma: x=99 y=484 w=1721 h=557 */}
          <div className="absolute left-[99px] top-[579px] w-[1721px] h-[557px] bg-[#FFFFFB] text-[#710b26] rounded-sm overflow-hidden">
            {/* 画像 — Figma: x=54 y=61 w=650 h=430 */}
            <div className="absolute left-[54px] top-[61px] w-[650px] h-[430px] overflow-hidden">
              <Image
                src="/images/order-photo.jpg"
                alt="特注オーダーメイド掛け軸"
                fill
                className="object-cover"
              />
            </div>
            {/* 特注オーダーメイド */}
            <h3 className="absolute left-[801px] top-[88px] text-[24px] tracking-[9.6px] leading-[50px]">特注オーダーメイド</h3>
            {/* Photo size FREE */}
            <span className="absolute left-[1140px] top-[88px] text-[18px] tracking-[7.2px] text-[#323232] leading-[50px]">Photo size FREE</span>
            {/* サイズ */}
            <div className="absolute left-[802px] top-[165px] text-[14px] tracking-[5.6px] text-black leading-[30px]">
              <p>縦：110-130cm</p>
              <p>横：30cm~</p>
            </div>
            {/* 価格 */}
            <span className="absolute left-[1520px] top-[157px] text-[18px] tracking-[7.2px] text-black leading-[50px]">88,000円～</span>
            <span className="absolute left-[1532px] top-[182px] text-[14px] tracking-[2.8px] text-black leading-[50px]">(税込/送料込)</span>
            {/* 説明テキスト */}
            <p className="absolute left-[802px] top-[260px] w-[860px] text-[16px] tracking-[7.2px] text-black leading-[28px]">
              写真の印刷サイズは、ハガキサイズからA3サイズまで自由にお選びいただけます。<br />使用する裂地（きれじ）や完成形に制限はなく、自由なカスタマイズが可能です。ご自身のこだわりを妥協なく形にしたい方には、こちらのコースをおすすめいたします。
            </p>
          </div>


          {/* 雅・極コース背景 — Figma: x=99 y=1080 w=1721 h=522 */}
          <div className="absolute left-[99px] top-[1175px] w-[1721px] h-[522px] bg-[#FFFFFB] text-[#710b26] rounded-sm overflow-hidden">
            {/* 雅コース */}
            <h3 className="absolute left-[54px] top-[54px] text-[24px] tracking-[9.6px] leading-[50px]">雅コース</h3>
            <span className="absolute left-[211px] top-[53px] text-[18px] tracking-[7.2px] text-[#323232] leading-[50px]">Photo sizeA4</span>
            <div className="absolute left-[54px] top-[125px] w-[382px] h-[252px] overflow-hidden">
              <Image src="/images/order-photo-miyabi.jpg" alt="雅コース" fill className="object-cover" />
            </div>
            <p className="absolute left-[475px] top-[119px] w-[326px] text-[14px] tracking-[4.8px] text-black leading-[26px]">
              お写真をA4サイズに拡大印刷して仕上げます。あらかじめ厳選された裂地（きれじ）や形状のラインナップから、お好みの組み合わせをお選びいただき、理想の完成イメージを形にしていきます。
            </p>
            <div className="absolute left-[54px] top-[428px] text-[14px] tracking-[5.6px] text-black leading-[30px]">
              <p>縦：100-120cm</p>
              <p>横23cm~</p>
            </div>
            <span className="absolute left-[327px] top-[411px] text-[18px] tracking-[7.2px] text-black leading-[50px]">46,000円</span>
            <span className="absolute left-[327px] top-[443px] text-[14px] tracking-[2.8px] text-black leading-[50px]">(税込/送料込)</span>


            {/* 極コース */}
            <h3 className="absolute left-[913px] top-[51px] text-[24px] tracking-[9.6px] leading-[50px]">極コース</h3>
            <span className="absolute left-[1070px] top-[53px] text-[18px] tracking-[7.2px] text-[#323232] leading-[50px]">Photo sizeA3</span>
            <div className="absolute left-[913px] top-[125px] w-[382px] h-[252px] overflow-hidden">
              <Image src="/images/order-photo-kiwami.jpg" alt="極コース" fill className="object-cover" />
            </div>
            <p className="absolute left-[1334px] top-[119px] w-[326px] text-[14px] tracking-[4.8px] text-black leading-[26px]">
              お写真を、存在感あふれるA3サイズに拡大印刷いたします。<br />ダイナミックな大きさでありながら、細部まで鮮明に再現されるため、大切な思い出がより一層の臨場感とともに蘇ります。お部屋の主役となる十分なサイズ感は、ご自宅用はもちろん、記念品やお祝いの品としても大変喜ばれる仕上がりです。
            </p>
            <div className="absolute left-[918px] top-[417px] text-[14px] tracking-[5.6px] text-black leading-[30px]">
              <p>縦：110-130cm</p>
              <p>横：30cm~</p>
            </div>
            <span className="absolute left-[1176px] top-[411px] text-[18px] tracking-[7.2px] text-black leading-[50px]">77,000円</span>
            <span className="absolute left-[1181px] top-[436px] text-[14px] tracking-[2.8px] text-black leading-[50px]">(税込/送料込)</span>
          </div>

          {/* オーダーの流れ — Figma: x=300 y=1804 w=1320 */}
          <div className="absolute left-[300px] top-[1899px] w-[1320px]">
            <h3 className="text-[28px] tracking-[11.2px] text-center underline mb-[60px]">
              オーダーの流れ
            </h3>
            <div>
              {[
                { step: "Step1", text: "まずは公式LINEもしくはお問合せからご連絡ください。" },
                { step: "Step2", text: "詳細をお伺いするため、後日、職人よりご連絡いたします。" },
                { step: "Step3", text: "写真からおすすめの裂地を選定させていただきます。この時点でご希望の色味などがございましたらお知らせください。" },
                { step: "Step4", text: "実際に使用する裂地を確認していただいたのち、制作に移らせていただきます。" },
              ].map((item, i) => (
                <div key={i} className="border-b border-white/30 py-[20px] flex gap-[30px] items-baseline">
                  <span className="text-[22px] tracking-[8.8px] shrink-0 w-[131px]">{item.step}</span>
                  <span className="text-[18px] tracking-[3.6px]">{item.text}</span>
                </div>
              ))}
            </div>
            <p className="mt-[30px] w-full text-center text-[14px] tracking-[1px]">
              ※使用する裂地や仕様により、金額は変動します。ご希望やご予算に合わせて、無理のない形をご提案しますのでお気軽にご相談ください。
            </p>
          </div>

          {/* CTA Buttons — Figma: y=2275 */}
          <a
            href="https://line.me/R/ti/p/@447updgf"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute left-[300px] top-[2430px] flex items-center justify-center gap-4 w-[640px] h-[110px] bg-[#f7f7f7] border border-white text-[#710b26] text-[20px] tracking-[4.4px] hover:opacity-90 transition-opacity"
          >
            KAKEPHOTO 公式LINEからオーダーする
            <Image src="/images/line-icon.svg" alt="LINE" width={57} height={54} />
          </a>
          <Link
            href="/contact"
            className="absolute left-[980px] top-[2430px] flex items-center justify-center gap-4 w-[640px] h-[110px] bg-[#f7f7f7] border border-white text-[#710b26] text-[20px] tracking-[4.4px] hover:opacity-90 transition-opacity"
          >
            お問い合わせからオーダーする
            <span className="inline-block w-[41px] h-[1px] bg-[#710b26] relative ml-2">
              <span className="absolute right-0 top-1/2 -translate-y-1/2 border-r-[2px] border-t-[2px] border-[#710b26] w-[8px] h-[8px] rotate-45" />
            </span>
          </Link>

          {/* Gallery — Figma: x=-30 y=2574 w=1979 h=280 */}
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

          {/* Footer — Figma: x=100 y=2926 w=1720 h=217 */}
          <footer className="absolute left-[100px] top-[3081px] w-[1720px] h-[217px] text-white">
            {/* Logo */}
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="トップに戻る"
              className="absolute left-0 top-0 w-[110px] h-[173px] cursor-pointer hover:opacity-80 transition-opacity"
            >
              <Image
                src="/images/footer-logo.svg"
                alt="KAKEPHOTO"
                fill
                className="object-contain"
              />
            </button>

            {/* SNS */}
            <div className="absolute right-0 top-[33px] flex items-center gap-[32px]">
              <a href="https://www.instagram.com/kakephoto_art/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-[12px]">
                <Image
                  src="/images/instagram-icon.svg"
                  alt="Instagram"
                  width={18}
                  height={18}
                />
                <span className="text-[18px] tracking-[1.8px]">Instagram</span>
              </a>
              <a href="https://line.me/R/ti/p/@447updgf" target="_blank" rel="noopener noreferrer" className="flex items-center gap-[12px]">
                <Image
                  src="/images/line-icon-white.svg"
                  alt="LINE"
                  width={19}
                  height={18}
                />
                <span className="text-[18px] tracking-[1.8px]">LINE</span>
              </a>
            </div>

            {/* Copyright */}
            <p className="absolute left-[738px] top-[167px] text-[12px] tracking-[1.2px]">
              ©︎KAKEPHOTO All Rights Reserved.
            </p>

            {/* プライバシーポリシー */}
            <p className="absolute right-0 top-[161px] text-[14px] tracking-[1.4px]">
              <a href="/privacy-policy">プライバシーポリシー</a> | <a href="/cancel-policy">キャンセルポリシー</a>
            </p>
          </footer>
        </section>
        </main>
      </div>
    </>
  );
}
