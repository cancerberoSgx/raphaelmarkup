$(document).ready(function(){
    

module("parseRaphaelMarkup");

test("parseRaphaelMarkup", function() {
	
	ok($("#raphaelDocument1").find("paper").size()==1, "parseRaphaelMarkup1");
	
});


	
module("parseCSS");

test("parseCSS", function() {
	var css1 = "p {border: 1px solid black; color: rgb(123,234,111)}";
	var parsed1 = rm.parseCSS(css1);
	
	ok(parsed1["p"] && parsed1["p"]["border"] && 
		parsed1["p"]["border"] == "1px solid black", "parseCSSattrerr1")
	
	ok(parsed1["p"] && parsed1["p"]["color"] && 
		parsed1["p"]["color"] == "rgb(123,234,111)", "parseCSSattrerr2")
		
	ok(!parsed1["p1"], "parseCSSattrerr3");
	
});



module("XML DOM mutation events");

test("mutation events", function() {
	var mutation = {
		"DOMAttrModified": 0,
		"DOMAttrModifiedTarget": null
	};
	
	$(document.body).append(
			'<div class="c1" id="div1"><span id="span1">hello</span></div>'+
			'<div id="div2></div>"');
	
	$("#div1").bind("DOMAttrModified", function(e){
		mutation["DOMAttrModified"]++;
		mutation["DOMAttrModifiedTarget"] = e.target;
	});
		
	$("#div1").attr("class", "c1 c2");
	
	ok(mutation["DOMAttrModified"]==1, "DOMAttrModified1");
	ok(mutation["DOMAttrModifiedTarget"] && 
		$(mutation["DOMAttrModifiedTarget"]).attr("id")=="div1", "DOMAttrModified2");
	
	
	
});

});