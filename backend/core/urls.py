"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse, JsonResponse

def root_status_view(request):
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>DebateIQ Backend API - Online</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F8FAFC; color: #0F172A; margin: 0; padding: 40px 20px; display: flex; justify-content: center; }
            .card { background: white; border: 1px solid #E2E8F0; border-radius: 16px; max-width: 650px; width: 100%; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .badge { background: #DCFCE7; color: #166534; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; display: inline-block; margin-bottom: 12px; }
            h1 { font-size: 24px; color: #172554; margin: 0 0 8px 0; }
            p { font-size: 14px; color: #64748B; margin: 0 0 20px 0; line-height: 1.5; }
            .btn { display: inline-block; background: #172554; color: white; text-decoration: none; padding: 10px 20px; border-radius: 10px; font-weight: 600; font-size: 14px; margin-bottom: 24px; }
            .btn:hover { background: #1E3A8A; }
            h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin: 20px 0 10px 0; }
            ul { list-style: none; padding: 0; margin: 0; }
            li { padding: 10px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; margin-bottom: 8px; font-size: 13px; display: flex; justify-content: space-between; align-items: center; }
            code { font-family: monospace; color: #1E3A8A; font-weight: 600; }
            a.api-link { color: #2563EB; text-decoration: none; font-size: 12px; font-weight: 600; }
            a.api-link:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class="card">
            <span class="badge">● Backend Online & Active</span>
            <h1>DebateIQ API Server</h1>
            <p>The Django REST Framework backend server is running successfully on port 8000.</p>
            
            <a href="http://localhost:5173" class="btn">→ Open Frontend Web Application (localhost:5173)</a>

            <h2>Available API v1 Endpoints</h2>
            <ul>
                <li><span>Authentication & Users</span><a class="api-link" href="/api/v1/auth/profile/">/api/v1/auth/</a></li>
                <li><span>Debate Topics & Sessions</span><a class="api-link" href="/api/v1/debates/topics/">/api/v1/debates/</a></li>
                <li><span>Argument & Fallacy Scanner</span><a class="api-link" href="/api/v1/arguments/history/">/api/v1/arguments/</a></li>
                <li><span>Speech Practice & Cadence</span><a class="api-link" href="/api/v1/speech/speech-sessions/">/api/v1/speech/</a></li>
                <li><span>Presentation Deck Analyzer</span><a class="api-link" href="/api/v1/presentations/presentation-sessions/">/api/v1/presentations/</a></li>
                <li><span>Performance Analytics</span><a class="api-link" href="/api/v1/analytics/overview/">/api/v1/analytics/</a></li>
                <li><span>Personalized Drills</span><a class="api-link" href="/api/v1/coaching/drills/">/api/v1/coaching/</a></li>
                <li><span>Django Administration</span><a class="api-link" href="/admin/">/admin/</a></li>
            </ul>
        </div>
    </body>
    </html>
    """
    return HttpResponse(html_content)

def api_index_view(request):
    return JsonResponse({
        "status": "online",
        "service": "DebateIQ - Agentic AI Debate Coach & Presentation Analysis API",
        "version": "v1",
        "frontend_url": "http://localhost:5173",
        "endpoints": {
            "analytics_overview": "/api/v1/analytics/overview/",
            "auth": "/api/v1/auth/",
            "debates": "/api/v1/debates/",
            "arguments": "/api/v1/arguments/",
            "speech": "/api/v1/speech/",
            "presentations": "/api/v1/presentations/",
            "coaching": "/api/v1/coaching/",
            "admin": "/admin/"
        }
    })

urlpatterns = [
    path('', root_status_view, name='root-status'),
    path('api/', api_index_view, name='api-index'),
    path('api/v1/', api_index_view, name='api-v1-index'),
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.users.urls')),
    path('api/v1/debates/', include('apps.debates.urls')),
    path('api/v1/arguments/', include('apps.arguments.urls')),
    path('api/v1/speech/', include('apps.speech_pres.urls')),
    path('api/v1/presentations/', include('apps.speech_pres.urls')),
    path('api/v1/analytics/', include('apps.analytics.urls')),
    path('api/v1/coaching/', include('apps.coaching.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


