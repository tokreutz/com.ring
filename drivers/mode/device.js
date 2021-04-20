'use strict';

const Homey = require('homey');
const Device = require('../../lib/Device.js');
const {
    Location
} = require('ring-client-api');

class DeviceMode extends Device {

    onInit() {
        this.log('Device init');
        this.log('Name:', this.getName());
        this.log('Class:', this.getClass());

        this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
        this.registerCapabilityListener('homealarm_state', this.onCapabilityHomeAlarmState.bind(this));
    }

    refreshModeDevice(/** @type {Location} */ location) {
        if (location == null) {
            this.setUnavailable();
            return;
        }
        
        if (!this.getAvailable()) {
            this.setAvailable();
        }

        // continue with updating a useAlarmMode|useLocationMode state, and its transition.
        if (location.hasAlarmBaseStation)
        {
            this.useAlarmMode(location);
        }
        else
        {
            this.useLocationMode(location);
        }
    }

    async useAlarmMode(/** @type {Location} */ location) {
        this.log('useAlarmMode');
        if (this._modeSource === 'alarm_mode') {
            return;
        }

        if (this._locationModeSubscription) {
            this._locationModeSubscription.unsubscribe();
        }

        this._modeSource = 'alarm_mode';
        
        if (this.hasCapability('onoff')) {
            this.removeCapability('onoff');
        }

        if (!this.hasCapability('homealarm_state')) {
            this.addCapability('homealarm_state');
        }

        const devices = await location.getDevices()
        const baseStation = devices.find(device => device.data.deviceType === RingDeviceType.BaseStation)
        this._baseStationSubscription = baseStation.onData.subscribe(this.refreshAlarmMode.bind(this));
    }

    async refreshAlarmMode(baseStationData) {
        this.log('refreshAlarmMode', baseStationData);
        /** @type {Location} */
        const location = await Homey.app.getLocation(this.getData());
        const alarmMode = await location.getAlarmMode();

        if (alarmMode === 'all') {
            this.setCapabilityValue('homealarm_state', 'armed')
                .catch(this.error);
        }
        else if (alarmMode === 'some') {
            this.setCapabilityValue('homealarm_state', 'partially_armed')
                .catch(this.error);
        }
        else if (alarmMode === 'none') {
            this.setCapabilityValue('homealarm_state', 'disarmed')
                .catch(this.error);
        }
    }

    useLocationMode(/** @type {Location} */ location) {
        this.log('useAlarmMode');
        if (this._modeSource === 'location_mode') {
            return;
        }

        this._modeSource = 'location_mode';

        if (this._baseStationSubscription) {
            this._baseStationSubscription.unsubscribe();
        }
        
        this._locationModeSubscription = location.onLocationMode.subscribe(this.refreshLocationMode.bind(this));
    }

    refreshLocationMode(mode) {
        this.log('refreshLocationMode', mode);

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

    async onCapabilityOnoff( value, opts ) {

        this.log('onCapabilityOnoff:', value);

        if (value === true)
        {
            try {
                if (!this.hasCapability('homealarm_state')) {
                    this.addCapability('homealarm_state');
                }

                await Homey.app.enableMode(this.getData());
            } catch (error) {
                console.log('error:', error);
                this.error(error);
            }
        }
        else if (value === false)
        {
            try {
                await Homey.app.disableMode(this.getData());
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