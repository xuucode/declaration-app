const PRODUCTION_API_URL = 'https://7p4j00jv5d.execute-api.ap-northeast-1.amazonaws.com/prod';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const normalizeUrl = (value: string | undefined, fallback: string) => {
  const candidate = value?.trim() || fallback;

  try {
    return trimTrailingSlash(new URL(candidate).toString());
  } catch {
    return trimTrailingSlash(fallback);
  }
};

export const API_BASE_URL = normalizeUrl(
  import.meta.env.VITE_API_URL,
  import.meta.env.PROD ? PRODUCTION_API_URL : 'http://localhost:3000'
);

export const PUBLIC_API_BASE_URL = normalizeUrl(
  import.meta.env.VITE_PUBLIC_API_URL,
  API_BASE_URL
);
