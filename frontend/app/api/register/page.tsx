'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_MAIN_API_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to register API');
      }

      const data = await response.json();
      router.push('/'); // Redirect to home or API detail page
    } catch (err: any) {
      setError(err.message || 'Failed to register API');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
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

          {/* Endpoints Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-black">엔드포인트 (선택사항)</h2>
            <p className="text-sm text-gray-600">API가 제공하는 엔드포인트를 정의하세요</p>

            <div className="space-y-3">
              <div className="flex gap-2">
                <select
                  value={endpointMethod}
                  onChange={(e) => setEndpointMethod(e.target.value as HttpMethod)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
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

            {endpoints.length > 0 && (
              <div className="space-y-2">
                {endpoints.map((endpoint, index) => (
                  <div key={index} className="flex items-start justify-between p-4 bg-gray-50 rounded-md">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 text-xs font-medium text-white bg-black rounded">
                          {endpoint.method}
                        </span>
                        <span className="font-mono text-sm text-black">{endpoint.path}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900">{endpoint.name}</div>
                      {endpoint.description && (
                        <div className="text-sm text-gray-600 mt-1">{endpoint.description}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEndpoint(index)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      삭제
                    </button>
                  </div>
                ))}
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
              disabled={isSubmitting}
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