'use client';

import { useState } from 'react';
import Editor from '@monaco-editor/react';
import JsonView from '@uiw/react-json-view';

interface TestResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  duration: number;
}

interface ApiTestPlaygroundProps {
  baseUrl: string;
  path: string;
  method: string;
  defaultHeaders?: Record<string, string>;
}

export default function ApiTestPlayground({
  baseUrl,
  path,
  method,
  defaultHeaders = {},
}: ApiTestPlaygroundProps) {
  const [pathParams, setPathParams] = useState<Record<string, string>>({});
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [headers, setHeaders] = useState<Record<string, string>>(defaultHeaders);
  const [requestBody, setRequestBody] = useState('{\n  \n}');
  const [response, setResponse] = useState<TestResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');
  const [responseTab, setResponseTab] = useState<'pretty' | 'raw' | 'headers'>('pretty');

  // Extract path parameters from path like /users/{id}
  const extractPathParams = (pathStr: string) => {
    const matches = pathStr.match(/\{([^}]+)\}/g);
    return matches ? matches.map((m) => m.slice(1, -1)) : [];
  };

  const pathParamKeys = extractPathParams(path);

  // Build final URL
  const buildUrl = () => {
    let finalPath = path;
    Object.entries(pathParams).forEach(([key, value]) => {
      finalPath = finalPath.replace(`{${key}}`, value);
    });

    const queryString = Object.entries(queryParams)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    return `${baseUrl}${finalPath}${queryString ? `?${queryString}` : ''}`;
  };

  const handleTest = async () => {
    setIsLoading(true);
    setError('');
    setResponse(null);

    try {
      const url = buildUrl();
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };

      if (method !== 'GET' && method !== 'HEAD' && requestBody.trim()) {
        try {
          JSON.parse(requestBody); // Validate JSON
          options.body = requestBody;
        } catch {
          setError('Invalid JSON in request body');
          setIsLoading(false);
          return;
        }
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

  const addQueryParam = () => {
    const key = `param${Object.keys(queryParams).length + 1}`;
    setQueryParams({ ...queryParams, [key]: '' });
  };

  const updateQueryParam = (oldKey: string, newKey: string, value: string) => {
    const newParams = { ...queryParams };
    delete newParams[oldKey];
    newParams[newKey] = value;
    setQueryParams(newParams);
  };

  const removeQueryParam = (key: string) => {
    const newParams = { ...queryParams };
    delete newParams[key];
    setQueryParams(newParams);
  };

  const addHeader = () => {
    const key = `Header${Object.keys(headers).length + 1}`;
    setHeaders({ ...headers, [key]: '' });
  };

  const updateHeader = (oldKey: string, newKey: string, value: string) => {
    const newHeaders = { ...headers };
    delete newHeaders[oldKey];
    newHeaders[newKey] = value;
    setHeaders(newHeaders);
  };

  const removeHeader = (key: string) => {
    const newHeaders = { ...headers };
    delete newHeaders[key];
    setHeaders(newHeaders);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Panel - Request Configuration */}
      <div className="space-y-4">
        {/* URL Bar */}
        <div className="bg-white border border-gray-300 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded">
              {method}
            </span>
            <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded font-mono text-sm overflow-x-auto">
              {buildUrl()}
            </div>
          </div>
          <button
            onClick={handleTest}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded transition-colors"
          >
            {isLoading ? 'Testing...' : 'Test Endpoint'}
          </button>
        </div>

        {/* Path Parameters */}
        {pathParamKeys.length > 0 && (
          <div className="bg-white border border-gray-300 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Path Parameters</h3>
            <div className="space-y-2">
              {pathParamKeys.map((param) => (
                <div key={param}>
                  <label className="block text-xs text-gray-600 mb-1">{param}</label>
                  <input
                    type="text"
                    value={pathParams[param] || ''}
                    onChange={(e) => setPathParams({ ...pathParams, [param]: e.target.value })}
                    placeholder={`Enter ${param}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Query Parameters */}
        <div className="bg-white border border-gray-300 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Query Parameters</h3>
            <button
              onClick={addQueryParam}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add
            </button>
          </div>
          <div className="space-y-2">
            {Object.keys(queryParams).length === 0 ? (
              <p className="text-xs text-gray-500 italic">No query parameters</p>
            ) : (
              Object.entries(queryParams).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => updateQueryParam(key, e.target.value, value)}
                    placeholder="Key"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => updateQueryParam(key, key, e.target.value)}
                    placeholder="Value"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    onClick={() => removeQueryParam(key)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded text-sm"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Headers & Body Tabs */}
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          <div className="flex border-b border-gray-300">
            <button
              onClick={() => setActiveTab('body')}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activeTab === 'body'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'bg-gray-50 text-gray-600 hover:text-gray-900'
              }`}
            >
              Body
            </button>
            <button
              onClick={() => setActiveTab('headers')}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activeTab === 'headers'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'bg-gray-50 text-gray-600 hover:text-gray-900'
              }`}
            >
              Headers
            </button>
          </div>

          <div className="p-4">
            {activeTab === 'body' ? (
              method !== 'GET' && method !== 'HEAD' ? (
                <div>
                  <Editor
                    height="200px"
                    defaultLanguage="json"
                    value={requestBody}
                    onChange={(value) => setRequestBody(value || '')}
                    theme="vs-light"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 12,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  {method} requests don't have a body
                </p>
              )
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Custom Headers</span>
                  <button
                    onClick={addHeader}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add
                  </button>
                </div>
                {Object.entries(headers).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <input
                      type="text"
                      value={key}
                      onChange={(e) => updateHeader(key, e.target.value, value)}
                      placeholder="Header name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => updateHeader(key, key, e.target.value)}
                      placeholder="Header value"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <button
                      onClick={() => removeHeader(key)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Response */}
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-300">
          <h3 className="text-sm font-semibold text-gray-900">Response</h3>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {response ? (
          <>
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-300">
              <div className="flex items-center gap-4">
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded ${
                    response.status >= 200 && response.status < 300
                      ? 'bg-green-100 text-green-700'
                      : response.status >= 400
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {response.status} {response.statusText}
                </span>
                <span className="text-xs text-gray-600">
                  Time: <span className="font-semibold">{response.duration}ms</span>
                </span>
              </div>
            </div>

            <div className="flex border-b border-gray-300">
              <button
                onClick={() => setResponseTab('pretty')}
                className={`px-4 py-2 text-sm font-medium ${
                  responseTab === 'pretty'
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                    : 'bg-gray-50 text-gray-600 hover:text-gray-900'
                }`}
              >
                Pretty
              </button>
              <button
                onClick={() => setResponseTab('raw')}
                className={`px-4 py-2 text-sm font-medium ${
                  responseTab === 'raw'
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                    : 'bg-gray-50 text-gray-600 hover:text-gray-900'
                }`}
              >
                Raw
              </button>
              <button
                onClick={() => setResponseTab('headers')}
                className={`px-4 py-2 text-sm font-medium ${
                  responseTab === 'headers'
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                    : 'bg-gray-50 text-gray-600 hover:text-gray-900'
                }`}
              >
                Headers
              </button>
            </div>

            <div className="p-4 max-h-[600px] overflow-auto">
              {responseTab === 'pretty' && typeof response.data === 'object' ? (
                <JsonView value={response.data} collapsed={1} style={{ fontSize: 12 }} />
              ) : responseTab === 'raw' ? (
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {typeof response.data === 'string'
                    ? response.data
                    : JSON.stringify(response.data, null, 2)}
                </pre>
              ) : (
                <div className="space-y-2">
                  {Object.entries(response.headers).map(([key, value]) => (
                    <div key={key} className="flex gap-2 text-xs">
                      <span className="font-semibold text-gray-700 min-w-[150px]">{key}:</span>
                      <span className="text-gray-600 break-all">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p className="text-sm">Click "Test Endpoint" to see the response</p>
          </div>
        )}
      </div>
    </div>
  );
}