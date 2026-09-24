/** Применяет конфигурационную маску: 0 означает одну цифру, остальные символы являются литералами. */
export function applyInputMask(value: string, mask?: string): string {
  if (!mask) return value;
  const digits = value.replace(/\D/g, '');
  let result = '', index = 0;
  for (const token of mask) {
    if (token === '0') {
      if (index === digits.length) break;
      result += digits[index++];
    } else if (index > 0 || digits.length > 0) {
      result += token;
    }
  }
  return result;
}

/** Для фиксированных цифровых масок отображаемое и отправляемое значения совпадают. */
export function validationValue(value: string, mask?: string): string {
  return applyInputMask(value, mask);
}
