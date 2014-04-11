/*
 * StaveConnector.js Author: Zoltan Komives (zolaemil@gmail.com) Created:
 * 24.07.2013
 *
 * Contains information about a stave connector parsed from the staffGrp
 * elements and their @symbol attributes
 *
 * Copyright © 2012, 2013 Richard Lewis, Raffaele Viglianti, Zoltan Komives,
 * University of Maryland
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

var MEI2VF = ( function(m2v, VF, $, undefined) {

    m2v.Connectors = function(labelScheme) {
      this.labelScheme = labelScheme;
      this.allVexConnectors = [];
      this.currentModels = {};
    };

    m2v.Connectors.prototype = {

      vexTypes : {
        'line' : VF.StaveConnector.type.SINGLE_LEFT,
        'brace' : VF.StaveConnector.type.BRACE,
        'bracket' : VF.StaveConnector.type.BRACKET,
        'none' : null,
        'singleright' : VF.StaveConnector.type.SINGLE_RIGHT
        // non-MEI
      },

      vexTypesBarlineRight : {
        'single' : VF.StaveConnector.type.SINGLE_RIGHT,
        'dbl' : VF.StaveConnector.type.THIN_DOUBLE,
        'end' : VF.StaveConnector.type.BOLD_DOUBLE_RIGHT,
        // 'rptstart' : VF.StaveConnector.type.BOLD_DOUBLE_LEFT,
        'rptend' : VF.StaveConnector.type.BOLD_DOUBLE_RIGHT,
        // 'rptboth' : VF.Barline.type.REPEAT_BOTH,
        'invis' : null
      },

      vexTypesBarlineLeft : {
        'single' : VF.StaveConnector.type.SINGLE_LEFT,
        'dbl' : VF.StaveConnector.type.THIN_DOUBLE,
        'end' : VF.StaveConnector.type.BOLD_DOUBLE_LEFT,
        'rptstart' : VF.StaveConnector.type.BOLD_DOUBLE_LEFT,
        'invis' : null
      },

      addToVexConnectors : function(obj) {
        this.allVexConnectors.push(obj);
      },

      getAll : function() {
        return this.allVexConnectors;
      },

      setModelForStaveRange : function(obj, add) {
        add = add || '';
        this.currentModels[obj.top_staff_n + ':' + obj.bottom_staff_n + add] = obj;
      },

      createVexFromModels : function(currentMeasure, barline_l, barline_r, currentSystem) {
        var me = this, vexType, top_staff, bottom_staff, vexConnector, label, labelScheme;
        labelScheme = me.labelScheme;
        $.each(me.currentModels, function(i, model) {

          vexType = (barline_r) ? me.vexTypesBarlineRight[barline_r] : me.vexTypes[model.symbol];
          top_staff = currentMeasure[model.top_staff_n];
          bottom_staff = currentMeasure[model.bottom_staff_n];

          if ( typeof vexType === 'number' && top_staff && bottom_staff) {
            vexConnector = new VF.StaveConnector(top_staff, bottom_staff);
            vexConnector.setType(vexType);
            me.addToVexConnectors(vexConnector);

            // switch (me.cfg.labelScheme) {
            // case m2v.CONST.LABELS_FULL:
            // labelText = (me.currentSystem === 1) ?
            // me.currentStaffInfos[staff_n].label :
            // (me.currentStaffInfos[staff_n].labelAbbr);
            // break;
            // case m2v.CONST.LABELS_ABBR:
            // labelText = me.currentStaffInfos[staff_n].labelAbbr;
            // break;
            // default:
            // return;
            // }

            if (labelScheme === 1) {
              label = (currentSystem === 1) ? model.label : model.labelAbbr;
            } else if (labelScheme === 2) {
              label = model.labelAbbr;
            }
            if (label)
              vexConnector.setText(label);
          }

          if (barline_l) {
            vexType = me.vexTypesBarlineLeft[barline_l];
            if ( typeof vexType === 'number' && top_staff && bottom_staff) {
              vexConnector = new VF.StaveConnector(top_staff, bottom_staff);
              vexConnector.setType(vexType);
              if (vexType === VF.StaveConnector.type.BOLD_DOUBLE_LEFT) {
                vexConnector.checkShift = true;
              }
              me.addToVexConnectors(vexConnector);
            }
          }

        });
      },

      setContext : function(ctx) {
        this.ctx = ctx;
        return this;
      },

      draw : function() {
        var i, j, conn, shift;
        for ( i = 0, j = this.allVexConnectors.length; i < j; i += 1) {
          conn = this.allVexConnectors[i];
          if (conn.checkShift) {
            shift = conn.top_stave.getModifierXShift();
            if (shift > 0)
              conn.setXShift(shift);
          }
          conn.setContext(this.ctx).draw();
        }
      }
    };

    return m2v;

  }(MEI2VF || {}, Vex.Flow, jQuery));
