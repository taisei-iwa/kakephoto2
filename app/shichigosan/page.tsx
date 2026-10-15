import Image from "@/components/VImage";
import Link from "next/link";

// 七五三の広告(Instagram「B_家族七五三」)から来た人の着地ページ。2026-10-15 本人の依頼。
// 写真と文章は Instagram の七五三の投稿(2026-06-10)から。言葉は投稿のまま使い、書き足さない。
// 1 列のまま PC でも中央に置く(広告の流入はほぼスマホ)。
const BRAND = "#710b26";

function Photo({ src, alt, ratio }: { src: string; alt: string; ratio: string }) {
  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: ratio }}>
      <Image src={src} alt={alt} fill sizes="(max-width: 600px) 100vw, 560px" className="object-cover" />
    </div>
  );
}

function Lines({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-[2.1] tracking-[1.5px] text-black text-center whitespace-pre-line">{children}</p>;
}

export default function ShichigosanPage() {
  return (
    <main className="min-h-screen bg-[#FFFFFB] pb-[60px]" style={{ fontFamily: "Zen Old Mincho, serif", color: BRAND }}>
      <div className="mx-auto max-w-[560px]">
        {/* ロゴは白なので、シミュレーターと同じくブランド色の帯に載せる */}
        <header className="px-[20px] py-[18px]" style={{ background: BRAND }}>
          <Link href="/" aria-label="KAKEPHOTO トップへ">
            <Image src="/images/logo-horizontal.svg" alt="KAKEPHOTO" width={140} height={16} />
          </Link>
        </header>

        <section>
          {/* 横長の写真の中央を縦長に切り、掛け軸を大きく見せる */}
          <Photo src="/images/shichigosan-main.jpg" alt="七五三の姉妹の写真を仕立てた掛け軸" ratio="4 / 5" />
          <div className="px-[24px] pt-[36px] pb-[44px]">
            <h1 className="text-[26px] tracking-[6px] text-center mb-[24px] font-normal">七五三の記念に。</h1>
            <Lines>{"姉妹の晴れ姿を、\n一幅の掛け軸に仕立てました。"}</Lines>
          </div>
        </section>

        <section className="pb-[44px]">
          <Photo src="/images/shichigosan-detail.jpg" alt="エンジ色の裂地と金襴の中廻し" ratio="1440 / 984" />
          <div className="px-[24px] pt-[32px]">
            <Lines>{"エンジ色の裂地に、淡い金襴の中廻し。\n着物の色と、静かに響き合うように。"}</Lines>
          </div>
        </section>

        <section className="pb-[44px]">
          <Photo src="/images/shichigosan-room.jpg" alt="部屋の壁に飾った掛け軸" ratio="1440 / 960" />
          <div className="px-[24px] pt-[32px] flex flex-col gap-[20px]">
            <Lines>{"写真を撮って終わりにせず、仕立てて飾る。\n部屋の壁の空いたスペースを\n活用してみませんか？"}</Lines>
            <Lines>{"おじいちゃんおばあちゃんへの\nプレゼントとしても\nご好評いただいております。"}</Lines>
          </div>
        </section>

        <section className="pb-[44px]">
          <Photo src="/images/shichigosan-angle.jpg" alt="斜めから見た掛け軸" ratio="1440 / 973" />
        </section>

        {/* 料金と次の一歩。料金の表記はトップページと同じ */}
        <section className="mx-[20px] border-t border-[#710b26]/20 pt-[36px] text-center">
          <h2 className="text-[18px] tracking-[4px] mb-[20px] font-normal">料金</h2>
          <dl className="inline-grid grid-cols-[auto_auto] gap-x-[20px] gap-y-[6px] text-[15px] tracking-[2px] text-black text-left">
            <dt>A4 サイズ</dt>
            <dd>44,000円〜</dd>
            <dt>A3 サイズ</dt>
            <dd>77,000円〜</dd>
          </dl>
          <p className="text-[12px] tracking-[1px] text-black mt-[8px]">(税込/送料別)</p>
          <p className="text-[13px] leading-[2] tracking-[1px] text-black mt-[16px]">
            印刷する写真のサイズや使用する裂地によって
            <br />
            価格が変動します。
          </p>

          <p className="text-[14px] leading-[2] tracking-[1.5px] text-black mt-[36px] mb-[16px]">
            仕上がりイメージとお見積もりは、
            <br />
            オーダーシミュレーターを
            <br />
            ぜひご活用ください。
          </p>
          <div className="flex flex-col gap-[12px]">
            <a
              href="/simulator/index.html"
              data-track="shichigosan"
              className="flex items-center justify-center w-full h-[56px] text-white text-[14px] tracking-[2px]"
              style={{ background: BRAND }}
            >
              オーダーシミュレーター
            </a>
            <a
              href="https://line.me/R/ti/p/@447updgf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-[10px] w-full h-[56px] bg-[#f7f7f7] text-[14px] tracking-[2px]"
            >
              <Image src="/images/line-icon.svg" alt="" width={19} height={18} />
              LINE で相談する
            </a>
            <Link href="/contact" className="flex items-center justify-center w-full h-[56px] bg-[#f7f7f7] text-[14px] tracking-[2px]">
              フォームで相談する
            </Link>
          </div>
          <p className="text-[12px] leading-[1.9] tracking-[1px] text-black mt-[14px]">
            お見積もりは無料です。
            <br />
            この時点ではご注文になりません。
          </p>

          <Link href="/" className="inline-block mt-[40px] text-[13px] tracking-[2px] border-b border-[#710b26] pb-1">
            かけフォトについて
          </Link>
        </section>
      </div>
    </main>
  );
}
