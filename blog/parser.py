import nltk
import nltk.data

def parse_content(content):
	"""
	Convert content (ie. essay) into an array of sentences
	"""
	detector = nltk.data.load('tokenizers/punkt/english.pickle')
	detector.tokenize(content.strip())
	return detector.tokenize(content)