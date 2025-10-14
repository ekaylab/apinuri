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
  category?: string;
  proxy_url: string;
  created_at: string;
}

export default function PublicApisList() {
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
      apiFetch('/api', {
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

  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-black mb-3">API 마켓플레이스</h1>
        <p className="text-lg text-gray-600">
          다양한 공개 API를 탐색하고 사용해보세요
        </p>
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
          <p className="text-gray-600 mb-4">첫 번째 API를 등록해주세요!</p>
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
              className="p-6 border border-gray-300 rounded-lg hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/apis/${api.slug}`)}
            >
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-black mb-1">{api.name}</h3>
                <p className="text-xs text-gray-500 font-mono">{api.slug}</p>
              </div>

              {api.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{api.description}</p>
              )}

              {api.category && (
                <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded mb-3">
                  {api.category}
                </span>
              )}

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <span className="text-xs text-gray-500">
                  {new Date(api.created_at).toLocaleDateString('ko-KR')}
                </span>
                <span className="text-xs font-medium text-black hover:underline">
                  자세히 보기 →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}