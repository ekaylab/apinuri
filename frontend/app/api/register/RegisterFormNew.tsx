'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/utils/fetch';
import tryCatch from '@/utils/tryCatch';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface Parameter {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  description?: string;
}

interface Endpoint {
  path: string;
  method: HttpMethod;
  name: string;
  description?: string;
  queryParams?: Parameter[];
  pathParams?: Parameter[];
  tested?: boolean;
}

export default function RegisterFormNew() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Basic Info
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [category, setCategory] = useState('');

  // Step 2: Endpoints
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [showEndpointForm, setShowEndpointForm] = useState(false);

  // Current endpoint being edited
  const [currentPath, setCurrentPath] = useState('');
  const [currentMethod, setCurrentMethod] = useState<HttpMethod>('GET');
  const [currentName, setCurrentName] = useState('');
  const [currentDescription, setCurrentDescription] = useState('');
  const [currentQueryParams, setCurrentQueryParams] = useState<Parameter[]>([]);
  const [currentPathParams, setCurrentPathParams] = useState<Parameter[]>([]);

  // Testing state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const addQueryParam = () => {
    const name = prompt('파라미터 이름 (예: city)');
    if (!name) return;

    const required = confirm('필수 파라미터인가요?');
    const description = prompt('파라미터 설명 (선택사항)');

    setCurrentQueryParams([
      ...currentQueryParams,
      { name, type: 'string', required, description: description || undefined },
    ]);
  };

  const addPathParam = () => {
    const name = prompt('Path 파라미터 이름 (예: id)');
    if (!name) return;

    const required = confirm('필수 파라미터인가요?');
    const description = prompt('파라미터 설명 (선택사항)');

    setCurrentPathParams([
      ...currentPathParams,
      { name, type: 'string', required, description: description || undefined },
    ]);
  };

  const testEndpoint = async () => {
    if (!baseUrl) {
      alert('베이스 URL을 먼저 입력해주세요.');
      return;
    }

    if (!currentPath || !currentName) {
      alert('경로와 이름을 먼저 입력해주세요.');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Build test URL
      let testPath = currentPath;

      // Replace path params with test values
      currentPathParams.forEach(param => {
        const testValue = prompt(`Path 파라미터 "${param.name}" 테스트 값을 입력하세요:`);
        if (testValue) {
          testPath = testPath.replace(`{${param.name}}`, testValue);
        }
      });

      // Build query params
      const queryParamsObj: Record<string, string> = {};
      currentQueryParams.forEach(param => {
        const testValue = prompt(`Query 파라미터 "${param.name}" 테스트 값을 입력하세요 (선택사항):`);
        if (testValue) {
          queryParamsObj[param.name] = testValue;
        }
      });

      const queryString = Object.entries(queryParamsObj)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');

      const fullUrl = `${baseUrl}${testPath}${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(fullUrl, {
        method: currentMethod,
      });

      if (response.ok) {
        setTestResult({ success: true, message: `테스트 성공! (${response.status} ${response.statusText})` });
      } else {
        setTestResult({ success: false, message: `테스트 실패: ${response.status} ${response.statusText}` });
      }
    } catch (error: any) {
      setTestResult({ success: false, message: `테스트 실패: ${error.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  const saveEndpoint = () => {
    if (!currentPath || !currentName) {
      alert('경로와 이름은 필수입니다.');
      return;
    }

    if (!testResult || !testResult.success) {
      alert('엔드포인트를 테스트하고 성공한 후에 저장할 수 있습니다.');
      return;
    }

    setEndpoints([
      ...endpoints,
      {
        path: currentPath,
        method: currentMethod,
        name: currentName,
        description: currentDescription || undefined,
        queryParams: currentQueryParams.length > 0 ? currentQueryParams : undefined,
        pathParams: currentPathParams.length > 0 ? currentPathParams : undefined,
        tested: true,
      },
    ]);

    // Reset
    setCurrentPath('');
    setCurrentMethod('GET');
    setCurrentName('');
    setCurrentDescription('');
    setCurrentQueryParams([]);
    setCurrentPathParams([]);
    setTestResult(null);
    setShowEndpointForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !slug || !baseUrl) {
      setError('이름, 슬러그, 베이스 URL은 필수입니다.');
      return;
    }

    if (endpoints.length === 0) {
      setError('최소 1개의 엔드포인트를 추가해주세요.');
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
          endpoints,
        }),
      })
    );

    setIsSubmitting(false);

    if (fetchError) {
      setError((fetchError as any).message || 'API 등록에 실패했습니다');
      return;
    }

    if (data) {
      router.push('/my-apis');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">새 API 등록</h1>
          <p className="text-gray-600">API 정보를 입력하고 엔드포인트를 추가하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-black mb-4">기본 정보</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API 이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="날씨 API"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    슬러그 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="weather-api"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  베이스 URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.example.com"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    카테고리
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="날씨, 금융, 교통 등"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="API에 대한 간단한 설명..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Endpoints Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-black">엔드포인트</h2>
                <p className="text-sm text-gray-600 mt-1">최소 1개 이상 추가해주세요</p>
              </div>
              {!showEndpointForm && (
                <button
                  type="button"
                  onClick={() => setShowEndpointForm(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  + 엔드포인트 추가
                </button>
              )}
            </div>

            {/* Endpoint Form */}
            {showEndpointForm && (
              <div className="mb-6 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                <h3 className="text-sm font-semibold text-black mb-3">새 엔드포인트</h3>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <select
                      value={currentMethod}
                      onChange={(e) => setCurrentMethod(e.target.value as HttpMethod)}
                      className="px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option>GET</option>
                      <option>POST</option>
                      <option>PUT</option>
                      <option>DELETE</option>
                      <option>PATCH</option>
                    </select>
                    <input
                      type="text"
                      value={currentPath}
                      onChange={(e) => setCurrentPath(e.target.value)}
                      placeholder="/weather 또는 /users/{id}"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <input
                    type="text"
                    value={currentName}
                    onChange={(e) => setCurrentName(e.target.value)}
                    placeholder="엔드포인트 이름 (예: 날씨 조회)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <input
                    type="text"
                    value={currentDescription}
                    onChange={(e) => setCurrentDescription(e.target.value)}
                    placeholder="설명 (선택사항)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {/* Parameters */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={addQueryParam}
                      className="flex-1 px-3 py-2 text-sm text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
                    >
                      + Query 파라미터
                    </button>
                    <button
                      type="button"
                      onClick={addPathParam}
                      className="flex-1 px-3 py-2 text-sm text-green-700 bg-green-100 rounded-md hover:bg-green-200"
                    >
                      + Path 파라미터
                    </button>
                  </div>

                  {/* Show added params */}
                  {currentQueryParams.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-700">Query 파라미터:</p>
                      {currentQueryParams.map((param, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-white px-2 py-1 rounded">
                          <span className="font-mono">{param.name}</span>
                          <span className="text-gray-600">{param.required ? '필수' : '선택'}</span>
                          <button
                            type="button"
                            onClick={() => setCurrentQueryParams(currentQueryParams.filter((_, i) => i !== idx))}
                            className="text-red-600 hover:text-red-800"
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {currentPathParams.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-700">Path 파라미터:</p>
                      {currentPathParams.map((param, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-white px-2 py-1 rounded">
                          <span className="font-mono">{param.name}</span>
                          <span className="text-gray-600">{param.required ? '필수' : '선택'}</span>
                          <button
                            type="button"
                            onClick={() => setCurrentPathParams(currentPathParams.filter((_, i) => i !== idx))}
                            className="text-red-600 hover:text-red-800"
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Test Button */}
                  <div className="pt-2 border-t border-blue-300">
                    <button
                      type="button"
                      onClick={testEndpoint}
                      disabled={isTesting || !currentPath || !currentName}
                      className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isTesting ? '테스트 중...' : '엔드포인트 테스트'}
                    </button>
                  </div>

                  {/* Test Result */}
                  {testResult && (
                    <div className={`p-3 rounded-md ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <p className={`text-sm ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                        {testResult.success ? '✓ ' : '✗ '}
                        {testResult.message}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={saveEndpoint}
                      disabled={!testResult || !testResult.success}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEndpointForm(false);
                        setCurrentPath('');
                        setCurrentMethod('GET');
                        setCurrentName('');
                        setCurrentDescription('');
                        setCurrentQueryParams([]);
                        setCurrentPathParams([]);
                        setTestResult(null);
                      }}
                      className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Endpoints List */}
            {endpoints.length > 0 ? (
              <div className="space-y-2">
                {endpoints.map((endpoint, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-1 text-xs font-bold text-white bg-black rounded">
                            {endpoint.method}
                          </span>
                          <span className="font-mono text-sm text-gray-900">{endpoint.path}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{endpoint.name}</p>
                        {endpoint.description && (
                          <p className="text-sm text-gray-600 mt-1">{endpoint.description}</p>
                        )}

                        {/* Show params count */}
                        <div className="flex gap-2 mt-2">
                          {endpoint.queryParams && endpoint.queryParams.length > 0 && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                              {endpoint.queryParams.length} Query
                            </span>
                          )}
                          {endpoint.pathParams && endpoint.pathParams.length > 0 && (
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                              {endpoint.pathParams.length} Path
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEndpoints(endpoints.filter((_, i) => i !== index))}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm border-2 border-dashed border-gray-300 rounded-lg">
                엔드포인트를 추가해주세요
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 text-base font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '등록 중...' : 'API 등록하기'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-6 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}