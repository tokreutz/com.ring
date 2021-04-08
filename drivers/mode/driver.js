'use strict';

const Homey = require('homey');
const Driver = require('../../lib/Driver.js');

class DriverMode extends Driver {

    onInit() {
        this.log('onInit');
    }

    _onPairListDevices(data, callback) {
        this.log('_onPairListDevices');

        let foundDevices = [];

        Homey.app.getModes().then((modes) => {
            this.log(modes);
            modes.forEach((mode) => {
                foundDevices.push({
                    name : mode.location.name,
                    data : {
                        id: mode.location.location_id
                    }
                });
            });

            this.log(foundDevices);
            callback(null, foundDevices);
        }).catch((error) => {
            this.error(modes);
        });
    };
}

module.exports = DriverMode;
