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
    const DEVICE_URL = DEVICE_OBJECT.url;
    const MAIN_TEMP_LABEL = "main_temperature";

    if (DEVICE_LABEL === "selecionar-dispositivo" || DEVICE_LABEL === undefined) {

      changeElementDisplay('loader', 'none');
      changeElementDisplay('select-device-message', 'block');

    } else {
      showLoading();

      let currentMainTempAndDate = await readMainTemp(DEVICE_LABEL, MAIN_TEMP_LABEL);
      let currentMainTemp = currentMainTempAndDate.value;
      let currentMainTs = currentMainTempAndDate.timestamp;
      showTemp(currentMainTemp);
      showDate(currentMainTs);

      hideLoading();

      setInterval(async () => {
        const newMainTempAndDate = await readMainTemp(DEVICE_LABEL, MAIN_TEMP_LABEL);
        const newMainTemp = newMainTempAndDate.value;
        const newMainDate = newMainTempAndDate.timestamp;
        if (newMainTemp !== currentMainTemp) {
          showTemp(newMainTemp);
          showDate(newMainDate);
          currentMainTemp = newMainTemp;
        }
      }, 2000);
    }

  } catch (error) {
    console.error('Ocorreu um erro:', error);
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

async function readMainTemp(dl, varible_label) {
  const url = `https://industrial.api.ubidots.com/api/v1.6/devices/${dl}/${varible_label}/values/?page_size=1`;

  try {

    const { results } = await makeApiRequest(url, TOKEN);
    const { value, timestamp } = results[0];
    return {
      value: value,
      timestamp: timestamp
    }

  } catch (error) {
    console.error(error.message);
  }
};

function showTemp(temp) {
  const temperatureDisplay = document.getElementById('temperature');
  temperatureDisplay.innerHTML = `${temp.toFixed(1)}°`
}

function showDate(date) {
  const d = new Date(date);
  const message = `Última mudança</br> ${formatDate(d)}`
  document.getElementById('date').innerHTML = message;
}

function formatDate(date) {
  const day = formatWithLeadingZero(date.getDate());
  const month = formatWithLeadingZero(date.getMonth() + 1);
  const year = date.getFullYear();
  const hour = formatWithLeadingZero(date.getHours());
  const minutes = formatWithLeadingZero(date.getMinutes());

  return `${day}/${month}/${year} ${hour}:${minutes}`
}

function formatWithLeadingZero(number) {
  return number < 10 ? `0${number}` : `${number}`;
}

main();

// // ============= //

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

// // ======== //

