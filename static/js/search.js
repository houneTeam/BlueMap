// Обработчик для поиска по имени
document.getElementById('search-input').addEventListener('input', function () {
    loadDevices();
});

// Обработчик для флажка "Скрыть unknown"
document.getElementById('hide-unknown').addEventListener('change', function () {
    loadDevices();
});
