'use strict';

const RefHelpers = require('./refHelpers');
const { debug, knownKeys, chance, _ } = require('./tools.js');


const DescHelpers = {

    forceValue(desc) {

        if (['object', 'array'].indexOf(desc.type) >= 0) {

            const { min, length } = DescHelpers.parseRules(desc);
            if (!length && !min) {
                desc = Object.assign({ rules: [] }, desc);
                desc.rules = desc.rules.concat([{ name: 'min', arg: 1 }]);
            }
        }

        return desc;
    },

    exclude(desc, excludeDesc) {

        if (excludeDesc.type === 'alternatives') {
            let altDesc;
            if (desc.type === 'alternatives') {
                altDesc = desc.clone();
                altDesc.alternatives = [];
            }
            else {
                altDesc = {
                    type: 'alternatives',
                    base: desc,
                    alternatives: []
                };
            }

            const { refs, peeks, descs } = DescHelpers.parseAlternatives(excludeDesc.alternatives);

            if (refs.length) {
                refs.forEach((ref) => {

                    const { then, otherwise } = ref;
                    ref = Object.assign({}, ref);
                    ref.then = otherwise;
                    ref.otherwise = then;
                    altDesc.alternatives.push(ref);
                });
            }

            if (peeks.length) {
                peeks.forEach((peek) => {

                    if (peek.then.type === desc.type) {
                        altDesc.alternatives.push(DescHelpers.exclude(desc, peek.then));
                    }
                });
            }

            if (descs.length) {
                peeks.forEach((childDesc) => {

                    if (childDesc.type === desc.type) {
                        altDesc.alternatives.push(DescHelpers.exclude(desc, childDesc));
                    }
                });
            }

            return altDesc;
        }

        if (desc.type !== excludeDesc.type) {
            return desc;
        }

        desc = Object.assign({ rules: [] }, desc);
        if (excludeDesc.valids) {
            desc.invalids = (desc.invalids || []).concat(excludeDesc.valids);
            return desc;
        }

        const rules = DescHelpers.parseRules(desc, false);
        const excludeRules = DescHelpers.parseRules(excludeDesc, false);

        if (excludeRules.length && rules.length && excludeRules.length !== rules.length) {
            return desc;
        }

        if (excludeRules.less) {
            desc.rules = desc.rules.concat({ name: 'min', arg: excludeRules.less });
        }
        else if (excludeRules.greater) {
            desc.rules = desc.rules.concat({ name: 'max', arg: excludeRules.greater });
        }
        else if (excludeRules.min) {
            if (desc.type === 'number') {
                desc.rules = desc.rules.concat({ name: 'less', arg: excludeRules.min });
            }
            else {
                let arg;
                if (typeof excludeRules.min === 'string') {
                    arg = { ref: excludeRules.min, alter: (res) => res - 1 };
                }
                else {
                    arg = excludeRules.min - 1;
                }

                desc.rules = desc.rules.concat({ name: 'max', arg });
            }
        }
        else if (excludeRules.max) {
            if (desc.type === 'number') {
                desc.rules = desc.rules.concat({ name: 'greater', arg: excludeRules.max });
            }
            else {
                let arg;
                if (typeof excludeRules.max === 'string') {
                    arg = { ref: excludeRules.max, alter: (res) => res + 1 };
                }
                else {
                    arg = excludeRules.max + 1;
                }

                desc.rules = desc.rules.concat({ name: 'min', arg });
            }
        }

        return desc;
    },

    negative(desc) {

        const newType = chance.pickone(_.difference(knownKeys.type, [desc.type, 'any', 'alternatives', 'array']));
        const newDesc = DescHelpers.fake(desc, newType);
        debug('NEGATIVE', newType, newDesc);
        return newDesc;

    },

    fake(desc, type) {

        if (type === 'array') {
            return Object.assign({}, desc, {
                type,
                items: [
                    DescHelpers.fake(desc, chance.pickone(_.difference(knownKeys.type, ['any'])))
                ] }
            );
        }

        if (type === 'alternatives') {
            return Object.assign({}, desc, {
                type,
                alternatives: [
                    DescHelpers.fake(desc, chance.pickone(_.difference(knownKeys.type, ['any']))),
                    DescHelpers.fake(desc, chance.pickone(_.difference(knownKeys.type, ['any'])))
                ] }
            );
        }

        if (type === 'boolean') {
            return Object.assign({}, desc, { type, truthy: [true], falsy: [false] });
        }

        return  Object.assign({}, desc, { type });
    },

    parseAlternatives(alternatives) {

        const refs  = [];
        const peeks = [];
        const descs = [];
        alternatives.forEach((alt) => {

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

        return { refs, peeks, descs };
    },

    parseRules(desc, parseRefs = true) {

        const obj = { refs: {}, context: {} };
        desc.rules && desc.rules.forEach((rule) => {

            if (parseRefs && rule.arg && RefHelpers.isContext(rule.arg)) {
                addRule(obj.context, rule.name, RefHelpers.getContext(rule.arg));
            }
            else if (parseRefs && rule.arg && RefHelpers.isReferance(rule.arg)) {
                addRule(obj.refs, rule.name, RefHelpers.getRef(rule.arg));
            }
            else {
                addRule(obj, rule.name, rule.arg);
            }
        });

        debug.rules(desc.type, obj);
        return obj;
    },

    merge(main, source) {

        if (main.type === 'any') {
            return source.clone();
        }

        if (main.type !== source.type) {
            throw new Error(`Can not merege desc type ${main.type} to ${source.type}`);
        }

        return Object.assign({}, main, source, {
            rules: (main.rules || []).concat((source.rules || [])),
            flags: Object.assign({}, main.flags, source.flags),
            options: Object.assign({}, main.options, source.options)
        });
    }

};

const arrayRules = ['has', 'assert'];

const addRule = function (context, name, value) {

    value = (value === undefined || value === null) ? true : value;
    if (arrayRules.includes(name)) {
        context[name] = (context[name] || []).concat(value);
    }
    else {
        context[name] = value;
    }
};

module.exports = DescHelpers;
