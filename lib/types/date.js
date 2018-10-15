'use strict';

const debug  = require('debug')('Juzz:Date');
const Moment = require('moment');
const Tools  = require('../tools.js');

const { chance } = Tools;

Tools.setDebugColor(debug);
Tools.debug.date = debug;

const DateExample = {
    getTime( val ) {

        if (!val) {
            return undefined;
        }

        if (typeof val === 'number') {
            return val;
        }

        if (val === 'now') {
            return Date.now();
        }

        if (!val.getTime) {
            throw new Error(`could not getTime from val ${val} of type ${typeof val}`);
        }

        return val.getTime();
    },

    joiDateExample(desc, rules) {

        let { min, max, greater, less }  = rules;


        let res = chance.date();
        if (min || max || greater || less) {
            greater = this.getTime(greater);
            less = this.getTime(less);
            min = this.getTime(min);
            max = this.getTime(max);
            debug(rules, min, max, greater, less);
            min = min !== undefined ?
                min :
                greater !== undefined ? greater + 1 : undefined,
            max = max !== undefined ?
                max :
                less !== undefined ? less - 1 : undefined;

            min = min !== undefined ? min : (max - (365 * 24 * 60 * 60 * 1000));
            max = max !== undefined ? max : (min + (365 * 24 * 60 * 60 * 1000));
            debug(rules, min, max);
            res = new Date(chance.integer({ min, max }));
        }

        if (rules.format) {
            res = Moment(res).format(rules.format.format[0]);
        }
        else if (desc.flags && desc.flags.format) {
            res = Moment(res).toISOString();
            if (this.options.strict && !desc.flags.format.test(res)) { //we only support iso format for now
                throw new Error('Date requested in unknown format ${desc.flags.format} ${res}');
            }
        }
        else if (desc.flags && desc.flags.timestamp) {
            const timestamp = desc.flags.timestamp;
            const multiplier = desc.flags.multiplier;
            const multiplies = {
                javascript: 1,
                unix: 1000
            };
            if (this.options.strict && ((!multiplies[timestamp]) || multiplies[timestamp] !== multiplier)) {
                throw new Error(`Unknown timestamp value timestamp: ${timestamp} multiplier: ${multiplier}`);
            }

            res = Math.floor(res.getTime() / multiplier);
        }

        return res;
    }
};

module.exports = DateExample;
