'use strict';

const Util       = require('util');
const _          = require('lodash');

const defOptions = {
    replace(res) {

        return res;
    },
    extendedTypes: [],
    extendedTypesDict: {},
    context: {},
    strict: true,
    stringMin: 0,
    stringMax: 1000,
    arrayMin: 0,
    arrayMax: 10,
    objectMin: 0,
    objectMax: 10,
    numberMin: -10e6,
    numberMax: 10e6
};

const { debug, setDebugColor, knownKeys, chance } = require('./tools.js');

const ObjectType = require('./types/object.js');
const NumberType = require('./types/number.js');
const StringType = require('./types/string.js');
const DateType   = require('./types/date.js');
const FuncType   = require('./types/function.js');

debug.array        = require('debug')('joiExample:Array');
setDebugColor(debug.array);
debug.alternatives = require('debug')('joiExample:Alternatives');
setDebugColor(debug.alternatives);
debug.boolean      = require('debug')('joiExample:Boolean');
setDebugColor(debug.boolean);
debug.any          = require('debug')('joiExample:Any');
setDebugColor(debug.any);
debug.binary       = require('debug')('joiExample:Binary');
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

                if (knownKeys.rules.indexOf(entry.name) === -1)	{
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

    genExample(desc, retry = 10) {

        let possibleValues; let res;

        this.debugDesc(desc);
        this.testStrict(desc);

        desc.type = this.options.extendedTypesDict[desc.type] || desc.type;

        const rules = this.joiDescRulesObject(desc);

        Object.keys(rules.refs).forEach((ruleKey) => {

            const refKey = rules.refs[ruleKey];
            debug.ref(ruleKey, '=>', refKey);
            const refRes = this.addChildRef(refKey, ruleKey, desc, { type: desc.type === 'date' ? 'date' : 'number' });
            rules[ruleKey] = refRes;
            desc.rules = desc.rules.map((rule) => {

                return rule.name === ruleKey ? { name: ruleKey, arg: refRes } : rule;
            });
        });

        if (desc.flags && desc.flags.allowOnly) {
            res = chance.pickone(desc.valids);
            if (this.isReferance(res)) {
                const refKey = this.getRefKey(res);
                this.getDebugForType(desc.type)('result is reference for ', refKey);
                res = this.addChildRef(refKey, 'values', desc);
            }
            else if (this.isContext(res)) {
                const contKey = this.getContextKey(res);
                this.getDebugForType(desc.type)('result is context for ', contKey);
                res = this.options.context[contKey];
                if (res === undefined) {
                    throw new Error(`did not get context "${contKey}" as allowOnly for ${desc.type}`);
                }
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
                    res = this.genExample(this.fakeDesc(chance.pickone(_.difference(knownKeys.type, ['any'])), desc));
                    break;
                case 'binary':
                    res = Buffer.from(this.genExample(Object.assign({}, desc, { type: 'string' })));
                    break;
                    // case 'func':
                    // 	break;
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

        res = this.options.replace(res, desc, rules);
        this.debugRes(res, desc.type);
        return res;
    },

    isReferance(val) {

        return typeof val === 'string' && val.indexOf('ref:') === 0;
    },

    getRefKey(val) {

        return val.substring(4);
    },

    isContext(val) {

        return typeof val === 'string' && val.indexOf('context:') === 0;
    },

    getContextKey(val) {

        return val.substring(8);
    },

    getAlternativeVal(desc) {

        const { children, res } = this.context || {};
        const refs = [];
        const peeks = [];
        const descs = [];

        this.debugDesc(desc);

        desc.alternatives.forEach((alt) => {

            if (alt.ref) {
                refs.push(alt);
            }
            else if (alt.peek) {
                peeks.push(alt);
            }
            else {
                descs.push(alt);
            }
        });

        if (refs.length) {
            let val;

            refs.forEach((ref, i) => {

                if (val === undefined && (ref.otherwise || i === refs.length - 1 || chance.bool())) {
                    debug.alternatives('Picked Ref');
                    debug.alternatives(ref);
                    const refKey = this.getRefKey(ref.ref);
                    const isDesc = Object.assign({ flags: {} }, children[refKey], ref.is);
                    const isValue = isDesc.type === 'alternatives' ? this.getAlternativeVal(isDesc) : this.genExample(isDesc);
                    if (ref.then && (!ref.otherwise || chance.bool())) {
                        res[refKey] = isValue;
                        val = this.genExample(ref.then);
                    }
                    else {
                        res[refKey] = this.genExample(children[refKey]);
                        val = this.genExample(ref.otherwise);
                    }
                }
            });

            return val;
        }

        if (peeks.length) {
            const peek = chance.pickone(peeks);
            debug.alternatives('Picked peek');
            debug.alternatives(Util.inspect(peek, { colors: true, depth: 6 }));
            if (peek.peek.type === 'object' && peek.then.type === 'object') {
                const peekDesc = Object.assign({}, peek.then);
                peekDesc.children = Object.assign({}, peekDesc.children, peek.peek.children);
                return this.genExample(peekDesc);
            }

            return this.genExample(peek.then);
        }

        return this.genExample(chance.pickone(descs));
    },

    joiArrayExample(desc, rules) {

        let { length, min, max, unique } = rules;
        const res = [];
        let  items = desc.items || [{ type: 'any' }];
        const orderedItems = desc.orderedItems || [];
        const sparse = desc.flags && desc.flags.sparse || false;

        if (orderedItems.length) {
            return orderedItems.map((item) => this.genExample(sparse ? item : this.forceValue(item)));
        }

        if (length === undefined) {
            length = chance.integer({ min, max });
        }

        const allowedItems = items.filter((item) => {

            return !item.flags || item.flags.presence !== 'forbidden';
        });

        items = (allowedItems.length ? allowedItems : items).map((item) => {

            if (item.flags) {
                if (item.flags.presence === 'required') {
                    res.push(this.genExample(this.forceValue(item)));
                }
                else if (item.flags.presence === 'forbidden') {
                    item = Object.assign({}, item);
                    item.flags = Object.assign({}, item.flags, { presence: 'ignore' });
                    item = this.negativeDesc(item);
                }
            }

            return item;
        });

        for (let i = res.length; i < length; i += 1) {
            const item = chance.pickone(items);
            if (!sparse || (item.flags && item.flags.presence === 'required')) {
                res.push(this.genExample(this.forceValue(item)));
            }
            else {
                res.push(this.genExample(item));
            }
        }

        if (unique) {
            if (unique.comparator) {
                return res.reduce((uniqRes, item) => {

                    if (!uniqRes.some((a) => unique.comparator(a, item))) {
                        uniqRes.push(item);
                    }

                    return uniqRes;
                }, []);
            }

            return _.uniqBy(res, JSON.stringify);
        }

        return res;
    },

    forceValue(desc) {

        if (['object', 'array'].indexOf(desc.type) >= 0) {

            const { min, length } = this.joiDescRulesObject(desc);
            if (!length && !min) {
                desc = Object.assign({ rules: [] }, desc);
                desc.rules = desc.rules.concat([{ name: 'min', arg: 1 }]);
            }
        }

        return desc;
    },

    exclude(desc, excludeDesc) {

        if (excludeDesc.type === 'alternatives') {

            return excludeDesc.alternatives.reduce(this.exclude, desc);
        }

        if (desc.type !== excludeDesc.type) {
            return desc;
        }

        desc = Object.assign({ rules: [] }, desc);
        if (excludeDesc.valids) {
            desc.invalids = (desc.invalids || []).concat(excludeDesc.valids);
            return desc;
        }

        const rules = this.joiDescRulesObject(desc, false, false);
        const excludeRules = this.joiDescRulesObject(excludeDesc, false, false);

        if (excludeRules.length && rules.length && excludeRules.length !== rules.length) {
            return desc;
        }

        if (excludeRules.min) {
            desc.rules = desc.rules.concat({ name: 'max', arg: excludeRules.min });
            return desc;
        }

        if (excludeRules.max) {
            desc.rules = desc.rules.concat({ name: 'min', arg: excludeRules.max });
        }

        return desc;
    },

    negativeDesc(desc) {

        const newType = chance.pickone(_.difference(knownKeys.type, [desc.type, 'any', 'alternatives', 'array']));
        const newDesc = this.fakeDesc(newType, desc);
        debug('NEGATIVE', newType, newDesc);
        return newDesc;

    },

    fakeDesc(type, desc) {

        if (type === 'array') {
            return Object.assign({}, desc, {
                type,
                items: [
                    this.fakeDesc(chance.pickone(_.difference(knownKeys.type, ['any'])), desc)
                ] }
            );
        }

        if (type === 'alternatives') {
            return Object.assign({}, desc, {
                type,
                alternatives: [
                    this.fakeDesc(chance.pickone(_.difference(knownKeys.type, ['any'])), desc),
                    this.fakeDesc(chance.pickone(_.difference(knownKeys.type, ['any'])), desc)
                ] }
            );
        }

        if (type === 'boolean') {
            return Object.assign({}, desc, { type, truthy: [true], falsy: [false] });
        }

        return  Object.assign({}, desc, { type });
    },

    joiDescRulesObject(desc, addDefaults = true, parseRefs = true) {

        const obj = { refs: {} };
        desc.rules && desc.rules.forEach((rule) => {

            if (rule.arg && this.isContext(rule.arg)) { // not handling context at the moment
                const key = this.getContextKey(rule.arg);
                const val = this.options.context[key];
                if (val === undefined) {
                    throw new Error(`did not get context "${key}" as rule ${rule.name} for ${desc.type}`);
                }

                obj[rule.name] = val;
            }
            else if (parseRefs && rule.arg && this.isReferance(rule.arg)) {
                obj.refs[rule.name] = this.getRefKey(rule.arg);
            }
            else {
                obj[rule.name] = (rule.arg === undefined  || rule.arg === null) ? true : rule.arg;
            }
        });

        if (addDefaults) {
            if (this.options[`${desc.type}Min`] !== undefined && typeof obj.min !== 'string' && !obj.refs.min) {
                obj.min = Math.max(obj.min === 0 ? obj.min : (obj.min || this.options[`${desc.type}Min`]), Math.min(obj.max || Infinity, this.options[`${desc.type}Min`]));
            }

            if (this.options[`${desc.type}Max`] !== undefined && typeof obj.max !== 'string' && !obj.refs.max) {
                obj.max = Math.max(obj.min === 0 ? obj.min : (obj.min || this.options[`${desc.type}Max`]), Math.min(obj.max || Infinity, this.options[`${desc.type}Max`]));
            }
        }

        debug.rules(desc.type, obj);
        return obj;
    }
}, ObjectType, NumberType, StringType, DateType, FuncType);

module.exports = function CreateExample(schema, op) {

    const exampleGen = Object.create(ExampleTools);
    exampleGen.options = op ? Object.assign({ joi: schema._currentJoi }, defOptions, op) : defOptions;
    return exampleGen.genExample(schema.describe());
};
