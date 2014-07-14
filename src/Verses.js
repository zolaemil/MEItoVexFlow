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

      newHyphenation : function() {
        return new m2v.Hyphenation(this.font, this.printSpaceRight, this.maxHyphenDistance);
      },

      addHyphenation : function(verse_n) {
        var me = this;
        if (!me.hyphenations[verse_n]) {
          me.hyphenations[verse_n] = me.newHyphenation();
        }
        return me;
      },

      getHyphenation : function(verse_n) {
        var me = this, hyphenation;
        hyphenation = me.hyphenations[verse_n];
        if (!hyphenation) {
          hyphenation = me.newHyphenation();
          me.hyphenations[verse_n] = hyphenation;
        }
        return hyphenation;
      },

      initHyphenations : function(elems) {
        var me = this, verse_n;
        $.each(elems, function(i) {
          verse_n = $(elems[i]).parents('verse').attr('n') || '1';
          me.addHyphenation(verse_n);
        });
      },

      drawHyphens : function(ctx) {
        var me = this, verse_n, i, hyph;
        for (verse_n in me.hyphenations) {
          me.getHyphenation(verse_n).setContext(ctx).draw();
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
          me.hyphenations[verse_n].addSyllable(annot, wordpos, staff_n);
        }
        return me;
      },

    };

    return m2v;

  }(MEI2VF || {}, MeiLib, Vex.Flow, jQuery));
