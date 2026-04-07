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

const content = [
  {
    title: "第1条（個人情報）",
    body: "「個人情報」とは、個人情報保護法にいう「個人情報」を指すものとし、生存する個人に関する情報であって、当該情報に含まれる氏名、生年月日、住所、電話番号、連絡先、その他の記述等により特定の個人を識別できる情報及び容貌、指紋、声紋にかかるデータ、及び健康保険証の保険者番号などの当該情報単体から特定の個人を識別できる情報（個人識別情報）を指します。",
  },
  {
    title: "第2条（お預かりする画像データの取り扱いについて）",
    body: "当店は、本サービスの提供にあたり、お客様よりお預かりした画像データ（写真データ等）を以下の通り厳重に管理いたします。",
    list: [
      "利用目的：お預かりした画像データは、掛け軸の制作（印刷、表装）、仕上がり確認、および商品発送の目的のみに使用いたします。無断で広告宣伝や第三者への提供を行うことはございません。",
      "データの保管期間：商品はオーダーメイド品であるため、万が一の再制作や輸送事故に備え、商品発送後2週間はデータを保管いたしますが、期間経過後は速やかに当店責任のもと、復元不可能な状態で削除・廃棄いたします。",
      "権利の侵害：お客様が提供する画像データは、お客様自身が著作権等の権利を有するか、または正当な権利者から使用許諾を得たものであることを前提とします。第三者の著作権、肖像権、プライバシー権などを侵害する画像でのご注文はお断りさせていただきます。万一、権利侵害に関するトラブルが発生した場合、当店は一切の責任を負いません。",
    ],
  },
  {
    title: "第3条（個人情報の収集方法）",
    body: "当店は、ユーザーが利用登録をする際に氏名、生年月日、住所、電話番号、メールアドレスなどの個人情報をお尋ねすることがあります。",
  },
  {
    title: "第4条（個人情報の利用目的）",
    body: "当店が個人情報を利用する目的は、以下のとおりです。",
    list: [
      "本サービスの提供・運営のため（商品の発送、代金の請求など）",
      "ユーザーからのお問い合わせに回答するため（本人確認を行うことを含む）",
      "メンテナンス、重要なお知らせなど必要に応じたご連絡のため",
      "利用規約に違反したユーザーや、不正・不当な目的でサービスを利用しようとするユーザーの特定をし、ご利用をお断りするため",
    ],
  },
  {
    title: "第5条（個人情報の第三者提供）",
    body: "当店は、次に掲げる場合を除いて、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供することはありません。",
    list: [
      "商品の配送業務を配送業者へ委託する場合",
      "法令に基づく場合",
      "人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるとき",
    ],
  },
  {
    title: "第6条（お問い合わせ窓口）",
    body: "本ポリシーに関するお問い合わせは、下記の窓口までお願いいたします。\n\n屋号：岩﨑精正堂\n住所：〒932-0203 富山県南砺市岩屋355\nEメールアドレス：iwasaki.seishodo@gmail.com",
  },
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
          <h1 className="text-[24px] tracking-[6px] mb-[20px] text-center">プライバシーポリシー</h1>
          <p className="text-[12px] leading-[22px] tracking-[1px] text-center mb-[50px] text-black">
            岩﨑精正堂（以下、「当店」といいます）は、本ウェブサイト上で提供するサービス「かけフォト」（以下、「本サービス」といいます）における、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下、「本ポリシー」といいます）を定めます。
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
            <h1 className="text-[48px] tracking-[16px] mb-[40px] text-center font-normal">プライバシーポリシー</h1>
            <p className="text-[18px] leading-[40px] tracking-[3px] text-center mb-[100px] text-black">
              岩﨑精正堂（以下、「当店」といいます）は、本ウェブサイト上で提供するサービス「かけフォト」（以下、「本サービス」といいます）における、<br />ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下、「本ポリシー」といいます）を定めます。
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

export default function PrivacyPolicyPage() {
  return <ScaledWrapper spChildren={<SpPage />}><PcPage /></ScaledWrapper>;
}
