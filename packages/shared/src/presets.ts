import { InstagramPreset } from './types.js';

export const INSTAGRAM_PRESETS: InstagramPreset[] = [
  {
    id: 'instagram-portrait',
    name: 'Instagram Portrait',
    width: 1080,
    height: 1350,
    aspectRatio: '4:5',
    ratioValue: 4 / 5,
    description: 'Best for reach & mobile feed (Default standard)',
    recommended: true,
  },
  {
    id: 'instagram-square',
    name: 'Instagram Square',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    ratioValue: 1,
    description: 'Best for profile grid consistency',
  },
  {
    id: 'instagram-landscape',
    name: 'Instagram Landscape',
    width: 1080,
    height: 566,
    aspectRatio: '1.91:1',
    ratioValue: 1080 / 566,
    description: 'Wide format for panoramic content',
  },
  {
    id: 'instagram-story',
    name: 'Instagram Story / Reel',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    ratioValue: 9 / 16,
    description: 'Full-screen vertical mobile format',
  },
  {
    id: 'custom',
    name: 'Custom Dimensions',
    width: 1080,
    height: 1350,
    aspectRatio: 'Custom',
    ratioValue: 1080 / 1350,
    description: 'Define your own custom export dimensions',
  },
];

export const COMMON_SLIDE_SELECTORS = [
  '.slide',
  '.carousel-slide',
  '.carousel-item',
  '.swiper-slide',
  '.post-slide',
  '[data-slide]',
];
