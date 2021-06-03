from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from threading import Thread
import requests
import time
#import data_collection as dc

# constants
bank_api_url = 'https://www.tinkoff.ru/api/v1/currency_rates/'
data_update_time = 1200 # seconds
rate_objects_indexes = (6, 9, 12)

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


d_collector = DataCollector(db, data_update_time, bank_api_url, rate_objects_indexes)

# routes
@app.route('/test')
def test():
    return '200'

if __name__ == '__main__':
    #data_collector.run()
    app.run(debug=True)
