'use strict';

const RefHelpers = {
    isReferance(val) {

        if (typeof val === 'string') {
            return val.indexOf('ref:') === 0;
        }

        return val && val.ref && val.alter && val.ref.indexOf('ref:') === 0 ? true : false;
    },

    getRef(val) {

        const ref = {};
        if (typeof val === 'string') {
            ref.ref = val;
            ref.alter = (res) => res;
        }
        else {
            Object.assign(ref, val);
        }

        ref.key = ref.ref.substring(4);

        return ref;
    },

    isContext(val) {

        if (typeof val === 'string') {
            return val.indexOf('context:') === 0;
        }

        return val && val.ref && val.alter && val.ref.indexOf('context:') === 0 ? true : false;
    },

    getContext(val) {

        const ref = {};
        if (typeof val === 'string') {
            ref.ref = val;
            ref.alter = (res) => res;
        }
        else {
            Object.assign(ref, val);
        }

        ref.key = ref.ref.substring(8);

        return ref;
    }
};

module.exports = RefHelpers;
