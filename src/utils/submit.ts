import {enqueueSnackbar} from "notistack";

export async function onSubmitWrapper(actionFunction, postActionCallback, message) {
  const res = await actionFunction();

  if (res.error) {
    if (res.error?.data?.message) {
      if (typeof res.error?.data?.message === 'string') {
        enqueueSnackbar(res.error?.data?.message, { variant: 'error' });
      } else if (typeof res.error?.data?.message === 'object') {
        for (const error of res.error?.data?.message) {
          enqueueSnackbar(error, { variant: 'error' });
        }
      } else {
        enqueueSnackbar('Ошибка в запросе', { variant: 'error' });
      }
    } else {
      enqueueSnackbar('Ошибка в запросе', { variant: 'error' });
    }
  } else {
    if (message) {
      enqueueSnackbar(message);
    }
    if (postActionCallback) {
      postActionCallback(res)
    }
  }

  return res;
}
