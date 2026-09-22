import type { AttributeDefinition, AttributeValue, CreateDocumentRequest, DocumentType } from '../../../types/document';
import { formatDate } from '../../../utils/format';
import { validationValue } from './inputMask';

export function displayAttribute(value: AttributeValue | undefined, field?: AttributeDefinition): string {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
  return field?.format === 'date' ? formatDate(String(value)) : String(value);
}

/** Convenience checks only; Corelia validates the normalized complete snapshot again. */
export function validateDocumentAttributes(payload: CreateDocumentRequest, definition?: DocumentType) {
  if (!definition || payload.documentTypeId !== definition.id) return 'Выберите вид документа';
  for (const [name, field] of Object.entries(definition.schema.properties)) {
    const error = validateDocumentField(name, payload.attributes[name], definition);
    if (error) return error;
  }
  return null;
}

export function validateDocumentField(name: string, source: AttributeValue | undefined, definition?: DocumentType): string | null {
  const field = definition?.schema.properties[name];
  if (!definition || !field) return null;
  const label = field.title || name;
  if (source === undefined || source === '') return definition.schema.required?.includes(name) ? `Заполните поле «${label}»` : null;
  if (source === null) return `Выберите значение «${label}»`;
  if (field.enum && !field.enum.includes(source)) return `Выберите значение «${label}»`;
  if (field.type === 'boolean' && typeof source !== 'boolean') return `Укажите значение «${label}»`;
  if (field.type === 'number' || field.type === 'integer') {
    if (typeof source !== 'number' || !Number.isFinite(source) || (field.type === 'integer' && !Number.isInteger(source))) return `Укажите корректное число «${label}»`;
    if (field.minimum !== undefined && source < field.minimum) return `«${label}»: минимум ${field.minimum}`;
    if (field.maximum !== undefined && source > field.maximum) return `«${label}»: максимум ${field.maximum}`;
  }
  if (field.type !== 'string' || typeof source !== 'string') return field.type === 'string' ? `Укажите текст «${label}»` : null;
  const value = validationValue(source, definition.ui?.masks?.[name]);
  const length = Array.from(value).length;
  if (field.minLength !== undefined && length < field.minLength) return `«${label}»: минимум ${field.minLength} символов`;
  if (field.maxLength !== undefined && length > field.maxLength) return `«${label}»: максимум ${field.maxLength} символов`;
  if (field.pattern) { try { if (!new RegExp(field.pattern).test(value)) return `Проверьте формат поля «${label}»`; } catch { /* Сервер проверит Java-regex. */ } }
  if (field.format === 'date') { const date = new Date(value); if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return `Укажите корректную дату «${label}»`; }
  return null;
}
