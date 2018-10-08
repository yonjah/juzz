# Juzz

[![npm version](https://img.shields.io/npm/v/juzz.svg)](https://www.npmjs.com/package/juzz)
[![Build Status](https://travis-ci.org/yonjah/juzz.svg?branch=master)](https://travis-ci.org/yonjah/juzz)
[![codecov](https://codecov.io/gh/yonjah/juzz/branch/master/graph/badge.svg)](https://codecov.io/gh/yonjah/juzz)
[![Known Vulnerabilities](https://snyk.io/test/npm/juzz/badge.svg)](https://snyk.io/test/npm/juzz)
[![License](https://img.shields.io/npm/l/juzz.svg?maxAge=2592000?style=plastic)](https://github.com/yonjah/juzz/blob/master/LICENSE) [![Greenkeeper badge](https://badges.greenkeeper.io/yonjah/juzz.svg)](https://greenkeeper.io/)

Fuzzer for [Joi](https://github.com/hapijs/joi)

**Warning** this is a proof of concept and is currently a work in progress.
It is mostly used by me to automatically add fuzzing to my hapi test suites so stability and accuracy though important is not a major factor.

## Usage 

```js
const Joi  = require('joi');
const Juzz = require('juzz');

const schema = Joi.object({
        id: Joi.number().integer().min(1).max(1000).required(),
        name: Joi.string().alphanum().min(1).max(32).required(),
        blob: Joi.any()
    });

const example = Juzz(schema);
const {errors} = schema.validate(example);
console.log(errors) // errors should not exist
console.log(example) // example will be some object that contains a valid
```


## API
### Juzz(schema, [options])

Generates a random example according to schema
#### `schema` - a valid joi schema

#### `options` - object with optional options 
- `replace: (res, desc) => new res` - method that allows to override generated values _default((res) => res)_
    + `res` - the result that `Juzz` created
    + `desc` - the description for that item
    
    for example to replace all strings with `'aaaaa'` use the following replace function -

    ```js
    relace (res, desc) {

        if (desc.type === 'string') {
            return 'aaaaa';
        }
        return res;
    }
    ```
    replace can also be useful when using custom version of joi without a standard types -

    ```js
    relace (res, desc) {

        if (desc.type === 'myCustomType') {
            return 'aaaaa';
        }
        return res;
    }
    ```

- `context`_Object_ - should be identical to the `context` object passed to joi.validate when schema references a context _default({})_
- `strict`_Boolean_ - if set to true will bail with an error when schema description is not known (can be useful for debugging) _default(false)_
- `extendedTypes`_array_ - custom types that will pass strict mode _default([])_
- `extendedTypesDict`_Object_ - Dictionary object to allow replacing custom type with built-in type for example: `{customType: 'string'}`  _default({})_
- `stringMin`_integer_: used if string min is not forced in schema _default(0)_
- `stringMax`_integer_: used if string max is not forced in schema _default(100)_
- `numberMin`_integer_: used if number min is not forced in schema _default(-10e6)_
- `numberMax`_integer_: used if number max is not forced in schema _default(10e6)_
- `numberPrecision`_integer_: used if number precision is not forced in schema _default(4)_
- `arrayMin`_integer_: used if array min is not forced in schema _default(0)_
- `arrayMax`_integer_: used if array max is not forced in schema _default(10)_
- `objectMin`_integer_: used if object min is not forced in schema _default(0)_
- `objectMax`_integer_: used if object max is not forced in schema _default(10)


## Known issues
It is possible to have very limited schemas or even schemas which has no valid values. In cases where `Juzz` can not create a valid schema it might throw a value but can also return an undefined value or invalid value instead.
If always getting a correct schema is essential, you should always check the returned value using joi `validate` method.

Schemas containing lazy values (`Joi.lazy()`) are currently not supported due to their description returned from joi is not useful.
this will hopefully change in future versions.

