/*
 * LTR559.js
 *
 * Node.js I2C driver for the Lite-On LTR-559ALS-01
 * ambient light and proximity sensor.
 *
 * https://optoelectronics.liteon.com/upload/download/ds86-2013-0003/ltr-559als-01_ds_v1.pdf
 */

'use strict';

const I2C = require('i2c');

class LTR559 {

    constructor(options = {}) {
        this.i2cBusNo = options.i2cBusNo ?? 1;
        this.i2cAddress =
            options.i2cAddress ?? LTR559.LTR559_DEFAULT_I2C_ADDRESS();

        this.i2cDevice =
            options.i2cDevice ?? `/dev/i2c-${this.i2cBusNo}`;

        /*
         * Do not open the device here.
         *
         * The i2c package opens the Linux I2C device asynchronously.
         * init() handles opening the device and waiting for it to become
         * available.
         */
        this.i2c = null;
        this.ready = false;

        this.PART_ID = 0x92;
        this.MANUFAC_ID = 0x05;

        this.LED_PULSE_PERIOD_30  = 0x00;
        this.LED_PULSE_PERIOD_40  = 0x01 << 5;
        this.LED_PULSE_PERIOD_50  = 0x02 << 5;
        this.LED_PULSE_PERIOD_60  = 0x03 << 5;
        this.LED_PULSE_PERIOD_70  = 0x04 << 5;
        this.LED_PULSE_PERIOD_80  = 0x05 << 5;
        this.LED_PULSE_PERIOD_90  = 0x06 << 5;
        this.LED_PULSE_PERIOD_100 = 0x07 << 5;

        this.DUTY_CYCLE_25  = 0x00;
        this.DUTY_CYCLE_50  = 0x01 << 3;
        this.DUTY_CYCLE_75  = 0x02 << 3;
        this.DUTY_CYCLE_100 = 0x03 << 3;

        this.CURRENT_MA_5   = 0x00;
        this.CURRENT_MA_10  = 0x01;
        this.CURRENT_MA_20  = 0x02;
        this.CURRENT_MA_50  = 0x03;
        this.CURRENT_MA_100 = 0x04;

        this.PS_MEAS_RATE_50   = 0x00;
        this.PS_MEAS_RATE_70   = 0x01;
        this.PS_MEAS_RATE_100  = 0x02;
        this.PS_MEAS_RATE_200  = 0x03;
        this.PS_MEAS_RATE_500  = 0x04;
        this.PS_MEAS_RATE_1000 = 0x05;
        this.PS_MEAS_RATE_2000 = 0x06;
        this.PS_MEAS_RATE_10   = 0x08;

        this.ENABLE_ALS = 0x01;

        this.ALS_DATA_GAIN_1X  = 0x00;
        this.ALS_DATA_GAIN_2X  = 0x01;
        this.ALS_DATA_GAIN_4X  = 0x02;
        this.ALS_DATA_GAIN_8X  = 0x03;
        this.ALS_DATA_GAIN_48X = 0x06;
        this.ALS_DATA_GAIN_96X = 0x07;

        this.ALS_INTEGRAL_TIME_100 = 0x00;
        this.ALS_INTEGRAL_TIME_50  = 0x04;
        this.ALS_INTEGRAL_TIME_200 = 0x08;
        this.ALS_INTEGRAL_TIME_400 = 0x0C;
        this.ALS_INTEGRAL_TIME_150 = 0x10;
        this.ALS_INTEGRAL_TIME_250 = 0x14;
        this.ALS_INTEGRAL_TIME_300 = 0x18;
        this.ALS_INTEGRAL_TIME_350 = 0x1C;

        this.ALS_MEAS_RATE_50   = 0x00;
        this.ALS_MEAS_RATE_100  = 0x01;
        this.ALS_MEAS_RATE_200  = 0x02;
        this.ALS_MEAS_RATE_500  = 0x03;
        this.ALS_MEAS_RATE_1000 = 0x04;
        this.ALS_MEAS_RATE_2000 = 0x05;

        this.ALS_CH0_C = [
            17743,
            42785,
            5926,
            0
        ];

        this.ALS_CH1_C = [
            -11059,
            19548,
            -1185,
            0
        ];

        this.ALS_GAIN = {
            0x00: 1,
            0x01: 2,
            0x02: 4,
            0x03: 8,
            0x06: 48,
            0x07: 96
        };

        this.ENABLE_PS = 0x03;
        this.ENABLE_SATURATION = 0x20;

        this.REGISTER_ALS_DATA = 0x88;
        this.REGISTER_DATA_STATUS = 0x8C;
        this.REGISTER_PS_DATA = 0x8D;

        this.REGISTER_PARTID = 0x86;
        this.REGISTER_MANUFACID = 0x87;

        this.REGISTER_CONTROL_ALS = 0x80;
        this.REGISTER_CONTROL_PS = 0x81;
        this.REGISTER_PS_LED = 0x82;
        this.REGISTER_PS_N_PULSES = 0x83;
        this.REGISTER_PS_MEAS_RATE = 0x84;
        this.REGISTER_ALS_MEAS_RATE = 0x85;

        this.REGISTER_INTERRUPT = 0x8F;
    }

    /**
     * Open the I2C device.
     */
    open() {
        if (this.ready && this.i2c) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const wire = new I2C(this.i2cAddress, {
                device: this.i2cDevice
            });

            const onOpen = () => {
                cleanup();

                this.i2c = wire;
                this.ready = true;

                resolve();
            };

            const onError = (err) => {
                cleanup();
                reject(err);
            };

            const cleanup = () => {
                wire.removeListener('open', onOpen);
                wire.removeListener('error', onError);
            };

            wire.once('open', onOpen);
            wire.once('error', onError);
        });
    }

    /**
     * Write one byte to an LTR559 register.
     */
    writeRegister(register, value) {
        return new Promise((resolve, reject) => {
            this.i2c.writeBytes(register, [value], (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }

    /**
     * Read one byte from an LTR559 register.
     */
    readRegister(register) {
        return new Promise((resolve, reject) => {
            this.i2c.readBytes(register, 1, (err, buffer) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(buffer[0]);
            });
        });
    }

    /**
     * Read a consecutive block of registers.
     */
    readRegisters(register, length) {
        return new Promise((resolve, reject) => {
            this.i2c.readBytes(register, length, (err, buffer) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(buffer);
            });
        });
    }

    /**
     * Initialise and configure the LTR559.
     */
    async init() {
        await this.open();

        /*
         * The PART_ID register is read-only.
         *
         * The previous implementation attempted to write zero to register
         * 0x86 before reading it. That write is unnecessary and has therefore
         * been removed.
         */
        const partId = await this.readRegister(this.REGISTER_PARTID);

        if (partId !== LTR559.PART_ID1_LTR559()) {
            throw new Error(
                `Unexpected LTR559 part and revision ID: 0x${partId.toString(16)}`
            );
        }

        console.log(
            `Found LTR559 part and revision ID 0x${partId.toString(16)} ` +
            `on ${this.i2cDevice}, address 0x${this.i2cAddress.toString(16)}`
        );

        await this.loadDefaults();

        return partId;
    }

    /**
     * Perform an LTR559 software reset.
     */
    async reset() {
        const POWER_ON_RESET_CMD = 0x02;

        await this.writeRegister(
            this.REGISTER_CONTROL_ALS,
            POWER_ON_RESET_CMD
        );

        const maxRetries = 10;

        for (let retry = 0; retry < maxRetries; retry++) {
            await LTR559.delay(20);

            const value =
                await this.readRegister(this.REGISTER_CONTROL_ALS);

            /*
             * Reset bit clears automatically when the reset is complete.
             */
            if ((value & POWER_ON_RESET_CMD) === 0) {
                return;
            }
        }

        throw new Error('Failed to reset LTR559');
    }

    /**
     * Read ambient-light and proximity measurements.
     */
    async readSensorData() {
        if (!this.ready) {
            throw new Error(
                'LTR559 has not been initialised. Call init() first.'
            );
        }

        /*
         * Read:
         *
         * 0x88 ALS_DATA_CH1_0
         * 0x89 ALS_DATA_CH1_1
         * 0x8A ALS_DATA_CH0_0
         * 0x8B ALS_DATA_CH0_1
         * 0x8C ALS_PS_STATUS
         * 0x8D PS_DATA_0
         * 0x8E PS_DATA_1
         */
        const buffer =
            await this.readRegisters(this.REGISTER_ALS_DATA, 7);

        const alsDataInvalid =
            Boolean(buffer[4] & 0x80);

        const alsDataGain =
            (buffer[4] & 0x70) >> 4;

        const luxCh1 =
            LTR559.uint16(buffer[1], buffer[0]);

        const luxCh0 =
            LTR559.uint16(buffer[3], buffer[2]);

        let lux = 0;

        if (!alsDataInvalid && (luxCh0 + luxCh1) > 0) {
            const ratio =
                luxCh1 * 100 / (luxCh1 + luxCh0);

            let channelIndex = 3;

            if (ratio < 45) {
                channelIndex = 0;
            } else if (ratio < 64) {
                channelIndex = 1;
            } else if (ratio < 85) {
                channelIndex = 2;
            }

            const gain = this.ALS_GAIN[alsDataGain];

            if (!gain) {
                throw new Error(
                    `Unexpected ALS gain value: ${alsDataGain}`
                );
            }

            lux =
                (
                    luxCh0 * this.ALS_CH0_C[channelIndex]
                    -
                    luxCh1 * this.ALS_CH1_C[channelIndex]
                ) / gain / 10000;
        }

        const proximity =
            LTR559.uint16(
                buffer[6] & 0x07,
                buffer[5]
            );

        const proximitySaturated =
            Boolean(buffer[6] & 0x80);

        return {
            lux,
            proximity,
            proximity_saturated: proximitySaturated
        };
    }

    /**
     * Load the normal operating defaults.
     */
    async loadDefaults() {
        await this.reset();

        // PS LED: 30 µs pulse, 100% duty cycle, 50 mA
        await this.writeRegister(
            this.REGISTER_PS_LED,
            this.LED_PULSE_PERIOD_30 |
            this.DUTY_CYCLE_100 |
            this.CURRENT_MA_50
        );

        // One proximity pulse
        await this.writeRegister(
            this.REGISTER_PS_N_PULSES,
            0x01
        );

        // ALS active, gain 1x
        await this.writeRegister(
            this.REGISTER_CONTROL_ALS,
            this.ENABLE_ALS
        );

        // Proximity active with saturation indicator
        await this.writeRegister(
            this.REGISTER_CONTROL_PS,
            this.ENABLE_PS |
            this.ENABLE_SATURATION
        );

        // PS measurement every 100 ms
        await this.writeRegister(
            this.REGISTER_PS_MEAS_RATE,
            this.PS_MEAS_RATE_100
        );

        // ALS integration time 100 ms, measurement every 500 ms
        await this.writeRegister(
            this.REGISTER_ALS_MEAS_RATE,
            this.ALS_INTEGRAL_TIME_100 |
            this.ALS_MEAS_RATE_500
        );
    }

    /**
     * Configure number of proximity LED pulses.
     */
    async psNumberOfPulses(pulses) {
        if (
            !Number.isInteger(pulses) ||
            pulses < 1 ||
            pulses > 15
        ) {
            throw new Error(
                'Passed value must be between 1 and 15'
            );
        }

        await this.writeRegister(
            this.REGISTER_PS_N_PULSES,
            pulses
        );
    }

    static delay(milliseconds) {
        return new Promise((resolve) => {
            setTimeout(resolve, milliseconds);
        });
    }

    static LTR559_DEFAULT_I2C_ADDRESS() {
        return 0x23;
    }

    static PART_ID1_LTR559() {
        return 0x92;
    }

    static int16(msb, lsb) {
        const value = LTR559.uint16(msb, lsb);

        return value > 32767
            ? value - 65536
            : value;
    }

    static uint16(msb, lsb) {
        return (msb << 8) | lsb;
    }
}

module.exports = LTR559;
