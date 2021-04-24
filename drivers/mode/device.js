'use strict';

const Homey = require('homey');
const Device = require('../../lib/Device.js');
const {
    Location,
} = require('ring-client-api');


function mapHomeyAlarmStateToRingAlarmMode(alarmState) {
    switch (alarmState) {
        case 'disarmed':
            return 'none';
        case 'partially_armed':
            return 'some';
        case 'armed':
            return 'all';
        default:
            throw "Unexpected Homey alarm_state " + alarmState;
    }
}

function mapHomeyAlarmStateToRingLocationMode(alarmState) {
    switch (alarmState) {
        case 'disarmed':
            return 'disarmed';
        case 'partially_armed':
            return 'home';
        case 'armed':
            return 'away';
        default:
            throw "Unexpected Homey alarm_state " + alarmState;
    }
}

function mapRingAlarmModeToHomeyAlarmState(alarmMode) {
    switch (alarmMode) {
        case 'none':
            return 'disarmed';
        case 'some':
            return 'partially_armed';
        case 'all':
            return 'armed';
        default:
            throw "Unexpected Homey alarmMode " + alarmMode;
    }
}

function mapRingLocationModeHomeyAlarmState(locationMode) {
    switch (locationMode) {
        case 'disabled':
        case 'unset':
            return null;
        case 'disarmed':
            return 'disarmed';
        case 'home':
            return 'partially_armed';
        case 'away':
            return 'armed';
        default:
            throw "Unexpected Homey locationMode " + locationMode;
    }
}

class DeviceMode extends Device {

    onInit() {
        this.log('Device init');
        this.log('Name:', this.getName());
        this.log('Class:', this.getClass());

        this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
        this.registerCapabilityListener('homealarm_state', this.onCapabilityHomeAlarmState.bind(this));

        this.setUnavailable();
    }

    refreshModeDevice(/** @type {Location} */ location) {
        this.log('refreshModeDevice', this._modeSource);
        if (location == null) {
            this.setUnavailable();
            return;
        }
        
        if (!this.getAvailable()) {
            this.setAvailable();
        }

        if (!this.hasCapability('homealarm_state')) {
            this.addCapability('homealarm_state');
        }

        if (location.hasAlarmBaseStation)
        {
            this.refreshAlarmMode(location);
        }
        else
        {
            this.refreshLocationMode(location);
        }
    }

    async refreshAlarmMode(/** @type {Location} */ location) {
        this.log('refreshAlarmMode');
        
        if (this.hasCapability('onoff')) {
            this.removeCapability('onoff');
        }

        const alarmMode = await location.getAlarmMode();
        const alarmState = mapRingAlarmModeToHomeyAlarmState(alarmMode);
        this.setCapabilityValue('homealarm_state', alarmState)
            .catch(this.error);
    }

    async refreshLocationMode(/** @type {Location} */ location) {
        this.log('refreshLocationMode');
        
        if (!this.hasCapability('onoff')) {
            this.addCapability('onoff');
        }

        const modeResponse = await location.getLocationMode();
        const locationMode = modeResponse.mode;
        const mode = mapRingLocationModeHomeyAlarmState(locationMode);

        if (!mode) {
            this.setCapabilityValue('onoff', false)
                .catch(this.error);

            if (this.hasCapability('homealarm_state')) {
                this.removeCapability('homealarm_state');
            }
        }
        else {
            this.setCapabilityValue('onoff', true)
                .catch(this.error);
                
            if (!this.hasCapability('homealarm_state')) {
                this.addCapability('homealarm_state');
            }
            
            this.setCapabilityValue('homealarm_state', mode)
                .catch(this.error);
        }
    }

    async onCapabilityOnoff( value, opts ) {
        this.log('onCapabilityOnoff:', value);

        if (value === true)
        {
            try {
                if (!this.hasCapability('homealarm_state')) {
                    this.addCapability('homealarm_state');
                }

                await Homey.app.enableLocationMode(this.getData().id);
            } catch (error) {
                console.log('error:', error);
                this.error(error);
            }
        }
        else if (value === false)
        {
            try {
                await Homey.app.disableLocationMode(this.getData().id);
                this.removeCapability('homealarm_state');
            } catch (error) {
                console.log('error:', error);
                this.error(error);
            }
        }
    }

    async onCapabilityHomeAlarmState( value, opts ) {
        this.log('onCapabilityHomeAlarmState:', value);

        const location = await Homey.app.getLocation(this.getData().id);
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

module.exports = DeviceMode;
