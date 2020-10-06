(function(root,factory){if(typeof exports==="object"&&exports){module.exports=factory}else if(typeof define==="function"&&define.amd){define(factory)}else{root.Mustache=factory}})(this,function(){var exports={};exports.name="mustache.js";exports.version="0.7.2";exports.tags=["{{","}}"];exports.Scanner=Scanner;exports.Context=Context;exports.Writer=Writer;var whiteRe=/\s*/;var spaceRe=/\s+/;var nonSpaceRe=/\S/;var eqRe=/\s*=/;var curlyRe=/\s*\}/;var tagRe=/#|\^|\/|>|\{|&|=|!/;function testRe(re,string){return RegExp.prototype.test.call(re,string)}function isWhitespace(string){return!testRe(nonSpaceRe,string)}var isArray=Array.isArray||function(obj){return Object.prototype.toString.call(obj)==="[object Array]"};function escapeRe(string){return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g,"\\$&")}var entityMap={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","/":"&#x2F;"};function escapeHtml(string){return String(string).replace(/[&<>"'\/]/g,function(s){return entityMap[s]})}exports.escape=escapeHtml;function Scanner(string){this.string=string;this.tail=string;this.pos=0}Scanner.prototype.eos=function(){return this.tail===""};Scanner.prototype.scan=function(re){var match=this.tail.match(re);if(match&&match.index===0){this.tail=this.tail.substring(match[0].length);this.pos+=match[0].length;return match[0]}return""};Scanner.prototype.scanUntil=function(re){var match,pos=this.tail.search(re);switch(pos){case-1:match=this.tail;this.pos+=this.tail.length;this.tail="";break;case 0:match="";break;default:match=this.tail.substring(0,pos);this.tail=this.tail.substring(pos);this.pos+=pos}return match};function Context(view,parent){this.view=view;this.parent=parent;this.clearCache()}Context.make=function(view){return view instanceof Context?view:new Context(view)};Context.prototype.clearCache=function(){this._cache={}};Context.prototype.push=function(view){return new Context(view,this)};Context.prototype.lookup=function(name){var value=this._cache[name];if(!value){if(name==="."){value=this.view}else{var context=this;while(context){if(name.indexOf(".")>0){var names=name.split("."),i=0;value=context.view;while(value&&i<names.length){value=value[names[i++]]}}else{value=context.view[name]}if(value!=null){break}context=context.parent}}this._cache[name]=value}if(typeof value==="function"){value=value.call(this.view)}return value};function Writer(){this.clearCache()}Writer.prototype.clearCache=function(){this._cache={};this._partialCache={}};Writer.prototype.compile=function(template,tags){var fn=this._cache[template];if(!fn){var tokens=exports.parse(template,tags);fn=this._cache[template]=this.compileTokens(tokens,template)}return fn};Writer.prototype.compilePartial=function(name,template,tags){var fn=this.compile(template,tags);this._partialCache[name]=fn;return fn};Writer.prototype.compileTokens=function(tokens,template){var fn=compileTokens(tokens);var self=this;return function(view,partials){if(partials){if(typeof partials==="function"){self._loadPartial=partials}else{for(var name in partials){self.compilePartial(name,partials[name])}}}return fn(self,Context.make(view),template)}};Writer.prototype.render=function(template,view,partials){return this.compile(template)(view,partials)};Writer.prototype._section=function(name,context,text,callback){var value=context.lookup(name);switch(typeof value){case"object":if(isArray(value)){var buffer="";for(var i=0,len=value.length;i<len;++i){buffer+=callback(this,context.push(value[i]))}return buffer}return value?callback(this,context.push(value)):"";case"function":var self=this;var scopedRender=function(template){return self.render(template,context)};var result=value.call(context.view,text,scopedRender);return result!=null?result:"";default:if(value){return callback(this,context)}}return""};Writer.prototype._inverted=function(name,context,callback){var value=context.lookup(name);if(!value||isArray(value)&&value.length===0){return callback(this,context)}return""};Writer.prototype._partial=function(name,context){if(!(name in this._partialCache)&&this._loadPartial){this.compilePartial(name,this._loadPartial(name))}var fn=this._partialCache[name];return fn?fn(context):""};Writer.prototype._name=function(name,context){var value=context.lookup(name);if(typeof value==="function"){value=value.call(context.view)}return value==null?"":String(value)};Writer.prototype._escaped=function(name,context){return exports.escape(this._name(name,context))};function compileTokens(tokens){var subRenders={};function subRender(i,tokens,template){if(!subRenders[i]){var fn=compileTokens(tokens);subRenders[i]=function(writer,context){return fn(writer,context,template)}}return subRenders[i]}return function(writer,context,template){var buffer="";var token,sectionText;for(var i=0,len=tokens.length;i<len;++i){token=tokens[i];switch(token[0]){case"#":sectionText=template.slice(token[3],token[5]);buffer+=writer._section(token[1],context,sectionText,subRender(i,token[4],template));break;case"^":buffer+=writer._inverted(token[1],context,subRender(i,token[4],template));break;case">":buffer+=writer._partial(token[1],context);break;case"&":buffer+=writer._name(token[1],context);break;case"name":buffer+=writer._escaped(token[1],context);break;case"text":buffer+=token[1];break}}return buffer}}function nestTokens(tokens){var tree=[];var collector=tree;var sections=[];var token;for(var i=0,len=tokens.length;i<len;++i){token=tokens[i];switch(token[0]){case"#":case"^":sections.push(token);collector.push(token);collector=token[4]=[];break;case"/":var section=sections.pop();section[5]=token[2];collector=sections.length>0?sections[sections.length-1][4]:tree;break;default:collector.push(token)}}return tree}function squashTokens(tokens){var squashedTokens=[];var token,lastToken;for(var i=0,len=tokens.length;i<len;++i){token=tokens[i];if(token[0]==="text"&&lastToken&&lastToken[0]==="text"){lastToken[1]+=token[1];lastToken[3]=token[3]}else{lastToken=token;squashedTokens.push(token)}}return squashedTokens}function escapeTags(tags){return[new RegExp(escapeRe(tags[0])+"\\s*"),new RegExp("\\s*"+escapeRe(tags[1]))]}exports.parse=function(template,tags){template=template||"";tags=tags||exports.tags;if(typeof tags==="string")tags=tags.split(spaceRe);if(tags.length!==2){throw new Error("Invalid tags: "+tags.join(", "))}var tagRes=escapeTags(tags);var scanner=new Scanner(template);var sections=[];var tokens=[];var spaces=[];var hasTag=false;var nonSpace=false;function stripSpace(){if(hasTag&&!nonSpace){while(spaces.length){tokens.splice(spaces.pop(),1)}}else{spaces=[]}hasTag=false;nonSpace=false}var start,type,value,chr;while(!scanner.eos()){start=scanner.pos;value=scanner.scanUntil(tagRes[0]);if(value){for(var i=0,len=value.length;i<len;++i){chr=value.charAt(i);if(isWhitespace(chr)){spaces.push(tokens.length)}else{nonSpace=true}tokens.push(["text",chr,start,start+1]);start+=1;if(chr==="\n"){stripSpace()}}}start=scanner.pos;if(!scanner.scan(tagRes[0])){break}hasTag=true;type=scanner.scan(tagRe)||"name";scanner.scan(whiteRe);if(type==="="){value=scanner.scanUntil(eqRe);scanner.scan(eqRe);scanner.scanUntil(tagRes[1])}else if(type==="{"){var closeRe=new RegExp("\\s*"+escapeRe("}"+tags[1]));value=scanner.scanUntil(closeRe);scanner.scan(curlyRe);scanner.scanUntil(tagRes[1]);type="&"}else{value=scanner.scanUntil(tagRes[1])}if(!scanner.scan(tagRes[1])){throw new Error("Unclosed tag at "+scanner.pos)}if(type==="/"){if(sections.length===0){throw new Error('Unopened section "'+value+'" at '+start)}var section=sections.pop();if(section[1]!==value){throw new Error('Unclosed section "'+section[1]+'" at '+start)}}var token=[type,value,start,scanner.pos];tokens.push(token);if(type==="#"||type==="^"){sections.push(token)}else if(type==="name"||type==="{"||type==="&"){nonSpace=true}else if(type==="="){tags=value.split(spaceRe);if(tags.length!==2){throw new Error("Invalid tags at "+start+": "+tags.join(", "))}tagRes=escapeTags(tags)}}var section=sections.pop();if(section){throw new Error('Unclosed section "'+section[1]+'" at '+scanner.pos)}return nestTokens(squashTokens(tokens))};var _writer=new Writer;exports.clearCache=function(){return _writer.clearCache()};exports.compile=function(template,tags){return _writer.compile(template,tags)};exports.compilePartial=function(name,template,tags){return _writer.compilePartial(name,template,tags)};exports.compileTokens=function(tokens,template){return _writer.compileTokens(tokens,template)};exports.render=function(template,view,partials){return _writer.render(template,view,partials)};exports.to_html=function(template,view,partials,send){var result=exports.render(template,view,partials);if(typeof send==="function"){send(result)}else{return result}};return exports}());