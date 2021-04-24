'use strict';

const Homey = require('homey');

const api = require('./lib/Api.js');
const events = require('events');

class App extends Homey.App {

    log() {
        console.log.bind(this, '[log]').apply(this, arguments);
    }

    error() {
        console.error.bind(this, '[error]').apply(this, arguments);
    }

    onInit() {
        console.log(`${Homey.manifest.id} running...`);

        this._api = new api();

        this._api.on('refresh_device', this._syncDevice.bind(this));
        this._api.on('refresh_devices', this._syncDevices.bind(this));

        this._api.init();
    }

    _syncDevice(data) {
        Homey.emit('refresh_device', data);
    }

    _syncDevices(data) {
        Homey.emit('refresh_devices', data);
    }
    getRingDevices(callback) {
        this._api.getDevices(callback);
    }

    lightOn(data, callback) {
        this._api.lightOn(data, callback);
    }

    lightOff(data, callback) {
        this._api.lightOff(data, callback);
    }

    sirenOn(data, callback) {
        this._api.sirenOn(data, callback);
    }

    sirenOff(data, callback) {
        this._api.sirenOff(data, callback);
    }

    ringChime(data, callback) {
        this._api.ringChime(data, callback);
    }

    grabImage(data, callback) {
        this._api.grabImage(data, callback);
    }

    enableMotion(data, callback) {
        this._api.enableMotion(data, callback);
    }

    disableMotion(data, callback) {
        this._api.disableMotion(data, callback);
    }
    
    async getLocations() {
        const ring = await this._api.getRingApi();
        return ring.getLocations();
    }

    async getLocation(location_id) {
        var locations = await this.getLocations();
        return locations.find(loc => {
            return loc.locationDetails.location_id == location_id;
        });
    }

    async enableLocationMode(location_id) {
        const location = await this.getLocation(location_id);
        await location.enableLocationModes();
    }

    async disableLocationMode(location_id) {
        var location = await this.getLocation(location_id);
        location.disableLocationModes();
    }

    async setMode(location_id, value) {   
        var location = await this.getLocation(location_id);
        var supportsLocationModeSwitching = await location.supportsLocationModeSwitching();
        if (supportsLocationModeSwitching) {
            const locationMode = mapHomeyAlarmStateToRingLocationMode(value);
            return location.setLocationMode(locationMode);
        } else {
            if (location.hasAlarmBaseStation) {
                const alarmMode = mapHomeyAlarmStateToRingAlarmMode(value);
                return location.setAlarmMode(alarmMode);
            }

            throw new Error("Unable to set location mode.");
        }
    }
}

module.exports = App;
