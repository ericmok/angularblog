from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from django.db import IntegrityError
from blog import forms


def handle_post(request):
    
    register_form = forms.RegisterForm(request.POST)

    if register_form.is_valid():
        username = register_form.cleaned_data['username']
        password = register_form.cleaned_data['password']
        password_confirm = register_form.cleaned_data['password_confirm']

        try:
            user = User.objects.create_user(username = username, password = password)
            user.save()
            return redirect('/blog/', {})
        except IntegrityError as e:
            return render(request, 'blog/register.html', {'register_form': register_form, 'error': True, 'request': request})

    else:
        return render(request, 'blog/register.html', {'register_form': register_form, 'error': False, 'request': request})


def index(request):

    if request.method == 'POST':
        return handle_post(request)
    
    register_form = forms.RegisterForm()
    return render(request, 'blog/register.html', {'register_form': register_form, 'error': False, 'request': request})