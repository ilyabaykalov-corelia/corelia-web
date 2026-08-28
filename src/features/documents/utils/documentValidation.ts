import type { CreateDocumentRequest, UpdateDocumentRequest } from '../../../types/document';

const snilsPattern = /^\d{3}-\d{3}-\d{3} \d{2}$/;

/**
 * Форматирует пользовательский ввод в стандартную маску СНИЛС: `000-000-000 00`.
 *
 * Все символы кроме цифр игнорируются, лишние цифры отбрасываются, а частично
 * введенное значение форматируется постепенно, чтобы результат можно было сразу
 * использовать в controlled input.
 *
 * @param value - Сырое значение из текстового поля.
 * @returns Значение СНИЛС, отформатированное настолько, насколько позволяют введенные цифры.
 */
export function formatSnils(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  const parts = [
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6, 9),
    digits.slice(9, 11),
  ].filter(Boolean);

  if (parts.length <= 1) return parts[0] ?? '';
  if (parts.length === 2) return `${parts[0]}-${parts[1]}`;
  if (parts.length === 3) return `${parts[0]}-${parts[1]}-${parts[2]}`;
  return `${parts[0]}-${parts[1]}-${parts[2]} ${parts[3]}`;
}

/**
 * Валидирует атрибуты карточки документа перед dispatch create/update-запросов.
 *
 * @param payload - Атрибуты документа, собранные из формы.
 * @returns Локализованное сообщение об ошибке или `null`, если атрибуты валидны.
 */
export function validateDocumentAttributes(payload: CreateDocumentRequest | UpdateDocumentRequest) {
  if (!payload.documentTypeId) return 'Выберите вид документа';
  if (!payload.contractDate) return 'Укажите дату договора';
  if (!payload.contractNumber.trim()) return 'Заполните номер договора';
  if (!payload.snils.trim()) return 'Заполните СНИЛС';
  if (payload.contractNumber.trim().length > 64) return 'Номер договора не должен превышать 64 символа';
  if (!snilsPattern.test(payload.snils.trim())) return 'СНИЛС должен быть в формате 000-000-000 00';
  return null;
}
