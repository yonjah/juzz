'use strict';

const DescHelpers = require('./descHelpers.js');
const RefHelpers = require('./refHelpers');
const { debug, setDebugColor, knownKeys, chance, _ } = require('./tools.js');

const defOptions = {
    replace(res) {

        return res;
    },
    extendedTypes: [],
    extendedTypesDict: {},
    context: {},
    strict: false,
    stringMin: 0,
    stringMax: 1000,
    arrayMin: 0,
    arrayMax: 10,
    objectMin: 0,
    objectMax: 10,
    numberMin: -10e6,
    numberMax: 10e6,
    numberPrecision: 4
};


const ArrayExample        = require('./types/array.js');
const ObjectType          = require('./types/object.js');
const NumberType          = require('./types/number.js');
const StringType          = require('./types/string.js');
const DateType            = require('./types/date.js');
const FuncType            = require('./types/function.js');
const AlternativesExample = require('./types/alternatives.js');

debug.boolean      = require('debug')('Juzz:Boolean');
setDebugColor(debug.boolean);
debug.any          = require('debug')('Juzz:Any');
setDebugColor(debug.any);
debug.binary       = require('debug')('Juzz:Binary');
setDebugColor(debug.binary);

const ExampleTools = Object.assign({
    context: null,

    testStrictProperty(prop, obj) {

        if (obj && knownKeys[prop]) {
            const dif = _.difference(Object.keys(obj), knownKeys[prop]);
            if (dif.length) {
                debug.enabled && dif.forEach((key) => debug('unknown key', key, obj[key]));
                throw new Error(`${prop} has unknown keys ${dif}`);
            }
        }
    },

    testStrictRules(rules) {

        if (rules) {
            const unknown = [];
            rules.forEach((entry) => {

                if (knownKeys.rules.indexOf(entry.name) === -1) {
                    unknown.push(entry.name);
                    debug('unknown rule', entry);
                }
            });
            if (unknown.length) {
                throw new Error(`rules has unknown entries ${unknown}`);
            }
        }
    },

    testStrictType(type) {

        if (knownKeys.type.indexOf(type) === -1 && this.options.extendedTypes.indexOf(type) === -1) {
            throw new Error(`type is unknown ${type}`);
        }
    },

    testStrict(desc) {

        if (this.options.strict) {
            this.testStrictType(desc.type);
            this.testStrictRules(desc.rules);
            this.testStrictProperty('flags', desc.flags);
            this.testStrictProperty('options', desc.options);
            this.testStrictProperty(desc.type, desc);
        }
    },

    debugDesc(desc) {

        const typeDebug = this.getDebugForType(desc.type);
        if (typeDebug.enabled) {
            typeDebug(desc);
        }
        else {
            debug.rules(desc.type, desc.rules);
            debug.type(desc.type, desc.type);
            debug.flags(desc.type, desc.flags);
            debug.options(desc.type, desc.options);
        }
    },

    debugRes(res, type) {

        const typeDebug = this.getDebugForType(type);
        if (typeDebug.enabled) {
            typeDebug('RESULT', res);
        }
        else {
            debug.result(res);
        }
    },

    getDebugForType(type) {

        return debug[type] ? debug[type]  : debug.any.bind(debug, type);
    },

    genExample(origDesc, retry = 10) {

        let possibleValues; let res;

        const desc = _.clone(origDesc);
        desc.type = this.options.extendedTypesDict[desc.type] || desc.type;

        this.debugDesc(desc);
        this.testStrict(desc);


        const rules = DescHelpers.parseRules(desc);

        const { flags = {} } = desc;

        if (flags.presence === 'forbidden') {
            return;
        }

        Object.keys(rules.refs).forEach((ruleKey) => {

            const { key: refKey, alter } = rules.refs[ruleKey];
            debug.ref(ruleKey, '=>', refKey);
            const refRes = this.addChildRef(refKey, ruleKey, desc, { type: desc.type === 'date' ? 'date' : 'number' });
            rules[ruleKey] = refRes;
            desc.rules = desc.rules.map((rule) => {

                return rule.name === ruleKey ? { name: ruleKey, arg: refRes } : rule;
            });

            rules[ruleKey] = alter(refRes);
        });

        Object.keys(rules.context).forEach((ruleKey) => {

            const { key: refKey, alter } = rules.context[ruleKey];
            const refValue = this.options.context[refKey];
            debug.ref('context', ruleKey, '=>', refKey);
            if (refValue === undefined) {
                throw new Error(`did not get context "${refKey}" as rule ${ruleKey} for ${desc.type}`);
            }

            desc.rules = desc.rules.map((rule) => {

                return rule.name === ruleKey ? { name: ruleKey, arg: refValue } : rule;
            });

            rules[ruleKey] = alter(refValue);
        });

        if (flags.allowOnly) {
            res = chance.pickone(desc.valids);
            if (RefHelpers.isReferance(res)) {
                const { key: refKey, alter } = RefHelpers.getRef(res);
                this.getDebugForType(desc.type)('result is reference for ', refKey);
                res = this.addChildRef(refKey, 'values', desc);
                if (_.isArray(res)) {
                    res = chance.pickone(res);
                }

                res = alter(res);
            }
            else if (RefHelpers.isContext(res)) {
                const { key: contKey, alter } = RefHelpers.getContext(res);
                this.getDebugForType(desc.type)('result is context for ', contKey);
                res = this.options.context[contKey];
                if (res === undefined) {
                    throw new Error(`did not get context "${contKey}" as allowOnly for ${desc.type}`);
                }

                if (_.isArray(res)) {
                    res = chance.pickone(res);
                }

                res = alter(res);
            }
        }
        else {
            switch (desc.type) {
                case 'object':
                    res = this.joiObjectExample(desc, rules);
                    break;
                case 'array':
                    res = this.joiArrayExample(desc, rules);
                    break;
                case 'alternatives':
                    res = this.getAlternativeVal(desc);
                    break;
                case 'string':
                    res = this.joiStringExample(desc, rules);
                    break;
                case 'number':
                    res = this.joiNumberExample(desc, rules);
                    break;
                case 'symbol':
                    res = Symbol('a');
                    break;
                case 'boolean':
                    possibleValues = _.difference(_.union(desc.truthy, desc.falsy), desc.invalids || []);
                    if (!possibleValues.length) {
                        throw new Error(`Could not find possible boolean values truthy: ${desc.truthy} falsy: ${desc.falsy} invalids: ${desc.invalids}`);
                    }

                    res = chance.pickone(possibleValues);
                    break;
                case 'date':
                    res = this.joiDateExample(desc, rules);
                    break;
                case 'any':
                    res = this.genExample(DescHelpers.fake(desc, chance.pickone(_.difference(knownKeys.type, ['any']))));
                    break;
                case 'binary':
                    res = Buffer.from(this.genExample(Object.assign({}, desc, { type: 'string' })));
                    if (flags.encoding) {
                        res = res.toString(desc.flags.encoding);
                    }

                    break;
                    // case 'func':
                    //  break;
                default:
                    if (this.options.strict) {
                        throw new Error(`Type ${desc.type} is unknown ${JSON.stringify(desc)}`);
                    }
            }
        }

        if (retry && desc.invalids && desc.invalids.indexOf(res) >= 0 ) { //will retry to recreate the value only once if it's matches an invalid value
            debug('RETRY', retry, res, desc);
            res = this.genExample(desc, retry - 1);
        }

        res = this.options.replace(res, origDesc, rules);
        this.debugRes(res, desc.type);
        return res;
    }

}, ArrayExample, ObjectType, NumberType, StringType, DateType, FuncType, AlternativesExample);

module.exports = function CreateExample(schema, op) {

    const exampleGen = Object.create(ExampleTools);
    exampleGen.options = op ? Object.assign({ joi: schema._currentJoi }, defOptions, op) : defOptions;
    return exampleGen.genExample(schema.describe());
};
