import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/legal/'],
        disallow: ['/api/', '/widget', '/offline'],
      },
    ],
    sitemap: 'https://weatherworld.app/sitemap.xml',
    host: 'https://weatherworld.app',
  };
}
