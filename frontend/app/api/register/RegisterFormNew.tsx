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
  const [showTestForm, setShowTestForm] = useState(false);
  const [testValues, setTestValues] = useState<Record<string, string>>({});

  // Parameter form state
  const [showQueryParamForm, setShowQueryParamForm] = useState(false);
  const [showPathParamForm, setShowPathParamForm] = useState(false);
  const [newParamName, setNewParamName] = useState('');
  const [newParamType, setNewParamType] = useState<'string' | 'number' | 'boolean'>('string');
  const [newParamRequired, setNewParamRequired] = useState(false);
  const [newParamDescription, setNewParamDescription] = useState('');

  const addQueryParam = () => {
    if (!newParamName.trim()) return;

    setCurrentQueryParams([
      ...currentQueryParams,
      {
        name: newParamName,
        type: newParamType,
        required: newParamRequired,
        description: newParamDescription || undefined
      },
    ]);

    // Reset form
    setNewParamName('');
    setNewParamType('string');
    setNewParamRequired(false);
    setNewParamDescription('');
    setShowQueryParamForm(false);
  };

  const addPathParam = () => {
    if (!newParamName.trim()) return;

    setCurrentPathParams([
      ...currentPathParams,
      {
        name: newParamName,
        type: newParamType,
        required: newParamRequired,
        description: newParamDescription || undefined
      },
    ]);

    // Reset form
    setNewParamName('');
    setNewParamType('string');
    setNewParamRequired(false);
    setNewParamDescription('');
    setShowPathParamForm(false);
  };

  const initiateTest = () => {
    if (!baseUrl) {
      setError('베이스 URL을 먼저 입력해주세요.');
      return;
    }

    if (!currentPath || !currentName) {
      setError('경로와 이름을 먼저 입력해주세요.');
      return;
    }

    // Check if there are params to test
    if (currentPathParams.length > 0 || currentQueryParams.length > 0) {
      setShowTestForm(true);
      setTestValues({});
    } else {
      // No params, test directly
      executeTest({});
    }
  };

  const executeTest = async (values: Record<string, string>) => {
    setIsTesting(true);
    setTestResult(null);
    setError('');

    try {
      // Build test URL
      let testPath = currentPath;

      // Replace path params with test values
      currentPathParams.forEach(param => {
        const testValue = values[`path_${param.name}`] || '';
        if (testValue) {
          testPath = testPath.replace(`{${param.name}}`, testValue);
        }
      });

      // Build query params
      const queryParamsObj: Record<string, string> = {};
      currentQueryParams.forEach(param => {
        const testValue = values[`query_${param.name}`];
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
      setShowTestForm(false);
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

    const payload = {
      slug,
      name,
      description: description || undefined,
      base_url: baseUrl,
      category: category || undefined,
      endpoints,
    };
    console.log('Submitting payload:', JSON.stringify(payload, null, 2));

    const { data, error: fetchError } = await tryCatch(
      apiFetch('/api/register', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(payload),
      })
    );

    setIsSubmitting(false);

    if (fetchError) {
      setError((fetchError as any).message || 'API 등록에 실패했습니다');
      return;
    }

    if (data) {
      router.push('/');
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

                  <textarea
                    value={currentDescription}
                    onChange={(e) => setCurrentDescription(e.target.value)}
                    placeholder="설명 (선택사항)"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {/* Parameters */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowQueryParamForm(true)}
                      className="flex-1 px-3 py-2 text-sm text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
                    >
                      + Query 파라미터
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPathParamForm(true)}
                      className="flex-1 px-3 py-2 text-sm text-green-700 bg-green-100 rounded-md hover:bg-green-200"
                    >
                      + Path 파라미터
                    </button>
                  </div>

                  {/* Query Param Form */}
                  {showQueryParamForm && (
                    <div className="p-3 bg-white rounded-lg border-2 border-blue-300 space-y-2">
                      <h4 className="text-xs font-semibold text-gray-900">Query 파라미터 추가</h4>
                      <input
                        type="text"
                        value={newParamName}
                        onChange={(e) => setNewParamName(e.target.value)}
                        placeholder="파라미터 이름 (예: city)"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex gap-2">
                        <select
                          value={newParamType}
                          onChange={(e) => setNewParamType(e.target.value as 'string' | 'number' | 'boolean')}
                          className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="string">string</option>
                          <option value="number">number</option>
                          <option value="boolean">boolean</option>
                        </select>
                        <select
                          value={newParamRequired ? 'true' : 'false'}
                          onChange={(e) => setNewParamRequired(e.target.value === 'true')}
                          className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="false">선택</option>
                          <option value="true">필수</option>
                        </select>
                      </div>
                      <input
                        type="text"
                        value={newParamDescription}
                        onChange={(e) => setNewParamDescription(e.target.value)}
                        placeholder="설명 (선택사항)"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={addQueryParam}
                          disabled={!newParamName.trim()}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400"
                        >
                          추가
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowQueryParamForm(false);
                            setNewParamName('');
                            setNewParamType('string');
                            setNewParamRequired(false);
                            setNewParamDescription('');
                          }}
                          className="px-3 py-1.5 text-xs text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Path Param Form */}
                  {showPathParamForm && (
                    <div className="p-3 bg-white rounded-lg border-2 border-green-300 space-y-2">
                      <h4 className="text-xs font-semibold text-gray-900">Path 파라미터 추가</h4>
                      <input
                        type="text"
                        value={newParamName}
                        onChange={(e) => setNewParamName(e.target.value)}
                        placeholder="파라미터 이름 (예: id)"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <div className="flex gap-2">
                        <select
                          value={newParamType}
                          onChange={(e) => setNewParamType(e.target.value as 'string' | 'number' | 'boolean')}
                          className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="string">string</option>
                          <option value="number">number</option>
                          <option value="boolean">boolean</option>
                        </select>
                        <select
                          value={newParamRequired ? 'true' : 'false'}
                          onChange={(e) => setNewParamRequired(e.target.value === 'true')}
                          className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="false">선택</option>
                          <option value="true">필수</option>
                        </select>
                      </div>
                      <input
                        type="text"
                        value={newParamDescription}
                        onChange={(e) => setNewParamDescription(e.target.value)}
                        placeholder="설명 (선택사항)"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={addPathParam}
                          disabled={!newParamName.trim()}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-400"
                        >
                          추가
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPathParamForm(false);
                            setNewParamName('');
                            setNewParamType('string');
                            setNewParamRequired(false);
                            setNewParamDescription('');
                          }}
                          className="px-3 py-1.5 text-xs text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Show added params */}
                  {currentQueryParams.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-700">Query 파라미터:</p>
                      {currentQueryParams.map((param, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-white px-2 py-1 rounded border border-gray-200">
                          <span className="font-mono">{param.name}</span>
                          <span className="text-gray-500 text-[10px]">({param.type})</span>
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
                        <div key={idx} className="flex items-center justify-between text-xs bg-white px-2 py-1 rounded border border-gray-200">
                          <span className="font-mono">{param.name}</span>
                          <span className="text-gray-500 text-[10px]">({param.type})</span>
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
                      onClick={initiateTest}
                      disabled={isTesting || !currentPath || !currentName}
                      className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isTesting ? '테스트 중...' : '엔드포인트 테스트'}
                    </button>
                  </div>

                  {/* Test Form */}
                  {showTestForm && (
                    <div className="p-3 bg-white rounded-lg border-2 border-green-300 space-y-2">
                      <h4 className="text-xs font-semibold text-gray-900">테스트 값 입력</h4>

                      {currentPathParams.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-700">Path 파라미터:</p>
                          {currentPathParams.map((param) => (
                            <div key={param.name}>
                              <label className="block text-xs text-gray-600 mb-1">
                                {param.name} {param.required && <span className="text-red-500">*</span>}
                              </label>
                              <input
                                type="text"
                                value={testValues[`path_${param.name}`] || ''}
                                onChange={(e) => setTestValues({ ...testValues, [`path_${param.name}`]: e.target.value })}
                                placeholder={param.description || `${param.name} 값`}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {currentQueryParams.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-700">Query 파라미터:</p>
                          {currentQueryParams.map((param) => (
                            <div key={param.name}>
                              <label className="block text-xs text-gray-600 mb-1">
                                {param.name} {param.required && <span className="text-red-500">*</span>}
                              </label>
                              <input
                                type="text"
                                value={testValues[`query_${param.name}`] || ''}
                                onChange={(e) => setTestValues({ ...testValues, [`query_${param.name}`]: e.target.value })}
                                placeholder={param.description || `${param.name} 값`}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => executeTest(testValues)}
                          disabled={isTesting}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-400"
                        >
                          {isTesting ? '테스트 중...' : '테스트 실행'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowTestForm(false);
                            setTestValues({});
                          }}
                          className="px-3 py-1.5 text-xs text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}

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