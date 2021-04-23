'use strict';

const Homey = require('homey');
const Device = require('../../lib/Device.js');
const {
    Location,
    RingDeviceType
} = require('ring-client-api');

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

        this.log('refreshAlarmMode', 'alarmMode', alarmMode);
        if (alarmMode === 'all') {
            this.log('refreshAlarmMode', 'setCapabilityValue', 'armed');
            this.setCapabilityValue('homealarm_state', 'armed')
                .catch(this.error);
        }
        else if (alarmMode === 'some') {
            this.log('refreshAlarmMode', 'setCapabilityValue', 'partially_armed');
            this.setCapabilityValue('homealarm_state', 'partially_armed')
                .catch(this.error);
        }
        else if (alarmMode === 'none') {
            this.log('refreshAlarmMode', 'setCapabilityValue', 'disarmed');
            this.setCapabilityValue('homealarm_state', 'disarmed')
                .catch(this.error);
        }
    }

    async refreshLocationMode(/** @type {Location} */ location) {
        this.log('refreshLocationMode');
        
        if (!this.hasCapability('onoff')) {
            this.addCapability('onoff');
        }

        const modeResponse = await location.getLocationMode();
        const mode = modeResponse.mode;

        if (mode === 'disabled') {
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
            
            if (mode === 'away') {
                this.setCapabilityValue('homealarm_state', 'armed')
                .catch(this.error);
            }
            else if (mode === 'home') {
                this.setCapabilityValue('homealarm_state', 'partially_armed')
                .catch(this.error);
            }
            else if (mode === 'disarmed') {
                this.setCapabilityValue('homealarm_state', 'disarmed')
                .catch(this.error);
            }
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

                await Homey.app.enableLocationMode(this.getData());
            } catch (error) {
                console.log('error:', error);
                this.error(error);
            }
        }
        else if (value === false)
        {
            try {
                await Homey.app.disableLocationMode(this.getData());
                this.removeCapability('homealarm_state');
            } catch (error) {
                console.log('error:', error);
                this.error(error);
            }
        }
    }

    async onCapabilityHomeAlarmState( value, opts ) {

        this.log('onCapabilityHomeAlarmState:', value);
        
        if (value === 'armed') {
            await Homey.app.setMode(this.getData(), 'away');
        }
        else if (value === 'partially_armed') {
            await Homey.app.setMode(this.getData(), 'home');
        }
        else if (value === 'disarmed') {
            await Homey.app.setMode(this.getData(), 'disarmed');
        }
    }
}

module.exports = DeviceMode;
