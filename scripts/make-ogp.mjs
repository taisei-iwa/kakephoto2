import sharp from "sharp";
import fs from "fs";
import path from "path";

const LOGO_SVG = fs.readFileSync(path.resolve("public/images/footer-logo.svg"), "utf8");
const BG = "#710b26";
const LOGO_ASPECT = 110 / 173; // native aspect (w/h)

async function render({ w, h, logoRatio = 0.56, out }) {
  // logoRatio = logo height / canvas shortest side
  const shortest = Math.min(w, h);
  const logoH = Math.round(shortest * logoRatio);
  const logoW = Math.round(logoH * LOGO_ASPECT);

  const logoBuf = await sharp(Buffer.from(LOGO_SVG))
    .resize(logoW, logoH)
    .png()
    .toBuffer();

  await sharp({
    create: { width: w, height: h, channels: 4, background: BG },
  })
    .composite([
      {
        input: logoBuf,
        left: Math.round((w - logoW) / 2),
        top: Math.round((h - logoH) / 2),
      },
    ])
    .png()
    .toFile(out);

  console.log("Wrote", out, `${w}x${h}`);
}

// OGP (Facebook/LINE/Slack/Discord/Twitter large)
await render({ w: 1200, h: 630, logoRatio: 0.57, out: "app/opengraph-image.png" });
await render({ w: 1200, h: 630, logoRatio: 0.57, out: "app/twitter-image.png" });

// Apple touch icon (iOS home screen)
await render({ w: 180, h: 180, logoRatio: 0.72, out: "app/apple-icon.png" });
