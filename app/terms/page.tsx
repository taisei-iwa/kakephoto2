"use client";
import Image from "@/components/VImage";
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

const content: { title: string; body: string; list?: string[] }[] = [
  {
    "title": "第1条（適用）",
    "body": "本規約は、岩﨑精正堂（以下、「当店」といいます）が本ウェブサイトで提供するサービス「かけフォト」（オーダーシミュレーターおよび「写真に合わせてデザインする」機能を含みます。以下、「本サービス」といいます）の利用条件を定めるものです。本サービスをご利用いただくお客様は、本規約に同意したものとみなします。\nご注文時のお支払い・キャンセル等の条件は、ご利用ガイドに定めるところによります。"
  },
  {
    "title": "第2条（禁止事項）",
    "body": "本サービスのご利用にあたり、以下の行為を禁止します。",
    "list": [
      "他人の著作権、肖像権、プライバシーその他の権利を侵害するお写真を使うこと",
      "プログラム等を用いて、本サービスを自動で、または短い時間に大量に利用すること",
      "本ウェブサイトの文章、画像、裂地の画像、本サービスで作成した絵柄、プログラムを、当店の許可なく複製、転載、改変、販売その他の方法で利用すること",
      "本サービスの仕組みを解析すること、または同様のサービスを作る目的で本サービスを利用すること",
      "法令または公序良俗に反する行為、当店または第三者に不利益を与える行為",
      "その他、当店が不適切と判断する行為"
    ]
  },
  {
    "title": "第3条（写真に合わせてデザインする機能）",
    "body": "「写真に合わせてデザインする」機能は、以下の性質をご理解のうえご利用ください。",
    "list": [
      "描きおこした絵柄は、仕上がりの見本です。印刷・仕立ての色味や質感は、画面の表示と異なることがあります。",
      "絵柄は AI を用いて作成するため、お写真やご要望に合わない提案となる場合があります。ご注文の際は、職人が内容を確かめ、必要に応じてご提案いたします。",
      "適切な運営のため、ご利用の回数に上限を設けています。",
      "お写真の取り扱いは、プライバシーポリシー第7条に定めます。"
    ]
  },
  {
    "title": "第4条（権利の帰属）",
    "body": "お客様のお写真の権利は、お客様に帰属します。\n本ウェブサイトの文章、画像、裂地の画像、プログラム、および本サービスで作成した絵柄に関する権利は、当店または正当な権利者に帰属します。お客様は、ご注文いただいた掛軸を飾ること、また掛軸や本サービスで作成した絵柄の画像をご自身の SNS 等で紹介することができます。"
  },
  {
    "title": "第5条（本サービスの変更・中断）",
    "body": "当店は、システムの保守、障害その他やむを得ない事情により、予告なく本サービスの全部または一部を変更、中断または終了することがあります。"
  },
  {
    "title": "第6条（免責）",
    "body": "当店は、当店の故意または過失による場合を除き、本サービスの利用に関してお客様に生じた損害について責任を負いません。\n当店の軽過失（重大な過失を除く過失をいいます）による場合、当店が賠償する損害は、現実に生じた直接かつ通常の損害に限ります。"
  },
  {
    "title": "第7条（規約の変更）",
    "body": "当店は、必要に応じて本規約を変更することがあります。変更する場合は、変更の内容と効力が生じる日を、本ウェブサイトに掲載してお知らせします。"
  },
  {
    "title": "第8条（準拠法・管轄）",
    "body": "本規約は日本法に準拠します。本サービスに関して紛争が生じた場合は、富山地方裁判所を第一審の専属的合意管轄裁判所とします。"
  },
  {
    "title": "第9条（お問い合わせ窓口）",
    "body": "本規約に関するお問い合わせは、下記の窓口までお願いいたします。\n\n屋号：岩﨑精正堂\n住所：〒932-0203 富山県南砺市岩屋355\nEメールアドレス：iwasaki.seishodo@gmail.com\n\n制定日：2026年10月10日"
  }
];

function Section({ title, body, list, delay }: { title: string; body: string; list?: string[]; delay: number }) {
  return (
    <FadeInOnScroll delay={delay}>
      <div className="mb-[50px] md:mb-[80px]">
        <h3 className="text-[14px] md:text-[22px] tracking-[2px] md:tracking-[4px] mb-[16px] md:mb-[24px] font-medium">{title}</h3>
        <p className="text-[12px] md:text-[16px] leading-[24px] md:leading-[36px] tracking-[1px] md:tracking-[2px] text-black whitespace-pre-line">{body}</p>
        {list && (
          <ul className="mt-[12px] md:mt-[20px] space-y-[10px] md:space-y-[16px]">
            {list.map((item, i) => (
              <li key={i} className="text-[12px] md:text-[16px] leading-[22px] md:leading-[34px] tracking-[1px] md:tracking-[2px] text-black pl-[16px] md:pl-[24px] relative before:content-[''] before:absolute before:left-0 before:top-[10px] before:w-[6px] before:h-[6px] before:bg-[#710b26] before:rounded-full before:md:top-[14px]">
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </FadeInOnScroll>
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
          <h1 className="text-[24px] tracking-[6px] mb-[20px] text-center">利用規約</h1>
          <p className="text-[12px] leading-[22px] tracking-[1px] text-center mb-[50px] text-black">
            岩﨑精正堂（以下、「当店」といいます）は、本ウェブサイト上で提供するサービス「かけフォト」（以下、「本サービス」といいます）の利用条件について、以下のとおり利用規約（以下、「本規約」といいます）を定めます。
          </p>
        </FadeInOnScroll>
        {content.map((c, i) => <Section key={i} title={c.title} body={c.body} list={c.list} delay={0.05 * i} />)}
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
            <h1 className="text-[48px] tracking-[16px] mb-[40px] text-center font-normal">利用規約</h1>
            <p className="text-[18px] leading-[40px] tracking-[3px] text-center mb-[100px] text-black">
              岩﨑精正堂（以下、「当店」といいます）は、本ウェブサイト上で提供するサービス「かけフォト」（以下、「本サービス」といいます）の<br />利用条件について、以下のとおり利用規約（以下、「本規約」といいます）を定めます。
            </p>
          </FadeInOnScroll>
          <div className="px-[100px]">
            {content.map((c, i) => <Section key={i} title={c.title} body={c.body} list={c.list} delay={0.05 * i} />)}
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

export default function TermsPage() {
  return <ScaledWrapper spChildren={<SpPage />}><PcPage /></ScaledWrapper>;
}
