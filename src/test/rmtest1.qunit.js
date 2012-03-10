$(document).ready(function(){
    
module("parseRaphaelMarkup");

test("parseRaphaelMarkup", function() {
	
	ok($("#raphaelDocument1").find("paper").size()==1, "parseRaphaelMarkup1");
	
});

module("parse xml and createElement");

test("parse xml and createElement", function() {

	var xmlStr = '<p><o><b></b></o><b></b></p>'
	var dom = rm.parseXML(xmlStr);
	rm.createElement(dom, "p", {"id": "p2"});
	//alert(dom.find("p").size());
	ok(dom.find("p").size()==2, "parseXML & createElement 1");
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


module("xmlwrite");

test("xmlwrite", function() {
	
	//create a raphael paper and fill with some shapes, with raphaël javascript API
	var paper = Raphael(12,23,500,500);
	paper.rect(12,23,44,55).attr("fill", "red");
	paper.circle(44,55,32).attr("stroke-width", "6");;
	paper.set([paper.rect(112,123,44,55), paper.ellipse(144,255,32, 66)]);
	
	var xml = rm.xmlWritePaper(paper, 12,23,500,500);
	ok(xml.find("circle").attr("cx")==44, "xml write 1");
	
	/* now delete the raphael paper and try to render the xml document
	the drawing should be the same. */
	paper.remove();
	
	rm.renderDom(xml);
	
	//now retrieve a shape for previous rendering from id, using the ids  from xml dom, and fill with color:
	var ellipse1 = rm.getShapeById(xml.find("ellipse").attr("id"));
	ellipse1.attr("fill", "yellow");
	
	
	
////	alert(xml.find("raphael").children().size());
//	
//	alert(rm._dumpDOM(xml));
////	alert(xml.find("circle").size());
//	//xml is a jquery dom <raphael object that we can access
});



//module("XML DOM mutation events");
//
//test("mutation events", function() {
//	var mutation = {
//		"DOMAttrModified": 0,
//		"DOMAttrModifiedTarget": null
//	};
//	
//	$(document.body).append(
//			'<div class="c1" id="div1"><span id="span1">hello</span></div>'+
//			'<div id="div2></div>"');
//	
//	$("#div1").bind("DOMAttrModified", function(e){
//		mutation["DOMAttrModified"]++;
//		mutation["DOMAttrModifiedTarget"] = e.target;
//	});
//		
//	$("#div1").attr("class", "c1 c2");
//	
//	ok(mutation["DOMAttrModified"]==1, "DOMAttrModified1");
//	ok(mutation["DOMAttrModifiedTarget"] && 
//		$(mutation["DOMAttrModifiedTarget"]).attr("id")=="div1", "DOMAttrModified2");
//	
//	
//	
//});

});