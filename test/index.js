'use strict';

// Load modules
const fs     = require('fs');
const path   = require('path');
const lab    = require('lab');
const _      = require('lodash');
const Joi    = require('../joi/lib');
const joiExample  = require('../lib');
const Helper = require('../joi/test/helper');


// Declare internals

const internals = {};


// Test shortcuts

const { describe, it, expect, before } = exports.lab = lab.script();
let descTitle = '', title = '';

const schemas = [];
Helper.validateOptions = function (schema, config, options) {
    let hasValidTest = false;
    const singleOptions = config.reduce((context, conf) => {
        hasValidTest = conf[1] || hasValidTest;
        if (!context && conf[2]) {
            return conf[2];
        }
        return context;
    }, null)
    hasValidTest && schemas.push([
        title,
        Joi.compile(schema),
        (options || singleOptions) && Object.assign(options || {}, singleOptions || {})
    ]);
}

lab.script = () => ({
    after: (func) => func(),
    before: (func) => func(),
    describe: (suiteTitle, func) => {
        descTitle = suiteTitle;
        func()
    },
    expect () {
        const obj = new Proxy(() => {}, {
            apply () {
                return true;
            },
            get () {
                return obj;
            }
        });
        return obj;
    },
    it: async (testTitle, func) => {
        if (testTitle.indexOf('errors') !== 0 && testTitle.indexOf('defines a rule') !== 0) { // skips tests that suppose to result in errors or that define new rules
            const loc = _.trim((new Error()).stack.split('\n')[2]);
            title = `${loc} ${descTitle} ${testTitle}`;
            try {
                await func();
            } catch (e) {
                return;
            }
        }
    }
})


const typesTestPath = path.join(__dirname, '../joi/test/types');
fs.readdirSync(typesTestPath).forEach((file) => {
    //we skip lazy as it's description fail to describe the correct schema
    file.indexOf('lazy.js') === -1 && require(path.join(typesTestPath, file))
});

require('../joi/test');


// const testSchema = Joi.object().keys({
//     a: Joi.alternatives().when('b', { is: Joi.ref('c'), then: 'x' }).try('b'),
//     b: Joi.any(),
//     c: Joi.number(),
//     d: Joi.alternatives().when('b', { is: Joi.any().valid('ref:c'), then: 'x' }).try('c'),
// });

// console.log(require('util').inspect(testSchema.describe(), {depth: 6, colors: true}));
// console.log(testSchema.validate({a: 'b', b: 'ref:c', c: 1, d: 'x'}));
// process.exit(1);


describe('Joi example', () => {
    schemas.forEach(([title, schema, options]) => {
        it(`schema from test ${title}${options ? '(' + JSON.stringify(options) + ')' : ''}`, () => {
            try {
                for (let i = 0; i < 10; i += 1) {
                    const example = joiExample(schema, {context: options && options.context});
                    const {error} = schema.validate(example, options);
                    if (error) {
                        throw new Error(`${JSON.stringify(example)} failed schema validation ${error}`);
                    }
                }
            } catch (e) {
                if (e.message.indexOf('myType') === -1) {
                    throw e;
                }
            }
        })
    })
});