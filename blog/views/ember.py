from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError, transaction
from django.http import HttpResponse
from blog import forms
import json

def index(request):
	return render(request, 'blog/ember-index2.html', {'request': request})
	#return render(request, 'blog/d3-index.html', {'request': request})