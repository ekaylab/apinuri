'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/utils/fetch';
import tryCatch from '@/utils/tryCatch';
import ApiTestPlayground from '@/components/ApiTestPlayground';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';

interface Endpoint {
  path: string;
  method: HttpMethod;
  name: string;
  description?: string;
}

export default function RegisterApiPage() {
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

  // Test playground state
  const [selectedEndpointIndex, setSelectedEndpointIndex] = useState<number | null>(null);

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

  const addEndpoint = () => {
    if (endpointPath && endpointName) {
      setEndpoints([
        ...endpoints,
        {
          path: endpointPath,
          method: endpointMethod,
          name: endpointName,
          description: endpointDescription || undefined,
        },
      ]);
      setEndpointPath('');
      setEndpointMethod('GET');
      setEndpointName('');
      setEndpointDescription('');
    }
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
            <p className="text-xs text-gray-500 mt-1">URL 친화적인 식별자 (소문자, 숫자, 하이픈만 사용 가능)</p>
          </div>

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
          </div>

          {/* Add Endpoint Form */}
          <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
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
                placeholder="/forecast"
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
            <button
              type="button"
              onClick={addEndpoint}
              className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 transition-colors"
            >
              엔드포인트 추가
            </button>
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
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting || endpoints.length === 0}
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
      </form>
    </main>
  );
}