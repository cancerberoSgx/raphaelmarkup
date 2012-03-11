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
	
	/* first of all perorm preprosessing operations. TODO: we are discarding original document... */
//	rdoc.hide();
	
	var origDoc = rdoc, err = false;
//	try {
		rdoc = rm.processTemplates(rdoc);//$(rdoc.prop("documentElement")));
//	}catch(ex) {
//		err=true;		_render
//	}
	if(!rdoc||err||rdoc.size()==0) {		
		alert("error when preprocessing. ");
	}
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
		
		rm._renderPaper(rdoc, $(this), paper);
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
	dom.each(function(index) {
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
 * this apply a css source string in a DOM.
 */
applyCSS: function(doc, cssStr) {
	var css = rm.parseCSS(cssStr);
	for ( var i = 0; i < css.__order.length; i++) {
		var sel = css.__order[i];
		var el = doc.find(sel);
		el.attr(css[sel]);
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
	rm._registerMutationEvents(rdoc, dom, paper);
	return paper;
},
/**
 * @param el the jquery object for xml dom el def
 * @param paper the raphael paper 
 */
_renderEl: function(rdoc, dom, paper) {
	
	var shape = null;
	if(rm._getTagName(dom)=="image")
		shape=this._renderImage(dom, paper);
	else if(rm._getTagName(dom)=="rect")
		shape=this._renderRect(dom, paper);
	else if(rm._getTagName(dom)=="path")
		shape=this._renderPath(dom, paper);
	else if(rm._getTagName(dom)=="set")
		shape=this._renderSet(rdoc, dom, paper);
	else if(rm._getTagName(dom)=="circle")
		shape=this._renderCircle(dom, paper);	
	else if(rm._getTagName(dom)=="ellipse")
		shape=this._renderEllipse(dom, paper);
	
	if(shape!=null) {
		rm._register(rdoc, shape.type, shape, dom);
		rm._registerMutationEvents(rdoc, dom, shape);
	}
	return shape;
},
_getTagName: function(dom) {
	return dom.get(0).tagName.toLowerCase()
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
	var shape = paper.path(dom.attr("path"));
	this._renderAttrs(dom, shape, paper);
	return shape;
},
_renderSet: function(rdoc, dom, paper) {
	/* note that we first render set attrs, and then render set's children attrs, so one can do in CSS: 
	.set1 {
		fill: yellow;
	}
	.set1 circle {
		fill: black;
	}
	 */
	var set = paper.set();
	//set.paper = paper; //set lacks of paper reference
	
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



//_mutationHandlers: {},
/*
DOMSubtreeModified 	(none) 	Fires when the subtree is modified 	Yes 	No
DOMNodeInserted 	(none) 	Fires when a node has been added as a child of another node 	Yes 	No
DOMNodeRemoved 	(none) 	Fires when a node has been removed from a DOM-tree 	Yes 	No
DOMNodeRemovedFromDocument 	(none) 	Fires when a node is being removed from a document 	No 	No
DOMNodeInsertedIntoDocument 	(none) 	Fires when a node is being inserted into a document 	No 	No
DOMAttrModified 	(none) 	Fires when an attribute has been modified 	Yes 	No
DOMCharacterDataModified 	(none) 	Fires when the character data has been modified 	Yes 	No*/
_registerMutationEvents: function(rdoc, dom, shape) {	
//	rm._log("_registerMutationEvents for "+dom.attr("id"));
//	
//	/* DOMAttrModified - Fires when an attribute has been modified - 
//	 * here we only update the attributes of that shape. in case class or id change, 
//	 * there we reapply all styles from this element in the DOM.
//	 */
//	var attrModifiedHandler = function(evt) {
//		evt=rm._fixEvent(evt);
//		/* note in FF 
//		 * evt.attrName indicates the attribute name changed
//		 * evt.originalEvent.newValue and evt.originalEvent.prevValue
//		 */
//		var id = $(evt.target).attr("id");
//		var shape = rm.getShapeById(id);
//		var doc = rm.getDocById(id), dom = doc.find("#"+id);
//		rm._log("DOMAttrModified id. "+id+" - domcount: "+dom.size()+
//				" - shape: "+shape+
//				" - prevValue: "+evt.originalEvent.prevValue+
//				" - newValue: "+evt.originalEvent.newValue);		
//		if(shape) {//shape isn't created yet			
//			rm._renderAttrs(dom, shape);
//		}
//	};
//	
//	rm._registerDOMAttrModified(dom, attrModifiedHandler);
},
//_registerDOMAttrModified: function(dom, callback) {
//	if($.browser.webkit) {
//		/* WebKit fails to fire DOMAttrModified events when an attribute is changed. 
//		 * It does however fire the DOMSubtreeModified event after an attribute 
//		 * is modified. So at least that gives us something to work with until 
//		 * the good folks at WebKit squash the bug.*/
////		dom.bind("DOMSubtreeModified", callback); //TODO: fix evt object
//		dom.bind("DOMSubtreeModified", function(evt) {
////			evt.type=""
//			alert("DOMSubtreeModified");
//		}); 
//	}
//	else {
//		dom.bind("DOMAttrModified", attrModifiedHandler);
//	}
//},
//_fixEvent: function(e) {
//	e.newValue=e.originalEvent.newValue;
//	e.prevValue=e.originalEvent.prevValue;
//},





	/* * * * xml builder: build xml documents from 
	 * raphael paper instances * * * */

parseXML: function(xmlStr) {
	return $($.parseXML(xmlStr));
},
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
	
	//append the new empty raphael XML doc to global HTML doc and hide
//	var containerId = rm._xmlGetId();
//	$(document.body).append('<div id="'+containerId+'"></div>');
//	var container = $("#containerId");
//	container.hide();
	
	
//	$(document.body).append(doc);
//	doc.hide();
	
	var id = rm._xmlGetId(paper);
	var paperDom = rm.createElement(doc, "paper", {"id": id});
//	doc.append("<paper id=\""+id+"\" ></paper>");
//	var paperDom = doc.find("#"+id);
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
	return rm.createElement(dom, "rect", {"id": id});
//	dom.append("<rect id=\""+id+"\"></rect>");
//	var rectDom = $("#"+id);	
//	return rectDom;
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
//	dom.append("<circle id=\""+id+"\"></rect>");
//	var circleDom = $("#"+id);
//	return circleDom;
},
_xmlWritePath: function(el, dom) {
	var id = rm._xmlGetId(el);
	return rm.createElement(dom, "path", {"id": id});
//	dom.append("<path id=\""+id+"\"></rect>");
//	var pDom = $("#"+id);
//	return pDom;
},
_xmlWriteSet: function(el, dom) {
	var id = rm._xmlGetId(el);
	var sDom = rm.createElement(dom, "set", {"id": id});
//	dom.append("<set id=\""+id+"\"></set>");
//	var sDom = $("#"+id);
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
//	if(!el)
//		el={type: "_raphaelPaperContainer"};
	rm._xmlId++;
	return (el.type?el.type:"paper")+rm._xmlId;
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






/* * * * PREPROCESSING - <template tags * * * */

_rdocTemplates : {},
/**
 * main function for preprocessing templates. 
 * This function receives the DOM with templates elements
 * and perform 1) apply all templates callings with <use
 */
processTemplates: function(rdoc) {
	
	rm._rdocTemplates[rdoc]={};

	
	//first read each template
	rdoc.find("template").each(function(index){
		
		//do nothing for templates withtout name of body
		if(!$(this).attr("name") || $(this).find("template-body").size()==0)
			return;
		
		var data = {}, paramDefaultValues = {};
		
		//load variables
		$(this).find("var").each(function(i){
			data[$(this).attr("name")] = $(this).attr("value");
		});
		
		//load param default values
		$(this).find("template-arg").each(function(i){
			paramDefaultValues[$(this).attr("name")] = $(this).attr("value");
		});
		
		//load template
		var tmplCode = null;
		
//		try {
//			window.alert( $(this).find("template-body").get(0).innerHTML);
			var tmplCode = "";
			$(this).find("template-body").children().each(function(){
				tmplCode += rm.toXML($(this));
			});
//		}catch(ex) {
//			rm._error("cannot ghet template body html - "+e);
//		}
		var tmpl = rm.tmpl(tmplCode);
		
		rm._rdocTemplates[rdoc][$(this).attr("name")] = {
			"tmpl": tmpl,
			"data": data, 
			"paramDefaultValues": paramDefaultValues
		};
		
		//last remove the template element from DOM
		$(this).remove();
	});
	
//	alert(rdoc.find("use").size()+" - "+rdoc.find("use").attr("name"))

	//now apply all templates in all <use tags
	rdoc.find("template-use").each(function(){
		var name = $(this).attr("name");
		if(!name) {
			return;
		}
		var tmplData = {}, 
			templateObj = rm._rdocTemplates[rdoc][name];
		
		if(!rm._rdocTemplates[rdoc][name]) {
			rm._error("<use>_ "+"with non existent template: "+name);
			return; //template not found.
		}
				
		//first copy default params values defined by template
		for(var i in templateObj.paramDefaultValues) {
			tmplData[i] = templateObj.paramDefaultValues[i];
		}
		
		//then copy template variable values
		for(var i in templateObj.data) {
			tmplData[i]=templateObj.data[i];
		}
//		alert(rm._dump(tmplData, true));
		// template-use's other attributes than id, class and name
		//will be taken as teplate args
		var attrs = rm._getAttributeNames($(this))
		for ( var i = 0; i < attrs.length; i++) {
			if(attrs[i]!="name"&&attrs[i]!="id"&&attrs[i]!="class") {
//				var attrName = "";
				//_getAttributeNames() is buggy, so the next hack:
				for(var j in tmplData) {
					if(j.toLowerCase()==attrs[i].toLowerCase())
						tmplData[j]=$(this).attr(attrs[i]);
				}
				
			}
		}
//		alert(rm._dump(tmplData, true));
		//then copy template-arg
//		var iasds=$(this).find("template-arg").size();
//		alert($(this).find("template-arg").size());
		$(this).find("template-arg").each(function(){
			var an=$(this).attr("name"), av = $(this).attr("value");

//			try {
			tmplData[an]=av;
//			}catch(ex) {
//				debugger;
//			}
		});
		
//		alert(rm._dump(tmplData, true));
		
		//render template
		var out = null;
		try {

			out = templateObj.tmpl(tmplData);
		}catch(ex) {
			rm._error("<use>: Error when applying template "+
				name+". use id: "+$(this).attr("id")+" - "+ex);
			return;
		}
		
		var outDom = null;
		/* now we have out sources that should be valid xml source. We must include its DOM
		 * in the place (replace) of this use element.
		 */
		try {
			outDom = rm.parseXML(out);
			if(rm.isDocument(outDom))
				outDom=$(outDom.prop("documentElement"));
		}catch(e) {
//			alert("Error parsin out xml code : " +out);
			rm._error("<use>: Error parsing resulting output of template "+
				name+". use id: "+$(this).attr("id"));
			return;
		}
		
		//TODO: the ideal thing here is to use replaceWith, but won't work with xml docs. 
		$(this).parent().append(outDom);
//		$(this).remove();
		
		if($(this).attr("id")) {
			outDom.attr("id", $(this).attr("id"));
		}
		if($(this).attr("class")) {
			var oldClass= $(this).attr("class")?$(this).attr("class"):"";
			outDom.attr("class", oldClass+" "+$(this).attr("class"));
		}
		
		//TODO: replace the id of generated docuemtnElement with the <use id
		//TODO: add the class <use> to generated documentelement 
	});
	//also remove all template and template-use elements 
	rdoc.remove("template");
	rdoc.remove("template-use");
	return rdoc;
},





/* * * * microtemplating JSP like language engine  * * * */

//this is a fixed verson for using {% and {%= for not invalidate xml
tmpl: function tmpl(str, data){
	
    // Figure out if we're getting a template, or if we need to
    // load the template - and be sure to cache the result.
    var fn = !/\W/.test(str) ?
      rm._tmplCache[str] = rm._tmplCache[str] ||
        tmpl(document.getElementById(str).innerHTML) :
     
      rm._tmplCreateFunc(str, data);
   
    // Provide some basic currying to the user
    return data ? fn( data ) : fn;
}, 
_tmplCreateFunc: function(str, data) {
	// Generate a reusable function that will serve as a template
    // generator (and which will be cached).
	var fstr =  
		"var p=[],print=function(){p.push.apply(p,arguments);};" +
    
	    // Introduce the data as local variables using with(){}
	    "with(obj){p.push('" +
	   
	    // Convert the template into pure JavaScript
	    
	    str.replace(/[\r\t\n]/g, " ") .
	    replace(/'(?=[^%]*%})/g,"\t") .
	    split("'").join("\\'") .
	    split("\t").join("'") .
	    replace(/{%=(.+?)%}/g, "',$1,'") .
	    split("{%").join("');") .split("%}").
	    join("p.push('") + 
	    "');}return p.join('');";
//	window.alert(fstr);
	var f =  new Function("obj",fstr);
	return f;
},

//var p=[],print=function(){p.push.apply(p,arguments);};with(obj){p.push('<p>',prop1,'</p>');}return p.join('');

_tmplCache: {},

//_xmlTmplPrintTag="js"
//xmlTmpl



/* * * * loggin tools * * * */	
		
_doLog: true, 
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
		
//		if(childXml && childXml+""!="undefined")
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
	
	var e = $(xmldoc.createElement(tagName));
	if(attrs)
		e.attr(attrs);
	
	parent.append(e);
	
	return e;
},
isDocument: function(dom) {
	if(!dom||dom.size()==0) {
		return false;
	}
	return dom.get(0).createElement;
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


