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

type TabType = 'app' | 'params' | 'headers' | 'body';

export function ApiPlayground({ api }: { api: Api }) {
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(
    api.endpoints?.[0] || null
  );
  const [pathParams, setPathParams] = useState<Record<string, string>>({});
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('app');

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
    setResponse(null);

    try {
      const url = buildUrl();
      const startTime = Date.now();
      const res = await fetch(url, {
        method: selectedEndpoint.method,
      });
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
        data,
        duration,
      });
    } catch (err: any) {
      setResponse({
        status: 0,
        statusText: 'Error',
        data: err.message || 'Failed to make request',
        duration: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const pathParamKeys = selectedEndpoint ? extractPathParams(selectedEndpoint.path) : [];

  const filteredEndpoints = api.endpoints?.filter((endpoint) =>
    endpoint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    endpoint.path.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (!api.endpoints || api.endpoints.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm">
        이 API에는 등록된 엔드포인트가 없습니다.
      </div>
    );
  }

  return (
    <>
      {/* Left Sidebar - Endpoints List */}
      <aside className="w-72 flex-shrink-0 border-r bg-white overflow-y-auto flex flex-col">
        {/* API Info */}
        <div className="p-4 border-b">
          <h2 className="text-sm font-bold text-gray-900 mb-3">API Overview</h2>
          <div className="text-xs text-gray-600">
            <p className="mb-1">Version: v1</p>
          </div>
        </div>

        {/* Search */}
        <div className="p-4">
          <label className="block text-xs font-bold text-gray-900 mb-2">Endpoints</label>
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="absolute left-3 top-2.5 h-4 w-4 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Search Endpoints"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        {/* Endpoints List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <div className="space-y-1">
            {filteredEndpoints.map((endpoint) => (
              <button
                key={endpoint.id}
                onClick={() => {
                  setSelectedEndpoint(endpoint);
                  setPathParams({});
                  setQueryParams({});
                  setResponse(null);
                }}
                className={`w-full text-left flex items-start gap-2 p-2 rounded transition-colors ${
                  selectedEndpoint?.id === endpoint.id
                    ? 'bg-sky-100'
                    : 'hover:bg-sky-50'
                }`}
              >
                <span className={`text-[8px] font-normal mt-0.5 ${
                  endpoint.method === 'GET' ? 'text-blue-500' :
                  endpoint.method === 'POST' ? 'text-green-500' :
                  endpoint.method === 'PUT' ? 'text-yellow-500' :
                  endpoint.method === 'DELETE' ? 'text-red-500' :
                  'text-gray-500'
                }`}>
                  {endpoint.method}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-900 truncate">{endpoint.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Right Panel - Test Area */}
      <div className="flex-1 flex flex-col">
        {selectedEndpoint && (
          <>
            {/* Top Bar with Breadcrumb */}
            <div className="border-b bg-gray-50 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-[8px] font-medium uppercase rounded ${
                  selectedEndpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                  selectedEndpoint.method === 'POST' ? 'bg-green-100 text-green-700' :
                  selectedEndpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                  selectedEndpoint.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {selectedEndpoint.method}
                </span>
                <span className="text-xs text-gray-600">{selectedEndpoint.name}</span>
              </div>
              <button
                onClick={handleTest}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-medium text-white bg-black rounded hover:bg-gray-800 disabled:bg-gray-400"
              >
                {isLoading ? '요청 중...' : '테스트 실행'}
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b bg-gray-50">
              <div className="px-6">
                <div className="inline-flex h-9 items-center gap-3">
                  <button
                    onClick={() => setActiveTab('app')}
                    className={`h-full px-2 py-2 text-xs font-normal transition-all ${
                      activeTab === 'app'
                        ? 'text-gray-900 border-b-2 border-black'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    App
                  </button>
                  <button
                    onClick={() => setActiveTab('params')}
                    className={`h-full px-2 py-2 text-xs font-normal transition-all ${
                      activeTab === 'params'
                        ? 'text-gray-900 border-b-2 border-black'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Params
                  </button>
                  <button
                    onClick={() => setActiveTab('headers')}
                    className={`h-full px-2 py-2 text-xs font-normal transition-all ${
                      activeTab === 'headers'
                        ? 'text-gray-900 border-b-2 border-black'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Headers
                  </button>
                  <button
                    onClick={() => setActiveTab('body')}
                    className={`h-full px-2 py-2 text-xs font-normal transition-all ${
                      activeTab === 'body'
                        ? 'text-gray-900 border-b-2 border-black'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Body
                  </button>
                </div>
              </div>
            </div>

            {/* Content Area - Split */}
            <div className="flex-1 grid grid-cols-2">
              {/* Left - Tab Content */}
              <div className="border-r overflow-y-auto">
                <div className="p-6">
                  {activeTab === 'app' && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900">Application</h3>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">Request URL</label>
                        <code className="block text-xs bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-700 break-all">
                          {buildUrl()}
                        </code>
                      </div>
                    </div>
                  )}

                  {activeTab === 'params' && (
                    <div className="space-y-6">
                      {/* Path Parameters */}
                      {pathParamKeys.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-3">경로 파라미터</label>
                          <div className="space-y-2">
                            {pathParamKeys.map((param) => (
                              <div key={param}>
                                <label className="block text-xs text-gray-600 mb-1">{param}</label>
                                <input
                                  type="text"
                                  value={pathParams[param] || ''}
                                  onChange={(e) =>
                                    setPathParams({ ...pathParams, [param]: e.target.value })
                                  }
                                  placeholder={`Enter ${param}`}
                                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Query Parameters */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-3">쿼리 파라미터</label>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="key"
                              className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const keyInput = e.currentTarget;
                                  const valueInput = e.currentTarget.nextElementSibling as HTMLInputElement;
                                  const key = keyInput.value;
                                  const value = valueInput?.value || '';
                                  if (key) {
                                    setQueryParams({ ...queryParams, [key]: value });
                                    keyInput.value = '';
                                    if (valueInput) valueInput.value = '';
                                  }
                                }
                              }}
                            />
                            <input
                              type="text"
                              placeholder="value"
                              className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const valueInput = e.currentTarget;
                                  const keyInput = e.currentTarget.previousElementSibling as HTMLInputElement;
                                  const key = keyInput?.value || '';
                                  const value = valueInput.value;
                                  if (key) {
                                    setQueryParams({ ...queryParams, [key]: value });
                                    keyInput.value = '';
                                    valueInput.value = '';
                                  }
                                }
                              }}
                            />
                          </div>
                          {Object.keys(queryParams).length > 0 && (
                            <div className="mt-3 space-y-1 bg-gray-50 border rounded p-2">
                              {Object.entries(queryParams).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between text-xs">
                                  <span className="font-mono text-gray-700">{key}: {value || '(empty)'}</span>
                                  <button
                                    onClick={() => {
                                      const newParams = { ...queryParams };
                                      delete newParams[key];
                                      setQueryParams(newParams);
                                    }}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'headers' && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">Headers</h3>
                      <p className="text-xs text-gray-500">No custom headers configured</p>
                    </div>
                  )}

                  {activeTab === 'body' && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">Request Body</h3>
                      <p className="text-xs text-gray-500">Body configuration not available for {selectedEndpoint.method} requests</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right - Response */}
              <div className="overflow-y-auto bg-gray-50">
                {response ? (
                  <div className="p-6">
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-900">응답</h4>
                        <div className="text-xs">
                          <span className={`font-semibold ${
                            response.status >= 200 && response.status < 300
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {response.status} {response.statusText}
                          </span>
                          {response.duration > 0 && <span className="ml-2 text-gray-600">{response.duration}ms</span>}
                        </div>
                      </div>
                      <pre className="text-xs bg-white border border-gray-200 rounded p-4 overflow-x-auto">
                        {typeof response.data === 'string'
                          ? response.data
                          : JSON.stringify(response.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    테스트를 실행하면 여기에 응답이 표시됩니다
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}