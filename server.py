from flask import Flask, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from threading import Thread
from statsmodels.tsa.arima.model import ARIMA
import requests
import time

# constants
BANK_API_URL = 'https://www.tinkoff.ru/api/v1/currency_rates/'
DATA_UPDATE_TIME = 600 # seconds (10 minutes)
RATE_OBJECTS_INDEXES = (6, 9, 12)

# Flask config
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///db/rates.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = 0
db = SQLAlchemy(app)

# model
class Rate(db.Model):
    __tablename__ = 'rates'
    id = db.Column(db.Integer, primary_key=True)
    last_update = db.Column(db.Integer)
    from_currency = db.Column(db.String(3))
    to_currency = db.Column(db.String(3))
    buy = db.Column(db.Float)
    sell = db.Column(db.Float)

# data collector
class DataCollector(Thread):
    def __init__(self, database, data_update_time, bank_api_url, rate_objects_indexes):
        Thread.__init__(self)
        self.daemon = True
        self.database = database
        self.data_update_time = data_update_time
        self.bank_api_url = bank_api_url
        self.rate_objects_indexes = rate_objects_indexes
        self.start()

    def _create_rate(self, update_time, rate_object):
        rate = Rate(
            last_update=update_time,
            from_currency=rate_object['fromCurrency']['name'],
            to_currency=rate_object['toCurrency']['name'],
            buy=rate_object['buy'],
            sell=rate_object['sell'],
        )
        return rate

    def run(self):
        last_upd = Rate.query.order_by(Rate.last_update.desc()).first().last_update/1000
        offset = self.data_update_time - (time.time() - last_upd)
        print(offset)
        if offset > 0:
            time.sleep(offset)
        last_upd = 0
        while True:
            if (time.time() - last_upd) >= self.data_update_time:
                try:
                    data = requests.get(self.bank_api_url).json()
                    if data['resultCode'] == 'OK':
                        payload = data['payload']
                        rates_update_time_mil = payload['lastUpdate']['milliseconds']
                        for i in self.rate_objects_indexes:
                            rate_object = payload['rates'][i]
                            try:
                                new_rate_record = self._create_rate(rates_update_time_mil, rate_object)
                            except KeyError:
                                continue
                            self.database.session.add(new_rate_record)
                            self.database.session.commit()
                            check_time = time.localtime()
                            print('created new rate record at ' + str(check_time.tm_year) + '/' +
                                  str(check_time.tm_hour) + ':' + str(check_time.tm_min) +
                                  ':' + str(check_time.tm_sec) + ' ' + str(rates_update_time_mil))
                        last_upd = time.time()
                except requests.ConnectionError as e:
                    print(str(e))
                    pass
                time.sleep(self.data_update_time - 1)

# routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/rates')
def get_rates():
    res_rates = {}
    for currency_name in ('USD', 'EUR', 'GBP'):
        rate = Rate.query.filter_by(from_currency=currency_name).order_by(Rate.last_update.desc()).first()
        res_rates[currency_name] = {}
        res_rates[currency_name]['lastUpdate'] = rate.last_update
        res_rates[currency_name]['rate'] = (rate.buy + rate.sell)/2

    return jsonify(res_rates), 200

@app.route('/spread')
def get_spread():
    res_spread = {}
    for currency_name in ('USD', 'EUR', 'GBP'):
        rate = Rate.query.filter_by(from_currency=currency_name).order_by(Rate.last_update.desc()).first()
        res_spread[currency_name] = {}
        res_spread[currency_name]['lastUpdate'] = rate.last_update
        res_spread[currency_name]['abs'] = round((rate.sell - rate.buy), 3)
        res_spread[currency_name]['rel'] = round(((rate.sell - rate.buy)/rate.sell) * 100, 3)

    return jsonify(res_spread), 200

@app.route('/rates_average')
def get_rates_average():
    res_rate_avg = {}

    for currency_name in ('USD', 'EUR', 'GBP'):
        end_time_point = time.time() * 1000
        upd_time_point = end_time_point - 24 * 60 * 60 * 1000 # точка начала отсчета
        rates_list = Rate.query.filter_by(from_currency=currency_name).filter(Rate.last_update >= upd_time_point).order_by(Rate.last_update.asc()).all()
        weights = {}
        for rate in rates_list:
            computed_rate = (rate.buy + rate.sell)/2
            if str(computed_rate) not in weights.keys():
                weights[str(computed_rate)] = rate.last_update - upd_time_point
                upd_time_point = rate.last_update
            else:
                weights[str(computed_rate)] += rate.last_update - upd_time_point
                upd_time_point = rate.last_update
            if rate == rates_list[-1]:
                weights[str(computed_rate)] += end_time_point - upd_time_point

        upper_member = 0
        lower_member = 0
        for rate, weight in weights.items():
            upper_member += float(rate)*weight
            lower_member += weight

        avg_rate = round(upper_member/lower_member, 3)
        res_rate_avg[currency_name] = avg_rate

    return jsonify(res_rate_avg), 200

@app.route('/rates_history')
def get_rates_history():
    history = {}

    for currency_name in ('USD', 'EUR', 'GBP'):
        rates_list = Rate.query.filter_by(from_currency=currency_name).order_by(Rate.last_update.asc()).all()
        history[currency_name] = {
            'rates': [],
            'updatePoints': []
        }
        for rate in rates_list:
            history[currency_name]['rates'].append((rate.buy + rate.sell)/2)
            history[currency_name]['updatePoints'].append(rate.last_update)

    return jsonify(history), 200

@app.route('/rates_forecast')
def get_rates_forecast():
    forecast = {}

    for currency_name in ('USD', 'EUR', 'GBP'):
        rates_list = Rate.query.filter_by(from_currency=currency_name).order_by(Rate.last_update.asc()).all()
        forecast[currency_name] = {
            'rates': [],
            'updatePoints': []
        }
        # сбор данных для обучения модели
        training_data = []
        for rate in rates_list:
            training_data.append((rate.buy + rate.sell)/2)

        # обучение модели
        model = ARIMA(training_data, order=(3, 1, 0))
        model_fit = model.fit()

        # составление прогноза
        predictions = model_fit.forecast(steps=3*24*6).tolist()
        forecast[currency_name]['rates'] = predictions
        delta_time = 600 # 10 mins
        time_points = [(time.time() + timepoint * delta_time) * 1000 for timepoint in range(len(predictions))]
        forecast[currency_name]['updatePoints'] = time_points

    return jsonify(forecast), 200


if __name__ == '__main__':
    DataCollector(db, DATA_UPDATE_TIME, BANK_API_URL, RATE_OBJECTS_INDEXES)
    app.run()