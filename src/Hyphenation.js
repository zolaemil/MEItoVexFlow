var MEI2VF = ( function(m2v, VF, $, undefined) {

    // TODO add support for multiple layers in one staff
/**
 * 
 * @param {Object} cfg
 * @constructor
 */
    m2v.Hyphenation = function(cfg) {
      var me = this;
      me.allSyllables = [];
      // TODO move to main.js
      me.printSpaceRight = cfg.printSpaceRight;
      me.font = cfg.lyricsFont;
      me.maxHyphenDistance = cfg.maxHyphenDistance;
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

      // TODO add support for hyphens in lines where neither the first nor the
      // second syllable occur
      draw : function() {
        var me = this, i, k, first, second, hyphenCount, halfHyphenWidth, endFirst, hyphenY, distance, hyphenCount, singleWidth, hyphenStart;

        var maxHyphenDistance = me.maxHyphenDistance;

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
                  max_hyphen_distance: maxHyphenDistance
                };
                if ( typeof first === 'number') {
                  opts.first_annot = { x: first };
                } else {
                  opts.first_annot = first;
                }
                if ( typeof second === 'number' || second === undefined) {
                  opts.last_annot = { x: me.printSpaceRight };
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

  }(MEI2VF || {}, Vex.Flow, jQuery));
