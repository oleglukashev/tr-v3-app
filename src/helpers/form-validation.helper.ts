import {any, coerce, number, preprocess, string} from 'zod';

// export const MAX_FILE_SIZE = 5000000;
// export const IMAGE_ACCEPT = {'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg']};
//
// export function zodPhoneSchema() {
//   const t = useTranslations('common.form');
//   const phoneNumberRegex = /^(\+[1-9]{1}[0-9]{10,14})$/;
//   return zodStringSchema().refine((value) => phoneNumberRegex.test(value ?? ''), t('wrongPhoneFormat'));
// }

// export function zodEmailSchema() {
//   const t = useTranslations('common.form');
//   return zodStringSchema().email(t('wrongEmailFormat'));
// }

export function zodDateSchema() {
  return coerce.date();
}

// export function zodMismatchPasswordsIssue(data: any, ctx) {
//   //const t = useTranslations('common.form');
//   if (data.password !== data.confirmPassword) {
//     ctx.addIssue({
//       code: ZodIssueCode.custom,
//       message: '',
//       path: ['password'],
//     });
//   }
// }

export function zodStringSchema() {
  return string({ required_error: 'Обязательно' }).trim();
}

export function zodNumberSchema(nullish = false) {
  let num;
  if (nullish) {
    num = number().nullish();
  } else {
    num = number({ required_error: 'Обязательно' })
  }
  return preprocess((value) => (value === '' || value === null || value === undefined) ? null : Number(value), num)
}

// export function zodFileSchema(mimeTypes: string[]) {
//   const t = useTranslations('common.form');
//   return any()
//     // @ts-ignore
//     .refine((file) => !isUndefined(file), t('required'))
//     .refine((file) => file?.size < MAX_FILE_SIZE, t('fileMaxSize'))
//     .refine((file) => checkFileType(file, mimeTypes), `${t('supportedFormats')}: ${mimeTypes.join(', ')}`)
// }
//
// function checkFileType(file: File, mimeTypes: string[]) {
//   if (file?.name) {
//     const fileType = file.name.split(".").pop();
//     if (fileType && mimeTypes.includes(fileType)) return true;
//   }
//   return false;
// }
