const TestSequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends TestSequencer {
  sort(tests) {
    // Executar testes mais rápidos primeiro
    const fastTests = tests.filter(
      (test) =>
        test.path.includes('simple') ||
        test.path.includes('debug') ||
        test.path.includes('auth'),
    );

    const mediumTests = tests.filter(
      (test) =>
        !fastTests.includes(test) &&
        (test.path.includes('tickets') ||
          test.path.includes('queues') ||
          test.path.includes('clients')),
    );

    const slowTests = tests.filter(
      (test) => !fastTests.includes(test) && !mediumTests.includes(test),
    );

    return [...fastTests, ...mediumTests, ...slowTests];
  }
}

module.exports = CustomSequencer;
