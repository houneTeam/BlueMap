// Установите ваш Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiaG91bmV0ZWFtIiwiYSI6ImNtM2N2bGV3aTFxOXMybW9yNWZpaTl3dDcifQ.g6NFuG2tSGW8_njsq7kbOg';

// Инициализация карты
var map = new mapboxgl.Map({
    container: 'map', // контейнер для карты
    style: 'mapbox://styles/mapbox/streets-v11', // стиль карты
    center: [37.6173, 55.7558], // временная начальная позиция
    zoom: 2 // начальный зум
});

// Переменная для хранения текущего открытого popup
var currentPopup = null;

function loadDevices() {
    var nameFilter = document.getElementById('search-input').value;
    var hideUnknown = document.getElementById('hide-unknown').checked;
    var sortOption = document.getElementById('sort-select').value;

    var url = '/devices?';
    if (nameFilter) {
        url += 'name=' + encodeURIComponent(nameFilter) + '&';
    }
    url += 'hide_unknown=' + hideUnknown;
    url += '&sort=' + encodeURIComponent(sortOption);

    fetch(url)
        .then(response => response.json())
        .then(data => {
            updateDeviceList(data.features);

            if (map.getSource('devices')) {
                map.getSource('devices').setData(data);
            } else {
                map.addSource('devices', {
                    type: 'geojson',
                    data: data,
                    cluster: true,
                    clusterMaxZoom: 14,
                    clusterRadius: 50
                });

                // Добавление слоев
                map.addLayer({
                    id: 'clusters',
                    type: 'circle',
                    source: 'devices',
                    filter: ['has', 'point_count'],
                    paint: {
                        'circle-color': [
                            'step',
                            ['get', 'point_count'],
                            '#51bbd6',
                            100,
                            '#f1f075',
                            750,
                            '#f28cb1'
                        ],
                        'circle-radius': [
                            'step',
                            ['get', 'point_count'],
                            20,
                            100,
                            30,
                            750,
                            40
                        ]
                    }
                });

                map.addLayer({
                    id: 'cluster-count',
                    type: 'symbol',
                    source: 'devices',
                    filter: ['has', 'point_count'],
                    layout: {
                        'text-field': '{point_count_abbreviated}',
                        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                        'text-size': 12
                    }
                });

                map.addLayer({
                    id: 'unclustered-point',
                    type: 'circle',
                    source: 'devices',
                    filter: ['!', ['has', 'point_count']],
                    paint: {
                        'circle-color': '#11b4da',
                        'circle-radius': 8,
                        'circle-stroke-width': 1,
                        'circle-stroke-color': '#fff'
                    }
                });

                // Обработчики событий карты
                map.on('click', 'clusters', function (e) {
                    var features = map.queryRenderedFeatures(e.point, {
                        layers: ['clusters']
                    });
                    var clusterId = features[0].properties.cluster_id;
                    map.getSource('devices').getClusterExpansionZoom(
                        clusterId,
                        function (err, zoom) {
                            if (err) return;

                            map.easeTo({
                                center: features[0].geometry.coordinates,
                                zoom: zoom
                            });
                        }
                    );
                });

                map.on('click', 'unclustered-point', function (e) {
                    var coordinates = e.features[0].geometry.coordinates.slice();
                    var properties = e.features[0].properties;

                    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                    }

                    // Закрыть предыдущий popup, если он открыт
                    if (currentPopup) {
                        currentPopup.remove();
                    }

                    var popupContent = '<h5>' + properties.name + '</h5>' +
                        '<p>MAC: ' + properties.mac + '</p>' +
                        '<p>RSSI: ' + properties.rssi + '</p>' +
                        '<p>Timestamp: ' + properties.timestamp + '</p>' +
                        '<p>Adapter: ' + properties.adapter + '</p>' +
                        '<p>Manufacturer Data: ' + properties.manufacturer_data + '</p>' +
                        '<p>Service UUIDs: ' + properties.service_uuids + '</p>' +
                        '<p>Service Data: ' + properties.service_data + '</p>' +
                        '<p>TX Power: ' + properties.tx_power + '</p>' +
                        '<p>Platform Data: ' + properties.platform_data + '</p>';

                    // Создать новый popup и сохранить его в переменной currentPopup
                    currentPopup = new mapboxgl.Popup()
                        .setLngLat(coordinates)
                        .setHTML(popupContent)
                        .addTo(map);
                });

                map.on('mouseenter', 'clusters', function () {
                    map.getCanvas().style.cursor = 'pointer';
                });
                map.on('mouseleave', 'clusters', function () {
                    map.getCanvas().style.cursor = '';
                });
                map.on('mouseenter', 'unclustered-point', function () {
                    map.getCanvas().style.cursor = 'pointer';
                });
                map.on('mouseleave', 'unclustered-point', function () {
                    map.getCanvas().style.cursor = '';
                });
            }

            // Автоматическое масштабирование карты
            var bounds = new mapboxgl.LngLatBounds();
            data.features.forEach(function(feature) {
                bounds.extend(feature.geometry.coordinates);
            });

            if (data.features.length > 0) {
                map.fitBounds(bounds, {
                    padding: 50
                });
            }
        });
}

function updateDeviceList(features) {
    var deviceList = document.getElementById('device-list');
    deviceList.innerHTML = ''; // Очистить текущий список

    features.forEach(function(feature) {
        var properties = feature.properties;

        var deviceItem = document.createElement('div');
        deviceItem.className = 'device-item';
        deviceItem.textContent = properties.name || 'No Name';

        // При клике на устройство в списке
        deviceItem.addEventListener('click', function() {
            // Закрыть предыдущий popup, если он открыт
            if (currentPopup) {
                currentPopup.remove();
            }

            // Зумировать на устройство с измененным уровнем зума
            map.flyTo({
                center: feature.geometry.coordinates,
                zoom: 17 // Уровень зума скорректирован
            });

            // Показать popup
            var popupContent = '<h5>' + properties.name + '</h5>' +
                '<p>MAC: ' + properties.mac + '</p>' +
                '<p>RSSI: ' + properties.rssi + '</p>' +
                '<p>Timestamp: ' + properties.timestamp + '</p>' +
                '<p>Adapter: ' + properties.adapter + '</p>' +
                '<p>Manufacturer Data: ' + properties.manufacturer_data + '</p>' +
                '<p>Service UUIDs: ' + properties.service_uuids + '</p>' +
                '<p>Service Data: ' + properties.service_data + '</p>' +
                '<p>TX Power: ' + properties.tx_power + '</p>' +
                '<p>Platform Data: ' + properties.platform_data + '</p>';

            // Создать новый popup и сохранить его в переменной currentPopup
            currentPopup = new mapboxgl.Popup()
                .setLngLat(feature.geometry.coordinates)
                .setHTML(popupContent)
                .addTo(map);
        });

        deviceList.appendChild(deviceItem);
    });
}

map.on('load', function () {
    loadDevices();
});

// Обработчики для элементов управления
document.getElementById('sort-select').addEventListener('change', function() {
    loadDevices();
});
document.getElementById('search-input').addEventListener('input', function () {
    loadDevices();
});
document.getElementById('hide-unknown').addEventListener('change', function () {
    loadDevices();
});
