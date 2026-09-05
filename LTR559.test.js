'use strict';

const {
    test
} = require('node:test');

const assert = require('node:assert/strict');

const LTR559 = require('./LTR559');

test('default I2C address is 0x23', () => {
    assert.equal(
        LTR559.LTR559_DEFAULT_I2C_ADDRESS(),
        0x23
    );
});

test('LTR559 part ID is 0x92', () => {
    assert.equal(
        LTR559.PART_ID1_LTR559(),
        0x92
    );
});

test('uint16 converts two bytes correctly', () => {
    assert.equal(
        LTR559.uint16(0x12, 0x34),
        0x1234
    );
});

test('int16 handles positive values', () => {
    assert.equal(
        LTR559.int16(0x7f, 0xff),
        32767
    );
});

test('int16 handles negative values', () => {
    assert.equal(
        LTR559.int16(0xff, 0xff),
        -1
    );
});

test('constructor uses I2C bus 1 by default', () => {
    const sensor = new LTR559();

    assert.equal(sensor.i2cBusNo, 1);
    assert.equal(sensor.i2cDevice, '/dev/i2c-1');
});

test('constructor supports alternate I2C buses', () => {
    const sensor = new LTR559({
        i2cBusNo: 0
    });

    assert.equal(sensor.i2cBusNo, 0);
    assert.equal(sensor.i2cDevice, '/dev/i2c-0');
});
