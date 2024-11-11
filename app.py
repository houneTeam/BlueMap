from flask import Flask, render_template, jsonify, request
import sqlite3

app = Flask(__name__)

def get_db_connection():
    conn = sqlite3.connect('devices.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/devices')
def devices():
    name_filter = request.args.get('name', None)
    hide_unknown = request.args.get('hide_unknown', 'false') == 'true'
    sort_option = request.args.get('sort', 'name')  # По умолчанию сортируем по имени

    conn = get_db_connection()
    query = 'SELECT * FROM devices'
    conditions = []
    params = []

    if name_filter:
        conditions.append("name LIKE ?")
        params.append(f"%{name_filter}%")
    if hide_unknown:
        conditions.append("LOWER(name) != ?")
        params.append("unknown")

    if conditions:
        query += ' WHERE ' + ' AND '.join(conditions)

    # Добавляем ORDER BY в зависимости от выбранной опции сортировки
    if sort_option == 'name':
        query += ' ORDER BY name COLLATE NOCASE ASC'  # Сортировка по имени без учета регистра
    elif sort_option == 'timestamp':
        query += ' ORDER BY timestamp DESC'  # Сортировка по дате добавления, последние сверху
    else:
        query += ' ORDER BY id ASC'  # Сортировка по id по умолчанию

    devices = conn.execute(query, params).fetchall()
    conn.close()

    features = []
    for device in devices:
        gps = device['gps']
        if gps:
            lat_lon = gps.split(',')
            if len(lat_lon) == 2:
                try:
                    latitude = float(lat_lon[0])
                    longitude = float(lat_lon[1])
                    feature = {
                        'type': 'Feature',
                        'geometry': {
                            'type': 'Point',
                            'coordinates': [longitude, latitude]
                        },
                        'properties': {
                            'id': device['id'],
                            'name': device['name'],
                            'mac': device['mac'],
                            'rssi': device['rssi'],
                            'timestamp': device['timestamp'],
                            'adapter': device['adapter'],
                            'manufacturer_data': device['manufacturer_data'],
                            'service_uuids': device['service_uuids'],
                            'service_data': device['service_data'],
                            'tx_power': device['tx_power'],
                            'platform_data': device['platform_data'],
                        }
                    }
                    features.append(feature)
                except ValueError:
                    continue
    geojson = {
        'type': 'FeatureCollection',
        'features': features
    }
    return jsonify(geojson)

if __name__ == '__main__':
    app.run(debug=True)
