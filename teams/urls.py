from django.conf.urls import patterns, url

from teams import views


urlpatterns = patterns(
    '',
    url(r'^$', views.List.as_view(), name='team-list'),
    url(r'^(?P<team>[\w-]+)/$', views.Info.as_view(), name='team-info'),
    url(r'^(?P<team>[\w-]+)/remove/$', views.Remove.as_view(),
        name='team-remove'),
    url(r'^add/$', views.Add.as_view(),
        name='team-add'),
    url(r'^(?P<team>[\w-]+)/user/add/$', views.AddUser.as_view(),
        name='team-user-add'),
)