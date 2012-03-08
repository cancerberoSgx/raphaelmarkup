/* raphael markup javascript - raphael xml and css renderer and utilities 
 * dependencies: 
 * raphael.js
 * jquery.js :; for easy xml parsing 
 * @author: sgurin
.*/





//window.onerror=function(msg, url, linenumber){
// alert('Error message: '+msg+'\nURL: '+url+'\nLine Number: '+linenumber)
// return true
//}



var rm = {
		
		
		
		
		
		/* * * * raphael markup renderer * * * */	

///**
// * main render entry point. Will render the raphael markup and css code in the given html document object.
// * Usage: 
// * <pre>
// * var rap1 = rm.render(document, "<raphael....", ".apple-class1 {stroke: ...}")
// * rap1.find("#paper2 @apple1234").addClass("apple-class1"); // access to the document dynamically and css styles will be applied.
// * @param targetDoc - html document in which to render the raphael markup
// * @param xmlCode - the raphael markup, must be valid raphel.xsd document
// * @param cssCode - css code for raphael markup
// * @return the jquery document object  
// */
//renderRMSource: function (targetHtmlDoc, xmlCode, cssCode) {	
//	var css = rm.parseCSS(cssCode), 
//		xml = $.parseXML(xmlCode);
//	
//	renderRM(targetDoc, xml, css);
//},

/**
 * render all <raphael elements in current document
 */
render: function() {
	$("raphael").each(function(index){
		var rdoc= rm.buildRDocFromDOM($(this));
		rm._render(document, rdoc);
	});	
},
/**
 * @param a jquery object with a <raphael element
 * @return a ready to use jquery object with the passed <raphael dom inside
 */
buildRDocFromDOM : function(dom) {
	var html = dom.html();
	if(html.indexOf("<?")==0) {
		/* IE returns the <?xml ... header, and that breaks the xml parser 
		 * so we deleteit */
		html=html.toLowerCase();
		/* find where to cut from */
		var ip = html.indexOf("<paper"), is = html.indexOf("<style"), i=0;
		if(is>0 && ip>0)
			i=Math.min(is, ip);
		else if(is<1) 
			i=ip;
		else if(ip<1) 
			i=is;
		if(i<=0) { //empty or invalid paper
			//TODO
			i=0;
		}
		html = html.substring(i, html.length);
		
		/* fix internet  explorer that removes quotes from class and id 
		 * attributes when calling innerHTML... this invalidates the xml 
		 * and makes the IE XML parser fails */
		html=html.replace(/class\=([0-9a-z\-]+)/g, "class=\"$1\"");
		html=html.replace(/id\=([0-9a-z\-]+)/g, "id=\"$1\"");		
	}
	var rdoc = null;
	try { 
		rdoc= $($.parseXML("<raphael>"+html+"</raphael>")); 
	} catch(ex) {
		alert("exception parsing document: "+ex);
	}
	return rdoc;
},

/**
 * @param targetHtmlDoc
 * @param rdoc a parsed jquery object with the raphael markup document or a string for selecting the raphael element. Must be valid raphael.xsd
 * @return a jquery object with the XML DOM of raphael document
 */
_render : function(targetHtmlDoc, rdoc)	{
	
	/* first of all try to hide the <raphael> element from html document */
	rdoc.hide();
	
	/* first parse each <style> element against document. 
	 * the DOM will be affected before rendering.*/
	rdoc.find("style").each(function(i){
		rm.applyCSS(rdoc, $(this).text());
	});
	
	/* css note: we will evaluate CSS selectors using jquery, 
	 * so all supported jquery selectors will be available. */
	
	/* TODO: use xml mutation events for being notified with class 
	 * or ids change?? http://en.wikipedia.org/wiki/DOM_Events. won't be supported on old IE*/
		
	rdoc.find("paper").each(function(i){
		var paper = null;
		if($(this).attr("containerId")) {
			paper = Raphael($(this).attr("containerId"), 
				parseInt($(this).attr("width")), parseInt($(this).attr("height")));
		}
		else {
			paper = Raphael(parseInt($(this).attr("x")), parseInt($(this).attr("y")), 
				parseInt($(this).attr("width")), parseInt($(this).attr("height")));
		}
		rm._register("paper", paper, $(this));
		rm._renderPaper($(this), paper);
	});
	
	
	
	return rdoc;
},
/**
 * this apply a css source string in a DOM.
 */
applyCSS: function(doc, cssStr) {
	var css = rm.parseCSS(cssStr);
	for ( var i = 0; i < css.__order.length; i++) {
		var sel = css.__order[i];
//		alert(sel+" - "+doc.find(sel).size());
//		debugger;
		var el = doc.find(sel);
//		el.parents("set").each(function(index){
//			
//		});
		el.attr(css[sel]);
	}
//	for(var sel in css) {}
},
/**
 * @param el jquery object with paper xml dom
 * @param paper - the raphael paper object
 */
_renderPaper: function(el, paper) {
//	alert("children: "+el.children().size())
	el.children().each(function(index){
		rm._renderEl($(this), paper);
	});
},
/**
 * @param el the jquery object for xml dom el def
 * @param paper the raphael paper 
 */
_renderEl: function(el, paper) {
	
	var shape = null;
	if(el.get(0).tagName.toLowerCase()=="image")
		shape=this._renderImage(el, paper);
	else if(el.get(0).tagName.toLowerCase()=="rect")
		shape=this._renderRect(el, paper);
	else if(el.get(0).tagName.toLowerCase()=="path")
		shape=this._renderPath(el, paper);
	else if(el.get(0).tagName.toLowerCase()=="set")
		shape=this._renderSet(el, paper);
	else if(el.get(0).tagName.toLowerCase()=="circle")
		shape=this._renderCircle(el, paper);	
	else if(el.get(0).tagName.toLowerCase()=="ellipse")
		shape=this._renderEllipse(el, paper);	
	return shape;
},
/**
 * extracts xml raphael attributes to a js object
 */
getRaphaelAttrs: function(el) {
	var o = {};
	for(var i in this._raphaelAttrs) {
		var a = el.attr(i);
		if(a!=null && a!="")
			o[i]=a;
	}	
	return o;
},
/**do the renderization of attributes defined in xml dom object to a raphael shape
 * @param el - the jquery xml dom of an element
 * @param shape - he raphael shape that presents the element
 * @param paper - the raphael paper.
 */
_renderAttrs : function(el, shape, paper) {	
	var attrs = rm.getRaphaelAttrs(el);
//	alert("_renderAttrs: "+el.attr("id")+" - "+rm._dump(attrs));
//	debugger;
	shape.attr(attrs);
},
_renderImage: function(el, paper) {
	var shape = paper.image(el.attr("src"), el.attr("x"), 
		el.attr("y"), el.attr("width"), el.attr("height"));
	this._renderAttrs(el, shape, paper);
	return shape;
},
_renderEllipse: function(el, paper) {
	var shape =  paper.ellipse(el.attr("x"), el.attr("y"), 
		el.attr("rx"), el.attr("ry"));
	this._renderAttrs(el, shape, paper);
	return shape;
},
_renderRect: function(el, paper) {
	var shape =  paper.rect(el.attr("x"), el.attr("y"), 
		el.attr("width"), el.attr("height"), el.attr("radius"));
	this._renderAttrs(el, shape, paper);
	return shape;
},
_renderPath: function(el, paper) {
	var shape = paper.path(el.attr("path"));
	this._renderAttrs(el, shape, paper);
	return shape;
},
_renderSet: function(el, paper) {
	/* note that we first render set attrs, and then render set's children attrs, so one can do in CSS: 
	.set1 {
		fill: yellow;
	}
	.set1 circle {
		fill: black;
	}
	 */
	var set = paper.set();
	
	//one iteration for building the set.
	el.children().each(function(index){		
		var childShape = rm._renderEl($(this), paper);
		set.push(childShape);
	});
	//render the set attributes
	rm._renderAttrs(el, set, paper);
	//other iteration for setting attributes of children (after set attrs )
	el.children().each(function(index){	
		var shape = set[index];
//		//first stylyze according to parent set
//		rm._renderAttrs(el, shape, paper);
		//and then apply specific style
		rm._renderAttrs($(this), shape, paper);
	});	
	return set;
},
_renderCircle: function(el, paper) {
	var shape =  paper.circle(el.attr("cx"), el.attr("cy"), 
		el.attr("radius"));
	this._renderAttrs(el, shape, paper);
	return shape;
},	





	/* * * * xml builder: build xml documents from raphael paper instances * * * */

/**
 * @param papers an array of raphael paper objects to be writen in the 
 * raphael xml document.
 * @param doc - optional jquery dom documento to write into
 * @returns a jquery object loaded with a valid XML raphael.xsd document.
 * the native XMLDocument can be obtained with .get(0). jquery API is recommended to read/write the document.   
 */
xmlWritePaper: function(paper, x, y, width, height, doc) {
	if(!doc)
		doc=$($.parseXML("<raphael></raphael>"));
	var id = rm._xmlGetId(paper);
	doc.append("<paper id=\""+id+"\" ></paper>");
	var paperDom = doc.find("#"+id);
	paper.forEach(function (el) {
		xmlWriteShape(el, paperDom)
	});
},
xmlWriteShape: function(el, parentDom) {
	var shapeDom = null;
	
	if(el.type=="rect")
		shapeDom=rm._xmlWriteRect(el, parentDom);
	else if(el.type=="circle")
		shapeDom=rm._xmlWriteCircle(el, parentDom);
	else if(el.type=="path")
		shapeDom=rm._xmlWritePath(el, parentDom);
	else if(el.type=="set")
		shapeDom=rm._xmlWriteSet(el, parentDom);
	else if(el.type=="ellipse")
		shapeDom=rm._xmlWriteEllipse(el, parentDom);
	
	if(shapeDom!=null)
		rm._xmlWriteAttrs(el, shapeDom);
	return shapeDom;
},
_xmlWriteRect: function(el, dom) {
	var id = rm._xmlGetId(el);
	dom.append("<rect id=\""+id+"\"></rect>");
	var rectDom = $("#"+id);	
	return rectDom;
},
_xmlWriteAttrs: function(el, dom) {
	var attr = el.attr();
	for(var i in attr) {
		dom.attr(i, attr[i]);
	}
	return dom;
},
_xmlWriteCircle: function(el, dom) {
	var id = rm._xmlGetId(el);
	dom.append("<circle id=\""+id+"\"></rect>");
	var circleDom = $("#"+id);
	return circleDom;
},
_xmlWritePath: function(el, dom) {
	var id = rm._xmlGetId(el);
	dom.append("<path id=\""+id+"\"></rect>");
	var pDom = $("#"+id);
	return pDom;
},
_xmlWriteSet: function(el, dom) {
	var id = rm._xmlGetId(el);
	dom.append("<set id=\""+id+"\"></set>");
	var sDom = $("#"+id);
	for ( var i = 0; i < el.length; i++) {
		var childDom = rm.xmlWriteShape(el[i], sDom);
	}
	return sDom;	
},
_xmlWriteEllipse: function(el, dom) {
	
},
_xmlId: 0,
_xmlGetId: function(el) {
	rm._xmlId++;
	return el.type?el.type:"paper"+rm._xmlId;
},
//xmlWrite: function(papers, doc) {
//if(!doc)
//	doc=$($.parseXML("<raphael></raphael>"));
//for(var i = 0; i<papers.length; i++) {
//	rm.xmlWritePaper(papers[i], doc);
//}
//return doc;
//},






	/* * * * object registration and raphael constants * * * */

_els : {},
/**@param type string - the type of element to register "paper", "set", image", etc
 * @param el - raphael shape or paper object
 * @param domEl the xml dom of the element 
 */
_register: function(type, el, domEl) {
	if(!rm._els[type])
		rm._els[type]={};
	rm._els[type][rm._getId(type, el, domEl)] = el;
},
_ids : {},		
_getId: function(type, el, domEl) {
	if(domEl.attr("id"))
		return domEl.attr("id");
	else {
		rm._ids++;
		var id = type+"_"+rm._ids;
		domEl.attr("id", id);
	}
},
_dump: function(o) {
	var s = "{";
	for(var i in o) {
		s+=i+", ";
	}
	return s;
},
_raphaelAttrs: {
    "arrow-end": "none",
    "arrow-start": "none",
    blur: 0,
    "clip-rect": "0 0 1e9 1e9",
    cursor: "default",
    cx: 0,
    cy: 0,
    fill: "#fff",
    "fill-opacity": 1,
    font: '10px "Arial"',
    "font-family": '"Arial"',
    "font-size": "10",
    "font-style": "normal",
    "font-weight": 400,
    gradient: 0,
    height: 0,
    href: "http://raphaeljs.com/",
    "letter-spacing": 0,
    opacity: 1,
    path: "M0,0",
    r: 0,
    rx: 0,
    ry: 0,
    src: "",
    stroke: "#000",
    "stroke-dasharray": "",
    "stroke-linecap": "butt",
    "stroke-linejoin": "butt",
    "stroke-miterlimit": 0,
    "stroke-opacity": 1,
    "stroke-width": 1,
    target: "_blank",
    "text-anchor": "middle",
    title: "Raphael",
    transform: "",
    width: 0,
    x: 0,
    y: 0
},




/* * * * CSS PARSER * * * */
		
parseCSS: function(css) {
    var rules = {};
    rules.__order=[];
    css = this._removeComments(css);
    var blocks = css.split('}');
    blocks.pop();
    var len = blocks.length;
    for (var i = 0; i < len; i++) {
        var pair = blocks[i].split('{');
        var sel = $.trim(pair[0]);
    	rules.__order.push(sel);
        rules[sel] = this._parseCSSBlock(pair[1]);
    }
    return rules;
},
_parseCSSBlock: function(css) { 
    var rule = {};
    var declarations = css.split(';');
    var len = declarations.length;
    for (var i = 0; i < len; i++) {
        var loc = declarations[i].indexOf(':');
        if(loc==-1)
        	continue;
        var property = $.trim(declarations[i].substring(0, loc));
        var value = $.trim(declarations[i].substring(loc + 1));

        if (property != "" && value != "") {
            rule[property] = value;
        }
    }
    return rule;
},
_removeComments: function(css) {
    return css.replace(/\/\*(\r|\n|.)*\*\//g,"");
}


}
