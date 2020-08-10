// Copyright (C) 2006 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


/**
 * @fileoverview
 * some functions for browser-side pretty printing of code contained in html.
 *
 * <p>
 * For a fairly comprehensive set of languages see the
 * <a href="http://google-code-prettify.googlecode.com/svn/trunk/README.html#langs">README</a>
 * file that came with this source.  At a minimum, the lexer should work on a
 * number of languages including C and friends, Java, Python, Bash, SQL, HTML,
 * XML, CSS, Javascript, and Makefiles.  It works passably on Ruby, PHP and Awk
 * and a subset of Perl, but, because of commenting conventions, doesn't work on
 * Smalltalk, Lisp-like, or CAML-like languages without an explicit lang class.
 * <p>
 * Usage: <ol>
 * <li> include this source file in an html page via
 *   {@code <script type="text/javascript" src="/path/to/prettify.js"></script>}
 * <li> define style rules.  See the example page for examples.
 * <li> mark the {@code <pre>} and {@code <code>} tags in your source with
 *    {@code class=prettyprint.}
 *    You can also use the (html deprecated) {@code <xmp>} tag, but the pretty
 *    printer needs to do more substantial DOM manipulations to support that, so
 *    some css styles may not be preserved.
 * </ol>
 * That's it.  I wanted to keep the API as simple as possible, so there's no
 * need to specify which language the code is in, but if you wish, you can add
 * another class to the {@code <pre>} or {@code <code>} element to specify the
 * language, as in {@code <pre class="prettyprint lang-java">}.  Any class that
 * starts with "lang-" followed by a file extension, specifies the file type.
 * See the "lang-*.js" files in this directory for code that implements
 * per-language file handlers.
 * <p>
 * Change log:<br>
 * cbeust, 2006/08/22
 * <blockquote>
 *   Java annotations (start with "@") are now captured as literals ("lit")
 * </blockquote>
 * @requires console
 */

// JSLint declarations
/*global console, document, navigator, setTimeout, window, define */

/** @define {boolean} */

var IN_GLOBAL_SCOPE = true;

/**
 * Split {@code prettyPrint} into multiple timeouts so as not to interfere with
 * UI events.
 * If set to {@code false}, {@code prettyPrint()} is synchronous.
 */
window['PR_SHOULD_USE_CONTINUATION'] = true;

/**
 * Pretty print a chunk of code.
 * @param {string} sourceCodeHtml The HTML to pretty print.
 * @param {string} opt_langExtension The language name to use.
 *     Typically, a filename extension like 'cpp' or 'java'.
 * @param {number|boolean} opt_numberLines True to number lines,
 *     or the 1-indexed number of the first line in sourceCodeHtml.
 * @return {string} code as html, but prettier
 */
var prettyPrintOne;
/**
 * Find all the {@code <pre>} and {@code <code>} tags in the DOM with
 * {@code class=prettyprint} and prettify them.
 *
 * @param {Function} opt_whenDone called when prettifying is done.
 * @param {HTMLElement|HTMLDocument} opt_root an element or document
 *   containing all the elements to pretty print.
 *   Defaults to {@code document.body}.
 */
var prettyPrint;


(function () {
  var win = window;
  // Keyword lists for various languages.
  // We use things that coerce to strings to make them compact when minified
  // and to defeat aggressive optimizers that fold large string constants.
  var FLOW_CONTROL_KEYWORDS = ["break,continue,do,else,for,if,return,while"];
  var C_KEYWORDS = [FLOW_CONTROL_KEYWORDS, "auto,case,char,const,default," +
      "double,enum,extern,float,goto,inline,int,long,register,short,signed," +
      "sizeof,static,struct,switch,typedef,union,unsigned,void,volatile"];
  var COMMON_KEYWORDS = [C_KEYWORDS, "catch,class,delete,false,import," +
      "new,operator,private,protected,public,this,throw,true,try,typeof"];
  var CPP_KEYWORDS = [COMMON_KEYWORDS, "alignof,align_union,asm,axiom,bool," +
      "concept,concept_map,const_cast,constexpr,decltype,delegate," +
      "dynamic_cast,explicit,export,friend,generic,late_check," +
      "mutable,namespace,nullptr,property,reinterpret_cast,static_assert," +
      "static_cast,template,typeid,typename,using,virtual,where"];
  var JAVA_KEYWORDS = [COMMON_KEYWORDS,
      "abstract,assert,boolean,byte,extends,final,finally,implements,import," +
      "instanceof,interface,null,native,package,strictfp,super,synchronized," +
      "throws,transient"];
  var CSHARP_KEYWORDS = [JAVA_KEYWORDS,
      "as,base,by,checked,decimal,delegate,descending,dynamic,event," +
      "fixed,foreach,from,group,implicit,in,internal,into,is,let," +
      "lock,object,out,override,orderby,params,partial,readonly,ref,sbyte," +
      "sealed,stackalloc,string,select,uint,ulong,unchecked,unsafe,ushort," +
      "var,virtual,where"];
  var COFFEE_KEYWORDS = "all,and,by,catch,class,else,extends,false,finally," +
      "for,if,in,is,isnt,loop,new,no,not,null,of,off,on,or,return,super,then," +
      "throw,true,try,unless,until,when,while,yes";
  var JSCRIPT_KEYWORDS = [COMMON_KEYWORDS,
      "debugger,eval,export,function,get,null,set,undefined,var,with," +
      "Infinity,NaN"];
  var PERL_KEYWORDS = "caller,delete,die,do,dump,elsif,eval,exit,foreach,for," +
      "goto,if,import,last,local,my,next,no,our,print,package,redo,require," +
      "sub,undef,unless,until,use,wantarray,while,BEGIN,END";
  var PYTHON_KEYWORDS = [FLOW_CONTROL_KEYWORDS, "and,as,assert,class,def,del," +
      "elif,except,exec,finally,from,global,import,in,is,lambda," +
      "nonlocal,not,or,pass,print,raise,try,with,yield," +
      "False,True,None"];
  var RUBY_KEYWORDS = [FLOW_CONTROL_KEYWORDS, "alias,and,begin,case,class," +
      "def,defined,elsif,end,ensure,false,in,module,next,nil,not,or,redo," +
      "rescue,retry,self,super,then,true,undef,unless,until,when,yield," +
      "BEGIN,END"];
  var RUST_KEYWORDS = [FLOW_CONTROL_KEYWORDS, "as,assert,const,copy,drop," +
     "enum,extern,fail,false,fn,impl,let,log,loop,match,mod,move,mut,priv," +
     "pub,pure,ref,self,static,struct,true,trait,type,unsafe,use"];
  var SH_KEYWORDS = [FLOW_CONTROL_KEYWORDS, "case,done,elif,esac,eval,fi," +
      "function,in,local,set,then,until"];
  var ALL_KEYWORDS = [
      CPP_KEYWORDS, CSHARP_KEYWORDS, JSCRIPT_KEYWORDS, PERL_KEYWORDS,
      PYTHON_KEYWORDS, RUBY_KEYWORDS, SH_KEYWORDS];
  var C_TYPES = /^(DIR|FILE|vector|(de|priority_)?queue|list|stack|(const_)?iterator|(multi)?(set|map)|bitset|u?(int|float)\d*)\b/;

  // token style names.  correspond to css classes
  /**
   * token style for a string literal
   * @const
   */
  var PR_STRING = 'str';
  /**
   * token style for a keyword
   * @const
   */
  var PR_KEYWORD = 'kwd';
  /**
   * token style for a comment
   * @const
   */
  var PR_COMMENT = 'com';
  /**
   * token style for a type
   * @const
   */
  var PR_TYPE = 'typ';
  /**
   * token style for a literal value.  e.g. 1, null, true.
   * @const
   */
  var PR_LITERAL = 'lit';
  /**
   * token style for a punctuation string.
   * @const
   */
  var PR_PUNCTUATION = 'pun';
  /**
   * token style for plain text.
   * @const
   */
  var PR_PLAIN = 'pln';

  /**
   * token style for an sgml tag.
   * @const
   */
  var PR_TAG = 'tag';
  /**
   * token style for a markup declaration such as a DOCTYPE.
   * @const
   */
  var PR_DECLARATION = 'dec';
  /**
   * token style for embedded source.
   * @const
   */
  var PR_SOURCE = 'src';
  /**
   * token style for an sgml attribute name.
   * @const
   */
  var PR_ATTRIB_NAME = 'atn';
  /**
   * token style for an sgml attribute value.
   * @const
   */
  var PR_ATTRIB_VALUE = 'atv';

  /**
   * A class that indicates a section of markup that is not code, e.g. to allow
   * embedding of line numbers within code listings.
   * @const
   */
  var PR_NOCODE = 'nocode';



  /**
   * A set of tokens that can precede a regular expression literal in
   * javascript
   * http://web.archive.org/web/20070717142515/http://www.mozilla.org/js/language/js20/rationale/syntax.html
   * has the full list, but I've removed ones that might be problematic when
   * seen in languages that don't support regular expression literals.
   *
   * <p>Specifically, I've removed any keywords that can't precede a regexp
   * literal in a syntactically legal javascript program, and I've removed the
   * "in" keyword since it's not a keyword in many languages, and might be used
   * as a count of inches.
   *
   * <p>The link above does not accurately describe EcmaScript rules since
   * it fails to distinguish between (a=++/b/i) and (a++/b/i) but it works
   * very well in practice.
   *
   * @private
   * @const
   */
  var REGEXP_PRECEDER_PATTERN = '(?:^^\\.?|[+-]|[!=]=?=?|\\#|%=?|&&?=?|\\(|\\*=?|[+\\-]=|->|\\/=?|::?|<<?=?|>>?>?=?|,|;|\\?|@|\\[|~|{|\\^\\^?=?|\\|\\|?=?|break|case|continue|delete|do|else|finally|instanceof|return|throw|try|typeof)\\s*';

  // CAVEAT: this does not properly handle the case where a regular
  // expression immediately follows another since a regular expression may
  // have flags for case-sensitivity and the like.  Having regexp tokens
  // adjacent is not valid in any language I'm aware of, so I'm punting.
  // TODO: maybe style special characters inside a regexp as punctuation.

  /**
   * Given a group of {@link RegExp}s, returns a {@code RegExp} that globally
   * matches the union of the sets of strings matched by the input RegExp.
   * Since it matches globally, if the input strings have a start-of-input
   * anchor (/^.../), it is ignored for the purposes of unioning.
   * @param {Array.<RegExp>} regexs non multiline, non-global regexs.
   * @return {RegExp} a global regex.
   */
  function combinePrefixPatterns(regexs) {
    var capturedGroupIndex = 0;

    var needToFoldCase = false;
    var ignoreCase = false;
    for (var i = 0, n = regexs.length; i < n; ++i) {
      var regex = regexs[i];
      if (regex.ignoreCase) {
        ignoreCase = true;
      } else if (/[a-z]/i.test(regex.source.replace(
                     /\\u[0-9a-f]{4}|\\x[0-9a-f]{2}|\\[^ux]/gi, ''))) {
        needToFoldCase = true;
        ignoreCase = false;
        break;
      }
    }

    var escapeCharToCodeUnit = {
      'b': 8,
      't': 9,
      'n': 0xa,
      'v': 0xb,
      'f': 0xc,
      'r': 0xd
    };

    function decodeEscape(charsetPart) {
      var cc0 = charsetPart.charCodeAt(0);
      if (cc0 !== 92 /* \\ */) {
        return cc0;
      }
      var c1 = charsetPart.charAt(1);
      cc0 = escapeCharToCodeUnit[c1];
      if (cc0) {
        return cc0;
      } else if ('0' <= c1 && c1 <= '7') {
        return parseInt(charsetPart.substring(1), 8);
      } else if (c1 === 'u' || c1 === 'x') {
        return parseInt(charsetPart.substring(2), 16);
      } else {
        return charsetPart.charCodeAt(1);
      }
    }

    function encodeEscape(charCode) {
      if (charCode < 0x20) {
        return (charCode < 0x10 ? '\\x0' : '\\x') + charCode.toString(16);
      }
      var ch = String.fromCharCode(charCode);
      return (ch === '\\' || ch === '-' || ch === ']' || ch === '^')
          ? "\\" + ch : ch;
    }

    function caseFoldCharset(charSet) {
      var charsetParts = charSet.substring(1, charSet.length - 1).match(
          new RegExp(
              '\\\\u[0-9A-Fa-f]{4}'
              + '|\\\\x[0-9A-Fa-f]{2}'
              + '|\\\\[0-3][0-7]{0,2}'
              + '|\\\\[0-7]{1,2}'
              + '|\\\\[\\s\\S]'
              + '|-'
              + '|[^-\\\\]',
              'g'));
      var ranges = [];
      var inverse = charsetParts[0] === '^';

      var out = ['['];
      if (inverse) { out.push('^'); }

      for (var i = inverse ? 1 : 0, n = charsetParts.length; i < n; ++i) {
        var p = charsetParts[i];
        if (/\\[bdsw]/i.test(p)) {  // Don't muck with named groups.
          out.push(p);
        } else {
          var start = decodeEscape(p);
          var end;
          if (i + 2 < n && '-' === charsetParts[i + 1]) {
            end = decodeEscape(charsetParts[i + 2]);
            i += 2;
          } else {
            end = start;
          }
          ranges.push([start, end]);
          // If the range might intersect letters, then expand it.
          // This case handling is too simplistic.
          // It does not deal with non-latin case folding.
          // It works for latin source code identifiers though.
          if (!(end < 65 || start > 122)) {
            if (!(end < 65 || start > 90)) {
              ranges.push([Math.max(65, start) | 32, Math.min(end, 90) | 32]);
            }
            if (!(end < 97 || start > 122)) {
              ranges.push([Math.max(97, start) & ~32, Math.min(end, 122) & ~32]);
            }
          }
        }
      }

      // [[1, 10], [3, 4], [8, 12], [14, 14], [16, 16], [17, 17]]
      // -> [[1, 12], [14, 14], [16, 17]]
      ranges.sort(function (a, b) { return (a[0] - b[0]) || (b[1] - a[1]); });
      var consolidatedRanges = [];
      var lastRange = [];
      for (var i = 0; i < ranges.length; ++i) {
        var range = ranges[i];
        if (range[0] <= lastRange[1] + 1) {
          lastRange[1] = Math.max(lastRange[1], range[1]);
        } else {
          consolidatedRanges.push(lastRange = range);
        }
      }

      for (var i = 0; i < consolidatedRanges.length; ++i) {
        var range = consolidatedRanges[i];
        out.push(encodeEscape(range[0]));
        if (range[1] > range[0]) {
          if (range[1] + 1 > range[0]) { out.push('-'); }
          out.push(encodeEscape(range[1]));
        }
      }
      out.push(']');
      return out.join('');
    }

    function allowAnywhereFoldCaseAndRenumberGroups(regex) {
      // Split into character sets, escape sequences, punctuation strings
      // like ('(', '(?:', ')', '^'), and runs of characters that do not
      // include any of the above.
      var parts = regex.source.match(
          new RegExp(
              '(?:'
              + '\\[(?:[^\\x5C\\x5D]|\\\\[\\s\\S])*\\]'  // a character set
              + '|\\\\u[A-Fa-f0-9]{4}'  // a unicode escape
              + '|\\\\x[A-Fa-f0-9]{2}'  // a hex escape
              + '|\\\\[0-9]+'  // a back-reference or octal escape
              + '|\\\\[^ux0-9]'  // other escape sequence
              + '|\\(\\?[:!=]'  // start of a non-capturing group
              + '|[\\(\\)\\^]'  // start/end of a group, or line start
              + '|[^\\x5B\\x5C\\(\\)\\^]+'  // run of other characters
              + ')',
              'g'));
      var n = parts.length;

      // Maps captured group numbers to the number they will occupy in
      // the output or to -1 if that has not been determined, or to
      // undefined if they need not be capturing in the output.
      var capturedGroups = [];

      // Walk over and identify back references to build the capturedGroups
      // mapping.
      for (var i = 0, groupIndex = 0; i < n; ++i) {
        var p = parts[i];
        if (p === '(') {
          // groups are 1-indexed, so max group index is count of '('
          ++groupIndex;
        } else if ('\\' === p.charAt(0)) {
          var decimalValue = +p.substring(1);
          if (decimalValue) {
            if (decimalValue <= groupIndex) {
              capturedGroups[decimalValue] = -1;
            } else {
              // Replace with an unambiguous escape sequence so that
              // an octal escape sequence does not turn into a backreference
              // to a capturing group from an earlier regex.
              parts[i] = encodeEscape(decimalValue);
            }
          }
        }
      }

      // Renumber groups and reduce capturing groups to non-capturing groups
      // where possible.
      for (var i = 1; i < capturedGroups.length; ++i) {
        if (-1 === capturedGroups[i]) {
          capturedGroups[i] = ++capturedGroupIndex;
        }
      }
      for (var i = 0, groupIndex = 0; i < n; ++i) {
        var p = parts[i];
        if (p === '(') {
          ++groupIndex;
          if (!capturedGroups[groupIndex]) {
            parts[i] = '(?:';
          }
        } else if ('\\' === p.charAt(0)) {
          var decimalValue = +p.substring(1);
          if (decimalValue && decimalValue <= groupIndex) {
            parts[i] = '\\' + capturedGroups[decimalValue];
          }
        }
      }

      // Remove any prefix anchors so that the output will match anywhere.
      // ^^ really does mean an anchored match though.
      for (var i = 0; i < n; ++i) {
        if ('^' === parts[i] && '^' !== parts[i + 1]) { parts[i] = ''; }
      }

      // Expand letters to groups to handle mixing of case-sensitive and
      // case-insensitive patterns if necessary.
      if (regex.ignoreCase && needToFoldCase) {
        for (var i = 0; i < n; ++i) {
          var p = parts[i];
          var ch0 = p.charAt(0);
          if (p.length >= 2 && ch0 === '[') {
            parts[i] = caseFoldCharset(p);
          } else if (ch0 !== '\\') {
            // TODO: handle letters in numeric escapes.
            parts[i] = p.replace(
                /[a-zA-Z]/g,
                function (ch) {
                  var cc = ch.charCodeAt(0);
                  return '[' + String.fromCharCode(cc & ~32, cc | 32) + ']';
                });
          }
        }
      }

      return parts.join('');
    }

    var rewritten = [];
    for (var i = 0, n = regexs.length; i < n; ++i) {
      var regex = regexs[i];
      if (regex.global || regex.multiline) { throw new Error('' + regex); }
      rewritten.push(
          '(?:' + allowAnywhereFoldCaseAndRenumberGroups(regex) + ')');
    }

    return new RegExp(rewritten.join('|'), ignoreCase ? 'gi' : 'g');
  }

  /**
   * Split markup into a string of source code and an array mapping ranges in
   * that string to the text nodes in which they appear.
   *
   * <p>
   * The HTML DOM structure:</p>
   * <pre>
   * (Element   "p"
   *   (Element "b"
   *     (Text  "print "))       ; #1
   *   (Text    "'Hello '")      ; #2
   *   (Element "br")            ; #3
   *   (Text    "  + 'World';")) ; #4
   * </pre>
   * <p>
   * corresponds to the HTML
   * {@code <p><b>print </b>'Hello '<br>  + 'World';</p>}.</p>
   *
   * <p>
   * It will produce the output:</p>
   * <pre>
   * {
   *   sourceCode: "print 'Hello '\n  + 'World';",
   *   //                     1          2
   *   //           012345678901234 5678901234567
   *   spans: [0, #1, 6, #2, 14, #3, 15, #4]
   * }
   * </pre>
   * <p>
   * where #1 is a reference to the {@code "print "} text node above, and so
   * on for the other text nodes.
   * </p>
   *
   * <p>
   * The {@code} spans array is an array of pairs.  Even elements are the start
   * indices of substrings, and odd elements are the text nodes (or BR elements)
   * that contain the text for those substrings.
   * Substrings continue until the next index or the end of the source.
   * </p>
   *
   * @param {Node} node an HTML DOM subtree containing source-code.
   * @param {boolean} isPreformatted true if white-space in text nodes should
   *    be considered significant.
   * @return {Object} source code and the text nodes in which they occur.
   */
  function extractSourceSpans(node, isPreformatted) {
    var nocode = /(?:^|\s)nocode(?:\s|$)/;

    var chunks = [];
    var length = 0;
    var spans = [];
    var k = 0;

    function walk(node) {
      var type = node.nodeType;
      if (type == 1) {  // Element
        if (nocode.test(node.className)) { return; }
        for (var child = node.firstChild; child; child = child.nextSibling) {
          walk(child);
        }
        var nodeName = node.nodeName.toLowerCase();
        if ('br' === nodeName || 'li' === nodeName) {
          chunks[k] = '\n';
          spans[k << 1] = length++;
          spans[(k++ << 1) | 1] = node;
        }
      } else if (type == 3 || type == 4) {  // Text
        var text = node.nodeValue;
        if (text.length) {
          if (!isPreformatted) {
            text = text.replace(/[ \t\r\n]+/g, ' ');
          } else {
            text = text.replace(/\r\n?/g, '\n');  // Normalize newlines.
          }
          // TODO: handle tabs here?
          chunks[k] = text;
          spans[k << 1] = length;
          length += text.length;
          spans[(k++ << 1) | 1] = node;
        }
      }
    }

    walk(node);

    return {
      sourceCode: chunks.join('').replace(/\n$/, ''),
      spans: spans
    };
  }

  /**
   * Apply the given language handler to sourceCode and add the resulting
   * decorations to out.
   * @param {number} basePos the index of sourceCode within the chunk of source
   *    whose decorations are already present on out.
   */
  function appendDecorations(basePos, sourceCode, langHandler, out) {
    if (!sourceCode) { return; }
    var job = {
      sourceCode: sourceCode,
      basePos: basePos
    };
    langHandler(job);
    out.push.apply(out, job.decorations);
  }

  var notWs = /\S/;

  /**
   * Given an element, if it contains only one child element and any text nodes
   * it contains contain only space characters, return the sole child element.
   * Otherwise returns undefined.
   * <p>
   * This is meant to return the CODE element in {@code <pre><code ...>} when
   * there is a single child element that contains all the non-space textual
   * content, but not to return anything where there are multiple child elements
   * as in {@code <pre><code>...</code><code>...</code></pre>} or when there
   * is textual content.
   */
  function childContentWrapper(element) {
    var wrapper = undefined;
    for (var c = element.firstChild; c; c = c.nextSibling) {
      var type = c.nodeType;
      wrapper = (type === 1)  // Element Node
          ? (wrapper ? element : c)
          : (type === 3)  // Text Node
          ? (notWs.test(c.nodeValue) ? element : wrapper)
          : wrapper;
    }
    return wrapper === element ? undefined : wrapper;
  }

  /** Given triples of [style, pattern, context] returns a lexing function,
    * The lexing function interprets the patterns to find token boundaries and
    * returns a decoration list of the form
    * [index_0, style_0, index_1, style_1, ..., index_n, style_n]
    * where index_n is an index into the sourceCode, and style_n is a style
    * constant like PR_PLAIN.  index_n-1 <= index_n, and style_n-1 applies to
    * all characters in sourceCode[index_n-1:index_n].
    *
    * The stylePatterns is a list whose elements have the form
    * [style : string, pattern : RegExp, DEPRECATED, shortcut : string].
    *
    * Style is a style constant like PR_PLAIN, or can be a string of the
    * form 'lang-FOO', where FOO is a language extension describing the
    * language of the portion of the token in $1 after pattern executes.
    * E.g., if style is 'lang-lisp', and group 1 contains the text
    * '(hello (world))', then that portion of the token will be passed to the
    * registered lisp handler for formatting.
    * The text before and after group 1 will be restyled using this decorator
    * so decorators should take care that this doesn't result in infinite
    * recursion.  For example, the HTML lexer rule for SCRIPT elements looks
    * something like ['lang-js', /<[s]cript>(.+?)<\/script>/].  This may match
    * '<script>foo()<\/script>', which would cause the current decorator to
    * be called with '<script>' which would not match the same rule since
    * group 1 must not be empty, so it would be instead styled as PR_TAG by
    * the generic tag rule.  The handler registered for the 'js' extension would
    * then be called with 'foo()', and finally, the current decorator would
    * be called with '<\/script>' which would not match the original rule and
    * so the generic tag rule would identify it as a tag.
    *
    * Pattern must only match prefixes, and if it matches a prefix, then that
    * match is considered a token with the same style.
    *
    * Context is applied to the last non-whitespace, non-comment token
    * recognized.
    *
    * Shortcut is an optional string of characters, any of which, if the first
    * character, gurantee that this pattern and only this pattern matches.
    *
    * @param {Array} shortcutStylePatterns patterns that always start with
    *   a known character.  Must have a shortcut string.
    * @param {Array} fallthroughStylePatterns patterns that will be tried in
    *   order if the shortcut ones fail.  May have shortcuts.
    *
    * @return {function (Object)} a
    *   function that takes source code and returns a list of decorations.
    */
  function createSimpleLexer(shortcutStylePatterns, fallthroughStylePatterns) {
    var shortcuts = {};
    var tokenizer;
    (function () {
      var allPatterns = shortcutStylePatterns.concat(fallthroughStylePatterns);
      var allRegexs = [];
      var regexKeys = {};
      for (var i = 0, n = allPatterns.length; i < n; ++i) {
        var patternParts = allPatterns[i];
        var shortcutChars = patternParts[3];
        if (shortcutChars) {
          for (var c = shortcutChars.length; --c >= 0;) {
            shortcuts[shortcutChars.charAt(c)] = patternParts;
          }
        }
        var regex = patternParts[1];
        var k = '' + regex;
        if (!regexKeys.hasOwnProperty(k)) {
          allRegexs.push(regex);
          regexKeys[k] = null;
        }
      }
      allRegexs.push(/[\0-\uffff]/);
      tokenizer = combinePrefixPatterns(allRegexs);
    })();

    var nPatterns = fallthroughStylePatterns.length;

    /**
     * Lexes job.sourceCode and produces an output array job.decorations of
     * style classes preceded by the position at which they start in
     * job.sourceCode in order.
     *
     * @param {Object} job an object like <pre>{
     *    sourceCode: {string} sourceText plain text,
     *    basePos: {int} position of job.sourceCode in the larger chunk of
     *        sourceCode.
     * }</pre>
     */
    var decorate = function (job) {
      var sourceCode = job.sourceCode, basePos = job.basePos;
      /** Even entries are positions in source in ascending order.  Odd enties
        * are style markers (e.g., PR_COMMENT) that run from that position until
        * the end.
        * @type {Array.<number|string>}
        */
      var decorations = [basePos, PR_PLAIN];
      var pos = 0;  // index into sourceCode
      var tokens = sourceCode.match(tokenizer) || [];
      var styleCache = {};

      for (var ti = 0, nTokens = tokens.length; ti < nTokens; ++ti) {
        var token = tokens[ti];
        var style = styleCache[token];
        var match = void 0;

        var isEmbedded;
        if (typeof style === 'string') {
          isEmbedded = false;
        } else {
          var patternParts = shortcuts[token.charAt(0)];
          if (patternParts) {
            match = token.match(patternParts[1]);
            style = patternParts[0];
          } else {
            for (var i = 0; i < nPatterns; ++i) {
              patternParts = fallthroughStylePatterns[i];
              match = token.match(patternParts[1]);
              if (match) {
                style = patternParts[0];
                break;
              }
            }

            if (!match) {  // make sure that we make progress
              style = PR_PLAIN;
            }
          }

          isEmbedded = style.length >= 5 && 'lang-' === style.substring(0, 5);
          if (isEmbedded && !(match && typeof match[1] === 'string')) {
            isEmbedded = false;
            style = PR_SOURCE;
          }

          if (!isEmbedded) { styleCache[token] = style; }
        }

        var tokenStart = pos;
        pos += token.length;

        if (!isEmbedded) {
          decorations.push(basePos + tokenStart, style);
        } else {  // Treat group 1 as an embedded block of source code.
          var embeddedSource = match[1];
          var embeddedSourceStart = token.indexOf(embeddedSource);
          var embeddedSourceEnd = embeddedSourceStart + embeddedSource.length;
          if (match[2]) {
            // If embeddedSource can be blank, then it would match at the
            // beginning which would cause us to infinitely recurse on the
            // entire token, so we catch the right context in match[2].
            embeddedSourceEnd = token.length - match[2].length;
            embeddedSourceStart = embeddedSourceEnd - embeddedSource.length;
          }
          var lang = style.substring(5);
          // Decorate the left of the embedded source
          appendDecorations(
              basePos + tokenStart,
              token.substring(0, embeddedSourceStart),
              decorate, decorations);
          // Decorate the embedded source
          appendDecorations(
              basePos + tokenStart + embeddedSourceStart,
              embeddedSource,
              langHandlerForExtension(lang, embeddedSource),
              decorations);
          // Decorate the right of the embedded section
          appendDecorations(
              basePos + tokenStart + embeddedSourceEnd,
              token.substring(embeddedSourceEnd),
              decorate, decorations);
        }
      }
      job.decorations = decorations;
    };
    return decorate;
  }

  /** returns a function that produces a list of decorations from source text.
    *
    * This code treats ", ', and ` as string delimiters, and \ as a string
    * escape.  It does not recognize perl's qq() style strings.
    * It has no special handling for double delimiter escapes as in basic, or
    * the tripled delimiters used in python, but should work on those regardless
    * although in those cases a single string literal may be broken up into
    * multiple adjacent string literals.
    *
    * It recognizes C, C++, and shell style comments.
    *
    * @param {Object} options a set of optional parameters.
    * @return {function (Object)} a function that examines the source code
    *     in the input job and builds the decoration list.
    */
  function sourceDecorator(options) {
    var shortcutStylePatterns = [], fallthroughStylePatterns = [];
    if (options['tripleQuotedStrings']) {
      // '''multi-line-string''', 'single-line-string', and double-quoted
      shortcutStylePatterns.push(
          [PR_STRING, /^(?:\'\'\'(?:[^\'\\]|\\[\s\S]|\'{1,2}(?=[^\']))*(?:\'\'\'|$)|\"\"\"(?:[^\"\\]|\\[\s\S]|\"{1,2}(?=[^\"]))*(?:\"\"\"|$)|\'(?:[^\\\']|\\[\s\S])*(?:\'|$)|\"(?:[^\\\"]|\\[\s\S])*(?:\"|$))/,
           null, '\'"']);
    } else if (options['multiLineStrings']) {
      // 'multi-line-string', "multi-line-string"
      shortcutStylePatterns.push(
          [PR_STRING, /^(?:\'(?:[^\\\']|\\[\s\S])*(?:\'|$)|\"(?:[^\\\"]|\\[\s\S])*(?:\"|$)|\`(?:[^\\\`]|\\[\s\S])*(?:\`|$))/,
           null, '\'"`']);
    } else {
      // 'single-line-string', "single-line-string"
      shortcutStylePatterns.push(
          [PR_STRING,
           /^(?:\'(?:[^\\\'\r\n]|\\.)*(?:\'|$)|\"(?:[^\\\"\r\n]|\\.)*(?:\"|$))/,
           null, '"\'']);
    }
    if (options['verbatimStrings']) {
      // verbatim-string-literal production from the C# grammar.  See issue 93.
      fallthroughStylePatterns.push(
          [PR_STRING, /^@\"(?:[^\"]|\"\")*(?:\"|$)/, null]);
    }
    var hc = options['hashComments'];
    if (hc) {
      if (options['cStyleComments']) {
        if (hc > 1) {  // multiline hash comments
          shortcutStylePatterns.push(
              [PR_COMMENT, /^#(?:##(?:[^#]|#(?!##))*(?:###|$)|.*)/, null, '#']);
        } else {
          // Stop C preprocessor declarations at an unclosed open comment
          shortcutStylePatterns.push(
              [PR_COMMENT, /^#(?:(?:define|e(?:l|nd)if|else|error|ifn?def|include|line|pragma|undef|warning)\b|[^\r\n]*)/,
               null, '#']);
        }
        // #include <stdio.h>
        fallthroughStylePatterns.push(
            [PR_STRING,
             /^<(?:(?:(?:\.\.\/)*|\/?)(?:[\w-]+(?:\/[\w-]+)+)?[\w-]+\.h(?:h|pp|\+\+)?|[a-z]\w*)>/,
             null]);
      } else {
        shortcutStylePatterns.push([PR_COMMENT, /^#[^\r\n]*/, null, '#']);
      }
    }
    if (options['cStyleComments']) {
      fallthroughStylePatterns.push([PR_COMMENT, /^\/\/[^\r\n]*/, null]);
      fallthroughStylePatterns.push(
          [PR_COMMENT, /^\/\*[\s\S]*?(?:\*\/|$)/, null]);
    }
    var regexLiterals = options['regexLiterals'];
    if (regexLiterals) {
      /**
       * @const
       */
      var regexExcls = regexLiterals > 1
        ? ''  // Multiline regex literals
        : '\n\r';
      /**
       * @const
       */
      var regexAny = regexExcls ? '.' : '[\\S\\s]';
      /**
       * @const
       */
      var REGEX_LITERAL = (
          // A regular expression literal starts with a slash that is
          // not followed by * or / so that it is not confused with
          // comments.
          '/(?=[^/*' + regexExcls + '])'
          // and then contains any number of raw characters,
          + '(?:[^/\\x5B\\x5C' + regexExcls + ']'
          // escape sequences (\x5C),
          + '|\\x5C' + regexAny
          // or non-nesting character sets (\x5B\x5D);
          + '|\\x5B(?:[^\\x5C\\x5D' + regexExcls + ']'
          + '|\\x5C' + regexAny + ')*(?:\\x5D|$))+'
          // finally closed by a /.
          + '/');
      fallthroughStylePatterns.push(
          ['lang-regex',
           RegExp('^' + REGEXP_PRECEDER_PATTERN + '(' + REGEX_LITERAL + ')')
          ]);
    }

    var types = options['types'];
    if (types) {
      fallthroughStylePatterns.push([PR_TYPE, types]);
    }

    var keywords = ("" + options['keywords']).replace(/^ | $/g, '');
    if (keywords.length) {
      fallthroughStylePatterns.push(
          [PR_KEYWORD,
           new RegExp('^(?:' + keywords.replace(/[\s,]+/g, '|') + ')\\b'),
           null]);
    }

    shortcutStylePatterns.push([PR_PLAIN, /^\s+/, null, ' \r\n\t\xA0']);

    var punctuation =
      // The Bash man page says

      // A word is a sequence of characters considered as a single
      // unit by GRUB. Words are separated by metacharacters,
      // which are the following plus space, tab, and newline: { }
      // | & $ ; < >
      // ...

      // A word beginning with # causes that word and all remaining
      // characters on that line to be ignored.

      // which means that only a '#' after /(?:^|[{}|&$;<>\s])/ starts a
      // comment but empirically
      // $ echo {#}
      // {#}
      // $ echo \$#
      // $#
      // $ echo }#
      // }#

      // so /(?:^|[|&;<>\s])/ is more appropriate.

      // http://gcc.gnu.org/onlinedocs/gcc-2.95.3/cpp_1.html#SEC3
      // suggests that this definition is compatible with a
      // default mode that tries to use a single token definition
      // to recognize both bash/python style comments and C
      // preprocessor directives.

      // This definition of punctuation does not include # in the list of
      // follow-on exclusions, so # will not be broken before if preceeded
      // by a punctuation character.  We could try to exclude # after
      // [|&;<>] but that doesn't seem to cause many major problems.
      // If that does turn out to be a problem, we should change the below
      // when hc is truthy to include # in the run of punctuation characters
      // only when not followint [|&;<>].
      '^.[^\\s\\w.$@\'"`/\\\\]*';
    if (options['regexLiterals']) {
      punctuation += '(?!\s*\/)';
    }

    fallthroughStylePatterns.push(
        // TODO(mikesamuel): recognize non-latin letters and numerals in idents
        [PR_LITERAL, /^@[a-z_$][a-z_$@0-9]*/i, null],
        [PR_TYPE, /^(?:[@_]?[A-Z]+[a-z][A-Za-z_$@0-9]*|\w+_t\b)/, null],
        [PR_PLAIN, /^[a-z_$][a-z_$@0-9]*/i, null],
        [PR_LITERAL,
         new RegExp(
             '^(?:'
             // A hex number
             + '0x[a-f0-9]+'
             // or an octal or decimal number,
             + '|(?:\\d(?:_\\d+)*\\d*(?:\\.\\d*)?|\\.\\d\\+)'
             // possibly in scientific notation
             + '(?:e[+\\-]?\\d+)?'
             + ')'
             // with an optional modifier like UL for unsigned long
             + '[a-z]*', 'i'),
         null, '0123456789'],
        // Don't treat escaped quotes in bash as starting strings.
        // See issue 144.
        [PR_PLAIN, /^\\[\s\S]?/, null],
        [PR_PUNCTUATION, new RegExp(punctuation), null]);

    return createSimpleLexer(shortcutStylePatterns, fallthroughStylePatterns);
  }

  var decorateSource = sourceDecorator({
    'keywords': ALL_KEYWORDS,
    'hashComments': true,
    'cStyleComments': true,
    'multiLineStrings': true,
    'regexLiterals': true
  });

  /**
   * Given a DOM subtree, wraps it in a list, and puts each line into its own
   * list item.
   *
   * @param {Node} node modified in place.  Its content is pulled into an
   *     HTMLOListElement, and each line is moved into a separate list item.
   *     This requires cloning elements, so the input might not have unique
   *     IDs after numbering.
   * @param {boolean} isPreformatted true iff white-space in text nodes should
   *     be treated as significant.
   */
  function numberLines(node, opt_startLineNum, isPreformatted) {
    var nocode = /(?:^|\s)nocode(?:\s|$)/;
    var lineBreak = /\r\n?|\n/;

    var document = node.ownerDocument;

    var li = document.createElement('li');
    while (node.firstChild) {
      li.appendChild(node.firstChild);
    }
    // An array of lines.  We split below, so this is initialized to one
    // un-split line.
    var listItems = [li];

    function walk(node) {
      var type = node.nodeType;
      if (type == 1 && !nocode.test(node.className)) {  // Element
        if ('br' === node.nodeName) {
          breakAfter(node);
          // Discard the <BR> since it is now flush against a </LI>.
          if (node.parentNode) {
            node.parentNode.removeChild(node);
          }
        } else {
          for (var child = node.firstChild; child; child = child.nextSibling) {
            walk(child);
          }
        }
      } else if ((type == 3 || type == 4) && isPreformatted) {  // Text
        var text = node.nodeValue;
        var match = text.match(lineBreak);
        if (match) {
          var firstLine = text.substring(0, match.index);
          node.nodeValue = firstLine;
          var tail = text.substring(match.index + match[0].length);
          if (tail) {
            var parent = node.parentNode;
            parent.insertBefore(
              document.createTextNode(tail), node.nextSibling);
          }
          breakAfter(node);
          if (!firstLine) {
            // Don't leave blank text nodes in the DOM.
            node.parentNode.removeChild(node);
          }
        }
      }
    }

    // Split a line after the given node.
    function breakAfter(lineEndNode) {
      // If there's nothing to the right, then we can skip ending the line
      // here, and move root-wards since splitting just before an end-tag
      // would require us to create a bunch of empty copies.
      while (!lineEndNode.nextSibling) {
        lineEndNode = lineEndNode.parentNode;
        if (!lineEndNode) { return; }
      }

      function breakLeftOf(limit, copy) {
        // Clone shallowly if this node needs to be on both sides of the break.
        var rightSide = copy ? limit.cloneNode(false) : limit;
        var parent = limit.parentNode;
        if (parent) {
          // We clone the parent chain.
          // This helps us resurrect important styling elements that cross lines.
          // E.g. in <i>Foo<br>Bar</i>
          // should be rewritten to <li><i>Foo</i></li><li><i>Bar</i></li>.
          var parentClone = breakLeftOf(parent, 1);
          // Move the clone and everything to the right of the original
          // onto the cloned parent.
          var next = limit.nextSibling;
          parentClone.appendChild(rightSide);
          for (var sibling = next; sibling; sibling = next) {
            next = sibling.nextSibling;
            parentClone.appendChild(sibling);
          }
        }
        return rightSide;
      }

      var copiedListItem = breakLeftOf(lineEndNode.nextSibling, 0);

      // Walk the parent chain until we reach an unattached LI.
      for (var parent;
        // Check nodeType since IE invents document fragments.
           (parent = copiedListItem.parentNode) && parent.nodeType === 1;) {
        copiedListItem = parent;
      }
      // Put it on the list of lines for later processing.
      listItems.push(copiedListItem);
    }

    // Split lines while there are lines left to split.
    for (var i = 0;  // Number of lines that have been split so far.
         i < listItems.length;  // length updated by breakAfter calls.
         ++i) {
      walk(listItems[i]);
    }

    // Make sure numeric indices show correctly.
    if (opt_startLineNum === (opt_startLineNum | 0)) {
      listItems[0].setAttribute('value', opt_startLineNum);
    }

    var ol = document.createElement('ol');
    ol.className = 'linenums';
    var offset = Math.max(0, ((opt_startLineNum - 1 /* zero index */)) | 0) || 0;
    for (var i = 0, n = listItems.length; i < n; ++i) {
      li = listItems[i];
      // Stick a class on the LIs so that stylesheets can
      // color odd/even rows, or any other row pattern that
      // is co-prime with 10.
      li.className = 'L' + ((i + offset) % 10);
      if (!li.firstChild) {
        li.appendChild(document.createTextNode('\xA0'));
      }
      ol.appendChild(li);
    }

    node.appendChild(ol);
  }
  /**
   * Breaks {@code job.sourceCode} around style boundaries in
   * {@code job.decorations} and modifies {@code job.sourceNode} in place.
   * @param {Object} job like <pre>{
   *    sourceCode: {string} source as plain text,
   *    sourceNode: {HTMLElement} the element containing the source,
   *    spans: {Array.<number|Node>} alternating span start indices into source
   *       and the text node or element (e.g. {@code <BR>}) corresponding to that
   *       span.
   *    decorations: {Array.<number|string} an array of style classes preceded
   *       by the position at which they start in job.sourceCode in order
   * }</pre>
   * @private
   */
  function recombineTagsAndDecorations(job) {
    var isIE8OrEarlier = /\bMSIE\s(\d+)/.exec(navigator.userAgent);
    isIE8OrEarlier = isIE8OrEarlier && +isIE8OrEarlier[1] <= 8;
    var newlineRe = /\n/g;

    var source = job.sourceCode;
    var sourceLength = source.length;
    // Index into source after the last code-unit recombined.
    var sourceIndex = 0;

    var spans = job.spans;
    var nSpans = spans.length;
    // Index into spans after the last span which ends at or before sourceIndex.
    var spanIndex = 0;

    var decorations = job.decorations;
    var nDecorations = decorations.length;
    // Index into decorations after the last decoration which ends at or before
    // sourceIndex.
    var decorationIndex = 0;

    // Remove all zero-length decorations.
    decorations[nDecorations] = sourceLength;
    var decPos, i;
    for (i = decPos = 0; i < nDecorations;) {
      if (decorations[i] !== decorations[i + 2]) {
        decorations[decPos++] = decorations[i++];
        decorations[decPos++] = decorations[i++];
      } else {
        i += 2;
      }
    }
    nDecorations = decPos;

    // Simplify decorations.
    for (i = decPos = 0; i < nDecorations;) {
      var startPos = decorations[i];
      // Conflate all adjacent decorations that use the same style.
      var startDec = decorations[i + 1];
      var end = i + 2;
      while (end + 2 <= nDecorations && decorations[end + 1] === startDec) {
        end += 2;
      }
      decorations[decPos++] = startPos;
      decorations[decPos++] = startDec;
      i = end;
    }

    nDecorations = decorations.length = decPos;

    var sourceNode = job.sourceNode;
    var oldDisplay;
    if (sourceNode) {
      oldDisplay = sourceNode.style.display;
      sourceNode.style.display = 'none';
    }
    try {
      var decoration = null;
      while (spanIndex < nSpans) {
        var spanStart = spans[spanIndex];
        var spanEnd = spans[spanIndex + 2] || sourceLength;

        var decEnd = decorations[decorationIndex + 2] || sourceLength;

        var end = Math.min(spanEnd, decEnd);

        var textNode = spans[spanIndex + 1];
        var styledText;
        if (textNode.nodeType !== 1  // Don't muck with <BR>s or <LI>s
          // Don't introduce spans around empty text nodes.
            && (styledText = source.substring(sourceIndex, end))) {
          // This may seem bizarre, and it is.  Emitting LF on IE causes the
          // code to display with spaces instead of line breaks.
          // Emitting Windows standard issue linebreaks (CRLF) causes a blank
          // space to appear at the beginning of every line but the first.
          // Emitting an old Mac OS 9 line separator makes everything spiffy.
          if (isIE8OrEarlier) {
            styledText = styledText.replace(newlineRe, '\r');
          }
          textNode.nodeValue = styledText;
          var document = textNode.ownerDocument;
          var span = document.createElement('span');
          span.className = decorations[decorationIndex + 1];
          var parentNode = textNode.parentNode;
          parentNode.replaceChild(span, textNode);
          span.appendChild(textNode);
          if (sourceIndex < spanEnd) {  // Split off a text node.
            spans[spanIndex + 1] = textNode
                // TODO: Possibly optimize by using '' if there's no flicker.
                = document.createTextNode(source.substring(end, spanEnd));
            parentNode.insertBefore(textNode, span.nextSibling);
          }
        }

        sourceIndex = end;

        if (sourceIndex >= spanEnd) {
          spanIndex += 2;
        }
        if (sourceIndex >= decEnd) {
          decorationIndex += 2;
        }
      }
    } finally {
      if (sourceNode) {
        sourceNode.style.display = oldDisplay;
      }
    }
  }

  /** Maps language-specific file extensions to handlers. */
  var langHandlerRegistry = {};
  /** Register a language handler for the given file extensions.
    * @param {function (Object)} handler a function from source code to a list
    *      of decorations.  Takes a single argument job which describes the
    *      state of the computation.   The single parameter has the form
    *      {@code {
    *        sourceCode: {string} as plain text.
    *        decorations: {Array.<number|string>} an array of style classes
    *                     preceded by the position at which they start in
    *                     job.sourceCode in order.
    *                     The language handler should assigned this field.
    *        basePos: {int} the position of source in the larger source chunk.
    *                 All positions in the output decorations array are relative
    *                 to the larger source chunk.
    *      } }
    * @param {Array.<string>} fileExtensions
    */
  function registerLangHandler(handler, fileExtensions) {
    for (var i = fileExtensions.length; --i >= 0;) {
      var ext = fileExtensions[i];
      if (!langHandlerRegistry.hasOwnProperty(ext)) {
        langHandlerRegistry[ext] = handler;
      } else if (win['console']) {
        console['warn']('cannot override language handler %s', ext);
      }
    }
  }
  function langHandlerForExtension(extension, source) {
    if (!(extension && langHandlerRegistry.hasOwnProperty(extension))) {
      // Treat it as markup if the first non whitespace character is a < and
      // the last non-whitespace character is a >.
      extension = /^\s*</.test(source)
          ? 'default-markup'
          : 'default-code';
    }
    return langHandlerRegistry[extension];
  }
  registerLangHandler(decorateSource, ['default-code']);
  registerLangHandler(
      createSimpleLexer(
          [],
          [
           [PR_PLAIN, /^[^<?]+/],
           [PR_DECLARATION, /^<!\w[^>]*(?:>|$)/],
           [PR_COMMENT, /^<\!--[\s\S]*?(?:-\->|$)/],
           // Unescaped content in an unknown language
           ['lang-', /^<\?([\s\S]+?)(?:\?>|$)/],
           ['lang-', /^<%([\s\S]+?)(?:%>|$)/],
           [PR_PUNCTUATION, /^(?:<[%?]|[%?]>)/],
           ['lang-', /^<xmp\b[^>]*>([\s\S]+?)<\/xmp\b[^>]*>/i],
           // Unescaped content in javascript.  (Or possibly vbscript).
           ['lang-js', /^<script\b[^>]*>([\s\S]*?)(<\/script\b[^>]*>)/i],
           // Contains unescaped stylesheet content
           ['lang-css', /^<style\b[^>]*>([\s\S]*?)(<\/style\b[^>]*>)/i],
           ['lang-in.tag', /^(<\/?[a-z][^<>]*>)/i]
          ]),
      ['default-markup', 'htm', 'html', 'mxml', 'xhtml', 'xml', 'xsl']);
  registerLangHandler(
      createSimpleLexer(
          [
           [PR_PLAIN, /^[\s]+/, null, ' \t\r\n'],
           [PR_ATTRIB_VALUE, /^(?:\"[^\"]*\"?|\'[^\']*\'?)/, null, '\"\'']
          ],
          [
           [PR_TAG, /^^<\/?[a-z](?:[\w.:-]*\w)?|\/?>$/i],
           [PR_ATTRIB_NAME, /^(?!style[\s=]|on)[a-z](?:[\w:-]*\w)?/i],
           ['lang-uq.val', /^=\s*([^>\'\"\s]*(?:[^>\'\"\s\/]|\/(?=\s)))/],
           [PR_PUNCTUATION, /^[=<>\/]+/],
           ['lang-js', /^on\w+\s*=\s*\"([^\"]+)\"/i],
           ['lang-js', /^on\w+\s*=\s*\'([^\']+)\'/i],
           ['lang-js', /^on\w+\s*=\s*([^\"\'>\s]+)/i],
           ['lang-css', /^style\s*=\s*\"([^\"]+)\"/i],
           ['lang-css', /^style\s*=\s*\'([^\']+)\'/i],
           ['lang-css', /^style\s*=\s*([^\"\'>\s]+)/i]
          ]),
      ['in.tag']);
  registerLangHandler(
      createSimpleLexer([], [[PR_ATTRIB_VALUE, /^[\s\S]+/]]), ['uq.val']);
  registerLangHandler(sourceDecorator({
    'keywords': CPP_KEYWORDS,
    'hashComments': true,
    'cStyleComments': true,
    'types': C_TYPES
  }), ['c', 'cc', 'cpp', 'cxx', 'cyc', 'm']);
  registerLangHandler(sourceDecorator({
    'keywords': 'null,true,false'
  }), ['json']);
  registerLangHandler(sourceDecorator({
    'keywords': CSHARP_KEYWORDS,
    'hashComments': true,
    'cStyleComments': true,
    'verbatimStrings': true,
    'types': C_TYPES
  }), ['cs']);
  registerLangHandler(sourceDecorator({
    'keywords': JAVA_KEYWORDS,
    'cStyleComments': true
  }), ['java']);
  registerLangHandler(sourceDecorator({
    'keywords': SH_KEYWORDS,
    'hashComments': true,
    'multiLineStrings': true
  }), ['bash', 'bsh', 'csh', 'sh']);
  registerLangHandler(sourceDecorator({
    'keywords': PYTHON_KEYWORDS,
    'hashComments': true,
    'multiLineStrings': true,
    'tripleQuotedStrings': true
  }), ['cv', 'py', 'python']);
  registerLangHandler(sourceDecorator({
    'keywords': PERL_KEYWORDS,
    'hashComments': true,
    'multiLineStrings': true,
    'regexLiterals': 2  // multiline regex literals
  }), ['perl', 'pl', 'pm']);
  registerLangHandler(sourceDecorator({
    'keywords': RUBY_KEYWORDS,
    'hashComments': true,
    'multiLineStrings': true,
    'regexLiterals': true
  }), ['rb', 'ruby']);
  registerLangHandler(sourceDecorator({
    'keywords': JSCRIPT_KEYWORDS,
    'cStyleComments': true,
    'regexLiterals': true
  }), ['javascript', 'js']);
  registerLangHandler(sourceDecorator({
    'keywords': COFFEE_KEYWORDS,
    'hashComments': 3,  // ### style block comments
    'cStyleComments': true,
    'multilineStrings': true,
    'tripleQuotedStrings': true,
    'regexLiterals': true
  }), ['coffee']);
  registerLangHandler(sourceDecorator({
    'keywords': RUST_KEYWORDS,
    'cStyleComments': true,
    'multilineStrings': true
  }), ['rc', 'rs', 'rust']);
  registerLangHandler(
      createSimpleLexer([], [[PR_STRING, /^[\s\S]+/]]), ['regex']);

  function applyDecorator(job) {
    var opt_langExtension = job.langExtension;

    try {
      // Extract tags, and convert the source code to plain text.
      var sourceAndSpans = extractSourceSpans(job.sourceNode, job.pre);
      /** Plain text. @type {string} */
      var source = sourceAndSpans.sourceCode;
      job.sourceCode = source;
      job.spans = sourceAndSpans.spans;
      job.basePos = 0;

      // Apply the appropriate language handler
      langHandlerForExtension(opt_langExtension, source)(job);

      // Integrate the decorations and tags back into the source code,
      // modifying the sourceNode in place.
      recombineTagsAndDecorations(job);
    } catch (e) {
      if (win['console']) {
        console['log'](e && e['stack'] || e);
      }
    }
  }

  /**
   * Pretty print a chunk of code.
   * @param sourceCodeHtml {string} The HTML to pretty print.
   * @param opt_langExtension {string} The language name to use.
   *     Typically, a filename extension like 'cpp' or 'java'.
   * @param opt_numberLines {number|boolean} True to number lines,
   *     or the 1-indexed number of the first line in sourceCodeHtml.
   */
  function $prettyPrintOne(sourceCodeHtml, opt_langExtension, opt_numberLines) {
    var container = document.createElement('div');
    // This could cause images to load and onload listeners to fire.
    // E.g. <img onerror="alert(1337)" src="nosuchimage.png">.
    // We assume that the inner HTML is from a trusted source.
    // The pre-tag is required for IE8 which strips newlines from innerHTML
    // when it is injected into a <pre> tag.
    // http://stackoverflow.com/questions/451486/pre-tag-loses-line-breaks-when-setting-innerhtml-in-ie
    // http://stackoverflow.com/questions/195363/inserting-a-newline-into-a-pre-tag-ie-javascript
    container.innerHTML = '<pre>' + sourceCodeHtml + '</pre>';
    container = container.firstChild;
    if (opt_numberLines) {
      numberLines(container, opt_numberLines, true);
    }

    var job = {
      langExtension: opt_langExtension,
      numberLines: opt_numberLines,
      sourceNode: container,
      pre: 1
    };
    applyDecorator(job);
    return container.innerHTML;
  }

  /**
   * Find all the {@code <pre>} and {@code <code>} tags in the DOM with
   * {@code class=prettyprint} and prettify them.
   *
   * @param {Function} opt_whenDone called when prettifying is done.
   * @param {HTMLElement|HTMLDocument} opt_root an element or document
   *   containing all the elements to pretty print.
   *   Defaults to {@code document.body}.
   */
  function $prettyPrint(opt_whenDone, opt_root) {
    var root = opt_root || document.body;
    var doc = root.ownerDocument || document;
    function byTagName(tn) { return root.getElementsByTagName(tn); }
    // fetch a list of nodes to rewrite
    var codeSegments = [byTagName('pre'), byTagName('code'), byTagName('xmp')];
    var elements = [];
    for (var i = 0; i < codeSegments.length; ++i) {
      for (var j = 0, n = codeSegments[i].length; j < n; ++j) {
        elements.push(codeSegments[i][j]);
      }
    }
    codeSegments = null;

    var clock = Date;
    if (!clock['now']) {
      clock = { 'now': function () { return +(new Date); } };
    }

    // The loop is broken into a series of continuations to make sure that we
    // don't make the browser unresponsive when rewriting a large page.
    var k = 0;
    var prettyPrintingJob;

    var langExtensionRe = /\blang(?:uage)?-([\w.]+)(?!\S)/;
    var prettyPrintRe = /\bprettyprint\b/;
    var prettyPrintedRe = /\bprettyprinted\b/;
    var preformattedTagNameRe = /pre|xmp/i;
    var codeRe = /^code$/i;
    var preCodeXmpRe = /^(?:pre|code|xmp)$/i;
    var EMPTY = {};

    function doWork() {
      var endTime = (win['PR_SHOULD_USE_CONTINUATION'] ?
                     clock['now']() + 250 /* ms */ :
                     Infinity);
      for (; k < elements.length && clock['now']() < endTime; k++) {
        var cs = elements[k];

        // Look for a preceding comment like
        // <?prettify lang="..." linenums="..."?>
        var attrs = EMPTY;
        {
          for (var preceder = cs; (preceder = preceder.previousSibling) ;) {
            var nt = preceder.nodeType;
            // <?foo?> is parsed by HTML 5 to a comment node (8)
            // like <!--?foo?-->, but in XML is a processing instruction
            var value = (nt === 7 || nt === 8) && preceder.nodeValue;
            if (value
                ? !/^\??prettify\b/.test(value)
                : (nt !== 3 || /\S/.test(preceder.nodeValue))) {
              // Skip over white-space text nodes but not others.
              break;
            }
            if (value) {
              attrs = {};
              value.replace(
                  /\b(\w+)=([\w:.%+-]+)/g,
                function (_, name, value) { attrs[name] = value; });
              break;
            }
          }
        }

        var className = cs.className;
        if ((attrs !== EMPTY || prettyPrintRe.test(className))
          // Don't redo this if we've already done it.
          // This allows recalling pretty print to just prettyprint elements
          // that have been added to the page since last call.
            && !prettyPrintedRe.test(className)) {

          // make sure this is not nested in an already prettified element
          var nested = false;
          for (var p = cs.parentNode; p; p = p.parentNode) {
            var tn = p.tagName;
            if (preCodeXmpRe.test(tn)
                && p.className && prettyPrintRe.test(p.className)) {
              nested = true;
              break;
            }
          }
          if (!nested) {
            // Mark done.  If we fail to prettyprint for whatever reason,
            // we shouldn't try again.
            cs.className += ' prettyprinted';

            // If the classes includes a language extensions, use it.
            // Language extensions can be specified like
            //     <pre class="prettyprint lang-cpp">
            // the language extension "cpp" is used to find a language handler
            // as passed to PR.registerLangHandler.
            // HTML5 recommends that a language be specified using "language-"
            // as the prefix instead.  Google Code Prettify supports both.
            // http://dev.w3.org/html5/spec-author-view/the-code-element.html
            var langExtension = attrs['lang'];
            if (!langExtension) {
              langExtension = className.match(langExtensionRe);
              // Support <pre class="prettyprint"><code class="language-c">
              var wrapper;
              if (!langExtension && (wrapper = childContentWrapper(cs))
                  && codeRe.test(wrapper.tagName)) {
                langExtension = wrapper.className.match(langExtensionRe);
              }

              if (langExtension) { langExtension = langExtension[1]; }
            }

            var preformatted;
            if (preformattedTagNameRe.test(cs.tagName)) {
              preformatted = 1;
            } else {
              var currentStyle = cs['currentStyle'];
              var defaultView = doc.defaultView;
              var whitespace = (
                  currentStyle
                  ? currentStyle['whiteSpace']
                  : (defaultView
                     && defaultView.getComputedStyle)
                  ? defaultView.getComputedStyle(cs, null)
                  .getPropertyValue('white-space')
                  : 0);
              preformatted = whitespace
                  && 'pre' === whitespace.substring(0, 3);
            }

            // Look for a class like linenums or linenums:<n> where <n> is the
            // 1-indexed number of the first line.
            var lineNums = attrs['linenums'];
            if (!(lineNums = lineNums === 'true' || +lineNums)) {
              lineNums = className.match(/\blinenums\b(?::(\d+))?/);
              lineNums =
                lineNums
                ? lineNums[1] && lineNums[1].length
                  ? +lineNums[1] : true
                : false;
            }
            if (lineNums) { numberLines(cs, lineNums, preformatted); }

            // do the pretty printing
            prettyPrintingJob = {
              langExtension: langExtension,
              sourceNode: cs,
              numberLines: lineNums,
              pre: preformatted
            };
            applyDecorator(prettyPrintingJob);
          }
        }
      }
      if (k < elements.length) {
        // finish up in a continuation
        setTimeout(doWork, 250);
      } else if ('function' === typeof opt_whenDone) {
        opt_whenDone();
      }
    }

    doWork();
  }

  /**
   * Contains functions for creating and registering new language handlers.
   * @type {Object}
   */
  var PR = win['PR'] = {
    'createSimpleLexer': createSimpleLexer,
    'registerLangHandler': registerLangHandler,
    'sourceDecorator': sourceDecorator,
    'PR_ATTRIB_NAME': PR_ATTRIB_NAME,
    'PR_ATTRIB_VALUE': PR_ATTRIB_VALUE,
    'PR_COMMENT': PR_COMMENT,
    'PR_DECLARATION': PR_DECLARATION,
    'PR_KEYWORD': PR_KEYWORD,
    'PR_LITERAL': PR_LITERAL,
    'PR_NOCODE': PR_NOCODE,
    'PR_PLAIN': PR_PLAIN,
    'PR_PUNCTUATION': PR_PUNCTUATION,
    'PR_SOURCE': PR_SOURCE,
    'PR_STRING': PR_STRING,
    'PR_TAG': PR_TAG,
    'PR_TYPE': PR_TYPE,
    'prettyPrintOne':
       IN_GLOBAL_SCOPE
         ? (win['prettyPrintOne'] = $prettyPrintOne)
         : (prettyPrintOne = $prettyPrintOne),
    'prettyPrint': prettyPrint =
       IN_GLOBAL_SCOPE
         ? (win['prettyPrint'] = $prettyPrint)
         : (prettyPrint = $prettyPrint)
  };

  // Make PR available via the Asynchronous Module Definition (AMD) API.
  // Per https://github.com/amdjs/amdjs-api/wiki/AMD:
  // The Asynchronous Module Definition (AMD) API specifies a
  // mechanism for defining modules such that the module and its
  // dependencies can be asynchronously loaded.
  // ...
  // To allow a clear indicator that a global define function (as
  // needed for script src browser loading) conforms to the AMD API,
  // any global define function SHOULD have a property called "amd"
  // whose value is an object. This helps avoid conflict with any
  // other existing JavaScript code that could have defined a define()
  // function that does not conform to the AMD API.
  if (typeof define === "function" && define['amd']) {
    define("google-code-prettify", [], function () {
      return PR;
    });
  }
})();

// Add support for VisualBasic.
PR['registerLangHandler'](
    PR['createSimpleLexer'](
        [
         // Whitespace
         [PR['PR_PLAIN'], /^[\t\n\r \xA0\u2028\u2029]+/, null, '\t\n\r \xA0\u2028\u2029'],
         // A double quoted string with quotes escaped by doubling them.
         // A single character can be suffixed with C.
         [PR['PR_STRING'], /^(?:[\"\u201C\u201D](?:[^\"\u201C\u201D]|[\"\u201C\u201D]{2})(?:[\"\u201C\u201D]c|$)|[\"\u201C\u201D](?:[^\"\u201C\u201D]|[\"\u201C\u201D]{2})*(?:[\"\u201C\u201D]|$))/i, null,
          '"\u201C\u201D'],
         // A comment starts with a single quote and runs until the end of the
         // line.
         // VB6 apparently allows _ as an escape sequence for newlines though
         // this is not a documented feature of VB.net.
         // http://meta.stackoverflow.com/q/121497/137403
         [PR['PR_COMMENT'], /^[\'\u2018\u2019](?:_(?:\r\n?|[^\r]?)|[^\r\n_\u2028\u2029])*/, null, '\'\u2018\u2019']
        ],
        [
         [PR['PR_KEYWORD'], /^(?:AddHandler|AddressOf|Alias|And|AndAlso|Ansi|As|Assembly|Auto|Boolean|ByRef|Byte|ByVal|Call|Case|Catch|CBool|CByte|CChar|CDate|CDbl|CDec|Char|CInt|Class|CLng|CObj|Const|CShort|CSng|CStr|CType|Date|Decimal|Declare|Default|Delegate|Dim|DirectCast|Do|Double|Each|Else|ElseIf|End|EndIf|Enum|Erase|Error|Event|Exit|Finally|For|Friend|Function|Get|GetType|GoSub|GoTo|Handles|If|Implements|Imports|In|Inherits|Integer|Interface|Is|Let|Lib|Like|Long|Loop|Me|Mod|Module|MustInherit|MustOverride|MyBase|MyClass|Namespace|New|Next|Not|NotInheritable|NotOverridable|Object|On|Option|Optional|Or|OrElse|Overloads|Overridable|Overrides|ParamArray|Preserve|Private|Property|Protected|Public|RaiseEvent|ReadOnly|ReDim|RemoveHandler|Resume|Return|Select|Set|Shadows|Shared|Short|Single|Static|Step|Stop|String|Structure|Sub|SyncLock|Then|Throw|To|Try|TypeOf|Unicode|Until|Variant|Wend|When|While|With|WithEvents|WriteOnly|Xor|EndIf|GoSub|Let|Variant|Wend)\b/i, null],
         // A second comment form
         [PR['PR_COMMENT'], /^REM\b[^\r\n\u2028\u2029]*/i],
         // A boolean, numeric, or date literal.
         [PR['PR_LITERAL'],
          /^(?:True\b|False\b|Nothing\b|\d+(?:E[+\-]?\d+[FRD]?|[FRDSIL])?|(?:&H[0-9A-F]+|&O[0-7]+)[SIL]?|\d*\.\d+(?:E[+\-]?\d+)?[FRD]?|#\s+(?:\d+[\-\/]\d+[\-\/]\d+(?:\s+\d+:\d+(?::\d+)?(\s*(?:AM|PM))?)?|\d+:\d+(?::\d+)?(\s*(?:AM|PM))?)\s+#)/i],
         // An identifier.  Keywords can be turned into identifers
         // with square brackets, and there may be optional type
         // characters after a normal identifier in square brackets.
         [PR['PR_PLAIN'], /^(?:(?:[a-z]|_\w)\w*(?:\[[%&@!#]+\])?|\[(?:[a-z]|_\w)\w*\])/i],
         // A run of punctuation
         [PR['PR_PUNCTUATION'],
          /^[^\w\t\n\r \"\'\[\]\xA0\u2018\u2019\u201C\u201D\u2028\u2029]+/],
         // Square brackets
         [PR['PR_PUNCTUATION'], /^(?:\[|\])/]
        ]),
    ['vb', 'vbs']);
/*!
 * clipboard.js v2.0.0
 * https://zenorocha.github.io/clipboard.js
 * 
 * Licensed MIT © Zeno Rocha
 */

!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.ClipboardJS=e():t.ClipboardJS=e()}(this,function(){return function(t){function e(o){if(n[o])return n[o].exports;var r=n[o]={i:o,l:!1,exports:{}};return t[o].call(r.exports,r,r.exports,e),r.l=!0,r.exports}var n={};return e.m=t,e.c=n,e.i=function(t){return t},e.d=function(t,n,o){e.o(t,n)||Object.defineProperty(t,n,{configurable:!1,enumerable:!0,get:o})},e.n=function(t){var n=t&&t.__esModule?function(){return t.default}:function(){return t};return e.d(n,"a",n),n},e.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},e.p="",e(e.s=3)}([function(t,e,n){var o,r,i;!function(a,c){r=[t,n(7)],o=c,void 0!==(i="function"==typeof o?o.apply(e,r):o)&&(t.exports=i)}(0,function(t,e){"use strict";function n(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}var o=function(t){return t&&t.__esModule?t:{default:t}}(e),r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},i=function(){function t(t,e){for(var n=0;n<e.length;n++){var o=e[n];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(t,o.key,o)}}return function(e,n,o){return n&&t(e.prototype,n),o&&t(e,o),e}}(),a=function(){function t(e){n(this,t),this.resolveOptions(e),this.initSelection()}return i(t,[{key:"resolveOptions",value:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};this.action=t.action,this.container=t.container,this.emitter=t.emitter,this.target=t.target,this.text=t.text,this.trigger=t.trigger,this.selectedText=""}},{key:"initSelection",value:function(){this.text?this.selectFake():this.target&&this.selectTarget()}},{key:"selectFake",value:function(){var t=this,e="rtl"==document.documentElement.getAttribute("dir");this.removeFake(),this.fakeHandlerCallback=function(){return t.removeFake()},this.fakeHandler=this.container.addEventListener("click",this.fakeHandlerCallback)||!0,this.fakeElem=document.createElement("textarea"),this.fakeElem.style.fontSize="12pt",this.fakeElem.style.border="0",this.fakeElem.style.padding="0",this.fakeElem.style.margin="0",this.fakeElem.style.position="absolute",this.fakeElem.style[e?"right":"left"]="-9999px";var n=window.pageYOffset||document.documentElement.scrollTop;this.fakeElem.style.top=n+"px",this.fakeElem.setAttribute("readonly",""),this.fakeElem.value=this.text,this.container.appendChild(this.fakeElem),this.selectedText=(0,o.default)(this.fakeElem),this.copyText()}},{key:"removeFake",value:function(){this.fakeHandler&&(this.container.removeEventListener("click",this.fakeHandlerCallback),this.fakeHandler=null,this.fakeHandlerCallback=null),this.fakeElem&&(this.container.removeChild(this.fakeElem),this.fakeElem=null)}},{key:"selectTarget",value:function(){this.selectedText=(0,o.default)(this.target),this.copyText()}},{key:"copyText",value:function(){var t=void 0;try{t=document.execCommand(this.action)}catch(e){t=!1}this.handleResult(t)}},{key:"handleResult",value:function(t){this.emitter.emit(t?"success":"error",{action:this.action,text:this.selectedText,trigger:this.trigger,clearSelection:this.clearSelection.bind(this)})}},{key:"clearSelection",value:function(){this.trigger&&this.trigger.focus(),window.getSelection().removeAllRanges()}},{key:"destroy",value:function(){this.removeFake()}},{key:"action",set:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"copy";if(this._action=t,"copy"!==this._action&&"cut"!==this._action)throw new Error('Invalid "action" value, use either "copy" or "cut"')},get:function(){return this._action}},{key:"target",set:function(t){if(void 0!==t){if(!t||"object"!==(void 0===t?"undefined":r(t))||1!==t.nodeType)throw new Error('Invalid "target" value, use a valid Element');if("copy"===this.action&&t.hasAttribute("disabled"))throw new Error('Invalid "target" attribute. Please use "readonly" instead of "disabled" attribute');if("cut"===this.action&&(t.hasAttribute("readonly")||t.hasAttribute("disabled")))throw new Error('Invalid "target" attribute. You can\'t cut text from elements with "readonly" or "disabled" attributes');this._target=t}},get:function(){return this._target}}]),t}();t.exports=a})},function(t,e,n){function o(t,e,n){if(!t&&!e&&!n)throw new Error("Missing required arguments");if(!c.string(e))throw new TypeError("Second argument must be a String");if(!c.fn(n))throw new TypeError("Third argument must be a Function");if(c.node(t))return r(t,e,n);if(c.nodeList(t))return i(t,e,n);if(c.string(t))return a(t,e,n);throw new TypeError("First argument must be a String, HTMLElement, HTMLCollection, or NodeList")}function r(t,e,n){return t.addEventListener(e,n),{destroy:function(){t.removeEventListener(e,n)}}}function i(t,e,n){return Array.prototype.forEach.call(t,function(t){t.addEventListener(e,n)}),{destroy:function(){Array.prototype.forEach.call(t,function(t){t.removeEventListener(e,n)})}}}function a(t,e,n){return u(document.body,t,e,n)}var c=n(6),u=n(5);t.exports=o},function(t,e){function n(){}n.prototype={on:function(t,e,n){var o=this.e||(this.e={});return(o[t]||(o[t]=[])).push({fn:e,ctx:n}),this},once:function(t,e,n){function o(){r.off(t,o),e.apply(n,arguments)}var r=this;return o._=e,this.on(t,o,n)},emit:function(t){var e=[].slice.call(arguments,1),n=((this.e||(this.e={}))[t]||[]).slice(),o=0,r=n.length;for(o;o<r;o++)n[o].fn.apply(n[o].ctx,e);return this},off:function(t,e){var n=this.e||(this.e={}),o=n[t],r=[];if(o&&e)for(var i=0,a=o.length;i<a;i++)o[i].fn!==e&&o[i].fn._!==e&&r.push(o[i]);return r.length?n[t]=r:delete n[t],this}},t.exports=n},function(t,e,n){var o,r,i;!function(a,c){r=[t,n(0),n(2),n(1)],o=c,void 0!==(i="function"==typeof o?o.apply(e,r):o)&&(t.exports=i)}(0,function(t,e,n,o){"use strict";function r(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function a(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function c(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}function u(t,e){var n="data-clipboard-"+t;if(e.hasAttribute(n))return e.getAttribute(n)}var l=r(e),s=r(n),f=r(o),d="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},h=function(){function t(t,e){for(var n=0;n<e.length;n++){var o=e[n];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(t,o.key,o)}}return function(e,n,o){return n&&t(e.prototype,n),o&&t(e,o),e}}(),p=function(t){function e(t,n){i(this,e);var o=a(this,(e.__proto__||Object.getPrototypeOf(e)).call(this));return o.resolveOptions(n),o.listenClick(t),o}return c(e,t),h(e,[{key:"resolveOptions",value:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};this.action="function"==typeof t.action?t.action:this.defaultAction,this.target="function"==typeof t.target?t.target:this.defaultTarget,this.text="function"==typeof t.text?t.text:this.defaultText,this.container="object"===d(t.container)?t.container:document.body}},{key:"listenClick",value:function(t){var e=this;this.listener=(0,f.default)(t,"click",function(t){return e.onClick(t)})}},{key:"onClick",value:function(t){var e=t.delegateTarget||t.currentTarget;this.clipboardAction&&(this.clipboardAction=null),this.clipboardAction=new l.default({action:this.action(e),target:this.target(e),text:this.text(e),container:this.container,trigger:e,emitter:this})}},{key:"defaultAction",value:function(t){return u("action",t)}},{key:"defaultTarget",value:function(t){var e=u("target",t);if(e)return document.querySelector(e)}},{key:"defaultText",value:function(t){return u("text",t)}},{key:"destroy",value:function(){this.listener.destroy(),this.clipboardAction&&(this.clipboardAction.destroy(),this.clipboardAction=null)}}],[{key:"isSupported",value:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:["copy","cut"],e="string"==typeof t?[t]:t,n=!!document.queryCommandSupported;return e.forEach(function(t){n=n&&!!document.queryCommandSupported(t)}),n}}]),e}(s.default);t.exports=p})},function(t,e){function n(t,e){for(;t&&t.nodeType!==o;){if("function"==typeof t.matches&&t.matches(e))return t;t=t.parentNode}}var o=9;if("undefined"!=typeof Element&&!Element.prototype.matches){var r=Element.prototype;r.matches=r.matchesSelector||r.mozMatchesSelector||r.msMatchesSelector||r.oMatchesSelector||r.webkitMatchesSelector}t.exports=n},function(t,e,n){function o(t,e,n,o,r){var a=i.apply(this,arguments);return t.addEventListener(n,a,r),{destroy:function(){t.removeEventListener(n,a,r)}}}function r(t,e,n,r,i){return"function"==typeof t.addEventListener?o.apply(null,arguments):"function"==typeof n?o.bind(null,document).apply(null,arguments):("string"==typeof t&&(t=document.querySelectorAll(t)),Array.prototype.map.call(t,function(t){return o(t,e,n,r,i)}))}function i(t,e,n,o){return function(n){n.delegateTarget=a(n.target,e),n.delegateTarget&&o.call(t,n)}}var a=n(4);t.exports=r},function(t,e){e.node=function(t){return void 0!==t&&t instanceof HTMLElement&&1===t.nodeType},e.nodeList=function(t){var n=Object.prototype.toString.call(t);return void 0!==t&&("[object NodeList]"===n||"[object HTMLCollection]"===n)&&"length"in t&&(0===t.length||e.node(t[0]))},e.string=function(t){return"string"==typeof t||t instanceof String},e.fn=function(t){return"[object Function]"===Object.prototype.toString.call(t)}},function(t,e){function n(t){var e;if("SELECT"===t.nodeName)t.focus(),e=t.value;else if("INPUT"===t.nodeName||"TEXTAREA"===t.nodeName){var n=t.hasAttribute("readonly");n||t.setAttribute("readonly",""),t.select(),t.setSelectionRange(0,t.value.length),n||t.removeAttribute("readonly"),e=t.value}else{t.hasAttribute("contenteditable")&&t.focus();var o=window.getSelection(),r=document.createRange();r.selectNodeContents(t),o.removeAllRanges(),o.addRange(r),e=o.toString()}return e}t.exports=n}])});
/** 
 * Kendo UI v2020.2.513 (http://www.telerik.com/kendo-ui)                                                                                                                                               
 * Copyright 2020 Progress Software Corporation and/or one of its subsidiaries or affiliates. All rights reserved.                                                                                      
 *                                                                                                                                                                                                      
 * Kendo UI commercial licenses may be obtained at                                                                                                                                                      
 * http://www.telerik.com/purchase/license-agreement/kendo-ui-complete                                                                                                                                  
 * If you do not own a commercial license, this file shall be governed by the trial license terms.                                                                                                      
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       

*/

!function(e,define){define("kendo.core.min",["jquery"],e)}(function(){return function(e,t,n){function r(){}function o(e,t){if(t)return"'"+e.split("'").join("\\'").split('\\"').join('\\\\\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t")+"'";var n=e.charAt(0),r=e.substring(1);return"="===n?"+("+r+")+":":"===n?"+$kendoHtmlEncode("+r+")+":";"+e+";$kendoOutput+="}function i(e,t,n){return e+="",t=t||2,n=t-e.length,n?B[t].substring(0,n)+e:e}function a(e){var t=e.css(be.support.transitions.css+"box-shadow")||e.css("box-shadow"),n=t?t.match(Ae)||[0,0,0,0,0]:[0,0,0,0,0],r=Te.max(+n[3],+(n[4]||0));return{left:-n[1]+r,right:+n[1]+r,bottom:+n[2]+r}}function s(n,r){var o,i,a,s,l,c,d=ze.browser,f=be._outerWidth,p=be._outerHeight,m=n.parent(),h=f(t);return m.removeClass("k-animation-container-sm"),m.hasClass("k-animation-container")?u(n,r):(i=n[0].style.width,a=n[0].style.height,s=De.test(i),l=De.test(a),c=n.hasClass("k-tooltip")||n.is(".k-menu-horizontal.k-context-menu"),o=s||l,!s&&(!r||r&&i||c)&&(i=r?f(n)+1:f(n)),(!l&&(!r||r&&a)||n.is(".k-menu-horizontal.k-context-menu"))&&(a=p(n)),n.wrap(e("<div/>").addClass("k-animation-container").css({width:i,height:a})),m=n.parent(),o&&n.css({width:"100%",height:"100%",boxSizing:"border-box",mozBoxSizing:"border-box",webkitBoxSizing:"border-box"})),h<f(m)&&(m.addClass("k-animation-container-sm"),u(n,r)),d.msie&&Te.floor(d.version)<=7&&(n.css({zoom:1}),n.children(".k-menu").width(n.width())),m}function u(e,t){var n,r=be._outerWidth,o=be._outerHeight,i=e.parent(".k-animation-container"),a=i[0].style;i.is(":hidden")&&i.css({display:"",position:""}),n=De.test(a.width)||De.test(a.height),n||i.css({width:t?r(e)+1:r(e),height:o(e),boxSizing:"content-box",mozBoxSizing:"content-box",webkitBoxSizing:"content-box"})}function l(e){var t=1,n=arguments.length;for(t=1;t<n;t++)c(e,arguments[t]);return e}function c(e,n){var r,o,i,a,s,u=be.data.ObservableArray,l=be.data.LazyObservableArray,d=be.data.DataSource,f=be.data.HierarchicalDataSource;for(r in n)o=n[r],i=typeof o,a=i===Ne&&null!==o?o.constructor:null,!a||a===Array||a===u||a===l||a===d||a===f||a===RegExp||be.isFunction(t.ArrayBuffer)&&a===ArrayBuffer?i!==je&&(e[r]=o):o instanceof Date?e[r]=new Date(o.getTime()):F(o.clone)?e[r]=o.clone():(s=e[r],e[r]=typeof s===Ne?s||{}:{},c(e[r],o));return e}function d(e,t,r){for(var o in t)if(t.hasOwnProperty(o)&&t[o].test(e))return o;return r!==n?r:e}function f(e){return e.replace(/([a-z][A-Z])/g,function(e){return e.charAt(0)+"-"+e.charAt(1).toLowerCase()})}function p(e){return e.replace(/\-(\w)/g,function(e,t){return t.toUpperCase()})}function m(t,n){var r,o={};return document.defaultView&&document.defaultView.getComputedStyle?(r=document.defaultView.getComputedStyle(t,""),n&&e.each(n,function(e,t){o[t]=r.getPropertyValue(t)})):(r=t.currentStyle,n&&e.each(n,function(e,t){o[t]=r[p(t)]})),be.size(o)||(o=r),o}function h(e){if(e&&e.className&&"string"==typeof e.className&&e.className.indexOf("k-auto-scrollable")>-1)return!0;var t=m(e,["overflow"]).overflow;return"auto"==t||"scroll"==t}function g(t,r){var o,i=ze.browser.webkit,a=ze.browser.mozilla,s=t instanceof e?t[0]:t;if(t)return o=ze.isRtl(t),r===n?o&&i?s.scrollWidth-s.clientWidth-s.scrollLeft:Math.abs(s.scrollLeft):(s.scrollLeft=o&&i?s.scrollWidth-s.clientWidth-r:o&&a?-r:r,n)}function y(e){var t,n=0;for(t in e)e.hasOwnProperty(t)&&"toJSON"!=t&&n++;return n}function v(e,n,r){var o,i,a;return n||(n="offset"),o=e[n](),i={top:o.top,right:o.right,bottom:o.bottom,left:o.left},ze.browser.msie&&(ze.pointers||ze.msPointers)&&!r&&(a=ze.isRtl(e)?1:-1,i.top-=t.pageYOffset-document.documentElement.scrollTop,i.left-=t.pageXOffset+a*document.documentElement.scrollLeft),i}function b(e){var t={};return Me("string"==typeof e?e.split(" "):e,function(e){t[e]=this}),t}function w(e){return new be.effects.Element(e)}function M(e,t,n,r){return typeof e===He&&(F(t)&&(r=t,t=400,n=!1),F(n)&&(r=n,n=!1),typeof t===Re&&(n=t,t=400),e={effects:e,duration:t,reverse:n,complete:r}),we({effects:{},duration:400,reverse:!1,init:ke,teardown:ke,hide:!1},e,{completeCallback:e.complete,complete:ke})}function x(t,n,r,o,i){for(var a,s=0,u=t.length;s<u;s++)a=e(t[s]),a.queue(function(){q.promise(a,M(n,r,o,i))});return t}function S(e,t,n,r){return t&&(t=t.split(" "),Me(t,function(t,n){e.toggleClass(n,r)})),e}function k(e){return(""+e).replace(J,"&amp;").replace(V,"&lt;").replace(Q,"&gt;").replace(G,"&quot;").replace(K,"&#39;")}function T(e){var n;try{n=t.decodeURIComponent(e)}catch(r){n=e.replace(/%u([\dA-F]{4})|%([\dA-F]{2})/gi,function(e,t,n){return String.fromCharCode(parseInt("0x"+(t||n),16))})}return n}function O(e,t){var r;return 0===t.indexOf("data")&&(t=t.substring(4),t=t.charAt(0).toLowerCase()+t.substring(1)),t=t.replace(ae,"-$1"),r=e.getAttribute("data-"+be.ns+t),null===r?r=n:"null"===r?r=null:"true"===r?r=!0:"false"===r?r=!1:Ee.test(r)&&"mask"!=t?r=parseFloat(r):oe.test(r)&&!ie.test(r)&&(r=Function("return ("+r+")")()),r}function z(t,r,o){var i,a,s={},u=t.getAttribute("data-"+be.ns+"role");for(i in r)a=O(t,i),a!==n&&(re.test(i)&&"drawer"!=u&&("string"==typeof a?e("#"+a).length?a=be.template(e("#"+a).html()):o&&(a=be.template(o[a])):a=t.getAttribute(i)),s[i]=a);return s}function D(t,n){return e.contains(t,n)?-1:1}function C(){var t=e(this);return e.inArray(t.attr("data-"+be.ns+"role"),["slider","rangeslider","breadcrumb"])>-1||t.is(":visible")}function A(e,t){var n=e.nodeName.toLowerCase();return(/input|select|textarea|button|object/.test(n)?!e.disabled:"a"===n?e.href||t:t)&&E(e)}function E(t){return e.expr.pseudos.visible(t)&&!e(t).parents().addBack().filter(function(){return"hidden"===e.css(this,"visibility")}).length}function _(e,t){return new _.fn.init(e,t)}var H,F,N,P,R,j,U,I,W,$,L,B,Y,q,J,V,G,K,Q,Z,X,ee,te,ne,re,oe,ie,ae,se,ue,le,ce,de,fe,pe,me,he,ge,ye,ve,be=t.kendo=t.kendo||{cultures:{}},we=e.extend,Me=e.each,xe=e.isArray,Se=e.proxy,ke=e.noop,Te=Math,Oe=t.JSON||{},ze={},De=/%/,Ce=/\{(\d+)(:[^\}]+)?\}/g,Ae=/(\d+(?:\.?)\d*)px\s*(\d+(?:\.?)\d*)px\s*(\d+(?:\.?)\d*)px\s*(\d+)?/i,Ee=/^(\+|-?)\d+(\.?)\d*$/,_e="function",He="string",Fe="number",Ne="object",Pe="null",Re="boolean",je="undefined",Ue={},Ie={},We=[].slice,$e=function(){var e,t,r,o,i,a,s=arguments[0]||{},u=1,l=arguments.length,c=!1;for("boolean"==typeof s&&(c=s,s=arguments[u]||{},u++),"object"==typeof s||jQuery.isFunction(s)||(s={}),u===l&&(s=this,u--);u<l;u++)if(null!=(i=arguments[u]))for(o in i)"filters"!=o&&"concat"!=o&&":"!=o&&(e=s[o],r=i[o],s!==r&&(c&&r&&(jQuery.isPlainObject(r)||(t=jQuery.isArray(r)))?(t?(t=!1,a=e&&jQuery.isArray(e)?e:[]):a=e&&jQuery.isPlainObject(e)?e:{},s[o]=$e(c,a,r)):r!==n&&(s[o]=r)));return s};be.version="2020.2.513".replace(/^\s+|\s+$/g,""),r.extend=function(e){var t,n,r=function(){},o=this,i=e&&e.init?e.init:function(){o.apply(this,arguments)};r.prototype=o.prototype,n=i.fn=i.prototype=new r;for(t in e)n[t]=null!=e[t]&&e[t].constructor===Object?we(!0,{},r.prototype[t],e[t]):e[t];return n.constructor=i,i.extend=o.extend,i},r.prototype._initOptions=function(e){this.options=l({},this.options,e)},F=be.isFunction=function(e){return"function"==typeof e},N=function(){this._defaultPrevented=!0},P=function(){return this._defaultPrevented===!0},R=r.extend({init:function(){this._events={}},bind:function(e,t,r){var o,i,a,s,u,l=this,c=typeof e===He?[e]:e,d=typeof t===_e;if(t===n){for(o in e)l.bind(o,e[o]);return l}for(o=0,i=c.length;o<i;o++)e=c[o],s=d?t:t[e],s&&(r&&(a=s,s=function(){l.unbind(e,s),a.apply(l,arguments)},s.original=a),u=l._events[e]=l._events[e]||[],u.push(s));return l},one:function(e,t){return this.bind(e,t,!0)},first:function(e,t){var n,r,o,i,a=this,s=typeof e===He?[e]:e,u=typeof t===_e;for(n=0,r=s.length;n<r;n++)e=s[n],o=u?t:t[e],o&&(i=a._events[e]=a._events[e]||[],i.unshift(o));return a},trigger:function(e,t){var n,r,o=this,i=o._events[e];if(i){for(t=t||{},t.sender=o,t._defaultPrevented=!1,t.preventDefault=N,t.isDefaultPrevented=P,i=i.slice(),n=0,r=i.length;n<r;n++)i[n].call(o,t);return t._defaultPrevented===!0}return!1},unbind:function(e,t){var r,o=this,i=o._events[e];if(e===n)o._events={};else if(i)if(t)for(r=i.length-1;r>=0;r--)i[r]!==t&&i[r].original!==t||i.splice(r,1);else o._events[e]=[];return o}}),j=/^\w+/,U=/\$\{([^}]*)\}/g,I=/\\\}/g,W=/__CURLY__/g,$=/\\#/g,L=/__SHARP__/g,B=["","0","00","000","0000"],H={paramName:"data",useWithBlock:!0,render:function(e,t){var n,r,o="";for(n=0,r=t.length;n<r;n++)o+=e(t[n]);return o},compile:function(e,t){var n,r,i,a=we({},this,t),s=a.paramName,u=s.match(j)[0],l=a.useWithBlock,c="var $kendoOutput, $kendoHtmlEncode = kendo.htmlEncode;";if(F(e))return e;for(c+=l?"with("+s+"){":"",c+="$kendoOutput=",r=e.replace(I,"__CURLY__").replace(U,"#=$kendoHtmlEncode($1)#").replace(W,"}").replace($,"__SHARP__").split("#"),i=0;i<r.length;i++)c+=o(r[i],i%2===0);c+=l?";}":";",c+="return $kendoOutput;",c=c.replace(L,"#");try{return n=Function(u,c),n._slotCount=Math.floor(r.length/2),n}catch(d){throw Error(be.format("Invalid template:'{0}' Generated code:'{1}'",e,c))}}},function(){function e(e){return a.lastIndex=0,a.test(e)?'"'+e.replace(a,function(e){var t=s[e];return typeof t===He?t:"\\u"+("0000"+e.charCodeAt(0).toString(16)).slice(-4)})+'"':'"'+e+'"'}function t(i,a){var s,l,c,d,f,p,m=n,h=a[i];if(h&&typeof h===Ne&&typeof h.toJSON===_e&&(h=h.toJSON(i)),typeof o===_e&&(h=o.call(a,i,h)),p=typeof h,p===He)return e(h);if(p===Fe)return isFinite(h)?h+"":Pe;if(p===Re||p===Pe)return h+"";if(p===Ne){if(!h)return Pe;if(n+=r,f=[],"[object Array]"===u.apply(h)){for(d=h.length,s=0;s<d;s++)f[s]=t(s,h)||Pe;return c=0===f.length?"[]":n?"[\n"+n+f.join(",\n"+n)+"\n"+m+"]":"["+f.join(",")+"]",n=m,c}if(o&&typeof o===Ne)for(d=o.length,s=0;s<d;s++)typeof o[s]===He&&(l=o[s],c=t(l,h),c&&f.push(e(l)+(n?": ":":")+c));else for(l in h)Object.hasOwnProperty.call(h,l)&&(c=t(l,h),c&&f.push(e(l)+(n?": ":":")+c));return c=0===f.length?"{}":n?"{\n"+n+f.join(",\n"+n)+"\n"+m+"}":"{"+f.join(",")+"}",n=m,c}}var n,r,o,a=/[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,s={"\b":"\\b","\t":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"},u={}.toString;typeof Date.prototype.toJSON!==_e&&(Date.prototype.toJSON=function(){var e=this;return isFinite(e.valueOf())?i(e.getUTCFullYear(),4)+"-"+i(e.getUTCMonth()+1)+"-"+i(e.getUTCDate())+"T"+i(e.getUTCHours())+":"+i(e.getUTCMinutes())+":"+i(e.getUTCSeconds())+"Z":null},String.prototype.toJSON=Number.prototype.toJSON=Boolean.prototype.toJSON=function(){return this.valueOf()}),typeof Oe.stringify!==_e&&(Oe.stringify=function(e,i,a){var s;if(n="",r="",typeof a===Fe)for(s=0;s<a;s+=1)r+=" ";else typeof a===He&&(r=a);if(o=i,i&&typeof i!==_e&&(typeof i!==Ne||typeof i.length!==Fe))throw Error("JSON.stringify");return t("",{"":e})})}(),function(){function t(e){if(e){if(e.numberFormat)return e;if(typeof e===He){var t=be.cultures;return t[e]||t[e.split("-")[0]]||null}return null}return null}function r(e){return e&&(e=t(e)),e||be.cultures.current}function o(e,t,o){o=r(o);var a=o.calendars.standard,s=a.days,u=a.months;return t=a.patterns[t]||t,t.replace(c,function(t){var r,o,l;return"d"===t?o=e.getDate():"dd"===t?o=i(e.getDate()):"ddd"===t?o=s.namesAbbr[e.getDay()]:"dddd"===t?o=s.names[e.getDay()]:"M"===t?o=e.getMonth()+1:"MM"===t?o=i(e.getMonth()+1):"MMM"===t?o=u.namesAbbr[e.getMonth()]:"MMMM"===t?o=u.names[e.getMonth()]:"yy"===t?o=i(e.getFullYear()%100):"yyyy"===t?o=i(e.getFullYear(),4):"h"===t?o=e.getHours()%12||12:"hh"===t?o=i(e.getHours()%12||12):"H"===t?o=e.getHours():"HH"===t?o=i(e.getHours()):"m"===t?o=e.getMinutes():"mm"===t?o=i(e.getMinutes()):"s"===t?o=e.getSeconds():"ss"===t?o=i(e.getSeconds()):"f"===t?o=Te.floor(e.getMilliseconds()/100):"ff"===t?(o=e.getMilliseconds(),o>99&&(o=Te.floor(o/10)),o=i(o)):"fff"===t?o=i(e.getMilliseconds(),3):"tt"===t?o=e.getHours()<12?a.AM[0]:a.PM[0]:"zzz"===t?(r=e.getTimezoneOffset(),l=r<0,o=(""+Te.abs(r/60)).split(".")[0],r=Te.abs(r)-60*o,o=(l?"+":"-")+i(o),o+=":"+i(r)):"zz"!==t&&"z"!==t||(o=e.getTimezoneOffset()/60,l=o<0,o=(""+Te.abs(o)).split(".")[0],o=(l?"+":"-")+("zz"===t?i(o):o)),o!==n?o:t.slice(1,t.length-1)})}function a(e,t,o){var i,a,l,c,w,M,x,S,k,T,O,z,D,C,A,E,_,H,F,N,P,R,j,U,I,W,$,L,B,Y,q,J,V,G;if(o=r(o),i=o.numberFormat,a=i[h],l=i.decimals,c=i.pattern[0],w=[],O=e<0,E=m,_=m,q=-1,e===n)return m;if(!isFinite(e))return e;if(!t)return o.name.length?e.toLocaleString():""+e;if(T=d.exec(t)){if(t=T[1].toLowerCase(),x="c"===t,S="p"===t,(x||S)&&(i=x?i.currency:i.percent,a=i[h],l=i.decimals,M=i.symbol,c=i.pattern[O?0:1]),k=T[2],k&&(l=+k),"e"===t)return V=k?e.toExponential(l):e.toExponential(),V.replace(h,i[h]);if(S&&(e*=100),e=u(e,l),O=e<0,e=e.split(h),z=e[0],D=e[1],O&&(z=z.substring(1)),_=s(z,0,z.length,i),D&&(_+=a+D),"n"===t&&!O)return _;for(e=m,H=0,F=c.length;H<F;H++)N=c.charAt(H),e+="n"===N?_:"$"===N||"%"===N?M:N;return e}if((t.indexOf("'")>-1||t.indexOf('"')>-1||t.indexOf("\\")>-1)&&(t=t.replace(f,function(e){var t=e.charAt(0).replace("\\",""),n=e.slice(1).replace(t,"");return w.push(n),b})),t=t.split(";"),O&&t[1])t=t[1],R=!0;else if(0===e&&t[2]){if(t=t[2],t.indexOf(y)==-1&&t.indexOf(v)==-1)return t}else t=t[0];if(L=t.indexOf("%"),B=t.indexOf("$"),S=L!=-1,x=B!=-1,S&&(e*=100),x&&"\\"===t[B-1]&&(t=t.split("\\").join(""),x=!1),(x||S)&&(i=x?i.currency:i.percent,a=i[h],l=i.decimals,M=i.symbol),P=t.indexOf(g)>-1,P&&(t=t.replace(p,m)),j=t.indexOf(h),F=t.length,j!=-1)if(D=(""+e).split("e"),D=D[1]?u(e,Math.abs(D[1])):D[0],D=D.split(h)[1]||m,I=t.lastIndexOf(v)-j,U=t.lastIndexOf(y)-j,W=I>-1,$=U>-1,H=D.length,W||$||(t=t.substring(0,j)+t.substring(j+1),F=t.length,j=-1,H=0),W&&I>U)H=I;else if(U>I)if($&&H>U){for(G=u(e,U,O);G.charAt(G.length-1)===v&&U>0&&U>I;)U--,G=u(e,U,O);H=U}else W&&H<I&&(H=I);if(e=u(e,H,O),U=t.indexOf(y),Y=I=t.indexOf(v),q=U==-1&&I!=-1?I:U!=-1&&I==-1?U:U>I?I:U,U=t.lastIndexOf(y),I=t.lastIndexOf(v),J=U==-1&&I!=-1?I:U!=-1&&I==-1?U:U>I?U:I,q==F&&(J=q),q!=-1){for(_=(""+e).split(h),z=_[0],D=_[1]||m,C=z.length,A=D.length,O&&e*-1>=0&&(O=!1),e=t.substring(0,q),O&&!R&&(e+="-"),H=q;H<F;H++){if(N=t.charAt(H),j==-1){if(J-H<C){e+=z;break}}else if(I!=-1&&I<H&&(E=m),j-H<=C&&j-H>-1&&(e+=z,H=j),j===H){e+=(D?a:m)+D,H+=J-j+1;continue}N===v?(e+=N,E=N):N===y&&(e+=E)}if(P&&(e=s(e,q+(O&&!R?1:0),Math.max(J,C+q),i)),J>=q&&(e+=t.substring(J+1)),x||S){for(_=m,H=0,F=e.length;H<F;H++)N=e.charAt(H),_+="$"===N||"%"===N?M:N;e=_}if(F=w.length)for(H=0;H<F;H++)e=e.replace(b,w[H])}return e}var s,u,l,c=/dddd|ddd|dd|d|MMMM|MMM|MM|M|yyyy|yy|HH|H|hh|h|mm|m|fff|ff|f|tt|ss|s|zzz|zz|z|"[^"]*"|'[^']*'/g,d=/^(n|c|p|e)(\d*)$/i,f=/(\\.)|(['][^']*[']?)|(["][^"]*["]?)/g,p=/\,/g,m="",h=".",g=",",y="#",v="0",b="??",w="en-US",M={}.toString;be.cultures["en-US"]={name:w,numberFormat:{pattern:["-n"],decimals:2,",":",",".":".",groupSize:[3],percent:{pattern:["-n %","n %"],decimals:2,",":",",".":".",groupSize:[3],symbol:"%"},currency:{name:"US Dollar",abbr:"USD",pattern:["($n)","$n"],decimals:2,",":",",".":".",groupSize:[3],symbol:"$"}},calendars:{standard:{days:{names:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],namesAbbr:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],namesShort:["Su","Mo","Tu","We","Th","Fr","Sa"]},months:{names:["January","February","March","April","May","June","July","August","September","October","November","December"],namesAbbr:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]},AM:["AM","am","AM"],PM:["PM","pm","PM"],patterns:{d:"M/d/yyyy",D:"dddd, MMMM dd, yyyy",F:"dddd, MMMM dd, yyyy h:mm:ss tt",g:"M/d/yyyy h:mm tt",G:"M/d/yyyy h:mm:ss tt",m:"MMMM dd",M:"MMMM dd",s:"yyyy'-'MM'-'ddTHH':'mm':'ss",t:"h:mm tt",T:"h:mm:ss tt",u:"yyyy'-'MM'-'dd HH':'mm':'ss'Z'",y:"MMMM, yyyy",Y:"MMMM, yyyy"},"/":"/",":":":",firstDay:0,twoDigitYearMax:2029}}},be.culture=function(e){var r,o=be.cultures;return e===n?o.current:(r=t(e)||o[w],r.calendar=r.calendars.standard,o.current=r,n)},be.findCulture=t,be.getCulture=r,be.culture(w),s=function(e,t,r,o){var i,a,s,u,l,c,d=e.indexOf(o[h]),f=o.groupSize.slice(),p=f.shift();if(r=d!==-1?d:r+1,i=e.substring(t,r),a=i.length,a>=p){for(s=a,u=[];s>-1;)if(l=i.substring(s-p,s),l&&u.push(l),s-=p,c=f.shift(),p=c!==n?c:p,0===p){s>0&&u.push(i.substring(0,s));break}i=u.reverse().join(o[g]),e=e.substring(0,t)+i+e.substring(r)}return e},u=function(e,t,n){return t=t||0,e=(""+e).split("e"),e=Math.round(+(e[0]+"e"+(e[1]?+e[1]+t:t))),n&&(e=-e),e=(""+e).split("e"),e=+(e[0]+"e"+(e[1]?+e[1]-t:-t)),e.toFixed(Math.min(t,20))},l=function(e,t,r){if(t){if("[object Date]"===M.call(e))return o(e,t,r);if(typeof e===Fe)return a(e,t,r)}return e!==n?e:""},be.format=function(e){var t=arguments;return e.replace(Ce,function(e,n,r){var o=t[parseInt(n,10)+1];return l(o,r?r.substring(1):"")})},be._extractFormat=function(e){return"{0:"===e.slice(0,3)&&(e=e.slice(3,e.length-1)),e},be._activeElement=function(){try{return document.activeElement}catch(e){return document.documentElement.activeElement}},be._round=u,be._outerWidth=function(t,n){return e(t).outerWidth(n||!1)||0},be._outerHeight=function(t,n){return e(t).outerHeight(n||!1)||0},be.toString=l}(),function(){function t(e,t,n){return!(e>=t&&e<=n)}function r(e){return e.charAt(0)}function o(t){return e.map(t,r)}function i(e,t){t||23!==e.getHours()||e.setHours(e.getHours()+2)}function a(e){for(var t=0,n=e.length,r=[];t<n;t++)r[t]=(e[t]+"").toLowerCase();return r}function s(e){var t,n={};for(t in e)n[t]=a(e[t]);return n}function u(e,r,a,u){if(!e)return null;var l,c,d,f,p,g,y,v,b,M,x,S,k,T=function(e){for(var t=0;r[R]===e;)t++,R++;return t>0&&(R-=1),t},O=function(t){var n=w[t]||RegExp("^\\d{1,"+t+"}"),r=e.substr(j,t).match(n);return r?(r=r[0],j+=r.length,parseInt(r,10)):null},z=function(t,n){for(var r,o,i,a=0,s=t.length,u=0,l=0;a<s;a++)r=t[a],o=r.length,i=e.substr(j,o),n&&(i=i.toLowerCase()),i==r&&o>u&&(u=o,l=a);return u?(j+=u,l+1):null},D=function(){var t=!1;return e.charAt(j)===r[R]&&(j++,t=!0),t},C=a.calendars.standard,A=null,E=null,_=null,H=null,F=null,N=null,P=null,R=0,j=0,U=!1,I=new Date,W=C.twoDigitYearMax||2029,$=I.getFullYear();for(r||(r="d"),f=C.patterns[r],f&&(r=f),r=r.split(""),d=r.length;R<d;R++)if(l=r[R],U)"'"===l?U=!1:D();else if("d"===l){if(c=T("d"),C._lowerDays||(C._lowerDays=s(C.days)),null!==_&&c>2)continue;if(_=c<3?O(2):z(C._lowerDays[3==c?"namesAbbr":"names"],!0),null===_||t(_,1,31))return null}else if("M"===l){if(c=T("M"),C._lowerMonths||(C._lowerMonths=s(C.months)),E=c<3?O(2):z(C._lowerMonths[3==c?"namesAbbr":"names"],!0),null===E||t(E,1,12))return null;E-=1}else if("y"===l){if(c=T("y"),A=O(c),null===A)return null;2==c&&("string"==typeof W&&(W=$+parseInt(W,10)),A=$-$%100+A,A>W&&(A-=100))}else if("h"===l){if(T("h"),H=O(2),12==H&&(H=0),null===H||t(H,0,11))return null}else if("H"===l){if(T("H"),H=O(2),null===H||t(H,0,23))return null}else if("m"===l){if(T("m"),F=O(2),null===F||t(F,0,59))return null}else if("s"===l){if(T("s"),N=O(2),null===N||t(N,0,59))return null}else if("f"===l){if(c=T("f"),k=e.substr(j,c).match(w[3]),P=O(c),null!==P&&(P=parseFloat("0."+k[0],10),P=be._round(P,3),P*=1e3),null===P||t(P,0,999))return null}else if("t"===l){if(c=T("t"),v=C.AM,b=C.PM,1===c&&(v=o(v),b=o(b)),p=z(b),!p&&!z(v))return null}else if("z"===l){if(g=!0,c=T("z"),"Z"===e.substr(j,1)){D();continue}if(y=e.substr(j,6).match(c>2?h:m),!y)return null;if(y=y[0].split(":"),M=y[0],x=y[1],!x&&M.length>3&&(j=M.length-2,x=M.substring(j),M=M.substring(0,j)),M=parseInt(M,10),t(M,-12,13))return null;if(c>2&&(x=y[0][0]+x,x=parseInt(x,10),isNaN(x)||t(x,-59,59)))return null}else if("'"===l)U=!0,D();else if(!D())return null;return u&&!/^\s*$/.test(e.substr(j))?null:(S=null!==H||null!==F||N||null,null===A&&null===E&&null===_&&S?(A=$,E=I.getMonth(),_=I.getDate()):(null===A&&(A=$),null===_&&(_=1)),p&&H<12&&(H+=12),g?(M&&(H+=-M),x&&(F+=-x),e=new Date(Date.UTC(A,E,_,H,F,N,P))):(e=new Date(A,E,_,H,F,N,P),i(e,H)),A<100&&e.setFullYear(A),e.getDate()!==_&&g===n?null:e)}function l(e){var t="-"===e.substr(0,1)?-1:1;return e=e.substring(1),e=60*parseInt(e.substr(0,2),10)+parseInt(e.substring(2),10),t*e}function c(e){var t,n,r,o=Te.max(v.length,b.length),i=e.calendar||e.calendars.standard,a=i.patterns,s=[];for(r=0;r<o;r++){for(t=v[r],n=0;n<t.length;n++)s.push(a[t[n]]);s=s.concat(b[r])}return s}function d(e,t,n,r){var o,i,a,s;if("[object Date]"===M.call(e))return e;if(o=0,i=null,e&&0===e.indexOf("/D")&&(i=g.exec(e)))return i=i[1],s=y.exec(i.substring(1)),i=new Date(parseInt(i,10)),s&&(s=l(s[0]),i=be.timezone.apply(i,0),i=be.timezone.convert(i,0,-1*s)),i;for(n=be.getCulture(n),t||(t=c(n)),t=xe(t)?t:[t],a=t.length;o<a;o++)if(i=u(e,t[o],n,r))return i;return i}var f=/\u00A0/g,p=/[eE][\-+]?[0-9]+/,m=/[+|\-]\d{1,2}/,h=/[+|\-]\d{1,2}:?\d{2}/,g=/^\/Date\((.*?)\)\/$/,y=/[+-]\d*/,v=[[],["G","g","F"],["D","d","y","m","T","t"]],b=[["yyyy-MM-ddTHH:mm:ss.fffffffzzz","yyyy-MM-ddTHH:mm:ss.fffffff","yyyy-MM-ddTHH:mm:ss.fffzzz","yyyy-MM-ddTHH:mm:ss.fff","ddd MMM dd yyyy HH:mm:ss","yyyy-MM-ddTHH:mm:sszzz","yyyy-MM-ddTHH:mmzzz","yyyy-MM-ddTHH:mmzz","yyyy-MM-ddTHH:mm:ss","yyyy-MM-dd HH:mm:ss","yyyy/MM/dd HH:mm:ss"],["yyyy-MM-ddTHH:mm","yyyy-MM-dd HH:mm","yyyy/MM/dd HH:mm"],["yyyy/MM/dd","yyyy-MM-dd","HH:mm:ss","HH:mm"]],w={2:/^\d{1,2}/,3:/^\d{1,3}/,4:/^\d{4}/},M={}.toString;be.parseDate=function(e,t,n){return d(e,t,n,!1)},be.parseExactDate=function(e,t,n){return d(e,t,n,!0)},be.parseInt=function(e,t){var n=be.parseFloat(e,t);return n&&(n=0|n),n},be.parseFloat=function(e,t,n){if(!e&&0!==e)return null;if(typeof e===Fe)return e;e=""+e,t=be.getCulture(t);var r,o,i=t.numberFormat,a=i.percent,s=i.currency,u=s.symbol,l=a.symbol,c=e.indexOf("-");return p.test(e)?(e=parseFloat(e.replace(i["."],".")),isNaN(e)&&(e=null),e):c>0?null:(c=c>-1,e.indexOf(u)>-1||n&&n.toLowerCase().indexOf("c")>-1?(i=s,r=i.pattern[0].replace("$",u).split("n"),e.indexOf(r[0])>-1&&e.indexOf(r[1])>-1&&(e=e.replace(r[0],"").replace(r[1],""),c=!0)):e.indexOf(l)>-1&&(o=!0,i=a,u=l),e=e.replace("-","").replace(u,"").replace(f," ").split(i[","].replace(f," ")).join("").replace(i["."],"."),e=parseFloat(e),isNaN(e)?e=null:c&&(e*=-1),e&&o&&(e/=100),e)}}(),function(){var r,o,i,a,s,u,l,c,f,p,m,h;ze._scrollbar=n,ze.scrollbar=function(e){if(isNaN(ze._scrollbar)||e){var t,n=document.createElement("div");return n.style.cssText="overflow:scroll;overflow-x:hidden;zoom:1;clear:both;display:block",n.innerHTML="&nbsp;",document.body.appendChild(n),ze._scrollbar=t=n.offsetWidth-n.scrollWidth,document.body.removeChild(n),t}return ze._scrollbar},ze.isRtl=function(t){return e(t).closest(".k-rtl").length>0},r=document.createElement("table");try{r.innerHTML="<tr><td></td></tr>",ze.tbodyInnerHtml=!0}catch(g){ze.tbodyInnerHtml=!1}ze.touch="ontouchstart"in t,o=document.documentElement.style,i=ze.transitions=!1,a=ze.transforms=!1,s="HTMLElement"in t?HTMLElement.prototype:[],ze.hasHW3D="WebKitCSSMatrix"in t&&"m11"in new t.WebKitCSSMatrix||"MozPerspective"in o||"msPerspective"in o,ze.cssFlexbox="flexWrap"in o||"WebkitFlexWrap"in o||"msFlexWrap"in o,Me(["Moz","webkit","O","ms"],function(){var e,t=""+this,n=typeof r.style[t+"Transition"]===He;if(n||typeof r.style[t+"Transform"]===He)return e=t.toLowerCase(),a={css:"ms"!=e?"-"+e+"-":"",prefix:t,event:"o"===e||"webkit"===e?e:""},n&&(i=a,i.event=i.event?i.event+"TransitionEnd":"transitionend"),!1}),r=null,ze.transforms=a,ze.transitions=i,ze.devicePixelRatio=t.devicePixelRatio===n?1:t.devicePixelRatio;try{ze.screenWidth=t.outerWidth||t.screen?t.screen.availWidth:t.innerWidth,ze.screenHeight=t.outerHeight||t.screen?t.screen.availHeight:t.innerHeight}catch(g){ze.screenWidth=t.screen.availWidth,ze.screenHeight=t.screen.availHeight}ze.detectOS=function(e){var n,r,o=!1,i=[],a=!/mobile safari/i.test(e),s={wp:/(Windows Phone(?: OS)?)\s(\d+)\.(\d+(\.\d+)?)/,fire:/(Silk)\/(\d+)\.(\d+(\.\d+)?)/,android:/(Android|Android.*(?:Opera|Firefox).*?\/)\s*(\d+)\.?(\d+(\.\d+)?)?/,iphone:/(iPhone|iPod).*OS\s+(\d+)[\._]([\d\._]+)/,ipad:/(iPad).*OS\s+(\d+)[\._]([\d_]+)/,meego:/(MeeGo).+NokiaBrowser\/(\d+)\.([\d\._]+)/,webos:/(webOS)\/(\d+)\.(\d+(\.\d+)?)/,blackberry:/(BlackBerry|BB10).*?Version\/(\d+)\.(\d+(\.\d+)?)/,playbook:/(PlayBook).*?Tablet\s*OS\s*(\d+)\.(\d+(\.\d+)?)/,windows:/(MSIE)\s+(\d+)\.(\d+(\.\d+)?)/,tizen:/(tizen).*?Version\/(\d+)\.(\d+(\.\d+)?)/i,sailfish:/(sailfish).*rv:(\d+)\.(\d+(\.\d+)?).*firefox/i,ffos:/(Mobile).*rv:(\d+)\.(\d+(\.\d+)?).*Firefox/},u={ios:/^i(phone|pad|pod)$/i,android:/^android|fire$/i,blackberry:/^blackberry|playbook/i,windows:/windows/,wp:/wp/,flat:/sailfish|ffos|tizen/i,meego:/meego/},l={tablet:/playbook|ipad|fire/i},c={omini:/Opera\sMini/i,omobile:/Opera\sMobi/i,firefox:/Firefox|Fennec/i,mobilesafari:/version\/.*safari/i,ie:/MSIE|Windows\sPhone/i,chrome:/chrome|crios/i,webkit:/webkit/i};for(r in s)if(s.hasOwnProperty(r)&&(i=e.match(s[r]))){if("windows"==r&&"plugins"in navigator)return!1;o={},o.device=r,o.tablet=d(r,l,!1),o.browser=d(e,c,"default"),o.name=d(r,u),o[o.name]=!0,o.majorVersion=i[2],o.minorVersion=(i[3]||"0").replace("_","."),n=o.minorVersion.replace(".","").substr(0,2),o.flatVersion=o.majorVersion+n+Array(3-(n.length<3?n.length:2)).join("0"),o.cordova=typeof t.PhoneGap!==je||typeof t.cordova!==je,o.appMode=t.navigator.standalone||/file|local|wmapp/.test(t.location.protocol)||o.cordova,o.android&&(ze.devicePixelRatio<1.5&&o.flatVersion<400||a)&&(ze.screenWidth>800||ze.screenHeight>800)&&(o.tablet=r);break}return o},u=ze.mobileOS=ze.detectOS(navigator.userAgent),ze.wpDevicePixelRatio=u.wp?screen.width/320:0,ze.hasNativeScrolling=!1,(u.ios||u.android&&u.majorVersion>2||u.wp)&&(ze.hasNativeScrolling=u),ze.delayedClick=function(){if(ze.touch){if(u.ios)return!0;if(u.android)return!ze.browser.chrome||!(ze.browser.version<32)&&!(e("meta[name=viewport]").attr("content")||"").match(/user-scalable=no/i)}return!1},ze.mouseAndTouchPresent=ze.touch&&!(ze.mobileOS.ios||ze.mobileOS.android),ze.detectBrowser=function(e){var t,n=!1,r=[],o={edge:/(edge)[ \/]([\w.]+)/i,webkit:/(chrome|crios)[ \/]([\w.]+)/i,safari:/(webkit)[ \/]([\w.]+)/i,opera:/(opera)(?:.*version|)[ \/]([\w.]+)/i,msie:/(msie\s|trident.*? rv:)([\w.]+)/i,mozilla:/(mozilla)(?:.*? rv:([\w.]+)|)/i};for(t in o)if(o.hasOwnProperty(t)&&(r=e.match(o[t]))){n={},n[t]=!0,n[r[1].toLowerCase().split(" ")[0].split("/")[0]]=!0,n.version=parseInt(document.documentMode||r[2],10);break}return n},ze.browser=ze.detectBrowser(navigator.userAgent),ze.detectClipboardAccess=function(){var e={copy:!!document.queryCommandSupported&&document.queryCommandSupported("copy"),cut:!!document.queryCommandSupported&&document.queryCommandSupported("cut"),paste:!!document.queryCommandSupported&&document.queryCommandSupported("paste")};return ze.browser.chrome&&(e.paste=!1,ze.browser.version>=43&&(e.copy=!0,e.cut=!0)),e},ze.clipboard=ze.detectClipboardAccess(),ze.zoomLevel=function(){var e,n,r;try{return e=ze.browser,n=0,r=document.documentElement,e.msie&&11==e.version&&r.scrollHeight>r.clientHeight&&!ze.touch&&(n=ze.scrollbar()),ze.touch?r.clientWidth/t.innerWidth:e.msie&&e.version>=10?((top||t).document.documentElement.offsetWidth+n)/(top||t).innerWidth:1}catch(o){return 1}},ze.cssBorderSpacing=n!==o.borderSpacing&&!(ze.browser.msie&&ze.browser.version<8),function(t){var n="",r=e(document.documentElement),o=parseInt(t.version,10);t.msie?n="ie":t.mozilla?n="ff":t.safari?n="safari":t.webkit?n="webkit":t.opera?n="opera":t.edge&&(n="edge"),n&&(n="k-"+n+" k-"+n+o),ze.mobileOS&&(n+=" k-mobile"),ze.cssFlexbox||(n+=" k-no-flexbox"),r.addClass(n)}(ze.browser),ze.eventCapture=document.documentElement.addEventListener,l=document.createElement("input"),ze.placeholder="placeholder"in l,ze.propertyChangeEvent="onpropertychange"in l,ze.input=function(){for(var e,t=["number","date","time","month","week","datetime","datetime-local"],n=t.length,r="test",o={},i=0;i<n;i++)e=t[i],l.setAttribute("type",e),l.value=r,o[e.replace("-","")]="text"!==l.type&&l.value!==r;return o}(),l.style.cssText="float:left;",ze.cssFloat=!!l.style.cssFloat,l=null,ze.stableSort=function(){var e,t=513,n=[{index:0,field:"b"}];for(e=1;e<t;e++)n.push({index:e,field:"a"});return n.sort(function(e,t){return e.field>t.field?1:e.field<t.field?-1:0}),1===n[0].index}(),ze.matchesSelector=s.webkitMatchesSelector||s.mozMatchesSelector||s.msMatchesSelector||s.oMatchesSelector||s.matchesSelector||s.matches||function(t){for(var n=document.querySelectorAll?(this.parentNode||document).querySelectorAll(t)||[]:e(t),r=n.length;r--;)if(n[r]==this)return!0;return!1},ze.matchMedia="matchMedia"in t,ze.pushState=t.history&&t.history.pushState,c=document.documentMode,ze.hashChange="onhashchange"in t&&!(ze.browser.msie&&(!c||c<=8)),ze.customElements="registerElement"in t.document,f=ze.browser.chrome,p=ze.browser.crios,m=ze.browser.mozilla,h=ze.browser.safari,ze.msPointers=!f&&t.MSPointerEvent,ze.pointers=!f&&!p&&!m&&!h&&t.PointerEvent,ze.kineticScrollNeeded=u&&(ze.touch||ze.msPointers||ze.pointers)}(),Y={left:{reverse:"right"},right:{reverse:"left"},down:{reverse:"up"},up:{reverse:"down"},top:{reverse:"bottom"},bottom:{reverse:"top"},"in":{reverse:"out"},out:{reverse:"in"}},q={},e.extend(q,{enabled:!0,Element:function(t){this.element=e(t)},promise:function(e,t){e.is(":visible")||e.css({display:e.data("olddisplay")||"block"}).css("display"),t.hide&&e.data("olddisplay",e.css("display")).hide(),t.init&&t.init(),t.completeCallback&&t.completeCallback(e),e.dequeue()},disable:function(){this.enabled=!1,this.promise=this.promiseShim},enable:function(){this.enabled=!0,this.promise=this.animatedPromise}}),q.promiseShim=q.promise,"kendoAnimate"in e.fn||we(e.fn,{kendoStop:function(e,t){return this.stop(e,t)},kendoAnimate:function(e,t,n,r){return x(this,e,t,n,r)},kendoAddClass:function(e,t){return be.toggleClass(this,e,t,!0)},kendoRemoveClass:function(e,t){return be.toggleClass(this,e,t,!1)},kendoToggleClass:function(e,t,n){return be.toggleClass(this,e,t,n)}}),J=/&/g,V=/</g,G=/"/g,K=/'/g,Q=/>/g,Z=function(e){return e.target},ze.touch&&(Z=function(e){var t="originalEvent"in e?e.originalEvent.changedTouches:"changedTouches"in e?e.changedTouches:null;return t?document.elementFromPoint(t[0].clientX,t[0].clientY):e.target},Me(["swipe","swipeLeft","swipeRight","swipeUp","swipeDown","doubleTap","tap"],function(t,n){e.fn[n]=function(e){return this.bind(n,e)}})),ze.touch?ze.mobileOS?(ze.mousedown="touchstart",ze.mouseup="touchend",ze.mousemove="touchmove",ze.mousecancel="touchcancel",ze.click="touchend",ze.resize="orientationchange"):(ze.mousedown="mousedown touchstart",ze.mouseup="mouseup touchend",ze.mousemove="mousemove touchmove",ze.mousecancel="mouseleave touchcancel",ze.click="click",ze.resize="resize"):ze.pointers?(ze.mousemove="pointermove",ze.mousedown="pointerdown",ze.mouseup="pointerup",ze.mousecancel="pointercancel",ze.click="pointerup",ze.resize="orientationchange resize"):ze.msPointers?(ze.mousemove="MSPointerMove",ze.mousedown="MSPointerDown",ze.mouseup="MSPointerUp",ze.mousecancel="MSPointerCancel",ze.click="MSPointerUp",ze.resize="orientationchange resize"):(ze.mousemove="mousemove",ze.mousedown="mousedown",ze.mouseup="mouseup",ze.mousecancel="mouseleave",ze.click="click",ze.resize="resize"),X=function(e,t){var n,r,o,i,a=t||"d",s=1;for(r=0,o=e.length;r<o;r++)i=e[r],""!==i&&(n=i.indexOf("["),0!==n&&(n==-1?i="."+i:(s++,i="."+i.substring(0,n)+" || {})"+i.substring(n))),s++,a+=i+(r<o-1?" || {})":")"));return Array(s).join("(")+a},ee=/^([a-z]+:)?\/\//i,we(be,{widgets:[],_widgetRegisteredCallbacks:[],ui:be.ui||{},fx:be.fx||w,effects:be.effects||q,mobile:be.mobile||{},data:be.data||{},dataviz:be.dataviz||{},drawing:be.drawing||{},spreadsheet:{messages:{}},keys:{INSERT:45,DELETE:46,BACKSPACE:8,TAB:9,ENTER:13,ESC:27,LEFT:37,UP:38,RIGHT:39,DOWN:40,END:35,HOME:36,SPACEBAR:32,PAGEUP:33,PAGEDOWN:34,F2:113,F10:121,F12:123,NUMPAD_PLUS:107,NUMPAD_MINUS:109,NUMPAD_DOT:110},support:be.support||ze,animate:be.animate||x,ns:"",attr:function(e){return"data-"+be.ns+e},getShadows:a,wrap:s,deepExtend:l,getComputedStyles:m,isScrollable:h,scrollLeft:g,size:y,toCamelCase:p,toHyphens:f,getOffset:be.getOffset||v,parseEffects:be.parseEffects||b,toggleClass:be.toggleClass||S,directions:be.directions||Y,
Observable:R,Class:r,Template:H,template:Se(H.compile,H),render:Se(H.render,H),stringify:Se(Oe.stringify,Oe),eventTarget:Z,htmlEncode:k,unescape:T,isLocalUrl:function(e){return e&&!ee.test(e)},expr:function(e,t,n){return e=e||"",typeof t==He&&(n=t,t=!1),n=n||"d",e&&"["!==e.charAt(0)&&(e="."+e),t?(e=e.replace(/"([^.]*)\.([^"]*)"/g,'"$1_$DOT$_$2"'),e=e.replace(/'([^.]*)\.([^']*)'/g,"'$1_$DOT$_$2'"),e=X(e.split("."),n),e=e.replace(/_\$DOT\$_/g,".")):e=n+e,e},getter:function(e,t){var n=e+t;return Ue[n]=Ue[n]||Function("d","return "+be.expr(e,t))},setter:function(e){return Ie[e]=Ie[e]||Function("d,value",be.expr(e)+"=value")},accessor:function(e){return{get:be.getter(e),set:be.setter(e)}},guid:function(){var e,t,n="";for(e=0;e<32;e++)t=16*Te.random()|0,8!=e&&12!=e&&16!=e&&20!=e||(n+="-"),n+=(12==e?4:16==e?3&t|8:t).toString(16);return n},roleSelector:function(e){return e.replace(/(\S+)/g,"["+be.attr("role")+"=$1],").slice(0,-1)},directiveSelector:function(e){var t,n=e.split(" ");if(n)for(t=0;t<n.length;t++)"view"!=n[t]&&(n[t]=n[t].replace(/(\w*)(view|bar|strip|over)$/,"$1-$2"));return n.join(" ").replace(/(\S+)/g,"kendo-mobile-$1,").slice(0,-1)},triggeredByInput:function(e){return/^(label|input|textarea|select)$/i.test(e.target.tagName)},onWidgetRegistered:function(e){for(var t=0,n=be.widgets.length;t<n;t++)e(be.widgets[t]);be._widgetRegisteredCallbacks.push(e)},logToConsole:function(e,r){var o=t.console;!be.suppressLog&&n!==o&&o.log&&o[r||"log"](e)}}),te=R.extend({init:function(e,t){var n,r,o=this;o.element=be.jQuery(e).handler(o),o.angular("init",t),R.fn.init.call(o),n=t?t.dataSource:null,t&&(r=(o.componentTypes||{})[(t||{}).componentType]),n&&(t=we({},t,{dataSource:{}})),t=o.options=we(!0,{},o.options,o.defaults,r||{},t),n&&(t.dataSource=n),o.element.attr(be.attr("role"))||o.element.attr(be.attr("role"),(t.name||"").toLowerCase()),o.element.data("kendo"+t.prefix+t.name,o),o.bind(o.events,t)},events:[],options:{prefix:""},_hasBindingTarget:function(){return!!this.element[0].kendoBindingTarget},_tabindex:function(e){e=e||this.wrapper;var t=this.element,n="tabindex",r=e.attr(n)||t.attr(n);t.removeAttr(n),e.attr(n,isNaN(r)?0:r)},setOptions:function(t){this._setEvents(t),e.extend(this.options,t)},_setEvents:function(e){for(var t,n=this,r=0,o=n.events.length;r<o;r++)t=n.events[r],n.options[t]&&e[t]&&(n.unbind(t,n.options[t]),n._events&&n._events[t]&&delete n._events[t]);n.bind(n.events,e)},resize:function(e){var t=this.getSize(),n=this._size;(e||(t.width>0||t.height>0)&&(!n||t.width!==n.width||t.height!==n.height))&&(this._size=t,this._resize(t,e),this.trigger("resize",t))},getSize:function(){return be.dimensions(this.element)},size:function(e){return e?(this.setSize(e),n):this.getSize()},setSize:e.noop,_resize:e.noop,destroy:function(){var e=this;e.element.removeData("kendo"+e.options.prefix+e.options.name),e.element.removeData("handler"),e.unbind()},_destroy:function(){this.destroy()},angular:function(){},_muteAngularRebind:function(e){this._muteRebind=!0,e.call(this),this._muteRebind=!1}}),ne=te.extend({dataItems:function(){return this.dataSource.flatView()},_angularItems:function(t){var n=this;n.angular(t,function(){return{elements:n.items(),data:e.map(n.dataItems(),function(e){return{dataItem:e}})}})}}),be.dimensions=function(e,t){var n=e[0];return t&&e.css(t),{width:n.offsetWidth,height:n.offsetHeight}},be.notify=ke,re=/template$/i,oe=/^\s*(?:\{(?:.|\r\n|\n)*\}|\[(?:.|\r\n|\n)*\])\s*$/,ie=/^\{(\d+)(:[^\}]+)?\}|^\[[A-Za-z_]+\]$/,ae=/([A-Z])/g,be.initWidget=function(r,o,i){var a,s,u,l,c,d,f,p,m,h,g,y,v;if(i?i.roles&&(i=i.roles):i=be.ui.roles,r=r.nodeType?r:r[0],d=r.getAttribute("data-"+be.ns+"role")){m=d.indexOf(".")===-1,u=m?i[d]:be.getter(d)(t),g=e(r).data(),y=u?"kendo"+u.fn.options.prefix+u.fn.options.name:"",h=m?RegExp("^kendo.*"+d+"$","i"):RegExp("^"+y+"$","i");for(v in g)if(v.match(h)){if(v!==y)return g[v];a=g[v]}if(u){for(p=O(r,"dataSource"),o=e.extend({},z(r,e.extend({},u.fn.options,u.fn.defaults)),o),p&&(o.dataSource=typeof p===He?be.getter(p)(t):p),l=0,c=u.fn.events.length;l<c;l++)s=u.fn.events[l],f=O(r,s),f!==n&&(o[s]=be.getter(f)(t));return a?e.isEmptyObject(o)||a.setOptions(o):a=new u(r,o),a}}},be.rolesFromNamespaces=function(e){var t,n,r=[];for(e[0]||(e=[be.ui,be.dataviz.ui]),t=0,n=e.length;t<n;t++)r[t]=e[t].roles;return we.apply(null,[{}].concat(r.reverse()))},be.init=function(t){var n=be.rolesFromNamespaces(We.call(arguments,1));e(t).find("[data-"+be.ns+"role]").addBack().each(function(){be.initWidget(this,{},n)})},be.destroy=function(t){e(t).find("[data-"+be.ns+"role]").addBack().each(function(){var t,n=e(this).data();for(t in n)0===t.indexOf("kendo")&&typeof n[t].destroy===_e&&n[t].destroy()})},be.resize=function(t,n){var r,o=e(t).find("[data-"+be.ns+"role]").addBack().filter(C);o.length&&(r=e.makeArray(o),r.sort(D),e.each(r,function(){var t=be.widgetInstance(e(this));t&&t.resize(n)}))},be.parseOptions=z,we(be.ui,{Widget:te,DataBoundWidget:ne,roles:{},progress:function(t,n,r){var o,i,a,s,u,l=t.find(".k-loading-mask"),c=be.support,d=c.browser;r=e.extend({},{width:"100%",height:"100%",top:t.scrollTop(),opacity:!1},r),u=r.opacity?"k-loading-mask k-opaque":"k-loading-mask",n?l.length||(o=c.isRtl(t),i=o?"right":"left",s=t.scrollLeft(),a=d.webkit&&o?t[0].scrollWidth-t.width()-2*s:0,l=e(be.format("<div class='{0}'><span class='k-loading-text'>{1}</span><div class='k-loading-image'></div><div class='k-loading-color'></div></div>",u,be.ui.progress.messages.loading)).width(r.width).height(r.height).css("top",r.top).css(i,Math.abs(s)+a).prependTo(t)):l&&l.remove()},plugin:function(t,r,o){var i,a,s,u,l=t.fn.options.name;for(r=r||be.ui,o=o||"",r[l]=t,r.roles[l.toLowerCase()]=t,i="getKendo"+o+l,l="kendo"+o+l,a={name:l,widget:t,prefix:o||""},be.widgets.push(a),s=0,u=be._widgetRegisteredCallbacks.length;s<u;s++)be._widgetRegisteredCallbacks[s](a);e.fn[l]=function(r){var o,i=this;return typeof r===He?(o=We.call(arguments,1),this.each(function(){var t,a,s=e.data(this,l);if(!s)throw Error(be.format("Cannot call method '{0}' of {1} before it is initialized",r,l));if(t=s[r],typeof t!==_e)throw Error(be.format("Cannot find method '{0}' of {1}",r,l));if(a=t.apply(s,o),a!==n)return i=a,!1})):this.each(function(){return new t(this,r)}),i},e.fn[l].widget=t,e.fn[i]=function(){return this.data(l)}}}),be.ui.progress.messages={loading:"Loading..."},se={bind:function(){return this},nullObject:!0,options:{}},ue=te.extend({init:function(e,t){te.fn.init.call(this,e,t),this.element.autoApplyNS(),this.wrapper=this.element,this.element.addClass("km-widget")},destroy:function(){te.fn.destroy.call(this),this.element.kendoDestroy()},options:{prefix:"Mobile"},events:[],view:function(){var e=this.element.closest(be.roleSelector("view splitview modalview drawer"));return be.widgetInstance(e,be.mobile.ui)||se},viewHasNativeScrolling:function(){var e=this.view();return e&&e.options.useNativeScrolling},container:function(){var e=this.element.closest(be.roleSelector("view layout modalview drawer splitview"));return be.widgetInstance(e.eq(0),be.mobile.ui)||se}}),we(be.mobile,{init:function(e){be.init(e,be.mobile.ui,be.ui,be.dataviz.ui)},appLevelNativeScrolling:function(){return be.mobile.application&&be.mobile.application.options&&be.mobile.application.options.useNativeScrolling},roles:{},ui:{Widget:ue,DataBoundWidget:ne.extend(ue.prototype),roles:{},plugin:function(e){be.ui.plugin(e,be.mobile.ui,"Mobile")}}}),l(be.dataviz,{init:function(e){be.init(e,be.dataviz.ui)},ui:{roles:{},themes:{},views:[],plugin:function(e){be.ui.plugin(e,be.dataviz.ui)}},roles:{}}),be.touchScroller=function(t,n){return n||(n={}),n.useNative=!0,e(t).map(function(t,r){return r=e(r),!(!ze.kineticScrollNeeded||!be.mobile.ui.Scroller||r.data("kendoMobileScroller"))&&(r.kendoMobileScroller(n),r.data("kendoMobileScroller"))})[0]},be.preventDefault=function(e){e.preventDefault()},be.widgetInstance=function(e,n){var r,o,i,a,s,u=e.data(be.ns+"role"),l=[],c=e.data("kendoView");if(u){if("content"===u&&(u="scroller"),"editortoolbar"===u&&(i=e.data("kendoEditorToolbar")))return i;if("view"===u&&c)return c;if(n)if(n[0])for(r=0,o=n.length;r<o;r++)l.push(n[r].roles[u]);else l.push(n.roles[u]);else l=[be.ui.roles[u],be.dataviz.ui.roles[u],be.mobile.ui.roles[u]];for(u.indexOf(".")>=0&&(l=[be.getter(u)(t)]),r=0,o=l.length;r<o;r++)if(a=l[r],a&&(s=e.data("kendo"+a.fn.options.prefix+a.fn.options.name)))return s}},be.onResize=function(n){var r=n;return ze.mobileOS.android&&(r=function(){setTimeout(n,600)}),e(t).on(ze.resize,r),r},be.unbindResize=function(n){e(t).off(ze.resize,n)},be.attrValue=function(e,t){return e.data(be.ns+t)},be.days={Sunday:0,Monday:1,Tuesday:2,Wednesday:3,Thursday:4,Friday:5,Saturday:6},e.extend(e.expr.pseudos,{kendoFocusable:function(t){var n=e.attr(t,"tabindex");return A(t,!isNaN(n)&&n>-1)}}),le=["mousedown","mousemove","mouseenter","mouseleave","mouseover","mouseout","mouseup","click"],ce="label, input, [data-rel=external]",de={setupMouseMute:function(){var t,n=0,r=le.length,o=document.documentElement;if(!de.mouseTrap&&ze.eventCapture)for(de.mouseTrap=!0,de.bustClick=!1,de.captureMouse=!1,t=function(t){de.captureMouse&&("click"===t.type?de.bustClick&&!e(t.target).is(ce)&&(t.preventDefault(),t.stopPropagation()):t.stopPropagation())};n<r;n++)o.addEventListener(le[n],t,!0)},muteMouse:function(e){de.captureMouse=!0,e.data.bustClick&&(de.bustClick=!0),clearTimeout(de.mouseTrapTimeoutID)},unMuteMouse:function(){clearTimeout(de.mouseTrapTimeoutID),de.mouseTrapTimeoutID=setTimeout(function(){de.captureMouse=!1,de.bustClick=!1},400)}},fe={down:"touchstart mousedown",move:"mousemove touchmove",up:"mouseup touchend touchcancel",cancel:"mouseleave touchcancel"},ze.touch&&(ze.mobileOS.ios||ze.mobileOS.android)?fe={down:"touchstart",move:"touchmove",up:"touchend touchcancel",cancel:"touchcancel"}:ze.pointers?fe={down:"pointerdown",move:"pointermove",up:"pointerup",cancel:"pointercancel pointerleave"}:ze.msPointers&&(fe={down:"MSPointerDown",move:"MSPointerMove",up:"MSPointerUp",cancel:"MSPointerCancel MSPointerLeave"}),!ze.msPointers||"onmspointerenter"in t||e.each({MSPointerEnter:"MSPointerOver",MSPointerLeave:"MSPointerOut"},function(t,n){e.event.special[t]={delegateType:n,bindType:n,handle:function(t){var r,o=this,i=t.relatedTarget,a=t.handleObj;return i&&(i===o||e.contains(o,i))||(t.type=a.origType,r=a.handler.apply(this,arguments),t.type=n),r}}}),pe=function(e){return fe[e]||e},me=/([^ ]+)/g,be.applyEventMap=function(e,t){return e=e.replace(me,pe),t&&(e=e.replace(me,"$1."+t)),e},be.keyDownHandler=function(e,t){var n,r,o=t._events.kendoKeydown;if(!o)return!0;for(o=o.slice(),e.sender=t,e.preventKendoKeydown=!1,n=0,r=o.length;n<r;n++)o[n].call(t,e);return!e.preventKendoKeydown},he=e.fn.on,$e(!0,_,e),_.fn=_.prototype=new e,_.fn.constructor=_,_.fn.init=function(t,n){return n&&n instanceof e&&!(n instanceof _)&&(n=_(n)),e.fn.init.call(this,t,n,ge)},_.fn.init.prototype=_.fn,ge=_(document),we(_.fn,{handler:function(e){return this.data("handler",e),this},autoApplyNS:function(e){return this.data("kendoNS",e||be.guid()),this},on:function(){var e,t,n,r,o,i,a,s,u=this,l=u.data("kendoNS");return 1===arguments.length?he.call(u,arguments[0]):(e=u,t=We.call(arguments),typeof t[t.length-1]===je&&t.pop(),n=t[t.length-1],r=be.applyEventMap(t[0],l),ze.mouseAndTouchPresent&&r.search(/mouse|click/)>-1&&this[0]!==document.documentElement&&(de.setupMouseMute(),o=2===t.length?null:t[1],i=r.indexOf("click")>-1&&r.indexOf("touchend")>-1,he.call(this,{touchstart:de.muteMouse,touchend:de.unMuteMouse},o,{bustClick:i})),arguments[0].indexOf("keydown")!==-1&&t[1]&&t[1].options?(t[0]=r,a=t[1],s=t[t.length-1],t[t.length-1]=function(e){if(be.keyDownHandler(e,a))return s.apply(this,[e])},he.apply(u,t),u):(typeof n===He&&(e=u.data("handler"),n=e[n],t[t.length-1]=function(t){n.call(e,t)}),t[0]=r,he.apply(u,t),u))},kendoDestroy:function(e){return e=e||this.data("kendoNS"),e&&this.off("."+e),this}}),be.jQuery=_,be.eventMap=fe,be.timezone=function(){function e(e,t){var n,r,o,i=t[3],a=t[4],s=t[5],u=t[8];return u||(t[8]=u={}),u[e]?u[e]:(isNaN(a)?0===a.indexOf("last")?(n=new Date(Date.UTC(e,c[i]+1,1,s[0]-24,s[1],s[2],0)),r=d[a.substr(4,3)],o=n.getUTCDay(),n.setUTCDate(n.getUTCDate()+r-o-(r>o?7:0))):a.indexOf(">=")>=0?(n=new Date(Date.UTC(e,c[i],a.substr(5),s[0],s[1],s[2],0)),r=d[a.substr(0,3)],o=n.getUTCDay(),n.setUTCDate(n.getUTCDate()+r-o+(r<o?7:0))):a.indexOf("<=")>=0&&(n=new Date(Date.UTC(e,c[i],a.substr(5),s[0],s[1],s[2],0)),r=d[a.substr(0,3)],o=n.getUTCDay(),n.setUTCDate(n.getUTCDate()+r-o-(r>o?7:0))):n=new Date(Date.UTC(e,c[i],a,s[0],s[1],s[2],0)),u[e]=n)}function t(t,n,r){var o,i,a,s;return(n=n[r])?(a=new Date(t).getUTCFullYear(),n=jQuery.grep(n,function(e){var t=e[0],n=e[1];return t<=a&&(n>=a||t==a&&"only"==n||"max"==n)}),n.push(t),n.sort(function(t,n){return"number"!=typeof t&&(t=+e(a,t)),"number"!=typeof n&&(n=+e(a,n)),t-n}),s=n[jQuery.inArray(t,n)-1]||n[n.length-1],isNaN(s)?s:null):(o=r.split(":"),i=0,o.length>1&&(i=60*o[0]+ +o[1]),[-1e6,"max","-","Jan",1,[0,0,0],i,"-"])}function n(e,t,n){var r,o,i,a=t[n];if("string"==typeof a&&(a=t[a]),!a)throw Error('Timezone "'+n+'" is either incorrect, or kendo.timezones.min.js is not included.');for(r=a.length-1;r>=0&&(o=a[r][3],!(o&&e>o));r--);if(i=a[r+1],!i)throw Error('Timezone "'+n+'" not found on '+e+".");return i}function r(e,r,o,i){typeof e!=Fe&&(e=Date.UTC(e.getFullYear(),e.getMonth(),e.getDate(),e.getHours(),e.getMinutes(),e.getSeconds(),e.getMilliseconds()));var a=n(e,r,i);return{zone:a,rule:t(e,o,a[1])}}function o(e,t){var n,o,i;return"Etc/UTC"==t||"Etc/GMT"==t?0:(n=r(e,this.zones,this.rules,t),o=n.zone,i=n.rule,be.parseFloat(i?o[0]-i[6]:o[0]))}function i(e,t){var n=r(e,this.zones,this.rules,t),o=n.zone,i=n.rule,a=o[2];return a.indexOf("/")>=0?a.split("/")[i&&+i[6]?1:0]:a.indexOf("%s")>=0?a.replace("%s",i&&"-"!=i[7]?i[7]:""):a}function a(e,t,n){var r,o,i,a=n;return typeof t==He&&(t=this.offset(e,t)),typeof n==He&&(n=this.offset(e,n)),o=e.getTimezoneOffset(),e=new Date(e.getTime()+6e4*(t-n)),i=e.getTimezoneOffset(),typeof a==He&&(a=this.offset(e,a)),r=i-o+(n-a),new Date(e.getTime()+6e4*r)}function s(e,t){return this.convert(e,e.getTimezoneOffset(),t)}function u(e,t){return this.convert(e,t,e.getTimezoneOffset())}function l(e){return this.apply(new Date(e),"Etc/UTC")}var c={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11},d={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};return{zones:{},rules:{},offset:o,convert:a,apply:s,remove:u,abbr:i,toLocalDate:l}}(),be.date=function(){function e(e,t){return 0===t&&23===e.getHours()&&(e.setHours(e.getHours()+2),!0)}function t(t,n,r){var o=t.getHours();r=r||1,n=(n-t.getDay()+7*r)%7,t.setDate(t.getDate()+n),e(t,o)}function r(e,n,r){return e=new Date(e),t(e,n,r),e}function o(e){return new Date(e.getFullYear(),e.getMonth(),1)}function i(e){var t=new Date(e.getFullYear(),e.getMonth()+1,0),n=o(e),r=Math.abs(t.getTimezoneOffset()-n.getTimezoneOffset());return r&&t.setHours(n.getHours()+r/60),t}function a(e,t){return 1!==t?m(r(e,t,-1),4):m(e,4-(e.getDay()||7))}function s(e,t){var n=new Date(e.getFullYear(),0,1,(-6)),r=a(e,t),o=r.getTime()-n.getTime(),i=Math.floor(o/M);return 1+Math.floor(i/7)}function u(e,t){var r,o,i;return t===n&&(t=be.culture().calendar.firstDay),r=m(e,-7),o=m(e,7),i=s(e,t),0===i?s(r,t)+1:53===i&&s(o,t)>1?1:i}function l(t){return t=new Date(t.getFullYear(),t.getMonth(),t.getDate(),0,0,0),e(t,0),t}function c(e){return Date.UTC(e.getFullYear(),e.getMonth(),e.getDate(),e.getHours(),e.getMinutes(),e.getSeconds(),e.getMilliseconds())}function d(e){return b(e).getTime()-l(b(e))}function f(e,t,n){var r,o=d(t),i=d(n);return!e||o==i||(t>=n&&(n+=M),r=d(e),o>r&&(r+=M),i<o&&(i+=M),r>=o&&r<=i)}function p(e,t,n){var r,o=t.getTime(),i=n.getTime();return o>=i&&(i+=M),r=e.getTime(),r>=o&&r<=i}function m(t,n){var r=t.getHours();return t=new Date(t),h(t,n*M),e(t,r),t}function h(e,t,n){var r,o=e.getTimezoneOffset();e.setTime(e.getTime()+t),n||(r=e.getTimezoneOffset()-o,e.setTime(e.getTime()+r*w))}function g(t,n){return t=new Date(t.getFullYear(),t.getMonth(),t.getDate(),n.getHours(),n.getMinutes(),n.getSeconds(),n.getMilliseconds()),e(t,n.getHours()),t}function y(){return l(new Date)}function v(e){return l(e).getTime()==y().getTime()}function b(e){var t=new Date(1980,1,1,0,0,0);return e&&t.setHours(e.getHours(),e.getMinutes(),e.getSeconds(),e.getMilliseconds()),t}var w=6e4,M=864e5;return{adjustDST:e,dayOfWeek:r,setDayOfWeek:t,getDate:l,isInDateRange:p,isInTimeRange:f,isToday:v,nextDay:function(e){return m(e,1)},previousDay:function(e){return m(e,-1)},toUtcTime:c,MS_PER_DAY:M,MS_PER_HOUR:60*w,MS_PER_MINUTE:w,setTime:h,setHours:g,addDays:m,today:y,toInvariantTime:b,firstDayOfMonth:o,lastDayOfMonth:i,weekInYear:u,getMilliseconds:d}}(),be.stripWhitespace=function(e){var t,n,r;if(document.createNodeIterator)for(t=document.createNodeIterator(e,NodeFilter.SHOW_TEXT,function(t){return t.parentNode==e?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT},!1);t.nextNode();)t.referenceNode&&!t.referenceNode.textContent.trim()&&t.referenceNode.parentNode.removeChild(t.referenceNode);else for(n=0;n<e.childNodes.length;n++)r=e.childNodes[n],3!=r.nodeType||/\S/.test(r.nodeValue)||(e.removeChild(r),n--),1==r.nodeType&&be.stripWhitespace(r)},ye=t.requestAnimationFrame||t.webkitRequestAnimationFrame||t.mozRequestAnimationFrame||t.oRequestAnimationFrame||t.msRequestAnimationFrame||function(e){setTimeout(e,1e3/60)},be.animationFrame=function(e){ye.call(t,e)},ve=[],be.queueAnimation=function(e){ve[ve.length]=e,1===ve.length&&be.runNextAnimation()},be.runNextAnimation=function(){be.animationFrame(function(){ve[0]&&(ve.shift()(),ve[0]&&be.runNextAnimation())})},be.parseQueryStringParams=function(e){for(var t=e.split("?")[1]||"",n={},r=t.split(/&|=/),o=r.length,i=0;i<o;i+=2)""!==r[i]&&(n[decodeURIComponent(r[i])]=decodeURIComponent(r[i+1]));return n},be.elementUnderCursor=function(e){if(n!==e.x.client)return document.elementFromPoint(e.x.client,e.y.client)},be.wheelDeltaY=function(e){var t,r=e.originalEvent,o=r.wheelDeltaY;return r.wheelDelta?(o===n||o)&&(t=r.wheelDelta):r.detail&&r.axis===r.VERTICAL_AXIS&&(t=10*-r.detail),t},be.throttle=function(e,t){var r,o,i=0;return!t||t<=0?e:(o=function(){function o(){e.apply(a,u),i=+new Date}var a=this,s=+new Date-i,u=arguments;return i?(r&&clearTimeout(r),s>t?o():r=setTimeout(o,t-s),n):o()},o.cancel=function(){clearTimeout(r)},o)},be.caret=function(t,r,o){var i,a,s,u,l,c=r!==n;if(o===n&&(o=r),t[0]&&(t=t[0]),!c||!t.disabled){try{t.selectionStart!==n?c?(t.focus(),a=ze.mobileOS,a.wp||a.android?setTimeout(function(){t.setSelectionRange(r,o)},0):t.setSelectionRange(r,o)):r=[t.selectionStart,t.selectionEnd]:document.selection&&(e(t).is(":visible")&&t.focus(),i=t.createTextRange(),c?(i.collapse(!0),i.moveStart("character",r),i.moveEnd("character",o-r),i.select()):(s=i.duplicate(),i.moveToBookmark(document.selection.createRange().getBookmark()),s.setEndPoint("EndToStart",i),u=s.text.length,l=u+i.text.length,r=[u,l]))}catch(d){r=[]}return r}},be.compileMobileDirective=function(e,n){var r=t.angular;return e.attr("data-"+be.ns+"role",e[0].tagName.toLowerCase().replace("kendo-mobile-","").replace("-","")),r.element(e).injector().invoke(["$compile",function(t){t(e)(n),/^\$(digest|apply)$/.test(n.$$phase)||n.$digest()}]),be.widgetInstance(e,be.mobile.ui)},be.antiForgeryTokens=function(){var t={},r=e("meta[name=csrf-token],meta[name=_csrf]").attr("content"),o=e("meta[name=csrf-param],meta[name=_csrf_header]").attr("content");return e("input[name^='__RequestVerificationToken']").each(function(){t[this.name]=this.value}),o!==n&&r!==n&&(t[o]=r),t},be.cycleForm=function(e){function t(e){var t=be.widgetInstance(e);t&&t.focus?t.focus():e.focus()}var n=e.find("input, .k-widget").first(),r=e.find("button, .k-button").last();r.on("keydown",function(e){e.keyCode!=be.keys.TAB||e.shiftKey||(e.preventDefault(),t(n))}),n.on("keydown",function(e){e.keyCode==be.keys.TAB&&e.shiftKey&&(e.preventDefault(),t(r))})},be.focusElement=function(n){var r=[],o=n.parentsUntil("body").filter(function(e,t){var n=be.getComputedStyles(t,["overflow"]);return"visible"!==n.overflow}).add(t);o.each(function(t,n){r[t]=e(n).scrollTop()});try{n[0].setActive()}catch(i){n[0].focus()}o.each(function(t,n){e(n).scrollTop(r[t])})},be.focusNextElement=function(){var t,n,r;document.activeElement&&(t=e(":kendoFocusable"),n=t.index(document.activeElement),n>-1&&(r=t[n+1]||t[0],r.focus()))},be.trim=function(e){return e?(""+e).trim():""},be.getWidgetFocusableElement=function(t){var n,r=t.closest(":kendoFocusable"),o=be.widgetInstance(t);return n=r.length?r:o?o instanceof be.ui.Editor?e(o.body):o.wrapper.find(":kendoFocusable").first():t},be.addAttribute=function(e,t,n){var r=e.attr(t)||"";r.indexOf(n)<0&&e.attr(t,(r+" "+n).trim())},be.removeAttribute=function(e,t,n){var r=e.attr(t)||"";e.attr(t,r.replace(n,"").trim())},be.toggleAttribute=function(e,t,n){var r=e.attr(t)||"";r.indexOf(n)<0?be.addAttribute(e,t,n):be.removeAttribute(e,t,n)},be.matchesMedia=function(e){var n=be._bootstrapToMedia(e)||e;return ze.matchMedia&&t.matchMedia(n).matches},be._bootstrapToMedia=function(e){return{xs:"(max-width: 576px)",sm:"(min-width: 576px)",md:"(min-width: 768px)",lg:"(min-width: 992px)",xl:"(min-width: 1200px)"}[e]},be.fileGroupMap={audio:[".aif",".iff",".m3u",".m4a",".mid",".mp3",".mpa",".wav",".wma",".ogg",".wav",".wma",".wpl"],video:[".3g2",".3gp",".avi",".asf",".flv",".m4u",".rm",".h264",".m4v",".mkv",".mov",".mp4",".mpg",".rm",".swf",".vob",".wmv"],image:[".ai",".dds",".heic",".jpe","jfif",".jif",".jp2",".jps",".eps",".bmp",".gif",".jpeg",".jpg",".png",".ps",".psd",".svg",".svgz",".tif",".tiff"],txt:[".doc",".docx",".log",".pages",".tex",".wpd",".wps",".odt",".rtf",".text",".txt",".wks"],presentation:[".key",".odp",".pps",".ppt",".pptx"],data:[".xlr",".xls",".xlsx"],programming:[".tmp",".bak",".msi",".cab",".cpl",".cur",".dll",".dmp",".drv",".icns",".ico",".link",".sys",".cfg",".ini",".asp",".aspx",".cer",".csr",".css",".dcr",".htm",".html",".js",".php",".rss",".xhtml"],pdf:[".pdf"],config:[".apk",".app",".bat",".cgi",".com",".exe",".gadget",".jar",".wsf"],zip:[".7z",".cbr",".gz",".sitx",".arj",".deb",".pkg",".rar",".rpm",".tar.gz",".z",".zip",".zipx"],"disc-image":[".dmg",".iso",".toast",".vcd",".bin",".cue",".mdf"]},be.getFileGroup=function(e,t){var r,o,i=be.fileGroupMap,a=Object.keys(i),s="file";if(e===n||!e.length)return s;for(r=0;r<a.length;r+=1)if(o=i[a[r]],o.indexOf(e.toLowerCase())>-1)return t?"file-"+a[r]:a[r];return s},be.getFileSizeMessage=function(e){var t,n=["Bytes","KB","MB","GB","TB"];return 0===e?"0 Byte":(t=parseInt(Math.floor(Math.log(e)/Math.log(1024)),10),Math.round(e/Math.pow(1024,t),2)+" "+n[t])},be.selectorFromClasses=function(e){return"."+e.split(" ").join(".")},function(){function n(t,n,r,o){var i,a,s=e("<form>").attr({action:r,method:"POST",target:o}),u=be.antiForgeryTokens();u.fileName=n,i=t.split(";base64,"),u.contentType=i[0].replace("data:",""),u.base64=i[1];for(a in u)u.hasOwnProperty(a)&&e("<input>").attr({value:u[a],name:a,type:"hidden"}).appendTo(s);s.appendTo("body").submit().remove()}function r(e,t){var n,r,o,i,a,s=e;if("string"==typeof e){for(n=e.split(";base64,"),r=n[0],o=atob(n[1]),i=new Uint8Array(o.length),a=0;a<o.length;a++)i[a]=o.charCodeAt(a);s=new Blob([i.buffer],{type:r})}navigator.msSaveBlob(s,t)}function o(e,n){t.Blob&&e instanceof Blob&&(e=URL.createObjectURL(e)),i.download=n,i.href=e;var r=document.createEvent("MouseEvents");r.initMouseEvent("click",!0,!1,t,0,0,0,0,0,!1,!1,!1,!1,0,null),i.dispatchEvent(r),setTimeout(function(){URL.revokeObjectURL(e)})}var i=document.createElement("a"),a="download"in i&&!be.support.browser.edge;be.saveAs=function(e){var t=n;e.forceProxy||(a?t=o:navigator.msSaveBlob&&(t=r)),t(e.dataURI,e.fileName,e.proxyURL,e.proxyTarget)}}(),be.proxyModelSetters=function(e){var t={};return Object.keys(e||{}).forEach(function(n){Object.defineProperty(t,n,{get:function(){return e[n]},set:function(t){e[n]=t,e.dirty=!0}})}),t},function(){be.defaults=be.defaults||{},be.setDefaults=function(e,t){var r=e.split("."),o=be.defaults;e=r.pop(),r.forEach(function(e){o[e]===n&&(o[e]={}),o=o[e]}),o[e]=t.constructor===Object?l({},o[e],t):t}}()}(jQuery,window),window.kendo},"function"==typeof define&&define.amd?define:function(e,t,n){(n||t)()});
//# sourceMappingURL=kendo.core.min.js.map
;
/** 
 * Kendo UI v2020.2.513 (http://www.telerik.com/kendo-ui)                                                                                                                                               
 * Copyright 2020 Progress Software Corporation and/or one of its subsidiaries or affiliates. All rights reserved.                                                                                      
 *                                                                                                                                                                                                      
 * Kendo UI commercial licenses may be obtained at                                                                                                                                                      
 * http://www.telerik.com/purchase/license-agreement/kendo-ui-complete                                                                                                                                  
 * If you do not own a commercial license, this file shall be governed by the trial license terms.                                                                                                      
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       

*/

!function(e,define){define("kendo.data.min",["kendo.core.min","kendo.data.odata.min","kendo.data.xml.min"],e)}(function(){return function(e,t){function r(e,t,r,i){return function(n){var a,s={};for(a in n)s[a]=n[a];s.field=i?r+"."+n.field:r,t==Ie&&e._notifyChange&&e._notifyChange(s),e.trigger(t,s)}}function i(t,r){if(t===r)return!0;var n,a=e.type(t),s=e.type(r);if(a!==s)return!1;if("date"===a)return t.getTime()===r.getTime();if("object"!==a&&"array"!==a)return!1;for(n in t)if(!i(t[n],r[n]))return!1;return!0}function n(e,t){var r,i;for(i in e){if(r=e[i],me(r)&&r.field&&r.field===t)return r;if(r===t)return r}return null}function a(e){this.data=e||[]}function s(e,r){if(e){var i=typeof e===Fe?{field:e,dir:r}:e,n=ye(i)?i:i!==t?[i]:[];return Se(n,function(e){return!!e.dir})}}function o(e,r){var i,n,a,s={};if(e)for(i=typeof e===Fe?{field:e,dir:r}:e,n=ye(i)?i:i!==t?[i]:[],a=0;a<n.length;a++)s[n[a].field]={dir:n[a].dir,index:a+1};return s}function u(e){var t,r,i,n,a=e.filters;if(a)for(t=0,r=a.length;t<r;t++)i=a[t],n=i.operator,n&&typeof n===Fe&&(i.operator=ie[n.toLowerCase()]||n),u(i)}function l(e){if(e&&!ve(e))return!ye(e)&&e.filters||(e={logic:"and",filters:ye(e)?e:[e]}),u(e),e}function g(e,t){return!e.logic&&!t.logic&&(e.field===t.field&&e.value===t.value&&e.operator===t.operator)}function d(e){return e=e||{},ve(e)?{logic:"and",filters:[]}:l(e)}function h(e,t){return t.logic||e.field>t.field?1:e.field<t.field?-1:0}function f(e,t){var r,i,n,a,s;if(e=d(e),t=d(t),e.logic!==t.logic)return!1;if(n=(e.filters||[]).slice(),a=(t.filters||[]).slice(),n.length!==a.length)return!1;for(n=n.sort(h),a=a.sort(h),s=0;s<n.length;s++)if(r=n[s],i=a[s],r.logic&&i.logic){if(!f(r,i))return!1}else if(!g(r,i))return!1;return!0}function c(e){return ye(e)?e:[e]}function p(e,r,i,n){var a=typeof e===Fe?{field:e,dir:r,compare:i,skipItemSorting:n}:e,s=ye(a)?a:a!==t?[a]:[];return W(s,function(e){return{field:e.field,dir:e.dir||"asc",aggregates:e.aggregates,compare:e.compare,skipItemSorting:e.skipItemSorting}})}function _(e,t,r){var i,n=p(e,t,r);for(i=0;i<n.length;i++)delete n[i].compare;return n}function m(e){var t,r=ye(e)?e:[e];for(t=0;t<r.length;t++)if(r[t]&&Re(r[t].compare))return!0;return!1}function v(e,t){return e&&e.getTime&&t&&t.getTime?e.getTime()===t.getTime():e===t}function y(e,t,r,i,n,a){var s,o,u,l,g;for(t=t||[],l=t.length,s=0;s<l;s++)o=t[s],u=o.aggregate,g=o.field,e[g]=e[g]||{},a[g]=a[g]||{},a[g][u]=a[g][u]||{},e[g][u]=ne[u.toLowerCase()](e[g][u],r,Pe.accessor(g),i,n,a[g][u])}function S(e){return"number"==typeof e&&!isNaN(e)}function b(e){return e&&e.getTime}function k(e){var t,r=e.length,i=Array(r);for(t=0;t<r;t++)i[t]=e[t].toJSON();return i}function w(e,t,r,i,n){var a,s,o,u,l,g={};for(u=0,l=e.length;u<l;u++){a=e[u];for(s in t)o=n[s],o&&o!==s&&(g[o]||(g[o]=Pe.setter(o)),g[o](a,t[s](a)),delete a[s])}}function P(e,t,r,i,n){var a,s,o,u,l;for(u=0,l=e.length;u<l;u++){a=e[u];for(s in t)a[s]=r._parse(s,t[s](a)),o=n[s],o&&o!==s&&delete a[o]}}function R(e,t,r,i,n){var a,s,o,u;for(s=0,u=e.length;s<u;s++)a=e[s],o=i[a.field],o&&o!=a.field&&(a.field=o),a.value=r._parse(a.field,a.value),a.items&&(a.hasSubgroups?R(a.items,t,r,i,n):P(a.items,t,r,i,n))}function x(e,t,r,i,n,a){return function(s){return s=e(s),G(t,r,i,n,a)(s)}}function G(e,t,r,i,n){return function(a){return a&&!ve(r)&&("[object Array]"===et.call(a)||a instanceof it||(a=[a]),t(a,r,new e,i,n)),a||[]}}function F(e,t){var r,i,n;if(t.items&&t.items.length)for(n=0;n<t.items.length;n++)r=e.items[n],i=t.items[n],r&&i?r.hasSubgroups?F(r,i):r.field&&r.value==i.value?r.items.push.apply(r.items,i.items):e.items.push.apply(e.items,[i]):i&&e.items.push.apply(e.items,[i])}function q(e,t,r,i){for(var n,a,s,o=0;t.length&&i&&(n=t[o],a=n.items,s=a.length,e&&e.field===n.field&&e.value===n.value?(e.hasSubgroups&&e.items.length?q(e.items[e.items.length-1],n.items,r,i):(a=a.slice(r,r+i),e.items=e.items.concat(a)),t.splice(o--,1)):n.hasSubgroups&&a.length?(q(n,a,r,i),n.items.length||t.splice(o--,1)):(a=a.slice(r,r+i),n.items=a,n.items.length||t.splice(o--,1)),0===a.length?r-=s:(r=0,i-=a.length),!(++o>=t.length)););o<t.length&&t.splice(o,t.length-o)}function C(e,t){var r,i,n,a,s=[],o=(e||[]).length,u=Re(t)?t:function(e,t){return e[t]};for(n=0;n<o;n++)if(r=u(e,n),r.hasSubgroups)s=s.concat(C(r.items));else for(i=r.items,a=0;a<i.length;a++)s.push(u(i,a));return s}function D(e){var t,r,i,n,a,s=[];for(t=0,r=e.length;t<r;t++)if(a=e.at(t),a.items)if(a.hasSubgroups)s=s.concat(D(a.items));else for(i=a.items,n=0;n<i.length;n++)s.push(i.at(n));return s}function O(e,t){var r,i,n;if(t)for(r=0,i=e.length;r<i;r++)n=e.at(r),n.items&&(n.hasSubgroups?O(n.items,t):n.items=new $(n.items,t,n.items._events))}function T(e,t){for(var r=0;r<e.length;r++)if(e[r].hasSubgroups){if(T(e[r].items,t))return!0}else if(t(e[r].items,e[r]))return!0}function z(e,t,r,i){for(var n=0;n<e.length&&e[n].data!==t&&!I(e[n].data,r,i);n++);}function I(e,t,r){for(var i=0,n=e.length;i<n;i++){if(e[i]&&e[i].hasSubgroups)return I(e[i].items,t,r);if(e[i]===t||e[i]===r)return e[i]=r,!0}}function A(e,r,i,n,a){var s,o,u,l;for(s=0,o=e.length;s<o;s++)if(u=e[s],u&&!(u instanceof n))if(u.hasSubgroups===t||a){for(l=0;l<r.length;l++)if(r[l]===u){e[s]=r.at(l),z(i,r,u,e[s]);break}}else A(u.items,r,i,n,a)}function E(e,t){var r,i,n;if(e)for(r=e.length,n=0;n<r;n++)if(i=e[n],i.uid&&i.uid==t.uid)return e.splice(n,1),i}function N(e,t){return t?L(e,function(e){return e.uid&&e.uid==t.uid||e[t.idField]===t.id&&t.id!==t._defaultId}):-1}function M(e,t){return t?L(e,function(e){return e.uid==t.uid}):-1}function L(e,t){var r,i;if(e){for(r=0,i=e.length;r<i;r++)if(t(e[r]))return r;return-1}}function j(e,t){var r,i;return e&&!ve(e)?(r=e[t],i=me(r)?r.from||r.field||t:e[t]||t,Re(i)?t:i):t}function H(e,t){var r,i,n,a={};for(n in e)"filters"!==n&&(a[n]=e[n]);if(e.filters)for(a.filters=[],r=0,i=e.filters.length;r<i;r++)a.filters[r]=H(e.filters[r],t);else a.field=j(t.fields,a.field);return a}function B(e,t){var r,i,n,a,s,o=[];for(r=0,i=e.length;r<i;r++){n={},a=e[r];for(s in a)n[s]=a[s];n.field=j(t.fields,n.field),n.aggregates&&ye(n.aggregates)&&(n.aggregates=B(n.aggregates,t)),o.push(n)}return o}function U(t,r){var i,n,a,s,o,u,l,g,d,h;for(t=e(t)[0],i=t.options,n=r[0],a=r[1],s=[],o=0,u=i.length;o<u;o++)d={},g=i[o],l=g.parentNode,l===t&&(l=null),g.disabled||l&&l.disabled||(l&&(d.optgroup=l.label),d[n.field]=g.text,h=g.attributes.value,h=h&&h.specified?g.value:g.text,d[a.field]=h,s.push(d));return s}function J(t,r){var i,n,a,s,o,u,l,g=e(t)[0].tBodies[0],d=g?g.rows:[],h=r.length,f=[];for(i=0,n=d.length;i<n;i++){for(o={},l=!0,s=d[i].cells,a=0;a<h;a++)u=s[a],"th"!==u.nodeName.toLowerCase()&&(l=!1,o[r[a].field]=u.innerHTML);l||f.push(o)}return f}function V(e){return function(){var t=this._data,r=le.fn[e].apply(this,Ye.call(arguments));return this._data!=t&&this._attachBubbleHandlers(),r}}function Q(t,r){function i(e,t){return e.filter(t).add(e.find(t))}var n,a,s,o,u,l,g,d,h=e(t).children(),f=[],c=r[0].field,p=r[1]&&r[1].field,_=r[2]&&r[2].field,m=r[3]&&r[3].field;for(n=0,a=h.length;n<a;n++)s={_loaded:!0},o=h.eq(n),l=o[0].firstChild,d=o.children(),t=d.filter("ul"),d=d.filter(":not(ul)"),u=o.attr("data-id"),u&&(s.id=u),l&&(s[c]=3==l.nodeType?l.nodeValue:d.text()),p&&(s[p]=i(d,"a").attr("href")),m&&(s[m]=i(d,"img").attr("src")),_&&(g=i(d,".k-sprite").prop("className"),s[_]=g&&Pe.trim(g.replace("k-sprite",""))),t.length&&(s.items=Q(t.eq(0),r)),"true"==o.attr("data-hasChildren")&&(s.hasChildren=!0),f.push(s);return f}var W,$,K,X,Y,Z,ee,te,re,ie,ne,ae,se,oe,ue,le,ge,de,he,fe,ce,pe=e.extend,_e=e.proxy,me=e.isPlainObject,ve=e.isEmptyObject,ye=e.isArray,Se=e.grep,be=e.ajax,ke=e.each,we=e.noop,Pe=window.kendo,Re=Pe.isFunction,xe=Pe.Observable,Ge=Pe.Class,Fe="string",qe="function",Ce="asc",De="create",Oe="read",Te="update",ze="destroy",Ie="change",Ae="sync",Ee="get",Ne="error",Me="requestStart",Le="progress",je="requestEnd",He=[De,Oe,Te,ze],Be=function(e){return e},Ue=Pe.getter,Je=Pe.stringify,Ve=Math,Qe=[].push,We=[].join,$e=[].pop,Ke=[].splice,Xe=[].shift,Ye=[].slice,Ze=[].unshift,et={}.toString,tt=Pe.support.stableSort,rt=/^\/Date\((.*?)\)\/$/,it=xe.extend({init:function(e,t){var r=this;r.type=t||K,xe.fn.init.call(r),r.length=e.length,r.wrapAll(e,r)},at:function(e){return this[e]},toJSON:function(e){var t,r,i=this.length,n=Array(i);for(t=0;t<i;t++)r=this[t],r instanceof K&&(r=r.toJSON(e)),n[t]=r;return n},parent:we,wrapAll:function(e,t){var r,i,n=this,a=function(){return n};for(t=t||[],r=0,i=e.length;r<i;r++)t[r]=n.wrap(e[r],a);return t},wrap:function(e,t){var r,i=this;return null!==e&&"[object Object]"===et.call(e)&&(r=e instanceof i.type||e instanceof Z,r||(e=e instanceof K?e.toJSON():e,e=new i.type(e)),e.parent=t,e.bind(Ie,function(e){i.trigger(Ie,{field:e.field,node:e.node,index:e.index,items:e.items||[this],action:e.node?e.action||"itemloaded":"itemchange"})})),e},push:function(){var e,t=this.length,r=this.wrapAll(arguments);return e=Qe.apply(this,r),this.omitChangeEvent||this.trigger(Ie,{action:"add",index:t,items:r}),e},slice:Ye,sort:[].sort,join:We,pop:function(){var e=this.length,t=$e.apply(this);return e&&this.trigger(Ie,{action:"remove",index:e-1,items:[t]}),t},splice:function(e,t,r){var i,n,a,s=this.wrapAll(Ye.call(arguments,2));if(i=Ke.apply(this,[e,t].concat(s)),i.length)for(this.trigger(Ie,{action:"remove",index:e,items:i}),n=0,a=i.length;n<a;n++)i[n]&&i[n].children&&i[n].unbind(Ie);return r&&this.trigger(Ie,{action:"add",index:e,items:s}),i},shift:function(){var e=this.length,t=Xe.apply(this);return e&&this.trigger(Ie,{action:"remove",index:0,items:[t]}),t},unshift:function(){var e,t=this.wrapAll(arguments);return e=Ze.apply(this,t),this.trigger(Ie,{action:"add",index:0,items:t}),e},indexOf:function(e){var t,r,i=this;for(t=0,r=i.length;t<r;t++)if(i[t]===e)return t;return-1},forEach:function(e,t){for(var r=0,i=this.length,n=t||window;r<i;r++)e.call(n,this[r],r,this)},map:function(e,t){for(var r=0,i=[],n=this.length,a=t||window;r<n;r++)i[r]=e.call(a,this[r],r,this);return i},reduce:function(e){var t,r=0,i=this.length;for(2==arguments.length?t=arguments[1]:r<i&&(t=this[r++]);r<i;r++)t=e(t,this[r],r,this);return t},reduceRight:function(e){var t,r=this.length-1;for(2==arguments.length?t=arguments[1]:r>0&&(t=this[r--]);r>=0;r--)t=e(t,this[r],r,this);return t},filter:function(e,t){for(var r,i=0,n=[],a=this.length,s=t||window;i<a;i++)r=this[i],e.call(s,r,i,this)&&(n[n.length]=r);return n},find:function(e,t){for(var r,i=0,n=this.length,a=t||window;i<n;i++)if(r=this[i],e.call(a,r,i,this))return r},every:function(e,t){for(var r,i=0,n=this.length,a=t||window;i<n;i++)if(r=this[i],!e.call(a,r,i,this))return!1;return!0},some:function(e,t){for(var r,i=0,n=this.length,a=t||window;i<n;i++)if(r=this[i],e.call(a,r,i,this))return!0;return!1},remove:function(e){var t=this.indexOf(e);t!==-1&&this.splice(t,1)},empty:function(){this.splice(0,this.length)}});"undefined"!=typeof Symbol&&Symbol.iterator&&!it.prototype[Symbol.iterator]&&(it.prototype[Symbol.iterator]=[][Symbol.iterator]),$=it.extend({init:function(e,t,r){xe.fn.init.call(this),this.type=t||K,r&&(this._events=r);for(var i=0;i<e.length;i++)this[i]=e[i];this.length=i,this._parent=_e(function(){return this},this)},at:function(e){var t=this[e];return t instanceof this.type?t.parent=this._parent:t=this[e]=this.wrap(t,this._parent),t}}),K=xe.extend({init:function(e){var t,r,i=this,n=function(){return i};xe.fn.init.call(this),this._handlers={};for(r in e)t=e[r],"object"==typeof t&&t&&!t.getTime&&"_"!=r.charAt(0)&&(t=i.wrap(t,r,n)),i[r]=t;i.uid=Pe.guid()},shouldSerialize:function(e,t){return this.hasOwnProperty(e)&&"_handlers"!==e&&"_events"!==e&&(t&&t[e]||typeof this[e]!==qe)&&"uid"!==e},forEach:function(e){for(var t in this)this.shouldSerialize(t)&&e(this[t],t)},toJSON:function(e){var t,r,i={};for(r in this)this.shouldSerialize(r,e)&&(t=this[r],(t instanceof K||t instanceof it)&&(t=t.toJSON(e)),i[r]=t);return i},get:function(e){var t,r=this;return r.trigger(Ee,{field:e}),t="this"===e?r:Pe.getter(e,!0)(r)},_set:function(e,t){var r,i,n,a=this,s=e.indexOf(".")>=0;if(s)for(r=e.split("."),i="";r.length>1;){if(i+=r.shift(),n=Pe.getter(i,!0)(a),n instanceof K)return n.set(r.join("."),t),s;i+="."}return Pe.setter(e)(a,t),s},set:function(e,t){var r=this,i=!1,n=e.indexOf(".")>=0,a=Pe.getter(e,!0)(r);return a!==t&&(a instanceof xe&&this._handlers[e]&&(this._handlers[e].get&&a.unbind(Ee,this._handlers[e].get),a.unbind(Ie,this._handlers[e].change)),i=r.trigger("set",{field:e,value:t}),i||(n||(t=r.wrap(t,e,function(){return r})),(!r._set(e,t)||e.indexOf("(")>=0||e.indexOf("[")>=0)&&r.trigger(Ie,{field:e}))),i},parent:we,wrap:function(e,t,i){var n,a,s,o,u=this,l=et.call(e);return null==e||"[object Object]"!==l&&"[object Array]"!==l||(s=e instanceof it,o=e instanceof le,"[object Object]"!==l||o||s?("[object Array]"===l||s||o)&&(s||o||(e=new it(e)),a=r(u,Ie,t,!1),e.bind(Ie,a),u._handlers[t]={change:a}):(e instanceof K||(e=new K(e)),n=r(u,Ee,t,!0),e.bind(Ee,n),a=r(u,Ie,t,!0),e.bind(Ie,a),u._handlers[t]={get:n,change:a}),e.parent=i),e}}),X={number:function(e){return typeof e===Fe&&"null"===e.toLowerCase()?null:Pe.parseFloat(e)},date:function(e){return typeof e===Fe&&"null"===e.toLowerCase()?null:Pe.parseDate(e)},"boolean":function(e){return typeof e===Fe?"null"===e.toLowerCase()?null:"true"===e.toLowerCase():null!=e?!!e:e},string:function(e){return typeof e===Fe&&"null"===e.toLowerCase()?null:null!=e?e+"":e},"default":function(e){return e}},Y={string:"",number:0,date:new Date,"boolean":!1,"default":""},Z=K.extend({init:function(r){var i,n,a=this;if((!r||e.isEmptyObject(r))&&(r=e.extend({},a.defaults,r),a._initializers))for(i=0;i<a._initializers.length;i++)n=a._initializers[i],r[n]=a.defaults[n]();K.fn.init.call(a,r),a.dirty=!1,a.dirtyFields={},a.idField&&(a.id=a.get(a.idField),a.id===t&&(a.id=a._defaultId))},shouldSerialize:function(e){return K.fn.shouldSerialize.call(this,e)&&"uid"!==e&&!("id"!==this.idField&&"id"===e)&&"dirty"!==e&&"dirtyFields"!==e&&"_accessors"!==e},_parse:function(e,t){var r,i=this,a=e,s=i.fields||{};return e=s[e],e||(e=n(s,a)),e&&(r=e.parse,!r&&e.type&&(r=X[e.type.toLowerCase()])),r?r(t):t},_notifyChange:function(e){var t=e.action;"add"!=t&&"remove"!=t||(this.dirty=!0,this.dirtyFields[e.field]=!0)},editable:function(e){return e=(this.fields||{})[e],!e||e.editable!==!1},set:function(e,t){var r=this,n=r.dirty;r.editable(e)&&(t=r._parse(e,t),i(t,r.get(e))?r.trigger("equalSet",{field:e,value:t}):(r.dirty=!0,r.dirtyFields[e]=!0,K.fn.set.call(r,e,t)&&!n&&(r.dirty=n,r.dirty||(r.dirtyFields[e]=!1))))},accept:function(e){var t,r,i=this,n=function(){return i};for(t in e)r=e[t],"_"!=t.charAt(0)&&(r=i.wrap(e[t],t,n)),i._set(t,r);i.idField&&(i.id=i.get(i.idField)),i.dirty=!1,i.dirtyFields={}},isNew:function(){return this.id===this._defaultId}}),Z.define=function(e,r){r===t&&(r=e,e=Z);var i,n,a,s,o,u,l,g,d=pe({defaults:{}},r),h={},f=d.id,c=[];if(f&&(d.idField=f),d.id&&delete d.id,f&&(d.defaults[f]=d._defaultId=""),"[object Array]"===et.call(d.fields)){for(u=0,l=d.fields.length;u<l;u++)a=d.fields[u],typeof a===Fe?h[a]={}:a.field&&(h[a.field]=a);d.fields=h}for(n in d.fields)a=d.fields[n],s=a.type||"default",o=null,g=n,n=typeof a.field===Fe?a.field:n,a.nullable||(o=d.defaults[g!==n?g:n]=a.defaultValue!==t?a.defaultValue:Y[s.toLowerCase()],"function"==typeof o&&c.push(n)),r.id===n&&(d._defaultId=o),d.defaults[g!==n?g:n]=o,a.parse=a.parse||X[s];return c.length>0&&(d._initializers=c),i=e.extend(d),i.define=function(e){return Z.define(i,e)},d.fields&&(i.fields=d.fields,i.idField=d.idField),i},ee={selector:function(e){return Re(e)?e:Ue(e)},compare:function(e){var t=this.selector(e);return function(e,r){return e=t(e),r=t(r),null==e&&null==r?0:null==e?-1:null==r?1:e.localeCompare?e.localeCompare(r):e>r?1:e<r?-1:0}},create:function(e){var t=e.compare||this.compare(e.field);return"desc"==e.dir?function(e,r){return t(r,e,!0)}:t},combine:function(e){return function(t,r){var i,n,a=e[0](t,r);for(i=1,n=e.length;i<n;i++)a=a||e[i](t,r);return a}}},te=pe({},ee,{asc:function(e){var t=this.selector(e);return function(e,r){var i=t(e),n=t(r);return i&&i.getTime&&n&&n.getTime&&(i=i.getTime(),n=n.getTime()),i===n?e.__position-r.__position:null==i?-1:null==n?1:i.localeCompare?i.localeCompare(n):i>n?1:-1}},desc:function(e){var t=this.selector(e);return function(e,r){var i=t(e),n=t(r);return i&&i.getTime&&n&&n.getTime&&(i=i.getTime(),n=n.getTime()),i===n?e.__position-r.__position:null==i?1:null==n?-1:n.localeCompare?n.localeCompare(i):i<n?1:-1}},create:function(e){return this[e.dir](e.field)}}),W=function(e,t){var r,i=e.length,n=Array(i);for(r=0;r<i;r++)n[r]=t(e[r],r,e);return n},re=function(){function e(e){return"string"==typeof e&&(e=e.replace(/[\r\n]+/g,"")),JSON.stringify(e)}function t(t){return function(r,i,n,a){return i+="",n&&(r="("+r+" + '').toString()"+(a?".toLocaleLowerCase('"+a+"')":".toLowerCase()"),i=a?i.toLocaleLowerCase(a):i.toLowerCase()),t(r,e(i),n)}}function r(t,r,i,n,a){if(null!=i){if(typeof i===Fe){var s=rt.exec(i);s?i=new Date((+s[1])):n?(i=e(a?i.toLocaleLowerCase(a):i.toLowerCase()),r="(("+r+" || '')+'')"+(a?".toLocaleLowerCase('"+a+"')":".toLowerCase()")):i=e(i)}i.getTime&&(r="("+r+"&&"+r+".getTime?"+r+".getTime():"+r+")",i=i.getTime())}return r+" "+t+" "+i}function i(e){var t,r,i,n;for(t="/^",r=!1,i=0;i<e.length;++i){if(n=e.charAt(i),r)t+="\\"+n;else{if("~"==n){r=!0;continue}t+="*"==n?".*":"?"==n?".":".+^$()[]{}|\\/\n\r\u2028\u2029 ".indexOf(n)>=0?"\\"+n:n}r=!1}return t+"$/"}return{quote:function(t){return t&&t.getTime?"new Date("+t.getTime()+")":e(t)},eq:function(e,t,i,n){return r("==",e,t,i,n)},neq:function(e,t,i,n){return r("!=",e,t,i,n)},gt:function(e,t,i){return r(">",e,t,i)},gte:function(e,t,i){return r(">=",e,t,i)},lt:function(e,t,i){return r("<",e,t,i)},lte:function(e,t,i){return r("<=",e,t,i)},startswith:t(function(e,t){return e+".lastIndexOf("+t+", 0) == 0"}),doesnotstartwith:t(function(e,t){return e+".lastIndexOf("+t+", 0) == -1"}),endswith:t(function(e,t){var r=t?t.length-2:0;return e+".indexOf("+t+", "+e+".length - "+r+") >= 0"}),doesnotendwith:t(function(e,t){var r=t?t.length-2:0;return e+".indexOf("+t+", "+e+".length - "+r+") < 0"}),contains:t(function(e,t){return e+".indexOf("+t+") >= 0"}),doesnotcontain:t(function(e,t){return e+".indexOf("+t+") == -1"}),matches:t(function(e,t){return t=t.substring(1,t.length-1),i(t)+".test("+e+")"}),doesnotmatch:t(function(e,t){return t=t.substring(1,t.length-1),"!"+i(t)+".test("+e+")"}),isempty:function(e){return e+" === ''"},isnotempty:function(e){return e+" !== ''"},isnull:function(e){return"("+e+" == null)"},isnotnull:function(e){return"("+e+" != null)"},isnullorempty:function(e){return"("+e+" === null) || ("+e+" === '')"},isnotnullorempty:function(e){return"("+e+" !== null) && ("+e+" !== '')"}}}(),a.filterExpr=function(e){var r,i,n,s,o,u,l=[],g={and:" && ",or:" || "},d=[],h=[],f=e.filters;for(r=0,i=f.length;r<i;r++)n=f[r],o=n.field,u=n.operator,n.filters?(s=a.filterExpr(n),n=s.expression.replace(/__o\[(\d+)\]/g,function(e,t){return t=+t,"__o["+(h.length+t)+"]"}).replace(/__f\[(\d+)\]/g,function(e,t){return t=+t,"__f["+(d.length+t)+"]"}),h.push.apply(h,s.operators),d.push.apply(d,s.fields)):(typeof o===qe?(s="__f["+d.length+"](d)",d.push(o)):s=Pe.expr(o),typeof u===qe?(n="__o["+h.length+"]("+s+", "+re.quote(n.value)+")",h.push(u)):n=re[(u||"eq").toLowerCase()](s,n.value,n.ignoreCase===t||n.ignoreCase,e.accentFoldingFiltering)),l.push(n);return{expression:"("+l.join(g[e.logic])+")",fields:d,operators:h}},ie={"==":"eq",equals:"eq",isequalto:"eq",equalto:"eq",equal:"eq","!=":"neq",ne:"neq",notequals:"neq",isnotequalto:"neq",notequalto:"neq",notequal:"neq","<":"lt",islessthan:"lt",lessthan:"lt",less:"lt","<=":"lte",le:"lte",islessthanorequalto:"lte",lessthanequal:"lte",">":"gt",isgreaterthan:"gt",greaterthan:"gt",greater:"gt",">=":"gte",isgreaterthanorequalto:"gte",greaterthanequal:"gte",ge:"gte",notsubstringof:"doesnotcontain",isnull:"isnull",isempty:"isempty",isnotempty:"isnotempty"},a.normalizeFilter=l,a.compareFilters=f,a.prototype={toArray:function(){return this.data},range:function(e,t){return new a(this.data.slice(e,e+t))},skip:function(e){return new a(this.data.slice(e))},take:function(e){return new a(this.data.slice(0,e))},select:function(e){return new a(W(this.data,e))},order:function(e,t,r){var i={dir:t};return e&&(e.compare?i.compare=e.compare:i.field=e),new a(r?this.data.sort(ee.create(i)):this.data.slice(0).sort(ee.create(i)))},orderBy:function(e,t){return this.order(e,"asc",t)},orderByDescending:function(e,t){return this.order(e,"desc",t)},sort:function(e,t,r,i){var n,a,o=s(e,t),u=[];if(r=r||ee,o.length){for(n=0,a=o.length;n<a;n++)u.push(r.create(o[n]));return this.orderBy({compare:r.combine(u)},i)}return this},filter:function(e){var t,r,i,n,s,o,u,g,d=this.data,h=[];if(e=l(e),!e||0===e.filters.length)return this;for(n=a.filterExpr(e),o=n.fields,u=n.operators,s=g=Function("d, __f, __o","return "+n.expression),(o.length||u.length)&&(g=function(e){return s(e,o,u)}),t=0,i=d.length;t<i;t++)r=d[t],g(r)&&h.push(r);return new a(h)},group:function(e,t,r){e=p(e||[]),t=t||this.data;var i,n=this,s=new a(n.data);return e.length>0&&(i=e[0],s=r&&r.groupPaging?new a(t).groupAllData(i,t).select(function(n){var s=new a(t).filter([{field:n.field,operator:"eq",value:n.value,ignoreCase:!1}]),o=e.length>1?new a(n.items).group(e.slice(1),s.toArray(),r).toArray():n.items;return{field:n.field,value:n.value,hasSubgroups:e.length>1,items:o,aggregates:s.aggregate(i.aggregates),uid:Pe.guid(),itemCount:o.length,subgroupCount:o.length}}):s.groupBy(i).select(function(r){var n=new a(t).filter([{field:r.field,operator:"eq",value:r.value,ignoreCase:!1}]);return{field:r.field,value:r.value,items:e.length>1?new a(r.items).group(e.slice(1),n.toArray()).toArray():r.items,hasSubgroups:e.length>1,aggregates:n.aggregate(i.aggregates)}})),s},groupBy:function(e){var t,r,i,n,s,o,u,l,g,d,h=this;if(ve(e)||!this.data.length)return new a([]);for(t=e.field,r=e.skipItemSorting?this.data:this._sortForGrouping(t,e.dir||"asc"),i=Pe.accessor(t),s=i.get(r[0],t),o={field:t,value:s,items:[]},d=[o],l=0,g=r.length;l<g;l++)n=r[l],u=i.get(n,t),v(s,u)||(s=u,o={field:t,value:s,items:[]},d.push(o)),o.items.push(n);return d=h._sortGroups(d,e),new a(d)},groupAllData:function(e,t){if(ve(e)||this.data&&!this.data.length)return new a([]);var r,i,n,s,o=e.field,u=e.skipItemSorting?t:new a(t).sort(o,e.dir||"asc",te).toArray(),l=Pe.accessor(o),g=l.get(u[0],o),d={field:o,value:g,items:[]},h=[d];for(n=0,s=u.length;n<s;n++)r=u[n],i=l.get(r,o),v(g,i)||(g=i,d={field:o,value:g,items:[]},h.push(d)),d.items.push(r);return h=this._sortGroups(h,e),new a(h)},_sortForGrouping:function(e,t){var r,i,n=this.data;if(!tt){for(r=0,i=n.length;r<i;r++)n[r].__position=r;for(n=new a(n).sort(e,t,te).toArray(),r=0,i=n.length;r<i;r++)delete n[r].__position;return n}return this.sort(e,t).toArray()},_sortGroups:function(e,t){var r=e;return t&&Re(t.compare)&&(r=new a(r).order({compare:t.compare},t.dir||Ce).toArray()),r},aggregate:function(e){var t,r,i={},n={};if(e&&e.length)for(t=0,r=this.data.length;t<r;t++)y(i,e,this.data[t],t,r,n);return i}},ne={sum:function(e,t,r){var i=r.get(t);return S(e)?S(i)&&(e+=i):e=i,e},count:function(e){return(e||0)+1},average:function(e,r,i,n,a,s){var o=i.get(r);return s.count===t&&(s.count=0),S(e)?S(o)&&(e+=o):e=o,S(o)&&s.count++,n==a-1&&S(e)&&(e/=s.count),e},max:function(e,t,r){var i=r.get(t);return S(e)||b(e)||(e=i),e<i&&(S(i)||b(i))&&(e=i),e},min:function(e,t,r){var i=r.get(t);return S(e)||b(e)||(e=i),e>i&&(S(i)||b(i))&&(e=i),e}},a.normalizeGroup=p,a.normalizeSort=s,a.process=function(e,r,i){var n,o,u,l,g,d,h,f,c,v,y,S;return r=r||{},n=r.group,o=m(p(n||[])),u=new a(e),l=_(n||[]),g=s(r.sort||[]),d=o?g:l.concat(g),c=r.filterCallback,v=r.filter,y=r.skip,S=r.take,d&&i&&(u=u.sort(d,t,t,i)),v&&(u=u.filter(v),c&&(u=c(u)),f=u.toArray().length),d&&(i||(u=u.sort(d)),n&&(e=u.toArray())),o?(u=u.group(n,e),y!==t&&S!==t&&(u=new a(C(u.toArray())).range(y,S),h=W(l,function(e){return pe({},e,{skipItemSorting:!0})}),u=u.group(h,e))):(y!==t&&S!==t&&(u=u.range(y,S)),n&&(u=u.group(n,e,r))),{total:f,data:u.toArray()}},ae=Ge.extend({init:function(e){this.data=e.data},read:function(e){e.success(this.data)},update:function(e){e.success(e.data)},create:function(e){e.success(e.data)},destroy:function(e){e.success(e.data)}}),se=Ge.extend({init:function(e){var t,r=this;e=r.options=pe({},r.options,e),ke(He,function(t,r){typeof e[r]===Fe&&(e[r]={url:e[r]})}),r.cache=e.cache?oe.create(e.cache):{find:we,add:we},t=e.parameterMap,e.submit&&(r.submit=e.submit),Re(e.push)&&(r.push=e.push),r.push||(r.push=Be),r.parameterMap=Re(t)?t:function(e){var r={};return ke(e,function(e,i){e in t&&(e=t[e],me(e)&&(i=e.value(i),e=e.key)),r[e]=i}),r}},options:{parameterMap:Be},create:function(e){return be(this.setup(e,De))},read:function(r){var i,n,a,s=this,o=s.cache;r=s.setup(r,Oe),i=r.success||we,n=r.error||we,a=o.find(r.data),a!==t?i(a):(r.success=function(e){o.add(r.data,e),i(e)},e.ajax(r))},update:function(e){return be(this.setup(e,Te))},destroy:function(e){return be(this.setup(e,ze))},setup:function(e,t){e=e||{};var r,i=this,n=i.options[t],a=Re(n.data)?n.data(e.data):n.data;return e=pe(!0,{},n,e),r=pe(!0,{},a,e.data),e.data=i.parameterMap(r,t),Re(e.url)&&(e.url=e.url(r)),e}}),oe=Ge.extend({init:function(){this._store={}},add:function(e,r){e!==t&&(this._store[Je(e)]=r)},find:function(e){return this._store[Je(e)]},clear:function(){this._store={}},remove:function(e){delete this._store[Je(e)]}}),oe.create=function(e){var t={inmemory:function(){return new oe}};return me(e)&&Re(e.find)?e:e===!0?new oe:t[e]()},ue=Ge.extend({init:function(e){var t,r,i,n,a,s,o,u,l,g,d,h,f,c,p=this;e=e||{};for(t in e)r=e[t],p[t]=typeof r===Fe?Ue(r):r;n=e.modelBase||Z,me(p.model)&&(p.model=i=n.define(p.model)),a=_e(p.data,p),p._dataAccessFunction=a,p.model&&(s=_e(p.groups,p),o=_e(p.serialize,p),u={},l={},g={},d={},h=!1,i=p.model,i.fields&&(ke(i.fields,function(e,t){var r;f=e,me(t)&&t.field?f=t.field:typeof t===Fe&&(f=t),me(t)&&t.from&&(r=t.from),h=h||r&&r!==e||f!==e,c=r||f,l[e]=c.indexOf(".")!==-1?Ue(c,!0):Ue(c),g[e]=Ue(e),u[r||f]=e,d[e]=r||f}),!e.serialize&&h&&(p.serialize=x(o,i,w,g,u,d))),p._dataAccessFunction=a,p._wrapDataAccessBase=G(i,P,l,u,d),p.data=x(a,i,P,l,u,d),p.groups=x(s,i,R,l,u,d))},errors:function(e){return e?e.errors:null},parse:Be,data:Be,total:function(e){return e.length},groups:Be,aggregates:function(){return{}},serialize:function(e){return e}}),le=xe.extend({init:function(e){var r,i,n,a=this;e&&(i=e.data),e=a.options=pe({},a.options,e),a._map={},a._prefetch={},a._data=[],a._pristineData=[],a._ranges=[],a._view=[],a._pristineTotal=0,a._destroyed=[],a._pageSize=e.pageSize,a._page=e.page||(e.pageSize?1:t),a._sort=s(e.sort),a._filter=l(e.filter),a._group=p(e.group),a._aggregate=e.aggregate,a._total=e.total,a._groupPaging=e.groupPaging,a._groupPaging&&(a._groupsState={}),a._shouldDetachObservableParents=!0,xe.fn.init.call(a),a.transport=ge.create(e,i,a),Re(a.transport.push)&&a.transport.push({pushCreate:_e(a._pushCreate,a),pushUpdate:_e(a._pushUpdate,a),pushDestroy:_e(a._pushDestroy,a)}),null!=e.offlineStorage&&("string"==typeof e.offlineStorage?(n=e.offlineStorage,a._storage={getItem:function(){return JSON.parse(localStorage.getItem(n))},setItem:function(e){localStorage.setItem(n,Je(a.reader.serialize(e)))}}):a._storage=e.offlineStorage),a.reader=new Pe.data.readers[e.schema.type||"json"](e.schema),r=a.reader.model||{},a._detachObservableParents(),a._data=a._observe(a._data),a._online=!0,a.bind(["push",Ne,Ie,Me,Ae,je,Le],e)},options:{data:null,schema:{modelBase:Z},offlineStorage:null,serverSorting:!1,serverPaging:!1,serverFiltering:!1,serverGrouping:!1,serverAggregates:!1,batch:!1,inPlaceSort:!1},clone:function(){return this},online:function(r){return r!==t?this._online!=r&&(this._online=r,r)?this.sync():e.Deferred().resolve().promise():this._online},offlineData:function(e){return null==this.options.offlineStorage?null:e!==t?this._storage.setItem(e):this._storage.getItem()||[]},_isServerGrouped:function(){var e=this.group()||[];return this.options.serverGrouping&&e.length},_isServerGroupPaged:function(){return this._isServerGrouped()&&this._groupPaging},_isGroupPaged:function(){var e=this.group()||[];return this._groupPaging&&e.length},_pushCreate:function(e){this._push(e,"pushCreate")},_pushUpdate:function(e){this._push(e,"pushUpdate")},_pushDestroy:function(e){this._push(e,"pushDestroy")},_push:function(e,t){var r=this._readData(e);r||(r=e),this[t](r)},_flatData:function(e,t){if(e){if(this._isServerGrouped())return D(e);if(!t)for(var r=0;r<e.length;r++)e.at(r)}return e},parent:we,get:function(e){var t,r,i=this._flatData(this._data,this.options.useRanges);for(t=0,r=i.length;t<r;t++)if(i[t].id==e)return i[t]},getByUid:function(e){return this._getByUid(e,this._data)},_getByUid:function(e,t){var r,i,n=this._flatData(t,this.options.useRanges);if(n)for(r=0,i=n.length;r<i;r++)if(n[r].uid==e)return n[r]},indexOf:function(e){return M(this._data,e)},at:function(e){return this._data.at(e)},data:function(e){var r,i=this;if(e===t){if(i._data)for(r=0;r<i._data.length;r++)i._data.at(r);return i._data}i._detachObservableParents(),i._data=this._observe(e),i._pristineData=e.slice(0),i._storeData(),i._ranges=[],i.trigger("reset"),i._addRange(i._data),i._total=i._data.length,i._pristineTotal=i._total,i._process(i._data)},view:function(e){return e===t?this._view:(this._view=this._observeView(e),t)},_observeView:function(e){var t,r=this;return A(e,r._data,r._ranges,r.reader.model||K,r._isServerGrouped()),t=new $(e,r.reader.model),t.parent=function(){return r.parent()},t},flatView:function(){var e=this.group()||[];return e.length?D(this._view):this._view},add:function(e){return this.insert(this._data.length,e)},_createNewModel:function(e){return this.reader.model?new this.reader.model(e):e instanceof K?e:new K(e)},insert:function(e,t){return t||(t=e,e=0),t instanceof Z||(t=this._createNewModel(t)),this._isServerGrouped()?this._data.splice(e,0,this._wrapInEmptyGroup(t)):this._data.splice(e,0,t),this._insertModelInRange(e,t),t},pushInsert:function(t,r){var i,n,a,s,o,u,l=this,g=l._getCurrentRangeSpan();r||(r=t,t=0),ye(r)||(r=[r]),i=[],n=this.options.autoSync,this.options.autoSync=!1;try{for(a=0;a<r.length;a++)s=r[a],o=this.insert(t,s),i.push(o),u=o.toJSON(),this._isServerGrouped()&&(u=this._wrapInEmptyGroup(u)),this._pristineData.push(u),g&&g.length&&e(g).last()[0].pristineData.push(u),t++}finally{this.options.autoSync=n}i.length&&this.trigger("push",{type:"create",items:i})},pushCreate:function(e){this.pushInsert(this._data.length,e)},pushUpdate:function(e){var t,r,i,n,a;for(ye(e)||(e=[e]),t=[],r=0;r<e.length;r++)i=e[r],n=this._createNewModel(i),a=this.get(n.id),a?(t.push(a),a.accept(i),a.trigger(Ie),this._updatePristineForModel(a,i)):this.pushCreate(i);t.length&&this.trigger("push",{type:"update",items:t})},pushDestroy:function(e){var t=this._removeItems(e);t.length&&this.trigger("push",{type:"destroy",items:t})},_removeItems:function(e,r){var i,n,a,s,o,u,l;ye(e)||(e=[e]),i=t===r||r,n=[],a=this.options.autoSync,this.options.autoSync=!1;try{for(s=0;s<e.length;s++)o=e[s],u=this._createNewModel(o),l=!1,this._eachItem(this._data,function(e){var t,r;for(t=0;t<e.length;t++)if(r=e.at(t),r.id===u.id){n.push(r),e.splice(t,1),l=!0;break}}),l&&i&&(this._removePristineForModel(u),this._destroyed.pop())}finally{this.options.autoSync=a}return n},remove:function(e){var t,r=this,i=r._isServerGrouped();return this._eachItem(r._data,function(n){if(t=E(n,e),t&&i)return t.isNew&&t.isNew()||r._destroyed.push(t),!0}),this._removeModelFromRanges(e),e},destroyed:function(){return this._destroyed},created:function(){var e,t,r=[],i=this._flatData(this._data,this.options.useRanges);for(e=0,t=i.length;e<t;e++)i[e].isNew&&i[e].isNew()&&r.push(i[e]);return r},updated:function(){var e,t,r=[],i=this._flatData(this._data,this.options.useRanges);for(e=0,t=i.length;e<t;e++)i[e].isNew&&!i[e].isNew()&&i[e].dirty&&r.push(i[e]);return r},sync:function(){var t,r=this,i=[],n=[],a=r._destroyed,s=e.Deferred().resolve().promise();
if(r.online()){if(!r.reader.model)return s;i=r.created(),n=r.updated(),t=[],r.options.batch&&r.transport.submit?t=r._sendSubmit(i,n,a):(t.push.apply(t,r._send("create",i)),t.push.apply(t,r._send("update",n)),t.push.apply(t,r._send("destroy",a))),s=e.when.apply(null,t).then(function(){var e,t;for(e=0,t=arguments.length;e<t;e++)arguments[e]&&r._accept(arguments[e]);r._storeData(!0),r._syncEnd(),r._change({action:"sync"}),r.trigger(Ae),r._isServerGroupPaged()&&r.read()})}else r._storeData(!0),r._syncEnd(),r._change({action:"sync"});return s},_syncEnd:we,cancelChanges:function(e){var t=this;e instanceof Pe.data.Model?t._cancelModel(e):(t._destroyed=[],t._detachObservableParents(),t._data=t._observe(t._pristineData),t.options.serverPaging&&(t._total=t._pristineTotal),t._ranges=[],t._addRange(t._data,0),t._changesCanceled(),t._change(),t._markOfflineUpdatesAsDirty(),t._isServerGrouped()&&t.read())},_changesCanceled:we,_markOfflineUpdatesAsDirty:function(){var e=this;null!=e.options.offlineStorage&&e._eachItem(e._data,function(e){var t,r;for(t=0;t<e.length;t++)r=e.at(t),"update"!=r.__state__&&"create"!=r.__state__||(r.dirty=!0)})},hasChanges:function(){var e,t,r=this._flatData(this._data,this.options.useRanges);if(this._destroyed.length)return!0;for(e=0,t=r.length;e<t;e++)if(r[e].isNew&&r[e].isNew()||r[e].dirty)return!0;return!1},_accept:function(t){var r,i=this,n=t.models,a=t.response,s=0,o=i._isServerGrouped(),u=i._pristineData,l=t.type;if(i.trigger(je,{response:a,type:l}),a&&!ve(a)){if(a=i.reader.parse(a),i._handleCustomErrors(a))return;a=i.reader.data(a),ye(a)||(a=[a])}else a=e.map(n,function(e){return e.toJSON()});for("destroy"===l&&(i._destroyed=[]),s=0,r=n.length;s<r;s++)"destroy"!==l?(n[s].accept(a[s]),"create"===l?u.push(o?i._wrapInEmptyGroup(n[s].toJSON()):a[s]):"update"===l&&i._updatePristineForModel(n[s],a[s])):i._removePristineForModel(n[s])},_updatePristineForModel:function(e,t){this._executeOnPristineForModel(e,function(e,r){Pe.deepExtend(r[e],t)})},_executeOnPristineForModel:function(e,t){this._eachPristineItem(function(r){var i=N(r,e);if(i>-1)return t(i,r),!0})},_removePristineForModel:function(e){this._executeOnPristineForModel(e,function(e,t){t.splice(e,1)})},_readData:function(e){var t=this._isServerGrouped()?this.reader.groups:this.reader.data;return t.call(this.reader,e)},_eachPristineItem:function(e){var t=this,r=t.options,i=t._getCurrentRangeSpan();t._eachItem(t._pristineData,e),r.serverPaging&&r.useRanges&&ke(i,function(r,i){t._eachItem(i.pristineData,e)})},_eachItem:function(e,t){e&&e.length&&(this._isServerGrouped()?T(e,t):t(e))},_pristineForModel:function(e){var t,r,i=function(i){if(r=N(i,e),r>-1)return t=i[r],!0};return this._eachPristineItem(i),t},_cancelModel:function(e){var t=this,r=this._pristineForModel(e);this._eachItem(this._data,function(i){var n=M(i,e);n>=0&&(!r||e.isNew()&&!r.__state__?(t._modelCanceled(e),i.splice(n,1),t._removeModelFromRanges(e)):(i[n].accept(r),"update"==r.__state__&&(i[n].dirty=!0)))})},_modelCanceled:we,_submit:function(t,r){var i=this;i.trigger(Me,{type:"submit"}),i.trigger(Le),i.transport.submit(pe({success:function(r,i){var n=e.grep(t,function(e){return e.type==i})[0];n&&n.resolve({response:r,models:n.models,type:i})},error:function(e,r,n){for(var a=0;a<t.length;a++)t[a].reject(e);i.error(e,r,n)}},r))},_sendSubmit:function(t,r,i){var n=this,a=[];return n.options.batch&&(t.length&&a.push(e.Deferred(function(e){e.type="create",e.models=t})),r.length&&a.push(e.Deferred(function(e){e.type="update",e.models=r})),i.length&&a.push(e.Deferred(function(e){e.type="destroy",e.models=i})),n._submit(a,{data:{created:n.reader.serialize(k(t)),updated:n.reader.serialize(k(r)),destroyed:n.reader.serialize(k(i))}})),a},_promise:function(t,r,i){var n=this;return e.Deferred(function(e){n.trigger(Me,{type:i}),n.trigger(Le),n.transport[i].call(n.transport,pe({success:function(t){e.resolve({response:t,models:r,type:i})},error:function(t,r,i){e.reject(t),n.error(t,r,i)}},t))}).promise()},_send:function(e,t){var r,i,n=this,a=[],s=n.reader.serialize(k(t));if(n.options.batch)t.length&&a.push(n._promise({data:{models:s}},t,e));else for(r=0,i=t.length;r<i;r++)a.push(n._promise({data:s[r]},[t[r]],e));return a},read:function(t){var r=this,i=r._params(t),n=e.Deferred();return r._queueRequest(i,function(){var e=r.trigger(Me,{type:"read"});e?(r._dequeueRequest(),n.resolve(e)):(r.trigger(Le),r._ranges=[],r.trigger("reset"),r.online()?r.transport.read({data:i,success:function(e){r._ranges=[],r.success(e,i),n.resolve()},error:function(){var e=Ye.call(arguments);r.error.apply(r,e),n.reject.apply(n,e)}}):null!=r.options.offlineStorage&&(r.success(r.offlineData(),i),n.resolve()))}),n.promise()},_readAggregates:function(e){return this.reader.aggregates(e)},success:function(e){var r,i,n,a,s,o,u,l,g,d,h,f=this,c=f.options;if(f.trigger(je,{response:e,type:"read"}),f.online()){if(e=f.reader.parse(e),f._handleCustomErrors(e))return f._dequeueRequest(),t;f._total=f.reader.total(e),f._isServerGroupPaged()&&(f._serverGroupsTotal=f._total),f._pageSize>f._total&&(f._pageSize=f._total,f.options.pageSize&&f.options.pageSize>f._pageSize&&(f._pageSize=f.options.pageSize)),f._aggregate&&c.serverAggregates&&(f._aggregateResult=f._readAggregates(e)),e=f._readData(e),f._destroyed=[]}else{for(e=f._readData(e),r=[],n={},a=f.reader.model,s=a?a.idField:"id",o=0;o<this._destroyed.length;o++)u=this._destroyed[o][s],n[u]=u;for(o=0;o<e.length;o++)l=e[o],g=l.__state__,"destroy"==g?n[l[s]]||this._destroyed.push(this._createNewModel(l)):r.push(l);e=r,f._total=e.length}if(f._pristineTotal=f._total,i=f._skip&&f._data.length&&f._skip<f._data.length,f.options.endless)for(i&&f._pristineData.splice(f._skip,f._pristineData.length),r=e.slice(0),d=0;d<r.length;d++)f._pristineData.push(r[d]);else f._pristineData=e.slice(0);if(f._detachObservableParents(),f.options.endless){for(f._data.unbind(Ie,f._changeHandler),f._isServerGrouped()&&f._data[f._data.length-1].value===e[0].value&&(F(f._data[f._data.length-1],e[0]),e.shift()),e=f._observe(e),i&&f._data.splice(f._skip,f._data.length),h=0;h<e.length;h++)f._data.push(e[h]);f._data.bind(Ie,f._changeHandler)}else f._data=f._observe(e);f._markOfflineUpdatesAsDirty(),f._storeData(),f._addRange(f._data),f._process(f._data),f._dequeueRequest()},_detachObservableParents:function(){if(this._data&&this._shouldDetachObservableParents)for(var e=0;e<this._data.length;e++)this._data[e].parent&&(this._data[e].parent=we)},_storeData:function(e){function t(e){var r,i,n,a=[];for(r=0;r<e.length;r++)i=e.at(r),n=i.toJSON(),s&&i.items?n.items=t(i.items):(n.uid=i.uid,o&&(i.isNew()?n.__state__="create":i.dirty&&(n.__state__="update"))),a.push(n);return a}var r,i,n,a,s=this._isServerGrouped(),o=this.reader.model;if(null!=this.options.offlineStorage){for(r=t(this._data),i=[],n=0;n<this._destroyed.length;n++)a=this._destroyed[n].toJSON(),a.__state__="destroy",i.push(a);this.offlineData(r.concat(i)),e&&(this._pristineData=this.reader.reader?this.reader.reader._wrapDataAccessBase(r):this.reader._wrapDataAccessBase(r))}},_addRange:function(e,r){var i,n=this,a=t!==r?r:n._skip||0,s={data:e,pristineData:e.toJSON(),timestamp:n._timeStamp()};this._isGroupPaged()?(i=a+e.length,s.outerStart=a,s.outerEnd=i):i=a+n._flatData(e,!0).length,s.start=a,s.end=i,n._ranges.push(s),n._sortRanges(),n._isGroupPaged()&&(n._groupsFlat||(n._groupsFlat=[]),n._appendToGroupsFlat(s.data),n._updateOuterRangesLength())},_appendToGroupsFlat:function(e){var t,r=e.length;for(t=0;t<r;t++)this._groupsFlat.push(e[t])},_getGroupByUid:function(e){var t,r,i=this._groupsFlat.length;for(r=0;r<i;r++)if(t=this._groupsFlat[r],t.uid===e)return t},_sortRanges:function(){this._ranges.sort(function(e,t){return e.start-t.start})},error:function(e,t,r){this._dequeueRequest(),this.trigger(je,{}),this.trigger(Ne,{xhr:e,status:t,errorThrown:r})},_params:function(e){var t=this,r=pe({take:t.take(),skip:t.skip(),page:t.page(),pageSize:t.pageSize(),sort:t._sort,filter:t._filter,group:t._group,aggregate:t._aggregate,groupPaging:!!t._groupPaging},e);return t.options.serverPaging||(delete r.take,delete r.skip,delete r.page,delete r.pageSize),t.options.serverGrouping?t.reader.model&&r.group&&(r.group=B(r.group,t.reader.model)):delete r.group,t.options.serverFiltering?t.reader.model&&r.filter&&(r.filter=H(r.filter,t.reader.model)):delete r.filter,t.options.serverSorting?t.reader.model&&r.sort&&(r.sort=B(r.sort,t.reader.model)):delete r.sort,t.options.serverAggregates?t.reader.model&&r.aggregate&&(r.aggregate=B(r.aggregate,t.reader.model)):delete r.aggregate,t.options.groupPaging||delete r.groupPaging,r},_queueRequest:function(e,r){var i=this;i._requestInProgress?i._pending={callback:_e(r,i),options:e}:(i._requestInProgress=!0,i._pending=t,r())},_dequeueRequest:function(){var e=this;e._requestInProgress=!1,e._pending&&e._queueRequest(e._pending.options,e._pending.callback)},_handleCustomErrors:function(e){if(this.reader.errors){var t=this.reader.errors(e);if(t)return this.trigger(Ne,{xhr:null,status:"customerror",errorThrown:"custom error",errors:t}),!0}return!1},_shouldWrap:function(e){var t=this.reader.model;return!(!t||!e.length)&&!(e[0]instanceof t)},_observe:function(e){var t,r=this,i=r.reader.model;return r._shouldDetachObservableParents=!0,e instanceof it?(r._shouldDetachObservableParents=!1,r._shouldWrap(e)&&(e.type=r.reader.model,e.wrapAll(e,e))):(t=r.pageSize()&&!r.options.serverPaging?$:it,e=new t(e,r.reader.model),e.parent=function(){return r.parent()}),r._isServerGrouped()&&O(e,i),!(r._changeHandler&&r._data&&r._data instanceof it)||r.options.useRanges&&r.options.serverPaging?r._changeHandler=_e(r._change,r):r._data.unbind(Ie,r._changeHandler),e.bind(Ie,r._changeHandler)},_updateTotalForAction:function(e,t){var r=this,i=parseInt(r._total,10);S(r._total)||(i=parseInt(r._pristineTotal,10)),"add"===e?i+=t.length:"remove"===e?i-=t.length:"itemchange"===e||"sync"===e||r.options.serverPaging?"sync"===e&&(i=r._pristineTotal=parseInt(r._total,10)):i=r._pristineTotal,r._total=i},_change:function(e){var t,r,i,n=this,a=e?e.action:"";if("remove"===a)for(t=0,r=e.items.length;t<r;t++)e.items[t].isNew&&e.items[t].isNew()||n._destroyed.push(e.items[t]);!n.options.autoSync||"add"!==a&&"remove"!==a&&"itemchange"!==a?(n._updateTotalForAction(a,e?e.items:[]),n._process(n._data,e)):(i=function(t){"sync"===t.action&&(n.unbind("change",i),n._updateTotalForAction(a,e.items))},n.first("change",i),n.sync())},_calculateAggregates:function(e,t){t=t||{};var r=new a(e),i=t.aggregate,n=t.filter;return n&&(r=r.filter(n)),r.aggregate(i)},_process:function(e,r){var i,n=this,a={};n.options.serverPaging!==!0&&(a.skip=n._skip,a.take=n._take||n._pageSize,a.skip===t&&n._page!==t&&n._pageSize!==t&&(a.skip=(n._page-1)*n._pageSize),n.options.useRanges&&(a.skip=n.currentRangeStart())),n.options.serverSorting!==!0&&(a.sort=n._sort),n.options.serverFiltering!==!0&&(a.filter=n._filter),n.options.serverGrouping!==!0&&(a.group=n._group),n.options.serverAggregates!==!0&&(a.aggregate=n._aggregate),n.options.serverGrouping&&n._clearEmptyGroups(e),a.groupPaging=n._groupPaging,i=n._isGroupPaged()&&r&&("page"===r.action||"expandGroup"===r.action||"collapseGroup"===r.action)?n._queryProcess(e,{aggregate:n._aggregate}):n._queryProcess(e,a),n.options.serverAggregates!==!0&&(n._aggregateResult=n._calculateAggregates(i.dataToAggregate||e,a)),n._setView(i,a,r),n._setFilterTotal(i.total,!1),r=r||{},r.items=r.items||n._view,n.trigger(Ie,r)},_setView:function(e,t,r){var i,n=this;n._isGroupPaged()&&!n._isServerGrouped()?!r||"page"!==r.action&&"expandGroup"!==r.action&&"collapseGroup"!==r.action?(n._ranges=[],i=new a(e.data),n._addRange(n._observe(e.data)),t.skip>e.data.length/t.take+1&&(t.skip=0),n.view(i.range(t.skip,t.take).toArray())):(n.view(e.data),n._updateOuterRangesLength()):n.view(e.data)},_clearEmptyGroups:function(e){var t,r;for(t=e.length-1;t>=0;t--)r=e[t],r.hasSubgroups?this._clearEmptyGroups(r.items):r.items&&!r.items.length&&Ke.apply(r.parent(),[t,1])},_queryProcess:function(e,t){return this.options.inPlaceSort?a.process(e,t,this.options.inPlaceSort):a.process(e,t)},_mergeState:function(r){var i=this;return r!==t&&(i._pageSize=r.pageSize,i._page=r.page,i._sort=r.sort,i._filter=r.filter,i._group=r.group,i._aggregate=r.aggregate,i._skip=i._currentRangeStart=r.skip,i._take=r.take,i._skip===t&&(i._skip=i._currentRangeStart=i.skip(),r.skip=i.skip()),i._take===t&&i._pageSize!==t&&(i._take=i._pageSize,r.take=i._take),r.sort&&(i._sort=r.sort=s(r.sort),i._sortFields=o(r.sort)),r.filter&&(i._filter=r.filter=i.options.accentFoldingFiltering&&!e.isEmptyObject(r.filter)?e.extend({},l(r.filter),{accentFoldingFiltering:i.options.accentFoldingFiltering}):l(r.filter)),r.group&&(i._group=r.group=p(r.group)),r.aggregate&&(i._aggregate=r.aggregate=c(r.aggregate))),r},query:function(r){var i,n,a,s=this.options.serverSorting||this.options.serverPaging||this.options.serverFiltering||this.options.serverGrouping||this.options.serverAggregates;return s||(this._data===t||0===this._data.length)&&!this._destroyed.length?(this.options.endless&&(n=r.pageSize-this.pageSize(),n>0?(n=this.pageSize(),r.page=r.pageSize/n,r.pageSize=n):(r.page=1,this.options.endless=!1)),this.read(this._mergeState(r))):(a=this.trigger(Me,{type:"read"}),a||(this.trigger(Le),r&&(r.groupPaging=this._groupPaging),i=this._queryProcess(this._data,this._mergeState(r)),this._setFilterTotal(i.total,!0),this._aggregateResult=this._calculateAggregates(i.dataToAggregate||this._data,r),this._setView(i,r),this.trigger(je,{type:"read"}),this.trigger(Ie,{items:i.data,action:r?r.action:""})),e.Deferred().resolve(a).promise())},_hasExpandedSubGroups:function(e){var t,r=!1,i=e.items?e.items.length:0;if(!e.hasSubgroups)return!1;for(t=0;t<i;t++)if(this._groupsState[e.items[t].uid]){r=!0;break}return r},_findGroupedRange:function(e,r,i,n,a){var s,o,u,l,g,d,h,f,c=this,p=e.length;for(h=0;h<p&&(s=e[h],!(i.taken>=i.take));h++)if(c._getGroupByUid(s.uid)||c._groupsFlat.push(s),c._groupsState[s.uid]){if(c._isServerGroupPaged()){if(s.hasSubgroups&&!s.subgroupCount)return c.getGroupSubGroupCount(s,i,n,a),c._fetchingGroupItems=!0,t;if(g=(s.subgroupCount||s.itemCount)+1,d=i.skip-i.skipped,l=!s.items||s.items.length-d<i.take-i.taken,!c._hasExpandedSubGroups(s)&&d>g){i.skipped+=g;continue}if(s.hasSubgroups&&(!s.items||l&&s.items.length<s.subgroupCount)||!s.hasSubgroups&&(!s.items||l&&s.items.length<s.itemCount))return c.getGroupItems(s,i,n,a),c._fetchingGroupItems=!0,t}if(i.includeParents&&i.skipped<i.skip?(i.skipped++,s.excludeHeader=!0):i.includeParents&&i.taken++,s.hasSubgroups&&s.items&&s.items.length)s.currentItems=[],n||(n=[]),n.push(s),c._findGroupedRange(s.items,s.currentItems,i,n,a),n.pop(),s.currentItems.length||i.taken>0?r.push(s):s.excludeHeader=!1;else{for(o=[],u=s.items.length,f=0;f<u;f++)if(i.skipped<i.skip)i.skipped++;else{if(i.taken>=i.take)break;o.push(s.items[f]),i.taken++}o.length||i.taken>0?(s.currentItems=o,r.push(s)):s.excludeHeader=!1}}else{if(i.skipped<i.skip){i.skipped++;continue}r.push(s),i.taken++}},getGroupItems:function(e,t,r,i){var n,a,s,o,u,l=this;e.items||(e.items=[]),n=e.items.length,a=l.take(),s=this._composeItemsFilter(e,r),o={page:Ve.floor((n||0)/(a||1))||1,pageSize:a,skip:n,take:a,filter:s,aggregate:l._aggregate,sort:l._sort},u=l.findSubgroups(e),u&&u.length&&(o.group=u,o.groupPaging=!0),clearTimeout(l._timeout),l._timeout=setTimeout(function(){l._queueRequest(o,function(){l.trigger(Me,{type:"read"})?l._dequeueRequest():l.transport.read({data:o,success:l._groupItemsSuccessHandler(e,t.skip,l.take(),i),error:function(){var e=Ye.call(arguments);l.error.apply(l,e)}})})},100)},getGroupSubGroupCount:function(e,t,r,i){var n,a,s,o=this;e.items||(e.items=[]),n=this._composeItemsFilter(e,r),a=this._group.map(function(e){return e.field}).indexOf(e.field),s={filter:n,group:[o._group[a+1]],groupPaging:!0,includeSubGroupCount:!0},clearTimeout(o._timeout),o._timeout=setTimeout(function(){o._queueRequest(s,function(){o.trigger(Me,{type:"read"})?o._dequeueRequest():o.transport.read({data:s,success:o._subGroupCountSuccessHandler(e,t.skip,o.take(),i),error:function(){var e=Ye.call(arguments);o.error.apply(o,e)}})})},100)},_subGroupCountSuccessHandler:function(e,t,r,i){var n,a=this;return i=Re(i)?i:we,n=a.options.schema&&a.options.schema.total?a.options.schema.total:"Total",function(s){a._dequeueRequest(),a.trigger(je,{response:s,type:"read"}),a._fetchingGroupItems=!1,e.subgroupCount=s[n],a.range(t,r,i,"expandGroup")}},_groupItemsSuccessHandler:function(e,t,r,i){var n=this,a=n._timeStamp();return i=Re(i)?i:we,function(s){var o,u,l=Z.define(n.options.schema.model);for(n._dequeueRequest(),n.trigger(je,{response:s,type:"read"}),s=n.reader.parse(s),e.hasSubgroups?o=n.reader.groups(s):(o=n.reader.data(s),o=o.map(function(e){return new l(e)})),e.items.omitChangeEvent=!0,u=0;u<o.length;u++)e.items.push(o[u]);e.items.omitChangeEvent=!1,n._updateRangePristineData(e),n._fetchingGroupItems=!1,n._serverGroupsTotal+=o.length,n.range(t,r,i,"expandGroup"),(a>=n._currentRequestTimeStamp||!n._skipRequestsInProgress)&&n.trigger(Ie,{})}},findSubgroups:function(e){var t=this._group.map(function(e){return e.field}).indexOf(e.field);return this._group.slice(t+1,this._group.length)},_composeItemsFilter:function(e,t){var r,i=this.filter()||{logic:"and",filters:[]};if(i=pe(!0,{},i),i.filters.push({field:e.field,operator:"eq",value:e.value}),t)for(r=0;r<t.length;r++)i.filters.push({field:t[r].field,operator:"eq",value:t[r].value});return i},_updateRangePristineData:function(e){var t,r,i,n,a,s,o,u=this,l=u._ranges,g=l.length;for(s=0;s<g;s++){for(i=l[s],n=i.data.length,a=[],o=0;o<n&&(r=i.data[o],a.push(o),!(r.uid===e.uid||r.hasSubgroups&&r.items.length&&u._containsSubGroup(r,e,a)));o++)a.pop();if(a.length){for(t=l[s].pristineData;a.length>1;)t=t[a.splice(0,1)[0]].items;t[a[0]]=u._cloneGroup(e);break}}},_containsSubGroup:function(e,t,r){var i,n,a=this,s=e.items.length;if(e.hasSubgroups&&s)for(n=0;n<s;n++){if(i=e.items[n],r.push(n),i.uid===t.uid)return!0;if(i.hasSubgroups&&i.items.length)return a._containsSubGroup(i,t,r);r.pop()}},_cloneGroup:function(e){var t=this;return e="function"==typeof e.toJSON?e.toJSON():e,e.items&&e.items.length&&(e.items=e.items.map(function(e){return t._cloneGroup(e)})),e},_setFilterTotal:function(e,r){var i=this;i.options.serverFiltering||(e!==t?i._total=e:r&&(i._total=i._data.length))},fetch:function(e){var t=this,r=function(r){r!==!0&&Re(e)&&e.call(t)};return this._query().done(r)},_query:function(e){var t=this;return t.query(pe({},{page:t.page(),pageSize:t.pageSize(),sort:t.sort(),filter:t.filter(),group:t.group(),aggregate:t.aggregate()},e))},next:function(e){var t=this,r=t.page(),i=t.total();if(e=e||{},r&&!(i&&r+1>t.totalPages()))return t._skip=t._currentRangeStart=r*t.take(),r+=1,e.page=r,t._query(e),r},prev:function(e){var t=this,r=t.page();if(e=e||{},r&&1!==r)return t._skip=t._currentRangeStart=t._skip-t.take(),r-=1,e.page=r,t._query(e),r},page:function(e){var r,i,n=this;return e!==t?(e=Ve.max(Ve.min(Ve.max(e,1),n.totalPages()),1),i=n.take(),n._isGroupPaged()?(e-=1,n.range(e*i,i,null,"page"),t):(n._query(n._pageableQueryOptions({page:e})),t)):(r=n.skip(),r!==t?Ve.round((r||0)/(n.take()||1))+1:t)},pageSize:function(e){var r=this;return e!==t?(r._query(r._pageableQueryOptions({pageSize:e,page:1})),t):r.take()},sort:function(e){var r=this;return e!==t?(r.trigger("sort"),r._query({sort:e}),t):r._sort},filter:function(e){var r=this;return e===t?r._filter:(r.trigger("reset"),r._query({filter:e,page:1}),t)},group:function(e){var r=this;return e!==t?(r._query({group:e}),t):r._group},getGroupsFlat:function(e){var t,r,i,n=[];for(t=0,r=e.length;t<r;t++)i=e[t],i.hasSubgroups&&(n=n.concat(this.getGroupsFlat(i.items))),n.push(i);return n},total:function(){return parseInt(this._total||0,10)},groupsTotal:function(e){var t=this;return t._group.length?t._isServerGrouped()?t._serverGroupsTotal?t._serverGroupsTotal:t._serverGroupsTotal=t.total():t._calculateGroupsTotal(t._ranges.length?t._ranges[0].data:[],e):t.total()},_calculateGroupsTotal:function(e,t,r,i){var n,a,s,o=this;if(r=r||"items",o._group.length&&e){for(n=0,a=e.length,s=0;s<a;s++)n+=o.groupCount(e[s],t,r,i);return o._groupsTotal=n,n}return o._groupsTotal=o._data.length},groupCount:function(e,t,r,i){var n=this,a=0;return e.hasSubgroups&&n._groupsState[e.uid]?((t&&!e.excludeHeader||i)&&(a+=1),e[r].forEach(function(e){a+=n.groupCount(e,t,r,i)})):n._groupsState[e.uid]?((t&&!e.excludeHeader||i)&&a++,a+=e[r]?e[r].length:0):a++,a},countGroupRange:function(e){var t,r=0,i=e.length;for(t=0;t<i;t++)r+=this.groupCount(e[t],!0);return r},aggregate:function(e){var r=this;return e!==t?(r._query({aggregate:e}),t):r._aggregate},aggregates:function(){var e=this._aggregateResult;return ve(e)&&(e=this._emptyAggregates(this.aggregate())),e},_emptyAggregates:function(e){var t,r,i={};if(!ve(e))for(t={},ye(e)||(e=[e]),r=0;r<e.length;r++)t[e[r].aggregate]=0,i[e[r].field]=t;return i},_pageableQueryOptions:function(e){return e},_wrapInEmptyGroup:function(e){var t,r,i,n,a=this.group();for(i=a.length-1,n=0;i>=n;i--)r=a[i],t={value:e.get?e.get(r.field):e[r.field],field:r.field,items:t?[t]:[e],hasSubgroups:!!t,aggregates:this._emptyAggregates(r.aggregates)};return t},totalPages:function(){var e=this,t=e.pageSize()||e.total(),r=e._isGroupPaged()?e.groupsTotal(!0):e.total();return Ve.ceil((r||0)/t)},inRange:function(e,t){var r=this,i=Ve.min(e+t,r.total());return!r.options.serverPaging&&r._data.length>0||r._findRange(e,i).length>0},lastRange:function(){var e=this._ranges;return e[e.length-1]||{start:0,end:0,data:[]}},firstItemUid:function(){var e=this._ranges;return e.length&&e[0].data.length&&e[0].data[0].uid},enableRequestsInProgress:function(){this._skipRequestsInProgress=!1},_timeStamp:function(){return(new Date).getTime()},range:function(e,r,i,n){var a,s,o,u,l;return this._currentRequestTimeStamp=this._timeStamp(),this._skipRequestsInProgress=!0,a=this._isGroupPaged()?this.groupsTotal(!0):this.total(),"expandGroup"!==n&&"collapseGroup"!==n||this._updateOuterRangesLength(),e=Ve.min(e||0,a),i=Re(i)?i:we,s=this,o=Ve.max(Ve.floor(e/r),0)*r,u=Ve.min(o+r,a),l=s._findRange(e,Ve.min(e+r,a),i),!l.length&&0!==a||s._fetchingGroupItems?(s._isGroupPaged()&&(s._originalPageSkip=o,s._originalSize=u,o=Ve.max(Ve.floor(s._adjustPageSkip(e,r)/r),0)*r,u=Ve.min(o+r,a)),r===t||s._fetchingGroupItems||(s._isGroupPaged()&&!s._groupRangeExists(o,r)||!s._rangeExists(o,u)?s.prefetch(o,r,function(){e>o&&u<s.total()&&!s._rangeExists(u,Ve.min(u+r,s.total()))?s.prefetch(u,r,function(){s.range(e,r,i)}):s.range(e,r,i)}):o<e&&s.prefetch(u,r,function(){s.range(e,r,i)})),t):(s._processRangeData(l,e,r,s._originalPageSkip||o,s._originalSize||u,{action:n}),s._originalPageSkip=null,s._originalSize=null,i(),t)},_findRange:function(e,r,i){var n,a,o,u,l,g,d,h,f,c,p,m,v,y,S=this,b=S._ranges,k=[],w=S.options,P=w.serverSorting||w.serverPaging||w.serverFiltering||w.serverGrouping||w.serverAggregates,R={take:r-e,skip:e,skipped:0,taken:0,includeParents:!0},x=S._isGroupPaged(),G=x?"outerStart":"start",F=x?"outerEnd":"end";for(a=0,p=b.length;a<p;a++){if(n=b[a],x){if(n.outerStart>=r)return[];if(e>n.outerEnd){R.skipped+=n.outerEnd-(m||0),m=n.outerEnd;continue}if(t!==m&&m!=n.outerStart&&(R.skipped+=n.outerStart-m),R.skipped>R.skip)return[];for(t===m&&e>0&&n.start>0&&(R.skipped=n.outerStart),o=a;;){if(this._findGroupedRange(n.data,k,R,null,i),v=S._calculateGroupsTotal(k,!0,"currentItems"),v>=R.take)return k;if(S._fetchingGroupItems)return[];if(o++,!b[o]||b[o].outerStart!==n.outerEnd)break;n=b[o]}}else if(e>=n[G]&&e<=n[F]){for(c=0,o=a;o<p;o++)if(n=b[o],f=S._flatData(n.data,!0),f.length&&e+c>=n.start&&(g=n.data,d=n.end,P||(w.inPlaceSort?h=S._queryProcess(n.data,{filter:S.filter()}):(y=_(S.group()||[]).concat(s(S.sort()||[])),h=S._queryProcess(n.data,{sort:y,filter:S.filter()})),f=g=h.data,h.total!==t&&(d=h.total)),u=0,e+c>n.start&&(u=e+c-n.start),l=f.length,d>r&&(l-=d-r),c+=l-u,k=S._mergeGroups(k,g,u,l),r<=n.end&&c==r-e))return k;break}m=n.outerEnd}return[]},_getRangesMismatch:function(e){for(var t,r=this,i=r._ranges,n=0,a=0;;){if(t=i[a],!t||t.outerStart>e)break;t.outerEnd!=t.end&&(n=t.outerEnd-t.end),a++}return n},_mergeGroups:function(e,t,r,i){if(this._isServerGrouped()){var n,a=t.toJSON();return e.length&&(n=e[e.length-1]),q(n,a,r,i),e.concat(a)}return e.concat(t.slice(r,i))},_processRangeData:function(e,r,i,n,a,s){var o,u,l,g,d=this;d._pending=t,d._skip=r>d.skip()&&!d._omitPrefetch?Ve.min(a,(d.totalPages()-1)*d.take()):n,d._currentRangeStart=r,d._take=i,o=d.options.serverPaging,u=d.options.serverSorting,l=d.options.serverFiltering,g=d.options.serverAggregates;try{d.options.serverPaging=!0,d._isServerGrouped()||d.group()&&d.group().length||(d.options.serverSorting=!0),d.options.serverFiltering=!0,d.options.serverPaging=!0,d.options.serverAggregates=!0,o&&(d._detachObservableParents(),d._data=e=d._observe(e)),d._process(e,s)}finally{d.options.serverPaging=o,d.options.serverSorting=u,d.options.serverFiltering=l,d.options.serverAggregates=g}},skip:function(){var e=this;return e._skip===t?e._page!==t?(e._page-1)*(e.take()||1):t:e._skip},currentRangeStart:function(){return this._currentRangeStart||0},take:function(){return this._take||this._pageSize},_prefetchSuccessHandler:function(e,t,r,i){var n=this,a=n._timeStamp();return function(s){var o,u,l,g=!1,d={start:e,end:t,data:[],timestamp:n._timeStamp()};if(n._dequeueRequest(),n.trigger(je,{response:s,type:"read"}),s=n.reader.parse(s),l=n._readData(s),l.length){for(o=0,u=n._ranges.length;o<u;o++)if(n._ranges[o].start===e){g=!0,d=n._ranges[o],n._isGroupPaged()||(d.pristineData=l,d.data=n._observe(l),d.end=d.start+n._flatData(d.data,!0).length,n._sortRanges());break}g||n._addRange(n._observe(l),e)}n._total=n.reader.total(s),(i||a>=n._currentRequestTimeStamp||!n._skipRequestsInProgress)&&(r&&l.length?r():n.trigger(Ie,{}))}},prefetch:function(e,r,i){var n=this,a=Ve.min(e+r,n.total()),s={take:r,skip:e,page:e/r+1,pageSize:r,sort:n._sort,filter:n._filter,group:n._group,aggregate:n._aggregate};return n._isGroupPaged()&&!n._isServerGrouped()&&n._groupRangeExists(e,a)?(i&&i(),t):(n._isServerGroupPaged()&&!n._groupRangeExists(e,a)||!n._rangeExists(e,a)?(clearTimeout(n._timeout),n._timeout=setTimeout(function(){n._queueRequest(s,function(){n.trigger(Me,{type:"read"})?n._dequeueRequest():(n._omitPrefetch&&n.trigger(Le),n.transport.read({data:n._params(s),success:n._prefetchSuccessHandler(e,a,i),error:function(){var e=Ye.call(arguments);n.error.apply(n,e)}}))})},100)):i&&i(),t)},_multiplePrefetch:function(e,t,r){var i=this,n=Ve.min(e+t,i.total()),a={take:t,skip:e,page:e/t+1,pageSize:t,sort:i._sort,filter:i._filter,group:i._group,aggregate:i._aggregate};i._rangeExists(e,n)?r&&r():i.trigger(Me,{type:"read"})||i.transport.read({data:i._params(a),success:i._prefetchSuccessHandler(e,n,r,!0)})},_adjustPageSkip:function(e,t){var r,i,n=this,a=n._getPrevRange(e),s=n.total();if(a){if(i=n._getRangesMismatch(e),!i)return e;e-=i}if(r=Ve.max(Ve.floor(e/t),0)*t,r>s)for(;;)if(r-=t,r<s)break;return r},_getNextRange:function(e){var t,r,i=this,n=i._ranges;for(t=0,r=n.length;t<r;t++)if(n[t].start<=e&&n[t].end>=e)return n[t]},_getPrevRange:function(e){var t,r,i=this,n=i._ranges,a=n.length;for(t=a-1;t>=0;t--)if(n[t].outerStart<=e){r=n[t];break}return r},_rangeExists:function(e,t){var r,i,n=this,a=n._ranges;for(r=0,i=a.length;r<i;r++)if(a[r].start<=e&&a[r].end>=t)return!0;return!1},_groupRangeExists:function(e,t){var r,i,n,a=this,s=a._ranges,o=0,u=a.groupsTotal(!0);for(t>u&&!a._isServerGrouped()&&(t=u),r=0,i=s.length;r<i;r++)n=s[r],n.outerStart<=e&&n.outerEnd>=e?o+=n.outerEnd-e:n.outerStart<=t&&n.outerEnd>=t&&(o+=t-n.outerStart);return o>=t-e},_getCurrentRangeSpan:function(){var e,t,r=this,i=r._ranges,n=r.currentRangeStart(),a=n+(r.take()||0),s=[],o=i.length;for(t=0;t<o;t++)e=i[t],(e.start<=n&&e.end>=n||e.start>=n&&e.start<=a)&&s.push(e);return s},_removeModelFromRanges:function(e){var t,r,i,n=this;for(r=0,i=this._ranges.length;r<i;r++)t=this._ranges[r],n._removeModelFromRange(t,e);n._updateRangesLength()},_removeModelFromRange:function(e,t){this._eachItem(e.data,function(e){var r,i;if(e)for(r=0;r<e.length;r++)if(i=e[r],i.uid&&i.uid==t.uid){[].splice.call(e,r,1);break}})},_insertModelInRange:function(e,t){var r,i,n=this,a=n._ranges||[],s=a.length;for(i=0;i<s;i++)if(r=a[i],r.start<=e&&r.end>=e){n._getByUid(t.uid,r.data)||(n._isServerGrouped()?r.data.splice(e,0,n._wrapInEmptyGroup(t)):r.data.splice(e,0,t));break}n._updateRangesLength()},_updateRangesLength:function(){var e,t,r,i=this,n=i._ranges||[],a=n.length,s=!1,o=0,u=0;for(r=0;r<a;r++)t=n[r],e=i._isGroupPaged()?t.data.length:i._flatData(t.data,!0).length,u=e-Ve.abs(t.end-t.start),s||0===u?s&&(t.start+=o,t.end+=o):(s=!0,o=u,t.end+=o)},_updateOuterRangesLength:function(){var e,t,r,i,n=this,a=n._ranges||[],s=a.length,o=0;for(t=0;t<s;t++)e=a[t],i=n._isGroupPaged()?n._calculateGroupsTotal(e.data,!0,"items",!0):n._flatData(e.data,!0).length,r?(r.end!=e.start&&(o=e.start-r.end),e.outerStart=r.outerEnd+o,o=0):e.outerStart=e.start,e.outerEnd=e.outerStart+i,r=e}}),ge={},ge.create=function(t,r,i){var n,a=t.transport?e.extend({},t.transport):null;return a?(a.read=typeof a.read===Fe?{url:a.read}:a.read,"jsdo"===t.type&&(a.dataSource=i),t.type&&(Pe.data.transports=Pe.data.transports||{},Pe.data.schemas=Pe.data.schemas||{},Pe.data.transports[t.type]?me(Pe.data.transports[t.type])?a=pe(!0,{},Pe.data.transports[t.type],a):n=new Pe.data.transports[t.type](pe(a,{data:r})):Pe.logToConsole("Unknown DataSource transport type '"+t.type+"'.\nVerify that registration scripts for this type are included after Kendo UI on the page.","warn"),t.schema=pe(!0,{},Pe.data.schemas[t.type],t.schema)),n||(n=Re(a.read)?a:new se(a))):n=new ae({data:t.data||[]}),n},le.create=function(e){(ye(e)||e instanceof it)&&(e={data:e});var r,i,n,a=e||{},s=a.data,o=a.fields,u=a.table,l=a.select,g={};if(s||!o||a.transport||(u?s=J(u,o):l&&(s=U(l,o),a.group===t&&s[0]&&s[0].optgroup!==t&&(a.group="optgroup"))),Pe.data.Model&&o&&(!a.schema||!a.schema.model)){for(r=0,i=o.length;r<i;r++)n=o[r],n.type&&(g[n.field]=n);ve(g)||(a.schema=pe(!0,a.schema,{model:{fields:g}}))}return a.data=s,l=null,a.select=null,u=null,a.table=null,a instanceof le?a:new le(a)},de=Z.define({idField:"id",init:function(e){var t,r=this,i=r.hasChildren||e&&e.hasChildren,n="items",a={};Pe.data.Model.fn.init.call(r,e),typeof r.children===Fe&&(n=r.children),a={schema:{data:n,model:{hasChildren:i,id:r.idField,fields:r.fields}}},typeof r.children!==Fe&&pe(a,r.children),a.data=e,i||(i=a.schema.data),typeof i===Fe&&(i=Pe.getter(i)),Re(i)&&(t=i.call(r,r),r.hasChildren=(!t||0!==t.length)&&!!t),r._childrenOptions=a,r.hasChildren&&r._initChildren(),r._loaded=!(!e||!e._loaded)},_initChildren:function(){var e,t,r,i=this;i.children instanceof he||(e=i.children=new he(i._childrenOptions),t=e.transport,r=t.parameterMap,t.parameterMap=function(e,t){return e[i.idField||"id"]=i.id,r&&(e=r(e,t)),e},e.parent=function(){return i},e.bind(Ie,function(e){e.node=e.node||i,i.trigger(Ie,e)}),e.bind(Ne,function(e){var t=i.parent();t&&(e.node=e.node||i,t.trigger(Ne,e))}),i._updateChildrenField())},append:function(e){this._initChildren(),this.loaded(!0),this.children.add(e)},hasChildren:!1,level:function(){for(var e=this.parentNode(),t=0;e&&e.parentNode;)t++,e=e.parentNode?e.parentNode():null;return t},_updateChildrenField:function(){var e=this._childrenOptions.schema.data;this[e||"items"]=this.children.data()},_childrenLoaded:function(){this._loaded=!0,this._updateChildrenField()},load:function(){var r,i,n={},a="_query";return this.hasChildren?(this._initChildren(),r=this.children,n[this.idField||"id"]=this.id,this._loaded||(r._data=t,a="read"),r.one(Ie,_e(this._childrenLoaded,this)),this._matchFilter&&(n.filter={field:"_matchFilter",operator:"eq",value:!0}),i=r[a](n)):this.loaded(!0),i||e.Deferred().resolve().promise()},parentNode:function(){var e=this.parent();return e.parent()},loaded:function(e){return e===t?this._loaded:(this._loaded=e,
t)},shouldSerialize:function(e){return Z.fn.shouldSerialize.call(this,e)&&"children"!==e&&"_loaded"!==e&&"hasChildren"!==e&&"_childrenOptions"!==e}}),he=le.extend({init:function(e){var t=de.define({children:e});e.filter&&!e.serverFiltering&&(this._hierarchicalFilter=e.filter,e.filter=null),le.fn.init.call(this,pe(!0,{},{schema:{modelBase:t,model:t}},e)),this._attachBubbleHandlers()},_attachBubbleHandlers:function(){var e=this;e._data.bind(Ne,function(t){e.trigger(Ne,t)})},read:function(e){var t=le.fn.read.call(this,e);return this._hierarchicalFilter&&(this._data&&this._data.length>0?this.filter(this._hierarchicalFilter):(this.options.filter=this._hierarchicalFilter,this._filter=l(this.options.filter),this._hierarchicalFilter=null)),t},remove:function(e){var t,r=e.parentNode(),i=this;return r&&r._initChildren&&(i=r.children),t=le.fn.remove.call(i,e),r&&!i.data().length&&(r.hasChildren=!1),t},success:V("success"),data:V("data"),insert:function(e,t){var r=this.parent();return r&&r._initChildren&&(r.hasChildren=!0,r._initChildren()),le.fn.insert.call(this,e,t)},filter:function(e){return e===t?this._filter:(!this.options.serverFiltering&&this._markHierarchicalQuery(e)&&(e={logic:"or",filters:[e,{field:"_matchFilter",operator:"equals",value:!0}]}),this.trigger("reset"),this._query({filter:e,page:1}),t)},_markHierarchicalQuery:function(t){var r,i,n,s,o,u=this.options.accentFoldingFiltering;return t=u?e.extend({},l(t),{accentFoldingFiltering:u}):l(t),t&&0!==t.filters.length?(r=a.filterExpr(t),n=r.fields,s=r.operators,i=o=Function("d, __f, __o","return "+r.expression),(n.length||s.length)&&(o=function(e){return i(e,n,s)}),this._updateHierarchicalFilter(o),!0):(this._updateHierarchicalFilter(function(){return!0}),!1)},_updateHierarchicalFilter:function(e){var t,r,i=this._data,n=!1;for(r=0;r<i.length;r++)t=i[r],t.hasChildren?(t._matchFilter=t.children._updateHierarchicalFilter(e),t._matchFilter||(t._matchFilter=e(t))):t._matchFilter=e(t),t._matchFilter&&(n=!0);return n},_find:function(e,t){var r,i,n,a,s=this._data;if(s){if(n=le.fn[e].call(this,t))return n;for(s=this._flatData(this._data),r=0,i=s.length;r<i;r++)if(a=s[r].children,a instanceof he&&(n=a[e](t)))return n}},get:function(e){return this._find("get",e)},getByUid:function(e){return this._find("getByUid",e)}}),he.create=function(e){e=e&&e.push?{data:e}:e;var t=e||{},r=t.data,i=t.fields,n=t.list;return r&&r._dataSource?r._dataSource:(r||!i||t.transport||n&&(r=Q(n,i)),t.data=r,t instanceof he?t:new he(t))},fe=Pe.Observable.extend({init:function(e,t,r){Pe.Observable.fn.init.call(this),this._prefetching=!1,this.dataSource=e,this.prefetch=!r;var i=this;e.bind("change",function(){i._change()}),e.bind("reset",function(){i._reset()}),this._syncWithDataSource(),this.setViewSize(t)},setViewSize:function(e){this.viewSize=e,this._recalculate()},at:function(e){var r=this.pageSize,i=!0;return e>=this.total()?(this.trigger("endreached",{index:e}),null):this.useRanges?this.useRanges?((e<this.dataOffset||e>=this.skip+r)&&(i=this.range(Math.floor(e/r)*r)),e===this.prefetchThreshold&&this._prefetch(),e===this.midPageThreshold?this.range(this.nextMidRange,!0):e===this.nextPageThreshold?this.range(this.nextFullRange):e===this.pullBackThreshold&&this.range(this.offset===this.skip?this.previousMidRange:this.previousFullRange),i?this.dataSource.at(e-this.dataOffset):(this.trigger("endreached",{index:e}),null)):t:this.dataSource.view()[e]},indexOf:function(e){return this.dataSource.data().indexOf(e)+this.dataOffset},total:function(){return parseInt(this.dataSource.total(),10)},next:function(){var e=this,t=e.pageSize,r=e.skip-e.viewSize+t,i=Ve.max(Ve.floor(r/t),0)*t;this.offset=r,this.dataSource.prefetch(i,t,function(){e._goToRange(r,!0)})},range:function(e,t){if(this.offset===e)return!0;var r=this,i=this.pageSize,n=Ve.max(Ve.floor(e/i),0)*i,a=this.dataSource;return t&&(n+=i),a.inRange(e,i)?(this.offset=e,this._recalculate(),this._goToRange(e),!0):!this.prefetch||(a.prefetch(n,i,function(){r.offset=e,r._recalculate(),r._goToRange(e,!0)}),!1)},syncDataSource:function(){var e=this.offset;this.offset=null,this.range(e)},destroy:function(){this.unbind()},_prefetch:function(){var e=this,t=this.pageSize,r=this.skip+t,i=this.dataSource;i.inRange(r,t)||this._prefetching||!this.prefetch||(this._prefetching=!0,this.trigger("prefetching",{skip:r,take:t}),i.prefetch(r,t,function(){e._prefetching=!1,e.trigger("prefetched",{skip:r,take:t})}))},_goToRange:function(e,t){this.offset===e&&(this.dataOffset=e,this._expanding=t,this.dataSource.range(e,this.pageSize),this.dataSource.enableRequestsInProgress())},_reset:function(){this._syncPending=!0},_change:function(){var e=this.dataSource;this.length=this.useRanges?e.lastRange().end:e.view().length,this._syncPending&&(this._syncWithDataSource(),this._recalculate(),this._syncPending=!1,this.trigger("reset",{offset:this.offset})),this.trigger("resize"),this._expanding&&this.trigger("expand"),delete this._expanding},_syncWithDataSource:function(){var e=this.dataSource;this._firstItemUid=e.firstItemUid(),this.dataOffset=this.offset=e.skip()||0,this.pageSize=e.pageSize(),this.useRanges=e.options.serverPaging},_recalculate:function(){var e=this.pageSize,t=this.offset,r=this.viewSize,i=Math.ceil(t/e)*e;this.skip=i,this.midPageThreshold=i+e-1,this.nextPageThreshold=i+r-1,this.prefetchThreshold=i+Math.floor(e/3*2),this.pullBackThreshold=this.offset-1,this.nextMidRange=i+e-r,this.nextFullRange=i,this.previousMidRange=t-r,this.previousFullRange=i-e}}),ce=Pe.Observable.extend({init:function(e,t){var r=this;Pe.Observable.fn.init.call(r),this.dataSource=e,this.batchSize=t,this._total=0,this.buffer=new fe(e,3*t),this.buffer.bind({endreached:function(e){r.trigger("endreached",{index:e.index})},prefetching:function(e){r.trigger("prefetching",{skip:e.skip,take:e.take})},prefetched:function(e){r.trigger("prefetched",{skip:e.skip,take:e.take})},reset:function(){r._total=0,r.trigger("reset")},resize:function(){r._total=Math.ceil(this.length/r.batchSize),r.trigger("resize",{total:r.total(),offset:this.offset})}})},syncDataSource:function(){this.buffer.syncDataSource()},at:function(e){var t,r,i=this.buffer,n=e*this.batchSize,a=this.batchSize,s=[];for(i.offset>n&&i.at(i.offset-1),r=0;r<a&&(t=i.at(n+r),null!==t);r++)s.push(t);return s},total:function(){return this._total},destroy:function(){this.buffer.destroy(),this.unbind()}}),pe(!0,Pe.data,{readers:{json:ue},Query:a,DataSource:le,HierarchicalDataSource:he,Node:de,ObservableObject:K,ObservableArray:it,LazyObservableArray:$,LocalTransport:ae,RemoteTransport:se,Cache:oe,DataReader:ue,Model:Z,Buffer:fe,BatchBuffer:ce})}(window.kendo.jQuery),window.kendo},"function"==typeof define&&define.amd?define:function(e,t,r){(r||t)()});
//# sourceMappingURL=kendo.data.min.js.map
;
/** 
 * Kendo UI v2020.2.513 (http://www.telerik.com/kendo-ui)                                                                                                                                               
 * Copyright 2020 Progress Software Corporation and/or one of its subsidiaries or affiliates. All rights reserved.                                                                                      
 *                                                                                                                                                                                                      
 * Kendo UI commercial licenses may be obtained at                                                                                                                                                      
 * http://www.telerik.com/purchase/license-agreement/kendo-ui-complete                                                                                                                                  
 * If you do not own a commercial license, this file shall be governed by the trial license terms.                                                                                                      
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       

*/

!function(e,define){define("kendo.binder.min",["kendo.core.min","kendo.data.min"],e)}(function(){return function(e,t){function i(t,i,n){return p.extend({init:function(e,t,i){var n=this;p.fn.init.call(n,e.element[0],t,i),n.widget=e,n._dataBinding=M(n.dataBinding,n),n._dataBound=M(n.dataBound,n),n._itemChange=M(n.itemChange,n)},itemChange:function(e){r(e.item[0],e.data,this._ns(e.ns),[e.data].concat(this.bindings[t]._parents()))},dataBinding:function(e){var t,i,n=this.widget,s=e.removedItems||n.items();for(t=0,i=s.length;t<i;t++)h(s[t],!1)},_ns:function(t){t=t||C.ui;var i=[C.ui,C.dataviz.ui,C.mobile.ui];return i.splice(e.inArray(t,i),1),i.unshift(t),C.rolesFromNamespaces(i)},dataBound:function(e){var n,s,a,d,o=this.widget,h=e.addedItems||o.items(),l=o[i],c=C.data.HierarchicalDataSource;if(!(c&&l instanceof c)&&h.length)for(a=e.addedDataItems||l.flatView(),d=this.bindings[t]._parents(),n=0,s=a.length;n<s;n++)h[n]&&r(h[n],a[n],this._ns(e.ns),[a[n]].concat(d))},refresh:function(e){var s,a,r,d,o=this,h=o.widget;e=e||{},e.action||(o.destroy(),h.bind("dataBinding",o._dataBinding),h.bind("dataBound",o._dataBound),h.bind("itemChange",o._itemChange),s=o.bindings[t].get(),h[i]instanceof C.data.DataSource&&h[i]!=s&&(s instanceof C.data.DataSource?h[n](s):s&&s._dataSource?h[n](s._dataSource):(a=C.ui.Select&&h instanceof C.ui.Select,r=C.ui.MultiSelect&&h instanceof C.ui.MultiSelect,d=C.ui.DropDownTree&&h instanceof C.ui.DropDownTree,d?h.treeview[i].data(s):h[i].data(s),o.bindings.value&&(a||r)&&h.value(u(o.bindings.value.get(),h.options.dataValueField)))))},destroy:function(){var e=this.widget;e.unbind("dataBinding",this._dataBinding),e.unbind("dataBound",this._dataBound),e.unbind("itemChange",this._itemChange)}})}function n(e,t){var i=C.initWidget(e,{},t);if(i)return new _(i)}function s(e){var t,i,n,a,r,d,o,h={};for(o=e.match(x),t=0,i=o.length;t<i;t++)n=o[t],a=n.indexOf(":"),r=n.substring(0,a),d=n.substring(a+1),"{"==d.charAt(0)&&(d=s(d)),h[r]=d;return h}function a(e,t,i){var n,s={};for(n in e)s[n]=new i(t,e[n]);return s}function r(e,t,i,d){var h,l,c,g,u,p,m,y,_;if(e&&!e.getAttribute("data-"+C.ns+"stop")&&(h=e.getAttribute("data-"+C.ns+"role"),c=e.getAttribute("data-"+C.ns+"bind"),g=[],u=!0,m={},d=d||[t],(h||c)&&o(e,!1),h&&(y=n(e,i)),c&&(c=s(c.replace(B,"")),y||(m=C.parseOptions(e,{textField:"",valueField:"",template:"",valueUpdate:j,valuePrimitive:!1,autoBind:!0},t),m.roles=i,y=new w(e,m)),y.source=t,p=a(c,d,f),m.template&&(p.template=new v(d,"",m.template)),p.click&&(c.events=c.events||{},c.events.click=c.click,p.click.destroy(),delete p.click),p.source&&(u=!1),c.attr&&(p.attr=a(c.attr,d,f)),c.style&&(p.style=a(c.style,d,f)),c.events&&(p.events=a(c.events,d,b)),c.css&&(p.css=a(c.css,d,f)),y.bind(p)),y&&(e.kendoBindingTarget=y),_=e.children,u&&_&&!e.getAttribute("data-"+C.ns+"stop"))){for(l=0;l<_.length;l++)g[l]=_[l];for(l=0;l<g.length;l++)r(g[l],t,i,d)}}function d(t,i){var n,s,a,d=C.rolesFromNamespaces([].slice.call(arguments,2));for(i=C.observable(i),t=e(t),n=0,s=t.length;n<s;n++)a=t[n],1===a.nodeType&&r(a,i,d)}function o(t,i){var n,s=t.kendoBindingTarget;s&&(s.destroy(),L?delete t.kendoBindingTarget:t.removeAttribute?t.removeAttribute("kendoBindingTarget"):t.kendoBindingTarget=null),i&&(n=C.widgetInstance(e(t)),n&&typeof n.destroy===P&&n.destroy())}function h(e,t){o(e,t),l(e,t)}function l(e,t){var i,n,s=e.children;if(s)for(i=0,n=s.length;i<n;i++)h(s[i],t)}function c(t){var i,n;for(t=e(t),i=0,n=t.length;i<n;i++)h(t[i],!1)}function g(e,t){var i=e.element,n=i[0].kendoBindingTarget;n&&d(i,n.source,t)}function u(e,t){var i,n,s=[],a=0;if(!t)return e;if(e instanceof D){for(i=e.length;a<i;a++)n=e[a],s[a]=n.get?n.get(t):n[t];e=s}else e instanceof S&&(e=e.get(t));return e}var f,b,v,p,m,y,w,_,x,B,C=window.kendo,k=C.Observable,S=C.data.ObservableObject,D=C.data.ObservableArray,F={}.toString,T={},A=C.Class,M=e.proxy,I="value",V="source",O="events",H="checked",N="css",L=!0,P="function",j="change";!function(){var e=document.createElement("a");try{delete e.test}catch(t){L=!1}}(),f=k.extend({init:function(e,t){var i=this;k.fn.init.call(i),i.source=e[0],i.parents=e,i.path=t,i.dependencies={},i.dependencies[t]=!0,i.observable=i.source instanceof k,i._access=function(e){i.dependencies[e.field]=!0},i.observable&&(i._change=function(e){i.change(e)},i.source.bind(j,i._change))},_parents:function(){var t,i=this.parents,n=this.get();return n&&"function"==typeof n.parent&&(t=n.parent(),e.inArray(t,i)<0&&(i=[t].concat(i))),i},change:function(e){var t,i,n=e.field,s=this;if("this"===s.path)s.trigger(j,e);else for(t in s.dependencies)if(0===t.indexOf(n)&&(i=t.charAt(n.length),!i||"."===i||"["===i)){s.trigger(j,e);break}},start:function(e){e.bind("get",this._access)},stop:function(e){e.unbind("get",this._access)},get:function(){var e=this,i=e.source,n=0,s=e.path,a=i;if(!e.observable)return a;for(e.start(e.source),a=i.get(s);a===t&&i;)i=e.parents[++n],i instanceof S&&(a=i.get(s));if(a===t)for(i=e.source;a===t&&i;)i=i.parent(),i instanceof S&&(a=i.get(s));return"function"==typeof a&&(n=s.lastIndexOf("."),n>0&&(i=i.get(s.substring(0,n))),e.start(i),a=i!==e.source?a.call(i,e.source):a.call(i),e.stop(i)),i&&i!==e.source&&(e.currentSource=i,i.unbind(j,e._change).bind(j,e._change)),e.stop(e.source),a},set:function(e){var t=this.currentSource||this.source,i=C.getter(this.path)(t);"function"==typeof i?t!==this.source?i.call(t,this.source,e):i.call(t,e):t.set(this.path,e)},destroy:function(){this.observable&&(this.source.unbind(j,this._change),this.currentSource&&this.currentSource.unbind(j,this._change)),this.unbind()}}),b=f.extend({get:function(){var e,t=this.source,i=this.path,n=0;for(e=t.get(i);!e&&t;)t=this.parents[++n],t instanceof S&&(e=t.get(i));return M(e,t)}}),v=f.extend({init:function(e,t,i){var n=this;f.fn.init.call(n,e,t),n.template=i},render:function(e){var t;return this.start(this.source),t=C.render(this.template,e),this.stop(this.source),t}}),p=A.extend({init:function(e,t,i){this.element=e,this.bindings=t,this.options=i},bind:function(e,t){var i=this;e=t?e[t]:e,e.bind(j,function(e){i.refresh(t||e)}),i.refresh(t)},destroy:function(){}}),m=p.extend({dataType:function(){var e=this.element.getAttribute("data-type")||this.element.type||"text";return e.toLowerCase()},parsedValue:function(){return this._parseValue(this.element.value,this.dataType())},_parseValue:function(e,t){return"date"==t?e=C.parseDate(e,"yyyy-MM-dd"):"datetime-local"==t?e=C.parseDate(e,["yyyy-MM-ddTHH:mm:ss","yyyy-MM-ddTHH:mm"]):"number"==t?e=C.parseFloat(e):"boolean"==t&&(e=e.toLowerCase(),e=null!==C.parseFloat(e)?!!C.parseFloat(e):"true"===e.toLowerCase()),e}}),T.attr=p.extend({refresh:function(e){this.element.setAttribute(e,this.bindings.attr[e].get())}}),T.css=p.extend({init:function(e,t,i){p.fn.init.call(this,e,t,i),this.classes={}},refresh:function(t){var i=e(this.element),n=this.bindings.css[t],s=this.classes[t]=n.get();s?i.addClass(t):i.removeClass(t)}}),T.style=p.extend({refresh:function(e){this.element.style[e]=this.bindings.style[e].get()||""}}),T.enabled=p.extend({refresh:function(){this.bindings.enabled.get()?this.element.removeAttribute("disabled"):this.element.setAttribute("disabled","disabled")}}),T.readonly=p.extend({refresh:function(){this.bindings.readonly.get()?this.element.setAttribute("readonly","readonly"):this.element.removeAttribute("readonly")}}),T.disabled=p.extend({refresh:function(){this.bindings.disabled.get()?this.element.setAttribute("disabled","disabled"):this.element.removeAttribute("disabled")}}),T.events=p.extend({init:function(e,t,i){p.fn.init.call(this,e,t,i),this.handlers={}},refresh:function(t){var i=e(this.element),n=this.bindings.events[t],s=this.handlers[t];s&&i.off(t,s),s=this.handlers[t]=n.get(),i.on(t,n.source,s)},destroy:function(){var t,i=e(this.element);for(t in this.handlers)i.off(t,this.handlers[t])}}),T.text=p.extend({refresh:function(){var t=this.bindings.text.get(),i=this.element.getAttribute("data-format")||"";null==t&&(t=""),e(this.element).text(C.toString(t,i))}}),T.visible=p.extend({refresh:function(){this.element.style.display=this.bindings.visible.get()?"":"none"}}),T.invisible=p.extend({refresh:function(){this.element.style.display=this.bindings.invisible.get()?"none":""}}),T.html=p.extend({refresh:function(){this.element.innerHTML=this.bindings.html.get()}}),T.value=m.extend({init:function(t,i,n){m.fn.init.call(this,t,i,n),this._change=M(this.change,this),this.eventName=n.valueUpdate||j,e(this.element).on(this.eventName,this._change),this._initChange=!1},change:function(){this._initChange=this.eventName!=j,this.bindings[I].set(this.parsedValue()),this._initChange=!1},refresh:function(){var e,t;this._initChange||(e=this.bindings[I].get(),null==e&&(e=""),t=this.dataType(),"date"==t?e=C.toString(e,"yyyy-MM-dd"):"datetime-local"==t&&(e=C.toString(e,"yyyy-MM-ddTHH:mm:ss")),this.element.value=e),this._initChange=!1},destroy:function(){e(this.element).off(this.eventName,this._change)}}),T.source=p.extend({init:function(e,t,i){p.fn.init.call(this,e,t,i);var n=this.bindings.source.get();n instanceof C.data.DataSource&&i.autoBind!==!1&&n.fetch()},refresh:function(e){var t=this,i=t.bindings.source.get();i instanceof D||i instanceof C.data.DataSource?(e=e||{},"add"==e.action?t.add(e.index,e.items):"remove"==e.action?t.remove(e.index,e.items):"itemchange"!=e.action&&t.render()):t.render()},container:function(){var e=this.element;return"table"==e.nodeName.toLowerCase()&&(e.tBodies[0]||e.appendChild(document.createElement("tbody")),e=e.tBodies[0]),e},template:function(){var e=this.options,t=e.template,i=this.container().nodeName.toLowerCase();return t||(t="select"==i?e.valueField||e.textField?C.format('<option value="#:{0}#">#:{1}#</option>',e.valueField||e.textField,e.textField||e.valueField):"<option>#:data#</option>":"tbody"==i?"<tr><td>#:data#</td></tr>":"ul"==i||"ol"==i?"<li>#:data#</li>":"#:data#",t=C.template(t)),t},add:function(t,i){var n,s,a,d,o=this.container(),h=o.cloneNode(!1),l=o.children[t];if(e(h).html(C.render(this.template(),i)),h.children.length)for(n=this.bindings.source._parents(),s=0,a=i.length;s<a;s++)d=h.children[0],o.insertBefore(d,l||null),r(d,i[s],this.options.roles,[i[s]].concat(n))},remove:function(e,t){var i,n,s=this.container();for(i=0;i<t.length;i++)n=s.children[e],h(n,!0),n.parentNode==s&&s.removeChild(n)},render:function(){var t,i,n,s=this.bindings.source.get(),a=this.container(),d=this.template();if(null!=s)if(s instanceof C.data.DataSource&&(s=s.view()),s instanceof D||"[object Array]"===F.call(s)||(s=[s]),this.bindings.template){if(l(a,!0),e(a).html(this.bindings.template.render(s)),a.children.length)for(t=this.bindings.source._parents(),i=0,n=s.length;i<n;i++)r(a.children[i],s[i],this.options.roles,[s[i]].concat(t))}else e(a).html(C.render(d,s))}}),T.input={checked:m.extend({init:function(t,i,n){m.fn.init.call(this,t,i,n),this._change=M(this.change,this),e(this.element).change(this._change)},change:function(){var e,t,i,n=this.element,s=this.value();if("radio"==n.type)s=this.parsedValue(),this.bindings[H].set(s);else if("checkbox"==n.type)if(e=this.bindings[H].get(),e instanceof D){if(s=this.parsedValue(),s instanceof Date){for(i=0;i<e.length;i++)if(e[i]instanceof Date&&+e[i]===+s){t=i;break}}else t=e.indexOf(s);t>-1?e.splice(t,1):e.push(s)}else this.bindings[H].set(s)},refresh:function(){var e,i,n=this.bindings[H].get(),s=n,a=this.dataType(),r=this.element;if("checkbox"==r.type)if(s instanceof D){if(e=-1,n=this.parsedValue(),n instanceof Date){for(i=0;i<s.length;i++)if(s[i]instanceof Date&&+s[i]===+n){e=i;break}}else e=s.indexOf(n);r.checked=e>=0}else r.checked=s;else"radio"==r.type&&("date"==a?n=C.toString(n,"yyyy-MM-dd"):"datetime-local"==a&&(n=C.toString(n,"yyyy-MM-ddTHH:mm:ss")),r.checked=null!==n&&t!==n&&r.value===""+n)},value:function(){var e=this.element,t=e.value;return"checkbox"==e.type&&(t=e.checked),t},destroy:function(){e(this.element).off(j,this._change)}})},T.select={source:T.source.extend({refresh:function(i){var n,s=this,a=s.bindings.source.get();a instanceof D||a instanceof C.data.DataSource?(i=i||{},"add"==i.action?s.add(i.index,i.items):"remove"==i.action?s.remove(i.index,i.items):"itemchange"!=i.action&&i.action!==t||(s.render(),s.bindings.value&&s.bindings.value&&(n=u(s.bindings.value.get(),e(s.element).data("valueField")),null===n?s.element.selectedIndex=-1:s.element.value=n))):s.render()}}),value:m.extend({init:function(t,i,n){m.fn.init.call(this,t,i,n),this._change=M(this.change,this),e(this.element).change(this._change)},parsedValue:function(){var e,t,i,n,s=this.dataType(),a=[];for(i=0,n=this.element.options.length;i<n;i++)t=this.element.options[i],t.selected&&(e=t.attributes.value,e=e&&e.specified?t.value:t.text,a.push(this._parseValue(e,s)));return a},change:function(){var e,i,n,s,a,r,d,o,h=[],l=this.element,c=this.options.valueField||this.options.textField,g=this.options.valuePrimitive;for(a=0,r=l.options.length;a<r;a++)i=l.options[a],i.selected&&(s=i.attributes.value,s=s&&s.specified?i.value:i.text,h.push(c?s:this._parseValue(s,this.dataType())));if(c)for(e=this.bindings.source.get(),e instanceof C.data.DataSource&&(e=e.view()),n=0;n<h.length;n++)for(a=0,r=e.length;a<r;a++)if(d=e[a].get(c),o=d+""===h[n]){h[n]=e[a];break}s=this.bindings[I].get(),s instanceof D?s.splice.apply(s,[0,s.length].concat(h)):this.bindings[I].set(g||!(s instanceof S||null===s||s===t)&&c?h[0].get(c):h[0])},refresh:function(){var e,t,i,n=this.element,s=n.options,a=this.bindings[I].get(),r=a,d=this.options.valueField||this.options.textField,o=!1,h=this.dataType();for(r instanceof D||(r=new D([a])),n.selectedIndex=-1,i=0;i<r.length;i++)for(a=r[i],d&&a instanceof S&&(a=a.get(d)),"date"==h?a=C.toString(r[i],"yyyy-MM-dd"):"datetime-local"==h&&(a=C.toString(r[i],"yyyy-MM-ddTHH:mm:ss")),e=0;e<s.length;e++)t=s[e].value,""===t&&""!==a&&(t=s[e].text),null!=a&&t==""+a&&(s[e].selected=!0,o=!0)},destroy:function(){e(this.element).off(j,this._change)}})},T.widget={events:p.extend({init:function(e,t,i){p.fn.init.call(this,e.element[0],t,i),this.widget=e,this.handlers={}},refresh:function(e){var t=this.bindings.events[e],i=this.handlers[e];i&&this.widget.unbind(e,i),i=t.get(),this.handlers[e]=function(e){e.data=t.source,i(e),e.data===t.source&&delete e.data},this.widget.bind(e,this.handlers[e])},destroy:function(){var e;for(e in this.handlers)this.widget.unbind(e,this.handlers[e])}}),checked:p.extend({init:function(e,t,i){p.fn.init.call(this,e.element[0],t,i),this.widget=e,this._change=M(this.change,this),this.widget.bind(j,this._change)},change:function(){this.bindings[H].set(this.value())},refresh:function(){this.widget.check(this.bindings[H].get()===!0)},value:function(){var e=this.element,t=e.value;return"on"!=t&&"off"!=t&&"checkbox"!=this.element.type||(t=e.checked),t},destroy:function(){this.widget.unbind(j,this._change)}}),start:p.extend({init:function(e,t,i){p.fn.init.call(this,e.element[0],t,i),this._change=M(this.change,this),this.widget=e,this.widget.bind(j,this._change)},change:function(){this.bindings.start.set(this.widget.range().start)},refresh:function(){var e=this,t=this.bindings.start.get(),i=e.widget._range?e.widget._range.end:null;this.widget.range({start:t,end:i})},destroy:function(){this.widget.unbind(j,this._change)}}),end:p.extend({init:function(e,t,i){p.fn.init.call(this,e.element[0],t,i),this._change=M(this.change,this),this.widget=e,this.widget.bind(j,this._change)},change:function(){this.bindings.end.set(this.widget.range().end)},refresh:function(){var e=this,t=this.bindings.end.get(),i=e.widget._range?e.widget._range.start:null;this.widget.range({start:i,end:t})},destroy:function(){this.widget.unbind(j,this._change)}}),visible:p.extend({init:function(e,t,i){p.fn.init.call(this,e.element[0],t,i),this.widget=e},refresh:function(){var e=this.bindings.visible.get();this.widget.wrapper[0].style.display=e?"":"none"}}),invisible:p.extend({init:function(e,t,i){p.fn.init.call(this,e.element[0],t,i),this.widget=e},refresh:function(){var e=this.bindings.invisible.get();this.widget.wrapper[0].style.display=e?"none":""}}),enabled:p.extend({init:function(e,t,i){p.fn.init.call(this,e.element[0],t,i),this.widget=e},refresh:function(){this.widget.enable&&this.widget.enable(this.bindings.enabled.get())}}),disabled:p.extend({init:function(e,t,i){p.fn.init.call(this,e.element[0],t,i),this.widget=e},refresh:function(){this.widget.enable&&this.widget.enable(!this.bindings.disabled.get())}}),source:i("source","dataSource","setDataSource"),value:p.extend({init:function(t,i,n){p.fn.init.call(this,t.element[0],i,n),this.widget=t,this._change=e.proxy(this.change,this),this.widget.first(j,this._change);var s=this.bindings.value.get();this._valueIsObservableObject=!n.valuePrimitive&&(null==s||s instanceof S),this._valueIsObservableArray=s instanceof D,this._initChange=!1},_source:function(){var e;return this.widget.dataItem&&(e=this.widget.dataItem(),e&&e instanceof S)?[e]:(this.bindings.source&&(e=this.bindings.source.get()),(!e||e instanceof C.data.DataSource)&&(e=this.widget.dataSource.flatView()),e)},change:function(){var e,t,i,n,s,a,r,d=this.widget.value(),o=this.options.dataValueField||this.options.dataTextField,h="[object Array]"===F.call(d),l=this._valueIsObservableObject,c=[];if(this._initChange=!0,o)if(""===d&&(l||this.options.valuePrimitive))d=null;else{for(r=this._source(),h&&(t=d.length,c=d.slice(0)),s=0,a=r.length;s<a;s++)if(i=r[s],n=i.get(o),h){for(e=0;e<t;e++)if(n==c[e]){c[e]=i;break}}else if(n==d){d=l?i:n;break}c[0]&&(d=this._valueIsObservableArray?c:l||!o?c[0]:c[0].get(o))}this.bindings.value.set(d),this._initChange=!1},refresh:function(){var e,i,n,s,a,r,d,o,h;if(!this._initChange){if(e=this.widget,i=e.options,n=i.dataTextField,s=i.dataValueField||n,a=this.bindings.value.get(),r=i.text||"",d=0,h=[],a===t&&(a=null),s)if(a instanceof D){for(o=a.length;d<o;d++)h[d]=a[d].get(s);a=h}else a instanceof S&&(r=a.get(n),a=a.get(s));i.autoBind!==!1||i.cascadeFrom||!e.listView||e.listView.bound()?e.value(a):(n!==s||r||(r=a),r||!a&&0!==a||!i.valuePrimitive?e._preselect(a,r):e.value(a))}this._initChange=!1},destroy:function(){this.widget.unbind(j,this._change)}}),dropdowntree:{value:p.extend({init:function(t,i,n){p.fn.init.call(this,t.element[0],i,n),this.widget=t,this._change=e.proxy(this.change,this),this.widget.first(j,this._change),this._initChange=!1},change:function(){var e,i,n,s,a,r,d,o,h,l=this,c=l.bindings[I].get(),g=l.options.valuePrimitive,u=l.widget.treeview.select(),f=l.widget._isMultipleSelection()?l.widget._getAllChecked():l.widget.treeview.dataItem(u)||l.widget.value(),b=g||l.widget.options.autoBind===!1?l.widget.value():f,v=this.options.dataValueField||this.options.dataTextField;if(b=b.slice?b.slice(0):b,l._initChange=!0,c instanceof D){for(e=[],i=b.length,n=0,s=0,a=c[n],r=!1;a!==t;){for(h=!1,s=0;s<i;s++)if(g?r=b[s]==a:(o=b[s],o=o.get?o.get(v):o,r=o==(a.get?a.get(v):a)),r){b.splice(s,1),i-=1,h=!0;break}h?n+=1:(e.push(a),y(c,n,1),d=n),a=c[n]}y(c,c.length,0,b),e.length&&c.trigger("change",{action:"remove",items:e,index:d}),b.length&&c.trigger("change",{action:"add",items:b,index:c.length-1})}else l.bindings[I].set(b);l._initChange=!1},refresh:function(){if(!this._initChange){var e,t,i=this.options,n=this.widget,s=i.dataValueField||i.dataTextField,a=this.bindings.value.get(),r=a,d=0,o=[];if(s)if(a instanceof D){for(e=a.length;d<e;d++)t=a[d],o[d]=t.get?t.get(s):t;a=o}else a instanceof S&&(a=a.get(s));i.autoBind===!1&&i.valuePrimitive!==!0?n._preselect(r,a):n.value(a)}},destroy:function(){this.widget.unbind(j,this._change)}})},gantt:{dependencies:i("dependencies","dependencies","setDependenciesDataSource")},multiselect:{value:p.extend({init:function(t,i,n){p.fn.init.call(this,t.element[0],i,n),this.widget=t,this._change=e.proxy(this.change,this),this.widget.first(j,this._change),this._initChange=!1},change:function(){var e,i,n,s,a,r,d,o,h,l=this,c=l.bindings[I].get(),g=l.options.valuePrimitive,u=g?l.widget.value():l.widget.dataItems(),f=this.options.dataValueField||this.options.dataTextField;if(u=u.slice(0),l._initChange=!0,c instanceof D){for(e=[],i=u.length,n=0,s=0,a=c[n],r=!1;a!==t;){for(h=!1,s=0;s<i;s++)if(g?r=u[s]==a:(o=u[s],o=o.get?o.get(f):o,r=o==(a.get?a.get(f):a)),r){u.splice(s,1),i-=1,h=!0;break}h?n+=1:(e.push(a),y(c,n,1),d=n),a=c[n]}y(c,c.length,0,u),e.length&&c.trigger("change",{action:"remove",items:e,index:d}),u.length&&c.trigger("change",{action:"add",items:u,index:c.length-1})}else l.bindings[I].set(u);l._initChange=!1},refresh:function(){if(!this._initChange){var e,i,n=this.options,s=this.widget,a=n.dataValueField||n.dataTextField,r=this.bindings.value.get(),d=r,o=0,h=[];if(r===t&&(r=null),a)if(r instanceof D){for(e=r.length;o<e;o++)i=r[o],h[o]=i.get?i.get(a):i;r=h}else r instanceof S&&(r=r.get(a));n.autoBind!==!1||n.valuePrimitive===!0||s._isBound()?s.value(r):s._preselect(d,r)}},destroy:function(){this.widget.unbind(j,this._change)}})},scheduler:{source:i("source","dataSource","setDataSource").extend({dataBound:function(e){var t,i,n,s,a=this.widget,d=e.addedItems||a.items();if(d.length)for(n=e.addedDataItems||a.dataItems(),s=this.bindings.source._parents(),t=0,i=n.length;t<i;t++)r(d[t],n[t],this._ns(e.ns),[n[t]].concat(s))}})},grid:{source:i("source","dataSource","setDataSource").extend({dataBound:function(e){var t,i,n,s,a=this.widget,d=e.addedItems||a.items();if(d.length)for(s=e.addedDataItems||a.dataItems(),n=this.bindings.source._parents(),t=0,i=s.length;t<i;t++)r(d[t],s[t],this._ns(e.ns),[s[t]].concat(n))}})}},y=function(e,t,i,n){var s,a,r,d,o;if(n=n||[],i=i||0,s=n.length,a=e.length,r=[].slice.call(e,t+i),d=r.length,s){for(s=t+s,o=0;t<s;t++)e[t]=n[o],o++;e.length=s}else if(i)for(e.length=t,i+=t;t<i;)delete e[--i];if(d){for(d=t+d,o=0;t<d;t++)e[t]=r[o],o++;e.length=d}for(t=e.length;t<a;)delete e[t],t++},w=A.extend({init:function(e,t){this.target=e,this.options=t,this.toDestroy=[]},bind:function(e){var t,i,n,s,a,r,d=this instanceof _,o=this.binders();for(t in e)t==I?i=!0:t==V?n=!0:t!=O||d?t==H?a=!0:t==N?r=!0:this.applyBinding(t,e,o):s=!0;n&&this.applyBinding(V,e,o),i&&this.applyBinding(I,e,o),a&&this.applyBinding(H,e,o),s&&!d&&this.applyBinding(O,e,o),r&&!d&&this.applyBinding(N,e,o)},binders:function(){return T[this.target.nodeName.toLowerCase()]||{}},applyBinding:function(e,t,i){var n,s=i[e]||T[e],a=this.toDestroy,r=t[e];if(s)if(s=new s(this.target,t,this.options),a.push(s),r instanceof f)s.bind(r),a.push(r);else for(n in r)s.bind(r,n),a.push(r[n]);else if("template"!==e)throw Error("The "+e+" binding is not supported by the "+this.target.nodeName.toLowerCase()+" element")},destroy:function(){var e,t,i=this.toDestroy;for(e=0,t=i.length;e<t;e++)i[e].destroy()}}),_=w.extend({binders:function(){return T.widget[this.target.options.name.toLowerCase()]||{}},applyBinding:function(e,t,i){var n,s=i[e]||T.widget[e],a=this.toDestroy,r=t[e];if(!s)throw Error("The "+e+" binding is not supported by the "+this.target.options.name+" widget");if(s=new s(this.target,t,this.target.options),a.push(s),r instanceof f)s.bind(r),a.push(r);else for(n in r)s.bind(r,n),a.push(r[n])}}),x=/[A-Za-z0-9_\-]+:(\{([^}]*)\}|[^,}]+)/g,B=/\s/g,C.unbind=c,C.bind=d,C.data.binders=T,C.data.Binder=p,C.notify=g,C.observable=function(e){return e instanceof S||(e=new S(e)),e},C.observableHierarchy=function(e){function t(e){var i,n;for(i=0;i<e.length;i++)e[i]._initChildren(),n=e[i].children,n.fetch(),e[i].items=n.data(),t(e[i].items)}var i=C.data.HierarchicalDataSource.create(e);return i.fetch(),t(i.data()),i._data._dataSource=i,i._data}}(window.kendo.jQuery),window.kendo},"function"==typeof define&&define.amd?define:function(e,t,i){(i||t)()});
//# sourceMappingURL=kendo.binder.min.js.map
;
/** 
 * Kendo UI v2020.2.513 (http://www.telerik.com/kendo-ui)                                                                                                                                               
 * Copyright 2020 Progress Software Corporation and/or one of its subsidiaries or affiliates. All rights reserved.                                                                                      
 *                                                                                                                                                                                                      
 * Kendo UI commercial licenses may be obtained at                                                                                                                                                      
 * http://www.telerik.com/purchase/license-agreement/kendo-ui-complete                                                                                                                                  
 * If you do not own a commercial license, this file shall be governed by the trial license terms.                                                                                                      
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       
                                                                                                                                                                                                       

*/

!function(e,define){define("kendo.treeview.min",["kendo.data.min","kendo.treeview.draganddrop.min"],e)}(function(){return function(e,t){function n(e){return function(t){var n=t.children(".k-animation-container");return n.length||(n=t),n.children(e)}}function a(e){return p.template(e,{useWithBlock:!1})}function i(e){return e.find(".k-checkbox-wrapper:first input[type=checkbox]")}function r(e){return function(t,n){n=n.closest(G);var a,i=n.parent();return i.parent().is("li")&&(a=i.parent()),this._dataSourceMove(t,i,a,function(t,a){var i=this.dataItem(n),r=i?i.parent().indexOf(i):n.index();return this._insert(t.data(),a,r+e)})}}function s(e,t){for(var n;e&&"ul"!=e.nodeName.toLowerCase();)n=e,e=e.nextSibling,3==n.nodeType&&(n.nodeValue=p.trim(n.nodeValue)),u.test(n.className)?t.insertBefore(n,t.firstChild):t.appendChild(n)}function o(t){var n=t.children("div"),a=t.children("ul"),i=n.children(".k-icon"),r=t.children("input[type=checkbox]"),o=n.children(".k-in");t.hasClass("k-treeview")||(n.length||(n=e("<div />").prependTo(t)),!i.length&&a.length?i=e("<span class='k-icon' />").prependTo(n):a.length&&a.children().length||(i.remove(),a.remove()),r.length&&e("<span class='k-checkbox-wrapper' />").appendTo(n).append(r),o.length||(o=t.children("a").eq(0).addClass("k-in k-link"),o.length||(o=e("<span class='k-in' />")),o.appendTo(n),n.length&&s(n[0].nextSibling,o[0])))}var d,l,c,h,u,p=window.kendo,f=p.ui,g=p.data,m=e.extend,k=p.template,v=e.isArray,_=f.Widget,x=g.HierarchicalDataSource,b=e.proxy,C=p.keys,w=".kendoTreeView",y=".kendoTreeViewTemp",S="select",N="check",T="navigate",I="expand",D="change",B="error",A="checked",O="indeterminate",U="collapse",E="dragstart",L="drag",H="drop",V="dragend",q="dataBound",F="click",j="undefined",R="k-state-hover",P="k-treeview",M=":visible",G=".k-item",Q="string",W="aria-checked",J="aria-selected",X="aria-disabled",Y="aria-expanded",$="k-state-disabled",z={text:"dataTextField",url:"dataUrlField",spriteCssClass:"dataSpriteCssClassField",imageUrl:"dataImageUrlField"},K=function(e){return e instanceof p.jQuery||window.jQuery&&e instanceof window.jQuery},Z=function(e){return"object"==typeof HTMLElement?e instanceof HTMLElement:e&&"object"==typeof e&&1===e.nodeType&&typeof e.nodeName===Q};l=n(".k-group"),c=n(".k-group,.k-content"),h=function(e){return e.children("div").children(".k-icon")},u=/k-sprite/,d=p.ui.DataBoundWidget.extend({init:function(e,t){var n,a=this,i=!1,r=t&&!!t.dataSource;v(t)&&(t={dataSource:t}),t&&typeof t.loadOnDemand==j&&v(t.dataSource)&&(t.loadOnDemand=!1),_.prototype.init.call(a,e,t),e=a.element,t=a.options,a._dataSourceUids={},n=e.is("ul")&&e||e.hasClass(P)&&e.children("ul"),i=!r&&n.length,i&&(t.dataSource.list=n),a._animation(),a._accessors(),a._templates(),e.hasClass(P)?(a.wrapper=e,a.root=e.children("ul").eq(0)):(a._wrapper(),n&&(a.root=e,a._group(a.wrapper))),a._tabindex(),a.wrapper.attr("role","tree"),a._dataSource(i),a._attachEvents(),a._dragging(),i?a._syncHtmlAndDataSource():t.autoBind&&(a._progress(!0),a.dataSource.fetch()),t.checkboxes&&t.checkboxes.checkChildren&&a.updateIndeterminate(),a.element[0].id&&(a._ariaId=p.format("{0}_tv_active",a.element[0].id)),p.notify(a)},_attachEvents:function(){var t=this,n=".k-in:not(.k-state-selected,.k-state-disabled)",a="mouseenter";t.wrapper.on(a+w,".k-in.k-state-selected",function(e){e.preventDefault()}).on(a+w,n,function(){e(this).addClass(R)}).on("mouseleave"+w,n,function(){e(this).removeClass(R)}).on(F+w,n,b(t._click,t)).on("dblclick"+w,".k-in:not(.k-state-disabled)",b(t._toggleButtonClick,t)).on(F+w,".k-i-expand,.k-i-collapse",b(t._toggleButtonClick,t)).on("keydown"+w,b(t._keydown,t)).on("keypress"+w,b(t._keypress,t)).on("focus"+w,b(t._focus,t)).on("blur"+w,b(t._blur,t)).on("mousedown"+w,".k-in,.k-checkbox-wrapper :checkbox,.k-i-expand,.k-i-collapse",b(t._mousedown,t)).on("change"+w,".k-checkbox-wrapper :checkbox",b(t._checkboxChange,t)).on("click"+w,".checkbox-span",b(t._checkboxLabelClick,t)).on("click"+w,".k-request-retry",b(t._retryRequest,t)).on("click"+w,".k-link.k-state-disabled",function(e){e.preventDefault()}).on("click"+w,function(n){var a=e(n.target);a.is(":kendoFocusable")||a.find("input,select,textarea,button,object").is(":kendoFocusable")||t.focus()})},_checkboxLabelClick:function(t){var n=e(t.target.previousSibling);n.is("[disabled]")||(n.prop("checked",!n.prop("checked")),n.trigger("change"))},_syncHtmlAndDataSource:function(e,t){e=e||this.root,t=t||this.dataSource;var n,a,r,s,o,d=t.view(),l=p.attr("uid"),c=p.attr("expanded"),h=this.options.checkboxes,u=e.children("li");for(n=0;n<u.length;n++)r=d[n],s=r.uid,a=u.eq(n),a.attr("role","treeitem").attr(l,s).attr(J,a.hasClass("k-state-selected")),r.expanded="true"===a.attr(c),h&&(o=i(a),r.checked=o.prop(A),o.attr("id","_"+s),o.next(".k-checkbox-label").attr("for","_"+s)),this._syncHtmlAndDataSource(a.children("ul"),r.children)},_animation:function(){var e=this.options,t=e.animation,n=t.collapse&&"effects"in t.collapse,a=m({},t.expand,t.collapse);n||(a=m(a,{reverse:!0})),t===!1&&(t={expand:{effects:{}},collapse:{hide:!0,effects:{}}}),t.collapse=m(a,{hide:!0}),e.animation=t},_dragging:function(){var t,n=this.options.dragAndDrop,a=this.dragging;n&&!a?(t=this,this.dragging=new f.HierarchicalDragAndDrop(this.element,{reorderable:!0,$angular:this.options.$angular,autoScroll:this.options.autoScroll,filter:"div:not(.k-state-disabled) .k-in",allowedContainers:".k-treeview",itemSelector:".k-treeview .k-item",hintText:b(this._hintText,this),contains:function(t,n){return e.contains(t,n)},dropHintContainer:function(e){return e},itemFromTarget:function(e){var t=e.closest(".k-top,.k-mid,.k-bot");return{item:t,content:e.closest(".k-in"),first:t.hasClass("k-top"),last:t.hasClass("k-bot")}},dropPositionFrom:function(e){return e.prevAll(".k-in").length>0?"after":"before"},dragstart:function(e){return t.trigger(E,{sourceNode:e[0]})},drag:function(e){t.trigger(L,{originalEvent:e.originalEvent,sourceNode:e.source[0],dropTarget:e.target[0],pageY:e.pageY,pageX:e.pageX,statusClass:e.status,setStatusClass:e.setStatus})},drop:function(n){var a=e(n.dropTarget),i=a.closest("a");return i&&i.attr("href")&&t._tempPreventNavigation(i),t.trigger(H,{originalEvent:n.originalEvent,sourceNode:n.source,destinationNode:n.destination,valid:n.valid,setValid:function(e){this.valid=e,n.setValid(e)},dropTarget:n.dropTarget,dropPosition:n.position})},dragend:function(e){function n(n){t.options.checkboxes&&t.options.checkboxes.checkChildren&&t.updateIndeterminate(),t.trigger(V,{originalEvent:e.originalEvent,sourceNode:n&&n[0],destinationNode:i[0],dropPosition:r})}var a=e.source,i=e.destination,r=e.position;"over"==r?t.append(a,i,n):("before"==r?a=t.insertBefore(a,i):"after"==r&&(a=t.insertAfter(a,i)),n(a))}})):!n&&a&&(a.destroy(),this.dragging=null)},_tempPreventNavigation:function(e){e.on(F+w+y,function(t){t.preventDefault(),e.off(F+w+y)})},_hintText:function(e){return this.templates.dragClue({item:this.dataItem(e),treeview:this.options})},_templates:function(){var e=this,t=e.options,n=b(e._fieldAccessor,e);t.template&&typeof t.template==Q?t.template=k(t.template):t.template||(t.template=a("# var text = "+n("text")+"(data.item); ## if (typeof data.item.encoded != 'undefined' && data.item.encoded === false) {##= text ## } else { ##: text ## } #")),e._checkboxes(),e.templates={setAttributes:function(e){var t,n="",a=e.attr||{};for(t in a)a.hasOwnProperty(t)&&"class"!==t&&(n+=t+'="'+a[t]+'" ');return n},wrapperCssClass:function(e,t){var n="k-item",a=t.index;return e.firstLevel&&0===a&&(n+=" k-first"),a==e.length-1&&(n+=" k-last"),n},cssClass:function(e,t){var n="",a=t.index,i=e.length-1;return e.firstLevel&&0===a&&(n+="k-top "),n+=0===a&&a!=i?"k-top":a==i?"k-bot":"k-mid"},textClass:function(e,t){var n="k-in";return t&&(n+=" k-link"),e.enabled===!1&&(n+=" k-state-disabled"),e.selected===!0&&(n+=" k-state-selected"),n},toggleButtonClass:function(e){var t="k-icon";return t+=e.expanded!==!0?" k-i-expand":" k-i-collapse"},groupAttributes:function(e){var t="";return e.firstLevel||(t="role='group'"),t+(e.expanded!==!0?" style='display:none'":"")},groupCssClass:function(e){var t="k-group";return e.firstLevel&&(t+=" k-treeview-lines"),t},dragClue:a("#= data.treeview.template(data) #"),group:a("<ul class='#= data.r.groupCssClass(data.group) #'#= data.r.groupAttributes(data.group) #>#= data.renderItems(data) #</ul>"),itemContent:a("# var imageUrl = "+n("imageUrl")+"(data.item); ## var spriteCssClass = "+n("spriteCssClass")+"(data.item); ## if (imageUrl) { #<img class='k-image' alt='' src='#= imageUrl #'># } ## if (spriteCssClass) { #<span class='k-sprite #= spriteCssClass #'></span># } ##= data.treeview.template(data) #"),itemElement:a("# var item = data.item, r = data.r; ## var url = "+n("url")+"(item); #<div class='#= r.cssClass(data.group, item) #'># if (item.hasChildren) { #<span class='#= r.toggleButtonClass(item) #'></span># } ## if (data.treeview.checkboxes) { #<span class='k-checkbox-wrapper' role='presentation'>#= data.treeview.checkboxes.template(data) #</span># } ## var tag = url ? 'a' : 'span'; ## var textAttr = url ? ' href=\\'' + url + '\\'' : ''; #<#=tag# class='#= r.textClass(item, !!url) #'#= textAttr #>#= r.itemContent(data) #</#=tag#></div>"),item:a("# var item = data.item, r = data.r; #<li role='treeitem' class='#= r.wrapperCssClass(data.group, item) #'"+p.attr("uid")+'=\'#= item.uid #\' #= r.setAttributes(item.toJSON ? item.toJSON() : item) # # if (data.treeview.checkboxes) { #aria-checked=\'#= item.checked ? "true" : "false" #\' # } #aria-selected=\'#= item.selected ? "true" : "false" #\' #=item.enabled === false ? "aria-disabled=\'true\'" : \'\'#aria-expanded=\'#= item.expanded ? "true" : "false" #\' data-expanded=\'#= item.expanded ? "true" : "false" #\' >#= r.itemElement(data) #</li>'),loading:a("<div class='k-icon k-i-loading'></div> #: data.messages.loading #"),retry:a("#: data.messages.requestFailed # <button class='k-button k-request-retry'>#: data.messages.retry #</button>")}},items:function(){return this.element.find(".k-item > div:first-child")},setDataSource:function(t){var n=this.options;n.dataSource=t,this._dataSourceUids={},this._dataSource(),n.checkboxes&&n.checkboxes.checkChildren&&this.dataSource.one("change",e.proxy(this.updateIndeterminate,this,null)),this.options.autoBind&&this.dataSource.fetch()},_bindDataSource:function(){this._refreshHandler=b(this.refresh,this),this._errorHandler=b(this._error,this),this.dataSource.bind(D,this._refreshHandler),this.dataSource.bind(B,this._errorHandler)},_unbindDataSource:function(){var e=this.dataSource;e&&(e.unbind(D,this._refreshHandler),e.unbind(B,this._errorHandler))},_dataSource:function(e){function t(e){for(var n=0;n<e.length;n++)e[n]._initChildren(),e[n].children.fetch(),t(e[n].children.view())}var n=this,a=n.options,i=a.dataSource;i=v(i)?{data:i}:i,n._unbindDataSource(),i.fields||(i.fields=[{field:"text"},{field:"url"},{field:"spriteCssClass"},{field:"imageUrl"}]),n.dataSource=i=x.create(i),e&&(i.fetch(),t(i.view())),n._bindDataSource()},events:[E,L,H,V,q,I,U,S,D,T,N],options:{name:"TreeView",dataSource:{},animation:{expand:{effects:"expand:vertical",duration:200},collapse:{duration:100}},messages:{loading:"Loading...",requestFailed:"Request failed.",retry:"Retry"},dragAndDrop:!1,checkboxes:!1,autoBind:!0,autoScroll:!1,loadOnDemand:!0,template:"",dataTextField:null},_accessors:function(){var e,t,n,a=this,i=a.options,r=a.element;for(e in z)t=i[z[e]],n=r.attr(p.attr(e+"-field")),!t&&n&&(t=n),t||(t=e),v(t)||(t=[t]),i[z[e]]=t},_fieldAccessor:function(t){var n=this.options[z[t]],a=n.length,i="(function(item) {";return 0===a?i+="return item['"+t+"'];":(i+="var levels = ["+e.map(n,function(e){return"function(d){ return "+p.expr(e)+"}"}).join(",")+"];",i+="return levels[Math.min(item.level(), "+a+"-1)](item)"),i+="})"},setOptions:function(e){_.fn.setOptions.call(this,e),this._animation(),this._dragging(),this._templates()},_trigger:function(e,t){return this.trigger(e,{node:t.closest(G)[0]})},_setChecked:function(t,n){if(t&&e.isFunction(t.view))for(var a=0,i=t.view();a<i.length;a++)i[a].enabled!==!1&&this._setCheckedValue(i[a],n),i[a].children&&this._setChecked(i[a].children,n)},_setCheckedValue:function(e,t){e[A]=t},_setIndeterminate:function(e){var t,n,a,r=l(e),s=!0;if(r.length&&(t=i(r.children()),n=t.length)){if(n>1){for(a=1;a<n;a++)if(t[a].checked!=t[a-1].checked||t[a].indeterminate||t[a-1].indeterminate){s=!1;break}}else s=!t[0].indeterminate;return e.attr(W,s?t[0].checked:"mixed"),i(e).data(O,!s).prop(O,!s).prop(A,s&&t[0].checked)}},updateIndeterminate:function(e){var t,n,a,i;if(e=e||this.wrapper,t=l(e).children(),t.length){for(n=0;n<t.length;n++)this.updateIndeterminate(t.eq(n));if(e.is(".k-treeview"))return;a=this._setIndeterminate(e),i=this.dataItem(e),a&&a.prop(A)?i.checked=!0:i&&delete i.checked}},_bubbleIndeterminate:function(e,t){if(e.length){t||this.updateIndeterminate(e);var n,a=this.parent(e);a.length&&(this._setIndeterminate(a),n=a.children("div").find(".k-checkbox-wrapper input[type=checkbox]"),this._skip=!0,n.prop(O)===!1?this.dataItem(a).set(A,n.prop(A)):this.dataItem(a).set(A,!1),this._skip=!1,this._bubbleIndeterminate(a,!0))}},_checkboxChange:function(t){var n=this,a=e(t.target),i=a.prop(A),r=a.closest(G),s=this.dataItem(r);this._preventChange||(s.checked!=i&&(s.set(A,i),r.attr(W,i),this._trigger(N,r)),a.is(":focus")&&(n._trigger(T,r),n.focus()))},_toggleButtonClick:function(t){var n=e(t.currentTarget).closest(G);n.is("[aria-disabled='true']")||this.toggle(n)},_mousedown:function(t){var n=this,a=e(t.currentTarget),i=e(t.currentTarget).closest(G),r=p.support.browser;i.is("[aria-disabled='true']")||((r.msie||r.edge)&&a.is(":checkbox")&&(a.prop(O)?(n._preventChange=!1,a.prop(A,!a.prop(A)),a.trigger(D),a.on(F+w,function(e){e.preventDefault()}),n._preventChange=!0):(a.off(F+w),n._preventChange=!1)),n._clickTarget=i,n.current(i))},_focusable:function(e){return e&&e.length&&e.is(":visible")&&!e.find(".k-in:first").hasClass($)},_focus:function(){var t=this.select(),n=this._clickTarget;p.support.touch||(n&&n.length&&(t=n),this._focusable(t)||(t=this.current()),this._focusable(t)||(t=this._nextVisible(e())),this.current(t))},focus:function(){var e,t=this.wrapper,n=t[0],a=[],i=[],r=document.documentElement;do n=n.parentNode,n.scrollHeight>n.clientHeight&&(a.push(n),i.push(n.scrollTop));while(n!=r);for(p.focusElement(t),e=0;e<a.length;e++)a[e].scrollTop=i[e]},_blur:function(){this.current().find(".k-in:first").removeClass("k-state-focused")},_enabled:function(e){return!e.children("div").children(".k-in").hasClass($)},parent:function(t){var n,a,i=/\bk-treeview\b/,r=/\bk-item\b/;typeof t==Q&&(t=this.element.find(t)),Z(t)||(t=t[0]),a=r.test(t.className);do t=t.parentNode,r.test(t.className)&&(a?n=t:a=!0);while(!i.test(t.className)&&!n);return e(n)},_nextVisible:function(e){function t(e){for(;e.length&&!e.next().length;)e=a.parent(e);return e.next().length?e.next():e}var n,a=this,i=a._expanded(e);return e.length&&e.is(":visible")?i?(n=l(e).children().first(),n.length||(n=t(e))):n=t(e):n=a.root.children().eq(0),n},_previousVisible:function(e){var t,n,a=this;if(!e.length||e.prev().length)for(n=e.length?e.prev():a.root.children().last();a._expanded(n)&&(t=l(n).children().last(),t.length);)n=t;else n=a.parent(e)||e;return n},_keydown:function(n){var a,i=this,r=n.keyCode,s=i.current(),o=i._expanded(s),d=s.find(".k-checkbox-wrapper:first :checkbox"),l=p.support.isRtl(i.element);n.target==n.currentTarget&&(!l&&r==C.RIGHT||l&&r==C.LEFT?o?a=i._nextVisible(s):s.find(".k-in:first").hasClass($)||i.expand(s):!l&&r==C.LEFT||l&&r==C.RIGHT?o&&!s.find(".k-in:first").hasClass($)?i.collapse(s):(a=i.parent(s),i._enabled(a)||(a=t)):r==C.DOWN?a=i._nextVisible(s):r==C.UP?a=i._previousVisible(s):r==C.HOME?a=i._nextVisible(e()):r==C.END?a=i._previousVisible(e()):r!=C.ENTER||s.find(".k-in:first").hasClass($)?r==C.SPACEBAR&&d.length&&(s.find(".k-in:first").hasClass($)||(d.prop(A,!d.prop(A)).data(O,!1).prop(O,!1),i._checkboxChange({target:d})),a=s):s.find(".k-in:first").hasClass("k-state-selected")||i._trigger(S,s)||i.select(s),a&&(n.preventDefault(),s[0]!=a[0]&&(i._trigger(T,a),i.current(a))))},_keypress:function(e){var t,n=this,a=300,i=n.current().get(0),r=e.key,s=1===r.length;s&&(n._match||(n._match=""),n._match+=r,clearTimeout(n._matchTimer),n._matchTimer=setTimeout(function(){n._match=""},a),t=i&&n._matchNextByText(Array.prototype.indexOf.call(n.element.find(".k-item"),i),n._match),t.length||(t=n._matchNextByText(-1,n._match)),t.get(0)&&t.get(0)!==i&&(n._trigger(T,t),n.current(t)))},_matchNextByText:function(t,n){var a=this.element,i=a.find(".k-in").filter(function(a,i){return a>t&&e(i).is(":visible")&&0===e(i).text().toLowerCase().indexOf(n)});return i.eq(0).closest(G)},_click:function(t){var n,a=this,i=e(t.currentTarget),r=c(i.closest(G)),s=i.attr("href");n=s?"#"==s||s.indexOf("#"+this.element.id+"-")>=0:r.length&&!r.children().length,n&&t.preventDefault(),i.hasClass(".k-state-selected")||a._trigger(S,i)||a.select(i)},_wrapper:function(){var e,t,n=this,a=n.element,i="k-widget k-treeview";a.is("ul")?(e=a.wrap("<div />").parent(),t=a):(e=a,t=e.children("ul").eq(0)),n.wrapper=e.addClass(i),n.root=t},_getSelectedNode:function(){return this.element.find(".k-state-selected").closest(G)},_group:function(e){var t=this,n=e.hasClass(P),a={firstLevel:n,expanded:n||t._expanded(e)},i=e.children("ul");i.addClass(t.templates.groupCssClass(a)).css("display",a.expanded?"":"none"),n||i.attr("role","group"),t._nodes(i,a)},_nodes:function(t,n){var a,i=this,r=t.children("li");n=m({length:r.length},n),r.each(function(t,r){r=e(r),a={index:t,expanded:i._expanded(r)},o(r),i._updateNodeClasses(r,n,a),i._group(r)})},_checkboxes:function(){var e,t=this.options,n=t.checkboxes;n&&(e="<input type='checkbox' tabindex='-1' #= (item.enabled === false) ? 'disabled' : '' # #= item.checked ? 'checked' : '' #",n.name&&(e+=" name='"+n.name+"'"),e+=" id='_#= item.uid #' class='k-checkbox' /><span class='k-checkbox-label checkbox-span'></span>",n=m({template:e},t.checkboxes),typeof n.template==Q&&(n.template=k(n.template)),t.checkboxes=n)},_updateNodeClasses:function(e,t,n){var a,i,r=e.children("div"),s=e.children("ul"),o=this.templates;e.hasClass("k-treeview")||(n=n||{},n.expanded=typeof n.expanded!=j?n.expanded:this._expanded(e),n.index=typeof n.index!=j?n.index:e.index(),n.enabled=typeof n.enabled!=j?n.enabled:!r.children(".k-in").hasClass("k-state-disabled"),t=t||{},t.firstLevel=typeof t.firstLevel!=j?t.firstLevel:e.parent().parent().hasClass(P),t.length=typeof t.length!=j?t.length:e.parent().children().length,e.removeClass("k-first k-last").addClass(o.wrapperCssClass(t,n)),r.removeClass("k-top k-mid k-bot").addClass(o.cssClass(t,n)),a=r.children(".k-in"),i=a[0]&&"a"==a[0].nodeName.toLowerCase(),a.removeClass("k-in k-link k-state-default k-state-disabled").addClass(o.textClass(n,i)),(s.length||"true"==e.attr("data-hasChildren"))&&(r.children(".k-icon").removeClass("k-i-expand k-i-collapse").addClass(o.toggleButtonClass(n)),s.addClass("k-group")))},_processNodes:function(t,n){var a,i=this,r=i.element.find(t);for(a=0;a<r.length;a++)n.call(i,a,e(r[a]).closest(G))},dataItem:function(t){var n=e(t).closest(G).attr(p.attr("uid")),a=this.dataSource;return a&&a.getByUid(n)},_dataItem:function(t){var n=e(t).closest(G).attr(p.attr("uid")),a=this.dataSource;return a&&this._dataSourceUids[n]},_insertNode:function(t,n,a,i,r){var s,d,c,h,u,f,g=this,m=l(a),k=m.children().length+1,v={firstLevel:a.hasClass(P),expanded:!r,length:k},_="",x=function(e,t){e.appendTo(t)};for(c=0;c<t.length;c++)h=t[c],h.index=n+c,_+=g._renderItem({group:v,item:h});if(d=e(_),d.length){for(g.angular("compile",function(){return{elements:d.get(),data:t.map(function(e){return{dataItem:e}})}}),m.length||(m=e(g._renderGroup({group:v})).appendTo(a)),i(d,m),a.hasClass("k-item")&&(o(a),g._updateNodeClasses(a,v,{expanded:!r})),u=d.prev().first(),f=d.next().last(),g._updateNodeClasses(u,{},{expanded:"true"==u.attr(p.attr("expanded"))}),g._updateNodeClasses(f,{},{expanded:"true"==f.attr(p.attr("expanded"))}),c=0;c<t.length;c++)h=t[c],h.hasChildren&&(s=h.children.data(),s.length&&g._insertNode(s,h.index,d.eq(c),x,!h.expanded));return d}},_updateNodes:function(t,n){function a(e,t){e.is(".k-group")&&e.find(".k-item:not([aria-disabled])").attr(W,t),e.find(".k-checkbox-wrapper input[type=checkbox]:not([disabled])").prop(A,t).data(O,!1).prop(O,!1)}var i,r,s,o,d,l,h,u=this,p={treeview:u.options,item:o},g="expanded"!=n&&"checked"!=n;if("selected"==n)o=t[0],r=u.findByUid(o.uid).find(".k-in:first").removeClass("k-state-hover").toggleClass("k-state-selected",o[n]).end(),o[n]&&u.current(r),r.attr(J,!!o[n]);else{for(h=e.map(t,function(e){return u.findByUid(e.uid).children("div")}),g&&u.angular("cleanup",function(){return{elements:h}}),i=0;i<t.length;i++)p.item=o=t[i],s=h[i],r=s.parent(),g&&s.children(".k-in").html(u.templates.itemContent(p)),n==A?(d=o[n],a(s,d),r.attr(W,d),u.options.checkboxes.checkChildren&&(a(r.children(".k-group"),d),u._setChecked(o.children,d),u._bubbleIndeterminate(r))):"expanded"==n?u._toggle(r,o,o[n]):"enabled"==n&&(r.find(".k-checkbox-wrapper input[type=checkbox]").prop("disabled",!o[n]),l=!c(r).is(M),r.removeAttr(X),o[n]||(o.selected&&o.set("selected",!1),o.expanded&&o.set("expanded",!1),l=!0,r.attr(J,!1).attr(X,!0)),u._updateNodeClasses(r,{},{enabled:o[n],expanded:!l})),s.length&&(o._events&&o._events.change&&o._events.change.splice(1),this.trigger("itemChange",{item:s,data:o,ns:f}));g&&u.angular("compile",function(){return{elements:h,data:e.map(t,function(e){return[{dataItem:e}]})}})}},_appendItems:function(e,t,n){var a,i,r,s=l(n),o=s.children(),d=!this._expanded(n);this.element===n?(a=this.dataSource.data(),i=this.dataSource.view(),r=i.length<a.length?i:a,e=r.indexOf(t[0])):t.length&&(e=t[0].parent().indexOf(t[0])),typeof e==j&&(e=o.length),this._insertNode(t,e,n,function(t,n){e>=o.length?t.appendTo(n):t.insertBefore(o.eq(e))},d),d||(this._updateNodeClasses(n,{},{expanded:!d}),l(n).css("display","block"))},_refreshChildren:function(e,t,n){var a,i,r,s=this.options,d=s.loadOnDemand,c=s.checkboxes&&s.checkboxes.checkChildren;if(l(e).empty(),t.length)for(this._appendItems(n,t,e),i=l(e).children(),d&&c&&this._bubbleIndeterminate(i.last()),a=0;a<i.length;a++)r=i.eq(a),this.trigger("itemChange",{item:r.children("div"),data:t[a],ns:f});else o(e)},_refreshRoot:function(t){var n,a,i,r=this._renderGroup({items:t,group:{firstLevel:!0,expanded:!0}});for(this.root.length?(this._angularItems("cleanup"),n=e(r),this.root.attr("class",n.attr("class")).html(n.html())):this.root=this.wrapper.html(r).children("ul"),a=this.root.children(".k-item"),i=0;i<t.length;i++)this.trigger("itemChange",{item:a.eq(i),data:t[i],ns:f});this._angularItems("compile")},refresh:function(e){var n,a,i=e.node,r=e.action,s=e.items,o=this.wrapper,d=this.options,l=d.loadOnDemand,c=d.checkboxes&&d.checkboxes.checkChildren;if(!this._skip){for(n=0;n<s.length;n++)this._dataSourceUids[s[n].uid]=s[n];if(e.field){if(!s[0]||!s[0].level)return;return this._updateNodes(s,e.field)}if(i&&(o=this.findByUid(i.uid),this._progress(o,!1)),c&&"remove"!=r){for(a=!1,n=0;n<s.length;n++)if("checked"in s[n]){a=!0;break}if(!a&&i&&i.checked)for(n=0;n<s.length;n++)s[n].checked=!0}if("add"==r?this._appendItems(e.index,s,o):"remove"==r?this._remove(this.findByUid(s[0].uid),!1):"itemchange"==r?this._updateNodes(s):"itemloaded"==r?this._refreshChildren(o,s,e.index):this._refreshRoot(s),"remove"!=r)for(n=0;n<s.length;n++)(!l||s[n].expanded||s[n]._loaded)&&s[n].load();this.trigger(q,{node:i?o:t}),this.dataSource.filter()&&this.options.checkboxes.checkChildren&&this.updateIndeterminate(o)}},_error:function(e){var t=e.node&&this.findByUid(e.node.uid),n=this.templates.retry({messages:this.options.messages});t?(this._progress(t,!1),this._expanded(t,!1),h(t).addClass("k-i-reload"),e.node.loaded(!1)):(this._progress(!1),this.element.html(n))},_retryRequest:function(e){e.preventDefault(),this.dataSource.fetch()},expand:function(e){this._processNodes(e,function(e,t){this.toggle(t,!0)})},collapse:function(e){this._processNodes(e,function(e,t){this.toggle(t,!1)})},enable:function(e,t){"boolean"==typeof e?(t=e,e=this.items()):t=2!=arguments.length||!!t,this._processNodes(e,function(e,n){this.dataItem(n).set("enabled",t)})},current:function(n){var a=this,i=a._current,r=a.element,s=a._ariaId;return arguments.length>0&&n&&n.length?(i&&(i[0].id===s&&i.removeAttr("id"),i.find(".k-in:first").removeClass("k-state-focused")),i=a._current=e(n,r).closest(G),i.find(".k-in:first").addClass("k-state-focused"),s=i[0].id||s,s&&(a.wrapper.removeAttr("aria-activedescendant"),i.attr("id",s),a.wrapper.attr("aria-activedescendant",s)),t):(i||(i=a._nextVisible(e())),i)},select:function(n){var a=this,i=a.element;return arguments.length?(n=e(n,i).closest(G),i.find(".k-state-selected").each(function(){var t=a.dataItem(this);t?(t.set("selected",!1),delete t.selected):e(this).removeClass("k-state-selected")}),n.length&&(a.dataItem(n).set("selected",!0),a._clickTarget=n),a.trigger(D),t):i.find(".k-state-selected").closest(G)},_toggle:function(e,t,n){var a,i=this.options,r=c(e),s=n?"expand":"collapse";r.data("animating")||(a=t&&t.loaded(),n&&!a?(i.loadOnDemand&&this._progress(e,!0),r.remove(),t.load()):(this._updateNodeClasses(e,{},{expanded:n}),n||r.css("height",r.height()).css("height"),r.kendoStop(!0,!0).kendoAnimate(m({reset:!0},i.animation[s],{complete:function(){n&&r.css("height","")}}))))},toggle:function(t,n){t=e(t),h(t).is(".k-i-expand, .k-i-collapse")&&(1==arguments.length&&(n=!this._expanded(t)),this._expanded(t,n))},destroy:function(){var e=this;_.fn.destroy.call(e),e.wrapper.off(w),e.wrapper.find(".k-checkbox-wrapper :checkbox").off(w),e._unbindDataSource(),e.dragging&&e.dragging.destroy(),e._dataSourceUids={},p.destroy(e.element),e.root=e.wrapper=e.element=null},_expanded:function(e,n,a){var i,r=p.attr("expanded"),s=n,o=s?"expand":"collapse";return 1==arguments.length?(i=this._dataItem(e),"true"===e.attr(r)||i&&i.expanded):(i=this.dataItem(e),c(e).data("animating")||!a&&this._trigger(o,e)||(s?(e.attr(r,"true"),e.attr(Y,"true")):(e.removeAttr(r),e.attr(Y,"false")),i&&(i.set("expanded",s),s=i.expanded)),t)},_progress:function(e,t){var n=this.element,a=this.templates.loading({messages:this.options.messages});1==arguments.length?(t=e,t?n.html(a):n.empty()):h(e).toggleClass("k-i-loading",t).removeClass("k-i-reload")},text:function(e,n){var a=this.dataItem(e),i=this.options[z.text],r=a.level(),s=i.length,o=i[Math.min(r,s-1)];return n?(a.set(o,n),t):a[o]},_objectOrSelf:function(t){return e(t).closest("[data-role=treeview]").data("kendoTreeView")||this},_dataSourceMove:function(t,n,a,i){var r,s=this._objectOrSelf(a||n),o=s.dataSource,d=e.Deferred().resolve().promise();return a&&a[0]!=s.element[0]&&(r=s.dataItem(a),r.loaded()||(s._progress(a,!0),d=r.load()),a!=this.root&&(o=r.children,o&&o instanceof x||(r._initChildren(),r.loaded(!0),o=r.children))),t=this._toObservableData(t),i.call(s,o,t,d)},_toObservableData:function(t){var n,a,i=t;return(K(t)||Z(t))&&(n=this._objectOrSelf(t).dataSource,a=e(t).attr(p.attr("uid")),i=n.getByUid(a),i&&(i=n.remove(i))),i},_insert:function(e,t,n){t instanceof p.data.ObservableArray?t=t.toJSON():v(t)||(t=[t]);var a=e.parent();return a&&a._initChildren&&(a.hasChildren=!0,a._initChildren()),e.splice.apply(e,[n,0].concat(t)),this.findByUid(e[n].uid)},insertAfter:r(1),insertBefore:r(0),append:function(t,n,a){var i=this.root;if(!(n&&t instanceof jQuery&&n[0]===t[0]))return n=n&&n.length?n:null,n&&(i=l(n)),this._dataSourceMove(t,i,n,function(t,i,r){function s(){n&&d._expanded(n,!0,!0);var e=t.data(),a=Math.max(e.length,0);return d._insert(e,i,a)}var o,d=this;return r.done(function(){o=s(),(a=a||e.noop)(o)}),o||null})},_remove:function(t,n){var a,i,r,s=this;return t=e(t,s.element),this.angular("cleanup",function(){return{elements:t.get()}}),a=t.parent().parent(),i=t.prev(),r=t.next(),t[n?"detach":"remove"](),a.hasClass("k-item")&&(o(a),s._updateNodeClasses(a)),s._updateNodeClasses(i),s._updateNodeClasses(r),t},remove:function(e){var t=this.dataItem(e);t&&this.dataSource.remove(t)},detach:function(e){return this._remove(e,!0)},findByText:function(t){return e(this.element).find(".k-in").filter(function(n,a){return e(a).text()==t}).closest(G)},findByUid:function(t){var n,a,i=this.element.find(".k-item"),r=p.attr("uid");for(a=0;a<i.length;a++)if(i[a].getAttribute(r)==t){n=i[a];break}return e(n)},expandPath:function(t,n){function a(){s.shift(),s.length?i(s[0]).then(a):o.call(r)}function i(t){var n,a=e.Deferred(),i=r.dataSource.get(t),s=p.attr("expanded");return i?(n=r.findByUid(i.uid),i.loaded()?(i.set("expanded",!0),n.attr(s,!0),n.attr(Y,!0),a.resolve()):(r._progress(n,!0),i.load().then(function(){i.set("expanded",!0),n.attr(s,!0),n.attr(Y,!0),a.resolve()}))):a.resolve(),a.promise()}var r=this,s=t.slice(0),o=n||e.noop;i(s[0]).then(a)},_parentIds:function(e){for(var t=e&&e.parentNode(),n=[];t&&t.parentNode;)n.unshift(t.id),t=t.parentNode();return n},expandTo:function(e){e instanceof p.data.Node||(e=this.dataSource.get(e));var t=this._parentIds(e);this.expandPath(t)},_renderItem:function(e){return e.group||(e.group={}),e.treeview=this.options,e.r=this.templates,this.templates.item(e)},_renderGroup:function(e){var t=this;return e.renderItems=function(e){var n="",a=0,i=e.items,r=i?i.length:0,s=e.group;for(s.length=r;a<r;a++)e.group=s,e.item=i[a],e.item.index=a,n+=t._renderItem(e);return n},e.r=t.templates,t.templates.group(e)}}),f.plugin(d)}(window.kendo.jQuery),window.kendo},"function"==typeof define&&define.amd?define:function(e,t,n){(n||t)()});
//# sourceMappingURL=kendo.treeview.min.js.map
;
var trackItemFromCurrentPage = function (category, action) {
    trackItem(category, action, window.location.href);
};

var trackItem = function (category, action, label) {
    dataLayer.push({
        'event': 'virtualEvent',
        'eventCategory': category,
        'eventAction': action,
        'eventLabel': label,
    });
};
var HEADER_HEIGHT = 100;
var TELERIKBAR_HEIGHT = 70;
var NAVBAR_HEIGHT = 76;
var SCROLLSPY_OFFSET = TELERIKBAR_HEIGHT + 10; // 10 compensates for the space above the anchored heading
var FOOTER_DISTANCE = 20;
var windowHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
$(function () {
    var relatedArticlesMarker = $('h1#see-also, h2#see-also, h3#see-also');
    var isEmpty = true;
    if (relatedArticlesMarker.length) {
        var relatedArticlesList = relatedArticlesMarker.nextAll('ul').first();
        if (relatedArticlesList.length) {
            $('#related-articles').append(relatedArticlesList.html());

            relatedArticlesMarker.remove();
            relatedArticlesList.remove();
            isEmpty = false;
        }
    } 

    $('.related-articles').toggleClass('empty', isEmpty);
});
function animateScrolling(hash) {
    var currentScrollTop = $(window).scrollTop();
    var offset = $(hash).offset() || { top: currentScrollTop };
    var scrollOffsetCorrection = currentScrollTop == 0 ? HEADER_HEIGHT + NAVBAR_HEIGHT : NAVBAR_HEIGHT;

    $('html, body').animate({
        scrollTop: offset.top - scrollOffsetCorrection
    }, 500, function () {
        if (history.pushState) {
            history.pushState(null, null, hash);
        } else {
            window.location.hash = hash;
        }
    });
}
;


// floating nav
$(function() {
    function setScrollPosition() {
        var body = $(document.body);
        var scrollTop = body.scrollTop() || $('html').scrollTop();
        body
            .toggleClass("scroll", scrollTop > 0)
            .toggleClass("scroll-page", scrollTop > 630)
            .toggleClass("scroll-small-page", $(window).height() - scrollTop < $('.TK-Bar').height());
    }

    $(window).scroll(setScrollPosition);
    setScrollPosition();
});

// article-toc
$(function() {
    // populate article TOC
    var articleToc = $('.article-toc');
    var toc = $("#toc");
    toc.empty();

    var headings = $("#content article > h2, #content article.api-reference > h3");
    var empty = headings.length < 2;

    articleToc.toggleClass("empty", empty);

    if (empty) {
        return;
    }

    toc.parent().show();

    headings.each(function() {
        if (!this.firstElementChild) {
            return;
        }

        $("<li><a></a></li>")
            .appendTo(toc)
            .find("a")
            .text(this.firstElementChild.textContent.trim())
            .attr("href", "#" + this.id )
            .addClass("anchor-" + this.tagName.toLowerCase());
    });

    $("body").scrollspy({ target: ".article-toc", offset: SCROLLSPY_OFFSET });

    window.animateScrollTo = function(e){
        e.preventDefault();
        animateScrolling(this.hash);
    };
    
    // Detect hash on page load and readjust scroll offset
    var initialHash = window.location.hash;
    if (!!initialHash) {
        setTimeout(function(){
          animateScrolling(initialHash);
        }, 100);
    }
    
    // animated scroll
    // Exclude the app inside the div.theme-preview since it's not in an <iframe/>,
    // leading to unwanted scrollTop when clicking on links inside the app.
    $("body a[href^='#']:not(.theme-preview a, .components-tabstrip a, .trigger a)").on('click', window.animateScrollTo);
});
hasDataLang = false;
var clipboard;
const selectedLanguageKey = "Selected_TabStrip_Language_Key";
// Necessary for the offline docs.
const localStorageMock = {
    getItem: function () {
        return null;
    },
    setItem: function () {
    }
};

function usesClipboardJs() {
    return window.ClipboardJS && !/\[native code\]/.test(window.ClipboardJS.toString());
};

function setTooltip(btn, message) {
    $(btn).attr('data-original-title', message)
        .tooltip('show');
};

function hideTooltip(btn) {
    $(btn).tooltip('hide');
};


function addCopyButton(element, index) {
    var isCopyButtonOutsideCode = element.parentNode.className.indexOf("k-content") >= 0;
    $(isCopyButtonOutsideCode ? $(element).parent() : element)
        .prepend('<span class="copy-code-btn" title="Copy Code."><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="16px" height="16px" viewBox="0 0 16 16" enable-background="new 0 0 16 16" xml:space="preserve"><g><polygon points="3,2 6,2 6,3 8,3 6,1 2,1 2,12 5,12 5,11 3,11"/><path d="M10,4H6v11h8V8L10,4z M7,14V5h3v3h3v6H7z"/></g></svg></span>');

    if (usesClipboardJs()) {
        var copyButtonSelector = '.copy-code-btn';
        var id = copyButtonSelector.slice(1) + "-" + index;
        var copyButton = isCopyButtonOutsideCode ? $(element).prev(copyButtonSelector) : $(element).children(copyButtonSelector);
        $(copyButton).attr('id', id)
        clipboard = new ClipboardJS("#" + id, {
            text: function () {
                return $(element).text();
            }
        });

        clipboard.on('success', function (e) {
            setTooltip(e.trigger, 'Copied!');
            setTimeout(function () {
                hideTooltip(e.trigger);
            }, 1000);
        });

        $(copyButton).hover(function (e) {
            setTooltip(e.target, 'Copy code')
        }, function (e) {
            hideTooltip(e.target);
        });
        $(copyButton).tooltip({
            container: 'body',
            trigger: 'manual',
            placement: 'top',
            title: 'Copy code'
        });
    }
}

function handleDataLangCodeSnippets() {
    $("pre[data-lang]").each(function () {

        if (this.parentNode.className.indexOf("k-content") >= 0) {
            return;
        }

        var langs = $(this).nextUntil(":not(pre)", "pre").add(this);

        var tabs = $.map(langs, function (item) {
            var title = $(item).attr("data-lang").replace("tab-", "");
            return $("<li>").text(title);
        });

        if (tabs.length < 2) {
            return;
        }

        tabs[0].addClass("k-state-active");

        var tabstrip = $("<div>")
            .insertBefore(this)
            .append($("<ul>").append(tabs))
            .append(langs);

        langs.wrap("<div>");

        tabstrip.kendoTabStrip({ animation: false });

        $(document).on("click", ".current-topic > div a", false);
    });
}

$(function () {
    $("pre").addClass("prettyprint");

    function getStorage() {
        return localStorage !== undefined ? localStorage : localStorageMock;
    }

    function saveLanguage(language) {
        getStorage().setItem(selectedLanguageKey, language);
    }

    /* START TabStrip logic */

    var selectedLanguage = getStorage().getItem(selectedLanguageKey);

    var onTabActivated = function (e) {
        var language = e.item.innerText;
        if (selectedLanguage !== language) {
            saveLanguage(language);
        }
    };

    $("div.tabbedCode").each(function () {
        var container = $(this);
        var langs = container.find("pre");
        if (langs.length === 0) {
            // console.log("Cannot find any languages")
            return;
        }

        var tabs = $.map(langs, function (item) {
            return $("<li>").text($(item).attr("lang"));
        });

        var hasActive = false;
        if (!selectedLanguage) {
            saveLanguage(tabs[0].innerText);
        } else {
            $(tabs).each(function (index) {
                if ($(this).text() === selectedLanguage) {
                    $(this).addClass('k-state-active');
                    hasActive = true;
                }
            });
        }

        if (!hasActive) {
            tabs[0].addClass("k-state-active");
        }

        var tabstrip = $("<div>")
            .append($("<ul>").append(tabs))
            .append(langs);

        container.replaceWith(tabstrip);
        langs.wrap("<div>");
        tabstrip.kendoTabStrip(
            {
                animation: false,
                activate: onTabActivated
            });
    });

    var codeSampleMapper = {
        'C#': 'cs',
        'F#': 'fs',
        'VB.NET': 'vb',
        'VB': 'vb',
        'JavaScript': 'js',
        'ASPNET': 'html',
        'XML': 'xml',
        'TypeScript': 'commonjs',
        'C++': 'cpp',
        'C': 'c',
        'Objective-C': 'm',
        'Java': 'java'
    };

    if (hasDataLang) {
        handleDataLangCodeSnippets();
    } else {
        $("pre").each(function (index) {
            var langExtension = codeSampleMapper[$(this).attr('lang')];
            $(this).addClass('lang-' + langExtension).addClass("prettyprint");
        });
    }

    $("pre").each(function (index) {
        addCopyButton(this, index);
    });


    prettyPrint();

    /* END TabStrip logic */
});
function scrollNodeIntoView(li) {
    var top = li.offset().top;
    var bottom = top + li.find(">div").outerHeight();

    var container = $(".side-nav")[0];
    var containerTop = container.scrollTop;
    var containerHeight = container.clientHeight + parseInt(container.style.bottom, 10);

    if (top < containerTop || bottom > containerHeight + containerTop) {
        container.scrollTop = top - containerHeight / 2;
    }
}

function expandNavigation(url) {
    return function expand(e) {
        var that = this;
        $(document).ready(function () {
            if (e.node) {
                return;
            }

            var segments = url.split("/");

            var dataSource = that.dataSource;
            var node;

            var isInNavigation = true;
            for (var i = 0; i < segments.length; i++) {
                node = dataSource.get(segments[i]);
                if (!node) {
                    isInNavigation = false;
                    break;
                }
                node.set("expanded", true);
                dataSource = node.children;
            }

            if (isInNavigation) {
                var li = that.element.find("li[data-uid='" + node.uid + "']");
                scrollNodeIntoView(li);
                that.select(li);

                $('.side-nav > #page-tree > .k-group > .k-item > div > span.k-i-collapse').closest('li').addClass('expanded');

                that.unbind("dataBound", expand);
            }
        });
    };
}

function navigationTemplate(root) {
    return function (data) {
        var item = data.item;
        var text = item.text;

        if (item.hasChildren) {
            return text;
        }

        var url = item.path;

        if (location.pathname.indexOf(".html") < 0) {
            url = url.replace(".html", "");
        }

        if (url.indexOf("#") < 0) {
            while (item = item.parentNode()) {
                url = item.path + "/" + url;
            }
            return '<a href="' + root + url + '">' + text + "</a>";
        } else {
            return '<a href="' + url + '">' + text + "</a>";
        }
    };
}

function preventParentSelection(e) {
    var node = this.dataItem(e.node);

    if (node.path.indexOf("#") < 0 && node.hasChildren) {
        e.preventDefault();
        this.toggle(e.node);
    }
}

function setSideNavPosition() {
    var $window = $(window);
    var windowHeight = $window.height();
    var scrollFold = $window.scrollTop() + windowHeight;
    var topNavigationHeight = ($('.SiteRibbon').outerHeight() || 0) + ($('nav.TK-Nav').height() || ($('.PRGS-Nav').height() + $('.PRGS-Bar').height()))
    var progressBarHeight = $('aside.TK-Hat').height() || $('.PRGS-Bar').height();

    var top = window.scrollY > 0 ? topNavigationHeight - progressBarHeight : topNavigationHeight;
    if (window.screen.availWidth < 768) {
        if (window.scrollY > 0) {
            top = $('#navbar').outerHeight();
        } else {
            top += $('#navbar').outerHeight(true);
        }
    }

    var footerHeight = $('div#footer').outerHeight(true);
    var feedbackOffsetTop = document.body.scrollHeight - footerHeight;
    var bottom = Math.max(0, Math.min(footerHeight, scrollFold - feedbackOffsetTop));

    var sideNavigation = $(".side-nav");
    sideNavigation.css('top', top);
    sideNavigation.css('bottom', bottom);
}

var isNavigationLoadRequested = false;
function ensureNavigationLoaded() {
    if (!isNavigationLoadRequested) {
        isNavigationLoadRequested = true;
        $("#page-tree").kendoTreeView({
            dataSource: new kendo.data.HierarchicalDataSource({
                transport: {
                    read: {
                        url: navigationPath,
                        dataType: "json"
                    }
                },
                schema: {
                    model: {
                        id: "path",
                        children: "items",
                        hasChildren: "items"
                    }
                }
            }),
            messages: {
                loading: " "
            },
            select: preventParentSelection,
            template: navigationTemplate(navigationTemplatePath),
            dataBound: expandNavigation(navigationItemToExpand)
        });
    }
}

function shouldLoadNavigationOnLoad() {
    return window.screen.width <= 768;
}

$(function () {
    window.addEventListener('scroll', setSideNavPosition, { passive: true });
    $(window).resize(setSideNavPosition);

    $(document).ready(function () {
        if (!shouldLoadNavigationOnLoad()) {
            ensureNavigationLoaded();
        }
        setSideNavPosition();
    });
});


$(function () {
    var additionalContentElement = $('.additional-content-column');
    if (additionalContentElement.outerHeight(true) > windowHeight) {
        additionalContentElement.addClass("affix-top");
    } else {
        additionalContentElement.affix({
            offset: {
                top: function () {
                    return (this.top = 0);
                },
                bottom: function () {
                    return (this.bottom = $('div#footer').outerHeight(true) + FOOTER_DISTANCE);
                }
            }
        });
    }
});
var PAGE_FILTER = " more:pagemap:metatags-restype:";
var GCSE_ELEMENT_NAME = "google-search";
var GCSE_API_URL = "https://www.googleapis.com/customsearch/v1";
var searchTerms = "";
var searchItemsStorageKey = "searchItemsStorageKey";
var searchDataSource, isKbPortalRoot;

var searchViewModel = kendo.observable({
    isInitialized: false,
    kb: false,
    documentation: false,
    api: false,
    label: "",
    filterValues: [],
    getFilter: function () {
        var filterExpression = '';
        for (var i = 0; i < this.filterValues.length; i++) {
            if (filterExpression !== '') {
                filterExpression += ',';
            }

            filterExpression += this.filterValues[i];
        }

        return filterExpression;
    },
    getFilterExpression: function () {
        var filter = this.getFilter();
        return filter !== '' ? PAGE_FILTER + filter : '';
    },
    updateLabel: function () {
        var label = "";
        this.filterValues = [];

        if ((this.kb && this.documentation && this.api) || (!this.kb && !this.documentation && !this.api)) {
            label = "Search all";
        } else {
            if (this.documentation) {
                label += "DOCS";
                this.filterValues.push('documentation');
            }

            if (this.kb) {
                label += (label ? " / " : "") + "KB";
                this.filterValues.push('kb');
            }

            if (this.api && hasApiReference) {
                label += (label ? " / " : "") + "API";
                this.filterValues.push('api');
            }

            label = "Search in " + label;
        }

        this.set("label", label);
    },
    getLocalStorageKey: function () {
        return searchItemsStorageKey + gcsInstance;
    },
    update: function () {
        this.updateLabel();
        localStorage.setItem(this.getLocalStorageKey(), JSON.stringify(this.filterValues));
        updateSearchLayout();

    },
    init: function () {
        var propertyNames = JSON.parse(localStorage.getItem(this.getLocalStorageKey()));
        if (!propertyNames || isKbPortalRoot) {
            propertyNames = [];

            if (isKbPage || isKbPortalRoot) {
                propertyNames.push('kb');
            } else {
                propertyNames.push('documentation');
                if (hasApiReference) {
                    propertyNames.push('api');
                }

                if (siteHasKbPortal) {
                    propertyNames.push('kb');
                }
            }

            if (!isKbPortalRoot) {
                localStorage.setItem(this.getLocalStorageKey(), JSON.stringify(propertyNames));
            }
        }

        for (var i = 0; i < propertyNames.length; i++) {
            searchViewModel.set(propertyNames[i], true);
        }

        searchViewModel.updateLabel();
    }
});

function init() {
    searchViewModel.init();
    
    kendo.bind($(".search-input-container"), searchViewModel);
    $(".custom-checkbox input[type='checkbox']").change(function () {
        searchViewModel.update();
    });
}

function updateSearchLayout() {
    $('#local-search').css('padding-right', $('#refine-search-button').outerWidth());
}

$(function () {
    init();
});
var loadedScripts = [];

var loadScript = function (url) {
    if (loadedScripts.indexOf(url) > -1) {
        return;
    }

    loadedScripts.push(url);
    
    var script = document.createElement('script');
    script.setAttribute('src', url);
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('async', 'true');

    document.getElementsByTagName("head")[0].appendChild(script);
};

$(document).ready(function () {
    $(".all-components").click(function () {
        ensureNavigationLoaded();

        var showComponentsClassName = 'show-components';
        $(".all-components").toggleClass(showComponentsClassName);

        var sideNav = $('.side-nav');
        sideNav.toggleClass(showComponentsClassName);
        if (sideNav.hasClass(showComponentsClassName)) {
            scrollNodeIntoView($('#page-tree').data('kendoTreeView').select());
        }
    });

    $(".api-index").toggleClass(function () {
        return $.grep(
            $(this).find("ul"),
            function (ul) { return $(ul).children().length > 20; }
        ).length > 0 ? "api-columns" : "";
    });

    $(".api-columns > div").addClass("components pb-20 mb-20");

    $('#refine-search-container').on('click', function () {
        loadScript(assetsFolderPath + '/search-popup.js')
    });

    $('.feedback-no-button').on('click', function () {
        loadScript(assetsFolderPath + '/kinvey.js')
    });
})
;
var feedbackProps = {
    feedbackFixedClassName: 'feedback-fixed',
    feedbackDisabledClassName: 'vote-disabled',
    feedbackFormSelector: '.feedback-row',
    feedbackMoreInfoSelector: '.feedback-more-info',
    isVoting: false,
    isClosed: false
};

$(document).ready(function () {

    var localStorageFeedbackKey = function () {
        return 'T_DOCUMENTATION_FEEDBACK_SUBMIT' + window.location.href;
    };

    var getFeedbackInfo = function () {
        return localStorage.getItem(localStorageFeedbackKey());
    };

    var setFeedbackInfo = function (vote, closed) {
        var feedbackInfo = getFeedbackInfo();

        if (feedbackInfo) {
            var currentFeedbackInfo = JSON.parse(feedbackInfo);
            if (!vote) {
                vote = currentFeedbackInfo.vote;
            }
            if (closed === undefined || closed === null) {
                closed = currentFeedbackInfo.closed;
            }

        }

        feedbackInfo = {
            date: new Date(),
            vote: vote,
            closed: closed,
            url: window.location.href
        };

        localStorage.setItem(localStorageFeedbackKey(), JSON.stringify(feedbackInfo));

        submitToAnalytics(closed && !vote ? 'close' : vote);
    };

    var canVote = function () {
        var previousVote = getFeedbackInfo();
        if (previousVote) {
            var previousVoteData = JSON.parse(previousVote);
            if (previousVoteData.url === window.location.href && previousVoteData.vote !== null) {
                // You can vote once per week for an article.
                return Math.abs(new Date() - new Date(previousVoteData.date)) / 1000 / 60 / 60 >= 168;
            }
        }

        return true;
    };

    var getCookieByName = function (name) {
        var match = document.cookie.match(new RegExp(name + '=([^;]+)'));
        if (match) return match[1];
    };

    var onAfterVote = function () {
        setTimeout(function () {
            $('.feedback').html("<div class='side-title uppercase-clear'>Thank you for your feedback!</div>");
        }, 200);

        setTimeout(function () {
            $(feedbackProps.feedbackFormSelector).removeClass(feedbackProps.feedbackFixedClassName);
            $(feedbackProps.feedbackFormSelector).addClass('vote-hide');
        }, 2000)
    };

    var scrollToFeedbackForm = function () {
        var $window = $(window);
        var $feedbackForm = $(feedbackProps.feedbackFormSelector);
        var verticalOffset = $feedbackForm.offset().top + $feedbackForm.outerHeight() - ($window.height() + $window.scrollTop());
        if (verticalOffset >= 0) {
            window.scrollTo({
                left: $window.scrollLeft(),
                top: $window.scrollTop() + verticalOffset,
                behavior: 'smooth'
            });
        }
    }

    var getFeedbackComment = function () {
        return $('#feedback-other-text-input').val().trim();
    }

    var getFeedbackData = function () {
        var otherFeedbackText = getFeedbackComment();
        return {
            email: "",
            inaccurateContent: false,
            inaccurateOutdatedContentText: "",
            otherMoreInformation: false,
            otherMoreInformationText: "",
            textErrors: false,
            typosLinksElementsText: "",
            outdatedSample: false,
            inaccurateOutdatedCodeSamplesText: "",
            acceptFeedbackContact: false,
            otherFeedback: otherFeedbackText !== "",
            textFeedback: otherFeedbackText,
            yesNoFeedback: getCookieByName("yesNoFeedback") || "Not submitted",
            uuid: getCookieByName("uuid"),
            path: window.location.href,
            hasPreviousFeedback: getCookieByName("feedbackSubmitted") || "false",
            sheetId: $("#hidden-sheet-id").val()
        };
    };

    $('.feedback .feedback-vote-button').on('click', function (e) {
        var moreContent = $(feedbackProps.feedbackMoreInfoSelector);
        var vote = '';
        if ($(this).hasClass('feedback-no-button')) {
            moreContent.show();
            moreContent.addClass('show');
            $('.feedback .feedback-question').hide();
            $('.feedback-more-info.show').one('transitionend webkitTransitionEnd oTransitionEnd', function () {
                scrollToFeedbackForm();
            });
            vote = 'no';
        } else {
            onAfterVote();
            moreContent.hide();
            vote = 'yes';
        }

        setFeedbackInfo(vote);
    });

    $('.feedback .feedback-send-data-button').on('click', function () {
        $(feedbackProps.feedbackMoreInfoSelector).addClass('hide');

        var endpoint = "https://baas.kinvey.com/rpc/" + kinveyAppKey + "/custom/saveFeedback"
        if (getFeedbackComment()) {
            $.ajax({
                url: endpoint,
                method: "POST",
                dataType: "json",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(getFeedbackData()),
                crossDomain: true,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Authorization", "Basic " + btoa("feedback:feedback"));
                }
            });
        }

        onAfterVote();
    });

    $('.close-button-container').on('click', function () {
        feedbackProps.isClosed = true;
        toggleFeedbackSticky(false);
        setFeedbackInfo(null, feedbackProps.isClosed)
    });

    var hasVoted = function () {
        var feedbackInfo = getFeedbackInfo();
        if (feedbackInfo) {
            var vote = JSON.parse(feedbackInfo).vote;
            return vote && (vote.toLowerCase() === 'yes' || vote.toLowerCase() === 'no');
        }

        return false;
    }

    var hasClosed = function () {
        var feedbackInfo = getFeedbackInfo();
        if (feedbackInfo) {
            return JSON.parse(feedbackInfo).closed;
        }

        return false;
    }

    var shouldRunFeedbackTimer = function () {
        return !(hasVoted() || hasClosed());
    }

    var getElementTopOffset = function (selector) {
        return $(selector)[0].getBoundingClientRect().top;
    }

    var isFeedbackBarInViewPort = function () {
        return $(feedbackProps.feedbackFormSelector).length && getElementTopOffset(feedbackProps.feedbackFormSelector) < window.innerHeight;
    }

    var shouldShowFeedbackPopup = function () {
        return !feedbackProps.isVoting && !isFeedbackBarInViewPort();
    }

    var toggleFeedbackSticky = function (isSticky) {
        if (isSticky) {
            $(feedbackProps.feedbackFormSelector).addClass(feedbackProps.feedbackFixedClassName);
        } else {
            $(feedbackProps.feedbackFormSelector).removeClass(feedbackProps.feedbackFixedClassName);
        }

        feedbackProps.isSticky = isSticky;
    }

    var submitToAnalytics = function (data) {
        var dataLayer = window.dataLayer || [];
        dataLayer.push({
            'event': 'virtualEvent',
            'eventCategory': 'feedback',
            'eventAction': toPascaleCase(data),
            'eventLabel': window.location.href
        });
    }

    var toPascaleCase = function (str) {
        if (!str || str.length === 0) {
            return '';
        }

        var lower = str.toLowerCase();
        var firstLetter = lower[0];
        return firstLetter.toUpperCase() + lower.slice(1);
    }

    var onWindowScrollOrResize = function () {
        if (!feedbackProps.isClosed) {
            var $window = $(window);
            var scrollOffset = $window.height() + $window.scrollTop();
            var footerHeight = $(feedbackProps.feedbackFormSelector).outerHeight() + $('#footer').outerHeight();
            var feedbackOffsetTop = document.body.scrollHeight - footerHeight;

            // Double the feedback form height in order to have sticky scroll when it is scrolled down to footer
            toggleFeedbackSticky(scrollOffset - $(feedbackProps.feedbackFormSelector).outerHeight() * 2 < feedbackOffsetTop);
        }
        else {
            window.removeEventListener('scroll', onWindowScrollOrResize);
            window.removeEventListener('resize', onWindowScrollOrResize);
        }
    }
    var init = function () {
        if (!canVote()) {
            $(feedbackProps.feedbackFormSelector).addClass(feedbackProps.feedbackDisabledClassName);
        }
        else {
            if (shouldRunFeedbackTimer()) {
                setTimeout(function () {
                    if (shouldShowFeedbackPopup()) {
                        $(feedbackProps.feedbackFormSelector).addClass(feedbackProps.feedbackFixedClassName);

                        window.addEventListener('scroll', onWindowScrollOrResize, {passive: true});
                        window.addEventListener('resize', onWindowScrollOrResize, {passive: true});
                    }
                }, 30000) // 30 sec
            }
        }
    };

    init();
});

