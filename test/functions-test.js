const {itBlock} = require('./test-helper');

describe('functions', function() {
  [
    ['TODAY()', [['TODAY', 'function', 'start'], ['', 'function', 'stop']]],
    [
      'SUM(1)',
      [
        ['SUM', 'function', 'start'],
        ['1', 'operand', 'number'],
        ['', 'function', 'stop'],
      ],
    ],
    [
      '@SUM(1)',
      [
        ['SUM', 'function', 'start', {hasImplicitIntersectionOperator: true}],
        ['1', 'operand', 'number'],
        ['', 'function', 'stop'],
      ],
    ],
    [
      'SUM(1, 2)',
      [
        ['SUM', 'function', 'start'],
        ['1', 'operand', 'number'],
        [',', 'argument', ''],
        ['2', 'operand', 'number'],
        ['', 'function', 'stop'],
      ],
    ],
    [
      'SUM(1, SUM(2, 3))',
      [
        ['SUM', 'function', 'start'],
        ['1', 'operand', 'number'],
        [',', 'argument', ''],
        ['SUM', 'function', 'start'],
        ['2', 'operand', 'number'],
        [',', 'argument', ''],
        ['3', 'operand', 'number'],
        ['', 'function', 'stop'],
        ['', 'function', 'stop'],
      ],
    ],
    [
      '0-SUM(OFFSET(Q75,,,1,0-MIN($L72,+Admin!Q36)))/$L72',
      [
        ['0', 'operand', 'number'],
        ['-', 'operator-infix', 'math'],
        ['SUM', 'function', 'start'],
        ['OFFSET', 'function', 'start'],
        ['Q75', 'operand', 'range'],
        [',', 'argument', ''],
        [',', 'argument', ''],
        [',', 'argument', ''],
        ['1', 'operand', 'number'],
        [',', 'argument', ''],
        ['0', 'operand', 'number'],
        ['-', 'operator-infix', 'math'],
        ['MIN', 'function', 'start'],
        ['$L72', 'operand', 'range'],
        [',', 'argument', ''],
        ['+', 'operator-prefix', ''],
        ['Admin!Q36', 'operand', 'range'],
        ['', 'function', 'stop'],
        ['', 'function', 'stop'],
        ['', 'function', 'stop'],
        ['/', 'operator-infix', 'math'],
        ['$L72', 'operand', 'range'],
      ],
    ],
  ].forEach(itBlock);

  describe('i18n', function() {
    xdescribe('de-DE', function() {
      var options = {
        language: 'de-DE',
      };

      [
        [
          '=WENN(WAHR;1,1;1,2)',
          [
            ['WENN', 'function', 'start'],
            ['TRUE', 'operand', 'logical'],
            [',', 'argument', ''],
            ['1.1', 'operand', 'number'],
            [',', 'argument', ''],
            ['1.2', 'operand', 'number'],
            ['', 'function', 'stop'],
          ],
          options,
        ],
        [
          'SUM(1; 2)',
          [
            ['SUM', 'function', 'start'],
            ['1', 'operand', 'number'],
            [',', 'argument', ''],
            ['2', 'operand', 'number'],
            ['', 'function', 'stop'],
          ],
          options,
        ],
        [
          'SUM(1; SUM(2; 3))',
          [
            ['SUM', 'function', 'start'],
            ['1', 'operand', 'number'],
            [',', 'argument', ''],
            ['SUM', 'function', 'start'],
            ['2', 'operand', 'number'],
            [',', 'argument', ''],
            ['3', 'operand', 'number'],
            ['', 'function', 'stop'],
            ['', 'function', 'stop'],
          ],
          options,
        ],
      ].forEach(itBlock);
    });
  });
});
