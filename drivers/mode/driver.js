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

        Homey.app.getLocations().then((locations) => {
            this.log(locations);
            locations.forEach((location) => {
                foundDevices.push({
                    name : location.name,
                    data : {
                        id: location.locationDetails.location_id
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
