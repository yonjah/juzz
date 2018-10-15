'use strict';

// Load modules
const Lab  = require('lab');
const Juzz = require('../lib');
const Joi  = require('joi');

// Test shortcuts

const { describe, it } = exports.lab = Lab.script();

const trails = 10;

describe('Juzz', () => {



    it('should correctly create an example for object with regex pattern', () => {

        const schema = Joi.object().pattern(/^[a-z._0-9]+$/, Joi.number());

        for (let i = trails; i > 0; i -= 1) {
            const example = Juzz(schema, { strict: true });
            const { error } = schema.validate(example);
            if (error) {
                throw new Error(`${JSON.stringify(example)} failed schema validation ${error}`);
            }
        }

    });

    it('should correctly create an example for joi extended type', () => {

        const schema = Joi.extend({
            base: Joi.string().trim().alphanum().min(1).max(10),
            name: 'username'
        }).username();

        for (let i = trails; i > 0; i -= 1) {
            const example = Juzz(schema, { strict: true, extendedTypesDict: { username: 'string' } });
            const { error } = schema.validate(example);
            if (error) {
                throw new Error(`${JSON.stringify(example)} failed schema validation ${error}`);
            }

        }

    });



});
