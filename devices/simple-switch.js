const TuyaDevice = require('./tuya-device')
const debug = require('debug')('tuya-mqtt:device')
const debugDiscovery = require('debug')('tuya-mqtt:discovery')
const utils = require('../lib/utils')

class SimpleSwitch extends TuyaDevice {
    async init() {
        // Set device specific variables
        if (typeof this.config.dpsPower === 'undefined')
            this.config.dpsPower = 1

        if (!Array.isArray(this.config.dpsPower))
            this.config.dpsPower = [ this.config.dpsPower ]

        this.deviceType = this.config.deviceType || this.guessDeviceType(this.config.name, 'switch');
        this.deviceData.mdl = this.config.mdl || this.guessDeviceMdl(this.config.name, this.deviceType, 'Switch/Socket')

        // get all states for multi-switches
        const states = this.config.dpsPower.map(dpsPower => {
            return {
                key: dpsPower,
                type: 'bool'
            }
        })

        // Map generic DPS topics to device specific topic names
        this.deviceTopics = {
            state: states
        }

        this.subNames = this.config.subNames

        // Send home assistant discovery data and give it a second before sending state updates
        this.initDiscovery()
        await utils.sleep(1)

        // Get initial states and start publishing topics
        this.getStates()
    }

    initDiscovery() {
        let states = this.deviceTopics.state
        if (!Array.isArray(states)) {
            states = [states]
        }

        let stateIndex = -1
        for (const state of states) {
            stateIndex++;
            const uniqueId = `${this.config.id}${states.length == 1 ? '' : '_' + state.key}`
            const configTopic = `homeassistant/${this.deviceType}/${uniqueId}/config`
            let name = (this.subNames ? this.subNames[stateIndex] : null)
                || (this.config.name ? (this.config.name + (states.length == 1 ? '' : ' - ' + state.key)) : uniqueId)
            const baseDpsTopic = `${this.baseTopic}${states.length == 1 ? '' : ('dps/' + state.key + '/')}`

            const discoveryData = {
                name: name,
                state_topic: baseDpsTopic + 'state',
                command_topic: baseDpsTopic + 'command',
                availability_topic: this.baseTopic + 'status',
                payload_available: 'online',
                payload_not_available: 'offline',
                unique_id: uniqueId,
                device: this.deviceData
            }

            debugDiscovery('Home Assistant config topic: ' + configTopic)
            debugDiscovery(discoveryData)
            this.publishMqtt(configTopic, JSON.stringify(discoveryData))
        }
    }

    guessDeviceType(deviceName, defaultDeviceType) {
        let deviceType = defaultDeviceType;
        if (!deviceName)
            return deviceType

        deviceName = deviceName.toLowerCase();

        if (deviceName.includes('controller')) {
            deviceType = 'switch'
        }
        else if (deviceName.includes('light') || deviceName.includes('lamp')) {
            deviceType = 'light'
        }
        else if (deviceName.includes('fan')) {
            deviceType = 'fan'
        }

        return deviceType
    }

    guessDeviceMdl(deviceName, deviceType, defaultMdl) {
        let mdl = defaultMdl;
        if (!deviceType)
            return mdl

        deviceType = deviceType.toLowerCase();
        deviceName = deviceName.toLowerCase();

        if (deviceName.includes('controller')) {
            mdl = 'Switch'
        }
        else if (deviceType === 'light') {
            mdl = 'Light Switch'
        }
        else if (deviceType === 'fan') {
            mdl = 'Fan Switch'
        }
        else if (deviceType === 'switch') {
            if (deviceName.includes('plug')) {
                mdl = 'Switchable Plug'
            }
            else if (deviceName.includes('socket')) {
                mdl = 'Switchable Socket'
            }
            else if (deviceName.includes('switch')) {
                mdl = 'Switch'
            }
        }

        return mdl;
    }
}

module.exports = SimpleSwitch