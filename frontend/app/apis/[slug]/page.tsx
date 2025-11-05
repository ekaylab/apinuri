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
    <main className="min-h-screen bg-white flex flex-col">
      {/* Breadcrumb Header */}
      <div className="border-b bg-gray-50 px-6 py-4">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span>Home</span>
          <span>/</span>
          <span className="font-medium text-gray-900">{api.name}</span>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex flex-1 min-h-[85vh]">
        <ApiPlayground api={api} />
      </div>
    </main>
  );
}