(function () {
	
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



/* * * * ajax include other xml files - this is an asynchronous preproccessing example. 
 * async preproccessing are different from normal preproccesing.async 
 * preproccesing handlers accept a callback that will be called on preprocecss 
 * task end. the original dom doc object is be modified (¿async access to dom if 
 * many?). 
 * 
 * original dom  --- async preproccessing --->  dom1 ---normal proproccessing ---> dom2  ---- render  ---> {dom2, paper1}  --- postrendering ----> {dom2, paper2}  
 */


	
	
	
//first some general purposes utilities
/** opens link in a new tab simulating a click on a link */
rm.openInNewTab = function(url) {
	if($("#_openInNewTabAnchor").size()==0) 
		$(document.body).append('<a id="_openInNewTabAnchor" onclick="window.open(this.href);return false;" target="_blank" ></a>');
	$("#_openInNewTabAnchor").attr({"href": url});
//	debugger;
	$("#_openInNewTabAnchor").click();
}



/* * * * * * TEMPLATE * * * * */
rm._preproccess_template1_rocTmpls = {};

rm._preproccess_template1_useTags = {};

/**
 * main function for preproccessing templates. 
 * This function receives the DOM with templates elements
 * and perform 1) apply all templates callings with <use
 */
rm._preproccess_template1 = function(rdoc) {
	
	if(!rdoc) {
//		debugger;
		return;
	}
	rm._preproccess_template1_rocTmpls[rdoc]={};
	rm._preproccess_template1_useTags[rdoc]={};
	
	//first read each template
	rdoc.find("template").each(function(){		
		
		//do nothing for templates without name of body		
		if(!$(this).attr("name") || $(this).find("template-body").size()==0)
			return;
		
		var data = {}, paramDefaultValues = {}, argTypes = {};
		
		//load variables		
		$(this).find("template-var").each(function(){
			data[$(this).attr("name")] = $(this).attr("value");
			if($(this).attr("type")) {
				if(!argTypes[$(this).attr("type")])
					argTypes[$(this).attr("type")]=[];
				argTypes[$(this).attr("type")].push($(this).attr("name"));
			}
		});
		
		//load param default values - get types		
		$(this).find("template-arg").each(function(){
			paramDefaultValues[$(this).attr("name")] = $(this).attr("value");
			if($(this).attr("type")) {
				if(!argTypes[$(this).attr("type")])
					argTypes[$(this).attr("type")]=[];
				argTypes[$(this).attr("type")].push($(this).attr("name"));
			}
		});
		
		//load template
		var tmplCode = "";
		
		//first add type conversion code 
		var typeData = argTypes["int"];
		if(typeData) {
			tmplCode+="{%";
			for ( var i = 0; i < typeData.length; i++) {				
				var pname = typeData[i];
				tmplCode += pname+"=parseInt("+pname+");";
			}
			tmplCode+="%}";
		}
//		typeData = argTypes["float"];
//		if(typeData) for ( var i = 0; i < typeData.length; i++) {
//			var pname = typeData[i];
//			tmplCode += pname+"=parseFloat("+pname+");";
//		}
		//TODO: other types like date, regexp, array
		
		//then add the body
		$(this).find("template-body").children().each(function(){
			tmplCode += rm.toXML($(this));
		});
		
		//compile template
		var tmpl = rm.tmpl(tmplCode);
		
		var tmplInfo = {
			"name": $(this).attr("name"),
			"tmpl": tmpl,
			"data": data, 
			"paramDefaultValues": paramDefaultValues
		};
		
		rm._preproccess_template1_rocTmpls[rdoc][$(this).attr("name")] = tmplInfo;
		
		//now see if a use-tagname exists and if so, register the tagname to this template
		if($(this).find("use-tag").size()>0 && $(this).find("use-tag").attr("name")) {
			rm._preproccess_template1_useTags[rdoc][$(this).find("use-tag").attr("name")]=tmplInfo;
		}
		
		//last remove the template element from DOM
//		$(this).remove();
	});

	//now apply all templates in all <use tags and custom use-tag s
	var sel = "template-use";
	for(var i in rm._preproccess_template1_useTags[rdoc]) {
		sel+=", "+i;
	}
	rdoc.find(sel).each(function(){
		var name = $(this).attr("name"),  
			tagName = rm._getTagName($(this)), 
			templateObj = null;
		
		if(!name&&tagName=="template-use") {
			return;
		}
		if(tagName!="template-use") {
			name=rm._preproccess_template1_useTags[rdoc][tagName]["name"];
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
				//_getAttributeNames() is buggy, so the next hack:
				for(var j in tmplData) {
					if(j.toLowerCase()==attrs[i].toLowerCase())
						tmplData[j]=$(this).attr(attrs[i]);
				}
				
			}
		}
		//then copy template-arg
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
			outDom = rm.parseXML(out);
			if(rm.isDocument(outDom))
				outDom=$(outDom.prop("documentElement"));
		}catch(e) {
			rm._error("<use>: Error parsing resulting output of template "+
				name+". use id: "+$(this).attr("id")+" - error: "+e);
		}
		if(rm.isDocument(outDom))
			outDom=$(outDom.prop("documentElement"));
		
		//TODO: the ideal thing here is to use replaceWith, but won't work with xml docs. 
		$(this).parent().append(outDom);
//		$(this).remove();
		
		//copy all the attrs of this to outDom, with the execption of attr class that is appended.
		var thisAttrNames = rm._getAttributeNames(this);
		for ( var i = 0; i < thisAttrNames.length; i++) {
			if(thisAttrNames[i]!="class") {
				outDom.attr(thisAttrNames[i], $(this).attr(thisAttrNames[i]));
			}
		}
//		if($(this).attr("id")) {
//			outDom.attr("id", $(this).attr("id"));
//		}
		if($(this).attr("class")) {
			var oldClass= $(this).attr("class")?$(this).attr("class"):"";
			outDom.attr("class", oldClass+" "+$(this).attr("class"));
		}
		
	});
	//also remove all template and template-use elements 
//	rdoc.remove("template");
//	rdoc.remove("template-use");
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









/* * * * SET stuff */
rm._sets = {};
rm._setsPreproccess = function(rdoc) {
	
	//first append the transform in the set to each children.
	rdoc.find("paper>set").each(function(){
		rm._setsPreproccess_(rdoc, $(this));
	});
	return rdoc;
};
rm._setsPreproccess_=function(rdoc, set) {
	if(set.attr("transform")) {
		set.children().each(function(){
			var t = set.attr("transform").indexOf("...")==set.attr("transform").length-3 ? 
					set.attr("transform") : set.attr("transform")+"...";
			t=$(this).attr("transform") ? t+$(this).attr("transform") : t;
//			alert(t+" - "+rm._getTagName($(this)))
			$(this).attr("transform", t);
			if(rm._getTagName($(this))=="set") {
				rm._setsPreproccess_(rdoc, $(this));
			}
		});
	}
};





/* * * * CSS (after template preproccessing) - tag style * * * */

/**
 * preprocess al style elements. 
 */
rm._preproccesCSS = function(rdoc) {
	/* first parse each <style> element against document. 
	 * the DOM will be affected before rendering.*/
	rdoc.find("style").each(function(i){
		rm._applyCSS(rdoc, $(this).text());
	});	
	return rdoc;
};

/* * * * CSS (before template preproccessing) - tag template-style
 * (we separate style for template call elements from style for final 
 * base elements into style and template-style for performance reasons.)
 * * * * */
/**
 * preprocess al template-style elements. 
 */
rm._preproccesTemplateCSS = function(rdoc) {	
	rdoc.find("template-style").each(function(i){
		rm._applyCSS(rdoc, $(this).text());
	});	
	return rdoc;
};
/** a private el->{attr->boolean} mapping used for not overwriting
 * explicit elements attirbutes with css */
rm._css_elemAttrs={};
/**
 * this apply a css source string in a DOM. very simple version - 
 * not CSS conformant
 */
rm._applyCSS= function(doc, cssStr) {
	
	var css = rm._parseCSS(cssStr);
	for ( var i = 0; i < css.__order.length; i++) {
		var sel = css.__order[i];
//		var els = doc.find(sel);
		doc.find(sel).each(function(){
			var id=$(this).attr("id");
			if(!rm._css_elemAttrs[id]) {
				rm._css_elemAttrs[id]=rm._getAttributes(this);
			}
			var finalAttrs = rm._objdiff(css[sel], rm._css_elemAttrs[id]);
//			alert("setting to "+id+" - "+rm._dump(css[sel])+" - "+
//					rm._dump(rm._css_elemAttrs[id])	)
			$(this).attr(finalAttrs);
		});
//		els.attr(css[sel]);
//		for ( var j = 0; j < els.length; j++) {
//			var el = $(els[j]), id=el.attr("id");
//			if(!rm._css_elemAttrs[id]) {
//				rm._css_elemAttrs[id]=rm._getAttributes(el);
//			}
//			var finalAttrs = rm._objdiff(css[sel], rm._css_elemAttrs[id]);
//			alert("setting to "+id+" - "+rm._dump(css[sel])+" - "+
//					rm._dump(rm._css_elemAttrs[id])	)
//			$(el).attr(finalAttrs);
//		}
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






/* * * * id to all 
 *  internal preproccessing extension to assing an unique id to all elements  
 */
rm._idToAllCounter =  {};
rm._idToAllPreproccess = function(rdoc) {
	rdoc.find("*").each(function(){
		if(!$(this).attr("id")) {
			var tagName = rm._getTagName(this);
			if(!rm._idToAllCounter[tagName])
				rm._idToAllCounter[tagName]=1;
			rm._idToAllCounter[tagName]++;
			$(this).attr("id", tagName+rm._idToAllCounter[tagName]);
		}
	});
	return rdoc;
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
rm.delay = function(dom, animId, ms, delayms) {
	var rdoc = rm.getDocOf(dom), 
		shape = rm.getShape(dom), 
		anim = rdoc.getAnimById(animId),
		ranim =  Raphael.animation(anim, ms).delay(delayms);
	shape.stop();
	shape.animate(ranim, ms);
};
rm.repeat = function(dom, animId, ms, repeatCount) {
	var rdoc = rm.getDocOf(dom), 
		shape = rm.getShape(dom), 
		anim = rdoc.getAnimById(animId),
		ranim =  Raphael.animation(anim, ms).repeat(repeatCount);
	shape.stop();
	shape.animate(ranim, ms);
};
rm._raphaelAnimAttrs = [
    "blur", "clip-rect", "cx", "cy", "fill", "fill-opacity", 
    "font-size", "height", "opacity", "path", "r", "rx", "ry", "stroke", 
    "stroke-opacity", "stroke-width", "transform", "width","x", "y"
];

















/* * * * * EVENTS * * * * */

/*events onclick, ondblclick, onmouseoever, etc are available
in the event's code "this" refers to the jquery DOM object pointing to xml event source element  
and "evt" is the event object. if you wnt to get the raphal shape use rm.getShape(this)  
*/

rm._events_postRendering = function(rdoc) {
	rdoc.find("imag, text, print, circle, ellipse, rect, path").each(function(){
		if(!rm.getShape($(this)))
			return; //could be caused by bad xml 
		if($(this).attr("onclick")) {
			rm.getShape($(this)).click(new Function("event",$(this).attr("onclick")), $(this));
		}
		if($(this).attr("ondblclick")) {
			rm.getShape($(this)).dblclick(new Function("event",$(this).attr("ondblclick")), $(this));
		}
		
		if($(this).attr("onhoverin")) {
			rm.getShape($(this)).hover(new Function("event",$(this).attr("onhoverin")), null, $(this), null);
		}
		if($(this).attr("onhoverout")) {
			rm.getShape($(this)).hover(null, new Function("event",$(this).attr("onhoverout")), null, $(this));
		}
		
		if($(this).attr("ondragmove")) {
			rm.getShape($(this)).drag(new Function("dx", "dy", "x", "y", "event",$(this).attr("ondragmove")), null, null, $(this), null, null);
		}
		if($(this).attr("ondragstart")) {
			rm.getShape($(this)).drag(null, new Function("x", "y", "event", $(this).attr("ondragstart")), null, null, $(this), null);
		}
		if($(this).attr("ondragend")) {
			rm.getShape($(this)).drag(null, null, new Function("event",$(this).attr("ondragend")), null, null, $(this));
		}		
		
		if($(this).attr("onhover")) {
			rm.getShape($(this)).hover(new Function("event",$(this).attr("hover")), $(this), new Function("event",$(this).attr("hover")), $(this));
		}
		if($(this).attr("onmousedown")) {
			rm.getShape($(this)).mousedown(new Function("event",$(this).attr("onmousedown")), $(this));
		}
		if($(this).attr("onmousemove")) {
			rm.getShape($(this)).mousemove(new Function("event",$(this).attr("onmousemove")), $(this));
		}
		if($(this).attr("onmouseout")) {
			rm.getShape($(this)).mouseout(new Function("event",$(this).attr("onmouseout")), $(this));
		}
		if($(this).attr("onmouseover")) {
			rm.getShape($(this)).mouseover(new Function("event",$(this).attr("onmouseover")), $(this));
		}
		if($(this).attr("onmousemove")) {
			rm.getShape($(this)).mousemove(new Function("event",$(this).attr("onmousemove")), $(this));
		}
		if($(this).attr("onmouseup")) {
			rm.getShape($(this)).mouseup(new Function("event",$(this).attr("onmouseup")), $(this));
		}		
		if($(this).attr("ontouchcancel")) {
			rm.getShape($(this)).touchcancel(new Function("event",$(this).attr("ontouchcancel")), $(this));
		}
		if($(this).attr("ontouchend")) {
			rm.getShape($(this)).touchend(new Function("event",$(this).attr("ontouchend")), $(this));
		}
		if($(this).attr("ontouchmove")) {
			rm.getShape($(this)).touchmove(new Function("event",$(this).attr("ontouchmove")), $(this));
		}
		if($(this).attr("ontouchstart")) {
			rm.getShape($(this)).touchstart(new Function("event",$(this).attr("ontouchstart")), $(this));
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







/* * * * * text : width-wrapping 
 * this extension modify text content string adding |n chars to wrapp ina given width. * * * */
/**
 * @param t a raphael text shape
 * @param width - pixels to wrapp text width
 * modify t text adding new lines characters for wrapping it to given width.
 */
rm._textWrapp = function(t, width) {
	var content = t.attr("text");
	var abc="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
	t.attr({'text-anchor': 'start', "text": abc});
	var letterWidth=t.getBBox().width / abc.length;
	t.attr({"text": content});
	var words = content.split(" "), x=0, s=[];
	for ( var i = 0; i < words.length; i++) {
		var l = words[i].length;
		if(x+l>width) {
			s.push("\n")
			x=0;
		}
		else {
			x+=l*letterWidth;
		}
		s.push(words[i]+" ");
	}
	t.attr({"text": s.join("")});
};

rm._text_widthrwrappPostRendering = function(rdoc) {
	rdoc.find("text[width]").each(function(){
		var t = rm.getShape(this);
		rm._textWrapp(t, parseInt($(this).attr("width")));
	});;
	return rdoc;
}








/* * * * * tofront - toback attributes * * * * */ 

rm._toFrontBackPostRendering = function(rdoc) {
	rdoc.find("*[tofront]").each(function(){
		 rm.getShape(this).toFront();
	});;
	rdoc.find("*[toback]").each(function(){
		 rm.getShape(this).toBack();
	});;
	return rdoc;
	return rdoc;
}
















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
		var base = rm._percentDim_buildBase(pw, ph, 0, 0);
		$(this).children().each(function(){
			rm._percentDim_($(this), base);
		});
	});
	return rdoc;
};
rm._percentDim_buildBase = function(pw, ph, newX, newY) {
	return {
		"width": pw,
		"height": ph, 
		"r": pw,
		"x": pw, 
		"y": ph,
		"cx": pw, 
		"cy": ph, 
		"rx": pw,
		"ry": ph,
		"newX": newX,
		"newY": newY
	};	
};
rm._percentDim_attrs = [
	"width","height", "r", "x", "y", "cx", "cy", "rx", "ry"
];
rm._percentDim_ = function(dom, base) {
	//fix pecentual attributes
	for ( var i = 0; i < rm._percentDim_attrs.length; i++) {
		rm._percentDim_fixAttr(dom, rm._percentDim_attrs[i], base);
	}	
	
	//second, now that bounds attrs are fixed, get the next base for fix childs	
	if(dom.children().size()>0) {
		var newWidth = parseInt(dom.attr("width")), //for rect, path, set
			newHeight = parseInt(dom.attr("height")),
			newX=parseInt(dom.attr("x")), 
			newY=parseInt(dom.attr("y")),	//rect, ellypse		
			tagName = rm._getTagName(dom);
		
		//first get shape bounds from markup (can be percent vals)	
		if(tagName=="circle") {
			newWidth = parseInt(dom.attr("radius"));
			newHeight = parseInt(dom.attr("radius"));
			newX=parseInt(dom.attr("cx"));
			newY=parseInt(dom.attr("cy"));
		}
		else if(tagName=="ellipse") {
			newWidth = parseInt(dom.attr("rx"));
			newHeight = parseInt(dom.attr("ry"));
		}
		
		var newBase = rm._percentDim_buildBase(newWidth, newHeight, newX, newY);
		dom.children().each(function(){ /* iterall without filtering so other extensions can use me */
			rm._percentDim_($(this), newBase);
		});
	}
};
rm._percentDim_fixAttr=function(dom, attrName, base) {	
	var val = dom.attr(attrName), newVal=0;
	if(!val)
		return false;
	if($.trim(val).indexOf("%")==val.length-1) {
		val = parseInt(val.substring(0, val.length-1)), 
			newVal = Math.round(base[attrName]*(val/100));
		if(attrName=="x" || attrName=="cx")
			newVal+=base["newX"];
		if(attrName=="y" || attrName=="cy")
			newVal+=base["newY"];
		dom.attr(attrName, newVal);
		return true;
	}
	else
		return false;	
};
/**
 * this post renderingwill transform paths with x/y/width/height attrs to match the visual to its values.
 * @param rdoc
 */
rm._percentDim_postRendering = function(rdoc) {	
	rdoc.find("path").each(function(){
		var shape = rm.getShape($(this));
		if($(this).attr("x")) {
			shape.transform("...t"+(parseInt($(this).attr("x"))-shape.getBBox().x)+",0");
		}
		if($(this).attr("y")) {
			shape.transform("...t0,"+(parseInt($(this).attr("y"))-shape.getBBox().y));
		}
		if($(this).attr("width")) {
			shape.transform("...s"+(parseFloat($(this).attr("width"))/shape.getBBox().width));
		}
	});
	return rdoc;
};




/* * * * z-index * * * * 
 * register BEFORE toFront/toBack extension. 
 * TODO: if set contains zindex then all its children whill inherith it.
 */
rm._zindexDoSet=function(set, zindex) {
	set.children().each(function(){
		if(!$(this).attr("z-index"))
			$(this).attr("z-index", zindex);
		if(rm._getTagName($(this))=="set")
			rm._zindexDoSet($(this), $(this).attr("z-index")||zindex);
	});
};
rm._zindexPostRendering=function(rdoc) {
	var zindexes = {};
	rdoc.find("set[z-index]").each(function(){
		rm._zindexDoSet($(this));
	});
	rdoc.find("*[z-index]").each(function(){
		var zindex=$(this).attr("z-index");
		if(!zindexes[zindex])
			zindexes[zindex]=[];
		zindexes[zindex].push($(this));
	});
	var zindexArr = [];
	for(var i in zindexes)
		zindexArr.push(i);
	zindexArr=zindexArr.sort();
	for ( var i = 0; i < zindexArr.length; i++) {
		var els = zindexes[zindexArr[i]];
		if(els && els.length) {
			for ( var j = 0; j < els.length; j++) {
				rm.getShape(els[j]).toFront();
			}
		}
	}
	
	return rdoc;
}


/* * * * gradient * * * */
















/* * * * * * * 
 * raphael extension's extension
 * effect and filters not supported by raphaeljs like blur, 
 * emboss, and other supported only in svg. these rm extensions 
 * will also define a raphael plugin and use it.
 * Note that almost all of these will be only post renderer extensions (dont do any xml preproccessing).
 */

rm._blurPostRendering=function(rdoc) {
	rdoc.find("*[blur]").each(function(){
		var blur = parseFloat($(this).attr("blur")), 
			shape = rm.getShape(this);
		shape.blur(blur);
	});
};

rm._embossPostRendering=function(rdoc) {
	rdoc.find("*[emboss]").each(function(){
		var factor = parseFloat($(this).attr("emboss")), 
			shape = rm.getShape(this);
		shape.emboss(factor);
	});
};
rm._morphologyPostRendering=function(rdoc) {
//	morphology(morphname, operator, radius)
	rdoc.find("*[erode], *[dilate]").each(function(){
		var shape = rm.getShape(this);
		
		alert(Raphael.st)
//		var set = shape.paper.set();
//		debugger;
		if($(this).attr("erode"))		
			shape.morphology("rmErode", "erode", parseFloat($(this).attr("erode")));
		if($(this).attr("dilate"))		
			shape.morphology("rmDilate", "dilate", parseFloat($(this).attr("dilate")));
	});
};
rm._colorMatrix=function(rdoc) {
	rdoc.find("*[erode], *[dilate]").each(function(){
		var shape = rm.getShape(this);
		if($(this).attr("erode"))		
			shape.morphology("rmErode", "erode", parseFloat($(this).attr("erode")));
		if($(this).attr("dilate"))		
			shape.morphology("rmDilate", "dilate", parseFloat($(this).attr("dilate")));
	});
};





//now raphael plugins :
//blur plugin: use like shape1.blur(2);
(function () {
  if (Raphael.vml) {
      var reg = / progid:\S+Blur\([^\)]+\)/g;
      Raphael.el.blur = function (size) {
          var s = this.node.style,
              f = s.filter;
          f = f.replace(reg, "");
          if (size != "none") {
              s.filter = f + " progid:DXImageTransform.Microsoft.Blur(pixelradius=" + (+size || 1.5) + ")";
              s.margin = Raphael.format("-{0}px 0 0 -{0}px", Math.round(+size || 1.5));
          } else {
              s.filter = f;
              s.margin = 0;
          }
      };
  } else {
      var $ = function (el, attr) {
          if (attr) {
              for (var key in attr) if (attr.hasOwnProperty(key)) {
                  el.setAttribute(key, attr[key]);
              }
          } else {
              return document.createElementNS("http://www.w3.org/2000/svg", el);
          }
      };
      Raphael.el.blur = function (size) {
          // Experimental. No WebKit support.
          if (size != "none") {
              var fltr = $("filter"),
                  blur = $("feGaussianBlur");
              fltr.id = "r" + (Raphael.idGenerator++).toString(36);
              $(blur, {stdDeviation: +size || 1.5});
              fltr.appendChild(blur);
              this.paper.defs.appendChild(fltr);
              this._blur = fltr;
              $(this.node, {filter: "url(#" + fltr.id + ")"});
          } else {
              if (this._blur) {
                  this._blur.parentNode.removeChild(this._blur);
                  delete this._blur;
              }
              this.node.removeAttribute("filter");
          }
      };
  }
})();
//emboss plugin, use like shape1.emboss(1.0)
(function () {
  if (Raphael.vml) {
      var reg = / progid:\S+Emboss\([^\)]+\)/g;
      Raphael.el.emboss = function (bias) {
          var s = this.node.style,
              f = s.filter;
          f = f.replace(reg, "");
          if (bias != "none") {
              s.filter = f + " progid:DXImageTransform.Microsoft.Emboss(bias=" + (bias || 0.0) + ")";
              //s.margin = Raphael.format("-{0}px 0 0 -{0}px", Math.round(+size || 1.5));
          } else {
              s.filter = f;
              //s.margin = 0;
          }
      };
  } else {        
      Raphael.el.emboss = function (bias) {
          // Experimental. No WebKit support.
      	if(bias==null) {
      		return this.convolveClear(Raphael.el.emboss.EMBOSS_TRANS_NAME);
      	}
      	else {
      		var factor = 1.0;        				
      		var embossKernel =[
      				factor*-1,	0, 		0, 
      				0,			1, 		0,
      				0,			0, 		factor]; 
      			
//      			[-1.0, -1.0, 0.0, 
//  			    -1.0, 0.0, 1.0,
//  			    0.0, 1.0, 1.0];
      		
//      		Raphael.el.convolve = function (convolutionName, kernelXSize, kernel, 
//              		divisor, bias,  preserveAlpha) 
      		return this.convolve(Raphael.el.emboss.EMBOSS_TRANS_NAME, 
      			3, embossKernel, 1.0, bias, null);
      	}
      };
      Raphael.el.emboss.EMBOSS_TRANS_NAME="embossTransformation";
  }
})();



/*
 * pixel convolution tranformation (only svg). only squeare kernels allowed.
 * you can add many convolutions. Their name must be a valid html id. For example:
 * image.convolve("emboss1", 3, 3, [0.4,0,0,0,1,0,0,0,0.5])
 * image.convolve("conv2", 2,2,[1,2,2,3])
 * image.convolveClear("emboss1")
 * @author: SebastiÃ¡n Gurin <sgurin @ montevideo  DOT com  DOT uy>
 */
(function () {
    if (Raphael.vml) {    	
    	//TODO
    	Raphael.el.convolve = function (convolutionName, kernelXSize, kernel, 
        		divisor, bias,  preserveAlpha) {
    		return this;
    	};
    	 Raphael.el.convolveClear = function (convolutionName) {
    		 return this;
    	 };
    } 
    else {
        var $ = function (el, attr) {
            if (attr) {
                for (var key in attr) if (attr.hasOwnProperty(key)) {
                    el.setAttribute(key, attr[key]);
                }
            } else {
                return document.createElementNS("http://www.w3.org/2000/svg", el);
            }
        };
        Raphael.el.convolve = function (convolutionName, kernelXSize, kernel, 
        		divisor, bias,  preserveAlpha) {
        	
        	//convolution configuration
            var convolveConfig = {
            	order: kernelXSize+"",
            	kernelMatrix: kernel.join(" ")
            };
            if(divisor) convolveConfig["divisor"]=divisor;
            if(bias) convolveConfig["bias"]=bias;
            if( preserveAlpha) convolveConfig["preserveAlpha"]= preserveAlpha;            
            else convolveConfig["preserveAlpha"]="true";
            
        	//if not exists create a main filter element
        	if(this.mainFilter==null) {
        		this.mainFilter = $("filter");
        		this.mainFilter.id = "convolutionMainFilter"
                this.paper.defs.appendChild(this.mainFilter);
        		$(this.node, {filter: "url(#convolutionMainFilter)"});
        	}
        	
            //create or gets the filter primitive element feConvolveMatrix:
            var convolveFilter = this._convolutions==null?null:this._convolutions[convolutionName];
            if(convolveFilter==null){
            	convolveFilter = $("feConvolveMatrix");
            }
            this.mainFilter.appendChild(convolveFilter);
            
            //apply configuration and register
            $(convolveFilter, convolveConfig);  
            if(! this._convolutions)
            	 this._convolutions={}
            this._convolutions[convolutionName] = convolveFilter;
            
	        return this;
        };
        Raphael.st.convolve =  function(convolutionName, kernelXSize, kernel, 
        		divisor, bias,  preserveAlpha) {
        	for ( var i = 0; i < this.items.length; i++) {
				this.items[i].convolve(convolutionName, kernelXSize, kernel, 
		        		divisor, bias,  preserveAlpha);
			}
        };
        Raphael.el.convolveClear = function (convolutionName) {
        	if (this._convolutions!=null && this._convolutions[convolutionName]!=null &&
        			this.mainFilter!=null) {   
        		try {
        			this.mainFilter.removeChild(this._convolutions[convolutionName]);
        			this._convolutions[convolutionName]=null;
        		}catch(ex){alert("error removing filter for conv named : "+convolutionName);}
        		
            }  
            return this;
        };
        Raphael.el.convolveClearAll=function() {
        	if(this.mainFilter!=null) {
	        	this.paper.defs.removeChild(this.mainFilter);
	        	this.mainFilter=null;
	        	this._convolutions=null;
	        	this.node.removeAttribute("filter");
        	}
        };
    }
    
})();
    
    
/*
 * colorMatrix support  for raphael. Only available on svg
 * @author: SebastiÃ¡n Gurin <sgurin @ montevideo  DOT com  DOT uy>
 */
(function () {
    if (Raphael.vml) {    	
    	//TODO
    } 
    else {
        var $ = function (el, attr) {
            if (attr) {
                for (var key in attr) if (attr.hasOwnProperty(key)) {
                    el.setAttribute(key, attr[key]);
                }
            } else {
                return document.createElementNS("http://www.w3.org/2000/svg", el);
            }
        };
        Raphael.el.colorMatrix = function (tname, matrix) {        	
            var filterConfig = {
            	type: "matrix", 
            	values : matrix.join(" ")
            };
        	//if not exists create a main filter element
        	if(this.colorMainFilter==null) {
        		this.colorMainFilter = $("filter");
        		this.colorMainFilter.id = "colorMainFilter"
                this.paper.defs.appendChild(this.colorMainFilter);
        		$(this.node, {filter: "url(#colorMainFilter)"});
        	}
        	
            //create or gets the filter primitive element feColorMatrix:
            var colorFilter = this._colorFilters==null?null:this._colorFilters[tname];
            if(colorFilter==null){
            	colorFilter = $("feColorMatrix");
            }
            this.colorMainFilter.appendChild(colorFilter);
            
            //apply configuration and register
            $(colorFilter, filterConfig);  
            if(! this._colorFilters)
            	 this._colorFilters={}
            this._colorFilters[tname] = colorFilter;
            
	        return this;
        };

        Raphael.st.colorMatrix =  function(tname, matrix) {
        	for ( var i = 0; i < this.items.length; i++) {
				this.items[i].colorMatrix(tname, matrix);
			}
        };
        Raphael.el.colorMatrixClear = function (tName) {
        	if (this._colorFilters!=null && this._colorFilters[tName]!=null &&
        			this.colorMainFilter!=null) {   
        		try {
        			this.colorMainFilter.removeChild(this._colorFilters[tName]);
        			this._colorFilters[tName]=null;
        		}catch(ex){alert("error removing filter for color matrix named : "+tName);}
        		
            }  
            return this;
        };
        Raphael.el.colorMatrixClearAll=function() {
        	if(this.colorMainFilter!=null) {
	        	this.paper.defs.removeChild(this.colorMainFilter);
	        	this.colorMainFilter=null;
	        	this._colorFilters=null;
	        	this.node.removeAttribute("filter");
        	}
        };
    }
})();     
    
/* raphael support for http://www.w3.org/TR/SVG/filters.html#feComponentTransfer (SVG ONLY!)
 * in this first version, only type="linear" supported
 * @author: SebastiÃ¡n Gurin <sgurin @ montevideo  DOT com  DOT uy>
 */
(function () {
    if (Raphael.vml) { 
		//TODO
    } 
    else {
        var $ = function (el, attr) {
            if (attr) {
                for (var key in attr) if (attr.hasOwnProperty(key)) {
                    el.setAttribute(key, attr[key]);
                }
            } else {
                return document.createElementNS("http://www.w3.org/2000/svg", el);
            }
        };
			/**use like this:
				el.componentTransferLinear("myTransf1", {funcR: {slope: 4, intercept: -1}, funcG: {slope: 4, intercept: -1}, funcB: {slope: 4, intercept: -1}})
			*/
        Raphael.el.componentTransferLinear = function (tName, funcs) {       	
//        	alert("componentTransferLinear");
	     	//if not exists create a main filter element
	     	if(this.componentTransfersMainFilter==null) {
	     		alert("***componentTransfersMainFilter created");
	     		this.componentTransfersMainFilter = $("filter");
	     		this.componentTransfersMainFilter.id = "componentTransfersMainFilter"
	             this.paper.defs.appendChild(this.componentTransfersMainFilter);
	     		$(this.node, {filter: "url(#componentTransfersMainFilter)"});
	     	}
        	
            //create or gets the filter primitive element feComponentTransfer with its feFuncX childs:
            var componentTransferFilter = this._componentTransfers==null?null:this._componentTransfers[tName], 
					funcR=null, funcG=null, funcB=null ;
            if(componentTransferFilter==null){
//            	debugger;
//            	alert("*componentTransfersMainFilter created");
            	componentTransferFilter = $("feComponentTransfer");
				funcR = $("feFuncR");
				funcG = $("feFuncG");
				funcB = $("feFuncB");
				componentTransferFilter.appendChild(funcR);
				componentTransferFilter.appendChild(funcG);
				componentTransferFilter.appendChild(funcB);
            }
            else {
            	funcR = componentTransferFilter.childNodes[0];
            	funcG = componentTransferFilter.childNodes[1];
            	funcB = componentTransferFilter.childNodes[2];
            }
            //debugger;
            $(funcR, funcs["funcR"]); funcR.setAttribute("type", "linear");
            $(funcG, funcs["funcG"]); funcG.setAttribute("type", "linear");
            $(funcB, funcs["funcB"]); funcB.setAttribute("type", "linear");            
            this.componentTransfersMainFilter.appendChild(componentTransferFilter);
            
            //register          
            if(! this._componentTransfers)
            	 this._componentTransfers={}
            this._componentTransfers[tName] = componentTransferFilter;
            
	        return this;
        };
        Raphael.st.componentTransferLinear =  function(tname, funcs) {
        	for ( var i = 0; i < this.items.length; i++) {
				this.items[i].componentTransferLinear(tname, funcs);
			}
        };
        
        Raphael.el.componentTransferClear = function (tName) {
        	if (this._componentTransfers!=null && this._componentTransfers[tName]!=null &&
        			this.componentTransfersMainFilter!=null) {   
        		try {
        			this.componentTransfersMainFilter.removeChild(this._componentTransfers[tName]);
        			this._componentTransfers[tName]=null;
        		}catch(ex){alert("error removing filter for conv named : "+tName);}
        		
            }  
            return this;
        };
        Raphael.el.componentTransferClearAll=function() {
        	if(this.componentTransfersMainFilter!=null) {
	        	this.paper.defs.removeChild(this.componentTransfersMainFilter);
	        	this.componentTransfersMainFilter=null;
	        	this._componentTransfers=null;
	        	this.node.removeAttribute("filter");
        	}
        };
    }
    
})();
/*
 *  'feMorphology' support  for raphael. Only available on svg
 *  use shape1.morphology(morphname, operator, radius)
 *  where operator cah be "erode" or "dilate" and radius an int. morphname is 
 *  the name of your transformation and can be used later for unregistering the 
 *  transf using shape1.morphologyClear(morphname).
 * @author: SebastiÃ¡n Gurin <sgurin @ montevideo  DOT com  DOT uy>
 */
(function () {
    if (Raphael.vml) {    	
    	//TODO
    } 
    else {
        var $ = function (el, attr) {
            if (attr) {
                for (var key in attr) if (attr.hasOwnProperty(key)) {
                    el.setAttribute(key, attr[key]);
                }
            } else {
                return document.createElementNS("http://www.w3.org/2000/svg", el);
            }
        };
        Raphael.el.morphology = function (tname, operator, radius) {        	
            var filterConfig = {
            	"operator": operator, 
            	"radius" : radius
            };
        	//if not exists create a main filter element
        	if(this.morphologyMainFilter==null) {
        		this.morphologyMainFilter = $("filter");
        		this.morphologyMainFilter.id = "morphologyMainFilter"
            this.paper.defs.appendChild(this.morphologyMainFilter);
        		$(this.node, {filter: "url(#morphologyMainFilter)"});
        	}
        	
            //create or gets the filter primitive element feColorMatrix:
            var morphologyFilter = this._morphologyFilters==null?null:this._morphologyFilters[tname];
            if(morphologyFilter==null){
            	morphologyFilter = $("feMorphology");
            }
            this.morphologyMainFilter.appendChild(morphologyFilter);
            
            //apply configuration and register
            $(morphologyFilter, filterConfig);  
            if(! this._morphologyFilters)
            	 this._morphologyFilters={}
            this._morphologyFilters[tname] = morphologyFilter;
            
	        return this;
        };
        
        Raphael.el.morphologyClear = function (tName) {
        	if (this._morphologyFilters!=null && this._morphologyFilters[tName]!=null &&
        			this.morphologyMainFilter!=null) {   
        		try {
        			this.morphologyMainFilter.removeChild(this._morphologyFilters[tName]);
        			this._morphologyFilters[tName]=null;
        		}catch(ex){alert("error removing filter for morphology named : "+tName);}
        		
            }  
            return this;
        };
        Raphael.el.morphologyClearAll=function() {
        	if(this.morphologyMainFilter!=null) {
	        	this.paper.defs.removeChild(this.morphologyMainFilter);
	        	this.morphologyMainFilter=null;
	        	this._morphologyFilters=null;
	        	this.node.removeAttribute("filter");
        	}
        };
        
        Raphael.st.morphology =  function(tname, operator, radius) {
        	for ( var i = 0; i < this.items.length; i++) {
				this.items[i].morphology(tname, operator, radius);
			}
        }
    }
})();     
    






















//register all extensions (preproccessing)
rm.preproccessRegister(rm._idToAllPreproccess);
rm.preproccessRegister(rm._preproccesTemplateCSS);
rm.preproccessRegister(rm._preproccess_template1);
rm.preproccessRegister(rm._preproccesCSS);

rm.preproccessRegister(rm._percentDimPreproccess);
rm.preproccessRegister(rm._script_preproccess);
rm.preproccessRegister(rm._anims_preproccess);
rm.preproccessRegister(rm._setsPreproccess);



//register all extensions (post rendering)
rm.postRendererRegister(rm._events_postRendering);
//rm.postRendererRegister(rm._printonpath_postRendering);
//rm.postRendererRegister(rm._printunderline_postRendering);
rm.postRendererRegister(rm._text_widthrwrappPostRendering);

rm.postRendererRegister(rm._zindexPostRendering);
rm.postRendererRegister(rm._toFrontBackPostRendering);

rm.postRendererRegister(rm._percentDim_postRendering);
//rm.postRendererRegister(rm._html_postrendering);

rm.postRendererRegister(rm._blurPostRendering);
rm.postRendererRegister(rm._embossPostRendering);
rm.postRendererRegister(rm._morphologyPostRendering);











































//not in use:





/* * * * PRINT - onpath 
 * replace a <print onpath="nonempty"> witha <set> with paths for each letter (previous print() raphael impl) and align the letters on the path
 * * * * */
//a raphael
(function() {
	/**
	 * do the job of putting all letters in a set returned bu printLetters in a path
	 * @param p - can be a rpahael path obejct or string
	 */
	var _printOnPath = function(text, paper, p) {
		if(typeof(p)=="string")
			p = paper.path(p).attr({stroke: "none"});
		for ( var i = 0; i < text.length; i++) {		
			var letter = text[i];
			var newP = p.getPointAtLength(letter.getBBox().x);
			var newTransformation = letter.transform()+
			 	"T"+(newP.x-letter.getBBox().x)+","+
		        (newP.y-letter.getBBox().y-letter.getBBox().height);		
			//also rotate the letter to correspond the path angle of derivative
		    newTransformation+="R"+
		        (newP.alpha<360 ? 180+newP.alpha : newP.alpha);
		    letter.transform(newTransformation);
		}
		text._rm_topathPath=p;
	};
	
	/** print letter by letter, and return the set of letters (paths), just like the old raphael print() method did. */
	Raphael.fn.printLetters = function(x, y, str, font, size, 
			letter_spacing, line_height, onpath) {
		letter_spacing=letter_spacing||size/1.5;
		line_height=line_height||size;
		this.setStart();
		var x_=x, y_=y;
		for ( var i = 0; i < str.length; i++) {
			if(str.charAt(i)!='\n') {
				var letter = this.print(x_,y_,str.charAt(i),font,size);
				x_+=letter_spacing;				
			}
			else {
				x_=x;
				y_+=line_height;
			}
		}
		var set = this.setFinish();
		if(onpath) {
			_printOnPath(set, this, onpath);
		}
		return set;
	};	
})();

/**
* this preproccess will replace print[onpath] with a <set of <prints, each one for a letter
*/
rm._printonpath_preproccessing = function(rdoc) {
}


//rm._printonpath_count=0;
//rm._printonpath_getId = function(){
//	rm._printonpath_count++;
//	return "printonpath"+rm._printonpath_count;
//}
///**
// * this preproccess will replace print[onpath] with a <set of <prints, each one for a letter
// */
//rm._printonpath_preproccessing = function(rdoc) {
//	rdoc.find("print[onpath]").each(function(){
//		var text = $(this).attr("text") || rm._getInmediateText($(this)), 
//			x=$(this).attr("x")||0, 
//			y=$(this).attr("y")||0, 
//			set = rm.createElement($(this).parent(), "set"), 
//			letter = null;
//			
//		rm.copyAttrs($(this), set);
//		for ( var i = 0; i < text.length; i++) {
//			letter = rm.createElement(set, "print", {});
//			letter.attr($(this).attr())
//			
//		}
//		var p = 
//	});
//}
//rm._printonpath_preproccessing = function(rdoc) {
//	rdoc.find("print[onpath]").each(function(){
//		var p = 
//	});
//}



//
//
///* * * * PRINT text decoration  underline, etc
// * some of these will *add* some shapes (to the set) to decoate a print.
// * letters shapes are marked with shape.type=="letter", and decoration internal shape will be marked for ex: textdecoration-underline
// * * * * * */
//
//rm._printunderline_postRendering = function(rdoc) {
//	rdoc.find("print").each(function(){
//		if($(this).attr("underline-color")||$(this).attr("underline-width")||
//				$(this).attr("underline-distance")||$(this).attr("underline-dasharray")||
//				$(this).attr("underline-opacity")) {
//			
//			rm._printUnderline_do(
//				rm.getShape($(this)), 
//				rm.getShape($(this).parent("paper")), 
//				$(this).attr("underline-color"), 
//				$(this).attr("underline-width"), 
//				$(this).attr("underline-distance"),
//				$(this).attr("underline-dasharray"),
//				$(this).attr("underline-opacity"));
//		}
//	});
//};
//
////underline
//rm._printUnderline_do = function(text, paper, color, width, distance, dasharray, opacity) {
//	if(!color)color="black";
//	if(!distance)distance=10;
//	if(!width) width=1;
//	if(!dasharray)dasharray="";
//	if(!opacity)opacity=1.0;
//	var path = null;
////	if(text._rm_topathPath) {
//////		path=paper.path(text._rm_topathPath.getSubPath(text.getBBox().x, text.getBBox().x+text.getBBox().width));//.clone();
////		path=text._rm_topathPath.clone();//TODO: do this better because we can't rely on the provided path by onpath attr
////		path.transform("T 0 "+distance);
////	}
////	else {
//		var pathStr = "M "+text[0].getBBox().x+" "+text[0].getBBox().y;	
//		for ( var i = 1; i < text.length; i++) {
//			pathStr+=" L "+text[i].getBBox().x+" "+(text[i].getBBox().height+text[i].getBBox().y+distance);
//		}
//		path = paper.path(pathStr);
////	}
//	path.attr({
//		"stroke": color,
//		"stroke-width": width,
//		"stroke-dasharray": dasharray,
//		"stroke-opacity": opacity
//	});
//	path.rmtype="underline";
////	alert(text);
////	text.push(path); //make the underline path part of the text shape
//	text._rm_underlinePath=path;	
//}
//
//
//
//

//
///** * * * * html "inside" - this just get a given html element 
// * over a paper and shape it. User is responsible for
// * creating the html take care abuut zindex.etc. 
// * 
// * Because this is not really html content inserting, the html elements won't respond to any raphael attrs or transfmrtions.
// * 
// * coopeates with percentDim, shuld be registered after it. 
// * height and width are provided by html
// * * * * 
// */
//rm._html_postrendering=function(rdoc) {
//	rdoc.find("include-html[element]").each(function(){
//		var dom = $($(this).attr("element"));
//		if(dom.size()>0 && $(this).attr("x") && 
//			$(this).attr("y")) {
//			
//			var paper = rm.getShape($(this).parents("paper")), 
//				paperPos = $(paper.canvas).offset();
//			
//			dom.parent().css({"x-index": 9999});
//			
//			dom.css({
//				"x-index": 9999,
//				"position": "absolute",
//				"display": "block",
//				"top": (paperPos.top+parseInt($(this).attr("y")))+"px",
//				"left": (paperPos.left+parseInt($(this).attr("x")))+"px",
//			});
//		}
//	});
//	return rdoc;
//}

//rm._include_handlers={};
//rm._include_registerUrl=function(rdoc, dom, url, h) {
//	if(!rm._include_handlers[rdoc])
//		rm._include_handlers[rdoc]={};
//	rm._include_handlers[rdoc][dom]=h;
//	return $.ajax({
//		"url": url,
//		"success": function(data) {
//			var domToInclude= $(data);
//			domToInclude.insertAfter(this["dom"]);
//			this["dom"].remove();
//			//callback
//			rm._include_handlers[this["rdoc"]][this["dom"]]();
//		},
//		"context": {"rdoc": rdoc, "dom": dom},
//		"error": errorHandler,
//		"dataType": "xml"
//	});
//}
//rm._include_asyncPreproccess = function(rdoc) {
//	var data=[];
//	rdoc.find("include[src]").each(function(){
//		data.push({
//			"ajax": rm._include_registerUrl(rdoc, $(this), $(this).attr("src"))
//		});
//	});
//
//	return $.when(data).then(function(results){		
//	});
//	
////	rm._include_onFinnish=onFinnish;
//}
//rm.asyncPreproccessRegister(rm._include_asyncPreproccess);
////rm._include_handlers={};
//rm._include_registerUrl=function(rdoc, dom, url, h) {
////	if(!rm._include_handlers[rdoc])
////		rm._include_handlers[rdoc]={};
////	rm._include_handlers[rdoc][dom]=h;
//	return $.ajax({
//		"url": url,
//		"success": function(data) {
//			var domToInclude= $(data);
//			$(domToInclude.prop("documentElement")).insertAfter(this["dom"]);
//			this["dom"].remove();
//			
//			alert(rm.toXML(rdoc));
//			rm.preproccess(rdoc);
//			alert(rm.toXML(rdoc))
//			
//			rm.update(this["rdoc"], this["dom"].parent());
//			rm._postRendering(rdoc);
//		},
//		"context": {"rdoc": rdoc, "dom": dom},
//		"dataType": "xml"
//	});
//}
//rm._include_asyncPreproccess = function(rdoc) {
//	var data=[];
//	rdoc.find("include[src]").each(function(){
//		rm._include_registerUrl(rdoc, $(this), $(this).attr("src"));		
//	});
//	return rdoc;
//}
//rm.preproccessRegister(rm._include_asyncPreproccess);

//on path - don't work anymore.

rm._printonpath_do = function(text, paper, pathStr) {
	var p = paper.path(pathStr).attr({stroke: "none"});
	for ( var i = 0; i < text.length; i++) {		
		var letter = text[i];
//		if(letter.rmtype!="letter")
//			continue;
		var newP = p.getPointAtLength(letter.getBBox().x);
		var newTransformation = letter.transform()+
		 	"T"+(newP.x-letter.getBBox().x)+","+
	        (newP.y-letter.getBBox().y-letter.getBBox().height);
		
		//also rotate the letter to correspond the path angle of derivative
	    newTransformation+="R"+
	        (newP.alpha<360 ? 180+newP.alpha : newP.alpha);
	    alert(newTransformation);
	    letter.transform(newTransformation);
	}
	text._rm_topathPath=p;
};
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








})(); //end of main ninja mode