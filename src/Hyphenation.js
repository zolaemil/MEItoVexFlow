var MEI2VF = ( function(m2v, VF, $, undefined) {

    // TODO add support for multiple layers in one staff

    m2v.Hyphenation = function(cfg) {
      var me = this;

      me.allSyllables = [];

      me.rightSystemBound = cfg.page_width / cfg.page_scale - cfg.page_margin_right;
      me.font = cfg.lyricsFont;
    };

    m2v.Hyphenation.prototype = {

      WORDBOUND : null,

      addSyllable : function(annot, wordpos, staff_n) {
        var me = this;
        if (!me.allSyllables[staff_n]) {
          me.allSyllables[staff_n] = [];
        }
        if (wordpos === 'i') {
          me.allSyllables[staff_n].push(me.WORDBOUND);
        }
        me.allSyllables[staff_n].push(annot);
        if (wordpos === 't') {
          me.allSyllables[staff_n].push(me.WORDBOUND);
        }
      },

      addLineBreaks : function(staffInfos, measureX) {
        var me = this, i, j;
        for ( i = 1, j = staffInfos.length; i < j; i += 1) {
          if (!me.allSyllables[i]) {
            me.allSyllables[i] = [];
          }
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
        var me = this, i, k, first, second, hyphenCount, hyphenWidth, halfHyphenWidth, endFirst, hyphenY, distance, hyphenCount, singleWidth, hyphenStart;

        // me.ctx.fillText('*', me.rightSystemBound, 100);

        var maxHyphenDistance = 75;

        me.ctx.setFont(me.font.family, me.font.size, me.font.weight);

        hyphenWidth = me.ctx.measureText('-').width;
        halfHyphenWidth = hyphenWidth / 2;

        i = me.allSyllables.length;
        while (i--) {
          if (me.allSyllables[i]) {
            k = me.allSyllables[i].length;
            while (k--) {
              first = me.allSyllables[i][k];
              second = me.allSyllables[i][k + 1];

              if (first !== me.WORDBOUND && second !== me.WORDBOUND) {

                if ( typeof first === 'number' && second) {
                  endFirst = first;
                  first = {
                    y : second.y
                  };
                } else {
                  endFirst = first.x + me.ctx.measureText(first.text).width;
                }

                if ( typeof second === 'number' || typeof second === 'undefined') {
                  second = {
                    x : me.rightSystemBound,
                    y : first.y
                  };
                  hyphenY = (first.y + second.y) / 2;
                  distance = Math.max(second.x - endFirst, hyphenWidth + 1);
                } else {
                  hyphenY = (first.y + second.y) / 2;
                  distance = second.x - endFirst;
                }

                if (first && second) {
                  if (distance > hyphenWidth) {
                    hyphenCount = Math.ceil(distance / maxHyphenDistance);
                    singleWidth = distance / (hyphenCount + 1);
                    hyphenStart = endFirst;
                    while (hyphenCount--) {
                      hyphenStart += singleWidth;
                      me.ctx.fillText('-', hyphenStart - halfHyphenWidth, hyphenY);
                    }
                  }
                }
              }

              // me.ctx.fillRect(first.x, first.y,
              // me.ctx.measureText(first.text).width,
              // 20);
              // me.ctx.fillRect(second.x, second.y,
              // me.ctx.measureText(second.text).width,
              // 20);
              // console.log(first);
              // console.log(second);

            }
          }
        }
      }
    };

    return m2v;

  }(MEI2VF || {}, Vex.Flow, jQuery));
