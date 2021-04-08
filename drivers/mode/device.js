'use strict';

const Homey = require('homey');
const Device = require('../../lib/Device.js');

const statusTimeout = 10000;

class DeviceMode extends Device {

    onInit() {
        this.log('Device init');
        this.log('Name:', this.getName());
        this.log('Class:', this.getClass());

        this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
        this.registerCapabilityListener('homealarm_state', this.onCapabilityHomeAlarmState.bind(this));

        Homey.on('refresh_modes', this._syncModes.bind(this));
    }

    _syncModes(data) {
        this.log('_syncModes', data);
        data.forEach((mode) => {
            if (mode.location.location_id === this.getData().id) {
                this.refreshMode(mode.mode);
            }
        });
    }

    refreshMode(data) {
        this.log('refreshMode', data);

        if (data.mode === 'disabled') {
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
                this.setCapabilityValue('homealarm_state', 'armed');
            }
        }

        if (data.mode === 'away') {
            this.setCapabilityValue('homealarm_state', 'armed')
                .catch(this.error);
        }
        else if (data.mode === 'home') {
            this.setCapabilityValue('homealarm_state', 'partially_armed')
                .catch(this.error);
        }
        else if (data.mode === 'disarmed') {
            this.setCapabilityValue('homealarm_state', 'disarmed')
                .catch(this.error);
        }
    }

    async onCapabilityOnoff( value, opts ) {

        this.log('onCapabilityOnoff:', value);

        if (value === true)
        {
            try {
                await Homey.app.enableMode(this.getData());
                if (!this.hasCapability('homealarm_state')) {
                    this.addCapability('homealarm_state');
                    this.setCapabilityValue('homealarm_state', 'armed');
                }
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