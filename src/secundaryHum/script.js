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
    ubidots.on('selectedDeviceObject', function(data) {
      resolve(data);
    });
  });
}

async function main() {
  try {

    const DEVICE_OBJECT = await waitForSelectedDeviceObject();
    const DEVICE_LABEL = DEVICE_OBJECT.label;
    const DEVICE_URL = DEVICE_OBJECT.url;

    const MAIN_HUM_LABEL = "main_humidity";
    const SECUNDARY_1_LABEL = "sec_1_humidity";
    const SECUNDARY_2_LABEL = "sec_2_humidity"; 

    const SOFT_DIVERGENCE = 2;
    const MODERATE_DIVERGENCE = 4;

      if (DEVICE_LABEL === "selecionar-dispositivo" || DEVICE_LABEL === undefined) {

		changeElementDisplay('loader', 'none');
		changeElementDisplay('select-device-message', 'block');

	} else {
      showLoading();

      let [currentMainHum, currentSecundaryData] = await Promise.all([
          await readMainHum(DEVICE_LABEL, MAIN_HUM_LABEL),
          await readSecundaryData(DEVICE_LABEL, SECUNDARY_1_LABEL, SECUNDARY_2_LABEL)
      ])

      let currentSecundary1Hum = currentSecundaryData.secundary_1.value;
      let currentSecundary1Ts = currentSecundaryData.secundary_1.timestamp;

      let currentSecundary2Hum = currentSecundaryData.secundary_2.value;
      let currentSecundary2Ts = currentSecundaryData.secundary_2.timestamp;

      showHum(currentSecundary1Hum, "secundary-1");
      showDate(currentSecundary1Ts, "secundary-1");
      updateSignal(currentMainHum, currentSecundary1Hum, SOFT_DIVERGENCE, MODERATE_DIVERGENCE, "secundary-1");

      showHum(currentSecundary2Hum, "secundary-2");
      showDate(currentSecundary2Ts, "secundary-2");
      updateSignal(currentMainHum, currentSecundary2Hum, SOFT_DIVERGENCE, MODERATE_DIVERGENCE, "secundary-2");

      hideLoading();

      setInterval(async () => {
        const [newMainHum, newSecundaryData] = await Promise.all([
          await readMainHum(DEVICE_LABEL, MAIN_HUM_LABEL),
          await readSecundaryData(DEVICE_LABEL, SECUNDARY_1_LABEL, SECUNDARY_2_LABEL)
        ])

        const newSecundary1Hum = newSecundaryData.secundary_1.value;
        const newSecundary1Ts = newSecundaryData.secundary_1.timestamp;

        const newSecundary2Hum = newSecundaryData.secundary_2.value;
        const newSecundary2Ts = newSecundaryData.secundary_2.timestamp;

        if (newSecundary1Hum !== currentSecundary1Hum || newMainHum !== currentMainHum) {

            showHum(newSecundary1Hum, "secundary-1");
            showDate(newSecundary1Ts, "secundary-1");
            updateSignal(newMainHum, newSecundary1Hum, SOFT_DIVERGENCE, MODERATE_DIVERGENCE, "secundary-1");

            currentMainHum = newMainHum;
            currentSecundary1Hum = newSecundary1Hum;

        } else if (newSecundary2Hum !== currentSecundary2Hum || newMainHum !== currentMainHum) {

            showHum(newSecundary2Hum, "secundary-2");
            showDate(newSecundary2Ts, "secundary-2");
            updateSignal(newMainHum, newSecundary2Hum, SOFT_DIVERGENCE, MODERATE_DIVERGENCE, "secundary-2");

            currentMainHum = newMainHum;
            currentSecundary2Hum = newSecundary2Hum;

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

async function readMainHum(dl, varible_label) {
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

function showHum(hum, sensor) {
    const display = document.getElementById(`humidity-${sensor}`);
    display.innerHTML = `${hum.toFixed(0)}%`;
}

function showDate(date, sensor) {
    const d = new Date(date);
    const display = document.getElementById(`date-${sensor}`);
    display.innerHTML = formatDate(d);
}

function updateSignal(mainHum, secundaryHum, softDivergence, moderateDivergence, sensor) {
    
    const signalDisplay = document.getElementById(`signal_${sensor}`);
    const imgUrlBase = "https://raw.githubusercontent.com/SagilDevelopment/ubidots-assets/main/";
    const diference = secundaryHum - mainHum;
    signalDisplay.title = `Diferença: ${diference.toFixed(0)}%`; 
    
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
