'use strict';

var WebAssemblyModule = function WebAssemblyModule(deps) {
    var defaultDeps = {
        'global': {},
        'env': {
            'memory': new WebAssembly.Memory({
                initial: 10,
                limit: 100 }),
            'table': new WebAssembly.Table({
                initial: 0,
                element: 'anyfunc' })
        }
    };
    return new WebAssembly.Instance(new WebAssembly.Module(buffer), deps || defaultDeps);
};