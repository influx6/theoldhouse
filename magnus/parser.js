/*
* DOMParser HTML extension
* 2012-02-02
*
* By Eli Grey, http://eligrey.com
* Public domain.
* NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
*/
/*! @source https://gist.github.com/1129031 */
/*global document, DOMParser*/
(function (DOMParser) {
   "use strict";
   var DOMParser_proto = DOMParser.prototype;
   var real_parseFromString = DOMParser_proto.parseFromString;

   // Firefox/Opera/IE throw errors on unsupported types
   try {
       // WebKit returns null on unsupported types
       if ((new DOMParser).parseFromString("", "text/html")) {
           // text/html parsing is natively supported
           return;
       }
   } catch (ex) {}

   DOMParser_proto.parseFromString = function (markup, type) {
       if (/^\s*text\/html\s*(?:;|$)/i.test(type)) {
           var doc = document.implementation.createHTMLDocument("");
           var doc_elt = doc.documentElement;
           var first_elt;

           doc_elt.innerHTML = markup;
           first_elt = doc_elt.firstElementChild;

           if (doc_elt.childElementCount === 1 && first_elt.localName.toLowerCase() === "html") {
               doc.replaceChild(first_elt, doc_elt);
           }

           return doc;
       } else {
           return real_parseFromString.apply(this, arguments);
       }
   };
}(DOMParser));

    //  autostyle = function (str) {
    //      var boldPattern = /(?![^<]*<\/a>)(^|<.>|[\s\W_])\*(\S.*?\S)\*($|<\/.>|[\s\W_])/g;
    //      var italicsPattern = /(?![^<]*<\/a>)(^|<.>|[\s\W])_(\S.*?\S)_($|<\/.>|[\s\W])/g;
    //      var strikethroughPattern = /(?![^<]*<\/a>)(^|<.>|[\s\W_])-(\S.*?\S)-($|<\/.>|[\s\W_])/gi;
    //      var underlinePattern = /(?![^<]*<\/a>)(^|<.>|[\s\W_])!(\S.*?\S)!($|<\/.>|[\s\W_])/gi;
    //      str = str.replace(strikethroughPattern, '$1<s>$2</s>$3');
    //      str = str.replace(italicsPattern, '$1<i>$2</i>$3');
    //      str = str.replace(boldPattern, '$1<b>$2</b>$3');
    //      str = str.replace(underlinePattern, '$1<u>$2</u>$3');
    //      return str;
    //  };
     //
    //  emoticonRegexFunction = function(str) {
    //      //do something
    //      return str;
    //  }
