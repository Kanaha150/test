(function() {
    'use strict';
// Service UUID found based on chrome://bluetooth-internals/#devices/ee:a8:9d:84:a5:41
const service_UUID_1 = '00001234-b38d-4985-720e-0f993a68ee41';//maybe RH
const service_UUID_2 = '00001800-0000-1000-8000-00805f9b34fb';//maybe access
const service_UUID_3 = '00001801-0000-1000-8000-00805f9b34fb';//maybe attribute
const service_UUID_4 = '0000180a-0000-1000-8000-00805f9b34fb';//maybe ifo
const service_UUID_5 = '0000180f-0000-1000-8000-00805f9b34fb';//maybe battery
const service_UUID_6 = '00002234-b38d-4985-720e-0f993a68ee41';//maybe Temp
const service_UUID_7 = '0000f234-b38d-4985-720e-0f993a68ee41';//maybe logger

//Chraracteristic UUID found based on chrome://bluetooth-internals/#devices/ee:a8:9d:84:a5:41 
const characteristic_UUID_1 = '00002235-b38d-4985-720e-0f993a68ee41';//maybe Temp
const characteristic_UUID_2 = '00001235-b38d-4985-720e-0f993a68ee41';//maybe RH

//Descriptor UUID found based on chrome://bluetooth-internals/#devices/ee:a8:9d:84:a5:41 

    class TempRhSensor {
        constructor() {
            this.device = null;
            this.server = null;
            this._characteristics = new Map();
        }
        connect() {
            return navigator.bluetooth.requestDevice({ 
                filters: [{ 
                    name: 'adget'}],
                optionalServices: [service_UUID_1, service_UUID_2,service_UUID_3,service_UUID_4,service_UUID_5,service_UUID_6,service_UUID_7] 
            })
                .then(device => {
                    this.device = device;
                    return device.gatt.connect();
                })
                .then(server => {
                    this.server = server;
                    return server.getPrimaryService(service_UUID_6);
                })
                .then(service => {
                    return this._cacheCharacteristic(service, 
                    characteristic_UUID_1);
                    // return service.getCharacteristic(characteristic_UUID_1);
                })
                .then(value => {
                    console.log("value",value);
                    let decoder = new TextDecoder('utf-8');
                    let name = decoder.decode(value)
                    this.outputvalue = name;
                    this.lastupdate = new Date().toJSON();
                    console.log('value is ' + name);
                    // // console.log(`Temp is ${value.getUint8(0)}`);
                    // // console.log(`Temp1 is ${value.getUint8(0,true)}`);
                    // console.log(`Temp2 is ${value.getUint8(0)}`);
                    // // console.log(`Temp3 is ${value.getUint8(1,true)}`);
                    // console.log(`Temp4 is ${value.getUint16(1)}`);
                    // // console.log(`Temp5 is ${value.getUint8(2,true)}`);
                    // console.log(`Temp6 is ${value.getUint16(2,true)}`);
                    // console.log('Temp is ${value.getUint16(1,true)/100}');//getUint16(2, true) / 20
                })
        }

        /* Temp Service */

        startNotificationsTempRhMeasurement() {
            return this._startNotifications(characteristic_UUID_1);
        }
        stopNotificationsTempRhMeasurement() {
            return this._stopNotifications(characteristic_UUID_1);
        }
        parseTempRh(value) {
            // In Chrome 50+, a DataView is returned instead of an ArrayBuffer.
            value = value.buffer ? value : new DataView(value);
            // let flags = value.getUint8(0);
            let flags = value.getUint16(0, true)/100;
            let rate16Bits = flags & 0x1;
            let result = {};
            let index = 1;
            if (rate16Bits) {
                result.tempRh = value.getUint16(index, /*littleEndian=*/ true);
                index += 2;
            } else {
                result.tempRh = value.getUint8(index);
                index += 1;
            }
            let contactDetected = flags & 0x2;
            let contactSensorPresent = flags & 0x4;
            if (contactSensorPresent) {
                result.contactDetected = !!contactDetected;
            }
            let energyPresent = flags & 0x8;
            if (energyPresent) {
                result.energyExpended = value.getUint16(index, /*littleEndian=*/ true);
                index += 2;
            }
            let rrIntervalPresent = flags & 0x10;
            if (rrIntervalPresent) {
                let rrIntervals = [];
                for (; index + 1 < value.byteLength; index += 2) {
                    rrIntervals.push(value.getUint16(index, /*littleEndian=*/ true));
                }
                result.rrIntervals = rrIntervals;
            }
            return result;
        }

        /* Utils */

        _cacheCharacteristic(service, characteristicUuid) {
            return service.getCharacteristic(characteristicUuid)
                .then(characteristic => {
                    this._characteristics.set(characteristicUuid, characteristic);
                });
        }
        _readCharacteristicValue(characteristicUuid) {
            let characteristic = this._characteristics.get(characteristicUuid);
            return characteristic.readValue()
                .then(value => {
                    // In Chrome 50+, a DataView is returned instead of an ArrayBuffer.
                    value = value.buffer ? value : new DataView(value);
                    return value;
                });
        }
        _writeCharacteristicValue(characteristicUuid, value) {
            let characteristic = this._characteristics.get(characteristicUuid);
            return characteristic.writeValue(value);
        }
        _startNotifications(characteristicUuid) {
            let characteristic = this._characteristics.get(characteristicUuid);
            // Returns characteristic to set up characteristicvaluechanged event
            // handlers in the resolved promise.
            return characteristic.startNotifications()
                .then(() => characteristic);
        }
        _stopNotifications(characteristicUuid) {
            let characteristic = this._characteristics.get(characteristicUuid);
            // Returns characteristic to remove characteristicvaluechanged event
            // handlers in the resolved promise.
            return characteristic.stopNotifications()
                .then(() => characteristic);
        }
    }

    window.tempRhSensor = new TempRhSensor();

})();