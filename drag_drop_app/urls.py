"""
URL configuration for drag_drop_app project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
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
from django.urls import path,include
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse


# def check_auth_status(request):
#     if request.user.is_authenticated:
#         return JsonResponse({'is_authenticated' : True, 'username' : request.user.username})
#     else:
#         return JsonResponse({'is_authenticated' : False})
    
# main_app_view = login_required(TemplateView.as_view(template_name = 'index.html'))
main_app_view = TemplateView.as_view(template_name = 'index.html')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/',include('core.urls')),
    # path('accounts/',include('django.contrib.auth.urls')),
    # path('api/check-auth/',check_auth_status,name = 'check_auth_status'),
    path('',main_app_view,name = 'main_app_home'),
    path('app/',main_app_view,name = 'main_app'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL,document_root = settings.STATIC_ROOT)
    urlpatterns += static(settings.STATIC_URL,document_root = settings.STATICFILES_DIRS[0])
