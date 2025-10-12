'use client';

import env from '@/env';

export default function LoginPage() {
  const handleGitHubLogin = () => {
    // Redirect to backend OAuth endpoint
    window.location.href = `${env.api.MAIN_API_URL}/auth/github`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="max-w-md w-full mx-4">
        <div className="border border-gray-200 rounded-lg p-8">
          {/* Logo/Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-black mb-2">
              API누리
            </h1>
            <p className="text-gray-600">
              대한민국 1위 API 마켓플레이스
            </p>
          </div>

          {/* Login Button */}
          <button
            onClick={handleGitHubLogin}
            className="w-full flex items-center justify-center gap-3 bg-black hover:bg-gray-800 text-white font-medium py-2.5 px-4 rounded-md transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            GitHub로 계속하기
          </button>

          {/* Info Text */}
          <p className="text-xs text-gray-500 text-center mt-6">
            계정이 없으신가요? GitHub 로그인 시 자동으로 생성됩니다.
          </p>
        </div>

        {/* Features */}
        <div className="mt-8 text-center text-sm text-gray-600 space-y-2">
          <p>✓ API 등록 및 관리</p>
          <p>✓ 프록시 서비스 제공</p>
          <p>✓ 사용량 통계 및 분석</p>
        </div>
      </div>
    </div>
  );
}