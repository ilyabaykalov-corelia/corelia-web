import type { PropsWithChildren } from 'react';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const Root = styled(Box)({
  minWidth: 0,
});

const Label = styled(Typography)(({ theme }) => ({
  fontSize: 11.5,
  fontWeight: 500,
  marginBottom: theme.spacing(0.55),
}));

const RequiredMark = styled('span')(({ theme }) => ({
  color: theme.palette.error.main,
}));

interface FormFieldProps {
  label: string;
  required?: boolean;
}

/**
 * Отрисовывает компактную подпись поля и необязательную отметку обязательности над контролом ввода.
 *
 * Компонент унифицирует разметку форм создания и редактирования документа, чтобы страницы
 * не дублировали типографику и отступы для каждого поля.
 *
 * @param props - Параметры отображения поля.
 * @param props.label - Человекочитаемая подпись, отображаемая над полем.
 * @param props.required - Показывает отметку обязательного поля, если значение должно быть заполнено.
 * @param props.children - Поле ввода, выпадающий список, textarea или другой кастомный контрол.
 */
export function FormField({ label, required, children }: PropsWithChildren<FormFieldProps>) {
  return (
    <Root>
      <Label>
        {label} {required && <RequiredMark>*</RequiredMark>}
      </Label>
      {children}
    </Root>
  );
}
