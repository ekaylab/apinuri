import { notFound } from 'next/navigation';
import { ApiPlayground } from './ApiPlayground';
import { apiFetch } from '@/utils/fetch';
import tryCatch from '@/utils/tryCatch';

async function getApiDetails(slug: string) {
  // Fetch all APIs first
  const { data: listData, error: listError } = await tryCatch(
    apiFetch('/api', {
      credentials: 'include',
    })
  );

  if (listError || !listData) {
    console.error('Failed to fetch API list:', listError);
    return null;
  }

  const api = listData.apis.find((a: any) => a.slug === slug);

  if (!api) {
    return null;
  }

  // Fetch full details with endpoints
  const { data: detailData, error: detailError } = await tryCatch(
    apiFetch(`/api/${api.id}`, {
      credentials: 'include',
    })
  );

  if (detailError || !detailData) {
    console.error('Failed to fetch API details:', detailError);
    return null;
  }

  return detailData;
}

export default async function ApiDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const api = await getApiDetails(slug);

  if (!api) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-black">{api.name}</h1>
                {api.category && (
                  <span className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-full border border-gray-300">
                    {api.category}
                  </span>
                )}
              </div>
              {api.description && (
                <p className="text-base text-gray-600 max-w-3xl">{api.description}</p>
              )}
            </div>
          </div>

          {/* Quick Info Pills */}
          <div className="flex flex-wrap gap-3 mt-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm font-medium text-blue-900">
                {api.endpoints?.length || 0} 엔드포인트
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - API Info */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden sticky top-6">
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-3">
                <h3 className="text-sm font-bold text-white">API 정보</h3>
              </div>

              <div className="p-4 space-y-4">
                {/* Base URL */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">베이스 URL</h4>
                  </div>
                  <code className="text-xs text-gray-800 bg-gray-50 px-3 py-2 rounded-md block break-all border border-gray-200">
                    {api.base_url}
                  </code>
                </div>

                {/* Custom Headers */}
                {api.headers && Object.keys(api.headers).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <h4 className="text-xs font-semibold text-purple-700 uppercase tracking-wide">커스텀 헤더</h4>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-md p-3 space-y-1.5">
                      {Object.entries(api.headers).map(([key, value]) => (
                        <div key={key} className="text-xs">
                          <span className="font-mono font-semibold text-purple-900">{key}:</span>{' '}
                          <span className="font-mono text-purple-700">{value as string}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content - API Playground */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-black to-gray-800 px-6 py-4">
                <h2 className="text-lg font-bold text-white">API Playground</h2>
                <p className="text-sm text-gray-300 mt-1">테스트하고 싶은 엔드포인트를 선택하세요</p>
              </div>
              <div className="p-6">
                <ApiPlayground api={api} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}