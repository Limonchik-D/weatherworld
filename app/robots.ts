import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/widget'],
      },
    ],
    sitemap: 'https://weatherworld.app/sitemap.xml',
    host: 'https://weatherworld.app',
  };
}
