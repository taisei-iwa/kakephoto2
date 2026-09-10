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

const content = [
  {
    title: "Article 1 (Personal Information)",
    body: "“Personal information” refers to “personal information” as defined under the Act on the Protection of Personal Information — that is, information about a living individual that can identify a specific person by name, date of birth, address, phone number, contact, or other description, and information that on its own can identify a specific individual (personal identification information) such as data on appearance, fingerprints, voiceprints, and the insurer number on a health insurance card.",
  },
  {
    title: "Article 2 (Handling of Image Data Entrusted to Us)",
    body: "In providing this service, we strictly manage image data (photographic data, etc.) entrusted to us by customers as follows.",
    list: [
      "Purpose of use: Image data entrusted to us will be used only for the production of hanging scrolls (printing and mounting), final review, and shipping. We will not use the data for advertising or provide it to third parties without permission.",
      "Retention period: Because each item is custom made, we retain image data for two weeks after shipment in case of remaking or shipping incidents. After that period, the data is promptly and irreversibly deleted under our responsibility.",
      "Rights infringement: We assume that the customer either holds the rights to the submitted image data (including copyright) or has obtained permission from the rightful holder. We will not accept orders with images that infringe on the copyright, portrait rights, or privacy of others. Should any rights dispute arise, we will not be held responsible.",
    ],
  },
  {
    title: "Article 3 (Methods of Collecting Personal Information)",
    body: "We may ask customers for personal information such as name, date of birth, address, phone number, and email address when registering to use the service.",
  },
  {
    title: "Article 4 (Purpose of Use of Personal Information)",
    body: "We use personal information for the following purposes.",
    list: [
      "To provide and operate this service (shipping products, billing, etc.)",
      "To respond to customer inquiries (including identity verification)",
      "To send necessary notifications such as maintenance and important updates",
      "To identify and refuse use by customers who violate the terms of use or attempt to use the service for fraudulent or improper purposes",
    ],
  },
  {
    title: "Article 5 (Provision of Personal Information to Third Parties)",
    body: "Except in the following cases, we will not provide personal information to third parties without the prior consent of the user.",
    list: [
      "When entrusting shipping operations to a delivery company",
      "When required by law",
      "When necessary to protect a person's life, body, or property, and obtaining the user's consent is difficult",
    ],
  },
  {
    title: "Article 6 (Analytics and Advertising Tools)",
    body: "To understand how this website is used, to improve our service, and to measure the effect of our advertising, we use the tools listed below. These tools use cookies and similar technologies to collect information about browsing. They do not collect information that directly identifies you, such as your name or address.",
    list: [
      "Google Analytics (Google LLC): used to analyse how this website is used. Where Google signals is enabled, we may receive aggregated estimates of age, gender and interests for users who are signed in to Google and have allowed ad personalisation. You can opt out through the browser add-on provided by Google, or through the ad settings of your Google account. (Terms https://marketingplatform.google.com/about/analytics/terms/ , Privacy Policy https://policies.google.com/privacy)",
      "Meta Pixel (Meta Platforms, Inc.): used to measure visits and enquiries on this website, and to deliver and measure advertising. You can opt out through the ad settings of Facebook and Instagram. (Privacy Policy https://www.facebook.com/privacy/policy/)",
      "You may also refuse this collection by disabling cookies in your browser. Some features of this website may then be unavailable.",
    ],
  },
  {
    title: "Article 7 (Contact Information)",
    body: "For inquiries regarding this policy, please contact us at the following.\n\nBusiness Name: Iwasaki Seishodo\nAddress: 355 Iwaya, Nanto City, Toyama 932-0203, Japan\nEmail: iwasaki.seishodo@gmail.com",
  },
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
          <h1 className="text-[22px] tracking-[4px] mb-[20px] text-center">Privacy Policy</h1>
          <p className="text-[12px] leading-[22px] tracking-[0.5px] text-center mb-[50px] text-black">
            Iwasaki Seishodo (hereafter, “we”) sets forth the following privacy policy regarding the handling of users’ personal information for the service “KAKEPHOTO” (hereafter, “the service”) provided on this website.
          </p>
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
            <h1 className="text-[48px] tracking-[12px] mb-[40px] text-center font-normal">Privacy Policy</h1>
            <p className="text-[18px] leading-[36px] tracking-[1px] text-center mb-[100px] text-black">
              Iwasaki Seishodo (hereafter, &ldquo;we&rdquo;) sets forth the following privacy policy regarding the handling<br />
              of users&rsquo; personal information for the service &ldquo;KAKEPHOTO&rdquo; (hereafter, &ldquo;the service&rdquo;) provided on this website.
            </p>
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

export default function PrivacyPolicyPageEn() {
  return <ScaledWrapper spChildren={<SpPage />}><PcPage /></ScaledWrapper>;
}
