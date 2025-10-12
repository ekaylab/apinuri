'use client';

import { useState } from 'react';

interface Endpoint {
  id: string;
  path: string;
  method: string;
  name: string;
  description?: string;
  parameters?: any;
  response_example?: any;
}

interface Api {
  id: string;
  slug: string;
  name: string;
  base_url: string;
  proxy_url: string;
  endpoints?: Endpoint[];
}

export function ApiPlayground({ api }: { api: Api }) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(
    api.endpoints?.[0] || null
  );
  const [pathParams, setPathParams] = useState<Record<string, string>>({});
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [requestBody, setRequestBody] = useState('');
  const [customHeaders, setCustomHeaders] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'response' | 'headers' | 'code'>('response');

  const extractPathParams = (path: string) => {
    const matches = path.match(/\{([^}]+)\}/g);
    return matches ? matches.map((m) => m.slice(1, -1)) : [];
  };

  const buildUrl = () => {
    if (!selectedEndpoint) return '';

    let path = selectedEndpoint.path;
    Object.entries(pathParams).forEach(([key, value]) => {
      path = path.replace(`{${key}}`, value);
    });

    const queryString = Object.entries(queryParams)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    return `${api.proxy_url}${path}${queryString ? `?${queryString}` : ''}`;
  };

  const handleTest = async () => {
    if (!selectedEndpoint) return;

    setIsLoading(true);
    setError('');
    setResponse(null);

    try {
      const url = buildUrl();
      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
          ...customHeaders,
        },
      };

      if (selectedEndpoint.method !== 'GET' && selectedEndpoint.method !== 'HEAD' && requestBody) {
        options.body = requestBody;
      }

      const startTime = Date.now();
      const res = await fetch(url, options);
      const duration = Date.now() - startTime;

      const contentType = res.headers.get('content-type');
      let data;

      if (contentType?.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        data,
        duration,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to make request');
    } finally {
      setIsLoading(false);
    }
  };

  const generateCurlCommand = () => {
    if (!selectedEndpoint) return '';

    const url = buildUrl();
    let curl = `curl -X ${selectedEndpoint.method} "${url}"`;

    Object.entries(customHeaders).forEach(([key, value]) => {
      curl += ` \\\n  -H "${key}: ${value}"`;
    });

    if (selectedEndpoint.method !== 'GET' && selectedEndpoint.method !== 'HEAD' && requestBody) {
      curl += ` \\\n  -d '${requestBody}'`;
    }

    return curl;
  };

  const pathParamKeys = selectedEndpoint ? extractPathParams(selectedEndpoint.path) : [];

  if (!api.endpoints || api.endpoints.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600">
          이 API에는 등록된 엔드포인트가 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Endpoint Selector */}
      <div>
        <label className="block text-sm font-medium text-black mb-2">
          엔드포인트 선택
        </label>
        <select
          value={selectedEndpoint?.id || ''}
          onChange={(e) => {
            const endpoint = api.endpoints?.find((ep) => ep.id === e.target.value);
            setSelectedEndpoint(endpoint || null);
            setPathParams({});
            setQueryParams({});
            setRequestBody('');
            setResponse(null);
            setError('');
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
        >
          {api.endpoints.map((endpoint) => (
            <option key={endpoint.id} value={endpoint.id}>
              {endpoint.method} {endpoint.path} - {endpoint.name}
            </option>
          ))}
        </select>
      </div>

      {selectedEndpoint && (
        <>
          {/* Endpoint Details */}
          <div id={`endpoint-${selectedEndpoint.id}`} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 text-sm font-medium text-white bg-black rounded">
                {selectedEndpoint.method}
              </span>
              <code className="text-sm font-mono text-gray-700">{selectedEndpoint.path}</code>
            </div>
            <h3 className="text-lg font-semibold text-black mb-1">{selectedEndpoint.name}</h3>
            {selectedEndpoint.description && (
              <p className="text-sm text-gray-600">{selectedEndpoint.description}</p>
            )}
          </div>

          {/* Path Parameters */}
          {pathParamKeys.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-black mb-3">경로 파라미터</h4>
              <div className="space-y-2">
                {pathParamKeys.map((param) => (
                  <div key={param}>
                    <label className="block text-sm text-gray-700 mb-1">{param}</label>
                    <input
                      type="text"
                      value={pathParams[param] || ''}
                      onChange={(e) =>
                        setPathParams({ ...pathParams, [param]: e.target.value })
                      }
                      placeholder={`Enter ${param}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Query Parameters */}
          <div>
            <h4 className="text-sm font-semibold text-black mb-3">쿼리 파라미터 (선택사항)</h4>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="키"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const key = e.currentTarget.value;
                      if (key && !queryParams[key]) {
                        setQueryParams({ ...queryParams, [key]: '' });
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    const key = input.value;
                    if (key && !queryParams[key]) {
                      setQueryParams({ ...queryParams, [key]: '' });
                      input.value = '';
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800"
                >
                  추가
                </button>
              </div>
              {Object.keys(queryParams).length > 0 && (
                <div className="space-y-2 mt-3">
                  {Object.entries(queryParams).map(([key, value]) => (
                    <div key={key} className="flex gap-2 items-center">
                      <span className="text-sm font-mono text-gray-700 min-w-[100px]">
                        {key}:
                      </span>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) =>
                          setQueryParams({ ...queryParams, [key]: e.target.value })
                        }
                        placeholder="값"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newParams = { ...queryParams };
                          delete newParams[key];
                          setQueryParams(newParams);
                        }}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Request Body */}
          {selectedEndpoint.method !== 'GET' && selectedEndpoint.method !== 'HEAD' && (
            <div>
              <h4 className="text-sm font-semibold text-black mb-3">요청 본문 (JSON)</h4>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                placeholder='{"key": "value"}'
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black text-sm font-mono"
              />
            </div>
          )}

          {/* Test Button */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleTest}
              disabled={isLoading}
              className="px-6 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? '요청 중...' : '테스트 실행'}
            </button>
            <span className="text-sm text-gray-600">
              URL: <code className="text-xs bg-gray-100 px-2 py-1 rounded">{buildUrl()}</code>
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Response */}
          {response && (
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-gray-300 bg-gray-50">
                <button
                  onClick={() => setActiveTab('response')}
                  className={`px-4 py-2 text-sm font-medium ${
                    activeTab === 'response'
                      ? 'bg-white text-black border-b-2 border-black'
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  응답
                </button>
                <button
                  onClick={() => setActiveTab('headers')}
                  className={`px-4 py-2 text-sm font-medium ${
                    activeTab === 'headers'
                      ? 'bg-white text-black border-b-2 border-black'
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  헤더
                </button>
                <button
                  onClick={() => setActiveTab('code')}
                  className={`px-4 py-2 text-sm font-medium ${
                    activeTab === 'code'
                      ? 'bg-white text-black border-b-2 border-black'
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  코드
                </button>
                <div className="ml-auto px-4 py-2 text-sm text-gray-600">
                  <span
                    className={`font-semibold ${
                      response.status >= 200 && response.status < 300
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {response.status} {response.statusText}
                  </span>
                  {' · '}
                  <span>{response.duration}ms</span>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-4 bg-white">
                {activeTab === 'response' && (
                  <pre className="text-sm font-mono text-gray-800 overflow-x-auto">
                    {typeof response.data === 'string'
                      ? response.data
                      : JSON.stringify(response.data, null, 2)}
                  </pre>
                )}
                {activeTab === 'headers' && (
                  <div className="space-y-2">
                    {Object.entries(response.headers).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-mono font-semibold text-gray-700">{key}:</span>{' '}
                        <span className="font-mono text-gray-600">{value as string}</span>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'code' && (
                  <pre className="text-sm font-mono text-gray-800 overflow-x-auto">
                    {generateCurlCommand()}
                  </pre>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}