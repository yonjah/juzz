'use strict';

const debug = require('debug')('Juzz:Func');
const Tools = require('../tools.js');

const { chance } = Tools;

Tools.setDebugColor(debug);
Tools.debug.func = debug;

const FuncExample = {
    joiFuncExample(desc, rules) {

        let arity = rules.arity;

        if (rules.ref) {
            return this.options.joi.ref('a');
        }

        if (rules.class) {
            return class fakeClass {};
        }

        if (arity === undefined) {
            const min = rules.minArity || 0;
            const max = rules.maxArity || (min + 10);
            arity = chance.integer({ min, max });
        }

        const args = [null];
        for (let i = 0; i < arity; i += 1) {
            args.push(`arg${i + 1}`);
        }

        args.push('return undefined;');
        return new (Function.prototype.bind.apply(Function, args))();
    }
};


module.exports = FuncExample;
