const containerParent = document.getElementById('container').parentNode;

const styles = {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center"
    // border: "5px solid blue"
}

Object.assign(containerParent.style, styles);

// ================== //

const TOKEN = 'BBFF-fX2pCKEJ6Okgw6FZzD5JaJPPMXJHnU';
const INTERVAL = 2000;
const ubidots = new Ubidots();

async function waitForSelectedDeviceObject() {
    return new Promise((resolve) => {
        ubidots.on('selectedDeviceObject', function (data) {
            resolve(data);
        });
    });
}

async function main() {
    try {

        const DEVICE_OBJECT = await waitForSelectedDeviceObject();
        const DEVICE_LABEL = DEVICE_OBJECT.label;


        if (DEVICE_LABEL === "selecionar-dispositivo" || DEVICE_LABEL === undefined) {

            changeElementDisplay('loader', 'none');
            changeElementDisplay('select-device-message', 'block');

        } else {

            showLoading();

            let currentVariableId = await getVariableId(DEVICE_LABEL);
            const currentRangeOption = document.getElementById('range').value;

            let dataTemp = await readData(currentVariableId, currentRangeOption);
            const parsedData = parseData(dataTemp);

            const dataToChart = setDataToChart(parsedData);
            const config = configChart(dataToChart);
            const ctx = document.getElementById('myChart');
            const myChart = new Chart(ctx, config);

            hideLoading();

            document.getElementById('range').addEventListener("change", async function () {
                showLoading();
                const newRangeOption = document.getElementById('range').value;
                const newDataTemp = await readData(currentVariableId, newRangeOption);
                const newParsedData = parseData(newDataTemp);

                myChart.data = setDataToChart(newParsedData);
                myChart.update();
                hideLoading();
            })
        }

    } catch (error) {
        console.error('Ocorreu um erro:', error);
    }
}

async function getVariableId(dl) {
    const url = `https://industrial.api.ubidots.com/api/v1.6/devices/${dl}/temperatura_pr1`;

    try {
        const { id } = await makeApiRequest(url, TOKEN);
        return id
    } catch (error) {
        console.error('Ocorreu um erro: ' + error.message)
    }
}

function getTimestampsByRange(range) {
    const now = new Date();
    const nowTs = now.getTime();

    const midNight = now;
    midNight.setHours(0, 0, 0, 0);
    const midNightTs = midNight.getTime();

    if (range === 'today') {
        return {
            start: midNightTs,
            end: nowTs
        }
    } else if (range === 'yesterday') {
        return {
            start: midNightTs - 86400000,
            end: midNightTs
        }
    } else if (range === 'last24hours') {
        return {
            start: nowTs - 86400000,
            end: nowTs
        }
    } else if (range === 'last7D') {
        return {
            start: nowTs - 604800000,
            end: nowTs
        }
    }
}

async function readData(variable_id, range) {

    const url = `https://industrial.ubidots.com/api/v1.6/variables/${variable_id}/values_dataset?statistic=mean&period=30T&tz=America%2FSao_Paulo`

    const { start, end } = getTimestampsByRange(range);

    try {
        const finalEndpoint = url + `&timestamp__gte=${start}&timestamp__lte=${end}`;
        const results = await makeApiRequest(finalEndpoint, TOKEN);
        return results

    } catch (error) {
        console.error("ocorreu um erro: " + error)
    }
}

function setDataToChart(dataset) {
    if (dataset.length > 0) {
        const firstDataTime = dataset[0].x;
        const lastDataTime = dataset[dataset.length - 1].x;

        const timeDifference = lastDataTime - firstDataTime;

        const tickInterval = timeDifference / 4;

        const intermediateTicks = [];

        for (let i = 1; i <= 3; i++) {
            const intermediateTime = firstDataTime + tickInterval * i;
            intermediateTicks.push(intermediateTime);
        }

        const maxTemperature = Math.max(...dataset.map(point => point.y));
        const minTemperature = Math.min(...dataset.map(point => point.y));

        const data = {
            labels: [firstDataTime, ...intermediateTicks, lastDataTime],
            datasets: [{
                label: 'Temperatura',
                fill: false,
                data: dataset,
                backgroundColor: 'rgba(0, 93, 202, 1)',
                borderColor: 'rgba(0, 93, 202, 1)',
                tension: 0.2,
                pointRadius: 0.3,
                pointHoverRadius: 8,
                borderWidth: 1.2
            }],
            maxTemperature: maxTemperature,
            minTemperature: minTemperature
        };


        return data
    } else {
        const data = {
            datasets: [{
                label: 'Temperatura',
                fill: false,
                data: [{ x: null, y: null }]
            }]
        }
        return data
    }
}

function configChart(data) {

    const config = {
        type: 'line',
        data,
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute'
                    },
                    ticks: {
                        source: 'labels',
                        callback: (value, index, values) => {
                            return formatDate(value)
                        }
                    }
                },
                y: {
                    ticks: {
                        callback: (value, index, values) => {
                            return value.toFixed(1) + ' ºC'
                        },
                    },
                    min: data.minTemperature - 1,
                    max: data.maxTemperature + 1
                }
            },
        },
    };

    return config
}

async function makeApiRequest(url, token) {
    try {
        const response = await fetch(url, {
            headers: {
                'X-Auth-Token': token,
            },
        });

        if (!response.ok) {
            throw new Error('Erro ao fazer a requisição');
        }

        const data = await response.json();
        return data

    } catch (error) {
        console.error('Erro ao fazer a requisição:', error.message);
    }
};

function parseData(data) {
    const parsed = data.map(d => {
        return {
            x: d[0],
            y: d[1].toFixed(1)
        }
    })
    return parsed
}

function formatDate(date) {
    const d = new Date(date);
    const day = formatWithLeadingZero(d.getDate());
    const month = formatWithLeadingZero(d.getMonth() + 1);
    const year = d.getFullYear();
    const hour = formatWithLeadingZero(d.getHours());
    const minutes = formatWithLeadingZero(d.getMinutes());

    return `${day}/${month}/${year} ${hour}:${minutes}`
}

function formatWithLeadingZero(number) {
    return number < 10 ? `0${number}` : `${number}`;
}

function showLoading() {
    changeElementDisplay('container', 'none');
    changeElementDisplay('loader', 'block');
}

function hideLoading() {
    changeElementDisplay('loader', 'none');
    changeElementDisplay('container', 'block');
}

function changeElementDisplay(element, displayStyle) {
    document.getElementById(`${element}`).style.display = `${displayStyle}`
}

main();
