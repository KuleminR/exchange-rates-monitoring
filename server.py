from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from threading import Thread
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
        last_upd = 0
        while True:
            if (time.time() - last_upd) >= self.data_update_time:
                data = requests.get(self.bank_api_url).json()
                if data['resultCode'] == 'OK':
                    payload = data['payload']
                    rates_update_time_mil = payload['lastUpdate']['milliseconds']
                    for index in self.rate_objects_indexes:
                        rate_object = payload['rates'][index]
                        try:
                            new_rate_record = self._create_rate(rates_update_time_mil, rate_object)
                        except KeyError:
                            continue
                        self.database.session.add(new_rate_record)
                        self.database.session.commit()
                        check_time = time.localtime()
                        print('created new rate record at ' + str(check_time.tm_year) + '/' + str(check_time.tm_hour) +
                              ':' + str(check_time.tm_min) + ':' + str(check_time.tm_sec) + ' ' + str(rates_update_time_mil))

                    last_upd = time.time()

#DataCollector(db, DATA_UPDATE_TIME, BANK_API_URL, RATE_OBJECTS_INDEXES)

# routes
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
        res_spread[currency_name]['abs'] = round(abs(rate.buy - rate.sell), 3)
        res_spread[currency_name]['rel'] = round(rate.buy - rate.sell, 3)

    return jsonify(res_spread), 200

@app.route('/rates_average')
def get_rates_average():
    res_rate_avg = {}

    end_time_point = time.time() * 1000
    upd_time_point = end_time_point - 24 * 60 * 60 * 1000 # точка начала отсчета
    for currency_name in ('USD', 'EUR', 'GBP'):
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

if __name__ == '__main__':
    app.run(debug=True)