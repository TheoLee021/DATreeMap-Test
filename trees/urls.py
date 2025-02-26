from django.urls import path
from . import views

app_name = 'trees'

urlpatterns = [
    path('', views.tree_map, name='map'),
    path('api/trees/', views.tree_data, name='tree_data'),
    path('api/trees/<int:tag_number>/', views.tree_detail, name='tree_detail'),
] 