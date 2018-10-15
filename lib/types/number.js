'use strict';

const debug = require('debug')('Juzz:Number');
const Tools = require('../tools.js');

const { chance } = Tools;

Tools.setDebugColor(debug);
Tools.debug.number = debug;

const NumberExample = {
    joiNumberExample(desc, rules) {

        let res;
        let { min, max, integer } = rules;
        const { negative, positive, port, greater, less, multiple } = rules;
        const { flags = {} } = desc;

        if (flags.ref) {
            const [refType, refRule] = flags.ref;
            Tools.debug.ref('number rules', refType, rules);
            switch (refRule) {
                case 'length':
                    min = min === undefined ? this.options[`${refType}Min`] : min;
                    max = max === undefined ? this.options[`${refType}Max`] : max;
                    integer = true;
                    break;
                case 'min':
                case 'greater':
                    min = min === undefined  ? this.options[`${refType}Min`] : min;
                    max = max === undefined  ? (this.options[`${refType}Max`] && this.options[`${refType}Max`] - 1) : max;
                    integer = true;
                    break;
                case 'max':
                case 'less':
                    min = min === undefined  ? (this.options[`${refType}Min`] && this.options[`${refType}Min`] + 1) : min;
                    max = max === undefined  ? this.options[`${refType}Max`] : max;
                    if (['array', 'object'].includes(refType) &&  min <= 0) {
                        min += 1;
                    }

                    integer = true;
                    break;
                case 'values':
                    break;
                case 'multiple':
                    integer = true;
                    min = 0;
                    break;
                default:
                    if (this.options.strict) {
                        throw new Error(`Type unknown ref for ${refRule}`);
                    }
            }

            Tools.debug.ref('number rules', refType, { min, max, integer });
        }

        if (negative && positive) {
            debug('Aborting numeric value due to both positive and negative rules apply');
            return;
        }

        if (port) {
            min = Math.max(min || 0, rules.min || 0, 0);
            max = Math.min(max === undefined ? 65535 : max, rules.max  === undefined ? 65535 : rules.max, 65535);
            integer = true;
        }

        if (greater && (min === undefined || greater > min)) {
            min = greater + 1;
        }

        if (less && (max === undefined || less < max)) {
            max = less - 1;
        }

        if (positive) {
            min = min > 1 ? min : 1;
        }

        if (negative) {
            max = max < -1 ? max : -1;
        }

        debug({ min, max }, rules);

        if (integer) {
            res = chance.integer({ min, max });
        }
        else {
            let fixed = flags.precision !== undefined ? flags.precision : rules.precision;
            if (fixed === undefined) {
                fixed = this.options.numberPrecision;
                const multiply = Math.pow(10, fixed);
                const maxInt = Number.MAX_SAFE_INTEGER / multiply;
                const minInt = Number.MIN_SAFE_INTEGER / multiply;

                if ( (min && min > maxInt) ||  (max && max < minInt) ) {
                    // min, max is bigger than floats chance can generate so assume implicit integer
                    fixed = 0;
                }
            }

            res = chance.floating({ min, max, fixed });
        }


        if (multiple) {
            res = res - (res % multiple);
        }

        return res;
    }
};


module.exports = NumberExample;
