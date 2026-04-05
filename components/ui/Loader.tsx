'use client';

interface LoaderProps { text?: string }

export default function Loader({ text = 'Загрузка…' }: LoaderProps) {
  return (
    <div className="loader" role="status" aria-live="polite" aria-label={text}>
      <div className="spin-ring" />
      <div className="loader-txt">{text}</div>
    </div>
  );
}
