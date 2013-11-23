from django.shortcuts import render, redirect

from django.utils.html import escape
import re

from blog.models import Sentence, Post

from blog import forms

def parseSentence(toParse):
    sentences = []

    punctuations = "[.!?]"
    
    sentences = re.findall('(.*?' + punctuations + '\"?)', toParse)  
    
    for sentence in sentences:
        sentence = escape( sentence ).strip()
    
    return sentences
    

def index(request):
    sentences = parseSentence(request.POST.get('textInput',''))
    
    if request.user.is_authenticated():    
        new_post = Post(author = request.user)
        new_post.parent_order = "0"
        new_post.save()
        
        for index, sentence in enumerate(sentences):
            temp = Sentence(post = new_post, text = sentence, order = str(index), is_overwrite = False)
            temp.save()
        
    return render(request, 'blog/test.html', {'sentences': sentences})
