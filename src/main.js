
var MEI2VF = (function(m2v, VF, $, undefined) {

  m2v.getRenderedMeasures = function() {
    return m2v.rendered_measures;
  };
  
  return {
    render_notation: m2v.render_notation,
    getRenderedMeasures: m2v.getRenderedMeasures
  };
  
}(MEI2VF || {}, Vex.Flow, jQuery));
