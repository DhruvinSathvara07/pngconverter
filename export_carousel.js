/**
 * Instagram Carousel Exporter
 * Exports each slide in index.html into a 1080x1350 px PNG image (standard 4:5 Instagram portrait carousel).
 */

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function exportCarousel() {
  const baseDir = __dirname;
  const htmlPath = 'file://' + path.join(baseDir, 'index.html');
  const outputDir = path.join(baseDir, 'instagram_carousel');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🚀 Starting Instagram Carousel export...');
  console.log(`📄 Source: ${htmlPath}`);
  console.log(`📁 Destination: ${outputDir}`);

  // Auto-detect Chrome on macOS or Linux/Windows
  const chromePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];

  let executablePath = null;
  for (const p of chromePaths) {
    if (fs.existsSync(p)) {
      executablePath = p;
      break;
    }
  }

  if (!executablePath) {
    throw new Error('Could not find Google Chrome or Chromium executable on this machine.');
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Standard Instagram Portrait Dimensions (4:5 ratio)
    const WIDTH = 1080;
    const HEIGHT = 1350;

    await page.setViewport({
      width: WIDTH,
      height: HEIGHT,
      deviceScaleFactor: 1
    });

    await page.goto(htmlPath, { waitUntil: 'networkidle0' });

    // Wait for Google Fonts to load
    await page.evaluateHandle('document.fonts.ready');

    // Inject export styles to perfectly align each slide to 1080x1350
    await page.addStyleTag({
      content: `
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: transparent !important;
          width: ${WIDTH}px !important;
          height: ${HEIGHT}px !important;
          overflow: hidden !important;
        }
        .wrap {
          width: ${WIDTH}px !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .track {
          display: block !important;
          border-radius: 0 !important;
          overflow: visible !important;
          gap: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .ctl {
          display: none !important;
        }
        .slide {
          display: none !important;
        }
        .slide.active-export {
          display: block !important;
          width: ${WIDTH}px !important;
          height: ${HEIGHT}px !important;
          aspect-ratio: 4/5 !important;
          border-radius: 0 !important;
          margin: 0 !important;
        }
      `
    });

    const slideCount = await page.evaluate(() => document.querySelectorAll('.slide').length);
    console.log(`📸 Found ${slideCount} slides to export.\n`);

    const fileNames = [
      '01_cover.png',
      '02_skiper_ui.png',
      '03_cult_ui.png',
      '04_watermelon_ui.png',
      '05_motion_primitives.png',
      '06_save_and_share.png'
    ];

    for (let i = 0; i < slideCount; i++) {
      const label = await page.evaluate((idx) => {
        const slides = document.querySelectorAll('.slide');
        slides.forEach(s => s.classList.remove('active-export'));
        const target = slides[idx];
        if (target) {
          target.classList.add('active-export');
          return target.getAttribute('aria-label') || `Slide ${idx + 1}`;
        }
        return `Slide ${idx + 1}`;
      }, i);

      // Brief pause to allow browser layout & render engine to settle
      await new Promise(resolve => setTimeout(resolve, 250));

      const fileName = fileNames[i] || `slide_${String(i + 1).padStart(2, '0')}.png`;
      const outputPath = path.join(outputDir, fileName);

      await page.screenshot({
        path: outputPath,
        type: 'png'
      });

      // Also copy with simple name slide-X.png in baseDir
      const simpleName = `slide-${i + 1}.png`;
      fs.copyFileSync(outputPath, path.join(baseDir, simpleName));

      console.log(`✅ [${i + 1}/${slideCount}] ${fileName} ("${label}") -> ${WIDTH}x${HEIGHT}px`);
    }

    console.log('\n🎉 All carousel PNGs exported successfully!');
    console.log(`📂 Files saved in:\n   - ${outputDir}/\n   - ${baseDir}/ (as slide-1.png .. slide-6.png)`);
  } finally {
    await browser.close();
  }
}

exportCarousel().catch(err => {
  console.error('❌ Error exporting carousel:', err);
  process.exit(1);
});
