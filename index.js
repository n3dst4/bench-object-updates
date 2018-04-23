const chai = require('chai');
const randomWord = require('random-word');
const IMap = require('immutable').Map;
const uniqBy = require('lodash.uniqby');
const chalk = require('chalk');

////////////////////////////////////////////////////////////////////////////////
// this is a spike to compare performance for various ways of merging two
// objects.
// tests are scattered throughout as `expect` statements

const expect = chai.expect;

const repeats = 10000;
const baseSize = 1000;
const updateSize = 10;

// i still don't quite believe that JS doesn't have a built-in `range` operation
const range = n => new Array(n).fill().map((x, i) => i);

expect(range(10)).to.deep.equal([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

// create an object containing `size` random keys and values
const createObject = size => {
  const result = {};
  for (let i = 0; i < size; i++) {
    result[randomWord()] = randomWord();
  }
  return result;
};

expect(Object.keys(createObject(10)).length).to.equal(10);

// create an object containing a 1000-key "base" and 10-key "update"
const createObjectData = () => ({
  base: createObject(baseSize),
  update: createObject(updateSize)
});

const createIMapData = function () {
  const { base, update } = createObjectData();
  return {
    base: IMap(base),
    update: IMap(update)
  };
};

// create an array of random words, with length `size`
const createArray = size => range(size).map(randomWord);

expect(createArray(10).length).to.equal(10);

// create an object containing a 1000-item "base" array and 10-item "update"
const createArrayData = () => ({
  base: createArray(baseSize),
  update: createArray(updateSize)
});

// time an individual function run using the given setup method. the setup is
// called and whatever it returns and passed into the function under test.
// this is so you can have expensive setup but only time the bit you're
// interested in
const time = (setup, fn) => {
  const data = setup();
  const start = Date.now();
  fn(data);
  return Date.now() - start;
};

// time a series of test runs using the given setup function
// if `cheatFactor` is given it will scale down the number of tests and scale
// up the result by the given amount
const bench = (setup, fn, count, cheatFactor = 1) => {
  const times = range(count / cheatFactor).map(() => time(setup, fn));
  const result = times.reduce((a, b) => a + b, 0);
  return result * cheatFactor;
};

// report on the outcome of a test run
const report = (name, duration) => {
  console.log(`${chalk.bold(name)} ${chalk.grey('took')} ${duration}ms`);
};

const heading = (text) => {
  console.log();
  console.log(chalk.blue(text));
};

////////////////////////////////////////////////////////////////////////////////
// STRATEGIES

// this strategy is very fast because it doesn't do anything
const nothingStrategy = function ({ base, update }) {};

// this strategy mutates `base` in-place
const mutableStrategy = function ({ base, update }) {
  for (let k of Object.keys(update)) {
    base[k] = update[k];
  }
  return base;
};

expect(mutableStrategy({ base: { a: 1 }, update: { b: 2 } })).to.deep.equal({
  a: 1,
  b: 2
});

// this strategy uses ES6 {...spread} syntax to copy the update into a new
// object
const spreadStrategy = function ({ base, update }) {
  const result = {
    ...base,
    ...update
  };
  return result;
};

expect(spreadStrategy({ base: { a: 1 }, update: { b: 2 } })).to.deep.equal({
  a: 1,
  b: 2
});

// this strategy uses Object.assign to copy the update into a new object
const assignNewStrategy = function ({ base, update }) {
  const result = Object.assign({}, base, update);
  return result;
};

expect(assignNewStrategy({ base: { a: 1 }, update: { b: 2 } })).to.deep.equal({
  a: 1,
  b: 2
});

// this strategy uses Object.assign to copy the update into the base
const assignMutableStrategy = function ({ base, update }) {
  const result = Object.assign(base, update);
  return result;
};

expect(
  assignMutableStrategy({ base: { a: 1 }, update: { b: 2 } })
).to.deep.equal({ a: 1, b: 2 });

// this strategy uses immutable-js
const immutableJsStrategy = function ({ base, update }) {
  return base.merge(update);
};

expect(
  immutableJsStrategy({ base: IMap({ a: 1 }), update: IMap({ b: 2 }) }).toJS()
).to.deep.equal({ a: 1, b: 2 });

// this strategy uses Array#concat to join two lists
const arrayConcatStrategy = ({ base, update }) => base.concat(update);

expect(arrayConcatStrategy({ base: [1], update: [2] })).to.deep.equal([1, 2]);

// this strategy uses Array#concat to join two lists
const arraySpreadStrategy = ({ base, update }) => [...base, ...update];

expect(arraySpreadStrategy({ base: [1], update: [2] })).to.deep.equal([1, 2]);

// this strategy uses Array#concat to join two lists
const arrayConcatUniqStrategy =
  ({ base, update }) => uniqBy(base.concat(update));

expect(
  arrayConcatUniqStrategy({ base: [1], update: [2] })
).to.deep.equal([1, 2]);

////////////////////////////////////////////////////////////////////////////////
// BENCHMARKS

heading('Some irrelevant tests...');

report('doing nothing', bench(createObjectData, nothingStrategy, repeats));

report(
  'Array#concat (no uniq)',
  bench(createArrayData, arrayConcatStrategy, repeats, 10)
);
report(
  'Array spread (no uniq)',
  bench(createArrayData, arraySpreadStrategy, repeats, 10)
);

heading('mutative tests');

report('for-loop mutation',
  bench(createObjectData, mutableStrategy, repeats)
);
report(
  'Object.assign mutation',
  bench(createObjectData, assignMutableStrategy, repeats)
);

heading('non-mutative tests');

report(
  'spread operator copying',
  bench(createObjectData, spreadStrategy, repeats, 10)
);
report(
  'Object.assign copying',
  bench(createObjectData, assignNewStrategy, repeats, 10)
);

report(
  'Array#concat + uniq',
  bench(createArrayData, arrayConcatUniqStrategy, repeats, 10)
);

report(
  'immutable-js',
  bench(createIMapData, immutableJsStrategy, repeats, 10)
);
