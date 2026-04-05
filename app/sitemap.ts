import { MetadataRoute } from 'next';

const BASE = 'https://weatherworld.app';

// Popular Russian-speaking cities — each gets its own sitemap entry
// so search engines discover these query URLs
const POPULAR_CITIES = [
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
  'Нижний Новгород', 'Челябинск', 'Самара', 'Уфа', 'Ростов-на-Дону',
  'Омск', 'Красноярск', 'Воронеж', 'Пермь', 'Волгоград', 'Краснодар',
  'Саратов', 'Тюмень', 'Тольятти', 'Ижевск', 'Барнаул', 'Ульяновск',
  'Иркутск', 'Хабаровск', 'Владивосток', 'Ярославль', 'Махачкала',
  'Томск', 'Оренбург', 'Кемерово',
  // СНГ
  'Киев', 'Минск', 'Алматы', 'Ташкент', 'Астана', 'Баку', 'Ереван',
  'Тбилиси', 'Бишкек', 'Душанбе',
  // Мировые
  'London', 'Paris', 'Berlin', 'New York', 'Tokyo', 'Dubai', 'Istanbul',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const cityUrls: MetadataRoute.Sitemap = POPULAR_CITIES.map(city => ({
    url: `${BASE}/?q=${encodeURIComponent(city)}`,
    lastModified: new Date(),
    changeFrequency: 'hourly',
    priority: 0.7,
  }));

  const legalPages: MetadataRoute.Sitemap = [
    '/legal/privacy',
    '/legal/terms',
    '/legal/advertising',
    '/legal/contacts',
  ].map(path => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.3,
  }));

  return [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...legalPages,
    ...cityUrls,
  ];
}
