document.addEventListener('DOMContentLoaded', function () {
    const sessionDropdown = document.getElementById('session');
    const driver1Dropdown = document.getElementById('driver1');
    const driver2Dropdown = document.getElementById('driver2');
    const compareBtn = document.getElementById('compareBtn');
    const tableContainer = document.getElementById('tableContainer');

    // Fetch sessions and populate session dropdown
    fetch('https://api.openf1.org/v1/sessions')
        .then(response => response.json())
        .then(sessions => {
            sessions.forEach(session => {
                const option = document.createElement('option');
                console.log(session);
                option.text = session.location + ' - ' + session.session_name;
                option.value = session.session_key;
                sessionDropdown.appendChild(option);
            });
        });

    // Fetch drivers and populate driver dropdowns
    fetch('https://api.openf1.org/v1/drivers')
        .then(response => response.json())
        .then(drivers => {
            drivers.forEach(driver => {
                const option1 = document.createElement('option');
                option1.text = driver.full_name;
                option1.value = driver.driver_number;
                driver1Dropdown.appendChild(option1);

                const option2 = document.createElement('option');
                option2.text = driver.full_name;
                option2.value = driver.driver_number;
                driver2Dropdown.appendChild(option2);
            });
        });

    compareBtn.addEventListener('click', function () {
        const sessionId = sessionDropdown.value;
        const driver1Id = driver1Dropdown.value;
        const driver2Id = driver2Dropdown.value;

        fetch(`https://api.openf1.org/v1/laps?session_key=${sessionId}`)
            .then(response => response.json())
            .then(laps => {
                const driver1Laps = laps.filter(lap => lap.driver_number == driver1Id);
                const driver2Laps = laps.filter(lap => lap.driver_number == driver2Id);

                // Clear previous table if exists
                tableContainer.innerHTML = '';

                // Create table headers
                const table = document.createElement('table');
                const headerRow = table.insertRow();
                const lapNumberHeader = document.createElement('th');
                lapNumberHeader.textContent = 'Lap Number';
                headerRow.appendChild(lapNumberHeader);
                const driver1Header = document.createElement('th');
                driver1Header.textContent = driver1Dropdown.options[driver1Dropdown.selectedIndex].text;
                headerRow.appendChild(driver1Header);
                const driver2Header = document.createElement('th');
                driver2Header.textContent = driver2Dropdown.options[driver2Dropdown.selectedIndex].text;
                headerRow.appendChild(driver2Header);
                const diffHeader = document.createElement('th');
                diffHeader.textContent = 'Difference';
                headerRow.appendChild(diffHeader);
                const cumulativeDiffHeader = document.createElement('th');
                cumulativeDiffHeader.textContent = 'Cumulative Difference';
                headerRow.appendChild(cumulativeDiffHeader);

                // Populate lap times and differences
                const rowCount = Math.max(driver1Laps.length, driver2Laps.length);
                let cumulativeDiff = 0;
                for (let i = 0; i < rowCount; i++) {
                    const row = table.insertRow();
                    const lapNumberCell = row.insertCell();
                    lapNumberCell.textContent = i + 1;
                    lapNumberCell.classList.add('lap-number');

                    const driver1Time = driver1Laps[i] ? driver1Laps[i].lap_duration : '';
                    const driver2Time = driver2Laps[i] ? driver2Laps[i].lap_duration : '';
                    const diff = driver1Laps[i] && driver2Laps[i] ? (driver1Laps[i].lap_duration - driver2Laps[i].lap_duration).toFixed(3) : '';

                    cumulativeDiff += parseFloat(diff) || 0;

                    const cell1 = row.insertCell();
                    cell1.textContent = driver1Time;
                    const cell2 = row.insertCell();
                    cell2.textContent = driver2Time;

                    // Color coding for difference and cumulative difference
                    const cell3 = row.insertCell();
                    if (diff > 0) {
                        cell3.style.color = 'red';
                    } else if (diff < 0) {
                        cell3.style.color = 'green';
                    }
                    cell3.textContent = diff;

                    const cell4 = row.insertCell();
                    if (cumulativeDiff > 0) {
                        cell4.style.color = 'red';
                    } else if (cumulativeDiff < 0) {
                        cell4.style.color = 'green';
                    }
                    cell4.textContent = cumulativeDiff.toFixed(3);
                }


                // Append table to container
                tableContainer.appendChild(table);
            });
    });
});
