let allLapData = null;
let sessionKey = '9222'; // Default session key

async function fetchSessionKeys() {
    // Show loading screen
    document.getElementById('loading').style.display = 'block';

    const response = await fetch('https://api.openf1.org/v1/sessions');
    const sessions = await response.json();

    // Hide loading screen
    document.getElementById('loading').style.display = 'none';

    return sessions.map(session => ({
        sessionKey: session.session_key,
        countryName: session.country_name,
        sessionType: session.session_name
    }));
}

async function fetchAllDrivers(sessionKey) {
    const response = await fetch(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}`);
    const driversData = await response.json();
    return driversData.reduce((acc, driver) => {
        acc[driver.driver_number] = {
            acronym: driver.name_acronym + driver.driver_number
        };
        return acc;
    }, {});
}

async function displaySessionKeys() {
    const sessionKeys = await fetchSessionKeys();
    const sessionSelect = document.getElementById('session-key');

    sessionSelect.innerHTML = ''; // Clear previous options

    sessionKeys.forEach(session => {
        const option = document.createElement('option');
        option.value = session.sessionKey;
        option.textContent = `${session.countryName} - ${session.sessionType}`;
        sessionSelect.appendChild(option);
    });

    sessionSelect.addEventListener('change', async (event) => {
        const selectedSessionKey = event.target.value;
        await populateDriverSelect(selectedSessionKey); // Call populateDriverSelect with the selected session key first
        await updateGraphForSession(selectedSessionKey); // Then update the graph for the selected session key
    });
}

async function updateGraphForSession(sessionKey) {
    await updateGraph(sessionKey);
    await populateDriverSelect(sessionKey);
}

async function fetchAllLapData(sessionKey) {
    // Show loading screen
    document.getElementById('loading').style.display = 'block';

    const driversResponse = await fetch(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}`);
    const driversData = await driversResponse.json();
    const driverTeams = {};

    allLapData = {};

    // Fetch lap data for each driver and store it in allLapData object
    await Promise.all(driversData.map(async (driver) => {
        const response = await fetch(`https://api.openf1.org/v1/laps?session_key=${sessionKey}&driver_number=${driver.driver_number}`);
        const lapData = await response.json();
        allLapData[driver.driver_number] = {
            teamColor: driver.team_color,
            laps: lapData.map(lap => lap.lap_duration)
        };
        driverTeams[driver.driver_number] = driver.team_color;
    }));

    // Hide loading screen
    document.getElementById('loading').style.display = 'none';

    return allLapData;
}

async function updateGraph(sessionKey) {
    const allLapsData = await fetchAllLapData(sessionKey);
    const allDrivers = await fetchAllDrivers(sessionKey);

    // Check if allLapsData is empty or undefined
    if (!allLapsData || Object.keys(allLapsData).length === 0) {
        console.error('No lap data found.');
        return;
    }

    // Check if laps array is empty or undefined for the first driver
    const firstDriverLaps = allLapsData[Object.keys(allLapsData)[0]].laps;
    if (!firstDriverLaps || firstDriverLaps.length === 0) {
        console.error('No lap data found for the first driver.');
        return;
    }

    const lapNumbers = Array.from({ length: firstDriverLaps.length }, (_, i) => `Lap ${i + 1}`);

    const ctx = document.getElementById('all-laps-graph').getContext('2d');
    if (window.allLapsGraph) {
        window.allLapsGraph.destroy(); // Destroy existing chart instance
    }
    window.allLapsGraph = new Chart(ctx, {
        type: 'line',
        data: {
            labels: lapNumbers,
            datasets: Object.entries(allLapsData).map(([driverNumber, lapData]) => ({
                label: allDrivers[driverNumber].acronym, // Use driver acronym as label
                data: lapData.laps,
                borderColor: lapData.teamColor,
                fill: false
            }))
        },
        options: {
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Lap Time (seconds)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Lap Number'
                    }
                }
            }
        }
    });
}

async function updateGraphForDriver(driverNumber, sessionKey) {
    const lapsData = allLapData; // Use the already fetched data

    const driverLapsData = lapsData[driverNumber];
    const allDrivers = await fetchAllDrivers(sessionKey);
    if (driverLapsData && driverLapsData.laps.length > 0) {
        const lapNumbers = Array.from({ length: driverLapsData.laps.length }, (_, i) => `Lap ${i + 1}`);

        const ctx = document.getElementById('selected-driver-graph').getContext('2d');
        if (window.selectedDriverGraph) {
            window.selectedDriverGraph.destroy(); // Destroy existing chart instance
        }
        window.selectedDriverGraph = new Chart(ctx, {
            type: 'line',
            data: {
                labels: lapNumbers,
                datasets: [{
                    label: allDrivers[driverNumber].acronym, // Use driver acronym as label
                    data: driverLapsData.laps,
                    borderColor: driverLapsData.teamColor,
                    fill: false
                }]
            },
            options: {
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: 'Lap Time (seconds)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Lap Number'
                        }
                    }
                }
            }
        });
    } else {
        const errorMessage = `Lap data not found for driver ${driverNumber}`;
        console.error(errorMessage);
        // Display error message to the user (e.g., show an alert or update a message on the page)
    }
    fetchLapDataAndCreateTable(driverNumber, sessionKey);
}

async function populateDriverSelect(sessionKey) {
    const driversResponse = await fetch(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}`);
    const driversData = await driversResponse.json();
    const selectElement = document.getElementById('driver-select');

    selectElement.innerHTML = ''; // Clear previous options

    driversData.forEach(driver => {
        const option = document.createElement('option');
        option.value = driver.driver_number;
        option.textContent = `Driver ${driver.driver_number} - ${driver.name_acronym}`;
        selectElement.appendChild(option);
    });

    selectElement.addEventListener('change', async (event) => {
        const selectedDriverNumber = event.target.value;
        if (selectedDriverNumber) {
            await updateGraphForDriver(selectedDriverNumber, sessionKey);
        }
    });
}

async function fetchLapDataAndCreateTable(driverNumber, sessionKey) {
    fetch(`https://api.openf1.org/v1/laps?session_key=${sessionKey}&driver_number=${driverNumber}`)
        .then(response => response.json())
        .then(jsonContent => {
            // Filter out the laps with non-null lap_duration
            const filteredLapData = jsonContent.filter(lap => lap.lap_duration !== null);

            // Update lap duration table
            const lapsTableBody = document.getElementById('laps-table-body');
            lapsTableBody.innerHTML = '';
            filteredLapData.forEach(lapData => {
                const lapTableRow = document.createElement('tr');
                lapTableRow.innerHTML = `<td>${lapData.lap_number}</td>
                                                 <td>${getColor(lapData.duration_sector_1, lapData.segments_sector_1)}</td>
                                                 <td>${getColor(lapData.duration_sector_2, lapData.segments_sector_2)}</td>
                                                 <td>${getColor(lapData.duration_sector_3, lapData.segments_sector_3)}</td>
                                                 <td>${lapData.lap_duration}</td>`;
                lapsTableBody.appendChild(lapTableRow);
            });
        })
        .catch(error => {
            console.error('Error fetching or processing lap data:', error);
        });
}

// Function to get color based on sector value
function getColor(duration, segments) {
    let color = '#000000'; // Default color
    if (segments.includes(2048)) {
        color = 'yellow';
    } else if (segments.includes(2049)) {
        color = 'green';
    } else if (segments.includes(2051)) {
        color = 'purple';
    } else {
        color = "#00fffb";
    }

    return `<span style="color: ${color};">${duration}</span>`;
}

populateDriverSelect();
updateGraphForSession(sessionKey); // Call updateGraphForSession with default session key
// Call the displaySessionKeys function to populate the dropdown
displaySessionKeys();