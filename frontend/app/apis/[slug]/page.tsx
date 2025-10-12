import { notFound } from 'next/navigation';
import { ApiPlayground } from './ApiPlayground';

async function getApiDetails(slug: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_MAIN_API_URL}/api`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const api = data.apis.find((a: any) => a.slug === slug);

    if (!api) {
      return null;
    }

    // Fetch full details with endpoints
    const detailResponse = await fetch(
      `${process.env.NEXT_PUBLIC_MAIN_API_URL}/api/${api.id}`,
      {
        cache: 'no-store',
      }
    );

    if (!detailResponse.ok) {
      return null;
    }

    return await detailResponse.json();
  } catch (error) {
    console.error('Failed to fetch API details:', error);
    return null;
  }
}

export default async function ApiDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const api = await getApiDetails(params.slug);

  if (!api) {
    notFound();
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-black mb-2">{api.name}</h1>
        {api.description && (
          <p className="text-lg text-gray-600">{api.description}</p>
        )}
        {api.category && (
          <span className="inline-block mt-3 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md">
            {api.category}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar - API Info */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-6">
            {/* Base URL */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-black mb-2">베이스 URL</h3>
              <code className="text-sm text-gray-700 break-all">{api.base_url}</code>
            </div>

            {/* Proxy URL */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-black mb-2">프록시 URL</h3>
              <code className="text-sm text-gray-700 break-all">{api.proxy_url}</code>
              <p className="text-xs text-gray-500 mt-2">
                API누리 프록시를 통해 호출하세요
              </p>
            </div>

            {/* Custom Headers */}
            {api.headers && Object.keys(api.headers).length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-black mb-2">
                  커스텀 헤더
                </h3>
                <div className="space-y-2">
                  {Object.entries(api.headers).map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="font-mono text-gray-700">{key}:</span>{' '}
                      <span className="font-mono text-gray-600">{value as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Endpoints List */}
            {api.endpoints && api.endpoints.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-black mb-3">
                  엔드포인트 ({api.endpoints.length})
                </h3>
                <div className="space-y-2">
                  {api.endpoints.map((endpoint: any) => (
                    <a
                      key={endpoint.id}
                      href={`#endpoint-${endpoint.id}`}
                      className="block p-2 hover:bg-white rounded transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs font-medium text-white bg-black rounded">
                          {endpoint.method}
                        </span>
                        <span className="text-sm font-mono text-gray-700">
                          {endpoint.path}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1 ml-1">
                        {endpoint.name}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content - API Playground */}
        <div className="lg:col-span-2">
          <ApiPlayground api={api} />
        </div>
      </div>
    </main>
  );
}