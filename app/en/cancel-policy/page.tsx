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

function PolicyContent() {
  return (
    <>
      <FadeInOnScroll delay={0.05}>
        <div className="mb-[50px] md:mb-[80px]">
          <h3 className="text-[14px] md:text-[22px] tracking-[1px] md:tracking-[3px] mb-[16px] md:mb-[24px] font-medium">Shipping</h3>
          <ul className="space-y-[10px] md:space-y-[16px]">
            {[
              "Japan (domestic): Shipping is charged separately from the product price (actual cost).",
              "Overseas: We do ship internationally, but the fee varies by destination and method. We will provide a custom quote — please reach out via the contact form.",
              "Customs & import duties: For international shipments, any customs or import duties at destination are the recipient's responsibility.",
              "Carriers: Yamato Transport (domestic); EMS or DHL (international).",
              "Lead time: As a fully made-to-order product, items ship approximately 1–2 months after the order (design confirmation).",
            ].map((item, i) => (
              <li key={i} className="text-[12px] md:text-[16px] leading-[22px] md:leading-[34px] tracking-[0.5px] md:tracking-[1px] text-black pl-[16px] md:pl-[24px] relative before:content-[''] before:absolute before:left-0 before:top-[10px] before:w-[6px] before:h-[6px] before:bg-[#710b26] before:rounded-full before:md:top-[14px]">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </FadeInOnScroll>

      <FadeInOnScroll delay={0.1}>
        <div className="mb-[50px] md:mb-[80px]">
          <h3 className="text-[14px] md:text-[22px] tracking-[1px] md:tracking-[3px] mb-[16px] md:mb-[24px] font-medium">About Cancellations</h3>
          <p className="text-[12px] md:text-[16px] leading-[24px] md:leading-[36px] tracking-[0.5px] md:tracking-[1px] text-black mb-[12px] md:mb-[20px]">
            KAKEPHOTO is a fully made-to-order product, crafted one piece at a time to match your photograph. For this reason, the following rules apply to cancellations once an order is confirmed.
          </p>
          <ul className="space-y-[10px] md:space-y-[16px]">
            <li className="text-[12px] md:text-[16px] leading-[22px] md:leading-[34px] tracking-[0.5px] md:tracking-[1px] text-black pl-[16px] md:pl-[24px] relative before:content-[''] before:absolute before:left-0 before:top-[10px] before:w-[6px] before:h-[6px] before:bg-[#710b26] before:rounded-full before:md:top-[14px]">
              <strong>Before production begins (image data and specifications not yet finalized):</strong><br />Cancellations are accepted free of charge.
            </li>
            <li className="text-[12px] md:text-[16px] leading-[22px] md:leading-[34px] tracking-[0.5px] md:tracking-[1px] text-black pl-[16px] md:pl-[24px] relative before:content-[''] before:absolute before:left-0 before:top-[10px] before:w-[6px] before:h-[6px] before:bg-[#710b26] before:rounded-full before:md:top-[14px]">
              <strong>After production begins (image data finalized, printing started):</strong><br />Due to the nature of the product, we cannot accept cancellations or changes after production begins. The full amount will be charged.
            </li>
          </ul>
        </div>
      </FadeInOnScroll>

      <FadeInOnScroll delay={0.15}>
        <div className="mb-[50px] md:mb-[80px]">
          <h3 className="text-[14px] md:text-[22px] tracking-[1px] md:tracking-[3px] mb-[16px] md:mb-[24px] font-medium">Returns and Exchanges</h3>
          <p className="text-[12px] md:text-[16px] leading-[24px] md:leading-[36px] tracking-[0.5px] md:tracking-[1px] text-black mb-[12px] md:mb-[20px]">
            We do not accept returns or exchanges for reasons of personal preference, such as &ldquo;different from what I imagined&rdquo; or &ldquo;ordered the wrong size.&rdquo;<br />
            However, in the cases below, please contact us within 7 days of delivery. We will repair or remake the item promptly, with all shipping and handling at our expense.
          </p>
          <ul className="space-y-[10px] md:space-y-[16px]">
            {[
              "If the item arrives soiled or damaged (including in-transit accidents)",
              "If the wrong item is delivered",
              "If there is a significant printing defect",
            ].map((item, i) => (
              <li key={i} className="text-[12px] md:text-[16px] leading-[22px] md:leading-[34px] tracking-[0.5px] md:tracking-[1px] text-black pl-[16px] md:pl-[24px] relative before:content-[''] before:absolute before:left-0 before:top-[10px] before:w-[6px] before:h-[6px] before:bg-[#710b26] before:rounded-full before:md:top-[14px]">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </FadeInOnScroll>

      <FadeInOnScroll delay={0.2}>
        <div className="mb-[50px] md:mb-[80px]">
          <h3 className="text-[14px] md:text-[22px] tracking-[1px] md:tracking-[3px] mb-[16px] md:mb-[24px] font-medium">* Notes on Color and Finish (Disclaimer)</h3>
          <p className="text-[12px] md:text-[16px] leading-[24px] md:leading-[36px] tracking-[0.5px] md:tracking-[1px] text-black mb-[12px] md:mb-[20px]">
            This service uses natural materials such as washi paper and kireji fabric. Please note the following before placing an order.
          </p>
          <ul className="space-y-[10px] md:space-y-[16px]">
            {[
              "The colors and texture you see on a smartphone or computer screen will differ from those of the photograph as printed on washi paper. The print may appear softer and more matte than on screen due to the nature of washi. This is not considered a defect.",
              "Because mounting is done by hand, the finished size may vary by a few millimeters.",
            ].map((item, i) => (
              <li key={i} className="text-[12px] md:text-[16px] leading-[22px] md:leading-[34px] tracking-[0.5px] md:tracking-[1px] text-black pl-[16px] md:pl-[24px] relative before:content-[''] before:absolute before:left-0 before:top-[10px] before:w-[6px] before:h-[6px] before:bg-[#710b26] before:rounded-full before:md:top-[14px]">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </FadeInOnScroll>

      <FadeInOnScroll delay={0.25}>
        <div className="mb-[50px] md:mb-[80px]">
          <h2 className="text-[18px] md:text-[32px] tracking-[3px] md:tracking-[7px] mb-[30px] md:mb-[50px] text-center font-normal">Notation Based on the Specified Commercial Transactions Act</h2>
          <div className="border-t border-[#710b26]/20">
            {[
              ["Seller", "Iwasaki Seishodo"],
              ["Operations Manager", "Masakatsu Iwasaki"],
              ["Address", "355 Iwaya, Nanto City, Toyama 932-0203, Japan"],
              ["Contact", "Phone: 0763-82-3529\nEmail: iwasaki.seishodo@gmail.com"],
              ["Sales Price", "Fully custom order (from ¥46,000, tax incl., shipping separate)"],
              ["Additional Fees", "Consumption tax, shipping fees, bank transfer fees (where applicable). For international shipments, any customs / import duties at destination."],
              ["Delivery Time", "As a fully made-to-order product, items ship approximately 1–2 months after the order (design confirmation).\n* Delivery may be delayed depending on demand and weather."],
              ["Payment Methods", "Credit card / Bank transfer / PayPal"],
              ["Payment Due", "Credit card & PayPal: charged at the time of order.\nBank transfer: please remit to our designated account within 7 days of placing the order."],
              ["Return Period", "Within 7 days of receiving the item (only for defective or wrong items)"],
              ["Return Shipping", "Defective or wrong item: at our expense.\nCustomer's preference: returns and exchanges are not accepted."],
            ].map(([label, value], i) => (
              <div key={i} className="flex border-b border-[#710b26]/20 py-[14px] md:py-[24px]">
                <div className="w-[160px] md:w-[340px] shrink-0 text-[11px] md:text-[16px] tracking-[0.5px] md:tracking-[1px] font-medium">{label}</div>
                <div className="text-[11px] md:text-[16px] leading-[20px] md:leading-[32px] tracking-[0.5px] md:tracking-[1px] text-black whitespace-pre-line">{value}</div>
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
    <main className="w-[375px] bg-[#FFFFFB] text-[#710b26] overflow-hidden min-h-screen pb-[60px]" style={{ fontFamily: "Zen Old Mincho, serif" }}>
      <div className="px-[20px] py-[30px]">
        <a href="/en"><Image src="/images/logo-horizontal.svg" alt="KAKEPHOTO" width={140} height={16} /></a>
      </div>
      <div className="px-[20px] pt-[40px]">
        <FadeInOnScroll>
          <h1 className="text-[20px] tracking-[3px] mb-[20px] text-center leading-[32px]">Shopping Guide</h1>
          <div className="h-[1px] bg-[#710b26]/20 mb-[50px]" />
        </FadeInOnScroll>
        <PolicyContent />
        <div className="mt-[60px] text-center">
          <a href="/en" className="text-[12px] tracking-[2px] border-b border-[#710b26] pb-1">Back to Top</a>
        </div>
      </div>
    </main>
  );
}

function PcPage() {
  return (
    <main className="w-[1920px] bg-[#FFFFFB] text-[#710b26] relative overflow-hidden min-h-screen" style={{ fontFamily: "Zen Old Mincho, serif" }}>
      <div className="absolute inset-0 z-0 opacity-[0.05]">
        <Image src="/images/message-bg.jpg" alt="" fill className="object-cover" />
      </div>
      <div className="relative z-10">
        <div className="px-[100px] py-[60px]">
          <a href="/en"><Image src="/images/logo-horizontal.svg" alt="KAKEPHOTO" width={280} height={32} /></a>
        </div>
        <div className="max-w-[1200px] mx-auto pt-[80px] pb-[160px]">
          <FadeInOnScroll>
            <h1 className="text-[44px] tracking-[10px] mb-[30px] text-center font-normal">Shopping Guide</h1>
            <div className="h-[1px] bg-[#710b26]/20 mx-auto w-[200px] mb-[100px]" />
          </FadeInOnScroll>
          <div className="px-[100px]">
            <PolicyContent />
          </div>
          <footer className="mt-[120px] text-center">
            <a href="/en" className="inline-flex items-center gap-6 group">
              <span className="w-[40px] h-[1px] bg-[#710b26] relative overflow-hidden">
                <span className="absolute inset-0 bg-[#710b26] -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out" />
              </span>
              <span className="text-[16px] tracking-[3px] group-hover:tracking-[5px] transition-all duration-300">Back to Top</span>
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

export default function CancelPolicyPageEn() {
  return <ScaledWrapper spChildren={<SpPage />}><PcPage /></ScaledWrapper>;
}
