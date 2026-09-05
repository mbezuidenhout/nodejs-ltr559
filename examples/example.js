'use strict';

const LTR559 = require('../LTR559');

async function main() {
    const sensor = new LTR559({
        i2cBusNo: 1
    });

    await sensor.init();

    setInterval(async () => {
        try {
            const data = await sensor.readSensorData();

            console.log(
                `Lux: ${data.lux.toFixed(2)}, ` +
                `Proximity: ${data.proximity}, ` +
                `Saturated: ${data.proximity_saturated}`
            );
        } catch (err) {
            console.error('Failed to read LTR559:', err);
        }
    }, 1000);
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
