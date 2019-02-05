'use strict';

const debug       = require('debug')('Juzz:Alternatives');
const Util        = require('util');
const Tools       = require('../tools.js');
const DescHelpers = require('../descHelpers.js');
const RefHelpers  = require('../refHelpers');


const { chance, _ } = Tools;

Tools.setDebugColor(debug);
Tools.debug.alternatives = debug;

const AlternativesExample = {
    getAlternativeVal(desc) {

        const { res = {} } = this.context || {};
        const vals = this.getPossibleAlternativesVal(desc);
        const val = vals.length ? chance.pickone(vals) : undefined;

        debug('PICKED', val);
        if (!val) {
            return val;
        }

        if (val.refs) {
            Object.assign(res, val.refs);
        }

        return val.value;

    },

    getPossibleAlternativesVal(desc, includeExcluded = true) {

        const { context: origContext }  = this;
        const baseContext = desc.base && desc.base.type === 'object' && desc.base;
        const context = origContext || baseContext || { children: {} };
        const { children } = context;
        const res   = [];
        const { refs, peeks, descs } = DescHelpers.parseAlternatives(desc.alternatives);
        const locked = { refs: {}, full: false, then: {}, otherwise: {} };

        this.debugDesc(desc);

        if (refs.length) {
            refs.forEach((ref, i) => {

                if (locked.full) {
                    return locked;
                }

                debug(ref);

                const { key: refKey } = RefHelpers.getRef(ref.ref);
                let isValue;
                let excludeValue;

                if (ref.is.type === 'alternatives') {
                    const isDesc = Object.assign({ flags: {} }, ref.is);
                    if (!isDesc.base || isDesc.base.type === 'any') {
                        isDesc.base = children[refKey];
                    }

                    this.context = { res: {}, children: _.clone(children), defRequired: context.defRequired };
                    isValue = this.getPossibleAlternativesVal(isDesc);
                    isValue.forEach((value) => {

                        value.refs = Object.assign({}, value.refs, this.context.res);
                    });
                    if (includeExcluded) {
                        this.context = { res: {}, children: _.clone(children), defRequired: context.defRequired };
                        excludeValue = this.getPossibleAlternativesVal(DescHelpers.exclude(children[refKey], isDesc), false);
                        excludeValue.forEach((value) => {

                            value.refs = Object.assign({}, value.refs, this.context.res);
                        });
                    }
                }
                else {
                    const isDesc = Object.assign({ flags: {} }, children[refKey], ref.is);
                    this.context = { res: {}, children: _.clone(children), defRequired: context.defRequired };
                    isValue = [{ value: this.genExample(isDesc), refs: this.context.res }];
                    this.context = { res: {}, children: _.clone(children), defRequired: context.defRequired };
                    excludeValue = includeExcluded && [{ value: this.genExample(DescHelpers.exclude(children[refKey], isDesc)), refs: this.context.res }];
                }

                if (ref.then || (desc.base && i === refs.length - 1)) {

                    isValue.forEach((refValue) => {

                        this.context = { res: {}, children: _.clone(children), defRequired: context.defRequired };
                        const item = {
                            value: this.genExample(ref.then || desc.base),
                            refs: Object.assign(this.context.res, refValue.refs || {}, locked.refs, { [refKey]: refValue.value })
                        };

                        if (typeof item.value === 'object' && !Array.isArray(item.value)) {
                            Object.keys(item.refs).forEach((key) => {

                                if (item.value[key] !== undefined) {
                                    item.value[key] = item.refs[key];
                                }
                            });
                        }

                        debug('then ref', item);
                        res.push(item);
                    });
                }
                else {
                    locked.refs[refKey] = chance.pickone(isValue).value;
                }

                if (includeExcluded) {
                    if (ref.otherwise || (desc.base && i === refs.length - 1)) {
                        excludeValue.forEach((refValue) => {

                            this.context = { res: {}, children: _.clone(children), defRequired: context.defRequired };
                            const item = {
                                value: this.genExample(ref.otherwise || desc.base),
                                refs: Object.assign(this.context.res, refValue.refs || {}, locked.refs, { [refKey]: refValue.value })
                            };

                            if (typeof item.value === 'object' && !Array.isArray(item.value)) {
                                Object.keys(item.refs).forEach((key) => {

                                    if (item.value[key] !== undefined) {
                                        item.value[key] = item.refs[key];
                                    }
                                });
                            }

                            debug('otherwise ref', item);
                            res.push(item);
                        });

                    }
                    else {
                        locked.refs[refKey] = chance.pickone(excludeValue).value;
                    }
                }

                locked.then[refKey] = locked.then[refKey] || !!ref.then;
                locked.otherwise[refKey] = locked.otherwise[refKey] || !!ref.otherwise;
                if (locked.then[refKey] && locked.otherwise[refKey]) {
                    locked.full = true;
                }

                return locked;
            });
        }

        !locked.full && peeks.forEach((peek) => {

            debug('peek');
            debug(Util.inspect(peek, { colors: true, depth: 6 }));
            if (peek.peek.type === 'object' && peek.then.type === 'object') {
                const peekDesc = Object.assign({}, peek.then);
                peekDesc.children = Object.assign({}, peekDesc.children, peek.peek.children);
                const item = { value: this.genExample(peekDesc) };
                debug('peek object', item);
                res.push(item);
            }
            else {
                const item = { value: this.genExample(peek.then), refs: locked.refs };
                debug('peek then', item);
                res.push(item);
            }

        });

        !locked.full && descs.forEach((childDesc) => {

            debug('regular', childDesc);
            res.push({ value: this.genExample(childDesc), refs: locked.refs });
        });

        this.context = origContext;

        return res;
    }
};


module.exports = AlternativesExample;
