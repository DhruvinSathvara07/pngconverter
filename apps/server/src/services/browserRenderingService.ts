import { chromium, Browser, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { ExportOptions } from '@exporter/shared';
import { ProjectImporter } from './projectImporter.js';

export class BrowserRenderingService {
  private static browser: Browser | null = null;

  static async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      });
    }
    return this.browser;
  }

  static async renderSlide(
    sessionId: string,
    entryHtml: string,
    slideIndex: number,
    options: ExportOptions
  ): Promise<Buffer> {
    const sessionDir = ProjectImporter.getSessionDir(sessionId);
    const htmlPath = path.join(sessionDir, entryHtml);
    if (!fs.existsSync(htmlPath)) {
      throw new Error(`HTML entry file not found: ${entryHtml}`);
    }

    const browser = await this.getBrowser();
    const context: BrowserContext = await browser.newContext({
      viewport: {
        width: options.width,
        height: options.height,
      },
      deviceScaleFactor: options.multiplier || 1,
    });

    try {
      const page: Page = await context.newPage();
      const fileUrl = `file://${htmlPath}`;

      await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });

      // Wait for fonts to load
      try {
        await page.evaluateHandle('document.fonts.ready');
      } catch {
        // Fallback if fonts API unavailable
      }

      // Wait for all images to load and decode
      await page.evaluate(async () => {
        const imgs = Array.from(document.querySelectorAll('img'));
        await Promise.all(
          imgs.map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
              img.onload = img.onerror = resolve;
            });
          })
        );
      });

      // Inject custom alignment & isolation styles for target slide
      const selector = options.slideSelector;
      const targetWidth = options.width;
      const targetHeight = options.height;

      await page.addStyleTag({
        content: `
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            width: ${targetWidth}px !important;
            height: ${targetHeight}px !important;
            overflow: hidden !important;
          }
          .wrap, .container, .carousel-container, .track, .swiper-wrapper {
            width: ${targetWidth}px !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          .ctl, .nav, .dots, .pagination, .carousel-indicators, .carousel-control {
            display: none !important;
          }
          ${selector} {
            display: none !important;
          }
          ${selector}.__exporter_active_slide {
            display: block !important;
            width: ${targetWidth}px !important;
            height: ${targetHeight}px !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }
        `,
      });

      // Activate the target slide
      const slideFound = await page.evaluate(
        ({ sel, idx }) => {
          const slides = Array.from(document.querySelectorAll(sel));
          slides.forEach((s) => s.classList.remove('__exporter_active_slide'));
          if (slides[idx]) {
            slides[idx].classList.add('__exporter_active_slide');
            slides[idx].scrollIntoView();
            return true;
          }
          return false;
        },
        { sel: selector, idx: slideIndex }
      );

      if (!slideFound) {
        throw new Error(`Slide at index ${slideIndex} not found using selector "${selector}"`);
      }

      // Handle animations
      if (options.animationMode === 'stable') {
        // Seek GSAP timeline to end if available
        await page.evaluate(() => {
          try {
            // @ts-ignore
            if (window.gsap && window.gsap.globalTimeline) {
              // @ts-ignore
              window.gsap.globalTimeline.progress(1);
            }
          } catch {}
        });
        await page.waitForTimeout(300);
      } else if (options.animationMode === 'delay') {
        const delay = options.animationDelayMs || 500;
        await page.waitForTimeout(delay);
      } else if (options.animationMode === 'timeline') {
        const time = options.timelineSeconds || 0;
        await page.evaluate((t) => {
          try {
            // @ts-ignore
            if (window.gsap && window.gsap.globalTimeline) {
              // @ts-ignore
              window.gsap.globalTimeline.seek(t);
            }
          } catch {}
        }, time);
        await page.waitForTimeout(100);
      }

      // Capture screenshot
      const omitBackground = options.backgroundMode === 'transparent';
      const screenshotBuffer = await page.screenshot({
        type: 'png',
        omitBackground,
        fullPage: false,
      });

      return screenshotBuffer;
    } finally {
      await context.close();
    }
  }

  static async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
