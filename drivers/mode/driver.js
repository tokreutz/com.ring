'use strict';

const Homey = require('homey');
const Driver = require('../../lib/Driver.js');

const {
    Location
} = require('ring-client-api');

const refreshModeSourceInterval = 10000;

class DriverMode extends Driver {

    onInit() {
        this.log('onInit');
        setInterval(this._refreshModeDevices.bind(this), refreshModeSourceInterval);
        this._refreshModeDevices();
    }
    
    async _refreshModeDevices() {
        this.log('_refreshModeDevices');
        const locations = await Homey.app.getLocations();
        const modeDevices = this.getDevices();
        modeDevices.forEach((modeDevice) => {
            const location = locations.find((l) => l.locationDetails.location_id == modeDevice.getData().id);
            modeDevice.refreshModeDevice(location);
        });
    }

    _onPairListDevices(data, callback) {
        this.log('_onPairListDevices');

        let foundDevices = [];

        Homey.app.getLocations().then((locations) => {
            locations.forEach((location) => {
                foundDevices.push({
                    name : location.name,
                    data : {
                        id: location.locationDetails.location_id
                    }
                });
            });

            callback(null, foundDevices);
        }).catch((error) => {
            this.error(modes);
        });
    };
}

module.exports = DriverMode;
