#!/bin/bash

if [ ! -d build ]; then
  mkdir build;
fi

temp_js=build/mei2vf-combined.js
temp_min=build/temp-min.js
out_js=build/meitovexflow-min.js
cat meilib.js           >> $temp_js
cat tables.js           >> $temp_js
cat meitovexflow.js     >> $temp_js
cat EventLink.js        >> $temp_js
cat EventReference.js   >> $temp_js
cat StaffInfo.js        >> $temp_js
cat StaveConnector.js   >> $temp_js
cat StaveVoices.js      >> $temp_js

java -jar support/yuicompressor-2.4.7.jar $temp_js -o $temp_min --disable-optimizations
cat apache2.0.js > $out_js
cat $temp_min >> $out_js

rm $temp_js
rm $temp_min

