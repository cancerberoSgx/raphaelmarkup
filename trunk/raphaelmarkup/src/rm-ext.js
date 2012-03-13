


/* * * * preproccessING - default templating : 
 * 	<template and template-use tags * * * */

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
//			alert("Error parsin out xml code : " +out);
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
//	window.alert(fstr);
	var f =  new Function("obj",fstr);
	return f;
};

rm._tmplCache={};

rm.preproccessRegister("template1",rm._preproccess_template1);






/* * * * * EXTENSIONS - couls be in other files * * * */


/* * * * * percent bouds extension - 
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
 * discussion: what about paths? paths doesn't have cx, x or width attributes. 
 * we can only move/translate using transformations.
 * this extension could do the following:
 * 1) give usability to attributes "width" and "height" for paths
 * 2) all shapes including path percentual attribs will be fixed at preprocessing
 * 3) provide a render extension that will perform the following after a shape is rendered: 
 * get its calculated width/height/x and y attrs and perform translation/
 */
rm._percentDim = function(rdoc) {
	rdoc.find("paper").each(function(){
		var pw = parseInt($(this).attr("width")), 
			ph = parseInt($(this).attr("height"));
		var base = rm._percentDim_buildBase(pw, ph);
		$(this).children().each(function(){
			rm._percentDim_($(this), base);
		});
	});
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
		/* in the case of sets and paths we temporarily store base width and heights as
		 * parameters */
		dom.attr("_percentDimBaseWidth", base["width"]);
		dom.attr("_percentDimBaseHeight", base["height"]);
	}
	else {
		rm._percentDim_fixAttr(dom, "width", base);
	}
	
	//second, now that bouds attrs are fixed, get the next base
	var newWidth = base["width"], 
		newHeight = base["height"];
	
	if(rm._getTagName(dom)=="rect") {
		newWidth = parseInt(dom.attr("width"));
		newHeight = parseInt(dom.attr("height"));		
	}
	else if(rm._getTagName(dom)=="circle") {
		newWidth = parseInt(dom.attr("r"));
		newHeight = parseInt(dom.attr("r"));		
	}
	else if(rm._getTagName(dom)=="ellipse") {
		newWidth = parseInt(dom.attr("rx"));
		newHeight = parseInt(dom.attr("ry"));		
	}
	else if(rm._getTagName(dom)=="path") {
		newWidth = parseInt(dom.attr("rx"));
		newHeight = parseInt(dom.attr("ry"));		
	}
	var newBase = rm._percentDim_buildBase(newWidth, newWidth);
	$(this).children().each(function(){
		rm._percentDim_($(this), newBase);
	});
	
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
},
//register 
//rm.preproccessRegister("percent dimensions",rm._percentDim);


