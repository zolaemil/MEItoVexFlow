var MEI2VF = ( function(m2v, VF, $, undefined) {

    m2v.Texts = function() {
      var me = this;
      me.complexTextModels = [];
      me.defaultFontSize = 25;
      me.lineHeight = 1.3;
    };

    m2v.Texts.prototype = {

      addComplexText : function(element, coords) {
        var me = this;
        me.resetTempText();
        me.htmlToArray(element, {});
        me.complexTextModels.push({
          coords : coords,
          texts : me.textArray
        });
      },

      resetTempText : function() {
        this.textArray = [[]];
        this.line_n = 0;
      },

      htmlToArray : function(element, opts) {
        var me = this, obj, attObj, defaults, text;

        $(element).contents().each(function(i, childNode) {

          if (childNode.nodeName === '#text') {
            text = childNode.textContent.replace(/([\n|\r]+\s*)/g, '');
            if (text) {
              me.textArray[me.line_n].push({
                text : text,
                opts : opts
              });
            }
          } else {
            switch (childNode.localName) {
              case undefined :
                break;
              case 'lb' :
                me.breakLine();
                break;
              case 'title' :
                attObj = m2v.attsToObj(childNode);
                defaults = {
                  el : childNode.localName,
                  halign : 'center',
                  fontsize : (attObj.type === 'sub') ? 35 : 50,
                  fontweight : 'Bold'
                };
                obj = $.extend({}, opts, defaults, attObj);
                me.htmlToArray(childNode, obj);
                me.breakLine();
                break;
              default :
                obj = $.extend({}, opts, m2v.attsToObj(childNode));
                me.htmlToArray(childNode, obj);
            }
          }
        });
      },

      breakLine : function() {
        var me = this;
        me.line_n += 1;
        me.textArray[me.line_n] = [];
      },

      setContext : function(ctx) {
        this.ctx = ctx;
        return this;
      },

      draw : function() {
        var me = this, coords, fontsize, leftTexts, centerTexts, rightTexts, maxFontSizeInLine, offsetX, fontweight, fontstyle, i;

        i = me.complexTextModels.length;
        while (i--) {
          coords = me.complexTextModels[i].coords;

          $.each(me.complexTextModels[i].texts, function(i, lineObj) {
            leftTexts = [];
            centerTexts = [];
            rightTexts = [];
            maxFontSizeInLine = 0;

            $.each(lineObj, function(j, obj) {
              switch (obj.opts.halign) {
                case 'center' :
                  centerTexts.push(obj);
                  break;
                case 'right' :
                  rightTexts.push(obj);
                  break;
                default :
                  leftTexts.push(obj);
              }
            });

            maxFontSizeInLine = Math.max(me.drawCenterTexts(centerTexts, coords), me.drawRightAlignedTexts(rightTexts, coords), me.drawLeftAlignedTexts(leftTexts, coords));

            coords.y += maxFontSizeInLine * me.lineHeight;
          });
        }
      },

      drawCenterTexts : function(centerTexts, coords) {
        var me = this, fontsize, maxFontSize, fontweight, fontstyle, totalTextWidth = 0;

        $.each(centerTexts, function(j, obj) {
          fontsize = obj.opts.fontsize || me.defaultFontSize;
          fontweight = obj.opts.fontweight || '';
          fontstyle = obj.opts.fontstyle || '';
          me.ctx.font = fontstyle + ' ' + fontweight + ' ' + fontsize + 'px Times';
          totalTextWidth += me.ctx.measureText(obj.text).width;
        });

        maxFontSize = me.drawLeftAlignedTexts(centerTexts, {
          x : coords.x + (coords.w / 2) - (totalTextWidth / 2),
          y : coords.y,
          w : coords.w
        }, me.ctx);
        return maxFontSize;
      },

      drawLeftAlignedTexts : function(leftTexts, coords) {
        var me = this, fontsize, maxFontSize = 0, fontweight, fontstyle, offsetX = 0;
        $.each(leftTexts, function(j, obj) {
          fontsize = obj.opts.fontsize || me.defaultFontSize;
          maxFontSize = Math.max(fontsize, maxFontSize);
          fontweight = obj.opts.fontweight || '';
          fontstyle = obj.opts.fontstyle || '';
          me.ctx.font = fontstyle + ' ' + fontweight + ' ' + fontsize + 'px Times';
          me.ctx.textAlign = 'left';
          me.ctx.fillText(obj.text, coords.x + offsetX, coords.y);
          offsetX += me.ctx.measureText(obj.text).width;
        });
        return maxFontSize;
      },

      drawRightAlignedTexts : function(rightTexts, coords) {
        var me = this, fontsize, maxFontSize = 0, fontweight, fontstyle, offsetX = 0, obj, i;
        i = rightTexts.length;
        while (i--) {
          obj = rightTexts[i];
          fontsize = obj.opts.fontsize || me.defaultFontSize;
          maxFontSize = Math.max(fontsize, maxFontSize);
          fontweight = obj.opts.fontweight || '';
          fontstyle = obj.opts.fontstyle || '';
          me.ctx.font = fontstyle + ' ' + fontweight + ' ' + fontsize + 'px Times';
          me.ctx.textAlign = 'right';
          me.ctx.fillText(obj.text, coords.x + coords.w - offsetX, coords.y);
          offsetX += me.ctx.measureText(obj.text).width;
        }
        return maxFontSize;
      }
    };

    return m2v;

  }(MEI2VF || {}, Vex.Flow, jQuery));
