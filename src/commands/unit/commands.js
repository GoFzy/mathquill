/***************************
 * Commands and Operators.
 **************************/

function classesAmongAncestors(cursor, classes) {
    while (cursor.parent) {
        // we can't nest fractions within fractions or superscripts
        for (var i = 0; i < classes.length; i++) {
            if (cursor instanceof classes[i]) {
                return true;
            }
        }
        cursor = cursor.parent;
    }
    return false;
}

var UnitSup =
UnitCmds["^"] = P(UnitCommand, function(_, super_) {
  _.supsub = 'sup';

  _.react = function() {
      return React.DOM.span({
            className: "mq-supsub mq-non-leaf mq-sup-only",
            "data-mathquill-command-id": this.id,
          },
          React.DOM.span({className: "mq-sup"}, this.blocks[0].react())
      );
  };

  _.numBlocks = function() {
      return 1;
  };

  _.textTemplate = [ '^' ];

  // XXX this should not be a block - we only allow nats up here
  _.createBlocks = function() {
      var block = UnitBlock();
      block.adopt(this, this.ends[R], 0);
      this.blocks = [block];
  };

  _.createLeftOf = function(cursor) {
    // don't create the superscript if there's nothing to the left of the
    // cursor or we're within a superscript
    if (!cursor[L] || classesAmongAncestors(cursor, [UnitSup])) {
        return;
    }

    return super_.createLeftOf.apply(this, arguments);
  };

  _.finalizeTree = function() {
    this.upInto = this.sup = this.ends[R];
    this.sup.downOutOf = insLeftOfMeUnlessAtEnd;

    this.ends[L].write = function(cursor, ch) {
      // Break out of super/subscripts on space
      if (ch === " ") {
        cursor.insRightOf(this.parent);
      }
      unitWrite(cursor, ch);
    };
  };
});

var UnitLiveFraction =
UnitCmds['/'] = P(UnitCommand, function(_, super_) {
  _.react = function() {
      var num = this.blocks[0];
      var denom = this.blocks[1];

      return React.DOM.span({
              className: "mq-fraction mq-non-leaf",
              "data-mathquill-command-id": this.id,
          },
          React.DOM.span({className: "mq-numerator"}, num.react()),
          React.DOM.span({className: "mq-denominator"}, denom.react()),
          React.DOM.span({style: {display: "inline-block", width: 0}},
              "\u00a0"
          )
      );
  };

  _.numBlocks = function() {
      return 2;
  };

  _.textTemplate = ['(', '/', ')'];

  _.finalizeTree = function() {
    this.upInto = this.ends[R].upOutOf = this.ends[L];
    this.downInto = this.ends[L].downOutOf = this.ends[R];
  };

  _.createBlocks = function() {
      var numerator = UnitBlock();
      var denominator = UnitBlock();
      this.blocks = [numerator, denominator];

      // not sure exactly what this does
      numerator.adopt(this, this.ends[R], 0);
      denominator.adopt(this, this.ends[R], 0);
  };

  _.createLeftOf = function(cursor) {
    // we can't nest fractions within fractions or superscripts
    if (classesAmongAncestors(cursor, [UnitLiveFraction, UnitSup])) {
        return;
    }

    if (!this.replacedFragment) {
      var leftward = cursor[L];
      while (leftward &&
        !(
          leftward instanceof (UnitCmds.text || noop) ||
          leftward.ctrlSeq === '\\ ' ||
          /^[,;:]$/.test(leftward.ctrlSeq)
        ) //lookbehind for operator
      ) leftward = leftward[L];

      if (leftward !== cursor[L]) {
        this.replaces(Fragment(leftward[R] || cursor.parent.ends[L], cursor[L]));
        cursor[L] = leftward;
      }
    }
    super_.createLeftOf.call(this, cursor);
  };
});
