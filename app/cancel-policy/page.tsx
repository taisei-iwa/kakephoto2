"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

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
  if (isSp) return <div style={{ width: 375, zoom: scale }}>{spChildren}</div>;
  return <div style={{ width: 1920, zoom: scale }}>{children}</div>;
}

function PolicyContent() {
  return (
    <>
      <FadeInOnScroll delay={0.05}>
        <div className="mb-[50px] md:mb-[80px]">
          <h3 className="text-[14px] md:text-[22px] tracking-[2px] md:tracking-[4px] mb-[16px] md:mb-[24px] font-medium">キャンセルについて</h3>
          <p className="text-[12px] md:text-[16px] leading-[24px] md:leading-[36px] tracking-[1px] md:tracking-[2px] text-black mb-[12px] md:mb-[20px]">
            当店の「かけフォト」は、お客様のお写真に合わせて一点ずつ制作する完全受注生産（オーダーメイド）商品です。そのため、ご注文確定後のキャンセルについては、以下の通り定めます。
          </p>
          <ul className="space-y-[10px] md:space-y-[16px]">
            <li className="text-[12px] md:text-[16px] leading-[22px] md:leading-[34px] tracking-[1px] md:tracking-[2px] text-black pl-[16px] md:pl-[24px] relative before:content-[''] before:absolute before:left-0 before:top-[10px] before:w-[6px] before:h-[6px] before:bg-[#710b26] before:rounded-full before:md:top-[14px]">
              <strong>制作開始前（画像データ確認・仕様確定前）：</strong><br />キャンセル可能です。手数料はいただきません。
            </li>
            <li className="text-[12px] md:text-[16px] leading-[22px] md:leading-[34px] tracking-[1px] md:tracking-[2px] text-black pl-[16px] md:pl-[24px] relative before:content-[''] before:absolute before:left-0 before:top-[10px] before:w-[6px] before:h-[6px] before:bg-[#710b26] before:rounded-full before:md:top-[14px]">
              <strong>制作開始後（画像データ確定・印刷工程着手後）：</strong><br />商品の性質上、制作開始後のキャンセル・変更はお受けできません。代金の100%を申し受けます。
            </li>
          </ul>
        </div>
      </FadeInOnScroll>

      <FadeInOnScroll delay={0.1}>
        <div className="mb-[50px] md:mb-[80px]">
          <h3 className="text-[14px] md:text-[22px] tracking-[2px] md:tracking-[4px] mb-[16px] md:mb-[24px] font-medium">返品・交換について</h3>
          <p className="text-[12px] md:text-[16px] leading-[24px] md:leading-[36px] tracking-[1px] md:tracking-[2px] text-black mb-[12px] md:mb-[20px]">
            「イメージと違う」「注文サイズを間違えた」など、お客様のご都合による返品・交換は固くお断りさせていただきます。<br />
            ただし、下記に該当する場合は、商品到着後7日以内にご連絡ください。送料・手数料ともに当店負担の上、早急に修復、または作り直しさせていただきます。
          </p>
          <ul className="space-y-[10px] md:space-y-[16px]">
            {[
              "商品が汚損・破損していた場合（配送中の事故含む）",
              "お申し込みの商品と異なる商品が届いた場合",
              "著しい印刷不良があった場合",
            ].map((item, i) => (
              <li key={i} className="text-[12px] md:text-[16px] leading-[22px] md:leading-[34px] tracking-[1px] md:tracking-[2px] text-black pl-[16px] md:pl-[24px] relative before:content-[''] before:absolute before:left-0 before:top-[10px] before:w-[6px] before:h-[6px] before:bg-[#710b26] before:rounded-full before:md:top-[14px]">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </FadeInOnScroll>

      <FadeInOnScroll delay={0.15}>
        <div className="mb-[50px] md:mb-[80px]">
          <h3 className="text-[14px] md:text-[22px] tracking-[2px] md:tracking-[4px] mb-[16px] md:mb-[24px] font-medium">※色味・仕上がりに関するご注意（免責事項）</h3>
          <p className="text-[12px] md:text-[16px] leading-[24px] md:leading-[36px] tracking-[1px] md:tracking-[2px] text-black mb-[12px] md:mb-[20px]">
            本サービスは和紙や布（裂地）という天然素材を使用しております。そのため、以下の点をご了承の上ご注文ください。
          </p>
          <ul className="space-y-[10px] md:space-y-[16px]">
            {[
              "お客様がスマートフォンやパソコンの画面（モニター）でご覧になる写真の色味と、実際に和紙へ印刷された際の色味・質感は異なります。和紙特有の柔らかい風合いとなるため、画面よりも淡く、マットな仕上がりになる場合がございます。これらは「不良品」としては扱いません。",
              "手作業による表装のため、仕上がりサイズに数ミリの誤差が生じる場合がございます。",
            ].map((item, i) => (
              <li key={i} className="text-[12px] md:text-[16px] leading-[22px] md:leading-[34px] tracking-[1px] md:tracking-[2px] text-black pl-[16px] md:pl-[24px] relative before:content-[''] before:absolute before:left-0 before:top-[10px] before:w-[6px] before:h-[6px] before:bg-[#710b26] before:rounded-full before:md:top-[14px]">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </FadeInOnScroll>

      <FadeInOnScroll delay={0.2}>
        <div className="mb-[50px] md:mb-[80px]">
          <h2 className="text-[18px] md:text-[32px] tracking-[4px] md:tracking-[10px] mb-[30px] md:mb-[50px] text-center font-normal">特定商取引法に基づく表記</h2>
          <div className="border-t border-[#710b26]/20">
            {[
              ["販売業者", "岩﨑精正堂"],
              ["運営統括責任者", "岩崎 正克"],
              ["所在地", "〒932-0203 富山県南砺市岩屋355"],
              ["連絡先", "電話：0763-82-3529\nMail：iwasaki.seishodo@gmail.com"],
              ["商品代金以外の必要料金", "消費税、送料、振込手数料（銀行振込の場合）"],
              ["引き渡し時期", "完全受注生産のため、ご注文（デザイン確定）から約1〜2ヶ月後に発送いたします。\n※混雑状況や天候により遅れる場合がございます。"],
              ["お支払い方法", "クレジットカード決済 / 銀行振込"],
            ].map(([label, value], i) => (
              <div key={i} className="flex border-b border-[#710b26]/20 py-[14px] md:py-[24px]">
                <div className="w-[120px] md:w-[300px] shrink-0 text-[11px] md:text-[16px] tracking-[1px] md:tracking-[2px] font-medium">{label}</div>
                <div className="text-[11px] md:text-[16px] leading-[20px] md:leading-[32px] tracking-[1px] md:tracking-[2px] text-black whitespace-pre-line">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </FadeInOnScroll>
    </>
  );
}

function SpPage() {
  return (
    <main className="w-[375px] bg-[#FFFFFB] text-[#710b26] overflow-hidden min-h-screen pb-[60px]" style={{ fontFamily: 'Zen Old Mincho, serif' }}>
      <div className="px-[20px] py-[30px]">
        <a href="/"><Image src="/images/logo-horizontal.svg" alt="KAKEPHOTO" width={140} height={16} /></a>
      </div>
      <div className="px-[20px] pt-[40px]">
        <FadeInOnScroll>
          <h1 className="text-[22px] tracking-[5px] mb-[20px] text-center leading-[36px]">キャンセル・返品・交換について</h1>
          <div className="h-[1px] bg-[#710b26]/20 mb-[50px]" />
        </FadeInOnScroll>
        <PolicyContent />
        <div className="mt-[60px] text-center">
          <a href="/" className="text-[12px] tracking-[2px] border-b border-[#710b26] pb-1">Topに戻る</a>
        </div>
      </div>
    </main>
  );
}

function PcPage() {
  return (
    <main className="w-[1920px] bg-[#FFFFFB] text-[#710b26] relative overflow-hidden min-h-screen" style={{ fontFamily: 'Zen Old Mincho, serif' }}>
      <div className="absolute inset-0 z-0 opacity-[0.05]">
        <Image src="/images/message-bg.jpg" alt="" fill className="object-cover" />
      </div>
      <div className="relative z-10">
        <div className="px-[100px] py-[60px]">
          <a href="/"><Image src="/images/logo-horizontal.svg" alt="KAKEPHOTO" width={280} height={32} /></a>
        </div>
        <div className="max-w-[1200px] mx-auto pt-[80px] pb-[160px]">
          <FadeInOnScroll>
            <h1 className="text-[48px] tracking-[16px] mb-[30px] text-center font-normal">キャンセル・返品・交換について</h1>
            <div className="h-[1px] bg-[#710b26]/20 mx-auto w-[200px] mb-[100px]" />
          </FadeInOnScroll>
          <div className="px-[100px]">
            <PolicyContent />
          </div>
          <footer className="mt-[120px] text-center">
            <a href="/" className="inline-flex items-center gap-6 group">
              <span className="w-[40px] h-[1px] bg-[#710b26] relative overflow-hidden">
                <span className="absolute inset-0 bg-[#710b26] -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out" />
              </span>
              <span className="text-[16px] tracking-[4px] group-hover:tracking-[6px] transition-all duration-300">Topに戻る</span>
            </a>
          </footer>
        </div>
      </div>
      <div className="pb-[100px] flex flex-col items-center opacity-50">
        <p className="text-[12px] tracking-[2px]">©︎KAKEPHOTO All Rights Reserved.</p>
      </div>
    </main>
  );
}

export default function CancelPolicyPage() {
  return <ScaledWrapper spChildren={<SpPage />}><PcPage /></ScaledWrapper>;
}
