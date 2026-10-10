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
    "title": "Article 1 (Scope)",
    "body": "These Terms set out the conditions for using the service “KAKEPHOTO” (including the Order Simulator and the “Design to match your photo” feature; hereafter, “the service”) provided on this website by Iwasaki Seishodo (hereafter, “we”). By using the service, you are deemed to have agreed to these Terms.\nConditions for payment, cancellation and other matters relating to orders are set out in our Shopping Guide."
  },
  {
    "title": "Article 2 (Prohibited Conduct)",
    "body": "When using the service, the following conduct is prohibited.",
    "list": [
      "Using photos that infringe the copyright, portrait rights, privacy or other rights of others",
      "Using the service automatically, or in large numbers within a short time, by means of programs or similar tools",
      "Copying, reposting, modifying, selling or otherwise using the text, images, fabric images, designs created with the service, or programs of this website without our permission",
      "Analysing how the service works, or using the service for the purpose of creating a similar service",
      "Conduct that violates laws or public order and morals, or that causes disadvantage to us or to third parties",
      "Any other conduct we deem inappropriate"
    ]
  },
  {
    "title": "Article 3 (The “Design to match your photo” Feature)",
    "body": "Please use the “Design to match your photo” feature with the following in mind.",
    "list": [
      "The designs drawn are previews of the finished piece. The colour and texture of the printed and mounted scroll may differ from what is shown on screen.",
      "Because the designs are created with AI, a proposal may not suit your photo or your wishes. When you place an order, our craftsman reviews the design and makes suggestions where needed.",
      "To keep the service running properly, the number of times it can be used is limited.",
      "The handling of your photos is set out in Article 7 of our Privacy Policy."
    ]
  },
  {
    "title": "Article 4 (Rights)",
    "body": "The rights to your photos remain with you.\nThe rights relating to the text, images, fabric images and programs of this website, and to the designs created with the service, belong to us or to their rightful holders. You may display the hanging scroll you ordered, and you may share images of the scroll or of designs created with the service on your own social media and similar channels."
  },
  {
    "title": "Article 5 (Changes to and Suspension of the Service)",
    "body": "We may change, suspend or end all or part of the service without notice due to system maintenance, failures or other unavoidable circumstances."
  },
  {
    "title": "Article 6 (Disclaimer)",
    "body": "Except where caused by our intent or negligence, we are not liable for any damage you incur in connection with your use of the service.\nWhere damage is caused by our slight negligence (negligence other than gross negligence), our liability is limited to direct and ordinary damage actually incurred."
  },
  {
    "title": "Article 7 (Changes to These Terms)",
    "body": "We may change these Terms as necessary. When we do, we will announce the content of the change and the date it takes effect on this website."
  },
  {
    "title": "Article 8 (Governing Law and Jurisdiction)",
    "body": "These Terms are governed by the laws of Japan. Any dispute relating to the service shall be subject to the exclusive jurisdiction of the Toyama District Court as the court of first instance."
  },
  {
    "title": "Article 9 (Contact Information)",
    "body": "For inquiries regarding these Terms, please contact us at the following.\n\nBusiness Name: Iwasaki Seishodo\nAddress: 355 Iwaya, Nanto City, Toyama 932-0203, Japan\nEmail: iwasaki.seishodo@gmail.com\n\nEstablished: October 10, 2026"
  }
];

function Section({ title, body, list, delay }: { title: string; body: string; list?: string[]; delay: number }) {
  return (
    <FadeInOnScroll delay={delay}>
      <div className="mb-[50px] md:mb-[80px]">
        <h3 className="text-[14px] md:text-[22px] tracking-[1px] md:tracking-[3px] mb-[16px] md:mb-[24px] font-medium">{title}</h3>
        <p className="text-[12px] md:text-[16px] leading-[24px] md:leading-[36px] tracking-[0.5px] md:tracking-[1px] text-black whitespace-pre-line">{body}</p>
        {list && (
          <ul className="mt-[12px] md:mt-[20px] space-y-[10px] md:space-y-[16px]">
            {list.map((item, i) => (
              <li key={i} className="text-[12px] md:text-[16px] leading-[22px] md:leading-[34px] tracking-[0.5px] md:tracking-[1px] text-black pl-[16px] md:pl-[24px] relative before:content-[''] before:absolute before:left-0 before:top-[10px] before:w-[6px] before:h-[6px] before:bg-[#710b26] before:rounded-full before:md:top-[14px]">
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
    <main className="w-[375px] bg-[#FFFFFB] text-[#710b26] overflow-hidden min-h-screen pb-[60px]" style={{ fontFamily: "Zen Old Mincho, serif" }}>
      <div className="px-[20px] py-[30px]">
        <a href="/en"><Image src="/images/logo-horizontal.svg" alt="KAKEPHOTO" width={140} height={16} /></a>
      </div>
      <div className="px-[20px] pt-[40px]">
        <FadeInOnScroll>
          <h1 className="text-[22px] tracking-[4px] mb-[20px] text-center">Terms of Use</h1>
          <p className="text-[12px] leading-[22px] tracking-[0.5px] text-center mb-[50px] text-black">
            Iwasaki Seishodo (hereafter, “we”) sets forth the following Terms of Use (hereafter, “these Terms”) for the service “KAKEPHOTO” (hereafter, “the service”) provided on this website.</p>
        </FadeInOnScroll>
        {content.map((c, i) => <Section key={i} title={c.title} body={c.body} list={c.list} delay={0.05 * i} />)}
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
            <h1 className="text-[48px] tracking-[12px] mb-[40px] text-center font-normal">Terms of Use</h1>
            <p className="text-[18px] leading-[36px] tracking-[1px] text-center mb-[100px] text-black">
              Iwasaki Seishodo (hereafter, &ldquo;we&rdquo;) sets forth the following Terms of Use (hereafter, &ldquo;these Terms&rdquo;)<br />for the service &ldquo;KAKEPHOTO&rdquo; (hereafter, &ldquo;the service&rdquo;) provided on this website.</p>
          </FadeInOnScroll>
          <div className="px-[100px]">
            {content.map((c, i) => <Section key={i} title={c.title} body={c.body} list={c.list} delay={0.05 * i} />)}
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

export default function TermsPageEn() {
  return <ScaledWrapper spChildren={<SpPage />}><PcPage /></ScaledWrapper>;
}
