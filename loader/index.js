"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = loader;

var _assemblyscript = require("assemblyscript");

var _assemblyscript2 = _interopRequireDefault(_assemblyscript);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _asc = require("assemblyscript/cli/asc.js");

var _asc2 = _interopRequireDefault(_asc);

var _loaderUtils = require("loader-utils");

var _loaderUtils2 = _interopRequireDefault(_loaderUtils);

var _optionsBytes = require("./options.bytes.json");

var _optionsBytes2 = _interopRequireDefault(_optionsBytes);

var _optionsFile = require("./options.file.json");

var _optionsFile2 = _interopRequireDefault(_optionsFile);

var _typescript = require("typescript");

var _typescript2 = _interopRequireDefault(_typescript);

var _schemaUtils = require("schema-utils");

var _schemaUtils2 = _interopRequireDefault(_schemaUtils);

var _mime = require("mime");

var _mime2 = _interopRequireDefault(_mime);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var wasmFooterPath = __dirname + "/wasmFooter.js";
var wasmFooter = _fs2.default.readFileSync(wasmFooterPath, "utf-8");

function transpile2Wasm(source, wasm) {
    var length = wasm.length;
    var buffer = [];
    for (var i = 0; i < length; i += 1) {
        buffer.push(wasm[i]);
    }
    var module = "var buffer = new ArrayBuffer(" + wasm.length + ");\n        var uint8 = new Uint8Array(buffer);\n        uint8.set([" + buffer.join(",") + "]);\n        " + wasmFooter;
    return module;
}
function transpile2Js(source) {
    var compilerOptions = {
        compilerOptions: {
            target: _typescript2.default.ScriptTarget.ES5,
            module: _typescript2.default.ModuleKind.CommonJS,
            alwaysStrict: false
        }
    };
    var transpiled = _typescript2.default.transpileModule(source, compilerOptions);
    return transpiled.outputText;
}
function createCompatibleModuleInBundle(transpiledJs, transpiledWasm) {
    var module = `
      function p(deps) {
          return new Promise(function(resolve){
            var compatibleModule;
                    if (typeof WebAssembly !== 'undefined') {
                        ${transpiledWasm}
                        compatibleModule = WebAssemblyModule;

                    }
                    else {
                        ${transpiledJs}
                        compatibleModule = function() {};          compatibleModule.prototype.exports = exports;
                    }
            resolve(compatibleModule(deps).exports);;
          });
      }
      module.exports =p;`;
    return module;
}

function createCompatibleModuleOutBundle(publicPath) {
    return `
        function f(deps) {
            var fixedDeps = deps || {};
            if (!fixedDeps.env) {
                fixedDeps.env = { abort: function() {} };
            } else if (!fixedDeps.env.abort) {
                fixedDeps.env.abort = function() {};
            }
            return fetch(${publicPath}).then(function(response){
                return response.arrayBuffer();
            }).then(function(binary){
                    var module = new WebAssembly.Module(binary);
                    var instance = new WebAssembly.Instance(module, fixedDeps);
                    return instance.exports;
            });
        }
        module.exports =f;
            `;
}
function mkDirsSync(dirname) {
    if (_fs2.default.existsSync(dirname)) {
        return true;
    } else {
        if (mkDirsSync(_path2.default.dirname(dirname))) {
            _fs2.default.mkdirSync(dirname);
            return true;
        }
    }
}
function loader(source) {
    var innerCallback = this.async();
    var options = _loaderUtils2.default.getOptions(this) || {};
    (0, _schemaUtils2.default)(_optionsBytes2.default, options, "AssemblyScript-TypeScript Buffer Loader");
    if (this.cacheable) {
        this.cacheable();
    }
    var me = this;
    var targetPath = this._compiler.outputPath;
    var buildTempPath = _path2.default.join(this._compiler.context, "/temp/assembly/");
    targetPath = _path2.default.join(buildTempPath, _path2.default.parse(this.resourcePath).name + ".wasm");
    mkDirsSync(buildTempPath);
    _asc2.default.main([_path2.default.relative(process.cwd(), this.resourcePath), "-o", _path2.default.relative(process.cwd(), targetPath), "--optimize", "--validate", "--sourceMap"], function (err) {
        if (err) throw err;
        var distStates = _fs2.default.statSync(targetPath);
        var distFile = _fs2.default.readFileSync(targetPath);
        // Options `dataUrlLimit` is backward compatibility with first loader versions
        var limit = options.limit || me.options && me.options.url && me.options.url.dataUrlLimit;
        if (limit) {
            limit = parseInt(limit, 10);
        }
        // var mimetype = options.mimetype || options.minetype || mime.lookup(this.resourcePath)
        if (!limit || distStates.size < limit) {
            me.addDependency(wasmFooterPath);
            var jsModule = transpile2Js(source);
            var wasmModule = transpile2Wasm(source, new Buffer(distFile));
            return innerCallback(null, createCompatibleModuleInBundle(jsModule, wasmModule));
        } else {
            (0, _schemaUtils2.default)(_optionsFile2.default, options, "AssemblyScript-TypeScript File Loader");
            var url = _loaderUtils2.default.interpolateName(me, options.name, {
                me,
                content: distFile
            });
            var filePath = me.resourcePath;
            var outputPath = url;

            if (options.outputPath) {
                if (typeof options.outputPath === "function") {
                    outputPath = options.outputPath(url);
                } else {
                    outputPath = _path2.default.posix.join(options.outputPath, url);
                }
            }

            if (options.useRelativePath) {
                var _filePath = this.resourcePath;

                var issuerContext = context || me._module && me._module.issuer && me._module.issuer.context;

                var relativeUrl = issuerContext && _path2.default.relative(issuerContext, _filePath).split(_path2.default.sep).join("/");

                var relativePath = relativeUrl && `${_path2.default.dirname(relativeUrl)}/`;
                // eslint-disable-next-line no-bitwise
                if (~relativePath.indexOf("../")) {
                    outputPath = _path2.default.posix.join(outputPath, relativePath, url);
                } else {
                    outputPath = _path2.default.posix.join(relativePath, url);
                }
            }

            var publicPath = `__webpack_public_path__ + ${JSON.stringify(url)}`;
            if (options.publicPath !== undefined) {
                // support functions as publicPath to generate them dynamically
                publicPath = JSON.stringify(typeof options.publicPath === "function" ? options.publicPath(url) : options.publicPath + url);
            }
            if (options.emitFile === undefined || options.emitFile) {
                me.emitFile(outputPath, distFile);
            }
            innerCallback(null, createCompatibleModuleOutBundle(publicPath));
            return;
        }
    });
}