/******/
(function(modules) { // webpackBootstrap
    /******/ // The module cache
    /******/
    var installedModules = {};

    /******/ // The require function
    /******/
    function __webpack_require__(moduleId) {

        /******/ // Check if module is in cache
        /******/
        if (installedModules[moduleId])
        /******/
            return installedModules[moduleId].exports;

        /******/ // Create a new module (and put it into the cache)
        /******/
        var module = installedModules[moduleId] = {
            /******/
            exports: {},
            /******/
            id: moduleId,
            /******/
            loaded: false
                /******/
        };

        /******/ // Execute the module function
        /******/
        modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

        /******/ // Flag the module as loaded
        /******/
        module.loaded = true;

        /******/ // Return the exports of the module
        /******/
        return module.exports;
        /******/
    }


    /******/ // expose the modules object (__webpack_modules__)
    /******/
    __webpack_require__.m = modules;

    /******/ // expose the module cache
    /******/
    __webpack_require__.c = installedModules;

    /******/ // __webpack_public_path__
    /******/
    __webpack_require__.p = "";

    /******/ // Load entry module and return exports
    /******/
    return __webpack_require__(0);
    /******/
})
/************************************************************************/
/******/
([
    /* 0 */
    /***/
    function(module, exports, __webpack_require__) {

        'use strict';

        var _createClass = function() {
            function defineProperties(target, props) {
                for (var i = 0; i < props.length; i++) {
                    var descriptor = props[i];
                    descriptor.enumerable = descriptor.enumerable || false;
                    descriptor.configurable = true;
                    if ("value" in descriptor) descriptor.writable = true;
                    Object.defineProperty(target, descriptor.key, descriptor);
                }
            }
            return function(Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; };
        }();
        /*
         *  GridManager: ??????
         * */


        var _jTool = __webpack_require__(1);

        var _jTool2 = _interopRequireDefault(_jTool);

        var _Adjust = __webpack_require__(3);

        var _Adjust2 = _interopRequireDefault(_Adjust);

        var _AjaxPage = __webpack_require__(6);

        var _AjaxPage2 = _interopRequireDefault(_AjaxPage);

        var _Base = __webpack_require__(5);

        var _Base2 = _interopRequireDefault(_Base);

        var _Cache = __webpack_require__(4);

        var _Cache2 = _interopRequireDefault(_Cache);

        var _Core = __webpack_require__(7);

        var _Core2 = _interopRequireDefault(_Core);

        var _Config = __webpack_require__(11);

        var _Config2 = _interopRequireDefault(_Config);

        var _Checkbox = __webpack_require__(12);

        var _Checkbox2 = _interopRequireDefault(_Checkbox);

        var _Drag = __webpack_require__(16);

        var _Drag2 = _interopRequireDefault(_Drag);

        var _Export = __webpack_require__(10);

        var _Export2 = _interopRequireDefault(_Export);

        var _I18n = __webpack_require__(9);

        var _I18n2 = _interopRequireDefault(_I18n);

        var _Menu = __webpack_require__(8);

        var _Menu2 = _interopRequireDefault(_Menu);

        var _Order = __webpack_require__(13);

        var _Order2 = _interopRequireDefault(_Order);

        var _Remind = __webpack_require__(14);

        var _Remind2 = _interopRequireDefault(_Remind);

        var _Scroll = __webpack_require__(17);

        var _Scroll2 = _interopRequireDefault(_Scroll);

        var _Sort = __webpack_require__(15);

        var _Sort2 = _interopRequireDefault(_Sort);

        var _Settings = __webpack_require__(18);

        var _Hover = __webpack_require__(19);

        var _Publish = __webpack_require__(20);

        function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

        function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

        var GridManager = function() {
            function GridManager() {
                _classCallCheck(this, GridManager);

                this.version = '2.3.0';
                this.extentGridManager();
            }
            /*
             * [??????????????????]
             * @???????????????
             * $.jToolObj: table [jTool object]
             * $.arg: ??????
             * $.callback:??????
             * */


            _createClass(GridManager, [{
                key: 'init',
                value: function init(jToolObj, arg, callback) {

                        var _this = this;
                        if (typeof arg.gridManagerName !== 'string' || arg.gridManagerName.trim() === '') {
                            arg.gridManagerName = jToolObj.attr('grid-manager'); //??????gridManagerName???
                        }
                        // ????????????
                        var _settings = _jTool2.default.extend(true, {}, _Settings.Settings);
                        _settings.textConfig = new _Settings.TextSettings();
                        _jTool2.default.extend(true, _settings, arg);
                        _this.updateSettings(jToolObj, _settings);

                        _jTool2.default.extend(true, this, _settings);

                        //?????????????????? ????????????
                        _this.cleanTableCacheForVersion(jToolObj, this.version);
                        if (_this.gridManagerName.trim() === '') {
                            _this.outLog('??????html??????????????????[grid-manager]??????????????????????????????gridManagerName', 'error');
                            return false;
                        }

                        // ????????????????????????????????????
                        if (jToolObj.hasClass('GridManager-ready') || jToolObj.hasClass('GridManager-loading')) {
                            _this.outLog('?????????????????????????????????????????????????????????', 'error');
                            return false;
                        }

                        //??????????????????????????????????????????
                        if (_this.supportAjaxPage) {
                            _this.configPageForCache(jToolObj);
                        }

                        //?????????????????????
                        jToolObj.addClass('GridManager-loading');

                        // ???????????????
                        _this.initTable(jToolObj);
                        //???????????????????????????????????????????????????????????????????????????
                        if (typeof jToolObj.attr('grid-manager-cache-error') !== 'undefined') {
                            window.setTimeout(function() {
                                _this.saveUserMemory(jToolObj, true);
                                jToolObj.removeAttr('grid-manager-cache-error');
                            }, 1000);
                        }

                        //????????????
                        typeof callback == 'function' ? callback(_this.query) : '';
                        return jToolObj;
                    }
                    /*
	   @???????????????
	   $.table: table[jTool object]
	   */

            }, {
                key: 'initTable',
                value: function initTable(table) {
                    var _this = this;
                    //??????HTML???????????????????????????DOM
                    _Core2.default.createDOM(table);

                    //??????????????????????????????????????????
                    if (!_this.disableCache) {
                        _this.configTheadForCache(table);
                        _this.supportAdjust ? _this.resetAdjust(table) : ''; // ???????????????????????????, ???????????????????????????dom
                    }

                    //????????????????????????
                    if (_this.supportAdjust) {
                        _this.bindAdjustEvent(table);
                    }

                    //????????????????????????
                    if (_this.supportDrag) {
                        _this.bindDragEvent(table);
                    }

                    //??????????????????
                    if (_this.supportSorting) {
                        _this.bindSortingEvent(table);
                    }

                    //????????????????????????
                    if (_this.supportRemind) {
                        _this.bindRemindEvent(table);
                    }

                    //????????????????????????
                    if (_this.supportConfig) {
                        _this.bindConfigEvent(table);
                    }

                    //??????table??????hover??????
                    _this.onTbodyHover(table);

                    //????????????????????????
                    _this.bindScrollFunction(table);

                    //????????????????????????
                    _this.bindRightMenuEvent(table);

                    //??????tbodyDOM
                    _this.__refreshGrid(table);

                    //???GridManager????????????????????????jTool data
                    _this.setGridManagerToJTool.call(_this, table);
                }

                // ??????GirdManager

            }, {
                key: 'extentGridManager',
                value: function extentGridManager() {
                    // GM????????????: ?????????
                    _jTool2.default.extend(true, this, _Settings.Settings);

                    // GM????????????: ??????
                    _jTool2.default.extend(this, _Base2.default);

                    // GM????????????: ??????
                    _jTool2.default.extend(this, _Core2.default);

                    // GM????????????: ??????
                    _jTool2.default.extend(this, _Hover.Hover);

                    // GM????????????: ??????
                    _jTool2.default.extend(this, _Checkbox2.default);

                    // GM????????????: ??????
                    _jTool2.default.extend(this, _Cache2.default);

                    // GM????????????: ????????????
                    _jTool2.default.extend(this, _Adjust2.default);

                    // GM????????????: ??????
                    _jTool2.default.extend(this, _AjaxPage2.default);

                    // GM????????????: ?????????????????????
                    _jTool2.default.extend(this, _Config2.default);

                    // GM????????????: ??????
                    _jTool2.default.extend(this, _Drag2.default);

                    // GM????????????: ??????
                    _jTool2.default.extend(this, _Sort2.default);

                    // GM????????????: ????????????
                    _jTool2.default.extend(this, _Export2.default);

                    // GM????????????: ?????????
                    _jTool2.default.extend(this, _I18n2.default);

                    // GM????????????: ????????????
                    _jTool2.default.extend(this, _Menu2.default);

                    // GM????????????: ??????
                    _jTool2.default.extend(this, _Order2.default);

                    // GM????????????: ????????????
                    _jTool2.default.extend(this, _Remind2.default);

                    // GM????????????: ????????????
                    _jTool2.default.extend(this, _Scroll2.default);

                    // GM????????????: ????????????
                    _jTool2.default.extend(this, _Publish.PublishMethod);
                }
            }]);

            return GridManager;
        }();

        /*
         *  ????????????????????????
         * */


        (function($) {
            Element.prototype.GM = Element.prototype.GridManager = function() {
                var $table = $(this);
                // ???????????????????????????tr??????????????????resetTd()??????
                if (this.nodeName === 'TR') {
                    return;
                }
                var name = void 0; // ?????????
                var settings = void 0; // ??????
                var callback = void 0; // ????????????
                var condition = void 0; // ??????
                // ???????????????
                // ex: document.querySelector('table').GridManager()
                if (arguments.length === 0) {
                    name = 'init';
                    settings = {};
                    callback = undefined;
                }
                // ex: document.querySelector('table').GridManager({settings}, callback)
                else if ($.type(arguments[0]) !== 'string') {
                    name = 'init';
                    settings = arguments[0];
                    callback = arguments[1];
                }
                // ex: document.querySelector('table').GridManager('get')
                // ex: document.querySelector('table').GM('showTh', $th);
                // ex: document.querySelector('table').GM('setSort',sortJson,callback, refresh);
                else {
                    name = arguments[0];
                    settings = arguments[1];
                    callback = arguments[2];
                    condition = arguments[3];
                }

                if (_Publish.publishMethodArray.indexOf(name) === -1) {
                    throw new Error('GridManager Error:???????????????????????????????????????[' + name + ']????????????');
                    return false;
                }
                var gmObj = void 0;
                // ????????????????????????
                if (name == 'init') {
                    var _GM = new GridManager();
                    _GM.init($table, settings, callback);
                    return _GM;
                }
                // ?????????????????????
                else if (name != 'init') {
                    gmObj = $table.data('gridManager');
                    var gmData = gmObj[name]($table, settings, callback, condition);
                    //?????????????????????????????????????????????????????????dom, ??????????????????
                    return typeof gmData === 'undefined' ? this : gmData;
                }
            };
        })(_jTool2.default);

        /*
         * ??????jquery
         * */
        (function() {
            if (typeof jQuery !== 'undefined' && jQuery.fn.extend) {
                jQuery.fn.extend({
                    GM: function GM() {
                        if (arguments.length === 0) {
                            return this.get(0).GM();
                        } else if (arguments.length === 1) {
                            return this.get(0).GM(arguments[0]);
                        } else if (arguments.length === 2) {
                            return this.get(0).GM(arguments[0], arguments[1]);
                        } else if (arguments.length === 3) {
                            return this.get(0).GM(arguments[0], arguments[1], arguments[2]);
                        }
                    },
                    GridManager: function GridManager() {
                        if (arguments.length === 0) {
                            return this.get(0).GridManager();
                        } else if (arguments.length === 1) {
                            return this.get(0).GridManager(arguments[0]);
                        } else if (arguments.length === 2) {
                            return this.get(0).GridManager(arguments[0], arguments[1]);
                        } else if (arguments.length === 3) {
                            return this.get(0).GridManager(arguments[0], arguments[1], arguments[2]);
                        }
                    }
                });
            }
        })();
        // ??????jTool?????????$??????
        (function() {
            window.$ = window._$ || undefined;
        })();

        /***/
    },
    /* 1 */
    /***/
    function(module, exports, __webpack_require__) {

        'use strict';

        Object.defineProperty(exports, "__esModule", {
            value: true
        });

        __webpack_require__(2);

        var $ = jTool;
        /**
         * jTool: export jTool
         */
        exports.default = $;

        /***/
    },
    /* 2 */
    /***/
    function(module, exports, __webpack_require__) {

        var require;
        var require;
        ! function t(e, n, o) {
            function i(s, u) {
                if (!n[s]) {
                    if (!e[s]) { var a = "function" == typeof require && require; if (!u && a) return require(s, !0); if (r) return r(s, !0); var c = new Error("Cannot find module '" + s + "'"); throw c.code = "MODULE_NOT_FOUND", c }
                    var l = n[s] = { exports: {} };
                    e[s][0].call(l.exports, function(t) { var n = e[s][1][t]; return i(n ? n : t) }, l, l.exports, t, e, n, o)
                }
                return n[s].exports
            }
            for (var r = "function" == typeof require && require, s = 0; s < o.length; s++) i(o[s]);
            return i
        }({
            1: [function(t, e) {
                var n = t("./utilities"),
                    o = t("../src/Css"),
                    i = {
                        show: function() {
                            return n.each(this.DOMList, function(t, e) {
                                var n = "",
                                    o = ["SPAN", "A", "FONT", "I"];
                                if (-1 !== e.nodeName.indexOf(o)) return e.style.display = "inline-block", this;
                                switch (e.nodeName) {
                                    case "TABLE":
                                        n = "table";
                                        break;
                                    case "THEAD":
                                        n = "table-header-group";
                                        break;
                                    case "TBODY":
                                        n = "table-row-group";
                                        break;
                                    case "TR":
                                        n = "table-row";
                                        break;
                                    case "TH":
                                        n = "table-cell";
                                        break;
                                    case "TD":
                                        n = "table-cell";
                                        break;
                                    default:
                                        n = "block"
                                }
                                e.style.display = n
                            }), this
                        },
                        hide: function() { return n.each(this.DOMList, function(t, e) { e.style.display = "none" }), this },
                        animate: function(t, e, i) {
                            var r = this,
                                s = "",
                                u = "",
                                a = r.DOMList[0];
                            if (t) {
                                "undefined" === n.type(i) && "function" === n.type(e) && (i = e, e = 0), "undefined" === n.type(i) && (i = n.noop), "undefined" === n.type(e) && (e = 0), n.each(t, function(t, e) { t = n.toHyphen(t), s += t + ":" + n.getStyle(a, t) + ";", u += t + ":" + e + ";" });
                                var c = "@keyframes jToolAnimate {from {" + s + "}to {" + u + "}}",
                                    l = document.createElement("style");
                                l.className = "jTool-animate-style", l.type = "text/css", document.head.appendChild(l), l.textContent = l.textContent + c, a.style.animation = "jToolAnimate " + e / 1e3 + "s ease-in-out forwards", window.setTimeout(function() { o.css.call(r, t), a.style.animation = "", l.remove(), i() }, e)
                            }
                        }
                    };
                e.exports = i
            }, { "../src/Css": 3, "./utilities": 13 }],
            2: [function(t, e) {
                var n = t("./utilities"),
                    o = { addClass: function(t) { return this.changeClass(t, "add") }, removeClass: function(t) { return this.changeClass(t, "remove") }, toggleClass: function(t) { return this.changeClass(t, "toggle") }, hasClass: function(t) { return [].some.call(this.DOMList, function(e) { return e.classList.contains(t) }) }, parseClassName: function(t) { return t.indexOf(" ") ? t.split(" ") : [t] }, changeClass: function(t, e) { var o = this.parseClassName(t); return n.each(this.DOMList, function(t, i) { n.each(o, function(t, n) { i.classList[e](n) }) }), this } };
                e.exports = o
            }, { "./utilities": 13 }],
            3: [function(t, e) {
                var n = t("./utilities"),
                    o = {
                        css: function(t, e) {
                            function o(t, e) { "number" === n.type(e) && (e = e.toString()), -1 !== r.indexOf(t) && -1 === e.indexOf("px") && (e += "px"), n.each(i.DOMList, function(n, o) { o.style[t] = e }) }
                            var i = this,
                                r = ["width", "height", "min-width", "max-width", "min-height", "min-height", "top", "left", "right", "bottom", "padding-top", "padding-right", "padding-bottom", "padding-left", "margin-top", "margin-right", "margin-bottom", "margin-left", "border-width", "border-top-width", "border-left-width", "border-right-width", "border-bottom-width"];
                            if ("string" === n.type(t) && !e && 0 !== e) return -1 !== r.indexOf(t) ? parseInt(n.getStyle(this.DOMList[0], t), 10) : n.getStyle(this.DOMList[0], t);
                            if ("object" === n.type(t)) { var s = t; for (var u in s) o(u, s[u]) } else o(t, e);
                            return this
                        },
                        width: function(t) { return this.css("width", t) },
                        height: function(t) { return this.css("height", t) }
                    };
                e.exports = o
            }, { "./utilities": 13 }],
            4: [function(t, e) {
                var n = t("./utilities"),
                    o = {
                        dataKey: "jTool" + n.version,
                        data: function(t, e) {
                            var o = this,
                                i = {};
                            if ("undefined" == typeof t && "undefined" == typeof e) return o.DOMList[0][o.dataKey];
                            if ("undefined" != typeof e) { var r = n.type(e); return ("string" === r || "number" === r) && o.attr(t, e), n.each(o.DOMList, function(n, r) { i = r[o.dataKey] || {}, i[t] = e, r[o.dataKey] = i }), this }
                            return i = o.DOMList[0][o.dataKey] || {}, this.transformValue(i[t] || o.attr(t))
                        },
                        removeData: function(t) { var e, o = this; "undefined" != typeof t && (n.each(o.DOMList, function(n, i) { e = i[o.dataKey] || {}, delete e[t] }), o.removeAttr(t)) },
                        attr: function(t, e) { return "undefined" == typeof t && "undefined" == typeof e ? "" : "undefined" != typeof e ? (n.each(this.DOMList, function(n, o) { o.setAttribute(t, e) }), this) : this.transformValue(this.DOMList[0].getAttribute(t)) },
                        removeAttr: function(t) { "undefined" != typeof t && n.each(this.DOMList, function(e, n) { n.removeAttribute(t) }) },
                        prop: function(t, e) { return "undefined" == typeof t && "undefined" == typeof e ? "" : "undefined" != typeof e ? (n.each(this.DOMList, function(n, o) { o[t] = e }), this) : this.transformValue(this.DOMList[0][t]) },
                        removeProp: function(t) { "undefined" != typeof t && n.each(this.DOMList, function(e, n) { delete n[t] }) },
                        val: function(t) { return this.prop("value", t) || "" },
                        transformValue: function(t) { return "null" === n.type(t) && (t = void 0), t }
                    };
                e.exports = o
            }, { "./utilities": 13 }],
            5: [function(t, e) {
                var n = t("./utilities"),
                    o = t("./Sizzle"),
                    i = {
                        append: function(t) { return this.html(t, "append") },
                        prepend: function(t) { return this.html(t, "prepend") },
                        before: function(t) {
                            t.jTool && (t = t.DOMList[0]);
                            var e = this.DOMList[0],
                                n = e.parentNode;
                            return n.insertBefore(t, e), this
                        },
                        after: function(t) {
                            t.jTool && (t = t.DOMList[0]);
                            var e = this.DOMList[0],
                                n = e.parentNode;
                            n.lastChild == e ? n.appendChild(t) : n.insertBefore(t, e.nextSibling)
                        },
                        text: function(t) { return "undefined" != typeof t ? (n.each(this.DOMList, function(e, n) { n.textContent = t }), this) : this.DOMList[0].textContent },
                        html: function(t, e) {
                            if ("undefined" == typeof t && "undefined" == typeof e) return this.DOMList[0].innerHTML;
                            var o = this,
                                i = n.type(t);
                            t.jTool ? t = t.DOMList : "string" === i ? t = n.createDOM(t || "") : "element" === i && (t = [t]);
                            var r;
                            return n.each(o.DOMList, function(o, i) { e ? "prepend" === e && (r = i.firstChild) : i.innerHTML = "", n.each(t, function(t, e) { e = e.cloneNode(!0), e.nodeType || (e = document.createTextNode(e)), r ? i.insertBefore(e, r) : i.appendChild(e), i.normalize() }) }), this
                        },
                        wrap: function(t) {
                            var e;
                            return n.each(this.DOMList, function(n, i) {
                                e = i.parentNode;
                                var r = new o(t, i.ownerDocument).get(0);
                                e.insertBefore(r, i), r.querySelector(":empty").appendChild(i)
                            }), this
                        },
                        closest: function(t) {
                            function e() { return n && 0 !== i.length && 1 === n.nodeType ? void(-1 === [].indexOf.call(i, n) && (n = n.parentNode, e())) : void(n = null) }
                            var n = this.DOMList[0].parentNode;
                            if ("undefined" == typeof t) return new o(n);
                            var i = document.querySelectorAll(t);
                            return e(), new o(n)
                        },
                        parent: function() { return this.closest() },
                        clone: function(t) { return new o(this.DOMList[0].cloneNode(t || !1)) },
                        remove: function() { n.each(this.DOMList, function(t, e) { e.remove() }) }
                    };
                e.exports = i
            }, { "./Sizzle": 9, "./utilities": 13 }],
            6: [function(t, e) {
                var n = t("./Sizzle"),
                    o = { get: function(t) { return this.DOMList[t] }, eq: function(t) { return new n(this.DOMList[t]) }, find: function(t) { return new n(t, this) }, index: function(t) { var e = this.DOMList[0]; return t ? t.jTool && (t = t.DOMList) : t = e.parentNode.childNodes, t ? [].indexOf.call(t, e) : -1 } };
                e.exports = o
            }, { "./Sizzle": 9 }],
            7: [function(t, e) {
                var n = t("./utilities"),
                    o = {
                        on: function(t, e, n, o) { return this.addEvent(this.getEventObject(t, e, n, o)) },
                        off: function(t, e) { return this.removeEvent(this.getEventObject(t, e)) },
                        bind: function(t, e, n) { return this.on(t, void 0, e, n) },
                        unbind: function(t) { return this.removeEvent(this.getEventObject(t)) },
                        trigger: function(t) {
                            return n.each(this.DOMList, function(e, o) {
                                try {
                                    if (o.jToolEvent && o.jToolEvent[t].length > 0) {
                                        var i = new Event(t);
                                        o.dispatchEvent(i)
                                    } else o[t]()
                                } catch (r) { n.error("??????:[" + t + "]??????????????????, ?????????????????????????????????") }
                            }), this
                        },
                        getEventObject: function(t, e, o, i) {
                            if ("function" == typeof e && (i = o || !1, o = e, e = void 0), !t) return n.error("??????????????????,??????: ???????????????????????????"), this;
                            if (e && "element" === n.type(this.DOMList[0]) || (e = ""), "" !== e) {
                                var r = o;
                                o = function(t) {-1 !== [].indexOf.call(this.querySelectorAll(e), t.target) && r.apply(t.target, arguments) }
                            }
                            var s, u, a = t.split(" "),
                                c = [];
                            return n.each(a, function(t, r) { return "" === r.trim() ? !0 : (s = r.split("."), u = { eventName: r + e, type: s[0], querySelector: e, callback: o || n.noop, useCapture: i || !1, nameScope: s[1] || void 0 }, void c.push(u)) }), c
                        },
                        addEvent: function(t) { var e = this; return n.each(t, function(t, o) { n.each(e.DOMList, function(t, e) { e.jToolEvent = e.jToolEvent || {}, e.jToolEvent[o.eventName] = e.jToolEvent[o.eventName] || [], e.jToolEvent[o.eventName].push(o), e.addEventListener(o.type, o.callback, o.useCapture) }) }), e },
                        removeEvent: function(t) { var e, o = this; return n.each(t, function(t, i) { n.each(o.DOMList, function(t, o) { o.jToolEvent && (e = o.jToolEvent[i.eventName], e && (n.each(e, function(t, e) { o.removeEventListener(e.type, e.callback) }), o.jToolEvent[i.eventName] = void 0)) }) }), o }
                    };
                e.exports = o
            }, { "./utilities": 13 }],
            8: [function(t, e) {
                var n = t("./utilities"),
                    o = {
                        offset: function() {
                            function t(i, r) {
                                if (1 === i.nodeType) {
                                    if (e = n.getStyle(i, "position"), "undefined" == typeof r && "static" === e) return void t(i.parentNode);
                                    o.top = i.offsetTop + o.top - i.scrollTop, o.left = i.offsetLeft + o.left - i.scrollLeft, "fixed" !== e && t(i.parentNode)
                                }
                            }
                            var e, o = { top: 0, left: 0 };
                            return t(this.DOMList[0], !0), o
                        },
                        scrollTop: function(t) { return this.scrollFN(t, "top") },
                        scrollLeft: function(t) { return this.scrollFN(t, "left") },
                        scrollFN: function(t, e) { var n = this.DOMList[0]; return t || 0 === t ? (this.setScrollFN(n, e, t), this) : this.getScrollFN(n, e) },
                        getScrollFN: function(t, e) { return n.isWindow(t) ? "top" === e ? t.pageYOffset : t.pageXOffset : 9 === t.nodeType ? "top" === e ? t.body.scrollTop : t.body.scrollLeft : 1 === t.nodeType ? "top" === e ? t.scrollTop : t.scrollLeft : void 0 },
                        setScrollFN: function(t, e, o) { return n.isWindow(t) ? "top" === e ? t.document.body.scrollTop = o : t.document.body.scrollLeft = o : 9 === t.nodeType ? "top" === e ? t.body.scrollTop = o : t.body.scrollLeft = o : 1 === t.nodeType ? "top" === e ? t.scrollTop = o : t.scrollLeft = o : void 0 }
                    };
                e.exports = o
            }, { "./utilities": 13 }],
            9: [function(t, e) {
                var n = t("./utilities"),
                    o = function(t, e) { var o; return t ? n.isWindow(t) ? (o = [t], e = void 0) : t === document ? (o = [document], e = void 0) : t instanceof HTMLElement ? (o = [t], e = void 0) : t instanceof NodeList || t instanceof Array ? (o = t, e = void 0) : t.jTool ? (o = t.DOMList, e = void 0) : /<.+>/.test(t) ? (o = n.createDOM(t), e = void 0) : (e ? e = "string" == typeof e ? document.querySelectorAll(e) : e instanceof HTMLElement ? [e] : e instanceof NodeList ? e : e.jTool ? e.DOMList : void 0 : o = document.querySelectorAll(t), e && (o = [], n.each(e, function(e, i) { n.each(i.querySelectorAll(t), function(t, e) { e && o.push(e) }) }))) : t = null, o && 0 !== o.length || (o = void 0), this.jTool = !0, this.DOMList = o, this.length = this.DOMList ? this.DOMList.length : 0, this.querySelector = t, this };
                e.exports = o
            }, { "./utilities": 13 }],
            10: [function(t, e) {
                function n(t) {
                    var e = { url: null, type: "GET", data: null, headers: {}, async: !0, beforeSend: s.noop, complete: s.noop, success: s.noop, error: s.noop };
                    if (t = r(e, t), !t.url) return void s.error("jTool ajax: url????????????");
                    var n = new XMLHttpRequest,
                        o = "";
                    "object" === s.type(t.data) ? s.each(t.data, function(t, e) { "" !== o && (o += "&"), o += t + "=" + e }) : o = t.data, "GET" === t.type && o && (t.url = t.url + (-1 === t.url.indexOf("?") ? "?" : "&") + o, o = null), n.open(t.type, t.url, t.async);
                    for (var i in t.headers) n.setRequestHeader(i, t.headers[i]);
                    t.beforeSend(n), n.onload = function() { t.complete(n, n.status) }, n.onreadystatechange = function() { 4 === n.readyState && (n.status >= 200 && n.status < 300 || 304 === n.status ? t.success(n.response, n.status) : t.error(n, n.status, n.statusText)) }, n.send(o)
                }

                function o(t, e, o) { n({ url: t, type: "POST", data: e, success: o }) }

                function i(t, e, o) { n({ url: t, type: "GET", data: e, success: o }) }
                var r = t("./extend"),
                    s = t("./utilities");
                e.exports = { ajax: n, post: o, get: i }
            }, { "./extend": 11, "./utilities": 13 }],
            11: [function(t, e) {
                function n() {
                    function t(e, i) { for (var r in e) e.hasOwnProperty(r) && (n && "object" === o.type(e[r]) ? ("object" !== o.type(i[r]) && (i[r] = {}), t(e[r], i[r])) : i[r] = e[r]) }
                    if (0 === arguments.length) return {};
                    var e, n = !1,
                        i = 1,
                        r = arguments[0];
                    for (1 === arguments.length && "object" == typeof arguments[0] ? (r = this, i = 0) : 2 === arguments.length && "boolean" == typeof arguments[0] ? (n = arguments[0], r = this, i = 1) : arguments.length > 2 && "boolean" == typeof arguments[0] && (n = arguments[0], r = arguments[1] || {}, i = 2); i < arguments.length; i++) e = arguments[i] || {}, t(e, r);
                    return r
                }
                var o = t("./utilities");
                e.exports = n
            }, { "./utilities": 13 }],
            12: [function(t, e) {
                var n = t("./Sizzle"),
                    o = t("./extend"),
                    i = t("./utilities"),
                    r = t("./ajax"),
                    s = t("./Event"),
                    u = t("./Css"),
                    a = t("./Class"),
                    c = t("./Document"),
                    l = t("./Offset"),
                    d = t("./Element"),
                    f = t("./Animate"),
                    p = t("./Data"),
                    h = function(t, e) { return new n(t, e) };
                n.prototype = h.prototype = {}, h.extend = h.prototype.extend = o, h.extend(i), h.extend(r), h.prototype.extend(s), h.prototype.extend(u), h.prototype.extend(a), h.prototype.extend(c), h.prototype.extend(l), h.prototype.extend(d), h.prototype.extend(f), h.prototype.extend(p), "undefined" != typeof window.$ && (window._$ = $), window.jTool = window.$ = h, e.exports = h
            }, { "./Animate": 1, "./Class": 2, "./Css": 3, "./Data": 4, "./Document": 5, "./Element": 6, "./Event": 7, "./Offset": 8, "./Sizzle": 9, "./ajax": 10, "./extend": 11, "./utilities": 13 }],
            13: [function(t, e) {
                function n() { return -1 == navigator.userAgent.indexOf("Chrome") ? !1 : !0 }

                function o(t) { return null !== t && t === t.window }

                function i(t) { return Array.isArray(t) }

                function r(t) { return v[m.call(t)] || (t instanceof Element ? "element" : "") }

                function s() {}

                function u(t, e) {
                    t && t.jTool && (t = t.DOMList);
                    var n = r(t);
                    if ("array" === n || "nodeList" === n || "arguments" === n)[].every.call(t, function(t, n) { o(t) ? s() : t.jTool ? t = t.get(0) : s(); return e.call(t, n, t) === !1 ? !1 : !0 });
                    else if ("object" === n)
                        for (var i in t)
                            if (e.call(t[i], i, t[i]) === !1) break
                }

                function a(t) { return t.trim() }

                function c(t) { throw new Error("[jTool Error: " + t + "]") }

                function l(t) { var e = !0; for (var n in t) t.hasOwnProperty(n) && (e = !1); return e }

                function d(t, e) { return e ? window.getComputedStyle(t)[e] : window.getComputedStyle(t) }

                function f(t) {
                    var e = ["px", "vem", "em", "%"],
                        n = "";
                    return "number" == typeof t ? n : (u(e, function(e, o) { return -1 !== t.indexOf(o) ? (n = o, !1) : void 0 }), n)
                }

                function p(t) { return t.replace(/-\w/g, function(t) { return t.split("-")[1].toUpperCase() }) }

                function h(t) { return t.replace(/([A-Z])/g, "-$1").toLowerCase() }

                function y(t) {
                    var e = document.querySelector("#jTool-create-dom");
                    if (!e || 0 === e.length) {
                        var n = document.createElement("table");
                        n.id = "jTool-create-dom", n.style.display = "none", document.body.appendChild(n), e = document.querySelector("#jTool-create-dom")
                    }
                    e.innerHTML = t || "";
                    var o = e.childNodes;
                    return 1 != o.length || /<tbody|<TBODY/.test(t) || "TBODY" !== o[0].nodeName || (o = o[0].childNodes), 1 != o.length || /<thead|<THEAD/.test(t) || "THEAD" !== o[0].nodeName || (o = o[0].childNodes), 1 != o.length || /<tr|<TR/.test(t) || "TR" !== o[0].nodeName || (o = o[0].childNodes), 1 != o.length || /<td|<TD/.test(t) || "TD" !== o[0].nodeName || (o = o[0].childNodes), 1 != o.length || /<th|<TH/.test(t) || "TH" !== o[0].nodeName || (o = o[0].childNodes), e.remove(), o
                }
                var m = Object.prototype.toString,
                    v = { "[object String]": "string", "[object Boolean]": "boolean", "[object Undefined]": "undefined", "[object Number]": "number", "[object Object]": "object", "[object Error]": "error", "[object Function]": "function", "[object Date]": "date", "[object Array]": "array", "[object RegExp]": "regexp", "[object Null]": "null", "[object NodeList]": "nodeList", "[object Arguments]": "arguments", "[object Window]": "window", "[object HTMLDocument]": "document" };
                e.exports = { isWindow: o, isChrome: n, isArray: i, noop: s, type: r, toHyphen: h, toHump: p, getStyleUnit: f, getStyle: d, isEmptyObject: l, trim: a, error: c, each: u, createDOM: y, version: "1.2.16" }
            }, {}]
        }, {}, [12]);

        /***/
    },
    /* 3 */
    /***/
    function(module, exports, __webpack_require__) {

        'use strict';

        Object.defineProperty(exports, "__esModule", {
            value: true
        });

        var _jTool = __webpack_require__(1);

        var _jTool2 = _interopRequireDefault(_jTool);

        var _Cache = __webpack_require__(4);

        var _Cache2 = _interopRequireDefault(_Cache);

        var _Base = __webpack_require__(5);

        var _Base2 = _interopRequireDefault(_Base);

        function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

        var Adjust = {
            html: function html() {
                    return '<span class="adjust-action"></span>';
                }
                /*
	  @????????????????????????
	  $table: table [jTool object]
	  */
                ,
            bindAdjustEvent: function bindAdjustEvent($table) {
                    // table??????TH
                    var thList = (0, _jTool2.default)('thead th', $table);
                    // ???????????????????????????
                    thList.off('mousedown', '.adjust-action');
                    thList.on('mousedown', '.adjust-action', function(event) {

                        var Settings = _Cache2.default.getSettings($table);
                        var _dragAction = (0, _jTool2.default)(this);
                        // ??????????????????th
                        var _th = _dragAction.closest('th');

                        // ??????????????????tr
                        var _tr = _th.parent();

                        // ??????????????????table
                        var _table = _tr.closest('table');

                        // ??????????????????????????????th
                        var _allTh = _tr.find('th[th-visible="visible"]');

                        // ????????????????????????th
                        var _nextTh = _allTh.eq(_th.index(_allTh) + 1);

                        // ?????????????????????????????????td
                        var _td = _Base2.default.getColTd(_th);

                        // ??????????????????????????????
                        Settings.adjustBefore(event);

                        //???????????????????????????
                        _th.addClass('adjust-selected');
                        _td.addClass('adjust-selected');

                        //????????????????????????
                        var _thWidth = void 0,
                            _NextWidth = void 0;
                        var _thMinWidth = _Base2.default.getTextWidth(_th),
                            _NextThMinWidth = _Base2.default.getTextWidth(_nextTh);
                        _table.unbind('mousemove');
                        _table.bind('mousemove', function(event) {
                            _thWidth = event.clientX - _th.offset().left - _th.css('padding-left') - _th.css('padding-right');
                            _thWidth = Math.ceil(_thWidth);
                            _NextWidth = _nextTh.width() + _th.width() - _thWidth;
                            _NextWidth = Math.ceil(_NextWidth);
                            //???????????????
                            if (_thWidth < _thMinWidth) {
                                _thWidth = _thMinWidth;
                            }
                            if (_NextWidth < _NextThMinWidth) {
                                _NextWidth = _NextThMinWidth;
                            }
                            // ??????????????????
                            if (_thWidth === _th.width()) {
                                return;
                            }
                            // ????????????????????????
                            if (_thWidth + _NextWidth < _th.width() + _nextTh.width()) {
                                _NextWidth = _th.width() + _nextTh.width() - _thWidth;
                            }
                            _th.width(_thWidth);
                            _nextTh.width(_NextWidth);
                        });

                        // ?????????????????????????????????
                        _table.unbind('mouseup mouseleave');
                        _table.bind('mouseup mouseleave', function(event) {
                            var Settings = _Cache2.default.getSettings($table);
                            _table.unbind('mousemove mouseleave');
                            // ??????????????????
                            _Cache2.default.saveUserMemory(_table);
                            if (_th.hasClass('adjust-selected')) {
                                // ??????????????????table????????????????????????,????????????class????????????
                                // ??????????????????????????????
                                Settings.adjustAfter(event);
                            }
                            _th.removeClass('adjust-selected');
                            _td.removeClass('adjust-selected');
                        });
                        return false;
                    });
                    return this;
                }
                /*
	  @???????????????????????????, ???????????????????????????dom
	  ??????????????????????????????????????????
	  $.table: table[jTool Object]
	  */
                ,
            resetAdjust: function resetAdjust($table) {
                if (!$table || $table.length == 0) {
                    return false;
                }
                var _thList = (0, _jTool2.default)('thead [th-visible="visible"]', $table),
                    _adjustAction = (0, _jTool2.default)('.adjust-action', _thList);
                if (!_adjustAction || _adjustAction.length == 0) {
                    return false;
                }
                _adjustAction.show();
                _adjustAction.eq(_adjustAction.length - 1).hide();
            }
        };
        /*
         * Adjust: ????????????
         * */
        exports.default = Adjust;

        /***/
    },
    /* 4 */
    /***/
    function(module, exports, __webpack_require__) {

        'use strict';

        Object.defineProperty(exports, "__esModule", {
            value: true
        });

        var _jTool = __webpack_require__(1);

        var _jTool2 = _interopRequireDefault(_jTool);

        var _Base = __webpack_require__(5);

        var _Base2 = _interopRequireDefault(_Base);

        function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

        /*
         * @?????????????????????json??????
         * ????????????tr??????cache-key????????????
         * */
        /*
         * @Cache: ????????????
         * ?????????????????????:
         * 1.gridData: ???????????????????????????json?????? [?????????GM??????]
         * 2.coreData: ?????????????????? [?????????DOM???]
         * 3.userMemory: ???????????? [?????????localStorage]
         * */
        var GridData = function GridData() {
            this.responseData = {};
            /*
             * @???????????????????????????????????????
             * $table: ???????????????grid,?????????????????????
             * target: ??????????????????????????????tr[Element or NodeList]
             * */
            this.__getRowData = function($table, target) {
                var gmName = $table.attr('grid-manager');
                if (!gmName) {
                    return;
                }
                if (!this.responseData[gmName]) {
                    return;
                }
                // target type = Element ?????????, ????????????????????????;
                if (_jTool2.default.type(target) === 'element') {
                    return this.responseData[gmName][target.getAttribute('cache-key')];
                }
                // target type =  NodeList ?????????, ????????????
                else if (_jTool2.default.type(target) === 'nodeList') {
                    var _this = this;
                    var rodData = [];
                    _jTool2.default.each(target, function(i, v) {
                        rodData.push(_this.responseData[gmName][v.getAttribute('cache-key')]);
                    });
                    return rodData;
                }
            };
            /*
             * ???????????????
             * */
            this.setRowData = function(gmName, key, value) {
                if (!this.responseData[gmName]) {
                    this.responseData[gmName] = {};
                }
                this.responseData[gmName][key] = value;
            };
        };
        /*
         * ????????????
         * */
        var UserMemory = function UserMemory() {
            /*
             * ??????????????????
             * $table: table [jTool Object]
             * */
            this.delUserMemory = function($table) {
                if (!$table || $table.length === 0) {
                    return false;
                }
                var _key = this.getMemoryKey($table);
                if (!_key) {
                    return false;
                }
                window.localStorage.removeItem(_key);
                return true;
            };
            /*
             * ????????????????????????????????????
             * $table: table jTool
             * */
            this.getMemoryKey = function($table) {
                var settings = Cache.getSettings($table);
                // ??????table????????????
                if (!$table || $table.length === 0) {
                    _Base2.default.outLog('getUserMemory:?????????table', 'error');
                    return false;
                }
                //???????????????????????????  ????????????????????????????????????????????????
                var noCache = $table.attr('no-cache');
                if (noCache && noCache == 'true') {
                    _Base2.default.outLog('??????????????????????????????????????????html????????????[grid-manager???th-name]', 'info');
                    return false;
                }
                if (!window.localStorage) {
                    _Base2.default.outLog('???????????????????????????localStorage?????????????????????', 'info');
                    return false;
                }
                return window.location.pathname + window.location.hash + '-' + settings.gridManagerName;
            };
            /*
             * @??????????????????
             * $table:table
             * ?????????????????????????????????,????????????????????????
             * */
            this.getUserMemory = function($table) {
                var _key = this.getMemoryKey($table);
                if (!_key) {
                    return {};
                }
                var _localStorage = window.localStorage.getItem(_key);
                //????????????????????????????????????grid-manager-cache-error
                if (!_localStorage) {
                    $table.attr('grid-manager-cache-error', 'error');
                    return {};
                }
                var _data = {
                    key: _key,
                    cache: JSON.parse(_localStorage)
                };
                return _data;
            };
            /*
             * @??????????????????
             * $table:table [jTool object]
             * isInit: ???????????????????????????[????????????????????????????????????????????????]
             */
            // TODO @baukh20170414: ??????isInit ????????????, ??????????????????
            this.saveUserMemory = function(table, isInit) {
                var Settings = Cache.getSettings(table);
                var _this = this;
                //??????????????????????????????????????????
                if (Settings.disableCache) {
                    return false;
                }
                var _table = (0, _jTool2.default)(table);
                //???????????????????????????  ????????????????????????????????????????????????
                var noCache = _table.attr('no-cache');
                if (!_table || _table.length == 0) {
                    _Base2.default.outLog('saveUserMemory:?????????table', 'error');
                    return false;
                }
                if (noCache && noCache == 'true') {
                    _Base2.default.outLog('??????????????????????????????????????????????????????', 'info');
                    return false;
                }
                if (!window.localStorage) {
                    _Base2.default.outLog('???????????????????????????localStorage????????????????????????', 'error');
                    return false;
                }
                var thList = (0, _jTool2.default)('thead[grid-manager-thead] th', _table);
                if (!thList || thList.length == 0) {
                    _Base2.default.outLog('saveUserMemory:?????????thList,???????????????????????????table,thead,th', 'error');
                    return false;
                }

                var _cache = {},
                    _pageCache = {},
                    _thCache = [],
                    _thData = {};

                var $v = void 0;
                _jTool2.default.each(thList, function(i, v) {
                    $v = (0, _jTool2.default)(v);
                    _thData = {};
                    _thData.th_name = $v.attr('th-name');
                    if (Settings.supportDrag) {
                        _thData.th_index = $v.index();
                    }
                    if (Settings.supportAdjust) {
                        //????????????????????????????????????????????????
                        // isInit ? $v.css('width', $v.css('width')) : '';
                        _thData.th_width = $v.width();
                    }
                    if (Settings.supportConfig) {
                        if (_thData.th_name != "gm_checkbox") {
                            _thData.isShow = (0, _jTool2.default)('.config-area li[th-name="' + _thData.th_name + '"]', _table.closest('.table-wrap')).find('input[type="checkbox"]').get(0).checked;
                        }
                    }
                    _thCache.push(_thData);
                });
                _cache.th = _thCache;
                //????????????
                if (Settings.supportAjaxPage) {
                    _pageCache.pSize = parseInt((0, _jTool2.default)('select[name="pSizeArea"]', _table.closest('.table-wrap')).val());
                    _cache.page = _pageCache;
                }
                var _cacheString = JSON.stringify(_cache);
                window.localStorage.setItem(_this.getMemoryKey(_table), _cacheString);
                return _cacheString;
            };
        };
        /*
         *
         * */
        var Cache = {
            /*
             * ???????????????
             * $table:table [jTool object]
             * */
            getSettings: function getSettings($table) {
                    // ??????????????????clone?????? ??????????????????
                    return _jTool2.default.extend(true, {}, $table.data('settings'));
                }
                /*
                 * ???????????????
                 * $table:table [jTool object]
                 * */
                ,
            updateSettings: function updateSettings($table, settings) {
                    var data = _jTool2.default.extend(true, {}, settings);
                    $table.data('settings', data);
                }
                /*
                 *  @?????????????????????????????????
                 *  $.table: jTool table
                 *  $.version: ?????????
                 * */
                ,
            cleanTableCacheForVersion: function cleanTableCacheForVersion(table, version) {
                    var cacheVersion = window.localStorage.getItem('GridManagerVersion');
                    // ????????????????????????
                    if (!cacheVersion) {
                        window.localStorage.setItem('GridManagerVersion', version);
                    }
                    // ????????????
                    if (cacheVersion && cacheVersion !== version) {
                        this.cleanTableCache(table, '???????????????,????????????????????????');
                        window.localStorage.setItem('GridManagerVersion', version);
                    }
                }
                /*
                 * @??????????????????
                 * $.table: table [jTool object]
                 * $.cleanText: ?????????????????????
                 * */
                ,
            cleanTableCache: function cleanTableCache(table, cleanText) {
                    var Settings = this.getSettings(table);
                    this.delUserMemory(table);
                    _Base2.default.outLog(Settings.gridManagerName + '??????????????????,???????????????' + cleanText, 'info');
                }
                /*
                 * @??????????????????thead????????????: ??????????????????, ?????????????????????, ??????????????????????????????
                 * $.table: table [jTool object]
                 * */
                ,
            configTheadForCache: function configTheadForCache(table) {
                    var Settings = this.getSettings(table);
                    var _this = this;
                    var _data = _this.getUserMemory(table),
                        //?????????????????????
                        _domArray = [];

                    //???????????????table ??????????????????
                    if (!_data || _jTool2.default.isEmptyObject(_data)) {
                        return;
                    }
                    // ?????????????????????
                    var _cache = _data.cache;
                    // th?????? ??????
                    var _thCache = _cache.th;
                    //???????????????????????????????????????????????????
                    var _thNameTmpList = [];
                    var _dataAvailable = true;
                    // ?????????th
                    var _th = void 0;
                    // th?????????json
                    var _thJson = void 0;
                    //????????????????????????????????????????????????
                    if (!_thCache || _thCache.length != (0, _jTool2.default)('thead th', table).length) {
                        _this.cleanTableCache(table, '????????????????????????????????????');
                        return;
                    }
                    _jTool2.default.each(_thCache, function(i2, v2) {
                        _thJson = v2;
                        _th = (0, _jTool2.default)('th[th-name=' + _thJson.th_name + ']', table);
                        if (_th.length == 0 || _thNameTmpList.indexOf(_thJson.th_name) != -1) {
                            _this.cleanTableCache(table, '????????????????????????????????????');
                            _dataAvailable = false;
                            return false;
                        }
                        _thNameTmpList.push(_thJson.th_name);
                    });
                    //?????????????????????????????????
                    if (_dataAvailable) {
                        _jTool2.default.each(_thCache, function(i2, v2) {
                            _thJson = v2;
                            _th = (0, _jTool2.default)('th[th-name=' + _thJson.th_name + ']', table);
                            //??????????????????
                            if (Settings.supportAdjust && _th.attr('gm-create') !== 'true') {
                                _th.css('width', _thJson.th_width);
                            }
                            //?????????????????????
                            if (Settings.supportDrag && typeof _thJson.th_index !== 'undefined') {
                                _domArray[_thJson.th_index] = _th;
                            } else {
                                _domArray[i2] = _th;
                            }
                            //??????????????????
                            if (Settings.supportConfig) {
                                _Base2.default.setAreVisible(_th, typeof _thJson.isShow == 'undefined' ? true : _thJson.isShow, true);
                            }
                        });
                        //??????????????????
                        if (Settings.supportDrag) {
                            table.find('thead tr').html(_domArray);
                        }
                    }
                }
                /*
	  @?????????Th DOM???table data
	  $table: table [jTool object]
	  */
                ,
            setOriginalThDOM: function setOriginalThDOM($table) {
                    var _thList = [];
                    var _thDOM = (0, _jTool2.default)('thead[grid-manager-thead] th', $table);

                    _jTool2.default.each(_thDOM, function(i, v) {
                        _thList.push(v.getAttribute('th-name'));
                    });
                    $table.data('originalThList', _thList);
                }
                /*
	  @?????????Th DOM???table data
	  $table: table [jTool object]
	  */
                ,
            getOriginalThDOM: function getOriginalThDOM($table) {
                    var _thArray = [];
                    var _thList = $table.data('originalThList');

                    _jTool2.default.each(_thList, function(i, v) {
                        _thArray.push((0, _jTool2.default)('thead[grid-manager-thead] th[th-name="' + v + '"]', $table).get(0));
                    });
                    return (0, _jTool2.default)(_thArray);
                }
                /*
                 * @??????????????????
                 * $table:?????????????????????table
                 * */
                ,
            setGridManagerToJTool: function setGridManagerToJTool($table) {
                    $table.data('gridManager', this); // ???????????????????????????call ?????? this??????
                }
                /*
	  @??????gridManager
	  $.table:table [jTool object]
	  */
                ,
            __getGridManager: function __getGridManager($table) {
                var settings = this.getSettings($table);
                var gridManager = $table.data('gridManager');
                // ?????????????????? $table.data('gridManager') ????????? Object
                _jTool2.default.extend(gridManager, settings);
                return gridManager;
            }
        };
        _jTool2.default.extend(Cache, new UserMemory(), new GridData());
        exports.default = Cache;

        /***/
    },
    /* 5 */
    /***/
    function(module, exports, __webpack_require__) {

        'use strict';

        Object.defineProperty(exports, "__esModule", {
            value: true
        });

        var _jTool = __webpack_require__(1);

        var _jTool2 = _interopRequireDefault(_jTool);

        function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

        var Base = {
            /*
	  @????????????
	  type: ????????????[info,warn,error]
	  */
            outLog: function outLog(msg, type) {
                    if (!type) {
                        console.log('GridManager:', msg);
                    } else if (type === 'info') {
                        console.info('GridManager Info: ', msg);
                    } else if (type === 'warn') {
                        console.warn('GridManager Warn: ', msg);
                    } else if (type === 'error') {
                        console.error('GridManager Error: ', msg);
                    }
                    return msg;
                }
                /*
                 * @????????? th ????????? td jTool ??????, ????????????????????????????????? Th
                 * $th: jTool th
                 * */
                ,
            getColTd: function getColTd($th) {
                    var tableWrap = $th.closest('.table-wrap'),
                        thIndex = $th.index(),
                        trList = (0, _jTool2.default)('tbody tr', tableWrap);
                    var tdList = [];
                    var _td = null;
                    _jTool2.default.each(trList, function(i, v) {
                        _td = (0, _jTool2.default)('td', v).get(thIndex);
                        if (_td) {
                            tdList.push(_td);
                        }
                    });
                    return (0, _jTool2.default)(tdList);
                }
                /*
                 * @??????????????????\??????
                 * */
                ,
            initVisible: function initVisible($table) {
                    // ?????????th
                    var _thList = (0, _jTool2.default)('thead th', $table);

                    // tbody??????tr
                    var _trList = (0, _jTool2.default)('tbody tr', $table);
                    var _td = null;
                    _jTool2.default.each(_thList, function(i, v) {
                        v = (0, _jTool2.default)(v);
                        _jTool2.default.each(_trList, function(i2, v2) {
                            _td = (0, _jTool2.default)('td', v2).eq(v.index());
                            _td.attr('td-visible', v.attr('th-visible'));
                        });
                    });
                }
                /*
	  @?????????????????????
	  $._thList_	??? ??????????????????????????????th[jTool object??????????????????]
	  $._visible_: ????????????[Boolean]
	  $.cb		: ????????????
	  */
                ,
            setAreVisible: function setAreVisible(_thList_, _visible_, cb) {
                var _table = void 0,
                    //???????????????table
                    _tableWarp = void 0,
                    //?????????????????????
                    _th = void 0,
                    //???????????????th
                    _trList = void 0,
                    //??????tbody????????????tr
                    _tdList = [],
                    //????????????td
                    _checkLi = void 0,
                    //?????????????????????????????????li
                    _checkbox = void 0; //??????????????????????????????
                _jTool2.default.each(_thList_, function(i, v) {
                    _th = (0, _jTool2.default)(v);
                    _table = _th.closest('table');
                    _tableWarp = _table.closest('.table-wrap');
                    _trList = (0, _jTool2.default)('tbody tr', _table);
                    _checkLi = (0, _jTool2.default)('.config-area li[th-name="' + _th.attr('th-name') + '"]', _tableWarp);
                    _checkbox = _checkLi.find('input[type="checkbox"]');
                    if (_checkbox.length == 0) {
                        return;
                    }
                    _jTool2.default.each(_trList, function(i2, v2) {
                        _tdList.push((0, _jTool2.default)(v2).find('td').get(_th.index()));
                    });
                    //??????
                    if (_visible_) {
                        _th.attr('th-visible', 'visible');
                        _jTool2.default.each(_tdList, function(i2, v2) {
                            // $(v2).show();
                            v2.setAttribute('td-visible', 'visible');
                        });
                        _checkLi.addClass('checked-li');
                        _checkbox.prop('checked', true);
                    }
                    //??????
                    else {
                        _th.attr('th-visible', 'none');
                        _jTool2.default.each(_tdList, function(i2, v2) {
                            // $(v2).hide();
                            v2.setAttribute('td-visible', 'none');
                        });
                        _checkLi.removeClass('checked-li');
                        _checkbox.prop('checked', false);
                    }
                    typeof cb == 'function' ? cb() : '';
                });
            }

            /*
	  @??????TH??????
	  @th: th
	  */
            ,
            getTextWidth: function getTextWidth(th) {
                    var $th = (0, _jTool2.default)(th);
                    var thWarp = (0, _jTool2.default)('.th-wrap', $th); // th??????GridManager????????????
                    var thText = (0, _jTool2.default)('.th-text', $th); // ??????????????????

                    //???????????? ????????????????????????????????????
                    var tableWrap = $th.closest('.table-wrap');
                    var textDreamland = (0, _jTool2.default)('.text-dreamland', tableWrap);

                    //???th???????????????????????? ??????????????????????????????
                    textDreamland.text(thText.text());
                    textDreamland.css({
                        fontSize: thText.css('font-size'),
                        fontWeight: thText.css('font-weight'),
                        fontFamily: thText.css('font-family')
                    });
                    var thPaddingLeft = thWarp.css('padding-left'),
                        thPaddingRight = thWarp.css('padding-right');
                    var thWidth = textDreamland.width() + (thPaddingLeft ? thPaddingLeft : 0) + (thPaddingRight ? thPaddingRight : 0);
                    return thWidth;
                }
                /*
                 * ?????????????????????
                 * @dom
                 * */
                ,
            showLoading: function showLoading(dom, cb) {
                if (!dom || dom.length === 0) {
                    return;
                }
                var loading = dom.find('.load-area');
                if (loading.length > 0) {
                    loading.remove();
                }
                var loadingDom = (0, _jTool2.default)('<div class="load-area loading"><div class="loadInner kernel"></div></div>');
                dom.append(loadingDom);

                //??????loading??????????????????
                var loadInner = dom.find('.load-area').find('.loadInner');
                var domHeight = dom.height(),
                    loadInnerHeight = loadInner.height();
                loadInner.css('margin-top', (domHeight - loadInnerHeight) / 2);
                window.setTimeout(function() {
                    typeof cb === 'function' ? cb() : '';
                }, 100);
            },
            /*
             * ?????????????????????
             * @dom
             * */
            hideLoading: function hideLoading(dom, cb) {
                if (!dom || dom.length === 0) {
                    return;
                }
                window.setTimeout(function() {
                    (0, _jTool2.default)('.load-area', dom).remove();
                    typeof cb === 'function' ? cb() : '';
                }, 500);
            }
        };
        /*
         * Base: ????????????
         * */
        exports.default = Base;

        /***/
    },
    /* 6 */
    /***/
    function(module, exports, __webpack_require__) {

        'use strict';

        Object.defineProperty(exports, "__esModule", {
            value: true
        });

        var _jTool = __webpack_require__(1);

        var _jTool2 = _interopRequireDefault(_jTool);

        var _Base = __webpack_require__(5);

        var _Base2 = _interopRequireDefault(_Base);

        var _Core = __webpack_require__(7);

        var _Core2 = _interopRequireDefault(_Core);

        var _Cache = __webpack_require__(4);

        var _Cache2 = _interopRequireDefault(_Cache);

        var _I18n = __webpack_require__(9);

        var _I18n2 = _interopRequireDefault(_I18n);

        function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

        var AjaxPage = {
            html: function html($table) {
                    var html = '<div class="page-toolbar">\n\t\t\t\t\t\t<div class="refresh-action"><i class="iconfont icon-shuaxin"></i></div>\n\t\t\t\t\t\t<div class="goto-page">\n\t\t\t\t\t\t\t' + _I18n2.default.i18nText($table, "goto-first-text") + '\n\t\t\t\t\t\t\t<input type="text" class="gp-input"/>\n\t\t\t\t\t\t\t' + _I18n2.default.i18nText($table, "goto-last-text") + '\n\t\t\t\t\t\t</div>\n\t\t\t\t\t\t<div class="change-size"><select name="pSizeArea"></select></div>\n\t\t\t\t\t\t<div class="dataTables_info"></div>\n\t\t\t\t\t\t<div class="ajax-page"><ul class="pagination"></ul></div>\n\t\t\t\t\t</div>';
                    return html;
                }
                /**
                 * ???????????????
                 * @param $table???[jTool object]
                 */
                ,
            initAjaxPage: function initAjaxPage($table) {
                    var Settings = _Cache2.default.getSettings($table);
                    var _this = this;
                    var tableWarp = $table.closest('.table-wrap'),
                        pageToolbar = (0, _jTool2.default)('.page-toolbar', tableWarp); //???????????????
                    var sizeData = Settings.sizeData;
                    pageToolbar.hide();
                    //?????????????????????????????????
                    _this.createPageSizeDOM($table, sizeData);

                    //????????????????????????
                    _this.bindPageJumpEvent($table);

                    //????????????????????????????????????
                    _this.bindSetPageSizeEvent($table);
                }
                /**
                 * ????????????DOM??????
                 * @param $table [jTool object]
                 * @param pageData  ??????????????????
                 */
                ,
            createPaginationDOM: function createPaginationDOM($table, pageData) {
                    var tableWarp = $table.closest('.table-wrap'),
                        pageToolbar = (0, _jTool2.default)('.page-toolbar', tableWarp),
                        //???????????????
                        pagination = (0, _jTool2.default)('.pagination', pageToolbar); //????????????
                    pagination.html(this.joinPagination($table, pageData));
                }
                /*
                 * ?????????????????????
                 * @param $table: [table jTool object]
                 * @param cPage: ????????????
                 * @param pageData  ??????????????????
                 * */
                ,
            joinPagination: function joinPagination($table, pageData) {
                    var cPage = Number(pageData.cPage || 0),
                        //?????????
                        tPage = Number(pageData.tPage || 0),
                        //?????????
                        tHtml = '',
                        //??????????????????HTML??????
                        lHtml = ''; //????????????????????????THML??????
                    //????????????
                    var firstClassName = 'first-page',
                        previousClassName = 'previous-page';
                    if (cPage == 1) {
                        firstClassName += ' disabled';
                        previousClassName += ' disabled';
                    }
                    tHtml += '<li c-page="1" class="' + firstClassName + '">\n\t\t\t\t\t' + _I18n2.default.i18nText($table, "first-page") + '\n\t\t\t\t</li>\n\t\t\t\t<li c-page="' + (cPage - 1) + '" class="' + previousClassName + '">\n\t\t\t\t\t' + _I18n2.default.i18nText($table, "previous-page") + '\n\t\t\t\t</li>';
                    // ???????????????
                    var i = 1;
                    // ???????????????
                    var maxI = tPage;

                    //??????first????????????
                    if (cPage > 4) {
                        tHtml += '<li c-page="1">\n\t\t\t\t\t\t1\n\t\t\t\t\t</li>\n\t\t\t\t\t<li class="disabled">\n\t\t\t\t\t\t...\n\t\t\t\t\t</li>';
                        i = cPage - 2;
                    }
                    //??????last????????????
                    if (tPage - cPage > 4) {
                        maxI = cPage + 2;
                        lHtml += '<li class="disabled">\n\t\t\t\t\t\t...\n\t\t\t\t\t</li>\n\t\t\t\t\t<li c-page="' + tPage + '">\n\t\t\t\t\t\t' + tPage + '\n\t\t\t\t\t</li>';
                    }
                    // ????????????
                    for (i; i <= maxI; i++) {
                        if (i == cPage) {
                            tHtml += '<li class="active">\n\t\t\t\t\t\t\t' + cPage + '\n\t\t\t\t\t\t</li>';
                            continue;
                        }
                        tHtml += '<li c-page="' + i + '">\n\t\t\t\t\t\t' + i + '\n\t\t\t\t\t</li>';
                    }
                    tHtml += lHtml;
                    //????????????????????????
                    var nextClassName = 'next-page',
                        lastClassName = 'last-page';
                    if (cPage >= tPage) {
                        nextClassName += ' disabled';
                        lastClassName += ' disabled';
                    }
                    tHtml += '<li c-page="' + (cPage + 1) + '" class="' + nextClassName + '">\n\t\t\t\t\t' + _I18n2.default.i18nText($table, "next-page") + '\n\t\t\t\t</li>\n\t\t\t\t<li c-page="' + tPage + '" class="' + lastClassName + '">\n\t\t\t\t\t' + _I18n2.default.i18nText($table, "last-page") + '\n\t\t\t\t</li>';
                    return tHtml;
                }
                /**
                 * ????????????????????????????????????
                 * @param $table: [table jTool object]
                 * @param _sizeData: _????????????????????????
                 */
                ,
            createPageSizeDOM: function createPageSizeDOM($table, _sizeData_) {
                    var tableWarp = $table.closest('.table-wrap'),
                        pageToolbar = (0, _jTool2.default)('.page-toolbar', tableWarp),
                        //???????????????
                        pSizeArea = (0, _jTool2.default)('select[name="pSizeArea"]', pageToolbar); //????????????
                    //error
                    if (!_sizeData_ || _sizeData_.length === 0) {
                        _Base2.default.outLog('?????????????????????[sizeData]????????????', 'error');
                        return;
                    }

                    var _ajaxPageHtml = '';
                    _jTool2.default.each(_sizeData_, function(i, v) {
                        _ajaxPageHtml += '<option value="' + v + '">\n\t\t\t\t\t\t\t\t' + v + '\n\t\t\t\t\t\t\t</option>';
                    });
                    pSizeArea.html(_ajaxPageHtml);
                }
                /**
                 * ????????????????????????
                 * @param $table: [table jTool object]
                 */
                ,
            bindPageJumpEvent: function bindPageJumpEvent($table) {
                var _this = this;
                var tableWarp = $table.closest('.table-wrap'),
                    pageToolbar = (0, _jTool2.default)('.page-toolbar', tableWarp),
                    //???????????????
                    pagination = (0, _jTool2.default)('.pagination', pageToolbar),
                    //????????????
                    gp_input = (0, _jTool2.default)('.gp-input', pageToolbar),
                    //????????????
                    refreshAction = (0, _jTool2.default)('.refresh-action', pageToolbar); //????????????
                //????????????????????????
                pageToolbar.off('click', 'li');
                pageToolbar.on('click', 'li', function() {
                    var pageAction = (0, _jTool2.default)(this);
                    var cPage = pageAction.attr('c-page'); //????????????
                    if (!cPage || !Number(cPage) || pageAction.hasClass('disabled')) {
                        _Base2.default.outLog('????????????????????????,??????????????????:1??????????????????????????????????????????; 2???????????????????????????', 'info');
                        return false;
                    }
                    cPage = parseInt(cPage);
                    _this.gotoPage($table, cPage);
                });
                //????????????????????????
                gp_input.unbind('keyup');
                gp_input.bind('keyup', function(e) {
                    if (e.which !== 13) {
                        return;
                    }
                    var _inputValue = parseInt(this.value, 10);
                    if (!_inputValue) {
                        this.focus();
                        return;
                    }
                    _this.gotoPage($table, _inputValue);
                    this.value = '';
                });
                //????????????????????????
                refreshAction.unbind('click');
                refreshAction.bind('click', function() {
                    var _tableWarp = (0, _jTool2.default)(this).closest('.table-wrap'),
                        _table = (0, _jTool2.default)('table[grid-manager]', _tableWarp),
                        _input = (0, _jTool2.default)('.page-toolbar .gp-input', _tableWarp),
                        _value = _input.val();
                    //????????????????????????: ???????????????
                    if (_value.trim() === '') {
                        _Core2.default.__refreshGrid(_table);
                        return;
                    }
                    //???????????????????????????: ???????????????????????????,??????????????????????????????,????????????????????????????????????
                    var _inputValue = parseInt(_input.val(), 10);
                    if (!_inputValue) {
                        _input.focus();
                        return;
                    }
                    _this.gotoPage($table, _inputValue);
                    _input.val('');
                });
            }

            /**
             * ??????????????????
             * @param $table: [table jTool object]
             * @param _cPage: ?????????
             */
            ,
            gotoPage: function gotoPage($table, _cPage) {
                var settings = _Cache2.default.getSettings($table);
                //?????????????????????????????????
                if (_cPage > settings.pageData.tPage) {
                    _cPage = settings.pageData.tPage;
                }
                //?????????????????????
                settings.pageData.cPage = _cPage;
                settings.pageData.pSize = settings.pageData.pSize || settings.pageSize;
                // ????????????
                _Cache2.default.updateSettings($table, settings);

                //?????????????????????DOM
                var query = _jTool2.default.extend({}, settings.query, settings.sortData, settings.pageData);
                settings.pagingBefore(query);
                _Core2.default.__refreshGrid($table, function() {
                    settings.pagingAfter(query);
                });
            }

            /**
             * ????????????????????????????????????
             * @param $table: [table jTool object]
             * @returns {boolean}
             */
            ,
            bindSetPageSizeEvent: function bindSetPageSizeEvent($table) {
                var tableWarp = $table.closest('.table-wrap'),
                    pageToolbar = (0, _jTool2.default)('.page-toolbar', tableWarp),
                    //???????????????
                    sizeArea = (0, _jTool2.default)('select[name=pSizeArea]', pageToolbar); //??????????????????
                if (!sizeArea || sizeArea.length == 0) {
                    _Base2.default.outLog('????????????????????????????????????????????????????????????', 'info');
                    return false;
                }
                sizeArea.unbind('change');
                sizeArea.bind('change', function() {
                    var _size = (0, _jTool2.default)(this);
                    var _tableWarp = _size.closest('.table-wrap'),
                        _table = (0, _jTool2.default)('table[grid-manager]', _tableWarp);
                    var settings = _Cache2.default.getSettings($table);
                    settings.pageData = {
                        cPage: 1,
                        pSize: parseInt(_size.val())
                    };

                    _Cache2.default.saveUserMemory(_table);
                    // ????????????
                    _Cache2.default.updateSettings($table, settings);
                    //?????????????????????tbody
                    var query = _jTool2.default.extend({}, settings.query, settings.sortData, settings.pageData);
                    settings.pagingBefore(query);
                    _Core2.default.__refreshGrid(_table, function() {
                        settings.pagingAfter(query);
                    });
                });
            }

            /**
             * ????????????????????????, ???????????????????????? [???: ??????????????????????????????, ?????????Cache ??????]
             * @param $table: [table jTool object]
             * @param _pageData_: ??????????????????
             * @returns {boolean}
             */
            ,
            resetPSize: function resetPSize($table, _pageData_) {
                    var tableWarp = $table.closest('.table-wrap'),
                        toolBar = (0, _jTool2.default)('.page-toolbar', tableWarp),
                        pSizeArea = (0, _jTool2.default)('select[name="pSizeArea"]', toolBar),
                        pSizeInfo = (0, _jTool2.default)('.dataTables_info', toolBar);
                    if (!pSizeArea || pSizeArea.length == 0) {
                        _Base2.default.outLog('???????????????????????????????????????????????????', 'info');
                        return false;
                    }
                    var fromNum = _pageData_.cPage == 1 ? 1 : (_pageData_.cPage - 1) * _pageData_.pSize + 1,
                        //???????????????
                        toNum = _pageData_.cPage * _pageData_.pSize,
                        //???????????????
                        totalNum = _pageData_.tSize; //????????????
                    var tmpHtml = _I18n2.default.i18nText($table, 'dataTablesInfo', [fromNum, toNum, totalNum]);
                    //??????????????????????????????????????????
                    pSizeArea.val(_pageData_.pSize || 10);

                    //????????????????????????
                    pSizeInfo.html(tmpHtml);
                    pSizeArea.show();
                }
                /**
                 * ??????????????????
                 * @param $table: [table jTool object]
                 * @param totals: ?????????
                 */
                ,
            resetPageData: function resetPageData($table, totals) {
                    var settings = _Cache2.default.getSettings($table);
                    var _this = this;
                    if (isNaN(parseInt(totals, 10))) {
                        return;
                    }
                    var _pageData = getPageData(totals);
                    // ????????????DOM??????
                    _this.createPaginationDOM($table, _pageData);

                    // ???????????????????????????
                    _this.resetPSize($table, _pageData);

                    // ??????Cache
                    _Cache2.default.updateSettings($table, _jTool2.default.extend(true, settings, { pageData: _pageData }));

                    var tableWarp = $table.closest('.table-wrap');
                    //???????????????
                    var pageToolbar = (0, _jTool2.default)('.page-toolbar', tableWarp);
                    pageToolbar.show();

                    // ??????????????????
                    function getPageData(tSize) {
                        var _pSize = settings.pageData.pSize || settings.pageSize,
                            _tSize = tSize,
                            _cPage = settings.pageData.cPage || 1;
                        return {
                            tPage: Math.ceil(_tSize / _pSize), // ?????????
                            cPage: _cPage, // ?????????
                            pSize: _pSize, // ??????????????????
                            tSize: _tSize // ?????????
                        };
                    }
                }
                /**
                 * ????????????????????????????????????
                 * @param $table: [table jTool object]
                 */
                ,
            configPageForCache: function configPageForCache($table) {
                var settings = _Cache2.default.getSettings($table);
                var _data = _Cache2.default.getUserMemory($table);
                // ????????????
                var _cache = _data.cache;
                // ??????????????????
                var _pSize = null;

                // ????????????????????????????????????????????????
                if (!_cache || !_cache.page || !_cache.page.pSize) {
                    _pSize = settings.pageSize || 10.;
                } else {
                    _pSize = _cache.page.pSize;
                }
                var pageData = {
                    pSize: _pSize,
                    cPage: 1
                };
                _jTool2.default.extend(settings, { pageData: pageData });
                _Cache2.default.updateSettings($table, settings);
            }
        };
        /*
         * AjaxPage: ??????
         * */
        exports.default = AjaxPage;

        /***/
    },
    /* 7 */
    /***/
    function(module, exports, __webpack_require__) {

        'use strict';

        Object.defineProperty(exports, "__esModule", {
            value: true
        });

        var _jTool = __webpack_require__(1);

        var _jTool2 = _interopRequireDefault(_jTool);

        var _Menu = __webpack_require__(8);


        var _Adjust = __webpack_require__(3);

        var _Adjust2 = _interopRequireDefault(_Adjust);

        var _AjaxPage = __webpack_require__(6);

        var _AjaxPage2 = _interopRequireDefault(_AjaxPage);

        var _Cache = __webpack_require__(4);

        var _Cache2 = _interopRequireDefault(_Cache);

        var _Config = __webpack_require__(11);

        var _Config2 = _interopRequireDefault(_Config);

        var _Checkbox = __webpack_require__(12);

        var _Checkbox2 = _interopRequireDefault(_Checkbox);

        var _Base = __webpack_require__(5);

        var _Base2 = _interopRequireDefault(_Base);

        var _Export = __webpack_require__(10);

        var _Export2 = _interopRequireDefault(_Export);

        var _Order = __webpack_require__(13);

        var _Order2 = _interopRequireDefault(_Order);

        var _Remind = __webpack_require__(14);

        var _Remind2 = _interopRequireDefault(_Remind);

        var _Sort = __webpack_require__(15);

        var _Sort2 = _interopRequireDefault(_Sort);

        function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

        /*
         * Core: ????????????
         * 1.??????
         * 2.??????GM DOM
         * 3.??????tbody
         * */
        var Core = {
            /*
	  @???????????? ????????????????????????????????????????????????????????????????????????
	  $.callback: ????????????
	  */
            __refreshGrid: function __refreshGrid($table, callback) {
                    var settings = _Cache2.default.getSettings($table);
                    var tbodyDOM = (0, _jTool2.default)('tbody', $table),
                        //tbody dom
                        gmName = $table.attr('grid-manager'),
                        tableWrap = $table.closest('.table-wrap'),
                        refreshAction = (0, _jTool2.default)('.page-toolbar .refresh-action', tableWrap); //????????????
                    //?????????????????????
                    refreshAction.addClass('refreshing');
                    /*
	   ??????????????????
	   ????????????????????????ajax_data,???????????????ajax_rul??????????????????
	   ???ajax_beforeSend???ajax_error???ajax_complete??????????????????ajax_success????????????
	   */
                    if (settings.ajax_data) {
                        if (settings.supportSorting) {

                            var cacheSortData = JSON.parse(localStorage.getItem("dolphindb_gridsorting"));//LINL:20171127
                            
                            if (cacheSortData) {
                                settings.sortData = cacheSortData;
                            }
                            var sortKey = Object.keys(settings.sortData)[0];
                            var sortAsc = settings.sortUpText === settings.sortData[sortKey];
                            var sortColumn = settings.columnData.filter(function(d) { return d.key === sortKey; })[0];
                            var sortFilter = sortColumn && sortColumn.sortFilter;
                            if (typeof sortKey !== 'undefined') {
                                settings.ajax_data.data.sort(function(d1, d2) {
                                    if (typeof sortFilter !== 'undefined') {
                                        d1 = sortFilter(d1[sortKey]);
                                        d2 = sortFilter(d2[sortKey]);
                                    } else {
                                        d1 = d1[sortKey];
                                        d2 = d2[sortKey];
                                    }
                                    if (d1 === d2) return 0;
                                    var res = d1 > d2 ? 1 : -1;
                                    return sortAsc ? res : -res;
                                })
                            }
                        }
                        driveDomForSuccessAfter(settings.ajax_data);
                        settings.ajax_success(settings.ajax_data);
                        removeRefreshingClass();
                        typeof callback === 'function' ? callback() : '';
                        return;
                    }
                    if (typeof settings.ajax_url != 'string' || settings.ajax_url === '') {
                        settings.outLog('?????????????????????????????????[ajax_url]????????????', 'error');
                        removeRefreshingClass();
                        typeof callback === 'function' ? callback() : '';
                        return;
                    }
                    var pram = _jTool2.default.extend(true, {}, settings.query);
                    //??????????????????????????????
                    if (settings.supportAjaxPage) {
                        _jTool2.default.extend(pram, settings.pageData);
                    }
                    //??????????????????????????????
                    if (settings.supportSorting) {
                        _jTool2.default.each(settings.sortData, function(key, value) {
                            pram['sort_' + key] = value; // ??????sort_??????,?????????????????????????????????
                        });
                        // $.extend(pram, settings.sortData);
                    }
                    //???????????????1???, ?????????1
                    if (pram.cPage < 1) {
                        pram.cPage = 1;
                        //???????????????????????????, ??????????????????
                    } else if (pram.cPage > pram.tPage) {
                        pram.cPage = pram.tPage;
                    }
                    // settings.query = pram;
                    _Cache2.default.updateSettings($table, settings);

                    _Base2.default.showLoading(tableWrap);

                    // ?????????POST?????? ??? Content-Type ??????????????????, ???????????? application/x-www-form-urlencoded
                    // ??????|??????:
                    // 1. Content-Type = application/x-www-form-urlencoded ?????????????????? form data
                    // 2. Content-Type = text/plain;charset=UTF-8 ?????????????????? request payload
                    if (settings.ajax_type.toUpperCase() === 'POST' && !settings.ajax_headers['Content-Type']) {
                        settings.ajax_headers['Content-Type'] = 'application/x-www-form-urlencoded';
                    }
                    //??????ajax
                    _jTool2.default.ajax({
                        url: settings.ajax_url,
                        type: settings.ajax_type,
                        data: pram,
                        headers: settings.ajax_headers,
                        cache: true,
                        beforeSend: function beforeSend(XMLHttpRequest) {
                            settings.ajax_beforeSend(XMLHttpRequest);
                        },
                        success: function success(response) {
                            driveDomForSuccessAfter(response);
                            settings.ajax_success(response);
                        },
                        error: function error(XMLHttpRequest, textStatus, errorThrown) {
                            settings.ajax_error(XMLHttpRequest, textStatus, errorThrown);
                        },
                        complete: function complete(XMLHttpRequest, textStatus) {
                            settings.ajax_complete(XMLHttpRequest, textStatus);
                            removeRefreshingClass();
                            _Base2.default.hideLoading(tableWrap);
                        }
                    });
                    //?????????????????????
                    function removeRefreshingClass() {
                        window.setTimeout(function() {
                            refreshAction.removeClass('refreshing');
                        }, 2000);
                    }
                    //??????ajax?????????????????????DOM
                    function driveDomForSuccessAfter(response) {
                        if (!response) {
                            _Base2.default.outLog('??????????????????????????????????????????[ajax_url???ajax_data]??????????????????????????????????????????????????????????????????????????????', 'error');
                            return;
                        }

                        var tbodyTmpHTML = ''; //????????????tbody???HTML??????
                        var parseRes = typeof response === 'string' ? JSON.parse(response) : response;
                        var _data = parseRes[settings.dataKey];
                        var key = void 0,
                            //????????????
                            alignAttr = void 0,
                            //??????????????????
                            template = void 0,
                            //????????????
                            templateHTML = void 0; //?????????????????????html
                        //???????????????
                        if (!_data || _data.length === 0) {
                            tbodyTmpHTML = '<tr emptyTemplate>' + '<td colspan="' + (0, _jTool2.default)('th[th-visible="visible"]', $table).length + '">' + (settings.emptyTemplate || '<div class="gm-emptyTemplate">????????????</div>') + '</td>' + '</tr>';
                            parseRes.totals = 0;
                            tbodyDOM.html(tbodyTmpHTML);
                        } else {
                            _jTool2.default.each(_data, function(i, v) {
                                _Cache2.default.setRowData(gmName, i, v);
                                tbodyTmpHTML += '<tr cache-key="' + i + '">';
                                _jTool2.default.each(settings.columnData, function(i2, v2) {
                                    key = v2.key;
                                    template = v2.template;
                                    templateHTML = typeof template === 'function' ? template(v[key], v) : v[key];
                                    alignAttr = v2.align ? 'align="' + v2.align + '"' : '';
                                    tbodyTmpHTML += '<td gm-create="false" ' + alignAttr + '>' + templateHTML + '</td>';
                                });
                                tbodyTmpHTML += '</tr>';
                            });
                            tbodyDOM.html(tbodyTmpHTML);
                            Core.resetTd($table, false);
                        }
                        //????????????
                        if (settings.supportAjaxPage) {
                            _AjaxPage2.default.resetPageData($table, parseRes[settings.totalsKey]);
                            _Menu2.default.checkMenuPageAction($table);
                        }
                        typeof callback === 'function' ? callback() : '';
                    }
                }
                /*
                 * ??????HTML???????????????????????????????????????DOM
                 * $table: table[jTool??????]
                 * */
                ,
            createDOM: function createDOM($table) {
                    var settings = _Cache2.default.getSettings($table);
                    $table.attr('width', '100%').attr('cellspacing', 1).attr('cellpadding', 0).attr('grid-manager', settings.gridManagerName);
                    var theadHtml = '<thead grid-manager-thead>',
                        tbodyHtml = '<tbody></tbody>',
                        alignAttr = '',
                        //??????????????????
                        widthHtml = '',
                        //???????????????html??????
                        remindHtml = '',
                        //???????????????html??????
                        sortingHtml = ''; //???????????????html??????
                    // ???????????????[columnData]??????thead
                    _jTool2.default.each(settings.columnData, function(i, v) {
                        // ????????????
                        // if (settings.supportRemind && typeof v.remind === 'string' && v.remind !== '') {
                        //     remindHtml = 'remind="' + v.remind + '"';
                        // }
                        remindHtml = 'title="' + v.remind + '"'; //LINL: simple tip
                        // ??????
                        sortingHtml = '';
                        if (settings.supportSorting && typeof v.sorting === 'string') {
                            if (v.sorting === settings.sortDownText) {
                                sortingHtml = 'sorting="' + settings.sortDownText + '"';
                                settings.sortData[v.key] = settings.sortDownText;
                                _Cache2.default.updateSettings($table, settings);
                            } else if (v.sorting === settings.sortUpText) {
                                sortingHtml = 'sorting="' + settings.sortUpText + '"';
                                settings.sortData[v.key] = settings.sortUpText;
                                _Cache2.default.updateSettings($table, settings);
                            } else {
                                sortingHtml = 'sorting=""';
                            }
                            //sortingHtml += ' class="sorting-action"';
                        }
                        if (v.width) {
                            widthHtml = 'width="' + v.width + '"';
                        } else {
                            widthHtml = '';
                        }
                        alignAttr = v.align ? 'align="' + v.align + '"' : '';
                        theadHtml += '<th gm-create="false" th-name="' + v.key + '" ' + remindHtml + ' ' + sortingHtml + ' ' + widthHtml + ' ' + alignAttr + '>' + v.text + '</th>';
                    });
                    theadHtml += '</thead>';
                    $table.html(theadHtml + tbodyHtml);
                    // ????????????DOM
                    if (settings.supportAutoOrder) {
                        _Order2.default.initDOM($table);
                    }
                    //??????????????????DOM
                    if (settings.supportCheckbox) {
                        _Checkbox2.default.initCheckbox($table);
                    }
                    // ????????????th DOM
                    _Cache2.default.setOriginalThDOM($table);

                    // ????????????HTML
                    var _remindHtml = _Remind2.default.html();

                    // ????????????HTML
                    var _configHtml = _Config2.default.html();

                    // ????????????HTML
                    var _adjustHtml = _Adjust2.default.html();

                    // ??????HTML
                    var _sortingHtml = _Sort2.default.html();

                    // ????????????????????????????????????DOM
                    var exportActionHtml = _Export2.default.html();
                    // AJAX??????HTML
                    var _ajaxPageHtml = _AjaxPage2.default.html($table);
                    var wrapHtml = void 0,
                        //?????????html??????
                        tableWarp = void 0,
                        //??????table?????????DIV??????
                        onlyThead = void 0,
                        //??????table??????thead
                        onlyThList = void 0,
                        //??????table??????TH
                        onlyTH = void 0,
                        //??????TH
                        onlyThWarp = void 0,
                        //??????TH????????????DIV
                        remindDOM = void 0,
                        //????????????DOM
                        adjustDOM = void 0,
                        //????????????DOM
                        sortingDom = void 0,
                        //??????DOM
                        sortType = void 0,
                        //????????????
                        isLmOrder = void 0,
                        //???????????????????????????????????????
                        isLmCheckbox = void 0; //???????????????????????????????????????

                    onlyThead = (0, _jTool2.default)('thead', $table);
                    onlyThList = (0, _jTool2.default)('th', onlyThead);
                    wrapHtml = '<div class="table-wrap"><div class="table-div" style="height:calc(' + settings.height + ' - 40px)"></div><span class="text-dreamland"></span></div>';
                    $table.wrap(wrapHtml);
                    tableWarp = $table.closest('.table-wrap');
                    // ????????????????????????
                    if (settings.textAlign) {
                        tableWarp.attr('gm-text-align', settings.textAlign);
                    }
                    // ??????????????????DOM
                    if (settings.supportConfig) {
                        tableWarp.append(_configHtml);
                    }
                    // ??????Ajax??????DOM
                    if (settings.supportAjaxPage) {
                        tableWarp.append(_ajaxPageHtml);
                        _AjaxPage2.default.initAjaxPage($table);
                    }
                    // ?????????????????????????????????
                    if (settings.supportExport) {
                        tableWarp.append(exportActionHtml);
                    }
                    _jTool2.default.each(onlyThList, function(i2, v2) {
                        onlyTH = (0, _jTool2.default)(v2);
                        onlyTH.attr('th-visible', 'visible');
                        // ?????????????????????????????????
                        if (settings.supportAutoOrder && onlyTH.attr('gm-order') === 'true') {
                            isLmOrder = true;
                        } else {
                            isLmOrder = false;
                        }

                        // ?????????????????????????????????
                        if (settings.supportCheckbox && onlyTH.attr('gm-checkbox') === 'true') {
                            isLmCheckbox = true;
                        } else {
                            isLmCheckbox = false;
                        }

                        onlyThWarp = (0, _jTool2.default)('<div class="th-wrap"></div>');
                        //?????????????????????
                        if (settings.supportConfig) {
                            var remind = "";
                            if (onlyTH.attr("title")) {
                                remind = onlyTH.attr("title");
                            }
                            if (onlyTH.attr('th-name') != "gm_checkbox") {
                                (0, _jTool2.default)('.config-list', tableWarp).append('<li th-name="' + onlyTH.attr('th-name') + '" class="checked-li">' + '<input type="checkbox" checked="checked"/>' + '<label>' + '<span class="fake-checkbox"></span>' + onlyTH.text().replace('\n', '').replace('\t', '') + '<span class="remind-label">' + remind + '</span></label>' + '</li>');
                            }
                            
                        }
                        // ?????????????????????
                        // ?????????????????????????????????????????????????????????
                        if (settings.supportDrag && !isLmOrder && !isLmCheckbox) {
                            onlyThWarp.html('<span class="th-text drag-action" draggable="true">' + onlyTH.html() + '</span>');
                        } else {
                            onlyThWarp.html('<span class="th-text">' + onlyTH.html() + '</span>');
                        }
                        var onlyThWarpPaddingTop = onlyThWarp.css('padding-top');
                        // ???????????????????????????
                        // ?????????????????????????????????????????????????????????
                        if (settings.supportRemind && onlyTH.attr('remind') != undefined && !isLmOrder && !isLmCheckbox) {
                            remindDOM = (0, _jTool2.default)(_remindHtml);
                            remindDOM.find('.ra-title').text(onlyTH.text());
                            remindDOM.find('.ra-con').text(onlyTH.attr('remind') || onlyTH.text());
                            if (onlyThWarpPaddingTop != '' && onlyThWarpPaddingTop != '0px') {
                                remindDOM.css('top', onlyThWarpPaddingTop);
                            }
                            onlyThWarp.append(remindDOM);
                        }
                        // ?????????????????????
                        // ?????????????????????????????????????????????????????????
                        sortType = onlyTH.attr('sorting');
                        if (settings.supportSorting && sortType != undefined && !isLmOrder && !isLmCheckbox) {
                            sortingDom = (0, _jTool2.default)(_sortingHtml);
                            // ?????? sortType ??????????????????
                            switch (sortType) {
                                case settings.sortUpText:
                                    sortingDom.addClass('sorting-up');
                                    break;
                                case settings.sortDownText:
                                    sortingDom.addClass('sorting-down');
                                    break;
                                default:
                                    break;
                            }
                            if (onlyThWarpPaddingTop != '' && onlyThWarpPaddingTop != '0px') {
                                sortingDom.css('top', onlyThWarpPaddingTop);
                            }
                            onlyThWarp.append(sortingDom);
                        }
                        // ???????????????????????????,????????????????????????????????????????????????
                        if (settings.supportAdjust && !isLmOrder && !isLmCheckbox) {
                            adjustDOM = (0, _jTool2.default)(_adjustHtml);
                            // ?????????????????????????????????
                            if (i2 == onlyThList.length - 1) {
                                adjustDOM.hide();
                            }
                            onlyThWarp.append(adjustDOM);
                        }
                        onlyTH.html(onlyThWarp);
                        // ??????th?????????width???????????????????????????????????????????????????
                        // ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????getTextWidth??????????????????
                        var thWidthForConfig = onlyTH.attr('width');
                        // ????????????: GM???????????????????????????
                        if (isLmOrder || isLmCheckbox) {
                            onlyTH.width(50);
                        }
                        // ????????????: ???GM??????????????????
                        else {
                            var _minWidth = _Base2.default.getTextWidth(onlyTH); // ??????th???????????????????????????????????????
                            // ?????????????????????????????????
                            if (thWidthForConfig && thWidthForConfig !== '') {
                                onlyTH.width(thWidthForConfig > _minWidth ? thWidthForConfig : _minWidth);
                                onlyTH.removeAttr('width');
                            }
                            // ????????????????????????????????????
                            else {
                                // ??????width ??????auto??????
                                var _oldWidth = onlyTH.width();
                                onlyTH.width(_oldWidth > _minWidth ? _oldWidth : _minWidth);
                            }
                        }
                    });
                    //????????????????????????????????????????????????
                    $table.removeClass('GridManager-loading');
                    $table.addClass('GridManager-ready');
                }
                /*
                 * ????????????, ??????????????????????????????????????????td??????
                 * dom: table ?????? tr
                 * isSingleRow: ??????DOM???????????????tr[?????????]
                 * */
                ,
            resetTd: function resetTd(dom, isSingleRow) {
                var _table = null,
                    _tr = null;
                if (isSingleRow) {
                    _tr = (0, _jTool2.default)(dom);
                    _table = _tr.closest('table');
                } else {
                    _table = (0, _jTool2.default)(dom);
                    _tr = _table.find('tbody tr');
                }
                if (!_tr || _tr.length == 0) {
                    return false;
                }
                var settings = _Cache2.default.getSettings(_table);
                //??????????????????
                if (settings.supportAutoOrder) {
                    var _pageData = settings.pageData;
                    var onlyOrderTd = null,
                        _orderBaseNumber = 1,
                        _orderText = void 0;
                    //??????????????????????????????
                    if (_pageData && _pageData['pSize'] && _pageData['cPage']) {
                        _orderBaseNumber = _pageData.pSize * (_pageData.cPage - 1) + 1;
                    }
                    _jTool2.default.each(_tr, function(i, v) {
                        _orderText = _orderBaseNumber + i;
                        onlyOrderTd = (0, _jTool2.default)('td[gm-order="true"]', v);
                        if (onlyOrderTd.length == 0) {
                            (0, _jTool2.default)(v).prepend('<td gm-order="true" gm-create="true">' + _orderText + '</td>');
                        } else {
                            onlyOrderTd.text(_orderText);
                        }
                    });
                }
                //?????????????????? checkbox
                if (settings.supportCheckbox) {
                    var onlyCheckTd = null;
                    _jTool2.default.each(_tr, function(i, v) {
                        onlyCheckTd = (0, _jTool2.default)('td[gm-checkbox="true"]', v);
                        if (onlyCheckTd.length == 0) {
                            (0, _jTool2.default)(v).prepend('<td gm-checkbox="true" gm-create="true"><input type="checkbox"/></td>');
                        } else {
                            (0, _jTool2.default)('[type="checkbox"]', onlyCheckTd).prop('checked', false);
                        }
                    });
                }
                //????????????????????????td??????
                if (settings.supportDrag) {
                    var _thCacheList = _Cache2.default.getOriginalThDOM(_table);
                    var _td = null;
                    if (!_thCacheList || _thCacheList.length == 0) {
                        _Base2.default.outLog('resetTdForCache:??????????????????????????????TH DOM????????????', 'error');
                        return false;
                    }
                    var _tdArray = [];
                    _jTool2.default.each(_tr, function(i, v) {
                        _tdArray = [];
                        _td = (0, _jTool2.default)('td', v);
                        _jTool2.default.each(_td, function(i2, v2) {
                            _tdArray[_thCacheList.eq(i2).index()] = v2.outerHTML;
                        });
                        v.innerHTML = _tdArray.join('');
                    });
                }
                //??????????????????????????????????????????
                if (settings.supportConfig) {
                    _Base2.default.initVisible(_table);
                }
            }
        };
        exports.default = Core;

        /***/
    },
    /* 8 */
    /***/
    function(module, exports, __webpack_require__) {

        'use strict';

        Object.defineProperty(exports, "__esModule", {
            value: true
        });

        var _jTool = __webpack_require__(1);

        var _jTool2 = _interopRequireDefault(_jTool);

        var _Cache = __webpack_require__(4);

        var _Cache2 = _interopRequireDefault(_Cache);

        var _I18n = __webpack_require__(9);

        var _I18n2 = _interopRequireDefault(_I18n);

        var _Export = __webpack_require__(10);

        var _Export2 = _interopRequireDefault(_Export);

        var _AjaxPage = __webpack_require__(6);

        var _AjaxPage2 = _interopRequireDefault(_AjaxPage);

        function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

        var Menu = {
            /*
	  @??????????????????: ???????????????????????????
	  */
            checkMenuPageAction: function checkMenuPageAction(table) {
                    var Settings = _Cache2.default.getSettings(table);
                    //??????????????????????????????
                    var gridMenu = (0, _jTool2.default)('.grid-menu[grid-master="' + Settings.gridManagerName + '"]');
                    if (!gridMenu || gridMenu.length === 0) {
                        return;
                    }
                    var previousPage = (0, _jTool2.default)('[refresh-type="previous"]', gridMenu),
                        nextPage = (0, _jTool2.default)('[refresh-type="next"]', gridMenu);
                    if (Settings.pageData.cPage === 1 || Settings.pageData.tPage === 0) {
                        previousPage.addClass('disabled');
                    } else {
                        previousPage.removeClass('disabled');
                    }
                    if (Settings.pageData.cPage === Settings.pageData.tPage || Settings.pageData.tPage === 0) {
                        nextPage.addClass('disabled');
                    } else {
                        nextPage.removeClass('disabled');
                    }
                }
                /*
	  @????????????????????????
	   $table: table[jTool Object]
	  */
                ,
            bindRightMenuEvent: function bindRightMenuEvent($table) {
                var Settings = _Cache2.default.getSettings($table);
                var tableWarp = $table.closest('.table-wrap'),
                    tbody = (0, _jTool2.default)('tbody', tableWarp);
                //??????????????????
                var menuHTML = '<div class="grid-menu" grid-master="' + Settings.gridManagerName + '">';
                //???????????????
                if (Settings.supportAjaxPage) {
                    menuHTML += '<span grid-action="refresh-page" refresh-type="previous">\n\t\t\t\t\t\t\t' + _I18n2.default.i18nText($table, "previous-page") + '\n\t\t\t\t\t\t\t<i class="iconfont icon-sanjiao2"></i>\n\t\t\t\t\t\t</span>\n\t\t\t\t\t\t<span grid-action="refresh-page" refresh-type="next">\n\t\t\t\t\t\t\t' + _I18n2.default.i18nText($table, "next-page") + '\n\t\t\t\t\t\t\t<i class="iconfont icon-sanjiao1"></i>\n\t\t\t\t\t\t</span>';
                }
                //LINL hide refresh: menuHTML += '<span grid-action="refresh-page" refresh-type="refresh">\n\t\t\t\t\t\t' + _I18n2.default.i18nText($table, "refresh") + '\n\t\t\t\t\t\t<i class="iconfont icon-31shuaxin"></i>\n\t\t\t\t\t</span>';
                //?????????
                if (Settings.supportExport) {
                    menuHTML += '<span class="grid-line"></span>\n\t\t\t\t\t\t<span grid-action="export-excel" only-checked="false">\n\t\t\t\t\t\t\t' + _I18n2.default.i18nText($table, "save-as-excel") + '\n\t\t\t\t\t\t\t<i class="iconfont icon-baocun"></i>\n\t\t\t\t\t\t</span>\n\t\t\t\t\t\t<span grid-action="export-excel" only-checked="true">\n\t\t\t\t\t\t\t' + _I18n2.default.i18nText($table, "save-as-excel-for-checked") + '\n\t\t\t\t\t\t\t<i class="iconfont icon-saveas24"></i>\n\t\t\t\t\t\t</span>';
                }
                //?????????
                if (Settings.supportConfig) {
                    menuHTML += '<span class="grid-line"></span>\n\t\t\t\t\t\t<span grid-action="setting-grid">\n\t\t\t\t\t\t\t' + _I18n2.default.i18nText($table, "setting-grid") + '\n\t\t\t\t\t\t\t<i class="iconfont icon-shezhi"></i>\n\t\t\t\t\t\t</span>';
                }
                menuHTML += '</div>';
                var _body = (0, _jTool2.default)('body');
                _body.append(menuHTML);
                //???????????????????????????

                var menuDOM = (0, _jTool2.default)('.grid-menu[grid-master="' + Settings.gridManagerName + '"]');
                tableWarp.unbind('contextmenu');
                tableWarp.bind('contextmenu', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    //?????????????????????tbdoy?????????tbody???????????????????????????
                    if (e.target.nodeName !== 'TBODY' && (0, _jTool2.default)(e.target).closest('tbody').length === 0) {
                        return;
                    }
                    //??????????????????????????????????????????
                    var exportExcelOfChecked = (0, _jTool2.default)('[grid-action="export-excel"][only-checked="true"]');
                    if ((0, _jTool2.default)('tbody tr[checked="true"]', (0, _jTool2.default)('table[grid-manager="' + Settings.gridManagerName + '"]')).length === 0) {
                        exportExcelOfChecked.addClass('disabled');
                    } else {
                        exportExcelOfChecked.removeClass('disabled');
                    }
                    var menuWidth = menuDOM.width(),
                        menuHeight = menuDOM.height(),
                        offsetHeight = document.documentElement.offsetHeight,
                        offsetWidth = document.documentElement.offsetWidth;
                    var top = offsetHeight < e.clientY + menuHeight ? e.clientY - menuHeight : e.clientY;
                    var left = offsetWidth < e.clientX + menuWidth ? e.clientX - menuWidth : e.clientX;
                    menuDOM.css({
                        'top': top + tableWarp.get(0).scrollTop + (document.body.scrollTop || document.documentElement.scrollTop),
                        'left': left + tableWarp.get(0).scrollLeft + (document.body.scrollLeft || document.documentElement.scrollLeft)
                    });
                    //???????????????????????????????????????
                    (0, _jTool2.default)('.grid-menu[grid-master]').hide();
                    menuDOM.show();
                    _body.off('mousedown.gridMenu');
                    _body.on('mousedown.gridMenu', function(e) {
                        var eventSource = (0, _jTool2.default)(e.target);
                        if (eventSource.hasClass('.grid-menu') || eventSource.closest('.grid-menu').length === 1) {
                            return;
                        }
                        _body.off('mousedown.gridMenu');
                        menuDOM.hide();
                    });
                });


                //???????????????????????????????????????????????????
                var refreshPage = (0, _jTool2.default)('[grid-action="refresh-page"]');
                refreshPage.unbind('click');
                refreshPage.bind('click', function(e) {
                    if (isDisabled(this, e)) {
                        return false;
                    }
                    var _gridMenu = (0, _jTool2.default)(this).closest('.grid-menu');
                    var _table = (0, _jTool2.default)('table[grid-manager="' + _gridMenu.attr('grid-master') + '"]');
                    var refreshType = this.getAttribute('refresh-type');
                    var Settings = _Cache2.default.getSettings(_table);
                    var cPage = Settings.pageData.cPage;
                    //?????????
                    if (refreshType === 'previous' && Settings.pageData.cPage > 1) {
                        cPage = Settings.pageData.cPage - 1;
                    }
                    //?????????
                    else if (refreshType === 'next' && Settings.pageData.cPage < Settings.pageData.tPage) {
                        cPage = Settings.pageData.cPage + 1;
                    }
                    //????????????
                    else if (refreshType === 'refresh') {
                        cPage = Settings.pageData.cPage;
                    }
                    _AjaxPage2.default.gotoPage(_table, cPage);
                    _body.off('mousedown.gridMenu');
                    _gridMenu.hide();
                });
                //????????????????????????EXCEL???????????????????????????Excel
                var exportExcel = (0, _jTool2.default)('[grid-action="export-excel"]');
                exportExcel.unbind('click');
                exportExcel.bind('click', function(e) {
                    if (isDisabled(this, e)) {
                        return false;
                    }
                    var _gridMenu = (0, _jTool2.default)(this).closest('.grid-menu'),
                        _table = (0, _jTool2.default)('table[grid-manager="' + _gridMenu.attr('grid-master') + '"]');
                    var onlyChecked = false;
                    if (this.getAttribute('only-checked') === 'true') {
                        onlyChecked = true;
                    }
                    _Export2.default.__exportGridToXls(_table, undefined, onlyChecked);
                    _body.off('mousedown.gridMenu');
                    _gridMenu.hide();
                });
                //????????????????????????
                var settingGrid = (0, _jTool2.default)('[grid-action="setting-grid"]');
                settingGrid.unbind('click');
                settingGrid.bind('click', function(e) {
                    if (isDisabled(this, e)) {
                        return false;
                    }
                    var _gridMenu = (0, _jTool2.default)(this).closest('.grid-menu'),
                        _table = (0, _jTool2.default)('table[grid-manager="' + _gridMenu.attr('grid-master') + '"]');
                    var configArea = (0, _jTool2.default)('.config-area', _table.closest('.table-wrap'));
                    (0, _jTool2.default)('.config-action', configArea).trigger('click');
                    _body.off('mousedown.gridMenu');
                    _gridMenu.hide();
                });
                //????????????????????????
                function isDisabled(dom, events) {
                    if ((0, _jTool2.default)(dom).hasClass('disabled')) {
                        events.stopPropagation();
                        events.preventDefault();
                        return true;
                    } else {
                        return false;
                    }
                }
            }
        };
        /*
         * GridManager: ????????????
         * */
        exports.default = Menu;

        /***/
    },
    /* 9 */
    /***/
    function(module, exports, __webpack_require__) {

        'use strict';

        Object.defineProperty(exports, "__esModule", {
            value: true
        });

        var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function(obj) { return typeof obj; } : function(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };
        /*
         * I18n: ?????????
         * */


        var _Base = __webpack_require__(5);

        var _Base2 = _interopRequireDefault(_Base);

        var _Cache = __webpack_require__(4);

        var _Cache2 = _interopRequireDefault(_Cache);

        function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

        var I18n = {
            //???????????????????????????????????????[zh-cn:???????????????en-us:????????????] ??????zh-cn
            getLanguage: function getLanguage($table) {
                    return _Cache2.default.getSettings($table).i18n;
                }
                // ??????[?????? ?????? ??????]??????????????????
                ,
            getText: function getText($table, key, language) {
                    return _Cache2.default.getSettings($table).textConfig[key][language] || '';
                }
                /*
                 * @?????????????????????????????????????????????
                 *  $table: table [jTool Object]
                 *  key: ?????????????????????
                 *  v1,v2,v3:???????????????????????????3????????????????????????????????????
                 * */
                ,
            i18nText: function i18nText($table, key, v1, v2, v3) {
                var _this = this;
                var intrusion = [];
                //??????????????????????????????
                if (arguments.length == 3 && _typeof(arguments[2]) == 'object') {
                    intrusion = arguments[2];
                } else if (arguments.length > 1) {
                    for (var i = 1; i < arguments.length; i++) {
                        intrusion.push(arguments[i]);
                    }
                }
                var _text = '';
                try {
                    _text = _this.getText($table, key, _this.getLanguage($table));
                    if (!intrusion || intrusion.length == 0) {
                        return _text;
                    }
                    _text = _text.replace(/{\d+}/g, function(word) {
                        return intrusion[word.match(/\d+/)];
                    });
                    return _text;
                } catch (e) {
                    _Base2.default.outLog('????????????' + key + '????????????' + _this.getLanguage($table) + '??????', 'warn');
                    return '';
                }
            }
        };
        exports.default = I18n;

        /***/
    },
    /* 10 */
    /***/
    function(module, exports, __webpack_require__) {

        'use strict';

        Object.defineProperty(exports, "__esModule", {
            value: true
        });

        var _jTool = __webpack_require__(1);

        var _jTool2 = _interopRequireDefault(_jTool);

        var _Core = __webpack_require__(7);

        var _Core2 = _interopRequireDefault(_Core);

        var _Cache = __webpack_require__(4);

        var _Cache2 = _interopRequireDefault(_Cache);

        function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

        var Export = {
            html: function html() {
                    var html = '<a href="" download="" id="gm-export-action"></a>';
                    return html;
                }
                /*
                 * ???????????? .xls
                 * @param $table:???????????????grid,?????????????????????
                 * @param fileName: ?????????????????????
                 * @param onlyChecked: ?????????????????????????????????
                 * */
                ,
            __exportGridToXls: function __exportGridToXls($table, fileName, onlyChecked) {
                var Settings = _Cache2.default.getSettings($table);
                var gmExportAction = (0, _jTool2.default)('#gm-export-action'); //createDOM?????????
                if (gmExportAction.length === 0) {
                    _Core2.default.outLog('?????????????????????????????????:supportExport??????????????????', 'error');
                    return false;
                }
                // type base64
                var uri = 'data:application/vnd.ms-excel;base64,';

                //???????????????thead??????
                var theadHTML = '';
                //???????????????tbody????????????
                var tbodyHTML = '';

                var thDOM = (0, _jTool2.default)('thead[grid-manager-thead] th[th-visible="visible"][gm-create="false"]', $table);

                var trDOM = void 0,
                    tdDOM = void 0;
                //??????????????????????????????????????????
                if (onlyChecked) {
                    trDOM = (0, _jTool2.default)('tbody tr[checked="true"]', $table);
                } else {
                    trDOM = (0, _jTool2.default)('tbody tr', $table);
                }
                _jTool2.default.each(thDOM, function(i, v) {
                    theadHTML += '<th>' + v.getElementsByClassName('th-text')[0].textContent + '</th>';
                });
                _jTool2.default.each(trDOM, function(i, v) {
                    tdDOM = (0, _jTool2.default)('td[gm-create="false"][td-visible="visible"]', v);
                    tbodyHTML += '<tr>';
                    _jTool2.default.each(tdDOM, function(i2, v2) {
                        tbodyHTML += v2.outerHTML;
                    });
                    tbodyHTML += '</tr>';
                });
                // ???????????????html????????????
                var exportHTML = '\n\t\t\t<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">\n\t\t\t\t<head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head>\n\t\t\t\t<body>\n\t\t\t\t\t<table>\n\t\t\t\t\t\t<thead>\'\n\t\t\t\t\t\t\t' + theadHTML + '\n\t\t\t\t\t\t</thead>\n\t\t\t\t\t\t<tbody>\n\t\t\t\t\t\t\t' + tbodyHTML + '\n\t\t\t\t\t\t</tbody>\n\t\t\t\t\t</table>\n\t\t\t\t</body>\n\t\t\t</html>';
                gmExportAction.prop('href', uri + base64(exportHTML));
                gmExportAction.prop('download', (fileName || Settings.gridManagerName) + '.xls');
                gmExportAction.get(0).click();

                function base64(s) {
                    return window.btoa(unescape(encodeURIComponent(s)));
                }

                // ???????????????true
                return true;
            }
        };
        /*
         * Export: ????????????
         * */
        exports.default = Export;

        /***/
    },
    /* 11 */
    /***/
    function(module, exports, __webpack_require__) {

        'use strict';

        Object.defineProperty(exports, "__esModule", {
            value: true
        });

        var _jTool = __webpack_require__(1);

        var _jTool2 = _interopRequireDefault(_jTool);

        var _Base = __webpack_require__(5);

        var _Base2 = _interopRequireDefault(_Base);

        var _Cache = __webpack_require__(4);

        var _Cache2 = _interopRequireDefault(_Cache);

        var _Adjust = __webpack_require__(3);

        var _Adjust2 = _interopRequireDefault(_Adjust);

        function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

        /*
         * Config: th??????
         * */
        var Config = {
            html: function html() {
                    var html = '<div class="config-area">\n\t\t\t\t\t\t<span class="config-action">\n\t\t\t\t\t\t\t<i class="iconfont icon-31xingdongdian"></i>\n\t\t\t\t\t\t</span>\n\t\t\t\t\t\t<ul class="config-list"></ul>\n\t\t\t\t\t</div>';
                    return html;
                }
                /*
                 * ????????????????????????[???????????????]
                 * $table: table [jTool object]
                 * */
                ,
            bindConfigEvent: function bindConfigEvent($table) {
                var Settings = _Cache2.default.getSettings($table);
                // GM??????
                var tableWarp = $table.closest('div.table-wrap');
                // ??????/?????????????????????
                var configAction = (0, _jTool2.default)('.config-action', tableWarp);
                configAction.unbind('click');
                configAction.bind('click', function() {
                    // ???????????????
                    var _configAction = (0, _jTool2.default)(this);

                    // ????????????
                    var _configArea = _configAction.closest('.config-area');

                    // ??????
                    if (_configArea.css('display') === 'block') {
                        _configArea.hide();
                        return false;
                    }
                    // ??????
                    _configArea.show();

                    // ????????????????????????div
                    var _tableWarp = _configAction.closest('.table-wrap');

                    // ?????????table
                    var _table = (0, _jTool2.default)('[grid-manager]', _tableWarp);

                    //???????????????????????????????????????????????? ???????????????????????????????????????????????????
                    var checkedLi = (0, _jTool2.default)('.checked-li', _configArea);
                    checkedLi.length == 1 ? checkedLi.addClass('no-click') : checkedLi.removeClass('no-click');
                });
                //????????????
                (0, _jTool2.default)('.config-list li', tableWarp).unbind('click');
                (0, _jTool2.default)('.config-list li', tableWarp).bind('click', function() {
                    //??????????????????
                    var _only = (0, _jTool2.default)(this);

                    //??????????????????thName
                    var _thName = _only.attr('th-name');

                    //????????????checkbox
                    var _checkbox = _only.find('input[type="checkbox"]');

                    //??????????????????
                    var _tableWarp = _only.closest('.table-wrap');

                    //?????????table-div
                    var _tableDiv = (0, _jTool2.default)('.table-div', _tableWarp);

                    //????????????table
                    var _table = (0, _jTool2.default)('[grid-manager]', _tableWarp);

                    //????????????th
                    var _th = (0, _jTool2.default)('thead[grid-manager-thead] th[th-name="' + _thName + '"]', _table);

                    if (_only.hasClass('no-click')) {
                        return false;
                    }
                    _only.closest('.config-list').find('.no-click').removeClass('no-click');
                    var isVisible = !_checkbox.prop('checked');

                    //???????????????td?????????td????????????
                    _tableDiv.addClass('config-editing');
                    _Base2.default.setAreVisible(_th, isVisible, function() {
                        _tableDiv.removeClass('config-editing');
                    });

                    //????????????????????????????????????
                    var _checkedList = (0, _jTool2.default)('.config-area input[type="checkbox"]:checked', _tableWarp);

                    //????????????????????????
                    if (_checkedList.length == 1) {
                        _checkedList.parent().addClass('no-click');
                    }

                    //???????????????????????????
                    if (Settings.supportAdjust) {
                        _Adjust2.default.resetAdjust(_table);
                    }

                    //??????????????????????????????
                    (0, _jTool2.default)('.sa-inner', _tableWarp).width('100%');

                    //??????????????????th?????????
                    var _visibleTh = (0, _jTool2.default)('thead th[th-visible="visible"]', _table);
                    _jTool2.default.each(_visibleTh, function(i, v) {
                        // ????????????: GM???????????????????????????50px
                        if (v.getAttribute('gm-create') === 'true') {
                            v.style.width = '50px';
                        } else {
                            v.style.width = 'auto';
                        }
                    });

                    //??????th???????????????????????????????????????
                    //??????????????????each??????????????????????????????????????????
                    _jTool2.default.each(_visibleTh, function(i, v) {
                        var _realWidthForThText = _Base2.default.getTextWidth(v),
                            _thWidth = (0, _jTool2.default)(v).width();
                        if (_thWidth < _realWidthForThText) {
                            (0, _jTool2.default)(v).width(_realWidthForThText);
                        } else {
                            (0, _jTool2.default)(v).width(_thWidth);
                        }
                    });
                    _Cache2.default.saveUserMemory(_table); // ??????????????????
                });
            }
        };
        exports.default = Config;

        /***/
    },
    /* 12 */
    /***/
    function(module, exports, __webpack_require__) {

        'use strict';

        Object.defineProperty(exports, "__esModule", {
            value: true
        });

        var _jTool = __webpack_require__(1);

        var _jTool2 = _interopRequireDefault(_jTool);

        var _I18n = __webpack_require__(9);

        var _I18n2 = _interopRequireDefault(_I18n);

        function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

        /*
         * Checkbox: ????????????/??????/??????
         * */
        var Checkbox = {
            /*
             * checkbox ???????????????
             * table: table [jTool Object]
             * */
            html: function html($table) {
                    var checkboxHtml = '<th th-name="gm_checkbox" gm-checkbox="true" gm-create="true">\n\t\t\t\t\t\t\t\t<input type="checkbox"/>\n\t\t\t\t\t\t\t\t<span style="display: none">' + _I18n2.default.i18nText($table, 'checkall-text') + '</span>\n\t\t\t\t\t\t\t</th>';
                    return checkboxHtml;
                }
                /*
                 * ????????????????????????DOM
                 * table: table [jTool Object]
                 * */
                ,
            initCheckbox: function initCheckbox($table) {
                    // ????????????DOM
                    (0, _jTool2.default)('thead tr', $table).prepend(this.html($table));

                    // ?????????????????????
                    this.bindCheckboxEvent($table);
                }
                /*
                 * ?????????????????????
                 * table: table [jTool Object]
                 * */
                ,
            bindCheckboxEvent: function bindCheckboxEvent($table) {
                $table.off('click', 'input[type="checkbox"]');
                $table.on('click', 'input[type="checkbox"]', function() {
                    // ??????th??????checkbox???????????????
                    var _thChecked = true;
                    // ??????????????????
                    var _checkAction = (0, _jTool2.default)(this);
                    // th???????????????
                    var _thCheckbox = (0, _jTool2.default)('thead th[gm-checkbox] input[type="checkbox"]', $table);

                    // td???????????????
                    var _tdCheckbox = (0, _jTool2.default)('tbody td[gm-checkbox] input[type="checkbox"]', $table);
                    // ????????????????????????
                    if (_checkAction.closest('th[th-name="gm_checkbox"]').length === 1) {
                        _jTool2.default.each(_tdCheckbox, function(i, v) {
                            v.checked = _checkAction.prop('checked');
                            (0, _jTool2.default)(v).closest('tr').attr('checked', v.checked);
                        });
                        // ?????????????????????
                    } else {
                        _jTool2.default.each(_tdCheckbox, function(i, v) {
                            if (v.checked === false) {
                                _thChecked = false;
                            }
                            (0, _jTool2.default)(v).closest('tr').attr('checked', v.checked);
                        });
                        _thCheckbox.prop('checked', _thChecked);
                    }
                });
            }
        };
        exports.default = Checkbox;

        /***/
    },
    /* 13 */
    /***/
    function(module, exports, __webpack_require__) {

        'use strict';

        Object.defineProperty(exports, "__esModule", {
            value: true
        });

        var _jTool = __webpack_require__(1);

        var _jTool2 = _interopRequireDefault(_jTool);

        var _I18n = __webpack_require__(9);

        var _I18n2 = _interopRequireDefault(_I18n);

        function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

        /*
         * Order: ??????
         * */
        var Order = {
            /*
	  @????????????DOM
	  $.table: table [jTool object]
	  */
            initDOM: function initDOM($table) {
                var orderHtml = '<th th-name="gm_order" gm-order="true" gm-create="true">' + _I18n2.default.i18nText($table, 'order-text') + '</th>';
                (0, _jTool2.default)('thead tr', $table).prepend(orderHtml);
            }
        };
        exports.default = Order;

        /***/
    },
    /* 14 */
    /***/
    function(module, exports, __webpack_require__) {

        'use strict';

        Object.defineProperty(exports, "__esModule", {
            value: true
        });

        var _jTool = __webpack_require__(1);

        var _jTool2 = _interopRequireDefault(_jTool);

        function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

        var Remind = {
            html: function html() {
                    var html = '<div class="remind-action">\n\t\t\t\t\t\t<i class="ra-help iconfont icon-icon"></i>\n\t\t\t\t\t\t<div class="ra-area">\n\t\t\t\t\t\t\t<span class="ra-title"></span>\n\t\t\t\t\t\t\t<span class="ra-con"></span>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>';
                    return html;
                }
                /*
                 * @????????????????????????
                 * $.table: table [jTool object]
                 * */
                ,
            bindRemindEvent: function bindRemindEvent(table) {
                var remindAction = (0, _jTool2.default)('.remind-action', table);
                remindAction.unbind('mouseenter');
                remindAction.bind('mouseenter', function() {
                    var raArea = (0, _jTool2.default)(this).find('.ra-area');
                    var tableDiv = (0, _jTool2.default)(this).closest('.table-div');
                    raArea.show();
                    var theLeft = tableDiv.get(0).offsetWidth - ((0, _jTool2.default)(this).offset().left - tableDiv.offset().left) > raArea.get(0).offsetWidth;
                    raArea.css({
                        left: theLeft ? '0px' : 'auto',
                        right: theLeft ? 'auto' : '0px'
                    });
                });
                remindAction.unbind('mouseleave');
                remindAction.bind('mouseleave', function() {
                    var raArea = (0, _jTool2.default)(this).find('.ra-area');
                    raArea.hide();
                });
            }
        };
        /*
         * Remind: ????????????
         * */
        exports.default = Remind;

        /***/
    },
    /* 15 */
    /***/
    function(module, exports, __webpack_require__) {

        'use strict';

        Object.defineProperty(exports, "__esModule", {
            value: true
        });

        var _jTool = __webpack_require__(1);

        var _jTool2 = _interopRequireDefault(_jTool);

        var _Base = __webpack_require__(5);

        var _Base2 = _interopRequireDefault(_Base);

        var _Core = __webpack_require__(7);

        var _Core2 = _interopRequireDefault(_Core);

        var _Cache = __webpack_require__(4);

        var _Cache2 = _interopRequireDefault(_Cache);

        function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

        /*
         * Sort: ??????
         * */
        var Sort = {
            html: function html() {
                    var html = '<div class="sorting-action">\n\t\t\t\t\t\t<i class="sa-icon sa-up iconfont icon-sanjiao2"></i>\n\t\t\t\t\t\t<i class="sa-icon sa-down iconfont icon-sanjiao1"></i>\n\t\t\t\t\t</div>';
                    return html;
                }
                /*
                 * ??????????????????
                 * @param sortJson: ???????????????json??? ???:{th-name:'down'} value???????????????sortUpText ??? sortDownText?????????
                 * @param callback: ????????????[function]
                 * @param refresh: ????????????????????????????????????????????????[boolean, ?????????true]
                 *
                 * ??????json?????????:
                 * sortJson => {name: 'ASC}
                 * */
                ,
            __setSort: function __setSort($table, sortJson, callback, refresh) {
                    debugger;
                    var settings = _Cache2.default.getSettings($table);
                    if (!sortJson || _jTool2.default.type(sortJson) !== 'object' || _jTool2.default.isEmptyObject(sortJson)) {
                        return false;
                    }
           
                    _jTool2.default.extend(settings.sortData, sortJson);
                    _Cache2.default.updateSettings($table, settings);

                    //??????????????????????????????????????????
                    if (typeof refresh === 'undefined') {
                        refresh = true;
                    }
                    var _th = void 0,
                        _sortAction = void 0,
                        _sortType = void 0;
                    for (var s in sortJson) {
                        _th = (0, _jTool2.default)('[th-name="' + s + '"]', $table);
                        _sortType = sortJson[s];
                        _sortAction = (0, _jTool2.default)('.sorting-action', _th);
                        if (_sortType === settings.sortUpText) {
                            _th.attr('sorting', settings.sortUpText);
                            _sortAction.removeClass('sorting-down');
                            _sortAction.addClass('sorting-up');
                        } else if (_sortType === settings.sortDownText) {
                            _th.attr('sorting', settings.sortDownText);
                            _sortAction.removeClass('sorting-up');
                            _sortAction.addClass('sorting-down');
                        }
                    }
                    refresh ? _Core2.default.__refreshGrid($table, callback) : typeof callback === 'function' ? callback() : '';
                }
                /*
	  @??????????????????
	  $.table: table [jTool object]
	  */
                ,
            bindSortingEvent: function bindSortingEvent(table) {
                //var Settings = _Cache2.default.getSettings(table);
                // ????????????????????????
                var _thList = (0, _jTool2.default)('th[sorting]', table);
                var _action = void 0,
                    //????????????????????????
                    _th = void 0,
                    //??????????????????th
                    _table = void 0,
                    //??????????????????table
                    _thName = void 0; //th???????????????

                //??????????????????
                //(0, _jTool2.default)('.sorting-action', _thList).unbind('mouseup');
                //(0, _jTool2.default)('.sorting-action', _thList).bind('mouseup', function() {
                _thList.unbind('mouseup');
                _thList.bind('mouseup', function(event) {
                    //LINL fix event bubble
                    if($(event.target)[0].className==="adjust-action"){
                        return false;
                    }
                    var Settings = _Cache2.default.getSettings(table);
                    //_action = (0, _jTool2.default)(this);
                    //_th = _action.closest('th');
                    _th = (0, _jTool2.default)(this);
                    _action = (0, _jTool2.default)('.sorting-action', _th);
                    //console.log(_action)
                    _table = _th.closest('table');
                    _thName = _th.attr('th-name');
                    if (!_thName || _jTool2.default.trim(_thName) == '') {
                        _Base2.default.outLog('???????????????????????????', 'error');
                        return false;
                    }
                    //????????????????????????????????????????????????????????????????????????
                    if (!Settings.isCombSorting) {
                        _jTool2.default.each((0, _jTool2.default)('.sorting-action', _table), function(i, v) {
                            if (v != _action.get(0)) {
                                //_action.get(0) ??????????????????DOM
                                (0, _jTool2.default)(v).removeClass('sorting-up sorting-down');
                                (0, _jTool2.default)(v).closest('th').attr('sorting', '');
                            }
                        });
                    }
                    //?????????????????????
                    if (_action.hasClass('sorting-down')) {
                        _action.addClass('sorting-up');
                        _action.removeClass('sorting-down');
                        _th.attr('sorting', Settings.sortUpText);
                    }
                    //?????????????????????
                    else {
                        _action.addClass('sorting-down');
                        _action.removeClass('sorting-up');
                        _th.attr('sorting', Settings.sortDownText);
                    }
                    //??????????????????
                    Settings.sortData = {};
                    if (!Settings.isCombSorting) {
                        Settings.sortData[_th.attr('th-name')] = _th.attr('sorting');
                    } else {
                        _jTool2.default.each((0, _jTool2.default)('th[th-name][sorting]', _table), function(i, v) {
                            if (v.getAttribute('sorting') != '') {
                                Settings.sortData[v.getAttribute('th-name')] = v.getAttribute('sorting');
                            }
                        });
                    }
                    localStorage.setItem("dolphindb_gridsorting", JSON.stringify(Settings.sortData));//LINL:20171127
                    
                    //?????????????????????tbody
                    _Cache2.default.updateSettings(table, Settings);
                    var query = _jTool2.default.extend({}, Settings.query, Settings.sortData, Settings.pageData);
                    
                    Settings.sortingBefore(query);
                    _Core2.default.__refreshGrid(table, function() {
                        Settings.sortingAfter(query, _th);
                    });
                });
            }
        };
        exports.default = Sort;

        /***/
    },
    /* 16 */
    /***/
    function(module, exports, __webpack_require__) {

        'use strict';

        Object.defineProperty(exports, "__esModule", {
            value: true
        });

        var _jTool = __webpack_require__(1);

        var _jTool2 = _interopRequireDefault(_jTool);

        var _Base = __webpack_require__(5);

        var _Base2 = _interopRequireDefault(_Base);

        var _Adjust = __webpack_require__(3);

        var _Adjust2 = _interopRequireDefault(_Adjust);

        var _Cache = __webpack_require__(4);

        var _Cache2 = _interopRequireDefault(_Cache);

        function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

        /*
         * Drag: ??????
         * */
        var Drag = {
            /*
	  @????????????????????????
	  $.table: table [jTool object]
	  */
            bindDragEvent: function bindDragEvent(table) {
                var thList = (0, _jTool2.default)('thead th', table),
                    //????????????????????????TH
                    dragAction = thList.find('.drag-action');
                var currentDragCol = undefined;
                //???????????????????????????,??????????????????
                dragAction.unbind('dragstart');
                dragAction.bind('dragstart', function(event) {
                    currentDragCol = event.target.innerText.trim();
                    //console.log("dragstart",event);
                    // ???????????????
                    var Settings = _Cache2.default.getSettings(table);

                    // ?????????th
                    var _th = (0, _jTool2.default)(this).closest('th');

                    // ?????????????????????th
                    var _prevTh = null;

                    //?????????????????????th
                    var _nextTh = null;

                    // ???????????????????????????td
                    var _prevTd = null;

                    //???????????????????????????td
                    var _nextTd = null;

                    //??????????????????tr
                    var _tr = _th.parent();

                    //????????????????????????????????????th
                    var _allTh = _tr.find('th[th-visible="visible"]');

                    //??????????????????table
                    var _table = _tr.closest('table');

                    //??????????????????DIV
                    var _tableDiv = _table.closest('.table-div');

                    //????????????????????????
                    var _tableWrap = _table.closest('.table-wrap');

                    //???????????????????????????td
                    var _td = _Base2.default.getColTd(_th);

                    // ???????????????????????????
                    Settings.dragBefore(event);
                    //????????????????????????
                    (0, _jTool2.default)('body').addClass('no-select-text');
                    //??????DIV??????????????????
                    //??????DIV??????????????????
                    var _divPosition = _tableDiv.css('position');
                    if (_divPosition != 'relative' && _divPosition != 'absolute') {
                        _tableDiv.css('position', 'relative');
                    }
  
                    //????????????????????????
                    var _thIndex = 0; //??????????????????th???????????????
                    (0, _jTool2.default)('body').unbind('dragover');
                    (0, _jTool2.default)('body').bind('dragover', function(e2) {
                        e2.preventDefault();
                        if(e2.target.innerText === "") return;
                        if(currentDragCol === e2.target.innerText.trim()) return;
                        
                        var Settings = _Cache2.default.getSettings(table);
                        _thIndex = _th.index(_allTh);
                        _prevTh = undefined;
                        //???????????????????????????
                        if (_thIndex > 0) {
                            _prevTh = _allTh.eq(_thIndex - 1);
                        }
                        _nextTh = undefined;
                        //??????????????????????????????
                        if (_thIndex < _allTh.length) {
                            _nextTh = _allTh.eq(_thIndex + 1);
                        }
                        //????????????????????????,???????????????
                        if (_prevTh && _prevTh.length !== 0 && _prevTh.attr('gm-create') === 'true') {
                            _prevTh = undefined;
                        } else if (_nextTh && _nextTh.length !== 0 && _nextTh.attr('gm-create') === 'true') {
                            _nextTh = undefined;
                        }
                        //??????????????????
                        if (_prevTh && _prevTh.length != 0 && _prevTh.DOMList[0].innerText.trim()===e2.target.innerText.trim()) {
                            _prevTd = _Base2.default.getColTd(_prevTh);
                            _prevTh.before(_th);
                            _jTool2.default.each(_td, function(i, v) {
                                _prevTd.eq(i).before(v);
                            });
                            _allTh = _tr.find('th'); //??????TH????????????
                        }
                        //??????????????????
                        if (_nextTh && _nextTh.length != 0 && _nextTh.DOMList[0].innerText.trim()===e2.target.innerText.trim()) {
                            _nextTd = _Base2.default.getColTd(_nextTh);
                            _nextTh.after(_th);
                            _jTool2.default.each(_td, function(i, v) {
                                _nextTd.eq(i).after(v);
                            });
                            _allTh = _tr.find('th'); //??????TH????????????
                        }
                    });
                    //????????????????????????
                    (0, _jTool2.default)('body').unbind('drop');
                    (0, _jTool2.default)('body').bind('drop', function(event) {
                        event.preventDefault();
           				var Settings = _Cache2.default.getSettings(table);
					    Settings.dragAfter(event);
                        // ??????????????????
                        _Cache2.default.saveUserMemory(_table);

                        //???????????????????????????
                        if (Settings.supportAdjust) {
                            _Adjust2.default.resetAdjust(_table);
                        }
                        //????????????????????????
                        (0, _jTool2.default)('body').removeClass('no-select-text');
                    });
                });
            }
        };
        exports.default = Drag;

        /***/
    },
    /* 17 */
    /***/
    function(module, exports, __webpack_require__) {

        'use strict';

        Object.defineProperty(exports, "__esModule", {
            value: true
        });

        var _jTool = __webpack_require__(1);

        var _jTool2 = _interopRequireDefault(_jTool);

        function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

        var Scroll = {
            /*
	  @???????????????????????????
	  $.table: table [jTool object]
	  */
            bindScrollFunction: function bindScrollFunction(table) {
                var _tableDIV = table.closest('.table-div');
                // ??????resize??????: ???????????????????????????????????????
                window.addEventListener('resize', function() {
                    var _setTopHead = (0, _jTool2.default)('.set-top', table); // ????????????
                    if (_setTopHead && _setTopHead.length === 1) {
                        _setTopHead.remove();
                        table.closest('.table-div').trigger('scroll');
                    }
                });
                //?????????????????????
                _tableDIV.unbind('scroll');
                _tableDIV.bind('scroll', function(e, _isWindowResize_) {
                    var _scrollDOMTop = (0, _jTool2.default)(this).scrollTop();
                    // ???????????????DIV,???DIV???class?????????table-div
                    // ???????????????????????????
                    var _tableWarp = _tableDIV.closest('.table-wrap');
                    // ??????head
                    var _thead = (0, _jTool2.default)('thead[grid-manager-thead]', table);
                    // ??????body
                    var _tbody = (0, _jTool2.default)('tbody', table);
                    // ????????????
                    var _setTopHead = (0, _jTool2.default)('.set-top', table);
                    // ????????????????????????
                    if ((0, _jTool2.default)('tr', _tbody).length == 0) {
                        return true;
                    }
                    //????????????????????????
                    /*
                    if (_setTopHead.length == 0 || _isWindowResize_) {
                        _setTopHead.length == 0 ? table.append(_thead.clone(true).addClass('set-top')) : '';
                        _setTopHead = (0, _jTool2.default)('.set-top', table);
                        _setTopHead.removeAttr('grid-manager-thead');
                        _setTopHead.removeClass('scrolling');
                        _setTopHead.css({
                            width: _thead.width(),
                            left: table.css('border-left-width') + 'px'
                        });
                        // ??????window.resize????????????????????????????????????. ????????????
                        _jTool2.default.each((0, _jTool2.default)('th', _thead), function(i, v) {
                            (0, _jTool2.default)('th', _setTopHead).eq(i).width((0, _jTool2.default)(v).width());
                        });
                    }
                    */
                    if (_setTopHead.length === 0) {
                        var translate = "translate(0," + (_scrollDOMTop) + "px)";

                        _thead.css('transform', translate);
                        return;
                    }
                    // ??????????????????
                    if (_scrollDOMTop === 0) {
                        _thead.removeClass('scrolling');
                        _setTopHead.remove();
                    }
                    // ??????????????????
                    else {
                        _thead.addClass('scrolling');
                        _setTopHead.css({
                            top: _scrollDOMTop
                        });
                    }
                    return true;
                });
            }
        };
        /*
         * Scroll: ?????????
         * */
        exports.default = Scroll;

        /***/
    },
    /* 18 */
    /***/
    function(module, exports, __webpack_require__) {

        'use strict';

        Object.defineProperty(exports, "__esModule", {
            value: true
        });
        exports.TextSettings = exports.Settings = undefined;

        var _jTool = __webpack_require__(1);

        var _jTool2 = _interopRequireDefault(_jTool);

        function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

        var Settings = {
            // ??????
            supportDrag: true, // ????????????????????????
            dragBefore: _jTool2.default.noop, // ???????????????
            dragAfter: _jTool2.default.noop, // ???????????????

            // ????????????
            supportAdjust: true, // ??????????????????????????????
            adjustBefore: _jTool2.default.noop, // ?????????????????????
            adjustAfter: _jTool2.default.noop, // ?????????????????????

            // ??????????????????????????????[???????????????TH???????????????remind]
            supportRemind: false,

            // ??????????????????????????????[?????????????????????]
            supportConfig: true,

            // ????????????
            width: '100%',

            // ????????????, ???????????????????????????300px
            height: '300px',

            // ??????????????????
            textAlign: '',

            // ??????????????????
            animateTime: 300,

            // ????????????????????????
            disableCache: false,

            // ?????? sort
            supportSorting: false, //?????????????????????????????????
            isCombSorting: false, //?????????????????????[???????????????????????????????????????
            sortKey: 'sort_', //??????????????????, ??????: ??????='date', sortKey='sort_', ??????????????????sort_date
            sortData: {}, //??????????????????[?????????????????????]
            sortUpText: 'ASC', //?????????????????????[?????????????????????????????????]
            sortDownText: 'DESC', //?????????????????????[?????????????????????????????????]
            sortingBefore: _jTool2.default.noop, //?????????????????????
            sortingAfter: _jTool2.default.noop, //?????????????????????

            // ?????? ajaxPag
            supportAjaxPage: false, //????????????????????????ajxa??????
            sizeData: [10, 20, 30, 50, 100], //?????????????????????????????????????????????
            pageSize: 20, //????????????????????????????????????????????????????????????????????????????????????
            pageData: {}, //??????????????????[?????????????????????]
            query: {}, //????????????????????????????????????????????????????????????????????????????????????????????????????????????
            pagingBefore: _jTool2.default.noop, //?????????????????????
            pagingAfter: _jTool2.default.noop, //?????????????????????

            //?????????
            supportAutoOrder: true, //???????????????????????????

            //?????????
            supportCheckbox: true, //???????????????????????????

            //?????????
            i18n: 'zh-cn', //???????????????????????????????????????[zh-cn:???????????????en-us:????????????] ??????zh-cn

            //??????????????????????????????DOM
            columnData: [], //????????????????????????
            gridManagerName: '', //??????grid-manager???????????????[??????html?????????]
            ajax_url: '', //????????????????????????????????????????????????????????????????????????
            ajax_type: 'GET', //ajax????????????['GET', 'POST']??????GET
            ajax_headers: {}, //ajax???????????????
            ajax_beforeSend: _jTool2.default.noop, //ajax????????????,???jTool???beforeSend??????????????????
            ajax_success: _jTool2.default.noop, //ajax?????????,???jTool???success??????????????????
            ajax_complete: _jTool2.default.noop, //ajax?????????,???jTool???complete??????????????????
            ajax_error: _jTool2.default.noop, //ajax?????????,???jTool???error??????????????????
            ajax_data: undefined, //ajax????????????,?????????ajax_url?????????
            dataKey: 'data', //ajax???????????????????????????key??????,?????????data
            totalsKey: 'totals', //ajax??????????????????????????????key??????,?????????totals
            //????????????
            supportExport: true //????????????????????????
        };

        // ??????????????????????????????????????????
        /**
         * Settings: ?????????
         */
        var TextSettings = function TextSettings() {
            this['order-text'] = {
                'zh-cn': '??????',
                'en-us': 'order'
            };
            this['first-page'] = {
                'zh-cn': '??????',
                'en-us': 'first'
            };
            this['previous-page'] = {
                'zh-cn': '?????????',
                'en-us': 'previous'
            };
            this['next-page'] = {
                'zh-cn': '?????????',
                'en-us': 'next'
            };
            this['last-page'] = {
                'zh-cn': '??????',
                'en-us': 'last'
            };
            this['dataTablesInfo'] = {
                'zh-cn': '???????????? {0}-{1} ???{2}???',
                'en-us': 'this page show {0}-{1} count {2}'
            };
            this['goto-first-text'] = {
                'zh-cn': '?????????',
                'en-us': 'goto'
            };
            this['goto-last-text'] = {
                'zh-cn': '???',
                'en-us': 'page'
            };
            this['refresh'] = {
                'zh-cn': '????????????',
                'en-us': 'Refresh'
            };
            this['save-as-excel'] = {
                'zh-cn': '?????????Excel',
                'en-us': 'Save as Excel'
            };
            this['save-as-excel-for-checked'] = {
                'zh-cn': '?????????????????????Excel',
                'en-us': 'Save selected as Excel'
            };
            this['setting-grid'] = {
                'zh-cn': '?????????',
                'en-us': 'Column Selection'
            };
            this['checkall-text'] = {
                'zh-cn': '??????',
                'en-us': 'All'
            };
        };
        exports.Settings = Settings;
        exports.TextSettings = TextSettings;

        /***/
    },
    /* 19 */
    /***/
    function(module, exports, __webpack_require__) {

        'use strict';

        Object.defineProperty(exports, "__esModule", {
            value: true
        });
        exports.Hover = undefined;

        var _jTool = __webpack_require__(1);

        var _jTool2 = _interopRequireDefault(_jTool);

        var _Base = __webpack_require__(5);

        var _Base2 = _interopRequireDefault(_Base);

        function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

        /**
         * Created by baukh on 17/3/3.
         * ?????????
         */
        var Hover = exports.Hover = {
            onTbodyHover: function onTbodyHover($table) {
                var $td = null,
                    $tr = null;
                $table.on('mousemove', 'td', function(e) {
                    $td = (0, _jTool2.default)(this);
                    $tr = $td.parent();
                    // row col ??????????????????
                    if ($td.attr('col-hover') === 'true' && $tr.attr('row-hover') === 'true') {
                        return;
                    }
                    // row ????????????
                    if ($tr.attr('row-hover') !== 'true') {
                        (0, _jTool2.default)('tr[row-hover="true"]', $table).removeAttr('row-hover');
                        $tr.attr('row-hover', 'true');
                    }

                    // col ????????????
                    if ($tr.attr('col-hover') !== 'true') {
                        (0, _jTool2.default)('td[col-hover="true"]', $table).removeAttr('col-hover');
                        _Base2.default.getColTd($td).attr('col-hover', 'true');
                    }
                });
            }
        };

        /***/
    },
    /* 20 */
    /***/
    function(module, exports, __webpack_require__) {

        'use strict';

        Object.defineProperty(exports, "__esModule", {
            value: true
        });
        exports.publishMethodArray = exports.PublishMethod = undefined;

        var _jTool = __webpack_require__(1);

        var _jTool2 = _interopRequireDefault(_jTool);

        var _Cache = __webpack_require__(4);

        var _Cache2 = _interopRequireDefault(_Cache);

        var _Base = __webpack_require__(5);

        var _Base2 = _interopRequireDefault(_Base);

        var _Sort = __webpack_require__(15);

        var _Sort2 = _interopRequireDefault(_Sort);

        var _Export = __webpack_require__(10);

        var _Export2 = _interopRequireDefault(_Export);

        var _Core = __webpack_require__(7);

        var _Core2 = _interopRequireDefault(_Core);

        function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

        /**
         * Created by baukh on 17/4/14.
         * ????????????
         * ????????????$table, ????????????????????????
         */
        var PublishMethod = {
            /*
             * ??????jTool????????????GridManager
             * @param $table: table [jTool Object]
             * */
            get: function get($table) {
                    return _Cache2.default.__getGridManager($table);
                }
                /*
                 * ???????????????????????????????????????
                 * ?????????????????????????????????,????????????????????????
                 * @param $table: table [jTool Object]
                 * */
                ,
            getLocalStorage: function getLocalStorage($table) {
                    return _Cache2.default.getUserMemory($table);
                }
                /*
                 * ????????????????????????????????????
                 * @param $table: table [jTool Object]
                 * return ??????????????????????????????
                 * */
                ,
            clear: function clear($table) {
                    return _Cache2.default.delUserMemory($table);
                }
                /*
                 * @???????????????????????????????????????
                 * @param $table: table [jTool Object]
                 * @param target: ??????????????????????????????tr[Element or NodeList]
                 * */
                ,
            getRowData: function getRowData($table, target) {
                    return _Cache2.default.__getRowData($table, target);
                }
                /*
                 * ??????????????????
                 * @param sortJson: ???????????????json??? ???:{th-name:'down'} value???????????????sortUpText ??? sortDownText?????????
                 * @param callback: ????????????[function]
                 * @param refresh: ????????????????????????????????????????????????[boolean, ?????????true]
                 * */
                ,
            setSort: function setSort($table, sortJson, callback, refresh) {
                debugger;
                    _Sort2.default.__setSort($table, sortJson, callback, refresh);
                }
                /*
                 * ??????Th????????????TD???
                 * @param $table: table [jTool Object]
                 * @param target: th[Element or NodeList]
                 * */
                ,
            showTh: function showTh($table, target) {
                    _Base2.default.setAreVisible((0, _jTool2.default)(target), true);
                }
                /*
                 * ??????Th????????????TD???
                 * @param $table: table [jTool Object]
                 * @param target: th[Element or NodeList]
                 * */
                ,
            hideTh: function hideTh($table, target) {
                    _Base2.default.setAreVisible((0, _jTool2.default)(target), false);
                }
                /*
                 * ???????????? .xls
                 * @param $table:???????????????grid,?????????????????????
                 * @param fileName: ?????????????????????
                 * @param onlyChecked: ?????????????????????????????????
                 * */
                ,
            exportGridToXls: function exportGridToXls($table, fileName, onlyChecked) {
                    return _Export2.default.__exportGridToXls($table, fileName, onlyChecked);
                }
                /**
                 * ??????????????????
                 * @param $table: table [jTool object]
                 * @param query: ??????????????? [Object]
                 * @param callback: ????????????
                 * ????????????:
                 * - query???key??????????????????????????????????????????, query????????????????????????.
                 * - setQuery() ???????????????????????????
                 * - ???????????????query????????????????????????, ???????????????????????????pagingAfter(query)?????????
                 * - setQuery???query?????????????????????????????????????????????, ????????????setQuery????????????????????????query?????????
                 */
                ,
            setQuery: function setQuery($table, query, callback) {
                    var settings = _Cache2.default.getSettings($table);
                    _jTool2.default.extend(settings, { query: query });
                    _Cache2.default.updateSettings($table, settings);
                    _Core2.default.__refreshGrid($table, callback);
                }
                /**
                 * ???????????????ajaxData
                 * @param $table: table [jTool object]
                 * @param ajaxData: ???????????????
                 */
                ,
            setAjaxData: function setAjaxData($table, ajaxData) {
                var settings = _Cache2.default.getSettings($table);
                _jTool2.default.extend(settings, { ajax_data: ajaxData });
                    _Cache2.default.updateSettings($table, settings);
                    _Core2.default.__refreshGrid($table);
                }
                /*
                 * ???????????? ????????????????????????????????????????????????????????????????????????
                 * @param $table:???????????????grid,?????????????????????
                 * @param gotoFirstPage:  ?????????????????????????????????
                 * @param callback: ????????????
                 * */
                ,
            refreshGrid: function refreshGrid($table, gotoFirstPage, callback) {
                    var settings = _Cache2.default.getSettings($table);
                    if (typeof gotoFirstPage !== 'boolean') {
                        callback = gotoFirstPage;
                        gotoFirstPage = false;
                    }
                    if (gotoFirstPage) {
                        settings.pageData['cPage'] = 1;
                        _Cache2.default.getSettings($table, settings);
                    }
                    _Core2.default.__refreshGrid($table, callback);
                }
                /*
                 * ????????????????????????
                 * @param $table: table [jTool Object]
                 * return ?????????????????? [NodeList]
                 * */
                ,
            getCheckedTr: function getCheckedTr($table) {
                    return $table.get(0).querySelectorAll('tbody tr[checked="true"]');
                }
                /*
                 * ?????????????????????????????????????????????
                 * @param $table: table [jTool Object]
                 * */
                ,
            getCheckedData: function getCheckedData($table) {
                return _Cache2.default.__getRowData($table, this.getCheckedTr($table));
            }
        };

        /*
        	//????????????????????????
        	'init',					// ???????????????
        	'setSort',				// ??????????????????
        	'get',					//??????jTool????????????GridManager
        	'showTh',				//??????Th????????????TD???
        	'hideTh',				//??????Th????????????TD???
        	'exportGridToXls',		//???????????? .xls
        	'getLocalStorage',		//???????????????????????????????????????
        	'setQuery',				//??????query ???????????????????????????????????????pagingAfter(query)??????
        	'setAjaxData',          //??????????????????ajax_data??????, ???????????????????????????????????????????????????
        	'refreshGrid',			//???????????? ????????????????????????????????????????????????????????????????????????
        	'getCheckedTr',			//????????????????????????
        	'getRowData',			//???????????????????????????????????????
        	'getCheckedData',		//?????????????????????????????????????????????
        	'clear'					//????????????????????????????????????
        */
        // ????????????????????????
        var publishMethodArray = ['init'];
        for (var key in PublishMethod) {
            publishMethodArray.push(key);
        }
        exports.PublishMethod = PublishMethod;
        exports.publishMethodArray = publishMethodArray;

        /***/
    }
    /******/
]);