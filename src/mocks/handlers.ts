import { http, HttpResponse } from 'msw'

const API_URL = 'http://localhost:8080/api/v1'

export const handlers = [
  // Languages API
  http.get(`${API_URL}/languages`, () => {
    return HttpResponse.json({
      languages: [
        {
          id: 'python_3_12',
          name: 'Python 3.12',
          version: '3.12.0',
          extensions: ['.py'],
          mime_types: ['text/x-python'],
        },
        {
          id: 'go_1_22',
          name: 'Go 1.22',
          version: '1.22.0',
          extensions: ['.go'],
          mime_types: ['text/x-go'],
        },
      ],
    })
  }),

  // Execute API
  http.post(`${API_URL}/execute`, async ({ request }) => {
    const body = await request.json() as any

    return HttpResponse.json({
      success: true,
      events: [
        {
          kind: 'KIND_STDOUT',
          message: 'Hello, World!',
          timestamp: new Date().toISOString(),
        },
      ],
      metrics: {
        compile_time_ms: 100,
        run_time_ms: 50,
        memory_bytes: 1024 * 1024,
      },
    })
  }),

  // Share API
  http.post(`${API_URL}/share`, async ({ request }) => {
    const body = await request.json() as any

    return HttpResponse.json({
      id: 'test-share-id',
      language: body.language,
      files: body.files,
      title: body.title || 'Untitled',
      description: body.description || '',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
  }),

  http.get(`${API_URL}/share/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      language: 'python_3_12',
      files: {
        'main.py': 'print("Hello from shared code")',
      },
      title: 'Shared Code',
      description: 'Test shared code',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
  }),

  // Settings API
  http.get(`${API_URL}/settings`, () => {
    return HttpResponse.json({
      editor: {
        font_size: 14,
        font_family: 'Fira Code, Monaco, monospace',
        tab_size: 2,
        minimap: true,
        line_numbers: true,
        word_wrap: false,
      },
      theme: {
        color_scheme: 'vs-dark',
        ui_theme: 'dark',
      },
    })
  }),

  http.put(`${API_URL}/settings`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json(body)
  }),

  // Auth API
  http.post(`${API_URL}/auth/register`, async ({ request }) => {
    const body = await request.json() as any

    return HttpResponse.json({
      user: {
        id: 'test-user-id',
        email: body.email,
        name: body.name,
        created_at: new Date().toISOString(),
      },
      token: 'test-jwt-token',
    })
  }),

  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = await request.json() as any

    return HttpResponse.json({
      user: {
        id: 'test-user-id',
        email: body.email,
        name: 'Test User',
        created_at: new Date().toISOString(),
      },
      token: 'test-jwt-token',
    })
  }),

  http.get(`${API_URL}/auth/me`, () => {
    return HttpResponse.json({
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      created_at: new Date().toISOString(),
    })
  }),
]
