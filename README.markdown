# bench-object-updates

Just a little Friday afternoon project to compare strategies for merging objects in JS.

Each benchmark starts with a 1000-item base object and merges a 10-item "update" into it. It does this 100,000 times.

I'll save you the bother of cloning and running. Here's the results on my crappy lappy:

```
Some irrelevant tests...
doing nothing took 13ms
Array#concat (no uniq) took 60ms
Array spread (no uniq) took 1820ms

mutative tests
for-loop mutation took 35ms
Object.assign mutation took 36ms

non-mutative tests
spread operator copying took 6800ms
Object.assign copying took 5880ms
Array#concat + uniq took 3980ms
immutable-js took 230ms
```

So yeah, `for`-loop mutation and `Object.assign` are BLAZING fast. Stylistically I prefer `Object.assign`.

All the immutable versions are a lot slower but [Immutable](https://facebook.github.io/immutable-js/) is back in the same kind of ball pond as the mutative versions.

Also interesting side-note that concatenating two arrays and then uniq'ing (using [lodash's uniq function](https://lodash.com/docs/4.17.5#uniq)) is quicker than copying out the objects with either `Object.assign` or the spread operator, so if your only goal is deduplication it might work.
