# sm-topline-stats

`sm-topline-stats` is a utility to assist in pulling aggregated streaming metrics from a [StreamMachine](https://github.com/StreamMachine/StreamMachine) analytics installation.

## Installation

`npm install sm-topline-stats`

## Metrics

Currently, `sm-topline-stats` supports:

* __Sessions:__ Total number of sessions that were active during the period.
* __Cume (Unique IPs):__ Number of unique IP addresses that listened during the period. This will both undercount and overcount unique listeners (undercount offices and overcount mobile users), but is widely used in the industry regardless.
* __TLH:__ Total Listening Hours. The sum of all duration sent during the period, converted to hours.

All stats only count sessions that have been active for at least one minute.