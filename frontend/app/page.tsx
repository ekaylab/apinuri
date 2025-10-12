import { Header } from '@/components/Header';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-black mb-6">
            대한민국 1위 API 마켓플레이스
          </h1>
          <p className="text-lg text-gray-600">
            등록된 API가 아직 없습니다.
          </p>
        </div>
      </main>
    </div>
  );
}
