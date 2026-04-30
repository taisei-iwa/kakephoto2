"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import Lenis from "lenis";

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

  useEffect(() => {
    const lenis = new Lenis({ syncTouch: true });
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
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

const CATEGORIES = ["雅コース", "極コース", "特注オーダーメイド", "その他"];

function useContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("sending");
    const formData = new FormData(e.currentTarget);
    formData.append("access_key", "6774cbd2-861f-4aba-8275-de16fa3f266d");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setStatus(data.success ? "done" : "error");
    } catch {
      setStatus("error");
    }
  };

  return { status, handleSubmit };
}

function ContactSp() {
  const { status, handleSubmit } = useContactForm();

  return (
    <main className="w-[375px] bg-[#FFFFFB] text-[#710b26] overflow-hidden min-h-screen pb-[60px]" style={{ fontFamily: 'Zen Old Mincho, serif' }}>
      <div className="px-[20px] py-[30px] flex justify-between items-center">
        <a href="/">
          <Image src="/images/logo-horizontal.svg" alt="KAKEPHOTO" width={140} height={16} />
        </a>
      </div>

      <div className="px-[20px] pt-[40px]">
        <FadeInOnScroll>
          <h1 className="text-[32px] tracking-[10px] mb-[40px] text-center">Contact</h1>
          <p className="text-[14px] leading-[28px] tracking-[1.5px] text-center mb-[60px] text-black">
            制作のご依頼、お見積りのご相談など、<br />
            こちらからお気軽にお問い合わせください。<br />
            一期一会の出会いを大切に、<br />
            職人がひとつずつ丁寧にお答えいたします。
          </p>
        </FadeInOnScroll>

        {status === "done" ? (
          <FadeInOnScroll>
            <div className="text-center py-[60px]">
              <p className="text-[18px] tracking-[3px] mb-[16px]">送信が完了しました</p>
              <p className="text-[13px] leading-[26px] tracking-[1px] text-black">
                お問い合わせありがとうございます。<br />
                内容を確認の上、担当者よりご連絡いたします。
              </p>
            </div>
          </FadeInOnScroll>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="max-w-[1000px] mx-auto"
          >
            <FadeInOnScroll delay={0.1}>
              <div className="flex flex-col gap-3 mb-[40px]">
                <label className="text-[14px] tracking-[2px] flex items-center gap-4">
                  お名前
                  <span className="text-[10px] bg-[#710b26] text-white px-2 py-[2px] rounded-sm">必須</span>
                </label>
                <input name="name" type="text" placeholder="例：山田 太郎" required className="bg-transparent border-b border-[#710b26]/30 py-2 focus:border-[#710b26] outline-none transition-colors text-[16px] tracking-[1px]" />
              </div>

              <div className="flex flex-col gap-3 mb-[40px]">
                <label className="text-[14px] tracking-[2px] flex items-center gap-4">
                  メールアドレス
                  <span className="text-[10px] bg-[#710b26] text-white px-2 py-[2px] rounded-sm">必須</span>
                </label>
                <input name="email" type="email" placeholder="例：example@mail.com" required className="bg-transparent border-b border-[#710b26]/30 py-2 focus:border-[#710b26] outline-none transition-colors text-[16px] tracking-[1px]" />
              </div>

              <div className="flex flex-col gap-3 mb-[40px]">
                <label className="text-[14px] tracking-[2px]">お電話番号</label>
                <input name="phone" type="tel" placeholder="例：09012345678" className="bg-transparent border-b border-[#710b26]/30 py-2 focus:border-[#710b26] outline-none transition-colors text-[16px] tracking-[1px]" />
              </div>

              <div className="flex flex-col gap-3 mb-[40px]">
                <label className="text-[14px] tracking-[2px] flex items-center gap-4">
                  お問い合わせ項目
                  <span className="text-[10px] bg-[#710b26] text-white px-2 py-[2px] rounded-sm">必須</span>
                </label>
                <div className="flex flex-col gap-3 mt-2">
                  {CATEGORIES.map((item) => (
                    <label key={item} className="flex items-center gap-3 cursor-pointer">
                      <input type="radio" name="category" value={item} required className="accent-[#710b26] w-[16px] h-[16px]" />
                      <span className="text-[14px] tracking-[1px] text-black">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 mb-[60px]">
                <label className="text-[14px] tracking-[2px] flex items-center gap-4">
                  メッセージ内容
                  <span className="text-[10px] bg-[#710b26] text-white px-2 py-[2px] rounded-sm">必須</span>
                </label>
                <textarea
                  name="message"
                  rows={5}
                  required
                  placeholder="ご相談内容や、掛け軸にされたい写真について詳しくお聞かせください。"
                  className="bg-transparent border border-[#710b26]/30 p-4 focus:border-[#710b26] outline-none transition-colors text-[14px] leading-[24px] tracking-[1px]"
                />
              </div>

              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full h-[64px] bg-[#710b26] text-white text-[16px] tracking-[4px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {status === "sending" ? "送信中..." : "送信する"}
              </button>

              {status === "error" && (
                <p className="text-center text-[12px] mt-4 text-red-600">送信に失敗しました。時間をおいて再度お試しください。</p>
              )}
            </FadeInOnScroll>
          </form>
        )}

        <div className="mt-[80px] text-center">
          <a href="/" className="text-[12px] tracking-[2px] border-b border-[#710b26] pb-1">
            Topに戻る
          </a>
        </div>
      </div>
    </main>
  );
}

function ContactPc() {
  const { status, handleSubmit } = useContactForm();

  return (
    <main className="w-[1920px] bg-[#FFFFFB] text-[#710b26] relative overflow-hidden min-h-screen" style={{ fontFamily: 'Zen Old Mincho, serif' }}>
      <div className="absolute inset-0 z-0 opacity-[0.05]">
        <Image src="/images/message-bg.jpg" alt="" fill className="object-cover" />
      </div>

      <div className="relative z-10">
        <div className="px-[100px] py-[60px]">
          <a href="/">
            <Image src="/images/logo-horizontal.svg" alt="KAKEPHOTO" width={280} height={32} />
          </a>
        </div>

        <div className="max-w-[1200px] mx-auto pt-[80px] pb-[160px]">
          <FadeInOnScroll>
            <h1 className="text-[64px] tracking-[24px] mb-[60px] text-center font-normal">Contact</h1>
            <p className="text-[20px] leading-[50px] tracking-[4px] text-center mb-[100px] text-black">
              制作のご依頼、お見積りのご相談など、こちらからお気軽にお問い合わせください。<br />
              一期一会の出会いを大切に、職人がひとつずつ丁寧にお答えいたします。
            </p>
          </FadeInOnScroll>

          {status === "done" ? (
            <FadeInOnScroll>
              <div className="text-center py-[100px]">
                <p className="text-[28px] tracking-[6px] mb-[24px]">送信が完了しました</p>
                <p className="text-[18px] leading-[40px] tracking-[2px] text-black">
                  お問い合わせありがとうございます。<br />
                  内容を確認の上、担当者よりご連絡いたします。
                </p>
              </div>
            </FadeInOnScroll>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="max-w-[1000px] mx-auto px-[100px]"
            >
              <FadeInOnScroll delay={0.1}>
                <div className="grid grid-cols-2 gap-[60px]">
                  <div className="flex flex-col gap-3 mb-[60px]">
                    <label className="text-[18px] tracking-[4px] flex items-center gap-4">
                      お名前
                      <span className="text-[12px] bg-[#710b26] text-white px-3 py-[2px] rounded-sm">必須</span>
                    </label>
                    <input name="name" type="text" placeholder="例：山田 太郎" required className="bg-transparent border-b border-[#710b26]/30 py-2 focus:border-[#710b26] outline-none transition-colors text-[20px] tracking-[2px]" />
                  </div>
                  <div className="flex flex-col gap-3 mb-[60px]">
                    <label className="text-[18px] tracking-[4px] flex items-center gap-4">
                      メールアドレス
                      <span className="text-[12px] bg-[#710b26] text-white px-3 py-[2px] rounded-sm">必須</span>
                    </label>
                    <input name="email" type="email" placeholder="例：example@mail.com" required className="bg-transparent border-b border-[#710b26]/30 py-2 focus:border-[#710b26] outline-none transition-colors text-[20px] tracking-[2px]" />
                  </div>
                </div>

                <div className="flex flex-col gap-3 mb-[60px]">
                  <label className="text-[18px] tracking-[4px]">お電話番号</label>
                  <input name="phone" type="tel" placeholder="例：09012345678" className="bg-transparent border-b border-[#710b26]/30 py-2 focus:border-[#710b26] outline-none transition-colors text-[20px] tracking-[2px]" />
                </div>

                <div className="flex flex-col gap-6 mb-[80px]">
                  <label className="text-[18px] tracking-[4px] flex items-center gap-6">
                    お問い合わせ項目
                    <span className="text-[12px] bg-[#710b26] text-white px-3 py-[2px] rounded-sm">必須</span>
                  </label>
                  <div className="flex gap-[40px] mt-2">
                    {CATEGORIES.map((item) => (
                      <label key={item} className="flex items-center gap-4 cursor-pointer group">
                        <input type="radio" name="category" value={item} required className="accent-[#710b26] w-[20px] h-[20px]" />
                        <span className="text-[18px] tracking-[2px] group-hover:opacity-80 transition-opacity text-black">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-6 mb-[100px]">
                  <label className="text-[18px] tracking-[4px] flex items-center gap-6">
                    メッセージ内容
                    <span className="text-[12px] bg-[#710b26] text-white px-3 py-[2px] rounded-sm">必須</span>
                  </label>
                  <textarea
                    name="message"
                    rows={6}
                    required
                    placeholder="具体的に検討されているお写真の内容や、飾りたい場所の雰囲気、納期のご希望などがございましたら自由にご記入ください。"
                    className="bg-transparent border border-[#710b26]/20 p-6 focus:border-[#710b26] outline-none transition-colors text-[20px] leading-[40px] tracking-[2px]"
                  />
                </div>

                <div className="flex flex-col items-center gap-6">
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="w-[500px] h-[90px] bg-[#710b26] text-white text-[20px] tracking-[8px] font-medium relative group overflow-hidden disabled:opacity-50"
                  >
                    <span className="relative z-10">{status === "sending" ? "送信中..." : "送信する"}</span>
                    <div className="absolute inset-0 bg-[#8c1433] -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out z-0" />
                  </button>
                  {status === "error" && (
                    <p className="text-[14px] tracking-[1px] text-red-600">送信に失敗しました。時間をおいて再度お試しください。</p>
                  )}
                </div>
              </FadeInOnScroll>
            </form>
          )}

          <footer className="mt-[200px] text-center">
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

export default function ContactPage() {
  return (
    <ScaledWrapper
      spChildren={<ContactSp />}
    >
      <ContactPc />
    </ScaledWrapper>
  );
}
