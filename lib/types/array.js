'use strict';

const debug = require('debug')('Juzz:Array');
const Tools = require('../tools.js');
const DescHelpers = require('../descHelpers.js');

const { chance, _ } = Tools;

Tools.setDebugColor(debug);
Tools.debug.array = debug;

const ArrayExample = {
    joiArrayExample(desc, rules) {

        let { length, min, max, unique } = rules;
        const { flags = {} } = desc;

        if (flags.ref) {
            const [refType, refRule] = flags.ref;
            Tools.debug.ref('array rules', refType, rules);
            switch (refRule) {
                case 'values':
                    min = min || this.options[`${refType}Min`] || 1;
                    break;
                default:
                    if (this.options.strict) {
                        throw new Error(`Type unknown ref for ${refRule}`);
                    }
            }

            Tools.debug.ref('array rules', refType, { min });
        }

        const res = [];
        let  items = desc.items || [{ type: 'any' }];
        const orderedItems = desc.orderedItems || [];
        const sparse = flags.sparse || false;

        if (orderedItems.length) {
            return orderedItems.map((item) => this.genExample(sparse ? item : DescHelpers.forceValue(item)));
        }

        if (length === undefined) {
            length = chance.integer({ min: min || this.options.arrayMin, max : max === undefined ? this.options.arrayMax : max });
        }

        const allowedItems = items.filter((item) => {

            return !item.flags || item.flags.presence !== 'forbidden';
        });

        items = (allowedItems.length ? allowedItems : items).map((item) => {

            if (item.flags) {
                if (item.flags.presence === 'required') {
                    res.push(this.genExample(DescHelpers.forceValue(item)));
                }
                else if (item.flags.presence === 'forbidden') {
                    item = Object.assign({}, item);
                    item.flags = Object.assign({}, item.flags, { presence: 'ignore' });
                    item = DescHelpers.negative(item);
                }
            }

            return item;
        });

        for (let i = res.length; i < length; i += 1) {
            const item = chance.pickone(items);
            if (!sparse || (item.flags && item.flags.presence === 'required')) {
                res.push(this.genExample(DescHelpers.forceValue(item)));
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

        if (flags.single && res.length === 1 && chance.bool()) {
            return res[0];
        }

        return res;
    }
};


module.exports = ArrayExample;
