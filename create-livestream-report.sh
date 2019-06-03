#!/bin/sh

./runner-cmd --server $ES_URL --prefix $ES_PREFIX --index $ES_INDEX --metrics "tlh,cume" > $OUTPUT_FILE