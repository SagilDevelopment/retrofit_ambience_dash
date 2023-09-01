const widgetParent = document.getElementById('widget').parentNode;

const styles = {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    // border: "5px solid blue"
}

Object.assign(widgetParent.style, styles);

const TOKEN = 'BBFF-fX2pCKEJ6Okgw6FZzD5JaJPPMXJHnU';
const result = document.getElementById('result');
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
        const DEVICE_NAME = DEVICE_OBJECT.name;

        if (DEVICE_LABEL === "selecionar-dispositivo" || DEVICE_LABEL === undefined) {

            changeElementDisplay('loader', 'none');
            changeElementDisplay('select-device-message', 'block');

        } else {
            showLoading();

            showDeviceName(DEVICE_NAME);

            let currentDoorState = await readDoorState(DEVICE_LABEL);
            showDoorState(currentDoorState);

            const { PRINCIPAL, SEC1, SEC2, DOOR1, DOOR2, AMB1, AMB2, AMB3 } = await getSensorsLabels(DEVICE_LABEL, TOKEN);
            showSensorsMac(PRINCIPAL, SEC1, SEC2, DOOR1, DOOR2, AMB1, AMB2, AMB3);

            hideLoading();

            setInterval(async () => {
                const newDoorState = await readDoorState(DEVICE_LABEL);
                if (newDoorState !== currentDoorState) {
                    showDoorState(newDoorState);
                    currentDoorState = newDoorState;
                }
            }, 2000);

        }

    } catch (error) {
        console.error('Ocorreu um erro:', error);
    }
}

async function getSensorsLabels(label, token) {
    const { properties } = await getDeviceData(label, token);
    const {
        sensor_principal,
        sensor_auxiliar_1,
        sensor_auxiliar_2,
        sensor_porta_1,
        sensor_porta_2,
        sensor_ambiente_1,
        sensor_ambiente_2,
        sensor_ambiente_3 } = properties;

    return {
        PRINCIPAL: sensor_principal,
        SEC1: sensor_auxiliar_1,
        SEC2: sensor_auxiliar_2,
        DOOR1: sensor_porta_1,
        DOOR2: sensor_porta_2,
        AMB1: sensor_ambiente_1,
        AMB2: sensor_ambiente_2,
        AMB3: sensor_ambiente_3
    };
}

async function getDeviceData(label, token) {
    const config = {
        method: 'get',
        url: `https://industrial.api.ubidots.com/api/v2.0/devices/~${label}/`,
        data: '',
        headers: {
            'X-Auth-Token': token,
        },
    };
    const response = await axios.request(config);
    return response.data;
}

function showSensorsMac(main, sec1, sec2, door1, door2, amb1, amb2, amb3) {
    const amb_1_display = document.getElementById("amb-1-container")
    const amb_2_display = document.getElementById("amb-2-container")
    const amb_3_display = document.getElementById("amb-3-container")
    const door_2_display = document.getElementById("door-2-container")

    document.getElementById("main-mac").innerHTML = main;
    document.getElementById("sec-1-mac").innerHTML = sec1;
    document.getElementById("sec-2-mac").innerHTML = sec2;
    document.getElementById("door-1-mac").innerHTML = door1;

    if (amb1 !== "vazio") {
        document.getElementById("amb-1-mac").innerHTML = amb1;
        amb_1_display.classList.remove("is-hide");
    }

    if (amb2 !== "vazio") {
        document.getElementById("amb-2-mac").innerHTML = amb2;
        amb_2_display.classList.remove("is-hide");
    }

    if (amb3 !== "vazio") {
        document.getElementById("amb-3-mac").innerHTML = amb3;
        amb_3_display.classList.remove("is-hide");
    }

    if (door2 !== "vazio") {
        document.getElementById("door-2-mac").innerHTML = door2;
        door_2_display.classList.remove("is-hide");
    }
}

function showDeviceName(device_name) {
    document.getElementById("device-name").innerHTML = device_name
}

async function readDoorState(dl) {
    const url = `https://industrial.api.ubidots.com/api/v1.6/devices/${dl}/door_1_status/lv`;

    try {
        const doorState = await makeApiRequest(url, TOKEN);
        return doorState;

    } catch (error) {
        console.error(error.message);
    }
}

function showDoorState(state) {
    const img = document.getElementById('conservadora_img');
    const doorState = document.getElementById('door-state');
    const url_base = 'https://raw.githubusercontent.com/SagilDevelopment/ubidots-assets/main/'

    if (state === 0) {
        img.src = url_base + 'conservadora_fechada.svg';
        doorState.innerHTML = 'Fechada';
        doorState.style.color = '#00AC47';
    } else {
        img.src = url_base + 'conservadora_aberta.svg';
        doorState.innerHTML = 'Aberta';
        doorState.style.color = '#F03029';
    }
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

main();

// ============= //

function showLoading() {
    changeElementDisplay('widget', 'none');
    changeElementDisplay('loader', 'block');
}

function hideLoading() {
    changeElementDisplay('loader', 'none');
    changeElementDisplay('widget', 'flex');
}

function changeElementDisplay(element, displayStyle) {
    document.getElementById(`${element}`).style.display = `${displayStyle}`
}

// ======== //