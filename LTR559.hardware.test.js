'use strict';

const {
    test
} = require('node:test');

const assert = require('node:assert/strict');

const LTR559 = require('./LTR559');

test('LTR559 can initialise and read sensor data', async () => {
    const sensor = new LTR559({
        i2cBusNo: 1
    });

    const partId = await sensor.init();

    assert.equal(
        partId,
        LTR559.PART_ID1_LTR559()
    );

    const data = await sensor.readSensorData();

    assert.equal(
        typeof data.lux,
        'number'
    );

    assert.equal(
        typeof data.proximity,
        'number'
    );

    assert.equal(
        typeof data.proximity_saturated,
        'boolean'
    );

    console.log(data);
});
