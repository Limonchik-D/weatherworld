import type { Metadata } from 'next';
import WidgetCard from './WidgetCard';

export const metadata: Metadata = { title: 'Weather Widget' };

interface WidgetPageProps {
  searchParams: Promise<Record<string, string>>;
}

export default async function WidgetPage({ searchParams }: WidgetPageProps) {
  const params = await searchParams;
  const lat = parseFloat(params.lat ?? '55.7558');
  const lon = parseFloat(params.lon ?? '37.6173');
  const city = params.city ?? 'Погода';
  const theme = params.theme ?? 'dark';

  return (
    <html lang="ru" data-theme={theme}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap" />
        <style>{`
          *{box-sizing:border-box;margin:0;padding:0}
          body{font-family:'Inter',-apple-system,sans-serif;background:transparent;overflow:hidden}
        `}</style>
      </head>
      <body>
        <WidgetCard lat={lat} lon={lon} city={city} />
      </body>
    </html>
  );
}
