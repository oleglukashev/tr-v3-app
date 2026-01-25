import qs from 'qs';

export function updateUrlCallback(router, pathname, params) {
  router.push(`${pathname}?${qs.stringify(params)}`);
}

export function updateUrlParamsCallback(router, params) {
  router.push(`?${qs.stringify(params)}`);
}
