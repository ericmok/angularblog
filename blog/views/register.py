from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError, transaction
from django.http import HttpResponse
from blog import forms
import json


@transaction.atomic
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


def content_negotiated_response(request, template_name, json_data, status = 200):
    if request.META.get('CONTENT_TYPE', None) == 'application/json':
        return HttpResponse(json.dumps(json_data), content_type="application/json", status = status)
    return render(request, template_name)

def content_negotiated_redirect(request, url, json_data, status = 303):
    if request.META.get('CONTENT_TYPE', None) == 'application/json':
        response = HttpResponse(json.dumps(json_data), content_type="application/json", status = status)
        response['Location'] = "http://localhost:8000/blog/api/"
        return response
    return redirect(url)    

def sign_in(request):

    if request.method == "POST":
        username = request.POST.get('username', None)
        password = request.POST.get('password', None)

        if request.META.get('CONTENT_TYPE', None) == 'application/json':
            json_request = json.loads(request.body)
            username = json_request['username']
            password = json_request['password']

        user = authenticate(username = username, password = password)
        if user is not None:
            if user.is_active:
                login(request, user)
                print("\03394[mLOGGING IN")
                return content_negotiated_redirect(request, "/blog", {"status": "okay"}, 303)
        else: 
            return content_negotiated_response(request, "blog/angular/sign-in.html", {"error": "Authentication failed."}, 400)
    else: 
        return content_negotiated_response(request, "blog/angular/sign-in.html", {"template": {"data": [{"username": "Your username"}, {"password": "Your password"}]}}, 200)

def sign_out(request):
    logout(request)
    return content_negotiated_redirect(request, "/blog/", {"status": "You are logged out"}, 200)
