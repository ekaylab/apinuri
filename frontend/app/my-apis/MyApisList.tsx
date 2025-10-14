'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/utils/fetch';
import tryCatch from '@/utils/tryCatch';

interface Endpoint {
  id: string;
  path: string;
  method: string;
  name: string;
  description?: string;
}

interface API {
  id: string;
  slug: string;
  name: string;
  description?: string;
  base_url: string;
  category?: string;
  proxy_url: string;
  endpoints: Endpoint[];
  created_at: string;
  is_active: boolean;
}

export default function MyApisList() {
  const router = useRouter();
  const [apis, setApis] = useState<API[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApis();
  }, []);

  const fetchApis = async () => {
    setIsLoading(true);
    const { data, error: fetchError } = await tryCatch(
      apiFetch('/api/my-apis', {
        credentials: 'include',
      })
    );

    setIsLoading(false);

    if (fetchError) {
      setError((fetchError as any).message || 'Failed to fetch APIs');
      return;
    }

    if (data) {
      setApis(data.apis || []);
    }
  };

  const handleDelete = async (apiId: string) => {
    if (!confirm('정말 이 API를 삭제하시겠습니까?')) {
      return;
    }

    const { error: deleteError } = await tryCatch(
      apiFetch(`/api/${apiId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
    );

    if (deleteError) {
      alert((deleteError as any).message || 'Failed to delete API');
      return;
    }

    // Refresh the list
    fetchApis();
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-black">내 API</h1>
          <button
            onClick={() => router.push('/api/register')}
            className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 transition-colors"
          >
            + 새 API 등록
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">로딩 중...</p>
          </div>
        ) : apis.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">등록된 API가 없습니다</h2>
            <p className="text-gray-600 mb-4">첫 API를 등록해보세요!</p>
            <button
              onClick={() => router.push('/api/register')}
              className="px-6 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 transition-colors"
            >
              API 등록하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apis.map((api) => (
              <div
                key={api.id}
                className="p-6 border border-gray-300 rounded-lg hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-black">{api.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">{api.slug}</p>
                  </div>
                  {!api.is_active && (
                    <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                      Inactive
                    </span>
                  )}
                </div>

                {api.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{api.description}</p>
                )}

                {api.category && (
                  <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded mb-3">
                    {api.category}
                  </span>
                )}

                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">Base URL:</p>
                  <p className="text-xs font-mono text-gray-700 break-all">{api.base_url}</p>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-gray-500">
                    {api.endpoints.length} endpoint{api.endpoints.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/my-apis/${api.id}/edit`)}
                    className="flex-1 px-3 py-2 text-sm font-medium text-black bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    편집
                  </button>
                  <button
                    onClick={() => router.push(`/apis/${api.slug}`)}
                    className="flex-1 px-3 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 transition-colors"
                  >
                    보기
                  </button>
                  <button
                    onClick={() => handleDelete(api.id)}
                    className="px-3 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-50 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}