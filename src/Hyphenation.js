var MEI2VF = ( function(m2v, MeiLib, VF, $, undefined) {

    /**
     * @class MEI2VF.Hyphenation
     * @private
     *
     * @constructor
     * @param {Object} cfg
     */
    m2v.Hyphenation = function(font, printSpaceRight, maxHyphenDistance) {
      var me = this;
      me.allSyllables = [];
      me.printSpaceRight = printSpaceRight;
      me.font = font;
      me.maxHyphenDistance = maxHyphenDistance;
    };

    m2v.Hyphenation.prototype = {

      WORDBOUND : null,

      addSyllable : function(annot, wordpos, staff_n) {
        var me = this;
        if (!me.allSyllables[staff_n])
          me.allSyllables[staff_n] = [];
        if (wordpos === 'i')
          me.allSyllables[staff_n].push(me.WORDBOUND);
        me.allSyllables[staff_n].push(annot);
        if (wordpos === 't')
          me.allSyllables[staff_n].push(me.WORDBOUND);
      },

      addLineBreaks : function(staffInfos, measureX) {
        var me = this, i, j;
        for ( i = 1, j = staffInfos.length; i < j; i += 1) {
          if (!me.allSyllables[i])
            me.allSyllables[i] = [];
          me.allSyllables[i].push(measureX);
        }
      },

      setContext : function(ctx) {
        this.ctx = ctx;
        return this;
      },

      draw : function() {
        var me = this, i, k, first, second, hyphenWidth;

        me.ctx.setFont(me.font.family, me.font.size, me.font.weight);

        hyphenWidth = me.ctx.measureText('-').width;

        i = me.allSyllables.length;
        while (i--) {
          if (me.allSyllables[i]) {
            k = me.allSyllables[i].length;
            while (k--) {
              first = me.allSyllables[i][k];
              second = me.allSyllables[i][k + 1];

              if (first !== me.WORDBOUND && second !== me.WORDBOUND) {
                var opts = {
                  hyphen_width : hyphenWidth,
                  max_hyphen_distance : me.maxHyphenDistance
                };
                if (first.system) {
                  opts.first_annot = {
                    x : first.system.getMeasures()[0].getX()
                  };
                } else {
                  opts.first_annot = first;
                }
                if (second === undefined || second.system) {
                  opts.last_annot = {
                    x : me.printSpaceRight
                  };
                } else {
                  opts.last_annot = second;
                }
                if (opts.first_annot.y || opts.last_annot.y) {
                  var h = new VF.Hyphen(opts);
                  h.setContext(me.ctx).renderHyphen();
                }
              }
            }
          }
        }
      }
    };

    return m2v;

  }(MEI2VF || {}, MeiLib, Vex.Flow, jQuery));
