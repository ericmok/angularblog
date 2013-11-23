describe("Parse sentence", function() {
	it("test", function() {
		var i = 0;
		expect(i).toBe(0);
	});

	it("Should create array of sentences.", function() {
		var toParse = 'This is a test. "What about this?" Thanks.';

		function parseSentences(paragraph) {
			
			var toParse = paragraph;
			
			var sentences = [];
			var numberSentences = 0;
			var limit = 10;
			
			var regExp = /[.?!]/g;
			var anyCharRegExp = /./g;
			var quoteRegExp = /\"/g;
			
			var index = toParse.search(regExp);
			
			while ((index > 0) && toParse && limit) {
				console.log("index to period: " + index);
				
				var sentence = toParse.substring(0, index + 1).trim()
				
				console.log("[" + sentence + "]");
				
				sentences[numberSentences] = sentence;
				toParse = toParse.substring(index + 1);
				
				var q = toParse.search(quoteRegExp);
				console.log("Quote index: " + q);
				
				if (q == 0) {
					sentences[numberSentences] = sentences[numberSentences] + "\""; 
					console.log("EDIT: [" + sentences[numberSentences] + "]");
					toParse = toParse.substring(1);
				}
			
				index = toParse.search(regExp);
				
				numberSentences++;
				limit--;
			}

			return sentences;
		}
		
		var res = parseSentences(toParse);
		
		console.log("=============Final Parse================");
		for (var i = 0; i < res.length; i++) {
			console.log("[" + res[i] + "]");
		}
		
		expect(res.length).toBe(3);
		expect(res[1].slice(-1)).toBe("\"");
		
	});
	

	it("Should create array of sentences 2.", function() {
		console.log("====TEST 2==========");
		var toParse = 'This is a test. "What about this?" Thanks.';

		function parseSentences(paragraph) {
			
			var toParse = paragraph;
			
			var sentences = [];
			var numberSentences = 0;
			var limit = 20;
			
			var regExp = /(.*?[.!?]\"?)/g;
			var match = "";
			
			while ( (match = regExp.exec(toParse)) && limit ) {
				console.log("match: " + match);
				sentences[numberSentences] = match[0];
				numberSentences++;
				limit--;
			}

			for (var i = 0; i < sentences.length; i++) {
				sentences[i] = sentences[i].trim();
			}
			
			return sentences;
		}
		
		var res = parseSentences(toParse);
		
		console.log("=============Final Parse================");
		for (var i = 0; i < res.length; i++) {
			console.log("[" + res[i] + "]");
		}
		
		expect(res.length).toBe(3);
		expect(res[1].slice(-1)).toBe("\"");
		
	});
});

