'use strict';

const Tools    = require('../tools.js');

const { chance } = Tools;
const debug    = require('debug')('joiExample:Number');

Tools.setDebugColor(debug);
Tools.debug.number = debug;

const NumberExample = {
    joiNumberExample(desc, rules) {

        let res;
        const rawRules = this.joiDescRulesObject(desc, false);
        if (desc.flags && desc.flags.ref) {
            const [refType, refRule] = desc.flags.ref;
            Tools.debug.ref('number rules', refType, rawRules);
            switch (refRule) {
                case 'length':
                    rawRules.min = rawRules.min || this.options[`${refType}Min`];
                    rawRules.max = rawRules.max || this.options[`${refType}Max`];
                    rawRules.integer = true;
                    break;
                case 'min':
                case 'less':
                    rawRules.min = rawRules.min || this.options[`${refType}Min`];
                    rawRules.max = rawRules.max || (this.options[`${refType}Max`] && this.options[`${refType}Max`] - 1);
                    rawRules.integer = true;
                    break;
                case 'max':
                case 'greater':
                    rawRules.min = rawRules.min || (this.options[`${refType}Min`] && this.options[`${refType}Min`] + 1);
                    rawRules.max = rawRules.max || this.options[`${refType}Max`];
                    rawRules.integer = true;
                    break;
                case 'values':
                    break;
                case 'multiple':
                    rawRules.integer = true;
                    rawRules.min = 0;
                    break;
                default:
                    if (this.options.strict) {
                        throw new Error(`Type unknown ref for ${refRule}`);
                    }
            }

            Object.assign(rules, rawRules);
            Tools.debug.ref('number rules', refType, rawRules, rules);
        }

        if (rules.negative && rules.positive) {
            return;
        }

        if (rules.port) {
            rules.min = rawRules.min || 0;
            rules.max = rawRules.max || 65535;
            rules.integer = true;
        }

        let min = rules.min; let max = rules.max;
        if (rules.greater && (min === undefined || rules.greater > min)) {
            min = rules.greater + 1;
        }

        if (rules.less && (max === undefined || rules.less < max)) {
            max = rules.less - 1;
        }

        if (rules.positive) {
            min = min > 1 ? min : 1;
        }

        if (rules.negative) {
            max = max < -1 ? max : -1;
        }

        debug({ min, max }, rules);

        if (rules.integer) {
            res = chance.integer({ min, max });
        }
        else {
            res = chance.floating({ min, max, fixed: desc.flags && desc.flags.precision || rules.precision });
        }


        if (rules.multiple) {
            res = res - (res % rules.multiple);
        }

        return res;
    }
};


module.exports = NumberExample;
