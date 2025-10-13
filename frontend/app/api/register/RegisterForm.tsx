'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/utils/fetch';
import tryCatch from '@/utils/tryCatch';
import ApiTestPlayground from '@/components/ApiTestPlayground';
import Editor from '@monaco-editor/react';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';

interface Parameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description?: string;
  example?: string;
}

interface Endpoint {
  path: string;
  method: HttpMethod;
  name: string;
  description?: string;
  queryParams?: Parameter[];
  pathParams?: Parameter[];
  bodySchema?: string; // JSON string of body example
  tested?: boolean; // Track if endpoint has been successfully tested
  testStatus?: 'success' | 'error'; // Test result status
}

export default function RegisterForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Basic API info
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [category, setCategory] = useState('');

  // Headers
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');

  // Endpoints
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [endpointPath, setEndpointPath] = useState('');
  const [endpointMethod, setEndpointMethod] = useState<HttpMethod>('GET');
  const [endpointName, setEndpointName] = useState('');
  const [endpointDescription, setEndpointDescription] = useState('');

  // Parameters for current endpoint being created
  const [queryParams, setQueryParams] = useState<Parameter[]>([]);
  const [pathParams, setPathParams] = useState<Parameter[]>([]);
  const [bodySchema, setBodySchema] = useState('{\n  \n}');

  // Current query parameter being added
  const [queryParamName, setQueryParamName] = useState('');
  const [queryParamType, setQueryParamType] = useState<'string' | 'number' | 'boolean' | 'array' | 'object'>('string');
  const [queryParamRequired, setQueryParamRequired] = useState(true);
  const [queryParamDescription, setQueryParamDescription] = useState('');
  const [queryParamExample, setQueryParamExample] = useState('');

  // Current path parameter being added
  const [pathParamName, setPathParamName] = useState('');
  const [pathParamType, setPathParamType] = useState<'string' | 'number' | 'boolean' | 'array' | 'object'>('string');
  const [pathParamRequired, setPathParamRequired] = useState(true);
  const [pathParamDescription, setPathParamDescription] = useState('');
  const [pathParamExample, setPathParamExample] = useState('');

  // Test playground state
  const [selectedEndpointIndex, setSelectedEndpointIndex] = useState<number | null>(null);

  // Mark endpoint as successfully tested
  const markEndpointAsTested = (index: number, success: boolean) => {
    const updatedEndpoints = [...endpoints];
    updatedEndpoints[index] = {
      ...updatedEndpoints[index],
      tested: true,
      testStatus: success ? 'success' : 'error',
    };
    setEndpoints(updatedEndpoints);
  };

  // Check if all endpoints have been successfully tested
  const allEndpointsTested = endpoints.length > 0 && endpoints.every((ep) => ep.tested && ep.testStatus === 'success');

  const addHeader = () => {
    if (headerKey && headerValue) {
      setHeaders({ ...headers, [headerKey]: headerValue });
      setHeaderKey('');
      setHeaderValue('');
    }
  };

  const removeHeader = (key: string) => {
    const newHeaders = { ...headers };
    delete newHeaders[key];
    setHeaders(newHeaders);
  };

  // Parameter management functions
  const addQueryParam = () => {
    if (!queryParamName) {
      alert('파라미터 이름을 입력해주세요.');
      return;
    }
    setQueryParams([
      ...queryParams,
      {
        name: queryParamName,
        type: queryParamType,
        required: queryParamRequired,
        description: queryParamDescription || undefined,
        example: queryParamExample || undefined,
      },
    ]);
    // Reset form
    setQueryParamName('');
    setQueryParamType('string');
    setQueryParamRequired(true);
    setQueryParamDescription('');
    setQueryParamExample('');
  };

  const removeQueryParam = (index: number) => {
    setQueryParams(queryParams.filter((_, i) => i !== index));
  };

  const addPathParam = () => {
    if (!pathParamName) {
      alert('파라미터 이름을 입력해주세요.');
      return;
    }
    setPathParams([
      ...pathParams,
      {
        name: pathParamName,
        type: pathParamType,
        required: pathParamRequired,
        description: pathParamDescription || undefined,
        example: pathParamExample || undefined,
      },
    ]);
    // Reset form
    setPathParamName('');
    setPathParamType('string');
    setPathParamRequired(true);
    setPathParamDescription('');
    setPathParamExample('');
  };

  const removePathParam = (index: number) => {
    setPathParams(pathParams.filter((_, i) => i !== index));
  };

  // Auto-detect path parameters from endpoint path
  const extractPathParamNames = (path: string): string[] => {
    const matches = path.match(/\{([^}]+)\}/g);
    return matches ? matches.map((m) => m.slice(1, -1)) : [];
  };

  const addEndpoint = () => {
    if (!baseUrl) {
      alert('베이스 URL을 먼저 입력해주세요.');
      return;
    }
    if (!endpointPath) {
      alert('엔드포인트 경로를 입력해주세요. (예: /forecast)');
      return;
    }
    if (!endpointName) {
      alert('엔드포인트 이름을 입력해주세요.');
      return;
    }

    // Validate body schema if it's not empty
    if (bodySchema.trim() !== '{\n  \n}' && bodySchema.trim() !== '') {
      try {
        JSON.parse(bodySchema);
      } catch {
        alert('Body Schema JSON 형식이 올바르지 않습니다.');
        return;
      }
    }

    setEndpoints([
      ...endpoints,
      {
        path: endpointPath,
        method: endpointMethod,
        name: endpointName,
        description: endpointDescription || undefined,
        queryParams: queryParams.length > 0 ? queryParams : undefined,
        pathParams: pathParams.length > 0 ? pathParams : undefined,
        bodySchema: (bodySchema.trim() !== '{\n  \n}' && bodySchema.trim() !== '') ? bodySchema : undefined,
      },
    ]);

    // Reset all endpoint fields
    setEndpointPath('');
    setEndpointMethod('GET');
    setEndpointName('');
    setEndpointDescription('');
    setQueryParams([]);
    setPathParams([]);
    setBodySchema('{\n  \n}');
  };

  const removeEndpoint = (index: number) => {
    setEndpoints(endpoints.filter((_, i) => i !== index));
    if (selectedEndpointIndex === index) {
      setSelectedEndpointIndex(null);
    } else if (selectedEndpointIndex !== null && selectedEndpointIndex > index) {
      setSelectedEndpointIndex(selectedEndpointIndex - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (endpoints.length === 0) {
      setError('최소 1개의 엔드포인트를 추가해야 합니다.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    const { data, error: fetchError } = await tryCatch(
      apiFetch('/api/register', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          slug,
          name,
          description: description || undefined,
          base_url: baseUrl,
          category: category || undefined,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
          endpoints: endpoints.length > 0 ? endpoints : undefined,
        }),
      })
    );

    setIsSubmitting(false);

    if (fetchError) {
      setError((fetchError as any).message || 'Failed to register API');
      return;
    }

    if (data) {
      router.push('/');
    }
  };

  const selectedEndpoint = selectedEndpointIndex !== null ? endpoints[selectedEndpointIndex] : null;

  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-black mb-8">API 등록</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-black">기본 정보</h2>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="날씨 API"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              슬러그 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="weather-api"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            />
            <p className="text-xs text-gray-500 mt-1">
              이 API 전체를 식별하는 고유한 ID입니다. URL에 사용되므로 소문자, 숫자, 하이픈만 사용 가능합니다.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              예: "날씨 API"의 슬러그는 "weather-api", "결제 서비스"는 "payment-service"
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="API에 대해 설명해주세요..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              베이스 URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">카테고리</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="날씨, 금융 등"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        {/* Headers Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-black">커스텀 헤더 (선택사항)</h2>
          <p className="text-sm text-gray-600">프록시 요청 시 포함할 커스텀 헤더를 추가하세요</p>

          <div className="flex gap-2">
            <input
              type="text"
              value={headerKey}
              onChange={(e) => setHeaderKey(e.target.value)}
              placeholder="헤더 키"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            />
            <input
              type="text"
              value={headerValue}
              onChange={(e) => setHeaderValue(e.target.value)}
              placeholder="헤더 값"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button
              type="button"
              onClick={addHeader}
              className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 transition-colors"
            >
              추가
            </button>
          </div>

          {Object.keys(headers).length > 0 && (
            <div className="space-y-2">
              {Object.entries(headers).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex-1">
                    <span className="font-mono text-sm text-black">{key}:</span>{' '}
                    <span className="font-mono text-sm text-gray-600">{value}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeHeader(key)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Endpoints Section with Embedded Testing */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-black">
              엔드포인트 <span className="text-red-500">*</span>
            </h2>
            <p className="text-sm text-gray-600">API가 제공하는 엔드포인트를 정의하고 테스트하세요</p>
            <p className="text-xs text-gray-500 mt-2">
              엔드포인트는 API 내에서 실행할 수 있는 개별 기능입니다. 하나의 API는 여러 개의 엔드포인트를 가질 수 있습니다.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              예: 날씨 API → 엔드포인트 1) GET /forecast (예보 조회), 엔드포인트 2) GET /current (현재 날씨)
            </p>
          </div>

          {/* Add Endpoint Form */}
          <div className="space-y-4 p-6 bg-white border-2 border-gray-300 rounded-lg">
            <h3 className="text-lg font-semibold text-black">새 엔드포인트 정의</h3>

            {/* Basic Endpoint Info */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <select
                  value={endpointMethod}
                  onChange={(e) => setEndpointMethod(e.target.value as HttpMethod)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black bg-white"
                >
                  <option>GET</option>
                  <option>POST</option>
                  <option>PUT</option>
                  <option>DELETE</option>
                  <option>PATCH</option>
                </select>
                <input
                  type="text"
                  value={endpointPath}
                  onChange={(e) => setEndpointPath(e.target.value)}
                  placeholder="/forecast 또는 /users/{id}"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <input
                type="text"
                value={endpointName}
                onChange={(e) => setEndpointName(e.target.value)}
                placeholder="엔드포인트 이름 (예: 날씨 예보 조회)"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              />
              <input
                type="text"
                value={endpointDescription}
                onChange={(e) => setEndpointDescription(e.target.value)}
                placeholder="엔드포인트 설명 (선택사항)"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* Query Parameters Section */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-black">Query Parameters (선택사항)</h4>
                <span className="text-xs text-gray-500">예: ?city=seoul&days=7</span>
              </div>

              {/* Add Query Param Form */}
              <div className="grid grid-cols-12 gap-2">
                <input
                  type="text"
                  value={queryParamName}
                  onChange={(e) => setQueryParamName(e.target.value)}
                  placeholder="이름"
                  className="col-span-3 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                />
                <select
                  value={queryParamType}
                  onChange={(e) => setQueryParamType(e.target.value as any)}
                  className="col-span-2 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black bg-white"
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                  <option value="array">array</option>
                  <option value="object">object</option>
                </select>
                <label className="col-span-2 flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50">
                  <input
                    type="checkbox"
                    checked={queryParamRequired}
                    onChange={(e) => setQueryParamRequired(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-xs">필수</span>
                </label>
                <input
                  type="text"
                  value={queryParamDescription}
                  onChange={(e) => setQueryParamDescription(e.target.value)}
                  placeholder="설명"
                  className="col-span-3 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                />
                <button
                  type="button"
                  onClick={addQueryParam}
                  className="col-span-2 px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  + Query
                </button>
              </div>

              {/* Query Params List */}
              {queryParams.length > 0 && (
                <div className="space-y-2">
                  {queryParams.map((param, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-semibold text-blue-900">{param.name}</span>
                        <span className="px-2 py-0.5 text-xs bg-blue-200 text-blue-800 rounded">{param.type}</span>
                        {param.required && (
                          <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">required</span>
                        )}
                        {param.description && (
                          <span className="text-xs text-gray-600">- {param.description}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeQueryParam(index)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Path Parameters Section */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-black">Path Parameters (선택사항)</h4>
                <span className="text-xs text-gray-500">예: /users/{'{'}id{'}'}</span>
              </div>

              {/* Add Path Param Form */}
              <div className="grid grid-cols-12 gap-2">
                <input
                  type="text"
                  value={pathParamName}
                  onChange={(e) => setPathParamName(e.target.value)}
                  placeholder="이름"
                  className="col-span-3 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                />
                <select
                  value={pathParamType}
                  onChange={(e) => setPathParamType(e.target.value as any)}
                  className="col-span-2 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black bg-white"
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                  <option value="array">array</option>
                  <option value="object">object</option>
                </select>
                <label className="col-span-2 flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50">
                  <input
                    type="checkbox"
                    checked={pathParamRequired}
                    onChange={(e) => setPathParamRequired(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-xs">필수</span>
                </label>
                <input
                  type="text"
                  value={pathParamDescription}
                  onChange={(e) => setPathParamDescription(e.target.value)}
                  placeholder="설명"
                  className="col-span-3 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                />
                <button
                  type="button"
                  onClick={addPathParam}
                  className="col-span-2 px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                >
                  + Path
                </button>
              </div>

              {/* Path Params List */}
              {pathParams.length > 0 && (
                <div className="space-y-2">
                  {pathParams.map((param, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-semibold text-green-900">{param.name}</span>
                        <span className="px-2 py-0.5 text-xs bg-green-200 text-green-800 rounded">{param.type}</span>
                        {param.required && (
                          <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">required</span>
                        )}
                        {param.description && (
                          <span className="text-xs text-gray-600">- {param.description}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removePathParam(index)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Body Schema Section (only for POST/PUT/PATCH) */}
            {(endpointMethod === 'POST' || endpointMethod === 'PUT' || endpointMethod === 'PATCH') && (
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-black">Request Body Schema (선택사항)</h4>
                  <span className="text-xs text-gray-500">JSON 형식으로 예시 작성</span>
                </div>

                <Editor
                  height="200px"
                  defaultLanguage="json"
                  value={bodySchema}
                  onChange={(value) => setBodySchema(value || '{\n  \n}')}
                  theme="vs-light"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
                <p className="text-xs text-gray-500">
                  예시: {`{ "city": "seoul", "days": 7, "units": "metric" }`}
                </p>
              </div>
            )}

            {/* Add Endpoint Button */}
            <div className="pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={addEndpoint}
                className="w-full px-4 py-3 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 transition-colors"
              >
                엔드포인트 추가
              </button>
            </div>
          </div>

          {/* Endpoints List & Testing */}
          {endpoints.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Endpoints List */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-black mb-2">등록된 엔드포인트</h3>
                {endpoints.map((endpoint, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-md border-2 transition-colors cursor-pointer ${
                      selectedEndpointIndex === index
                        ? 'bg-black text-white border-black'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-400'
                    }`}
                    onClick={() => setSelectedEndpointIndex(index)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          selectedEndpointIndex === index ? 'bg-white text-black' : 'bg-black text-white'
                        }`}
                      >
                        {endpoint.method}
                      </span>
                      <span className="font-mono text-sm">{endpoint.path}</span>
                    </div>
                    <div className="text-sm font-medium">{endpoint.name}</div>
                    {endpoint.description && (
                      <div className={`text-sm mt-1 ${selectedEndpointIndex === index ? 'text-gray-300' : 'text-gray-600'}`}>
                        {endpoint.description}
                      </div>
                    )}

                    {/* Show parameter counts and test status */}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {endpoint.queryParams && endpoint.queryParams.length > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded ${selectedEndpointIndex === index ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>
                          {endpoint.queryParams.length} Query Param{endpoint.queryParams.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {endpoint.pathParams && endpoint.pathParams.length > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded ${selectedEndpointIndex === index ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700'}`}>
                          {endpoint.pathParams.length} Path Param{endpoint.pathParams.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {endpoint.bodySchema && (
                        <span className={`text-xs px-2 py-0.5 rounded ${selectedEndpointIndex === index ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-700'}`}>
                          Body Schema
                        </span>
                      )}
                      {endpoint.tested && endpoint.testStatus === 'success' && (
                        <span className={`text-xs px-2 py-0.5 rounded ${selectedEndpointIndex === index ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700'}`}>
                          ✓ Tested
                        </span>
                      )}
                      {endpoint.tested && endpoint.testStatus === 'error' && (
                        <span className={`text-xs px-2 py-0.5 rounded ${selectedEndpointIndex === index ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'}`}>
                          ✗ Failed
                        </span>
                      )}
                      {!endpoint.tested && (
                        <span className={`text-xs px-2 py-0.5 rounded ${selectedEndpointIndex === index ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                          Not Tested
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeEndpoint(index);
                      }}
                      className={`text-xs mt-2 ${
                        selectedEndpointIndex === index
                          ? 'text-red-300 hover:text-red-100'
                          : 'text-red-600 hover:text-red-800'
                      }`}
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>

              {/* Right: Test Playground */}
              <div>
                {selectedEndpointIndex !== null && selectedEndpoint && baseUrl ? (
                  <ApiTestPlayground
                    baseUrl={baseUrl}
                    path={selectedEndpoint.path}
                    method={selectedEndpoint.method}
                    defaultHeaders={headers}
                    onTestComplete={(success) => markEndpointAsTested(selectedEndpointIndex, success)}
                  />
                ) : selectedEndpointIndex !== null && selectedEndpoint && !baseUrl ? (
                  <div className="p-8 border border-gray-300 rounded-lg bg-gray-50 text-center">
                    <p className="text-sm text-gray-600">
                      베이스 URL을 먼저 입력하세요
                    </p>
                  </div>
                ) : (
                  <div className="p-8 border border-gray-300 rounded-lg bg-gray-50 text-center">
                    <p className="text-sm text-gray-600">
                      엔드포인트를 선택하면 테스트할 수 있습니다
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 border border-gray-200 rounded-lg bg-gray-50 text-center">
              <p className="text-sm text-gray-600">
                등록된 엔드포인트가 없습니다. 최소 1개의 엔드포인트를 추가하세요.
              </p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="space-y-3">
          {endpoints.length > 0 && !allEndpointsTested && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                모든 엔드포인트를 테스트한 후 등록할 수 있습니다. ({endpoints.filter(ep => ep.tested && ep.testStatus === 'success').length}/{endpoints.length} 테스트 완료)
              </p>
            </div>
          )}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSubmitting || endpoints.length === 0 || !allEndpointsTested}
              className="px-6 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '등록 중...' : 'API 등록'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-6 py-2 text-sm font-medium text-black bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}