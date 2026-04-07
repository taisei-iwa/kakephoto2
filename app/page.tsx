"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

function ScaledWrapper({ children, spChildren }: { children: React.ReactNode; spChildren: React.ReactNode }) {
  const [scale, setScale] = useState(1);
  const [isSp, setIsSp] = useState(false);

  useEffect(() => {
    const update = () => {
      const w = document.documentElement.clientWidth;
      const sp = w < 768;
      setIsSp(sp);
      setScale(sp ? w / 375 : w / 1920);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (isSp) {
    return (
      <div style={{ width: 375, zoom: scale }}>
        {spChildren}
      </div>
    );
  }

  return (
    <div style={{ width: 1920, zoom: scale }}>
      {children}
    </div>
  );
}

function MessageBg() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <Image
        src="/images/message-bg.jpg"
        alt=""
        width={2730}
        height={4096}
        className="absolute max-w-none opacity-40"
        style={{ width: 2730, height: 4096, left: -702, top: -526 }}
      />
    </div>
  );
}

function StickyMessageSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [panelH, setPanelH] = useState(1080);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const update = () => {
      const w = document.documentElement.clientWidth;
      if (w >= 768) {
        const scale = w / 1920;
        setPanelH(window.innerHeight / scale);
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const opacity1 = useTransform(scrollYProgress, [0, 0.27, 0.33], [1, 1, 0]);
  const y1 = useTransform(scrollYProgress, [0, 0.27, 0.33], [0, 0, -80]);

  const opacity2 = useTransform(scrollYProgress, [0.27, 0.33, 0.6, 0.66], [0, 1, 1, 0]);
  const y2 = useTransform(scrollYProgress, [0.27, 0.33, 0.6, 0.66], [80, 0, 0, -80]);

  const opacity3 = useTransform(scrollYProgress, [0.6, 0.66, 1], [0, 1, 1]);
  const y3 = useTransform(scrollYProgress, [0.6, 0.66, 1], [80, 0, 0]);

  return (
    <section ref={sectionRef} className="relative w-[1920px]" style={{ height: panelH * 4 }}>
      <div className="sticky top-0 w-[1920px] overflow-hidden" style={{ height: panelH }}>
        <div className="absolute inset-0 bg-white" />
        <MessageBg />
        <h2 className="absolute z-20 left-[99px] top-[206px] text-[#710b26] text-[40px] tracking-[16px]">Message</h2>

        {/* Panel 1 */}
        <motion.div className="absolute inset-0 z-10" style={{ opacity: opacity1, y: y1 }}>
          <div className="absolute left-0 top-[406px] w-[960px] h-[648px] overflow-hidden">
            <Image src="/images/message-photo1.jpg" alt="掛け軸の裂地" fill className="object-cover" />
          </div>
          <div className="absolute left-[1110px] top-[538px] w-[534px] h-[384px] text-[#710b26] text-[18px] tracking-[7.2px] leading-[50px]" style={{ fontFamily: 'Zen Old Mincho' }}>
            <p>「伝統を継ぎ、未来を綴る」</p>
            <p>文化財修復という、歴史を守る現場で</p>
            <p>磨かれた確かな技術。</p>
            <p>機械では決して生み出せない、</p>
            <p>一点一点、呼吸を合わせるような</p>
            <p>完全ハンドメイド。</p>
            <p>手仕事ならではの柔らかな風合いに、</p>
            <p>職人の誇りを込めてお届けします。</p>
          </div>
        </motion.div>

        {/* Panel 2 */}
        <motion.div className="absolute inset-0 z-10" style={{ opacity: opacity2, y: y2 }}>
          <div className="absolute left-0 top-[406px] w-[960px] h-[648px] overflow-hidden">
            <Image src="/images/message-photo2.jpg" alt="掛け軸のある空間" fill className="object-cover" />
          </div>
          <div className="absolute left-[1110px] top-[538px] w-[534px] h-[384px] text-[#710b26] text-[18px] tracking-[7.2px] leading-[50px]" style={{ fontFamily: 'Zen Old Mincho' }}>
            <p>「敷居をまたぎ、日常に馴染む」</p>
            <p>「掛軸は少し格式が高い」というこれまでの</p>
            <p>常識を、私たちは軽やかにひっくり返します。</p>
            <p>現代のリビングに、</p>
            <p>驚くほど自然にフィットする佇まい。</p>
            <p>もっと扱いやすく、もっと身近に。</p>
            <p>あなたの何気ない日常の風景に、</p>
            <p>そっと彩りを添えます。</p>
          </div>
        </motion.div>

        {/* Panel 3 */}
        <motion.div className="absolute inset-0 z-10" style={{ opacity: opacity3, y: y3 }}>
          <div className="absolute left-0 top-[406px] w-[960px] h-[648px] overflow-hidden">
            <Image src="/images/message-photo3.jpg" alt="掛け軸と家族の思い出" fill className="object-cover" />
          </div>
          <div className="absolute left-[1110px] top-[538px] w-[534px] h-[434px] text-[#710b26] text-[18px] tracking-[7.2px] leading-[50px]" style={{ fontFamily: 'Zen Old Mincho' }}>
            <p>「記憶を飾り、心を贈る」</p>
            <p>家族の笑顔や、心に留めておきたい</p>
            <p>大切な瞬間。</p>
            <p>デジタルの中にある思い出を「形」にして、</p>
            <p>世界にひとつだけの掛軸へ。</p>
            <p>お世話になった方への贈り物や、</p>
            <p>特別な記念日にも。</p>
            <p>言葉では伝えきれない想いを、</p>
            <p>確かな形に託して。</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function SpPage() {
  return (
    <main className="w-[375px] overflow-hidden" style={{ fontFamily: 'Zen Old Mincho, serif' }}>
      {/* ===== FV ===== */}
      <section className="relative w-[375px] h-[680px] overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/images/fv-bg.jpg" alt="KAKE PHOTO" fill className="object-cover" priority />
        </div>
        <div className="absolute top-[20px] left-[16px] z-10">
          <Image src="/images/logo-horizontal.svg" alt="KAKE PHOTO" width={160} height={18} />
        </div>
        <div className="absolute top-[140px] left-1/2 -translate-x-1/2 z-10 hidden">
          <Image src="/images/logo-center.svg" alt="KAKE PHOTO" width={150} height={236} />
        </div>
        <div className="absolute bottom-[60px] right-[16px] text-right text-white z-10">
          <p className="text-[13px] tracking-[2px] font-medium">FULL CUSTOM MADE</p>
          <p className="text-[10px] tracking-[1.5px] mt-1">Each piece is made exclusively for one photograph.</p>
        </div>
      </section>

      {/* ===== Concept ===== */}
      <section className="relative w-[375px] bg-[#710b26] text-white px-[20px] py-[60px]">
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
        <div className="text-center text-[13px] tracking-[2px] leading-[32px] mb-[40px]">
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
        <div className="relative w-full h-[240px] overflow-hidden">
          <Image src="/images/concept-photo.jpg" alt="掛け軸のある暮らし" fill className="object-cover" />
        </div>
      </section>

      {/* ===== Transition ===== */}
      <section className="relative w-[375px] h-[200px] overflow-hidden">
        <Image src="/images/transition-bg.jpg" alt="" fill className="object-cover" />
        <div className="absolute top-0 left-0 w-full h-[20px] bg-[#E7E8B2] z-10" />
        <div className="absolute bottom-0 left-0 w-full h-[20px] bg-[#E7E8B2] z-10" />
        <div className="absolute top-[20px] left-0 w-[8px] h-[calc(100%-40px)] bg-[#909AC3] z-10" />
        <div className="absolute top-[20px] right-0 w-[8px] h-[calc(100%-40px)] bg-[#909AC3] z-10" />
      </section>

      {/* ===== Message ===== */}
      <section className="relative w-[375px] bg-white overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/images/message-bg.jpg" alt="" fill className="object-cover opacity-40" />
        </div>
        <div className="relative z-10 px-[20px] py-[50px]">
          <h2 className="text-[#710b26] text-[24px] tracking-[8px] mb-[80px] text-center">Message</h2>

          {[
            { img: "/images/message-photo1.jpg", alt: "掛け軸の裂地", lines: ["「伝統を継ぎ、未来を綴る」", "文化財修復という、歴史を守る現場で磨かれた確かな技術。", "機械では決して生み出せない、一点一点、呼吸を合わせるような完全ハンドメイド。", "手仕事ならではの柔らかな風合いに、職人の誇りを込めてお届けします。"] },
            { img: "/images/message-photo2.jpg", alt: "掛け軸のある空間", lines: ["「敷居をまたぎ、日常に馴染む」", "「掛軸は少し格式が高い」というこれまでの常識を、私たちは軽やかにひっくり返します。", "現代のリビングに、驚くほど自然にフィットする佇まい。", "もっと扱いやすく、もっと身近に。あなたの何気ない日常の風景に、そっと彩りを添えます。"] },
            { img: "/images/message-photo3.jpg", alt: "掛け軸と家族の思い出", lines: ["「記憶を飾り、心を贈る」", "家族の笑顔や、心に留めておきたい大切な瞬間。", "デジタルの中にある思い出を「形」にして、世界にひとつだけの掛軸へ。", "お世話になった方への贈り物や、特別な記念日にも。言葉では伝えきれない想いを、確かな形に託して。"] },
          ].map((msg, i) => (
            <div key={i} className="mb-[40px]">
              <div className="relative w-full h-[220px] overflow-hidden mb-[20px]">
                <Image src={msg.img} alt={msg.alt} fill className="object-cover" />
              </div>
              <div className="text-[#710b26] text-[13px] tracking-[2px] leading-[28px]">
                {msg.lines.map((line, j) => <p key={j}>{line}</p>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Order ===== */}
      <section className="relative w-[375px] bg-[#710b26] text-white px-[20px] py-[50px]">
        <h2 className="text-[24px] tracking-[8px] mb-[40px] text-center">Order</h2>
        <p className="text-[12px] tracking-[1.5px] leading-[28px] text-center mb-[30px]">
          掛け軸は、オーダーにてお作りしています。<br />写真の内容だけでなく、裂地の色や質感、全体の配色バランスまで。<br />空間や飾る場所を想像しながら、<br />一緒に仕立てていく時間も大切にしています。
        </p>

        {/* 特注オーダーメイド */}
        <div className="bg-[#FFFFFB] text-[#710b26] rounded-sm overflow-hidden mb-[20px]">
          <div className="relative w-full h-[220px]">
            <Image src="/images/order-photo.jpg" alt="特注オーダーメイド" fill className="object-cover" />
          </div>
          <div className="p-[16px]">
            <div className="flex items-baseline gap-2 mb-1">
              <h3 className="text-[18px] tracking-[4px]">特注オーダーメイド</h3>
              <span className="text-[12px] tracking-[2px] text-[#323232]">Photo size FREE</span>
            </div>
            <div className="text-[12px] tracking-[2px] text-black leading-[24px] mb-2">
              <p>縦：110-130cm / 横：30cm~</p>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-[16px] tracking-[2px] text-black">00,000円</span>
              <span className="text-[11px] tracking-[1px] text-black">(税込/送料込)</span>
            </div>
            <p className="text-[12px] tracking-[1.5px] text-black leading-[22px]">
              写真の印刷サイズは、ハガキサイズからA3サイズまで自由にお選びいただけます。使用する裂地（きれじ）や完成形に制限はなく、自由なカスタマイズが可能です。
            </p>
          </div>
        </div>

        {/* 雅コース */}
        <div className="bg-[#FFFFFB] text-[#710b26] rounded-sm overflow-hidden mb-[20px]">
          <div className="relative w-full h-[200px]">
            <Image src="/images/order-photo-miyabi.jpg" alt="雅コース" fill className="object-cover" />
          </div>
          <div className="p-[16px]">
            <div className="flex items-baseline gap-2 mb-1">
              <h3 className="text-[18px] tracking-[4px]">雅コース</h3>
              <span className="text-[12px] tracking-[2px] text-[#323232]">Photo size A4</span>
            </div>
            <p className="text-[12px] tracking-[1.5px] text-black leading-[22px] mb-3">
              お写真をA4サイズに拡大印刷して仕上げます。あらかじめ厳選された裂地（きれじ）や形状のラインナップから、お好みの組み合わせをお選びいただけます。
            </p>
            <div className="flex items-baseline justify-between">
              <p className="text-[12px] text-black tracking-[2px]">縦：100-120cm 横23cm~</p>
              <div className="flex items-baseline gap-1">
                <span className="text-[16px] text-black">46,000円</span>
                <span className="text-[10px] text-black">(税込/送料込)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 極コース */}
        <div className="bg-[#FFFFFB] text-[#710b26] rounded-sm overflow-hidden mb-[30px]">
          <div className="relative w-full h-[200px]">
            <Image src="/images/order-photo-kiwami.jpg" alt="極コース" fill className="object-cover" />
          </div>
          <div className="p-[16px]">
            <div className="flex items-baseline gap-2 mb-1">
              <h3 className="text-[18px] tracking-[4px]">極コース</h3>
              <span className="text-[12px] tracking-[2px] text-[#323232]">Photo size A3</span>
            </div>
            <p className="text-[12px] tracking-[1.5px] text-black leading-[22px] mb-3">
              お写真を、存在感あふれるA3サイズに拡大印刷いたします。ダイナミックな大きさでありながら、細部まで鮮明に再現されます。
            </p>
            <div className="flex items-baseline justify-between">
              <p className="text-[12px] text-black tracking-[2px]">縦：110-130cm 横：30cm~</p>
              <div className="flex items-baseline gap-1">
                <span className="text-[16px] text-black">77,000円</span>
                <span className="text-[10px] text-black">(税込/送料込)</span>
              </div>
            </div>
          </div>
        </div>

        {/* オーダーの流れ */}
        <h3 className="text-[18px] tracking-[4px] text-center underline mb-[24px]">オーダーの流れ</h3>
        <div className="mb-[30px]">
          {[
            { step: "Step1", text: "まずは公式LINEもしくはお問合せからご連絡ください。" },
            { step: "Step2", text: "職人から詳しいヒアリングの連絡をさせていただきます。" },
            { step: "Step3", text: "写真からおすすめの裂地を選定させていただきます。" },
            { step: "Step4", text: "裂地を確認後、制作に移らせていただきます。" },
          ].map((item, i) => (
            <div key={i} className="border-b border-white/30 py-[12px]">
              <span className="text-[14px] tracking-[4px] block mb-1">{item.step}</span>
              <span className="text-[12px] tracking-[1.5px] leading-[22px]">{item.text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <a href="#" className="flex items-center justify-center gap-3 w-full h-[56px] bg-[#f7f7f7] text-[#710b26] text-[13px] tracking-[2px] mb-[12px]">
          公式LINEからオーダーする
          <Image src="/images/line-icon.svg" alt="LINE" width={32} height={30} />
        </a>
        <a href="#" className="flex items-center justify-center gap-2 w-full h-[56px] bg-[#f7f7f7] text-[#710b26] text-[13px] tracking-[2px] mb-[20px]">
          お問い合わせからオーダーする
          <span className="inline-block w-[24px] h-[1px] bg-[#710b26] relative">
            <span className="absolute right-0 top-1/2 -translate-y-1/2 border-r-[1.5px] border-t-[1.5px] border-[#710b26] w-[6px] h-[6px] rotate-45" />
          </span>
        </a>

        <p className="text-[10px] tracking-[0.5px] text-center leading-[18px] mb-[30px]">
          ※使用する裂地や仕様により、金額は変動します。ご希望やご予算に合わせて、無理のない形をご提案しますのでお気軽にご相談ください。
        </p>

        {/* Gallery */}
        <div className="flex overflow-x-auto gap-[8px] mb-[30px] -mx-[20px] px-[20px]">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-[160px] h-[120px] bg-[#d9d9d9] shrink-0" />
          ))}
        </div>

        {/* Footer */}
        <footer className="text-white pt-[20px] flex flex-col items-center">
          <div className="w-[60px] h-[94px] relative mb-[16px]">
            <Image src="/images/footer-logo.svg" alt="KAKE PHOTO" fill className="object-contain" />
          </div>
          <div className="flex items-center gap-[8px] mb-[16px]">
            <Image src="/images/instagram-icon.svg" alt="Instagram" width={14} height={14} />
            <span className="text-[12px] tracking-[1px]">Instagram</span>
          </div>
          <p className="text-[10px] tracking-[0.8px] mb-[8px]">プライバシーポリシー | 特定商取引法</p>
          <p className="text-[9px] tracking-[0.8px]">©︎KAKE PHOTO All Rights Reserved.</p>
        </footer>
      </section>
    </main>
  );
}

export default function Home() {
  return (
    <ScaledWrapper
      spChildren={<SpPage />}
    >
      <main className="w-[1920px]">
        {/* ===== FV (First View) — Figma: 1920x1450 ===== */}
        <section className="relative w-[1920px] h-[1450px] overflow-hidden">
          {/* Background photo — Figma: left:-51.41% top:-33.59% w:152.55% h:134.68% */}
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src="/images/fv-bg.jpg"
              alt="KAKE PHOTO メインビジュアル"
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
              alt="KAKE PHOTO"
              width={269}
              height={30}
            />
          </div>
          {/* センターロゴ — Figma: x=820 y=312 w=280 h=441 */}
          <div className="absolute top-[312px] left-[820px] z-10">
            <Image
              src="/images/logo-center.svg"
              alt="KAKE PHOTO"
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
        <section className="relative w-[1920px] h-[1695px] bg-[#710b26] text-white overflow-hidden">
          {/* 灰色矩形1 — Figma: x=1500 y=168 w=320 h=400 */}
          <div className="absolute top-[168px] left-[1500px] w-[320px] h-[400px] bg-[#d9d9d9] opacity-60" />
          {/* 灰色矩形2 — Figma: x=0 y=568 w=429 h=350 */}
          <div className="absolute top-[568px] left-0 w-[429px] h-[350px] bg-[#d9d9d9] opacity-60" />
          {/* 灰色矩形3 — Figma: x=172 y=1231 w=352 h=364 */}
          <div className="absolute top-[1231px] left-[172px] w-[352px] h-[364px] bg-[#d9d9d9] opacity-60" />

          {/* Concept写真 — Figma: x=1430 y=983 w=390 h=480 */}
          <div className="absolute top-[983px] left-[1430px] w-[390px] h-[480px] overflow-hidden">
            <Image
              src="/images/concept-photo.jpg"
              alt="掛け軸のある暮らし"
              fill
              className="object-cover"
            />
          </div>

          {/* Concept文字 — Figma: x=99 y=183 */}
          <h2 className="absolute top-[183px] left-[99px] text-[40px] tracking-[16px] text-white">
            Concept
          </h2>

          {/* 縦書き — Figma: 右列x=967 左列x=923 y=340 gap=16px */}
          <div className="absolute top-[340px] left-[923px] flex gap-[16px]">
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
          <div className="absolute top-[821px] left-[655px] w-[613px] text-center text-[22px] tracking-[4.4px] leading-[50px]">
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
          <div className="absolute top-0 left-0 w-full h-[64px] bg-[#E7E8B2] z-10" />
          <div className="absolute bottom-0 left-0 w-full h-[64px] bg-[#E7E8B2] z-10" />
          {/* Side borders — Figma: #909AC3 w=26 */}
          <div className="absolute top-[64px] left-0 w-[26px] h-[calc(100%-128px)] bg-[#909AC3] z-10" />
          <div className="absolute top-[64px] right-0 w-[26px] h-[calc(100%-128px)] bg-[#909AC3] z-10" />
        </section>

        {/* ===== Message — Sticky Scroll ===== */}
        <StickyMessageSection />

        {/* ===== Order + Footer — Figma: bg 1920x3143 ===== */}
        <section className="relative w-[1920px] h-[3143px] bg-[#710b26] text-white">
          <h2 className="absolute z-10 left-[99px] top-[118px] text-[40px] tracking-[16px]">Order</h2>
          <p className="absolute z-10 left-[523px] top-[213px] w-[875px] text-[18px] tracking-[3.6px] leading-[50px] text-center" style={{ fontFamily: 'Zen Old Mincho' }}>
            掛け軸は、　オーダーにてお作りしています。<br />写真の内容だけでなく、　裂地の色や質感、　全体の配色バランスまで。<br />空間や飾る場所を想像しながら、<br />一緒に仕立てていく時間も　大切にしています。
          </p>

          {/* 特注オーダーメイド — Figma: x=99 y=484 w=1721 h=557 */}
          <div className="absolute left-[99px] top-[484px] w-[1721px] h-[557px] bg-[#FFFFFB] text-[#710b26] rounded-sm overflow-hidden">
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
            <span className="absolute left-[1520px] top-[157px] text-[18px] tracking-[7.2px] text-black leading-[50px]">00,000円</span>
            <span className="absolute left-[1532px] top-[182px] text-[14px] tracking-[2.8px] text-black leading-[50px]">(税込/送料込)</span>
            {/* 説明テキスト */}
            <p className="absolute left-[802px] top-[260px] w-[860px] text-[18px] tracking-[7.2px] text-black leading-[30px]">
              写真の印刷サイズは、ハガキサイズからA3サイズまで自由にお選びいただけます。<br />使用する裂地（きれじ）や完成形に制限はなく、自由なカスタマイズが可能です。ご自身のこだわりを妥協なく形にしたい方には、こちらのコースをおすすめいたします。
            </p>
          </div>

          {/* 装飾ドット — Figma: x=450 y=997 w=52 h=5 */}
          <Image src="/images/deco-arrow-miyabi.svg" alt="" width={52} height={5} className="absolute left-[450px] top-[997px]" />

          {/* 雅・極コース背景 — Figma: x=99 y=1080 w=1721 h=522 */}
          <div className="absolute left-[99px] top-[1080px] w-[1721px] h-[522px] bg-[#FFFFFB] text-[#710b26] rounded-sm overflow-hidden">
            {/* 雅コース */}
            <h3 className="absolute left-[54px] top-[54px] text-[24px] tracking-[9.6px] leading-[50px]">雅コース</h3>
            <span className="absolute left-[211px] top-[53px] text-[18px] tracking-[7.2px] text-[#323232] leading-[50px]">Photo sizeA4</span>
            <div className="absolute left-[54px] top-[125px] w-[382px] h-[252px] overflow-hidden">
              <Image src="/images/order-photo-miyabi.jpg" alt="雅コース" fill className="object-cover" />
            </div>
            <p className="absolute left-[475px] top-[119px] w-[326px] text-[16px] tracking-[4.8px] text-black leading-[30px]">
              お写真をA4サイズに拡大印刷して仕上げます。あらかじめ厳選された裂地（きれじ）や形状のラインナップから、お好みの組み合わせをお選びいただき、理想の完成イメージを形にしていきます。
            </p>
            <div className="absolute left-[54px] top-[428px] text-[14px] tracking-[5.6px] text-black leading-[30px]">
              <p>縦：100-120cm</p>
              <p>横23cm~</p>
            </div>
            <span className="absolute left-[327px] top-[411px] text-[18px] tracking-[7.2px] text-black leading-[50px]">46,000円</span>
            <span className="absolute left-[327px] top-[443px] text-[14px] tracking-[2.8px] text-black leading-[50px]">(税込/送料込)</span>

            {/* 装飾ドット雅 — Figma: left=215 top=398 w=52 h=5 */}
            <Image src="/images/deco-arrow-miyabi-card.svg" alt="" width={52} height={5} className="absolute left-[215px] top-[398px]" />

            {/* 極コース */}
            <h3 className="absolute left-[913px] top-[51px] text-[24px] tracking-[9.6px] leading-[50px]">極コース</h3>
            <span className="absolute left-[1070px] top-[53px] text-[18px] tracking-[7.2px] text-[#323232] leading-[50px]">Photo sizeA3</span>
            <div className="absolute left-[913px] top-[125px] w-[382px] h-[252px] overflow-hidden">
              <Image src="/images/order-photo-kiwami.jpg" alt="極コース" fill className="object-cover" />
            </div>
            <p className="absolute left-[1334px] top-[119px] w-[326px] text-[16px] tracking-[4.8px] text-black leading-[30px]">
              お写真を、存在感あふれるA3サイズに拡大印刷いたします。<br />ダイナミックな大きさでありながら、細部まで鮮明に再現されるため、大切な思い出がより一層の臨場感とともに蘇ります。お部屋の主役となる十分なサイズ感は、ご自宅用はもちろん、記念品やお祝いの品としても大変喜ばれる仕上がりです。
            </p>
            <div className="absolute left-[918px] top-[417px] text-[14px] tracking-[5.6px] text-black leading-[30px]">
              <p>縦：110-130cm</p>
              <p>横：30cm~</p>
            </div>
            <span className="absolute left-[1176px] top-[411px] text-[18px] tracking-[7.2px] text-black leading-[50px]">77,000円</span>
            <span className="absolute left-[1181px] top-[436px] text-[14px] tracking-[2.8px] text-black leading-[50px]">(税込/送料込)</span>
            {/* 装飾ドット — Figma: left=1078 top=398 w=52 h=5 */}
            <Image src="/images/deco-arrow-kiwami.svg" alt="" width={52} height={5} className="absolute left-[1078px] top-[398px]" />
          </div>

          {/* オーダーの流れ — Figma: x=300 y=1804 w=1320 */}
          <div className="absolute left-[300px] top-[1804px] w-[1320px]">
            <h3 className="text-[28px] tracking-[11.2px] text-center underline mb-[60px]">
              オーダーの流れ
            </h3>
            <div>
              {[
                { step: "Step1", text: "まずは公式LINEもしくはお問合せからご連絡ください。" },
                { step: "Step2", text: "職人から詳しいヒアリングの連絡をさせていただきます。" },
                { step: "Step3", text: "写真からおすすめの裂地を選定させていただきます。この時点でご希望の色味などがございましたらお知らせください。" },
                { step: "Step4", text: "実際に使用する裂地を確認していただいたのち、制作に移らせていただきます。" },
              ].map((item, i) => (
                <div key={i} className="border-b border-white/30 py-[20px] flex gap-[30px] items-baseline">
                  <span className="text-[22px] tracking-[8.8px] shrink-0 w-[131px]">{item.step}</span>
                  <span className="text-[18px] tracking-[3.6px]">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Buttons — Figma: y=2275 */}
          <a
            href="#"
            className="absolute left-[100px] top-[2275px] flex items-center justify-center gap-4 w-[810px] h-[110px] bg-[#f7f7f7] border border-white text-[#710b26] text-[22px] tracking-[4.4px] hover:opacity-90 transition-opacity"
          >
            KAKE PHOTO 公式LINEからオーダーする
            <Image src="/images/line-icon.svg" alt="LINE" width={57} height={54} />
          </a>
          <a
            href="#"
            className="absolute left-[1010px] top-[2275px] flex items-center justify-center gap-4 w-[810px] h-[110px] bg-[#f7f7f7] border border-white text-[#710b26] text-[22px] tracking-[4.4px] hover:opacity-90 transition-opacity"
          >
            お問い合わせからオーダーする
            <span className="inline-block w-[41px] h-[1px] bg-[#710b26] relative ml-2">
              <span className="absolute right-0 top-1/2 -translate-y-1/2 border-r-[2px] border-t-[2px] border-[#710b26] w-[8px] h-[8px] rotate-45" />
            </span>
          </a>

          {/* 注意書き — Figma: y≈2455 */}
          <p className="absolute left-0 top-[2455px] w-full text-center text-[14px] tracking-[1px]">
            ※使用する裂地や仕様により、金額は変動します。ご希望やご予算に合わせて、無理のない形をご提案しますのでお気軽にご相談ください。
          </p>

          {/* Gallery — Figma: x=-30 y=2574 w=1979 h=280 */}
          <div className="absolute left-[-30px] top-[2574px] flex">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-[380px] h-[280px] bg-[#d9d9d9] shrink-0 ml-[19px] first:ml-0" />
            ))}
          </div>

          {/* Footer — Figma: x=100 y=2926 w=1720 h=217 */}
          <footer className="absolute left-[100px] top-[2926px] w-[1720px] h-[217px] text-white">
            {/* Logo */}
            <div className="absolute left-0 top-0 w-[110px] h-[173px]">
              <Image
                src="/images/footer-logo.svg"
                alt="KAKE PHOTO"
                fill
                className="object-contain"
              />
            </div>

            {/* Instagram */}
            <div className="absolute right-0 top-[33px] flex items-center gap-[12px]">
              <Image
                src="/images/instagram-icon.svg"
                alt="Instagram"
                width={18}
                height={18}
              />
              <span className="text-[18px] tracking-[1.8px]">Instagram</span>
            </div>

            {/* Copyright */}
            <p className="absolute left-[738px] top-[167px] text-[12px] tracking-[1.2px]">
              ©︎KAKE PHOTO All Rights Reserved.
            </p>

            {/* プライバシーポリシー */}
            <p className="absolute right-0 top-[161px] text-[14px] tracking-[1.4px]">
              プライバシーポリシー | 特定商取引法
            </p>
          </footer>
        </section>
      </main>
    </ScaledWrapper>
  );
}
