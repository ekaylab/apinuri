import env from '@/env';

export const createFetch = (baseUrl: string, commonHeaders: Record<string, string> = {}) => {
  return async (
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      headers?: Record<string, string>;
      credentials?: RequestCredentials;
      body?: BodyInit | null | undefined;
      next?: {
        revalidate: number;
      };
    } = {
      method: 'GET',
    },
  ) => {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const res = await fetch(url, {
      ...options,
      headers: {
        ...commonHeaders,
        ...options.headers,
      },
      credentials: options.credentials || undefined,
      next: options.next || undefined,
      body:
        options.body ||
        (options.method !== 'GET' && commonHeaders['Content-Type'] === 'application/json'
          ? JSON.stringify({})
          : undefined),
    });

    if (!res.ok) {
      const contentType = res.headers.get('content-type');
      try {
        if (contentType?.includes('application/json')) {
          const errorData = await res.json();
          throw {
            status: res.status,
            message: errorData.error || errorData.message || '요청 처리 중 오류가 발생했습니다',
          };
        } else {
          const errorText = await res.text();
          throw {
            status: res.status,
            message: errorText || res.statusText,
          };
        }
      } catch (parseError: any) {
        if (parseError && typeof parseError === 'object' && 'status' in parseError) {
          throw parseError;
        }

        throw {
          status: res.status,
          message: `요청 처리 중 오류가 발생했습니다: ${parseError.message || parseError}`,
        };
      }
    }

    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await res.json();
    }

    return await res.text();
  };
};

export const apiFetch = createFetch(env.api.MAIN_API_URL, {
  'Content-Type': 'application/json',
});

export const baseFetch = createFetch(env.api.BASE_URL, {});