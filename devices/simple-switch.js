const TuyaDevice = require('./tuya-device')
const debug = require('debug')('tuya-mqtt:tuya')
const utils = require('../lib/utils')

class SimpleSwitch extends TuyaDevice {
    async init() {
        // Set device specific variables
        this.config.dpsPower = this.config.dpsPower ? this.config.dpsPower : 1

        this.deviceData.mdl = 'Switch/Socket'

        // Map generic DPS topics to device specific topic names
        this.deviceTopics = {
            state: {
                key: this.config.dpsPower,
                type: 'bool'
            }
        }

        // Send home assistant discovery data and give it a second before sending state updates
        this.initDiscovery()
        await utils.sleep(1)

        // Get initial states and start publishing topics
        this.getStates()
    }

    initDiscovery() {
        const configTopic = 'homeassistant/switch/'+this.config.id+'/config'

        const discoveryData = {
            name: (this.config.name) ? this.config.name : this.config.id,
            state_topic: this.baseTopic+'state',
            command_topic: this.baseTopic+'command',
            unique_id: this.config.id,
            device: this.deviceData
        }

        debug('Home Assistant config topic: '+configTopic)
        debug(discoveryData)
        this.publishMqtt(configTopic, JSON.stringify(discoveryData))
    }
}

module.exports = SimpleSwitch