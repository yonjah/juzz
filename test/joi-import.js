'use strict';

// Load modules
const Fs          = require('fs');
const Path        = require('path');
const Lab         = require('lab');
const _           = require('lodash');
const Joi         = require('../joi/lib');
const Any         = require('../joi/lib/types/any');
const Juzz        = require('../lib');
const Helper      = require('../joi/test/helper');

// Test shortcuts

const { describe, it } = exports.lab = Lab.script();
const permutations = 10;
let descTitle = '';
let itTitle = '';

const schemas = [];

const anyValidate = Any.prototype.validate;


Any.prototype.validate = function (value, options) {

    if (options instanceof Function) {
        options = undefined;
    }

    const res =  anyValidate.call(this, value, options);
    if (!res.error) {
        schemas.push([itTitle, this, options && Object.assign({}, options)]);
    }

    return res;
};

Helper.validateOptions = function (schema, config, options) {

    let hasValidTest = false;
    const singleOptions = config.reduce((context, conf) => {

        hasValidTest = conf[1] || hasValidTest;
        if (!context && conf[2]) {
            return conf[2];
        }

        return context;
    }, null);

    hasValidTest && schemas.push([
        itTitle,
        Joi.compile(schema),
        (options || singleOptions) && Object.assign({}, options || {}, singleOptions || {})
    ]);
};

Lab.script = () => ({
    after: (func) => func(() => {}),
    before: (func) => func(() => {}),
    describe: (suiteTitle, func) => {

        descTitle = suiteTitle;
        func();
    },

    expect() {

        const obj = new Proxy(() => {}, {

            apply() {

                return true;
            },

            get() {

                return obj;
            }
        });
        return obj;
    },

    it: async (testTitle, func) => {

        if (testTitle.indexOf('errors') !== 0 && testTitle.indexOf('defines a rule') !== 0) { // skips tests that suppose to result in errors or that define new rules
            const loc = _.trim((new Error()).stack.split('\n')[2]);
            itTitle = `${loc} ${descTitle} ${testTitle}`;
            try {
                await func(() => {});
            }
            catch (e) {
                return;
            }
        }
    }
});

Object.assign(Lab, Lab.script());

const typesTestPath = Path.join(__dirname, '../joi/test/types');
Fs.readdirSync(typesTestPath).forEach((file) => {
    //we skip lazy as it's description fail to describe the correct schema
    file.indexOf('lazy.js') === -1 && require(Path.join(typesTestPath, file));
});

require('../joi/test');

Any.prototype.validate = anyValidate;

describe(`Juzz - Joi ${Joi.version}`, () => {

    schemas.forEach(([title, schema, options]) => {

        it(`schema from test ${title}${options ? '(' + JSON.stringify(options) + ')' : ''}`, () => {

            try {
                for (let i = 0; i < permutations; i += 1) {
                    const example = Juzz(schema, { context: options && options.context, strict: true });
                    const { error } = schema.validate(example, options);
                    if (error) {
                        throw new Error(`${JSON.stringify(example)} failed schema validation ${error}`);
                    }
                }
            }
            catch (e) {
                if (e.message.indexOf('myType') === -1) {
                    throw e;
                }
            }
        });
    });
});
