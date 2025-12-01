'use client';

import { useState } from 'react';
import { languagesAPI } from '@/lib/api';

interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  languageId: string;
}

interface TemplateGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguage: string;
  onSelectTemplate: (code: string) => void;
}

// Template catalog - 각 언어별 사용 가능한 템플릿 목록
const TEMPLATES: Record<string, TemplateInfo[]> = {
  kingsejong_v0_3: [
    {
      id: 'hello_world',
      name: 'Hello World',
      description: '킹세종 Hello World 프로그램',
      languageId: 'kingsejong_v0_3',
    },
    {
      id: 'fibonacci',
      name: '피보나치 수열',
      description: '피보나치 수열 재귀 함수 예제',
      languageId: 'kingsejong_v0_3',
    },
    {
      id: 'functions',
      name: '함수 예제',
      description: '함수와 고차 함수 예제',
      languageId: 'kingsejong_v0_3',
    },
    {
      id: 'functional_array',
      name: '함수형 배열',
      description: '함수형 배열 메서드 예제 (걸러낸다, 변환한다, 축약한다)',
      languageId: 'kingsejong_v0_3',
    },
    {
      id: 'calculator',
      name: '계산기',
      description: '간단한 계산기 예제',
      languageId: 'kingsejong_v0_3',
    },
    {
      id: 'classes',
      name: '클래스',
      description: '클래스 및 객체지향 프로그래밍 예제',
      languageId: 'kingsejong_v0_3',
    },
    {
      id: 'async_await',
      name: '비동기',
      description: '비동기 프로그래밍 (async/await) 예제',
      languageId: 'kingsejong_v0_3',
    },
    {
      id: 'array_demo',
      name: '배열',
      description: '배열 조작 및 메서드 예제',
      languageId: 'kingsejong_v0_3',
    },
    {
      id: 'loops',
      name: '반복문',
      description: '반복문 (for/while) 예제',
      languageId: 'kingsejong_v0_3',
    },
    {
      id: 'stdlib_json',
      name: 'JSON',
      description: 'JSON 파싱 및 조작 (stdlib)',
      languageId: 'kingsejong_v0_3',
    },
    {
      id: 'stdlib_time',
      name: '시간/날짜',
      description: '시간/날짜 처리 (stdlib)',
      languageId: 'kingsejong_v0_3',
    },
    {
      id: 'stdlib_io',
      name: '파일 I/O',
      description: '파일 입출력 (stdlib)',
      languageId: 'kingsejong_v0_3',
    },
    {
      id: 'stdlib_utils',
      name: '유틸리티',
      description: '유틸리티 함수 (stdlib)',
      languageId: 'kingsejong_v0_3',
    },
    {
      id: 'stdlib_http',
      name: 'HTTP',
      description: 'HTTP 요청 및 API 호출 (stdlib)',
      languageId: 'kingsejong_v0_3',
    },
    {
      id: 'stdlib_db',
      name: '데이터베이스',
      description: 'SQLite 데이터베이스 (stdlib)',
      languageId: 'kingsejong_v0_3',
    },
    {
      id: 'stdlib_regex',
      name: '정규표현식',
      description: '정규표현식 (stdlib)',
      languageId: 'kingsejong_v0_3',
    },
    {
      id: 'stdlib_crypto',
      name: '암호화',
      description: '암호화 및 해싱 (stdlib)',
      languageId: 'kingsejong_v0_3',
    },
  ],
  python_3_12: [
    {
      id: 'hello_world',
      name: 'Hello World',
      description: 'Simple Hello World program',
      languageId: 'python_3_12',
    },
  ],
  go_1_22: [
    {
      id: 'hello_world',
      name: 'Hello World',
      description: 'Simple Hello World program',
      languageId: 'go_1_22',
    },
  ],
};

export function TemplateGallery({
  isOpen,
  onClose,
  selectedLanguage,
  onSelectTemplate,
}: TemplateGalleryProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const templates = TEMPLATES[selectedLanguage] || [];

  const handleSelectTemplate = async (template: TemplateInfo) => {
    setLoading(true);
    setError(null);

    try {
      const templateData = await languagesAPI.getTemplate(
        template.languageId,
        template.id
      );

      // Extract code from template
      // Template.content is the combined files, we need to get the actual content
      onSelectTemplate(templateData.content);
      onClose();
    } catch (err) {
      console.error('Failed to load template:', err);
      setError('템플릿을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-labelledby="template-gallery-title"
      aria-modal="true"
    >
      <div
        className="bg-gray-800 rounded-lg shadow-2xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 id="template-gallery-title" className="text-2xl font-bold text-white">
            템플릿 갤러리
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close template gallery"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {templates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">
                선택한 언어에 사용 가능한 템플릿이 없습니다.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  disabled={loading}
                  className="text-left p-5 bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {template.name}
                    </h3>
                    <svg
                      className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {template.description}
                  </p>
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="mt-6 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-400">템플릿 로딩 중...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700">
          <p className="text-sm text-gray-400 text-center">
            템플릿을 선택하면 현재 코드가 교체됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
