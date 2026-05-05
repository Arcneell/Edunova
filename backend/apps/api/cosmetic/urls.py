from django.urls import path

from .views import CosmeticListView, CosmeticPurchaseView

urlpatterns = [
    path('', CosmeticListView.as_view(), name='cosmetic-list'),
    path('purchase/', CosmeticPurchaseView.as_view(), name='cosmetic-purchase'),
]
