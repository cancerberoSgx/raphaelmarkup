/* * * * 
 * 
 * raphaelmarkup extensions. 
 * several of raphaelmarkup features are infact extensions. This file contains a collection of the "official" extensions of rm.
 * 
 * Copyright (c) 2012 Sebastián Gurin (http://code.google.com/p/raphaelmarkup/)          │ \\
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
 * 
 * @author: Sebastián Gurin
 * 
 * * * * */


rm._preproccess_template1_rocTmpls = {};
/**
 * main function for preproccessing templates. 
 * This function receives the DOM with templates elements
 * and perform 1) apply all templates callings with <use
 */
rm._preproccess_template1 = function(rdoc) {
	
	rm._preproccess_template1_rocTmpls[rdoc]={};

	
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
		
		rm._preproccess_template1_rocTmpls[rdoc][$(this).attr("name")] = {
			"tmpl": tmpl,
			"data": data, 
			"paramDefaultValues": paramDefaultValues
		};
		
		//last remove the template element from DOM
		$(this).remove();
	});

	//now apply all templates in all <use tags
	rdoc.find("template-use").each(function(){
		var name = $(this).attr("name");
		if(!name) {
			return;
		}
		var tmplData = {}, 
			templateObj = rm._preproccess_template1_rocTmpls[rdoc][name];
		
		if(!rm._preproccess_template1_rocTmpls[rdoc][name]) {
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
			//rm._log("\n\n"+out+"\n\n");
			outDom = rm.parseXML(out);
			if(rm.isDocument(outDom))
				outDom=$(outDom.prop("documentElement"));
		}catch(e) {
			rm._error("<use>: Error parsing resulting output of template "+
				name+". use id: "+$(this).attr("id")+" - error: "+e);
//			return;
		}
		if(rm.isDocument(outDom))
			outDom=$(outDom.prop("documentElement"));
		
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
};

/** microtemplating JSP like language engine  
 * used in _preproccess_template1,  using 
 * {% and {%= for not invalidate xml* * * */

rm.tmpl=function tmpl(str, data){
	
    // Figure out if we're getting a template, or if we need to
    // load the template - and be sure to cache the result.
    var fn = !/\W/.test(str) ?
      rm._tmplCache[str] = rm._tmplCache[str] ||
        tmpl(document.getElementById(str).innerHTML) :
     
      rm._tmplCreateFunc(str, data);
   
    // Provide some basic currying to the user
    return data ? fn( data ) : fn;
};
rm._tmplCreateFunc = function(str, data) {
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
	var f =  new Function("obj",fstr);
	return f;
};
rm._tmplCache={};









/* * * * * percentual bounds extension - 
 * could be in other files and are optional 

/* (an example preprocessing extension) - porcentual width and height parameters
 * it will preprocess some attributes values like width, height, cx, cy, x, y, r, rx, ry, etc
 * if the value ends with a "%" it will be seten in pixels comparing with the parent's attribute value.
 * 
 * this extension has 2 parts:
 * 1) preproccessing : will fix attrs names that ends with "%" in all elemnts
 * 2) postRender, give validity to attrs x,y,width, height for paths. a post
 * renderer will transform paths to apply this attrs
 * 
 * this extension must be registered after templates and style
 * 
 * discussion: what about paths? paths doesn't have cx, x or width attributes. 
 * we can only move/translate using transformations.
 * this extension could do the following:
 * 1) give usability to attributes "width" and "height" for paths
 * 2) all shapes including path percentual attribs will be fixed at preprocessing
 * 3) provide a render extension that will perform the following after a shape is rendered: 
 * get its calculated width/height/x and y attrs and perform translation/
 */
rm._percentDimPreproccess = function(rdoc) {
	rdoc.find("paper").each(function(){
		var pw = parseInt($(this).attr("width")), 
			ph = parseInt($(this).attr("height"));
		var base = rm._percentDim_buildBase(pw, ph);
		$(this).children().each(function(){
			rm._percentDim_($(this), base);
		});
	});
	return rdoc;
};
rm._percentDim_buildBase = function(pw, ph) {
	return {
		"width": pw,
		"height": ph, 
		"r": pw,
		"x": pw, 
		"y": ph,
		"cx": pw, 
		"cy": ph, 
		"rx": pw,
		"ry": ph
	};	
};
rm._percentDim_attrs = [
	"width","height", "r", "x", "y", "cx", "cy", "rx", "ry"
];
rm._percentDim_ = function(dom, base) {
	
	//first set percentual attributes
	if(rm._getTagName(dom)=="set"||rm._getTagName(dom)=="path") {
		/* in the case of sets and paths, if not specified, we temporarily store 
		 * base width and heights as parameters */
		var w = dom.attr("width") ? $.trim(dom.attr("width")):base["width"];
		var h = dom.attr("height") ? $.trim(dom.attr("height")):base["height"];
//		if(w) 
//		if( && dom.attr("width").indexOf("%")==dom.attr("width").length-1) {
//			
//		}
		if(!dom.attr("width"))
			dom.attr("width", base["width"]);
		if(!dom.attr("height"))
			dom.attr("height", base["height"]);
	}
	
	//now fixe pecentual attributes
	for ( var i = 0; i < rm._percentDim_attrs.length; i++) {
		rm._percentDim_fixAttr(dom, rm._percentDim_attrs[i], base);
	}	
	
	//second, now that bounds attrs are fixed, get the next base for fix childs	
	if($(this).children().size()>0) {
		var newWidth = base["width"], 
			newHeight = base["height"], 
			tagName = rm._getTagName(dom);
		
		if(tagName=="rect") {
			newWidth = parseInt(dom.attr("width"));
			newHeight = parseInt(dom.attr("height"));		
		}
		else if(tagName=="circle") {
			newWidth = parseInt(dom.attr("r"));
			newHeight = parseInt(dom.attr("r"));		
		}
		else if(tagName=="ellipse") {
			newWidth = parseInt(dom.attr("rx"));
			newHeight = parseInt(dom.attr("ry"));		
		}
		else if(tagName=="path" || tagName=="set") {
			newWidth = parseInt(dom.attr("width"));
			newHeight = parseInt(dom.attr("height"));		
		}
		var newBase = rm._percentDim_buildBase(newWidth, newWidth);
		$(this).children().each(function(){
			rm._percentDim_($(this), newBase);
		});
	}
};
rm._percentDim_fixAttr=function(dom, attrName, base) {	
	var val = dom.attr(attrName);
	if(!val)
		return false;
	if($.trim(val).indexOf("%")==val.length-1) {
		val = parseInt(val.substring(0, val.length-1));
		dom.attr(attrName, Math.round(base[attrName]*(val/100)));
		return true;
	}
	else
		return false;	
};
rm._percentDim_postRendering = function(rdoc) {
	rdoc.find("path").each(function(){
		
	});
};









/* * * * CSS * * * */

/**
 * preprocess al style elements. 
 */
rm._preproccesCSS = function(rdoc) {
	/* first parse each <style> element against document. 
	 * the DOM will be affected before rendering.*/
	rdoc.find("style").each(function(i){
//		if($(this).attr("href")) {
//			$.ajax({
//				"url": $(this).attr("href"),
//				"context": rdoc,
//				"success": function(data) {
//					rm._applyCSS($(this), data);
//				}
//			});
//		}
//		else {
			rm._applyCSS(rdoc, $(this).text());
//		}
	});	
	return rdoc;
};
/**
 * this apply a css source string in a DOM. very simple version - not CSS conformant
 */
rm._applyCSS= function(doc, cssStr) {
	
	var css = rm._parseCSS(cssStr);
	for ( var i = 0; i < css.__order.length; i++) {
		var sel = css.__order[i];
		var els = doc.find(sel);
		els.attr(css[sel]);
	}
};
rm._parseCSS= function(css) {
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
};
rm._parseCSSBlock= function(css) { 
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
};
rm._removeComments= function(css) {
    return css.replace(/\/\*(\r|\n|.)*\*\//g,"");
};







/* * * * ANIMATIONS - 
 * define anims in XML and easily use them in javascript. 
 * the rdoc dom document will be poblated with function getAnimationById()
 * that will be return a valid animation object defined in animation element ided.
 * * * * * */
rm._anims_preproccess = function(rdoc) {
	if(!rdoc._animRegister) {
		rdoc._animRegister=function(animId, animObj){
			if(!rdoc._anims)
				rdoc._anims={};
			rdoc._anims[animId]=animObj;
		}
	}
	if(!rdoc.getAnimById) {
		rdoc.getAnimById=function(id) {
			if(rdoc._anims)
				return rdoc._anims[id];
			return null;
		}
	}
	rdoc.find("animation").each(function(){
		var animId = $(this).attr("id"), anim = {};
		if(!animId) 
			return;			
		$(this).find("scene").each(function(){
			var ellapse = $(this).attr("ellapse"), attrs = {};
			for ( var i = 0; i < rm._raphaelAnimAttrs.length; i++) {
				if($(this).attr(rm._raphaelAnimAttrs[i]))
					attrs[rm._raphaelAnimAttrs[i]]=$(this).attr(rm._raphaelAnimAttrs[i]);				
			}			
			anim[ellapse]=attrs;
			rdoc._animRegister(animId, anim);
		});	
	});
	return rdoc;
};
rm.animate = function(dom, animId, ms) {
	var rdoc = rm.getDocOf(dom), 
		shape = rm.getShape(dom), 
		anim = rdoc.getAnimById(animId);
	shape.stop();
	shape.animate(anim, ms);
};
rm._raphaelAnimAttrs = [
    "blur", "clip-rect", "cx", "cy", "fill", "fill-opacity", 
    "font-size", "height", "opacity", "path", "r", "rx", "ry", "stroke", 
    "stroke-opacity", "stroke-width", "transform", "width","x", "y"
];


/* * * * PRINT text decoration  underline, etc
 * some of these will *add* some shapes (to the set) to decoate a print.
 * letters shapes are marked with shape.type=="letter", and decoration internal shape will be marked for ex: textdecoration-underline
 * * * * * */

rm._printunderline_postRendering = function(rdoc) {
	rdoc.find("print").each(function(){
		if($(this).attr("underline-color")||$(this).attr("underline-width")||
				$(this).attr("underline-distance")||$(this).attr("underline-dasharray")||
				$(this).attr("underline-opacity")) {
			
			rm._printUnderline_do(
				rm.getShape($(this)), 
				rm.getShape($(this).parent("paper")), 
				$(this).attr("underline-color"), 
				$(this).attr("underline-width"), 
				$(this).attr("underline-distance"),
				$(this).attr("underline-dasharray"),
				$(this).attr("underline-opacity"));
		}
	});
};

//underline
rm._printUnderline_do = function(text, paper, color, width, distance, dasharray, opacity) {
	if(!color)color="black";
	if(!distance)distance=10;
	if(!width) width=1;
	if(!dasharray)dasharray="";
	if(!opacity)opacity=1.0;
	var path = null;
//	if(text._rm_topathPath) {
////		path=paper.path(text._rm_topathPath.getSubPath(text.getBBox().x, text.getBBox().x+text.getBBox().width));//.clone();
//		path=text._rm_topathPath.clone();//TODO: do this better because we can't rely on the provided path by onpath attr
//		path.transform("T 0 "+distance);
//	}
//	else {
		var pathStr = "M "+text[0].getBBox().x+" "+text[0].getBBox().y;	
		for ( var i = 1; i < text.length; i++) {
			pathStr+=" L "+text[i].getBBox().x+" "+(text[i].getBBox().height+text[i].getBBox().y+distance);
		}
		path = paper.path(pathStr);
//	}
	path.attr({
		"stroke": color,
		"stroke-width": width,
		"stroke-dasharray": dasharray,
		"stroke-opacity": opacity
	});
	path.rmtype="underline";
//	alert(text);
//	text.push(path); //make the underline path part of the text shape
	text._rm_underlinePath=path;	
}



//on path - don't work anymore.

//rm._printonpath_do = function(text, paper, pathStr) {
//	var p = paper.path(pathStr).attr({stroke: "none"});
//	for ( var i = 0; i < text.length; i++) {		
//		var letter = text[i];
////		if(letter.rmtype!="letter")
////			continue;
//		var newP = p.getPointAtLength(letter.getBBox().x);
//		var newTransformation = letter.transform()+
//		 	"T"+(newP.x-letter.getBBox().x)+","+
//	        (newP.y-letter.getBBox().y-letter.getBBox().height);
//		
//		//also rotate the letter to correspond the path angle of derivative
//	    newTransformation+="R"+
//	        (newP.alpha<360 ? 180+newP.alpha : newP.alpha);
//	    alert(newTransformation);
//	    letter.transform(newTransformation);
//	}
//	text._rm_topathPath=p;
//};
//
//rm._printonpath_postRendering = function(rdoc) {
//	rdoc.find("print").each(function(){
//		if($(this).attr("onpath")) {
//			alert(rm.getShape($(this)).type);
//			rm._printonpath_do(rm.getShape($(this)), 
//				rm.getShape($(this).parent("paper")), 
//				$(this).attr("onpath"));
//		}
//	});
//};






/* * * * * EVENTS * * * * */
/*events onclick, ondblclick, onmouseoever, etc are available
in the event's code "this" refers to the jquery DOM object pointing to xml event source element  
and "evt" is the event object. if you wnt to get the raphal shape use rm.getShape(this)  
*/
rm._events_postRendering = function(rdoc) {
	rdoc.find("imag, text, print, circle, ellipse, rect, path").each(function(){
		if($(this).attr("onclick")) {
			rm.getShape($(this)).click(new Function("evt",$(this).attr("onclick")), $(this));
		}
		if($(this).attr("ondblclick")) {
			rm.getShape($(this)).dblclick(new Function("evt",$(this).attr("ondblclick")), $(this));
		}
		if($(this).attr("onhoverin")) {
			rm.getShape($(this)).hover(new Function("evt",$(this).attr("onhoverin")), null, $(this), null);
		}
		if($(this).attr("onhoverout")) {
			rm.getShape($(this)).hover(null, new Function("evt",$(this).attr("onhoverout")), null, $(this));
		}
		if($(this).attr("onhover")) {
			rm.getShape($(this)).hover(new Function("evt",$(this).attr("hover")), $(this), new Function("evt",$(this).attr("hover")), $(this));
		}
		if($(this).attr("onmousedown")) {
			rm.getShape($(this)).mousedown(new Function("evt",$(this).attr("onmousedown")), $(this));
		}
		if($(this).attr("onmousemove")) {
			rm.getShape($(this)).mousemove(new Function("evt",$(this).attr("onmousemove")), $(this));
		}
		if($(this).attr("onmouseout")) {
			rm.getShape($(this)).mouseout(new Function("evt",$(this).attr("onmouseout")), $(this));
		}
		if($(this).attr("onmouseover")) {
			rm.getShape($(this)).mouseover(new Function("evt",$(this).attr("onmouseover")), $(this));
		}
		if($(this).attr("onmousemove")) {
			rm.getShape($(this)).mousemove(new Function("evt",$(this).attr("onmousemove")), $(this));
		}
		if($(this).attr("onmouseup")) {
			rm.getShape($(this)).mouseup(new Function("evt",$(this).attr("onmouseup")), $(this));
		}		
		if($(this).attr("ontouchcancel")) {
			rm.getShape($(this)).touchcancel(new Function("evt",$(this).attr("ontouchcancel")), $(this));
		}
		if($(this).attr("ontouchend")) {
			rm.getShape($(this)).touchend(new Function("evt",$(this).attr("ontouchend")), $(this));
		}
		if($(this).attr("ontouchmove")) {
			rm.getShape($(this)).touchmove(new Function("evt",$(this).attr("ontouchmove")), $(this));
		}
		if($(this).attr("ontouchstart")) {
			rm.getShape($(this)).touchstart(new Function("evt",$(this).attr("ontouchstart")), $(this));
		}		
	});
};





/* * * * scripts * * * */
rm._script_preproccess = function(rdoc) {
	rdoc.find("script").each(function(){
		try {
			eval($(this).text());
		} catch (e) {
			rm._error("script failed to eval");
		}		
	});
	return rdoc;
};




/* * * * * tofront - toback attributes * * * * */ 




//register all extensions (preproccessing)

rm.preproccessRegister(rm._preproccess_template1);
rm.preproccessRegister(rm._preproccesCSS);
//rm.preproccessRegister(rm._percentDimPreproccess);
rm.preproccessRegister(rm._script_preproccess);
rm.preproccessRegister(rm._anims_preproccess);


//register all extensions (post rendering)
rm.postRendererRegister(rm._events_postRendering);
//rm.postRendererRegister(rm._printonpath_postRendering);
rm.postRendererRegister(rm._printunderline_postRendering);


