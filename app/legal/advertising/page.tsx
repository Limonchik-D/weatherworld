import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Реклама — WeatherWorld Pro' };

export default function AdvertisingPage() {
  return (
    <>
      <h1>Размещение рекламы</h1>
      <p className="legal-updated">WeatherWorld Pro — актуальные данные о погоде по всему миру</p>

      <h2>Рекламная политика</h2>
      <p>Мы небольшой независимый проект, существующий на собственные средства. Основная монетизация — реклама на страницах Сайта. Мы тщательно отбираем рекламных партнёров и стремимся не мешать пользователям.</p>

      <h3>Мы не размещаем:</h3>
      <ul>
        <li>Рекламу табака и табачных изделий;</li>
        <li>Порнографические и эротические материалы;</li>
        <li>Рекламу азартных игр и пари;</li>
        <li>Баннеры, вводящие пользователей в заблуждение;</li>
        <li>Материалы, нарушающие действующее законодательство;</li>
        <li>Flash-баннеры и скрипты, самопроизвольно открывающие новые окна.</li>
      </ul>

      <h2>Форматы баннеров</h2>
      <table className="legal-table">
        <thead>
          <tr><th>Формат</th><th>Размер</th><th>Платформа</th></tr>
        </thead>
        <tbody>
          <tr><td>Leaderboard</td><td>728×90 px</td><td>Desktop</td></tr>
          <tr><td>Wide Skyscraper</td><td>300×600 px</td><td>Desktop</td></tr>
          <tr><td>Medium Rectangle</td><td>300×250 px</td><td>Desktop / Mobile</td></tr>
          <tr><td>Mobile Banner</td><td>320×50 px</td><td>Mobile</td></tr>
        </tbody>
      </table>

      <h2>Технические требования</h2>
      <ul>
        <li>Форматы: GIF, JPG, PNG, HTML5;</li>
        <li>Размер файла: не более 150 КБ;</li>
        <li>Суммарный объём подгружаемых ресурсов HTML5: не более 500 КБ;</li>
        <li>Переход по ссылке — только по клику на баннер;</li>
        <li>Клик должен открывать рекламируемый сайт в новом окне;</li>
        <li>Запрещены звуковые эффекты без инициативы пользователя.</li>
      </ul>

      <h2>Контакт для рекламодателей</h2>
      <p>По вопросам размещения рекламы обращайтесь:</p>
      <p>E-mail: <a href="mailto:ads@weatherworld.pro">ads@weatherworld.pro</a></p>
    </>
  );
}
