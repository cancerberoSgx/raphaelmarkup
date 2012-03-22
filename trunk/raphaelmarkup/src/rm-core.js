/* * * * 
 * 
 * raphaelmarkup javascript
 
 * dependencies: raphael.js and jquery.js
 * Copyright (c) 2012 Sebastián Gurin (http://code.google.com/p/raphaelmarkup/)          │ \\
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
 * 
 * @author: Sebastián Gurin
 * 
 * * * * */


var rm = {
		
_doInclude: function(rdoc, onFinnish) {
	var includes = rdoc.find("include[src]");
	rm._includeCount = includes.size();
	if(rm._includeCount==0)
		onFinnish(rdoc);
	includes.each(function(){
		$.ajax({
			"url": $(this).attr("src"),
			"dataType": "xml",			
			"context": {
				"rdoc": rdoc, 
				"rmdom": $(this),
				"url": $(this).attr("src"), 
				"onFinnish": onFinnish
			},			
			"success": function(data) {
				var domToInclude = $(data)
				rm._includeCount--;				
				if(rm._includeCount>=0) {
					$(domToInclude.prop("documentElement")).insertAfter(this["rmdom"]);
					this["rmdom"].remove();
				}
				if(rm._includeCount==0) {
					this["onFinnish"](this["rdoc"]);
				}
			},
			"error": function(jqXHR, errStr, err) {
				rm._includeCount=-1;
				rm._error("error including "+this["url"]+". cause: "+errStr);
			},
		});
	});
},


		/* * * * raphael markup renderer * * * */	


/**
 * render all <raphael elements in current html document
 * @return an array of <raphael doms (jquery objects)
 */
render: function() {
	var docs = [];
	$("raphael").each(function(index) {
		var rdoc = rm.buildRDocFromDOM($(this));
		docs.push(rdoc);
		rm._render(document, rdoc);
	});	
	return docs;
},
renderDom: function(rdoc) {
	rm._render(document, rdoc);
},
/**
 * get an xml document with a request (must be local server uri). renders it in
 * curent document. Use like:
<pre>rm.renderAjax("drawing1.xml", function(raphael) {
	raphael.find(".set1 circle").attr("radius", "300");
}); </pre>
 * @param successHandler a function that accept one parameter, the jquery dom object for <raphael>
 * 
 */
renderAjax: function(url, successHandler, errorHandler) {
	
	$.ajax({
		"url": url,
		"success": function(data) {
			var rdoc= $(data);
			rm._render(document, rdoc);
			successHandler(rdoc);
		},
		"error": errorHandler,
		"dataType": "xml"
	});
},
/**
 * @param a jquery object with a <raphael element
 * @return a ready to use jquery object with the passed <raphael dom inside
 */
buildRDocFromDOM : function(dom) {
	
//	/* TODO: verify that the trick for iE is neccesary. I suspect that the 
//	<xml heaer appears because we are using a DOCUMENT and we should use documentElement in that case */
//	if(rm.isDocument(dom)) {
//		dom=$(dom.prop("documentElement"))
//	}
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
		alert("Exception parsing Main document: "+ex);
	}
	return rdoc;
},

/**
 * @param targetHtmlDoc
 * @param rdoc a parsed jquery object with the raphael markup document or a string for selecting the raphael element. Must be valid raphael.xsd
 * @return a jquery object with the XML DOM of raphael document
 */
_render : function(targetHtmlDoc, rdoc)	{
	
	/* first of all do the async preproccessing for include tegas */
	rm._doInclude(rdoc, function(rdoc){
		

		/* first of all perorm preprosessing operations. 
		 * TODO: we are discarding original document... 
		 * TODO: preproccessing errors. */
		
		var origRDoc = rdoc;
		rdoc = rm.preproccess(rdoc);
		rdoc.__origRDoc = origRDoc;
		
		if(!rdoc||rdoc.size()==0) {		
			alert("error when preproccessing. ");
		}
		
		/* css note: we will evaluate CSS selectors using jquery, 
		 * so all supported jquery selectors will be available. */
		
		/* TODO: use xml mutation events for being notified with class 
		 * or ids change?? http://en.wikipedia.org/wiki/DOM_Events. won't be supported on old IE*/
			
		rdoc.find("paper").each(function(i){
			var paper = null;
			
			rm._renderPaper(rdoc, $(this), paper);
		}); 
		
		rm._postRendering(rdoc);
		
	});
	
	
	return rdoc;
},
/**
 * updates dthe UI of element dom in document rdoc.
 * it will eliminates the shape/paper dom, and it will recreate it.
 * TODO. this could be more efficient
 */
update : function(rdoc, dom) {
	if(!dom) //update all papers
		dom = rdoc.find("paper");
	dom.each(function() {
		rm.updateShape(rdoc, $(this));
	});
},
/** updates a single shape and its childs */
updateShape : function(rdoc, dom) {
	var id = dom.attr("id"), 
		shape = rm.getShapeById(id), 
		type = null;
	
	if(!shape) { /* the user send a new shape to update, we update its parent. */
		dom = dom.parent();
		id = dom.attr("id");
		shape = rm.getShapeById(id);
		type = shape.type;
	}
	else
		type = shape.type;
	
	if(!shape || !shape.type)
		return;
	
	rm._unregister(rdoc, dom, shape);
	shape.remove();//removes paper, set or shapes from HTML DOM
	
	rm._log("updateShape: type: "+type+" - id: "+dom.attr("id"));
	
	if(type=="paper") {		
		rm._renderPaper(rdoc, dom);
	}
	else { //it is a shape or set
		var paperId = dom.parent("paper").attr("id");
		var paper = rm.getShapeById(paperId);
		rm._renderEl(rdoc, dom, paper);
	}
},
/**
 * @param el jquery object with paper xml dom
 * @param paper - the raphael paper object
 */
_renderPaper: function(rdoc, dom) {
	var paper = null;
	if(dom.attr("containerId")) {
		paper = Raphael(dom.attr("containerId"), 
			parseInt(dom.attr("width")), parseInt(dom.attr("height")));
	}
	else {
		paper = Raphael(parseInt(dom.attr("x")), parseInt(dom.attr("y")), 
			parseInt(dom.attr("width")), parseInt(dom.attr("height")));
	}
	
	dom.children().each(function(index){
		rm._renderEl(rdoc, $(this), paper);
	});
	paper.type="paper";
	rm._register(rdoc, "paper", paper, dom);
	return paper;
},
/**
 * @param el the jquery object for xml dom el def
 * @param paper the raphael paper 
 */
_renderEl: function(rdoc, dom, paper) {
	
	var shape = null, tag = rm._getTagName(dom);
	if(tag=="imag") 
		shape=this._renderImage(dom, paper);
	else if(tag=="text") 
		shape=this._renderText(dom, paper);
	else if(tag=="print") 
		shape=this._renderPrint(dom, paper);
	else if(tag=="rect")
		shape=this._renderRect(dom, paper);
	else if(tag=="path")
		shape=this._renderPath(dom, paper);
	else if(tag=="set")
		shape=this._renderSet(rdoc, dom, paper);
	else if(tag=="circle")
		shape=this._renderCircle(dom, paper);	
	else if(tag=="ellipse")
		shape=this._renderEllipse(dom, paper);
	
	if(shape!=null) {
		rm._register(rdoc, shape.type, shape, dom);
	}
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
 * @param paper - optional the raphael paper.
 */
_renderAttrs : function(dom, shape, paper) {
	if(shape) {
		if(!paper)
			paper = shape.paper;
		var attrs = rm.getRaphaelAttrs(dom);
		shape.attr(attrs);
	}
},
_renderImage: function(dom, paper) {
	var shape = paper.image(dom.attr("src"), dom.attr("x"), 
		dom.attr("y"), dom.attr("width"), dom.attr("height"));
	this._renderAttrs(dom, shape, paper);
	return shape;
},
_renderPrint: function(dom, paper) {
	var text = dom.attr("text") ? dom.attr("text") : rm._getInmediateText(dom), 
		
	shape = paper.print(dom.attr("x"), dom.attr("y"), text,
		paper.getFont(dom.attr("font")), 
		dom.attr("size"), dom.attr("origin"), 
		dom.attr("letter-spacing"));
	
//	shape.type="print";
	
	/* mark all the letters (for differentiating them from other artificial shapes in the text like decorations */
	for ( var i = 0; i < shape.length; i++) {
		shape[i].rmtype="letter";
	}
	return shape;
},
_renderText: function(dom, paper) {
	var text = dom.attr("text") ? dom.attr("text") : rm._getInmediateText(dom), 
		shape=null;
//	if(dom.attr("font") && paper.getFont(dom.attr("font"))) {
//		shape = paper.print(dom.attr("x"), dom.attr("y"), text,
//				paper.getFont(dom.attr("font")), 
//				dom.attr("size"), dom.attr("origin"), 
//				dom.attr("letter-spacing"))
//	} 
//	else {
		shape = paper.text(dom.attr("x"), dom.attr("y"), text);
		this._renderAttrs(dom, shape, paper);		
//	}
	return shape;
},
_renderEllipse: function(dom, paper) {
	var shape =  paper.ellipse(dom.attr("x"), dom.attr("y"), 
		dom.attr("rx"), dom.attr("ry"));
	this._renderAttrs(dom, shape, paper);
	return shape;
},
_renderRect: function(dom, paper) {
	var shape =  paper.rect(dom.attr("x"), dom.attr("y"), 
		dom.attr("width"), dom.attr("height"), dom.attr("radius"));
	this._renderAttrs(dom, shape, paper);	
	return shape;
},
_renderPath: function(dom, paper) {
	var path = dom.attr("path")?dom.attr("path"):rm._getInmediateText(dom);
	var shape = paper.path(path);
	this._renderAttrs(dom, shape, paper);
	return shape;
},
_renderSet: function(rdoc, dom, paper) {
	var set = paper.set();
	
	//one iteration for building the set.
	dom.children().each(function(index){		
		var childShape = rm._renderEl(rdoc, $(this), paper);
		set.push(childShape);
	});
	//render the set attributes
	rm._renderAttrs(dom, set, paper);
	//other iteration for setting attributes of children (after set attrs )
	dom.children().each(function(index){	
		var shape = set[index];
		//and then apply specific style
		rm._renderAttrs($(this), shape, paper);
	});	
	return set;
},
_renderCircle: function(dom, paper) {
	var shape =  paper.circle(dom.attr("cx"), dom.attr("cy"), 
		dom.attr("radius"));
	this._renderAttrs(dom, shape, paper);
	return shape;
},	







/* * * * XML Tools * * * */	

/**
 * export a XML DOM jquery object to XML valid source. 
 * notice that sets won't be respected in resulting markup. 
 * We iterate using paper.forEach that do not respect sets, only concrete shapes.
 */
toXML: function(dom, level, tab) {
	if(rm.isDocument(dom)) {		
		dom=$(dom.prop("documentElement"));
	}
//	if(dom.prop("nodeType")!=1)
//		return null;
	var tname = rm._getTagName(dom);
	
	var s = "<"+tname;
	
	var attrNames = rm._getAttributeNames(dom);
	for ( var i = 0; i < attrNames.length; i++) {
		s+=" "+attrNames[i]+"=\""+	dom.attr(attrNames[i]) +"\"";
	}
	s+=">";
	s+=rm._getInmediateText(dom);
	var childs = dom.children();
	for ( var i = 0; i < childs.length; i++) {
		var childXml = rm.toXML($(childs[i]), level+1, tab);
		s+="\n"+rm._repeatStr(tab, level)+childXml;
	}
	s+="\n</"+tname+">";
	return s;
},
_getInmediateText: function(dom) {
	return dom.contents().filter(function(){ return(this.nodeType == 3); }).text();
},
_getAttributeNames: function(dom) {
	var el = dom.get(0);
	var arr = [];
	for (var i=0, attrs=el.attributes, l=attrs.length; i<l; i++){
	    arr.push(attrs.item(i).nodeName);
	}
	return arr;
},
_repeatStr: function(str, times) {
	if(str&&times) {		
		var s = "";
		for ( var i = 0; i < times; i++) {
			s+=str;
		}
		return s;
	}
	return "";
} ,
/**
 * create a new element in raphael XML dom
 * @param parent an html dom or jquery selector or object 
 * where to append the created child.
 * @return the created jquery dom element 
 */
createElement: function(parent, tagName, attrs) {
	parent=$(parent);
	var xmldoc = null;
	//if they send us a document, we append it on the documentElement	
	if(rm.isDocument(parent)) {
		parent=$(parent.prop("documentElement"));
		
	}
	xmldoc=parent.prop("ownerDocument");
	if(!xmldoc) {
		return null;
	}
	var e = $(xmldoc.createElement(tagName));
	if(attrs)
		e.attr(attrs);
	
	parent.append(e);
	
	return e;
},
_getTagName: function(dom) {
	return dom.get(0).tagName.toLowerCase()
},
isDocument: function(dom) {
	if(!dom||dom.size()==0) {
		return false;
	}
	return dom.get(0).nodeType==9;//createElement;
},
	/* * * * xml builder: build xml documents from 
	 * raphael paper instances * * * */
newRaphaelDocument: function() {
	return $($.parseXML("<raphael></raphael>"));
},
parseXML: function(xmlStr) {
	return $($.parseXML(xmlStr));
},





/* * * * * XML write * * * * 
 * write / read native raphael papers to/ from XML syntax */

/**
 * @param papers an array of raphael paper objects to be writen in the 
 * raphael xml document.
 * @param doc - optional jquery dom documento to write into
 * @returns a jquery object loaded with a valid XML raphael.xsd document.
 * the native XMLDocument can be obtained with .get(0). jquery API is recommended to read/write the document.   
 */
xmlWritePaper: function(paper, x, y, width, height, doc) {
	if(!doc)
		doc=rm.newRaphaelDocument();
		
	var id = rm._xmlGetId(paper);
	var paperDom = rm.createElement(doc, "paper", {"id": id});
	paper.forEach(function (el) {
		rm.xmlWriteShape(el, paperDom)
	});
	return doc;
},
xmlWriteShape: function(el, parentDom) {
	var shapeDom = null;
	
	rm._log("xmlWriteShape "+parentDom.size()+", type: "+el.type+
		" - in parent dom tagname: "+rm._getTagName(parentDom));
	
	if(el.type=="rect")
		shapeDom=rm._xmlWriteRect(el, parentDom);
	else if(el.type=="circle")
		shapeDom=rm._xmlWriteCircle(el, parentDom);
	else if(el.type=="path")
		shapeDom=rm._xmlWritePath(el, parentDom);
	else if(el.type=="image")
		shapeDom=rm._xmlWriteImage(el, parentDom);
	else if(el.type=="set")
		shapeDom=rm._xmlWriteSet(el, parentDom);
	else if(el.type=="ellipse")
		shapeDom=rm._xmlWriteEllipse(el, parentDom);
	else if(el.type=="text")
		shapeDom=rm._xmlWriteText(el, parentDom);
	else if(el.type=="print")
		shapeDom=rm._xmlWritePrint(el, parentDom);
	
	if(shapeDom!=null)
		rm._xmlWriteAttrs(el, shapeDom);
	return shapeDom;
},
_xmlWritePrint: function(el, dom) {
	var id = rm._xmlGetId(el);
	return rm.createElement(dom, "print", {"id": id});
},
_xmlWriteText: function(el, dom) {
	var id = rm._xmlGetId(el);
	return rm.createElement(dom, "text", {"id": id});
},
_xmlWriteRect: function(el, dom) {
	var id = rm._xmlGetId(el);
	return rm.createElement(dom, "rect", {"id": id});
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
	return rm.createElement(dom, "circle", {"id": id});
},
_xmlWriteImage: function(el, dom) {
	var id = rm._xmlGetId(el);
	return rm.createElement(dom, "imag", {"id": id});
},
_xmlWritePath: function(el, dom) {
	var id = rm._xmlGetId(el);
	return rm.createElement(dom, "path", {"id": id});
},
_xmlWriteSet: function(el, dom) {
	var id = rm._xmlGetId(el);
	var sDom = rm.createElement(dom, "set", {"id": id});
	for ( var i = 0; i < el.length; i++) {
		var childDom = rm.xmlWriteShape(el[i], sDom);
	}
	return sDom;	
},
_xmlWriteEllipse: function(el, dom) {
	var id = rm._xmlGetId(el);
	return rm.createElement(dom, "ellipse", {"id": id});
},
_xmlId: 0,
_xmlGetId: function(el) {
	rm._xmlId++;
	return (el.type?el.type:"paper")+rm._xmlId;
},






/* * * * * JSON IO* * * * 
 * utilities for reading/writing to/from JSON syntax objects proposed in 
 * http://raphaeljs.com/reference.html#Paper.add TO / FROM XML DOM 
 * (syntax proposed by raphaelmarkup, raphael.xsd) */

/**
 * @param paperDom - a jquery object pointing to a paper dom. The paper dom will be filled with deaded shapes
 * @param json js array with syntax as proposed in http://raphaeljs.com/reference.html#Paper.add 
 */
jsonRead: function(json, paperDom) {
	if(!json|| !json.length || !paperDom)
		return null;
	for ( var i = 0; i < json.length; i++) {
		var shape = json[i];
		//sets not supported
		var dom=rm.createElement(paperDom, shape.type, shape);
		paperDom.append(dom)
	}
},
jsonReadDoc: function(json, paperX, paperY, paperW, paperH) {
	var rdoc = rm.newRaphaelDocument();
	var paperDom = rm.createElement(rdoc, "paper", {
		"id": "paper1", 
		"x": paperX, 
		"y": paperY, 
		"width": paperW, 
		"height": paperH
	});
	rm.jsonRead(json, paperDom);
	return rdoc;
},






	/* * * * object registration and raphael constants * * * */

//_els : {},
_shapes: {},
_docsById: {},
/**@param type string - the type of element to register "paper", "set", image", etc
 * @param el - raphael shape or paper object
 * @param domEl the xml dom of the element 
 */
_register: function(rdoc, type, el, domEl) {
	if(!type)
		type = el.type?el.type:"paper";
	if(el && domEl) {
		var id = rm._getId(type, el, domEl);		
		rm._shapes[id]=el;
		rm._docsById[id]=rdoc;
		rm._log("register "+el.type+": "+id);
		domEl.attr("id", id);
	}
},
_unregister: function(rdoc, dom, shape) {
	var id = dom.attr("id");
	if(rm._shapes[id])
		delete rm._shapes[id];
	if(rm._docsById[id])
		delete rm._docsById[id]
	rm._log("unregistered "+shape.type+": "+id);
},
getDocById: function(id) {
	return rm._docsById[id];
},
getDocOf: function(el) {
	return rm.getDocById($(el).attr("id"));
},
///**
// * reguster a dom element for mutation events, so if the dom change, 
// */
//_registerMutationEvents: function(type, id, el, domEl) {
//	
//},
_elId: 0,
getShapeById: function(id) {
	return rm._shapes[id];
},
getShape: function(el) {
	return rm.getShapeById($(el).attr("id"));
},
//_ids : {},		
_getId: function(type, el, domEl) {
	if(domEl.attr("id")&&domEl.attr("id")!="")
		return domEl.attr("id");
	else {
		rm._elId++;
		var id = type+"_"+rm._elId;
		domEl.attr("id", id);
		return id;
	}
},
_raphaelAttrs: {"arrow-end": "none","arrow-start": "none",blur: 0,"clip-rect": "0 0 1e9 1e9",
	cursor: "default",cx: 0,cy: 0,fill: "#fff","fill-opacity": 1,font: '10px "Arial"',
	"font-family": '"Arial"',"font-size": "10","font-style": "normal","font-weight": 400,
	gradient: 0,height: 0,href: "http://raphaeljs.com/","letter-spacing": 0,opacity: 1,
	path: "M0,0",r: 0,rx: 0,ry: 0,src: "",stroke: "#000","stroke-dasharray": "",
	"stroke-linecap": "butt","stroke-linejoin": "butt","stroke-miterlimit": 0,
	"stroke-opacity": 1,"stroke-width": 1,target: "_blank","text-anchor": "middle",
	title: "Raphael",transform: "",width: 0,x: 0,y: 0
},



/* * * *  simple post rendering extensions mechanism 
 * so user can define its own rules for rendering
 * TODO: order of post renderers not respected
 * ** * * */
_postRenderExtensions: [],
_postRendering: function(rdoc) {
	for ( var i = 0; i < rm._postRenderExtensions.length; i++) {
		rm._postRenderExtensions[i](rdoc);
	}
},
postRendererRegister: function(handler) {
	rm._postRenderExtensions.push(handler);
},





/* * * *  simple preproccessing extension mechanism 
 * so user can define its own preprocessing engines/dialects.
 * current template system is an extension of this type, and shows how other can be dne, for ex a template based on jrender.
 * ** * * */
 
_preprocessExtensions: [],
preproccess: function(rdoc) {
	for ( var i = 0; i < rm._preprocessExtensions.length; i++) {
		rdoc=rm._preprocessExtensions[i](rdoc);
	}
	return rdoc;
},
preproccessRegister: function(handler) {
	rm._preprocessExtensions.push(handler);
},






///* * * * ASYNC preproccessing 
// * @based on jquery derreferred object (http://api.jquery.com/category/deferred-object/)
// * @see rm-ext.js@include for example* * * */
//
//_asyncPreproccessData: [],
//asyncPreproccessRegister: function(aPreproccessDerrefered) {
//	rm._asyncPreproccessData.push(aPreproccessDerrefered);
//},
//_asyncPreproccess: function(rdoc, onFinish) {
//	$.when(rm._asyncPreproccessData).then(function(){
//		onFinnish(rdoc);
//	})
//},









/* * * * loggin tools * * * */	
		
_doLog: false, 
_log : function(s) {
	if(rm._doLog) {
		if($("#rmlogger").size()==0) {
			$(document.body).append(
				"<textarea id=\"rmlogger\" style=\"width: 100%; height: 100px\">hello</textarea>");
		}
		$("#rmlogger").text($("#rmlogger").text()+"\n"+s);
	}
},
_errors: [],
_error: function(s) {
	rm._errors.push(s);
	rm._log("**ERROR**: "+s);
},
getErrors: function(){
	return rm._errors;
},










/* * * * MISC utils * * * */
_dump: function(o, val) {
	var s = "{";
	for(var i in o) {
		s+=i+"";
		if(val)
			s+=": "+o[i];
		s+=", ";
	}
	return s;
},
randomBetween: function (minVal,maxVal,floatVal){
  var randVal = minVal+(Math.random()*(maxVal-minVal));
  return typeof floatVal=='undefined'?Math.round(randVal):randVal.toFixed(floatVal);
},
randomColor: function () {
	return "rgb("+rm.randomBetween(0,255)+","+
		rm.randomBetween(0,255)+","+rm.randomBetween(0,255)+")";
},






};


