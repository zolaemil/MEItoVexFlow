var MEI2VF = ( function(m2v, MeiLib, VF, $, undefined) {

    /**
     * @class MEI2VF.Verses
     * @private
     *
     * @constructor
     * @param {Object} cfg
     */
    m2v.Verses = function(font, printSpaceRight, maxHyphenDistance) {
      var me = this;
      me.hyphenations = {};
      me.verses = {};
      me.printSpaceRight = printSpaceRight;
      me.font = font;
      me.maxHyphenDistance = maxHyphenDistance;
    };

    m2v.Verses.prototype = {

      drawHyphens : function(ctx) {
        var me = this, verse_n, i, hyph;
        for (verse_n in me.hyphenations) {
          me.hyphenations[verse_n].setContext(ctx).draw();
        };
        return me;
      },

      format : function() {
        var me = this, verse_n, text_line, verse, i, j;
        text_line = 0;
        for (verse_n in me.verses) {
          verse = me.verses[verse_n];
          for (i = 0, j = verse.length; i < j; i++) {
            verse[i].setTextLine(text_line);
          }
          text_line += 1;
        };
        return me;
      },

      addLineBreaks : function(staffInfos, measureX) {
        var me = this;
        for (verse_n in me.hyphenations){
          me.hyphenations[verse_n].addLineBreaks(staffInfos, measureX);
        };
        return me;
      },

      addSyllable : function(annot, wordpos, verse_n, staff_n) {
        var me = this;
        verse_n = verse_n || '1';
        if (!me.verses[verse_n]) {
          me.verses[verse_n] = [];
        }
        me.verses[verse_n].push(annot);
        if (wordpos) {
          if (!me.hyphenations[verse_n]) {
            me.hyphenations[verse_n] = new m2v.Hyphenation(me.font, me.printSpaceRight, me.maxHyphenDistance);
          }
          me.hyphenations[verse_n].addSyllable(annot, wordpos, staff_n);
        }
        return me;
      },

    };

    return m2v;

  }(MEI2VF || {}, MeiLib, Vex.Flow, jQuery));
