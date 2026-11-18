import type { ReactNode } from 'react';

/**
 * Заголовок карточки-формы с подсказкой. Форма — две колонки полей: заголовок стоит в левой,
 * подсказка — в правой и начинается на одной линии с правыми полями. Когда форма схлопывается
 * в одну колонку, подсказка идёт под заголовком.
 */
function FormHead({ title, hint }: { title: ReactNode; hint?: ReactNode }) {
  return (
    <div className="runs__form-head runs__form-head--hint">
      <h2 className="runs__subtitle">{title}</h2>
      {hint && <span className="runs__meta">{hint}</span>}
    </div>
  );
}

export default FormHead;
