(function() {
    'use strict';
// Service UUID found based on NRF connect
const Generic_Access_Primary_Service = 0x1800;
const Generic_Attribute_Primary_Service = 0x1801;
const Device_Information_Primary_Service = 0x180A;
const Battery_Service_Primary_Service = 0x180F;
const Unknown_Service_Primary_Service_1 = '0000f234-b38d-4985-720e-0f993a68ee41'; // same as Logger service UUID
const Unknown_Service_Primary_Service_2 = '00001234-b38d-4985-720e-0f993a68ee41'; //same as RH service UUID
const Unknown_Service_Primary_Service_3 = '00002234-b38d-4985-720e-0f993a68ee41'; // same as Temp service UUID


    // Custom Bluetooth service UUID
    const SENSIRION_DEVICE_INFO_SERVICE_UUID = 0x2800;// 180A; // 0x02010//0x180A;
    const SENSIRION_LOGGER_SERVICE_UUID = 0xF234; // 0000F234-B38D-4985-720E-0F993A68EE41;
    const SENSIRION_TEMP_SERVICE_UUID = 0x2234;//UUID.fromString("00002235-B38D-4985-720E-0F993A68EE41");//'00002234-B38D-4985-720E-0F993A68EE41';//0x2234; //
    const SENSIRION_RH_SERVICE_UUID = 0x1234; // 00001234-B38D-4985-720E-0F993A68EE41;

    // Custom Bluetooth Characteristic UUIDs
    const SENSIRION_DEVICE_NAME_UUID = 0x2A00;
    const SyncTimeMs_UUID = 0xF235; // 0000F235-B38D-4985-720E-0F993A68EE41;
    const OldestTimestampMs_UUID = 0xF236; //0000F236-B38D-4985-720E-0F993A68EE41;
    const NewestTimestampMs_UUID = 0xF237; //0000F237-B38D-4985-720E-0F993A68EE41;
    const StartLoggerDownload_UUID = 0xF238; //0000F238-B38D-4985-720E-0F993A68EE41;
    const LoggerIntervalMs_UUID = 0xF239; //0000F239-B38D-4985-720E-0F993A68EE41;

    const SENSIRION_TEMP_UUID =0x2235; //00001235-B38D-4985-720E-0F993A68EE41; or maybe 0x1235????
    const Temp_test_UUID_1 = 0x2901;
    const Temp_test_UUID_2 = 0x2902;
    const SENSIRION_RH_UUID = 0x1235; //00002235-B38D-4985-720E-0F993A68EE41; or maybe 0x2235???????

//Chraracteristic UUID found based on NRF 
//under 2234
const Unknown_Characteristic_1 = '00002235-b38d-4985-720e-0f993a68ee41';

    class TempRhSensor {
        constructor() {
            this.device = null;
            this.server = null;
            this._characteristics = new Map();
        }
        connect() {
            return navigator.bluetooth.requestDevice({ 
                filters: [{ 
                    name: 'Smart Humigadget'}],
                optionalServices: [Generic_Access_Primary_Service, Generic_Attribute_Primary_Service,Device_Information_Primary_Service, Unknown_Service_Primary_Service_1,Unknown_Service_Primary_Service_2, Unknown_Service_Primary_Service_3,SENSIRION_TEMP_SERVICE_UUID] 
            })
                .then(device => {
                    this.device = device;
                    return device.gatt.connect();
                })
                .then(server => {
                    this.server = server;
                    return server.getPrimaryService(Unknown_Service_Primary_Service_3);
                })
                .then(service => {
                    return this._cacheCharacteristic(service, Unknown_Characteristic_1);
                    // return service.getCharacteristic(Unknown_Characteristic_1);
                })
                // .then(characteristic => {
                //     return characteristic.readValue();
                // })
                .then(value => {
                    // console.log(`Temp is ${value.getUint8(0)}`);
                    console.log(`Temp is ${value.getUint8(0,true)}`);
                    console.log('Temp is ${value.getUint16(1,true)/100}');//getUint16(2, true) / 20
                })
        }

        /* Temp Service */

        startNotificationsTempRhMeasurement() {
            return this._startNotifications(Unknown_Characteristic_1);
        }
        stopNotificationsTempRhMeasurement() {
            return this._stopNotifications(Unknown_Characteristic_1);
        }
        parseTempRh(value) {
            // In Chrome 50+, a DataView is returned instead of an ArrayBuffer.
            value = value.buffer ? value : new DataView(value);
            // let flags = value.getUint8(0);
            let flags = value.getUint16(1, true)/100;
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