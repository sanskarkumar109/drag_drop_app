from django.urls import path 
from . import views

urlpatterns = [
    path('shapes/get_script/',views.get_shape_script,name = 'get_shape_script'),
    path('diagrams/',views.diagram_list_create,name = 'diagram_list_create'),
    path('diagrams/create/',views.diagram_list_create, name = 'diagram_create'),
    path('diagrams/<int:pk>/',views.diagram_detail,name = 'diagram_detail'),
]