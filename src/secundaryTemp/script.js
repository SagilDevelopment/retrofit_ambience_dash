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
    const SECUNDARY_1_LABEL = "sec_1_temperature";
    const SECUNDARY_2_LABEL = "sec_2_temperature";

    const SOFT_DIVERGENCE = 0.5;
    const MODERATE_DIVERGENCE = 1.0;

    if (DEVICE_LABEL === "selecionar-dispositivo" || DEVICE_LABEL === undefined) {

      changeElementDisplay('loader', 'none');
      changeElementDisplay('select-device-message', 'block');

    } else {
      showLoading();

      let [currentMainTemp, currentSecundaryData] = await Promise.all([
        await readMainTemp(DEVICE_LABEL, MAIN_TEMP_LABEL),
        await readSecundaryData(DEVICE_LABEL, SECUNDARY_1_LABEL, SECUNDARY_2_LABEL)
      ])

      let currentSecundary1Temp = currentSecundaryData.secundary_1.value;
      let currentSecundary1Ts = currentSecundaryData.secundary_1.timestamp;

      let currentSecundary2Temp = currentSecundaryData.secundary_2.value;
      let currentSecundary2Ts = currentSecundaryData.secundary_2.timestamp;

      showTemp(currentSecundary1Temp, "secundary-1");
      showDate(currentSecundary1Ts, "secundary-1");
      updateSignal(currentMainTemp, currentSecundary1Temp, SOFT_DIVERGENCE, MODERATE_DIVERGENCE, "secundary-1");

      showTemp(currentSecundary2Temp, "secundary-2");
      showDate(currentSecundary2Ts, "secundary-2");
      updateSignal(currentMainTemp, currentSecundary2Temp, SOFT_DIVERGENCE, MODERATE_DIVERGENCE, "secundary-2");

      hideLoading();

      setInterval(async () => {
        const [newMainTemp, newSecundaryData] = await Promise.all([
          await readMainTemp(DEVICE_LABEL, MAIN_TEMP_LABEL),
          await readSecundaryData(DEVICE_LABEL, SECUNDARY_1_LABEL, SECUNDARY_2_LABEL)
        ])

        const newSecundary1Temp = newSecundaryData.secundary_1.value;
        const newSecundary1Ts = newSecundaryData.secundary_1.timestamp;

        const newSecundary2Temp = newSecundaryData.secundary_2.value;
        const newSecundary2Ts = newSecundaryData.secundary_2.timestamp;

        if (newSecundary1Temp !== currentSecundary1Temp || newMainTemp !== currentMainTemp) {

          showTemp(newSecundary1Temp, "secundary-1");
          showDate(newSecundary1Ts, "secundary-1");
          updateSignal(newMainTemp, newSecundary1Temp, SOFT_DIVERGENCE, MODERATE_DIVERGENCE, "secundary-1");

          currentMainTemp = newMainTemp;
          currentSecundary1Temp = newSecundary1Temp;

        } else if (newSecundary2Temp !== currentSecundary2Temp || newMainTemp !== currentMainTemp) {

          showTemp(newSecundary2Temp, "secundary-2");
          showDate(newSecundary2Ts, "secundary-2");
          updateSignal(newMainTemp, newSecundary2Temp, SOFT_DIVERGENCE, MODERATE_DIVERGENCE, "secundary-2");

          currentMainTemp = newMainTemp;
          currentSecundary2Temp = newSecundary2Temp;

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
  const url = `https://industrial.api.ubidots.com/api/v1.6/devices/${dl}/${varible_label}/lv`;

  try {

    const result = await makeApiRequest(url, TOKEN);
    return result

  } catch (error) {
    console.error(error.message);
  }
};

async function readSecundaryData(dl, secundary_1_label, secundary_2_label) {
  const url_secundary_1 = `https://industrial.api.ubidots.com/api/v1.6/devices/${dl}/${secundary_1_label}/values/?page_size=1`;
  const url_secundary_2 = `https://industrial.api.ubidots.com/api/v1.6/devices/${dl}/${secundary_2_label}/values/?page_size=1`;

  try {

    const [secundary_1_data, secundary_2_data] = await Promise.all([
      makeApiRequest(url_secundary_1, TOKEN),
      makeApiRequest(url_secundary_2, TOKEN)
    ])


    const results = {
      secundary_1: {
        value: secundary_1_data.results[0].value,
        timestamp: secundary_1_data.results[0].timestamp
      },
      secundary_2: {
        value: secundary_2_data.results[0].value,
        timestamp: secundary_2_data.results[0].timestamp
      }
    }

    return results

  } catch (error) {
    console.error(error.message);
  }
};

function showTemp(temp, sensor) {
  const display = document.getElementById(`temperature-${sensor}`);
  display.innerHTML = `${temp.toFixed(1)}°C`;
}

function showDate(date, sensor) {
  const d = new Date(date);
  const display = document.getElementById(`date-${sensor}`);
  display.innerHTML = formatDate(d);
}

function updateSignal(mainTemp, secundaryTemp, softDivergence, moderateDivergence, sensor) {

  const signalDisplay = document.getElementById(`signal_${sensor}`);
  const imgUrlBase = "https://raw.githubusercontent.com/SagilDevelopment/ubidots-assets/main/";
  const diference = secundaryTemp - mainTemp;
  signalDisplay.title = `Diferença: ${diference.toFixed(1)}°C`;

  if (Math.abs(diference) <= softDivergence) {

    signalDisplay.src = imgUrlBase + "green_signal.svg";

  } else if (Math.abs(diference) <= moderateDivergence) {

    signalDisplay.src = imgUrlBase + "yellow_signal.svg";

  } else {

    signalDisplay.src = imgUrlBase + "red_signal.svg";
  }
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
