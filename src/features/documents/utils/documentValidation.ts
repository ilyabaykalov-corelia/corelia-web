import type { AttributeDefinition, AttributeValue, CreateDocumentRequest, DocumentType } from '../../../types/document';
import { formatDate } from '../../../utils/format';

export function displayAttribute(value: AttributeValue | undefined, field?: AttributeDefinition): string {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
  return field?.format === 'date' ? formatDate(String(value)) : String(value);
}

/** Convenience checks only; Corelia validates the normalized complete snapshot again. */
export function validateDocumentAttributes(payload: CreateDocumentRequest, definition?: DocumentType) {
  if (!definition || payload.documentTypeId !== definition.id) return 'Выберите вид документа';
  for (const [name, field] of Object.entries(definition.schema.properties)) {
    const value = payload.attributes[name];
    const label = field.title || name;
    if (value === undefined) {
      if (definition.schema.required?.includes(name)) return `Заполните поле «${label}»`;
      continue;
    }
    if (value === null) return `Выберите значение «${label}»`;
    if (field.enum && !field.enum.includes(value)) return `Выберите значение «${label}»`;
    if (field.type === 'boolean' && typeof value !== 'boolean') return `Укажите значение «${label}»`;
    if (field.type === 'number' || field.type === 'integer') {
      if (typeof value !== 'number' || !Number.isFinite(value) || (field.type === 'integer' && !Number.isInteger(value))) return `Укажите корректное число «${label}»`;
      if (field.minimum !== undefined && value < field.minimum) return `«${label}»: минимум ${field.minimum}`;
      if (field.maximum !== undefined && value > field.maximum) return `«${label}»: максимум ${field.maximum}`;
    }
    if (field.type === 'string') {
      if (typeof value !== 'string') return `Укажите текст «${label}»`;
      const length = Array.from(value).length;
      if (field.minLength !== undefined && length < field.minLength) return `«${label}»: минимум ${field.minLength} символов`;
      if (field.maxLength !== undefined && length > field.maxLength) return `«${label}»: максимум ${field.maxLength} символов`;
      // Java patterns are authoritative on the server; unsupported browser syntax is not guessed.
      if (field.pattern) {
        try { if (!new RegExp(field.pattern).test(value)) return `Проверьте формат поля «${label}»`; } catch { /* Corelia validates Java syntax. */ }
      }
      if (field.format === 'date') {
        const date = new Date(value);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return `Укажите корректную дату «${label}»`;
      }
    }
  }
  return null;
}
