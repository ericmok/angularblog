from django.shortcuts import render, redirect

def index(request):
    return render(request, 'blog/angular/index.html')

def latest(request):
    return render(request, 'blog/angular/latest.html')