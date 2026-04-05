import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Контакты — WeatherWorld Pro' };

export default function ContactsPage() {
  return (
    <>
      <h1>Контакты</h1>

      <p>Мы открыты для сотрудничества, предложений и обратной связи.</p>

      <h2>Общие вопросы</h2>
      <p>E-mail: <a href="mailto:info@weatherworld.pro">info@weatherworld.pro</a></p>

      <h2>Реклама и партнёрство</h2>
      <p>E-mail: <a href="mailto:ads@weatherworld.pro">ads@weatherworld.pro</a></p>

      <h2>Технические вопросы</h2>
      <p>Если вы обнаружили ошибку в работе Сайта, пожалуйста, опишите её подробно и отправьте на: <a href="mailto:support@weatherworld.pro">support@weatherworld.pro</a></p>

      <h2>Сообщить о неприемлемой рекламе</h2>
      <p>Если вы обнаружили рекламу, которую считаете неприемлемой, напишите нам: <a href="mailto:info@weatherworld.pro">info@weatherworld.pro</a> — мы примем все возможные меры для урегулирования ситуации.</p>
    </>
  );
}
