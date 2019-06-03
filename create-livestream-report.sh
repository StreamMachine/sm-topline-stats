#!/bin/sh

./runner-cmd --server $ES_URL --prefix $ES_PREFIX --index sessions --metrics "tlh,cume" > $OUTPUT_FILE