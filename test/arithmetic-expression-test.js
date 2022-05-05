const {itBlock} = require('./test-helper');

describe('arithmetic expressions', function() {
  [
    ['1', [['1', 'operand', 'number']]],
    ['1.5', [['1.5', 'operand', 'number']]],
    ['11.55', [['11.55', 'operand', 'number']]],
    ['1E-1', [['1E-1', 'operand', 'number']]],
    ['1.5E-10', [['1.5E-10', 'operand', 'number']]],
    ['11.55E+100', [['11.55E+100', 'operand', 'number']]],
    [
      '1 + 2',
      [
        ['1', 'operand', 'number'],
        ['+', 'operator-infix', 'math'],
        ['2', 'operand', 'number'],
      ],
    ],
    [
      '(1 + 2) - 3',
      [
        ['', 'subexpression', 'start'],
        ['1', 'operand', 'number'],
        ['+', 'operator-infix', 'math'],
        ['2', 'operand', 'number'],
        ['', 'subexpression', 'stop'],
        ['-', 'operator-infix', 'math'],
        ['3', 'operand', 'number'],
      ],
    ],
    ['-1', [['-', 'operator-prefix', ''], ['1', 'operand', 'number']]],
    ['+1', [['+', 'operator-prefix', ''], ['1', 'operand', 'number']]],
    ['1%', [['1', 'operand', 'number'], ['%', 'operator-postfix', '']]],
    [
      '-(1 + 2)',
      [
        ['-', 'operator-prefix', ''],
        ['', 'subexpression', 'start'],
        ['1', 'operand', 'number'],
        ['+', 'operator-infix', 'math'],
        ['2', 'operand', 'number'],
        ['', 'subexpression', 'stop'],
      ],
    ],
    [
      '(1 + 2)%',
      [
        ['', 'subexpression', 'start'],
        ['1', 'operand', 'number'],
        ['+', 'operator-infix', 'math'],
        ['2', 'operand', 'number'],
        ['', 'subexpression', 'stop'],
        ['%', 'operator-postfix', ''],
      ],
    ],
    [
      '2+2*2',
      [
        ['2', 'operand', 'number'],
        ['+', 'operator-infix', 'math'],
        ['2', 'operand', 'number'],
        ['*', 'operator-infix', 'math'],
        ['2', 'operand', 'number'],
      ],
    ],
  ].forEach(itBlock);

  describe('i18n', function() {
    xdescribe('de-DE', function() {
      var options = {
        language: 'de-DE',
      };

      [
        ['1', [['1', 'operand', 'number']], options],
        ['1,5', [['1.5', 'operand', 'number']], options],
        ['11,55', [['11.55', 'operand', 'number']], options],
        ['1E-1', [['1E-1', 'operand', 'number']], options],
        ['1,5E-10', [['1.5E-10', 'operand', 'number']], options],
        ['11,55E+100', [['11.55E+100', 'operand', 'number']], options],
        [
          '1 + 2',
          [
            ['1', 'operand', 'number'],
            ['+', 'operator-infix', 'math'],
            ['2', 'operand', 'number'],
          ],
          options,
        ],
      ].forEach(itBlock);
    });
  });
});
